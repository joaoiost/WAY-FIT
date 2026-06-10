const VALID_REPS = ['6', '8', '10', '12', '15', '20', 'Falha'];
const VALID_REST = ['30s', '45s', '60s', '75s', '90s', '2min'];

function sanitize(ex) {
  return {
    name: String(ex.name || '').slice(0, 80),
    sets: Math.min(Math.max(parseInt(String(ex.sets)) || 3, 1), 6),
    reps: VALID_REPS.includes(String(ex.reps)) ? String(ex.reps) : '10',
    rest: VALID_REST.includes(String(ex.rest)) ? String(ex.rest) : '60s',
    obs: String(ex.obs || '').slice(0, 80),
    load: '',
    videoUrl: '',
    supersetGroup: null,
  };
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Method not allowed' });

  try {
    const { group, planType, level, equipment, restrictions, numExercises, studentName } = req.body;
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ ok: false, error: 'ANTHROPIC_API_KEY não configurada. Adicione nas variáveis de ambiente do Vercel.' });
    }

    const n = Math.min(Math.max(parseInt(numExercises) || 6, 3), 10);

    const prompt = `Você é um personal trainer especialista brasileiro. Gere um treino em JSON.

Dados do treino:
- Aluno: ${studentName || 'Aluno'}
- Grupo muscular: ${group}
- Tipo: ${planType}
- Nível: ${level}
- Equipamentos: ${equipment}
- Restrições: ${restrictions || 'Nenhuma'}
- Quantidade de exercícios: ${n}

Retorne SOMENTE este JSON (sem texto antes ou depois):
{
  "exercises": [
    {
      "name": "Nome do exercício em português",
      "sets": 4,
      "reps": "10",
      "rest": "60s",
      "obs": "Dica curta de execução"
    }
  ]
}

Regras obrigatórias:
- "sets": inteiro de 1 a 6
- "reps": APENAS um destes valores: "6", "8", "10", "12", "15", "20", "Falha"
- "rest": APENAS um destes valores: "30s", "45s", "60s", "75s", "90s", "2min"
- "obs": máximo 80 caracteres, dica prática de execução
- Use nomes de exercícios conhecidos em português brasileiro
- Inicie com exercícios compostos, termine com isolados
- Adapte séries/reps ao nível: Iniciante (3 séries, reps altas), Intermediário (4 séries), Avançado (5 séries, reps baixas)`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 2048,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      return res.status(500).json({ ok: false, error: `Claude API: ${response.status} — ${err}` });
    }

    const data = await response.json();
    const raw = data.content?.[0]?.text || '';

    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return res.status(500).json({ ok: false, error: 'Resposta da IA não contém JSON válido' });

    const parsed = JSON.parse(jsonMatch[0]);
    if (!Array.isArray(parsed.exercises)) return res.status(500).json({ ok: false, error: 'Estrutura inválida' });

    const exercises = parsed.exercises.slice(0, n).map(sanitize);
    return res.status(200).json({ ok: true, exercises });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message });
  }
}
