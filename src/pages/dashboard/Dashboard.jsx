import { useState, useEffect } from 'react';
import { Users, Calendar, DollarSign, Check, MessageCircle, ChevronRight, Clock, Plus, Zap, AlertTriangle, TrendingUp, Bell, CheckCircle, Dumbbell } from 'lucide-react';
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
  const [alerts, setAlerts] = useState([]);
  const [notifyingId, setNotifyingId] = useState(null);
  const [notifiedIds, setNotifiedIds] = useState(new Set());

  // Redirect to onboarding on first login
  useEffect(() => {
    if (!localStorage.getItem('pt_onboarded')) {
      navigate('/onboarding', { replace: true });
    }
  }, []);

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

      // Build alerts: inactive students + overdue payments
      const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
      const threeDaysAgo = new Date(Date.now() - 3 * 86400000).toISOString().slice(0, 10);
      Promise.all([
        supabase.from('students').select('id, name, color, initials').eq('personal_id', user.id).eq('status', 'ativo'),
        supabase.from('workout_sessions').select('student_id, date').eq('personal_id', user.id).gte('date', sevenDaysAgo),
        supabase.from('payments').select('student_id, due_date, amount').eq('personal_id', user.id).eq('status', 'pendente').lt('due_date', TODAY),
      ]).then(([{ data: sts }, { data: sessions }, { data: latePayments }]) => {
        const builtAlerts = [];
        const trainedIds = new Set((sessions || []).map(s => String(s.student_id)));
        const latePaySet = new Set((latePayments || []).map(p => String(p.student_id)));
        (sts || []).forEach(st => {
          if (!trainedIds.has(String(st.id))) {
            builtAlerts.push({ type: 'inactive', student: st, message: 'Não registra treino há mais de 7 dias' });
          }
          if (latePaySet.has(String(st.id))) {
            builtAlerts.push({ type: 'payment', student: st, message: 'Pagamento em atraso' });
          }
        });
        setAlerts(builtAlerts.slice(0, 5));
      });
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

  const handleNotifyInactive = async (e, student) => {
    e.stopPropagation();
    setNotifyingId(student.id);
    try {
      await supabase.functions.invoke('send-push', {
        body: {
          student_ids: [student.id],
          title: 'Sentimos sua falta! 💪',
          message: 'Seu personal está esperando você. Que tal retomar os treinos hoje?',
          personal_id: user.id,
          url: '/aluno/dashboard',
        },
      });
      setNotifiedIds(prev => new Set([...prev, student.id]));
    } catch {}
    setNotifyingId(null);
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

        {/* Quick actions — só quando já tem alunos */}
        {students.length > 0 && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {[
              { label: '+ Nova aula', to: '/dashboard/agenda',     color: '#3B82F6', bg: '#EFF6FF' },
              { label: '+ Aluno',     to: '/dashboard/alunos',     color: '#10B981', bg: '#ECFDF5' },
              { label: '+ Treino',    to: '/dashboard/treinos',    color: '#8B5CF6', bg: '#F5F3FF' },
            ].map(a => (
              <button key={a.to} onClick={() => navigate(a.to)}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 20, border: `1.5px solid ${a.color}25`, background: a.bg, color: a.color, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                {a.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Primeiros passos — só aparece sem alunos */}
      {students.length === 0 && (
        <div style={{ background: 'white', borderRadius: 16, border: '1px solid #E5E7EB', marginBottom: 20, overflow: 'hidden' }}>
          {/* Header */}
          <div style={{ background: 'linear-gradient(135deg, #3B82F6, #8B5CF6)', padding: '18px 24px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 38, height: 38, borderRadius: 11, background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Zap size={20} color="white" fill="white" />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 900, color: 'white', letterSpacing: '-0.3px' }}>Por onde começar?</h3>
              <p style={{ margin: 0, fontSize: 13, color: 'rgba(255,255,255,0.75)' }}>Siga esses 3 passos e estará pronto em minutos</p>
            </div>
          </div>
          {/* Steps */}
          <div style={{ padding: '0 8px 8px' }}>
            {[
              {
                n: 1, icon: Users,    color: '#3B82F6', bg: '#EFF6FF',
                title: 'Convide seu primeiro aluno',
                desc:  'Gere um link de convite — o aluno cria a conta pelo celular',
                cta:   'Ir para Alunos', to: '/dashboard/alunos',
              },
              {
                n: 2, icon: Dumbbell, color: '#8B5CF6', bg: '#F5F3FF',
                title: 'Monte o treino dele',
                desc:  'Crie um plano com exercícios, séries e carga — o aluno acessa no app',
                cta:   'Criar treino', to: '/dashboard/treinos',
              },
              {
                n: 3, icon: Calendar, color: '#10B981', bg: '#ECFDF5',
                title: 'Agende a primeira aula',
                desc:  'Confirme o horário e envie lembrete automático pelo WhatsApp',
                cta:   'Ver agenda', to: '/dashboard/agenda',
              },
            ].map((s, idx) => {
              const Icon = s.icon;
              const isLast = idx === 2;
              return (
                <div key={s.n} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', borderBottom: isLast ? 'none' : '1px solid #F3F4F6' }}>
                  {/* Step circle */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                    <div style={{ width: 42, height: 42, borderRadius: 12, background: s.bg, border: `1.5px solid ${s.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Icon size={19} color={s.color} />
                    </div>
                    {!isLast && <div style={{ width: 1, height: 14, background: '#E5E7EB', marginTop: 4 }} />}
                  </div>
                  {/* Text */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 2 }}>
                      <span style={{ fontSize: 10, fontWeight: 800, color: s.color, background: s.bg, padding: '1px 7px', borderRadius: 20 }}>Passo {s.n}</span>
                    </div>
                    <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#111827' }}>{s.title}</p>
                    <p style={{ margin: '2px 0 0', fontSize: 12, color: '#6B7280', lineHeight: 1.4 }}>{s.desc}</p>
                  </div>
                  {/* CTA */}
                  <button onClick={() => navigate(s.to)}
                    style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 5, padding: '8px 14px', borderRadius: 10, border: 'none', background: s.bg, color: s.color, fontSize: 13, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                    {s.cta} <ChevronRight size={13} />
                  </button>
                </div>
              );
            })}
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
      <div className="dashboard-main-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

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

      {/* Alerts */}
      {alerts.length > 0 && (
        <div style={{ marginTop: 16, background: 'white', borderRadius: 14, boxShadow: '0 1px 3px rgba(0,0,0,0.07)', border: '1px solid #F1F5F9', overflow: 'hidden' }}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid #F3F4F6', display: 'flex', alignItems: 'center', gap: 8 }}>
            <AlertTriangle size={16} color="#D97706" />
            <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#111827' }}>Atenção necessária</h3>
            <span style={{ background: '#FEF3C7', color: '#D97706', fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20 }}>{alerts.length}</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {alerts.map((alert, i) => {
              const st = alert.student;
              return (
                <div key={`${alert.type}-${st.id}`}
                  style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 20px', borderBottom: i < alerts.length - 1 ? '1px solid #F9FAFB' : 'none', cursor: 'pointer' }}
                  onClick={() => navigate(`/dashboard/alunos/${st.id}`)}
                  onMouseEnter={e => e.currentTarget.style.background = '#F9FAFB'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <div style={{ width: 36, height: 36, borderRadius: '50%', background: st.color || '#6B7280', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, color: 'white', flexShrink: 0 }}>
                    {(st.initials || st.name?.slice(0, 2)).toUpperCase()}
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#111827' }}>{st.name}</p>
                    <p style={{ margin: 0, fontSize: 12, color: alert.type === 'payment' ? '#DC2626' : '#D97706' }}>{alert.message}</p>
                  </div>
                  {alert.type === 'inactive' && (
                    <button
                      onClick={e => handleNotifyInactive(e, st)}
                      disabled={!!notifyingId || notifiedIds.has(st.id)}
                      title="Enviar notificação push"
                      style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 8, border: 'none', cursor: notifiedIds.has(st.id) ? 'default' : 'pointer', background: notifiedIds.has(st.id) ? '#ECFDF5' : '#EFF6FF', color: notifiedIds.has(st.id) ? '#059669' : '#3B82F6', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
                      {notifyingId === st.id ? <Bell size={13} style={{ animation: 'spin 1s linear infinite' }} /> : notifiedIds.has(st.id) ? <CheckCircle size={13} /> : <Bell size={13} />}
                      {notifiedIds.has(st.id) ? 'Enviado' : 'Notificar'}
                    </button>
                  )}
                  <div style={{ width: 28, height: 28, borderRadius: 8, background: alert.type === 'payment' ? '#FEE2E2' : '#FEF3C7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {alert.type === 'payment' ? <DollarSign size={14} color="#DC2626" /> : <AlertTriangle size={14} color="#D97706" />}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
