// Structured examination templates: GENERAL examination + LOCAL (system) examinations.
// Each group has one NORMAL statement and its ABNORMAL findings; normal and abnormal are mutually exclusive.
// Options that a validated score already asks for reuse that score's fact key (enter once, use everywhere):
// choosing the group's normal statement records those yes/no facts as "no"; choosing the finding records "yes".
// Standard clinical examination vocabulary written for this app (DRAFT — consultant review required).
// Anything not listed here can be added from the HPO search (19,000+ signs).

const SYSTEMS_AR = {
  gen: 'الفحص العام', cvs: 'القلب والأوعية', resp: 'الجهاز التنفسي', abd: 'البطن', neuro: 'الجهاز العصبي',
  msk: 'العظام والمفاصل والعمود الفقري', skin: 'الجلد والجروح', heent: 'العين والأنف والأذن والحنجرة والرقبة',
  gu: 'الجهاز البولي التناسلي والنساء والتوليد', mse: 'الحالة النفسية',
};

// group(id, title, [normalLabel, normalDoc, legacyFact?], [[label, doc?, fact?], ...])
const G = (id, title, normal, abnormal, extra = {}) => ({ id, title, normal, abnormal, ...extra });

const RAW = [
  ['gen', 'General examination', [
    G('appearance', 'Appearance', ['Well-looking', 'well-looking'], [['Unwell-looking'], ['Toxic-looking'], ['In pain'], ['Distressed'], ['Diaphoretic (sweaty)', 'diaphoretic'], ['Agitated'], ['Cachectic']]),
    G('consciousness', 'Consciousness (ACVPU)', null, null, { fact: 'exam.acvpu' }),
    G('breathing', 'Breathing', ['Breathing comfortably', 'breathing comfortably'], [['Tachypnoeic'], ['Increased work of breathing'], ['Speaking in phrases only'], ['Unable to speak in sentences']]),
    G('hydration', 'Hydration', ['Well hydrated', 'well hydrated'], [['Dry mucous membranes'], ['Reduced skin turgor'], ['Sunken eyes']]),
    G('pallor', 'Pallor', ['No pallor', 'no pallor'], [['Pallor']]),
    G('jaundice', 'Jaundice', ['No jaundice', 'no jaundice'], [['Jaundice (scleral icterus)', 'jaundice']]),
    G('cyanosis', 'Cyanosis', ['No cyanosis', 'no cyanosis'], [['Central cyanosis'], ['Peripheral cyanosis']]),
    G('clubbing', 'Clubbing', ['No clubbing', 'no clubbing'], [['Finger clubbing']]),
    G('nodes', 'Lymph nodes', ['No lymphadenopathy', 'no lymphadenopathy'], [['Cervical lymphadenopathy'], ['Axillary lymphadenopathy'], ['Inguinal lymphadenopathy'], ['Generalised lymphadenopathy']]),
    G('oedema', 'Oedema', ['No oedema', 'no oedema'], [['Bilateral pitting ankle oedema'], ['Sacral oedema'], ['Generalised oedema (anasarca)', 'generalised oedema'], ['Facial / periorbital oedema', 'facial oedema']]),
    G('perfusion', 'Perfusion', ['Warm peripheries, capillary refill < 2 s', 'warm peripheries with capillary refill under 2 seconds'], [['Capillary refill 2 s or more', 'prolonged capillary refill'], ['Cold peripheries'], ['Mottled skin']]),
    G('rash', 'Skin', ['No rash', 'no rash'], [['Maculopapular rash'], ['Urticaria'], ['Petechiae'], ['Non-blanching purpura'], ['Bruising'], ['Vesicular rash'], ['Erythroderma']]),
    G('breath', 'Breath odour', ['No abnormal breath odour', 'no abnormal breath odour'], [['Smell of alcohol'], ['Ketotic breath'], ['Fetor hepaticus']]),
  ]],
  ['cvs', 'Cardiovascular', [
    G('pulse', 'Pulse', ['Regular pulse', 'regular pulse'], [['Irregularly irregular pulse'], ['Weak / thready pulse', 'weak thready pulse'], ['Bounding pulse']]),
    G('jvp', 'JVP', ['JVP not raised', 'JVP not raised'], [['Raised JVP']]),
    G('apex', 'Apex beat', ['Apex beat not displaced', 'apex beat not displaced'], [['Displaced apex beat'], ['Heaving apex beat']]),
    G('hs', 'Heart sounds', ['Heart sounds normal', 'heart sounds normal', 'exam.cvs.normal'], [['Murmur', 'murmur', 'exam.cvs.murmur'], ['Systolic murmur'], ['Diastolic murmur'], ['Third heart sound (S3)', 'third heart sound'], ['Fourth heart sound (S4)', 'fourth heart sound'], ['Pericardial rub'], ['Muffled heart sounds']]),
    G('periph', 'Peripheral pulses', ['Peripheral pulses palpable and equal', 'peripheral pulses palpable and equal'], [['Absent or reduced peripheral pulse'], ['Radio-femoral delay'], ['Pulse or blood pressure difference between arms']]),
    G('legs', 'Legs', ['No leg swelling, deep-vein tenderness or venous signs', 'no leg swelling, deep-vein tenderness or venous signs'], [
      ['Peripheral oedema', 'peripheral oedema', 'exam.cvs.oedema'], ['Clinical signs of DVT', null, 'exam.dvt_signs'], ['Entire leg swollen', null, 'exam.entire_leg_swollen'],
      ['Calf 3 cm or more larger than the other side', null, 'exam.calf_swelling_3cm'], ['Tenderness along the deep veins', null, 'exam.deep_vein_tenderness'],
      ['Pitting oedema confined to one leg', null, 'exam.pitting_oedema_one_leg'], ['Collateral superficial veins', null, 'exam.collateral_veins']]),
  ]],
  ['resp', 'Respiratory', [
    G('effort', 'Respiratory effort', ['Normal respiratory effort', 'normal respiratory effort'], [['Accessory muscle use'], ['Intercostal / subcostal recession', 'intercostal and subcostal recession'], ['Nasal flaring'], ['Paradoxical breathing']]),
    G('trachea', 'Trachea', ['Trachea central', 'trachea central'], [['Tracheal deviation']]),
    G('expansion', 'Chest expansion', ['Chest expansion equal', 'chest expansion equal'], [['Reduced expansion — left', 'reduced chest expansion on the left'], ['Reduced expansion — right', 'reduced chest expansion on the right']]),
    G('percussion', 'Percussion', ['Percussion resonant', 'percussion note resonant'], [['Dull — left', 'dull percussion on the left'], ['Dull — right', 'dull percussion on the right'], ['Stony dull'], ['Hyperresonant — left', 'hyperresonance on the left'], ['Hyperresonant — right', 'hyperresonance on the right']]),
    G('breath', 'Breath sounds', ['Normal breath sounds', 'normal breath sounds', 'exam.resp.normal'], [
      ['Wheeze', 'wheeze', 'exam.resp.wheeze'], ['Crackles', 'crackles', 'exam.resp.crackles'], ['Fine basal crackles'], ['Coarse crackles'],
      ['Reduced air entry — left', 'reduced air entry on the left'], ['Reduced air entry — right', 'reduced air entry on the right'], ['Reduced air entry — bilateral', 'bilaterally reduced air entry'],
      ['Bronchial breathing'], ['Silent chest'], ['Stridor'], ['Pleural rub']]),
    G('wall', 'Chest wall', ['No chest wall tenderness or injury', 'no chest wall tenderness or injury'], [['Pain reproduced by chest wall palpation', null, 'exam.chest_wall_reproducible'], ['Subcutaneous emphysema'], ['Flail segment'], ['Chest wall bruising']]),
  ]],
  ['abd', 'Abdomen', [
    G('inspection', 'Inspection', ['Abdomen not distended', 'abdomen not distended'], [['Distended abdomen'], ['Surgical scars'], ['Visible peristalsis'], ['Caput medusae'], ['Flank or periumbilical bruising']]),
    G('palpation', 'Palpation', ['Soft, non-tender', 'soft and non-tender', 'exam.abd.soft'], [
      ['Tenderness', 'tenderness', 'exam.abd.tender'], ['Epigastric tenderness'], ['Right upper quadrant tenderness'], ['Left upper quadrant tenderness'],
      ['Right iliac fossa tenderness', null, 'exam.rlq_tenderness'], ['Left iliac fossa tenderness'], ['Suprapubic tenderness'], ['Generalised tenderness'],
      ['Guarding', 'guarding', 'exam.abd.guarding'], ['Rebound tenderness', null, 'exam.rebound'], ['Rigidity'], ["Murphy's sign positive", "positive Murphy's sign"], ["Rovsing's sign positive", "positive Rovsing's sign"], ['Pulsatile abdominal mass']]),
    G('organs', 'Organs and masses', ['No organomegaly or masses', 'no organomegaly or masses'], [['Hepatomegaly'], ['Splenomegaly'], ['Palpable mass'], ['Palpable bladder']]),
    G('percussion', 'Percussion', ['No shifting dullness', 'no shifting dullness'], [['Shifting dullness'], ['Tympanic abdomen']]),
    G('bowel', 'Bowel sounds', ['Bowel sounds normal', 'bowel sounds normal'], [['Bowel sounds absent'], ['Bowel sounds hyperactive'], ['Tinkling bowel sounds']]),
    G('hernia', 'Hernial orifices', ['Hernial orifices intact', 'hernial orifices intact'], [['Inguinal hernia'], ['Femoral hernia'], ['Umbilical hernia'], ['Tender irreducible hernia']]),
    G('renal', 'Renal angles', ['No renal angle tenderness', 'no renal angle tenderness'], [['Renal angle tenderness — left', 'left renal angle tenderness'], ['Renal angle tenderness — right', 'right renal angle tenderness']]),
    G('pr', 'Rectal examination', ['Rectal examination normal', 'rectal examination normal'], [['Melaena on rectal examination'], ['Fresh blood on rectal examination'], ['Tender rectal examination'], ['Mass on rectal examination']]),
  ]],
  ['neuro', 'Neurological', [
    G('orientation', 'Orientation', ['Oriented to time, place and person', 'oriented to time, place and person'], [['New confusion', null, 'exam.new_confusion'], ['Disoriented']]),
    G('speech', 'Speech', ['Speech normal', 'speech normal'], [['Dysarthria'], ['Expressive aphasia'], ['Receptive aphasia']]),
    G('pupils', 'Pupils', ['Pupils equal and reactive', 'pupils equal and reactive to light'], [['Unequal pupils'], ['Fixed dilated pupil'], ['Pinpoint pupils'], ['Sluggish pupils']]),
    G('cn', 'Cranial nerves', ['Cranial nerves grossly intact', 'cranial nerves grossly intact'], [['Facial droop — left', 'left facial droop'], ['Facial droop — right', 'right facial droop'], ['Gaze deviation'], ['Visual field defect'], ['Diplopia'], ['Nystagmus'], ['Ptosis'], ['Bulbar weakness']]),
    G('motor', 'Power', ['Power normal in all limbs', 'power normal in all four limbs'], [['Weakness — left arm', 'left arm weakness'], ['Weakness — right arm', 'right arm weakness'], ['Weakness — left leg', 'left leg weakness'], ['Weakness — right leg', 'right leg weakness'], ['Left hemiparesis'], ['Right hemiparesis'], ['Paraparesis'], ['Quadriparesis'], ['Pronator drift']]),
    G('tone', 'Tone', ['Tone normal', 'tone normal'], [['Increased tone'], ['Reduced tone'], ['Clonus']]),
    G('reflexes', 'Reflexes', ['Reflexes normal, plantars flexor', 'reflexes normal with flexor plantars'], [['Hyperreflexia'], ['Reduced or absent reflexes'], ['Upgoing plantar — left', 'left upgoing plantar'], ['Upgoing plantar — right', 'right upgoing plantar']]),
    G('sensation', 'Sensation', ['Sensation intact', 'sensation intact'], [['Reduced sensation — left', 'reduced sensation on the left'], ['Reduced sensation — right', 'reduced sensation on the right'], ['Sensory level'], ['Saddle anaesthesia']]),
    G('coord', 'Coordination', ['Coordination normal', 'coordination normal'], [['Finger-nose ataxia'], ['Heel-shin ataxia'], ['Dysdiadochokinesis'], ['Truncal ataxia']]),
    G('gait', 'Gait', ['Gait normal', 'gait normal'], [['Ataxic gait'], ['Antalgic gait'], ['Unable to walk']]),
    G('meningism', 'Meningism', ['No neck stiffness', 'no neck stiffness'], [['Limited neck flexion / neck stiffness', 'limited neck flexion', 'exam.limited_neck_flexion'], ['Kernig sign positive', 'positive Kernig sign'], ['Photophobia']]),
    G('head', 'Head', ['No signs of head injury', 'no signs of head injury'], [['Signs of basal skull fracture', null, 'exam.basal_skull_signs'], ['Open or depressed skull fracture', null, 'exam.skull_fracture_open'], ['Scalp haematoma'], ['Scalp laceration']]),
  ]],
  ['msk', 'Musculoskeletal and spine', [
    G('spine', 'Spine', ['No spinal tenderness', 'no spinal tenderness'], [['Cervical midline tenderness'], ['Thoracic midline tenderness'], ['Lumbar midline tenderness'], ['Paraspinal tenderness'], ['Step deformity']]),
    G('limbs', 'Limbs and joints', ['No limb deformity, swelling or tenderness', 'no limb deformity, swelling or tenderness'], [['Deformity'], ['Swelling'], ['Bony tenderness'], ['Joint effusion'], ['Hot swollen joint'], ['Reduced range of movement'], ['Unable to bear weight']]),
    G('nv', 'Distal neurovascular status', ['Distal neurovascular status intact', 'distal neurovascular status intact'], [['Distal pulses absent'], ['Distal sensation reduced'], ['Tense compartment / pain on passive stretch', 'tense compartment with pain on passive stretch']]),
  ]],
  ['skin', 'Skin and wounds', [
    G('wounds', 'Wounds', ['No wounds', 'no wounds'], [['Laceration'], ['Abrasion'], ['Puncture wound'], ['Bite wound'], ['Superficial burn'], ['Partial-thickness burn'], ['Full-thickness burn'], ['Pressure injury']]),
    G('infection', 'Skin infection', ['No signs of skin infection', 'no signs of skin infection'], [['Cellulitis'], ['Fluctuant abscess'], ['Lymphangitis'], ['Skin necrosis or crepitus']]),
  ]],
  ['heent', 'Head, eyes, ears, nose, throat and neck', [
    G('eyes', 'Eyes', ['Eyes normal', 'eyes normal'], [['Red eye'], ['Conjunctival discharge'], ['Corneal opacity or ulcer'], ['Periorbital swelling'], ['Reduced visual acuity'], ['Papilloedema']]),
    G('ears', 'Ears', ['Ears normal', 'ears normal'], [['Bulging red tympanic membrane'], ['Ear discharge'], ['Haemotympanum'], ['Mastoid tenderness']]),
    G('nose', 'Nose', ['Nose normal', 'nose normal'], [['Epistaxis'], ['Nasal deformity']]),
    G('throat', 'Mouth and throat', ['Mouth and throat normal', 'mouth and throat normal'], [['Pharyngeal erythema'], ['Tonsillar exudate'], ['Peritonsillar swelling with uvular deviation'], ['Drooling / unable to swallow saliva', 'drooling, unable to swallow saliva'], ['Tongue or lip swelling'], ['Dry tongue']]),
    G('neck', 'Neck', ['Neck normal', 'neck normal'], [['Goitre'], ['Neck swelling'], ['Neck mass']]),
  ]],
  ['gu', 'Genitourinary, gynaecology and obstetrics', [
    G('male', 'Male genitalia', ['Male genital examination normal', 'male genital examination normal'], [['Testicular tenderness'], ['Testicular swelling'], ['High-riding testis'], ['Urethral discharge'], ['Genital ulcer']]),
    G('gyn', 'Gynaecological', ['Gynaecological examination normal', 'gynaecological examination normal'], [['Vaginal bleeding'], ['Vaginal discharge'], ['Cervical motion tenderness'], ['Adnexal tenderness'], ['Adnexal mass']]),
    G('obs', 'Obstetric', ['Obstetric examination normal, fetal heart present', 'obstetric examination normal with fetal heart present'], [['Uterine tenderness'], ['Fundal height larger than dates'], ['Fundal height smaller than dates'], ['Fetal heart not detected']]),
  ]],
  ['mse', 'Mental state', [
    G('behaviour', 'Behaviour', ['Calm and cooperative', 'calm and cooperative'], [['Agitated behaviour'], ['Aggressive behaviour'], ['Withdrawn'], ['Psychomotor retardation']]),
    G('mood', 'Mood', ['Euthymic', 'euthymic mood'], [['Low mood'], ['Elevated mood'], ['Anxious']]),
    G('thought', 'Thought and perception', ['No abnormal thought content or perception', 'no abnormal thought content or perception'], [['Delusions'], ['Hallucinations'], ['Suicidal ideation']]),
    G('insight', 'Insight', ['Insight intact', 'insight intact'], [['Impaired insight']]),
  ]],
];

