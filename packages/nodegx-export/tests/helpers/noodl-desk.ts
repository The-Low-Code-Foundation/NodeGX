import * as fs from 'fs';
import * as path from 'path';

import { Desk, Graph, RawNode, placeAll, writeDeskProject } from './root-desk';
import { fnNode } from './success-desk';

/**
 * "Noodl Desk" (P18 session 134, EXP-020 with EXP-019 slice 1b): a page whose Functions read the Noodl API the export now
 * carries, and await it at their top level, built in a temporary folder with a backend declared (`metadata.cloudservices`)
 * so the corpus golden (hls001) does not move. `the-noodl-api-travels.test.ts` grades it against the runtime's own nodes and
 * the running app's own `Noodl` (`runtime-mounted-arm.js`), both arms answered by `fake-parse-backend.js`
 * (`NOODL_DESK_BACKEND`).
 *
 * The arms read every drawn Text in document order: hello, n, first, phase, phase2, seen, doneN, again, added, who, locked,
 * bad, link, note.
 *
 * - **Greet at load** (no Run wire, an arrival run): awaits `whoAmI`, writes `hello`. Runs once at load.
 * - **Count open** runs "Count the open tasks": sends `started`, awaits a plain query (`done` equal to false), writes the
 *   count and the first row's `objectId|title|owner|due|typeof id` (a pointer reads as its id, a date as its text, a plain
 *   row has no `id`), then sends `counted`. `started` and `counted` each set a Variable; its Done sets `seen` to what the
 *   Variable `clicked` holds then — and the same click's second wire, after the Run, sets `clicked`. The runtime runs that
 *   wire before the awaited body finishes, so `seen` reads `clicked`. Its Done also sets `doneN` to the count it wrote after
 *   its `await` (Done waits for the body), and `counted`, sent after the `await`, runs **Greet again**, which awaits too
 *   (a late signal's chain that awaits: gram's Welcome). Both added after the first run of the desk, to grade those two.
 * - **Add one** runs "Add a task": awaits `addTask` (the backend stores a Task), writes `added`. Count open reads one more.
 * - **Who am I** runs "Who am I": awaits `whoAmI`, reads `Noodl.Users.Current`.
 * - **Refused** runs "Try the locked one": a Cloud Function the backend refuses rejects with the backend's error body.
 * - **Bad filter** runs "Ask badly": a filter with two keys rejects with the translator's words (a string), and a query
 *   the backend refuses rejects with an `Error` carrying the backend's.
 * - **Sign** runs "Sign the photo": a signed link, and a private file's refusal with its status.
 * - **Remember** runs "Remember the seed" (no `await`): `Noodl.Variables.note = 'kept ' + Noodl.Variables.seed`. A Variable
 *   node `seed` holds `S1`; **Reseed** sets it to `S2` with a Set Variable; a Text reads the Variable `note`.
 */

export const NOODL_DESK_APP_ID = 'noodl-desk';
export const NOODL_DESK_ENDPOINT = 'http://backend.test';

/** What the fake backend holds at the start of every scenario, and who each session token is. */
export const NOODL_DESK_BACKEND = {
  classes: {
    Task: [
      { objectId: 't1', title: 'First', done: false, owner: { __type: 'Pointer', className: '_User', objectId: 'u1' }, due: { __type: 'Date', iso: '2026-10-21T00:00:00.000Z' } },
      { objectId: 't2', title: 'Second', done: true },
      { objectId: 't3', title: 'Third', done: false }
    ]
  },
  sessions: { 'tok-ann': { objectId: 'u1', name: 'Ann', role: 'admin' } }
};

/** The stored session of a person signed in as Ann, as the running app stores it. */
export const ANN_SESSION = { objectId: 'u1', sessionToken: 'tok-ann', username: 'ann', email: 'ann@x.test' };

