import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Dumbbell, TrendingUp, Clock, Play, Loader, Bell, BellOff, ChevronRight, Flame, Star, Camera, MessageCircle, Activity, Award, Zap, Target, Edit2, Check, Salad, Trophy } from 'lucide-react';
import WaterTracker from '../../components/UI/WaterTracker';
import XPBar from '../../components/UI/XPBar';
import { useAuth } from '../../context/AuthContext';
import { supabase, hasSupabase } from '../../lib/supabase';
import { trainingPlans, appointments } from '../../data/mockData';
import { isPushSupported, isPushSubscribed, subscribeToPush, unsubscribeFromPush } from '../../lib/pushNotifications';

const TYPE_COLORS = {
  Hipertrofia: '#8B5CF6', Funcional: '#10B981', Força: '#EF4444',
  Cardio: '#F59E0B', Resistência: '#3B82F6', Mobilidade: '#06B6D4',
};
const TYPE_BG = {
  Hipertrofia: '#1E1B4B', Funcional: '#064E3B', Força: '#450A0A',
  Cardio: '#451A03', Resistência: '#1E3A5F', Mobilidade: '#0C4A6E',
};

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Bom dia';
  if (h < 18) return 'Boa tarde';
  return 'Boa noite';
}

function StreakBadge({ streak }) {
  if (!streak || streak === 0) return null;
  const isHot = streak >= 7;
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      background: isHot ? 'linear-gradient(135deg, #FEF3C7, #FEF9C3)' : 'linear-gradient(135deg, #FFF7ED, #FFEDD5)',
      border: `1.5px solid ${isHot ? '#FDE68A' : '#FED7AA'}`,
      borderRadius: 16, padding: '12px 16px',
    }}>
      <div style={{ fontSize: 32, lineHeight: 1 }}>{isHot ? '🔥' : '⚡'}</div>
      <div style={{ flex: 1 }}>
        <p style={{ margin: 0, fontSize: 16, fontWeight: 900, color: isHot ? '#92400E' : '#9A3412' }}>
          {streak} {streak === 1 ? 'dia seguido' : 'dias seguidos'}!
        </p>
        <p style={{ margin: '2px 0 0', fontSize: 12, color: isHot ? '#B45309' : '#C2410C' }}>
          {isHot ? '🏆 Você está em chamas! Continue assim!' : 'Continue treinando para manter a sequência'}
        </p>
      </div>
      <div style={{ textAlign: 'center', background: isHot ? '#FDE68A' : '#FED7AA', borderRadius: 12, padding: '6px 12px' }}>
        <p style={{ margin: 0, fontSize: 22, fontWeight: 900, color: isHot ? '#92400E' : '#9A3412' }}>{streak}</p>
        <p style={{ margin: 0, fontSize: 9, color: isHot ? '#B45309' : '#C2410C', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>streak</p>
      </div>
    </div>
  );
}

