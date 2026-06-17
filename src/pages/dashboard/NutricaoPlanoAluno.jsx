import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, Search, X, Save, ChevronDown, ChevronUp, Salad, Droplets, AlertCircle, Check } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { supabase, hasSupabase } from '../../lib/supabase';

const DEFAULT_MEALS = [
  { name: 'Café da manhã',   time_of_day: '07:00', order_index: 0 },
  { name: 'Lanche da manhã', time_of_day: '10:00', order_index: 1 },
  { name: 'Almoço',          time_of_day: '12:30', order_index: 2 },
  { name: 'Lanche da tarde', time_of_day: '15:30', order_index: 3 },
  { name: 'Jantar',          time_of_day: '19:00', order_index: 4 },
  { name: 'Ceia',            time_of_day: '21:30', order_index: 5 },
];

const MACRO_COLORS = { cal: '#EF4444', prot: '#6366F1', carb: '#F59E0B', fat: '#10B981' };

function calcMacros(foods) {
  return foods.reduce((acc, f) => ({
    cal:  acc.cal  + (f.calories || 0),
    prot: acc.prot + (f.protein_g || 0),
    carb: acc.carb + (f.carbs_g || 0),
    fat:  acc.fat  + (f.fat_g || 0),
  }), { cal: 0, prot: 0, carb: 0, fat: 0 });
}

