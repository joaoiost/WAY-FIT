// Modelos de treino prontos — usados como ponto de partida na biblioteca de cartilhas.
// Nomes de exercício batem com src/data/exerciseLibrary.js para autocomplete/grupo automático funcionarem.

export const STARTER_TEMPLATES = [
  {
    name: 'Treino A — Peito e Tríceps',
    type: 'Hipertrofia',
    exercises: [
      { name: 'Supino Reto com Barra',        sets: '4', reps: '10-12', rest: '60s' },
      { name: 'Supino Inclinado com Halteres', sets: '3', reps: '10-12', rest: '60s' },
      { name: 'Crucifixo Reto',                sets: '3', reps: '12-15', rest: '45s' },
      { name: 'Crossover na Polia',            sets: '3', reps: '12-15', rest: '45s' },
      { name: 'Tríceps Testa com Barra EZ',    sets: '3', reps: '10-12', rest: '45s' },
      { name: 'Tríceps Corda na Polia',        sets: '3', reps: '12-15', rest: '45s' },
    ],
  },
  {
    name: 'Treino B — Costas e Bíceps',
    type: 'Hipertrofia',
    exercises: [
      { name: 'Puxada Frontal',               sets: '4', reps: '10-12', rest: '60s' },
      { name: 'Remada Curvada com Barra',     sets: '4', reps: '10-12', rest: '60s' },
      { name: 'Remada Unilateral com Haltere', sets: '3', reps: '10-12', rest: '60s' },
      { name: 'Puxada Fechada',               sets: '3', reps: '12',    rest: '45s' },
      { name: 'Rosca Direta com Barra',       sets: '3', reps: '10-12', rest: '45s' },
      { name: 'Rosca Martelo',                sets: '3', reps: '12',    rest: '45s' },
    ],
  },
  {
    name: 'Treino C — Pernas e Glúteos',
    type: 'Hipertrofia',
    exercises: [
      { name: 'Agachamento Livre',            sets: '4', reps: '10-12', rest: '90s' },
      { name: 'Leg Press 45°',                sets: '4', reps: '12-15', rest: '60s' },
      { name: 'Extensão de Joelhos',          sets: '3', reps: '12-15', rest: '45s' },
      { name: 'Flexão de Joelhos',            sets: '3', reps: '12-15', rest: '45s' },
      { name: 'Hip Thrust com Barra',         sets: '3', reps: '10-12', rest: '60s' },
      { name: 'Panturrilha em Pé',            sets: '4', reps: '15-20', rest: '30s' },
    ],
  },
  {
    name: 'Treino D — Ombro e Abdômen',
    type: 'Hipertrofia',
    exercises: [
      { name: 'Desenvolvimento com Halteres', sets: '4', reps: '10-12', rest: '60s' },
      { name: 'Elevação Lateral',             sets: '3', reps: '12-15', rest: '45s' },
      { name: 'Elevação Frontal',             sets: '3', reps: '12-15', rest: '45s' },
      { name: 'Face Pull',                    sets: '3', reps: '15',    rest: '45s' },
      { name: 'Prancha Frontal',              sets: '3', reps: '30s',   rest: '30s' },
      { name: 'Abdominal Crunch',             sets: '3', reps: '15-20', rest: '30s' },
    ],
  },
  {
    name: 'Full Body — Funcional',
    type: 'Funcional',
    exercises: [
      { name: 'Burpee',                       sets: '3', reps: '10',    rest: '45s' },
      { name: 'Agachamento com Salto',        sets: '3', reps: '12',    rest: '45s' },
      { name: 'Mountain Climber',             sets: '3', reps: '20',    rest: '30s' },
      { name: 'Swing com Kettlebell',         sets: '3', reps: '15',    rest: '45s' },
      { name: 'Prancha Frontal',              sets: '3', reps: '30s',   rest: '30s' },
    ],
  },
  {
    name: 'Cardio HIIT — Queima de Gordura',
    type: 'Cardio',
    exercises: [
      { name: 'HIIT na Esteira',              sets: '1', reps: '20min', rest: '30s' },
      { name: 'Corda de Pular',               sets: '3', reps: '1min',  rest: '30s' },
      { name: 'Sprints',                      sets: '5', reps: '30s',   rest: '60s' },
    ],
  },
  {
    name: 'Emagrecimento — Circuito Metabólico',
    type: 'Emagrecimento',
    exercises: [
      { name: 'Burpee',                       sets: '3', reps: '12',    rest: '30s' },
      { name: 'Agachamento com Salto',        sets: '3', reps: '15',    rest: '30s' },
      { name: 'Mountain Climber',             sets: '3', reps: '20',    rest: '30s' },
      { name: 'Corda de Pular',               sets: '3', reps: '1min',  rest: '30s' },
      { name: 'Prancha Frontal',              sets: '3', reps: '30s',   rest: '30s' },
    ],
  },
];
