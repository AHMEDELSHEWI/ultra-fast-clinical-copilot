import test from 'node:test';
import assert from 'node:assert/strict';
import { pack, makeStore } from './helpers.mjs';
import { consultantSummary, referralLetter, dischargeSummary, patientInstructions, icdSuggestions, icdText, mcchisNote, OUTPUTS } from '../src/core/outputs.js';
import { considerKey } from '../src/core/reasoning.js';

function caseStore() {
  const s = makeStore();
  for (const [k, v] of Object.entries({ 'patient.age': 55, 'patient.sex': 'male', 'vitals.sbp': 85, 'vitals.dbp': 50, 'vitals.hr': 110, 'allergy.status': 'none', 'sx.diaphoresis': 'yes' })) s.setFact(k, v);
  s.addComplaint('chest_pain'); s.addComplaint('dyspnea');
  return s;
}
const BAD = /undefined|NaN|\[object|^\s*\{/m;

test('consultant summary: snapshot, key findings, outstanding issues; never invents a diagnosis', () => {
  const s = caseStore();
  const t = consultantSummary(s, pack);
  assert.match(t, /^CONSULTANT SUMMARY/);
  assert.match(t, /55-year-old male presenting with chest pain and shortness of breath\./);
  assert.match(t, /Hypotension/);
  assert.match(t, /Most likely \/ working diagnosis\nNot documented\./);
  assert.match(t, /Outstanding issues/);
  assert.doesNotMatch(t, /Acute coronary syndrome/, 'unconfirmed AI suggestions are not included');
  s.setFact(considerKey('acs'), 'Acute coronary syndrome', { origin: 'ai_confirmed' });
  s.setFact('assessment.diagnosis', 'Possible ACS');
  const t2 = consultantSummary(s, pack);
  assert.match(t2, /Possible ACS \(clinician-entered\)/);
  assert.match(t2, /clinician-confirmed\)\nAcute coronary syndrome/);
  assert.doesNotMatch(t2, BAD);
});

test('referral uses only the clinician question and specialty', () => {
  const s = caseStore();
  assert.match(referralLetter(s, pack), /Specific question for the consultant\nNot documented\./);
  s.setFact('referral.specialty', 'Cardiology'); s.setFact('referral.question', 'Please review for possible NSTEMI.');
  const t = referralLetter(s, pack);
  assert.match(t, /^REFERRAL TO CARDIOLOGY/);
  assert.match(t, /Please review for possible NSTEMI\./);
});

test('discharge and bilingual patient instructions include complaint-specific return precautions', () => {
  const s = caseStore();
  s.setFact('assessment.diagnosis', 'Non-specific chest pain'); s.setFact('discharge.followup', 'GP in 2 days');
  const d = dischargeSummary(s, pack);
  assert.match(d, /Return precautions given/); assert.match(d, /Chest pain that comes back/); assert.match(d, /Discharge medications\nNot documented\./);
  const ar = patientInstructions(s, pack, 'ar');
  assert.match(ar, /تعليمات المريض/); assert.match(ar, /ضيق التنفس/);
});

test('ICD-10: symptom codes from complaints; diagnosis codes only as "requires confirmation"; copy only confirmed', () => {
  const s = caseStore();
  let list = icdSuggestions(s, pack);
  assert.deepEqual(list.map((x) => x.code), ['R07.4', 'R06.0']);
  s.setFact(considerKey('pe'), 'Pulmonary embolism', { origin: 'ai_confirmed' });
  list = icdSuggestions(s, pack);
  const pe = list.find((x) => x.code === 'I26.9');
  assert.equal(pe.confidence, 'Requires confirmation');
  assert.match(icdText(s, pack), /No ICD-10 codes confirmed/);
  s.setFact('icd.R07.4', 'confirmed');
  assert.match(icdText(s, pack), /R07\.4 — Chest pain, unspecified/);
  assert.doesNotMatch(icdText(s, pack), /I26\.9/);
});

test('MCCHIS note has S/O/A/P from documented data only', () => {
  const s = caseStore();
  const t = mcchisNote(s, pack);
  assert.match(t, /^MCCHIS NOTE/); assert.match(t, /\nS:\nCC: Chest pain and shortness of breath/); assert.match(t, /\nO:\nVital signs: BP 85\/50/);
  assert.match(t, /\nP:\nNot documented\./);
});

test('every output is plain text', () => {
  const s = caseStore();
  for (const [k, fn] of Object.entries(OUTPUTS)) assert.doesNotMatch(fn(s, pack), BAD, k);
});
