(() => {
  'use strict';

  const VERSION = '1.0.8';
  const CHUNKS = Array.from({ length: 7 }, (_, index) =>
    `./v1.0.8-rapid-payload-${String(index).padStart(2, '0')}.b64?v=${VERSION}`
  );

  async function fetchChunk(path) {
    const response = await fetch(path, { cache: 'force-cache' });
    if (!response.ok) throw new Error(`${path}: HTTP ${response.status}`);
    return (await response.text()).trim();
  }

  async function boot() {
    if (typeof DecompressionStream !== 'function') {
      throw new Error('Use a current Chrome browser for the V1.0.8 rapid interface.');
    }

    const data = (await Promise.all(CHUNKS.map(fetchChunk))).join('');
    const raw = atob(data);
    const bytes = new Uint8Array(raw.length);
    for (let index = 0; index < raw.length; index += 1) bytes[index] = raw.charCodeAt(index);

    const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
    const code = await new Response(stream).text();
    const script = document.createElement('script');
    script.dataset.module = 'v1.0.8-rapid-ux';
    script.textContent = code;
    document.head.appendChild(script);
  }

  boot().catch(error => {
    console.error('V1.0.8 rapid interface failed to load.', error);
    const region = document.getElementById('toastRegion');
    if (region) {
      const toast = document.createElement('div');
      toast.className = 'toast error';
      toast.textContent = error && error.message
        ? error.message
        : 'V1.0.8 rapid interface failed to load.';
      region.appendChild(toast);
    }
  });
})();
