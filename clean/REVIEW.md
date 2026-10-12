# Clinical content review checklist

Content pack: 2026.10.1-beta.1

Status: DRAFT — pending consultant clinical review. Doses only where verified against cited sources; all other clinical text requires sign-off (see REVIEW.md).

**Nothing below is approved until a consultant signs it off.** Mark each row `[x]` only after checking it against the source or local protocol.

## Honest limits

- Medication doses appear only where they were checked against the cited source text in this build (2025 AHA algorithms from cpr.heart.org, WAO 2020, SSC 2021). Where a dose could not be verified (for example aspirin and norepinephrine), the app shows no number.
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
| [ ] | heart2013 | Backus BE, et al. A prospective validation of the HEART score for chest pain patients at the emergency department. Int J Cardiol 2013;168(3):2153-2158. | 10.1016/j.ijcard.2013.01.255 | 23465250 | Prospective validation. |
| [ ] | edacs2014 | Than M, et al. Development and validation of the Emergency Department Assessment of Chest pain Score and 2 h accelerated diagnostic protocol. Emerg Med Australas 2014;26(1):34-44. | 10.1111/1742-6723.12164 | 24428678 | Original publication. |
| [ ] | timi2000 | Antman EM, et al. The TIMI risk score for unstable angina/non-ST elevation MI. JAMA 2000;284(7):835-842. | 10.1001/jama.284.7.835 | 10938172 | Original publication. |
| [ ] | spesi2010 | Jiménez D, et al. Simplification of the pulmonary embolism severity index for prognostication in patients with acute symptomatic pulmonary embolism. Arch Intern Med 2010;170(15):1383-1389. | 10.1001/archinternmed.2010.199 | 20696966 | Original publication. |
| [ ] | wellsdvt2003 | Wells PS, et al. Evaluation of D-dimer in the diagnosis of suspected deep-vein thrombosis. N Engl J Med 2003;349(13):1227-1235. | 10.1056/NEJMoa023153 | 14507948 | Original publication. |
| [ ] | news2017 | Royal College of Physicians. National Early Warning Score (NEWS) 2: Standardising the assessment of acute-illness severity in the NHS. Updated report of a working party. London: RCP, 2017. | — | undefined | Latest version verified in this build: 2017 (RCP). |
| [ ] | qsofa2016 | Seymour CW, et al. Assessment of Clinical Criteria for Sepsis (Sepsis-3). JAMA 2016;315(8):762-774. | 10.1001/jama.2016.0288 | 26903335 | Original publication. |
| [ ] | ssc2021 | Evans L, et al. Surviving Sepsis Campaign: International Guidelines for Management of Sepsis and Septic Shock 2021. Crit Care Med 2021;49(11):e1063-e1143. | 10.1097/CCM.0000000000005337 | 34605781 | Latest version verified in this build: 2021. A newer edition may exist; check before release. |
| [ ] | curb2003 | Lim WS, et al. Defining community acquired pneumonia severity on presentation to hospital: an international derivation and validation study. Thorax 2003;58(5):377-382. | 10.1136/thorax.58.5.377 | 12728155 | Original publication. |
| [ ] | csrs2020 | Thiruganasambandamoorthy V, et al. Multicenter Emergency Department Validation of the Canadian Syncope Risk Score. JAMA Intern Med 2020;180(5):737-744. | 10.1001/jamainternmed.2020.0288 | 32202605 | Validation study. |
| [ ] | chads2010 | Lip GYH, et al. Refining clinical risk stratification for predicting stroke and thromboembolism in atrial fibrillation using a novel risk factor-based approach. Chest 2010;137(2):263-272. | 10.1378/chest.09-1584 | 19762550 | Original publication. |
| [ ] | escaf2024 | Van Gelder IC, et al. 2024 ESC Guidelines for the management of atrial fibrillation. Eur Heart J 2024;45(36):3314-3414. | 10.1093/eurheartj/ehae176 | 39210723 | Latest version verified in this build: 2024. |
| [ ] | accaf2023 | Joglar JA, et al. 2023 ACC/AHA/ACCP/HRS Guideline for the Diagnosis and Management of Atrial Fibrillation. Circulation 2024;149(1):e1-e156. | 10.1161/CIR.0000000000001193 | 38033089 | Latest version verified in this build: 2023. |
| [ ] | hasbled2010 | Pisters R, et al. A novel user-friendly score (HAS-BLED) to assess 1-year risk of major bleeding in patients with atrial fibrillation. Chest 2010;138(5):1093-1100. | 10.1378/chest.10-0134 | 20299623 | Original publication. |
| [ ] | ottawasah2013 | Perry JJ, et al. Clinical decision rules to rule out subarachnoid hemorrhage for acute headache. JAMA 2013;310(12):1248-1255. | 10.1001/jama.2013.278018 | 24065011 | Original publication. |
| [ ] | cthead2001 | Stiell IG, et al. The Canadian CT Head Rule for patients with minor head injury. Lancet 2001;357(9266):1391-1396. | 10.1016/s0140-6736(00)04561-x | 11356436 | Original publication. |
| [ ] | cspine2001 | Stiell IG, et al. The Canadian C-spine rule for radiography in alert and stable trauma patients. JAMA 2001;286(15):1841-1848. | 10.1001/jama.286.15.1841 | 11597285 | Original publication. |
| [ ] | nexus2000 | Hoffman JR, et al. Validity of a set of clinical criteria to rule out injury to the cervical spine in patients with blunt trauma. N Engl J Med 2000;343(2):94-99. | 10.1056/NEJM200007133430203 | 10891516 | Original publication. |
| [ ] | alvarado1986 | Alvarado A. A practical score for the early diagnosis of acute appendicitis. Ann Emerg Med 1986;15(5):557-564. | 10.1016/s0196-0644(86)80993-3 | 3963537 | Original publication. |
| [ ] | gbs2000 | Blatchford O, Murray WR, Blatchford M. A risk score to predict need for treatment for upper-gastrointestinal haemorrhage. Lancet 2000;356(9238):1318-1321. | 10.1016/S0140-6736(00)02816-6 | 11073021 | Original publication. |
| [ ] | mcisaac1998 | McIsaac WJ, et al. A clinical score to reduce unnecessary antibiotic use in patients with sore throat. CMAJ 1998;158(1):75-83. | — | 9475915 | Original publication. |
| [ ] | centor1981 | Centor RM, et al. The diagnosis of strep throat in adults in the emergency room. Med Decis Making 1981;1(3):239-246. | 10.1177/0272989X8100100304 | 6763125 | Original publication. |
| [ ] | cg1976 | Cockcroft DW, Gault MH. Prediction of creatinine clearance from serum creatinine. Nephron 1976;16(1):31-41. | 10.1159/000180580 | 1244564 | Original publication. |
| [ ] | aha2025_als | Wigginton JG, et al. Part 9: Adult Advanced Life Support: 2025 American Heart Association Guidelines for CPR and ECC. Circulation 2025;152(16_suppl_2):S538-S577. | 10.1161/CIR.0000000000001376 | 41122884 | Latest version verified in this build: 2025. |
| [ ] | aha2025_special | Cao D, et al. Part 10: Adult and Pediatric Special Circumstances of Resuscitation: 2025 American Heart Association Guidelines for CPR and ECC. Circulation 2025;152(16_suppl_2):S578-S672. | 10.1161/CIR.0000000000001380 | 41122889 | Latest version verified in this build: 2025. |
| [ ] | aha2025_postarrest | Hirsch KG, et al. Part 11: Post-Cardiac Arrest Care: 2025 American Heart Association Guidelines for CPR and ECC. Circulation 2025;152(16_suppl_2):S673-S718. | 10.1161/CIR.0000000000001375 | 41122894 | Latest version verified in this build: 2025. |
| [ ] | aha2025_alg_ca | American Heart Association. Adult Cardiac Arrest Algorithm. 2025 Guidelines for CPR and ECC. | — | undefined | Latest version verified in this build: 2025. |
| [ ] | aha2025_alg_brady | American Heart Association. Adult Bradycardia With a Pulse Algorithm. 2025 Guidelines for CPR and ECC. | — | undefined | Latest version verified in this build: 2025. |
| [ ] | aha2025_alg_tachy | American Heart Association. Adult Tachyarrhythmia With a Pulse Algorithm. 2025 Guidelines for CPR and ECC. | — | undefined | Latest version verified in this build: 2025. |
| [ ] | aha2025_pals_ca | American Heart Association. Pediatric Cardiac Arrest Algorithm. 2025 Guidelines for CPR and ECC. | — | undefined | Latest version verified in this build: 2025. |
| [ ] | aha2025_pals_brady | American Heart Association. Pediatric Bradycardia With a Pulse Algorithm. 2025 Guidelines for CPR and ECC. | — | undefined | Latest version verified in this build: 2025. |
| [ ] | wao2020 | Cardona V, et al. World Allergy Organization anaphylaxis guidance 2020. World Allergy Organ J 2020;13(10):100472. | 10.1016/j.waojou.2020.100472 | 33204386 | Latest version verified in this build: 2020. |
| [ ] | anaph2023 | Golden DBK, et al. Anaphylaxis: A 2023 practice parameter update. Ann Allergy Asthma Immunol 2024;132(2):124-176. | 10.1016/j.anai.2023.09.015 | 38108678 | Latest version verified in this build: 2023. |

