// AUTO PLAN: everything the engine can prepare without a clinician tap.
//   * Investigations — every DO NOW and DO SOON item for the current data.
//   * Diagnosis     — differential ranked by the number of findings supporting each item;
//                     the top (or clinician-chosen) item is the leading / working diagnosis.
//   * Treatment     — first-line medication for each objective trigger (vitals, ECG, scores) and
//                     for the leading diagnosis, with the dose calculated from the case data.
// The plan is recomputed live from the single source of truth. It enters the record only when the
// clinician approves it (one tap: approvePlan). Doses come only from the verified library; a drug
// without a verified dose is ordered "per local protocol"; critical safety flags block auto-ordering.
import { memo } from './memo.js';
import { MED_RULES } from '../content/drugs.js';
import { reason, considerKey } from './reasoning.js';
import { suggestInvestigations, invKey } from './investigations.js';
import { suggestMeds, calcDose, medContext, safetyChecks } from './meds.js';

export const AUTO_TIERS = Object.freeze(['now', 'soon']);
export const skipKey = (kind, id) => `plan.skip.${kind}.${id}`;
export const orderKey = (key) => `order.${key}`;
const RULE = Object.fromEntries(MED_RULES.map((r) => [r.id, r]));

/** Diagnosis ids a medication rule depends on (dx.consider.* facts in its condition). */
function dxIds(cond, out = []) {
  if (!cond) return out;
  for (const c of cond.all ?? []) dxIds(c, out);
  for (const c of cond.any ?? []) dxIds(c, out);
  if (typeof cond.fact === 'string' && cond.fact.startsWith('dx.consider.')) out.push(cond.fact.slice('dx.consider.'.length));
  return out;
}

const fmt = (v) => String(Math.round(v * 1000) / 1000);

/** Plain-text order line, e.g. "Adenosine 6 mg IV rapid push ordered (stable SVT; if vagal manoeuvres fail)." */
export function orderText(m) {
  const what = `${m.use.label.toLowerCase()}${m.cond ? `; ${m.cond}` : ''}`;
  if (m.dose.ok && typeof m.dose.amount === 'number') return `${m.drug.name} ${fmt(m.dose.amount)} ${m.dose.unit} ${m.use.route} ordered (${what}).`;
  if (m.dose.ok) return `${m.drug.name} ${m.dose.text.replace(/\.$/, '')} ordered (${what}).`;
  return `${m.drug.name} ${m.use.route} ordered — dose per local protocol (no verified dose in this build) (${what}).`;
}

export function autoPlan(pack, store) { return memo(store, 'autoPlan', () => autoPlan_(pack, store)); }
function autoPlan_(pack, store) {
  const empty = { investigations: [], differential: [], meds: [], leading: null, pending: 0, ready: false };
  if (!store.activeComplaints().length) return empty;
  const skipped = (kind, id) => store.getFact(skipKey(kind, id)) === 'yes';

  // ---- investigations
  const investigations = suggestInvestigations(pack, store)
    .filter((x) => AUTO_TIERS.includes(x.tier))
    .map((x) => ({ id: x.id, label: x.label, doc: x.doc, kind: x.kind, tier: x.tier, why: x.reasons[0].why,
      done: x.status === 'requested', skipped: skipped('inv', x.id) }));

  // ---- differential and leading diagnosis
  const r = reason(pack, store);
  const ranked = r.mustNotMiss.map((d, i) => ({ d, i }))
    .sort((a, b) => (b.d.reasons.length - a.d.reasons.length) || (a.i - b.i)).map(({ d }) => d);
  const live = ranked.filter((d) => !skipped('dx', d.id));
  const chosen = store.getFact('plan.leading');
  const leadingId = chosen && live.some((d) => d.id === chosen) ? chosen : live[0]?.id ?? null;
  const differential = ranked.map((d) => ({ id: d.id, dx: d.dx, why: d.why, sources: d.sources, support: d.reasons.length,
    leading: d.id === leadingId, done: store.getFact(considerKey(d.id)) !== undefined, skipped: skipped('dx', d.id) }));
  const leading = differential.find((d) => d.leading) ?? null;

  // ---- treatment
  const ctx = medContext(store);
  const objective = new Set(suggestMeds(pack, store, { ignoreDx: true }).map((m) => `${m.drug.id}.${m.use.id}`));
  const planned = {};
  for (const d of differential) if (!d.skipped) planned[considerKey(d.id)] = d.dx.en;
  const firstOfRule = new Set();
  const meds = suggestMeds(pack, store, { extra: planned }).map(({ drug, use, why, rule }) => {
    const key = `${drug.id}.${use.id}`;
    const def = RULE[rule];
    const dx = objective.has(key) ? [] : dxIds(def?.when);
    const forLeading = dx.length === 0 || (leading !== null && dx.includes(leading.id));
    const firstLine = !firstOfRule.has(rule);
    if (firstLine) firstOfRule.add(rule);
    const dose = calcDose(use, ctx);
    const flags = safetyChecks(drug, use, ctx, store);
    const blocked = flags.some((f) => f.level === 'critical');
    const hasDose = dose.ok || !!dose.unverified;
    const dep = dx.length && !forLeading ? differential.find((x) => dx.includes(x.id))?.dx ?? null : null;
    return { key, drug, use, why, cond: def?.cond ?? null, dose, flags, blocked, firstLine, dependsOn: dep,
      auto: firstLine && forLeading && hasDose && !blocked,
      done: store.getFact(orderKey(key)) !== undefined, skipped: skipped('med', key) };
  });

  const open = (x) => !x.done && !x.skipped;
  const pending = investigations.filter(open).length + differential.filter(open).length
    + meds.filter((m) => m.auto && open(m)).length + (leading && store.getFact('assessment.diagnosis') === undefined ? 1 : 0);
  return { investigations, differential, meds, leading, pending, ready: true };
}

