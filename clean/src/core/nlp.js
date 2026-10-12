// Offline natural-language intake (English + Arabic). Deterministic pattern extraction — no cloud AI.
// Output is a PROPOSAL: nothing is written to the case until the clinician confirms it.

const AR_DIGITS = { '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4', '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9' };
const normalise = (t) => String(t ?? '').replace(/[٠-٩]/g, (d) => AR_DIGITS[d]).replace(/\s+/g, ' ').trim();
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const isArabic = (s) => /[؀-ۿ]/.test(s);

/** Is the match at `idx` negated by a nearby preceding word ("no", "denies", "without", "لا", "بدون", "ينفي")? */
function negatedAt(text, idx) {
  const before = text.slice(Math.max(0, idx - 28), idx).toLowerCase();
  return /\b(no|not|denies|denied|without|negative for|non-?)\s*(?:\w+\s*){0,2}$/.test(before) || /(لا يوجد|لا|بدون|ينفي|ليس لديه|ليس)\s*\S*\s*$/.test(before);
}

function find(text, patterns) {
  for (const p of patterns) {
    const re = typeof p === 'string' ? (isArabic(p) ? new RegExp(esc(p)) : new RegExp(`\\b${esc(p)}\\b`, 'i')) : p;
    const m = re.exec(text);
    if (m) return { index: m.index, match: m[0], groups: m };
  }
  return null;
}

const YESNO = [
  ['pmh.diabetes', ['diabetic', 'diabetes', 'dm', 't2dm', 't1dm', 'iddm', 'niddm', 'سكري', 'السكر']],
  ['pmh.hypertension', ['hypertensive', 'hypertension', 'htn', 'ارتفاع ضغط', 'ضغط مرتفع', 'مريض ضغط']],
  ['pmh.hyperlipidaemia', ['hyperlipidaemia', 'hyperlipidemia', 'dyslipidaemia', 'dyslipidemia', 'high cholesterol', 'كوليسترول']],
  ['pmh.cad_known', ['ischaemic heart disease', 'ischemic heart disease', 'ihd', 'cad', 'previous mi', 'prior mi', 'old mi', 'stent', 'pci', 'cabg', 'جلطة قلب سابقة', 'دعامة', 'قسطرة سابقة']],
  ['pmh.heart_failure', ['heart failure', 'chf', 'hfref', 'hfpef', 'فشل قلب', 'ضعف عضلة القلب']],
  ['pmh.chronic_lung_disease', ['copd', 'asthma', 'asthmatic', 'emphysema', 'ild', 'ربو', 'انسداد رئوي']],
  ['pmh.renal_disease', ['ckd', 'chronic kidney disease', 'renal failure', 'dialysis', 'esrd', 'فشل كلوي', 'غسيل كلى']],
  ['pmh.liver_disease', ['cirrhosis', 'chronic liver disease', 'تليف كبد']],
  ['pmh.stroke_tia', ['previous stroke', 'prior stroke', 'old stroke', 'tia', 'سكتة دماغية سابقة', 'جلطة دماغية سابقة']],
  ['pmh.prior_vte', ['previous dvt', 'prior dvt', 'previous pe', 'prior pe', 'history of dvt', 'history of pe']],
  ['pmh.active_cancer', ['active cancer', 'on chemotherapy', 'metastatic', 'سرطان نشط', 'علاج كيماوي']],
  ['meds.anticoagulant', ['warfarin', 'apixaban', 'rivaroxaban', 'dabigatran', 'edoxaban', 'anticoagulant', 'anticoagulated', 'clopidogrel', 'ticagrelor', 'مميع', 'سيولة']],
  ['meds.beta_blocker', ['beta-blocker', 'beta blocker', 'bisoprolol', 'metoprolol', 'atenolol', 'carvedilol', 'propranolol']],
  ['sx.diaphoresis', ['sweating', 'sweaty', 'diaphoretic', 'diaphoresis', 'تعرق', 'عرق']],
  ['sx.nausea', ['nausea', 'nauseated', 'nauseous', 'غثيان']],
  ['sx.syncope', ['syncope', 'fainted', 'passed out', 'collapse', 'collapsed', 'إغماء', 'أغمي']],
  ['sx.fever', ['fever', 'febrile', 'pyrexia', 'حمى', 'سخونة']],
  ['sx.cough', ['cough', 'coughing', 'سعال', 'كحة']],
  ['sx.haemoptysis', ['haemoptysis', 'hemoptysis', 'coughing blood', 'سعال دموي']],
  ['sx.neck_stiffness', ['neck stiffness', 'stiff neck', 'تيبس الرقبة']],
  ['sx.focal_weakness', ['weakness of', 'hemiparesis', 'facial droop', 'slurred speech', 'ضعف في', 'شلل']],
  ['sx.vomiting', ['vomiting', 'vomited', 'vomit', 'emesis', 'قيء', 'استفراغ', 'ترجيع']],
  ['sx.dyspnea', ['shortness of breath', 'short of breath', 'sob', 'breathless', 'dyspnoea', 'dyspnea', 'ضيق تنفس', 'ضيق في التنفس', 'نهجان']],
];
// symptoms that are also complaints: when another complaint is present they become associated symptoms
const COMPLAINT_AS_SYMPTOM = { vomiting: 'sx.vomiting', syncope: 'sx.syncope', fever: 'sx.fever' };

