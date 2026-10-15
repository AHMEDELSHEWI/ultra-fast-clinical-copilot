// Consultant-grade outputs built from the same single source of truth as the clinical note.
// Nothing here invents content: every line is assembled from documented facts, events or clinician input.
import { buildSections, joinList } from './documentation.js';
import { missingInformation } from './questions.js';
import { relevantScores } from './workup.js';
import { reason } from './reasoning.js';
import { deriveAlerts } from './alerts.js';
import { assertPlainText } from './copy.js';

const sec = (store, pack) => Object.fromEntries(buildSections(store, pack).map((s) => [s.id, s.lines]));
const block = (title, lines) => (lines && lines.length ? `${title}\n${lines.join('\n')}` : null);
const nd = 'Not documented.';

function snapshot(store, pack) {
  const age = store.getFact('patient.age');
  const sex = store.getFact('patient.sex');
  const nouns = store.activeComplaints().map((k) => pack.complaints.find((c) => c.key === k)?.noun).filter(Boolean);
  const who = [typeof age === 'number' ? `${age}-year-old` : null, sex ?? 'patient'].filter(Boolean).join(' ');
  return nouns.length ? `${who[0].toUpperCase()}${who.slice(1)} presenting with ${joinList(nouns)}.` : `${who[0].toUpperCase()}${who.slice(1)}.`;
}

const considered = (store) => Object.values(store.state.facts)
  .filter((f) => f.key.startsWith('dx.consider.') && f.status === 'active' && typeof f.value === 'string').map((f) => f.value);

function keyFindings(store, pack) {
  const out = [];
  for (const a of deriveAlerts(store.snapshotValues())) if (a.level === 'danger' || a.level === 'warn') out.push(a.text);
  const s = sec(store, pack);
  for (const l of s.exam ?? []) if (!/^No /.test(l)) out.push(l);
  return out;
}

/** CONSULTANT SUMMARY */
export function consultantSummary(store, pack) {
  const s = sec(store, pack);
  const scores = relevantScores(pack, store).filter((x) => x.result.complete).map((x) => x.result.text);
  const dx = store.getFact('assessment.diagnosis');
  const imp = store.getFact('assessment.impression');
  const outstanding = [
    ...missingInformation(pack, store).filter((m) => m.status === 'MISSING').map((m) => `${m.label} not documented.`),
    ...relevantScores(pack, store).filter((x) => x.result.applicable && !x.result.complete).map((x) => `${x.result.name} incomplete.`),
  ];
  const parts = [
    'CONSULTANT SUMMARY',
    block('Patient', [snapshot(store, pack)]),
    block('History', [...(s.hpi ?? []), ...(s.history ?? [])]),
    block('Key findings', keyFindings(store, pack)),
    block('Vital signs', s.vitals),
    block('Investigations', [...(s.investigations ?? []), ...(s.results ?? [])]),
    block('Scores', scores),
    `Clinical synthesis\n${imp || nd}`,
    `Most likely / working diagnosis\n${dx ? `${dx} (${store.getFactRecord('assessment.diagnosis')?.origin === 'ai_confirmed' ? 'auto-generated, approved by clinician' : 'clinician-entered'})` : nd}`,
    block('Must-not-miss diagnoses under consideration (clinician-confirmed)', considered(store).length ? [joinList(considered(store))] : []),
    block('Resuscitation', s.resuscitation),
    block('Treatment', [...(s.orders ?? []), ...(s.treatment ?? [])]),
    block('Response', s.reassessment),
    block('Disposition', s.disposition),
    block('Outstanding issues', outstanding),
  ].filter(Boolean);
  return assertPlainText(parts.join('\n\n'));
}

/** REFERRAL — specialty and the question come only from the clinician. */
export function referralLetter(store, pack) {
  const s = sec(store, pack);
  const specialty = store.getFact('referral.specialty');
  const question = store.getFact('referral.question');
  const dx = store.getFact('assessment.diagnosis');
  const parts = [
    `REFERRAL${specialty ? ` TO ${String(specialty).toUpperCase()}` : ''}`,
    `Reason for referral\n${dx ? dx : 'Working diagnosis not documented.'}`,
    block('Patient', [snapshot(store, pack)]),
    block('Clinical summary', [...(s.hpi ?? []), ...(s.history ?? [])]),
    block('Important findings', keyFindings(store, pack)),
    block('Vital signs', s.vitals),
    block('Investigations', [...(s.investigations ?? []), ...(s.results ?? [])]),
    block('Treatment', [...(s.orders ?? []), ...(s.treatment ?? [])]),
    block('Response', s.reassessment),
    `Specific question for the consultant\n${question || 'Not documented.'}`,
  ].filter(Boolean);
  return assertPlainText(parts.join('\n\n'));
}

/** Return precautions for the active complaints (DRAFT content). */
export function returnPrecautions(store, pack, lang = 'en') {
  const items = [];
  for (const c of store.activeComplaints()) for (const x of pack.returnPrecautions?.[c]?.[lang] ?? []) if (!items.includes(x)) items.push(x);
  return items;
}

