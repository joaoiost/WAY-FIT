import { useState, useEffect } from 'react';
import { Search, Plus, Edit2, Trash2, Download, Mail, Copy, Check, ExternalLink } from 'lucide-react';
import Avatar from '../../components/UI/Avatar';
import Badge from '../../components/UI/Badge';
import Modal from '../../components/UI/Modal';
import { students as mockStudents } from '../../data/mockData';
import { exportAlunosPDF, exportAlunosExcel } from '../../utils/export';
import { useAuth } from '../../context/AuthContext';
import { supabase, hasSupabase } from '../../lib/supabase';

const colors = ['#3B82F6', '#10B981', '#8B5CF6', '#F59E0B', '#EF4444', '#EC4899', '#06B6D4'];

function getInitials(name) {
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

function StudentForm({ form, onChange, onSubmit, onClose, isEdit }) {
  return (
    <form onSubmit={onSubmit}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        <div style={{ gridColumn: '1 / -1' }}>
          <label>Nome completo *</label>
          <input name="name" value={form.name} onChange={onChange} placeholder="Nome do aluno" required />
        </div>
        <div>
          <label>Email *</label>
          <input name="email" type="email" value={form.email} onChange={onChange} placeholder="email@exemplo.com" required />
        </div>
        <div>
          <label>Telefone</label>
          <input name="phone" value={form.phone} onChange={onChange} placeholder="(11) 99999-9999" />
        </div>
        <div>
          <label>Plano *</label>
          <select name="plan" value={form.plan} onChange={onChange} required>
            <option value="">Selecione...</option>
            <option value="Start">Start - R$150</option>
            <option value="Pro">Pro - R$250</option>
            <option value="Premium">Premium - R$400</option>
          </select>
        </div>
        <div>
          <label>Status</label>
          <select name="status" value={form.status} onChange={onChange}>
            <option value="ativo">Ativo</option>
            <option value="pendente">Pendente</option>
          </select>
        </div>
        <div style={{ gridColumn: '1 / -1' }}>
          <label>Objetivo</label>
          <input name="goal" value={form.goal} onChange={onChange} placeholder="Ex: Hipertrofia, Emagrecimento..." />
        </div>
        <div>
          <label>Idade</label>
          <input name="age" type="number" value={form.age} onChange={onChange} placeholder="25" />
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 16, borderTop: '1px solid #F3F4F6' }}>
        <button type="button" className="btn-secondary" onClick={onClose}>Cancelar</button>
        <button type="submit" className="btn-primary">{isEdit ? 'Salvar' : 'Adicionar Aluno'}</button>
      </div>
    </form>
  );
}

