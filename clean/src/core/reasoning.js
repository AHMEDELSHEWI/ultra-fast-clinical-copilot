// Multi-complaint reasoning (Phase 2). Pure and data-driven: all clinical content is in pack.json.
// Output is DECISION SUPPORT ("AI suggestion" level). Nothing here becomes a fact until the clinician accepts it.
import { memo } from './memo.js';
import { evalCondition } from './questions.js';

/** Values map the rule conditions read from: current active facts + `complaint.<key>` flags. */
export function reasoningValues(store) {
  const values = store.snapshotValues();
  for (const c of store.activeComplaints()) values[`complaint.${c}`] = true;
  return values;
}

/**
 * @returns {{ clusters, specialties, mustNotMiss, scores, unsourced, ageNote }}
 * mustNotMiss: [{ id, dx, why, sources[], reasons[] }]  (merged across rules, each diagnosis once)
 */
export function reason(pack, store, values) {
  if (values !== undefined) return reason_(pack, store, values);
  return memo(store, 'reason', () => reason_(pack, store, reasoningValues(store)));
}
function reason_(pack, store, values) {
  const rules = (pack.reasoning?.rules ?? []).filter((r) => evalCondition(r.when, values));
  const clusters = [];
  const specialties = [];
  const mnm = new Map();
  const scores = new Map();
  for (const r of rules) {
    if (r.cluster) clusters.push({ id: r.id, label: r.cluster, sources: r.sources ?? [] });
    for (const s of r.specialties ?? []) if (!specialties.includes(s)) specialties.push(s);
    for (const d of r.mustNotMiss ?? []) {
      const cur = mnm.get(d.id);
      if (cur) {
        cur.reasons.push(r.id);
        for (const s of d.sources) if (!cur.sources.includes(s)) cur.sources.push(s);
      } else {
        mnm.set(d.id, { id: d.id, dx: d.dx, why: d.why, sources: [...d.sources], reasons: [r.id] });
      }
    }
    for (const sc of r.scores ?? []) if (!scores.has(sc.id)) scores.set(sc.id, { id: sc.id, why: sc.why, rule: r.id });
  }
  const mustNotMiss = [...mnm.values()];
  const unsourced = mustNotMiss.filter((d) => d.sources.length === 0).map((d) => d.id);
  return { clusters, specialties, mustNotMiss, scores: [...scores.values()], unsourced };
}

/** Plain-text citation list for the sources referenced. */
export function citationFor(pack, id) {
  const s = pack.sources?.[id];
  if (!s) return null;
  return `${s.citation}${s.doi ? ` doi:${s.doi}` : ''}${s.pmid ? ` PMID ${s.pmid}` : ''}`;
}

/** Facts keys under which the clinician's acceptance of a consideration is stored. */
export const considerKey = (dxId) => `dx.consider.${dxId}`;
