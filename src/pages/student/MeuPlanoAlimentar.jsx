import { useState, useEffect } from 'react';
import { Utensils, ChevronDown, ChevronUp, Loader, AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { supabase, hasSupabase } from '../../lib/supabase';

function MacroBar({ label, value, goal, color, bg }) {
  const pct = goal > 0 ? Math.min(100, Math.round((value / goal) * 100)) : 0;
  return (
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</span>
        <span style={{ fontSize: 12, fontWeight: 800, color }}>{value}{goal ? <span style={{ color: '#9CA3AF', fontWeight: 500 }}>/{goal}</span> : ''}</span>
      </div>
      <div style={{ height: 7, borderRadius: 99, background: bg || '#F1F5F9' }}>
        <div style={{ height: '100%', borderRadius: 99, background: color, width: `${pct}%`, minWidth: value > 0 ? 6 : 0 }} />
      </div>
    </div>
  );
}

function MealCard({ meal }) {
  const [open, setOpen] = useState(true);
  const totals = meal.items.reduce((acc, it) => ({
    kcal: acc.kcal + (parseFloat(it.kcal) || 0),
    protein: acc.protein + (parseFloat(it.protein) || 0),
    carbs: acc.carbs + (parseFloat(it.carbs) || 0),
    fat: acc.fat + (parseFloat(it.fat) || 0),
  }), { kcal: 0, protein: 0, carbs: 0, fat: 0 });

  return (
    <div style={{ background: 'white', borderRadius: 14, overflow: 'hidden', border: '1px solid #F1F5F9', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', marginBottom: 12 }}>
      <div onClick={() => setOpen(o => !o)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px', cursor: 'pointer', borderBottom: open ? '1px solid #F9FAFB' : 'none' }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg,#ECFDF5,#D1FAE5)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Utensils size={16} color="#059669" />
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ margin: 0, fontSize: 14, fontWeight: 800, color: '#111827' }}>{meal.name}</p>
          <p style={{ margin: '1px 0 0', fontSize: 12, color: '#9CA3AF' }}>{meal.items.filter(i => i.name?.trim()).length} alimentos · {Math.round(totals.kcal)} kcal</p>
        </div>
        <div style={{ display: 'flex', gap: 10, marginRight: 4 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#EF4444' }}>P:{Math.round(totals.protein)}g</span>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#3B82F6' }}>C:{Math.round(totals.carbs)}g</span>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#8B5CF6' }}>G:{Math.round(totals.fat)}g</span>
        </div>
        {open ? <ChevronUp size={16} color="#D1D5DB" /> : <ChevronDown size={16} color="#D1D5DB" />}
      </div>

      {open && (
        <div style={{ padding: '0 0 8px' }}>
          {meal.items.filter(i => i.name?.trim()).map((it, idx) => (
            <div key={it.id || idx} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', borderBottom: '1px solid #F9FAFB' }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#D1D5DB', flexShrink: 0 }} />
              <span style={{ flex: 1, fontSize: 14, fontWeight: 600, color: '#111827' }}>{it.name}</span>
              <span style={{ fontSize: 13, color: '#6B7280', fontWeight: 600, flexShrink: 0 }}>{it.quantity} {it.unit}</span>
              {it.kcal && <span style={{ fontSize: 11, color: '#F59E0B', fontWeight: 700, background: '#FFFBEB', padding: '2px 8px', borderRadius: 20, flexShrink: 0 }}>{it.kcal} kcal</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function MeuPlanoAlimentar() {
  const { user } = useAuth();
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!hasSupabase || !user) { setLoading(false); return; }
    (async () => {
      const { data: student } = await supabase.from('students').select('id').eq('user_id', user.id).maybeSingle();
      if (!student) { setLoading(false); return; }
      const { data } = await supabase.from('meal_plans').select('*').eq('student_id', student.id).order('updated_at', { ascending: false }).limit(1).maybeSingle();
      setPlan(data || null);
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
      <h3 style={{ margin: '0 0 8px', fontSize: 20, fontWeight: 900, color: '#111827' }}>Nenhum plano alimentar</h3>
      <p style={{ margin: 0, fontSize: 14, color: '#6B7280', lineHeight: 1.6 }}>Seu personal ainda não cadastrou um plano alimentar para você.</p>
    </div>
  );

  const totals = (plan.meals || []).reduce((acc, meal) =>
    (meal.items || []).reduce((a, it) => ({
      kcal: a.kcal + (parseFloat(it.kcal) || 0),
      protein: a.protein + (parseFloat(it.protein) || 0),
      carbs: a.carbs + (parseFloat(it.carbs) || 0),
      fat: a.fat + (parseFloat(it.fat) || 0),
    }), acc),
    { kcal: 0, protein: 0, carbs: 0, fat: 0 }
  );

  return (
    <div className="page-padding" style={{ flex: 1, maxWidth: 700, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ margin: 0, fontSize: 24, fontWeight: 900, color: '#111827' }}>{plan.name || 'Plano Alimentar'}</h2>
        <p style={{ margin: '4px 0 0', fontSize: 13, color: '#9CA3AF' }}>
          Atualizado em {new Date(plan.updated_at).toLocaleDateString('pt-BR')}
        </p>
      </div>

      {/* Macro summary card */}
      <div style={{ background: 'linear-gradient(135deg,#0F172A,#1E3A5F)', borderRadius: 20, padding: '20px', marginBottom: 20, boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 16 }}>
          {[
            { label: 'Calorias', value: Math.round(totals.kcal), goal: plan.goal_calories, unit: 'kcal', color: '#F59E0B' },
            { label: 'Proteína', value: Math.round(totals.protein), goal: plan.goal_protein, unit: 'g', color: '#EF4444' },
            { label: 'Carboidrato', value: Math.round(totals.carbs), goal: plan.goal_carbs, unit: 'g', color: '#3B82F6' },
            { label: 'Gordura', value: Math.round(totals.fat), goal: plan.goal_fat, unit: 'g', color: '#8B5CF6' },
          ].map(m => (
            <div key={m.label} style={{ textAlign: 'center' }}>
              <p style={{ margin: 0, fontSize: 22, fontWeight: 900, color: m.color, lineHeight: 1 }}>{m.value}</p>
              <p style={{ margin: '2px 0 1px', fontSize: 10, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{m.unit}</p>
              <p style={{ margin: 0, fontSize: 11, color: 'rgba(255,255,255,0.6)', fontWeight: 600 }}>{m.label}</p>
              {m.goal && <p style={{ margin: '2px 0 0', fontSize: 10, color: 'rgba(255,255,255,0.35)' }}>meta: {m.goal}</p>}
            </div>
          ))}
        </div>
        {(plan.goal_calories || plan.goal_protein || plan.goal_carbs || plan.goal_fat) && (
          <div style={{ display: 'flex', gap: 10 }}>
            <MacroBar label="Kcal" value={Math.round(totals.kcal)} goal={plan.goal_calories} color="#F59E0B" bg="rgba(245,158,11,0.2)" />
            <MacroBar label="Prot." value={Math.round(totals.protein)} goal={plan.goal_protein} color="#EF4444" bg="rgba(239,68,68,0.2)" />
            <MacroBar label="Carb." value={Math.round(totals.carbs)} goal={plan.goal_carbs} color="#3B82F6" bg="rgba(59,130,246,0.2)" />
            <MacroBar label="Gord." value={Math.round(totals.fat)} goal={plan.goal_fat} color="#8B5CF6" bg="rgba(139,92,246,0.2)" />
          </div>
        )}
      </div>

      {/* Refeições */}
      {(plan.meals || []).filter(m => m.items?.some(i => i.name?.trim())).map(meal => (
        <MealCard key={meal.id} meal={meal} />
      ))}

      {/* Observações */}
      {plan.notes && (
        <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 14, padding: '14px 16px', marginTop: 8, marginBottom: 20, display: 'flex', gap: 10 }}>
          <AlertCircle size={16} color="#D97706" style={{ flexShrink: 0, marginTop: 2 }} />
          <div>
            <p style={{ margin: '0 0 4px', fontSize: 12, fontWeight: 700, color: '#92400E', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Observações</p>
            <p style={{ margin: 0, fontSize: 13, color: '#92400E', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{plan.notes}</p>
          </div>
        </div>
      )}

      <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
