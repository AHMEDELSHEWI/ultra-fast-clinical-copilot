((item, stepIndex) => `<button type="button" class="v108-step ${stepIndex === effectiveIndex ? 'current' : stepIndex < effectiveIndex ? 'done' : ''}" data-route="${item.route}" style="--step-color:${navColor(item.route)}" title="${esc(tr(item.en, item.ar))}">${svg(item.icon)}<span>${esc(tr(item.en, item.ar))}</span></button>`).join('');
    const prevIcon = isArabic() ? 'next' : 'back';
    const nextIcon = isArabic() ? 'back' : 'next';
    bar.innerHTML = `<button type="button" class="v108-arrow" ${prev ? `data-route="${prev.route}"` : 'disabled'} aria-label="${esc(tr('Previous', 'السابق'))}">${svg(prevIcon)}</button><div class="v108-step-scroll">${steps}</div><button type="button" class="v108-arrow" ${next ? `data-route="${next.route}"` : 'data-action="copy-all-note"'} aria-label="${esc(next ? tr('Next', 'التالي') : tr('Copy all', 'نسخ الكل'))}">${svg(next ? nextIcon : 'copy')}</button><div class="v108-progress" style="--progress:${effectiveIndex < 0 ? 0 : Math.round(((effectiveIndex + 1) / FLOW.length) * 100)}%"><i></i></div>`;
    const active = bar.querySelector('.v108-step.current');
    if (active) requestAnimationFrame(() => active.scrollIntoView({ behavior: 'auto', block: 'nearest', inline: 'center' }));

    const headerPrimary = document.querySelector('#viewRoot .view-header .view-actions .primary-button[data-route]');
    if (headerPrimary && next) {
      headerPrimary.dataset.route = next.route;
      const textNode = Array.from(headerPrimary.childNodes).find(node => node.nodeType === Node.TEXT_NODE && node.textContent.trim());
      if (textNode) textNode.textContent = ` ${tr('Next', 'التالي')}`;
    }
  }

  function enhanceTitle() {
    const currentRoute = route();
    const title = document.querySelector('#viewRoot .view-header h1');
    if (!title) return;
    const meta = NAV.find(item => item.route === currentRoute) || NAV[0];
    title.textContent = tr(meta.en, meta.ar);
    const box = document.createElement('span');
    box.className = 'v108-title-icon';
    box.style.setProperty('--route-color', navColor(currentRoute));
    box.innerHTML = svg(meta.icon);
    title.prepend(box);
    document.body.style.setProperty('--route-color', navColor(currentRoute));
  }

  function activeQuestionAnswer(question, snap) {
    if (!question || !snap) return null;
    const container = snap[question.container];
    return factValue(container && container[question.semanticKey]);
  }

  function applicableQuestion(question, snap, activeComplaintIds) {
    if (!question || !snap) return false;
    const age = Number(factValue(snap.patient?.ageYears));
    const sex = factValue(snap.patient?.sexAtBirth);
    if (typeof question.minAge === 'number' && (!Number.isFinite(age) || age < question.minAge)) return false;
    if (typeof question.maxAge === 'number' && (!Number.isFinite(age) || age > question.maxAge)) return false;
    if (question.sex && sex && question.sex !== sex) return false;
    if (Array.isArray(question.complaints) && question.complaints.length && !question.complaints.some(id => activeComplaintIds.has(id))) return false;
    if (Array.isArray(question.excludesComplaints) && question.excludesComplaints.some(id => activeComplaintIds.has(id))) return false;
    return true;
  }

  function shortExamLabel(question) {
    const map = {
      q_airway_compromise: ['Airway compromise?', 'تهديد مجرى الهواء؟'],
      q_major_active_bleeding: ['Major bleeding?', 'نزيف شديد؟'],
      q_consciousness_avpu: ['AVPU', 'مقياس AVPU'],
      q_new_confusion: ['New confusion?', 'ارتباك جديد؟'],
      q_wheeze_stridor: ['Wheeze / stridor?', 'أزيز / صرير؟'],
      q_unilateral_leg_swelling: ['Unilateral leg swelling?', 'تورم ساق أحادي؟'],
      q_abdominal_peritonism: ['Peritonism / rigidity?', 'تهيج بريتوني / تيبس؟'],
      q_focal_neurology: ['Focal neurological deficit?', 'عجز عصبي بؤري؟'],
      q_neck_stiffness: ['Meningism / non-blanching rash?', 'تيبس رقبة / طفح لا يبهت؟'],
      q_pediatric_behavior: ['Abnormal behaviour?', 'سلوك غير طبيعي؟'],
      q_pediatric_breathing_effort: ['Respiratory distress?', 'ضائقة تنفسية؟'],
      q_eye_red_flags: ['Eye emergency features?', 'علامات طوارئ العين؟'],
      q_limb_neurovascular: ['Neurovascular compromise?', 'قصور عصبي وعائي؟']
    };
    const entry = map[question.id];
    if (entry) return tr(entry[0], entry[1]);
    return isArabic() && question.textAr ? question.textAr : question.text;
  }

  function optionTone(question, option) {
    const value = option.value;
    i