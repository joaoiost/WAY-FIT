import { useState, useEffect } from 'react';
import { Users, Calendar, DollarSign, Check, MessageCircle, ChevronRight, Clock, Plus, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Avatar from '../../components/UI/Avatar';
import Badge from '../../components/UI/Badge';
import { useAuth } from '../../context/AuthContext';
import { supabase, hasSupabase } from '../../lib/supabase';
import { appointments as mockAppts, students as mockStudents } from '../../data/mockData';

const TODAY = new Date().toISOString().slice(0, 10);
const TOMORROW = new Date(Date.now() + 86400000).toISOString().slice(0, 10);

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Bom dia';
  if (h < 18) return 'Boa tarde';
  return 'Boa noite';
}

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
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
      setTodayAppts(mockAppts.filter(a => a.date === TODAY).sort((a, b) => a.time.localeCompare(b.time)));
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

  const activeStudents = students.filter(s => s.status === 'ativo');
  const pendingToday = todayAppts.filter(a => a.status !== 'done' && a.status !== 'cancelled').length;
  const firstName = user?.name?.split(' ')[0] || 'Personal';
  const dateLabel = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <div className="page-padding" style={{ flex: 1 }}>

      {/* Greeting + quick actions */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#111827' }}>
              {greeting()}, {firstName}!
            </h2>
            <p style={{ margin: '2px 0 0', fontSize: 13, color: '#9CA3AF', textTransform: 'capitalize' }}>{dateLabel}</p>
          </div>
          {pendingToday > 0 && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 20, background: '#FEF3C7', color: '#D97706', fontSize: 12, fontWeight: 700 }}>
              <Clock size={12} /> {pendingToday} aula{pendingToday > 1 ? 's' : ''} pendente{pendingToday > 1 ? 's' : ''}
            </span>
          )}
        </div>

        {/* Quick actions */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {[
            { label: '+ Nova aula', to: '/dashboard/agenda', color: '#3B82F6', bg: '#EFF6FF' },
            { label: '+ Aluno',     to: '/dashboard/alunos', color: '#10B981', bg: '#ECFDF5' },
            { label: 'Chat',        to: '/dashboard/chat',   color: '#8B5CF6', bg: '#F5F3FF' },
            { label: 'Financeiro',  to: '/dashboard/financeiro', color: '#F59E0B', bg: '#FFFBEB' },
          ].map(a => (
            <button key={a.to} onClick={() => navigate(a.to)}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 20, border: `1.5px solid ${a.color}25`, background: a.bg, color: a.color, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
              {a.label}
            </button>
          ))}
        </div>
      </div>

      {/* Onboarding for new users */}
      {students.length === 0 && (
        <div style={{ background: 'linear-gradient(135deg, #3B82F6, #8B5CF6)', borderRadius: 16, padding: '22px 24px', marginBottom: 20, color: 'white' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <div style={{ width: 32, height: 32, borderRadius: 10, background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Zap size={16} color="white" fill="white" />
            </div>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>Bem-vindo ao WAY FIT!</h3>
          </div>
          <p style={{ margin: '0 0 16px', fontSize: 13, opacity: 0.9 }}>Comece em 3 passos simples:</p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {[
              { n: '1', label: 'Cadastrar aluno', to: '/dashboard/alunos' },
              { n: '2', label: 'Montar treino',   to: '/dashboard/treinos' },
              { n: '3', label: 'Agendar aula',    to: '/dashboard/agenda' },
            ].map(s => (
              <button key={s.n} onClick={() => navigate(s.to)}
                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 14px', background: 'rgba(255,255,255,0.18)', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 10, cursor: 'pointer', color: 'white', fontSize: 13, fontWeight: 600 }}>
                <span style={{ width: 22, height: 22, borderRadius: '50%', background: 'rgba(255,255,255,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, flexShrink: 0 }}>{s.n}</span>
                {s.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Alunos ativos', value: activeStudents.length, sub: `${students.length} total`, color: '#3B82F6', bg: '#EFF6FF', icon: Users, to: '/dashboard/alunos' },
          { label: 'Aulas hoje',    value: todayAppts.length,      sub: pendingToday > 0 ? `${pendingToday} pendentes` : 'em dia',     color: '#10B981', bg: '#ECFDF5', icon: Calendar, to: '/dashboard/agenda' },
          { label: 'Receita',       value: `R$ ${revenue.toLocaleString('pt-BR')}`, sub: 'recebida', color: '#F59E0B', bg: '#FFFBEB', icon: DollarSign, to: '/dashboard/financeiro' },
        ].map(s => (
          <div key={s.label} onClick={() => navigate(s.to)}
            style={{ background: 'white', borderRadius: 14, padding: '14px 16px', boxShadow: '0 1px 3px rgba(0,0,0,0.07)', cursor: 'pointer', border: '1px solid #F1F5F9', transition: 'transform 0.15s, box-shadow 0.15s' }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.07)'; }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
              <s.icon size={16} color={s.color} />
            </div>
            <p style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#111827', lineHeight: 1 }}>{s.value}</p>
            <p style={{ margin: '4px 0 0', fontSize: 11, color: '#9CA3AF', fontWeight: 500 }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Main content */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

        {/* Today's agenda */}
        <div style={{ background: 'white', borderRadius: 14, padding: '18px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.07)', border: '1px solid #F1F5F9' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div>
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#111827' }}>Agenda de Hoje</h3>
              <p style={{ margin: '1px 0 0', fontSize: 11, color: '#9CA3AF' }}>
                {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'short' })}
              </p>
            </div>
            <button onClick={() => navigate('/dashboard/agenda')}
              style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 12, color: '#3B82F6', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, padding: 0 }}>
              Ver tudo <ChevronRight size={13} />
            </button>
          </div>

          {todayAppts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px 0' }}>
              <Calendar size={32} color="#E5E7EB" style={{ marginBottom: 8 }} />
              <p style={{ margin: 0, fontSize: 13, color: '#9CA3AF' }}>Nenhuma aula hoje</p>
              <button onClick={() => navigate('/dashboard/agenda')}
                style={{ marginTop: 10, padding: '7px 16px', background: '#EFF6FF', border: 'none', borderRadius: 20, color: '#3B82F6', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                + Agendar
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {todayAppts.map(appt => {
                const student = students.find(s => String(s.id) === String(appt.student_id));
                const isDone = appt.status === 'done';
                const isCancelled = appt.status === 'cancelled';
                const loading = markingDone === appt.id;
                return (
                  <div key={appt.id} style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '9px 11px',
                    borderRadius: 10, background: isDone ? '#F0FDF4' : isCancelled ? '#FEF2F2' : '#F9FAFB',
                    opacity: isCancelled ? 0.65 : 1, border: `1px solid ${isDone ? '#D1FAE5' : isCancelled ? '#FECACA' : '#F1F5F9'}`,
                  }}>
                    <div style={{ width: 3, height: 32, borderRadius: 2, background: isCancelled ? '#EF4444' : isDone ? '#10B981' : appt.color || '#3B82F6', flexShrink: 0 }} />
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#374151', minWidth: 40, flexShrink: 0 }}>{(appt.time || '').slice(0, 5)}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {appt.student_name || appt.studentName}
                      </p>
                      <p style={{ margin: 0, fontSize: 10, color: '#9CA3AF' }}>{appt.type}</p>
                    </div>
                    {isDone ? (
                      <span style={{ fontSize: 10, fontWeight: 700, color: '#10B981', display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0 }}>
                        <Check size={11} /> Feita
                      </span>
                    ) : isCancelled ? (
                      <span style={{ fontSize: 10, fontWeight: 700, color: '#EF4444', flexShrink: 0 }}>Cancelada</span>
                    ) : (
                      <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                        {student?.phone && (
                          <button onClick={() => handleWhatsApp(appt)}
                            style={{ width: 28, height: 28, borderRadius: 8, background: '#F0FDF4', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <MessageCircle size={13} color="#25D366" />
                          </button>
                        )}
                        <button onClick={() => handleMarkDone(appt)} disabled={loading}
                          style={{ width: 28, height: 28, borderRadius: 8, background: '#ECFDF5', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: loading ? 0.6 : 1 }}>
                          <Check size={13} color="#10B981" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {tomorrowAppts.length > 0 && (
            <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid #F3F4F6' }}>
              <p style={{ margin: '0 0 6px', fontSize: 10, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'flex', alignItems: 'center', gap: 4 }}>
                <Clock size={10} /> Amanhã — {tomorrowAppts.length} aula{tomorrowAppts.length > 1 ? 's' : ''}
              </p>
              <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                {tomorrowAppts.map(appt => (
                  <span key={appt.id} style={{ fontSize: 11, padding: '3px 9px', borderRadius: 20, background: `${appt.color || '#3B82F6'}12`, color: appt.color || '#3B82F6', fontWeight: 600 }}>
                    {(appt.time || '').slice(0, 5)} · {(appt.student_name || '').split(' ')[0]}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Students */}
        <div style={{ background: 'white', borderRadius: 14, padding: '18px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.07)', border: '1px solid #F1F5F9' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#111827' }}>Alunos</h3>
            <button onClick={() => navigate('/dashboard/alunos')}
              style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 12, color: '#3B82F6', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, padding: 0 }}>
              Ver todos <ChevronRight size={13} />
            </button>
          </div>

          {students.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px 0' }}>
              <Users size={32} color="#E5E7EB" style={{ marginBottom: 8 }} />
              <p style={{ margin: 0, fontSize: 13, color: '#9CA3AF' }}>Nenhum aluno ainda</p>
              <button onClick={() => navigate('/dashboard/alunos')}
                style={{ marginTop: 10, padding: '7px 16px', background: '#ECFDF5', border: 'none', borderRadius: 20, color: '#10B981', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                + Cadastrar
              </button>
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {students.slice(0, 6).map(student => (
                  <div key={student.id}
                    style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 8px', borderRadius: 10, cursor: 'pointer', transition: 'background 0.12s' }}
                    onClick={() => navigate(`/dashboard/alunos/${student.id}`)}
                    onMouseEnter={e => e.currentTarget.style.background = '#F9FAFB'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <Avatar initials={student.initials || student.name?.slice(0, 2).toUpperCase()} color={student.color || '#6B7280'} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{student.name}</p>
                      <p style={{ margin: 0, fontSize: 11, color: '#9CA3AF' }}>{student.plan || 'Mensal'}</p>
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

              <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #F3F4F6', display: 'flex', gap: 8 }}>
                {[
                  { v: activeStudents.length, l: 'Ativos', c: '#10B981', bg: '#F0FDF4' },
                  { v: students.filter(s => s.status === 'pendente').length, l: 'Pendentes', c: '#D97706', bg: '#FEF3C7' },
                  { v: students.filter(s => s.status === 'inativo').length, l: 'Inativos', c: '#6B7280', bg: '#F3F4F6' },
                ].map(item => (
                  <div key={item.l} style={{ flex: 1, textAlign: 'center', padding: '8px 4px', background: item.bg, borderRadius: 10 }}>
                    <p style={{ margin: 0, fontSize: 18, fontWeight: 800, color: item.c }}>{item.v}</p>
                    <p style={{ margin: 0, fontSize: 10, color: '#6B7280' }}>{item.l}</p>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
