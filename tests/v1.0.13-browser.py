"""Browser integration tests using synthetic inputs only.
Default DOM-injection mode deliberately avoids unsupported network/file navigation.
It tests UI behavior, NOT browser storage persistence, installation or live hosting.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright
import json, time, os
ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'qa-v1.0.13'
OUT.mkdir(exist_ok=True)
HTML = (ROOT / 'dist/v1.0.13/index.html').read_text()
report = {'mode': 'isolated_DOM_injection', 'realPatientData': False, 'checks': [], 'pageErrors': [], 'networkRequests': []}
def check(name, condition):
    print(name, bool(condition), flush=True)
    report['checks'].append({'name': name, 'passed': bool(condition)})
    if not condition:
        raise AssertionError(name)
def go(page, route):
    page.evaluate('(r)=>__UFCopilotApp.navigate(r)', route)
    page.wait_for_timeout(120)
with sync_playwright() as p:
    executable=os.environ.get('CHROMIUM_EXECUTABLE')
    if not executable and Path('/usr/bin/chromium').exists(): executable='/usr/bin/chromium'
    options={'headless': True, 'args':['--no-sandbox']}
    if executable: options['executable_path']=executable
    browser = p.chromium.launch(**options)
    report['browserVersion']=browser.version
    page = browser.new_page(viewport={'width':1440,'height':1000})
    page.set_default_timeout(5000)
    page.on('pageerror', lambda e: report['pageErrors'].append(str(e)))
    page.on('request', lambda r: report['networkRequests'].append(r.url))
    page.on('dialog', lambda d: d.accept())
    started=time.perf_counter()
    page.set_content(HTML)
    page.wait_for_function('!!globalThis.__UFCopilotApp && !!document.querySelector("#ufc13")')
    report['DOMInjectionToReadyMs']=round((time.perf_counter()-started)*1000,2)
    check('Candidate visibly labels synthetic-only status', 'SYNTHETIC DATA ONLY' in page.locator('#ufc13').inner_text())
    check('Five safety fields start unknown',page.locator('#ufc13 [data-safety]').count()==5 and page.evaluate('UFCWorkflow.safety(__UFCopilotApp.getSnapshot(),ClinicalContentPack).answered')==0)
    for qid in ['q_immediate_resuscitation','q_consciousness_avpu','q_airway_compromise','q_major_active_bleeding','q_new_confusion']:
        page.locator(f'[data-safety="{qid}"]').select_option('0' if qid=='q_consciousness_avpu' else '1')
        page.wait_for_timeout(80)
    check('Safety selections write typed facts to original store',page.evaluate('UFCWorkflow.safety(__UFCopilotApp.getSnapshot(),ClinicalContentPack).complete') is True)
    page.evaluate("__UFCopilotApp.answerSafety('q_airway_compromise',true)")
    page.wait_for_timeout(150)
    check('Positive danger remains visible after all five answers',page.locator('#ufc13 .danger').count()==1)
    page.evaluate("__UFCopilotApp.answerSafety('q_airway_compromise',false)")
    page.wait_for_timeout(150)
    check('Reassessment changes the danger state',page.locator('#ufc13 .danger').count()==0)
    go(page,'complaints')
    for complaint in ['chest_pain','dyspnea']:
        page.locator(f'[data-action="toggle-complaint"][data-complaint-id="{complaint}"]').click()
        page.wait_for_timeout(100)
    go(page,'reasoning')
    check('Two active complaints generate one merged checklist',page.evaluate('UFCWorkflow.records(__UFCopilotApp.getSnapshot().complaints).length')==2 and page.locator('[data-review-item]').count()>7)
    page.locator('[data-review="0"][data-decision="keep"]').click()
    page.wait_for_timeout(130)
    check('Keep button persists review but not diagnosis',page.evaluate("__UFCopilotApp.getSnapshot().workflowEvents.at(-1).action==='keep' && __UFCopilotApp.getSnapshot().diagnoses.length===0"))
    check('Kept item is visibly marked', 'kept_for_review' in page.locator('[data-review-item="0"]').inner_text())
    page.locator('[data-review="0"][data-decision="dismiss"]').click()
    page.wait_for_timeout(130)
    check('Dismiss button changes review state', 'dismissed' in page.locator('[data-review-item="0"]').inner_text())
    page.locator('[data-review="0"][data-decision="reset"]').click()
    page.wait_for_timeout(130)
    check('Reset restores suggested state', 'suggested' in page.locator('[data-review-item="0"]').inner_text())
    before=page.evaluate('__UFCopilotV1013.stats().renders')
    page.wait_for_timeout(1200)
    after=page.evaluate('__UFCopilotV1013.stats().renders')
    check('Idle render count is stable: no observer feedback loop', before==after)
    report['idleRenderDelta']=after-before
    page.screenshot(path=str(OUT/'desktop-review.png'),full_page=True)
    for route in ['dashboard','patient','assessment','vitals','investigations','treatment','procedures','disposition','documentation','timeline','calculators','library','evidence']:
        go(page,route)
        check('Route renders: '+route,page.locator('#ufc13').count()==1 and page.evaluate('__UFCopilotApp.currentRoute()')==route)
    go(page,'documentation')
    form=page.locator('[data-u13-form="note"][data-note-name="managementPlan"]')
    form.evaluate('(f)=>f.closest("details").open=true')
    form.locator('textarea').fill('Synthetic QA plan. Observation discussed, not a clinical order.')
    form.locator('button[type="submit"]').click()
    page.wait_for_timeout(150)
    check('Narrative entry persists and appears in live note','Synthetic QA plan.' in page.locator('#u13-note').inner_text())
    check('Live note uses exact ten sections',page.evaluate('UFCWorkflow.buildDocumentation(__UFCopilotApp.getSnapshot()).sections.length')==10)
    check('No placeholder auto-diagnosis is documented','8. Primary Diagnosis\nNot documented' in page.locator('#u13-note').inner_text())
    # Finalized addendum behavior is covered with actual store operations in unit tests.
    # Test UI clipboard contract using a controlled browser clipboard mock.
    page.evaluate("Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async text=>{globalThis.__copiedNote=text;}}})")
    page.locator('[data-copy-note]').click();page.wait_for_timeout(80)
    check('COPY ALL copies exact clinical note',page.evaluate('__copiedNote===UFCWorkflow.buildDocumentation(__UFCopilotApp.getSnapshot(),ClinicalContentPack).complete'))
    go(page,'patient')
    page.locator('[data-action="voice-input"]').first.click();page.wait_for_timeout(80)
    check('Voice activation clearly reports quarantine','Voice activation is blocked' in page.locator('#ufc13-message').inner_text())
    go(page,'documentation')
    page.evaluate('document.getElementById("ufc13-message")?.remove()')
    page.screenshot(path=str(OUT/'desktop-note.png'),full_page=True)
    page.set_viewport_size({'width':390,'height':844})
    page.wait_for_timeout(120)
    check('Mobile note has no page horizontal overflow',page.evaluate('document.documentElement.scrollWidth<=window.innerWidth+1'))
    page.screenshot(path=str(OUT/'mobile-note-en.png'),full_page=True)
    # Use original language button; capture Arabic RTL without altering application data.
    page.locator('#languageButton').click();page.wait_for_timeout(150)
    check('English clinical note remains LTR inside Arabic UI',page.locator('#u13-note').get_attribute('dir')=='ltr')
    check('Arabic mode uses RTL',page.evaluate('document.documentElement.dir')=='rtl')
    check('Mobile Arabic has no horizontal overflow',page.evaluate('document.documentElement.scrollWidth<=window.innerWidth+1'))
    page.screenshot(path=str(OUT/'mobile-note-ar.png'),full_page=True)
    check('No uncaught browser errors',len(report['pageErrors'])==0)
    check('Candidate has no external network requests in isolated run',len(report['networkRequests'])==0)
    report['renderStats']=page.evaluate('__UFCopilotV1013.stats()')
    report['passed']=all(c['passed'] for c in report['checks'])
    browser.close()
(OUT/'browser-results.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print(json.dumps(report,ensure_ascii=False,indent=2))
