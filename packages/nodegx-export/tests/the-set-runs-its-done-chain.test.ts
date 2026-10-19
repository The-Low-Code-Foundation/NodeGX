import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { Catalog, CatalogIndex, loadCatalog } from '../src/catalog';
import { ComponentPlan, planProject } from '../src/analyze/plan';
import { emitApp, EmittedApp } from '../src/emit/emitApp';
import { parseProject } from '../src/parse/parseProject';
import { writeSetDesk } from './helpers/set-desk';
import { Desk } from './helpers/root-desk';
import { typecheckEmittedApp } from './helpers/typecheckApp';

/**
 * The Set runs its Done chain (P18 session 128, BOARD lane 6, EXP-011 §95, P18-S127-SETDONE).
 *
 * Before: a Set Variable's Do compiled as a store write and its Done was never looked at. Every wire out of Done was
 * dropped, "the trigger is not a rendered element event or a receiver", and the node it drove refused with that sentence
 * (54 template nodes; rocket-school's game and race never start, their `start` sent from a Set's Done).
 *
 * Now the Set's Done chain, then its Completed chain, are following statements after the write, as the runtime runs them:
 * it writes, notifies every Variable reading the name, then sends Done and Completed (`setvariablenode.ts`), and a
 * Done's target is flagged dirty with its sender and pulls it first, so the chain runs before the click's next wire
 * (measured: `s128-setdone/EXPECTED.md`, where the opposite was predicted from the update loop alone). A chain the export
 * cannot run leaves the write as it was and is named on each of its wires.
 *
 * §A the emitted app rendered by real React under StrictMode (`helpers/export-react-arm.js`, settled) against the
 * runtime's own nodes rendered by real React (`helpers/runtime-mounted-arm.js`), press by press, over the Set Desk
 * (`helpers/set-desk.ts`, built in a temporary folder so the corpus golden does not move) and its variants, a control
 * among them. §B what is emitted. §C the plan. §D typecheck.
 */

const catalog: Catalog = loadCatalog();
type Readings = string[][];

/** One arm in a child process; an arm that throws reads as one reading per scenario holding the error, so rows fail by name. */
const childArm = (helper: string, input: Array<{ dir: string; scenarios: string[][]; settled?: boolean }>): Readings[][] => {
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
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'set-desk-app-'));
  for (const [file, text] of Object.entries(app.files)) {
    fs.mkdirSync(path.dirname(path.join(dir, file)), { recursive: true });
    fs.writeFileSync(path.join(dir, file), text);
  }
  return dir;
};
const emitDir = (dir: string): EmittedApp => emitApp(parseProject(dir, catalog), catalog);
const planOf = (dir: string, legacy: string): ComponentPlan =>
  planProject(parseProject(dir, catalog), new CatalogIndex(catalog)).byLegacyPath.get(legacy)!;

const STEPS = ['Ready', 'Order', 'Play', 'Answer'];

/** Every wire out of a Set Variable's Done or Completed, in every component of the desk (the control removes them). */
const isSetChainWire = (d: Desk, p: string, fromId: string, fromProperty: string): boolean =>
  (fromProperty === 'done' || fromProperty === 'completed') && d.components[p].nodes.some((n) => n.id === fromId && n.type === 'Set Variable');

