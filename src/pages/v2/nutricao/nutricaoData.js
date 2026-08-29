// Constantes e regras de negócio da Nutrição — mesma lógica da versão
// antiga (NutricaoPlanoAluno.jsx), extraída pra reusar nas 3 telas novas
// (Plano, Ficha, Aderência) sem duplicar.

export const DEFAULT_MEALS = [
  { name: 'Café da manhã', time_of_day: '07:00', order_index: 0 },
  { name: 'Lanche da manhã', time_of_day: '10:00', order_index: 1 },
  { name: 'Almoço', time_of_day: '12:30', order_index: 2 },
  { name: 'Lanche da tarde', time_of_day: '15:30', order_index: 3 },
  { name: 'Jantar', time_of_day: '19:00', order_index: 4 },
];

export const MACRO_COLORS = { cal: '#DC2626', prot: '#4F46E5', carb: '#D97706', fat: '#059669' };

export const ACTIVITY_LEVELS = [
  { key: 'sedentario', label: 'Sedentário', sub: 'menos de 1x/semana', factor: 1.2 },
  { key: 'leve', label: 'Levemente ativo', sub: '1–3x/semana', factor: 1.375 },
  { key: 'moderado', label: 'Moderadamente ativo', sub: '3–5x/semana', factor: 1.55 },
  { key: 'muito_ativo', label: 'Muito ativo', sub: '6–7x/semana', factor: 1.725 },
  { key: 'atleta', label: 'Atleta', sub: 'treino 2x/dia', factor: 1.9 },
];

export const GOALS_TMB = [
  { key: 'emagrecimento', label: 'Emagrecer', kcalDelta: -400, protFactor: 2.0, fatFactor: 0.8 },
  { key: 'manutencao', label: 'Manutenção', kcalDelta: 0, protFactor: 1.8, fatFactor: 0.9 },
  { key: 'ganho', label: 'Ganhar massa', kcalDelta: 300, protFactor: 2.2, fatFactor: 1.0 },
  { key: 'definicao', label: 'Definição', kcalDelta: -200, protFactor: 2.5, fatFactor: 0.8 },
];

export const ANAMNESE_INIT = {
  weight: '', height: '', age: '', sex: 'feminino',
  activity_level: 'moderado',
  goal: '', allergies: '', restrictions: '', preferences: '',
  conditions: '', medications: '', workout_time: '',
  meal_count: 5, water_goal_ml: 2000, notes: '',
};

export function normalizeText(s) {
  return (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

// Checa se o nome do alimento bate com alguma palavra do texto livre de
// alergias/restrições — é um aviso, não um bloqueio.
export function matchesAllergyText(foodName, allergyText) {
  const name = normalizeText(foodName);
  if (!name) return null;
  const words = normalizeText(allergyText).split(/[,;\s]+e\s+|[,;()]+|\s+ou\s+/).map(w => w.trim()).filter(w => w.length >= 4);
  return words.find(w => name.includes(w)) || null;
}

export function calcMacros(foods) {
  return foods.reduce(
    (acc, f) => ({
      cal: acc.cal + (f.calories || 0),
      prot: acc.prot + (f.protein_g || 0),
      carb: acc.carb + (f.carbs_g || 0),
      fat: acc.fat + (f.fat_g || 0),
    }),
    { cal: 0, prot: 0, carb: 0, fat: 0 }
  );
}

export function calcTMB(weight, height, age, sex) {
  const w = parseFloat(weight);
  const h = parseInt(height, 10);
  const a = parseInt(age, 10);
  if (!w || !h || !a) return null;
  return sex === 'masculino' ? 10 * w + 6.25 * h - 5 * a + 5 : 10 * w + 6.25 * h - 5 * a - 161;
}

export function calcSuggestedMacros(tdee, weight, goalKey) {
  const g = GOALS_TMB.find(x => x.key === goalKey) || GOALS_TMB[0];
  const w = parseFloat(weight) || 0;
  const targetKcal = Math.round(tdee + g.kcalDelta);
  const protein = Math.round(g.protFactor * w);
  const fat = Math.round(g.fatFactor * w);
  const carbs = Math.max(0, Math.round((targetKcal - protein * 4 - fat * 9) / 4));
  return { calories: targetKcal, protein, fat, carbs };
}
