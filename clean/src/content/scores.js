// Validated clinical score library. Implemented independently from the original publications
// (no proprietary calculator text). Each score lists its sources (ids in pack.sources),
// limitations and review status. Pending consultant review before clinical use.
import { yesNo, choicePts, banded, numTest, derived, anyYes, fact, countYes } from '../core/scoreEngine.js';

const isNum = (v) => typeof v === 'number' && Number.isFinite(v);
const missingOf = (r) => ({ points: null, missing: r.missing ?? [], unknown: r.unknown ?? [] });

// ---------- shared derived inputs ----------
const age = (ctx) => fact(ctx, 'patient.age');

/** GCS total if all three components recorded. */
function gcsTotal(ctx) {
  const e = ctx.values['gcs.e']; const v = ctx.values['gcs.v']; const m = ctx.values['gcs.m'];
  return isNum(e) && isNum(v) && isNum(m) ? e + v + m : null;
}

/** Alert vs not alert: GCS 15 means alert; otherwise ACVPU. */
function consciousness(ctx) {
  const g = gcsTotal(ctx);
  if (g === 15) return { ok: true, value: 'A' };
  const r = fact(ctx, 'exam.acvpu');
  if (r.ok) return r;
  if (g !== null && g < 15) return { ok: true, value: 'reduced' };
  return r;
}

/** BMI > 30 from weight and height, else the obesity fact. */
function obese(ctx) {
  const w = ctx.values['vitals.weight']; const h = ctx.values['vitals.height'];
  if (isNum(w) && isNum(h) && h > 0) return { ok: true, value: w / ((h / 100) ** 2) > 30 ? 'yes' : 'no' };
  return fact(ctx, 'pmh.obesity');
}
const smoker = (ctx) => {
  const r = fact(ctx, 'social.smoking');
  return r.ok ? { ok: true, value: r.value === 'current' ? 'yes' : 'no' } : r;
};
const atherosclerotic = (ctx) => {
  const keys = ['pmh.cad_known', 'pmh.stroke_tia', 'pmh.pad'];
  const missing = [];
  for (const k of keys) { const r = fact(ctx, k); if (r.ok && r.value === 'yes') return { ok: true, value: 'yes' }; if (!r.ok) missing.push(...(r.missing ?? r.unknown ?? [])); }
  return missing.length ? { ok: false, missing: missing.slice(0, 1) } : { ok: true, value: 'no' };
};

// Coronary risk factors as listed by each score.
const RF_TIMI_EDACS = ['family.premature_cad', 'pmh.hypertension', 'pmh.hyperlipidaemia', 'pmh.diabetes', smoker];
const RF_HEART = ['pmh.diabetes', smoker, 'pmh.hypertension', 'pmh.hyperlipidaemia', 'family.premature_cad', obese];

/** "At least n risk factors" decided as soon as possible. */
function atLeastRf(ctx, list, n) {
  const c = countYes(ctx, list);
  if (c.yes >= n) return { ok: true, value: 'yes', count: c.yes };
  if (c.yes + c.open.length + c.unknown.length < n) return { ok: true, value: 'no', count: c.yes };
  return { ok: false, missing: c.open.slice(0, 1), unknown: c.open.length ? [] : c.unknown };
}

const lvl = (label, level, meaning) => ({ label, level, meaning });

