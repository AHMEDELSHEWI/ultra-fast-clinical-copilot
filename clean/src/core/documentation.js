// Documentation engine: turns the structured case into professional plain text.
// Rules enforced here (and tested):
//  * Nothing is invented. Only documented facts appear.
//  * A negative ("denies X") is written only when the question was actually asked and answered "no".
//  * Removed or corrected values never appear in the current note (corrections have their own section).
//  * Empty core sections say "Not documented."

import { calcMap, calcGcs, calcBmi, formatBp } from './vitals.js';
import { FACTS } from '../content/facts.js';
import { relevantScores } from './workup.js';

export const joinList = (items) => {
  const a = items.filter(Boolean);
  if (a.length <= 1) return a.join('');
  return `${a.slice(0, -1).join(', ')} and ${a.at(-1)}`;
};

const cap = (s) => (s ? s[0].toUpperCase() + s.slice(1) : s);
const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;
const UNIT_WORD = { min: 'minute', hour: 'hour', day: 'day', week: 'week' };

export function formatDuration(d) {
  if (!d || typeof d.n !== 'number' || !UNIT_WORD[d.unit]) return null;
  return plural(d.n, UNIT_WORD[d.unit]);
}

export function formatTime(ts, tz) {
  return new Date(ts).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: tz });
}

/** Pain score to an adjective: 1-3 mild, 4-6 moderate, 7-10 severe (common numeric rating bands). */
export function severityWord(score) {
  if (typeof score !== 'number' || score < 1) return null;
  if (score <= 3) return 'mild';
  if (score <= 6) return 'moderate';
  return 'severe';
}

const O2_DOC = { room_air: 'room air', nasal_cannula: 'nasal cannula', face_mask: 'face mask', non_rebreather: 'non-rebreather mask' };
export const O2_OPTIONS = Object.freeze([
  { v: 'room_air', en: 'Room air', ar: 'هواء الغرفة' },
  { v: 'nasal_cannula', en: 'Nasal cannula', ar: 'قنية أنفية' },
  { v: 'face_mask', en: 'Face mask', ar: 'قناع وجه' },
  { v: 'non_rebreather', en: 'Non-rebreather', ar: 'قناع بخزان' },
]);

function optionDoc(q, value) {
  return q.options?.find((o) => o.v === value);
}

/** Shared facts (FACTS) of a section that are NOT already rendered by an interview question. */
function sharedFacts(store, pack, section) {
  const covered = new Set(pack.questions.map((q) => q.fact));
  return Object.entries(FACTS).filter(([k, d]) => d.section === section && !covered.has(k))
    .map(([k, d]) => ({ key: k, def: d, value: store.getFact(k), unknown: store.isUnknown(k) }))
    .filter((x) => x.value !== undefined || x.unknown);
}
const choiceDoc = (def, v) => def.options?.find((o) => o.v === v)?.doc;
const numDoc = (def, v) => `${def.label} ${v}${def.unit === '°' ? '°' : ` ${def.unit}`}`;

// ---------- individual sections ----------
function patientSection(store) {
  const age = store.getFact('patient.age');
  const sex = store.getFact('patient.sex');
  const lines = [];
  if (typeof age === 'number' || sex) {
    const a = typeof age === 'number' ? `${age}-year-old` : '';
    lines.push([a, sex ?? ''].filter(Boolean).join(' ') || '');
  }
  const free = store.getFact('patient.presentation');
  if (free) lines.push(`Presentation as entered: ${free}`);
  return lines.filter(Boolean);
}

function ccSection(store, pack) {
  const nouns = store.activeComplaints().map((k) => pack.complaints.find((c) => c.key === k)?.noun).filter(Boolean);
  return nouns.length ? [cap(joinList(nouns))] : [];
}

