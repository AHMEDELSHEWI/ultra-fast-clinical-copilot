# Clinical content review checklist

Content pack: 2026.10.0-alpha.1

Status: DRAFT — history questions authored for structure testing; pending consultant clinical review. Contains no drug doses.

**Nothing below is approved until a consultant signs it off.** Mark each row `[x]` only after checking it against the source or local protocol.

## Honest limits

- UpToDate, Tintinalli, Rosen and other subscription/copyright books were **not accessible** to the builder. Content here is authored from general medical knowledge and checked against the published, verifiable sources listed below. It is not copied from any book.
- Every citation below was looked up in PubMed; titles, years, DOIs and PMIDs are the ones PubMed returned. Newer editions (for example 2026 guidelines) may exist. The "latest known" column says only what was verified in this build.
- Items marked **NEEDS SOURCE** have no verified citation attached yet. They must be reviewed by a consultant and a source added before release.

## Hypotension decision

- [ ] Alert threshold: SBP 90 mmHg or below, or MAP below 65 mmHg (decided by the consultant). Local protocol confirmed.

## Verified sources

| Sign-off | Id | Citation | DOI | PMID | Latest known |
|---|---|---|---|---|---|
| [ ] | cp2021 | Gulati M, et al. 2021 AHA/ACC/ASE/CHEST/SAEM/SCCT/SCMR Guideline for the Evaluation and Diagnosis of Chest Pain. J Cardiovasc Comput Tomogr 2021;16(1):54-122. | 10.1016/j.jcct.2021.11.009 | 34955448 | Latest version verified in this build: 2021. |
| [ ] | acs2025 | Rao SV, et al. 2025 ACC/AHA/ACEP/NAEMSP/SCAI Guideline for the Management of Patients With Acute Coronary Syndromes. Circulation 2025;151(13):e771-e862. | 10.1161/CIR.0000000000001309 | 40014670 | Latest version verified in this build: 2025. |
| [ ] | aorta2022 | Isselbacher EM, et al. 2022 ACC/AHA Guideline for the Diagnosis and Management of Aortic Disease. J Am Coll Cardiol 2022;80(24):e223-e393. | 10.1016/j.jacc.2022.08.004 | 36334952 | Latest version verified in this build: 2022. |
| [ ] | pe2019 | Konstantinides SV, et al. 2019 ESC Guidelines for the diagnosis and management of acute pulmonary embolism. Eur Heart J 2020;41(4):543-603. | 10.1093/eurheartj/ehz405 | 31504429 | Latest version verified in this build: 2019. A newer ESC edition may exist; check before release. |
| [ ] | syncope2017 | Shen WK, et al. 2017 ACC/AHA/HRS Guideline for the Evaluation and Management of Patients With Syncope. Circulation 2017;136(5):e60-e122. | 10.1161/CIR.0000000000000499 | 28280231 | Latest version verified in this build: 2017. A newer edition may exist; check before release. |
| [ ] | heart2008 | Six AJ, Backus BE, Kelder JC. Chest pain in the emergency room: value of the HEART score. Neth Heart J 2008;16(6):191-196. | 10.1007/BF03086144 | 18665203 | Original derivation paper. |
| [ ] | csrs2016 | Thiruganasambandamoorthy V, et al. Development of the Canadian Syncope Risk Score to predict serious adverse events after emergency department assessment of syncope. CMAJ 2016;188(12):E289-E298. | 10.1503/cmaj.151469 | 27378464 | Original derivation paper. |
| [ ] | wells2000 | Wells PS, et al. Derivation of a simple clinical model to categorize patients probability of pulmonary embolism. Thromb Haemost 2000;83(3):416-420. | — | 10744147 | Original derivation paper. |
| [ ] | perc2004 | Kline JA, et al. Clinical criteria to prevent unnecessary diagnostic testing in emergency department patients with suspected pulmonary embolism. J Thromb Haemost 2004;2(8):1247-1255. | 10.1111/j.1538-7836.2004.00790.x | 15304025 | Original derivation paper. |

## Reasoning rules

### r_chest_pain

