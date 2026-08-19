-- ============================================================
-- WAY FIT — Schema do Banco de Dados
-- Rode este SQL no Supabase > Database > SQL Editor
-- Pode ser executado múltiplas vezes sem erros
-- ============================================================

-- Tabela de perfis (estende auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('personal', 'student')),
  avatar TEXT DEFAULT 'WF',
  phone TEXT,
  bio TEXT,
  slug TEXT UNIQUE,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Adicionar colunas caso a tabela já exista (idempotente)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS slug TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS pix_key TEXT;

-- Índice único em slug (ignorar se já existir)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename='profiles' AND indexname='profiles_slug_unique') THEN
    CREATE UNIQUE INDEX profiles_slug_unique ON profiles(slug) WHERE slug IS NOT NULL;
  END IF;
END $$;

-- Alunos (gerenciados pelo personal)
CREATE TABLE IF NOT EXISTS students (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  personal_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  plan TEXT DEFAULT 'Start',
  plan_price NUMERIC DEFAULT 150,
  status TEXT DEFAULT 'ativo',
  goal TEXT,
  age INTEGER,
  initials TEXT,
  color TEXT DEFAULT '#6B7280',
  join_date DATE DEFAULT CURRENT_DATE,
  last_training TEXT DEFAULT 'Nunca',
  weight NUMERIC(5,2),
  height INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Agendamentos
CREATE TABLE IF NOT EXISTS appointments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  personal_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  student_id UUID REFERENCES students(id) ON DELETE CASCADE NOT NULL,
  student_name TEXT,
  date DATE NOT NULL,
  time TIME NOT NULL,
  type TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  color TEXT DEFAULT '#3B82F6',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Planos de treino
CREATE TABLE IF NOT EXISTS training_plans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  personal_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  student_id UUID REFERENCES students(id) ON DELETE CASCADE NOT NULL,
  student_name TEXT,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'Hipertrofia',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Exercícios dos planos
CREATE TABLE IF NOT EXISTS exercises (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  plan_id UUID REFERENCES training_plans(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  sets INTEGER DEFAULT 3,
  reps TEXT DEFAULT '10-12',
  rest TEXT DEFAULT '60s',
  video_url TEXT DEFAULT '',
  obs TEXT DEFAULT '',
  order_index INTEGER DEFAULT 0
);

-- Pagamentos
CREATE TABLE IF NOT EXISTS payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  personal_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  student_id UUID REFERENCES students(id) ON DELETE CASCADE NOT NULL,
  student_name TEXT,
  plan TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  due_date DATE NOT NULL,
  paid_date DATE,
  status TEXT DEFAULT 'pendente',
  month TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Medições corporais
CREATE TABLE IF NOT EXISTS measurements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID REFERENCES students(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  weight NUMERIC,
  waist NUMERIC,
  chest NUMERIC,
  arm NUMERIC,
  hip NUMERIC,
  body_fat NUMERIC,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Mensagens
CREATE TABLE IF NOT EXISTS messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  personal_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  student_id UUID REFERENCES students(id) ON DELETE CASCADE NOT NULL,
  from_role TEXT NOT NULL CHECK (from_role IN ('personal', 'student')),
  text TEXT NOT NULL,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ GENERATED ALWAYS AS (sent_at) STORED,
  read BOOLEAN DEFAULT FALSE
);

ALTER TABLE messages ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ GENERATED ALWAYS AS (sent_at) STORED;
-- Realtime (chat) precisa dos valores antigos da linha em UPDATE/DELETE
ALTER TABLE messages REPLICA IDENTITY FULL;

-- Fotos de progresso
CREATE TABLE IF NOT EXISTS progress_photos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID REFERENCES students(id) ON DELETE CASCADE NOT NULL,
  url TEXT,
  label TEXT,
  date DATE,
  weight TEXT,
  tag TEXT DEFAULT 'durante',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Anamnese (treino) — nome real usado pelo código é plural: "anamneses"
CREATE TABLE IF NOT EXISTS anamneses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID REFERENCES students(id) ON DELETE CASCADE NOT NULL UNIQUE,
  data JSONB DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Convites
CREATE TABLE IF NOT EXISTS invites (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  personal_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  personal_name TEXT,
  email TEXT NOT NULL,
  student_name TEXT,
  token TEXT UNIQUE DEFAULT gen_random_uuid()::TEXT,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- Row Level Security (RLS)
-- ============================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE measurements ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE progress_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE anamneses ENABLE ROW LEVEL SECURITY;
ALTER TABLE invites ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- Políticas (DROP antes de criar para evitar conflito)
-- ============================================================

-- Profiles
DROP POLICY IF EXISTS "User vê próprio perfil" ON profiles;
DROP POLICY IF EXISTS "User atualiza próprio perfil" ON profiles;
DROP POLICY IF EXISTS "Insert próprio perfil" ON profiles;
DROP POLICY IF EXISTS "Personal vê perfis dos alunos" ON profiles;
DROP POLICY IF EXISTS "Perfil público por slug" ON profiles;
CREATE POLICY "User vê próprio perfil" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "User atualiza próprio perfil" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Insert próprio perfil" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Personal vê perfis dos alunos" ON profiles FOR SELECT USING (
  EXISTS (SELECT 1 FROM students WHERE students.user_id = profiles.id AND students.personal_id = auth.uid())
);
CREATE POLICY "Perfil público por slug" ON profiles FOR SELECT USING (slug IS NOT NULL);

-- Students
DROP POLICY IF EXISTS "Personal gerencia próprios alunos" ON students;
DROP POLICY IF EXISTS "Aluno vê próprio cadastro" ON students;
DROP POLICY IF EXISTS "Aluno atualiza próprio cadastro" ON students;
CREATE POLICY "Personal gerencia próprios alunos" ON students FOR ALL USING (personal_id = auth.uid());
CREATE POLICY "Aluno vê próprio cadastro" ON students FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Aluno atualiza próprio cadastro" ON students FOR UPDATE USING (user_id = auth.uid());

-- Appointments
DROP POLICY IF EXISTS "Personal gerencia agendamentos" ON appointments;
DROP POLICY IF EXISTS "Aluno vê próprios agendamentos" ON appointments;
CREATE POLICY "Personal gerencia agendamentos" ON appointments FOR ALL USING (personal_id = auth.uid());
CREATE POLICY "Aluno vê próprios agendamentos" ON appointments FOR SELECT USING (
  EXISTS (SELECT 1 FROM students s WHERE s.id = appointments.student_id AND s.user_id = auth.uid())
);

-- Training plans
DROP POLICY IF EXISTS "Personal gerencia treinos" ON training_plans;
DROP POLICY IF EXISTS "Aluno vê próprios treinos" ON training_plans;
CREATE POLICY "Personal gerencia treinos" ON training_plans FOR ALL USING (personal_id = auth.uid());
CREATE POLICY "Aluno vê próprios treinos" ON training_plans FOR SELECT USING (
  EXISTS (SELECT 1 FROM students s WHERE s.id = training_plans.student_id AND s.user_id = auth.uid())
);

-- Exercises
DROP POLICY IF EXISTS "Personal gerencia exercícios" ON exercises;
DROP POLICY IF EXISTS "Aluno vê próprios exercícios" ON exercises;
CREATE POLICY "Personal gerencia exercícios" ON exercises FOR ALL USING (
  EXISTS (SELECT 1 FROM training_plans tp WHERE tp.id = exercises.plan_id AND tp.personal_id = auth.uid())
);
CREATE POLICY "Aluno vê próprios exercícios" ON exercises FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM training_plans tp JOIN students s ON s.id = tp.student_id
    WHERE tp.id = exercises.plan_id AND s.user_id = auth.uid()
  )
);

-- Payments
DROP POLICY IF EXISTS "Personal gerencia pagamentos" ON payments;
DROP POLICY IF EXISTS "Aluno vê próprios pagamentos" ON payments;
CREATE POLICY "Personal gerencia pagamentos" ON payments FOR ALL USING (personal_id = auth.uid());
CREATE POLICY "Aluno vê próprios pagamentos" ON payments FOR SELECT USING (
  EXISTS (SELECT 1 FROM students s WHERE s.id = payments.student_id AND s.user_id = auth.uid())
);

-- Measurements
DROP POLICY IF EXISTS "Aluno gerencia próprias medições" ON measurements;
DROP POLICY IF EXISTS "Personal vê medições dos alunos" ON measurements;
CREATE POLICY "Aluno gerencia próprias medições" ON measurements FOR ALL USING (
  EXISTS (SELECT 1 FROM students s WHERE s.id = measurements.student_id AND s.user_id = auth.uid())
);
CREATE POLICY "Personal vê medições dos alunos" ON measurements FOR SELECT USING (
  EXISTS (SELECT 1 FROM students s WHERE s.id = measurements.student_id AND s.personal_id = auth.uid())
);

-- Messages
DROP POLICY IF EXISTS "Personal gerencia mensagens" ON messages;
DROP POLICY IF EXISTS "Aluno gerencia próprias mensagens" ON messages;
CREATE POLICY "Personal gerencia mensagens" ON messages FOR ALL USING (personal_id = auth.uid());
CREATE POLICY "Aluno gerencia próprias mensagens" ON messages FOR ALL USING (
  EXISTS (SELECT 1 FROM students s WHERE s.id = messages.student_id AND s.user_id = auth.uid())
);

-- Progress photos
DROP POLICY IF EXISTS "Aluno gerencia próprias fotos" ON progress_photos;
DROP POLICY IF EXISTS "Personal vê fotos dos alunos" ON progress_photos;
CREATE POLICY "Aluno gerencia próprias fotos" ON progress_photos FOR ALL USING (
  EXISTS (SELECT 1 FROM students s WHERE s.id = progress_photos.student_id AND s.user_id = auth.uid())
);
CREATE POLICY "Personal vê fotos dos alunos" ON progress_photos FOR SELECT USING (
  EXISTS (SELECT 1 FROM students s WHERE s.id = progress_photos.student_id AND s.personal_id = auth.uid())
);

-- Anamnese (treino)
DROP POLICY IF EXISTS "Aluno gerencia própria anamnese" ON anamneses;
DROP POLICY IF EXISTS "Personal vê anamnese dos alunos" ON anamneses;
DROP POLICY IF EXISTS "Aluno gerencia própria anamnese de treino" ON anamneses;
DROP POLICY IF EXISTS "Personal vê anamnese de treino dos alunos" ON anamneses;
CREATE POLICY "Aluno gerencia própria anamnese" ON anamneses FOR ALL USING (
  EXISTS (SELECT 1 FROM students s WHERE s.id = anamneses.student_id AND s.user_id = auth.uid())
);
CREATE POLICY "Personal vê anamnese dos alunos" ON anamneses FOR SELECT USING (
  EXISTS (SELECT 1 FROM students s WHERE s.id = anamneses.student_id AND s.personal_id = auth.uid())
);

-- Invites
DROP POLICY IF EXISTS "Personal gerencia convites" ON invites;
DROP POLICY IF EXISTS "Leitura pública de convites" ON invites;
CREATE POLICY "Personal gerencia convites" ON invites FOR ALL USING (personal_id = auth.uid());
CREATE POLICY "Leitura pública de convites" ON invites FOR SELECT USING (true);

-- ============================================================
-- Trigger: criar perfil automaticamente no cadastro
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_name TEXT;
  v_role TEXT;
  v_avatar TEXT;
BEGIN
  v_name   := COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1));
  v_role   := COALESCE(NEW.raw_user_meta_data->>'role', 'personal');
  v_avatar := UPPER(LEFT(v_name, 1) || LEFT(SPLIT_PART(v_name, ' ', 2), 1));

  INSERT INTO public.profiles (id, name, role, avatar)
  VALUES (NEW.id, v_name, v_role, v_avatar)
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- Colunas extras em tabelas existentes
-- ============================================================
ALTER TABLE training_plans ADD COLUMN IF NOT EXISTS days TEXT[] DEFAULT '{}';
-- Templates de cartilha não têm aluno associado (student_id nullable)
ALTER TABLE training_plans ALTER COLUMN student_id DROP NOT NULL;
ALTER TABLE exercises      ADD COLUMN IF NOT EXISTS load TEXT DEFAULT '';
ALTER TABLE exercises      ADD COLUMN IF NOT EXISTS superset_group TEXT;
ALTER TABLE students       ADD COLUMN IF NOT EXISTS onboarded_at TIMESTAMPTZ;

