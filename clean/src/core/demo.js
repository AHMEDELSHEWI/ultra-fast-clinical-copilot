// DEMO case for trying the app. Always labelled DEMO; it can never be mistaken for a real patient.
import { CaseStore, createCase } from './state.js';

export function buildDemoStore({ clock = () => Date.now() } = {}) {
  const store = new CaseStore(createCase({ now: clock(), demo: true }), { clock });
  store.setFact('patient.age', 55);
  store.setFact('patient.sex', 'male');
  store.addComplaint('chest_pain');
  const a = { origin: 'patient' };
  store.setFact('hx.chest_pain.pain', 7, a);
  store.setFact('hx.chest_pain.location', 'central', a);
  store.setFact('hx.chest_pain.character', 'crushing', a);
  store.setFact('hx.chest_pain.radiation', 'left_arm', a);
  store.setFact('hx.chest_pain.onset', 'sudden', a);
  store.setFact('hx.chest_pain.duration', { n: 30, unit: 'min' }, a);
  store.setFact('sx.diaphoresis', 'yes', a);
  store.setFact('sx.nausea', 'yes', a);
  store.setFact('sx.dyspnea', 'no', a);
  store.setFact('pmh.diabetes', 'yes', a);
  store.setFact('pmh.hypertension', 'yes', a);
  // an erroneous first BP, later corrected: shows the correction engine
  store.setFact('vitals.sbp', 90, { origin: 'measurement' });
  store.setFact('vitals.dbp', 60, { origin: 'measurement' });
  store.setFact('vitals.hr', 88, { origin: 'measurement' });
  store.correctFact('vitals.sbp', 120, 'DEMO: cuff error, repeated manually');
  store.correctFact('vitals.dbp', 80, 'DEMO: cuff error, repeated manually');
  return store;
}
