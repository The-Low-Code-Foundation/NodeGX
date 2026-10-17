import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { Catalog, CatalogIndex, loadCatalog } from '../src/catalog';
import { planProject } from '../src/analyze/plan';
import { emitApp, EmittedApp } from '../src/emit/emitApp';
import { parseProject } from '../src/parse/parseProject';
import { typecheckEmittedApp } from './helpers/typecheckApp';

/**
 * The failure runs its chain (P18 session 123, BOARD lane 6, EXP-011 §90). A record verb's and a user verb's Failure was
 * refused whole ("its failure output is consumed — only the done chain and the Error value are translated in this slice"),
 * and every Condition that shows a refusal off one waited on it: members-area's Remove and Sign in, todo-list's Sign in,
 * the Site Builder's and the planner's. Now the Failure chain is printed in the call's catch, after the Error row and the
 * raise (the runtime's `setError` writes, raises, then pulses), and a read of the verb's Error inside it is the catch's
 * local, the row being unchanged inside the closure that set it.
 *
 * Reading the emitted diff of every gained node found the second half. The runtime starts a verb's request after the
 * click's other wires have run (each of these nodes acts after the update) and runs its chains when the answer comes; the
 * export awaited the call in place, so a wire after it ran after the answer. todo-list's Sign in puts its refusal away on
 * its next wire, and the refusal vanished as it showed; digital-bricks-training's Settings, exported at HEAD, said
 * "preparing" for ever. An awaited call that a later action of its list follows is now started and not waited for
 * (`void (async () => { … })();`), so a failure before its first await still runs its chain first, as the runtime's
 * synchronous `setError` does.
 *
 * §A the emitted page rendered by real React under StrictMode with requests the test answers (`helpers/export-answer-arm.js`)
 * against the runtime's own Delete Record, Condition, Variable and Set Variable with a store the test answers
 * (`helpers/runtime-failure-arm.js`), step by step, over `fixtures/fail-desk` and four variants; two controls. §B what is
 * emitted. §C refused by name.
 */

const FIXTURE = path.join(__dirname, 'fixtures', 'fail-desk');
const HOME_DIR = path.join(FIXTURE, 'components', 'Pages', 'Home');
const PAGE = 'src/pages/Home.tsx';
const catalog: Catalog = loadCatalog();

interface RawNode {
  id: string;
  type: string;
  label?: string;
  parent?: string;
  children?: string[];
  parameters: Record<string, unknown>;
  [k: string]: unknown;
}
interface RawWire {
  fromId: string;
  fromProperty: string;
  toId: string;
  toProperty: string;
}
interface Graph {
  nodes: RawNode[];
  connections: RawWire[];
}
const baseGraph: Graph = {
  nodes: JSON.parse(fs.readFileSync(path.join(HOME_DIR, 'nodes.json'), 'utf-8')).nodes,
  connections: JSON.parse(fs.readFileSync(path.join(HOME_DIR, 'connections.json'), 'utf-8')).connections
};

/** The fixture with its page edited, written to a temporary copy: both arms read the same graph. */
const fixtureWith = (edit?: (g: Graph) => void): { dir: string; graph: Graph } => {
  const graph: Graph = structuredClone(baseGraph);
  edit?.(graph);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'fail-desk-'));
  fs.cpSync(FIXTURE, dir, { recursive: true });
  const home = path.join(dir, 'components', 'Pages', 'Home');
  const nodesDoc = JSON.parse(fs.readFileSync(path.join(home, 'nodes.json'), 'utf-8'));
  const wiresDoc = JSON.parse(fs.readFileSync(path.join(home, 'connections.json'), 'utf-8'));
  fs.writeFileSync(path.join(home, 'nodes.json'), JSON.stringify({ ...nodesDoc, nodes: graph.nodes }, null, 2));
  fs.writeFileSync(path.join(home, 'connections.json'), JSON.stringify({ ...wiresDoc, connections: graph.connections }, null, 2));
  return { dir, graph };
};
const emitDir = (dir: string): EmittedApp => emitApp(parseProject(dir, catalog), catalog);
const planOf = (dir: string) => planProject(parseProject(dir, catalog), new CatalogIndex(catalog)).byLegacyPath.get('/Pages/Home')!;
const nodeOf = (g: Graph, id: string): RawNode => g.nodes.find((n) => n.id === id)!;
const addNode = (g: Graph, n: RawNode, intoShell = false) => {
  g.nodes.push(n);
  if (intoShell) nodeOf(g, 'shell').children!.push(n.id);
};

