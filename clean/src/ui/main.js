// UI shell. Vanilla JS, no framework. All clinical logic lives in ../core and ../content (tested without a browser).
import pack from '../content/pack.json';
import { FACTS } from '../content/facts.js';
import { SCORES, SCORE_BY_ID } from '../content/scores.js';
import { reason, considerKey, citationFor } from '../core/reasoning.js';
import { CaseStore, createCase } from '../core/state.js';
import { Persistence, IndexedDbAdapter, MemoryAdapter, attachAutosave, APP_VERSION } from '../core/persistence.js';
import { nextQuestion, progress, missingInformation, applicableQuestions } from '../core/questions.js';
import { deriveAlerts } from '../core/alerts.js';
import { calcMap, calcShockIndex, calcBmi, calcGcs, validateVital, checkBpPair, GCS_OPTIONS, UNITS, LIMITS } from '../core/vitals.js';
import { buildSections, renderCompleteCase, O2_OPTIONS, formatTime, formatDuration } from '../core/documentation.js';
import { copyText } from '../core/copy.js';
import { documentationCheck } from '../core/checks.js';
import { buildDemoStore } from '../core/demo.js';
import { relevantScores, evaluateById, nextScoreInput, pendingHistoryInputs, askSpec, readingsOf } from '../core/workup.js';
import { scoreText } from '../core/scoreEngine.js';
import { suggestInvestigations, invKey } from '../core/investigations.js';
import { DRUGS, DRUG_BY_ID, DRUG_REVIEW } from '../content/drugs.js';
import { calcDose, medContext, safetyChecks, suggestMeds, administered } from '../core/meds.js';
import { OUTPUTS, icdSuggestions, suggestedSpecialties } from '../core/outputs.js';
import { parseIntake } from '../core/nlp.js';
import { icon, tile, COMPLAINT_ICON } from './icons.js';
import { makeT } from './i18n.js';

// ================================================================ state & helpers
const $ = (s, r = document) => r.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const ui = {
  screen: 'home', tab: 'now', lang: 'en', search: '', editKey: null, pendingText: null, evType: 'treatment', noteMode: 'note',
  intake: { age: '', sex: null, text: '' }, cases: [], lastId: null, custom: { n: '', unit: 'hour' }, storageOk: true,
  sheet: null, librarySearch: '', globalSearch: '',
};
try { ui.lang = localStorage.getItem('ufc-lang') === 'ar' ? 'ar' : 'en'; } catch { /* storage blocked */ }
const t = makeT(() => ui.lang);
const L = (o) => (o ? (ui.lang === 'ar' ? o.ar ?? o.en : o.en) : '');

let store = null;
let scratch = null; // calculator mode store (never saved)
let persistence = null;
let autosave = null;
let unsub = null;

const complaintByKey = (k) => pack.complaints.find((c) => c.key === k);
const examFindings = pack.exam.flatMap((s) => s.findings);
const isFinal = () => store?.state.status === 'final';
const S = () => (ui.sheet?.scratch ? scratch : store); // store the current sheet acts on
const cTile = (c, size = 'md') => { const [n, tone] = COMPLAINT_ICON[c?.icon] ?? ['stethoscope', 'blue']; return tile(n, tone, size); };
const LEVEL = { danger: ['critical', 'alert', 'red'], warn: ['important', 'alert', 'orange'], caution: ['cautionL', 'info', 'yellow'], info: ['infoL', 'info', 'blue'], ok: ['infoL', 'check', 'green'] };

// ================================================================ feedback
function toast(msg, err = false) {
  const el = $('#toast');
  el.innerHTML = `<div class="toast ${err ? 'err' : ''}" role="status">${esc(msg)}</div>`;
  clearTimeout(toast.t);
  toast.t = setTimeout(() => { el.innerHTML = ''; }, 2200);
}

/** Promise-based dialog with optional fields. Resolves { action, values } or null. */
function ask({ title, body = '', fields = [], actions }) {
  return new Promise((resolve) => {
    const host = $('#modal');
    const draw = (error = '') => {
      host.innerHTML = `<div class="modal-bg" data-modal-bg><div class="modal" role="dialog" aria-modal="true" aria-label="${esc(title)}"><div class="grab"></div>
        <h3 class="mt">${esc(title)}</h3><div class="stack">${body}
        ${fields.map((f) => `<div class="field"><label for="mf-${f.name}">${esc(f.label)}</label>${f.type === 'textarea'
          ? `<textarea id="mf-${f.name}" name="${f.name}">${esc(f.value ?? '')}</textarea>`
          : `<input id="mf-${f.name}" name="${f.name}" type="${f.type ?? 'text'}" ${f.type === 'number' ? 'step="any" inputmode="decimal"' : ''} value="${esc(f.value ?? '')}">`}</div>`).join('')}
        ${error ? `<div class="alert danger" role="alert">${icon('alert')}<span>${esc(error)}</span></div>` : ''}
        ${actions.map((a) => `<button class="btn block ${a.kind ?? ''}" data-modal-act="${a.id}">${esc(a.label)}</button>`).join('')}</div>
      </div></div>`;
      const first = host.querySelector('input,textarea');
      if (first) first.focus();
      host.onclick = (e) => {
        const b = e.target.closest('[data-modal-act]');
        if (!b) { if (e.target.matches('[data-modal-bg]')) { host.innerHTML = ''; resolve(null); } return; }
        const act = actions.find((a) => a.id === b.dataset.modalAct);
        const values = {};
        host.querySelectorAll('input,textarea').forEach((i) => { values[i.name] = i.value.trim(); });
        if (act.needs && act.needs.some((n) => !values[n])) {
          draw(t('reasonRequired'));
          host.querySelectorAll('input,textarea').forEach((i) => { if (values[i.name] !== undefined) i.value = values[i.name]; });
          return;
        }
        host.innerHTML = '';
        resolve({ action: act.id, values });
      };
    };
    draw();
  });
}

function fail(err) {
  console.error(err);
  ask({ title: t('somethingWrong'), body: `<p>${esc(t('casePreserved'))}</p>`,
    actions: [{ id: 'retry', label: t('retry'), kind: 'primary' }, { id: 'restore', label: t('restoreCase') }] })
    .then(async (r) => {
      if (r?.action === 'restore') { const last = await persistence?.loadLast().catch(() => null); if (last) adopt(new CaseStore(last), 'case'); }
      ui.sheet = null; render();
    });
}

async function writeClipboard(text) {
  let ok = false;
  try { await navigator.clipboard.writeText(text); ok = true; } catch {
    const ta = document.createElement('textarea');
    ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    try { ok = document.execCommand('copy'); } catch { ok = false; }
    ta.remove();
  }
  toast(ok ? t('copied') : t('copyFailed'), !ok);
}
async function copy(target) {
  try {
    if (OUTPUTS[target]) { await writeClipboard(OUTPUTS[target](store, pack)); return; }
    if (target === 'followup') { const fu = store.getFact('discharge.followup'); if (!fu) { toast(t('nothingYet'), true); return; } await writeClipboard(`Follow-up: ${fu}`); return; }
    await writeClipboard(copyText(store, pack, target));
  } catch (e) { toast(e.message, true); }
}

// ================================================================ case lifecycle
function adopt(newStore, screen) {
  if (autosave) autosave.flush();
  if (unsub) unsub();
  autosave?.stop();
  store = newStore;
  autosave = attachAutosave(store, persistence, { onError: () => { ui.storageOk = false; toast('Could not save to this device.', true); } });
  unsub = store.subscribe(() => render());
  ui.screen = screen; ui.tab = 'now'; ui.editKey = null; ui.pendingText = null; ui.search = ''; ui.sheet = null; ui.noteMode = 'note';
  autosave.flush();
  render();
}
async function refreshCases() {
  try { ui.cases = await persistence.listCases(); ui.lastId = await persistence.lastCaseId(); } catch { ui.cases = []; }
}

// ================================================================ question rendering (one question per screen)
/** Resolve how to ask a fact key: interview question, shared fact or vital. */
function specFor(key) { return askSpec(pack, key); }

function displayValue(key, v) {
  if (v === undefined || v === null) return '—';
  const sp = specFor(key);
  const def = sp.kind === 'pack' ? sp.question : sp.def;
  if (!def) return String(v);
  if (def.type === 'yesno') return t(v);
  if (def.type === 'choice') return L(def.options.find((o) => o.v === v)) || String(v);
  if (def.type === 'duration') return formatDuration(v);
  return `${v}${def.unit ? ` ${def.unit}` : ''}`;
}

function questionHtml(key, { st = store, note = '' } = {}) {
  const sp = specFor(key);
  const def = sp.kind === 'pack' ? sp.question : sp.def;
  if (!def) return `<p class="muted">${esc(key)}</p>`;
  const cur = st.getFact(key);
  const ROLE_TILE = { allergy: ['shield', 'red'], meds: ['pill', 'purple'], preg: ['pregnancy', 'pink'], pmh: ['clipboard', 'slate'], social: ['user', 'slate'] };
  const roleTile = sp.kind === 'pack' ? ROLE_TILE[def.role] : null;
  const c = sp.kind === 'pack' && !roleTile ? complaintByKey(def.complaints.find((k) => store?.activeComplaints().includes(k)) ?? def.complaints[0]) : null;
  const sectionTile = { pmh: ['clipboard', 'slate'], family: ['team', 'slate'], meds: ['pill', 'purple'], social: ['user', 'slate'], sx: ['stethoscope', 'blue'],
    exam: ['stethoscope', 'teal'], judgement: ['bulb', 'purple'], lab: ['flask', 'teal'], ecg: ['ecg', 'red'], vitals: ['activity', 'blue'] }[def.section] ?? null;
  const head = `<div class="qhead">${roleTile ? tile(roleTile[0], roleTile[1], 'lg') : c ? cTile(c, 'lg') : sectionTile ? tile(sectionTile[0], sectionTile[1], 'lg') : tile('stethoscope', 'blue', 'lg')}
    <div class="grow"><div class="q">${esc(L(def.prompt))}</div>${note ? `<div class="qsub">${note}</div>` : ''}</div></div>`;
  let body = '';
  if (def.type === 'yesno') {
    body = `<div class="answers two">
      <button class="opt yes ${cur === 'yes' ? 'on' : ''}" data-act="answer" data-key="${esc(key)}" data-v="yes">${icon('check')}${esc(t('yes'))}</button>
      <button class="opt no ${cur === 'no' ? 'on' : ''}" data-act="answer" data-key="${esc(key)}" data-v="no">${icon('x')}${esc(t('no'))}</button></div>`;
  } else if (def.type === 'choice') {
    if (ui.pendingText?.key === key) {
      const o = def.options[ui.pendingText.i];
      body = `<div class="field"><label for="ptext">${esc(L(o.textPrompt))}</label><input id="ptext" type="text" data-bind="ptext" value="${esc(ui.pendingText.text ?? '')}"></div>
        <button class="btn primary block" data-act="answer-text" data-key="${esc(key)}">${esc(t('save'))}</button>`;
    } else {
      body = `<div class="answers">${def.options.map((o, i) => `<button class="opt ${cur === o.v ? 'on' : ''}" data-act="answer" data-key="${esc(key)}" data-i="${i}">${esc(L(o))}</button>`).join('')}</div>`;
    }
  } else if (def.type === 'scale') {
    const n = []; for (let i = def.min; i <= def.max; i += 1) n.push(i);
    body = `<div class="scale">${n.map((i) => `<button class="opt ${cur === i ? 'on' : ''}" data-act="answer" data-key="${esc(key)}" data-v="${i}">${i}</button>`).join('')}</div>`;
  } else if (def.type === 'duration') {
    body = `<div class="answers">${def.presets.map((p) => `<button class="opt" data-act="answer-duration" data-key="${esc(key)}" data-n="${p.n}" data-unit="${p.unit}">${esc(formatDuration(p))}</button>`).join('')}</div>
      <div class="card flat tight"><div class="row"><input type="number" step="any" inputmode="decimal" style="width:110px" data-bind="cn" value="${esc(ui.custom.n)}" aria-label="${esc(t('custom'))}">
      <div class="seg grow">${['min', 'hour', 'day', 'week'].map((u) => `<button class="${ui.custom.unit === u ? 'on' : ''}" data-act="custom-unit" data-unit="${u}">${esc(t({ min: 'minutes', hour: 'hours', day: 'days', week: 'weeks' }[u]))}</button>`).join('')}</div>
      <button class="btn small primary" data-act="answer-duration" data-key="${esc(key)}" data-custom="1">${esc(t('set'))}</button></div></div>`;
  } else if (def.type === 'number') {
    body = `<div class="numrow"><input id="num-input" type="number" step="any" inputmode="decimal" value="${esc(cur ?? '')}" data-enter="answer-num" data-key="${esc(key)}" aria-label="${esc(L(def.prompt))}">
      <span class="unit">${esc(def.unit ?? '')}</span></div>
      <button class="btn primary block" data-act="answer-num" data-key="${esc(key)}">${icon('check')}${esc(t('save'))}</button>`;
  }
  const skip = st.isAnswered(key) ? '' : `<button class="btn ghost block" data-act="unknown-q" data-key="${esc(key)}">${esc(t('skipUnknown'))}</button>`;
  return `<div class="qwrap">${head}${body}${skip}</div>`;
}

// ================================================================ shared fragments
function alertHtml(a) {
  const [lk, ic] = LEVEL[a.level] ?? LEVEL.info;
  return `<div class="alert ${a.level === 'danger' ? 'danger' : a.level === 'warn' ? 'warn' : a.level === 'caution' ? 'caution' : 'info'}">${icon(ic)}
    <div><span class="t"><span class="lvl"><span>${esc(t(lk))}</span></span> ${esc(a.text)}</span>${a.basis ? `<small>${esc(a.basis)}</small>` : ''}</div></div>`;
}
const srcList = (ids) => (ids?.length ? `<div class="src">${ids.map((id) => esc(citationFor(pack, id) ?? id)).join('<br>')}</div>` : `<div class="src">${esc(t('noSourceYet'))}</div>`);
const pillFor = (res) => {
  if (!res.applicable) return `<span class="pill muted">${esc(t('notApplicable'))}</span>`;
  if (!res.complete) return `<span class="pill caution">${res.missing.length + res.unknown.length} ${esc(t('itemsNeeded'))}</span>`;
  const lv = res.result.level === 'danger' ? 'danger' : res.result.level === 'warn' ? 'warn' : res.result.level === 'caution' ? 'caution' : 'ok';
  const total = res.total === null || res.total === undefined ? '' : `${Number.isInteger(res.total) ? res.total : res.total.toFixed(1)} · `;
  return `<span class="pill ${lv}">${esc(total)}${esc(res.result.label)}</span>`;
};

