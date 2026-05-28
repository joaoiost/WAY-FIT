import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

// ── Helpers ──────────────────────────────────────────────────────────────────

function addHeader(doc, title, subtitle) {
  doc.setFillColor(59, 130, 246);
  doc.rect(0, 0, 210, 22, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('WAY FIT', 14, 10);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(title, 14, 17);
  doc.setTextColor(100, 100, 100);
  doc.setFontSize(9);
  doc.text(subtitle, 14, 28);
  doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, 155, 28);
  return 34;
}

// ── PDF: Lista de Alunos ─────────────────────────────────────────────────────

export function exportAlunosPDF(students) {
  const doc = new jsPDF();
  const startY = addHeader(doc, 'Lista de Alunos', `Total: ${students.length} alunos`);

  autoTable(doc, {
    startY,
    head: [['Nome', 'Email', 'Plano', 'Status', 'Objetivo', 'Desde']],
    body: students.map(s => [
      s.name,
      s.email || '-',
      s.plan,
      s.status,
      s.goal || '-',
      s.joinDate ? new Date(s.joinDate).toLocaleDateString('pt-BR') : '-',
    ]),
    headStyles: { fillColor: [59, 130, 246], fontStyle: 'bold', fontSize: 9 },
    bodyStyles: { fontSize: 9 },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    margin: { left: 14, right: 14 },
  });

  doc.save('wayfit-alunos.pdf');
}

// ── Excel: Lista de Alunos ───────────────────────────────────────────────────

export function exportAlunosExcel(students) {
  const data = students.map(s => ({
    Nome: s.name,
    Email: s.email || '',
    Telefone: s.phone || '',
    Plano: s.plan,
    'Valor (R$)': s.planPrice || '',
    Status: s.status,
    Objetivo: s.goal || '',
    'Desde': s.joinDate ? new Date(s.joinDate).toLocaleDateString('pt-BR') : '',
  }));

  const ws = XLSX.utils.json_to_sheet(data);
  ws['!cols'] = [{ wch: 20 }, { wch: 28 }, { wch: 18 }, { wch: 10 }, { wch: 12 }, { wch: 12 }, { wch: 20 }, { wch: 14 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Alunos');
  XLSX.writeFile(wb, 'wayfit-alunos.xlsx');
}

// ── PDF: Relatório Financeiro ─────────────────────────────────────────────────

export function exportFinanceiroPDF(payments, monthlyRevenue) {
  const doc = new jsPDF();
  const total = payments.reduce((s, p) => s + p.amount, 0);
  const received = payments.filter(p => p.status === 'pago').reduce((s, p) => s + p.amount, 0);
  const pending = payments.filter(p => p.status !== 'pago').reduce((s, p) => s + p.amount, 0);

  let y = addHeader(doc, 'Relatório Financeiro', `Período: ${[...new Set(payments.map(p => p.month))].join(', ')}`);

  // Summary boxes
  doc.setFontSize(10);
  doc.setTextColor(30, 30, 30);
  const boxes = [
    { label: 'Total', value: `R$ ${total.toLocaleString('pt-BR')}` },
    { label: 'Recebido', value: `R$ ${received.toLocaleString('pt-BR')}` },
    { label: 'Pendente', value: `R$ ${pending.toLocaleString('pt-BR')}` },
  ];
  boxes.forEach((b, i) => {
    const x = 14 + i * 62;
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(x, y, 58, 16, 3, 3, 'F');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text(b.label, x + 4, y + 6);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(30, 30, 30);
    doc.text(b.value, x + 4, y + 13);
  });

  y += 24;

  autoTable(doc, {
    startY: y,
    head: [['Aluno', 'Plano', 'Valor', 'Vencimento', 'Pagamento', 'Status', 'Mês']],
    body: payments.map(p => [
      p.studentName,
      p.plan,
      `R$ ${p.amount.toLocaleString('pt-BR')}`,
      new Date(p.dueDate + 'T12:00:00').toLocaleDateString('pt-BR'),
      p.paidDate ? new Date(p.paidDate + 'T12:00:00').toLocaleDateString('pt-BR') : '-',
      p.status.toUpperCase(),
      p.month || '-',
    ]),
    headStyles: { fillColor: [59, 130, 246], fontStyle: 'bold', fontSize: 8 },
    bodyStyles: { fontSize: 8 },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 5) {
        const status = data.cell.raw?.toLowerCase();
        if (status === 'pago') data.cell.styles.textColor = [5, 150, 105];
        else if (status === 'atrasado') data.cell.styles.textColor = [239, 68, 68];
        else data.cell.styles.textColor = [217, 119, 6];
      }
    },
    margin: { left: 14, right: 14 },
  });

  doc.save('wayfit-financeiro.pdf');
}

// ── PDF: Relatório do Aluno ───────────────────────────────────────────────────

