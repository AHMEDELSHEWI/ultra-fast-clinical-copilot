(() => {
  'use strict';

  const VERSION = '1.0.8';
  const FLOW = [
    { route: 'patient', en: 'Patient', ar: 'المريض', icon: 'patient' },
    { route: 'complaints', en: 'Complaint', ar: 'الشكوى', icon: 'complaint' },
    { route: 'assessment', en: 'History', ar: 'التاريخ', icon: 'history' },
    { route: 'vitals', en: 'Exam', ar: 'الفحص', icon: 'exam' },
    { route: 'investigations', en: 'Tests', ar: 'الفحوصات', icon: 'lab' },
    { route: 'reasoning', en: 'Reason', ar: 'التحليل', icon: 'brain' },
    { route: 'treatment', en: 'Treat', ar: 'العلاج', icon: 'medication' },
    { route: 'procedures', en: 'Procedure', ar: 'الإجراءات', icon: 'procedure' },
    { route: 'disposition', en: 'Dispo', ar: 'القرار', icon: 'disposition' },
    { route: 'documentation', en: 'Note', ar: 'التوثيق', icon: 'document' }
  ];

  const NAV = [
    { route: 'dashboard', en: 'Home', ar: 'الرئيسية', icon: 'home' },
    ...FLOW,
    { route: 'timeline', en: 'Timeline', ar: 'الخط الزمني', icon: 'timeline', more: true },
    { route: 'calculators', en: 'Calculators', ar: 'الحاسبات', icon: 'calculator', more: true },
    { route: 'library', en: 'Cases', ar: 'الحالات', icon: 'folder', more: true },
    { route: 'evidence', en: 'Settings', ar: 'الإعدادات', icon: 'settings', more: true }
  ];

  const state = {
    scheduled: false,
    observer: null,
    route: '',
    examAutoDeferred: new Set(),
    lab: { testId: 'sodium', unit: '', value: '' },
    performance: [],
    shellBuilt: false
  };

  const isArabic = () => document.documentElement.dir === 'rtl' || document.documentElement.lang === 'ar';
  const tr = (en, ar) => isArabic() ? ar : en;
  const route = () => (location.hash || '#dashboard').replace(/^#/, '') || 'dashboard';
  const app = () => globalThis.__UFCopilotApp || null;
  const snapshot = () => {
    try { return app() && typeof app().getSnapshot === 'function' ? app().getSnapshot() : null; }
    catch (_) { return null; }
  };
  const factValue = fact => fact && typeof fact === 'object' && Object.prototype.hasOwnProperty.call(fact, 'value') ? fact.value : (fact == null ? null : fact);
  const esc = value => String(value == null ? '' : value)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  const encode = value => encodeURIComponent(JSON.stringify(value));

  function svg(name, className = '') {
    const paths = {
      home: '<path d="M3 11.5 12 4l9 7.5V21a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z"/>',
      patient: '<circle cx="12" cy="7" r="4"/><path d="M4 22v-2a8 8 0 0 1 16 0v2"/>',
      complaint: '<path d="M4 5h16v11H8l-4 4z"/><path d="M8 9h8M8 13h5"/>',
      history: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
      exam: '<path d="M6 3v6a6 6 0 0 0 12 0V3M9 3v5M15 3v5"/><circle cx="19" cy="17" r="3"/><path d="M12 15v1a5 5 0 0 0 5 5"/>',
      lab: '<path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 2 3h10a2 2 0 0 0 2-3l-5-9V3"/><path d="M8 15h8"/>',
      brain: '<path d="M9 4a3 3 0 0 0-3 3v1a3 3 0 0 0-2 3 3 3 0 0 0 2 3v1a3 3 0 0 0 3 3c1.2 0 2.3-.7 3-1.7.7 1 1.8 1.7 3 1.7a3 3 0 0 0 3-3v-1a3 3 0 0 0 2-3 3 3 0 0 0-2-3V7a3 3 0 0 0-3-3c-1.2 0-2.3.7-3 1.7C11.3 4.7 10.2 4 9 4Z"/><path d="M12 6v12M8 9h4M12 14h4"/>',
      medication: '<path d="m8 3 13 13-5 5L3 8z"/><path d="m6 11 5-5M13 18l5-5"/>',
      procedure: '<path d="M14 4 4 14l6 6L20 10z"/><path d="m13 5 6 6M4 20l4-4"/>',
      disposition: '<path d="M4 12h14M14 7l5 5-5 5"/><path d="M4 5v14"/>',
      document: '<path d="M6 2h8l4 4v16H6z"/><path d="M14 2v5h5M9 12h6M9 16h6"/>',
      timeline: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l4 2"/>',
      calculator: '<rect x="5" y="2" width="14" height="20" rx="2"/><path d="M8 6h8M8 10h2M12 10h2M16 10h1M8 14h2M12 14h2M16 14h1M8 18h2M12 18h5"/>',
      folder: '<path d="M3 6h7l2 2h9v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
      settings: '<circle cx="12" cy="12" r="3"/><path d="M19 12a7 7 0 0 0-.1-1l2-1.5-2-3.4-2.4 1a8 8 0 0 0-1.7-1L14.5 3h-5l-.4 3.1a8 8 0 0 0-1.7 1L5 6.1 3 9.5 5.1 11a7 7 0 0 0 0 2L3 14.5 5 18l2.4-1.1a8 8 0 0 0 1.7 1l.4 3.1h5l.4-3.1a8 8 0 0 0 1.7-1L19 18l2-3.5-2.1-1.5a7 7 0 0 0 .1-1Z"/>',
      back: '<path d="m15 18-6-6 6-6"/>',
      next: '<path d="m9 18 6-6-6-6"/>',
      check: '<path d="m4 12 5 5L20 6"/>',
      alert: '<path d="M12 3 2 21h20z"/><path d="M12 9v5M12 18h.01"/>',
      normal: '<circle cx="12" cy="12" r="9"/><path d="m7 12 3 3 7-7"/>',
      high: '<path d="M12 20V4M6 10l6-6 6 6"/>',
      low: '<path d="M