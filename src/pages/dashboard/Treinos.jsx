import { useState, useEffect } from 'react';
import {
  Plus, Dumbbell, X, Save, Trash2, Sparkles, Check, Send,
  BookOpen, Users, ChevronDown, ChevronUp, Search, Edit3
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { supabase, hasSupabase } from '../../lib/supabase';
import { searchExercises, EXERCISE_LIBRARY } from '../../data/exerciseLibrary';

// ─── Constantes ───────────────────────────────────────────────────────────────

const DAYS = [
  { v: 1, s: 'Seg' }, { v: 2, s: 'Ter' }, { v: 3, s: 'Qua' },
  { v: 4, s: 'Qui' }, { v: 5, s: 'Sex' }, { v: 6, s: 'Sáb' }, { v: 0, s: 'Dom' },
];
const PLAN_TYPES = ['Hipertrofia', 'Força', 'Resistência', 'Funcional', 'Cardio', 'Mobilidade', 'Emagrecimento'];
const GROUPS     = ['Peito', 'Costas', 'Pernas', 'Glúteos', 'Ombro', 'Braços', 'Abdômen', 'Full Body', 'Cardio'];
const TYPE_CLR   = { Hipertrofia: '#8B5CF6', Força: '#EF4444', Resistência: '#3B82F6', Funcional: '#10B981', Cardio: '#F59E0B', Mobilidade: '#06B6D4', Emagrecimento: '#F97316' };
const GROUP_CLR  = { Peito: '#EF4444', Costas: '#3B82F6', Pernas: '#8B5CF6', Glúteos: '#EC4899', Ombro: '#F59E0B', Braços: '#10B981', Abdômen: '#06B6D4', 'Full Body': '#F97316', Cardio: '#6366F1' };
const REPS_Q     = ['6', '8', '10', '12', '15', '20', 'Falha'];
const REST_Q     = ['30s', '45s', '60s', '75s', '90s', '2min'];
const AI_LEVELS  = {
  'Iniciante':     { sets: '3', reps: '12', rest: '60s',  n: 5 },
  'Intermediário': { sets: '4', reps: '10', rest: '75s',  n: 6 },
  'Avançado':      { sets: '4', reps: '8',  rest: '90s',  n: 7 },
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
  const [suggs, setSuggs]       = useState([]);
  const [open, setOpen]         = useState(!ex.name);

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
  const [level, setLevel]   = useState('Intermediário');
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

// ─── TemplateEditor ───────────────────────────────────────────────────────────

function TemplateEditor({ item, mode = 'template', studentId, studentName, onSave, onClose }) {
  const isNew = !item?.id;
  const [name,  setName]  = useState(item?.name  || '');
  const [type,  setType]  = useState(item?.type  || 'Hipertrofia');
  const [days,  setDays]  = useState(item?.days  || []);
  const [exs,   setExs]   = useState(() => {
    const src = item?.exercises || [];
    const sorted = [...src].sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));
    return sorted.length ? sorted.map((e, i) => ({ ...e, id: e.id || Date.now() + i })) : [newEx(0)];
  });
  const [saving, setSaving] = useState(false);
  const [showAI, setShowAI] = useState(false);

  const toggleDay = (d) => setDays(p => p.includes(d) ? p.filter(x => x !== d) : [...p, d]);
  const updateEx  = (i, upd) => setExs(p => p.map((e, j) => j === i ? upd : e));
  const deleteEx  = (i) => setExs(p => p.filter((_, j) => j !== i));

  const handleSave = async () => {
    if (!name.trim() || saving) return;
    const valid = exs.filter(e => e.name?.trim());
    if (!valid.length) return;
    setSaving(true);
    await onSave({ id: item?.id, name: name.trim(), type, days, exercises: valid, studentId: mode === 'plan' ? studentId : null });
    setSaving(false);
  };

  const panelTitle = mode === 'template'
    ? (isNew ? 'Nova cartilha' : 'Editar cartilha')
    : (isNew ? `Novo treino — ${studentName || ''}` : `Editar treino — ${studentName || ''}`);

  const color = tc(type);

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 200 }} />
      <div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: '100%', maxWidth: 520, background: 'white', zIndex: 201, display: 'flex', flexDirection: 'column', boxShadow: '-8px 0 40px rgba(0,0,0,0.15)' }}>

        <div style={{ padding: '18px 22px', borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', display: 'flex', padding: 4 }}><X size={20} /></button>
          <div style={{ flex: 1 }}>
            <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800 }}>{panelTitle}</h2>
            {mode === 'plan' && <p style={{ margin: '1px 0 0', fontSize: 11, color: '#9CA3AF' }}>Treino específico do aluno — não afeta as cartilhas</p>}
          </div>
          <button onClick={() => setShowAI(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg, #8B5CF6, #3B82F6)', color: 'white', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
            <Sparkles size={13} /> IA
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 22px' }}>
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: '#9CA3AF', display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Nome</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="ex: Treino A — Peito e Tríceps"
              style={{ width: '100%', padding: '11px 14px', border: '1.5px solid #E5E7EB', borderRadius: 10, fontSize: 15, fontWeight: 600, boxSizing: 'border-box', outline: 'none' }} />
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: '#9CA3AF', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Tipo</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {PLAN_TYPES.map(t => { const c = tc(t); const sel = type === t; return (
                <button key={t} onClick={() => setType(t)} style={{ padding: '6px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700, cursor: 'pointer', border: `2px solid ${sel ? c : '#E5E7EB'}`, background: sel ? c + '18' : 'white', color: sel ? c : '#6B7280' }}>{t}</button>
              ); })}
            </div>
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: '#9CA3AF', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Dias da semana</label>
            <div style={{ display: 'flex', gap: 5 }}>
              {DAYS.map(d => { const sel = days.includes(d.v); return (
                <button key={d.v} onClick={() => toggleDay(d.v)} style={{ flex: 1, padding: '8px 4px', borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: 'pointer', border: `2px solid ${sel ? color : '#E5E7EB'}`, background: sel ? color + '18' : 'white', color: sel ? color : '#9CA3AF' }}>{d.s}</button>
              ); })}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Exercícios ({exs.filter(e => e.name).length})</label>
          </div>
          {exs.map((ex, i) => (
            <ExerciseRowEditor key={ex.id || i} ex={ex} index={i} onChange={upd => updateEx(i, upd)} onDelete={() => deleteEx(i)} />
          ))}
          <button onClick={() => setExs(p => [...p, newEx(p.length)])}
            style={{ width: '100%', padding: '11px', borderRadius: 10, border: '2px dashed #D1D5DB', background: 'none', fontSize: 13, fontWeight: 700, color: '#9CA3AF', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 4 }}>
            <Plus size={15} /> Adicionar exercício
          </button>
          <div style={{ height: 24 }} />
        </div>

        <div style={{ padding: '16px 22px', borderTop: '1px solid #F1F5F9', background: 'white' }}>
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

// ─── TemplateCard ─────────────────────────────────────────────────────────────

function TemplateCard({ tpl, onEdit, onAssign, onDelete }) {
  const exs     = [...(tpl.exercises || [])].sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));
  const color   = tc(tpl.type);
  const dayLbls = (tpl.days || []).map(d => DAYS.find(x => x.v === d)?.s).filter(Boolean);
  const preview = exs.slice(0, 5);
  const extra   = exs.length - 5;

  return (
    <div style={{ background: 'white', borderRadius: 16, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.07)', border: '1px solid #F1F5F9', display: 'flex', flexDirection: 'column' }}>
      <div style={{ background: `linear-gradient(135deg, ${color}, ${color}bb)`, padding: '14px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 3 }}>
              <Dumbbell size={12} color="rgba(255,255,255,0.75)" />
              <span style={{ fontSize: 10, fontWeight: 800, color: 'rgba(255,255,255,0.75)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{tpl.type}</span>
            </div>
            <h3 style={{ margin: '0 0 6px', fontSize: 16, fontWeight: 900, color: 'white', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tpl.name || 'Sem nome'}</h3>
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              {dayLbls.length ? dayLbls.map(d => (
                <span key={d} style={{ fontSize: 10, fontWeight: 700, color: 'white', background: 'rgba(255,255,255,0.2)', padding: '2px 7px', borderRadius: 20 }}>{d}</span>
              )) : <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)' }}>Sem dia</span>}
            </div>
          </div>
          <button onClick={() => onDelete(tpl)} style={{ background: 'rgba(255,255,255,0.18)', border: 'none', borderRadius: 8, padding: 6, cursor: 'pointer', color: 'white', display: 'flex' }}><Trash2 size={13} /></button>
        </div>
      </div>

      <div style={{ flex: 1, padding: '12px 16px 0' }}>
        {exs.length === 0 ? (
          <p style={{ margin: 0, fontSize: 12, color: '#9CA3AF', textAlign: 'center', padding: '18px 0' }}>Sem exercícios</p>
        ) : (
          <>
            {preview.map((ex, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'baseline', gap: 7, padding: '4px 0', borderBottom: i < preview.length - 1 || extra > 0 ? '1px solid #F9FAFB' : 'none' }}>
                <span style={{ width: 16, fontSize: 10, fontWeight: 800, color: '#D1D5DB', flexShrink: 0, textAlign: 'right' }}>{i + 1}</span>
                <span style={{ flex: 1, fontSize: 13, fontWeight: 500, color: '#374151', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ex.name || '—'}</span>
                <span style={{ fontSize: 11, color: '#9CA3AF', fontWeight: 600, flexShrink: 0 }}>{ex.sets}×{ex.reps}</span>
              </div>
            ))}
            {extra > 0 && <p style={{ margin: '5px 0 0', fontSize: 11, color: '#9CA3AF', fontStyle: 'italic' }}>+{extra} mais</p>}
          </>
        )}
      </div>

      <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid #F3F4F6', marginTop: 12 }}>
        <span style={{ fontSize: 11, color: '#9CA3AF', fontWeight: 600 }}>{exs.length} exercício{exs.length !== 1 ? 's' : ''}</span>
        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={() => onEdit(tpl)} style={{ padding: '6px 12px', borderRadius: 8, border: '1.5px solid #E5E7EB', background: 'white', fontSize: 12, fontWeight: 700, color: '#374151', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
            <Edit3 size={12} /> Editar
          </button>
          <button onClick={() => onAssign(tpl)} style={{ padding: '6px 12px', borderRadius: 8, border: 'none', background: `linear-gradient(135deg, ${color}, ${color}bb)`, fontSize: 12, fontWeight: 700, color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
            <Send size={11} /> Atribuir
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── AssignModal ──────────────────────────────────────────────────────────────

function AssignModal({ tpl, students, onAssign, onClose }) {
  const [picked, setPicked]  = useState([]);
  const [days,   setDays]    = useState(tpl.days || []);
  const [saving, setSaving]  = useState(false);
  const [done,   setDone]    = useState(false);
  const toggle    = (id) => setPicked(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);
  const toggleDay = (d)  => setDays(p => p.includes(d)  ? p.filter(x => x !== d)  : [...p, d]);

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
            <p style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>Treino atribuído!</p>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: '#6B7280' }}>Os alunos já podem ver no app</p>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>Atribuir treino</h3>
                <p style={{ margin: '2px 0 0', fontSize: 12, color: '#6B7280' }}>{tpl.name}</p>
              </div>
              <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF' }}><X size={18} /></button>
            </div>
            <label style={{ fontSize: 11, fontWeight: 700, color: '#9CA3AF', display: 'block', marginBottom: 7, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Dias da semana</label>
            <div style={{ display: 'flex', gap: 5, marginBottom: 18 }}>
              {DAYS.map(d => { const sel = days.includes(d.v); return (
                <button key={d.v} onClick={() => toggleDay(d.v)} style={{ flex: 1, padding: '8px 4px', borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: 'pointer', border: `2px solid ${sel ? '#3B82F6' : '#E5E7EB'}`, background: sel ? '#EFF6FF' : 'white', color: sel ? '#3B82F6' : '#9CA3AF' }}>{d.s}</button>
              ); })}
            </div>
            <label style={{ fontSize: 11, fontWeight: 700, color: '#9CA3AF', display: 'block', marginBottom: 7, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Alunos</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 240, overflowY: 'auto', marginBottom: 18 }}>
              {students.length === 0 ? <p style={{ fontSize: 13, color: '#9CA3AF', textAlign: 'center', padding: 20 }}>Nenhum aluno ativo</p> : students.map(s => { const sel = picked.includes(s.id); return (
                <button key={s.id} onClick={() => toggle(s.id)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 10, border: `2px solid ${sel ? '#3B82F6' : '#E5E7EB'}`, background: sel ? '#EFF6FF' : 'white', cursor: 'pointer', textAlign: 'left' }}>
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

// ─── WeekBar ──────────────────────────────────────────────────────────────────

function WeekBar({ plans }) {
  const byDay = {};
  plans.forEach(p => (p.days || []).forEach(d => { byDay[d] = p; }));
  return (
    <div style={{ display: 'flex', gap: 5, marginBottom: 20 }}>
      {DAYS.map(d => {
        const p = byDay[d.v];
        const c = p ? tc(p.type) : null;
        return (
          <div key={d.v} style={{ flex: 1, textAlign: 'center', padding: '7px 4px', borderRadius: 8, background: c ? c + '14' : '#F9FAFB', border: `1.5px solid ${c ? c + '40' : '#E5E7EB'}` }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: c || '#C4C9D4' }}>{d.s}</div>
            {c && <div style={{ width: 5, height: 5, borderRadius: '50%', background: c, margin: '3px auto 0' }} />}
          </div>
        );
      })}
    </div>
  );
}

// ─── StudentPlanCard ──────────────────────────────────────────────────────────

function StudentPlanCard({ plan, onEdit, onDelete }) {
  const [expanded, setExpanded] = useState(false);
  const exs     = [...(plan.exercises || [])].sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));
  const color   = tc(plan.type);
  const dayLbls = (plan.days || []).map(d => DAYS.find(x => x.v === d)?.s).filter(Boolean);

  return (
    <div style={{ background: 'white', borderRadius: 12, border: '1.5px solid #E5E7EB', overflow: 'hidden', marginBottom: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 14px' }}>
        <div style={{ width: 38, height: 38, borderRadius: 10, background: color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Dumbbell size={18} color={color} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 10, fontWeight: 800, color, background: color + '18', padding: '1px 7px', borderRadius: 20 }}>{plan.type}</span>
            {dayLbls.map(d => <span key={d} style={{ fontSize: 10, fontWeight: 700, color: '#6B7280', background: '#F3F4F6', padding: '1px 6px', borderRadius: 20 }}>{d}</span>)}
          </div>
          <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{plan.name}</p>
          <p style={{ margin: '1px 0 0', fontSize: 11, color: '#9CA3AF' }}>{exs.length} exercício{exs.length !== 1 ? 's' : ''}</p>
        </div>
        <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
          <button onClick={() => setExpanded(v => !v)} style={{ padding: 7, border: '1.5px solid #E5E7EB', borderRadius: 8, background: 'white', cursor: 'pointer', color: '#6B7280', display: 'flex' }}>{expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}</button>
          <button onClick={() => onEdit(plan)} style={{ padding: 7, border: '1.5px solid #E5E7EB', borderRadius: 8, background: 'white', cursor: 'pointer', color: '#374151', display: 'flex' }}><Edit3 size={14} /></button>
          <button onClick={() => onDelete(plan)} style={{ padding: 7, border: '1.5px solid #FEE2E2', borderRadius: 8, background: '#FEF2F2', cursor: 'pointer', color: '#EF4444', display: 'flex' }}><Trash2 size={14} /></button>
        </div>
      </div>
      {expanded && exs.length > 0 && (
        <div style={{ borderTop: '1px solid #F3F4F6', padding: '8px 14px 12px 62px' }}>
          {exs.map((ex, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'baseline', gap: 8, padding: '3px 0' }}>
              <span style={{ width: 16, fontSize: 10, fontWeight: 800, color: '#D1D5DB', flexShrink: 0, textAlign: 'right' }}>{i + 1}</span>
              <span style={{ flex: 1, fontSize: 12, color: '#374151' }}>{ex.name}</span>
              <span style={{ fontSize: 11, color: '#9CA3AF', fontWeight: 600, flexShrink: 0 }}>{ex.sets}×{ex.reps}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── PickTemplateModal ────────────────────────────────────────────────────────

function PickTemplateModal({ templates, student, onAssign, onClose }) {
  const [step, setStep]     = useState('pick');
  const [chosen, setChosen] = useState(null);
  const [days, setDays]     = useState([]);
  const [saving, setSaving] = useState(false);
  const [done, setDone]     = useState(false);

  const handleConfirm = async () => {
    if (!days.length || saving) return;
    setSaving(true);
    await onAssign(chosen, [student.id], days);
    setSaving(false); setDone(true); setTimeout(onClose, 1200);
  };

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 350, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'white', borderRadius: 20, padding: 26, width: '100%', maxWidth: 460, maxHeight: '88vh', overflowY: 'auto' }}>
        {done ? (
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#D1FAE5', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}><Check size={26} color="#10B981" strokeWidth={3} /></div>
            <p style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>Treino atribuído!</p>
          </div>
        ) : step === 'pick' ? (
          <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>Escolher cartilha</h3>
                <p style={{ margin: '2px 0 0', fontSize: 12, color: '#6B7280' }}>Para {student.name}</p>
              </div>
              <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF' }}><X size={18} /></button>
            </div>
            {templates.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px 0', color: '#9CA3AF', fontSize: 13 }}>Nenhuma cartilha criada ainda.<br />Crie uma na aba Cartilhas primeiro.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {templates.map(t => { const c = tc(t.type); return (
                  <button key={t.id} onClick={() => { setChosen(t); setDays(t.days || []); setStep('days'); }}
                    style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 12, border: '1.5px solid #E5E7EB', background: 'white', cursor: 'pointer', textAlign: 'left' }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = c}
                    onMouseLeave={e => e.currentTarget.style.borderColor = '#E5E7EB'}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: c + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Dumbbell size={18} color={c} /></div>
                    <div style={{ flex: 1 }}>
                      <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#111827' }}>{t.name}</p>
                      <p style={{ margin: '2px 0 0', fontSize: 11, color: '#9CA3AF' }}>{t.type} · {(t.exercises || []).length} exercícios</p>
                    </div>
                    <ChevronDown size={16} color="#9CA3AF" style={{ transform: 'rotate(-90deg)', flexShrink: 0 }} />
                  </button>
                ); })}
              </div>
            )}
          </>
        ) : (
          <>
            <button onClick={() => setStep('pick')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#3B82F6', fontSize: 13, fontWeight: 700, marginBottom: 14, padding: 0 }}>← Voltar</button>
            <h3 style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 800 }}>{chosen?.name}</h3>
            <p style={{ margin: '0 0 16px', fontSize: 12, color: '#6B7280' }}>Qual dia(s) da semana?</p>
            <div style={{ display: 'flex', gap: 5, marginBottom: 20 }}>
              {DAYS.map(d => { const sel = days.includes(d.v); return (
                <button key={d.v} onClick={() => setDays(p => p.includes(d.v) ? p.filter(x => x !== d.v) : [...p, d.v])} style={{ flex: 1, padding: '9px 4px', borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: 'pointer', border: `2px solid ${sel ? '#3B82F6' : '#E5E7EB'}`, background: sel ? '#EFF6FF' : 'white', color: sel ? '#3B82F6' : '#9CA3AF' }}>{d.s}</button>
              ); })}
            </div>
            <button onClick={handleConfirm} disabled={!days.length || saving}
              style={{ width: '100%', padding: '13px', borderRadius: 12, border: 'none', background: days.length ? 'linear-gradient(135deg, #3B82F6, #8B5CF6)' : '#E5E7EB', color: days.length ? 'white' : '#9CA3AF', fontSize: 14, fontWeight: 700, cursor: days.length ? 'pointer' : 'not-allowed' }}>
              {saving ? 'Salvando...' : 'Confirmar'}
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
  const [tab,       setTab]       = useState('cartilhas');
  const [templates, setTemplates] = useState([]);
  const [students,  setStudents]  = useState([]);
  const [plans,     setPlans]     = useState([]);
  const [loading,   setLoading]   = useState(true);

  const [search,     setSearch]     = useState('');
  const [editor,     setEditor]     = useState(null);
  const [assignTpl,  setAssignTpl]  = useState(null);
  const [selStudent, setSelStudent] = useState(null);
  const [pickTpl,    setPickTpl]    = useState(false);

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

  const saveItem = async ({ id, name, type, days, exercises, studentId }) => {
    if (!hasSupabase) return;
    const isTemplate = studentId === null || studentId === undefined;

    if (id) {
      await supabase.from('training_plans').update({ name, type, days }).eq('id', id);
      await supabase.from('exercises').delete().eq('plan_id', id);
      if (exercises.length) {
        await supabase.from('exercises').insert(exercises.map((e, i) => ({ plan_id: id, name: e.name, sets: parseInt(e.sets) || 4, reps: e.reps, rest: e.rest, load: e.load || '', obs: e.obs || '', order_index: i })));
      }
      const { data: up } = await supabase.from('training_plans').select('*, exercises(*)').eq('id', id).single();
      if (up) {
        if (isTemplate) setTemplates(prev => prev.map(t => t.id === id ? up : t));
        else setPlans(prev => prev.map(p => p.id === id ? up : p));
      }
    } else {
      const stud = !isTemplate ? students.find(s => s.id === studentId) : null;
      const { data: plan } = await supabase.from('training_plans').insert({
        personal_id: user.id,
        student_id: isTemplate ? null : studentId,
        student_name: stud?.name || null,
        name, type, days,
      }).select().single();
      if (plan) {
        if (exercises.length) {
          await supabase.from('exercises').insert(exercises.map((e, i) => ({ plan_id: plan.id, name: e.name, sets: parseInt(e.sets) || 4, reps: e.reps, rest: e.rest, load: e.load || '', obs: e.obs || '', order_index: i })));
        }
        const { data: full } = await supabase.from('training_plans').select('*, exercises(*)').eq('id', plan.id).single();
        if (full) {
          if (isTemplate) setTemplates(prev => [full, ...prev]);
          else setPlans(prev => [full, ...prev]);
        }
      }
    }
    setEditor(null);
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
      const stud = students.find(s => s.id === sid);
      const overlapping = plans.filter(p => p.student_id === sid && (p.days || []).some(d => selectedDays.includes(d)));
      for (const op of overlapping) await supabase.from('training_plans').delete().eq('id', op.id);
      setPlans(prev => prev.filter(p => !overlapping.find(o => o.id === p.id)));
      const { data: plan } = await supabase.from('training_plans').insert({
        personal_id: user.id, student_id: sid, student_name: stud?.name || null,
        name: tpl.name, type: tpl.type, days: selectedDays,
      }).select().single();
      if (plan) {
        if (exs.length) {
          await supabase.from('exercises').insert(exs.map((e, i) => ({ plan_id: plan.id, name: e.name, sets: parseInt(e.sets) || 4, reps: e.reps, rest: e.rest, load: e.load || '', obs: e.obs || '', order_index: i })));
        }
        const { data: full } = await supabase.from('training_plans').select('*, exercises(*)').eq('id', plan.id).single();
        if (full) setPlans(prev => [full, ...prev]);
      }
    }
  };

  const selectedStudent    = students.find(s => s.id === selStudent);
  const studentPlans       = plans.filter(p => p.student_id === selStudent);
  const filteredTemplates  = templates.filter(t =>
    !search || t.name?.toLowerCase().includes(search.toLowerCase()) || t.type?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300 }}>
      <Dumbbell size={32} color="#D1D5DB" />
    </div>
  );

  return (
    <div className="page-padding" style={{ flex: 1 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#111827' }}>Treinos</h2>
          <p style={{ margin: '3px 0 0', fontSize: 13, color: '#9CA3AF' }}>
            {tab === 'cartilhas' ? `${templates.length} cartilha${templates.length !== 1 ? 's' : ''}` : `${students.length} aluno${students.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        {tab === 'cartilhas' ? (
          <button onClick={() => setEditor({ item: null, mode: 'template' })}
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg, #3B82F6, #8B5CF6)', color: 'white', fontSize: 13, fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 14px rgba(59,130,246,0.3)' }}>
            <Plus size={16} /> Nova cartilha
          </button>
        ) : (
          selectedStudent && (
            <button onClick={() => setPickTpl(true)}
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg, #10B981, #059669)', color: 'white', fontSize: 13, fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 14px rgba(16,185,129,0.3)' }}>
              <Plus size={16} /> Atribuir treino
            </button>
          )
        )}
      </div>

      {/* Tab switcher */}
      <div style={{ display: 'flex', background: '#F3F4F6', borderRadius: 12, padding: 4, marginBottom: 24, width: 'fit-content' }}>
        {[
          { id: 'cartilhas', icon: BookOpen, label: 'Cartilhas' },
          { id: 'alunos',    icon: Users,    label: 'Por Aluno'  },
        ].map(({ id, icon: Icon, label }) => {
          const active = tab === id;
          return (
            <button key={id} onClick={() => setTab(id)}
              style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 20px', borderRadius: 9, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700, background: active ? 'white' : 'transparent', color: active ? '#111827' : '#9CA3AF', boxShadow: active ? '0 1px 4px rgba(0,0,0,0.1)' : 'none' }}>
              <Icon size={15} /> {label}
            </button>
          );
        })}
      </div>

      {/* ── Tab: Cartilhas ─────────────────────────────────────────────────── */}
      {tab === 'cartilhas' && (
        <>
          {templates.length > 4 && (
            <div style={{ position: 'relative', marginBottom: 16 }}>
              <Search size={15} color="#9CA3AF" style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)' }} />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar cartilha..."
                style={{ width: '100%', padding: '9px 14px 9px 38px', border: '1.5px solid #E5E7EB', borderRadius: 10, fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
            </div>
          )}

          {templates.length === 0 && (
            <div style={{ background: 'white', borderRadius: 16, padding: '60px 24px', textAlign: 'center', border: '2px dashed #E5E7EB' }}>
              <div style={{ width: 60, height: 60, borderRadius: 16, background: 'linear-gradient(135deg, #EFF6FF, #F5F3FF)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}><BookOpen size={26} color="#8B5CF6" /></div>
              <h3 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 800 }}>Nenhuma cartilha ainda</h3>
              <p style={{ margin: '0 0 24px', fontSize: 14, color: '#6B7280', maxWidth: 300, marginLeft: 'auto', marginRight: 'auto' }}>Crie uma cartilha e use a IA para sugerir exercícios. Depois é só atribuir para seus alunos.</p>
              <button onClick={() => setEditor({ item: null, mode: 'template' })}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '12px 24px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg, #3B82F6, #8B5CF6)', color: 'white', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
                <Plus size={16} /> Criar primeira cartilha
              </button>
            </div>
          )}

          {filteredTemplates.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))', gap: 14 }}>
              {filteredTemplates.map(t => (
                <TemplateCard key={t.id} tpl={t}
                  onEdit={tpl => setEditor({ item: tpl, mode: 'template' })}
                  onAssign={tpl => setAssignTpl(tpl)}
                  onDelete={tpl => deleteItem(tpl, true)} />
              ))}
            </div>
          )}
        </>
      )}

      {/* ── Tab: Por Aluno ─────────────────────────────────────────────────── */}
      {tab === 'alunos' && (
        <>
          {students.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 0', color: '#9CA3AF', fontSize: 14 }}>Nenhum aluno ativo cadastrado</div>
          ) : (
            <>
              {/* Student selector */}
              <div style={{ display: 'flex', gap: 8, overflowX: 'auto', marginBottom: 24, paddingBottom: 4 }}>
                {students.map(s => {
                  const sel = selStudent === s.id;
                  const count = plans.filter(p => p.student_id === s.id).length;
                  return (
                    <button key={s.id} onClick={() => setSelStudent(s.id)}
                      style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px 8px 10px', borderRadius: 40, border: `2px solid ${sel ? '#3B82F6' : '#E5E7EB'}`, background: sel ? '#EFF6FF' : 'white', cursor: 'pointer', flexShrink: 0 }}>
                      <div style={{ width: 28, height: 28, borderRadius: '50%', background: s.color || '#CBD5E1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ fontSize: 10, fontWeight: 800, color: 'white' }}>{s.initials || s.name?.[0]}</span>
                      </div>
                      <div style={{ textAlign: 'left' }}>
                        <p style={{ margin: 0, fontSize: 13, fontWeight: sel ? 700 : 500, color: sel ? '#1D4ED8' : '#374151', whiteSpace: 'nowrap' }}>{s.name}</p>
                        {count > 0 && <p style={{ margin: 0, fontSize: 10, color: '#9CA3AF' }}>{count} treino{count !== 1 ? 's' : ''}</p>}
                      </div>
                    </button>
                  );
                })}
              </div>

              {selectedStudent && (
                <>
                  {studentPlans.length > 0 && <WeekBar plans={studentPlans} />}

                  {studentPlans.length === 0 ? (
                    <div style={{ background: 'white', borderRadius: 14, padding: '40px 24px', textAlign: 'center', border: '2px dashed #E5E7EB' }}>
                      <p style={{ margin: '0 0 8px', fontSize: 15, fontWeight: 700, color: '#374151' }}>{selectedStudent.name} não tem treinos atribuídos</p>
                      <p style={{ margin: '0 0 20px', fontSize: 13, color: '#9CA3AF' }}>Atribua uma cartilha existente ou crie um treino personalizado</p>
                      <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
                        <button onClick={() => setPickTpl(true)}
                          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg, #10B981, #059669)', color: 'white', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                          <Send size={14} /> Usar cartilha existente
                        </button>
                        <button onClick={() => setEditor({ item: null, mode: 'plan', studentId: selStudent, studentName: selectedStudent.name })}
                          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px', borderRadius: 10, border: '1.5px solid #E5E7EB', background: 'white', color: '#374151', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                          <Plus size={14} /> Criar personalizado
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      {studentPlans.map(plan => (
                        <StudentPlanCard key={plan.id} plan={plan}
                          onEdit={p => setEditor({ item: p, mode: 'plan', studentId: selStudent, studentName: selectedStudent.name })}
                          onDelete={p => deleteItem(p, false)} />
                      ))}
                      <button onClick={() => setEditor({ item: null, mode: 'plan', studentId: selStudent, studentName: selectedStudent.name })}
                        style={{ width: '100%', marginTop: 4, padding: '11px', borderRadius: 10, border: '2px dashed #D1D5DB', background: 'none', fontSize: 13, fontWeight: 700, color: '#9CA3AF', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                        <Plus size={15} /> Adicionar outro treino
                      </button>
                    </>
                  )}
                </>
              )}
            </>
          )}
        </>
      )}

      {/* Modais */}
      {editor !== null && (
        <TemplateEditor
          item={editor.item}
          mode={editor.mode}
          studentId={editor.studentId}
          studentName={editor.studentName}
          onSave={saveItem}
          onClose={() => setEditor(null)} />
      )}

      {assignTpl && (
        <AssignModal tpl={assignTpl} students={students} onAssign={assignTemplate} onClose={() => setAssignTpl(null)} />
      )}

      {pickTpl && selectedStudent && (
        <PickTemplateModal templates={templates} student={selectedStudent} onAssign={assignTemplate} onClose={() => setPickTpl(false)} />
      )}
    </div>
  );
}
