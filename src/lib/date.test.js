import { describe, it, expect } from 'vitest';
import { todayLocal, toLocalDateStr } from './date';

describe('toLocalDateStr', () => {
  it('formata ano-mes-dia com zero à esquerda', () => {
    expect(toLocalDateStr(new Date(2026, 0, 5))).toBe('2026-01-05');
    expect(toLocalDateStr(new Date(2026, 11, 31))).toBe('2026-12-31');
  });

  it('usa os componentes LOCAIS da data, não UTC — é o bug que motivou este arquivo', () => {
    // 23h59 do dia 19: se convertido pra UTC num fuso UTC-3 (Brasil),
    // vira 02h59 do dia 20 — o bug original. toLocalDateStr não pode fazer isso.
    const lateNight = new Date(2026, 7, 19, 23, 59, 0);
    expect(toLocalDateStr(lateNight)).toBe('2026-08-19');
  });

  it('meia-noite em ponto ainda conta como o mesmo dia', () => {
    const midnight = new Date(2026, 7, 19, 0, 0, 0);
    expect(toLocalDateStr(midnight)).toBe('2026-08-19');
  });
});

describe('todayLocal', () => {
  it('bate com a data local do relógio da máquina, não com a UTC', () => {
    const now = new Date();
    const expected = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    expect(todayLocal()).toBe(expected);
  });
});
