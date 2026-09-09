dEventListener('click', () => {
      if (state.lab.value === '' || !Number.isFinite(Number(state.lab.value))) {
        valueInput?.focus();
        return;
      }
      submitInvestigation({ pending: false });
    });
    panel.querySelector('[data-v108-lab-pending]')?.addEventListener('click', () => submitInvestigation({ pending: true }));
    panel.querySelector('[data-v108-manual]')?.addEventListener('click', () => {
      document.querySelectorAll('#viewRoot form[data-form="investigation"] .v108-manual-form').forEach(node => node.classList.toggle('open'));
    });
  }

  function colorInvestigationRows() {
    if (route() !== 'investigations') return;
    document.querySelectorAll('#viewRoot table tbody tr').forEach(row => {
      const source = row.querySelector('td:first-child small')?.textContent || '';
      const statusMatch = /V1\.0\.8 Quick Lab \| (NORMAL|HIGH|LOW|PENDING|REVIEW)/i.exec(source);
      if (!statusMatch) return;
      const status = statusMatch[1].toLowerCase();
      row.classList.remove('v108-investigation-row-normal','v108-investigation-row-high','v108-investigation-row-low');
      if (['normal','high','low'].includes(status)) row.classList.add(`v108-investigation-row-${status}`);
      const statusCell = row.children[2];
      if (statusCell) statusCell.innerHTML = `<span class="v108-result-flag ${status}">${esc(tr(status.charAt(0).toUpperCase()+status.slice(1), status === 'normal' ? 'طبيعي' : status === 'high' ? 'مرتفع' : status === 'low' ? 'منخفض' : 'قيد الانتظار'))}</span>`;
    });
  }

  const NON_DRUG_TREATMENTS = {
    default:['Monitoring','IV access','Analgesia','Fluids','Oxygen if indicated','Reassessment'],
    chest_pain:['Cardiac monitoring','12-lead ECG pathway','IV access','Analgesia','Serial observations'],
    dyspnea:['Oxygen if indicated','Continuous SpO₂ monitoring','Position upright','Nebulised therapy if indicated','Ventilatory support assessment'],
    fever:['Sepsis screening','IV access','Fluids if indicated','Cultures if indicated','Temperature control'],
    trauma:['Trauma activation','Spinal precautions if indicated','Hemorrhage control','IV/IO access','Analgesia','Warm patient'],
    abdominal_pain:['Nil by mouth','IV access','Analgesia','Antiemetic support','Serial abdominal examination'],
    seizure:['Airway protection','Seizure precautions','Glucose check','Cardiac monitoring','Neurological observations'],
    hypoglycemia:['Immediate glucose treatment pathway','Repeat glucose','Identify cause','Observation'],
    hyperglycemia:['Fluid assessment','Ketone/acid-base assessment','Electrolyte monitoring','Strict input/output']
  };

  function primaryComplaint() {
    const snap = snapshot();
    const active = (snap?.complaints || []).filter(item => item.status !== 'invalidated' && item.status !== 'inactive');
    return active.find(item => item.primary)?.id || active[0]?.id || '';
  }

  function enhanceTreatment() {
    if (route() !== 'treatment') return;
    const treatmentForm = document.querySelector('#viewRoot form[data-form="treatment"]');
    if (treatmentForm && !treatmentForm.dataset.v108Enhanced) {
      treatmentForm.dataset.v108Enhanced = 'true';
      const key = primaryComplaint();
      const options = NON_DRUG_TREATMENTS[key] || NON_DRUG_TREATMENTS.default;
      const section = document.createElement('section');
      section.className = 'v108-section';
      section.style.setProperty('--section-color', '#dc7300');
      section.innerHTML = `<header class="v108-section-head"><span class="v108-icon-box">${svg('medication')}</span><div><strong>${esc(tr('Quick interventions', 'تدخلات سريعة'))}</strong><span>${esc(tr('Tap only what was actually done', 'اختر فقط ما تم تنفيذه فعليًا'))}</span></div></header><div class="v108-section-body"><div class="v108-tools">${options.map(value => `<button type="button" class="v108-chip" data-v108-treatment="${esc(value)}">${esc(value)}</button>`).join('')}</div></div>`;
      treatmentForm.prepend(section);
      section.addEventListener('click', event => {
        const button = event.target.closest('[data-v108-treatment]');
        if (!button) return;
        const name = treatmentForm.querySelector('[name="name"]');
        const details = treatmentForm.querySelector('[name="details"]');
        if (name) name.value = button.dataset.v108Treatment;
        if (details && !details.value) details.value = 'Performed / clinician confirmed';
        treatmentForm.requestSubmit();
      });
    }
    document.quer