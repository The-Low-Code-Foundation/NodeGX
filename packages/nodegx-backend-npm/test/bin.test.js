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

test('the deploy exports the seam the pack and the bin use, and copies a prebuilt Worker itself (P135 ODT-003)', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', '..', 'nodegx-backend', 'cloudflare', 'deployCloudflare.ts'), 'utf8');
  // the pack builds the Worker with this (noodl-mcp/build-cloudflare-copy.mjs), handing it its own esbuild
  assert.match(src, /^export async function bundleWorker\(outfile: string, plugins: unknown\[\] = \[\], esbuild: any = require\('esbuild'\)\)/m);
  // an install's deploy copies the prebuilt Worker instead of bundling
  assert.match(src, /const prebuilt = process\.env\.NODEGX_CLOUDFLARE_WORKER;/);
  // the bin's `sign-in` and `whoami` run the deploy's own wrangler; its usage line names the bin's spelling
  assert.match(src, /^export function wranglerCommand\(\)/m);
  assert.match(src, /process\.env\.NODEGX_CLOUDFLARE_COMMAND/);
  assert.match(src, /^export async function main\(/m);
});
