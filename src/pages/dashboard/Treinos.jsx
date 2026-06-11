import { useState, useEffect, useRef } from 'react';
import {
  Plus, Dumbbell, X, Save, Trash2, Sparkles, Check, Send,
  ChevronDown, ChevronUp, Search, Edit3, Users, BookOpen
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { supabase, hasSupabase } from '../../lib/supabase';
import { searchExercises, EXERCISE_LIBRARY } from '../../data/exerciseLibrary';

// ─── Constantes ───────────────────────────────────────────────────────────────

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
const TYPE_CLR   = { Hipertrofia: '#8B5CF6', Força: '#EF4444', Resistência: '#3B82F6', Funcional: '#10B981', Cardio: '#F59E0B', Mobilidade: '#06B6D4', Emagrecimento: '#F97316' };
const GROUP_CLR  = { Peito: '#EF4444', Costas: '#3B82F6', Pernas: '#8B5CF6', Glúteos: '#EC4899', Ombro: '#F59E0B', Braços: '#10B981', Abdômen: '#06B6D4', 'Full Body': '#F97316', Cardio: '#6366F1' };
const REPS_Q     = ['6', '8', '10', '12', '15', '20', 'Falha'];
const REST_Q     = ['30s', '45s', '60s', '75s', '90s', '2min'];
const AI_LEVELS  = {
  'Iniciante':     { sets: '3', reps: '12', rest: '60s', n: 5 },
  'Intermediário': { sets: '4', reps: '10', rest: '75s', n: 6 },
  'Avançado':      { sets: '4', reps: '8',  rest: '90s', n: 7 },
};

const tc = (t) => TYPE_CLR[t]  || '#6B7280';
const gc = (g) => GROUP_CLR[g] || '#6B7280';
const newEx = (i = 0) => ({ id: Date.now() + i, name: '', sets: '4', reps: '10', rest: '60s', load: '', obs: '', order_index: i });

function genAI(groups, level) {
  const p = AI_LEVELS[level] || AI_LEVELS['Intermediário'];
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

// ─── ExerciseRowEditor ────────────────────────────────────────────────────────

function ExerciseRowEditor({ ex, index, onChange, onDelete }) {
  const [showSugg, setShowSugg] = useState(false);
  const [suggs,    setSuggs]    = useState([]);
  const [open,     setOpen]     = useState(!ex.name);

  const handleName = (val) => {
    onChange({ ...ex, name: val });
    const s = searchExercises(val);
    setSuggs(s); setShowSugg(s.length > 0 && val.length > 1);
  };
  const pick = (s) => { onChange({ ...ex, name: s.name }); setSuggs([]); setShowSugg(false); setOpen(false); };

  return (
    <div style={{ background: 'white', border: '1.5px solid #E5E7EB', borderRadius: 12, marginBottom: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px' }}>
        <span style={{ width: 22, height: 22, borderRadius: 7, background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, color: '#3B82F6', flexShrink: 0 }}>{index + 1}</span>
        <div style={{ flex: 1, position: 'relative' }}>
          <input value={ex.name} onChange={e => handleName(e.target.value)}
            onBlur={() => setTimeout(() => setShowSugg(false), 150)}
            placeholder="Nome do exercício..."
            style={{ width: '100%', border: 'none', outline: 'none', fontSize: 14, fontWeight: 600, color: '#111827', background: 'transparent' }} />
          {showSugg && suggs.length > 0 && (
            <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'white', border: '1.5px solid #E5E7EB', borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.12)', zIndex: 60, maxHeight: 200, overflowY: 'auto' }}>
              {suggs.slice(0, 7).map((s, i) => (
                <button key={i} onMouseDown={() => pick(s)}
                  style={{ width: '100%', padding: '8px 12px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', fontSize: 13, display: 'flex', gap: 8, alignItems: 'center', borderBottom: '1px solid #F3F4F6' }}>
                  <span style={{ fontSize: 10, background: gc(s.group) + '20', color: gc(s.group), padding: '2px 6px', borderRadius: 20, fontWeight: 700, flexShrink: 0 }}>{s.group}</span>
                  <span style={{ color: '#111827' }}>{s.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        {!open && ex.name && <span style={{ fontSize: 11, color: '#9CA3AF', fontWeight: 600, flexShrink: 0 }}>{ex.sets}×{ex.reps}</span>}
        <button onClick={() => setOpen(v => !v)} style={{ padding: 6, border: 'none', background: 'none', cursor: 'pointer', color: '#9CA3AF', display: 'flex' }}>{open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}</button>
        <button onClick={onDelete} style={{ padding: 6, border: 'none', background: 'none', cursor: 'pointer', color: '#EF4444', display: 'flex' }}><Trash2 size={14} /></button>
      </div>
      {open && (
        <div style={{ padding: '4px 12px 14px', borderTop: '1px solid #F3F4F6' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 8 }}>
            {[['SÉRIES', 'sets', 'number'], ['REPS', 'reps', 'text'], ['CARGA', 'load', 'text']].map(([lbl, field, type]) => (
              <div key={field}>
                <label style={{ fontSize: 10, fontWeight: 700, color: '#9CA3AF', display: 'block', marginBottom: 3 }}>{lbl}</label>
                <input type={type} value={ex[field]} onChange={e => onChange({ ...ex, [field]: e.target.value })}
                  placeholder={field === 'load' ? '—' : ''} min={type === 'number' ? 1 : undefined}
                  style={{ width: '100%', padding: '7px 8px', border: '1.5px solid #E5E7EB', borderRadius: 8, fontSize: 14, fontWeight: 700, textAlign: 'center', boxSizing: 'border-box' }} />
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 6 }}>
            {REPS_Q.map(r => <button key={r} onClick={() => onChange({ ...ex, reps: r })} style={{ padding: '3px 8px', borderRadius: 20, fontSize: 11, fontWeight: 700, cursor: 'pointer', border: 'none', background: ex.reps === r ? '#EFF6FF' : '#F3F4F6', color: ex.reps === r ? '#3B82F6' : '#6B7280' }}>{r}</button>)}
          </div>
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: '#9CA3AF' }}>DESCANSO</span>
            {REST_Q.map(r => <button key={r} onClick={() => onChange({ ...ex, rest: r })} style={{ padding: '3px 8px', borderRadius: 20, fontSize: 11, fontWeight: 700, cursor: 'pointer', border: 'none', background: ex.rest === r ? '#F0FDF4' : '#F3F4F6', color: ex.rest === r ? '#10B981' : '#6B7280' }}>{r}</button>)}
          </div>
          <input value={ex.obs} onChange={e => onChange({ ...ex, obs: e.target.value })} placeholder="Observação (opcional)..."
            style={{ width: '100%', padding: '7px 10px', border: '1.5px solid #E5E7EB', borderRadius: 8, fontSize: 12, color: '#6B7280', boxSizing: 'border-box' }} />
        </div>
      )}
    </div>
  );
}

// ─── AIModal ──────────────────────────────────────────────────────────────────

function AIModal({ onApply, onClose }) {
  const [groups, setGroups] = useState([]);
  const [level,  setLevel]  = useState('Intermediário');
  const toggle = (g) => setGroups(p => p.includes(g) ? p.filter(x => x !== g) : [...p, g]);

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 400, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'white', borderRadius: 20, padding: 28, width: '100%', maxWidth: 420 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: 'linear-gradient(135deg, #8B5CF6, #3B82F6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Sparkles size={20} color="white" /></div>
          <div><h3 style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>Sugestão com IA</h3><p style={{ margin: 0, fontSize: 12, color: '#6B7280' }}>Gera exercícios pelo objetivo</p></div>
          <button onClick={onClose} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF' }}><X size={18} /></button>
        </div>
        <label style={{ fontSize: 12, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 8 }}>Grupos musculares</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 18 }}>
          {GROUPS.map(g => { const sel = groups.includes(g); const c = gc(g); return (
            <button key={g} onClick={() => toggle(g)} style={{ padding: '6px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700, cursor: 'pointer', border: `2px solid ${sel ? c : '#E5E7EB'}`, background: sel ? c + '18' : 'white', color: sel ? c : '#6B7280' }}>{g}</button>
          ); })}
        </div>
        <label style={{ fontSize: 12, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 8 }}>Nível</label>
        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          {Object.keys(AI_LEVELS).map(l => (
            <button key={l} onClick={() => setLevel(l)} style={{ flex: 1, padding: '10px 8px', borderRadius: 10, fontSize: 12, fontWeight: 700, cursor: 'pointer', border: `2px solid ${level === l ? '#8B5CF6' : '#E5E7EB'}`, background: level === l ? '#F5F3FF' : 'white', color: level === l ? '#7C3AED' : '#6B7280' }}>{l}</button>
          ))}
        </div>
        {groups.length > 0 && <div style={{ background: '#F5F3FF', borderRadius: 10, padding: '10px 14px', marginBottom: 16, fontSize: 12, color: '#7C3AED' }}>Vai gerar <strong>{AI_LEVELS[level]?.n} exercícios</strong> · {groups.join(' + ')} · {level}</div>}
        <button onClick={() => { if (!groups.length) return; onApply(genAI(groups, level)); onClose(); }} disabled={!groups.length}
          style={{ width: '100%', padding: '13px', borderRadius: 12, border: 'none', background: groups.length ? 'linear-gradient(135deg, #8B5CF6, #3B82F6)' : '#E5E7EB', color: groups.length ? 'white' : '#9CA3AF', fontSize: 14, fontWeight: 700, cursor: groups.length ? 'pointer' : 'not-allowed' }}>
          <Sparkles size={14} style={{ marginRight: 8, verticalAlign: 'middle' }} />Gerar exercícios
        </button>
      </div>
    </div>
  );
}

// ─── TemplateEditor (painel lateral) ─────────────────────────────────────────

function TemplateEditor({ item, mode = 'template', studentId, studentName, defaultDays, onSave, onClose }) {
  const isNew = !item?.id;
  const [name,   setName]  = useState(item?.name  || '');
  const [type,   setType]  = useState(item?.type  || 'Hipertrofia');
  const [days,   setDays]  = useState(item?.days  || defaultDays || []);
  const [exs,    setExs]   = useState(() => {
    const src = item?.exercises || [];
    const sorted = [...src].sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));
    return sorted.length ? sorted.map((e, i) => ({ ...e, id: e.id || Date.now() + i })) : [newEx(0)];
  });
  const [saving, setSaving] = useState(false);
  const [showAI, setShowAI] = useState(false);

  const toggleDay = (d)       => setDays(p => p.includes(d) ? p.filter(x => x !== d) : [...p, d]);
  const updateEx  = (i, upd)  => setExs(p => p.map((e, j) => j === i ? upd : e));
  const deleteEx  = (i)       => setExs(p => p.filter((_, j) => j !== i));

  const handleSave = async () => {
    if (!name.trim() || saving) return;
    const valid = exs.filter(e => e.name?.trim());
    if (!valid.length) return;
    setSaving(true);
    const ok = await onSave({ id: item?.id, name: name.trim(), type, days, exercises: valid, studentId: mode === 'plan' ? studentId : null });
    if (ok === false) setSaving(false);
  };

  const title = mode === 'template'
    ? (isNew ? 'Nova cartilha' : 'Editar cartilha')
    : (isNew ? `Novo treino — ${studentName}` : `Editar treino — ${studentName}`);

  const color = tc(type);

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 200 }} />
      <div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: '100%', maxWidth: 520, background: 'white', zIndex: 201, display: 'flex', flexDirection: 'column', boxShadow: '-8px 0 40px rgba(0,0,0,0.15)' }}>
        <div style={{ padding: '18px 22px', borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', display: 'flex', padding: 4 }}><X size={20} /></button>
          <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800, flex: 1 }}>{title}</h2>
          <button onClick={() => setShowAI(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg, #8B5CF6, #3B82F6)', color: 'white', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
            <Sparkles size={13} /> IA
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 22px' }}>
          <label style={{ fontSize: 11, fontWeight: 700, color: '#9CA3AF', display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Nome</label>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="ex: Treino A — Peito e Tríceps"
            style={{ width: '100%', padding: '11px 14px', border: '1.5px solid #E5E7EB', borderRadius: 10, fontSize: 15, fontWeight: 600, boxSizing: 'border-box', outline: 'none', marginBottom: 16 }} />

          <label style={{ fontSize: 11, fontWeight: 700, color: '#9CA3AF', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Tipo</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
            {PLAN_TYPES.map(t => { const c = tc(t); const sel = type === t; return (
              <button key={t} onClick={() => setType(t)} style={{ padding: '6px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700, cursor: 'pointer', border: `2px solid ${sel ? c : '#E5E7EB'}`, background: sel ? c + '18' : 'white', color: sel ? c : '#6B7280' }}>{t}</button>
            ); })}
          </div>

          {mode === 'template' && (
            <>
              <label style={{ fontSize: 11, fontWeight: 700, color: '#9CA3AF', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Dias sugeridos</label>
              <div style={{ display: 'flex', gap: 5, marginBottom: 20 }}>
                {DAYS.map(d => { const sel = days.includes(d.v); return (
                  <button key={d.v} onClick={() => toggleDay(d.v)} style={{ flex: 1, padding: '8px 4px', borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: 'pointer', border: `2px solid ${sel ? color : '#E5E7EB'}`, background: sel ? color + '18' : 'white', color: sel ? color : '#9CA3AF' }}>{d.s}</button>
                ); })}
              </div>
            </>
          )}

          <label style={{ fontSize: 11, fontWeight: 700, color: '#9CA3AF', display: 'block', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Exercícios ({exs.filter(e => e.name).length})</label>
          {exs.map((ex, i) => (
            <ExerciseRowEditor key={ex.id || i} ex={ex} index={i} onChange={upd => updateEx(i, upd)} onDelete={() => deleteEx(i)} />
          ))}
          <button onClick={() => setExs(p => [...p, newEx(p.length)])}
            style={{ width: '100%', padding: '11px', borderRadius: 10, border: '2px dashed #D1D5DB', background: 'none', fontSize: 13, fontWeight: 700, color: '#9CA3AF', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 4 }}>
            <Plus size={15} /> Adicionar exercício
          </button>
          <div style={{ height: 24 }} />
        </div>

        <div style={{ padding: '16px 22px', borderTop: '1px solid #F1F5F9' }}>
          <button onClick={handleSave} disabled={!name.trim() || saving}
            style={{ width: '100%', padding: '14px', borderRadius: 12, border: 'none', background: name.trim() ? `linear-gradient(135deg, ${color}, ${color}99)` : '#E5E7EB', color: name.trim() ? 'white' : '#9CA3AF', fontSize: 15, fontWeight: 800, cursor: name.trim() ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            {saving ? 'Salvando...' : <><Save size={16} /> {isNew ? (mode === 'template' ? 'Criar cartilha' : 'Salvar treino') : 'Salvar alterações'}</>}
          </button>
        </div>
      </div>
      {showAI && <AIModal onApply={newExs => setExs(newExs)} onClose={() => setShowAI(false)} />}
    </>
  );
}

// ─── DayCell ──────────────────────────────────────────────────────────────────

function DayCell({ plan, isTarget, onAdd, onEdit, onRemove }) {
  const [hov, setHov] = useState(false);

  if (!plan) {
    const active = isTarget || hov;
    return (
      <div onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)} onClick={onAdd}
        style={{ minHeight: 130, border: `2px ${isTarget ? 'solid #3B82F6' : `dashed ${hov ? '#93C5FD' : '#E5E7EB'}`}`, borderRadius: 12, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: isTarget ? '#EFF6FF' : hov ? '#F8FBFF' : 'transparent', boxShadow: isTarget ? '0 0 0 3px rgba(59,130,246,0.15)' : 'none', transition: 'all 0.15s', gap: 6 }}>
        <div style={{ width: 32, height: 32, borderRadius: '50%', background: active ? '#DBEAFE' : '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}>
          <Plus size={16} color={active ? '#3B82F6' : '#9CA3AF'} />
        </div>
        <span style={{ fontSize: 10, fontWeight: 700, color: active ? '#3B82F6' : '#D1D5DB', letterSpacing: '0.04em' }}>{isTarget ? 'Selecionado' : 'Adicionar'}</span>
      </div>
    );
  }

  const color   = tc(plan.type);
  const exCount = (plan.exercises || []).length;

  return (
    <div style={{ borderRadius: 12, overflow: 'hidden', border: '1.5px solid #F1F5F9', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', background: 'white', display: 'flex', flexDirection: 'column' }}>
      <div style={{ height: 5, background: `linear-gradient(90deg, ${color}, ${color}99)` }} />
      <div style={{ padding: '10px 10px 8px', flex: 1 }}>
        <span style={{ fontSize: 9, fontWeight: 800, color, textTransform: 'uppercase', letterSpacing: '0.07em', display: 'block', marginBottom: 3 }}>{plan.type}</span>
        <p style={{ margin: '0 0 5px', fontSize: 12, fontWeight: 700, color: '#111827', lineHeight: 1.3, wordBreak: 'break-word' }}>{plan.name}</p>
        <span style={{ fontSize: 10, color: '#9CA3AF' }}>{exCount} ex.</span>
      </div>
      <div style={{ display: 'flex', borderTop: '1px solid #F9FAFB' }}>
        <button onClick={e => { e.stopPropagation(); onEdit(); }} style={{ flex: 1, padding: '8px 4px', border: 'none', background: 'none', cursor: 'pointer', color: '#6B7280', fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3 }}>
          <Edit3 size={11} /> Editar
        </button>
        <div style={{ width: 1, background: '#F3F4F6' }} />
        <button onClick={e => { e.stopPropagation(); onRemove(); }} style={{ flex: 1, padding: '8px 4px', border: 'none', background: 'none', cursor: 'pointer', color: '#EF4444', fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3 }}>
          <Trash2 size={11} /> Remover
        </button>
      </div>
    </div>
  );
}

// ─── TemplateCard (biblioteca) ────────────────────────────────────────────────

function TemplateCard({ tpl, targeting, onSelect, onEdit, onAssignMultiple, onDelete }) {
  const [hov, setHov] = useState(false);
  const color   = tc(tpl.type);
  const exs     = [...(tpl.exercises || [])].sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));
  const preview = exs.slice(0, 4);
  const extra   = exs.length - 4;

  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      onClick={targeting ? onSelect : undefined}
      style={{ background: targeting && hov ? color + '08' : 'white', borderRadius: 14, overflow: 'hidden', border: targeting ? `2px solid ${hov ? color : '#E5E7EB'}` : '1.5px solid #F1F5F9', boxShadow: targeting && hov ? `0 6px 20px ${color}25` : '0 2px 8px rgba(0,0,0,0.06)', cursor: targeting ? 'pointer' : 'default', transition: 'all 0.15s', display: 'flex', flexDirection: 'column' }}>
      <div style={{ height: 5, background: `linear-gradient(90deg, ${color}, ${color}99)` }} />
      <div style={{ padding: '12px 14px 10px', flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 6, marginBottom: 8 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <span style={{ fontSize: 9, fontWeight: 800, color, textTransform: 'uppercase', letterSpacing: '0.07em', display: 'block', marginBottom: 2 }}>{tpl.type}</span>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tpl.name || 'Sem nome'}</p>
          </div>
          <button onClick={e => { e.stopPropagation(); onDelete(); }}
            style={{ flexShrink: 0, background: 'none', border: 'none', cursor: 'pointer', color: '#E5E7EB', padding: 3, display: 'flex', transition: 'color 0.1s' }}
            onMouseEnter={e => e.currentTarget.style.color = '#EF4444'}
            onMouseLeave={e => e.currentTarget.style.color = '#E5E7EB'}>
            <Trash2 size={13} />
          </button>
        </div>
        {preview.map((ex, i) => (
          <div key={i} style={{ display: 'flex', gap: 6, padding: '2px 0' }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: '#D1D5DB', width: 14, textAlign: 'right', flexShrink: 0 }}>{i + 1}</span>
            <span style={{ fontSize: 11, color: '#6B7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{ex.name}</span>
            <span style={{ fontSize: 10, color: '#9CA3AF', fontWeight: 600, flexShrink: 0 }}>{ex.sets}×{ex.reps}</span>
          </div>
        ))}
        {extra > 0 && <p style={{ margin: '3px 0 0', fontSize: 10, color: '#C4C9D4', fontStyle: 'italic' }}>+{extra} mais</p>}
      </div>
      <div style={{ padding: '8px 14px 12px', borderTop: '1px solid #F9FAFB' }}>
        {targeting ? (
          <button onClick={onSelect}
            style={{ width: '100%', padding: '9px', borderRadius: 9, border: 'none', background: hov ? `linear-gradient(135deg, ${color}, ${color}cc)` : '#F3F4F6', color: hov ? 'white' : '#9CA3AF', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, transition: 'all 0.15s' }}>
            <Check size={13} /> Usar neste dia
          </button>
        ) : (
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={e => { e.stopPropagation(); onEdit(); }}
              style={{ flex: 1, padding: '8px', borderRadius: 8, border: '1.5px solid #E5E7EB', background: 'white', fontSize: 12, fontWeight: 700, color: '#374151', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
              <Edit3 size={12} /> Editar
            </button>
            <button onClick={e => { e.stopPropagation(); onAssignMultiple(); }}
              style={{ flex: 1, padding: '8px', borderRadius: 8, border: 'none', background: `linear-gradient(135deg, ${color}, ${color}cc)`, fontSize: 12, fontWeight: 700, color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
              <Send size={11} /> Atribuir
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── AssignModal (atribuir para múltiplos alunos) ─────────────────────────────

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
      <div onClick={e => e.stopPropagation()} style={{ background: 'white', borderRadius: 20, padding: 26, width: '100%', maxWidth: 440, maxHeight: '90vh', overflowY: 'auto' }}>
        {done ? (
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#D1FAE5', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}><Check size={26} color="#10B981" strokeWidth={3} /></div>
            <p style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>Atribuído!</p>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: '#6B7280' }}>Alunos já podem ver no app</p>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
              <div><h3 style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>Atribuir para alunos</h3><p style={{ margin: '2px 0 0', fontSize: 12, color: '#6B7280' }}>{tpl.name}</p></div>
              <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF' }}><X size={18} /></button>
            </div>
            <label style={{ fontSize: 11, fontWeight: 700, color: '#9CA3AF', display: 'block', marginBottom: 7, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Dias da semana</label>
            <div style={{ display: 'flex', gap: 5, marginBottom: 18 }}>
              {DAYS.map(d => { const sel = days.includes(d.v); return (
                <button key={d.v} onClick={() => setDays(p => p.includes(d.v) ? p.filter(x => x !== d.v) : [...p, d.v])} style={{ flex: 1, padding: '8px 4px', borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: 'pointer', border: `2px solid ${sel ? '#3B82F6' : '#E5E7EB'}`, background: sel ? '#EFF6FF' : 'white', color: sel ? '#3B82F6' : '#9CA3AF' }}>{d.s}</button>
              ); })}
            </div>
            <label style={{ fontSize: 11, fontWeight: 700, color: '#9CA3AF', display: 'block', marginBottom: 7, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Alunos</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 220, overflowY: 'auto', marginBottom: 18 }}>
              {students.length === 0 ? <p style={{ fontSize: 13, color: '#9CA3AF', textAlign: 'center', padding: 20 }}>Nenhum aluno ativo</p>
                : students.map(s => { const sel = picked.includes(s.id); return (
                <button key={s.id} onClick={() => setPicked(p => p.includes(s.id) ? p.filter(x => x !== s.id) : [...p, s.id])} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 10, border: `2px solid ${sel ? '#3B82F6' : '#E5E7EB'}`, background: sel ? '#EFF6FF' : 'white', cursor: 'pointer', textAlign: 'left' }}>
                  <div style={{ width: 30, height: 30, borderRadius: '50%', background: s.color || '#CBD5E1', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><span style={{ fontSize: 11, fontWeight: 800, color: 'white' }}>{s.initials || s.name?.[0]}</span></div>
                  <span style={{ flex: 1, fontSize: 14, fontWeight: 600, color: '#111827' }}>{s.name}</span>
                  {sel && <Check size={15} color="#3B82F6" strokeWidth={3} />}
                </button>
              ); })}
            </div>
            <button onClick={handle} disabled={!picked.length || !days.length || saving}
              style={{ width: '100%', padding: '13px', borderRadius: 12, border: 'none', background: picked.length && days.length ? 'linear-gradient(135deg, #3B82F6, #8B5CF6)' : '#E5E7EB', color: picked.length && days.length ? 'white' : '#9CA3AF', fontSize: 14, fontWeight: 700, cursor: picked.length && days.length ? 'pointer' : 'not-allowed' }}>
              {saving ? 'Salvando...' : `Atribuir para ${picked.length || '...'} aluno${picked.length !== 1 ? 's' : ''}`}
            </button>
          </>
        )}
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
  const [targetDay,   setTargetDay]   = useState(null);
  const [editor,      setEditor]      = useState(null);
  const [assignModal, setAssignModal] = useState(null);
  const [search,      setSearch]      = useState('');

  const templatesRef = useRef(null);
  const todayDow     = new Date().getDay();

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

  const saveItem = async ({ id, name, type, days, exercises, studentId }) => {
    if (!hasSupabase) return false;
    const isTemplate = studentId === null || studentId === undefined;
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
          if (isTemplate) setTemplates(prev => [full, ...prev]);
          else setPlans(prev => [full, ...prev]);
        }
      }
    } catch (err) {
      alert('Erro ao salvar: ' + (err?.message || 'Tente novamente'));
      return false;
    }
    setEditor(null);
    return true;
  };

  const deleteItem = async (item, isTemplate) => {
    if (!window.confirm(`Excluir "${item.name}"?`)) return;
    if (hasSupabase) await supabase.from('training_plans').delete().eq('id', item.id);
    if (isTemplate) setTemplates(prev => prev.filter(t => t.id !== item.id));
    else setPlans(prev => prev.filter(p => p.id !== item.id));
  };

  const assignTemplate = async (tpl, studentIds, selectedDays) => {
    if (!hasSupabase) return;
    const exs = [...(tpl.exercises || [])].sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));
    for (const sid of studentIds) {
      const overlapping = plans.filter(p => p.student_id === sid && (p.days || []).some(d => selectedDays.includes(d)));
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
  };

  // ── Handlers ─────────────────────────────────────────────────────────────────

  const handleDayClick = (day) => {
    setTargetDay(prev => prev?.v === day.v ? null : day);
    setTimeout(() => templatesRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60);
  };

  const handleTemplateSelect = async (tpl) => {
    if (!targetDay || !selStudent) return;
    await assignTemplate(tpl, [selStudent], [targetDay.v]);
    setTargetDay(null);
  };

  // ── Dados computados ─────────────────────────────────────────────────────────

  const selectedStudent  = students.find(s => s.id === selStudent);
  const studentPlans     = plans.filter(p => p.student_id === selStudent);
  const byDay            = {};
  studentPlans.forEach(p => (p.days || []).forEach(d => { byDay[d] = p; }));
  const activeDays       = Object.keys(byDay).length;

  const filtered = templates.filter(t =>
    !search || t.name?.toLowerCase().includes(search.toLowerCase()) || t.type?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300 }}>
      <Dumbbell size={32} color="#D1D5DB" />
    </div>
  );

  return (
    <div className="page-padding" style={{ flex: 1 }}>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#111827' }}>Treinos</h2>
          <p style={{ margin: '3px 0 0', fontSize: 13, color: '#9CA3AF' }}>
            {students.length} aluno{students.length !== 1 ? 's' : ''} · {templates.length} cartilha{templates.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button onClick={() => setEditor({ item: null, mode: 'template' })}
          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg, #3B82F6, #8B5CF6)', color: 'white', fontSize: 13, fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 14px rgba(59,130,246,0.3)' }}>
          <Plus size={16} /> Nova cartilha
        </button>
      </div>

      {students.length === 0 ? (
        <div style={{ background: 'white', borderRadius: 16, padding: '60px 24px', textAlign: 'center', border: '2px dashed #E5E7EB', marginBottom: 32 }}>
          <div style={{ width: 56, height: 56, borderRadius: 14, background: '#F0FFF4', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}><Users size={26} color="#10B981" /></div>
          <h3 style={{ margin: '0 0 6px', fontSize: 17, fontWeight: 800 }}>Sem alunos ativos</h3>
          <p style={{ margin: 0, fontSize: 13, color: '#9CA3AF' }}>Cadastre alunos para montar a semana de treino deles</p>
        </div>
      ) : (
        <>
          {/* ── Seletor de aluno ─────────────────────────────────────────── */}
          <div style={{ display: 'flex', gap: 8, overflowX: 'auto', marginBottom: 20, paddingBottom: 4 }}>
            {students.map(s => {
              const sel = selStudent === s.id;
              const cnt = plans.filter(p => p.student_id === s.id).length;
              return (
                <button key={s.id} onClick={() => { setSelStudent(s.id); setTargetDay(null); }}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 14px 7px 8px', borderRadius: 40, border: `2px solid ${sel ? '#3B82F6' : '#E5E7EB'}`, background: sel ? '#EFF6FF' : 'white', cursor: 'pointer', flexShrink: 0, transition: 'all 0.15s' }}>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: s.color || '#CBD5E1', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <span style={{ fontSize: 10, fontWeight: 800, color: 'white' }}>{s.initials || s.name?.[0]}</span>
                  </div>
                  <div style={{ textAlign: 'left' }}>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: sel ? 700 : 500, color: sel ? '#1D4ED8' : '#374151', whiteSpace: 'nowrap' }}>{s.name}</p>
                    {cnt > 0 && <p style={{ margin: 0, fontSize: 10, color: '#9CA3AF' }}>{cnt} treino{cnt !== 1 ? 's' : ''}/sem</p>}
                  </div>
                </button>
              );
            })}
          </div>

          {/* ── Grid semanal ─────────────────────────────────────────────── */}
          {selectedStudent && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <div>
                  <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#111827' }}>Semana de {selectedStudent.name}</p>
                  <p style={{ margin: '2px 0 0', fontSize: 12, color: '#9CA3AF' }}>
                    {activeDays === 0 ? 'Clique em um dia para adicionar treino' : `${activeDays} dia${activeDays !== 1 ? 's' : ''} com treino`}
                  </p>
                </div>
                <button onClick={() => setEditor({ item: null, mode: 'plan', studentId: selStudent, studentName: selectedStudent.name })}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 13px', borderRadius: 9, border: '1.5px solid #E5E7EB', background: 'white', fontSize: 12, fontWeight: 700, color: '#374151', cursor: 'pointer' }}>
                  <Plus size={13} /> Do zero
                </button>
              </div>

              <div style={{ overflowX: 'auto', marginBottom: 32 }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(108px, 1fr))', gap: 10, minWidth: 790 }}>
                  {DAYS.map(d => {
                    const plan    = byDay[d.v];
                    const isToday = d.v === todayDow;
                    const isTgt   = targetDay?.v === d.v;
                    return (
                      <div key={d.v}>
                        <div style={{ textAlign: 'center', marginBottom: 7, padding: '5px 4px', borderRadius: 8, background: isToday ? '#EFF6FF' : 'transparent' }}>
                          <span style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: isToday ? '#3B82F6' : plan ? '#374151' : '#9CA3AF' }}>{d.s}</span>
                          {isToday && <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#3B82F6', margin: '2px auto 0' }} />}
                        </div>
                        <DayCell
                          plan={plan}
                          isTarget={!plan && isTgt}
                          onAdd={() => handleDayClick(d)}
                          onEdit={() => setEditor({ item: plan, mode: 'plan', studentId: selStudent, studentName: selectedStudent.name })}
                          onRemove={() => deleteItem(plan, false)}
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

      {/* ── Biblioteca de cartilhas ───────────────────────────────────────── */}
      <div ref={templatesRef}>
        {/* Banner de seleção */}
        {targetDay && selectedStudent && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', borderRadius: 12, background: '#EFF6FF', border: '1.5px solid #BFDBFE', marginBottom: 16 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#3B82F6', flexShrink: 0, animation: 'pulse 1.5s infinite' }} />
            <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#1D4ED8', flex: 1 }}>
              Escolha uma cartilha para <strong>{targetDay.full}</strong> de {selectedStudent.name}
            </p>
            <button onClick={() => setTargetDay(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#93C5FD', display: 'flex', padding: 2 }}><X size={16} /></button>
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 14, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <BookOpen size={16} color="#8B5CF6" />
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: '#111827' }}>
              {targetDay ? 'Suas cartilhas — clique para atribuir' : 'Suas cartilhas'}
            </h3>
            {templates.length > 0 && <span style={{ fontSize: 11, fontWeight: 700, color: '#9CA3AF', background: '#F3F4F6', padding: '2px 8px', borderRadius: 20 }}>{templates.length}</span>}
          </div>
          <div style={{ position: 'relative' }}>
            <Search size={13} color="#9CA3AF" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar..."
              style={{ padding: '7px 12px 7px 30px', border: '1.5px solid #E5E7EB', borderRadius: 9, fontSize: 13, outline: 'none', width: 160 }} />
          </div>
        </div>

        {templates.length === 0 ? (
          <div style={{ background: 'white', borderRadius: 16, padding: '48px 24px', textAlign: 'center', border: '2px dashed #E5E7EB' }}>
            <div style={{ width: 54, height: 54, borderRadius: 14, background: 'linear-gradient(135deg, #EFF6FF, #F5F3FF)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}><BookOpen size={24} color="#8B5CF6" /></div>
            <h3 style={{ margin: '0 0 6px', fontSize: 16, fontWeight: 800 }}>Nenhuma cartilha ainda</h3>
            <p style={{ margin: '0 0 20px', fontSize: 13, color: '#6B7280' }}>Crie cartilhas de treino e use a IA para sugerir exercícios</p>
            <button onClick={() => setEditor({ item: null, mode: 'template' })}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '11px 22px', borderRadius: 11, border: 'none', background: 'linear-gradient(135deg, #3B82F6, #8B5CF6)', color: 'white', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
              <Plus size={15} /> Criar primeira cartilha
            </button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12 }}>
            {filtered.map(t => (
              <TemplateCard key={t.id} tpl={t}
                targeting={!!targetDay}
                onSelect={() => handleTemplateSelect(t)}
                onEdit={() => setEditor({ item: t, mode: 'template' })}
                onAssignMultiple={() => setAssignModal(t)}
                onDelete={() => deleteItem(t, true)} />
            ))}
          </div>
        )}
      </div>

      {/* ── Modais ─────────────────────────────────────────────────────────── */}
      {editor !== null && (
        <TemplateEditor
          item={editor.item}
          mode={editor.mode}
          studentId={editor.studentId}
          studentName={editor.studentName}
          defaultDays={editor.defaultDays}
          onSave={saveItem}
          onClose={() => setEditor(null)} />
      )}
      {assignModal && (
        <AssignModal tpl={assignModal} students={students} onAssign={assignTemplate} onClose={() => setAssignModal(null)} />
      )}
    </div>
  );
}