function topBar() {
  const inCase = store && ui.screen !== 'home' && ui.screen !== 'library';
  const age = store?.getFact('patient.age');
  const sex = store?.getFact('patient.sex');
  const pt = inCase ? `<div class="pt">
      <button class="chip blue" data-act="edit-demo" data-kind="age" ${isFinal() ? 'disabled' : ''}>${icon('user')}${esc(typeof age === 'number' ? `${age} ${ui.lang === 'ar' ? 'سنة' : 'y'}` : t('age'))}</button>
      <button class="chip blue" data-act="edit-demo" data-kind="sex" ${isFinal() ? 'disabled' : ''}>${esc(sex ? t(sex) : t('sex'))}</button>
      ${store.state.demo ? `<span class="badge demo">${t('demoBadge')}</span>` : ''}${isFinal() ? `<span class="badge final">${t('finalBadge')}</span>` : ''}</div>` : '';
  return `<header class="top"><div class="top-in">
    <button class="brand" data-act="home" aria-label="Home"><span class="mark">${icon('pulse')}</span>
      <span class="${inCase ? 'hide-sm' : ''}"><b>${esc(t('appShort'))}</b><small>${esc(t('brandSub'))}</small></span></button>
    <div class="grow">${pt}</div>
    <button class="iconbtn" data-act="resus-open" aria-label="Resuscitation" style="color:var(--red);border-color:var(--red-bd);background:var(--red-bg)">${icon('zap')}</button>
    <button class="iconbtn" data-act="open-search" aria-label="${esc(t('searchAll'))}">${icon('search')}</button>
    <button class="langbtn" data-act="lang">${esc(t('language'))}</button></div></header>`;
}

function vitalStatus(k, v, age) {
  if (typeof v !== 'number' || !(typeof age === 'number' && age >= 18)) return '';
  const R = { hr: [[v > 130 || v < 40, 'bad'], [v > 100 || v < 50, 'warn']], rr: [[v >= 25 || v <= 8, 'bad'], [v > 20 || v < 12, 'warn']],
    spo2: [[v < 90, 'bad'], [v < 94, 'warn']], temp: [[v >= 39.5 || v < 35, 'bad'], [v >= 38 || v < 36, 'warn']],
    sbp: [[v <= 90, 'bad'], [v > 180 || v <= 100, 'warn']], glucose: [[v < 4, 'bad'], [v > 11, 'warn']] }[k];
  if (!R) return '';
  const hit = R.find(([c]) => c);
  return hit ? hit[1] : '';
}

function patientStrip() {
  const v = store.snapshotValues();
  const age = v['patient.age'];
  const chips = [];
  if (typeof v['vitals.sbp'] === 'number' && typeof v['vitals.dbp'] === 'number') chips.push(['BP', `${v['vitals.sbp']}/${v['vitals.dbp']}`, vitalStatus('sbp', v['vitals.sbp'], age)]);
  for (const [k, lab] of [['hr', 'HR'], ['rr', 'RR'], ['spo2', 'SpO₂'], ['temp', 'T']]) if (typeof v[`vitals.${k}`] === 'number') chips.push([lab, `${v[`vitals.${k}`]}${k === 'spo2' ? '%' : k === 'temp' ? '°' : ''}`, vitalStatus(k, v[`vitals.${k}`], age)]);
  const g = calcGcs({ e: v['gcs.e'], v: v['gcs.v'], m: v['gcs.m'] });
  if (g.complete) chips.push(['GCS', String(g.total), g.total <= 8 ? 'bad' : g.total < 15 ? 'warn' : '']);
  const news = evaluateById(store, 'news2');
  if (news?.complete) chips.push(['NEWS2', String(news.total), news.total >= 7 ? 'bad' : news.total >= 5 || news.result.level === 'warn' ? 'warn' : '']);
  const alerts = deriveAlerts(v).filter((a) => a.level === 'danger' || a.level === 'warn');
  const complaints = store.activeComplaints().map((k) => complaintByKey(k)).filter(Boolean);
  return `<div class="strip"><div class="strip-in">
    ${complaints.map((c) => `<span class="chip">${esc(L(c.label))}</span>`).join('')}
    ${chips.map(([l, val, cls]) => `<span class="vchip ${cls}">${esc(l)} <b>${esc(val)}</b></span>`).join('')}
    ${alerts.length ? `<button class="vchip bad btnchip" data-act="tab" data-tab="now">${icon('alert', { size: 14 })}<b>${alerts.length}</b></button>` : ''}
    ${!chips.length ? `<button class="vchip btnchip" data-act="tab" data-tab="exam">${icon('activity', { size: 14 })} ${esc(t('vitalsT'))}</button>` : ''}
  </div></div>`;
}

const TABS = [['now', 'home', 'tabNow'], ['history', 'clipboard', 'tabHistory'], ['exam', 'stethoscope', 'tabExam'], ['workup', 'flask', 'tabWorkup'],
  ['think', 'bulb', 'tabThink'], ['treat', 'syringe', 'tabTreat'], ['note', 'copy', 'tabNote']];
function navHtml() {
  const danger = deriveAlerts(store.snapshotValues()).filter((a) => a.level === 'danger').length;
  return `<nav class="nav" aria-label="Case sections"><div class="nav-in">${TABS.map(([k, ic, lk]) =>
    `<button class="${ui.tab === k ? 'on' : ''}" data-act="tab" data-tab="${k}" aria-current="${ui.tab === k}">${icon(ic)}<span>${esc(t(lk))}</span>${k === 'now' && danger ? `<span class="dot">${danger}</span>` : ''}</button>`).join('')}</div></nav>`;
}

function sidePanel() {
  const text = renderCompleteCase(store, pack);
  return `<aside class="side" aria-label="${esc(t('liveNote'))}"><div class="spread"><h3>${esc(t('liveNote'))}</h3>
    <button class="btn small" data-act="copy" data-target="complete">${icon('copy')}${esc(t('copy'))}</button></div>
    <div class="doc">${esc(text)}</div></aside>`;
}

// ================================================================ screens
function homeView() {
  const list = ui.cases.map((c) => `<div class="caserow">${tile(c.demo ? 'bulb' : 'user', c.demo ? 'purple' : 'blue', 'sm')}
      <div class="grow"><b>${esc(new Date(c.updatedAt).toLocaleString())}</b>
      ${c.demo ? `<span class="badge demo">${t('demoBadge')}</span>` : ''} ${c.status === 'final' ? `<span class="badge final">${t('finalBadge')}</span>` : ''}
      <div class="muted">${esc(c.complaints.map((k) => L(complaintByKey(k)?.label) || k).join(' · ') || '—')}</div></div>
      <button class="btn small primary" data-act="open-case" data-id="${esc(c.id)}">${esc(t('open'))}</button>
      <button class="iconbtn" data-act="delete-case" data-id="${esc(c.id)}" aria-label="${esc(t('delete'))}">${icon('trash')}</button></div>`).join('');
  return `<main><div class="content stack">
    <section class="hero"><h1>${esc(t('app'))}</h1><p>${esc(t('tagline'))}</p>
      <div class="actions"><button class="btn primary" data-act="new-case">${icon('plus')}${esc(t('newPatient'))}</button>
      ${ui.lastId ? `<button class="btn" data-act="open-case" data-id="${esc(ui.lastId)}">${icon('refresh')}${esc(t('openLast'))}</button>` : ''}
      <button class="btn" data-act="demo">${icon('bulb')}${esc(t('demoCase'))}</button></div></section>
    <div class="notice">${icon('lock')}<span>${esc(t('privacy'))}</span></div>
    <div class="section-title"><h3>${esc(t('tools'))}</h3></div>
    <div class="tools">
      <button class="tool" data-act="library">${tile('calc', 'teal')}${esc(t('scoreLibrary'))}</button>
      <button class="tool" data-act="open-search">${tile('search', 'blue')}${esc(t('searchAll'))}</button>
      <button class="tool" data-act="backup">${tile('download', 'green')}${esc(t('backupNow'))}</button>
      <button class="tool" data-act="restore-backup">${tile('upload', 'slate')}${esc(t('restoreBackup'))}</button></div>
    <input type="file" id="backup-file" accept="application/json,.json" hidden>
    ${ui.cases.length ? `<div class="section-title"><h3>${esc(t('savedCases'))}</h3></div><div>${list}</div>` : ''}
    <p class="tiny">${esc(t('draftNote'))} · v${esc(APP_VERSION)} · ${esc(t('offline'))}</p></div></main>`;
}

function intakeView() {
  const speech = typeof window !== 'undefined' && ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window);
  return `<main><div class="content stack"><h2>${esc(t('newPatient'))}</h2>
    <div class="notice">${icon('lock')}<span>${esc(t('privacy'))}</span></div>
    <div class="card stack">
      <div class="field"><label for="age">${esc(t('age'))}</label>
        <input id="age" type="number" step="any" min="0" max="120" inputmode="decimal" data-bind="age" value="${esc(ui.intake.age)}"></div>
      <div class="field"><label>${esc(t('sex'))}</label><div class="seg">
        ${['male', 'female', 'unknown'].map((s) => `<button class="${ui.intake.sex === s ? 'on' : ''}" data-act="sex" data-v="${s}">${esc(t(s))}</button>`).join('')}</div></div>
      <div class="field"><label for="text">${esc(t('inYourWords'))}</label>
        <textarea id="text" data-bind="text" placeholder="55-year-old male, diabetic, crushing central chest pain for 30 minutes, sweating">${esc(ui.intake.text)}</textarea>
        ${speech ? `<button class="btn small" data-act="dictate">${icon('mic')}${esc(t('dictate'))}</button>` : ''}</div>
    </div>
    <button class="btn primary block" data-act="intake-submit">${esc(t('continue'))}</button></div></main>`;
}

function detectedView() {
  const d = ui.detected;
  const label = (k) => { const sp = specFor(k); const def = sp.question ?? sp.def; return def ? L(def.prompt).replace(/\?$/, '') : k === 'allergy.status.detail' ? (ui.lang === 'ar' ? 'تفاصيل الحساسية' : 'Allergy details') : k; };
  const val = (k, v) => (k === 'allergy.status.detail' ? String(v) : displayValue(k, v));
  return `<main><div class="content stack"><h2>${esc(ui.lang === 'ar' ? 'ما تم استخراجه من النص' : 'Detected from your text')}</h2>
    <div class="notice">${icon('shield')}<span>${esc(ui.lang === 'ar' ? 'استخراج محلي دون إنترنت. لا يُحفظ شيء قبل تأكيدك — ألغِ أي عنصر غير صحيح.' : 'Offline extraction. Nothing is saved until you confirm — untick anything that is wrong.')}</span></div>
    ${d.complaints.length ? `<h3>${esc(t('chooseComplaint'))}</h3><div class="cgrid">${d.complaints.map((c, i) => { const cc = complaintByKey(c.key); return `<button class="copt ${c.on ? 'on' : ''}" data-act="det-toggle" data-kind="c" data-i="${i}">${cTile(cc)}<span>${esc(L(cc.label))}</span>${c.on ? `<span class="tick">${icon('check')}</span>` : ''}</button>`; }).join('')}</div>` : ''}
    ${d.facts.length ? `<h3>${esc(ui.lang === 'ar' ? 'معلومات' : 'Findings')}</h3>${d.facts.map((f, i) => `<button class="scorecard" data-act="det-toggle" data-kind="f" data-i="${i}">${tile(f.on ? 'check' : 'x', f.on ? 'green' : 'slate', 'sm')}<span class="body"><span class="title">${esc(label(f.key))}</span></span><b>${esc(val(f.key, f.value))}</b></button>`).join('')}` : ''}
    <button class="btn primary block" data-act="det-apply">${icon('check')}${esc(ui.lang === 'ar' ? 'تأكيد ومتابعة' : 'Confirm and continue')}</button>
    <button class="btn ghost block" data-act="det-skip">${esc(ui.lang === 'ar' ? 'تخطي' : 'Skip')}</button></div></main>`;
}

function complaintListHtml() {
  const q = ui.search.trim().toLowerCase();
  const items = pack.complaints.filter((c) => !q || c.label.en.toLowerCase().includes(q) || c.label.ar.includes(q) || c.synonyms.some((s) => s.toLowerCase().includes(q)));
  const active = new Set(store.activeComplaints());
  return items.map((c) => `<button class="copt ${active.has(c.key) ? 'on' : ''}" data-act="toggle-complaint" data-key="${c.key}" aria-pressed="${active.has(c.key)}">
      ${cTile(c)}<span>${esc(L(c.label))}</span>${active.has(c.key) ? `<span class="tick">${icon('check')}</span>` : ''}</button>`).join('') || `<p class="muted">${esc(t('noResults'))}</p>`;
}
function complaintsView() {
  const n = store.activeComplaints().length;
  return `<main><div class="content stack"><h2>${esc(t('chooseComplaint'))}</h2>
    <p class="muted">${esc(ui.lang === 'ar' ? 'يمكن اختيار أكثر من شكوى — تبقى كلها في حالة واحدة.' : 'Select one or more — they stay in one connected case.')}</p>
    <label class="search">${icon('search')}<input id="csearch" type="search" placeholder="${esc(t('searchComplaint'))}" data-bind="search" value="${esc(ui.search)}" aria-label="${esc(t('searchComplaint'))}"></label>
    <div class="cgrid" id="clist">${complaintListHtml()}</div>
    <button class="btn primary block" data-act="start-interview" ${n ? '' : 'disabled'}>${esc(t('startInterview'))}${n ? ` (${n})` : ''}</button></div></main>`;
}

// ---------------------------------------------------------------- case: NOW dashboard
function nextInterviewKey() {
  if (ui.editKey) return { key: ui.editKey };
  const q = nextQuestion(pack, store);
  if (q) return { key: q.fact };
  const pend = pendingHistoryInputs(pack, store)[0];
  return pend ? { key: pend.key, forScore: pend.forScore } : null;
}

