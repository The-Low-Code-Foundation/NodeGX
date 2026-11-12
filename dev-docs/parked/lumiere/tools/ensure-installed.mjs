// Installs three.js and three-vrm, and fetches the heroine and her animations, on the first start.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
if (!fs.existsSync(path.join(root, 'node_modules/@pixiv/three-vrm/lib/three-vrm.module.js'))) {
  console.log('installing three.js and three-vrm…');
  execSync('npm install --no-audit --no-fund', { cwd: root, stdio: 'inherit' });
}
if (!fs.existsSync(path.join(root, 'public/assets/CREDITS.md'))) {
  console.log('fetching the heroine and her animations…');
  execSync('node tools/fetch-assets.mjs', { cwd: root, stdio: 'inherit' });
}
