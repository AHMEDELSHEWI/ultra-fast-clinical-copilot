// Clinical case state: single source of truth, provenance, corrections, audit, versions.
//
// Design rules (from the master spec):
//  * A fact is entered once and read everywhere (getFact).
//  * Every fact carries its origin. AI output never becomes a fact until the clinician accepts it.
//  * Corrections never destroy history: the previous value moves to fact.history and an audit entry is written.
//  * "Current" views only ever see ACTIVE facts. Corrected/removed values cannot drive alerts or notes.
//  * Wording: the UI says "Correct measurement" / "Remove from current calculations" (never "invalidate").

export const SCHEMA_VERSION = 1;
export const ORIGINS = Object.freeze([
  'clinician', 'patient', 'measurement', 'investigation', 'device', 'ai_confirmed',
]);

let idCounter = 0;
export function newId(prefix, now) {
  idCounter += 1;
  return `${prefix}_${now.toString(36)}${idCounter.toString(36)}${Math.floor(Math.random() * 1296).toString(36)}`;
}

const clone = (v) => (v === undefined ? undefined : structuredClone(v));
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

export function createCase({ now = Date.now(), language = 'en', demo = false, id } = {}) {
  return {
    schema: SCHEMA_VERSION,
    id: id ?? newId('case', now),
    status: 'draft', // draft | final
    demo,
    language,
    createdAt: now,
    updatedAt: now,
    facts: {}, // key -> Fact
    complaints: [], // [{ key, status: 'active' | 'resolved', addedAt }]
    suggestions: {}, // key -> { value, source, at }  (AI suggestions, never facts)
    events: [], // timeline
    audit: [],
    versions: [], // [{ id, kind, label, at, snapshot }]
  };
}

/** Fact: { key, value, origin, status, at, history[] }.  status: active | unknown | removed */
export class CaseStore {
  constructor(initial, { clock = () => Date.now(), by = 'clinician' } = {}) {
    this.state = initial ?? createCase({ now: clock() });
    this.clock = clock;
    this.by = by;
    this.listeners = new Set();
  }

  // ---------- subscriptions ----------
  subscribe(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }
  _emit() {
    this.state.updatedAt = this.clock();
    for (const fn of this.listeners) fn(this.state);
  }
  _audit(action, key, previous, next, reason) {
    this.state.audit.push({
      at: this.clock(), by: this.by, action, key,
      previous: clone(previous), next: clone(next), reason: reason ?? null,
    });
  }
  _guardEditable() {
    if (this.state.status === 'final') {
      throw new Error('Case is finalized. Reopen it before editing.');
    }
  }

  // ---------- reading ----------
  /** Current authoritative value, or undefined when absent / unknown / removed. */
  getFact(key) {
    const f = this.state.facts[key];
    return f && f.status === 'active' ? f.value : undefined;
  }
  getFactRecord(key) {
    return this.state.facts[key] ? clone(this.state.facts[key]) : undefined;
  }
  /** answered = has a value OR was explicitly marked unknown. */
  isAnswered(key) {
    const f = this.state.facts[key];
    return !!f && (f.status === 'active' || f.status === 'unknown');
  }
  isUnknown(key) {
    return this.state.facts[key]?.status === 'unknown';
  }
  /** Plain map of current active values (what alerts, scores and notes may use). */
  snapshotValues() {
    const out = {};
    for (const [k, f] of Object.entries(this.state.facts)) if (f.status === 'active') out[k] = clone(f.value);
    return out;
  }

