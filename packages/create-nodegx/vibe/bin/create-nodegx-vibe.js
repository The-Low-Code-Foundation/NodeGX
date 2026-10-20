#!/usr/bin/env node
/**
 * P112 OWN-019 (R29) — `npm create nodegx-vibe [folder]`: the Vibe kit. A thin package over the shared core: it runs
 * create-nodegx with `--vibe`, so every fix to the core reaches it and nothing is copied. The Vibe profile itself
 * (AGENTS.md, the nodegx agent, the server's `--profile vibe`) lives in create-nodegx's `profiles/vibe/`.
 *
 * Kept outside the `packages/*` workspaces on purpose (a new workspace moves the shared lockfile); its one
 * dependency is the create-nodegx of the same version, pinned exactly.
 */
const { spawnSync } = require('node:child_process');

const core = require.resolve('create-nodegx/bin/create-nodegx.js');
const args = process.argv.slice(2).filter((a) => a !== '--vibe');
if (args.includes('--help') || args.includes('-h')) {
  process.stdout.write('Usage: npm create nodegx-vibe [folder]\n\nSets a folder up so Mistral Vibe can build NodeGX apps in it. Default folder: this one.\n');
} else {
  const run = spawnSync(process.execPath, [core, ...args, '--vibe'], { stdio: 'inherit' });
  process.exitCode = run.status === null ? 1 : run.status;
}
