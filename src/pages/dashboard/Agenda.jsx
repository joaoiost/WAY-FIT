import { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, Plus, Check, X, MessageCircle, RefreshCw, Zap, Calendar } from 'lucide-react';
import Modal from '../../components/UI/Modal';
// mockData removed
import { useAuth } from '../../context/AuthContext';
import { supabase, hasSupabase } from '../../lib/supabase';

const DAYS_PT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const TYPES = ['Musculação', 'Funcional', 'Hipertrofia', 'Cardio', 'Yoga', 'Pilates', 'Força', 'Consulta Nutricional'];
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
      <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: isSelected ? 'white' : '#374151' }}>{(appt.time || '').slice(0, 5)}</p>
      <p style={{ margin: '1px 0 0', fontSize: 11, color: isSelected ? 'rgba(255,255,255,0.85)' : '#6B7280', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {(appt.student_name || appt.studentName || '').split(' ')[0]}
      </p>
      {appt.status === 'done' && <span style={{ fontSize: 9, color: isSelected ? 'white' : '#10B981', fontWeight: 700 }}>✓ FEITA</span>}
      {appt.status === 'cancelled' && <span style={{ fontSize: 9, color: isSelected ? 'rgba(255,255,255,0.7)' : '#EF4444', fontWeight: 700 }}>✗ CANCEL.</span>}
      {appt.status === 'pending_student' && <span style={{ fontSize: 9, color: isSelected ? 'white' : '#3B82F6', fontWeight: 700 }}>★ SOLICITADO</span>}
    </div>
  );
}

function MobileApptCard({ appt, onClick, isSelected }) {
  const statusLabel = appt.status === 'done' ? '✓ Realizada' : appt.status === 'cancelled' ? '✗ Cancelada' : appt.status === 'pending_student' ? '★ Solicitado' : '● Pendente';
  const statusColor = appt.status === 'done' ? '#10B981' : appt.status === 'cancelled' ? '#EF4444' : appt.status === 'pending_student' ? '#3B82F6' : '#F59E0B';
  const statusBg = appt.status === 'done' ? '#ECFDF5' : appt.status === 'cancelled' ? '#FEF2F2' : appt.status === 'pending_student' ? '#EFF6FF' : '#FFFBEB';

  return (
    <div
      onClick={() => onClick(appt)}
      style={{
        background: 'var(--bg-surface)', borderRadius: 14, padding: '14px 16px',
        border: isSelected ? `1.5px solid ${appt.color}` : '1.5px solid #F3F4F6',
        borderLeft: `4px solid ${appt.color}`,
        boxShadow: isSelected ? `0 4px 16px ${appt.color}25` : '0 1px 4px rgba(0,0,0,0.05)',
        cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 14,
        transition: 'all 0.15s',
      }}
    >
      <div style={{ textAlign: 'center', minWidth: 46 }}>
        <p style={{ margin: 0, fontSize: 17, fontWeight: 800, color: appt.color, lineHeight: 1 }}>
          {(appt.time || '').slice(0, 5)}
        </p>
      </div>
      <div style={{ width: 1, height: 36, background: '#F1F5F9', flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--gray-900)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {appt.student_name || appt.studentName}
        </p>
        <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--gray-500)' }}>{appt.type}</p>
      </div>
      <span style={{ fontSize: 11, fontWeight: 700, color: statusColor, background: statusBg, padding: '4px 10px', borderRadius: 20, flexShrink: 0 }}>
        {statusLabel}
      </span>
    </div>
  );
}