-- ============================================================
-- Aulas em grupo (Turmas)
-- ============================================================
CREATE TABLE IF NOT EXISTS group_classes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  personal_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  type TEXT DEFAULT 'Funcional',
  date DATE NOT NULL,
  time TIME NOT NULL,
  duration_minutes INTEGER DEFAULT 60,
  max_students INTEGER DEFAULT 10,
  location TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS group_class_attendance (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  class_id UUID REFERENCES group_classes(id) ON DELETE CASCADE NOT NULL,
  student_id UUID REFERENCES students(id) ON DELETE CASCADE NOT NULL,
  status TEXT DEFAULT 'confirmado',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(class_id, student_id)
);

-- ============================================================
-- Nutrição
-- ============================================================
CREATE TABLE IF NOT EXISTS meal_plans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  personal_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  student_id UUID REFERENCES students(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL DEFAULT 'Plano Alimentar',
  goal TEXT DEFAULT '',
  is_active BOOLEAN DEFAULT TRUE,
  goal_calories NUMERIC DEFAULT 0,
  goal_protein_g NUMERIC DEFAULT 0,
  goal_carbs_g NUMERIC DEFAULT 0,
  goal_fat_g NUMERIC DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS food_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  personal_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  category TEXT DEFAULT 'Geral',
  calories_per_100g NUMERIC DEFAULT 0,
  protein_per_100g NUMERIC DEFAULT 0,
  carbs_per_100g NUMERIC DEFAULT 0,
  fat_per_100g NUMERIC DEFAULT 0,
  fiber_per_100g NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS meal_plan_meals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  meal_plan_id UUID REFERENCES meal_plans(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL DEFAULT 'Refeição',
  time_of_day TEXT DEFAULT '08:00',
  order_index INTEGER DEFAULT 0,
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS meal_plan_foods (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  meal_id UUID REFERENCES meal_plan_meals(id) ON DELETE CASCADE NOT NULL,
  food_item_id UUID REFERENCES food_items(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  quantity_g NUMERIC DEFAULT 100,
  calories NUMERIC DEFAULT 0,
  protein_g NUMERIC DEFAULT 0,
  carbs_g NUMERIC DEFAULT 0,
  fat_g NUMERIC DEFAULT 0,
  order_index INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS nutrition_anamnesis (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID REFERENCES students(id) ON DELETE CASCADE NOT NULL UNIQUE,
  personal_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  goal TEXT DEFAULT '',
  allergies TEXT DEFAULT '',
  restrictions TEXT DEFAULT '',
  preferences TEXT DEFAULT '',
  water_goal_ml INTEGER DEFAULT 2000,
  notes TEXT DEFAULT '',
  weight NUMERIC,
  height INTEGER,
  age INTEGER,
  sex TEXT DEFAULT 'M',
  activity_level TEXT DEFAULT 'moderado',
  conditions TEXT DEFAULT '',
  medications TEXT DEFAULT '',
  workout_time TEXT DEFAULT '',
  meal_count INTEGER DEFAULT 3,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS food_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID REFERENCES students(id) ON DELETE CASCADE NOT NULL,
  personal_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  meal_type TEXT DEFAULT 'Café da manhã',
  food_name TEXT NOT NULL,
  quantity_g NUMERIC DEFAULT 100,
  kcal NUMERIC DEFAULT 0,
  protein_g NUMERIC DEFAULT 0,
  carbs_g NUMERIC DEFAULT 0,
  fat_g NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- Treinos executados (Histórico / ExecutarTreino)
-- ============================================================
CREATE TABLE IF NOT EXISTS workout_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID REFERENCES students(id) ON DELETE CASCADE NOT NULL,
  personal_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  plan_id UUID REFERENCES training_plans(id) ON DELETE SET NULL,
  plan_name TEXT DEFAULT '',
  plan_type TEXT DEFAULT '',
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  finished_at TIMESTAMPTZ,
  exercises_total INTEGER DEFAULT 0,
  exercises_done INTEGER DEFAULT 0,
  rating INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS exercise_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES workout_sessions(id) ON DELETE CASCADE NOT NULL,
  student_id UUID REFERENCES students(id) ON DELETE CASCADE NOT NULL,
  exercise_id UUID REFERENCES exercises(id) ON DELETE SET NULL,
  exercise_name TEXT NOT NULL,
  sets_planned INTEGER DEFAULT 0,
  reps_planned TEXT DEFAULT '',
  load_planned TEXT DEFAULT '',
  load_actual TEXT,
  sets_data JSONB DEFAULT '[]',
  done BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS session_ratings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID REFERENCES students(id) ON DELETE CASCADE NOT NULL,
  personal_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  rating INTEGER CHECK (rating BETWEEN 1 AND 5),
  feeling TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id, date)
);

-- ============================================================
-- Frequência
-- ============================================================
CREATE TABLE IF NOT EXISTS attendances (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID REFERENCES students(id) ON DELETE CASCADE NOT NULL,
  personal_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT DEFAULT 'present' CHECK (status IN ('present', 'absent', 'late')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id, date)
);
ALTER TABLE attendances ADD COLUMN IF NOT EXISTS appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL;
ALTER TABLE attendances ADD COLUMN IF NOT EXISTS notes TEXT;

-- ============================================================
-- Conquistas e Desafios (Gamificação)
-- ============================================================
CREATE TABLE IF NOT EXISTS student_achievements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID REFERENCES students(id) ON DELETE CASCADE NOT NULL,
  achievement_key TEXT NOT NULL,
  unlocked_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id, achievement_key)
);

CREATE TABLE IF NOT EXISTS challenges (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  type TEXT NOT NULL,
  target_value NUMERIC DEFAULT 1,
  xp_reward INTEGER DEFAULT 100,
  start_date DATE,
  end_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS student_challenges (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID REFERENCES students(id) ON DELETE CASCADE NOT NULL,
  challenge_id UUID REFERENCES challenges(id) ON DELETE CASCADE NOT NULL,
  progress NUMERIC DEFAULT 0,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id, challenge_id)
);

-- ============================================================
-- Medições simplificadas para Conquistas
-- ============================================================
CREATE TABLE IF NOT EXISTS student_measurements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID REFERENCES students(id) ON DELETE CASCADE NOT NULL,
  weight NUMERIC NOT NULL,
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);