const UNIT = { min: 'min', mins: 'min', minute: 'min', minutes: 'min', m: 'min', hour: 'hour', hours: 'hour', hr: 'hour', hrs: 'hour', h: 'hour', day: 'day', days: 'day', d: 'day', week: 'week', weeks: 'week', wk: 'week', wks: 'week',
  'دقيقة': 'min', 'دقائق': 'min', 'ساعة': 'hour', 'ساعات': 'hour', 'يوم': 'day', 'أيام': 'day', 'ايام': 'day', 'أسبوع': 'week', 'اسبوع': 'week', 'أسابيع': 'week' };

/**
 * @returns {{ age?:number, sex?:'male'|'female', complaints:string[], facts:Record<string, any> }}
 */
export function parseIntake(raw, pack) {
  const text = normalise(raw);
  const low = text.toLowerCase();
  const out = { complaints: [], facts: {} };
  if (!text) return out;

  // ---- age
  const ageM = /(\d{1,3}(?:\.\d)?)\s*(?:-|\s)?(?:years?|yrs?|y)(?:[-\s]?old|\/o)?\b/i.exec(text) || /\b(\d{1,3})\s*(?:yo|y\/o)\b/i.exec(text)
    || /\b(\d{1,3})\s?([MF])\b/.exec(text) || /(\d{1,3})\s*(?:سنة|سنه|عام|عاما|عاماً)/.exec(text) || /عمره?ا?\s*(\d{1,3})/.exec(text);
  if (ageM) { const a = Number(ageM[1]); if (a >= 0 && a <= 120) out.age = a; }

  // ---- sex
  const mf = /\b\d{1,3}\s?([MF])\b/.exec(text);
  if (mf) out.sex = mf[1].toLowerCase() === 'm' ? 'male' : 'female';
  else if (/\b(female|woman|lady|girl)\b/i.test(text) || /(أنثى|امرأة|سيدة|فتاة|بنت|مريضة)/.test(text)) out.sex = 'female';
  else if (/\b(male|man|gentleman|boy)\b/i.test(text) || /(ذكر|رجل|شاب)/.test(text)) out.sex = 'male';

  // ---- complaints from pack synonyms
  for (const c of pack.complaints) {
    const hit = find(text, c.synonyms.filter((s) => s.length > 2 || isArabic(s)));
    if (hit && !negatedAt(text, hit.index)) out.complaints.push({ key: c.key, at: hit.index });
  }
  out.complaints.sort((a, b) => a.at - b.at);
  let complaints = out.complaints.map((x) => x.key);
  if (complaints.length > 1) {
    const primary = complaints[0];
    complaints = complaints.filter((k) => k === primary || !COMPLAINT_AS_SYMPTOM[k]);
  }
  out.complaints = complaints;

  // ---- yes/no facts with negation
  for (const [key, pats] of YESNO) {
    const hit = find(text, pats);
    if (hit) out.facts[key] = negatedAt(text, hit.index) ? 'no' : 'yes';
  }
  const SYMPTOM_OF = { ...COMPLAINT_AS_SYMPTOM, dyspnea: 'sx.dyspnea' };
  for (const k of complaints) { const sx = SYMPTOM_OF[k]; if (sx) delete out.facts[sx]; }
  if (/\b(ex-?smoker|former smoker|quit smoking)\b/i.test(text) || /مدخن سابق/.test(text)) out.facts['social.smoking'] = 'ex';
  else if (/\b(non-?smoker|never smoked|does not smoke)\b/i.test(text) || /(غير مدخن|لا يدخن)/.test(text)) out.facts['social.smoking'] = 'never';
  else if (/\b(smoker|smokes|smoking)\b/i.test(text) || /(مدخن|يدخن)/.test(text)) out.facts['social.smoking'] = 'current';
  if (/\b(nkda|no known (drug )?allerg(y|ies))\b/i.test(text) || /لا توجد حساسية/.test(text)) out.facts['allergy.status'] = 'none';
  const allergic = /\ballergic to ([a-z ]{3,30}?)(?:[,.;]|\band\b|$)/i.exec(text) || /حساسية من ([؀-ۿ ]{2,30})/.exec(text);
  if (allergic && !out.facts['allergy.status']) { out.facts['allergy.status'] = 'yes'; out.facts['allergy.status.detail'] = allergic[1].trim(); }
  if (/\bnot pregnant\b/i.test(text) || /غير حامل/.test(text)) out.facts['preg.status'] = 'no';
  else if (/\bpregnant\b/i.test(text) || /حامل/.test(text)) out.facts['preg.status'] = 'yes';

  // ---- primary complaint details
  const primary = complaints[0];
  const qFor = (role) => pack.questions.find((q) => q.role === role && q.fact.startsWith(`hx.${primary}.`));
  if (primary) {
    const dur = /(?:for|since|x|over the (?:last|past))\s*(\d+(?:\.\d+)?)\s*(minutes?|mins?|hours?|hrs?|h|days?|d|weeks?|wks?)\b/i.exec(text)
      || /(\d+(?:\.\d+)?)\s*(minutes?|mins?|hours?|hrs?|days?|weeks?)\s*(?:ago|duration|history)/i.exec(text)
      || /منذ\s*(\d+)\s*(دقيقة|دقائق|ساعة|ساعات|يوم|أيام|ايام|أسبوع|اسبوع|أسابيع)/.exec(text);
    const twoAr = /منذ\s*(ساعتين|يومين|أسبوعين)/.exec(text);
    const qd = qFor('duration');
    if (qd && dur) { const u = UNIT[dur[2].toLowerCase()] ?? UNIT[dur[2]]; if (u) out.facts[qd.fact] = { n: Number(dur[1]), unit: u }; }
    else if (qd && twoAr) out.facts[qd.fact] = { n: 2, unit: { 'ساعتين': 'hour', 'يومين': 'day', 'أسبوعين': 'week' }[twoAr[1]] };
    const pain = /\b(\d{1,2})\s*\/\s*10\b/.exec(text);
    const qp = qFor('score');
    if (qp && pain && Number(pain[1]) <= 10) out.facts[qp.fact] = Number(pain[1]);
    for (const role of ['character', 'location', 'radiation', 'onset']) {
      const q = qFor(role);
      if (!q?.options) continue;
      const WORDS = { crushing: ['crushing', 'heavy', 'ساحق', 'ثقل'], pressure: ['pressure', 'tight', 'tightness', 'squeezing', 'ضغط'], sharp: ['sharp', 'stabbing', 'حاد'], pleuritic: ['pleuritic', 'worse on breathing', 'worse with inspiration'], burning: ['burning', 'حرقان'],
        central: ['central', 'retrosternal', 'منتصف الصدر'], epigastric: ['epigastric', 'فم المعدة'], left_arm: ['left arm', 'الذراع الأيسر', 'الكتف الأيسر'], jaw: ['jaw', 'الفك'], back: ['to the back', 'into the back', 'radiating to back', 'الظهر'],
        sudden: ['sudden', 'abrupt', 'مفاجئ'], gradual: ['gradual', 'تدريجي'] };
      for (const o of q.options) {
        const words = WORDS[o.v];
        if (!words) continue;
        const hit = find(text, words);
        if (hit && !negatedAt(text, hit.index)) { out.facts[q.fact] = o.v; break; }
      }
    }
  }

  // ---- vital signs written in the text
  const bp = /\b(?:bp|blood pressure|الضغط)\s*:?\s*(\d{2,3})\s*\/\s*(\d{2,3})/i.exec(text);
  if (bp) { out.facts['vitals.sbp'] = Number(bp[1]); out.facts['vitals.dbp'] = Number(bp[2]); }
  const num = (re, key) => { const m = re.exec(text); if (m) out.facts[key] = Number(m[1]); };
  num(/\b(?:hr|pulse|heart rate|النبض)\s*:?\s*(\d{2,3})\b/i, 'vitals.hr');
  num(/\b(?:rr|resp(?:iratory)? rate)\s*:?\s*(\d{1,2})\b/i, 'vitals.rr');
  num(/\b(?:spo2|sats?|saturation|o2 sat)\s*:?\s*(\d{2,3})\s*%?/i, 'vitals.spo2');
  num(/\b(?:temp|temperature|t)\s*:?\s*(\d{2}(?:\.\d)?)\s*(?:°?c)?\b/i, 'vitals.temp');
  const gcs = /\bE\s*([1-4])\s*V\s*([1-5])\s*M\s*([1-6])\b/i.exec(text);
  if (gcs) { out.facts['gcs.e'] = Number(gcs[1]); out.facts['gcs.v'] = Number(gcs[2]); out.facts['gcs.m'] = Number(gcs[3]); }
  void low;
  return out;
}
