import { useState, useEffect, useRef, useMemo } from 'react';
import {
  Plus, Dumbbell, X, Save, Trash2, Sparkles, Check, Send,
  Search, Edit3, Users, BookOpen,
  Copy, AlertCircle, MessageSquare, Moon,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { supabase, hasSupabase } from '../../lib/supabase';
import { searchExercises, EXERCISE_LIBRARY } from '../../data/exerciseLibrary';
import { STARTER_TEMPLATES } from '../../data/starterTemplates';

// ─── Constantes ────────────────────────────────────────────────────────────────

const DAYS = [
  { v: 1, s: 'Seg', full: 'Segunda-feira' },
  { v: 2, s: 'Ter', full: 'Terça-feira'   },
  { v: 3, s: 'Qua', full: 'Quarta-feira'  },
  { v: 4, s: 'Qui', full: 'Quinta-feira'  },
  { v: 5, s: 'Sex', full: 'Sexta-feira'   },
  { v: 6, s: 'Sáb', full: 'Sábado'        },
  { v: 0, s: 'Dom', full: 'Domingo'       },
];

const PLAN_TYPES = ['Hipertrofia', 'Força', 'Resistência', 'Funcional', 'Cardio', 'Mobilidade', 'Emagrecimento'];
const GROUPS     = ['Peito', 'Costas', 'Pernas', 'Glúteos', 'Ombro', 'Braços', 'Abdômen', 'Full Body', 'Cardio'];

const TYPE_CLR = {
  Hipertrofia: '#8B5CF6', Força: '#EF4444', Resistência: '#3B82F6',
  Funcional: '#10B981', Cardio: '#F59E0B', Mobilidade: '#06B6D4', Emagrecimento: '#F97316',
};
const GROUP_CLR = {
  Peito: '#EF4444', Costas: '#3B82F6', Pernas: '#8B5CF6', Glúteos: '#EC4899',
  Ombro: '#F59E0B', Braços: '#10B981', Abdômen: '#06B6D4', 'Full Body': '#F97316', Cardio: '#6366F1',
};

const TYPE_DEFAULTS = {
  Hipertrofia:   { sets: '4', reps: '10-12', rest: '60s' },
  Força:         { sets: '5', reps: '5',     rest: '90s' },
  Resistência:   { sets: '3', reps: '15-20', rest: '45s' },
  Funcional:     { sets: '3', reps: '12',    rest: '60s' },
  Cardio:        { sets: '1', reps: '20min', rest: '30s' },
  Mobilidade:    { sets: '2', reps: '30s',   rest: '30s' },
  Emagrecimento: { sets: '3', reps: '15',    rest: '45s' },
};

const REPS_Q = ['6', '8', '10', '12', '15', '20', 'Falha'];
const REST_Q  = ['30s', '45s', '60s', '75s', '90s', '2min'];

// Presets de frequência semanal — elimina a decisão manual de "qual dia".
const DAY_PRESETS = [
  { label: '2x/sem', sub: 'Ter/Qui',     days: [2, 4] },
  { label: '3x/sem', sub: 'Seg/Qua/Sex', days: [1, 3, 5] },
  { label: '4x/sem', sub: 'Seg/Ter/Qui/Sex', days: [1, 2, 4, 5] },
  { label: '5x/sem', sub: 'Seg a Sex',   days: [1, 2, 3, 4, 5] },
  { label: '6x/sem', sub: 'Seg a Sáb',   days: [1, 2, 3, 4, 5, 6] },
  { label: 'Todo dia', sub: '7 dias',    days: [0, 1, 2, 3, 4, 5, 6] },
];
const AI_LEVELS = {
  Iniciante:     { sets: '3', reps: '12', rest: '60s', n: 5 },
  Intermediário: { sets: '4', reps: '10', rest: '75s', n: 6 },
  Avançado:      { sets: '4', reps: '8',  rest: '90s', n: 7 },
};

const tc  = (t) => TYPE_CLR[t]  || '#6B7280';
const gc  = (g) => GROUP_CLR[g] || '#6B7280';
const newEx = (i = 0, planType = 'Hipertrofia') => {
  const d = TYPE_DEFAULTS[planType] || TYPE_DEFAULTS.Hipertrofia;
  return { id: Date.now() + i, name: '', sets: d.sets, reps: d.reps, rest: d.rest, load: '', obs: '', order_index: i };
};

function genAI(groups, level) {
  const p = AI_LEVELS[level] || AI_LEVELS.Intermediário;
  const perG = Math.ceil(p.n / Math.max(groups.length, 1));
  const out = [];
  groups.forEach(g => {
    [...EXERCISE_LIBRARY].filter(e => e.group === g)
      .sort((a, b) => a.name.length - b.name.length)
      .slice(0, perG)
      .forEach(e => out.push({ id: Date.now() + out.length, name: e.name, sets: p.sets, reps: p.reps, rest: p.rest, load: '', obs: '', order_index: out.length }));
  });
  return out.slice(0, p.n);
}

// ─── DayPresetChips ───────────────────────────────────────────────────────────
// Substitui a escolha manual dia-a-dia por presets de frequência.

function DayPresetChips({ onApply, color = 'var(--accent)' }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
      {DAY_PRESETS.map(p => (
        <button key={p.label} type="button" onClick={() => onApply(p.days)}
          title={p.sub}
          style={{ padding: '6px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, border: `1.5px solid ${color}40`, background: `${color}12`, color, cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.12s' }}
          onMouseEnter={e => e.currentTarget.style.background = `${color}22`}
          onMouseLeave={e => e.currentTarget.style.background = `${color}12`}>
          {p.label}
        </button>
      ))}
    </div>
  );
}

// ─── Toast ────────────────────────────────────────────────────────────────────