-- Logs de água
CREATE TABLE IF NOT EXISTS water_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID REFERENCES students(id) ON DELETE CASCADE NOT NULL,
  intake_ml NUMERIC DEFAULT 0,
  goal_ml NUMERIC DEFAULT 2000,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id, date)
);

-- ============================================================
-- RLS para tabelas novas
-- ============================================================
ALTER TABLE group_classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_class_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE food_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_plan_meals ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_plan_foods ENABLE ROW LEVEL SECURITY;
ALTER TABLE nutrition_anamnesis ENABLE ROW LEVEL SECURITY;
ALTER TABLE food_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercise_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendances ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_measurements ENABLE ROW LEVEL SECURITY;
ALTER TABLE water_logs ENABLE ROW LEVEL SECURITY;

-- Group classes
DROP POLICY IF EXISTS "Personal gerencia aulas" ON group_classes;
DROP POLICY IF EXISTS "Aluno vê próprias aulas" ON group_classes;
CREATE POLICY "Personal gerencia aulas" ON group_classes FOR ALL USING (personal_id = auth.uid());
CREATE POLICY "Aluno vê próprias aulas" ON group_classes FOR SELECT USING (
  EXISTS (SELECT 1 FROM group_class_attendance gca JOIN students s ON s.id = gca.student_id
          WHERE gca.class_id = group_classes.id AND s.user_id = auth.uid())
);
DROP POLICY IF EXISTS "Personal gerencia presença em aulas" ON group_class_attendance;
DROP POLICY IF EXISTS "Aluno vê própria presença" ON group_class_attendance;
CREATE POLICY "Personal gerencia presença em aulas" ON group_class_attendance FOR ALL USING (
  EXISTS (SELECT 1 FROM group_classes gc WHERE gc.id = group_class_attendance.class_id AND gc.personal_id = auth.uid())
);
CREATE POLICY "Aluno vê própria presença" ON group_class_attendance FOR SELECT USING (
  EXISTS (SELECT 1 FROM students s WHERE s.id = group_class_attendance.student_id AND s.user_id = auth.uid())
);

