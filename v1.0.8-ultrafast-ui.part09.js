60,180,200] },
    dbp: { min: 30, max: 160, step: 5, presets: [50,60,70,80,90,100,110] },
    hr: { min: 30, max: 220, step: 5, presets: [40,60,80,100,120,150,180] },
    rr: { min: 4, max: 60, step: 1, presets: [8,12,16,20,24,30,40] },
    spo2: { min: 70, max: 100, step: 1, presets: [85,90,92,94,96,98,100] },
    temperature: { min: 32, max: 42, step: .1, presets: [35,36,37,38,39,40] },
    painScore: { min: 0, max: 10, step: 1, presets: [0,2,4,6,8,10] },
    glucoseMgDl: { min: 20, max: 600, step: 5, presets: [40,60,80,100,140,180,250,400] },
    fio2: { min: .21, max: 1, step: .01, presets: [.21,.28,.35,.4,.5,.6,1] },
    oxygenFlow: { min: 0, max: 15, step: 1, presets: [0,2,4,6,10,15] },
    weightKg: { min: 1, max: 200, step: 1, presets: [10,20,40,60,70,80,100] },
    heightCm: { min: 40, max: 210, step: 1, presets: [100,140,160,170,180,190] }
  };

  function setInputValue(input, value) {
    if (!input) return;
    input.value = String(value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function enhanceNumericInputs() {
    document.querySelectorAll('#viewRoot input[type="number"]').forEach(input => {
      if (input.dataset.v108Range === 'true' || input.closest('#v108QuickLabs') || input.type === 'hidden') return;
      const config = NUMBER_CONFIG[input.name];
      const questionForm = input.closest('form[data-form="question"]');
      let effective = config;
      if (!effective && questionForm) {
        const questionId = questionForm.dataset.questionId || '';
        const presets = questionId === 'q_age_years' ? [1,5,12,18,30,50,70,90]
          : questionId === 'q_urea_mmol_l' ? [3,5,7,10,15,20,30]
          : questionId === 'q_gestation' ? [6,12,20,28,32,36,40]
          : [];
        const min = Number.isFinite(Number(input.min)) ? Number(input.min) : 0;
        const max = Number.isFinite(Number(input.max)) && input.max !== '' ? Number(input.max) : (presets.length ? Math.max(...presets) : 100);
        effective = { min, max, step: Number(input.step) || 1, presets };
      }
      if (!effective) return;
      input.dataset.v108Range = 'true';
      const field = input.closest('.field') || input.parentElement;
      if (!field) return;
      const tools = document.createElement('div');
      tools.className = 'v108-range';
      const min = Number.isFinite(effective.min) ? effective.min : 0;
      const max = Number.isFinite(effective.max) ? effective.max : 100;
      const step = effective.step || 1;
      const current = input.value !== '' ? Number(input.value) : min;
      tools.innerHTML = `<input type="range" min="${min}" max="${max}" step="${step}" value="${Number.isFinite(current) ? current : min}" aria-label="${esc(tr('Quick range', 'اختيار سريع'))}"><output class="v108-range-output">${input.value || '—'}</output>`;
      const range = tools.querySelector('input');
      const output = tools.querySelector('output');
      range.addEventListener('input', () => { if (input.readOnly || input.disabled) return; input.value = range.value; output.textContent = range.value; input.dispatchEvent(new Event('input', { bubbles: true })); });
      input.addEventListener('input', () => { if (input.value !== '') { range.value = input.value; output.textContent = input.value; } else output.textContent = '—'; });
      field.appendChild(tools);
      if (effective.presets?.length) {
        const chips = document.createElement('div');
        chips.className = 'v108-tools';
        chips.innerHTML = effective.presets.map(value => `<button type="button" class="v108-chip" data-v108-value="${value}">${value}</button>`).join('');
        chips.addEventListener('click', event => {
          const button = event.target.closest('[data-v108-value]');
          if (!button || input.readOnly || input.disabled) return;
          setInputValue(input, button.dataset.v108Value);
          range.value = input.value;
          output.textContent = input.value;
        });
        field.appendChild(chips);
      }
    });
  }

  function syncRangeAvailability() {
    document.querySelectorAll('#viewRoot input[data-v108-range="true"]').forEach(input => {
      const field = input.closest('.field') || input.parentElement;
      const disabled = Boolean(input.readOnly || input.disabled);
      field?.querySelectorAll('.v108-range input[type="range"], .v108-tools [data-v108-value]').forEach(control => { control.disabled = disabled; });
      fie