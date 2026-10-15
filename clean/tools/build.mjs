#!/usr/bin/env node
// Builds the light PWA (dist/index.html + vocab files + service worker) and one self-contained offline file.
import fs from 'node:fs';
import path from 'node:path';
import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');
const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
const pack = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/content/pack.json'), 'utf8'));

const result = await build({
  entryPoints: [path.join(ROOT, 'src/ui/main.js')],
  bundle: true, write: false, format: 'iife', target: 'es2020', minify: !process.env.NOMINIFY, legalComments: 'none',
  loader: { '.json': 'json' },
});
const js = result.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
const css = fs.readFileSync(path.join(ROOT, 'src/ui/styles.css'), 'utf8');
// Offline vocabularies (HPO, ICD-10-CM, ICD-10-PCS, RxNorm), gzip-compressed.
//  * dist/index.html            — LIGHT app; vocabularies are separate files (vocab/*.json.gz) fetched on first use
//                                 and precached by the service worker so they work offline afterwards.
//  * dist/ufc-offline-full.html — ONE self-contained file with everything embedded (for sharing as a file).
const VOCAB = path.join(ROOT, 'data/vocab');
const PACK_IDS = ['hpo', 'icd10cm', 'icd10pcs', 'rxnorm'].filter((p) => fs.existsSync(path.join(VOCAB, `${p}.json.gz`)));
const template = fs.readFileSync(path.join(ROOT, 'src/ui/template.html'), 'utf8');
const page = (extra) => template.replace('<script>/*__JS__*/</script>', () => `${extra}<script>/*__JS__*/</script>`)
  .replace('/*__CSS__*/', () => css).replace('/*__JS__*/', () => js);
const blobs = PACK_IDS.map((p) => `<script type="application/octet-stream" id="vx-${p}">${fs.readFileSync(path.join(VOCAB, `${p}.json.gz`)).toString('base64')}</script>`).join('\n');
const html = page('');
const full = page(`${blobs}\n`);

fs.rmSync(DIST, { recursive: true, force: true });
fs.mkdirSync(path.join(DIST, 'vocab'), { recursive: true });
fs.writeFileSync(path.join(DIST, 'index.html'), html);
fs.writeFileSync(path.join(DIST, 'ufc-offline-full.html'), full);
for (const p of PACK_IDS) fs.copyFileSync(path.join(VOCAB, `${p}.json.gz`), path.join(DIST, 'vocab', `${p}.json.gz`));

const shell = ['./', './index.html', './manifest.webmanifest', './icon.svg', ...PACK_IDS.map((p) => `./vocab/${p}.json.gz`)];
fs.writeFileSync(path.join(DIST, 'service-worker.js'), `/* generated: Ultra Fast Clinical Copilot offline shell. No patient data is cached here. */
const CACHE = 'ufc-v${pkg.version}-c${pack.version}';
const SHELL = ${JSON.stringify(shell)};
self.addEventListener('install', (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k.startsWith('ufc-') && k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', (e) => {
  const r = e.request;
  if (r.method !== 'GET' || new URL(r.url).origin !== self.location.origin) return;
  e.respondWith(caches.match(r, { ignoreSearch: true }).then((hit) => hit || fetch(r).catch(() => (r.mode === 'navigate' ? caches.match('./index.html') : Response.error()))));
});
`);
fs.writeFileSync(path.join(DIST, 'manifest.webmanifest'), JSON.stringify({
  name: 'Ultra Fast Clinical Copilot', short_name: 'UF Copilot', start_url: './', scope: './', display: 'standalone',
  background_color: '#ffffff', theme_color: '#ffffff', icons: [{ src: './icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }],
}, null, 1));
fs.writeFileSync(path.join(DIST, 'icon.svg'), '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" rx="96" fill="#fff"/><rect x="24" y="24" width="464" height="464" rx="76" fill="#f4f7fb" stroke="#dce6f1" stroke-width="8"/><path d="M216 120h80v96h96v80h-96v96h-80v-96h-96v-80h96z" fill="#0b5fff"/></svg>');
fs.writeFileSync(path.join(DIST, '.nojekyll'), '');
const kb = (n) => `${(n / 1024).toFixed(1)} KiB`;
const vocabBytes = PACK_IDS.reduce((n, p) => n + fs.statSync(path.join(VOCAB, `${p}.json.gz`)).size, 0);
console.log(`Built dist/index.html (${kb(html.length)}) + vocab/ (${kb(vocabBytes)}, loaded on first use) · dist/ufc-offline-full.html (${kb(full.length)})`);
