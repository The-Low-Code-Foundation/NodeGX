import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { Catalog, CatalogIndex, loadCatalog } from '../src/catalog';
import { ComponentPlan, planProject } from '../src/analyze/plan';
import { emitApp, EmittedApp } from '../src/emit/emitApp';
import { parseProject } from '../src/parse/parseProject';
import { writeSuccessDesk } from './helpers/success-desk';
import { Desk, RawWire } from './helpers/root-desk';
import { typecheckEmittedApp } from './helpers/typecheckApp';

/**
 * The Function succeeds (P18 session 130, BOARD lane 6, EXP-011 §98, P18-S129-FNSUCCESS).
 *
 * Before: a Run-wired Function with anything wired out of its Success was refused whole ("its success output is consumed
 * — only done continues a Run chain in this slice"). rocket-school's and star-class's Lists Editor never filled: its `fill`
 * runs a Function whose Success starts the chain that sets the drafts and the fields.
 *
 * Now the Success chain runs where the runtime sends it (`simplejavascript.ts` `runScript`): after the body, after the
 * chains of the body's own signals, before Done; and on a ticked input's run too, which sends Success and never Done. A
 * Run of such a Function records what it read on its ticked inputs, so a click that writes one and sends Run is one run.
 *
 * §A the emitted app rendered by real React under StrictMode (`helpers/export-react-arm.js`, settled) against the
 * runtime's own Function, Variable, Set Variable, Counter, component instance and Text Input rendered by real React
 * (`helpers/runtime-mounted-arm.js`), step by step, over the Success Desk (`helpers/success-desk.ts`, built in a temporary
 * folder so the corpus golden does not move) and its variants, a control among them. §B what is emitted. §C the plan.
 * §D typecheck.
 */

const catalog: Catalog = loadCatalog();
type Readings = string[][];

/** One arm in a child process; an arm that throws reads as one reading per scenario holding the error, so rows fail by name. */
const childArm = (helper: string, input: Array<{ dir: string; scenarios: string[][]; settled?: boolean; fields?: boolean }>): Readings[][] => {
  try {
    return JSON.parse(
      execFileSync(process.execPath, [path.join(__dirname, 'helpers', helper)], {
        input: JSON.stringify(input),
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe'],
        timeout: 120000,
        maxBuffer: 16 * 1024 * 1024
      })
    );
  } catch (e) {
    const said = String((e as { stderr?: unknown }).stderr ?? e).split('\n')[0];
    return input.map((project) => project.scenarios.map(() => [[`the ${helper} arm threw: ${said}`]]));
  }
};
const writeApp = (app: EmittedApp): string => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'success-desk-app-'));
  for (const [file, text] of Object.entries(app.files)) {
    fs.mkdirSync(path.dirname(path.join(dir, file)), { recursive: true });
    fs.writeFileSync(path.join(dir, file), text);
  }
  return dir;
};
const emitDir = (dir: string): EmittedApp => emitApp(parseProject(dir, catalog), catalog);
const planOf = (dir: string, legacy: string): ComponentPlan =>
  planProject(parseProject(dir, catalog), new CatalogIndex(catalog)).byLegacyPath.get(legacy)!;

const STEPS = ['Say', 'Bob', 'Say', 'Show', 'Pick b', 'Pick b', 'Pick c and show', 'Edit'];

const isSuccessWire = (c: RawWire): boolean => c.fromProperty === 'success';
/** `shown` seeded, for the variants in which nothing writes it at load (a wired Text with no value reads "Text" in the runtime only, P18-S122-TEXTDEFAULT). */
const seedShown = (d: Desk) => {
  d.components['Pages/Home'].nodes.find((n) => n.id === 'shownVar')!.parameters.value = 'shown nothing';
};

