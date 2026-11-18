import { KARATS, STONES } from './data';
import { readyDate, stoneCost, buildQuote } from './quote';
import { useMarket } from './market';
import { fmtDate, money } from './format';
import type { OrderState } from './types';

// Workshop job ticket. Hidden on screen; printed through the browser's print dialog.
// It carries no retail prices: the bench needs metal, stones and dates.
export function WorkshopTicket({ s }: { s: OrderState }) {
  const { mk } = useMarket();
  const q = buildQuote(mk, s);
  const ready = readyDate(s.metal, s.stones, s.mode);
  const needed = s.cust.needed ? new Date(s.cust.needed + 'T00:00') : null;
  return (
    <div className="print-ticket">
      <h2>Workshop ticket · {s.orderNo}</h2>
      <table>
        <tbody>
          <tr><th>Customer</th><td>{s.cust.name} · {s.cust.phone}</td></tr>
          <tr><th>Ornament</th><td>{s.cust.ornament}{s.cust.occasion ? ` · ${s.cust.occasion}` : ''}</td></tr>
          <tr><th>Size (W × H × D)</th><td>{s.dims.w} × {s.dims.h} × {s.dims.d} mm {s.exact ? '(CAD exact)' : '(estimate)'}</td></tr>
          <tr><th>Metal</th><td>{KARATS[s.metal].label}, {q.weight.toFixed(2)} g{q.weightIsEstimate ? ' (estimated from size)' : ' (entered)'}</td></tr>
          <tr><th>Stones</th><td>{s.stones.length === 0 ? 'None' : s.stones.map(l => `${l.qty} × ${l.sizeMm} mm ${STONES[l.type].name} (${stoneCost(mk, l).carats.toFixed(3)} ct)`).join('; ')}</td></tr>
          <tr><th>Services</th><td>{s.services.length === 0 ? 'None' : s.services.map(v => v.name || 'Service').join('; ')}</td></tr>
          <tr><th>Ready by</th><td>{fmtDate(ready)}{needed ? ` · needed by ${fmtDate(needed)}` : ''}</td></tr>
          <tr><th>Deposit</th><td>{s.depositAmount !== null ? `${money(s.depositAmount)} collected before work starts` : 'Not recorded'}</td></tr>
          <tr><th>Notes</th><td>{s.cust.notes || '—'}</td></tr>
        </tbody>
      </table>
    </div>
  );
}
