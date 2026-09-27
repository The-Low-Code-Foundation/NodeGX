/**
 * GAM-006 — a colour switched by a States node reaches the screen, with transitions on.
 *
 * P78 D49, seen in a browser by TPL-006 on 2026-09-12: the string flips and a token colour stays
 * put, at every sample for 1.5 s, while `useTransitions` is on (the default). P18 EXP-011 §49.3
 * measured the mechanism headlessly (`nodegx-export/tests/animation-pair.test.ts` A5): `onStart`
 * parses the colour as hex, so `var(--primary)` becomes `[10, NaN, NaN, NaN]`, and the last frame
 * writes `rgbaToHex(targetValues)`, `#0aNaNNaNNaN`, which a browser rejects.
 *
 * This file measures it on the node itself, in a real graph, with the viewer's own `Styles` on
 * `context.styles` (P18's row used a stub). One States node carries every arm, so the known-firing
 * string sits beside the colour that does not arrive:
 *
 * | value | type | A | B | why it is here |
 * |---|---|---|---|---|
 * | `label` | string | `calm` | `hit` | known-firing: strings never tween |
 * | `tint` | color | `var(--muted)` | `var(--primary)` | the defect |
 * | `hex` | color | `#334455` | `#8a4f16` | AC1: does a hex colour arrive? (§7: it grades nothing on its own) |
 * | `named` | color | `Grey` | `Primary` | §7: a legacy colour style must keep resolving |
 * | `size` | number | `10` | `40` | AC1: does a number arrive? |
 *
 * The clock is `graph.frame(16)`, which pumps `timerScheduler`. The default transition is 300 ms.
 */

/* eslint-env jest */

import type { NodeInstance, NodeModule } from '@noodl/types';

import { createCorpusGraph, type CorpusGraph } from '../../noodl-runtime/test/corpus/graph-harness';

import StatesModule from '../src/nodes/std-library/states';
import Styles from '../src/styles';

interface SwitcherInstance extends NodeInstance {
  goToB(): void;
}

const SwitcherModule: NodeModule = {
  node: {
    name: 'gam006.Switcher',
    category: 'Test',
    outputs: { toB: { type: 'signal' } },
    methods: {
      goToB(this: NodeInstance) {
        this.sendSignalOnOutput('toB');
      }
    }
  }
};

const VALUES = ['label', 'tint', 'hex', 'named', 'size'] as const;

const AUTHORED_B: Record<(typeof VALUES)[number], unknown> = {
  label: 'hit',
  tint: 'var(--primary)',
  hex: '#8a4f16',
  named: 'Primary',
  size: 40
};

/** The legacy colour styles a project may carry, which `resolveColor` looks names up in. */
const COLOR_STYLES = { Grey: '#777777', Primary: '#112233' };

async function statesGraph(useTransitions?: boolean): Promise<CorpusGraph> {
  const parameters: Record<string, unknown> = {
    states: 'A,B',
    values: VALUES.join(','),
    'type-label': 'string',
    'type-tint': 'color',
    'type-hex': 'color',
    'type-named': 'color',
    'type-size': 'number',
    'value-A-label': 'calm',
    'value-B-label': 'hit',
    'value-A-tint': 'var(--muted)',
    'value-B-tint': 'var(--primary)',
    'value-A-hex': '#334455',
    'value-B-hex': '#8a4f16',
    'value-A-named': 'Grey',
    'value-B-named': 'Primary',
    'value-A-size': 10,
    'value-B-size': 40
  };
  if (useTransitions !== undefined) parameters.useTransitions = useTransitions;

  const graph = await createCorpusGraph({
    modules: [StatesModule as unknown as NodeModule, SwitcherModule],
    data: {
      components: [
        {
          name: '/root',
          nodes: [
            { id: 'switcher', type: 'gam006.Switcher' },
            { id: 'states', type: 'States', parameters }
          ],
          connections: [{ sourceId: 'switcher', sourcePort: 'toB', targetId: 'states', targetPort: 'to-B' }]
        }
      ]
    } as never
  });

  // The viewer's own colour resolver (`viewer.jsx:144`), carrying two legacy colour styles.
  const styles = new Styles({
    graphModel: graph.graphModel as never,
    nodeRegister: graph.context.nodeRegister as never,
    getNodeScope: () => graph.root.nodeScope
  } as never);
  styles.setStyles({ colors: COLOR_STYLES });
  (graph.context as unknown as { styles: unknown }).styles = styles;

  // Settle into A, so `valuesAreInitialised` is true and B takes the transition path.
  for (let i = 0; i < 40; i++) graph.frame(16);
  return graph;
}

