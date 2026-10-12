// Medication library. RULE: a dose appears ONLY when it was verified against the cited source in this build.
// Where no dose was verified, `dose` is null and the app says so (never a guessed number).
// Non-dose pharmacology text (adverse effects, cautions) is general knowledge marked pending consultant review.
//
// dose shapes:
//   { fixed: n, unit }                      e.g. 1 mg
//   { range: [a, b], unit }                 e.g. 2–10 mcg/min (infusion, titrated)
//   { perKg: n, unit, max?, min? }          weight-based, capped
//   { perKgRange: [a, b], unit, max? }      weight-based range
// pop: adult | paediatric | all

export const DRUG_REVIEW = 'Doses verified against the cited 2025 AHA algorithms, WAO 2020 or SSC 2021 in this build. All other text pending consultant review.';

export const DRUGS = [
  {
    id: 'epinephrine', name: 'Epinephrine (adrenaline)', synonyms: ['adrenaline', 'epi', 'أدرينالين'], cls: 'Catecholamine / vasopressor', icon: ['syringe', 'red'],
    uses: [
      { id: 'arrest', label: 'Cardiac arrest', pop: 'adult', route: 'IV/IO', dose: { fixed: 1, unit: 'mg' }, freq: 'every 3–5 minutes', source: 'aha2025_alg_ca', ref: '“1 mg every 3-5 minutes”' },
      { id: 'arrest_ped', label: 'Cardiac arrest', pop: 'paediatric', route: 'IV/IO', dose: { perKg: 0.01, unit: 'mg', max: 1 }, conc: '0.1 mg/mL', freq: 'every 3–5 minutes', source: 'aha2025_pals_ca', ref: '“0.01 mg/kg (0.1 mg/mL concentration). Max dose 1 mg.”' },
      { id: 'anaphylaxis', label: 'Anaphylaxis', pop: 'all', route: 'IM, anterolateral thigh', dose: { perKg: 0.01, unit: 'mg', max: 0.5 }, conc: '1 mg/mL', freq: 'repeat every 5–15 minutes if symptoms are refractory', source: 'wao2020', ref: '“0.01 mg/kg of body weight, to a maximum total dose of 0.5 mg, given by the intramuscular route”' },
      { id: 'brady_infusion', label: 'Bradycardia (infusion)', pop: 'adult', route: 'IV infusion', dose: { range: [2, 10], unit: 'mcg/min' }, freq: 'continuous; titrate to response', source: 'aha2025_alg_brady', ref: '“2-10 mcg per minute infusion”' },
      { id: 'brady_ped', label: 'Bradycardia', pop: 'paediatric', route: 'IV/IO', dose: { perKg: 0.01, unit: 'mg', max: 1 }, conc: '0.1 mg/mL', freq: 'per PALS bradycardia algorithm', source: 'aha2025_pals_brady', ref: '“0.01 mg/kg (0.1 mg/mL concentration. Maximum dose 1 mg).”' },
    ],
    seven: {
      target: 'Cardiac arrest: return of spontaneous circulation. Anaphylaxis: resolution of airway, breathing and circulatory compromise. Bradycardia: adequate perfusion.',
      titration: 'Infusions are titrated to clinical response (2025 AHA bradycardia algorithm).',
      max: 'Per dose: 1 mg (cardiac arrest, adult and paediatric); 0.5 mg IM (anaphylaxis).',
      adjust: ['Children: weight-based dosing only; adult doses are never applied to a child.', 'Ischaemic heart disease and older patients: higher risk of ischaemia and arrhythmia — monitor ECG.'],
      adverse: ['Tachyarrhythmias, hypertension, myocardial ischaemia, tremor, anxiety.', 'IV bolus outside cardiac arrest can cause potentially fatal arrhythmias; IV is not recommended for initial anaphylaxis treatment (WAO 2020).'],
      contraindications: ['In anaphylaxis and cardiac arrest, benefit generally outweighs risk; use the correct concentration and route.'],
      management: ['Stop or reduce the infusion; continuous ECG and BP monitoring.', 'Treat arrhythmias per the ACLS algorithms.'],
    },
    monitoring: ['Continuous ECG', 'Blood pressure', 'Response of airway, breathing and circulation'],
  },
  {
    id: 'amiodarone', name: 'Amiodarone', synonyms: ['cordarone', 'أميودارون'], cls: 'Class III antiarrhythmic', icon: ['heart', 'pink'],
    uses: [
      { id: 'vf', label: 'Shock-refractory VF / pulseless VT', pop: 'adult', route: 'IV/IO bolus', dose: { fixed: 300, unit: 'mg' }, freq: 'second dose 150 mg', second: { fixed: 150, unit: 'mg' }, source: 'aha2025_alg_ca', ref: '“First dose: 300 mg bolus. Second dose: 150 mg.”' },
      { id: 'vt_stable', label: 'Stable wide-QRS tachycardia', pop: 'adult', route: 'IV over 10 minutes', dose: { fixed: 150, unit: 'mg' }, freq: 'repeat as needed if VT recurs; then 1 mg/min infusion for the first 6 hours', source: 'aha2025_alg_tachy', ref: '“First dose: 150 mg over 10 minutes… maintenance infusion of 1 mg/min for first 6 hours.”' },
      { id: 'vf_ped', label: 'Shock-refractory VF / pulseless VT', pop: 'paediatric', route: 'IV/IO bolus', dose: { perKg: 5, unit: 'mg', max: 300 }, freq: 'may repeat up to 3 doses (max 150 mg for subsequent doses)', source: 'aha2025_pals_ca', ref: '“5 mg/kg bolus (max 300 mg). May repeat up to 3 doses (max 150 mg subsequent doses).”' },
    ],
    seven: {
      target: 'Termination or control of ventricular arrhythmia.',
      titration: 'Stable VT: bolus over 10 minutes, then maintenance infusion as per algorithm.',
      max: 'Cardiac arrest: 300 mg then 150 mg (adult). Paediatric: 5 mg/kg per dose, max 300 mg first dose, max 150 mg subsequent doses.',
      adjust: ['Prolonged QT: caution (additive QT effect).', 'Hepatic impairment: caution with longer-term use.'],
      adverse: ['Hypotension and bradycardia during IV loading.', 'QT prolongation; rarely torsades de pointes.'],
      contraindications: ['Caution with other QT-prolonging drugs and in significant bradycardia or AV block without pacing.'],
      management: ['Slow or pause the infusion for hypotension or bradycardia; support BP.', 'Monitor QTc; correct potassium and magnesium.'],
    },
    monitoring: ['ECG including QTc', 'Blood pressure', 'Heart rate'],
  },
  {
    id: 'lidocaine', name: 'Lidocaine (lignocaine)', synonyms: ['lignocaine', 'xylocaine', 'ليدوكايين'], cls: 'Class Ib antiarrhythmic', icon: ['heart', 'pink'],
    uses: [
      { id: 'vf', label: 'Shock-refractory VF / pulseless VT', pop: 'adult', route: 'IV/IO', dose: { perKgRange: [1, 1.5], unit: 'mg' }, freq: 'second dose 0.5–0.75 mg/kg', second: { perKgRange: [0.5, 0.75], unit: 'mg' }, source: 'aha2025_alg_ca', ref: '“First dose: 1-1.5 mg/kg. Second dose: 0.5-0.75 mg/kg.”' },
      { id: 'vf_ped', label: 'Shock-refractory VF / pulseless VT', pop: 'paediatric', route: 'IV/IO', dose: { perKg: 1, unit: 'mg' }, freq: 'alternative to amiodarone', source: 'aha2025_pals_ca', ref: '“Lidocaine IV/IO dose: 1 mg/kg”' },
    ],
    seven: {
      target: 'Termination of ventricular arrhythmia.', titration: '—', max: 'Per algorithm doses above.',
      adjust: ['Weight-based dose needs a recorded weight.', 'Hepatic impairment and heart failure: reduced clearance — caution with repeated doses.'],
      adverse: ['Neurotoxicity: perioral numbness, confusion, seizures.', 'Bradyarrhythmia, hypotension.'],
      contraindications: ['Known amide local anaesthetic allergy.'],
      management: ['Stop further doses if neurological toxicity appears.', 'Seizures and local anaesthetic systemic toxicity: manage per local protocol.'],
    },
    monitoring: ['ECG', 'Neurological status'],
  },
  {
    id: 'adenosine', name: 'Adenosine', synonyms: ['adenocard', 'أدينوزين'], cls: 'AV-nodal blocking agent', icon: ['pulse', 'pink'],
    uses: [
      { id: 'svt', label: 'Regular narrow-complex tachycardia (SVT)', pop: 'adult', route: 'Rapid IV push followed by saline flush', dose: { fixed: 6, unit: 'mg' }, freq: 'second dose 12 mg if required', second: { fixed: 12, unit: 'mg' }, source: 'aha2025_alg_tachy', ref: '“First dose: 6 mg rapid IV push; follow with NS flush. Second dose: 12 mg if required.”' },
    ],
    seven: {
      target: 'Termination of re-entrant SVT or unmasking of the underlying rhythm.',
      titration: 'Escalate 6 mg → 12 mg.',
      max: '12 mg per dose in the algorithm.',
      adjust: ['Central venous line or heart transplant: 1 mg IV may be adequate (2025 AHA ALS).', 'Asthma / bronchospasm: caution.'],
      adverse: ['Transient asystole or AV block, flushing, chest discomfort, dyspnoea, bronchospasm.'],
      contraindications: ['Irregular or pre-excited wide-complex tachycardia (risk of degeneration); use expert guidance.'],
      management: ['Effects are usually brief; monitor continuously with defibrillator available.'],
    },
    monitoring: ['Continuous ECG recording during administration'],
    adjustDose: [{ when: 'central_line', text: '1 mg IV may be adequate with a central line or after heart transplant.', source: 'aha2025_als' }],
  },
  {
    id: 'atropine', name: 'Atropine', synonyms: ['أتروبين'], cls: 'Antimuscarinic', icon: ['pulse', 'blue'],
    uses: [
      { id: 'brady', label: 'Symptomatic bradycardia', pop: 'adult', route: 'IV bolus', dose: { fixed: 1, unit: 'mg' }, freq: 'repeat every 3–5 minutes', cumulativeMax: { amount: 3, unit: 'mg' }, source: 'aha2025_alg_brady', ref: '“First dose: 1 mg bolus. Repeat every 3-5 minutes. Maximum total dose: 3 mg.”' },
      { id: 'brady_ped', label: 'Bradycardia', pop: 'paediatric', route: 'IV/IO', dose: { perKg: 0.02, unit: 'mg', min: 0.1, max: 0.5 }, freq: 'may repeat once', source: 'aha2025_pals_brady', ref: '“0.02 mg/kg. May repeat once. Minimum dose 0.1 mg and maximum single dose 0.5 mg.”' },
    ],
    seven: {
      target: 'Heart rate and perfusion adequate for the patient.',
      titration: 'Adult: repeat every 3–5 minutes up to 3 mg total; if ineffective, transcutaneous pacing or dopamine / epinephrine infusion (2025 AHA). Child: may repeat once (2025 AHA PALS).',
      max: 'Adult: total 3 mg. Paediatric: single dose 0.1–0.5 mg, may repeat once.',
      adjust: ['Heart transplant or high-degree infranodal block: atropine may be ineffective — prepare pacing.'],
      adverse: ['Tachycardia, dry mouth, urinary retention, confusion (anticholinergic effects).'],
      contraindications: ['Do not delay pacing in unstable patients when atropine is ineffective.'],
      management: ['Anticholinergic effects are supportive-care problems; monitor.'],
    },
    monitoring: ['Continuous ECG', 'Blood pressure', 'Perfusion'],
  },
  {
    id: 'dopamine', name: 'Dopamine', synonyms: ['دوبامين'], cls: 'Catecholamine (infusion)', icon: ['syringe', 'orange'],
    uses: [
      { id: 'brady', label: 'Bradycardia (atropine ineffective)', pop: 'adult', route: 'IV infusion', dose: { range: [5, 20], unit: 'mcg/kg/min' }, freq: 'titrate to response; taper slowly', source: 'aha2025_alg_brady', ref: '“5-20 mcg/kg per minute. Titrate to patient response; taper slowly.”' },
    ],
    seven: {
      target: 'Adequate heart rate and perfusion.', titration: 'Titrate to response; taper slowly (2025 AHA).', max: '20 mcg/kg/min in the algorithm range.',
      adjust: ['Weight needed to calculate the infusion rate.'],
      adverse: ['Tachyarrhythmias, ischaemia; extravasation injury.'],
      contraindications: ['Uncorrected tachyarrhythmia.'],
      management: ['Reduce rate for tachyarrhythmia; use a large or central vein.'],
    },
    monitoring: ['Continuous ECG', 'Blood pressure', 'Infusion site'],
  },
  {
    id: 'procainamide', name: 'Procainamide', synonyms: ['بروكايناميد'], cls: 'Class Ia antiarrhythmic', icon: ['heart', 'pink'],
    uses: [
      { id: 'vt_stable', label: 'Stable wide-QRS tachycardia', pop: 'adult', route: 'IV infusion', dose: { range: [20, 50], unit: 'mg/min' }, freq: 'until arrhythmia suppressed, hypotension, QRS widens by more than 50%, or maximum 17 mg/kg; maintenance 1–4 mg/min', maxPerKg: 17, source: 'aha2025_alg_tachy', ref: '“20-50 mg/min until arrhythmia suppressed, hypotension ensues, QRS duration increases >50%, or maximum dose 17 mg/kg given. Maintenance infusion: 1-4 mg/min. Avoid if prolonged QT or CHF.”' },
    ],
    seven: {
      target: 'Arrhythmia suppression.', titration: 'Stop at suppression, hypotension, QRS +50% or 17 mg/kg.', max: '17 mg/kg total loading; infuse no faster than 50 mg/min (2025 AHA).',
      adjust: ['Avoid with prolonged QT or heart failure (2025 AHA algorithm).', 'Renal impairment: active metabolite accumulates — caution with maintenance.'],
      adverse: ['Hypotension (infusion-rate related), QRS widening, QT prolongation.'],
      contraindications: ['Prolonged QT; congestive heart failure (2025 AHA algorithm).'],
      management: ['Stop the infusion for hypotension or QRS widening above 50%.'],
    },
    monitoring: ['Continuous ECG with QRS and QT', 'Blood pressure'],
  },
  {
    id: 'glucagon', name: 'Glucagon', synonyms: ['غلوكاغون'], cls: 'Hormone', icon: ['syringe', 'purple'],
    uses: [
      { id: 'anaph_bb', label: 'Refractory anaphylaxis with β-blocker exposure', pop: 'adult', route: 'IV', dose: { range: [1, 5], unit: 'mg' }, freq: 'Class 2b — may be reasonable', source: 'aha2025_special', ref: '“1–5 mg IV in adults”' },
      { id: 'anaph_bb_ped', label: 'Refractory anaphylaxis with β-blocker exposure', pop: 'paediatric', route: 'IV push', dose: { perKgRange: [20, 30], unit: 'mcg', max: 1000 }, freq: 'Class 2b — may be reasonable; up to 1 mg', source: 'aha2025_special', ref: '“20–30 mcg/kg IV push up to 1 mg in children”' },
    ],
    seven: {
      target: 'Improved haemodynamics in β-blocked patients not responding to epinephrine.', titration: '—', max: 'Children: up to 1 mg.',
      adjust: ['Requires a recorded weight in children.'],
      adverse: ['Nausea and vomiting (protect the airway), hyperglycaemia.'],
      contraindications: ['—'],
      management: ['Anticipate vomiting; position and suction available.'],
    },
    monitoring: ['Blood pressure', 'Glucose'],
  },
  {
    id: 'crystalloid', name: 'IV crystalloid', synonyms: ['saline', 'normal saline', 'ringer', 'fluids', 'محلول'], cls: 'Fluid', icon: ['droplet', 'blue'],
    uses: [
      { id: 'anaphylaxis', label: 'Anaphylaxis with cardiovascular instability', pop: 'all', route: 'IV bolus', dose: { perKg: 20, unit: 'mL' }, freq: 'bolus; reassess', source: 'wao2020', ref: '“intravenous fluids to patients with cardiovascular instability (20 mL/kg bolus using crystalloids)”' },
      { id: 'sepsis', label: 'Sepsis-induced hypoperfusion or septic shock', pop: 'adult', route: 'IV', dose: { perKg: 30, unit: 'mL' }, freq: 'at least this volume within the first 3 hours (weak recommendation)', atLeast: true, source: 'ssc2021', ref: '“at least 30 mL/kg of intravenous (IV) crystalloid fluid should be given within the first 3 h of resuscitation”' },
    ],
    seven: {
      target: 'Restore perfusion; reassess after each bolus.', titration: 'Guide further fluid by dynamic reassessment.', max: 'Individualise; reassess for fluid overload.',
      adjust: ['Heart failure and advanced kidney disease: smaller aliquots with frequent reassessment.', 'SSC 2021 discussion references ideal body weight for the 30 mL/kg volume.'],
      adverse: ['Fluid overload, pulmonary oedema; hyperchloraemic acidosis with large saline volumes.'],
      contraindications: ['Clinical fluid overload.'],
      management: ['Stop fluids if signs of overload; reassess oxygenation.'],
    },
    monitoring: ['BP, HR, perfusion, urine output', 'Lung examination / oxygenation'],
  },
  {
    id: 'norepinephrine', name: 'Norepinephrine (noradrenaline)', synonyms: ['noradrenaline', 'levophed', 'نورأدرينالين'], cls: 'Vasopressor', icon: ['syringe', 'red'],
    uses: [
      { id: 'septic_shock', label: 'Septic shock (first-line vasopressor)', pop: 'adult', route: 'IV infusion', dose: null, freq: 'target MAP 65 mmHg initially', source: 'ssc2021', ref: '“norepinephrine as the first-line agent over other vasopressors”; “initial target mean arterial pressure (MAP) of 65 mm Hg”' },
    ],
    seven: {
      target: 'Initial MAP 65 mmHg in septic shock (SSC 2021, strong recommendation).', titration: 'Titrate to MAP target per local infusion protocol.', max: 'No dose verified in this build — use the local infusion protocol.',
      adjust: ['Peripheral administration is possible short-term per local policy; central access preferred for prolonged use.'],
      adverse: ['Peripheral ischaemia, arrhythmia, extravasation injury.'],
      contraindications: ['Uncorrected hypovolaemia (relative).'],
      management: ['Extravasation: stop infusion and manage per local protocol.'],
    },
    monitoring: ['Arterial BP (MAP)', 'Perfusion', 'Infusion site'],
  },
  {
    id: 'aspirin', name: 'Aspirin', synonyms: ['acetylsalicylic acid', 'asa', 'أسبرين'], cls: 'Antiplatelet', icon: ['pill', 'orange'],
    uses: [
      { id: 'acs', label: 'Suspected acute coronary syndrome', pop: 'adult', route: 'Oral (chewed)', dose: null, freq: '—', source: 'acs2025', ref: 'Dose not verified in this build (guideline full text not accessible here).' },
    ],
    seven: {
      target: 'Platelet inhibition in ACS.', titration: '—', max: 'No dose verified in this build — use the local ACS protocol.',
      adjust: ['Active bleeding or high bleeding risk: senior decision.'],
      adverse: ['Bleeding, gastrointestinal irritation; bronchospasm in aspirin-sensitive asthma.'],
      contraindications: ['True aspirin allergy; active major bleeding.'],
      management: ['Bleeding: stop and manage per local protocol.'],
    },
    monitoring: ['Bleeding'],
  },
];

