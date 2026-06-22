import { useState, useEffect, useRef } from 'react';
import { Plus, Dumbbell, X, Save, Trash2, Sparkles, Users, ChevronDown, ChevronUp, Search, Copy, Check, GripVertical, Send } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { supabase, hasSupabase } from '../../lib/supabase';
import { searchExercises, EXERCISE_LIBRARY } from '../../data/exerciseLibrary';

// ─── Constantes ───────────────────────────────────────────────────────────────

const PLAN_TYPES = ['Hipertrofia', 'Força', 'Resistência', 'Funcional', 'Cardio', 'Mobilidade', 'Emagrecimento'];
const GROUPS = ['Peito', 'Costas', 'Pernas', 'Glúteos', 'Ombro', 'Braços', 'Abdômen', 'Full Body', 'Cardio'];
const DAYS = [
  { value: 1, label: 'Seg' }, { value: 2, label: 'Ter' }, { value: 3, label: 'Qua' },
  { value: 4, label: 'Qui' }, { value: 5, label: 'Sex' }, { value: 6, label: 'Sáb' }, { value: 0, label: 'Dom' },
];
const GROUP_COLORS = {
  Peito: '#EF4444', Costas: '#3B82F6', Pernas: '#8B5CF6', Glúteos: '#EC4899',
  Ombro: '#F59E0B', Braços: '#10B981', Abdômen: '#06B6D4', 'Full Body': '#F97316', Cardio: '#6366F1',
};
const TYPE_COLORS = {
  Hipertrofia: '#8B5CF6', Força: '#EF4444', Resistência: '#3B82F6',
  Funcional: '#10B981', Cardio: '#F59E0B', Mobilidade: '#06B6D4', Emagrecimento: '#F97316',
};
const REPS_QUICK = ['6', '8', '10', '12', '15', '20', 'Falha'];
const REST_QUICK = ['30s', '45s', '60s', '75s', '90s', '2min'];

