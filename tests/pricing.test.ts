import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG } from '../src/order/config';
import { allCadOk, cadRules, custOk, dimsOk, MAX_DIM_MM, parseAmount, depositDue, percentOf } from '../src/order/pricing';
import { TROY_OZ_GRAMS } from '../src/order/data';
import { manualRates } from '../src/order/rates';

const dims = { w: 22, h: 10, d: 5 };

describe('CAD rules', () => {
  it('accepts the standard size', () => {
    expect(allCadOk(dims)).toBe(true);
  });
  it('rejects a wall thinner than 0.8 mm', () => {
    expect(allCadOk({ w: 22, h: 10, d: 0.5 })).toBe(false);
  });
  it('rejects a piece that is too big for the print tray', () => {
    expect(cadRules({ w: 100, h: 10, d: 5 })[1].ok).toBe(false);
  });
  it('rejects a depth too shallow for the stone seat', () => {
    expect(cadRules({ w: 22, h: 10, d: 4 })[2].ok).toBe(false);
  });
});

describe('input checks', () => {
  it('rejects empty or zero sizes', () => {
    expect(dimsOk({ w: 0, h: 10, d: 5 })).toBe(false);
    expect(dimsOk({ w: NaN, h: 10, d: 5 })).toBe(false);
    expect(dimsOk(dims)).toBe(true);
  });
  it('needs name, phone and ornament', () => {
    const c = { name: 'A', phone: '(901) 555-0100', email: '', ornament: 'X', occasion: '', needed: '', notes: '' };
    expect(custOk(c)).toBe(true);
    expect(custOk({ ...c, phone: ' ' })).toBe(false);
    expect(custOk({ ...c, phone: '555-01' })).toBe(false); // fewer than 7 digits
  });

  it('checks an optional email only when one is typed', () => {
    const c = { name: 'A', phone: '9015550100', email: '', ornament: 'X', occasion: '', needed: '', notes: '' };
    expect(custOk({ ...c, email: 'meera@example.com' })).toBe(true);
    expect(custOk({ ...c, email: 'meera@' })).toBe(false);
    expect(custOk({ ...c, email: 'not an email' })).toBe(false);
  });
});

it('converts troy ounces to grams for manual rates', () => {
  expect(TROY_OZ_GRAMS).toBeCloseTo(31.1035);
});

describe('deposit amounts', () => {
  it('reads dollar amounts, with or without $ and commas, and rejects the rest', () => {
    expect(parseAmount('300')).toBe(300);
    expect(parseAmount('$1,250.50')).toBe(1250.5);
    expect(parseAmount(' 99.999 ')).toBe(100);
    expect(parseAmount('0')).toBeNull();
    expect(parseAmount('-5')).toBeNull();
    expect(parseAmount('abc')).toBeNull();
    expect(parseAmount('')).toBeNull();
  });

  it('uses the default percentage when no amount is saved, and never exceeds the total', () => {
    expect(depositDue(1000, null, 50)).toBe(500);
    expect(depositDue(1000, 300, 50)).toBe(300);
    expect(depositDue(1000, 1500, 50)).toBe(1000);
    expect(depositDue(1073.32, null, 25)).toBe(268.33);
  });

  it('turns a preset percentage into dollars', () => {
    expect(percentOf(1073.32, 25)).toBe(268.33);
    expect(percentOf(1073.32, 100)).toBe(1073.32);
  });
});
