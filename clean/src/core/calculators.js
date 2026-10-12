// Deterministic calculators (pure). Each returns null when an input is missing — never a guess.
const isNum = (v) => typeof v === 'number' && Number.isFinite(v);
const r1 = (v) => Math.round(v * 10) / 10;

/** Cockcroft-Gault creatinine clearance (mL/min). Creatinine in µmol/L (converted to mg/dL: /88.4). */
export function crcl({ age, weightKg, sex, creatinineUmol }) {
  if (![age, weightKg, creatinineUmol].every(isNum) || !sex || creatinineUmol <= 0) return null;
  const crMgDl = creatinineUmol / 88.4;
  let v = ((140 - age) * weightKg) / (72 * crMgDl);
  if (sex === 'female') v *= 0.85;
  return r1(v);
}

/** Anion gap = Na − (Cl + HCO3), mmol/L. */
export function anionGap({ na, cl, hco3 }) {
  return [na, cl, hco3].every(isNum) ? r1(na - (cl + hco3)) : null;
}

/** QTc by Bazett (ms) from QT (ms) and heart rate (bpm). */
export function qtcBazett({ qtMs, hr }) {
  if (!isNum(qtMs) || !isNum(hr) || hr <= 0) return null;
  const rr = 60 / hr;
  return Math.round(qtMs / Math.sqrt(rr));
}
