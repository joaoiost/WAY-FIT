import { useState, useEffect } from 'react';
import { Search, Plus, Edit2, Trash2, Download, Copy, Check, ExternalLink, Calendar, UserCheck, Smartphone, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Avatar from '../../components/UI/Avatar';
import Badge from '../../components/UI/Badge';
import Modal from '../../components/UI/Modal';
import { students as mockStudents } from '../../data/mockData';
import { exportAlunosPDF, exportAlunosExcel } from '../../utils/export';
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

function InviteSheet({ student, inviteUrl, onClose }) {
  const [copied, setCopied] = useState(false);
  const name = student?.name?.split(' ')[0] || 'aluno';
  const waMsg = encodeURIComponent(`Olá ${name}! 👋\nSou seu personal trainer no WAY FIT.\nCrie sua conta e acesse seus treinos, agenda e muito mais:\n👉 ${inviteUrl}`);

  const copy = () => {
    navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{ padding: '4px 0' }}>
      {student && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: '#F9FAFB', borderRadius: 12, marginBottom: 20 }}>
          <div style={{ width: 42, height: 42, borderRadius: '50%', background: student.color || '#6B7280', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 800, color: 'white', flexShrink: 0 }}>
            {student.initials || getInitials(student.name)}
          </div>
          <div>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#111827' }}>{student.name}</p>
            <p style={{ margin: 0, fontSize: 12, color: '#9CA3AF' }}>{student.phone || student.email || 'Sem contato'}</p>
          </div>
        </div>
      )}

      <p style={{ margin: '0 0 8px', fontSize: 13, color: '#374151', fontWeight: 600 }}>Link de cadastro</p>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <input value={inviteUrl} readOnly style={{ flex: 1, fontSize: 12, background: '#F9FAFB', color: '#374151' }} />
        <button onClick={copy}
          style={{ padding: '0 14px', background: copied ? '#10B981' : '#3B82F6', color: 'white', border: 'none', borderRadius: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, flexShrink: 0, height: 42 }}>
          {copied ? <Check size={15} /> : <Copy size={15} />}
          {copied ? 'Copiado!' : 'Copiar'}
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
        <a href={`https://wa.me/${(student?.phone || '').replace(/\D/g, '')}?text=${waMsg}`}
          target="_blank" rel="noopener noreferrer"
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, padding: '12px', background: '#DCFCE7', color: '#15803D', border: '1px solid #BBF7D0', borderRadius: 12, textDecoration: 'none', fontSize: 14, fontWeight: 700 }}>
          <ExternalLink size={16} /> WhatsApp
        </a>
        {student?.email && (
          <a href={`mailto:${student.email}?subject=Acesse o WAY FIT&body=${encodeURIComponent(`Olá ${name}!\n\nSeu personal criou seu acesso no WAY FIT. Crie sua conta pelo link:\n${inviteUrl}`)}`}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, padding: '12px', background: '#EFF6FF', color: '#1D4ED8', border: '1px solid #BFDBFE', borderRadius: 12, textDecoration: 'none', fontSize: 14, fontWeight: 700 }}>
            ✉️ Email
          </a>
        )}
      </div>

      <p style={{ margin: '0 0 4px', fontSize: 12, color: '#9CA3AF', textAlign: 'center' }}>
        O aluno usa esse link para criar a conta e acessar treinos, agenda e chat.
      </p>
      <button className="btn-secondary" style={{ width: '100%', justifyContent: 'center', marginTop: 12 }} onClick={onClose}>Fechar</button>
    </div>
  );
}