-- Meal plans
DROP POLICY IF EXISTS "Personal gerencia planos alimentares" ON meal_plans;
DROP POLICY IF EXISTS "Aluno vê próprio plano alimentar" ON meal_plans;
CREATE POLICY "Personal gerencia planos alimentares" ON meal_plans FOR ALL USING (personal_id = auth.uid());
CREATE POLICY "Aluno vê próprio plano alimentar" ON meal_plans FOR SELECT USING (
  EXISTS (SELECT 1 FROM students s WHERE s.id = meal_plans.student_id AND s.user_id = auth.uid())
);

-- Food items (personal cria, aluno pode ler)
DROP POLICY IF EXISTS "Personal gerencia alimentos" ON food_items;
DROP POLICY IF EXISTS "Aluno lê alimentos" ON food_items;
CREATE POLICY "Personal gerencia alimentos" ON food_items FOR ALL USING (personal_id = auth.uid() OR personal_id IS NULL);
CREATE POLICY "Aluno lê alimentos" ON food_items FOR SELECT USING (true);

-- Meal plan meals/foods
DROP POLICY IF EXISTS "Personal gerencia refeições" ON meal_plan_meals;
DROP POLICY IF EXISTS "Aluno vê próprias refeições" ON meal_plan_meals;
CREATE POLICY "Personal gerencia refeições" ON meal_plan_meals FOR ALL USING (
  EXISTS (SELECT 1 FROM meal_plans mp WHERE mp.id = meal_plan_meals.meal_plan_id AND mp.personal_id = auth.uid())
);
CREATE POLICY "Aluno vê próprias refeições" ON meal_plan_meals FOR SELECT USING (
  EXISTS (SELECT 1 FROM meal_plans mp JOIN students s ON s.id = mp.student_id
          WHERE mp.id = meal_plan_meals.meal_plan_id AND s.user_id = auth.uid())
);
DROP POLICY IF EXISTS "Personal gerencia alimentos das refeições" ON meal_plan_foods;
DROP POLICY IF EXISTS "Aluno vê alimentos das refeições" ON meal_plan_foods;
CREATE POLICY "Personal gerencia alimentos das refeições" ON meal_plan_foods FOR ALL USING (
  EXISTS (SELECT 1 FROM meal_plan_meals mm JOIN meal_plans mp ON mp.id = mm.meal_plan_id
          WHERE mm.id = meal_plan_foods.meal_id AND mp.personal_id = auth.uid())
);
CREATE POLICY "Aluno vê alimentos das refeições" ON meal_plan_foods FOR SELECT USING (
  EXISTS (SELECT 1 FROM meal_plan_meals mm JOIN meal_plans mp ON mp.id = mm.meal_plan_id
          JOIN students s ON s.id = mp.student_id
          WHERE mm.id = meal_plan_foods.meal_id AND s.user_id = auth.uid())
);

