# Ultra Fast Clinical Copilot (clean rewrite, Phase 1)

Clinical decision support and documentation for the Emergency Department.
Built from scratch: small modules, structured data, tests, one offline file.

> **Status: architectural prototype.** Clinical content is draft and pending consultant review.
> It contains questions only: no drug doses, no treatment protocols. The clinician remains responsible for every decision.

## Privacy model
- No server, no analytics, no network calls. Everything runs in the browser and is stored on the device (IndexedDB).
- The app tells the user never to enter a name, ID number or phone. Even de-identified data can identify a patient (exact dates, rare diagnoses), so keep entries minimal.
- Not yet implemented (Phase 9): encryption at rest, PIN / biometric lock, session timeout. Until then, rely on the device lock.
- Hosting is static files only, so free hosting (GitHub Pages) is enough and no patient data ever reaches it.

## What Phase 1 does
| Area | Behaviour |
| --- | --- |
| One connected case | Several complaints in one case. A fact is asked once and reused everywhere. |
| Provenance | Every fact stores its origin (clinician, patient, measurement, ...). AI suggestions are not facts until accepted. |
| Corrections | "Correct measurement" or "Remove from current calculations". The old value stays in history with a reason and an audit entry. Alerts, MAP and the note use only current values. |
| Contradictions | Normal vs wheeze etc. raises CONFLICT DETECTED: replace, keep both (with explanation) or cancel. Never silent. |
| Vitals | SBP and DBP stored separately. MAP, shock index, BMI calculated. Implausible entries rejected. |
| GCS | E, V, M captured. Total calculated; never guessed when a component is missing. |
| Safety | Adult thresholds are never applied to children or unknown age. Missing safety information (allergy, blood thinners, pregnancy) is listed with ASK NOW. |
| Documentation | Live note in clinical language. Negatives only when asked. Unknown is stated as unknown. Empty core sections say "Not documented". |
| Copy | One tap per section and COPY COMPLETE CASE. Plain text only; blocked if JSON or `undefined` leaks in. |
| Versions and audit | Draft / updated / final, restore without losing work, reopen requires a reason. |
| Offline | Single HTML file plus service worker. Autosave, OPEN LAST CASE, backup export and restore (never overwrites). |
| UI | White background, one question per screen, large touch targets, Arabic (RTL) and English. |

Not in Phase 1: scores library, medication engine, disease templates, ICD-10 / MCCHIS, resuscitation mode, serial-vitals trend, voice and natural-language input.

## Commands
```
npm install
npm test            # unit tests (node:test)
npm run build       # dist/index.html + service worker + manifest
python3 tests/e2e.py   # browser test (pip install playwright; playwright install chromium)
```

## Layout
```
src/core/     state, vitals, alerts, questions, documentation, copy, persistence, checks, demo  (pure, tested)
src/content/  pack.json   versioned clinical content (complaints, questions, exam). Add content here, not in code.
src/ui/       main.js, i18n.js, styles.css, template.html
tests/        *.test.mjs unit tests, e2e.py browser test
tools/        build.mjs
```

## Deploy (free)
1. Create a repository and push this folder to `main`.
2. Settings, Pages, Source: **GitHub Actions**.
3. The workflow runs tests, builds and publishes `dist/`.

## Decisions waiting for the consultant
- Hypotension alert: SBP 90 mmHg or below, or MAP below 65 mmHg (decision by the consultant: "90 or below"). The spec example 90/60 is therefore flagged.
- Every clinical question and option wording in `pack.json` needs review before real use.


## Phase 2 — multiple complaints (added)

- 10 complaints (chest pain, dyspnoea, abdominal pain, headache, syncope, palpitations, fever, vomiting, confusion/altered mental status, back pain). Any combination stays ONE case; shared questions are asked once.
- `src/core/reasoning.js` + `reasoning.rules` in `pack.json`: combined pathways (e.g. chest pain + dyspnoea), must-not-miss diagnoses with WHY, relevant scores (names only; calculators are Phase 3), likely specialties.
- Output is labelled AI SUGGESTION. A diagnosis enters the note only when the clinician taps "Add to assessment" (stored as `ai_confirmed`).
- Adult-validated scores are hidden for age < 18 or unknown age.
- `npm run review` regenerates `REVIEW.md`, the consultant sign-off checklist. Rows marked NEEDS SOURCE have no verified citation yet.
- Sources were verified in PubMed (title, year, DOI, PMID). UpToDate and the textbooks were not accessible; nothing is copied from them.


## Release 2.1.0-beta.1 — professional rebuild

