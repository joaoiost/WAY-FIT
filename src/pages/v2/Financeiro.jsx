import { useState, useEffect } from 'react';
import { DollarSign, CheckCircle, Clock, Plus, Zap, MessageCircle, Key, Pencil } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { supabase, hasSupabase } from '../../lib/supabase';
import { toast } from '../../lib/toast';
import { todayLocal } from '../../lib/date';
import ModalV2 from '../../components/v2/Modal';

function formatBRL(value) {
  return Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function monthLabel(date) {
  const s = date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function StatusBadge({ status, dueDate }) {
  const isLate = status !== 'pago' && dueDate < todayLocal();
  if (status === 'pago') return <span className="text-[10.5px] font-bold px-2 py-0.5 rounded-full bg-success-50 text-success-500">Pago</span>;
  if (isLate) return <span className="text-[10.5px] font-bold px-2 py-0.5 rounded-full bg-danger-50 text-danger-500">Atrasado</span>;
  return <span className="text-[10.5px] font-bold px-2 py-0.5 rounded-full bg-warning-50 text-warning-500">Pendente</span>;
}

export default function FinanceiroV2() {
  const { user } = useAuth();
  const [payments, setPayments] = useState([]);
  const [students, setStudents] = useState([]);
  const [pixKey, setPixKey] = useState('');
  const [pixEditing, setPixEditing] = useState(false);
  const [pixInput, setPixInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [newPayOpen, setNewPayOpen] = useState(false);
  const [newPayForm, setNewPayForm] = useState({ student_id: '', amount: '', due_date: todayLocal(), plan: 'Mensal', status: 'pendente' });
  const [genPreview, setGenPreview] = useState(null);
  const [generating, setGenerating] = useState(false);

  const now = new Date();
  const currentMonthLabel = monthLabel(now);

  const loadPayments = () => {
    if (!user || !hasSupabase) return;
    const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1).toISOString().slice(0, 10);
    supabase.from('payments').select('*').eq('personal_id', user.id).gte('due_date', twelveMonthsAgo).order('due_date', { ascending: false })
      .then(({ data }) => setPayments(data || []));
  };

  useEffect(() => {
    if (!user || !hasSupabase) { setLoading(false); return; }
    loadPayments();
    supabase.from('students').select('id, name, plan, plan_price, phone').eq('personal_id', user.id).eq('status', 'ativo')
      .then(({ data }) => { setStudents(data || []); setLoading(false); });
    supabase.from('profiles').select('pix_key').eq('id', user.id).maybeSingle()
      .then(({ data }) => { if (data?.pix_key) setPixKey(data.pix_key); });
  }, [user?.id]);

  const savePixKey = async () => {
    if (!pixInput.trim()) return;
    setPixKey(pixInput.trim());
    await supabase.from('profiles').update({ pix_key: pixInput.trim() }).eq('id', user.id);
    setPixEditing(false);
    toast.success('Chave PIX salva!');
  };

  const sendPixCharge = (payment) => {
    const student = students.find(s => String(s.id) === String(payment.student_id));
    const phone = student?.phone?.replace(/\D/g, '');
    if (!phone) { toast.error('Esse aluno não tem telefone cadastrado.'); return; }
    const full = phone.startsWith('55') ? phone : `55${phone}`;
    const name = (payment.student_name || student?.name || '').split(' ')[0];
    const due = new Date(payment.due_date + 'T12:00:00').toLocaleDateString('pt-BR');
    const msg = `Olá ${name}!\n\nVencimento da sua mensalidade:\n• Plano: ${payment.plan}\n• Valor: R$ ${formatBRL(payment.amount)}\n• Vencimento: ${due}\n\nChave PIX: *${pixKey}*\n\nApós o pagamento, me confirme aqui.`;
    window.open(`https://wa.me/${full}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const markPaid = async (id) => {
    const paidDate = todayLocal();
    await supabase.from('payments').update({ status: 'pago', paid_date: paidDate }).eq('id', id);
    setPayments(prev => prev.map(p => p.id === id ? { ...p, status: 'pago', paid_date: paidDate } : p));
    toast.success('Pagamento marcado como pago!');
  };

  const openGeneratePreview = async () => {
    const currentMonthISO = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const { data: existing } = await supabase.from('payments').select('student_id').eq('personal_id', user.id).gte('due_date', `${currentMonthISO}-01`).lte('due_date', `${currentMonthISO}-31`);
    const existingIds = new Set((existing || []).map(p => String(p.student_id)));
    const toCreate = students.filter(s => !existingIds.has(String(s.id)));
    setGenPreview(toCreate.map(s => ({ student: s, amount: s.plan_price || 0, include: true })));
  };

  const confirmGenerate = async () => {
    const rows = genPreview.filter(r => r.include && Number(r.amount) > 0);
    if (rows.length === 0) { toast.error('Informe um valor maior que zero pra pelo menos um aluno selecionado.'); return; }
    setGenerating(true);
    const currentMonthISO = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const dueDate = `${currentMonthISO}-${String(now.getDate()).padStart(2, '0')}`;
    const records = rows.map(r => ({
      personal_id: user.id, student_id: r.student.id, student_name: r.student.name,
      plan: r.student.plan || 'Mensal', amount: Number(r.amount), due_date: dueDate, month: currentMonthLabel, status: 'pendente',
    }));
    const { error } = await supabase.from('payments').insert(records);
    setGenerating(false);
    setGenPreview(null);
    if (error) { toast.error('Erro ao gerar cobranças.'); return; }
    toast.success(`${rows.length} cobrança${rows.length > 1 ? 's' : ''} gerada${rows.length > 1 ? 's' : ''}!`);
    loadPayments();
  };

  const handleNewPayment = async () => {
    if (!(Number(newPayForm.amount) > 0)) { toast.error('Informe um valor maior que zero.'); return; }
    const student = students.find(s => s.id === newPayForm.student_id);
    const record = {
      personal_id: user.id, student_id: newPayForm.student_id, student_name: student?.name || '',
      plan: newPayForm.plan, amount: Number(newPayForm.amount), due_date: newPayForm.due_date,
      month: monthLabel(new Date(newPayForm.due_date + 'T12:00:00')), status: newPayForm.status,
    };
    const { data, error } = await supabase.from('payments').insert(record).select().single();
    if (error) { toast.error('Não foi possível criar o pagamento.'); return; }
    setPayments(prev => [data, ...prev]);
    setNewPayOpen(false);
    setNewPayForm({ student_id: '', amount: '', due_date: todayLocal(), plan: 'Mensal', status: 'pendente' });
    toast.success('Pagamento criado!');
  };

  const currentPayments = payments.filter(p => p.month === currentMonthLabel);
  const totalCurrent = currentPayments.reduce((s, p) => s + Number(p.amount), 0);
  const received = currentPayments.filter(p => p.status === 'pago').reduce((s, p) => s + Number(p.amount), 0);
  const pending = currentPayments.filter(p => p.status !== 'pago').reduce((s, p) => s + Number(p.amount), 0);

  if (loading) return <div className="py-24 text-center text-sm text-ink-400">Carregando...</div>;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-ink-900">Financeiro</h2>
          <p className="text-[13px] text-ink-500 mt-0.5">Visão geral de receitas e pagamentos</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={() => setNewPayOpen(true)} className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-ink-200 text-[12.5px] font-semibold text-ink-700 hover:bg-ink-50">
            <Plus size={14} /> Novo pagamento
          </button>
          <button onClick={openGeneratePreview} className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-brand-600 text-white text-[12.5px] font-semibold hover:bg-brand-700">
            <Zap size={14} /> Gerar cobranças de {currentMonthLabel.split(' ')[0]}
          </button>
        </div>
      </div>

      <div className="bg-white border border-ink-100 rounded-xl px-4 py-3 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-brand-50 text-brand-600 flex items-center justify-center shrink-0"><Key size={15} /></div>
        {pixEditing ? (
          <>
            <input
              autoFocus value={pixInput} onChange={(e) => setPixInput(e.target.value)}
              placeholder="CPF, e-mail, telefone ou chave aleatória"
              className="flex-1 px-3 py-1.5 rounded-lg border border-ink-200 text-sm text-ink-900 outline-none focus:border-brand-500"
            />
            <button onClick={savePixKey} className="px-3 py-1.5 rounded-lg bg-brand-600 text-white text-[12.5px] font-semibold">Salvar</button>
            <button onClick={() => setPixEditing(false)} className="px-3 py-1.5 rounded-lg text-[12.5px] font-medium text-ink-500">Cancelar</button>
          </>
        ) : (
          <>
            <p className="flex-1 text-[13px] text-ink-700">
              {pixKey ? <>Chave PIX: <strong className="text-ink-900">{pixKey}</strong></> : 'Nenhuma chave PIX configurada — cadastre pra cobrar direto pelo WhatsApp.'}
            </p>
            <button onClick={() => { setPixInput(pixKey); setPixEditing(true); }} className="flex items-center gap-1 text-[12px] font-semibold text-brand-600 hover:text-brand-700">
              <Pencil size={12} /> {pixKey ? 'Editar' : 'Configurar'}
            </button>
          </>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white border border-ink-100 rounded-xl p-4 flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center shrink-0"><DollarSign size={20} /></div>
          <div><p className="text-[11px] text-ink-400 font-medium">Total do mês</p><p className="text-lg font-extrabold text-ink-900">R$ {formatBRL(totalCurrent)}</p></div>
        </div>
        <div className="bg-white border border-ink-100 rounded-xl p-4 flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-success-50 text-success-500 flex items-center justify-center shrink-0"><CheckCircle size={20} /></div>
          <div><p className="text-[11px] text-ink-400 font-medium">Recebido</p><p className="text-lg font-extrabold text-ink-900">R$ {formatBRL(received)}</p></div>
        </div>
        <div className="bg-white border border-ink-100 rounded-xl p-4 flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-warning-50 text-warning-500 flex items-center justify-center shrink-0"><Clock size={20} /></div>
          <div><p className="text-[11px] text-ink-400 font-medium">Pendente / atrasado</p><p className="text-lg font-extrabold text-ink-900">R$ {formatBRL(pending)}</p></div>
        </div>
      </div>

      <div className="bg-white border border-ink-100 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-ink-100">
          <p className="text-[13px] font-bold text-ink-900">Pagamentos — {currentMonthLabel}</p>
        </div>
        {currentPayments.length === 0 ? (
          <div className="py-12 text-center"><p className="text-[13px] text-ink-500">Nenhum pagamento neste mês.</p></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-ink-100">
                  {['Aluno', 'Plano', 'Valor', 'Vencimento', 'Status', ''].map(h => (
                    <th key={h} className="px-4 py-2.5 text-[10.5px] font-bold uppercase text-ink-400">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {currentPayments.map(p => (
                  <tr key={p.id} className="border-b border-ink-50 last:border-0">
                    <td className="px-4 py-2.5 text-[13px] font-semibold text-ink-900 whitespace-nowrap">{p.student_name}</td>
                    <td className="px-4 py-2.5 text-[12.5px] text-ink-500 whitespace-nowrap">{p.plan}</td>
                    <td className="px-4 py-2.5 text-[13px] font-bold text-ink-900 whitespace-nowrap">R$ {formatBRL(p.amount)}</td>
                    <td className="px-4 py-2.5 text-[12.5px] text-ink-500 whitespace-nowrap">{new Date(p.due_date + 'T12:00:00').toLocaleDateString('pt-BR')}</td>
                    <td className="px-4 py-2.5"><StatusBadge status={p.status} dueDate={p.due_date} /></td>
                    <td className="px-4 py-2.5">
                      {p.status !== 'pago' && (
                        <div className="flex gap-1.5">
                          <button onClick={() => sendPixCharge(p)} className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-brand-50 text-brand-600 text-[11.5px] font-semibold hover:bg-brand-100 whitespace-nowrap">
                            <MessageCircle size={12} /> PIX
                          </button>
                          <button onClick={() => markPaid(p.id)} className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-success-50 text-success-500 text-[11.5px] font-semibold hover:bg-success-50/70 whitespace-nowrap">
                            <CheckCircle size={12} /> Pago
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ModalV2
        isOpen={newPayOpen}
        onClose={() => setNewPayOpen(false)}
        title="Novo pagamento"
        footer={
          <>
            <button onClick={() => setNewPayOpen(false)} className="px-4 py-2 rounded-lg text-sm font-medium text-ink-500 hover:bg-ink-50">Cancelar</button>
            <button onClick={handleNewPayment} className="px-4 py-2 rounded-lg bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700">Criar</button>
          </>
        }
      >
        <div className="flex flex-col gap-3.5">
          <div>
            <label className="block text-xs font-semibold text-ink-700 mb-1.5">Aluno *</label>
            <select
              value={newPayForm.student_id}
              onChange={(e) => {
                const s = students.find(st => st.id === e.target.value);
                setNewPayForm(f => ({ ...f, student_id: e.target.value, amount: s?.plan_price || f.amount, plan: s?.plan || f.plan }));
              }}
              className="w-full px-3 py-2 rounded-lg border border-ink-200 text-sm text-ink-900 outline-none"
            >
              <option value="">Selecionar aluno...</option>
              {students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-ink-700 mb-1.5">Valor (R$) *</label>
              <input type="number" min="0" step="0.01" value={newPayForm.amount} onChange={(e) => setNewPayForm(f => ({ ...f, amount: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-ink-200 text-sm text-ink-900 outline-none" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink-700 mb-1.5">Vencimento *</label>
              <input type="date" value={newPayForm.due_date} onChange={(e) => setNewPayForm(f => ({ ...f, due_date: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-ink-200 text-sm text-ink-900 outline-none" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-ink-700 mb-1.5">Plano</label>
              <select value={newPayForm.plan} onChange={(e) => setNewPayForm(f => ({ ...f, plan: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-ink-200 text-sm text-ink-900 outline-none">
                {['Mensal', 'Trimestral', 'Semestral', 'Anual', 'Avulso'].map(p => <option key={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink-700 mb-1.5">Status</label>
              <select value={newPayForm.status} onChange={(e) => setNewPayForm(f => ({ ...f, status: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-ink-200 text-sm text-ink-900 outline-none">
                <option value="pendente">Pendente</option>
                <option value="pago">Pago</option>
              </select>
            </div>
          </div>
        </div>
      </ModalV2>

      <ModalV2
        isOpen={!!genPreview}
        onClose={() => setGenPreview(null)}
        title={`Revisar cobranças de ${currentMonthLabel}`}
        footer={
          <>
            <button onClick={() => setGenPreview(null)} className="px-4 py-2 rounded-lg text-sm font-medium text-ink-500 hover:bg-ink-50">Cancelar</button>
            <button
              onClick={confirmGenerate}
              disabled={generating || !genPreview?.some(r => r.include)}
              className="px-4 py-2 rounded-lg bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 disabled:opacity-40"
            >
              {generating ? 'Gerando...' : `Gerar ${genPreview?.filter(r => r.include).length || 0} cobrança${genPreview?.filter(r => r.include).length === 1 ? '' : 's'}`}
            </button>
          </>
        }
      >
        {genPreview?.length === 0 ? (
          <p className="text-[13.5px] text-ink-500">Todos os alunos ativos já têm cobrança este mês.</p>
        ) : (
          <div className="flex flex-col gap-1.5">
            <p className="text-[12.5px] text-ink-500 mb-1">Confira os valores antes de gerar. Desmarque quem não deve ser cobrado agora.</p>
            {genPreview?.map((row, i) => (
              <div key={row.student.id} className="flex items-center gap-2.5 py-1.5">
                <input
                  type="checkbox" checked={row.include}
                  onChange={(e) => setGenPreview(prev => prev.map((r, idx) => idx === i ? { ...r, include: e.target.checked } : r))}
                  className="w-4 h-4 accent-brand-600 shrink-0"
                />
                <span className="flex-1 text-[13px] text-ink-900 truncate">{row.student.name}</span>
                <div className="flex items-center gap-1 shrink-0">
                  <span className="text-[12px] text-ink-400">R$</span>
                  <input
                    type="number" value={row.amount}
                    onChange={(e) => setGenPreview(prev => prev.map((r, idx) => idx === i ? { ...r, amount: e.target.value } : r))}
                    className="w-20 px-2 py-1 rounded-md border border-ink-200 text-[13px] text-ink-900 text-right outline-none"
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </ModalV2>
    </div>
  );
}
