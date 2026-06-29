import { useState, useEffect, useRef } from 'react';

function useCountUp(target, duration = 550) {
  const [display, setDisplay] = useState(target);
  const rafRef = useRef(null);
  const currentRef = useRef(target);
  useEffect(() => {
    const from = currentRef.current;
    const to = Math.round(target);
    cancelAnimationFrame(rafRef.current);
    if (from === to) return;
    const start = performance.now();
    const tick = (now) => {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      const cur = Math.round(from + (to - from) * eased);
      currentRef.current = cur;
      setDisplay(cur);
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, duration]);
  return display;
}
import { Search, Plus, Trash2, ChevronDown, ChevronUp, X, ChevronLeft, ChevronRight, Droplets, Copy, BookOpen, Camera, Bookmark, Flame, BarChart2, Coffee, Apple, Zap, UtensilsCrossed, CupSoda, Moon, MoonStar, Dumbbell } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { supabase, hasSupabase } from '../../lib/supabase';
import tacoFoods from '../../data/taco_foods.json';
import BarcodeScanner from '../../components/UI/BarcodeScanner';

const MEALS = [
  { key: 'cafe',        label: 'Café da manhã', icon: Coffee },
  { key: 'lanche1',    label: 'Lanche manhã',  icon: Apple },
  { key: 'pre_treino', label: 'Pré-treino',    icon: Zap },
  { key: 'almoco',     label: 'Almoço',        icon: UtensilsCrossed },
  { key: 'lanche2',    label: 'Lanche tarde',  icon: CupSoda },
  { key: 'jantar',     label: 'Jantar',        icon: Moon },
  { key: 'pos_treino', label: 'Pós-treino',    icon: Dumbbell },
  { key: 'ceia',       label: 'Ceia',          icon: MoonStar },
];

const MACRO_COLORS = { kcal: '#F59E0B', protein_g: '#3B82F6', carbs_g: '#10B981', fat_g: '#F87171' };
const MACRO_LABELS = { kcal: 'Kcal', protein_g: 'Prot', carbs_g: 'Carb', fat_g: 'Gord' };
const MACRO_UNITS  = { kcal: 'kcal', protein_g: 'g', carbs_g: 'g', fat_g: 'g' };
const GLASS_ML = 250;

function todayStr() { return new Date().toISOString().slice(0, 10); }
function fmtDate(d) {
  if (!d) return '';
  return new Date(d + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' });
}
function prevDay(d) { const dt = new Date(d + 'T12:00:00'); dt.setDate(dt.getDate() - 1); return dt.toISOString().slice(0, 10); }
function nextDay(d) { const dt = new Date(d + 'T12:00:00'); dt.setDate(dt.getDate() + 1); return dt.toISOString().slice(0, 10); }
function daysAgo(n) { const dt = new Date(); dt.setDate(dt.getDate() - n); return dt.toISOString().slice(0, 10); }

const QUICK_PORTIONS = [50, 100, 150, 200];

function FoodConfirm({ food, qty, setQty, onBack, onAdd }) {
  const r = (parseFloat(qty) || 100) / 100;
  return (
    <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 16 }}>
      <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent)', fontSize: 13, marginBottom: 10, padding: 0 }}>
        ← Voltar
      </button>
      <p style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 800, color: 'var(--gray-900)' }}>{food.name}</p>
      <p style={{ margin: '0 0 14px', fontSize: 12, color: 'var(--gray-400)' }}>{food.category}</p>

      <label style={{ fontSize: 12, color: 'var(--gray-400)', fontWeight: 600 }}>Quantas gramas?</label>
      <div style={{ display: 'flex', gap: 6, margin: '8px 0' }}>
        {QUICK_PORTIONS.map(p => (
          <button key={p} type="button" onClick={() => setQty(String(p))}
            style={{ flex: 1, padding: '7px 0', borderRadius: 8, border: `1.5px solid ${String(p) === String(qty) ? 'var(--accent)' : 'var(--border)'}`, background: String(p) === String(qty) ? 'var(--accent-bg)' : 'var(--bg-page)', color: String(p) === String(qty) ? 'var(--accent)' : 'var(--gray-400)', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
            {p}g
          </button>
        ))}
      </div>
      <input type="number" value={qty} onChange={e => setQty(e.target.value)} min={1}
        placeholder="Outro valor..."
        style={{ display: 'block', width: '100%', marginBottom: 14, padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-page)', color: 'var(--gray-900)', fontSize: 15, fontWeight: 700, boxSizing: 'border-box' }} />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 6, marginBottom: 16 }}>
        {[['Kcal','kcal',''], ['Prot','protein_g','g'], ['Carb','carbs_g','g'], ['Gord','fat_g','g']].map(([l, k, u]) => (
          <div key={k} style={{ textAlign: 'center', padding: '8px 4px', borderRadius: 8, background: 'var(--bg-page)', border: '1px solid var(--border)' }}>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 800, color: MACRO_COLORS[k] }}>{Math.round((food[k] || 0) * r * 10) / 10}{u}</p>
            <p style={{ margin: 0, fontSize: 9, color: 'var(--gray-400)', fontWeight: 600 }}>{l}</p>
          </div>
        ))}
      </div>
      <button type="button" onClick={onAdd} className="btn-primary" style={{ width: '100%', padding: '13px 0', fontSize: 15, fontWeight: 700 }}>
        Adicionar {Math.round((food.kcal || 0) * r)} kcal
      </button>
    </div>
  );
}