export const SCORES = [
  // ======================= CHEST PAIN =======================
  {
    id: 'heart', name: 'HEART score', max: 10, minAge: 18,
    use: 'Risk of major adverse cardiac events in ED patients with chest pain.',
    sources: ['heart2008', 'heart2013'], version: 'Derivation 2008; prospective validation 2013',
    limitations: ['Not for STEMI or haemodynamically unstable patients.', 'History item is a clinician judgement.', 'Troponin assay and timing matter; use with a validated accelerated pathway.'],
    inputs: [
      choicePts('judg.heart_history', 'History'),
      choicePts('ecg.heart_cat', 'ECG'),
      banded('patient.age', 'Age', [{ lt: 45, points: 0 }, { lt: 65, points: 1 }, { all: true, points: 2 }], 'y'),
      derived('Risk factors', ['pmh.cad_known', 'pmh.stroke_tia', 'pmh.pad', 'pmh.diabetes', 'social.smoking', 'pmh.hypertension', 'pmh.hyperlipidaemia', 'family.premature_cad', 'pmh.obesity'], (ctx) => {
        const ath = atherosclerotic(ctx);
        if (ath.ok && ath.value === 'yes') return { points: 2, shown: 'Known atherosclerotic disease', positive: true };
        const c = countYes(ctx, RF_HEART);
        if (c.yes >= 3) return { points: 2, shown: `${c.yes} risk factors`, positive: true };
        if (!ath.ok) return missingOf(ath);
        if (c.open.length || c.unknown.length) return { points: null, missing: c.open.slice(0, 1), unknown: c.unknown };
        return { points: c.yes === 0 ? 0 : 1, shown: c.yes === 0 ? 'None known' : `${c.yes} risk factor(s)`, positive: c.yes > 0 };
      }),
      choicePts('lab.troponin_cat', 'Troponin'),
    ],
    interpret: (t) => (t <= 3 ? lvl('low risk (0–3)', 'ok', 'MACE 2.5% in derivation and 1.7% in validation (6 weeks).')
      : t <= 6 ? lvl('moderate risk (4–6)', 'warn', 'MACE 20.3% in derivation and 16.6% in validation.')
        : lvl('high risk (7–10)', 'danger', 'MACE 72.7% in derivation and 50.1% in validation.')),
  },
  {
    id: 'edacs', name: 'EDACS', minAge: 18,
    use: 'Emergency Department Assessment of Chest pain Score; with ECG and 0/2 h troponin forms the EDACS accelerated diagnostic protocol.',
    sources: ['edacs2014'], version: 'Derivation and validation 2014',
    limitations: ['Low risk requires EDACS below 16 AND no new ischaemia on ECG AND negative troponin at 0 and 2 hours.', 'Point weights pending consultant check against the full paper.'],
    inputs: [
      banded('patient.age', 'Age', [{ lte: 45, points: 2 }, { lte: 50, points: 4 }, { lte: 55, points: 6 }, { lte: 60, points: 8 }, { lte: 65, points: 10 }, { lte: 70, points: 12 }, { lte: 75, points: 14 }, { lte: 80, points: 16 }, { lte: 85, points: 18 }, { all: true, points: 20 }], 'y'),
      derived('Male sex', ['patient.sex'], (ctx) => { const r = fact(ctx, 'patient.sex'); if (!r.ok) return missingOf(r); return { points: r.value === 'male' ? 6 : 0, shown: r.value === 'male' ? 'Male' : 'Female', positive: r.value === 'male' }; }),
      derived('Age 18–50 with known CAD or 3+ risk factors', ['pmh.cad_known'], (ctx) => {
        const a = age(ctx); if (!a.ok) return missingOf(a);
        if (a.value > 50) return { points: 0, shown: 'Not applicable (over 50)', positive: false };
        const cad = fact(ctx, 'pmh.cad_known');
        if (cad.ok && cad.value === 'yes') return { points: 4, shown: 'Known CAD', positive: true };
        const rf = atLeastRf(ctx, RF_TIMI_EDACS, 3);
        if (rf.ok && rf.value === 'yes') return { points: 4, shown: '3 or more risk factors', positive: true };
        if (!cad.ok) return missingOf(cad);
        if (!rf.ok) return missingOf(rf);
        return { points: 0, shown: 'No', positive: false };
      }),
      yesNo('sx.diaphoresis', 3, 'Diaphoresis'),
      derived('Radiates to arm, shoulder, neck or jaw', ['hx.chest_pain.radiation'], (ctx) => {
        const r = fact(ctx, 'hx.chest_pain.radiation'); if (!r.ok) return missingOf(r);
        const pos = ['left_arm', 'right_arm', 'both_arms', 'jaw', 'neck_shoulder'].includes(r.value);
        return { points: pos ? 5 : 0, shown: pos ? 'Yes' : 'No', positive: pos };
      }),
      derived('Pain occurred or worsened with inspiration', ['sx.pleuritic'], (ctx) => {
        const ch = ctx.values['hx.chest_pain.character'];
        if (ch === 'pleuritic') return { points: -4, shown: 'Yes', positive: true };
        const r = fact(ctx, 'sx.pleuritic'); if (!r.ok) return missingOf(r);
        return { points: r.value === 'yes' ? -4 : 0, shown: r.value === 'yes' ? 'Yes' : 'No', positive: r.value === 'yes' };
      }),
      yesNo('exam.chest_wall_reproducible', -6, 'Pain reproduced by palpation'),
    ],
    interpret: (t) => (t < 16 ? lvl('below 16', 'ok', 'EDACS below 16: low risk ONLY if there is no new ischaemia on ECG and troponin is negative at 0 and 2 hours.')
      : lvl('16 or more', 'warn', 'Not low risk by EDACS-ADP.')),
  },
  {
    id: 'timi', name: 'TIMI risk score (UA/NSTEMI)', max: 7, minAge: 18,
    use: 'Risk of death, MI or urgent revascularisation at 14 days in UA/NSTEMI.',
    sources: ['timi2000'], version: 'Derivation 2000',
    limitations: ['Derived in trial patients with UA/NSTEMI, not undifferentiated ED chest pain.', '"Known CAD" here stands in for prior coronary stenosis of 50% or more.'],
    inputs: [
      numTest('patient.age', 'Age 65 or more', (v) => v >= 65, 1, 'y'),
      derived('3 or more CAD risk factors', ['family.premature_cad'], (ctx) => { const r = atLeastRf(ctx, RF_TIMI_EDACS, 3); if (!r.ok) return missingOf(r); return { points: r.value === 'yes' ? 1 : 0, shown: `${r.count} risk factor(s)`, positive: r.value === 'yes' }; }),
      yesNo('pmh.cad_known', 1, 'Known coronary stenosis of 50% or more'),
      yesNo('meds.aspirin_7d', 1, 'Aspirin in the last 7 days'),
      yesNo('hx.chest_pain.episodes_24h', 1, 'Two or more anginal episodes in 24 h'),
      derived('ST deviation of 0.5 mm or more', ['ecg.st_deviation'], (ctx) => {
        const r = fact(ctx, 'ecg.st_deviation');
        if (r.ok) return { points: r.value === 'yes' ? 1 : 0, shown: r.value === 'yes' ? 'Yes' : 'No', positive: r.value === 'yes' };
        const cat = ctx.values['ecg.heart_cat'];
        if (cat === 2) return { points: 1, shown: 'Yes (significant ST deviation)', positive: true };
        if (cat === 0) return { points: 0, shown: 'No (normal ECG)', positive: false };
        return missingOf(r);
      }),
      derived('Elevated cardiac marker', ['lab.troponin_cat'], (ctx) => { const r = fact(ctx, 'lab.troponin_cat'); if (!r.ok) return missingOf(r); return { points: r.value > 0 ? 1 : 0, shown: r.value > 0 ? 'Yes' : 'No', positive: r.value > 0 }; }),
    ],
    interpret: (t) => {
      const rate = { 0: '4.7%', 1: '4.7%', 2: '8.3%', 3: '13.2%', 4: '19.9%', 5: '26.2%', 6: '40.9%', 7: '40.9%' }[t];
      return lvl(t <= 2 ? 'low' : t <= 4 ? 'intermediate' : 'high', t <= 2 ? 'ok' : t <= 4 ? 'warn' : 'danger', `14-day event rate ${rate} in the derivation cohort.`);
    },
  },

  // ======================= PULMONARY EMBOLISM =======================
  {
    id: 'wells_pe', name: 'Wells score for PE', max: 12.5, minAge: 18,
    use: 'Pre-test probability of pulmonary embolism.',
    sources: ['wells2000', 'pe2019'], version: 'Derivation 2000',
    limitations: ['"PE most likely" is a clinician judgement.', 'Use with D-dimer and imaging per a validated strategy.'],
    inputs: [
      yesNo('exam.dvt_signs', 3, 'Clinical signs of DVT'),
      yesNo('judg.pe_most_likely', 3, 'PE most likely diagnosis'),
      numTest('vitals.hr', 'Heart rate above 100', (v) => v > 100, 1.5, 'bpm'),
      yesNo('hx.recent_surgery_immobilisation', 1.5, 'Surgery or immobilisation in the last 4 weeks'),
      yesNo('pmh.prior_vte', 1.5, 'Previous DVT or PE'),
      yesNo('sx.haemoptysis', 1, 'Haemoptysis'),
      yesNo('pmh.active_cancer', 1, 'Malignancy'),
    ],
    interpret: (t) => (t <= 4 ? lvl('PE unlikely (4 or less)', 'ok', 'Two-tier: PE unlikely. In the derivation, PE unlikely with a negative D-dimer had a PE rate of about 2%.')
      : lvl('PE likely (above 4)', 'danger', 'Two-tier: PE likely — proceed to imaging per local pathway.')),
  },
  {
    id: 'perc', name: 'PERC rule', minAge: 18,
    use: 'In patients with LOW clinical suspicion only: if all 8 criteria are negative, further PE testing may be avoided.',
    sources: ['perc2004'], version: 'Derivation and validation 2004',
    limitations: ['Only valid when clinical gestalt for PE is low.', 'Low specificity; it can only rule out, never rule in.'],
    applies: (ctx) => { const r = fact(ctx, 'judg.pe_low_gestalt'); if (!r.ok) return r; return r.value === 'yes' ? { ok: true } : { ok: false, reason: 'clinical suspicion for PE is not low.' }; },
    inputs: [
      numTest('patient.age', 'Age 50 or more', (v) => v >= 50, 1, 'y'),
      numTest('vitals.hr', 'Heart rate 100 or more', (v) => v >= 100, 1, 'bpm'),
      numTest('vitals.spo2', 'SpO2 below 95%', (v) => v < 95, 1, '%'),
      yesNo('sx.unilateral_leg_swelling', 1, 'Unilateral leg swelling'),
      yesNo('sx.haemoptysis', 1, 'Haemoptysis'),
      yesNo('hx.recent_trauma_surgery', 1, 'Recent trauma or surgery'),
      yesNo('pmh.prior_vte', 1, 'Previous DVT or PE'),
      yesNo('meds.hormone', 1, 'Hormone use'),
    ],
    decide: (comps) => (comps.some((c) => c.positive) ? { total: null, result: lvl('PERC positive', 'warn', 'At least one criterion present: PERC cannot be used to rule out PE.') } : null),
    interpret: () => lvl('PERC negative', 'ok', 'All 8 criteria absent in a low-suspicion patient: PE risk below the testing threshold in the derivation study.'),
  },
  {
    id: 'spesi', name: 'Simplified PESI', max: 6, minAge: 18,
    use: '30-day mortality risk in confirmed acute pulmonary embolism.',
    sources: ['spesi2010', 'pe2019'], version: '2010',
    limitations: ['For confirmed PE only.', 'Thresholds pending consultant check against the full paper.'],
    inputs: [
      numTest('patient.age', 'Age above 80', (v) => v > 80, 1, 'y'),
      yesNo('pmh.active_cancer', 1, 'Cancer'),
      anyYes(['pmh.heart_failure', 'pmh.chronic_lung_disease'], 1, 'Chronic cardiopulmonary disease'),
      numTest('vitals.hr', 'Heart rate 110 or more', (v) => v >= 110, 1, 'bpm'),
      numTest('vitals.sbp', 'Systolic BP below 100', (v) => v < 100, 1, 'mmHg'),
      numTest('vitals.spo2', 'SpO2 below 90%', (v) => v < 90, 1, '%'),
    ],
    interpret: (t) => (t === 0 ? lvl('low risk (0)', 'ok', '30-day mortality 1.0% in the derivation cohort.') : lvl('high risk (1 or more)', 'danger', '30-day mortality 10.9% in the derivation cohort.')),
  },
  {
    id: 'wells_dvt', name: 'Wells score for DVT', minAge: 18,
    use: 'Pre-test probability of lower-limb deep vein thrombosis (2-level, with previous DVT).',
    sources: ['wellsdvt2003'], version: '2003',
    limitations: ['Point list pending consultant check against the full paper.', 'Use with D-dimer and ultrasound per local pathway.'],
    inputs: [
      yesNo('pmh.active_cancer', 1, 'Active cancer'),
      yesNo('hx.leg_immobilisation', 1, 'Paralysis, paresis or plaster of the leg'),
      yesNo('hx.bedridden_major_surgery_12w', 1, 'Bedridden 3+ days or major surgery within 12 weeks'),
      yesNo('exam.deep_vein_tenderness', 1, 'Tenderness along deep veins'),
      yesNo('exam.entire_leg_swollen', 1, 'Entire leg swollen'),
      yesNo('exam.calf_swelling_3cm', 1, 'Calf swelling 3 cm or more'),
      yesNo('exam.pitting_oedema_one_leg', 1, 'Pitting oedema (symptomatic leg)'),
      yesNo('exam.collateral_veins', 1, 'Collateral superficial veins'),
      yesNo('pmh.prior_vte', 1, 'Previously documented DVT'),
      yesNo('judg.dvt_alternative', -2, 'Alternative diagnosis at least as likely'),
    ],
    interpret: (t) => (t >= 2 ? lvl('DVT likely (2 or more)', 'warn', 'DVT likely.') : lvl('DVT unlikely (below 2)', 'ok', 'DVT unlikely; a negative D-dimer allowed ultrasound to be omitted in the 2003 trial.')),
  },

  // ======================= SEPSIS / DETERIORATION / PNEUMONIA =======================
  {
    id: 'news2', name: 'NEWS2', minAge: 16,
    use: 'Early warning score for acute illness severity in adults.',
    sources: ['news2017'], version: 'Royal College of Physicians, 2017',
    limitations: ['Not validated in pregnancy or under 16 years.', 'Scale 2 SpO2 only when a target of 88–92% is prescribed.', 'Per-band points pending consultant check against the official RCP chart.'],
    inputs: [
      banded('vitals.rr', 'Respiration rate', [{ lte: 8, points: 3 }, { lte: 11, points: 1 }, { lte: 20, points: 0 }, { lte: 24, points: 2 }, { all: true, points: 3 }], '/min'),
      derived('SpO2', ['vitals.spo2', 'judg.news2_scale2', 'pmh.chronic_lung_disease', 'vitals.o2device'], (ctx) => {
        const s = fact(ctx, 'vitals.spo2'); if (!s.ok) return missingOf(s);
        const lung = fact(ctx, 'pmh.chronic_lung_disease'); if (!lung.ok) return missingOf(lung);
        let scale2 = false;
        if (lung.value === 'yes') { const sc = fact(ctx, 'judg.news2_scale2'); if (!sc.ok) return missingOf(sc); scale2 = sc.value === 'yes'; }
        const v = s.value;
        if (!scale2) {
          const p = v <= 91 ? 3 : v <= 93 ? 2 : v <= 95 ? 1 : 0;
          return { points: p, shown: `${v}% (scale 1)`, positive: p > 0 };
        }
        const o2 = fact(ctx, 'vitals.o2device'); if (!o2.ok) return missingOf(o2);
        const onO2 = o2.value !== 'room_air';
        let p;
        if (v <= 83) p = 3; else if (v <= 85) p = 2; else if (v <= 87) p = 1; else if (v <= 92) p = 0;
        else if (!onO2) p = 0; else if (v <= 94) p = 1; else if (v <= 96) p = 2; else p = 3;
        return { points: p, shown: `${v}% (scale 2${onO2 ? ', on oxygen' : ', on air'})`, positive: p > 0 };
      }),
      derived('Air or oxygen', ['vitals.o2device'], (ctx) => { const r = fact(ctx, 'vitals.o2device'); if (!r.ok) return missingOf(r); const o = r.value !== 'room_air'; return { points: o ? 2 : 0, shown: o ? 'Oxygen' : 'Air', positive: o }; }),
      banded('vitals.sbp', 'Systolic BP', [{ lte: 90, points: 3 }, { lte: 100, points: 2 }, { lte: 110, points: 1 }, { lte: 219, points: 0 }, { all: true, points: 3 }], 'mmHg'),
      banded('vitals.hr', 'Pulse', [{ lte: 40, points: 3 }, { lte: 50, points: 1 }, { lte: 90, points: 0 }, { lte: 110, points: 1 }, { lte: 130, points: 2 }, { all: true, points: 3 }], 'bpm'),
      derived('Consciousness', ['exam.acvpu', 'gcs.e'], (ctx) => { const r = consciousness(ctx); if (!r.ok) return missingOf(r); const a = r.value === 'A'; return { points: a ? 0 : 3, shown: a ? 'Alert' : r.value === 'reduced' ? 'GCS below 15' : r.value, positive: !a }; }),
      banded('vitals.temp', 'Temperature', [{ lte: 35.0, points: 3 }, { lte: 36.0, points: 1 }, { lte: 38.0, points: 0 }, { lte: 39.0, points: 1 }, { all: true, points: 2 }], '°C'),
    ],
    interpret: (t, comps) => {
      const red = comps.some((c) => c.points === 3);
      if (t >= 7) return lvl('high (7 or more)', 'danger', 'High clinical risk: emergency assessment by a team with critical-care competencies.');
      if (t >= 5) return lvl('medium (5–6)', 'warn', 'Medium clinical risk: urgent review; key threshold for urgent response.');
      if (red) return lvl('low–medium (single parameter scores 3)', 'warn', 'A single red score (3) needs urgent ward-based review.');
      if (t === 0) return lvl('0', 'ok', 'Low score; continue routine monitoring.');
      return lvl('low (1–4)', 'ok', 'Low clinical risk; assessment by a competent registered nurse.');
    },
  },
  {
    id: 'qsofa', name: 'qSOFA', max: 3, minAge: 18,
    use: 'Prompt to consider sepsis in adults with suspected infection outside the ICU.',
    sources: ['qsofa2016', 'ssc2021'], version: 'Sepsis-3, 2016',
    limitations: ['Surviving Sepsis Campaign 2021 recommends against qSOFA as a single screening tool compared with SIRS, NEWS or MEWS.', 'A score below 2 does not exclude sepsis.'],
    inputs: [
      numTest('vitals.rr', 'Respiratory rate 22 or more', (v) => v >= 22, 1, '/min'),
      numTest('vitals.sbp', 'Systolic BP 100 or less', (v) => v <= 100, 1, 'mmHg'),
      derived('Altered mentation', ['exam.acvpu', 'gcs.e'], (ctx) => { const r = consciousness(ctx); if (!r.ok) return missingOf(r); const alt = r.value !== 'A'; return { points: alt ? 1 : 0, shown: alt ? 'Yes' : 'No', positive: alt }; }),
    ],
    interpret: (t) => (t >= 2 ? lvl('2 or more', 'danger', 'Higher risk of poor outcome; assess for organ dysfunction and sepsis.') : lvl('below 2', 'caution', 'Does not exclude sepsis; continue assessment.')),
  },
  {
    id: 'curb65', name: 'CURB-65', max: 5, minAge: 18,
    use: 'Severity of community-acquired pneumonia (30-day mortality).',
    sources: ['curb2003'], version: '2003',
    limitations: ['For community-acquired pneumonia only.', 'Does not replace clinical judgement or account for comorbidity and oxygenation.'],
    inputs: [
      derived('Confusion (new)', ['exam.acvpu', 'exam.new_confusion'], (ctx) => {
        const nc = fact(ctx, 'exam.new_confusion');
        if (nc.ok) return { points: nc.value === 'yes' ? 1 : 0, shown: nc.value === 'yes' ? 'Yes' : 'No', positive: nc.value === 'yes' };
        const r = consciousness(ctx); if (!r.ok) return missingOf(r);
        const c = r.value !== 'A'; return { points: c ? 1 : 0, shown: c ? 'Yes' : 'No', positive: c };
      }),
      numTest('lab.urea', 'Urea above 7 mmol/L', (v) => v > 7, 1, 'mmol/L'),
      numTest('vitals.rr', 'Respiratory rate 30 or more', (v) => v >= 30, 1, '/min'),
      derived('Low BP (SBP below 90 or DBP 60 or less)', ['vitals.sbp', 'vitals.dbp'], (ctx) => {
        const s = fact(ctx, 'vitals.sbp'); const d = fact(ctx, 'vitals.dbp');
        if ((s.ok && s.value < 90) || (d.ok && d.value <= 60)) return { points: 1, shown: 'Yes', positive: true };
        if (!s.ok) return missingOf(s); if (!d.ok) return missingOf(d);
        return { points: 0, shown: `${s.value}/${d.value}`, positive: false };
      }),
      numTest('patient.age', 'Age 65 or more', (v) => v >= 65, 1, 'y'),
    ],
    interpret: (t) => {
      const m = ['0.7%', '3.2%', '3%', '17%', '41.5%', '57%'][t];
      return lvl(t <= 1 ? 'low severity' : t === 2 ? 'moderate severity' : 'high severity', t <= 1 ? 'ok' : t === 2 ? 'warn' : 'danger', `30-day mortality ${m} in the derivation study.`);
    },
  },

  // ======================= SYNCOPE / RHYTHM =======================
  {
    id: 'csrs', name: 'Canadian Syncope Risk Score', minAge: 16,
    use: '30-day serious adverse events after ED assessment of syncope when no serious cause was found in the ED.',
    sources: ['csrs2016', 'csrs2020'], version: 'Derivation 2016; validation 2020',
    limitations: ['Only after ED evaluation found no serious cause.', 'Point weights and categories pending consultant check against the full papers.'],
    inputs: [
      yesNo('judg.vasovagal_predisposition', -1, 'Predisposition to vasovagal symptoms'),
      yesNo('pmh.heart_disease', 1, 'History of heart disease'),
      derived('Any SBP below 90 or above 180 in the ED', ['vitals.sbp'], (ctx) => {
        const list = ctx.readings('vitals.sbp');
        if (!list.length) return { points: null, missing: ['vitals.sbp'], unknown: [] };
        const pos = list.some((v) => v < 90 || v > 180);
        return { points: pos ? 2 : 0, shown: list.join(', ') + ' mmHg', positive: pos };
      }),
      derived('Troponin above the 99th percentile', ['lab.troponin_cat'], (ctx) => { const r = fact(ctx, 'lab.troponin_cat'); if (!r.ok) return missingOf(r); return { points: r.value > 0 ? 2 : 0, shown: r.value > 0 ? 'Yes' : 'No', positive: r.value > 0 }; }),
      numTest('ecg.axis', 'Abnormal QRS axis (below −30° or above 100°)', (v) => v < -30 || v > 100, 1, '°'),
      numTest('ecg.qrs_ms', 'QRS duration above 130 ms', (v) => v > 130, 1, 'ms'),
      numTest('ecg.qtc_ms', 'QTc above 480 ms', (v) => v > 480, 2, 'ms'),
      choicePts('judg.syncope_ed_dx', 'ED diagnosis', { vasovagal: -2, cardiac: 2, neither: 0 }),
    ],
    interpret: (t) => (t <= -2 ? lvl('very low risk (−3 to −2)', 'ok', 'Very low 30-day serious outcome risk in validation.')
      : t <= 0 ? lvl('low risk (−1 to 0)', 'ok', 'Low risk; generally suitable for discharge in validation.')
        : t <= 3 ? lvl('medium risk (1 to 3)', 'warn', 'Medium risk.')
          : t <= 5 ? lvl('high risk (4 to 5)', 'danger', 'High risk; about 20% serious outcomes in validation.')
            : lvl('very high risk (6 or more)', 'danger', 'Very high risk; about 50% serious outcomes in validation.')),
  },
  {
    id: 'chadsvasc', name: 'CHA₂DS₂-VASc', max: 9, minAge: 18,
    use: 'Stroke and thromboembolism risk in atrial fibrillation. CHA₂DS₂-VA (without sex) is shown as well, as used by the 2024 ESC AF guideline.',
    sources: ['chads2010', 'escaf2024', 'accaf2023'], version: '2010',
    limitations: ['For non-valvular AF.', 'Anticoagulation decisions follow the current AF guideline and bleeding risk.'],
    inputs: [
      yesNo('pmh.heart_failure', 1, 'Congestive heart failure'),
      yesNo('pmh.hypertension', 1, 'Hypertension'),
      banded('patient.age', 'Age', [{ lt: 65, points: 0 }, { lt: 75, points: 1 }, { all: true, points: 2 }], 'y'),
      yesNo('pmh.diabetes', 1, 'Diabetes'),
      yesNo('pmh.stroke_tia', 2, 'Stroke, TIA or thromboembolism'),
      anyYes(['pmh.cad_known', 'pmh.pad'], 1, 'Vascular disease (MI, PAD)'),
      derived('Sex category (female)', ['patient.sex'], (ctx) => { const r = fact(ctx, 'patient.sex'); if (!r.ok) return missingOf(r); const f = r.value === 'female'; return { points: f ? 1 : 0, shown: f ? 'Female' : 'Male', positive: f }; }),
    ],
    interpret: (t, comps) => {
      const va = t - (comps.at(-1).points ?? 0);
      return lvl(`CHA₂DS₂-VA ${va}`, t >= 2 ? 'warn' : 'caution', `CHA₂DS₂-VASc ${t}; CHA₂DS₂-VA ${va}. Decide on anticoagulation with the current AF guideline and bleeding risk.`);
    },
  },
  {
    id: 'hasbled', name: 'HAS-BLED', max: 9, minAge: 18,
    use: '1-year major bleeding risk in anticoagulated atrial fibrillation.',
    sources: ['hasbled2010'], version: '2010',
    limitations: ['Use to identify modifiable bleeding risks, not to withhold anticoagulation by itself.', 'Item definitions pending consultant check.'],
    inputs: [
      yesNo('pmh.htn_uncontrolled', 1, 'Uncontrolled hypertension'),
      yesNo('pmh.renal_disease', 1, 'Abnormal renal function'),
      yesNo('pmh.liver_disease', 1, 'Abnormal liver function'),
      yesNo('pmh.stroke_tia', 1, 'Stroke'),
      yesNo('pmh.bleeding_history', 1, 'Bleeding history or predisposition'),
      yesNo('meds.labile_inr', 1, 'Labile INR'),
      numTest('patient.age', 'Elderly (above 65)', (v) => v > 65, 1, 'y'),
      yesNo('meds.antiplatelet_nsaid', 1, 'Drugs (antiplatelet / NSAID)'),
      yesNo('social.alcohol_excess', 1, 'Alcohol'),
    ],
    interpret: (t) => (t >= 3 ? lvl('high bleeding risk (3 or more)', 'warn', 'Address modifiable risk factors and review more often.') : lvl('below 3', 'ok', 'Lower bleeding risk.')),
  },

  // ======================= HEADACHE / HEAD INJURY =======================
  {
    id: 'ottawa_sah', name: 'Ottawa SAH Rule', minAge: 15,
    use: 'Alert patients aged 15 or more with new severe non-traumatic headache peaking within 1 hour: identifies who needs investigation for SAH.',
    sources: ['ottawasah2013'], version: '2013',
    limitations: ['Not for patients with new neurological deficits, previous aneurysm, SAH or brain tumour, or recurrent similar headaches.', 'A positive rule means investigate; it does not diagnose SAH.'],
    applies: (ctx) => {
      const p = fact(ctx, 'hx.headache.peak_1h'); if (!p.ok) return p;
      if (p.value !== 'yes') return { ok: false, reason: 'headache did not peak within 1 hour.' };
      const f = fact(ctx, 'sx.focal_weakness'); if (!f.ok) return f;
      if (f.value === 'yes') return { ok: false, reason: 'new neurological deficit present (rule excludes these patients).' };
      return { ok: true };
    },
    inputs: [
      numTest('patient.age', 'Age 40 or more', (v) => v >= 40, 1, 'y'),
      yesNo('sx.neck_stiffness', 1, 'Neck pain or stiffness'),
      yesNo('hx.headache.witnessed_loc', 1, 'Witnessed loss of consciousness'),
      yesNo('hx.headache.exertion', 1, 'Onset during exertion'),
      yesNo('hx.headache.thunderclap', 1, 'Thunderclap (instantly peaking)'),
      yesNo('exam.limited_neck_flexion', 1, 'Limited neck flexion'),
    ],
    decide: (comps) => (comps.some((c) => c.positive) ? { total: null, result: lvl('positive — investigate for SAH', 'danger', 'At least one criterion present: further investigation for SAH is needed.') } : null),
    interpret: () => lvl('negative', 'ok', 'No criteria present: SAH ruled out by the rule (100% sensitivity in the 2013 cohort).'),
  },
  {
    id: 'ct_head', name: 'Canadian CT Head Rule', minAge: 16,
    use: 'Minor head injury (GCS 13–15 with loss of consciousness, amnesia or disorientation): who needs CT.',
    sources: ['cthead2001'], version: 'Derivation 2001',
    limitations: ['Not for patients on anticoagulants, with seizure after injury, or obvious open skull fracture.', 'The vomiting item is defined as 2 or more episodes in the published rule; confirm with the full paper.'],
    applies: (ctx) => {
      const h = fact(ctx, 'hx.altered_mental_status.head_injury'); if (!h.ok) return h;
      if (h.value !== 'yes') return { ok: false, reason: 'no head injury recorded.' };
      const ac = fact(ctx, 'meds.anticoagulant'); if (!ac.ok) return ac;
      if (ac.value === 'yes') return { ok: false, reason: 'patient on anticoagulant/antiplatelet (excluded from the rule).' };
      const g = gcsTotal(ctx);
      if (g === null) return { ok: false, missing: ['gcs.e'] };
      if (g < 13) return { ok: false, reason: 'GCS below 13 (rule applies to GCS 13–15 only).' };
      return { ok: true };
    },
    inputs: [
      yesNo('exam.gcs_below15_2h', 1, 'High risk: GCS below 15 at 2 hours'),
      yesNo('exam.skull_fracture_open', 1, 'High risk: suspected open or depressed skull fracture'),
      yesNo('exam.basal_skull_signs', 1, 'High risk: signs of basal skull fracture'),
      yesNo('sx.vomiting_2plus', 1, 'High risk: vomiting 2 or more episodes'),
      numTest('patient.age', 'High risk: age 65 or more', (v) => v >= 65, 1, 'y'),
      yesNo('hx.amnesia_30min', 1, 'Medium risk: amnesia 30 min or more before impact'),
      yesNo('hx.dangerous_mechanism', 1, 'Medium risk: dangerous mechanism'),
    ],
    decide: (comps) => {
      if (comps.slice(0, 5).some((c) => c.positive)) return { total: null, result: lvl('CT required — high risk', 'danger', 'High-risk factor present (risk of needing neurosurgical intervention).') };
      return null;
    },
    interpret: (t, comps) => (comps.slice(5).some((c) => c.positive)
      ? lvl('CT required — medium risk', 'warn', 'Medium-risk factor present (risk of clinically important brain injury on CT).')
      : lvl('CT not required by the rule', 'ok', 'No high- or medium-risk factors.')),
  },

  // ======================= ABDOMEN / GI BLEED =======================
  {
    id: 'alvarado', name: 'Alvarado score', max: 10,
    use: 'Probability of acute appendicitis in abdominal pain.',
    sources: ['alvarado1986'], version: '1986',
    limitations: ['Retrospective derivation; point weights pending consultant check against the full paper.', 'Imaging decisions follow local pathway; use caution in pregnancy and the elderly.'],
    inputs: [
      yesNo('sx.pain_migration_rlq', 1, 'Migration of pain to the RIF'),
      yesNo('sx.anorexia', 1, 'Anorexia'),
      anyYes(['sx.nausea', 'sx.vomiting'], 1, 'Nausea or vomiting'),
      yesNo('exam.rlq_tenderness', 2, 'Tenderness in the RIF'),
      yesNo('exam.rebound', 1, 'Rebound tenderness'),
      numTest('vitals.temp', 'Temperature 37.3 °C or more', (v) => v >= 37.3, 1, '°C'),
      numTest('lab.wbc', 'Leukocytosis (WBC above 10)', (v) => v > 10, 2, '×10⁹/L'),
      numTest('lab.neut_pct', 'Shift to the left (neutrophils above 75%)', (v) => v > 75, 1, '%'),
    ],
    interpret: (t) => (t <= 4 ? lvl('appendicitis unlikely (4 or less)', 'ok', 'Low score.') : t <= 6 ? lvl('compatible (5–6)', 'caution', 'Compatible with appendicitis.') : t <= 8 ? lvl('probable (7–8)', 'warn', 'Appendicitis probable.') : lvl('very probable (9–10)', 'danger', 'Appendicitis very probable.')),
  },
  {
    id: 'gbs', name: 'Glasgow-Blatchford score', max: 23, minAge: 16,
    use: 'Upper GI bleeding: need for transfusion, endoscopic intervention or surgery.',
    sources: ['gbs2000'], version: '2000',
    limitations: ['Band thresholds pending consultant check against the full paper.', 'Low-score discharge thresholds differ between guidelines.'],
    inputs: [
      banded('lab.urea', 'Blood urea', [{ lt: 6.5, points: 0 }, { lt: 8, points: 2 }, { lt: 10, points: 3 }, { lt: 25, points: 4 }, { all: true, points: 6 }], 'mmol/L'),
      derived('Haemoglobin', ['lab.hb', 'patient.sex'], (ctx) => {
        const h = fact(ctx, 'lab.hb'); if (!h.ok) return missingOf(h);
        const s = fact(ctx, 'patient.sex'); if (!s.ok) return missingOf(s);
        const v = h.value;
        const p = s.value === 'male' ? (v >= 130 ? 0 : v >= 120 ? 1 : v >= 100 ? 3 : 6) : (v >= 120 ? 0 : v >= 100 ? 1 : 6);
        return { points: p, shown: `${v} g/L`, positive: p > 0 };
      }),
      banded('vitals.sbp', 'Systolic BP', [{ gte: 110, points: 0 }, { gte: 100, points: 1 }, { gte: 90, points: 2 }, { all: true, points: 3 }], 'mmHg'),
      numTest('vitals.hr', 'Pulse 100 or more', (v) => v >= 100, 1, 'bpm'),
      yesNo('sx.melaena', 1, 'Melaena'),
      yesNo('sx.syncope', 2, 'Syncope'),
      yesNo('pmh.liver_disease', 2, 'Hepatic disease'),
      yesNo('pmh.heart_failure', 2, 'Cardiac failure'),
    ],
    interpret: (t) => (t === 0 ? lvl('0', 'ok', 'Very low risk of needing intervention in the derivation study.') : t <= 1 ? lvl('1', 'caution', 'Low score; some guidelines accept 1 or less as low risk.') : lvl(`${t}`, t >= 7 ? 'danger' : 'warn', 'Higher risk of needing intervention.')),
  },
];

export const SCORE_BY_ID = Object.freeze(Object.fromEntries(SCORES.map((s) => [s.id, s])));