export default function Alunos() {
  const { sendInvite, user } = useAuth();
  const [students, setStudents] = useState([]);

  useEffect(() => {
    if (!user) return;
    if (hasSupabase) {
      supabase.from('students').select('*').eq('personal_id', user.id)
        .then(({ data }) => setStudents(data || []));
    } else {
      setStudents(mockStudents);
    }
  }, [user?.id]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('todos');
  const [modal, setModal] = useState(null); // null | 'add' | { edit: student }
  const [deleteModal, setDeleteModal] = useState(null);
  const [form, setForm] = useState({ name: '', email: '', phone: '', plan: '', status: 'ativo', goal: '', age: '' });
  const [inviteModal, setInviteModal] = useState(false);
  const [inviteForm, setInviteForm] = useState({ name: '', email: '' });
  const [inviteResult, setInviteResult] = useState(null);
  const [inviteSending, setInviteSending] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleSendInvite = async (e) => {
    e.preventDefault();
    setInviteSending(true);
    const result = await sendInvite({ email: inviteForm.email, studentName: inviteForm.name });
    setInviteSending(false);
    if (result.success) setInviteResult(result);
  };

  const copyInviteLink = () => {
    navigator.clipboard.writeText(inviteResult.inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const closeInvite = () => {
    setInviteModal(false);
    setInviteForm({ name: '', email: '' });
    setInviteResult(null);
    setCopied(false);
  };

  const filtered = students.filter(s => {
    const matchSearch = s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.email.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === 'todos' || s.status === filter || s.plan.toLowerCase() === filter;
    return matchSearch && matchFilter;
  });

  const openAdd = () => {
    setForm({ name: '', email: '', phone: '', plan: '', status: 'ativo', goal: '', age: '' });
    setModal('add');
  };

  const openEdit = (s) => {
    setForm({ ...s });
    setModal({ edit: s });
  };

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    const planPrice = form.plan === 'Premium' ? 400 : form.plan === 'Pro' ? 250 : 150;
    if (modal === 'add') {
      const newStudent = {
        ...form,
        initials: getInitials(form.name),
        color: colors[students.length % colors.length],
        last_training: 'Nunca',
        join_date: new Date().toISOString().slice(0, 10),
        plan_price: planPrice,
        personal_id: user.id,
      };
      if (hasSupabase) {
        const { data } = await supabase.from('students').insert(newStudent).select().single();
        if (data) setStudents(prev => [...prev, data]);
      } else {
        setStudents(prev => [...prev, { ...newStudent, id: Date.now(), lastTraining: 'Nunca', joinDate: newStudent.join_date, planPrice }]);
      }
    } else {
      const updates = { ...form, initials: getInitials(form.name), plan_price: planPrice };
      if (hasSupabase) {
        await supabase.from('students').update(updates).eq('id', modal.edit.id);
        setStudents(prev => prev.map(s => s.id === modal.edit.id ? { ...s, ...updates } : s));
      } else {
        setStudents(prev => prev.map(s => s.id === modal.edit.id ? { ...s, ...form, initials: getInitials(form.name) } : s));
      }
    }
    setModal(null);
  };

  const handleDelete = async () => {
    if (hasSupabase) {
      await supabase.from('students').delete().eq('id', deleteModal.id);
    }
    setStudents(prev => prev.filter(s => s.id !== deleteModal.id));
    setDeleteModal(null);
  };

  return (
    <div style={{ padding: 32, flex: 1 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#111827' }}>Alunos</h2>
          <p style={{ margin: '4px 0 0', fontSize: 14, color: '#6B7280' }}>{students.length} alunos cadastrados</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            className="btn-secondary"
            onClick={() => exportAlunosPDF(filtered)}
            title="Exportar PDF"
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 14px', fontSize: 13 }}
          >
            <Download size={15} /> PDF
          </button>
          <button
            className="btn-secondary"
            onClick={() => exportAlunosExcel(filtered)}
            title="Exportar Excel"
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 14px', fontSize: 13 }}
          >
            <Download size={15} /> Excel
          </button>
          <button
            className="btn-secondary"
            onClick={() => setInviteModal(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 14px', fontSize: 13, color: '#8B5CF6', borderColor: '#DDD6FE', background: '#F5F3FF' }}
          >
            <Mail size={15} /> Convidar Aluno
          </button>
          <button className="btn-primary" onClick={openAdd}>
            <Plus size={16} />
            Novo Aluno
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200, maxWidth: 320 }}>
          <Search size={16} color="#9CA3AF" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', zIndex: 1 }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar aluno..."
            style={{ paddingLeft: 36 }}
          />
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {['todos', 'ativo', 'pendente', 'Start', 'Pro', 'Premium'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                padding: '8px 14px',
                borderRadius: 8,
                border: `1px solid ${filter === f ? '#3B82F6' : '#E5E7EB'}`,
                background: filter === f ? '#EFF6FF' : 'white',
                color: filter === f ? '#3B82F6' : '#6B7280',
                fontSize: 13,
                fontWeight: 500,
                cursor: 'pointer',
                textTransform: 'capitalize',
              }}
            >
              {f === 'todos' ? 'Todos' : f}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div style={{ background: 'white', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>
              {['Aluno', 'Contato', 'Plano', 'Status', 'Último treino', 'Ações'].map(h => (
                <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: 40, textAlign: 'center', color: '#9CA3AF', fontSize: 14 }}>
                  Nenhum aluno encontrado
                </td>
              </tr>
            ) : (
              filtered.map(s => (
                <tr key={s.id} className="table-row" style={{ borderBottom: '1px solid #F3F4F6' }}>
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <Avatar initials={s.initials} color={s.color} />
                      <div>
                        <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#111827' }}>{s.name}</p>
                        <p style={{ margin: 0, fontSize: 12, color: '#6B7280' }}>{s.goal || '-'}</p>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <p style={{ margin: 0, fontSize: 13, color: '#374151' }}>{s.email}</p>
                    <p style={{ margin: 0, fontSize: 12, color: '#6B7280' }}>{s.phone}</p>
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>{s.plan}</span>
                    <p style={{ margin: 0, fontSize: 12, color: '#6B7280' }}>R${s.plan_price ?? s.planPrice}/mês</p>
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <Badge status={s.status} />
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <span style={{ fontSize: 13, color: '#6B7280' }}>{s.last_training ?? s.lastTraining}</span>
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        onClick={() => openEdit(s)}
                        style={{ padding: '6px', background: '#EFF6FF', border: 'none', borderRadius: 6, cursor: 'pointer', color: '#3B82F6', display: 'flex' }}
                      >
                        <Edit2 size={15} />
                      </button>
                      <button
                        onClick={() => setDeleteModal(s)}
                        style={{ padding: '6px', background: '#FEF2F2', border: 'none', borderRadius: 6, cursor: 'pointer', color: '#EF4444', display: 'flex' }}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add/Edit Modal */}
      <Modal
        isOpen={!!modal}
        onClose={() => setModal(null)}
        title={modal === 'add' ? 'Novo Aluno' : 'Editar Aluno'}
      >
        <StudentForm
          form={form}
          onChange={handleChange}
          onSubmit={handleSubmit}
          onClose={() => setModal(null)}
          isEdit={modal !== 'add'}
        />
      </Modal>

      {/* Delete Modal */}
      <Modal
        isOpen={!!deleteModal}
        onClose={() => setDeleteModal(null)}
        title="Confirmar exclusão"
        maxWidth="380px"
      >
        <p style={{ color: '#6B7280', marginBottom: 24, fontSize: 14 }}>
          Tem certeza que deseja remover <strong>{deleteModal?.name}</strong>? Esta ação não pode ser desfeita.
        </p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button className="btn-secondary" onClick={() => setDeleteModal(null)}>Cancelar</button>
          <button onClick={handleDelete} style={{ padding: '10px 20px', background: '#EF4444', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 14 }}>
            Excluir
          </button>
        </div>
      </Modal>

      {/* Invite Modal */}
      <Modal isOpen={inviteModal} onClose={closeInvite} title="Convidar Aluno" maxWidth="460px">
        {!inviteResult ? (
          <form onSubmit={handleSendInvite}>
            <p style={{ fontSize: 13, color: '#6B7280', marginBottom: 20 }}>
              Envie um link de convite para o aluno criar a conta e acessar a área dele.
            </p>
            {!hasSupabase && (
              <div style={{ background: '#FEF3C7', border: '1px solid #FDE68A', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 12, color: '#92400E' }}>
                Modo demo: o link será gerado mas não enviado por email. Configure o Supabase para envio real.
              </div>
            )}
            <div style={{ marginBottom: 14 }}>
              <label>Nome do aluno *</label>
              <input value={inviteForm.name} onChange={e => setInviteForm(f => ({ ...f, name: e.target.value }))} placeholder="Nome completo" required />
            </div>
            <div style={{ marginBottom: 20 }}>
              <label>Email *</label>
              <input type="email" value={inviteForm.email} onChange={e => setInviteForm(f => ({ ...f, email: e.target.value }))} placeholder="aluno@email.com" required />
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button type="button" className="btn-secondary" onClick={closeInvite}>Cancelar</button>
              <button type="submit" className="btn-primary" style={{ opacity: inviteSending ? 0.7 : 1 }} disabled={inviteSending}>
                <Mail size={15} /> {inviteSending ? 'Enviando...' : 'Gerar Convite'}
              </button>
            </div>
          </form>
        ) : (
          <div>
            <div style={{ background: '#D1FAE5', borderRadius: 10, padding: 16, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#10B981', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Check size={18} color="white" />
              </div>
              <div>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#065F46' }}>Convite gerado!</p>
                <p style={{ margin: 0, fontSize: 12, color: '#047857' }}>Copie o link abaixo e envie ao aluno</p>
              </div>
            </div>

            <p style={{ fontSize: 13, color: '#6B7280', marginBottom: 8 }}>Link de convite:</p>
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              <input
                value={inviteResult.inviteUrl}
                readOnly
                style={{ flex: 1, fontSize: 12, background: '#F9FAFB', color: '#374151' }}
              />
              <button
                onClick={copyInviteLink}
                style={{ padding: '10px 14px', background: copied ? '#10B981' : '#3B82F6', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, flexShrink: 0 }}
              >
                {copied ? <Check size={15} /> : <Copy size={15} />}
                {copied ? 'Copiado!' : 'Copiar'}
              </button>
            </div>

            <p style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 8 }}>Enviar pelo:</p>
            <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
              <a
                href={`mailto:${inviteForm.email}?subject=Seu acesso ao WAY FIT&body=Ol%C3%A1 ${encodeURIComponent(inviteForm.name)}!%0A%0ASeu personal criou um acesso exclusivo para você no WAY FIT.%0AClique no link abaixo para criar sua conta:%0A%0A${encodeURIComponent(inviteResult.inviteUrl)}`}
                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '10px 12px', background: '#EFF6FF', color: '#3B82F6', border: '1px solid #DBEAFE', borderRadius: 8, textDecoration: 'none', fontSize: 13, fontWeight: 600 }}
              >
                <Mail size={15} /> Email
              </a>
              <a
                href={`https://wa.me/?text=${encodeURIComponent(`Olá ${inviteForm.name}! Seu personal criou um acesso exclusivo para você no WAY FIT. Clique aqui para criar sua conta: ${inviteResult.inviteUrl}`)}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '10px 12px', background: '#F0FDF4', color: '#16A34A', border: '1px solid #BBF7D0', borderRadius: 8, textDecoration: 'none', fontSize: 13, fontWeight: 600 }}
              >
                <ExternalLink size={15} /> WhatsApp
              </a>
            </div>

            <button className="btn-secondary" style={{ width: '100%', justifyContent: 'center' }} onClick={closeInvite}>
              Fechar
            </button>
          </div>
        )}
      </Modal>
    </div>
  );
}
