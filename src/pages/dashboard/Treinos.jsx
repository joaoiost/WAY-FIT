import { useState, useEffect, useRef } from 'react';
import { Plus, Dumbbell, Trash2, X, Play, Loader, Save, Check, ArrowUp, ArrowDown, ExternalLink, ChevronDown } from 'lucide-react';
import { trainingPlans as mockPlans, students as mockStudents } from '../../data/mockData';
import { useAuth } from '../../context/AuthContext';
import { supabase, hasSupabase } from '../../lib/supabase';

const DAYS = [
  { value: 1, label: 'Seg', full: 'Segunda-feira' },
  { value: 2, label: 'Ter', full: 'Terça-feira' },
  { value: 3, label: 'Qua', full: 'Quarta-feira' },
  { value: 4, label: 'Qui', full: 'Quinta-feira' },
  { value: 5, label: 'Sex', full: 'Sexta-feira' },
  { value: 6, label: 'Sáb', full: 'Sábado' },
  { value: 0, label: 'Dom', full: 'Domingo' },
];

const GROUPS = ['Peito','Costas','Pernas','Ombro','Braços','Abdômen','Full Body','Cardio','Descanso'];

const GROUP_COLORS = {
  Peito:'#EF4444', Costas:'#3B82F6', Pernas:'#8B5CF6', Ombro:'#F59E0B',
  Braços:'#10B981', Abdômen:'#06B6D4', 'Full Body':'#EC4899', Cardio:'#F97316', Descanso:'#9CA3AF',
};

const REPS_QUICK = ['6','8','10','12','15','20','Falha'];
const REST_QUICK = ['30s','45s','60s','75s','90s','2min'];

const FREQ_PRESETS = {
  3: { days: [1,3,5], groups: ['Peito','Costas','Pernas'] },
  4: { days: [1,2,4,5], groups: ['Peito','Costas','Pernas','Ombro'] },
  5: { days: [1,2,3,4,5], groups: ['Peito','Costas','Pernas','Ombro','Braços'] },
  6: { days: [1,2,3,4,5,6], groups: ['Peito','Costas','Pernas','Ombro','Braços','Full Body'] },
};