-- Nutrition anamnesis
DROP POLICY IF EXISTS "Personal gerencia anamnese nutricional" ON nutrition_anamnesis;
DROP POLICY IF EXISTS "Aluno vê própria anamnese nutricional" ON nutrition_anamnesis;
CREATE POLICY "Personal gerencia anamnese nutricional" ON nutrition_anamnesis FOR ALL USING (personal_id = auth.uid());
CREATE POLICY "Aluno vê própria anamnese nutricional" ON nutrition_anamnesis FOR SELECT USING (
  EXISTS (SELECT 1 FROM students s WHERE s.id = nutrition_anamnesis.student_id AND s.user_id = auth.uid())
);

-- Food logs
DROP POLICY IF EXISTS "Aluno gerencia log alimentar" ON food_logs;
DROP POLICY IF EXISTS "Personal vê log alimentar" ON food_logs;
CREATE POLICY "Aluno gerencia log alimentar" ON food_logs FOR ALL USING (
  EXISTS (SELECT 1 FROM students s WHERE s.id = food_logs.student_id AND s.user_id = auth.uid())
);
CREATE POLICY "Personal vê log alimentar" ON food_logs FOR SELECT USING (
  EXISTS (SELECT 1 FROM students s WHERE s.id = food_logs.student_id AND s.personal_id = auth.uid())
);

