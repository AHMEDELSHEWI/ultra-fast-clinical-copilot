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
        for _ in range(80):
            q = page.query_selector('.q')
            if not q:
                break
            text = q.inner_text()
            if text in seen:
                check(False, f'question repeated: {text}')
                break
            seen.append(text)
            if len(seen) <= 2:
                check(len(page.query_selector_all('.q')) == 1, f'exactly one question on screen: {text}')
            if page.query_selector('[data-act="answer"][data-v="no"]'):
                page.click('[data-act="answer"][data-v="no"]')
            elif page.query_selector('[data-act="answer-duration"]'):
                page.click('[data-act="answer-duration"]')
            elif page.query_selector('#num-input'):
                page.fill('#num-input', '5'); page.click('[data-act="answer-num"]')
            else:
                page.click('[data-act="answer"]')
        check(len(seen) >= 8, f'interview asked {len(seen)} distinct questions')
        check('Interview complete' in page.inner_text('main'), 'interview completes')
        check(page.evaluate("window.__UFC.store.getFact('allergy.status')") is not None, 'allergy question answered (safety)')
        check(page.evaluate("window.__UFC.store.getFact('pmh.hyperlipidaemia')") == 'no', 'score inputs asked in the interview (HEART risk factors)')

        # ---- vitals: BP entered once as SBP + DBP, derived values, alert, correction
        page.click('[data-tab="exam"]')
        page.click('[data-act="vital"][data-k="bp"]')
        page.fill('#sv-a', '85'); page.fill('#sv-b', '50'); page.click('[data-act="vital-save"]')
        page.click('[data-act="vital"][data-k="hr"]'); page.fill('#sv-a', '88'); page.click('[data-act="vital-save"]')
        check(page.evaluate("[window.__UFC.store.getFact('vitals.sbp'), window.__UFC.store.getFact('vitals.dbp')]") == [85, 50], 'SBP and DBP stored separately')
        check('Pulse pressure: 35 mmHg' in page.inner_text('main') and 'MAP: 62 mmHg' in page.inner_text('main'), 'MAP and pulse pressure calculated')
        page.click('[data-tab="now"]')
        check('Hypotension' in page.inner_text('main'), 'hypotension alert shown for 85/50')
        page.click('[data-tab="exam"]')
        page.click('[data-act="vital"][data-k="bp"]')
        page.click('[data-act="vital-mode"][data-m="correct"]')
        page.fill('#sv-a', '120'); page.fill('#sv-b', '80'); page.click('[data-act="vital-save"]')
        check(page.evaluate("window.__UFC.store.getFact('vitals.sbp')") == 85, 'reason is required to correct a measurement')
        page.fill('#sv-r', 'Cuff error'); page.click('[data-act="vital-save"]')
        check('120/80' in page.inner_text('main') and 'MAP: 93 mmHg' in page.inner_text('main'), 'corrected BP and MAP displayed')
        page.click('[data-tab="now"]')
        check('Hypotension' not in page.inner_text('main'), 'hypotension alert gone after correction')

        # ---- GCS incomplete then complete
        page.click('[data-tab="exam"]')
        page.click('[data-act="gcs"][data-k="e"][data-v="4"]')
        check('GCS incomplete — missing verbal response and motor response.' in page.inner_text('main'), 'GCS incomplete message')
        page.click('[data-act="gcs"][data-k="v"][data-v="5"]'); page.click('[data-act="gcs"][data-k="m"][data-v="6"]')
        check('GCS 15/15 (E4 V5 M6)' in page.inner_text('main'), 'GCS total calculated automatically')

        # ---- exam contradiction
        page.click('[data-act="exam"][data-f="exam.resp.normal"]')
        page.click('[data-act="exam"][data-f="exam.resp.wheeze"]')
        check('CONFLICT DETECTED' in page.inner_text('#modal'), 'contradiction detected')
        page.click('[data-modal-act="both"]')
        check('required' in page.inner_text('#modal'), 'keep-both needs an explanation')
        page.click('[data-modal-act="cancel"]')
        check(page.evaluate("window.__UFC.store.getFact('exam.resp.wheeze')") is None, 'cancel leaves previous finding')

        # ---- workup: relevant scores + investigations with WHY
        page.click('[data-tab="workup"]')
        wt = page.inner_text('main')
        check('HEART score' in wt and 'NEWS2' in wt, 'relevant scores listed automatically')
        check('12-lead ECG' in wt and 'Do now' in wt.replace('DO NOW', 'Do now'), 'investigations grouped by urgency')
        page.click('[data-act="inv-request"][data-id="ecg"]')
        check(page.evaluate("window.__UFC.store.getFact('inv.ecg')") == 'requested', 'investigation requested by the clinician')
        page.click('[data-act="open-score"][data-id="heart"]')
        page.wait_for_selector('[data-act="score-ask"]')
        page.click('[data-act="score-ask"]')
        for _ in range(6):
            if not page.query_selector('#sheet .q'):
                break
            page.click('#sheet [data-act="answer"][data-i="0"]')
        sheet = page.inner_text('#sheet')
        check('low risk' in sheet, 'HEART completes by asking only the missing inputs')
        page.click('[data-act="copy-score"]'); page.wait_for_selector('.toast')
        clip = page.evaluate("navigator.clipboard.readText()")
        check(clip.startswith('HEART score') and 'undefined' not in clip, 'COPY SCORE gives plain text')
        page.click('[data-act="close-sheet"]')

        # ---- note + copy
        page.click('[data-tab="note"]')
        page.fill('#dx', 'Acute chest pain, ACS not excluded'); page.dispatch_event('#dx', 'change')
        page.click('[data-act="dispo"][data-v="Admit to ward"]')
        page.click('.fab [data-act="copy"][data-target="complete"]')
        page.wait_for_selector('.toast')
        clip = page.evaluate("navigator.clipboard.readText()")
        check(clip.startswith('CLINICAL NOTE') and 'BP 120/80 mmHg (MAP 93 mmHg)' in clip, 'COPY COMPLETE CASE puts the note on the clipboard')
        check(not any(x in clip for x in ('{', 'undefined', 'NaN', '[object')), 'copied text is plain (no JSON / undefined / NaN)')
        check('DR. AHMED' not in clip, 'watermark not copied')
        check('Systolic BP 85 recorded earlier was corrected' in clip, 'correction documented in the copied note')
        check('Requested: 12-lead ECG' in clip, 'requested investigation documented')
        check('HEART score' in clip and 'CLINICAL SCORES' in clip, 'calculated score documented')
        page.click('[data-act="copy"][data-target="vitals"]')
        page.wait_for_selector('.toast')
        check(page.evaluate("navigator.clipboard.readText()").startswith('VITAL SIGNS'), 'per-section copy works')

        # ---- treat: reassessment documented exactly as selected
        page.click('[data-tab="treat"]')
        page.fill('#txtext', 'Aspirin given'); page.click('[data-act="add-treatment"]')
        page.click('[data-act="reassess"][data-v="partial"]')
        check('partial symptomatic improvement' in page.inner_text('main'), 'reassessment documented')

        # ---- medication: verified dose, 7-line details, record as given
        page.click('[data-act="open-drug"][data-id="adenosine"]')
        sheet = page.inner_text('#sheet')
        check('6 mg' in sheet and 'Adult Tachyarrhythmia' in sheet, 'adenosine dose shown with its 2025 AHA source')
        page.click('#sheet details summary')
        check('Management of side effects' in page.inner_text('#sheet'), 'MEDICATION DETAILS expands to 7 lines')
        page.click('[data-act="drug-record"]')
        check(any('Adenosine 6 mg' in e['text'] for e in page.evaluate("window.__UFC.store.state.events")), 'medication recorded with dose and time')

        # ---- timeline
        page.click('[data-tab="note"]'); page.click('[data-act="note-mode"][data-m="timeline"]')
        page.fill('#evtext', 'Cardiology contacted'); page.click('[data-act="add-event"]')
        check('Cardiology contacted' in page.inner_text('main') and 'Aspirin given' in page.inner_text('main'), 'timeline event added with automatic time')

        # ---- consultant outputs
        page.click('[data-act="note-mode"][data-m="consultant"]')
        check('CONSULTANT SUMMARY' in page.inner_text('main') and 'Outstanding issues' in page.inner_text('main'), 'consultant summary generated without another request')
        page.click('[data-act="note-mode"][data-m="icd"]')
        page.click('[data-act="icd-toggle"][data-code="R07.4"]')
        page.click('[data-act="copy"][data-target="icd"]'); page.wait_for_selector('.toast')
        check('R07.4' in page.evaluate("navigator.clipboard.readText()"), 'ICD-10 copy contains clinician-confirmed code')
        page.click('[data-act="note-mode"][data-m="discharge"]')
        page.click('[data-act="copy"][data-target="patient_ar"]'); page.wait_for_selector('.toast')
        check('تعليمات المريض' in page.evaluate("navigator.clipboard.readText()"), 'Arabic patient instructions copy')

        # ---- finalize
        page.click('[data-act="note-mode"][data-m="note"]')
        page.click('[data-act="finalize"]'); page.click('[data-modal-act="ok"]')
        check('CASE COMPLETE' in page.inner_text('main'), 'case finalized')
        check(page.evaluate("window.__UFC.store.state.versions.some(v=>v.kind==='final')"), 'final version stored')
        page.click('[data-act="copy"][data-target="mcchis"]'); page.wait_for_selector('.toast')
        check(page.evaluate("navigator.clipboard.readText()").startswith('MCCHIS NOTE'), 'final screen: one-tap COPY MCCHIS')

        # ---- reload: OPEN LAST CASE restores everything
        page.wait_for_timeout(600)
        page.reload(); page.wait_for_selector('[data-act="open-case"]')
        page.click('text=Open last case')
        page.wait_for_selector('.nav')
        check(page.evaluate("window.__UFC.store.getFact('vitals.sbp')") == 120, 'reload restores the last case from local storage')
        check(page.evaluate("window.__UFC.store.state.status") == 'final', 'finalized status restored')

        # ---- multiple complaints in ONE case, Think tab
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

        # ---- resuscitation mode: timers, weight-based paediatric doses, everything time-stamped
        page.click('[data-act="home"]'); page.click('[data-act="new-case"]'); page.fill('#age', '6'); page.click('[data-act="sex"][data-v="female"]'); page.click('[data-act="intake-submit"]')
        page.click('[data-act="resus-open"]')
        page.click('[data-act="resus"][data-kind="start"]')
        check('Weight is required' in page.inner_text('main'), 'paediatric resus: weight required before weight-based doses')
        page.evaluate("window.__UFC.store.setFact('vitals.weight', 20, {origin:'measurement'})")
        page.wait_for_timeout(300)
        rt = page.inner_text('main')
        check('0.2 mg' in rt and '100 mg' in rt and '40 J' in rt, 'paediatric epinephrine 0.2 mg, amiodarone 100 mg, first shock 40 J at 20 kg')
        page.click('[data-act="resus-drug"][data-kind="epinephrine"]')
        page.wait_for_timeout(1200)
        check(page.inner_text('[data-timer="epi"]') not in ('', '--:--', '—'), 'epinephrine timer running')
        check('RESUSCITATION' in page.evaluate("window.__UFC.copy('complete')") and 'Cardiac arrest — CPR started' in page.evaluate("window.__UFC.copy('complete')"), 'resuscitation events documented in the note')

        # ---- natural-language intake (offline), confirmed before saving
        page.click('[data-act="home"]'); page.click('[data-act="new-case"]')
        page.fill('#text', '55-year-old male diabetic and hypertensive with crushing central chest pain for 30 minutes, sweating and nauseated.')
        page.click('[data-act="intake-submit"]')
        dt = page.inner_text('main')
        check('Detected from your text' in dt and 'Chest pain' in dt and 'Diabetes' in dt, 'free text parsed into a confirmation list')
        check(page.evaluate("window.__UFC.store.getFact('pmh.diabetes')") is None, 'nothing saved before confirmation')
        page.click('[data-act="det-apply"]')
        check(page.evaluate("[window.__UFC.store.getFact('patient.age'), window.__UFC.store.getFact('pmh.diabetes'), window.__UFC.store.getFact('hx.chest_pain.character')]") == [55, 'yes', 'crushing'], 'confirmed items saved once and reused')
        page.click('[data-act="start-interview"]')
        asked = page.inner_text('.q')
        check('Diabetes' not in asked and 'crushing' not in asked.lower(), 'interview does not re-ask what was already entered')

        # ---- score library (calculator mode, nothing saved)
        page.click('[data-act="home"]'); page.click('[data-act="library"]')
        page.click('[data-act="open-score"][data-id="qsofa"]')
        check('not saved' in page.inner_text('#sheet'), 'calculator mode is labelled as not saved')
        page.click('[data-act="close-sheet"]')

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