function complaintSentence(store, pack, key, { primary, assocItems }) {
  const c = pack.complaints.find((x) => x.key === key);
  if (!c) return null;
  const qs = pack.questions.filter((q) => q.fact.startsWith(`hx.${key}.`));
  const byRole = {};
  for (const q of qs) {
    const val = store.getFact(q.fact);
    if (val === undefined) continue;
    byRole[q.role] = { q, val };
  }
  const pre = [];
  const score = byRole.score?.val;
  const sev = severityWord(score);
  if (sev) pre.push(sev);
  for (const r of ['location', 'character']) {
    const hit = byRole[r];
    if (!hit) continue;
    const o = optionDoc(hit.q, hit.val);
    if (o?.doc) pre.push(o.doc);
  }
  const post = [];
  if (typeof score === 'number') post.push(`rated ${score}/10`);
  if (byRole.onset) { const o = optionDoc(byRole.onset.q, byRole.onset.val); if (o?.doc) post.push(o.doc); }
  if (byRole.duration) { const d = formatDuration(byRole.duration.val); if (d) post.push(`duration ${d}`); }
  if (byRole.radiation) { const o = optionDoc(byRole.radiation.q, byRole.radiation.val); if (o?.doc) post.push(o.doc); }
  if (primary && assocItems.length) post.push(`associated with ${joinList(assocItems)}`);

  let s = `${primary ? 'Patient reports' : 'Patient also reports'} ${[...pre, c.noun].join(' ')}`;
  if (post.length) s += `, ${post.length === 1 ? post[0] : `${post.slice(0, -1).join(', ')} and ${post.at(-1)}`}`;
  return `${s}.`;
}

function hpiSection(store, pack) {
  const active = store.activeComplaints();
  if (!active.length) return [];
  const assoc = [];
  const denied = [];
  const seen = new Set();
  const complaintSymptomFacts = new Set(active.map((k) => `sx.${k}`)); // e.g. sx.dyspnea when dyspnea is itself a complaint
  for (const q of pack.questions) {
    if (q.role !== 'assoc' || seen.has(q.fact)) continue;
    seen.add(q.fact);
    if (complaintSymptomFacts.has(q.fact)) continue;
    const v = store.getFact(q.fact);
    if (v === 'yes') assoc.push(q.noun);
    else if (v === 'no') denied.push(q.noun);
  }
  for (const x of sharedFacts(store, pack, 'sx')) {
    if (x.value === 'yes') assoc.push(x.def.noun); else if (x.value === 'no') denied.push(x.def.noun);
  }
  const lines = [];
  active.forEach((key, i) => {
    const s = complaintSentence(store, pack, key, { primary: i === 0, assocItems: assoc });
    if (s) lines.push(s);
  });
  if (denied.length) lines.push(`Patient denies ${joinList(denied)}.`);
  return [lines.join(' ')];
}

