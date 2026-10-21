// Installs three.js on the first start.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
if (!fs.existsSync(path.join(root, 'node_modules/three/build/three.module.js'))) {
  console.log('installing three.js…');
  execSync('npm install --no-audit --no-fund', { cwd: root, stdio: 'inherit' });
}
