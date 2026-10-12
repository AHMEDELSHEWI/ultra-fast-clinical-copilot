import test from 'node:test';
import assert from 'node:assert/strict';
import { pack, makeStore } from './helpers.mjs';
import { evaluateById, relevantScores, nextScoreInput, pendingHistoryInputs, readingsOf } from '../src/core/workup.js';
import { scoreText } from '../src/core/scoreEngine.js';
import { SCORES } from '../src/content/scores.js';

const set = (s, obj) => { for (const [k, v] of Object.entries(obj)) if (v !== undefined) s.setFact(k, v); return s; };
const adult = (extra = {}) => set(makeStore(), { 'patient.age': 55, 'patient.sex': 'male', ...extra });

test('every score definition is well-formed and cites known sources', () => {
  for (const d of SCORES) {
    assert.ok(d.id && d.name && d.use && d.version, d.id);
    assert.ok(d.inputs.length > 0, d.id);
    assert.ok(Array.isArray(d.limitations) && d.limitations.length, `${d.id} limitations`);
    for (const s of d.sources) assert.ok(pack.sources[s], `${d.id}: unknown source ${s}`);
    for (const s of d.sources) assert.ok(pack.sources[s].pmid || pack.sources[s].url, `${d.id}: ${s} needs PMID or URL`);
  }
});

test('HEART: high and low examples, atherosclerotic disease = 2 points', () => {
  const hi = adult({ 'patient.age': 70, 'judg.heart_history': 2, 'ecg.heart_cat': 2, 'pmh.cad_known': 'yes', 'lab.troponin_cat': 2 });
  let r = evaluateById(hi, 'heart');
  assert.equal(r.complete, true); assert.equal(r.total, 10); assert.equal(r.result.level, 'danger');
  const lo = adult({ 'patient.age': 40, 'judg.heart_history': 0, 'ecg.heart_cat': 0, 'lab.troponin_cat': 0,
    'pmh.cad_known': 'no', 'pmh.stroke_tia': 'no', 'pmh.pad': 'no', 'pmh.diabetes': 'no', 'social.smoking': 'never',
    'pmh.hypertension': 'no', 'pmh.hyperlipidaemia': 'no', 'family.premature_cad': 'no', 'pmh.obesity': 'no' });
  r = evaluateById(lo, 'heart');
  assert.equal(r.total, 0); assert.match(r.result.label, /low risk/);
});

test('HEART asks only what can change the risk-factor band', () => {
  const s = adult({ 'judg.heart_history': 1, 'ecg.heart_cat': 0, 'lab.troponin_cat': 0, 'pmh.diabetes': 'yes', 'pmh.hypertension': 'yes', 'social.smoking': 'current' });
  const r = evaluateById(s, 'heart');
  assert.equal(r.complete, true, '3 risk factors already decide 2 points');
  assert.equal(r.total, 1 + 0 + 1 + 2 + 0);
});

test('a score never completes from a value marked unknown, and does not re-ask it', () => {
  const s = adult({ 'judg.heart_history': 1, 'ecg.heart_cat': 0, 'pmh.cad_known': 'yes' });
  s.markUnknown('lab.troponin_cat');
  const r = evaluateById(s, 'heart');
  assert.equal(r.complete, false);
  assert.deepEqual(r.unknown, ['lab.troponin_cat']);
  assert.equal(nextScoreInput(pack, s, 'heart'), null);
  assert.match(scoreText(r), /UNKNOWN/);
});

test('EDACS and TIMI examples', () => {
  const e = adult({ 'patient.age': 50, 'pmh.cad_known': 'no', 'family.premature_cad': 'no', 'pmh.hypertension': 'no', 'pmh.hyperlipidaemia': 'no', 'pmh.diabetes': 'no', 'social.smoking': 'never',
    'sx.diaphoresis': 'no', 'hx.chest_pain.radiation': 'none', 'hx.chest_pain.character': 'pleuritic', 'exam.chest_wall_reproducible': 'no' });
  let r = evaluateById(e, 'edacs');
  assert.equal(r.total, 4 + 6 + 0 + 0 + 0 - 4 + 0); assert.match(r.result.label, /below 16/);
  const t = adult({ 'patient.age': 70, 'family.premature_cad': 'yes', 'pmh.hypertension': 'yes', 'pmh.diabetes': 'yes', 'pmh.cad_known': 'yes',
    'meds.aspirin_7d': 'yes', 'hx.chest_pain.episodes_24h': 'yes', 'ecg.heart_cat': 2, 'lab.troponin_cat': 1 });
  r = evaluateById(t, 'timi');
  assert.equal(r.total, 7); assert.match(r.result.meaning, /40.9%/);
});