function historySection(store, pack) {
  const lines = [];
  const pmhYes = [];
  const pmhNo = [];
  const seen = new Set();
  for (const q of pack.questions) {
    if (seen.has(q.fact)) continue;
    seen.add(q.fact);
    const v = store.getFact(q.fact);
    const unknown = store.isUnknown(q.fact);
    if (q.role === 'pmh') {
      if (v === 'yes') pmhYes.push(q.noun); else if (v === 'no') pmhNo.push(q.noun);
      else if (unknown) lines.push(`History of ${q.noun}: unknown.`);
    } else if (q.role === 'meds') {
      if (v === 'yes') lines.push(`Takes ${q.noun}.`);
      else if (v === 'no') lines.push(`Not on ${q.noun}.`);
      else if (unknown) lines.push('Anticoagulant / antiplatelet status: unknown.');
    } else if (q.role === 'allergy') {
      if (v !== undefined) {
        const o = optionDoc(q, v);
        const detail = store.getFact(`${q.fact}.detail`);
        lines.push(`${o?.doc ?? ''}${detail ? `: ${detail}` : ''}.`);
      } else if (unknown) lines.push('Drug allergy status: unknown.');
    } else if (q.role === 'preg') {
      if (v !== undefined) lines.push(`${optionDoc(q, v)?.doc ?? ''}.`);
      else if (unknown) lines.push('Pregnancy status: unknown.');
    } else if (q.role === 'social') {
      if (v !== undefined) lines.push(`${optionDoc(q, v)?.doc ?? ''}.`);
      else if (unknown) lines.push('Smoking status: unknown.');
    }
  }
  for (const x of sharedFacts(store, pack, 'pmh')) {
    if (x.value === 'yes') pmhYes.push(x.def.noun); else if (x.value === 'no') pmhNo.push(x.def.noun);
    else lines.push(`History of ${x.def.noun}: unknown.`);
  }
  for (const x of sharedFacts(store, pack, 'family')) {
    lines.push(x.value === 'yes' ? `Family history of ${x.def.noun}.` : x.value === 'no' ? `No family history of ${x.def.noun}.` : `Family history of ${x.def.noun}: unknown.`);
  }
  for (const x of sharedFacts(store, pack, 'meds')) {
    lines.push(x.value === 'yes' ? `Takes ${x.def.noun}.` : x.value === 'no' ? `Not on ${x.def.noun}.` : `Use of ${x.def.noun}: unknown.`);
  }
  for (const x of sharedFacts(store, pack, 'social')) {
    lines.push(x.value === 'yes' ? `${cap(x.def.noun)}.` : x.value === 'no' ? `No ${x.def.noun}.` : `${cap(x.def.noun)}: unknown.`);
  }
  const pmh = [];
  if (pmhYes.length) pmh.push(`Past medical history: ${joinList(pmhYes)}.`);
  if (pmhNo.length) pmh.push(`Patient denies history of ${joinList(pmhNo)}.`);
  return [...pmh, ...lines].filter((l) => l && l !== '.');
}

function vitalsSection(store) {
  const g = (k) => store.getFact(k);
  const parts = [];
  const sbp = g('vitals.sbp');
  const dbp = g('vitals.dbp');
  if (typeof sbp === 'number' && typeof dbp === 'number') {
    const map = calcMap(sbp, dbp);
    parts.push(`BP ${formatBp(sbp, dbp)} (MAP ${map} mmHg)`);
  } else if (typeof sbp === 'number') parts.push(`Systolic BP ${sbp} mmHg (diastolic not documented)`);
  else if (typeof dbp === 'number') parts.push(`Diastolic BP ${dbp} mmHg (systolic not documented)`);
  if (typeof g('vitals.hr') === 'number') parts.push(`HR ${g('vitals.hr')} bpm`);
  if (typeof g('vitals.rr') === 'number') parts.push(`RR ${g('vitals.rr')}/min`);
  if (typeof g('vitals.spo2') === 'number') {
    const dev = O2_DOC[g('vitals.o2device')];
    parts.push(`SpO2 ${g('vitals.spo2')}%${dev ? ` on ${dev}` : ''}`);
  }
  if (typeof g('vitals.temp') === 'number') parts.push(`Temp ${g('vitals.temp').toFixed(1)} °C`);
  if (typeof g('vitals.glucose') === 'number') parts.push(`Capillary glucose ${g('vitals.glucose')} mmol/L`);
  const lines = [];
  if (parts.length) lines.push(`Vital signs: ${parts.join(', ')}.`);
  const gcsAny = ['gcs.e', 'gcs.v', 'gcs.m'].some((k) => g(k) !== undefined);
  if (gcsAny) lines.push(`${calcGcs({ e: g('gcs.e'), v: g('gcs.v'), m: g('gcs.m') }).text.replace(/\.$/, '')}.`);
  const w = g('vitals.weight');
  const h = g('vitals.height');
  const body = [];
  if (typeof w === 'number') body.push(`weight ${w} kg`);
  if (typeof h === 'number') body.push(`height ${h} cm`);
  const bmi = calcBmi(w, h);
  if (bmi !== null) body.push(`BMI ${bmi.toFixed(1)}`);
  if (body.length) lines.push(`${cap(joinList(body))}.`);
  return lines;
}

