import test from 'node:test';
import assert from 'node:assert/strict';
import { pack } from './helpers.mjs';
import { parseIntake } from '../src/core/nlp.js';

test('spec example: 55-year-old diabetic hypertensive male with crushing central chest pain for 30 minutes, sweating and nausea', () => {
  const r = parseIntake('55-year-old male diabetic and hypertensive with crushing central chest pain for 30 minutes, sweating and nauseated.', pack);
  assert.equal(r.age, 55); assert.equal(r.sex, 'male');
  assert.deepEqual(r.complaints, ['chest_pain']);
  assert.equal(r.facts['pmh.diabetes'], 'yes'); assert.equal(r.facts['pmh.hypertension'], 'yes');
  assert.equal(r.facts['sx.diaphoresis'], 'yes'); assert.equal(r.facts['sx.nausea'], 'yes');
  assert.equal(r.facts['hx.chest_pain.character'], 'crushing'); assert.equal(r.facts['hx.chest_pain.location'], 'central');
  assert.deepEqual(r.facts['hx.chest_pain.duration'], { n: 30, unit: 'min' });
});

test('negation: "denies fever", "no diabetes", "non-smoker", NKDA', () => {
  const r = parseIntake('40F with headache, denies fever, no diabetes, non-smoker, NKDA', pack);
  assert.equal(r.age, 40); assert.equal(r.sex, 'female');
  assert.deepEqual(r.complaints, ['headache']);
  assert.equal(r.facts['sx.fever'], 'no'); assert.equal(r.facts['pmh.diabetes'], 'no');
  assert.equal(r.facts['social.smoking'], 'never'); assert.equal(r.facts['allergy.status'], 'none');
});

test('multiple complaints: secondary vomiting/syncope become associated symptoms of the primary', () => {
  const r = parseIntake('70 year old man chest pain and shortness of breath, vomited twice, fainted once', pack);
  assert.deepEqual(r.complaints, ['chest_pain', 'dyspnea']);
  assert.equal(r.facts['sx.vomiting'], 'yes'); assert.equal(r.facts['sx.syncope'], 'yes');
});

test('vitals, GCS and pain score from free text', () => {
  const r = parseIntake('abdominal pain 8/10, BP 85/50, HR 120, RR 24, SpO2 93%, temp 38.6, E4V5M6', pack);
  assert.equal(r.facts['vitals.sbp'], 85); assert.equal(r.facts['vitals.dbp'], 50); assert.equal(r.facts['vitals.hr'], 120);
  assert.equal(r.facts['vitals.rr'], 24); assert.equal(r.facts['vitals.spo2'], 93); assert.equal(r.facts['vitals.temp'], 38.6);
  assert.equal(r.facts['gcs.e'], 4); assert.equal(r.facts['hx.abdominal_pain.pain'], 8);
});

test('Arabic intake', () => {
  const r = parseIntake('مريض عمره ٦٠ سنة ذكر سكري يشكو من ألم الصدر منذ ساعتين مع تعرق', pack);
  assert.equal(r.age, 60); assert.equal(r.sex, 'male');
  assert.deepEqual(r.complaints, ['chest_pain']);
  assert.equal(r.facts['pmh.diabetes'], 'yes'); assert.equal(r.facts['sx.diaphoresis'], 'yes');
  assert.deepEqual(r.facts['hx.chest_pain.duration'], { n: 2, unit: 'hour' });
});

test('nothing is invented from empty or unrelated text', () => {
  assert.deepEqual(parseIntake('', pack), { complaints: [], facts: {} });
  const r = parseIntake('patient brought by family', pack);
  assert.deepEqual(r.complaints, []); assert.deepEqual(r.facts, {}); assert.equal(r.age, undefined);
});
