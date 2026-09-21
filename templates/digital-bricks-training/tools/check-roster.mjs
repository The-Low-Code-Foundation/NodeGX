#!/usr/bin/env node
/**
 * THE ROSTER LISTS EVERYBODY IT IS RESPONSIBLE FOR (TASK-L164).
 *
 * Runs the graph's OWN scripts — Data/Fixture roster's order, and Logic/Roster
 * filter's pipeline and options — straight out of nodes.json, against the
 * fixture, and asserts the properties the page exists for. Nothing here is a
 * second implementation: if a script in the graph changes, this runs the
 * changed script.
 *
 * The property it guards hardest is L89's. The roster starts from accounts so a
 * learner who signed up and stalled stays visible, and the programme filter is
 * the easiest place to re-create that bug by accident: "hide learners who are
 * not on a programme" reads like the same rule as "hide learners whose every
 * programme is finished", and it hides every person with no programme at all.
 *
 * Run: node tools/check-roster.mjs
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', 'components');
const nodesOf = (c) => JSON.parse(readFileSync(join(ROOT, c, 'nodes.json'), 'utf8')).nodes;
const nodeIn = (c, id) => {
  const n = nodesOf(c).find((x) => x.id === id);
  if (!n) throw new Error(`no node ${id} in ${c}`);
  return n;
};
const script = (c, id) => nodeIn(c, id).parameters.functionScript;

/** Run a Function node's script the way the runtime does: Inputs in, Outputs out. */
function run(src, inputs) {
  const outputs = { loaded() {} };
  new Function('Inputs', 'Outputs', src)(inputs, outputs);
  return outputs;
}

const fixture = JSON.parse(nodeIn('Data/Fixture roster', 'fr_data').parameters.json);
const graphStrings = JSON.parse(nodeIn('Data/Strings', 'str_graph').parameters.json)[0];
const copy = { people: graphStrings.people };

const people = run(script('Data/Fixture roster', 'fr_order'), { items: fixture }).people;
const filterSrc = script('Logic/Roster filter', 'rf_fn');
const optionsSrc = script('Logic/Roster filter', 'rf_opts');
const filter = (o = {}) => run(filterSrc, { people, copy, ...o });
const ids = (o) => filter(o).rows.map((r) => r.learnerId);

const failures = [];
const check = (ok, what) => { if (!ok) failures.push(what); };
const finished = (p) => p.archivedAt !== null || p.status === 'closed';
const N = fixture.length;

// ── The fixture reaches every branch, or the checks below prove nothing ──────
check(fixture.some((p) => p.contextVersion === null), 'fixture has nobody who never finished onboarding (L89)');
check(fixture.some((p) => p.programmes.length === 0 && p.cohorts.length === 0), 'fixture has nobody with no cohort and no programme');
check(fixture.some((p) => p.cohorts.length > 1), 'fixture has nobody in two cohorts');
check(fixture.some((p) => p.programmes.length > 0 && p.programmes.every(finished)), 'fixture has nobody whose every programme is finished');
check(fixture.some((p) => p.lastActivity === null), 'fixture has nobody with no activity');

// ── The server's order: lastActivity descending, NULLS LAST, then createdAt ──
const ms = (s) => (s ? Date.parse(s) : null);
for (let i = 1; i < people.length; i++) {
  const a = ms(people[i - 1].lastActivity), b = ms(people[i].lastActivity);
  check(!(a === null && b !== null), `order: ${people[i - 1].learnerId} (no activity) sorts before ${people[i].learnerId}`);
  check(!(a !== null && b !== null && a < b), `order: ${people[i - 1].learnerId} sorts before a more recent ${people[i].learnerId}`);
}

// ── AC1: everybody, once ────────────────────────────────────────────────────
const everyone = ids({ programmeFilter: 'any' });
check(everyone.length === N, `"any" lists ${everyone.length} of ${N} people`);
check(new Set(everyone).size === everyone.length, 'somebody appears twice');

// ── AC2: the default hides ONLY the all-finished, never the programme-less ──
const shown = new Set(ids({}));
for (const p of fixture) {
  const allFinished = p.programmes.length > 0 && p.programmes.every(finished);
  if (allFinished) check(!shown.has(p.learnerId), `default view shows ${p.learnerId}, whose every programme is finished`);
  else check(shown.has(p.learnerId), `default view HIDES ${p.learnerId}` + (p.programmes.length === 0 ? ' — who has no programme at all, which is L89\'s bug by filter' : ''));
}

// ── AC3: membership, not equality; unfiled is arithmetic ────────────────────
for (const p of fixture) for (const c of p.cohorts) {
  check(ids({ programmeFilter: 'any', cohortFilter: c.id }).includes(p.learnerId), `${p.learnerId} missing from their cohort ${c.id}`);
}
const unfiled = ids({ programmeFilter: 'any', cohortFilter: 'unfiled' }).length;
const withCohort = fixture.filter((p) => p.cohorts.length > 0).length;
check(unfiled === N - withCohort, `"not in a cohort yet" gives ${unfiled}, not ${N} - ${withCohort}`);

// ── AC5: three empty sentences, all different ───────────────────────────────
const empties = [
  run(filterSrc, { people: [], copy }).emptyText,
  filter({ query: 'zzz-nobody' }).emptyText,
  filter({ cohortFilter: 'c-nonexistent' }).emptyText,
];
check(empties.every((e) => e) && new Set(empties).size === 3, `the empty states are not three different sentences: ${JSON.stringify(empties)}`);

// ── AC6/AC7: nothing reads as a verdict about a person ──────────────────────
for (const r of filter({ programmeFilter: 'any' }).rows) {
  check(r.name, `${r.learnerId} has no name to click`);
  check(!/\b0 of 0\b|%|\bnever\b|incomplete/i.test(r.meta), `${r.learnerId}'s line reads as a verdict: ${r.meta}`);
}

// ── §4: the selects' options must not depend on the filters ─────────────────
// A Dropdown handed new items resets to its default, so options recomputed on
// every filter change snap the select back in the same tick (measured).
check(!/Inputs\.(query|cohortFilter|programmeFilter)\b/.test(optionsSrc), 'rf_opts reads a filter input, so every choice would reset the select');
check(!/cohortOptions|programmeOptions/.test(filterSrc.replace(/\/\*[\s\S]*?\*\//g, '')), 'rf_fn emits select options again — see rf_opts');
const opts = run(optionsSrc, { people, copy });
check(opts.hasCohortSelect && opts.hasProgrammeSelect, 'the full fixture offers no select');
const bare = run(optionsSrc, { people: people.filter((p) => !p.cohorts.length && !p.programmes.length), copy });
check(!bare.hasCohortSelect && !bare.hasProgrammeSelect, 'a select is offered when it could not change the list');

console.log(`checked ${N} people, ${everyone.length} listed, ${shown.size} by default, ${unfiled} unfiled`);
if (failures.length) {
  console.error('FAIL:\n' + failures.map((f) => '  - ' + f).join('\n'));
  process.exit(1);
}
console.log('OK: the roster lists everybody it is responsible for.');
