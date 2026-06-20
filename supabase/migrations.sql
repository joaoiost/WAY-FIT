-- ============================================================
-- WAY FIT — Migrations (rode no Supabase > SQL Editor)
-- Execute este arquivo se o banco já existia antes das novas
-- funcionalidades de perfil público e foto de avatar.
-- É seguro rodar múltiplas vezes.
-- ============================================================

-- Adicionar novas colunas na tabela profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS slug TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Índice único em slug (para URLs públicas únicas por personal)
CREATE UNIQUE INDEX IF NOT EXISTS profiles_slug_key ON profiles(slug);

-- ============================================================
-- Storage: bucket "avatars" para fotos de perfil
-- (Faça isso pelo painel Supabase > Storage > New bucket)
-- Nome do bucket: avatars
-- Public bucket: SIM (marcar como público)
-- ============================================================

-- Política de storage: personal pode fazer upload da própria foto
-- (Execute no SQL Editor do Supabase)
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "Avatar upload" ON storage.objects;
DROP POLICY IF EXISTS "Avatar public read" ON storage.objects;
DROP POLICY IF EXISTS "Avatar delete" ON storage.objects;

CREATE POLICY "Avatar upload" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Avatar public read" ON storage.objects
FOR SELECT USING (bucket_id = 'avatars');

CREATE POLICY "Avatar delete" ON storage.objects
FOR DELETE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Política para perfis públicos (permitir leitura de slug sem autenticação)
DROP POLICY IF EXISTS "Perfil público por slug" ON profiles;
CREATE POLICY "Perfil público por slug" ON profiles
FOR SELECT USING (slug IS NOT NULL);

-- ============================================================
-- Feature: Divisão A/B/C por dia da semana
-- ============================================================
ALTER TABLE training_plans ADD COLUMN IF NOT EXISTS days INTEGER[] DEFAULT '{}';

-- ============================================================
-- Feature: Frequência de treinos (presença/falta)
-- ============================================================
CREATE TABLE IF NOT EXISTS attendances (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  personal_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  student_id UUID REFERENCES students(id) ON DELETE CASCADE NOT NULL,
  appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
  date DATE NOT NULL,
  status TEXT DEFAULT 'present' CHECK (status IN ('present', 'absent', 'late')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id, date)
);
ALTER TABLE attendances ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Personal gerencia presenças" ON attendances;
CREATE POLICY "Personal gerencia presenças" ON attendances FOR ALL USING (personal_id = auth.uid());
DROP POLICY IF EXISTS "Aluno vê próprias presenças" ON attendances;
CREATE POLICY "Aluno vê próprias presenças" ON attendances FOR SELECT USING (
  EXISTS (SELECT 1 FROM students s WHERE s.id = attendances.student_id AND s.user_id = auth.uid())
);

-- ============================================================
-- Feature: Avaliação da sessão pelo aluno (1-5 estrelas)
-- ============================================================
CREATE TABLE IF NOT EXISTS session_ratings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID REFERENCES students(id) ON DELETE CASCADE NOT NULL,
  personal_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  rating INTEGER CHECK (rating BETWEEN 1 AND 5),
  feeling TEXT CHECK (feeling IN ('otimo', 'bem', 'regular', 'cansado', 'mal')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id, date)
);
ALTER TABLE session_ratings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Aluno gerencia avaliações" ON session_ratings;
CREATE POLICY "Aluno gerencia avaliações" ON session_ratings FOR ALL USING (
  EXISTS (SELECT 1 FROM students s WHERE s.id = session_ratings.student_id AND s.user_id = auth.uid())
);
DROP POLICY IF EXISTS "Personal vê avaliações dos alunos" ON session_ratings;
CREATE POLICY "Personal vê avaliações dos alunos" ON session_ratings FOR SELECT USING (personal_id = auth.uid());

