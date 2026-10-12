// UI shell. Vanilla JS, no framework. All clinical logic lives in ../core (tested without a browser).
import pack from '../content/pack.json';
import { reason, considerKey, citationFor } from '../core/reasoning.js';
import { CaseStore, createCase } from '../core/state.js';
import { Persistence, IndexedDbAdapter, MemoryAdapter, attachAutosave, APP_VERSION } from '../core/persistence.js';
import { nextQuestion, progress, missingInformation, applicableQuestions } from '../core/questions.js';
import { deriveAlerts } from '../core/alerts.js';
import { calcMap, calcShockIndex, calcBmi, calcGcs, validateVital, checkBpPair, GCS_OPTIONS, UNITS } from '../core/vitals.js';
import { buildSections, O2_OPTIONS, formatTime, formatDuration } from '../core/documentation.js';
import { copyText } from '../core/copy.js';
import { documentationCheck } from '../core/checks.js';
import { buildDemoStore } from '../core/demo.js';
import { makeT } from './i18n.js';

// ---------------------------------------------------------------- helpers
const $ = (s, r = document) => r.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const ui = {
  screen: 'home', tab: 'interview', lang: 'en', search: '', editQ: null, pendingText: null, evType: 'treatment',
  intake: { age: '', sex: null, text: '' }, cases: [], lastId: null, custom: { n: '', unit: 'hour' }, storageOk: true,
};
try { ui.lang = localStorage.getItem('ufc-lang') === 'ar' ? 'ar' : 'en'; } catch { /* storage blocked */ }
const t = makeT(() => ui.lang);
const L = (o) => (o ? (ui.lang === 'ar' ? o.ar ?? o.en : o.en) : '');

let store = null;
let persistence = null;
let autosave = null;
let unsub = null;

const STOMACH = '<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M26 6c0 8-8 8-8 18 0 14 6 18 14 18 8 0 12-5 16-5 5 0 8 4 8 10s-5 11-14 11c-14 0-30-8-30-26 0-10 6-14 6-20z" fill="#ffb4a2" stroke="#d9480f" stroke-width="3" stroke-linejoin="round"/></svg>';
const ICONS = { heart: '🫀', lungs: '🫁', brain: '🧠', stomach: STOMACH, shield: '🛡️', syringe: '💉', pregnancy: '🤰', syncope: '😵', thermometer: '🌡️', bone: '🦴' };
const icon = (k) => ICONS[k] ?? '🩺';
const complaintByKey = (k) => pack.complaints.find((c) => c.key === k);
const examFindings = pack.exam.flatMap((s) => s.findings);
const isFinal = () => store?.state.status === 'final';

// ---------------------------------------------------------------- feedback
function toast(msg, err = false) {
  const el = $('#toast');
  el.innerHTML = `<div class="toast ${err ? 'err' : ''}" role="status">${esc(msg)}</div>`;
  clearTimeout(toast.t);
  toast.t = setTimeout(() => { el.innerHTML = ''; }, 2200);
}

/** Modal with optional fields. Resolves { action, values } or null. */
function ask({ title, body = '', fields = [], actions }) {
  return new Promise((resolve) => {
    const host = $('#modal');
    const render = (error = '') => {
      host.innerHTML = `<div class="modal-bg" data-modal-bg><div class="modal" role="dialog" aria-modal="true" aria-label="${esc(title)}">
        <h3>${esc(title)}</h3>${body}
        ${fields.map((f) => `<div class="field"><label for="mf-${f.name}">${esc(f.label)}</label>${f.type === 'textarea'
          ? `<textarea id="mf-${f.name}" name="${f.name}">${esc(f.value ?? '')}</textarea>`
          : `<input id="mf-${f.name}" name="${f.name}" type="${f.type ?? 'text'}" ${f.type === 'number' ? 'step="any" inputmode="decimal"' : ''} value="${esc(f.value ?? '')}">`}</div>`).join('')}
        ${error ? `<div class="alert danger" role="alert">${esc(error)}</div>` : ''}
        <div class="stack">${actions.map((a) => `<button class="btn block ${a.kind ?? ''}" data-modal-act="${a.id}">${esc(a.label)}</button>`).join('')}</div>
      </div></div>`;
      const first = host.querySelector('input,textarea');
      if (first) first.focus();
      host.onclick = (e) => {
        const b = e.target.closest('[data-modal-act]');
        if (!b) { if (e.target.matches('[data-modal-bg]')) { host.innerHTML = ''; resolve(null); } return; }
        const act = actions.find((a) => a.id === b.dataset.modalAct);
        const values = {};
        host.querySelectorAll('input,textarea').forEach((i) => { values[i.name] = i.value.trim(); });
        if (act.needs) {
          const missing = act.needs.find((n) => !values[n]);
          if (missing) { render(t('reasonRequired')); host.querySelectorAll('input,textarea').forEach((i) => { if (values[i.name] !== undefined) i.value = values[i.name]; }); return; }
        }
        host.innerHTML = '';
        resolve({ action: act.id, values });
      };
    };
    render();
  });
}

function fail(err) {
  console.error(err);
  ask({
    title: t('somethingWrong'),
    body: `<p>${esc(t('casePreserved'))}</p>`,
    actions: [{ id: 'retry', label: t('retry'), kind: 'primary' }, { id: 'restore', label: t('restoreCase') }],
  }).then(async (r) => {
    if (r?.action === 'restore') {
      const last = await persistence?.loadLast().catch(() => null);
      if (last) adopt(new CaseStore(last), 'case');
    }
    render();
  });
}

async function copy(target) {
  try {
    const text = copyText(store, pack, target);
    let ok = false;
    try { await navigator.clipboard.writeText(text); ok = true; } catch {
      const ta = document.createElement('textarea');
      ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      try { ok = document.execCommand('copy'); } catch { ok = false; }
      ta.remove();
    }
    toast(ok ? t('copied') : t('copyFailed'), !ok);
  } catch (e) { toast(e.message, true); }
}

// ---------------------------------------------------------------- case lifecycle
function adopt(newStore, screen) {
  if (autosave) autosave.flush();
  if (unsub) unsub();
  autosave?.stop();
  store = newStore;
  autosave = attachAutosave(store, persistence, { onError: () => { ui.storageOk = false; toast('Could not save to this device.', true); } });
  unsub = store.subscribe(() => render());
  ui.screen = screen; ui.tab = 'interview'; ui.editQ = null; ui.pendingText = null; ui.search = '';
  autosave.flush();
  render();
}
async function refreshCases() {
  try { ui.cases = await persistence.listCases(); ui.lastId = await persistence.lastCaseId(); } catch { ui.cases = []; }
}

