#!/usr/bin/env node
// Static integrity checks for the current self-contained release.
// Usage: node tools/verify-release.mjs <x.y.z>
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import os from 'node:os';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const VERSION = process.argv[2];
if (!/^\d+\.\d+\.\d+$/.test(VERSION || '')) { console.error('Usage: verify-release.mjs <x.y.z>'); process.exit(2); }
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const failures = [];
const check = (ok, msg) => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${msg}`); if (!ok) failures.push(msg); };

const file = `v${VERSION}.html`;
const html = read(file);

// 1. Every inline script compiles.
const scripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(m => m[1]);
let compileOk = true;
scripts.forEach((code, i) => {
  try { new vm.Script(code, { filename: `${file}#script${i}` }); }
  catch (e) { compileOk = false; console.log(`      script ${i}: ${e.message}`); }
});
check(scripts.length > 0 && compileOk, `all ${scripts.length} inline scripts compile (${file})`);

// 2. Self-contained: no external script, no runtime fetch of other versions, no document.write loader.
check(!/<script[^>]+\bsrc=/i.test(html), 'no external <script src> (offline-capable)');
check(!/fetch\(\s*['"`]\.\/v\d/.test(html), 'no runtime fetch of other version files');
check(!/document\.write\(/.test(html), 'no document.write loader');

// 3. Expected modules are present (guards against silently dropped patches).
const modules = [...html.matchAll(/data-module="([^"]+)"/g)].map(m => m[1]);
for (const m of ['v1.0.5-auto-english-voice.js', 'v1.0.6-clinical-ux.js', 'v1.0.9-safety-first.js',
  'v1.0.10-command-center.js', 'v1.0.11-deep-auto.js', 'v1.0.7-precision-loader.js', 'v1.0.8-rapid-loader.js']) {
  check(modules.includes(m), `module present: ${m}`);
}

// 4. Version consistency.
check(html.includes(`const APP_VERSION = '${VERSION}';`), `APP_VERSION is ${VERSION}`);
check(html.includes(`<title>Ultra Fast Clinical Copilot V${VERSION}</title>`), 'title carries the release version');
const idx = read('index.html');
check(idx.includes(`v${VERSION}.html`), `index.html points to ${file}`);
check(read('README.md').includes(`**V${VERSION}**`), 'README current release matches');
check(read('service-worker.js').includes(`const VERSION = '${VERSION}';`), 'service worker version matches');

// 5. PWA assets.
let manifestOk = false;
try { const m = JSON.parse(read('manifest.webmanifest')); manifestOk = m.start_url.includes(file) && m.icons?.length > 0; } catch { /* ignore */ }
check(manifestOk, 'manifest.webmanifest valid and starts at the current release');
check(fs.existsSync(path.join(ROOT, 'icon.svg')), 'icon.svg present');
check(html.includes('rel="manifest"'), 'release links the manifest');

// 6. Every standalone module file still parses.
for (const f of fs.readdirSync(ROOT).filter(n => /^v1\.0\.\d+(-[\w.-]+)?\.js$/.test(n) && !/part\d+/.test(n))) {
  const src = read(f);
  let ok = true;
  try {
    if (/^\s*import\s/m.test(src)) {
      // ES-module worker: check as a module.
      const tmp = path.join(os.tmpdir(), `ufc-check-${process.pid}.mjs`);
      fs.writeFileSync(tmp, src);
      try { execFileSync(process.execPath, ['--check', tmp], { stdio: 'pipe' }); } finally { fs.rmSync(tmp, { force: true }); }
    } else {
      new vm.Script(src, { filename: f });
    }
  } catch (e) { ok = false; console.log(`      ${f}: ${String(e.message).split('\n')[0]}`); }
  check(ok, `syntax: ${f}`);
}

console.log(failures.length ? `\n${failures.length} check(s) failed` : '\nAll checks passed');
process.exit(failures.length ? 1 : 0);
