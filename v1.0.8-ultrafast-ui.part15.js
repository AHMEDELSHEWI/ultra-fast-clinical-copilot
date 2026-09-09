ySelectorAll('#viewRoot form[data-form="medication"], #viewRoot form[data-form="treatment"]').forEach(form => form.classList.add('v108-focus-form'));
  }

  function enhanceProcedures() {
    if (route() !== 'procedures') return;
    const form = document.querySelector('#viewRoot form[data-form="procedure"]');
    if (form && !form.dataset.v108Procedure) {
      form.dataset.v108Procedure = 'true';
      const status = document.createElement('div');
      status.className = 'v108-procedure-status';
      status.innerHTML = `<label class="v108-procedure-requested"><input type="radio" name="procedureStatus" value="requested"><span>${svg('history')} ${esc(tr('Requested / planned', 'مطلوب / مخطط'))}</span></label><label class="v108-procedure-completed"><input type="radio" name="procedureStatus" value="completed" checked><span>${svg('check')} ${esc(tr('Completed', 'تم'))}</span></label>`;
      const grid = form.querySelector('.form-grid');
      form.insertBefore(status, grid || form.firstChild);
      const requiredNames = ['consent','technique','outcome','postProcedurePlan'];
      const performedOnlyNames = ['consent','preparation','equipment','technique','medication','dose','findings','complications','outcome','postProcedurePlan'];
      performedOnlyNames.forEach(name => form.querySelector(`[name="${name}"]`)?.closest('.field')?.classList.add('v108-completed-only'));
      const updateStatus = () => {
        const selected = form.querySelector('[name="procedureStatus"]:checked')?.value || 'completed';
        form.dataset.procedureStatus = selected;
        requiredNames.forEach(name => {
          const input = form.querySelector(`[name="${name}"]`);
          if (input) input.required = selected === 'completed';
        });
        const button = form.querySelector('button[type="submit"]');
        if (button) button.textContent = selected === 'completed' ? tr('Save completed', 'حفظ تم') : tr('Save request', 'حفظ الطلب');
      };
      status.addEventListener('change', updateStatus);
      updateStatus();
      form.addEventListener('submit', () => {
        const selected = form.querySelector('[name="procedureStatus"]:checked')?.value || 'completed';
        const outcome = form.querySelector('[name="outcome"]');
        const plan = form.querySelector('[name="postProcedurePlan"]');
        if (selected === 'requested') {
          if (outcome && !outcome.value) outcome.value = 'Requested / pending';
          if (plan && !plan.value) plan.value = 'Awaiting procedure';
        }
      }, true);
    }
    const snap = snapshot();
    const procedures = (snap?.procedures || []).filter(item => item.status !== 'invalidated');
    const lists = Array.from(document.querySelectorAll('#viewRoot .list-item'));
    procedures.forEach((item, index) => {
      const list = lists.find(node => node.querySelector('strong')?.textContent.trim() === item.name) || lists[index];
      if (!list || list.querySelector('.v108-procedure-badge')) return;
      const statusValue = item.procedureStatus || (/requested|pending/i.test(item.outcome || '') ? 'requested' : 'completed');
      const badge = document.createElement('span');
      badge.className = `v108-procedure-badge ${statusValue === 'requested' ? 'v108-procedure-requested' : 'v108-procedure-completed'}`;
      badge.textContent = statusValue === 'requested' ? tr('Requested', 'مطلوب') : tr('Completed', 'تم');
      list.querySelector('.list-item-actions')?.prepend(badge);
    });
  }

  function enhanceDisposition() {
    if (route() !== 'disposition') return;
    const consultation = document.querySelector('#viewRoot form[data-form="consultation"]');
    if (consultation && !consultation.dataset.v108Jgh) {
      consultation.dataset.v108Jgh = 'true';
      const actions = consultation.querySelector('.form-actions');
      if (actions) actions.insertAdjacentHTML('afterbegin', `<a class="secondary-button" href="https://ahmedelshewi.github.io/JGH-OnCall/" target="_blank" rel="noopener">${svg('disposition')} ${esc(tr('Open JGH OnCall', 'فتح JGH OnCall'))}</a>`);
    }
  }

  function compactVoicePanel() {
    const root = document.getElementById('v105AutoVoicePanel');
    if (!root) return;
    const title = root.querySelector('.v105-copy strong');
    const subtitle = root.querySelector('.v105-copy span');
    if (title) title.textContent = tr('Auto Dictate • English note', 'إملاء تلقائي • توثيق إنجليزي');
    if (subtitle) subtitle.textContent = tr('Speak naturally. Tap Dictate again to 