import { useState, useEffect } from 'react';
import { DollarSign, TrendingUp, Clock, CheckCircle, Download, Zap, X, AlertCircle, Plus } from 'lucide-react';
import { exportFinanceiroPDF, exportFinanceiroExcel } from '../../utils/export';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import Badge from '../../components/UI/Badge';
import { payments as mockPayments, monthlyRevenue as mockMonthlyRevenue } from '../../data/mockData';
import { useAuth } from '../../context/AuthContext';
import { supabase, hasSupabase } from '../../lib/supabase';

function StatBox({ icon: Icon, title, value, sub, color, bg }) {
  return (
    <div style={{
      background: 'white',
      borderRadius: 12,
      padding: '20px 24px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
      display: 'flex',
      gap: 16,
      alignItems: 'center',
    }}>
      <div style={{ width: 52, height: 52, borderRadius: 14, background: bg || '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Icon size={24} color={color || '#3B82F6'} />
      </div>
      <div>
        <p style={{ margin: 0, fontSize: 13, color: '#6B7280', fontWeight: 500 }}>{title}</p>
        <p style={{ margin: '4px 0 2px', fontSize: 24, fontWeight: 800, color: '#111827' }}>{value}</p>
        {sub && <p style={{ margin: 0, fontSize: 12, color: '#9CA3AF' }}>{sub}</p>}
      </div>
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div style={{ background: 'white', border: '1px solid #E5E7EB', borderRadius: 10, padding: '10px 14px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
        <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#111827' }}>{label}</p>
        <p style={{ margin: '4px 0 0', fontSize: 14, color: '#3B82F6', fontWeight: 600 }}>
          R$ {payload[0].value.toLocaleString('pt-BR')}
        </p>
      </div>
    );
  }
  return null;
};

export default function Financeiro() {
  const { user } = useAuth();
  const [payments, setPayments] = useState([]);
  const [monthlyRevenue, setMonthlyRevenue] = useState([]);
  const [genModal, setGenModal] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [genResult, setGenResult] = useState(null);
  const [students, setStudents] = useState([]);
  const [newPayModal, setNewPayModal] = useState(false);
  const [newPayForm, setNewPayForm] = useState({ student_id: '', amount: '', due_date: new Date().toISOString().slice(0, 10), plan: 'Mensal', status: 'pendente' });
  const [newPaySaving, setNewPaySaving] = useState(false);

  const now = new Date();
  const currentMonthISO = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const currentMonth = now.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  const currentMonthLabel = currentMonth.charAt(0).toUpperCase() + currentMonth.slice(1);
  const last3Months = [2, 1, 0].map(offset => {
    const d = new Date(now.getFullYear(), now.getMonth() - offset, 1);
    const s = d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    return s.charAt(0).toUpperCase() + s.slice(1);
  });

  const loadPayments = () => {
    if (!user) return;
    if (hasSupabase) {
      supabase.from('payments').select('*').eq('personal_id', user.id)
        .then(({ data }) => {
          const list = data || [];
          setPayments(list);
          const byMonth = list.reduce((acc, p) => {
            const m = p.month || new Date(p.due_date).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' });
            if (!acc[m]) acc[m] = 0;
            acc[m] += Number(p.amount);
            return acc;
          }, {});
          setMonthlyRevenue(Object.entries(byMonth).map(([month, value]) => ({ month, value })));
        });
    } else {
      setPayments(mockPayments);
      setMonthlyRevenue(mockMonthlyRevenue);
    }
  };

  useEffect(() => {
    loadPayments();
    if (user && hasSupabase) {
      supabase.from('students').select('id, name, plan, plan_price').eq('personal_id', user.id).eq('status', 'ativo')
        .then(({ data }) => setStudents(data || []));
    }
  }, [user?.id]);

  const markPaid = async (id) => {
    const paidDate = new Date().toISOString().slice(0, 10);
    if (hasSupabase) {
      await supabase.from('payments').update({ status: 'pago', paid_date: paidDate }).eq('id', id);
    }
    setPayments(prev => prev.map(p => String(p.id) === String(id) ? { ...p, status: 'pago', paid_date: paidDate } : p));
  };

  const handleGenerate = async () => {
    if (!hasSupabase) {
      setGenModal(false);
      setGenResult({ count: 0, error: 'Disponível apenas com Supabase configurado.' });
      return;
    }
    setGenerating(true);
    setGenModal(false);

    const { data: activeStudents } = await supabase
      .from('students').select('id, name, plan, plan_price')
      .eq('personal_id', user.id).eq('status', 'ativo');

    if (!activeStudents?.length) {
      setGenResult({ count: 0, error: 'Nenhum aluno ativo encontrado.' });
      setGenerating(false);
      return;
    }

    const { data: existing } = await supabase
      .from('payments').select('student_id')
      .eq('personal_id', user.id)
      .gte('due_date', `${currentMonthISO}-01`)
      .lte('due_date', `${currentMonthISO}-31`);

    const existingIds = new Set((existing || []).map(p => String(p.student_id)));
    const toCreate = activeStudents.filter(s => !existingIds.has(String(s.id)));

    if (!toCreate.length) {
      setGenResult({ count: 0, skip: true });
      setGenerating(false);
      return;
    }

    const dueDate = `${currentMonthISO}-${String(now.getDate()).padStart(2, '0')}`;
    const records = toCreate.map(s => ({
      personal_id: user.id,
      student_id: s.id,
      student_name: s.name,
      plan: s.plan || 'Mensal',
      amount: s.plan_price || 0,
      due_date: dueDate,
      month: currentMonthLabel,
      status: 'pendente',
    }));

    const { error } = await supabase.from('payments').insert(records);
    if (!error) {
      setGenResult({ count: toCreate.length });
      loadPayments();
    } else {
      setGenResult({ count: 0, error: error.message });
    }
    setGenerating(false);
  };
  const handleNewPayment = async (e) => {
    e.preventDefault();
    setNewPaySaving(true);
    const student = students.find(s => String(s.id) === String(newPayForm.student_id));
    const record = {
      personal_id: user.id,
      student_id: newPayForm.student_id,
      student_name: student?.name || '',
      plan: newPayForm.plan,
      amount: Number(newPayForm.amount),
      due_date: newPayForm.due_date,
      month: new Date(newPayForm.due_date + 'T12:00:00').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }),
      status: newPayForm.status,
    };
    if (hasSupabase) {
      const { data } = await supabase.from('payments').insert(record).select().single();
      if (data) setPayments(prev => [data, ...prev]);
    } else {
      setPayments(prev => [{ ...record, id: Date.now() }, ...prev]);
    }
    setNewPaySaving(false);
    setNewPayModal(false);
    setNewPayForm({ student_id: '', amount: '', due_date: new Date().toISOString().slice(0, 10), plan: 'Mensal', status: 'pendente' });
  };

  const mayPayments = payments.filter(p => p.month === currentMonthLabel || !p.month);
  const totalMay = payments.reduce((sum, p) => sum + Number(p.amount), 0);
  const received = payments.filter(p => p.status === 'pago').reduce((sum, p) => sum + Number(p.amount), 0);
  const pending = payments.filter(p => p.status !== 'pago').reduce((sum, p) => sum + Number(p.amount), 0);

  return (
    <div className="page-padding" style={{ flex: 1 }}>
      {/* Confirmation modal */}
      {genModal && (
        <div className="modal-overlay" onClick={() => setGenModal(false)}>
          <div className="modal-content" style={{ maxWidth: 420, padding: 32 }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 20 }}>
              <div style={{ width: 48, height: 48, borderRadius: 14, background: '#FEF3C7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Zap size={24} color="#F59E0B" />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: '#111827' }}>Gerar cobranças de {currentMonthLabel}?</h3>
                <p style={{ margin: '6px 0 0', fontSize: 14, color: '#6B7280', lineHeight: 1.5 }}>
                  Serão criados registros de pagamento <b>pendente</b> para todos os alunos ativos que ainda não têm cobrança este mês.
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="btn-secondary" onClick={() => setGenModal(false)}>Cancelar</button>
              <button className="btn-primary" onClick={handleGenerate}>
                <Zap size={15} /> Gerar agora
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Result toast */}
      {genResult && (
        <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 300, background: genResult.error ? '#FEE2E2' : '#D1FAE5', border: `1px solid ${genResult.error ? '#FCA5A5' : '#6EE7B7'}`, borderRadius: 12, padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.12)', minWidth: 260 }}>
          {genResult.error
            ? <AlertCircle size={18} color="#EF4444" />
            : <CheckCircle size={18} color="#059669" />}
          <span style={{ fontSize: 14, fontWeight: 600, color: genResult.error ? '#991B1B' : '#065F46' }}>
            {genResult.error
              ? genResult.error
              : genResult.skip
                ? 'Todos os alunos já têm cobrança este mês.'
                : `${genResult.count} cobrança${genResult.count !== 1 ? 's' : ''} gerada${genResult.count !== 1 ? 's' : ''}!`}
          </span>
          <button onClick={() => setGenResult(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, marginLeft: 'auto', color: '#6B7280', display: 'flex' }}>
            <X size={16} />
          </button>
        </div>
      )}

      {/* New payment modal */}
      {newPayModal && (
        <div className="modal-overlay" onClick={() => setNewPayModal(false)}>
          <div className="modal-content" style={{ maxWidth: 460, padding: 28 }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: '#111827' }}>Novo Pagamento</h3>
              <button onClick={() => setNewPayModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', display: 'flex', padding: 4 }}><X size={18} /></button>
            </div>
            <form onSubmit={handleNewPayment}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label>Aluno *</label>
                  <select
                    value={newPayForm.student_id}
                    onChange={e => {
                      const s = students.find(st => String(st.id) === e.target.value);
                      setNewPayForm(f => ({ ...f, student_id: e.target.value, amount: s?.plan_price || f.amount, plan: s?.plan || f.plan }));
                    }}
                    required
                  >
                    <option value="">Selecionar aluno...</option>
                    {students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label>Valor (R$) *</label>
                    <input
                      type="number" min="0" step="0.01"
                      value={newPayForm.amount}
                      onChange={e => setNewPayForm(f => ({ ...f, amount: e.target.value }))}
                      placeholder="0,00" required
                    />
                  </div>
                  <div>
                    <label>Vencimento *</label>
                    <input
                      type="date"
                      value={newPayForm.due_date}
                      onChange={e => setNewPayForm(f => ({ ...f, due_date: e.target.value }))}
                      required
                    />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label>Plano</label>
                    <select value={newPayForm.plan} onChange={e => setNewPayForm(f => ({ ...f, plan: e.target.value }))}>
                      <option>Mensal</option>
                      <option>Trimestral</option>
                      <option>Semestral</option>
                      <option>Anual</option>
                      <option>Avulso</option>
                    </select>
                  </div>
                  <div>
                    <label>Status</label>
                    <select value={newPayForm.status} onChange={e => setNewPayForm(f => ({ ...f, status: e.target.value }))}>
                      <option value="pendente">Pendente</option>
                      <option value="pago">Pago</option>
                    </select>
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20, paddingTop: 16, borderTop: '1px solid #F3F4F6' }}>
                <button type="button" className="btn-secondary" onClick={() => setNewPayModal(false)}>Cancelar</button>
                <button type="submit" className="btn-primary" disabled={newPaySaving}>
                  <Plus size={15} /> {newPaySaving ? 'Salvando...' : 'Criar Pagamento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#111827' }}>Financeiro</h2>
          <p style={{ margin: '4px 0 0', fontSize: 14, color: '#6B7280' }}>Visão geral de receitas e pagamentos</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            className="btn-secondary"
            onClick={() => setNewPayModal(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 16px', fontSize: 13 }}
          >
            <Plus size={15} /> Novo Pagamento
          </button>
          <button
            className="btn-primary"
            onClick={() => setGenModal(true)}
            disabled={generating}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 16px', fontSize: 13, opacity: generating ? 0.7 : 1 }}
          >
            <Zap size={15} /> {generating ? 'Gerando...' : `Gerar cobranças de ${currentMonthLabel.split(' ')[0]}`}
          </button>
          <button
            className="btn-secondary"
            onClick={() => exportFinanceiroPDF(payments.map(p => ({ ...p, studentName: p.student_name || p.studentName, dueDate: p.due_date || p.dueDate, paidDate: p.paid_date || p.paidDate })), monthlyRevenue)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 14px', fontSize: 13 }}
          >
            <Download size={15} /> PDF
          </button>
          <button
            className="btn-secondary"
            onClick={() => exportFinanceiroExcel(payments.map(p => ({ ...p, studentName: p.student_name || p.studentName, dueDate: p.due_date || p.dueDate, paidDate: p.paid_date || p.paidDate })))}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 14px', fontSize: 13 }}
          >
            <Download size={15} /> Excel
          </button>
        </div>
      </div>

      {/* Stat boxes */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
        <StatBox
          icon={DollarSign}
          title="Total do Mês"
          value={`R$ ${totalMay.toLocaleString('pt-BR')}`}
          sub={currentMonthLabel}
          color="#3B82F6"
          bg="#EFF6FF"
        />
        <StatBox
          icon={CheckCircle}
          title="Recebido"
          value={`R$ ${received.toLocaleString('pt-BR')}`}
          sub={`${mayPayments.filter(p => p.status === 'pago').length} pagamentos`}
          color="#10B981"
          bg="#D1FAE5"
        />
        <StatBox
          icon={Clock}
          title="Pendente / Atrasado"
          value={`R$ ${pending.toLocaleString('pt-BR')}`}
          sub={`${mayPayments.filter(p => p.status !== 'pago').length} pagamentos`}
          color="#F59E0B"
          bg="#FEF3C7"
        />
      </div>

      {/* Chart + Table */}
      <div style={{ display: 'grid', gridTemplateColumns: '400px 1fr', gap: 20 }}>
        {/* Bar chart */}
        <div style={{ background: 'white', borderRadius: 12, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
          <h3 style={{ margin: '0 0 20px', fontSize: 16, fontWeight: 700, color: '#111827' }}>Receita Mensal</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={monthlyRevenue} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#6B7280' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#6B7280' }} axisLine={false} tickLine={false} tickFormatter={v => `R$${v/1000}k`} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="value" fill="url(#gradient)" radius={[6, 6, 0, 0]} />
              <defs>
                <linearGradient id="gradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3B82F6" />
                  <stop offset="100%" stopColor="#8B5CF6" />
                </linearGradient>
              </defs>
            </BarChart>
          </ResponsiveContainer>
          {(() => {
            const first = monthlyRevenue[0]?.value || 0;
            const last = monthlyRevenue[monthlyRevenue.length - 1]?.value || 0;
            const growth = first > 0 && monthlyRevenue.length > 1 ? Math.round(((last - first) / first) * 100) : null;
            if (growth === null) return null;
            const positive = growth >= 0;
            return (
              <div style={{ marginTop: 16, padding: '12px 0 0', borderTop: '1px solid #F3F4F6' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 13, color: '#6B7280' }}>
                    Crescimento ({monthlyRevenue[0]?.month?.split(' ')[0]}→{monthlyRevenue[monthlyRevenue.length - 1]?.month?.split(' ')[0]})
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <TrendingUp size={14} color={positive ? '#10B981' : '#EF4444'} />
                    <span style={{ fontSize: 14, fontWeight: 700, color: positive ? '#10B981' : '#EF4444' }}>
                      {positive ? '+' : ''}{growth}%
                    </span>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>

        {/* Payment table */}
        <div style={{ background: 'white', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
          <div style={{ padding: '20px 20px 0' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 700, color: '#111827' }}>Pagamentos - {currentMonthLabel}</h3>
          </div>
          <div className="table-scroll">
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>
                {['Aluno', 'Plano', 'Valor', 'Vencimento', 'Status', ''].map(h => (
                  <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {payments.map(p => (
                <tr key={p.id} className="table-row" style={{ borderBottom: '1px solid #F3F4F6' }}>
                  <td style={{ padding: '12px 16px', fontSize: 14, fontWeight: 600, color: '#111827' }}>{p.student_name || p.studentName}</td>
                  <td style={{ padding: '12px 16px', fontSize: 13, color: '#6B7280' }}>{p.plan}</td>
                  <td style={{ padding: '12px 16px', fontSize: 14, fontWeight: 700, color: '#111827' }}>
                    R$ {Number(p.amount).toLocaleString('pt-BR')}
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: 13, color: '#6B7280' }}>
                    {new Date((p.due_date || p.dueDate) + 'T12:00:00').toLocaleDateString('pt-BR')}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <Badge status={p.status} />
                  </td>
                  <td style={{ padding: '8px 16px' }}>
                    {p.status !== 'pago' && (
                      <button
                        onClick={() => markPaid(p.id)}
                        style={{ display: 'flex', alignItems: 'center', gap: 5, background: '#D1FAE5', border: 'none', borderRadius: 8, color: '#065F46', fontSize: 12, fontWeight: 700, padding: '6px 12px', cursor: 'pointer', whiteSpace: 'nowrap' }}
                      >
                        <CheckCircle size={13} /> Marcar pago
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      </div>

      {/* All months payments */}
      <div style={{ background: 'white', borderRadius: 12, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', marginTop: 20 }}>
        <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 700, color: '#111827' }}>Histórico de Pagamentos</h3>
        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
          {last3Months.map(month => {
            const mPayments = payments.filter(p => p.month === month);
            const mTotal = mPayments.reduce((sum, p) => sum + p.amount, 0);
            const mReceived = mPayments.filter(p => p.status === 'pago').reduce((sum, p) => sum + p.amount, 0);
            return (
              <div key={month} style={{ flex: 1, minWidth: 200, padding: '16px', background: '#F9FAFB', borderRadius: 10, border: '1px solid #F3F4F6' }}>
                <p style={{ margin: '0 0 8px', fontSize: 14, fontWeight: 700, color: '#111827' }}>{month}</p>
                <p style={{ margin: '0 0 4px', fontSize: 20, fontWeight: 800, color: '#111827' }}>
                  R$ {mTotal.toLocaleString('pt-BR')}
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
                  <div style={{ flex: 1, height: 6, background: '#E5E7EB', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${(mReceived / mTotal) * 100}%`, background: 'linear-gradient(90deg, #3B82F6, #8B5CF6)', borderRadius: 3 }} />
                  </div>
                  <span style={{ fontSize: 12, color: '#10B981', fontWeight: 600, whiteSpace: 'nowrap' }}>
                    {Math.round((mReceived / mTotal) * 100)}% recebido
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
