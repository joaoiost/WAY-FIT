import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, Dumbbell, DollarSign, TrendingUp, MessageCircle, Check, X, Phone, Mail, Edit2, Clock, BarChart2, Activity, Star, FileText, Flame, ChevronDown, ChevronUp, Utensils, Droplets } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid } from 'recharts';
import { useAuth } from '../../context/AuthContext';
import { supabase, hasSupabase } from '../../lib/supabase';
import Modal from '../../components/UI/Modal';

const TYPE_COLORS = {
  Musculação: '#3B82F6', Funcional: '#10B981', Hipertrofia: '#8B5CF6',
  Cardio: '#F59E0B', Yoga: '#EC4899', Pilates: '#06B6D4', Força: '#EF4444',
};

const AVATAR_COLORS = ['#3B82F6', '#10B981', '#8B5CF6', '#F59E0B', '#EF4444', '#EC4899', '#06B6D4'];
function avatarColor(id) { return AVATAR_COLORS[String(id).charCodeAt(0) % AVATAR_COLORS.length]; }

const METRIC_LABELS = { weight: 'Peso (kg)', waist: 'Cintura (cm)', chest: 'Peito (cm)', arm: 'Braço (cm)', hip: 'Quadril (cm)', body_fat: 'BF (%)' };
const METRIC_UNITS = { weight: 'kg', waist: 'cm', chest: 'cm', arm: 'cm', hip: 'cm', body_fat: '%' };

function MiniChart({ data, field }) {
  const color = 'var(--accent)';
  const vals = data.map(d => parseFloat(d[field]) || 0).filter(v => v > 0);
  if (vals.length < 2) return null;
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const range = max - min || 1;
  const W = 300; const H = 70; const PAD = 10;
  const points = vals.map((v, i) => {
    const x = PAD + (i / (vals.length - 1)) * (W - PAD * 2);
    const y = H - PAD - ((v - min) / range) * (H - PAD * 2);
    return `${x},${y}`;
  });
  const polyline = points.join(' ');
  const area = `${PAD},${H - PAD} ${polyline} ${W - PAD},${H - PAD}`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 70, display: 'block' }} preserveAspectRatio="none">
      <polygon points={area} fill="rgba(129,140,248,0.12)" />
      <polyline points={polyline} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      {points.map((pt, i) => {
        const [x, y] = pt.split(',').map(Number);
        return <circle key={i} cx={x} cy={y} r="3" fill={color} />;
      })}
    </svg>
  );
}

function StatBox({ icon: Icon, label, value, color, bg }) {
  return (
    <div className="kpi-card" style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'default' }}>
      <div style={{ width: 38, height: 38, borderRadius: 10, background: bg || 'var(--accent-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Icon size={18} color={color || 'var(--accent)'} />
      </div>
      <div>
        <p className="kpi-card-label">{label}</p>
        <p className="kpi-card-value" style={{ fontSize: 18 }}>{value}</p>
      </div>
    </div>
  );
}