const AI_LEVELS = {
  'Iniciante':    { sets: '3', reps: '12', rest: '60s',  exCount: 5 },
  'Intermediário':{ sets: '4', reps: '10', rest: '75s',  exCount: 6 },
  'Avançado':     { sets: '4', reps: '8',  rest: '90s',  exCount: 7 },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function newEx(i = 0) {
  return { id: Date.now() + i, name: '', sets: '4', reps: '10', rest: '60s', load: '', obs: '', order_index: i };
}

function groupColor(group) { return GROUP_COLORS[group] || '#6B7280'; }
function typeColor(type)   { return TYPE_COLORS[type]   || '#6B7280'; }

function generateAIExercises(groups, level) {
  const preset = AI_LEVELS[level] || AI_LEVELS['Intermediário'];
  const perGroup = Math.ceil(preset.exCount / Math.max(groups.length, 1));
  const result = [];
  groups.forEach(g => {
    const pool = EXERCISE_LIBRARY.filter(e => e.group === g);
    // Shuffle deterministically by name length for variety
    const sorted = [...pool].sort((a, b) => a.name.length - b.name.length);
    sorted.slice(0, perGroup).forEach(e => {
      result.push({ id: Date.now() + result.length, name: e.name, sets: preset.sets, reps: preset.reps, rest: preset.rest, load: '', obs: '', order_index: result.length });
    });
  });
  return result.slice(0, preset.exCount);
}

// ─── ExerciseRowEditor ────────────────────────────────────────────────────────

function ExerciseRowEditor({ ex, index, onChange, onDelete, onMoveUp, onMoveDown, isFirst, isLast }) {
  const [showSugg, setShowSugg] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [expanded, setExpanded] = useState(!ex.name);
  const nameRef = useRef();

  const handleName = (val) => {
    onChange({ ...ex, name: val });
    const s = searchExercises(val);
    setSuggestions(s);
    setShowSugg(s.length > 0 && val.length > 1);
  };

  const pickSugg = (s) => {
    onChange({ ...ex, name: s.name });
    setSuggestions([]);
    setShowSugg(false);
    setExpanded(false);
  };

  const color = '#3B82F6';

  return (
    <div style={{ background: 'white', border: '1.5px solid #E5E7EB', borderRadius: 12, overflow: 'visible', marginBottom: 8, transition: 'border-color 0.15s' }}>
      {/* Row header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px' }}>
        <div style={{ width: 24, height: 24, borderRadius: 7, background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <span style={{ fontSize: 11, fontWeight: 800, color }}>{index + 1}</span>
        </div>
        <div style={{ flex: 1, minWidth: 0, position: 'relative' }}>
          <input
            ref={nameRef}
            value={ex.name}
            onChange={e => handleName(e.target.value)}
            onFocus={() => ex.name.length > 1 && suggestions.length > 0 && setShowSugg(true)}
            onBlur={() => setTimeout(() => setShowSugg(false), 150)}
            placeholder="Nome do exercício..."
            style={{ width: '100%', border: 'none', outline: 'none', fontSize: 14, fontWeight: 600, color: '#111827', background: 'transparent' }}
          />
          {showSugg && suggestions.length > 0 && (
            <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'var(--bg-surface)', border: '1.5px solid var(--border)', borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.12)', zIndex: 50, maxHeight: 200, overflowY: 'auto' }}>
              {suggestions.slice(0, 8).map((s, i) => (
                <button key={i} onMouseDown={() => pickSugg(s)}
                  style={{ width: '100%', padding: '9px 14px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8, borderBottom: i < Math.min(suggestions.length, 8) - 1 ? '1px solid var(--border-light)' : 'none' }}>
                  <span style={{ fontSize: 10, background: groupColor(s.group) + '20', color: groupColor(s.group), padding: '2px 6px', borderRadius: 20, fontWeight: 700, flexShrink: 0 }}>{s.group}</span>
                  <span style={{ color: 'var(--gray-900)', fontWeight: 500 }}>{s.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
          <button onClick={() => setExpanded(v => !v)} style={{ padding: 6, border: 'none', background: 'none', cursor: 'pointer', color: '#9CA3AF', display: 'flex' }}>
            {expanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
          </button>
          <button onClick={onDelete} style={{ padding: 6, border: 'none', background: 'none', cursor: 'pointer', color: '#EF4444', display: 'flex' }}>
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Quick stats (always visible) */}
      {!expanded && ex.name && (
        <div style={{ display: 'flex', gap: 10, padding: '0 12px 10px 44px' }}>
          <span style={{ fontSize: 12, color: '#6B7280', fontWeight: 600 }}>{ex.sets}×{ex.reps}</span>
          {ex.load && <span style={{ fontSize: 12, color: '#9CA3AF' }}>· {ex.load}</span>}
          {ex.rest && <span style={{ fontSize: 12, color: '#9CA3AF' }}>· {ex.rest} desc.</span>}
        </div>
      )}

      {/* Expanded config */}
      {expanded && (
        <div style={{ padding: '4px 12px 14px', borderTop: '1px solid #F3F4F6' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 8 }}>
            <div>
              <label style={{ fontSize: 10, fontWeight: 700, color: '#9CA3AF', display: 'block', marginBottom: 3 }}>SÉRIES</label>
              <input type="number" value={ex.sets} min={1} max={10}
                onChange={e => onChange({ ...ex, sets: e.target.value })}
                style={{ width: '100%', padding: '7px 10px', border: '1.5px solid #E5E7EB', borderRadius: 8, fontSize: 14, fontWeight: 700, textAlign: 'center' }} />
            </div>
            <div>
              <label style={{ fontSize: 10, fontWeight: 700, color: '#9CA3AF', display: 'block', marginBottom: 3 }}>REPS</label>
              <input value={ex.reps} onChange={e => onChange({ ...ex, reps: e.target.value })}
                style={{ width: '100%', padding: '7px 10px', border: '1.5px solid #E5E7EB', borderRadius: 8, fontSize: 14, fontWeight: 700, textAlign: 'center' }} />
            </div>
            <div>
              <label style={{ fontSize: 10, fontWeight: 700, color: '#9CA3AF', display: 'block', marginBottom: 3 }}>CARGA</label>
              <input value={ex.load} onChange={e => onChange({ ...ex, load: e.target.value })} placeholder="—"
                style={{ width: '100%', padding: '7px 10px', border: '1.5px solid #E5E7EB', borderRadius: 8, fontSize: 14, fontWeight: 700, textAlign: 'center' }} />
            </div>
          </div>
          {/* Reps quick picks */}
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 8 }}>
            {REPS_QUICK.map(r => (
              <button key={r} onClick={() => onChange({ ...ex, reps: r })}
                style={{ padding: '3px 8px', borderRadius: 20, fontSize: 11, fontWeight: 700, cursor: 'pointer', border: 'none', background: ex.reps === r ? '#EFF6FF' : '#F3F4F6', color: ex.reps === r ? '#3B82F6' : '#6B7280' }}>
                {r}
              </button>
            ))}
          </div>
          {/* Rest quick picks */}
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 8, alignItems: 'center' }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: '#9CA3AF', marginRight: 2 }}>DESCANSO</span>
            {REST_QUICK.map(r => (
              <button key={r} onClick={() => onChange({ ...ex, rest: r })}
                style={{ padding: '3px 8px', borderRadius: 20, fontSize: 11, fontWeight: 700, cursor: 'pointer', border: 'none', background: ex.rest === r ? '#F0FDF4' : '#F3F4F6', color: ex.rest === r ? '#10B981' : '#6B7280' }}>
                {r}
              </button>
            ))}
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
  const [selectedGroups, setSelectedGroups] = useState([]);
  const [level, setLevel] = useState('Intermediário');

  const toggleGroup = (g) => setSelectedGroups(prev =>
    prev.includes(g) ? prev.filter(x => x !== g) : [...prev, g]
  );

  const handleGenerate = () => {
    if (!selectedGroups.length) return;
    const exs = generateAIExercises(selectedGroups, level);
    onApply(exs);
    onClose();
  };

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'white', borderRadius: 20, padding: 28, width: '100%', maxWidth: 420, boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: 'linear-gradient(135deg, #8B5CF6, #3B82F6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Sparkles size={20} color="white" />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800 }}>Sugestão com IA</h3>
            <p style={{ margin: 0, fontSize: 12, color: '#6B7280' }}>Gera exercícios baseados no objetivo</p>
          </div>
          <button onClick={onClose} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF' }}><X size={18} /></button>
        </div>

        <div style={{ marginBottom: 18 }}>
          <label style={{ fontSize: 12, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 8 }}>Grupos musculares</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {GROUPS.map(g => {
              const selected = selectedGroups.includes(g);
              const c = groupColor(g);
              return (
                <button key={g} onClick={() => toggleGroup(g)}
                  style={{ padding: '6px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700, cursor: 'pointer', border: `2px solid ${selected ? c : '#E5E7EB'}`, background: selected ? c + '18' : 'white', color: selected ? c : '#6B7280', transition: 'all 0.15s' }}>
                  {g}
                </button>
              );
            })}
          </div>
        </div>

        <div style={{ marginBottom: 24 }}>
          <label style={{ fontSize: 12, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 8 }}>Nível do aluno</label>
          <div style={{ display: 'flex', gap: 8 }}>
            {Object.keys(AI_LEVELS).map(l => (
              <button key={l} onClick={() => setLevel(l)}
                style={{ flex: 1, padding: '10px 8px', borderRadius: 10, fontSize: 12, fontWeight: 700, cursor: 'pointer', border: `2px solid ${level === l ? '#8B5CF6' : '#E5E7EB'}`, background: level === l ? '#F5F3FF' : 'white', color: level === l ? '#7C3AED' : '#6B7280', transition: 'all 0.15s' }}>
                {l}
              </button>
            ))}
          </div>
        </div>

        {selectedGroups.length > 0 && (
          <div style={{ background: '#F5F3FF', borderRadius: 10, padding: '10px 14px', marginBottom: 16, fontSize: 12, color: '#7C3AED' }}>
            Vai gerar <strong>{AI_LEVELS[level]?.exCount} exercícios</strong> para {selectedGroups.join(' + ')} · nível {level}
          </div>
        )}

        <button onClick={handleGenerate} disabled={!selectedGroups.length}
          style={{ width: '100%', padding: '13px', borderRadius: 12, border: 'none', background: selectedGroups.length ? 'linear-gradient(135deg, #8B5CF6, #3B82F6)' : '#E5E7EB', color: selectedGroups.length ? 'white' : '#9CA3AF', fontSize: 14, fontWeight: 700, cursor: selectedGroups.length ? 'pointer' : 'not-allowed', transition: 'all 0.2s' }}>
          <Sparkles size={15} style={{ marginRight: 8, verticalAlign: 'middle' }} />
          Gerar cartilha
        </button>
      </div>
    </div>
  );
}

