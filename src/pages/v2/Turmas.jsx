import { useState, useEffect } from 'react';
import { Users, Plus, Clock, MapPin, Trash2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { supabase, hasSupabase } from '../../lib/supabase';
import { toast } from '../../lib/toast';
import { todayLocal } from '../../lib/date';
import ModalV2 from '../../components/v2/Modal';

const TYPES = ['Musculação', 'Funcional', 'Hipertrofia', 'Cardio', 'Yoga', 'Pilates', 'Força', 'HIIT', 'Mobilidade'];
const TYPE_COLORS = { Musculação: '#2563EB', Funcional: '#059669', Hipertrofia: '#7C3AED', Cardio: '#D97706', Yoga: '#DB2777', Pilates: '#0891B2', Força: '#DC2626', HIIT: '#EA580C', Mobilidade: '#8B5CF6' };
const STATUS_OPTS = [
  { key: 'confirmado', label: 'Confirmado', color: '#D97706', bg: '#FFFBEB' },
  { key: 'presente', label: 'Presente', color: '#059669', bg: '#ECFDF5' },
  { key: 'ausente', label: 'Ausente', color: '#DC2626', bg: '#FEF2F2' },
];
const AVATAR_COLORS = ['#4F46E5', '#059669', '#7C3AED', '#D97706', '#DC2626', '#DB2777', '#0891B2'];
const avatarColor = (id) => AVATAR_COLORS[String(id).charCodeAt(0) % AVATAR_COLORS.length];
const initialsOf = (name = '') => name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase() || '?';

const emptyForm = { name: '', type: 'Musculação', date: todayLocal(), time: '07:00', duration_minutes: 60, max_students: 15, location: '' };

export default function TurmasV2() {
  const { user } = useAuth();
  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('upcoming');
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [detailClass, setDetailClass] = useState(null);
  const [attendance, setAttendance] = useState({});

  useEffect(() => {
    if (!user || !hasSupabase) { setLoading(false); return; }
    loadData();
  }, [user?.id]);

  async function loadData() {
    const [classRes, studRes] = await Promise.all([
      supabase.from('group_classes').select('*, group_class_attendance(student_id, status)').eq('personal_id', user.id).order('date').order('time'),
      supabase.from('students').select('id, name, color, initials, status').eq('personal_id', user.id).eq('status', 'ativo').order('name'),
    ]);
    setClasses(classRes.data || []);
    setStudents(studRes.data || []);
    setLoading(false);
  }

  async function createClass() {
    if (!form.name.trim()) return;
    setSaving(true);
    const { error } = await supabase.from('group_classes').insert({ ...form, personal_id: user.id });
    setSaving(false);
    if (error) { toast.error('Não foi possível criar a aula.'); return; }
    setCreateOpen(false);
    setForm(emptyForm);
    toast.success('Aula criada!');
    loadData();
  }

  async function deleteClass(id) {
    if (!window.confirm('Excluir esta aula?')) return;
    await supabase.from('group_classes').delete().eq('id', id);
    setDetailClass(null);
    toast.success('Aula excluída.');
    loadData();
  }

  function openDetail(cls) {
    setDetailClass(cls);
    const att = {};
    (cls.group_class_attendance || []).forEach(a => { att[a.student_id] = a.status; });
    setAttendance(att);
  }

  function setStatus(studentId, status) {
    setAttendance(prev => ({ ...prev, [studentId]: prev[studentId] === status ? null : status }));
  }

  async function saveAttendance() {
    setSaving(true);
    const rows = Object.entries(attendance).filter(([, s]) => s).map(([student_id, status]) => ({ class_id: detailClass.id, student_id, status }));
    const toRemove = Object.entries(attendance).filter(([, s]) => !s).map(([id]) => id);
    if (rows.length) await supabase.from('group_class_attendance').upsert(rows, { onConflict: 'class_id,student_id' });
    if (toRemove.length) await supabase.from('group_class_attendance').delete().eq('class_id', detailClass.id).in('student_id', toRemove);
    setSaving(false);
    setDetailClass(null);
    toast.success('Presença salva!');
    loadData();
  }

  const today = todayLocal();
  const filtered = classes.filter(c => filter === 'upcoming' ? c.date >= today : c.date < today);
  const totalStudentsTaught = new Set(classes.flatMap(c => (c.group_class_attendance || []).filter(a => a.status === 'presente').map(a => a.student_id))).size;
  const nextClass = classes.find(c => c.date >= today);

  if (loading) return <div className="py-24 text-center text-sm text-ink-400">Carregando...</div>;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-ink-900">Turmas</h2>
          <p className="text-[13px] text-ink-500 mt-0.5">Aulas coletivas e lista de presença</p>
        </div>
        <button onClick={() => setCreateOpen(true)} className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-brand-600 text-white text-[13px] font-semibold hover:bg-brand-700">
          <Plus size={15} /> Nova aula
        </button>
      </div>

      <div className="grid grid-cols-3 gap-2.5">
        <div className="bg-white border border-ink-100 rounded-xl p-3.5 text-center">
          <p className="text-lg font-extrabold text-ink-900">{classes.length}</p>
          <p className="text-[11px] text-ink-500">Total de aulas</p>
        </div>
        <div className="bg-white border border-ink-100 rounded-xl p-3.5 text-center">
          <p className="text-lg font-extrabold text-ink-900">{totalStudentsTaught}</p>
          <p className="text-[11px] text-ink-500">Alunos atendidos</p>
        </div>
        <div className="bg-white border border-ink-100 rounded-xl p-3.5 text-center">
          <p className="text-lg font-extrabold text-ink-900">{nextClass ? new Date(nextClass.date + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }) : '—'}</p>
          <p className="text-[11px] text-ink-500">Próxima aula</p>
        </div>
      </div>

      <div className="flex items-center gap-1 bg-ink-100 rounded-lg p-1 self-start">
        {[['upcoming', 'Próximas'], ['past', 'Passadas']].map(([k, l]) => (
          <button key={k} onClick={() => setFilter(k)} className={`px-3.5 py-1.5 rounded-md text-[13px] font-semibold transition-colors ${filter === k ? 'bg-white text-ink-900 shadow-sm' : 'text-ink-500'}`}>{l}</button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white border border-ink-100 rounded-xl py-16 text-center">
          <Users size={26} className="text-ink-200 mx-auto mb-2" />
          <p className="text-[13.5px] font-semibold text-ink-700">{filter === 'upcoming' ? 'Nenhuma aula agendada' : 'Nenhuma aula passada'}</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map(cls => {
            const color = TYPE_COLORS[cls.type] || '#4F46E5';
            const presentCount = (cls.group_class_attendance || []).filter(a => a.status === 'presente').length;
            const totalAtt = (cls.group_class_attendance || []).length;
            return (
              <button key={cls.id} onClick={() => openDetail(cls)} className="flex items-center gap-3.5 bg-white border border-ink-100 rounded-xl px-4 py-3 text-left hover:border-brand-200 transition-colors">
                <div className="w-11 text-center shrink-0">
                  <p className="text-xl font-extrabold text-ink-900 leading-none">{new Date(cls.date + 'T12:00:00').getDate()}</p>
                  <p className="text-[9.5px] font-bold uppercase text-ink-400">{new Date(cls.date + 'T12:00:00').toLocaleDateString('pt-BR', { month: 'short' })}</p>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="text-[13.5px] font-semibold text-ink-900 truncate">{cls.name}</p>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0" style={{ color, background: color + '18' }}>{cls.type}</span>
                  </div>
                  <div className="flex gap-3 flex-wrap">
                    <span className="text-[11.5px] text-ink-400 flex items-center gap-1"><Clock size={11} /> {cls.time?.slice(0, 5)} · {cls.duration_minutes}min</span>
                    {cls.location && <span className="text-[11.5px] text-ink-400 flex items-center gap-1"><MapPin size={11} /> {cls.location}</span>}
                    {totalAtt > 0 && <span className="text-[11.5px] text-success-500 font-medium">{presentCount}/{totalAtt} presentes</span>}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      <ModalV2
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Nova aula"
        footer={
          <>
            <button onClick={() => setCreateOpen(false)} className="px-4 py-2 rounded-lg text-sm font-medium text-ink-500 hover:bg-ink-50">Cancelar</button>
            <button onClick={createClass} disabled={!form.name.trim() || saving} className="px-4 py-2 rounded-lg bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 disabled:opacity-40">
              {saving ? 'Criando...' : 'Criar aula'}
            </button>
          </>
        }
      >
        <div className="flex flex-col gap-3.5">
          <div>
            <label className="block text-xs font-semibold text-ink-700 mb-1.5">Nome da aula</label>
            <input autoFocus value={form.name} onChange={(e) => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Ex: Funcional em grupo" className="w-full px-3 py-2 rounded-lg border border-ink-200 text-sm text-ink-900 outline-none focus:border-brand-500" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-ink-700 mb-1.5">Tipo</label>
            <select value={form.type} onChange={(e) => setForm(p => ({ ...p, type: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-ink-200 text-sm text-ink-900 outline-none">
              {TYPES.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-ink-700 mb-1.5">Data</label>
              <input type="date" value={form.date} onChange={(e) => setForm(p => ({ ...p, date: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-ink-200 text-sm text-ink-900 outline-none" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink-700 mb-1.5">Horário</label>
              <input type="time" value={form.time} onChange={(e) => setForm(p => ({ ...p, time: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-ink-200 text-sm text-ink-900 outline-none" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-ink-700 mb-1.5">Duração (min)</label>
              <input type="number" value={form.duration_minutes} onChange={(e) => setForm(p => ({ ...p, duration_minutes: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-ink-200 text-sm text-ink-900 outline-none" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink-700 mb-1.5">Máx. alunos</label>
              <input type="number" value={form.max_students} onChange={(e) => setForm(p => ({ ...p, max_students: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-ink-200 text-sm text-ink-900 outline-none" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-ink-700 mb-1.5">Local</label>
            <input value={form.location} onChange={(e) => setForm(p => ({ ...p, location: e.target.value }))} placeholder="Ex: Sala 2" className="w-full px-3 py-2 rounded-lg border border-ink-200 text-sm text-ink-900 outline-none" />
          </div>
        </div>
      </ModalV2>

      <ModalV2
        isOpen={!!detailClass}
        onClose={() => setDetailClass(null)}
        title={detailClass?.name}
        footer={
          <>
            <button onClick={() => deleteClass(detailClass.id)} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-danger-500 text-sm font-semibold hover:bg-danger-50">
              <Trash2 size={14} /> Excluir
            </button>
            <button onClick={saveAttendance} disabled={saving} className="flex-1 px-4 py-2 rounded-lg bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 disabled:opacity-50">
              {saving ? 'Salvando...' : 'Salvar presença'}
            </button>
          </>
        }
      >
        {detailClass && (
          <div className="flex flex-col gap-4">
            <div>
              <p className="text-[12.5px] text-ink-500 capitalize">
                {new Date(detailClass.date + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })} · {detailClass.time?.slice(0, 5)} · {detailClass.duration_minutes}min
              </p>
              {detailClass.location && <p className="text-[12.5px] text-ink-500 flex items-center gap-1 mt-0.5"><MapPin size={12} /> {detailClass.location}</p>}
            </div>

            <div>
              <p className="text-[10.5px] font-bold uppercase text-ink-400 mb-2">Lista de presença</p>
              <div className="flex flex-col gap-2">
                {students.map(s => {
                  const status = attendance[s.id] || null;
                  const color = s.color || avatarColor(s.id);
                  return (
                    <div key={s.id} className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0" style={{ background: color }}>{s.initials || initialsOf(s.name)}</div>
                      <span className="flex-1 text-[13px] font-medium text-ink-900 truncate">{s.name}</span>
                      <div className="flex gap-1 shrink-0">
                        {STATUS_OPTS.map(opt => {
                          const active = status === opt.key;
                          return (
                            <button
                              key={opt.key}
                              onClick={() => setStatus(s.id, opt.key)}
                              className="px-2 py-1 rounded-md text-[10.5px] font-bold border transition-colors"
                              style={active ? { background: opt.bg, color: opt.color, borderColor: opt.color + '40' } : { background: 'white', color: '#94A3B8', borderColor: '#E2E8F0' }}
                            >
                              {opt.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </ModalV2>
    </div>
  );
}
