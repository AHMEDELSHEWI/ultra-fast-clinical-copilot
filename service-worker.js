/* Ultra Fast Clinical Copilot - offline service worker.
   Cache-first for the self-contained app shell so core functions keep working
   without internet. The cache name carries the release version; bumping it
   discards the previous release cache on activate. No patient data is cached
   here (cases live in the app's own local storage). */
const VERSION = '1.0.13';
const CACHE = 'ufc-shell-v' + VERSION;
const SHELL = ['./', './index.html', './v' + VERSION + '.html', './manifest.webmanifest', './icon.svg'];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k.startsWith('ufc-shell-') && k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  event.respondWith(
    caches.match(req, { ignoreSearch: true }).then(hit => {
      if (hit) return hit;
      return fetch(req).then(res => {
        if (res && res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
        return res;
      }).catch(() => (req.mode === 'navigate' ? caches.match('./v' + VERSION + '.html') : Response.error()));
    })
  );
});
