// OWN-029 s3 — the organisation judge without the words. On one fixed structure the words-and-outline judge moved by up
// to 0.61 (s2, RESULTS §7c), so a constraint on it partly guarded wording. This one reads the section kinds, grounds
// and parts only: the words cannot move it, and a reword cannot be refused by it. agent.mjs asks it as 'page.shape';
// shape-probe.mjs asks it of every round the ledgers already hold.
export const SHAPE_Q = 'Is this page well organised for this request: the first section can say what it is and what to do, the sections come in a sensible order, the parts suit each section, and no part is repeated?';
// the outline agent.mjs builds for 'page.organised', with each section's first line (after " — ") taken out
export const stripWords = (q) => q.split('\n\nIs this page well organised')[0].split('\n').map((l) => l.replace(/ — .*$/, '')).join('\n');