-- ============================================================
-- Feature: Onboarding do aluno (peso, altura, meta no cadastro)
-- ============================================================
ALTER TABLE students ADD COLUMN IF NOT EXISTS weight NUMERIC(5,2);
ALTER TABLE students ADD COLUMN IF NOT EXISTS height INTEGER;

-- RLS: aluno pode atualizar o próprio registro (para onboarding e futuras edições)
DROP POLICY IF EXISTS "Aluno atualiza próprio perfil" ON students;
CREATE POLICY "Aluno atualiza próprio perfil" ON students FOR UPDATE
USING (user_id = auth.uid());

-- ============================================================
-- Feature: Chat entre aluno e personal (tempo real)
-- ============================================================
CREATE TABLE IF NOT EXISTS messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID REFERENCES students(id) ON DELETE CASCADE NOT NULL,
  personal_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  from_role TEXT NOT NULL CHECK (from_role IN ('student', 'personal')),
  text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages REPLICA IDENTITY FULL;

DROP POLICY IF EXISTS "Aluno e personal leem mensagens" ON messages;
CREATE POLICY "Aluno e personal leem mensagens" ON messages FOR SELECT USING (
  EXISTS (SELECT 1 FROM students s WHERE s.id = messages.student_id AND s.user_id = auth.uid())
  OR personal_id = auth.uid()
);
DROP POLICY IF EXISTS "Aluno envia mensagem" ON messages;
CREATE POLICY "Aluno envia mensagem" ON messages FOR INSERT WITH CHECK (
  (from_role = 'student' AND EXISTS (SELECT 1 FROM students s WHERE s.id = messages.student_id AND s.user_id = auth.uid()))
  OR (from_role = 'personal' AND personal_id = auth.uid())
);

