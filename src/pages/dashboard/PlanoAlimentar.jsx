import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, Save, Check, Loader, ChevronDown, ChevronUp, Copy, Utensils } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { supabase, hasSupabase } from '../../lib/supabase';

const UNITS = ['g', 'ml', 'unidade', 'colher (sopa)', 'colher (chá)', 'xícara', 'fatia', 'porção'];
const DEFAULT_MEALS = ['Café da manhã', 'Lanche da manhã', 'Almoço', 'Lanche da tarde', 'Jantar', 'Ceia'];

function newItem() {
  return { id: crypto.randomUUID(), name: '', quantity: '', unit: 'g', kcal: '', protein: '', carbs: '', fat: '' };
}
function newMeal(name = '') {
  return { id: crypto.randomUUID(), name, items: [newItem()] };
}

function MacroBar({ label, value, goal, color }) {
  const pct = goal > 0 ? Math.min(100, Math.round((value / goal) * 100)) : 0;
  return (
    <div style={{ flex: 1 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
        <span style={{ fontSize: 12, fontWeight: 800, color: '#111827' }}>{value}<span style={{ color: '#9CA3AF', fontWeight: 500 }}>/{goal || '—'}</span></span>
      </div>
      <div style={{ height: 6, borderRadius: 99, background: '#F1F5F9' }}>
        <div style={{ height: '100%', borderRadius: 99, background: color, width: `${pct}%`, transition: 'width 0.3s' }} />
      </div>
    </div>
  );
}

function FoodRow({ item, onChange, onDelete }) {
  const set = (k, v) => onChange({ ...item, [k]: v });
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '2fr 80px 100px 60px 60px 60px 60px 36px', gap: 6, alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #F9FAFB' }}>
      <input value={item.name} onChange={e => set('name', e.target.value)} placeholder="Alimento" style={{ padding: '7px 10px', borderRadius: 8, border: '1.5px solid #E5E7EB', fontSize: 13, color: '#111827', outline: 'none' }} />
      <input value={item.quantity} onChange={e => set('quantity', e.target.value)} placeholder="Qtd" type="number" style={{ padding: '7px 8px', borderRadius: 8, border: '1.5px solid #E5E7EB', fontSize: 13, color: '#111827', outline: 'none', textAlign: 'center' }} />
      <select value={item.unit} onChange={e => set('unit', e.target.value)} style={{ padding: '7px 6px', borderRadius: 8, border: '1.5px solid #E5E7EB', fontSize: 12, color: '#111827', background: 'white', outline: 'none' }}>
        {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
      </select>
      {['kcal', 'protein', 'carbs', 'fat'].map(k => (
        <input key={k} value={item[k]} onChange={e => set(k, e.target.value)} placeholder="0" type="number" style={{ padding: '7px 6px', borderRadius: 8, border: '1.5px solid #E5E7EB', fontSize: 13, color: '#111827', outline: 'none', textAlign: 'center' }} />
      ))}
      <button onClick={onDelete} style={{ width: 32, height: 32, borderRadius: 8, background: '#FEF2F2', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Trash2 size={14} color="#EF4444" />
      </button>
    </div>
  );
}

function MealSection({ meal, onChange, onDelete, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  const totals = meal.items.reduce((acc, it) => ({
    kcal: acc.kcal + (parseFloat(it.kcal) || 0),
    protein: acc.protein + (parseFloat(it.protein) || 0),
    carbs: acc.carbs + (parseFloat(it.carbs) || 0),
    fat: acc.fat + (parseFloat(it.fat) || 0),
  }), { kcal: 0, protein: 0, carbs: 0, fat: 0 });

  const updateItem = (id, updated) => onChange({ ...meal, items: meal.items.map(it => it.id === id ? updated : it) });
  const deleteItem = (id) => { if (meal.items.length > 1) onChange({ ...meal, items: meal.items.filter(it => it.id !== id) }); };
  const addItem = () => onChange({ ...meal, items: [...meal.items, newItem()] });

  return (
    <div style={{ background: 'white', borderRadius: 14, overflow: 'hidden', border: '1px solid #E5E7EB', marginBottom: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', cursor: 'pointer', borderBottom: open ? '1px solid #F3F4F6' : 'none' }} onClick={() => setOpen(o => !o)}>
        <div style={{ width: 32, height: 32, borderRadius: 9, background: 'linear-gradient(135deg,#F0FDF4,#DCFCE7)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Utensils size={15} color="#16A34A" />
        </div>
        <input value={meal.name} onChange={e => { e.stopPropagation(); onChange({ ...meal, name: e.target.value }); }} onClick={e => e.stopPropagation()}
          style={{ flex: 1, border: 'none', background: 'transparent', fontSize: 14, fontWeight: 700, color: '#111827', outline: 'none', cursor: 'text' }} />
        <div style={{ display: 'flex', gap: 12, marginRight: 8 }}>
          {[['kcal', '#F59E0B'], ['P', '#EF4444'], ['C', '#3B82F6'], ['G', '#8B5CF6']].map(([k, c]) => (
            <span key={k} style={{ fontSize: 11, fontWeight: 700, color: c }}>{k === 'kcal' ? `${Math.round(totals.kcal)}kcal` : k === 'P' ? `P:${Math.round(totals.protein)}g` : k === 'C' ? `C:${Math.round(totals.carbs)}g` : `G:${Math.round(totals.fat)}g`}</span>
          ))}
        </div>
        <button onClick={e => { e.stopPropagation(); onDelete(); }} style={{ width: 28, height: 28, borderRadius: 7, background: '#FEF2F2', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Trash2 size={13} color="#EF4444" />
        </button>
        {open ? <ChevronUp size={16} color="#9CA3AF" /> : <ChevronDown size={16} color="#9CA3AF" />}
      </div>

      {open && (
        <div style={{ padding: '12px 16px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 80px 100px 60px 60px 60px 60px 36px', gap: 6, marginBottom: 4 }}>
            {['Alimento', 'Qtd', 'Unidade', 'Kcal', 'Prot.', 'Carb.', 'Gord.', ''].map(h => (
              <span key={h} style={{ fontSize: 10, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: h === '' ? 'center' : 'left' }}>{h}</span>
            ))}
          </div>
          {meal.items.map(it => <FoodRow key={it.id} item={it} onChange={updated => updateItem(it.id, updated)} onDelete={() => deleteItem(it.id)} />)}
          <button onClick={addItem} style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', background: '#F0FDF4', border: '1.5px dashed #86EFAC', borderRadius: 8, color: '#16A34A', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
            <Plus size={14} /> Adicionar alimento
          </button>
        </div>
      )}
    </div>
  );
}

export default function PlanoAlimentar() {
  const { id: studentId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [student, setStudent] = useState(null);
  const [planId, setPlanId] = useState(null);
  const [name, setName] = useState('Plano Alimentar');
  const [goals, setGoals] = useState({ calories: '', protein: '', carbs: '', fat: '' });
  const [meals, setMeals] = useState(() => DEFAULT_MEALS.map(n => newMeal(n)));
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!hasSupabase || !user) { setLoading(false); return; }
    (async () => {
      const [{ data: st }, { data: plan }] = await Promise.all([
        supabase.from('students').select('id, name').eq('id', studentId).single(),
        supabase.from('meal_plans').select('*').eq('student_id', studentId).order('created_at', { ascending: false }).limit(1).maybeSingle(),
      ]);
      if (st) setStudent(st);
      if (plan) {
        setPlanId(plan.id);
        setName(plan.name || 'Plano Alimentar');
        setGoals({ calories: plan.goal_calories || '', protein: plan.goal_protein || '', carbs: plan.goal_carbs || '', fat: plan.goal_fat || '' });
        setMeals(plan.meals?.length ? plan.meals : DEFAULT_MEALS.map(n => newMeal(n)));
        setNotes(plan.notes || '');
      }
      setLoading(false);
    })();
  }, [studentId, user?.id]);

  const totals = meals.reduce((acc, meal) =>
    meal.items.reduce((a, it) => ({
      kcal: a.kcal + (parseFloat(it.kcal) || 0),
      protein: a.protein + (parseFloat(it.protein) || 0),
      carbs: a.carbs + (parseFloat(it.carbs) || 0),
      fat: a.fat + (parseFloat(it.fat) || 0),
    }), acc),
    { kcal: 0, protein: 0, carbs: 0, fat: 0 }
  );

  const save = async () => {
    setSaving(true);
    const payload = {
      personal_id: user.id,
      student_id: studentId,
      name,
      goal_calories: parseInt(goals.calories) || null,
      goal_protein: parseInt(goals.protein) || null,
      goal_carbs: parseInt(goals.carbs) || null,
      goal_fat: parseInt(goals.fat) || null,
      meals,
      notes,
      updated_at: new Date().toISOString(),
    };
    if (planId) {
      await supabase.from('meal_plans').update(payload).eq('id', planId);
    } else {
      const { data } = await supabase.from('meal_plans').insert(payload).select('id').single();
      if (data) setPlanId(data.id);
    }
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const updateMeal = useCallback((id, updated) => setMeals(prev => prev.map(m => m.id === id ? updated : m)), []);
  const deleteMeal = useCallback((id) => setMeals(prev => prev.filter(m => m.id !== id)), []);
  const addMeal = () => setMeals(prev => [...prev, newMeal('Nova refeição')]);

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 300 }}>
      <Loader size={28} color="#3B82F6" style={{ animation: 'spin 1s linear infinite' }} />
      <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  return (
    <div className="page-padding" style={{ flex: 1, maxWidth: 900, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
        <button onClick={() => navigate(`/dashboard/alunos/${studentId}`)}
          style={{ width: 40, height: 40, borderRadius: '50%', background: 'white', border: '1px solid #E5E7EB', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <ArrowLeft size={18} color="#374151" />
        </button>
        <div style={{ flex: 1 }}>
          <input value={name} onChange={e => setName(e.target.value)}
            style={{ fontSize: 22, fontWeight: 900, color: '#111827', border: 'none', background: 'transparent', outline: 'none', width: '100%' }} />
          <p style={{ margin: '2px 0 0', fontSize: 13, color: '#9CA3AF' }}>{student?.name || 'Aluno'}</p>
        </div>
        <button onClick={save} disabled={saving}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 20px', background: saved ? '#10B981' : 'linear-gradient(135deg,#3B82F6,#8B5CF6)', border: 'none', borderRadius: 12, cursor: 'pointer', color: 'white', fontSize: 14, fontWeight: 700 }}>
          {saving ? <Loader size={16} style={{ animation: 'spin 1s linear infinite' }} /> : saved ? <Check size={16} /> : <Save size={16} />}
          {saving ? 'Salvando...' : saved ? 'Salvo!' : 'Salvar'}
        </button>
      </div>

      {/* Macro targets + totals */}
      <div style={{ background: 'white', borderRadius: 16, padding: '16px 20px', marginBottom: 20, border: '1px solid #E5E7EB', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
        <p style={{ margin: '0 0 12px', fontSize: 12, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Metas diárias</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 16 }}>
          {[['calories', 'Calorias', 'kcal', '#F59E0B'], ['protein', 'Proteínas', 'g', '#EF4444'], ['carbs', 'Carboidratos', 'g', '#3B82F6'], ['fat', 'Gorduras', 'g', '#8B5CF6']].map(([k, label, unit, color]) => (
            <div key={k}>
              <p style={{ margin: '0 0 5px', fontSize: 11, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px', borderRadius: 10, border: `1.5px solid ${color}40`, background: `${color}08` }}>
                <input value={goals[k]} onChange={e => setGoals(g => ({ ...g, [k]: e.target.value }))} type="number" placeholder="0"
                  style={{ flex: 1, border: 'none', background: 'transparent', fontSize: 18, fontWeight: 900, color, outline: 'none', width: 60 }} />
                <span style={{ fontSize: 12, color: '#9CA3AF' }}>{unit}</span>
              </div>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 16 }}>
          <MacroBar label="Kcal" value={Math.round(totals.kcal)} goal={parseInt(goals.calories) || 0} color="#F59E0B" />
          <MacroBar label="Prot." value={Math.round(totals.protein)} goal={parseInt(goals.protein) || 0} color="#EF4444" />
          <MacroBar label="Carb." value={Math.round(totals.carbs)} goal={parseInt(goals.carbs) || 0} color="#3B82F6" />
          <MacroBar label="Gord." value={Math.round(totals.fat)} goal={parseInt(goals.fat) || 0} color="#8B5CF6" />
        </div>
        <p style={{ margin: '10px 0 0', fontSize: 12, color: '#6B7280', textAlign: 'center' }}>
          Total do plano: <strong style={{ color: '#F59E0B' }}>{Math.round(totals.kcal)} kcal</strong> · <strong style={{ color: '#EF4444' }}>P: {Math.round(totals.protein)}g</strong> · <strong style={{ color: '#3B82F6' }}>C: {Math.round(totals.carbs)}g</strong> · <strong style={{ color: '#8B5CF6' }}>G: {Math.round(totals.fat)}g</strong>
        </p>
      </div>

      {/* Refeições */}
      {meals.map((meal, i) => (
        <MealSection key={meal.id} meal={meal} onChange={updated => updateMeal(meal.id, updated)} onDelete={() => deleteMeal(meal.id)} defaultOpen={i === 0} />
      ))}

      <button onClick={addMeal} style={{ width: '100%', padding: '12px', background: 'white', border: '2px dashed #BFDBFE', borderRadius: 14, color: '#3B82F6', fontSize: 14, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 20 }}>
        <Plus size={16} /> Adicionar refeição
      </button>

      {/* Observações */}
      <div style={{ background: 'white', borderRadius: 14, padding: '16px', border: '1px solid #E5E7EB', marginBottom: 32 }}>
        <p style={{ margin: '0 0 8px', fontSize: 12, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Observações do nutricionista / personal</p>
        <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} placeholder="Substituições permitidas, dicas, restrições..."
          style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1.5px solid #E5E7EB', fontSize: 14, color: '#374151', resize: 'vertical', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }} />
      </div>

      <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
