(() => {
  'use strict';

  const VERSION = '1.0.4';
  const STORAGE_LANGUAGE = 'ufcai_v104_voice_language';
  const STORAGE_CUSTOM = 'ufcai_v104_voice_custom_language';
  const groups = [
    ['recommended', 'Recommended', 'الخيارات الموصى بها'],
    ['arabic', 'Arabic dialects', 'اللهجات العربية'],
    ['english', 'English', 'الإنجليزية'],
    ['southAsia', 'South Asian languages', 'لغات جنوب آسيا'],
    ['philippines', 'Philippines', 'الفلبين'],
    ['international', 'Other common languages', 'لغات شائعة أخرى'],
    ['advanced', 'Advanced', 'خيارات متقدمة']
  ];
  const languages = [
    ['auto','recommended','Automatic — device language','تلقائي — حسب لغة الجهاز'],
    ['ar-SA','arabic','Arabic — Saudi Arabia','العربية — السعودية'],
    ['ar-EG','arabic','Arabic — Egypt','العربية — مصر'],
    ['ar-AE','arabic','Arabic — United Arab Emirates / Gulf','العربية — الإمارات / الخليج'],
    ['ar-KW','arabic','Arabic — Kuwait','العربية — الكويت'],
    ['ar-QA','arabic','Arabic — Qatar','العربية — قطر'],
    ['ar-BH','arabic','Arabic — Bahrain','العربية — البحرين'],
    ['ar-OM','arabic','Arabic — Oman','العربية — عُمان'],
    ['ar-IQ','arabic','Arabic — Iraq','العربية — العراق'],
    ['ar-JO','arabic','Arabic — Jordan','العربية — الأردن'],
    ['ar-PS','arabic','Arabic — Palestine','العربية — فلسطين'],
    ['ar-LB','arabic','Arabic — Lebanon','العربية — لبنان'],
    ['ar-SY','arabic','Arabic — Syria','العربية — سوريا'],
    ['ar-YE','arabic','Arabic — Yemen','العربية — اليمن'],
    ['ar-SD','arabic','Arabic — Sudan','العربية — السودان'],
    ['ar-LY','arabic','Arabic — Libya','العربية — ليبيا'],
    ['ar-TN','arabic','Arabic — Tunisia','العربية — تونس'],
    ['ar-DZ','arabic','Arabic — Algeria','العربية — الجزائر'],
    ['ar-MA','arabic','Arabic — Morocco','العربية — المغرب'],
    ['en-GB','english','English — United Kingdom','الإنجليزية — المملكة المتحدة'],
    ['en-US','english','English — United States','الإنجليزية — الولايات المتحدة'],
    ['en-IN','english','English — India','الإنجليزية — الهند'],
    ['en-PH','english','English — Philippines','الإنجليزية — الفلبين'],
    ['en-AU','english','English — Australia','الإنجليزية — أستراليا'],
    ['en-CA','english','English — Canada','الإنجليزية — كندا'],
    ['hi-IN','southAsia','Hindi — India','الهندية — الهند'],
    ['bn-BD','southAsia','Bengali — Bangladesh','البنغالية — بنغلاديش'],
    ['bn-IN','southAsia','Bengali — India','البنغالية — الهند'],
    ['ur-PK','southAsia','Urdu — Pakistan','الأوردو — باكستان'],
    ['ur-IN','southAsia','Urdu — India','الأوردو — الهند'],
    ['ta-IN','southAsia','Tamil — India','التاميلية — الهند'],
    ['ml-IN','southAsia','Malayalam — India','المالايالامية — الهند'],
    ['te-IN','southAsia','Telugu — India','التيلوغوية — الهند'],
    ['kn-IN','southAsia','Kannada — India','الكانادية — الهند'],
    ['mr-IN','southAsia','Marathi — India','الماراثية — الهند'],
    ['gu-IN','southAsia','Gujarati — India','الغوجاراتية — الهند'],
    ['pa-IN','southAsia','Punjabi — India','البنجابية — الهند'],
    ['ne-NP','southAsia','Nepali — Nepal','النيبالية — نيبال'],
    ['si-LK','southAsia','Sinhala — Sri Lanka','السنهالية — سريلانكا'],
    ['fil-PH','philippines','Filipino / Tagalog — Philippines','الفلبينية / التاغالوغ — الفلبين'],
    ['tl-PH','philippines','Tagalog — Philippines (alternative code)','التاغالوغ — الفلبين (رمز بديل)'],
    ['fr-FR','international','French — France','الفرنسية — فرنسا'],
    ['es-ES','international','Spanish — Spain','الإسبانية — إسبانيا'],
    ['de-DE','international','German — Germany','الألمانية — ألمانيا'],
    ['it-IT','international','Italian — Italy','الإيطالية — إيطاليا'],
    ['pt-BR','international','Portuguese — Brazil','البرتغالية — البرازيل'],
    ['tr-TR','international','Turkish — Türkiye','التركية — تركيا'],
    ['ru-RU','international','Russian — Russia','الروسية — روسيا'],
    ['zh-CN','international','Chinese (Mandarin) — China','الصينية (الماندرين) — الصين'],
    ['ja-JP','international','Japanese — Japan','اليابانية — اليابان'],
    ['ko-KR','international','Korean — South Korea','الكورية — كوريا الجنوبية'],
    ['id-ID','international','Indonesian — Indonesia','الإندونيسية — إندونيسيا'],
    ['ms-MY','international','Malay — Malaysia','الملايوية — ماليزيا'],
    ['th-TH','international','Thai — Thailand','التايلاندية — تايلاند'],
    ['vi-VN','international','Vietnamese — Vietnam','الفيتنامية — فيتنام'],
    ['sw-KE','international','Swahili — Kenya','السواحيلية — كينيا'],
    ['custom','advanced','Other device-supported language code','لغة أخرى يدعمها الجهاز']
  ];

  let activeRecognition = null;
  const memorySettings = new Map();
  const safeStorage = (() => {
    try {
      localStorage.setItem('__ufcai_voice_probe__', '1');
      localStorage.removeItem('__ufcai_voice_probe__');
      return localStorage;
    } catch (_) { return null; }
  })();

  const isArabicUi = () => document.documentElement.dir === 'rtl' || document.documentElement.lang === 'ar';
  const read = (key, fallback) => {
    try {
      if (safeStorage) {
        const stored = safeStorage.getItem(key);
        if (stored !== null && stored !== '') return stored;
      }
    } catch (_) { /* use memory fallback */ }
    return memorySettings.has(key) ? memorySettings.get(key) : fallback;
  };
  const write = (key, value) => {
    memorySettings.set(key, String(value || ''));
    try { if (safeStorage) safeStorage.setItem(key, String(value || '')); } catch (_) { /* memory-only fallback */ }
  };
  const canonical = value => {
    const raw = String(value || '').trim().replace(/_/g, '-');
    if (!/^[A-Za-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/.test(raw)) return '';
    try { return Intl.getCanonicalLocales(raw)[0] || raw; } catch (_) { return ''; }
  };
  const languageExists = code => languages.some(item => item[0] === code);
  const selectedLanguage = () => {
    const saved = read(STORAGE_LANGUAGE, 'auto');
    return languageExists(saved) ? saved : 'auto';
  };
  const effectiveLanguage = () => {
    const selected = selectedLanguage();
    if (selected === 'custom') return canonical(read(STORAGE_CUSTOM, '')) || (isArabicUi() ? 'ar-SA' : 'en-GB');
    if (selected !== 'auto') return selected;
    return canonical((navigator.languages && navigator.languages[0]) || navigator.language) || (isArabicUi() ? 'ar-SA' : 'en-GB');
  };
  const labelFor = code => {
    const item = languages.find(entry => entry[0] === code) || languages[0];
    return (isArabicUi() ? item[3] : item[2]) + ((code === 'auto' || code === 'custom') ? '' : ` (${code})`);
  };

  function notify(type, message) {
    const region = document.getElementById('toastRegion');
    if (!region) { console[type === 'error' ? 'error' : 'log'](message); return; }
    const toast = document.createElement('div');
    toast.className = `toast ${type || 'info'}`;
    toast.innerHTML = `<div><strong>${isArabicUi() ? (type === 'error' ? 'خطأ' : 'معلومة') : (type === 'error' ? 'Error' : 'Info')}</strong><span></span></div>`;
    toast.querySelector('span').textContent = message;
    region.appendChild(toast);
    setTimeout(() => toast.remove(), 6500);
  }

  function installStyles() {
    if (document.getElementById('v104VoiceStyles')) return;
    const style = document.createElement('style');
    style.id = 'v104VoiceStyles';
    style.textContent = `
      #v104VoicePanel{display:grid;gap:12px;margin:0 0 14px;padding:14px;border:1px solid var(--line,#dce6f1);border-radius:14px;background:var(--surface-soft,#f8fbff)}
      #v104VoicePanel .v104-head{display:flex;gap:10px;align-items:flex-start}.v104-title{display:grid;gap:3px}.v104-title strong{font-size:.82rem}.v104-title span,.v104-help{font-size:.68rem;color:var(--ink-soft,#51677f);line-height:1.5}
      #v104VoicePanel .v104-controls{display:grid;grid-template-columns:minmax(0,1fr) minmax(180px,.7fr);gap:10px;align-items:end}#v104VoicePanel label{display:grid;gap:6px}#v104VoicePanel label>span{font-size:.68rem;font-weight:800;color:var(--ink-soft,#51677f)}
      #v104VoicePanel select,#v104VoicePanel input{width:100%;min-height:44px;border:1px solid var(--line-strong,#c6d6e8);border-radius:11px;background:var(--surface,#fff);color:var(--ink,#10243e);padding:9px 11px;font:inherit}
      #v104VoicePanel select:focus,#v104VoicePanel input:focus{outline:none;border-color:var(--brand,#0b5fff);box-shadow:0 0 0 4px rgba(11,95,255,.18)}.v104-hidden{display:none!important}.v104-listening{border-color:var(--danger,#bd1732)!important;color:var(--danger,#bd1732)!important}
      @media(max-width:700px){#v104VoicePanel .v104-controls{grid-template-columns:1fr}}
    `;
    document.head.appendChild(style);
  }

  function installSelector() {
    installStyles();
    const textarea = document.getElementById('presentationText');
    const form = textarea && textarea.closest('form[data-form="presentation"]');
    if (!form || document.getElementById('v104VoicePanel')) return;

    const ar = isArabicUi();
    const panel = document.createElement('section');
    panel.id = 'v104VoicePanel';
    panel.setAttribute('aria-label', ar ? 'لغة ولهجة الإملاء الصوتي' : 'Dictation language and dialect');

    const head = document.createElement('div');
    head.className = 'v104-head';
    head.innerHTML = `<div class="v104-title"><strong>${ar ? 'لغة ولهجة الإملاء الصوتي' : 'Dictation language and dialect'}</strong><span>${ar ? 'مستقلة عن لغة واجهة البرنامج، وتُحفظ على هذا الجهاز.' : 'Independent of the app interface language and saved on this device.'}</span></div>`;
    panel.appendChild(head);

    const controls = document.createElement('div');
    controls.className = 'v104-controls';
    const mainLabel = document.createElement('label');
    mainLabel.innerHTML = `<span>${ar ? 'اختر اللغة أو اللهجة' : 'Choose language or dialect'}</span>`;
    const select = document.createElement('select');
    select.id = 'voiceLanguageSelect';
    groups.forEach(group => {
      const optgroup = document.createElement('optgroup');
      optgroup.label = ar ? group[2] : group[1];
      languages.filter(item => item[1] === group[0]).forEach(item => {
        const option = document.createElement('option');
        option.value = item[0];
        option.textContent = `${ar ? item[3] : item[2]}${item[0] === 'auto' || item[0] === 'custom' ? '' : ` — ${item[0]}`}`;
        optgroup.appendChild(option);
      });
      select.appendChild(optgroup);
    });
    select.value = selectedLanguage();
    mainLabel.appendChild(select);
    controls.appendChild(mainLabel);

    const customLabel = document.createElement('label');
    customLabel.id = 'voiceCustomLanguageField';
    customLabel.className = select.value === 'custom' ? '' : 'v104-hidden';
    customLabel.innerHTML = `<span>${ar ? 'رمز اللغة BCP-47' : 'BCP-47 language code'}</span>`;
    const custom = document.createElement('input');
    custom.id = 'voiceCustomLanguage';
    custom.placeholder = 'ar-SA / fr-CA / fa-IR';
    custom.value = read(STORAGE_CUSTOM, '');
    custom.autocomplete = 'off';
    custom.spellcheck = false;
    customLabel.appendChild(custom);
    controls.appendChild(customLabel);
    panel.appendChild(controls);

    const help = document.createElement('div');
    help.className = 'v104-help';
    const refreshHelp = () => {
      help.textContent = `${ar ? 'لغة الاستماع الفعلية' : 'Effective listening language'}: ${effectiveLanguage()}. ${ar ? 'الإتاحة ودقة اللهجة تعتمد على Chrome ومحرك التعرف في الجهاز. يُحفظ النص بأي لغة، بينما الاستخراج المنظم يعمل بأفضل صورة بالعربية والإنجليزية.' : 'Availability and dialect accuracy depend on Chrome and the device speech engine. Text is preserved in any language; structured extraction works best in Arabic and English.'}`;
    };
    refreshHelp();
    panel.appendChild(help);

    select.addEventListener('change', () => {
      write(STORAGE_LANGUAGE, select.value);
      customLabel.classList.toggle('v104-hidden', select.value !== 'custom');
      refreshHelp();
      notify('success', `${ar ? 'لغة الإملاء' : 'Dictation language'}: ${labelFor(select.value)}`);
      if (select.value === 'custom') custom.focus();
    });
    custom.addEventListener('change', () => {
      const code = canonical(custom.value);
      if (custom.value.trim() && !code) {
        custom.setAttribute('aria-invalid', 'true');
        notify('error', ar ? 'رمز اللغة غير صحيح. استخدم صيغة مثل ar-SA أو fr-CA.' : 'Invalid language code. Use a format such as ar-SA or fr-CA.');
        return;
      }
      custom.value = code;
      custom.removeAttribute('aria-invalid');
      write(STORAGE_CUSTOM, code);
      refreshHelp();
    });

    form.parentNode.insertBefore(panel, form);
    textarea.setAttribute('dir', 'auto');
  }

  function setListening(listening) {
    document.querySelectorAll('[data-action="voice-input"]').forEach(button => {
      button.classList.toggle('v104-listening', listening);
      button.setAttribute('aria-pressed', String(listening));
    });
  }

  function dictate() {
    if (activeRecognition) {
      try { activeRecognition.stop(); } catch (_) { /* already stopping */ }
      return;
    }
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition || location.protocol === 'file:' || location.protocol === 'content:' || !window.isSecureContext) {
      const textarea = document.getElementById('presentationText');
      if (textarea) textarea.focus();
      notify('error', isArabicUi() ? 'افتح البرنامج من رابط HTTPS في Chrome لتفعيل الميكروفون، أو استخدم ميكروفون لوحة المفاتيح.' : 'Open the app over HTTPS in Chrome to enable the microphone, or use the keyboard microphone.');
      return;
    }
    const selected = selectedLanguage();
    if (selected === 'custom' && !canonical(read(STORAGE_CUSTOM, ''))) {
      const custom = document.getElementById('voiceCustomLanguage');
      if (custom) custom.focus();
      notify('error', isArabicUi() ? 'أدخل رمز لغة صحيحًا مثل ar-SA أو fr-CA.' : 'Enter a valid language code such as ar-SA or fr-CA.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = effectiveLanguage();
    recognition.interimResults = false;
    recognition.continuous = false;
    recognition.maxAlternatives = 3;
    activeRecognition = recognition;
    recognition.onstart = () => {
      setListening(true);
      notify('info', `${isArabicUi() ? 'الاستماع مفعل الآن' : 'Listening now'}: ${labelFor(selected)}`);
    };
    recognition.onresult = event => {
      const parts = [];
      for (let index = event.resultIndex || 0; event.results && index < event.results.length; index += 1) {
        const result = event.results[index];
        if (result && result[0] && result[0].transcript) parts.push(result[0].transcript.trim());
      }
      const transcript = parts.join(' ').trim();
      const textarea = document.getElementById('presentationText');
      if (!transcript || !textarea) return;
      const existing = textarea.value.trim();
      textarea.value = existing ? `${existing}${/[.!?؟،,;:]$/.test(existing) ? ' ' : '. '}${transcript}` : transcript;
      textarea.setAttribute('dir', 'auto');
      textarea.dispatchEvent(new Event('input', { bubbles: true }));
      setTimeout(() => {
        const form = textarea.closest('form[data-form="presentation"]');
        if (form && typeof form.requestSubmit === 'function') form.requestSubmit();
      }, 0);
    };
    recognition.onerror = event => {
      const code = String(event && event.error || '');
      const messages = {
        'not-allowed': isArabicUi() ? 'تم رفض إذن الميكروفون. اسمح به من إعدادات الموقع في Chrome.' : 'Microphone permission was denied. Allow it in Chrome site settings.',
        'service-not-allowed': isArabicUi() ? 'خدمة التعرف الصوتي غير مسموح بها في المتصفح.' : 'The browser did not allow the speech service.',
        'no-speech': isArabicUi() ? 'لم يتم التقاط كلام. حاول مرة أخرى.' : 'No speech was detected. Try again.',
        'audio-capture': isArabicUi() ? 'تعذر الوصول إلى ميكروفون الجهاز.' : 'The device microphone could not be accessed.',
        'language-not-supported': isArabicUi() ? 'الجهاز لا يدعم اللغة المختارة. اختر لهجة قريبة أو تلقائي.' : 'The device does not support the selected language. Choose a nearby dialect or Automatic.',
        'network': isArabicUi() ? 'خدمة التعرف الصوتي تحتاج اتصالًا بالشبكة على هذا الجهاز.' : 'The speech service needs a network connection on this device.'
      };
      if (code !== 'aborted') notify('error', messages[code] || `${isArabicUi() ? 'تعذر الإدخال الصوتي' : 'Voice input failed'}${code ? `: ${code}` : ''}`);
    };
    recognition.onend = () => {
      if (activeRecognition === recognition) activeRecognition = null;
      setListening(false);
    };
    try { recognition.start(); }
    catch (error) {
      activeRecognition = null;
      setListening(false);
      notify('error', error && error.message ? error.message : (isArabicUi() ? 'تعذر بدء الإدخال الصوتي.' : 'Voice input could not be started.'));
    }
  }

  document.addEventListener('click', event => {
    const button = event.target.closest && event.target.closest('[data-action="voice-input"]');
    if (!button) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    dictate();
  }, true);

  const observer = new MutationObserver(() => installSelector());
  observer.observe(document.documentElement, { childList: true, subtree: true });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', installSelector, { once: true });
  else installSelector();
  window.__UFCopilotVoiceV104 = Object.freeze({ version: VERSION, selectedLanguage, effectiveLanguage });
})();
