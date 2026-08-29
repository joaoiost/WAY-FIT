import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users, Calendar, DollarSign, Activity, ChevronRight, AlertTriangle,
  Bell, CheckCircle, ArrowUp, ArrowDown, Zap, Dumbbell,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { supabase, hasSupabase } from '../../lib/supabase';
import { toast } from '../../lib/toast';
import { todayLocal, toLocalDateStr } from '../../lib/date';

const TODAY = todayLocal();
const MONTH_START = `${TODAY.slice(0, 7)}-01`;
const LAST_MONTH_START = (() => { const d = new Date(); d.setMonth(d.getMonth() - 1); d.setDate(1); return toLocalDateStr(d); })();
const LAST_MONTH_END = (() => { const d = new Date(); d.setDate(0); return toLocalDateStr(d); })();
const SIX_MONTHS_AGO = (() => { const d = new Date(); d.setMonth(d.getMonth() - 5); d.setDate(1); return toLocalDateStr(d); })();
const MONTHS_PT = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Bom dia';
  if (h < 18) return 'Boa tarde';
  return 'Boa noite';
}

function TrendBadge({ current, previous }) {
  if (!previous) return null;
  const diff = current - previous;
  const pct = Math.round(Math.abs(diff / previous) * 100);
  if (pct === 0) return <span className="text-[11px] text-ink-400 font-medium">= igual ao mês anterior</span>;
  const up = diff > 0;
  return (
    <span className={`inline-flex items-center gap-0.5 text-[11px] font-semibold ${up ? 'text-success-500' : 'text-danger-500'}`}>
      {up ? <ArrowUp size={11} /> : <ArrowDown size={11} />} {pct}% vs mês anterior
    </span>
  );
}

function Avatar({ student, size = 34 }) {
  return (
    <div
      className="rounded-full flex items-center justify-center font-bold text-white shrink-0"
      style={{ width: size, height: size, fontSize: size * 0.32, background: student.color || '#64748B' }}
    >
      {(student.initials || student.name?.slice(0, 2) || '?').toUpperCase()}
    </div>
  );
}

