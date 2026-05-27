import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, Dumbbell, DollarSign, TrendingUp, MessageCircle, Check, X, Phone, Mail, Edit2, Clock, BarChart2, Activity } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { supabase, hasSupabase } from '../../lib/supabase';
import Modal from '../../components/UI/Modal';

const TYPE_COLORS = {
  Musculação: '#3B82F6', Funcional: '#10B981', Hipertrofia: '#8B5CF6',
  Cardio: '#F59E0B', Yoga: '#EC4899', Pilates: '#06B6D4', Força: '#EF4444',
};

const AVATAR_COLORS = ['#3B82F6', '#10B981', '#8B5CF6', '#F59E0B', '#EF4444', '#EC4899', '#06B6D4'];
function avatarColor(id) { return AVATAR_COLORS[String(id).charCodeAt(0) % AVATAR_COLORS.length]; }

function StatBox({ icon: Icon, label, value, color, bg }) {
  return (
    <div style={{ background: 'white', borderRadius: 12, padding: '16px 18px', boxShadow: '0 1px 3px rgba(0,0,0,0.07)', display: 'flex', alignItems: 'center', gap: 12 }}>
      <div style={{ width: 40, height: 40, borderRadius: 10, background: bg || '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Icon size={20} color={color || '#3B82F6'} />
      </div>
      <div>
        <p style={{ margin: 0, fontSize: 11, color: '#9CA3AF', fontWeight: 500 }}>{label}</p>
        <p style={{ margin: '2px 0 0', fontSize: 18, fontWeight: 800, color: '#111827' }}>{value}</p>
      </div>
    </div>
  );
}

const TABS = ['Visão Geral', 'Treinos', 'Agenda', 'Frequência', 'Pagamentos', 'Saúde'];

export default function AlunoDetalhe() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [tab, setTab] = useState('Visão Geral');

  const [student, setStudent] = useState(null);
  const [plans, setPlans] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [attendances, setAttendances] = useState([]);
  const [payments, setPayments] = useState([]);
  const [measurements, setMeasurements] = useState([]);
  const [anamnese, setAnamnese] = useState(null);
  const [loading, setLoading] = useState(true);

  const [scheduleModal, setScheduleModal] = useState(false);
  const [schedForm, setSchedForm] = useState({ date: new Date().toISOString().slice(0, 10), time: '08:00', type: 'Musculação' });

  const today = new Date().toISOString().slice(0, 10);
  const monthStart = `${today.slice(0, 7)}-01`;

  useEffect(() => {
    if (!user || !id) return;
    if (!hasSupabase) { setLoading(false); return; }

    const load = async () => {
      const [
        { data: s },
        { data: p },
        { data: appts },
        { data: atts },
        { data: pays },
        { data: meas },
        { data: ana },
      ] = await Promise.all([
        supabase.from('students').select('*').eq('id', id).eq('personal_id', user.id).maybeSingle(),
        supabase.from('training_plans').select('*, exercises(*)').eq('student_id', id).order('created_at', { ascending: false }),
        supabase.from('appointments').select('*').eq('student_id', id).order('date', { ascending: false }).limit(20),
        supabase.from('attendances').select('*').eq('student_id', id).gte('date', monthStart).order('date'),
        supabase.from('payments').select('*').eq('student_id', id).order('due_date', { ascending: false }).limit(10),
        supabase.from('student_measurements').select('*').eq('student_id', id).order('date').limit(10),
        supabase.from('anamneses').select('*').eq('student_id', id).maybeSingle(),
      ]);

      setStudent(s);
      setPlans(p || []);
      setAppointments(appts || []);
      setAttendances(atts || []);
      setPayments(pays || []);
      setMeasurements(meas || []);
      setAnamnese(ana);
      setLoading(false);
    };
    load();
  }, [user?.id, id]);

  const handleSchedule = async (e) => {
    e.preventDefault();
    if (!student) return;
    const newAppt = {
      personal_id: user.id, student_id: student.id, student_name: student.name,
      date: schedForm.date, time: schedForm.time, type: schedForm.type,
      status: 'pending', color: TYPE_COLORS[schedForm.type] || '#3B82F6',
    };
    if (hasSupabase) {
      const { data } = await supabase.from('appointments').insert(newAppt).select().single();
      if (data) setAppointments(prev => [data, ...prev]);
    }
    setScheduleModal(false);
  };

  const handleMarkDone = async (appt) => {
    if (hasSupabase) {
      await supabase.from('appointments').update({ status: 'done' }).eq('id', appt.id);
      await supabase.from('attendances').upsert({ personal_id: user.id, student_id: appt.student_id, appointment_id: appt.id, date: appt.date, status: 'present' }, { onConflict: 'student_id,date' });
    }
    setAppointments(prev => prev.map(a => a.id === appt.id ? { ...a, status: 'done' } : a));
  };

  if (loading) return <div className="loading-screen">Carregando...</div>;
  if (!student) return (
    <div className="page-padding" style={{ textAlign: 'center', paddingTop: 60 }}>
      <p style={{ color: '#9CA3AF' }}>Aluno não encontrado.</p>
      <button onClick={() => navigate('/dashboard/alunos')} className="btn-primary" style={{ marginTop: 16 }}>Voltar</button>
    </div>
  );

  const color = student.color || avatarColor(student.id);
  const initials = student.name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();

  const presentThisMonth = attendances.filter(a => a.status === 'present').length;
  const totalAppts = appointments.filter(a => a.date >= monthStart).length;
  const attendRate = totalAppts > 0 ? Math.round((presentThisMonth / totalAppts) * 100) : null;

  const nextAppt = appointments.find(a => a.date >= today && a.status !== 'cancelled');
  const lastMeasure = measurements.slice(-1)[0];
  const latePay = payments.filter(p => p.status === 'pendente' && p.due_date < today);

  return (
    <div className="page-padding" style={{ flex: 1 }}>
      {/* Back + header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
        <button onClick={() => navigate('/dashboard/alunos')} style={{ background: 'white', border: '1px solid #E5E7EB', borderRadius: 10, padding: '8px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#374151', fontWeight: 600, flexShrink: 0 }}>
          <ArrowLeft size={16} /> Alunos
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flex: 1, minWidth: 0 }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 800, color: 'white', flexShrink: 0 }}>
            {student.avatarUrl ? <img src={student.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} /> : initials}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#111827' }}>{student.name}</h2>
              <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: student.status === 'ativo' ? '#D1FAE5' : '#FEF3C7', color: student.status === 'ativo' ? '#065F46' : '#92400E' }}>
                {student.status === 'ativo' ? 'Ativo' : 'Pendente'}
              </span>
              {latePay.length > 0 && <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: '#FEE2E2', color: '#991B1B' }}>💰 Pagamento atrasado</span>}
            </div>
            <p style={{ margin: '3px 0 0', fontSize: 13, color: '#6B7280' }}>
              {student.goal && <span>{student.goal} · </span>}
              Plano {student.plan}
              {student.age && <span> · {student.age} anos</span>}
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {student.phone && (
            <a href={`https://wa.me/55${student.phone.replace(/\D/g,'')}`} target="_blank" rel="noreferrer"
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 10, textDecoration: 'none', fontSize: 13, fontWeight: 600, color: '#15803D' }}>
              <MessageCircle size={15} /> WhatsApp
            </a>
          )}
          <button onClick={() => navigate(`/dashboard/chat`)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 10, cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#1E40AF' }}>
            <MessageCircle size={15} /> Chat
          </button>
          <button onClick={() => setScheduleModal(true)} className="btn-primary">
            <Calendar size={15} /> Agendar Aula
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 24 }}>
        <StatBox icon={Calendar} label="Próxima aula" value={nextAppt ? new Date(nextAppt.date+'T12:00:00').toLocaleDateString('pt-BR',{day:'numeric',month:'short'}) : '—'} color="#3B82F6" bg="#EFF6FF" />
        <StatBox icon={Activity} label="Frequência" value={attendRate !== null ? `${attendRate}%` : '—'} color="#10B981" bg="#ECFDF5" />
        <StatBox icon={DollarSign} label="Pagamentos OK" value={latePay.length === 0 ? '✓' : `${latePay.length} atraso`} color={latePay.length ? '#EF4444' : '#10B981'} bg={latePay.length ? '#FEE2E2' : '#ECFDF5'} />
        <StatBox icon={TrendingUp} label="Peso atual" value={lastMeasure ? `${lastMeasure.weight}kg` : '—'} color="#8B5CF6" bg="#F5F3FF" />
      </div>

      {/* Contact info */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
        {student.email && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#6B7280' }}>
            <Mail size={14} /> {student.email}
          </div>
        )}
        {student.phone && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#6B7280' }}>
            <Phone size={14} /> {student.phone}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="student-detail-tabs" style={{ marginBottom: 20, borderBottom: '2px solid #F3F4F6', paddingBottom: 0 }}>
        {TABS.map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              padding: '10px 16px', border: 'none', cursor: 'pointer', background: 'none',
              fontSize: 14, fontWeight: tab === t ? 700 : 500,
              color: tab === t ? '#3B82F6' : '#6B7280',
              borderBottom: `2px solid ${tab === t ? '#3B82F6' : 'transparent'}`,
              marginBottom: -2, whiteSpace: 'nowrap', transition: 'all 0.15s',
            }}
          >{t}</button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'Visão Geral' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {/* Current plan */}
          <div style={{ background: 'white', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.07)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <Dumbbell size={16} color="#8B5CF6" />
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#111827' }}>Treino Atual</h3>
            </div>
            {plans.length === 0 ? (
              <p style={{ color: '#9CA3AF', fontSize: 13, textAlign: 'center', padding: '20px 0' }}>Nenhum plano criado</p>
            ) : plans.slice(0, 1).map(plan => (
              <div key={plan.id}>
                <p style={{ margin: '0 0 8px', fontSize: 14, fontWeight: 700, color: '#374151' }}>{plan.name}</p>
                <p style={{ margin: '0 0 10px', fontSize: 12, color: '#9CA3AF' }}>
                  {(plan.days || []).map(d => ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'][d]).join(', ')}
                </p>
                <p style={{ margin: 0, fontSize: 12, color: '#6B7280' }}>{(plan.exercises || []).length} exercícios</p>
              </div>
            ))}
          </div>

          {/* Recent appointments */}
          <div style={{ background: 'white', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.07)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <Calendar size={16} color="#3B82F6" />
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#111827' }}>Próximas Aulas</h3>
            </div>
            {appointments.filter(a => a.date >= today && a.status !== 'cancelled').slice(0, 4).length === 0 ? (
              <p style={{ color: '#9CA3AF', fontSize: 13, textAlign: 'center', padding: '20px 0' }}>Sem aulas agendadas</p>
            ) : appointments.filter(a => a.date >= today && a.status !== 'cancelled').slice(0, 4).map(appt => (
              <div key={appt.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid #F9FAFB' }}>
                <div style={{ width: 3, height: 32, borderRadius: 2, background: appt.color || '#3B82F6', flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#374151' }}>
                    {new Date(appt.date+'T12:00:00').toLocaleDateString('pt-BR',{weekday:'short',day:'numeric',month:'short'})} · {(appt.time||'').slice(0,5)}
                  </p>
                  <p style={{ margin: 0, fontSize: 11, color: '#9CA3AF' }}>{appt.type}</p>
                </div>
                {appt.status === 'done'
                  ? <Check size={14} color="#10B981" />
                  : appt.date === today && appt.status !== 'done'
                    ? <button onClick={() => handleMarkDone(appt)} title="Marcar feita" style={{ background: '#ECFDF5', border: 'none', borderRadius: 8, width: 28, height: 28, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Check size={14} color="#10B981" /></button>
                    : null}
              </div>
            ))}
          </div>

          {/* Measurements */}
          {measurements.length > 0 && (
            <div style={{ background: 'white', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.07)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                <BarChart2 size={16} color="#10B981" />
                <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#111827' }}>Última Medição</h3>
                <span style={{ marginLeft: 'auto', fontSize: 11, color: '#9CA3AF' }}>{new Date(lastMeasure.date+'T12:00:00').toLocaleDateString('pt-BR')}</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
                {[['Peso','weight','kg'],['Cintura','waist','cm'],['Gordura','body_fat','%'],['Peito','chest','cm'],['Braço','arm','cm'],['Quadril','hip','cm']].map(([label,key,unit]) =>
                  lastMeasure[key] ? (
                    <div key={key} style={{ textAlign: 'center', background: '#F9FAFB', borderRadius: 8, padding: '8px 4px' }}>
                      <p style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#111827' }}>{lastMeasure[key]}{unit}</p>
                      <p style={{ margin: '2px 0 0', fontSize: 10, color: '#9CA3AF', fontWeight: 600 }}>{label}</p>
                    </div>
                  ) : null
                )}
              </div>
            </div>
          )}

          {/* Notes / goal */}
          {(student.goal || student.notes) && (
            <div style={{ background: 'white', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.07)' }}>
              <h3 style={{ margin: '0 0 12px', fontSize: 15, fontWeight: 700, color: '#111827' }}>Objetivo</h3>
              {student.goal && <p style={{ margin: '0 0 8px', fontSize: 14, color: '#374151', fontWeight: 600 }}>🎯 {student.goal}</p>}
              {student.notes && <p style={{ margin: 0, fontSize: 13, color: '#6B7280' }}>{student.notes}</p>}
            </div>
          )}
        </div>
      )}

      {tab === 'Treinos' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {plans.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 0', color: '#9CA3AF' }}>
              <Dumbbell size={36} color="#E5E7EB" style={{ marginBottom: 12 }} />
              <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: '#374151' }}>Nenhum plano criado</p>
              <p style={{ margin: '4px 0 16px', fontSize: 13 }}>Vá para a seção Treinos para criar um plano</p>
              <button onClick={() => navigate('/dashboard/treinos')} className="btn-primary">Ir para Treinos</button>
            </div>
          ) : plans.map(plan => (
            <div key={plan.id} style={{ background: 'white', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.07)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div>
                  <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#111827' }}>{plan.name}</p>
                  <p style={{ margin: '3px 0 0', fontSize: 12, color: '#9CA3AF' }}>
                    {(plan.days || []).map(d => ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'][d]).join(', ')} · {(plan.exercises || []).length} exercícios
                  </p>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {(plan.exercises || []).slice(0, 6).map((ex, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: '#F9FAFB', borderRadius: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#374151', flex: 1 }}>{ex.name}</span>
                    <span style={{ fontSize: 12, color: '#6B7280' }}>{ex.sets}x{ex.reps}</span>
                    {ex.weight && <span style={{ fontSize: 12, color: '#9CA3AF' }}>{ex.weight}kg</span>}
                  </div>
                ))}
                {(plan.exercises || []).length > 6 && (
                  <p style={{ margin: '4px 0 0', fontSize: 12, color: '#9CA3AF', textAlign: 'center' }}>+{plan.exercises.length - 6} exercícios</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'Agenda' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {appointments.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 0', color: '#9CA3AF' }}>
              <Calendar size={36} color="#E5E7EB" style={{ marginBottom: 12 }} />
              <p style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 600, color: '#374151' }}>Nenhuma aula agendada</p>
              <button onClick={() => setScheduleModal(true)} className="btn-primary"><Calendar size={15} /> Agendar Aula</button>
            </div>
          ) : appointments.map(appt => (
            <div key={appt.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', background: 'white', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.07)', borderLeft: `4px solid ${appt.color || '#3B82F6'}` }}>
              <div style={{ minWidth: 60, textAlign: 'center' }}>
                <p style={{ margin: 0, fontSize: 17, fontWeight: 800, color: appt.color || '#3B82F6', lineHeight: 1 }}>{(appt.time||'').slice(0,5)}</p>
                <p style={{ margin: '2px 0 0', fontSize: 10, color: '#9CA3AF', fontWeight: 600 }}>
                  {new Date(appt.date+'T12:00:00').toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit'})}
                </p>
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#374151' }}>{appt.type}</p>
                {appt.notes && <p style={{ margin: '2px 0 0', fontSize: 12, color: '#9CA3AF' }}>{appt.notes}</p>}
              </div>
              <span style={{
                fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 20,
                background: appt.status === 'done' ? '#ECFDF5' : appt.status === 'cancelled' ? '#FEF2F2' : '#FFFBEB',
                color: appt.status === 'done' ? '#10B981' : appt.status === 'cancelled' ? '#EF4444' : '#F59E0B',
              }}>
                {appt.status === 'done' ? '✓ Realizada' : appt.status === 'cancelled' ? '✗ Cancelada' : '● Agendada'}
              </span>
            </div>
          ))}
        </div>
      )}

      {tab === 'Frequência' && (
        <div style={{ background: 'white', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.07)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#111827' }}>
              {new Date().toLocaleDateString('pt-BR',{month:'long',year:'numeric'})}
            </h3>
            {attendRate !== null && (
              <span style={{ fontSize: 13, fontWeight: 700, color: attendRate >= 70 ? '#10B981' : '#F59E0B' }}>
                {attendRate}% de presença
              </span>
            )}
          </div>
          {attendances.length === 0 ? (
            <p style={{ color: '#9CA3AF', fontSize: 13, textAlign: 'center', padding: '20px 0' }}>Nenhum registro este mês</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {attendances.map(a => (
                <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 10, background: a.status === 'present' ? '#F0FDF4' : '#FEF2F2', border: `1px solid ${a.status === 'present' ? '#BBF7D0' : '#FECACA'}` }}>
                  {a.status === 'present' ? <Check size={16} color="#10B981" /> : <X size={16} color="#EF4444" />}
                  <span style={{ fontSize: 14, color: '#374151', fontWeight: 500, flex: 1 }}>
                    {new Date(a.date+'T12:00:00').toLocaleDateString('pt-BR',{weekday:'long',day:'numeric',month:'long'})}
                  </span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: a.status === 'present' ? '#10B981' : '#EF4444' }}>
                    {a.status === 'present' ? 'Presente' : 'Faltou'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'Pagamentos' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {payments.length === 0 ? (
            <p style={{ color: '#9CA3AF', fontSize: 13, textAlign: 'center', padding: '48px 0' }}>Nenhum registro de pagamento</p>
          ) : payments.map(p => (
            <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', background: 'white', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.07)' }}>
              <div style={{ flex: 1 }}>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#111827' }}>R$ {Number(p.amount).toLocaleString('pt-BR')}</p>
                <p style={{ margin: '2px 0 0', fontSize: 12, color: '#9CA3AF' }}>Venc. {new Date(p.due_date+'T12:00:00').toLocaleDateString('pt-BR')}</p>
              </div>
              <span style={{
                fontSize: 12, fontWeight: 700, padding: '4px 12px', borderRadius: 20,
                background: p.status === 'pago' ? '#D1FAE5' : p.due_date < today ? '#FEE2E2' : '#FEF3C7',
                color: p.status === 'pago' ? '#065F46' : p.due_date < today ? '#991B1B' : '#92400E',
              }}>
                {p.status === 'pago' ? '✓ Pago' : p.due_date < today ? 'Atrasado' : 'Pendente'}
              </span>
            </div>
          ))}
        </div>
      )}

      {tab === 'Saúde' && (
        <div style={{ background: 'white', borderRadius: 12, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.07)' }}>
          {!anamnese ? (
            <p style={{ color: '#9CA3AF', fontSize: 13, textAlign: 'center', padding: '40px 0' }}>Aluno ainda não preencheu a ficha de saúde</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {anamnese.objective && <InfoRow label="Objetivo" value={anamnese.objective} />}
              {anamnese.health_conditions && <InfoRow label="Condições de saúde" value={anamnese.health_conditions} />}
              {anamnese.medications && <InfoRow label="Medicamentos" value={anamnese.medications} />}
              {anamnese.injuries && <InfoRow label="Lesões / restrições" value={anamnese.injuries} />}
              {anamnese.physical_activity && <InfoRow label="Atividade física atual" value={anamnese.physical_activity} />}
              {anamnese.sleep_hours && <InfoRow label="Horas de sono" value={`${anamnese.sleep_hours}h`} />}
              {anamnese.water_intake && <InfoRow label="Ingestão de água" value={`${anamnese.water_intake}L/dia`} />}
              {anamnese.notes && <InfoRow label="Observações" value={anamnese.notes} />}
            </div>
          )}
        </div>
      )}

      {/* Quick schedule modal */}
      <Modal isOpen={scheduleModal} onClose={() => setScheduleModal(false)} title="Agendar Aula">
        <form onSubmit={handleSchedule}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <p style={{ margin: 0, fontSize: 14, color: '#374151' }}>Aluno: <strong>{student.name}</strong></p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div><label>Data *</label><input type="date" value={schedForm.date} onChange={e => setSchedForm(f=>({...f,date:e.target.value}))} required /></div>
              <div><label>Horário *</label><input type="time" value={schedForm.time} onChange={e => setSchedForm(f=>({...f,time:e.target.value}))} required /></div>
            </div>
            <div>
              <label>Tipo</label>
              <select value={schedForm.type} onChange={e => setSchedForm(f=>({...f,type:e.target.value}))}>
                {Object.keys(TYPE_COLORS).map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20, paddingTop: 16, borderTop: '1px solid #F3F4F6' }}>
            <button type="button" className="btn-secondary" onClick={() => setScheduleModal(false)}>Cancelar</button>
            <button type="submit" className="btn-primary"><Calendar size={15} /> Agendar</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div style={{ paddingBottom: 14, borderBottom: '1px solid #F9FAFB' }}>
      <p style={{ margin: '0 0 4px', fontSize: 11, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</p>
      <p style={{ margin: 0, fontSize: 14, color: '#374151' }}>{value}</p>
    </div>
  );
}
