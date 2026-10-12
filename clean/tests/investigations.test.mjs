import test from 'node:test';
import assert from 'node:assert/strict';
import { pack, makeStore } from './helpers.mjs';
import { suggestInvestigations } from '../src/core/investigations.js';

const set = (s, obj) => { for (const [k, v] of Object.entries(obj)) s.setFact(k, v); return s; };
const tierOf = (list, id) => list.find((x) => x.id === id)?.tier;

test('chest pain: ECG and troponin DO NOW with reasons and sources', () => {
  const s = set(makeStore(), { 'patient.age': 55, 'patient.sex': 'male' }); s.addComplaint('chest_pain');
  const l = suggestInvestigations(pack, s);
  assert.equal(tierOf(l, 'ecg'), 'now');
  assert.equal(tierOf(l, 'troponin'), 'now');
  const ecg = l.find((x) => x.id === 'ecg');
  assert.match(ecg.reasons[0].why, /10 minutes/);
  assert.ok(ecg.reasons[0].sources.includes('cp2021'));
  assert.equal(l[0].tier, 'now', 'sorted by urgency');
});

test('PE pathway depends on scores: Wells > 4 -> CTPA now; PERC negative -> D-dimer not routine', () => {
  const s = set(makeStore(), { 'patient.age': 40, 'patient.sex': 'male', 'exam.dvt_signs': 'yes', 'judg.pe_most_likely': 'yes', 'vitals.hr': 90,
    'hx.recent_surgery_immobilisation': 'no', 'pmh.prior_vte': 'no', 'sx.haemoptysis': 'no', 'pmh.active_cancer': 'no' });
  s.addComplaint('dyspnea');
  assert.equal(tierOf(suggestInvestigations(pack, s), 'ctpa'), 'now');
  const low = set(makeStore(), { 'patient.age': 30, 'patient.sex': 'male', 'judg.pe_low_gestalt': 'yes', 'vitals.hr': 80, 'vitals.spo2': 98,
    'sx.unilateral_leg_swelling': 'no', 'sx.haemoptysis': 'no', 'hx.recent_trauma_surgery': 'no', 'pmh.prior_vte': 'no', 'meds.hormone': 'no',
    'exam.dvt_signs': 'no', 'judg.pe_most_likely': 'no', 'hx.recent_surgery_immobilisation': 'no', 'pmh.active_cancer': 'no' });
  low.addComplaint('dyspnea');
  const l = suggestInvestigations(pack, low);
  assert.equal(tierOf(l, 'd_dimer'), 'not_routine');
  assert.equal(tierOf(l, 'ctpa'), undefined);
});

test('pregnancy test only for women of child-bearing age; sepsis bundle from scores', () => {
  const f = set(makeStore(), { 'patient.age': 25, 'patient.sex': 'female' }); f.addComplaint('abdominal_pain');
  assert.equal(tierOf(suggestInvestigations(pack, f), 'hcg'), 'now');
  const m = set(makeStore(), { 'patient.age': 25, 'patient.sex': 'male' }); m.addComplaint('abdominal_pain');
  assert.equal(tierOf(suggestInvestigations(pack, m), 'hcg'), undefined);
  const sep = set(makeStore(), { 'patient.age': 60, 'patient.sex': 'male', 'vitals.rr': 26, 'vitals.sbp': 95, 'gcs.e': 4, 'gcs.v': 5, 'gcs.m': 6 });
  sep.addComplaint('fever');
  const l = suggestInvestigations(pack, sep);
  assert.equal(tierOf(l, 'lactate'), 'now');
  assert.equal(tierOf(l, 'blood_cultures'), 'now');
});

test('AMS: capillary glucose first; corrected data stops driving suggestions', () => {
  const s = set(makeStore(), { 'patient.age': 70, 'patient.sex': 'male' }); s.addComplaint('altered_mental_status');
  assert.equal(tierOf(suggestInvestigations(pack, s), 'glucose_cap'), 'now');
  s.setFact('vitals.spo2', 90);
  assert.equal(tierOf(suggestInvestigations(pack, s), 'blood_gas'), 'now');
  const d = set(makeStore(), { 'patient.age': 40, 'patient.sex': 'male' }); d.addComplaint('palpitations');
  d.setFact('vitals.spo2', 90);
  assert.ok(suggestInvestigations(pack, d).some((x) => x.id === 'blood_gas'));
  d.correctFact('vitals.spo2', 98, 'Probe artefact');
  assert.ok(!suggestInvestigations(pack, d).some((x) => x.id === 'blood_gas'));
});

test('back pain without red flags: imaging not routine; with cauda equina flag MRI now', () => {
  const s = set(makeStore(), { 'patient.age': 35, 'patient.sex': 'male', 'sx.leg_weakness_numbness': 'no', 'sx.bladder_bowel': 'no', 'pmh.cancer': 'no' });
  s.addComplaint('back_pain');
  assert.equal(tierOf(suggestInvestigations(pack, s), 'spine_imaging'), 'not_routine');
  s.setFact('sx.bladder_bowel', 'yes', { replace: true });
  assert.equal(tierOf(suggestInvestigations(pack, s), 'mri_spine'), 'now');
});

test('catalog integrity: every rule item exists; tiers valid; cited sources exist', () => {
  const ids = new Set(pack.investigationCatalog.map((c) => c.id));
  for (const r of pack.investigationRules) for (const it of r.items) {
    assert.ok(ids.has(it.id), `${r.id}: unknown investigation ${it.id}`);
    assert.ok(['now', 'soon', 'consider', 'not_routine'].includes(it.tier));
    assert.ok(it.why.length > 10);
    for (const s of it.sources) assert.ok(pack.sources[s], `${r.id}: unknown source ${s}`);
  }
});
