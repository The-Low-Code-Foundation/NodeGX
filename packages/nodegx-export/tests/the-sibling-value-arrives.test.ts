import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { Catalog, CatalogIndex, loadCatalog } from '../src/catalog';
import { ComponentPlan, planProject } from '../src/analyze/plan';
import { emitApp, EmittedApp } from '../src/emit/emitApp';
import { parseProject } from '../src/parse/parseProject';
import { writeSiblingDesk } from './helpers/sibling-desk';
import { Desk } from './helpers/root-desk';
import { typecheckEmittedApp } from './helpers/typecheckApp';

/**
 * The sibling's value arrives (P18 session 128, BOARD lane 6, EXP-011 §96, P18-S127-SIBLINGVALUE).
 *
 * Before: one placed component's value output wired into another placed component's input was dropped, "instance output
 * "x" feeds /<component>.<port>, which has no static binding in this slice" (90 template wires), and a chain the second
 * one ran on a signal read `undefined` for that input.
 *
 * Now the parent lifts the output into a row (CONTROLLED-STATE §4d, as for a rendered sink) and passes the row as the
 * sibling's prop. A placed component that reads such a row and is pulsed is handed its count one commit after it is sent,
 * from the parent's own effect: the lifted value arrives from the child's push effect in the commit the pulse lands in, and
 * a parent's effects run after its children's, so the two land in one render and the chain reads the value sent with
 * the pulse, as the runtime's does. The first build bound the row alone and read the value one pulse late (measured).
 *
 * §A the emitted app rendered by real React under StrictMode (`helpers/export-react-arm.js`, settled) against the
 * runtime's own nodes (`helpers/runtime-mounted-arm.js`), press by press, over the Sibling Desk (`helpers/sibling-desk.ts`,
 * built in a temporary folder so the corpus golden does not move) and its variants, a control among them. §B what is
 * emitted. §C the plan. §D typecheck. The expected readings are `dev-docs/tasks/phase-18-code-export-v2/s128-setdone/EXPECTED.md`.
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
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sibling-desk-app-'));
  for (const [file, text] of Object.entries(app.files)) {
    fs.mkdirSync(path.dirname(path.join(dir, file)), { recursive: true });
    fs.writeFileSync(path.join(dir, file), text);
  }
  return dir;
};
const emitDir = (dir: string): EmittedApp => emitApp(parseProject(dir, catalog), catalog);
const planOf = (dir: string, legacy: string): ComponentPlan =>
  planProject(parseProject(dir, catalog), new CatalogIndex(catalog)).byLegacyPath.get(legacy)!;

const STEPS = ['Pick A', 'Pick B', 'Pick A', 'Choose C', 'Pick A'];

const VARIANTS: Array<{ name: string; edit?: (d: Desk) => void }> = [
  { name: 'the desk' },
  {
    name: 'the page\'s two wires into the Shower the other way round',
    edit: (d) => {
      const home = d.components['Pages/Home'];
      const at = home.connections.findIndex((c) => c.toId === 'shower' && c.toProperty === 'which');
      const [wire] = home.connections.splice(at, 1);
      const show = home.connections.findIndex((c) => c.fromId === 'picker' && c.toProperty === 'show');
      home.connections.splice(show + 1, 0, wire);
    }
  },
  {
    name: 'the control: no wire into the Shower\'s signal input',
    edit: (d) => {
      const home = d.components['Pages/Home'];
      home.connections = home.connections.filter((c) => !(c.toId === 'shower' && c.toProperty === 'show'));
    }
  }
];

const BASE: Readings = [
  ['said nothing', 'the shower'],
  ['task a', 'the shower'],
  ['task b', 'the shower'],
  ['task a', 'the shower'],
  ['task c', 'the shower'],
  ['task a', 'the shower']
];
const CONTROL: Readings = BASE.map(() => ['said nothing', 'the shower']);

const desks = VARIANTS.map((v) => writeSiblingDesk(v.edit));
const apps = desks.map((d) => emitDir(d.dir));
const runtime = childArm(
  'runtime-mounted-arm.js',
  desks.map((d) => ({ dir: d.dir, scenarios: [STEPS] }))
);
const exported = childArm(
  'export-react-arm.js',
  apps.map((a) => ({ dir: writeApp(a), scenarios: [STEPS], settled: true }))
);

describe('§A the emitted app runs what the runtime runs, press by press', () => {
  it('A1 the desk: the runtime reads what EXPECTED.md says (the arm grades the runtime first)', () => {
    expect(runtime[0][0]).toEqual(BASE);
  });

  it('A2 the desk: the export reads exactly what the runtime reads', () => {
    expect(exported[0][0]).toEqual(runtime[0][0]);
  });

  it('A3 a sibling\'s signal: the chain reads the value the sibling sent with it, every pick', () => {
    expect(exported[0][0].slice(1, 4).map((r) => r[0])).toEqual(['task a', 'task b', 'task a']);
  });

  it('A4 the page\'s own click: the value round the sibling\'s output has arrived when the chain reads it', () => {
    expect(exported[0][0][4][0]).toBe('task c');
  });

  it('A5 the wires the other way round: the same readings', () => {
    expect(runtime[1][0]).toEqual(BASE);
    expect(exported[1][0]).toEqual(runtime[1][0]);
  });

  it('A6 the control: with no wire into the signal input, both arms read the load at every step', () => {
    expect(runtime[2][0]).toEqual(CONTROL);
    expect(exported[2][0]).toEqual(CONTROL);
  });
});

describe('§B what is emitted', () => {
  const home = apps[0].files['src/pages/Home.tsx'];

  it('B1 the output is lifted into a row and passed as the sibling\'s prop', () => {
    expect(home).toContain('const [picked, setPicked] = useState<string | undefined>();');
    expect(home).toContain('<Picker onPickedChanged={setPicked} onChose={() => setShowerShowPulses((v) => v + 1)} />');
    expect(home).toContain('which={picked}');
  });

  it('B2 the count handed on follows the count sent, from the parent\'s own effect', () => {
    expect(home).toContain('const [showerShowDelivered, setShowerShowDelivered] = useState<number>(0);');
    expect(home).toContain(['  useEffect(() => {', '    setShowerShowDelivered(showerShowPulses);', '  }, [showerShowPulses]);'].join('\n'));
    expect(home).toContain('show={{ sent: showerShowDelivered, taken: showerShowTaken }}');
  });
});

describe('§C the plan', () => {
  it('C1 the wire is bound, not dropped; the pulse is delivered', () => {
    const plan = planOf(desks[0].dir, '/Pages/Home');
    expect(plan.bindings['shower']?.['which']).toEqual({ kind: 'computed', expr: { kind: 'state-get', name: 'picked', maybeUndefined: true } });
    expect(plan.notes.filter((n) => n.includes('picker:picked->shower:which'))).toEqual([]);
    expect(plan.instancePulses.find((p) => p.nodeId === 'shower')?.delivered).toEqual({ name: 'showerShowDelivered', setterName: 'setShowerShowDelivered' });
  });

  it('C2 an output its component does not lift: the wire is named on the sibling\'s marker, its prop not passed', () => {
    const dir = writeSiblingDesk((d) => {
      // The Picker's output fed from nothing it can lift: an Expression over an input it is never given, refused.
      const picker = d.components['Components/Picker'];
      picker.connections = picker.connections.filter((c) => !(c.toId === 'pkOut' && c.toProperty === 'picked'));
      picker.nodes.push({ id: 'pkRand', type: 'Expression', label: 'Random', parameters: { expression: 'Math.random()' }, x: 700, y: 900 });
      picker.connections.push({ fromId: 'pkRand', fromProperty: 'result', toId: 'pkOut', toProperty: 'picked' });
    }).dir;
    const plan = planOf(dir, '/Pages/Home');
    expect(plan.droppedWires.find((w) => w.toId === 'shower' && w.toProperty === 'which')?.reason).toBe(
      'instance output "picked" is not lifted by /Components/Picker — its feed defers there'
    );
    expect(plan.bindings['shower']?.['which']).toBeUndefined();
    expect(plan.instancePulses.find((p) => p.nodeId === 'shower')?.delivered).toBeUndefined();
  });

  it('C3 a pulsed component that reads no lifted value is handed the count as it is sent (session 127\'s shape)', () => {
    const dir = writeSiblingDesk((d) => {
      const home = d.components['Pages/Home'];
      home.connections = home.connections.filter((c) => !(c.toId === 'shower' && c.toProperty === 'which'));
    }).dir;
    const plan = planOf(dir, '/Pages/Home');
    expect(plan.instancePulses.find((p) => p.nodeId === 'shower')).toEqual({ nodeId: 'shower', port: 'show', stateName: 'showerShowPulses', takenLocal: 'showerShowTaken' });
  });
});

describe('§D the emitted apps typecheck', () => {
  it.each(VARIANTS.map((v, i) => [v.name, i] as const))('D %s', (_name, i) => {
    expect(typecheckEmittedApp(apps[i])).toEqual([]);
  });
});
