import { useState, useEffect } from 'react';
import { Calendar, Clock, CheckCircle, XCircle, AlertCircle, Loader } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { supabase, hasSupabase } from '../../lib/supabase';
import { appointments as mockAppts } from '../../data/mockData';

const STATUS_MAP = {
  confirmed: { label: 'Confirmado', color: '#10B981', bg: '#D1FAE5', icon: CheckCircle },
  pending: { label: 'Aguardando', color: '#F59E0B', bg: '#FEF3C7', icon: AlertCircle },
  cancelled: { label: 'Cancelado', color: '#EF4444', bg: '#FEE2E2', icon: XCircle },
  done: { label: 'Realizado', color: '#6B7280', bg: '#F3F4F6', icon: CheckCircle },
};

export default function AgendaAluno() {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState([]);
  const [personalName, setPersonalName] = useState('');
  const [loading, setLoading] = useState(true);
  const [confirmModal, setConfirmModal] = useState(null);
  const [cancelModal, setCancelModal] = useState(null);

  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);

  useEffect(() => {
    if (!user) return;
    if (hasSupabase) {
      (async () => {
        const { data: student } = await supabase
          .from('students').select('id, personal_id').eq('user_id', user.id).maybeSingle();

        if (student) {
          const [{ data: appts }, { data: profile }] = await Promise.all([
            supabase.from('appointments').select('*').eq('student_id', student.id).order('date'),
            student.personal_id ? supabase.from('profiles').select('name').eq('id', student.personal_id).single() : { data: null },
          ]);
          setAppointments(appts || []);
          setPersonalName(profile?.name || '');
        }
        setLoading(false);
      })();
    } else {
      setAppointments(mockAppts.filter(a => a.studentId === 1));
      setPersonalName('Personal Trainer');
      setLoading(false);
    }
  }, [user?.id]);

  const upcoming = appointments.filter(a => a.date >= todayStr);
  const past = appointments.filter(a => a.date < todayStr);

  const formatDate = (d) => {
    const tomorrow = new Date(now.getTime() + 86400000).toISOString().slice(0, 10);
    if (d === todayStr) return 'Hoje';
    if (d === tomorrow) return 'Amanhã';
    return new Date(d + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
  };

  const updateStatus = async (appt, newStatus) => {
    if (hasSupabase) {
      await supabase.from('appointments').update({ status: newStatus }).eq('id', appt.id);
    }
    setAppointments(prev => prev.map(a => a.id === appt.id ? { ...a, status: newStatus } : a));
  };

  const AppointmentCard = ({ appt }) => {
    const statusKey = appt.date < todayStr ? 'done' : (appt.status || 'pending');
    const s = STATUS_MAP[statusKey] || STATUS_MAP.pending;
    const Icon = s.icon;
    const isFuture = appt.date >= todayStr && appt.status !== 'cancelled';

    return (
      <div style={{ background: 'white', borderRadius: 12, padding: '16px 18px', boxShadow: '0 1px 3px rgba(0,0,0,0.07)', display: 'flex', gap: 14, alignItems: 'flex-start' }}>
        <div style={{ width: 52, height: 52, borderRadius: 12, background: 'linear-gradient(135deg, #3B82F6, #8B5CF6)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <span style={{ fontSize: 17, fontWeight: 800, color: 'white', lineHeight: 1 }}>{appt.date.slice(8)}</span>
          <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.8)', fontWeight: 600 }}>
            {new Date(appt.date + 'T12:00:00').toLocaleDateString('pt-BR', { month: 'short' }).toUpperCase()}
          </span>
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
            <div>
              <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#111827' }}>{appt.type}</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 4, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 12, color: '#6B7280', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Clock size={12} /> {appt.time}{personalName ? ` · com ${personalName.split(' ')[0]}` : ''}
                </span>
              </div>
              {appt.notes && <p style={{ margin: '4px 0 0', fontSize: 12, color: '#9CA3AF', fontStyle: 'italic' }}>{appt.notes}</p>}
            </div>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 20, background: s.bg, color: s.color, fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
              <Icon size={11} /> {s.label}
            </span>
          </div>

          {isFuture && appt.status !== 'confirmed' && (
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <button onClick={() => setConfirmModal(appt)} className="btn-primary" style={{ fontSize: 12, padding: '6px 14px' }}>
                ✓ Confirmar presença
              </button>
              <button onClick={() => setCancelModal(appt)} style={{ fontSize: 12, padding: '6px 14px', background: '#FEF2F2', color: '#EF4444', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>
                Cancelar
              </button>
            </div>
          )}
          {isFuture && appt.status === 'confirmed' && (
            <div style={{ marginTop: 10 }}>
              <button onClick={() => setCancelModal(appt)} style={{ fontSize: 11, padding: '4px 12px', background: '#FEF2F2', color: '#EF4444', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>
                Cancelar aula
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: 80 }}>
      <Loader size={28} color="#3B82F6" style={{ animation: 'spin 1s linear infinite' }} />
      <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  return (
    <div className="page-padding" style={{ flex: 1 }}>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#111827' }}>Minha Agenda</h2>
        <p style={{ margin: '4px 0 0', fontSize: 14, color: '#6B7280' }}>
          {upcoming.length} aula{upcoming.length !== 1 ? 's' : ''} agendada{upcoming.length !== 1 ? 's' : ''}
        </p>
      </div>

      {upcoming.length > 0 ? (
        <div style={{ marginBottom: 28 }}>
          <h3 style={{ margin: '0 0 14px', fontSize: 13, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Próximas Aulas</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {upcoming.map(a => (
              <div key={a.id}>
                <p style={{ margin: '0 0 6px', fontSize: 12, fontWeight: 600, color: '#374151', textTransform: 'capitalize' }}>{formatDate(a.date)}</p>
                <AppointmentCard appt={a} />
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div style={{ background: 'white', borderRadius: 12, padding: '40px 20px', textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', marginBottom: 24 }}>
          <Calendar size={40} color="#D1D5DB" style={{ marginBottom: 12 }} />
          <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#374151' }}>Nenhuma aula agendada</p>
          <p style={{ margin: '6px 0 0', fontSize: 13, color: '#9CA3AF' }}>Seu personal ainda não criou agendamentos para você</p>
        </div>
      )}

      {past.length > 0 && (
        <div>
          <h3 style={{ margin: '0 0 14px', fontSize: 13, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Histórico de Aulas</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, opacity: 0.8 }}>
            {past.slice().reverse().slice(0, 10).map(a => <AppointmentCard key={a.id} appt={a} />)}
          </div>
        </div>
      )}

      {confirmModal && (
        <div className="modal-overlay" onClick={() => setConfirmModal(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ padding: 24 }}>
            <h3 style={{ margin: '0 0 12px', fontSize: 18, fontWeight: 700 }}>Confirmar presença</h3>
            <p style={{ color: '#6B7280', marginBottom: 20, fontSize: 14 }}>
              Confirmar presença em <strong>{confirmModal.type}</strong> — {formatDate(confirmModal.date)} às <strong>{confirmModal.time}</strong>?
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button className="btn-secondary" onClick={() => setConfirmModal(null)}>Cancelar</button>
              <button className="btn-primary" onClick={() => { updateStatus(confirmModal, 'confirmed'); setConfirmModal(null); }}>Confirmar</button>
            </div>
          </div>
        </div>
      )}

      {cancelModal && (
        <div className="modal-overlay" onClick={() => setCancelModal(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ padding: 24 }}>
            <h3 style={{ margin: '0 0 12px', fontSize: 18, fontWeight: 700 }}>Cancelar aula</h3>
            <p style={{ color: '#6B7280', marginBottom: 20, fontSize: 14 }}>
              Cancelar a aula de <strong>{cancelModal.type}</strong> em {formatDate(cancelModal.date)}?
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button className="btn-secondary" onClick={() => setCancelModal(null)}>Voltar</button>
              <button onClick={() => { updateStatus(cancelModal, 'cancelled'); setCancelModal(null); }} style={{ padding: '10px 20px', background: '#EF4444', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 14 }}>
                Cancelar aula
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
