// Shared clinical facts: the reusable building blocks of every presentation and score.
// A fact is asked ONCE and reused by every score, rule, investigation and note section that needs it.
// Content only (no logic). Pending consultant review.
//
// type: yesno | choice | number
// section decides where it appears in the note: pmh, meds, social, family, sx, exam, lab, ecg, judgement
// doc: wording used in documentation. For yes/no facts: noun used as "History of <noun>" / "Denies <noun>" etc.

const yn = (section, en, ar, noun, extra = {}) => ({ type: 'yesno', section, prompt: { en, ar }, noun, ...extra });
const num = (section, en, ar, unit, label, limits, extra = {}) => ({ type: 'number', section, prompt: { en, ar }, unit, label, limits, ...extra });
const ch = (section, en, ar, options, label, extra = {}) => ({ type: 'choice', section, prompt: { en, ar }, options, label, ...extra });

export const FACTS = Object.freeze({
  // ---------- past medical history ----------
  'pmh.diabetes': yn('pmh', 'Diabetes?', 'هل لديه سكري؟', 'diabetes mellitus'),
  'pmh.hypertension': yn('pmh', 'Hypertension?', 'هل لديه ارتفاع ضغط؟', 'hypertension'),
  'pmh.htn_uncontrolled': yn('pmh', 'Uncontrolled hypertension (systolic above 160)?', 'ضغط غير منضبط (انقباضي أعلى من 160)؟', 'uncontrolled hypertension'),
  'pmh.hyperlipidaemia': yn('pmh', 'Known high cholesterol (hyperlipidaemia)?', 'هل لديه ارتفاع كوليسترول معروف؟', 'hyperlipidaemia'),
  'pmh.cad_known': yn('pmh', 'Known coronary artery disease (previous MI, PCI/CABG, or significant stenosis on angiography)?', 'مرض شرايين تاجية معروف (جلطة سابقة، قسطرة/دعامة/تحويلة، أو تضيق مثبت)؟', 'known coronary artery disease'),
  'pmh.stroke_tia': yn('pmh', 'Previous stroke, TIA or systemic thromboembolism?', 'سكتة دماغية أو نوبة إقفارية عابرة أو انصمام سابق؟', 'previous stroke, TIA or thromboembolism'),
  'pmh.pad': yn('pmh', 'Peripheral arterial disease?', 'مرض الشرايين الطرفية؟', 'peripheral arterial disease'),
  'pmh.heart_failure': yn('pmh', 'Heart failure?', 'فشل قلبي؟', 'heart failure'),
  'pmh.heart_disease': yn('pmh', 'Known heart disease (coronary disease, arrhythmia, heart failure or valve disease)?', 'مرض قلبي معروف (شرايين، اضطراب نظم، فشل، صمامات)؟', 'known heart disease'),
  'pmh.chronic_lung_disease': yn('pmh', 'Chronic lung disease (COPD, asthma, ILD)?', 'مرض رئوي مزمن (انسداد رئوي، ربو، تليف)؟', 'chronic lung disease'),
  'pmh.liver_disease': yn('pmh', 'Chronic liver disease or cirrhosis?', 'مرض كبد مزمن أو تليف كبدي؟', 'chronic liver disease'),
  'pmh.renal_disease': yn('pmh', 'Chronic kidney disease, dialysis or kidney transplant?', 'مرض كلى مزمن أو غسيل أو زراعة كلى؟', 'chronic kidney disease'),
  'pmh.active_cancer': yn('pmh', 'Active cancer (treatment within 6 months or palliative)?', 'سرطان نشط (علاج خلال 6 أشهر أو تلطيفي)؟', 'active cancer'),
  'pmh.cancer': yn('pmh', 'History of cancer?', 'هل لديه تاريخ سرطان؟', 'history of cancer'),
  'pmh.prior_vte': yn('pmh', 'Previous DVT or pulmonary embolism?', 'جلطة أوردة عميقة أو انسداد رئوي سابق؟', 'previous venous thromboembolism'),
  'pmh.bleeding_history': yn('pmh', 'Previous major bleeding or bleeding tendency?', 'نزيف كبير سابق أو قابلية للنزيف؟', 'previous major bleeding or bleeding predisposition'),
  'pmh.immunosuppressed': yn('pmh', 'Immunosuppressed (chemotherapy, steroids, transplant, HIV)?', 'ضعف مناعة (كيماوي، كورتيزون، زراعة، HIV)؟', 'immunosuppression'),
  'pmh.obesity': yn('pmh', 'Obesity (BMI above 30)?', 'سمنة (مؤشر كتلة أعلى من 30)؟', 'obesity'),
  'family.premature_cad': yn('family', 'Family history of premature coronary disease?', 'تاريخ عائلي لمرض شرايين تاجية مبكر؟', 'premature coronary artery disease in a first-degree relative'),

  // ---------- medications / social ----------
  'meds.hormone': yn('meds', 'Oestrogen / hormone use (contraceptive pill, HRT)?', 'استخدام هرمونات (حبوب منع حمل، علاج هرموني)؟', 'oestrogen-containing hormone therapy'),
  'meds.aspirin_7d': yn('meds', 'Aspirin taken in the last 7 days?', 'هل تناول أسبرين خلال آخر 7 أيام؟', 'aspirin in the last 7 days'),
  'meds.antiplatelet_nsaid': yn('meds', 'Taking antiplatelets or NSAIDs?', 'هل يتناول مضادات صفائح أو مسكنات NSAIDs؟', 'antiplatelet or NSAID therapy'),
  'meds.labile_inr': yn('meds', 'On warfarin with unstable INR?', 'على الوارفارين مع INR غير مستقر؟', 'labile INR on warfarin'),
  'social.alcohol_excess': yn('social', 'Alcohol excess (8 or more drinks a week)?', 'تعاطي كحول مفرط (8 مشروبات أسبوعياً أو أكثر)؟', 'alcohol excess'),

  // ---------- symptoms / history ----------
  'sx.haemoptysis': yn('sx', 'Coughing blood (haemoptysis)?', 'هل يوجد سعال دموي؟', 'haemoptysis'),
  'sx.unilateral_leg_swelling': yn('sx', 'One leg swollen?', 'تورم في ساق واحدة؟', 'unilateral leg swelling'),
  'sx.melaena': yn('sx', 'Black tarry stools (melaena)?', 'براز أسود قطراني؟', 'melaena'),
  'sx.pleuritic': yn('sx', 'Is the pain worse on breathing in?', 'هل يزيد الألم مع الشهيق؟', 'pleuritic pain'),
  'sx.anorexia': yn('sx', 'Loss of appetite?', 'فقدان الشهية؟', 'anorexia'),
  'sx.pain_migration_rlq': yn('sx', 'Did the pain move to the right lower abdomen?', 'هل انتقل الألم إلى أسفل يمين البطن؟', 'migration of pain to the right iliac fossa'),
  'sx.vomiting_2plus': yn('sx', 'Vomited 2 or more times since the injury?', 'تقيأ مرتين أو أكثر بعد الإصابة؟', 'vomiting on two or more occasions'),
  'hx.chest_pain.episodes_24h': yn('sx', 'Two or more episodes of chest pain in the last 24 hours?', 'نوبتان أو أكثر من ألم الصدر خلال 24 ساعة؟', 'two or more anginal episodes in 24 hours'),
  'hx.recent_surgery_immobilisation': yn('sx', 'Surgery in the last 4 weeks or immobilised 3 days or more?', 'جراحة خلال 4 أسابيع أو عدم حركة 3 أيام أو أكثر؟', 'recent surgery or immobilisation'),
  'hx.recent_trauma_surgery': yn('sx', 'Trauma or surgery needing hospital care in the last 4 weeks?', 'إصابة أو جراحة احتاجت مستشفى خلال 4 أسابيع؟', 'recent trauma or surgery'),
  'hx.bedridden_major_surgery_12w': yn('sx', 'Bedridden 3 days or more, or major surgery in the last 12 weeks?', 'ملازم للفراش 3 أيام أو أكثر، أو جراحة كبرى خلال 12 أسبوعاً؟', 'recent bed rest or major surgery'),
  'hx.leg_immobilisation': yn('sx', 'Paralysis, paresis or recent plaster cast of the leg?', 'شلل أو ضعف أو جبيرة حديثة في الساق؟', 'lower-limb paralysis, paresis or plaster immobilisation'),
  'hx.headache.peak_1h': yn('sx', 'Did the headache reach maximum intensity within 1 hour?', 'هل وصل الصداع لأقصى شدته خلال ساعة؟', 'headache peaking within one hour'),
  'hx.headache.thunderclap': yn('sx', 'Was it instantly peaking (thunderclap)?', 'هل كان في أقصى شدته فوراً (صاعقي)؟', 'thunderclap onset'),
  'hx.headache.exertion': yn('sx', 'Did it start during exertion?', 'هل بدأ أثناء مجهود؟', 'onset during exertion'),
  'hx.headache.witnessed_loc': yn('sx', 'Witnessed loss of consciousness?', 'فقدان وعي بشهادة أحد؟', 'witnessed loss of consciousness'),
  'hx.amnesia_30min': yn('sx', 'Amnesia for 30 minutes or more before the impact?', 'فقدان ذاكرة 30 دقيقة أو أكثر قبل الإصابة؟', 'retrograde amnesia of 30 minutes or more'),
  'hx.dangerous_mechanism': yn('sx', 'Dangerous mechanism (pedestrian struck, ejected, fall from more than 1 m or 5 stairs)?', 'آلية خطرة (صدم مشاة، قذف من مركبة، سقوط أكثر من متر أو 5 درجات)؟', 'dangerous mechanism of injury'),

  // ---------- examination ----------
  'exam.acvpu': ch('exam', 'Level of consciousness (ACVPU)?', 'مستوى الوعي (ACVPU)؟', [
    { v: 'A', en: 'Alert', ar: 'واعٍ', doc: 'alert' },
    { v: 'C', en: 'New confusion', ar: 'ارتباك جديد', doc: 'new confusion' },
    { v: 'V', en: 'Responds to voice', ar: 'يستجيب للصوت', doc: 'responds to voice' },
    { v: 'P', en: 'Responds to pain', ar: 'يستجيب للألم', doc: 'responds to pain' },
    { v: 'U', en: 'Unresponsive', ar: 'لا يستجيب', doc: 'unresponsive' },
  ], 'Consciousness (ACVPU)'),
  'exam.new_confusion': yn('exam', 'New confusion?', 'ارتباك جديد؟', 'new confusion'),
  'exam.dvt_signs': yn('exam', 'Clinical signs of DVT (leg swelling and pain on palpation of deep veins)?', 'علامات جلطة أوردة عميقة (تورم الساق وألم على مسار الأوردة)؟', 'clinical signs of deep vein thrombosis'),
  'exam.entire_leg_swollen': yn('exam', 'Entire leg swollen?', 'تورم الساق بالكامل؟', 'swelling of the entire leg'),
  'exam.calf_swelling_3cm': yn('exam', 'Calf 3 cm or more larger than the other side?', 'محيط السمانة أكبر بـ 3 سم أو أكثر من الجهة الأخرى؟', 'calf swelling of 3 cm or more'),
  'exam.deep_vein_tenderness': yn('exam', 'Tenderness along the deep veins?', 'ألم على مسار الأوردة العميقة؟', 'tenderness along the deep venous system'),
  'exam.pitting_oedema_one_leg': yn('exam', 'Pitting oedema confined to the symptomatic leg?', 'وذمة انطباعية في الساق المصابة فقط؟', 'pitting oedema confined to the symptomatic leg'),
  'exam.collateral_veins': yn('exam', 'Collateral superficial (non-varicose) veins?', 'أوردة سطحية جانبية (غير دوالي)؟', 'collateral superficial veins'),
  'exam.chest_wall_reproducible': yn('exam', 'Pain reproduced by palpation of the chest wall?', 'هل يتكرر الألم بالضغط على جدار الصدر؟', 'pain reproduced by chest wall palpation'),
  'exam.rlq_tenderness': yn('exam', 'Right lower quadrant tenderness?', 'ألم عند الضغط أسفل يمين البطن؟', 'right iliac fossa tenderness'),
  'exam.rebound': yn('exam', 'Rebound tenderness?', 'ألم ارتدادي؟', 'rebound tenderness'),
  'exam.limited_neck_flexion': yn('exam', 'Limited neck flexion on examination?', 'محدودية ثني الرقبة بالفحص؟', 'limited neck flexion'),
  'exam.skull_fracture_open': yn('exam', 'Suspected open or depressed skull fracture?', 'اشتباه كسر جمجمة مفتوح أو منخسف؟', 'suspected open or depressed skull fracture'),
  'exam.basal_skull_signs': yn('exam', 'Signs of basal skull fracture (haemotympanum, raccoon eyes, CSF leak, Battle sign)?', 'علامات كسر قاعدة الجمجمة؟', 'signs of basal skull fracture'),
  'exam.gcs_below15_2h': yn('exam', 'GCS below 15 two hours after the injury?', 'غلاسكو أقل من 15 بعد ساعتين من الإصابة؟', 'GCS below 15 at two hours'),

  // ---------- clinician judgement ----------
  'judg.heart_history': ch('judgement', 'How suspicious is the history for ACS?', 'ما درجة الاشتباه في القصة لمتلازمة تاجية؟', [
    { v: 0, en: 'Slightly suspicious', ar: 'اشتباه بسيط', doc: 'slightly suspicious' },
    { v: 1, en: 'Moderately suspicious', ar: 'اشتباه متوسط', doc: 'moderately suspicious' },
    { v: 2, en: 'Highly suspicious', ar: 'اشتباه عالٍ', doc: 'highly suspicious' },
  ], 'History suspicion for ACS'),
  'judg.pe_most_likely': yn('judgement', 'Is PE the most likely diagnosis (or equally likely)?', 'هل الانسداد الرئوي هو التشخيص الأرجح (أو بنفس الاحتمال)؟', 'pulmonary embolism judged the most likely diagnosis'),
  'judg.pe_low_gestalt': yn('judgement', 'Is your clinical gestalt for PE low (below about 15%)?', 'هل تقديرك السريري للانسداد الرئوي منخفض (أقل من نحو 15%)؟', 'low clinical gestalt for pulmonary embolism'),
  'judg.dvt_alternative': yn('judgement', 'Is an alternative diagnosis at least as likely as DVT?', 'هل يوجد تشخيص بديل بنفس احتمال الجلطة أو أكثر؟', 'an alternative diagnosis at least as likely as DVT'),
  'judg.vasovagal_predisposition': yn('judgement', 'Vasovagal predisposition (warm crowded place, prolonged standing, fear, emotion or pain)?', 'استعداد للإغماء الوعائي المبهمي (مكان حار مزدحم، وقوف طويل، خوف، انفعال أو ألم)؟', 'predisposition to vasovagal symptoms'),
  'judg.syncope_ed_dx': ch('judgement', 'ED working diagnosis for the syncope?', 'التشخيص المبدئي للإغماء في الطوارئ؟', [
    { v: 'vasovagal', en: 'Vasovagal', ar: 'وعائي مبهمي', doc: 'vasovagal syncope' },
    { v: 'cardiac', en: 'Cardiac', ar: 'قلبي', doc: 'cardiac syncope' },
    { v: 'neither', en: 'Neither / unclear', ar: 'لا هذا ولا ذاك / غير واضح', doc: 'neither vasovagal nor cardiac' },
  ], 'ED syncope diagnosis'),
  'judg.news2_scale2': yn('judgement', 'Is a target SpO2 of 88–92% prescribed (hypercapnic respiratory failure)?', 'هل الهدف المحدد للتشبع 88–92% (فشل تنفسي مع احتباس CO2)؟', 'target SpO2 88–92% (NEWS2 scale 2)'),

  // ---------- results ----------
  'lab.troponin_cat': ch('lab', 'Troponin result?', 'نتيجة التروبونين؟', [
    { v: 0, en: 'Normal (at or below the limit)', ar: 'طبيعي', doc: 'within normal limits' },
    { v: 1, en: '1–3 × upper limit', ar: '1–3 أضعاف الحد الأعلى', doc: '1–3 times the upper reference limit' },
    { v: 2, en: 'More than 3 × upper limit', ar: 'أكثر من 3 أضعاف', doc: 'more than 3 times the upper reference limit' },
  ], 'Troponin'),
  'lab.urea': num('lab', 'Urea?', 'اليوريا؟', 'mmol/L', 'Urea', [0.5, 100]),
  'lab.creatinine': num('lab', 'Creatinine?', 'الكرياتينين؟', 'µmol/L', 'Creatinine', [10, 2500]),
  'lab.hb': num('lab', 'Haemoglobin?', 'الهيموجلوبين؟', 'g/L', 'Haemoglobin', [20, 250]),
  'lab.wbc': num('lab', 'White cell count?', 'كريات الدم البيضاء؟', '×10⁹/L', 'White cell count', [0.1, 300]),
  'lab.neut_pct': num('lab', 'Neutrophils (%)?', 'العدلات (%)؟', '%', 'Neutrophils', [0, 100]),
  'lab.na': num('lab', 'Sodium?', 'الصوديوم؟', 'mmol/L', 'Sodium', [90, 200]),
  'lab.k': num('lab', 'Potassium?', 'البوتاسيوم؟', 'mmol/L', 'Potassium', [1, 10]),
  'lab.cl': num('lab', 'Chloride?', 'الكلورايد؟', 'mmol/L', 'Chloride', [60, 150]),
  'lab.hco3': num('lab', 'Bicarbonate?', 'البيكربونات؟', 'mmol/L', 'Bicarbonate', [2, 60]),
  'lab.albumin': num('lab', 'Albumin?', 'الألبومين؟', 'g/L', 'Albumin', [5, 70]),
  'lab.ca': num('lab', 'Calcium (total)?', 'الكالسيوم الكلي؟', 'mmol/L', 'Calcium', [0.5, 5]),
  'lab.lactate': num('lab', 'Lactate?', 'اللاكتات؟', 'mmol/L', 'Lactate', [0.1, 30]),
  'lab.glucose': num('lab', 'Laboratory glucose?', 'سكر المختبر؟', 'mmol/L', 'Glucose', [0.5, 100]),

  // ---------- ECG ----------
  'ecg.heart_cat': ch('ecg', 'ECG?', 'تخطيط القلب؟', [
    { v: 0, en: 'Normal', ar: 'طبيعي', doc: 'normal' },
    { v: 1, en: 'Non-specific repolarisation change (LBBB, LVH, paced, digoxin)', ar: 'تغيرات غير نوعية (LBBB، تضخم، منظم، ديجوكسين)', doc: 'non-specific repolarisation disturbance' },
    { v: 2, en: 'Significant ST deviation', ar: 'انحراف ST واضح', doc: 'significant ST-segment deviation' },
  ], 'ECG'),
  'ecg.rhythm': ch('ecg', 'ECG rhythm?', 'نظم القلب في التخطيط؟', [
    { v: 'sinus', en: 'Sinus', ar: 'جيبي', doc: 'sinus rhythm' },
    { v: 'af', en: 'Atrial fibrillation', ar: 'رجفان أذيني', doc: 'atrial fibrillation' },
    { v: 'flutter', en: 'Atrial flutter', ar: 'رفرفة أذينية', doc: 'atrial flutter' },
    { v: 'svt', en: 'Narrow-complex tachycardia (SVT)', ar: 'تسرع ضيق المركبات', doc: 'narrow-complex tachycardia' },
    { v: 'vt', en: 'Broad-complex tachycardia', ar: 'تسرع عريض المركبات', doc: 'broad-complex tachycardia' },
    { v: 'brady', en: 'Bradycardia / heart block', ar: 'بطء / إحصار', doc: 'bradycardia or heart block' },
    { v: 'paced', en: 'Paced', ar: 'منظم', doc: 'paced rhythm' },
  ], 'Rhythm'),
  'ecg.st_deviation': yn('ecg', 'ST deviation of 0.5 mm or more?', 'انحراف ST بمقدار 0.5 مم أو أكثر؟', 'ST deviation of 0.5 mm or more'),
  'ecg.new_ischaemia': yn('ecg', 'New ischaemia on the ECG?', 'علامات نقص تروية جديدة في التخطيط؟', 'new ischaemic changes'),
  'ecg.qrs_ms': num('ecg', 'QRS duration?', 'مدة QRS؟', 'ms', 'QRS duration', [40, 300]),
  'ecg.qtc_ms': num('ecg', 'QTc?', 'QTc؟', 'ms', 'QTc', [250, 750]),
  'ecg.axis': num('ecg', 'QRS axis?', 'محور QRS؟', '°', 'QRS axis', [-180, 180]),
});

export const FACT_SECTIONS = Object.freeze({
  pmh: 'Past medical history', family: 'Family history', meds: 'Medications', social: 'Social history',
  sx: 'History', exam: 'Examination', judgement: 'Clinician judgement', lab: 'Laboratory results', ecg: 'ECG',
});
