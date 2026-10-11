#!/usr/bin/env node
/**
 * Every workspace has its entries in the root lockfile (P109 ISL-047, P112-S1-LOCKFILE).
 *
 * `npm ci` refuses a tree whose lockfile lacks a workspace ("Missing: @nodegx/canvas-look@0.1.0 from lock file"), and
 * every CI job installs with `npm ci` (`.github/actions/setup`), so one new package without its lock entries fails
 * every job before it builds. That happened when `packages/nodegx-canvas-look` landed. This says the same thing
 * locally, before a push, without installing anything.
 *
 *     node scripts/check-lockfile-workspaces.js [path/to/package-lock.json]
 *
 * A workspace is a directory the root `workspaces` globs name that holds a `package.json` with a `name`. Each needs
 * `packages["<dir>"]` and `packages["node_modules/<name>"]` linked to it.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');

function workspaceDirs() {
  const globs = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')).workspaces || [];
  const dirs = [];
  for (const glob of globs) {
    if (glob.endsWith('/*')) {
      const parent = glob.slice(0, -2);
      for (const entry of fs.readdirSync(path.join(root, parent), { withFileTypes: true })) {
        if (entry.isDirectory()) dirs.push(`${parent}/${entry.name}`);
      }
    } else {
      dirs.push(glob);
    }
  }
  return dirs.filter((dir) => fs.existsSync(path.join(root, dir, 'package.json')));
}

function problems(lock) {
  const entries = lock.packages || {};
  const out = [];
  for (const dir of workspaceDirs()) {
    const manifest = JSON.parse(fs.readFileSync(path.join(root, dir, 'package.json'), 'utf8'));
    if (!manifest.name) continue;
    // Presence only: `npm ci` takes a workspace whose lock version lags its package.json (measured 2026-10-11, the
    // editor at 0.3.0 against 0.2.4), so a version check here would refuse what the real gate accepts.
    if (!entries[dir]) out.push(`${dir} (${manifest.name}) has no "${dir}" entry`);
    const link = entries[`node_modules/${manifest.name}`];
    if (!link || link.resolved !== dir || link.link !== true) out.push(`${manifest.name} has no "node_modules/${manifest.name}" link to ${dir}`);
  }
  return out;
}

const lockPath = path.resolve(process.argv[2] || path.join(root, 'package-lock.json'));
const found = problems(JSON.parse(fs.readFileSync(lockPath, 'utf8')));
if (found.length) {
  console.error(`${path.relative(root, lockPath) || lockPath} is missing workspace entries, so \`npm ci\` would refuse the tree:`);
  for (const line of found) console.error(`  - ${line}`);
  console.error('Add them (run `npm install` once, and check other platforms\' prebuilts survived a lock made on a Mac).');
  process.exit(1);
}
console.log(`lockfile:check — every workspace (${workspaceDirs().length}) has its lock entries.`);