const VARIANTS: Array<{ name: string; edit?: (d: Desk) => void; steps?: string[] }> = [
  { name: 'the desk' },
  {
    name: 'the Order click\'s two wires the other way round',
    edit: (d) => {
      const home = d.components['Pages/Home'];
      const first = home.connections.findIndex((c) => c.fromId === 'orderBtn' && c.toId === 'sdFirst');
      const [wire] = home.connections.splice(first, 1);
      const second = home.connections.findIndex((c) => c.fromId === 'orderBtn' && c.toId === 'sdSecond');
      home.connections.splice(second + 1, 0, wire);
    }
  },
  {
    name: 'a Condition between the Ready click and its Set',
    edit: (d) => {
      const home = d.components['Pages/Home'];
      // Unticked: a Condition re-tests its value as it arrives, at load too, and this variant is about the click.
      home.nodes.push({ id: 'readyIf', type: 'Condition', label: 'Ready if', parameters: { condition: true, 'runOnChange-condition': false }, x: 700, y: 1900 });
      const wire = home.connections.find((c) => c.fromId === 'readyBtn' && c.toId === 'sdReady')!;
      wire.toId = 'readyIf';
      wire.toProperty = 'eval';
      home.connections.push({ fromId: 'readyIf', fromProperty: 'ontrue', toId: 'sdReady', toProperty: 'do' });
    }
  },
  {
    name: 'the control: no wire out of any Set Variable\'s Done or Completed',
    edit: (d) => {
      for (const [p, graph] of Object.entries(d.components)) {
        graph.connections = graph.connections.filter((c) => !isSetChainWire(d, p, c.fromId, c.fromProperty));
      }
    }
  },
  {
    // The Done chain reads what the click's first wire wrote: the field's text, cleared (the chain carries the click's
    // snapshot onward, as an Object's Set's does).
    name: 'a field cleared on the click\'s first wire, read in the Done chain',
    steps: ['Wipe'],
    edit: (d) => {
      const home = d.components['Pages/Home'];
      home.nodes.push(
        { id: 'wipeBtn', type: 'net.noodl.controls.button', label: 'Wipe', parent: 'shell', parameters: { label: 'Wipe' }, x: 100, y: 2000 },
        { id: 'noteField', type: 'net.noodl.controls.textinput', label: 'Note', parent: 'shell', parameters: { startValue: 'note Ann' }, x: 100, y: 2080 },
        { id: 'sdWipe', type: 'Set Variable', label: 'Say wiped', parameters: { name: 'said', value: 'wiped' }, x: 700, y: 2000 },
        { id: 'sdEchoNote', type: 'Set Variable', label: 'Echo the note', parameters: { name: 'echo' }, x: 700, y: 2080 }
      );
      home.nodes.find((n) => n.id === 'shell')!.children!.push('wipeBtn', 'noteField');
      home.connections.push(
        { fromId: 'wipeBtn', fromProperty: 'onClick', toId: 'noteField', toProperty: 'clear' },
        { fromId: 'wipeBtn', fromProperty: 'onClick', toId: 'sdWipe', toProperty: 'do' },
        { fromId: 'sdWipe', fromProperty: 'done', toId: 'sdEchoNote', toProperty: 'do' },
        { fromId: 'noteField', fromProperty: 'onTextChanged', toId: 'sdEchoNote', toProperty: 'value' }
      );
    }
  }
];

const BASE: Readings = [
  ['said nothing', 'echo nothing', 'order nothing', 'told nothing', 'game idle'],
  ['ready', 'ready', 'order nothing', 'told ready', 'game idle', 'the banner'],
  ['ready', 'ready', 'second', 'told ready', 'game idle', 'the banner'],
  ['ready', 'ready', 'second', 'told game', 'game on', 'the banner', 'the game'],
  ['answer yes', 'ready', 'second', 'told game', 'game on', 'the banner', 'the game']
];
/** The wires the other way round: second, then first, its Done, its Completed. */
const REVERSED: Readings = BASE.map((r, i) => (i >= 2 ? [r[0], r[1], 'completed after', ...r.slice(3)] : r));
/** The control: nothing hangs off a Set; Play still mounts the Game, whose `start` is never sent. */
const CONTROL: Readings = [
  ['said nothing', 'echo nothing', 'order nothing', 'told nothing', 'game idle'],
  ['ready', 'echo nothing', 'order nothing', 'told nothing', 'game idle'],
  ['ready', 'echo nothing', 'second', 'told nothing', 'game idle'],
  ['ready', 'echo nothing', 'second', 'told nothing', 'game idle', 'the game'],
  ['ready', 'echo nothing', 'second', 'told nothing', 'game idle', 'the game']
];

const desks = VARIANTS.map((v) => writeSetDesk(v.edit));
const apps = desks.map((d) => emitDir(d.dir));
const runtime = childArm(
  'runtime-mounted-arm.js',
  desks.map((d, i) => ({ dir: d.dir, scenarios: [VARIANTS[i].steps ?? STEPS] }))
);
const exported = childArm(
  'export-react-arm.js',
  apps.map((a, i) => ({ dir: writeApp(a), scenarios: [VARIANTS[i].steps ?? STEPS], settled: true }))
);

