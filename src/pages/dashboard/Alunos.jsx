import { useState, useEffect, useRef } from 'react';
import { Search, Plus, Edit2, Trash2, Download, Copy, Check, ExternalLink, Calendar, UserCheck, Smartphone, X, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Avatar from '../../components/UI/Avatar';
import Badge from '../../components/UI/Badge';
import Modal from '../../components/UI/Modal';
import { students as mockStudents } from '../../data/mockData';
// Export utilities loaded dynamically to avoid including jsPDF/xlsx in the main bundle
import { useAuth } from '../../context/AuthContext';
import { supabase, hasSupabase } from '../../lib/supabase';

const TYPE_COLORS = {
  Musculação: '#3B82F6', Funcional: '#10B981', Hipertrofia: '#8B5CF6',
  Cardio: '#F59E0B', Yoga: '#EC4899', Pilates: '#06B6D4', Força: '#EF4444',
};

const COLORS = ['#3B82F6', '#10B981', '#8B5CF6', '#F59E0B', '#EF4444', '#EC4899', '#06B6D4'];

function getInitials(name = '') {
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase() || '?';
}

function StudentForm({ form, onChange, onSubmit, onClose, isEdit }) {
  return (
    <form onSubmit={onSubmit}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div>
          <label>Nome completo *</label>
          <input name="name" value={form.name} onChange={onChange} placeholder="Nome do aluno" required autoFocus />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <label>Telefone *</label>
            <input name="phone" value={form.phone} onChange={onChange} placeholder="(11) 99999-9999" required />
          </div>
          <div>
            <label>Email</label>
            <input name="email" type="email" value={form.email} onChange={onChange} placeholder="email@exemplo.com" />
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <label>Plano</label>
            <select name="plan" value={form.plan} onChange={onChange}>
              <option value="">Selecione...</option>
              <option value="Mensal">Mensal</option>
              <option value="Trimestral">Trimestral</option>
              <option value="Semestral">Semestral</option>
              <option value="Anual">Anual</option>
            </select>
          </div>
          <div>
            <label>Valor (R$)</label>
            <input name="plan_price" type="number" min="0" step="0.01" value={form.plan_price || ''} onChange={onChange} placeholder="0,00" />
          </div>
        </div>
        <div>
          <label>Objetivo</label>
          <input name="goal" value={form.goal} onChange={onChange} placeholder="Ex: Hipertrofia, Emagrecimento..." />
        </div>
      </div>
      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20, paddingTop: 16, borderTop: '1px solid #F3F4F6' }}>
        <button type="button" className="btn-secondary" onClick={onClose}>Cancelar</button>
        <button type="submit" className="btn-primary">{isEdit ? 'Salvar' : 'Adicionar'}</button>
      </div>
    </form>
  );
}