-- ============================================================
-- Feature: Medições corporais do aluno
-- ============================================================
CREATE TABLE IF NOT EXISTS student_measurements (
  id SERIAL PRIMARY KEY,
  student_id UUID REFERENCES students(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  weight NUMERIC(5,2),
  waist NUMERIC(5,2),
  chest NUMERIC(5,2),
  arm NUMERIC(5,2),
  hip NUMERIC(5,2),
  body_fat NUMERIC(5,2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE student_measurements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Aluno gerencia próprias medições" ON student_measurements;
CREATE POLICY "Aluno gerencia próprias medições" ON student_measurements FOR ALL USING (
  EXISTS (SELECT 1 FROM students s WHERE s.id = student_measurements.student_id AND s.user_id = auth.uid())
);
DROP POLICY IF EXISTS "Personal vê medições dos alunos" ON student_measurements;
CREATE POLICY "Personal vê medições dos alunos" ON student_measurements FOR SELECT USING (
  EXISTS (SELECT 1 FROM students s WHERE s.id = student_measurements.student_id AND s.personal_id = auth.uid())
);

-- ============================================================
-- Feature: Ficha de saúde / anamnese do aluno (JSON)
-- ============================================================
CREATE TABLE IF NOT EXISTS student_anamnese (
  id SERIAL PRIMARY KEY,
  student_id UUID UNIQUE REFERENCES students(id) ON DELETE CASCADE NOT NULL,
  data JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE student_anamnese ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Aluno gerencia própria anamnese" ON student_anamnese;
CREATE POLICY "Aluno gerencia própria anamnese" ON student_anamnese FOR ALL USING (
  EXISTS (SELECT 1 FROM students s WHERE s.id = student_anamnese.student_id AND s.user_id = auth.uid())
);
DROP POLICY IF EXISTS "Personal vê anamnese dos alunos" ON student_anamnese;
CREATE POLICY "Personal vê anamnese dos alunos" ON student_anamnese FOR SELECT USING (
  EXISTS (SELECT 1 FROM students s WHERE s.id = student_anamnese.student_id AND s.personal_id = auth.uid())
);

-- ============================================================
-- Feature: Marcar pagamento como pago (campo paid_date)
-- ============================================================
ALTER TABLE payments ADD COLUMN IF NOT EXISTS paid_date DATE;

-- ============================================================
-- Feature: Carga (peso) nos exercícios
-- ============================================================
ALTER TABLE exercises ADD COLUMN IF NOT EXISTS load TEXT;

-- ============================================================
-- Feature: Excluir aula da agenda
-- (appointments já existia — apenas documentando que DELETE é permitido via RLS)
-- ============================================================
DROP POLICY IF EXISTS "Personal deleta aulas" ON appointments;
CREATE POLICY "Personal deleta aulas" ON appointments FOR DELETE USING (personal_id = auth.uid());

-- ============================================================
-- Feature: Notificações push (PWA)
-- ============================================================
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id SERIAL PRIMARY KEY,
  student_id UUID UNIQUE REFERENCES students(id) ON DELETE CASCADE NOT NULL,
  subscription JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Student manages own push sub" ON push_subscriptions;
CREATE POLICY "Student manages own push sub" ON push_subscriptions FOR ALL USING (
  EXISTS (SELECT 1 FROM students s WHERE s.id = push_subscriptions.student_id AND s.user_id = auth.uid())
);
DROP POLICY IF EXISTS "Personal reads push subs" ON push_subscriptions;
CREATE POLICY "Personal reads push subs" ON push_subscriptions FOR SELECT USING (
  EXISTS (SELECT 1 FROM students s WHERE s.id = push_subscriptions.student_id AND s.personal_id = auth.uid())
);

CREATE TABLE IF NOT EXISTS student_notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID REFERENCES students(id) ON DELETE CASCADE NOT NULL,
  personal_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'custom' CHECK (type IN ('message', 'workout', 'payment', 'appointment', 'custom')),
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE student_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_notifications REPLICA IDENTITY FULL;
DROP POLICY IF EXISTS "Student reads own notifications" ON student_notifications;
CREATE POLICY "Student reads own notifications" ON student_notifications FOR SELECT USING (
  EXISTS (SELECT 1 FROM students s WHERE s.id = student_notifications.student_id AND s.user_id = auth.uid())
);
DROP POLICY IF EXISTS "Student updates own notifications" ON student_notifications;
CREATE POLICY "Student updates own notifications" ON student_notifications FOR UPDATE USING (
  EXISTS (SELECT 1 FROM students s WHERE s.id = student_notifications.student_id AND s.user_id = auth.uid())
);
DROP POLICY IF EXISTS "Personal sends notifications" ON student_notifications;
CREATE POLICY "Personal sends notifications" ON student_notifications FOR INSERT WITH CHECK (personal_id = auth.uid());
DROP POLICY IF EXISTS "Personal reads sent notifications" ON student_notifications;
CREATE POLICY "Personal reads sent notifications" ON student_notifications FOR SELECT USING (personal_id = auth.uid());
-- ── Scheduled notifications (lembretes automáticos) ──────────────────
CREATE TABLE IF NOT EXISTS scheduled_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  personal_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  student_ids TEXT[] DEFAULT '{}',
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  days_of_week INTEGER[] NOT NULL DEFAULT '{1,2,3,4,5}',
  send_hour INTEGER NOT NULL DEFAULT 8,
  send_minute INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_sent_date DATE
);
ALTER TABLE scheduled_notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Personal manages own schedules" ON scheduled_notifications;
CREATE POLICY "Personal manages own schedules" ON scheduled_notifications FOR ALL USING (personal_id = auth.uid());

-- Allow type 'scheduled' in student_notifications
ALTER TABLE student_notifications DROP CONSTRAINT IF EXISTS student_notifications_type_check;
ALTER TABLE student_notifications ADD CONSTRAINT student_notifications_type_check
  CHECK (type IN ('message', 'workout', 'payment', 'appointment', 'custom', 'scheduled'));

-- ============================================================
-- Feature: Execução de treinos pelo aluno
-- ============================================================
CREATE TABLE IF NOT EXISTS workout_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID REFERENCES students(id) ON DELETE CASCADE NOT NULL,
  personal_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  plan_id UUID REFERENCES training_plans(id) ON DELETE CASCADE NOT NULL,
  plan_name TEXT NOT NULL,
  plan_type TEXT,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  finished_at TIMESTAMPTZ,
  exercises_done INTEGER DEFAULT 0,
  exercises_total INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id, plan_id, date)
);
ALTER TABLE workout_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Aluno gerencia próprias sessões" ON workout_sessions;
CREATE POLICY "Aluno gerencia próprias sessões" ON workout_sessions FOR ALL USING (
  EXISTS (SELECT 1 FROM students s WHERE s.id = workout_sessions.student_id AND s.user_id = auth.uid())
);
DROP POLICY IF EXISTS "Personal vê sessões dos alunos" ON workout_sessions;
CREATE POLICY "Personal vê sessões dos alunos" ON workout_sessions FOR SELECT USING (personal_id = auth.uid());

CREATE TABLE IF NOT EXISTS exercise_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES workout_sessions(id) ON DELETE CASCADE NOT NULL,
  student_id UUID REFERENCES students(id) ON DELETE CASCADE NOT NULL,
  exercise_id UUID REFERENCES exercises(id) ON DELETE CASCADE NOT NULL,
  exercise_name TEXT NOT NULL,
  sets_planned INTEGER,
  reps_planned TEXT,
  load_planned TEXT,
  load_actual TEXT,
  reps_actual TEXT,
  done BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(session_id, exercise_id)
);
ALTER TABLE exercise_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Aluno gerencia próprios logs" ON exercise_logs;
CREATE POLICY "Aluno gerencia próprios logs" ON exercise_logs FOR ALL USING (
  EXISTS (SELECT 1 FROM students s WHERE s.id = exercise_logs.student_id AND s.user_id = auth.uid())
);
DROP POLICY IF EXISTS "Personal vê logs dos alunos" ON exercise_logs;
CREATE POLICY "Personal vê logs dos alunos" ON exercise_logs FOR SELECT USING (
  EXISTS (SELECT 1 FROM students s WHERE s.id = exercise_logs.student_id AND s.personal_id = auth.uid())
);