// ---------------------------------------------------------------- views
function topBar() {
  const age = store?.getFact('patient.age');
  const sex = store?.getFact('patient.sex');
  const chip = store && ui.screen !== 'home' ? `<span class="sub">
      <button class="btn small" data-act="edit-demo" data-kind="age" ${isFinal() ? 'disabled' : ''}>${esc(typeof age === 'number' ? `${age} y` : t('age'))}</button>
      <button class="btn small" data-act="edit-demo" data-kind="sex" ${isFinal() ? 'disabled' : ''}>${esc(sex ? t(sex) : t('sex'))}</button></span>` : '';
  const badges = store?.state.demo ? `<span class="badge demo">${t('demoBadge')}</span>` : '';
  const fin = isFinal() ? `<span class="badge final">${t('finalBadge')}</span>` : '';
  return `<header class="top">
    <button class="btn small" data-act="home" aria-label="Home">🏠</button>
    <h1>${esc(ui.screen === 'home' ? t('app') : t('appShort'))} ${badges} ${fin}</h1>${chip}
    <button class="btn small" data-act="lang">${esc(t('language'))}</button></header>`;
}

function homeView() {
  const list = ui.cases.map((c) => `<div class="card"><div><b>${esc(new Date(c.updatedAt).toLocaleString())}</b>
      ${c.demo ? `<span class="badge demo">${t('demoBadge')}</span>` : ''} ${c.status === 'final' ? `<span class="badge final">${t('finalBadge')}</span>` : ''}<br>
      <span class="muted">${esc(c.complaints.map((k) => L(complaintByKey(k)?.label) || k).join(', ') || '—')}</span></div>
      <div class="row"><button class="btn small primary" data-act="open-case" data-id="${esc(c.id)}">${t('open')}</button>
      <button class="btn small danger" data-act="delete-case" data-id="${esc(c.id)}">${t('delete')}</button></div></div>`).join('');
  return `<main><div class="stack">
    <p class="muted">${esc(t('tagline'))}</p>
    <div class="notice">🔒 <span>${esc(t('privacy'))}</span></div>
    <button class="btn primary block" data-act="new-case">➕ ${esc(t('newCase'))}</button>
    ${ui.lastId ? `<button class="btn block" data-act="open-case" data-id="${esc(ui.lastId)}">↩️ ${esc(t('openLast'))}</button>` : ''}
    <button class="btn block" data-act="demo">🧪 ${esc(t('demoCase'))}</button>
    ${ui.cases.length ? `<h3>${esc(t('savedCases'))}</h3><div class="caselist">${list}</div>` : ''}
    <div class="grid2"><button class="btn" data-act="backup">💾 ${esc(t('backupNow'))}</button>
    <button class="btn" data-act="restore-backup">📥 ${esc(t('restoreBackup'))}</button></div>
    <input type="file" id="backup-file" accept="application/json,.json" hidden>
    <p class="muted">${esc(t('draftNote'))} · v${esc(APP_VERSION)} · ${esc(t('offline'))}</p></div></main>`;
}

function intakeView() {
  return `<main><div class="stack"><h2>${esc(t('newCase'))}</h2>
    <div class="notice">🔒 <span>${esc(t('privacy'))}</span></div>
    <div class="field"><label for="age">${esc(t('age'))}</label>
      <input id="age" type="number" step="any" min="0" max="120" inputmode="decimal" data-bind="age" value="${esc(ui.intake.age)}"></div>
    <div class="grid3">
      <button class="opt ${ui.intake.sex === 'male' ? 'on' : ''}" data-act="sex" data-v="male"><span class="ico">♂️</span>${esc(t('male'))}</button>
      <button class="opt ${ui.intake.sex === 'female' ? 'on' : ''}" data-act="sex" data-v="female"><span class="ico">♀️</span>${esc(t('female'))}</button>
      <button class="opt ${ui.intake.sex === 'unknown' ? 'on' : ''}" data-act="sex" data-v="unknown"><span class="ico">❔</span>${esc(t('unknown'))}</button></div>
    <div class="field"><label for="text">${esc(t('inYourWords'))}</label>
      <textarea id="text" data-bind="text">${esc(ui.intake.text)}</textarea></div>
    <button class="btn primary block" data-act="intake-submit">${esc(t('continue'))}</button></div></main>`;
}

function complaintListHtml() {
  const q = ui.search.trim().toLowerCase();
  const items = pack.complaints.filter((c) => !q || c.label.en.toLowerCase().includes(q) || c.label.ar.includes(q) || c.synonyms.some((s) => s.toLowerCase().includes(q)));
  const active = new Set(store.activeComplaints());
  return items.map((c) => `<button class="opt ${active.has(c.key) ? 'on' : ''}" data-act="toggle-complaint" data-key="${c.key}" aria-pressed="${active.has(c.key)}">
      <span class="ico">${icon(c.icon)}</span>${esc(L(c.label))}</button>`).join('') || `<p class="muted">—</p>`;
}
function complaintsView() {
  return `<main><div class="stack"><h2>${esc(t('chooseComplaint'))}</h2>
    <div class="field"><input id="csearch" type="text" placeholder="${esc(t('searchComplaint'))}" data-bind="search" value="${esc(ui.search)}" aria-label="${esc(t('searchComplaint'))}"></div>
    <div class="cards" id="clist">${complaintListHtml()}</div>
    <button class="btn primary block" data-act="start-interview" ${store.activeComplaints().length ? '' : 'disabled'}>${esc(t('startInterview'))}</button></div></main>`;
}

