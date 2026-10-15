// Investigation engine: DO NOW / DO SOON / CONSIDER / NOT ROUTINELY INDICATED, each with WHY.
// Data-driven (pack.investigationRules). Suggests only; the clinician decides and records what was requested.
import { memo } from './memo.js';
import { evalCondition } from './questions.js';
import { caseValues, relevantScores } from './workup.js';

export const TIERS = Object.freeze(['now', 'soon', 'consider', 'not_routine']);
const RANK = { now: 0, soon: 1, consider: 2, not_routine: 3 };

/** Values map + score results so rules can depend on scores (e.g. D-dimer only if Wells <= 4). */
export function investigationValues(pack, store) { return { ...memo(store, 'investigationValues', () => investigationValues_(pack, store)) }; }
function investigationValues_(pack, store) {
  const values = caseValues(store);
  for (const s of relevantScores(pack, store)) {
    const r = s.result;
    if (!r.complete) continue;
    if (typeof r.total === 'number') values[`score.${s.id}.total`] = r.total;
    const lab = r.result?.label ?? '';
    values[`score.${s.id}.label`] = /negative/i.test(lab) ? 'negative' : /positive/i.test(lab) ? 'positive' : lab;
  }
  return values;
}

/**
 * @returns {{ id, label, kind, tier, reasons:{why, sources}[], status }[]} sorted by tier
 */
export function suggestInvestigations(pack, store) { return memo(store, 'suggestInvestigations', () => suggestInvestigations_(pack, store)); }
function suggestInvestigations_(pack, store) {
  if (store.activeComplaints().length === 0) return [];
  const values = investigationValues(pack, store);
  const catalog = new Map((pack.investigationCatalog ?? []).map((c) => [c.id, c]));
  const out = new Map();
  for (const rule of pack.investigationRules ?? []) {
    if (!evalCondition(rule.when, values)) continue;
    for (const it of rule.items) {
      const cat = catalog.get(it.id);
      if (!cat) continue;
      const cur = out.get(it.id);
      if (!cur) {
        out.set(it.id, { id: it.id, label: cat.label, doc: cat.doc, kind: cat.kind, tier: it.tier, reasons: [{ why: it.why, sources: it.sources, tier: it.tier }] });
      } else {
        cur.reasons.push({ why: it.why, sources: it.sources, tier: it.tier });
        // An active indication from any rule wins over "not routine" from another, so nothing needed is hidden.
        if (RANK[it.tier] < RANK[cur.tier]) cur.tier = it.tier;
      }
    }
  }
  const list = [...out.values()].map((x) => ({ ...x, status: store.getFact(`inv.${x.id}`) ?? null }));
  return list.sort((a, b) => RANK[a.tier] - RANK[b.tier]);
}

export const invKey = (id) => `inv.${id}`;