export const DRUG_BY_ID = Object.freeze(Object.fromEntries(DRUGS.map((d) => [d.id, d])));

/**
 * Context rules: when a medication becomes relevant to the case (decision support only).
 * Conditions use the same values map as scores and investigations.
 */
export const MED_RULES = [
  { id: 'm_brady', when: { fact: 'vitals.hr', lt: 50 }, items: [['atropine', 'brady'], ['epinephrine', 'brady_infusion'], ['dopamine', 'brady'], ['atropine', 'brady_ped'], ['epinephrine', 'brady_ped']], why: 'Heart rate below 50: if bradycardia is causing symptoms or instability (2025 AHA bradycardia algorithm).' },
  { id: 'm_svt', when: { fact: 'ecg.rhythm', eq: 'svt' }, items: [['adenosine', 'svt']], why: 'Regular narrow-complex tachycardia: vagal manoeuvres, then adenosine if stable.' },
  { id: 'm_vt', when: { fact: 'ecg.rhythm', eq: 'vt' }, items: [['amiodarone', 'vt_stable'], ['procainamide', 'vt_stable']], why: 'Wide-complex tachycardia: antiarrhythmic if stable; synchronized cardioversion if unstable.' },
  { id: 'm_anaph', when: { fact: 'dx.consider.anaphylaxis', exists: true }, items: [['epinephrine', 'anaphylaxis'], ['crystalloid', 'anaphylaxis'], ['glucagon', 'anaph_bb'], ['glucagon', 'anaph_bb_ped']], why: 'Anaphylaxis under consideration: IM epinephrine is first-line (WAO 2020).' },
  { id: 'm_sepsis', when: { any: [{ fact: 'score.qsofa.total', gte: 2 }, { fact: 'score.news2.total', gte: 5 }, { fact: 'dx.consider.sepsis', exists: true }] }, items: [['crystalloid', 'sepsis'], ['norepinephrine', 'septic_shock']], why: 'Possible sepsis with hypoperfusion: fluids and, for septic shock, norepinephrine (SSC 2021).' },
  { id: 'm_acs', when: { fact: 'dx.consider.acs', exists: true }, items: [['aspirin', 'acs']], why: 'ACS under consideration.' },
];