function questionHtml(q) {
  const cur = store.getFact(q.fact);
  const head = `<div class="qicon">${icon(q.icon ?? complaintByKey(q.complaints[0])?.icon)}</div><div class="q">${esc(L(q.prompt))}</div>`;
  let body = '';
  if (q.type === 'yesno') {
    body = `<div class="grid2"><button class="opt ${cur === 'yes' ? 'on' : ''}" data-act="answer" data-q="${q.id}" data-v="yes"><span class="ico">✅</span>${esc(t('yes'))}</button>
      <button class="opt ${cur === 'no' ? 'on' : ''}" data-act="answer" data-q="${q.id}" data-v="no"><span class="ico">❌</span>${esc(t('no'))}</button></div>`;
  } else if (q.type === 'choice') {
    if (ui.pendingText?.q === q.id) {
      const o = q.options.find((x) => x.v === ui.pendingText.v);
      body = `<div class="field"><label>${esc(L(o.textPrompt))}</label><input id="ptext" type="text" data-bind="ptext" value="${esc(ui.pendingText.text ?? '')}"></div>
        <button class="btn primary block" data-act="answer-text" data-q="${q.id}">${esc(t('save'))}</button>`;
    } else {
      body = `<div class="cards">${q.options.map((o) => `<button class="opt ${cur === o.v ? 'on' : ''}" data-act="answer" data-q="${q.id}" data-v="${o.v}">${esc(L(o))}</button>`).join('')}</div>`;
    }
  } else if (q.type === 'scale') {
    const n = [];
    for (let i = q.min; i <= q.max; i += 1) n.push(i);
    body = `<div class="scale">${n.map((i) => `<button class="opt ${cur === i ? 'on' : ''}" data-act="answer" data-q="${q.id}" data-v="${i}">${i}</button>`).join('')}</div>`;
  } else if (q.type === 'duration') {
    body = `<div class="cards">${q.presets.map((p) => `<button class="opt" data-act="answer-duration" data-q="${q.id}" data-n="${p.n}" data-unit="${p.unit}">${esc(formatDuration(p))}</button>`).join('')}</div>
      <h3>${esc(t('custom'))}</h3><div class="row"><input type="number" step="any" inputmode="decimal" style="width:110px" data-bind="cn" value="${esc(ui.custom.n)}" aria-label="${esc(t('custom'))}">
      ${['min', 'hour', 'day', 'week'].map((u) => `<button class="btn small ${ui.custom.unit === u ? 'primary' : ''}" data-act="custom-unit" data-unit="${u}">${esc(t({ min: 'minutes', hour: 'hours', day: 'days', week: 'weeks' }[u]))}</button>`).join('')}
      <button class="btn small green" data-act="answer-duration" data-q="${q.id}" data-custom="1">${esc(t('set'))}</button></div>`;
  }
  const skip = store.isAnswered(q.fact) ? '' : `<button class="btn block" data-act="unknown-q" data-q="${q.id}">${esc(t('skipUnknown'))}</button>`;
  return `${head}${body}<div style="margin-top:16px">${skip}</div>`;
}

function interviewView() {
  if (isFinal()) return `<main><div class="alert ok">${esc(t('caseComplete'))}</div></main>`;
  if (!store.activeComplaints().length) {
    return `<main><div class="stack"><h2>${esc(t('chooseComplaint'))}</h2><button class="btn primary block" data-act="goto-complaints">${esc(t('chooseComplaint'))}</button></div></main>`;
  }
  const p = progress(pack, store);
  const forced = ui.editQ ? pack.questions.find((x) => x.id === ui.editQ) : null;
  const q = forced ?? nextQuestion(pack, store);
  const bar = `<div class="progress" role="progressbar" aria-valuemin="0" aria-valuemax="${p.total}" aria-valuenow="${p.done}"><i style="width:${p.total ? Math.round((p.done / p.total) * 100) : 0}%"></i></div><div class="muted">${p.done} / ${p.total}</div>`;
  const answered = applicableQuestions(pack, store).filter(({ q: x }) => store.getFact(x.fact) !== undefined);
  const answeredList = answered.length ? `<details><summary>${esc(t('answers'))} (${answered.length})</summary>${answered.map(({ q: x }) => {
    const v = store.getFact(x.fact);
    const shown = x.type === 'yesno' ? t(v) : x.type === 'choice' ? L(x.options.find((o) => o.v === v)) : x.type === 'duration' ? formatDuration(v) : String(v);
    return `<div class="kv"><span>${esc(L(x.prompt))}</span><b>${esc(shown)}</b><button class="btn small" data-act="edit-q" data-q="${x.id}">${esc(t('change'))}</button></div>`;
  }).join('')}</details>` : '';
  if (!q) {
    return `<main><div class="stack">${bar}<div class="alert ok"><span>✅</span><span class="t">${esc(t('interviewDone'))}</span></div>
      <button class="btn block" data-act="goto-complaints">➕ ${esc(t('addComplaint'))}</button>${answeredList}</div></main>`;
  }
  return `<main><div class="stack">${bar}<div>${questionHtml(q)}</div>${ui.editQ ? `<button class="btn block" data-act="cancel-edit">${esc(t('cancel'))}</button>` : ''}${answeredList}</div></main>`;
}

const VITAL_ROWS = [
  { k: 'hr', step: 1 }, { k: 'rr', step: 1 }, { k: 'spo2', step: 1 }, { k: 'temp', step: 0.1 },
  { k: 'glucose', step: 0.1 }, { k: 'weight', step: 0.1 }, { k: 'height', step: 1 },
];
function vitalRow(r) {
  const key = `vitals.${r.k}`;
  const v = store.getFact(key);
  const label = esc(t({ hr: 'hr', rr: 'rr', spo2: 'spo2', temp: 'temp', glucose: 'glucose', weight: 'weight', height: 'height' }[r.k]));
  if (v !== undefined) {
    return `<div class="vital"><div class="lbl">${label}</div><div><span class="val">${esc(v)}</span> <span class="unit">${UNITS[r.k]}</span></div>${vitalActions(key)}</div>`;
  }
  return `<div class="vital"><div class="lbl"><label for="v-${r.k}">${label}</label></div>
    <input id="v-${r.k}" type="number" step="${r.step}" inputmode="decimal" data-enter="set-vital" data-k="${r.k}"><span class="unit">${UNITS[r.k]}</span>
    <button class="btn small primary" data-act="set-vital" data-k="${r.k}">${esc(t('set'))}</button></div>`;
}
const vitalActions = (key) => `<div class="row">
  <button class="btn small" data-act="new-reading" data-key="${key}">${esc(t('newReading'))}</button>
  <button class="btn small" data-act="correct" data-key="${key}">${esc(t('correctMeasurement'))}</button>
  <button class="btn small danger" data-act="remove" data-key="${key}">${esc(t('removeCalc'))}</button></div>`;