- [ ] Applies when: complaint.chest_pain = true
- Specialties: Emergency Medicine, Cardiology
- [ ] Must not miss: **Acute coronary syndrome** — Time-critical; a normal first ECG does not exclude it. (sources: cp2021, acs2025)
- [ ] Must not miss: **Pulmonary embolism** — Can present with chest pain, dyspnoea or syncope; consider early and risk-stratify. (sources: pe2019)
- [ ] Must not miss: **Acute aortic syndrome** — Missed diagnosis is rapidly fatal; consider with tearing pain, pulse or BP differences, or neurological deficit. (sources: cp2021, aorta2022)
- [ ] Must not miss: **Pneumothorax** — Causes pleuritic pain and dyspnoea; tension physiology is an emergency. (sources: cp2021)
- [ ] Score named: HEART score — Acute chest pain: structured risk stratification for major cardiac events. (source: heart2008; adult-only: true)

### r_chest_dyspnea — Cardiopulmonary pathway

- [ ] Applies when: complaint.chest_pain = true AND complaint.dyspnea = true
- Specialties: Cardiology, Pulmonology
- [ ] Must not miss: **Acute heart failure** — Dyspnoea with chest pain may reflect ischaemia with pulmonary oedema. (sources: acs2025)
- [ ] Score named: Wells score for PE — Pre-test probability when PE is being considered. (source: wells2000; adult-only: true)
- [ ] Score named: PERC rule — Only for low-probability patients: may avoid further PE testing. (source: perc2004; adult-only: true)

### r_chest_gi — Cardiac / gastrointestinal overlap

- [ ] Applies when: complaint.chest_pain = true AND (complaint.vomiting = true OR complaint.abdominal_pain = true)
- Specialties: Gastroenterology, General Surgery
- [ ] Must not miss: **Perforation / pancreatitis / oesophageal rupture** — Epigastric pain with vomiting can be surgical; ACS can also present with epigastric pain and vomiting. (sources: **NEEDS SOURCE**)

### r_syncope

- [ ] Applies when: complaint.syncope = true
- Specialties: Emergency Medicine, Cardiology
- [ ] Must not miss: **Serious arrhythmia** — Brady- or tachyarrhythmia can cause syncope or palpitations with sudden deterioration. (sources: syncope2017)
- [ ] Must not miss: **Acute coronary syndrome** — Time-critical; a normal first ECG does not exclude it. (sources: cp2021, acs2025)
- [ ] Must not miss: **Pulmonary embolism** — Can present with chest pain, dyspnoea or syncope; consider early and risk-stratify. (sources: pe2019)
- [ ] Must not miss: **Occult haemorrhage** — Syncope with anaemia, melaena, or abdominal/pelvic pain suggests bleeding. (sources: **NEEDS SOURCE**)
- [ ] Score named: Canadian Syncope Risk Score — Syncope: 30-day serious adverse event risk after ED assessment. (source: csrs2016; adult-only: true)

### r_syncope_highrisk — High-risk syncope features

- [ ] Applies when: (hx.syncope.exertional = true OR hx.syncope.palpitations_before = true OR hx.syncope.family_sudden_death = true)
- Specialties: Cardiology
- [ ] Must not miss: **Structural / inherited cardiac cause** — Exertional syncope, preceding palpitations or family sudden death raise concern for a cardiac cause. (sources: syncope2017)

### r_palpitations

- [ ] Applies when: complaint.palpitations = true
- Specialties: Emergency Medicine, Cardiology
- [ ] Must not miss: **Serious arrhythmia** — Brady- or tachyarrhythmia can cause syncope or palpitations with sudden deterioration. (sources: syncope2017)
- [ ] Must not miss: **Electrolyte / thyroid / anaemia cause** — Treatable triggers that change management. (sources: **NEEDS SOURCE**)

### r_palp_red — Palpitations with haemodynamic or ischaemic symptoms

- [ ] Applies when: complaint.palpitations = true AND (complaint.syncope = true OR complaint.chest_pain = true OR complaint.dyspnea = true)
- Specialties: Critical Care
- [ ] Must not miss: **Unstable arrhythmia** — Palpitations with syncope, chest pain or dyspnoea warrants immediate rhythm assessment. (sources: **NEEDS SOURCE**)

### r_dyspnea