function nowView() {
  const v = store.snapshotValues();
  const alerts = deriveAlerts(v);
  const nxt = isFinal() ? null : nextInterviewKey();
  const inv = suggestInvestigations(pack, store).filter((x) => x.tier === 'now' && !x.status).slice(0, 4);
  const scores = relevantScores(pack, store);
  const r = reason(pack, store);
  const missing = missingInformation(pack, store).slice(0, 4);
  const nxtDef = nxt ? specFor(nxt.key) : null;
  const nxtPrompt = nxtDef ? L((nxtDef.question ?? nxtDef.def)?.prompt) : '';
  return `<div class="stack">
    <div><h2>${esc(t('whatMatters'))}</h2><span class="badge ai" style="margin-top:6px">${esc(t('aiLabel'))}</span></div>
    ${alerts.length ? alerts.map(alertHtml).join('') : `<div class="alert ok">${icon('check')}<span class="t">${esc(t('noAlerts'))}</span></div>`}
    <div class="card"><div class="card-h">${tile('clipboard', 'blue')}<h4>${esc(t('nextStep'))}</h4></div>
      ${nxt ? `<p style="font-weight:700;font-size:1.05rem">${esc(nxtPrompt)}</p>${nxt.forScore ? `<p class="tiny">${esc(t('alsoNeeded'))} ${esc(SCORE_BY_ID[nxt.forScore]?.name)}</p>` : ''}
        <button class="btn primary block" style="margin-top:12px" data-act="tab" data-tab="history">${esc(t('continueHistory'))}${icon('chevron')}</button>`
        : `<div class="row"><span class="pill ok">${icon('check')}${esc(t('historyDone'))}</span><button class="btn small" data-act="tab" data-tab="exam">${esc(t('tabExam'))}</button><button class="btn small" data-act="tab" data-tab="workup">${esc(t('tabWorkup'))}</button></div>`}</div>
    ${inv.length ? `<div class="card"><div class="card-h">${tile('flask', 'red')}<h4>${esc(t('tierNow'))}</h4><button class="btn small ghost" data-act="tab" data-tab="workup">${esc(t('seeAll'))}</button></div>
      ${inv.map((x) => `<div class="spread" style="padding:6px 0"><div class="grow"><b>${esc(L(x.label))}</b><div class="tiny">${esc(x.reasons[0].why)}</div></div>
        ${isFinal() ? '' : `<button class="btn small" data-act="inv-request" data-id="${esc(x.id)}">${esc(t('request'))}</button>`}</div>`).join('')}</div>` : ''}
    ${scores.length ? `<div class="card"><div class="card-h">${tile('calc', 'teal')}<h4>${esc(t('relevantScores'))}</h4></div>
      <div>${scores.map((s) => `<button class="mini" data-act="open-score" data-id="${s.id}"><span class="grow">${esc(SCORE_BY_ID[s.id].name)}</span>${pillFor(s.result)}</button>`).join('')}</div></div>` : ''}
    ${r.mustNotMiss.length ? `<div class="card"><div class="card-h">${tile('alert', 'orange')}<h4>${esc(t('mustNotMissShort'))}</h4><button class="btn small ghost" data-act="tab" data-tab="think">${esc(t('seeAll'))}</button></div>
      <div class="row">${r.mustNotMiss.slice(0, 6).map((d) => `<span class="chip ${store.getFact(considerKey(d.id)) ? 'green' : 'orange'}">${esc(L(d.dx))}</span>`).join('')}</div></div>` : ''}
    ${missing.length ? `<div class="card"><div class="card-h">${tile('info', 'yellow')}<h4>${esc(t('missing'))}</h4></div>
      ${missing.map((m) => `<div class="spread" style="padding:6px 0"><div class="grow"><b>${esc(m.status)}: ${esc(m.label)}</b><div class="tiny">${esc(m.why)}</div></div>
        ${isFinal() ? '' : `<button class="btn small" data-act="ask-now" data-ask="${esc(m.ask)}" data-key="${esc(m.key)}">${esc(t('askNow'))}</button>`}</div>`).join('')}</div>` : ''}
  </div>`;
}

// ---------------------------------------------------------------- case: HISTORY
function historyView() {
  if (isFinal()) return `<div class="alert ok">${icon('check')}<span class="t">${esc(t('caseComplete'))}</span></div>`;
  if (!store.activeComplaints().length) return `<div class="stack"><h2>${esc(t('chooseComplaint'))}</h2><button class="btn primary block" data-act="goto-complaints">${esc(t('chooseComplaint'))}</button></div>`;
  const p = progress(pack, store);
  const nxt = nextInterviewKey();
  const bar = `<div class="spread"><span class="tiny">${p.done} / ${p.total}</span><button class="btn small ghost" data-act="goto-complaints">${icon('plus')}${esc(t('addComplaint'))}</button></div>
    <div class="progress" role="progressbar" aria-valuemin="0" aria-valuemax="${p.total}" aria-valuenow="${p.done}"><i style="width:${p.total ? Math.round((p.done / p.total) * 100) : 0}%"></i></div>`;
  const answered = applicableQuestions(pack, store).filter(({ q }) => store.getFact(q.fact) !== undefined);
  const extra = Object.keys(FACTS).filter((k) => ['pmh', 'meds', 'social', 'family', 'sx'].includes(FACTS[k].section) && store.getFact(k) !== undefined && !answered.some(({ q }) => q.fact === k));
  const rows = [...answered.map(({ q }) => q.fact), ...extra];
  const answeredList = rows.length ? `<details class="card flat tight"><summary><b>${esc(t('answers'))} (${rows.length})</b></summary>${rows.map((k) => {
    const sp = specFor(k); const def = sp.question ?? sp.def;
    return `<div class="kv"><span>${esc(L(def?.prompt))}</span><span class="row"><b>${esc(displayValue(k, store.getFact(k)))}</b><button class="btn small" data-act="edit-q" data-key="${esc(k)}">${esc(t('change'))}</button></span></div>`;
  }).join('')}</details>` : '';
  if (!nxt) {
    return `<div class="stack">${bar}<div class="alert ok">${icon('check')}<span class="t">${esc(t('interviewDone'))}</span></div>
      <div class="row"><button class="btn" data-act="tab" data-tab="exam">${icon('stethoscope')}${esc(t('tabExam'))}</button><button class="btn" data-act="tab" data-tab="workup">${icon('flask')}${esc(t('tabWorkup'))}</button></div>${answeredList}</div>`;
  }
  const note = nxt.forScore ? `${esc(t('alsoNeeded'))} ${esc(SCORE_BY_ID[nxt.forScore]?.name)}` : '';
  return `<div class="stack">${bar}<div class="card">${questionHtml(nxt.key, { note })}</div>
    ${ui.editKey ? `<button class="btn block" data-act="cancel-edit">${esc(t('cancel'))}</button>` : ''}${answeredList}</div>`;
}

// ---------------------------------------------------------------- case: EXAM (vitals, GCS, findings)
const VT = [['bp', 'heart', 'red'], ['hr', 'pulse', 'pink'], ['rr', 'lungs', 'teal'], ['spo2', 'droplet', 'blue'], ['temp', 'thermometer', 'orange'], ['glucose', 'droplet', 'purple'], ['weight', 'user', 'slate'], ['height', 'user', 'slate']];
function vitalTile([k, ic]) {
  const v = store.snapshotValues();
  const age = v['patient.age'];
  let val; let status = ''; let trend = '';
  if (k === 'bp') {
    const s = v['vitals.sbp']; const d = v['vitals.dbp'];
    if (typeof s === 'number' && typeof d === 'number') { val = `${s}/${d}<small>mmHg</small>`; status = vitalStatus('sbp', s, age); }
    const prev = readingsOf(store, 'vitals.sbp').slice(0, -1);
    const corr = (store.getFactRecord('vitals.sbp')?.history ?? []).filter((h) => h.status === 'corrected').length;
    if (prev.length) trend = `${t('earlier')}: ${prev.slice(-2).join(', ')}`;
    if (corr) trend += `${trend ? ' · ' : ''}${corr} ${ui.lang === 'ar' ? 'تصحيح' : 'corrected'}`;
  } else {
    const x = v[`vitals.${k}`];
    if (typeof x === 'number') { val = `${x}<small>${esc(UNITS[k])}</small>`; status = vitalStatus(k, x, age); }
    const prev = readingsOf(store, `vitals.${k}`).slice(0, -1);
    if (prev.length) trend = `${t('earlier')}: ${prev.slice(-2).join(', ')}`;
  }
  const label = t(k === 'bp' ? 'bp' : k);
  return `<button class="vt ${status}" data-act="vital" data-k="${k}" ${isFinal() ? 'disabled' : ''}><span class="lab">${icon(ic)}${esc(label)}</span>
    <span class="val ${val ? '' : 'empty'}">${val ?? esc(t('tapToEnter'))}</span>${trend ? `<span class="trend">${esc(trend)}</span>` : ''}</button>`;
}

function examView() {
  if (isFinal()) return `<div class="alert ok">${icon('check')}<span class="t">${esc(t('caseComplete'))}</span></div>`;
  const v = store.snapshotValues();
  const sbp = v['vitals.sbp']; const dbp = v['vitals.dbp']; const hr = v['vitals.hr'];
  const map = calcMap(sbp, dbp);
  const pp = typeof sbp === 'number' && typeof dbp === 'number' ? sbp - dbp : null;
  const si = calcShockIndex(hr, sbp);
  const msi = typeof hr === 'number' && map ? Math.round((hr / map) * 100) / 100 : null;
  const bmi = calcBmi(v['vitals.weight'], v['vitals.height']);
  const derived = [map !== null && [t('map'), `${map} mmHg`], pp !== null && [t('pulsePressure'), `${pp} mmHg`], si !== null && [t('shockIndex'), si.toFixed(2)], msi !== null && [t('modShock'), msi.toFixed(2)], bmi !== null && [t('bmi'), bmi.toFixed(1)]].filter(Boolean);
  const o2 = v['vitals.o2device'];
  const g = { e: v['gcs.e'], v: v['gcs.v'], m: v['gcs.m'] };
  const gcs = calcGcs(g);
  const gcsRows = [['e', 'eye'], ['v', 'verbal'], ['m', 'motor']].map(([k, lk]) => `<div class="field"><label>${esc(t(lk))}</label><div class="gcsrow">${GCS_OPTIONS[k].map((o) =>
    `<button class="opt ${g[k] === o.v ? 'on' : ''}" data-act="gcs" data-k="${k}" data-v="${o.v}" title="${esc(L(o))}"><b>${o.v}</b>${esc(L(o))}</button>`).join('')}</div></div>`).join('');
  return `<div class="stack">
    <div class="section-title" style="margin-top:0"><h3>${esc(t('vitalsT'))}</h3></div>
    <div class="vgrid">${VT.map(vitalTile).join('')}</div>
    ${derived.length ? `<div class="derived">${derived.map(([l, x]) => `<span class="chip blue">${icon('calc')}${esc(l)}: ${esc(x)}</span>`).join('')}</div>` : ''}
    <div class="field"><label>${esc(t('oxygen'))}</label><div class="seg">${O2_OPTIONS.map((o) => `<button class="${o2 === o.v ? 'on' : ''}" data-act="o2" data-v="${o.v}">${esc(L(o))}</button>`).join('')}</div></div>
    <div class="card"><div class="card-h">${tile('brain', 'purple')}<h4>${esc(t('gcs'))}</h4><span class="gcs-total" aria-live="polite">${gcs.complete ? `${gcs.total}<small class="tiny">/15</small>` : ''}</span></div>
      <p class="muted" style="margin-bottom:10px">${esc(gcs.complete || g.e || g.v || g.m ? gcs.text : (ui.lang === 'ar' ? 'اختر العين والكلام والحركة — يُحسب المجموع تلقائياً.' : 'Select eye, verbal and motor — the total is calculated automatically.'))}</p>${gcsRows}</div>
    <div class="section-title"><h3>${esc(t('examFindings'))}</h3></div>
    ${pack.exam.map((s) => `<div class="card flat"><div class="card-h">${tile(s.key === 'resp' ? 'lungs' : s.key === 'cvs' ? 'heart' : 'stomach', s.key === 'resp' ? 'teal' : s.key === 'cvs' ? 'red' : 'orange', 'sm')}<h4>${esc(L(s.title))}</h4></div>
      <div class="exgrid">${s.findings.map((f) => `<button class="opt ${/normal/i.test(f.fact) ? 'normal' : 'abn'} ${store.getFact(f.fact) ? 'on' : ''}" data-act="exam" data-f="${f.fact}" aria-pressed="${!!store.getFact(f.fact)}">${esc(L(f.label))}</button>`).join('')}</div></div>`).join('')}
  </div>`;
}

// ---------------------------------------------------------------- case: WORKUP (scores, investigations, results)
const TIER_META = { now: ['tierNow', 'alert'], soon: ['tierSoon', 'clock'], consider: ['tierConsider', 'bulb'], not_routine: ['tierNotRoutine', 'x'] };
const KIND_ICON = { lab: ['flask', 'teal'], ecg: ['ecg', 'red'], imaging: ['imaging', 'slate'], bedside: ['activity', 'blue'], procedure: ['syringe', 'purple'] };

function resultKeys() {
  const keys = new Set(['ecg.heart_cat', 'ecg.rhythm']);
  for (const s of relevantScores(pack, store)) for (const inp of SCORE_BY_ID[s.id].inputs) for (const f of inp.facts ?? []) if (/^(lab|ecg)\./.test(f)) keys.add(f);
  for (const k of Object.keys(store.snapshotValues())) if (/^(lab|ecg)\./.test(k) && FACTS[k]) keys.add(k);
  return [...keys].filter((k) => FACTS[k]);
}

