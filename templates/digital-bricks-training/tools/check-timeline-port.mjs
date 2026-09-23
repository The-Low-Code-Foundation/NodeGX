#!/usr/bin/env node
/**
 * THE PORTED TIMELINE MODEL, AGAINST THE PRODUCT'S OWN (TASK-L170 criterion 2).
 *
 * `/#__cloud__/shared/Programme` carries a port of `src/lib/server/timeline/model.ts`
 * — `assembleTimeline` and everything it calls. Two spellings of the ordering
 * would put a learner's fortnight in one order and their coach's in another
 * (L86, L127 §6), so the port is not trusted: this compiles the PRODUCT's
 * model.ts with esbuild (DBT_REPO, as check-dossier.mjs does) and runs both over
 * the same sources at five instants, field by field.
 *
 * ── WHERE THE SOURCES COME FROM ────────────────────────────────────────────
 * Not from a hand-made fixture alone (L85: a fixture is not evidence about what
 * is in it). The Programme node's OWN script is run against the seed, resolved
 * as the backend holds it (lib/seed-resolve.mjs), with `assembleTimeline`
 * re-bound at eval time so every `sources` object it is handed is CAPTURED —
 * Sam's live timeline and each programme's history. The production script is
 * not edited to allow this: a function declaration inside a Function body is a
 * binding the harness can re-assign (the L159 technique). A synthetic source set
 * then covers the branches Sam's world does not reach: a draft brief, a
 * withdrawn one, an undated one, a live session, an overdue review, a read and
 * an unread turn, a message on a non-lesson thread.
 *
 * ── THE SECOND SPELLING ────────────────────────────────────────────────────
 * `Logic/Ordered timeline` already ordered the page's entries before any
 * function existed (L157), and it inlines its sort rather than naming it. So its
 * whole script is run over the assembled entries and its `inOrder` output is
 * compared with the product's `orderEntries` — the graph's ordering and the
 * function's are both pinned to the one source rather than to each other.
 *
 * Run: node tools/check-timeline-port.mjs
 *      node tools/check-timeline-port.mjs --mutate band-done-last         (must fail)
 *      node tools/check-timeline-port.mjs --mutate graph-band-done-last   (must fail)
 */
import { build } from 'esbuild';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveRow, userFields } from './lib/seed-resolve.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const TEMPLATE = join(here, '..');
const DBT_REPO = process.env.DBT_REPO || resolve(here, '..', '..', '..', '..', 'digital-bricks-training');
const MUTATE = process.argv.includes('--mutate') ? process.argv[process.argv.indexOf('--mutate') + 1] : null;
const failures = [];
const check = (ok, message) => { if (!ok) failures.push(message); };

if (!existsSync(join(DBT_REPO, 'src', 'lib', 'server', 'timeline', 'model.ts'))) {
  console.error(`check-timeline-port: the product is not at ${DBT_REPO} — set DBT_REPO. Refusing to pass by comparing nothing.`);
  process.exit(2);
}
const bundled = await build({
  stdin: {
    contents: `export { assembleTimeline, orderEntries, projectForLearner, projectForCoach } from ${JSON.stringify(join(DBT_REPO, 'src/lib/server/timeline/model.ts'))};`,
    resolveDir: DBT_REPO,
    loader: 'ts'
  },
  bundle: true, write: false, format: 'esm', platform: 'node', logLevel: 'silent'
});
const product = await import('data:text/javascript;base64,' + Buffer.from(bundled.outputFiles[0].text).toString('base64'));

const json = (path) => JSON.parse(readFileSync(join(TEMPLATE, path), 'utf8'));
const scriptOf = (component, id) => json(`components/${component}/nodes.json`).nodes.find((n) => n.id === id).parameters.functionScript;

// ── The port, with its model functions exposed and assembleTimeline observed ──
let programme = scriptOf('__cloud__/shared/Programme', 'pr_fn');
/* The one deliberate mutation this check can apply to itself, so it is shown
   failing by name rather than claimed to (the house rule for every guard). */
if (MUTATE === 'band-done-last') {
  const before = programme;
  programme = programme.replace('const STATE_RANK = { done: 0, now: 1, ahead: 2 };', 'const STATE_RANK = { done: 3, now: 1, ahead: 2 };');
  if (programme === before) { console.error('check-timeline-port: the mutation did not apply — refusing to report on it'); process.exit(2); }
}
const captured = [];
const harness = new Function('Inputs', 'Outputs', 'Noodl', `${programme}
;const __assemble = assembleTimeline;
assembleTimeline = (sources, now) => { __capture(sources); return __assemble(sources, now); };
return { assembleTimeline: __assemble, orderEntries, readProgramme, buildPayload };`.replace('__capture', 'Noodl.__capture'));
const port = harness({}, {}, { __capture: (s) => captured.push(s) });

