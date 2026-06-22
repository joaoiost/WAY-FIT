import { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Plus, Trash2, Search, X, Save, ChevronDown,
  Droplets, AlertCircle, Check, FileText, Target, Zap,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { supabase, hasSupabase } from '../../lib/supabase';
import tacoFoods from '../../data/taco_foods.json';

// ─── Constants ───────────────────────────────────────────────────────────────

const DEFAULT_MEALS = [
  { name: 'Café da manhã',   time_of_day: '07:00', order_index: 0 },
  { name: 'Lanche da manhã', time_of_day: '10:00', order_index: 1 },
  { name: 'Almoço',          time_of_day: '12:30', order_index: 2 },
  { name: 'Lanche da tarde', time_of_day: '15:30', order_index: 3 },
  { name: 'Jantar',          time_of_day: '19:00', order_index: 4 },
  { name: 'Ceia',            time_of_day: '21:30', order_index: 5 },
];

const MACRO_COLORS = { cal: '#EF4444', prot: '#6366F1', carb: '#F59E0B', fat: '#10B981' };

const ACTIVITY_LEVELS = [
  { key: 'sedentario',  label: 'Sedentário',                  sub: 'menos de 1x/semana', factor: 1.2   },
  { key: 'leve',        label: 'Levemente ativo',             sub: '1–3x/semana',        factor: 1.375 },
  { key: 'moderado',    label: 'Moderadamente ativo',         sub: '3–5x/semana',        factor: 1.55  },
  { key: 'muito_ativo', label: 'Muito ativo',                 sub: '6–7x/semana',        factor: 1.725 },
  { key: 'atleta',      label: 'Atleta / Extremamente ativo', sub: 'treino 2x/dia',      factor: 1.9   },
];

const GOALS_TMB = [
  { key: 'emagrecimento', label: 'Emagrecimento',  kcalDelta: -400, protFactor: 2.0, fatFactor: 0.8 },
  { key: 'manutencao',    label: 'Manutenção',      kcalDelta:    0, protFactor: 1.8, fatFactor: 0.9 },
  { key: 'ganho',         label: 'Ganho de massa',  kcalDelta: +300, protFactor: 2.2, fatFactor: 1.0 },
  { key: 'definicao',     label: 'Definição',       kcalDelta: -200, protFactor: 2.5, fatFactor: 0.8 },
];

const ANAMNESE_INIT = {
  weight: '', height: '', age: '', sex: 'feminino',
  activity_level: 'moderado',
  goal: '', allergies: '', restrictions: '', preferences: '',
  conditions: '', medications: '', workout_time: '',
  meal_count: 5, water_goal_ml: 2000, notes: '',
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function calcMacros(foods) {
  return foods.reduce(
    (acc, f) => ({
      cal:  acc.cal  + (f.calories  || 0),
      prot: acc.prot + (f.protein_g || 0),
      carb: acc.carb + (f.carbs_g   || 0),
      fat:  acc.fat  + (f.fat_g     || 0),
    }),
    { cal: 0, prot: 0, carb: 0, fat: 0 },
  );
}

function calcTMB(weight, height, age, sex) {
  const w = parseFloat(weight);
  const h = parseInt(height, 10);
  const a = parseInt(age, 10);
  if (!w || !h || !a) return null;
  return sex === 'masculino'
    ? 10 * w + 6.25 * h - 5 * a + 5
    : 10 * w + 6.25 * h - 5 * a - 161;
}

function calcSuggestedMacros(tdee, weight, goalKey) {
  const g = GOALS_TMB.find(x => x.key === goalKey) || GOALS_TMB[0];
  const w = parseFloat(weight) || 0;
  const targetKcal = Math.round(tdee + g.kcalDelta);
  const protein    = Math.round(g.protFactor * w);
  const fat        = Math.round(g.fatFactor  * w);
  const carbs      = Math.max(0, Math.round((targetKcal - protein * 4 - fat * 9) / 4));
  return { calories: targetKcal, protein, fat, carbs };
}

// ─── MacroBar (with optional goal) ───────────────────────────────────────────

function MacroBar({ label, value, goal, total, color }) {
  const pct = goal > 0
    ? Math.min(100, (value / goal) * 100)
    : total > 0
      ? Math.min(100, (value / total) * 100)
      : 0;

  const goalLabel = goal
    ? `${Math.round(value)}${label === 'kcal' ? '' : 'g'} / ${Math.round(goal)}${label === 'kcal' ? '' : 'g'}`
    : `${Math.round(value)}${label === 'kcal' ? '' : 'g'}`;

  return (
    <div style={{ flex: 1 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
        <span style={{ fontSize: 10, fontWeight: 700, color, textTransform: 'uppercase' }}>{label}</span>
        <span style={{ fontSize: 11, fontWeight: 800, color }}>{goalLabel}</span>
      </div>
      <div style={{ height: 5, borderRadius: 99, background: color + '20' }}>
        <div style={{ width: `${pct}%`, height: '100%', borderRadius: 99, background: color, transition: 'width 0.4s ease' }} />
      </div>
    </div>
  );
}

// ─── FoodSearch modal ─────────────────────────────────────────────────────────

function FoodSearch({ foods, onAdd, onClose }) {
  const [q, setQ]               = useState('');
  const [qty, setQty]           = useState(100);
  const [selected, setSelected] = useState(null);
  const inputRef                = useRef(null);

  useEffect(() => { setTimeout(() => inputRef.current?.focus(), 50); }, []);

  // Mescla banco do personal com TACO, deduplicando por nome
  const allFoodsMerged = useMemo(() => {
    const customNames = new Set(foods.map(f => f.name.toLowerCase()));
    const tacoNorm = tacoFoods
      .filter(f => !customNames.has(f.name.toLowerCase()))
      .map(f => ({
        id: `taco_${f.id}`,
        name: f.name,
        category: f.category || 'TACO',
        calories_per_100g: f.kcal      ?? 0,
        protein_per_100g:  f.protein_g ?? 0,
        carbs_per_100g:    f.carbs_g   ?? 0,
        fat_per_100g:      f.fat_g     ?? 0,
        fiber_per_100g:    0,
      }));
    return [...foods, ...tacoNorm];
  }, [foods]);

  const results = q.length < 2
    ? []
    : allFoodsMerged.filter(f => f.name.toLowerCase().includes(q.toLowerCase())).slice(0, 10);
  const preview = selected
    ? {
        cal:  ((selected.calories_per_100g || 0) * qty / 100).toFixed(1),
        prot: ((selected.protein_per_100g  || 0) * qty / 100).toFixed(1),
        carb: ((selected.carbs_per_100g    || 0) * qty / 100).toFixed(1),
        fat:  ((selected.fat_per_100g      || 0) * qty / 100).toFixed(1),
      }
    : null;

  const handleAdd = () => {
    if (!selected) return;
    const isTaco = String(selected.id).startsWith('taco_');
    onAdd({
      food_item_id: isTaco ? null : selected.id,
      name:         selected.name,
      quantity_g:   qty,
      calories:     Number(preview.cal),
      protein_g:    Number(preview.prot),
      carbs_g:      Number(preview.carb),
      fat_g:        Number(preview.fat),
      order_index:  0,
    });
    onClose();
  };

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 200, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', backdropFilter: 'blur(3px)' }}
      onClick={onClose}
    >
      <div
        style={{ background: 'var(--bg-surface)', borderRadius: '20px 20px 0 0', width: '100%', maxWidth: 520, padding: 20, maxHeight: '85vh', overflowY: 'auto' }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: 'var(--gray-900)' }}>Adicionar alimento</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray-400)', lineHeight: 0 }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--gray-50)', border: '1.5px solid var(--border)', borderRadius: 10, padding: '8px 12px', marginBottom: 12 }}>
          <Search size={15} color="var(--gray-400)" />
          <input
            ref={inputRef}
            value={q}
            onChange={e => { setQ(e.target.value); setSelected(null); }}
            placeholder="Buscar alimento (TACO + banco próprio)..."
            style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: 14, flex: 1, padding: 0, boxShadow: 'none', width: 'auto', color: 'var(--gray-900)', WebkitTextFillColor: 'var(--gray-900)' }}
          />
        </div>

        {q.length < 2 && (
          <p style={{ margin: '4px 0 8px', fontSize: 12, color: 'var(--gray-400)', textAlign: 'center' }}>
            Digite ao menos 2 letras para buscar entre {tacoFoods.length + foods.length} alimentos
          </p>
        )}

        {q.length >= 2 && results.length === 0 && (
          <button
            onClick={() => { onAdd({ food_item_id: null, name: q, quantity_g: qty, calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0, order_index: 0 }); onClose(); }}
            style={{ width: '100%', padding: '11px 14px', borderRadius: 10, border: '1.5px dashed var(--border)', background: 'var(--gray-50)', color: 'var(--gray-600)', fontSize: 13, fontWeight: 600, cursor: 'pointer', textAlign: 'left', marginBottom: 12 }}
          >
            + Adicionar "{q}" manualmente (sem macros)
          </button>
        )}

        {results.map(f => (
          <div
            key={f.id}
            onClick={() => setSelected(f)}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', borderRadius: 10, marginBottom: 4, background: selected?.id === f.id ? 'var(--accent-bg)' : 'var(--bg-page)', border: `1px solid ${selected?.id === f.id ? 'var(--accent)' : 'var(--border)'}`, cursor: 'pointer', transition: 'all 0.1s' }}
          >
            <div>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--gray-900)' }}>{f.name}</p>
              <p style={{ margin: 0, fontSize: 11, color: 'var(--gray-400)' }}>{f.calories_per_100g} kcal · {f.protein_per_100g}g prot · {f.carbs_per_100g}g carb / 100g</p>
            </div>
            {selected?.id === f.id && <Check size={16} color="var(--accent)" />}
          </div>
        ))}

        {selected && (
          <div style={{ marginTop: 14, padding: 14, background: 'var(--bg-page)', borderRadius: 12, border: '1px solid var(--border)' }}>
            <label style={{ marginBottom: 8 }}>Quantidade</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <input
                type="number"
                value={qty}
                min="1"
                step="1"
                onChange={e => setQty(Number(e.target.value) || 100)}
                style={{ width: 100, textAlign: 'center', fontWeight: 700, fontSize: 15 }}
              />
              <span style={{ fontSize: 13, color: 'var(--gray-500)', fontWeight: 600 }}>gramas</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
              {[
                { label: 'Kcal', value: preview.cal,  color: MACRO_COLORS.cal  },
                { label: 'Prot', value: preview.prot, color: MACRO_COLORS.prot },
                { label: 'Carb', value: preview.carb, color: MACRO_COLORS.carb },
                { label: 'Gord', value: preview.fat,  color: MACRO_COLORS.fat  },
              ].map(m => (
                <div key={m.label} style={{ textAlign: 'center', padding: '8px 4px', background: m.color + '12', borderRadius: 9 }}>
                  <p style={{ margin: 0, fontSize: 14, fontWeight: 900, color: m.color }}>{m.value}</p>
                  <p style={{ margin: 0, fontSize: 9, color: m.color, fontWeight: 700, textTransform: 'uppercase' }}>{m.label}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <button
          onClick={handleAdd}
          disabled={!selected}
          className="btn-primary"
          style={{ width: '100%', justifyContent: 'center', marginTop: 14, opacity: selected ? 1 : 0.5 }}
        >
          <Plus size={16} /> Adicionar ao plano
        </button>
      </div>
    </div>
  );
}

// ─── MealCard ─────────────────────────────────────────────────────────────────

function MealCard({ meal, foods, allFoods, onAddFood, onRemoveFood, onUpdateMeal, onDelete }) {
  const [open, setOpen]             = useState(true);
  const [showSearch, setShowSearch] = useState(false);
  const [showNotes, setShowNotes]   = useState(false);
  const macros = calcMacros(foods);

  return (
    <div style={{ background: 'var(--bg-surface)', borderRadius: 14, border: '1px solid var(--border)', overflow: 'hidden', boxShadow: 'var(--shadow-xs)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', borderBottom: open ? '1px solid var(--border)' : 'none', background: open ? 'var(--bg-surface)' : 'var(--bg-page)' }}>
        <div onClick={() => setOpen(o => !o)} style={{ flex: 1, minWidth: 0, cursor: 'pointer' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--gray-900)' }}>{meal.name}</p>
            <input
              type="time"
              value={meal.time_of_day || ''}
              onClick={e => e.stopPropagation()}
              onChange={e => onUpdateMeal({ ...meal, time_of_day: e.target.value })}
              style={{ fontSize: 11, color: 'var(--gray-400)', border: 'none', outline: 'none', background: 'transparent', padding: 0, width: 'auto', boxShadow: 'none', fontWeight: 600 }}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 2 }}>
            <span style={{ fontSize: 11, color: 'var(--gray-400)' }}>
              {foods.length} item{foods.length !== 1 ? 's' : ''} · <span style={{ color: MACRO_COLORS.cal, fontWeight: 700 }}>{Math.round(macros.cal)} kcal</span>
            </span>
            <span style={{ fontSize: 11, fontWeight: 700, color: MACRO_COLORS.prot }}>{Math.round(macros.prot)}g P</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: MACRO_COLORS.carb }}>{Math.round(macros.carb)}g C</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: MACRO_COLORS.fat }}>{Math.round(macros.fat)}g G</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
          <button
            onClick={e => { e.stopPropagation(); setShowNotes(n => !n); }}
            style={{ width: 32, height: 32, borderRadius: 8, background: meal.notes ? '#FFFBEB' : 'var(--gray-50)', border: `1px solid ${meal.notes ? '#FDE68A' : 'var(--border)'}`, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            title="Observações desta refeição"
          >
            <FileText size={13} color={meal.notes ? '#D97706' : 'var(--gray-400)'} />
          </button>
          {onDelete && (
            <button
              onClick={e => { e.stopPropagation(); onDelete(); }}
              style={{ width: 32, height: 32, borderRadius: 8, background: '#FEF2F2', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              title="Remover refeição"
            >
              <Trash2 size={13} color="var(--red)" />
            </button>
          )}
          <button
            onClick={() => setOpen(o => !o)}
            style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--gray-50)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <ChevronDown size={16} color="var(--gray-400)" style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.25s ease' }} />
          </button>
        </div>
      </div>

      {showNotes && (
        <div style={{ padding: '8px 16px', background: '#FFFBEB', borderBottom: '1px solid #FDE68A' }}>
          <label style={{ fontSize: 11, fontWeight: 700, color: '#92400E', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 4 }}>
            Observações da refeição
          </label>
          <textarea
            value={meal.notes || ''}
            onChange={e => onUpdateMeal({ ...meal, notes: e.target.value })}
            placeholder="Ex: Preparar com azeite de oliva, evitar sal..."
            rows={2}
            style={{ width: '100%', fontSize: 13, color: '#92400E', background: 'transparent', border: 'none', outline: 'none', resize: 'vertical', padding: 0, boxShadow: 'none', fontFamily: 'inherit', lineHeight: 1.5 }}
          />
        </div>
      )}

      {open && (
        <div style={{ padding: '8px 16px 12px' }}>
          {foods.length === 0 && (
            <p style={{ fontSize: 12, color: 'var(--gray-400)', fontStyle: 'italic', padding: '8px 0' }}>Nenhum alimento adicionado</p>
          )}
          {foods.map((food, i) => (
            <div
              key={food._tempId || food.id || i}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: i < foods.length - 1 ? '1px solid var(--border-light)' : 'none' }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--gray-900)' }}>{food.name}</p>
                <p style={{ margin: 0, fontSize: 11, color: 'var(--gray-500)' }}>
                  {food.quantity_g}g · <span style={{ color: MACRO_COLORS.cal }}>{Math.round(food.calories)} kcal</span> · {Math.round(food.protein_g)}g P · {Math.round(food.carbs_g)}g C · {Math.round(food.fat_g)}g G
                </p>
              </div>
              <button
                onClick={() => onRemoveFood(food._tempId || food.id)}
                style={{ width: 28, height: 28, borderRadius: 7, background: '#FEE2E2', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
              >
                <Trash2 size={12} color="var(--red)" />
              </button>
            </div>
          ))}
          <button
            onClick={() => setShowSearch(true)}
            style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 9, border: '1.5px dashed var(--border)', background: 'var(--gray-50)', color: 'var(--gray-500)', fontSize: 12, fontWeight: 600, cursor: 'pointer', width: '100%', justifyContent: 'center' }}
          >
            <Plus size={14} /> Adicionar alimento
          </button>
        </div>
      )}

      {showSearch && (
        <FoodSearch
          foods={allFoods}
          onAdd={food => onAddFood(meal._tempId || meal.id, food)}
          onClose={() => setShowSearch(false)}
        />
      )}
    </div>
  );
}

