/**
 * NSP-006 — writes tests/stranger-suite-hashes.json: the sha256 of every file the stranger was
 * handed and may not change. The list is duplicated from tests/stranger.test.ts `GUARDED_FILES`
 * (the test asserts the two agree). Plain JS so it runs without ts-node:
 *
 *   cd packages/nodegx-node-spec && node -e "require('./tests/stranger-suite-hashes.helper.js').write()"
 */
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const GUARDED_FILES = [
  'src/spec.ts',
  'src/coerce.ts',
  'src/canonical.ts',
  'src/trace.ts',
  'src/adapter.ts',
  'schema/trace.schema.json',
  'src/nodes/counter.ts',
  'src/nodes/switch.ts',
  'src/nodes/and.ts',
  'src/nodes/condition.ts',
  'src/nodes/string-format.ts',
  'scenarios/Counter.json',
  'scenarios/Switch.json',
  'scenarios/And.json',
  'scenarios/Condition.json',
  'scenarios/String Format.json'
];

function hashes() {
  const out = {};
  for (const f of GUARDED_FILES) out[f] = crypto.createHash('sha256').update(fs.readFileSync(path.join(ROOT, f))).digest('hex');
  return out;
}

function write() {
  const file = path.join(__dirname, 'stranger-suite-hashes.json');
  fs.writeFileSync(file, JSON.stringify(hashes(), null, 2) + '\n');
  // eslint-disable-next-line no-console
  console.log(`wrote ${file} (${GUARDED_FILES.length} files)`);
}

module.exports = { GUARDED_FILES, hashes, write };