export function exportStudentReport({ student, measurements, plans, attendances, payments }) {
  const doc = new jsPDF();
  const name = student?.name || 'Aluno';
  let y = addHeader(doc, `Relatório — ${name}`, `Plano: ${student?.plan || '—'} · Objetivo: ${student?.goal || '—'}`);

  // Stats summary
  const present = (attendances || []).filter(a => a.status === 'present').length;
  const total = (attendances || []).length;
  const rate = total > 0 ? Math.round((present / total) * 100) : 0;
  const lastPay = (payments || []).find(p => p.status === 'pago');
  const lastMeas = (measurements || []).slice(-1)[0];

  doc.setFontSize(10);
  doc.setTextColor(30, 30, 30);
  const boxes = [
    { label: 'Frequência (mês)', value: `${rate}%` },
    { label: 'Peso atual', value: lastMeas?.weight ? `${lastMeas.weight}kg` : '—' },
    { label: 'Últ. pagamento', value: lastPay ? new Date(lastPay.due_date+'T12:00:00').toLocaleDateString('pt-BR') : '—' },
  ];
  boxes.forEach((b, i) => {
    const x = 14 + i * 62;
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(x, y, 58, 16, 3, 3, 'F');
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(100, 100, 100);
    doc.text(b.label, x + 4, y + 6);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.setTextColor(30, 30, 30);
    doc.text(b.value, x + 4, y + 13);
  });
  y += 24;

  // Measurements table
  if (measurements?.length > 0) {
    doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(59, 130, 246);
    doc.text('Evolução de Medidas', 14, y); y += 4;
    autoTable(doc, {
      startY: y,
      head: [['Data', 'Peso (kg)', 'Gordura (%)', 'Cintura (cm)', 'Braço (cm)']],
      body: measurements.map(m => [
        new Date((m.date || m.recorded_at)+'T12:00:00').toLocaleDateString('pt-BR'),
        m.weight || '—', m.body_fat || '—', m.waist || '—', m.arm || '—',
      ]),
      headStyles: { fillColor: [59, 130, 246], fontSize: 8 },
      bodyStyles: { fontSize: 8 },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      margin: { left: 14, right: 14 },
    });
    y = doc.lastAutoTable.finalY + 10;
  }

  // Training plans
  if (plans?.length > 0) {
    doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(59, 130, 246);
    doc.text('Planos de Treino', 14, y); y += 4;
    const DAYS_SHORT = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
    autoTable(doc, {
      startY: y,
      head: [['Plano', 'Dias', 'Exercícios']],
      body: plans.map(p => [
        p.name,
        (p.days || []).map(d => DAYS_SHORT[d]).join(', '),
        (p.exercises || []).map(e => `${e.name} ${e.sets}x${e.reps}`).join(' · ').slice(0, 80),
      ]),
      headStyles: { fillColor: [139, 92, 246], fontSize: 8 },
      bodyStyles: { fontSize: 8 },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      margin: { left: 14, right: 14 },
    });
    y = doc.lastAutoTable.finalY + 10;
  }

  // Payments
  if (payments?.length > 0) {
    doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(59, 130, 246);
    if (y > 240) { doc.addPage(); y = 20; }
    doc.text('Histórico de Pagamentos', 14, y); y += 4;
    autoTable(doc, {
      startY: y,
      head: [['Mês', 'Valor', 'Vencimento', 'Status']],
      body: payments.slice(0, 10).map(p => [
        p.month || '—',
        `R$ ${Number(p.amount).toLocaleString('pt-BR')}`,
        new Date((p.due_date)+'T12:00:00').toLocaleDateString('pt-BR'),
        p.status === 'pago' ? 'Pago' : p.due_date < new Date().toISOString().slice(0,10) ? 'Atrasado' : 'Pendente',
      ]),
      headStyles: { fillColor: [16, 185, 129], fontSize: 8 },
      bodyStyles: { fontSize: 8 },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      margin: { left: 14, right: 14 },
    });
  }

  doc.save(`relatorio-${name.toLowerCase().replace(/\s+/g, '-')}.pdf`);
}

// ── Excel: Relatório Financeiro ──────────────────────────────────────────────

export function exportFinanceiroExcel(payments) {
  const data = payments.map(p => ({
    Aluno: p.studentName,
    Plano: p.plan,
    'Valor (R$)': p.amount,
    Vencimento: p.dueDate,
    'Data Pagamento': p.paidDate || '',
    Status: p.status,
    Mês: p.month || '',
  }));

  const ws = XLSX.utils.json_to_sheet(data);
  ws['!cols'] = [{ wch: 20 }, { wch: 10 }, { wch: 12 }, { wch: 14 }, { wch: 16 }, { wch: 12 }, { wch: 14 }];

  // Summary sheet
  const summary = payments.reduce((acc, p) => {
    const m = p.month || 'Outros';
    if (!acc[m]) acc[m] = { Mês: m, Total: 0, Recebido: 0, Pendente: 0 };
    acc[m].Total += p.amount;
    if (p.status === 'pago') acc[m].Recebido += p.amount;
    else acc[m].Pendente += p.amount;
    return acc;
  }, {});

  const ws2 = XLSX.utils.json_to_sheet(Object.values(summary));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Pagamentos');
  XLSX.utils.book_append_sheet(wb, ws2, 'Resumo por Mês');
  XLSX.writeFile(wb, 'wayfit-financeiro.xlsx');
}
