import { useState, useEffect } from 'react';
import { Utensils, ChevronDown, ChevronUp, Loader, AlertCircle, Droplets, PenLine } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { supabase, hasSupabase } from '../../lib/supabase';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function calcMealTotals(foods) {
  return foods.reduce(
    (acc, f) => ({
      cal:  acc.cal  + (parseFloat(f.calories)  || 0),
      prot: acc.prot + (parseFloat(f.protein_g) || 0),
      carb: acc.carb + (parseFloat(f.carbs_g)   || 0),
      fat:  acc.fat  + (parseFloat(f.fat_g)     || 0),
    }),
    { cal: 0, prot: 0, carb: 0, fat: 0 },
  );
}

function mealTimeIcon(time) {
  if (!time) return 'Refeição';
  const [h] = time.split(':').map(Number);
  if (h >= 5  && h < 10) return 'Manha';
  if (h >= 10 && h < 12) return 'Lanche';
  if (h >= 12 && h < 15) return 'Almoco';
  if (h >= 15 && h < 18) return 'Tarde';
  if (h >= 18 && h < 21) return 'Jantar';
  return 'Noite';
}

// ─── MacroBar (dark variant for summary card) ─────────────────────────────────

function MacroBar({ label, value, goal, color, bg }) {
  const pct = goal > 0 ? Math.min(100, Math.round((value / goal) * 100)) : 0;
  return (
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</span>
        <span style={{ fontSize: 11, fontWeight: 800, color }}>
          {Math.round(value)}{goal ? <span style={{ color: 'rgba(255,255,255,0.4)', fontWeight: 500 }}>/{Math.round(goal)}</span> : ''}
        </span>
      </div>
      <div style={{ height: 5, borderRadius: 99, background: bg || 'rgba(255,255,255,0.1)' }}>
        <div style={{ height: '100%', borderRadius: 99, background: color, width: `${pct}%`, minWidth: value > 0 ? 4 : 0 }} />
      </div>
    </div>
  );
}

// ─── MealCard (student view) ──────────────────────────────────────────────────