function workupView() {
  const scores = relevantScores(pack, store);
  const inv = suggestInvestigations(pack, store);
  const ro = isFinal();
  const scoreHtml = scores.length ? scores.map((s) => `<button class="scorecard" data-act="open-score" data-id="${s.id}">${tile('calc', 'teal', 'sm')}
      <span class="body"><span class="title">${esc(SCORE_BY_ID[s.id].name)}</span><span class="sub" style="display:block">${esc(s.why)}</span></span>${pillFor(s.result)}</button>`).join('')
    : `<p class="muted">${esc(t('noRelevant'))}</p>`;
  const tiers = ['now', 'soon', 'consider', 'not_routine'].map((tier) => {
    const items = inv.filter((x) => x.tier === tier);
    if (!items.length) return '';
    const [lk, ic] = TIER_META[tier];
    return `<div class="tier ${tier}">${icon(ic)}${esc(t(lk))}</div>${items.map((x) => {
      const [kic, ktone] = KIND_ICON[x.kind] ?? KIND_ICON.lab;
      const why = x.reasons.map((r) => `<p>${esc(r.why)}</p>${srcList(r.sources)}`).join('');
      const acts = ro || tier === 'not_routine' ? '' : x.status
        ? `<span class="pill ok">${icon('check')}${esc(t('requested'))}</span><button class="btn small ghost" data-act="inv-undo" data-id="${esc(x.id)}">${esc(t('undo'))}</button>`
        : `<button class="btn small ${tier === 'now' ? 'primary' : ''}" data-act="inv-request" data-id="${esc(x.id)}">${esc(t('request'))}</button>`;
      return `<div class="item ${x.status ? 'req' : ''}">${tile(kic, ktone, 'sm')}<div class="body"><div class="title">${esc(L(x.label))}</div><div class="sub">${esc(x.reasons[0].why)}</div>
        <details class="why"><summary>${icon('info', { size: 14 })}${esc(t('whyT'))}</summary>${why}</details></div><div class="acts">${acts}</div></div>`;
    }).join('')}`;
  }).join('');
  const rk = resultKeys();
  const labs = rk.filter((k) => k.startsWith('lab.')); const ecg = rk.filter((k) => k.startsWith('ecg.'));
  const resRow = (k) => `<button class="scorecard" data-act="ask-fact" data-key="${esc(k)}" ${ro ? 'disabled' : ''}><span class="body"><span class="title">${esc(FACTS[k].label ?? L(FACTS[k].prompt))}</span></span>
      <b>${esc(displayValue(k, store.getFact(k)))}</b>${icon('edit', { size: 18 })}</button>`;
  return `<div class="stack">
    <div class="section-title" style="margin-top:0">${tile('calc', 'teal', 'sm')}<h3>${esc(t('relevantScores'))}</h3></div>${scoreHtml}
    <div class="section-title">${tile('flask', 'red', 'sm')}<h3>${esc(t('tabWorkup'))}</h3><span class="badge ai">${esc(t('aiLabel'))}</span></div>
    ${tiers || `<p class="muted">${esc(t('noRelevant'))}</p>`}
    <div class="section-title">${tile('ecg', 'red', 'sm')}<h3>${esc(t('ecgT'))}</h3></div>${ecg.map(resRow).join('')}
    <div class="section-title">${tile('flask', 'teal', 'sm')}<h3>${esc(t('labs'))}</h3></div>${labs.length ? labs.map(resRow).join('') : `<p class="muted">—</p>`}
  </div>`;
}

// ---------------------------------------------------------------- case: THINK (differential)
function thinkView() {
  if (store.activeComplaints().length === 0) return `<p class="muted">${esc(t('thinkEmpty'))}</p>`;
  const r = reason(pack, store);
  const clusters = r.clusters.map((c) => `<div class="alert warn">${icon('bulb')}<div><span class="t">${esc(L(c.label))}</span></div></div>`).join('');
  const mnm = r.mustNotMiss.map((d) => {
    const on = store.getFact(considerKey(d.id)) !== undefined;
    const action = isFinal() ? '' : on
      ? `<button class="btn small" data-act="unconsider" data-dx="${esc(d.id)}">${esc(t('removeConsider'))}</button>`
      : `<button class="btn small primary" data-act="consider" data-dx="${esc(d.id)}" data-label="${esc(d.dx.en)}">${icon('plus')}${esc(t('addConsider'))}</button>`;
    return `<div class="item ${on ? 'req' : ''}">${tile(on ? 'check' : 'alert', on ? 'green' : 'orange', 'sm')}<div class="body"><div class="title">${esc(L(d.dx))}</div>
      <details class="why"><summary>${icon('info', { size: 14 })}${esc(t('whyT'))}</summary><p>${esc(d.why)}</p>${srcList(d.sources)}</details>${on ? `<div class="tiny">${esc(t('considered'))}</div>` : ''}</div><div class="acts">${action}</div></div>`;
  }).join('');
  return `<div class="stack"><div class="spread"><h2>${esc(t('thinkTitle'))}</h2><span class="badge ai">${esc(t('aiLabel'))}</span></div>
    <p class="tiny">${esc(t('reviewDraft'))}</p>
    ${r.clusters.length ? `<h3>${esc(t('clusters'))}</h3>${clusters}` : ''}
    <h3>${esc(t('mustNotMissT'))}</h3>${mnm || `<p class="muted">—</p>`}
    <h3>${esc(t('specialtiesT'))}</h3><div class="row">${r.specialties.map((s) => `<span class="chip purple">${esc(s)}</span>`).join('')}</div></div>`;
}

// ---------------------------------------------------------------- case: TREAT (medications, treatments, reassessment)
const RESPONSES = [['improved', 'improved'], ['partial', 'partial'], ['no_change', 'noChange'], ['worse', 'worse'], ['new_problem', 'newProblem'], ['unable', 'unableAssess']];
const FLAG_CLS = { critical: 'danger', important: 'warn', caution: 'caution', info: 'info' };
const FLAG_LBL = { critical: 'critical', important: 'important', caution: 'cautionL', info: 'infoL' };
function flagHtml(f) { return `<div class="alert ${FLAG_CLS[f.level]}">${icon(f.level === 'info' ? 'info' : 'alert')}<div><span class="t"><span class="lvl"><span>${esc(t(FLAG_LBL[f.level]))}</span></span> ${esc(f.text)}</span></div></div>`; }

function treatView() {
  const ro = isFinal();
  const sug = suggestMeds(pack, store);
  const ctx = medContext(store);
  const tx = store.timeline().filter((e) => e.type === 'treatment' || e.type === 'medication');
  const re = store.timeline().filter((e) => e.type === 'reassessment');
  const q = (ui.drugSearch ?? '').trim().toLowerCase();
  const lib = DRUGS.filter((d) => !q || d.name.toLowerCase().includes(q) || d.synonyms.some((x) => x.toLowerCase().includes(q)) || d.cls.toLowerCase().includes(q));
  const sugHtml = sug.length ? sug.map(({ drug, use, why }) => {
    const dose = calcDose(use, ctx);
    return `<button class="scorecard" data-act="open-drug" data-id="${drug.id}" data-use="${use.id}">${tile(drug.icon[0], drug.icon[1], 'sm')}
      <span class="body"><span class="title">${esc(drug.name)} — ${esc(use.label)}</span><span class="sub" style="display:block">${esc(dose.ok ? dose.text : dose.reason)}</span><span class="tiny" style="display:block">${esc(why)}</span></span>${icon('chevron')}</button>`;
  }).join('') : `<p class="muted">${esc(t('noRelevant'))}</p>`;
  return `<div class="stack">
    ${ctx.child ? `<div class="alert info">${icon('baby')}<div><span class="t">${esc(ui.lang === 'ar' ? 'وضع سلامة الأطفال مفعّل' : 'Paediatric safety mode')}</span><small>${esc(ui.lang === 'ar' ? 'تظهر جرعات الأطفال فقط، ويلزم الوزن قبل أي جرعة محسوبة بالوزن.' : 'Only paediatric doses are shown; weight is required before any weight-based dose.')}</small></div></div>` : ''}
    <div class="section-title" style="margin-top:0">${tile('syringe', 'purple', 'sm')}<h3>${esc(ui.lang === 'ar' ? 'أدوية ذات صلة' : 'Relevant medications')}</h3><span class="badge ai">${esc(t('aiLabel'))}</span></div>${sugHtml}
    <div class="section-title">${tile('pill', 'purple', 'sm')}<h3>${esc(ui.lang === 'ar' ? 'مكتبة الأدوية' : 'Medication library')}</h3></div>
    <label class="search">${icon('search')}<input id="dsearch" type="search" data-bind="dsearch" value="${esc(ui.drugSearch ?? '')}" placeholder="${esc(t('searchAll'))}" aria-label="${esc(t('searchAll'))}"></label>
    <div id="dlist">${lib.map((d) => `<button class="scorecard" data-act="open-drug" data-id="${d.id}">${tile(d.icon[0], d.icon[1], 'sm')}<span class="body"><span class="title">${esc(d.name)}</span><span class="sub" style="display:block">${esc(d.cls)}</span></span>${icon('chevron')}</button>`).join('')}</div>
    <p class="tiny">${esc(DRUG_REVIEW)}</p>
    <div class="card"><div class="card-h">${tile('clipboard', 'blue')}<h4>${esc(t('treatmentsGiven'))}</h4></div>
      ${tx.length ? `<ul class="tl">${tx.map((e) => `<li><time>${esc(formatTime(e.at))}</time><span>${esc(e.text)}</span></li>`).join('')}</ul>` : `<p class="muted">${esc(t('noEvents'))}</p>`}
      ${ro ? '' : `<div class="field" style="margin-top:12px"><label for="txtext">${esc(t('eventText'))}</label><input id="txtext" type="text" data-enter="add-treatment" placeholder="${ui.lang === 'ar' ? 'علاج آخر غير موجود في المكتبة' : 'Other treatment not in the library'}"></div>
      <button class="btn block" data-act="add-treatment">${icon('plus')}${esc(t('addEvent'))}</button>`}</div>
    <div class="card"><div class="card-h">${tile('refresh', 'green')}<h4>${esc(t('response'))}</h4></div>
      ${ro ? '' : `<div class="answers">${RESPONSES.map(([v, k]) => `<button class="opt" data-act="reassess" data-v="${v}">${esc(t(k))}</button>`).join('')}</div>`}
      ${re.length ? `<ul class="tl" style="margin-top:12px">${re.map((e) => `<li><time>${esc(formatTime(e.at))}</time><span>${esc(e.text)}</span></li>`).join('')}</ul>` : ''}</div>
  </div>`;
}

function drugSheet(sh) {
  const drug = DRUG_BY_ID[sh.id];
  const ctx = medContext(store);
  const useId = sh.use ?? drug.uses.find((u) => calcDose(u, ctx).ok || (calcDose(u, ctx).needs ?? []).length)?.id ?? drug.uses[0].id;
  const use = drug.uses.find((u) => u.id === useId);
  const dose = calcDose(use, ctx);
  const flags = safetyChecks(drug, use, ctx, store);
  const segs = drug.uses.map((u) => {
    const p = calcDose(u, ctx);
    const blocked = !p.ok && !(p.needs ?? []).length && !p.unverified;
    return `<button class="${u.id === useId ? 'on' : ''}" data-act="drug-use" data-use="${u.id}" ${blocked ? 'disabled title="' + esc(p.reason) + '"' : ''}>${esc(u.label)}${u.pop === 'paediatric' ? ' (child)' : u.pop === 'adult' ? ' (adult)' : ''}</button>`;
  }).join('');
  const needs = (dose.needs ?? []).map((k) => k === 'vitals.weight'
    ? `<button class="btn primary block" data-act="vital" data-k="weight">${icon('user')}${esc(t('weight'))}</button>`
    : `<button class="btn primary block" data-act="edit-demo" data-kind="age">${esc(t('age'))}</button>`).join('');
  const s7 = drug.seven;
  const line = (n, label, body) => `<div class="comp"><span class="pts">${n}</span><span class="grow"><b>${esc(label)}</b><br><span class="muted">${body}</span></span></div>`;
  const list = (a) => (Array.isArray(a) ? a.map((x) => esc(x)).join('<br>') : esc(a));
  const details = `<details class="card flat"><summary><b>${icon('list', { size: 16 })} ${esc(ui.lang === 'ar' ? 'تفاصيل الدواء (7 بنود)' : 'MEDICATION DETAILS (7 lines)')}</b></summary>
    ${line(1, ui.lang === 'ar' ? 'الجرعة الأولية' : 'Initial dose', esc(dose.ok ? dose.text : dose.reason))}
    ${line(2, ui.lang === 'ar' ? 'الهدف' : 'Target', list(s7.target))}
    ${line(3, ui.lang === 'ar' ? 'المعايرة' : 'Titration', list(s7.titration))}
    ${line(4, ui.lang === 'ar' ? 'الجرعة القصوى' : 'Maximum dose', list(s7.max))}
    ${line(5, ui.lang === 'ar' ? 'تعديل الجرعة حسب الأمراض المصاحبة' : 'Dose adjustment (comorbidities)', list(s7.adjust))}
    ${line(6, ui.lang === 'ar' ? 'الأعراض الجانبية وموانع الاستعمال' : 'Side effects & contraindications', list([...s7.adverse, ...s7.contraindications]))}
    ${line(7, ui.lang === 'ar' ? 'علاج الأعراض الجانبية' : 'Management of side effects', list(s7.management))}
    <div class="tiny" style="margin-top:8px">${esc(ui.lang === 'ar' ? 'المراقبة' : 'Monitoring')}: ${esc((drug.monitoring ?? []).join(' · '))}</div></details>`;
  const canRecord = !isFinal() && dose.ok;
  return `<div class="stack">
    <div class="row">${tile(drug.icon[0], drug.icon[1], 'md')}<div class="grow"><h2>${esc(drug.name)}</h2><div class="tiny">${esc(drug.cls)}</div></div></div>
    <div class="seg">${segs}</div>
    <div class="card flat"><div class="tiny" style="font-weight:800;letter-spacing:.06em">${esc(use.label.toUpperCase())} · ${esc(use.route)}</div>
      <div style="font-size:1.4rem;font-weight:900;margin-top:4px">${esc(dose.ok ? dose.text : '—')}</div>
      ${dose.calc ? `<div class="chip blue" style="margin-top:6px">${icon('calc')}${esc(dose.calc)}</div>` : ''}
      ${!dose.ok ? `<p class="muted" style="margin-top:6px">${esc(dose.reason)}</p>` : ''}
      <div class="src">${esc(citationFor(pack, use.source) ?? use.source)}<br>${esc(use.ref)}</div></div>
    ${needs}
    ${flags.map(flagHtml).join('')}
    ${details}
    ${canRecord ? `<button class="btn green block" data-act="drug-record">${icon('check')}${esc(ui.lang === 'ar' ? 'تسجيل كدواء أُعطي' : 'RECORD AS GIVEN')}</button>` : ''}
  </div>`;
}

// ---------------------------------------------------------------- case: NOTE (documents, timeline, finalize)
const DISPOSITIONS = ['Discharge home', 'Admit to ward', 'Admit to ICU', 'Observation', 'Transfer to another facility', 'Left against medical advice'];
const EVENT_TYPES = [['treatment', 'evTreatment'], ['investigation', 'evInvestigation'], ['consult', 'evConsult'], ['reassessment', 'evReassess'], ['other', 'evOther']];
function finalPanel() {
  const btn = (target, label, kind = '') => `<button class="btn ${kind} block" data-act="copy" data-target="${target}">${icon('copy')}${esc(label)}</button>`;
  return `<div class="card" style="border-color:var(--green-bd);background:var(--green-bg)"><div class="card-h">${tile('check', 'green')}<h4 style="color:var(--green)">${esc(t('caseComplete'))}</h4></div>
    <div class="stack">${btn('complete', t('copyAll'), 'primary')}
    <div class="answers">${btn('mcchis', 'COPY MCCHIS')}${btn('consultant', ui.lang === 'ar' ? 'نسخ ملخص الاستشاري' : 'COPY CONSULTANT SUMMARY')}${btn('discharge', ui.lang === 'ar' ? 'نسخ الخروج' : 'COPY DISCHARGE')}
    ${btn('referral', ui.lang === 'ar' ? 'نسخ التحويل' : 'COPY REFERRAL')}${btn('icd', 'COPY ICD-10')}${btn('timeline', ui.lang === 'ar' ? 'نسخ الخط الزمني' : 'COPY TIMELINE')}</div>
    <div class="row"><button class="btn small" data-act="backup">${icon('download')}${esc(t('backupNow'))}</button><span class="tiny">${esc(t('savedNote'))}</span></div></div></div>`;
}

