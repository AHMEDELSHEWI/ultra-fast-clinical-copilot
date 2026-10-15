// Offline clinical vocabularies (tens of thousands of terms) and fast local search.
//   symptom / sign   ← Human Phenotype Ontology (HPO)                 ~19,000 terms
//   pmh / dx         ← ICD-10-CM (billable codes)                    ~74,700 codes
//   drug / med / allergy ← RxNorm ingredients + clinical drug products ~20,900 concepts
//   lab              ← laboratory/bedside catalogue (this app)
//   imaging          ← ICD-10-PCS imaging + nuclear medicine sections
//   procedure        ← all other ICD-10-PCS sections                  ~79,000 codes in total
// Vocabulary picks are clinician-entered facts (key vx.<kind>.<code>). Nothing here suggests a dose.
import { gunzipSync, strFromU8 } from 'fflate';
import { LABS } from '../content/labs.js';

export const PACKS = Object.freeze(['hpo', 'icd10cm', 'icd10pcs', 'rxnorm']);
export const KIND_PACK = Object.freeze({
  symptom: 'hpo', sign: 'hpo', pmh: 'icd10cm', dx: 'icd10cm', med: 'rxnorm', allergy: 'rxnorm', drug: 'rxnorm',
  lab: null, imaging: 'icd10pcs', procedure: 'icd10pcs',
});

// International (INN/BAN) names → RxNorm (US) names, so "paracetamol" finds acetaminophen.
export const DRUG_ALIASES = Object.freeze({
  acetaminophen: ['paracetamol'], epinephrine: ['adrenaline'], norepinephrine: ['noradrenaline'], albuterol: ['salbutamol'],
  furosemide: ['frusemide'], lidocaine: ['lignocaine'], nitroglycerin: ['glyceryl trinitrate', 'gtn'], meperidine: ['pethidine'],
  scopolamine: ['hyoscine'], cyclosporine: ['ciclosporin'], rifampin: ['rifampicin'], acyclovir: ['aciclovir'], cephalexin: ['cefalexin'],
  cholecalciferol: ['colecalciferol'], phenobarbital: ['phenobarbitone'], thiopental: ['thiopentone'], succinylcholine: ['suxamethonium'],
  dicyclomine: ['dicycloverine'], chlorpheniramine: ['chlorphenamine'], mesalamine: ['mesalazine'], beclomethasone: ['beclometasone'],
  isoproterenol: ['isoprenaline'], valproate: ['sodium valproate'], dextroamphetamine: ['dexamfetamine'], levalbuterol: ['levosalbutamol'],
  metaproterenol: ['orciprenaline'], glyburide: ['glibenclamide'], cromolyn: ['cromoglicate', 'cromoglycate'], ipratropium: ['ipratropium bromide'],
  'amoxicillin / clavulanate': ['co-amoxiclav', 'augmentin'], 'sulfamethoxazole / trimethoprim': ['co-trimoxazole'], tetracaine: ['amethocaine'],
  bupivacaine: ['marcaine'], ondansetron: ['zofran'], promethazine: ['phenergan'], metoclopramide: ['maxolon'], diazepam: ['valium'],
});

// ICD-10-PCS first character → section; imaging = B (imaging), C (nuclear medicine), 4 (measurement and monitoring).
export const PCS_SECTIONS = Object.freeze({
  0: 'Medical and surgical', 1: 'Obstetrics', 2: 'Placement', 3: 'Administration', 4: 'Measurement and monitoring', 5: 'Extracorporeal assistance and performance',
  6: 'Extracorporeal therapies', 7: 'Osteopathic', 8: 'Other procedures', 9: 'Chiropractic', B: 'Imaging', C: 'Nuclear medicine', D: 'Radiation therapy',
  F: 'Physical rehabilitation and diagnostic audiology', G: 'Mental health', H: 'Substance abuse treatment', X: 'New technology',
});
const IMAGING_SECTIONS = new Set(['B', 'C', '4']);

/** ICD-10-CM display form: I214 → I21.4 */
export const icdDisplay = (code) => (code.length > 3 ? `${code.slice(0, 3)}.${code.slice(3)}` : code);
export const hpoDisplay = (n) => `HP:${String(n).padStart(7, '0')}`;

