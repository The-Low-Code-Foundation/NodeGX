// Runs before `npm start`: installs the kit the first time, so starting is one command.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const needed = ['@nodegx/project-contract', '@nodegx/node-spec', '@nodegx/preview', '@nodegx/canvas-look', 'three'];
if (needed.some((p) => !fs.existsSync(path.join(root, 'node_modules', p, 'package.json')))) {
  console.log('Installing the NodeGX kit and three.js (first start only)…');
  const r = spawnSync(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['install'], { cwd: root, stdio: 'inherit' });
  process.exit(r.status ?? 1);
}