function InviteSheet({ student, sendInvite, onClose }) {
  const [tokenUrl, setTokenUrl] = useState('');
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const generated = useRef(false);

  const name = student?.name?.split(' ')[0] || 'aluno';

  useEffect(() => {
    if (!student?.email || !sendInvite || generated.current) return;
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

  const waText = `Olá ${name}! 👋\nSou seu personal trainer e criei sua área exclusiva no *WAY FIT*.\n\n✅ Treinos personalizados\n📅 Agenda de aulas\n💬 Chat direto comigo\n\n👉 Crie sua conta agora:\n${tokenUrl || '...'}`;
  const waMsg = encodeURIComponent(waText);

  return (
    <div style={{ padding: '4px 0' }}>
      {/* Student card */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: '#F9FAFB', borderRadius: 12, marginBottom: 20 }}>
        <div style={{ width: 44, height: 44, borderRadius: '50%', background: student?.color || '#6B7280', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 800, color: 'white', flexShrink: 0 }}>
          {student?.initials || getInitials(student?.name || '')}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#111827' }}>{student?.name}</p>
          <p style={{ margin: 0, fontSize: 12, color: '#9CA3AF' }}>{student?.email || student?.phone || 'Sem contato'}</p>
        </div>
        {student?.email && (
          <span style={{ fontSize: 11, fontWeight: 700, color: '#3B82F6', background: '#EFF6FF', padding: '3px 9px', borderRadius: 20 }}>
            {generating ? 'Gerando...' : tokenUrl ? 'Link pronto' : '—'}
          </span>
        )}
      </div>

      {!student?.email ? (
        <div style={{ background: '#FEF3C7', border: '1px solid #FDE68A', borderRadius: 12, padding: '14px 16px', marginBottom: 16, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
          <AlertCircle size={18} color="#D97706" style={{ flexShrink: 0, marginTop: 1 }} />
          <p style={{ margin: 0, fontSize: 13, color: '#92400E', lineHeight: 1.5 }}>
            Sem email cadastrado. Edite o aluno e adicione um email para gerar o link de convite personalizado.
          </p>
        </div>
      ) : (
        <>
          <p style={{ margin: '0 0 8px', fontSize: 13, color: '#374151', fontWeight: 600 }}>Link de convite personalizado</p>
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            <input
              value={generating ? 'Gerando link...' : tokenUrl}
              readOnly
              style={{ flex: 1, fontSize: 12, background: '#F9FAFB', color: tokenUrl ? '#374151' : '#9CA3AF' }}
            />
            <button onClick={copy} disabled={!tokenUrl}
              style={{ padding: '0 14px', background: copied ? '#10B981' : (tokenUrl ? '#3B82F6' : '#E5E7EB'), color: tokenUrl ? 'white' : '#9CA3AF', border: 'none', borderRadius: 10, cursor: tokenUrl ? 'pointer' : 'default', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, flexShrink: 0, height: 42 }}>
              {copied ? <Check size={15} /> : <Copy size={15} />}
              {copied ? 'Copiado!' : 'Copiar'}
            </button>
          </div>
        </>
      )}

      {/* WhatsApp — ação principal */}
      {student?.phone && (
        <a
          href={`https://wa.me/${(student.phone || '').replace(/\D/g, '')}?text=${waMsg}`}
          target="_blank" rel="noopener noreferrer"
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9, padding: '15px', background: '#25D366', color: 'white', border: 'none', borderRadius: 14, textDecoration: 'none', fontSize: 15, fontWeight: 800, marginBottom: 10, boxShadow: '0 3px 10px rgba(37,211,102,0.3)' }}>
          <ExternalLink size={18} /> Enviar convite no WhatsApp
        </a>
      )}

      {/* Email */}
      {student?.email && tokenUrl && (
        <a
          href={`mailto:${student.email}?subject=Seu acesso ao WAY FIT&body=${encodeURIComponent(`Olá ${name}!\n\nSeu personal trainer criou sua área exclusiva no WAY FIT.\n\nCrie sua conta pelo link abaixo:\n${tokenUrl}\n\nAbsolutamente qualquer dúvida é só responder este email!`)}`}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, padding: '12px', background: '#EFF6FF', color: '#1D4ED8', border: '1px solid #BFDBFE', borderRadius: 12, textDecoration: 'none', fontSize: 14, fontWeight: 700, marginBottom: 10 }}>
          ✉️ Enviar por email
        </a>
      )}

      <p style={{ margin: '8px 0 0', fontSize: 12, color: '#9CA3AF', textAlign: 'center', lineHeight: 1.5 }}>
        O aluno clica no link, cria a senha e já entra direto — sem confirmar email.
      </p>
      <button className="btn-secondary" style={{ width: '100%', justifyContent: 'center', marginTop: 12 }} onClick={onClose}>Fechar</button>
    </div>
  );
}

// Semana de treinos — dots com labels e contagem
const DAY_LABELS = ['S','T','Q','Q','S','S','D'];

