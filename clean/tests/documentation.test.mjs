import test from 'node:test';
import assert from 'node:assert/strict';
import { makeStore, pack } from './helpers.mjs';
import { buildSections, renderCompleteCase, renderSection, joinList, formatDuration, severityWord } from '../src/core/documentation.js';
import { copyText, assertPlainText, COPY_TARGETS } from '../src/core/copy.js';

const TZ = 'UTC';
const section = (s, id) => buildSections(s, pack, { tz: TZ }).find((x) => x.id === id);

function chestPainCase() {
  const s = makeStore();
  s.setFact('patient.age', 55);
  s.setFact('patient.sex', 'male');
  s.addComplaint('chest_pain');
  s.setFact('hx.chest_pain.pain', 7);
  s.setFact('hx.chest_pain.location', 'central');
  s.setFact('hx.chest_pain.character', 'crushing');
  s.setFact('hx.chest_pain.radiation', 'left_arm');
  s.setFact('sx.diaphoresis', 'yes');
  s.setFact('sx.nausea', 'yes');
  return s;
}

test('spec example: structured pain data becomes the exact clinical sentence', () => {
  const s = chestPainCase();
  assert.equal(section(s, 'hpi').lines[0],
    'Patient reports severe central crushing chest pain, rated 7/10, radiating to the left arm and associated with diaphoresis and nausea.');
});

test('negatives are documented only when the question was asked and answered no', () => {
  const s = chestPainCase();
  s.setFact('sx.dyspnea', 'no');
  assert.match(section(s, 'hpi').lines[0], /Patient denies dyspnea\./);
  const text = renderCompleteCase(s, pack, { tz: TZ });
  assert.doesNotMatch(text, /fever/i); // never asked => never mentioned
  assert.doesNotMatch(text, /denies syncope/i);
});

test('unasked = silent, unknown = stated as unknown', () => {
  const s = chestPainCase();
  assert.deepEqual(section(s, 'history').lines, []);
  s.markUnknown('allergy.status');
  assert.deepEqual(section(s, 'history').lines, ['Drug allergy status: unknown.']);
});

test('core sections say "Not documented." and optional empty ones are omitted', () => {
  const s = makeStore();
  const text = renderCompleteCase(s, pack, { tz: TZ });
  assert.match(text, /VITAL SIGNS\nNot documented\./);
  assert.match(text, /EXAMINATION\nNot documented\./);
  assert.doesNotMatch(text, /TREATMENT GIVEN/);
  assert.doesNotMatch(text, /DISPOSITION/);
});

test('vital signs read like a note, MAP calculated, no assumed room air', () => {
  const s = makeStore();
  s.setFact('vitals.sbp', 120); s.setFact('vitals.dbp', 80); s.setFact('vitals.hr', 88);
  s.setFact('vitals.spo2', 98);
  assert.equal(section(s, 'vitals').lines[0], 'Vital signs: BP 120/80 mmHg (MAP 93 mmHg), HR 88 bpm, SpO2 98%.');
  s.setFact('vitals.o2device', 'room_air');
  assert.equal(section(s, 'vitals').lines[0], 'Vital signs: BP 120/80 mmHg (MAP 93 mmHg), HR 88 bpm, SpO2 98% on room air.');
});

test('GCS appears as a total only when complete', () => {
  const s = makeStore();
  s.setFact('gcs.e', 4); s.setFact('gcs.m', 6);
  assert.deepEqual(section(s, 'vitals').lines, ['GCS incomplete — missing verbal response.']);
  s.setFact('gcs.v', 5);
  assert.deepEqual(section(s, 'vitals').lines, ['GCS 15/15 (E4 V5 M6).']);
});

test('ACCEPTANCE: corrected BP flows into the note; old value only in the corrections section', () => {
  const s = makeStore();
  s.setFact('patient.age', 40);
  s.setFact('vitals.sbp', 90); s.setFact('vitals.dbp', 60);
  s.correctFact('vitals.sbp', 120, 'Equipment error');
  s.correctFact('vitals.dbp', 80, 'Equipment error');
  assert.match(section(s, 'vitals').lines[0], /BP 120\/80 mmHg/);
  assert.doesNotMatch(section(s, 'vitals').lines[0], /90/);
  const corr = section(s, 'corrections').lines.join('\n');
  assert.match(corr, /Systolic BP 90 recorded earlier was corrected/);
  assert.match(corr, /Reason: Equipment error/);
  assert.match(renderCompleteCase(s, pack, { tz: TZ }), /DOCUMENTATION CORRECTIONS/);
});

test('removed values vanish from the current note', () => {
  const s = makeStore();
  s.setFact('vitals.hr', 150);
  s.removeFact('vitals.hr', 'Wrong patient');
  assert.equal(section(s, 'vitals').empty, true);
  assert.match(section(s, 'corrections').lines[0], /removed from current calculations/);
});

