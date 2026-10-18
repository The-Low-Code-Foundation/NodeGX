// Starts the editor the way `npm start` does, on the real app, opens it as the page would, and
// shows that opening wrote nothing. Run it with: node test/start-check.mjs
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { fingerprint } from './fingerprint.mjs';

const editor = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const app = path.resolve(editor, '../todo-list');
const before = fingerprint(app);
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const child = spawn(npm, ['start', '--', '--no-open', '--port', '0'], { cwd: editor, detached: true });
let text = '';
const base = await new Promise((resolve, reject) => {
  child.stdout.on('data', (d) => {
    text += d;
    const m = /Open (http:\/\/127\.0\.0\.1:\d+\/)/.exec(text);
    if (m) resolve(m[1]);
  });
  setTimeout(() => reject(new Error(text)), 15000);
});
const project = await (await fetch(base + 'api/project')).json();
const page = await fetch(base);
process.kill(-child.pid);
console.log(text.trim().split('\n').filter((l) => !l.startsWith('>')).join('\n'));
console.log(`page ${page.status}; opened "${project.name}" with ${project.components.length} parts from ${project.dir}`);
const after = fingerprint(app);
console.log(before === after ? 'the app is byte for byte as it was' : 'THE APP CHANGED');
process.exit(before === after && page.ok ? 0 : 1);