function WeekDots({ sessionDates }) {
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  const dayOfWeek = (today.getDay() + 6) % 7;
  const count = sessionDates.size;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <div style={{ display: 'flex', gap: 3 }}>
        {Array.from({ length: 7 }, (_, i) => {
          const d = new Date(today);
          d.setDate(today.getDate() - dayOfWeek + i);
          const dateStr = d.toISOString().slice(0, 10);
          const trained = sessionDates.has(dateStr);
          const isFuture = dateStr > todayStr;
          const isToday = dateStr === todayStr;
          return (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
              <div style={{
                width: 10, height: 10, borderRadius: 3,
                background: trained ? '#10B981' : isFuture ? '#F3F4F6' : '#E5E7EB',
                outline: isToday ? '2px solid #3B82F6' : 'none',
                outlineOffset: 1,
              }} />
              <span style={{ fontSize: 8, fontWeight: 700, color: isToday ? '#3B82F6' : '#C4C9D4' }}>
                {DAY_LABELS[i]}
              </span>
            </div>
          );
        })}
      </div>
      {count > 0 && (
        <span style={{ fontSize: 11, fontWeight: 800, color: '#10B981', background: '#ECFDF5', padding: '1px 7px', borderRadius: 20, whiteSpace: 'nowrap' }}>
          {count}×
        </span>
      )}
    </div>
  );
}

