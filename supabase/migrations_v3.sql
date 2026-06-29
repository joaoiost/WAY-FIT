-- ============================================================
-- WAY FIT — Migrations v3
-- Execute no Supabase > SQL Editor
-- Corrige colunas que o código já usa mas que nunca foram criadas
-- no banco em produção — causa raiz de "não consigo salvar
-- plano alimentar" e de estatísticas de receita zeradas no Início.
-- Idempotente: pode rodar mais de uma vez sem erro.
-- ============================================================

-- ── meal_plans ────────────────────────────────────────────────
-- Sem "is_active" toda leitura/gravação de plano alimentar falha
-- (é usado em .eq('is_active', true) e no insert do novo plano).
ALTER TABLE meal_plans ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
ALTER TABLE meal_plans ADD COLUMN IF NOT EXISTS goal TEXT DEFAULT '';

-- Planos antigos que já existem precisam ficar marcados como ativos,
-- senão continuam "invisíveis" pra tela mesmo depois da coluna existir.
UPDATE meal_plans SET is_active = TRUE WHERE is_active IS NULL;

-- ── nutrition_anamnesis ───────────────────────────────────────
-- Faltavam 8 colunas — qualquer "upsert" no formulário de anamnese
-- (peso, altura, idade, sexo, nível de atividade, condições,
-- medicações, horário de treino) falhava por completo, e como é
-- uma única chamada, derrubava a gravação inteira do plano junto.
ALTER TABLE nutrition_anamnesis ADD COLUMN IF NOT EXISTS weight NUMERIC;
ALTER TABLE nutrition_anamnesis ADD COLUMN IF NOT EXISTS height INTEGER;
ALTER TABLE nutrition_anamnesis ADD COLUMN IF NOT EXISTS age INTEGER;
ALTER TABLE nutrition_anamnesis ADD COLUMN IF NOT EXISTS sex TEXT DEFAULT 'M';
ALTER TABLE nutrition_anamnesis ADD COLUMN IF NOT EXISTS activity_level TEXT DEFAULT 'moderado';
ALTER TABLE nutrition_anamnesis ADD COLUMN IF NOT EXISTS conditions TEXT DEFAULT '';
ALTER TABLE nutrition_anamnesis ADD COLUMN IF NOT EXISTS medications TEXT DEFAULT '';
ALTER TABLE nutrition_anamnesis ADD COLUMN IF NOT EXISTS workout_time TEXT DEFAULT '';

-- ── workout_sessions ──────────────────────────────────────────
-- Usado na tela de Conquistas do aluno (melhor nota de treino).
ALTER TABLE workout_sessions ADD COLUMN IF NOT EXISTS rating INTEGER;

-- ── messages ──────────────────────────────────────────────────
-- Coluna documentada no schema mas não usada pelo código hoje
-- (o chat usa created_at) — adicionada só por consistência.
ALTER TABLE messages ADD COLUMN IF NOT EXISTS sent_at TIMESTAMPTZ DEFAULT NOW();

-- ============================================================
-- anamneses (tabela de anamnese de treino do aluno)
-- Essa tabela não está em nenhum arquivo SQL do repositório —
-- foi criada fora do controle de versão em algum momento. Como
-- não há registro de como ela foi configurada, este bloco garante
-- que RLS e as políticas corretas existam, sem risco de duplicar
-- nada (idempotente).
-- ============================================================
ALTER TABLE anamneses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Aluno gerencia própria anamnese de treino" ON anamneses;
CREATE POLICY "Aluno gerencia própria anamnese de treino" ON anamneses
  FOR ALL USING (
    EXISTS (SELECT 1 FROM students s WHERE s.id = anamneses.student_id AND s.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Personal vê anamnese de treino dos alunos" ON anamneses;
CREATE POLICY "Personal vê anamnese de treino dos alunos" ON anamneses
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM students s WHERE s.id = anamneses.student_id AND s.personal_id = auth.uid())
  );
