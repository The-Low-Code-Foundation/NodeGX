/** AC6: the model file's sha256 at first launch — a match is remembered, a mismatch refuses, a changed file is re-hashed. */
'use strict';

const assert = require('node:assert/strict');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { test } = require('node:test');

const { checkModel } = require('../model-check');
const { tmp } = require('./helpers');

const sha = (b) => crypto.createHash('sha256').update(b).digest('hex');

test('a matching file is ok; the second check reads the marker instead of hashing again', async () => {
  const dir = tmp('garden-model-');
  const file = path.join(dir, 'model.gguf');
  fs.writeFileSync(file, 'GGUF fake bytes');
  const r1 = await checkModel({ file, expected: sha('GGUF fake bytes'), dataDir: path.join(dir, 'island') });
  assert.equal(r1.ok, true);
  assert.equal(r1.cached, false);
  assert.ok(fs.existsSync(path.join(dir, 'island', 'model-check.json')));
  const r2 = await checkModel({ file, expected: sha('GGUF fake bytes'), dataDir: path.join(dir, 'island') });
  assert.equal(r2.ok, true);
  assert.equal(r2.cached, true);
});

test('a mismatch is refused with its reason and the real hash, and is not un-refused by the marker', async () => {
  const dir = tmp('garden-model-');
  const file = path.join(dir, 'model.gguf');
  fs.writeFileSync(file, 'GGUF other bytes');
  const r = await checkModel({ file, expected: sha('GGUF fake bytes'), dataDir: path.join(dir, 'island') });
  assert.equal(r.ok, false);
  assert.equal(r.reason, 'sha256-mismatch');
  assert.equal(r.sha256, sha('GGUF other bytes'));
  const again = await checkModel({ file, expected: sha('GGUF fake bytes'), dataDir: path.join(dir, 'island') });
  assert.equal(again.ok, false);
  assert.equal(again.cached, true);
});

test('a file that changed since the marker is hashed again; a missing file is no-model', async () => {
  const dir = tmp('garden-model-');
  const file = path.join(dir, 'model.gguf');
  fs.writeFileSync(file, 'GGUF fake bytes');
  await checkModel({ file, expected: sha('GGUF fake bytes'), dataDir: path.join(dir, 'island') });
  fs.writeFileSync(file, 'GGUF tampered!!');
  const r = await checkModel({ file, expected: sha('GGUF fake bytes'), dataDir: path.join(dir, 'island') });
  assert.equal(r.cached, false);
  assert.equal(r.ok, false);
  assert.equal(r.reason, 'sha256-mismatch');
  assert.deepEqual((await checkModel({ file: path.join(dir, 'none.gguf'), expected: 'x', dataDir: dir })).reason, 'no-model');
});