function vitalsView() {
  if (isFinal()) return `<main><div class="alert ok">${esc(t('caseComplete'))}</div></main>`;
  const sbp = store.getFact('vitals.sbp');
  const dbp = store.getFact('vitals.dbp');
  const hr = store.getFact('vitals.hr');
  const bp = (typeof sbp === 'number' && typeof dbp === 'number')
    ? `<div class="vital"><div class="lbl">${esc(t('bp'))}</div><div><span class="val">${sbp}/${dbp}</span> <span class="unit">mmHg</span></div>${vitalActions('bp')}</div>`
    : `<div class="vital"><div class="lbl">${esc(t('bp'))}</div>
        <input id="v-sbp" type="number" inputmode="decimal" placeholder="${esc(t('sbp'))}" aria-label="${esc(t('sbp'))}" data-enter="set-bp" value="${esc(sbp ?? '')}">/
        <input id="v-dbp" type="number" inputmode="decimal" placeholder="${esc(t('dbp'))}" aria-label="${esc(t('dbp'))}" data-enter="set-bp" value="${esc(dbp ?? '')}">
        <button class="btn small primary" data-act="set-bp">${esc(t('set'))}</button></div>`;
  const map = calcMap(sbp, dbp);
  const si = calcShockIndex(hr, sbp);
  const bmi = calcBmi(store.getFact('vitals.weight'), store.getFact('vitals.height'));
  const derived = [map !== null ? `${t('map')}: <b>${map} mmHg</b>` : '', si !== null ? `${t('shockIndex')}: <b>${si.toFixed(2)}</b>` : '', bmi !== null ? `${t('bmi')}: <b>${bmi.toFixed(1)}</b>` : ''].filter(Boolean);
  const o2 = store.getFact('vitals.o2device');
  const g = { e: store.getFact('gcs.e'), v: store.getFact('gcs.v'), m: store.getFact('gcs.m') };
  const gcs = calcGcs(g);
  const gcsRows = [['e', 'eye'], ['v', 'verbal'], ['m', 'motor']].map(([k, lk]) => `<h3>${esc(t(lk))}</h3><div class="cards">${GCS_OPTIONS[k].map((o) =>
    `<button class="opt ${g[k] === o.v ? 'on' : ''}" data-act="gcs" data-k="${k}" data-v="${o.v}"><b>${o.v}</b> ${esc(L(o))}</button>`).join('')}</div>`).join('');
  return `<main><div class="stack">${bp}${VITAL_ROWS.map(vitalRow).join('')}
    <h3>${esc(t('oxygen'))}</h3><div class="cards">${O2_OPTIONS.map((o) => `<button class="opt ${o2 === o.v ? 'on' : ''}" data-act="o2" data-v="${o.v}">${esc(L(o))}</button>`).join('')}</div>
    ${derived.length ? `<div class="alert info"><span>🧮</span><div><span class="t">${esc(t('derived'))}</span><br>${derived.join(' · ')}</div></div>` : ''}
    <h2>${esc(t('gcs'))}</h2>
    <div class="alert ${gcs.complete ? 'ok' : 'info'}"><span>🧠</span><span class="t">${esc(gcs.complete || g.e || g.v || g.m ? gcs.text : '—')}</span></div>${gcsRows}</div></main>`;
}

function examView() {
  if (isFinal()) return `<main><div class="alert ok">${esc(t('caseComplete'))}</div></main>`;
  return `<main><div class="stack">${pack.exam.map((s) => `<h3>${esc(L(s.title))}</h3><div class="cards">${s.findings.map((f) =>
    `<button class="opt ${store.getFact(f.fact) ? 'on' : ''}" data-act="exam" data-f="${f.fact}" aria-pressed="${!!store.getFact(f.fact)}">${esc(L(f.label))}</button>`).join('')}</div>`).join('')}</div></main>`;
}

const DISPOSITIONS = ['Discharge home', 'Admit to ward', 'Admit to ICU', 'Observation', 'Transfer to another facility', 'Left against medical advice'];
function noteView() {
  const sections = buildSections(store, pack).filter((s) => !s.empty || s.core);
  const ro = isFinal();
  const secHtml = sections.map((s) => `<section class="sec"><header><h4>${esc(s.title)}</h4>
      <button class="btn small" data-act="copy" data-target="${s.id}" ${s.empty ? 'disabled' : ''}>📄 ${esc(t('copy'))}</button></header>
      ${s.lines.length ? s.lines.map((l) => `<p>${esc(l)}</p>`).join('') : `<p class="none">Not documented.</p>`}</section>`).join('');
  const edit = ro ? '' : `<h3>${esc(t('assessment'))}</h3><div class="stack">
      <div class="field"><label for="imp">${esc(t('impression'))}</label><textarea id="imp" data-save="assessment.impression">${esc(store.getFact('assessment.impression') ?? '')}</textarea></div>
      <div class="field"><label for="dx">${esc(t('diagnosis'))}</label><input id="dx" type="text" data-save="assessment.diagnosis" value="${esc(store.getFact('assessment.diagnosis') ?? '')}"></div>
      <h3>${esc(t('disposition'))}</h3><div class="cards">${DISPOSITIONS.map((d) => `<button class="opt ${store.getFact('disposition.decision') === d ? 'on' : ''}" data-act="dispo" data-v="${esc(d)}">${esc(d)}</button>`).join('')}</div>
      <button class="btn green block" data-act="finalize">✅ ${esc(t('finalize'))}</button></div>`;
  const fin = ro ? `<div class="alert ok"><span>✅</span><span class="t">${esc(t('caseComplete'))}</span></div>
      <button class="btn block" data-act="reopen">${esc(t('reopen'))}</button>` : '';
  return `<main>${fin}${secHtml}${edit}</main><div class="fab"><button class="btn primary" data-act="copy" data-target="complete">📋 ${esc(t('copyAll'))}</button></div>`;
}

const EVENT_TYPES = [['treatment', 'evTreatment'], ['investigation', 'evInvestigation'], ['consult', 'evConsult'], ['reassessment', 'evReassess'], ['other', 'evOther']];
function timelineView() {
  const events = store.timeline();
  const list = events.length ? `<ul class="tl">${events.map((e) => `<li><time>${esc(formatTime(e.at))}</time><span style="flex:1">${esc(e.text)}${e.corrections.length ? ' <span class="muted">(time corrected)</span>' : ''}</span>
      ${isFinal() ? '' : `<button class="btn small" data-act="event-time" data-id="${e.id}">${esc(t('changeTime'))}</button>`}</li>`).join('')}</ul>` : `<p class="muted">${esc(t('noEvents'))}</p>`;
  const form = isFinal() ? '' : `<div class="stack"><div class="cards">${EVENT_TYPES.map(([v, k]) => `<button class="opt ${ui.evType === v ? 'on' : ''}" data-act="ev-type" data-v="${v}">${esc(t(k))}</button>`).join('')}</div>
      <div class="field"><label for="evtext">${esc(t('eventText'))}</label><input id="evtext" type="text" data-enter="add-event"></div>
      <button class="btn primary block" data-act="add-event">${esc(t('addEvent'))}</button></div>`;
  return `<main><div class="stack">${form}<h3>${esc(t('tabTimeline'))}</h3>${list}
    <button class="btn block" data-act="copy" data-target="timeline" ${events.length ? '' : 'disabled'}>📄 ${esc(t('copy'))}</button></div></main>`;
}


