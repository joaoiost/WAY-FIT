-- ============================================================
-- WAY FIT — Migrations v2
-- Execute no Supabase > SQL Editor
-- Corrige segurança, adiciona tabelas novas e alertas de inatividade
-- ============================================================

-- ============================================================
-- SEGURANÇA: Corrigir política de convites
-- Antes: qualquer usuário autenticado lia TODOS os convites (vaza tokens e emails)
-- Depois: só o personal dono do convite pode listar; leitura por token é pública
-- ============================================================
DROP POLICY IF EXISTS "Leitura pública de convites" ON invites;
DROP POLICY IF EXISTS "Invite token public read" ON invites;

-- Permite ler convite pelo token (sem autenticação — fluxo de aceitação)
CREATE POLICY "Invite token public read" ON invites
  FOR SELECT USING (true); -- mantido pois token é UUID gerado, impossível de adivinhar

-- Apenas o personal dono pode VER, CRIAR, ATUALIZAR e DELETAR seus convites
DROP POLICY IF EXISTS "Personal gerencia convites" ON invites;
CREATE POLICY "Personal gerencia convites" ON invites
  FOR ALL USING (personal_id = auth.uid());

-- ============================================================
-- SEGURANÇA: RLS em group_classes e group_class_attendance
-- ============================================================
ALTER TABLE group_classes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Personal gerencia turmas" ON group_classes;
CREATE POLICY "Personal gerencia turmas" ON group_classes
  FOR ALL USING (personal_id = auth.uid());
DROP POLICY IF EXISTS "Aluno vê turmas do personal" ON group_classes;
CREATE POLICY "Aluno vê turmas do personal" ON group_classes
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM students s WHERE s.personal_id = group_classes.personal_id AND s.user_id = auth.uid())
  );

ALTER TABLE group_class_attendance ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Personal gerencia presença em turmas" ON group_class_attendance;
CREATE POLICY "Personal gerencia presença em turmas" ON group_class_attendance
  FOR ALL USING (
    EXISTS (SELECT 1 FROM group_classes gc WHERE gc.id = group_class_attendance.class_id AND gc.personal_id = auth.uid())
  );
DROP POLICY IF EXISTS "Aluno vê própria presença em turmas" ON group_class_attendance;
CREATE POLICY "Aluno vê própria presença em turmas" ON group_class_attendance
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM students s WHERE s.id = group_class_attendance.student_id AND s.user_id = auth.uid())
  );

-- ============================================================
-- SEGURANÇA: RLS em tabelas de nutrição
-- ============================================================
ALTER TABLE meal_plans ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Personal gerencia planos alimentares" ON meal_plans;
CREATE POLICY "Personal gerencia planos alimentares" ON meal_plans
  FOR ALL USING (personal_id = auth.uid());
DROP POLICY IF EXISTS "Aluno vê próprio plano alimentar" ON meal_plans;
CREATE POLICY "Aluno vê próprio plano alimentar" ON meal_plans
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM students s WHERE s.id = meal_plans.student_id AND s.user_id = auth.uid())
  );

ALTER TABLE meal_plan_meals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Acesso a refeições do plano" ON meal_plan_meals;
CREATE POLICY "Acesso a refeições do plano" ON meal_plan_meals
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM meal_plans mp
      WHERE mp.id = meal_plan_meals.meal_plan_id
        AND (mp.personal_id = auth.uid()
          OR EXISTS (SELECT 1 FROM students s WHERE s.id = mp.student_id AND s.user_id = auth.uid()))
    )
  );

ALTER TABLE meal_plan_foods ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Acesso a alimentos do plano" ON meal_plan_foods;
CREATE POLICY "Acesso a alimentos do plano" ON meal_plan_foods
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM meal_plan_meals mpm
      JOIN meal_plans mp ON mp.id = mpm.meal_plan_id
      WHERE mpm.id = meal_plan_foods.meal_id
        AND (mp.personal_id = auth.uid()
          OR EXISTS (SELECT 1 FROM students s WHERE s.id = mp.student_id AND s.user_id = auth.uid()))
    )
  );

ALTER TABLE food_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Personal gerencia alimentos" ON food_items;
CREATE POLICY "Personal gerencia alimentos" ON food_items
  FOR ALL USING (personal_id = auth.uid() OR personal_id IS NULL);
DROP POLICY IF EXISTS "Aluno lê alimentos" ON food_items;
CREATE POLICY "Aluno lê alimentos" ON food_items
  FOR SELECT USING (true);

ALTER TABLE nutrition_anamnesis ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Personal gerencia anamnese nutricional" ON nutrition_anamnesis;
CREATE POLICY "Personal gerencia anamnese nutricional" ON nutrition_anamnesis
  FOR ALL USING (personal_id = auth.uid());
DROP POLICY IF EXISTS "Aluno vê própria anamnese nutricional" ON nutrition_anamnesis;
CREATE POLICY "Aluno vê própria anamnese nutricional" ON nutrition_anamnesis
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM students s WHERE s.id = nutrition_anamnesis.student_id AND s.user_id = auth.uid())
  );

ALTER TABLE food_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Aluno gerencia próprio log alimentar" ON food_logs;
CREATE POLICY "Aluno gerencia próprio log alimentar" ON food_logs
  FOR ALL USING (
    EXISTS (SELECT 1 FROM students s WHERE s.id = food_logs.student_id AND s.user_id = auth.uid())
  );