describe('§A the emitted app runs what the runtime runs, press by press', () => {
  it('A1 the desk: the runtime reads what EXPECTED.md says (the arm grades the runtime first)', () => {
    expect(runtime[0][0]).toEqual(BASE);
  });

  it('A2 the desk: the export reads exactly what the runtime reads', () => {
    expect(exported[0][0]).toEqual(runtime[0][0]);
  });

  it('A3 a reader in the Done chain sees the value just written, and the Done pulses a placed component', () => {
    expect(exported[0][0][1]).toEqual(['ready', 'ready', 'order nothing', 'told ready', 'game idle', 'the banner']);
  });

  it('A4 the Done chain runs before the click\'s next wire, as the runtime runs it', () => {
    expect(exported[0][0][2][2]).toBe('second');
  });

  it('A5 a Done into a signal input runs the chain inside, and a Done chain inside a component runs from that pulse', () => {
    expect(exported[0][0][3].slice(3)).toEqual(['told game', 'game on', 'the banner', 'the game']);
  });

  it('A6 a Done into the component\'s own signal output reaches the page', () => {
    expect(exported[0][0][4][0]).toBe('answer yes');
  });

  it('A7 the click\'s wires the other way round: second, then the Set, its Done, its Completed', () => {
    expect(runtime[1][0]).toEqual(REVERSED);
    expect(exported[1][0]).toEqual(runtime[1][0]);
  });

  it('A8 a Condition between the click and the Set: the same readings', () => {
    expect(runtime[2][0]).toEqual(BASE);
    expect(exported[2][0]).toEqual(runtime[2][0]);
  });

  it('A9 the control: with nothing hung off a Set, both arms read the control', () => {
    expect(runtime[3][0]).toEqual(CONTROL);
    expect(exported[3][0]).toEqual(CONTROL);
  });

  it('A10 a field cleared on the click\'s first wire: the Done chain reads it empty', () => {
    expect(runtime[4][0]).toEqual([BASE[0], ['wiped', '', 'order nothing', 'told nothing', 'game idle']]);
    expect(exported[4][0]).toEqual(runtime[4][0]);
  });
});

describe('§B what is emitted', () => {
  const home = apps[0].files['src/pages/Home.tsx'];
  const game = apps[0].files['src/components/Game.tsx'];
  const quiz = apps[0].files['src/components/Quiz.tsx'];

  it('B1 the write, then its Done chain (a reader, a pulse), then its Completed chain, as following statements', () => {
    expect(home).toContain("onClick={() => { said.set('ready'); echo.set(said.get()); setBannerShowPulses((v) => v + 1); told.set('told ready'); }}");
  });

  it('B2 the chain before the click\'s next wire', () => {
    expect(home).toContain("onClick={() => { order.set('first'); order.set('done after'); order.set('completed after'); order.set('second'); }}");
  });

  it('B3 inside a component, the chain a signal input runs carries the Set\'s Done chain', () => {
    expect(game).toContain(["    gameText.set('game on');", "    told.set('told game');", '  }, [start?.sent]);'].join('\n'));
  });

  it('B4 a Done into the component\'s own signal output calls the callback after the write', () => {
    expect(quiz).toContain("onClick={() => { answer.set('answer yes'); onAnswered?.(); }}");
  });
});

