import test from 'node:test';
import assert from 'node:assert/strict';
import { makeStore } from './helpers.mjs';
import { Persistence, MemoryAdapter, attachAutosave, BACKUP_FORMAT } from '../src/core/persistence.js';

const mk = () => new Persistence(new MemoryAdapter(), { clock: (() => { let t = 1; return () => (t += 1); })() });

test('save, reload last case, list', async () => {
  const p = mk();
  const s = makeStore();
  s.setFact('patient.age', 44); s.addComplaint('headache');
  await p.saveCase(s.state);
  const last = await p.loadLast();
  assert.equal(last.id, s.state.id);
  assert.equal(last.facts['patient.age'].value, 44);
  const list = await p.listCases();
  assert.equal(list.length, 1);
  assert.deepEqual(list[0].complaints, ['headache']);
});

test('autosave writes after changes and flush saves immediately', async () => {
  const p = mk();
  const s = makeStore();
  const auto = attachAutosave(s, p, { delay: 20 });
  s.setFact('vitals.hr', 77);
  await auto.flush();
  assert.equal((await p.loadCase(s.state.id)).facts['vitals.hr'].value, 77);
  s.setFact('vitals.rr', 16);
  await new Promise((r) => setTimeout(r, 60));
  assert.equal((await p.loadCase(s.state.id)).facts['vitals.rr'].value, 16);
  auto.stop();
});

test('autosave keeps the data dirty when a save fails', async () => {
  const a = new MemoryAdapter();
  const p = new Persistence(a);
  const s = makeStore();
  let errors = 0;
  const auto = attachAutosave(s, p, { delay: 5, onError: () => { errors += 1; } });
  const real = a.put.bind(a);
  a.put = async () => { throw new Error('disk full'); };
  s.setFact('vitals.hr', 80);
  await auto.flush();
  assert.equal(errors, 1);
  a.put = real;
  await auto.flush();
  assert.equal((await p.loadCase(s.state.id)).facts['vitals.hr'].value, 80);
  auto.stop();
});

test('backup export contains version metadata; import never overwrites', async () => {
  const p = mk();
  const s = makeStore();
  s.setFact('patient.age', 30);
  await p.saveCase(s.state);
  const backup = await p.exportBackup('content-1');
  assert.equal(backup.format, BACKUP_FORMAT);
  assert.equal(backup.contentVersion, 'content-1');
  assert.ok(backup.appVersion && backup.exportedAt);

  s.correctFact('patient.age', 31, 'typo');
  await p.saveCase(s.state);
  const r = await p.importBackup(backup);
  assert.deepEqual(r, { added: 1, copies: 1 });
  const list = await p.listCases();
  assert.equal(list.length, 2);
  assert.equal((await p.loadCase(s.state.id)).facts['patient.age'].value, 31); // original untouched
});

test('importing something else is refused with a clear message', async () => {
  const p = mk();
  await assert.rejects(p.importBackup({ hello: 1 }), /not a Clinical Copilot backup/);
  await assert.rejects(p.importBackup(null), /not a Clinical Copilot backup/);
});

test('deleting the last case clears the pointer', async () => {
  const p = mk();
  const s = makeStore();
  await p.saveCase(s.state);
  await p.deleteCase(s.state.id);
  assert.equal(await p.loadLast(), null);
});

import { buildDemoStore } from '../src/core/demo.js';
import { pack } from './helpers.mjs';
import { renderCompleteCase } from '../src/core/documentation.js';
import { deriveAlerts } from '../src/core/alerts.js';

test('DEMO case is labelled DEMO everywhere and demonstrates a correction', () => {
  const s = buildDemoStore({ clock: (() => { let t = 1760000000000; return () => (t += 1000); })() });
  assert.equal(s.state.demo, true);
  const text = renderCompleteCase(s, pack, { tz: 'UTC' });
  assert.match(text, /DEMO CASE — NOT A REAL PATIENT/);
  assert.match(text, /BP 120\/80 mmHg/);
  assert.match(text, /Systolic BP 90 recorded earlier was corrected/);
  assert.ok(!deriveAlerts(s.snapshotValues()).some((a) => a.id === 'hypotension'));
});
