// Unit tests on a copy of the app, in memory (the app folder is only read).
//
// 1. Every value in the app, shown in its cell and typed back, is the same value: the whole app is retyped
//    cell by cell through the session and saved, and the store must write nothing.
// 2. The cell reader on the cases a person types.
// 3. A format-4 project: wiring a node's control signal pins run-on-value-change on that node only.
// 4. Refusals: a stale revision, a cycle, a signal value.
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { memoryFiles } from '@nodegx/project-contract/format.js';
import { TableSession } from '../src/session.mjs';
import { applyAction } from '../src/actions.mjs';
import { parseValue, formatValue } from '../src/cells.mjs';
import { loadVocabulary } from '../src/load-vocabulary.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const { readProjectTree } = require('@nodegx/project-contract/editor-suite-node.js');
const app = process.argv[2] ?? join(here, '..', '..', 'todo-list');
const original = readProjectTree(app);
const vocabulary = loadVocabulary();

let failed = 0;
const check = (what, ok, detail = '') => {
  if (!ok) failed++;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${what}${detail ? ' — ' + detail : ''}`);
};
const throws = (fn) => {
  try {
    fn();
    return '';
  } catch (err) {
    return err.message;
  }
};

// 1. Retype the whole app.
{
  const files = memoryFiles(original);
  const s = new TableSession(files, { vocabulary });
  let cells = 0;
  const unread = [];
  for (const key of s.componentKeys()) {
    const nodes = s.working(key).w.files.nodes.nodes;
    for (const n of nodes) {
      for (const [name, v] of Object.entries(n.parameters ?? {})) {
        const text = formatValue(v, s.inputPort(n, name));
        try {
          applyAction(s, { action: 'setCell', component: key, node: n.id, column: 'in:' + name, text });
          cells++;
        } catch (err) {
          unread.push(`${key} ${n.id}.${name}: ${err.message}`);
        }
      }
      if (n.label !== undefined) applyAction(s, { action: 'setCell', component: key, node: n.id, column: 'label', text: n.label });
      if (n.x !== undefined && n.y !== undefined) applyAction(s, { action: 'setCell', component: key, node: n.id, column: 'position', text: `${n.x}, ${n.y}` });
    }
  }
  check('every value cell in the app is retyped without a refusal', unread.length === 0, unread.slice(0, 3).join(' | '));
  const out = s.save();
  const after = files.entries();
  const changed = Object.keys(after).filter((f) => after[f] !== original[f]);
  check(`retyping all ${cells} value cells and saving writes nothing`, out.written.length === 0 && changed.length === 0 && out.refused.length === 0,
    `written ${out.written.length}, unchanged ${out.unchanged.length}, files changed ${changed.length}: ${changed.slice(0, 3).join(', ')}`);
}

// 2. The cell reader.
{
  const num = { type: 'number' };
  const dim = { type: 'dimension' };
  const bool = { type: 'boolean' };
  const str = { type: 'string' };
  const cases = [
    ['28', num, 28], ['-1.5', num, -1.5], ['var(--x)', num, 'var(--x)'], ['100%', dim, { value: 100, unit: '%' }], ['12px', dim, { value: 12, unit: 'px' }],
    ['true', bool, true], ['false', bool, false], ['28', str, '28'], ['=28', str, 28], ['="28"', num, '28'], ['={"a":1}', str, { a: 1 }],
    ['  spaced  ', str, '  spaced  '], ['', str, ''], ['42', undefined, '42'], ['=null', str, null]
  ];
  for (const [text, port, want] of cases) {
    const got = parseValue(text, port);
    check(`"${text}" on a ${port?.type ?? 'unknown'} port reads ${JSON.stringify(want)}`, JSON.stringify(got) === JSON.stringify(want), JSON.stringify(got));
  }
  for (const [v, port] of [[28, str], ['28', num], ['=x', str], [{ value: 5, unit: 'em' }, dim], [[1, 2], str], ['true', bool], [true, str], ['', num]]) {
    const back = parseValue(formatValue(v, port), port);
    check(`${JSON.stringify(v)} on a ${port.type} port shows as ${JSON.stringify(formatValue(v, port))} and reads back`, JSON.stringify(back) === JSON.stringify(v));
  }
  check('bad JSON after = is refused', /not JSON/.test(throws(() => parseValue('={oops', str))));
}

// 3. Format 4: the run-on-value-change pin on a node whose control signal a person wired.
{
  const files = memoryFiles(original);
  const s = new TableSession(files, { vocabulary });
  const key = 'Commands/Add task';
  const fn = s.working(key).w.files.nodes.nodes.find((n) => n.type === 'JavaScriptFunction');
  const before = JSON.stringify(fn.parameters);
  const id = applyAction(s, { action: 'addNode', component: key, type: 'JavaScriptFunction', label: 'Echo', x: 10, y: 10 }).id;
  applyAction(s, { action: 'setCell', component: key, node: id, column: 'in:functionScript', text: 'Outputs.out = Inputs.value;' });
  applyAction(s, { action: 'connect', component: key, from: { node: 'AddtaskIn', port: 'title' }, to: { node: id, port: 'in-value' } });
  applyAction(s, { action: 'connect', component: key, from: { node: 'AddtaskIn', port: 'do' }, to: { node: id, port: 'run' } });
  s.save();
  const saved = JSON.parse(files.read(`components/${key}/nodes.json`)).nodes;
  const mine = saved.find((n) => n.id === id);
  check('format 4: wiring a Function\'s run pins runOnChange-in-value to true', mine.parameters['runOnChange-in-value'] === true, JSON.stringify(mine.parameters));
  check('format 4: a node the person did not touch is not pinned', JSON.stringify(saved.find((n) => n.id === fn.id).parameters) === before);
}

// 4. Refusals.
{
  const files = memoryFiles(original);
  const s = new TableSession(files, { vocabulary });
  check('a node under its own child is refused', /inside/.test(throws(() => applyAction(s, { action: 'setCell', component: 'Todo/Header', node: 'hdRoot', column: 'parent', text: 'hdNav' }))));
  check('a value on a signal is refused', /signal/.test(throws(() => applyAction(s, { action: 'setCell', component: 'Todo/Header', node: 'hdList', column: 'in:focus', text: 'x' }))));
  check('a duplicate wire is refused', /already there/.test(throws(() => applyAction(s, { action: 'connect', component: 'Todo/Header', from: { node: 'hdIn', port: 'tab' }, to: { node: 'hdLook', port: 'currentState' } }))));
  check('an output cell holds no value', /wires/.test(throws(() => applyAction(s, { action: 'setCell', component: 'Todo/Header', node: 'hdList', column: 'out:onClick', text: 'x' }))));
  applyAction(s, { action: 'setCell', component: 'Todo/Header', node: 'hdTitle', column: 'in:text', text: 'Mine' });
  // Someone else writes the same component meanwhile.
  const path = 'components/Todo/Header/nodes.json';
  const theirs = JSON.parse(files.read(path));
  theirs.nodes.find((n) => n.id === 'hdTitle').parameters.text = 'Theirs';
  files.write(path, JSON.stringify(theirs, null, 2) + '\n');
  const out = s.save();
  check('a component changed since it was read is refused, not overwritten', out.refused.length === 1 && JSON.parse(files.read(path)).nodes.find((n) => n.id === 'hdTitle').parameters.text === 'Theirs', out.refused[0]?.sentence);
  check('the refused edits are kept for the person', s.dirtyKeys().includes('Todo/Header'));
}

console.log(failed ? `\n${failed} unit checks failed.` : '\nAll unit checks passed.');
process.exit(failed ? 1 : 0);
