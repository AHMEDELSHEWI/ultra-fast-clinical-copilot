import test from 'node:test';
import assert from 'node:assert/strict';
import { pack, makeStore } from './helpers.mjs';
import { DRUGS, DRUG_BY_ID, MED_RULES } from '../src/content/drugs.js';
import { calcDose, medContext, safetyChecks, suggestMeds, administered } from '../src/core/meds.js';
import { crcl, anionGap, qtcBazett } from '../src/core/calculators.js';
import { copyText } from '../src/core/copy.js';

const set = (s, obj) => { for (const [k, v] of Object.entries(obj)) s.setFact(k, v); return s; };
const use = (d, u) => DRUG_BY_ID[d].uses.find((x) => x.id === u);

test('every dose in the library has a source and a verbatim reference; unverified doses are null', () => {
  for (const d of DRUGS) for (const u of d.uses) {
    assert.ok(pack.sources[u.source], `${d.id}/${u.id}: unknown source ${u.source}`);
    assert.ok(u.ref && u.ref.length > 5, `${d.id}/${u.id}: needs the quoted reference`);
    assert.ok(['adult', 'paediatric', 'all'].includes(u.pop));
    if (u.dose) assert.ok(u.dose.unit, `${d.id}/${u.id}: dose needs a unit`);
    for (const k of ['target', 'titration', 'max', 'adjust', 'adverse', 'contraindications', 'management']) assert.ok(d.seven[k] !== undefined, `${d.id}: missing ${k}`);
  }
  for (const r of MED_RULES) for (const [d, u] of r.items) assert.ok(use(d, u), `${r.id}: ${d}/${u}`);
});

test('adult fixed doses (2025 AHA): epinephrine 1 mg, amiodarone 300 mg, adenosine 6 mg, atropine 1 mg', () => {
  const ctx = medContext(set(makeStore(), { 'patient.age': 60 }));
  assert.match(calcDose(use('epinephrine', 'arrest'), ctx).text, /^1 mg IV\/IO, every 3–5 minutes/);
  assert.match(calcDose(use('amiodarone', 'vf'), ctx).text, /^300 mg/);
  assert.match(calcDose(use('adenosine', 'svt'), ctx).text, /^6 mg/);
  assert.match(calcDose(use('atropine', 'brady'), ctx).text, /^1 mg/);
});

test('PAEDIATRIC SAFETY: adult doses never shown to a child; weight required; max and min caps applied', () => {
  const kid = medContext(set(makeStore(), { 'patient.age': 6 }));
  const adultUse = calcDose(use('epinephrine', 'arrest'), kid);
  assert.equal(adultUse.ok, false); assert.match(adultUse.reason, /not applicable to a child/);
  const noWeight = calcDose(use('epinephrine', 'arrest_ped'), kid);
  assert.equal(noWeight.ok, false); assert.deepEqual(noWeight.needs, ['vitals.weight']);
  const k20 = medContext(set(makeStore(), { 'patient.age': 6, 'vitals.weight': 20 }));
  const e = calcDose(use('epinephrine', 'arrest_ped'), k20);
  assert.equal(e.amount, 0.2); assert.match(e.calc, /0.01 mg\/kg × 20 kg = 0.2 mg/);
  const big = medContext(set(makeStore(), { 'patient.age': 16, 'vitals.weight': 120 }));
  assert.equal(calcDose(use('epinephrine', 'arrest_ped'), big).amount, 1, 'capped at 1 mg');
  assert.equal(calcDose(use('amiodarone', 'vf_ped'), big).amount, 300, 'capped at 300 mg');
  const tiny = medContext(set(makeStore(), { 'patient.age': 0.5, 'vitals.weight': 3 }));
  assert.equal(calcDose(use('atropine', 'brady_ped'), tiny).amount, 0.1, 'atropine minimum 0.1 mg');
  const unknownAge = medContext(makeStore());
  assert.deepEqual(calcDose(use('epinephrine', 'anaphylaxis'), unknownAge).needs, ['vitals.weight']);
  assert.deepEqual(calcDose(use('atropine', 'brady'), unknownAge).needs, ['patient.age']);
});