-- Detalhe por série (array de {load, done} por exercício)
ALTER TABLE exercise_logs ADD COLUMN IF NOT EXISTS sets_data JSONB DEFAULT '[]';

-- Chave PIX do personal trainer
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS pix_key TEXT;

-- ============================================================
-- Feature: Supersets no builder de treinos
-- ============================================================
ALTER TABLE exercises ADD COLUMN IF NOT EXISTS superset_group TEXT;

-- ============================================================
-- Feature: Onboarding do aluno persistido no banco
-- ============================================================
ALTER TABLE students ADD COLUMN IF NOT EXISTS onboarded_at TIMESTAMPTZ;

-- ============================================================
-- Feature: Cartilhas (templates de treino sem aluno associado)
-- student_id pode ser NULL para representar uma cartilha/template
-- ============================================================
ALTER TABLE training_plans ALTER COLUMN student_id DROP NOT NULL;

-- ============================================================
-- Feature: Avaliação Física (AvaliacaoFisica.jsx)
-- Execute no Supabase > SQL Editor se a tabela ainda não existe
-- ============================================================
CREATE TABLE IF NOT EXISTS physical_assessments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID REFERENCES students(id) ON DELETE CASCADE NOT NULL,
  personal_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  data JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE physical_assessments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Personal gerencia avaliacoes" ON physical_assessments;
CREATE POLICY "Personal gerencia avaliacoes" ON physical_assessments
  FOR ALL USING (personal_id = auth.uid());
DROP POLICY IF EXISTS "Aluno ve proprias avaliacoes" ON physical_assessments;
CREATE POLICY "Aluno ve proprias avaliacoes" ON physical_assessments
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM students s WHERE s.id = physical_assessments.student_id AND s.user_id = auth.uid())
  );