const BASE_TABS = ['Visão Geral', 'Treinos', 'Agenda', 'Saúde', 'Financeiro'];

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
  const [ratings, setRatings] = useState([]);
  const [workoutSessions, setWorkoutSessions] = useState([]);
  const [exerciseLogs, setExerciseLogs] = useState([]);
  const [waterLog, setWaterLog] = useState(null);
  const [checkins, setCheckins] = useState([]);
  const [loading, setLoading] = useState(true);

  const [scheduleModal, setScheduleModal] = useState(false);
  const [schedForm, setSchedForm] = useState({ date: new Date().toISOString().slice(0, 10), time: '08:00', type: 'Musculação' });

  const [chartMetric, setChartMetric] = useState('weight');

  const [editModal, setEditModal] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [editSaving, setEditSaving] = useState(false);

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
        { data: rat },
        { data: ws },
        { data: el },
        { data: wl },
        { data: ci },
      ] = await Promise.all([
        supabase.from('students').select('*').eq('id', id).eq('personal_id', user.id).maybeSingle(),
        supabase.from('training_plans').select('*, exercises(*)').eq('student_id', id).order('created_at', { ascending: false }),
        supabase.from('appointments').select('*').eq('student_id', id).order('date', { ascending: false }).limit(20),
        supabase.from('attendances').select('*').eq('student_id', id).gte('date', monthStart).order('date'),
        supabase.from('payments').select('*').eq('student_id', id).order('due_date', { ascending: false }).limit(10),
        supabase.from('student_measurements').select('*').eq('student_id', id).order('recorded_at').limit(10),
        supabase.from('anamneses').select('*').eq('student_id', id).maybeSingle(),
        supabase.from('session_ratings').select('*').eq('student_id', id).order('date', { ascending: false }).limit(30),
        supabase.from('workout_sessions').select('id, date, plan_name, plan_type, exercises_done, exercises_total, finished_at').eq('student_id', id).order('date', { ascending: false }).limit(30),
        supabase.from('exercise_logs').select('exercise_name, load_actual, done, created_at, session_id').eq('student_id', id).not('load_actual', 'is', null).order('created_at', { ascending: true }).limit(100),
        supabase.from('water_logs').select('intake_ml, goal_ml').eq('student_id', id).eq('date', today).maybeSingle(),
        supabase.from('daily_checkins').select('*').eq('student_id', id).order('date', { ascending: false }).limit(7),
      ]);

      setStudent(s);
      setPlans(p || []);
      setAppointments(appts || []);
      setAttendances(atts || []);
      setPayments(pays || []);
      setMeasurements((meas || []).map(m => ({ ...m, date: m.recorded_at || m.date })));
      setAnamnese(ana);
      setRatings(rat || []);
      setWorkoutSessions(ws || []);
      setExerciseLogs(el || []);
      setWaterLog(wl || null);
      setCheckins(ci || []);
      setLoading(false);
    };
    load();
  }, [user?.id, id]);

  const openEdit = () => {
    setEditForm({
      name: student.name || '',
      phone: student.phone || '',
      email: student.email || '',
      plan: student.plan || '',
      plan_price: student.plan_price || '',
      goal: student.goal || '',
      notes: student.notes || '',
      status: student.status || 'ativo',
    });
    setEditModal(true);
  };

  const handleEditSave = async (e) => {
    e.preventDefault();
    setEditSaving(true);
    const updates = {
      name: editForm.name,
      phone: editForm.phone,
      email: editForm.email,
      plan: editForm.plan,
      plan_price: editForm.plan_price ? Number(editForm.plan_price) : null,
      goal: editForm.goal,
      notes: editForm.notes,
      status: editForm.status,
    };
    if (hasSupabase) {
      await supabase.from('students').update(updates).eq('id', id);
    }
    setStudent(prev => ({ ...prev, ...updates }));
    setEditSaving(false);
    setEditModal(false);
  };

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
      <p style={{ color: 'var(--gray-400)' }}>Aluno não encontrado.</p>
      <button onClick={() => navigate('/dashboard/alunos')} className="btn-primary" style={{ marginTop: 16 }}>Voltar</button>
    </div>
  );

  const color = student.color || avatarColor(student.id);
  const initials = student.name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();

  // attendances já vem filtrado por monthStart na query — contar só 'present'
  const presentThisMonth = attendances.filter(a => a.status === 'present').length;
  // só contar agendamentos que já aconteceram este mês (não futuros)
  const totalAppts = appointments.filter(a => a.date >= monthStart && a.date <= today).length;
  const attendRate = totalAppts > 0 ? Math.round(Math.min((presentThisMonth / totalAppts) * 100, 100)) : null;

  const nextAppt = appointments.find(a => a.date >= today && a.status !== 'cancelled');
  const lastMeasure = measurements.slice(-1)[0];
  const latePay = payments.filter(p => p.status === 'pendente' && p.due_date < today);

  return (
    <div className="page-padding" style={{ flex: 1 }}>
      {/* Back + header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 24, flexWrap: 'wrap' }}>
        <button onClick={() => navigate('/dashboard/alunos')} className="btn-back">
          <ArrowLeft size={15} /> <span>Alunos</span>
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flex: 1, minWidth: 0 }}>
          <div className="avatar avatar-lg" style={{ background: color }}>
            {student.avatarUrl
              ? <img src={student.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
              : initials}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 3 }}>
              <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: 'var(--gray-900)' }}>{student.name}</h2>
              <span className={`tag ${student.status === 'ativo' ? 'tag-green' : 'tag-yellow'}`}>
                {student.status === 'ativo' ? 'Ativo' : 'Pendente'}
              </span>
              {latePay.length > 0 && <span className="tag tag-red">Pagamento atrasado</span>}
            </div>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--gray-500)' }}>
              {student.goal && <span>{student.goal} · </span>}
              Plano {student.plan}
              {student.age && <span> · {student.age} anos</span>}
            </p>
            {(student.email || student.phone) && (
              <div style={{ display: 'flex', gap: 14, marginTop: 4, flexWrap: 'wrap' }}>
                {student.email && <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--gray-400)' }}><Mail size={12} /> {student.email}</span>}
                {student.phone && <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--gray-400)' }}><Phone size={12} /> {student.phone}</span>}
              </div>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <button onClick={openEdit} className="btn-secondary"><Edit2 size={14} /> Editar</button>
          {student.phone && (
            <a href={`https://wa.me/55${student.phone.replace(/\D/g,'')}`} target="_blank" rel="noreferrer"
              className="btn-secondary" style={{ color: '#15803D', borderColor: '#BBF7D0', background: '#F0FDF4', textDecoration: 'none' }}>
              <MessageCircle size={14} /> WhatsApp
            </a>
          )}
          <button onClick={() => navigate(`/dashboard/chat`)} className="btn-secondary" style={{ color: 'var(--blue)', borderColor: '#BFDBFE', background: '#EFF6FF' }}>
            <MessageCircle size={14} /> Chat
          </button>
          <button onClick={() => navigate(`/dashboard/alunos/${id}/avaliacao`)} className="btn-secondary">
            <Activity size={14} /> Avaliação
          </button>
          <button onClick={() => navigate(`/dashboard/alunos/${id}/nutricao`)} className="btn-secondary" style={{ color: '#059669', borderColor: '#BBF7D0', background: '#F0FDF4' }}>
            <Utensils size={14} /> Nutrição
          </button>
          <button onClick={() => window.open(`/dashboard/alunos/${id}/relatorio`, '_blank')} className="btn-secondary">
            <FileText size={14} /> PDF
          </button>
          <button onClick={() => setScheduleModal(true)} className="btn-primary">
            <Calendar size={14} /> Agendar
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div className="kpi-grid student-stats-grid" style={{ marginBottom: 24 }}>
        <StatBox icon={Calendar} label="Próxima aula" value={nextAppt ? new Date(nextAppt.date+'T12:00:00').toLocaleDateString('pt-BR',{day:'numeric',month:'short'}) : '—'} color="var(--blue)" bg="#EFF6FF" />
        <StatBox icon={Activity} label="Frequência" value={attendRate !== null ? `${attendRate}%` : '—'} color="var(--green)" bg="#ECFDF5" />
        <StatBox icon={DollarSign} label="Pagamentos" value={latePay.length === 0 ? '✓ OK' : `${latePay.length} atraso`} color={latePay.length ? 'var(--red)' : 'var(--green)'} bg={latePay.length ? '#FEE2E2' : '#ECFDF5'} />
        <StatBox icon={TrendingUp} label="Peso atual" value={lastMeasure ? `${lastMeasure.weight}kg` : '—'} color="#8B5CF6" bg="#F5F3FF" />
        <StatBox icon={Droplets} label="Água hoje" value={waterLog ? `${(waterLog.intake_ml / 1000).toFixed(1)}L` : '—'} color="#0284C7" bg="#E0F2FE" />
      </div>

      {/* Tabs */}
      <div className="tab-bar student-detail-tabs">
        {BASE_TABS.map(t => (
          <button key={t} onClick={() => setTab(t)} className={`tab-btn${tab === t ? ' active' : ''}`}>{t}</button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'Treinos' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {plans.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--gray-400)' }}>
              <Dumbbell size={36} color="var(--border)" style={{ marginBottom: 12 }} />
              <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: 'var(--gray-700)' }}>Nenhum plano criado</p>
              <p style={{ margin: '4px 0 16px', fontSize: 13 }}>Vá para a seção Treinos para criar um plano</p>
              <button onClick={() => navigate('/dashboard/treinos')} className="btn-primary">Ir para Treinos</button>
            </div>
          ) : plans.map(plan => (
            <div key={plan.id} style={{ background: 'var(--bg-surface)', borderRadius: 12, padding: 20, border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div>
                  <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--gray-900)' }}>{plan.name}</p>
                  <p style={{ margin: '3px 0 0', fontSize: 12, color: 'var(--gray-400)' }}>
                    {(plan.days || []).map(d => ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'][d]).join(', ')} · {(plan.exercises || []).length} exercícios
                  </p>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {(plan.exercises || []).slice(0, 6).map((ex, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: 'var(--bg-page)', borderRadius: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--gray-700)', flex: 1 }}>{ex.name}</span>
                    <span style={{ fontSize: 12, color: 'var(--gray-500)' }}>{ex.sets}x{ex.reps}</span>
                    {ex.weight && <span style={{ fontSize: 12, color: 'var(--gray-400)' }}>{ex.weight}kg</span>}
                  </div>
                ))}
                {(plan.exercises || []).length > 6 && (
                  <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--gray-400)', textAlign: 'center' }}>+{plan.exercises.length - 6} exercícios</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'Treinos' && (() => {
        const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
        const thisWeekSessions = workoutSessions.filter(s => s.date >= sevenDaysAgo);
        const totalSessionsAll = workoutSessions.length;
        const completedSessions = workoutSessions.filter(s => s.exercises_total > 0 && s.exercises_done >= s.exercises_total).length;

        // Build per-exercise load history
        const byExercise = {};
        exerciseLogs.forEach(log => {
          if (!log.load_actual || !log.done) return;
          const n = log.exercise_name;
          if (!byExercise[n]) byExercise[n] = [];
          byExercise[n].push({ date: log.created_at?.slice(0, 10), load: log.load_actual });
        });
        // Sort each exercise by date and keep unique dates (last entry per date)
        const exerciseProgression = Object.entries(byExercise)
          .map(([name, entries]) => {
            const sorted = entries.sort((a, b) => a.date?.localeCompare(b.date));
            const first = sorted[0];
            const last = sorted[sorted.length - 1];
            return { name, entries: sorted, first, last, count: sorted.length };
          })
          .filter(e => e.count >= 2)
          .sort((a, b) => b.count - a.count)
          .slice(0, 8);

        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Week summary */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
              {[
                { label: 'Treinos essa semana', value: thisWeekSessions.length, icon: Flame, color: '#EF4444', bg: '#FEE2E2' },
                { label: 'Total de sessões', value: totalSessionsAll, icon: Dumbbell, color: '#8B5CF6', bg: '#F5F3FF' },
                { label: 'Completados', value: completedSessions, icon: Check, color: '#10B981', bg: '#D1FAE5' },
              ].map(s => (
                <div key={s.label} style={{ background: 'var(--bg-surface)', borderRadius: 12, padding: '16px 18px', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <s.icon size={20} color={s.color} />
                  </div>
                  <div>
                    <p style={{ margin: 0, fontSize: 22, fontWeight: 900, color: 'var(--gray-900)' }}>{s.value}</p>
                    <p style={{ margin: 0, fontSize: 11, color: 'var(--gray-400)' }}>{s.label}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Workout frequency chart */}
            {workoutSessions.length > 0 && (() => {
              // Build weekly frequency for last 12 weeks
              const weeks = [];
              const now = new Date(); now.setHours(12,0,0,0);
              for (let w = 11; w >= 0; w--) {
                const end = new Date(now); end.setDate(now.getDate() - w * 7);
                const start = new Date(end); start.setDate(end.getDate() - 6);
                const startStr = start.toISOString().slice(0,10);
                const endStr = end.toISOString().slice(0,10);
                const count = workoutSessions.filter(s => s.date >= startStr && s.date <= endStr).length;
                weeks.push({
                  label: start.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }),
                  treinos: count,
                });
              }
              const maxWeek = Math.max(...weeks.map(w => w.treinos), 1);
              return (
                <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>
                  <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
                    <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: 'var(--gray-900)' }}>Frequência de Treinos</h3>
                    <p style={{ margin: '3px 0 0', fontSize: 12, color: 'var(--gray-400)' }}>Sessões por semana — últimas 12 semanas</p>
                  </div>
                  <div style={{ padding: '16px 20px 12px' }}>
                    <ResponsiveContainer width="100%" height={140}>
                      <BarChart data={weeks} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
                        <XAxis dataKey="label" tick={{ fontSize: 9, fill: 'var(--gray-400)' }} axisLine={false} tickLine={false} interval={2} />
                        <YAxis allowDecimals={false} domain={[0, maxWeek + 1]} tick={{ fontSize: 10, fill: 'var(--gray-400)' }} axisLine={false} tickLine={false} />
                        <Tooltip
                          contentStyle={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
                          labelStyle={{ color: 'var(--gray-600)', fontWeight: 600 }}
                          formatter={(v) => [`${v} treino${v !== 1 ? 's' : ''}`, '']}
                          cursor={{ fill: 'rgba(129,140,248,0.08)' }}
                        />
                        <Bar dataKey="treinos" fill="var(--accent)" radius={[4,4,0,0]} maxBarSize={28} />
                      </BarChart>
                    </ResponsiveContainer>
                    <div style={{ display: 'flex', gap: 20, marginTop: 8 }}>
                      <div>
                        <p style={{ margin: 0, fontSize: 18, fontWeight: 900, color: 'var(--gray-900)' }}>{workoutSessions.length}</p>
                        <p style={{ margin: 0, fontSize: 11, color: 'var(--gray-400)' }}>total sessões</p>
                      </div>
                      <div>
                        <p style={{ margin: 0, fontSize: 18, fontWeight: 900, color: 'var(--accent)' }}>
                          {(weeks.slice(-4).reduce((s, w) => s + w.treinos, 0) / 4).toFixed(1)}
                        </p>
                        <p style={{ margin: 0, fontSize: 11, color: 'var(--gray-400)' }}>treinos/semana (média)</p>
                      </div>
                      <div>
                        <p style={{ margin: 0, fontSize: 18, fontWeight: 900, color: 'var(--green)' }}>
                          {workoutSessions.filter(s => s.exercises_total > 0 && s.exercises_done >= s.exercises_total).length}
                        </p>
                        <p style={{ margin: 0, fontSize: 11, color: 'var(--gray-400)' }}>treinos completos</p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Exercise progression */}
            <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
                <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: 'var(--gray-900)' }}>Evolução por exercício</h3>
                <p style={{ margin: '3px 0 0', fontSize: 12, color: 'var(--gray-400)' }}>Baseado nos pesos registrados pelo aluno</p>
              </div>
              {exerciseProgression.length === 0 ? (
                <div style={{ padding: '40px 20px', textAlign: 'center' }}>
                  <Dumbbell size={36} color="var(--border)" style={{ marginBottom: 10 }} />
                  <p style={{ margin: 0, fontSize: 14, color: 'var(--gray-400)' }}>Nenhuma evolução registrada ainda</p>
                  <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--gray-400)' }}>O aluno precisa registrar pesos em pelo menos 2 sessões</p>
                </div>
              ) : exerciseProgression.map((ex, i) => {
                const loadFirst = parseFloat(ex.first?.load);
                const loadLast = parseFloat(ex.last?.load);
                const diff = (!isNaN(loadFirst) && !isNaN(loadLast)) ? (loadLast - loadFirst) : null;
                const isUp = diff !== null && diff > 0;
                const isDown = diff !== null && diff < 0;
                return (
                  <div key={ex.name} style={{ padding: '14px 20px', borderBottom: i < exerciseProgression.length - 1 ? '1px solid var(--border-light)' : 'none', display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: '0 0 3px', fontSize: 14, fontWeight: 700, color: 'var(--gray-900)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ex.name}</p>
                      <p style={{ margin: 0, fontSize: 12, color: 'var(--gray-400)' }}>
                        {ex.first?.load} → <strong style={{ color: 'var(--gray-900)' }}>{ex.last?.load}</strong>
                        {' · '}{ex.count} registro{ex.count !== 1 ? 's' : ''}
                      </p>
                    </div>
                    {diff !== null && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 12px', borderRadius: 20, background: isUp ? 'rgba(16,185,129,0.12)' : isDown ? 'rgba(239,68,68,0.12)' : 'var(--bg-page)', flexShrink: 0 }}>
                        <TrendingUp size={13} color={isUp ? '#10B981' : isDown ? '#EF4444' : '#9CA3AF'} style={{ transform: isDown ? 'scaleY(-1)' : 'none' }} />
                        <span style={{ fontSize: 13, fontWeight: 800, color: isUp ? '#059669' : isDown ? '#DC2626' : '#6B7280' }}>
                          {isUp ? '+' : ''}{diff.toFixed(1)}kg
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Recent sessions */}
            <div style={{ background: 'var(--bg-surface)', borderRadius: 14, border: '1px solid var(--border)', overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-light)' }}>
                <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: 'var(--gray-900)' }}>Sessões recentes</h3>
              </div>
              {workoutSessions.length === 0 ? (
                <div style={{ padding: '32px', textAlign: 'center' }}>
                  <p style={{ margin: 0, fontSize: 13, color: 'var(--gray-400)' }}>Nenhuma sessão registrada ainda</p>
                </div>
              ) : workoutSessions.slice(0, 10).map((session, i) => {
                const pct = session.exercises_total > 0 ? Math.round((session.exercises_done / session.exercises_total) * 100) : 0;
                const done = pct === 100;
                return (
                  <div key={session.id} style={{ padding: '12px 20px', borderBottom: i < Math.min(workoutSessions.length, 10) - 1 ? '1px solid var(--border-light)' : 'none', display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 38, height: 38, borderRadius: 10, background: done ? '#D1FAE5' : '#FEF3C7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {done ? <Check size={18} color="#10B981" /> : <Dumbbell size={16} color="#D97706" />}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: '0 0 2px', fontSize: 13, fontWeight: 700, color: 'var(--gray-900)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{session.plan_name}</p>
                      <p style={{ margin: 0, fontSize: 11, color: 'var(--gray-400)' }}>
                        {new Date(session.date + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short' })}
                        {session.exercises_total > 0 && ` · ${session.exercises_done}/${session.exercises_total} exercícios`}
                      </p>
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 700, color: done ? '#10B981' : '#D97706', flexShrink: 0 }}>{pct}%</span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {tab === 'Visão Geral' && (() => {
        // ── Semana atual ────────────────────────────────
        const todayDt = new Date();
        const todayStr = todayDt.toISOString().slice(0, 10);
        const dayOfWeek = (todayDt.getDay() + 6) % 7; // 0 = Seg
        const DAY_LABELS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
        const weekDays = Array.from({ length: 7 }, (_, i) => {
          const d = new Date(todayDt);
          d.setDate(todayDt.getDate() - dayOfWeek + i);
          const dateStr = d.toISOString().slice(0, 10);
          const jsDay = d.getDay();
          const matchedPlan = plans.find(p => (p.days || []).includes(jsDay));
          const session = workoutSessions.find(ws => ws.date === dateStr);
          const completed = session && session.exercises_total > 0 && session.exercises_done >= session.exercises_total;
          const partial = session && !completed && session.exercises_done > 0;
          const isPast = dateStr <= todayStr;
          const isToday = dateStr === todayStr;
          return { dateStr, jsDay, label: DAY_LABELS[i], matchedPlan, session, completed, partial, isPast, isToday };
        });
        const plannedCount = weekDays.filter(d => d.matchedPlan).length;
        const completedCount = weekDays.filter(d => d.completed).length;
        const pct = plannedCount > 0 ? Math.round((completedCount / plannedCount) * 100) : null;
        const pctColor = pct === null ? '#9CA3AF' : pct >= 80 ? '#10B981' : pct >= 50 ? '#F59E0B' : '#EF4444';

        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* ── Semana Atual card ── */}
            <div style={{ background: 'var(--bg-surface)', borderRadius: 14, padding: '18px 20px', border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Calendar size={16} color="#3B82F6" />
                  <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--gray-900)' }}>Semana Atual</h3>
                </div>
                {pct !== null ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ height: 6, width: 80, borderRadius: 3, background: 'var(--border)', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: pctColor, borderRadius: 3, transition: 'width 0.6s ease' }} />
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 800, color: pctColor }}>{completedCount}/{plannedCount}</span>
                  </div>
                ) : (
                  <span style={{ fontSize: 12, color: 'var(--gray-400)' }}>Sem treinos programados</span>
                )}
              </div>

              <div className="week-days-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6 }}>
                {weekDays.map((d, i) => {
                  const gc = d.matchedPlan
                    ? (d.completed ? '#10B981' : d.partial ? '#F59E0B' : d.isPast ? '#EF4444' : '#3B82F6')
                    : '#E5E7EB';
                  const bgc = d.matchedPlan
                    ? (d.completed ? '#ECFDF5' : d.partial ? '#FFFBEB' : d.isPast ? '#FEF2F2' : '#EFF6FF')
                    : '#F9FAFB';
                  const icon = d.completed ? '✓' : d.partial ? '…' : d.matchedPlan && d.isPast ? '✗' : d.matchedPlan ? '•' : '—';
                  return (
                    <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                      <span style={{ fontSize: 10, fontWeight: 700, color: d.isToday ? '#3B82F6' : '#9CA3AF', letterSpacing: '0.04em' }}>
                        {d.label}
                      </span>
                      <div style={{
                        width: '100%', aspectRatio: '1', borderRadius: 10, background: bgc,
                        border: `2px solid ${d.isToday ? '#3B82F6' : gc}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexDirection: 'column', gap: 2,
                      }}>
                        <span style={{ fontSize: 14, fontWeight: 900, color: gc, lineHeight: 1 }}>{icon}</span>
                      </div>
                      {d.matchedPlan && (
                        <span style={{ fontSize: 9, color: 'var(--gray-400)', textAlign: 'center', lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%', fontWeight: 600 }}>
                          {d.matchedPlan.name?.split(' ').slice(0, 2).join(' ')}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Legenda */}
              <div style={{ display: 'flex', gap: 16, marginTop: 14, flexWrap: 'wrap' }}>
                {[
                  { color: '#10B981', bg: '#ECFDF5', label: 'Concluído' },
                  { color: '#F59E0B', bg: '#FFFBEB', label: 'Parcial' },
                  { color: '#EF4444', bg: '#FEF2F2', label: 'Faltou' },
                  { color: '#3B82F6', bg: '#EFF6FF', label: 'Programado' },
                ].map(l => (
                  <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <div style={{ width: 8, height: 8, borderRadius: 2, background: l.bg, border: `1.5px solid ${l.color}` }} />
                    <span style={{ fontSize: 11, color: 'var(--gray-500)' }}>{l.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* ── grade 2 colunas com o resto ── */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {/* Current plan */}
          <div style={{ background: 'var(--bg-surface)', borderRadius: 12, padding: 20, border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <Dumbbell size={16} color="#8B5CF6" />
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--gray-900)' }}>Treino Atual</h3>
            </div>
            {plans.length === 0 ? (
              <p style={{ color: 'var(--gray-400)', fontSize: 13, textAlign: 'center', padding: '20px 0' }}>Nenhum plano criado</p>
            ) : plans.slice(0, 1).map(plan => (
              <div key={plan.id}>
                <p style={{ margin: '0 0 8px', fontSize: 14, fontWeight: 700, color: 'var(--gray-700)' }}>{plan.name}</p>
                <p style={{ margin: '0 0 10px', fontSize: 12, color: 'var(--gray-400)' }}>
                  {(plan.days || []).map(d => ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'][d]).join(', ')}
                </p>
                <p style={{ margin: 0, fontSize: 12, color: 'var(--gray-500)' }}>{(plan.exercises || []).length} exercícios</p>
              </div>
            ))}
          </div>

          {/* Recent appointments */}
          <div style={{ background: 'var(--bg-surface)', borderRadius: 12, padding: 20, border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <Calendar size={16} color="#3B82F6" />
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--gray-900)' }}>Próximas Aulas</h3>
            </div>
            {appointments.filter(a => a.date >= today && a.status !== 'cancelled').slice(0, 4).length === 0 ? (
              <p style={{ color: 'var(--gray-400)', fontSize: 13, textAlign: 'center', padding: '20px 0' }}>Sem aulas agendadas</p>
            ) : appointments.filter(a => a.date >= today && a.status !== 'cancelled').slice(0, 4).map(appt => (
              <div key={appt.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--border-light)' }}>
                <div style={{ width: 3, height: 32, borderRadius: 2, background: appt.color || '#3B82F6', flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--gray-700)' }}>
                    {new Date(appt.date+'T12:00:00').toLocaleDateString('pt-BR',{weekday:'short',day:'numeric',month:'short'})} · {(appt.time||'').slice(0,5)}
                  </p>
                  <p style={{ margin: 0, fontSize: 11, color: 'var(--gray-400)' }}>{appt.type}</p>
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
          {measurements.length > 0 && (() => {
            const firstM = measurements[0];
            const deltaWeight = lastMeasure.weight && firstM.weight ? (parseFloat(lastMeasure.weight) - parseFloat(firstM.weight)).toFixed(1) : null;
            const chartData = [...measurements].sort((a, b) => new Date(a.date) - new Date(b.date));
            const firstDate = chartData[0]?.date ? new Date(chartData[0].date + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }) : '';
            const lastDate = chartData[chartData.length - 1]?.date ? new Date(chartData[chartData.length - 1].date + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }) : '';
            const hasChart = chartData.filter(d => parseFloat(d[chartMetric]) > 0).length >= 2;
            return (
              <div style={{ background: 'var(--bg-surface)', borderRadius: 12, padding: 20, border: '1px solid var(--border)' }}>
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                  <BarChart2 size={16} color="var(--accent)" />
                  <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--gray-900)' }}>Evolução de Medições</h3>
                  <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--gray-400)' }}>{measurements.length} registro{measurements.length !== 1 ? 's' : ''}</span>
                </div>

                {/* Current values grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: 16 }}>
                  {[['Peso','weight','kg'],['Cintura','waist','cm'],['BF','body_fat','%'],['Peito','chest','cm'],['Braço','arm','cm'],['Quadril','hip','cm']].map(([label,key,unit]) =>
                    lastMeasure[key] ? (
                      <div key={key} style={{ textAlign: 'center', background: 'var(--bg-page)', borderRadius: 8, padding: '8px 4px', border: '1px solid var(--border)' }}>
                        <p style={{ margin: 0, fontSize: 15, fontWeight: 800, color: 'var(--gray-900)' }}>{lastMeasure[key]}{unit}</p>
                        <p style={{ margin: '2px 0 0', fontSize: 10, color: 'var(--gray-400)', fontWeight: 600 }}>{label}</p>
                      </div>
                    ) : null
                  )}
                </div>

                {/* Delta */}
                {deltaWeight !== null && (
                  <p style={{ margin: '0 0 14px', fontSize: 12, color: parseFloat(deltaWeight) < 0 ? 'var(--green)' : parseFloat(deltaWeight) > 0 ? 'var(--red)' : 'var(--gray-400)', fontWeight: 600 }}>
                    {parseFloat(deltaWeight) > 0 ? '+' : ''}{deltaWeight}kg desde o início
                  </p>
                )}

                {/* Metric selector pills */}
                {chartData.length >= 2 && (
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
                    {Object.entries(METRIC_LABELS).map(([key, label]) => (
                      <button key={key} onClick={() => setChartMetric(key)}
                        style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20,
                          background: chartMetric === key ? 'var(--accent)' : 'var(--bg-page)',
                          color: chartMetric === key ? 'white' : 'var(--gray-400)',
                          border: `1px solid ${chartMetric === key ? 'var(--accent)' : 'var(--border)'}`,
                          cursor: 'pointer' }}>
                        {label}
                      </button>
                    ))}
                  </div>
                )}

                {/* Chart */}
                {hasChart ? (
                  <div style={{ position: 'relative' }}>
                    <MiniChart data={chartData} field={chartMetric} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                      <span style={{ fontSize: 10, color: 'var(--gray-400)' }}>{firstDate}</span>
                      <span style={{ fontSize: 10, color: 'var(--gray-400)' }}>{lastDate}</span>
                    </div>
                  </div>
                ) : (
                  <p style={{ margin: 0, fontSize: 12, color: 'var(--gray-400)', fontStyle: 'italic' }}>
                    Adicione mais medições para ver evolução
                  </p>
                )}
              </div>
            );
          })()}

          {/* Notes / goal */}
          {(student.goal || student.notes) && (
            <div style={{ background: 'var(--bg-surface)', borderRadius: 12, padding: 20, border: '1px solid var(--border)' }}>
              <h3 style={{ margin: '0 0 12px', fontSize: 15, fontWeight: 700, color: 'var(--gray-900)' }}>Objetivo</h3>
              {student.goal && <p style={{ margin: '0 0 8px', fontSize: 14, color: 'var(--gray-700)', fontWeight: 600 }}>{student.goal}</p>}
              {student.notes && <p style={{ margin: 0, fontSize: 13, color: 'var(--gray-500)' }}>{student.notes}</p>}
            </div>
          )}
        </div>

            {/* ── Hidratação — full width animado ── */}
            {waterLog && (() => {
              const waterPct = Math.min(100, Math.round((waterLog.intake_ml / (waterLog.goal_ml || 2000)) * 100));
              const goalReached = waterLog.intake_ml >= (waterLog.goal_ml || 2000);
              const liters = (waterLog.intake_ml / 1000).toFixed(1);
              const goalL = ((waterLog.goal_ml || 2000) / 1000).toFixed(1);
              const cups = Math.round(waterLog.intake_ml / 250);
              const goalCups = Math.round((waterLog.goal_ml || 2000) / 250);
              return (
                <div style={{
                  background: goalReached ? 'linear-gradient(135deg, #0EA5E9 0%, #0284C7 100%)' : 'var(--bg-surface)',
                  borderRadius: 16, padding: '20px 24px',
                  boxShadow: goalReached ? '0 8px 28px rgba(2,132,199,0.32)' : 'none',
                  border: goalReached ? 'none' : '1px solid var(--border)',
                  display: 'flex', alignItems: 'center', gap: 20,
                  overflow: 'hidden', position: 'relative',
                  transition: 'background 0.6s ease, box-shadow 0.6s ease',
                }}>
                  {/* Texture when goal reached */}
                  {goalReached && (
                    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 20'%3E%3Cpath d='M0 10 Q25 0 50 10 Q75 20 100 10 L100 20 L0 20Z' fill='rgba(255,255,255,0.06)'/%3E%3C/svg%3E\") repeat-x bottom", backgroundSize: '200px 40px', animation: 'alunoWaveScroll 3s linear infinite' }} />
                  )}

                  {/* Animated water circle */}
                  <div style={{ width: 88, height: 88, borderRadius: '50%', position: 'relative', flexShrink: 0, overflow: 'hidden', border: `3px solid ${goalReached ? 'rgba(255,255,255,0.4)' : '#BAE6FD'}`, background: goalReached ? 'rgba(255,255,255,0.15)' : '#F0F9FF' }}>
                    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: `${waterPct}%`, background: goalReached ? 'rgba(255,255,255,0.3)' : 'linear-gradient(180deg, #38BDF8, #0284C7)', transition: 'height 0.8s cubic-bezier(0.34,1.56,0.64,1)' }}>
                      <div className="aluno-water-wave" style={{ position: 'absolute', top: -8, left: 0, width: '200%', height: 16, background: goalReached ? 'rgba(255,255,255,0.5)' : '#38BDF8', borderRadius: '50% 50% 0 0' }} />
                    </div>
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ fontSize: 17, fontWeight: 900, lineHeight: 1, color: waterPct > 45 ? 'white' : (goalReached ? 'rgba(255,255,255,0.85)' : '#0284C7'), textShadow: waterPct > 45 ? '0 1px 4px rgba(0,0,0,0.2)' : 'none' }}>{waterPct}%</span>
                    </div>
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 4 }}>
                      <Droplets size={15} color={goalReached ? 'rgba(255,255,255,0.9)' : '#0284C7'} />
                      <p style={{ margin: 0, fontSize: 14, fontWeight: 800, color: goalReached ? 'white' : 'var(--gray-900)' }}>
                        {goalReached ? 'Meta de água atingida' : 'Hidratação Hoje'}
                      </p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 5, marginBottom: 10 }}>
                      <span style={{ fontSize: 34, fontWeight: 900, color: goalReached ? 'white' : '#0284C7', lineHeight: 1 }}>{liters}L</span>
                      <span style={{ fontSize: 14, color: goalReached ? 'rgba(255,255,255,0.65)' : 'var(--gray-400)' }}>de {goalL}L</span>
                    </div>
                    <div style={{ height: 6, borderRadius: 99, background: goalReached ? 'rgba(255,255,255,0.25)' : 'rgba(2,132,199,0.1)', overflow: 'hidden', marginBottom: 7 }}>
                      <div style={{ height: '100%', width: `${waterPct}%`, borderRadius: 99, background: goalReached ? 'rgba(255,255,255,0.8)' : 'linear-gradient(90deg, #38BDF8, #0284C7)', transition: 'width 0.8s ease' }} />
                    </div>
                    <p style={{ margin: 0, fontSize: 12, color: goalReached ? 'rgba(255,255,255,0.7)' : 'var(--gray-500)' }}>
                      {cups} copo{cups !== 1 ? 's' : ''} de {goalCups} · atualizado pelo aluno
                    </p>
                  </div>

                  {/* Cup dots grid */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, width: 82, flexShrink: 0, alignContent: 'flex-start' }}>
                    {Array.from({ length: goalCups }).map((_, i) => (
                      <div key={i} style={{ width: 14, height: 19, borderRadius: 4, background: i < cups ? (goalReached ? 'rgba(255,255,255,0.75)' : '#0284C7') : (goalReached ? 'rgba(255,255,255,0.2)' : '#DBEAFE'), transition: 'background 0.3s ease' }} />
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* ── Nutrição — full width ── */}
            <div style={{ background: 'var(--bg-surface)', borderRadius: 16, padding: '18px 24px', border: '1px solid rgba(16,185,129,0.3)', display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ width: 50, height: 50, borderRadius: 14, background: 'linear-gradient(135deg, #D1FAE5, #A7F3D0)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Utensils size={22} color="#059669" />
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ margin: '0 0 3px', fontSize: 15, fontWeight: 800, color: 'var(--gray-900)' }}>Plano Alimentar</p>
                <p style={{ margin: 0, fontSize: 12, color: 'var(--gray-500)' }}>Crie e edite a nutrição personalizada deste aluno</p>
              </div>
              <button onClick={() => navigate(`/dashboard/alunos/${id}/nutricao`)} style={{ flexShrink: 0, padding: '9px 18px', borderRadius: 10, border: 'none', background: '#059669', color: 'white', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Utensils size={14} /> Abrir plano
              </button>
            </div>

            <style>{`
              .aluno-water-wave { animation: alunoWaveScroll 1.8s linear infinite; }
              @keyframes alunoWaveScroll { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
            `}</style>
      </div>
    );
      })()}

      {tab === 'Agenda' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Frequência do mês */}
          <div style={{ background: 'var(--bg-surface)', borderRadius: 12, padding: 20, border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--gray-900)' }}>
                Frequência — {new Date().toLocaleDateString('pt-BR',{month:'long',year:'numeric'})}
              </h3>
              {attendRate !== null && (
                <span style={{ fontSize: 13, fontWeight: 700, color: attendRate >= 70 ? 'var(--green)' : 'var(--yellow)' }}>
                  {attendRate}% de presença
                </span>
              )}
            </div>
            {attendances.length === 0 ? (
              <p style={{ color: 'var(--gray-400)', fontSize: 13, textAlign: 'center', padding: '20px 0' }}>Nenhum registro este mês</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {attendances.map(a => (
                  <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 10, background: a.status === 'present' ? '#F0FDF4' : '#FEF2F2', border: `1px solid ${a.status === 'present' ? '#BBF7D0' : '#FECACA'}` }}>
                    {a.status === 'present' ? <Check size={16} color="var(--green)" /> : <X size={16} color="var(--red)" />}
                    <span style={{ fontSize: 14, color: 'var(--gray-700)', fontWeight: 500, flex: 1 }}>
                      {new Date(a.date+'T12:00:00').toLocaleDateString('pt-BR',{weekday:'long',day:'numeric',month:'long'})}
                    </span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: a.status === 'present' ? 'var(--green)' : 'var(--red)' }}>
                      {a.status === 'present' ? 'Presente' : 'Faltou'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Histórico de aulas */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <h3 style={{ margin: '4px 0 0', fontSize: 13, fontWeight: 700, color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Histórico de Aulas</h3>
            {appointments.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--gray-400)' }}>
                <Calendar size={32} color="var(--border)" style={{ marginBottom: 10 }} />
                <p style={{ margin: '0 0 14px', fontSize: 15, fontWeight: 600, color: 'var(--gray-700)' }}>Nenhuma aula agendada</p>
                <button onClick={() => setScheduleModal(true)} className="btn-primary">Agendar Aula</button>
              </div>
            ) : appointments.map(appt => (
              <div key={appt.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', background: 'var(--bg-surface)', borderRadius: 12, border: '1px solid var(--border)', borderLeft: `4px solid ${appt.color || 'var(--accent)'}` }}>
                <div style={{ minWidth: 60, textAlign: 'center' }}>
                  <p style={{ margin: 0, fontSize: 17, fontWeight: 800, color: appt.color || 'var(--accent)', lineHeight: 1 }}>{(appt.time||'').slice(0,5)}</p>
                  <p style={{ margin: '2px 0 0', fontSize: 10, color: 'var(--gray-400)', fontWeight: 600 }}>
                    {new Date(appt.date+'T12:00:00').toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit'})}
                  </p>
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: 'var(--gray-700)' }}>{appt.type}</p>
                  {appt.notes && <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--gray-400)' }}>{appt.notes}</p>}
                </div>
                <span style={{
                  fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 20,
                  background: appt.status === 'done' ? '#ECFDF5' : appt.status === 'cancelled' ? '#FEF2F2' : '#FFFBEB',
                  color: appt.status === 'done' ? 'var(--green)' : appt.status === 'cancelled' ? 'var(--red)' : 'var(--yellow)',
                }}>
                  {appt.status === 'done' ? '✓ Realizada' : appt.status === 'cancelled' ? '✗ Cancelada' : '● Agendada'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'Saúde' && (() => {
        const d = anamnese?.data || null;
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Nutrição */}
            <div style={{ background: 'var(--bg-surface)', borderRadius: 14, padding: '20px 24px', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ width: 48, height: 48, borderRadius: 14, background: 'var(--accent-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Utensils size={22} color="var(--accent)" />
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ margin: '0 0 3px', fontSize: 15, fontWeight: 800, color: 'var(--gray-900)' }}>Plano Alimentar</p>
                <p style={{ margin: 0, fontSize: 12, color: 'var(--gray-400)' }}>Crie e edite o plano nutricional personalizado</p>
              </div>
              <button onClick={() => navigate(`/dashboard/alunos/${id}/nutricao`)} className="btn-primary" style={{ flexShrink: 0, fontSize: 13 }}>
                Abrir editor
              </button>
            </div>

            {/* Check-ins recentes */}
            {checkins.length > 0 && (
              <div style={{ background: 'var(--bg-surface)', borderRadius: 12, padding: 24, border: '1px solid var(--border)' }}>
                <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 700, color: 'var(--gray-900)' }}>Check-ins Recentes</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {checkins.map((c, idx) => (
                    <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: idx < checkins.length - 1 ? '1px solid var(--border-light)' : 'none' }}>
                      <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: 'var(--gray-400)', width: 64, flexShrink: 0 }}>
                        {new Date(c.date + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short' })}
                      </p>
                      <div style={{ display: 'flex', gap: 6, flex: 1, flexWrap: 'wrap' }}>
                        {[
                          { label: 'Humor',   value: c.mood,          invert: false },
                          { label: 'Energia', value: c.energy,        invert: false },
                          { label: 'Sono',    value: c.sleep_quality, invert: false },
                          { label: 'Dores',   value: c.soreness,      invert: true  },
                        ].map(m => {
                          const v = m.value || 3;
                          const score = m.invert ? 6 - v : v;
                          const color = score <= 2 ? 'var(--red)' : score === 3 ? 'var(--yellow)' : 'var(--green)';
                          return (
                            <span key={m.label} style={{ fontSize: 10, fontWeight: 700, color, background: color + '14', padding: '3px 7px', borderRadius: 6, whiteSpace: 'nowrap' }}>
                              {m.label} {v}/5
                            </span>
                          );
                        })}
                      </div>
                      {c.notes && <p style={{ margin: 0, fontSize: 12, color: 'var(--gray-400)', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.notes}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Ficha de saúde */}
            <div style={{ background: 'var(--bg-surface)', borderRadius: 12, padding: 24, border: '1px solid var(--border)' }}>
              <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 700, color: 'var(--gray-900)' }}>Ficha de Saúde</h3>
              {!d ? (
                <p style={{ color: 'var(--gray-400)', fontSize: 13, textAlign: 'center', padding: '24px 0' }}>Aluno ainda não preencheu a ficha de saúde</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {d.fullName && <InfoRow label="Nome completo" value={d.fullName} />}
                  {d.birthDate && <InfoRow label="Data de nascimento" value={new Date(d.birthDate+'T12:00:00').toLocaleDateString('pt-BR')} />}
                  {(d.height || d.weightInitial) && <InfoRow label="Altura / Peso inicial" value={`${d.height || '—'}cm / ${d.weightInitial || '—'}kg`} />}
                  {d.goal && <InfoRow label="Objetivo" value={d.goal} />}
                  {d.goalDetail && <InfoRow label="Detalhes do objetivo" value={d.goalDetail} />}
                  {d.activityLevel && <InfoRow label="Nível de atividade" value={d.activityLevel} />}
                  {d.diseases?.length > 0 && <InfoRow label="Doenças pré-existentes" value={d.diseases.join(', ')} />}
                  {d.medications && <InfoRow label="Medicamentos" value={d.medications} />}
                  {d.injuries?.length > 0 && <InfoRow label="Lesões / restrições" value={d.injuries.join(', ')} />}
                  {d.injuryDetails && <InfoRow label="Detalhes das lesões" value={d.injuryDetails} />}
                  {d.limitations && <InfoRow label="Limitações físicas" value={d.limitations} />}
                  {d.sleepHours && <InfoRow label="Horas de sono" value={`${d.sleepHours}h`} />}
                  {d.stressLevel && <InfoRow label="Nível de estresse" value={`${d.stressLevel}/10`} />}
                  {d.waterLiters && <InfoRow label="Ingestão de água" value={`${d.waterLiters}L/dia`} />}
                  {d.diet && <InfoRow label="Alimentação atual" value={d.diet} />}
                  {d.phone && <InfoRow label="Telefone" value={d.phone} />}
                  {d.emergency && <InfoRow label="Contato de emergência" value={d.emergency} />}
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {tab === 'Financeiro' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Pagamentos */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <h3 style={{ margin: '4px 0 0', fontSize: 13, fontWeight: 700, color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Pagamentos</h3>
            {payments.length === 0 ? (
              <p style={{ color: 'var(--gray-400)', fontSize: 13, textAlign: 'center', padding: '24px 0' }}>Nenhum registro de pagamento</p>
            ) : payments.map(p => (
              <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', background: 'var(--bg-surface)', borderRadius: 12, border: '1px solid var(--border)' }}>
                <div style={{ flex: 1 }}>
                  <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--gray-900)' }}>R$ {Number(p.amount).toLocaleString('pt-BR')}</p>
                  <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--gray-400)' }}>Venc. {new Date(p.due_date+'T12:00:00').toLocaleDateString('pt-BR')}</p>
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

          {/* Feedback */}
          {ratings.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <h3 style={{ margin: '4px 0 0', fontSize: 13, fontWeight: 700, color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Feedback do Aluno</h3>
              {ratings.map(r => {
                const FEELINGS = { otimo: 'Ótimo', bem: 'Bem', regular: 'Regular', cansado: 'Cansado', mal: 'Mal' };
                return (
                  <div key={r.id} style={{ background: 'var(--bg-surface)', borderRadius: 12, padding: '14px 18px', border: '1px solid var(--border)', display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                    <div style={{ minWidth: 56, textAlign: 'center' }}>
                      <p style={{ margin: '0 0 2px', fontSize: 11, color: 'var(--gray-400)', fontWeight: 600 }}>
                        {new Date(r.date+'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                      </p>
                      <div style={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                        {[1,2,3,4,5].map(n => (
                          <Star key={n} size={13} fill={r.rating >= n ? 'var(--yellow)' : 'none'} color={r.rating >= n ? 'var(--yellow)' : 'var(--border)'} strokeWidth={1.5} />
                        ))}
                      </div>
                    </div>
                    <div style={{ flex: 1 }}>
                      {r.feeling && <p style={{ margin: '0 0 4px', fontSize: 13, fontWeight: 600, color: 'var(--gray-700)' }}>{FEELINGS[r.feeling] || r.feeling}</p>}
                      {r.notes && <p style={{ margin: 0, fontSize: 12, color: 'var(--gray-600)' }}>{r.notes}</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Edit student modal */}
      <Modal isOpen={editModal} onClose={() => setEditModal(false)} title="Editar Aluno">
        <form onSubmit={handleEditSave}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label>Nome *</label>
              <input value={editForm.name || ''} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} required />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label>Telefone</label>
                <input value={editForm.phone || ''} onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))} placeholder="(11) 99999-9999" />
              </div>
              <div>
                <label>E-mail</label>
                <input type="email" value={editForm.email || ''} onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))} />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label>Plano</label>
                <select value={editForm.plan || ''} onChange={e => setEditForm(f => ({ ...f, plan: e.target.value }))}>
                  <option value="">Selecionar...</option>
                  <option>Mensal</option>
                  <option>Trimestral</option>
                  <option>Semestral</option>
                  <option>Anual</option>
                </select>
              </div>
              <div>
                <label>Valor do Plano (R$)</label>
                <input type="number" min="0" step="0.01" value={editForm.plan_price || ''} onChange={e => setEditForm(f => ({ ...f, plan_price: e.target.value }))} placeholder="0,00" />
              </div>
            </div>
            <div>
              <label>Objetivo</label>
              <input value={editForm.goal || ''} onChange={e => setEditForm(f => ({ ...f, goal: e.target.value }))} placeholder="Ex: Hipertrofia, Emagrecimento..." />
            </div>
            <div>
              <label>Status</label>
              <select value={editForm.status || 'ativo'} onChange={e => setEditForm(f => ({ ...f, status: e.target.value }))}>
                <option value="ativo">Ativo</option>
                <option value="inativo">Inativo</option>
                <option value="pendente">Pendente</option>
              </select>
            </div>
            <div>
              <label>Observações</label>
              <textarea value={editForm.notes || ''} onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))} rows={3} placeholder="Anotações internas..." style={{ resize: 'vertical' }} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
            <button type="button" className="btn-secondary" onClick={() => setEditModal(false)}>Cancelar</button>
            <button type="submit" className="btn-primary" disabled={editSaving}>{editSaving ? 'Salvando...' : 'Salvar'}</button>
          </div>
        </form>
      </Modal>

      {/* Quick schedule modal */}
      <Modal isOpen={scheduleModal} onClose={() => setScheduleModal(false)} title="Agendar Aula">
        <form onSubmit={handleSchedule}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <p style={{ margin: 0, fontSize: 14, color: 'var(--gray-700)' }}>Aluno: <strong>{student.name}</strong></p>
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
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
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
    <div style={{ paddingBottom: 14, borderBottom: '1px solid var(--border-light)' }}>
      <p style={{ margin: '0 0 4px', fontSize: 11, fontWeight: 700, color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</p>
      <p style={{ margin: 0, fontSize: 14, color: 'var(--gray-700)' }}>{value}</p>
    </div>
  );
}