function thinkView() {
  if (store.activeComplaints().length === 0) return `<main><div class="stack"><p class="muted">${esc(t('thinkEmpty'))}</p></div></main>`;
  const r = reason(pack, store);
  const lang = ui.lang;
  const srcHtml = (ids) => ids.length
    ? `<small class="muted">${esc(t('sourcesT'))}: ${ids.map((id) => esc(citationFor(pack, id) ?? id)).join(' · ')}</small>`
    : `<small class="muted">${esc(t('noSourceYet'))}</small>`;
  const clusters = r.clusters.map((c) => `<div class="alert warn"><span>🧩</span><div><span class="t">${esc(c.label[lang] ?? c.label.en)}</span></div></div>`).join('');
  const mnm = r.mustNotMiss.map((d) => {
    const key = considerKey(d.id);
    const on = store.getFact(key) !== undefined;
    const action = isFinal() ? '' : on
      ? `<button class="btn small" data-act="unconsider" data-dx="${esc(d.id)}">${esc(t('removeConsider'))}</button>`
      : `<button class="btn small" data-act="consider" data-dx="${esc(d.id)}" data-label="${esc(d.dx.en)}">${esc(t('addConsider'))}</button>`;
    return `<div class="alert ${on ? 'ok' : 'info'}"><span>${on ? '✅' : '🔎'}</span><div style="flex:1"><span class="t">${esc(d.dx[lang] ?? d.dx.en)}</span>
      <details><summary>${esc(t('whyT'))}</summary><p>${esc(d.why)}</p>${srcHtml(d.sources)}</details>${on ? `<small>${esc(t('considered'))}</small>` : ''}</div>${action}</div>`;
  }).join('');
  const scores = r.scores.map((s) => `<div class="kv"><span><b>${esc(s.name)}</b><br><small class="muted">${esc(s.why)}${s.source ? ` · ${esc(pack.sources[s.source]?.citation ?? '')}` : ''}</small></span></div>`).join('');
  return `<main><div class="stack"><h2>${esc(t('thinkTitle'))}</h2>
    <p class="muted"><b>${esc(t('aiLabel'))}</b> · ${esc(t('reviewDraft'))}</p>
    ${r.clusters.length ? `<h3>${esc(t('clusters'))}</h3>${clusters}` : ''}
    <h3>${esc(t('mustNotMissT'))}</h3>${mnm}
    ${r.scores.length ? `<h3>${esc(t('relevantScores'))}</h3>${scores}` : ''}
    ${r.ageNote ? `<p class="muted">${esc(r.ageNote)}</p>` : ''}
    <h3>${esc(t('specialtiesT'))}</h3><p>${r.specialties.map(esc).join(' · ')}</p></div></main>`;
}

function safetyView() {
  const alerts = deriveAlerts(store.snapshotValues());
  const missing = missingInformation(pack, store);
  const check = documentationCheck(store, pack);
  const LV = { danger: '🚨', warn: '⚠️', caution: '⚠️', info: 'ℹ️', error: '⛔' };
  const alertsHtml = alerts.length ? alerts.map((a) => `<div class="alert ${a.level}"><span>${LV[a.level] ?? 'ℹ️'}</span><div><span class="t">${esc(a.text)}</span><small>${esc(a.basis)}</small></div></div>`).join('')
    : `<div class="alert ok"><span>✅</span><span class="t">${esc(t('noAlerts'))}</span></div>`;
  const missHtml = missing.map((m) => `<div class="alert caution"><span>❓</span><div style="flex:1"><span class="t">${esc(m.status)}: ${esc(m.label)}</span><small>${esc(m.why)}</small></div>
      ${isFinal() ? '' : `<button class="btn small" data-act="ask-now" data-ask="${esc(m.ask)}">${esc(t('askNow'))}</button>`}</div>`).join('');
  const checkHtml = `<div class="alert ${check.ready ? 'ok' : 'danger'}"><span>${check.ready ? '✅' : '⛔'}</span><span class="t">${esc(check.ready ? t('docReady') : t('docCheck'))}</span></div>
    ${check.issues.map((i) => `<div class="alert ${i.level === 'error' ? 'danger' : i.level === 'warn' ? 'warn' : 'info'}"><span>${LV[i.level]}</span><span>${esc(i.text)}</span></div>`).join('')}`;
  const versions = store.state.versions.map((v) => `<div class="kv"><span>${esc(v.label)} · ${esc(new Date(v.at).toLocaleString())}</span>
      ${isFinal() ? '' : `<button class="btn small" data-act="restore-version" data-id="${v.id}">${esc(t('restore'))}</button>`}</div>`).join('');
  return `<main><div class="stack"><h2>${esc(t('alerts'))}</h2>${alertsHtml}
    ${missing.length ? `<h2>${esc(t('missing'))}</h2>${missHtml}` : ''}
    <h2>${esc(t('docCheck'))}</h2>${checkHtml}
    <h2>${esc(t('versions'))}</h2>${versions || `<p class="muted">—</p>`}
    ${isFinal() ? '' : `<button class="btn block" data-act="save-version">${esc(t('saveVersion'))}</button>`}</div></main>`;
}

const TABS = [['interview', '📋', 'tabInterview'], ['vitals', '🫀', 'tabVitals'], ['exam', '🩺', 'tabExam'], ['think', '🧠', 'tabThink'], ['note', '📄', 'tabNote'], ['timeline', '🕒', 'tabTimeline'], ['safety', '🛡️', 'tabSafety']];
function caseView() {
  const views = { interview: interviewView, vitals: vitalsView, exam: examView, think: thinkView, note: noteView, timeline: timelineView, safety: safetyView };
  const nav = `<nav class="nav" aria-label="Case sections"><div>${TABS.map(([k, ic, lk]) =>
    `<button class="${ui.tab === k ? 'on' : ''}" data-act="tab" data-tab="${k}" aria-current="${ui.tab === k}"><span class="ico">${ic}</span>${esc(t(lk))}</button>`).join('')}</div></nav>`;
  return views[ui.tab]() + nav;
}

