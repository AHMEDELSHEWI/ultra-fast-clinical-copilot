// Deterministic score engine. Pure functions; every score is independently testable.
//
// A score definition (src/content/scores.js) lists inputs. Each input resolves from the case values:
//   - existing facts are reused (enter once, use everywhere)
//   - a missing fact is reported so the UI can ask ONLY that question
//   - a fact the clinician marked "unknown" is reported as unknown (never guessed)
// Nothing is defaulted: if an input cannot be resolved the score stays incomplete.

const isNum = (v) => typeof v === 'number' && Number.isFinite(v);

/** Context passed to resolvers. */
export function makeCtx(values, { unknown = new Set(), readings = () => [] } = {}) {
  return { values, unknown, readings };
}

// ---------- low-level helpers used by score content ----------
/** Resolve a fact: { ok, value } or { ok:false, missing:[key] } / { ok:false, unknown:[key] }. */
export function fact(ctx, key) {
  const v = ctx.values[key];
  if (v !== undefined) return { ok: true, value: v };
  if (ctx.unknown.has(key)) return { ok: false, unknown: [key] };
  return { ok: false, missing: [key] };
}
const fail = (r) => ({ points: null, missing: r.missing ?? [], unknown: r.unknown ?? [] });

/** Yes/no fact worth `pts` when yes. */
export function yesNo(key, pts, label) {
  return {
    label,
    facts: [key],
    resolve(ctx) {
      const r = fact(ctx, key);
      if (!r.ok) return fail(r);
      return { points: r.value === 'yes' ? pts : 0, shown: r.value === 'yes' ? 'Yes' : 'No', positive: r.value === 'yes' };
    },
  };
}

/** Choice fact whose option value IS the points (0/1/2...), or mapped through `map`. */
export function choicePts(key, label, map) {
  return {
    label,
    facts: [key],
    resolve(ctx) {
      const r = fact(ctx, key);
      if (!r.ok) return fail(r);
      const pts = map ? map[r.value] : r.value;
      if (!isNum(pts)) return { points: null, missing: [key], unknown: [] };
      return { points: pts, shown: String(r.value), positive: pts !== 0 };
    },
  };
}

/**
 * Numeric fact scored by ordered bands. Each band: { lt | lte | gt | gte | all, points, text }.
 * First matching band wins.
 */
export function banded(key, label, bands, unit = '') {
  return {
    label,
    facts: [key],
    resolve(ctx) {
      const r = fact(ctx, key);
      if (!r.ok) return fail(r);
      const v = r.value;
      if (!isNum(v)) return { points: null, missing: [key], unknown: [] };
      const b = bands.find((x) => ('lt' in x ? v < x.lt : 'lte' in x ? v <= x.lte : 'gt' in x ? v > x.gt : 'gte' in x ? v >= x.gte : true));
      return { points: b.points, shown: `${v}${unit ? ` ${unit}` : ''}`, positive: b.points !== 0 };
    },
  };
}

/** Numeric criterion: positive when test(value) is true. */
export function numTest(key, label, test, pts = 1, unit = '') {
  return {
    label,
    facts: [key],
    resolve(ctx) {
      const r = fact(ctx, key);
      if (!r.ok) return fail(r);
      if (!isNum(r.value)) return { points: null, missing: [key], unknown: [] };
      const pos = !!test(r.value);
      return { points: pos ? pts : 0, shown: `${r.value}${unit ? ` ${unit}` : ''}`, positive: pos };
    },
  };
}

/** Custom input. fn(ctx) must return { points, shown, positive } or { points:null, missing, unknown }. */
export function derived(label, facts, fn) {
  return { label, facts, resolve: fn };
}

/** "Any of these yes/no facts is yes" -> pts; all no -> 0; otherwise ask the first missing one. */
export function anyYes(keys, pts, label) {
  return derived(label, keys, (ctx) => {
    const missing = []; const unknown = [];
    for (const k of keys) {
      const r = fact(ctx, k);
      if (r.ok && r.value === 'yes') return { points: pts, shown: 'Yes', positive: true };
      if (!r.ok) { missing.push(...(r.missing ?? [])); unknown.push(...(r.unknown ?? [])); }
    }
    if (missing.length || unknown.length) return { points: null, missing: missing.slice(0, 1), unknown };
    return { points: 0, shown: 'No', positive: false };
  });
}

/**
 * Count risk factors from a list of resolvers ({ key } yes/no facts or custom).
 * Returns the count once it is decided for `thresholds` (e.g. [1, 3]); asks only what can change the band.
 */