-- Workout sessions
DROP POLICY IF EXISTS "Aluno gerencia próprias sessões" ON workout_sessions;
DROP POLICY IF EXISTS "Personal vê sessões dos alunos" ON workout_sessions;
CREATE POLICY "Aluno gerencia próprias sessões" ON workout_sessions FOR ALL USING (
  EXISTS (SELECT 1 FROM students s WHERE s.id = workout_sessions.student_id AND s.user_id = auth.uid())
);
CREATE POLICY "Personal vê sessões dos alunos" ON workout_sessions FOR SELECT USING (personal_id = auth.uid());

-- Exercise logs
DROP POLICY IF EXISTS "Aluno gerencia próprios logs de exercícios" ON exercise_logs;
DROP POLICY IF EXISTS "Personal vê logs de exercícios" ON exercise_logs;
CREATE POLICY "Aluno gerencia próprios logs de exercícios" ON exercise_logs FOR ALL USING (
  EXISTS (SELECT 1 FROM students s WHERE s.id = exercise_logs.student_id AND s.user_id = auth.uid())
);
CREATE POLICY "Personal vê logs de exercícios" ON exercise_logs FOR SELECT USING (
  EXISTS (SELECT 1 FROM students s WHERE s.id = exercise_logs.student_id AND s.personal_id = auth.uid())
);