// The seed as the backend holds it, and a fake Records with the backend's rules.
const seed = json('backend/seed.json');
const oid = (u) => `u:${u}`;
const table = { _User: seed.users.map((u) => ({ ...userFields(u).fields, objectId: oid(u.username), createdAt: u.createdAt })) };
for (const [c, rows] of Object.entries(seed.rows)) table[c] = rows.map((r) => resolveRow(c, r, oid));
const matches = (row, where) => {
  const keys = Object.keys(where);
  if (keys.length === 0) return true;
  if (keys.length > 1) throw new Error('A filter must have exactly one key');
  const [k] = keys;
  const c = where[k];
  if (k === 'and') return c.every((w) => matches(row, w));
  if (k === 'or') return c.some((w) => matches(row, w));
  if ('equalTo' in c) return row[k] === c.equalTo;
  if ('containedIn' in c) return c.containedIn.includes(row[k]);
  throw new Error(`unsupported ${JSON.stringify(c)}`);
};
const Records = { async query(c, where = {}) { return JSON.parse(JSON.stringify((table[c] || []).filter((r) => matches(r, where)))); } };

// Capture Sam's real sources — the live assembly and every history assembly.
const rows = await port.readProgramme(Records, 'l-sam', new Date('2026-09-22T12:00:00.000Z'));
port.buildPayload(rows, 'l-sam', new Date('2026-09-22T12:00:00.000Z'));
check(captured.length >= 2, `sources: expected the live assembly and at least one history, captured ${captured.length}`);

// A synthetic source set for the branches Sam's world does not reach.
const d = (s) => new Date(s);
captured.push({
  pathProgrammeId: 'p1',
  steps: [
    { conceptId: 'a', title: 'A', rationale: 'r', status: 'complete', confidence: 7, reachedWowMoment: true, completedAt: '2026-09-02T10:00:00.000Z' },
    { conceptId: 'b', title: 'B', rationale: 'r', status: 'in_progress', confidence: null, reachedWowMoment: false, completedAt: null },
    { conceptId: 'c', title: 'C', rationale: 'r', status: 'locked', confidence: null, reachedWowMoment: false, completedAt: null },
    { conceptId: 'e', title: 'E', rationale: 'r', status: 'available', confidence: null, reachedWowMoment: false, completedAt: null }
  ],
  sessions: [
    { id: 'live', title: 'Now', startsAt: '2026-09-20T10:00:00.000Z', durationMinutes: 60, meetingUrl: null, summary: null, cancelledAt: null, createdByName: 'C', cohort: null, prep: [], programmeId: 'p1' },
    { id: 'gone', title: 'Cancelled', startsAt: '2026-09-25T10:00:00.000Z', durationMinutes: 30, meetingUrl: null, summary: null, cancelledAt: '2026-09-19T08:00:00.000Z', createdByName: 'C', cohort: { id: 'k', name: 'K' }, prep: [], programmeId: null }
  ],
  notes: [
    { id: 'anchored', body: 'x', authorName: 'C', sessionId: null, anchor: { kind: 'lesson', id: 'lesson:a' }, createdAt: '2026-09-03T10:00:00.000Z', editedAt: null },
    { id: 'free', body: 'y', authorName: 'C', sessionId: null, anchor: null, createdAt: '2026-09-04T10:00:00.000Z', editedAt: null }
  ],
  artifactSubmissions: [{ conceptId: 'a', attempt: 2, submittedAt: '2026-09-02T11:00:00.000Z', evaluated: false, deliverableId: null }],
  assignments: [
    { id: 'draft', title: 'D', brief: 'b', dueAt: null, status: 'draft', submissionModes: ['text'], criteria: null, deliverableId: null, cohortId: null, programmeId: 'p1' },
    { id: 'undated', title: 'U', brief: 'b', dueAt: null, status: 'issued', submissionModes: ['text'], criteria: ['c'], deliverableId: null, cohortId: null, programmeId: 'p1' },
    { id: 'overdue', title: 'O', brief: 'b', dueAt: d('2026-09-10T10:00:00.000Z'), status: 'issued', submissionModes: ['link'], criteria: [], deliverableId: null, cohortId: null, programmeId: null },
    { id: 'withdrawn', title: 'W', brief: 'b', dueAt: d('2026-12-01T10:00:00.000Z'), status: 'withdrawn', submissionModes: ['text'], criteria: [], deliverableId: null, cohortId: 'k', programmeId: null },
    { id: 'answered', title: 'A', brief: 'b', dueAt: d('2026-09-15T10:00:00.000Z'), status: 'issued', submissionModes: ['text'], criteria: [], deliverableId: null, cohortId: null, programmeId: 'p1' }
  ],
  assignmentSubmissions: [{ id: 's1', assignmentId: 'answered', attempt: 1, submittedAt: d('2026-09-14T10:00:00.000Z'), evaluated: true }],
  turns: [
    { id: 't1', conversationId: 'c1', subject: 's', conceptId: 'a', anchor: { kind: 'lesson', id: 'lesson:a' }, authorRole: 'learner', body: 'q', createdAt: d('2026-09-05T10:00:00.000Z'), readAt: null },
    { id: 't2', conversationId: 'c2', subject: 's', conceptId: null, anchor: { kind: 'session', id: 'session:live' }, authorRole: 'coach', body: 'a', createdAt: d('2026-09-06T10:00:00.000Z'), readAt: d('2026-09-06T11:00:00.000Z') }
  ],
  signals: [{ id: 'g1', conceptId: 'b', sectionId: 'x', kind: 'explicit_confusion', utterance: 'u', createdAt: d('2026-09-07T10:00:00.000Z') }],
  evaluations: [
    { id: 'due', kind: 'mid', dueOn: '2026-09-18', completedAt: null, summary: null, criteria: [], nextStep: null, ratings: [], programmeId: 'p1' },
    { id: 'later', kind: 'final', dueOn: '2026-12-01', completedAt: null, summary: null, criteria: [], nextStep: null, ratings: [], programmeId: 'p1' },
    { id: 'undated', kind: 'impact', dueOn: null, completedAt: null, summary: null, criteria: [], nextStep: null, ratings: [], programmeId: 'p1' },
    { id: 'done', kind: 'initial', dueOn: '2026-09-01', completedAt: d('2026-09-01T12:00:00.000Z'), summary: 's', criteria: ['x'], nextStep: 'n', ratings: [{ dimensionId: 'q', score: 4 }], programmeId: 'p1' }
  ],
  sessionRatings: [{ sessionId: 'live', ratings: [{ dimensionId: 'q', score: 6 }] }]
});