function examSection(store, pack) {
  const lines = [];
  for (const sys of pack.exam) {
    const found = [];
    for (const f of sys.findings) {
      if (store.getFact(f.fact) === undefined) continue;
      const note = store.getFactRecord(f.fact)?.note;
      found.push(note ? `${f.doc} (clinician note: ${note})` : f.doc);
    }
    if (found.length) lines.push(`${sys.title.en}: ${joinList(found)}.`);
  }
  const pos = []; const neg = [];
  for (const x of sharedFacts(store, pack, 'exam')) {
    if (x.def.type === 'choice') { const d = choiceDoc(x.def, x.value); lines.push(x.unknown ? `${x.def.label}: not assessed.` : `${x.def.label}: ${d}.`); }
    else if (x.value === 'yes') pos.push(x.def.noun); else if (x.value === 'no') neg.push(x.def.noun);
  }
  if (pos.length) lines.push(`${cap(joinList(pos))} noted.`);
  if (neg.length) lines.push(`No ${joinList(neg)}.`);
  return lines;
}

function resultsSection(store, pack) {
  const lab = []; const ecg = [];
  for (const x of sharedFacts(store, pack, 'lab')) {
    if (x.unknown) lab.push(`${x.def.label}: result not available`);
    else if (x.def.type === 'number') lab.push(numDoc(x.def, x.value));
    else lab.push(`${x.def.label} ${choiceDoc(x.def, x.value)}`);
  }
  for (const x of sharedFacts(store, pack, 'ecg')) {
    if (x.unknown) ecg.push(`${x.def.label ?? x.def.noun}: not available`);
    else if (x.def.type === 'number') ecg.push(numDoc(x.def, x.value));
    else if (x.def.type === 'choice') ecg.push(x.key === 'ecg.heart_cat' ? choiceDoc(x.def, x.value) : `${x.def.label.toLowerCase()}: ${choiceDoc(x.def, x.value)}`);
    else ecg.push(x.value === 'yes' ? x.def.noun : `no ${x.def.noun}`);
  }
  const lines = [];
  if (lab.length) lines.push(`Laboratory: ${lab.join('; ')}.`);
  if (ecg.length) lines.push(`ECG: ${ecg.join('; ')}.`);
  return lines;
}

function investigationsSection(store, pack) {
  const req = (pack.investigationCatalog ?? []).filter((c) => store.getFact(`inv.${c.id}`) === 'requested').map((c) => c.doc);
  return req.length ? [`Requested: ${joinList(req)}.`] : [];
}

function scoresSection(store, pack) {
  return relevantScores(pack, store).filter((s) => s.result.complete).map((s) => s.result.text);
}

function judgementLines(store, pack) {
  const out = [];
  for (const x of sharedFacts(store, pack, 'judgement')) {
    if (x.unknown) continue;
    if (x.def.type === 'choice') out.push(`${x.def.label}: ${choiceDoc(x.def, x.value)}.`);
    else out.push(`Clinician judgement — ${x.def.noun}: ${x.value === 'yes' ? 'yes' : 'no'}.`);
  }
  return out;
}

function assessmentSection(store, pack) {
  const lines = [];
  const imp = store.getFact('assessment.impression');
  const dx = store.getFact('assessment.diagnosis');
  if (imp) lines.push(`Clinical impression: ${imp}`);
  if (dx) lines.push(`Working diagnosis (clinician-entered): ${dx}`);
  lines.push(...judgementLines(store, pack));
  const considered = Object.values(store.state.facts)
    .filter((f) => f.key.startsWith('dx.consider.') && f.status === 'active' && typeof f.value === 'string')
    .map((f) => f.value);
  if (considered.length) lines.push(`Diagnoses to exclude / under consideration (clinician-confirmed): ${joinList(considered)}.`);
  return lines;
}

function eventLines(store, type, tz) {
  const types = Array.isArray(type) ? type : [type];
  return store.timeline().filter((e) => !type || types.includes(e.type)).map((e) => `${formatTime(e.at, tz)} ${e.text}`);
}

function dispositionSection(store) {
  const d = store.getFact('disposition.decision');
  return d ? [`Disposition: ${d}`] : [];
}

