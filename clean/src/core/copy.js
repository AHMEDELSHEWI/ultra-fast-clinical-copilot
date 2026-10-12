// One-tap copy: every target returns professional plain text, never JSON, HTML or raw values.
import { buildSections, renderSection, renderCompleteCase } from './documentation.js';

export const COPY_TARGETS = Object.freeze({
  patient: 'Patient',
  cc: 'Chief complaint',
  hpi: 'History of presenting illness',
  history: 'Relevant history',
  vitals: 'Vital signs',
  exam: 'Examination',
  investigations: 'Investigations',
  results: 'Results',
  scores: 'Clinical scores',
  assessment: 'Assessment',
  reassessment: 'Reassessment',
  resuscitation: 'Resuscitation',
  treatment: 'Treatment',
  disposition: 'Disposition',
  timeline: 'Timeline',
  complete: 'Complete case',
});

const BAD = /\b(undefined|NaN|Infinity)\b|\[object |^\s*[{[]/m;

/** Throws if technical syntax leaked into text meant for a clinician or an EMR. */
export function assertPlainText(text) {
  if (typeof text !== 'string' || !text.trim()) throw new Error('Nothing to copy.');
  if (BAD.test(text)) throw new Error('Copy blocked: technical content detected in the note.');
  return text;
}

export function copyText(store, pack, target, { tz } = {}) {
  if (target === 'complete') return assertPlainText(renderCompleteCase(store, pack, { tz }));
  if (!(target in COPY_TARGETS)) throw new Error(`Unknown copy target: ${target}`);
  const section = buildSections(store, pack, { tz }).find((s) => s.id === target);
  return assertPlainText(renderSection(section));
}
