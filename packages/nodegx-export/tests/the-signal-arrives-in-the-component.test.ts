import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { Catalog, CatalogIndex, loadCatalog } from '../src/catalog';
import { ComponentPlan, INPUT_PULSE_TS_TYPE, planProject } from '../src/analyze/plan';
import { emitApp, EmittedApp } from '../src/emit/emitApp';
import { parseProject } from '../src/parse/parseProject';
import { writeSignalDesk } from './helpers/signal-desk';
import { Desk } from './helpers/root-desk';
import { typecheckEmittedApp } from './helpers/typecheckApp';

/**
 * The signal arrives in the component (P18 session 127, BOARD lane 6, EXP-011 §94, P18-S126-INSIGNAL).
 *
 * Before: a signal a parent sent into a placed component's input (a Component Inputs port of type signal) ran nothing.
 * Inside, every node it drove was refused, "trigger … is not a rendered element event or a receiver" (87 template nodes,
 * 115 wires: rocket-school's Feedback banner, bot-garden's Form reset, todo-list's Dialog flow); outside, the wire into the
 * instance was dropped with no sentence, and the prop was typed as a callback the child never called.
 *
 * Now the parent keeps a count of the pulses it sent to each placed component's signal input and a ref of the count the
 * child has acted on, and passes the two as one prop; the child runs the chain from an effect when the count sent passes
 * the count taken. So a pulse runs the chain once, after the values the parent set before it; a mount runs nothing that
 * was not sent (StrictMode's second mount included); a pulse sent with the click that draws the component still runs
 * (the runtime's instance exists while it is not drawn); and a signal input passed straight on into a child's runs there.
 *
 * §A the emitted app rendered by real React under StrictMode (`helpers/export-react-arm.js`, settled: a press in an async
 * act, so the States library's microtask lands) against the runtime's own nodes rendered by real React
 * (`helpers/runtime-mounted-arm.js`: the runtime's component instances, Component Inputs and Outputs, States, Counter,
 * Condition, the viewer's Group, Text, Button and Text Input), press by press, over the desk (`helpers/signal-desk.ts`,
 * built in a temporary folder so the corpus golden does not move) and its variants, a control among them. §B what is
 * emitted. §C the plan. §D typecheck. The expected readings are
 * `dev-docs/tasks/phase-18-code-export-v2/s127-insignal/EXPECTED.md`.
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
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'signal-desk-app-'));
  for (const [file, text] of Object.entries(app.files)) {
    fs.mkdirSync(path.dirname(path.join(dir, file)), { recursive: true });
    fs.writeFileSync(path.join(dir, file), text);
  }
  return dir;
};
const emitDir = (dir: string): EmittedApp => emitApp(parseProject(dir, catalog), catalog);
const planOf = (dir: string, legacy: string): ComponentPlan =>
  planProject(parseProject(dir, catalog), new CatalogIndex(catalog)).byLegacyPath.get(legacy)!;

const STEPS = ['Show', 'Change', 'Wipe', 'Hide', 'Ask', 'Ask', 'Pick', 'Show'];

/** The wires into a placed component's signal input, every component of the desk (the control removes them). */
const SIGNAL_INPUT_WIRES: Record<string, Array<[string, string]>> = {
  'Pages/Home': [
    ['banner', 'show'],
    ['banner', 'hide'],
    ['banner', 'wipe'],
    ['relay', 'ping'],
    ['picker', 'fill']
  ],
  'Components/Relay': [['rlLamp', 'light']]
};

const VARIANTS: Array<{ name: string; edit?: (d: Desk) => void }> = [
  { name: 'the desk' },
  {
    name: 'a Condition between the Hide click and the pulse',
    edit: (d) => {
      const home = d.components['Pages/Home'];
      home.nodes.push({ id: 'hideIf', type: 'Condition', label: 'Hide if', parameters: { condition: true }, x: 700, y: 900 });
      const wire = home.connections.find((c) => c.fromId === 'hideBtn' && c.toId === 'banner')!;
      wire.toId = 'hideIf';
      wire.toProperty = 'eval';
      home.connections.push({ fromId: 'hideIf', fromProperty: 'ontrue', toId: 'banner', toProperty: 'hide' });
    }
  },
  {
    name: 'the control: no wire into any component\'s signal input',
    edit: (d) => {
      for (const [p, wires] of Object.entries(SIGNAL_INPUT_WIRES)) {
        const graph = d.components[p];
        graph.connections = graph.connections.filter((c) => !wires.some(([id, port]) => c.toId === id && c.toProperty === port));
      }
    }
  }
];