  // ---------- writing facts ----------
  /**
   * Set a fact. If a different active value exists, nothing is changed and a conflict is returned
   * so the caller can ask the clinician (replace / keep / cancel). Never silently overwritten.
   * `excludes` lists keys that are mutually exclusive with this one when it is truthy.
   */
  setFact(key, value, { origin = 'clinician', replace = false, keepBoth = false, reason, excludes = [] } = {}) {
    this._guardEditable();
    if (!ORIGINS.includes(origin)) throw new Error(`Unknown origin: ${origin}`);
    const existing = this.state.facts[key];

    if (existing && existing.status === 'active' && !same(existing.value, value)) {
      if (!replace) {
        return { ok: false, conflict: { key, previous: clone(existing.value), incoming: clone(value) } };
      }
      return this._supersede(key, value, origin, reason ?? 'Replaced by clinician', 'replace');
    }
    if (keepBoth && !String(reason ?? '').trim()) {
      throw new Error('An explanation is required to keep two conflicting findings.');
    }
    if (value && excludes.length && !keepBoth) {
      for (const other of excludes) {
        const o = this.state.facts[other];
        if (o && o.status === 'active' && o.value && !replace) {
          return { ok: false, conflict: { key, previous: { key: other, value: clone(o.value) }, incoming: clone(value), with: other } };
        }
      }
      if (replace) for (const other of excludes) if (this.getFact(other)) this.removeFact(other, 'Conflicting finding replaced');
    }
    if (existing && existing.status === 'active') return { ok: true, unchanged: true };

    const at = this.clock();
    const history = existing ? existing.history : [];
    this.state.facts[key] = { key, value: clone(value), origin, status: 'active', at, history };
    if (keepBoth) this.state.facts[key].note = String(reason).trim();
    this._audit(keepBoth ? 'set-conflict-kept' : 'set', key, existing?.value, value, reason);
    this._emit();
    return { ok: true };
  }

  _supersede(key, value, origin, reason, action) {
    const f = this.state.facts[key];
    const at = this.clock();
    f.history.push({ value: clone(f.value), origin: f.origin, at: f.at, endedAt: at, status: action === 'correct' ? 'corrected' : 'replaced', reason });
    const previous = f.value;
    f.value = clone(value);
    f.origin = origin;
    f.status = 'active';
    f.at = at;
    this._audit(action, key, previous, value, reason);
    this._emit();
    return { ok: true };
  }

  /** "Correct measurement": new authoritative value; previous kept in history. */
  correctFact(key, value, reason, origin) {
    this._guardEditable();
    const f = this.state.facts[key];
    if (!f || f.status !== 'active') throw new Error(`No current value to correct: ${key}`);
    if (!reason || !String(reason).trim()) throw new Error('A reason is required to correct a recorded value.');
    return this._supersede(key, value, origin ?? f.origin, reason, 'correct');
  }

  /** "Remove from current calculations": value stays in history, stops driving anything. */
  removeFact(key, reason) {
    this._guardEditable();
    const f = this.state.facts[key];
    if (!f || f.status === 'removed') return { ok: true, unchanged: true };
    const at = this.clock();
    f.history.push({ value: clone(f.value), origin: f.origin, at: f.at, endedAt: at, status: 'removed', reason: reason ?? null });
    const previous = f.value;
    f.value = undefined;
    f.status = 'removed';
    f.at = at;
    this._audit('remove', key, previous, undefined, reason);
    this._emit();
    return { ok: true };
  }

  /** Asked, but the answer could not be obtained. Different from "not asked yet". */
  markUnknown(key, origin = 'clinician') {
    this._guardEditable();
    const f = this.state.facts[key];
    if (f && f.status === 'active') return { ok: false, error: 'A value already exists.' };
    const at = this.clock();
    this.state.facts[key] = { key, value: undefined, origin, status: 'unknown', at, history: f ? f.history : [] };
    this._audit('unknown', key, undefined, undefined, null);
    this._emit();
    return { ok: true };
  }

