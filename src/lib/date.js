// Data de hoje no fuso horário LOCAL do usuário, formato YYYY-MM-DD.
// new Date().toISOString() converte pra UTC antes de formatar — no Brasil
// (UTC-3), isso faz qualquer registro feito depois das ~21h cair no dia
// seguinte silenciosamente. Use sempre isto em vez de
// `new Date().toISOString().slice(0, 10)` para "qual é o dia de hoje".
export function todayLocal() {
  return toLocalDateStr(new Date());
}

// Converte um objeto Date para YYYY-MM-DD usando os componentes locais
// (ano/mês/dia como o relógio do dispositivo mostra), não UTC.
export function toLocalDateStr(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