export const GREET_SCRIPT = ["const me = (await Noodl.CloudFunctions.run('whoAmI', {})).me;", "Outputs.hello = 'hello ' + (me ? me.name : 'nobody');"].join('\n');
export const COUNT_SCRIPT = [
  'Outputs.started();',
  "const rows = await Noodl.Records.query('Task', { done: { equalTo: false } }, { plain: true });",
  'Outputs.n = String(rows.length);',
  "Outputs.first = rows.length > 0 ? [rows[0].objectId, rows[0].title, rows[0].owner, rows[0].due, typeof rows[0].id].join('|') : 'none';",
  'Outputs.counted();'
].join('\n');
export const AGAIN_SCRIPT = ["const me = (await Noodl.CloudFunctions.run('whoAmI', {})).me;", "Outputs.again = 'again ' + (me ? me.name : 'nobody');"].join('\n');
export const ADD_SCRIPT = ["await Noodl.CloudFunctions.run('addTask', { title: Inputs.title });", "Outputs.added = 'added ' + Inputs.title;"].join('\n');
export const WHO_SCRIPT = [
  "const me = (await Noodl.CloudFunctions.run('whoAmI', {})).me;",
  'const u = Noodl.Users.Current;',
  "Outputs.who = (me ? me.name + ' ' + me.role : 'nobody') + ' / ' + (u ? [u.email, u.username, u.id, typeof u.Properties].join(' ') : 'signed out');"
].join('\n');
export const LOCKED_SCRIPT = [
  'try {',
  "  await Noodl.CloudFunctions.run('locked', {});",
  "  Outputs.locked = 'ran';",
  '} catch (e) {',
  "  Outputs.locked = 'refused: ' + e.error + ' (' + e.code + ')' + (e instanceof Error ? ' Error' : ' body');",
  '}'
].join('\n');
export const BAD_SCRIPT = [
  'let a, b;',
  "try { await Noodl.Records.query('Task', { done: { equalTo: false }, title: { equalTo: 'x' } }, { plain: true }); a = 'ran'; } catch (e) { a = typeof e + ': ' + String(e).slice(0, 34); }",
  "try { await Noodl.Records.query('Locked', {}, { plain: true }); b = 'ran'; } catch (e) { b = (e instanceof Error ? 'Error: ' : typeof e + ': ') + e.message; }",
  "Outputs.bad = a + ' / ' + b;"
].join('\n');
export const SIGN_SCRIPT = [
  "const l = await Noodl.Files.sign({ name: 'photo.png', url: 'x' });",
  'let s;',
  "try { await Noodl.Files.sign('secret.png'); s = 'signed'; } catch (e) { s = 'refused ' + e.status + ' ' + e.error; }",
  "Outputs.link = [l.kind, l.url, l.expiresAt, l.ttlSeconds].join(' ') + ' / ' + s;"
].join('\n');
export const REMEMBER_SCRIPT = "Noodl.Variables.note = 'kept ' + Noodl.Variables.seed;";

const button = (id: string, label: string, parent = 'shell'): RawNode => ({ id, type: 'net.noodl.controls.button', label, parent, parameters: { label } });
const text = (id: string, label: string, parent = 'shell'): RawNode => ({ id, type: 'Text', label, parent, parameters: {} });
const variable = (id: string, name: string, value?: string): RawNode => ({ id, type: 'Variable2', label: name, parameters: value === undefined ? { name } : { name, value } });
const setVar = (id: string, name: string, value?: string): RawNode => ({ id, type: 'Set Variable', label: id, parameters: value === undefined ? { name } : { name, value } });