function MacroBar({ label, value, total, color }) {
  const pct = total > 0 ? Math.min(100, (value / total) * 100) : 0;
  return (
    <div style={{ flex: 1 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
        <span style={{ fontSize: 10, fontWeight: 700, color, textTransform: 'uppercase' }}>{label}</span>
        <span style={{ fontSize: 11, fontWeight: 800, color }}>{Math.round(value)}{label === 'kcal' ? '' : 'g'}</span>
      </div>
      <div style={{ height: 5, borderRadius: 99, background: color + '20' }}>
        <div style={{ width: `${pct}%`, height: '100%', borderRadius: 99, background: color, transition: 'width 0.4s ease' }} />
      </div>
    </div>
  );
}

function FoodSearch({ foods, onAdd, onClose }) {
  const [q, setQ] = useState('');
  const [qty, setQty] = useState(100);
  const [selected, setSelected] = useState(null);
  const inputRef = useRef(null);

  useEffect(() => { setTimeout(() => inputRef.current?.focus(), 50); }, []);

  const results = foods.filter(f => f.name.toLowerCase().includes(q.toLowerCase())).slice(0, 8);
  const preview = selected ? {
    cal:  ((selected.calories_per_100g || 0) * qty / 100).toFixed(1),
    prot: ((selected.protein_per_100g  || 0) * qty / 100).toFixed(1),
    carb: ((selected.carbs_per_100g    || 0) * qty / 100).toFixed(1),
    fat:  ((selected.fat_per_100g      || 0) * qty / 100).toFixed(1),
  } : null;

  const handleAdd = () => {
    if (!selected) return;
    onAdd({
      food_item_id: selected.id,
      name:        selected.name,
      quantity_g:  qty,
      calories:    Number(preview.cal),
      protein_g:   Number(preview.prot),
      carbs_g:     Number(preview.carb),
      fat_g:       Number(preview.fat),
      order_index: 0,
    });
    onClose();
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 200, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', backdropFilter: 'blur(2px)' }} onClick={onClose}>
      <div style={{ background: 'white', borderRadius: '20px 20px 0 0', width: '100%', maxWidth: 520, padding: 20, maxHeight: '85vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: 'var(--gray-900)' }}>Adicionar alimento</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray-400)', lineHeight: 0 }}><X size={18} /></button>
        </div>

        {/* Search */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--gray-50)', border: '1.5px solid var(--border)', borderRadius: 10, padding: '8px 12px', marginBottom: 12 }}>
          <Search size={15} color="var(--gray-400)" />
          <input ref={inputRef} value={q} onChange={e => { setQ(e.target.value); setSelected(null); }} placeholder="Buscar no banco de alimentos..." style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: 14, flex: 1, padding: 0, boxShadow: 'none', width: 'auto' }} />
        </div>

        {/* Can also type manually */}
        {q && results.length === 0 && (
          <button onClick={() => { onAdd({ food_item_id: null, name: q, quantity_g: qty, calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0, order_index: 0 }); onClose(); }}
            style={{ width: '100%', padding: '11px 14px', borderRadius: 10, border: '1.5px dashed var(--border)', background: 'var(--gray-50)', color: 'var(--gray-600)', fontSize: 13, fontWeight: 600, cursor: 'pointer', textAlign: 'left', marginBottom: 12 }}>
            + Adicionar "{q}" manualmente (sem macros)
          </button>
        )}

        {/* Results */}
        {results.map(f => (
          <div key={f.id}
            onClick={() => setSelected(f)}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', borderRadius: 10, marginBottom: 4, background: selected?.id === f.id ? 'var(--accent-bg)' : 'transparent', border: `1px solid ${selected?.id === f.id ? 'var(--accent)' : 'transparent'}`, cursor: 'pointer', transition: 'all 0.1s' }}>
            <div>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--gray-900)' }}>{f.name}</p>
              <p style={{ margin: 0, fontSize: 11, color: 'var(--gray-400)' }}>{f.calories_per_100g} kcal · {f.protein_per_100g}g prot · {f.carbs_per_100g}g carb / 100g</p>
            </div>
            {selected?.id === f.id && <Check size={16} color="var(--accent)" />}
          </div>
        ))}

        {/* Quantity + preview */}
        {selected && (
          <div style={{ marginTop: 14, padding: 14, background: 'var(--gray-50)', borderRadius: 12, border: '1px solid var(--border)' }}>
            <label style={{ marginBottom: 8 }}>Quantidade</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <input type="number" value={qty} min="1" step="1" onChange={e => setQty(Number(e.target.value) || 100)}
                style={{ width: 100, textAlign: 'center', fontWeight: 700, fontSize: 15 }} />
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

        <button onClick={handleAdd} disabled={!selected} className="btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: 14, opacity: selected ? 1 : 0.5 }}>
          <Plus size={16} /> Adicionar ao plano
        </button>
      </div>
    </div>
  );
}

function MealCard({ meal, foods, allFoods, onAddFood, onRemoveFood, onUpdateMeal }) {
  const [open, setOpen] = useState(true);
  const [showSearch, setShowSearch] = useState(false);
  const macros = calcMacros(foods);

  return (
    <div style={{ background: 'white', borderRadius: 14, border: '1px solid var(--border)', overflow: 'hidden', boxShadow: 'var(--shadow-xs)' }}>
      {/* Meal header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderBottom: open ? '1px solid var(--border-light)' : 'none', cursor: 'pointer', background: open ? 'white' : 'var(--gray-50)' }}
        onClick={() => setOpen(o => !o)}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--gray-900)' }}>{meal.name}</p>
            <input type="time" value={meal.time_of_day || ''} onClick={e => e.stopPropagation()}
              onChange={e => onUpdateMeal({ ...meal, time_of_day: e.target.value })}
              style={{ fontSize: 11, color: 'var(--gray-400)', border: 'none', outline: 'none', background: 'transparent', padding: 0, width: 'auto', boxShadow: 'none', fontWeight: 600 }} />
          </div>
          <p style={{ margin: 0, fontSize: 11, color: 'var(--gray-400)' }}>
            {foods.length} item{foods.length !== 1 ? 's' : ''} · <span style={{ color: MACRO_COLORS.cal, fontWeight: 700 }}>{Math.round(macros.cal)} kcal</span>
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {[
            { v: macros.prot, label: 'P', color: MACRO_COLORS.prot },
            { v: macros.carb, label: 'C', color: MACRO_COLORS.carb },
            { v: macros.fat,  label: 'G', color: MACRO_COLORS.fat  },
          ].map(m => (
            <span key={m.label} style={{ fontSize: 11, fontWeight: 700, color: m.color }}>
              {Math.round(m.v)}g<span style={{ fontSize: 9, fontWeight: 500, color: 'var(--gray-400)' }}>{m.label}</span>
            </span>
          ))}
          {open ? <ChevronUp size={16} color="var(--gray-400)" /> : <ChevronDown size={16} color="var(--gray-400)" />}
        </div>
      </div>

      {open && (
        <div style={{ padding: '8px 16px 12px' }}>
          {foods.length === 0 && (
            <p style={{ fontSize: 12, color: 'var(--gray-400)', fontStyle: 'italic', padding: '8px 0' }}>Nenhum alimento adicionado</p>
          )}
          {foods.map((food, i) => (
            <div key={food._tempId || food.id || i}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: i < foods.length - 1 ? '1px solid var(--border-light)' : 'none' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--gray-900)' }}>{food.name}</p>
                <p style={{ margin: 0, fontSize: 11, color: 'var(--gray-500)' }}>
                  {food.quantity_g}g · <span style={{ color: MACRO_COLORS.cal }}>{Math.round(food.calories)} kcal</span> · {Math.round(food.protein_g)}g P · {Math.round(food.carbs_g)}g C · {Math.round(food.fat_g)}g G
                </p>
              </div>
              <button onClick={() => onRemoveFood(food._tempId || food.id)}
                style={{ width: 28, height: 28, borderRadius: 7, background: '#FEE2E2', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Trash2 size={12} color="var(--red)" />
              </button>
            </div>
          ))}
          <button onClick={() => setShowSearch(true)}
            style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 9, border: '1.5px dashed var(--border)', background: 'var(--gray-50)', color: 'var(--gray-500)', fontSize: 12, fontWeight: 600, cursor: 'pointer', width: '100%', justifyContent: 'center' }}>
            <Plus size={14} /> Adicionar alimento
          </button>
        </div>
      )}

      {showSearch && <FoodSearch foods={allFoods} onAdd={food => onAddFood(meal._tempId || meal.id, food)} onClose={() => setShowSearch(false)} />}
    </div>
  );
}

export default function NutricaoPlanoAluno() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [student, setStudent] = useState(null);
  const [allFoods, setAllFoods] = useState([]);
  const [plan, setPlan] = useState(null);
  const [meals, setMeals] = useState([]);
  const [mealFoods, setMealFoods] = useState({});
  const [anamnese, setAnamnese] = useState({ allergies: '', restrictions: '', preferences: '', water_goal_ml: 2000, goal: '', notes: '' });
  const [tab, setTab] = useState('plano');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [planName, setPlanName] = useState('Plano Alimentar');

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
      const [{ data: mm }] = await Promise.all([
        supabase.from('meal_plan_meals').select('*, meal_plan_foods(*)').eq('meal_plan_id', mp.id).order('order_index'),
      ]);
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

    // Load anamnese
    const { data: ana } = await supabase.from('nutrition_anamnesis').select('*').eq('student_id', id).maybeSingle();
    if (ana) setAnamnese(ana);

    setLoading(false);
  };

  const addFood = (mealTempId, food) => {
    const tempFood = { ...food, _tempId: `food_${Date.now()}_${Math.random()}` };
    setMealFoods(prev => ({ ...prev, [mealTempId]: [...(prev[mealTempId] || []), tempFood] }));
  };

  const removeFood = (mealTempId, foodTempId) => {
    setMealFoods(prev => ({ ...prev, [mealTempId]: (prev[mealTempId] || []).filter(f => (f._tempId || f.id) !== foodTempId) }));
  };

  const updateMeal = (updatedMeal) => {
    setMeals(prev => prev.map(m => m._tempId === updatedMeal._tempId ? updatedMeal : m));
  };

  const addMeal = () => {
    const tempId = `new_${Date.now()}`;
    const newMeal = { name: 'Nova refeição', time_of_day: '', order_index: meals.length, _tempId: tempId };
    setMeals(prev => [...prev, newMeal]);
    setMealFoods(prev => ({ ...prev, [tempId]: [] }));
  };

  const removeMeal = (tempId) => {
    setMeals(prev => prev.filter(m => m._tempId !== tempId));
    setMealFoods(prev => { const n = { ...prev }; delete n[tempId]; return n; });
  };

  const handleSave = async () => {
    if (!hasSupabase) return;
    setSaving(true);
    try {
      let planId = plan?.id;

      // Upsert plan
      if (planId) {
        await supabase.from('meal_plans').update({ name: planName, updated_at: new Date().toISOString() }).eq('id', planId);
        await supabase.from('meal_plan_meals').delete().eq('meal_plan_id', planId);
      } else {
        const { data: newPlan } = await supabase.from('meal_plans').insert({ student_id: id, personal_id: user.id, name: planName, is_active: true }).select().single();
        planId = newPlan.id;
        setPlan(newPlan);
      }

      // Insert meals + foods
      for (const meal of meals) {
        const { data: newMeal } = await supabase.from('meal_plan_meals').insert({ meal_plan_id: planId, name: meal.name, time_of_day: meal.time_of_day || '', order_index: meal.order_index }).select().single();
        const foods = mealFoods[meal._tempId] || [];
        if (foods.length > 0) {
          await supabase.from('meal_plan_foods').insert(foods.map((f, i) => ({
            meal_id: newMeal.id, food_item_id: f.food_item_id || null, name: f.name,
            quantity_g: f.quantity_g, calories: f.calories, protein_g: f.protein_g,
            carbs_g: f.carbs_g, fat_g: f.fat_g, order_index: i,
          })));
        }
      }

      // Save anamnese
      await supabase.from('nutrition_anamnesis').upsert({ student_id: id, personal_id: user.id, ...anamnese, updated_at: new Date().toISOString() }, { onConflict: 'student_id' });

      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      console.error('Save error:', err);
    }
    setSaving(false);
  };

  // Totals
  const allFoodsList = Object.values(mealFoods).flat();
  const totals = calcMacros(allFoodsList);

  if (loading) return <div className="loading-screen"><div className="spinner" /></div>;

  return (
    <div className="page-padding">

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <button onClick={() => navigate('/dashboard/nutricao')}
          style={{ width: 36, height: 36, borderRadius: 9, border: '1.5px solid var(--border)', background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <ArrowLeft size={17} color="var(--gray-600)" />
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 900, color: 'var(--gray-900)', letterSpacing: '-0.3px' }}>
            Nutrição — {student?.name || '...'}
          </h2>
          <p style={{ margin: 0, fontSize: 12, color: 'var(--gray-400)' }}>Plano alimentar personalizado</p>
        </div>
        <button onClick={handleSave} disabled={saving}
          className="btn-primary" style={{ gap: 6, opacity: saving ? 0.7 : 1, flexShrink: 0 }}>
          {saved ? <><Check size={15} /> Salvo!</> : saving ? 'Salvando...' : <><Save size={15} /> Salvar</>}
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: 'var(--gray-100)', borderRadius: 10, padding: 4 }}>
        {[{ key: 'plano', label: 'Plano Alimentar' }, { key: 'anamnese', label: 'Anamnese' }].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            style={{ flex: 1, padding: '8px 0', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: tab === t.key ? 700 : 500, background: tab === t.key ? 'white' : 'transparent', color: tab === t.key ? 'var(--accent-text)' : 'var(--gray-500)', boxShadow: tab === t.key ? 'var(--shadow-xs)' : 'none', transition: 'all 0.15s' }}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'plano' && (
        <>
          {/* Totals bar */}
          <div style={{ background: 'white', borderRadius: 14, padding: '16px 20px', border: '1px solid var(--border)', marginBottom: 16, boxShadow: 'var(--shadow-xs)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div>
                <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total diário</p>
                <p style={{ margin: 0, fontSize: 26, fontWeight: 900, color: MACRO_COLORS.cal, lineHeight: 1 }}>
                  {Math.round(totals.cal)} <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--gray-400)' }}>kcal</span>
                </p>
              </div>
              <input value={planName} onChange={e => setPlanName(e.target.value)}
                style={{ fontSize: 13, fontWeight: 600, color: 'var(--gray-600)', border: '1px solid var(--border)', borderRadius: 8, padding: '5px 10px', background: 'var(--gray-50)', width: 'auto', maxWidth: 180 }} />
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <MacroBar label="prot" value={totals.prot} total={totals.prot + totals.carb + totals.fat} color={MACRO_COLORS.prot} />
              <MacroBar label="carb" value={totals.carb} total={totals.prot + totals.carb + totals.fat} color={MACRO_COLORS.carb} />
              <MacroBar label="gord" value={totals.fat}  total={totals.prot + totals.carb + totals.fat} color={MACRO_COLORS.fat}  />
            </div>
          </div>

          {/* Meals */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {meals.map(meal => (
              <div key={meal._tempId} style={{ position: 'relative' }}>
                <MealCard
                  meal={meal}
                  foods={mealFoods[meal._tempId] || []}
                  allFoods={allFoods}
                  onAddFood={addFood}
                  onRemoveFood={(foodId) => removeFood(meal._tempId, foodId)}
                  onUpdateMeal={updateMeal}
                />
                <button onClick={() => removeMeal(meal._tempId)}
                  style={{ position: 'absolute', top: 10, right: 48, width: 26, height: 26, borderRadius: 7, background: '#FEE2E2', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1 }}>
                  <Trash2 size={11} color="var(--red)" />
                </button>
              </div>
            ))}
            <button onClick={addMeal}
              style={{ padding: '12px', borderRadius: 12, border: '2px dashed var(--border)', background: 'transparent', color: 'var(--gray-400)', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
              <Plus size={16} /> Adicionar refeição
            </button>
          </div>
        </>
      )}

      {tab === 'anamnese' && (
        <div style={{ background: 'white', borderRadius: 14, border: '1px solid var(--border)', padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label>Objetivo nutricional</label>
            <input value={anamnese.goal} onChange={e => setAnamnese(a => ({ ...a, goal: e.target.value }))} placeholder="Ex: Emagrecimento, ganho de massa, manutenção..." />
          </div>
          <div>
            <label>Alergias alimentares</label>
            <textarea value={anamnese.allergies} onChange={e => setAnamnese(a => ({ ...a, allergies: e.target.value }))} placeholder="Ex: Intolerância à lactose, alergia a amendoim..." rows={2} style={{ resize: 'vertical' }} />
          </div>
          <div>
            <label>Restrições alimentares</label>
            <textarea value={anamnese.restrictions} onChange={e => setAnamnese(a => ({ ...a, restrictions: e.target.value }))} placeholder="Ex: Vegetariano, sem glúten, sem carne vermelha..." rows={2} style={{ resize: 'vertical' }} />
          </div>
          <div>
            <label>Preferências / Alimentos que gosta</label>
            <textarea value={anamnese.preferences} onChange={e => setAnamnese(a => ({ ...a, preferences: e.target.value }))} placeholder="Ex: Prefere frango, gosta de ovos, come peixe..." rows={2} style={{ resize: 'vertical' }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Droplets size={16} color="#3B82F6" />
            <label style={{ margin: 0 }}>Meta de água diária</label>
            <input type="number" min="500" step="100" value={anamnese.water_goal_ml} onChange={e => setAnamnese(a => ({ ...a, water_goal_ml: Number(e.target.value) }))} style={{ width: 100 }} />
            <span style={{ fontSize: 13, color: 'var(--gray-400)', fontWeight: 600 }}>ml</span>
          </div>
          <div>
            <label>Observações gerais</label>
            <textarea value={anamnese.notes} onChange={e => setAnamnese(a => ({ ...a, notes: e.target.value }))} placeholder="Outras informações relevantes..." rows={3} style={{ resize: 'vertical' }} />
          </div>
        </div>
      )}
    </div>
  );
}