// ---- the two arms -----------------------------------------------------------------------------------------------

const childArm = (helper: string, input: unknown): string[][][][] =>
  JSON.parse(
    execFileSync(process.execPath, [path.join(__dirname, 'helpers', helper)], {
      input: JSON.stringify(input),
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
      maxBuffer: 16 * 1024 * 1024
    })
  );
/** The emitted app written out, with `PAGE` replaced where a row edits it. */
const writeApp = (app: EmittedApp, page?: string): string => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'fail-desk-app-'));
  for (const [file, text] of Object.entries(app.files)) {
    fs.mkdirSync(path.dirname(path.join(dir, file)), { recursive: true });
    fs.writeFileSync(path.join(dir, file), file === PAGE && page !== undefined ? page : text);
  }
  return dir;
};

/** A failure, a second press, a success; two presses with both requests out, answered in turn. */
const SCENARIOS = [
  ['Remove', 'answer:fail:Not allowed', 'Remove', 'answer:ok'],
  ['Remove', 'Remove', 'answer:fail:A', 'answer:fail:B']
];

/** Remove's id read from a Variable rather than typed in: an empty one fails before any request, in both. */
const idFromVariable = (value: string) => (g: Graph) => {
  delete nodeOf(g, 'del').parameters.modelId;
  addNode(g, { id: 'whichRead', type: 'Variable2', label: 'Which', parameters: { name: 'which', value } });
  g.connections.push({ fromId: 'whichRead', fromProperty: 'value', toId: 'del', toProperty: 'modelId' });
};

/** A second Delete, its own button, its Error and Failure into the same Set Variable as the first's (planning's Sign in). */
const secondVerb = (g: Graph) => {
  addNode(g, { id: 'del2', type: 'DeleteDbModelProperties', label: 'Remove the other', parameters: { collectionName: 'Note', modelId: 'n2' } });
  addNode(g, { id: 'removeOther', type: 'net.noodl.controls.button', label: 'Remove the other', parent: 'shell', parameters: { label: 'Remove the other' } }, true);
  g.connections.push({ fromId: 'removeOther', fromProperty: 'onClick', toId: 'del2', toProperty: 'store' });
  g.connections.push({ fromId: 'del2', fromProperty: 'error', toId: 'saidSet', toProperty: 'value' });
  g.connections.push({ fromId: 'del2', fromProperty: 'failure', toId: 'saidSet', toProperty: 'do' });
};

const VARIANTS: Array<{ name: string; edit?: (g: Graph) => void; scenarios?: string[][] }> = [
  { name: 'the fixture: Remove deletes, then puts the refusal away' },
  {
    name: 'the clear wired first: the order the planner uses',
    edit: (g) => {
      const at = g.connections.findIndex((c) => c.toId === 'putAway');
      const [clear] = g.connections.splice(at, 1);
      g.connections.unshift(clear);
    }
  },
  {
    name: 'no clear: the refusal stays once shown',
    edit: (g) => {
      g.nodes = g.nodes.filter((n) => n.id !== 'putAway');
      g.connections = g.connections.filter((c) => c.toId !== 'putAway' && c.fromId !== 'putAway');
    }
  },
  { name: 'the id from a Variable: a record to delete', edit: idFromVariable('n1') },
  { name: 'the id from an empty Variable: "Missing Record Id" before any request, then the clear', edit: idFromVariable('') },
  {
    // The runtime's Value holds the Error that wrote last, which is the failing verb's own: each Failure says its own.
    name: "two verbs' Failures run one Set Variable fed by both Errors: each says its own (planning's Sign in)",
    edit: secondVerb,
    scenarios: [
      ['Remove', 'answer:fail:First', 'Remove the other', 'answer:fail:Second', 'Remove', 'answer:fail:Third'],
      ['Remove the other', 'Remove', 'answer:fail:Second', 'answer:fail:First']
    ]
  }
];