/** The desk with a button "Bad" whose Set's Done drives a Set the export refuses, beside one a button also fires. */
const badDesk = (): string =>
  writeSetDesk((d) => {
    const home = d.components['Pages/Home'];
    home.nodes.push(
      { id: 'badBtn', type: 'net.noodl.controls.button', label: 'Bad', parent: 'shell', parameters: { label: 'Bad' }, x: 100, y: 2000 },
      { id: 'okBtn', type: 'net.noodl.controls.button', label: 'Ok', parent: 'shell', parameters: { label: 'Ok' }, x: 100, y: 2080 },
      { id: 'sdBad', type: 'Set Variable', label: 'Say bad', parameters: { name: 'said', value: 'bad' }, x: 700, y: 2000 },
      { id: 'sdOk', type: 'Set Variable', label: 'Echo ok', parameters: { name: 'echo', value: 'ok' }, x: 700, y: 2080 },
      { id: 'sdObj', type: 'Set Variable', label: 'Set an object', parameters: { name: 'echo', setWith: 'object', value: 'x' }, x: 700, y: 2160 },
      { id: 'sdNobody', type: 'Set Variable', label: 'Nobody runs this', parameters: { name: 'told', value: 'nobody' }, x: 700, y: 2240 },
      { id: 'sdAfterNobody', type: 'Set Variable', label: 'After nobody', parameters: { name: 'told', value: 'after nobody' }, x: 700, y: 2320 },
      { id: 'clockBtn', type: 'net.noodl.controls.button', label: 'Clock', parent: 'shell', parameters: { label: 'Clock' }, x: 100, y: 2160 },
      { id: 'clockText', type: 'Text', label: 'Clock text', parent: 'shell', parameters: {}, x: 100, y: 2240 },
      { id: 'sdClock', type: 'Set Variable', label: 'Say clock', parameters: { name: 'said', value: 'clock' }, x: 700, y: 2400 },
      { id: 'clock', type: 'net.noodl.Now', label: 'Clock', parameters: {}, x: 700, y: 2480 }
    );
    home.nodes.find((n) => n.id === 'shell')!.children!.push('badBtn', 'okBtn', 'clockBtn', 'clockText');
    home.connections.push(
      { fromId: 'badBtn', fromProperty: 'onClick', toId: 'sdBad', toProperty: 'do' },
      { fromId: 'sdBad', fromProperty: 'done', toId: 'sdOk', toProperty: 'do' },
      { fromId: 'sdBad', fromProperty: 'done', toId: 'sdObj', toProperty: 'do' },
      { fromId: 'okBtn', fromProperty: 'onClick', toId: 'sdOk', toProperty: 'do' },
      { fromId: 'sdNobody', fromProperty: 'done', toId: 'sdAfterNobody', toProperty: 'do' },
      { fromId: 'clockBtn', fromProperty: 'onClick', toId: 'sdClock', toProperty: 'do' },
      { fromId: 'sdClock', fromProperty: 'done', toId: 'clock', toProperty: 'read' },
      { fromId: 'clock', fromProperty: 'iso', toId: 'clockText', toProperty: 'text' }
    );
  }).dir;