function correctionsSection(store, tz) {
  const lines = [];
  const LABEL = {
    'vitals.sbp': 'Systolic BP', 'vitals.dbp': 'Diastolic BP', 'vitals.hr': 'Heart rate', 'vitals.rr': 'Respiratory rate',
    'vitals.spo2': 'SpO2', 'vitals.temp': 'Temperature', 'vitals.glucose': 'Capillary glucose', 'vitals.weight': 'Weight',
    'vitals.height': 'Height', 'gcs.e': 'GCS eye score', 'gcs.v': 'GCS verbal score', 'gcs.m': 'GCS motor score',
    'patient.age': 'Age', 'patient.sex': 'Sex',
  };
  for (const f of Object.values(store.state.facts)) {
    if (!LABEL[f.key]) continue; // only values whose correction matters medico-legally
    for (const h of f.history) {
      if (h.status !== 'corrected' && h.status !== 'removed') continue;
      const label = LABEL[f.key] ?? f.key;
      const when = formatTime(h.endedAt, tz);
      const was = typeof h.value === 'object' ? JSON.stringify(h.value) : h.value;
      if (h.status === 'corrected') lines.push(`${label} ${was} recorded earlier was corrected at ${when}${f.status === 'active' ? ` to ${f.value}` : ''}. Reason: ${h.reason}.`);
      else lines.push(`${label} ${was} recorded earlier was removed from current calculations at ${when}.${h.reason ? ` Reason: ${h.reason}.` : ''}`);
    }
  }
  return lines;
}

// ---------- public API ----------
export const SECTION_TITLES = Object.freeze({
  patient: 'PATIENT', cc: 'CHIEF COMPLAINT', hpi: 'HISTORY OF PRESENTING ILLNESS', history: 'RELEVANT HISTORY',
  vitals: 'VITAL SIGNS', exam: 'EXAMINATION', investigations: 'INVESTIGATIONS', results: 'RESULTS', scores: 'CLINICAL SCORES',
  assessment: 'ASSESSMENT', resuscitation: 'RESUSCITATION', treatment: 'TREATMENT GIVEN', reassessment: 'REASSESSMENT',
  disposition: 'DISPOSITION', timeline: 'TIMELINE', corrections: 'DOCUMENTATION CORRECTIONS',
});
const CORE = new Set(['patient', 'cc', 'hpi', 'vitals', 'exam']);

export function buildSections(store, pack, { tz } = {}) {
  const raw = {
    patient: patientSection(store),
    cc: ccSection(store, pack),
    hpi: hpiSection(store, pack),
    history: historySection(store, pack),
    vitals: vitalsSection(store),
    exam: examSection(store, pack),
    investigations: investigationsSection(store, pack),
    results: resultsSection(store, pack),
    scores: scoresSection(store, pack),
    assessment: assessmentSection(store, pack),
    reassessment: eventLines(store, 'reassessment', tz),
    resuscitation: eventLines(store, 'resus', tz),
    treatment: eventLines(store, ['treatment', 'medication'], tz),
    disposition: dispositionSection(store),
    timeline: eventLines(store, null, tz),
    corrections: correctionsSection(store, tz),
  };
  return Object.keys(SECTION_TITLES).map((id) => ({
    id, title: SECTION_TITLES[id], lines: raw[id], empty: raw[id].length === 0, core: CORE.has(id),
  }));
}

export function renderSection(section) {
  const body = section.lines.length ? section.lines.join('\n') : 'Not documented.';
  return `${section.title}\n${body}`;
}

export function renderCompleteCase(store, pack, { tz } = {}) {
  const sections = buildSections(store, pack, { tz }).filter((s) => !s.empty || s.core);
  const head = ['CLINICAL NOTE'];
  if (store.state.demo) head.push('DEMO CASE — NOT A REAL PATIENT');
  const foot = store.state.status === 'final'
    ? 'Status: FINAL'
    : 'Status: DRAFT — generated from clinician-entered data; requires clinician review before use.';
  return `${head.join('\n')}\n\n${sections.map(renderSection).join('\n\n')}\n\n${foot}`;
}
