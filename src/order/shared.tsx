import type { Dispatch, ReactNode } from 'react';
import { KARATS, METALS, STONES, STONE_KEYS, type Metal, type StoneKey } from './data';
import type { Action } from './state';
import type { OrderState } from './types';

export interface StepProps {
  s: OrderState;
  dispatch: Dispatch<Action>;
}

export function Kv({ label, value, cls = '' }: { label: ReactNode; value: ReactNode; cls?: string }) {
  return (
    <div className={`kv ${cls}`}>
      <span>{label}</span>
      <b>{value}</b>
    </div>
  );
}

export function NumField({ label, value, onChange, error, id }: { label: string; value: number; onChange: (n: number) => void; error?: string; id?: string }) {
  return (
    <label className="size-field">
      <span>{label}<span className="req" aria-hidden="true">*</span></span>
      <input
        id={id}
        type="number"
        inputMode="decimal"
        min="0.5"
        step="0.5"
        aria-required="true"
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={error && id ? `${id}-err` : undefined}
        value={Number.isFinite(value) ? value : ''}
        onChange={e => onChange(parseFloat(e.target.value))}
      />
      {error && <small id={id ? `${id}-err` : undefined} className="field-error">{error}</small>}
    </label>
  );
}

// Moves the keyboard and screen-reader focus to the first field that needs attention.
export function focusFirstInvalid(): void {
  window.setTimeout(() => {
    const el = document.querySelector<HTMLElement>('[aria-invalid="true"]');
    el?.focus();
    el?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }, 0);
}

export function Proportions({ share }: { share: { metal: number; stone: number; making: number } }) {
  return (
    <>
      <div className="bar">
        <div className="m" style={{ flex: share.metal }} />
        <div className="s" style={{ flex: share.stone }} />
        <div className="k" style={{ flex: share.making }} />
      </div>
      <div className="legend">
        <span><i style={{ background: 'var(--metal)' }} />Metal {share.metal.toFixed(0)}%</span>
        <span><i style={{ background: 'var(--stone)' }} />Stones {share.stone.toFixed(0)}%</span>
        <span><i style={{ background: 'var(--making)' }} />Making {share.making.toFixed(0)}%</span>
      </div>
    </>
  );
}

export const TAX_SHORT = 'sales tax';
