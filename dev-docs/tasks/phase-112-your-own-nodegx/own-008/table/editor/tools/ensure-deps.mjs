// Runs before `npm start`: installs the kit the first time, so `npm start` is the only command.
import { existsSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const needed = ['@nodegx/project-contract', '@nodegx/node-spec', '@nodegx/preview'];
if (needed.some((p) => !existsSync(new URL(`../node_modules/${p}/package.json`, import.meta.url)))) {
  console.log('Installing the NodeGX kit (first start only)…');
  execSync('npm install --no-audit --no-fund', { cwd: root, stdio: 'inherit' });
}
