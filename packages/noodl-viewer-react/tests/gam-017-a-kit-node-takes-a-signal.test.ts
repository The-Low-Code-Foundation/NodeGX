/**
 * GAM-017 (P78 D70) — a kit React node takes a signal the way a built-in node does.
 *
 * Rocket School's Race Track wanted a `Burst` signal. An `inputProps` entry typed `'signal'` logged
 * "Signals not supported as a react prop" when the kit registered, and was registered anyway with a
 * no-op setter: it showed in the editor, took a wire, and did nothing. So the burst became a number.
 *
 * R17 (Richard, 2026-09-17, s1): the bridge makes a declared signal prop work. Each pulse adds one to
 * the prop and re-renders, so the component reacts to the prop changing (`useEffect(…, [props.play])`).
 * The prop starts at 0, which reads as "not pulsed yet".
 *
 * 🔴 The old log fired at registration, not on a wire (§7): a test that asserts "no log" passes with a
 * dead port. Every row here asserts the component's reaction, beside a control that is known to fire:
 * the `inputs` + `valueChangedToTrue` route a built-in (Checkbox, Video, Text Input) already uses.
 *
 * ⚠️ `valueChangedToTrue` runs on a false-to-true edge, so every pulse is sent in its own frame.
 */

/* eslint-env jest */

(globalThis as Record<string, any>).Noodl = { deployed: true, baseUrl: '/' };

import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import type { NodeModule } from '@noodl/types';

import { createCorpusGraph } from '../../noodl-runtime/test/corpus/graph-harness';

import { createNodeFromReactComponent, type ReactNodeDefinition } from '../src/react-component-node';

/** A component that stamps the count it was handed, so a render is what gets graded. */
function Burst(props: Record<string, unknown>) {
  return React.createElement('div', { 'data-play': String(props.play), 'data-nested': String((props.opts as any)?.go) });
}

const readStamp = (markup: string, attr: string) => (markup.match(new RegExp(`${attr}="([^"]*)"`)) || [])[1];

/** (i) The shape D70 used: a signal declared as a prop. Also one nested under a `propPath`. */
const signalProp = (): ReactNodeDefinition =>
  ({
    name: 'gam017.SignalProp',
    getReactComponent: () => Burst,
    inputProps: {
      play: { type: 'signal', displayName: 'Play', group: 'Actions' },
      go: { type: 'signal', displayName: 'Go', group: 'Actions', propPath: 'opts' }
    }
  }) as unknown as ReactNodeDefinition;

/** (ii) The control: `inputs` with `valueChangedToTrue`, bumping a prop and re-rendering by hand. */
const inputsRoute = (): ReactNodeDefinition =>
  ({
    name: 'gam017.InputsRoute',
    getReactComponent: () => Burst,
    initialize() {
      (this as any).props.play = 0;
    },
    inputs: {
      play: {
        displayName: 'Play',
        group: 'Actions',
        valueChangedToTrue() {
          (this as any).props.play += 1;
          (this as any).forceUpdate();
        }
      }
    }
  }) as unknown as ReactNodeDefinition;

/** Something with a signal output, standing in for a Button's Click. */
const Pulser: NodeModule = {
  node: {
    name: 'gam017.Pulser',
    category: 'Events',
    outputs: { fired: { type: 'signal' } },
    inputs: {}
  }
} as unknown as NodeModule;

async function build() {
  const errors: string[] = [];
  const spy = jest.spyOn(console, 'error').mockImplementation((...args: unknown[]) => {
    errors.push(args.map(String).join(' '));
  });
  const signalDef = signalProp();
  const inputsDef = inputsRoute();
  let modules;
  try {
    modules = [createNodeFromReactComponent(signalDef), createNodeFromReactComponent(inputsDef)];
  } finally {
    spy.mockRestore();
  }

  const graph = await createCorpusGraph({
    modules: [...(modules as never[]), Pulser],
    data: {
      components: [
        {
          name: '/root',
          nodes: [
            { id: 'click', type: 'gam017.Pulser' },
            { id: 'prop', type: 'gam017.SignalProp' },
            { id: 'unwired', type: 'gam017.SignalProp' },
            { id: 'control', type: 'gam017.InputsRoute' }
          ],
          connections: [
            { sourceId: 'click', sourcePort: 'fired', targetId: 'prop', targetPort: 'play' },
            { sourceId: 'click', sourcePort: 'fired', targetId: 'prop', targetPort: 'go' },
            { sourceId: 'click', sourcePort: 'fired', targetId: 'control', targetPort: 'play' }
          ]
        }
      ]
    } as never
  });
  await graph.settle(4);

  const drawn = (id: string, def: ReactNodeDefinition) => {
    const props = (graph.node(id) as unknown as { props: Record<string, unknown> }).props;
    const markup = renderToStaticMarkup(
      React.createElement((def.getReactComponent as () => React.ComponentType<any>)(), props)
    );
    return { play: readStamp(markup, 'data-play'), go: readStamp(markup, 'data-nested') };
  };

  const pulse = async (times: number) => {
    for (let i = 0; i < times; i++) {
      (graph.node('click') as unknown as { sendSignalOnOutput(name: string): void }).sendSignalOnOutput('fired');
      await graph.settle(4);
    }
  };

  return {
    graph,
    errors,
    pulse,
    prop: () => drawn('prop', signalDef),
    unwired: () => drawn('unwired', signalDef),
    control: () => drawn('control', inputsDef),
    signalDef
  };
}

describe('GAM-017 AC1/AC2: a signal declared as a kit prop reaches the component', () => {
  test('control (known-firing): the inputs + valueChangedToTrue route counts two separate pulses', async () => {
    const r = await build();
    expect(r.control().play).toBe('0');
    await r.pulse(2);
    expect(r.control().play).toBe('2');
  });

  test('a signal prop starts at 0 and counts each pulse, beside the control', async () => {
    const r = await build();
    expect(r.prop()).toEqual({ play: '0', go: '0' });
    await r.pulse(1);
    expect({ prop: r.prop(), control: r.control().play }).toEqual({ prop: { play: '1', go: '1' }, control: '1' });
    await r.pulse(1);
    expect({ prop: r.prop(), control: r.control().play }).toEqual({ prop: { play: '2', go: '2' }, control: '2' });
  });

  test('an unwired signal prop stays at 0 while the wired one counts', async () => {
    const r = await build();
    await r.pulse(2);
    expect({ wired: r.prop().play, unwired: r.unwired().play }).toEqual({ wired: '2', unwired: '0' });
  });

  test('a pulse re-renders the node: forceUpdate is asked for', async () => {
    const r = await build();
    const node = r.graph.node('prop') as unknown as { forceUpdate(): void };
    const forceUpdate = jest.spyOn(node, 'forceUpdate');
    await r.pulse(1);
    expect(forceUpdate).toHaveBeenCalled();
  });

  test('registration logs nothing, and the port is a signal in the editor', async () => {
    const r = await build();
    expect(r.errors.filter((e) => e.includes('Signals not supported'))).toEqual([]);
    const module = createNodeFromReactComponent(signalProp()) as unknown as { node: { inputs: Record<string, any> } };
    expect(typeof module.node.inputs.play.valueChangedToTrue).toBe('function');
  });
});