-- ============================================================
-- Feature: Hidratação diária do aluno (WaterTracker)
-- O aluno registra a água; o personal vê quanto bebeu hoje.
-- ============================================================
CREATE TABLE IF NOT EXISTS water_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID REFERENCES students(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  intake_ml INTEGER NOT NULL DEFAULT 0,
  goal_ml INTEGER NOT NULL DEFAULT 2000,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id, date)
);
ALTER TABLE water_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Aluno gerencia própria hidratação" ON water_logs;
CREATE POLICY "Aluno gerencia própria hidratação" ON water_logs FOR ALL USING (
  EXISTS (SELECT 1 FROM students s WHERE s.id = water_logs.student_id AND s.user_id = auth.uid())
);

DROP POLICY IF EXISTS "Personal vê hidratação dos alunos" ON water_logs;
CREATE POLICY "Personal vê hidratação dos alunos" ON water_logs FOR SELECT USING (
  EXISTS (SELECT 1 FROM students s WHERE s.id = water_logs.student_id AND s.personal_id = auth.uid())
);

-- ============================================================
-- Feature: Metas de macros no plano alimentar
-- ============================================================
ALTER TABLE meal_plans ADD COLUMN IF NOT EXISTS goal_calories NUMERIC;
ALTER TABLE meal_plans ADD COLUMN IF NOT EXISTS goal_protein_g NUMERIC;
ALTER TABLE meal_plans ADD COLUMN IF NOT EXISTS goal_carbs_g NUMERIC;
ALTER TABLE meal_plans ADD COLUMN IF NOT EXISTS goal_fat_g NUMERIC;

-- ============================================================
-- Feature: Observações por refeição
-- ============================================================
ALTER TABLE meal_plan_meals ADD COLUMN IF NOT EXISTS notes TEXT;

-- ============================================================
-- Feature: Anamnese nutricional completa
-- ============================================================
CREATE TABLE IF NOT EXISTS nutrition_anamnesis (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID UNIQUE REFERENCES students(id) ON DELETE CASCADE NOT NULL,
  personal_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  goal TEXT,
  allergies TEXT,
  restrictions TEXT,
  preferences TEXT,
  water_goal_ml INTEGER DEFAULT 2000,
  notes TEXT,
  weight NUMERIC(5,2),
  height INTEGER,
  age INTEGER,
  sex TEXT CHECK (sex IN ('masculino', 'feminino')),
  activity_level TEXT DEFAULT 'moderado',
  conditions TEXT,
  medications TEXT,
  workout_time TEXT,
  meal_count INTEGER DEFAULT 5,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE nutrition_anamnesis ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Personal gerencia anamnese nutricional" ON nutrition_anamnesis;
CREATE POLICY "Personal gerencia anamnese nutricional" ON nutrition_anamnesis FOR ALL USING (personal_id = auth.uid());
DROP POLICY IF EXISTS "Aluno ve propria anamnese nutricional" ON nutrition_anamnesis;
CREATE POLICY "Aluno ve propria anamnese nutricional" ON nutrition_anamnesis FOR SELECT USING (
  EXISTS (SELECT 1 FROM students s WHERE s.id = nutrition_anamnesis.student_id AND s.user_id = auth.uid())
);

-- ============================================================
-- GAMIFICAÇÃO — Conquistas e XP
-- ============================================================
CREATE TABLE IF NOT EXISTS student_achievements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  achievement_key TEXT NOT NULL,
  unlocked_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(student_id, achievement_key)
);
ALTER TABLE student_achievements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Aluno gerencia proprias conquistas" ON student_achievements;
CREATE POLICY "Aluno gerencia proprias conquistas" ON student_achievements FOR ALL USING (auth.uid() = student_id);
DROP POLICY IF EXISTS "Personal ve conquistas dos alunos" ON student_achievements;
CREATE POLICY "Personal ve conquistas dos alunos" ON student_achievements FOR SELECT USING (
  student_id IN (SELECT id FROM students WHERE personal_id = auth.uid())
);