export default function Alunos() {
  const { user, sendInvite } = useAuth();
  const navigate = useNavigate();
  const [students, setStudents] = useState([]);
  // personalSlug removido — convite agora usa token gerado pelo InviteSheet
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('todos');
  const [modal, setModal] = useState(null);
  const [deleteModal, setDeleteModal] = useState(null);
  const [form, setForm] = useState({ name: '', email: '', phone: '', plan: '', plan_price: '', status: 'ativo', goal: '' });
  const [inviteSheet, setInviteSheet] = useState(null); // student object
  const [quickSchedule, setQuickSchedule] = useState(null);
  const [quickForm, setQuickForm] = useState({ date: '', time: '08:00', type: 'Musculação' });
  const [quickSaving, setQuickSaving] = useState(false);
  const [weekSessions, setWeekSessions] = useState({}); // student_id -> Set<date>

  useEffect(() => {
    if (!user) return;
    if (hasSupabase) {
      supabase.from('students').select('*').eq('personal_id', user.id)
        .then(({ data }) => setStudents(data || []));

      // Carrega sessões da semana atual para todos os alunos de uma só query
      const today = new Date();
      const dayOfWeek = (today.getDay() + 6) % 7;
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - dayOfWeek);
      const weekStartStr = weekStart.toISOString().slice(0, 10);
      supabase.from('workout_sessions')
        .select('student_id, date')
        .eq('personal_id', user.id)
        .gte('date', weekStartStr)
        .then(({ data }) => {
          const map = {};
          (data || []).forEach(s => {
            const sid = String(s.student_id);
            if (!map[sid]) map[sid] = new Set();
            map[sid].add(s.date);
          });
          setWeekSessions(map);
        });
    } else {
      setStudents(mockStudents);
    }
  }, [user?.id]);

  // inviteUrl removido — InviteSheet gera o token automaticamente via sendInvite

  const filtered = students.filter(s => {
    const q = search.toLowerCase();
    const matchSearch = (s.name || '').toLowerCase().includes(q) || (s.email || '').toLowerCase().includes(q) || (s.phone || '').includes(q);
    const matchFilter = filter === 'todos' || s.status === filter;
    return matchSearch && matchFilter;
  });

  const openAdd = () => {
    setForm({ name: '', email: '', phone: '', plan: '', plan_price: '', status: 'ativo', goal: '' });
    setModal('add');
  };

  const openEdit = (s) => {
    setForm({ name: s.name || '', email: s.email || '', phone: s.phone || '', plan: s.plan || '', plan_price: s.plan_price || '', status: s.status || 'ativo', goal: s.goal || '' });
    setModal({ edit: s });
  };

  const handleChange = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (modal === 'add') {
      const newStudent = {
        ...form,
        plan_price: form.plan_price ? Number(form.plan_price) : null,
        initials: getInitials(form.name),
        color: COLORS[students.length % COLORS.length],
        join_date: new Date().toISOString().slice(0, 10),
        personal_id: user.id,
        status: 'ativo',
      };
      if (hasSupabase) {
        const { data } = await supabase.from('students').insert(newStudent).select().single();
        if (data) {
          setStudents(prev => [...prev, data]);
          setModal(null);
          setInviteSheet(data);
          return;
        }
      } else {
        const mock = { ...newStudent, id: Date.now() };
        setStudents(prev => [...prev, mock]);
        setModal(null);
        setInviteSheet(mock);
        return;
      }
    } else {
      const updates = {
        ...form,
        plan_price: form.plan_price ? Number(form.plan_price) : null,
        initials: getInitials(form.name),
      };
      if (hasSupabase) {
        await supabase.from('students').update(updates).eq('id', modal.edit.id);
      }
      setStudents(prev => prev.map(s => s.id === modal.edit.id ? { ...s, ...updates } : s));
    }
    setModal(null);
  };

  const handleDelete = async () => {
    if (hasSupabase) await supabase.from('students').delete().eq('id', deleteModal.id);
    setStudents(prev => prev.filter(s => s.id !== deleteModal.id));
    setDeleteModal(null);
  };

  const handleQuickSchedule = async (e) => {
    e.preventDefault();
    if (!quickSchedule || !user) return;
    setQuickSaving(true);
    const newAppt = {
      personal_id: user.id, student_id: quickSchedule.id, student_name: quickSchedule.name,
      date: quickForm.date, time: quickForm.time, type: quickForm.type,
      status: 'pending', color: TYPE_COLORS[quickForm.type] || '#3B82F6',
    };
    if (hasSupabase) await supabase.from('appointments').insert(newAppt);
    setQuickSaving(false);
    setQuickSchedule(null);
  };

  const AppBadge = ({ student }) => {
    if (student.user_id) {
      return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 8px', borderRadius: 20, background: '#DCFCE7', color: '#15803D', fontSize: 10, fontWeight: 700, flexShrink: 0 }}>
          <Smartphone size={9} /> App
        </span>
      );
    }
    return (
      <button onClick={(e) => { e.stopPropagation(); setInviteSheet(student); }}
        style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 9px', borderRadius: 20, background: '#F5F3FF', color: '#7C3AED', border: '1px solid #DDD6FE', fontSize: 10, fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}>
        Convidar
      </button>
    );
  };

  return (
    <div className="page-padding" style={{ flex: 1 }}>
      {/* Header */}
      <div className="page-header">
        <div>
          <h2 className="page-title">Alunos</h2>
          <p className="page-subtitle">
            {students.filter(s => s.status === 'ativo').length} ativos · {students.filter(s => s.user_id).length} no app
          </p>
        </div>
        <div className="page-actions">
          <button className="btn-secondary hide-mobile" onClick={async () => { const { exportAlunosPDF } = await import('../../utils/export'); exportAlunosPDF(filtered); }}>
            <Download size={14} /> PDF
          </button>
          <button className="btn-primary" onClick={openAdd}>
            <Plus size={16} /> Novo Aluno
          </button>
        </div>
      </div>

      {/* Search + filter */}
      <div style={{ marginBottom: 20 }}>
        <div className="search-bar" style={{ marginBottom: 10 }}>
          <Search size={15} color="var(--gray-400)" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por nome, email ou telefone..." />
        </div>
        <div className="filter-pills">
          {['todos', 'ativo', 'pendente', 'inativo'].map(f => (
            <button key={f} onClick={() => setFilter(f)} className={`pill${filter === f ? ' active' : ''}`}>
              {f === 'todos' ? `Todos (${students.length})` : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Desktop table */}
      <div className="alunos-desktop-table card card-0">
        <div className="table-scroll">
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--gray-50)', borderBottom: '1px solid var(--border-light)' }}>
                {['Aluno', 'Contato', 'Plano', 'Status', 'App', 'Ações'].map(h => (
                  <th key={h} style={{ padding: '11px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={6} style={{ padding: 48, textAlign: 'center', color: 'var(--gray-400)', fontSize: 14 }}>
                  {search ? 'Nenhum aluno encontrado' : 'Nenhum aluno cadastrado. Clique em "Novo Aluno" para começar.'}
                </td></tr>
              ) : filtered.map(s => (
                <tr key={s.id} className="table-row" style={{ borderBottom: '1px solid var(--border-light)', cursor: 'pointer' }} onClick={() => navigate(`/dashboard/alunos/${s.id}`)}>
                  <td style={{ padding: '13px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <Avatar initials={s.initials} color={s.color} />
                      <div>
                        <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: 'var(--gray-900)' }}>{s.name}</p>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 3 }}>
                          <p style={{ margin: 0, fontSize: 12, color: 'var(--gray-400)' }}>{s.goal || '—'}</p>
                          <WeekDots sessionDates={weekSessions[String(s.id)] || new Set()} />
                        </div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '13px 16px' }}>
                    <p style={{ margin: 0, fontSize: 13, color: 'var(--gray-700)' }}>{s.phone || '—'}</p>
                    <p style={{ margin: 0, fontSize: 12, color: 'var(--gray-400)' }}>{s.email || '—'}</p>
                  </td>
                  <td style={{ padding: '13px 16px' }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--gray-700)' }}>{s.plan || '—'}</span>
                    {s.plan_price && <p style={{ margin: 0, fontSize: 12, color: 'var(--gray-400)' }}>R$ {Number(s.plan_price).toLocaleString('pt-BR')}</p>}
                  </td>
                  <td style={{ padding: '13px 16px' }}><Badge status={s.status} /></td>
                  <td style={{ padding: '13px 16px' }} onClick={e => e.stopPropagation()}><AppBadge student={s} /></td>
                  <td style={{ padding: '13px 16px' }} onClick={e => e.stopPropagation()}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={() => { setQuickSchedule(s); setQuickForm({ date: new Date().toISOString().slice(0,10), time: '08:00', type: 'Musculação' }); }}
                        className="icon-box icon-box-sm icon-box-green" style={{ border:'none', cursor:'pointer' }} title="Agendar aula">
                        <Calendar size={14} />
                      </button>
                      <button onClick={() => openEdit(s)}
                        className="icon-box icon-box-sm icon-box-blue" style={{ border:'none', cursor:'pointer' }} title="Editar">
                        <Edit2 size={14} />
                      </button>
                      <button onClick={() => setDeleteModal(s)}
                        className="icon-box icon-box-sm icon-box-red" style={{ border:'none', cursor:'pointer' }} title="Excluir">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile cards */}
      <div className="alunos-mobile-cards">
        {filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon"><Users size={24} /></div>
            <p className="empty-state-title">{search ? 'Nenhum aluno encontrado' : 'Nenhum aluno ainda'}</p>
          </div>
        ) : filtered.map(s => (
          <div key={s.id} className="card" style={{ marginBottom: 10, display:'flex', alignItems:'center', gap:12, padding:'14px 16px' }}>
            <div onClick={() => navigate(`/dashboard/alunos/${s.id}`)} style={{ flexShrink:0, cursor:'pointer' }}>
              <Avatar initials={s.initials} color={s.color} size={44} />
            </div>
            <div onClick={() => navigate(`/dashboard/alunos/${s.id}`)} className="list-row-body" style={{ cursor:'pointer' }}>
              <div style={{ display:'flex', alignItems:'center', gap:7, flexWrap:'wrap' }}>
                <span className="list-row-title" style={{ fontSize:15 }}>{(s.name||'').split(' ')[0]} {(s.name||'').split(' ').slice(-1)[0]}</span>
                <Badge status={s.status} />
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:8, marginTop:3 }}>
                <p className="list-row-sub" style={{ flex:1 }}>
                  {s.phone || s.email || s.goal || s.plan || '—'}
                </p>
                <WeekDots sessionDates={weekSessions[String(s.id)] || new Set()} />
              </div>
            </div>
            <div style={{ display:'flex', gap:6, flexShrink:0 }}>
              <AppBadge student={s} />
              <button onClick={() => { setQuickSchedule(s); setQuickForm({ date: new Date().toISOString().slice(0,10), time:'08:00', type:'Musculação' }); }}
                className="icon-box icon-box-md icon-box-green" style={{ border:'none', cursor:'pointer', width:34, height:34 }}>
                <Calendar size={15} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add/Edit Modal */}
      <Modal isOpen={!!modal} onClose={() => setModal(null)} title={modal === 'add' ? 'Novo Aluno' : 'Editar Aluno'}>
        <StudentForm form={form} onChange={handleChange} onSubmit={handleSubmit} onClose={() => setModal(null)} isEdit={modal !== 'add'} />
      </Modal>

      {/* Invite sheet — aparece após adicionar ou clicando em "Convidar" */}
      <Modal isOpen={!!inviteSheet} onClose={() => setInviteSheet(null)} title="Convidar para o app" maxWidth="420px">
        <InviteSheet student={inviteSheet} sendInvite={sendInvite} onClose={() => setInviteSheet(null)} />
      </Modal>

      {/* Delete Modal */}
      <Modal isOpen={!!deleteModal} onClose={() => setDeleteModal(null)} title="Remover aluno" maxWidth="380px">
        <p style={{ color: '#6B7280', marginBottom: 24, fontSize: 14 }}>
          Tem certeza que deseja remover <strong>{deleteModal?.name}</strong>? Esta ação não pode ser desfeita.
        </p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button className="btn-secondary" onClick={() => setDeleteModal(null)}>Cancelar</button>
          <button onClick={handleDelete} style={{ padding: '10px 20px', background: '#EF4444', color: 'white', border: 'none', borderRadius: 10, cursor: 'pointer', fontWeight: 600, fontSize: 14 }}>Excluir</button>
        </div>
      </Modal>

      {/* Quick Schedule Modal */}
      <Modal isOpen={!!quickSchedule} onClose={() => setQuickSchedule(null)} title={`Agendar aula${quickSchedule ? ` — ${(quickSchedule.name||'').split(' ')[0]}` : ''}`} maxWidth="400px">
        <form onSubmit={handleQuickSchedule}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div><label>Data *</label><input type="date" value={quickForm.date} onChange={e => setQuickForm(f => ({ ...f, date: e.target.value }))} required /></div>
              <div><label>Horário *</label><input type="time" value={quickForm.time} onChange={e => setQuickForm(f => ({ ...f, time: e.target.value }))} required /></div>
            </div>
            <div>
              <label>Tipo *</label>
              <select value={quickForm.type} onChange={e => setQuickForm(f => ({ ...f, type: e.target.value }))}>
                {['Musculação', 'Funcional', 'Hipertrofia', 'Cardio', 'Yoga', 'Pilates', 'Força'].map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20, paddingTop: 16, borderTop: '1px solid #F3F4F6' }}>
            <button type="button" className="btn-secondary" onClick={() => setQuickSchedule(null)}>Cancelar</button>
            <button type="submit" className="btn-primary" disabled={quickSaving}>
              <Calendar size={14} /> {quickSaving ? 'Agendando...' : 'Agendar'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
