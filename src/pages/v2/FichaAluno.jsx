import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Calendar, DollarSign, Activity, TrendingUp, Droplets,
  Mail, Phone, Pencil, MessageCircle, FileText, Dumbbell, Utensils, Check,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { supabase, hasSupabase } from '../../lib/supabase';
import { toast } from '../../lib/toast';
import { todayLocal, toLocalDateStr } from '../../lib/date';
import { useScopedLoader } from '../../hooks/useScopedLoader';
import ModalV2 from '../../components/v2/Modal';

const TYPE_COLORS = {
  Musculação: '#4F46E5', Funcional: '#059669', Hipertrofia: '#7C3AED',
  Cardio: '#D97706', Yoga: '#DB2777', Pilates: '#0891B2', Força: '#DC2626',
};
const AVATAR_COLORS = ['#4F46E5', '#059669', '#7C3AED', '#D97706', '#DC2626', '#DB2777', '#0891B2'];
const DAY_NAMES = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const METRIC_LABELS = { weight: 'Peso', waist: 'Cintura', chest: 'Peito', arm: 'Braço', hip: 'Quadril', body_fat: 'BF%' };

function avatarColor(id) { return AVATAR_COLORS[String(id).charCodeAt(0) % AVATAR_COLORS.length]; }

async function loadStudentProfile(id, personalId) {
  const today = todayLocal();
  const monthStart = `${today.slice(0, 7)}-01`;
  const [{ data: s }, { data: p }, { data: appts }, { data: atts }, { data: pays }, { data: meas }, { data: wl }] = await Promise.all([
    supabase.from('students').select('*').eq('id', id).eq('personal_id', personalId).maybeSingle(),
    supabase.from('training_plans').select('*, exercises(*)').eq('student_id', id).order('created_at', { ascending: false }),
    supabase.from('appointments').select('*').eq('student_id', id).order('date', { ascending: false }).limit(20),
    supabase.from('attendances').select('*').eq('student_id', id).gte('date', monthStart).order('date'),
    supabase.from('payments').select('*').eq('student_id', id).order('due_date', { ascending: false }).limit(10),
    supabase.from('student_measurements').select('*').eq('student_id', id).order('recorded_at').limit(10),
    supabase.from('water_logs').select('intake_ml, goal_ml').eq('student_id', id).eq('date', today).maybeSingle(),
  ]);
  return {
    student: s, plans: p || [], appointments: appts || [], attendances: atts || [],
    payments: pays || [], measurements: (meas || []).map(m => ({ ...m, date: m.recorded_at || m.date })), waterLog: wl || null,
  };
}

function StatBox({ icon: Icon, label, value, color, bg }) {
  return (
    <div className="bg-white border border-ink-100 rounded-xl p-3.5 flex items-center gap-3">
      <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: bg, color }}>
        <Icon size={17} />
      </div>
      <div className="min-w-0">
        <p className="text-[10.5px] text-ink-400 font-medium">{label}</p>
        <p className="text-[15px] font-bold text-ink-900 truncate">{value}</p>
      </div>
    </div>
  );
}

function MiniChart({ data, field }) {
  const vals = data.map(d => parseFloat(d[field]) || 0).filter(v => v > 0);
  if (vals.length < 2) return <p className="text-[12px] text-ink-400 italic">Adicione mais medições pra ver a evolução.</p>;
  const min = Math.min(...vals), max = Math.max(...vals), range = max - min || 1;
  const W = 300, H = 64, PAD = 8;
  const points = vals.map((v, i) => {
    const x = PAD + (i / (vals.length - 1)) * (W - PAD * 2);
    const y = H - PAD - ((v - min) / range) * (H - PAD * 2);
    return [x, y];
  });
  const polyline = points.map(p => p.join(',')).join(' ');
  const area = `${PAD},${H - PAD} ${polyline} ${W - PAD},${H - PAD}`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full block" style={{ height: 64 }} preserveAspectRatio="none">
      <polygon points={area} fill="rgba(79,70,229,0.08)" />
      <polyline points={polyline} fill="none" stroke="#4F46E5" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      {points.map(([x, y], i) => <circle key={i} cx={x} cy={y} r="3" fill="#4F46E5" />)}
    </svg>
  );
}

