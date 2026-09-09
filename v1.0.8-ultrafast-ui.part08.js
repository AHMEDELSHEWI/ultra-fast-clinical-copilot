f (value === false || value === 'none' || value === 'A') return 'normal';
    if (value === true || value === 'stridor' || value === 'both' || value === 'P' || value === 'U') return 'danger';
    if (value === 'unknown' || value === 'V') return 'warning';
    return '';
  }

  function enhanceFocusedExam() {
    if (route() !== 'vitals') return;
    const snap = snapshot();
    const content = globalThis.ClinicalContentPack;
    const target = document.querySelector('#viewRoot form[data-form="vitals"]');
    if (!snap || !content || !target || document.getElementById('v108FocusedExam')) return;
    const activeIds = new Set((snap.complaints || []).filter(item => item.status !== 'invalidated' && item.status !== 'inactive').map(item => item.id));
    const priority = q => {
      const w = q.priorityWeights || {};
      return (w.immediateDanger || 0) * 10 + (w.timeSensitivity || 0) * 6 + (w.treatmentImpact || 0) * 5 + (w.diagnosticValue || 0) * 4 + (q.priority || 0);
    };
    const questions = (content.questions || [])
      .filter(q => q.container === 'exam' && q.type === 'single' && applicableQuestion(q, snap, activeIds))
      .sort((a, b) => priority(b) - priority(a))
      .slice(0, 12);
    const globalIds = new Set(['q_airway_compromise','q_major_active_bleeding','q_consciousness_avpu','q_new_confusion']);
    const renderGroup = (title, subtitle, color, iconName, list) => {
      if (!list.length) return '';
      const items = list.map(question => {
        const current = activeQuestionAnswer(question, snap);
        const options = (question.options || []).map(option => `<button type="button" class="${Object.is(current, option.value) ? 'selected' : ''}" data-action="answer-question" data-question-id="${esc(question.id)}" data-value="${esc(encode(option.value))}" data-tone="${optionTone(question, option)}">${esc(isArabic() && option.labelAr ? option.labelAr : option.label)}</button>`).join('');
        return `<article class="v108-exam-item" style="--exam-color:${color}"><div class="v108-exam-title">${svg(iconName)}<strong>${esc(shortExamLabel(question))}</strong></div><div class="v108-exam-options">${options}</div></article>`;
      }).join('');
      return `<section class="v108-section" style="--section-color:${color}"><header class="v108-section-head"><span class="v108-icon-box">${svg(iconName)}</span><div><strong>${esc(title)}</strong><span>${esc(subtitle)}</span></div></header><div class="v108-section-body"><div class="v108-exam-grid">${items}</div></div></section>`;
    };
    const primary = questions.filter(q => globalIds.has(q.id));
    const focused = questions.filter(q => !globalIds.has(q.id));
    const panel = document.createElement('div');
    panel.id = 'v108FocusedExam';
    panel.innerHTML = renderGroup(tr('Primary survey', 'المسح الأولي'), tr('Fast safety check', 'فحص سلامة سريع'), '#bd1732', 'exam', primary) + renderGroup(tr('Focused examination', 'الفحص الموجه'), tr('Selected from the active complaint', 'مختار حسب الشكوى النشطة'), '#078a55', 'exam', focused);
    target.parentElement.insertBefore(panel, target);
  }

  function separateHistoryFromExam() {
    if (route() !== 'assessment') return;
    const card = document.querySelector('#viewRoot .question-card');
    if (!card) {
      const title = document.querySelector('#viewRoot .card h2, #viewRoot .card h3');
      if (title && /deferred|مؤجل/i.test(title.textContent || '')) {
        title.textContent = tr('History complete', 'اكتمل التاريخ المرضي');
        const actionArea = document.querySelector('#viewRoot .empty-state .inline, #viewRoot .empty-state');
        if (actionArea && !actionArea.querySelector('[data-route="vitals"]')) actionArea.insertAdjacentHTML('beforeend', `<button type="button" class="primary-button" data-route="vitals">${esc(tr('Open focused examination', 'فتح الفحص الموجه'))}</button>`);
      }
      return;
    }
    const containerBadge = Array.from(card.querySelectorAll('.badge')).find(node => /^exam$/i.test((node.textContent || '').trim()));
    const defer = card.querySelector('[data-action="defer-question"]');
    const questionId = defer?.dataset.questionId;
    const deferKey = `${snapshot()?.id || 'case'}:${questionId || ''}`;
    if (containerBadge && defer && questionId && !state.examAutoDeferred.has(deferKey)) {
      state.examAutoDeferred.add(deferKey);
      queueMicrotask(() => defer.click());
    }
  }

  const NUMBER_CONFIG = {
    sbp: { min: 50, max: 260, step: 5, presets: [80,90,100,120,140,1