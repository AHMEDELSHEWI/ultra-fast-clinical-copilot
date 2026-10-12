#!/usr/bin/env node
// Build a self-contained release from the legacy fetch-and-patch chain.
//
// The historical entry points (v1.0.8 ... v1.0.12) each fetch the previous
// version at runtime, patch the HTML string and document.write() it, and a
// few loaders then fetch extra JS parts. That chain needs ~40 network requests
// and cannot work offline. This script replays the exact same transformations
// at build time inside a sandbox, then inlines every module so the output is a
// single static HTML file.
//
// Usage: node tools/build-release.mjs <version> [--from v1.0.12.html]
//        e.g. node tools/build-release.mjs 1.0.13

import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const VERSION = args.find(a => /^\d+\.\d+\.\d+$/.test(a));
if (!VERSION) {
  console.error('Usage: node tools/build-release.mjs <x.y.z> [--from vX.Y.Z.html]');
  process.exit(2);
}
const fromIdx = args.indexOf('--from');
const FROM = fromIdx >= 0 ? args[fromIdx + 1] : 'v1.0.12.html';
const OUT = path.join(ROOT, `v${VERSION}.html`);

// Script files that are loaders appending a fetched module to <head>.
const LOADER_SCRIPTS = new Set(['v1.0.7-precision-loader.js', 'v1.0.8-rapid-loader.js', 'v1.0.8-ui-loader.js']);

