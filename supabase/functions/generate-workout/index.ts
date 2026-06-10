import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const VALID_REPS = ['6', '8', '10', '12', '15', '20', 'Falha'];
const VALID_REST = ['30s', '45s', '60s', '75s', '90s', '2min'];

function sanitizeExercise(ex: Record<string, unknown>) {
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

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { group, planType, level, equipment, restrictions, numExercises, studentName } = await req.json();

    const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!apiKey) throw new Error('ANTHROPIC_API_KEY não configurada no Supabase');

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
- Adapte séries/reps ao nível: Iniciante (3 séries, reps altas), Intermediário (4 séries), Avançado (5 séries, reps baixas ou falha)`;

    const resp = await fetch('https://api.anthropic.com/v1/messages', {
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

    if (!resp.ok) {
      const err = await resp.text();
      throw new Error(`Claude API: ${resp.status} — ${err}`);
    }

    const data = await resp.json();
    const raw = data.content?.[0]?.text || '';

    // Extract JSON from response (handle markdown code blocks)
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('Resposta da IA não contém JSON válido');

    const parsed = JSON.parse(jsonMatch[0]);
    if (!Array.isArray(parsed.exercises)) throw new Error('Estrutura de exercícios inválida');

    const exercises = parsed.exercises.slice(0, n).map(sanitizeExercise);

    return new Response(JSON.stringify({ ok: true, exercises }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ ok: false, error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
