/**
 * GAM-015 (P78 D65) — a kit node reads a wired size as the size it was sent.
 *
 * Rocket School's header face asked for 40 px and drew 64. The kit read `Number(props.size)`, and a
 * units `inputProps` port does not hand the component a number: the bridge writes
 * `props[name] = value.value + value.unit`, so the component receives the CSS string `"40px"`.
 *
 * R15 (Richard, 2026-09-17): door (a). Nothing that runs changes. The shape is documented on
 * `ReactInputPropDefinition`, and the scaffold emits one reader, `readPx`, which accepts only that
 * shape.
 *
 * 🔴 Graded through the caller, not with hand-made props (§7): a kit definition handed to the real
 * `createNodeFromReactComponent`, placed in a real runtime graph, sized three ways (a wire, a typed
 * parameter, nothing), and the component rendered with real React from the props the bridge wrote.
 * The kit gate that fed `{value: 40}` straight into props is how this defect stayed green.
 */

/* eslint-env jest */

(globalThis as Record<string, any>).Noodl = { deployed: true, baseUrl: '/' };

import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import type { NodeModule } from '@noodl/types';

import { createCorpusGraph } from '../../noodl-runtime/test/corpus/graph-harness';

import { createNodeFromReactComponent, type ReactNodeDefinition } from '../src/react-component-node';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { readPx, scaffoldKitFiles } = require('@nodegx/kit-scaffold');

/**
 * The reader a kit author actually has: the one the scaffold wrote into their `index.js`, pulled out
 * of the generated file and evaluated, not the package export (which could agree with the spec while
 * the emitted copy did not).
 */
const emittedReadPx: (value: unknown) => number | undefined = (() => {
  const indexJs: string = scaffoldKitFiles({ name: 'Face Kit' }).files.find(
    (f: { path: string }) => f.path === 'index.js'
  ).contents;
  const found = /\n {2}var readPx = (function readPx\(value\) \{[\s\S]*?\n {2}\});\n/.exec(indexJs);
  if (!found) throw new Error('the scaffolded index.js defines no readPx');
  // eslint-disable-next-line no-new-func
  return new Function('return ' + found[1])();
})();

const PX = { name: 'number', units: ['px'], defaultUnit: 'px' };

type Reader = (props: Record<string, unknown>) => number;

/** Game-kit's Avatar before `padPx`: the read D65 found. */
const readWithNumber: Reader = (props) => {
  const n = Number(props.size);
  return Number.isFinite(n) ? n : 64;
};

/** The read the updated docs show, with the reader the scaffold emitted. */
const readAsDocumented: Reader = (props) => {
  const n = emittedReadPx(props.size);
  return n === undefined ? 64 : n;
};

/**
 * One minimal kit node: `size` has a default (64), `edge` has none (§7: a units port with no
 * default is not seeded with a unit, so a bare number lands somewhere else).
 */
function kitNode(read: Reader): ReactNodeDefinition {
  return {
    name: 'gam015.Face',
    getReactComponent: () =>
      function Face(props: Record<string, unknown>) {
        const size = read(props);
        return React.createElement('div', {
          style: { width: size, height: size },
          'data-size-type': typeof props.size,
          'data-size': String(props.size),
          'data-edge': String(props.edge)
        });
      },
    inputProps: {
      size: { type: PX, displayName: 'Size', group: 'Style', default: 64 },
      edge: { type: PX, displayName: 'Edge', group: 'Style' }
    }
  } as unknown as ReactNodeDefinition;
}

/** A Number node, as far as a wire needs: one number output. */
const NumberSource: NodeModule = {
  node: {
    name: 'gam015.Number',
    category: 'Data',
    initialize() {
      (this as any)._internal.value = 40;
    },
    outputs: {
      value: {
        type: 'number',
        getter() {
          return (this as any)._internal.value;
        }
      }
    },
    inputs: {}
  }
} as unknown as NodeModule;

/** A String source: a value that is not a size at all (AC4, FLD-004). */
const StringSource: NodeModule = {
  node: {
    name: 'gam015.String',
    category: 'Data',
    outputs: {
      value: {
        type: 'string',
        getter() {
          return 'tall';
        }
      }
    },
    inputs: {}
  }
} as unknown as NodeModule;

interface Drawn {
  prop: unknown;
  propType: string;
  width: number | null;
}

