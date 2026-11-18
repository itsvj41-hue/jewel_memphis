import { CAD, KARATS, LEAD, METALS, STONES, STONE_KEYS, type Metal, type Mode, type StoneKey } from './data';
import type { OwnerConfig } from './config';
import type { Rates } from './rates';
import type { Customer, Dims } from './types';

export interface Market {
  cfg: OwnerConfig;
  rates: Rates;
}

export interface Price {
  grams: number;
  rate: number;
  metal: number;
  stone: number;
  making: number;
  subtotal: number;
  tax: number;
  total: number;
  low: number;
  high: number;
  tol: number;
  shareMetal: number;
  shareStone: number;
  shareMaking: number;
}

export interface Option extends Price {
  metalKey: Metal;
  stoneKey: StoneKey;
}

// Tolerance before CAD is generated: photo estimates are looser than dimensions.
const RANGE = { picture: 0.1, dims: 0.15 };

// Price per gram of this karat/alloy, from the spot rate of its metal family.
export function gramRate(mk: Market, m: Metal): number {
  const k = KARATS[m];
  const base = k.family === 'gold' ? mk.rates.gold24Gram
    : k.family === 'platinum' ? mk.rates.platinumGram
      : mk.rates.silverGram;
  return base * k.purity;
}

export function leadDays(m: Metal, s: StoneKey, mode: Mode): number {
  return LEAD.base + LEAD.queue
    + (mode === 'picture' ? LEAD.cadPicture : 0)
    + (m === 'PT950' ? LEAD.platinum : 0)
    + (s === 'naturalP' ? LEAD.premiumStone : 0);
}

export function readyDate(m: Metal, s: StoneKey, mode: Mode, today = new Date()): Date {
  return new Date(today.getFullYear(), today.getMonth(), today.getDate() + leadDays(m, s, mode));
}

export function cadVolumeCm3(d: Dims): number {
  return (Math.PI * (d.w / 2) * (d.h / 2) * d.d * (1 - CAD.openwork)) / 1000;
}

// Volume-based price. Until CAD exists, the metal weight carries a tolerance band.
export function price(mk: Market, d: Dims, m: Metal, s: StoneKey, mode: Mode, exact: boolean): Price {
  const grams = cadVolumeCm3(d) * KARATS[m].density;
  const rate = gramRate(mk, m);
  const metal = grams * rate;
  const stone = mk.cfg.stonePerCt[s] * STONES[s].carat;
  const making = mk.cfg.makingFee;
  const subtotal = metal + stone + making;
  const tax = subtotal * mk.cfg.taxRate;
  const total = subtotal + tax;
  const tol = exact ? 0 : RANGE[mode];
  const low = (metal * (1 - tol) + stone + making) * (1 + mk.cfg.taxRate);
  const high = (metal * (1 + tol) + stone + making) * (1 + mk.cfg.taxRate);
  return {
    grams, rate, metal, stone, making, subtotal, tax, total, low, high, tol,
    shareMetal: share(metal, subtotal),
    shareStone: share(stone, subtotal),
    shareMaking: share(making, subtotal),
  };
}

// Percent of a total, safe when the total is zero (no divide-by-zero NaN in the bars).
const share = (part: number, whole: number) => (whole > 0 ? (part / whole) * 100 : 0);

export function allOptions(mk: Market, d: Dims, mode: Mode, exact: boolean): Option[] {
  const out: Option[] = [];
  METALS.forEach(m => STONE_KEYS.forEach(s =>
    out.push({ ...price(mk, d, m, s, mode, exact), metalKey: m, stoneKey: s })));
  return out.sort((a, b) => a.total - b.total);
}

// Largest size the counter accepts. Nothing in this range is a real ornament.
export const MAX_DIM_MM = 300;

export type SizeKey = keyof Dims;
export type SizeErrors = Partial<Record<SizeKey, string>>;

// Each required size, with the message shown under its box.
export function sizeErrors(d: Dims): SizeErrors {
  const out: SizeErrors = {};
  (['w', 'h', 'd'] as const).forEach(k => {
    const v = d[k];
    if (!Number.isFinite(v) || v <= 0) out[k] = 'Required. Enter a size above 0.';
    else if (v > MAX_DIM_MM) out[k] = `Too large. The limit is ${MAX_DIM_MM} mm.`;
  });
  return out;
}

export function dimsOk(d: Dims): boolean {
  return Object.keys(sizeErrors(d)).length === 0;
}

// A phone number needs at least 7 digits. Email is optional, but if given it must look like one.
export function phoneOk(p: string): boolean {
  return p.replace(/\D/g, '').length >= 7;
}

export function emailOk(e: string): boolean {
  const v = e.trim();
  return v === '' || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

export type CustKey = 'name' | 'phone' | 'ornament' | 'email';
export type CustErrors = Partial<Record<CustKey, string>>;

// Required fields (name, phone, ornament) and the one optional field that must be valid if filled.
export function custErrors(c: Customer): CustErrors {
  const out: CustErrors = {};
  if (!c.name.trim()) out.name = 'Required. Enter the customer’s full name.';
  if (!c.phone.trim()) out.phone = 'Required. Enter a phone number.';
  else if (!phoneOk(c.phone)) out.phone = 'Enter at least 7 digits.';
  if (!c.ornament.trim()) out.ornament = 'Required. Name the ornament, for example “Lotus jhumka”.';
  if (!emailOk(c.email)) out.email = 'This email looks incomplete. Example: name@example.com';
  return out;
}

// A deposit typed by the user: a percentage from 1 to 100. Returns null when it is not valid.
export function parseDeposit(text: string): number | null {
  const v = Number(text.trim().replace('%', ''));
  return text.trim() !== '' && Number.isFinite(v) && v > 0 && v <= 100 ? Math.round(v * 100) / 100 : null;
}

export function custOk(c: Customer): boolean {
  return Object.keys(custErrors(c)).length === 0;
}

export interface CadRule {
  label: string;
  ok: boolean;
  detail: string;
}

export function cadRules(d: Dims): CadRule[] {
  const minSide = Math.min(d.w, d.h, d.d);
  const need = CAD.stoneDia + CAD.minWall;
  return [
    { label: 'Thinnest side at least 0.8 mm (casting wall)', ok: minSide >= CAD.minWall, detail: `${minSide} mm` },
    {
      label: 'Fits the 88 × 88 × 125 mm print tray',
      ok: Math.max(d.w, d.h) <= CAD.tray[0] && d.d <= CAD.tray[2],
      detail: `${d.w} × ${d.h} × ${d.d} mm`,
    },
    { label: 'Depth holds the 0.20 ct stone seat', ok: d.d >= need, detail: `needs ≥ ${need.toFixed(1)} mm` },
  ];
}

export function allCadOk(d: Dims): boolean {
  return cadRules(d).every(r => r.ok);
}