export function countYes(ctx, items) {
  let yes = 0; const open = []; const unknown = [];
  for (const it of items) {
    const r = typeof it === 'string' ? fact(ctx, it) : it(ctx);
    if (r.ok) { if (r.value === 'yes') yes += 1; } else { open.push(...(r.missing ?? [])); unknown.push(...(r.unknown ?? [])); }
  }
  return { yes, open, unknown };
}

// ---------- evaluation ----------
/**
 * @returns {{
 *   id, name, applicable:boolean, reason?:string, complete:boolean, total:number|null,
 *   components:{label, points, shown, positive}[], missing:string[], unknown:string[],
 *   result?:{ label, level, meaning }, text:string
 * }}
 */
export function evaluateScore(def, ctx) {
  const age = ctx.values['patient.age'];
  const base = { id: def.id, name: def.name, sources: def.sources, version: def.version, limitations: def.limitations, use: def.use };
  if (def.minAge !== undefined || def.maxAge !== undefined) {
    if (!isNum(age)) {
      return { ...base, applicable: true, complete: false, total: null, components: [], missing: ['patient.age'], unknown: ctx.unknown.has('patient.age') ? ['patient.age'] : [], text: `${def.name}: incomplete — age needed.` };
    }
    if ((def.minAge !== undefined && age < def.minAge) || (def.maxAge !== undefined && age > def.maxAge)) {
      return { ...base, applicable: false, reason: `Validated for age ${def.minAge ?? 0}${def.maxAge !== undefined ? `–${def.maxAge}` : '+'} only.`, complete: false, total: null, components: [], missing: [], unknown: [], text: `${def.name}: not applicable at this age.` };
    }
  }
  if (def.applies) {
    const a = def.applies(ctx);
    if (a.missing?.length || a.unknown?.length) {
      return { ...base, applicable: true, complete: false, total: null, components: [], missing: a.missing ?? [], unknown: a.unknown ?? [], text: `${def.name}: applicability not yet established.` };
    }
    if (!a.ok) return { ...base, applicable: false, reason: a.reason, complete: false, total: null, components: [], missing: [], unknown: [], text: `${def.name}: not applicable — ${a.reason}` };
  }

  const components = [];
  const missing = []; const unknown = [];
  for (const inp of def.inputs) {
    const r = inp.resolve(ctx);
    if (r.points === null || r.points === undefined) {
      missing.push(...(r.missing ?? [])); unknown.push(...(r.unknown ?? []));
      components.push({ label: inp.label, points: null, shown: unknownOrMissing(r), positive: false });
    } else components.push({ label: inp.label, points: r.points, shown: r.shown, positive: !!r.positive });
  }

  // Rule-type scores can be decided before every input is known (e.g. any criterion positive).
  if (def.decide) {
    const d = def.decide(components, ctx);
    if (d) return finish(base, def, components, d.total ?? null, d.result, [], []);
  }
  if (missing.length || unknown.length) {
    const known = components.filter((c) => c.points !== null).reduce((s, c) => s + c.points, 0);
    return { ...base, applicable: true, complete: false, total: null, partial: known, components, missing: dedupe(missing), unknown: dedupe(unknown),
      text: `${def.name}: incomplete (${dedupe(missing).length + dedupe(unknown).length} item(s) outstanding).` };
  }
  const total = round1(components.reduce((s, c) => s + c.points, 0));
  const result = def.interpret(total, components, ctx);
  return finish(base, def, components, total, result, [], []);
}

function finish(base, def, components, total, result, missing, unknown) {
  const totalText = total === null ? '' : ` ${formatNum(total)}${def.max !== undefined ? `/${def.max}` : ''}`;
  return { ...base, applicable: true, complete: true, total, components, missing, unknown, result,
    text: `${def.name}${totalText} — ${result.label}.` };
}

const round1 = (v) => Math.round(v * 10) / 10;
const formatNum = (v) => (Number.isInteger(v) ? String(v) : v.toFixed(1));
const dedupe = (a) => [...new Set(a)];
const unknownOrMissing = (r) => ((r.unknown ?? []).length ? 'UNKNOWN' : 'MISSING');

/** Plain-text copy of one score (COPY SCORE). */
export function scoreText(res) {
  const lines = [res.text];
  for (const c of res.components) {
    if (c.points === null) lines.push(`- ${c.label}: ${c.shown}`);
    else lines.push(`- ${c.label}: ${c.shown}${c.points !== 0 ? ` (${c.points > 0 ? '+' : ''}${formatNum(c.points)})` : ''}`);
  }
  if (res.complete && res.result?.meaning) lines.push(`Interpretation: ${res.result.meaning}`);
  lines.push('Decision support only; interpret in clinical context.');
  return lines.join('\n');
}
