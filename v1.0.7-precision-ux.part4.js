      if (profile && positiveCount === 0) {
        score -= 16;
        evidence.push(tr('no specific supporting feature documented', 'لا توجد علامة داعمة محددة موثقة'));
      }
      if (negativeCount > 1) score -= Math.min(8, (negativeCount - 1) * 3);

      // Safety status is intentionally not used as a probability boost.
      if (item.type === 'must_not_miss') evidence.push(tr('must-not-miss safety condition', 'حالة خطيرة يجب عدم تفويتها'));
      if (!clinicalText) score -= 4;
      const relativeScore = Math.max(1, Math.min(99, Math.round(score)));
      return { ...item, sourceIndex, relativeScore, positiveCount, negativeCount, evidence: [...new Set(evidence)].slice(0, 6) };
    });

    ranked.sort((a, b) =>
      b.relativeScore - a.relativeScore ||
      b.positiveCount - a.positiveCount ||
      a.negativeCount - b.negativeCount ||
      a.sourceIndex - b.sourceIndex
    );

    return ranked.slice(0, 10).map((item, index) => ({
      ...item,
      rank: index + 1,
      tier: ((index === 0 && item.positiveCount >= 1) || (index < 3 && item.positiveCount >= 2))
        ? 'red'
        : index < 6
          ? 'yellow'
          : 'green'
    }));
  }

  function enhanceDifferential() {
    const panel = document.getElementById('v106DifferentialPanel');
    if (!panel) return;
    const snap = getSnapshot();
    const ranked = rankDifferentialsV107(snap);
    const fingerprint = JSON.stringify(ranked.map(item => [item.label, item.relativeScore, item.type]));
    if (panel.dataset.v107Fingerprint === fingerprint) return;
    panel.dataset.v107Fingerprint = fingerprint;

    const color = tier => tier === 'red' ? '#bd1732' : tier === 'yellow' ? '#a15c00' : '#078a55';
    const tierLabel = tier => tier === 'red'
      ? tr('Most likely — highest relative probability', 'الأكثر ترجيحًا — أعلى احتمال نسبي')
      : tier === 'yellow'
        ? tr('Probable — intermediate relative probability', 'مرجح — احتمال نسبي متوسط')
        : tr('Possible — lower relative probability', 'ممكن — احتمال نسبي أقل');

    const legend = `
      <div class="v107-dx-legend">
        <div class="red"><strong>${escapeHtml(tr('Red: Most likely', 'الأحمر: الأكثر ترجيحًا'))}</strong><span>${escapeHtml(tr('Strongest supported diagnoses', 'التشخيصات ذات الدعم الأقوى'))}</span></div>
        <div class="yellow"><strong>${escapeHtml(tr('Yellow: Probable', 'الأصفر: مرجح'))}</strong><span>${escapeHtml(tr('Intermediate relative support', 'دعم نسبي متوسط'))}</span></div>
        <div class="green"><strong>${escapeHtml(tr('Green: Possible', 'الأخضر: ممكن'))}</strong><span>${escapeHtml(tr('Possible or weakly supported', 'ممكن أو ذو دعم أضعف'))}</span></div>
      </div>`;

    const rows = ranked.map(item => {
      const rationale = item.evidence.length
        ? item.evidence.join(' • ')
        : tr('Insufficient discriminating data; ranking is provisional.', 'لا توجد بيانات تمييزية كافية؛ الترتيب مبدئي.');
      const safety = item.type === 'must_not_miss'
        ? `<span class="v106-dx-badge">${escapeHtml(tr('Must not miss', 'يجب عدم تفويته'))}</span>`
        : '';
      return `<div class="v106-dx" data-v107-tier="${item.tier}" style="--dx:${color(item.tier)}"><div class="v106-dx-rank">${item.rank}</div><div class="v106-dx-copy"><strong>${escapeHtml(item.label)}</strong><span class="v106-dx-band">${escapeHtml(tierLabel(item.tier))}</span><span>${escapeHtml(rationale)}</span><div class="v106-dx-badges">${safety}<span class="v106-dx-badge">${escapeHtml(tr('Clinician review required', 'تتطلب مراجعة الطبيب'))}</span></div></div><button type="button" class="secondary-button compact-button" data-action="add-suggestion-diagnosis" data-label="${escapeHtml(item.label)}">${escapeHtml(tr('Add', 'إضافة'))}</button></div>`;
    }).join('');

    panel.innerHTML = `<div class="v106-dx-note"><strong>${escapeHtml(tr('AI-assisted Top 10 differential ranking.', 'ترتيب أفضل 10 تشخيصات تفريقية بمساعدة الذكاء الاصطناعي.'))}</strong> ${escapeHtml(tr('Ranking uses documented positive and explicitly denied features. Colours represent relative likelihood, not severity or a calibrated probability. Must-not-miss conditions remain independently flagged and require clinician review.', 'يعتمد الترتيب على العلامات الإيجابية والمعلومات المنفية صراحةً في البيانات الموثقة. الألوان تعبر عن الاحتمال النسبي، لا عن شدة المرض أو نسبة معايرة. وتظل الحالات التي يجب عدم تفويتها معلّمة بصورة مستقلة وتتطلب مراجعة الطبيب.'))}</div>${legend}${rows ? `<div class="v106-dx-list">${rows}</div>` : `<div class="v106-empty">${escapeHtml(tr('Add or confirm a clinical complaint to generate a ranked differential.', 'أضف أو أكد شكوى سريرية لإنشاء التشخيصات التفريقية المرتبة.'))}</div>`}`;
  }

  const COMPLAINT_NEGATION_PATTERNS = {
    chest_pain: /chest pain|chest discomfort|chest pressure|chest tightness/,
    palpitations: /palpitation|racing heart/,
    edema: /edema|swelling|swollen/,
    dyspnea: /shortness of breath|dyspnea|breathless|difficulty breathing/,
    cough: /cough/,
    hemoptysis: /hemoptysis|coughing blood/,
    pleuritic_pain: /pleuritic pain|pain with breathing|worse with breathing/,
    fever: /fever|pyrexia|high temperature/,
    rigors: /rigor|chills|shaking chills/,
    abdominal_pain: /abdominal pain|stomach pain|belly pain/,
    vomiting: /vomit|emesis/,
    diarrhea: /diarrhea|loose stool/,
    headache: /headache|head pain/,
    dizziness: /dizziness|vertigo|lightheaded/,
    syncope: /syncope|faint|collapse/,
    weakness: /weakness/,
    dysuria: /dysuria|painful urination|burning urine/,
    hematuria: /hematuria|blood in urine/,
    flank_pain: /flank pain|loin pain|renal colic/,
    vaginal_bleeding: /vaginal bleeding/,
    pelvic_pain: /pelvic pain|lower abdominal pain/,
    rash: /rash/,
    joint_pain: /joint pain|arthralgia/,
    limb_swelling: /limb swelling|leg swelling|arm swelling/,
    sore_throat: /sore throat|throat pain/,
    eye_pain: /eye pain|ocular pain/,
    visual_loss: /visual loss|vision loss|blurred vision/
  };

  function complaintExplicitlyDenied(rawText, complaint) {
    const normalized = normalizeClinicalText(rawText);
    const pattern = COMPLAINT_NEGATION_PATTERNS[complaint.id]
      || new RegExp(normalizeClinicalText(complaint.label).replace(/\s+/g, '\\s+'));
    const polarities = mentionPolarities(normalized, pattern);
    return polarities.length > 0 && polarities.every(value => value < 0);
  }

  function suppressNegatedParseSuggestions() {
    const form = document.getElementById('nlpReviewForm');
    if (!form || form.dataset.v107NegationReviewed === 'true') return;
    form.dataset.v107NegationReviewed = 'true';
    const raw = form.querySelector('[name="rawText"]')?.value || '';
    const payloadValue = form.querySelector('#nlpPayload')?.value || '';
    let payload;
    try { payload = JSON.parse(payloadValue); }
    catch (_) { return; }
    const complaints = Array.isArray(payload.complaints) ? payload.complaints : [];
    form.querySelectorAll('input[name="complaintIndex"]').forEach(input => {
      const complaint = complaints[Number(input.value)];
      if (!complaint || !complaintExplicitlyDenied(raw, complaint)) return;
      input.checked = false;
      const row = input.closest('.list-item');
      if (row && !row.querySelector('.v107-negated-note')) {
        const note = document.createElement('small');
        note.className = 'v107-negated-note';
        note.style.cssText = 'display:block;margin-top:3px;color:var(--warning,#a15c00);font-size:.62rem;font-weight:800';
        note.textContent = tr('Explicitly denied in the text — unchecked automatically', 'منفي صراحةً في النص — أُلغي تحديده تلقائيًا');
        row.querySelector('div')?.appendChild(note);
      }
    });
  }

  function onInput(event) {
    const form = event.target?.closest?.('#patientForm');
    if (!form) return;
    if (event.target.matches('[name="dateOfBirth"],[name="ageYears"]')) updateAgeDisplay(form);
    if (event.target.matches('#v106Lnmp,[name="sexAtBirth"],[name="pregnancyStatus"]')) {
      window.setTimeout(() => updateGestationDisplay(form), 0);
    }
    if (event.target.matches('[name="allergies"]')) syncAllergyStatus(form);
    if (event.target.matches('[data-v106-status]')) ensureStatusDefaults(form);
  }

  function beforeSubmit(event) {
    const form = event.target;
    if (!form || form.id !== 'patientForm') return;
    updateAgeDisplay(form);
    updateGestationDisplay(form);
    ensureStatusDefaults(form);
    syncAllergyStatus(form);
  }

  document.addEventListener('input', onInput, true);
  document.addEventListener('change', onInput, true);
  document.addEventListener('click', event => {
    if (event.target?.closest?.('#patientForm [name="sexAtBirth"]')) {
      window.setTimeout(() => { const form = getPatientForm(); if (form) updateGestationDisplay(form); }, 0);
    }
  }, true);
  document.addEventListener('submit', beforeSubmit, true);

  const observer = new MutationObserver(() => {
    enhancePatientForm();
    suppressNegatedParseSuggestions();
    enhanceDifferential();
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });

  function init() {
    installStyles();
    enhancePatientForm();
    suppressNegatedParseSuggestions();
    enhanceDifferential();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();

  globalThis.__UFCopilotPrecisionV107 = Object.freeze({
    version: VERSION,
    calculateAge,
    calculateGestation,
    rankDifferentials: rankDifferentialsV107,
    refresh: init
  });
})();
