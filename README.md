# Ultra Fast Clinical Copilot

Current release: **V1.0.13**

V1.0.13 is a self-contained build of the V1.0.12 Deep AI Clinical Command Center. It is a single static HTML file that works offline once opened: no runtime fetch-and-patch chain, a service worker and a web manifest for PWA install.

What changed in V1.0.13 (packaging and defects only, no new clinical content):

- Flattened the V1.0.8 to V1.0.12 fetch-and-patch chain (5 nested loaders and about 15 runtime requests) into one file built reproducibly by `tools/build-release.mjs`.
- Fixed a syntax error in `v1.0.9-safety-first.js` that stopped the safety-first gate from ever loading.
- The V1.0.10 Command Center and V1.0.11 Deep Auto modules were never injected by the old chain (its string patches silently matched nothing). They are now declared explicitly and load.
- Fixed two infinite-render loops (MutationObserver feedback) in `v1.0.10-command-center.js` and `v1.0.11-deep-auto.js` that froze the page. They were hidden before because the old chain never loaded those modules.
- Added the missing `service-worker.js` (the app registered it but it returned 404), `manifest.webmanifest` and `icon.svg`.
- Replaced the stale V1.0.8 CI workflow with `repository-qa.yml`, which rebuilds the release, checks it is byte-identical to the committed file, and runs static integrity checks and a headless-browser smoke test (no freezes on any route, all modules present, works offline).

Earlier feature notes (V1.0.8 workflow, voice, precision UX) remain valid and are carried forward unchanged.

## Build and verify

```
node tools/build-release.mjs 1.0.13
node tools/verify-release.mjs 1.0.13
pip install playwright && playwright install chromium
python3 tests/smoke_test.py 1.0.13
```

## Entry points

- `index.html`: redirects to the current release, V1.0.13
- `v1.0.13.html`: current self-contained release
- `v1.0.8.html` to `v1.0.12.html`: legacy chain shells, kept only as build sources and history

## Safety

The application is clinical decision support only. Speech recognition, unit conversion, reference intervals, differential ranking, investigations, medication content and disposition require clinician verification and local institutional validation before patient care use.
