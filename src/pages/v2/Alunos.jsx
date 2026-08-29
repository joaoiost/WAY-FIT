import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, Plus, Pencil, Trash2, Smartphone, AlertTriangle, Clock,
  Copy, Check, MessageCircle, ExternalLink,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { supabase, hasSupabase } from '../../lib/supabase';
import { toast } from '../../lib/toast';
import { todayLocal, toLocalDateStr } from '../../lib/date';
import ModalV2 from '../../components/v2/Modal';

const COLORS = ['#4F46E5', '#059669', '#7C3AED', '#D97706', '#DC2626', '#DB2777', '#0891B2'];
const WEEKDAY_LETTERS = ['S', 'T', 'Q', 'Q', 'S', 'S', 'D'];

function getInitials(name = '') {
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase() || '?';
}

function Avatar({ student, size = 40 }) {
  return (
    <div
      className="rounded-full flex items-center justify-center font-bold text-white shrink-0"
      style={{ width: size, height: size, fontSize: size * 0.34, background: student.color || '#64748B' }}
    >
      {student.initials || getInitials(student.name)}
    </div>
  );
}

function StatusBadge({ status }) {
  const map = {
    ativo: 'bg-success-50 text-success-500',
    pendente: 'bg-warning-50 text-warning-500',
    inativo: 'bg-ink-100 text-ink-500',
  };
  const label = { ativo: 'Ativo', pendente: 'Pendente', inativo: 'Inativo' }[status] || status;
  return <span className={`text-[10.5px] font-bold px-2 py-0.5 rounded-full shrink-0 ${map[status] || 'bg-ink-100 text-ink-500'}`}>{label}</span>;
}

function WeekDots({ sessionDates }) {
  const today = new Date();
  const dayOfWeek = (today.getDay() + 6) % 7;
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - dayOfWeek);

  return (
    <div className="flex items-center gap-[3px]" title="Treinos essa semana">
      {WEEKDAY_LETTERS.map((_, i) => {
        const d = new Date(weekStart);
        d.setDate(weekStart.getDate() + i);
        const trained = sessionDates.has(toLocalDateStr(d));
        const isFuture = d > today;
        return (
          <span
            key={i}
            className={`w-[7px] h-[7px] rounded-full ${trained ? 'bg-success-500' : isFuture ? 'bg-ink-100' : 'bg-ink-200'}`}
          />
        );
      })}
    </div>
  );
}

function InactivityNote({ studentId, lastWorkoutMap }) {
  const lastDate = lastWorkoutMap[String(studentId)];
  if (!lastDate) return <span className="text-[11px] font-semibold text-danger-500">Nunca treinou</span>;
  const days = Math.floor((Date.now() - new Date(lastDate + 'T12:00:00').getTime()) / 86400000);
  if (days >= 7) return <span className="text-[11px] font-semibold text-danger-500">{days}d sem treinar</span>;
  if (days >= 5) return <span className="text-[11px] font-semibold text-warning-500">{days}d sem treinar</span>;
  return null;
}

function StudentFormFields({ form, onChange }) {
  const cls = "w-full px-3 py-2 rounded-lg border border-ink-200 text-sm text-ink-900 outline-none focus:border-brand-500";
  return (
    <div className="flex flex-col gap-3.5">
      <div>
        <label className="block text-xs font-semibold text-ink-700 mb-1.5">Nome completo *</label>
        <input name="name" value={form.name} onChange={onChange} placeholder="Nome do aluno" required autoFocus className={cls} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-ink-700 mb-1.5">Telefone *</label>
          <input name="phone" value={form.phone} onChange={onChange} placeholder="(11) 99999-9999" required className={cls} />
        </div>
        <div>
          <label className="block text-xs font-semibold text-ink-700 mb-1.5">E-mail</label>
          <input name="email" type="email" value={form.email} onChange={onChange} placeholder="email@exemplo.com" className={cls} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-ink-700 mb-1.5">Plano</label>
          <select name="plan" value={form.plan} onChange={onChange} className={cls}>
            <option value="">Selecione...</option>
            <option value="Mensal">Mensal</option>
            <option value="Trimestral">Trimestral</option>
            <option value="Semestral">Semestral</option>
            <option value="Anual">Anual</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-ink-700 mb-1.5">Valor (R$)</label>
          <input name="plan_price" type="number" min="0" step="0.01" value={form.plan_price || ''} onChange={onChange} placeholder="0,00" className={cls} />
        </div>
      </div>
      <div>
        <label className="block text-xs font-semibold text-ink-700 mb-1.5">Objetivo</label>
        <input name="goal" value={form.goal} onChange={onChange} placeholder="Ex: Hipertrofia, Emagrecimento..." className={cls} />
      </div>
    </div>
  );
}

