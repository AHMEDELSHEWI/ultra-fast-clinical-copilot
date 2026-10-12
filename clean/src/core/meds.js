// Medication engine: weight-based arithmetic, population gating, safety checks, administration record.
// Never shows a dose that is not in the verified library; never applies an adult dose to a child.
import { DRUGS, DRUG_BY_ID, MED_RULES } from '../content/drugs.js';
import { evalCondition } from './questions.js';
import { investigationValues } from './investigations.js';
import { crcl } from './calculators.js';

const isNum = (v) => typeof v === 'number' && Number.isFinite(v);
const fmt = (v) => {
  if (!isNum(v)) return '';
  const r = Math.round(v * 100) / 100;
  return Number.isInteger(r) ? String(r) : String(r);
};

/** Patient context relevant to dosing and safety. */
export function medContext(store) {
  const g = (k) => store.getFact(k);
  const age = g('patient.age');
  const weight = g('vitals.weight');
  const sex = g('patient.sex');
  return {
    age, weight, sex,
    child: isNum(age) ? age < 18 : null,
    pregnancy: g('preg.status'),
    allergyStatus: g('allergy.status'),
    allergyText: String(g('allergy.status.detail') ?? '').toLowerCase(),
    qtc: g('ecg.qtc_ms'),
    heartFailure: g('pmh.heart_failure'),
    lung: g('pmh.chronic_lung_disease'),
    betaBlocker: g('meds.beta_blocker'),
    renal: g('pmh.renal_disease'),
    hepatic: g('pmh.liver_disease'),
    crcl: crcl({ age, weightKg: weight, sex, creatinineUmol: g('lab.creatinine') }),
  };
}

/** Does this indication apply to this patient's population? */
export function populationOk(use, ctx) {
  if (use.pop === 'all') return { ok: true };
  if (ctx.child === null) return { ok: false, needs: ['patient.age'], reason: 'Age is needed before any dose is shown.' };
  if (use.pop === 'adult' && ctx.child) return { ok: false, reason: 'Adult dose — not applicable to a child.' };
  if (use.pop === 'paediatric' && !ctx.child) return { ok: false, reason: 'Paediatric dose — not applicable to an adult.' };
  return { ok: true };
}

/**
 * Calculate the dose for one indication.
 * @returns {{ ok, text?, calc?, needs?:string[], reason?, amount?, unit? }}
 */
export function calcDose(use, ctx) {
  const pop = populationOk(use, ctx);
  if (!pop.ok) return { ok: false, needs: pop.needs ?? [], reason: pop.reason };
  const d = use.dose;
  if (!d) return { ok: false, needs: [], reason: 'No dose verified in this build — use the local protocol.', unverified: true };
  const route = use.route ? ` ${use.route}` : '';
  const freq = use.freq ? `, ${use.freq}` : '';
  if (isNum(d.fixed)) {
    return { ok: true, amount: d.fixed, unit: d.unit, text: `${fmt(d.fixed)} ${d.unit}${route}${freq}.` };
  }
  if (d.range) return { ok: true, unit: d.unit, text: `${fmt(d.range[0])}–${fmt(d.range[1])} ${d.unit}${route}${freq}.` };
  // weight-based: require weight
  if (!isNum(ctx.weight)) return { ok: false, needs: ['vitals.weight'], reason: 'Weight is required for this weight-based dose.' };
  if (isNum(d.perKg)) {
    let raw = d.perKg * ctx.weight;
    let note = '';
    if (isNum(d.max) && raw > d.max) { note = ` (capped at maximum ${fmt(d.max)} ${d.unit})`; raw = d.max; }
    if (isNum(d.min) && raw < d.min) { note = ` (raised to minimum ${fmt(d.min)} ${d.unit})`; raw = d.min; }
    const conc = use.conc ? ` Concentration ${use.conc}.` : '';
    const calc = `${fmt(d.perKg)} ${d.unit}/kg × ${fmt(ctx.weight)} kg = ${fmt(d.perKg * ctx.weight)} ${d.unit}${note}`;
    return { ok: true, amount: raw, unit: d.unit, calc, text: `${use.atLeast ? 'At least ' : ''}${fmt(raw)} ${d.unit}${route}${freq}.${conc}` };
  }
  if (d.perKgRange) {
    let lo = d.perKgRange[0] * ctx.weight; let hi = d.perKgRange[1] * ctx.weight;
    let note = '';
    if (isNum(d.max)) { if (hi > d.max) { hi = d.max; note = ` (capped at maximum ${fmt(d.max)} ${d.unit})`; } if (lo > d.max) lo = d.max; }
    const calc = `${fmt(d.perKgRange[0])}–${fmt(d.perKgRange[1])} ${d.unit}/kg × ${fmt(ctx.weight)} kg${note}`;
    return { ok: true, unit: d.unit, calc, text: `${fmt(lo)}–${fmt(hi)} ${d.unit}${route}${freq}.` };
  }
  return { ok: false, needs: [], reason: 'Dose format not recognised.' };
}