  // ---------- complaints (one connected case) ----------
  addComplaint(key) {
    this._guardEditable();
    const c = this.state.complaints.find((x) => x.key === key);
    if (c) {
      if (c.status === 'active') return { ok: true, unchanged: true };
      c.status = 'active';
    } else {
      this.state.complaints.push({ key, status: 'active', addedAt: this.clock() });
    }
    this._audit('complaint+', key, undefined, key, null);
    this._emit();
    return { ok: true };
  }
  resolveComplaint(key, reason) {
    this._guardEditable();
    const c = this.state.complaints.find((x) => x.key === key);
    if (!c || c.status === 'resolved') return { ok: true, unchanged: true };
    c.status = 'resolved';
    this._audit('complaint-', key, key, undefined, reason);
    this._emit();
    return { ok: true };
  }
  activeComplaints() {
    return this.state.complaints.filter((c) => c.status === 'active').map((c) => c.key);
  }

  // ---------- AI suggestions: never facts until accepted ----------
  suggest(key, value, source) {
    this._guardEditable();
    this.state.suggestions[key] = { value: clone(value), source: source ?? 'AI', at: this.clock() };
    this._audit('suggest', key, undefined, value, source ?? 'AI');
    this._emit();
  }
  acceptSuggestion(key) {
    const s = this.state.suggestions[key];
    if (!s) throw new Error(`No suggestion for ${key}`);
    const res = this.setFact(key, s.value, { origin: 'ai_confirmed', reason: `Accepted AI suggestion (${s.source})` });
    if (res.ok) { delete this.state.suggestions[key]; this._emit(); }
    return res;
  }
  rejectSuggestion(key, reason) {
    if (!this.state.suggestions[key]) return;
    this._audit('suggestion-rejected', key, this.state.suggestions[key].value, undefined, reason);
    delete this.state.suggestions[key];
    this._emit();
  }

  // ---------- timeline ----------
  addEvent({ type, text, at }) {
    this._guardEditable();
    const when = at ?? this.clock();
    const ev = { id: newId('ev', when), type, text, at: when, recordedAt: this.clock(), corrections: [] };
    this.state.events.push(ev);
    this._audit('event+', ev.id, undefined, { type, text, at: when }, null);
    this._emit();
    return ev;
  }
  /** Timestamp correction is recorded; the original time is never lost. */
  correctEventTime(id, newAt, reason) {
    this._guardEditable();
    const ev = this.state.events.find((e) => e.id === id);
    if (!ev) throw new Error(`Unknown event ${id}`);
    if (!reason || !String(reason).trim()) throw new Error('A reason is required to change a recorded time.');
    ev.corrections.push({ from: ev.at, to: newAt, reason, at: this.clock() });
    this._audit('event-time', id, ev.at, newAt, reason);
    ev.at = newAt;
    this._emit();
  }
  timeline() {
    return [...this.state.events].sort((a, b) => a.at - b.at);
  }

  // ---------- versions ----------
  _snapshot() {
    const { versions, audit, ...rest } = this.state; // eslint-disable-line no-unused-vars
    return clone(rest);
  }
  saveVersion(kind = 'updated', label) {
    const v = { id: newId('v', this.clock()), kind, label: label ?? kind, at: this.clock(), snapshot: this._snapshot() };
    this.state.versions.push(v);
    this._audit('version', v.id, undefined, kind, label);
    return v.id;
  }
  /** Restoring creates a new "updated" version first, so nothing is lost. */
  restoreVersion(id) {
    const v = this.state.versions.find((x) => x.id === id);
    if (!v) throw new Error(`Unknown version ${id}`);
    this.saveVersion('updated', 'Before restore');
    const keep = { versions: this.state.versions, audit: this.state.audit };
    this.state = { ...clone(v.snapshot), ...keep, status: 'draft' };
    this._audit('restore', id, undefined, v.kind, null);
    this._emit();
  }

  finalize() {
    this._guardEditable();
    this.saveVersion('final', 'Final');
    this.state.status = 'final';
    this._audit('finalize', 'case', 'draft', 'final', null);
    this._emit();
  }
  reopen(reason) {
    if (this.state.status !== 'final') return;
    if (!reason || !String(reason).trim()) throw new Error('A reason is required to reopen a finalized case.');
    this.state.status = 'draft';
    this._audit('reopen', 'case', 'final', 'draft', reason);
    this._emit();
  }
}