- [ ] Applies when: complaint.dyspnea = true
- Specialties: Emergency Medicine, Pulmonology, Cardiology
- [ ] Must not miss: **Pulmonary embolism** — Can present with chest pain, dyspnoea or syncope; consider early and risk-stratify. (sources: pe2019)
- [ ] Must not miss: **Acute coronary syndrome** — Time-critical; a normal first ECG does not exclude it. (sources: cp2021, acs2025)
- [ ] Must not miss: **Pneumothorax** — Causes pleuritic pain and dyspnoea; tension physiology is an emergency. (sources: cp2021)
- [ ] Must not miss: **Anaphylaxis / airway compromise** — Rapidly progressive; look for exposure, urticaria, stridor. (sources: **NEEDS SOURCE**)

### r_abdo

- [ ] Applies when: complaint.abdominal_pain = true
- Specialties: Emergency Medicine, General Surgery, Gastroenterology
- [ ] Must not miss: **Perforation / obstruction / mesenteric ischaemia** — Surgical emergencies can be subtle early, especially in older patients. (sources: **NEEDS SOURCE**)

### r_abdo_aaa

- [ ] Applies when: complaint.abdominal_pain = true AND patient.age >= 50
- Specialties: Vascular Surgery
- [ ] Must not miss: **Abdominal aortic aneurysm (rupture)** — Abdominal, back or flank pain with hypotension or syncope in older patients. (sources: aorta2022)

### r_fem_ectopic

- [ ] Applies when: patient.sex = female AND patient.age >= 12 AND patient.age <= 55 AND (complaint.abdominal_pain = true OR complaint.syncope = true OR complaint.vomiting = true)
- Specialties: Obstetrics & Gynecology
- [ ] Must not miss: **Ectopic pregnancy** — Any woman of child-bearing age with abdominal pain, syncope or vomiting needs pregnancy status. (sources: **NEEDS SOURCE**)

### r_headache

- [ ] Applies when: complaint.headache = true
- Specialties: Emergency Medicine, Neurology
- [ ] Must not miss: **Subarachnoid haemorrhage** — Sudden severe headache is a red flag until excluded. (sources: **NEEDS SOURCE**)
- [ ] Must not miss: **Meningitis / encephalitis** — Headache with fever or neck stiffness. (sources: **NEEDS SOURCE**)
- [ ] Must not miss: **Stroke / intracranial haemorrhage** — Focal deficit or reduced consciousness. (sources: **NEEDS SOURCE**)

### r_headache_flags — Neurological red flag

- [ ] Applies when: (sx.neck_stiffness = true OR sx.focal_weakness = true)
- Specialties: Neurology, Critical Care
- [ ] Must not miss: **CNS infection / haemorrhage / stroke** — Neck stiffness or focal weakness changes urgency. (sources: **NEEDS SOURCE**)

### r_fever

- [ ] Applies when: complaint.fever = true
- Specialties: Emergency Medicine, Infectious Diseases
- [ ] Must not miss: **Sepsis** — Fever with abnormal vital signs, altered mentation or hypotension. (sources: **NEEDS SOURCE**)
- [ ] Must not miss: **Meningitis / encephalitis** — Fever with headache, neck stiffness or altered mentation. (sources: **NEEDS SOURCE**)

### r_fever_immuno — Fever in an immunosuppressed patient

- [ ] Applies when: complaint.fever = true AND pmh.immunosuppressed = true
- Specialties: Infectious Diseases, Oncology / Hematology
- [ ] Must not miss: **Serious infection with atypical presentation** — Signs can be blunted; lower threshold to escalate. (sources: **NEEDS SOURCE**)

### r_vomiting

- [ ] Applies when: complaint.vomiting = true
- Specialties: Emergency Medicine, Gastroenterology
- [ ] Must not miss: **Diabetic ketoacidosis / metabolic cause** — Vomiting in diabetes should prompt glucose and ketone assessment. (sources: **NEEDS SOURCE**)
- [ ] Must not miss: **Bowel obstruction** — Particularly with bilious vomiting or abdominal distension. (sources: **NEEDS SOURCE**)

### r_vomit_blood — Possible upper GI bleeding

- [ ] Applies when: sx.vomiting_blood = true
- Specialties: Gastroenterology, Critical Care
- [ ] Must not miss: **Upper gastrointestinal bleeding** — Haematemesis needs urgent haemodynamic assessment. (sources: **NEEDS SOURCE**)

