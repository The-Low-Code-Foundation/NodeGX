// Saving to disk the way the page does: the real server on a copy of the app, the page's document
// in Node, and the page's two requests (open, save). Checks that opening writes nothing, a save
// writes valid files, an empty save writes nothing, and a part someone else changed is refused.

import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateStructure } from '@nodegx/project-contract/editor-suite.js';
import { BlockDocument } from '../src/model.js';
import { copyApp } from './copy-app.mjs';
import { fingerprint } from './fingerprint.mjs';

const editor = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const app = path.resolve(editor, process.argv[2] || '../todo-list');
const copy = copyApp(app, path.join(editor, '.test-copies', 'disk'));

let failures = 0;
const check = (ok, words) => {
  console.log(`${ok ? 'ok ' : 'BAD'} ${words}`);
  if (!ok) failures++;
};

function readTree(root) {
  const out = {};
  const walk = (d) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const abs = path.join(d, e.name);
      if (e.isDirectory()) walk(abs);
      else out[path.relative(root, abs).split(path.sep).join('/')] = fs.readFileSync(abs, 'utf8');
    }
  };
  walk(root);
  return out;
}

const server = spawn(process.execPath, ['server.mjs', copy, '--no-open', '--port', '0'], { cwd: editor });
const base = await new Promise((resolve, reject) => {
  let text = '';
  server.stdout.on('data', (d) => {
    text += d;
    const m = /Open (http:\/\/127\.0\.0\.1:\d+\/)/.exec(text);
    if (m) resolve(m[1]);
  });
  server.stderr.on('data', (d) => (text += d));
  server.on('exit', () => reject(new Error('the server stopped: ' + text)));
  setTimeout(() => reject(new Error('the server did not start: ' + text)), 15000);
});
const get = async (p) => (await fetch(base + p)).json();
const post = async (p, body) => (await fetch(base + p, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })).json();

try {
  const projectFileBefore = fs.readFileSync(path.join(copy, 'nodegx.project.json'), 'utf8');
  const start = fingerprint(copy);
  const project = await get('api/project');
  check(fingerprint(copy) === start, 'opening the app writes nothing');
  check(project.components.length === Object.keys(JSON.parse(fs.readFileSync(path.join(copy, 'components/_registry.json'), 'utf8')).components).length, `every part is opened (${project.components.length})`);
  for (const p of ['', 'app.js', 'words.js', 'src/model.js', 'runtime/index.html', 'runtime/noodl.deploy.js', 'kit/preview-in-page.js']) {
    const r = await fetch(base + p);
    check(r.ok, `the page can load /${p} (${r.status})`);
  }

  const doc = new BlockDocument();
  doc.open(project);
  doc.setSetting('Pages/Sign in', 'siTitle', 'text', 'Hello from a child');
  const added = doc.addBlock('Pages/Sign in', { type: 'Text', parent: 'siCard', index: 0, parameters: { text: 'New words' } });
  doc.setSetting('Pages/Sign in', added, 'fontSize', 48);
  let { results } = await post('api/save', { changes: doc.changes() });
  check(results.length === 1 && results[0].ok && !results[0].unchanged, 'a change is saved');
  doc.saved(results);
  const nodes = JSON.parse(fs.readFileSync(path.join(copy, 'components/Pages/Sign in/nodes.json'), 'utf8'));
  check(nodes.nodes.find((n) => n.id === 'siTitle').parameters.text === 'Hello from a child', 'the new words are in the file');
  const fresh = nodes.nodes.find((n) => n.id === added);
  check(fresh && fresh.parameters.fontSize === 48 && fresh.x === undefined && fresh.y === undefined, 'the new block is in the file, its size a number, with no position (a child of a box has none)');
  const problems = validateStructure(readTree(copy));
  check(problems.length === 0, `every file still fits the format${problems.length ? ': ' + problems.slice(0, 3).join(' | ') : ''}`);
  check(fs.readFileSync(path.join(copy, 'nodegx.project.json'), 'utf8') === projectFileBefore, "the project file (its id, its format version) is untouched");

  const afterSave = fingerprint(copy);
  ({ results } = await post('api/save', { changes: [{ key: 'Pages/Sign in', revision: results[0].revision, files: doc.component('Pages/Sign in').files }] }));
  check(results[0].ok && results[0].unchanged && fingerprint(copy) === afterSave, 'saving what is already there writes nothing');

  // Someone else changes the part on disk while the child is still working on it.
  doc.setSetting('Pages/Sign in', 'siTitle', 'text', 'The child wants this');
  const file = path.join(copy, 'components/Pages/Sign in/nodes.json');
  const theirs = fs.readFileSync(file, 'utf8').replace('Hello from a child', 'Someone else wrote this');
  fs.writeFileSync(file, theirs);
  ({ results } = await post('api/save', { changes: doc.changes() }));
  check(!results[0].ok && ['drift', 'stale-revision'].includes(results[0].reason), `a part someone else changed is refused (${results[0].reason})`);
  check(fs.readFileSync(file, 'utf8') === theirs, "and their change is still on disk");

  const reread = await get('api/component?key=' + encodeURIComponent('Pages/Sign in'));
  doc.reload('Pages/Sign in', reread);
  doc.setSetting('Pages/Sign in', 'siTitle', 'text', 'Now on top of theirs');
  ({ results } = await post('api/save', { changes: doc.changes() }));
  check(results[0].ok, 'after loading their version, saving works again');

  // A broken part never reaches the disk.
  const broken = JSON.parse(JSON.stringify(doc.component('Pages/Sign in').files));
  broken.nodes.nodes.find((n) => n.id === 'siCard').children.push('siTitle');
  const beforeBroken = fingerprint(copy);
  ({ results } = await post('api/save', { changes: [{ key: 'Pages/Sign in', revision: results[0].revision, files: broken }] }));
  check(!results[0].ok && results[0].reason === 'invalid' && fingerprint(copy) === beforeBroken, `a part with a child listed twice is refused: ${results[0].message}`);
} catch (err) {
  check(false, err.stack || String(err));
} finally {
  server.kill();
}
process.exit(failures ? 1 : 0);
