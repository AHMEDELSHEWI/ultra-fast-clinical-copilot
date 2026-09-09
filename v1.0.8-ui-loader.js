(() => {
  'use strict';
  const files = ["v1.0.8-ultrafast-ui.part01.js", "v1.0.8-ultrafast-ui.part02.js", "v1.0.8-ultrafast-ui.part03.js", "v1.0.8-ultrafast-ui.part04.js", "v1.0.8-ultrafast-ui.part05.js", "v1.0.8-ultrafast-ui.part06.js", "v1.0.8-ultrafast-ui.part07.js", "v1.0.8-ultrafast-ui.part08.js", "v1.0.8-ultrafast-ui.part09.js", "v1.0.8-ultrafast-ui.part10.js", "v1.0.8-ultrafast-ui.part11.js", "v1.0.8-ultrafast-ui.part12.js", "v1.0.8-ultrafast-ui.part13.js", "v1.0.8-ultrafast-ui.part14.js", "v1.0.8-ultrafast-ui.part15.js", "v1.0.8-ultrafast-ui.part16.js"];
  Promise.all(files.map(async file => {
    const response = await fetch(new URL(file, document.baseURI), { cache: 'no-store' });
    if (!response.ok) throw new Error(`${file}: HTTP ${response.status}`);
    return response.text();
  })).then(chunks => {
    const script = document.createElement('script');
    script.dataset.module = 'v1.0.8-ultrafast-ui';
    script.textContent = chunks.join('');
    document.head.appendChild(script);
  }).catch(error => {
    console.error('V1.0.8 UI module failed to load.', error);
    const region = document.getElementById('toastRegion');
    if (region) {
      const toast = document.createElement('div');
      toast.className = 'toast error';
      toast.textContent = `V1.0.8 UI module failed to load: ${error.message || error}`;
      region.appendChild(toast);
    }
  });
})();