export default function FichaAlunoV2() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [chartMetric, setChartMetric] = useState('weight');
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [schedForm, setSchedForm] = useState({ date: todayLocal(), time: '08:00', type: 'Musculação' });

  const { data, loading, setData } = useScopedLoader(id, (studentId) => loadStudentProfile(studentId, user.id));

  if (loading || !data) return <div className="py-24 text-center text-sm text-ink-400">Carregando...</div>;
  const { student, plans, appointments, attendances, payments, measurements, waterLog } = data;

  if (!student) {
    return (
      <div className="py-24 text-center">
        <p className="text-sm text-ink-500 mb-4">Aluno não encontrado.</p>
        <button onClick={() => navigate('/v2/alunos')} className="px-4 py-2 rounded-lg bg-brand-600 text-white text-sm font-semibold">Voltar</button>
      </div>
    );
  }

  const today = todayLocal();
  const monthStart = `${today.slice(0, 7)}-01`;
  const color = student.color || avatarColor(student.id);
  const initials = student.name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
  const presentThisMonth = attendances.filter(a => a.status === 'present').length;
  const totalAppts = appointments.filter(a => a.date >= monthStart && a.date <= today).length;
  const attendRate = totalAppts > 0 ? Math.round(Math.min((presentThisMonth / totalAppts) * 100, 100)) : null;
  const nextAppt = appointments.find(a => a.date >= today && a.status !== 'cancelled');
  const upcomingAppts = appointments.filter(a => a.date >= today && a.status !== 'cancelled').slice(0, 5);
  const lastMeasure = measurements.slice(-1)[0];
  const latePay = payments.filter(p => p.status === 'pendente' && p.due_date < today);
  const currentPlan = plans[0];
  const hasChart = measurements.filter(m => parseFloat(m[chartMetric]) > 0).length >= 2;

  const openEdit = () => {
    setEditForm({
      name: student.name || '', phone: student.phone || '', email: student.email || '',
      plan: student.plan || '', plan_price: student.plan_price || '', goal: student.goal || '',
      notes: student.notes || '', status: student.status || 'ativo',
    });
    setEditOpen(true);
  };

  const handleEditSave = async () => {
    const updates = {
      name: editForm.name, phone: editForm.phone, email: editForm.email, plan: editForm.plan,
      plan_price: editForm.plan_price ? Number(editForm.plan_price) : null,
      goal: editForm.goal, notes: editForm.notes, status: editForm.status,
    };
    const { error } = await supabase.from('students').update(updates).eq('id', id);
    if (error) { toast.error('Não foi possível salvar.'); return; }
    setData(prev => ({ ...prev, student: { ...prev.student, ...updates } }));
    setEditOpen(false);
    toast.success('Aluno atualizado!');
  };

  const handleSchedule = async () => {
    const newAppt = {
      personal_id: user.id, student_id: student.id, student_name: student.name,
      date: schedForm.date, time: schedForm.time, type: schedForm.type,
      status: 'pending', color: TYPE_COLORS[schedForm.type] || '#4F46E5',
    };
    const { data: appt, error } = await supabase.from('appointments').insert(newAppt).select().single();
    if (error) { toast.error('Não foi possível agendar.'); return; }
    setData(prev => ({ ...prev, appointments: [appt, ...prev.appointments] }));
    setScheduleOpen(false);
    toast.success('Aula agendada!');
  };

  const handleMarkDone = async (appt) => {
    await supabase.from('appointments').update({ status: 'done' }).eq('id', appt.id);
    await supabase.from('attendances').upsert({ personal_id: user.id, student_id: appt.student_id, appointment_id: appt.id, date: appt.date, status: 'present' }, { onConflict: 'student_id,date' });
    setData(prev => ({ ...prev, appointments: prev.appointments.map(a => a.id === appt.id ? { ...a, status: 'done' } : a) }));
  };

  return (
    <div className="flex flex-col gap-5">
      <button onClick={() => navigate('/v2/alunos')} className="self-start flex items-center gap-1.5 text-[13px] font-semibold text-ink-500 hover:text-ink-700">
        <ArrowLeft size={14} /> Alunos
      </button>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-16 h-16 rounded-full flex items-center justify-center text-white font-bold text-xl shrink-0" style={{ background: color }}>
            {initials}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl font-bold text-ink-900">{student.name}</h2>
              <span className={`text-[10.5px] font-bold px-2 py-0.5 rounded-full ${student.status === 'ativo' ? 'bg-success-50 text-success-500' : 'bg-warning-50 text-warning-500'}`}>
                {student.status === 'ativo' ? 'Ativo' : 'Pendente'}
              </span>
              {latePay.length > 0 && <span className="text-[10.5px] font-bold px-2 py-0.5 rounded-full bg-danger-50 text-danger-500">Pagamento atrasado</span>}
            </div>
            <p className="text-[13px] text-ink-500 mt-0.5">
              {student.goal && `${student.goal} · `}Plano {student.plan || '—'}
            </p>
            <div className="flex gap-3 mt-1 flex-wrap">
              {student.email && <span className="flex items-center gap-1 text-[12px] text-ink-400"><Mail size={12} /> {student.email}</span>}
              {student.phone && <span className="flex items-center gap-1 text-[12px] text-ink-400"><Phone size={12} /> {student.phone}</span>}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={openEdit} className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-ink-200 text-[12.5px] font-semibold text-ink-700 hover:bg-ink-50">
            <Pencil size={13} /> Editar
          </button>
          {student.phone && (
            <a href={`https://wa.me/55${student.phone.replace(/\D/g, '')}`} target="_blank" rel="noreferrer"
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-success-50 text-success-500 text-[12.5px] font-semibold hover:bg-success-50/80">
              <MessageCircle size={13} /> WhatsApp
            </a>
          )}
          <button onClick={() => setScheduleOpen(true)} className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-brand-600 text-white text-[12.5px] font-semibold hover:bg-brand-700">
            <Calendar size={13} /> Agendar
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-2.5">
        <StatBox icon={Calendar} label="Próxima aula" value={nextAppt ? new Date(nextAppt.date + 'T12:00:00').toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' }) : '—'} color="#2563EB" bg="#EFF6FF" />
        <StatBox icon={Activity} label="Frequência" value={attendRate !== null ? `${attendRate}%` : '—'} color="#059669" bg="#ECFDF5" />
        <StatBox icon={DollarSign} label="Pagamentos" value={latePay.length === 0 ? 'Em dia' : `${latePay.length} atraso`} color={latePay.length ? '#DC2626' : '#059669'} bg={latePay.length ? '#FEF2F2' : '#ECFDF5'} />
        <StatBox icon={TrendingUp} label="Peso atual" value={lastMeasure?.weight ? `${lastMeasure.weight}kg` : '—'} color="#7C3AED" bg="#F5F3FF" />
        <StatBox icon={Droplets} label="Água hoje" value={waterLog ? `${(waterLog.intake_ml / 1000).toFixed(1)}L` : '—'} color="#0891B2" bg="#ECFEFF" />
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="bg-white border border-ink-100 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[13px] font-bold text-ink-900">Treino atual</p>
            <button onClick={() => navigate(`/v2/treinos?aluno=${id}`)} className="text-[12px] font-semibold text-brand-600 hover:text-brand-700">Abrir em Treinos</button>
          </div>
          {!currentPlan ? (
            <div className="py-8 text-center">
              <Dumbbell size={28} className="text-ink-200 mx-auto mb-2" />
              <p className="text-[13px] text-ink-500">Nenhum treino atribuído ainda.</p>
            </div>
          ) : (
            <div>
              <p className="text-[13.5px] font-semibold text-ink-900">{currentPlan.name}</p>
              <p className="text-[11.5px] text-ink-400 mb-2">
                {(currentPlan.days || []).map(d => DAY_NAMES[d]).join(', ') || 'Sem dia definido'} · {(currentPlan.exercises || []).length} exercícios
              </p>
              <div className="flex flex-col gap-1">
                {(currentPlan.exercises || []).slice(0, 5).map((ex, i) => (
                  <div key={i} className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-ink-50 text-[12.5px]">
                    <span className="flex-1 text-ink-800 truncate">{ex.name}</span>
                    <span className="text-ink-400 shrink-0">{ex.sets}x{ex.reps}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="bg-white border border-ink-100 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[13px] font-bold text-ink-900">Próximas aulas</p>
          </div>
          {upcomingAppts.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-[13px] text-ink-500">Nenhuma aula agendada.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              {upcomingAppts.map(a => (
                <div key={a.id} className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-ink-50">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ background: a.color || '#4F46E5' }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[12.5px] font-semibold text-ink-900">
                      {new Date(a.date + 'T12:00:00').toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })} · {a.time}
                    </p>
                    <p className="text-[11px] text-ink-400">{a.type}</p>
                  </div>
                  {a.status !== 'done' && (
                    <button onClick={() => handleMarkDone(a)} className="shrink-0 flex items-center gap-1 px-2 py-1 rounded-full bg-success-50 text-success-500 text-[11px] font-semibold hover:bg-success-50/70">
                      <Check size={11} /> Concluir
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="bg-white border border-ink-100 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[13px] font-bold text-ink-900">Medidas</p>
          </div>
          {measurements.length === 0 ? (
            <p className="text-[13px] text-ink-500 py-4 text-center">Nenhuma medição registrada.</p>
          ) : (
            <>
              <div className="flex flex-wrap gap-1.5 mb-3">
                {Object.entries(METRIC_LABELS).map(([key, label]) => (
                  <button key={key} onClick={() => setChartMetric(key)}
                    className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border ${chartMetric === key ? 'bg-brand-600 border-brand-600 text-white' : 'bg-white border-ink-200 text-ink-500'}`}>
                    {label}
                  </button>
                ))}
              </div>
              {hasChart ? <MiniChart data={measurements} field={chartMetric} /> : <p className="text-[12px] text-ink-400 italic">Adicione mais medições pra ver a evolução.</p>}
            </>
          )}
        </div>

        <button
          onClick={() => navigate(`/v2/nutricao?aluno=${id}`)}
          className="bg-white border border-success-500/20 rounded-xl p-4 flex items-center gap-3.5 text-left hover:border-success-500/40 transition-colors"
        >
          <div className="w-11 h-11 rounded-xl bg-success-50 flex items-center justify-center shrink-0">
            <Utensils size={20} className="text-success-500" />
          </div>
          <div className="flex-1">
            <p className="text-[14px] font-bold text-ink-900">Plano alimentar</p>
            <p className="text-[12px] text-ink-500">Crie e edite a nutrição personalizada deste aluno.</p>
          </div>
        </button>
      </div>

      <ModalV2
        isOpen={editOpen}
        onClose={() => setEditOpen(false)}
        title="Editar aluno"
        footer={
          <>
            <button onClick={() => setEditOpen(false)} className="px-4 py-2 rounded-lg text-sm font-medium text-ink-500 hover:bg-ink-50">Cancelar</button>
            <button onClick={handleEditSave} className="px-4 py-2 rounded-lg bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700">Salvar</button>
          </>
        }
      >
        <div className="flex flex-col gap-3.5">
          {[
            { k: 'name', l: 'Nome completo' }, { k: 'phone', l: 'Telefone' }, { k: 'email', l: 'E-mail' },
            { k: 'plan', l: 'Plano' }, { k: 'plan_price', l: 'Valor (R$)', type: 'number' }, { k: 'goal', l: 'Objetivo' },
          ].map(f => (
            <div key={f.k}>
              <label className="block text-xs font-semibold text-ink-700 mb-1.5">{f.l}</label>
              <input
                type={f.type || 'text'}
                value={editForm[f.k] || ''}
                onChange={(e) => setEditForm(p => ({ ...p, [f.k]: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-ink-200 text-sm text-ink-900 outline-none focus:border-brand-500"
              />
            </div>
          ))}
          <div>
            <label className="block text-xs font-semibold text-ink-700 mb-1.5">Status</label>
            <select value={editForm.status || 'ativo'} onChange={(e) => setEditForm(p => ({ ...p, status: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-ink-200 text-sm text-ink-900 outline-none">
              <option value="ativo">Ativo</option>
              <option value="pendente">Pendente</option>
              <option value="inativo">Inativo</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-ink-700 mb-1.5">Observações</label>
            <textarea rows={2} value={editForm.notes || ''} onChange={(e) => setEditForm(p => ({ ...p, notes: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-ink-200 text-sm text-ink-900 outline-none" />
          </div>
        </div>
      </ModalV2>

      <ModalV2
        isOpen={scheduleOpen}
        onClose={() => setScheduleOpen(false)}
        title="Agendar aula"
        footer={
          <>
            <button onClick={() => setScheduleOpen(false)} className="px-4 py-2 rounded-lg text-sm font-medium text-ink-500 hover:bg-ink-50">Cancelar</button>
            <button onClick={handleSchedule} className="px-4 py-2 rounded-lg bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700">Agendar</button>
          </>
        }
      >
        <div className="flex flex-col gap-3.5">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-ink-700 mb-1.5">Data</label>
              <input type="date" value={schedForm.date} onChange={(e) => setSchedForm(p => ({ ...p, date: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-ink-200 text-sm text-ink-900 outline-none" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink-700 mb-1.5">Horário</label>
              <input type="time" value={schedForm.time} onChange={(e) => setSchedForm(p => ({ ...p, time: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-ink-200 text-sm text-ink-900 outline-none" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-ink-700 mb-1.5">Tipo</label>
            <select value={schedForm.type} onChange={(e) => setSchedForm(p => ({ ...p, type: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-ink-200 text-sm text-ink-900 outline-none">
              {Object.keys(TYPE_COLORS).map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>
      </ModalV2>
    </div>
  );
}
