#!/usr/bin/env python3
"""Build compact offline vocabulary packs from open sources (run with python3 -I).

Usage: python3 -I tools/extract-vocab.py <medical-codes.db> <hp.json> <out-dir>

Sources (all freely redistributable):
  * ICD-10-CM FY2026 (CDC/NCHS, US public domain)            -> diagnoses
  * ICD-10-PCS FY2026 (CMS, US public domain)                 -> procedures and imaging
  * RxNorm normalized layer + RxClass (NLM / VA MED-RT / FDA SPL, US government works) -> drugs, classes, may-treat, contraindications
  * Human Phenotype Ontology (HPO Consortium; free, unaltered, acknowledged with version) -> symptoms and signs
The labels are copied verbatim (HPO terms must not be altered). No doses are extracted from anywhere.
"""
import json, sqlite3, sys, os

db_path, hp_path, out = sys.argv[1], sys.argv[2], sys.argv[3]
os.makedirs(out, exist_ok=True)
c = sqlite3.connect(db_path)
meta = {r[0]: {'release': r[1], 'start': r[2], 'end': r[3], 'url': r[5]} for r in c.execute('select * from build_meta')}

def dump(name, obj):
    p = os.path.join(out, name)
    with open(p, 'w', encoding='utf-8') as f:
        json.dump(obj, f, ensure_ascii=False, separators=(',', ':'))
    print(name, os.path.getsize(p))

# ---------------- ICD-10-CM (billable codes)
icd = [[code, desc] for code, desc in c.execute(
    "select code, coalesce(long_desc, short_desc) from codes where system='ICD10CM' and billable=1 and (terminated is null or terminated='') order by code")]
dump('icd10cm.json', {'meta': {**meta['ICD10CM'], 'name': 'ICD-10-CM', 'license': 'US public domain (CDC/NCHS)'}, 'items': icd})

# ---------------- ICD-10-PCS (billable codes)
pcs = [[code, desc] for code, desc in c.execute(
    "select code, coalesce(long_desc, short_desc) from codes where system='ICD10PCS' and billable=1 and (terminated is null or terminated='') order by code")]
dump('icd10pcs.json', {'meta': {**meta['ICD10PCS'], 'name': 'ICD-10-PCS', 'license': 'US public domain (CMS)'}, 'items': pcs})

# ---------------- RxNorm ingredients actually used in clinical drugs, products, brands, classes
name = {code: desc for code, desc in c.execute("select code, long_desc from codes where system='RXNORM'")}
tty = {code: t for code, t in c.execute("select code, short_desc from codes where system='RXNORM'")}
ing_of = {}
for rx, rel, tgt, tt in c.execute("select rxcui, rel, target, target_type from rxnorm_rel where rel='has_ingredient'"):
    ing_of.setdefault(rx, set()).add(tgt)
def ins_of(rx):
    out = set()
    for i in ing_of.get(rx, ()):
        if tty.get(i) == 'IN': out.add(i)
        elif tty.get(i) == 'PIN': out |= {j for j in ing_of.get(i, ()) if tty.get(j) == 'IN'}
    return out
brands, prod_brands = {}, {}
for rx, rel, tgt, tt in c.execute("select rxcui, rel, target, target_type from rxnorm_rel where rel='has_tradename'"):
    if tty.get(rx) != 'SCD': continue
    bn = name.get(tgt, '')
    if not bn: continue
    prod_brands.setdefault(rx, set()).add(bn)
    ins = ins_of(rx)
    if len(ins) == 1: brands.setdefault(next(iter(ins)), set()).add(bn)  # brand of a single-ingredient product
used = set()
products = []
for code, t in tty.items():
    if t == 'SCD':
        products.append([code, name[code], '|'.join(sorted(prod_brands.get(code, ())))])
        for i in ing_of.get(code, ()):
            if tty.get(i) == 'IN': used.add(i)
            if tty.get(i) == 'PIN':
                for j in ing_of.get(i, ()):
                    if tty.get(j) == 'IN': used.add(j)
products.sort(key=lambda x: x[1].lower())
# classes
cls_name = {(t, i): n for t, i, n in c.execute('select class_type, class_id, class_name from rxclass_class')}
epc, treats, ci = {}, {}, {}
diseases, dis_idx = [], {}
def didx(n):
    if n not in dis_idx: dis_idx[n] = len(diseases); diseases.append(n)
    return dis_idx[n]
classes, cls_idx = [], {}
def cidx(n):
    if n not in cls_idx: cls_idx[n] = len(classes); classes.append(n)
    return cls_idx[n]
for rx, ctype, cid, src, rel in c.execute('select rxcui, class_type, class_id, source, relation from rxclass_edge'):
    if rx not in used: continue
    n = cls_name.get((ctype, cid))
    if not n: continue
    if rel == 'has_epc': epc.setdefault(rx, set()).add(cidx(n))
    elif rel == 'may_treat': treats.setdefault(rx, set()).add(didx(n))
    elif rel == 'ci_with': ci.setdefault(rx, set()).add(didx(n))
ings = []
for rx in sorted(used, key=lambda r: name[r].lower()):
    b = sorted(x for x in brands.get(rx, ()) if x)
    ings.append([rx, name[rx], '|'.join(b), sorted(epc.get(rx, ())), sorted(treats.get(rx, ())), sorted(ci.get(rx, ()))])
rxclass_ver = {s: v for s, v, *_ in c.execute('select source, version from rxclass_source')}
dump('rxnorm.json', {'meta': {**meta['RXNORM'], 'name': 'RxNorm + RxClass (MED-RT, FDA SPL)', 'license': 'US government works (NLM, VA, FDA); UMLS-licensed content excluded', 'rxclass': rxclass_ver},
                     'ingredients': ings, 'products': products, 'classes': classes, 'diseases': diseases})

# ---------------- HPO phenotypic abnormalities with system category
d = json.load(open(hp_path, encoding='utf-8'))['graphs'][0]
nodes = {n['id']: n for n in d['nodes'] if n.get('type') == 'CLASS'}
par = {}
for e in d['edges']:
    if e['pred'] == 'is_a': par.setdefault(e['sub'], []).append(e['obj'])
ROOT = 'http://purl.obolibrary.org/obo/HP_0000118'
tops = [k for k, ps in par.items() if ROOT in ps]
cats = [nodes[t]['lbl'] for t in tops]
memo = {}
def top_of(x, seen=()):
    if x in memo: return memo[x]
    if x in tops: memo[x] = tops.index(x); return memo[x]
    for p in par.get(x, []):
        if p in seen: continue
        r = top_of(p, seen + (x,))
        if r is not None: memo[x] = r; return r
    memo[x] = None; return None
version = next((p['val'] for p in d['meta'].get('basicPropertyValues', []) if p['pred'].endswith('versionInfo')), '')
items = []
for nid, n in nodes.items():
    if n.get('meta', {}).get('deprecated') or 'lbl' not in n: continue
    t = top_of(nid)
    if t is None: continue
    syn = [s['val'] for s in n.get('meta', {}).get('synonyms', []) if s.get('pred') == 'hasExactSynonym']
    items.append([int(nid.rsplit('_', 1)[1]), n['lbl'], '|'.join(syn), t])
items.sort(key=lambda x: x[1].lower())
dump('hpo.json', {'meta': {'name': 'Human Phenotype Ontology', 'release': version, 'url': 'https://hpo.jax.org',
                            'license': 'Free use; content unaltered; HPO Consortium acknowledged with version (https://hpo.jax.org/app/license)'},
                  'cats': cats, 'items': items})
