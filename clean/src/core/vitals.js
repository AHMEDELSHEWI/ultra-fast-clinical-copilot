// Deterministic vital-sign helpers and calculators. Pure functions, no side effects.
// Blood pressure is always two numbers (SBP, DBP); a single "120/80" string is never stored.

/** Hard plausibility limits [min, max]. Outside these a value is rejected as a probable entry error. */
export const LIMITS = Object.freeze({
  sbp: [40, 300],
  dbp: [20, 200],
  hr: [20, 300],
  rr: [4, 80],
  spo2: [50, 100],
  temp: [30, 45], // degrees C
  weight: [0.4, 400], // kg
  height: [30, 250], // cm
  glucose: [0.5, 60], // mmol/L
  pain: [0, 10],
});

export const UNITS = Object.freeze({
  sbp: 'mmHg', dbp: 'mmHg', hr: 'bpm', rr: '/min', spo2: '%', temp: '°C',
  weight: 'kg', height: 'cm', glucose: 'mmol/L', pain: '/10', map: 'mmHg',
});

const isNum = (v) => typeof v === 'number' && Number.isFinite(v);
const round = (v, d = 0) => { const f = 10 ** d; return Math.round((v + Number.EPSILON) * f) / f; };

/** Returns { ok, message } for a single vital value. */
export function validateVital(key, value) {
  const lim = LIMITS[key];
  if (!lim) return { ok: false, message: `Unknown vital: ${key}` };
  if (!isNum(value)) return { ok: false, message: 'Enter a number.' };
  if (value < lim[0] || value > lim[1]) {
    return { ok: false, message: `${value} is outside the plausible range ${lim[0]}–${lim[1]} ${UNITS[key]}. Check the entry.` };
  }
  return { ok: true };
}

/** Cross-field check. Warning only: the clinician may confirm an unusual reading. */
export function checkBpPair(sbp, dbp) {
  if (isNum(sbp) && isNum(dbp) && dbp >= sbp) {
    return { ok: false, message: 'Diastolic is not lower than systolic. Confirm both values.' };
  }
  return { ok: true };
}

export function formatBp(sbp, dbp) {
  if (!isNum(sbp) || !isNum(dbp)) return null;
  return `${sbp}/${dbp} mmHg`;
}

/** MAP = (SBP + 2 x DBP) / 3, rounded to a whole mmHg. */
export function calcMap(sbp, dbp) {
  if (!isNum(sbp) || !isNum(dbp)) return null;
  return round((sbp + 2 * dbp) / 3, 0);
}

/** Shock index = HR / SBP, two decimals. */
export function calcShockIndex(hr, sbp) {
  if (!isNum(hr) || !isNum(sbp) || sbp <= 0) return null;
  return round(hr / sbp, 2);
}

/** BMI = kg / m^2, one decimal. */
export function calcBmi(weightKg, heightCm) {
  if (!isNum(weightKg) || !isNum(heightCm) || heightCm <= 0) return null;
  const m = heightCm / 100;
  return round(weightKg / (m * m), 1);
}

const GLUCOSE_FACTOR = 18.016; // mg/dL per mmol/L
export const glucoseMgdlToMmol = (mgdl) => (isNum(mgdl) ? round(mgdl / GLUCOSE_FACTOR, 1) : null);
export const glucoseMmolToMgdl = (mmol) => (isNum(mmol) ? round(mmol * GLUCOSE_FACTOR, 0) : null);

// ---------- Glasgow Coma Scale ----------
export const GCS_RANGES = Object.freeze({ e: [1, 4], v: [1, 5], m: [1, 6] });
const GCS_NAMES = Object.freeze({ e: 'eye opening', v: 'verbal response', m: 'motor response' });

/**
 * GCS total is never asked from the clinician and never guessed.
 * With any missing component the total is null and the text says exactly what is missing.
 */
export function calcGcs({ e, v, m } = {}) {
  const parts = { e, v, m };
  const missing = [];
  for (const k of ['e', 'v', 'm']) {
    const val = parts[k];
    const [lo, hi] = GCS_RANGES[k];
    if (val === undefined || val === null) missing.push(k);
    else if (!Number.isInteger(val) || val < lo || val > hi) {
      return { complete: false, total: null, missing: [], invalid: k, text: `GCS ${k.toUpperCase()} must be ${lo}–${hi}.` };
    }
  }
  if (missing.length) {
    const names = missing.map((k) => GCS_NAMES[k]);
    const list = names.length === 1 ? names[0] : `${names.slice(0, -1).join(', ')} and ${names.at(-1)}`;
    return { complete: false, total: null, missing, text: `GCS incomplete — missing ${list}.` };
  }
  const total = e + v + m;
  return { complete: true, total, missing: [], breakdown: `E${e} V${v} M${m}`, text: `GCS ${total}/15 (E${e} V${v} M${m})` };
}

export const GCS_OPTIONS = Object.freeze({
  e: [
    { v: 4, en: 'Spontaneous', ar: 'تلقائي' },
    { v: 3, en: 'To voice', ar: 'للصوت' },
    { v: 2, en: 'To pain', ar: 'للألم' },
    { v: 1, en: 'None', ar: 'لا يوجد' },
  ],
  v: [
    { v: 5, en: 'Oriented', ar: 'متوجه' },
    { v: 4, en: 'Confused', ar: 'مرتبك' },
    { v: 3, en: 'Words only', ar: 'كلمات فقط' },
    { v: 2, en: 'Sounds only', ar: 'أصوات فقط' },
    { v: 1, en: 'None', ar: 'لا يوجد' },
  ],
  m: [
    { v: 6, en: 'Obeys commands', ar: 'يطيع الأوامر' },
    { v: 5, en: 'Localises pain', ar: 'يحدد الألم' },
    { v: 4, en: 'Withdraws', ar: 'يسحب' },
    { v: 3, en: 'Flexion', ar: 'انثناء' },
    { v: 2, en: 'Extension', ar: 'بسط' },
    { v: 1, en: 'None', ar: 'لا يوجد' },
  ],
});