function noteView() {
  const ro = isFinal();
  const modes = [['note', 'clinicalNote'], ['consultant', 'consultSummary'], ['referral', 'referral'], ['discharge', 'discharge'], ['icd', 'icd10'], ['mcchis', 'mcchis'], ['timeline', 'tabTimeline']];
  const seg = `<div class="seg">${modes.map(([m, k]) => `<button class="${ui.noteMode === m ? 'on' : ''}" data-act="note-mode" data-m="${m}">${esc(t(k))}</button>`).join('')}</div>`;
  const fin = ro ? `${finalPanel()}<button class="btn block" data-act="reopen">${esc(t('reopen'))}</button>` : '';
  const docBox = (target, label) => { let text = ''; try { text = OUTPUTS[target](store, pack); } catch (e) { text = e.message; }
    return `<div class="doc">${esc(text)}</div><button class="btn primary block" data-act="copy" data-target="${target}">${icon('copy')}${esc(label)}</button>`; };
  if (ui.noteMode === 'timeline') {
    const events = store.timeline();
    const list = events.length ? `<ul class="tl">${events.map((e) => `<li><time>${esc(formatTime(e.at))}</time><span class="grow">${esc(e.text)}${e.corrections.length ? ` <span class="tiny">(${ui.lang === 'ar' ? 'تم تعديل الوقت' : 'time corrected'})</span>` : ''}</span>
        ${ro ? '' : `<button class="btn small" data-act="event-time" data-id="${e.id}">${esc(t('changeTime'))}</button>`}</li>`).join('')}</ul>` : `<p class="muted">${esc(t('noEvents'))}</p>`;
    const form = ro ? '' : `<div class="card flat stack"><div class="seg">${EVENT_TYPES.map(([v, k]) => `<button class="${ui.evType === v ? 'on' : ''}" data-act="ev-type" data-v="${v}">${esc(t(k))}</button>`).join('')}</div>
        <div class="field"><label for="evtext">${esc(t('eventText'))}</label><input id="evtext" type="text" data-enter="add-event"></div>
        <button class="btn primary block" data-act="add-event">${esc(t('addEvent'))}</button></div>`;
    return `<div class="stack">${seg}${fin}${form}${list}<button class="btn block" data-act="copy" data-target="timeline" ${events.length ? '' : 'disabled'}>${icon('copy')}${esc(t('copy'))}</button></div>`;
  }
  if (ui.noteMode === 'consultant') return `<div class="stack">${seg}${fin}${docBox('consultant', ui.lang === 'ar' ? 'نسخ ملخص الاستشاري' : 'COPY CONSULTANT SUMMARY')}</div>`;
  if (ui.noteMode === 'mcchis') return `<div class="stack">${seg}${fin}<div class="notice">${icon('info')}<span>${esc(ui.lang === 'ar' ? 'صيغة SOAP مؤقتاً — ستُطابق نموذج MCCHIS الخاص بمستشفاك عند إرساله.' : 'SOAP layout for now — will match your hospital MCCHIS template once supplied.')}</span></div>${docBox('mcchis', 'COPY MCCHIS')}</div>`;
  if (ui.noteMode === 'referral') {
    const cur = store.getFact('referral.specialty');
    const specs = [...new Set([...suggestedSpecialties(pack, store), ...(cur ? [cur] : [])])];
    const form = ro ? '' : `<div class="card stack"><div class="field"><label>${esc(ui.lang === 'ar' ? 'التخصص' : 'Specialty')}</label><div class="answers">${specs.map((x) => `<button class="opt ${cur === x ? 'on' : ''}" data-act="ref-spec" data-v="${esc(x)}">${esc(x)}</button>`).join('')}</div>
        <input id="refother" type="text" data-save="referral.specialty" placeholder="${ui.lang === 'ar' ? 'تخصص آخر' : 'Other specialty'}" value="${specs.includes(cur) ? '' : esc(cur ?? '')}"></div>
      <div class="field"><label for="refq">${esc(ui.lang === 'ar' ? 'السؤال المحدد للاستشاري' : 'Specific question for the consultant')}</label><textarea id="refq" data-save="referral.question">${esc(store.getFact('referral.question') ?? '')}</textarea></div></div>`;
    return `<div class="stack">${seg}${fin}${form}${docBox('referral', ui.lang === 'ar' ? 'نسخ التحويل' : 'COPY REFERRAL')}</div>`;
  }
  if (ui.noteMode === 'discharge') {
    const form = ro ? '' : `<div class="card stack"><div class="field"><label for="dmeds">${esc(ui.lang === 'ar' ? 'أدوية الخروج' : 'Discharge medications')}</label><textarea id="dmeds" data-save="discharge.meds">${esc(store.getFact('discharge.meds') ?? '')}</textarea></div>
      <div class="field"><label for="dfu">${esc(ui.lang === 'ar' ? 'المتابعة' : 'Follow-up')}</label><input id="dfu" type="text" data-save="discharge.followup" value="${esc(store.getFact('discharge.followup') ?? '')}"></div>
      <p class="tiny">${esc(pack.returnPrecautionsStatus)}</p></div>`;
    return `<div class="stack">${seg}${fin}${form}${docBox('discharge', ui.lang === 'ar' ? 'نسخ الخروج' : 'COPY DISCHARGE')}
      <div class="answers"><button class="btn block" data-act="copy" data-target="patient">${icon('copy')}${esc(ui.lang === 'ar' ? 'تعليمات المريض (EN)' : 'COPY PATIENT INSTRUCTIONS (EN)')}</button>
      <button class="btn block" data-act="copy" data-target="patient_ar">${icon('copy')}${esc(ui.lang === 'ar' ? 'تعليمات المريض (عربي)' : 'COPY PATIENT INSTRUCTIONS (AR)')}</button>
      <button class="btn block" data-act="copy" data-target="followup">${icon('copy')}${esc(ui.lang === 'ar' ? 'نسخ المتابعة' : 'COPY FOLLOW-UP')}</button></div></div>`;
  }
  if (ui.noteMode === 'icd') {
    const list = icdSuggestions(store, pack);
    return `<div class="stack">${seg}${fin}<div class="notice">${icon('info')}<span>${esc(pack.icd10.system)}</span></div>
      ${list.length ? list.map((x) => `<div class="item ${x.confirmed ? 'req' : ''}">${tile('clipboard', x.kind === 'symptom' ? 'blue' : 'orange', 'sm')}<div class="body"><div class="title">${esc(x.code)} — ${esc(x.label)}</div>
        <div class="sub">${esc(x.basis)}</div><div class="tiny">${esc(x.confidence)}</div></div><div class="acts">${ro ? (x.confirmed ? `<span class="pill ok">${icon('check')}</span>` : '') : `<button class="btn small ${x.confirmed ? '' : 'primary'}" data-act="icd-toggle" data-code="${esc(x.code)}">${esc(x.confirmed ? t('undo') : t('confirm'))}</button>`}</div></div>`).join('') : `<p class="muted">—</p>`}
      <button class="btn primary block" data-act="copy" data-target="icd">${icon('copy')}COPY ICD-10</button></div>`;
  }
  const sections = buildSections(store, pack).filter((x) => !x.empty || x.core);
  const secHtml = sections.map((x) => `<section class="sec"><header><h4>${esc(x.title)}</h4>
      <button class="btn small" data-act="copy" data-target="${x.id}" ${x.empty ? 'disabled' : ''}>${icon('copy')}${esc(t('copy'))}</button></header>
      ${x.lines.length ? x.lines.map((l) => `<p>${esc(l)}</p>`).join('') : `<p class="none">Not documented.</p>`}</section>`).join('');
  const edit = ro ? '' : `<div class="card stack"><div class="card-h">${tile('edit', 'blue')}<h4>${esc(t('assessment'))}</h4></div>
      <div class="field"><label for="imp">${esc(t('impression'))}</label><textarea id="imp" data-save="assessment.impression">${esc(store.getFact('assessment.impression') ?? '')}</textarea></div>
      <div class="field"><label for="dx">${esc(t('diagnosis'))}</label><input id="dx" type="text" data-save="assessment.diagnosis" value="${esc(store.getFact('assessment.diagnosis') ?? '')}"></div>
      <div class="field"><label>${esc(t('disposition'))}</label><div class="answers">${DISPOSITIONS.map((d) => `<button class="opt ${store.getFact('disposition.decision') === d ? 'on' : ''}" data-act="dispo" data-v="${esc(d)}">${esc(d)}</button>`).join('')}</div></div>
      <button class="btn green block" data-act="finalize">${icon('check')}${esc(t('finalize'))}</button></div>`;
  return `<div class="stack">${seg}${fin}<div>${secHtml}</div>${edit}</div>`;
}

function caseView() {
  const views = { now: nowView, history: historyView, exam: examView, workup: workupView, think: thinkView, treat: treatView, note: noteView };
  const body = (views[ui.tab] ?? nowView)();
  return `${patientStrip()}<div class="shell">${navHtml()}<main><div class="content">${body}</div></main>${sidePanel()}</div>
    <div class="fab"><button class="btn primary" data-act="copy" data-target="complete">${icon('copy')}${esc(t('copyAll'))}</button></div>`;
}

// ---------------------------------------------------------------- library (calculator mode)
function libraryView() {
  const q = ui.librarySearch.trim().toLowerCase();
  const list = SCORES.filter((s) => !q || s.name.toLowerCase().includes(q) || s.use.toLowerCase().includes(q));
  return `<main><div class="content stack"><h2>${esc(t('scoreLibrary'))}</h2>
    <div class="notice">${icon('info')}<span>${esc(t('scratch'))}</span></div>
    <label class="search">${icon('search')}<input id="lsearch" type="search" data-bind="lsearch" value="${esc(ui.librarySearch)}" placeholder="${esc(t('searchAll'))}" aria-label="${esc(t('searchAll'))}"></label>
    <div id="llist">${list.map((s) => `<button class="scorecard" data-act="open-score" data-id="${s.id}" data-scratch="1">${tile('calc', 'teal', 'sm')}<span class="body"><span class="title">${esc(s.name)}</span><span class="sub" style="display:block">${esc(s.use)}</span></span>${icon('chevron')}</button>`).join('')}</div></div></main>`;
}


// ================================================================ RESUSCITATION MODE
const HS_TS = [['hypovolaemia', 'Hypovolaemia'], ['hypoxia', 'Hypoxia'], ['acidosis', 'Hydrogen ion (acidosis)'], ['potassium', 'Hypo-/hyperkalaemia'], ['hypothermia', 'Hypothermia'],
  ['tension', 'Tension pneumothorax'], ['tamponade', 'Cardiac tamponade'], ['toxins', 'Toxins'], ['pe', 'Thrombosis, pulmonary'], ['mi', 'Thrombosis, coronary']];