function MealCard({ meal }) {
  const [open, setOpen] = useState(true);
  const foods  = meal.meal_plan_foods || [];
  const totals = calcMealTotals(foods);
  const period = mealTimeIcon(meal.time_of_day);

  const PERIOD_COLORS = {
    'Manha':  { bg: 'linear-gradient(135deg,#FEF3C7,#FDE68A)', icon: '#D97706' },
    'Lanche': { bg: 'linear-gradient(135deg,#ECFDF5,#D1FAE5)', icon: '#059669' },
    'Almoco': { bg: 'linear-gradient(135deg,#EFF6FF,#DBEAFE)', icon: '#2563EB' },
    'Tarde':  { bg: 'linear-gradient(135deg,#FDF4FF,#F3E8FF)', icon: '#9333EA' },
    'Jantar': { bg: 'linear-gradient(135deg,#FFF1F2,#FFE4E6)', icon: '#E11D48' },
    'Noite':  { bg: 'linear-gradient(135deg,#F0F9FF,#E0F2FE)', icon: '#0284C7' },
    'Refeição': { bg: 'linear-gradient(135deg,#F8FAFC,#F1F5F9)', icon: '#64748B' },
  };
  const pc = PERIOD_COLORS[period] || PERIOD_COLORS['Refeição'];

  return (
    <div style={{ background: 'var(--bg-surface)', borderRadius: 16, overflow: 'hidden', border: '1px solid var(--border)', boxShadow: '0 1px 6px rgba(0,0,0,0.06)', marginBottom: 12 }}>
      {/* Header */}
      <div
        onClick={() => setOpen(o => !o)}
        style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', cursor: 'pointer', borderBottom: open ? '1px solid var(--border-light, #F3F4F6)' : 'none' }}
      >
        <div style={{ width: 38, height: 38, borderRadius: 11, background: pc.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Utensils size={17} color={pc.icon} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 800, color: 'var(--gray-900, #111827)' }}>{meal.name}</p>
            {meal.time_of_day && (
              <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--gray-400, #9CA3AF)', background: 'var(--gray-50, #F9FAFB)', padding: '2px 7px', borderRadius: 6, border: '1px solid var(--border-light, #F3F4F6)' }}>
                {meal.time_of_day}
              </span>
            )}
          </div>
          <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--gray-400, #9CA3AF)' }}>
            {foods.length} alimento{foods.length !== 1 ? 's' : ''} · <span style={{ color: '#EF4444', fontWeight: 700 }}>{Math.round(totals.cal)} kcal</span>
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#6366F1' }}>{Math.round(totals.prot)}g P</span>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#F59E0B' }}>{Math.round(totals.carb)}g C</span>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#10B981' }}>{Math.round(totals.fat)}g G</span>
          {open ? <ChevronUp size={16} color="var(--gray-300, #D1D5DB)" /> : <ChevronDown size={16} color="var(--gray-300, #D1D5DB)" />}
        </div>
      </div>

      {/* Meal notes */}
      {open && meal.notes && (
        <div style={{ padding: '8px 16px', background: '#FFFBEB', borderBottom: '1px solid #FDE68A', display: 'flex', gap: 8, alignItems: 'flex-start' }}>
          <AlertCircle size={13} color="#D97706" style={{ flexShrink: 0, marginTop: 1 }} />
          <p style={{ margin: 0, fontSize: 12, color: '#92400E', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{meal.notes}</p>
        </div>
      )}

      {/* Foods list */}
      {open && (
        <div style={{ padding: '4px 0 8px' }}>
          {foods.length === 0 ? (
            <p style={{ margin: 0, padding: '10px 16px', fontSize: 13, color: 'var(--gray-400)', fontStyle: 'italic' }}>Nenhum alimento cadastrado nesta refeição.</p>
          ) : foods.map((food, idx) => (
            <div
              key={food.id || idx}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 16px', borderBottom: idx < foods.length - 1 ? '1px solid var(--border-light, #F9FAFB)' : 'none' }}
            >
              <div style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--gray-300, #D1D5DB)', flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--gray-900, #111827)' }}>{food.name}</p>
                <p style={{ margin: 0, fontSize: 11, color: 'var(--gray-400, #9CA3AF)' }}>
                  {food.quantity_g ? `${food.quantity_g}g` : ''}
                  {food.protein_g  ? ` · ${Math.round(food.protein_g)}g P` : ''}
                  {food.carbs_g    ? ` · ${Math.round(food.carbs_g)}g C`   : ''}
                  {food.fat_g      ? ` · ${Math.round(food.fat_g)}g G`     : ''}
                </p>
              </div>
              {food.calories != null && (
                <span style={{ fontSize: 11, color: '#F59E0B', fontWeight: 700, background: '#FFFBEB', padding: '2px 8px', borderRadius: 20, flexShrink: 0 }}>
                  {Math.round(food.calories)} kcal
                </span>
              )}
            </div>
          ))}

          {/* Meal macro footer */}
          {foods.length > 0 && (
            <div style={{ display: 'flex', gap: 8, padding: '8px 16px 2px', borderTop: '1px dashed var(--border-light, #F3F4F6)', marginTop: 4 }}>
              {[
                { label: 'Total',    value: `${Math.round(totals.cal)} kcal`,  color: '#EF4444' },
                { label: 'Proteina', value: `${Math.round(totals.prot)}g`,     color: '#6366F1' },
                { label: 'Carb',     value: `${Math.round(totals.carb)}g`,     color: '#F59E0B' },
                { label: 'Gordura',  value: `${Math.round(totals.fat)}g`,      color: '#10B981' },
              ].map(m => (
                <div key={m.label} style={{ flex: 1, textAlign: 'center' }}>
                  <p style={{ margin: 0, fontSize: 11, fontWeight: 800, color: m.color }}>{m.value}</p>
                  <p style={{ margin: 0, fontSize: 9, fontWeight: 600, color: 'var(--gray-400, #9CA3AF)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{m.label}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function MeuPlanoAlimentar() {
  const { user } = useAuth();
  const [plan,       setPlan]       = useState(null);
  const [meals,      setMeals]      = useState([]);
  const [anamnese,   setAnamnese]   = useState(null);
  const [todayTotals, setTodayTotals] = useState(null);
  const [loading,    setLoading]    = useState(true);

  useEffect(() => {
    if (!hasSupabase || !user) { setLoading(false); return; }
    (async () => {
      const { data: student } = await supabase.from('students').select('id').eq('user_id', user.id).maybeSingle();
      if (!student) { setLoading(false); return; }

      const today = new Date().toISOString().slice(0, 10);
      const { data: planData } = await supabase.from('meal_plans').select('*').eq('student_id', student.id).eq('is_active', true).order('updated_at', { ascending: false }).limit(1).maybeSingle();

      if (!planData) { setLoading(false); return; }
      setPlan(planData);

      const [mealsRes, anaRes, logsRes] = await Promise.all([
        supabase.from('meal_plan_meals').select('*, meal_plan_foods(*)').eq('meal_plan_id', planData.id).order('order_index'),
        supabase.from('nutrition_anamnesis').select('allergies, notes, water_goal_ml').eq('student_id', student.id).maybeSingle(),
        supabase.from('food_logs').select('kcal,protein_g,carbs_g,fat_g').eq('student_id', student.id).eq('date', today),
      ]);

      setMeals(mealsRes.data || []);
      setAnamnese(anaRes.data);

      const logs = logsRes.data || [];
      if (logs.length > 0) {
        setTodayTotals(logs.reduce((acc, l) => ({
          kcal:      acc.kcal      + (l.kcal      || 0),
          protein_g: acc.protein_g + (l.protein_g || 0),
          carbs_g:   acc.carbs_g   + (l.carbs_g   || 0),
          fat_g:     acc.fat_g     + (l.fat_g     || 0),
        }), { kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0 }));
      }

      setLoading(false);
    })();
  }, [user?.id]);

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 300 }}>
      <Loader size={28} color="#3B82F6" style={{ animation: 'spin 1s linear infinite' }} />
      <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  if (!plan) return (
    <div className="page-padding" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 40, textAlign: 'center' }}>
      <div style={{ width: 72, height: 72, borderRadius: 20, background: 'linear-gradient(135deg,#ECFDF5,#D1FAE5)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
        <Utensils size={34} color="#059669" />
      </div>
      <h3 style={{ margin: '0 0 8px', fontSize: 20, fontWeight: 900, color: 'var(--gray-900, #111827)' }}>Nenhum plano alimentar</h3>
      <p style={{ margin: 0, fontSize: 14, color: 'var(--gray-500)', lineHeight: 1.6 }}>Seu personal ainda não cadastrou um plano alimentar para você.</p>
    </div>
  );

  // Calculate totals from real relational data
  const allFoods = meals.flatMap(m => m.meal_plan_foods || []);
  const totals = allFoods.reduce(
    (acc, f) => ({
      cal:  acc.cal  + (parseFloat(f.calories)  || 0),
      prot: acc.prot + (parseFloat(f.protein_g) || 0),
      carb: acc.carb + (parseFloat(f.carbs_g)   || 0),
      fat:  acc.fat  + (parseFloat(f.fat_g)     || 0),
    }),
    { cal: 0, prot: 0, carb: 0, fat: 0 },
  );

  const hasGoals = plan.goal_calories || plan.goal_protein_g || plan.goal_carbs_g || plan.goal_fat_g;

  return (
    <div className="page-padding" style={{ flex: 1, maxWidth: 700, margin: '0 auto' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 900, color: 'var(--gray-900, #111827)' }}>
            {plan.name || 'Plano Alimentar'}
          </h2>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--gray-400, #9CA3AF)' }}>
            Atualizado em {new Date(plan.updated_at).toLocaleDateString('pt-BR')}
          </p>
        </div>
        <Link to="/aluno/log-alimentar"
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 14px', borderRadius: 10, background: 'var(--accent)', color: 'white', fontSize: 13, fontWeight: 700, textDecoration: 'none', flexShrink: 0 }}>
          <PenLine size={14} /> Registrar
        </Link>
      </div>

      {/* Today's progress (if any logs exist) */}
      {todayTotals && plan.goal_calories && (
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 14, padding: '12px 16px', marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Hoje</span>
            <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--gray-900)' }}>
              {Math.round(todayTotals.kcal)} <span style={{ fontSize: 11, color: 'var(--gray-400)', fontWeight: 500 }}>/ {plan.goal_calories} kcal</span>
            </span>
          </div>
          <div style={{ height: 6, borderRadius: 99, background: 'var(--border)', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${Math.min(100, Math.round((todayTotals.kcal / plan.goal_calories) * 100))}%`, background: 'var(--accent)', borderRadius: 99, transition: 'width 0.5s' }} />
          </div>
        </div>
      )}

      {/* Allergy banner (from anamnese) */}
      {anamnese?.allergies && (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 16px', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 14, marginBottom: 16 }}>
          <AlertCircle size={16} color="#F59E0B" style={{ flexShrink: 0, marginTop: 1 }} />
          <div>
            <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: '#F59E0B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Atenção — Alergias</p>
            <p style={{ margin: '2px 0 0', fontSize: 13, color: 'var(--gray-600)', lineHeight: 1.5 }}>{anamnese.allergies}</p>
          </div>
        </div>
      )}

      {/* Macro summary card (dark gradient) */}
      <div style={{ background: 'linear-gradient(135deg,#0F172A,#1E3A5F)', borderRadius: 20, padding: '20px', marginBottom: 20, boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }}>
        <p style={{ margin: '0 0 14px', fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Resumo diário
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: hasGoals ? 16 : 0 }}>
          {[
            { label: 'Calorias',   value: Math.round(totals.cal),  unit: 'kcal', color: '#F59E0B', goal: plan.goal_calories  },
            { label: 'Proteína',   value: Math.round(totals.prot), unit: 'g',    color: '#EF4444', goal: plan.goal_protein_g },
            { label: 'Carboidr.',  value: Math.round(totals.carb), unit: 'g',    color: '#3B82F6', goal: plan.goal_carbs_g   },
            { label: 'Gordura',    value: Math.round(totals.fat),  unit: 'g',    color: '#8B5CF6', goal: plan.goal_fat_g     },
          ].map(m => (
            <div key={m.label} style={{ textAlign: 'center' }}>
              <p style={{ margin: 0, fontSize: 22, fontWeight: 900, color: m.color, lineHeight: 1 }}>{m.value}</p>
              <p style={{ margin: '2px 0 1px', fontSize: 10, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{m.unit}</p>
              <p style={{ margin: 0, fontSize: 11, color: 'rgba(255,255,255,0.55)', fontWeight: 600 }}>{m.label}</p>
              {m.goal != null && <p style={{ margin: '2px 0 0', fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>meta: {Math.round(m.goal)}</p>}
            </div>
          ))}
        </div>

        {/* Progress bars (only if goals are set) */}
        {hasGoals && (
          <div style={{ display: 'flex', gap: 10, paddingTop: 4 }}>
            <MacroBar label="kcal"  value={Math.round(totals.cal)}  goal={plan.goal_calories}  color="#F59E0B" bg="rgba(245,158,11,0.2)"   />
            <MacroBar label="prot"  value={Math.round(totals.prot)} goal={plan.goal_protein_g} color="#EF4444" bg="rgba(239,68,68,0.2)"    />
            <MacroBar label="carb"  value={Math.round(totals.carb)} goal={plan.goal_carbs_g}   color="#3B82F6" bg="rgba(59,130,246,0.2)"   />
            <MacroBar label="gord"  value={Math.round(totals.fat)}  goal={plan.goal_fat_g}     color="#8B5CF6" bg="rgba(139,92,246,0.2)"   />
          </div>
        )}
      </div>

      {/* Water goal pill (from anamnese) */}
      {anamnese?.water_goal_ml && (
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '7px 14px', background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 20, marginBottom: 20 }}>
          <Droplets size={14} color="#3B82F6" />
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--gray-600)' }}>
            Meta de água: <strong style={{ color: '#3B82F6' }}>{(anamnese.water_goal_ml / 1000).toFixed(1)}L</strong> / dia
          </span>
        </div>
      )}

      {/* Meals */}
      {meals.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '32px 20px', color: 'var(--gray-400)', fontSize: 14 }}>
          Nenhuma refeição cadastrada neste plano.
        </div>
      ) : (
        meals.map(meal => (
          <MealCard key={meal.id} meal={meal} />
        ))
      )}

      {/* General anamnese notes */}
      {anamnese?.notes && (
        <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 14, padding: '14px 16px', marginTop: 8, marginBottom: 20, display: 'flex', gap: 10 }}>
          <AlertCircle size={16} color="#D97706" style={{ flexShrink: 0, marginTop: 2 }} />
          <div>
            <p style={{ margin: '0 0 4px', fontSize: 12, fontWeight: 700, color: '#92400E', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Observações do personal</p>
            <p style={{ margin: 0, fontSize: 13, color: '#92400E', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{anamnese.notes}</p>
          </div>
        </div>
      )}

      <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
