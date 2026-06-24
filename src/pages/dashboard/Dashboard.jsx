import { useState, useEffect } from 'react';
import { Users, Calendar, DollarSign, Check, MessageCircle, ChevronRight, Clock, Zap, AlertTriangle, TrendingUp, Bell, CheckCircle, Dumbbell, ArrowUp, ArrowDown, Activity } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Avatar from '../../components/UI/Avatar';
import Badge from '../../components/UI/Badge';
import { useAuth } from '../../context/AuthContext';
import { supabase, hasSupabase } from '../../lib/supabase';
// mockData removed

const TODAY         = new Date().toISOString().slice(0, 10);
const TOMORROW      = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
const MONTH_START   = `${TODAY.slice(0, 7)}-01`;
const LAST_MONTH_START = (() => { const d = new Date(TODAY); d.setMonth(d.getMonth()-1); d.setDate(1); return d.toISOString().slice(0,10); })();
const LAST_MONTH_END   = (() => { const d = new Date(TODAY); d.setDate(0); return d.toISOString().slice(0,10); })();
const SIX_MONTHS_AGO  = (() => { const d = new Date(TODAY); d.setMonth(d.getMonth()-5); d.setDate(1); return d.toISOString().slice(0,10); })();
const MONTHS_PT = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Bom dia'; if (h < 18) return 'Boa tarde'; return 'Boa noite';
}

function TrendBadge({ current, previous }) {
  if (!previous || previous === 0) return null;
  const diff = current - previous;
  const pct  = Math.round(Math.abs(diff / previous) * 100);
  if (pct === 0) return <span style={{ fontSize: 11, color: 'var(--gray-400)', fontWeight: 600 }}>= igual</span>;
  const up = diff > 0;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2, fontSize: 11, fontWeight: 700, color: up ? 'var(--green)' : 'var(--red)' }}>
      {up ? <ArrowUp size={10} /> : <ArrowDown size={10} />} {pct}% vs mês ant.
    </span>
  );
}