const VARIANTS: Array<{ name: string; edit?: (d: Desk) => void }> = [
  { name: 'the desk' },
  {
    name: 'every Success wire listed before the wires that run its Function',
    edit: (d) => {
      for (const graph of Object.values(d.components)) graph.connections = [...graph.connections.filter(isSuccessWire), ...graph.connections.filter((c) => !isSuccessWire(c))];
    }
  },
  {
    name: 'the Say click\'s second wire sets next',
    edit: (d) => {
      const home = d.components['Pages/Home'];
      const at = home.connections.findIndex((c) => c.fromId === 'sayBtn' && c.toId === 'greet');
      home.connections.splice(at + 1, 0, { fromId: 'sayBtn', fromProperty: 'onClick', toId: 'sdNext', toProperty: 'do' });
    }
  },
  {
    name: 'the control: no Success wire anywhere',
    edit: (d) => {
      for (const graph of Object.values(d.components)) graph.connections = graph.connections.filter((c) => !isSuccessWire(c));
      seedShown(d);
    }
  },
  {
    name: 'the pick\'s box unticked',
    edit: (d) => {
      d.components['Pages/Home'].nodes.find((n) => n.id === 'pickFn')!.parameters['runOnChange-in-pick'] = false;
      seedShown(d);
    }
  }
];

/** said · echo · order · pulse · next · shown · doneAt · the pick's runs · filled · the Editor's field · focus. */
const row = (cells: Partial<Record<'said' | 'echo' | 'order' | 'pulse' | 'next' | 'shown' | 'doneAt' | 'runs' | 'filled' | 'draft', string>>, from: string[]): string[] => {
  const names = ['said', 'echo', 'order', 'pulse', 'next', 'shown', 'doneAt', 'runs', 'filled', 'draft'] as const;
  return names.map((n, i) => (cells[n] === undefined ? from[i] : n === 'draft' ? `[draft]=${cells[n]}` : cells[n]!)).concat('focus=none');
};
const L0 = row({}, ['said nothing', 'echo nothing', 'order nothing', 'pulse nothing', 'next nothing', 'shown a', 'done nothing', '1', 'filled nothing', '[draft]=']);
const sayAnn = row({ said: 'hello Ann', echo: 'hello Ann', order: 'done', pulse: 'success', next: 'success' }, L0);
const sayBob = row({ said: 'hello Bob', echo: 'hello Bob' }, sayAnn);
const show = row({ doneAt: 'shown a', runs: '2' }, sayBob);
const pickB = row({ shown: 'shown b', runs: '3' }, show);
const pickC = row({ shown: 'shown c', doneAt: 'shown c', runs: '4' }, pickB);
const edit = row({ filled: 'filled yes', draft: 'edit Cleo' }, pickC);
/** As `s130-fnsuccess/EXPECTED.md` predicted it, before either arm ran. */
const BASE: Readings = [L0, sayAnn, sayAnn, sayBob, show, pickB, pickB, pickC, edit];
/** The control: no Success chain runs. The greeting's own signal and its Done still run; the pick's Done still writes doneAt. */
const C0 = row({ shown: 'shown nothing', runs: '0' }, L0);
const cSay = row({ order: 'done', pulse: 'pulse' }, C0);
const cShow = row({ doneAt: 'shown a' }, cSay);
const cPickC = row({ doneAt: 'shown c' }, cShow);
const CONTROL: Readings = [C0, cSay, cSay, cSay, cShow, cShow, cShow, cPickC, cPickC];
/** Unticked: the pick runs on Show alone, so nothing at load and nothing when pick changes. */
const U0 = row({ shown: 'shown nothing', runs: '0' }, L0);
const uSay = row({ said: 'hello Ann', echo: 'hello Ann', order: 'done', pulse: 'success', next: 'success' }, U0);
const uBob = row({ said: 'hello Bob', echo: 'hello Bob' }, uSay);
const uShow = row({ shown: 'shown a', doneAt: 'shown a', runs: '1' }, uBob);
const uPickC = row({ shown: 'shown c', doneAt: 'shown c', runs: '2' }, uShow);
const uEdit = row({ filled: 'filled yes', draft: 'edit Cleo' }, uPickC);
const UNTICKED: Readings = [U0, uSay, uSay, uBob, uShow, uShow, uShow, uPickC, uEdit];

