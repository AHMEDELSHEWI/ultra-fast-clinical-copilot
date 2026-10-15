import test from 'node:test';
import assert from 'node:assert/strict';
import { pack, makeStore } from './helpers.mjs';
import { autoPlan, approvePlan, skipKey, orderKey } from '../src/core/autoplan.js';
import { renderCompleteCase } from '../src/core/documentation.js';
import { administered } from '../src/core/meds.js';

const set = (s, obj) => { for (const [k, v] of Object.entries(obj)) s.setFact(k, v); return s; };
function chestPain() {
  const s = makeStore();
  s.addComplaint('chest_pain');
  return set(s, { 'patient.age': 55, 'patient.sex': 'male', 'vitals.sbp': 130, 'vitals.dbp': 80, 'vitals.hr': 88, 'vitals.weight': 80, 'allergy.status': 'no' });
}

test('auto plan prepares investigations, a ranked differential with a leading diagnosis, and treatment — without any clinician tap', () => {
  const p = autoPlan(pack, chestPain());
  assert.ok(p.investigations.length > 0, 'investigations planned automatically');
  assert.ok(p.investigations.every((x) => ['now', 'soon'].includes(x.tier)));
  assert.ok(p.differential.length > 0);
  assert.equal(p.differential.filter((d) => d.leading).length, 1, 'exactly one leading diagnosis');
  assert.ok(p.pending > 0);
});

test('nothing enters the record until approved; one tap approves everything', () => {
  const s = chestPain();
  const before = renderCompleteCase(s, pack);
  assert.doesNotMatch(before, /requested|Working diagnosis/);
  const p = autoPlan(pack, s);
  const n = approvePlan(pack, s);
  assert.equal(n.inv, p.investigations.length);
  for (const x of p.investigations) assert.equal(s.getFact(`inv.${x.id}`), 'requested');
  assert.equal(s.getFact('assessment.diagnosis'), p.leading.dx.en);
  const note = renderCompleteCase(s, pack);
  assert.match(note, /Working diagnosis \(auto-generated, approved by clinician\)/);
  assert.match(note, /Requested: /);
  assert.equal(autoPlan(pack, s).pending, 0, 'nothing left pending after approval');
});

test('ACS as working diagnosis: aspirin is ordered per local protocol because no dose is verified', () => {
  const s = chestPain();
  s.setFact('plan.leading', 'acs');
  const p = autoPlan(pack, s);
  if (!p.differential.some((d) => d.id === 'acs')) return; // content does not list ACS for this case
  const asp = p.meds.find((m) => m.drug.id === 'aspirin');
  assert.ok(asp && asp.auto, 'aspirin follows the leading diagnosis');
  approvePlan(pack, s);
  assert.match(s.getFact(orderKey(asp.key)), /dose per local protocol/);
  assert.match(renderCompleteCase(s, pack), /TREATMENT ORDERED/);
});

test('adult bradycardia: first-line atropine 1 mg auto-ordered with its condition; alternatives are not', () => {
  const s = makeStore(); s.addComplaint('syncope');
  set(s, { 'patient.age': 70, 'patient.sex': 'female', 'vitals.hr': 40, 'vitals.weight': 70, 'allergy.status': 'no' });
  const p = autoPlan(pack, s);
  const atropine = p.meds.find((m) => m.key === 'atropine.brady');
  assert.ok(atropine.auto);
  assert.equal(p.meds.find((m) => m.key === 'epinephrine.brady_infusion').auto, false);
  approvePlan(pack, s);
  assert.equal(s.getFact(orderKey('atropine.brady')), 'Atropine 1 mg IV bolus ordered (symptomatic bradycardia; only if the bradycardia is causing symptoms or instability).');
  assert.equal(administered(s, 'atropine').length, 0, 'an order is not recorded as given');
});

test('PAEDIATRIC: child bradycardia — epinephrine 0.01 mg/kg first line, no adult drug, weight required', () => {
  const s = makeStore(); s.addComplaint('syncope');
  set(s, { 'patient.age': 6, 'patient.sex': 'male', 'vitals.hr': 40, 'allergy.status': 'no' });
  let p = autoPlan(pack, s);
  assert.ok(!p.meds.some((m) => m.use.pop === 'adult'), 'adult doses never planned for a child');
  assert.equal(p.meds.find((m) => m.key === 'epinephrine.brady_ped').auto, false, 'no weight → not auto-ordered');
  s.setFact('vitals.weight', 20);
  p = autoPlan(pack, s);
  const epi = p.meds.find((m) => m.key === 'epinephrine.brady_ped');
  assert.ok(epi.auto); assert.equal(epi.dose.amount, 0.2);
  assert.equal(p.meds.find((m) => m.key === 'atropine.brady_ped').auto, false);
});

test('clinician can decline an item; declined items are not approved', () => {
  const s = chestPain();
  const first = autoPlan(pack, s).investigations[0];
  s.setFact(skipKey('inv', first.id), 'yes');
  approvePlan(pack, s);
  assert.equal(s.getFact(`inv.${first.id}`), undefined);
});

test('critical safety flag blocks auto-ordering (documented allergy)', () => {
  const s = makeStore(); s.addComplaint('syncope');
  set(s, { 'patient.age': 70, 'patient.sex': 'female', 'vitals.hr': 40, 'allergy.status': 'yes' });
  s.setFact('allergy.status.detail', 'atropine');
  const atropine = autoPlan(pack, s).meds.find((m) => m.key === 'atropine.brady');
  assert.equal(atropine.blocked, true); assert.equal(atropine.auto, false);
});
