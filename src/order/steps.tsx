import { Icon } from '../ui/Icon';
import { useEffect, useState, type ChangeEvent } from 'react';
import { saveOrderRemote } from './db';
import { KARATS, METHODS, OCCASIONS, STONES, type Mode } from './data';
import { allCadOk, allOptions, cadRules, custErrors, custOk, depositDue, dimsOk, parseAmount, percentOf, price, readyDate, sizeErrors, type CustErrors, type CustKey, type Market, type Option } from './pricing';
import { taxLabel } from './config';
import { useMarket } from './market';
import { fmtDate, isoOf, money, parseISO } from './format';
import { CadViews } from './CadViews';
import { newOrderNo } from './state';
import { focusFirstInvalid, Kv, MetalChips, NumField, Proportions, StoneChips, TAX_SHORT, type StepProps } from './shared';

function priceOf(mk: Market, s: StepProps['s']) {
  return price(mk, s.dims, s.metal, s.stone, s.mode, s.exact);
}

/* ============================ STEP 1: CUSTOMER ============================ */
const REQUIRED_LABEL: Record<'name' | 'phone' | 'ornament', string> = {
  name: 'Full name',
  phone: 'Phone',
  ornament: 'Ornament name',
};

export function CustomerStep({ s, dispatch }: StepProps) {
  const { mk } = useMarket();
  const [tried, setTried] = useState(false);
  const c = s.cust;
  const errs: CustErrors = custErrors(c);
  const ready = readyDate(s.metal, s.stone, s.mode);
  const set = (key: keyof typeof c) => (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    dispatch({ type: 'cust', key, value: e.target.value });

  // Required fields show their message after the first Continue. An email shows as soon as it is wrong.
  const shown = (k: CustKey) => (k === 'email' ? errs.email : tried ? errs[k] : undefined);
  const missingRequired = (['name', 'phone', 'ornament'] as const).filter(k => errs[k]);
  const neededDate = c.needed ? parseISO(c.needed) : null;
  const neededEarly = Boolean(neededDate && neededDate < ready);

  const next = () => {
    setTried(true);
    if (Object.keys(errs).length > 0) {
      focusFirstInvalid();
      return;
    }
    dispatch({ type: 'go', step: 1 });
  };

  const bannerText = missingRequired.length
    ? `Fill in the required fields marked *: ${missingRequired.map(k => REQUIRED_LABEL[k]).join(', ')}.`
    : 'Check the email address.';

  return (
    <>
      {s.restored && (
        <div className="banner ok"><span className="ic"><Icon name="check" size={14} /></span><span>Draft restored. Your earlier entries are still here.</span></div>
      )}
      {tried && Object.keys(errs).length > 0 && (
        <div className="banner warn" role="alert"><span className="ic"><Icon name="alert" size={14} /></span><span>{bannerText}</span></div>
      )}
      <div className="grid2">
        <section className="card">
          <div className="sec">Customer <span className="hint"><span className="req">*</span> Required</span></div>
          <div className="fields">
            <label className="field">
              <span>Full name<span className="req" aria-hidden="true">*</span></span>
              <input id="f-name" aria-required="true" aria-invalid={shown('name') ? 'true' : undefined} value={c.name} placeholder="e.g. Meera Sharma" onChange={set('name')} />
              {shown('name') && <small className="field-error">{shown('name')}</small>}
            </label>
            <label className="field">
              <span>Phone<span className="req" aria-hidden="true">*</span></span>
              <input id="f-phone" aria-required="true" inputMode="tel" aria-invalid={shown('phone') ? 'true' : undefined} value={c.phone} placeholder="(555) 000-0000" onChange={set('phone')} />
              {shown('phone') && <small className="field-error">{shown('phone')}</small>}
            </label>
            <label className="field full">
              <span>Email<span className="opt">optional</span></span>
              <input type="email" aria-invalid={shown('email') ? 'true' : undefined} value={c.email} placeholder="name@example.com" onChange={set('email')} />
              {shown('email') && <small className="field-error">{shown('email')}</small>}
            </label>
          </div>
        </section>
        <section className="card">
          <div className="sec">Ornament <span className="hint"><span className="req">*</span> Required</span></div>
          <div className="fields">
            <label className="field full">
              <span>Ornament name<span className="req" aria-hidden="true">*</span></span>
              <input id="f-ornament" aria-required="true" aria-invalid={shown('ornament') ? 'true' : undefined} value={c.ornament} placeholder="e.g. Lotus jhumka" onChange={set('ornament')} />
              {shown('ornament') && <small className="field-error">{shown('ornament')}</small>}
            </label>
            <div className="field full">
              <span>Occasion<span className="opt">optional</span></span>
              <div className="chips">
                {OCCASIONS.map(o => (
                  <button key={o} className={`chip ${c.occasion === o ? 'on' : ''}`} onClick={() => dispatch({ type: 'occasion', value: o })}>{o}</button>
                ))}
              </div>
            </div>
            <label className="field">
              <span>Needed by<span className="opt">optional</span></span>
              <input type="date" min={isoOf(ready)} value={c.needed} aria-invalid={neededEarly ? 'true' : undefined} onChange={set('needed')} />
              {neededEarly
                ? <small className="field-error">Too early. Earliest ready date is {fmtDate(ready)}. Choose a later date.</small>
                : <small>Earliest ready date: {fmtDate(ready)}</small>}
            </label>
            <label className="field">
              <span>Notes<span className="opt">optional</span></span>
              <textarea placeholder="Anything the workshop should know" value={c.notes} onChange={set('notes')} />
            </label>
          </div>
        </section>
      </div>
      <section className="card">
        <div className="sec">How will the design be given? <span className="hint">Choose one</span></div>
        <div className="methods">
          {(Object.keys(METHODS) as Mode[]).map(k => (
            <button key={k} className={`method ${s.mode === k ? 'on' : ''}`} onClick={() => dispatch({ type: 'mode', mode: k })}>
              <span className="ic"><Icon name={METHODS[k].icon} size={20} /></span>
              <span><b>{METHODS[k].title}</b><span className="t">{METHODS[k].text}</span></span>
            </button>
          ))}
        </div>
      </section>
      <div className="actions">
        <span className={custOk(c) ? 'faint' : 'field-error'}>
          {custOk(c) ? 'All required fields are complete.' : 'Complete the fields marked * to continue.'}
        </span>
        <div className="right">
          <button className="btn primary lg" onClick={next}>
            Continue to design
          </button>
        </div>
      </div>
    </>
  );
}

/* ============================ STEP 2: DESIGN ============================ */
export function DesignStep({ s, dispatch }: StepProps) {
  const { mk } = useMarket();
  const [sizeTried, setSizeTried] = useState(false);
  const se = sizeErrors(s.dims);
  const back = <button className="btn ghost" onClick={() => dispatch({ type: 'go', step: 0 })}><Icon name="arrowLeft" size={16} /> Back</button>;

  if (s.mode === 'picture') {
    return (
      <>
        <div className="grid2">
          {s.photo
            ? <div className="photo"><b>Photo of the ornament</b><span style={{ fontSize: 13 }}>Captured 12:01 PM ET</span></div>
            : (
              <div className="viewfinder">
                <b>Ready to capture</b>
                <span>Place the ornament flat on a plain background, with a ruler or coin in frame.</span>
              </div>
            )}
          <section className="card">
            <div className="sec">{s.photo ? 'Check the photo' : 'Before you take the photo'}</div>
            <ul className="checks">
              <li>Whole ornament in frame</li>
              <li>Ruler or coin visible for scale</li>
              <li>Sharp and well lit</li>
            </ul>
            <p className="muted">A photo can only estimate size, so the price shows as a range until the CAD model is made.</p>
            <div className="grow" />
            {s.photo
              ? (
                <div className="actions">
                  <button className="btn ghost" onClick={() => dispatch({ type: 'photo', on: false })}>Retake</button>
                  <button className="btn primary lg" onClick={() => dispatch({ type: 'continueToEstimate' })}>Use this photo</button>
                </div>
              )
              : <button className="btn primary lg" onClick={() => dispatch({ type: 'photo', on: true })}>Take photo</button>}
          </section>
        </div>
        <div className="actions">{back}<span className="faint">Step 2 of 5</span></div>
      </>
    );
  }

  const p = priceOf(mk, s);
  return (
    <>
      <div className="grid2">
        <section className="card">
          <div className="sec">Size <span className="hint">millimetres</span></div>
          <div className="size">
            <NumField id="size-w" label="Width" value={s.dims.w} error={sizeTried ? se.w : undefined} onChange={v => dispatch({ type: 'dim', key: 'w', value: v })} />
            <NumField id="size-h" label="Height" value={s.dims.h} error={sizeTried ? se.h : undefined} onChange={v => dispatch({ type: 'dim', key: 'h', value: v })} />
            <NumField id="size-d" label="Depth" value={s.dims.d} error={sizeTried ? se.d : undefined} onChange={v => dispatch({ type: 'dim', key: 'd', value: v })} />
          </div>
          <div className="sec" style={{ marginTop: 6 }}>Metal</div>
          <MetalChips s={s} dispatch={dispatch} />
          <div className="sec" style={{ marginTop: 6 }}>Stones <span className="hint">0.20 ct total</span></div>
          <StoneChips s={s} dispatch={dispatch} />
        </section>
        <section className="card">
          <div className="sec">Preview price</div>
          <div className="kv total">
            <span>Estimated price</span>
            <b>{money(p.total)}<small>incl. {TAX_SHORT}</small></b>
          </div>
          <p className="muted">Updates as you change the size, metal or stones.</p>
          <div className="grow" />
          {sizeTried && !dimsOk(s.dims) && (
            <div className="banner warn" role="alert"><span className="ic"><Icon name="alert" size={14} /></span><span>Enter the width, height and depth in millimetres to continue.</span></div>
          )}
          <button
            className="btn primary lg"
            onClick={() => {
              setSizeTried(true);
              if (!dimsOk(s.dims)) { focusFirstInvalid(); return; }
              dispatch({ type: 'continueToEstimate' });
            }}
          >
            Continue to estimate
          </button>
        </section>
      </div>
      <div className="actions">{back}<span className="faint">Step 2 of 5</span></div>
    </>
  );
}

/* ============================ STEP 3: ESTIMATE ============================ */
function FitPill({ o, b }: { o: Option; b: number | null }) {
  if (b === null) return null;
  if (o.high <= b) return <span className="pill ok">Within budget</span>;
  if (o.low <= b) return <span className="pill warn">May exceed budget</span>;
  return <span className="pill bad">Over by {money(o.low - b)}</span>;
}

export function EstimateStep({ s, dispatch, onShowRates }: StepProps & { onShowRates: () => void }) {
  const { mk } = useMarket();
  const [budgetErr, setBudgetErr] = useState<string | null>(null);
  const cur = priceOf(mk, s);
  const isOrig = s.orig !== null && s.orig.metal === s.metal && s.orig.stone === s.stone;
  const all = allOptions(mk, s.dims, s.mode, s.exact);
  const b = s.budget;
  const mayFit = b === null ? [] : all.filter(o => o.low <= b);
  const sure = b === null ? [] : all.filter(o => o.high <= b);
  const list = (s.fitOnly && b !== null ? mayFit : all)
    .slice()
    .sort((x, y) => (b === null ? x.total - y.total : Math.abs(b - x.total) - Math.abs(b - y.total)));
  const curOver = b !== null && cur.low > b;
  const curMay = b !== null && !curOver && cur.high > b;

  const budgetSummary = b === null
    ? 'Enter the budget to see which combinations fit.'
    : mayFit.length
      ? <><b>{sure.length} of {all.length}</b> combinations are within {money(b)}. <b>{mayFit.length - sure.length}</b> may exceed it once the CAD model is made.</>
      : <>No combination fits {money(b)}. The lowest is <b>{money(all[0].low)}</b>. Try a higher budget or a smaller size.</>;

  const bottomInfo = b === null
    ? <>Selected: <b>{KARATS[s.metal].label}, {STONES[s.stone].name}</b> · {money(cur.total)}</>
    : curOver
      ? <>Selected: <b>{money(cur.total)}</b> is over the budget. Pick a combination that fits.</>
      : <>Selected: <b>{KARATS[s.metal].label}, {STONES[s.stone].label}</b> · {money(cur.total)}{curMay
        ? <span style={{ color: 'var(--warn)' }}> · may exceed budget after CAD</span>
        : ' · within budget'}</>;

  const volNote = s.exact
    ? <span className="pill ok">Exact · from CAD</span>
    : <span className="pill warn">Estimate · final price after CAD</span>;

  const top = s.mode === 'picture'
    ? <div className="photo" style={{ minHeight: 220 }}><b>Photo of the ornament</b><span style={{ fontSize: 13 }}>Size estimated from the photo</span></div>
    : (
      <section className="card">
        <div className="sec">Size</div>
        <div className="big-num">{s.dims.w} × {s.dims.h} × {s.dims.d} mm</div>
        <p className="muted">Width × height × depth</p>
      </section>
    );

  return (
    <>
      <div className="grid2 l">
        <div className="col">
          {top}
          <section className="card">
            <div className="sec">Estimate <span className="hint">{s.cust.ornament.trim() || 'This design'}</span></div>
            <div>{volNote}</div>
            <Kv label={`${KARATS[s.metal].label}, ${cur.grams.toFixed(2)} g`} value={money(cur.metal)} />
            <Kv label={`${STONES[s.stone].name}, 0.20 ct`} value={money(cur.stone)} />
            <Kv label="Making and setting" value={money(cur.making)} />
            <Kv label="Subtotal" value={money(cur.subtotal)} cls="sub2" />
            <Kv label={taxLabel(mk.cfg)} value={money(cur.tax)} cls="sub2" />
            <div className="kv total">
              <span>Estimated price</span>
              <b>{money(cur.total)}</b>
            </div>
            <div className="actions">
              <span className="faint">{mk.rates.source === 'live' ? 'Live spot rates' : 'Owner rates'}, {mk.rates.time}</span>
              <button className="link" onClick={onShowRates}>Show live prices</button>
            </div>
            {!isOrig && <button className="link" style={{ alignSelf: 'flex-start' }} onClick={() => dispatch({ type: 'resetOriginal' })}>Reset to original design</button>}
          </section>
          <section className="card">
            <div className="sec">Edit design</div>
            <div className="size">
              <NumField id="est-w" label="Width mm" value={s.dims.w} error={sizeErrors(s.dims).w} onChange={v => dispatch({ type: 'dim', key: 'w', value: v })} />
              <NumField id="est-h" label="Height mm" value={s.dims.h} error={sizeErrors(s.dims).h} onChange={v => dispatch({ type: 'dim', key: 'h', value: v })} />
              <NumField id="est-d" label="Depth mm" value={s.dims.d} error={sizeErrors(s.dims).d} onChange={v => dispatch({ type: 'dim', key: 'd', value: v })} />
            </div>
            <div className="sec" style={{ marginTop: 6 }}>Metal</div>
            <MetalChips s={s} dispatch={dispatch} />
            <div className="sec" style={{ marginTop: 6 }}>Stones</div>
            <StoneChips s={s} dispatch={dispatch} />
          </section>
        </div>

        <div className="col" style={{ minHeight: 0 }}>
          {!s.showBudget && (
            <section className="card">
              <div className="sec">Customer budget <span className="hint">optional</span></div>
              <p className="muted">If the customer has a budget, enter it to see every metal and stone combination that fits, with its cost and proportions.</p>
              <div><button className="btn" onClick={() => dispatch({ type: 'showBudget' })}>Enter customer budget</button></div>
            </section>
          )}
          {s.showBudget && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, flex: 1, minHeight: 0 }}>
              <section className="card">
                <div className="sec">Customer budget <button className="link" onClick={() => dispatch({ type: 'hideBudget' })}>Remove</button></div>
                <div className="budget-top">
                  <div className="moneyin">
                    <span>$</span>
                    <input
                      type="number" inputMode="numeric" min="1" step="10" placeholder="Enter budget"
                      value={b ?? ''}
                      aria-invalid={budgetErr ? 'true' : undefined}
                      onChange={e => {
                        const n = parseFloat(e.target.value);
                        const ok = Number.isFinite(n) && n > 0;
                        setBudgetErr(e.target.value.trim() !== '' && !ok ? 'Enter a budget above $0.' : null);
                        dispatch({ type: 'budget', value: ok ? n : null });
                      }}
                    />
                  </div>
                  {budgetErr && <small className="field-error" style={{ width: '100%' }}>{budgetErr}</small>}
                  <div className="chips">
                    {[500, 750, 1000].map(v => (
                      <button key={v} className={`chip ${b === v ? 'on' : ''}`} onClick={() => { setBudgetErr(null); dispatch({ type: 'budget', value: v }); }}>${v}</button>
                    ))}
                  </div>
                </div>
                <div className="bsum">{budgetSummary}</div>
                <div className="seg" style={{ alignSelf: 'flex-start' }}>
                  <button className={`chip ${s.fitOnly ? 'on' : ''}`} onClick={() => dispatch({ type: 'fit', fitOnly: true })}>Fits budget</button>
                  <button className={`chip ${s.fitOnly ? '' : 'on'}`} onClick={() => dispatch({ type: 'fit', fitOnly: false })}>All combinations</button>
                </div>
              </section>
              <div className="optlist">
                {b !== null && s.fitOnly && mayFit.length === 0
                  ? <div className="note bad">Nothing fits this budget at the current size. Raise the budget, or reduce the size on the left.</div>
                  : list.map(o => {
                    const over = b !== null && o.low > b;
                    const sel = s.metal === o.metalKey && s.stone === o.stoneKey;
                    return (
                      <div
                        key={`${o.metalKey}-${o.stoneKey}`}
                        className={`opt-card ${sel ? 'sel' : ''} ${over ? 'over' : ''}`}
                        onClick={() => { if (!over) dispatch({ type: 'select', metal: o.metalKey, stone: o.stoneKey }); }}
                      >
                        <div className="oh">
                          <div>
                            <b>{KARATS[o.metalKey].label} · {STONES[o.stoneKey].label}</b>
                            <div className="meta">Metal {o.grams.toFixed(2)} g · 0.20 ct stones</div>
                          </div>
                          <div className="op"><b>{money(o.total)}</b><FitPill o={o} b={b} /></div>
                        </div>
                        <Proportions share={{ metal: o.shareMetal, stone: o.shareStone, making: o.shareMaking }} />
                        <div className="oc">
                          <span>Metal {money(o.metal)} + stones {money(o.stone)} + making {money(o.making)}, before tax</span>
                          {sel && <span className="picked"><Icon name="check" size={13} /> Selected</span>}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}
        </div>
      </div>
      <div className="bottombar">
        <div className="info">{bottomInfo}</div>
        <div className="right">
          <button className="btn ghost" onClick={() => dispatch({ type: 'go', step: 1 })}><Icon name="arrowLeft" size={16} /> Back</button>
          <button className="btn primary lg" disabled={curOver} onClick={() => dispatch({ type: 'go', step: 3 })}>
            Confirm and make CAD
          </button>
        </div>
      </div>
    </>
  );
}

/* ============================ STEP 4: CAD ============================ */
export function CadStep({ s, dispatch }: StepProps) {
  const { mk } = useMarket();
  const p = priceOf(mk, s);
  const rules = cadRules(s.dims);
  const allOk = allCadOk(s.dims);
  const banner = s.exact
    ? <div className="banner ok"><span className="ic"><Icon name="check" size={14} /></span><span>CAD model ready. Exact volume and price are locked for this size.</span></div>
    : allOk
      ? <div className="banner warn"><span className="ic"><Icon name="alert" size={14} /></span><span>Generate the CAD model to lock the exact volume and price. Until then the price is an estimate.</span></div>
      : <div className="banner warn"><span className="ic"><Icon name="alert" size={14} /></span><span>A rule check failed. Change the size on the estimate page before generating the CAD model.</span></div>;

  return (
    <>
      {banner}
      <div className="grid2" style={{ gridTemplateColumns: '1.5fr 1fr' }}>
        <CadViews dims={s.dims} />
        <section className="card">
          <div className="sec">Size <span className="hint">fixed by design</span></div>
          <div className="dims3">
            <div><small>Width</small><b>{s.dims.w} mm</b></div>
            <div><small>Height</small><b>{s.dims.h} mm</b></div>
            <div><small>Depth</small><b>{s.dims.d} mm</b></div>
          </div>
          <Kv label="Metal" value={`${KARATS[s.metal].label}, ${p.grams.toFixed(2)} g`} />
          <Kv label="Stones" value={`${STONES[s.stone].name}, 0.20 ct`} />
          <div className="kv total"><span>Price incl. tax</span><b>{money(p.total)}</b></div>
          <div className="sec" style={{ marginTop: 14 }}>Rule checks</div>
          <div className="rule-list">
            {rules.map(r => (
              <div className={`rule ${r.ok ? '' : 'fail'}`} key={r.label}>
                <span className="rule-text"><Icon name={r.ok ? 'check' : 'close'} size={15} /> {r.label}</span>
                <b>{r.detail}</b>
              </div>
            ))}
          </div>
          <p className="muted">The model uses the same width, height and depth as the price. Exact volume comes from this model. Print tolerance is ±5% (minimum ±0.35 mm).</p>
          <div className="grow" />
          <div className="actions">
            <button className="btn ghost" onClick={() => dispatch({ type: 'go', step: 2 })}><Icon name="arrowLeft" size={16} /> Edit estimate</button>
            {s.exact
              ? <button className="btn primary lg" onClick={() => dispatch({ type: 'go', step: 4 })}>Customer approves</button>
              : (
                <div className="actions-stack">
                  {!allOk && (
                    <div className="note bad" role="alert">
                      Generate is off until every rule check passes. Fix: {rules.filter(r => !r.ok).map(r => r.label).join('; ')}.
                    </div>
                  )}
                  <button className="btn primary lg" disabled={!allOk} onClick={() => dispatch({ type: 'generateCad' })}>Generate CAD model</button>
                </div>
              )}
          </div>
        </section>
      </div>
    </>
  );
}

/* ============================ STEP 5: CONFIRM ============================ */
interface Todo {
  key: string;
  label: string;
  detail: string;
  done: boolean;
  fixStep?: number; // step to go back to, when the fix is made on another screen
}

export function ConfirmStep({ s, dispatch }: StepProps) {
  const { mk } = useMarket();
  const o = priceOf(mk, s);
  const c = s.cust;
  const ready = readyDate(s.metal, s.stone, s.mode);
  const needed = c.needed ? parseISO(c.needed) : null;
  const dateOk = !needed || needed >= ready;
  // The deposit that applies, in dollars. A deposit is never more than the total or less than zero.
  const dep = depositDue(o.total, s.depositAmount, mk.cfg.defaultDeposit);
  const depositAmt = dep;
  const src = s.mode === 'picture' ? 'Picture, size estimated from the photo' : 'Size entered from the design';
  const locked = s.sent;
  const balance = o.total - dep;
  const depPct = o.total > 0 ? Math.round((dep / o.total) * 1000) / 10 : 0;
  const presets = mk.cfg.deposits;
  const overTotal = s.depositAmount !== null && s.depositAmount > o.total + 0.005;

  // The box shows dollars. It keeps what the user typed while they type; invalid text is not saved.
  const [depositText, setDepositText] = useState(() => dep.toFixed(2));
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  // The order is only marked sent once the shared list has saved it. On failure nothing changes.
  const send = async () => {
    setSending(true);
    setSendError(null);
    try {
      await saveOrderRemote({ ...s, sent: true });
      dispatch({ type: 'send' });
    } catch (e) {
      const locked = e instanceof Error && e.message === 'Locked';
      setSendError(locked
        ? 'Your counter is locked. Enter the PIN, then send again. The order was not sent.'
        : 'The order could not be sent. Check the connection and try again. The order was not sent.');
    } finally {
      setSending(false);
    }
  };
  const typedAmt = parseAmount(depositText);
  const depError = typedAmt === null
    ? (depositText.trim() === '' ? 'Enter the deposit amount in dollars.' : 'Enter an amount above $0.')
    : typedAmt > o.total
      ? `The deposit cannot be more than the order total, ${money(o.total)}.`
      : null;

  // First time on this screen, record the default deposit so the amount on screen is the amount saved.
  useEffect(() => {
    if (!locked && s.depositAmount === null) {
      dispatch({ type: 'deposit', value: dep });
      setDepositText(dep.toFixed(2));
    }
    // Runs once when the screen opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Items the app can check itself: each open one has a Fix link to the screen that completes it.
  const automatic: Todo[] = [
    {
      key: 'details', label: 'Customer details are complete',
      detail: custOk(c) ? `${c.name} · ${c.phone}` : 'Name, phone and ornament name are required.',
      done: custOk(c), fixStep: 0,
    },
    {
      key: 'cad', label: 'CAD model is generated',
      detail: s.exact ? 'Volume and price are now final.' : 'Until then the price is only an estimate.',
      done: s.exact, fixStep: 3,
    },
    {
      key: 'deposit-limit', label: 'Deposit is within the order total',
      detail: overTotal
        ? `The deposit is more than the total of ${money(o.total)}. Enter a lower amount below.`
        : `${money(dep)} of ${money(o.total)} total (${depPct}%).`,
      done: !overTotal,
    },
    {
      key: 'date', label: 'Needed-by date is achievable',
      detail: !needed
        ? 'No needed-by date set.'
        : dateOk
          ? `Needed by ${fmtDate(needed)}.`
          : `Needed by ${fmtDate(needed)} is earlier than the earliest ready date, ${fmtDate(ready)}.`,
      done: dateOk, fixStep: 0,
    },
  ];

  // Items the owner confirms with the customer.
  const confirmations: { key: keyof typeof s.checks; label: string }[] = [
    { key: 'details', label: 'The customer has checked their name, phone and dates' },
    { key: 'design', label: 'The customer has approved the size, metal and stones' },
    { key: 'price', label: 'The customer has agreed to the price' },
    { key: 'deposit', label: `The deposit of ${money(dep)} has been collected` },
  ];

  const openCount = automatic.filter(t => !t.done).length + confirmations.filter(t => !s.checks[t.key]).length;

  const todoRow = (t: Todo) => (
    <div key={t.key} className={`todo ${t.done ? 'done' : 'open'}`}>
      <span className="todo-ic" aria-hidden="true"><Icon name={t.done ? 'check' : 'alert'} size={14} /></span>
      <div className="todo-body">
        <b>{t.label}</b>
        <small>{t.detail}</small>
      </div>
      {!t.done && !locked && t.fixStep !== undefined && (
        <button className="link" onClick={() => dispatch({ type: 'go', step: t.fixStep! })}>Fix</button>
      )}
    </div>
  );

  const confirmRow = (key: keyof typeof s.checks, text: string) => (
    <label key={key} className={`todo confirm ${s.checks[key] ? 'done' : 'open'}`}>
      <input
        type="checkbox"
        checked={s.checks[key]}
        disabled={locked}
        onChange={e => dispatch({ type: 'check', key, on: e.target.checked })}
      />
      <div className="todo-body"><b>{text}</b></div>
    </label>
  );

  return (
    <>
      {locked && (
        <div className="banner ok" role="status">
          <span className="ic"><Icon name="check" size={14} /></span>
          <span>Order {s.orderNo} was sent to the workshop for {c.ornament}. Ready by {fmtDate(ready)}.</span>
        </div>
      )}

      <section className="card summary">
        <div className="summary-head">
          <div>
            <div className="sec">Order {s.orderNo}</div>
            <h2 className="summary-title">{c.ornament}</h2>
            <div className="muted">{c.name} · {c.phone}{c.occasion ? ` · ${c.occasion}` : ''}</div>
          </div>
          <div className={`pill ${s.exact ? 'ok' : 'warn'}`}>
            {s.exact ? 'Final price (CAD made)' : 'Estimate (CAD not made yet)'}
          </div>
        </div>
        <div className="summary-grid">
          <div><small>Total</small><b>{money(o.total)}</b></div>
          <div><small>Deposit due now</small><b>{money(depositAmt)}</b></div>
          <div><small>Balance due at pickup</small><b>{money(balance)}</b></div>
          <div><small>Ready by</small><b>{fmtDate(ready)}</b></div>
        </div>
      </section>

      <div className="grid2">
        <div className="col">
          <section className="card">
            <div className="sec">Before you send</div>
            <p className="muted">Each item must be done. Use Fix to go to the screen that completes it.</p>
            <div className="todo-list">
              {automatic.map(todoRow)}
            </div>
            <div className="sec" style={{ marginTop: 6 }}>Confirm with the customer</div>
            <div className="todo-list">
              {confirmations.map(t => confirmRow(t.key, t.label))}
            </div>
          </section>

          <section className="card">
            <div className="sec">Order details</div>
            <Kv label="Customer" value={c.name} />
            <Kv label="Phone" value={c.phone} />
            {c.email && <Kv label="Email" value={c.email} />}
            {c.occasion && <Kv label="Occasion" value={c.occasion} />}
            <Kv label="Needed by" value={needed ? fmtDate(needed) : 'Not set'} />
            <div className="divider" />
            <Kv label="Ornament" value={c.ornament} />
            <Kv label="How the design was given" value={src} />
            <Kv label="Size (width × height × depth)" value={`${s.dims.w} × ${s.dims.h} × ${s.dims.d} mm`} />
            <Kv label="Metal" value={`${KARATS[s.metal].label}, ${o.grams.toFixed(2)} g`} />
            <Kv label="Stones" value={`${STONES[s.stone].name}, 0.20 ct`} />
            {c.notes && <div className="note neutral">Notes for the workshop: {c.notes}</div>}
          </section>
        </div>

        <div className="col">
          <section className="card">
            <div className="sec">Price breakdown</div>
            <Kv label="Metal" value={money(o.metal)} />
            <Kv label="Stones" value={money(o.stone)} />
            <Kv label="Making and setting" value={money(o.making)} />
            <Kv label="Subtotal" value={money(o.subtotal)} />
            <Kv label={taxLabel(mk.cfg)} value={money(o.tax)} />
            <div className="kv total"><span>Total</span><b>{money(o.total)}</b></div>
            <div className="divider" />
            <div className="sec">Deposit <span className="hint">paid before the workshop starts</span></div>
            <div className="chips" role="group" aria-label="Deposit presets">
              {presets.map(p => {
                const amt = percentOf(o.total, p);
                const on = s.depositAmount !== null && Math.abs(dep - amt) < 0.005;
                return (
                  <button
                    key={p}
                    className={`chip ${on ? 'on' : ''}`}
                    disabled={locked}
                    onClick={() => { setDepositText(amt.toFixed(2)); dispatch({ type: 'deposit', value: amt }); }}
                  >
                    {p}% · {money(amt)}
                  </button>
                );
              })}
            </div>
            <label className="field deposit-custom">
              <span>Or type the deposit amount</span>
              <div className="affix prefix">
                <input
                  type="text"
                  inputMode="decimal"
                  disabled={locked}
                  placeholder="0.00"
                  aria-invalid={depError ? 'true' : undefined}
                  value={depositText}
                  onChange={e => {
                    const t = e.target.value;
                    setDepositText(t);
                    const v = parseAmount(t);
                    if (v !== null && v <= o.total) dispatch({ type: 'deposit', value: v });
                  }}
                  onBlur={() => setDepositText(dep.toFixed(2))}
                />
                <span className="unit">$</span>
              </div>
              {depError && <small className="field-error">{depError}</small>}
            </label>
            <Kv label={`Deposit due now (${depPct}% of total)`} value={money(dep)} />
            <Kv label="Balance due at pickup" value={money(balance)} />
          </section>

          <section className="card">
            <div className="sec">Send</div>
            {!s.exact && !locked && <div className="note warn">The price is an estimate. Generate the CAD model on the CAD step to make it final.</div>}
            <div className="actions-stack">
              {locked
                ? <button className="btn dark lg" onClick={() => dispatch({ type: 'newOrder', orderNo: newOrderNo() })}>Start a new order</button>
                : (
                  <>
                    {sendError && <div className="note bad" role="alert">{sendError}</div>}
                    <button className="btn primary lg" disabled={openCount > 0 || sending} onClick={send}>
                      {sending ? 'Sending…' : openCount > 0 ? `Finish ${openCount} item${openCount === 1 ? '' : 's'} to send` : 'Send to workshop'}
                    </button>
                  </>
                )}
              <button className="btn lg" onClick={() => window.print()}>Print workshop ticket</button>
              {!locked && (
                <button className="btn ghost" onClick={() => dispatch({ type: 'go', step: 3 })}>
                  <Icon name="arrowLeft" size={16} /> Back to CAD
                </button>
              )}
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
