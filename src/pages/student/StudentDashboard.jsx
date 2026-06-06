import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Dumbbell, TrendingUp, Clock, Play, Loader, Bell, BellOff, ChevronRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { supabase, hasSupabase } from '../../lib/supabase';
import { trainingPlans, appointments } from '../../data/mockData';
import { isPushSupported, isPushSubscribed, subscribeToPush, unsubscribeFromPush } from '../../lib/pushNotifications';

const TYPE_COLORS = {
  Hipertrofia: '#8B5CF6', Funcional: '#10B981', Força: '#EF4444',
  Cardio: '#F59E0B', Resistência: '#3B82F6', Mobilidade: '#06B6D4',
};


export default function StudentDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [todayPlan, setTodayPlan] = useState(null);
  const [allPlans, setAllPlans] = useState([]);
  const [nextAppt, setNextAppt] = useState(null);
  const [personalName, setPersonalName] = useState('');
  const [attendanceRate, setAttendanceRate] = useState(null);
  const [pushState, setPushState] = useState('idle'); // 'idle' | 'subscribed' | 'subscribing' | 'unsupported'
  const [studentId, setStudentId] = useState(null);
  const [studentGoal, setStudentGoal] = useState('');

  const now = new Date();
  const todayDay = now.getDay();
  const todayStr = now.toISOString().slice(0, 10);
  const monthStart = `${todayStr.slice(0, 7)}-01`;

  useEffect(() => {
    if (!user) return;
    if (hasSupabase) {
      (async () => {
        const { data: student } = await supabase
          .from('students').select('id, personal_id, plan, goal').eq('user_id', user.id).maybeSingle();

        if (student) {
          setStudentId(student.id);
          setStudentGoal(student.goal || '');

          // Redirect to onboarding if never done
          if (!localStorage.getItem(`aluno_onboarded_${user.id}`)) {
            navigate('/aluno/onboarding', { replace: true });
            return;
          }
          const [{ data: plans }, { data: appts }, { data: profile }, { data: atts }] = await Promise.all([
            supabase.from('training_plans').select('*, exercises(*)').eq('student_id', student.id).order('created_at', { ascending: false }),
            supabase.from('appointments').select('*').eq('student_id', student.id).gte('date', todayStr).order('date').limit(1),
            student.personal_id ? supabase.from('profiles').select('name').eq('id', student.personal_id).single() : { data: null },
            supabase.from('attendances').select('status').eq('student_id', student.id).gte('date', monthStart),
          ]);

          const planList = plans || [];
          setAllPlans(planList);

          const tp = planList.find(p => (p.days || []).includes(todayDay));
          setTodayPlan(tp || planList[0] || null);

          setNextAppt(appts?.[0] || null);
          setPersonalName(profile?.name || '');

          if (atts && atts.length > 0) {
            const present = atts.filter(a => a.status === 'present' || a.status === 'late').length;
            setAttendanceRate(Math.round((present / atts.length) * 100));
          }
        }
        setLoading(false);
      })();
    } else {
      const myPlans = trainingPlans.filter(p => p.studentId === 1);
      setAllPlans(myPlans);
      setTodayPlan(myPlans[0] || null);
      const todayAppt = appointments.find(a => a.studentId === 1 && a.date >= todayStr);
      setNextAppt(todayAppt || null);
      setPersonalName('Personal Trainer');
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (!isPushSupported()) { setPushState('unsupported'); return; }
    isPushSubscribed().then(ok => setPushState(ok ? 'subscribed' : 'idle'));
  }, []);

  const handleEnableNotifications = async () => {
    if (!studentId) return;
    setPushState('subscribing');
    const res = await subscribeToPush(studentId);
    setPushState(res.ok ? 'subscribed' : 'idle');
  };

  const handleDisableNotifications = async () => {
    await unsubscribeFromPush(studentId);
    setPushState('idle');
  };

  const exercises = todayPlan?.exercises
    ? [...(todayPlan.exercises)].sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0))
    : [];

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: 80 }}>
      <Loader size={28} color="#3B82F6" style={{ animation: 'spin 1s linear infinite' }} />
      <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  return (
    <div className="page-padding" style={{ flex: 1 }}>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#111827' }}>
          Olá, {user?.name?.split(' ')[0] || 'Aluno'}! 👋
        </h2>
        <p style={{ margin: '4px 0 0', fontSize: 14, color: '#6B7280' }}>
          {now.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })} · Vamos treinar! 💪
        </p>
      </div>

      {/* Push notification banner */}
      {pushState === 'idle' && isPushSupported() && (
        <div style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 12, padding: '12px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
          <Bell size={20} color="#3B82F6" style={{ flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#1D4ED8' }}>Ative as notificações</p>
            <p style={{ margin: '2px 0 0', fontSize: 12, color: '#3B82F6' }}>Receba avisos do seu personal direto no celular</p>
          </div>
          <button
            onClick={handleEnableNotifications}
            style={{ background: '#3B82F6', color: 'white', border: 'none', borderRadius: 8, padding: '8px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer', flexShrink: 0 }}
          >
            Ativar
          </button>
        </div>
      )}
      {pushState === 'subscribing' && (
        <div style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 12, padding: '12px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
          <Loader size={18} color="#3B82F6" style={{ animation: 'spin 1s linear infinite', flexShrink: 0 }} />
          <p style={{ margin: 0, fontSize: 14, color: '#3B82F6' }}>Ativando notificações...</p>
        </div>
      )}
      {pushState === 'subscribed' && (
        <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 12, padding: '12px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
          <Bell size={20} color="#10B981" style={{ flexShrink: 0 }} />
          <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#059669', flex: 1 }}>Notificações ativadas</p>
          <button onClick={handleDisableNotifications} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6B7280', display: 'flex', padding: 4 }}>
            <BellOff size={16} />
          </button>
        </div>
      )}

      {/* Objetivo do aluno */}
      {studentGoal && (
        <div style={{ background: 'linear-gradient(135deg, #8B5CF6, #3B82F6)', borderRadius: 12, padding: '14px 18px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 24 }}>🎯</span>
          <div>
            <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.75)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Seu objetivo</p>
            <p style={{ margin: '2px 0 0', fontSize: 15, fontWeight: 700, color: 'white' }}>{studentGoal}</p>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid-3" style={{ marginBottom: 20 }}>
        {[
          { label: 'Planos de treino', value: allPlans.length, icon: Dumbbell, color: '#3B82F6', bg: '#EFF6FF' },
          { label: 'Frequência no mês', value: attendanceRate !== null ? `${attendanceRate}%` : '—', icon: TrendingUp, color: '#10B981', bg: '#ECFDF5' },
          { label: 'Próxima aula', value: nextAppt ? nextAppt.date.slice(8) + '/' + nextAppt.date.slice(5, 7) : '—', icon: Calendar, color: '#8B5CF6', bg: '#F5F3FF' },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} style={{ background: 'white', borderRadius: 12, padding: '16px 18px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Icon size={20} color={color} />
            </div>
            <div>
              <p style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#111827' }}>{value}</p>
              <p style={{ margin: 0, fontSize: 12, color: '#6B7280' }}>{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Main grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 340px', gap: 16 }} className="student-main-grid">
        {/* Today's workout — main CTA */}
        <div style={{ background: 'white', borderRadius: 14, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
          {todayPlan ? (
            <>
              {/* Header gradient */}
              {(todayPlan.days || []).includes(todayDay) && (
                <div style={{ background: 'linear-gradient(135deg, #1E3A5F, #0F172A)', padding: '10px 18px' }}>
                  <span style={{ fontSize: 11, fontWeight: 800, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    ⚡ Treino de hoje
                  </span>
                </div>
              )}
              <div style={{ padding: '18px 18px 0' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 14 }}>
                  <div style={{ width: 46, height: 46, borderRadius: 12, background: `${TYPE_COLORS[todayPlan.type] || '#6B7280'}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Dumbbell size={22} color={TYPE_COLORS[todayPlan.type] || '#6B7280'} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h3 style={{ margin: '0 0 2px', fontSize: 17, fontWeight: 900, color: '#111827', lineHeight: 1.2 }}>{todayPlan.name}</h3>
                    <p style={{ margin: 0, fontSize: 13, color: '#6B7280' }}>
                      {totalCount} exercícios · <span style={{ color: TYPE_COLORS[todayPlan.type] || '#6B7280', fontWeight: 700 }}>{todayPlan.type}</span>
                    </p>
                  </div>
                </div>

                {/* Exercise preview list */}
                {exercises.slice(0, 4).map((ex, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0', borderBottom: i < Math.min(exercises.length, 4) - 1 ? '1px solid #F3F4F6' : 'none' }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: TYPE_COLORS[todayPlan.type] || '#6B7280', flexShrink: 0 }} />
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#111827', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ex.name}</span>
                    <span style={{ fontSize: 12, color: '#9CA3AF', flexShrink: 0 }}>{ex.sets}x{ex.reps}</span>
                  </div>
                ))}
                {exercises.length > 4 && (
                  <p style={{ margin: '6px 0 0', fontSize: 12, color: '#9CA3AF' }}>+{exercises.length - 4} exercícios</p>
                )}
              </div>

              {/* Iniciar Treino CTA */}
              <div style={{ padding: '16px 18px 18px' }}>
                <button
                  onClick={() => navigate(`/aluno/treinos/${todayPlan.id}/executar`)}
                  style={{ width: '100%', padding: '15px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg, #3B82F6, #8B5CF6)', color: 'white', fontSize: 16, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, letterSpacing: '-0.3px' }}
                >
                  <Play size={17} fill="white" /> Iniciar Treino
                </button>
                <button
                  onClick={() => navigate('/aluno/treinos')}
                  style={{ width: '100%', marginTop: 8, padding: '10px', borderRadius: 10, border: 'none', background: 'none', color: '#6B7280', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}
                >
                  Ver todos os treinos <ChevronRight size={14} />
                </button>
              </div>
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: '40px 20px' }}>
              <Dumbbell size={40} color="#D1D5DB" style={{ marginBottom: 12 }} />
              <p style={{ margin: 0, color: '#374151', fontSize: 14, fontWeight: 600 }}>Nenhum treino cadastrado</p>
              <p style={{ margin: '6px 0 0', color: '#9CA3AF', fontSize: 13 }}>Seu personal ainda não cadastrou treinos para você</p>
            </div>
          )}
        </div>

        {/* Right column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Next appointment */}
          <div style={{ background: 'white', borderRadius: 12, padding: 18, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <Calendar size={16} color="#3B82F6" />
              <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#111827' }}>Próxima Aula</h3>
            </div>
            {nextAppt ? (
              <div style={{ background: 'linear-gradient(135deg, #EFF6FF, #F5F3FF)', borderRadius: 10, padding: '12px 14px', border: '1px solid #DBEAFE' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 10, background: 'linear-gradient(135deg, #3B82F6, #8B5CF6)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <span style={{ fontSize: 15, fontWeight: 800, color: 'white', lineHeight: 1 }}>{nextAppt.date.slice(8)}</span>
                    <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.8)', fontWeight: 600 }}>
                      {new Date(nextAppt.date + 'T12:00:00').toLocaleDateString('pt-BR', { month: 'short' }).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#111827' }}>{nextAppt.type || nextAppt.session_type}</p>
                    <p style={{ margin: '2px 0 0', fontSize: 12, color: '#6B7280', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Clock size={11} /> {nextAppt.time}{personalName ? ` · com ${personalName.split(' ')[0]}` : ''}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <p style={{ margin: 0, color: '#9CA3AF', fontSize: 13 }}>Nenhuma aula agendada</p>
            )}
          </div>

          {/* Quick links */}
          <div style={{ background: 'white', borderRadius: 12, padding: 18, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
            <h3 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 700, color: '#111827' }}>Acesso Rápido</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                { label: 'Ver todos os treinos', href: '/aluno/treinos', color: '#8B5CF6', bg: '#F5F3FF', icon: Dumbbell },
                { label: 'Minha agenda', href: '/aluno/agenda', color: '#3B82F6', bg: '#EFF6FF', icon: Calendar },
                { label: 'Fotos de progresso', href: '/aluno/fotos', color: '#10B981', bg: '#ECFDF5', icon: TrendingUp },
              ].map(item => (
                <a key={item.href} href={item.href} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 10, background: item.bg, textDecoration: 'none', transition: 'opacity 0.15s' }}>
                  <item.icon size={16} color={item.color} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: item.color }}>{item.label}</span>
                </a>
              ))}
            </div>
          </div>

          {/* All plans summary */}
          {allPlans.length > 1 && (
            <div style={{ background: 'white', borderRadius: 12, padding: 18, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
              <h3 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 700, color: '#111827' }}>Seus Treinos</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {allPlans.slice(0, 4).map(p => (
                  <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: '1px solid #F9FAFB' }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: TYPE_COLORS[p.type] || '#6B7280', flexShrink: 0 }} />
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#111827', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
                    <span style={{ fontSize: 11, color: TYPE_COLORS[p.type] || '#6B7280', fontWeight: 700 }}>{p.type}</span>
                  </div>
                ))}
                {allPlans.length > 4 && <p style={{ margin: '4px 0 0', fontSize: 12, color: '#9CA3AF' }}>+{allPlans.length - 4} mais</p>}
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
