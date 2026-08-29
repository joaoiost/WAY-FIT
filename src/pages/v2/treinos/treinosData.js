import { EXERCISE_LIBRARY } from '../../../data/exerciseLibrary';

// Constantes e regras de negócio da tela de Treinos — mesma lógica da
// versão antiga (Treinos.jsx), só extraída pra um módulo próprio pra
// não duplicar em Treinos.jsx + TemplateEditor.jsx + AssignDialog.jsx.

export const DAYS = [
  { v: 1, s: 'Seg', full: 'Segunda-feira' },
  { v: 2, s: 'Ter', full: 'Terça-feira' },
  { v: 3, s: 'Qua', full: 'Quarta-feira' },
  { v: 4, s: 'Qui', full: 'Quinta-feira' },
  { v: 5, s: 'Sex', full: 'Sexta-feira' },
  { v: 6, s: 'Sáb', full: 'Sábado' },
  { v: 0, s: 'Dom', full: 'Domingo' },
];

export const PLAN_TYPES = ['Hipertrofia', 'Força', 'Resistência', 'Funcional', 'Cardio', 'Mobilidade', 'Emagrecimento'];
export const GROUPS = ['Peito', 'Costas', 'Pernas', 'Glúteos', 'Ombro', 'Braços', 'Abdômen', 'Full Body', 'Cardio'];

export const TYPE_CLR = {
  Hipertrofia: '#7C3AED', Força: '#DC2626', Resistência: '#2563EB',
  Funcional: '#059669', Cardio: '#D97706', Mobilidade: '#0891B2', Emagrecimento: '#EA580C',
};

export const TYPE_DEFAULTS = {
  Hipertrofia:   { sets: '4', reps: '10-12', rest: '60s' },
  Força:         { sets: '5', reps: '5',     rest: '90s' },
  Resistência:   { sets: '3', reps: '15-20', rest: '45s' },
  Funcional:     { sets: '3', reps: '12',    rest: '60s' },
  Cardio:        { sets: '1', reps: '20min', rest: '30s' },
  Mobilidade:    { sets: '2', reps: '30s',   rest: '30s' },
  Emagrecimento: { sets: '3', reps: '15',    rest: '45s' },
};

export const REPS_Q = ['6', '8', '10', '12', '15', '20', 'Falha'];
export const REST_Q = ['30s', '45s', '60s', '75s', '90s', '2min'];

export const DAY_PRESETS = [
  { label: '2x/sem', sub: 'Ter/Qui', days: [2, 4] },
  { label: '3x/sem', sub: 'Seg/Qua/Sex', days: [1, 3, 5] },
  { label: '4x/sem', sub: 'Seg/Ter/Qui/Sex', days: [1, 2, 4, 5] },
  { label: '5x/sem', sub: 'Seg a Sex', days: [1, 2, 3, 4, 5] },
  { label: '6x/sem', sub: 'Seg a Sáb', days: [1, 2, 3, 4, 5, 6] },
  { label: 'Todo dia', sub: '7 dias', days: [0, 1, 2, 3, 4, 5, 6] },
];

export const AI_LEVELS = {
  Iniciante: { sets: '3', reps: '12', rest: '60s', n: 5 },
  Intermediário: { sets: '4', reps: '10', rest: '75s', n: 6 },
  Avançado: { sets: '4', reps: '8', rest: '90s', n: 7 },
};

export const typeColor = (t) => TYPE_CLR[t] || '#6B7280';

export const newExercise = (i = 0, planType = 'Hipertrofia') => {
  const d = TYPE_DEFAULTS[planType] || TYPE_DEFAULTS.Hipertrofia;
  return { id: Date.now() + i, name: '', sets: d.sets, reps: d.reps, rest: d.rest, load: '', order_index: i };
};

export function generateWithAI(groups, level) {
  const p = AI_LEVELS[level] || AI_LEVELS.Intermediário;
  const perG = Math.ceil(p.n / Math.max(groups.length, 1));
  const out = [];
  groups.forEach(g => {
    [...EXERCISE_LIBRARY].filter(e => e.group === g)
      .sort((a, b) => a.name.length - b.name.length)
      .slice(0, perG)
      .forEach(e => out.push({ id: Date.now() + out.length, name: e.name, sets: p.sets, reps: p.reps, rest: p.rest, load: '', order_index: out.length }));
  });
  return out.slice(0, p.n);
}