function render() {
  try {
    const root = $('#app');
    document.documentElement.lang = ui.lang;
    document.documentElement.dir = ui.lang === 'ar' ? 'rtl' : 'ltr';
    const active = document.activeElement;
    const keep = active && active.id && root.contains(active) ? { id: active.id, s: active.selectionStart } : null;
    let body = '';
    if (ui.screen === 'home' || !store) body = homeView();
    else if (ui.screen === 'intake') body = intakeView();
    else if (ui.screen === 'complaints') body = complaintsView();
    else body = caseView();
    root.innerHTML = `${topBar()}${body}`;
    const mainEl = root.querySelector('main');
    if (mainEl) mainEl.insertAdjacentHTML('beforeend', `<div class="wm" aria-hidden="true">${esc(t('watermark'))}</div>`);
    if (keep) { const el = document.getElementById(keep.id); if (el) { el.focus(); try { el.setSelectionRange(keep.s, keep.s); } catch { /* not a text field */ } } }
  } catch (e) { fail(e); }
}

// ---------------------------------------------------------------- actions
const num = (v) => (v === '' || v === null || v === undefined ? NaN : Number(v));

async function conflictFlow(key, value, opts, labelOf) {
  const res = store.setFact(key, value, opts);
  if (res.ok) return true;
  const c = res.conflict;
  const prevLabel = c.with ? labelOf(c.with) : String(c.previous);
  const r = await ask({
    title: t('conflictTitle'),
    body: `<div class="kv"><span>${esc(t('previous'))}</span><b>${esc(prevLabel)}</b></div><div class="kv"><span>${esc(t('incoming'))}</span><b>${esc(labelOf(key) || String(value))}</b></div>`,
    fields: [{ name: 'why', label: t('explanation') }],
    actions: [{ id: 'replace', label: t('replacePrev'), kind: 'primary' }, { id: 'both', label: t('keepBoth'), needs: ['why'] }, { id: 'cancel', label: t('cancel') }],
  });
  if (!r || r.action === 'cancel') return false;
  if (r.action === 'replace') store.setFact(key, value, { ...opts, replace: true, reason: 'Replaced by clinician' });
  else store.setFact(key, value, { ...opts, keepBoth: true, reason: r.values.why });
  return true;
}

async function numberDialog(title, label, withReason, current) {
  return ask({
    title, fields: [{ name: 'value', label, type: 'number', value: current ?? '' }, ...(withReason ? [{ name: 'reason', label: t('reason'), type: 'text' }] : [])],
    actions: [{ id: 'ok', label: t('confirm'), kind: 'primary', needs: ['value', ...(withReason ? ['reason'] : [])] }, { id: 'cancel', label: t('cancel') }],
  });
}

async function setVital(k) {
  const el = $(`#v-${k}`);
  const v = num(el?.value);
  const chk = validateVital(k, v);
  if (!chk.ok) { toast(chk.message, true); return; }
  store.setFact(`vitals.${k}`, v, { origin: 'measurement' });
}
async function setBp() {
  const sbp = num($('#v-sbp')?.value);
  const dbp = num($('#v-dbp')?.value);
  for (const [k, v] of [['sbp', sbp], ['dbp', dbp]]) { const c = validateVital(k, v); if (!c.ok) { toast(c.message, true); return; } }
  const pair = checkBpPair(sbp, dbp);
  if (!pair.ok) {
    const r = await ask({ title: t('bp'), body: `<p>${esc(pair.message)}</p>`, actions: [{ id: 'ok', label: t('confirm'), kind: 'primary' }, { id: 'cancel', label: t('cancel') }] });
    if (!r || r.action !== 'ok') return;
  }
  store.setFact('vitals.sbp', sbp, { origin: 'measurement' });
  store.setFact('vitals.dbp', dbp, { origin: 'measurement' });
}

async function bpPairDialog(withReason, title) {
  const r = await ask({
    title,
    fields: [{ name: 'sbp', label: t('sbp'), type: 'number', value: store.getFact('vitals.sbp') }, { name: 'dbp', label: t('dbp'), type: 'number', value: store.getFact('vitals.dbp') }, ...(withReason ? [{ name: 'reason', label: t('reason') }] : [])],
    actions: [{ id: 'ok', label: t('confirm'), kind: 'primary', needs: ['sbp', 'dbp', ...(withReason ? ['reason'] : [])] }, { id: 'cancel', label: t('cancel') }],
  });
  if (!r || r.action !== 'ok') return null;
  const sbp = num(r.values.sbp); const dbp = num(r.values.dbp);
  for (const [k, v] of [['sbp', sbp], ['dbp', dbp]]) { const c = validateVital(k, v); if (!c.ok) { toast(c.message, true); return null; } }
  return { sbp, dbp, reason: r.values.reason };
}