const lower = (s) => s.charAt(0).toLowerCase() + s.slice(1);

/** Systems → groups → options, with fact keys and mutual exclusion resolved. */
export const EXAM = Object.freeze(RAW.map(([key, en, groups]) => ({
  key, title: { en, ar: SYSTEMS_AR[key] },
  groups: groups.map((g) => {
    if (g.fact) return { id: g.id, title: g.title, fact: g.fact, options: [] };
    const base = `exam.${key}.${g.id}`;
    const normal = { fact: g.normal[2] ?? `${base}.normal`, label: g.normal[0], doc: g.normal[1], normal: true };
    const abn = g.abnormal.map(([label, doc, fact], i) => ({
      fact: fact ?? `${base}.${label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') || i}`,
      label, doc: doc ?? lower(label), normal: false,
    }));
    for (const a of abn) a.excludes = [normal.fact];
    normal.excludes = abn.map((a) => a.fact);
    return { id: g.id, title: g.title, options: [normal, ...abn] };
  }),
})));

export const EXAM_OPTIONS = Object.freeze(EXAM.flatMap((s) => s.groups.flatMap((g) => g.options.map((o) => ({ ...o, system: s.key, group: g.id })))));
export const EXAM_OPTION_BY_FACT = Object.freeze(Object.fromEntries(EXAM_OPTIONS.map((o) => [o.fact, o])));
export const EXAM_COUNT = EXAM_OPTIONS.length;