/** DISCHARGE (clinician-facing) */
export function dischargeSummary(store, pack) {
  const s = sec(store, pack);
  const dx = store.getFact('assessment.diagnosis');
  const meds = store.getFact('discharge.meds');
  const fu = store.getFact('discharge.followup');
  const rp = returnPrecautions(store, pack, 'en');
  const parts = [
    'DISCHARGE SUMMARY',
    block('Patient', [snapshot(store, pack)]),
    `Diagnosis\n${dx || nd}`,
    block('Treatment in the emergency department', [...(s.orders ?? []), ...(s.treatment ?? [])]),
    block('Response', s.reassessment),
    `Discharge medications\n${meds || nd}`,
    `Follow-up\n${fu || nd}`,
    block('Return precautions given', rp.length ? [...rp.map((x) => `- ${x}`), `- ${pack.returnPrecautionsGeneral.en}`] : []),
  ].filter(Boolean);
  return assertPlainText(parts.join('\n\n'));
}

/** PATIENT INSTRUCTIONS in plain language (English or Arabic). */
export function patientInstructions(store, pack, lang = 'en') {
  const dx = store.getFact('assessment.diagnosis');
  const fu = store.getFact('discharge.followup');
  const rp = returnPrecautions(store, pack, lang);
  const L = lang === 'ar'
    ? { t: 'تعليمات المريض', dx: 'التشخيص', fu: 'المتابعة', rp: 'عد إلى الطوارئ فوراً إذا حدث أي مما يلي:' }
    : { t: 'PATIENT INSTRUCTIONS', dx: 'Diagnosis', fu: 'Follow-up', rp: 'Come back to the emergency department immediately if you have:' };
  const parts = [L.t, dx ? `${L.dx}: ${dx}` : null, fu ? `${L.fu}: ${fu}` : null,
    rp.length ? `${L.rp}\n${rp.map((x) => `- ${x}`).join('\n')}` : null, pack.returnPrecautionsGeneral[lang]].filter(Boolean);
  return assertPlainText(parts.join('\n\n'));
}

/** ICD-10 suggestions: complaint symptom codes + codes for clinician-confirmed considerations. */
export function icdSuggestions(store, pack) {
  const map = pack.icd10;
  const out = [];
  for (const c of store.activeComplaints()) {
    const m = map.complaints[c];
    if (m) out.push({ code: m[0], label: m[1], basis: 'Documented presenting complaint', confidence: 'High (symptom code)', kind: 'symptom' });
  }
  for (const f of Object.values(store.state.facts)) {
    if (!f.key.startsWith('dx.consider.') || f.status !== 'active') continue;
    const id = f.key.slice('dx.consider.'.length);
    const m = map.diagnoses[id];
    if (m && !out.some((x) => x.code === m[0])) out.push({ code: m[0], label: m[1], basis: `${f.value} — under consideration, not a confirmed diagnosis`, confidence: 'Requires confirmation', kind: 'diagnosis' });
  }
  const res = out.map((x) => ({ ...x, confirmed: store.getFact(`icd.${x.code}`) === 'confirmed' }));
  // Diagnoses the clinician picked from ICD-10-CM are confirmed by that selection.
  for (const f of Object.values(store.state.facts)) {
    if (f.status !== 'active' || !f.key.startsWith('vx.dx.')) continue;
    if (res.some((x) => x.code === f.value.code)) continue;
    res.push({ code: f.value.code, label: f.value.label, basis: 'Clinician-selected diagnosis (ICD-10-CM)', confidence: 'Clinician-selected', kind: 'diagnosis', confirmed: true, picked: true });
  }
  return res;
}

export function icdText(store, pack) {
  const conf = icdSuggestions(store, pack).filter((x) => x.confirmed);
  const lines = conf.length ? conf.map((x) => `${x.code} — ${x.label}`) : ['No ICD-10 codes confirmed by the clinician.'];
  return assertPlainText(`ICD-10 (clinician-confirmed)\n${lines.join('\n')}`);
}

/** MCCHIS — SOAP layout until the institutional template is supplied (configurable). */
export function mcchisNote(store, pack) {
  const s = sec(store, pack);
  const scores = relevantScores(pack, store).filter((x) => x.result.complete).map((x) => x.result.text);
  const conf = icdSuggestions(store, pack).filter((x) => x.confirmed).map((x) => `${x.code} ${x.label}`);
  const S = [...(s.cc ?? []).map((l) => `CC: ${l}`), ...(s.hpi ?? []), ...(s.history ?? [])];
  const O = [...(s.vitals ?? []), ...(s.exam ?? []), ...(s.results ?? [])];
  const A = [...(s.assessment ?? []), ...scores];
  const P = [...(s.investigations ?? []), ...(s.orders ?? []), ...(s.resuscitation ?? []), ...(s.treatment ?? []), ...(s.reassessment ?? []), ...(s.disposition ?? [])];
  const fu = store.getFact('discharge.followup');
  if (fu) P.push(`Follow-up: ${fu}`);
  const parts = ['MCCHIS NOTE', `S:\n${S.length ? S.join('\n') : nd}`, `O:\n${O.length ? O.join('\n') : nd}`, `A:\n${A.length ? A.join('\n') : nd}`, `P:\n${P.length ? P.join('\n') : nd}`];
  if (conf.length) parts.push(`ICD-10: ${conf.join('; ')}`);
  return assertPlainText(parts.join('\n\n'));
}

/** Specialties suggested by the reasoning engine (for the referral picker). */
export function suggestedSpecialties(pack, store) {
  return reason(pack, store).specialties.filter((x) => x !== 'Emergency Medicine');
}

export const OUTPUTS = Object.freeze({
  consultant: consultantSummary, referral: referralLetter, discharge: dischargeSummary,
  patient: (st, p) => patientInstructions(st, p, 'en'), patient_ar: (st, p) => patientInstructions(st, p, 'ar'), icd: icdText, mcchis: mcchisNote,
});
