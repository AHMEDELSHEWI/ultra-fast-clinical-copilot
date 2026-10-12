import test from 'node:test';
import assert from 'node:assert/strict';
import { makeStore } from './helpers.mjs';
import { deriveAlerts } from '../src/core/alerts.js';

test('enter once, read everywhere: one source of truth for weight', () => {
  const s = makeStore();
  s.setFact('vitals.weight', 72, { origin: 'measurement' });
  assert.equal(s.getFact('vitals.weight'), 72);
  assert.equal(s.snapshotValues()['vitals.weight'], 72);
});

test('different value on an existing fact is a conflict, never silently replaced', () => {
  const s = makeStore();
  s.setFact('vitals.hr', 80, { origin: 'measurement' });
  const r = s.setFact('vitals.hr', 95, { origin: 'measurement' });
  assert.equal(r.ok, false);
  assert.equal(r.conflict.previous, 80);
  assert.equal(r.conflict.incoming, 95);
  assert.equal(s.getFact('vitals.hr'), 80);
});

test('same value again is a harmless no-op', () => {
  const s = makeStore();
  s.setFact('vitals.hr', 80);
  assert.equal(s.setFact('vitals.hr', 80).unchanged, true);
  assert.equal(s.getFactRecord('vitals.hr').history.length, 0);
});

test('correction keeps the old value in history with a reason and audit entry', () => {
  const s = makeStore();
  s.setFact('vitals.sbp', 90, { origin: 'measurement' });
  s.correctFact('vitals.sbp', 120, 'Equipment error');
  const rec = s.getFactRecord('vitals.sbp');
  assert.equal(rec.value, 120);
  assert.equal(rec.history.length, 1);
  assert.equal(rec.history[0].value, 90);
  assert.equal(rec.history[0].status, 'corrected');
  assert.equal(rec.history[0].reason, 'Equipment error');
  assert.ok(s.state.audit.some((a) => a.action === 'correct' && a.previous === 90 && a.next === 120));
});

test('correction requires a reason', () => {
  const s = makeStore();
  s.setFact('vitals.sbp', 90);
  assert.throws(() => s.correctFact('vitals.sbp', 120, '  '), /reason/i);
});

test('ACCEPTANCE: hypotension alert disappears once the reading is corrected', () => {
  const s = makeStore();
  s.setFact('patient.age', 55);
  s.setFact('vitals.sbp', 85, { origin: 'measurement' });
  s.setFact('vitals.dbp', 50, { origin: 'measurement' });
  s.setFact('vitals.hr', 110, { origin: 'measurement' });
  let ids = deriveAlerts(s.snapshotValues()).map((a) => a.id);
  assert.ok(ids.includes('hypotension'));
  assert.ok(ids.includes('low-map'));

  s.correctFact('vitals.sbp', 120, 'Cuff fault');
  s.correctFact('vitals.dbp', 80, 'Cuff fault');
  ids = deriveAlerts(s.snapshotValues()).map((a) => a.id);
  assert.ok(!ids.includes('hypotension'));
  assert.ok(!ids.includes('low-map'));
});

test('ACCEPTANCE: removed reading no longer drives alerts or values', () => {
  const s = makeStore();
  s.setFact('patient.age', 55);
  s.setFact('vitals.sbp', 80);
  s.setFact('vitals.dbp', 50);
  s.removeFact('vitals.sbp', 'Wrong patient');
  assert.equal(s.getFact('vitals.sbp'), undefined);
  assert.ok(!deriveAlerts(s.snapshotValues()).some((a) => a.id === 'hypotension'));
  assert.equal(s.getFactRecord('vitals.sbp').history[0].value, 80);
});

test('adult thresholds are never applied to children or unknown age', () => {
  const kid = makeStore();
  kid.setFact('patient.age', 6);
  kid.setFact('vitals.hr', 130);
  kid.setFact('vitals.sbp', 85);
  let ids = deriveAlerts(kid.snapshotValues()).map((a) => a.id);
  assert.ok(ids.includes('paediatric'));
  assert.ok(!ids.includes('tachycardia') && !ids.includes('hypotension'));

  const unk = makeStore();
  unk.setFact('vitals.hr', 130);
  ids = deriveAlerts(unk.snapshotValues()).map((a) => a.id);
  assert.deepEqual(ids, ['age-missing']);
});

test('unknown is distinct from not asked', () => {
  const s = makeStore();
  assert.equal(s.isAnswered('allergy.status'), false);
  s.markUnknown('allergy.status');
  assert.equal(s.isAnswered('allergy.status'), true);
  assert.equal(s.isUnknown('allergy.status'), true);
  assert.equal(s.getFact('allergy.status'), undefined);
});

