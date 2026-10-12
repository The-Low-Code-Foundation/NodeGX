#!/usr/bin/env node
/**
 * P112 OWN-011 — the home-made-editor kit as a stranger installs it (P112-S10-CLASSICTYPES).
 *
 *   node scripts/own/stranger-kit.mjs <folder holding the three .tgz files>
 *
 * `npm pack` `@nodegx/node-spec`, `@nodegx/canvas-look` and the folder `@nodegx/project-contract`'s `build:publish`
 * writes, into one folder; this installs the three in an empty folder under the OS temp dir (nothing above it to rescue a
 * missing dependency, `HOME` empty), loads every published entry in CommonJS and the two ESM ones, and typechecks
 * `stranger-kit-consumer.ts` against the shipped declarations under the three module resolutions a consumer may use:
 * `node` (classic, which ignores an `exports` map), `bundler` and `node16`. Exit 1 on any failure.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const tgzDir = path.resolve(process.argv[2] || '');
const tarballs = fs.existsSync(tgzDir) ? fs.readdirSync(tgzDir).filter((f) => /^nodegx-(node-spec|canvas-look|project-contract)-.*\.tgz$/.test(f)) : [];
if (tarballs.length !== 3) {
  console.error(`expected the three kit tarballs in ${tgzDir}, found ${tarballs.length}`);
  process.exit(1);
}

const work = fs.mkdtempSync(path.join(os.tmpdir(), 'stranger-kit-'));
const env = { ...process.env, HOME: path.join(work, 'home') };
fs.mkdirSync(env.HOME);
const app = path.join(work, 'app');
fs.mkdirSync(app);
fs.writeFileSync(path.join(app, 'package.json'), JSON.stringify({ name: 'stranger', version: '1.0.0', private: true }));
const sh = (cmd, args) => execFileSync(cmd, args, { cwd: app, env, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
sh('npm', ['install', '--no-audit', '--no-fund', ...tarballs.map((f) => path.join(tgzDir, f)), 'typescript@5', '@types/node']);

const ENTRIES = [
  '@nodegx/node-spec', '@nodegx/node-spec/node', '@nodegx/canvas-look',
  ...['', '/format', '/format-node', '/format/validator', '/tokens', '/token-codecs', '/world', '/editor-suite', '/editor-suite-node',
    '/function-ports', '/hash', '/logic-builder-io', '/run-on-value-change-migration'].map((s) => `@nodegx/project-contract${s}`)
];
let failures = 0;
for (const entry of ENTRIES) {
  try {
    sh(process.execPath, ['-e', `require(${JSON.stringify(entry)})`]);
  } catch (e) {
    failures++;
    console.log(`FAIL require ${entry}: ${String(e.stderr).split('\n').find((l) => /Error/.test(l))}`);
  }
}
try {
  sh(process.execPath, ['--input-type=module', '-e', 'await import("@nodegx/node-spec"); await import("@nodegx/canvas-look");']);
} catch (e) {
  failures++;
  console.log(`FAIL import (ESM): ${e.stderr}`);
}
console.log(`${ENTRIES.length} CommonJS entries and 2 ESM entries loaded, ${failures} failure(s)`);

fs.copyFileSync(path.join(here, 'stranger-kit-consumer.ts'), path.join(app, 'consumer.ts'));
for (const [resolution, module] of [['node', 'commonjs'], ['bundler', 'esnext'], ['node16', 'node16']]) {
  try {
    sh(path.join(app, 'node_modules', '.bin', 'tsc'), ['--noEmit', '--strict', '--types', 'node', '--target', 'es2020', '--module', module, '--moduleResolution', resolution, 'consumer.ts']);
    console.log(`types, moduleResolution ${resolution}: ok`);
  } catch (e) {
    failures++;
    console.log(`FAIL types, moduleResolution ${resolution}:\n${e.stdout}`);
  }
}
fs.rmSync(work, { recursive: true, force: true });
process.exit(failures ? 1 : 0);