function read(graph: CorpusGraph): Record<string, unknown> {
  const node = graph.node('states');
  return Object.fromEntries(VALUES.map((v) => [v, node.getOutput(v).value]));
}

/** Goes to B and samples every value at the given milliseconds after the request. */
async function sampleToB(graph: CorpusGraph, at: number[]): Promise<Array<[number, Record<string, unknown>]>> {
  graph.node<SwitcherInstance>('switcher').goToB();
  const samples: Array<[number, Record<string, unknown>]> = [];
  let now = 0;
  graph.frame(0);
  for (const target of at) {
    while (now < target) {
      graph.frame(16);
      now += 16;
    }
    samples.push([now, read(graph)]);
  }
  return samples;
}

const SAMPLE_MS = [0, 64, 160, 320, 704, 1504];

describe('GAM-006 AC1 — a States value switched with transitions on (the default)', () => {
  test('the readings, recorded whatever they are', async () => {
    const graph = await statesGraph();
    console.log('GAM-006 settled in A:', JSON.stringify(read(graph)));
    const samples = await sampleToB(graph, SAMPLE_MS);
    for (const [ms, values] of samples) console.log(`GAM-006 transitions on, ${ms} ms:`, JSON.stringify(values));
    expect(samples.length).toBe(SAMPLE_MS.length);
  });

  test('🟢 known-firing: the string flips', async () => {
    const graph = await statesGraph();
    const samples = await sampleToB(graph, SAMPLE_MS);
    expect(samples[samples.length - 1][1].label).toBe('hit');
  });

  test.each(['tint', 'hex', 'named', 'size'] as const)('🔴 %s ends on the value state B names', async (value) => {
    const graph = await statesGraph();
    const samples = await sampleToB(graph, SAMPLE_MS);
    expect(samples[samples.length - 1][1][value]).toBe(AUTHORED_B[value]);
  });
});

describe('GAM-006 — a colour inside its transition delay (found in session 3)', () => {
  /** B's `hex` and `tint` wait 200 ms, then tween over 300 ms. */
  async function delayedGraph(): Promise<CorpusGraph> {
    const graph = await statesGraph();
    // ⚠️ Registered first. The first version of this row called `setInputValue` alone, the input did
    // not exist yet, and `hex` was already moving at 96 ms: the delay never took and the row graded
    // nothing.
    const states = graph.node('states') as unknown as {
      registerInputIfNeeded(name: string): void;
      setInputValue(name: string, value: unknown): void;
    };
    for (const value of ['hex', 'tint']) {
      states.registerInputIfNeeded(`transition-B-${value}`);
      states.setInputValue(`transition-B-${value}`, { curve: [0, 0, 0.58, 1], dur: 300, delay: 200 });
    }
    return graph;
  }

  test('the readings, recorded whatever they are', async () => {
    const samples = await sampleToB(await delayedGraph(), [0, 96, 192, 320, 704]);
    for (const [ms, values] of samples) {
      for (const value of ['hex', 'tint']) {
        const read = values[value];
        console.log(`GAM-006 delayed ${value}, ${ms} ms:`, JSON.stringify(read), Array.isArray(read) ? 'ARRAY' : typeof read);
      }
    }
    expect(samples.length).toBe(5);
  });

  // 🔴 Measured in session 3: `onRunning`'s `ms < c.delay` branch published `this.startValues[v]`,
  // which for a colour `onStart` has replaced with the parsed RGBA array. `hex` read
  // `[51,68,85,255]` at 0, 96 and 192 ms, a value no style sink accepts.
  test.each([
    ['hex', '#334455'],
    ['tint', 'var(--muted)']
  ] as const)('🔴 %s holds the colour state A left on screen until its delay ends', async (value, fromA) => {
    const samples = await sampleToB(await delayedGraph(), [0, 96, 192]);
    expect(samples.map(([, values]) => values[value])).toEqual([fromA, fromA, fromA]);
  });

  test('🟢 known-firing: past the delay both colours still arrive', async () => {
    const samples = await sampleToB(await delayedGraph(), [320, 704]);
    expect(typeof samples[0][1].hex).toBe('string');
    expect(samples[0][1].hex).not.toBe('#334455');
    expect(samples[1][1]).toMatchObject({ hex: '#8a4f16', tint: 'var(--primary)' });
  });
});

