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
                page.fill('#num-input', '5'); page.press('#num-input', 'Enter')
            else:
                page.click('[data-act="answer"]')
        check(len(seen) >= 8, f'interview asked {len(seen)} distinct questions')
        check(page.evaluate("window.__UFC.ui.tab") == 'exam', 'interview completes and moves straight to the exam step')
        check(page.query_selector('[data-act="answer-num"]') is None, 'numeric answers need no Save button')
        check(page.evaluate("window.__UFC.store.getFact('allergy.status')") is not None, 'allergy question answered (safety)')
        check(page.evaluate("window.__UFC.store.getFact('pmh.hyperlipidaemia')") == 'no', 'score inputs asked in the interview (HEART risk factors)')

        # ---- vitals: BP entered once as SBP + DBP, derived values, alert, correction
        page.click('[data-tab="exam"]')
        page.fill('#vi-sbp', '85'); page.press('#vi-sbp', 'Enter'); page.fill('#vi-dbp', '50'); page.press('#vi-dbp', 'Enter')
        page.fill('#vi-hr', '88'); page.press('#vi-hr', 'Enter')
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
        check(page.input_value('#vi-sbp') == '120' and page.input_value('#vi-dbp') == '80' and 'MAP: 93 mmHg' in page.inner_text('main'), 'corrected BP and MAP displayed')
        page.click('[data-tab="now"]')
        check('Hypotension' not in page.inner_text('main'), 'hypotension alert gone after correction')

        # ---- GCS incomplete then complete
        page.click('[data-tab="exam"]')
        page.click('[data-act="gcs"][data-k="e"][data-v="4"]')
        check('GCS incomplete — missing verbal response and motor response.' in page.inner_text('main'), 'GCS incomplete message')
        page.click('[data-act="gcs"][data-k="v"][data-v="5"]'); page.click('[data-act="gcs"][data-k="m"][data-v="6"]')
        check('GCS 15/15 (E4 V5 M6)' in page.inner_text('main'), 'GCS total calculated automatically')

        # ---- exam: 'All normal' records only what the clinician keeps ticked (never rectal / GU)
        page.click('[data-act="exam-normal"][data-sys="gen"]')
        boxes = page.query_selector_all('#modal .chk input')
        check(len(boxes) >= 8, f'all-normal lists {len(boxes)} general statements for review before recording')
        page.uncheck('#modal input[name="g-nodes"]')
        page.click('#modal [data-modal-act="ok"]')
        full = page.evaluate("window.__UFC.copy('complete')").lower()
        check('well-looking' in full and 'no pallor' in full, 'ticked normal findings documented')
        check('no lymphadenopathy' not in full, 'unticked statement is not documented')
        check(page.query_selector('[data-act="exam-normal"][data-sys="gu"]') is None, 'no bulk-normal for genitourinary / obstetric examination')

        # ---- exam contradiction (local respiratory examination)
        page.click('details.exsys[data-sys="resp"] > summary')
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

        # ---- AUTO PLAN: investigations, diagnosis, treatment and doses prepared automatically; one tap approves
        page.click('[data-act="home"]'); page.click('[data-act="new-case"]'); page.fill('#age', '70'); page.click('[data-act="sex"][data-v="female"]'); page.click('[data-act="intake-submit"]')
        page.click('[data-act="toggle-complaint"][data-key="syncope"]'); page.click('[data-act="start-interview"]')
        for _ in range(80):
            if not page.query_selector('.q'):
                break
            if page.query_selector('[data-act="answer"][data-v="no"]'): page.click('[data-act="answer"][data-v="no"]')
            elif page.query_selector('[data-act="answer-duration"]'): page.click('[data-act="answer-duration"]')
            elif page.query_selector('#num-input'): page.fill('#num-input', '5'); page.press('#num-input', 'Enter')
            else: page.click('[data-act="answer"]')
        check(page.evaluate("window.__UFC.ui.tab") == 'exam', 'auto plan scenario: interview done, moved to exam')
        page.fill('#vi-hr', '40'); page.press('#vi-hr', 'Enter')
        page.fill('#vi-weight', '70'); page.press('#vi-weight', 'Enter')
        page.click('[data-act="tab"][data-tab="now"]')
        pt = page.inner_text('main')
        check('Auto plan' in pt and 'ECG' in pt, 'investigations planned automatically (no request tap)')
        check('Working diagnosis' in pt, 'working diagnosis chosen automatically')
        check('Atropine' in pt and '1 mg' in pt, 'treatment with calculated dose planned automatically')
        check(page.evaluate("window.__UFC.store.getFact('inv.ecg')") is None, 'nothing in the record before approval')
        page.screenshot(path='/tmp/claude-0/-home-claude/f628389d-3ddd-592f-b161-98061ccf2e81/scratchpad/autoplan.png', full_page=True)
        page.click('[data-act="plan-approve"]')
        note = page.evaluate("window.__UFC.copy('complete')")
        check(page.evaluate("window.__UFC.store.getFact('inv.ecg')") == 'requested', 'one tap: investigations requested')
        check('Working diagnosis (auto-generated, approved by clinician)' in note, 'one tap: working diagnosis documented')
        check('TREATMENT ORDERED' in note and 'Atropine 1 mg IV bolus ordered' in note, 'one tap: medication ordered with its dose')
        # approval can make a new score relevant: its one missing input is asked automatically, one question at a time
        for _ in range(10):
            if not page.query_selector('.q'):
                break
            page.click('[data-act="answer"][data-v="no"]') if page.query_selector('[data-act="answer"][data-v="no"]') else page.click('[data-act="answer"]')
        if page.query_selector('[data-act="plan-approve"]'): page.click('[data-act="plan-approve"]')
        page.screenshot(path='/tmp/claude-0/-home-claude/f628389d-3ddd-592f-b161-98061ccf2e81/scratchpad/autoplan-done.png', full_page=True)
        check('Auto plan approved' in page.inner_text('main'), 'plan shows approved state')

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
        page.wait_for_timeout(300)
        dt = page.inner_text('#live-parse')
        check('Chest pain' in dt and 'Diabetes' in dt, 'free text understood live on the same screen')
        check(page.evaluate("document.getElementById('demo-hand').open") is False, 'manual age/sex box folds away when the text gives both')
        check(page.evaluate("window.__UFC.store.getFact('pmh.diabetes')") is None, 'nothing saved before confirmation')
        nausea = page.query_selector('#live-parse [data-act="u-toggle"]:has-text("Nausea")')
        nkey = nausea.get_attribute('data-k')[2:] if nausea else None
        if nausea: nausea.click()
        check(nausea is not None and 'off' in page.get_attribute(f'#live-parse [data-k="f:{nkey}"]', 'class'), 'one tap removes a wrongly understood item')
        page.click('[data-act="intake-submit"]')
        check(page.evaluate("[window.__UFC.store.getFact('patient.age'), window.__UFC.store.getFact('pmh.diabetes'), window.__UFC.store.getFact('hx.chest_pain.character')]") == [55, 'yes', 'crushing'], 'confirmed items saved once and reused')
        check(nkey is not None and page.evaluate(f"window.__UFC.store.getFact('{nkey}')") is None, 'removed item is not saved')
        check(page.evaluate("window.__UFC.ui.screen") == 'case', 'recognised complaint goes straight to the interview (no second confirmation screen)')
        asked = page.inner_text('.q')
        check('Diabetes' not in asked and 'crushing' not in asked.lower(), 'interview does not re-ask what was already entered')

        # ---- dictation: continuous speech-to-text into any text field (simulated microphone)
        dp = ctx.new_page()
        dp.add_init_script("""
          window.SpeechRecognition = class {
            static async available({ langs, processLocally }) {
              const l = langs[0];
              if (l === 'ti-ET') return 'unavailable';
              if (l === 'am-ET') return processLocally ? 'downloadable' : 'available';
              return processLocally ? 'unavailable' : 'available';
            }
            static async install() { return true; }
            start() { window.__recLang = this.lang; window.__recLocal = !!this.processLocally;
              setTimeout(() => this.onresult && this.onresult({ resultIndex: 0, results: [Object.assign([{ transcript: 'crushing chest pain' }], { isFinal: true })] }), 80); }
            stop() { setTimeout(() => this.onend && this.onend(), 10); }
          };""")
        dp.goto(BASE); dp.wait_for_selector('[data-act="new-case"]')
        dp.click('[data-act="new-case"]')
        check(dp.query_selector('[data-act="dictate"][data-target="text"]') is not None, 'dictation button on the intake text')
        dp.click('[data-act="dictate"][data-target="text"]')
        dp.wait_for_timeout(400)
        check('crushing chest pain' in dp.input_value('#text'), 'dictated words appear in the field')
        check(dp.query_selector('.bigmic.live, .mic.live') is not None and 'Listening' in dp.inner_text('main'), 'listening state shown while dictating')
        dp.click('[data-act="dictate"][data-target="text"]')
        dp.wait_for_timeout(200)
        check(dp.query_selector('.bigmic.live, .mic.live') is None, 'Stop ends dictation')
        check('crushing chest pain' in dp.evaluate("window.__UFC.ui.intake.text"), 'dictated text kept in the intake')
        dp.click('[data-act="dict-lang"]'); dp.wait_for_timeout(300)
        lt = dp.inner_text('#sheet')
        check(all(x in lt for x in ['Saudi', 'Egyptian', 'Sudanese', 'Moroccan', 'Bengali', 'Hindi', 'Urdu', 'Filipino', 'Amharic', 'Oromo', 'Tigrinya', 'Swahili']), 'language picker: Arabic dialects, South Asian, Filipino, Ethiopian and Swahili languages')
        check('Mehri' in lt and 'No browser or phone speech engine recognises Mehri' in lt, 'Mehri shown as not supported, with the reason')
        check('Not supported on this device' in lt and 'Available · offline download' in lt, 'per-language availability checked on the device')
        check('Speech recognition supported in this browser' in lt, 'device diagnostics shown')
        dp.click('[data-act="dict-pick"][data-code="bn-BD"]')
        dp.click('[data-act="dictate"][data-target="text"]'); dp.wait_for_timeout(200)
        check(dp.evaluate("window.__recLang") == 'bn-BD', 'dictation in Bengali')
        dp.click('[data-act="dictate"][data-target="text"]'); dp.wait_for_timeout(150)
        dp.click('[data-act="dict-lang"]'); dp.wait_for_timeout(300)
        dp.click('[data-act="dict-pick"][data-code="am-ET"]')
        dp.click('[data-modal-act="ok"]'); dp.wait_for_timeout(200)
        dp.click('[data-act="dictate"][data-target="text"]'); dp.wait_for_timeout(200)
        check(dp.evaluate("window.__recLang") == 'am-ET' and dp.evaluate("window.__recLocal") is True, 'Amharic downloaded and recognised on-device (offline)')
        dp.close()
        # permission refused (as in an in-app preview): button must not stay on "Listening"
        dq = ctx.new_page()
        dq.add_init_script("""window.SpeechRecognition = class { start() { setTimeout(() => { this.onerror && this.onerror({ error: 'not-allowed' }); this.onend && this.onend(); }, 50); } stop() {} abort() {} };""")
        dq.goto(BASE); dq.wait_for_selector('[data-act="new-case"]'); dq.click('[data-act="new-case"]')
        dq.click('[data-act="dictate"][data-target="text"]'); dq.wait_for_timeout(300)
        check(dq.query_selector('.bigmic.live, .mic.live') is None and 'Listening' not in dq.inner_text('main'), 'refused microphone: dictation stops cleanly (no stuck Listening state)')
        dq.close()
        # SCRIBE: one tap on the home screen starts the microphone; the record is understood while speaking
        ds = ctx.new_page()
        ds.add_init_script("""window.SpeechRecognition = class { start() { setTimeout(() => this.onresult && this.onresult({ resultIndex: 0, results: [Object.assign([{ transcript: '60 year old woman, diabetic, with shortness of breath for 2 days' }], { isFinal: true })] }), 60); } stop() { setTimeout(() => this.onend && this.onend(), 5); } };""")
        ds.goto(BASE); ds.wait_for_selector('[data-act="scribe"]')
        ds.click('[data-act="scribe"]'); ds.wait_for_timeout(500)
        lp = ds.inner_text('#live-parse')
        check('60' in lp and 'Female' in lp and 'Diabetes' in lp, 'scribe: one tap starts listening; age, sex and history understood live')
        check(ds.query_selector('.bigmic.live') is not None, 'scribe: large microphone shows listening state')
        ds.click('[data-act="intake-submit"]'); ds.wait_for_timeout(200)
        check(ds.evaluate("[window.__UFC.store.getFact('patient.age'), window.__UFC.store.getFact('patient.sex'), window.__UFC.store.getFact('pmh.diabetes')]") == [60, 'female', 'yes'], 'scribe: confirmed once, saved once')
        ds.close()

        # ---- VOCABULARIES: tens of thousands of symptoms, signs, history, diagnoses, investigations, drugs, procedures
        SHOT = '/tmp/claude-0/-home-claude/f628389d-3ddd-592f-b161-98061ccf2e81/scratchpad/'
        page.click('[data-act="home"]'); page.click('[data-act="new-case"]'); page.fill('#age', '60'); page.click('[data-act="sex"][data-v="male"]'); page.click('[data-act="intake-submit"]')
        page.click('[data-act="toggle-complaint"][data-key="dyspnea"]'); page.click('[data-act="start-interview"]')
        page.click('[data-tab="history"]')
        page.click('summary:has-text("Add to the history")')
        t0 = page.evaluate('performance.now()')
        page.click('[data-act="vx-open"][data-kind="symptom"]')
        page.wait_for_selector('#vxq')
        load_ms = page.evaluate('performance.now()') - t0
        print(f'      vocabulary first load: {load_ms:.0f} ms')
        check(load_ms < 8000, f'vocabulary loads offline on first use ({load_ms:.0f} ms)')
        page.fill('#vxq', 'shortness of breath'); page.wait_for_timeout(250)
        check('Dyspnea' in page.inner_text('#vxres'), 'symptom found by synonym (HPO)')
        page.screenshot(path=SHOT + 'vocab-symptom.png')
        page.click('#vxres [data-act="vx-add"][data-st="present"] >> nth=0')
        page.fill('#vxq', 'hemoptysis'); page.wait_for_timeout(250)
        page.click('#vxres [data-act="vx-add"][data-st="absent"] >> nth=0')
        page.click('[data-act="close-sheet"]')
        page.click('[data-act="vx-open"][data-kind="pmh"]'); page.fill('#vxq', 'essential (primary) hypertension'); page.wait_for_timeout(250)
        page.click('#vxres [data-act="vx-add"] >> nth=0'); page.click('[data-act="close-sheet"]')
        page.click('[data-act="vx-open"][data-kind="med"]'); page.fill('#vxq', 'paracetamol'); page.wait_for_timeout(250)
        check('acetaminophen' in page.inner_text('#vxres'), 'international drug name finds RxNorm entry')
        page.click('#vxres [data-act="vx-add"] >> nth=0'); page.click('[data-act="close-sheet"]')
        # general examination template
        page.click('[data-tab="exam"]')
        page.click('[data-act="exam"][data-f="exam.gen.appearance.normal"]')
        page.click('[data-act="exam"][data-f="exam.gen.pallor.normal"]')
        page.click('[data-act="vx-open"][data-kind="sign"]'); page.fill('#vxq', 'hepatomegaly'); page.wait_for_timeout(250)
        page.click('#vxres [data-act="vx-add"][data-st="present"] >> nth=0'); page.click('[data-act="close-sheet"]')
        page.screenshot(path=SHOT + 'exam-general.png', full_page=True)
        # investigations, diagnosis, treatment
        page.click('[data-tab="workup"]')
        page.click('[data-act="vx-open"][data-kind="imaging"]'); page.fill('#vxq', 'computerized tomography chest'); page.wait_for_timeout(250)
        page.click('#vxres [data-act="vx-add"] >> nth=0'); page.click('[data-act="close-sheet"]')
        page.click('[data-tab="think"]')
        page.click('[data-act="vx-open"][data-kind="dx"]'); page.fill('#vxq', 'J18.9'); page.wait_for_timeout(250)
        check('Pneumonia' in page.inner_text('#vxres'), 'ICD-10-CM diagnosis found by code')
        page.click('#vxres [data-act="vx-add"] >> nth=0'); page.click('[data-act="close-sheet"]')
        page.click('[data-tab="treat"]')
        page.click('[data-act="vx-open"][data-kind="drug"]'); page.fill('#vxq', 'ceftriaxone'); page.wait_for_timeout(250)
        check('Cephalosporin' in page.inner_text('#vxres'), 'drug class shown from RxClass')
        page.screenshot(path=SHOT + 'vocab-drug.png')
        page.click('#vxres [data-act="vx-add"] >> nth=0')
        page.fill('#mf-instr', '2 g IV once daily'); page.click('[data-modal-act="ok"]')
        page.click('[data-act="close-sheet"]')
        note = page.evaluate("window.__UFC.copy('complete')")
        check('Also reports dyspnea' in note and 'Denies hemoptysis' in note, 'symptoms documented (present and absent)')
        check('essential (primary) hypertension' in note and 'Current medications: acetaminophen' in note, 'past history and medications documented')
        check('well-looking' in note and 'no pallor' in note and 'Other findings: hepatomegaly' in note, 'general examination and signs documented')
        check('Computerized Tomography' in note, 'imaging request documented')
        check('(J18.9)' in note, 'coded diagnosis documented')
        check('ceftriaxone — 2 g IV once daily — ordered' in note, 'medication order documented with clinician-entered dose')
        check('J18.9' in page.evaluate("window.__UFC.output('icd')"), 'coded diagnosis in ICD-10 copy')

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
