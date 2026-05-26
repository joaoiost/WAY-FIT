import { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, Plus, Check, X, MessageCircle, RefreshCw, Zap } from 'lucide-react';
import Modal from '../../components/UI/Modal';
import { appointments as mockAppts, students as mockStudents } from '../../data/mockData';
import { useAuth } from '../../context/AuthContext';
import { supabase, hasSupabase } from '../../lib/supabase';

const DAYS_PT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const TYPES = ['Musculação', 'Funcional', 'Hipertrofia', 'Cardio', 'Yoga', 'Pilates', 'Força'];
const TYPE_COLORS = {
  Musculação: '#3B82F6', Funcional: '#10B981', Hipertrofia: '#8B5CF6',
  Cardio: '#F59E0B', Yoga: '#EC4899', Pilates: '#06B6D4', Força: '#EF4444',
};
const GROUP_TO_TYPE = {
  Peito: 'Musculação', Costas: 'Musculação', Pernas: 'Musculação',
  Ombro: 'Musculação', Braços: 'Musculação', Abdômen: 'Funcional',
  'Full Body': 'Funcional', Cardio: 'Cardio', Descanso: 'Musculação',
};

const TODAY = new Date().toISOString().slice(0, 10);

function formatDate(d) { return d.toISOString().slice(0, 10); }

function getWeekDates(baseDate) {
  const d = new Date(baseDate);
  const diff = d.getDate() - d.getDay();
  return Array.from({ length: 7 }, (_, i) => {
    const date = new Date(d);
    date.setDate(diff + i);
    return date;
  });
}

function ApptCard({ appt, onClick, isSelected }) {
  return (
    <div
      onClick={() => onClick(appt)}
      style={{
        background: isSelected ? appt.color : `${appt.color}18`,
        border: `1px solid ${appt.color}50`,
        borderLeft: `3px solid ${appt.color}`,
        borderRadius: 6, padding: '6px 8px', cursor: 'pointer',
        transition: 'all 0.15s',
        boxShadow: isSelected ? `0 2px 8px ${appt.color}40` : 'none',
      }}
    >
      <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: isSelected ? 'white' : '#374151' }}>{appt.time}</p>
      <p style={{ margin: '1px 0 0', fontSize: 11, color: isSelected ? 'rgba(255,255,255,0.85)' : '#6B7280', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {(appt.student_name || appt.studentName || '').split(' ')[0]}
      </p>
      {appt.status === 'done' && <span style={{ fontSize: 9, color: isSelected ? 'white' : '#10B981', fontWeight: 700 }}>✓ FEITA</span>}
      {appt.status === 'cancelled' && <span style={{ fontSize: 9, color: isSelected ? 'rgba(255,255,255,0.7)' : '#EF4444', fontWeight: 700 }}>✗ CANCEL.</span>}
    </div>
  );
}