describe('§C the plan', () => {
  it('C1 the Set and its whole chain collapse into the click, and no wire out of the Set is dropped', () => {
    const plan = planOf(desks[0].dir, '/Pages/Home');
    const into: Record<string, string> = { sdReady: 'readyBtn', sdEcho: 'readyBtn', sdToldReady: 'readyBtn', sdFirst: 'orderBtn', sdAfter: 'orderBtn', sdLast: 'orderBtn' };
    for (const [id, owner] of Object.entries(into)) expect([id, plan.dispositions[id]]).toEqual([id, { kind: 'collapsed', into: owner }]);
    expect(plan.dispositions['banner']).toEqual({ kind: 'static' });
    expect(plan.dispositions['sdPlay']).toEqual({ kind: 'collapsed', into: 'playBtn' });
    expect(plan.notes.filter((n) => /wire sd\w+:(done|completed)->/.test(n))).toEqual([]);
  });

  it('C2 inside: the Done chain from a signal input collapses into the Component Inputs; the Done into an output signal is the callback', () => {
    expect(planOf(desks[0].dir, '/Components/Game').dispositions['gmTell']).toEqual({ kind: 'collapsed', into: 'gmIn' });
    const quiz = planOf(desks[0].dir, '/Components/Quiz');
    expect(quiz.dispositions['qzSet']).toEqual({ kind: 'collapsed', into: 'qzBtn' });
    expect(quiz.handlers['qzBtn']?.['onClick']).toEqual([
      { kind: 'store-set', variableName: 'answer', expr: { kind: 'literal', value: 'answer yes' }, then: [{ kind: 'output-signal', prop: 'onAnswered' }] }
    ]);
  });

  it('C3 a chain the export cannot run keeps the write; the sink that refuses says why, its sibling wire names the chain', () => {
    const plan = planOf(badDesk(), '/Pages/Home');
    expect(plan.dispositions['sdBad']).toEqual({ kind: 'collapsed', into: 'badBtn' });
    expect(plan.handlers['badBtn']?.['onClick']).toEqual([{ kind: 'store-set', variableName: 'said', expr: { kind: 'literal', value: 'bad' } }]);
    const own = 'setWith "object" conversion is not translated in step 5';
    expect(plan.dispositions['sdObj']).toEqual({ kind: 'deferred', to: 'EXP-003', reason: own });
    expect(plan.notes).toContain(`wire sdBad:done->sdObj:do dropped: ${own}`);
    expect(plan.notes).toContain(`wire sdBad:done->sdOk:do dropped: trigger sdBad.done: the Set Variable's Done chain is not exported — ${own}`);
    // Once: not again by the sweep of wires nothing translated.
    expect(plan.notes.filter((n) => n.includes('sdBad:done->sdOk:do'))).toHaveLength(1);
  });

  it('C4 a sink another trigger runs keeps its ruling', () => {
    expect(planOf(badDesk(), '/Pages/Home').dispositions['sdOk']).toEqual({ kind: 'collapsed', into: 'okBtn' });
  });

  it('C5 a Set nothing exported runs: its chain\'s sink says so', () => {
    const plan = planOf(badDesk(), '/Pages/Home');
    expect(plan.dispositions['sdAfterNobody']).toEqual({
      kind: 'deferred',
      to: 'EXP-003',
      reason: 'trigger sdNobody.done: the Set Variable that sends it is never run by an exported trigger'
    });
  });

  it('C7 a node the chain attaches is earned by it: a Now read in the Done chain is exported', () => {
    const plan = planOf(badDesk(), '/Pages/Home');
    expect(plan.dispositions['clock']).toEqual({ kind: 'collapsed', into: 'src/pages/Home.tsx' });
    expect(plan.handlers['clockBtn']?.['onClick']?.[0]).toMatchObject({ kind: 'store-set', variableName: 'said', then: [{ kind: 'date-now-read', nodeId: 'clock' }] });
  });

  it('C6 the Done wire listed before the wire that runs the Set: the same plan, no wire named dropped', () => {
    const dir = writeSetDesk((d) => {
      const home = d.components['Pages/Home'];
      const at = home.connections.findIndex((c) => c.fromId === 'sdReady' && c.fromProperty === 'done' && c.toId === 'sdEcho');
      const [wire] = home.connections.splice(at, 1);
      home.connections.unshift(wire);
    }).dir;
    const plan = planOf(dir, '/Pages/Home');
    expect(plan.dispositions['sdEcho']).toEqual({ kind: 'collapsed', into: 'readyBtn' });
    expect(plan.notes.filter((n) => n.startsWith('wire sdReady:done->'))).toEqual([]);
    expect(plan.handlers['readyBtn']).toEqual(planOf(desks[0].dir, '/Pages/Home').handlers['readyBtn']);
  });
});

describe('§B a navigation in the Done chain', () => {
  // Not graded by the arms (the runtime arm draws no router): what the emitted page needs for it, and that it typechecks.
  const app = emitDir(
    writeSetDesk((d) => {
      const home = d.components['Pages/Home'];
      home.nodes.push({ id: 'goHome', type: 'RouterNavigate', label: 'Go home', parameters: { target: '/Pages/Home' }, x: 700, y: 2400 });
      home.connections.push({ fromId: 'sdPlay', fromProperty: 'done', toId: 'goHome', toProperty: 'navigate' });
    }).dir
  );
  const home = app.files['src/pages/Home.tsx'];

  it('B5 the navigation follows the write, and the page declares the hook it calls', () => {
    expect(home).toContain("onClick={() => { playing.set(true); setGameStartPulses((v) => v + 1); navigate('/home'); }}");
    expect(home).toContain('const navigate = useNavigate();');
  });

  it('B6 that page typechecks', () => {
    expect(typecheckEmittedApp(app)).toEqual([]);
  });
});

describe('§D the emitted apps typecheck', () => {
  it.each(VARIANTS.map((v, i) => [v.name, i] as const))('D %s', (_name, i) => {
    expect(typecheckEmittedApp(apps[i])).toEqual([]);
  });
});
