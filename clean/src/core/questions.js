// Question engine: picks the single best next question from the active complaints.
// Content is data (pack.json); nothing about a specific complaint is hard-coded here.

/** Evaluate a small declarative condition against a plain values map. */
export function evalCondition(cond, values) {
  if (!cond) return true;
  if (cond.all) return cond.all.every((c) => evalCondition(c, values));
  if (cond.any) return cond.any.some((c) => evalCondition(c, values));
  const v = values[cond.fact];
  if ('eq' in cond) return v === cond.eq;
  if ('neq' in cond) return v !== cond.neq;
  if ('gte' in cond) return typeof v === 'number' && v >= cond.gte;
  if ('lte' in cond) return typeof v === 'number' && v <= cond.lte;
  return false;
}

export function buildIndex(pack) {
  const questionsById = new Map(pack.questions.map((q) => [q.id, q]));
  const complaintsByKey = new Map(pack.complaints.map((c) => [c.key, c]));
  return { questionsById, complaintsByKey };
}

/**
 * Candidate questions for the current case, de-duplicated by fact key
 * (a fact asked for one complaint is never asked again for another).
 */
export function applicableQuestions(pack, store) {
  const active = new Set(store.activeComplaints());
  const values = store.snapshotValues();
  const seen = new Set();
  const out = [];
  for (const [order, q] of pack.questions.entries()) {
    const applies = q.complaints.includes('all') || q.complaints.some((c) => active.has(c));
    if (!applies || seen.has(q.fact)) continue;
    if (!evalCondition(q.askIf, values)) continue;
    seen.add(q.fact);
    out.push({ q, order });
  }
  return out;
}

/** Highest priority unanswered question, or null when the pathway is complete. */
export function nextQuestion(pack, store) {
  if (store.activeComplaints().length === 0) return null;
  const open = applicableQuestions(pack, store).filter(({ q }) => !store.isAnswered(q.fact));
  if (!open.length) return null;
  open.sort((a, b) => (b.q.priority - a.q.priority) || (a.order - b.order));
  return open[0].q;
}

export function progress(pack, store) {
  const all = applicableQuestions(pack, store);
  const done = all.filter(({ q }) => store.isAnswered(q.fact)).length;
  return { done, total: all.length };
}

/** Clinically important facts that are absent, with the reason they matter. */
export function missingInformation(pack, store) {
  const items = [];
  const need = (key, label, why, ask) => {
    if (!store.isAnswered(key)) items.push({ key, label, why, status: 'MISSING', ask });
    else if (store.isUnknown(key)) items.push({ key, label, why, status: 'UNKNOWN', ask });
  };
  need('patient.age', 'Age', 'Needed to interpret vital signs and to choose safe dosing.', 'patient');
  need('patient.sex', 'Sex', 'Affects differential diagnosis and pregnancy screening.', 'patient');
  if (store.activeComplaints().length === 0) items.push({ key: 'complaint', label: 'Presenting complaint', why: 'Starts the history pathway.', status: 'MISSING', ask: 'complaint' });

  const values = store.snapshotValues();
  for (const { q } of applicableQuestions(pack, store)) {
    const critical = q.redFlag || ['allergy', 'meds', 'preg'].includes(q.role);
    if (critical && !store.isAnswered(q.fact)) {
      items.push({ key: q.fact, label: q.prompt.en.replace(/\?$/, ''), why: q.redFlag ? 'Red-flag question.' : 'Changes safety or treatment.', status: 'MISSING', ask: q.id });
    } else if (critical && store.isUnknown(q.fact)) {
      items.push({ key: q.fact, label: q.prompt.en.replace(/\?$/, ''), why: 'Marked unknown.', status: 'UNKNOWN', ask: q.id });
    }
  }
  const hasBp = typeof values['vitals.sbp'] === 'number' && typeof values['vitals.dbp'] === 'number';
  if (!hasBp) items.push({ key: 'vitals.bp', label: 'Blood pressure', why: 'Needed for MAP, shock index and safety checks.', status: 'MISSING', ask: 'vitals' });
  if (typeof values['vitals.hr'] !== 'number') items.push({ key: 'vitals.hr', label: 'Heart rate', why: 'Needed for shock index and monitoring.', status: 'MISSING', ask: 'vitals' });
  return items;
}