const cases = VARIANTS.map((v) => {
  const { dir, graph } = fixtureWith(v.edit);
  return { ...v, dir, graph, app: emitDir(dir) };
});

let runtime: string[][][][] | Error;
let exported: string[][][][] | Error;
let controls: string[][][][] | Error;
/** HEAD's order: the call awaited in place, so the clear after it runs after the answer. */
const awaitedInPlace = (page: string) => page.replace(/void \(async \(\) => \{\n([\s\S]*?)\n\s*\}\)\(\);/g, '$1');
/** No Failure chain: the catch writes the row and raises, and nothing else. */
const noFailChain = (page: string) => page.replace(/\n\s*setItDidNotGoMounted\(true\);/g, '').replace(/\n\s*said\.set\(removeItErrorMessage\);/g, '');
beforeAll(() => {
  try {
    runtime = childArm('runtime-failure-arm.js', cases.map((c) => ({ nodes: c.graph.nodes, connections: c.graph.connections, scenarios: c.scenarios ?? SCENARIOS })));
  } catch (e) {
    runtime = e as Error;
  }
  try {
    exported = childArm('export-answer-arm.js', cases.map((c) => ({ dir: writeApp(c.app), scenarios: c.scenarios ?? SCENARIOS })));
  } catch (e) {
    exported = e as Error;
  }
  try {
    const page = cases[0].app.files[PAGE];
    controls = childArm('export-answer-arm.js', [awaitedInPlace(page), noFailChain(page)].map((p) => ({ dir: writeApp(cases[0].app, p), scenarios: SCENARIOS })));
  } catch (e) {
    controls = e as Error;
  }
}, 240_000);
const readingsOf = (r: string[][][][] | Error): string[][][][] => {
  if (r instanceof Error) throw r;
  return r;
};

describe('§A the export against the runtime, step by step', () => {
  cases.forEach((c, i) => {
    test(`${c.name}: the same at load and after every press and answer`, () => {
      expect(readingsOf(exported)[i]).toEqual(readingsOf(runtime)[i]);
    });
  });

  test('the fixture reads what the runtime was measured to show (s123-failchain/EXPECTED.md)', () => {
    const [s1, s2] = readingsOf(runtime)[0];
    const hidden = ['Fail Desk', 'Error', '', 'Said', '', 'Gone', ''];
    expect(s1).toEqual([
      hidden,
      hidden,
      ['Fail Desk', 'That could not be removed.', 'Error', 'Not allowed', 'Said', 'Not allowed', 'Gone', ''],
      ['Fail Desk', 'Error', 'Not allowed', 'Said', 'Not allowed', 'Gone', ''],
      ['Fail Desk', 'Error', 'Not allowed', 'Said', 'Not allowed', 'Gone', 'gone']
    ]);
    expect(s2[4]).toEqual(['Fail Desk', 'That could not be removed.', 'Error', 'B', 'Said', 'B', 'Gone', '']);
  });

  test('the empty id fails before any request: the refusal is shown, then put away by the next wire, in both', () => {
    const s1 = readingsOf(runtime)[4][0];
    expect(s1[1]).toEqual(['Fail Desk', 'Error', 'Missing Record Id', 'Said', 'Missing Record Id', 'Gone', '']);
    expect(readingsOf(exported)[4][0][1]).toEqual(s1[1]);
  });

  test("two verbs into one Set Variable: the runtime's Said is each failing verb's own Error, step by step", () => {
    const [s1, s2] = readingsOf(runtime)[5];
    const said = (r: string[]) => r[r.indexOf('Said') + 1];
    expect([s1[2], s1[4], s1[6]].map(said)).toEqual(['First', 'Second', 'Third']);
    expect([s2[3], s2[4]].map(said)).toEqual(['Second', 'First']);
  });

  test('a control: the call awaited in place puts the refusal away after it shows', () => {
    const control = readingsOf(controls)[0][0];
    expect(control[2]).not.toEqual(readingsOf(runtime)[0][0][2]);
    expect(control[2]).not.toContain('That could not be removed.');
  });

  test('a control: no Failure chain never shows the refusal and never says why', () => {
    const control = readingsOf(controls)[1][0];
    expect(control[2]).not.toEqual(readingsOf(runtime)[0][0][2]);
    expect(control[2]).toEqual(['Fail Desk', 'Error', 'Not allowed', 'Said', '', 'Gone', '']);
  });

  test('every variant typechecks', () => {
    for (const c of cases) expect(typecheckEmittedApp(c.app)).toEqual([]);
  });
});

