import { useState, useEffect, useMemo } from 'react';
import { Plus, Search, Dumbbell, Copy, Users, Pencil, Trash2, X, Sparkles } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { supabase, hasSupabase } from '../../lib/supabase';
import { toast } from '../../lib/toast';
import StudentPicker from '../../components/v2/StudentPicker';
import ModalV2 from '../../components/v2/Modal';
import TemplateEditor from './treinos/TemplateEditor';
import AssignDialog from './treinos/AssignDialog';
import { DAYS, PLAN_TYPES, typeColor } from './treinos/treinosData';
import { STARTER_TEMPLATES } from '../../data/starterTemplates';

const sortExercises = (exs = []) => [...exs].sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));

async function persistPlan({ id, personalId, studentId, name, type, days, exercises }) {
  if (id) {
    const { error } = await supabase.from('training_plans').update({ name, type, days }).eq('id', id);
    if (error) throw error;
    await supabase.from('exercises').delete().eq('plan_id', id);
    if (exercises.length) {
      const { error: exErr } = await supabase.from('exercises').insert(
        exercises.map((e, i) => ({ plan_id: id, name: e.name, sets: parseInt(e.sets) || 4, reps: e.reps, rest: e.rest, load: e.load || '', order_index: i }))
      );
      if (exErr) throw exErr;
    }
    const { data } = await supabase.from('training_plans').select('*, exercises(*)').eq('id', id).single();
    return data;
  }
  const { data: plan, error } = await supabase.from('training_plans').insert({
    personal_id: personalId, student_id: studentId, name, type, days,
  }).select().single();
  if (error) throw error;
  if (exercises.length) {
    const { error: exErr } = await supabase.from('exercises').insert(
      exercises.map((e, i) => ({ plan_id: plan.id, name: e.name, sets: parseInt(e.sets) || 4, reps: e.reps, rest: e.rest, load: e.load || '', order_index: i }))
    );
    if (exErr) throw exErr;
  }
  const { data: full } = await supabase.from('training_plans').select('*, exercises(*)').eq('id', plan.id).single();
  return full;
}

function TemplateCard({ tpl, onEdit, onAssign, onDuplicate, onDelete }) {
  return (
    <div className="bg-white border border-ink-100 rounded-xl p-4 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[14px] font-bold text-ink-900 truncate">{tpl.name}</p>
          <div className="flex items-center gap-1.5 mt-1">
            <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: typeColor(tpl.type) }} />
            <span className="text-[11.5px] text-ink-500">{tpl.type}</span>
            <span className="text-ink-200">•</span>
            <span className="text-[11.5px] text-ink-500">{tpl.exercises?.length || 0} exercícios</span>
          </div>
        </div>
        <div className="w-9 h-9 rounded-lg bg-ink-50 flex items-center justify-center shrink-0">
          <Dumbbell size={15} className="text-ink-400" />
        </div>
      </div>
      <div className="flex items-center gap-1.5 pt-2 border-t border-ink-100">
        <button onClick={() => onAssign(tpl)} className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-brand-50 text-brand-700 text-[12px] font-semibold hover:bg-brand-100">
          <Users size={13} /> Atribuir
        </button>
        <button onClick={() => onEdit(tpl)} aria-label="Editar" className="w-8 h-8 flex items-center justify-center rounded-lg text-ink-400 hover:bg-ink-50 hover:text-ink-700">
          <Pencil size={14} />
        </button>
        <button onClick={() => onDuplicate(tpl)} aria-label="Duplicar" className="w-8 h-8 flex items-center justify-center rounded-lg text-ink-400 hover:bg-ink-50 hover:text-ink-700">
          <Copy size={14} />
        </button>
        <button onClick={() => onDelete(tpl)} aria-label="Excluir" className="w-8 h-8 flex items-center justify-center rounded-lg text-ink-400 hover:bg-danger-50 hover:text-danger-500">
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}