/** Administration records for a drug (from the timeline). */
export function administered(store, drugId) {
  return store.timeline().filter((e) => (e.type === 'medication' || e.type === 'resus') && e.data?.drug === drugId);
}

/**
 * Safety checks before a dose (allergy, population, cumulative maximum, drug-disease, pregnancy).
 * Levels: critical | important | caution | info. Only clinically meaningful flags (no alert fatigue).
 */
export function safetyChecks(drug, use, ctx, store) {
  const out = [];
  const add = (level, text) => out.push({ level, text });
  if (ctx.allergyStatus === undefined) add('important', 'Allergy status not documented — ask before giving.');
  if (ctx.allergyStatus === 'yes') {
    const names = [drug.name, ...(drug.synonyms ?? [])].map((x) => x.toLowerCase().split(' (')[0]);
    if (names.some((n) => n && ctx.allergyText.includes(n))) add('critical', `Documented allergy matches ${drug.name}.`);
    else add('caution', `Drug allergy documented (${ctx.allergyText || 'details not recorded'}) — confirm it does not involve ${drug.name}.`);
  }
  if (ctx.pregnancy === 'yes' || ctx.pregnancy === 'possible') add('caution', 'Pregnancy recorded or possible — pregnancy-specific dosing and safety have not been reviewed in this build; check before use.');
  if (drug.id === 'procainamide' && (ctx.heartFailure === 'yes' || (isNum(ctx.qtc) && ctx.qtc > 480))) add('critical', 'Avoid procainamide with prolonged QT or heart failure (2025 AHA algorithm).');
  if (drug.id === 'amiodarone' && isNum(ctx.qtc) && ctx.qtc > 500) add('important', `QTc ${ctx.qtc} ms — amiodarone prolongs QT further.`);
  if (drug.id === 'adenosine' && ctx.lung === 'yes') add('caution', 'Chronic lung disease recorded — adenosine can cause bronchospasm.');
  if (drug.id === 'epinephrine' && use?.id === 'anaphylaxis' && ctx.betaBlocker === 'yes') add('info', 'On a beta-blocker: response to epinephrine may be reduced; glucagon may be reasonable if refractory (2025 AHA).');
  if (use?.cumulativeMax && store) {
    const given = administered(store, drug.id).filter((e) => e.data?.unit === use.cumulativeMax.unit).reduce((s, e) => s + (e.data?.amount ?? 0), 0);
    if (given > 0) {
      const left = use.cumulativeMax.amount - given;
      if (left <= 0) add('critical', `Maximum total ${use.cumulativeMax.amount} ${use.cumulativeMax.unit} already given (${fmt(given)} ${use.cumulativeMax.unit}).`);
      else add('info', `${fmt(given)} ${use.cumulativeMax.unit} given so far; ${fmt(left)} ${use.cumulativeMax.unit} remaining before the maximum total.`);
    }
  }
  if (store) {
    const recent = administered(store, drug.id);
    if (recent.length) add('info', `Already given ${recent.length} time(s) in this case — last at ${new Date(recent.at(-1).at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}.`);
  }
  return out;
}

/** Medications relevant to this case (context rules), each with its indication and reason. */
export function suggestMeds(pack, store) {
  if (store.activeComplaints().length === 0 && !Object.keys(store.snapshotValues()).some((k) => k.startsWith('dx.consider.'))) return [];
  const values = investigationValues(pack, store);
  const ctx = medContext(store);
  const out = [];
  const seen = new Set();
  for (const r of MED_RULES) {
    if (!evalCondition(r.when, values)) continue;
    for (const [drugId, useId] of r.items) {
      const drug = DRUG_BY_ID[drugId];
      const use = drug?.uses.find((u) => u.id === useId);
      if (!use || seen.has(`${drugId}:${useId}`)) continue;
      const pop = populationOk(use, ctx);
      if (!pop.ok && !pop.needs) continue; // wrong population: hide (never show adult dose to a child)
      seen.add(`${drugId}:${useId}`);
      out.push({ drug, use, why: r.why, rule: r.id });
    }
  }
  return out;
}

export const ALL_DRUGS = DRUGS;

/** Plain-text line for the note when a dose is recorded. */
export function administrationText(drug, use, dose) {
  return `${drug.name} ${dose} ${use.route} given (${use.label.toLowerCase()}).`;
}
