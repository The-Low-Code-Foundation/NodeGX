// Copies a project folder to a fresh place to test on (the target is replaced).
// node tools/copy.mjs <project-dir> <target-dir>
import fs from 'node:fs';
const [from, to] = process.argv.slice(2);
fs.rmSync(to, { recursive: true, force: true });
fs.cpSync(from, to, { recursive: true });
console.log(`copied ${from} → ${to}`);