const resusEvents = () => (store ? store.timeline().filter((e) => e.type === 'resus') : []);
const lastOf = (kind) => resusEvents().filter((e) => e.data?.kind === kind).at(-1);
const mmss = (ms) => { const sec = Math.max(0, Math.floor(ms / 1000)); return `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`; };
function resusCtx() {
  const ctx = medContext(store);
  if (ctx.child === null) { const p = store.getFact('resus.population'); if (p) ctx.child = p === 'child'; }
  return ctx;
}
function resusDose(drugId, useAdult, useChild, which = 1) {
  const ctx = resusCtx();
  if (ctx.child === null) return { ok: false, reason: ui.lang === 'ar' ? 'اختر بالغ أو طفل' : 'Select adult or child' };
  const drug = DRUG_BY_ID[drugId];
  const use = drug.uses.find((u) => u.id === (ctx.child ? useChild : useAdult));
  if (!ctx.child && which > 1 && use.second) return { ok: true, amount: use.second.fixed, unit: use.second.unit, text: `${use.second.fixed} ${use.second.unit} ${use.route}` };
  if (ctx.child && drugId === 'amiodarone' && which > 1) {
    const r = calcDose(use, ctx); if (!r.ok) return r;
    const amt = Math.min(r.amount, 150); return { ok: true, amount: amt, unit: 'mg', text: `${+amt.toFixed(2)} mg ${use.route} (subsequent dose, max 150 mg)` };
  }
  const r = calcDose(use, ctx);
  return r.ok ? { ...r, text: r.text.replace(/\.$/, '') } : r;
}
function shockGuide() {
  const ctx = resusCtx();
  if (ctx.child === null) return '';
  if (!ctx.child) return ui.lang === 'ar' ? 'ثنائي الطور: حسب توصية الشركة (مثال 120–200 جول)، وإن لم تُعرف فاستخدم الأقصى. أحادي الطور: 360 جول.' : 'Biphasic: manufacturer recommendation (eg, initial 120–200 J); if unknown, use maximum available. Monophasic: 360 J.';
  const n = resusEvents().filter((e) => e.data?.kind === 'shock').length;
  const w = ctx.weight;
  const jkg = n === 0 ? 2 : 4;
  const calc = typeof w === 'number' ? ` = ${Math.round(jkg * w)} J` : (ui.lang === 'ar' ? ' (أدخل الوزن)' : ' (enter weight)');
  return `${n === 0 ? 'First shock 2 J/kg' : n === 1 ? 'Second shock 4 J/kg' : 'Subsequent shocks ≥4 J/kg, maximum 10 J/kg or adult dose'}${calc}`;
}
function resusView() {
  const started = lastOf('start');
  const ctx = resusCtx();
  const pop = ctx.child === null ? null : ctx.child ? 'child' : 'adult';
  const ended = lastOf('end');
  const popSeg = `<div class="seg">${[['adult', ui.lang === 'ar' ? 'بالغ' : 'Adult'], ['child', ui.lang === 'ar' ? 'طفل' : 'Child']].map(([v, l]) => `<button class="${pop === v ? 'on' : ''}" data-act="resus-pop" data-v="${v}" ${typeof store.getFact('patient.age') === 'number' ? 'disabled' : ''}>${esc(l)}</button>`).join('')}</div>`;
  const quality = `<div class="card flat"><div class="card-h">${tile('heart', 'red', 'sm')}<h4>CPR quality (2025 AHA)</h4></div>
    <p class="muted">${pop === 'child' ? 'Push fast 100–120/min; push hard ≥ 1/3 chest depth; 15:2 (2 rescuers, pre-puberty) or 30:2; with advanced airway 1 breath every 2–3 s.' : 'Push fast 100–120/min with full recoil; push hard at least 5 cm; minimise interruptions; with advanced airway 1 breath every 6 s (10/min).'}</p></div>`;
  if (!started) {
    return `<main><div class="content stack"><div class="alert danger">${icon('zap')}<div><span class="t">${esc(ui.lang === 'ar' ? 'وضع الإنعاش' : 'RESUSCITATION MODE')}</span><small>${esc(ui.lang === 'ar' ? 'كل حدث يُسجَّل بوقته تلقائياً في الخط الزمني والملاحظة.' : 'Every action is time-stamped into the timeline and the note.')}</small></div></div>
      ${popSeg}${pop === 'child' && typeof ctx.weight !== 'number' ? `<button class="btn block" data-act="vital" data-k="weight">${icon('user')}${esc(t('weight'))}</button>` : ''}
      <button class="btn danger block" style="min-height:84px;font-size:1.3rem" data-act="resus" data-kind="start" ${pop ? '' : 'disabled'}>${icon('zap')}${esc(ui.lang === 'ar' ? 'بدء الإنعاش (CPR)' : 'START CPR')}</button>${quality}</div></main>`;
  }
  const epi = resusDose('epinephrine', 'arrest', 'arrest_ped');
  const amioN = resusEvents().filter((e) => e.data?.drug === 'amiodarone').length;
  const amio = resusDose('amiodarone', 'vf', 'vf_ped', amioN + 1);
  const lidoN = resusEvents().filter((e) => e.data?.drug === 'lidocaine').length;
  const lido = resusDose('lidocaine', 'vf', 'vf_ped', lidoN + 1);
  const shocks = resusEvents().filter((e) => e.data?.kind === 'shock').length;
  const big = (act, kind, label, sub, cls = '') => `<button class="opt ${cls}" style="flex-direction:column;min-height:92px" data-act="${act}" data-kind="${kind}" ${ended ? 'disabled' : ''}><span>${esc(label)}</span>${sub ? `<span class="tiny">${esc(sub)}</span>` : ''}</button>`;
  const causes = HS_TS.map(([k, l]) => `<button class="opt ${store.getFact(`resus.cause.${k}`) ? 'on' : ''}" style="min-height:48px;font-size:.84rem" data-act="resus-cause" data-k="${k}" data-l="${esc(l)}">${esc(l)}</button>`).join('');
  const log = resusEvents().map((e) => `<li><time>${esc(formatTime(e.at))}</time><span>${esc(e.text)}</span></li>`).join('');
  return `<main><div class="content stack">
    <div class="card" style="border-color:var(--red-bd);background:var(--red-bg)"><div class="spread"><b style="color:var(--red)">${icon('zap', { size: 18 })} ${esc(ui.lang === 'ar' ? 'الإنعاش' : 'RESUSCITATION')} · ${esc(pop === 'child' ? (ui.lang === 'ar' ? 'طفل' : 'Child') : (ui.lang === 'ar' ? 'بالغ' : 'Adult'))}</b>
      <button class="btn small" data-act="resus-exit">${esc(t('close'))}</button></div>
      <div class="vgrid" style="margin-top:10px">
        <div class="vt"><span class="lab">${icon('clock')}${esc(ui.lang === 'ar' ? 'الزمن الكلي' : 'Total')}</span><span class="val" data-timer="total">--:--</span></div>
        <div class="vt"><span class="lab">${icon('refresh')}${esc(ui.lang === 'ar' ? 'دورة CPR' : 'CPR cycle')}</span><span class="val" data-timer="cycle">--:--</span><span class="trend" data-timer="cyclehint"></span></div>
        <div class="vt"><span class="lab">${icon('syringe')}${esc(ui.lang === 'ar' ? 'منذ آخر إبينفرين' : 'Since epinephrine')}</span><span class="val" data-timer="epi">--:--</span><span class="trend" data-timer="epihint"></span></div>
        <div class="vt"><span class="lab">${icon('zap')}${esc(ui.lang === 'ar' ? 'الصدمات' : 'Shocks')}</span><span class="val">${shocks}</span></div></div></div>
    <h3>${esc(ui.lang === 'ar' ? 'فحص النظم' : 'Rhythm check')}</h3>
    <div class="answers">${big('resus', 'shockable', ui.lang === 'ar' ? 'قابل للصدمة (VF/pVT)' : 'Shockable (VF/pVT)', '', '')}${big('resus', 'nonshockable', ui.lang === 'ar' ? 'غير قابل للصدمة (PEA/Asystole)' : 'Non-shockable (PEA/asystole)', '')}${big('resus', 'rosc', 'ROSC', '', 'yes')}</div>
    <h3>${esc(ui.lang === 'ar' ? 'إجراءات' : 'Actions')}</h3>
    <div class="answers">
      ${big('resus', 'shock', ui.lang === 'ar' ? 'تم إعطاء صدمة' : 'Shock delivered', shockGuide())}
      ${big('resus-drug', 'epinephrine', 'Epinephrine', epi.ok ? epi.text : epi.reason)}
      ${big('resus-drug', 'amiodarone', `Amiodarone ${amioN ? `#${amioN + 1}` : ''}`, amio.ok ? amio.text : amio.reason)}
      ${big('resus-drug', 'lidocaine', 'Lidocaine', lido.ok ? lido.text : lido.reason)}
      ${big('resus', 'airway', ui.lang === 'ar' ? 'مجرى هواء متقدم' : 'Advanced airway', '')}
      ${big('resus', 'access', ui.lang === 'ar' ? 'وصول وريدي / عظمي' : 'IV / IO access', '')}
    </div>
    <h3>${esc(ui.lang === 'ar' ? 'الأسباب القابلة للعكس' : 'Reversible causes (Hs & Ts)')}</h3><div class="exgrid">${causes}</div>
    ${quality}
    <h3>${esc(ui.lang === 'ar' ? 'السجل' : 'Log')}</h3><ul class="tl">${log}</ul>
    ${ended ? '' : `<button class="btn block" data-act="resus-end">${esc(ui.lang === 'ar' ? 'إنهاء الإنعاش' : 'End resuscitation')}</button>`}
    <p class="tiny">${esc(DRUG_REVIEW)}</p></div></main>`;
}
let resusTimer = null;
function tickResus() {
  if (ui.screen !== 'resus' || !store) return;
  const now = Date.now();
  const start = lastOf('start');
  const set = (k, v) => { const el = document.querySelector(`[data-timer="${k}"]`); if (el) el.textContent = v; };
  if (!start) return;
  const end = lastOf('end') ?? lastOf('rosc');
  set('total', mmss((end ? end.at : now) - start.at));
  const lastCheck = [lastOf('shockable'), lastOf('nonshockable'), start].filter(Boolean).sort((a, b) => b.at - a.at)[0];
  const remain = 120000 - (now - lastCheck.at);
  set('cycle', remain > 0 ? mmss(remain) : '00:00');
  set('cyclehint', remain > 0 ? '' : (ui.lang === 'ar' ? 'حان فحص النظم' : 'Rhythm check due'));
  const e = resusEvents().filter((x) => x.data?.drug === 'epinephrine').at(-1);
  if (e) {
    const dt = now - e.at; set('epi', mmss(dt));
    set('epihint', dt < 180000 ? (ui.lang === 'ar' ? 'انتظر' : 'wait') : dt <= 300000 ? (ui.lang === 'ar' ? 'مستحق الآن (3–5 دقائق)' : 'due (3–5 min)') : (ui.lang === 'ar' ? 'تجاوز 5 دقائق' : 'over 5 min'));
  } else { set('epi', '—'); set('epihint', ''); }
}

// ================================================================ sheets (bottom sheets that re-render live)
function sheetHtml() {
  const sh = ui.sheet;
  if (!sh) return '';
  let inner = '';
  if (sh.type === 'score') inner = scoreSheet(sh);
  else if (sh.type === 'vital') inner = vitalSheet(sh);
  else if (sh.type === 'ask') inner = `${questionHtml(sh.key, { st: S() })}`;
  else if (sh.type === 'search') inner = searchSheet();
  else if (sh.type === 'drug') inner = drugSheet(sh);
  return `<div class="modal-bg" data-act="close-sheet-bg"><div class="modal" role="dialog" aria-modal="true"><div class="grab"></div>
    <div class="spread" style="margin-bottom:8px"><span></span><button class="iconbtn" data-act="close-sheet" aria-label="${esc(t('close'))}">${icon('x')}</button></div>${inner}</div></div>`;
}

function scoreSheet(sh) {
  const st = S();
  const def = SCORE_BY_ID[sh.id];
  const res = evaluateById(st, sh.id);
  const next = sh.asking && !isFinalFor(st) ? nextScoreInput(pack, st, sh.id) : null;
  if (next && ['pack', 'fact', 'vital'].includes(next.kind)) {
    return `<div class="stack"><div class="row">${tile('calc', 'teal', 'sm')}<b>${esc(def.name)}</b>${pillFor(res)}</div>${questionHtml(next.key, { st })}
      <button class="btn ghost block" data-act="score-stop">${esc(t('close'))}</button></div>`;
  }
  const special = next ? `<div class="alert info">${icon('info')}<span>${esc(next.kind === 'gcs' ? t('gcs') : next.kind === 'o2' ? t('oxygen') : t('age'))} — ${esc(t('tapToEnter'))}</span></div>
      <button class="btn block" data-act="score-goto" data-kind="${next.kind}">${esc(next.kind === 'patient' ? t('age') : t('tabExam'))}</button>` : '';
  const total = res.total === null || res.total === undefined ? '' : (Number.isInteger(res.total) ? res.total : res.total.toFixed(1));
  const comps = res.components.map((c) => `<div class="comp"><span class="pts ${c.points === null ? 'miss' : c.points !== 0 ? 'pos' : ''}">${c.points === null ? esc(c.shown) : (c.points > 0 ? `+${c.points}` : c.points)}</span>
      <span class="grow">${esc(c.label)}</span><span class="tiny">${c.points === null ? '' : esc(c.shown)}</span></div>`).join('');
  return `<div class="stack">
    <div class="row">${tile('calc', 'teal', 'md')}<div class="grow"><h2>${esc(def.name)}</h2><div class="tiny">${esc(def.use)}</div></div></div>
    ${sh.scratch ? `<div class="notice">${icon('info')}<span>${esc(t('scratch'))}</span></div>` : ''}
    <div class="card flat"><div class="spread"><span class="big-result">${esc(total || (res.complete ? '' : '—'))}</span>${pillFor(res)}</div>
      ${res.complete && res.result.meaning ? `<p style="margin-top:8px">${esc(res.result.meaning)}</p>` : ''}${!res.applicable && res.reason ? `<p class="muted" style="margin-top:8px">${esc(res.reason)}</p>` : ''}</div>
    ${special}
    ${res.applicable && !res.complete && !next && !res.unknown.length ? '' : ''}
    ${res.applicable && !res.complete && !special && res.missing.length ? `<button class="btn primary block" data-act="score-ask" data-id="${sh.id}">${icon('chevron')}${esc(t('completeScore'))} (${res.missing.length + res.unknown.length})</button>` : ''}
    ${comps ? `<h3>${esc(t('components'))}</h3><div>${comps}</div>` : ''}
    <h3>${esc(t('limitations'))}</h3><ul class="muted" style="margin:0;padding-inline-start:18px">${def.limitations.map((l) => `<li>${esc(l)}</li>`).join('')}</ul>
    <h3>${esc(t('sourcesT'))}</h3>${srcList(def.sources)}<div class="tiny">${esc(t('versionT'))}: ${esc(def.version)}</div>
    ${res.complete || res.components.length ? `<button class="btn block" data-act="copy-score" data-id="${sh.id}">${icon('copy')}${esc(t('copyScore'))}</button>` : ''}
  </div>`;
}
const isFinalFor = (st) => st?.state.status === 'final';

function vitalSheet(sh) {
  const k = sh.k;
  const isBp = k === 'bp';
  const cur = isBp ? [store.getFact('vitals.sbp'), store.getFact('vitals.dbp')] : [store.getFact(`vitals.${k}`)];
  const has = cur.every((x) => typeof x === 'number');
  const mode = has ? sh.mode : 'new';
  const label = t(isBp ? 'bp' : k);
  const unit = isBp ? 'mmHg' : UNITS[k];
  const inputs = isBp
    ? `<div class="row"><input id="sv-a" class="grow" type="number" inputmode="decimal" placeholder="${esc(t('sbp'))}" aria-label="${esc(t('sbp'))}" value="${mode === 'correct' ? esc(cur[0] ?? '') : ''}" data-enter="vital-save">
       <b>/</b><input id="sv-b" class="grow" type="number" inputmode="decimal" placeholder="${esc(t('dbp'))}" aria-label="${esc(t('dbp'))}" value="${mode === 'correct' ? esc(cur[1] ?? '') : ''}" data-enter="vital-save"><span class="unit">${unit}</span></div>`
    : `<div class="numrow"><input id="sv-a" type="number" step="any" inputmode="decimal" aria-label="${esc(label)}" value="${mode === 'correct' ? esc(cur[0] ?? '') : ''}" data-enter="vital-save"><span class="unit">${esc(unit)}</span></div>`;
  const hist = (store.getFactRecord(isBp ? 'vitals.sbp' : `vitals.${k}`)?.history ?? []);
  const histHtml = hist.length ? `<h3>${esc(t('earlier'))}</h3>${hist.map((h) => `<div class="kv"><span>${esc(formatTime(h.at))} — ${esc(h.value)}</span><span class="tiny">${esc(h.status)}${h.reason ? ` · ${esc(h.reason)}` : ''}</span></div>`).join('')}` : '';
  const actions = has && !mode
    ? `<button class="btn primary block" data-act="vital-mode" data-m="new">${icon('plus')}${esc(t('newReading'))}</button>
       <button class="btn block" data-act="vital-mode" data-m="correct">${icon('edit')}${esc(t('correctMeasurement'))}</button>
       <button class="btn danger block" data-act="vital-mode" data-m="remove">${icon('trash')}${esc(t('removeCalc'))}</button>`
    : mode === 'remove'
      ? `<div class="field"><label for="sv-r">${esc(t('reason'))}</label><input id="sv-r" type="text"></div><button class="btn danger block" data-act="vital-remove">${esc(t('confirm'))}</button>`
      : `${inputs}${mode === 'correct' ? `<div class="field"><label for="sv-r">${esc(t('reason'))}</label><input id="sv-r" type="text"></div>` : ''}
         <button class="btn primary block" data-act="vital-save">${icon('check')}${esc(t('save'))}</button>`;
  return `<div class="stack"><div class="row">${tile(VT.find((x) => x[0] === k)?.[1] ?? 'activity', VT.find((x) => x[0] === k)?.[2] ?? 'blue')}<div class="grow"><h2>${esc(label)}</h2>
    ${has ? `<div class="big-result">${esc(cur.join('/'))}<small class="tiny"> ${esc(unit)}</small></div>` : ''}</div></div>
    ${mode === 'correct' ? `<p class="muted">${esc(ui.lang === 'ar' ? 'القيمة السابقة تُحفظ في السجل ولن تُستخدم في الحسابات الحالية.' : 'The previous value is kept in the record and stops being used in current calculations.')}</p>` : ''}
    ${actions}${histHtml}</div>`;
}