### r_ams

- [ ] Applies when: complaint.altered_mental_status = true
- Specialties: Emergency Medicine, Neurology, Critical Care
- [ ] Must not miss: **Hypoglycaemia** — Check capillary glucose immediately; rapidly reversible. (sources: **NEEDS SOURCE**)
- [ ] Must not miss: **CNS infection / haemorrhage / stroke** — Altered consciousness may be the only sign. (sources: **NEEDS SOURCE**)
- [ ] Must not miss: **Toxic / metabolic encephalopathy** — Overdose, electrolyte, hypoxia, hepatic or uraemic causes. (sources: **NEEDS SOURCE**)
- [ ] Must not miss: **Sepsis** — Altered mentation can be the first sign in older patients. (sources: **NEEDS SOURCE**)
- [ ] Score named: Glasgow Coma Scale — Altered consciousness: calculated automatically from the vitals tab. (source: **NEEDS SOURCE**; adult-only: false)

### r_ams_trauma — Head injury with altered consciousness

- [ ] Applies when: hx.altered_mental_status.head_injury = true
- Specialties: Neurosurgery, Trauma Surgery
- [ ] Must not miss: **Intracranial haemorrhage** — Head injury with reduced consciousness. (sources: **NEEDS SOURCE**)

### r_back

- [ ] Applies when: complaint.back_pain = true
- Specialties: Emergency Medicine, Orthopedics
- [ ] Must not miss: **Vertebral fracture / malignancy / spinal infection** — Red flags: trauma, cancer history, fever, age, night pain. (sources: **NEEDS SOURCE**)

### r_back_cauda — Possible cord / cauda equina compression

- [ ] Applies when: (sx.leg_weakness_numbness = true OR sx.bladder_bowel = true)
- Specialties: Neurosurgery
- [ ] Must not miss: **Cord / cauda equina compression** — Neurological deficit or sphincter disturbance is time-critical. (sources: **NEEDS SOURCE**)

### r_back_aorta

- [ ] Applies when: complaint.back_pain = true AND patient.age >= 50
- Specialties: Vascular Surgery
- [ ] Must not miss: **Acute aortic syndrome** — Missed diagnosis is rapidly fatal; consider with tearing pain, pulse or BP differences, or neurological deficit. (sources: cp2021, aorta2022)
- [ ] Must not miss: **Abdominal aortic aneurysm (rupture)** — Back pain with hypotension or syncope in older patients. (sources: aorta2022)

## History questions

