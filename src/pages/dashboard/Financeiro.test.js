import { describe, it, expect } from 'vitest';
import { monthLabel, formatBRL } from './Financeiro';

describe('monthLabel', () => {
  it('sempre capitaliza a primeira letra — é o bug que sumia com pagamentos manuais', () => {
    // Antes da correção, "Novo Pagamento" gerava "agosto de 2026" (minúsculo)
    // enquanto os cards de totais comparavam com "Agosto de 2026" — o pagamento
    // simplesmente não entrava na conta do mês.
    const label = monthLabel(new Date(2026, 7, 15));
    expect(label[0]).toBe(label[0].toUpperCase());
    expect(label).toMatch(/^Agosto/);
  });

  it('duas chamadas pro mesmo mês produzem exatamente a mesma string', () => {
    // Essa é a propriedade que quebrou: o card usa currentMonthLabel,
    // o formulário gerava seu próprio texto separadamente — se as duas
    // rotas divergem em uma letra, o filtro por igualdade exata falha.
    const a = monthLabel(new Date(2026, 7, 1));
    const b = monthLabel(new Date(2026, 7, 28));
    expect(a).toBe(b);
  });
});

describe('formatBRL', () => {
  it('sempre mostra 2 casas decimais, mesmo em número redondo', () => {
    expect(formatBRL(1500)).toBe('1.500,00');
  });

  it('arredonda pra 2 casas em vez de truncar', () => {
    expect(formatBRL(1500.5)).toBe('1.500,50');
  });
});