const desks = VARIANTS.map((v) => writeSuccessDesk(v.edit));
const apps = desks.map((d) => emitDir(d.dir));
const runtime = childArm('runtime-mounted-arm.js', desks.map((d) => ({ dir: d.dir, scenarios: [STEPS], fields: true })));
const exported = childArm('export-react-arm.js', apps.map((a) => ({ dir: writeApp(a), scenarios: [STEPS], settled: true, fields: true })));

describe('§A the emitted app runs what the runtime runs, step by step', () => {
  it('A1 the desk: the runtime reads what EXPECTED.md says (the arm grades the runtime first)', () => {
    expect(runtime[0][0]).toEqual(BASE);
  });

  it('A2 the desk: the export reads exactly what the runtime reads', () => {
    expect(exported[0][0]).toEqual(runtime[0][0]);
  });

  it('A3 the Success chain reads the run\'s output, and a Set\'s Done chain on it reads what that Set wrote', () => {
    expect(exported[0][0][1].slice(0, 2)).toEqual(['hello Ann', 'hello Ann']);
    expect(exported[0][0][3].slice(0, 2)).toEqual(['hello Bob', 'hello Bob']);
  });

  it('A4 Success after the body\'s own signal, and before Done', () => {
    expect(exported[0][0][1].slice(2, 4)).toEqual(['done', 'success']);
  });

  it('A5 a ticked input\'s run sends Success and never Done: at load, and when the value arrives', () => {
    expect(exported[0][0][0].slice(5, 8)).toEqual(['shown a', 'done nothing', '1']);
    expect(exported[0][0][5].slice(5, 8)).toEqual(['shown b', 'shown a', '3']);
  });

  it('A6 the same value again runs nothing; a write and a Run in one click are one run, with Done', () => {
    expect(exported[0][0][6]).toEqual(exported[0][0][5]);
    expect(exported[0][0][7].slice(5, 8)).toEqual(['shown c', 'shown c', '4']);
  });

  it('A7 the Lists Editor\'s shape: a signal into the component runs the Function, and its Success fills the field and fires the output', () => {
    expect(exported[0][0][8].slice(8)).toEqual(['filled yes', '[draft]=edit Cleo', 'focus=none']);
  });

  it('A8 the Success wires listed first: the same readings', () => {
    expect(runtime[1][0]).toEqual(BASE);
    expect(exported[1][0]).toEqual(runtime[1][0]);
  });

  it('A9 the click\'s second wire: the runtime finishes the run after it; the export runs the run where its wire is (P18-S121-ONEUPDATE, as Done at the base)', () => {
    expect(runtime[2][0]).toEqual(BASE);
    expect(exported[2][0]).toEqual(BASE.map((r, i) => (i === 0 ? r : [...r.slice(0, 4), 'second', ...r.slice(5)])));
  });

  it('A10 the control: with no Success wire, both arms read the control', () => {
    expect(runtime[3][0]).toEqual(CONTROL);
    expect(exported[3][0]).toEqual(CONTROL);
  });

  it('A11 the pick unticked: it runs on its Run alone, in both arms', () => {
    expect(runtime[4][0]).toEqual(UNTICKED);
    expect(exported[4][0]).toEqual(runtime[4][0]);
  });
});