function searchSheet() {
  const q = ui.globalSearch.trim().toLowerCase();
  const comps = q ? pack.complaints.filter((c) => c.label.en.toLowerCase().includes(q) || c.label.ar.includes(q) || c.synonyms.some((s) => s.toLowerCase().includes(q))) : [];
  const scs = q ? SCORES.filter((s) => s.name.toLowerCase().includes(q) || s.use.toLowerCase().includes(q)) : [];
  const invs = q ? (pack.investigationCatalog ?? []).filter((x) => x.label.en.toLowerCase().includes(q) || x.label.ar.includes(q)) : [];
  const inCase = store && ui.screen === 'case';
  return `<div class="stack"><label class="search">${icon('search')}<input id="gsearch" type="search" data-bind="gsearch" value="${esc(ui.globalSearch)}" placeholder="${esc(t('searchPlaceholder'))}" aria-label="${esc(t('searchAll'))}"></label>
    <div id="gresults">${searchResults(comps, scs, invs, inCase, q)}</div></div>`;
}
function searchResults(comps, scs, invs, inCase, q) {
  if (!q) return '';
  if (!comps.length && !scs.length && !invs.length) return `<p class="muted">${esc(t('noResults'))}</p>`;
  return `${comps.map((c) => `<button class="scorecard" data-act="search-complaint" data-key="${c.key}">${cTile(c, 'sm')}<span class="body"><span class="title">${esc(L(c.label))}</span><span class="sub" style="display:block">${esc(inCase ? t('addComplaint') : t('newPatient'))}</span></span>${icon('plus')}</button>`).join('')}
    ${scs.map((s) => `<button class="scorecard" data-act="open-score" data-id="${s.id}" ${inCase ? '' : 'data-scratch="1"'}>${tile('calc', 'teal', 'sm')}<span class="body"><span class="title">${esc(s.name)}</span><span class="sub" style="display:block">${esc(s.use)}</span></span>${icon('chevron')}</button>`).join('')}
    ${invs.map((x) => `<div class="scorecard">${tile((KIND_ICON[x.kind] ?? KIND_ICON.lab)[0], (KIND_ICON[x.kind] ?? KIND_ICON.lab)[1], 'sm')}<span class="body"><span class="title">${esc(L(x.label))}</span></span></div>`).join('')}`;
}

// ================================================================ render
function render() {
  try {
    const root = $('#app');
    document.documentElement.lang = ui.lang;
    document.documentElement.dir = ui.lang === 'ar' ? 'rtl' : 'ltr';
    const active = document.activeElement;
    const keep = active && active.id && (root.contains(active) || $('#sheet').contains(active)) ? { id: active.id, s: active.selectionStart } : null;
    let body = '';
    if (ui.screen === 'library') body = libraryView();
    else if (ui.screen === 'resus' && store) body = resusView();
    else if (ui.screen === 'home' || !store) body = homeView();
    else if (ui.screen === 'intake') body = intakeView();
    else if (ui.screen === 'complaints') body = complaintsView();
    else if (ui.screen === 'detected') body = detectedView();
    else body = caseView();
    root.innerHTML = `${topBar()}${body}`;
    const mainEl = root.querySelector('main .content') ?? root.querySelector('main');
    if (mainEl) mainEl.insertAdjacentHTML('beforeend', `<div class="wm" aria-hidden="true">${esc(t('watermark'))}</div>`);
    $('#sheet').innerHTML = sheetHtml();
    if (ui.screen === 'resus') tickResus();
    if (keep) { const el = document.getElementById(keep.id); if (el) { el.focus(); try { el.setSelectionRange(keep.s, keep.s); } catch { /* not a text field */ } } }
    else if (ui.sheet) { const f = $('#sheet input'); if (f && f.type !== 'search') f.focus(); }
  } catch (e) { fail(e); }
}

// ================================================================ actions
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

/** Origin of an answer: what the patient reports vs what the clinician measures or judges. */
function originFor(key) {
  if (key.startsWith('vitals.') || key.startsWith('gcs.')) return 'measurement';
  if (key.startsWith('lab.') || key.startsWith('ecg.')) return 'investigation';
  if (/^(exam|judg)\./.test(key)) return 'clinician';
  return 'patient';
}
function setAnswer(key, value) {
  const st = S();
  const editing = ui.editKey === key || st.getFact(key) !== undefined;
  st.setFact(key, value, { origin: originFor(key), replace: editing, reason: editing ? 'Updated by clinician' : undefined });
  ui.editKey = null;
  if (ui.sheet?.type === 'ask') ui.sheet = null;
  render();
}

function validateNumber(key, v) {
  const sp = specFor(key);
  const lim = (sp.def ?? {}).limits;
  if (Number.isNaN(v)) return t('enterNumber');
  if (lim && (v < lim[0] || v > lim[1])) return `${v} is outside the plausible range ${lim[0]}–${lim[1]}. Check the entry.`;
  return null;
}

async function saveVital() {
  const k = ui.sheet.k;
  const has = k === 'bp' ? typeof store.getFact('vitals.sbp') === 'number' : typeof store.getFact(`vitals.${k}`) === 'number';
  const mode = has ? ui.sheet.mode : 'new';
  const reasonTxt = ($('#sv-r')?.value ?? '').trim();
  if (mode === 'correct' && !reasonTxt) { toast(t('reasonRequired'), true); return; }
  const a = num($('#sv-a')?.value);
  if (k === 'bp') {
    const b = num($('#sv-b')?.value);
    for (const [kk, v] of [['sbp', a], ['dbp', b]]) { const c = validateVital(kk, v); if (!c.ok) { toast(c.message, true); return; } }
    const pair = checkBpPair(a, b);
    if (!pair.ok) {
      const r = await ask({ title: t('bp'), body: `<p>${esc(pair.message)}</p>`, actions: [{ id: 'ok', label: t('confirm'), kind: 'primary' }, { id: 'cancel', label: t('cancel') }] });
      if (!r || r.action !== 'ok') return;
    }
    if (mode === 'correct') { store.correctFact('vitals.sbp', a, reasonTxt); store.correctFact('vitals.dbp', b, reasonTxt); }
    else {
      store.setFact('vitals.sbp', a, { origin: 'measurement', replace: has, reason: 'Repeat measurement' });
      store.setFact('vitals.dbp', b, { origin: 'measurement', replace: has, reason: 'Repeat measurement' });
    }
  } else {
    const c = validateVital(k, a); if (!c.ok) { toast(c.message, true); return; }
    if (mode === 'correct') store.correctFact(`vitals.${k}`, a, reasonTxt);
    else store.setFact(`vitals.${k}`, a, { origin: 'measurement', replace: has, reason: 'Repeat measurement' });
  }
  ui.sheet = ui.sheet?.back ?? null; render();
}