// ── Five instants, both implementations, field by field ──────────────────────
const INSTANTS = ['2026-08-01T00:00:00.000Z', '2026-09-20T10:30:00.000Z', '2026-09-22T12:00:00.000Z', '2026-09-30T23:00:00.000Z', '2027-06-01T00:00:00.000Z'];
const canon = (v) => (Array.isArray(v) ? v.map(canon) : v && typeof v === 'object' ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, canon(v[k])])) : v);
const same = (a, b) => JSON.stringify(canon(a)) === JSON.stringify(canon(b));
let compared = 0;
captured.forEach((sources, i) => {
  for (const at of INSTANTS) {
    const now = new Date(at);
    const mine = port.assembleTimeline(sources, now);
    const theirs = product.assembleTimeline(sources, now);
    compared += theirs.length;
    if (!same(mine, theirs)) {
      const firstId = mine.findIndex((e, j) => !theirs[j] || !same(e, theirs[j]));
      failures.push(`assembleTimeline: source set ${i} at ${at} differs from the product's (first at position ${firstId}: ${mine[firstId]?.id} vs ${theirs[firstId]?.id})`);
    }
  }
});

// ── The second spelling: Logic/Ordered timeline's order is the product's ──────
let ordered = scriptOf('Logic/Ordered timeline', 'ot_fn');
if (MUTATE === 'graph-band-done-last') {
  const before = ordered;
  ordered = ordered.replace('const STATE_RANK = { done: 0, now: 1, ahead: 2 };', 'const STATE_RANK = { done: 3, now: 1, ahead: 2 };');
  if (ordered === before) { console.error('check-timeline-port: the mutation did not apply — refusing to report on it'); process.exit(2); }
}
/* Copy only changes WORDS on a row, never its place, so an empty table is
   enough: `Logic/Ordered timeline` falls back to its keys by design. */
const copy = { timeline: {} };
for (const [audience, project] of [['learner', product.projectForLearner], ['coach', product.projectForCoach]]) {
  const entries = port.assembleTimeline(captured[0], new Date('2026-09-22T12:00:00.000Z'));
  const Outputs = { loaded() {} };
  new Function('Inputs', 'Outputs', ordered)({ entries: [...entries].reverse(), copy, audience }, Outputs);
  const graph = (Outputs.inOrder || []).map((e) => e.id);
  const truth = product.orderEntries(project(entries)).map((e) => e.id);
  check(graph.length > 0 && JSON.stringify(graph) === JSON.stringify(truth),
    `the second spelling: Logic/Ordered timeline orders the ${audience}'s entries differently from the product (${graph.length} vs ${truth.length})`);
}

if (failures.length) {
  console.error(`check-timeline-port: ${failures.length} failure(s)${MUTATE ? ` under --mutate ${MUTATE}` : ''}\n  ✗ ${failures.join('\n  ✗ ')}`);
  process.exit(1);
}
console.log(
  `check-timeline-port: OK — the port's assembleTimeline equals the product's over ${captured.length} source sets ` +
    `(${captured.length - 1} captured from the Programme node's own run on Sam, 1 synthetic) at ${INSTANTS.length} instants, ` +
    `${compared} entries compared field by field; Logic/Ordered timeline orders both projections exactly as the product's orderEntries.`
);
