/**
 * `three-kit add` — the npm install path (THREE-IN-NODES R2). Runs the bin as a person would, on copies of the
 * parked fixture, and reads what it leaves on disk. `node --test library/modules/three-kit/test/*.test.js`.
 */
'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const BIN = path.join(__dirname, '..', 'bin', 'three-kit.js');
const KIT = path.join(__dirname, '..', 'project', 'noodl_modules', 'three-kit');
const FIXTURE = path.join(__dirname, '..', '..', '..', '..', 'dev-docs', 'parked', 'three-in-nodes', 'fixture');
const VERSION = require('../package.json').version;

const run = (args, cwd) => spawnSync(process.execPath, [BIN, ...args], { cwd, encoding: 'utf8' });
const project = (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'three-kit-add-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  fs.cpSync(FIXTURE, path.join(dir, 'app'), { recursive: true });
  return path.join(dir, 'app');
};
const provenance = (dir) => JSON.parse(fs.readFileSync(path.join(dir, 'noodl_modules', 'kit-provenance.json'), 'utf8'));

test('the fixture ships without the kit (the control every other test leans on)', () => {
  assert.equal(fs.existsSync(path.join(FIXTURE, 'noodl_modules', 'three-kit')), false);
});

test('add, run from a component folder deep in the project, copies every kit file byte for byte', (t) => {
  const dir = project(t);
  const r = run(['add'], path.join(dir, 'components', 'Parts', 'Bar'));
  assert.equal(r.status, 0, r.stderr);
  const files = fs.readdirSync(KIT).sort();
  assert.deepEqual(fs.readdirSync(path.join(dir, 'noodl_modules', 'three-kit')).sort(), files);
  assert.deepEqual(files, ['LICENSE.txt', 'index.js', 'manifest.json', 'three.min.js']);
  for (const f of files) assert.ok(fs.readFileSync(path.join(KIT, f)).equals(fs.readFileSync(path.join(dir, 'noodl_modules', 'three-kit', f))), f);
});

test('the copy is recorded as the editor\'s imported arm, and other kits\' records are kept', (t) => {
  const dir = project(t);
  fs.mkdirSync(path.join(dir, 'noodl_modules'), { recursive: true });
  const other = { module: 'game-kit', origin: 'local', createdAt: '2026-01-01T00:00:00.000Z' };
  const stale = { module: 'three-kit', origin: 'local', createdAt: '2026-01-01T00:00:00.000Z' };
  fs.writeFileSync(path.join(dir, 'noodl_modules', 'kit-provenance.json'), JSON.stringify([other, stale]));
  assert.equal(run(['add', dir], os.tmpdir()).status, 0);
  const records = provenance(dir);
  assert.equal(records.length, 2);
  assert.deepEqual(records[0], other);
  const mine = records[1];
  assert.equal(mine.module, 'three-kit');
  assert.equal(mine.origin, 'imported');
  assert.equal(mine.fromProject, `@nodegx/three-kit@${VERSION} from npm`);
  assert.equal(mine.entry, 'three-kit');
  assert.equal(mine.entryVersion, VERSION);
  assert.ok(!Number.isNaN(Date.parse(mine.importedAt)));
});

test('a second add is a no-op; a different copy is refused without --force and replaced with it', (t) => {
  const dir = project(t);
  assert.equal(run(['add', dir]).status, 0);
  const again = run(['add', dir]);
  assert.equal(again.status, 0);
  assert.match(again.stdout, /already in/);

  const index = path.join(dir, 'noodl_modules', 'three-kit', 'index.js');
  fs.appendFileSync(index, '\n// my edit\n');
  const refused = run(['add', dir]);
  assert.equal(refused.status, 1);
  assert.match(refused.stderr, /--force/);
  assert.match(fs.readFileSync(index, 'utf8'), /my edit/);

  const forced = run(['add', dir, '--force']);
  assert.equal(forced.status, 0, forced.stderr);
  assert.ok(fs.readFileSync(index).equals(fs.readFileSync(path.join(KIT, 'index.js'))));
});

test('outside a project it refuses and writes nothing; no command is a usage error', (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'three-kit-none-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const r = run(['add', dir]);
  assert.equal(r.status, 1);
  assert.match(r.stderr, /No NodeGX project/);
  assert.deepEqual(fs.readdirSync(dir), []);
  assert.equal(run([]).status, 2);
});
