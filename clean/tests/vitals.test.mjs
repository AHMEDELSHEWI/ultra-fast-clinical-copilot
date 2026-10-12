import test from 'node:test';
import assert from 'node:assert/strict';
import { calcMap, calcShockIndex, calcBmi, calcGcs, formatBp, validateVital, checkBpPair, glucoseMgdlToMmol, glucoseMmolToMgdl } from '../src/core/vitals.js';

test('BP is two numbers and displays as SBP/DBP', () => {
  assert.equal(formatBp(120, 80), '120/80 mmHg');
  assert.equal(formatBp(120, undefined), null);
});

test('MAP = (SBP + 2 DBP) / 3, whole mmHg', () => {
  assert.equal(calcMap(120, 80), 93);
  assert.equal(calcMap(90, 60), 70);
  assert.equal(calcMap(120, null), null);
});

test('shock index and BMI', () => {
  assert.equal(calcShockIndex(88, 120), 0.73);
  assert.equal(calcShockIndex(100, 0), null);
  assert.equal(calcBmi(72, 170), 24.9);
  assert.equal(calcBmi(72, null), null);
});

test('GCS totals only when all three components exist', () => {
  const full = calcGcs({ e: 4, v: 5, m: 6 });
  assert.equal(full.total, 15);
  assert.equal(full.text, 'GCS 15/15 (E4 V5 M6)');
  assert.equal(calcGcs({ e: 3, v: 4, m: 5 }).total, 12);
});

test('GCS never fabricates a total and names what is missing', () => {
  const r = calcGcs({ e: 4, m: 6 });
  assert.equal(r.total, null);
  assert.equal(r.complete, false);
  assert.deepEqual(r.missing, ['v']);
  assert.equal(r.text, 'GCS incomplete — missing verbal response.');
  assert.equal(calcGcs({ e: 4 }).text, 'GCS incomplete — missing verbal response and motor response.');
  assert.equal(calcGcs({}).text, 'GCS incomplete — missing eye opening, verbal response and motor response.');
});

test('GCS rejects out-of-range components', () => {
  assert.equal(calcGcs({ e: 5, v: 5, m: 6 }).total, null);
  assert.equal(calcGcs({ e: 4, v: 0, m: 6 }).complete, false);
});

test('impossible vitals are rejected, unusual BP pair is flagged', () => {
  assert.equal(validateVital('sbp', 120).ok, true);
  assert.equal(validateVital('sbp', 1200).ok, false);
  assert.equal(validateVital('spo2', 101).ok, false);
  assert.equal(validateVital('hr', NaN).ok, false);
  assert.equal(validateVital('hr', '88').ok, false);
  assert.equal(checkBpPair(80, 120).ok, false);
  assert.equal(checkBpPair(120, 80).ok, true);
});

test('glucose conversion round-trips sensibly', () => {
  assert.equal(glucoseMgdlToMmol(100), 5.6);
  assert.equal(glucoseMmolToMgdl(5.6), 101);
});
