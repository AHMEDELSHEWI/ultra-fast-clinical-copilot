(() => {
  'use strict';
  const base = new URL('.', document.baseURI);
  const files = [
    'v1.0.7-precision-ux.part1.js',
    'v1.0.7-precision-ux.part2.js',
    'v1.0.7-precision-ux.part3.js',
    'v1.0.7-precision-ux.part4.js'
  ];
  Promise.all(files.map(async file => {
    const response = await fetch(new URL(file, base), { cache: 'no-store' });
    if (!response.ok) throw new Error(`${file}: HTTP ${response.status}`);
    return response.text();
  })).then(parts => {
    const script = document.createElement('script');
    script.dataset.module = 'v1.0.7-precision-ux';
    script.textContent = parts.join('\n');
    document.head.appendChild(script);
  }).catch(error => {
    console.error('V1.0.7 precision module failed to load.', error);
    const region = document.getElementById('toastRegion');
    if (region) {
      const toast = document.createElement('div');
      toast.className = 'toast error';
      toast.textContent = `V1.0.7 precision module failed to load: ${error.message || error}`;
      region.appendChild(toast);
    }
  });
})();