export default function Agenda() {
  const { user } = useAuth();
  const [baseDate, setBaseDate] = useState(new Date());
  const [appts, setAppts] = useState([]);
  const [students, setStudents] = useState([]);
  const [trainingPlans, setTrainingPlans] = useState([]);
  const [modal, setModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [selectedAppt, setSelectedAppt] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [filterStudentId, setFilterStudentId] = useState('');
  const [form, setForm] = useState({
    studentId: '', date: TODAY, time: '08:00', type: 'Musculação', notes: '',
    repeat: false, repeatWeeks: '4',
  });
  const [autoGroup, setAutoGroup] = useState('');
  const actionRef = useRef(null);

  useEffect(() => {
    if (!user) return;
    if (hasSupabase) {
      supabase.from('appointments').select('*').eq('personal_id', user.id)
        .then(({ data }) => setAppts(data || []));
      supabase.from('students').select('id, name, phone').eq('personal_id', user.id)
        .then(({ data }) => setStudents(data || []));
      supabase.from('training_plans').select('name, type, days, student_id').eq('personal_id', user.id)
        .then(({ data }) => setTrainingPlans(data || []));
    } else {
      setAppts(mockAppts);
      setStudents(mockStudents);
    }
  }, [user?.id]);

  // Auto-suggest type from training plan
  useEffect(() => {
    if (!form.studentId || !form.date) { setAutoGroup(''); return; }
    const dayOfWeek = new Date(form.date + 'T12:00:00').getDay();
    const plan = trainingPlans.find(p =>
      String(p.student_id) === String(form.studentId) && (p.days || []).includes(dayOfWeek)
    );
    if (plan) {
      setAutoGroup(plan.name);
      setForm(f => ({ ...f, type: GROUP_TO_TYPE[plan.name] || 'Musculação' }));
    } else {
      setAutoGroup('');
    }
  }, [form.studentId, form.date, trainingPlans]);

  // Close action panel on outside click
  useEffect(() => {
    const handler = (e) => { if (actionRef.current && !actionRef.current.contains(e.target)) setSelectedAppt(null); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const weekDates = getWeekDates(baseDate);
  const prevWeek = () => { const d = new Date(baseDate); d.setDate(d.getDate() - 7); setBaseDate(d); };
  const nextWeek = () => { const d = new Date(baseDate); d.setDate(d.getDate() + 7); setBaseDate(d); };
  const goToday = () => setBaseDate(new Date());

  const openModalForDay = (date) => {
    setEditingId(null);
    setForm({ studentId: '', date: formatDate(date), time: '08:00', type: 'Musculação', notes: '', repeat: false, repeatWeeks: '4' });
    setSelectedAppt(null);
    setModal(true);
  };

  const handleEditAppt = (appt) => {
    setEditingId(appt.id);
    setForm({
      studentId: String(appt.student_id),
      date: appt.date,
      time: appt.time,
      type: appt.type,
      notes: appt.notes || '',
      repeat: false,
      repeatWeeks: '4',
    });
    setSelectedAppt(null);
    setModal(true);
  };

  const handleDeleteAppt = async (appt) => {
    setActionLoading(true);
    if (hasSupabase) {
      await supabase.from('appointments').delete().eq('id', appt.id);
    }
    setAppts(prev => prev.filter(a => a.id !== appt.id));
    setActionLoading(false);
    setSelectedAppt(null);
  };

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    const student = students.find(s => String(s.id) === String(form.studentId));
    if (!student) return;

    // Modo edição
    if (editingId) {
      const updates = {
        student_id: student.id, student_name: student.name,
        time: form.time, type: form.type, date: form.date, notes: form.notes,
        color: TYPE_COLORS[form.type] || '#3B82F6',
      };
      if (hasSupabase) {
        await supabase.from('appointments').update(updates).eq('id', editingId);
      }
      setAppts(prev => prev.map(a => a.id === editingId ? { ...a, ...updates } : a));
      setEditingId(null);
      setModal(false);
      setForm({ studentId: '', date: TODAY, time: '08:00', type: 'Musculação', notes: '', repeat: false, repeatWeeks: '4' });
      setAutoGroup('');
      return;
    }

    const weeks = form.repeat ? parseInt(form.repeatWeeks) || 1 : 1;
    const dates = Array.from({ length: weeks }, (_, i) => {
      const d = new Date(form.date + 'T12:00:00');
      d.setDate(d.getDate() + i * 7);
      return d.toISOString().slice(0, 10);
    });

    const newAppts = dates.map(date => ({
      personal_id: user.id, student_id: student.id, student_name: student.name,
      time: form.time, type: form.type, date, status: 'pending',
      color: TYPE_COLORS[form.type] || '#3B82F6', notes: form.notes,
    }));

    if (hasSupabase) {
      const { data } = await supabase.from('appointments').insert(newAppts).select();
      if (data) setAppts(prev => [...prev, ...data]);
    } else {
      setAppts(prev => [...prev, ...newAppts.map((a, i) => ({ ...a, id: Date.now() + i }))]);
    }
    setModal(false);
    setForm({ studentId: '', date: TODAY, time: '08:00', type: 'Musculação', notes: '', repeat: false, repeatWeeks: '4' });
    setAutoGroup('');
  };

  const handleMarkDone = async (appt) => {
    setActionLoading(true);
    if (hasSupabase) {
      await supabase.from('appointments').update({ status: 'done' }).eq('id', appt.id);
      await supabase.from('attendances').upsert({
        personal_id: user.id, student_id: appt.student_id,
        appointment_id: appt.id, date: appt.date, status: 'present',
      }, { onConflict: 'student_id,date' });
    }
    setAppts(prev => prev.map(a => a.id === appt.id ? { ...a, status: 'done' } : a));
    setActionLoading(false);
    setSelectedAppt(null);
  };

  const handleCancel = async (appt) => {
    setActionLoading(true);
    if (hasSupabase) {
      await supabase.from('appointments').update({ status: 'cancelled' }).eq('id', appt.id);
    }
    setAppts(prev => prev.map(a => a.id === appt.id ? { ...a, status: 'cancelled' } : a));
    setActionLoading(false);
    setSelectedAppt(null);
  };

  const handleWhatsApp = (appt) => {
    const student = students.find(s => String(s.id) === String(appt.student_id));
    if (!student?.phone) return;
    const phone = student.phone.replace(/\D/g, '');
    const full = phone.startsWith('55') ? phone : `55${phone}`;
    const msg = `Olá ${student.name.split(' ')[0]}! Confirmando sua aula de ${appt.type} amanhã às ${appt.time}. Confirma sua presença? 💪`;
    window.open(`https://wa.me/${full}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const getApptsForDay = (date) =>
    appts
      .filter(a => a.date === formatDate(date) && (!filterStudentId || String(a.student_id) === filterStudentId))
      .sort((a, b) => a.time.localeCompare(b.time));

  const selectedStudent = students.find(s => String(s.id) === String(selectedAppt?.student_id));
  const hasPhone = !!selectedStudent?.phone;

  return (
    <div className="page-padding" style={{ flex: 1 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#111827' }}>Agenda</h2>
          <p style={{ margin: '4px 0 0', fontSize: 14, color: '#6B7280' }}>
            {weekDates[0].toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <button onClick={goToday} style={{ padding: '8px 14px', background: 'white', border: '1px solid #E5E7EB', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#374151' }}>
            Hoje
          </button>
          <div style={{ display: 'flex', gap: 2 }}>
            <button onClick={prevWeek} style={{ padding: '8px 10px', background: 'white', border: '1px solid #E5E7EB', borderRadius: '8px 0 0 8px', cursor: 'pointer', display: 'flex' }}>
              <ChevronLeft size={16} color="#374151" />
            </button>
            <button onClick={nextWeek} style={{ padding: '8px 10px', background: 'white', border: '1px solid #E5E7EB', borderRadius: '0 8px 8px 0', cursor: 'pointer', display: 'flex' }}>
              <ChevronRight size={16} color="#374151" />
            </button>
          </div>
          <button className="btn-primary" onClick={() => { setEditingId(null); setSelectedAppt(null); setForm({ studentId: '', date: TODAY, time: '08:00', type: 'Musculação', notes: '', repeat: false, repeatWeeks: '4' }); setModal(true); }}>
            <Plus size={16} /> Nova Aula
          </button>
        </div>
      </div>

      {/* Filtro por aluno */}
      {students.length > 1 && (
        <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#9CA3AF', marginRight: 2 }}>Filtrar:</span>
          <button onClick={() => setFilterStudentId('')} style={{ padding: '5px 12px', borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600, background: !filterStudentId ? '#111827' : '#F3F4F6', color: !filterStudentId ? 'white' : '#6B7280', transition: 'all 0.12s' }}>
            Todos
          </button>
          {students.map(s => (
            <button key={s.id} onClick={() => setFilterStudentId(String(s.id))} style={{ padding: '5px 12px', borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600, transition: 'all 0.12s', background: filterStudentId === String(s.id) ? '#3B82F6' : '#F3F4F6', color: filterStudentId === String(s.id) ? 'white' : '#6B7280' }}>
              {s.name.split(' ')[0]}
            </button>
          ))}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: selectedAppt ? '1fr 300px' : '1fr', gap: 16, alignItems: 'start' }}>
        {/* Calendar */}
        <div style={{ background: 'white', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
          {/* Day headers */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: '2px solid #F3F4F6' }}>
            {weekDates.map((date, i) => {
              const isToday = formatDate(date) === TODAY;
              return (
                <button
                  key={i}
                  onClick={() => openModalForDay(date)}
                  style={{
                    padding: '14px 8px 12px', textAlign: 'center', cursor: 'pointer', border: 'none',
                    borderBottom: `3px solid ${isToday ? '#3B82F6' : 'transparent'}`,
                    background: isToday ? '#EFF6FF' : '#F9FAFB',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => { if (!isToday) e.currentTarget.style.background = '#F3F4F6'; }}
                  onMouseLeave={e => { if (!isToday) e.currentTarget.style.background = '#F9FAFB'; }}
                  title={`Agendar aula em ${date.toLocaleDateString('pt-BR')}`}
                >
                  <p style={{ margin: 0, fontSize: 10, fontWeight: 700, color: isToday ? '#3B82F6' : '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    {DAYS_PT[date.getDay()]}
                  </p>
                  <p style={{ margin: '4px 0 0', fontSize: 22, fontWeight: 800, color: isToday ? '#3B82F6' : '#111827' }}>
                    {date.getDate()}
                  </p>
                  <Plus size={12} color={isToday ? '#3B82F6' : '#D1D5DB'} style={{ marginTop: 2 }} />
                </button>
              );
            })}
          </div>

          {/* Day columns */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
            {weekDates.map((date, i) => {
              const dayAppts = getApptsForDay(date);
              const isToday = formatDate(date) === TODAY;
              return (
                <div key={i} style={{
                  minHeight: 320, padding: '10px 6px',
                  borderRight: i < 6 ? '1px solid #F3F4F6' : 'none',
                  background: isToday ? 'rgba(239,246,255,0.35)' : 'white',
                  display: 'flex', flexDirection: 'column', gap: 5,
                }}>
                  {dayAppts.length === 0 ? (
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ fontSize: 11, color: '#E5E7EB' }}>—</span>
                    </div>
                  ) : (
                    dayAppts.map(appt => (
                      <ApptCard
                        key={appt.id}
                        appt={appt}
                        onClick={setSelectedAppt}
                        isSelected={selectedAppt?.id === appt.id}
                      />
                    ))
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Quick action panel */}
        {selectedAppt && (
          <div ref={actionRef} style={{ background: 'white', borderRadius: 12, boxShadow: '0 4px 20px rgba(0,0,0,0.12)', overflow: 'hidden', position: 'sticky', top: 20 }}>
            <div style={{ padding: '14px 16px', background: selectedAppt.color, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <p style={{ margin: 0, fontSize: 11, color: 'rgba(255,255,255,0.8)', fontWeight: 600 }}>
                  {new Date(selectedAppt.date + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'short' })} · {selectedAppt.time}
                </p>
                <p style={{ margin: '4px 0 0', fontSize: 16, fontWeight: 800, color: 'white' }}>
                  {selectedAppt.student_name || selectedAppt.studentName}
                </p>
                <p style={{ margin: '2px 0 0', fontSize: 13, color: 'rgba(255,255,255,0.8)' }}>{selectedAppt.type}</p>
              </div>
              <button onClick={() => setSelectedAppt(null)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.8)', cursor: 'pointer', display: 'flex', padding: 2 }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {selectedAppt.status !== 'done' && selectedAppt.status !== 'cancelled' && (
                <button
                  onClick={() => handleMarkDone(selectedAppt)}
                  disabled={actionLoading}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', background: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: 10, cursor: 'pointer', width: '100%', textAlign: 'left', opacity: actionLoading ? 0.7 : 1 }}
                >
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#10B981', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Check size={16} color="white" />
                  </div>
                  <div>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#065F46' }}>Confirmar presença</p>
                    <p style={{ margin: 0, fontSize: 11, color: '#6B7280' }}>Registra frequência automaticamente</p>
                  </div>
                </button>
              )}

              {selectedAppt.status === 'done' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 10 }}>
                  <Check size={18} color="#10B981" />
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#15803D' }}>Aula realizada · presença registrada</span>
                </div>
              )}

              {selectedAppt.status === 'cancelled' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10 }}>
                  <X size={18} color="#EF4444" />
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#DC2626' }}>Aula cancelada</span>
                </div>
              )}

              {hasPhone && (
                <button
                  onClick={() => handleWhatsApp(selectedAppt)}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 10, cursor: 'pointer', width: '100%', textAlign: 'left' }}
                >
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#25D366', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <MessageCircle size={16} color="white" />
                  </div>
                  <div>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#065F46' }}>Enviar WhatsApp</p>
                    <p style={{ margin: 0, fontSize: 11, color: '#6B7280' }}>Lembrete de confirmação</p>
                  </div>
                </button>
              )}

              {selectedAppt.status !== 'cancelled' && selectedAppt.status !== 'done' && (
                <>
                  <button
                    onClick={() => handleEditAppt(selectedAppt)}
                    style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 10, cursor: 'pointer', width: '100%', textAlign: 'left' }}
                  >
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#DBEAFE', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#3B82F6" strokeWidth="2.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    </div>
                    <div>
                      <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#1E40AF' }}>Editar aula</p>
                      <p style={{ margin: 0, fontSize: 11, color: '#6B7280' }}>Alterar horário, tipo ou data</p>
                    </div>
                  </button>
                  <button
                    onClick={() => handleCancel(selectedAppt)}
                    disabled={actionLoading}
                    style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10, cursor: 'pointer', width: '100%', textAlign: 'left', opacity: actionLoading ? 0.7 : 1 }}
                  >
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#FEE2E2', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <X size={16} color="#EF4444" />
                    </div>
                    <div>
                      <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#991B1B' }}>Cancelar aula</p>
                      <p style={{ margin: 0, fontSize: 11, color: '#6B7280' }}>Marca como cancelada</p>
                    </div>
                  </button>
                </>
              )}

              <button
                onClick={() => handleDeleteAppt(selectedAppt)}
                disabled={actionLoading}
                style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', background: 'none', border: '1px solid #F3F4F6', borderRadius: 10, cursor: 'pointer', width: '100%', textAlign: 'left', opacity: actionLoading ? 0.7 : 1 }}
              >
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/></svg>
                </div>
                <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: '#9CA3AF' }}>Excluir da agenda</p>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Create appointment modal */}
      <Modal isOpen={modal} onClose={() => { setModal(false); setEditingId(null); setAutoGroup(''); }} title={editingId ? 'Editar Aula' : 'Nova Aula'}>
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label>Aluno *</label>
              <select name="studentId" value={form.studentId} onChange={handleChange} required>
                <option value="">Selecione o aluno...</option>
                {students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label>Data *</label>
                <input name="date" type="date" value={form.date} onChange={handleChange} required />
              </div>
              <div>
                <label>Horário *</label>
                <input name="time" type="time" value={form.time} onChange={handleChange} required />
              </div>
            </div>
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                Tipo de treino *
                {autoGroup && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600, color: '#3B82F6', background: '#EFF6FF', padding: '2px 8px', borderRadius: 20 }}>
                    <Zap size={10} /> Auto: {autoGroup}
                  </span>
                )}
              </label>
              <select name="type" value={form.type} onChange={handleChange} required>
                {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>

            {/* Repeat toggle — só na criação */}
            {!editingId && <div style={{ background: '#F9FAFB', borderRadius: 10, padding: 14 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', marginBottom: form.repeat ? 10 : 0 }}>
                <input
                  type="checkbox"
                  checked={form.repeat}
                  onChange={e => setForm(f => ({ ...f, repeat: e.target.checked }))}
                  style={{ width: 16, height: 16, accentColor: '#3B82F6', cursor: 'pointer' }}
                />
                <div>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#374151', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <RefreshCw size={13} color="#3B82F6" /> Repetir semanalmente
                  </span>
                  <p style={{ margin: '1px 0 0', fontSize: 11, color: '#9CA3AF' }}>Cria a mesma aula nas próximas semanas</p>
                </div>
              </label>
              {form.repeat && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <label style={{ fontSize: 13, color: '#374151', fontWeight: 500, whiteSpace: 'nowrap', marginBottom: 0 }}>Repetir por</label>
                  <select name="repeatWeeks" value={form.repeatWeeks} onChange={handleChange} style={{ flex: 1 }}>
                    {[2, 4, 8, 12, 16, 24].map(w => <option key={w} value={w}>{w} semanas</option>)}
                  </select>
                  <span style={{ fontSize: 12, color: '#6B7280', whiteSpace: 'nowrap' }}>
                    = {parseInt(form.repeatWeeks)} aulas
                  </span>
                </div>
              )}
            </div>}

            <div>
              <label>Observações</label>
              <textarea name="notes" value={form.notes} onChange={handleChange} placeholder="Notas sobre a aula..." rows={2} style={{ resize: 'vertical' }} />
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20, paddingTop: 16, borderTop: '1px solid #F3F4F6' }}>
            <button type="button" className="btn-secondary" onClick={() => { setModal(false); setEditingId(null); setAutoGroup(''); }}>Cancelar</button>
            <button type="submit" className="btn-primary">
              {editingId ? 'Salvar alterações' : form.repeat ? `Criar ${form.repeatWeeks} aulas` : 'Agendar Aula'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
