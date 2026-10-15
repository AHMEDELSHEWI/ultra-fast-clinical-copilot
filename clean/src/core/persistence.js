// Local-first persistence. Patient data never leaves the device.
// Adapters share one tiny interface so the same logic runs on IndexedDB (browser) and memory (tests).

export const APP_VERSION = '2.4.0-beta.1';
export const BACKUP_FORMAT = 'UFC_BACKUP';

export class MemoryAdapter {
  constructor() { this.m = new Map(); }
  async get(k) { return this.m.get(k); }
  async put(k, v) { this.m.set(k, structuredClone(v)); }
  async delete(k) { this.m.delete(k); }
  async all() { return [...this.m.entries()].map(([key, value]) => ({ key, value: structuredClone(value) })); }
}

export class IndexedDbAdapter {
  constructor(name = 'ufc-v2', idb = globalThis.indexedDB) { this.name = name; this.idb = idb; this._db = null; }
  _open() {
    if (this._db) return this._db;
    this._db = new Promise((resolve, reject) => {
      const req = this.idb.open(this.name, 1);
      req.onupgradeneeded = () => req.result.createObjectStore('kv');
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    return this._db;
  }
  async _tx(mode, fn) {
    const db = await this._open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('kv', mode);
      const res = fn(tx.objectStore('kv'));
      tx.oncomplete = () => resolve(res.result);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  }
  get(k) { return this._tx('readonly', (s) => s.get(k)); }
  put(k, v) { return this._tx('readwrite', (s) => s.put(v, k)); }
  delete(k) { return this._tx('readwrite', (s) => s.delete(k)); }
  async all() {
    const db = await this._open();
    return new Promise((resolve, reject) => {
      const out = [];
      const req = db.transaction('kv', 'readonly').objectStore('kv').openCursor();
      req.onsuccess = () => {
        const c = req.result;
        if (c) { out.push({ key: c.key, value: c.value }); c.continue(); } else resolve(out);
      };
      req.onerror = () => reject(req.error);
    });
  }
}

const caseKey = (id) => `case:${id}`;

export class Persistence {
  constructor(adapter, { clock = () => Date.now() } = {}) { this.a = adapter; this.clock = clock; }

  async saveCase(state) {
    await this.a.put(caseKey(state.id), state);
    await this.a.put('meta:lastCaseId', state.id);
  }
  async loadCase(id) { return (await this.a.get(caseKey(id))) ?? null; }
  async lastCaseId() { return (await this.a.get('meta:lastCaseId')) ?? null; }
  async loadLast() { const id = await this.lastCaseId(); return id ? this.loadCase(id) : null; }
  async listCases() {
    const rows = (await this.a.all()).filter((r) => r.key.startsWith('case:')).map((r) => r.value);
    return rows.sort((x, y) => y.updatedAt - x.updatedAt)
      .map((c) => ({ id: c.id, updatedAt: c.updatedAt, status: c.status, demo: c.demo, complaints: c.complaints.map((x) => x.key) }));
  }
  async deleteCase(id) {
    await this.a.delete(caseKey(id));
    if ((await this.lastCaseId()) === id) await this.a.delete('meta:lastCaseId');
  }

  /** Backups are plain exports; nothing is overwritten on import (id clashes become copies). */
  async exportBackup(contentVersion) {
    const cases = [];
    for (const r of await this.a.all()) if (r.key.startsWith('case:')) cases.push(r.value);
    return { format: BACKUP_FORMAT, appVersion: APP_VERSION, contentVersion: contentVersion ?? null, exportedAt: this.clock(), cases };
  }
  async importBackup(backup) {
    if (!backup || backup.format !== BACKUP_FORMAT || !Array.isArray(backup.cases)) throw new Error('This file is not a Clinical Copilot backup.');
    let added = 0;
    let copies = 0;
    for (const c of backup.cases) {
      if (!c || typeof c.id !== 'string' || typeof c.facts !== 'object') continue;
      const incoming = structuredClone(c);
      if (await this.a.get(caseKey(incoming.id))) {
        incoming.id = `${incoming.id}-restored-${this.clock().toString(36)}`;
        copies += 1;
      }
      await this.a.put(caseKey(incoming.id), incoming);
      added += 1;
    }
    return { added, copies };
  }
}

/** Debounced autosave. flush() is called on page hide so nothing typed is lost. */
export function attachAutosave(store, persistence, { delay = 250, onError = () => {} } = {}) {
  let timer = null;
  let dirty = false;
  const run = async () => {
    timer = null;
    if (!dirty) return;
    dirty = false;
    try { await persistence.saveCase(store.state); } catch (e) { dirty = true; onError(e); }
  };
  const off = store.subscribe(() => { dirty = true; if (!timer) timer = setTimeout(run, delay); });
  return { flush: () => { if (timer) { clearTimeout(timer); } return run(); }, stop: () => { off(); if (timer) clearTimeout(timer); } };
}