const BASE: Readings = [
  ['said nothing', 'picked nothing', 'lamp dark', '0'],
  ['hello one', 'picked nothing', 'the banner', 'note Ann', 'lamp dark', '0'],
  ['hello two', 'picked nothing', 'the banner', 'note Ann', 'lamp dark', '0'],
  ['hello two', 'picked nothing', 'the banner', '', 'lamp dark', '0'],
  ['said hidden', 'picked nothing', 'lamp dark', '0'],
  ['said hidden', 'picked nothing', 'lamp lit', '1'],
  ['said hidden', 'picked nothing', 'lamp lit', '2'],
  ['said hidden', 'picked filled', 'lamp lit', '2', 'the picker'],
  ['hello two', 'picked filled', 'the banner', '', 'lamp lit', '2', 'the picker']
];
/** The control: the Banner never opens, the Lamp is never lit, the count never moves; Pick still draws the Picker. */
const CONTROL: Readings = BASE.map((_, i) => ['said nothing', 'picked nothing', 'lamp dark', '0', ...(i >= 7 ? ['the picker'] : [])]);

const desks = VARIANTS.map((v) => writeSignalDesk(v.edit));
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

  it('A3 nothing runs at load, under StrictMode\'s double mount', () => {
    expect(exported[0][0][0]).toEqual(['said nothing', 'picked nothing', 'lamp dark', '0']);
  });

  it('A4 a pulse from a click runs the chain inside: the States opens the root, the Set Variable reads the value input', () => {
    const [, show, change, wipe, hide] = exported[0][0];
    expect(show).toEqual(expect.arrayContaining(['hello one', 'the banner']));
    expect(change[0]).toBe('hello two');
    expect(wipe[3]).toBe('');
    expect(hide).not.toContain('the banner');
    expect(hide[0]).toBe('said hidden');
  });

  it('A5 a pulse from an instance\'s own signal output, passed on through a signal input: once per pulse', () => {
    const [, , , , , ask1, ask2] = exported[0][0];
    expect(ask1.slice(-2)).toEqual(['lamp lit', '1']);
    expect(ask2.slice(-2)).toEqual(['lamp lit', '2']);
  });

  it('A6 a pulse sent with the click that draws the component runs as it mounts', () => {
    expect(exported[0][0][7]).toEqual(['said hidden', 'picked filled', 'lamp lit', '2', 'the picker']);
  });

  it('A7 a Condition between the click and the pulse: the same readings', () => {
    expect(runtime[1][0]).toEqual(BASE);
    expect(exported[1][0]).toEqual(runtime[1][0]);
  });

  it('A8 the control: with no wire into a signal input, both arms read the load at every step', () => {
    expect(runtime[2][0]).toEqual(CONTROL);
    expect(exported[2][0]).toEqual(CONTROL);
  });
});

describe('§B what is emitted', () => {
  const banner = apps[0].files['src/components/Banner.tsx'];
  const relay = apps[0].files['src/components/Relay.tsx'];
  const home = apps[0].files['src/pages/Home.tsx'];

  it('B1 the signal input is the pair the parent passes, typed so', () => {
    expect(banner).toContain(`  show?: ${INPUT_PULSE_TS_TYPE};`);
    expect(banner).not.toContain('show?: () => void');
  });

  it('B2 the child runs its chain when the count sent passes the count taken, keyed on the count sent', () => {
    expect(banner).toContain(
      [
        '  useEffect(() => {',
        '    if (show === undefined || show.taken.current === show.sent) return;',
        '    show.taken.current = show.sent;',
        "    openOrClosed.goTo('open');",
        '    said.set(message);',
        '  }, [show?.sent]);'
      ].join('\n')
    );
  });

  it('B3 the parent counts, keeps the count taken in a ref, and passes both', () => {
    expect(home).toContain('const [bannerShowPulses, setBannerShowPulses] = useState<number>(0);');
    expect(home).toContain('const bannerShowTaken = useRef(0);');
    expect(home).toContain('show={{ sent: bannerShowPulses, taken: bannerShowTaken }}');
    expect(home).toContain("onClick={() => { msg.set('hello two'); setBannerShowPulses((v) => v + 1); }}");
  });

  it('B4 a signal input passed straight on is the child\'s own pulse to its child: an effect, a count, the pair', () => {
    expect(relay).toContain('setLampLightPulses((v) => v + 1);');
    expect(relay).toContain('light={{ sent: lampLightPulses, taken: lampLightTaken }}');
  });
});

