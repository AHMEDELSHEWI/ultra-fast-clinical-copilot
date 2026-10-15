// Case-level glue between the store and the deterministic engines (scores, investigations).
// Builds ONE values map from the current authoritative facts so every engine sees the same data.
import { memo } from './memo.js';
import { reason, reasoningValues } from './reasoning.js';
import { makeCtx, evaluateScore } from './scoreEngine.js';
import { SCORES, SCORE_BY_ID } from '../content/scores.js';
import { FACTS } from '../content/facts.js';
import { LIMITS, UNITS } from './vitals.js';

/** A complaint is itself evidence of its cardinal symptom (enter once): vomiting complaint => vomiting = yes. */
const COMPLAINT_IMPLIES = Object.freeze({
  vomiting: 'sx.vomiting', syncope: 'sx.syncope', fever: 'sx.fever', dyspnea: 'sx.dyspnea', palpitations: 'sx.palpitations',
});

export function caseValues(store) {
  const values = reasoningValues(store);
  for (const [c, key] of Object.entries(COMPLAINT_IMPLIES)) {
    if (values[`complaint.${c}`] && values[key] === undefined) values[key] = 'yes';
  }
  return values;
}

/** Valid readings of a measurement: the current value plus repeat readings (corrected/removed values excluded). */
export function readingsOf(store, key) {
  const f = store.state.facts[key];
  if (!f) return [];
  const out = f.history.filter((h) => h.status === 'replaced' && typeof h.value === 'number').map((h) => h.value);
  if (f.status === 'active' && typeof f.value === 'number') out.push(f.value);
  return out;
}

export function scoreCtx(store) {
  const unknown = new Set(Object.values(store.state.facts).filter((f) => f.status === 'unknown').map((f) => f.key));
  return makeCtx(caseValues(store), { unknown, readings: (k) => readingsOf(store, k) });
}

/** NEWS2 is relevant for every adult case once a complaint exists (deterioration screening). */
const UNIVERSAL = [{ id: 'news2', why: 'Early warning score: tracks deterioration in any adult presentation.' }];

/** Relevant scores for this case, each evaluated now. */
export function relevantScores(pack, store) { return memo(store, 'relevantScores', () => relevantScores_(pack, store)); }
function relevantScores_(pack, store) {
  if (store.activeComplaints().length === 0) return [];
  const ctx = scoreCtx(store);
  const r = reason(pack, store, ctx.values);
  const list = [...r.scores];
  for (const u of UNIVERSAL) if (!list.some((s) => s.id === u.id)) list.push(u);
  return list.filter((s) => SCORE_BY_ID[s.id]).map((s) => ({ ...s, result: evaluateScore(SCORE_BY_ID[s.id], ctx) }))
    .filter((s) => s.result.applicable || s.result.reason); // keep not-applicable with its reason (transparency)
}

/** Evaluate one score by id against the current case (used by the calculator library too). */
export function evaluateById(store, id) { return memo(store, `score:${id}`, () => evaluateById_(store, id)); }
function evaluateById_(store, id) {
  const def = SCORE_BY_ID[id];
  return def ? evaluateScore(def, scoreCtx(store)) : null;
}

export const ALL_SCORES = SCORES;

// ---------- asking for a missing input ----------
const VITAL_PROMPTS = {
  'vitals.hr': ['Heart rate?', 'النبض؟'], 'vitals.rr': ['Respiratory rate?', 'معدل التنفس؟'], 'vitals.spo2': ['SpO2?', 'تشبع الأكسجين؟'],
  'vitals.temp': ['Temperature?', 'الحرارة؟'], 'vitals.sbp': ['Systolic blood pressure?', 'الضغط الانقباضي؟'], 'vitals.dbp': ['Diastolic blood pressure?', 'الضغط الانبساطي؟'],
  'vitals.weight': ['Weight?', 'الوزن؟'], 'vitals.height': ['Height?', 'الطول؟'],
};

/**
 * Describe how to ask for a fact, wherever it is defined.
 * kind: 'pack' (an interview question), 'fact' (shared fact), 'vital' (number), 'gcs' | 'o2' | 'patient' (go to that screen).
 */
export function askSpec(pack, key) {
  const q = pack.questions.find((x) => x.fact === key);
  if (q) return { kind: 'pack', key, question: q };
  if (FACTS[key]) return { kind: 'fact', key, def: FACTS[key] };
  if (VITAL_PROMPTS[key]) {
    const k = key.split('.')[1];
    return { kind: 'vital', key, def: { type: 'number', prompt: { en: VITAL_PROMPTS[key][0], ar: VITAL_PROMPTS[key][1] }, unit: UNITS[k], limits: LIMITS[k], section: 'vitals' } };
  }
  if (key.startsWith('gcs.')) return { kind: 'gcs', key };
  if (key === 'vitals.o2device') return { kind: 'o2', key };
  if (key.startsWith('patient.')) return { kind: 'patient', key };
  return { kind: 'unknown', key };
}

/** The single next input needed to complete a given score (or null). */
export function nextScoreInput(pack, store, scoreId) {
  const res = evaluateById(store, scoreId);
  if (!res || res.complete || !res.applicable) return null;
  const key = res.missing.find((k) => !store.isUnknown(k));
  return key ? askSpec(pack, key) : null;
}

/**
 * History-type inputs (pmh, meds, social, family, symptoms) still needed by relevant scores.
 * The interview asks these after the complaint questions, so scores complete without opening a calculator.
 */
export function pendingHistoryInputs(pack, store) {
  const out = [];
  const seen = new Set();
  for (const s of relevantScores(pack, store)) {
    if (s.result.complete || !s.result.applicable) continue;
    for (const key of s.result.missing) {
      if (seen.has(key) || store.isAnswered(key)) continue;
      const spec = askSpec(pack, key);
      const section = spec.kind === 'fact' ? spec.def.section : spec.kind === 'pack' ? 'pack' : null;
      if (section && ['pmh', 'meds', 'social', 'family', 'sx', 'pack'].includes(section)) { seen.add(key); out.push({ ...spec, forScore: s.id }); }
    }
  }
  return out;
}