// ─── AssignModal ──────────────────────────────────────────────────────────────

function AssignModal({ template, students, onAssign, onClose }) {
  const [selected, setSelected] = useState([]);
  const [selectedDays, setSelectedDays] = useState(template.days || []);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  const toggle = (id) => setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  const toggleDay = (d) => setSelectedDays(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d]);

  const handleAssign = async () => {
    if (!selected.length || !selectedDays.length) return;
    setSaving(true);
    await onAssign(template, selected, selectedDays);
    setSaving(false);
    setDone(true);
    setTimeout(onClose, 1200);
  };

  const exs = [...(template.exercises || [])].sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'white', borderRadius: 20, padding: 28, width: '100%', maxWidth: 440, boxShadow: '0 20px 60px rgba(0,0,0,0.2)', maxHeight: '90vh', overflowY: 'auto' }}>
        {done ? (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#D1FAE5', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
              <Check size={26} color="#10B981" strokeWidth={3} />
            </div>
            <p style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>Treino atribuído!</p>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: '#6B7280' }}>Alunos já podem ver no app deles</p>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800 }}>Atribuir treino</h3>
                <p style={{ margin: '2px 0 0', fontSize: 12, color: '#6B7280' }}>{template.name} · {exs.length} exercícios</p>
              </div>
              <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF' }}><X size={18} /></button>
            </div>

            {/* Day selector */}
            <div style={{ marginBottom: 18 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 8 }}>Dias da semana</label>
              <div style={{ display: 'flex', gap: 6 }}>
                {DAYS.map(d => {
                  const sel = selectedDays.includes(d.value);
                  return (
                    <button key={d.value} onClick={() => toggleDay(d.value)}
                      style={{ flex: 1, padding: '8px 4px', borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: 'pointer', border: `2px solid ${sel ? '#3B82F6' : '#E5E7EB'}`, background: sel ? '#EFF6FF' : 'white', color: sel ? '#3B82F6' : '#9CA3AF' }}>
                      {d.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Student selector */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 8 }}>Selecionar alunos</label>
              {students.length === 0 ? (
                <p style={{ fontSize: 13, color: '#9CA3AF', textAlign: 'center', padding: 20 }}>Nenhum aluno ativo</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 220, overflowY: 'auto' }}>
                  {students.map(s => {
                    const sel = selected.includes(s.id);
                    return (
                      <button key={s.id} onClick={() => toggle(s.id)}
                        style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 10, border: `2px solid ${sel ? '#3B82F6' : '#E5E7EB'}`, background: sel ? '#EFF6FF' : 'white', cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s' }}>
                        <div style={{ width: 32, height: 32, borderRadius: '50%', background: s.color || '#E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <span style={{ fontSize: 11, fontWeight: 800, color: 'white' }}>{s.initials || s.name?.[0]}</span>
                        </div>
                        <span style={{ flex: 1, fontSize: 14, fontWeight: 600, color: '#111827' }}>{s.name}</span>
                        <div style={{ width: 20, height: 20, borderRadius: '50%', border: `2px solid ${sel ? '#3B82F6' : '#D1D5DB'}`, background: sel ? '#3B82F6' : 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {sel && <Check size={11} color="white" strokeWidth={3} />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <button onClick={handleAssign} disabled={!selected.length || !selectedDays.length || saving}
              style={{ width: '100%', padding: '13px', borderRadius: 12, border: 'none', fontSize: 14, fontWeight: 700, cursor: selected.length && selectedDays.length ? 'pointer' : 'not-allowed', background: selected.length && selectedDays.length ? 'linear-gradient(135deg, #3B82F6, #8B5CF6)' : '#E5E7EB', color: selected.length && selectedDays.length ? 'white' : '#9CA3AF' }}>
              {saving ? 'Atribuindo...' : `Atribuir para ${selected.length} aluno${selected.length !== 1 ? 's' : ''}`}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ─── TemplateCard (visual cartilha) ──────────────────────────────────────────

function TemplateCard({ template, onEdit, onAssign, onDelete }) {
  const exs = [...(template.exercises || [])].sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));
  const color = typeColor(template.type);
  const dayLabels = (template.days || []).map(d => DAYS.find(x => x.value === d)?.label).filter(Boolean);
  const PREVIEW_COUNT = 5;
  const preview = exs.slice(0, PREVIEW_COUNT);
  const extra = exs.length - PREVIEW_COUNT;

  return (
    <div style={{ background: 'white', borderRadius: 16, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', border: '1px solid #F1F5F9', display: 'flex', flexDirection: 'column', transition: 'box-shadow 0.2s', cursor: 'default' }}>
      {/* Cartilha header — faixa colorida */}
      <div style={{ background: `linear-gradient(135deg, ${color}, ${color}cc)`, padding: '16px 18px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <Dumbbell size={13} color="rgba(255,255,255,0.8)" />
              <span style={{ fontSize: 10, fontWeight: 800, color: 'rgba(255,255,255,0.8)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{template.type}</span>
            </div>
            <h3 style={{ margin: 0, fontSize: 17, fontWeight: 900, color: 'white', lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{template.name || 'Sem nome'}</h3>
            <div style={{ display: 'flex', gap: 4, marginTop: 6, flexWrap: 'wrap' }}>
              {dayLabels.map(d => (
                <span key={d} style={{ fontSize: 10, fontWeight: 700, color: 'white', background: 'rgba(255,255,255,0.2)', padding: '2px 7px', borderRadius: 20 }}>{d}</span>
              ))}
              {dayLabels.length === 0 && <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)' }}>Sem dia definido</span>}
            </div>
          </div>
          <button onClick={() => onDelete(template)} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 8, padding: 6, cursor: 'pointer', color: 'white', display: 'flex', flexShrink: 0 }}>
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Lista de exercícios — visual de cartilha */}
      <div style={{ flex: 1, padding: '14px 18px 0' }}>
        {exs.length === 0 ? (
          <p style={{ margin: 0, fontSize: 12, color: '#9CA3AF', textAlign: 'center', padding: '20px 0' }}>Nenhum exercício</p>
        ) : (
          <>
            {preview.map((ex, i) => (
              <div key={ex.id || i} style={{ display: 'flex', alignItems: 'baseline', gap: 8, padding: '5px 0', borderBottom: i < preview.length - 1 || extra > 0 ? '1px solid #F3F4F6' : 'none' }}>
                <span style={{ width: 18, fontSize: 11, fontWeight: 800, color: '#D1D5DB', flexShrink: 0, textAlign: 'right' }}>{i + 1}</span>
                <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ex.name || '—'}</span>
                <span style={{ fontSize: 11, color: '#9CA3AF', fontWeight: 600, flexShrink: 0 }}>{ex.sets}×{ex.reps}</span>
              </div>
            ))}
            {extra > 0 && (
              <div style={{ padding: '6px 0', fontSize: 11, color: '#9CA3AF', fontStyle: 'italic' }}>
                + {extra} exercício{extra !== 1 ? 's' : ''}
              </div>
            )}
          </>
        )}
      </div>

      {/* Rodapé — total + ações */}
      <div style={{ padding: '12px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid #F3F4F6', marginTop: 12 }}>
        <span style={{ fontSize: 12, color: '#6B7280', fontWeight: 600 }}>{exs.length} exercício{exs.length !== 1 ? 's' : ''}</span>
        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={() => onEdit(template)}
            style={{ padding: '7px 14px', borderRadius: 8, border: '1.5px solid #E5E7EB', background: 'white', fontSize: 12, fontWeight: 700, color: '#374151', cursor: 'pointer' }}>
            Editar
          </button>
          <button onClick={() => onAssign(template)}
            style={{ padding: '7px 14px', borderRadius: 8, border: 'none', background: `linear-gradient(135deg, ${color}, ${color}cc)`, fontSize: 12, fontWeight: 700, color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
            <Send size={11} /> Atribuir
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── TemplateEditor (painel lateral) ─────────────────────────────────────────

function TemplateEditor({ template, onSave, onClose }) {
  const isNew = !template?.id;
  const [name, setName] = useState(template?.name || '');
  const [type, setType] = useState(template?.type || 'Hipertrofia');
  const [days, setDays] = useState(template?.days || []);
  const [exercises, setExercises] = useState(
    template?.exercises?.length
      ? [...template.exercises].sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0)).map((e, i) => ({ ...e, id: e.id || Date.now() + i }))
      : [newEx(0)]
  );
  const [saving, setSaving] = useState(false);
  const [showAI, setShowAI] = useState(false);

  const toggleDay = (d) => setDays(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d]);
  const addEx = () => setExercises(prev => [...prev, newEx(prev.length)]);
  const updateEx = (idx, updated) => setExercises(prev => prev.map((e, i) => i === idx ? updated : e));
  const deleteEx = (idx) => setExercises(prev => prev.filter((_, i) => i !== idx));

  const handleAIApply = (aiExercises) => {
    setExercises(aiExercises);
  };

  const handleSave = async () => {
    if (!name.trim()) return;
    const validExs = exercises.filter(e => e.name?.trim());
    if (validExs.length === 0) return;
    setSaving(true);
    await onSave({ id: template?.id, name: name.trim(), type, days, exercises: validExs });
    setSaving(false);
  };

  return (
    <>
      {/* Backdrop */}
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 200 }} />

      {/* Painel */}
      <div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: '100%', maxWidth: 520, background: 'var(--bg-surface)', zIndex: 201, display: 'flex', flexDirection: 'column', boxShadow: '-8px 0 40px rgba(0,0,0,0.15)' }}>

        {/* Header */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', display: 'flex', padding: 4 }}><X size={20} /></button>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, flex: 1 }}>{isNew ? 'Nova cartilha' : 'Editar cartilha'}</h2>
          <button onClick={() => setShowAI(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg, #8B5CF6, #3B82F6)', color: 'white', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
            <Sparkles size={14} /> Sugerir com IA
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>

          {/* Nome */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 12, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 6 }}>Nome da cartilha *</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="ex: Treino A — Peito e Tríceps"
              style={{ width: '100%', padding: '11px 14px', border: '1.5px solid #E5E7EB', borderRadius: 10, fontSize: 15, fontWeight: 600, boxSizing: 'border-box', outline: 'none' }} />
          </div>

          {/* Tipo */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 12, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 6 }}>Tipo de treino</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {PLAN_TYPES.map(t => {
                const c = typeColor(t);
                const sel = type === t;
                return (
                  <button key={t} onClick={() => setType(t)}
                    style={{ padding: '6px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700, cursor: 'pointer', border: `2px solid ${sel ? c : '#E5E7EB'}`, background: sel ? c + '18' : 'white', color: sel ? c : '#6B7280', transition: 'all 0.15s' }}>
                    {t}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Dias */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: 12, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 6 }}>Dias da semana (opcional)</label>
            <div style={{ display: 'flex', gap: 6 }}>
              {DAYS.map(d => {
                const sel = days.includes(d.value);
                return (
                  <button key={d.value} onClick={() => toggleDay(d.value)}
                    style={{ flex: 1, padding: '8px 4px', borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: 'pointer', border: `2px solid ${sel ? '#3B82F6' : '#E5E7EB'}`, background: sel ? '#EFF6FF' : 'white', color: sel ? '#3B82F6' : '#9CA3AF' }}>
                    {d.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Exercícios */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <label style={{ fontSize: 12, fontWeight: 700, color: '#374151' }}>Exercícios ({exercises.filter(e => e.name).length})</label>
          </div>

          {exercises.map((ex, i) => (
            <ExerciseRowEditor
              key={ex.id || i}
              ex={ex}
              index={i}
              onChange={(updated) => updateEx(i, updated)}
              onDelete={() => deleteEx(i)}
              isFirst={i === 0}
              isLast={i === exercises.length - 1}
            />
          ))}

          <button onClick={addEx}
            style={{ width: '100%', padding: '11px', borderRadius: 10, border: '2px dashed #D1D5DB', background: 'none', fontSize: 13, fontWeight: 700, color: '#9CA3AF', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 4, transition: 'all 0.15s' }}>
            <Plus size={16} /> Adicionar exercício
          </button>

          <div style={{ height: 24 }} />
        </div>

        {/* Footer */}
        <div style={{ padding: '16px 24px', borderTop: '1px solid #F1F5F9' }}>
          <button onClick={handleSave} disabled={!name.trim() || saving}
            style={{ width: '100%', padding: '14px', borderRadius: 12, border: 'none', background: name.trim() ? 'linear-gradient(135deg, #3B82F6, #8B5CF6)' : '#E5E7EB', color: name.trim() ? 'white' : '#9CA3AF', fontSize: 15, fontWeight: 800, cursor: name.trim() ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            {saving ? 'Salvando...' : <><Save size={16} /> {isNew ? 'Criar cartilha' : 'Salvar alterações'}</>}
          </button>
        </div>
      </div>

      {showAI && <AIModal onApply={handleAIApply} onClose={() => setShowAI(false)} />}
    </>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function Cartilhas() {
  const { user } = useAuth();
  const [templates, setTemplates] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editor, setEditor] = useState(null);     // null | {} | template obj
  const [assignTarget, setAssignTarget] = useState(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!user || !hasSupabase) { setLoading(false); return; }
    Promise.all([
      supabase.from('training_plans').select('*, exercises(*)').eq('personal_id', user.id).is('student_id', null),
      supabase.from('students').select('id, name, initials, color').eq('personal_id', user.id).eq('status', 'ativo'),
    ]).then(([{ data: t }, { data: s }]) => {
      setTemplates(t || []);
      setStudents(s || []);
      setLoading(false);
    });
  }, [user?.id]);

  const saveTemplate = async ({ id, name, type, days, exercises }) => {
    if (!hasSupabase) return;

    if (id) {
      // Update existing template
      await supabase.from('training_plans').update({ name, type, days }).eq('id', id);
      await supabase.from('exercises').delete().eq('plan_id', id);
      if (exercises.length) {
        await supabase.from('exercises').insert(
          exercises.map((e, i) => ({ plan_id: id, name: e.name, sets: parseInt(e.sets) || 4, reps: e.reps, rest: e.rest, load: e.load || '', obs: e.obs || '', order_index: i }))
        );
      }
      const { data: updated } = await supabase.from('training_plans').select('*, exercises(*)').eq('id', id).single();
      if (updated) setTemplates(prev => prev.map(t => t.id === id ? updated : t));
    } else {
      // Create new template (student_id = null = template)
      const { data: plan } = await supabase.from('training_plans').insert({
        personal_id: user.id, student_id: null, student_name: null,
        name, type, days,
      }).select().single();
      if (plan) {
        if (exercises.length) {
          await supabase.from('exercises').insert(
            exercises.map((e, i) => ({ plan_id: plan.id, name: e.name, sets: parseInt(e.sets) || 4, reps: e.reps, rest: e.rest, load: e.load || '', obs: e.obs || '', order_index: i }))
          );
        }
        const { data: full } = await supabase.from('training_plans').select('*, exercises(*)').eq('id', plan.id).single();
        if (full) setTemplates(prev => [full, ...prev]);
      }
    }
    setEditor(null);
  };

  const deleteTemplate = async (template) => {
    if (!hasSupabase) return;
    if (!window.confirm(`Excluir a cartilha "${template.name}"?`)) return;
    await supabase.from('training_plans').delete().eq('id', template.id);
    setTemplates(prev => prev.filter(t => t.id !== template.id));
  };

  const assignTemplate = async (template, studentIds, selectedDays) => {
    if (!hasSupabase) return;
    const exs = [...(template.exercises || [])].sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));

    for (const sid of studentIds) {
      const student = students.find(s => s.id === sid);
      if (!student) continue;

      // Delete existing plans on the same days for this student
      const { data: existing } = await supabase.from('training_plans').select('id, days').eq('personal_id', user.id).eq('student_id', sid);
      for (const ep of (existing || [])) {
        if ((ep.days || []).map(Number).some(d => selectedDays.includes(d))) {
          await supabase.from('training_plans').delete().eq('id', ep.id);
        }
      }

      // Create new plan for student
      const { data: plan } = await supabase.from('training_plans').insert({
        personal_id: user.id, student_id: sid, student_name: student.name,
        name: template.name, type: template.type, days: selectedDays,
      }).select().single();

      if (plan && exs.length) {
        await supabase.from('exercises').insert(
          exs.map((e, i) => ({ plan_id: plan.id, name: e.name, sets: parseInt(e.sets) || 4, reps: e.reps, rest: e.rest, load: e.load || '', obs: e.obs || '', order_index: i }))
        );
      }
    }
  };

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

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#111827' }}>Cartilhas de Treino</h2>
          <p style={{ margin: '4px 0 0', fontSize: 14, color: '#6B7280' }}>
            {templates.length} template{templates.length !== 1 ? 's' : ''} · crie uma vez, envie para vários alunos
          </p>
        </div>
        <button onClick={() => setEditor({})}
          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '11px 18px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg, #3B82F6, #8B5CF6)', color: 'white', fontSize: 14, fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 14px rgba(59,130,246,0.35)' }}>
          <Plus size={18} /> Nova cartilha
        </button>
      </div>

      {/* Search */}
      {templates.length > 3 && (
        <div style={{ position: 'relative', marginBottom: 20 }}>
          <Search size={16} color="#9CA3AF" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar cartilha..."
            style={{ width: '100%', padding: '10px 14px 10px 40px', border: '1.5px solid #E5E7EB', borderRadius: 10, fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
        </div>
      )}

      {/* Empty state */}
      {templates.length === 0 && (
        <div style={{ background: 'white', borderRadius: 16, padding: '60px 24px', textAlign: 'center', border: '2px dashed #E5E7EB' }}>
          <div style={{ width: 64, height: 64, borderRadius: 18, background: 'linear-gradient(135deg, #EFF6FF, #F5F3FF)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <Dumbbell size={28} color="#8B5CF6" />
          </div>
          <h3 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 800, color: '#111827' }}>Nenhuma cartilha ainda</h3>
          <p style={{ margin: '0 0 24px', fontSize: 14, color: '#6B7280', maxWidth: 320, marginLeft: 'auto', marginRight: 'auto' }}>
            Crie sua primeira cartilha de treino. Você pode usar a IA para sugerir os exercícios e depois enviar para os alunos.
          </p>
          <button onClick={() => setEditor({})}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '12px 24px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg, #3B82F6, #8B5CF6)', color: 'white', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
            <Plus size={16} /> Criar primeira cartilha
          </button>
        </div>
      )}

      {/* Grid de cartilhas */}
      {filtered.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
          {filtered.map(t => (
            <TemplateCard
              key={t.id}
              template={t}
              onEdit={setEditor}
              onAssign={setAssignTarget}
              onDelete={deleteTemplate}
            />
          ))}
        </div>
      )}

      {filtered.length === 0 && templates.length > 0 && (
        <p style={{ textAlign: 'center', color: '#9CA3AF', marginTop: 40 }}>Nenhuma cartilha encontrada para "{search}"</p>
      )}

      {/* Editor */}
      {editor !== null && (
        <TemplateEditor
          template={editor}
          onSave={saveTemplate}
          onClose={() => setEditor(null)}
        />
      )}

      {/* Assign modal */}
      {assignTarget && (
        <AssignModal
          template={assignTarget}
          students={students}
          onAssign={assignTemplate}
          onClose={() => setAssignTarget(null)}
        />
      )}
    </div>
  );
}