function Toasts({ toasts, dismiss }) {
  if (!toasts.length) return null;
  return (
    <div style={{ position: 'fixed', top: 20, right: 20, zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 8, pointerEvents: 'none' }}>
      {toasts.map(t => (
        <div key={t.id} style={{
          display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px',
          borderRadius: 12, minWidth: 260, maxWidth: 360, pointerEvents: 'auto',
          background: t.type === 'error' ? '#FEF2F2' : t.type === 'info' ? '#EFF6FF' : '#F0FDF4',
          border: `1.5px solid ${t.type === 'error' ? '#FECACA' : t.type === 'info' ? '#BFDBFE' : '#BBF7D0'}`,
          boxShadow: '0 8px 24px rgba(0,0,0,0.14)',
        }}>
          <div style={{
            width: 28, height: 28, borderRadius: 8, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: t.type === 'error' ? '#FEE2E2' : t.type === 'info' ? '#DBEAFE' : '#DCFCE7',
          }}>
            {t.type === 'error'
              ? <AlertCircle size={15} color="#EF4444" />
              : <Check size={15} color={t.type === 'info' ? '#3B82F6' : '#10B981'} strokeWidth={3} />}
          </div>
          <span style={{ fontSize: 13, fontWeight: 600, color: t.type === 'error' ? '#DC2626' : t.type === 'info' ? '#1D4ED8' : '#065F46', flex: 1 }}>{t.msg}</span>
          <button onClick={() => dismiss(t.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray-400)', display: 'flex', padding: 2 }}><X size={13} /></button>
        </div>
      ))}
    </div>
  );
}

// ─── ExerciseCard (estilo Trainerize) ────────────────────────────────────────

function ExerciseCard({ ex, index, onChange, onDelete, onDuplicate }) {
  const [showSugg, setShowSugg] = useState(false);
  const [suggs,    setSuggs]    = useState([]);
  const [showObs,  setShowObs]  = useState(!!ex.obs);
  const [repsOpen, setRepsOpen] = useState(false);
  const [restOpen, setRestOpen] = useState(false);
  const setsRef = useRef(null);

  const detectedGroup = useMemo(() => {
    if (!ex.name) return null;
    const exact = EXERCISE_LIBRARY.find(e => e.name.toLowerCase() === ex.name.toLowerCase());
    if (exact) return exact.group;
    if (ex.name.length < 4) return null;
    return EXERCISE_LIBRARY.find(e => e.name.toLowerCase().includes(ex.name.toLowerCase()))?.group || null;
  }, [ex.name]);

  const barColor = detectedGroup ? gc(detectedGroup) : 'var(--border)';

  const handleName = (val) => {
    onChange({ ...ex, name: val });
    const s = searchExercises(val);
    setSuggs(s); setShowSugg(s.length > 0 && val.length > 1);
  };

  const pick = (s) => {
    onChange({ ...ex, name: s.name });
    setSuggs([]); setShowSugg(false);
    setTimeout(() => setsRef.current?.select(), 50);
  };

  const metricInput = {
    width: '100%', border: 'none', outline: 'none', textAlign: 'center',
    fontSize: 16, fontWeight: 800, color: 'var(--gray-900)',
    background: 'transparent', padding: '0 2px', boxSizing: 'border-box',
  };
  const metricLabel = { fontSize: 9, fontWeight: 700, color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginTop: 2 };

  return (
    <div style={{ borderRadius: 14, border: '1.5px solid var(--border)', background: 'var(--bg-surface)', marginBottom: 10, overflow: 'visible' }}>
      <div style={{ height: 4, background: barColor, borderRadius: '12px 12px 0 0', transition: 'background 0.2s' }} />

      <div style={{ padding: '10px 12px' }}>
        {/* Nome + grupo + ações */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <span style={{ width: 22, height: 22, borderRadius: '50%', background: 'var(--bg-page)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800, color: 'var(--gray-400)', flexShrink: 0 }}>
            {index + 1}
          </span>

          <div style={{ flex: 1, position: 'relative', minWidth: 0 }}>
            <input value={ex.name} onChange={e => handleName(e.target.value)}
              onBlur={() => setTimeout(() => setShowSugg(false), 150)}
              onKeyDown={e => { if (e.key === 'Enter' && suggs.length) { e.preventDefault(); pick(suggs[0]); } }}
              placeholder={`Exercício ${index + 1}...`}
              style={{ width: '100%', border: 'none', borderBottom: `2px solid ${ex.name ? barColor : 'var(--border)'}`, outline: 'none', fontSize: 14, fontWeight: ex.name ? 700 : 400, color: ex.name ? 'var(--gray-900)' : 'var(--gray-400)', background: 'transparent', padding: '2px 0', boxSizing: 'border-box', transition: 'border-color 0.2s' }} />
            {showSugg && (
              <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, background: 'var(--bg-surface)', border: '1.5px solid var(--border)', borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.14)', zIndex: 60, maxHeight: 200, overflowY: 'auto' }}>
                {suggs.slice(0, 8).map((s, i) => (
                  <button key={i} onMouseDown={() => pick(s)}
                    style={{ width: '100%', padding: '8px 12px', background: i === 0 ? 'var(--bg-page)' : 'none', border: 'none', cursor: 'pointer', textAlign: 'left', fontSize: 13, display: 'flex', gap: 8, alignItems: 'center', borderBottom: '1px solid var(--border-light)' }}>
                    <span style={{ fontSize: 10, background: gc(s.group) + '20', color: gc(s.group), padding: '2px 6px', borderRadius: 20, fontWeight: 700, flexShrink: 0 }}>{s.group}</span>
                    <span style={{ flex: 1, color: 'var(--gray-900)', fontWeight: 600 }}>{s.name}</span>
                    {i === 0 && <span style={{ fontSize: 10, color: 'var(--gray-400)' }}>↵</span>}
                  </button>
                ))}
              </div>
            )}
          </div>

          {detectedGroup && (
            <span style={{ fontSize: 10, fontWeight: 700, color: gc(detectedGroup), background: gc(detectedGroup) + '18', padding: '3px 8px', borderRadius: 20, flexShrink: 0, whiteSpace: 'nowrap' }}>
              {detectedGroup}
            </span>
          )}

          <button onClick={onDuplicate} title="Duplicar"
            style={{ padding: 5, border: 'none', background: 'none', cursor: 'pointer', color: 'var(--gray-400)', borderRadius: 6, display: 'flex', flexShrink: 0, transition: 'color 0.1s, background 0.1s' }}
            onMouseEnter={e => { e.currentTarget.style.color = '#3B82F6'; e.currentTarget.style.background = 'var(--bg-page)'; }}
            onMouseLeave={e => { e.currentTarget.style.color = 'var(--gray-400)'; e.currentTarget.style.background = 'none'; }}>
            <Copy size={13} />
          </button>
          <button onClick={onDelete} title="Remover"
            style={{ padding: 5, border: 'none', background: 'none', cursor: 'pointer', color: 'var(--gray-400)', borderRadius: 6, display: 'flex', flexShrink: 0, transition: 'color 0.1s, background 0.1s' }}
            onMouseEnter={e => { e.currentTarget.style.color = '#EF4444'; e.currentTarget.style.background = '#FEF2F2'; }}
            onMouseLeave={e => { e.currentTarget.style.color = 'var(--gray-400)'; e.currentTarget.style.background = 'none'; }}>
            <Trash2 size={13} />
          </button>
        </div>

        {/* 4 caixas de métricas */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
          <div style={{ background: 'var(--bg-page)', borderRadius: 10, padding: '8px 4px 6px', textAlign: 'center' }}>
            <input ref={setsRef} type="number" value={ex.sets} min={1} max={10}
              onChange={e => onChange({ ...ex, sets: e.target.value })}
              style={metricInput} />
            <span style={metricLabel}>Séries</span>
          </div>

          <div style={{ position: 'relative', background: 'var(--bg-page)', borderRadius: 10, padding: '8px 4px 6px', textAlign: 'center' }}>
            <input value={ex.reps} onChange={e => onChange({ ...ex, reps: e.target.value })}
              onFocus={() => setRepsOpen(true)} onBlur={() => setTimeout(() => setRepsOpen(false), 150)}
              style={metricInput} />
            <span style={metricLabel}>Reps</span>
            {repsOpen && (
              <div style={{ position: 'absolute', top: 'calc(100% + 6px)', left: '50%', transform: 'translateX(-50%)', background: 'var(--bg-surface)', border: '1.5px solid var(--border)', borderRadius: 10, boxShadow: '0 8px 20px rgba(0,0,0,0.14)', zIndex: 70, display: 'flex', flexWrap: 'wrap', gap: 4, padding: 8, width: 180 }}>
                {REPS_Q.map(r => (
                  <button key={r} onMouseDown={() => { onChange({ ...ex, reps: r }); setRepsOpen(false); }}
                    style={{ padding: '5px 10px', borderRadius: 16, fontSize: 11, fontWeight: 700, border: 'none', cursor: 'pointer', background: ex.reps === r ? 'var(--accent-bg)' : 'var(--bg-page)', color: ex.reps === r ? 'var(--accent)' : 'var(--gray-500)' }}>
                    {r}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div style={{ position: 'relative', background: 'var(--bg-page)', borderRadius: 10, padding: '8px 4px 6px', textAlign: 'center' }}>
            <input value={ex.rest} onChange={e => onChange({ ...ex, rest: e.target.value })}
              onFocus={() => setRestOpen(true)} onBlur={() => setTimeout(() => setRestOpen(false), 150)}
              style={{ ...metricInput, color: '#10B981' }} />
            <span style={metricLabel}>Desc.</span>
            {restOpen && (
              <div style={{ position: 'absolute', top: 'calc(100% + 6px)', left: '50%', transform: 'translateX(-50%)', background: 'var(--bg-surface)', border: '1.5px solid var(--border)', borderRadius: 10, boxShadow: '0 8px 20px rgba(0,0,0,0.14)', zIndex: 70, display: 'flex', flexWrap: 'wrap', gap: 4, padding: 8, width: 200 }}>
                {REST_Q.map(r => (
                  <button key={r} onMouseDown={() => { onChange({ ...ex, rest: r }); setRestOpen(false); }}
                    style={{ padding: '5px 10px', borderRadius: 16, fontSize: 11, fontWeight: 700, border: 'none', cursor: 'pointer', background: ex.rest === r ? 'rgba(16,185,129,0.12)' : 'var(--bg-page)', color: ex.rest === r ? '#10B981' : 'var(--gray-500)' }}>
                    {r}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div style={{ background: 'var(--bg-page)', borderRadius: 10, padding: '8px 4px 6px', textAlign: 'center' }}>
            <input value={ex.load} onChange={e => onChange({ ...ex, load: e.target.value })}
              placeholder="—" style={{ ...metricInput, color: 'var(--gray-700)', fontSize: 15 }} />
            <span style={metricLabel}>Carga</span>
          </div>
        </div>

        {/* Observação */}
        <div style={{ marginTop: 8 }}>
          <button onClick={() => setShowObs(v => !v)}
            style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 8px', borderRadius: 20, border: 'none', background: (showObs || ex.obs) ? '#FEF3C7' : 'var(--bg-page)', color: (showObs || ex.obs) ? '#92400E' : 'var(--gray-400)', fontSize: 10, fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s' }}>
            <MessageSquare size={10} />
            {showObs ? 'Obs.' : ex.obs ? 'Ver obs.' : '+ Obs.'}
          </button>
          {showObs && (
            <input value={ex.obs} onChange={e => onChange({ ...ex, obs: e.target.value })}
              autoFocus={!ex.obs} placeholder="Observação do exercício..."
              style={{ width: '100%', border: 'none', borderBottom: '1.5px solid #FDE68A', outline: 'none', fontSize: 12, color: '#92400E', padding: '5px 0', background: 'transparent', boxSizing: 'border-box', marginTop: 6 }} />
          )}
        </div>
      </div>
    </div>
  );
}

// ─── AIModal ──────────────────────────────────────────────────────────────────

function AIModal({ onApply, onClose, zIndex = 400 }) {
  const [groups, setGroups] = useState([]);
  const [level,  setLevel]  = useState('Intermediário');
  const toggle = (g) => setGroups(p => p.includes(g) ? p.filter(x => x !== g) : [...p, g]);

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'var(--bg-surface)', borderRadius: 20, padding: 28, width: '100%', maxWidth: 420 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: 'linear-gradient(135deg, #8B5CF6, #3B82F6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Sparkles size={20} color="white" />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: 'var(--gray-900)' }}>Sugestão com IA</h3>
            <p style={{ margin: 0, fontSize: 12, color: 'var(--gray-500)' }}>Gera exercícios pelo objetivo</p>
          </div>
          <button onClick={onClose} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray-400)' }}><X size={18} /></button>
        </div>
        <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--gray-700)', display: 'block', marginBottom: 8 }}>Grupos musculares</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 18 }}>
          {GROUPS.map(g => { const sel = groups.includes(g); const c = gc(g); return (
            <button key={g} onClick={() => toggle(g)}
              style={{ padding: '6px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700, cursor: 'pointer', border: `2px solid ${sel ? c : 'var(--border)'}`, background: sel ? c + '18' : 'var(--bg-page)', color: sel ? c : 'var(--gray-500)' }}>
              {g}
            </button>
          ); })}
        </div>
        <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--gray-700)', display: 'block', marginBottom: 8 }}>Nível</label>
        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          {Object.keys(AI_LEVELS).map(l => (
            <button key={l} onClick={() => setLevel(l)}
              style={{ flex: 1, padding: '10px 8px', borderRadius: 10, fontSize: 12, fontWeight: 700, cursor: 'pointer', border: `2px solid ${level === l ? '#8B5CF6' : 'var(--border)'}`, background: level === l ? '#F5F3FF' : 'var(--bg-page)', color: level === l ? '#7C3AED' : 'var(--gray-500)' }}>
              {l}
            </button>
          ))}
        </div>
        {groups.length > 0 && (
          <div style={{ background: '#F5F3FF', borderRadius: 10, padding: '10px 14px', marginBottom: 16, fontSize: 12, color: '#7C3AED' }}>
            Vai gerar <strong>{AI_LEVELS[level]?.n} exercícios</strong> · {groups.join(' + ')} · {level}
          </div>
        )}
        <button onClick={() => { if (!groups.length) return; onApply(genAI(groups, level)); onClose(); }} disabled={!groups.length}
          style={{ width: '100%', padding: '13px', borderRadius: 12, border: 'none', background: groups.length ? 'linear-gradient(135deg, #8B5CF6, #3B82F6)' : 'var(--border)', color: groups.length ? 'white' : 'var(--gray-400)', fontSize: 14, fontWeight: 700, cursor: groups.length ? 'pointer' : 'not-allowed' }}>
          <Sparkles size={14} style={{ marginRight: 8, verticalAlign: 'middle' }} />Gerar exercícios
        </button>
      </div>
    </div>
  );
}

// ─── TemplateEditor ───────────────────────────────────────────────────────────

function TemplateEditor({ item, mode = 'template', studentId, studentName, defaultDays, students = [], onSave, onClose, zIndex = 300 }) {
  const isNew   = !item?.id;
  const [name,        setName]        = useState(item?.name  || '');
  const [type,        setType]        = useState(item?.type  || 'Hipertrofia');
  const [days,        setDays]        = useState(item?.days  || defaultDays || []);
  const [exs,         setExs]         = useState(() => {
    const src    = item?.exercises || [];
    const sorted = [...src].sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));
    return sorted.length ? sorted.map((e, i) => ({ ...e, id: e.id || Date.now() + i })) : [newEx(0, item?.type || 'Hipertrofia')];
  });
  const [saving,      setSaving]      = useState(false);
  const [showAI,      setShowAI]      = useState(false);
  // Atribuição inline — só aparece no modo template
  const [assignStu,   setAssignStu]   = useState(null); // studentId | null
  const [assignWeek,  setAssignWeek]  = useState(() => {
    const w = {};
    DAYS.forEach(d => { w[d.v] = 'empty'; }); // 'empty' | 'plan' | 'rest'
    return w;
  });
  const exsListRef = useRef(null);

  const toggleDay = (d)      => setDays(p => p.includes(d) ? p.filter(x => x !== d) : [...p, d]);
  const updateEx  = (i, upd) => setExs(p => p.map((e, j) => j === i ? upd : e));
  const deleteEx  = (i)      => setExs(p => p.filter((_, j) => j !== i));
  const dupEx     = (i)      => setExs(p => {
    const c = [...p];
    c.splice(i + 1, 0, { ...p[i], id: Date.now(), load: '', obs: '' });
    return c;
  });
  const addEx = () => setExs(p => [...p, newEx(p.length, type)]);

  const cycleDay = (dv) => setAssignWeek(prev => ({
    ...prev,
    [dv]: prev[dv] === 'empty' ? 'plan' : prev[dv] === 'plan' ? 'rest' : 'empty',
  }));
  const clearAssignWeek = () => setAssignWeek(prev => { const w = {}; DAYS.forEach(d => { w[d.v] = 'empty'; }); return w; });
  const applyAssignPreset = (presetDays) => {
    const w = {};
    DAYS.forEach(d => { w[d.v] = presetDays.includes(d.v) ? 'plan' : 'empty'; });
    setAssignWeek(w);
  };

  const planDays  = Object.entries(assignWeek).filter(([, s]) => s === 'plan').map(([d]) => parseInt(d));
  const assignSet = assignStu && planDays.length > 0;

  const totalSeries = exs.filter(e => e.name).reduce((acc, e) => acc + (parseInt(e.sets) || 0), 0);

  const handleSave = async () => {
    if (!name.trim() || saving) return;
    const valid = exs.filter(e => e.name?.trim());
    if (!valid.length) return;
    setSaving(true);
    const ok = await onSave({
      id: item?.id, name: name.trim(), type, days, exercises: valid,
      studentId: mode === 'plan' ? studentId : null,
      assignStudents: assignSet ? [assignStu] : [],
      assignDays: planDays,
    });
    if (ok === false) setSaving(false);
  };

  const title = mode === 'template'
    ? (isNew ? 'Nova cartilha' : 'Editar cartilha')
    : (isNew ? `Novo treino — ${studentName}` : `Editar treino — ${studentName}`);

  const color = tc(type);

  const saveLabel = saving
    ? 'Salvando...'
    : assignSet
      ? `Criar e atribuir · ${planDays.length} dia${planDays.length !== 1 ? 's' : ''}`
      : isNew ? (mode === 'template' ? 'Criar cartilha' : 'Salvar treino') : 'Salvar alterações';

  return (
    <>
      <div style={{ position: 'fixed', inset: 0, zIndex, background: 'var(--bg-page)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Header */}
        <div style={{ padding: '14px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0, background: 'var(--bg-surface)' }}>
          <button onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray-500)', display: 'flex', padding: 7, borderRadius: 8, flexShrink: 0 }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-page)'}
            onMouseLeave={e => e.currentTarget.style.background = 'none'}>
            <X size={20} />
          </button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: 'var(--gray-900)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</h2>
            {exs.filter(e => e.name).length > 0 && (
              <p style={{ margin: 0, fontSize: 12, color: 'var(--gray-400)' }}>
                {exs.filter(e => e.name).length} exercício{exs.filter(e => e.name).length !== 1 ? 's' : ''}{totalSeries > 0 ? ` · ${totalSeries} séries` : ''}
              </p>
            )}
          </div>
          <button onClick={() => setShowAI(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg, #8B5CF6, #3B82F6)', color: 'white', fontSize: 12, fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}>
            <Sparkles size={13} /> IA
          </button>
          <button onClick={handleSave} disabled={!name.trim() || saving}
            style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '10px 20px', borderRadius: 11, border: 'none', background: name.trim() ? (assignSet ? 'var(--accent)' : `linear-gradient(135deg, ${color}, ${color}cc)`) : '#E5E7EB', color: name.trim() ? 'white' : '#9CA3AF', fontSize: 14, fontWeight: 700, cursor: name.trim() ? 'pointer' : 'not-allowed', flexShrink: 0, boxShadow: name.trim() ? `0 4px 14px ${color}40` : 'none', transition: 'all 0.15s' }}>
            <Save size={15} />{saveLabel}
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
          <div style={{ maxWidth: 760, margin: '0 auto' }}>

            {/* Meta */}
            <div style={{ background: 'var(--bg-surface)', borderRadius: 16, padding: 20, marginBottom: 20, border: '1.5px solid var(--border)' }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--gray-400)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Nome</label>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="ex: Treino A — Peito e Tríceps"
                style={{ width: '100%', padding: '11px 14px', border: '1.5px solid var(--border)', borderRadius: 10, fontSize: 16, fontWeight: 700, boxSizing: 'border-box', outline: 'none', marginBottom: 18, background: 'var(--bg-page)', color: 'var(--gray-900)' }} />

              <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--gray-400)', display: 'block', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Tipo</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: mode === 'plan' ? 18 : 0 }}>
                {PLAN_TYPES.map(t => { const c = tc(t); const sel = type === t; return (
                  <button key={t} onClick={() => setType(t)}
                    style={{ padding: '7px 14px', borderRadius: 20, fontSize: 12, fontWeight: 700, cursor: 'pointer', border: `2px solid ${sel ? c : 'var(--border)'}`, background: sel ? c + '18' : 'var(--bg-page)', color: sel ? c : 'var(--gray-500)', transition: 'all 0.15s' }}>
                    {t}
                  </button>
                ); })}
              </div>

              {mode === 'plan' && (
                <>
                  <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--gray-400)', display: 'block', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Frequência</label>
                  <div style={{ marginBottom: 10 }}>
                    <DayPresetChips color={color} onApply={setDays} />
                  </div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--gray-400)', display: 'block', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Ou escolha os dias manualmente</label>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {DAYS.map(d => { const sel = days.includes(d.v); return (
                      <button key={d.v} onClick={() => toggleDay(d.v)}
                        style={{ flex: 1, padding: '9px 4px', borderRadius: 9, fontSize: 11, fontWeight: 700, cursor: 'pointer', border: `2px solid ${sel ? color : 'var(--border)'}`, background: sel ? color + '18' : 'var(--bg-page)', color: sel ? color : 'var(--gray-400)', transition: 'all 0.15s' }}>
                        {d.s}
                      </button>
                    ); })}
                  </div>
                  {days.length === 0 && (
                    <p style={{ margin: '8px 0 0', fontSize: 12, color: '#F59E0B', fontWeight: 600 }}>⚠ Selecione pelo menos 1 dia</p>
                  )}
                </>
              )}
            </div>

            {/* Exercícios */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <h3 style={{ margin: 0, fontSize: 11, fontWeight: 800, color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Exercícios ({exs.filter(e => e.name).length})
                </h3>
                {totalSeries > 0 && (
                  <span style={{ fontSize: 11, color: 'var(--gray-500)', background: 'var(--bg-surface)', padding: '3px 10px', borderRadius: 20, fontWeight: 600, border: '1.5px solid var(--border)' }}>
                    {totalSeries} séries totais
                  </span>
                )}
              </div>

              <div ref={exsListRef}>
                {exs.map((ex, i) => (
                  <ExerciseCard key={ex.id || i} ex={ex} index={i}
                    onChange={upd => updateEx(i, upd)}
                    onDelete={() => deleteEx(i)}
                    onDuplicate={() => dupEx(i)} />
                ))}
              </div>

              <button onClick={addEx}
                style={{ width: '100%', padding: 12, borderRadius: 12, border: '2px dashed var(--border)', background: 'none', fontSize: 13, fontWeight: 700, color: 'var(--gray-400)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, transition: 'border-color 0.15s, color 0.15s' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--accent)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--gray-400)'; }}>
                <Plus size={15} /> Adicionar exercício
              </button>
            </div>

            {/* ── Atribuir inline (só em modo template) ─────────────────────── */}
            {mode === 'template' && students.length > 0 && (
              <div style={{ background: 'var(--bg-surface)', borderRadius: 16, padding: 20, border: '1.5px solid var(--border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 10, background: 'linear-gradient(135deg, #EFF6FF, #E0E7FF)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Users size={15} color="#3B82F6" />
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: 'var(--gray-900)' }}>Atribuir para a semana</p>
                    <p style={{ margin: 0, fontSize: 11, color: 'var(--gray-400)' }}>Opcional — monte os dias direto ao criar</p>
                  </div>
                </div>

                {/* Seletor de aluno */}
                <div style={{ display: 'flex', gap: 6, overflowX: 'auto', marginBottom: 14, paddingBottom: 2 }}>
                  {students.map(s => {
                    const sel = assignStu === s.id;
                    return (
                      <button key={s.id}
                        onClick={() => { setAssignStu(sel ? null : s.id); if (!sel) clearAssignWeek(); }}
                        style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px 6px 7px', borderRadius: 40, border: `2px solid ${sel ? '#3B82F6' : 'var(--border)'}`, background: sel ? '#EFF6FF' : 'var(--bg-page)', cursor: 'pointer', flexShrink: 0, transition: 'all 0.15s', boxShadow: sel ? '0 3px 10px rgba(59,130,246,0.18)' : 'none' }}>
                        <div style={{ width: 22, height: 22, borderRadius: '50%', background: s.color || '#CBD5E1', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <span style={{ fontSize: 9, fontWeight: 800, color: 'white' }}>{s.initials || s.name?.[0]}</span>
                        </div>
                        <span style={{ fontSize: 12, fontWeight: sel ? 700 : 500, color: sel ? '#1D4ED8' : 'var(--gray-700)', whiteSpace: 'nowrap' }}>{s.name}</span>
                        {sel && <Check size={12} color="#3B82F6" strokeWidth={3} />}
                      </button>
                    );
                  })}
                </div>

                {/* Grade 7 dias */}
                {assignStu ? (
                  <>
                    <div style={{ marginBottom: 10 }}>
                      <DayPresetChips color={color} onApply={applyAssignPreset} />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6, marginBottom: 8 }}>
                      {DAYS.map(d => {
                        const state = assignWeek[d.v];
                        return (
                          <button key={d.v} onClick={() => cycleDay(d.v)}
                            style={{
                              padding: '9px 4px 8px', borderRadius: 12, cursor: 'pointer', textAlign: 'center',
                              border: `2px solid ${state === 'plan' ? color : state === 'rest' ? '#8B5CF6' : 'var(--border)'}`,
                              background: state === 'plan' ? color + '10' : state === 'rest' ? '#F5F3FF' : 'var(--bg-page)',
                              transition: 'all 0.15s',
                              boxShadow: state !== 'empty' ? `0 3px 10px ${state === 'plan' ? color : '#8B5CF6'}22` : 'none',
                            }}>
                            <p style={{ margin: '0 0 5px', fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: state === 'plan' ? color : state === 'rest' ? '#7C3AED' : 'var(--gray-400)' }}>{d.s}</p>
                            <div style={{ minHeight: 22, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              {state === 'plan'
                                ? <Dumbbell size={15} color={color} />
                                : state === 'rest'
                                ? <Moon size={14} color="#8B5CF6" />
                                : <span style={{ fontSize: 9, color: 'var(--gray-400)', fontWeight: 600 }}>livre</span>}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                    <p style={{ margin: 0, fontSize: 11, color: 'var(--gray-400)', textAlign: 'center' }}>
                      Clique: 1× <strong style={{ color }}>treino</strong> · 2× <strong style={{ color: '#7C3AED' }}>folga</strong> · 3× livre
                    </p>
                  </>
                ) : (
                  <div style={{ padding: 16, borderRadius: 12, background: 'var(--bg-page)', border: '1.5px dashed var(--border)', textAlign: 'center' }}>
                    <p style={{ margin: 0, fontSize: 12, color: 'var(--gray-400)' }}>Selecione um aluno acima para montar a semana</p>
                  </div>
                )}

                {assignSet && (
                  <p style={{ margin: '10px 0 0', fontSize: 12, color: '#3B82F6', textAlign: 'center', fontWeight: 600 }}>
                    Cartilha será salva e atribuída para {students.find(s => s.id === assignStu)?.name}
                  </p>
                )}
              </div>
            )}

            <div style={{ height: 32 }} />
          </div>
        </div>
      </div>

      {showAI && (
        <AIModal
          zIndex={zIndex + 100}
          onApply={newExs => {
            setExs(newExs);
            setTimeout(() => exsListRef.current?.lastElementChild?.scrollIntoView({ behavior: 'smooth', block: 'end' }), 100);
          }}
          onClose={() => setShowAI(false)} />
      )}
    </>
  );
}

// ─── DayCell ──────────────────────────────────────────────────────────────────

function DayCell({ plan, isTarget, onAdd, onEdit, onRemove, onCopyTo }) {
  const [hov,      setHov]      = useState(false);
  const [copyOpen, setCopyOpen] = useState(false);
  const copyRef = useRef(null);

  useEffect(() => {
    if (!copyOpen) return;
    const close = (e) => { if (!copyRef.current?.contains(e.target)) setCopyOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [copyOpen]);

  if (!plan) {
    return (
      <div onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)} onClick={onAdd}
        style={{
          minHeight: 148,
          border: `2px ${isTarget ? 'solid #3B82F6' : `dashed ${hov ? '#93C5FD' : 'var(--border)'}`}`,
          borderRadius: 14,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer',
          background: isTarget ? '#EFF6FF' : hov ? 'var(--bg-page)' : 'var(--bg-surface)',
          boxShadow: isTarget ? '0 0 0 4px rgba(59,130,246,0.12), 0 4px 16px rgba(59,130,246,0.08)' : hov ? '0 4px 12px rgba(0,0,0,0.06)' : 'none',
          transition: 'all 0.2s',
          gap: 8,
        }}>
        <div style={{
          width: 36, height: 36, borderRadius: '50%',
          background: isTarget ? '#DBEAFE' : hov ? '#F0F9FF' : 'var(--bg-page)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all 0.2s',
          boxShadow: isTarget ? '0 0 0 6px rgba(59,130,246,0.1)' : 'none',
        }}>
          <Plus size={18} color={isTarget ? '#3B82F6' : hov ? '#93C5FD' : 'var(--gray-400)'} />
        </div>
        <span style={{ fontSize: 11, fontWeight: 700, color: isTarget ? '#3B82F6' : hov ? '#93C5FD' : 'var(--gray-400)', letterSpacing: '0.03em' }}>
          {isTarget ? 'Atribuir aqui' : 'Livre'}
        </span>
      </div>
    );
  }

  const color = tc(plan.type);
  const exs   = [...(plan.exercises || [])].sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));

  return (
    <div style={{
      borderRadius: 14, border: '1.5px solid var(--border-light)',
      boxShadow: '0 2px 10px rgba(0,0,0,0.07)',
      background: 'var(--bg-surface)', display: 'flex', flexDirection: 'column',
      overflow: 'visible', position: 'relative', minHeight: 148,
      transition: 'box-shadow 0.15s',
    }}
      onMouseEnter={e => e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.11)'}
      onMouseLeave={e => e.currentTarget.style.boxShadow = '0 2px 10px rgba(0,0,0,0.07)'}>
      <div style={{ height: 5, background: `linear-gradient(90deg, ${color}, ${color}77)`, borderRadius: '13px 13px 0 0' }} />
      <div style={{ padding: '10px 11px 8px', flex: 1 }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginBottom: 4, background: color + '12', borderRadius: 20, padding: '2px 8px 2px 6px' }}>
          <div style={{ width: 5, height: 5, borderRadius: '50%', background: color, flexShrink: 0 }} />
          <span style={{ fontSize: 9, fontWeight: 800, color, textTransform: 'uppercase', letterSpacing: '0.07em' }}>{plan.type}</span>
        </div>
        <p style={{ margin: '0 0 7px', fontSize: 12, fontWeight: 800, color: 'var(--gray-900)', lineHeight: 1.35, wordBreak: 'break-word' }}>{plan.name}</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {exs.slice(0, 3).map((ex, i) => (
            <div key={i} style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
              <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--gray-400)', width: 11, textAlign: 'right', flexShrink: 0 }}>{i + 1}</span>
              <span style={{ fontSize: 10, color: 'var(--gray-500)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{ex.name}</span>
              <span style={{ fontSize: 9, color: color, fontWeight: 700, flexShrink: 0, background: color + '10', padding: '1px 4px', borderRadius: 4 }}>{ex.sets}×{ex.reps}</span>
            </div>
          ))}
        </div>
        {exs.length > 3 && (
          <p style={{ margin: '5px 0 0', fontSize: 9, color: '#C4C9D4', fontStyle: 'italic' }}>+{exs.length - 3} exercícios</p>
        )}
      </div>
      <div style={{ display: 'flex', borderTop: '1px solid var(--border)', gap: 0 }}>
        <button onClick={e => { e.stopPropagation(); onEdit(); }}
          style={{ flex: 1, padding: '8px 4px', border: 'none', background: 'none', cursor: 'pointer', color: 'var(--gray-500)', fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3, borderRadius: '0 0 0 12px', transition: 'background 0.1s, color 0.1s' }}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-page)'; e.currentTarget.style.color = 'var(--gray-700)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--gray-500)'; }}>
          <Edit3 size={11} /> Editar
        </button>
        <div style={{ width: 1, background: 'var(--bg-page)' }} />
        <button ref={copyRef} onClick={e => { e.stopPropagation(); setCopyOpen(v => !v); }}
          style={{ flex: 1, padding: '8px 4px', border: 'none', background: 'none', cursor: 'pointer', color: '#3B82F6', fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3, position: 'relative', transition: 'background 0.1s' }}
          onMouseEnter={e => e.currentTarget.style.background = '#EFF6FF'}
          onMouseLeave={e => e.currentTarget.style.background = 'none'}>
          <Copy size={11} /> Copiar
          {copyOpen && (
            <div onClick={e => e.stopPropagation()} style={{ position: 'absolute', bottom: 'calc(100% + 8px)', left: '50%', transform: 'translateX(-50%)', background: 'var(--bg-surface)', borderRadius: 14, boxShadow: '0 12px 32px rgba(0,0,0,0.16)', border: '1.5px solid var(--border)', zIndex: 50, padding: '6px 0', minWidth: 160, textAlign: 'left' }}>
              <p style={{ margin: '0 0 4px', padding: '0 12px', fontSize: 10, fontWeight: 700, color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Copiar para</p>
              {DAYS.map(d => (
                <button key={d.v} onClick={() => { onCopyTo(d.v); setCopyOpen(false); }}
                  style={{ width: '100%', padding: '8px 12px', border: 'none', background: 'none', cursor: 'pointer', textAlign: 'left', fontSize: 12, fontWeight: 600, color: 'var(--gray-700)', display: 'flex', alignItems: 'center', gap: 8 }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--gray-50)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                  <span style={{ fontSize: 10, fontWeight: 800, color: 'var(--gray-400)', width: 26 }}>{d.s}</span>
                  {d.full}
                </button>
              ))}
            </div>
          )}
        </button>
        <div style={{ width: 1, background: 'var(--bg-page)' }} />
        <button onClick={e => { e.stopPropagation(); onRemove(); }}
          style={{ flex: 1, padding: '8px 4px', border: 'none', background: 'none', cursor: 'pointer', color: '#EF4444', fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3, borderRadius: '0 0 12px 0', transition: 'background 0.1s' }}
          onMouseEnter={e => e.currentTarget.style.background = '#FEF2F2'}
          onMouseLeave={e => e.currentTarget.style.background = 'none'}>
          <Trash2 size={11} /> Remover
        </button>
      </div>
    </div>
  );
}

// ─── TemplateCard ─────────────────────────────────────────────────────────────

function TemplateCard({ tpl, onEdit, onAssignMultiple, onDelete, onDuplicate }) {
  const [hov, setHov] = useState(false);
  const color   = tc(tpl.type);
  const exs     = [...(tpl.exercises || [])].sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));
  const preview = exs.slice(0, 4);
  const extra   = exs.length - 4;

  return (
    <div onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        background: 'var(--bg-surface)',
        borderRadius: 16, overflow: 'hidden',
        border: '1.5px solid var(--border-light)',
        boxShadow: hov ? '0 8px 24px rgba(0,0,0,0.1)' : '0 2px 8px rgba(0,0,0,0.05)',
        transition: 'all 0.18s',
        display: 'flex', flexDirection: 'column',
      }}>
      <div style={{ height: 5, background: `linear-gradient(90deg, ${color}, ${color}77)` }} />
      <div style={{ padding: '13px 15px 10px', flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 6, marginBottom: 10 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4 }}>
              <span style={{ fontSize: 9, fontWeight: 800, color, textTransform: 'uppercase', letterSpacing: '0.07em', background: color + '12', padding: '2px 7px', borderRadius: 20 }}>{tpl.type}</span>
              <span style={{ fontSize: 9, fontWeight: 700, background: 'var(--bg-page)', color: 'var(--gray-400)', padding: '2px 6px', borderRadius: 20 }}>{exs.length} ex.</span>
            </div>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 800, color: 'var(--gray-900)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', letterSpacing: '-0.01em' }}>{tpl.name || 'Sem nome'}</p>
          </div>
          <div style={{ display: 'flex', gap: 1, flexShrink: 0 }}>
            <button onClick={e => { e.stopPropagation(); onDuplicate(); }} title="Duplicar"
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray-400)', padding: '4px 5px', display: 'flex', transition: 'color 0.1s', borderRadius: 6 }}
              onMouseEnter={e => e.currentTarget.style.color = '#3B82F6'}
              onMouseLeave={e => e.currentTarget.style.color = '#D1D5DB'}>
              <Copy size={12} />
            </button>
            <button onClick={e => { e.stopPropagation(); onDelete(); }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray-400)', padding: '4px 5px', display: 'flex', transition: 'color 0.1s', borderRadius: 6 }}
              onMouseEnter={e => e.currentTarget.style.color = '#EF4444'}
              onMouseLeave={e => e.currentTarget.style.color = '#D1D5DB'}>
              <Trash2 size={13} />
            </button>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {preview.map((ex, i) => (
            <div key={i} style={{ display: 'flex', gap: 7, alignItems: 'center', padding: '1px 0' }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--gray-400)', width: 14, textAlign: 'right', flexShrink: 0 }}>{i + 1}</span>
              <span style={{ fontSize: 11, color: 'var(--gray-500)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{ex.name}</span>
              <span style={{ fontSize: 10, color, fontWeight: 700, flexShrink: 0, background: color + '10', padding: '1px 5px', borderRadius: 4 }}>{ex.sets}×{ex.reps}</span>
            </div>
          ))}
        </div>
        {extra > 0 && <p style={{ margin: '5px 0 0', fontSize: 10, color: '#C4C9D4', fontStyle: 'italic' }}>+{extra} mais</p>}
      </div>
      <div style={{ padding: '10px 14px 13px', borderTop: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={e => { e.stopPropagation(); onEdit(); }}
            style={{ flex: 1, padding: '9px 8px', borderRadius: 9, border: '1.5px solid var(--border)', background: 'var(--bg-surface)', fontSize: 12, fontWeight: 700, color: 'var(--gray-700)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, transition: 'border-color 0.1s, background 0.1s' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--gray-400)'; e.currentTarget.style.background = 'var(--bg-page)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'var(--bg-surface)'; }}>
            <Edit3 size={12} /> Editar
          </button>
          <button onClick={e => { e.stopPropagation(); onAssignMultiple(); }}
            style={{ flex: 1, padding: '9px 8px', borderRadius: 9, border: 'none', background: `linear-gradient(135deg, ${color}, ${color}bb)`, fontSize: 12, fontWeight: 700, color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, boxShadow: `0 3px 10px ${color}30`, transition: 'opacity 0.15s' }}
            onMouseEnter={e => e.currentTarget.style.opacity = '0.9'}
            onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
            <Send size={11} /> Atribuir
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── AssignModal ──────────────────────────────────────────────────────────────

function AssignModal({ tpl, students, onAssign, onClose }) {
  const [picked, setPicked] = useState([]);
  const [days,   setDays]   = useState(tpl.days || []);
  const [saving, setSaving] = useState(false);
  const [done,   setDone]   = useState(false);

  const handle = async () => {
    if (!picked.length || !days.length || saving) return;
    setSaving(true);
    await onAssign(tpl, picked, days);
    setSaving(false); setDone(true); setTimeout(onClose, 1200);
  };

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'var(--bg-surface)', borderRadius: 20, padding: 26, width: '100%', maxWidth: 440, maxHeight: '90vh', overflowY: 'auto' }}>
        {done ? (
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#D1FAE5', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
              <Check size={26} color="#10B981" strokeWidth={3} />
            </div>
            <p style={{ margin: 0, fontSize: 16, fontWeight: 800, color: 'var(--gray-900)' }}>Atribuído!</p>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--gray-500)' }}>Alunos já podem ver no app</p>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: 'var(--gray-900)' }}>Atribuir para alunos</h3>
                <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--gray-500)' }}>{tpl.name}</p>
              </div>
              <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray-400)' }}><X size={18} /></button>
            </div>
            <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--gray-400)', display: 'block', marginBottom: 7, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Frequência</label>
            <div style={{ marginBottom: 12 }}>
              <DayPresetChips color="#3B82F6" onApply={setDays} />
            </div>
            <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--gray-400)', display: 'block', marginBottom: 7, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Ou escolha manualmente</label>
            <div style={{ display: 'flex', gap: 5, marginBottom: 18 }}>
              {DAYS.map(d => { const sel = days.includes(d.v); return (
                <button key={d.v} onClick={() => setDays(p => p.includes(d.v) ? p.filter(x => x !== d.v) : [...p, d.v])}
                  style={{ flex: 1, padding: '8px 4px', borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: 'pointer', border: `2px solid ${sel ? '#3B82F6' : 'var(--border)'}`, background: sel ? '#EFF6FF' : 'var(--bg-page)', color: sel ? '#3B82F6' : 'var(--gray-400)' }}>
                  {d.s}
                </button>
              ); })}
            </div>
            <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--gray-400)', display: 'block', marginBottom: 7, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Alunos</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 220, overflowY: 'auto', marginBottom: 18 }}>
              {students.length === 0
                ? <p style={{ fontSize: 13, color: 'var(--gray-400)', textAlign: 'center', padding: 20 }}>Nenhum aluno ativo</p>
                : students.map(s => { const sel = picked.includes(s.id); return (
                  <button key={s.id} onClick={() => setPicked(p => p.includes(s.id) ? p.filter(x => x !== s.id) : [...p, s.id])}
                    style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 10, border: `2px solid ${sel ? '#3B82F6' : 'var(--border)'}`, background: sel ? '#EFF6FF' : 'var(--bg-page)', cursor: 'pointer', textAlign: 'left' }}>
                    <div style={{ width: 30, height: 30, borderRadius: '50%', background: s.color || '#CBD5E1', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <span style={{ fontSize: 11, fontWeight: 800, color: 'white' }}>{s.initials || s.name?.[0]}</span>
                    </div>
                    <span style={{ flex: 1, fontSize: 14, fontWeight: 600, color: 'var(--gray-900)' }}>{s.name}</span>
                    {sel && <Check size={15} color="#3B82F6" strokeWidth={3} />}
                  </button>
                ); })}
            </div>
            <button onClick={handle} disabled={!picked.length || !days.length || saving}
              style={{ width: '100%', padding: '13px', borderRadius: 12, border: 'none', background: picked.length && days.length ? 'var(--accent)' : 'var(--border)', color: picked.length && days.length ? 'white' : 'var(--gray-400)', fontSize: 14, fontWeight: 700, cursor: picked.length && days.length ? 'pointer' : 'not-allowed' }}>
              {saving ? 'Salvando...' : `Atribuir para ${picked.length || '...'} aluno${picked.length !== 1 ? 's' : ''}`}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ─── WeekBuilderModal ─────────────────────────────────────────────────────────

function WeekBuilderModal({ student, currentPlans, templates, onSave, onClose, onCreateTemplate }) {
  const [week, setWeek] = useState(() => {
    const w = {};
    DAYS.forEach(d => {
      const p = currentPlans.find(pl => (pl.days || []).map(Number).includes(d.v));
      w[d.v] = p ? { type: 'plan', tpl: p } : { type: 'empty' };
    });
    return w;
  });
  const [selected, setSelected] = useState(null); // null | 'rest' | template
  const [saving,   setSaving]   = useState(false);
  const [creatingTemplate, setCreatingTemplate] = useState(false);
  const todayDow = new Date().getDay();

  const setDay = (dayV) => {
    if (!selected) return;
    setWeek(prev => ({
      ...prev,
      [dayV]: selected === 'rest' ? { type: 'rest' } : { type: 'plan', tpl: selected },
    }));
  };

  const applyPreset = (presetDays) => {
    if (!selected) return;
    setWeek(prev => {
      const next = { ...prev };
      presetDays.forEach(dv => {
        next[dv] = selected === 'rest' ? { type: 'rest' } : { type: 'plan', tpl: selected };
      });
      return next;
    });
  };

  const clearDay = (dayV, e) => {
    e?.stopPropagation();
    setWeek(prev => ({ ...prev, [dayV]: { type: 'empty' } }));
  };

  const handleSave = async () => {
    setSaving(true);
    await onSave(week, student.id);
    setSaving(false);
  };

  const handleCreateTemplate = async (payload) => {
    const result = await onCreateTemplate(payload);
    if (result) {
      setSelected(result);
      setCreatingTemplate(false);
    }
    return result;
  };

  const trainCount = Object.values(week).filter(d => d.type === 'plan').length;
  const restCount  = Object.values(week).filter(d => d.type === 'rest').length;
  const selColor   = selected && selected !== 'rest' ? tc(selected.type) : '#8B5CF6';

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 500, background: 'var(--bg-page)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

      {/* Header */}
      <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0, background: 'var(--bg-surface)' }}>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray-500)', display: 'flex', padding: 6, borderRadius: 8, flexShrink: 0 }}>
          <X size={20} />
        </button>
        <div style={{ flex: 1 }}>
          <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: 'var(--gray-900)' }}>Montar semana</h2>
          <p style={{ margin: 0, fontSize: 12, color: 'var(--gray-400)' }}>
            {student.name} · {trainCount} treino{trainCount !== 1 ? 's' : ''}{restCount > 0 ? ` · ${restCount} folga${restCount !== 1 ? 's' : ''}` : ''}
          </p>
        </div>
        <button onClick={handleSave} disabled={saving}
          style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '10px 20px', borderRadius: 11, border: 'none', background: 'var(--accent)', color: 'white', fontSize: 13, fontWeight: 700, cursor: 'pointer', flexShrink: 0, boxShadow: '0 4px 14px rgba(59,130,246,0.3)' }}>
          <Save size={14} />{saving ? 'Salvando...' : 'Salvar semana'}
        </button>
      </div>

      {/* Banner de instrução */}
      <div style={{ padding: '10px 20px', borderBottom: '1px solid var(--border-light)', background: selected ? selColor + '0c' : 'var(--bg-page)', flexShrink: 0, minHeight: 44, display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
        {selected ? (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%' }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: selColor, flexShrink: 0 }} />
              <span style={{ fontSize: 13, fontWeight: 700, color: selColor, flex: 1 }}>
                {selected === 'rest' ? 'Clique nos dias para marcar como folga' : `"${selected.name}" — clique nos dias ou use um preset`}
              </span>
              <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray-400)', display: 'flex' }}>
                <X size={15} />
              </button>
            </div>
            <DayPresetChips color={selColor} onApply={applyPreset} />
          </>
        ) : (
          <span style={{ fontSize: 13, color: 'var(--gray-400)' }}>
            Selecione uma cartilha abaixo e clique nos dias da semana para atribuir
          </span>
        )}
      </div>

      {/* Grade da semana */}
      <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-light)', flexShrink: 0 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 8 }}>
          {DAYS.map(d => {
            const dayData  = week[d.v];
            const isToday  = d.v === todayDow;
            const isActive = !!selected;
            const color    = dayData.type === 'plan' ? tc(dayData.tpl?.type) : '#8B5CF6';

            return (
              <div key={d.v} onClick={() => isActive && setDay(d.v)}
                style={{
                  borderRadius: 12, overflow: 'hidden', cursor: isActive ? 'pointer' : 'default',
                  border: isActive ? `2px dashed ${selColor}55` : '1.5px solid var(--border-light)',
                  background: 'var(--bg-surface)', transition: 'all 0.12s',
                  boxShadow: isActive ? `0 0 0 3px ${selColor}15` : '0 2px 8px rgba(0,0,0,0.05)',
                  transform: isActive ? 'scale(1.02)' : 'none',
                }}>
                {/* Cabeçalho do dia */}
                <div style={{ padding: '5px 8px', background: isToday ? '#EFF6FF' : 'var(--bg-page)', borderBottom: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', minHeight: 28 }}>
                  <span style={{ fontSize: 11, fontWeight: 800, color: isToday ? '#3B82F6' : 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{d.s}</span>
                  {dayData.type !== 'empty' && (
                    <button onClick={e => clearDay(d.v, e)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray-400)', padding: 1, display: 'flex', lineHeight: 1 }}
                      onMouseEnter={e => e.currentTarget.style.color = '#EF4444'}
                      onMouseLeave={e => e.currentTarget.style.color = 'var(--gray-400)'}>
                      <X size={11} />
                    </button>
                  )}
                </div>

                {/* Conteúdo do dia */}
                <div style={{ minHeight: 80, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '8px 6px' }}>
                  {dayData.type === 'rest' ? (
                    <div style={{ textAlign: 'center' }}>
                      <Moon size={20} color="#8B5CF6" style={{ marginBottom: 3 }} />
                      <span style={{ fontSize: 10, fontWeight: 700, color: '#8B5CF6', display: 'block' }}>Folga</span>
                    </div>
                  ) : dayData.type === 'plan' ? (
                    <div style={{ width: '100%' }}>
                      <div style={{ height: 3, background: `linear-gradient(90deg, ${color}, ${color}66)`, borderRadius: 2, marginBottom: 6 }} />
                      <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: 'var(--gray-900)', textAlign: 'center', lineHeight: 1.3, wordBreak: 'break-word' }}>{dayData.tpl?.name}</p>
                      {(dayData.tpl?.exercises || []).length > 0 && (
                        <p style={{ margin: '3px 0 0', fontSize: 10, color: 'var(--gray-400)', textAlign: 'center' }}>{(dayData.tpl.exercises || []).length} ex.</p>
                      )}
                    </div>
                  ) : (
                    <div style={{ textAlign: 'center', opacity: isActive ? 0.6 : 0.3 }}>
                      <Plus size={18} color={isActive ? selColor : 'var(--gray-400)'} />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Biblioteca de cartilhas */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <p style={{ margin: 0, fontSize: 11, fontWeight: 800, color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Selecione uma cartilha
          </p>
          <span style={{ fontSize: 11, color: 'var(--gray-400)', fontWeight: 600 }}>Clique → depois nos dias</span>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginBottom: 16 }}>
          {/* Folga */}
          <button onClick={() => setSelected(selected === 'rest' ? null : 'rest')}
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', borderRadius: 12, border: `2px solid ${selected === 'rest' ? '#8B5CF6' : 'var(--border)'}`, background: selected === 'rest' ? '#F5F3FF' : 'var(--bg-surface)', cursor: 'pointer', transition: 'all 0.15s', boxShadow: selected === 'rest' ? '0 4px 14px rgba(139,92,246,0.2)' : '0 1px 4px rgba(0,0,0,0.05)' }}>
            <Moon size={18} color={selected === 'rest' ? '#7C3AED' : '#8B5CF6'} />
            <div style={{ textAlign: 'left' }}>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: selected === 'rest' ? '#7C3AED' : 'var(--gray-700)' }}>Folga / Descanso</p>
              <p style={{ margin: 0, fontSize: 10, color: selected === 'rest' ? '#8B5CF6' : 'var(--gray-400)' }}>Dia de recuperação</p>
            </div>
            {selected === 'rest' && <Check size={14} color="#7C3AED" strokeWidth={3} />}
          </button>

          {/* Criar novo treino sem saber da biblioteca */}
          <button onClick={() => setCreatingTemplate(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', borderRadius: 12, border: '2px dashed var(--border)', background: 'var(--bg-surface)', cursor: 'pointer', transition: 'all 0.15s' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; }}>
            <Plus size={18} color="var(--accent)" />
            <div style={{ textAlign: 'left' }}>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: 'var(--gray-700)' }}>Criar novo treino</p>
              <p style={{ margin: 0, fontSize: 10, color: 'var(--gray-400)' }}>Não achou pronto? Monte aqui</p>
            </div>
          </button>
        </div>

        {templates.length === 0 ? (
          <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--gray-400)', fontSize: 13 }}>
            <BookOpen size={32} color="var(--border)" style={{ marginBottom: 10 }} />
            <p style={{ margin: 0 }}>Nenhuma cartilha criada ainda</p>
            <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--gray-400)' }}>Use "Criar novo treino" acima pra montar a primeira</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 9 }}>
            {templates.map(t => {
              const isSel  = selected !== 'rest' && selected?.id === t.id;
              const color  = tc(t.type);
              const exs    = [...(t.exercises || [])].sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));
              const usedIn = DAYS.filter(d => week[d.v]?.type === 'plan' && week[d.v]?.tpl?.id === t.id);
              return (
                <button key={t.id} onClick={() => setSelected(isSel ? null : t)}
                  style={{ textAlign: 'left', padding: 0, border: `2px solid ${isSel ? color : 'var(--border)'}`, borderRadius: 13, background: isSel ? color + '07' : 'var(--bg-surface)', cursor: 'pointer', transition: 'all 0.18s', overflow: 'hidden', boxShadow: isSel ? `0 6px 20px ${color}28` : '0 1px 4px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', transform: isSel ? 'translateY(-1px)' : 'none' }}>
                  <div style={{ height: 4, background: `linear-gradient(90deg, ${color}, ${color}77)` }} />
                  <div style={{ padding: '11px 13px', flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 4, marginBottom: 5 }}>
                      <div>
                        <span style={{ fontSize: 9, fontWeight: 800, color, textTransform: 'uppercase', letterSpacing: '0.07em', background: color + '12', padding: '2px 6px', borderRadius: 20, display: 'inline-block', marginBottom: 3 }}>{t.type}</span>
                        <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: 'var(--gray-900)' }}>{t.name}</p>
                        <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--gray-400)' }}>{exs.length} exercícios</p>
                      </div>
                      {isSel && (
                        <div style={{ width: 22, height: 22, borderRadius: '50%', background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>
                          <Check size={12} color="white" strokeWidth={3} />
                        </div>
                      )}
                    </div>
                    {usedIn.length > 0 && (
                      <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap', marginTop: 6 }}>
                        {usedIn.map(d => (
                          <span key={d.v} style={{ fontSize: 9, fontWeight: 800, color, background: color + '15', padding: '2px 6px', borderRadius: 20 }}>{d.s}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {creatingTemplate && (
        <TemplateEditor
          item={null}
          mode="template"
          students={[]}
          zIndex={600}
          onSave={handleCreateTemplate}
          onClose={() => setCreatingTemplate(false)} />
      )}
    </div>
  );
}

// ─── StarterTemplatesModal ────────────────────────────────────────────────────
// Modelos prontos — pra não começar do zero.

function StarterTemplatesModal({ onUse, onClose }) {
  const [usingId, setUsingId] = useState(null);

  const handleUse = async (tpl, idx) => {
    setUsingId(idx);
    await onUse(tpl);
    setUsingId(null);
  };

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 400, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'var(--bg-surface)', borderRadius: 20, padding: 26, width: '100%', maxWidth: 640, maxHeight: '85vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: 'var(--gray-900)' }}>Modelos prontos</h3>
            <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--gray-500)' }}>Clique pra adicionar na sua biblioteca — depois é só editar</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray-400)' }}><X size={18} /></button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 10 }}>
          {STARTER_TEMPLATES.map((tpl, idx) => {
            const color = tc(tpl.type);
            const busy  = usingId === idx;
            return (
              <div key={tpl.name} style={{ border: '1.5px solid var(--border)', borderRadius: 13, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <div style={{ height: 4, background: `linear-gradient(90deg, ${color}, ${color}77)` }} />
                <div style={{ padding: '12px 14px', flex: 1 }}>
                  <span style={{ fontSize: 9, fontWeight: 800, color, textTransform: 'uppercase', letterSpacing: '0.07em', background: color + '12', padding: '2px 7px', borderRadius: 20, display: 'inline-block', marginBottom: 5 }}>{tpl.type}</span>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: 'var(--gray-900)' }}>{tpl.name}</p>
                  <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--gray-400)' }}>{tpl.exercises.length} exercícios</p>
                </div>
                <button onClick={() => handleUse(tpl, idx)} disabled={busy}
                  style={{ padding: '9px 8px', border: 'none', borderTop: '1px solid var(--border)', background: busy ? 'var(--bg-page)' : `${color}12`, color, fontSize: 12, fontWeight: 700, cursor: busy ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  {busy ? 'Adicionando...' : <><Plus size={13} /> Usar este modelo</>}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function Treinos() {
  const { user } = useAuth();
  const [templates,   setTemplates]   = useState([]);
  const [students,    setStudents]    = useState([]);
  const [plans,       setPlans]       = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [selStudent,  setSelStudent]  = useState(null);
  const [editor,      setEditor]      = useState(null);
  const [assignModal, setAssignModal] = useState(null);
  const [search,      setSearch]      = useState('');
  const [typeFilter,  setTypeFilter]  = useState('');
  const [toasts,      setToasts]      = useState([]);
  const [weekBuilder, setWeekBuilder] = useState(null);
  const [showStarter, setShowStarter] = useState(false);

  const todayDow     = new Date().getDay();

  const addToast = (msg, type = 'success') => {
    const id = Date.now();
    setToasts(p => [...p, { id, msg, type }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 3500);
  };

  useEffect(() => {
    if (!user || !hasSupabase) { setLoading(false); return; }
    Promise.all([
      supabase.from('training_plans').select('*, exercises(*)').eq('personal_id', user.id).is('student_id', null),
      supabase.from('training_plans').select('*, exercises(*)').eq('personal_id', user.id).not('student_id', 'is', null),
      supabase.from('students').select('id, name, initials, color').eq('personal_id', user.id).eq('status', 'ativo'),
    ]).then(([{ data: t }, { data: p }, { data: s }]) => {
      setTemplates(t || []);
      setPlans(p || []);
      setStudents(s || []);
      if (s?.length) setSelStudent(s[0].id);
      setLoading(false);
    });
  }, [user?.id]);

  // ── Persistência ─────────────────────────────────────────────────────────────

  const saveItem = async ({ id, name, type, days, exercises, studentId, assignStudents = [], assignDays = [] }) => {
    if (!hasSupabase) return false;
    const isTemplate = studentId === null || studentId === undefined;
    let savedPlan = null;
    try {
      if (id) {
        const { error } = await supabase.from('training_plans').update({ name, type, days }).eq('id', id);
        if (error) throw error;
        await supabase.from('exercises').delete().eq('plan_id', id);
        if (exercises.length) {
          const { error: exErr } = await supabase.from('exercises').insert(
            exercises.map((e, i) => ({ plan_id: id, name: e.name, sets: parseInt(e.sets) || 4, reps: e.reps, rest: e.rest, load: e.load || '', obs: e.obs || '', order_index: i }))
          );
          if (exErr) throw exErr;
        }
        const { data: up } = await supabase.from('training_plans').select('*, exercises(*)').eq('id', id).single();
        if (up) {
          savedPlan = up;
          if (isTemplate) setTemplates(prev => prev.map(t => t.id === id ? up : t));
          else setPlans(prev => prev.map(p => p.id === id ? up : p));
        }
      } else {
        const { data: plan, error } = await supabase.from('training_plans').insert({
          personal_id: user.id, student_id: isTemplate ? null : studentId, name, type, days,
        }).select().single();
        if (error) throw error;
        if (!plan) throw new Error('Nenhum dado retornado');
        if (exercises.length) {
          const { error: exErr } = await supabase.from('exercises').insert(
            exercises.map((e, i) => ({ plan_id: plan.id, name: e.name, sets: parseInt(e.sets) || 4, reps: e.reps, rest: e.rest, load: e.load || '', obs: e.obs || '', order_index: i }))
          );
          if (exErr) throw exErr;
        }
        const { data: full } = await supabase.from('training_plans').select('*, exercises(*)').eq('id', plan.id).single();
        if (full) {
          savedPlan = full;
          if (isTemplate) setTemplates(prev => [full, ...prev]);
          else setPlans(prev => [full, ...prev]);
        }
      }
    } catch (err) {
      addToast('Erro ao salvar: ' + (err?.message || 'Tente novamente'), 'error');
      return false;
    }
    // Se criou template com atribuição inline, atribui agora
    if (isTemplate && savedPlan && assignStudents.length > 0 && assignDays.length > 0) {
      await assignTemplate(savedPlan, assignStudents, assignDays);
      const stuName = students.find(s => s.id === assignStudents[0])?.name || 'aluno';
      addToast(`Cartilha criada e atribuída para ${stuName}!`);
    } else {
      addToast(isTemplate ? 'Cartilha salva com sucesso!' : 'Treino salvo com sucesso!');
    }
    setEditor(null);
    return savedPlan;
  };

  const createTemplate = ({ name, type, exercises }) =>
    saveItem({ id: undefined, name, type, days: [], exercises, studentId: null });

  const addStarterTemplate = async (starter) => {
    if (!hasSupabase) return;
    const { data: newPlan, error } = await supabase.from('training_plans').insert({
      personal_id: user.id, student_id: null, name: starter.name, type: starter.type, days: [],
    }).select().single();
    if (error || !newPlan) { addToast('Erro ao adicionar modelo', 'error'); return; }
    await supabase.from('exercises').insert(starter.exercises.map((e, i) => ({
      plan_id: newPlan.id, name: e.name, sets: parseInt(e.sets) || 4, reps: e.reps, rest: e.rest, load: '', obs: '', order_index: i,
    })));
    const { data: full } = await supabase.from('training_plans').select('*, exercises(*)').eq('id', newPlan.id).single();
    if (full) setTemplates(prev => [full, ...prev]);
    addToast(`"${starter.name}" adicionado à sua biblioteca!`);
  };

  const deleteItem = async (item, isTemplate) => {
    if (!window.confirm(`Excluir "${item.name}"?`)) return;
    if (hasSupabase) await supabase.from('training_plans').delete().eq('id', item.id);
    if (isTemplate) setTemplates(prev => prev.filter(t => t.id !== item.id));
    else setPlans(prev => prev.filter(p => p.id !== item.id));
    addToast('Excluído', 'info');
  };

  const assignTemplate = async (tpl, studentIds, selectedDays) => {
    if (!hasSupabase) return;
    const exs = [...(tpl.exercises || [])].sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));
    for (const sid of studentIds) {
      const overlapping = plans.filter(p => p.student_id === sid && (p.days || []).map(Number).some(d => selectedDays.includes(d)));
      for (const op of overlapping) await supabase.from('training_plans').delete().eq('id', op.id);
      setPlans(prev => prev.filter(p => !overlapping.find(o => o.id === p.id)));
      const { data: plan, error } = await supabase.from('training_plans').insert({
        personal_id: user.id, student_id: sid, name: tpl.name, type: tpl.type, days: selectedDays,
      }).select().single();
      if (error || !plan) continue;
      if (exs.length) {
        await supabase.from('exercises').insert(exs.map((e, i) => ({
          plan_id: plan.id, name: e.name, sets: parseInt(e.sets) || 4, reps: e.reps, rest: e.rest, load: e.load || '', obs: e.obs || '', order_index: i,
        })));
      }
      const { data: full } = await supabase.from('training_plans').select('*, exercises(*)').eq('id', plan.id).single();
      if (full) setPlans(prev => [full, ...prev]);
    }
    addToast('Treino atribuído!');
  };

  const saveWeek = async (week, studentId) => {
    if (!hasSupabase) return;
    // Apaga todos os planos atuais do aluno e recria a partir do builder
    const current = plans.filter(p => p.student_id === studentId);
    for (const p of current) await supabase.from('training_plans').delete().eq('id', p.id);
    setPlans(prev => prev.filter(p => p.student_id !== studentId));

    // Agrupa dias pelo mesmo template (para criar 1 plano por template)
    const groups = {};
    for (const [dayStr, dayData] of Object.entries(week)) {
      if (dayData.type !== 'plan') continue;
      const dayV = parseInt(dayStr);
      const key  = dayData.tpl.id || dayData.tpl.name;
      if (!groups[key]) groups[key] = { tpl: dayData.tpl, days: [] };
      groups[key].days.push(dayV);
    }

    for (const { tpl, days } of Object.values(groups)) {
      const exs = [...(tpl.exercises || [])].sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));
      const { data: newPlan } = await supabase.from('training_plans').insert({
        personal_id: user.id, student_id: studentId, name: tpl.name, type: tpl.type, days,
      }).select().single();
      if (!newPlan) continue;
      if (exs.length) {
        await supabase.from('exercises').insert(exs.map((e, i) => ({
          plan_id: newPlan.id, name: e.name, sets: parseInt(e.sets) || 4, reps: e.reps, rest: e.rest, load: e.load || '', obs: e.obs || '', order_index: i,
        })));
      }
      const { data: full } = await supabase.from('training_plans').select('*, exercises(*)').eq('id', newPlan.id).single();
      if (full) setPlans(prev => [full, ...prev]);
    }

    addToast('Semana montada com sucesso!');
    setWeekBuilder(null);
  };

  const copyPlanToDay = async (plan, destDayV) => {
    if (!hasSupabase) return;
    const exs = [...(plan.exercises || [])].sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));
    const overlap = plans.find(p => p.student_id === plan.student_id && (p.days || []).includes(destDayV) && p.id !== plan.id);
    if (overlap) {
      await supabase.from('training_plans').delete().eq('id', overlap.id);
      setPlans(prev => prev.filter(p => p.id !== overlap.id));
    }
    const { data: newPlan, error } = await supabase.from('training_plans').insert({
      personal_id: user.id, student_id: plan.student_id, name: plan.name, type: plan.type, days: [destDayV],
    }).select().single();
    if (error || !newPlan) { addToast('Erro ao copiar treino', 'error'); return; }
    if (exs.length) {
      await supabase.from('exercises').insert(exs.map((e, i) => ({
        plan_id: newPlan.id, name: e.name, sets: e.sets, reps: e.reps, rest: e.rest, load: e.load || '', obs: e.obs || '', order_index: i,
      })));
    }
    const { data: full } = await supabase.from('training_plans').select('*, exercises(*)').eq('id', newPlan.id).single();
    if (full) setPlans(prev => [full, ...prev]);
    const destDay = DAYS.find(d => d.v === destDayV);
    addToast(`Treino copiado para ${destDay?.full}!`);
  };

  const duplicateTemplate = async (tpl) => {
    if (!hasSupabase) return;
    const exs = [...(tpl.exercises || [])].sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));
    const { data: newPlan, error } = await supabase.from('training_plans').insert({
      personal_id: user.id, student_id: null, name: tpl.name + ' (cópia)', type: tpl.type, days: tpl.days || [],
    }).select().single();
    if (error || !newPlan) { addToast('Erro ao duplicar', 'error'); return; }
    if (exs.length) {
      await supabase.from('exercises').insert(exs.map((e, i) => ({
        plan_id: newPlan.id, name: e.name, sets: e.sets, reps: e.reps, rest: e.rest, load: e.load || '', obs: e.obs || '', order_index: i,
      })));
    }
    const { data: full } = await supabase.from('training_plans').select('*, exercises(*)').eq('id', newPlan.id).single();
    if (full) setTemplates(prev => [full, ...prev]);
    addToast('Cartilha duplicada!');
  };

  // ── Dados computados ─────────────────────────────────────────────────────────

  const selectedStudent = students.find(s => s.id === selStudent);
  const studentPlans    = plans.filter(p => p.student_id === selStudent);
  const byDay           = {};
  studentPlans.forEach(p => (p.days || []).forEach(d => { byDay[d] = p; }));
  const activeDays      = Object.keys(byDay).length;

  const filtered = templates.filter(t =>
    (!typeFilter || t.type === typeFilter) &&
    (!search || t.name?.toLowerCase().includes(search.toLowerCase()) || t.type?.toLowerCase().includes(search.toLowerCase()))
  );

  const usedTypes = [...new Set(templates.map(t => t.type))];

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300 }}>
      <Dumbbell size={32} color="#D1D5DB" />
    </div>
  );

  return (
    <div className="page-padding" style={{ flex: 1 }}>
      <Toasts toasts={toasts} dismiss={id => setToasts(p => p.filter(t => t.id !== id))} />

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="page-header">
        <div>
          <h2 className="page-title">Treinos</h2>
          <p className="page-subtitle">
            {students.length} aluno{students.length !== 1 ? 's' : ''} · {templates.length} cartilha{templates.length !== 1 ? 's' : ''}
            {plans.length > 0 && ` · ${plans.length} plano${plans.length !== 1 ? 's' : ''} atribuído${plans.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <div className="page-actions">
          <button onClick={() => setShowStarter(true)} className="btn-secondary">
            <Sparkles size={15} /> Modelos prontos
          </button>
          <button onClick={() => setEditor({ item: null, mode: 'template' })} className="btn-primary">
            <Plus size={16} /> Nova cartilha
          </button>
        </div>
      </div>

      {/* ── Grade semanal ───────────────────────────────────────────────── */}
      {students.length === 0 ? (
        <div style={{ background: 'var(--bg-surface)', borderRadius: 16, padding: '60px 24px', textAlign: 'center', border: '2px dashed var(--border)', marginBottom: 32 }}>
          <div style={{ width: 56, height: 56, borderRadius: 14, background: '#F0FFF4', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
            <Users size={26} color="#10B981" />
          </div>
          <h3 style={{ margin: '0 0 6px', fontSize: 17, fontWeight: 800, color: 'var(--gray-900)' }}>Sem alunos ativos</h3>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--gray-400)' }}>Cadastre alunos para montar a semana de treino deles</p>
        </div>
      ) : (
        <>
          {/* Seletor de aluno */}
          <div style={{ display: 'flex', gap: 8, overflowX: 'auto', marginBottom: 20, paddingBottom: 4 }}>
            {students.map(s => {
              const sel         = selStudent === s.id;
              const studentPlansForS = plans.filter(p => p.student_id === s.id);
              const trainDays   = [...new Set(studentPlansForS.flatMap(p => p.days || []))].length;
              return (
                <button key={s.id} onClick={() => setSelStudent(s.id)}
                  style={{
                    display: 'flex', flexDirection: 'column', gap: 8,
                    padding: '10px 14px 9px', borderRadius: 16,
                    border: `2px solid ${sel ? '#3B82F6' : 'var(--border)'}`,
                    background: sel ? '#EFF6FF' : 'var(--bg-surface)',
                    cursor: 'pointer', flexShrink: 0,
                    transition: 'all 0.15s', minWidth: 110,
                    boxShadow: sel ? '0 4px 16px rgba(59,130,246,0.15)' : '0 1px 4px rgba(0,0,0,0.05)',
                  }}>
                  {/* Nome + avatar */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: s.color || '#CBD5E1', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: sel ? '0 2px 8px rgba(59,130,246,0.2)' : 'none' }}>
                      <span style={{ fontSize: 10, fontWeight: 800, color: 'white' }}>{s.initials || s.name?.[0]}</span>
                    </div>
                    <div style={{ textAlign: 'left' }}>
                      <p style={{ margin: 0, fontSize: 13, fontWeight: sel ? 700 : 500, color: sel ? '#1D4ED8' : 'var(--gray-700)', whiteSpace: 'nowrap' }}>{s.name}</p>
                      <p style={{ margin: 0, fontSize: 10, color: trainDays ? (sel ? '#3B82F6' : 'var(--gray-400)') : 'var(--gray-600)', fontWeight: trainDays ? 600 : 400 }}>
                        {trainDays ? `${trainDays}×/sem` : 'sem treino'}
                      </p>
                    </div>
                  </div>
                  {/* 7-dot week visualization */}
                  <div style={{ display: 'flex', gap: 2 }}>
                    {DAYS.map(d => {
                      const planForDay = studentPlansForS.find(p => (p.days || []).includes(d.v));
                      const dotColor   = planForDay ? tc(planForDay.type) : null;
                      return (
                        <div key={d.v} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                          <div style={{ width: 7, height: 7, borderRadius: '50%', background: dotColor || 'var(--border)', transition: 'background 0.15s' }} title={d.full} />
                          <span style={{ fontSize: 7, fontWeight: 700, color: dotColor || 'var(--gray-600)', textTransform: 'uppercase', lineHeight: 1 }}>{d.s[0]}</span>
                        </div>
                      );
                    })}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Grade 7 dias */}
          {selectedStudent && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                    <p style={{ margin: 0, fontSize: 15, fontWeight: 800, color: 'var(--gray-900)' }}>
                      Semana de {selectedStudent.name}
                    </p>
                    {activeDays > 0 ? (
                      <span style={{ fontSize: 11, fontWeight: 700, color: '#10B981', background: '#F0FDF4', padding: '3px 9px', borderRadius: 20, border: '1px solid #BBF7D0' }}>
                        {activeDays}×/sem
                      </span>
                    ) : (
                      <span style={{ fontSize: 11, fontWeight: 600, color: '#F59E0B', background: '#FFFBEB', padding: '3px 9px', borderRadius: 20, border: '1px solid #FDE68A' }}>
                        sem treinos
                      </span>
                    )}
                  </div>
                  <p style={{ margin: 0, fontSize: 12, color: 'var(--gray-400)' }}>
                    {activeDays === 0
                      ? 'Clique em "Montar semana" ou em qualquer dia pra começar'
                      : 'Clique em qualquer dia pra ajustar, ou use "Copiar" nas células pra duplicar'}
                  </p>
                </div>
                <div style={{ display: 'flex', gap: 7 }}>
                  <button onClick={() => setWeekBuilder(selStudent)}
                    style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 15px', borderRadius: 10, border: 'none', background: 'var(--accent)', fontSize: 12, fontWeight: 700, color: 'white', cursor: 'pointer', boxShadow: '0 4px 12px rgba(59,130,246,0.28)', transition: 'opacity 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.opacity = '0.9'}
                    onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
                    <Dumbbell size={13} /> Montar semana
                  </button>
                </div>
              </div>

              <div style={{ overflowX: 'auto', marginBottom: 32 }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(120px, 1fr))', gap: 10, minWidth: 860 }}>
                  {DAYS.map(d => {
                    const plan    = byDay[d.v];
                    const isToday = d.v === todayDow;
                    return (
                      <div key={d.v}>
                        <div style={{ textAlign: 'center', marginBottom: 8, padding: '6px 4px', borderRadius: 10, background: isToday ? '#EFF6FF' : 'transparent', transition: 'background 0.15s' }}>
                          <span style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.07em', color: isToday ? '#3B82F6' : plan ? 'var(--gray-700)' : 'var(--gray-400)' }}>{d.s}</span>
                          {isToday
                            ? <div style={{ fontSize: 9, fontWeight: 700, color: '#3B82F6', marginTop: 2 }}>Hoje</div>
                            : <div style={{ height: 12 }} />}
                        </div>
                        <DayCell
                          plan={plan}
                          isTarget={false}
                          onAdd={() => setWeekBuilder(selStudent)}
                          onEdit={() => setEditor({ item: plan, mode: 'plan', studentId: selStudent, studentName: selectedStudent.name })}
                          onRemove={() => deleteItem(plan, false)}
                          onCopyTo={(destDay) => copyPlanToDay(plan, destDay)}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </>
      )}

      {/* ── Biblioteca de cartilhas ─────────────────────────────────────── */}
      <div>
        {/* Cabeçalho da biblioteca */}
        <div className="section-header" style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div className="icon-box icon-box-md icon-box-purple">
              <BookOpen size={16} />
            </div>
            <div>
              <h3 className="section-title">Suas cartilhas</h3>
              {filtered.length > 0 && (
                <p className="section-desc">{filtered.length} disponíve{filtered.length !== 1 ? 'is' : 'l'}</p>
              )}
            </div>
          </div>
          <div className="search-bar" style={{ width: 200 }}>
            <Search size={13} color="var(--gray-400)" style={{ flexShrink: 0 }} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar cartilha..."
              style={{ border: 'none', outline: 'none', fontSize: 13, background: 'transparent', width: '100%' }} />
          </div>
        </div>

        {/* Filtros por tipo */}
        {usedTypes.length > 1 && (
          <div className="filter-pills" style={{ marginBottom: 14, overflowX: 'auto', flexWrap: 'nowrap' }}>
            <button onClick={() => setTypeFilter('')} className={`pill${!typeFilter ? ' active' : ''}`}>Todos</button>
            {PLAN_TYPES.filter(t => usedTypes.includes(t)).map(t => {
              const sel = typeFilter === t; const c = tc(t);
              return (
                <button key={t} onClick={() => setTypeFilter(typeFilter === t ? '' : t)}
                  className="pill"
                  style={sel ? { background: c + '18', borderColor: c, color: c } : {}}>
                  {t}
                </button>
              );
            })}
          </div>
        )}

        {/* Grid de cartilhas */}
        {templates.length === 0 ? (
          <div style={{ background: 'var(--bg-surface)', borderRadius: 16, padding: '48px 24px', textAlign: 'center', border: '2px dashed var(--border)' }}>
            <div style={{ width: 54, height: 54, borderRadius: 14, background: 'linear-gradient(135deg, #EFF6FF, #F5F3FF)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
              <BookOpen size={24} color="#8B5CF6" />
            </div>
            <h3 style={{ margin: '0 0 6px', fontSize: 16, fontWeight: 800, color: 'var(--gray-900)' }}>Nenhuma cartilha ainda</h3>
            <p style={{ margin: '0 0 20px', fontSize: 13, color: 'var(--gray-500)' }}>Comece com um modelo pronto ou crie a sua — a IA gera exercícios em segundos</p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button onClick={() => setShowStarter(true)}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '11px 22px', borderRadius: 11, border: '1.5px solid var(--border)', background: 'var(--bg-surface)', color: 'var(--gray-700)', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                <Sparkles size={15} /> Modelos prontos
              </button>
              <button onClick={() => setEditor({ item: null, mode: 'template' })}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '11px 22px', borderRadius: 11, border: 'none', background: 'var(--accent)', color: 'white', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                <Plus size={15} /> Criar do zero
              </button>
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ background: 'var(--bg-surface)', borderRadius: 16, padding: '32px 24px', textAlign: 'center', border: '1.5px solid var(--border-light)' }}>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--gray-400)' }}>Nenhuma cartilha para "{search || typeFilter}"</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12 }}>
            {filtered.map(t => (
              <TemplateCard key={t.id} tpl={t}
                onEdit={() => setEditor({ item: t, mode: 'template' })}
                onAssignMultiple={() => setAssignModal(t)}
                onDelete={() => deleteItem(t, true)}
                onDuplicate={() => duplicateTemplate(t)} />
            ))}
          </div>
        )}
      </div>

      {/* ── Modais ──────────────────────────────────────────────────────── */}
      {editor !== null && (
        <TemplateEditor
          item={editor.item}
          mode={editor.mode}
          studentId={editor.studentId}
          studentName={editor.studentName}
          defaultDays={editor.defaultDays}
          students={editor.mode === 'template' ? students : []}
          onSave={saveItem}
          onClose={() => setEditor(null)} />
      )}
      {assignModal && (
        <AssignModal tpl={assignModal} students={students} onAssign={assignTemplate} onClose={() => setAssignModal(null)} />
      )}

      {weekBuilder && (() => {
        const st = students.find(s => s.id === weekBuilder);
        return st ? (
          <WeekBuilderModal
            student={st}
            currentPlans={plans.filter(p => p.student_id === weekBuilder)}
            templates={templates}
            onSave={saveWeek}
            onCreateTemplate={createTemplate}
            onClose={() => setWeekBuilder(null)} />
        ) : null;
      })()}

      {showStarter && (
        <StarterTemplatesModal onUse={addStarterTemplate} onClose={() => setShowStarter(false)} />
      )}
    </div>
  );
}


