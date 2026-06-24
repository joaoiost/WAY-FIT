import { useState, useEffect } from 'react';
import { Bell, BellRing, Plus, Trash2, X, Loader, CheckCheck, Clock, Pencil, ToggleLeft, ToggleRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { supabase, hasSupabase } from '../../lib/supabase';

const DAYS = [
  { value: 1, label: 'Seg' },
  { value: 2, label: 'Ter' },
  { value: 3, label: 'Qua' },
  { value: 4, label: 'Qui' },
  { value: 5, label: 'Sex' },
  { value: 6, label: 'Sáb' },
  { value: 0, label: 'Dom' },
];

const DEFAULT_FORM = {
  title: '',
  message: '',
  days_of_week: [1, 2, 3, 4, 5],
  send_hour: 8,
  send_minute: 0,
  student_ids: [],
};

function formatDays(days) {
  if (!days?.length) return '—';
  const sorted = [...days].sort((a, b) => (a === 0 ? 7 : a) - (b === 0 ? 7 : b));
  if (sorted.length === 7) return 'Todos os dias';
  if (sorted.join(',') === '1,2,3,4,5') return 'Seg – Sex';
  if (sorted.join(',') === '6' || sorted.join(',') === '0' || sorted.join(',') === '0,6' || sorted.join(',') === '6,0') return 'Fim de semana';
  return sorted.map(d => DAYS.find(x => x.value === d)?.label).filter(Boolean).join(', ');
}

function ScheduleModal({ schedule, students, onSave, onClose }) {
  const editing = !!schedule?.id;
  const [form, setForm] = useState(
    schedule
      ? { ...schedule }
      : { ...DEFAULT_FORM }
  );
  const [saving, setSaving] = useState(false);

  const toggleDay = (val) => {
    setForm(f => ({
      ...f,
      days_of_week: f.days_of_week.includes(val)
        ? f.days_of_week.filter(d => d !== val)
        : [...f.days_of_week, val],
    }));
  };

  const valid = form.title.trim() && form.message.trim() && form.days_of_week.length > 0;

  const handleSave = async () => {
    if (!valid) return;
    setSaving(true);
    await onSave(form);
    setSaving(false);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: 'var(--gray-900)' }}>
            {editing ? 'Editar lembrete' : 'Novo lembrete automático'}
          </h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray-400)', display: 'flex', padding: 4 }}>
            <X size={20} />
          </button>
        </div>
        <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label>Título *</label>
            <input
              type="text"
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="Ex: Hora do treino! 💪"
              maxLength={80}
            />
          </div>
          <div>
            <label>Mensagem *</label>
            <textarea
              value={form.message}
              onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
              placeholder="Ex: Não esqueça do treino de hoje. Bora!"
              rows={3}
              style={{ resize: 'vertical' }}
            />
          </div>

          <div>
            <label style={{ marginBottom: 10 }}>Dias da semana *</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {DAYS.map(d => {
                const active = form.days_of_week.includes(d.value);
                return (
                  <button
                    key={d.value}
                    type="button"
                    onClick={() => toggleDay(d.value)}
                    style={{
                      width: 40, height: 40, borderRadius: '50%', border: 'none',
                      cursor: 'pointer', fontSize: 11, fontWeight: 700, transition: 'all 0.15s',
                      background: active ? '#8B5CF6' : '#F3F4F6',
                      color: active ? 'white' : '#6B7280',
                    }}
                  >
                    {d.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label>Horário (horário de Brasília)</label>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <select
                value={form.send_hour}
                onChange={e => setForm(f => ({ ...f, send_hour: Number(e.target.value) }))}
                style={{ width: 90 }}
              >
                {Array.from({ length: 24 }, (_, i) => (
                  <option key={i} value={i}>{String(i).padStart(2, '0')}h</option>
                ))}
              </select>
              <span style={{ color: 'var(--gray-700)', fontWeight: 700 }}>:</span>
              <select
                value={form.send_minute}
                onChange={e => setForm(f => ({ ...f, send_minute: Number(e.target.value) }))}
                style={{ width: 90 }}
              >
                {[0, 15, 30, 45].map(m => (
                  <option key={m} value={m}>{String(m).padStart(2, '0')}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label>Enviar para</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: 'var(--gray-700)', fontWeight: 500 }}>
                <input
                  type="radio"
                  checked={form.student_ids.length === 0}
                  onChange={() => setForm(f => ({ ...f, student_ids: [] }))}
                  style={{ accentColor: '#8B5CF6', width: 'auto', margin: 0 }}
                />
                Todos os alunos
              </label>
              {students.map(s => (
                <label key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: 'var(--gray-700)', fontWeight: 500 }}>
                  <input
                    type="checkbox"
                    checked={form.student_ids.includes(String(s.id))}
                    onChange={e => {
                      const id = String(s.id);
                      setForm(f => ({
                        ...f,
                        student_ids: e.target.checked
                          ? [...f.student_ids, id]
                          : f.student_ids.filter(x => x !== id),
                      }));
                    }}
                    style={{ accentColor: '#8B5CF6', width: 'auto', margin: 0 }}
                  />
                  {s.name}
                </label>
              ))}
            </div>
          </div>

          <button
            onClick={handleSave}
            disabled={saving || !valid}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              padding: '12px 16px', background: '#8B5CF6', color: 'white', border: 'none',
              borderRadius: 8, fontSize: 14, fontWeight: 700,
              cursor: (saving || !valid) ? 'not-allowed' : 'pointer',
              opacity: (saving || !valid) ? 0.6 : 1,
            }}
          >
            {saving ? <Loader size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <BellRing size={16} />}
            {saving ? 'Salvando...' : 'Salvar lembrete'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Notificacoes() {
  const { user } = useAuth();
  const [tab, setTab] = useState('now');
  const [students, setStudents] = useState([]);

  // Enviar agora
  const [notifTitle, setNotifTitle] = useState('');
  const [notifMessage, setNotifMessage] = useState('');
  const [notifStudentIds, setNotifStudentIds] = useState([]);
  const [notifSending, setNotifSending] = useState(false);
  const [notifResult, setNotifResult] = useState(null);

  // Lembretes
  const [schedules, setSchedules] = useState([]);
  const [loadingSchedules, setLoadingSchedules] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState(null);

  useEffect(() => {
    if (!user) return;
    if (hasSupabase) {
      supabase.from('students').select('id, name').eq('personal_id', user.id).eq('status', 'ativo')
        .then(({ data }) => setStudents(data || []));
      supabase.from('scheduled_notifications').select('*').eq('personal_id', user.id)
        .order('created_at', { ascending: false })
        .then(({ data }) => { setSchedules(data || []); setLoadingSchedules(false); });
    } else {
      setStudents([]);
      setSchedules([]);
      setLoadingSchedules(false);
    }
  }, [user?.id]);

  const handleSendNow = async () => {
    if (!notifTitle.trim() || !notifMessage.trim()) return;
    setNotifSending(true);
    setNotifResult(null);

    const targetIds = notifStudentIds.length > 0
      ? notifStudentIds
      : students.map(s => String(s.id));

    if (!targetIds.length) {
      setNotifSending(false);
      setNotifResult({ ok: false, message: 'Nenhum aluno cadastrado ainda' });
      return;
    }

    try {
      if (hasSupabase) {
        const { data, error } = await supabase.functions.invoke('send-push', {
          body: { student_ids: targetIds, title: notifTitle.trim(), message: notifMessage.trim(), personal_id: user.id },
        });
        if (error || !data?.ok) {
          await supabase.from('student_notifications').insert(
            targetIds.map(sid => ({ student_id: sid, personal_id: user.id, title: notifTitle.trim(), message: notifMessage.trim(), type: 'custom' }))
          );
          setNotifResult({ ok: true, message: `Notificação salva para ${targetIds.length} aluno(s) — aparece quando abrirem o app.` });
        } else {
          setNotifResult({ ok: true, message: `Push enviado para ${data.sent ?? targetIds.length} aluno(s)! 🎉` });
        }
      } else {
        setNotifResult({ ok: true, message: `(demo) Push enviado para ${targetIds.length} aluno(s)` });
      }
      setNotifTitle('');
      setNotifMessage('');
      setNotifStudentIds([]);
    } catch (e) {
      setNotifResult({ ok: false, message: e.message });
    }
    setNotifSending(false);
  };

  const handleSaveSchedule = async (form) => {
    if (!hasSupabase) { setModalOpen(false); return; }

    if (form.id) {
      const { data } = await supabase
        .from('scheduled_notifications')
        .update({
          title: form.title, message: form.message,
          days_of_week: form.days_of_week, send_hour: form.send_hour,
          send_minute: form.send_minute, student_ids: form.student_ids,
        })
        .eq('id', form.id).select().maybeSingle();
      if (data) setSchedules(prev => prev.map(s => s.id === data.id ? data : s));
    } else {
      const { data } = await supabase
        .from('scheduled_notifications')
        .insert({ ...form, personal_id: user.id })
        .select().maybeSingle();
      if (data) setSchedules(prev => [data, ...prev]);
    }

    setModalOpen(false);
    setEditingSchedule(null);
  };

  const handleToggle = async (schedule) => {
    if (!hasSupabase) return;
    const newActive = !schedule.is_active;
    await supabase.from('scheduled_notifications').update({ is_active: newActive }).eq('id', schedule.id);
    setSchedules(prev => prev.map(s => s.id === schedule.id ? { ...s, is_active: newActive } : s));
  };

  const handleDelete = async (id) => {
    if (!hasSupabase) return;
    await supabase.from('scheduled_notifications').delete().eq('id', id);
    setSchedules(prev => prev.filter(s => s.id !== id));
  };

  return (
    <div className="page-padding" style={{ flex: 1 }}>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: 'var(--gray-900)' }}>Notificações</h2>
        <p style={{ margin: '4px 0 0', fontSize: 14, color: 'var(--gray-500)' }}>
          Envie push diretamente para o celular dos seus alunos
        </p>
      </div>

      {/* Tabs */}
      <div className="mode-tabs" style={{ display: 'flex', background: 'var(--bg-page)', borderRadius: 10, padding: 4, gap: 4, marginBottom: 24, width: 'fit-content', maxWidth: '100%' }}>
        {[
          { key: 'now', label: 'Enviar agora', icon: BellRing },
          { key: 'scheduled', label: 'Lembretes automáticos', icon: Clock },
        ].map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px',
              borderRadius: 7, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600,
              transition: 'all 0.15s', whiteSpace: 'nowrap',
              background: tab === key ? 'white' : 'transparent',
              color: tab === key ? '#111827' : '#6B7280',
              boxShadow: tab === key ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
            }}
          >
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

      {/* ── ENVIAR AGORA ── */}
      {tab === 'now' && (
        <div style={{ maxWidth: 520 }}>
          <div style={{ background: 'var(--bg-surface)', borderRadius: 12, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label>Título *</label>
              <input
                type="text"
                value={notifTitle}
                onChange={e => setNotifTitle(e.target.value)}
                placeholder="Ex: Treino de hoje disponível! 🏋️"
                maxLength={80}
              />
            </div>
            <div>
              <label>Mensagem *</label>
              <textarea
                value={notifMessage}
                onChange={e => setNotifMessage(e.target.value)}
                placeholder="Ex: Seu treino A está pronto. Bora! 💪"
                rows={3}
                style={{ resize: 'vertical' }}
              />
            </div>

            <div>
              <label>Enviar para</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: 'var(--gray-700)', fontWeight: 500 }}>
                  <input
                    type="radio"
                    checked={notifStudentIds.length === 0}
                    onChange={() => setNotifStudentIds([])}
                    style={{ accentColor: '#8B5CF6', width: 'auto', margin: 0 }}
                  />
                  Todos os alunos ({students.length})
                </label>
                {students.map(s => (
                  <label key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: 'var(--gray-700)', fontWeight: 500 }}>
                    <input
                      type="checkbox"
                      checked={notifStudentIds.includes(String(s.id))}
                      onChange={e => {
                        const id = String(s.id);
                        setNotifStudentIds(prev => e.target.checked ? [...prev, id] : prev.filter(x => x !== id));
                      }}
                      style={{ accentColor: '#8B5CF6', width: 'auto', margin: 0 }}
                    />
                    {s.name}
                  </label>
                ))}
              </div>
            </div>

            {notifResult && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: notifResult.ok ? '#D1FAE5' : '#FEE2E2', borderRadius: 8, padding: '10px 14px' }}>
                {notifResult.ok ? <CheckCheck size={16} color="#059669" /> : <Bell size={16} color="#DC2626" />}
                <span style={{ fontSize: 13, color: notifResult.ok ? '#065F46' : '#991B1B', fontWeight: 500 }}>
                  {notifResult.message}
                </span>
              </div>
            )}

            <button
              onClick={handleSendNow}
              disabled={notifSending || !notifTitle.trim() || !notifMessage.trim()}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                padding: '12px 16px', background: '#8B5CF6', color: 'white', border: 'none',
                borderRadius: 8, fontSize: 14, fontWeight: 700,
                cursor: (notifSending || !notifTitle.trim() || !notifMessage.trim()) ? 'not-allowed' : 'pointer',
                opacity: (notifSending || !notifTitle.trim() || !notifMessage.trim()) ? 0.6 : 1,
              }}
            >
              {notifSending ? <Loader size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <BellRing size={16} />}
              {notifSending ? 'Enviando...' : 'Enviar push agora'}
            </button>
          </div>
        </div>
      )}

      {/* ── LEMBRETES AUTOMÁTICOS ── */}
      {tab === 'scheduled' && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, gap: 12 }}>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--gray-500)', flex: 1 }}>
              Push automático nos dias e horários configurados — chega no celular mesmo com app fechado.
            </p>
            <button
              onClick={() => { setEditingSchedule(null); setModalOpen(true); }}
              style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px',
                background: '#8B5CF6', color: 'white', border: 'none', borderRadius: 8,
                fontSize: 13, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
              }}
            >
              <Plus size={15} /> Novo lembrete
            </button>
          </div>

          {loadingSchedules ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
              <Loader size={24} color="#8B5CF6" style={{ animation: 'spin 1s linear infinite' }} />
            </div>
          ) : schedules.length === 0 ? (
            <div style={{ background: 'var(--bg-surface)', borderRadius: 12, padding: '56px 24px', textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
              <Bell size={44} color="#E5E7EB" style={{ marginBottom: 14 }} />
              <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--gray-700)' }}>Nenhum lembrete configurado</p>
              <p style={{ margin: '6px 0 20px', fontSize: 13, color: 'var(--gray-400)' }}>Crie lembretes automáticos para manter seus alunos motivados</p>
              <button
                onClick={() => { setEditingSchedule(null); setModalOpen(true); }}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 22px', background: '#8B5CF6', color: 'white', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
              >
                <Plus size={15} /> Criar primeiro lembrete
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {schedules.map(s => (
                <div
                  key={s.id}
                  style={{
                    background: 'var(--bg-surface)', borderRadius: 12, padding: '16px 18px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                    display: 'flex', alignItems: 'center', gap: 14,
                    opacity: s.is_active ? 1 : 0.55,
                    borderLeft: `3px solid ${s.is_active ? '#8B5CF6' : '#E5E7EB'}`,
                    transition: 'opacity 0.2s',
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3, flexWrap: 'wrap' }}>
                      <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--gray-900)' }}>{s.title}</p>
                      {!s.is_active && (
                        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--gray-400)', background: 'var(--bg-page)', padding: '2px 8px', borderRadius: 10 }}>
                          Pausado
                        </span>
                      )}
                    </div>
                    <p style={{ margin: '0 0 8px', fontSize: 12, color: 'var(--gray-500)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.message}</p>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 11, fontWeight: 600, background: '#F5F3FF', color: '#7C3AED', padding: '3px 9px', borderRadius: 10 }}>
                        {formatDays(s.days_of_week)}
                      </span>
                      <span style={{ fontSize: 11, fontWeight: 600, background: '#EFF6FF', color: '#2563EB', padding: '3px 9px', borderRadius: 10 }}>
                        {String(s.send_hour).padStart(2, '0')}:{String(s.send_minute).padStart(2, '0')} BRT
                      </span>
                      {s.student_ids?.length > 0 && (
                        <span style={{ fontSize: 11, fontWeight: 600, background: '#F0FDF4', color: '#15803D', padding: '3px 9px', borderRadius: 10 }}>
                          {s.student_ids.length} aluno(s)
                        </span>
                      )}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    <button
                      onClick={() => handleToggle(s)}
                      title={s.is_active ? 'Pausar' : 'Ativar'}
                      style={{ width: 34, height: 34, borderRadius: 8, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', background: s.is_active ? '#D1FAE5' : '#F3F4F6', color: s.is_active ? '#10B981' : '#9CA3AF' }}
                    >
                      {s.is_active ? <ToggleRight size={17} /> : <ToggleLeft size={17} />}
                    </button>
                    <button
                      onClick={() => { setEditingSchedule(s); setModalOpen(true); }}
                      title="Editar"
                      style={{ width: 34, height: 34, borderRadius: 8, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#EFF6FF', color: '#3B82F6' }}
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      onClick={() => handleDelete(s.id)}
                      title="Excluir"
                      style={{ width: 34, height: 34, borderRadius: 8, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#FEF2F2', color: '#EF4444' }}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div style={{ marginTop: 20, padding: '16px 18px', background: '#F5F3FF', borderRadius: 12, border: '1px solid #DDD6FE' }}>
            <p style={{ margin: '0 0 4px', fontSize: 13, fontWeight: 700, color: '#5B21B6' }}>⚙️ Como funciona o envio automático</p>
            <p style={{ margin: 0, fontSize: 12, color: '#7C3AED', lineHeight: 1.6 }}>
              Um robô (GitHub Actions) roda a cada 30 minutos e dispara os lembretes agendados via Edge Function no Supabase.
              A notificação chega no celular mesmo com o app fechado.<br />
              Para ativar: adicione o secret <strong>SUPABASE_SERVICE_KEY</strong> no repositório GitHub e faça o deploy da função <code>process-scheduled</code>.
            </p>
          </div>
        </div>
      )}

      {modalOpen && (
        <ScheduleModal
          schedule={editingSchedule}
          students={students}
          onSave={handleSaveSchedule}
          onClose={() => { setModalOpen(false); setEditingSchedule(null); }}
        />
      )}

      <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