describe('§C the plan', () => {
  it('C1 inside: every node a signal input drives is collapsed into the Component Inputs, nothing refused', () => {
    const plan = planOf(desks[0].dir, '/Components/Banner');
    expect(plan.dispositions['bnSay']).toEqual({ kind: 'collapsed', into: 'bnIn' });
    expect(plan.dispositions['bnHid']).toEqual({ kind: 'collapsed', into: 'bnIn' });
    expect(plan.dispositions['bnOpen']?.kind).toBe('collapsed');
    expect(plan.dispositions['bnField']).toEqual({ kind: 'static' });
    expect(plan.inputPulses.map((p) => p.port)).toEqual(['show', 'hide', 'wipe']);
    expect(plan.notes.filter((n) => n.includes('bnIn:'))).toEqual([]);
  });

  it('C2 outside: one count per wired port, the senders collapsed into their click', () => {
    const plan = planOf(desks[0].dir, '/Pages/Home');
    expect(plan.instancePulses.map((p) => `${p.nodeId}.${p.port}`).sort()).toEqual(['banner.hide', 'banner.show', 'banner.wipe', 'picker.fill', 'relay.ping']);
    expect(plan.dispositions['banner']).toEqual({ kind: 'static' });
  });

  it('C3 a sender the export does not run: the wire dropped and named, the instance still drawn, no count left behind', () => {
    const dir = writeSignalDesk((d) => {
      const home = d.components['Pages/Home'];
      home.nodes.push({ id: 'pickDone', type: 'Set Variable', label: 'Picked again', parameters: { name: 'picked', value: 'picked again' } });
      home.connections = home.connections.filter((c) => !(c.toId === 'picker' && c.toProperty === 'fill'));
      home.connections.push({ fromId: 'pickBtn', fromProperty: 'onClick', toId: 'pickDone', toProperty: 'do' });
      home.connections.push({ fromId: 'pickDone', fromProperty: 'done', toId: 'picker', toProperty: 'fill' });
    }).dir;
    const plan = planOf(dir, '/Pages/Home');
    expect(plan.notes).toContain('wire pickDone:done->picker:fill dropped: the trigger is not a rendered element event or a receiver');
    expect(plan.dispositions['picker']).toEqual({ kind: 'static' });
    expect(plan.instancePulses.map((p) => p.nodeId)).not.toContain('picker');
    expect(plan.stateVars.map((v) => v.name)).not.toContain('pickerFillPulses');
  });

  it('C4 a logic component\'s signal input is not pulsed: it draws nothing and has no file to run a chain in', () => {
    const dir = writeSignalDesk((d) => {
      d.components['Components/Quiet'] = {
        nodes: [
          { id: 'qtIn', type: 'Component Inputs', label: 'Inputs', parameters: {}, ports: [{ name: 'go', plug: 'output', type: 'signal' }], x: 700, y: 40 },
          { id: 'qtSet', type: 'Set Variable', label: 'Quiet', parameters: { name: 'said', value: 'quiet' }, x: 700, y: 120 }
        ],
        connections: [{ fromId: 'qtIn', fromProperty: 'go', toId: 'qtSet', toProperty: 'do' }]
      };
      const home = d.components['Pages/Home'];
      home.nodes.push({ id: 'quiet', type: '/Components/Quiet', label: 'Quiet', parent: 'shell', parameters: {}, x: 100, y: 1200 });
      home.nodes.find((n) => n.id === 'shell')!.children!.push('quiet');
      home.connections.push({ fromId: 'showBtn', fromProperty: 'onClick', toId: 'quiet', toProperty: 'go' });
    }).dir;
    const plan = planOf(dir, '/Pages/Home');
    expect(plan.instancePulses.map((p) => p.nodeId)).not.toContain('quiet');
    expect(plan.handlers['showBtn']?.['onClick']).toEqual([{ kind: 'state-set', name: 'bannerShowPulses', op: 'inc' }]);
  });
});

describe('§D the emitted apps typecheck', () => {
  it.each(VARIANTS.map((v, i) => [v.name, i] as const))('D %s', (_name, i) => {
    expect(typecheckEmittedApp(apps[i])).toEqual([]);
  });
});
