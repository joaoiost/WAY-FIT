import { useMemo, useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, Check } from 'lucide-react';

function initialsOf(name = '') {
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase() || '?';
}

// Combobox de "escolher um aluno" — busca por nome + lista com avatar.
// Substitui as ~6 versões diferentes disso espalhadas pelo app (tabela,
// dropdown nativo, chips horizontais, checkbox list...). Quem chama já
// deve ter a lista de alunos carregada — este componente só seleciona.
export default function StudentPicker({
  students = [],
  value,
  onChange,
  placeholder = 'Buscar aluno...',
  multiple = false,
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const rootRef = useRef(null);

  useEffect(() => {
    // No modo múltiplo a lista fica "inline" (empurra o conteúdo abaixo em
    // vez de flutuar por cima) — fechar sozinho ao clicar fora causaria um
    // reflow bem na hora do clique seguinte (ex: escolher um dia logo
    // abaixo), fazendo o clique "errar" o alvo que acabou de se mover.
    if (!open || multiple) return;
    const onClickOutside = (e) => { if (!rootRef.current?.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [open, multiple]);

  const selectedIds = useMemo(
    () => new Set(multiple ? (Array.isArray(value) ? value : []) : [value]),
    [value, multiple]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return students;
    return students.filter(s => s.name?.toLowerCase().includes(q));
  }, [students, query]);

  const selectedStudents = students.filter(s => selectedIds.has(s.id));

  const handlePick = (student) => {
    if (multiple) {
      const current = Array.isArray(value) ? value : [];
      const next = current.includes(student.id)
        ? current.filter(id => id !== student.id)
        : [...current, student.id];
      onChange(next);
    } else {
      onChange(student.id);
      setOpen(false);
      setQuery('');
    }
  };

  const label = multiple
    ? selectedStudents.length
      ? `${selectedStudents.length} selecionado${selectedStudents.length > 1 ? 's' : ''}`
      : placeholder
    : selectedStudents[0]?.name || placeholder;

  return (
    <div ref={rootRef} className="relative" style={{ colorScheme: 'light' }}>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg border border-ink-200 bg-white text-left text-sm hover:border-ink-300 transition-colors"
      >
        {!multiple && selectedStudents[0] && (
          <span className="w-6 h-6 rounded-full bg-brand-100 text-brand-700 text-[10px] font-bold flex items-center justify-center shrink-0">
            {initialsOf(selectedStudents[0].name)}
          </span>
        )}
        <span className={`flex-1 truncate ${selectedStudents.length ? 'text-ink-900 font-medium' : 'text-ink-300'}`}>
          {label}
        </span>
        <ChevronDown size={15} className="text-ink-300 shrink-0" />
      </button>

      {open && (
        <div className={`${multiple ? 'relative' : 'absolute z-50'} mt-1.5 w-full min-w-[260px] bg-white border border-ink-200 rounded-xl shadow-lg overflow-hidden`}>
          <div className="flex items-center gap-2 px-3 py-2.5 border-b border-ink-100">
            <Search size={14} className="text-ink-300 shrink-0" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por nome..."
              className="flex-1 text-sm outline-none border-none p-0 text-ink-900 placeholder:text-ink-300"
            />
          </div>
          <div className="max-h-64 overflow-y-auto py-1">
            {filtered.length === 0 && (
              <p className="text-center text-xs text-ink-400 py-6">Nenhum aluno encontrado.</p>
            )}
            {filtered.map(s => {
              const checked = selectedIds.has(s.id);
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => handlePick(s)}
                  className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-ink-50 text-left transition-colors"
                >
                  <span className="w-7 h-7 rounded-full bg-brand-100 text-brand-700 text-[10.5px] font-bold flex items-center justify-center shrink-0">
                    {initialsOf(s.name)}
                  </span>
                  <span className="flex-1 min-w-0 text-[13.5px] text-ink-900 truncate">{s.name}</span>
                  {checked && <Check size={15} className="text-brand-600 shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
