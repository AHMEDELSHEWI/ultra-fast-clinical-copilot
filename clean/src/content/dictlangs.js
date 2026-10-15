// Dictation languages (BCP 47 tags passed to the browser's speech recogniser).
// Support depends on the browser/OS speech engine: the app checks each language on the device when it can
// (SpeechRecognition.available) and tells the clinician; it never claims support it cannot verify.
export const DICT_GROUPS = Object.freeze([
  { id: 'ar', en: 'Arabic — dialects', ar: 'العربية — اللهجات', langs: [
    ['ar-SA', 'Saudi', 'السعودية'], ['ar-EG', 'Egyptian', 'المصرية'], ['ar-AE', 'Emirati', 'الإماراتية'], ['ar-KW', 'Kuwaiti', 'الكويتية'],
    ['ar-QA', 'Qatari', 'القطرية'], ['ar-BH', 'Bahraini', 'البحرينية'], ['ar-OM', 'Omani', 'العُمانية'], ['ar-YE', 'Yemeni', 'اليمنية'],
    ['ar-IQ', 'Iraqi', 'العراقية'], ['ar-JO', 'Jordanian', 'الأردنية'], ['ar-PS', 'Palestinian', 'الفلسطينية'], ['ar-LB', 'Lebanese', 'اللبنانية'],
    ['ar-SY', 'Syrian', 'السورية'], ['ar-SD', 'Sudanese', 'السودانية'], ['ar-LY', 'Libyan', 'الليبية'], ['ar-TN', 'Tunisian', 'التونسية'],
    ['ar-DZ', 'Algerian', 'الجزائرية'], ['ar-MA', 'Moroccan', 'المغربية'], ['ar-MR', 'Mauritanian', 'الموريتانية']] },
  { id: 'en', en: 'English', ar: 'الإنجليزية', langs: [['en-US', 'English (US)', 'الإنجليزية (أمريكية)'], ['en-GB', 'English (UK)', 'الإنجليزية (بريطانية)'], ['en-IN', 'English (India)', 'الإنجليزية (الهند)'], ['en-PH', 'English (Philippines)', 'الإنجليزية (الفلبين)']] },
  { id: 'asia', en: 'South Asia and the Philippines', ar: 'جنوب آسيا والفلبين', langs: [
    ['bn-BD', 'Bengali (Bangladesh)', 'البنغالية (بنغلاديش)'], ['bn-IN', 'Bengali (India)', 'البنغالية (الهند)'], ['hi-IN', 'Hindi', 'الهندية'],
    ['ur-PK', 'Urdu (Pakistan)', 'الأوردو (باكستان)'], ['ur-IN', 'Urdu (India)', 'الأوردو (الهند)'], ['fil-PH', 'Filipino (Tagalog)', 'الفلبينية (التاغالوغية)'],
    ['ml-IN', 'Malayalam', 'المالايالامية'], ['ta-IN', 'Tamil', 'التاميلية'], ['ne-NP', 'Nepali', 'النيبالية'], ['si-LK', 'Sinhala', 'السنهالية'], ['id-ID', 'Indonesian', 'الإندونيسية']] },
  { id: 'africa', en: 'Ethiopia and East Africa', ar: 'إثيوبيا وشرق أفريقيا', langs: [
    ['am-ET', 'Amharic (Ethiopia)', 'الأمهرية (إثيوبيا)'], ['om-ET', 'Oromo (Ethiopia)', 'الأورومية (إثيوبيا)'], ['ti-ET', 'Tigrinya (Ethiopia)', 'التغرينية (إثيوبيا)'],
    ['so-SO', 'Somali', 'الصومالية'], ['sw-KE', 'Swahili (Kenya)', 'السواحلية (كينيا)'], ['sw-TZ', 'Swahili (Tanzania)', 'السواحلية (تنزانيا)']] },
]);

/** Languages no browser speech engine is known to recognise — shown, disabled, with the reason. */
export const DICT_UNSUPPORTED = Object.freeze([
  { code: 'gdq', en: 'Mehri (Mahri)', ar: 'المهرية',
    why: { en: 'No browser or phone speech engine recognises Mehri. Type it, or use Arabic (Omani / Yemeni) if the patient also speaks Arabic.',
      ar: 'لا يوجد محرك تعرّف صوتي في المتصفحات أو الجوالات يدعم المهرية. اكتبها يدوياً، أو استخدم العربية (العُمانية / اليمنية) إذا كان المريض يتحدث العربية أيضاً.' } },
]);

export const DICT_LANGS = Object.freeze(DICT_GROUPS.flatMap((g) => g.langs.map(([code, en, ar]) => ({ code, en, ar, group: g.id }))));
export const DICT_BY_CODE = Object.freeze(Object.fromEntries(DICT_LANGS.map((l) => [l.code, l])));