describe('§B what is emitted', () => {
  const page = cases[0].app.files[PAGE];
  const plan = planOf(cases[0].dir);

  test('the Delete, both Conditions and both Set Variables export', () => {
    for (const id of ['del', 'putAway', 'show', 'saidSet', 'goneSet']) expect(plan.dispositions[id]?.kind).toBe('collapsed');
  });

  test('the Failure chain is in the catch, after the Error row and the raise, and reads the catch\'s local', () => {
    const catchBody = page.slice(page.indexOf('} catch (error) {'), page.indexOf('})();'));
    const order = ['setRemoveItError(removeItErrorMessage)', 'raiseAppError(', 'setItDidNotGoMounted(true)', 'said.set(removeItErrorMessage)'];
    const at = order.map((s) => catchBody.indexOf(s));
    expect(at.every((x) => x >= 0)).toBe(true);
    expect([...at].sort((a, b) => a - b)).toEqual(at);
    expect(page).not.toContain('said.set(removeItError)');
  });

  test('the Done chain stays after the await, in the try', () => {
    expect(page).toMatch(/try \{\n\s*await deleteNote\('n1'\);\n\s*gone\.set\('gone'\);/);
  });

  test('a call a later wire follows is started and not waited for; the later wire runs where the click is', () => {
    expect(page).toMatch(/void \(async \(\) => \{\n\s*try \{[\s\S]*?\}\)\(\);\n\s*setItDidNotGoMounted\(false\);/);
  });

  test('a call last in its list is awaited in place, as before', () => {
    const last = cases[1].app.files[PAGE];
    const noClear = cases[2].app.files[PAGE];
    expect(last).not.toContain('void (async () => {');
    expect(noClear).not.toContain('void (async () => {');
    expect(last).toMatch(/setItDidNotGoMounted\(false\);\n\s*try \{\n\s*await deleteNote/);
  });

  test("a user verb's Failure chain exports too: Log In's catch shows the refusal", () => {
    const { dir } = fixtureWith((g) => {
      addNode(g, { id: 'login', type: 'net.noodl.user.LogIn', label: 'Log in', parameters: { username: 'ann', password: 'pw' } });
      g.connections = g.connections.map((c) => (c.fromId === 'del' ? { ...c, fromId: 'login' } : c.toId === 'del' ? { ...c, toId: 'login', toProperty: 'login' } : c));
      g.nodes = g.nodes.filter((n) => n.id !== 'del');
    });
    const p = planOf(dir);
    expect(p.dispositions.login?.kind).toBe('collapsed');
    expect(p.dispositions.show?.kind).toBe('collapsed');
    const emitted = emitDir(dir);
    expect(emitted.files[PAGE]).toMatch(/await logIn\('ann', 'pw'\);[\s\S]*\} catch \(error\) \{[\s\S]*setItDidNotGoMounted\(true\);\n\s*said\.set\(logInErrorMessage\);/);
    expect(typecheckEmittedApp(emitted)).toEqual([]);
  });
  test("a verb inside a Failure chain is attached: its api function is exported, and the page typechecks", () => {
    const { dir } = fixtureWith((g) => {
      addNode(g, { id: 'drop', type: 'DeleteDbModelProperties', label: 'Drop the draft', parameters: { collectionName: 'Draft', modelId: 'd1' } });
      g.connections.push({ fromId: 'del', fromProperty: 'failure', toId: 'drop', toProperty: 'store' });
    });
    expect(planOf(dir).dispositions.drop?.kind).toBe('collapsed');
    const app = emitDir(dir);
    expect(app.files['src/api/drafts.ts']).toContain('export async function deleteDraft(');
    expect(app.files[PAGE]).toMatch(/\} catch \(error\) \{[\s\S]*await deleteDraft\('d1'\);/);
    expect(typecheckEmittedApp(app)).toEqual([]);
  });
});

describe('§C refused by name', () => {
  test("a Completed wire keeps the verb's refusal", () => {
    const { dir } = fixtureWith((g) => g.connections.push({ fromId: 'del', fromProperty: 'completed', toId: 'goneSet', toProperty: 'do' }));
    expect(planOf(dir).dispositions.del).toMatchObject({
      kind: 'deferred',
      reason: 'its completed output is consumed — only the done and failure chains and the Error value are translated in this slice'
    });
  });

  test("a Set fed by two wires, Done by a button that sends neither: which wrote last is not known, and it is refused", () => {
    const { dir } = fixtureWith((g) => {
      secondVerb(g);
      addNode(g, { id: 'sayBtn', type: 'net.noodl.controls.button', label: 'Say it', parent: 'shell', parameters: { label: 'Say it' } }, true);
      g.connections.push({ fromId: 'sayBtn', fromProperty: 'onClick', toId: 'saidSet', toProperty: 'do' });
    });
    const p = planOf(dir);
    expect(p.handlers.sayBtn).toBeUndefined();
    expect(p.notes.join('\n')).toContain('wire sayBtn:onClick->saidSet:do dropped: two wires feed its Value input — last-writer-wins is not statically ordered');
    for (const id of ['del', 'del2']) expect(p.dispositions[id]?.kind).toBe('collapsed');
  });

  test('a Set Variable a button runs too: the button reads no catch local, and its read of the Error keeps the old refusal', () => {
    const { dir } = fixtureWith((g) => {
      addNode(g, { id: 'sayBtn', type: 'net.noodl.controls.button', label: 'Say it', parent: 'shell', parameters: { label: 'Say it' } }, true);
      g.connections.unshift({ fromId: 'sayBtn', fromProperty: 'onClick', toId: 'saidSet', toProperty: 'do' });
    });
    const p = planOf(dir);
    expect(p.dispositions.del?.kind).toBe('collapsed');
    expect(p.handlers.sayBtn).toBeUndefined();
    const app = emitDir(dir);
    expect(app.files[PAGE]).toContain('said.set(removeItErrorMessage)');
    expect(app.files[PAGE]).toMatch(/<button>Say it<\/button>/);
    expect(typecheckEmittedApp(app)).toEqual([]);
  });

  test('a later wire of the same click writing what the call sends: the later wire is refused, the call keeps its export', () => {
    const { dir } = fixtureWith((g) => {
      idFromVariable('n1')(g);
      addNode(g, { id: 'whichSet', type: 'Set Variable', label: 'Pick n2', parameters: { name: 'which', value: 'n2' } });
      g.connections.push({ fromId: 'removeBtn', fromProperty: 'onClick', toId: 'whichSet', toProperty: 'do' });
    });
    const p = planOf(dir);
    expect(p.dispositions.del?.kind).toBe('collapsed');
    expect(p.dispositions.whichSet).toMatchObject({
      kind: 'deferred',
      reason: 'its node sends "which" after the click\'s later wires have written it — the runtime reads what it sends after the update, the export where the call starts, and that order is not exported in this slice'
    });
  });
});
