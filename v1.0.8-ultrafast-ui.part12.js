LABS.find(test => test.id === id) || LABS[0]; }
  function unitFactor(test, unit) { return test.units.find(item => item[0] === unit)?.[1] ?? 1; }
  function toCanonical(test, value, unit) { return Number(value) * unitFactor(test, unit); }
  function fromCanonical(test, value, unit) { return Number(value) / unitFactor(test, unit); }
  function formatLab(test, value) {
    if (!Number.isFinite(value)) return '';
    const decimals = Number.isFinite(test.decimals) ? test.decimals : 2;
    return Number(value.toFixed(decimals)).toString();
  }
  function labRange(test, snap, unit) {
    const canonical = typeof test.range === 'function' ? test.range(snap) : null;
    if (!canonical) return null;
    return canonical.map(value => fromCanonical(test, value, unit));
  }
  function classifyLab(test, value, snap, unit) {
    if (value === '' || value === null || typeof value === 'undefined') return 'review';
    const numeric = Number(value);
    const range = labRange(test, snap, unit);
    if (!Number.isFinite(numeric) || !range) return 'review';
    if (numeric < range[0]) return 'low';
    if (numeric > range[1]) return 'high';
    return 'normal';
  }

  function suggestedLabIds(snap) {
    const complaints = (snap?.complaints || []).filter(item => item.status !== 'invalidated' && item.status !== 'inactive');
    const primary = complaints.find(item => item.primary)?.id || complaints[0]?.id;
    const ids = [...(SUGGESTED_TESTS[primary] || ['hemoglobin','sodium','potassium','creatinine','glucose'])];
    complaints.slice(1).forEach(item => (SUGGESTED_TESTS[item.id] || []).forEach(id => { if (!ids.includes(id)) ids.push(id); }));
    return ids.slice(0, 10);
  }

  function labPanelHtml(snap) {
    const test = labById(state.lab.testId);
    const unit = state.lab.unit || test.units[0][0];
    const range = labRange(test, snap, unit);
    const status = classifyLab(test, state.lab.value, snap, unit);
    const refText = range ? `${formatLab(test, range[0])} – ${formatLab(test, range[1])} ${unit}` : tr('Assay / local laboratory specific', 'خاص بطريقة القياس أو المختبر المحلي');
    const statusLabel = { normal:tr('Normal','طبيعي'), high:tr('High','مرتفع'), low:tr('Low','منخفض'), review:tr('Review','مراجعة') }[status];
    const options = LABS.map(item => `<option value="${item.id}" ${item.id === test.id ? 'selected' : ''}>${esc(item.group)} · ${esc(item.name)}</option>`).join('');
    const units = test.units.map(item => `<button type="button" class="${item[0] === unit ? 'selected' : ''}" data-v108-unit="${esc(item[0])}">${esc(item[0])}</button>`).join('');
    const suggestions = suggestedLabIds(snap).map(id => { const item = labById(id); return `<button type="button" class="v108-chip ${id === test.id ? 'selected' : ''}" data-v108-test="${id}">${esc(item.name)}</button>`; }).join('');
    return `<div class="v108-lab-console"><div class="v108-tools">${suggestions}</div><div class="v108-lab-grid"><label><span>${esc(tr('Test', 'الفحص'))}</span><select id="v108LabTest">${options}</select></label><label><span>${esc(tr('Result', 'النتيجة'))}</span><input id="v108LabValue" type="number" inputmode="decimal" step="any" value="${esc(state.lab.value)}" placeholder="—"></label></div><div class="v108-unit-row">${units}</div><div class="v108-lab-status"><span class="v108-lab-badge ${status}" id="v108LabBadge">${esc(statusLabel)}</span><span class="v108-lab-ref"><strong id="v108LabReference">${esc(refText)}</strong><span>${esc(test.referenceNote || tr('Common adult reference; local laboratory range takes precedence.', 'مرجع شائع للبالغين؛ نطاق المختبر المحلي هو المعتمد.'))}</span></span></div><div class="v108-lab-actions"><button type="button" class="secondary-button" data-v108-lab-pending>${esc(tr('Request / pending', 'طلب / قيد الانتظار'))}</button><button type="button" class="primary-button" data-v108-lab-add>${esc(tr('Add result', 'إضافة النتيجة'))}</button><button type="button" class="ghost-button v108-manual-toggle" data-v108-manual>${esc(tr('Manual entry', 'إدخال يدوي'))}</button></div></div>`;
  }

  function refreshLabPanel(panel) {
    const snap = snapshot();
    const test = labById(state.lab.testId);
    const unit = state.lab.unit || test.units[0][0];
    const range = labRange(test, snap, unit);
    const status = classifyLab(test, state.lab.value, snap, unit);
    const badge = panel.querySelector('#v108LabBadge');
    const ref = panel.querySelector('#v108LabReference');
    if (badge) {
      badge.className = `v108-lab-badge 