## Reasoning rules

### r_chest_pain

- [ ] Applies when: complaint.chest_pain = true
- Specialties: Emergency Medicine, Cardiology
- [ ] Must not miss: **Acute coronary syndrome** — Time-critical; a normal first ECG does not exclude it. (sources: cp2021, acs2025)
- [ ] Must not miss: **Pulmonary embolism** — Can present with chest pain, dyspnoea or syncope; consider early and risk-stratify. (sources: pe2019)
- [ ] Must not miss: **Acute aortic syndrome** — Missed diagnosis is rapidly fatal; consider with tearing pain, pulse or BP differences, or neurological deficit. (sources: cp2021, aorta2022)
- [ ] Must not miss: **Pneumothorax** — Causes pleuritic pain and dyspnoea; tension physiology is an emergency. (sources: cp2021)
- [ ] Relevant score: heart — Acute chest pain: risk of major adverse cardiac events.
- [ ] Relevant score: edacs — Chest pain: EDACS accelerated diagnostic protocol (with ECG and 0/2 h troponin).

### r_chest_dyspnea — Cardiopulmonary pathway

- [ ] Applies when: complaint.chest_pain = true AND complaint.dyspnea = true
- Specialties: Cardiology, Pulmonology
- [ ] Must not miss: **Acute heart failure** — Dyspnoea with chest pain may reflect ischaemia with pulmonary oedema. (sources: acs2025)
- [ ] Relevant score: wells_pe — PE is a must-not-miss cause of chest pain with dyspnoea.
- [ ] Relevant score: perc — Only if clinical suspicion for PE is low.

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
- [ ] Relevant score: csrs — Syncope without a serious cause found in the ED: 30-day risk.

### r_syncope_highrisk — High-risk syncope features

- [ ] Applies when: (hx.syncope.exertional = yes OR hx.syncope.palpitations_before = yes OR hx.syncope.family_sudden_death = yes)
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
- [ ] Relevant score: wells_pe — Dyspnoea: pre-test probability of PE.
- [ ] Relevant score: perc — Only if clinical suspicion for PE is low.

### r_abdo

- [ ] Applies when: complaint.abdominal_pain = true
- Specialties: Emergency Medicine, General Surgery, Gastroenterology
- [ ] Must not miss: **Perforation / obstruction / mesenteric ischaemia** — Surgical emergencies can be subtle early, especially in older patients. (sources: **NEEDS SOURCE**)
- [ ] Relevant score: alvarado — Abdominal pain: probability of appendicitis.

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
- [ ] Relevant score: ottawa_sah — New headache peaking within 1 hour: who needs SAH investigation.

### r_headache_flags — Neurological red flag

- [ ] Applies when: (sx.neck_stiffness = yes OR sx.focal_weakness = yes)
- Specialties: Neurology, Critical Care
- [ ] Must not miss: **CNS infection / haemorrhage / stroke** — Neck stiffness or focal weakness changes urgency. (sources: **NEEDS SOURCE**)

