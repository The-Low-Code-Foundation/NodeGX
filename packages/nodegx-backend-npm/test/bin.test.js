// @nodegx/backend — the bin's words and the two places the pack reaches into the deploy's source (build.mjs).
'use strict';
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const BIN = path.join(__dirname, '..', 'bin', 'nodegx-online.js');
const run = (...args) => spawnSync(process.execPath, [BIN, ...args], { encoding: 'utf8' });

test('help names the three commands a person types, and exits 0 when asked for', () => {
  const r = run('--help');
  assert.equal(r.status, 0);
  for (const line of ['npx @nodegx/backend sign-in cloudflare', 'npx @nodegx/backend deploy cloudflare <app folder>', 'npx @nodegx/backend domain'])
    assert.ok(r.stdout.includes(line), line);
  assert.equal(run().status, 2);
});

test('a host it cannot deploy to is a sentence and exit 2, before anything is built or signed in', () => {
  const r = run('deploy', 'netlify', '.');
  assert.equal(r.status, 2);
  assert.match(r.stderr, /"netlify" is not a host it can deploy to yet/);
  assert.equal(run('sign-in').status, 2);
});

test('the deploy source still has what build.mjs rewrites and exports (a change there stops the pack, and this)', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', '..', 'nodegx-backend', 'cloudflare', 'deployCloudflare.ts'), 'utf8');
  assert.ok(src.includes('const USAGE = `usage: deploy.mjs <project>'));
  assert.match(src, /^async function buildWorker\(/m);
  assert.match(src, /^function wranglerCommand\(\)/m);
  // the installed deploy's esbuild is the copier, and the copier is asked for worker.ts only
  assert.match(src, /require\('esbuild'\)/);
  assert.match(src, /entryPoints: \[path\.join\(HERE, 'worker\.ts'\)\]/);
  assert.match(src, /require\(path\.join\(HERE, '\.\.', 'scripts', 'build\.js'\)\)/);
});