export default function Dashboard() {
  const { user }    = useAuth();
  const navigate    = useNavigate();
  const [students, setStudents]             = useState([]);
  const [todayAppts, setTodayAppts]         = useState([]);
  const [tomorrowAppts, setTomorrowAppts]   = useState([]);
  const [revenue, setRevenue]               = useState(0);
  const [lastMonthRevenue, setLastMonthRevenue] = useState(0);
  const [weekSessions, setWeekSessions]     = useState(0);
  const [markingDone, setMarkingDone]       = useState(null);
  const [alerts, setAlerts]                 = useState([]);
  const [notifyingId, setNotifyingId]       = useState(null);
  const [notifiedIds, setNotifiedIds]       = useState(new Set());
  const [activeLastMonth, setActiveLastMonth] = useState(0);
  const [monthlyRevenue, setMonthlyRevenue] = useState([]);
  const [totalPending, setTotalPending]     = useState(0);

  useEffect(() => {
    if (!localStorage.getItem('pt_onboarded')) navigate('/onboarding', { replace: true });
  }, []);

  useEffect(() => {
    if (!user) return;
    if (hasSupabase) {
      const sevenDaysAgo = new Date(Date.now() - 7*86400000).toISOString().slice(0,10);
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
      ]).then(([{data:stds},{data:appts},{data:pays},{data:wk},{data:sts},{data:sessions},{data:latePayments},{data:sixMoPays},{data:pendingPays}]) => {
        setStudents(stds || []);
        const all = appts || [];
        setTodayAppts(all.filter(a => a.date === TODAY).sort((a,b) => a.time.localeCompare(b.time)));
        setTomorrowAppts(all.filter(a => a.date === TOMORROW).sort((a,b) => a.time.localeCompare(b.time)));

        const allPays = pays || [];
        const thisRev = allPays.filter(p => (p.paid_at||'').startsWith(TODAY.slice(0,7))).reduce((s,p)=>s+Number(p.amount),0);
        const lastRev = allPays.filter(p => { const d=p.paid_at||''; return d>=LAST_MONTH_START&&d<=LAST_MONTH_END; }).reduce((s,p)=>s+Number(p.amount),0);
        setRevenue(thisRev || allPays.reduce((s,p)=>s+Number(p.amount),0));
        setLastMonthRevenue(lastRev);
        setWeekSessions((wk||[]).length);

        const builtAlerts = [];
        const trainedIds  = new Set((sessions||[]).map(s=>String(s.student_id)));
        const latePaySet  = new Set((latePayments||[]).map(p=>String(p.student_id)));
        (sts||[]).forEach(st => {
          if (!trainedIds.has(String(st.id))) builtAlerts.push({ type:'inactive', student:st, message:'Sem treino há mais de 7 dias' });
          if (latePaySet.has(String(st.id)))  builtAlerts.push({ type:'payment',  student:st, message:'Pagamento em atraso' });
        });
        setAlerts(builtAlerts.slice(0,5));

        const byMonth = {};
        for (let i=5;i>=0;i--) { const d=new Date(TODAY); d.setMonth(d.getMonth()-i); d.setDate(1); byMonth[d.toISOString().slice(0,7)]=0; }
        (sixMoPays||[]).forEach(p => { const k=(p.paid_at||'').slice(0,7); if (k in byMonth) byMonth[k]+=Number(p.amount); });
        setMonthlyRevenue(Object.entries(byMonth).map(([month,amount])=>({month,amount})));
        setTotalPending((pendingPays||[]).reduce((s,p)=>s+Number(p.amount),0));
      });
    } else {
      setStudents([]);
      setTodayAppts([]);
      setRevenue(4280); setLastMonthRevenue(3820); setWeekSessions(12);
    }
  }, [user?.id]);

  const handleMarkDone = async (appt) => {
    setMarkingDone(appt.id);
    if (hasSupabase) {
      await supabase.from('appointments').update({ status:'done' }).eq('id', appt.id);
      await supabase.from('attendances').upsert({ personal_id:user.id, student_id:appt.student_id, appointment_id:appt.id, date:appt.date, status:'present' }, { onConflict:'student_id,date' });
    }
    setTodayAppts(prev => prev.map(a => a.id===appt.id ? {...a, status:'done'} : a));
    setMarkingDone(null);
  };

  const handleWhatsApp = (appt) => {
    const student = students.find(s => String(s.id)===String(appt.student_id));
    if (!student?.phone) return;
    const phone = student.phone.replace(/\D/g,'');
    const full  = phone.startsWith('55') ? phone : `55${phone}`;
    const msg   = `Olá ${(appt.student_name||'').split(' ')[0]}! Lembrando da sua aula de ${appt.type} hoje às ${appt.time}. Te vejo lá! 💪`;
    window.open(`https://wa.me/${full}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const handleNotifyInactive = async (e, student) => {
    e.stopPropagation();
    setNotifyingId(student.id);
    try {
      await supabase.functions.invoke('send-push', {
        body: { student_ids:[student.id], title:'Sentimos sua falta! 💪', message:'Seu personal está esperando você. Que tal retomar os treinos hoje?', personal_id:user.id, url:'/aluno/dashboard' },
      });
      setNotifiedIds(prev => new Set([...prev, student.id]));
    } catch {}
    setNotifyingId(null);
  };

  const activeStudents = students.filter(s => s.status === 'ativo');
  const pendingToday   = todayAppts.filter(a => a.status !== 'done' && a.status !== 'cancelled').length;
  const doneToday      = todayAppts.filter(a => a.status === 'done').length;
  const firstName      = user?.name?.split(' ')[0] || 'Personal';
  const dateLabel      = new Date().toLocaleDateString('pt-BR', { weekday:'long', day:'numeric', month:'long' });
  const atRiskCount    = alerts.filter(a => a.type === 'inactive').length;
  const latePayCount   = alerts.filter(a => a.type === 'payment').length;
  const ticketMedio    = activeStudents.length > 0 ? Math.round(revenue / activeStudents.length) : 0;
  const retencao       = students.length > 0 ? Math.round((activeStudents.length / students.length) * 100) : 0;
  const maxRev         = Math.max(...monthlyRevenue.map(m => m.amount), 1);

  return (
    <div className="page-padding" style={{ flex: 1 }}>

      {/* ── Page header ── */}
      <div className="page-header">
        <div>
          <h2 className="page-title">{greeting()}, {firstName}!</h2>
          <p className="page-subtitle" style={{ textTransform: 'capitalize' }}>{dateLabel}</p>
        </div>
        <div className="page-actions">
          {pendingToday > 0 && (
            <span className="badge badge-yellow">
              <Clock size={11} style={{ marginRight: 4 }} />
              {pendingToday} aula{pendingToday > 1 ? 's' : ''} pendente{pendingToday > 1 ? 's' : ''}
            </span>
          )}
          {doneToday > 0 && (
            <span className="badge badge-green">
              <Check size={11} style={{ marginRight: 4 }} />
              {doneToday} concluída{doneToday > 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>

      {/* ── Primeiros passos ── */}
      {students.length === 0 && (
        <div className="card card-0" style={{ marginBottom: 24 }}>
          <div style={{ background: 'var(--brand-gradient)', padding: '20px 24px', display:'flex', alignItems:'center', gap:14 }}>
            <div className="icon-box icon-box-md" style={{ background:'rgba(255,255,255,0.2)', borderRadius: 12 }}>
              <Zap size={22} color="white" fill="white" />
            </div>
            <div>
              <h3 style={{ margin:0, fontSize:18, fontWeight:900, color:'white' }}>Por onde começar?</h3>
              <p style={{ margin:0, fontSize:13, color:'rgba(255,255,255,0.75)' }}>Siga esses 3 passos e estará pronto em minutos</p>
            </div>
          </div>
          {[
            { n:1, icon:Users,    label:'accent',  title:'Convide seu primeiro aluno',  desc:'Gere um link — o aluno cria a conta pelo celular',       cta:'Ir para Alunos', to:'/dashboard/alunos' },
            { n:2, icon:Dumbbell, label:'purple',  title:'Monte o treino dele',         desc:'Crie um plano com exercícios, séries e carga',            cta:'Criar treino',   to:'/dashboard/treinos' },
            { n:3, icon:Calendar, label:'green',   title:'Agende a primeira aula',      desc:'Confirme o horário e envie lembrete automático',          cta:'Ver agenda',     to:'/dashboard/agenda' },
          ].map((s, idx) => (
            <div key={s.n} className="list-row" style={{ padding:'16px 20px', borderBottom: idx < 2 ? '1px solid var(--border-light)' : 'none' }}>
              <div className={`icon-box icon-box-md icon-box-${s.label}`} style={{ borderRadius: 12 }}>
                <s.icon size={19} />
              </div>
              <div className="list-row-body">
                <span style={{ fontSize:10, fontWeight:800, color:'var(--accent)', background:'var(--accent-bg)', padding:'1px 7px', borderRadius:20, display:'inline-block', marginBottom:3 }}>Passo {s.n}</span>
                <p className="list-row-title">{s.title}</p>
                <p className="list-row-sub">{s.desc}</p>
              </div>
              <button onClick={() => navigate(s.to)} className="btn-secondary" style={{ fontSize:12, padding:'7px 14px', whiteSpace:'nowrap' }}>
                {s.cta} <ChevronRight size={12} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* ── KPIs ── */}
      <div className="kpi-grid">
        {[
          { label:'Alunos ativos',    value:activeStudents.length,                      sub:<TrendBadge current={activeStudents.length} previous={activeLastMonth||activeStudents.length-2} />, icon:Users,    iconClass:'icon-box-accent',  barColor:'var(--accent)',  to:'/dashboard/alunos',    badge: atRiskCount>0 ? {text:`${atRiskCount} em risco`, cls:'badge-yellow'} : null },
          { label:'Receita no mês',   value:`R$ ${revenue.toLocaleString('pt-BR')}`,    sub:<TrendBadge current={revenue} previous={lastMonthRevenue} />,                                       icon:DollarSign,iconClass:'icon-box-green',   barColor:'var(--green)',   to:'/dashboard/financeiro' },
          { label:'Aulas esta semana',value:weekSessions,                                sub:<span style={{fontSize:11,color:'var(--gray-400)'}}>sessões registradas</span>,                      icon:Activity, iconClass:'icon-box-purple', barColor:'#7C3AED',        to:'/dashboard/frequencia' },
          { label:'Aulas hoje',       value:todayAppts.length,                           sub: pendingToday>0 ? <span style={{fontSize:11,color:'var(--yellow)',fontWeight:700}}>{pendingToday} pendente{pendingToday>1?'s':''}</span> : <span style={{fontSize:11,color:'var(--green)',fontWeight:700}}>em dia ✓</span>, icon:Calendar, iconClass:'icon-box-yellow', barColor:'var(--yellow)', to:'/dashboard/agenda', badge: latePayCount>0 ? {text:`${latePayCount} pgto atrasado`, cls:'badge-red'} : null },
        ].map(s => (
          <div key={s.label} className="kpi-card" onClick={() => navigate(s.to)}>
            <div className="kpi-card-top">
              <div className={`icon-box icon-box-md ${s.iconClass}`}><s.icon size={18} /></div>
              {s.badge && <span className={`badge ${s.badge.cls}`}>{s.badge.text}</span>}
            </div>
            <p className="kpi-card-value">{s.value}</p>
            <p className="kpi-card-label">{s.label}</p>
            {s.sub}
            <div className="kpi-card-bar" style={{ background: s.barColor }} />
          </div>
        ))}
      </div>

      {/* ── Visão de negócio ── */}
      {students.length > 0 && monthlyRevenue.length > 0 && (
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="section-header" style={{ marginBottom: 14 }}>
            <div>
              <h3 className="section-title">Visão de negócio</h3>
            </div>
            <div style={{ display:'flex', gap:20 }}>
              {[
                { label:'Ticket médio', value:`R$ ${ticketMedio.toLocaleString('pt-BR')}`, color:'var(--green)' },
                { label:'Retenção',     value:`${retencao}%`, color: retencao>=80?'var(--green)':retencao>=60?'var(--yellow)':'var(--red)' },
                { label:'A receber',    value:`R$ ${totalPending.toLocaleString('pt-BR')}`, color: totalPending>0?'var(--yellow)':'var(--green)' },
              ].map(m => (
                <div key={m.label} style={{ textAlign:'right' }}>
                  <p style={{ margin:0, fontSize:15, fontWeight:900, color:m.color }}>{m.value}</p>
                  <p style={{ margin:0, fontSize:10, color:'var(--gray-400)', fontWeight:600 }}>{m.label}</p>
                </div>
              ))}
            </div>
          </div>
          <div style={{ display:'flex', alignItems:'flex-end', gap:5, height:64 }}>
            {monthlyRevenue.map((m, i) => {
              const pct      = maxRev > 0 ? (m.amount / maxRev) * 100 : 0;
              const isCurrent = i === monthlyRevenue.length - 1;
              const monthName = MONTHS_PT[parseInt(m.month.slice(5,7))-1];
              return (
                <div key={m.month} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:4, height:'100%', justifyContent:'flex-end' }}>
                  <div title={`R$ ${m.amount.toLocaleString('pt-BR')}`} style={{ width:'100%', borderRadius:'4px 4px 0 0', background: isCurrent?'var(--brand-gradient)':'var(--gray-200)', height:`${Math.max(pct,4)}%`, minHeight:4, transition:'height 0.4s ease', position:'relative' }}>
                    {isCurrent && m.amount > 0 && (
                      <div style={{ position:'absolute', top:-18, left:'50%', transform:'translateX(-50%)', fontSize:9, fontWeight:800, color:'var(--accent)', whiteSpace:'nowrap' }}>
                        {m.amount>=1000 ? `${(m.amount/1000).toFixed(1)}k` : m.amount}
                      </div>
                    )}
                  </div>
                  <span style={{ fontSize:9, color: isCurrent?'var(--accent)':'var(--gray-400)', fontWeight: isCurrent?800:500 }}>{monthName}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Quick actions ── */}
      {students.length > 0 && (
        <div className="filter-pills" style={{ marginBottom: 20 }}>
          {[
            { label:'+ Nova aula',   to:'/dashboard/agenda',     cls:'icon-box-blue'   },
            { label:'+ Aluno',       to:'/dashboard/alunos',     cls:'icon-box-green'  },
            { label:'+ Treino',      to:'/dashboard/treinos',    cls:'icon-box-purple' },
            { label:'Financeiro',    to:'/dashboard/financeiro', cls:'icon-box-yellow' },
          ].map(a => (
            <button key={a.to} onClick={() => navigate(a.to)} className="pill active" style={{ borderRadius: 8 }}>
              {a.label}
            </button>
          ))}
        </div>
      )}

      {/* ── Main grid ── */}
      <div className="dashboard-main-grid" style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>

        {/* Agenda de hoje */}
        <div className="card card-0">
          <div className="card-header">
            <div>
              <h3 className="section-title">Agenda de Hoje</h3>
              <p className="section-desc" style={{ textTransform:'capitalize' }}>
                {new Date().toLocaleDateString('pt-BR',{weekday:'long',day:'numeric',month:'short'})}
                {todayAppts.length > 0 && ` · ${todayAppts.length} aula${todayAppts.length>1?'s':''}`}
              </p>
            </div>
            <button onClick={() => navigate('/dashboard/agenda')} className="pill active" style={{ fontSize:12 }}>
              Ver tudo <ChevronRight size={12} />
            </button>
          </div>
          <div className="card-body">
            {todayAppts.length === 0 ? (
              <div className="empty-state" style={{ padding:'28px 0' }}>
                <div className="empty-state-icon"><Calendar size={24} /></div>
                <p className="empty-state-title">Dia livre hoje</p>
                <p className="empty-state-desc">Aproveite para planejar a semana</p>
                <button onClick={() => navigate('/dashboard/agenda')} className="btn-primary" style={{ marginTop:4 }}>
                  + Agendar aula
                </button>
              </div>
            ) : (
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {todayAppts.map(appt => {
                  const student   = students.find(s => String(s.id)===String(appt.student_id));
                  const isDone    = appt.status === 'done';
                  const isCancelled = appt.status === 'cancelled';
                  const loading   = markingDone === appt.id;
                  const accentColor = appt.color || 'var(--accent)';
                  return (
                    <div key={appt.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 12px', borderRadius:'var(--radius)', background: isDone?'#F0FDF4':isCancelled?'#FEF2F2':'var(--gray-50)', border:`1px solid ${isDone?'#BBF7D0':isCancelled?'#FECACA':'var(--border-light)'}`, opacity: isCancelled?0.7:1 }}>
                      <div style={{ width:3, height:36, borderRadius:3, background: isCancelled?'var(--red)':isDone?'var(--green)':accentColor, flexShrink:0 }} />
                      <div style={{ width:34, height:34, borderRadius:'50%', background:student?.color||'var(--gray-500)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:800, color:'white', flexShrink:0 }}>
                        {(student?.initials || appt.student_name?.slice(0,2) || 'AL').toUpperCase()}
                      </div>
                      <div className="list-row-body">
                        <p className="list-row-title">{appt.student_name || appt.studentName}</p>
                        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                          <span style={{ fontSize:11, fontWeight:700, color:'var(--gray-700)' }}>{(appt.time||'').slice(0,5)}</span>
                          <span style={{ fontSize:10, color:accentColor, fontWeight:600, background:accentColor+'18', padding:'1px 6px', borderRadius:10 }}>{appt.type}</span>
                        </div>
                      </div>
                      {isDone ? (
                        <span className="badge badge-green"><Check size={10} style={{marginRight:3}} />Feita</span>
                      ) : isCancelled ? (
                        <span className="badge badge-red">Cancelada</span>
                      ) : (
                        <div style={{ display:'flex', gap:5, flexShrink:0 }}>
                          {student?.phone && (
                            <button onClick={() => handleWhatsApp(appt)} className="header-icon-btn" title="Enviar lembrete WhatsApp">
                              <MessageCircle size={15} color="#25D366" />
                            </button>
                          )}
                          <button onClick={() => handleMarkDone(appt)} disabled={loading} className="header-icon-btn" style={{ background:'#ECFDF5' }} title="Marcar como concluída">
                            <Check size={15} color="var(--green)" />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {tomorrowAppts.length > 0 && (
              <div style={{ marginTop:14, paddingTop:12, borderTop:'1px solid var(--border-light)' }}>
                <p className="section-label" style={{ marginBottom:8 }}>Amanhã — {tomorrowAppts.length} aula{tomorrowAppts.length>1?'s':''}</p>
                <div style={{ display:'flex', gap:5, flexWrap:'wrap' }}>
                  {tomorrowAppts.map(appt => (
                    <span key={appt.id} style={{ fontSize:11, padding:'4px 10px', borderRadius:20, background:`${appt.color||'var(--accent)'}12`, color:appt.color||'var(--accent)', fontWeight:700, border:`1px solid ${appt.color||'var(--accent)'}25` }}>
                      {(appt.time||'').slice(0,5)} · {(appt.student_name||'').split(' ')[0]}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Alunos */}
        <div className="card card-0">
          <div className="card-header">
            <div>
              <h3 className="section-title">Alunos</h3>
              <p className="section-desc">
                {activeStudents.length} ativo{activeStudents.length!==1?'s':''} · {students.filter(s=>s.status==='pendente').length} pendente{students.filter(s=>s.status==='pendente').length!==1?'s':''}
              </p>
            </div>
            <button onClick={() => navigate('/dashboard/alunos')} className="pill active" style={{ fontSize:12 }}>
              Ver todos <ChevronRight size={12} />
            </button>
          </div>
          <div className="card-body">
            {students.length === 0 ? (
              <div className="empty-state" style={{ padding:'28px 0' }}>
                <div className="empty-state-icon"><Users size={24} /></div>
                <p className="empty-state-title">Nenhum aluno ainda</p>
                <button onClick={() => navigate('/dashboard/alunos')} className="btn-primary" style={{ marginTop:4 }}>+ Cadastrar aluno</button>
              </div>
            ) : (
              <>
                <div style={{ display:'flex', flexDirection:'column' }}>
                  {students.slice(0,7).map(student => {
                    const isAtRisk       = alerts.some(a=>a.student?.id===student.id&&a.type==='inactive');
                    const hasLatePayment = alerts.some(a=>a.student?.id===student.id&&a.type==='payment');
                    return (
                      <div key={student.id} className="list-row" style={{ cursor:'pointer', padding:'9px 0' }}
                        onClick={() => navigate(`/dashboard/alunos/${student.id}`)}>
                        <div style={{ width:34, height:34, borderRadius:'50%', background:student.color||'var(--gray-500)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:800, color:'white', flexShrink:0, position:'relative' }}>
                          {(student.initials||student.name?.slice(0,2)).toUpperCase()}
                          {(isAtRisk||hasLatePayment) && (
                            <div style={{ position:'absolute', top:-2, right:-2, width:9, height:9, borderRadius:'50%', background: hasLatePayment?'var(--red)':'var(--yellow)', border:'2px solid white' }} />
                          )}
                        </div>
                        <div className="list-row-body">
                          <p className="list-row-title">{student.name}</p>
                          <p className="list-row-sub" style={{ color: isAtRisk?'var(--yellow)':hasLatePayment?'var(--red)':'var(--gray-400)' }}>
                            {isAtRisk?'⚠ sem treino há 7+ dias':hasLatePayment?'● pgto atrasado':student.plan||'Mensal'}
                          </p>
                        </div>
                        <Badge status={student.status} />
                      </div>
                    );
                  })}
                  {students.length > 7 && (
                    <button onClick={() => navigate('/dashboard/alunos')} style={{ marginTop:8, padding:'9px', background:'none', border:'1.5px dashed var(--border)', borderRadius:'var(--radius-sm)', color:'var(--gray-400)', fontSize:12, fontWeight:700, cursor:'pointer' }}>
                      + {students.length-7} alunos
                    </button>
                  )}
                </div>

                <div style={{ marginTop:16, paddingTop:14, borderTop:'1px solid var(--border-light)', display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8 }}>
                  {[
                    { v:activeStudents.length,                          l:'Ativos',   cls:'icon-box-green'  },
                    { v:students.filter(s=>s.status==='pendente').length, l:'Pendentes', cls:'icon-box-yellow' },
                    { v:students.filter(s=>s.status==='inativo').length,  l:'Inativos',  cls:'icon-box-gray'   },
                  ].map(item => (
                    <div key={item.l} style={{ textAlign:'center', padding:'10px 4px', background:'var(--gray-50)', borderRadius:'var(--radius-sm)' }}>
                      <p style={{ margin:0, fontSize:20, fontWeight:900, color:'var(--gray-900)' }}>{item.v}</p>
                      <p style={{ margin:0, fontSize:10, color:'var(--gray-400)', fontWeight:600 }}>{item.l}</p>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Alertas ── */}
      {alerts.length > 0 && (
        <div className="card card-0" style={{ marginTop:16 }}>
          <div className="card-header">
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <div className="icon-box icon-box-sm icon-box-yellow"><AlertTriangle size={14} /></div>
              <div>
                <h3 className="section-title">Atenção necessária</h3>
                <p className="section-desc">
                  {atRiskCount>0&&`${atRiskCount} aluno${atRiskCount>1?'s':''} sem treino`}
                  {atRiskCount>0&&latePayCount>0&&' · '}
                  {latePayCount>0&&`${latePayCount} pagamento${latePayCount>1?'s':''} atrasado${latePayCount>1?'s':''}`}
                </p>
              </div>
            </div>
            <span className="badge badge-yellow">{alerts.length}</span>
          </div>
          {alerts.map((alert, i) => {
            const st = alert.student;
            return (
              <div key={`${alert.type}-${st.id}`} className="list-row" style={{ padding:'12px 20px', cursor:'pointer', borderBottom: i<alerts.length-1?'1px solid var(--border-light)':'none' }}
                onClick={() => navigate(`/dashboard/alunos/${st.id}`)}>
                <div style={{ width:38, height:38, borderRadius:'50%', background:st.color||'var(--gray-500)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:800, color:'white', flexShrink:0 }}>
                  {(st.initials||st.name?.slice(0,2)).toUpperCase()}
                </div>
                <div className="list-row-body">
                  <p className="list-row-title">{st.name}</p>
                  <p className="list-row-sub" style={{ color: alert.type==='payment'?'var(--red)':'var(--yellow)', fontWeight:600 }}>{alert.message}</p>
                </div>
                {alert.type === 'inactive' && (
                  <button onClick={e => handleNotifyInactive(e,st)} disabled={!!notifyingId||notifiedIds.has(st.id)}
                    className={notifiedIds.has(st.id)?'badge badge-green':'badge badge-blue'}
                    style={{ border:'none', cursor: notifiedIds.has(st.id)?'default':'pointer', padding:'5px 12px', fontSize:12 }}>
                    {notifyingId===st.id?<Bell size={12} style={{animation:'spin 1s linear infinite'}} />:notifiedIds.has(st.id)?<CheckCircle size={12} />:<Bell size={12} />}
                    <span style={{ marginLeft:4 }}>{notifiedIds.has(st.id)?'Enviado':'Notificar'}</span>
                  </button>
                )}
                <div className={`icon-box icon-box-sm ${alert.type==='payment'?'icon-box-red':'icon-box-yellow'}`}>
                  {alert.type==='payment'?<DollarSign size={13} />:<AlertTriangle size={13} />}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