### r_fever

- [ ] Applies when: complaint.fever = true
- Specialties: Emergency Medicine, Infectious Diseases
- [ ] Must not miss: **Sepsis** — Fever with abnormal vital signs, altered mentation or hypotension. (sources: **NEEDS SOURCE**)
- [ ] Must not miss: **Meningitis / encephalitis** — Fever with headache, neck stiffness or altered mentation. (sources: **NEEDS SOURCE**)
- [ ] Relevant score: qsofa — Suspected infection: prompt to consider sepsis (not a stand-alone screen).

### r_fever_immuno — Fever in an immunosuppressed patient

- [ ] Applies when: complaint.fever = true AND pmh.immunosuppressed = yes
- Specialties: Infectious Diseases, Oncology / Hematology
- [ ] Must not miss: **Serious infection with atypical presentation** — Signs can be blunted; lower threshold to escalate. (sources: **NEEDS SOURCE**)

### r_vomiting

- [ ] Applies when: complaint.vomiting = true
- Specialties: Emergency Medicine, Gastroenterology
- [ ] Must not miss: **Diabetic ketoacidosis / metabolic cause** — Vomiting in diabetes should prompt glucose and ketone assessment. (sources: **NEEDS SOURCE**)
- [ ] Must not miss: **Bowel obstruction** — Particularly with bilious vomiting or abdominal distension. (sources: **NEEDS SOURCE**)

### r_vomit_blood — Possible upper GI bleeding

- [ ] Applies when: sx.vomiting_blood = yes
- Specialties: Gastroenterology, Critical Care
- [ ] Must not miss: **Upper gastrointestinal bleeding** — Haematemesis needs urgent haemodynamic assessment. (sources: **NEEDS SOURCE**)
- [ ] Relevant score: gbs — Upper GI bleeding: need for intervention.

### r_ams

- [ ] Applies when: complaint.altered_mental_status = true
- Specialties: Emergency Medicine, Neurology, Critical Care
- [ ] Must not miss: **Hypoglycaemia** — Check capillary glucose immediately; rapidly reversible. (sources: **NEEDS SOURCE**)
- [ ] Must not miss: **CNS infection / haemorrhage / stroke** — Altered consciousness may be the only sign. (sources: **NEEDS SOURCE**)
- [ ] Must not miss: **Toxic / metabolic encephalopathy** — Overdose, electrolyte, hypoxia, hepatic or uraemic causes. (sources: **NEEDS SOURCE**)
- [ ] Must not miss: **Sepsis** — Altered mentation can be the first sign in older patients. (sources: **NEEDS SOURCE**)

### r_ams_trauma — Head injury with altered consciousness

- [ ] Applies when: hx.altered_mental_status.head_injury = yes
- Specialties: Neurosurgery, Trauma Surgery
- [ ] Must not miss: **Intracranial haemorrhage** — Head injury with reduced consciousness. (sources: **NEEDS SOURCE**)
- [ ] Relevant score: ct_head — Head injury with GCS 13–15: who needs CT.

### r_back

- [ ] Applies when: complaint.back_pain = true
- Specialties: Emergency Medicine, Orthopedics
- [ ] Must not miss: **Vertebral fracture / malignancy / spinal infection** — Red flags: trauma, cancer history, fever, age, night pain. (sources: **NEEDS SOURCE**)

### r_back_cauda — Possible cord / cauda equina compression

- [ ] Applies when: (sx.leg_weakness_numbness = yes OR sx.bladder_bowel = yes)
- Specialties: Neurosurgery
- [ ] Must not miss: **Cord / cauda equina compression** — Neurological deficit or sphincter disturbance is time-critical. (sources: **NEEDS SOURCE**)

### r_back_aorta

- [ ] Applies when: complaint.back_pain = true AND patient.age >= 50
- Specialties: Vascular Surgery
- [ ] Must not miss: **Acute aortic syndrome** — Missed diagnosis is rapidly fatal; consider with tearing pain, pulse or BP differences, or neurological deficit. (sources: cp2021, aorta2022)
- [ ] Must not miss: **Abdominal aortic aneurysm (rupture)** — Back pain with hypotension or syncope in older patients. (sources: aorta2022)

### r_acs_considered

- [ ] Applies when: dx.consider.acs ?
- Specialties: Cardiology
- [ ] Relevant score: timi — ACS under consideration: 14-day risk (UA/NSTEMI).

### r_pe_considered

- [ ] Applies when: dx.consider.pe ?
- Specialties: Pulmonology
- [ ] Relevant score: spesi — Once PE is confirmed: 30-day mortality risk.

### r_pneumonia — Possible lower respiratory tract infection

- [ ] Applies when: (complaint.dyspnea = true OR complaint.fever = true) AND sx.cough = yes
- Specialties: Pulmonology, Infectious Diseases
- [ ] Must not miss: **Pneumonia** — Cough with fever or dyspnoea; assess severity. (sources: **NEEDS SOURCE**)
- [ ] Relevant score: curb65 — Suspected community-acquired pneumonia: severity.

### r_af — Atrial fibrillation / flutter on ECG

- [ ] Applies when: (ecg.rhythm = af OR ecg.rhythm = flutter)
- Specialties: Cardiology
- [ ] Relevant score: chadsvasc — AF: thromboembolic risk.
- [ ] Relevant score: hasbled — AF: bleeding risk if anticoagulated.

### r_dvt

- [ ] Applies when: (sx.leg_swelling = yes OR sx.unilateral_leg_swelling = yes)
- Specialties: Vascular Medicine
- [ ] Must not miss: **Deep vein thrombosis** — Leg swelling, especially unilateral, may be DVT; associated with PE. (sources: pe2019)
- [ ] Relevant score: wells_dvt — Leg swelling: pre-test probability of DVT.

## Scores (deterministic engine)

