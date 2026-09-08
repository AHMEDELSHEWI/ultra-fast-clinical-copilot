(() => {
  'use strict';

  const VERSION = '1.0.7';
  const STATUS_FIELDS = [
    ['renalStatus', 'Renal status', 'الحالة الكلوية'],
    ['hepaticStatus', 'Hepatic status', 'الحالة الكبدية'],
    ['cardiacStatus', 'Cardiac status', 'حالة القلب'],
    ['diabeticStatus', 'Diabetic status', 'حالة السكري'],
    ['hypertensionStatus', 'Hypertension status', 'حالة ضغط الدم']
  ];

  const isArabic = () => document.documentElement.dir === 'rtl' || document.documentElement.lang === 'ar';
  const tr = (en, ar) => isArabic() ? ar : en;
  const getSnapshot = () => {
    try {
      const api = globalThis.__UFCopilotApp;
      return api && typeof api.getSnapshot === 'function' ? api.getSnapshot() : null;
    } catch (_) { return null; }
  };
  const factValue = fact => fact && typeof fact === 'object' && Object.prototype.hasOwnProperty.call(fact, 'value') ? fact.value : (fact == null ? null : fact);
  const encode = value => encodeURIComponent(JSON.stringify(value));
  const decode = value => {
    try { return JSON.parse(decodeURIComponent(String(value))); }
    catch (_) { return value; }
  };
  const setText = (node, value) => { const next = String(value == null ? '' : value); if (node && node.textContent !== next) node.textContent = next; };
  const escapeHtml = value => String(value == null ? '' : value)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

  function installStyles() {
    if (document.getElementById('v107PrecisionStyles')) return;
    const style = document.createElement('style');
    style.id = 'v107PrecisionStyles';
    style.textContent = `
      .v107-hidden{display:none!important}
      #v107ExactAgeGrid,#v107ExactGaGrid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin-top:8px}
      #v107ExactAgeGrid label,#v107ExactGaGrid label{display:grid;gap:5px}
      #v107ExactAgeGrid span,#v107ExactGaGrid span{font-size:.64rem;font-weight:850;color:var(--ink-soft,#51677f)}
      #v107ExactAgeGrid input,#v107ExactGaGrid input{width:100%;min-height:42px;border:1px solid var(--line-strong,#c6d6e8);border-radius:10px;background:var(--surface-strong,#edf4ff);color:var(--ink,#10243e);padding:8px 10px;font:inherit;font-weight:850;text-align:center;font-variant-numeric:tabular-nums}
      #v107ExactAgeGrid input:focus,#v107ExactGaGrid input:focus{outline:none}
      .v107-single-allergy-note{display:block;margin-top:6px;font-size:.64rem;color:var(--ink-soft,#51677f);line-height:1.45}
      .v107-status-default{display:inline-flex;align-items:center;gap:6px;margin-inline-start:6px;padding:2px 7px;border-radius:999px;background:var(--surface-strong,#edf4ff);font-size:.58rem;font-weight:850;color:var(--ink-soft,#51677f)}
      #v106DifferentialPanel .v106-dx[data-v107-tier="red"]{box-shadow:inset 0 0 0 1px color-mix(in srgb,#bd1732 12%,transparent)}
      #v106DifferentialPanel .v106-dx[data-v107-tier="yellow"]{box-shadow:inset 0 0 0 1px color-mix(in srgb,#a15c00 12%,transparent)}
      #v106DifferentialPanel .v106-dx[data-v107-tier="green"]{box-shadow:inset 0 0 0 1px color-mix(in srgb,#078a55 12%,transparent)}
      .v107-dx-legend{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin:0 0 10px}
      .v107-dx-legend div{display:grid;gap:2px;padding:9px 10px;border-radius:10px;border:1px solid var(--line,#dce6f1);background:var(--surface,#fff)}
      .v107-dx-legend strong{font-size:.67rem}.v107-dx-legend span{font-size:.59rem;color:var(--ink-soft,#51677f)}
      .v107-dx-legend .red strong{color:#bd1732}.v107-dx-legend .yellow strong{color:#a15c00}.v107-dx-legend .green strong{color:#078a55}
      @media(max-width:700px){#v107ExactAgeGrid,#v107ExactGaGrid{grid-template-columns:repeat(3,minmax(78px,1fr));overflow-x:auto}.v107-dx-legend{grid-template-columns:1fr}}
    `;
    document.head.appendChild(style);
  }

  function parseDate(value) {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || ''));
    if (!match) return null;
    const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
    if (date.getFullYear() !== Number(match[1]) || date.getMonth() !== Number(match[2]) - 1 || date.getDate() !== Number(match[3])) return null;
    return date;
  }

  function addYears(date, years) {
    const month = date.getMonth();
    const result = new Date(date.getFullYear() + years, month, date.getDate());
    if (result.getMonth() !== month) result.setDate(0);
    return result;
  }

  function addMonths(date, months) {
    const target = date.getMonth() + months;
    const expectedMonth = ((target % 12) + 12) % 12;
    const result = new Date(date.getFullYear(), target, date.getDate());
    if (result.getMonth() !== expectedMonth) result.setDate(0);
    return result;
  }

  function calculateAge(value, todayValue) {
    const birth = parseDate(value);
    const today = todayValue ? parseDate(todayValue) : (() => {
      const now = new Date();
      return new Date(now.getFullYear(), now.getMonth(), now.getDate());
    })();
    if (!birth || !today || birth > today) return null;
    let years = today.getFullYear() - birth.getFullYear();
    let yearAnchor = addYears(birth, years);
    if (yearAnchor > today) { years -= 1; yearAnchor = addYears(birth, years); }
    let months = 0;
    while (months < 11 && addMonths(yearAnchor, months + 1) <= today) months += 1;
    const monthAnchor = addMonths(yearAnchor, months);
    const days = Math.max(0, Math.floor((today - monthAnchor) / 86400000));
    return { years, months, days };
  }

  function calculateGestation(value, todayValue) {
    const lnmp = parseDate(value);
    const today = todayValue ? parseDate(todayValue) : (() => {
      const now = new Date();
      return new Date(now.getFullYear(), now.getMonth(), now.getDate());
    })();
    if (!lnmp || !today) return null;
    const totalDays = Math.floor((today - lnmp) / 86400000);
    if (totalDays < 0 || totalDays > 315) return null;
    return { weeks: Math.floor(totalDays / 7), days: totalDays % 7, totalDays };
  }

  function getPatientForm() {
    return document.getElementById('patientForm');
  }

  function selectedDecoded(form, name) {
    const input = form && form.querySelector(`input[type="radio"][name="${CSS.escape(name)}"]:checked`);
    return input ? decode(input.value) : null;
  }

  function chooseRadio(form, name, value) {
    if (!form) return false;
    const radios = Array.from(form.querySelectorAll(`input[type="radio"][name="${CSS.escape(name)}"]`));
    const target = radios.find(input => Object.is(decode(input.value), value));
    if (!target) return false;
    radios.forEach(input => {
      const selected = input === target;
      input.checked = selected;
      input.closest('label')?.classList.toggle('selected', selected);
    });
    target.dispatchEvent(new Event('input', { bubbles: true }));
    target.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  }

  function hiddenInput(form, name) {
    let input = form.querySelector(`input[type="hidden"][data-v107-name="${CSS.escape(name)}"]`);
    if (!input) {
      input = document.createElement('input');
      input.type = 'hidden';
      input.name = name;
      input.dataset.v107Name = name;
      form.appendChild(input);
    }
    return input;
  }

  function physicallyRemoveAllergyStatus(form) {
    const radios = Array.from(form.querySelectorAll('input[type="radio"][name="allergiesKnown"]'));
    if (!radios.length) return;
    const wrapper = radios[0].closest('.field');
    if (wrapper) wrapper.remove();
    else radios.forEach(input => input.closest('label')?.remove());
  }

  function syncAllergyStatus(form) {
    const allergy = form.querySelector('[name="allergies"]');
    const text = String(allergy?.value || '').trim();
    const hidden = hiddenInput(form, 'allergiesKnown');
    if (!text) hidden.value = encode(null);
    else hidden.value = encode(true);
  }

  function ensureSingleAllergy(form) {
    physicallyRemoveAllergyStatus(form);
    const allergy = form.querySelector('[name="allergies"]');
    const field = allergy?.closest('.field');
    if (!allergy || !field) return;
    const label = field.querySelector('.field-label');
    setText(label, tr('Allergies and reactions', 'الحساسيات والتفاعلات'));
    allergy.placeholder = tr('Drug/substance and reaction; enter NKDA if none known', 'الدواء أو المادة والتفاعل؛ اكتب NKDA إذا لم توجد حساسية معروفة');
    if (!field.querySelector('.v107-single-allergy-note')) {
      const note = document.createElement('small');
      note.className = 'v107-single-allergy-note';
      note.textContent = tr('This is the only allergy entry. Allergy status is inferred internally for medication-safety checks.', 'هذه هي خانة الحساسية الوحيدة. تُستنتج حالة الحساسية داخليًا لفحوص سلامة الأدوية.');
      field.appendChild(note);
    }
    syncAllergyStatus(form);
  }

  function buildTripleGrid(id, labels) {
    const grid = document.createElement('div');
    grid.id = id;
    labels.forEach(([key, en, ar]) => {
      const label = document.createElement('label');
      label.innerHTML = `<span>${escapeHtml(tr(en, ar))}</span><input data-v107-part="${escapeHtml(key)}" type="text" inputmode="numeric" readonly value="—">`;
      grid.appendChild(label);
    });
    return grid;
  }

  function updateAgeDisplay(form) {
    const dob = form.querySelector('[name="dateOfBirth"]');
    const manual = form.querySelector('[name="ageYears"]');
    const ageMonths = form.querySelector('[name="ageMonths"]');
    const ageDays = hiddenInput(form, 'ageDays');
    const exact = form.querySelector('#v106AgeExact');
    const parts = form.querySelectorAll('#v107ExactAgeGrid [data-v107-part]');
    const age = dob?.value ? calculateAge(dob.value) : null;

    if (age) {
      if (manual) { manual.value = String(age.years); manual.readOnly = true; manual.setAttribute('aria-readonly', 'true'); }
      if (ageMonths) ageMonths.value = String(age.months);
      ageDays.value = String(age.days);
      parts.forEach(input => { input.value = String(age[input.dataset.v107Part]); });
      if (exact) exact.value = `${age.years} ${tr('years', 'سنة')}, ${age.months} ${tr('months', 'شهر')}, ${age.days} ${tr('days', 'يوم')}`;
    } else {
      if (manual) { manual.readOnly = false; manual.removeAttribute('aria-readonly'); }
      if (ageMonths) ageMonths.value = '';
      ageDays.value = '';
      parts.forEach(input => { input.value = '—'; });
      if (exact) exact.value = manual?.value ? `${manual.value} ${tr('years (DOB unknown)', 'سنة (تاريخ الميلاد غير معروف)')}` : '';
    }
    const ageExact = form.querySelector('[data-v106-hidden="ageExact"], [data-v107-name="ageExact"]');
    if (ageExact && exact) ageExact.value = exact.value;
  }

  function updateGestationDisplay(form) {
    const sex = selectedDecoded(form, 'sexAtBirth');
    const lnmp = form.querySelector('#v106Lnmp');
    const weeksInput = form.querySelector('[name="gestationalAgeWeeks"]');
    const gaDays = hiddenInput(form, 'gestationalAgeDays');
    const exact = form.querySelector('#v106GestationExact');