const homeGraph = (): Graph => {
  const shell = [
    'countBtn', 'addBtn', 'whoBtn', 'lockedBtn', 'badBtn', 'signBtn', 'rememberBtn', 'reseedBtn',
    'helloText', 'nText', 'firstText', 'phaseText', 'phase2Text', 'seenText', 'doneNText', 'againText', 'addedText', 'whoText', 'lockedText', 'badText', 'linkText', 'noteText'
  ];
  const add = fnNode('add', 'Add a task', ADD_SCRIPT, { inputs: ['title'], outputs: ['added'] });
  add.parameters['in-title'] = 'Fourth';
  const nodes: RawNode[] = [
    { id: 'page', type: 'Page', label: 'Home', parameters: { title: 'Noodl Desk', urlPath: 'home' }, children: ['shell'] },
    { id: 'shell', type: 'Group', label: 'Shell', parent: 'page', children: shell, parameters: { flexDirection: 'column' } },
    button('countBtn', 'Count open'),
    button('addBtn', 'Add one'),
    button('whoBtn', 'Who am I'),
    button('lockedBtn', 'Refused'),
    button('badBtn', 'Bad filter'),
    button('signBtn', 'Sign'),
    button('rememberBtn', 'Remember'),
    button('reseedBtn', 'Reseed'),
    text('helloText', 'Hello'),
    text('nText', 'N'),
    text('firstText', 'First'),
    text('phaseText', 'Phase'),
    text('phase2Text', 'Phase 2'),
    text('seenText', 'Seen'),
    text('doneNText', 'Done N'),
    text('againText', 'Again'),
    text('addedText', 'Added'),
    text('whoText', 'Who'),
    text('lockedText', 'Locked'),
    text('badText', 'Bad'),
    text('linkText', 'Link'),
    text('noteText', 'Note'),
    variable('phaseVar', 'phase', 'phase nothing'),
    variable('phase2Var', 'phase2', 'phase2 nothing'),
    variable('clickedVar', 'clicked', 'not yet'),
    variable('seenVar', 'seen', 'seen nothing'),
    variable('doneNVar', 'doneN', 'doneN nothing'),
    variable('seedVar', 'seed', 'S1'),
    variable('noteVar', 'note', 'note nothing'),
    fnNode('greet', 'Greet at load', GREET_SCRIPT, { inputs: [], outputs: ['hello'] }),
    fnNode('count', 'Count the open tasks', COUNT_SCRIPT, { inputs: [], outputs: ['n', 'first'], signals: ['started', 'counted'] }),
    fnNode('again', 'Greet again', AGAIN_SCRIPT, { inputs: [], outputs: ['again'] }),
    add,
    fnNode('who', 'Who am I', WHO_SCRIPT, { inputs: [], outputs: ['who'] }),
    fnNode('locked', 'Try the locked one', LOCKED_SCRIPT, { inputs: [], outputs: ['locked'] }),
    fnNode('bad', 'Ask badly', BAD_SCRIPT, { inputs: [], outputs: ['bad'] }),
    fnNode('sign', 'Sign the photo', SIGN_SCRIPT, { inputs: [], outputs: ['link'] }),
    fnNode('remember', 'Remember the seed', REMEMBER_SCRIPT, { inputs: [], outputs: [] }),
    setVar('sdPhase', 'phase', 'started'),
    setVar('sdPhase2', 'phase2', 'counted'),
    setVar('sdClicked', 'clicked', 'clicked'),
    setVar('sdSeen', 'seen'),
    setVar('sdDoneN', 'doneN'),
    setVar('sdSeed', 'seed', 'S2')
  ];
  return {
    nodes: placeAll(nodes),
    connections: [
      { fromId: 'greet', fromProperty: 'out-hello', toId: 'helloText', toProperty: 'text' },
      // The Run first, then the same click's Set Variable: the runtime runs the Set Variable before the run finishes.
      { fromId: 'countBtn', fromProperty: 'onClick', toId: 'count', toProperty: 'run' },
      { fromId: 'countBtn', fromProperty: 'onClick', toId: 'sdClicked', toProperty: 'do' },
      { fromId: 'count', fromProperty: 'out-n', toId: 'nText', toProperty: 'text' },
      { fromId: 'count', fromProperty: 'out-first', toId: 'firstText', toProperty: 'text' },
      { fromId: 'count', fromProperty: 'out-started', toId: 'sdPhase', toProperty: 'do' },
      { fromId: 'count', fromProperty: 'out-counted', toId: 'sdPhase2', toProperty: 'do' },
      { fromId: 'count', fromProperty: 'done', toId: 'sdSeen', toProperty: 'do' },
      { fromId: 'clickedVar', fromProperty: 'value', toId: 'sdSeen', toProperty: 'value' },
      { fromId: 'count', fromProperty: 'done', toId: 'sdDoneN', toProperty: 'do' },
      { fromId: 'count', fromProperty: 'out-n', toId: 'sdDoneN', toProperty: 'value' },
      { fromId: 'count', fromProperty: 'out-counted', toId: 'again', toProperty: 'run' },
      { fromId: 'again', fromProperty: 'out-again', toId: 'againText', toProperty: 'text' },
      { fromId: 'addBtn', fromProperty: 'onClick', toId: 'add', toProperty: 'run' },
      { fromId: 'add', fromProperty: 'out-added', toId: 'addedText', toProperty: 'text' },
      { fromId: 'whoBtn', fromProperty: 'onClick', toId: 'who', toProperty: 'run' },
      { fromId: 'who', fromProperty: 'out-who', toId: 'whoText', toProperty: 'text' },
      { fromId: 'lockedBtn', fromProperty: 'onClick', toId: 'locked', toProperty: 'run' },
      { fromId: 'locked', fromProperty: 'out-locked', toId: 'lockedText', toProperty: 'text' },
      { fromId: 'badBtn', fromProperty: 'onClick', toId: 'bad', toProperty: 'run' },
      { fromId: 'bad', fromProperty: 'out-bad', toId: 'badText', toProperty: 'text' },
      { fromId: 'signBtn', fromProperty: 'onClick', toId: 'sign', toProperty: 'run' },
      { fromId: 'sign', fromProperty: 'out-link', toId: 'linkText', toProperty: 'text' },
      { fromId: 'rememberBtn', fromProperty: 'onClick', toId: 'remember', toProperty: 'run' },
      { fromId: 'reseedBtn', fromProperty: 'onClick', toId: 'sdSeed', toProperty: 'do' },
      { fromId: 'phaseVar', fromProperty: 'value', toId: 'phaseText', toProperty: 'text' },
      { fromId: 'phase2Var', fromProperty: 'value', toId: 'phase2Text', toProperty: 'text' },
      { fromId: 'seenVar', fromProperty: 'value', toId: 'seenText', toProperty: 'text' },
      { fromId: 'doneNVar', fromProperty: 'value', toId: 'doneNText', toProperty: 'text' },
      { fromId: 'noteVar', fromProperty: 'value', toId: 'noteText', toProperty: 'text' }
    ]
  };
};

