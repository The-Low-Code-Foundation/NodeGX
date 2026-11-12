// npm test: every check, on copies. The kit's suite (PASS expected), its control (FAIL expected),
// the rule change through the editor's server, and the page driven in Chrome.
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { makeCopy, REAL_APP } from './copies.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const SUITE = path.join(here, '..', 'node_modules', '@nodegx', 'project-contract', 'editor-suite-node.js');
const run = (args) => spawnSync(process.execPath, args, { stdio: 'inherit', cwd: path.join(here, '..') }).status;

const { copy } = makeCopy(REAL_APP, 'suite');
let bad = 0;
console.log('\n— the kit’s editor suite, on a copy —');
if (run([SUITE, path.join(here, 'suite-adapter.mjs'), copy, path.join(here, 'edits-none.json')]) !== 0) bad++;
console.log('\n— its control: broken on purpose, must FAIL —');
if (run([SUITE, path.join(here, 'suite-adapter-broken.mjs'), copy, path.join(here, 'edits-none.json')]) === 0) {
  console.log('the control PASSED: the adapter is not being graded');
  bad++;
} else console.log('(failed, as it must)');
console.log('\n— a screen that reads its tables itself is a screen (the todo template, read in place) —');
if (run([path.join(here, 'screens-from-pages.test.mjs')]) !== 0) bad++;
console.log('\n— changing who may see a table, on a copy and its own backend —');
if (run([path.join(here, 'rule-change.test.mjs')]) !== 0) bad++;
console.log('\n— the page, driven in Chrome, on a copy and its own backend —');
if (run([path.join(here, 'ui.test.mjs')]) !== 0) bad++;
console.log('\n— round 2: real people, a pathway, one row’s reach (Chrome, a copy with the app’s whole world) —');
if (run([path.join(here, 'people.test.mjs')]) !== 0) bad++;
console.log('\n— any app, not only the training app: the todo template, a site with no data, a backend with a Pointer and one group (Chrome, copies) —');
if (run([path.join(here, 'any-app.test.mjs')]) !== 0) bad++;
console.log('\n— what the backend starts by itself, drawn: its triggers wired to their functions and tables (a members-area copy, Chrome) —');
if (run([path.join(here, 'triggers.test.mjs')]) !== 0) bad++;
console.log('\n— the hands: grant, cut, a row-change trigger, a schedule, undo; both places or neither (a copy with its whole world) —');
if (run([path.join(here, 'hands.test.mjs')]) !== 0) bad++;
console.log('\n— the hands, driven in Chrome: drags, the chooser, a wire cut with Delete, the toast’s Undo —');
if (run([path.join(here, 'hands-ui.test.mjs')]) !== 0) bad++;
console.log('\n— the backend suite (the kit): the map’s adapter, the kit’s writers and two controls, on members-area and todo copies —');
if (run([path.join(here, 'backend-suite.test.mjs')]) !== 0) bad++;
console.log('\n— the backend suite’s read half: what one person was handed, on the Riverside club filled through its own doors —');
if (run([path.join(here, 'handed.test.mjs')]) !== 0) bad++;
console.log(bad ? `\n${bad} part(s) FAILED` : '\nEverything passed.');
process.exit(bad ? 1 : 0);