/* ─── Componente de exercício com acordeão ──────────────────────── */
function ExerciseCard({ ex, index, total, onUpdate, onDelete, onMove, accentColor, autoOpen }) {
  const [open, setOpen] = useState(autoOpen || !ex.name);
  const sets = parseInt(ex.sets) || 3;
  const ac = accentColor || '#3B82F6';
  const isCustomReps = ex.reps && !REPS_QUICK.includes(ex.reps);

  return (
    <div style={{
      background: 'white', borderRadius: 16,
      border: `1.5px solid ${open ? ac + '40' : '#E5E7EB'}`,
      marginBottom: 10, overflow: 'hidden',
      boxShadow: open ? `0 4px 16px ${ac}15` : '0 1px 4px rgba(0,0,0,0.05)',
      transition: 'all 0.2s',
    }}>

      {/* ── Linha compacta (sempre visível) ── */}
      <div onClick={() => setOpen(o => !o)}
        style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px', cursor: 'pointer', userSelect: 'none' }}>
        {/* Número */}
        <div style={{ width: 26, height: 26, borderRadius: '50%', background: ac + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, color: ac, flexShrink: 0 }}>
          {index + 1}
        </div>
        {/* Nome */}
        <span style={{ flex: 1, fontSize: 15, fontWeight: 700, color: ex.name ? '#111827' : '#9CA3AF', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>
          {ex.name || 'Nome do exercício...'}
        </span>
        {/* Resumo quando fechado */}
        {!open && ex.name && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: ac, background: ac + '12', padding: '3px 10px', borderRadius: 20 }}>{sets}×{ex.reps || '—'}</span>
            {ex.load && <span style={{ fontSize: 12, color: '#6B7280', fontWeight: 600 }}>{ex.load} kg</span>}
            {ex.rest && <span style={{ fontSize: 12, color: '#6B7280', fontWeight: 600 }}>{ex.rest}</span>}
            {ex.videoUrl && <Play size={13} color="#D97706" fill="#D97706" />}
          </div>
        )}
        {/* Seta */}
        <ChevronDown size={16} color="#9CA3AF" style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0 }} />
      </div>

      {/* ── Formulário expandido ── */}
      {open && (
        <>
          <div style={{ borderTop: '1px solid #F3F4F6', padding: '16px 16px 0' }}>
            {/* Nome editável */}
            <div style={{ marginBottom: 14 }}>
              <p style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Nome do exercício</p>
              <input
                value={ex.name}
                onChange={e => onUpdate('name', e.target.value)}
                placeholder="Ex: Supino Reto com Barra"
                autoFocus={!ex.name}
                style={{ fontSize: 15, fontWeight: 600, color: '#111827' }}
              />
            </div>

            {/* Séries + Carga lado a lado */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
              <div>
                <p style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Séries</p>
                <div style={{ display: 'flex', alignItems: 'center', background: '#F9FAFB', borderRadius: 12, border: '1.5px solid #E5E7EB', overflow: 'hidden', height: 52 }}>
                  <button onClick={() => onUpdate('sets', Math.max(1, sets - 1))}
                    style={{ width: 48, height: '100%', background: 'none', border: 'none', cursor: 'pointer', fontSize: 24, fontWeight: 700, color: '#374151', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
                  <span style={{ flex: 1, fontSize: 24, fontWeight: 900, color: '#111827', textAlign: 'center' }}>{sets}</span>
                  <button onClick={() => onUpdate('sets', sets + 1)}
                    style={{ width: 48, height: '100%', background: 'none', border: 'none', cursor: 'pointer', fontSize: 24, fontWeight: 700, color: '#374151', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
                </div>
              </div>
              <div>
                <p style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Carga (kg)</p>
                <input value={ex.load || ''} onChange={e => onUpdate('load', e.target.value)}
                  placeholder="0" type="number" min="0"
                  style={{ height: 52, fontSize: 24, fontWeight: 900, textAlign: 'center', background: '#F9FAFB', borderRadius: 12 }} />
              </div>
            </div>

            {/* Repetições */}
            <div style={{ marginBottom: 14 }}>
              <p style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Repetições</p>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                {REPS_QUICK.map(r => (
                  <button key={r} onClick={() => onUpdate('reps', r)}
                    style={{ padding: '8px 13px', borderRadius: 22, fontSize: 13, fontWeight: 700, cursor: 'pointer', minHeight: 40, border: `2px solid ${ex.reps === r ? ac : '#E5E7EB'}`, background: ex.reps === r ? ac : '#F9FAFB', color: ex.reps === r ? 'white' : '#6B7280', transition: 'all 0.1s' }}>
                    {r}
                  </button>
                ))}
                <input value={isCustomReps ? ex.reps : ''} onChange={e => onUpdate('reps', e.target.value)}
                  placeholder="outro..." style={{ width: 76, fontSize: 13, height: 40, textAlign: 'center', borderRadius: 22, border: `2px solid ${isCustomReps ? ac : '#E5E7EB'}`, background: isCustomReps ? ac + '10' : '#F9FAFB', color: isCustomReps ? ac : '#6B7280', fontWeight: 700 }} />
              </div>
            </div>

            {/* Descanso */}
            <div style={{ marginBottom: 14 }}>
              <p style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Descanso</p>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {REST_QUICK.map(r => (
                  <button key={r} onClick={() => onUpdate('rest', r)}
                    style={{ padding: '8px 13px', borderRadius: 22, fontSize: 13, fontWeight: 700, cursor: 'pointer', minHeight: 40, border: `2px solid ${ex.rest === r ? ac : '#E5E7EB'}`, background: ex.rest === r ? ac : '#F9FAFB', color: ex.rest === r ? 'white' : '#6B7280', transition: 'all 0.1s' }}>
                    {r}
                  </button>
                ))}
              </div>
            </div>

            {/* URL do vídeo */}
            <div style={{ marginBottom: 14 }}>
              <p style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.07em' }}>URL do Vídeo (YouTube)</p>
              <div style={{ display: 'flex', gap: 8 }}>
                <input value={ex.videoUrl || ''} onChange={e => onUpdate('videoUrl', e.target.value)}
                  placeholder="https://youtube.com/watch?v=..." style={{ flex: 1, fontSize: 13 }} />
                {ex.videoUrl && (
                  <a href={ex.videoUrl} target="_blank" rel="noopener noreferrer"
                    style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '0 14px', borderRadius: 10, background: '#FEF3C7', color: '#D97706', textDecoration: 'none', fontSize: 13, fontWeight: 700, flexShrink: 0, minHeight: 44 }}>
                    <Play size={13} fill="#D97706" /> Ver
                  </a>
                )}
              </div>
            </div>

            {/* Observações */}
            <div style={{ marginBottom: 14 }}>
              <p style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Observações</p>
              <input value={ex.obs || ''} onChange={e => onUpdate('obs', e.target.value)}
                placeholder="Dica de execução, equipamento, etc." style={{ fontSize: 13 }} />
            </div>
          </div>

          {/* Ações */}
          <div style={{ padding: '8px 16px 14px', display: 'flex', gap: 8, justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: 6 }}>
              <button onClick={() => onMove(index, -1)} disabled={index === 0}
                style={{ padding: '7px 12px', background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: 8, cursor: index === 0 ? 'not-allowed' : 'pointer', color: index === 0 ? '#D1D5DB' : '#374151', fontSize: 13, fontWeight: 600 }}>↑ Subir</button>
              <button onClick={() => onMove(index, 1)} disabled={index === total - 1}
                style={{ padding: '7px 12px', background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: 8, cursor: index === total - 1 ? 'not-allowed' : 'pointer', color: index === total - 1 ? '#D1D5DB' : '#374151', fontSize: 13, fontWeight: 600 }}>↓ Descer</button>
            </div>
            <button onClick={onDelete}
              style={{ padding: '7px 14px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, cursor: 'pointer', color: '#EF4444', fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 5 }}>
              <Trash2 size={13} /> Remover
            </button>
          </div>
        </>
      )}
    </div>
  );
}

/* ─── Modal configurar semana ──────────────────────────────────────── */
function ConfigWeekModal({ onConfirm, onClose }) {
  const [freq, setFreq] = useState(4);
  const buildDayGroups = (f) => {
    const p = FREQ_PRESETS[f];
    return Object.fromEntries(p.days.map((d, i) => [d, p.groups[i]]));
  };
  const [dayGroups, setDayGroups] = useState(() => buildDayGroups(4));
  const [saving, setSaving] = useState(false);

  const applyFreq = (f) => { setFreq(f); setDayGroups(buildDayGroups(f)); };

  const toggleDay = (dv) => {
    if (dayGroups[dv] !== undefined) {
      const next = { ...dayGroups }; delete next[dv]; setDayGroups(next);
    } else {
      setDayGroups(prev => ({ ...prev, [dv]: 'Peito' }));
    }
  };

  const count = Object.keys(dayGroups).length;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
      onClick={onClose}>
      <div onClick={e => e.stopPropagation()}
        style={{ background: 'white', borderRadius: '24px 24px 0 0', width: '100%', maxWidth: 620, padding: '28px 24px 40px', maxHeight: '92vh', overflowY: 'auto' }}>

        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28 }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 22, fontWeight: 900, color: '#111827' }}>Configurar Semana</h3>
            <p style={{ margin: '4px 0 0', fontSize: 14, color: '#9CA3AF' }}>Monte a divisão semanal em segundos</p>
          </div>
          <button onClick={onClose} style={{ width: 40, height: 40, borderRadius: '50%', background: '#F3F4F6', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={18} color="#6B7280" />
          </button>
        </div>

        {/* Frequência */}
        <p style={{ margin: '0 0 12px', fontSize: 12, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Frequência semanal</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 28 }}>
          {[3,4,5,6].map(f => (
            <button key={f} onClick={() => applyFreq(f)}
              style={{ padding: '16px 8px', borderRadius: 16, border: `2.5px solid ${freq === f ? '#3B82F6' : '#E5E7EB'}`, background: freq === f ? '#EFF6FF' : 'white', cursor: 'pointer', textAlign: 'center', transition: 'all 0.12s' }}>
              <p style={{ margin: 0, fontSize: 28, fontWeight: 900, color: freq === f ? '#3B82F6' : '#374151' }}>{f}x</p>
              <p style={{ margin: '2px 0 0', fontSize: 12, color: freq === f ? '#3B82F6' : '#9CA3AF', fontWeight: 600 }}>por semana</p>
            </button>
          ))}
        </div>

        {/* Dias */}
        <p style={{ margin: '0 0 12px', fontSize: 12, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Dias e grupos musculares</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 28 }}>
          {DAYS.map(d => {
            const on = dayGroups[d.value] !== undefined;
            const grp = dayGroups[d.value];
            const gc = grp ? (GROUP_COLORS[grp] || '#3B82F6') : '#E5E7EB';
            return (
              <div key={d.value}
                style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', borderRadius: 14, border: `2px solid ${on ? gc + '50' : '#F1F5F9'}`, background: on ? gc + '08' : '#F9FAFB', transition: 'all 0.12s', cursor: 'pointer' }}
                onClick={() => toggleDay(d.value)}>
                <div style={{ width: 28, height: 28, borderRadius: 8, border: `2.5px solid ${on ? gc : '#D1D5DB'}`, background: on ? gc : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.15s' }}>
                  {on && <Check size={15} color="white" strokeWidth={3} />}
                </div>
                <span style={{ width: 100, fontSize: 15, fontWeight: 700, color: on ? '#111827' : '#9CA3AF' }}>{d.full}</span>
                {on ? (
                  <select value={grp} onChange={e => { e.stopPropagation(); setDayGroups(prev => ({ ...prev, [d.value]: e.target.value })); }}
                    onClick={e => e.stopPropagation()}
                    style={{ flex: 1, fontSize: 15, fontWeight: 700, color: gc, border: 'none', background: 'transparent', outline: 'none', cursor: 'pointer', boxShadow: 'none', padding: 0 }}>
                    {GROUPS.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                ) : (
                  <span style={{ flex: 1, fontSize: 14, color: '#C4C4C4' }}>Descanso</span>
                )}
              </div>
            );
          })}
        </div>

        <div style={{ background: '#F0FDF4', borderRadius: 12, padding: '14px 16px', marginBottom: 20, display: 'flex', gap: 10, alignItems: 'center' }}>
          <Check size={18} color="#10B981" style={{ flexShrink: 0 }} />
          <p style={{ margin: 0, fontSize: 14, color: '#065F46', lineHeight: 1.5 }}>
            <strong>{count} dias de treino</strong> serão criados. Você adiciona os exercícios depois, dia por dia.
          </p>
        </div>

        <button onClick={async () => { setSaving(true); await onConfirm(dayGroups); setSaving(false); onClose(); }}
          disabled={saving || count === 0}
          style={{ width: '100%', padding: '18px', background: 'linear-gradient(135deg, #3B82F6, #8B5CF6)', color: 'white', border: 'none', borderRadius: 14, cursor: count === 0 ? 'not-allowed' : 'pointer', fontSize: 17, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: count === 0 ? 0.5 : 1 }}>
          {saving ? <Loader size={20} style={{ animation: 'spin 1s linear infinite' }} /> : <Check size={20} />}
          {saving ? 'Configurando...' : `Criar ${count} dias de treino`}
        </button>
      </div>
    </div>
  );
}

/* ─── Componente principal ─────────────────────────────────────────── */
export default function Treinos() {
  const { user } = useAuth();
  const [plans, setPlans] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [studentId, setStudentId] = useState('');
  const [day, setDay] = useState(null);
  const [group, setGroup] = useState('Peito');
  const [exercises, setExercises] = useState([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [configModal, setConfigModal] = useState(false);

  useEffect(() => {
    if (!user) return;
    if (hasSupabase) {
      Promise.all([
        supabase.from('training_plans').select('*, exercises(*)').eq('personal_id', user.id),
        supabase.from('students').select('id, name, initials, color').eq('personal_id', user.id).eq('status', 'ativo'),
      ]).then(([{ data: p }, { data: s }]) => {
        setPlans(p || []);
        setStudents(s || []);
        setLoading(false);
      });
    } else {
      setPlans(mockPlans);
      setStudents(mockStudents);
      setLoading(false);
    }
  }, [user?.id]);

  const myPlans = plans.filter(p => String(p.student_id || p.studentId) === String(studentId));
  const planForDay = (d) => myPlans.find(p => (p.days || []).includes(d));

  const newExercise = () => ({ name: '', sets: 4, reps: '10', rest: '60s', load: '', videoUrl: '', obs: '' });

  const openDay = (d) => {
    setDay(d); setSaved(false);
    const plan = planForDay(d);
    if (plan) {
      setGroup(plan.name || 'Peito');
      setExercises((plan.exercises || [])
        .sort((a, b) => (a.order_index || 0) - (b.order_index || 0))
        .map(ex => ({ name: ex.name, sets: ex.sets || 4, reps: ex.reps || '10', rest: ex.rest || '60s', load: ex.load || '', videoUrl: ex.video_url || '', obs: ex.obs || '' }))
      );
    } else {
      setGroup('Peito');
      setExercises([newExercise()]);
    }
  };

  const updateEx = (idx, field, val) => setExercises(prev => prev.map((e, i) => i === idx ? { ...e, [field]: val } : e));
  const deleteEx = (idx) => setExercises(prev => prev.filter((_, i) => i !== idx));
  const moveEx = (idx, dir) => {
    setExercises(prev => {
      const arr = [...prev]; const swap = idx + dir;
      if (swap < 0 || swap >= arr.length) return arr;
      [arr[idx], arr[swap]] = [arr[swap], arr[idx]];
      return arr;
    });
  };
  const addEx = () => setExercises(prev => [...prev, newExercise()]);

  const savePlan = async () => {
    if (!studentId || day === null) return;
    setSaving(true);
    const student = students.find(s => String(s.id) === String(studentId));
    const validEx = exercises.filter(e => e.name?.trim());
    const existing = planForDay(day);
    if (hasSupabase) {
      const exRows = (id) => validEx.map((e, i) => ({ plan_id: id, name: e.name, sets: parseInt(e.sets)||4, reps: e.reps, load: e.load||'', rest: e.rest, video_url: e.videoUrl||'', obs: e.obs||'', order_index: i }));
      if (existing) {
        await supabase.from('training_plans').update({ name: group, type: 'Hipertrofia' }).eq('id', existing.id);
        await supabase.from('exercises').delete().eq('plan_id', existing.id);
        if (validEx.length) await supabase.from('exercises').insert(exRows(existing.id));
        const { data: u } = await supabase.from('training_plans').select('*, exercises(*)').eq('id', existing.id).single();
        if (u) setPlans(prev => prev.map(p => p.id === existing.id ? u : p));
      } else {
        const { data: plan } = await supabase.from('training_plans').insert({ personal_id: user.id, student_id: student?.id, student_name: student?.name, name: group, type: 'Hipertrofia', days: [day] }).select().single();
        if (plan) {
          if (validEx.length) await supabase.from('exercises').insert(exRows(plan.id));
          const { data: full } = await supabase.from('training_plans').select('*, exercises(*)').eq('id', plan.id).single();
          if (full) setPlans(prev => [full, ...prev]);
        }
      }
    } else {
      if (existing) setPlans(prev => prev.map(p => p.id === existing.id ? { ...p, name: group, exercises: validEx } : p));
      else setPlans(prev => [{ id: Date.now(), student_id: studentId, student_name: student?.name, name: group, type: 'Hipertrofia', days: [day], exercises: validEx, created_at: new Date().toISOString() }, ...prev]);
    }
    setSaving(false); setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const deleteDay = async () => {
    const existing = planForDay(day);
    if (!existing) { setDay(null); return; }
    if (hasSupabase) await supabase.from('training_plans').delete().eq('id', existing.id);
    setPlans(prev => prev.filter(p => p.id !== existing.id));
    setDay(null);
  };

  const handleConfigWeek = async (dayGroups) => {
    const student = students.find(s => String(s.id) === String(studentId));
    if (!student) return;
    const newPlansLocal = [];
    for (const [dayVal, grpName] of Object.entries(dayGroups)) {
      const dv = parseInt(dayVal);
      const existing = myPlans.find(p => (p.days || []).includes(dv));
      if (hasSupabase) {
        if (existing) {
          await supabase.from('training_plans').update({ name: grpName, type: 'Hipertrofia' }).eq('id', existing.id);
          const { data: u } = await supabase.from('training_plans').select('*, exercises(*)').eq('id', existing.id).single();
          if (u) newPlansLocal.push({ type: 'update', plan: u });
        } else {
          const { data: plan } = await supabase.from('training_plans').insert({ personal_id: user.id, student_id: student.id, student_name: student.name, name: grpName, type: 'Hipertrofia', days: [dv] }).select().single();
          if (plan) {
            const { data: full } = await supabase.from('training_plans').select('*, exercises(*)').eq('id', plan.id).single();
            if (full) newPlansLocal.push({ type: 'insert', plan: full });
          }
        }
      } else {
        newPlansLocal.push({ type: 'insert', plan: { id: Date.now() + dv, student_id: studentId, student_name: student.name, name: grpName, type: 'Hipertrofia', days: [dv], exercises: [], created_at: new Date().toISOString() } });
      }
    }
    setPlans(prev => {
      let arr = [...prev];
      for (const { type, plan } of newPlansLocal) {
        if (type === 'update') arr = arr.map(p => p.id === plan.id ? plan : p);
        else arr = [...arr, plan];
      }
      return arr;
    });
  };

  const gc = GROUP_COLORS[group] || '#3B82F6';
  const dayInfo = DAYS.find(d => d.value === day);
  const selectedStudent = students.find(s => String(s.id) === studentId);

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300, flex: 1 }}>
      <Loader size={28} color="#3B82F6" style={{ animation: 'spin 1s linear infinite' }} />
      <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  return (
    <div className="page-padding" style={{ flex: 1 }}>
      {/* Page header */}
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ margin: 0, fontSize: 24, fontWeight: 900, color: '#111827' }}>Treinos</h2>
        <p style={{ margin: '4px 0 0', fontSize: 14, color: '#9CA3AF' }}>Monte o treino semanal de cada aluno</p>
      </div>

      {/* Seleção de aluno */}
      <div style={{ background: 'white', borderRadius: 16, padding: '20px 22px', marginBottom: 16, border: '1px solid #F1F5F9', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
        <p style={{ margin: '0 0 14px', fontSize: 12, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Aluno</p>
        {students.length === 0 ? (
          <p style={{ fontSize: 14, color: '#9CA3AF', margin: 0 }}>Nenhum aluno ativo. Cadastre primeiro na página Alunos.</p>
        ) : (
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {students.map(s => {
              const active = String(s.id) === studentId;
              return (
                <button key={s.id} onClick={() => { setStudentId(String(s.id)); setDay(null); }}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 18px', borderRadius: 40, border: `2.5px solid ${active ? '#3B82F6' : '#E5E7EB'}`, background: active ? '#EFF6FF' : 'white', cursor: 'pointer', transition: 'all 0.12s', minHeight: 50 }}>
                  <div style={{ width: 34, height: 34, borderRadius: '50%', background: s.color || '#6B7280', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, color: 'white', flexShrink: 0 }}>
                    {s.initials || s.name?.slice(0,2).toUpperCase()}
                  </div>
                  <span style={{ fontSize: 15, fontWeight: 700, color: active ? '#1D4ED8' : '#374151' }}>{s.name.split(' ')[0]}</span>
                  {active && <Check size={16} color="#3B82F6" />}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {studentId && (
        <>
          {/* Semana */}
          <div style={{ background: 'white', borderRadius: 16, padding: '20px 22px', marginBottom: 16, border: '1px solid #F1F5F9', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, gap: 12, flexWrap: 'wrap' }}>
              <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Semana de Treinos</p>
              <button onClick={() => setConfigModal(true)}
                style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 18px', borderRadius: 22, background: 'linear-gradient(135deg, #3B82F6, #8B5CF6)', color: 'white', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700, minHeight: 42 }}>
                Configurar semana
              </button>
            </div>
            <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 4 }}>
              {DAYS.map(d => {
                const plan = planForDay(d.value);
                const isActive = day === d.value;
                const gc2 = plan ? (GROUP_COLORS[plan.name] || '#6B7280') : null;
                return (
                  <button key={d.value} onClick={() => openDay(d.value)}
                    style={{ flex: '0 0 auto', minWidth: 84, padding: '14px 8px', borderRadius: 16, border: `2.5px solid ${isActive ? '#3B82F6' : plan ? gc2 + '60' : '#E5E7EB'}`, background: isActive ? '#EFF6FF' : plan ? gc2 + '0F' : '#F9FAFB', cursor: 'pointer', textAlign: 'center', transition: 'all 0.12s', boxShadow: isActive ? '0 0 0 4px rgba(59,130,246,0.15)' : 'none' }}>
                    <p style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 800, color: isActive ? '#3B82F6' : '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{d.label}</p>
                    {plan ? (
                      <>
                        <p style={{ margin: 0, fontSize: 12, fontWeight: 800, color: gc2, lineHeight: 1.3 }}>{plan.name}</p>
                        <p style={{ margin: '3px 0 0', fontSize: 11, color: '#9CA3AF' }}>{(plan.exercises||[]).length} ex.</p>
                      </>
                    ) : (
                      <div style={{ width: 28, height: 28, borderRadius: 8, border: '2px dashed #D1D5DB', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto' }}>
                        <Plus size={13} color="#9CA3AF" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Editor do dia */}
          {day !== null && (
            <div style={{ background: 'white', borderRadius: 16, border: '1px solid #F1F5F9', boxShadow: '0 1px 4px rgba(0,0,0,0.05)', overflow: 'hidden' }}>

              {/* Header */}
              <div style={{ padding: '18px 22px', borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', gap: 12, background: gc + '08', flexWrap: 'wrap' }}>
                <button onClick={() => setDay(null)} style={{ width: 38, height: 38, borderRadius: '50%', background: 'white', border: '1.5px solid #E5E7EB', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <X size={17} color="#6B7280" />
                </button>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: 12, color: '#9CA3AF', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{dayInfo?.full}</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2, flexWrap: 'wrap' }}>
                    {GROUPS.map(g => (
                      <button key={g} onClick={() => setGroup(g)}
                        style={{ padding: '4px 12px', borderRadius: 20, border: `2px solid ${group === g ? (GROUP_COLORS[g]||'#3B82F6') : 'transparent'}`, background: group === g ? (GROUP_COLORS[g]||'#3B82F6') : 'transparent', color: group === g ? 'white' : '#9CA3AF', fontSize: 12, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                        {g}
                      </button>
                    ))}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                  {planForDay(day) && (
                    <button onClick={deleteDay} style={{ width: 38, height: 38, borderRadius: '50%', background: '#FEF2F2', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Trash2 size={16} color="#EF4444" />
                    </button>
                  )}
                  <button onClick={savePlan} disabled={saving}
                    style={{ padding: '0 22px', height: 44, background: saved ? '#10B981' : gc, color: 'white', border: 'none', borderRadius: 12, cursor: 'pointer', fontWeight: 700, fontSize: 15, display: 'flex', alignItems: 'center', gap: 7, opacity: saving ? 0.7 : 1, transition: 'background 0.2s' }}>
                    {saving ? <Loader size={16} style={{ animation: 'spin 1s linear infinite' }} /> : saved ? <Check size={16} /> : <Save size={16} />}
                    {saving ? 'Salvando...' : saved ? 'Salvo!' : 'Salvar treino'}
                  </button>
                </div>
              </div>

              {/* Lista de exercícios */}
              <div style={{ padding: '22px 22px 8px' }}>
                {exercises.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '32px 0', color: '#9CA3AF' }}>
                    <Dumbbell size={36} color="#E5E7EB" style={{ marginBottom: 10 }} />
                    <p style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>Nenhum exercício ainda</p>
                    <p style={{ margin: '4px 0 0', fontSize: 13 }}>Clique em "+ Adicionar exercício" abaixo</p>
                  </div>
                ) : (
                  exercises.map((ex, i) => (
                    <ExerciseCard
                      key={i}
                      ex={ex}
                      index={i}
                      total={exercises.length}
                      onUpdate={(field, val) => updateEx(i, field, val)}
                      onDelete={() => deleteEx(i)}
                      onMove={moveEx}
                      accentColor={gc}
                      autoOpen={!ex.name}
                    />
                  ))
                )}
              </div>

              {/* Adicionar exercício */}
              <div style={{ padding: '0 22px 22px' }}>
                <button onClick={addEx}
                  style={{ width: '100%', padding: '16px', border: `2px dashed ${gc}60`, borderRadius: 14, background: gc + '06', color: gc, cursor: 'pointer', fontSize: 15, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'all 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.background = gc + '12'}
                  onMouseLeave={e => e.currentTarget.style.background = gc + '06'}>
                  <Plus size={18} /> Adicionar exercício
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {configModal && studentId && (
        <ConfigWeekModal onConfirm={handleConfigWeek} onClose={() => setConfigModal(false)} />
      )}

      <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}} input[type=number]::-webkit-inner-spin-button{-webkit-appearance:none} input[type=number]{-moz-appearance:textfield}`}</style>
    </div>
  );
}
