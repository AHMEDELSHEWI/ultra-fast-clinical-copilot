// Derived clinical alerts. Computed ONLY from current active facts, so a corrected or removed
// reading can never keep an alert alive. Adult thresholds are applied to adults only.

import { calcMap, calcShockIndex, calcGcs } from './vitals.js';

export const ADULT_AGE = 18;

/** values: plain map from CaseStore.snapshotValues(). Returns [{ id, level, text, basis }]. */
export function deriveAlerts(values) {
  const out = [];
  const age = values['patient.age'];

  const sbp = values['vitals.sbp'];
  const dbp = values['vitals.dbp'];
  const hr = values['vitals.hr'];
  const hasVitals = [sbp, dbp, hr].some((v) => typeof v === 'number');

  if (hasVitals && (typeof age !== 'number')) {
    out.push({ id: 'age-missing', level: 'info', text: 'Age is needed before vital signs can be interpreted.', basis: 'Normal ranges depend on age.' });
    return out.concat(gcsAlerts(values));
  }
  if (hasVitals && age < ADULT_AGE) {
    out.push({ id: 'paediatric', level: 'warn', text: 'Paediatric patient: adult vital-sign thresholds are not applied. Use age-specific ranges.', basis: 'Adult cut-offs are unsafe for children.' });
    return out.concat(gcsAlerts(values));
  }

  const map = calcMap(sbp, dbp);
  if (typeof sbp === 'number' && sbp <= 90) {
    out.push({ id: 'hypotension', level: 'danger', text: `Hypotension: SBP ${sbp} mmHg (90 or below).`, basis: 'Commonly used adult threshold; confirm against local protocol.' });
  }
  if (map !== null && map < 65) {
    out.push({ id: 'low-map', level: 'danger', text: `Low MAP: ${map} mmHg (below 65).`, basis: 'Commonly used adult threshold; confirm against local protocol.' });
  }
  const si = calcShockIndex(hr, sbp);
  if (si !== null) {
    out.push({ id: 'shock-index', level: 'info', text: `Shock index ${si.toFixed(2)} (HR ${hr} / SBP ${sbp}).`, basis: 'Calculated value; interpret in clinical context.' });
  }
  if (typeof hr === 'number' && hr > 100) out.push({ id: 'tachycardia', level: 'warn', text: `Tachycardia: HR ${hr} bpm (above 100).`, basis: 'Standard adult definition.' });
  if (typeof hr === 'number' && hr < 60) out.push({ id: 'bradycardia', level: 'warn', text: `Bradycardia: HR ${hr} bpm (below 60).`, basis: 'Standard adult definition.' });
  return out.concat(gcsAlerts(values));
}

function gcsAlerts(values) {
  const g = calcGcs({ e: values['gcs.e'], v: values['gcs.v'], m: values['gcs.m'] });
  const any = ['gcs.e', 'gcs.v', 'gcs.m'].some((k) => values[k] !== undefined);
  const out = [];
  if (any && !g.complete) out.push({ id: 'gcs-incomplete', level: 'info', text: g.text, basis: 'Total is not calculated from partial data.' });
  if (g.complete && g.total <= 8) out.push({ id: 'gcs-low', level: 'danger', text: `${g.text}: severely reduced consciousness.`, basis: 'GCS 8 or less is commonly used as a threshold for airway concern.' });
  return out;
}
