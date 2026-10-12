#!/usr/bin/env python3
"""Browser smoke test for the self-contained release.

Guards against the defects found in the V1.0.8-V1.0.12 chain:
  * main-thread freezes (MutationObserver feedback loops) on any route,
  * modules silently not loading,
  * the app not working offline / service worker 404.

Usage: python3 tests/smoke_test.py 1.0.13
Needs: pip install playwright && playwright install chromium
"""
import functools, http.server, os, sys, threading
from playwright.sync_api import sync_playwright

VERSION = sys.argv[1] if len(sys.argv) > 1 else '1.0.13'
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
ROUTES = ['dashboard', 'patient', 'complaints', 'assessment', 'investigations',
          'reasoning', 'treatment', 'disposition', 'documentation']
GLOBALS = ['__UFCopilotApp', '__UFCopilotAutoVoiceV105', '__UFCopilotClinicalUxV106',
           '__UFCopilotPrecisionV107', '__UFCopilotFastUIV108', '__UFCopilotSafetyFirstV110',
           '__UFCopilotCommandCenterV110', '__UFCopilotDeepAutoV111']
HEARTBEAT = "setInterval(()=>console.log('__HB__'),200)"
failures = []


def check(ok, msg):
    print(('PASS  ' if ok else 'FAIL  ') + msg, flush=True)
    if not ok:
        failures.append(msg)


class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a):
        pass


def serve():
    handler = functools.partial(Quiet, directory=ROOT)
    srv = http.server.ThreadingHTTPServer(('127.0.0.1', 0), handler)
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    return srv, f'http://127.0.0.1:{srv.server_address[1]}'


def main():
    srv, base = serve()
    page_url = f'{base}/v{VERSION}.html'
    with sync_playwright() as p:
        browser = p.chromium.launch()

        # 1. Online run without SW: modules, errors, and no freeze on any route.
        ctx = browser.new_context(service_workers='block', viewport={'width': 420, 'height': 900})
        ctx.add_init_script(HEARTBEAT)
        page = ctx.new_page()
        beats, errors = [], []
        page.on('console', lambda m: beats.append(1) if m.text == '__HB__' else (errors.append(m.text) if m.type == 'error' else None))
        page.on('pageerror', lambda e: errors.append(str(e)))
        page.goto(page_url, wait_until='domcontentloaded')
        page.wait_for_timeout(2500)

        def responsive():
            n0 = len(beats)
            page.wait_for_timeout(1500)
            return len(beats) - n0 >= 4

        check(responsive(), 'page responsive after load')
        present = page.evaluate('g => g.filter(k => !!window[k])', GLOBALS)
        check(sorted(present) == sorted(GLOBALS), f'all {len(GLOBALS)} module globals present ({len(present)} found)')
        check(page.evaluate("!!document.querySelector('#v110command')"), 'command center rendered')
        for r in ROUTES:
            page.evaluate('r => window.__UFCopilotApp.navigate(r)', r)
            check(responsive(), f'responsive on route "{r}"')
        page.evaluate('r => window.__UFCopilotApp.navigate(r)', 'investigations')
        page.wait_for_timeout(600)
        check(page.evaluate("!!document.querySelector('#v111tests')"), 'deep-auto tests card rendered on investigations')
        check(not errors, f'no console/page errors{"" if not errors else ": " + "; ".join(errors[:3])}')
        ctx.close()

        # 2. Offline run with the service worker.
        ctx = browser.new_context(viewport={'width': 420, 'height': 900})
        page = ctx.new_page()
        page.goto(page_url, wait_until='domcontentloaded')
        page.wait_for_timeout(2000)
        check(page.evaluate('navigator.serviceWorker.ready.then(r => !!r.active)'), 'service worker active')
        ctx.set_offline(True)
        page2 = ctx.new_page()
        page2.goto(page_url, wait_until='domcontentloaded')
        page2.wait_for_timeout(2500)
        check(page2.evaluate("!!window.__UFCopilotApp && !!document.querySelector('#v110command')"), 'app loads fully while offline')
        browser.close()
    srv.shutdown()
    print('\n%s' % ('%d check(s) failed' % len(failures) if failures else 'All smoke checks passed'))
    sys.exit(1 if failures else 0)


main()