| Sign-off | Score | Inputs | Sources | Notes |
|---|---|---|---|---|
| [ ] | HEART score | History; ECG; Age; Risk factors; Troponin | heart2008, heart2013 | Not for STEMI or haemodynamically unstable patients. History item is a clinician judgement. Troponin assay and timing matter; use with a validated accelerated pathway. |
| [ ] | EDACS | Age; Male sex; Age 18–50 with known CAD or 3+ risk factors; Diaphoresis; Radiates to arm, shoulder, neck or jaw; Pain occurred or worsened with inspiration; Pain reproduced by palpation | edacs2014 | Low risk requires EDACS below 16 AND no new ischaemia on ECG AND negative troponin at 0 and 2 hours. Point weights pending consultant check against the full paper. |
| [ ] | TIMI risk score (UA/NSTEMI) | Age 65 or more; 3 or more CAD risk factors; Known coronary stenosis of 50% or more; Aspirin in the last 7 days; Two or more anginal episodes in 24 h; ST deviation of 0.5 mm or more; Elevated cardiac marker | timi2000 | Derived in trial patients with UA/NSTEMI, not undifferentiated ED chest pain. "Known CAD" here stands in for prior coronary stenosis of 50% or more. |
| [ ] | Wells score for PE | Clinical signs of DVT; PE most likely diagnosis; Heart rate above 100; Surgery or immobilisation in the last 4 weeks; Previous DVT or PE; Haemoptysis; Malignancy | wells2000, pe2019 | "PE most likely" is a clinician judgement. Use with D-dimer and imaging per a validated strategy. |
| [ ] | PERC rule | Age 50 or more; Heart rate 100 or more; SpO2 below 95%; Unilateral leg swelling; Haemoptysis; Recent trauma or surgery; Previous DVT or PE; Hormone use | perc2004 | Only valid when clinical gestalt for PE is low. Low specificity; it can only rule out, never rule in. |
| [ ] | Simplified PESI | Age above 80; Cancer; Chronic cardiopulmonary disease; Heart rate 110 or more; Systolic BP below 100; SpO2 below 90% | spesi2010, pe2019 | For confirmed PE only. Thresholds pending consultant check against the full paper. |
| [ ] | Wells score for DVT | Active cancer; Paralysis, paresis or plaster of the leg; Bedridden 3+ days or major surgery within 12 weeks; Tenderness along deep veins; Entire leg swollen; Calf swelling 3 cm or more; Pitting oedema (symptomatic leg); Collateral superficial veins; Previously documented DVT; Alternative diagnosis at least as likely | wellsdvt2003 | Point list pending consultant check against the full paper. Use with D-dimer and ultrasound per local pathway. |
| [ ] | NEWS2 | Respiration rate; SpO2; Air or oxygen; Systolic BP; Pulse; Consciousness; Temperature | news2017 | Not validated in pregnancy or under 16 years. Scale 2 SpO2 only when a target of 88–92% is prescribed. Per-band points pending consultant check against the official RCP chart. |
| [ ] | qSOFA | Respiratory rate 22 or more; Systolic BP 100 or less; Altered mentation | qsofa2016, ssc2021 | Surviving Sepsis Campaign 2021 recommends against qSOFA as a single screening tool compared with SIRS, NEWS or MEWS. A score below 2 does not exclude sepsis. |
| [ ] | CURB-65 | Confusion (new); Urea above 7 mmol/L; Respiratory rate 30 or more; Low BP (SBP below 90 or DBP 60 or less); Age 65 or more | curb2003 | For community-acquired pneumonia only. Does not replace clinical judgement or account for comorbidity and oxygenation. |
| [ ] | Canadian Syncope Risk Score | Predisposition to vasovagal symptoms; History of heart disease; Any SBP below 90 or above 180 in the ED; Troponin above the 99th percentile; Abnormal QRS axis (below −30° or above 100°); QRS duration above 130 ms; QTc above 480 ms; ED diagnosis | csrs2016, csrs2020 | Only after ED evaluation found no serious cause. Point weights and categories pending consultant check against the full papers. |
| [ ] | CHA₂DS₂-VASc | Congestive heart failure; Hypertension; Age; Diabetes; Stroke, TIA or thromboembolism; Vascular disease (MI, PAD); Sex category (female) | chads2010, escaf2024, accaf2023 | For non-valvular AF. Anticoagulation decisions follow the current AF guideline and bleeding risk. |
| [ ] | HAS-BLED | Uncontrolled hypertension; Abnormal renal function; Abnormal liver function; Stroke; Bleeding history or predisposition; Labile INR; Elderly (above 65); Drugs (antiplatelet / NSAID); Alcohol | hasbled2010 | Use to identify modifiable bleeding risks, not to withhold anticoagulation by itself. Item definitions pending consultant check. |
| [ ] | Ottawa SAH Rule | Age 40 or more; Neck pain or stiffness; Witnessed loss of consciousness; Onset during exertion; Thunderclap (instantly peaking); Limited neck flexion | ottawasah2013 | Not for patients with new neurological deficits, previous aneurysm, SAH or brain tumour, or recurrent similar headaches. A positive rule means investigate; it does not diagnose SAH. |
| [ ] | Canadian CT Head Rule | High risk: GCS below 15 at 2 hours; High risk: suspected open or depressed skull fracture; High risk: signs of basal skull fracture; High risk: vomiting 2 or more episodes; High risk: age 65 or more; Medium risk: amnesia 30 min or more before impact; Medium risk: dangerous mechanism | cthead2001 | Not for patients on anticoagulants, with seizure after injury, or obvious open skull fracture. The vomiting item is defined as 2 or more episodes in the published rule; confirm with the full paper. |
| [ ] | Alvarado score | Migration of pain to the RIF; Anorexia; Nausea or vomiting; Tenderness in the RIF; Rebound tenderness; Temperature 37.3 °C or more; Leukocytosis (WBC above 10); Shift to the left (neutrophils above 75%) | alvarado1986 | Retrospective derivation; point weights pending consultant check against the full paper. Imaging decisions follow local pathway; use caution in pregnancy and the elderly. |
| [ ] | Glasgow-Blatchford score | Blood urea; Haemoglobin; Systolic BP; Pulse 100 or more; Melaena; Syncope; Hepatic disease; Cardiac failure | gbs2000 | Band thresholds pending consultant check against the full paper. Low-score discharge thresholds differ between guidelines. |

