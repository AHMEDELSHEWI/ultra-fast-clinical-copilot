    const parts = form.querySelectorAll('#v107ExactGaGrid [data-v107-part]');

    if (sex === 'male') {
      chooseRadio(form, 'pregnancyStatus', 'not_applicable');
      if (lnmp) { lnmp.value = ''; lnmp.disabled = true; }
      if (weeksInput) { weeksInput.value = ''; weeksInput.readOnly = true; }
      gaDays.value = '';
      parts.forEach(input => { input.value = 'N/A'; });
      if (exact) exact.value = tr('Not applicable', 'غير منطبق');
      return;
    }

    if (lnmp) lnmp.disabled = false;
    const ga = lnmp?.value ? calculateGestation(lnmp.value) : null;
    if (ga) {
      if (weeksInput) { weeksInput.value = String(ga.weeks); weeksInput.readOnly = true; }
      gaDays.value = String(ga.days);
      parts.forEach(input => { input.value = String(ga[input.dataset.v107Part]); });
      if (exact) exact.value = `${ga.weeks} ${tr('weeks', 'أسبوع')} + ${ga.days} ${tr('days', 'يوم')}`;
    } else {
      if (weeksInput) weeksInput.readOnly = false;
      gaDays.value = '';
      parts.forEach(input => { input.value = '—'; });
      if (exact) exact.value = '';
    }
    const hiddenExact = form.querySelector('[data-v106-hidden="gestationalAgeExact"], [data-v107-name="gestationalAgeExact"]');
    if (hiddenExact && exact) hiddenExact.value = exact.value;
  }

  function ensureExactAgeUi(form) {
    const root = form.querySelector('#v106PatientEnhancements');
    const summary = form.querySelector('#v106AgeExact');
    if (summary && !form.querySelector('#v107ExactAgeGrid')) {
      const grid = buildTripleGrid('v107ExactAgeGrid', [
        ['years', 'Years', 'سنوات'], ['months', 'Months', 'أشهر'], ['days', 'Days', 'أيام']
      ]);
      summary.closest('.v106-field')?.appendChild(grid);
    }
    const gaSummary = form.querySelector('#v106GestationExact');
    if (gaSummary && !form.querySelector('#v107ExactGaGrid')) {
      const grid = buildTripleGrid('v107ExactGaGrid', [
        ['weeks', 'Weeks', 'أسابيع'], ['days', 'Days', 'أيام']
      ]);
      grid.style.gridTemplateColumns = 'repeat(2,minmax(0,1fr))';
      gaSummary.closest('.v106-field')?.appendChild(grid);
    }
    if (root) {
      const header = root.querySelector('.v106-panel header strong');
      setText(header, tr('Age and gestation calculated automatically', 'حساب العمر وعمر الحمل تلقائيًا'));
    }
  }

  function ensureStatusDefaults(form) {
    STATUS_FIELDS.forEach(([key]) => {
      const select = form.querySelector(`[data-v106-status="${key}"]`);
      const details = form.querySelector(`[data-v106-details="${key}"]`);
      if (!select) return;
      if (!select.value) select.value = 'unknown';
      if (select.value === 'unknown') {
        if (details) { details.value = ''; details.hidden = true; }
        const original = form.querySelector(`[name="${CSS.escape(key)}"]`);
        if (original) original.value = 'Unknown';
      }
      const label = select.closest('.v106-field')?.querySelector(':scope > span');
      if (label && !label.querySelector('.v107-status-default')) {
        const badge = document.createElement('small');
        badge.className = 'v107-status-default';
        badge.textContent = tr('Default: Unknown', 'الافتراضي: غير معروف');
        label.appendChild(badge);
      }
    });
  }

  function ensureSexAndPregnancy(form) {
    form.querySelectorAll('input[type="radio"][name="sexAtBirth"]').forEach(input => {
      if (decode(input.value) === 'intersex') input.closest('label')?.remove();
    });
    const allowed = new Set(['female', 'male', 'unknown']);
    form.querySelectorAll('input[type="radio"][name="sexAtBirth"]').forEach(input => {
      if (!allowed.has(String(decode(input.value)))) input.closest('label')?.remove();
    });
    updateGestationDisplay(form);
  }

  function enhancePatientForm() {
    const form = getPatientForm();
    if (!form) return;
    installStyles();
    ensureSingleAllergy(form);
    ensureExactAgeUi(form);
    ensureStatusDefaults(form);
    ensureSexAndPregnancy(form);
    updateAgeDisplay(form);
    updateGestationDisplay(form);
    form.dataset.v107Enhanced = 'true';
  }

  function normalizeClinicalText(value) {
    return String(value || '')
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[’‘]/g, "'")
      .replace(/[^a-z0-9\p{L}\p{N}'%+./-]+/gu, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function flattenClinicalValues(value, output, depth = 0) {
    if (depth > 7 || value == null) return;
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      output.push(String(value));
      return;
    }
    if (Array.isArray(value)) {
      value.forEach(item => flattenClinicalValues(item, output, depth + 1));
      return;
    }
    if (typeof value === 'object') {
      if (Object.prototype.hasOwnProperty.call(value, 'value')) {
        flattenClinicalValues(value.value, output, depth + 1);
        return;
      }
      Object.keys(value).forEach(key => {
        if (!['auditTrail', 'timeline', 'versions', 'attachments', 'rawPayload'].includes(key)) {
          flattenClinicalValues(value[key], output, depth + 1);
        }
      });
    }
  }

  function regexpGlobal(pattern) {
    const flags = pattern.flags.includes('g') ? pattern.flags : pattern.flags + 'g';
    return new RegExp(pattern.source, flags);
  }

  function mentionPolarities(text, pattern) {
    const results = [];
    const regex = regexpGlobal(pattern);
    let match;
    while ((match = regex.exec(text)) !== null) {
      const boundary = Math.max(
        text.lastIndexOf('.', match.index),
        text.lastIndexOf('!', match.index),
        text.lastIndexOf('?', match.index),
        text.lastIndexOf(';', match.index),
        text.lastIndexOf('\n', match.index)
      );
      const before = text.slice(boundary + 1, match.index).slice(-90);
      const negated = /(?:^|\b)(?:no|not|without|denies?|denied|negative for|absence of|free of|nil|neither|nor)(?:\b|$)|(?:لا|ليس|ليست|بدون|ينفي|تنفي|لا يوجد|لا توجد)/i.test(before);
      results.push(negated ? -1 : 1);
      if (match[0] === '') regex.lastIndex += 1;
    }
    return results;
  }

  function featureContribution(text, feature, direction) {
    const polarities = mentionPolarities(text, feature.pattern);
    if (!polarities.length) return { score: 0, evidence: null };
    const positive = polarities.some(value => value > 0);
    const negative = polarities.some(value => value < 0) && !positive;
    if (direction === 'support') {
      if (positive) return { score: feature.weight, evidence: feature.label };
      if (negative) return { score: -Math.max(2, Math.round(feature.weight * 0.8)), evidence: `${tr('denies', 'ينفي')} ${feature.label}` };
    } else {
      if (positive) return { score: -feature.weight, evidence: `${tr('feature against', 'علامة معارضة')}: ${feature.label}` };
      if (negative) return { score: Math.min(3, Math.round(feature.weight * 0.25)), evidence: null };
    }
    return { score: 0, evidence: null };
  }

  const DIFFERENTIAL_PROFILES = [
    {
      match: /acute coronary|myocardial infar|coronary syndrome|unstable angina/,
      support: [
        [/central|retrosternal/, 5, 'central/retrosternal pain'],
        [/crushing|pressure|tightness|heavy/, 9, 'pressure-like pain'],
        [/exert|exercise|walking|stairs/, 12, 'exertional symptoms'],
        [/radiat.{0,40}(arm|jaw|shoulder)|(?:arm|jaw|shoulder).{0,40}radiat/, 12, 'radiation to arm/jaw/shoulder'],
        [/diaphoresis|sweat/, 8, 'diaphoresis'],
        [/nausea|vomit/, 5, 'nausea/vomiting'],
        [/ischemi|st depression|st elevation|troponin/, 15, 'ischemic ECG/troponin feature']
      ],
      against: [
        [/pleuritic|worse with breathing/, 7, 'pleuritic character'],
        [/reproducible|chest wall tenderness|worse with movement/, 7, 'reproducible chest-wall pain'],
        [/fever|productive cough/, 4, 'infective feature']
      ]
    },
    {
      match: /pneumonia|lower respiratory infection|respiratory illness/,
      support: [
        [/fever|pyrexia|rigor|chills/, 10, 'fever/rigors'],
        [/cough/, 10, 'cough'],
        [/sputum|productive/, 7, 'productive sputum'],
        [/dyspn|shortness of breath|breathless/, 6, 'dyspnea'],
        [/pleuritic|worse with breathing/, 5, 'pleuritic pain'],
        [/crackle|crepitation|bronchial breathing|consolidation/, 12, 'focal chest signs'],
        [/hypoxi|low oxygen|spo2\s*(?:<|under|below)\s*94/, 8, 'hypoxemia']
      ],
      against: [
        [/exertional chest|radiat.{0,30}(arm|jaw)|crushing chest/, 8, 'classic ischemic pain'],
        [/clear chest|normal chest x ray|no infiltrate/, 8, 'normal respiratory assessment']
      ]
    },
    {
      match: /pulmonary embol|venous thromboembol|\bpe\b/,
      support: [
        [/pleuritic|worse with breathing/, 8, 'pleuritic pain'],
        [/sudden.{0,30}(dyspn|shortness of breath)|(?:dyspn|shortness of breath).{0,30}sudden/, 10, 'sudden dyspnea'],
        [/hemoptysis|coughing blood/, 9, 'hemoptysis'],
        [/unilateral.{0,25}(leg|calf).{0,25}(swelling|pain)|(?:leg|calf).{0,25}(swelling|pain).{0,25}unilateral/, 12, 'unilateral leg symptoms'],
        [/recent surgery|immobili|long flight|bed bound/, 10, 'recent surgery/immobility'],
        [/prior (?:pe|dvt|vte)|history of (?:pe|dvt|vte)/, 12, 'previous VTE'],
        [/estrogen|oral contraceptive|postpartum|pregnan/, 7, 'estrogen/pregnancy risk'],
        [/tachycard|heart rate\s*(?:>|over|above)\s*100/, 5, 'tachycardia'],
        [/hypoxi|low oxygen|spo2\s*(?:<|under|below)\s*94/, 7, 'hypoxemia']
      ],
      against: [
        [/productive cough|focal crackles|consolidation/, 4, 'alternative respiratory source']
      ]