test('Wells PE two-tier and PERC rule logic', () => {
  const s = adult({ 'exam.dvt_signs': 'no', 'judg.pe_most_likely': 'no', 'vitals.hr': 110, 'hx.recent_surgery_immobilisation': 'no', 'pmh.prior_vte': 'no', 'sx.haemoptysis': 'yes', 'pmh.active_cancer': 'no' });
  let r = evaluateById(s, 'wells_pe');
  assert.equal(r.total, 2.5); assert.match(r.result.label, /unlikely/);
  s.setFact('judg.pe_most_likely', 'yes', { replace: true });
  r = evaluateById(s, 'wells_pe');
  assert.equal(r.total, 5.5); assert.match(r.result.label, /likely/);

  const p = adult({ 'patient.age': 30 });
  assert.equal(evaluateById(p, 'perc').complete, false, 'applicability (low gestalt) asked first');
  p.setFact('judg.pe_low_gestalt', 'yes');
  p.setFact('vitals.hr', 105);
  r = evaluateById(p, 'perc');
  assert.equal(r.complete, true, 'one positive criterion decides PERC positive');
  assert.match(r.result.label, /positive/);
  const neg = adult({ 'patient.age': 30, 'judg.pe_low_gestalt': 'yes', 'vitals.hr': 80, 'vitals.spo2': 98, 'sx.unilateral_leg_swelling': 'no', 'sx.haemoptysis': 'no', 'hx.recent_trauma_surgery': 'no', 'pmh.prior_vte': 'no', 'meds.hormone': 'no' });
  assert.match(evaluateById(neg, 'perc').result.label, /negative/);
  const high = adult({ 'judg.pe_low_gestalt': 'no' });
  assert.equal(evaluateById(high, 'perc').applicable, false);
});

test('NEWS2: normal, high, single red parameter, scale 2', () => {
  const base = { 'vitals.rr': 18, 'vitals.spo2': 97, 'pmh.chronic_lung_disease': 'no', 'vitals.o2device': 'room_air', 'vitals.sbp': 120, 'vitals.hr': 80, 'gcs.e': 4, 'gcs.v': 5, 'gcs.m': 6, 'vitals.temp': 37 };
  let r = evaluateById(adult(base), 'news2');
  assert.equal(r.total, 0);
  r = evaluateById(adult({ ...base, 'gcs.e': undefined, 'gcs.v': undefined, 'gcs.m': undefined, 'exam.acvpu': 'C', 'vitals.rr': 25, 'vitals.spo2': 91, 'vitals.o2device': 'nasal_cannula', 'vitals.sbp': 95, 'vitals.hr': 115, 'vitals.temp': 39.5 }), 'news2');
  assert.equal(r.total, 3 + 3 + 2 + 2 + 2 + 3 + 2); assert.equal(r.result.level, 'danger');
  r = evaluateById(adult({ ...base, 'vitals.rr': 25 }), 'news2');
  assert.equal(r.total, 3); assert.match(r.result.label, /single parameter/);
  const lung = { ...base, 'pmh.chronic_lung_disease': 'yes', 'judg.news2_scale2': 'yes', 'vitals.spo2': 90 };
  assert.equal(evaluateById(adult(lung), 'news2').components[1].points, 0, 'scale 2: 90% on air scores 0');
  assert.equal(evaluateById(adult({ ...lung, 'vitals.spo2': 97, 'vitals.o2device': 'face_mask' }), 'news2').components[1].points, 3);
});

test('qSOFA and CURB-65', () => {
  let r = evaluateById(adult({ 'vitals.rr': 24, 'vitals.sbp': 100, 'gcs.e': 4, 'gcs.v': 5, 'gcs.m': 6 }), 'qsofa');
  assert.equal(r.total, 2); assert.match(r.limitations.join(' '), /Surviving Sepsis/);
  r = evaluateById(adult({ 'patient.age': 70, 'lab.urea': 8, 'vitals.rr': 20, 'vitals.sbp': 120, 'vitals.dbp': 70, 'gcs.e': 4, 'gcs.v': 5, 'gcs.m': 6 }), 'curb65');
  assert.equal(r.total, 2); assert.match(r.result.meaning, /3%/);
  const asks = nextScoreInput(pack, adult({ 'patient.age': 70, 'vitals.rr': 20, 'vitals.sbp': 120, 'vitals.dbp': 70, 'gcs.e': 4, 'gcs.v': 5, 'gcs.m': 6 }), 'curb65');
  assert.equal(asks.key, 'lab.urea', 'only the missing urea is asked');
});

test('CSRS uses every valid SBP reading but never a corrected one', () => {
  const s = adult({ 'judg.vasovagal_predisposition': 'no', 'pmh.heart_disease': 'no', 'lab.troponin_cat': 0, 'ecg.axis': 30, 'ecg.qrs_ms': 90, 'ecg.qtc_ms': 430, 'judg.syncope_ed_dx': 'neither' });
  s.setFact('vitals.sbp', 85);
  s.setFact('vitals.sbp', 120, { replace: true, reason: 'Repeat measurement' });
  assert.deepEqual(readingsOf(s, 'vitals.sbp'), [85, 120]);
  assert.equal(evaluateById(s, 'csrs').total, 2);
  const c = adult({ 'judg.vasovagal_predisposition': 'no', 'pmh.heart_disease': 'no', 'lab.troponin_cat': 0, 'ecg.axis': 30, 'ecg.qrs_ms': 90, 'ecg.qtc_ms': 430, 'judg.syncope_ed_dx': 'vasovagal' });
  c.setFact('vitals.sbp', 85);
  c.correctFact('vitals.sbp', 120, 'Cuff fault');
  const r = evaluateById(c, 'csrs');
  assert.equal(r.total, -2); assert.match(r.result.label, /very low/);
});

