import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { pack, makeStore } from './helpers.mjs';
import { PACKS, decodePack, buildIndex, search, counts, addPick, picks, icdDisplay } from '../src/core/vocab.js';
import { buildSections } from '../src/core/documentation.js';
import { icdText } from '../src/core/outputs.js';
import { safetyChecks, medContext } from '../src/core/meds.js';
import { DRUG_BY_ID } from '../src/content/drugs.js';
import { EXAM, EXAM_COUNT } from '../src/content/exam.js';
import { FACTS } from '../src/content/facts.js';

const raw = Object.fromEntries(PACKS.map((p) => [p, decodePack(fs.readFileSync(new URL(`../data/vocab/${p}.json.gz`, import.meta.url)))]));
const index = buildIndex(raw);
const sec = (s, id) => buildSections(s, pack).find((x) => x.id === id).lines;

test('tens of thousands of searchable terms, each with its source and version', () => {
  const c = counts(index);
  assert.ok(c.symptom > 18000, `HPO ${c.symptom}`);
  assert.ok(c.pmh > 70000, `ICD-10-CM ${c.pmh}`);
  assert.ok(c.drug > 20000, `RxNorm ${c.drug}`);
  assert.ok(c.imaging + c.procedure > 75000, `ICD-10-PCS ${c.imaging + c.procedure}`);
  assert.ok(c.total > 190000, `total ${c.total}`);
  assert.equal(index.hpoMeta.release, '2026-09-01');
  assert.match(index.icdMeta.release, /ICD-10-CM FY2026/);
  assert.ok(EXAM_COUNT > 300);
});

test('search: synonyms, international drug names, codes, ranking', () => {
  assert.equal(search(index, 'symptom', 'chest pain')[0].label, 'Chest pain');
  assert.equal(search(index, 'symptom', 'shortness of breath')[0].label, 'Dyspnea');
  assert.equal(search(index, 'drug', 'paracetamol')[0].label, 'acetaminophen');
  assert.equal(search(index, 'drug', 'salbutamol')[0].label, 'albuterol');
  assert.equal(search(index, 'dx', 'I21.4')[0].code, 'I21.4');
  assert.ok(search(index, 'dx', 'stemi anterior').some((e) => e.code.startsWith('I21.0')));
  assert.ok(search(index, 'imaging', 'computerized tomography chest').length > 0);
  assert.ok(search(index, 'procedure', 'endotracheal airway trachea').length > 0);
  assert.ok(search(index, 'lab', 'troponin').length > 0);
  assert.equal(icdDisplay('I214'), 'I21.4');
});

test('drug reference data: pharmacologic class, may-treat and contraindications (MED-RT), never a dose', () => {
  const amio = search(index, 'drug', 'amiodarone').find((e) => e.label === 'amiodarone');
  assert.ok(amio.classes.includes('Antiarrhythmic'));
  assert.ok(amio.treats.length > 0 && amio.ci.length > 0);
  assert.equal(amio.dose, undefined);
});

test('picks are documented in the right sections, once', () => {
  const s = makeStore();
  s.addComplaint('chest_pain');
  addPick(s, 'symptom', search(index, 'symptom', 'palpitations')[0], 'present');
  addPick(s, 'symptom', search(index, 'symptom', 'hemoptysis')[0], 'absent');
  addPick(s, 'pmh', search(index, 'pmh', 'essential (primary) hypertension')[0], 'yes');
  addPick(s, 'med', search(index, 'med', 'metformin')[0], 'taking');
  addPick(s, 'sign', search(index, 'sign', 'hepatomegaly')[0], 'present');
  addPick(s, 'imaging', search(index, 'imaging', 'computerized tomography chest')[0], 'requested');
  addPick(s, 'dx', search(index, 'dx', 'I21.4')[0], 'selected');
  assert.match(sec(s, 'hpi').join(' '), /Also reports palpitations\..*Denies hemoptysis\./);
  assert.match(sec(s, 'history').join(' '), /Past medical history: essential \(primary\) hypertension/);
  assert.match(sec(s, 'history').join(' '), /Current medications: metformin/);
  assert.match(sec(s, 'exam').join(' '), /Other findings: hepatomegaly/);
  assert.match(sec(s, 'investigations').join(' '), /Computerized Tomography/);
  assert.match(sec(s, 'assessment').join(' '), /\(I21\.4\)/);
  assert.match(icdText(s, pack), /I21\.4 — /);
  assert.equal(picks(s, 'symptom').length, 2);
});

test('an allergy picked from RxNorm is checked against medications', () => {
  const s = makeStore();
  s.setFact('patient.age', 60);
  addPick(s, 'allergy', search(index, 'allergy', 'adenosine')[0], 'yes');
  const flags = safetyChecks(DRUG_BY_ID.adenosine, DRUG_BY_ID.adenosine.uses[0], medContext(s), s);
  assert.ok(flags.some((f) => f.level === 'critical'));
});

test('exam templates: normal and abnormal in a group exclude each other; score inputs reuse their fact key', () => {
  for (const sys of EXAM) for (const g of sys.groups) {
    if (g.fact) { assert.ok(FACTS[g.fact]); continue; }
    const [normal, ...abn] = g.options;
    assert.ok(normal.normal);
    for (const a of abn) { assert.ok(a.excludes.includes(normal.fact)); assert.ok(normal.excludes.includes(a.fact)); }
  }
  const keys = EXAM.flatMap((s) => s.groups.flatMap((g) => g.options.map((o) => o.fact)));
  for (const k of ['exam.rlq_tenderness', 'exam.rebound', 'exam.new_confusion', 'exam.dvt_signs', 'exam.resp.wheeze']) assert.ok(keys.includes(k), k);
});
