import test from 'node:test';
import assert from 'node:assert/strict';
import { makeStore, pack } from './helpers.mjs';
import { nextQuestion, applicableQuestions, missingInformation, evalCondition, progress, buildIndex } from '../src/core/questions.js';

test('no complaint => no question yet', () => {
  assert.equal(nextQuestion(pack, makeStore()), null);
});

test('red flags and safety questions come before routine ones', () => {
  const s = makeStore();
  s.addComplaint('headache');
  const first = nextQuestion(pack, s);
  assert.equal(first.redFlag, true);
});

test('a fact is asked once even when several complaints need it', () => {
  const s = makeStore();
  s.addComplaint('chest_pain');
  s.addComplaint('dyspnea');
  const facts = applicableQuestions(pack, s).map(({ q }) => q.fact);
  assert.equal(new Set(facts).size, facts.length);
  s.setFact('sx.diaphoresis', 'yes');
  assert.ok(!applicableQuestions(pack, s).filter(({ q }) => !s.isAnswered(q.fact)).some(({ q }) => q.fact === 'sx.diaphoresis'));
});

test('pregnancy question appears only for females aged 12-55', () => {
  const ask = (age, sex) => {
    const s = makeStore();
    s.setFact('patient.age', age); s.setFact('patient.sex', sex); s.addComplaint('abdominal_pain');
    return applicableQuestions(pack, s).some(({ q }) => q.fact === 'preg.status');
  };
  assert.equal(ask(30, 'female'), true);
  assert.equal(ask(30, 'male'), false);
  assert.equal(ask(8, 'female'), false);
  assert.equal(ask(60, 'female'), false);
});

test('pregnancy is a high-priority question for a woman of child-bearing age', () => {
  const s = makeStore();
  s.setFact('patient.age', 30); s.setFact('patient.sex', 'female'); s.addComplaint('abdominal_pain');
  assert.equal(nextQuestion(pack, s).fact, 'preg.status');
});

test('answering advances the flow and the pathway eventually completes', () => {
  const s = makeStore();
  s.setFact('patient.age', 55); s.setFact('patient.sex', 'male');
  s.addComplaint('chest_pain');
  let guard = 0;
  let q;
  while ((q = nextQuestion(pack, s)) && guard++ < 100) {
    if (q.type === 'yesno') s.setFact(q.fact, 'no');
    else if (q.type === 'choice') s.setFact(q.fact, q.options[0].v);
    else if (q.type === 'scale') s.setFact(q.fact, 5);
    else s.setFact(q.fact, { n: 30, unit: 'min' });
  }
  assert.ok(guard < 100);
  const p = progress(pack, s);
  assert.equal(p.done, p.total);
});

test('marking unknown also advances the flow', () => {
  const s = makeStore();
  s.addComplaint('dyspnea');
  const q = nextQuestion(pack, s);
  s.markUnknown(q.fact);
  assert.notEqual(nextQuestion(pack, s)?.fact, q.fact);
});

test('missing-information engine reports what changes safety, with a reason', () => {
  const s = makeStore();
  let m = missingInformation(pack, s);
  assert.ok(m.some((i) => i.key === 'patient.age'));
  assert.ok(m.some((i) => i.key === 'complaint'));
  s.setFact('patient.age', 55); s.setFact('patient.sex', 'male'); s.addComplaint('chest_pain');
  m = missingInformation(pack, s);
  assert.ok(m.some((i) => i.key === 'meds.anticoagulant' && i.status === 'MISSING' && i.why));
  assert.ok(m.some((i) => i.key === 'vitals.bp'));
  s.setFact('meds.anticoagulant', 'no'); s.markUnknown('allergy.status');
  m = missingInformation(pack, s);
  assert.ok(!m.some((i) => i.key === 'meds.anticoagulant'));
  assert.ok(m.some((i) => i.key === 'allergy.status' && i.status === 'UNKNOWN'));
});

test('condition evaluator', () => {
  const v = { a: 5, b: 'x' };
  assert.equal(evalCondition({ fact: 'a', gte: 5 }, v), true);
  assert.equal(evalCondition({ fact: 'a', lte: 4 }, v), false);
  assert.equal(evalCondition({ any: [{ fact: 'b', eq: 'y' }, { fact: 'a', eq: 5 }] }, v), true);
  assert.equal(evalCondition({ fact: 'zzz', gte: 1 }, v), false);
  assert.equal(evalCondition(undefined, v), true);
});

test('content pack integrity: ids unique, options valid, complaints referenced, no drug doses', () => {
  const ids = pack.questions.map((q) => q.id);
  assert.equal(new Set(ids).size, ids.length);
  const { complaintsByKey } = buildIndex(pack);
  for (const q of pack.questions) {
    assert.ok(q.prompt.en && q.prompt.ar, `${q.id} bilingual prompt`);
    for (const c of q.complaints) assert.ok(c === 'all' || complaintsByKey.has(c), `${q.id} -> ${c}`);
    if (q.type === 'choice') {
      assert.ok(q.options.length >= 2, q.id);
      const vs = q.options.map((o) => o.v);
      assert.equal(new Set(vs).size, vs.length);
      for (const o of q.options) assert.ok(o.en && o.ar && o.doc, `${q.id}:${o.v}`);
    }
    if (q.type === 'yesno') assert.ok(q.noun, q.id);
  }
  for (const c of pack.complaints) assert.ok(c.label.en && c.label.ar && c.noun);
  assert.ok(!/\b\d+\s?(mg|mcg|ml|units?)\b/i.test(JSON.stringify(pack)), 'pack must not contain drug doses');
  assert.match(pack.reviewStatus, /pending/i);
});

import { documentationCheck } from '../src/core/checks.js';

test('documentation check: empty case is not ready and says why', () => {
  const r = documentationCheck(makeStore(), pack);
  assert.equal(r.ready, false);
  assert.ok(r.issues.some((i) => i.level === 'error' && /complaint/i.test(i.text)));
  assert.ok(r.issues.some((i) => i.level === 'error' && /Age/.test(i.text)));
});

test('documentation check: minimum data = ready, with warnings for what is still missing', () => {
  const s = makeStore();
  s.setFact('patient.age', 55); s.setFact('patient.sex', 'male'); s.addComplaint('chest_pain');
  const r = documentationCheck(s, pack);
  assert.equal(r.ready, true);
  assert.ok(r.issues.some((i) => i.level === 'warn' && /vital/i.test(i.text)));
  assert.ok(r.issues.some((i) => i.level === 'warn' && /disposition/i.test(i.text)));
});

test('documentation check: active danger alert and kept conflicts are surfaced', () => {
  const s = makeStore();
  s.setFact('patient.age', 55); s.setFact('patient.sex', 'male'); s.addComplaint('chest_pain');
  s.setFact('vitals.sbp', 80); s.setFact('vitals.dbp', 50);
  s.setFact('exam.resp.normal', 'present');
  s.setFact('exam.resp.wheeze', 'present', { excludes: ['exam.resp.normal'], keepBoth: true, reason: 'sides differ' });
  const r = documentationCheck(s, pack);
  assert.ok(r.issues.some((i) => i.level === 'info' && /Hypotension/.test(i.text)));
  assert.ok(r.issues.some((i) => i.level === 'info' && /sides differ/.test(i.text)));
});