-- Session ratings
DROP POLICY IF EXISTS "Aluno gerencia avaliações de sessão" ON session_ratings;
CREATE POLICY "Aluno gerencia avaliações de sessão" ON session_ratings FOR ALL USING (
  EXISTS (SELECT 1 FROM students s WHERE s.id = session_ratings.student_id AND s.user_id = auth.uid())
);

-- Attendances
DROP POLICY IF EXISTS "Personal gerencia frequência" ON attendances;
DROP POLICY IF EXISTS "Aluno vê própria frequência" ON attendances;
CREATE POLICY "Personal gerencia frequência" ON attendances FOR ALL USING (personal_id = auth.uid());
CREATE POLICY "Aluno vê própria frequência" ON attendances FOR SELECT USING (
  EXISTS (SELECT 1 FROM students s WHERE s.id = attendances.student_id AND s.user_id = auth.uid())
);

-- Achievements
DROP POLICY IF EXISTS "Aluno gerencia próprias conquistas" ON student_achievements;
DROP POLICY IF EXISTS "Personal vê conquistas dos alunos" ON student_achievements;
CREATE POLICY "Aluno gerencia próprias conquistas" ON student_achievements FOR ALL USING (
  EXISTS (SELECT 1 FROM students s WHERE s.id = student_achievements.student_id AND s.user_id = auth.uid())
);
CREATE POLICY "Personal vê conquistas dos alunos" ON student_achievements FOR SELECT USING (
  EXISTS (SELECT 1 FROM students s WHERE s.id = student_achievements.student_id AND s.personal_id = auth.uid())
);

-- Challenges (leitura pública)
DROP POLICY IF EXISTS "Leitura pública de desafios" ON challenges;
CREATE POLICY "Leitura pública de desafios" ON challenges FOR SELECT USING (true);

-- Student challenges
DROP POLICY IF EXISTS "Aluno gerencia próprios desafios" ON student_challenges;
CREATE POLICY "Aluno gerencia próprios desafios" ON student_challenges FOR ALL USING (
  EXISTS (SELECT 1 FROM students s WHERE s.id = student_challenges.student_id AND s.user_id = auth.uid())
);

-- Student measurements
DROP POLICY IF EXISTS "Aluno gerencia próprias medições simples" ON student_measurements;
DROP POLICY IF EXISTS "Personal vê medições simples dos alunos" ON student_measurements;
CREATE POLICY "Aluno gerencia próprias medições simples" ON student_measurements FOR ALL USING (
  EXISTS (SELECT 1 FROM students s WHERE s.id = student_measurements.student_id AND s.user_id = auth.uid())
);
CREATE POLICY "Personal vê medições simples dos alunos" ON student_measurements FOR SELECT USING (
  EXISTS (SELECT 1 FROM students s WHERE s.id = student_measurements.student_id AND s.personal_id = auth.uid())
);

