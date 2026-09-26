/**
 * The shipped policy is adopted on a new version, and only then. Run: node --test policy.test.js
 */
'use strict';

const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { test } = require('node:test');

const { adoptShippedPolicy, MARKER } = require('./policy');

const TODO = { version: 1, devOpen: false, collections: { Task: { permissions: { find: 'authenticated' } } } };
const JOURNAL = { version: 1, devOpen: false, collections: { JournalPage: { permissions: { find: 'public' } } } };

function folder() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'nb-policy-'));
  const shipped = path.join(root, 'policy', 'nodegx.security.json');
  const dataDir = path.join(root, 'book');
  fs.mkdirSync(path.dirname(shipped), { recursive: true });
  return { root, shipped, dataDir, installed: path.join(dataDir, 'security.json') };
}
const write = (f, o) => (fs.mkdirSync(path.dirname(f), { recursive: true }), fs.writeFileSync(f, JSON.stringify(o, null, 2)));
const read = (f) => JSON.parse(fs.readFileSync(f, 'utf8'));

test('a first start leaves the install to the backend and remembers what was shipped', () => {
  const f = folder();
  write(f.shipped, JOURNAL);
  assert.deepEqual(adoptShippedPolicy({ shipped: f.shipped, dataDir: f.dataDir, version: '0.0.2' }), { action: 'first' });
  assert.equal(fs.existsSync(f.installed), false);
  assert.ok(fs.existsSync(path.join(f.dataDir, MARKER)));
});

test('0.0.2 over 0.0.1: the todo rules are kept beside, and moved out so the journal rules go in', () => {
  const f = folder();
  write(f.installed, TODO); // what 0.0.1's first start left (it had no marker)
  write(f.shipped, JOURNAL);
  const r = adoptShippedPolicy({ shipped: f.shipped, dataDir: f.dataDir, version: '0.0.2', now: () => new Date('2026-09-26T18:00:00Z') });
  assert.equal(r.action, 'replaced');
  assert.equal(fs.existsSync(f.installed), false, 'the backend must find no security.json, so it installs the shipped one');
  assert.deepEqual(read(r.keptAs), TODO);
  assert.match(path.basename(r.keptAs), /^security\.before-0\.0\.2-2026-09-26T18-00-00-000Z\.json$/);
});

test('the same version again touches nothing, even a policy the backend rewrote', () => {
  const f = folder();
  write(f.shipped, JOURNAL);
  adoptShippedPolicy({ shipped: f.shipped, dataDir: f.dataDir, version: '0.0.2' });
  write(f.installed, { ...JOURNAL, installedBy: 'backend' });
  assert.deepEqual(adoptShippedPolicy({ shipped: f.shipped, dataDir: f.dataDir, version: '0.0.2' }), { action: 'none' });
  assert.equal(read(f.installed).installedBy, 'backend');
});

test('an installed policy equal to the shipped one is left in place', () => {
  const f = folder();
  write(f.installed, JOURNAL);
  write(f.shipped, JOURNAL);
  assert.deepEqual(adoptShippedPolicy({ shipped: f.shipped, dataDir: f.dataDir, version: '0.0.2' }), { action: 'same' });
  assert.deepEqual(read(f.installed), JOURNAL);
});

test('no shipped policy: nothing is touched', () => {
  const f = folder();
  write(f.installed, TODO);
  assert.deepEqual(adoptShippedPolicy({ shipped: f.shipped, dataDir: f.dataDir, version: '0.0.2' }), { action: 'none' });
  assert.deepEqual(read(f.installed), TODO);
});
