// Biblioteca automática de imagens de exercícios via wger.de (open source, sem chave)
// Faz cache em localStorage por 7 dias — sem limite de requests

const CACHE_PREFIX = 'wg_img_';
const CACHE_TTL = 7 * 24 * 60 * 60 * 1000;

// Mapa: nome PT → busca em inglês para wger
const EN = {
  'Supino Reto com Barra':           'barbell bench press',
  'Supino Inclinado com Barra':      'barbell incline bench press',
  'Supino Declinado com Barra':      'barbell decline bench press',
  'Supino Reto com Halteres':        'dumbbell bench press',
  'Supino Inclinado com Halteres':   'dumbbell incline bench press',
  'Crucifixo Reto':                  'dumbbell fly',
  'Crucifixo Inclinado':             'dumbbell incline fly',
  'Crossover na Polia':              'cable crossover',
  'Peck Deck':                       'pec deck fly',
  'Pullover com Haltere':            'dumbbell pullover',
  'Flexão de Braços':                'push up',
  'Levantamento Terra':              'barbell deadlift',
  'Barra Fixa':                      'pull up',
  'Puxada Frontal':                  'wide grip lat pulldown',
  'Puxada Fechada':                  'close grip pulldown',
  'Puxada por Trás':                 'behind neck pulldown',
  'Remada Curvada com Barra':        'barbell bent over row',
  'Remada Unilateral com Haltere':   'dumbbell one arm row',
  'Remada na Polia Baixa':           'seated cable row',
  'Remada Cavalinho':                'upright row',
  'Remada Serrote':                  'dumbbell serratus row',
  'Hiperextensão Lombar':            'back hyperextension',
  'Agachamento Livre':               'barbell full squat',
  'Agachamento no Smith':            'smith machine squat',
  'Agachamento Sumô':                'sumo squat',
  'Agachamento Búlgaro':             'bulgarian split squat',
  'Leg Press 45°':                   'leg press',
  'Extensão de Joelhos':             'leg extension',
  'Flexão de Joelhos':               'leg curl',
  'Stiff':                           'stiff leg deadlift',
  'Avanço com Halteres':             'dumbbell lunge',
  'Afundo':                          'lunge',
  'Hack Squat':                      'hack squat',
  'Panturrilha em Pé':               'standing calf raise',
  'Panturrilha Sentado':             'seated calf raise',
  'Abdução de Quadril na Máquina':   'hip abduction',
  'Adução de Quadril na Máquina':    'hip adduction',
  'Mesa Flexora':                    'lying leg curl',
  'Hip Thrust com Barra':            'hip thrust',
  'Elevação Pélvica':                'glute bridge',
  'Kickback no Cabo':                'cable kickback',
  'Glúteo 4 Apoios':                 'all fours hip extension',
  'Cadeira Abdutora':                'hip abduction machine',
  'Desenvolvimento com Halteres':    'dumbbell shoulder press',
  'Desenvolvimento com Barra':       'barbell shoulder press',
  'Desenvolvimento Arnold':          'arnold dumbbell press',
  'Elevação Lateral':                'dumbbell lateral raise',
  'Elevação Frontal':                'dumbbell front raise',
  'Elevação Lateral na Polia':       'cable lateral raise',
  'Remada Alta':                     'barbell upright row',
  'Face Pull':                       'face pull',
  'Encolhimento de Ombros':          'barbell shrug',
  'Rosca Direta com Barra':          'barbell curl',
  'Rosca Direta com EZ':             'ez bar curl',
  'Rosca Alternada com Haltere':     'dumbbell alternate bicep curl',
  'Rosca Concentrada':               'concentration curl',
  'Rosca Scott':                     'barbell preacher curl',
  'Rosca Martelo':                   'hammer curl',
  'Rosca 21':                        '21s bicep curl',
  'Rosca na Polia Baixa':            'cable curl',
  'Rosca Inclinada':                 'incline dumbbell curl',
  'Tríceps Testa com Barra EZ':      'barbell skull crusher',
  'Tríceps Corda na Polia':          'cable rope tricep extension',
  'Tríceps Francês':                 'dumbbell french press',
  'Mergulho no Banco':               'bench dip',
  'Extensão do Tríceps na Polia Alta':'cable tricep pushdown',
  'Kickback de Tríceps':             'tricep kickback',
  'Supino Fechado':                  'close grip bench press',
  'Mergulho nas Paralelas':          'dips parallel bars',
  'Prancha Frontal':                 'plank',
  'Prancha Lateral':                 'side plank',
  'Abdominal Crunch':                'crunch',
  'Abdominal Crunch na Polia':       'cable crunch',
  'Elevação de Pernas':              'hanging leg raise',
  'Abdominal Oblíquo':              'oblique crunch',
  'Russian Twist':                   'russian twist',
  'Abdominal com Roda':             'ab wheel rollout',
  'Bicicleta Abdominal':             'bicycle crunch',
  'Dead Bug':                        'dead bug',
  'Burpee':                          'burpee',
  'Mountain Climber':                'mountain climber',
  'Agachamento com Salto':           'jump squat',
  'Box Jump':                        'box jump',
  'Swing com Kettlebell':            'kettlebell swing',
  'Turkish Get Up':                  'turkish get up',
  'Battle Rope':                     'battle rope',
  'Thruster':                        'thruster',
  'Deadlift Romeno':                 'romanian deadlift',
};

function getCached(key) {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + key);
    if (!raw) return undefined;
    const { url, ts } = JSON.parse(raw);
    if (Date.now() - ts > CACHE_TTL) return undefined;
    return url; // null = "searched but not found"
  } catch { return undefined; }
}

function setCache(key, url) {
  try {
    localStorage.setItem(CACHE_PREFIX + key, JSON.stringify({ url, ts: Date.now() }));
  } catch {}
}

export async function fetchExerciseImage(ptName) {
  if (!ptName || ptName.length < 3) return null;

  const cached = getCached(ptName);
  if (cached !== undefined) return cached;

  const query = EN[ptName] || ptName;

  try {
    const res = await fetch(
      `https://wger.de/api/v2/exercisesearch/?term=${encodeURIComponent(query)}&language=2&format=json`,
      { signal: AbortSignal.timeout(5000) }
    );
    if (!res.ok) { setCache(ptName, null); return null; }

    const data = await res.json();
    const baseId = data.suggestions?.[0]?.data?.base_id;
    if (!baseId) { setCache(ptName, null); return null; }

    const imgRes = await fetch(
      `https://wger.de/api/v2/exerciseimage/?exercise_base=${baseId}&format=json`,
      { signal: AbortSignal.timeout(5000) }
    );
    if (!imgRes.ok) { setCache(ptName, null); return null; }

    const imgData = await imgRes.json();
    const url = imgData.results?.[0]?.image || null;
    setCache(ptName, url);
    return url;
  } catch {
    setCache(ptName, null);
    return null;
  }
}