test('mutually exclusive findings raise a conflict; replace / keep-both / cancel', () => {
  const s = makeStore();
  const ex = ['exam.resp.wheeze'];
  s.setFact('exam.resp.normal', 'present', { excludes: ['exam.resp.wheeze', 'exam.resp.crackles'] });
  const r = s.setFact('exam.resp.wheeze', 'present', { excludes: ['exam.resp.normal'] });
  assert.equal(r.ok, false);
  assert.equal(r.conflict.with, 'exam.resp.normal');
  assert.equal(s.getFact('exam.resp.wheeze'), undefined); // cancel = nothing changed

  // keep both requires an explanation
  assert.throws(() => s.setFact('exam.resp.wheeze', 'present', { excludes: ['exam.resp.normal'], keepBoth: true }), /explanation/i);
  s.setFact('exam.resp.wheeze', 'present', { excludes: ['exam.resp.normal'], keepBoth: true, reason: 'Clear on right, wheeze on left' });
  assert.equal(s.getFact('exam.resp.normal'), 'present');
  assert.equal(s.getFactRecord('exam.resp.wheeze').note, 'Clear on right, wheeze on left');
  void ex;
});

test('replace removes the conflicting finding but keeps it in history', () => {
  const s = makeStore();
  s.setFact('exam.resp.normal', 'present');
  s.setFact('exam.resp.wheeze', 'present', { excludes: ['exam.resp.normal'], replace: true });
  assert.equal(s.getFact('exam.resp.normal'), undefined);
  assert.equal(s.getFact('exam.resp.wheeze'), 'present');
  assert.equal(s.getFactRecord('exam.resp.normal').history[0].status, 'removed');
});

test('AI suggestions are not facts until the clinician accepts them', () => {
  const s = makeStore();
  s.suggest('assessment.diagnosis', 'Possible ACS', 'AI');
  assert.equal(s.getFact('assessment.diagnosis'), undefined);
  s.acceptSuggestion('assessment.diagnosis');
  assert.equal(s.getFact('assessment.diagnosis'), 'Possible ACS');
  assert.equal(s.getFactRecord('assessment.diagnosis').origin, 'ai_confirmed');
  s.suggest('x', 1);
  s.rejectSuggestion('x', 'Not relevant');
  assert.equal(s.state.suggestions.x, undefined);
});

test('multiple complaints stay in ONE connected case', () => {
  const s = makeStore();
  s.addComplaint('chest_pain');
  s.addComplaint('dyspnea');
  s.addComplaint('chest_pain');
  assert.deepEqual(s.activeComplaints(), ['chest_pain', 'dyspnea']);
  assert.equal(s.state.complaints.length, 2);
});

test('timeline: auto timestamps, corrections keep the original time', () => {
  const s = makeStore();
  const ev = s.addEvent({ type: 'treatment', text: 'Aspirin given' });
  const original = ev.at;
  s.correctEventTime(ev.id, original - 300000, 'Entered late');
  const e = s.timeline()[0];
  assert.equal(e.at, original - 300000);
  assert.equal(e.corrections[0].from, original);
  assert.throws(() => s.correctEventTime(ev.id, 1, ''), /reason/i);
});

test('versions: draft/updated/final, restore does not lose work', () => {
  const s = makeStore();
  s.setFact('patient.age', 40);
  const v1 = s.saveVersion('draft');
  s.setFact('vitals.hr', 70);
  s.restoreVersion(v1);
  assert.equal(s.getFact('vitals.hr'), undefined);
  assert.equal(s.getFact('patient.age'), 40);
  assert.ok(s.state.versions.some((v) => v.label === 'Before restore'));
  const saved = s.state.versions.find((v) => v.label === 'Before restore');
  assert.equal(saved.snapshot.facts['vitals.hr'].value, 70);
});

test('finalized case is read-only until reopened with a reason', () => {
  const s = makeStore();
  s.setFact('patient.age', 40);
  s.finalize();
  assert.throws(() => s.setFact('vitals.hr', 70), /finalized/i);
  assert.throws(() => s.reopen(''), /reason/i);
  s.reopen('Late result');
  s.setFact('vitals.hr', 70);
  assert.equal(s.getFact('vitals.hr'), 70);
});

test('audit trail records who, what, when, previous and new value', () => {
  const s = makeStore();
  s.setFact('vitals.hr', 80);
  s.correctFact('vitals.hr', 82, 'Re-measured');
  const a = s.state.audit.at(-1);
  assert.equal(a.by, 'clinician');
  assert.equal(a.action, 'correct');
  assert.equal(a.previous, 80);
  assert.equal(a.next, 82);
  assert.equal(a.reason, 'Re-measured');
  assert.equal(typeof a.at, 'number');
});

test('hypotension threshold: SBP 90 is flagged, 91 is not (decision: "90 or below")', () => {
  for (const [sbp, expected] of [[90, true], [91, false], [89, true]]) {
    const s = makeStore();
    s.setFact('patient.age', 55);
    s.setFact('vitals.sbp', sbp);
    s.setFact('vitals.dbp', 60);
    const flagged = deriveAlerts(s.snapshotValues()).some((a) => a.id === 'hypotension');
    assert.equal(flagged, expected, `SBP ${sbp}`);
  }
});