async function drive(read: Reader) {
  const definition = kitNode(read);
  const module = createNodeFromReactComponent(definition);
  const graph = await createCorpusGraph({
    modules: [module as never, NumberSource, StringSource],
    data: {
      components: [
        {
          name: '/root',
          nodes: [
            { id: 'number', type: 'gam015.Number' },
            { id: 'string', type: 'gam015.String' },
            { id: 'stringWired', type: 'gam015.Face' },
            { id: 'wired', type: 'gam015.Face' },
            { id: 'typed', type: 'gam015.Face', parameters: { size: 40 } },
            { id: 'unset', type: 'gam015.Face' },
            { id: 'edgeWired', type: 'gam015.Face' }
          ],
          connections: [
            { sourceId: 'number', sourcePort: 'value', targetId: 'wired', targetPort: 'size' },
            { sourceId: 'number', sourcePort: 'value', targetId: 'edgeWired', targetPort: 'edge' },
            { sourceId: 'string', sourcePort: 'value', targetId: 'stringWired', targetPort: 'size' }
          ]
        }
      ]
    } as never
  });
  await graph.settle(4);

  const Component = (definition.getReactComponent as () => React.ComponentType<any>)();
  const drawn = (id: string): Drawn => {
    const props = (graph.node(id) as unknown as { props: Record<string, unknown> }).props;
    const markup = renderToStaticMarkup(React.createElement(Component, props));
    const width = markup.match(/width:(\d+)px/);
    return { prop: props.size, propType: typeof props.size, width: width ? Number(width[1]) : null };
  };
  const edge = (graph.node('edgeWired') as unknown as { props: Record<string, unknown> }).props.edge;

  return { wired: drawn('wired'), typed: drawn('typed'), unset: drawn('unset'), stringWired: drawn('stringWired'), edge, graph };
}

describe('GAM-015 AC1: what a units inputProps port hands the component', () => {
  test('the bridge hands a CSS string, "40px", for a wired 40 and for a typed 40', async () => {
    const r = await drive(readWithNumber);
    expect({ wired: r.wired.prop, typed: r.typed.prop, unset: r.unset.prop }).toEqual({
      wired: '40px',
      typed: '40px',
      unset: '64px'
    });
  });

  test('RED shape: a kit that reads it with Number() draws its default, 64, for both', async () => {
    const r = await drive(readWithNumber);
    expect({ wired: r.wired.width, typed: r.typed.width, unset: r.unset.width }).toEqual({
      wired: 64,
      typed: 64,
      unset: 64
    });
  });

  test('a port with no default: a wired bare number is not merged into a unit and is refused (FLD-004)', async () => {
    const r = await drive(readWithNumber);
    expect(r.edge).toBeUndefined();
    expect(r.graph.editorConnection.warnings.map((w) => w.key)).toEqual(
      expect.arrayContaining([expect.stringContaining('dimensions/not-a-dimension')])
    );
  });
});

describe('GAM-015 AC3: a kit written as the docs show draws what it was sent', () => {
  test('wired 40 draws 40, typed 40 draws 40, and unset draws its default 64 (known-firing)', async () => {
    const r = await drive(readAsDocumented);
    expect({ wired: r.wired.width, typed: r.typed.width, unset: r.unset.width }).toEqual({
      wired: 40,
      typed: 40,
      unset: 64
    });
  });

  test('AC4, same run: a String wired into Size keeps the default and raises dimensions/not-a-dimension (FLD-004)', async () => {
    const r = await drive(readAsDocumented);
    expect({ wired: r.wired.width, string: r.stringWired }).toEqual({
      wired: 40,
      string: { prop: '64px', propType: 'string', width: 64 }
    });
    expect(
      r.graph.editorConnection.warnings.filter((w) => w.nodeId === 'stringWired').map((w) => w.key)
    ).toEqual([expect.stringContaining('dimensions/not-a-dimension')]);
  });
});

describe('GAM-015: readPx accepts only the shape the bridge delivers', () => {
  test.each([
    ['40px', 40],
    ['12.5px', 12.5],
    ['-4px', -4],
    ['0px', 0]
  ])('%j reads %j', (value, expected) => {
    expect({ package: readPx(value), emitted: emittedReadPx(value) }).toEqual({ package: expected, emitted: expected });
  });

  test.each([
    ['a token', 'var(--space-4)'],
    ['a percentage', '40%'],
    ['a bare number (never delivered)', 40],
    ['a unit-less numeric string', '40'],
    ['the setter shape (never delivered)', { value: 40, unit: 'px' }],
    ['an unset port', undefined],
    ['junk', 'tallpx'],
    ['an empty magnitude', 'px']
  ])('%s reads undefined', (_label, value) => {
    expect({ package: readPx(value), emitted: emittedReadPx(value) }).toEqual({
      package: undefined,
      emitted: undefined
    });
  });
});
