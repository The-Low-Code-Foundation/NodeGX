#!/usr/bin/env node
/**
 * TPL-010-H, ruling H2 — put the planner's collections into the todo list's policy, and nothing else.
 *
 * One backend serves both apps (H1), so one `security.json` decides who may read and write what for
 * both of them. This merges rather than replaces, because the file on the box is the live policy for
 * a database holding Richard's todo list — losing a line of it is losing the rule that keeps a row
 * private.
 *
 * What it will not do:
 *   - overwrite a collection the live policy already names (a name collision is a REFUSAL, not a
 *     merge: two apps meaning two different things by `Block` is a data problem, not a policy one);
 *   - change `defaults`, `files`, `functions` or `signup` — the live file's own values stand, because
 *     the todo list's posture is the one in production and the planner's file is a template's default;
 *   - drop anything. Every collection in either file is in the result, and the count is asserted.
 *
 *   node merge-policy.js <live-security.json> <planner.security.json> <out.json>
 *
 * Exits 0 on a clean merge, 1 on any refusal. Print the result before you ship it.
 */
const fs = require('fs');

const [, , livePath, plannerPath, outPath] = process.argv;
if (!livePath || !plannerPath || !outPath) {
  console.error('usage: merge-policy.js <live-security.json> <planner.security.json> <out.json>');
  process.exit(1);
}

const read = (p) => {
  let raw;
  try {
    raw = fs.readFileSync(p, 'utf8');
  } catch (error) {
    console.error(`REFUSING: cannot read ${p} — ${error.message}`);
    process.exit(1);
  }
  try {
    return JSON.parse(raw);
  } catch (error) {
    console.error(`REFUSING: ${p} is not JSON — ${error.message}`);
    process.exit(1);
  }
};

const live = read(livePath);
const planner = read(plannerPath);

for (const [label, doc] of [['live', live], ['planner', planner]]) {
  if (!doc.collections || typeof doc.collections !== 'object') {
    console.error(`REFUSING: the ${label} policy has no collections object.`);
    process.exit(1);
  }
}

// The todo list's own collections have to survive this, and they are what provision.sh checks for.
if (!live.collections.Task) {
  console.error('REFUSING: the live policy does not name `Task` — that is not the todo list\'s policy.');
  process.exit(1);
}

const collisions = Object.keys(planner.collections).filter((name) => name in live.collections);
if (collisions.length) {
  console.error(`REFUSING: ${collisions.join(', ')} already in the live policy. Rename the planner's collection, or decide the two apps share it on purpose — either way, by hand.`);
  process.exit(1);
}

const merged = {
  ...live,
  collections: { ...live.collections, ...planner.collections }
};

const expected = Object.keys(live.collections).length + Object.keys(planner.collections).length;
const got = Object.keys(merged.collections).length;
if (got !== expected) {
  console.error(`REFUSING: merged policy has ${got} collections, expected ${expected}.`);
  process.exit(1);
}

fs.writeFileSync(outPath, JSON.stringify(merged, null, 2) + '\n');
console.log(`wrote ${outPath}`);
console.log(`  kept  ${Object.keys(live.collections).length}: ${Object.keys(live.collections).join(', ')}`);
console.log(`  added ${Object.keys(planner.collections).length}: ${Object.keys(planner.collections).join(', ')}`);
console.log(`  defaults, files, functions and signup are the LIVE file's, unchanged: signup=${merged.signup}, devOpen=${merged.devOpen}`);
