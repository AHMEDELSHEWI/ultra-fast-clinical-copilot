#!/usr/bin/env python3
"""End-to-end browser test of the built app (dist/). Usage: python3 tests/e2e.py"""
import functools, http.server, os, sys, threading
from playwright.sync_api import sync_playwright

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'dist'))
failures = []


def check(ok, msg):
    print(('PASS  ' if ok else 'FAIL  ') + msg, flush=True)
    if not ok:
        failures.append(msg)


class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a):
        pass


srv = http.server.ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(Quiet, directory=ROOT))
threading.Thread(target=srv.serve_forever, daemon=True).start()
BASE = f'http://127.0.0.1:{srv.server_address[1]}/'


def main():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        ctx = browser.new_context(viewport={'width': 400, 'height': 860}, permissions=['clipboard-read', 'clipboard-write'])
        page = ctx.new_page()
        errors = []
        page.on('pageerror', lambda e: errors.append(str(e)))
        page.on('console', lambda m: errors.append(m.text) if m.type == 'error' else None)
        page.goto(BASE)
        page.wait_for_selector('[data-act="new-case"]')
        check(page.evaluate("getComputedStyle(document.body).backgroundColor") == 'rgb(255, 255, 255)', 'white background')
        check('DR. AHMED ELSHEWI' in page.inner_text('.wm') or page.evaluate("document.querySelector('.wm').textContent.includes('DR. AHMED ELSHEWI')"), 'watermark present')
        check(page.evaluate("document.documentElement.scrollWidth <= window.innerWidth"), 'no horizontal scroll (home)')

        # ---- intake
        page.click('[data-act="new-case"]')
        page.fill('#age', '55')
        page.click('[data-act="sex"][data-v="male"]')
        page.click('[data-act="intake-submit"]')
        page.click('[data-act="toggle-complaint"][data-key="chest_pain"]')
        page.click('[data-act="start-interview"]')

        # ---- one question per screen; answer by tapping (no Next button)
        seen = []
        for _ in range(40):
            q = page.query_selector('.q')
            if not q:
                break
            text = q.inner_text()
            if text in seen:
                check(False, f'question repeated: {text}')
                break
            seen.append(text)
            n_before = len(page.query_selector_all('.q'))
            check(n_before == 1, f'exactly one question on screen: {text}') if len(seen) <= 2 else None
            btn = page.query_selector('.cards [data-act="answer"], .scale [data-act="answer"], .grid2 [data-act="answer"], [data-act="answer-duration"]')
            first_yes = page.query_selector('[data-act="answer"][data-v="no"]')
            if first_yes:
                first_yes.click()
            elif page.query_selector('[data-act="answer-duration"]'):
                page.click('[data-act="answer-duration"]')
            else:
                btn.click()
        check(len(seen) >= 8, f'interview asked {len(seen)} distinct questions')
        check('Interview complete' in page.inner_text('main'), 'interview completes')
        check(page.evaluate("window.__UFC.store.getFact('allergy.status')") is not None, 'allergy question answered (safety)')

        # ---- vitals: BP, HR; derived MAP; then correction
        page.click('[data-tab="vitals"]')
        page.fill('#v-sbp', '85'); page.fill('#v-dbp', '50')
        page.click('[data-act="set-bp"]')
        page.fill('#v-hr', '88'); page.click('[data-act="set-vital"][data-k="hr"]')
        page.click('[data-tab="safety"]')
        check('Hypotension' in page.inner_text('main'), 'hypotension alert shown for 85/50')
        page.click('[data-tab="vitals"]')
        page.click('[data-act="correct"][data-key="bp"]')
        page.fill('input[name="sbp"]', '120'); page.fill('input[name="dbp"]', '80')
        page.click('[data-modal-act="ok"]')
        check(page.evaluate("document.querySelector('#modal').textContent.includes('required')"), 'reason is required to correct a measurement')
        page.fill('input[name="reason"]', 'Cuff error')
        page.click('[data-modal-act="ok"]')
        check('120/80' in page.inner_text('main') and 'MAP' in page.inner_text('main'), 'corrected BP and MAP displayed')
        page.click('[data-tab="safety"]')
        check('Hypotension' not in page.inner_text('main'), 'hypotension alert gone after correction')

        # ---- GCS incomplete then complete
        page.click('[data-tab="vitals"]')
        page.click('[data-act="gcs"][data-k="e"][data-v="4"]')
        check('GCS incomplete — missing verbal response and motor response.' in page.inner_text('main'), 'GCS incomplete message')
        page.click('[data-act="gcs"][data-k="v"][data-v="5"]'); page.click('[data-act="gcs"][data-k="m"][data-v="6"]')
        check('GCS 15/15 (E4 V5 M6)' in page.inner_text('main'), 'GCS total calculated automatically')

        # ---- exam contradiction: cancel, then replace
        page.click('[data-tab="exam"]')
        page.click('[data-act="exam"][data-f="exam.resp.normal"]')
        page.click('[data-act="exam"][data-f="exam.resp.wheeze"]')
        check('CONFLICT DETECTED' in page.inner_text('#modal'), 'contradiction detected')
        page.click('[data-modal-act="both"]')
        check('required' in page.inner_text('#modal'), 'keep-both needs an explanation')
        page.click('[data-modal-act="cancel"]')
        check(page.evaluate("window.__UFC.store.getFact('exam.resp.wheeze')") is None, 'cancel leaves previous finding')

        # ---- note + copy
        page.click('[data-tab="note"]')
        page.fill('#dx', 'Acute chest pain, ACS not excluded'); page.dispatch_event('#dx', 'change')
        page.click('[data-act="dispo"][data-v="Admit to ward"]')
        page.click('[data-act="copy"][data-target="complete"]')
        page.wait_for_selector('.toast')
        clip = page.evaluate("navigator.clipboard.readText()")
        check(clip.startswith('CLINICAL NOTE') and 'BP 120/80 mmHg (MAP 93 mmHg)' in clip, 'COPY COMPLETE CASE puts the note on the clipboard')
        check(not any(x in clip for x in ('{', 'undefined', 'NaN', '[object')), 'copied text is plain (no JSON / undefined / NaN)')
        check('DR. AHMED' not in clip, 'watermark not copied')
        check('Systolic BP 85 recorded earlier was corrected' in clip, 'correction documented in the copied note')
        check('denies' in clip or 'Patient reports' in clip, 'HPI present in copied note')
        page.click('[data-act="copy"][data-target="vitals"]')
        page.wait_for_selector('.toast')
        check(page.evaluate("navigator.clipboard.readText()").startswith('VITAL SIGNS'), 'per-section copy works')

        # ---- timeline
        page.click('[data-tab="timeline"]')
        page.fill('#evtext', 'Aspirin given'); page.click('[data-act="add-event"]')
        check('Aspirin given' in page.inner_text('main'), 'timeline event added with automatic time')

        # ---- finalize
        page.click('[data-tab="note"]')
        page.click('[data-act="finalize"]'); page.click('[data-modal-act="ok"]')
        check('CASE COMPLETE' in page.inner_text('main'), 'case finalized')
        check(page.evaluate("window.__UFC.store.state.versions.some(v=>v.kind==='final')"), 'final version stored')

        # ---- reload: OPEN LAST CASE restores everything
        page.wait_for_timeout(600)
        page.reload(); page.wait_for_selector('[data-act="open-case"]')
        page.click('text=Open last case')
        page.wait_for_selector('.nav')
        check(page.evaluate("window.__UFC.store.getFact('vitals.sbp')") == 120, 'reload restores the last case from local storage')
        check(page.evaluate("window.__UFC.store.state.status") == 'final', 'finalized status restored')

        # ---- Phase 2: multiple complaints in ONE case, Think tab
        page.goto(BASE); page.wait_for_selector('[data-act="new-case"]')
        page.click('[data-act="new-case"]')
        page.fill('#age', '55')
        page.click('[data-act="sex"][data-v="male"]')
        page.click('[data-act="intake-submit"]')
        for k in ('chest_pain', 'dyspnea', 'syncope'):
            page.click(f'[data-act="toggle-complaint"][data-key="{k}"]')
        page.click('[data-act="start-interview"]')
        check(page.evaluate("window.__UFC.store.activeComplaints().length") == 3, 'three complaints in one connected case')
        check(len(page.query_selector_all('.q')) == 1, 'multi-complaint: still one question per screen')
        page.click('[data-tab="think"]')
        txt = page.inner_text('main')
        check('Cardiopulmonary pathway' in txt, 'combined cardiopulmonary pathway shown')
        check('Acute coronary syndrome' in txt and 'Pulmonary embolism' in txt, 'must-not-miss list shown')
        check('AI SUGGESTION' in txt, 'suggestions are labelled as AI suggestions')
        check(page.evaluate("document.documentElement.scrollWidth <= window.innerWidth"), 'no horizontal scroll (Think tab)')
        page.click('[data-act="consider"][data-dx="pe"]')
        page.click('[data-tab="note"]')
        note = page.inner_text('main')
        check('clinician-confirmed' in note and 'Pulmonary embolism' in note, 'accepted consideration appears in the note')
        check('Acute coronary syndrome' not in note, 'unaccepted suggestions do not appear in the note')

        # ---- Arabic / RTL
        page.click('[data-act="lang"]')
        check(page.evaluate("document.documentElement.dir") == 'rtl', 'Arabic switches to RTL')
        check(page.evaluate("document.documentElement.scrollWidth <= window.innerWidth"), 'no horizontal scroll in RTL')
        page.click('[data-act="lang"]')

        # ---- offline
        page.goto(BASE); page.wait_for_timeout(1500)
        check(page.evaluate("navigator.serviceWorker.ready.then(r=>!!r.active)"), 'service worker active')
        page.reload(); page.wait_for_timeout(800)
        ctx.set_offline(True)
        page2 = ctx.new_page()
        page2.goto(BASE); page2.wait_for_selector('[data-act="new-case"]', timeout=8000)
        check(True, 'app loads while offline')
        page2.click('[data-act="demo"]')
        page2.wait_for_selector('.nav')
        page2.click('[data-tab="note"]')
        check('DEMO CASE' in page2.evaluate("(async()=>{document.querySelector('[data-act=copy][data-target=complete]').click();await new Promise(r=>setTimeout(r,300));return navigator.clipboard.readText()})()"), 'offline: DEMO case copy works and is labelled DEMO')
        browser.close()
    srv.shutdown()
    real_errors = [e for e in errors if 'favicon' not in e]
    check(not real_errors, 'no console or page errors' + ('' if not real_errors else f': {real_errors[:3]}'))
    print('\n%s' % (f'{len(failures)} check(s) failed' if failures else 'All e2e checks passed'))
    sys.exit(1 if failures else 0)


main()