/** The desk, before any variant's edit. */
export const noodlDesk = (): Desk => ({ components: { 'Pages/Home': homeGraph() } });

/**
 * The desk written as a v2 project, into `dir` (or a new temporary folder), after `edit`, with the backend declared — or
 * without one (`backend: false`), where a member that talks to the backend is refused by name.
 */
export const writeNoodlDesk = (edit?: (d: Desk) => void, opts: { dir?: string; backend?: boolean } = {}): { dir: string; desk: Desk } => {
  const desk = noodlDesk();
  edit?.(desk);
  const dir = writeDeskProject(desk, { name: 'Noodl Desk', idBase: 'b8d20e00-0000-4000-8000-0000000020', prefix: 'noodl-desk-' }, opts.dir);
  if (opts.backend !== false) {
    const file = path.join(dir, 'nodegx.project.json');
    const project = JSON.parse(fs.readFileSync(file, 'utf-8'));
    project.metadata = {
      cloudservices: { endpoint: NOODL_DESK_ENDPOINT, appId: NOODL_DESK_APP_ID },
      dbCollections: [
        {
          name: 'Task',
          columns: [
            { name: 'title', type: 'String' },
            { name: 'done', type: 'Boolean' },
            { name: 'owner', type: 'Pointer', targetClass: '_User' },
            { name: 'due', type: 'Date' }
          ]
        }
      ]
    };
    fs.writeFileSync(file, JSON.stringify(project, null, 2) + '\n');
  }
  return { dir, desk };
};
