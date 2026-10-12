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