const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const cleanName = u => String(u).split('?')[0].replace(/^\.\//, '').replace(/^\/+/, '');

function response(text) {
  return { ok: true, status: 200, text: async () => text };
}

function inlineScripts(html) {
  // Scripts with no attributes = the loader body (nested '<' + '/script>' strings
  // never contain a literal closing tag, so the first closing tag is the real one).
  const out = [];
  const re = /<script>([\s\S]*?)<\/script>/g;
  let m;
  while ((m = re.exec(html))) out.push(m[1]);
  return out;
}

// A "shell" is a page whose inline script fetches another page and rewrites the
// document. Legacy loaders fetch the RAW text of the previous version's shell,
// patch that text, and document.write() it, which then runs as a new page. So
// the chain is replayed layer by layer until a page with no shell loader is left.
const SHELL_RE = /fetch\(\s*['"]\.\/(?:v\d[\d.]*\.html|index-ultra-fast-clinical-copilot\.html)/;

async function runShell(html, label) {
  const code = inlineScripts(html).join('\n');
  let written = null;
  let loadError = '';
  let done;
  const finished = new Promise(res => { done = res; });
  const sandbox = {
    console,
    setTimeout, clearTimeout,
    fetch: async (url) => response(read(cleanName(url))),
    location: { replace() {}, href: 'http://localhost/' },
    document: {
      baseURI: 'http://localhost/',
      open() {},
      write(h) { written = h; },
      close() { done(); },
      getElementById: () => ({
        set textContent(v) { loadError = v; done(); },
        get textContent() { return loadError; },
        set hidden(_) {},
      }),
    },
  };
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(code, sandbox, { filename: label });
  await Promise.race([
    finished,
    new Promise((_, rej) => setTimeout(() => rej(new Error(`${label}: loader timed out`)), 20000)),
  ]);
  if (written === null) throw new Error(`${label}: loader failed: ${loadError}`);
  return written;
}

async function resolvePage(name) {
  let html = read(name);
  let layer = 0;
  while (SHELL_RE.test(inlineScripts(html).join('\n'))) {
    if (++layer > 20) throw new Error('Loader chain too deep');
    html = await runShell(html, `${name}#layer${layer}`);
  }
  console.log(`Replayed ${layer} loader layer(s) starting from ${name}`);
  return html;
}

// Replay a loader script (precision / rapid) and capture the module it appends.
async function resolveLoaderScript(name) {
  let captured = null;
  let done;
  const finished = new Promise(res => { done = res; });
  const fakeEl = () => ({ dataset: {}, set textContent(v) { this._t = v; }, get textContent() { return this._t; }, className: '' });
  const sandbox = {
    console,
    URL,
    fetch: async (url) => response(read(cleanName(url instanceof URL ? url.pathname : url))),
    document: {
      baseURI: 'http://localhost/',
      createElement: fakeEl,
      head: { appendChild(el) { captured = el.textContent; done(); } },
      getElementById: () => null,
    },
  };
  vm.createContext(sandbox);
  vm.runInContext(read(name), sandbox, { filename: name });
  await Promise.race([
    finished,
    new Promise((_, rej) => setTimeout(() => rej(new Error(`${name}: module did not load`)), 20000)),
  ]);
  return captured;
}

const safe = js => js.replace(/<\/script/gi, '<\\/script').replace(/<!--/g, '<\\!--');

(async () => {
  let html = await resolvePage(FROM);

  // Explicit module manifest. The legacy chain tried to add the v1.0.10 and
  // v1.0.11 modules with string replacements that silently matched nothing, so
  // those modules never loaded in production. Declare them explicitly instead.
  // Synchronous modules first, then modules that used to be appended after an
  // async fetch (precision, rapid), keeping their original effective order.
  const SYNC_MODULES = [
    'v1.0.5-auto-english-voice.js',
    'v1.0.6-clinical-ux.js',
    'v1.0.9-safety-first.js',
    'v1.0.10-command-center.js',
    'v1.0.11-deep-auto.js',
  ];
  const srcRe = /<script src="\.\/([^"?]+)(?:\?[^"]*)?"[^>]*><\/script>/g;
  const present = [];
  html = html.replace(srcRe, (_tag, file) => { present.push(file); return ''; });
  const known = new Set([...SYNC_MODULES, ...LOADER_SCRIPTS]);
  const unknown = present.filter(f => !known.has(f));
  if (unknown.length) throw new Error('Unknown module reference(s): ' + unknown.join(', '));
  const dropped = SYNC_MODULES.filter(f => !present.includes(f));
  if (dropped.length) console.log('Note: chain silently dropped, now included: ' + dropped.join(', '));

  const blocks = SYNC_MODULES.map(f => `<script data-module="${f}">${safe(read(f))}</script>`);
  for (const f of ['v1.0.7-precision-loader.js', 'v1.0.8-rapid-loader.js']) {
    blocks.push(`<script data-module="${f}">${safe(await resolveLoaderScript(f))}</script>`);
  }
  const tail = blocks.join('\n');
  html = html.includes('</body>') ? html.replace('</body>', () => tail + '\n</body>') : html + tail;

  // Version + title.
  html = html.replace(/<title>[^<]*<\/title>/, `<title>Ultra Fast Clinical Copilot V${VERSION}</title>`);
  const before = html;
  html = html.replace(/const APP_VERSION = '[^']+';/, `const APP_VERSION = '${VERSION}';`);
  if (html === before) throw new Error('APP_VERSION constant not found');

  // PWA hooks (manifest, theme colour). Light theme per product requirements.
  const head =
    '<link rel="manifest" href="./manifest.webmanifest">' +
    '<link rel="icon" href="./icon.svg" type="image/svg+xml">' +
    '<meta name="theme-color" content="#ffffff">';
  html = html.replace(/<meta name="theme-color"[^>]*>/g, '');
  html = html.replace('</head>', () => head + '</head>');

  // Safety net: nothing may fetch another version at runtime.
  const leaks = html.match(/fetch\(\s*['"`]\.\/v\d[^'"`]*['"`]/g);
  if (leaks) throw new Error('Runtime version fetch remains: ' + leaks.join(', '));
  if (/document\.write\(h\)/.test(html)) throw new Error('Loader document.write remains');

  fs.writeFileSync(OUT, html);
  console.log(`Built ${path.basename(OUT)} (${(html.length / 1024).toFixed(1)} KiB) from ${FROM}`);
})().catch(e => { console.error('BUILD FAILED:', e.message); process.exit(1); });