## Investigations (rules)

### i_chest
- [ ] Applies when: complaint.chest_pain = true
- [ ] NOW: ecg — Acute chest pain: identify STEMI and ischaemia early (guideline: ECG within 10 minutes of arrival). (sources: cp2021)
- [ ] NOW: troponin — Myocardial injury assessment; use with a validated accelerated pathway. (sources: cp2021, acs2025)
- [ ] SOON: cxr — Looks for alternative causes: pneumothorax, pneumonia, widened mediastinum. (sources: cp2021)
- [ ] NOW: monitor — Arrhythmia risk while ACS is not excluded. (sources: **NEEDS SOURCE**)

### i_chest_back
- [ ] Applies when: complaint.chest_pain = true AND hx.chest_pain.radiation = back
- [ ] CONSIDER: cta_aorta — Chest pain radiating to the back: imaging if acute aortic syndrome is suspected. (sources: aorta2022)

### i_dyspnea
- [ ] Applies when: complaint.dyspnea = true
- [ ] NOW: ecg — Dyspnoea: ischaemia, arrhythmia, right heart strain. (sources: **NEEDS SOURCE**)
- [ ] NOW: cxr — Pneumothorax, consolidation, pulmonary oedema, effusion. (sources: **NEEDS SOURCE**)
- [ ] SOON: blood_gas — Gas exchange and acid–base status when hypoxic or tachypnoeic. (sources: **NEEDS SOURCE**)
- [ ] CONSIDER: bnp — Supports or argues against heart failure as the cause. (sources: **NEEDS SOURCE**)

### i_hypox
- [ ] Applies when: vitals.spo2 ?
- [ ] NOW: blood_gas — SpO2 below 94%: assess oxygenation, ventilation and acid–base. (sources: **NEEDS SOURCE**)

### i_pe_ddimer
- [ ] Applies when: score.wells_pe.total <= 4 AND score.perc.label != negative
- [ ] SOON: d_dimer — PE unlikely by Wells: a negative D-dimer can exclude PE. (sources: pe2019, wells2000)

### i_pe_perc_neg
- [ ] Applies when: score.perc.label = negative
- [ ] NOT_ROUTINE: d_dimer — PERC negative in a low-suspicion patient: further PE testing not routinely needed. (sources: perc2004)

### i_pe_likely
- [ ] Applies when: score.wells_pe.total ?
- [ ] NOW: ctpa — PE likely by Wells: proceed to imaging (D-dimer not used to exclude). (sources: pe2019, wells2000)

### i_syncope
- [ ] Applies when: complaint.syncope = true
- [ ] NOW: ecg — Syncope: initial evaluation includes a 12-lead ECG. (sources: syncope2017)
- [ ] NOW: glucose_cap — Hypoglycaemia can mimic syncope. (sources: **NEEDS SOURCE**)
- [ ] SOON: orthostatic — Orthostatic hypotension as a cause. (sources: syncope2017)
- [ ] CONSIDER: cbc — Targeted: if bleeding or anaemia suspected (routine panels are not recommended). (sources: syncope2017)
- [ ] CONSIDER: troponin — Targeted: if a cardiac cause is suspected. (sources: syncope2017)

### i_preg
- [ ] Applies when: patient.sex = female AND patient.age >= 12 AND patient.age <= 55 AND (complaint.abdominal_pain = true OR complaint.syncope = true OR complaint.vomiting = true)
- [ ] NOW: hcg — Woman of child-bearing age: pregnancy status changes diagnosis (ectopic) and imaging/drug choices. (sources: **NEEDS SOURCE**)

### i_palp
- [ ] Applies when: complaint.palpitations = true
- [ ] NOW: ecg — Capture the rhythm, pre-excitation and QT. (sources: **NEEDS SOURCE**)
- [ ] SOON: ue — Potassium and renal function. (sources: **NEEDS SOURCE**)
- [ ] SOON: mg — Magnesium abnormalities provoke arrhythmia. (sources: **NEEDS SOURCE**)
- [ ] CONSIDER: tsh — Thyrotoxicosis as a trigger. (sources: **NEEDS SOURCE**)
- [ ] CONSIDER: cbc — Anaemia as a trigger. (sources: **NEEDS SOURCE**)

### i_fever
- [ ] Applies when: complaint.fever = true
- [ ] SOON: cbc — Infection work-up. (sources: **NEEDS SOURCE**)
- [ ] SOON: crp — Supports infection assessment. (sources: **NEEDS SOURCE**)
- [ ] SOON: urinalysis — Urinary source. (sources: **NEEDS SOURCE**)

### i_sepsis
- [ ] Applies when: (score.qsofa.total >= 2 OR score.news2.total >= 5 OR complaint.fever = true AND vitals.sbp <= 90)
- [ ] NOW: lactate — Possible sepsis: lactate guides resuscitation. (sources: ssc2021)
- [ ] NOW: blood_cultures — Possible sepsis: cultures before antimicrobials when this does not delay them. (sources: ssc2021)
- [ ] NOW: ue — Organ dysfunction assessment. (sources: **NEEDS SOURCE**)

### i_resp_infection
- [ ] Applies when: (complaint.dyspnea = true OR complaint.fever = true) AND sx.cough = yes
- [ ] SOON: cxr — Cough with fever or dyspnoea: pneumonia. (sources: **NEEDS SOURCE**)
- [ ] SOON: ue — Urea is needed for CURB-65. (sources: curb2003)

### i_meningism
- [ ] Applies when: sx.neck_stiffness = yes AND (complaint.fever = true OR sx.fever = yes)
- [ ] NOW: blood_cultures — Fever with neck stiffness: possible meningitis. (sources: **NEEDS SOURCE**)
- [ ] CONSIDER: lp — CSF analysis if no contraindication (CT first when indicated). (sources: **NEEDS SOURCE**)

### i_vomit
- [ ] Applies when: complaint.vomiting = true
- [ ] SOON: ue — Dehydration, electrolytes and renal function. (sources: **NEEDS SOURCE**)
- [ ] SOON: glucose_cap — Hyper- or hypoglycaemia. (sources: **NEEDS SOURCE**)

