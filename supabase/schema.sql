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

-- Anamnese
CREATE TABLE IF NOT EXISTS anamnese (
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
ALTER TABLE anamnese ENABLE ROW LEVEL SECURITY;
ALTER TABLE invites ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- Políticas (DROP antes de criar para evitar conflito)
-- ============================================================

-- Profiles
DROP POLICY IF EXISTS "User vê próprio perfil" ON profiles;
DROP POLICY IF EXISTS "User atualiza próprio perfil" ON profiles;
DROP POLICY IF EXISTS "Insert próprio perfil" ON profiles;
DROP POLICY IF EXISTS "Personal vê perfis dos alunos" ON profiles;
CREATE POLICY "User vê próprio perfil" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "User atualiza próprio perfil" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Insert próprio perfil" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Personal vê perfis dos alunos" ON profiles FOR SELECT USING (
  EXISTS (SELECT 1 FROM students WHERE students.user_id = profiles.id AND students.personal_id = auth.uid())
);

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

-- Anamnese
DROP POLICY IF EXISTS "Aluno gerencia própria anamnese" ON anamnese;
DROP POLICY IF EXISTS "Personal vê anamnese dos alunos" ON anamnese;
CREATE POLICY "Aluno gerencia própria anamnese" ON anamnese FOR ALL USING (
  EXISTS (SELECT 1 FROM students s WHERE s.id = anamnese.student_id AND s.user_id = auth.uid())
);
CREATE POLICY "Personal vê anamnese dos alunos" ON anamnese FOR SELECT USING (
  EXISTS (SELECT 1 FROM students s WHERE s.id = anamnese.student_id AND s.personal_id = auth.uid())
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
  personal_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT DEFAULT 'present',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id, date)
);

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