// ─── Section title ────────────────────────────────────────────────────────────

function SectionTitle({ children }) {
  return (
    <p style={{ margin: '0 0 12px', fontSize: 11, fontWeight: 800, color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
      {children}
    </p>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function NutricaoPlanoAluno() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [student,    setStudent]    = useState(null);
  const [allFoods,   setAllFoods]   = useState([]);
  const [plan,       setPlan]       = useState(null);
  const [meals,      setMeals]      = useState([]);
  const [mealFoods,  setMealFoods]  = useState({});
  const [anamnese,   setAnamnese]   = useState(ANAMNESE_INIT);
  const [macroGoals, setMacroGoals] = useState({ calories: '', protein: '', carbs: '', fat: '' });
  const [tab,        setTab]        = useState('plano');
  const [adherence,  setAdherence]  = useState([]);
  const [adhLoading, setAdhLoading] = useState(false);
  const [loading,    setLoading]    = useState(true);
  const [saving,     setSaving]     = useState(false);
  const [saved,      setSaved]      = useState(false);
  const [planName,   setPlanName]   = useState('Plano Alimentar');
  const [tmbGoalKey, setTmbGoalKey] = useState('emagrecimento');

  useEffect(() => {
    if (!user || !id) return;
    load();
  }, [user?.id, id]);

  const load = async () => {
    if (!hasSupabase) { setLoading(false); return; }
    const [{ data: s }, { data: fi }, { data: mp }] = await Promise.all([
      supabase.from('students').select('id, name, color, initials, goal').eq('id', id).maybeSingle(),
      supabase.from('food_items').select('*').eq('personal_id', user.id).order('name'),
      supabase.from('meal_plans').select('*').eq('student_id', id).eq('is_active', true).maybeSingle(),
    ]);
    setStudent(s);
    setAllFoods(fi || []);

    if (mp) {
      setPlan(mp);
      setPlanName(mp.name);
      setMacroGoals({
        calories: mp.goal_calories  != null ? String(mp.goal_calories)  : '',
        protein:  mp.goal_protein_g != null ? String(mp.goal_protein_g) : '',
        carbs:    mp.goal_carbs_g   != null ? String(mp.goal_carbs_g)   : '',
        fat:      mp.goal_fat_g     != null ? String(mp.goal_fat_g)     : '',
      });

      const { data: mm } = await supabase
        .from('meal_plan_meals')
        .select('*, meal_plan_foods(*)')
        .eq('meal_plan_id', mp.id)
        .order('order_index');

      const mealsData = mm || [];
      const tempMeals = mealsData.map(m => ({ ...m, _tempId: m.id }));
      setMeals(tempMeals);
      const foodsMap = {};
      tempMeals.forEach(m => {
        foodsMap[m._tempId] = (m.meal_plan_foods || []).map(f => ({ ...f, _tempId: f.id }));
      });
      setMealFoods(foodsMap);
    } else {
      const tempMeals = DEFAULT_MEALS.map((m, i) => ({ ...m, _tempId: `new_${i}` }));
      setMeals(tempMeals);
      setMealFoods(Object.fromEntries(tempMeals.map(m => [m._tempId, []])));
    }

    const { data: ana } = await supabase.from('nutrition_anamnesis').select('*').eq('student_id', id).maybeSingle();
    if (ana) setAnamnese({ ...ANAMNESE_INIT, ...ana });

    setLoading(false);
  };

  // ── Meal management ──────────────────────────────────────────────────────

  const addFood = (mealTempId, food) => {
    const tempFood = { ...food, _tempId: `food_${Date.now()}_${Math.random()}` };
    setMealFoods(prev => ({ ...prev, [mealTempId]: [...(prev[mealTempId] || []), tempFood] }));
  };

  const removeFood = (mealTempId, foodTempId) => {
    setMealFoods(prev => ({
      ...prev,
      [mealTempId]: (prev[mealTempId] || []).filter(f => (f._tempId || f.id) !== foodTempId),
    }));
  };

  const updateMeal = updatedMeal => {
    setMeals(prev => prev.map(m => m._tempId === updatedMeal._tempId ? updatedMeal : m));
  };

  const addMeal = () => {
    const tempId = `new_${Date.now()}`;
    const newMeal = { name: 'Nova refeição', time_of_day: '', order_index: meals.length, _tempId: tempId };
    setMeals(prev => [...prev, newMeal]);
    setMealFoods(prev => ({ ...prev, [tempId]: [] }));
  };

  const removeMeal = tempId => {
    setMeals(prev => prev.filter(m => m._tempId !== tempId));
    setMealFoods(prev => { const n = { ...prev }; delete n[tempId]; return n; });
  };

  // ── Save ─────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    if (!hasSupabase) return;
    setSaving(true);
    try {
      let planId = plan?.id;

      const planPayload = {
        name:           planName,
        updated_at:     new Date().toISOString(),
        goal_calories:  macroGoals.calories ? Number(macroGoals.calories) : null,
        goal_protein_g: macroGoals.protein  ? Number(macroGoals.protein)  : null,
        goal_carbs_g:   macroGoals.carbs    ? Number(macroGoals.carbs)    : null,
        goal_fat_g:     macroGoals.fat      ? Number(macroGoals.fat)      : null,
      };

      if (planId) {
        await supabase.from('meal_plans').update(planPayload).eq('id', planId);
        await supabase.from('meal_plan_meals').delete().eq('meal_plan_id', planId);
      } else {
        const { data: newPlan } = await supabase.from('meal_plans').insert({
          student_id: id, personal_id: user.id, is_active: true, ...planPayload,
        }).select().single();
        planId = newPlan.id;
        setPlan(newPlan);
      }

      for (const meal of meals) {
        const { data: newMeal } = await supabase.from('meal_plan_meals').insert({
          meal_plan_id: planId,
          name:         meal.name,
          time_of_day:  meal.time_of_day || '',
          order_index:  meal.order_index,
          notes:        meal.notes || null,
        }).select().single();

        const foods = mealFoods[meal._tempId] || [];
        if (foods.length > 0) {
          await supabase.from('meal_plan_foods').insert(
            foods.map((f, i) => ({
              meal_id:      newMeal.id,
              food_item_id: f.food_item_id || null,
              name:         f.name,
              quantity_g:   f.quantity_g,
              calories:     f.calories,
              protein_g:    f.protein_g,
              carbs_g:      f.carbs_g,
              fat_g:        f.fat_g,
              order_index:  i,
            })),
          );
        }
      }

      await supabase.from('nutrition_anamnesis').upsert({
        student_id:     id,
        personal_id:    user.id,
        goal:           anamnese.goal          || null,
        allergies:      anamnese.allergies     || null,
        restrictions:   anamnese.restrictions  || null,
        preferences:    anamnese.preferences   || null,
        water_goal_ml:  Number(anamnese.water_goal_ml) || 2000,
        notes:          anamnese.notes         || null,
        weight:         anamnese.weight        ? Number(anamnese.weight)  : null,
        height:         anamnese.height        ? Number(anamnese.height)  : null,
        age:            anamnese.age           ? Number(anamnese.age)     : null,
        sex:            anamnese.sex           || 'feminino',
        activity_level: anamnese.activity_level || 'moderado',
        conditions:     anamnese.conditions    || null,
        medications:    anamnese.medications   || null,
        workout_time:   anamnese.workout_time  || null,
        meal_count:     anamnese.meal_count    ? Number(anamnese.meal_count) : 5,
        updated_at:     new Date().toISOString(),
      }, { onConflict: 'student_id' });

      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      console.error('Save error:', err);
    }
    setSaving(false);
  };

  const loadAdherence = async () => {
    if (!hasSupabase || !id) return;
    setAdhLoading(true);
    const today = new Date().toISOString().slice(0, 10);
    const start = new Date(Date.now() - 13 * 86400000).toISOString().slice(0, 10);
    const { data: logs } = await supabase
      .from('food_logs').select('date,kcal,protein_g,carbs_g,fat_g')
      .eq('student_id', id).gte('date', start).lte('date', today);

    const byDate = {};
    (logs || []).forEach(l => {
      if (!byDate[l.date]) byDate[l.date] = { kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0 };
      byDate[l.date].kcal      += l.kcal      || 0;
      byDate[l.date].protein_g += l.protein_g || 0;
      byDate[l.date].carbs_g   += l.carbs_g   || 0;
      byDate[l.date].fat_g     += l.fat_g     || 0;
    });

    const days = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
      const wd = new Date(d + 'T12:00:00');
      days.push({
        date: d,
        label: wd.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit' }),
        ...(byDate[d] || { kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0 }),
        logged: !!byDate[d],
      });
    }
    setAdherence(days);
    setAdhLoading(false);
  };

  // ── Derived ──────────────────────────────────────────────────────────────

  const allFoodsList   = Object.values(mealFoods).flat();
  const totals         = calcMacros(allFoodsList);
  const tmb            = calcTMB(anamnese.weight, anamnese.height, anamnese.age, anamnese.sex);
  const activityFactor = ACTIVITY_LEVELS.find(a => a.key === anamnese.activity_level)?.factor || 1.55;
  const tdee           = tmb ? Math.round(tmb * activityFactor) : null;
  const suggestedMacros = tdee ? calcSuggestedMacros(tdee, anamnese.weight, tmbGoalKey) : null;

  if (loading) return <div className="loading-screen"><div className="spinner" /></div>;

  return (
    <div className="page-padding">

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <button
          onClick={() => navigate('/dashboard/nutricao')}
          style={{ width: 36, height: 36, borderRadius: 9, border: '1.5px solid var(--border)', background: 'var(--bg-surface)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
        >
          <ArrowLeft size={17} color="var(--gray-600)" />
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 900, color: 'var(--gray-900)', letterSpacing: '-0.3px' }}>
            Nutrição — {student?.name || '...'}
          </h2>
          <p style={{ margin: 0, fontSize: 12, color: 'var(--gray-400)' }}>Plano alimentar personalizado</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="btn-primary"
          style={{ gap: 6, opacity: saving ? 0.7 : 1, flexShrink: 0 }}
        >
          {saved ? <><Check size={15} /> Salvo!</> : saving ? 'Salvando...' : <><Save size={15} /> Salvar</>}
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: 'var(--gray-100)', borderRadius: 10, padding: 4 }}>
        {[{ key: 'plano', label: 'Plano' }, { key: 'anamnese', label: 'Anamnese' }, { key: 'aderencia', label: 'Aderência' }].map(t => (
          <button
            key={t.key}
            onClick={() => { setTab(t.key); if (t.key === 'aderencia' && !adherence.length) loadAdherence(); }}
            style={{ flex: 1, padding: '8px 0', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: tab === t.key ? 700 : 500, background: tab === t.key ? 'var(--bg-surface)' : 'transparent', color: tab === t.key ? 'var(--accent-text)' : 'var(--gray-500)', boxShadow: tab === t.key ? 'var(--shadow-xs)' : 'none', transition: 'all 0.15s' }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── PLANO TAB ─────────────────────────────────────────────────────── */}
      {tab === 'plano' && (
        <>
          {/* Allergy warning banner */}
          {anamnese.allergies && (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 16px', background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 12, marginBottom: 14 }}>
              <AlertCircle size={16} color="#D97706" style={{ flexShrink: 0, marginTop: 1 }} />
              <div>
                <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: '#92400E', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Alergias / Restrições</p>
                <p style={{ margin: '2px 0 0', fontSize: 13, color: '#92400E' }}>{anamnese.allergies}</p>
              </div>
            </div>
          )}

          {/* Totals bar */}
          <div style={{ background: 'var(--bg-surface)', borderRadius: 14, padding: '16px 20px', border: '1px solid var(--border)', marginBottom: 14, boxShadow: 'var(--shadow-xs)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div>
                <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total diário</p>
                <p style={{ margin: 0, fontSize: 26, fontWeight: 900, color: MACRO_COLORS.cal, lineHeight: 1 }}>
                  {Math.round(totals.cal)}
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--gray-400)', marginLeft: 4 }}>kcal</span>
                  {macroGoals.calories && (
                    <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--gray-400)', marginLeft: 6 }}>/ {macroGoals.calories}</span>
                  )}
                </p>
              </div>
              <input
                value={planName}
                onChange={e => setPlanName(e.target.value)}
                style={{ fontSize: 13, fontWeight: 600, color: 'var(--gray-600)', border: '1px solid var(--border)', borderRadius: 8, padding: '5px 10px', background: 'var(--gray-50)', width: 'auto', maxWidth: 180 }}
              />
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <MacroBar label="prot" value={totals.prot} goal={macroGoals.protein ? Number(macroGoals.protein) : 0} total={totals.prot + totals.carb + totals.fat} color={MACRO_COLORS.prot} />
              <MacroBar label="carb" value={totals.carb} goal={macroGoals.carbs   ? Number(macroGoals.carbs)   : 0} total={totals.prot + totals.carb + totals.fat} color={MACRO_COLORS.carb} />
              <MacroBar label="gord" value={totals.fat}  goal={macroGoals.fat     ? Number(macroGoals.fat)     : 0} total={totals.prot + totals.carb + totals.fat} color={MACRO_COLORS.fat}  />
            </div>
          </div>

          {/* Meta do Plano card */}
          <div style={{ background: 'var(--bg-surface)', borderRadius: 14, padding: '16px 20px', border: '1px solid var(--border)', marginBottom: 16, boxShadow: 'var(--shadow-xs)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <Target size={16} color="var(--accent)" />
              <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: 'var(--gray-900)' }}>Meta do Plano</p>
              <span style={{ fontSize: 11, color: 'var(--gray-400)', marginLeft: 'auto' }}>Defina as metas diárias</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
              {[
                { key: 'calories', label: 'Calorias',  unit: 'kcal', color: MACRO_COLORS.cal  },
                { key: 'protein',  label: 'Proteína',  unit: 'g',    color: MACRO_COLORS.prot },
                { key: 'carbs',    label: 'Carboidr.', unit: 'g',    color: MACRO_COLORS.carb },
                { key: 'fat',      label: 'Gordura',   unit: 'g',    color: MACRO_COLORS.fat  },
              ].map(m => (
                <div key={m.key} style={{ textAlign: 'center' }}>
                  <label style={{ fontSize: 10, fontWeight: 700, color: m.color, textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: 4 }}>{m.label}</label>
                  <input
                    type="number"
                    min="0"
                    value={macroGoals[m.key]}
                    onChange={e => setMacroGoals(prev => ({ ...prev, [m.key]: e.target.value }))}
                    placeholder="—"
                    style={{ width: '100%', textAlign: 'center', fontWeight: 800, fontSize: 15, color: m.color, border: `1.5px solid ${m.color}40`, borderRadius: 8, background: m.color + '08', padding: '6px 4px', boxShadow: 'none' }}
                  />
                  <span style={{ fontSize: 10, color: 'var(--gray-400)', fontWeight: 600 }}>{m.unit}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Meals */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {meals.map(meal => (
              <MealCard
                key={meal._tempId}
                meal={meal}
                foods={mealFoods[meal._tempId] || []}
                allFoods={allFoods}
                onAddFood={addFood}
                onRemoveFood={foodId => removeFood(meal._tempId, foodId)}
                onUpdateMeal={updateMeal}
                onDelete={() => removeMeal(meal._tempId)}
              />
            ))}
            <button
              onClick={addMeal}
              style={{ padding: '12px', borderRadius: 12, border: '2px dashed var(--border)', background: 'transparent', color: 'var(--gray-400)', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}
            >
              <Plus size={16} /> Adicionar refeição
            </button>
          </div>
        </>
      )}

      {/* ── ADERÊNCIA TAB ─────────────────────────────────────────────────── */}
      {tab === 'aderencia' && (
        <div>
          {adhLoading ? (
            <div className="loading-screen"><div className="spinner" /></div>
          ) : (
            <>
              {/* Summary */}
              {adherence.length > 0 && (() => {
                const loggedDays = adherence.filter(d => d.logged).length;
                const total = adherence.length;
                const pct = Math.round((loggedDays / total) * 100);
                const avgKcal = loggedDays > 0 ? Math.round(adherence.filter(d => d.logged).reduce((s, d) => s + d.kcal, 0) / loggedDays) : 0;
                return (
                  <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
                    {[
                      { label: 'Aderência', value: `${pct}%`, sub: `${loggedDays}/${total} dias` },
                      { label: 'Média kcal', value: avgKcal, sub: macroGoals.calories ? `meta: ${macroGoals.calories}` : 'sem meta' },
                      { label: 'Dias sem log', value: total - loggedDays, sub: 'últimos 14 dias' },
                    ].map(s => (
                      <div key={s.label} className="kpi-card" style={{ flex: 1, cursor: 'default', padding: '12px 10px', textAlign: 'center' }}>
                        <p className="kpi-card-value" style={{ fontSize: 20 }}>{s.value}</p>
                        <p className="kpi-card-label">{s.label}</p>
                        <p style={{ margin: 0, fontSize: 10, color: 'var(--gray-400)' }}>{s.sub}</p>
                      </div>
                    ))}
                  </div>
                );
              })()}

              {/* Calorie bar chart — últimos 14 dias */}
              {macroGoals.calories && (
                <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 14, padding: 16, marginBottom: 16 }}>
                  <p style={{ margin: '0 0 14px', fontSize: 12, fontWeight: 700, color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Calorias vs Meta ({macroGoals.calories} kcal)
                  </p>
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 80 }}>
                    {adherence.map(d => {
                      const pct = macroGoals.calories ? Math.min(100, Math.round((d.kcal / Number(macroGoals.calories)) * 100)) : 0;
                      const over = d.kcal > Number(macroGoals.calories);
                      const isToday = d.date === new Date().toISOString().slice(0, 10);
                      return (
                        <div key={d.date} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, height: '100%', justifyContent: 'flex-end' }} title={`${d.label}: ${Math.round(d.kcal)} kcal`}>
                          <div style={{ width: '100%', height: `${Math.max(2, pct)}%`, background: !d.logged ? 'var(--border)' : over ? 'var(--red)' : 'var(--accent)', borderRadius: '3px 3px 0 0', opacity: isToday ? 1 : 0.7 }} />
                        </div>
                      );
                    })}
                  </div>
                  <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
                    {adherence.map(d => {
                      const isToday = d.date === new Date().toISOString().slice(0, 10);
                      return (
                        <div key={d.date} style={{ flex: 1, textAlign: 'center', fontSize: 8, color: isToday ? 'var(--accent)' : 'var(--gray-400)', fontWeight: isToday ? 800 : 500, overflow: 'hidden' }}>
                          {d.label.split(',')[0]}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Day-by-day list */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[...adherence].reverse().map(d => {
                  const isToday = d.date === new Date().toISOString().slice(0, 10);
                  const kcalGoal = macroGoals.calories ? Number(macroGoals.calories) : null;
                  const pct = kcalGoal && d.logged ? Math.min(100, Math.round((d.kcal / kcalGoal) * 100)) : null;
                  const over = kcalGoal && d.kcal > kcalGoal;
                  return (
                    <div key={d.date} style={{ background: 'var(--bg-surface)', border: `1px solid ${isToday ? 'var(--accent)' : 'var(--border)'}`, borderRadius: 12, padding: '12px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: d.logged ? 8 : 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 12, fontWeight: 700, color: isToday ? 'var(--accent)' : 'var(--gray-600)', textTransform: 'capitalize' }}>
                            {d.label}
                          </span>
                          {isToday && <span style={{ fontSize: 10, background: 'var(--accent)', color: 'white', borderRadius: 20, padding: '1px 6px', fontWeight: 700 }}>hoje</span>}
                        </div>
                        {d.logged ? (
                          <span style={{ fontSize: 13, fontWeight: 800, color: over ? 'var(--red)' : 'var(--gray-900)' }}>
                            {Math.round(d.kcal)} kcal
                            {kcalGoal && <span style={{ fontSize: 11, color: 'var(--gray-400)', fontWeight: 500 }}> / {kcalGoal}</span>}
                          </span>
                        ) : (
                          <span style={{ fontSize: 12, color: 'var(--gray-400)', fontStyle: 'italic' }}>sem registro</span>
                        )}
                      </div>
                      {d.logged && (
                        <>
                          {pct !== null && (
                            <div style={{ height: 4, borderRadius: 99, background: 'var(--border)', overflow: 'hidden', marginBottom: 6 }}>
                              <div style={{ height: '100%', width: `${pct}%`, background: over ? 'var(--red)' : 'var(--accent)', borderRadius: 99 }} />
                            </div>
                          )}
                          <div style={{ display: 'flex', gap: 10 }}>
                            {[
                              { label: 'P', value: Math.round(d.protein_g), color: '#6366F1' },
                              { label: 'C', value: Math.round(d.carbs_g),   color: '#F59E0B' },
                              { label: 'G', value: Math.round(d.fat_g),     color: '#10B981' },
                            ].map(m => (
                              <span key={m.label} style={{ fontSize: 11, color: m.color, fontWeight: 700 }}>
                                {m.label}: {m.value}g
                              </span>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}

      {/* ── ANAMNESE TAB ──────────────────────────────────────────────────── */}
      {tab === 'anamnese' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Dados Físicos */}
          <div style={{ background: 'var(--bg-surface)', borderRadius: 14, border: '1px solid var(--border)', padding: 20 }}>
            <SectionTitle>Dados Físicos</SectionTitle>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14 }}>
              <div>
                <label>Peso atual (kg)</label>
                <input type="number" min="0" step="0.1" value={anamnese.weight} onChange={e => setAnamnese(a => ({ ...a, weight: e.target.value }))} placeholder="Ex: 72.5" />
              </div>
              <div>
                <label>Altura (cm)</label>
                <input type="number" min="0" step="1" value={anamnese.height} onChange={e => setAnamnese(a => ({ ...a, height: e.target.value }))} placeholder="Ex: 168" />
              </div>
              <div>
                <label>Idade</label>
                <input type="number" min="0" step="1" value={anamnese.age} onChange={e => setAnamnese(a => ({ ...a, age: e.target.value }))} placeholder="Ex: 28" />
              </div>
              <div>
                <label>Sexo</label>
                <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                  {['feminino', 'masculino'].map(s => (
                    <button
                      key={s}
                      onClick={() => setAnamnese(a => ({ ...a, sex: s }))}
                      style={{ flex: 1, padding: '7px 10px', borderRadius: 9, border: `1.5px solid ${anamnese.sex === s ? 'var(--accent)' : 'var(--border)'}`, background: anamnese.sex === s ? 'var(--accent-bg)' : 'white', color: anamnese.sex === s ? 'var(--accent-text)' : 'var(--gray-600)', fontSize: 13, fontWeight: anamnese.sex === s ? 700 : 500, cursor: 'pointer', transition: 'all 0.15s', textTransform: 'capitalize' }}
                    >
                      {s.charAt(0).toUpperCase() + s.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Nível de Atividade */}
          <div style={{ background: 'var(--bg-surface)', borderRadius: 14, border: '1px solid var(--border)', padding: 20 }}>
            <SectionTitle>Nível de Atividade</SectionTitle>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {ACTIVITY_LEVELS.map(a => (
                <button
                  key={a.key}
                  onClick={() => setAnamnese(prev => ({ ...prev, activity_level: a.key }))}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 14px', borderRadius: 11, border: `1.5px solid ${anamnese.activity_level === a.key ? 'var(--accent)' : 'var(--border)'}`, background: anamnese.activity_level === a.key ? 'var(--accent-bg)' : 'white', cursor: 'pointer', transition: 'all 0.15s', textAlign: 'left' }}
                >
                  <div>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: anamnese.activity_level === a.key ? 'var(--accent-text)' : 'var(--gray-900)' }}>{a.label}</p>
                    <p style={{ margin: 0, fontSize: 11, color: 'var(--gray-400)' }}>{a.sub}</p>
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 800, color: anamnese.activity_level === a.key ? 'var(--accent-text)' : 'var(--gray-400)', background: anamnese.activity_level === a.key ? 'rgba(0,0,0,0.06)' : 'var(--gray-100)', padding: '3px 8px', borderRadius: 6 }}>
                    x{a.factor}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Calculadora TMB */}
          <div style={{ background: 'var(--bg-surface)', borderRadius: 14, border: '1px solid var(--border)', padding: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 14 }}>
              <Zap size={15} color="#F59E0B" />
              <SectionTitle>Calculadora TMB (Mifflin-St Jeor)</SectionTitle>
            </div>

            {tmb ? (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
                  <div style={{ padding: '12px 16px', borderRadius: 11, background: 'var(--gray-50)', border: '1px solid var(--border)', textAlign: 'center' }}>
                    <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>TMB (basal)</p>
                    <p style={{ margin: '4px 0 0', fontSize: 24, fontWeight: 900, color: 'var(--gray-900)', lineHeight: 1 }}>{Math.round(tmb)}</p>
                    <p style={{ margin: 0, fontSize: 11, color: 'var(--gray-400)' }}>kcal/dia</p>
                  </div>
                  <div style={{ padding: '12px 16px', borderRadius: 11, background: 'var(--accent-bg)', border: '1.5px solid var(--accent)', textAlign: 'center' }}>
                    <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: 'var(--accent-text)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>TDEE (c/ atividade)</p>
                    <p style={{ margin: '4px 0 0', fontSize: 24, fontWeight: 900, color: 'var(--accent-text)', lineHeight: 1 }}>{tdee}</p>
                    <p style={{ margin: 0, fontSize: 11, color: 'var(--accent-text)', opacity: 0.7 }}>kcal/dia</p>
                  </div>
                </div>

                <p style={{ margin: '0 0 8px', fontSize: 12, fontWeight: 700, color: 'var(--gray-600)' }}>Objetivo para o cálculo:</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginBottom: 14 }}>
                  {GOALS_TMB.map(g => (
                    <button
                      key={g.key}
                      onClick={() => setTmbGoalKey(g.key)}
                      style={{ padding: '7px 13px', borderRadius: 20, border: `1.5px solid ${tmbGoalKey === g.key ? 'var(--accent)' : 'var(--border)'}`, background: tmbGoalKey === g.key ? 'var(--accent-bg)' : 'white', color: tmbGoalKey === g.key ? 'var(--accent-text)' : 'var(--gray-600)', fontSize: 12, fontWeight: tmbGoalKey === g.key ? 700 : 500, cursor: 'pointer', transition: 'all 0.15s' }}
                    >
                      {g.label}
                    </button>
                  ))}
                </div>

                {suggestedMacros && (
                  <div style={{ padding: 14, background: 'var(--gray-50)', borderRadius: 11, border: '1px solid var(--border)', marginBottom: 12 }}>
                    <p style={{ margin: '0 0 10px', fontSize: 11, fontWeight: 700, color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Macros sugeridos</p>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                      {[
                        { label: 'Kcal', value: suggestedMacros.calories, color: MACRO_COLORS.cal  },
                        { label: 'Prot', value: suggestedMacros.protein,  color: MACRO_COLORS.prot },
                        { label: 'Carb', value: suggestedMacros.carbs,    color: MACRO_COLORS.carb },
                        { label: 'Gord', value: suggestedMacros.fat,      color: MACRO_COLORS.fat  },
                      ].map(m => (
                        <div key={m.label} style={{ textAlign: 'center', padding: '8px 4px', background: m.color + '12', borderRadius: 9 }}>
                          <p style={{ margin: 0, fontSize: 15, fontWeight: 900, color: m.color }}>{m.value}</p>
                          <p style={{ margin: 0, fontSize: 9, color: m.color, fontWeight: 700, textTransform: 'uppercase' }}>{m.label}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <button
                  onClick={() => {
                    if (!suggestedMacros) return;
                    setMacroGoals({
                      calories: String(suggestedMacros.calories),
                      protein:  String(suggestedMacros.protein),
                      carbs:    String(suggestedMacros.carbs),
                      fat:      String(suggestedMacros.fat),
                    });
                    setTab('plano');
                  }}
                  className="btn-primary"
                  style={{ width: '100%', justifyContent: 'center', gap: 7 }}
                >
                  <Target size={15} /> Aplicar ao plano
                </button>
              </>
            ) : (
              <p style={{ margin: 0, fontSize: 13, color: 'var(--gray-400)', fontStyle: 'italic', textAlign: 'center', padding: '16px 0' }}>
                Preencha peso, altura, idade e sexo na secao "Dados Fisicos" para calcular.
              </p>
            )}
          </div>

          {/* Alimentação */}
          <div style={{ background: 'var(--bg-surface)', borderRadius: 14, border: '1px solid var(--border)', padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <SectionTitle>Alimentação</SectionTitle>
            <div>
              <label>Objetivo nutricional</label>
              <input value={anamnese.goal} onChange={e => setAnamnese(a => ({ ...a, goal: e.target.value }))} placeholder="Ex: Emagrecimento, ganho de massa, manutencao..." />
            </div>
            <div>
              <label>Alergias alimentares</label>
              <textarea value={anamnese.allergies} onChange={e => setAnamnese(a => ({ ...a, allergies: e.target.value }))} placeholder="Ex: Intolerancia a lactose, alergia a amendoim..." rows={2} style={{ resize: 'vertical' }} />
            </div>
            <div>
              <label>Restrições alimentares</label>
              <textarea value={anamnese.restrictions} onChange={e => setAnamnese(a => ({ ...a, restrictions: e.target.value }))} placeholder="Ex: Vegetariano, sem gluten, sem carne vermelha..." rows={2} style={{ resize: 'vertical' }} />
            </div>
            <div>
              <label>Preferências / Alimentos que gosta</label>
              <textarea value={anamnese.preferences} onChange={e => setAnamnese(a => ({ ...a, preferences: e.target.value }))} placeholder="Ex: Prefere frango, gosta de ovos, come peixe..." rows={2} style={{ resize: 'vertical' }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div>
                <label>Horário de treino</label>
                <input value={anamnese.workout_time} onChange={e => setAnamnese(a => ({ ...a, workout_time: e.target.value }))} placeholder="Ex: Manha, 6h30" />
              </div>
              <div>
                <label>Nº de refeições/dia</label>
                <input type="number" min="2" max="10" value={anamnese.meal_count} onChange={e => setAnamnese(a => ({ ...a, meal_count: Number(e.target.value) }))} />
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Droplets size={16} color="#3B82F6" />
              <label style={{ margin: 0, flex: 1 }}>Meta de água diária</label>
              <input type="number" min="500" step="100" value={anamnese.water_goal_ml} onChange={e => setAnamnese(a => ({ ...a, water_goal_ml: Number(e.target.value) }))} style={{ width: 100 }} />
              <span style={{ fontSize: 13, color: 'var(--gray-400)', fontWeight: 600 }}>ml</span>
            </div>
          </div>

          {/* Saúde */}
          <div style={{ background: 'var(--bg-surface)', borderRadius: 14, border: '1px solid var(--border)', padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <SectionTitle>Saúde</SectionTitle>
            <div>
              <label>Doenças / condições</label>
              <textarea value={anamnese.conditions} onChange={e => setAnamnese(a => ({ ...a, conditions: e.target.value }))} placeholder="Ex: Diabetes tipo 2, hipertensao, hipotireoidismo..." rows={2} style={{ resize: 'vertical' }} />
            </div>
            <div>
              <label>Medicamentos relevantes</label>
              <textarea value={anamnese.medications} onChange={e => setAnamnese(a => ({ ...a, medications: e.target.value }))} placeholder="Ex: Metformina 850mg, Losartana..." rows={2} style={{ resize: 'vertical' }} />
            </div>
          </div>

          {/* Observações gerais */}
          <div style={{ background: 'var(--bg-surface)', borderRadius: 14, border: '1px solid var(--border)', padding: 20 }}>
            <SectionTitle>Observações gerais</SectionTitle>
            <textarea
              value={anamnese.notes}
              onChange={e => setAnamnese(a => ({ ...a, notes: e.target.value }))}
              placeholder="Outras informações relevantes sobre o aluno..."
              rows={4}
              style={{ resize: 'vertical', width: '100%' }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
