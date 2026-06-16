import { useState, useEffect } from 'react';
import { Users, Calendar, DollarSign, Check, MessageCircle, ChevronRight, Clock, Plus, Zap, AlertTriangle, TrendingUp, Bell, CheckCircle, Dumbbell, ArrowUp, ArrowDown, Activity, Target, Star } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Avatar from '../../components/UI/Avatar';
import Badge from '../../components/UI/Badge';
import { useAuth } from '../../context/AuthContext';
import { supabase, hasSupabase } from '../../lib/supabase';
import { appointments as mockAppts, students as mockStudents } from '../../data/mockData';

const TODAY = new Date().toISOString().slice(0, 10);
const TOMORROW = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
const MONTH_START = `${TODAY.slice(0, 7)}-01`;
const LAST_MONTH_START = (() => {
  const d = new Date(TODAY);
  d.setMonth(d.getMonth() - 1);
  d.setDate(1);
  return d.toISOString().slice(0, 10);
})();
const LAST_MONTH_END = (() => {
  const d = new Date(TODAY);
  d.setDate(0);
  return d.toISOString().slice(0, 10);
})();
const SIX_MONTHS_AGO = (() => {
  const d = new Date(TODAY);
  d.setMonth(d.getMonth() - 5);
  d.setDate(1);
  return d.toISOString().slice(0, 10);
})();

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Bom dia';
  if (h < 18) return 'Boa tarde';
  return 'Boa noite';
}

