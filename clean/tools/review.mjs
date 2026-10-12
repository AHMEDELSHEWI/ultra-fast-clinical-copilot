// Generates REVIEW.md from pack.json so the review checklist can never drift from the shipped content.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pack = JSON.parse(fs.readFileSync(path.join(root, 'src/content/pack.json'), 'utf8'));

const cond = (c) => {
  if (!c) return 'always';
  if (c.all) return c.all.map(cond).join(' AND ');
  if (c.any) return `(${c.any.map(cond).join(' OR ')})`;
  const op = 'eq' in c ? `= ${c.eq}` : 'gte' in c ? `>= ${c.gte}` : 'lte' in c ? `<= ${c.lte}` : 'neq' in c ? `!= ${c.neq}` : '?';
  return `${c.fact} ${op}`;
};
const L = [];
L.push('# Clinical content review checklist', '');
L.push(`Content pack: ${pack.version}`, '', `Status: ${pack.reviewStatus}`, '');
L.push('**Nothing below is approved until a consultant signs it off.** Mark each row `[x]` only after checking it against the source or local protocol.', '');
L.push('## Honest limits', '');
L.push('- UpToDate, Tintinalli, Rosen and other subscription/copyright books were **not accessible** to the builder. Content here is authored from general medical knowledge and checked against the published, verifiable sources listed below. It is not copied from any book.');
L.push('- Every citation below was looked up in PubMed; titles, years, DOIs and PMIDs are the ones PubMed returned. Newer editions (for example 2026 guidelines) may exist. The "latest known" column says only what was verified in this build.');
L.push('- Items marked **NEEDS SOURCE** have no verified citation attached yet. They must be reviewed by a consultant and a source added before release.', '');
L.push('## Hypotension decision', '', '- [ ] Alert threshold: SBP 90 mmHg or below, or MAP below 65 mmHg (decided by the consultant). Local protocol confirmed.', '');
L.push('## Verified sources', '', '| Sign-off | Id | Citation | DOI | PMID | Latest known |', '|---|---|---|---|---|---|');
for (const [id, s] of Object.entries(pack.sources)) L.push(`| [ ] | ${id} | ${s.citation} | ${s.doi ?? '—'} | ${s.pmid} | ${s.latestKnown} |`);
L.push('', '## Reasoning rules', '');
for (const r of pack.reasoning.rules) {
  L.push(`### ${r.id}${r.cluster ? ` — ${r.cluster.en}` : ''}`, '', `- [ ] Applies when: ${cond(r.when)}`, `- Specialties: ${r.specialties.join(', ')}`);
  for (const d of r.mustNotMiss) {
    const src = d.sources.length ? d.sources.join(', ') : '**NEEDS SOURCE**';
    L.push(`- [ ] Must not miss: **${d.dx.en}** — ${d.why} (sources: ${src})`);
  }
  for (const sc of r.scores) L.push(`- [ ] Relevant score: ${sc.id} — ${sc.why}`);
  L.push('');
}
L.push('## History questions', '', '| Sign-off | Id | Complaint(s) | Question | Red flag |', '|---|---|---|---|---|');
for (const q of pack.questions) L.push(`| [ ] | ${q.id} | ${q.complaints.join(', ')} | ${q.prompt.en} | ${q.redFlag ? 'yes' : ''} |`);
L.push('', '## Complaints', '', ...pack.complaints.map((c) => `- [ ] ${c.label.en} (${c.key}); Arabic: ${c.label.ar}`), '');
const out = L.join('\n');
fs.writeFileSync(path.join(root, 'REVIEW.md'), out);
const needs = (out.match(/NEEDS SOURCE/g) ?? []).length;
console.log(`REVIEW.md written (${needs} item(s) need a source).`);