### i_vomit_dm
- [ ] Applies when: complaint.vomiting = true AND pmh.diabetes = yes
- [ ] NOW: ketones — Vomiting in diabetes: exclude ketoacidosis. (sources: **NEEDS SOURCE**)
- [ ] NOW: blood_gas — Acid–base status if ketoacidosis suspected. (sources: **NEEDS SOURCE**)

### i_ugib
- [ ] Applies when: sx.vomiting_blood = yes
- [ ] NOW: cbc — Haematemesis: haemoglobin. (sources: **NEEDS SOURCE**)
- [ ] NOW: group_screen — Prepare for transfusion. (sources: **NEEDS SOURCE**)
- [ ] SOON: coag — Coagulopathy and anticoagulant effect. (sources: **NEEDS SOURCE**)
- [ ] NOW: ue — Urea is needed for the Glasgow-Blatchford score. (sources: gbs2000)

### i_abdo
- [ ] Applies when: complaint.abdominal_pain = true
- [ ] SOON: cbc — Infection or bleeding. (sources: **NEEDS SOURCE**)
- [ ] SOON: lipase — Pancreatitis. (sources: **NEEDS SOURCE**)
- [ ] SOON: urinalysis — Urinary tract infection or stones. (sources: **NEEDS SOURCE**)
- [ ] CONSIDER: lft — Biliary or hepatic cause. (sources: **NEEDS SOURCE**)

### i_abdo_old
- [ ] Applies when: complaint.abdominal_pain = true AND patient.age >= 50
- [ ] SOON: ecg — Older patients: myocardial ischaemia can present as upper abdominal pain. (sources: **NEEDS SOURCE**)
- [ ] CONSIDER: pocus_aorta — Exclude abdominal aortic aneurysm. (sources: aorta2022)

### i_headache_sah
- [ ] Applies when: (score.ottawa_sah.label = positive OR hx.headache.thunderclap = yes OR sx.focal_weakness = yes)
- [ ] NOW: ct_head — Possible SAH or other intracranial cause. (sources: ottawasah2013)
- [ ] CONSIDER: lp — If CT is negative and SAH is still suspected (timing-dependent). (sources: **NEEDS SOURCE**)

### i_headache_old
- [ ] Applies when: complaint.headache = true AND patient.age >= 50
- [ ] CONSIDER: esr — New headache over 50: giant cell arteritis. (sources: **NEEDS SOURCE**)
- [ ] CONSIDER: crp — New headache over 50: giant cell arteritis. (sources: **NEEDS SOURCE**)

### i_ams
- [ ] Applies when: complaint.altered_mental_status = true
- [ ] NOW: glucose_cap — Hypoglycaemia is rapidly reversible. (sources: **NEEDS SOURCE**)
- [ ] NOW: blood_gas — Hypoxia, hypercapnia, acid–base and electrolytes. (sources: **NEEDS SOURCE**)
- [ ] SOON: ue — Sodium, uraemia. (sources: **NEEDS SOURCE**)
- [ ] SOON: ecg — Arrhythmia, toxic effects. (sources: **NEEDS SOURCE**)

### i_ams_head
- [ ] Applies when: (hx.altered_mental_status.head_injury = yes OR complaint.altered_mental_status = true AND sx.focal_weakness = yes)
- [ ] NOW: ct_head — Altered consciousness with head injury or focal deficit. (sources: cthead2001)

### i_ams_tox
- [ ] Applies when: hx.altered_mental_status.substances = yes
- [ ] SOON: tox_levels — Possible overdose: co-ingestion is common and may be silent. (sources: **NEEDS SOURCE**)

### i_back_cauda
- [ ] Applies when: (sx.leg_weakness_numbness = yes OR sx.bladder_bowel = yes)
- [ ] NOW: mri_spine — Neurological deficit or sphincter disturbance: possible cord or cauda equina compression. (sources: **NEEDS SOURCE**)

### i_back_old
- [ ] Applies when: complaint.back_pain = true AND patient.age >= 50
- [ ] CONSIDER: pocus_aorta — Back pain over 50: exclude aortic aneurysm. (sources: aorta2022)

### i_back_simple
- [ ] Applies when: complaint.back_pain = true AND sx.leg_weakness_numbness = no AND sx.bladder_bowel = no AND pmh.cancer = no
- [ ] NOT_ROUTINE: spine_imaging — No red flags recorded: imaging is not routinely indicated for non-specific back pain. (sources: **NEEDS SOURCE**)

### i_dvt
- [ ] Applies when: score.wells_dvt.total >= 2
- [ ] NOW: us_dvt — DVT likely by Wells: compression ultrasound. (sources: wellsdvt2003)

### i_dvt_unlikely
- [ ] Applies when: score.wells_dvt.total ?
- [ ] SOON: d_dimer — DVT unlikely by Wells: a negative D-dimer can exclude DVT. (sources: wellsdvt2003)

## Medications (doses only where verified)

### Epinephrine (adrenaline)
- [ ] Cardiac arrest (adult, IV/IO): fixed:1,unit:mg · every 3–5 minutes · source aha2025_alg_ca · quoted: “1 mg every 3-5 minutes”
- [ ] Cardiac arrest (paediatric, IV/IO): perKg:0.01,unit:mg,max:1 · every 3–5 minutes · source aha2025_pals_ca · quoted: “0.01 mg/kg (0.1 mg/mL concentration). Max dose 1 mg.”
- [ ] Anaphylaxis (all, IM, anterolateral thigh): perKg:0.01,unit:mg,max:0.5 · repeat every 5–15 minutes if symptoms are refractory · source wao2020 · quoted: “0.01 mg/kg of body weight, to a maximum total dose of 0.5 mg, given by the intramuscular route”
- [ ] Bradycardia (infusion) (adult, IV infusion): range:[2,10],unit:mcg/min · continuous; titrate to response · source aha2025_alg_brady · quoted: “2-10 mcg per minute infusion”
- [ ] Bradycardia (paediatric, IV/IO): perKg:0.01,unit:mg,max:1 · per PALS bradycardia algorithm · source aha2025_pals_brady · quoted: “0.01 mg/kg (0.1 mg/mL concentration. Maximum dose 1 mg).”
- [ ] 7-line text (target, titration, max, adjustment, adverse/contraindications, management) — pending review

