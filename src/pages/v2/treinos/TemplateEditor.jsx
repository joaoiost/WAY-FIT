import { useState, useMemo } from 'react';
import { Plus, Trash2, ChevronUp, ChevronDown, Sparkles, Search } from 'lucide-react';
import ModalV2 from '../../../components/v2/Modal';
import { searchExercises } from '../../../data/exerciseLibrary';
import {
  PLAN_TYPES, GROUPS, TYPE_DEFAULTS, AI_LEVELS,
  typeColor, newExercise, generateWithAI,
} from './treinosData';

function ExerciseRow({ ex, index, total, onChange, onRemove, onMove }) {
  return (
    <div className="flex items-start gap-2 py-2.5 border-b border-ink-100 last:border-0">
      <span className="w-5 pt-2.5 text-xs font-semibold text-ink-300 shrink-0">{index + 1}</span>

      <div className="flex-1 min-w-0 grid grid-cols-1 sm:grid-cols-[1fr_repeat(3,64px)] gap-1.5">
        <input
          value={ex.name}
          onChange={(e) => onChange({ ...ex, name: e.target.value })}
          placeholder="Nome do exercício"
          className="px-2.5 py-1.5 rounded-md border border-ink-200 text-[13px] text-ink-900 outline-none focus:border-brand-500"
        />
        <input
          value={ex.sets}
          onChange={(e) => onChange({ ...ex, sets: e.target.value })}
          placeholder="Séries"
          title="Séries"
          className="px-2 py-1.5 rounded-md border border-ink-200 text-[13px] text-ink-900 text-center outline-none focus:border-brand-500"
        />
        <input
          value={ex.reps}
          onChange={(e) => onChange({ ...ex, reps: e.target.value })}
          placeholder="Reps"
          title="Repetições"
          className="px-2 py-1.5 rounded-md border border-ink-200 text-[13px] text-ink-900 text-center outline-none focus:border-brand-500"
        />
        <input
          value={ex.rest}
          onChange={(e) => onChange({ ...ex, rest: e.target.value })}
          placeholder="Desc."
          title="Descanso"
          className="px-2 py-1.5 rounded-md border border-ink-200 text-[13px] text-ink-900 text-center outline-none focus:border-brand-500"
        />
      </div>

      <div className="flex flex-col gap-0.5 shrink-0 pt-0.5">
        <button type="button" disabled={index === 0} onClick={() => onMove(-1)}
          className="w-5 h-5 flex items-center justify-center text-ink-300 hover:text-ink-600 disabled:opacity-0">
          <ChevronUp size={13} />
        </button>
        <button type="button" disabled={index === total - 1} onClick={() => onMove(1)}
          className="w-5 h-5 flex items-center justify-center text-ink-300 hover:text-ink-600 disabled:opacity-0">
          <ChevronDown size={13} />
        </button>
      </div>

      <button type="button" onClick={onRemove} className="shrink-0 pt-2 text-ink-300 hover:text-danger-500" aria-label="Remover exercício">
        <Trash2 size={15} />
      </button>
    </div>
  );
}

