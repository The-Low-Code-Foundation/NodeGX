// `npm test`: the kit's editor suite on a copy of the app (must PASS), the control arm (must FAIL),
// the words check and the save-to-disk check. The app itself is fingerprinted before and after, to
// show the tests never touched it.

import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { copyApp } from './copy-app.mjs';
import { fingerprint } from './fingerprint.mjs';

const editor = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const app = path.resolve(editor, process.argv[2] || '../todo-list');
const copies = path.join(editor, '.test-copies');
const suite = path.join(editor, 'node_modules/@nodegx/project-contract/editor-suite-node.js');

let failed = 0;
function run(title, args, expectExit) {
  const r = spawnSync(process.execPath, args, { cwd: editor, encoding: 'utf8' });
  const out = (r.stdout + r.stderr).trim();
  const ok = r.status === expectExit;
  console.log(`${ok ? 'ok  ' : 'BAD '} ${title}\n     ${out.split('\n').join('\n     ')}`);
  if (!ok) failed++;
}

const before = fingerprint(app);

const copy = copyApp(app, path.join(copies, 'suite'));
run('the editor suite says PASS', [suite, 'adapter.mjs', copy, 'test/edits.json'], 0);
copyApp(app, copy);
run('the control arm says FAIL (a number saved as a string)', [suite, 'test/broken-adapter.mjs', copy, 'test/edits.json'], 1);
run('every word points at a real port', ['test/words.test.mjs'], 0);
run('saving to disk through the server', ['test/disk.test.mjs', app], 0);
run('pressing through the editor in Chrome', ['test/browser.test.mjs', app], 0);

const after = fingerprint(app);
if (before === after) console.log(`ok   ${path.relative(editor, app)} is byte for byte as it was (sha256 ${before.slice(0, 16)}…)`);
else {
  console.log(`BAD  ${app} changed during the tests`);
  failed++;
}
process.exit(failed ? 1 : 0);