### Amiodarone
- [ ] Shock-refractory VF / pulseless VT (adult, IV/IO bolus): fixed:300,unit:mg · second dose 150 mg · source aha2025_alg_ca · quoted: “First dose: 300 mg bolus. Second dose: 150 mg.”
- [ ] Stable wide-QRS tachycardia (adult, IV over 10 minutes): fixed:150,unit:mg · repeat as needed if VT recurs; then 1 mg/min infusion for the first 6 hours · source aha2025_alg_tachy · quoted: “First dose: 150 mg over 10 minutes… maintenance infusion of 1 mg/min for first 6 hours.”
- [ ] Shock-refractory VF / pulseless VT (paediatric, IV/IO bolus): perKg:5,unit:mg,max:300 · may repeat up to 3 doses (max 150 mg for subsequent doses) · source aha2025_pals_ca · quoted: “5 mg/kg bolus (max 300 mg). May repeat up to 3 doses (max 150 mg subsequent doses).”
- [ ] 7-line text (target, titration, max, adjustment, adverse/contraindications, management) — pending review

### Lidocaine (lignocaine)
- [ ] Shock-refractory VF / pulseless VT (adult, IV/IO): perKgRange:[1,1.5],unit:mg · second dose 0.5–0.75 mg/kg · source aha2025_alg_ca · quoted: “First dose: 1-1.5 mg/kg. Second dose: 0.5-0.75 mg/kg.”
- [ ] Shock-refractory VF / pulseless VT (paediatric, IV/IO): perKg:1,unit:mg · alternative to amiodarone · source aha2025_pals_ca · quoted: “Lidocaine IV/IO dose: 1 mg/kg”
- [ ] 7-line text (target, titration, max, adjustment, adverse/contraindications, management) — pending review

### Adenosine
- [ ] Regular narrow-complex tachycardia (SVT) (adult, Rapid IV push followed by saline flush): fixed:6,unit:mg · second dose 12 mg if required · source aha2025_alg_tachy · quoted: “First dose: 6 mg rapid IV push; follow with NS flush. Second dose: 12 mg if required.”
- [ ] 7-line text (target, titration, max, adjustment, adverse/contraindications, management) — pending review

### Atropine
- [ ] Symptomatic bradycardia (adult, IV bolus): fixed:1,unit:mg · repeat every 3–5 minutes · source aha2025_alg_brady · quoted: “First dose: 1 mg bolus. Repeat every 3-5 minutes. Maximum total dose: 3 mg.”
- [ ] Bradycardia (paediatric, IV/IO): perKg:0.02,unit:mg,min:0.1,max:0.5 · may repeat once · source aha2025_pals_brady · quoted: “0.02 mg/kg. May repeat once. Minimum dose 0.1 mg and maximum single dose 0.5 mg.”
- [ ] 7-line text (target, titration, max, adjustment, adverse/contraindications, management) — pending review

### Dopamine
- [ ] Bradycardia (atropine ineffective) (adult, IV infusion): range:[5,20],unit:mcg/kg/min · titrate to response; taper slowly · source aha2025_alg_brady · quoted: “5-20 mcg/kg per minute. Titrate to patient response; taper slowly.”
- [ ] 7-line text (target, titration, max, adjustment, adverse/contraindications, management) — pending review

### Procainamide
- [ ] Stable wide-QRS tachycardia (adult, IV infusion): range:[20,50],unit:mg/min · until arrhythmia suppressed, hypotension, QRS widens by more than 50%, or maximum 17 mg/kg; maintenance 1–4 mg/min · source aha2025_alg_tachy · quoted: “20-50 mg/min until arrhythmia suppressed, hypotension ensues, QRS duration increases >50%, or maximum dose 17 mg/kg given. Maintenance infusion: 1-4 mg/min. Avoid if prolonged QT or CHF.”
- [ ] 7-line text (target, titration, max, adjustment, adverse/contraindications, management) — pending review

### Glucagon
- [ ] Refractory anaphylaxis with β-blocker exposure (adult, IV): range:[1,5],unit:mg · Class 2b — may be reasonable · source aha2025_special · quoted: “1–5 mg IV in adults”
- [ ] Refractory anaphylaxis with β-blocker exposure (paediatric, IV push): perKgRange:[20,30],unit:mcg,max:1000 · Class 2b — may be reasonable; up to 1 mg · source aha2025_special · quoted: “20–30 mcg/kg IV push up to 1 mg in children”
- [ ] 7-line text (target, titration, max, adjustment, adverse/contraindications, management) — pending review

### IV crystalloid
- [ ] Anaphylaxis with cardiovascular instability (all, IV bolus): perKg:20,unit:mL · bolus; reassess · source wao2020 · quoted: “intravenous fluids to patients with cardiovascular instability (20 mL/kg bolus using crystalloids)”
- [ ] Sepsis-induced hypoperfusion or septic shock (adult, IV): perKg:30,unit:mL · at least this volume within the first 3 hours (weak recommendation) · source ssc2021 · quoted: “at least 30 mL/kg of intravenous (IV) crystalloid fluid should be given within the first 3 h of resuscitation”
- [ ] 7-line text (target, titration, max, adjustment, adverse/contraindications, management) — pending review

### Norepinephrine (noradrenaline)
- [ ] Septic shock (first-line vasopressor) (adult, IV infusion): **NO VERIFIED DOSE — local protocol** · target MAP 65 mmHg initially · source ssc2021 · quoted: “norepinephrine as the first-line agent over other vasopressors”; “initial target mean arterial pressure (MAP) of 65 mm Hg”
- [ ] 7-line text (target, titration, max, adjustment, adverse/contraindications, management) — pending review

### Aspirin
- [ ] Suspected acute coronary syndrome (adult, Oral (chewed)): **NO VERIFIED DOSE — local protocol** · — · source acs2025 · quoted: Dose not verified in this build (guideline full text not accessible here).
- [ ] 7-line text (target, titration, max, adjustment, adverse/contraindications, management) — pending review