function TrendBadge({ current, previous, unit = '' }) {
  if (!previous || previous === 0) return null;
  const diff = current - previous;
  const pct = Math.round(Math.abs(diff / previous) * 100);
  if (pct === 0) return <span style={{ fontSize: 11, color: '#6B7280', fontWeight: 600 }}>= igual</span>;
  const up = diff > 0;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2, fontSize: 11, fontWeight: 700, color: up ? '#10B981' : '#EF4444' }}>
      {up ? <ArrowUp size={10} /> : <ArrowDown size={10} />} {pct}% vs mês ant.
    </span>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [students, setStudents] = useState([]);
  const [todayAppts, setTodayAppts] = useState([]);
  const [tomorrowAppts, setTomorrowAppts] = useState([]);
  const [revenue, setRevenue] = useState(0);
  const [lastMonthRevenue, setLastMonthRevenue] = useState(0);
  const [weekSessions, setWeekSessions] = useState(0);
  const [markingDone, setMarkingDone] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [notifyingId, setNotifyingId] = useState(null);
  const [notifiedIds, setNotifiedIds] = useState(new Set());
  const [activeLastMonth, setActiveLastMonth] = useState(0);
  const [monthlyRevenue, setMonthlyRevenue] = useState([]);
  const [totalPending, setTotalPending] = useState(0);

  useEffect(() => {
    if (!localStorage.getItem('pt_onboarded')) navigate('/onboarding', { replace: true });
  }, []);

  useEffect(() => {
    if (!user) return;
    if (hasSupabase) {
      const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
      Promise.all([
        supabase.from('students').select('*').eq('personal_id', user.id),
        supabase.from('appointments').select('*').eq('personal_id', user.id).in('date', [TODAY, TOMORROW]),
        supabase.from('payments').select('amount, paid_at').eq('personal_id', user.id).eq('status', 'pago'),
        supabase.from('workout_sessions').select('student_id, date').eq('personal_id', user.id).gte('date', sevenDaysAgo),
        supabase.from('students').select('id, name, color, initials').eq('personal_id', user.id).eq('status', 'ativo'),
        supabase.from('workout_sessions').select('student_id, date').eq('personal_id', user.id).gte('date', sevenDaysAgo),
        supabase.from('payments').select('student_id, due_date, amount').eq('personal_id', user.id).eq('status', 'pendente').lt('due_date', TODAY),
        supabase.from('payments').select('amount, paid_at').eq('personal_id', user.id).eq('status', 'pago').gte('paid_at', SIX_MONTHS_AGO),
        supabase.from('payments').select('amount').eq('personal_id', user.id).eq('status', 'pendente'),
      ]).then(([{ data: stds }, { data: appts }, { data: pays }, { data: wk }, { data: sts }, { data: sessions }, { data: latePayments }, { data: sixMoPays }, { data: pendingPays }]) => {
        setStudents(stds || []);
        const all = appts || [];
        setTodayAppts(all.filter(a => a.date === TODAY).sort((a, b) => a.time.localeCompare(b.time)));
        setTomorrowAppts(all.filter(a => a.date === TOMORROW).sort((a, b) => a.time.localeCompare(b.time)));

        const allPays = pays || [];
        const thisMonthRev = allPays.filter(p => (p.paid_at || '').startsWith(TODAY.slice(0, 7))).reduce((s, p) => s + Number(p.amount), 0);
        const lastMonthRev = allPays.filter(p => {
          const d = p.paid_at || '';
          return d >= LAST_MONTH_START && d <= LAST_MONTH_END;
        }).reduce((s, p) => s + Number(p.amount), 0);
        setRevenue(thisMonthRev || allPays.reduce((s, p) => s + Number(p.amount), 0));
        setLastMonthRevenue(lastMonthRev);
        setWeekSessions((wk || []).length);

        const builtAlerts = [];
        const trainedIds = new Set((sessions || []).map(s => String(s.student_id)));
        const latePaySet = new Set((latePayments || []).map(p => String(p.student_id)));
        (sts || []).forEach(st => {
          if (!trainedIds.has(String(st.id))) builtAlerts.push({ type: 'inactive', student: st, message: 'Sem treino há mais de 7 dias' });
          if (latePaySet.has(String(st.id))) builtAlerts.push({ type: 'payment', student: st, message: 'Pagamento em atraso' });
        });
        setAlerts(builtAlerts.slice(0, 5));

        // Monthly revenue trend (last 6 months)
        const byMonth = {};
        for (let i = 5; i >= 0; i--) {
          const d = new Date(TODAY);
          d.setMonth(d.getMonth() - i);
          const key = d.toISOString().slice(0, 7);
          byMonth[key] = 0;
        }
        (sixMoPays || []).forEach(p => {
          const key = (p.paid_at || '').slice(0, 7);
          if (key in byMonth) byMonth[key] += Number(p.amount);
        });
        setMonthlyRevenue(Object.entries(byMonth).map(([month, amount]) => ({ month, amount })));
        setTotalPending((pendingPays || []).reduce((s, p) => s + Number(p.amount), 0));
      });
    } else {
      setStudents(mockStudents);
      setTodayAppts(mockAppts.filter(a => a.date === TODAY).sort((a, b) => a.time.localeCompare(b.time)));
      setTomorrowAppts([]);
      setRevenue(4280);
      setLastMonthRevenue(3820);
      setWeekSessions(12);
    }
  }, [user?.id]);

  const handleMarkDone = async (appt) => {
    setMarkingDone(appt.id);
    if (hasSupabase) {
      await supabase.from('appointments').update({ status: 'done' }).eq('id', appt.id);
      await supabase.from('attendances').upsert({ personal_id: user.id, student_id: appt.student_id, appointment_id: appt.id, date: appt.date, status: 'present' }, { onConflict: 'student_id,date' });
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
        body: { student_ids: [student.id], title: 'Sentimos sua falta! 💪', message: 'Seu personal está esperando você. Que tal retomar os treinos hoje?', personal_id: user.id, url: '/aluno/dashboard' },
      });
      setNotifiedIds(prev => new Set([...prev, student.id]));
    } catch {}
    setNotifyingId(null);
  };

  const activeStudents = students.filter(s => s.status === 'ativo');
  const pendingToday = todayAppts.filter(a => a.status !== 'done' && a.status !== 'cancelled').length;
  const doneToday = todayAppts.filter(a => a.status === 'done').length;
  const firstName = user?.name?.split(' ')[0] || 'Personal';
  const dateLabel = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
  const atRiskCount = alerts.filter(a => a.type === 'inactive').length;
  const latePayCount = alerts.filter(a => a.type === 'payment').length;

  return (
    <div className="page-padding" style={{ flex: 1 }}>

      {/* ── Header ── */}
      <div style={{ marginBottom: 24, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 24, fontWeight: 900, color: '#111827', letterSpacing: '-0.3px' }}>
            {greeting()}, {firstName}!
          </h2>
          <p style={{ margin: '3px 0 0', fontSize: 13, color: '#9CA3AF', textTransform: 'capitalize' }}>{dateLabel}</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {pendingToday > 0 && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '6px 13px', borderRadius: 20, background: '#FEF3C7', color: '#D97706', fontSize: 12, fontWeight: 700, border: '1px solid #FDE68A' }}>
              <Clock size={12} /> {pendingToday} aula{pendingToday > 1 ? 's' : ''} pendente{pendingToday > 1 ? 's' : ''}
            </span>
          )}
          {doneToday > 0 && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '6px 13px', borderRadius: 20, background: '#D1FAE5', color: '#059669', fontSize: 12, fontWeight: 700 }}>
              <Check size={12} /> {doneToday} concluída{doneToday > 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>

      {/* ── Primeiros passos (sem alunos) ── */}
      {students.length === 0 && (
        <div style={{ background: 'white', borderRadius: 20, border: '1px solid #E5E7EB', marginBottom: 24, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
          <div style={{ background: 'linear-gradient(135deg, #3B82F6, #8B5CF6)', padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Zap size={22} color="white" fill="white" />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 900, color: 'white' }}>Por onde começar?</h3>
              <p style={{ margin: 0, fontSize: 13, color: 'rgba(255,255,255,0.75)' }}>Siga esses 3 passos e estará pronto em minutos</p>
            </div>
          </div>
          <div style={{ padding: '0 8px 8px' }}>
            {[
              { n: 1, icon: Users, color: '#3B82F6', bg: '#EFF6FF', title: 'Convide seu primeiro aluno', desc: 'Gere um link — o aluno cria a conta pelo celular', cta: 'Ir para Alunos', to: '/dashboard/alunos' },
              { n: 2, icon: Dumbbell, color: '#8B5CF6', bg: '#F5F3FF', title: 'Monte o treino dele', desc: 'Crie um plano com exercícios, séries e carga', cta: 'Criar treino', to: '/dashboard/treinos' },
              { n: 3, icon: Calendar, color: '#10B981', bg: '#ECFDF5', title: 'Agende a primeira aula', desc: 'Confirme o horário e envie lembrete automático', cta: 'Ver agenda', to: '/dashboard/agenda' },
            ].map((s, idx) => {
              const Icon = s.icon;
              return (
                <div key={s.n} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', borderBottom: idx < 2 ? '1px solid #F3F4F6' : 'none' }}>
                  <div style={{ width: 42, height: 42, borderRadius: 12, background: s.bg, border: `1.5px solid ${s.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Icon size={19} color={s.color} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                      <span style={{ fontSize: 10, fontWeight: 800, color: s.color, background: s.bg, padding: '1px 7px', borderRadius: 20 }}>Passo {s.n}</span>
                    </div>
                    <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#111827' }}>{s.title}</p>
                    <p style={{ margin: '1px 0 0', fontSize: 12, color: '#6B7280', lineHeight: 1.4 }}>{s.desc}</p>
                  </div>
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

      {/* ── KPIs ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
        {[
          {
            label: 'Alunos ativos', value: activeStudents.length,
            sub: <TrendBadge current={activeStudents.length} previous={activeLastMonth || activeStudents.length - 2} />,
            color: 'var(--accent)', bg: 'var(--accent-bg)', icon: Users, to: '/dashboard/alunos',
            badge: atRiskCount > 0 ? { text: `${atRiskCount} em risco`, color: 'var(--yellow)' } : null,
          },
          {
            label: 'Receita no mês', value: `R$ ${revenue.toLocaleString('pt-BR')}`,
            sub: <TrendBadge current={revenue} previous={lastMonthRevenue} />,
            color: 'var(--green)', bg: '#ECFDF5', icon: DollarSign, to: '/dashboard/financeiro',
          },
          {
            label: 'Aulas esta semana', value: weekSessions,
            sub: <span style={{ fontSize: 11, color: 'var(--gray-400)' }}>sessões registradas</span>,
            color: '#8B5CF6', bg: '#F5F3FF', icon: Activity, to: '/dashboard/frequencia',
          },
          {
            label: 'Aulas hoje', value: todayAppts.length,
            sub: pendingToday > 0
              ? <span style={{ fontSize: 11, color: 'var(--yellow)', fontWeight: 700 }}>{pendingToday} pendente{pendingToday > 1 ? 's' : ''}</span>
              : <span style={{ fontSize: 11, color: 'var(--green)', fontWeight: 700 }}>em dia ✓</span>,
            color: 'var(--yellow)', bg: '#FFFBEB', icon: Calendar, to: '/dashboard/agenda',
            badge: latePayCount > 0 ? { text: `${latePayCount} pgto atrasado`, color: 'var(--red)' } : null,
          },
        ].map(s => (
          <div key={s.label} onClick={() => navigate(s.to)}
            style={{ background: 'white', borderRadius: 16, padding: '16px 18px', boxShadow: 'var(--shadow-sm)', cursor: 'pointer', border: '1px solid var(--border)', transition: 'all 0.15s', position: 'relative', overflow: 'hidden' }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = 'var(--shadow-md)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'var(--shadow-sm)'; }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <s.icon size={18} color={s.color} />
              </div>
              {s.badge && (
                <span style={{ fontSize: 10, fontWeight: 700, color: s.badge.color, background: s.badge.color === 'var(--red)' ? '#FEE2E2' : '#FEF3C7', padding: '2px 7px', borderRadius: 20, whiteSpace: 'nowrap' }}>
                  {s.badge.text}
                </span>
              )}
            </div>
            <p style={{ margin: '0 0 3px', fontSize: 22, fontWeight: 900, color: 'var(--gray-900)', lineHeight: 1 }}>{s.value}</p>
            <p style={{ margin: '0 0 4px', fontSize: 11, color: 'var(--gray-400)', fontWeight: 500 }}>{s.label}</p>
            {s.sub}
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, background: s.color, opacity: 0.15, borderRadius: '0 0 16px 16px' }} />
          </div>
        ))}
      </div>

      {/* ── Métricas de negócio ── */}
      {students.length > 0 && monthlyRevenue.length > 0 && (() => {
        const maxRev = Math.max(...monthlyRevenue.map(m => m.amount), 1);
        const ticketMedio = activeStudents.length > 0 ? Math.round(revenue / activeStudents.length) : 0;
        const retencao = students.length > 0 ? Math.round((activeStudents.length / students.length) * 100) : 0;
        const MONTHS_PT = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
        return (
          <div style={{ background: 'white', borderRadius: 16, padding: '16px 20px', marginBottom: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.07)', border: '1px solid #F1F5F9' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <h3 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: '#111827' }}>Visão de negócio</h3>
              <div style={{ display: 'flex', gap: 12 }}>
                {[
                  { label: 'Ticket médio', value: `R$ ${ticketMedio.toLocaleString('pt-BR')}`, color: '#10B981' },
                  { label: 'Retenção', value: `${retencao}%`, color: retencao >= 80 ? '#10B981' : retencao >= 60 ? '#F59E0B' : '#EF4444' },
                  { label: 'A receber', value: `R$ ${totalPending.toLocaleString('pt-BR')}`, color: totalPending > 0 ? '#F59E0B' : '#10B981' },
                ].map(m => (
                  <div key={m.label} style={{ textAlign: 'right' }}>
                    <p style={{ margin: 0, fontSize: 14, fontWeight: 900, color: m.color }}>{m.value}</p>
                    <p style={{ margin: 0, fontSize: 10, color: '#9CA3AF', fontWeight: 600 }}>{m.label}</p>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 5, height: 60 }}>
              {monthlyRevenue.map((m, i) => {
                const pct = maxRev > 0 ? (m.amount / maxRev) * 100 : 0;
                const isCurrent = i === monthlyRevenue.length - 1;
                const monthName = MONTHS_PT[parseInt(m.month.slice(5, 7)) - 1];
                return (
                  <div key={m.month} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, height: '100%', justifyContent: 'flex-end' }}>
                    <div title={`R$ ${m.amount.toLocaleString('pt-BR')}`}
                      style={{ width: '100%', borderRadius: '5px 5px 0 0', background: isCurrent ? 'linear-gradient(180deg,#3B82F6,#6366F1)' : '#E5E7EB', height: `${Math.max(pct, 4)}%`, minHeight: 4, transition: 'height 0.4s ease', cursor: 'default', position: 'relative' }}>
                      {isCurrent && m.amount > 0 && (
                        <div style={{ position: 'absolute', top: -18, left: '50%', transform: 'translateX(-50%)', fontSize: 9, fontWeight: 800, color: '#3B82F6', whiteSpace: 'nowrap' }}>
                          {m.amount >= 1000 ? `${(m.amount/1000).toFixed(1)}k` : m.amount}
                        </div>
                      )}
                    </div>
                    <span style={{ fontSize: 9, color: isCurrent ? '#3B82F6' : '#9CA3AF', fontWeight: isCurrent ? 800 : 600 }}>{monthName}</span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* ── Quick actions ── */}
      {students.length > 0 && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
          {[
            { label: '+ Nova aula', to: '/dashboard/agenda', color: '#3B82F6', bg: '#EFF6FF' },
            { label: '+ Aluno', to: '/dashboard/alunos', color: '#10B981', bg: '#ECFDF5' },
            { label: '+ Treino', to: '/dashboard/treinos', color: '#8B5CF6', bg: '#F5F3FF' },
            { label: 'Financeiro', to: '/dashboard/financeiro', color: '#F59E0B', bg: '#FFFBEB' },
          ].map(a => (
            <button key={a.to} onClick={() => navigate(a.to)}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 20, border: `1.5px solid ${a.color}30`, background: a.bg, color: a.color, fontSize: 13, fontWeight: 700, cursor: 'pointer', transition: 'all 0.12s' }}
              onMouseEnter={e => { e.currentTarget.style.background = a.color + '25'; }}
              onMouseLeave={e => { e.currentTarget.style.background = a.bg; }}>
              {a.label}
            </button>
          ))}
        </div>
      )}

      {/* ── Main grid ── */}
      <div className="dashboard-main-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

        {/* Agenda de hoje */}
        <div style={{ background: 'white', borderRadius: 16, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.07)', border: '1px solid #F1F5F9' }}>
          <div style={{ padding: '16px 20px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #F3F4F6' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: '#111827' }}>Agenda de Hoje</h3>
              <p style={{ margin: '1px 0 0', fontSize: 11, color: '#9CA3AF', textTransform: 'capitalize' }}>
                {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'short' })}
                {todayAppts.length > 0 && ` · ${todayAppts.length} aula${todayAppts.length > 1 ? 's' : ''}`}
              </p>
            </div>
            <button onClick={() => navigate('/dashboard/agenda')}
              style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#3B82F6', background: '#EFF6FF', border: 'none', borderRadius: 20, padding: '5px 12px', cursor: 'pointer', fontWeight: 700 }}>
              Ver tudo <ChevronRight size={12} />
            </button>
          </div>

          <div style={{ padding: '12px 20px 16px' }}>
            {todayAppts.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '28px 0' }}>
                <div style={{ width: 52, height: 52, borderRadius: 16, background: '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                  <Calendar size={24} color="#D1D5DB" />
                </div>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#6B7280' }}>Dia livre hoje</p>
                <p style={{ margin: '4px 0 10px', fontSize: 12, color: '#9CA3AF' }}>Aproveite para planejar a semana</p>
                <button onClick={() => navigate('/dashboard/agenda')}
                  style={{ padding: '8px 18px', background: '#EFF6FF', border: 'none', borderRadius: 20, color: '#3B82F6', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                  + Agendar aula
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {todayAppts.map(appt => {
                  const student = students.find(s => String(s.id) === String(appt.student_id));
                  const isDone = appt.status === 'done';
                  const isCancelled = appt.status === 'cancelled';
                  const loading = markingDone === appt.id;
                  const accentColor = appt.color || '#3B82F6';
                  return (
                    <div key={appt.id} style={{
                      display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 12,
                      background: isDone ? '#F0FDF4' : isCancelled ? '#FEF2F2' : '#F9FAFB',
                      border: `1px solid ${isDone ? '#BBF7D0' : isCancelled ? '#FECACA' : '#F1F5F9'}`,
                      opacity: isCancelled ? 0.7 : 1,
                    }}>
                      <div style={{ width: 4, height: 40, borderRadius: 3, background: isCancelled ? '#EF4444' : isDone ? '#10B981' : accentColor, flexShrink: 0 }} />
                      <div style={{ width: 34, height: 34, borderRadius: '50%', background: student?.color || '#6B7280', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, color: 'white', flexShrink: 0 }}>
                        {(student?.initials || appt.student_name?.slice(0, 2) || 'AL').toUpperCase()}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {appt.student_name || appt.studentName}
                        </p>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontSize: 11, fontWeight: 700, color: '#374151' }}>{(appt.time || '').slice(0, 5)}</span>
                          <span style={{ fontSize: 10, color: accentColor, fontWeight: 600, background: accentColor + '15', padding: '1px 6px', borderRadius: 10 }}>{appt.type}</span>
                        </div>
                      </div>
                      {isDone ? (
                        <span style={{ fontSize: 11, fontWeight: 700, color: '#10B981', display: 'flex', alignItems: 'center', gap: 3, flexShrink: 0, background: '#D1FAE5', padding: '3px 8px', borderRadius: 20 }}>
                          <Check size={11} /> Feita
                        </span>
                      ) : isCancelled ? (
                        <span style={{ fontSize: 11, fontWeight: 700, color: '#EF4444', flexShrink: 0 }}>Cancelada</span>
                      ) : (
                        <div style={{ display: 'flex', gap: 5, flexShrink: 0 }}>
                          {student?.phone && (
                            <button onClick={() => handleWhatsApp(appt)}
                              style={{ width: 32, height: 32, borderRadius: 9, background: '#F0FDF4', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                              title="Enviar lembrete WhatsApp">
                              <MessageCircle size={14} color="#25D366" />
                            </button>
                          )}
                          <button onClick={() => handleMarkDone(appt)} disabled={loading}
                            style={{ width: 32, height: 32, borderRadius: 9, background: '#ECFDF5', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: loading ? 0.6 : 1 }}
                            title="Marcar como concluída">
                            <Check size={14} color="#10B981" />
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
                <p style={{ margin: '0 0 8px', fontSize: 10, fontWeight: 800, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Amanhã — {tomorrowAppts.length} aula{tomorrowAppts.length > 1 ? 's' : ''}
                </p>
                <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                  {tomorrowAppts.map(appt => (
                    <span key={appt.id} style={{ fontSize: 11, padding: '4px 10px', borderRadius: 20, background: `${appt.color || '#3B82F6'}12`, color: appt.color || '#3B82F6', fontWeight: 700, border: `1px solid ${appt.color || '#3B82F6'}25` }}>
                      {(appt.time || '').slice(0, 5)} · {(appt.student_name || '').split(' ')[0]}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Alunos */}
        <div style={{ background: 'white', borderRadius: 16, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.07)', border: '1px solid #F1F5F9' }}>
          <div style={{ padding: '16px 20px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #F3F4F6' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: '#111827' }}>Alunos</h3>
              <p style={{ margin: '1px 0 0', fontSize: 11, color: '#9CA3AF' }}>
                {activeStudents.length} ativo{activeStudents.length !== 1 ? 's' : ''} · {students.filter(s => s.status === 'pendente').length} pendente{students.filter(s => s.status === 'pendente').length !== 1 ? 's' : ''}
              </p>
            </div>
            <button onClick={() => navigate('/dashboard/alunos')}
              style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#3B82F6', background: '#EFF6FF', border: 'none', borderRadius: 20, padding: '5px 12px', cursor: 'pointer', fontWeight: 700 }}>
              Ver todos <ChevronRight size={12} />
            </button>
          </div>

          <div style={{ padding: '12px 20px' }}>
            {students.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '28px 0' }}>
                <div style={{ width: 52, height: 52, borderRadius: 16, background: '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                  <Users size={24} color="#D1D5DB" />
                </div>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#6B7280' }}>Nenhum aluno ainda</p>
                <button onClick={() => navigate('/dashboard/alunos')}
                  style={{ marginTop: 10, padding: '8px 18px', background: '#ECFDF5', border: 'none', borderRadius: 20, color: '#10B981', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                  + Cadastrar aluno
                </button>
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {students.slice(0, 7).map(student => {
                    const isAtRisk = alerts.some(a => a.student?.id === student.id && a.type === 'inactive');
                    const hasLatePayment = alerts.some(a => a.student?.id === student.id && a.type === 'payment');
                    return (
                      <div key={student.id}
                        style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 10, cursor: 'pointer', transition: 'background 0.12s' }}
                        onClick={() => navigate(`/dashboard/alunos/${student.id}`)}
                        onMouseEnter={e => e.currentTarget.style.background = '#F9FAFB'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                        <div style={{ width: 34, height: 34, borderRadius: '50%', background: student.color || '#6B7280', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, color: 'white', flexShrink: 0, position: 'relative' }}>
                          {(student.initials || student.name?.slice(0, 2)).toUpperCase()}
                          {(isAtRisk || hasLatePayment) && (
                            <div style={{ position: 'absolute', top: -2, right: -2, width: 10, height: 10, borderRadius: '50%', background: hasLatePayment ? '#EF4444' : '#F59E0B', border: '2px solid white' }} />
                          )}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{student.name}</p>
                          <p style={{ margin: 0, fontSize: 11, color: isAtRisk ? '#D97706' : hasLatePayment ? '#DC2626' : '#9CA3AF' }}>
                            {isAtRisk ? '⚠ sem treino há 7+ dias' : hasLatePayment ? '● pgto atrasado' : student.plan || 'Mensal'}
                          </p>
                        </div>
                        <Badge status={student.status} />
                      </div>
                    );
                  })}
                  {students.length > 7 && (
                    <button onClick={() => navigate('/dashboard/alunos')}
                      style={{ marginTop: 4, padding: '8px', background: 'none', border: '1.5px dashed #E5E7EB', borderRadius: 10, color: '#9CA3AF', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                      + {students.length - 7} alunos
                    </button>
                  )}
                </div>

                <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid #F3F4F6', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                  {[
                    { v: activeStudents.length, l: 'Ativos', c: '#10B981', bg: '#F0FDF4' },
                    { v: students.filter(s => s.status === 'pendente').length, l: 'Pendentes', c: '#D97706', bg: '#FEF3C7' },
                    { v: students.filter(s => s.status === 'inativo').length, l: 'Inativos', c: '#6B7280', bg: '#F3F4F6' },
                  ].map(item => (
                    <div key={item.l} style={{ textAlign: 'center', padding: '8px 4px', background: item.bg, borderRadius: 10 }}>
                      <p style={{ margin: 0, fontSize: 18, fontWeight: 900, color: item.c }}>{item.v}</p>
                      <p style={{ margin: 0, fontSize: 10, color: '#6B7280', fontWeight: 600 }}>{item.l}</p>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Alertas / Insights ── */}
      {alerts.length > 0 && (
        <div style={{ marginTop: 16, background: 'white', borderRadius: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.07)', border: '1px solid #F1F5F9', overflow: 'hidden' }}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid #F3F4F6', display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 9, background: '#FEF3C7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <AlertTriangle size={16} color="#D97706" />
            </div>
            <div style={{ flex: 1 }}>
              <h3 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: '#111827' }}>Atenção necessária</h3>
              <p style={{ margin: 0, fontSize: 12, color: '#9CA3AF' }}>
                {atRiskCount > 0 && `${atRiskCount} aluno${atRiskCount > 1 ? 's' : ''} sem treino`}
                {atRiskCount > 0 && latePayCount > 0 && ' · '}
                {latePayCount > 0 && `${latePayCount} pagamento${latePayCount > 1 ? 's' : ''} atrasado${latePayCount > 1 ? 's' : ''}`}
              </p>
            </div>
            <span style={{ background: '#FEF3C7', color: '#D97706', fontSize: 12, fontWeight: 800, padding: '3px 10px', borderRadius: 20 }}>{alerts.length}</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {alerts.map((alert, i) => {
              const st = alert.student;
              return (
                <div key={`${alert.type}-${st.id}`}
                  style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 20px', borderBottom: i < alerts.length - 1 ? '1px solid #F9FAFB' : 'none', cursor: 'pointer', transition: 'background 0.12s' }}
                  onClick={() => navigate(`/dashboard/alunos/${st.id}`)}
                  onMouseEnter={e => e.currentTarget.style.background = '#F9FAFB'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <div style={{ width: 38, height: 38, borderRadius: '50%', background: st.color || '#6B7280', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, color: 'white', flexShrink: 0 }}>
                    {(st.initials || st.name?.slice(0, 2)).toUpperCase()}
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#111827' }}>{st.name}</p>
                    <p style={{ margin: 0, fontSize: 12, color: alert.type === 'payment' ? '#DC2626' : '#D97706', fontWeight: 600 }}>{alert.message}</p>
                  </div>
                  {alert.type === 'inactive' && (
                    <button onClick={e => handleNotifyInactive(e, st)} disabled={!!notifyingId || notifiedIds.has(st.id)}
                      style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 14px', borderRadius: 20, border: 'none', cursor: notifiedIds.has(st.id) ? 'default' : 'pointer', background: notifiedIds.has(st.id) ? '#D1FAE5' : '#EFF6FF', color: notifiedIds.has(st.id) ? '#059669' : '#3B82F6', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
                      {notifyingId === st.id ? <Bell size={13} style={{ animation: 'spin 1s linear infinite' }} /> : notifiedIds.has(st.id) ? <CheckCircle size={13} /> : <Bell size={13} />}
                      {notifiedIds.has(st.id) ? 'Enviado' : 'Notificar'}
                    </button>
                  )}
                  <div style={{ width: 30, height: 30, borderRadius: 9, background: alert.type === 'payment' ? '#FEE2E2' : '#FEF3C7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {alert.type === 'payment' ? <DollarSign size={14} color="#DC2626" /> : <AlertTriangle size={14} color="#D97706" />}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