const handlers = {
  'lang': () => { ui.lang = ui.lang === 'ar' ? 'en' : 'ar'; try { localStorage.setItem('ufc-lang', ui.lang); } catch { /* ignore */ } render(); },
  'home': async () => { await autosave?.flush(); await refreshCases(); ui.screen = 'home'; ui.sheet = null; render(); },
  'library': () => { scratch = new CaseStore(createCase({ language: ui.lang })); ui.screen = 'library'; render(); },
  'open-search': () => { ui.globalSearch = ''; ui.sheet = { type: 'search' }; render(); },
  'close-sheet': () => { ui.sheet = null; render(); },
  'close-sheet-bg': (d, e) => { if (e.target.matches('.modal-bg')) { ui.sheet = null; render(); } },
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
  'dictate': () => {
    const R = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!R) return;
    const rec = new R(); rec.lang = ui.lang === 'ar' ? 'ar-SA' : 'en-US'; rec.interimResults = false;
    rec.onresult = (ev) => { ui.intake.text = `${ui.intake.text} ${ev.results[0][0].transcript}`.trim(); render(); };
    rec.onerror = () => toast('Dictation unavailable.', true);
    rec.start(); toast(t('dictate'));
  },
  'intake-submit': () => {
    const age = num(ui.intake.age);
    const ageUnknown = ui.intake.age === '';
    if (!ageUnknown && (Number.isNaN(age) || age < 0 || age > 120)) { toast('Age must be 0–120.', true); return; }
    const parsed = ui.intake.text.trim() ? parseIntake(ui.intake.text, pack) : null;
    if (parsed && ageUnknown && typeof parsed.age === 'number') { ui.intake.age = String(parsed.age); return handlers['intake-submit'](); }
    if (parsed && !ui.intake.sex && parsed.sex) ui.intake.sex = parsed.sex;
    if (!ui.intake.sex) { toast(t('sex'), true); return; }
    if (ageUnknown) store.markUnknown('patient.age'); else store.setFact('patient.age', age, { origin: 'clinician' });
    if (ui.intake.sex === 'unknown') store.markUnknown('patient.sex'); else store.setFact('patient.sex', ui.intake.sex, { origin: 'clinician' });
    if (ui.intake.text.trim()) store.setFact('patient.presentation', ui.intake.text.trim(), { origin: 'clinician' });
    if (parsed && (parsed.complaints.length || Object.keys(parsed.facts).length)) {
      ui.detected = { complaints: parsed.complaints.map((key) => ({ key, on: true })), facts: Object.entries(parsed.facts).map(([key, value]) => ({ key, value, on: true })) };
      ui.screen = 'detected'; render(); return;
    }
    ui.screen = 'complaints'; render();
  },
  'det-toggle': (d) => { const arr = d.kind === 'c' ? ui.detected.complaints : ui.detected.facts; arr[Number(d.i)].on = !arr[Number(d.i)].on; render(); },
  'det-skip': () => { ui.detected = null; ui.screen = 'complaints'; render(); },
  'det-apply': () => {
    const skipped = [];
    for (const c of ui.detected.complaints) if (c.on) store.addComplaint(c.key);
    for (const f of ui.detected.facts) {
      if (!f.on) continue;
      const r = store.setFact(f.key, f.value, { origin: 'clinician', reason: 'From clinician free-text entry' });
      if (!r.ok) skipped.push(f.key);
    }
    if (skipped.length) toast(`${skipped.length} item(s) conflicted with existing data and were not changed.`, true);
    ui.detected = null; ui.screen = 'complaints'; render();
  },
  'toggle-complaint': (d) => { if (store.activeComplaints().includes(d.key)) store.resolveComplaint(d.key, 'Deselected'); else store.addComplaint(d.key); },
  'search-complaint': (d) => {
    if (store && ui.screen === 'case' && !isFinal()) { store.addComplaint(d.key); ui.sheet = null; ui.tab = 'history'; render(); return; }
    ui.intake = { age: '', sex: null, text: '' };
    adopt(new CaseStore(createCase({ language: ui.lang })), 'intake');
    store.addComplaint(d.key);
  },
  'start-interview': () => { ui.screen = 'case'; ui.tab = 'history'; render(); },
  'goto-complaints': () => { ui.screen = 'complaints'; render(); },
  'tab': (d) => { ui.tab = d.tab; ui.editKey = null; ui.sheet = null; render(); window.scrollTo?.(0, 0); },
  'answer': (d) => {
    const sp = specFor(d.key);
    const def = sp.question ?? sp.def;
    let v = d.v;
    if (def.type === 'choice') {
      const o = def.options[Number(d.i)];
      if (o.needsText) { ui.pendingText = { key: d.key, i: Number(d.i), text: '' }; render(); return; }
      v = o.v;
    }
    if (def.type === 'scale') v = Number(v);
    setAnswer(d.key, v);
  },
  'answer-text': (d) => {
    const sp = specFor(d.key); const def = sp.question ?? sp.def;
    const text = ($('#ptext')?.value ?? '').trim();
    if (!text) { toast(t('reasonRequired'), true); return; }
    const st = S();
    st.setFact(d.key, def.options[ui.pendingText.i].v, { origin: 'patient', replace: true, reason: 'Updated by clinician' });
    st.setFact(`${d.key}.detail`, text, { origin: 'patient', replace: true, reason: 'Updated by clinician' });
    ui.pendingText = null; ui.editKey = null; render();
  },
  'answer-duration': (d) => {
    let val;
    if (d.custom) { const n = num(ui.custom.n); if (!(n > 0)) { toast(t('custom'), true); return; } val = { n, unit: ui.custom.unit }; } else val = { n: Number(d.n), unit: d.unit };
    setAnswer(d.key, val);
  },
  'answer-num': (d) => {
    const v = num($('#num-input')?.value);
    const err = validateNumber(d.key, v);
    if (err) { toast(err, true); return; }
    setAnswer(d.key, v);
  },
  'custom-unit': (d) => { ui.custom.unit = d.unit; render(); },
  'unknown-q': (d) => { S().markUnknown(d.key, originFor(d.key) === 'patient' ? 'patient' : 'clinician'); ui.editKey = null; if (ui.sheet?.type === 'ask') ui.sheet = null; render(); },
  'edit-q': (d) => { ui.editKey = d.key; ui.pendingText = null; ui.tab = 'history'; render(); },
  'cancel-edit': () => { ui.editKey = null; ui.pendingText = null; render(); },
  'ask-fact': (d) => { ui.sheet = { type: 'ask', key: d.key }; render(); },
  'vital': (d) => { ui.sheet = { type: 'vital', k: d.k, mode: null, back: ui.sheet?.type === 'drug' ? ui.sheet : null }; render(); },
  'vital-mode': (d) => { ui.sheet.mode = d.m; render(); },
  'vital-save': () => saveVital(),
  'vital-remove': () => {
    const r = ($('#sv-r')?.value ?? '').trim();
    if (!r) { toast(t('reasonRequired'), true); return; }
    if (ui.sheet.k === 'bp') { store.removeFact('vitals.sbp', r); store.removeFact('vitals.dbp', r); } else store.removeFact(`vitals.${ui.sheet.k}`, r);
    ui.sheet = null; render();
  },
  'o2': (d) => {
    const cur = store.getFact('vitals.o2device');
    store.setFact('vitals.o2device', d.v, { origin: 'measurement', replace: cur !== undefined && cur !== d.v, reason: 'Changed oxygen device' });
  },
  'gcs': (d) => {
    const key = `gcs.${d.k}`;
    const cur = store.getFact(key);
    store.setFact(key, Number(d.v), { origin: 'measurement', replace: cur !== undefined, reason: 'Reassessed' });
  },
  'exam': async (d) => {
    const f = examFindings.find((x) => x.fact === d.f);
    if (store.getFact(f.fact)) { store.removeFact(f.fact, 'Unselected'); return; }
    const labelOf = (key) => L(examFindings.find((x) => x.fact === key)?.label);
    await conflictFlow(f.fact, 'present', { origin: 'clinician', excludes: f.excludes }, labelOf);
  },
  'open-score': (d) => {
    const isScratch = !!d.scratch || !store || ui.screen !== 'case';
    if (isScratch && !scratch) scratch = new CaseStore(createCase({ language: ui.lang }));
    ui.sheet = { type: 'score', id: d.id, scratch: isScratch, asking: false }; render();
  },
  'score-ask': () => { ui.sheet.asking = true; render(); },
  'score-stop': () => { ui.sheet.asking = false; render(); },
  'score-goto': (d) => {
    if (ui.sheet?.scratch) { toast(d.kind === 'patient' ? t('age') : t('tabExam')); if (d.kind === 'patient') { handlers['scratch-age'](); } return; }
    ui.sheet = null;
    if (d.kind === 'patient') { handlers['edit-demo']({ kind: 'age' }); return; }
    ui.tab = 'exam'; render();
  },
  'scratch-age': async () => {
    const r = await numberDialog(t('age'), t('age'), false, ''); if (!r || r.action !== 'ok') return;
    const v = num(r.values.value); if (!(v >= 0 && v <= 120)) { toast('Age must be 0–120.', true); return; }
    scratch.setFact('patient.age', v, { origin: 'clinician', replace: true }); render();
  },
  'copy-score': (d) => writeClipboard(scoreText(evaluateById(S(), d.id))),
  'inv-request': (d) => {
    const cat = (pack.investigationCatalog ?? []).find((x) => x.id === d.id);
    store.setFact(invKey(d.id), 'requested', { origin: 'clinician' });
    store.addEvent({ type: 'investigation', text: `${cat?.doc ?? d.id} requested` });
  },
  'inv-undo': (d) => { store.removeFact(invKey(d.id), 'Request withdrawn'); },
  'resus-open': () => {
    if (!store || isFinal()) adopt(new CaseStore(createCase({ language: ui.lang })), 'resus');
    ui.screen = 'resus'; ui.sheet = null; render();
  },
  'resus-exit': () => { ui.screen = store.activeComplaints().length || store.state.events.length ? 'case' : 'case'; ui.tab = 'note'; render(); },
  'resus-pop': (d) => { const cur = store.getFact('resus.population'); store.setFact('resus.population', d.v, { origin: 'clinician', replace: cur !== undefined, reason: 'Changed' }); },
  'resus': async (d) => {
    const TXT = { start: 'Cardiac arrest — CPR started.', shockable: 'Rhythm check: shockable rhythm (VF/pulseless VT).', nonshockable: 'Rhythm check: non-shockable rhythm (PEA/asystole).',
      rosc: 'Return of spontaneous circulation (ROSC).', airway: 'Advanced airway placed.', access: 'IV/IO access obtained.' };
    if (d.kind === 'shock') {
      const n = resusEvents().filter((e) => e.data?.kind === 'shock').length + 1;
      const r = await ask({ title: ui.lang === 'ar' ? 'طاقة الصدمة' : 'Shock energy', body: `<p class="muted">${esc(shockGuide())}</p>`, fields: [{ name: 'j', label: 'Joules', type: 'number' }],
        actions: [{ id: 'ok', label: t('confirm'), kind: 'danger', needs: ['j'] }, { id: 'cancel', label: t('cancel') }] });
      if (!r || r.action !== 'ok') return;
      store.addEvent({ type: 'resus', text: `Shock ${n} delivered at ${r.values.j} J.`, data: { kind: 'shock', joules: num(r.values.j) } });
      return;
    }
    store.addEvent({ type: 'resus', text: TXT[d.kind], data: { kind: d.kind } });
  },
  'resus-drug': async (d) => {
    const map = { epinephrine: ['arrest', 'arrest_ped'], amiodarone: ['vf', 'vf_ped'], lidocaine: ['vf', 'vf_ped'] }[d.kind];
    const n = resusEvents().filter((e) => e.data?.drug === d.kind).length + 1;
    const dose = resusDose(d.kind, map[0], map[1], n);
    if (!dose.ok) { toast(dose.reason, true); return; }
    if (d.kind === 'amiodarone' && resusCtx().child && n > 3) { toast('Maximum 3 doses (2025 AHA PALS).', true); return; }
    const drugU = DRUG_BY_ID[d.kind].uses.find((u) => u.id === (resusCtx().child ? map[1] : map[0]));
    const shown = typeof dose.amount === 'number' ? `${+dose.amount.toFixed(3)} ${dose.unit} ${drugU.route}` : dose.text.split(',')[0];
    store.addEvent({ type: 'resus', text: `${DRUG_BY_ID[d.kind].name} ${shown} given (dose ${n}).`, data: { kind: 'drug', drug: d.kind, amount: dose.amount, unit: dose.unit } });
  },
  'resus-cause': (d) => {
    const key = `resus.cause.${d.k}`;
    if (store.getFact(key)) store.removeFact(key, 'Unmarked'); else { store.setFact(key, 'considered', { origin: 'clinician' }); store.addEvent({ type: 'resus', text: `Reversible cause considered: ${d.l}.`, data: { kind: 'cause' } }); }
  },
  'resus-end': async () => {
    const r = await ask({ title: ui.lang === 'ar' ? 'إنهاء الإنعاش' : 'End resuscitation', fields: [{ name: 'reason', label: t('reason') }], actions: [{ id: 'ok', label: t('confirm'), kind: 'danger', needs: ['reason'] }, { id: 'cancel', label: t('cancel') }] });
    if (!r || r.action !== 'ok') return;
    store.addEvent({ type: 'resus', text: `Resuscitation ended. ${r.values.reason}.`, data: { kind: 'end' } });
  },
  'open-drug': (d) => { ui.sheet = { type: 'drug', id: d.id, use: d.use || null }; render(); },
  'drug-use': (d) => { ui.sheet.use = d.use; render(); },
  'drug-record': async () => {
    const drug = DRUG_BY_ID[ui.sheet.id];
    const ctx = medContext(store);
    const use = drug.uses.find((u) => u.id === (ui.sheet.use ?? drug.uses[0].id)) ?? drug.uses[0];
    const dose = calcDose(use, ctx);
    if (!dose.ok) return;
    const flags = safetyChecks(drug, use, ctx, store);
    let amount = dose.amount; let doseText = dose.amount !== undefined ? `${+amount.toFixed(3)} ${dose.unit}` : null;
    const critical = flags.filter((f) => f.level === 'critical');
    if (critical.length || doseText === null) {
      const r = await ask({
        title: critical.length ? t('critical') : (ui.lang === 'ar' ? 'الجرعة المعطاة' : 'Dose given'),
        body: critical.map(flagHtml).join(''),
        fields: [...(doseText === null ? [{ name: 'dose', label: `${ui.lang === 'ar' ? 'الجرعة المعطاة فعلياً' : 'Actual dose given'} (${dose.unit})`, type: 'number' }] : []), ...(critical.length ? [{ name: 'reason', label: t('reason') }] : [])],
        actions: [{ id: 'ok', label: t('confirm'), kind: critical.length ? 'danger' : 'primary', needs: [...(doseText === null ? ['dose'] : []), ...(critical.length ? ['reason'] : [])] }, { id: 'cancel', label: t('cancel') }],
      });
      if (!r || r.action !== 'ok') return;
      if (doseText === null) { amount = num(r.values.dose); if (!(amount > 0)) { toast(t('enterNumber'), true); return; } doseText = `${amount} ${dose.unit}`; }
      if (critical.length) store.addEvent({ type: 'other', text: `Safety override for ${drug.name}: ${critical.map((f) => f.text).join(' ')} Reason: ${r.values.reason}.` });
    }
    store.addEvent({ type: 'medication', text: `${drug.name} ${doseText} ${use.route} given (${use.label.toLowerCase()}).`, data: { drug: drug.id, use: use.id, amount, unit: dose.unit } });
    ui.sheet = null; toast(ui.lang === 'ar' ? 'تم التسجيل' : 'Recorded'); render();
  },
  'dispo': (d) => {
    const cur = store.getFact('disposition.decision');
    store.setFact('disposition.decision', d.v, { origin: 'clinician', replace: cur !== undefined, reason: 'Updated by clinician' });
  },
  'copy': (d) => copy(d.target),
  'note-mode': (d) => { ui.noteMode = d.m; render(); },
  'ref-spec': (d) => { const cur = store.getFact('referral.specialty'); store.setFact('referral.specialty', d.v, { origin: 'clinician', replace: cur !== undefined, reason: 'Updated by clinician' }); },
  'icd-toggle': (d) => { const k = `icd.${d.code}`; if (store.getFact(k)) store.removeFact(k, 'Unconfirmed by clinician'); else store.setFact(k, 'confirmed', { origin: 'clinician' }); },
  'ev-type': (d) => { ui.evType = d.v; render(); },
  'add-event': () => { const text = ($('#evtext')?.value ?? '').trim(); if (text) store.addEvent({ type: ui.evType, text }); },
  'add-treatment': () => { const text = ($('#txtext')?.value ?? '').trim(); if (text) store.addEvent({ type: 'treatment', text }); },
  'reassess': (d) => {
    const TXT = { improved: 'Patient reassessed following treatment with symptomatic improvement.', partial: 'Patient reassessed following treatment with partial symptomatic improvement.',
      no_change: 'Patient reassessed following treatment with no change in symptoms.', worse: 'Patient reassessed following treatment; condition has worsened.',
      new_problem: 'Patient reassessed; a new problem has been identified.', unable: 'Reassessment attempted; response could not be assessed.' };
    const cur = store.getFact('reassess.response');
    store.setFact('reassess.response', d.v, { origin: 'clinician', replace: cur !== undefined, reason: 'Reassessed' });
    store.addEvent({ type: 'reassessment', text: TXT[d.v] });
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
    if (d.ask === 'vitals') { ui.tab = 'exam'; render(); return; }
    ui.editKey = d.key; ui.tab = 'history'; render();
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
  'consider': (d) => { store.setFact(considerKey(d.dx), d.label, { origin: 'ai_confirmed', reason: 'Added to assessment by clinician' }); },
  'unconsider': (d) => { store.removeFact(considerKey(d.dx), 'Removed by clinician'); },
  'save-version': () => { store.saveVersion('updated'); toast(t('saveVersion')); render(); },
  'restore-version': async (d) => {
    const r = await ask({ title: t('restore'), actions: [{ id: 'ok', label: t('restore'), kind: 'primary' }, { id: 'cancel', label: t('cancel') }] });
    if (r?.action === 'ok') store.restoreVersion(d.id);
  },
  'finalize': async () => {
    const check = documentationCheck(store, pack);
    const body = check.issues.map((i) => `<div class="alert ${i.level === 'error' ? 'danger' : i.level === 'warn' ? 'warn' : 'info'}">${icon(i.level === 'error' ? 'alert' : 'info')}<span>${esc(i.text)}</span></div>`).join('');
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
    a.download = `clinical-copilot-backup-${new Date().toISOString().replace(/[:T]/g, '-').slice(0, 16)}.json`;
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
  if (el.disabled) return;
  try { await fn(el.dataset, e); } catch (err) { fail(err); }
}

function onInput(e) {
  const b = e.target.dataset.bind;
  if (!b) return;
  if (b === 'age') ui.intake.age = e.target.value;
  else if (b === 'text') ui.intake.text = e.target.value;
  else if (b === 'cn') ui.custom.n = e.target.value;
  else if (b === 'ptext' && ui.pendingText) ui.pendingText.text = e.target.value;
  else if (b === 'search') { ui.search = e.target.value; const list = $('#clist'); if (list) list.innerHTML = complaintListHtml(); }
  else if (b === 'dsearch') { ui.drugSearch = e.target.value; const keep = e.target.selectionStart; render(); const el = $('#dsearch'); if (el) { el.focus(); el.setSelectionRange(keep, keep); } }
  else if (b === 'lsearch') { ui.librarySearch = e.target.value; const keep = e.target.selectionStart; render(); const el = $('#lsearch'); if (el) { el.focus(); el.setSelectionRange(keep, keep); } }
  else if (b === 'gsearch') {
    ui.globalSearch = e.target.value;
    const q = ui.globalSearch.trim().toLowerCase();
    const comps = q ? pack.complaints.filter((c) => c.label.en.toLowerCase().includes(q) || c.label.ar.includes(q) || c.synonyms.some((s) => s.toLowerCase().includes(q))) : [];
    const scs = q ? SCORES.filter((s) => s.name.toLowerCase().includes(q) || s.use.toLowerCase().includes(q)) : [];
    const invs = q ? (pack.investigationCatalog ?? []).filter((x) => x.label.en.toLowerCase().includes(q) || x.label.ar.includes(q)) : [];
    const box = $('#gresults'); if (box) box.innerHTML = searchResults(comps, scs, invs, store && ui.screen === 'case', q);
  }
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
  if (e.key === 'Escape' && ui.sheet) { ui.sheet = null; render(); return; }
  if (e.key !== 'Enter') return;
  const act = e.target.dataset?.enter;
  if (act && handlers[act]) { e.preventDefault(); Promise.resolve(handlers[act](e.target.dataset, e)).catch(fail); }
}

// ================================================================ boot
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
  resusTimer = setInterval(tickResus, 1000);
  render();
  if (!ui.storageOk) toast('Storage unavailable: data will not persist after closing.', true);
  window.__UFC = { ui, get store() { return store; }, pack, version: APP_VERSION, copy: (target) => copyText(store, pack, target) };
}
boot();
