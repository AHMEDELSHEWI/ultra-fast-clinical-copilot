 stop.', 'تحدث طبيعيًا. اضغط إملاء مرة أخرى للإيقاف.');
  }

  function hideRedundantGestationField() {
    if (route() !== 'patient') return;
    const ga = document.querySelector('#patientForm [name="gestationalAgeWeeks"]');
    ga?.closest('.field')?.classList.add('v108-manual-form');
  }

  function compactDashboard() {
    if (route() !== 'dashboard') return;
    const hero = document.querySelector('#viewRoot .hero-panel');
    if (hero && !hero.dataset.v108Compact) {
      hero.dataset.v108Compact = 'true';
      const h1 = hero.querySelector('h1');
      if (h1) h1.textContent = tr('Fast clinical workflow', 'مسار سريري سريع');
      const p = hero.querySelector('p');
      if (p) p.textContent = tr('Select the complaint, tap answers, review the plan, then copy the complete note.', 'اختر الشكوى، اضغط الإجابات، راجع الخطة، ثم انسخ التوثيق كاملًا.');
    }
  }

  function markFocusForms() {
    document.querySelectorAll('#viewRoot form').forEach(form => form.classList.add('v108-focus-form'));
  }

  function updateNavActive() {
    const current = route();
    document.querySelectorAll('#sideNav [data-route]').forEach(button => button.classList.toggle('active', button.dataset.route === current));
    const scrim = document.getElementById('v108NavScrim');
    if (!document.getElementById('sideNav')?.classList.contains('open')) scrim?.classList.remove('open');
  }

  function updateConciseNavLabels() {
    NAV.forEach(item => {
      const button = document.querySelector(`#sideNav [data-route="${CSS.escape(item.route)}"]`);
      const label = button?.querySelector('.v108-nav-icon + span');
      if (label) label.textContent = tr(item.en, item.ar);
    });
    const title = document.querySelector('#sideNav .v108-nav-title span');
    if (title) title.textContent = tr('Clinical flow', 'المسار السريري');
    const more = document.querySelector('#sideNav .v108-nav-label');
    if (more) more.textContent = tr('More', 'المزيد');
    const dockCopy = document.querySelector('.quick-dock [data-quick="copy"] span:last-child');
    if (dockCopy) dockCopy.textContent = tr('COPY ALL', 'نسخ الكل');
  }

  function enhanceAll() {
    const start = performance.now();
    state.scheduled = false;
    buildShell();
    enhanceFlowBar();
    enhanceTitle();
    updateNavActive();
    updateConciseNavLabels();
    compactDashboard();
    compactVoicePanel();
    hideRedundantGestationField();
    separateHistoryFromExam();
    enhanceFocusedExam();
    enhanceNumericInputs();
    syncRangeAvailability();
    enhanceQuestionText();
    enhanceQuickTextChoices();
    enhanceInvestigations();
    enhanceTreatment();
    enhanceProcedures();
    enhanceDisposition();
    colorInvestigationRows();
    markFocusForms();
    const elapsed = performance.now() - start;
    state.performance.push(elapsed);
    if (state.performance.length > 40) state.performance.shift();
    if (elapsed > 50) console.debug(`[V1.0.8] enhancement ${elapsed.toFixed(1)} ms; local tap response remains immediate, rendering depends on device.`);
    state.route = route();
  }

  function schedule() {
    if (state.scheduled) return;
    state.scheduled = true;
    requestAnimationFrame(enhanceAll);
  }

  function init() {
    installStyles();
    buildShell();
    const root = document.getElementById('viewRoot');
    if (root) {
      state.observer = new MutationObserver(schedule);
      state.observer.observe(root, { childList: true });
    }
    const sideNav = document.getElementById('sideNav');
    if (sideNav) new MutationObserver(() => document.getElementById('v108NavScrim')?.classList.toggle('open', sideNav.classList.contains('open'))).observe(sideNav, { attributes: true, attributeFilter: ['class'] });
    window.addEventListener('hashchange', schedule);
    schedule();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();

  globalThis.__UFCopilotV108 = Object.freeze({
    version: VERSION,
    refresh: schedule,
    classifyLab: (testId, value, unit) => classifyLab(labById(testId), value, snapshot(), unit || labById(testId).units[0][0]),
    convertLab: (testId, value, fromUnit, toUnit) => {
      const test = labById(testId);
      return fromCanonical(test, toCanonical(test, value, fromUnit), toUnit);
    },
    performance: () => ({ last: state.performance.at(-1) || 0, average: state.performance.length ? state.performance.reduce((a,b)=>a+b,0)/state.performance.length : 0 })
  });
})();
