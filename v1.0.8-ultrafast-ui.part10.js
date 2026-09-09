ld?.classList.toggle('v108-range-locked', disabled);
    });
  }

  const QUICK_TEXT = {
    oxygenDevice: ['Room air','Nasal cannula','Simple mask','Non-rebreather mask','HFNC','NIV','Ventilator'],
    route: ['IV','PO','IM','SC','INH','NEB','PR','SL'],
    frequency: ['Once','STAT','PRN','q4h','q6h','q8h','q12h','Daily'],
    population: ['Adult','Paediatric','Pregnancy','Renal impairment','Hepatic impairment'],
    source: ['Local protocol','BNF / BNFc','NICE','Resuscitation Council UK','Institutional guideline'],
    version: [new Date().toISOString().slice(0,10),'Current local version'],
    consent: ['Verbal consent','Written consent','Emergency exception','Unable to consent'],
    preparation: ['Aseptic technique','Full sterile precautions','Skin antisepsis'],
    complications: ['No immediate complications','Bleeding','Pain','Other'],
    outcome: ['Successful','Partially successful','Unsuccessful','Pending'],
    postProcedurePlan: ['Reassess','Repeat observations','Post-procedure imaging','Specialty review'],
    specialty: ['Cardiology','Internal Medicine','General Surgery','ICU','Paediatrics','Obstetrics & Gynaecology','Orthopaedics','Neurology','Anaesthesia','Psychiatry'],
    requestedAction: ['Review','Advice','Admission','Procedure','Transfer','Take over care'],
    statusLabel: ['Stable','Improved','Unchanged','Deteriorating','Critical'],
    response: ['Improved','Partially improved','No change','Worse']
  };

  function enhanceQuickTextChoices() {
    document.querySelectorAll('#viewRoot input[type="text"], #viewRoot textarea').forEach(input => {
      if (!input.name || input.dataset.v108Choices === 'true' || input.closest('#v108QuickLabs')) return;
      const values = QUICK_TEXT[input.name];
      if (!values?.length) return;
      input.dataset.v108Choices = 'true';
      const field = input.closest('.field') || input.parentElement;
      if (!field) return;
      const tools = document.createElement('div');
      tools.className = 'v108-tools';
      tools.innerHTML = values.map(value => `<button type="button" class="v108-chip" data-v108-text="${esc(value)}">${esc(value)}</button>`).join('');
      tools.addEventListener('click', event => {
        const button = event.target.closest('[data-v108-text]');
        if (!button) return;
        setInputValue(input, button.dataset.v108Text);
      });
      field.appendChild(tools);
    });
  }

  function enhanceQuestionText() {
    const form = document.querySelector('#viewRoot form[data-form="question"]');
    if (!form || form.dataset.v108Quick === 'true') return;
    form.dataset.v108Quick = 'true';
    const input = form.querySelector('[name="questionValue"]');
    if (!input || input.type === 'number') return;
    const id = form.dataset.questionId || '';
    const presets = id === 'q_last_known_well' ? ['Now','Today','Yesterday','Unknown']
      : id === 'q_trauma_mechanism' ? ['Fall','Road traffic collision','Blunt trauma','Penetrating trauma']
      : id === 'q_toxic_substance' ? ['Medication','Household chemical','Carbon monoxide','Unknown']
      : id === 'q_toxic_time_amount' ? ['Unknown']
      : ['Unknown'];
    const field = input.closest('.field');
    if (!field) return;
    const tools = document.createElement('div');
    tools.className = 'v108-tools';
    tools.innerHTML = presets.map(value => `<button type="button" class="v108-chip" data-v108-text="${esc(value)}">${esc(value)}</button>`).join('');
    tools.addEventListener('click', event => {
      const button = event.target.closest('[data-v108-text]');
      if (!button) return;
      setInputValue(input, button.dataset.v108Text);
    });
    field.appendChild(tools);
  }

  const LABS = [
    { id:'sodium', name:'Sodium', group:'Electrolytes', canonical:'mmol/L', units:[['mmol/L',1],['mEq/L',1]], range:()=>[135,145], decimals:1 },
    { id:'potassium', name:'Potassium', group:'Electrolytes', canonical:'mmol/L', units:[['mmol/L',1],['mEq/L',1]], range:()=>[3.6,5.2], decimals:1 },
    { id:'chloride', name:'Chloride', group:'Electrolytes', canonical:'mmol/L', units:[['mmol/L',1],['mEq/L',1]], range:()=>[98,107], decimals:1 },
    { id:'bicarbonate', name:'Bicarbonate', group:'Electrolytes', canonical:'mmol/L', units:[['mmol/L',1],['mEq/L',1]], range:()=>[22,29], decimals:1 },
    { id:'glucose', name:'Glucose', group:'Metabolic', canonical:'mmol/L', units:[['mmol/L',1],['mg/dL',0.0555]], range:()=>[3.885,7.77], decimals:2 },
    { id:'creatinine', name:'Creatinine', group:'Renal', ca