const norm = (s) => String(s ?? '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '');

/** Decode one gzip-compressed JSON pack. */
export function decodePack(bytes) {
  return JSON.parse(strFromU8(gunzipSync(bytes)));
}

/** Turn raw packs into searchable entries per kind. Pure; cheap enough to run once on first use. */
export function buildIndex(raw) {
  const out = {};
  const entries = (list) => list.map((e) => ({ ...e, hay: norm(`${e.label} ${e.syn ?? ''} ${e.code ?? ''} ${e.alt ?? ''}`) }));
  if (raw.hpo) {
    const cats = raw.hpo.cats.map((c) => c.replace(/^Abnormality of (the )?/, '').replace(/^\w/, (x) => x.toUpperCase()));
    const list = entries(raw.hpo.items.map(([n, label, syn, cat]) => ({ id: String(n), code: hpoDisplay(n), label, syn: syn.replace(/\|/g, ' · '), cat: cats[cat], sys: 'HPO' })));
    out.symptom = list; out.sign = list; out.hpoCats = cats; out.hpoMeta = raw.hpo.meta;
  }
  if (raw.icd10cm) {
    const list = entries(raw.icd10cm.items.map(([code, label]) => ({ id: code, code: icdDisplay(code), alt: code, label, cat: code[0], sys: 'ICD-10-CM' })));
    out.pmh = list; out.dx = list; out.icdMeta = raw.icd10cm.meta;
  }
  if (raw.rxnorm) {
    const r = raw.rxnorm;
    const ing = r.ingredients.map(([rx, label, brands, epc, treats, ci]) => ({
      id: rx, code: `RxCUI ${rx}`, label, syn: [...(DRUG_ALIASES[label] ?? []), ...brands.split('|').filter(Boolean)].join(' · '),
      cat: 'Drug', sys: 'RxNorm', classes: epc.map((i) => r.classes[i]), treats: treats.map((i) => r.diseases[i]), ci: ci.map((i) => r.diseases[i]),
    }));
    const prod = r.products.map(([rx, label, brands]) => ({ id: rx, code: `RxCUI ${rx}`, label, syn: brands.replace(/\|/g, ' · '), cat: 'Product', sys: 'RxNorm' }));
    const list = entries([...ing, ...prod]);
    out.drug = list; out.med = list; out.allergy = entries(ing); out.rxMeta = r.meta;
  }
  if (raw.icd10pcs) {
    const all = raw.icd10pcs.items.map(([code, label]) => ({ id: code, code, label, cat: PCS_SECTIONS[code[0]] ?? 'Other', sys: 'ICD-10-PCS' }));
    out.imaging = entries(all.filter((e) => IMAGING_SECTIONS.has(e.id[0])));
    out.procedure = entries(all.filter((e) => !IMAGING_SECTIONS.has(e.id[0])));
    out.pcsMeta = raw.icd10pcs.meta;
  }
  out.lab = entries(LABS.map((l, i) => ({ id: `lab${i}`, code: '', label: l.name, cat: l.cat, sys: 'Catalogue' })));
  return out;
}

/**
 * Search one kind. Every query word must appear; ranked: exact label → label starts with query →
 * a word starts with query → elsewhere; shorter labels first. Optional category filter.
 */
export function search(index, kind, query, { limit = 40, cat = null } = {}) {
  const list = index[kind];
  if (!list) return [];
  const q = norm(query).trim();
  const words = q.split(/\s+/).filter(Boolean);
  const out = [];
  for (const e of list) {
    if (cat && e.cat !== cat) continue;
    if (words.length && !words.every((w) => e.hay.includes(w))) continue;
    const lab = norm(e.label);
    const rank = !q ? 3 : lab === q ? 0 : lab.startsWith(q) ? 1 : (` ${lab}`).includes(` ${words[0]}`) ? 2 : 3;
    out.push([rank, e.label.length, e]);
    if (!q && out.length >= limit) break;
  }
  out.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  return out.slice(0, limit).map((x) => x[2]);
}

/** Total searchable terms (for display). */
export function counts(index) {
  const n = (k) => index[k]?.length ?? 0;
  return { symptom: n('symptom'), pmh: n('pmh'), drug: n('drug'), lab: n('lab'), imaging: n('imaging'), procedure: n('procedure'),
    total: n('symptom') + n('pmh') + n('drug') + n('lab') + n('imaging') + n('procedure') };
}

// ---------------- case facts for vocabulary picks
export const vxKey = (kind, id) => `vx.${kind}.${id}`;
/** All vocabulary picks of a kind currently active in the case. */
export function picks(store, kind) {
  const prefix = `vx.${kind}.`;
  return Object.values(store.state.facts).filter((f) => f.status === 'active' && f.key.startsWith(prefix)).map((f) => ({ key: f.key, ...f.value }));
}
/** Record a pick: { label, code, sys, status } (status: present | absent | yes | requested | performed | ordered). */
export function addPick(store, kind, entry, status, extra = {}) {
  const key = vxKey(kind, entry.id);
  const value = { label: entry.label, code: entry.code, sys: entry.sys, status, ...extra };
  const cur = store.getFact(key);
  return store.setFact(key, value, { origin: kind === 'symptom' || kind === 'pmh' || kind === 'med' || kind === 'allergy' ? 'patient' : 'clinician', replace: cur !== undefined, reason: 'Updated by clinician' });
}
