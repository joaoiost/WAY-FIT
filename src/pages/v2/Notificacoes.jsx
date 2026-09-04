import { useState, useEffect } from 'react';
import { Bell, BellRing, Plus, Trash2, Pencil, ToggleLeft, ToggleRight, CheckCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { supabase, hasSupabase } from '../../lib/supabase';
import { toast } from '../../lib/toast';
import StudentPicker from '../../components/v2/StudentPicker';
import ModalV2 from '../../components/v2/Modal';

const DAYS = [
  { value: 1, label: 'Seg' }, { value: 2, label: 'Ter' }, { value: 3, label: 'Qua' },
  { value: 4, label: 'Qui' }, { value: 5, label: 'Sex' }, { value: 6, label: 'Sáb' }, { value: 0, label: 'Dom' },
];
const DEFAULT_FORM = { title: '', message: '', days_of_week: [1, 2, 3, 4, 5], send_hour: 8, send_minute: 0, student_ids: [] };

function formatDays(days) {
  if (!days?.length) return '—';
  const sorted = [...days].sort((a, b) => (a === 0 ? 7 : a) - (b === 0 ? 7 : b));
  if (sorted.length === 7) return 'Todos os dias';
  if (sorted.join(',') === '1,2,3,4,5') return 'Seg – Sex';
  if (['6', '0', '0,6', '6,0'].includes(sorted.join(','))) return 'Fim de semana';
  return sorted.map(d => DAYS.find(x => x.value === d)?.label).filter(Boolean).join(', ');
}

function ScheduleModal({ schedule, students, onSave, onClose }) {
  const editing = !!schedule?.id;
  const [form, setForm] = useState(schedule ? { ...schedule } : { ...DEFAULT_FORM });
  const [saving, setSaving] = useState(false);

  const toggleDay = (val) => setForm(f => ({ ...f, days_of_week: f.days_of_week.includes(val) ? f.days_of_week.filter(d => d !== val) : [...f.days_of_week, val] }));
  const valid = form.title.trim() && form.message.trim() && form.days_of_week.length > 0;

  const handleSave = async () => {
    if (!valid) return;
    setSaving(true);
    await onSave(form);
    setSaving(false);
  };

  return (
    <ModalV2
      isOpen onClose={onClose}
      title={editing ? 'Editar lembrete' : 'Novo lembrete automático'}
      footer={
        <>
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-medium text-ink-500 hover:bg-ink-50">Cancelar</button>
          <button onClick={handleSave} disabled={saving || !valid} className="px-4 py-2 rounded-lg bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 disabled:opacity-40">
            {saving ? 'Salvando...' : 'Salvar lembrete'}
          </button>
        </>
      }
    >
      <div className="flex flex-col gap-3.5">
        <div>
          <label className="block text-xs font-semibold text-ink-700 mb-1.5">Título</label>
          <input value={form.title} onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Ex: Hora do treino" maxLength={80} className="w-full px-3 py-2 rounded-lg border border-ink-200 text-sm text-ink-900 outline-none focus:border-brand-500" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-ink-700 mb-1.5">Mensagem</label>
          <textarea value={form.message} onChange={(e) => setForm(f => ({ ...f, message: e.target.value }))} placeholder="Ex: Não esqueça do treino de hoje. Bora!" rows={3} className="w-full px-3 py-2 rounded-lg border border-ink-200 text-sm text-ink-900 outline-none focus:border-brand-500" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-ink-700 mb-1.5">Dias da semana</label>
          <div className="flex gap-1.5 flex-wrap">
            {DAYS.map(d => {
              const active = form.days_of_week.includes(d.value);
              return (
                <button key={d.value} type="button" onClick={() => toggleDay(d.value)}
                  className={`w-10 h-10 rounded-full text-[11px] font-bold transition-colors ${active ? 'bg-brand-600 text-white' : 'bg-ink-100 text-ink-500'}`}>
                  {d.label}
                </button>
              );
            })}
          </div>
        </div>
        <div>
          <label className="block text-xs font-semibold text-ink-700 mb-1.5">Horário (Brasília)</label>
          <div className="flex items-center gap-2">
            <select value={form.send_hour} onChange={(e) => setForm(f => ({ ...f, send_hour: Number(e.target.value) }))} className="px-3 py-2 rounded-lg border border-ink-200 text-sm text-ink-900 outline-none">
              {Array.from({ length: 24 }, (_, i) => <option key={i} value={i}>{String(i).padStart(2, '0')}h</option>)}
            </select>
            <span className="text-ink-400 font-bold">:</span>
            <select value={form.send_minute} onChange={(e) => setForm(f => ({ ...f, send_minute: Number(e.target.value) }))} className="px-3 py-2 rounded-lg border border-ink-200 text-sm text-ink-900 outline-none">
              {[0, 15, 30, 45].map(m => <option key={m} value={m}>{String(m).padStart(2, '0')}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className="block text-xs font-semibold text-ink-700 mb-1.5">Enviar para</label>
          <StudentPicker students={students} value={form.student_ids} onChange={(ids) => setForm(f => ({ ...f, student_ids: ids }))} multiple placeholder="Todos os alunos" />
        </div>
      </div>
    </ModalV2>
  );
}

export default function NotificacoesV2() {
  const { user } = useAuth();
  const [tab, setTab] = useState('now');
  const [students, setStudents] = useState([]);

  const [notifTitle, setNotifTitle] = useState('');
  const [notifMessage, setNotifMessage] = useState('');
  const [notifStudentIds, setNotifStudentIds] = useState([]);
  const [notifSending, setNotifSending] = useState(false);
  const [notifResult, setNotifResult] = useState(null);

  const [schedules, setSchedules] = useState([]);
  const [loadingSchedules, setLoadingSchedules] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState(null);

  useEffect(() => {
    if (!user || !hasSupabase) { setLoadingSchedules(false); return; }
    supabase.from('students').select('id, name').eq('personal_id', user.id).eq('status', 'ativo').then(({ data }) => setStudents(data || []));
    supabase.from('scheduled_notifications').select('*').eq('personal_id', user.id).order('created_at', { ascending: false })
      .then(({ data }) => { setSchedules(data || []); setLoadingSchedules(false); });
  }, [user?.id]);

  const handleSendNow = async () => {
    if (!notifTitle.trim() || !notifMessage.trim()) return;
    setNotifSending(true);
    setNotifResult(null);
    const targetIds = notifStudentIds.length > 0 ? notifStudentIds : students.map(s => String(s.id));
    if (!targetIds.length) {
      setNotifSending(false);
      setNotifResult({ ok: false, message: 'Nenhum aluno cadastrado ainda.' });
      return;
    }
    try {
      const { data, error } = await supabase.functions.invoke('send-push', {
        body: { student_ids: targetIds, title: notifTitle.trim(), message: notifMessage.trim(), personal_id: user.id },
      });
      if (error || !data?.ok) {
        await supabase.from('student_notifications').insert(
          targetIds.map(sid => ({ student_id: sid, personal_id: user.id, title: notifTitle.trim(), message: notifMessage.trim(), type: 'custom' }))
        );
        setNotifResult({ ok: true, message: `Notificação salva para ${targetIds.length} aluno(s) — aparece quando abrirem o app.` });
      } else {
        setNotifResult({ ok: true, message: `Push enviado para ${data.sent ?? targetIds.length} aluno(s).` });
      }
      setNotifTitle(''); setNotifMessage(''); setNotifStudentIds([]);
    } catch (e) {
      setNotifResult({ ok: false, message: e.message });
    }
    setNotifSending(false);
  };

  const handleSaveSchedule = async (form) => {
    if (form.id) {
      const { data } = await supabase.from('scheduled_notifications').update({
        title: form.title, message: form.message, days_of_week: form.days_of_week,
        send_hour: form.send_hour, send_minute: form.send_minute, student_ids: form.student_ids,
      }).eq('id', form.id).select().maybeSingle();
      if (data) setSchedules(prev => prev.map(s => s.id === data.id ? data : s));
    } else {
      const { data } = await supabase.from('scheduled_notifications').insert({ ...form, personal_id: user.id }).select().maybeSingle();
      if (data) setSchedules(prev => [data, ...prev]);
    }
    setModalOpen(false);
    setEditingSchedule(null);
    toast.success('Lembrete salvo!');
  };

  const handleToggle = async (schedule) => {
    const newActive = !schedule.is_active;
    await supabase.from('scheduled_notifications').update({ is_active: newActive }).eq('id', schedule.id);
    setSchedules(prev => prev.map(s => s.id === schedule.id ? { ...s, is_active: newActive } : s));
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Excluir este lembrete?')) return;
    await supabase.from('scheduled_notifications').delete().eq('id', id);
    setSchedules(prev => prev.filter(s => s.id !== id));
    toast.success('Lembrete excluído.');
  };

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-xl font-bold text-ink-900">Notificações</h2>
        <p className="text-[13px] text-ink-500 mt-0.5">Envie push diretamente para o celular dos seus alunos</p>
      </div>

      <div className="flex items-center gap-1 bg-ink-100 rounded-lg p-1 self-start">
        {[['now', 'Enviar agora', BellRing], ['scheduled', 'Lembretes automáticos', Bell]].map(([key, label, Icon]) => (
          <button key={key} onClick={() => setTab(key)} className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-[13px] font-semibold transition-colors ${tab === key ? 'bg-white text-ink-900 shadow-sm' : 'text-ink-500'}`}>
            <Icon size={13} /> {label}
          </button>
        ))}
      </div>

      {tab === 'now' && (
        <div className="max-w-lg bg-white border border-ink-100 rounded-xl p-5 flex flex-col gap-4">
          <div>
            <label className="block text-xs font-semibold text-ink-700 mb-1.5">Título</label>
            <input value={notifTitle} onChange={(e) => setNotifTitle(e.target.value)} placeholder="Ex: Treino de hoje disponível" maxLength={80} className="w-full px-3 py-2 rounded-lg border border-ink-200 text-sm text-ink-900 outline-none focus:border-brand-500" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-ink-700 mb-1.5">Mensagem</label>
            <textarea value={notifMessage} onChange={(e) => setNotifMessage(e.target.value)} placeholder="Ex: Seu treino A está pronto" rows={3} className="w-full px-3 py-2 rounded-lg border border-ink-200 text-sm text-ink-900 outline-none focus:border-brand-500" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-ink-700 mb-1.5">Enviar para</label>
            <StudentPicker students={students} value={notifStudentIds} onChange={setNotifStudentIds} multiple placeholder={`Todos os alunos (${students.length})`} />
          </div>

          {notifResult && (
            <div className={`flex items-center gap-2 rounded-lg px-3.5 py-2.5 ${notifResult.ok ? 'bg-success-50' : 'bg-danger-50'}`}>
              {notifResult.ok ? <CheckCheck size={15} className="text-success-500 shrink-0" /> : <Bell size={15} className="text-danger-500 shrink-0" />}
              <span className="text-[13px] font-medium text-ink-900">{notifResult.message}</span>
            </div>
          )}

          <button onClick={handleSendNow} disabled={notifSending || !notifTitle.trim() || !notifMessage.trim()}
            className="flex items-center justify-center gap-2 py-2.5 rounded-lg bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 disabled:opacity-50">
            <BellRing size={15} /> {notifSending ? 'Enviando...' : 'Enviar push agora'}
          </button>
        </div>
      )}

      {tab === 'scheduled' && (
        <div>
          <div className="flex items-center justify-between gap-3 mb-4">
            <p className="text-[13px] text-ink-500 flex-1">Push automático nos dias e horários configurados — chega no celular mesmo com o app fechado.</p>
            <button onClick={() => { setEditingSchedule(null); setModalOpen(true); }} className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-brand-600 text-white text-[12.5px] font-semibold hover:bg-brand-700 whitespace-nowrap shrink-0">
              <Plus size={14} /> Novo lembrete
            </button>
          </div>

          {loadingSchedules ? (
            <div className="py-16 text-center text-sm text-ink-400">Carregando...</div>
          ) : schedules.length === 0 ? (
            <div className="bg-white border border-ink-100 rounded-xl py-14 text-center">
              <Bell size={32} className="text-ink-200 mx-auto mb-3" />
              <p className="text-[14px] font-semibold text-ink-700">Nenhum lembrete configurado</p>
              <p className="text-[12.5px] text-ink-400 mt-1 mb-4">Crie lembretes automáticos para manter seus alunos motivados.</p>
              <button onClick={() => { setEditingSchedule(null); setModalOpen(true); }} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-brand-600 text-white text-[12.5px] font-semibold hover:bg-brand-700">
                <Plus size={14} /> Criar primeiro lembrete
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {schedules.map(s => (
                <div key={s.id} className="flex items-center gap-3.5 bg-white border border-ink-100 rounded-xl px-4 py-3.5" style={{ opacity: s.is_active ? 1 : 0.55, borderLeft: `3px solid ${s.is_active ? '#4F46E5' : '#E2E8F0'}` }}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <p className="text-[13.5px] font-bold text-ink-900">{s.title}</p>
                      {!s.is_active && <span className="text-[10.5px] font-bold text-ink-400 bg-ink-100 px-2 py-0.5 rounded-full">Pausado</span>}
                    </div>
                    <p className="text-[12px] text-ink-500 truncate mb-1.5">{s.message}</p>
                    <div className="flex gap-1.5 flex-wrap">
                      <span className="text-[10.5px] font-semibold bg-brand-50 text-brand-700 px-2 py-0.5 rounded-full">{formatDays(s.days_of_week)}</span>
                      <span className="text-[10.5px] font-semibold bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">{String(s.send_hour).padStart(2, '0')}:{String(s.send_minute).padStart(2, '0')} BRT</span>
                      {s.student_ids?.length > 0 && <span className="text-[10.5px] font-semibold bg-success-50 text-success-500 px-2 py-0.5 rounded-full">{s.student_ids.length} aluno(s)</span>}
                    </div>
                  </div>
                  <div className="flex gap-1.5 shrink-0">
                    <button onClick={() => handleToggle(s)} title={s.is_active ? 'Pausar' : 'Ativar'} className={`w-8 h-8 rounded-lg flex items-center justify-center ${s.is_active ? 'bg-success-50 text-success-500' : 'bg-ink-100 text-ink-400'}`}>
                      {s.is_active ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
                    </button>
                    <button onClick={() => { setEditingSchedule(s); setModalOpen(true); }} title="Editar" className="w-8 h-8 rounded-lg flex items-center justify-center bg-brand-50 text-brand-600">
                      <Pencil size={14} />
                    </button>
                    <button onClick={() => handleDelete(s.id)} title="Excluir" className="w-8 h-8 rounded-lg flex items-center justify-center bg-danger-50 text-danger-500">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {modalOpen && (
        <ScheduleModal schedule={editingSchedule} students={students} onSave={handleSaveSchedule} onClose={() => { setModalOpen(false); setEditingSchedule(null); }} />
      )}
    </div>
  );
}