- **Design**: original colourful SVG medical icon set, white hospital-grade layout, patient strip (vitals, GCS, NEWS2, alert count), "What matters now" dashboard, desktop 3-column layout with live note, mobile bottom navigation, Arabic RTL.
- **Shared clinical facts** (`src/content/facts.js`): each fact asked once and reused by scores, investigations, medications and every document.
- **Score engine** (`src/core/scoreEngine.js`, `src/content/scores.js`): 17 validated scores — HEART, EDACS, TIMI, Wells PE, PERC, sPESI, Wells DVT, NEWS2, qSOFA, CURB-65, Canadian Syncope Risk Score, CHA₂DS₂-VASc (+VA), HAS-BLED, Ottawa SAH, Canadian CT Head, Alvarado, Glasgow-Blatchford. Auto-calculated from existing data; asks only the missing input; components, interpretation, limitations, source and version shown; COPY SCORE.
- **Investigation engine**: DO NOW / DO SOON / CONSIDER / NOT ROUTINELY INDICATED with WHY and sources; score-dependent (e.g. CTPA if Wells > 4, D-dimer not routine if PERC negative).
- **Medication engine** (`src/content/drugs.js`, `src/core/meds.js`): doses only where verified against the 2025 AHA algorithms, WAO 2020 or SSC 2021 (with the quoted text); weight-based arithmetic with caps; paediatric safety (adult doses never shown to children, weight required); allergy, drug-disease and cumulative-maximum checks; 7-line MEDICATION DETAILS; record as given.
- **Resuscitation mode**: CPR cycle, total and epinephrine timers; adult and paediatric doses and shock energies; Hs & Ts; every action time-stamped into the note.
- **Documentation**: consultant summary, referral (clinician question only), discharge, bilingual patient instructions, ICD-10 (WHO) with clinician confirmation, MCCHIS (SOAP until the hospital template is supplied), final case screen with one-tap copies.
- **Natural-language intake** (EN/AR, offline): free text parsed into a confirmation list; nothing saved until confirmed; the interview skips what was already entered.
- 112 unit tests + end-to-end browser test. `npm run review` regenerates REVIEW.md (all clinical content needs consultant sign-off).


## Offline vocabularies (2.2)

About 200,000 searchable terms, all offline, embedded gzip-compressed in the single HTML file and decoded on first use:

| Category in the app | Source | Count | Licence |
|---|---|---|---|
| Symptoms, signs | Human Phenotype Ontology, release 2026-09-01 | 19,177 | Free; content unaltered; acknowledged with version |
| Past history, diagnoses | ICD-10-CM FY2026 (CDC/NCHS), billable codes | 74,719 | US public domain |
| Imaging, monitoring, procedures | ICD-10-PCS FY2026 (CMS) | 79,115 | US public domain |
| Drugs (ingredients + clinical drug products), classes, may-treat, contraindications | RxNorm normalized layer + RxClass (VA MED-RT, FDA SPL) | 20,912 | US government works |
| Laboratory and bedside tests | Catalogue written for this app | 197 | — |
| Examination | General + 9 local systems, 313 structured findings (this app) | 313 | — |

Rebuild packs: `python3 -I tools/extract-vocab.py <medical-codes.db> <hp.json> data/vocab` then gzip each JSON (`gzip -9 -n`).
The database comes from the npm package `@cyanheads/medical-codes-mcp-server` (built from the federal .gov releases), HPO from its GitHub release.
No doses come from these sources: RxNorm entries are ordered with a clinician-entered dose. ICD-10-CM is the US clinical modification; local systems (WHO ICD-10, ICD-10-AM) can differ.

## 2.3 — speed, lightness, design, scribe

- **Light edition:** `index.html` ≈ 0.43 MB; vocabularies are separate files loaded on first use and precached for offline use. `ufc-offline-full.html` keeps everything in one file for sharing.
- **Speed:** engine results cached per case change (`src/core/memo.js`); screen updates patch only changed DOM (morphdom); live note built only on wide screens.
- **Design v3:** navy actions on a white workspace, clinical colours reserved for meaning, bedside-monitor vitals band, sentence-case headings.
- **Scribe:** "Speak the case" starts dictation in one tap; the offline engine shows what it understood while you speak; one confirmation; then only missing questions.

## 2.4 — easier entry, shorter screens

- **Vital signs typed in place**: one grid on the Exam tab; Enter saves and moves to the next field. A changed value is a new reading (the earlier one stays in history); corrections still need a reason (pencil button).
- **One-step intake**: what the app understood from the spoken/typed case is shown as chips; tap any wrong chip to remove it, then *Build the record*. A recognised complaint goes straight to the interview. The manual age/sex box folds away when the text already gives both.
- **Examination**: findings in a compact two-column grid on phones; *All normal… / Rest normal…* per system lists the normal statement of every group not yet filled — the clinician unticks anything not examined, and only ticked items are recorded. Never offered for the genitourinary/obstetric system or the rectal examination.
- GCS options fit on small screens; DEMO label always visible on phones; compact *Copy all* button; compact language switch on phones.
- Updates: a new version installs in the background; it loads immediately on the home screen, otherwise the next time the app opens.