/** Record one medication order (also used for a single tap on a non-automatic item). */
export function orderMed(store, m) {
  const text = orderText(m);
  store.setFact(orderKey(m.key), text, { origin: 'ai_confirmed', reason: 'Ordered by clinician' });
  store.addEvent({ type: 'order', text, data: { drug: m.drug.id, use: m.use.id, amount: m.dose.amount, unit: m.dose.unit, status: 'ordered' } });
}

/** ONE TAP: everything pending in the auto plan becomes part of the record. Returns counts. */
export function approvePlan(pack, store) {
  const n = { inv: 0, dx: 0, meds: 0, workingDx: null };
  // Approving can itself trigger rules (e.g. a confirmed consideration adds a test); include those consequences.
  for (let pass = 0; pass < 4 && autoPlan(pack, store).pending > 0; pass += 1) approveOnce(pack, store, n);
  if (n.inv || n.dx || n.meds || n.workingDx) {
    store.addEvent({ type: 'other', text: `Auto plan approved by clinician: ${n.inv} investigation(s), ${n.dx} diagnosis consideration(s), ${n.meds} medication order(s)${n.workingDx ? `; working diagnosis ${n.workingDx}` : ''}.` });
  }
  return n;
}

function approveOnce(pack, store, n) {
  const p = autoPlan(pack, store);
  const open = (x) => !x.done && !x.skipped;
  for (const x of p.investigations.filter(open)) {
    store.setFact(invKey(x.id), 'requested', { origin: 'ai_confirmed', replace: true, reason: 'Auto plan approved' });
    store.addEvent({ type: 'investigation', text: `${x.doc ?? x.label.en} requested.` });
    n.inv += 1;
  }
  for (const d of p.differential.filter(open)) {
    store.setFact(considerKey(d.id), d.dx.en, { origin: 'ai_confirmed', reason: 'Auto plan approved' });
    n.dx += 1;
  }
  if (p.leading && store.getFact('assessment.diagnosis') === undefined) {
    store.setFact('assessment.diagnosis', p.leading.dx.en, { origin: 'ai_confirmed', reason: 'Auto plan approved' });
    store.setFact('plan.leading', p.leading.id, { origin: 'ai_confirmed', replace: true, reason: 'Auto plan approved' });
    n.workingDx = p.leading.dx.en;
  }
  for (const m of p.meds.filter((x) => x.auto && open(x))) { orderMed(store, m); n.meds += 1; }
  for (const c of store.activeComplaints()) {
    const code = pack.icd10?.complaints?.[c]?.[0];
    if (code && store.getFact(`icd.${code}`) === undefined) store.setFact(`icd.${code}`, 'confirmed', { origin: 'ai_confirmed' });
  }
}
