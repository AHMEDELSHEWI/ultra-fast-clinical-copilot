import test from 'node:test';
import assert from 'node:assert/strict';
import { pack, makeStore } from './helpers.mjs';
import { reason, considerKey, citationFor } from '../src/core/reasoning.js';
import { buildSections, renderSection } from '../src/core/documentation.js';
import { nextQuestion, applicableQuestions } from '../src/core/questions.js';

const ids = (r) => r.mustNotMiss.map((d) => d.id);

test('multi-complaint: chest pain + dyspnoea + syncope is ONE case with a combined pathway', () => {
  const s = makeStore();
  s.setFact('patient.age', 55); s.setFact('patient.sex', 'male');
  for (const c of ['chest_pain', 'dyspnea', 'syncope']) s.addComplaint(c);
  const r = reason(pack, s);
  assert.ok(r.clusters.some((c) => c.id === 'r_chest_dyspnea'));
  for (const d of ['acs', 'pe', 'aortic_dissection', 'arrhythmia', 'heart_failure']) assert.ok(ids(r).includes(d), d);
  assert.equal(new Set(ids(r)).size, ids(r).length, 'each diagnosis once');
  assert.ok(r.specialties.includes('Cardiology') && r.specialties.includes('Pulmonology'));
  const pe = r.mustNotMiss.find((d) => d.id === 'pe');
  assert.ok(pe.reasons.length >= 2, 'PE raised by several complaints is merged');
});

test('relevant scores appear only when relevant, adult-only scores respect age', () => {
  const s = makeStore();
  s.addComplaint('chest_pain');
  let r = reason(pack, s);
  assert.equal(r.scores.length, 0, 'age unknown: adult-validated scores hidden');
  assert.match(r.ageNote, /age is documented/);
  s.setFact('patient.age', 55);
  r = reason(pack, s);
  assert.ok(r.scores.some((x) => x.name === 'HEART score'));
  const kid = makeStore(); kid.setFact('patient.age', 9); kid.addComplaint('chest_pain');
  r = reason(pack, kid);
  assert.equal(r.scores.length, 0);
  assert.match(r.ageNote, /under 18/);
});

test('ectopic pregnancy is raised only for females of child-bearing age', () => {
  const f = makeStore(); f.setFact('patient.age', 28); f.setFact('patient.sex', 'female'); f.addComplaint('abdominal_pain');
  assert.ok(ids(reason(pack, f)).includes('ectopic'));
  const m = makeStore(); m.setFact('patient.age', 28); m.setFact('patient.sex', 'male'); m.addComplaint('abdominal_pain');
  assert.ok(!ids(reason(pack, m)).includes('ectopic'));
  const old = makeStore(); old.setFact('patient.age', 70); old.setFact('patient.sex', 'female'); old.addComplaint('abdominal_pain');
  assert.ok(!ids(reason(pack, old)).includes('ectopic'));
});

test('red-flag answers activate extra pathways; resolved complaints stop driving reasoning', () => {
  const s = makeStore(); s.setFact('patient.age', 40); s.addComplaint('back_pain');
  assert.ok(!ids(reason(pack, s)).includes('cauda_equina'));
  s.setFact('sx.bladder_bowel', true);
  assert.ok(ids(reason(pack, s)).includes('cauda_equina'));
  s.resolveComplaint('back_pain');
  s.removeFact('sx.bladder_bowel', 'entered in error');
  assert.equal(reason(pack, s).mustNotMiss.length, 0);
});

test('corrected data no longer drives reasoning', () => {
  const s = makeStore(); s.setFact('patient.age', 40); s.addComplaint('syncope');
  s.setFact('hx.syncope.exertional', true);
  assert.ok(reason(pack, s).clusters.some((c) => c.id === 'r_syncope_highrisk'));
  s.correctFact('hx.syncope.exertional', false, 'Patient clarified: at rest');
  assert.ok(!reason(pack, s).clusters.some((c) => c.id === 'r_syncope_highrisk'));
});

test('shared questions are asked once across complaints', () => {
  const s = makeStore(); s.setFact('patient.age', 55);
  for (const c of ['chest_pain', 'dyspnea', 'syncope', 'palpitations']) s.addComplaint(c);
  const facts = applicableQuestions(pack, s).map(({ q }) => q.fact);
  assert.equal(new Set(facts).size, facts.length);
  assert.ok(nextQuestion(pack, s));
});

test('suggestions never reach the note until the clinician adds them', () => {
  const s = makeStore(); s.setFact('patient.age', 55); s.addComplaint('chest_pain');
  const assessment = () => renderSection(buildSections(s, pack, { tz: 'UTC' }).find((x) => x.id === 'assessment'));
  assert.doesNotMatch(assessment(), /Acute coronary/);
  s.setFact(considerKey('acs'), 'Acute coronary syndrome', { origin: 'ai_confirmed' });
  assert.match(assessment(), /clinician-confirmed\): Acute coronary syndrome/);
  s.removeFact(considerKey('acs'), 'not relevant');
  assert.doesNotMatch(assessment(), /Acute coronary/);
});

test('pack integrity: every cited source exists with PMID/DOI; no doses; every rule id unique', () => {
  const rules = pack.reasoning.rules;
  assert.equal(new Set(rules.map((r) => r.id)).size, rules.length);
  const cited = new Set();
  for (const r of rules) {
    (r.sources ?? []).forEach((x) => cited.add(x));
    for (const d of r.mustNotMiss) d.sources.forEach((x) => cited.add(x));
    for (const sc of r.scores) if (sc.source) cited.add(sc.source);
  }
  for (const id of cited) {
    const src = pack.sources[id];
    assert.ok(src, `unknown source ${id}`);
    assert.ok(src.pmid && /^\d+$/.test(src.pmid), `${id} needs PMID`);
    assert.ok(citationFor(pack, id).includes('PMID'));
  }
  assert.doesNotMatch(JSON.stringify(pack.reasoning), /\b\d+(\.\d+)?\s?(mg|mcg|µg|mL|units?)\b/i);
  const keys = new Set(pack.complaints.map((c) => c.key));
  const factRe = /^complaint\.(.+)$/;
  const walk = (c) => { if (!c) return; if (c.all) c.all.forEach(walk); else if (c.any) c.any.forEach(walk); else { const m = factRe.exec(c.fact); if (m) assert.ok(keys.has(m[1]), `rule references unknown complaint ${m[1]}`); } };
  rules.forEach((r) => walk(r.when));
});