test('history: PMH first, then safety items in pack order (allergy, anticoagulant, pregnancy), then social', () => {
  const s = makeStore();
  s.setFact('pmh.diabetes', 'yes'); s.setFact('pmh.hypertension', 'no');
  s.setFact('meds.anticoagulant', 'no');
  s.setFact('allergy.status', 'yes'); s.setFact('allergy.status.detail', 'penicillin - rash');
  s.setFact('preg.status', 'no'); s.setFact('social.smoking', 'ex');
  assert.deepEqual(section(s, 'history').lines, [
    'Past medical history: diabetes mellitus.',
    'Patient denies history of hypertension.',
    'Drug allergy present: penicillin - rash.',
    'Not on anticoagulant or antiplatelet therapy.',
    'Not pregnant.',
    'Ex-smoker.',
  ]);
});

test('multiple complaints are described in one connected HPI, shared symptoms asked once', () => {
  const s = chestPainCase();
  s.addComplaint('dyspnea');
  s.setFact('hx.dyspnea.onset', 'sudden');
  s.setFact('sx.dyspnea', 'yes'); // would duplicate the complaint itself: must not be listed as an association
  const hpi = section(s, 'hpi').lines[0];
  assert.match(hpi, /Patient also reports shortness of breath, of sudden onset\./);
  assert.doesNotMatch(hpi, /associated with .*dyspnea/);
});

test('exam findings, contradictions explained by the clinician are shown in the note', () => {
  const s = makeStore();
  s.setFact('exam.resp.normal', 'present');
  s.setFact('exam.resp.wheeze', 'present', { excludes: ['exam.resp.normal'], keepBoth: true, reason: 'right clear, left wheeze' });
  const line = section(s, 'exam').lines[0];
  assert.match(line, /Respiratory: normal breath sounds and wheeze present \(clinician note: right clear, left wheeze\)\./);
});

test('timeline and treatment use event times, not invented ones', () => {
  const s = makeStore();
  s.addEvent({ type: 'treatment', text: 'Aspirin given', at: Date.UTC(2026, 9, 12, 14, 7) });
  s.addEvent({ type: 'consult', text: 'Cardiology contacted', at: Date.UTC(2026, 9, 12, 14, 9) });
  assert.deepEqual(section(s, 'treatment').lines, ['14:07 Aspirin given']);
  assert.deepEqual(section(s, 'timeline').lines, ['14:07 Aspirin given', '14:09 Cardiology contacted']);
});

test('draft and final status, demo banner', () => {
  const s = makeStore();
  s.state.demo = true;
  assert.match(renderCompleteCase(s, pack, { tz: TZ }), /DEMO CASE — NOT A REAL PATIENT/);
  assert.match(renderCompleteCase(s, pack, { tz: TZ }), /Status: DRAFT/);
  s.finalize();
  assert.match(renderCompleteCase(s, pack, { tz: TZ }), /Status: FINAL/);
});

test('helpers', () => {
  assert.equal(joinList(['a']), 'a');
  assert.equal(joinList(['a', 'b']), 'a and b');
  assert.equal(joinList(['a', 'b', 'c']), 'a, b and c');
  assert.equal(formatDuration({ n: 1, unit: 'hour' }), '1 hour');
  assert.equal(formatDuration({ n: 30, unit: 'min' }), '30 minutes');
  assert.equal(formatDuration({ n: 'x', unit: 'min' }), null);
  assert.deepEqual([0, 3, 4, 6, 7, 10].map(severityWord), [null, 'mild', 'moderate', 'moderate', 'severe', 'severe']);
});

// ---------- copy ----------
test('every copy target returns clean plain text, never JSON or technical syntax', () => {
  const s = chestPainCase();
  s.setFact('vitals.sbp', 120); s.setFact('vitals.dbp', 80);
  for (const target of Object.keys(COPY_TARGETS)) {
    const text = copyText(s, pack, target, { tz: TZ });
    assert.ok(text.length > 0, target);
    assert.doesNotMatch(text, /^[{[]/m, target);
    assert.doesNotMatch(text, /undefined|NaN|\[object|Infinity/, target);
  }
});

test('COPY COMPLETE CASE contains each documented section in one text', () => {
  const s = chestPainCase();
  s.setFact('vitals.sbp', 120); s.setFact('vitals.dbp', 80);
  s.setFact('assessment.diagnosis', 'Acute chest pain, ACS not excluded');
  const text = copyText(s, pack, 'complete', { tz: TZ });
  for (const h of ['CLINICAL NOTE', 'PATIENT', 'CHIEF COMPLAINT', 'HISTORY OF PRESENTING ILLNESS', 'VITAL SIGNS', 'ASSESSMENT']) {
    assert.ok(text.includes(h), h);
  }
  assert.ok(!text.includes('DR. AHMED'), 'watermark must not pollute copied text');
});

test('copy is blocked if technical syntax leaks', () => {
  assert.throws(() => assertPlainText('{"bp":120}'), /technical/i);
  assert.throws(() => assertPlainText('BP undefined'), /technical/i);
  assert.throws(() => assertPlainText('Value NaN'), /technical/i);
  assert.throws(() => assertPlainText('   '), /nothing/i);
  assert.equal(assertPlainText('BP 120/80 mmHg'), 'BP 120/80 mmHg');
  assert.throws(() => copyText(makeStore(), pack, 'nonsense'), /Unknown copy target/);
});

test('renderSection prints title and body', () => {
  const s = chestPainCase();
  assert.match(renderSection(section(s, 'cc')), /^CHIEF COMPLAINT\nChest pain$/);
});