export default function Agenda() {
  const { user } = useAuth();
  const [baseDate, setBaseDate] = useState(new Date());
  const [mobileDay, setMobileDay] = useState(new Date());
  const [appts, setAppts] = useState([]);
  const [students, setStudents] = useState([]);
  const [trainingPlans, setTrainingPlans] = useState([]);
  const [modal, setModal] = useState(false);
  const [scheduleMode, setScheduleMode] = useState('single');
  const [editingId, setEditingId] = useState(null);
  const [selectedAppt, setSelectedAppt] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [filterStudentId, setFilterStudentId] = useState('');
  const [form, setForm] = useState({
    studentId: '', date: TODAY, time: '08:00', type: 'Musculação', notes: '',
    repeat: false, repeatWeeks: '4', daysOfWeek: [],
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
      setAppts([]);
      setStudents([]);
    }
  }, [user?.id]);

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

  useEffect(() => {
    const handler = (e) => { if (actionRef.current && !actionRef.current.contains(e.target)) setSelectedAppt(null); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const weekDates = getWeekDates(baseDate);

  const prevWeek = () => {
    const d = new Date(baseDate);
    d.setDate(d.getDate() - 7);
    setBaseDate(d);
    const nd = new Date(mobileDay);
    nd.setDate(nd.getDate() - 7);
    setMobileDay(nd);
  };
  const nextWeek = () => {
    const d = new Date(baseDate);
    d.setDate(d.getDate() + 7);
    setBaseDate(d);
    const nd = new Date(mobileDay);
    nd.setDate(nd.getDate() + 7);
    setMobileDay(nd);
  };
  const goToday = () => {
    setBaseDate(new Date());
    setMobileDay(new Date());
  };

  const openModalForDay = (date) => {
    resetForm();
    setScheduleMode('single');
    setForm(f => ({ ...f, date: formatDate(date) }));
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

  const resetForm = () => {
    setForm({ studentId: '', date: TODAY, time: '08:00', type: 'Musculação', notes: '', repeat: false, repeatWeeks: '4', daysOfWeek: [] });
    setAutoGroup('');
    setEditingId(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const student = students.find(s => String(s.id) === String(form.studentId));
    if (!student) return;

    if (editingId) {
      const updates = {
        student_id: student.id, student_name: student.name,
        time: form.time, type: form.type, date: form.date, notes: form.notes,
        color: TYPE_COLORS[form.type] || '#3B82F6',
      };
      if (hasSupabase) await supabase.from('appointments').update(updates).eq('id', editingId);
      setAppts(prev => prev.map(a => a.id === editingId ? { ...a, ...updates } : a));
      setModal(false);
      resetForm();
      return;
    }

    let newAppts = [];

    if (scheduleMode === 'weekly' && form.daysOfWeek.length > 0) {
      // Generate appointments for each selected day over N weeks
      const weeks = parseInt(form.repeatWeeks) || 4;
      const start = new Date(form.date + 'T12:00:00');
      for (let i = 0; i < weeks * 7; i++) {
        const d = new Date(start);
        d.setDate(d.getDate() + i);
        if (form.daysOfWeek.includes(d.getDay())) {
          newAppts.push({
            personal_id: user.id, student_id: student.id, student_name: student.name,
            date: d.toISOString().slice(0, 10), time: form.time, type: form.type,
            status: 'pending', color: TYPE_COLORS[form.type] || '#3B82F6', notes: form.notes,
          });
        }
      }
    } else {
      const weeks = form.repeat ? parseInt(form.repeatWeeks) || 1 : 1;
      newAppts = Array.from({ length: weeks }, (_, i) => {
        const d = new Date(form.date + 'T12:00:00');
        d.setDate(d.getDate() + i * 7);
        return {
          personal_id: user.id, student_id: student.id, student_name: student.name,
          date: d.toISOString().slice(0, 10), time: form.time, type: form.type,
          status: 'pending', color: TYPE_COLORS[form.type] || '#3B82F6', notes: form.notes,
        };
      });
    }

    if (hasSupabase) {
      const { data } = await supabase.from('appointments').insert(newAppts).select();
      if (data) setAppts(prev => [...prev, ...data]);
    } else {
      setAppts(prev => [...prev, ...newAppts.map((a, i) => ({ ...a, id: Date.now() + i }))]);
    }
    setModal(false);
    resetForm();
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

  const mobileDayLabel = mobileDay.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
  const mobileDayAppts = getApptsForDay(mobileDay);

  return (
    <div className="page-padding" style={{ flex: 1 }}>
      {/* Header */}
      <div className="page-header" style={{ marginBottom: 12 }}>
        <div>
          <h2 className="page-title">Agenda</h2>
          <p className="page-subtitle">
            {weekDates[0].toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
          </p>
        </div>
        <div className="page-actions">
          <button onClick={goToday} className="btn-secondary">Hoje</button>
          <div style={{ display: 'flex', gap: 2 }}>
            <button onClick={prevWeek} className="btn-secondary" style={{ borderRadius: 'var(--radius-sm) 0 0 var(--radius-sm)', padding: '8px 10px' }}>
              <ChevronLeft size={16} />
            </button>
            <button onClick={nextWeek} className="btn-secondary" style={{ borderRadius: '0 var(--radius-sm) var(--radius-sm) 0', padding: '8px 10px' }}>
              <ChevronRight size={16} />
            </button>
          </div>
          <button className="btn-primary agenda-new-btn" onClick={() => { setEditingId(null); setSelectedAppt(null); setForm({ studentId: '', date: TODAY, time: '08:00', type: 'Musculação', notes: '', repeat: false, repeatWeeks: '4' }); setModal(true); }}>
            <Plus size={16} /> Nova Aula
          </button>
        </div>
      </div>

      {/* Student filter */}
      {students.length > 1 && (
        <div className="filter-pills" style={{ marginBottom: 16 }}>
          <span className="section-label" style={{ marginRight: 2, alignSelf: 'center' }}>Filtrar:</span>
          <button onClick={() => setFilterStudentId('')} className={`pill${!filterStudentId ? ' active' : ''}`}>Todos</button>
          {students.map(s => (
            <button key={s.id} onClick={() => setFilterStudentId(String(s.id))}
              className={`pill${filterStudentId === String(s.id) ? ' active' : ''}`}>
              {s.name.split(' ')[0]}
            </button>
          ))}
        </div>
      )}

      {/* ── DESKTOP: 7-column weekly grid ── */}
      <div className="agenda-desktop-view">
        <div className="agenda-outer-grid" style={{ display: 'grid', gridTemplateColumns: selectedAppt ? '1fr 300px' : '1fr', gap: 16, alignItems: 'start' }}>
          <div style={{ background: 'var(--bg-surface)', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: '2px solid #F3F4F6', minWidth: 560 }}>
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
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', minWidth: 560 }}>
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
                          <ApptCard key={appt.id} appt={appt} onClick={setSelectedAppt} isSelected={selectedAppt?.id === appt.id} />
                        ))
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {selectedAppt && (
            <div ref={actionRef} className="agenda-action-panel" style={{ background: 'var(--bg-surface)', borderRadius: 12, boxShadow: '0 4px 20px rgba(0,0,0,0.12)', overflow: 'hidden', position: 'sticky', top: 20 }}>
              <ActionPanelContent
                appt={selectedAppt}
                hasPhone={hasPhone}
                actionLoading={actionLoading}
                onClose={() => setSelectedAppt(null)}
                onMarkDone={handleMarkDone}
                onWhatsApp={handleWhatsApp}
                onEdit={handleEditAppt}
                onCancel={handleCancel}
                onDelete={handleDeleteAppt}
              />
            </div>
          )}
        </div>
      </div>

      {/* ── MOBILE: day picker + appointment list ── */}
      <div className="agenda-mobile-view">
        {/* Day pill row */}
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 12, WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none' }}>
          {weekDates.map((date, i) => {
            const isSelected = formatDate(date) === formatDate(mobileDay);
            const isToday = formatDate(date) === TODAY;
            const hasAppts = getApptsForDay(date).length > 0;
            return (
              <button
                key={i}
                onClick={() => setMobileDay(date)}
                style={{
                  flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center',
                  width: 46, padding: '8px 4px 6px', borderRadius: 14, border: 'none',
                  background: isSelected ? '#3B82F6' : isToday ? '#EFF6FF' : 'white',
                  boxShadow: isSelected ? '0 2px 8px rgba(59,130,246,0.35)' : '0 1px 3px rgba(0,0,0,0.06)',
                  cursor: 'pointer', transition: 'all 0.15s',
                  outline: isToday && !isSelected ? '2px solid #93C5FD' : 'none',
                }}
              >
                <span style={{ fontSize: 10, fontWeight: 700, color: isSelected ? 'rgba(255,255,255,0.75)' : '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  {DAYS_PT[date.getDay()]}
                </span>
                <span style={{ fontSize: 19, fontWeight: 800, color: isSelected ? 'white' : isToday ? '#3B82F6' : '#111827', marginTop: 2, lineHeight: 1 }}>
                  {date.getDate()}
                </span>
                <div style={{ width: 5, height: 5, borderRadius: '50%', marginTop: 4, background: hasAppts ? (isSelected ? 'rgba(255,255,255,0.8)' : '#3B82F6') : 'transparent' }} />
              </button>
            );
          })}
        </div>

        {/* Selected day label */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--gray-700)', textTransform: 'capitalize' }}>
            {mobileDayLabel}
          </p>
          {mobileDayAppts.length > 0 && (
            <span style={{ fontSize: 12, color: 'var(--gray-500)' }}>{mobileDayAppts.length} aula{mobileDayAppts.length !== 1 ? 's' : ''}</span>
          )}
        </div>

        {/* Appointment list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {mobileDayAppts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '52px 0 40px', color: 'var(--gray-400)' }}>
              <Calendar size={36} color="#E5E7EB" style={{ display: 'block', margin: '0 auto 12px' }} />
              <p style={{ margin: '0 0 4px', fontSize: 15, fontWeight: 700, color: 'var(--gray-700)' }}>Sem aulas neste dia</p>
              <p style={{ margin: '0 0 20px', fontSize: 13, color: 'var(--gray-400)' }}>Toque no botão abaixo para agendar</p>
              <button
                onClick={() => openModalForDay(mobileDay)}
                style={{ padding: '11px 28px', background: 'var(--accent)', color: 'white', border: 'none', borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}
              >
                <Plus size={16} /> Agendar aula
              </button>
            </div>
          ) : (
            mobileDayAppts.map(appt => (
              <MobileApptCard
                key={appt.id}
                appt={appt}
                onClick={setSelectedAppt}
                isSelected={selectedAppt?.id === appt.id}
              />
            ))
          )}
        </div>

        {/* Mobile action sheet */}
        {selectedAppt && (
          <div
            ref={actionRef}
            className="agenda-action-panel"
            style={{ background: 'var(--bg-surface)', borderRadius: 12, boxShadow: '0 4px 20px rgba(0,0,0,0.12)', overflow: 'hidden' }}
          >
            <ActionPanelContent
              appt={selectedAppt}
              hasPhone={hasPhone}
              actionLoading={actionLoading}
              onClose={() => setSelectedAppt(null)}
              onMarkDone={handleMarkDone}
              onWhatsApp={handleWhatsApp}
              onEdit={handleEditAppt}
              onCancel={handleCancel}
              onDelete={handleDeleteAppt}
            />
          </div>
        )}
      </div>

      {/* FAB — mobile only */}
      <button
        className="agenda-fab"
        onClick={() => { setEditingId(null); setSelectedAppt(null); setForm({ studentId: '', date: formatDate(mobileDay), time: '08:00', type: 'Musculação', notes: '', repeat: false, repeatWeeks: '4' }); setModal(true); }}
        aria-label="Nova aula"
      >
        <Plus size={24} />
      </button>

      {/* Create/edit appointment modal */}
      <Modal isOpen={modal} onClose={() => { setModal(false); resetForm(); }} title={editingId ? 'Editar Aula' : 'Nova Aula'}>
        <form onSubmit={handleSubmit}>
          {/* Mode toggle — only for new appointments */}
          {!editingId && (
            <div style={{ display: 'flex', background: 'var(--bg-page)', borderRadius: 10, padding: 4, gap: 4, marginBottom: 18 }}>
              {[
                { key: 'single', label: '📅 Aula avulsa' },
                { key: 'weekly', label: '🔄 Agenda semanal' },
              ].map(m => (
                <button
                  key={m.key}
                  type="button"
                  onClick={() => setScheduleMode(m.key)}
                  style={{
                    flex: 1, padding: '8px 0', borderRadius: 7, border: 'none', cursor: 'pointer',
                    fontSize: 13, fontWeight: 600, transition: 'all 0.15s',
                    background: scheduleMode === m.key ? 'white' : 'transparent',
                    color: scheduleMode === m.key ? '#111827' : '#6B7280',
                    boxShadow: scheduleMode === m.key ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                  }}
                >{m.label}</button>
              ))}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label>Aluno *</label>
              <select name="studentId" value={form.studentId} onChange={handleChange} required>
                <option value="">Selecione o aluno...</option>
                {students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>

            {scheduleMode === 'weekly' && !editingId ? (
              <>
                {/* Weekly mode */}
                <div>
                  <label style={{ marginBottom: 8, display: 'block' }}>Dias da semana *</label>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {[{v:1,l:'Seg'},{v:2,l:'Ter'},{v:3,l:'Qua'},{v:4,l:'Qui'},{v:5,l:'Sex'},{v:6,l:'Sáb'},{v:0,l:'Dom'}].map(d => {
                      const on = form.daysOfWeek.includes(d.v);
                      return (
                        <button
                          key={d.v}
                          type="button"
                          onClick={() => setForm(f => ({
                            ...f,
                            daysOfWeek: on ? f.daysOfWeek.filter(x => x !== d.v) : [...f.daysOfWeek, d.v],
                          }))}
                          style={{
                            flex: 1, padding: '8px 4px', borderRadius: 8, border: `2px solid ${on ? '#3B82F6' : '#E5E7EB'}`,
                            background: on ? '#EFF6FF' : 'white', color: on ? '#1D4ED8' : '#6B7280',
                            fontSize: 12, fontWeight: 700, cursor: 'pointer', transition: 'all 0.12s',
                          }}
                        >{d.l}</button>
                      );
                    })}
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label>Horário *</label>
                    <input name="time" type="time" value={form.time} onChange={handleChange} required />
                  </div>
                  <div>
                    <label>Duração</label>
                    <select name="repeatWeeks" value={form.repeatWeeks} onChange={handleChange}>
                      {[2,4,8,12,16,24].map(w => <option key={w} value={w}>{w} semanas</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label>Início *</label>
                  <input name="date" type="date" value={form.date} onChange={handleChange} required />
                </div>
                {form.daysOfWeek.length > 0 && (
                  <div style={{ background: '#EFF6FF', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#1D4ED8', fontWeight: 600 }}>
                    ✓ {form.daysOfWeek.length * parseInt(form.repeatWeeks)} aulas serão criadas
                  </div>
                )}
              </>
            ) : (
              <>
                {/* Single mode */}
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
                {!editingId && (
                  <div style={{ background: 'var(--bg-page)', borderRadius: 10, padding: 14 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', marginBottom: form.repeat ? 10 : 0 }}>
                      <input type="checkbox" checked={form.repeat} onChange={e => setForm(f => ({ ...f, repeat: e.target.checked }))} style={{ width: 16, height: 16, accentColor: '#3B82F6', cursor: 'pointer' }} />
                      <div>
                        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--gray-700)', display: 'flex', alignItems: 'center', gap: 6 }}>
                          <RefreshCw size={13} color="#3B82F6" /> Repetir semanalmente
                        </span>
                        <p style={{ margin: '1px 0 0', fontSize: 11, color: 'var(--gray-400)' }}>Cria a mesma aula nas próximas semanas</p>
                      </div>
                    </label>
                    {form.repeat && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <label style={{ fontSize: 13, color: 'var(--gray-700)', fontWeight: 500, whiteSpace: 'nowrap', marginBottom: 0 }}>Repetir por</label>
                        <select name="repeatWeeks" value={form.repeatWeeks} onChange={handleChange} style={{ flex: 1 }}>
                          {[2,4,8,12,16,24].map(w => <option key={w} value={w}>{w} semanas</option>)}
                        </select>
                        <span style={{ fontSize: 12, color: 'var(--gray-500)', whiteSpace: 'nowrap' }}>= {parseInt(form.repeatWeeks)} aulas</span>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}

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

            <div>
              <label>Observações</label>
              <textarea name="notes" value={form.notes} onChange={handleChange} placeholder="Notas sobre a aula..." rows={2} style={{ resize: 'vertical' }} />
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
            <button type="button" className="btn-secondary" onClick={() => { setModal(false); resetForm(); }}>Cancelar</button>
            <button type="submit" className="btn-primary" disabled={scheduleMode === 'weekly' && form.daysOfWeek.length === 0}>
              {editingId ? 'Salvar alterações'
                : scheduleMode === 'weekly' ? `Criar ${form.daysOfWeek.length * parseInt(form.repeatWeeks)} aulas`
                : form.repeat ? `Criar ${form.repeatWeeks} aulas`
                : 'Agendar Aula'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

function ActionPanelContent({ appt, hasPhone, actionLoading, onClose, onMarkDone, onWhatsApp, onEdit, onCancel, onDelete }) {
  return (
    <>
      <div style={{ padding: '14px 16px', background: appt.color, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <p style={{ margin: 0, fontSize: 11, color: 'rgba(255,255,255,0.8)', fontWeight: 600 }}>
            {new Date(appt.date + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'short' })} · {(appt.time || '').slice(0, 5)}
          </p>
          <p style={{ margin: '4px 0 0', fontSize: 16, fontWeight: 800, color: 'white' }}>
            {appt.student_name || appt.studentName}
          </p>
          <p style={{ margin: '2px 0 0', fontSize: 13, color: 'rgba(255,255,255,0.8)' }}>{appt.type}</p>
        </div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.8)', cursor: 'pointer', display: 'flex', padding: 2 }}>
          <X size={18} />
        </button>
      </div>

      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {appt.status !== 'done' && appt.status !== 'cancelled' && (
          <button
            onClick={() => onMarkDone(appt)}
            disabled={actionLoading}
            style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', background: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: 10, cursor: 'pointer', width: '100%', textAlign: 'left', opacity: actionLoading ? 0.7 : 1 }}
          >
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#10B981', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Check size={16} color="white" />
            </div>
            <div>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#065F46' }}>Confirmar presença</p>
              <p style={{ margin: 0, fontSize: 11, color: 'var(--gray-500)' }}>Registra frequência automaticamente</p>
            </div>
          </button>
        )}

        {appt.status === 'done' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 10 }}>
            <Check size={18} color="#10B981" />
            <span style={{ fontSize: 13, fontWeight: 600, color: '#15803D' }}>Aula realizada · presença registrada</span>
          </div>
        )}

        {appt.status === 'cancelled' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10 }}>
            <X size={18} color="#EF4444" />
            <span style={{ fontSize: 13, fontWeight: 600, color: '#DC2626' }}>Aula cancelada</span>
          </div>
        )}

        {hasPhone && (
          <button
            onClick={() => onWhatsApp(appt)}
            style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 10, cursor: 'pointer', width: '100%', textAlign: 'left' }}
          >
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#25D366', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <MessageCircle size={16} color="white" />
            </div>
            <div>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#065F46' }}>Enviar WhatsApp</p>
              <p style={{ margin: 0, fontSize: 11, color: 'var(--gray-500)' }}>Lembrete de confirmação</p>
            </div>
          </button>
        )}

        {appt.status !== 'cancelled' && appt.status !== 'done' && (
          <>
            <button
              onClick={() => onEdit(appt)}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 10, cursor: 'pointer', width: '100%', textAlign: 'left' }}
            >
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#DBEAFE', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#3B82F6" strokeWidth="2.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              </div>
              <div>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#1E40AF' }}>Editar aula</p>
                <p style={{ margin: 0, fontSize: 11, color: 'var(--gray-500)' }}>Alterar horário, tipo ou data</p>
              </div>
            </button>
            <button
              onClick={() => onCancel(appt)}
              disabled={actionLoading}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10, cursor: 'pointer', width: '100%', textAlign: 'left', opacity: actionLoading ? 0.7 : 1 }}
            >
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#FEE2E2', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <X size={16} color="#EF4444" />
              </div>
              <div>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#991B1B' }}>Cancelar aula</p>
                <p style={{ margin: 0, fontSize: 11, color: 'var(--gray-500)' }}>Marca como cancelada</p>
              </div>
            </button>
          </>
        )}

        <button
          onClick={() => onDelete(appt)}
          disabled={actionLoading}
          style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', background: 'none', border: '1px solid var(--border-light)', borderRadius: 10, cursor: 'pointer', width: '100%', textAlign: 'left', opacity: actionLoading ? 0.7 : 1 }}
        >
          <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--bg-page)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/></svg>
          </div>
          <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: 'var(--gray-400)' }}>Excluir da agenda</p>
        </button>
      </div>
    </>
  );
}



