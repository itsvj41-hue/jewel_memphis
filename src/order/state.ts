import { useEffect, useReducer, useRef, useState } from 'react';
import { DRAFT_KEY, type Metal, type StoneKey, type Mode } from './data';
import { DEFAULT_CONFIG } from './config';
import { allCadOk } from './pricing';
import { nowTime } from './format';
import { saveOrderRemote } from './db';
import type { CheckKey, Customer, Dims, OrderState } from './types';

export type Action =
  | { type: 'go'; step: number }
  | { type: 'cust'; key: keyof Customer; value: string }
  | { type: 'occasion'; value: string }
  | { type: 'mode'; mode: Mode }
  | { type: 'photo'; on: boolean }
  | { type: 'dim'; key: keyof Dims; value: number }
  | { type: 'metal'; metal: Metal }
  | { type: 'stone'; stone: StoneKey }
  | { type: 'budget'; value: number | null }
  | { type: 'showBudget' }
  | { type: 'hideBudget' }
  | { type: 'fit'; fitOnly: boolean }
  | { type: 'select'; metal: Metal; stone: StoneKey }
  | { type: 'resetOriginal' }
  | { type: 'continueToEstimate' }
  | { type: 'generateCad' }
  | { type: 'deposit'; value: number }
  | { type: 'check'; key: CheckKey; on: boolean }
  | { type: 'send' }
  | { type: 'newOrder'; orderNo: string }
  | { type: 'load'; order: OrderState };

// Order numbers are the database key, so they must not collide. Time plus a random
// suffix gives a unique ID for practical purposes (the old 500-value range overwrote orders).
export function newOrderNo(): string {
  const time = Date.now().toString(36).slice(-5).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 7).toUpperCase().padEnd(5, '0');
  return `CO-${time}${rand}`;
}

// Fill any missing or invalid field from a blank order, so older or damaged saves still open.
export function normalizeOrder(saved: Partial<OrderState>): OrderState {
  const base = blankOrder(saved.orderNo ?? newOrderNo());
  const dim = (v: unknown, fallback: number) => (typeof v === 'number' && Number.isFinite(v) && v > 0 ? v : fallback);
  const step = typeof saved.step === 'number' && saved.step >= 0 && saved.step <= 4 ? saved.step : 0;
  return {
    ...base,
    ...saved,
    step,
    cust: { ...base.cust, ...saved.cust },
    dims: {
      w: dim(saved.dims?.w, base.dims.w),
      h: dim(saved.dims?.h, base.dims.h),
      d: dim(saved.dims?.d, base.dims.d),
    },
    checks: { ...base.checks, ...saved.checks },
    restored: false,
  };
}

export function blankOrder(orderNo: string): OrderState {
  return {
    step: 0,
    orderNo,
    cust: { name: '', phone: '', email: '', ornament: '', occasion: '', needed: '', notes: '' },
    mode: 'picture',
    photo: false,
    dims: { w: 22, h: 10, d: 5 },
    metal: '18K',
    stone: 'natural',
    orig: null,
    budget: null,
    fitOnly: true,
    showBudget: false,
    exact: false,
    deposit: DEFAULT_CONFIG.defaultDeposit,
    checks: { details: false, design: false, price: false, deposit: false },
    sent: false,
    restored: false,
  };
}

export function reduce(s: OrderState, a: Action): OrderState {
  switch (a.type) {
    case 'go':
      return { ...s, step: a.step };
    case 'cust':
      return { ...s, cust: { ...s.cust, [a.key]: a.value } };
    case 'occasion':
      return { ...s, cust: { ...s.cust, occasion: s.cust.occasion === a.value ? '' : a.value } };
    case 'mode':
      return { ...s, mode: a.mode, photo: false, exact: false };
    case 'photo':
      return { ...s, photo: a.on };
    case 'dim':
      // Any size change invalidates the CAD model (the prototype only did this for valid sizes).
      return { ...s, dims: { ...s.dims, [a.key]: a.value }, exact: false };
    case 'metal':
      return { ...s, metal: a.metal };
    case 'stone':
      return { ...s, stone: a.stone };
    case 'budget':
      return { ...s, budget: a.value };
    case 'showBudget':
      return { ...s, showBudget: true };
    case 'hideBudget':
      return { ...s, showBudget: false, budget: null };
    case 'fit':
      return { ...s, fitOnly: a.fitOnly };
    case 'select':
      return { ...s, metal: a.metal, stone: a.stone };
    case 'resetOriginal':
      return s.orig ? { ...s, metal: s.orig.metal, stone: s.orig.stone } : s;
    case 'continueToEstimate':
      return { ...s, orig: { metal: s.metal, stone: s.stone }, step: 2 };
    case 'generateCad':
      return allCadOk(s.dims) ? { ...s, exact: true } : s;
    case 'deposit':
      // Only 1 to 100 percent is a real deposit. Anything else keeps the current value.
      return Number.isFinite(a.value) && a.value > 0 && a.value <= 100 ? { ...s, deposit: a.value } : s;
    case 'check':
      return { ...s, checks: { ...s.checks, [a.key]: a.on } };
    case 'send':
      return { ...s, sent: true };
    case 'newOrder':
      return blankOrder(a.orderNo);
    case 'load':
      return normalizeOrder(a.order);
  }
}

function loadInitial(): OrderState {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (raw) {
      const saved = JSON.parse(raw) as Partial<OrderState> | null;
      if (saved && !saved.sent) {
        return { ...normalizeOrder(saved), restored: true };
      }
    }
  } catch {
    /* ignore a damaged draft */
  }
  return blankOrder(newOrderNo());
}

// Holds the order. Autosaves the draft to this device, and syncs to Supabase when configured.
export function useOrder() {
  const [state, dispatch] = useReducer(reduce, undefined, loadInitial);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (state.sent) return; // a sent order is not autosaved locally, as in the prototype
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(state));
      setSavedAt(nowTime());
    } catch {
      /* storage unavailable: keep working without autosave */
    }
  }, [state]);

  useEffect(() => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      saveOrderRemote(state)
        .then(() => setSyncError(null))
        .catch(() => setSyncError('Not synced. Changes are saved on this device.'));
    }, 1200);
    return () => window.clearTimeout(timer.current);
  }, [state]);

  return { state, dispatch, savedAt, syncError };
}
