import { useState, useEffect } from 'react';
import { Users, Calendar, DollarSign, Check, MessageCircle, ChevronRight, Clock, TrendingUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import StatCard from '../../components/UI/StatCard';
import Avatar from '../../components/UI/Avatar';
import Badge from '../../components/UI/Badge';
import { useAuth } from '../../context/AuthContext';
import { supabase, hasSupabase } from '../../lib/supabase';
import { appointments as mockAppts, students as mockStudents } from '../../data/mockData';

const TODAY = new Date().toISOString().slice(0, 10);
const TOMORROW = new Date(Date.now() + 86400000).toISOString().slice(0, 10);

export default function Dashboard() {
  const { user } = useAuth();
  const [students, setStudents] = useState([]);
  const [todayAppts, setTodayAppts] = useState([]);
  const [tomorrowAppts, setTomorrowAppts] = useState([]);
  const [revenue, setRevenue] = useState(0);
  const [markingDone, setMarkingDone] = useState(null);

  useEffect(() => {
    if (!user) return;
    if (hasSupabase) {
      supabase.from('students').select('*').eq('personal_id', user.id)
        .then(({ data }) => setStudents(data || []));

      supabase.from('appointments').select('*').eq('personal_id', user.id)
        .in('date', [TODAY, TOMORROW])
        .then(({ data }) => {
          const all = data || [];
          setTodayAppts(all.filter(a => a.date === TODAY).sort((a, b) => a.time.localeCompare(b.time)));
          setTomorrowAppts(all.filter(a => a.date === TOMORROW).sort((a, b) => a.time.localeCompare(b.time)));
        });

      supabase.from('payments').select('amount').eq('personal_id', user.id).eq('status', 'pago')
        .then(({ data }) => setRevenue((data || []).reduce((s, p) => s + Number(p.amount), 0)));
    } else {
      setStudents(mockStudents);
      const todayMock = mockAppts.filter(a => a.date === TODAY);
      setTodayAppts(todayMock.sort((a, b) => a.time.localeCompare(b.time)));
      setTomorrowAppts([]);
      setRevenue(1850);
    }
  }, [user?.id]);

  const handleMarkDone = async (appt) => {
    setMarkingDone(appt.id);
    if (hasSupabase) {
      await supabase.from('appointments').update({ status: 'done' }).eq('id', appt.id);
      await supabase.from('attendances').upsert({
        personal_id: user.id, student_id: appt.student_id,
        appointment_id: appt.id, date: appt.date, status: 'present',
      }, { onConflict: 'student_id,date' });
    }
    setTodayAppts(prev => prev.map(a => a.id === appt.id ? { ...a, status: 'done' } : a));
    setMarkingDone(null);
  };

  const handleWhatsApp = (appt) => {
    const student = students.find(s => String(s.id) === String(appt.student_id));
    if (!student?.phone) return;
    const phone = student.phone.replace(/\D/g, '');
    const full = phone.startsWith('55') ? phone : `55${phone}`;
    const msg = `Olá ${(appt.student_name || '').split(' ')[0]}! Lembrando da sua aula de ${appt.type} hoje às ${appt.time}. Te vejo lá! 💪`;
    window.open(`https://wa.me/${full}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const navigate = useNavigate();
  const activeStudents = students.filter(s => s.status === 'ativo');
  const pendingToday = todayAppts.filter(a => a.status !== 'done' && a.status !== 'cancelled').length;

  return (
    <div className="page-padding" style={{ flex: 1 }}>
      {/* Onboarding banner for new personals */}
      {students.length === 0 && (
        <div style={{ background: 'linear-gradient(135deg, #3B82F6, #8B5CF6)', borderRadius: 16, padding: '24px 28px', marginBottom: 24, color: 'white' }}>
          <h3 style={{ margin: '0 0 6px', fontSize: 18, fontWeight: 800 }}>Bem-vindo ao WAY FIT! 🎉</h3>
          <p style={{ margin: '0 0 18px', fontSize: 14, opacity: 0.9 }}>Comece em 3 passos simples para gerenciar seus alunos:</p>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {[
              { step: '1', label: 'Adicionar aluno', to: '/dashboard/alunos', desc: 'Cadastre ou convide' },
              { step: '2', label: 'Criar treino', to: '/dashboard/treinos', desc: 'Monte a semana' },
              { step: '3', label: 'Agendar aula', to: '/dashboard/agenda', desc: 'Marque os horários' },
            ].map(item => (
              <button
                key={item.step}
                onClick={() => navigate(item.to)}
                style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 10, cursor: 'pointer', color: 'white', backdropFilter: 'blur(4px)', transition: 'background 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.25)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.15)'}
              >
                <span style={{ width: 26, height: 26, borderRadius: '50%', background: 'rgba(255,255,255,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, flexShrink: 0 }}>{item.step}</span>
                <div style={{ textAlign: 'left' }}>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 700 }}>{item.label}</p>
                  <p style={{ margin: 0, fontSize: 11, opacity: 0.8 }}>{item.desc}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20, marginBottom: 28 }}>
        <div onClick={() => navigate('/dashboard/alunos')} style={{ cursor: 'pointer' }}>
          <StatCard title="Alunos Ativos" value={String(activeStudents.length)} change={null} changeLabel="cadastrados" icon={Users} />
        </div>
        <div onClick={() => navigate('/dashboard/agenda')} style={{ cursor: 'pointer' }}>
          <StatCard title="Aulas Hoje" value={String(todayAppts.length)} change={null} changeLabel={pendingToday > 0 ? `${pendingToday} pendentes` : 'todas confirmadas'} icon={Calendar} />
        </div>
        <div onClick={() => navigate('/dashboard/financeiro')} style={{ cursor: 'pointer' }}>
          <StatCard title="Receita Total" value={`R$ ${revenue.toLocaleString('pt-BR')}`} change={null} changeLabel="pagamentos recebidos" icon={DollarSign} />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* Today's agenda with quick actions */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#111827' }}>Agenda de Hoje</h3>
              <p style={{ margin: '2px 0 0', fontSize: 12, color: '#9CA3AF' }}>
                {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'short' })}
              </p>
            </div>
            <a href="/dashboard/agenda" style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, color: '#3B82F6', textDecoration: 'none', fontWeight: 500 }}>
              Ver agenda <ChevronRight size={14} />
            </a>
          </div>

          {todayAppts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '28px 0', color: '#9CA3AF' }}>
              <Calendar size={28} color="#E5E7EB" style={{ marginBottom: 8 }} />
              <p style={{ margin: 0, fontSize: 14 }}>Nenhuma aula hoje</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {todayAppts.map(appt => {
                const student = students.find(s => String(s.id) === String(appt.student_id));
                const isDone = appt.status === 'done';
                const isCancelled = appt.status === 'cancelled';
                const loading = markingDone === appt.id;

                return (
                  <div key={appt.id} style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
                    borderRadius: 10, border: '1px solid #F3F4F6',
                    background: isDone ? '#F0FDF4' : isCancelled ? '#FEF2F2' : 'white',
                    opacity: isCancelled ? 0.7 : 1,
                  }}>
                    <div style={{ width: 4, height: 36, borderRadius: 2, background: isCancelled ? '#EF4444' : isDone ? '#10B981' : appt.color || '#3B82F6', flexShrink: 0 }} />

                    <div style={{ width: 44, flexShrink: 0, textAlign: 'center' }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#374151' }}>{appt.time}</span>
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {appt.student_name || appt.studentName}
                      </p>
                      <p style={{ margin: 0, fontSize: 11, color: '#9CA3AF' }}>{appt.type}</p>
                    </div>

                    {isDone ? (
                      <span style={{ fontSize: 11, fontWeight: 700, color: '#10B981', display: 'flex', alignItems: 'center', gap: 3, flexShrink: 0 }}>
                        <Check size={12} /> Feita
                      </span>
                    ) : isCancelled ? (
                      <span style={{ fontSize: 11, fontWeight: 700, color: '#EF4444', flexShrink: 0 }}>Cancelada</span>
                    ) : (
                      <div style={{ display: 'flex', gap: 5, flexShrink: 0 }}>
                        {student?.phone && (
                          <button
                            onClick={() => handleWhatsApp(appt)}
                            title="Enviar WhatsApp"
                            style={{ width: 30, height: 30, borderRadius: 8, background: '#F0FDF4', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                          >
                            <MessageCircle size={14} color="#25D366" />
                          </button>
                        )}
                        <button
                          onClick={() => handleMarkDone(appt)}
                          disabled={loading}
                          title="Confirmar presença e registrar frequência"
                          style={{ width: 30, height: 30, borderRadius: 8, background: '#ECFDF5', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: loading ? 0.6 : 1 }}
                        >
                          <Check size={14} color="#10B981" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Tomorrow preview */}
          {tomorrowAppts.length > 0 && (
            <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid #F3F4F6' }}>
              <p style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'flex', alignItems: 'center', gap: 5 }}>
                <Clock size={11} /> Amanhã ({tomorrowAppts.length} aula{tomorrowAppts.length > 1 ? 's' : ''})
              </p>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {tomorrowAppts.map(appt => (
                  <span key={appt.id} style={{ fontSize: 11, padding: '3px 9px', borderRadius: 20, background: `${appt.color || '#3B82F6'}15`, color: appt.color || '#3B82F6', fontWeight: 600 }}>
                    {appt.time} · {(appt.student_name || '').split(' ')[0]}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Students */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#111827' }}>Alunos</h3>
            <a href="/dashboard/alunos" style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, color: '#3B82F6', textDecoration: 'none', fontWeight: 500 }}>
              Ver todos <ChevronRight size={14} />
            </a>
          </div>

          {students.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '28px 0', color: '#9CA3AF' }}>
              <Users size={28} color="#E5E7EB" style={{ marginBottom: 8 }} />
              <p style={{ margin: 0, fontSize: 14 }}>Nenhum aluno cadastrado</p>
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {students.slice(0, 6).map((student, i) => (
                  <div key={student.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '9px 8px', borderRadius: 8, transition: 'background 0.12s' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#F9FAFB'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <Avatar initials={student.initials || student.name?.slice(0, 2).toUpperCase()} color={student.color || '#6B7280'} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{student.name}</p>
                      <p style={{ margin: 0, fontSize: 11, color: '#9CA3AF' }}>Plano {student.plan}</p>
                    </div>
                    <Badge status={student.status} />
                  </div>
                ))}
              </div>

              {students.length > 6 && (
                <p style={{ margin: '8px 0 0', fontSize: 12, color: '#9CA3AF', textAlign: 'center' }}>
                  + {students.length - 6} alunos
                </p>
              )}

              {/* Quick stats */}
              <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid #F3F4F6', display: 'flex', gap: 12 }}>
                <div style={{ flex: 1, textAlign: 'center', padding: '8px', background: '#F0FDF4', borderRadius: 8 }}>
                  <p style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#10B981' }}>{activeStudents.length}</p>
                  <p style={{ margin: 0, fontSize: 11, color: '#6B7280' }}>Ativos</p>
                </div>
                <div style={{ flex: 1, textAlign: 'center', padding: '8px', background: '#FEF3C7', borderRadius: 8 }}>
                  <p style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#D97706' }}>{students.filter(s => s.status === 'pendente').length}</p>
                  <p style={{ margin: 0, fontSize: 11, color: '#6B7280' }}>Pendentes</p>
                </div>
                <div style={{ flex: 1, textAlign: 'center', padding: '8px', background: '#EFF6FF', borderRadius: 8 }}>
                  <p style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#3B82F6' }}>{todayAppts.filter(a => a.status !== 'cancelled').length}</p>
                  <p style={{ margin: 0, fontSize: 11, color: '#6B7280' }}>Hoje</p>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