const handlers = {
  'lang': () => { ui.lang = ui.lang === 'ar' ? 'en' : 'ar'; try { localStorage.setItem('ufc-lang', ui.lang); } catch { /* ignore */ } render(); },
  'home': async () => { await autosave?.flush(); await refreshCases(); ui.screen = 'home'; render(); },
  'new-case': () => { ui.intake = { age: '', sex: null, text: '' }; adopt(new CaseStore(createCase({ language: ui.lang })), 'intake'); },
  'demo': () => adopt(buildDemoStore(), 'case'),
  'open-case': async (d) => {
    const c = await persistence.loadCase(d.id);
    if (!c) { toast('Case not found.', true); return; }
    adopt(new CaseStore(c), 'case');
  },
  'delete-case': async (d) => {
    const r = await ask({ title: t('deleteConfirm'), actions: [{ id: 'del', label: t('delete'), kind: 'danger' }, { id: 'cancel', label: t('cancel') }] });
    if (r?.action !== 'del') return;
    await persistence.deleteCase(d.id); await refreshCases(); render();
  },
  'sex': (d) => { ui.intake.sex = d.v; render(); },
  'intake-submit': () => {
    const age = num(ui.intake.age);
    const ageUnknown = ui.intake.age === '';
    if (!ageUnknown && (Number.isNaN(age) || age < 0 || age > 120)) { toast('Age must be 0–120.', true); return; }
    if (!ui.intake.sex) { toast(t('sex'), true); return; }
    if (ageUnknown) store.markUnknown('patient.age'); else store.setFact('patient.age', age, { origin: 'clinician' });
    if (ui.intake.sex === 'unknown') store.markUnknown('patient.sex'); else store.setFact('patient.sex', ui.intake.sex, { origin: 'clinician' });
    if (ui.intake.text.trim()) store.setFact('patient.presentation', ui.intake.text.trim(), { origin: 'clinician' });
    ui.screen = 'complaints'; render();
  },
  'toggle-complaint': (d) => {
    if (store.activeComplaints().includes(d.key)) store.resolveComplaint(d.key, 'Deselected'); else store.addComplaint(d.key);
  },
  'start-interview': () => { ui.screen = 'case'; ui.tab = 'interview'; render(); },
  'goto-complaints': () => { ui.screen = 'complaints'; render(); },
  'tab': (d) => { ui.tab = d.tab; ui.editQ = null; render(); },
  'answer': (d) => {
    const q = pack.questions.find((x) => x.id === d.q);
    let v = d.v;
    if (q.type === 'scale') v = Number(v);
    const opt = q.options?.find((o) => o.v === v);
    if (opt?.needsText) { ui.pendingText = { q: q.id, v, text: '' }; render(); return; }
    const editing = ui.editQ === q.id;
    store.setFact(q.fact, v, { origin: 'patient', replace: editing, reason: editing ? 'Updated by clinician' : undefined });
    ui.editQ = null;
  },
  'answer-text': (d) => {
    const q = pack.questions.find((x) => x.id === d.q);
    const text = ($('#ptext')?.value ?? '').trim();
    if (!text) { toast(t('reasonRequired'), true); return; }
    store.setFact(q.fact, ui.pendingText.v, { origin: 'patient', replace: true, reason: 'Updated by clinician' });
    store.setFact(`${q.fact}.detail`, text, { origin: 'patient', replace: true, reason: 'Updated by clinician' });
    ui.pendingText = null; ui.editQ = null; render();
  },
  'answer-duration': (d) => {
    const q = pack.questions.find((x) => x.id === d.q);
    let val;
    if (d.custom) { const n = num(ui.custom.n); if (!(n > 0)) { toast(t('custom'), true); return; } val = { n, unit: ui.custom.unit }; } else val = { n: Number(d.n), unit: d.unit };
    const editing = ui.editQ === q.id;
    store.setFact(q.fact, val, { origin: 'patient', replace: editing, reason: editing ? 'Updated by clinician' : undefined });
    ui.editQ = null;
  },
  'custom-unit': (d) => { ui.custom.unit = d.unit; render(); },
  'unknown-q': (d) => { store.markUnknown(pack.questions.find((x) => x.id === d.q).fact, 'patient'); ui.editQ = null; },
  'edit-q': (d) => { ui.editQ = d.q; ui.pendingText = null; ui.tab = 'interview'; render(); },
  'cancel-edit': () => { ui.editQ = null; ui.pendingText = null; render(); },
  'set-vital': (d) => setVital(d.k),
  'set-bp': () => setBp(),
  'o2': (d) => {
    const cur = store.getFact('vitals.o2device');
    store.setFact('vitals.o2device', d.v, { origin: 'measurement', replace: cur !== undefined && cur !== d.v, reason: 'Changed oxygen device' });
  },
  'gcs': (d) => {
    const key = `gcs.${d.k}`;
    const cur = store.getFact(key);
    store.setFact(key, Number(d.v), { origin: 'measurement', replace: cur !== undefined, reason: 'Reassessed' });
  },
  'new-reading': async (d) => {
    if (d.key === 'bp') {
      const r = await bpPairDialog(false, t('newReading')); if (!r) return;
      store.setFact('vitals.sbp', r.sbp, { origin: 'measurement', replace: true, reason: 'Repeat measurement' });
      store.setFact('vitals.dbp', r.dbp, { origin: 'measurement', replace: true, reason: 'Repeat measurement' });
      return;
    }
    const k = d.key.split('.')[1];
    const r = await numberDialog(t('newReading'), t(k), false, ''); if (!r || r.action !== 'ok') return;
    const v = num(r.values.value); const c = validateVital(k, v); if (!c.ok) { toast(c.message, true); return; }
    store.setFact(d.key, v, { origin: 'measurement', replace: true, reason: 'Repeat measurement' });
  },
  'correct': async (d) => {
    if (d.key === 'bp') {
      const r = await bpPairDialog(true, t('correctMeasurement')); if (!r) return;
      store.correctFact('vitals.sbp', r.sbp, r.reason); store.correctFact('vitals.dbp', r.dbp, r.reason);
      return;
    }
    const k = d.key.split('.')[1];
    const r = await numberDialog(t('correctMeasurement'), t(k), true, store.getFact(d.key)); if (!r || r.action !== 'ok') return;
    const v = num(r.values.value); const c = validateVital(k, v); if (!c.ok) { toast(c.message, true); return; }
    store.correctFact(d.key, v, r.values.reason);
  },
  'remove': async (d) => {
    const r = await ask({ title: t('removeCalc'), fields: [{ name: 'reason', label: t('reason') }], actions: [{ id: 'ok', label: t('confirm'), kind: 'danger', needs: ['reason'] }, { id: 'cancel', label: t('cancel') }] });
    if (!r || r.action !== 'ok') return;
    if (d.key === 'bp') { store.removeFact('vitals.sbp', r.values.reason); store.removeFact('vitals.dbp', r.values.reason); } else store.removeFact(d.key, r.values.reason);
  },
  'exam': async (d) => {
    const f = examFindings.find((x) => x.fact === d.f);
    if (store.getFact(f.fact)) { store.removeFact(f.fact, 'Unselected'); return; }
    const labelOf = (key) => L(examFindings.find((x) => x.fact === key)?.label);
    await conflictFlow(f.fact, 'present', { origin: 'clinician', excludes: f.excludes }, labelOf);
  },
  'dispo': (d) => {
    const cur = store.getFact('disposition.decision');
    store.setFact('disposition.decision', d.v, { origin: 'clinician', replace: cur !== undefined, reason: 'Updated by clinician' });
  },
  'copy': (d) => copy(d.target),
  'ev-type': (d) => { ui.evType = d.v; render(); },
  'add-event': () => {
    const el = $('#evtext'); const text = (el?.value ?? '').trim();
    if (!text) return;
    store.addEvent({ type: ui.evType, text });
  },
  'event-time': async (d) => {
    const ev = store.state.events.find((e) => e.id === d.id);
    const r = await ask({ title: t('changeTime'), fields: [{ name: 'time', label: 'HH:MM', value: formatTime(ev.at) }, { name: 'reason', label: t('reason') }],
      actions: [{ id: 'ok', label: t('confirm'), kind: 'primary', needs: ['time', 'reason'] }, { id: 'cancel', label: t('cancel') }] });
    if (!r || r.action !== 'ok') return;
    const m = /^(\d{1,2}):(\d{2})$/.exec(r.values.time);
    if (!m || +m[1] > 23 || +m[2] > 59) { toast('HH:MM', true); return; }
    const when = new Date(ev.at); when.setHours(+m[1], +m[2], 0, 0);
    store.correctEventTime(d.id, when.getTime(), r.values.reason);
  },
  'ask-now': (d) => {
    if (d.ask === 'patient') { handlers['edit-demo']({ kind: store.isAnswered('patient.age') ? 'sex' : 'age' }); return; }
    if (d.ask === 'complaint') { ui.screen = 'complaints'; render(); return; }
    if (d.ask === 'vitals') { ui.tab = 'vitals'; render(); return; }
    ui.editQ = d.ask; ui.tab = 'interview'; render();
  },
  'edit-demo': async (d) => {
    if (d.kind === 'age') {
      const cur = store.getFact('patient.age');
      const r = await numberDialog(t('age'), t('age'), cur !== undefined, cur); if (!r || r.action !== 'ok') return;
      const v = num(r.values.value); if (!(v >= 0 && v <= 120)) { toast('Age must be 0–120.', true); return; }
      if (cur === undefined) store.setFact('patient.age', v, { origin: 'clinician', replace: true }); else store.correctFact('patient.age', v, r.values.reason);
    } else {
      const cur = store.getFact('patient.sex');
      const r = await ask({ title: t('sex'), fields: cur ? [{ name: 'reason', label: t('reason') }] : [],
        actions: [{ id: 'male', label: t('male'), kind: 'primary', needs: cur ? ['reason'] : undefined }, { id: 'female', label: t('female'), kind: 'primary', needs: cur ? ['reason'] : undefined }, { id: 'cancel', label: t('cancel') }] });
      if (!r || r.action === 'cancel') return;
      if (cur === undefined) store.setFact('patient.sex', r.action, { origin: 'clinician', replace: true }); else if (cur !== r.action) store.correctFact('patient.sex', r.action, r.values.reason);
    }
  },
  'consider': (d) => { store.setFact(considerKey(d.dx), d.label, { origin: 'ai_confirmed', reason: 'Added to assessment by clinician' }); render(); },
  'unconsider': (d) => { store.removeFact(considerKey(d.dx), 'Removed by clinician'); render(); },
  'save-version': () => { store.saveVersion('updated'); toast(t('saveVersion')); render(); },
  'restore-version': async (d) => {
    const r = await ask({ title: t('restore'), actions: [{ id: 'ok', label: t('restore'), kind: 'primary' }, { id: 'cancel', label: t('cancel') }] });
    if (r?.action === 'ok') store.restoreVersion(d.id);
  },
  'finalize': async () => {
    const check = documentationCheck(store, pack);
    const body = check.issues.map((i) => `<div class="alert ${i.level === 'error' ? 'danger' : i.level === 'warn' ? 'warn' : 'info'}">${esc(i.text)}</div>`).join('');
    const r = await ask({ title: check.ready ? t('finalize') : t('docCheck'), body,
      actions: check.ready ? [{ id: 'ok', label: t('finalize'), kind: 'green' }, { id: 'cancel', label: t('cancel') }] : [{ id: 'cancel', label: t('close') }] });
    if (r?.action === 'ok') { store.finalize(); ui.tab = 'note'; render(); }
  },
  'reopen': async () => {
    const r = await ask({ title: t('reopen'), fields: [{ name: 'reason', label: t('reason') }], actions: [{ id: 'ok', label: t('confirm'), kind: 'primary', needs: ['reason'] }, { id: 'cancel', label: t('cancel') }] });
    if (r?.action === 'ok') store.reopen(r.values.reason);
  },
  'backup': async () => {
    const data = await persistence.exportBackup(pack.version);
    const blob = new Blob([JSON.stringify(data, null, 1)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `clinical-copilot-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  },
  'restore-backup': () => $('#backup-file')?.click(),
};

async function onClick(e) {
  const el = e.target.closest('[data-act]');
  if (!el) return;
  const fn = handlers[el.dataset.act];
  if (!fn) return;
  try { await fn(el.dataset); } catch (err) { fail(err); }
}

function onInput(e) {
  const b = e.target.dataset.bind;
  if (!b) return;
  if (b === 'age') ui.intake.age = e.target.value;
  else if (b === 'text') ui.intake.text = e.target.value;
  else if (b === 'cn') ui.custom.n = e.target.value;
  else if (b === 'ptext' && ui.pendingText) ui.pendingText.text = e.target.value;
  else if (b === 'search') { ui.search = e.target.value; const list = $('#clist'); if (list) list.innerHTML = complaintListHtml(); }
}

async function onChange(e) {
  const key = e.target.dataset.save;
  if (key) {
    try {
      const v = e.target.value.trim();
      const cur = store.getFact(key);
      if (!v) { if (cur !== undefined) store.removeFact(key, 'Cleared by clinician'); } else if (v !== cur) store.setFact(key, v, { origin: 'clinician', replace: cur !== undefined, reason: 'Updated by clinician' });
    } catch (err) { fail(err); }
  }
  if (e.target.id === 'backup-file' && e.target.files?.[0]) {
    try {
      const text = await e.target.files[0].text();
      const r = await persistence.importBackup(JSON.parse(text));
      await refreshCases(); render(); toast(`${t('restoredFrom')} (${r.added})`);
    } catch (err) { toast(err.message || 'Invalid file', true); }
  }
}

function onKeydown(e) {
  if (e.key !== 'Enter') return;
  const act = e.target.dataset?.enter;
  if (act && handlers[act]) { e.preventDefault(); handlers[act](e.target.dataset).catch?.(fail); }
}

// ---------------------------------------------------------------- boot
async function boot() {
  let adapter;
  try {
    adapter = new IndexedDbAdapter();
    await adapter.get('probe');
  } catch {
    adapter = new MemoryAdapter();
    ui.storageOk = false;
  }
  persistence = new Persistence(adapter);
  await refreshCases();
  document.addEventListener('click', onClick);
  document.addEventListener('input', onInput);
  document.addEventListener('change', onChange);
  document.addEventListener('keydown', onKeydown);
  window.addEventListener('pagehide', () => { autosave?.flush(); });
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') autosave?.flush(); });
  window.addEventListener('error', (e) => fail(e.error ?? e.message));
  window.addEventListener('unhandledrejection', (e) => fail(e.reason));
  if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
    navigator.serviceWorker.register('./service-worker.js').catch(() => { /* offline support optional */ });
  }
  render();
  if (!ui.storageOk) toast('Storage unavailable: data will not persist after closing.', true);
  window.__UFC = { ui, get store() { return store; }, pack, version: APP_VERSION };
}
boot();