function InviteContent({ student, sendInvite }) {
  const [tokenUrl, setTokenUrl] = useState('');
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const generated = useRef(false);

  const name = student?.name?.split(' ')[0] || 'aluno';

  useEffect(() => {
    if (!student?.email || generated.current) return;
    generated.current = true;
    setGenerating(true);
    sendInvite({ email: student.email, studentName: student.name }).then(result => {
      setGenerating(false);
      if (result?.success) setTokenUrl(result.inviteUrl);
    });
  }, [student?.id]);

  const copy = () => {
    if (!tokenUrl) return;
    navigator.clipboard.writeText(tokenUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const waText = `Olá ${name}! Sou seu personal trainer e criei sua área exclusiva no *WAY FIT*.\n\n- Treinos personalizados\n- Agenda de aulas\n- Chat direto comigo\n\nCrie sua conta agora:\n${tokenUrl || '...'}`;

  if (!student?.email) {
    return (
      <div className="flex items-start gap-2.5 bg-warning-50 border border-warning-500/20 rounded-lg px-3.5 py-3">
        <AlertTriangle size={16} className="text-warning-500 shrink-0 mt-0.5" />
        <p className="text-[13px] text-ink-700 leading-relaxed">
          Esse aluno não tem e-mail cadastrado. Edite o cadastro e adicione um e-mail pra gerar o link de convite.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <input
          readOnly
          value={generating ? 'Gerando link...' : tokenUrl}
          className="flex-1 min-w-0 px-3 py-2 rounded-lg border border-ink-200 text-[12.5px] text-ink-700 bg-ink-50"
        />
        <button onClick={copy} disabled={!tokenUrl} className="shrink-0 w-9 h-9 rounded-lg border border-ink-200 flex items-center justify-center text-ink-500 hover:bg-ink-50 disabled:opacity-40">
          {copied ? <Check size={15} className="text-success-500" /> : <Copy size={15} />}
        </button>
      </div>
      <a
        href={`https://wa.me/?text=${encodeURIComponent(waText)}`}
        target="_blank" rel="noreferrer"
        className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold ${tokenUrl ? 'bg-success-500 text-white hover:opacity-90' : 'bg-ink-100 text-ink-400 pointer-events-none'}`}
      >
        <MessageCircle size={16} /> Enviar por WhatsApp
      </a>
    </div>
  );
}

export default function AlunosV2() {
  const { user, sendInvite } = useAuth();
  const navigate = useNavigate();

  const [students, setStudents] = useState([]);
  const [weekSessions, setWeekSessions] = useState({});
  const [lastWorkoutMap, setLastWorkoutMap] = useState({});
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('todos');
  const [modal, setModal] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [inviteTarget, setInviteTarget] = useState(null);
  const [form, setForm] = useState({ name: '', email: '', phone: '', plan: '', plan_price: '', goal: '' });

  useEffect(() => {
    if (!user || !hasSupabase) return;
    supabase.from('students').select('*').eq('personal_id', user.id).order('name').limit(200)
      .then(({ data, error }) => {
        if (error) { toast.error('Não foi possível carregar seus alunos.'); return; }
        setStudents(data || []);
      });

    const today = new Date();
    const dayOfWeek = (today.getDay() + 6) % 7;
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - dayOfWeek);

    supabase.from('workout_sessions').select('student_id, date').eq('personal_id', user.id).gte('date', toLocalDateStr(weekStart))
      .then(({ data }) => {
        const map = {};
        (data || []).forEach(s => {
          const sid = String(s.student_id);
          if (!map[sid]) map[sid] = new Set();
          map[sid].add(s.date);
        });
        setWeekSessions(map);
      });

    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(today.getDate() - 30);
    supabase.from('workout_sessions').select('student_id, date').eq('personal_id', user.id).gte('date', toLocalDateStr(thirtyDaysAgo)).order('date', { ascending: false })
      .then(({ data }) => {
        const map = {};
        (data || []).forEach(s => { const sid = String(s.student_id); if (!map[sid]) map[sid] = s.date; });
        setLastWorkoutMap(map);
      });
  }, [user?.id]);

  const filtered = useMemo(() => students.filter(s => {
    const q = search.toLowerCase();
    const matchSearch = !q || (s.name || '').toLowerCase().includes(q) || (s.email || '').toLowerCase().includes(q) || (s.phone || '').includes(q);
    const matchFilter = filter === 'todos' || s.status === filter;
    return matchSearch && matchFilter;
  }), [students, search, filter]);

  const openAdd = () => { setForm({ name: '', email: '', phone: '', plan: '', plan_price: '', goal: '' }); setModal('add'); };
  const openEdit = (s) => { setForm({ name: s.name || '', email: s.email || '', phone: s.phone || '', plan: s.plan || '', plan_price: s.plan_price || '', goal: s.goal || '' }); setModal({ edit: s }); };
  const handleChange = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    const phoneDigits = (form.phone || '').replace(/\D/g, '');
    if (phoneDigits.length < 10 || phoneDigits.length > 11) { toast.error('Telefone inválido — informe DDD + número.'); return; }
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) { toast.error('E-mail inválido.'); return; }

    if (modal === 'add') {
      const newStudent = {
        ...form, plan_price: form.plan_price ? Number(form.plan_price) : null,
        initials: getInitials(form.name), color: COLORS[students.length % COLORS.length],
        join_date: todayLocal(), personal_id: user.id, status: 'ativo',
      };
      const { data, error } = await supabase.from('students').insert(newStudent).select().single();
      if (error) { toast.error('Não foi possível criar o aluno.'); return; }
      setStudents(prev => [...prev, data]);
      setModal(null);
      setInviteTarget(data);
    } else {
      const updates = { ...form, plan_price: form.plan_price ? Number(form.plan_price) : null, initials: getInitials(form.name) };
      const { error } = await supabase.from('students').update(updates).eq('id', modal.edit.id);
      if (error) { toast.error('Não foi possível salvar as alterações.'); return; }
      setStudents(prev => prev.map(s => s.id === modal.edit.id ? { ...s, ...updates } : s));
      setModal(null);
      toast.success('Aluno atualizado!');
    }
  };

  const handleDelete = async () => {
    await supabase.from('students').delete().eq('id', deleteTarget.id);
    setStudents(prev => prev.filter(s => s.id !== deleteTarget.id));
    setDeleteTarget(null);
    toast.success('Aluno removido.');
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-ink-900">Alunos</h2>
          <p className="text-[13px] text-ink-500 mt-0.5">
            {students.filter(s => s.status === 'ativo').length} ativos · {students.filter(s => s.user_id).length} no app
          </p>
        </div>
        <button onClick={openAdd} className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-brand-600 text-white text-[13px] font-semibold hover:bg-brand-700">
          <Plus size={15} /> Novo Aluno
        </button>
      </div>

      <div className="flex flex-col gap-2.5">
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-300" />
          <input
            value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome, e-mail ou telefone..."
            className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-ink-200 text-sm text-ink-900 outline-none focus:border-brand-500"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {['todos', 'ativo', 'pendente', 'inativo'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-full text-[12px] font-semibold border transition-colors ${
                filter === f ? 'bg-brand-600 border-brand-600 text-white' : 'bg-white border-ink-200 text-ink-600'
              }`}
            >
              {f === 'todos' ? `Todos (${students.length})` : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white border border-ink-100 rounded-xl overflow-hidden">
        {filtered.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-[14px] font-semibold text-ink-900">{search ? 'Nenhum aluno encontrado' : 'Nenhum aluno ainda'}</p>
            {!search && <p className="text-[13px] text-ink-500 mt-1">Clique em "Novo Aluno" pra começar.</p>}
          </div>
        ) : filtered.map(s => (
          <div key={s.id} className="flex items-center gap-3 px-4 py-3 border-b border-ink-50 last:border-0 hover:bg-ink-50/60 transition-colors">
            <button onClick={() => navigate(`/dashboard/alunos/${s.id}`)} className="flex items-center gap-3 flex-1 min-w-0 text-left">
              <Avatar student={s} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-[13.5px] font-semibold text-ink-900 truncate">{s.name}</p>
                  <StatusBadge status={s.status} />
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <p className="text-[12px] text-ink-500 truncate">{s.goal || s.plan || '—'}</p>
                  {s.status === 'ativo' && <InactivityNote studentId={s.id} lastWorkoutMap={lastWorkoutMap} />}
                </div>
              </div>
            </button>

            <div className="hidden sm:block shrink-0">
              <WeekDots sessionDates={weekSessions[String(s.id)] || new Set()} />
            </div>

            {s.user_id ? (
              <span className="hidden md:flex items-center gap-1 text-[10.5px] font-bold text-success-500 bg-success-50 px-2 py-1 rounded-full shrink-0">
                <Smartphone size={10} /> App
              </span>
            ) : (
              <button
                onClick={() => setInviteTarget(s)}
                className="hidden md:flex items-center gap-1 text-[10.5px] font-bold text-brand-600 bg-brand-50 px-2.5 py-1 rounded-full shrink-0 hover:bg-brand-100"
              >
                Convidar
              </button>
            )}

            <div className="flex items-center gap-1 shrink-0">
              <button onClick={() => openEdit(s)} aria-label="Editar" className="w-8 h-8 rounded-lg flex items-center justify-center text-ink-400 hover:bg-ink-100 hover:text-ink-700">
                <Pencil size={14} />
              </button>
              <button onClick={() => setDeleteTarget(s)} aria-label="Excluir" className="w-8 h-8 rounded-lg flex items-center justify-center text-ink-400 hover:bg-danger-50 hover:text-danger-500">
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>

      <ModalV2
        isOpen={!!modal}
        onClose={() => setModal(null)}
        title={modal === 'add' ? 'Novo aluno' : 'Editar aluno'}
        footer={
          <>
            <button onClick={() => setModal(null)} className="px-4 py-2 rounded-lg text-sm font-medium text-ink-500 hover:bg-ink-50">Cancelar</button>
            <button onClick={handleSubmit} className="px-4 py-2 rounded-lg bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700">
              {modal === 'add' ? 'Adicionar' : 'Salvar'}
            </button>
          </>
        }
      >
        <StudentFormFields form={form} onChange={handleChange} />
      </ModalV2>

      <ModalV2 isOpen={!!inviteTarget} onClose={() => setInviteTarget(null)} title="Convidar para o app">
        <InviteContent student={inviteTarget} sendInvite={sendInvite} />
      </ModalV2>

      <ModalV2
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Excluir aluno"
        footer={
          <>
            <button onClick={() => setDeleteTarget(null)} className="px-4 py-2 rounded-lg text-sm font-medium text-ink-500 hover:bg-ink-50">Cancelar</button>
            <button onClick={handleDelete} className="px-4 py-2 rounded-lg bg-danger-500 text-white text-sm font-semibold hover:opacity-90">Excluir</button>
          </>
        }
      >
        <p className="text-[13.5px] text-ink-700">
          Tem certeza que quer excluir <strong>{deleteTarget?.name}</strong>? Essa ação não pode ser desfeita.
        </p>
      </ModalV2>
    </div>
  );
}