/** Stands in for a page whose stylesheet defines two tokens, and optionally for `CSS.supports`. */
const globals = globalThis as unknown as Record<string, unknown>;
const TOKENS: Record<string, string> = { '--muted': '#334455', '--primary': '#8a4f16' };
function installPage(supports?: (property: string, value: string) => boolean) {
  globals.document = { documentElement: {} };
  globals.getComputedStyle = () => ({ getPropertyValue: (name: string) => TOKENS[name] ?? '' });
  if (supports) globals.CSS = { supports };
}
function removePage() {
  delete globals.document;
  delete globals.getComputedStyle;
  delete globals.CSS;
}

describe('GAM-006 (a) — a token colour is read before the tween', () => {
  afterEach(removePage);

  // 🔴 Before (a): every frame between was `#0aNaNNaNNaN`, so a token held and then jumped.
  test('🔴 with a page, a token glides through real colours and lands on the token', async () => {
    const graph = await statesGraph();
    installPage();
    const samples = await sampleToB(graph, [0, 64, 160, 320]);
    const between = [samples[1][1].tint, samples[2][1].tint];
    for (const value of between) expect(value).toMatch(/^#[0-9a-f]{8}$/);
    expect(between[1]).not.toBe('#334455ff');
    expect(between[1]).not.toBe('#8a4f16ff');
    expect(new Set(between).size).toBe(2);
    expect(samples[3][1].tint).toBe('var(--primary)');
  });

  // 🔴 Before (a): the same NaN hex. With no page a token cannot be read at all, so it holds.
  test('🔴 with no page, a token holds the colour on screen, never a NaN hex, and lands', async () => {
    const samples = await sampleToB(await statesGraph(), [0, 64, 160, 320]);
    expect(samples.slice(0, 3).map(([, values]) => values.tint)).toEqual(['var(--muted)', 'var(--muted)', 'var(--muted)']);
    expect(samples[3][1].tint).toBe('var(--primary)');
  });
});

describe('GAM-006 R7 — a colour is reported only when the browser would also reject it', () => {
  afterEach(removePage);

  const REJECTS = (_property: string, value: string) => value !== 'notacolour';

  test.each([
    ['🟢 known-firing: a value CSS rejects is reported once', 'notacolour', REJECTS, 1],
    ['a named colour the tween cannot read is not', 'red', REJECTS, 0],
    ['a token the page does not define is not', 'var(--nope)', REJECTS, 0],
    ['with no CSS to ask, even a rejected value is not', 'notacolour', undefined, 0]
  ] as const)('%s', async (_name, colour, supports, expected) => {
    const graph = await statesGraph();
    const states = graph.node('states') as unknown as {
      setInputValue(name: string, value: unknown): void;
      raiseRuntimeError: (code: string, message: string, detail?: unknown) => void;
    };
    const raised: Array<[string, string]> = [];
    states.raiseRuntimeError = (code, message) => raised.push([code, message]);
    states.setInputValue('value-B-tint', colour);
    installPage(supports);
    const samples = await sampleToB(graph, [0, 160, 320]);
    const reports = raised.filter(([code]) => code === 'states/unreadable-color');
    expect(reports.length).toBe(expected);
    if (expected) expect(reports[0][1]).toContain('"notacolour"');
    // Reported or not, the value lands where the state says.
    expect(samples[2][1].tint).toBe(colour);
  });
});

describe('GAM-006 AC1 — the same node with Use Transitions off (D49’s other arm)', () => {
  test('🟢 every value lands on the value state B names', async () => {
    const graph = await statesGraph(false);
    const samples = await sampleToB(graph, [0, 64]);
    for (const [ms, values] of samples) console.log(`GAM-006 transitions off, ${ms} ms:`, JSON.stringify(values));
    expect(samples[samples.length - 1][1]).toEqual(AUTHORED_B);
  });
});