export default function DashboardV2() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [students, setStudents] = useState([]);
  const [todayCount, setTodayCount] = useState(0);
  const [pendingToday, setPendingToday] = useState(0);
  const [revenue, setRevenue] = useState(0);
  const [lastMonthRevenue, setLastMonthRevenue] = useState(0);
  const [weekSessions, setWeekSessions] = useState(0);
  const [alerts, setAlerts] = useState([]);
  const [monthlyRevenue, setMonthlyRevenue] = useState([]);
  const [totalPending, setTotalPending] = useState(0);
  const [loading, setLoading] = useState(true);
  const [notifyingId, setNotifyingId] = useState(null);
  const [notifiedIds, setNotifiedIds] = useState(new Set());

  useEffect(() => {
    if (!user || !hasSupabase) { setLoading(false); return; }
    const sevenDaysAgo = toLocalDateStr(new Date(Date.now() - 7 * 86400000));

    Promise.all([
      supabase.from('students').select('*').eq('personal_id', user.id),
      supabase.from('appointments').select('*').eq('personal_id', user.id).eq('date', TODAY),
      supabase.from('payments').select('amount, paid_date').eq('personal_id', user.id).eq('status', 'pago'),
      supabase.from('workout_sessions').select('student_id, date').eq('personal_id', user.id).gte('date', sevenDaysAgo),
      supabase.from('payments').select('student_id, due_date, amount').eq('personal_id', user.id).eq('status', 'pendente').lt('due_date', TODAY),
      supabase.from('payments').select('amount, paid_date').eq('personal_id', user.id).eq('status', 'pago').gte('paid_date', SIX_MONTHS_AGO),
      supabase.from('payments').select('amount').eq('personal_id', user.id).eq('status', 'pendente'),
    ]).then(([{ data: stds }, { data: appts }, { data: pays }, { data: sessions }, { data: latePayments }, { data: sixMoPays }, { data: pendingPays }]) => {
      const allStudents = stds || [];
      setStudents(allStudents);

      const appointments = appts || [];
      setTodayCount(appointments.length);
      setPendingToday(appointments.filter(a => a.status !== 'done' && a.status !== 'cancelled').length);

      const allPays = pays || [];
      const thisRev = allPays.filter(p => (p.paid_date || '').startsWith(TODAY.slice(0, 7))).reduce((s, p) => s + Number(p.amount), 0);
      const lastRev = allPays.filter(p => { const d = p.paid_date || ''; return d >= LAST_MONTH_START && d <= LAST_MONTH_END; }).reduce((s, p) => s + Number(p.amount), 0);
      setRevenue(thisRev);
      setLastMonthRevenue(lastRev);
      setWeekSessions((sessions || []).length);

      const trainedIds = new Set((sessions || []).map(s => String(s.student_id)));
      const latePaySet = new Set((latePayments || []).map(p => String(p.student_id)));
      const activeStudents = allStudents.filter(s => s.status === 'ativo');
      const builtAlerts = [];
      activeStudents.forEach(st => {
        if (!trainedIds.has(String(st.id))) builtAlerts.push({ type: 'inactive', student: st, message: 'Sem treino há mais de 7 dias' });
        if (latePaySet.has(String(st.id))) builtAlerts.push({ type: 'payment', student: st, message: 'Pagamento em atraso' });
      });
      setAlerts(builtAlerts.slice(0, 5));

      const byMonth = {};
      for (let i = 5; i >= 0; i--) { const d = new Date(TODAY); d.setMonth(d.getMonth() - i); d.setDate(1); byMonth[d.toISOString().slice(0, 7)] = 0; }
      (sixMoPays || []).forEach(p => { const k = (p.paid_date || '').slice(0, 7); if (k in byMonth) byMonth[k] += Number(p.amount); });
      setMonthlyRevenue(Object.entries(byMonth).map(([month, amount]) => ({ month, amount })));
      setTotalPending((pendingPays || []).reduce((s, p) => s + Number(p.amount), 0));
      setLoading(false);
    });
  }, [user?.id]);

  const handleNotifyInactive = async (student) => {
    setNotifyingId(student.id);
    try {
      await supabase.functions.invoke('send-push', {
        body: { student_ids: [student.id], title: 'Sentimos sua falta', message: 'Seu personal está esperando você. Que tal retomar os treinos hoje?', personal_id: user.id, url: '/aluno/dashboard' },
      });
      setNotifiedIds(prev => new Set([...prev, student.id]));
    } catch {
      toast.error('Não foi possível enviar a notificação.');
    }
    setNotifyingId(null);
  };

  const activeStudents = students.filter(s => s.status === 'ativo');
  const atRiskCount = alerts.filter(a => a.type === 'inactive').length;
  const latePayCount = alerts.filter(a => a.type === 'payment').length;
  const firstName = user?.name?.split(' ')[0] || 'Personal';
  const dateLabel = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
  const maxRev = Math.max(...monthlyRevenue.map(m => m.amount), 1);

  if (loading) return <div className="py-24 text-center text-sm text-ink-400">Carregando...</div>;

  const kpis = [
    { label: 'Alunos ativos', value: activeStudents.length, icon: Users, color: '#4F46E5', to: '/dashboard/alunos', sub: atRiskCount > 0 ? `${atRiskCount} em risco` : null, subColor: 'text-warning-500' },
    { label: 'Receita no mês', value: `R$ ${revenue.toLocaleString('pt-BR')}`, icon: DollarSign, color: '#059669', to: '/dashboard/financeiro', trend: <TrendBadge current={revenue} previous={lastMonthRevenue} /> },
    { label: 'Aulas esta semana', value: weekSessions, icon: Activity, color: '#7C3AED', to: '/dashboard/frequencia', sub: 'sessões registradas', subColor: 'text-ink-400' },
    { label: 'Aulas hoje', value: todayCount, icon: Calendar, color: '#D97706', to: '/dashboard/frequencia', sub: pendingToday > 0 ? `${pendingToday} pendente${pendingToday > 1 ? 's' : ''}` : 'em dia ✓', subColor: pendingToday > 0 ? 'text-warning-500' : 'text-success-500' },
  ];

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-xl font-bold text-ink-900">{greeting()}, {firstName}!</h2>
        <p className="text-sm text-ink-500 mt-0.5 capitalize">{dateLabel}</p>
      </div>

      {students.length === 0 && (
        <div className="bg-white border border-ink-100 rounded-xl overflow-hidden">
          <div className="bg-brand-600 px-5 py-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
              <Zap size={20} className="text-white fill-white" />
            </div>
            <div>
              <p className="text-white font-bold text-[15px]">Por onde começar?</p>
              <p className="text-brand-100 text-[12.5px]">Siga esses passos e estará pronto em minutos.</p>
            </div>
          </div>
          {[
            { icon: Users, title: 'Convide seu primeiro aluno', desc: 'Gere um link — o aluno cria a conta pelo celular', cta: 'Ir para Alunos', to: '/dashboard/alunos' },
            { icon: Dumbbell, title: 'Monte o treino dele', desc: 'Crie um plano com exercícios, séries e carga', cta: 'Criar treino', to: '/v2/treinos' },
          ].map((s, i) => (
            <div key={s.title} className={`flex items-center gap-3 px-5 py-3.5 ${i === 0 ? 'border-b border-ink-100' : ''}`}>
              <div className="w-9 h-9 rounded-lg bg-brand-50 text-brand-600 flex items-center justify-center shrink-0"><s.icon size={17} /></div>
              <div className="flex-1 min-w-0">
                <p className="text-[13.5px] font-semibold text-ink-900">{s.title}</p>
                <p className="text-[12px] text-ink-500">{s.desc}</p>
              </div>
              <button onClick={() => navigate(s.to)} className="shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-lg border border-ink-200 text-[12px] font-semibold text-ink-700 hover:bg-ink-50">
                {s.cta} <ChevronRight size={12} />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {kpis.map(k => (
          <button
            key={k.label}
            onClick={() => navigate(k.to)}
            className="text-left bg-white border border-ink-100 rounded-xl p-4 hover:border-ink-200 transition-colors relative overflow-hidden"
          >
            <div className="absolute top-0 left-0 right-0 h-[3px]" style={{ background: k.color }} />
            <div className="flex items-center justify-between mb-2.5">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: k.color + '18', color: k.color }}>
                <k.icon size={16} />
              </div>
            </div>
            <p className="text-2xl font-extrabold text-ink-900 leading-none">{k.value}</p>
            <p className="text-[12px] text-ink-500 mt-1">{k.label}</p>
            {k.trend || (k.sub && <p className={`text-[11px] font-semibold mt-0.5 ${k.subColor}`}>{k.sub}</p>)}
          </button>
        ))}
      </div>

      {students.length > 0 && monthlyRevenue.length > 0 && (
        <div className="bg-white border border-ink-100 rounded-xl p-4">
          <div className="flex items-center justify-between mb-4">
            <p className="text-[13px] font-bold text-ink-900">Receita — últimos 6 meses</p>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-[13px] font-bold text-ink-900">R$ {totalPending.toLocaleString('pt-BR')}</p>
                <p className="text-[10px] text-ink-400 font-semibold">A receber</p>
              </div>
            </div>
          </div>
          <div className="flex items-end gap-2 h-20">
            {monthlyRevenue.map((m, i) => {
              const pct = Math.max((m.amount / maxRev) * 100, 3);
              const isCurrent = i === monthlyRevenue.length - 1;
              return (
                <div key={m.month} className="flex-1 flex flex-col items-center justify-end h-full gap-1.5">
                  <div
                    className={`w-full rounded-t-sm ${isCurrent ? 'bg-brand-600' : 'bg-ink-100'}`}
                    style={{ height: `${pct}%` }}
                    title={`R$ ${m.amount.toLocaleString('pt-BR')}`}
                  />
                  <span className={`text-[10px] font-semibold ${isCurrent ? 'text-brand-600' : 'text-ink-400'}`}>
                    {MONTHS_PT[parseInt(m.month.slice(5, 7)) - 1]}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="bg-white border border-ink-100 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-ink-100">
            <div>
              <p className="text-[13px] font-bold text-ink-900">Alunos</p>
              <p className="text-[11.5px] text-ink-500">{activeStudents.length} ativo{activeStudents.length !== 1 ? 's' : ''}</p>
            </div>
            <button onClick={() => navigate('/dashboard/alunos')} className="flex items-center gap-1 text-[12px] font-semibold text-brand-600 hover:text-brand-700">
              Ver todos <ChevronRight size={12} />
            </button>
          </div>
          {students.length === 0 ? (
            <div className="py-10 text-center">
              <p className="text-[13px] text-ink-500">Nenhum aluno ainda.</p>
            </div>
          ) : (
            <div className="px-4 py-1">
              {students.slice(0, 6).map(student => {
                const isAtRisk = alerts.some(a => a.student?.id === student.id && a.type === 'inactive');
                const hasLatePayment = alerts.some(a => a.student?.id === student.id && a.type === 'payment');
                return (
                  <button
                    key={student.id}
                    onClick={() => navigate(`/dashboard/alunos/${student.id}`)}
                    className="w-full flex items-center gap-2.5 py-2.5 border-b border-ink-50 last:border-0 text-left"
                  >
                    <Avatar student={student} />
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-semibold text-ink-900 truncate">{student.name}</p>
                      <p className={`text-[11.5px] ${isAtRisk ? 'text-warning-500' : hasLatePayment ? 'text-danger-500' : 'text-ink-400'}`}>
                        {isAtRisk ? 'sem treino há 7+ dias' : hasLatePayment ? 'pagamento atrasado' : (student.plan || 'Mensal')}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="bg-white border border-ink-100 rounded-xl overflow-hidden">
          <div className="flex items-center gap-2.5 px-4 py-3 border-b border-ink-100">
            <div className="w-7 h-7 rounded-lg bg-warning-50 text-warning-500 flex items-center justify-center shrink-0"><AlertTriangle size={14} /></div>
            <div>
              <p className="text-[13px] font-bold text-ink-900">Atenção necessária</p>
              <p className="text-[11.5px] text-ink-500">
                {atRiskCount > 0 && `${atRiskCount} sem treino`}
                {atRiskCount > 0 && latePayCount > 0 && ' · '}
                {latePayCount > 0 && `${latePayCount} pagamento${latePayCount > 1 ? 's' : ''} atrasado${latePayCount > 1 ? 's' : ''}`}
                {alerts.length === 0 && 'Tudo em dia'}
              </p>
            </div>
          </div>
          {alerts.length === 0 ? (
            <div className="py-10 text-center">
              <p className="text-[13px] text-ink-500">Nenhum alerta no momento.</p>
            </div>
          ) : (
            <div className="px-4 py-1">
              {alerts.map(alert => {
                const st = alert.student;
                return (
                  <div key={`${alert.type}-${st.id}`} className="flex items-center gap-2.5 py-2.5 border-b border-ink-50 last:border-0">
                    <button onClick={() => navigate(`/dashboard/alunos/${st.id}`)} className="flex items-center gap-2.5 flex-1 min-w-0 text-left">
                      <Avatar student={st} size={32} />
                      <div className="min-w-0">
                        <p className="text-[13px] font-semibold text-ink-900 truncate">{st.name}</p>
                        <p className={`text-[11px] font-medium ${alert.type === 'payment' ? 'text-danger-500' : 'text-warning-500'}`}>{alert.message}</p>
                      </div>
                    </button>
                    {alert.type === 'inactive' && (
                      <button
                        onClick={() => handleNotifyInactive(st)}
                        disabled={!!notifyingId || notifiedIds.has(st.id)}
                        className={`shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold ${
                          notifiedIds.has(st.id) ? 'bg-success-50 text-success-500' : 'bg-brand-50 text-brand-600 hover:bg-brand-100'
                        }`}
                      >
                        {notifiedIds.has(st.id) ? <CheckCircle size={11} /> : <Bell size={11} />}
                        {notifiedIds.has(st.id) ? 'Enviado' : 'Notificar'}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