function AISection({ planType, onGenerate }) {
  const [open, setOpen] = useState(false);
  const [groups, setGroups] = useState([]);
  const [level, setLevel] = useState('Intermediário');

  const toggle = (g) => setGroups(prev => prev.includes(g) ? prev.filter(x => x !== g) : [...prev, g]);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg border border-dashed border-brand-300 text-brand-600 text-[13px] font-semibold hover:bg-brand-50 transition-colors"
      >
        <Sparkles size={15} /> Gerar exercícios automaticamente
      </button>
    );
  }

  return (
    <div className="rounded-lg border border-brand-200 bg-brand-50/40 p-3.5">
      <p className="text-xs font-semibold text-ink-700 mb-2">Grupos musculares</p>
      <div className="flex flex-wrap gap-1.5 mb-3">
        {GROUPS.map(g => {
          const sel = groups.includes(g);
          return (
            <button key={g} type="button" onClick={() => toggle(g)}
              className={`px-2.5 py-1 rounded-full text-[11.5px] font-semibold border transition-colors ${
                sel ? 'bg-brand-600 border-brand-600 text-white' : 'bg-white border-ink-200 text-ink-600 hover:border-brand-300'
              }`}>
              {g}
            </button>
          );
        })}
      </div>
      <p className="text-xs font-semibold text-ink-700 mb-2">Nível</p>
      <div className="flex gap-1.5 mb-3">
        {Object.keys(AI_LEVELS).map(l => (
          <button key={l} type="button" onClick={() => setLevel(l)}
            className={`flex-1 py-1.5 rounded-md text-[12px] font-semibold border transition-colors ${
              level === l ? 'bg-brand-600 border-brand-600 text-white' : 'bg-white border-ink-200 text-ink-600'
            }`}>
            {l}
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <button type="button" onClick={() => setOpen(false)} className="px-3 py-1.5 rounded-md text-[12.5px] font-medium text-ink-500 hover:bg-white">
          Cancelar
        </button>
        <button
          type="button"
          disabled={!groups.length}
          onClick={() => { onGenerate(groups, level); setOpen(false); setGroups([]); }}
          className="flex-1 py-1.5 rounded-md bg-brand-600 text-white text-[12.5px] font-semibold disabled:opacity-40"
        >
          Gerar exercícios
        </button>
      </div>
    </div>
  );
}

export default function TemplateEditor({ isOpen, onClose, onSave, initial }) {
  const [name, setName] = useState(initial?.name || '');
  const [type, setType] = useState(initial?.type || 'Hipertrofia');
  const [exercises, setExercises] = useState(
    initial?.exercises?.length
      ? [...initial.exercises].sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0))
      : []
  );
  const [query, setQuery] = useState('');
  const [saving, setSaving] = useState(false);

  const suggestions = useMemo(() => searchExercises(query), [query]);

  const addExercise = (name = '') => {
    const d = TYPE_DEFAULTS[type] || TYPE_DEFAULTS.Hipertrofia;
    setExercises(prev => [...prev, { id: Date.now(), name, sets: d.sets, reps: d.reps, rest: d.rest, load: '', order_index: prev.length }]);
    setQuery('');
  };

  const updateExercise = (idx, next) => setExercises(prev => prev.map((e, i) => i === idx ? next : e));
  const removeExercise = (idx) => setExercises(prev => prev.filter((_, i) => i !== idx));
  const moveExercise = (idx, dir) => setExercises(prev => {
    const next = [...prev];
    const target = idx + dir;
    if (target < 0 || target >= next.length) return prev;
    [next[idx], next[target]] = [next[target], next[idx]];
    return next;
  });

  const handleGenerate = (groups, level) => {
    const generated = generateWithAI(groups, level);
    setExercises(prev => [...prev, ...generated]);
  };

  const handleSubmit = async () => {
    if (!name.trim()) return;
    setSaving(true);
    await onSave({ id: initial?.id, name: name.trim(), type, exercises });
    setSaving(false);
  };

  return (
    <ModalV2
      isOpen={isOpen}
      onClose={onClose}
      variant="drawer"
      title={initial?.id ? 'Editar modelo' : 'Novo modelo de treino'}
      footer={
        <>
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-medium text-ink-500 hover:bg-ink-50">Cancelar</button>
          <button
            onClick={handleSubmit}
            disabled={!name.trim() || saving}
            className="px-4 py-2 rounded-lg bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 disabled:opacity-50"
          >
            {saving ? 'Salvando...' : 'Salvar modelo'}
          </button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <div>
          <label className="block text-xs font-semibold text-ink-700 mb-1.5">Nome do modelo</label>
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex: Treino A — Peito e Tríceps"
            className="w-full px-3 py-2 rounded-lg border border-ink-200 text-sm text-ink-900 outline-none focus:border-brand-500"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-ink-700 mb-1.5">Tipo de treino</label>
          <div className="flex flex-wrap gap-1.5">
            {PLAN_TYPES.map(t => (
              <button
                key={t}
                type="button"
                onClick={() => setType(t)}
                className="px-2.5 py-1 rounded-full text-[11.5px] font-semibold border transition-colors"
                style={type === t
                  ? { background: typeColor(t), borderColor: typeColor(t), color: 'white' }
                  : { background: 'white', borderColor: '#E2E8F0', color: '#334155' }}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-xs font-semibold text-ink-700">Exercícios ({exercises.length})</label>
          </div>

          <div className="relative mb-2">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-300" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar exercício pra adicionar..."
              className="w-full pl-8 pr-3 py-2 rounded-lg border border-ink-200 text-[13px] text-ink-900 outline-none focus:border-brand-500"
            />
            {query.length >= 2 && (
              <div className="absolute z-10 mt-1 w-full bg-white border border-ink-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                {suggestions.length === 0 ? (
                  <button
                    type="button"
                    onClick={() => addExercise(query)}
                    className="w-full text-left px-3 py-2 text-[13px] text-ink-600 hover:bg-ink-50 flex items-center gap-2"
                  >
                    <Plus size={13} /> Adicionar "{query}" manualmente
                  </button>
                ) : suggestions.map(s => (
                  <button
                    key={s.name}
                    type="button"
                    onClick={() => addExercise(s.name)}
                    className="w-full text-left px-3 py-2 text-[13px] text-ink-900 hover:bg-ink-50 flex items-center justify-between gap-2"
                  >
                    {s.name}
                    <span className="text-[10.5px] text-ink-400">{s.group}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {exercises.length > 0 && (
            <div className="border border-ink-100 rounded-lg px-3 mb-3">
              {exercises.map((ex, i) => (
                <ExerciseRow
                  key={ex.id}
                  ex={ex}
                  index={i}
                  total={exercises.length}
                  onChange={(next) => updateExercise(i, next)}
                  onRemove={() => removeExercise(i)}
                  onMove={(dir) => moveExercise(i, dir)}
                />
              ))}
            </div>
          )}

          <AISection planType={type} onGenerate={handleGenerate} />
        </div>
      </div>
    </ModalV2>
  );
}
