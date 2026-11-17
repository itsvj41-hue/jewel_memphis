import type { OrderState } from './types';

// Shared orders are saved through /api/orders. The server only accepts requests from an
// unlocked counter (valid PIN cookie).

export interface OrderRow {
  id: string;
  customer_name: string;
  ornament: string;
  status: 'draft' | 'sent';
  data: OrderState;
  updated_at: string;
}

export async function saveOrderRemote(s: OrderState): Promise<void> {
  const res = await fetch('/api/orders', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    credentials: 'same-origin',
    body: JSON.stringify({
      id: s.orderNo,
      customer_name: s.cust.name.trim(),
      ornament: s.cust.ornament.trim(),
      status: s.sent ? 'sent' : 'draft',
      data: s,
    }),
  });
  if (!res.ok) throw new Error(res.status === 401 ? 'Locked' : `Save failed (${res.status})`);
}

export async function listOrdersRemote(): Promise<OrderRow[]> {
  const res = await fetch('/api/orders', { credentials: 'same-origin', cache: 'no-store' });
  if (!res.ok) throw new Error(res.status === 401 ? 'Locked. Enter the PIN.' : `Could not load orders (${res.status}).`);
  return (await res.json()) as OrderRow[];
}
