import { CaseStore } from '../src/core/state.js';
import pack from '../src/content/pack.json' with { type: 'json' };

export { pack };
export function makeStore({ start = 1760000000000, step = 60000 } = {}) {
  let t = start;
  const store = new CaseStore(undefined, { clock: () => (t += step) });
  store.tick = (ms) => { t += ms; };
  return store;
}