| Sign-off | Id | Complaint(s) | Question | Red flag |
|---|---|---|---|---|
| [ ] | chest_pain.onset | chest_pain | How did it start? |  |
| [ ] | chest_pain.duration | chest_pain | How long has it been present? |  |
| [ ] | chest_pain.pain | chest_pain | Pain score (0-10)? |  |
| [ ] | chest_pain.location | chest_pain | Where is the pain? |  |
| [ ] | chest_pain.character | chest_pain | What is the pain like? |  |
| [ ] | chest_pain.radiation | chest_pain | Does the pain spread anywhere? |  |
| [ ] | dyspnea.onset | dyspnea | How did it start? |  |
| [ ] | dyspnea.duration | dyspnea | How long has it been present? |  |
| [ ] | dyspnea.cough | dyspnea | Cough? |  |
| [ ] | dyspnea.leg_swelling | dyspnea | Leg swelling? |  |
| [ ] | abdominal_pain.onset | abdominal_pain | How did it start? |  |
| [ ] | abdominal_pain.duration | abdominal_pain | How long has it been present? |  |
| [ ] | abdominal_pain.pain | abdominal_pain | Pain score (0-10)? |  |
| [ ] | abdominal_pain.location | abdominal_pain | Where is the pain? |  |
| [ ] | abdominal_pain.character | abdominal_pain | What is the pain like? |  |
| [ ] | abdominal_pain.radiation | abdominal_pain | Does the pain spread anywhere? |  |
| [ ] | abdominal_pain.diarrhoea | abdominal_pain | Diarrhoea? |  |
| [ ] | headache.onset | headache | How did it start? |  |
| [ ] | headache.duration | headache | How long has it been present? |  |
| [ ] | headache.pain | headache | Pain score (0-10)? |  |
| [ ] | headache.location | headache | Where is the headache? |  |
| [ ] | headache.character | headache | What is it like? |  |
| [ ] | headache.neck_stiffness | headache | Neck stiffness? | yes |
| [ ] | headache.focal_weakness | headache | New weakness or numbness on one side? | yes |
| [ ] | headache.visual | headache | Visual disturbance? |  |
| [ ] | sx.dyspnea | chest_pain, abdominal_pain | Shortness of breath? |  |
| [ ] | sx.diaphoresis | chest_pain, dyspnea | Sweating? |  |
| [ ] | sx.nausea | chest_pain, abdominal_pain, headache | Nausea? |  |
| [ ] | sx.vomiting | abdominal_pain, headache, chest_pain | Vomiting? |  |
| [ ] | sx.syncope | chest_pain, dyspnea, headache, palpitations | Did the patient faint or nearly faint? | yes |
| [ ] | sx.fever | abdominal_pain, altered_mental_status, dyspnea, headache | Fever? |  |
| [ ] | allergy.status | all | Drug allergies? |  |
| [ ] | meds.anticoagulant | all | On blood thinners (anticoagulant / antiplatelet)? |  |
| [ ] | preg.status | all | Could the patient be pregnant? |  |
| [ ] | pmh.diabetes | all | Diabetes? |  |
| [ ] | pmh.hypertension | all | Hypertension? |  |
| [ ] | social.smoking | chest_pain, dyspnea | Smoking? |  |
| [ ] | syncope.duration | syncope | How long has it been present? |  |
| [ ] | syncope.exertional | syncope | Did it happen during exertion? | yes |
| [ ] | syncope.palpitations_before | syncope | Palpitations just before it? | yes |
| [ ] | syncope.family_sudden_death | syncope | Family history of sudden death under 50? |  |
| [ ] | pmh.heart_disease | syncope, palpitations, chest_pain, dyspnea | Known heart disease? |  |
| [ ] | palpitations.duration | palpitations | How long has it been present? |  |
| [ ] | palpitations.pattern | palpitations | What is the rhythm like? |  |
| [ ] | palpitations.chest_pain | palpitations | Chest pain with it? | yes |
| [ ] | fever.duration | fever | How long has it been present? |  |
| [ ] | fever.rigors | fever | Shaking chills (rigors)? |  |
| [ ] | fever.immunosuppressed | fever | Immunosuppressed (chemotherapy, steroids, transplant, HIV)? | yes |
| [ ] | fever.neck_stiffness | fever | Neck stiffness? | yes |
| [ ] | vomiting.duration | vomiting | How long has it been present? |  |
| [ ] | vomiting.blood | vomiting | Blood in the vomit? | yes |
| [ ] | vomiting.bilious | vomiting | Green (bilious) vomit? | yes |
| [ ] | vomiting.abdominal_pain | vomiting | Abdominal pain with it? |  |
| [ ] | ams.onset | altered_mental_status | How did it start? |  |
| [ ] | ams.trauma | altered_mental_status | Recent head injury or fall? | yes |
| [ ] | ams.substances | altered_mental_status | Possible drug, alcohol or overdose exposure? | yes |
| [ ] | back_pain.duration | back_pain | How long has it been present? |  |
| [ ] | back_pain.leg_weakness | back_pain | Leg weakness or numbness? | yes |
| [ ] | back_pain.bladder_bowel | back_pain | Urinary retention, incontinence or numb groin? | yes |
| [ ] | back_pain.cancer_history | back_pain | History of cancer? |  |

## Complaints

- [ ] Chest pain (chest_pain); Arabic: ألم الصدر
- [ ] Shortness of breath (dyspnea); Arabic: ضيق التنفس
- [ ] Abdominal pain (abdominal_pain); Arabic: ألم البطن
- [ ] Headache (headache); Arabic: الصداع
- [ ] Fainting / blackout (syncope); Arabic: إغماء
- [ ] Palpitations (palpitations); Arabic: خفقان
- [ ] Fever (fever); Arabic: حمى
- [ ] Vomiting (vomiting); Arabic: قيء
- [ ] Confusion / altered mental status (altered_mental_status); Arabic: ارتباك / تغير الوعي
- [ ] Back pain (back_pain); Arabic: ألم الظهر
