/**
 * NSP-006 — the stranger rounds, and the sha256 of every file a stranger was handed and may not
 * change (`tests/stranger-suite-hashes.json`). Plain JS so it runs without ts-node and so a lab
 * copy can point a round at its own directory:
 *
 *   cd packages/nodegx-node-spec && node -e "require('./tests/stranger-suite-hashes.helper.js').write()"
 *
 * A ROUND is one fresh agent, one set of nodes, one fixture directory (`tests/stranger.test.ts`
 * grades every round listed here). Round 1 (s5) is the pilot five; round 2 (s6) adds the two
 * batch nodes whose outputs pass through `undefined` mid-frame — the hole round 1's engine had
 * (NSP-006 §5.4) that no pilot node could show.
 */
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

/** The format — what every round is handed. */
const FORMAT_FILES = ['src/spec.ts', 'src/coerce.ts', 'src/canonical.ts', 'src/trace.ts', 'src/adapter.ts', 'schema/trace.schema.json'];

const PILOT_FIVE = ['Counter', 'Switch', 'And', 'Condition', 'String Format'];
const SPEC_FILE = { Counter: 'counter', Switch: 'switch', And: 'and', Condition: 'condition', 'String Format': 'string-format', Inverter: 'inverter', 'Boolean To String': 'boolean-to-string', Timer: 'delay', Repeat: 'repeat', 'net.noodl.animatetovalue': 'animate-to-value', 'net.noodl.UUID': 'uuid', 'Screen Resolution': 'screen-resolution', 'net.noodl.controls.options': 'dropdown' };

/**
 * `extra`: files a round is handed beyond the format and its specs (round 3: the world's rules, a module a spec imports).
 * `page`: the round's nodes are drawn on a page a person acts on (round 4, `tests/stranger-page.js`): its target is
 * made as `strangerTarget(page)`.
 */
function round(number, dir, session, nodes, extra = [], page = false) {
  return {
    round: number,
    dir,
    session,
    nodes,
    page,
    guarded: [...FORMAT_FILES, ...extra, ...nodes.map((n) => `src/nodes/${SPEC_FILE[n]}.ts`), ...nodes.map((n) => `scenarios/${n}.json`)]
  };
}

const ROUNDS = [
  round(1, 'stranger', 's5', PILOT_FIVE),
  round(2, 'stranger-2', 's6', [...PILOT_FIVE, 'Inverter', 'Boolean To String']),
  // NSP-013 s13: five nodes that live by the world (clock, timers and pending outcomes, frame time, random, viewport)
  round(3, 'stranger-3', 's13', ['Timer', 'Repeat', 'net.noodl.animatetovalue', 'net.noodl.UUID', 'Screen Resolution'], ['src/world.ts', 'src/nodes/ease-curves.ts']),
  // NSP-023 step 8 (AC5, s49): a converted visual control on plain DOM, no React — the Dropdown, drawn by the target into the
  // page's document and acted on through it (`tests/stranger-page.js`); the module of the two helpers dropdown.ts imports — in
  // text-input.ts when round 4 ran, moved to `data-attributes.ts` in s50 (round 4's finding: the stranger had to read another
  // node's spec to find them); and since s103 the modules of the two warnings it imports (`focus-not-mounted.ts`, `icon-source.ts`
  // and its `describe-value.ts`, R35 — what the editor is told, which a stranger's target, having no editor, is not graded on)
  round(4, 'stranger-4', 's49', ['net.noodl.controls.options'], ['src/world.ts', 'src/nodes/data-attributes.ts', 'src/nodes/focus-not-mounted.ts', 'src/nodes/icon-source.ts', 'src/nodes/describe-value.ts', 'tests/stranger-page.js'], true)
];

/** The union, sorted — the hash file's keys. */
const GUARDED_FILES = [...new Set(ROUNDS.flatMap((r) => r.guarded))].sort();

function hashOf(relative) {
  return crypto.createHash('sha256').update(fs.readFileSync(path.join(ROOT, relative))).digest('hex');
}

function hashes() {
  const out = {};
  for (const f of GUARDED_FILES) out[f] = hashOf(f);
  return out;
}

function write() {
  const file = path.join(__dirname, 'stranger-suite-hashes.json');
  fs.writeFileSync(file, JSON.stringify(hashes(), null, 2) + '\n');
  // eslint-disable-next-line no-console
  console.log(`wrote ${file} (${GUARDED_FILES.length} files, ${ROUNDS.length} rounds)`);
}

module.exports = { FORMAT_FILES, ROUNDS, GUARDED_FILES, hashOf, hashes, write };