test('CHA2DS2-VASc shows CHA2DS2-VA; HAS-BLED; Ottawa SAH; CT head; Alvarado; GBS', () => {
  let r = evaluateById(set(makeStore(), { 'patient.age': 76, 'patient.sex': 'female', 'pmh.heart_failure': 'no', 'pmh.hypertension': 'yes', 'pmh.diabetes': 'yes', 'pmh.stroke_tia': 'no', 'pmh.cad_known': 'no', 'pmh.pad': 'no' }), 'chadsvasc');
  assert.equal(r.total, 5); assert.match(r.result.label, /VA 4/);
  r = evaluateById(adult({ 'patient.age': 70, 'pmh.htn_uncontrolled': 'yes', 'pmh.renal_disease': 'no', 'pmh.liver_disease': 'no', 'pmh.stroke_tia': 'yes', 'pmh.bleeding_history': 'no', 'meds.labile_inr': 'no', 'meds.antiplatelet_nsaid': 'no', 'social.alcohol_excess': 'no' }), 'hasbled');
  assert.equal(r.total, 3); assert.equal(r.result.level, 'warn');
  r = evaluateById(adult({ 'patient.age': 45, 'hx.headache.peak_1h': 'yes', 'sx.focal_weakness': 'no' }), 'ottawa_sah');
  assert.equal(r.complete, true); assert.match(r.result.label, /investigate/);
  r = evaluateById(adult({ 'patient.age': 70, 'hx.altered_mental_status.head_injury': 'yes', 'meds.anticoagulant': 'no', 'gcs.e': 4, 'gcs.v': 5, 'gcs.m': 6 }), 'ct_head');
  assert.match(r.result.label, /high risk/);
  r = evaluateById(adult({ 'hx.altered_mental_status.head_injury': 'yes', 'meds.anticoagulant': 'yes' }), 'ct_head');
  assert.equal(r.applicable, false);
  r = evaluateById(adult({ 'sx.pain_migration_rlq': 'yes', 'sx.anorexia': 'yes', 'sx.nausea': 'yes', 'exam.rlq_tenderness': 'yes', 'exam.rebound': 'no', 'vitals.temp': 37.5, 'lab.wbc': 12, 'lab.neut_pct': 70 }), 'alvarado');
  assert.equal(r.total, 1 + 1 + 1 + 2 + 0 + 1 + 2 + 0); assert.match(r.result.label, /probable/);
  r = evaluateById(adult({ 'lab.urea': 9, 'lab.hb': 110, 'vitals.sbp': 105, 'vitals.hr': 105, 'sx.melaena': 'yes', 'sx.syncope': 'no', 'pmh.liver_disease': 'no', 'pmh.heart_failure': 'no' }), 'gbs');
  assert.equal(r.total, 3 + 3 + 1 + 1 + 1);
});

test('age gating: adult scores are not applied to children', () => {
  const kid = set(makeStore(), { 'patient.age': 9 });
  const r = evaluateById(kid, 'heart');
  assert.equal(r.applicable, false); assert.match(r.reason, /age/);
});

test('relevant scores follow the complaints; NEWS2 always offered; history inputs feed the interview', () => {
  const s = adult(); s.addComplaint('chest_pain');
  const ids = relevantScores(pack, s).map((x) => x.id);
  assert.ok(ids.includes('heart') && ids.includes('edacs') && ids.includes('news2'));
  assert.ok(!ids.includes('csrs'));
  const pending = pendingHistoryInputs(pack, s).map((x) => x.key);
  assert.ok(pending.includes('pmh.cad_known'));
  assert.ok(!pending.some((k) => k.startsWith('lab.') || k.startsWith('ecg.')), 'labs/ECG are not interview questions');
  s.addComplaint('syncope');
  assert.ok(relevantScores(pack, s).some((x) => x.id === 'csrs'));
});

test('vomiting complaint counts as the vomiting symptom (no duplicate question)', () => {
  const s = adult({ 'sx.pain_migration_rlq': 'no', 'sx.anorexia': 'no', 'exam.rlq_tenderness': 'no', 'exam.rebound': 'no', 'vitals.temp': 37, 'lab.wbc': 8, 'lab.neut_pct': 60 });
  s.addComplaint('abdominal_pain'); s.addComplaint('vomiting');
  const r = evaluateById(s, 'alvarado');
  assert.equal(r.complete, true); assert.equal(r.total, 1);
});

test('copy score is plain text', () => {
  const r = evaluateById(adult({ 'vitals.rr': 24, 'vitals.sbp': 100, 'gcs.e': 4, 'gcs.v': 5, 'gcs.m': 6 }), 'qsofa');
  const txt = scoreText(r);
  assert.match(txt, /^qSOFA 2\/3/);
  assert.doesNotMatch(txt, /undefined|NaN|\{|\[object/);
});