-- Water logs
DROP POLICY IF EXISTS "Aluno gerencia log de água" ON water_logs;
DROP POLICY IF EXISTS "Personal vê log de água" ON water_logs;
CREATE POLICY "Aluno gerencia log de água" ON water_logs FOR ALL USING (
  EXISTS (SELECT 1 FROM students s WHERE s.id = water_logs.student_id AND s.user_id = auth.uid())
);
CREATE POLICY "Personal vê log de água" ON water_logs FOR SELECT USING (
  EXISTS (SELECT 1 FROM students s WHERE s.id = water_logs.student_id AND s.personal_id = auth.uid())
);

-- ============================================================
-- Check-ins diários do aluno (humor, energia, sono, dores)
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
CREATE POLICY "Aluno gerencia check-ins" ON daily_checkins FOR ALL USING (
  EXISTS (SELECT 1 FROM students s WHERE s.id = daily_checkins.student_id AND s.user_id = auth.uid())
);
DROP POLICY IF EXISTS "Personal vê check-ins dos alunos" ON daily_checkins;
CREATE POLICY "Personal vê check-ins dos alunos" ON daily_checkins FOR SELECT USING (personal_id = auth.uid());

-- ============================================================
-- Agendamentos recorrentes
-- ============================================================
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS recurring_weekly BOOLEAN DEFAULT false;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS recurring_until DATE;

-- ============================================================
-- Consentimento LGPD (registro de aceite dos termos)
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
CREATE POLICY "User gerencia próprio consentimento" ON lgpd_consents FOR ALL USING (user_id = auth.uid());

-- ============================================================
-- Biblioteca de exercícios compartilhada
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
CREATE POLICY "Lê exercícios globais e próprios" ON exercise_library FOR SELECT USING (
  is_global = true OR personal_id = auth.uid()
  OR EXISTS (SELECT 1 FROM students s WHERE s.personal_id = exercise_library.personal_id AND s.user_id = auth.uid())
);
DROP POLICY IF EXISTS "Personal gerencia própria biblioteca" ON exercise_library;
CREATE POLICY "Personal gerencia própria biblioteca" ON exercise_library FOR ALL USING (personal_id = auth.uid());

-- ============================================================
-- Função: última sessão de treino por aluno (alertas de inatividade)
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
-- Índices de performance
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_workout_sessions_student_date ON workout_sessions(student_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_workout_sessions_personal_date ON workout_sessions(personal_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_daily_checkins_student_date ON daily_checkins(student_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_food_logs_student_date ON food_logs(student_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_appointments_personal_date ON appointments(personal_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_measurements_student_date ON measurements(student_id, date ASC);

-- ============================================================
-- Storage: bucket "avatars" para fotos de perfil (público)
-- ============================================================
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

-- ============================================================
-- Notificações push (PWA) e notificações in-app do aluno
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
  type TEXT DEFAULT 'custom' CHECK (type IN ('message', 'workout', 'payment', 'appointment', 'custom', 'scheduled')),
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

-- ============================================================
-- Avaliação física (AvaliacaoFisica.jsx)
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
CREATE POLICY "Personal gerencia avaliacoes" ON physical_assessments FOR ALL USING (personal_id = auth.uid());
DROP POLICY IF EXISTS "Aluno ve proprias avaliacoes" ON physical_assessments;
CREATE POLICY "Aluno ve proprias avaliacoes" ON physical_assessments FOR SELECT USING (
  EXISTS (SELECT 1 FROM students s WHERE s.id = physical_assessments.student_id AND s.user_id = auth.uid())
);

-- ============================================================
-- Configurações do personal (white-label)
-- ============================================================
CREATE TABLE IF NOT EXISTS personal_settings (
  personal_id UUID REFERENCES profiles(id) ON DELETE CASCADE PRIMARY KEY,
  brand_name TEXT,
  tagline TEXT,
  logo_url TEXT,
  accent_color TEXT DEFAULT '#818CF8',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE personal_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Personal gerencia proprias configuracoes" ON personal_settings;
CREATE POLICY "Personal gerencia proprias configuracoes" ON personal_settings FOR ALL USING (personal_id = auth.uid());
