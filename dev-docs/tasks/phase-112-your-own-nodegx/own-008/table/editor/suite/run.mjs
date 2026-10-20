// Runs the kit's editor suite on the table editor, over a fresh copy of the app.
//
//   node suite/run.mjs [app-folder] [edits.json]             the suite: PASS or what differs
//   node suite/run.mjs --control [app-folder] [edits.json]   the control arm: the cell reader keeps numbers
//                                                            as text, and the suite must say FAIL
//
// The app folder is only read; the suite works on its files in memory. It is copied first anyway, so a
// mistake here can never reach the app.
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { copyTree } from '../tools/copy-tree.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const control = args[0] === '--control';
if (control) {
  args.shift();
  process.env.NODEGX_TABLE_BREAK = 'number-as-string';
}
const app = resolve(args[0] ?? join(here, '..', '..', 'todo-list'));
const edits = resolve(args[1] ?? join(here, 'edits.json'));

const copy = mkdtempSync(join(tmpdir(), 'table-editor-suite-'));
try {
  copyTree(app, copy);
  const { runCommand } = createRequire(import.meta.url)('@nodegx/project-contract/editor-suite-node.js');
  const code = await runCommand([join(here, 'adapter.mjs'), copy, edits]);
  if (control) {
    console.log(code === 1 ? 'control: the suite caught the broken reader, as it must.' : 'control: the suite did NOT catch the broken reader.');
    process.exitCode = code === 1 ? 0 : 1;
  } else process.exitCode = code;
} finally {
  rmSync(copy, { recursive: true, force: true });
}