export default function LogAlimentar() {
  const { user } = useAuth();
  const [date, setDate]               = useState(todayStr());
  const [logs, setLogs]               = useState([]);
  const [macroGoals, setMacroGoals]   = useState(null);
  const [waterIntake, setWaterIntake] = useState(0);
  const [waterGoal, setWaterGoal]     = useState(2000);
  const [burnedKcal, setBurnedKcal]   = useState(0);
  const [trendDays, setTrendDays]     = useState([]);
  const [templates, setTemplates]     = useState([]);
  const [loading, setLoading]         = useState(true);
  const [copying, setCopying]         = useState(false);
  const [showTrend, setShowTrend]     = useState(false);
  const [addingMeal, setAddingMeal]   = useState(null);
  const [modalTab, setModalTab]       = useState('search');
  const [expandedMeal, setExpandedMeal] = useState('cafe');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFood, setSelectedFood] = useState(null);
  const [qty, setQty]                 = useState('100');
  const [customFood, setCustomFood]   = useState({ name: '', qty: '100', kcal: '', protein_g: '', carbs_g: '', fat_g: '' });
  const [personalId, setPersonalId]   = useState(null);
  const [showScanner, setShowScanner] = useState(false);
  const [savingTpl, setSavingTpl]     = useState(null);
  const [tplName, setTplName]         = useState('');
  const [applyingTpl, setApplyingTpl] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from('students').select('personal_id').eq('user_id', user.id).maybeSingle()
      .then(({ data }) => setPersonalId(data?.personal_id || null));
  }, [user?.id]);

  useEffect(() => {
    if (!user || !hasSupabase) { setLoading(false); return; }
    loadData();
  }, [user?.id, date]);

  async function loadData() {
    setLoading(true);
    const start14 = daysAgo(13);
    const [logsRes, planRes, waterRes, anaRes, workoutRes, trendRes, tplRes] = await Promise.all([
      supabase.from('food_logs').select('*').eq('student_id', user.studentId).eq('date', date).order('created_at'),
      supabase.from('meal_plans').select('goal_calories,goal_protein_g,goal_carbs_g,goal_fat_g').eq('student_id', user.studentId).eq('is_active', true).maybeSingle(),
      supabase.from('water_logs').select('intake_ml').eq('student_id', user.studentId).eq('date', date).maybeSingle(),
      supabase.from('nutrition_anamnesis').select('water_goal_ml').eq('student_id', user.studentId).maybeSingle(),
      supabase.from('workout_sessions').select('calories_burned').eq('student_id', user.studentId).eq('date', date),
      supabase.from('food_logs').select('date,kcal').eq('student_id', user.studentId).gte('date', start14).lte('date', todayStr()),
      supabase.from('meal_templates').select('*').eq('student_id', user.studentId).order('created_at', { ascending: false }),
    ]);

    setLogs(logsRes.data || []);
    setMacroGoals(planRes.data || null);
    setWaterIntake(waterRes.data?.intake_ml || 0);
    setWaterGoal(anaRes.data?.water_goal_ml || 2000);

    const burned = (workoutRes.data || []).reduce((s, w) => s + (w.calories_burned || 0), 0);
    setBurnedKcal(burned);

    const byDay = {};
    (trendRes.data || []).forEach(r => { byDay[r.date] = (byDay[r.date] || 0) + (r.kcal || 0); });
    const days = [];
    for (let i = 13; i >= 0; i--) {
      const d = daysAgo(i);
      days.push({ date: d, kcal: Math.round(byDay[d] || 0) });
    }
    setTrendDays(days);
    setTemplates(tplRes.error ? [] : (tplRes.data || []));
    setLoading(false);
  }

  async function updateWater(newMl) {
    const ml = Math.max(0, newMl);
    setWaterIntake(ml);
    await supabase.from('water_logs').upsert(
      { student_id: user.studentId, date, intake_ml: ml, goal_ml: waterGoal },
      { onConflict: 'student_id,date' }
    );
  }

  async function copyYesterday() {
    setCopying(true);
    const { data: yLogs } = await supabase.from('food_logs')
      .select('meal_type,food_name,quantity_g,kcal,protein_g,carbs_g,fat_g')
      .eq('student_id', user.studentId).eq('date', prevDay(date));
    if (yLogs?.length) {
      await supabase.from('food_logs').insert(
        yLogs.map(l => ({ ...l, student_id: user.studentId, personal_id: personalId, date }))
      );
    }
    setCopying(false);
    loadData();
  }

  async function saveTemplate(mealKey) {
    const mealLogs = logs.filter(l => l.meal_type === mealKey);
    if (!mealLogs.length || !tplName.trim()) return;
    const items = mealLogs.map(l => ({
      food_name: l.food_name, quantity_g: l.quantity_g,
      kcal: l.kcal, protein_g: l.protein_g, carbs_g: l.carbs_g, fat_g: l.fat_g,
    }));
    await supabase.from('meal_templates').insert({ student_id: user.studentId, name: tplName.trim(), items });
    setSavingTpl(null);
    setTplName('');
    loadData();
  }

  async function applyTemplate(tpl) {
    setApplyingTpl(true);
    await supabase.from('food_logs').insert(
      (tpl.items || []).map(item => ({
        student_id: user.studentId, personal_id: personalId, date,
        meal_type: addingMeal,
        food_name: item.food_name, quantity_g: item.quantity_g,
        kcal: item.kcal, protein_g: item.protein_g, carbs_g: item.carbs_g, fat_g: item.fat_g,
      }))
    );
    setApplyingTpl(false);
    setAddingMeal(null);
    loadData();
  }

  async function deleteTemplate(id) {
    await supabase.from('meal_templates').delete().eq('id', id);
    setTemplates(prev => prev.filter(t => t.id !== id));
  }

  async function addFood() {
    const isManual = modalTab === 'manual';
    if (!selectedFood && !isManual) return;
    const q = parseFloat(isManual ? customFood.qty : qty) || 100;
    const ratio = q / 100;
    let entry;
    if (isManual) {
      entry = {
        student_id: user.studentId, personal_id: personalId, date, meal_type: addingMeal,
        food_name: customFood.name || 'Alimento personalizado', quantity_g: q,
        kcal: parseFloat(customFood.kcal) || 0, protein_g: parseFloat(customFood.protein_g) || 0,
        carbs_g: parseFloat(customFood.carbs_g) || 0, fat_g: parseFloat(customFood.fat_g) || 0,
      };
    } else {
      entry = {
        student_id: user.studentId, personal_id: personalId, date, meal_type: addingMeal,
        food_name: selectedFood.name, quantity_g: q,
        kcal:      Math.round(selectedFood.kcal      * ratio),
        protein_g: Math.round(selectedFood.protein_g * ratio * 10) / 10,
        carbs_g:   Math.round(selectedFood.carbs_g   * ratio * 10) / 10,
        fat_g:     Math.round(selectedFood.fat_g     * ratio * 10) / 10,
      };
    }
    await supabase.from('food_logs').insert(entry);
    setAddingMeal(null); setSelectedFood(null); setSearchQuery('');
    setQty('100');
    setCustomFood({ name: '', qty: '100', kcal: '', protein_g: '', carbs_g: '', fat_g: '' });
    loadData();
  }

  async function removeLog(id) {
    await supabase.from('food_logs').delete().eq('id', id);
    loadData();
  }

  function openModal(mealKey) {
    setAddingMeal(mealKey);
    setModalTab('search');
    setSelectedFood(null);
    setSearchQuery('');
    setQty('100');
    setCustomFood({ name: '', qty: '100', kcal: '', protein_g: '', carbs_g: '', fat_g: '' });
  }

  function handleScanResult(food) {
    setShowScanner(false);
    setSelectedFood(food);
    setQty('100');
    setModalTab('search');
  }

  const totals = logs.reduce((acc, l) => ({
    kcal:      acc.kcal      + (l.kcal      || 0),
    protein_g: acc.protein_g + (l.protein_g || 0),
    carbs_g:   acc.carbs_g   + (l.carbs_g   || 0),
    fat_g:     acc.fat_g     + (l.fat_g     || 0),
  }), { kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0 });

  const goals = macroGoals
    ? { kcal: macroGoals.goal_calories, protein_g: macroGoals.goal_protein_g, carbs_g: macroGoals.goal_carbs_g, fat_g: macroGoals.goal_fat_g }
    : null;

  const netKcal = Math.round(totals.kcal - burnedKcal);
  const animatedKcal = useCountUp(Math.round(totals.kcal));
  const searchResults = searchQuery.trim().length >= 1
    ? tacoFoods.filter(f => f.name.toLowerCase().includes(searchQuery.toLowerCase())).slice(0, 20)
    : [];

  const waterPct     = Math.min(100, Math.round((waterIntake / waterGoal) * 100));
  const waterGlasses = Math.round(waterIntake / GLASS_ML);
  const goalGlasses  = Math.round(waterGoal / GLASS_ML);
  const waterColor   = waterPct >= 100 ? '#10B981' : waterPct >= 50 ? '#3B82F6' : '#60A5FA';
  const trendMax     = Math.max(...trendDays.map(d => d.kcal), goals?.kcal || 0, 1);

  if (loading) return <div className="loading-screen"><div className="spinner" /></div>;

  return (
    <div className="page-padding" style={{ paddingBottom: 100 }}>

      {/* Top bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <Link to="/aluno/alimentacao" style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'var(--gray-400)', fontSize: 12, fontWeight: 600, textDecoration: 'none' }}>
          <BookOpen size={13} /> Plano nutricional
        </Link>
        <h2 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: 'var(--gray-900)' }}>Diário</h2>
        {logs.length === 0 ? (
          <button onClick={copyYesterday} disabled={copying}
            style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: '1px solid var(--border)', borderRadius: 8, padding: '5px 10px', cursor: 'pointer', fontSize: 12, fontWeight: 600, color: 'var(--gray-500)' }}>
            <Copy size={12} /> {copying ? '...' : 'Copiar ontem'}
          </button>
        ) : <div style={{ width: 100 }} />}
      </div>

      {/* Date nav */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <button onClick={() => setDate(prevDay(date))} style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 8, width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
          <ChevronLeft size={16} color="var(--gray-400)" />
        </button>
        <div style={{ textAlign: 'center' }}>
          <p style={{ margin: 0, fontSize: 14, fontWeight: 800, color: 'var(--gray-900)', textTransform: 'capitalize' }}>{fmtDate(date)}</p>
          {date === todayStr() && <p style={{ margin: 0, fontSize: 11, color: 'var(--accent)' }}>Hoje</p>}
        </div>
        <button onClick={() => setDate(nextDay(date))} disabled={date >= todayStr()}
          style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 8, width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: date >= todayStr() ? 'not-allowed' : 'pointer', opacity: date >= todayStr() ? 0.3 : 1 }}>
          <ChevronRight size={16} color="var(--gray-400)" />
        </button>
      </div>

      {/* Macro summary */}
      <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 14, padding: 16, marginBottom: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: burnedKcal > 0 ? 6 : 10 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--gray-400)' }}>Total do dia</span>
          <span style={{ fontSize: 22, fontWeight: 900, color: goals?.kcal && totals.kcal > goals.kcal ? 'var(--red)' : 'var(--gray-900)' }}>
            {animatedKcal}
            {goals?.kcal
              ? <span style={{ fontSize: 13, color: 'var(--gray-400)', fontWeight: 600 }}> / {goals.kcal} kcal</span>
              : <span style={{ fontSize: 13, color: 'var(--gray-400)', fontWeight: 600 }}> kcal</span>}
          </span>
        </div>
        {burnedKcal > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 8, padding: '6px 10px', background: 'rgba(239,68,68,0.07)', borderRadius: 8 }}>
            <Flame size={12} color="#EF4444" />
            <span style={{ fontSize: 12, color: 'var(--gray-400)' }}>
              Treino queimou <b style={{ color: '#EF4444' }}>−{burnedKcal} kcal</b>
              {goals?.kcal && (
                <> · saldo líquido <b style={{ color: netKcal <= goals.kcal ? '#10B981' : 'var(--red)' }}>{netKcal} kcal</b></>
              )}
            </span>
          </div>
        )}
        {goals?.kcal && (
          <div style={{ height: 6, borderRadius: 99, background: 'var(--border)', overflow: 'hidden', marginBottom: 10 }}>
            <div style={{ height: '100%', width: `${Math.min(100, Math.round((totals.kcal / goals.kcal) * 100))}%`, background: totals.kcal > goals.kcal ? 'var(--red)' : MACRO_COLORS.kcal, borderRadius: 99, transition: 'width 0.5s' }} />
          </div>
        )}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
          {['protein_g', 'carbs_g', 'fat_g'].map(k => {
            const pct = goals?.[k] ? Math.min(100, Math.round((totals[k] / goals[k]) * 100)) : null;
            const over = goals?.[k] && totals[k] > goals[k];
            return (
              <div key={k}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: MACRO_COLORS[k] }}>{MACRO_LABELS[k]}</span>
                  <span style={{ fontSize: 10, color: 'var(--gray-400)' }}>
                    {Math.round(totals[k] * 10) / 10}{MACRO_UNITS[k]}{goals?.[k] ? `/${goals[k]}g` : ''}
                  </span>
                </div>
                <div style={{ height: 5, borderRadius: 99, background: 'var(--border)', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: pct !== null ? `${pct}%` : '0%', background: over ? 'var(--red)' : MACRO_COLORS[k], borderRadius: 99 }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Water tracker */}
      <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 14, padding: '12px 16px', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 40, height: 40, borderRadius: 12, background: waterPct >= 100 ? 'rgba(16,185,129,0.12)' : 'rgba(59,130,246,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Droplets size={20} color={waterColor} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--gray-900)' }}>Água</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: waterColor }}>
              {(waterIntake / 1000).toFixed(1)}L
              <span style={{ color: 'var(--gray-400)', fontWeight: 500 }}> / {(waterGoal / 1000).toFixed(1)}L</span>
            </span>
          </div>
          <div style={{ height: 5, borderRadius: 99, background: 'var(--border)', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${waterPct}%`, background: waterColor, borderRadius: 99, transition: 'width 0.4s' }} />
          </div>
          <p style={{ margin: '4px 0 0', fontSize: 11, color: 'var(--gray-400)' }}>
            {waterGlasses}/{goalGlasses} copos de {GLASS_ML}ml
          </p>
        </div>
        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
          <button onClick={() => updateWater(waterIntake - GLASS_ML)} disabled={waterIntake <= 0}
            style={{ width: 32, height: 32, borderRadius: 9, border: '1px solid var(--border)', background: 'var(--bg-page)', cursor: waterIntake <= 0 ? 'not-allowed' : 'pointer', opacity: waterIntake <= 0 ? 0.3 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 700, color: 'var(--gray-500)' }}>
            −
          </button>
          <button onClick={() => updateWater(waterIntake + GLASS_ML)}
            style={{ width: 32, height: 32, borderRadius: 9, border: 'none', background: waterColor, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 18, fontWeight: 700 }}>
            +
          </button>
        </div>
      </div>

      {/* 14-day trend chart toggle */}
      <button onClick={() => setShowTrend(v => !v)}
        style={{ width: '100%', background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '11px 16px', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', marginBottom: showTrend ? 0 : 10 }}>
        <BarChart2 size={15} color="var(--accent)" />
        <span style={{ flex: 1, fontSize: 13, fontWeight: 700, color: 'var(--gray-900)', textAlign: 'left' }}>Tendência 14 dias</span>
        {showTrend ? <ChevronUp size={14} color="var(--gray-400)" /> : <ChevronDown size={14} color="var(--gray-400)" />}
      </button>

      {showTrend && (
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderTopWidth: 0, borderRadius: '0 0 12px 12px', padding: '12px 16px', marginBottom: 10 }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 72, marginBottom: 6 }}>
            {trendDays.map((d, i) => {
              const h = d.kcal > 0 ? Math.max(4, Math.round((d.kcal / trendMax) * 72)) : 2;
              const over = goals?.kcal && d.kcal > goals.kcal;
              const isToday = d.date === todayStr();
              return (
                <div key={i} title={`${d.kcal} kcal`}
                  style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '100%' }}>
                  <div style={{ width: '100%', height: h, borderRadius: 3, background: d.kcal === 0 ? 'var(--border)' : over ? '#EF4444' : isToday ? 'var(--accent)' : '#10B981', opacity: d.kcal === 0 ? 0.4 : 1 }} />
                </div>
              );
            })}
          </div>
          <div style={{ display: 'flex', gap: 12, fontSize: 11, color: 'var(--gray-400)', flexWrap: 'wrap' }}>
            <span><span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 2, background: 'var(--accent)', marginRight: 4 }} />Hoje</span>
            <span><span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 2, background: '#10B981', marginRight: 4 }} />Dentro da meta</span>
            <span><span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 2, background: '#EF4444', marginRight: 4 }} />Acima da meta</span>
          </div>
          <p style={{ margin: '6px 0 0', fontSize: 11, color: 'var(--gray-400)' }}>
            {trendDays.filter(d => d.kcal > 0).length} de 14 dias com registro
          </p>
        </div>
      )}

      {/* Meal sections */}
      {MEALS.map(meal => {
        const mealLogs = logs.filter(l => l.meal_type === meal.key);
        const mealKcal = mealLogs.reduce((s, l) => s + (l.kcal || 0), 0);
        const open = expandedMeal === meal.key;
        return (
          <div key={meal.key} style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 12, marginBottom: 8, overflow: 'hidden' }}>
            <button onClick={() => setExpandedMeal(open ? null : meal.key)}
              style={{ width: '100%', padding: '13px 16px', display: 'flex', alignItems: 'center', gap: 10, background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
              <meal.icon size={17} color="var(--gray-500)" />
              <span style={{ flex: 1, fontSize: 14, fontWeight: 700, color: 'var(--gray-900)' }}>{meal.label}</span>
              {mealLogs.length > 0 && <span style={{ fontSize: 12, color: 'var(--gray-400)' }}>{Math.round(mealKcal)} kcal</span>}
              {open ? <ChevronUp size={16} color="var(--gray-400)" /> : <ChevronDown size={16} color="var(--gray-400)" />}
            </button>
            {open && (
              <div style={{ padding: '0 16px 12px' }}>
                {mealLogs.map(log => (
                  <div key={log.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0', borderTop: '1px solid var(--border)' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--gray-900)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{log.food_name}</p>
                      <p style={{ margin: 0, fontSize: 11, color: 'var(--gray-400)' }}>
                        {log.quantity_g}g · {Math.round(log.kcal || 0)} kcal · P:{Math.round((log.protein_g || 0) * 10) / 10}g · C:{Math.round((log.carbs_g || 0) * 10) / 10}g · G:{Math.round((log.fat_g || 0) * 10) / 10}g
                      </p>
                    </div>
                    <button onClick={() => removeLog(log.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, flexShrink: 0 }}>
                      <Trash2 size={14} color="var(--red)" />
                    </button>
                  </div>
                ))}
                <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                  <button onClick={() => openModal(meal.key)}
                    style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: '1px dashed var(--border)', borderRadius: 8, padding: '8px 12px', cursor: 'pointer', color: 'var(--accent)', fontSize: 13, fontWeight: 600 }}>
                    <Plus size={14} /> Adicionar
                  </button>
                  {mealLogs.length > 0 && (
                    <button onClick={() => { setSavingTpl(meal.key); setTplName(meal.label); }}
                      style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 10px', cursor: 'pointer', color: 'var(--gray-500)', fontSize: 12, fontWeight: 600, flexShrink: 0 }}>
                      <Bookmark size={12} /> Salvar
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* Save template modal */}
      {savingTpl && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: 'var(--bg-surface)', borderRadius: 16, padding: 20, width: '100%', maxWidth: 340 }}>
            <p style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 800, color: 'var(--gray-900)' }}>Salvar template</p>
            <p style={{ margin: '0 0 16px', fontSize: 13, color: 'var(--gray-400)' }}>
              {logs.filter(l => l.meal_type === savingTpl).length} alimentos serão salvos
            </p>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--gray-400)' }}>Nome</label>
            <input
              autoFocus value={tplName} onChange={e => setTplName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && saveTemplate(savingTpl)}
              style={{ display: 'block', width: '100%', marginTop: 6, marginBottom: 16, padding: '11px 12px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg-page)', color: 'var(--gray-900)', fontSize: 14, boxSizing: 'border-box' }}
            />
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => { setSavingTpl(null); setTplName(''); }}
                style={{ flex: 1, padding: '11px 0', borderRadius: 10, border: '1px solid var(--border)', background: 'none', color: 'var(--gray-500)', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
                Cancelar
              </button>
              <button onClick={() => saveTemplate(savingTpl)} disabled={!tplName.trim()}
                style={{ flex: 1, padding: '11px 0', borderRadius: 10, border: 'none', background: 'var(--accent)', color: 'white', fontSize: 14, fontWeight: 700, cursor: tplName.trim() ? 'pointer' : 'not-allowed', opacity: tplName.trim() ? 1 : 0.5 }}>
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add food modal — bottom sheet */}
      {addingMeal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000 }} onClick={() => setAddingMeal(null)}>
          <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, maxHeight: '88vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-surface)', borderRadius: '20px 20px 0 0', boxShadow: '0 -8px 40px rgba(0,0,0,0.5)', animation: 'slideUp 0.22s ease-out', zIndex: 1001 }}
            onClick={e => e.stopPropagation()}>

            {/* Drag handle */}
            <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 10, paddingBottom: 2, flexShrink: 0 }}>
              <div style={{ width: 36, height: 4, borderRadius: 99, background: 'var(--border)' }} />
            </div>

            {/* Header */}
            <div style={{ padding: '10px 16px 0', flexShrink: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <p style={{ margin: 0, fontSize: 15, fontWeight: 800, color: 'var(--gray-900)' }}>
                  {MEALS.find(m => m.key === addingMeal)?.label}
                </p>
                <button onClick={() => setAddingMeal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
                  <X size={20} color="var(--gray-400)" />
                </button>
              </div>
              <div style={{ display: 'flex', overflowX: 'auto', gap: 0, borderBottom: '1px solid var(--border)', marginBottom: 0 }}>
                {[
                  { key: 'search',    label: 'Buscar' },
                  { key: 'scanner',   label: 'Scanner', icon: Camera },
                  { key: 'templates', label: 'Salvos', icon: Bookmark },
                  { key: 'manual',    label: 'Manual' },
                ].map(t => (
                  <button key={t.key}
                    onClick={() => {
                      if (t.key === 'scanner') { setShowScanner(true); return; }
                      setModalTab(t.key); setSelectedFood(null); setSearchQuery('');
                    }}
                    style={{ flex: '0 0 auto', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: 'none', borderBottom: `2px solid ${modalTab === t.key ? 'var(--accent)' : 'transparent'}`, marginBottom: -1, cursor: 'pointer', fontSize: 13, fontWeight: 700, color: modalTab === t.key ? 'var(--accent)' : 'var(--gray-400)', whiteSpace: 'nowrap' }}>
                    {t.icon && <t.icon size={13} />}{t.label}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: 16, WebkitOverflowScrolling: 'touch' }}>

            {/* Search tab */}
            {modalTab === 'search' && !selectedFood && (
              <>
                <div className="search-bar" style={{ marginBottom: 12 }}>
                  <Search size={14} color="var(--gray-400)" />
                  <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Digite o nome do alimento..."
                    style={{ background: 'none', border: 'none', outline: 'none', color: 'var(--gray-900)', fontSize: 14, flex: 1 }} />
                </div>
                {searchQuery.trim().length >= 1 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {searchResults.length === 0 && <p style={{ color: 'var(--gray-400)', fontSize: 13, textAlign: 'center' }}>Nenhum resultado</p>}
                    {searchResults.map(f => (
                      <button key={f.id} onClick={() => { setSelectedFood(f); setQty('100'); }}
                        style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px', cursor: 'pointer', textAlign: 'left' }}>
                        <p style={{ margin: '0 0 3px', fontSize: 13, fontWeight: 700, color: 'var(--gray-900)' }}>{f.name}</p>
                        <p style={{ margin: 0, fontSize: 11, color: 'var(--gray-400)' }}>por 100g · {f.kcal} kcal · P:{f.protein_g}g · C:{f.carbs_g}g · G:{f.fat_g}g</p>
                      </button>
                    ))}
                  </div>
                ) : (
                  <p style={{ color: 'var(--gray-400)', fontSize: 13, textAlign: 'center', marginTop: 20 }}>
                    Digite para buscar entre {tacoFoods.length} alimentos
                  </p>
                )}
              </>
            )}

            {modalTab === 'search' && selectedFood && (
              <FoodConfirm food={selectedFood} qty={qty} setQty={setQty} onBack={() => setSelectedFood(null)} onAdd={addFood} />
            )}

            {/* Templates tab */}
            {modalTab === 'templates' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {templates.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                    <Bookmark size={32} color="var(--gray-300)" style={{ marginBottom: 12 }} />
                    <p style={{ margin: 0, fontSize: 14, color: 'var(--gray-400)', fontWeight: 600 }}>Nenhum template salvo</p>
                    <p style={{ margin: '6px 0 0', fontSize: 12, color: 'var(--gray-400)', lineHeight: 1.5 }}>
                      Adicione alimentos a uma refeição e clique em "Salvar" para criar templates
                    </p>
                  </div>
                ) : templates.map(tpl => (
                  <div key={tpl.id} style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 14 }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 6 }}>
                      <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--gray-900)' }}>{tpl.name}</p>
                      <button onClick={() => deleteTemplate(tpl.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px', flexShrink: 0 }}>
                        <Trash2 size={13} color="var(--gray-400)" />
                      </button>
                    </div>
                    <p style={{ margin: '0 0 10px', fontSize: 12, color: 'var(--gray-400)' }}>
                      {tpl.items?.length || 0} alimentos · {Math.round((tpl.items || []).reduce((s, i) => s + (i.kcal || 0), 0))} kcal
                    </p>
                    <button onClick={() => applyTemplate(tpl)} disabled={applyingTpl}
                      style={{ width: '100%', padding: '9px 0', borderRadius: 9, border: 'none', background: 'var(--accent)', color: 'white', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                      {applyingTpl ? 'Aplicando...' : 'Usar esta refeição'}
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Manual tab */}
            {modalTab === 'manual' && (
              <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 16 }}>
                {[
                  ['Nome do alimento', 'name', 'text'],
                  ['Quantidade (g)', 'qty', 'number'],
                  ['Calorias (kcal)', 'kcal', 'number'],
                  ['Proteína (g)', 'protein_g', 'number'],
                  ['Carboidratos (g)', 'carbs_g', 'number'],
                  ['Gorduras (g)', 'fat_g', 'number'],
                ].map(([label, key, type]) => (
                  <div key={key} style={{ marginBottom: 12 }}>
                    <label style={{ fontSize: 12, color: 'var(--gray-400)', fontWeight: 600 }}>{label}</label>
                    <input type={type} value={customFood[key]} onChange={e => setCustomFood(p => ({ ...p, [key]: e.target.value }))} placeholder={type === 'number' ? '0' : ''}
                      style={{ display: 'block', width: '100%', marginTop: 4, padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-page)', color: 'var(--gray-900)', fontSize: 14, boxSizing: 'border-box' }} />
                  </div>
                ))}
                <button onClick={addFood} disabled={!customFood.name} className="btn-primary" style={{ width: '100%', padding: '13px 0', fontSize: 15, fontWeight: 700, marginTop: 4 }}>
                  Adicionar
                </button>
              </div>
            )}

            </div>
          </div>
        </div>
      )}

      {/* Barcode scanner overlay */}
      {showScanner && (
        <BarcodeScanner onResult={handleScanResult} onClose={() => setShowScanner(false)} />
      )}
    </div>
  );
}