## Medication context rules

- [ ] m_brady: vitals.hr ? → atropine/brady, epinephrine/brady_infusion, dopamine/brady, atropine/brady_ped, epinephrine/brady_ped — Heart rate below 50: if bradycardia is causing symptoms or instability (2025 AHA bradycardia algorithm).
- [ ] m_svt: ecg.rhythm = svt → adenosine/svt — Regular narrow-complex tachycardia: vagal manoeuvres, then adenosine if stable.
- [ ] m_vt: ecg.rhythm = vt → amiodarone/vt_stable, procainamide/vt_stable — Wide-complex tachycardia: antiarrhythmic if stable; synchronized cardioversion if unstable.
- [ ] m_anaph: dx.consider.anaphylaxis ? → epinephrine/anaphylaxis, crystalloid/anaphylaxis, glucagon/anaph_bb, glucagon/anaph_bb_ped — Anaphylaxis under consideration: IM epinephrine is first-line (WAO 2020).
- [ ] m_sepsis: (score.qsofa.total >= 2 OR score.news2.total >= 5 OR dx.consider.sepsis ?) → crystalloid/sepsis, norepinephrine/septic_shock — Possible sepsis with hypoperfusion: fluids and, for septic shock, norepinephrine (SSC 2021).
- [ ] m_acs: dx.consider.acs ? → aspirin/acs — ACS under consideration.

## ICD-10 mapping (WHO ICD-10)

WHO ICD-10. Check the coding system used by your institution (e.g. ICD-10-AM or ICD-10-CM) before submitting.

| Sign-off | Key | Code | Label |
|---|---|---|---|
| [ ] | complaint: chest_pain | R07.4 | Chest pain, unspecified |
| [ ] | complaint: dyspnea | R06.0 | Dyspnoea |
| [ ] | complaint: abdominal_pain | R10.4 | Other and unspecified abdominal pain |
| [ ] | complaint: headache | R51 | Headache |
| [ ] | complaint: syncope | R55 | Syncope and collapse |
| [ ] | complaint: palpitations | R00.2 | Palpitations |
| [ ] | complaint: fever | R50.9 | Fever, unspecified |
| [ ] | complaint: vomiting | R11 | Nausea and vomiting |
| [ ] | complaint: altered_mental_status | R41.0 | Disorientation, unspecified |
| [ ] | complaint: back_pain | M54.9 | Dorsalgia, unspecified |
| [ ] | diagnosis: acs | I24.9 | Acute ischaemic heart disease, unspecified |
| [ ] | diagnosis: pe | I26.9 | Pulmonary embolism without mention of acute cor pulmonale |
| [ ] | diagnosis: aortic_dissection | I71.0 | Dissection of aorta [any part] |
| [ ] | diagnosis: pneumothorax | J93.9 | Pneumothorax, unspecified |
| [ ] | diagnosis: heart_failure | I50.9 | Heart failure, unspecified |
| [ ] | diagnosis: anaphylaxis | T78.2 | Anaphylactic shock, unspecified |
| [ ] | diagnosis: pneumonia | J18.9 | Pneumonia, unspecified |
| [ ] | diagnosis: sepsis | A41.9 | Sepsis, unspecified |
| [ ] | diagnosis: meningitis | G03.9 | Meningitis, unspecified |
| [ ] | diagnosis: sah | I60.9 | Subarachnoid haemorrhage, unspecified |
| [ ] | diagnosis: stroke_ich | I64 | Stroke, not specified as haemorrhage or infarction |
| [ ] | diagnosis: arrhythmia | I49.9 | Cardiac arrhythmia, unspecified |
| [ ] | diagnosis: unstable_arrhythmia | I49.9 | Cardiac arrhythmia, unspecified |
| [ ] | diagnosis: dvt | I80.2 | Phlebitis and thrombophlebitis of other deep vessels of lower extremities |
| [ ] | diagnosis: ugib | K92.2 | Gastrointestinal haemorrhage, unspecified |
| [ ] | diagnosis: ectopic | O00.9 | Ectopic pregnancy, unspecified |
| [ ] | diagnosis: aaa | I71.3 | Abdominal aortic aneurysm, ruptured |
| [ ] | diagnosis: hypoglycaemia | E16.2 | Hypoglycaemia, unspecified |
| [ ] | diagnosis: cauda_equina | G83.4 | Cauda equina syndrome |
| [ ] | diagnosis: obstruction | K56.6 | Other and unspecified intestinal obstruction |
| [ ] | diagnosis: intracranial_bleed | I62.9 | Intracranial haemorrhage (nontraumatic), unspecified |

## Return precautions (DRAFT wording)

- [ ] chest_pain: Chest pain that comes back, gets worse or lasts more than a few minutes / Pain spreading to the arm, jaw or back, or with sweating or nausea / Shortness of breath or fainting
- [ ] dyspnea: Breathing that becomes harder / Chest pain, blue lips or coughing blood / Confusion or drowsiness
- [ ] abdominal_pain: Pain that becomes worse or constant / Vomiting that does not stop, or blood in vomit or stool / Fever, fainting, or vaginal bleeding in pregnancy
- [ ] headache: A sudden, very severe headache / Weakness, numbness, trouble speaking or seeing / Neck stiffness with fever, confusion or a seizure
- [ ] syncope: Another faint, especially during exercise / Chest pain, palpitations or shortness of breath / An injury from falling
- [ ] palpitations: Palpitations with chest pain, fainting or breathlessness / A fast heartbeat that does not settle
- [ ] fever: Drowsiness or confusion / A rash that does not fade when pressed / Neck stiffness, difficulty breathing, or not passing urine
- [ ] vomiting: Unable to keep fluids down / Blood or green fluid in the vomit / Severe abdominal pain or drowsiness
- [ ] altered_mental_status: Any new confusion or drowsiness / A seizure or new weakness
- [ ] back_pain: Weakness or numbness in the legs / Problems passing urine or controlling the bowels / Numbness around the genitals or buttocks, fever, or uncontrolled pain

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