function StarterPicker({ isOpen, onClose, onPick }) {
  return (
    <ModalV2 isOpen={isOpen} onClose={onClose} title="Modelos prontos">
      <div className="flex flex-col gap-2">
        {STARTER_TEMPLATES.map((s, i) => (
          <button
            key={i}
            onClick={() => onPick(s)}
            className="text-left px-3.5 py-3 rounded-lg border border-ink-100 hover:border-brand-300 hover:bg-brand-50/40 transition-colors"
          >
            <div className="flex items-center gap-1.5 mb-0.5">
              <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: typeColor(s.type) }} />
              <span className="text-[13.5px] font-semibold text-ink-900">{s.name}</span>
            </div>
            <p className="text-[11.5px] text-ink-500">{s.exercises.length} exercícios · {s.type}</p>
          </button>
        ))}
      </div>
    </ModalV2>
  );
}

export default function TreinosV2() {
  const { user } = useAuth();
  const [tab, setTab] = useState('modelos');
  const [templates, setTemplates] = useState([]);
  const [plans, setPlans] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [editing, setEditing] = useState(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [assignDialog, setAssignDialog] = useState(null);
  const [starterOpen, setStarterOpen] = useState(false);

  const [selStudent, setSelStudent] = useState(null);

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

  const filteredTemplates = useMemo(() => {
    return templates.filter(t => {
      if (typeFilter && t.type !== typeFilter) return false;
      if (search && !t.name.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [templates, search, typeFilter]);

  const studentPlans = useMemo(
    () => plans.filter(p => p.student_id === selStudent),
    [plans, selStudent]
  );

  const planForDay = (dayV) => studentPlans.find(p => (p.days || []).map(Number).includes(dayV));

  // ── Ações de template ──────────────────────────────────────────
  const handleSaveTemplate = async ({ id, name, type, exercises }) => {
    try {
      const saved = await persistPlan({ id, personalId: user.id, studentId: null, name, type, days: [], exercises });
      setTemplates(prev => id ? prev.map(t => t.id === id ? saved : t) : [saved, ...prev]);
      toast.success(id ? 'Modelo atualizado!' : 'Modelo criado!');
      setEditorOpen(false);
      setEditing(null);
    } catch (err) {
      toast.error('Erro ao salvar: ' + (err?.message || 'tente novamente'));
    }
  };

  const handleDeleteTemplate = async (tpl) => {
    if (!window.confirm(`Excluir "${tpl.name}"?`)) return;
    await supabase.from('training_plans').delete().eq('id', tpl.id);
    setTemplates(prev => prev.filter(t => t.id !== tpl.id));
    toast.success('Modelo excluído.');
  };

  const handleDuplicateTemplate = async (tpl) => {
    try {
      const saved = await persistPlan({
        personalId: user.id, studentId: null, name: tpl.name + ' (cópia)', type: tpl.type, days: [],
        exercises: sortExercises(tpl.exercises),
      });
      setTemplates(prev => [saved, ...prev]);
      toast.success('Modelo duplicado!');
    } catch {
      toast.error('Erro ao duplicar modelo.');
    }
  };

  const handlePickStarter = async (starter) => {
    try {
      const saved = await persistPlan({
        personalId: user.id, studentId: null, name: starter.name, type: starter.type, days: [],
        exercises: starter.exercises,
      });
      setTemplates(prev => [saved, ...prev]);
      toast.success(`"${starter.name}" adicionado!`);
      setStarterOpen(false);
    } catch {
      toast.error('Erro ao adicionar modelo.');
    }
  };

  // ── Atribuição ──────────────────────────────────────────────────
  const handleAssign = async (template, studentIds, days) => {
    try {
      const exs = sortExercises(template.exercises);
      for (const sid of studentIds) {
        const overlapping = plans.filter(p => p.student_id === sid && (p.days || []).map(Number).some(d => days.includes(d)));
        for (const op of overlapping) await supabase.from('training_plans').delete().eq('id', op.id);
        setPlans(prev => prev.filter(p => !overlapping.find(o => o.id === p.id)));

        const saved = await persistPlan({ personalId: user.id, studentId: sid, name: template.name, type: template.type, days, exercises: exs });
        setPlans(prev => [saved, ...prev]);
      }
      toast.success('Treino atribuído!');
      setAssignDialog(null);
    } catch {
      toast.error('Erro ao atribuir treino.');
    }
  };

  const handleRemoveDay = async (plan, dayV) => {
    const remainingDays = (plan.days || []).map(Number).filter(d => d !== dayV);
    try {
      if (remainingDays.length === 0) {
        await supabase.from('training_plans').delete().eq('id', plan.id);
        setPlans(prev => prev.filter(p => p.id !== plan.id));
      } else {
        await supabase.from('training_plans').update({ days: remainingDays }).eq('id', plan.id);
        setPlans(prev => prev.map(p => p.id === plan.id ? { ...p, days: remainingDays } : p));
      }
      toast.success('Treino removido desse dia.');
    } catch {
      toast.error('Erro ao remover treino.');
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center py-24 text-sm text-ink-400">Carregando...</div>;
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1 bg-ink-100 rounded-lg p-1">
          <button
            onClick={() => setTab('modelos')}
            className={`px-3.5 py-1.5 rounded-md text-[13px] font-semibold transition-colors ${tab === 'modelos' ? 'bg-white text-ink-900 shadow-sm' : 'text-ink-500'}`}
          >
            Modelos
          </button>
          <button
            onClick={() => setTab('atribuir')}
            className={`px-3.5 py-1.5 rounded-md text-[13px] font-semibold transition-colors ${tab === 'atribuir' ? 'bg-white text-ink-900 shadow-sm' : 'text-ink-500'}`}
          >
            Atribuir a um aluno
          </button>
        </div>

        {tab === 'modelos' && (
          <button
            onClick={() => { setEditing(null); setEditorOpen(true); }}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-brand-600 text-white text-[13px] font-semibold hover:bg-brand-700"
          >
            <Plus size={15} /> Novo modelo
          </button>
        )}
      </div>

      {tab === 'modelos' && (
        <>
          {templates.length === 0 ? (
            <div className="bg-white border border-ink-100 rounded-xl py-16 px-6 flex flex-col items-center text-center gap-3">
              <div className="w-12 h-12 rounded-full bg-brand-50 flex items-center justify-center">
                <Dumbbell size={22} className="text-brand-600" />
              </div>
              <div>
                <p className="text-[15px] font-bold text-ink-900">Nenhum modelo de treino ainda</p>
                <p className="text-[13px] text-ink-500 mt-1 max-w-sm">Crie um do zero ou comece com um modelo pronto.</p>
              </div>
              <div className="flex gap-2 mt-2">
                <button onClick={() => setStarterOpen(true)} className="px-4 py-2 rounded-lg border border-ink-200 text-[13px] font-semibold text-ink-700 hover:bg-ink-50">
                  Usar um pronto
                </button>
                <button onClick={() => { setEditing(null); setEditorOpen(true); }} className="px-4 py-2 rounded-lg bg-brand-600 text-white text-[13px] font-semibold hover:bg-brand-700">
                  Criar do zero
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative flex-1 min-w-[200px]">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-300" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Buscar modelo..."
                    className="w-full pl-9 pr-3 py-2 rounded-lg border border-ink-200 text-[13px] text-ink-900 outline-none focus:border-brand-500"
                  />
                </div>
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="px-3 py-2 rounded-lg border border-ink-200 text-[13px] text-ink-700 bg-white outline-none"
                >
                  <option value="">Todos os tipos</option>
                  {PLAN_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>

              <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))' }}>
                {filteredTemplates.map(tpl => (
                  <TemplateCard
                    key={tpl.id}
                    tpl={tpl}
                    onEdit={(t) => { setEditing(t); setEditorOpen(true); }}
                    onAssign={(t) => setAssignDialog({ template: t })}
                    onDuplicate={handleDuplicateTemplate}
                    onDelete={handleDeleteTemplate}
                  />
                ))}
              </div>
            </>
          )}
        </>
      )}

      {tab === 'atribuir' && (
        <div className="flex flex-col gap-4">
          {students.length === 0 ? (
            <div className="bg-white border border-ink-100 rounded-xl py-16 px-6 text-center">
              <p className="text-[14px] font-semibold text-ink-900">Nenhum aluno cadastrado ainda</p>
              <p className="text-[13px] text-ink-500 mt-1">Cadastre um aluno pra poder atribuir treinos.</p>
            </div>
          ) : (
            <>
              <div className="max-w-xs">
                <StudentPicker students={students} value={selStudent} onChange={setSelStudent} placeholder="Escolher aluno..." />
              </div>

              {selStudent && (
                <div className="flex sm:grid sm:grid-cols-7 gap-2 overflow-x-auto sm:overflow-visible pb-1 -mx-1 px-1 sm:mx-0 sm:px-0">
                  {DAYS.map(d => {
                    const plan = planForDay(d.v);
                    return (
                      <div key={d.v} className="flex flex-col gap-1.5 w-24 sm:w-auto shrink-0 sm:shrink">
                        <p className="text-center text-[11px] font-bold text-ink-400 uppercase">{d.s}</p>
                        {plan ? (
                          <div className="relative bg-white border border-ink-100 rounded-lg p-2 min-h-[84px] flex flex-col gap-1 group">
                            <button
                              onClick={() => handleRemoveDay(plan, d.v)}
                              aria-label="Remover treino desse dia"
                              className="absolute top-1 right-1 w-5 h-5 rounded-full bg-ink-50 text-ink-300 hover:bg-danger-50 hover:text-danger-500 flex items-center justify-center opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                            >
                              <X size={11} />
                            </button>
                            <button
                              onClick={() => setAssignDialog({ fixedStudentId: selStudent, initialDays: [d.v] })}
                              className="flex-1 text-left"
                            >
                              <span className="w-1.5 h-1.5 rounded-full inline-block mb-1" style={{ background: typeColor(plan.type) }} />
                              <p className="text-[11.5px] font-semibold text-ink-900 leading-tight">{plan.name}</p>
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setAssignDialog({ fixedStudentId: selStudent, initialDays: [d.v] })}
                            className="min-h-[84px] rounded-lg border border-dashed border-ink-200 flex items-center justify-center text-ink-300 hover:border-brand-300 hover:text-brand-500 transition-colors"
                          >
                            <Plus size={16} />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {selStudent && (
                <button
                  onClick={() => setAssignDialog({ fixedStudentId: selStudent })}
                  className="self-start flex items-center gap-1.5 text-[13px] font-semibold text-brand-600 hover:text-brand-700"
                >
                  <Sparkles size={14} /> Atribuir um modelo a vários dias de uma vez
                </button>
              )}
            </>
          )}
        </div>
      )}

      <TemplateEditor
        isOpen={editorOpen}
        onClose={() => { setEditorOpen(false); setEditing(null); }}
        onSave={handleSaveTemplate}
        initial={editing}
      />

      {assignDialog && (
        <AssignDialog
          isOpen
          onClose={() => setAssignDialog(null)}
          templates={templates}
          students={students}
          template={assignDialog.template}
          fixedStudentId={assignDialog.fixedStudentId}
          initialDays={assignDialog.initialDays || []}
          onConfirm={handleAssign}
        />
      )}

      <StarterPicker isOpen={starterOpen} onClose={() => setStarterOpen(false)} onPick={handlePickStarter} />
    </div>
  );
}
