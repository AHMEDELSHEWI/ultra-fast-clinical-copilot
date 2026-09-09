${status}`;
      badge.textContent = { normal:tr('Normal','طبيعي'), high:tr('High','مرتفع'), low:tr('Low','منخفض'), review:tr('Review','مراجعة') }[status];
    }
    if (ref) ref.textContent = range ? `${formatLab(test, range[0])} – ${formatLab(test, range[1])} ${unit}` : tr('Assay / local laboratory specific', 'خاص بطريقة القياس أو المختبر المحلي');
  }

  function submitInvestigation({ pending = false } = {}) {
    const form = document.querySelector('#viewRoot form[data-form="investigation"]');
    if (!form) return;
    const test = labById(state.lab.testId);
    const unit = state.lab.unit || test.units[0][0];
    const status = pending ? 'PENDING' : classifyLab(test, state.lab.value, snapshot(), unit).toUpperCase();
    const range = labRange(test, snapshot(), unit);
    const fields = {
      name: test.name,
      result: pending ? '' : state.lab.value,
      unit,
      sourceLabel: `V1.0.8 Quick Lab | ${status}${range ? ` | Ref ${formatLab(test, range[0])}-${formatLab(test, range[1])} ${unit}` : ' | Local/assay range required'}`
    };
    Object.entries(fields).forEach(([name,value]) => { const input = form.querySelector(`[name="${CSS.escape(name)}"]`); if (input) input.value = value; });
    if (test.id === 'urea' && !pending && state.lab.value !== '') {
      const urea = form.querySelector('[name="ureaMmolL"]');
      if (urea) urea.value = formatLab(test, toCanonical(test, state.lab.value, unit));
    }
    form.requestSubmit();
    state.lab.value = '';
  }

  function enhanceInvestigations() {
    if (route() !== 'investigations') return;
    const form = document.querySelector('#viewRoot form[data-form="investigation"]');
    if (!form || document.getElementById('v108QuickLabs')) { colorInvestigationRows(); return; }
    form.classList.add('v108-focus-form');
    const grid = form.querySelector('.form-grid');
    if (grid) grid.classList.add('v108-manual-form');
    const addButton = form.querySelector('.form-actions');
    if (addButton) addButton.classList.add('v108-manual-form');
    const panel = document.createElement('section');
    panel.id = 'v108QuickLabs';
    panel.className = 'v108-section';
    panel.style.setProperty('--section-color', '#0d7eaa');
    panel.innerHTML = `<header class="v108-section-head"><span class="v108-icon-box">${svg('lab')}</span><div><strong>${esc(tr('Quick results', 'نتائج سريعة'))}</strong><span>${esc(tr('Tap, convert and classify instantly', 'اختيار وتحويل وتصنيف فوري'))}</span></div></header><div class="v108-section-body">${labPanelHtml(snapshot())}</div>`;
    form.prepend(panel);
    bindLabPanel(panel);
    colorInvestigationRows();
  }

  function bindLabPanel(panel) {
    const testSelect = panel.querySelector('#v108LabTest');
    const valueInput = panel.querySelector('#v108LabValue');
    if (testSelect && !testSelect.dataset.bound) {
      testSelect.dataset.bound = 'true';
      testSelect.addEventListener('change', () => {
        state.lab.testId = testSelect.value;
        const test = labById(state.lab.testId);
        state.lab.unit = test.units[0][0];
        state.lab.value = '';
        panel.querySelector('.v108-section-body').innerHTML = labPanelHtml(snapshot());
        bindLabPanel(panel);
      });
    }
    if (valueInput && !valueInput.dataset.bound) {
      valueInput.dataset.bound = 'true';
      valueInput.addEventListener('input', () => { state.lab.value = valueInput.value; refreshLabPanel(panel); });
    }
    panel.querySelectorAll('[data-v108-test]').forEach(button => button.addEventListener('click', () => {
      state.lab.testId = button.dataset.v108Test;
      const test = labById(state.lab.testId);
      state.lab.unit = test.units[0][0];
      state.lab.value = '';
      panel.querySelector('.v108-section-body').innerHTML = labPanelHtml(snapshot());
      bindLabPanel(panel);
    }));
    panel.querySelectorAll('[data-v108-unit]').forEach(button => button.addEventListener('click', () => {
      const test = labById(state.lab.testId);
      const oldUnit = state.lab.unit || test.units[0][0];
      const newUnit = button.dataset.v108Unit;
      if (state.lab.value !== '') {
        const canonical = toCanonical(test, state.lab.value, oldUnit);
        state.lab.value = formatLab(test, fromCanonical(test, canonical, newUnit));
      }
      state.lab.unit = newUnit;
      panel.querySelector('.v108-section-body').innerHTML = labPanelHtml(snapshot());
      bindLabPanel(panel);
    }));
    panel.querySelector('[data-v108-lab-add]')?.ad