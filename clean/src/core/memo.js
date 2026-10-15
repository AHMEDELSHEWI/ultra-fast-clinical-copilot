// Per-change cache: an engine result is computed once per case revision and reused by every
// screen and engine that asks for it. Any change to the case (store._emit) bumps the revision,
// so a cached value can never be stale.
const CACHE = new WeakMap();
export function memo(store, key, fn) {
  if (!store || typeof store !== 'object') return fn();
  const rev = store.rev ?? 0;
  let c = CACHE.get(store);
  if (!c || c.rev !== rev) { c = { rev, m: new Map() }; CACHE.set(store, c); }
  if (!c.m.has(key)) c.m.set(key, fn());
  return c.m.get(key);
}