describe('§B what is emitted', () => {
  const home = apps[0].files['src/pages/Home.tsx'];
  const editor = apps[0].files['src/components/Editor.tsx'];

  it('B1 the Run: the body, its own signal\'s chain, then the Success chain, then the Done chain', () => {
    expect(home).toContain(
      [
        '          const theGreetingRun = runFunction(The_greeting, { who: who.get() }, theGreetingNode);',
        '          for (const theGreetingPulse of theGreetingRun.pulses) {',
        "            if (theGreetingPulse.signal === 'ping') {",
        "              pulse.set('pulse');",
        '            }',
        '          }',
        '          said.set(theGreetingRun.outputs.word);',
        '          echo.set(said.get());',
        "          order.set('success');",
        "          pulse.set('success');",
        "          next.set('success');",
        "          order.set('done');"
      ].join('\n')
    );
  });

  it('B2 the ticked run: the Success chain, never the Done chain', () => {
    const effect = /useEffect\(\(\) => \{\n {4}if \(!tickedArrival\(thePickToShowHeld, \[pick\.get\(\)\]\)\) return;\n([\s\S]*?)\n {2}\}, \[pickValue\]\);/.exec(home);
    expect(effect).not.toBeNull();
    expect(effect![1]).toContain('shown.set(The_pick_to_show({ pick: pick.get() }).shown);');
    expect(effect![1]).toMatch(/set\w+\(\(v\) => v \+ 1\)/);
    expect(effect![1]).not.toContain('doneAt');
  });

  it('B3 a Run of a Function a ticked input also runs records what it read first, pulsed or not', () => {
    expect(home).toMatch(/onClick=\{\(\) => \{\n {10}tickedArrival\(thePickToShowHeld, \[pick\.get\(\)\]\);\n {10}shown\.set\(/);
    expect(home).toMatch(/pick\.set\('c'\);\n {10}tickedArrival\(thePickToShowHeld, \[pick\.get\(\)\]\);/);
  });

  it('B4 inside the Editor: the pulse effect runs the Function\'s Success chain (the draft, the field\'s Set) and the output', () => {
    expect(editor).toContain('    draft.set(The_name_to_edit({ name: name0 }).name);');
    expect(editor).toMatch(/setDraft\w*\(draft\w*Text\);\n {4}\}\n {4}onFilled\?\.\(\);\n {2}\}, \[fill\?\.sent\]\);/);
  });

  it('B5 no note says only Done continues a Run chain', () => {
    expect(Object.values(apps[0].files).some((f) => f.includes('only done continues'))).toBe(false);
  });
});

/** The desk with Success into a Function the export refuses (it reads the Noodl API; s132: randomness travels now), and a reactive Function (Run unwired). */
const refusedDesk = (): string =>
  writeSuccessDesk((d) => {
    const home = d.components['Pages/Home'];
    home.nodes.push(
      // EXP-019 (s132): randomness travels now (a host trait), so the refused sink reads the Noodl API instead, which stays refused.
      { id: 'dice', type: 'JavaScriptFunction', label: 'Roll', parameters: { functionScript: 'Outputs.n = Noodl.Events.emit("roll");' }, ports: [{ name: 'out-n', plug: 'output', type: '*' }], x: 700, y: 3000 },
      {
        id: 'react',
        type: 'JavaScriptFunction',
        label: 'On its own',
        parameters: { functionScript: "Outputs.word = 'by itself ' + Inputs.who;", 'runOnChange-in-who': true },
        ports: [{ name: 'in-who', plug: 'input', type: '*' }, { name: 'out-word', plug: 'output', type: '*' }],
        x: 700,
        y: 3080
      },
      { id: 'sdReact', type: 'Set Variable', label: 'sdReact', parameters: { name: 'said' }, x: 700, y: 3160 }
    );
    home.connections.push(
      { fromId: 'greet', fromProperty: 'success', toId: 'dice', toProperty: 'run' },
      { fromId: 'whoVar', fromProperty: 'value', toId: 'react', toProperty: 'in-who' },
      { fromId: 'react', fromProperty: 'success', toId: 'sdReact', toProperty: 'do' },
      { fromId: 'react', fromProperty: 'out-word', toId: 'sdReact', toProperty: 'value' }
    );
  }).dir;