test('anaphylaxis IM epinephrine 0.01 mg/kg max 0.5 mg (WAO 2020); unverified doses are never invented', () => {
  const a = medContext(set(makeStore(), { 'patient.age': 40, 'vitals.weight': 80 }));
  const r = calcDose(use('epinephrine', 'anaphylaxis'), a);
  assert.equal(r.amount, 0.5); assert.match(r.calc, /capped at maximum 0.5 mg/);
  const asp = calcDose(use('aspirin', 'acs'), a);
  assert.equal(asp.ok, false); assert.equal(asp.unverified, true); assert.match(asp.reason, /No dose verified/);
  const ne = calcDose(use('norepinephrine', 'septic_shock'), a);
  assert.equal(ne.ok, false);
});

test('safety: allergy match is critical; unknown allergy flagged; procainamide avoided in HF; atropine cumulative max', () => {
  const s = set(makeStore(), { 'patient.age': 60, 'allergy.status': 'yes', 'allergy.status.detail': 'Lidocaine — rash' });
  const flags = safetyChecks(DRUG_BY_ID.lidocaine, use('lidocaine', 'vf'), medContext(s), s);
  assert.ok(flags.some((f) => f.level === 'critical' && /allergy/.test(f.text)));
  const u = set(makeStore(), { 'patient.age': 60 });
  assert.ok(safetyChecks(DRUG_BY_ID.adenosine, use('adenosine', 'svt'), medContext(u), u).some((f) => /Allergy status not documented/.test(f.text)));
  const hf = set(makeStore(), { 'patient.age': 60, 'pmh.heart_failure': 'yes', 'allergy.status': 'none' });
  assert.ok(safetyChecks(DRUG_BY_ID.procainamide, use('procainamide', 'vt_stable'), medContext(hf), hf).some((f) => f.level === 'critical'));
  const at = set(makeStore(), { 'patient.age': 60, 'allergy.status': 'none' });
  for (let i = 0; i < 3; i += 1) at.addEvent({ type: 'medication', text: 'Atropine 1 mg IV bolus given.', data: { drug: 'atropine', use: 'brady', amount: 1, unit: 'mg' } });
  assert.equal(administered(at, 'atropine').length, 3);
  assert.ok(safetyChecks(DRUG_BY_ID.atropine, use('atropine', 'brady'), medContext(at), at).some((f) => f.level === 'critical' && /Maximum total 3 mg/.test(f.text)));
});

test('context suggestions: bradycardia -> atropine (adult only); anaphylaxis considered -> IM epinephrine', () => {
  const s = set(makeStore(), { 'patient.age': 70, 'vitals.hr': 38 }); s.addComplaint('syncope');
  const ids = suggestMeds(pack, s).map((x) => `${x.drug.id}:${x.use.id}`);
  assert.ok(ids.includes('atropine:brady')); assert.ok(!ids.includes('atropine:brady_ped'));
  const k = set(makeStore(), { 'patient.age': 5, 'vitals.hr': 45 }); k.addComplaint('syncope');
  const kid = suggestMeds(pack, k).map((x) => `${x.drug.id}:${x.use.id}`);
  assert.ok(kid.includes('atropine:brady_ped')); assert.ok(!kid.includes('atropine:brady'));
  const a = set(makeStore(), { 'patient.age': 30 }); a.addComplaint('dyspnea');
  a.setFact('dx.consider.anaphylaxis', 'Anaphylaxis / airway compromise', { origin: 'ai_confirmed' });
  assert.ok(suggestMeds(pack, a).some((x) => x.drug.id === 'epinephrine' && x.use.id === 'anaphylaxis'));
});

test('recorded medication appears in the treatment section of the note', () => {
  const s = set(makeStore(), { 'patient.age': 60, 'patient.sex': 'male' }); s.addComplaint('palpitations');
  s.addEvent({ type: 'medication', text: 'Adenosine 6 mg rapid IV push given (regular narrow-complex tachycardia (svt)).', data: { drug: 'adenosine', amount: 6, unit: 'mg' } });
  assert.match(copyText(s, pack, 'treatment', { tz: 'UTC' }), /Adenosine 6 mg/);
});

test('calculators: Cockcroft-Gault, anion gap, QTc', () => {
  assert.equal(crcl({ age: 60, weightKg: 70, sex: 'male', creatinineUmol: 88.4 }), 77.8);
  assert.equal(crcl({ age: 60, weightKg: 70, sex: 'female', creatinineUmol: 88.4 }), 66.1);
  assert.equal(crcl({ age: 60, weightKg: 70, sex: 'male' }), null);
  assert.equal(anionGap({ na: 140, cl: 104, hco3: 24 }), 12);
  assert.equal(qtcBazett({ qtMs: 400, hr: 60 }), 400);
});