-- ============================================================
-- LOG ALIMENTAR DO ALUNO
-- ============================================================
CREATE TABLE IF NOT EXISTS food_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  personal_id UUID,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  meal_type TEXT NOT NULL,
  food_name TEXT NOT NULL,
  quantity_g NUMERIC NOT NULL DEFAULT 100,
  kcal NUMERIC,
  protein_g NUMERIC,
  carbs_g NUMERIC,
  fat_g NUMERIC,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE food_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Aluno gerencia proprio log alimentar" ON food_logs;
CREATE POLICY "Aluno gerencia proprio log alimentar" ON food_logs FOR ALL USING (auth.uid() = student_id);
DROP POLICY IF EXISTS "Personal le log alimentar dos alunos" ON food_logs;
CREATE POLICY "Personal le log alimentar dos alunos" ON food_logs FOR SELECT USING (
  personal_id = auth.uid() OR student_id IN (SELECT id FROM students WHERE personal_id = auth.uid())
);

-- ============================================================
-- DESAFIOS
-- ============================================================
CREATE TABLE IF NOT EXISTS challenges (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  personal_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL DEFAULT 'workouts',
  target_value NUMERIC NOT NULL DEFAULT 10,
  start_date DATE,
  end_date DATE,
  xp_reward INTEGER DEFAULT 200,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE challenges ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Personal gerencia desafios" ON challenges;
CREATE POLICY "Personal gerencia desafios" ON challenges FOR ALL USING (personal_id = auth.uid());
DROP POLICY IF EXISTS "Aluno ve desafios" ON challenges;
CREATE POLICY "Aluno ve desafios" ON challenges FOR SELECT USING (true);

CREATE TABLE IF NOT EXISTS student_challenges (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  challenge_id UUID REFERENCES challenges(id) ON DELETE CASCADE,
  progress NUMERIC DEFAULT 0,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(student_id, challenge_id)
);
ALTER TABLE student_challenges ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Aluno gerencia proprios desafios" ON student_challenges;
CREATE POLICY "Aluno gerencia proprios desafios" ON student_challenges FOR ALL USING (auth.uid() = student_id);
DROP POLICY IF EXISTS "Personal ve desafios dos alunos" ON student_challenges;
CREATE POLICY "Personal ve desafios dos alunos" ON student_challenges FOR SELECT USING (
  challenge_id IN (SELECT id FROM challenges WHERE personal_id = auth.uid())
);

-- ============================================================
-- TURMAS / AULAS COLETIVAS
-- ============================================================
CREATE TABLE IF NOT EXISTS group_classes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  personal_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT DEFAULT 'Musculação',
  date DATE NOT NULL,
  time TIME NOT NULL,
  duration_minutes INTEGER DEFAULT 60,
  max_students INTEGER DEFAULT 15,
  location TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE group_classes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Personal gerencia turmas" ON group_classes;
CREATE POLICY "Personal gerencia turmas" ON group_classes FOR ALL USING (personal_id = auth.uid());

CREATE TABLE IF NOT EXISTS group_class_attendance (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  class_id UUID REFERENCES group_classes(id) ON DELETE CASCADE,
  student_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'confirmado',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(class_id, student_id)
);
ALTER TABLE group_class_attendance ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Personal gerencia presenca em turmas" ON group_class_attendance;
CREATE POLICY "Personal gerencia presenca em turmas" ON group_class_attendance FOR ALL USING (
  class_id IN (SELECT id FROM group_classes WHERE personal_id = auth.uid())
);

-- ============================================================
-- CONFIGURAÇÕES DO PERSONAL (WHITE-LABEL)
-- ============================================================
CREATE TABLE IF NOT EXISTS personal_settings (
  personal_id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  brand_name TEXT,
  tagline TEXT,
  logo_url TEXT,
  accent_color TEXT DEFAULT '#818CF8',
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE personal_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Personal gerencia proprias configuracoes" ON personal_settings;
CREATE POLICY "Personal gerencia proprias configuracoes" ON personal_settings FOR ALL USING (personal_id = auth.uid());
