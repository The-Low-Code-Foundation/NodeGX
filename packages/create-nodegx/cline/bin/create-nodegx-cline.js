#!/usr/bin/env node
/**
 * P112 OWN-020 (R41) — `npm create nodegx-cline [folder]`: the Cline kit. A thin package over the shared core, the
 * shape of create-nodegx-vibe: it runs create-nodegx with `--cline`, so every fix to the core reaches it and nothing is
 * copied. What `--cline` writes, and the one entry it adds to Cline's MCP file (R42), is in create-nodegx.
 *
 * Kept outside the `packages/*` workspaces on purpose (a new workspace moves the shared lockfile); its one
 * dependency is the create-nodegx of the same version, pinned exactly.
 */
const { spawnSync } = require('node:child_process');

const core = require.resolve('create-nodegx/bin/create-nodegx.js');
const args = process.argv.slice(2).filter((a) => a !== '--cline');
if (args.includes('--help') || args.includes('-h')) {
  process.stdout.write(
    'Usage: npm create nodegx-cline [folder]\n\nSets a folder up so Cline can build NodeGX apps in it. Default folder: this one.\n' +
      "Adds one \"nodegx\" server to Cline's MCP settings, the only file it writes outside the folder.\n"
  );
} else {
  const run = spawnSync(process.execPath, [core, ...args, '--cline'], { stdio: 'inherit' });
  process.exitCode = run.status === null ? 1 : run.status;
}
