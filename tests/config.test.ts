import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG, taxLabel } from '../src/order/config';
import { STONE_KEYS } from '../src/order/data';

describe('owner config defaults', () => {
  it('prices every stone type', () => {
    for (const k of STONE_KEYS) expect(DEFAULT_CONFIG.stonePerCt[k]).toBeGreaterThan(0);
  });
  it('starts from the vendor terms and the tax rate', () => {
    expect(DEFAULT_CONFIG.markup).toBe(2.5);
    expect(DEFAULT_CONFIG.wastePct).toBe(10);
    expect(DEFAULT_CONFIG.labourPerG).toBe(10);
    expect(DEFAULT_CONFIG.taxRate).toBeCloseTo(0.0825);
  });
  it('has a carat weight for each standard stone size', () => {
    expect(DEFAULT_CONFIG.sizeCt['1.5']).toBe(0.015);
    for (const v of Object.values(DEFAULT_CONFIG.sizeCt)) expect(v).toBeGreaterThan(0);
  });
  it('labels the tax rate', () => {
    expect(taxLabel(DEFAULT_CONFIG)).toBe('Sales tax (8.25%, store location)');
  });
});
