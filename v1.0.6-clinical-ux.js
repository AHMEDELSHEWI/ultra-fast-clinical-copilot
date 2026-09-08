(() => {
  'use strict';

  const VERSION = '1.0.6';
  const STATUS_FIELDS = [
    ['renalStatus', 'Renal status', 'الحالة الكلوية'],
    ['hepaticStatus', 'Hepatic status', 'الحالة الكبدية'],
    ['cardiacStatus', 'Cardiac status', 'حالة القلب'],
    ['diabeticStatus', 'Diabetic status', 'حالة السكري'],
    ['hypertensionStatus', 'Hypertension status', 'حالة ضغط الدم']
  ];
  const runtimeDrafts = new Map();

  const isArabic = () => document.documentElement.dir === 'rtl' || document.documentElement.lang === 'ar';
  const tr = (en, ar) => isArabic() ? ar : en;
  const app = () => globalThis.__UFCopilotApp || null;
  const snapshot = () => {
    try { return app() && typeof app().getSnapshot === 'function' ? app().getSnapshot() : null; }
    catch (_) { return null; }
  };
  const factValue = fact => {
    if (fact && typeof fact === 'object' && Object.prototype.hasOwnProperty.call(fact, 'value')) return fact.value;
    return fact == null ? null : fact;
  };
  const escapeHtml = value => String(value == null ? '' : value)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

  function decodeValue(value) {
    try { return JSON.parse(decodeURIComponent(String(value))); }
    catch (_) { return value; }
  }

  function installStyles() {
    if (document.getElementById('v106ClinicalUxStyles')) return;
    const style = document.createElement('style');
    style.id = 'v106ClinicalUxStyles';
    style.textContent = `
      .v106-hidden-field{display:none!important}
      #v106PatientEnhancements{display:grid;gap:14px;margin:14px 0 0}
      #v106PatientEnhancements .v106-panel{border:1px solid var(--line,#dce6f1);border-radius:14px;background:var(--surface-soft,#f8fbff);padding:14px;display:grid;gap:12px}
      #v106PatientEnhancements .v106-panel>header{display:grid;gap:3px}
      #v106PatientEnhancements .v106-panel>header strong{font-size:.84rem}
      #v106PatientEnhancements .v106-panel>header span,.v106-help{font-size:.68rem;color:var(--ink-soft,#51677f);line-height:1.5}
      .v106-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
      .v106-field{display:grid;gap:6px}.v106-field>span{font-size:.7rem;font-weight:800;color:var(--ink-soft,#51677f)}
      .v106-field input,.v106-field select{width:100%;min-height:44px;border:1px solid var(--line-strong,#c6d6e8);border-radius:11px;background:var(--surface,#fff);color:var(--ink,#10243e);padding:9px 11px;font:inherit}
      .v106-field input:focus,.v106-field select:focus{outline:none;border-color:var(--brand,#0b5fff);box-shadow:var(--focus,0 0 0 4px rgba(11,95,255,.18))}
      .v106-field input[readonly]{background:var(--surface-strong,#edf4ff);font-weight:800}
      .v106-status-row{display:grid;grid-template-columns:minmax(130px,.75fr) minmax(0,1.25fr);gap:8px}
      .v106-status-row input[hidden]{display:none!important}.v106-status-row input:disabled,.v106-status-row select:disabled{opacity:.6;cursor:not-allowed}
      .v106-pregnancy-disabled{opacity:.58}.v106-pregnancy-disabled input:not([data-v106-na]){pointer-events:none}
      #v106DifferentialPanel{display:grid;gap:10px}
      #v106DifferentialPanel .v106-dx-note{font-size:.68rem;color:var(--ink-soft,#51677f);line-height:1.55;padding:10px 11px;border:1px solid var(--line,#dce6f1);border-radius:11px;background:var(--surface-soft,#f8fbff)}
      .v106-dx-list{display:grid;gap:8px}.v106-dx{--dx:#078a55;position:relative;display:grid;grid-template-columns:38px minmax(0,1fr) auto;gap:10px;align-items:center;padding:10px 12px 10px 16px;border:1px solid color-mix(in srgb,var(--dx) 24%,var(--line,#dce6f1));border-radius:12px;background:color-mix(in srgb,var(--dx) 6%,var(--surface,#fff));overflow:hidden}
      [dir="rtl"] .v106-dx{padding:10px 16px 10px 12px}.v106-dx::before{content:'';position:absolute;inset-block:0;inset-inline-start:0;width:7px;background:var(--dx)}
      .v106-dx-rank{width:32px;height:32px;border-radius:50%;display:grid;place-items:center;background:color-mix(in srgb,var(--dx) 16%,var(--surface,#fff));color:var(--dx);font-weight:900;font-variant-numeric:tabular-nums}
      .v106-dx-copy{display:grid;gap:3px;min-width:0}.v106-dx-copy strong{font-size:.8rem}.v106-dx-copy span{font-size:.66rem;color:var(--ink-soft,#51677f);line-height:1.45}
      .v106-dx-band{color:var(--dx)!important;font-weight:900!important;text-transform:uppercase;letter-spacing:.04em}.v106-dx-badges{display:flex;gap:6px;flex-wrap:wrap;margin-top:2px}
      .v106-dx-badge{display:inline-flex;align-items:center;min-height:24px;padding:3px 7px;border-radius:999px;font-size:.59rem!important;font-weight:850;background:color-mix(in srgb,var(--dx) 13%,var(--surface,#fff));color:var(--dx)!important;border:1px solid color-mix(in srgb,var(--dx) 28%,transparent)}
      .v106-empty{padding:12px;border:1px dashed var(--line-strong,#c6d6e8);border-radius:11px;color:var(--ink-soft,#51677f);font-size:.7rem}
      @media(max-width:760px){.v106-grid{grid-template-columns:1fr}.v106-status-row{grid-template-columns:1fr}.v106-dx{grid-template-columns:34px minmax(0,1fr)}.v106-dx>.secondary-button{grid-column:2;justify-self:start}}
    `;
    document.head.appendChild(style);
  }

  function formField(form, name) {
    return form ? form.querySelector(`[name="${CSS.escape(name)}"]`) : null;
  }

  function fieldWrapper(control) {
    return control && control.closest ? control.closest('.field') : null;
  }

  function setRadio(form, name, targetValue) {
    const radios = Array.from(form.querySelectorAll(`input[type="radio"][name="${CSS.escape(name)}"]`));
    const target = radios.find(radio => Object.is(decodeValue(radio.value), targetValue));
    if (!target) return false;
    radios.forEach(radio => {
      const selected = radio === target;
      radio.checked = selected;
      const label = radio.closest('label');
      if (label) label.classList.toggle('selected', selected);
    });
    target.dispatchEvent(new Event('input', { bubbles: true }));
    target.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  }

  function selectedRadio(form, name) {
    const checked = form.querySelector(`input[type="radio"][name="${CSS.escape(name)}"]:checked`);
    return checked ? decodeValue(checked.value) : null;
  }

  function ensureHidden(form, name, initialValue) {
    let input = form.querySelector(`input[data-v106-hidden="${CSS.escape(name)}"]`);
    if (!input) {
      input = document.createElement('input');
      input.type = 'hidden';
      input.name = name;
      input.dataset.v106Hidden = name;
      form.appendChild(input);
    }
    input.value = initialValue == null ? '' : String(initialValue);
    return input;
  }

  function parseDateOnly(value) {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || ''));
    if (!match) return null;
    const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
    if (date.getFullYear() !== Number(match[1]) || date.getMonth() !== Number(match[2]) - 1 || date.getDate() !== Number(match[3])) return null;
    return date;
  }

  function addCalendarYears(date, years) {
    const result = new Date(date.getFullYear() + years, date.getMonth(), date.getDate());
    if (result.getMonth() !== date.getMonth()) result.setDate(0);
    return result;
  }

  function addCalendarMonths(date, months) {
    const targetMonth = date.getMonth() + months;
    const result = new Date(date.getFullYear(), targetMonth, date.getDate());
    const normalizedMonth = ((targetMonth % 12) + 12) % 12;
    if (result.getMonth() !== normalizedMonth) result.setDate(0);
    return result;
  }

  function calculateAge(value) {
    const birth = parseDateOnly(value);
    if (!birth) return null;
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    if (birth > today) return null;
    let years = today.getFullYear() - birth.getFullYear();
    let anchor = addCalendarYears(birth, years);
    if (anchor > today) { years -= 1; anchor = addCalendarYears(birth, years); }
    let months = 0;
    while (months < 11 && addCalendarMonths(anchor, months + 1) <= today) months += 1;
    const monthAnchor = addCalendarMonths(anchor, months);
    const days = Math.max(0, Math.floor((today - monthAnchor) / 86400000));
    return { years, months, days, totalMonths: years * 12 + months };
  }

  function calculateGestation(value) {
    const lnmp = parseDateOnly(value);
    if (!lnmp) return null;
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const totalDays = Math.floor((today - lnmp) / 86400000);
    if (totalDays < 0 || totalDays > 315) return null;
    return { weeks: Math.floor(totalDays / 7), days: totalDays % 7, decimalWeeks: Math.round((totalDays / 7) * 10) / 10 };
  }

  function parseStatus(raw) {
    const text = String(raw == null ? '' : raw).trim();
    if (!text || /^unknown$/i.test(text)) return { status: 'unknown', details: '' };
    return { status: 'known', details: text.replace(/^known\s*[:\-–—]?\s*/i, '') };
  }

  function storedStatus(status, details) {
    if (status !== 'known') return 'Unknown';
    const cleaned = String(details || '').trim();
    return cleaned ? `Known: ${cleaned}` : 'Known';
  }

  function patientDraft(caseId) {
    if (!runtimeDrafts.has(caseId)) runtimeDrafts.set(caseId, {});
    return runtimeDrafts.get(caseId);
  }

  function refreshPregnancyState(form) {
    const sex = selectedRadio(form, 'sexAtBirth');
    const pregnancyField = fieldWrapper(formField(form, 'pregnancyStatus'));
    const lnmp = form.querySelector('#v106Lnmp');
    const ga = formField(form, 'gestationalAgeWeeks');
    const exact = form.querySelector('#v106GestationExact');
    const male = sex === 'male';

    if (pregnancyField) pregnancyField.classList.toggle('v106-pregnancy-disabled', male);
    form.querySelectorAll('input[type="radio"][name="pregnancyStatus"]').forEach(radio => {
      const isNA = decodeValue(radio.value) === 'not_applicable';
      radio.dataset.v106Na = isNA ? 'true' : '';
      radio.disabled = male && !isNA;
    });
    if (male) {
      setRadio(form, 'pregnancyStatus', 'not_applicable');
      if (lnmp) { lnmp.value = ''; lnmp.disabled = true; }
      if (ga) { ga.value = ''; ga.readOnly = true; }
      if (exact) exact.value = tr('Not applicable', 'غير منطبق');
    } else {
      if (lnmp) lnmp.disabled = false;
      if (ga && !lnmp?.value) ga.readOnly = false;
      if (selectedRadio(form, 'pregnancyStatus') === 'not_applicable') setRadio(form, 'pregnancyStatus', 'possible');
    }
  }

  function syncPatientForm(form) {
    const dob = formField(form, 'dateOfBirth');
    const ageYears = formField(form, 'ageYears');
    const ageMonths = formField(form, 'ageMonths');
    const exactAge = form.querySelector('#v106AgeExact');
    const lnmp = form.querySelector('#v106Lnmp');
    const gaWeeks = formField(form, 'gestationalAgeWeeks');
    const gaExact = form.querySelector('#v106GestationExact');
    const age = dob?.value ? calculateAge(dob.value) : null;
    const gestation = lnmp?.value ? calculateGestation(lnmp.value) : null;

    if (age) {
      if (ageYears) { ageYears.value = String(age.years); ageYears.readOnly = true; }
      if (ageMonths) ageMonths.value = String(age.totalMonths);
      if (exactAge) exactAge.value = `${age.years} ${tr('years', 'سنة')}, ${age.months} ${tr('months', 'شهر')}, ${age.days} ${tr('days', 'يوم')}`;
    } else {
      if (ageYears) ageYears.readOnly = false;
      if (ageMonths) ageMonths.value = '';
      if (exactAge) exactAge.value = ageYears?.value ? `${ageYears.value} ${tr('years (DOB unknown)', 'سنة (تاريخ الميلاد غير معروف)')}` : '';
    }
    ensureHidden(form, 'ageExact', exactAge?.value || '');

    if (selectedRadio(form, 'sexAtBirth') === 'male') {
      ensureHidden(form, 'lnmp', '');
      ensureHidden(form, 'gestationalAgeExact', tr('Not applicable', 'غير منطبق'));
    } else if (gestation) {
      if (gaWeeks) { gaWeeks.value = String(gestation.decimalWeeks); gaWeeks.readOnly = true; }
      if (gaExact) gaExact.value = `${gestation.weeks} ${tr('weeks', 'أسبوع')} + ${gestation.days} ${tr('days', 'يوم')}`;
      ensureHidden(form, 'lnmp', lnmp.value);
      ensureHidden(form, 'gestationalAgeExact', gaExact?.value || '');
    } else {
      if (gaWeeks) gaWeeks.readOnly = false;
      if (gaExact) gaExact.value = '';
      ensureHidden(form, 'lnmp', lnmp?.value || '');
      ensureHidden(form, 'gestationalAgeExact', '');
    }

    STATUS_FIELDS.forEach(([key]) => {
      const select = form.querySelector(`[data-v106-status="${key}"]`);
      const details = form.querySelector(`[data-v106-details="${key}"]`);
      const hidden = form.querySelector(`[data-v106-hidden="${key}"]`) || formField(form, key);
      if (hidden && select) hidden.value = storedStatus(select.value, details?.value || '');
    });

    const allergyText = String(formField(form, 'allergies')?.value || '').trim();
    const established = Boolean(allergyText && !/^(unknown|not known|unable to establish)$/i.test(allergyText));
    setRadio(form, 'allergiesKnown', established);
  }

  function installPatientEnhancements() {
    const form = document.getElementById('patientForm');
    if (!form || form.dataset.v106Enhanced === 'true') return;
    installStyles();
    form.dataset.v106Enhanced = 'true';

    const snap = snapshot();
    const caseId = snap?.id || 'current';
    const draft = patientDraft(caseId);
    const patient = snap?.patient || {};

    const ageMonths = formField(form, 'ageMonths');
    fieldWrapper(ageMonths)?.classList.add('v106-hidden-field');

    ['renalStatus', 'hepaticStatus'].forEach(name => {
      const input = formField(form, name);
      if (input) {
        const wrapper = fieldWrapper(input);
        if (wrapper) wrapper.classList.add('v106-hidden-field');
        input.type = 'hidden';
        input.dataset.v106Hidden = name;
      }
    });

    const allergyStatus = formField(form, 'allergiesKnown');
    fieldWrapper(allergyStatus)?.classList.add('v106-hidden-field');
    const allergy = formField(form, 'allergies');
    if (allergy) {
      const label = fieldWrapper(allergy)?.querySelector('.field-label');
      if (label) label.textContent = tr('Allergies and reactions', 'الحساسيات والتفاعلات');
      allergy.placeholder = tr('Drug/substance and reaction; enter NKDA if none known', 'الدواء أو المادة والتفاعل؛ اكتب NKDA إذا لم توجد حساسية معروفة');
    }

    const ageYears = formField(form, 'ageYears');
    if (ageYears) {
      const label = fieldWrapper(ageYears)?.querySelector('.field-label');
      if (label) label.textContent = tr('Age in years (if DOB is unknown)', 'العمر بالسنوات (إذا كان تاريخ الميلاد غير معروف)');
      ageYears.step = '1';
    }
    const gaWeeks = formField(form, 'gestationalAgeWeeks');
    if (gaWeeks) {
      const label = fieldWrapper(gaWeeks)?.querySelector('.field-label');
      if (label) label.textContent = tr('Gestational age in weeks (automatic from LNMP)', 'عمر الحمل بالأسابيع (يُحسب تلقائيًا من LNMP)');
    }

    form.querySelectorAll('input[type="radio"][name="sexAtBirth"]').forEach(radio => {
      if (decodeValue(radio.value) === 'intersex') radio.closest('label')?.remove();
    });

    const root = document.createElement('section');
    root.id = 'v106PatientEnhancements';
    root.innerHTML = `
      <section class="v106-panel">
        <header><strong>${escapeHtml(tr('Automatic age and gestational age', 'الحساب التلقائي للعمر وعمر الحمل'))}</strong><span>${escapeHtml(tr('DOB calculates years, months and days. When DOB is unknown, type age in years directly. LNMP calculates gestational age.', 'تاريخ الميلاد يحسب السنوات والأشهر والأيام. عند عدم معرفته اكتب العمر بالسنوات مباشرة. ويحسب LNMP عمر الحمل.'))}</span></header>
        <div class="v106-grid">
          <label class="v106-field"><span>${escapeHtml(tr('Calculated age', 'العمر المحسوب'))}</span><input id="v106AgeExact" type="text" readonly placeholder="${escapeHtml(tr('Enter DOB or age in years', 'أدخل تاريخ الميلاد أو العمر بالسنوات'))}"></label>
          <label class="v106-field"><span>LNMP</span><input id="v106Lnmp" type="date"></label>
          <label class="v106-field"><span>${escapeHtml(tr('Calculated gestational age', 'عمر الحمل المحسوب'))}</span><input id="v106GestationExact" type="text" readonly placeholder="${escapeHtml(tr('Enter LNMP', 'أدخل LNMP'))}"></label>
        </div>
        <div class="v106-help">${escapeHtml(tr('Male automatically sets pregnancy status to Not applicable. Sex at birth is limited to Female, Male, or Unknown.', 'اختيار ذكر يضبط حالة الحمل تلقائيًا على غير منطبق. الجنس عند الولادة يقتصر على أنثى أو ذكر أو غير معروف.'))}</div>
      </section>
      <section class="v106-panel">
        <header><strong>${escapeHtml(tr('Comorbidity status', 'حالة الأمراض المصاحبة'))}</strong><span>${escapeHtml(tr('Every status starts as Unknown. Select Known to enter details.', 'تبدأ جميع الحالات بقيمة غير معروف. اختر معروف لإضافة التفاصيل.'))}</span></header>
        <div class="v106-grid" data-v106-status-grid></div>
      </section>`;

    const actions = form.querySelector('.form-actions');
    form.insertBefore(root, actions || null);
    const grid = root.querySelector('[data-v106-status-grid]');

    STATUS_FIELDS.forEach(([key, en, ar]) => {
      const raw = Object.prototype.hasOwnProperty.call(draft, key) ? draft[key] : factValue(patient[key]);
      const parsed = parseStatus(raw);
      const row = document.createElement('label');
      row.className = 'v106-field';
      row.innerHTML = `<span>${escapeHtml(tr(en, ar))}</span><div class="v106-status-row"><select data-v106-status="${escapeHtml(key)}"><option value="unknown">${escapeHtml(tr('Unknown', 'غير معروف'))}</option><option value="known">${escapeHtml(tr('Known', 'معروف'))}</option></select><input data-v106-details="${escapeHtml(key)}" type="text" placeholder="${escapeHtml(tr('Details', 'التفاصيل'))}"></div>`;
      grid.appendChild(row);
      const select = row.querySelector('select');
      const details = row.querySelector('input');
      select.value = parsed.status;
      details.value = parsed.details;
      details.hidden = parsed.status !== 'known';

      let hidden = formField(form, key);
      if (!hidden || hidden.type !== 'hidden') hidden = ensureHidden(form, key, storedStatus(parsed.status, parsed.details));
      hidden.value = storedStatus(parsed.status, parsed.details);
    });

    const dob = formField(form, 'dateOfBirth');
    if (dob) dob.max = new Date().toISOString().slice(0, 10);
    const lnmp = root.querySelector('#v106Lnmp');
    lnmp.max = new Date().toISOString().slice(0, 10);
    lnmp.value = Object.prototype.hasOwnProperty.call(draft, 'lnmp') ? draft.lnmp : String(factValue(patient.lnmp) || '');

    const exactAge = root.querySelector('#v106AgeExact');
    const exactGA = root.querySelector('#v106GestationExact');
    ensureHidden(form, 'lnmp', lnmp.value);
    ensureHidden(form, 'ageExact', String(factValue(patient.ageExact) || ''));
    ensureHidden(form, 'gestationalAgeExact', String(factValue(patient.gestationalAgeExact) || ''));

    function updateAge() {
      const age = dob?.value ? calculateAge(dob.value) : null;
      if (age) {
        ageYears.value = String(age.years);
        ageYears.readOnly = true;
        if (ageMonths) ageMonths.value = String(age.totalMonths);
        exactAge.value = `${age.years} ${tr('years', 'سنة')}, ${age.months} ${tr('months', 'شهر')}, ${age.days} ${tr('days', 'يوم')}`;
      } else {
        if (ageYears) ageYears.readOnly = false;
        if (ageMonths) ageMonths.value = '';
        exactAge.value = ageYears?.value ? `${ageYears.value} ${tr('years (DOB unknown)', 'سنة (تاريخ الميلاد غير معروف)')}` : '';
      }
      draft.ageExact = exactAge.value;
      ensureHidden(form, 'ageExact', exactAge.value).value = exactAge.value;
    }

    function updateGestation() {
      if (selectedRadio(form, 'sexAtBirth') === 'male') {
        lnmp.value = '';
        lnmp.disabled = true;
        if (gaWeeks) { gaWeeks.value = ''; gaWeeks.readOnly = true; }
        exactGA.value = tr('Not applicable', 'غير منطبق');
      } else {
        lnmp.disabled = false;
        const ga = lnmp.value ? calculateGestation(lnmp.value) : null;
        if (ga) {
          if (gaWeeks) { gaWeeks.value = String(ga.decimalWeeks); gaWeeks.readOnly = true; }
          exactGA.value = `${ga.weeks} ${tr('weeks', 'أسبوع')} + ${ga.days} ${tr('days', 'يوم')}`;
        } else {
          if (gaWeeks) gaWeeks.readOnly = false;
          exactGA.value = '';
        }
      }
      draft.lnmp = lnmp.value;
      draft.gestationalAgeExact = exactGA.value;
      ensureHidden(form, 'lnmp', lnmp.value).value = lnmp.value;
      ensureHidden(form, 'gestationalAgeExact', exactGA.value).value = exactGA.value;
    }

    dob?.addEventListener('input', updateAge);
    dob?.addEventListener('change', updateAge);
    ageYears?.addEventListener('input', () => { if (!dob?.value) updateAge(); });
    lnmp.addEventListener('input', updateGestation);
    lnmp.addEventListener('change', updateGestation);

    root.addEventListener('change', event => {
      const select = event.target.closest('[data-v106-status]');
      if (!select) return;
      const key = select.dataset.v106Status;
      const details = root.querySelector(`[data-v106-details="${key}"]`);
      details.hidden = select.value !== 'known';
      if (select.value !== 'known') details.value = '';
      const value = storedStatus(select.value, details.value);
      draft[key] = value;
      const hidden = form.querySelector(`[data-v106-hidden="${key}"]`) || formField(form, key);
      if (hidden) hidden.value = value;
      if (select.value === 'known') details.focus();
    });
    root.addEventListener('input', event => {
      const details = event.target.closest('[data-v106-details]');
      if (!details) return;
      const key = details.dataset.v106Details;
      const value = storedStatus('known', details.value);
      draft[key] = value;
      const hidden = form.querySelector(`[data-v106-hidden="${key}"]`) || formField(form, key);
      if (hidden) hidden.value = value;
    });

    updateAge();
    refreshPregnancyState(form);
    updateGestation();
    syncPatientForm(form);
  }

  function flattenValues(value, output, depth = 0) {
    if (depth > 6 || value == null) return;
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') { output.push(String(value)); return; }
    if (Array.isArray(value)) { value.forEach(item => flattenValues(item, output, depth + 1)); return; }
    if (typeof value === 'object') {
      if (Object.prototype.hasOwnProperty.call(value, 'value')) flattenValues(value.value, output, depth + 1);
      else Object.keys(value).forEach(key => { if (!['auditTrail','timeline','versions','attachments'].includes(key)) flattenValues(value[key], output, depth + 1); });
    }
  }

  function normalizeText(value) {
    return String(value || '').toLowerCase().normalize('NFKD').replace(/[^a-z0-9\p{L}\p{N}]+/gu, ' ').replace(/\s+/g, ' ').trim();
  }

  const CLINICAL_RULES = [
    [/acute coronary|myocardial|coronary syndrome/, [/chest pain|chest pressure|tightness/, /exert/, /radiat/, /diaphoresis|sweat/, /nausea/]],
    [/aortic/, [/sudden/, /tearing/, /radiat.*back|back.*radiat/, /pulse deficit/, /neurolog/]],
    [/pulmonary embol/, [/pleuritic/, /hemoptysis/, /leg swelling/, /recent surgery|immobili/, /tachycard/, /hypoxi/]],
    [/pneumothorax/, [/sudden/, /pleuritic/, /trauma/, /unilateral/, /hypoxi/]],
    [/pneumonia|respiratory infection/, [/fever/, /cough/, /sputum|productive/, /dyspn|shortness of breath/, /hypoxi/]],
    [/heart failure|pulmonary edema/, [/orthopn/, /pnd|paroxysmal nocturnal/, /edema|swelling/, /weight gain/, /crepitation/]],
    [/asthma|bronchospasm/, [/wheeze/, /asthma/, /inhaler/, /trigger/, /shortness of breath/]],
    [/copd/, [/copd/, /smok/, /wheeze/, /sputum/, /hypercap/]],
    [/subarachnoid/, [/thunderclap/, /worst headache/, /sudden headache/, /neck stiffness/, /collapse/]],
    [/meningitis|encephalitis/, [/fever/, /neck stiffness/, /photophobia/, /rash/, /confusion/]],
    [/stroke|intracranial hemorrhage/, [/focal/, /weakness/, /facial droop/, /speech/, /aphasia/, /last known well/]],
    [/appendic/, [/right lower|rlq/, /migration/, /anorexia/, /fever/, /vomit/]],
    [/biliary|cholecyst/, [/right upper|ruq/, /postprandial|meal/, /jaundice/, /fever/]],
    [/pancreat/, [/epigastr/, /radiat.*back/, /alcohol/, /vomit/]],
    [/ectopic/, [/pregnan/, /vaginal bleeding/, /pelvic pain/, /syncope/, /shoulder tip/]],
    [/sepsis|septic shock/, [/fever|hypotherm/, /hypotens/, /confusion/, /tachycard/, /infection/]],
    [/gastroenteritis/, [/diarrh/, /vomit/, /sick contact/, /abdominal cramp/, /fever/]],
    [/renal colic|ureteric stone/, [/flank pain/, /hematur/, /colic/, /groin/]],
    [/pyelonephritis/, [/flank pain/, /fever/, /dysuria/, /vomit/]],
    [/anaphylaxis/, [/allerg/, /wheeze|stridor/, /urticaria|rash/, /hypotens/, /swelling/]],
    [/musculoskeletal/, [/reproducible/, /movement/, /tender/, /strain/, /injury/]],
    [/gastro oesophageal|reflux/, [/burning/, /meal/, /acid/, /reflux/, /epigastr/]]
  ];

  function rankDifferentials(snap) {
    const suggestions = Array.isArray(snap?.reasoning?.suggestions) ? snap.reasoning.suggestions : [];
    const values = [];
    flattenValues({ patient: snap?.patient, presentation: snap?.presentationText, complaints: snap?.complaints, history: snap?.history, ros: snap?.reviewOfSystems, exam: snap?.exam, vitals: snap?.vitals, labs: snap?.labs }, values);
    const corpus = normalizeText(values.join(' '));
    const complaints = Array.isArray(snap?.complaints) ? snap.complaints.filter(item => item.status !== 'invalidated' && item.status !== 'inactive') : [];
    const primary = complaints.find(item => item.primary)?.id || complaints[0]?.id || '';

    const ranked = suggestions.map((item, index) => {
      const label = normalizeText(item.label);
      let score = item.type === 'alternative' ? 54 : 38;
      const evidence = [];
      if (item.complaintId === primary) { score += 13; evidence.push(tr('primary complaint match', 'مرتبط بالشكوى الرئيسية')); }
      else if (complaints.some(c => c.id === item.complaintId)) { score += 7; evidence.push(tr('active complaint match', 'مرتبط بشكوى نشطة')); }
      const labelTokens = label.split(' ').filter(token => token.length >= 4);
      const tokenHits = labelTokens.filter(token => corpus.includes(token)).slice(0, 4);
      if (tokenHits.length) { score += tokenHits.length * 4; evidence.push(tr('documented terms match', 'تطابق مع مصطلحات موثقة')); }
      CLINICAL_RULES.forEach(([condition, clues]) => {
        if (!condition.test(label)) return;
        let hits = 0;
        clues.forEach(clue => { if (clue.test(corpus)) hits += 1; });
        if (hits) { score += Math.min(24, hits * 6); evidence.push(`${hits} ${tr('supporting feature(s)', 'علامة داعمة')}`); }
      });
      const statusText = normalizeText([factValue(snap?.patient?.cardiacStatus), factValue(snap?.patient?.diabeticStatus), factValue(snap?.patient?.hypertensionStatus), factValue(snap?.patient?.renalStatus), factValue(snap?.patient?.hepaticStatus)].join(' '));
      if (/coronary|heart failure|vascular|stroke/.test(label) && /known/.test(statusText)) score += 4;
      if (item.type === 'must_not_miss') evidence.push(tr('must-not-miss safety diagnosis', 'تشخيص خطير يجب عدم تفويته'));
      return { ...item, sourceIndex: index, score: Math.max(1, Math.min(99, score)), evidence };
    });

    ranked.sort((a, b) => b.score - a.score || ((a.type === 'alternative' ? 0 : 1) - (b.type === 'alternative' ? 0 : 1)) || a.sourceIndex - b.sourceIndex);
    return ranked.slice(0, 10).map((item, index) => ({ ...item, rank: index + 1, band: index < 3 ? 'red' : index < 6 ? 'yellow' : 'green' }));
  }

  function renderDifferentials() {
    const headings = Array.from(document.querySelectorAll('.card-header h2'));
    const heading = headings.find(node => /Safety differential and must-not-miss review|فحص السلامة والتشخيصات التي لا ينبغي تفويتها/i.test(node.textContent || ''));
    if (!heading) return;
    const card = heading.closest('.card');
    const body = card?.querySelector('.card-body');
    if (!card || !body) return;
    const ranked = rankDifferentials(snapshot());
    const fingerprint = JSON.stringify(ranked.map(item => [item.label, item.score, item.type]));
    if (card.dataset.v106Fingerprint === fingerprint) return;
    card.dataset.v106Fingerprint = fingerprint;

    heading.textContent = tr('AI-ranked differential diagnosis — Top 10', 'التشخيصات التفريقية المرتبة بالذكاء الاصطناعي — أفضل 10');
    const subtitle = card.querySelector('.card-header p');
    if (subtitle) subtitle.textContent = tr('Red = higher relative likelihood, yellow = intermediate, green = lower. Must-not-miss risk is shown separately.', 'الأحمر = احتمال نسبي أعلى، والأصفر = متوسط، والأخضر = أقل. وتظهر خطورة عدم التفويت بصورة منفصلة.');
    const color = band => band === 'red' ? '#bd1732' : band === 'yellow' ? '#a15c00' : '#078a55';
    const bandLabel = band => band === 'red' ? tr('Higher likelihood', 'احتمال أعلى') : band === 'yellow' ? tr('Intermediate likelihood', 'احتمال متوسط') : tr('Lower likelihood', 'احتمال أقل');
    const rows = ranked.map(item => {
      const rationale = item.evidence.length ? item.evidence.join(' • ') : tr('Ranked from the selected presentation and currently documented data.', 'تم الترتيب وفق العرض المختار والبيانات الموثقة حاليًا.');
      const safety = item.type === 'must_not_miss' ? `<span class="v106-dx-badge">${escapeHtml(tr('Must not miss', 'يجب عدم تفويته'))}</span>` : '';
      return `<div class="v106-dx" style="--dx:${color(item.band)}"><div class="v106-dx-rank">${item.rank}</div><div class="v106-dx-copy"><strong>${escapeHtml(item.label)}</strong><span class="v106-dx-band">${escapeHtml(bandLabel(item.band))}</span><span>${escapeHtml(rationale)}</span><div class="v106-dx-badges">${safety}<span class="v106-dx-badge">${escapeHtml(tr('Clinician review required', 'تتطلب مراجعة الطبيب'))}</span></div></div><button type="button" class="secondary-button compact-button" data-action="add-suggestion-diagnosis" data-label="${escapeHtml(item.label)}">${escapeHtml(tr('Add', 'إضافة'))}</button></div>`;
    }).join('');
    body.innerHTML = `<div id="v106DifferentialPanel"><div class="v106-dx-note"><strong>${escapeHtml(tr('Relative ranking only — not a calibrated probability.', 'ترتيب نسبي فقط وليس احتمالًا رقميًا معايرًا.'))}</strong> ${escapeHtml(tr('The clinician must confirm the diagnosis and separately review all time-critical and must-not-miss conditions. Colour reflects estimated relative likelihood, not severity.', 'يجب على الطبيب تأكيد التشخيص ومراجعة جميع الحالات الحرجة والتشخيصات التي يجب عدم تفويتها بصورة منفصلة. اللون يعكس الاحتمال النسبي المقدر وليس شدة الحالة.'))}</div>${rows ? `<div class="v106-dx-list">${rows}</div>` : `<div class="v106-empty">${escapeHtml(tr('Add or confirm a clinical complaint to generate a ranked differential.', 'أضف أو أكد شكوى سريرية لإنشاء التشخيصات التفريقية المرتبة.'))}</div>`}</div>`;
  }

  function hideDuplicateAllergyQuestions() {
    document.querySelectorAll('[data-question-id="q_allergies_known"], [data-question-id="q_allergy_details"]').forEach(node => {
      const card = node.closest('.card,.question-card,.field') || node;
      card.classList.add('v106-hidden-field');
    });
  }

  function onPatientInteraction(event) {
    const form = event.target?.closest?.('#patientForm');
    if (!form) return;
    const sexControl = event.target.closest('input[type="radio"][name="sexAtBirth"]');
    if (sexControl) window.setTimeout(() => {
      refreshPregnancyState(form);
      const lnmp = form.querySelector('#v106Lnmp');
      if (lnmp) lnmp.dispatchEvent(new Event('change', { bubbles: true }));
    }, 0);
  }

  document.addEventListener('click', onPatientInteraction, true);
  document.addEventListener('change', onPatientInteraction, true);
  document.addEventListener('submit', event => { if (event.target?.id === 'patientForm') syncPatientForm(event.target); }, true);
  const observer = new MutationObserver(() => { installPatientEnhancements(); hideDuplicateAllergyQuestions(); renderDifferentials(); });
  observer.observe(document.documentElement, { childList: true, subtree: true });

  function initialize() {
    installStyles();
    installPatientEnhancements();
    hideDuplicateAllergyQuestions();
    renderDifferentials();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initialize, { once: true });
  else initialize();

  globalThis.__UFCopilotClinicalUxV106 = Object.freeze({ version: VERSION, calculateAge, calculateGestation, rankDifferentials, refresh: initialize });
})();