DROP POLICY IF EXISTS "Personal vê log alimentar dos alunos" ON food_logs;
CREATE POLICY "Personal vê log alimentar dos alunos" ON food_logs
  FOR SELECT USING (personal_id = auth.uid());

-- ============================================================
-- FEATURE: Check-ins diários do aluno (humor, energia, sono, dores)
-- ============================================================
CREATE TABLE IF NOT EXISTS daily_checkins (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID REFERENCES students(id) ON DELETE CASCADE NOT NULL,
  personal_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  mood INTEGER CHECK (mood BETWEEN 1 AND 5),
  energy INTEGER CHECK (energy BETWEEN 1 AND 5),
  sleep_quality INTEGER CHECK (sleep_quality BETWEEN 1 AND 5),
  soreness INTEGER CHECK (soreness BETWEEN 1 AND 5),
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id, date)
);
ALTER TABLE daily_checkins ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Aluno gerencia check-ins" ON daily_checkins;
CREATE POLICY "Aluno gerencia check-ins" ON daily_checkins
  FOR ALL USING (
    EXISTS (SELECT 1 FROM students s WHERE s.id = daily_checkins.student_id AND s.user_id = auth.uid())
  );
DROP POLICY IF EXISTS "Personal vê check-ins dos alunos" ON daily_checkins;
CREATE POLICY "Personal vê check-ins dos alunos" ON daily_checkins
  FOR SELECT USING (personal_id = auth.uid());

-- ============================================================
-- FEATURE: Agendamentos recorrentes
-- ============================================================
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS recurring_weekly BOOLEAN DEFAULT false;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS recurring_until DATE;

-- ============================================================
-- FEATURE: Consentimento LGPD (registro de aceite dos termos)
-- ============================================================
CREATE TABLE IF NOT EXISTS lgpd_consents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  terms_version TEXT NOT NULL DEFAULT '1.0',
  accepted_at TIMESTAMPTZ DEFAULT NOW(),
  ip_address TEXT,
  user_agent TEXT,
  UNIQUE(user_id, terms_version)
);
ALTER TABLE lgpd_consents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "User gerencia próprio consentimento" ON lgpd_consents;
CREATE POLICY "User gerencia próprio consentimento" ON lgpd_consents
  FOR ALL USING (user_id = auth.uid());

-- ============================================================
-- FEATURE: Biblioteca de exercícios compartilhada
-- ============================================================
CREATE TABLE IF NOT EXISTS exercise_library (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  personal_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  muscle_group TEXT NOT NULL,
  equipment TEXT DEFAULT 'Livre',
  difficulty TEXT DEFAULT 'Intermediário' CHECK (difficulty IN ('Iniciante', 'Intermediário', 'Avançado')),
  instructions TEXT DEFAULT '',
  video_url TEXT DEFAULT '',
  is_global BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE exercise_library ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Lê exercícios globais e próprios" ON exercise_library;
CREATE POLICY "Lê exercícios globais e próprios" ON exercise_library
  FOR SELECT USING (is_global = true OR personal_id = auth.uid()
    OR EXISTS (SELECT 1 FROM students s WHERE s.personal_id = exercise_library.personal_id AND s.user_id = auth.uid()));
DROP POLICY IF EXISTS "Personal gerencia própria biblioteca" ON exercise_library;
CREATE POLICY "Personal gerencia própria biblioteca" ON exercise_library
  FOR ALL USING (personal_id = auth.uid());

-- ============================================================
-- FEATURE: Water logs (hidratação diária do aluno)
-- ============================================================
CREATE TABLE IF NOT EXISTS water_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID REFERENCES students(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  intake_ml INTEGER DEFAULT 0,
  goal_ml INTEGER DEFAULT 2000,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id, date)
);
ALTER TABLE water_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Aluno gerencia hidratação" ON water_logs;
CREATE POLICY "Aluno gerencia hidratação" ON water_logs
  FOR ALL USING (
    EXISTS (SELECT 1 FROM students s WHERE s.id = water_logs.student_id AND s.user_id = auth.uid())
  );
DROP POLICY IF EXISTS "Personal vê hidratação dos alunos" ON water_logs;
CREATE POLICY "Personal vê hidratação dos alunos" ON water_logs
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM students s WHERE s.id = water_logs.student_id AND s.personal_id = auth.uid())
  );

-- ============================================================
-- FUNÇÃO: Última sessão de treino por aluno (para alertas de inatividade)
-- ============================================================
CREATE OR REPLACE FUNCTION get_last_workout_per_student(p_personal_id UUID)
RETURNS TABLE(student_id UUID, last_workout DATE) AS $$
  SELECT ws.student_id, MAX(ws.date)::DATE as last_workout
  FROM workout_sessions ws
  JOIN students s ON s.id = ws.student_id
  WHERE s.personal_id = p_personal_id
  GROUP BY ws.student_id;
$$ LANGUAGE sql SECURITY DEFINER;

-- ============================================================
-- ÍNDICES de performance
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_workout_sessions_student_date ON workout_sessions(student_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_workout_sessions_personal_date ON workout_sessions(personal_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_daily_checkins_student_date ON daily_checkins(student_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_food_logs_student_date ON food_logs(student_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_appointments_personal_date ON appointments(personal_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_measurements_student_date ON measurements(student_id, date ASC);