export default function StudentDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [todayPlan, setTodayPlan] = useState(null);
  const [allPlans, setAllPlans] = useState([]);
  const [nextAppt, setNextAppt] = useState(null);
  const [personalName, setPersonalName] = useState('');
  const [attendanceRate, setAttendanceRate] = useState(null);
  const [pushState, setPushState] = useState('idle');
  const [studentId, setStudentId] = useState(null);
  const [studentGoal, setStudentGoal] = useState('');
  const [streak, setStreak] = useState(0);
  const [weekSessions, setWeekSessions] = useState(0);
  const [installPrompt, setInstallPrompt] = useState(null);
  const [installDismissed, setInstallDismissed] = useState(() => !!localStorage.getItem('pwa_install_dismissed'));
  const [pushDismissed, setPushDismissed] = useState(() => !!localStorage.getItem('push_banner_dismissed'));
  const [currentWeight, setCurrentWeight] = useState(null);
  const [startWeight, setStartWeight] = useState(null);
  const [goalWeight, setGoalWeight] = useState(null);
  const [editingGoal, setEditingGoal] = useState(false);
  const [goalInput, setGoalInput] = useState('');
  const [waterGoalMl, setWaterGoalMl] = useState(2000);
  const [xpTotal, setXpTotal] = useState(0);

  const now = new Date();
  const todayDay = now.getDay();
  const todayStr = now.toISOString().slice(0, 10);
  const monthStart = `${todayStr.slice(0, 7)}-01`;
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);

  useEffect(() => {
    if (!user) return;
    if (hasSupabase) {
      (async () => {
        try {
          const { data: student } = await supabase
            .from('students').select('id, personal_id, plan, goal, onboarded_at').eq('user_id', user.id).maybeSingle();

          if (student) {
            setStudentId(student.id);
            setStudentGoal(student.goal || '');

            const neverOnboarded = !student.onboarded_at && !localStorage.getItem(`aluno_onboarded_${user.id}`);
            if (neverOnboarded) { navigate('/aluno/onboarding', { replace: true }); setLoading(false); return; }

            const [{ data: plans }, { data: appts }, { data: profile }, { data: atts }, sessionsResult, weekResult, weightResult, nutritionAnam] = await Promise.all([
              supabase.from('training_plans').select('*, exercises(*)').eq('student_id', student.id).order('created_at', { ascending: false }),
              supabase.from('appointments').select('*').eq('student_id', student.id).gte('date', todayStr).order('date').limit(1),
              student.personal_id ? supabase.from('profiles').select('name').eq('id', student.personal_id).single() : { data: null },
              supabase.from('attendances').select('status').eq('student_id', student.id).gte('date', monthStart),
              supabase.from('workout_sessions').select('date').eq('student_id', student.id).order('date', { ascending: false }).limit(90),
              supabase.from('workout_sessions').select('id').eq('student_id', student.id).gte('date', weekAgo),
              supabase.from('physical_assessments').select('data').eq('student_id', student.id).order('created_at', { ascending: true }),
              supabase.from('nutrition_anamnesis').select('water_goal').eq('student_id', student.id).maybeSingle(),
            ]);

            const sessions = sessionsResult?.data || [];
            setWeekSessions(weekResult?.data?.length || 0);

            const weights = (weightResult?.data || []).map(r => parseFloat(r?.data?.weight)).filter(Boolean);
            const latestWeight = weights.length > 0 ? weights[weights.length - 1] : null;
            if (weights.length > 0) {
              setCurrentWeight(latestWeight);
              setStartWeight(weights[0]);
            }
            const savedGoal = localStorage.getItem(`goal_weight_${student.id}`);
            if (savedGoal) { setGoalWeight(parseFloat(savedGoal)); setGoalInput(savedGoal); }

            /* Water goal: nutritionist-set > weight-based (35ml/kg) > default 2L */
            const nutriWater = nutritionAnam?.data?.water_goal;
            if (nutriWater && parseFloat(nutriWater) > 0) {
              setWaterGoalMl(Math.round(parseFloat(nutriWater) * 1000));
            } else if (latestWeight) {
              setWaterGoalMl(Math.round(latestWeight * 35));
            }

            // Streak calculation
            const uniqueDates = [...new Set(sessions.map(s => s.date))].sort().reverse();
            const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
            if (uniqueDates.length && (uniqueDates[0] === todayStr || uniqueDates[0] === yesterday)) {
              let s = 0, check = uniqueDates[0];
              for (const d of uniqueDates) {
                if (d === check) { s++; const dt = new Date(check + 'T12:00:00'); dt.setDate(dt.getDate() - 1); check = dt.toISOString().slice(0, 10); }
                else break;
              }
              setStreak(s);
            }

            setXpTotal(sessions.length * 50);

            const planList = plans || [];
            setAllPlans(planList);
            setTodayPlan(planList.find(p => (p.days || []).includes(todayDay)) || planList[0] || null);
            setNextAppt(appts?.[0] || null);
            setPersonalName(profile?.name || '');

            if (atts?.length) {
              const present = atts.filter(a => a.status === 'present' || a.status === 'late').length;
              setAttendanceRate(Math.round((present / atts.length) * 100));
            }
          }
        } catch (err) {
          console.error('StudentDashboard:', err);
        } finally {
          setLoading(false);
        }
      })();
    } else {
      const myPlans = trainingPlans.filter(p => p.studentId === 1);
      setAllPlans(myPlans);
      setTodayPlan(myPlans[0] || null);
      setNextAppt(appointments.find(a => a.studentId === 1 && a.date >= todayStr) || null);
      setPersonalName('Personal Trainer');
      setStreak(5);
      setWeekSessions(3);
      setAttendanceRate(85);
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (!isPushSupported()) { setPushState('unsupported'); return; }
    isPushSubscribed().then(ok => setPushState(ok ? 'subscribed' : 'idle'));
  }, []);

  useEffect(() => {
    const handler = e => { e.preventDefault(); setInstallPrompt(e); };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleEnableNotifications = async () => {
    if (!studentId) return;
    setPushState('subscribing');
    const res = await subscribeToPush(studentId);
    setPushState(res.ok ? 'subscribed' : 'idle');
  };
  const handleDisableNotifications = async () => { await unsubscribeFromPush(studentId); setPushState('idle'); };

  const exercises = todayPlan?.exercises
    ? [...todayPlan.exercises].sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0))
    : [];

  const isRestDay = !todayPlan;
  const workoutColor = TYPE_COLORS[todayPlan?.type] || '#3B82F6';
  const workoutBg = TYPE_BG[todayPlan?.type] || '#1E3A5F';
  const firstName = user?.name?.split(' ')[0] || 'Aluno';

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: 80 }}>
      <Loader size={28} color="#3B82F6" style={{ animation: 'spin 1s linear infinite' }} />
      <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  return (
    <div className="page-padding" style={{ flex: 1 }}>

      {/* ── Header ── */}
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ margin: 0, fontSize: 24, fontWeight: 900, color: '#111827', letterSpacing: '-0.3px' }}>
          {greeting()}, {firstName}! {streak >= 3 ? '🔥' : '👋'}
        </h2>
        <p style={{ margin: '3px 0 0', fontSize: 13, color: '#6B7280', textTransform: 'capitalize' }}>
          {now.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>
      </div>

      {/* ── XP Bar ── */}
      {xpTotal > 0 && (
        <div onClick={() => navigate('/aluno/conquistas')} style={{ cursor: 'pointer', marginBottom: 14 }}>
          <XPBar totalXP={xpTotal} compact />
        </div>
      )}

      {/* ── Streak (destaque) ── */}
      {streak > 0 && (
        <div style={{ marginBottom: 16 }}>
          <StreakBadge streak={streak} />
        </div>
      )}

      {/* ── Banners (colapsados, não acumulam) ── */}
      {pushState === 'idle' && !pushDismissed && isPushSupported() && (
        <div style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 12, padding: '11px 14px', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
          <Bell size={18} color="#3B82F6" style={{ flexShrink: 0 }} />
          <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#1D4ED8', flex: 1 }}>Ative notificações do seu personal</p>
          <button onClick={handleEnableNotifications} style={{ background: '#3B82F6', color: 'white', border: 'none', borderRadius: 8, padding: '6px 14px', fontSize: 13, fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}>Ativar</button>
          <button onClick={() => { setPushDismissed(true); localStorage.setItem('push_banner_dismissed', '1'); }} style={{ background: 'none', border: 'none', color: '#93C5FD', cursor: 'pointer', padding: 4, fontSize: 16, flexShrink: 0 }}>✕</button>
        </div>
      )}
      {installPrompt && !installDismissed && (
        <div style={{ background: 'linear-gradient(135deg, #0F172A, #1E3A5F)', borderRadius: 12, padding: '11px 14px', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 20 }}>📱</span>
          <div style={{ flex: 1 }}>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: 'white' }}>Instalar o WAY FIT</p>
            <p style={{ margin: '1px 0 0', fontSize: 11, color: 'rgba(255,255,255,0.6)' }}>Acesse seus treinos offline</p>
          </div>
          <button onClick={async () => { installPrompt.prompt(); const { outcome } = await installPrompt.userChoice; if (outcome === 'accepted') setInstallPrompt(null); }}
            style={{ padding: '6px 12px', background: 'linear-gradient(135deg, #3B82F6, #8B5CF6)', color: 'white', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}>
            Instalar
          </button>
          <button onClick={() => { setInstallPrompt(null); setInstallDismissed(true); localStorage.setItem('pwa_install_dismissed', '1'); }}
            style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', padding: 4, flexShrink: 0, fontSize: 16 }}>✕</button>
        </div>
      )}

      {/* ── Stats rápidas ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 16 }}>
        {[
          { label: 'Esta semana', value: `${weekSessions}x`, icon: Dumbbell, color: '#3B82F6', bg: '#EFF6FF', desc: 'treinos' },
          { label: 'Frequência', value: attendanceRate !== null ? `${attendanceRate}%` : '—', icon: TrendingUp, color: '#10B981', bg: '#ECFDF5', desc: 'no mês' },
          { label: 'Próxima aula', value: nextAppt ? `${nextAppt.date.slice(8)}/${nextAppt.date.slice(5, 7)}` : '—', icon: Calendar, color: '#8B5CF6', bg: '#F5F3FF', desc: nextAppt?.time?.slice(0, 5) || 'sem data' },
        ].map(({ label, value, icon: Icon, color, bg, desc }) => (
          <div key={label} style={{ background: 'white', borderRadius: 14, padding: '14px 14px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', border: '1px solid #F1F5F9' }}>
            <div style={{ width: 32, height: 32, borderRadius: 9, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
              <Icon size={16} color={color} />
            </div>
            <p style={{ margin: '0 0 1px', fontSize: 20, fontWeight: 900, color: '#111827', lineHeight: 1 }}>{value}</p>
            <p style={{ margin: 0, fontSize: 10, color: '#9CA3AF', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</p>
          </div>
        ))}
      </div>

      {/* ── Hero: Treino de hoje ── */}
      <div style={{ borderRadius: 20, overflow: 'hidden', marginBottom: 16, boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }}>
        {todayPlan ? (
          <div style={{ background: `linear-gradient(160deg, ${workoutBg} 0%, #0F172A 100%)`, position: 'relative', overflow: 'hidden' }}>
            {/* Decorative circles */}
            <div style={{ position: 'absolute', top: -40, right: -40, width: 160, height: 160, borderRadius: '50%', background: workoutColor + '15', pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', bottom: -20, left: -20, width: 100, height: 100, borderRadius: '50%', background: workoutColor + '10', pointerEvents: 'none' }} />

            <div style={{ padding: '20px 20px 0', position: 'relative' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                <span style={{ fontSize: 11, fontWeight: 800, color: workoutColor, background: workoutColor + '25', padding: '4px 12px', borderRadius: 20, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                  ⚡ Treino de hoje
                </span>
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>
                  {exercises.length} exercício{exercises.length !== 1 ? 's' : ''}
                </span>
              </div>

              <h3 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 900, color: 'white', letterSpacing: '-0.4px', lineHeight: 1.2 }}>{todayPlan.name}</h3>
              <p style={{ margin: '0 0 16px', fontSize: 13, color: 'rgba(255,255,255,0.6)', fontWeight: 600 }}>
                {todayPlan.type}
                {studentGoal && ` · Objetivo: ${studentGoal}`}
              </p>

              {/* Exercise preview */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 1, marginBottom: 18 }}>
                {exercises.slice(0, 4).map((ex, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: i < Math.min(exercises.length, 4) - 1 ? `1px solid ${workoutColor}20` : 'none' }}>
                    <div style={{ width: 22, height: 22, borderRadius: 6, background: workoutColor + '25', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <span style={{ fontSize: 10, fontWeight: 900, color: workoutColor }}>{i + 1}</span>
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.9)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ex.name}</span>
                    <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', flexShrink: 0, fontWeight: 700 }}>{ex.sets}×{ex.reps}</span>
                  </div>
                ))}
                {exercises.length > 4 && (
                  <p style={{ margin: '6px 0 0', fontSize: 12, color: 'rgba(255,255,255,0.4)', textAlign: 'center' }}>
                    + {exercises.length - 4} exercícios
                  </p>
                )}
              </div>
            </div>

            <div style={{ padding: '0 16px 20px', position: 'relative' }}>
              <button onClick={() => navigate(`/aluno/treinos/${todayPlan.id}/executar`)}
                style={{ width: '100%', padding: '16px', borderRadius: 14, border: 'none', background: workoutColor, color: 'white', fontSize: 16, fontWeight: 900, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, letterSpacing: '-0.3px', boxShadow: `0 4px 20px ${workoutColor}60` }}>
                <Play size={18} fill="white" /> Iniciar Treino Agora
              </button>
              <button onClick={() => navigate('/aluno/treinos')}
                style={{ width: '100%', marginTop: 8, padding: '10px', borderRadius: 10, border: 'none', background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                Ver todos os treinos <ChevronRight size={14} />
              </button>
            </div>
          </div>
        ) : (
          <div style={{ background: 'linear-gradient(135deg, #0F172A, #1E293B)', padding: '32px 24px', textAlign: 'center' }}>
            <div style={{ width: 64, height: 64, borderRadius: 20, background: 'rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <Dumbbell size={30} color="rgba(255,255,255,0.3)" />
            </div>
            <h3 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 900, color: 'white' }}>
              {isRestDay ? '😴 Dia de descanso' : 'Nenhum treino hoje'}
            </h3>
            <p style={{ margin: '0 0 16px', fontSize: 13, color: 'rgba(255,255,255,0.5)', lineHeight: 1.5 }}>
              {isRestDay
                ? 'Aproveite para recuperar. O descanso é parte do treino!'
                : 'Seu personal ainda não cadastrou treinos para você.'}
            </p>
            {allPlans.length > 0 && (
              <button onClick={() => navigate('/aluno/treinos')}
                style={{ padding: '12px 24px', background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 12, color: 'white', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
                Ver meus treinos
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── Acesso rápido ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginBottom: 16 }}>
        {[
          { label: 'Meus Treinos', desc: `${allPlans.length} programa${allPlans.length !== 1 ? 's' : ''}`, href: '/aluno/treinos', color: '#8B5CF6', bg: 'linear-gradient(135deg, #F5F3FF, #EDE9FE)', icon: Dumbbell },
          { label: 'Progresso', desc: 'Medidas e evolução', href: '/aluno/progresso', color: '#10B981', bg: 'linear-gradient(135deg, #ECFDF5, #D1FAE5)', icon: TrendingUp },
          { label: 'Log Alimentar', desc: 'Refeições de hoje', href: '/aluno/log-alimentar', color: '#F59E0B', bg: 'linear-gradient(135deg, #FFFBEB, #FEF3C7)', icon: Salad },
          { label: 'Desafios', desc: 'Metas e conquistas', href: '/aluno/desafios', color: '#EF4444', bg: 'linear-gradient(135deg, #FFF1F2, #FFE4E6)', icon: Trophy },
          { label: 'Fotos', desc: 'Sua transformação', href: '/aluno/fotos', color: '#3B82F6', bg: 'linear-gradient(135deg, #EFF6FF, #DBEAFE)', icon: Camera },
          { label: 'Mensagens', desc: personalName ? `com ${personalName.split(' ')[0]}` : 'do personal', href: '/aluno/chat', color: '#06B6D4', bg: 'linear-gradient(135deg, #ECFEFF, #CFFAFE)', icon: MessageCircle },
        ].map(item => (
          <button key={item.href} onClick={() => navigate(item.href)}
            style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', borderRadius: 16, background: item.bg, border: 'none', cursor: 'pointer', textAlign: 'left', transition: 'transform 0.12s' }}
            onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.02)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: item.color + '20', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <item.icon size={20} color={item.color} />
            </div>
            <div style={{ minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 800, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.label}</p>
              <p style={{ margin: 0, fontSize: 11, color: '#6B7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.desc}</p>
            </div>
          </button>
        ))}
      </div>

      {/* ── Próxima aula ── */}
      {nextAppt && (
        <div style={{ background: 'white', borderRadius: 16, padding: '16px 18px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', border: '1px solid #F1F5F9', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <Calendar size={15} color="#3B82F6" />
            <h3 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: '#111827' }}>Próxima Aula</h3>
          </div>
          <div style={{ background: 'linear-gradient(135deg, #EFF6FF, #F5F3FF)', borderRadius: 12, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 14, border: '1px solid #DBEAFE' }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: 'linear-gradient(135deg, #3B82F6, #8B5CF6)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <span style={{ fontSize: 16, fontWeight: 900, color: 'white', lineHeight: 1 }}>{nextAppt.date.slice(8)}</span>
              <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.8)', fontWeight: 700 }}>
                {new Date(nextAppt.date + 'T12:00:00').toLocaleDateString('pt-BR', { month: 'short' }).toUpperCase()}
              </span>
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ margin: '0 0 2px', fontSize: 15, fontWeight: 800, color: '#111827' }}>{nextAppt.type || nextAppt.session_type}</p>
              <p style={{ margin: 0, fontSize: 12, color: '#6B7280', display: 'flex', alignItems: 'center', gap: 5 }}>
                <Clock size={11} /> {nextAppt.time?.slice(0, 5)}
                {personalName && <span>· com {personalName.split(' ')[0]}</span>}
              </p>
            </div>
            <button onClick={() => navigate('/aluno/agenda')}
              style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '7px 12px', borderRadius: 20, background: '#EFF6FF', border: 'none', color: '#3B82F6', fontSize: 12, fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}>
              Agenda <ChevronRight size={12} />
            </button>
          </div>
        </div>
      )}

      {/* ── Hidratação ── */}
      <WaterTracker goalMl={waterGoalMl} studentId={studentId} />

      {/* ── Objetivo + Meta de peso ── */}
      {(studentGoal || currentWeight || goalWeight) && (
        <div style={{ background: 'white', borderRadius: 16, padding: '16px 18px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', border: '1px solid #F1F5F9', marginBottom: 16 }}>
          {studentGoal && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: (currentWeight || goalWeight) ? 14 : 0 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg,#8B5CF6,#3B82F6)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Star size={18} color="white" fill="white" />
              </div>
              <div>
                <p style={{ margin: 0, fontSize: 10, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Objetivo</p>
                <p style={{ margin: 0, fontSize: 15, fontWeight: 800, color: '#111827' }}>{studentGoal}</p>
              </div>
            </div>
          )}

          {/* Meta de peso */}
          {(() => {
            const hasGoal = !!goalWeight;
            const hasCurrent = !!currentWeight;
            const isLosing = hasGoal && hasCurrent ? goalWeight < currentWeight : true;
            const diff = hasGoal && hasCurrent ? Math.abs(currentWeight - goalWeight).toFixed(1) : null;
            const reached = hasGoal && hasCurrent && currentWeight === goalWeight;

            let pct = 0;
            if (hasGoal && hasCurrent && startWeight) {
              if (isLosing) {
                const total = startWeight - goalWeight;
                const done  = startWeight - currentWeight;
                pct = total > 0 ? Math.min(100, Math.max(0, (done / total) * 100)) : (currentWeight <= goalWeight ? 100 : 0);
              } else {
                const total = goalWeight - startWeight;
                const done  = currentWeight - startWeight;
                pct = total > 0 ? Math.min(100, Math.max(0, (done / total) * 100)) : (currentWeight >= goalWeight ? 100 : 0);
              }
            }

            return (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Target size={14} color="#3B82F6" />
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#374151' }}>Meta de peso</span>
                  </div>
                  {!editingGoal ? (
                    <button onClick={() => { setEditingGoal(true); setGoalInput(goalWeight ? String(goalWeight) : ''); }}
                      style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', color: '#3B82F6', fontSize: 12, fontWeight: 700, cursor: 'pointer', padding: '2px 6px' }}>
                      <Edit2 size={12} /> {hasGoal ? 'Editar' : 'Definir meta'}
                    </button>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <input
                        type="number"
                        value={goalInput}
                        onChange={e => setGoalInput(e.target.value)}
                        placeholder="Ex: 75"
                        autoFocus
                        style={{ width: 70, padding: '4px 8px', borderRadius: 8, border: '1.5px solid #3B82F6', fontSize: 13, fontWeight: 700, textAlign: 'center', outline: 'none', color: '#111827' }}
                      />
                      <span style={{ fontSize: 12, color: '#6B7280' }}>kg</span>
                      <button onClick={() => {
                        const v = parseFloat(goalInput);
                        if (v > 0) {
                          setGoalWeight(v);
                          const key = studentId ? `goal_weight_${studentId}` : `goal_weight_${user?.id}`;
                          localStorage.setItem(key, String(v));
                        }
                        setEditingGoal(false);
                      }} style={{ background: '#3B82F6', border: 'none', borderRadius: 8, padding: '5px 10px', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                        <Check size={13} />
                      </button>
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: hasGoal ? 10 : 0 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                      <span style={{ fontSize: 12, color: '#6B7280' }}>Atual: <strong style={{ color: '#111827' }}>{hasCurrent ? `${currentWeight}kg` : '—'}</strong></span>
                      <span style={{ fontSize: 12, color: '#6B7280' }}>Meta: <strong style={{ color: '#3B82F6' }}>{hasGoal ? `${goalWeight}kg` : '—'}</strong></span>
                    </div>
                    {hasGoal && (
                      <div style={{ height: 8, borderRadius: 99, background: '#F1F5F9', overflow: 'hidden', position: 'relative' }}>
                        <div style={{
                          height: '100%', borderRadius: 99, transition: 'width 0.6s ease',
                          width: `${reached ? 100 : pct}%`,
                          background: reached ? '#10B981' : `linear-gradient(90deg,#3B82F6,#8B5CF6)`,
                          minWidth: pct > 0 ? 12 : 0,
                        }} />
                      </div>
                    )}
                  </div>
                </div>

                {hasGoal && hasCurrent && (
                  <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: reached ? '#10B981' : (isLosing ? '#F59E0B' : '#8B5CF6') }}>
                    {reached
                      ? '🎉 Meta atingida! Parabéns!'
                      : isLosing
                        ? `↓ Faltam ${diff}kg para a meta`
                        : `↑ Faltam ${diff}kg para a meta`}
                  </p>
                )}
              </div>
            );
          })()}
        </div>
      )}

      <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