describe('§C the plan', () => {
  it('C1 the Functions and every node on their Success chains collapse into what runs them; no Success wire is dropped', () => {
    const home = planOf(desks[0].dir, '/Pages/Home');
    const into: Record<string, string> = { greet: 'sayBtn', sdSaid: 'sayBtn', sdEcho: 'sayBtn', sdOrderS: 'sayBtn', sdPulseS: 'sayBtn', sdNextS: 'sayBtn', sdOrderD: 'sayBtn' };
    for (const [id, owner] of Object.entries(into)) expect([id, home.dispositions[id]]).toEqual([id, { kind: 'collapsed', into: owner }]);
    // Run by two buttons: collapsed into the one ruled last.
    expect(home.dispositions['pickFn']).toEqual({ kind: 'collapsed', into: 'pickCBtn' });
    expect(home.dispositions['sdShown']).toEqual({ kind: 'collapsed', into: 'pickCBtn' });
    expect(home.dispositions['pickRuns']).toMatchObject({ kind: 'collapsed' });
    expect(home.notes.filter((n) => /:success->/.test(n))).toEqual([]);
    const editor = planOf(desks[0].dir, '/Components/Editor');
    expect(editor.dispositions['edFill']).toEqual({ kind: 'collapsed', into: 'edIn' });
    expect(editor.dispositions['edSetDraft']).toEqual({ kind: 'collapsed', into: 'edIn' });
    expect(editor.dispositions['edOut']).toEqual({ kind: 'static' });
  });

  it('C2 the ticked run carries the Success chain and not Done\'s', () => {
    const ticked = planOf(desks[0].dir, '/Pages/Home').tickedRuns;
    expect(ticked.map((t) => t.nodeId)).toEqual(['pickFn']);
    expect(ticked[0].action.ticked).toBe(true);
    expect(JSON.stringify(ticked[0].action)).toContain('"variableName":"shown"');
    expect(JSON.stringify(ticked[0].action)).not.toContain('"variableName":"doneAt"');
  });

  it('C3 the Success wires listed first: the same handlers, nothing named dropped', () => {
    const before = planOf(desks[0].dir, '/Pages/Home');
    const after = planOf(desks[1].dir, '/Pages/Home');
    expect(after.handlers).toEqual(before.handlers);
    expect(after.notes.filter((n) => /:success->/.test(n))).toEqual([]);
  });

  it('C4 a Success into a sink the export refuses refuses the run with the sink\'s own sentence; its sibling wires name the run', () => {
    const plan = planOf(refusedDesk(), '/Pages/Home');
    const own = 'reads the Noodl API — the runtime-coupled tier (EXP-003 Tier B)';
    expect(plan.dispositions['greet']).toMatchObject({ kind: 'deferred' });
    expect((plan.dispositions['greet'] as { reason: string }).reason).toContain(own);
    // The sink's own sentence, not the run's.
    expect(plan.notes.find((n) => n.startsWith('wire greet:success->dice:run dropped: '))).toContain(own);
    expect(plan.notes.find((n) => n.startsWith('wire greet:success->dice:run dropped: '))).not.toContain('the Function that sends it');
    const sibling = plan.notes.find((n) => n.startsWith('wire greet:success->sdSaid:do dropped: '));
    expect(sibling).toContain('trigger greet.success: the Function that sends it is not exported — ');
    expect(sibling).toContain(own);
    expect(plan.dispositions['sdSaid']).toMatchObject({ kind: 'deferred', reason: expect.stringContaining('trigger greet.success: the Function that sends it is not exported') });
    // Named once each: not again by the sweep of wires nothing translated.
    expect(plan.notes.filter((n) => n.includes('greet:success->sdSaid:do'))).toHaveLength(1);
  });

  it('C5 a reactive Function\'s Success (Run unwired) keeps its sentence: a run with no Run is not this chain', () => {
    const plan = planOf(refusedDesk(), '/Pages/Home');
    expect(plan.notes).toContain('wire react:success->sdReact:do dropped: the trigger is not a rendered element event or a receiver');
    expect(plan.dispositions['sdReact']).toEqual({ kind: 'deferred', to: 'EXP-003', reason: 'trigger react.success is not a rendered element event or a receiver' });
  });
});

describe('§D the emitted apps typecheck', () => {
  it.each(VARIANTS.map((v, i) => [v.name, i] as const))('D %s', (_name, i) => {
    expect(typecheckEmittedApp(apps[i])).toEqual([]);
  });
});
