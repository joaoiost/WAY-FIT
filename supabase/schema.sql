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