export default function Alunos() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [students, setStudents] = useState([]);
  const [personalSlug, setPersonalSlug] = useState('');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('todos');
  const [modal, setModal] = useState(null);
  const [deleteModal, setDeleteModal] = useState(null);
  const [form, setForm] = useState({ name: '', email: '', phone: '', plan: '', plan_price: '', status: 'ativo', goal: '' });
  const [inviteSheet, setInviteSheet] = useState(null); // student object
  const [quickSchedule, setQuickSchedule] = useState(null);
  const [quickForm, setQuickForm] = useState({ date: '', time: '08:00', type: 'Musculação' });
  const [quickSaving, setQuickSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    if (hasSupabase) {
      supabase.from('students').select('*').eq('personal_id', user.id)
        .then(({ data }) => setStudents(data || []));
      supabase.from('profiles').select('slug').eq('id', user.id).single()
        .then(({ data }) => { if (data?.slug) setPersonalSlug(data.slug); });
    } else {
      setStudents(mockStudents);
      setPersonalSlug('demo');
    }
  }, [user?.id]);

  const inviteUrl = personalSlug ? `${window.location.origin}/p/${personalSlug}` : '';

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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#111827' }}>Alunos</h2>
          <p style={{ margin: '2px 0 0', fontSize: 13, color: '#9CA3AF' }}>
            {students.filter(s => s.status === 'ativo').length} ativos · {students.filter(s => s.user_id).length} no app
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
          <button className="btn-secondary hide-mobile" onClick={() => exportAlunosPDF(filtered)} style={{ padding: '9px 14px', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Download size={14} /> PDF
          </button>
          <button className="btn-primary" onClick={openAdd} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Plus size={16} /> Novo Aluno
          </button>
        </div>
      </div>

      {/* Search + filter */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
        <div style={{ position: 'relative' }}>
          <Search size={15} color="#9CA3AF" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por nome, email ou telefone..." style={{ paddingLeft: 36 }} />
        </div>
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', scrollbarWidth: 'none', paddingBottom: 2 }}>
          {['todos', 'ativo', 'pendente', 'inativo'].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              style={{ padding: '6px 14px', borderRadius: 20, flexShrink: 0, border: `1.5px solid ${filter === f ? '#3B82F6' : '#E5E7EB'}`, background: filter === f ? '#EFF6FF' : 'white', color: filter === f ? '#3B82F6' : '#6B7280', fontSize: 13, fontWeight: filter === f ? 700 : 500, cursor: 'pointer', textTransform: 'capitalize' }}>
              {f === 'todos' ? `Todos (${students.length})` : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Desktop table */}
      <div className="alunos-desktop-table" style={{ background: 'white', borderRadius: 14, border: '1px solid #F1F5F9', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
        <div className="table-scroll">
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#F9FAFB', borderBottom: '1px solid #F1F5F9' }}>
                {['Aluno', 'Contato', 'Plano', 'Status', 'App', 'Ações'].map(h => (
                  <th key={h} style={{ padding: '11px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={6} style={{ padding: 48, textAlign: 'center', color: '#9CA3AF', fontSize: 14 }}>
                  {search ? 'Nenhum aluno encontrado' : 'Nenhum aluno cadastrado. Clique em "Novo Aluno" para começar.'}
                </td></tr>
              ) : filtered.map(s => (
                <tr key={s.id} className="table-row" style={{ borderBottom: '1px solid #F9FAFB', cursor: 'pointer' }} onClick={() => navigate(`/dashboard/alunos/${s.id}`)}>
                  <td style={{ padding: '13px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                      <Avatar initials={s.initials} color={s.color} />
                      <div>
                        <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#111827' }}>{s.name}</p>
                        <p style={{ margin: 0, fontSize: 12, color: '#9CA3AF' }}>{s.goal || '—'}</p>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '13px 16px' }}>
                    <p style={{ margin: 0, fontSize: 13, color: '#374151' }}>{s.phone || '—'}</p>
                    <p style={{ margin: 0, fontSize: 12, color: '#9CA3AF' }}>{s.email || '—'}</p>
                  </td>
                  <td style={{ padding: '13px 16px' }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>{s.plan || '—'}</span>
                    {s.plan_price && <p style={{ margin: 0, fontSize: 12, color: '#9CA3AF' }}>R$ {Number(s.plan_price).toLocaleString('pt-BR')}</p>}
                  </td>
                  <td style={{ padding: '13px 16px' }}><Badge status={s.status} /></td>
                  <td style={{ padding: '13px 16px' }} onClick={e => e.stopPropagation()}><AppBadge student={s} /></td>
                  <td style={{ padding: '13px 16px' }} onClick={e => e.stopPropagation()}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={() => { setQuickSchedule(s); setQuickForm({ date: new Date().toISOString().slice(0,10), time: '08:00', type: 'Musculação' }); }}
                        style={{ width: 30, height: 30, borderRadius: 8, background: '#ECFDF5', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Agendar aula">
                        <Calendar size={14} color="#10B981" />
                      </button>
                      <button onClick={() => openEdit(s)}
                        style={{ width: 30, height: 30, borderRadius: 8, background: '#EFF6FF', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Editar">
                        <Edit2 size={14} color="#3B82F6" />
                      </button>
                      <button onClick={() => setDeleteModal(s)}
                        style={{ width: 30, height: 30, borderRadius: 8, background: '#FEF2F2', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Excluir">
                        <Trash2 size={14} color="#EF4444" />
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
          <div style={{ textAlign: 'center', padding: '48px 20px', color: '#9CA3AF' }}>
            <p style={{ margin: 0, fontSize: 14 }}>{search ? 'Nenhum aluno encontrado' : 'Nenhum aluno ainda'}</p>
          </div>
        ) : filtered.map(s => (
          <div key={s.id} style={{ background: 'white', borderRadius: 14, padding: '14px 16px', marginBottom: 10, border: '1px solid #F1F5F9', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div onClick={() => navigate(`/dashboard/alunos/${s.id}`)} style={{ flexShrink: 0, cursor: 'pointer' }}>
              <Avatar initials={s.initials} color={s.color} size={44} />
            </div>
            <div onClick={() => navigate(`/dashboard/alunos/${s.id}`)} style={{ flex: 1, minWidth: 0, cursor: 'pointer' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 15, fontWeight: 700, color: '#111827' }}>{s.name.split(' ')[0]} {s.name.split(' ').slice(-1)[0]}</span>
                <Badge status={s.status} />
              </div>
              <p style={{ margin: '2px 0 0', fontSize: 12, color: '#9CA3AF', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {s.phone || s.email || s.goal || s.plan || '—'}
              </p>
            </div>
            <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
              <AppBadge student={s} />
              <button onClick={() => { setQuickSchedule(s); setQuickForm({ date: new Date().toISOString().slice(0,10), time: '08:00', type: 'Musculação' }); }}
                style={{ width: 34, height: 34, borderRadius: 10, background: '#ECFDF5', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Calendar size={15} color="#10B981" />
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
        <InviteSheet student={inviteSheet} inviteUrl={inviteUrl} onClose={() => setInviteSheet(null)} />
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
      <Modal isOpen={!!quickSchedule} onClose={() => setQuickSchedule(null)} title={`Agendar aula${quickSchedule ? ` — ${quickSchedule.name.split(' ')[0]}` : ''}`} maxWidth="400px">
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
