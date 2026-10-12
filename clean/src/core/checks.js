// Pre-finalization documentation check (spec section 64): shows exactly what needs attention.
import { missingInformation } from './questions.js';
import { deriveAlerts } from './alerts.js';

/** @returns {{ ready:boolean, issues:{level:'error'|'warn'|'info', text:string}[] }} */
export function documentationCheck(store, pack) {
  const issues = [];
  const add = (level, text) => issues.push({ level, text });
  const missing = missingInformation(pack, store);

  if (store.activeComplaints().length === 0) add('error', 'No presenting complaint documented.');
  if (!store.isAnswered('patient.age')) add('error', 'Age is not documented.');
  if (!store.isAnswered('patient.sex')) add('error', 'Sex is not documented.');

  const values = store.snapshotValues();
  const anyVital = ['vitals.sbp', 'vitals.dbp', 'vitals.hr', 'vitals.rr', 'vitals.spo2', 'vitals.temp'].some((k) => typeof values[k] === 'number');
  if (!anyVital) add('warn', 'No vital signs documented.');
  else if (typeof values['vitals.sbp'] !== typeof values['vitals.dbp']) add('warn', 'Blood pressure is incomplete (systolic and diastolic are both needed).');

  const exam = Object.keys(values).some((k) => k.startsWith('exam.'));
  if (!exam) add('warn', 'No examination findings documented.');
  if (!values['assessment.diagnosis'] && !values['assessment.impression']) add('warn', 'No assessment or working diagnosis documented.');
  if (!values['disposition.decision']) add('warn', 'No disposition documented.');

  for (const m of missing) {
    if (['patient.age', 'patient.sex', 'complaint', 'vitals.bp', 'vitals.hr'].includes(m.key)) continue;
    add('warn', `${m.label}: ${m.status.toLowerCase()}. ${m.why}`);
  }
  for (const a of deriveAlerts(values)) {
    if (a.level === 'danger') add('info', `Active alert: ${a.text} Confirm it is addressed in the plan.`);
  }
  for (const f of Object.values(store.state.facts)) {
    if (f.status === 'active' && f.note) add('info', `Conflicting findings kept (${f.key}): ${f.note}`);
  }
  return { ready: !issues.some((i) => i.level === 'error'), issues };
}
