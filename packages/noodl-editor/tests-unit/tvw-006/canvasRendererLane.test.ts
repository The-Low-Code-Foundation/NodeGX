/**
 * TVW-006 AC4 — the order `CanvasRenderer` paints in, recorded off the real renderer.
 *
 * AC4 asks for "a spec that records the draw calls" and says to fall back to pixels if the
 * CANVAS-MODERNISATION decomposition gives no seam. It does: PLAT-001 extracted the frame into
 * `CanvasRenderer.paint(ctx, frame)`, which takes a plain `FrameState` and a 2D context. So the
 * context is a RECORDER and the assertions are about what was called, in what order, with what.
 *
 * 🔴 **`NodeGraphEditorNode` is mocked, and it has to be.** Importing it for real pulls in
 * `AiAssistantModel` → `@noodl-contexts/…`, an alias jest does not resolve, and the suite reports
 * `Tests: 0 total` — a suite that grades nothing while looking green
 * ([[tests-0-total-can-mean-the-wrong-directory]]). The real module is never executed: only the two
 * constants the renderer reads off it are stood in for, and both are checked against the source
 * below so the stand-in cannot drift.
 *
 * ⚠️ This spec grades ORDER and GEOMETRY. It cannot grade colour — the tokens resolve off the live
 * document — so both themes are AC5's photographs, not this file's.
 */

jest.mock('../../src/editor/src/views/nodegrapheditor/NodeGraphEditorNode', () => ({
  NodeGraphEditorNode: {
    // Mirrors `NodeGraphEditorNode.ts:16-18`. Asserted against the source in the first test.
    size: { width: 150, height: 36 },
    childMargin: 20,
    childSpacing: 10
  }
}));

/**
 * 🔴 The painter is mocked so `setBaseAlpha` can be SPIED ON. It is not decoration: the renderer
 * setting `ctx.globalAlpha` dims only the first thing a root draws, because the real painter
 * resets the alpha to "opaque" at three points while recursing into children. Declaring the
 * baseline is the whole fix, and this spy is the only thing standing between it and a silent
 * regression — the recording context cannot see it, since it stubs `node.paint`.
 */
jest.mock('../../src/editor/src/views/nodegrapheditor/NodeGraphEditorNodePainter', () => ({
  setBaseAlpha: jest.fn(),
  normalAlpha: () => 1,
  scaledAlpha: (a: number) => a
}));

jest.mock('../../src/editor/src/views/nodegrapheditor/canvas/CanvasTheme', () => ({
  CanvasFonts: { portLabel: '10.5px mono' },
  CanvasTheme: {
    instance: {
      colors: {
        categoryVisual: '#5ca9ff',
        hierarchyLine: '#494656',
        cardSubText: '#c4cedb',
        insertIndicator: '#4da3ff',
        multiselect: '#7d8a98',
        multiselectBox: '#dde4ec'
      },
      // No grid at the zooms these tests use would hide the ordering question, so the pattern is
      // always present and the grid always paints.
      gridPattern: () => 'grid-pattern'
    }
  }
}));

import * as fs from 'fs';
import * as path from 'path';

import { CanvasRenderer, type FrameState } from '../../src/editor/src/views/nodegrapheditor/canvas/CanvasRenderer';
import { setBaseAlpha } from '../../src/editor/src/views/nodegrapheditor/NodeGraphEditorNodePainter';
import { StructureLane, type LaneRoot } from '../../src/editor/src/views/nodegrapheditor/canvas/structureLane';

type Call = { op: string; args: unknown[] };

/** A 2D context that remembers everything, in order. */
function recorder() {
  const calls: Call[] = [];
  const state: Record<string, unknown> = {};
  const record =
    (op: string) =>
    (...args: unknown[]) => {
      calls.push({ op, args });
    };

  const ctx: Record<string, unknown> = {
    calls,
    save: record('save'),
    restore: record('restore'),
    scale: record('scale'),
    translate: record('translate'),
    fillRect: record('fillRect'),
    beginPath: record('beginPath'),
    rect: record('rect'),
    roundRect: record('roundRect'),
    fill: record('fill'),
    stroke: record('stroke'),
    moveTo: record('moveTo'),
    lineTo: record('lineTo'),
    setLineDash: record('setLineDash'),
    fillText: record('fillText'),
    measureText: () => ({ width: 40 })
  };

  // Style setters are properties, not methods, so they are recorded through accessors — otherwise
  // the alpha assertions below would be reading the LAST value rather than the one in force at the
  // moment of a draw.
  for (const prop of ['fillStyle', 'strokeStyle', 'lineWidth', 'globalAlpha', 'font', 'textBaseline']) {
    Object.defineProperty(ctx, prop, {
      get: () => state[prop],
      set: (value) => {
        state[prop] = value;
        calls.push({ op: `set:${prop}`, args: [value] });
      }
    });
  }

  return ctx as unknown as CanvasRenderingContext2D & { calls: Call[] };
}

/** A root as the renderer sees it: it paints itself and remembers the alpha it was painted at. */
function fakeRoot(id: string, x: number, y: number, width: number, height: number) {
  const node: TSFixme = {
    id,
    x,
    y,
    global: { x, y },
    nodeSize: { width: 150, height: 36 },
    measuredSize: { width, height },
    children: [],
    parent: undefined,
    paint: (ctx: TSFixme) => {
      ctx.calls.push({ op: 'paintNode', args: [id, ctx.globalAlpha] });
    }
  };
  return node;
}

function fakeConnection(id: string, fromNode: TSFixme, toNode: TSFixme) {
  return {
    id,
    fromNode,
    toNode,
    isHighlighted: () => false,
    paint: (ctx: TSFixme) => {
      ctx.calls.push({ op: 'paintWire', args: [id, ctx.globalAlpha] });
    }
  } as TSFixme;
}

const PAGE = fakeRoot('page', 100, 100, 150, 400);
const QUERY = fakeRoot('query', 400, 120, 150, 60);

function laneRootsFor(...specs: Array<[TSFixme, boolean]>): LaneRoot[] {
  return specs.map(([node, isVisual]) => ({
    id: node.id,
    x: node.x,
    y: node.y,
    width: node.measuredSize.width,
    height: node.measuredSize.height,
    isVisual
  }));
}

function frame(overrides: Partial<FrameState> = {}): FrameState {
  return {
    panAndScale: { x: 0, y: 0, scale: 1 },
    canvasWidth: 2000,
    canvasHeight: 1200,
    ratio: 1,
    roots: [PAGE, QUERY],
    connections: [],
    laneRoots: laneRootsFor([PAGE, true], [QUERY, false]),
    laneFilter: 'all',
    ...overrides
  } as FrameState;
}

const render = (f: FrameState) => {
  const ctx = recorder();
  new CanvasRenderer().paint(ctx, f);
  return ctx.calls;
};

beforeEach(() => {
  (setBaseAlpha as jest.Mock).mockClear();
});

const indexOf = (calls: Call[], pred: (c: Call) => boolean) => calls.findIndex(pred);

/** The `globalAlpha` in force at a given point in the recording — the last one SET before it. */
function alphaInForceAt(calls: Call[], index: number): number {
  let alpha = 1;
  for (let i = 0; i < index; i++) {
    if (calls[i].op === 'set:globalAlpha') alpha = calls[i].args[0] as number;
  }
  return alpha;
}

describe('the stand-in constants match the source', () => {
  it('has not drifted from NodeGraphEditorNode', () => {
    // The mock exists to dodge an unresolvable import, not to invent geometry. If someone changes
    // the node's size or spacing, this spec fails rather than quietly grading yesterday's numbers.
    const source = fs.readFileSync(
      path.join(__dirname, '../../src/editor/src/views/nodegrapheditor/NodeGraphEditorNode.ts'),
      'utf8'
    );

    expect(source).toContain('public static readonly size = { width: 150, height: 36 };');
    expect(source).toContain('public static readonly childMargin = 20;');
    expect(source).toContain('public static readonly childSpacing = 10;');
  });
});

describe('AC4 — the paint order', () => {
  it('draws the lane after the ground grid and before the hierarchy spine', () => {
    const page = fakeRoot('page', 100, 100, 150, 400);
    page.children = [fakeRoot('child', 120, 150, 150, 36)];
    const calls = render(frame({ roots: [page], laneRoots: laneRootsFor([page, true]) }));

    const grid = indexOf(calls, (c) => c.op === 'fillRect');
    const laneFill = indexOf(calls, (c) => c.op === 'fill');
    const spine = indexOf(calls, (c) => c.op === 'moveTo');

    expect(grid).toBeGreaterThanOrEqual(0);
    expect(laneFill).toBeGreaterThan(grid);
    expect(spine).toBeGreaterThan(laneFill);
  });

  it('draws the lane before the wires and the nodes, so both cross OVER it', () => {
    const calls = render(frame({ connections: [fakeConnection('w', QUERY, PAGE)] }));

    const laneStroke = indexOf(calls, (c) => c.op === 'stroke');
    const wire = indexOf(calls, (c) => c.op === 'paintWire');
    const node = indexOf(calls, (c) => c.op === 'paintNode');

    expect(laneStroke).toBeLessThan(wire);
    expect(laneStroke).toBeLessThan(node);
  });

  it('fills the wash before it strokes the outline, so the stroke is never washed over', () => {
    const calls = render(frame());

    expect(indexOf(calls, (c) => c.op === 'fill')).toBeLessThan(indexOf(calls, (c) => c.op === 'stroke'));
  });
});

describe('AC2 — the rectangle the renderer actually draws', () => {
  it('is the measured box plus padding, with the eyebrow on top', () => {
    const calls = render(frame());
    const outline = calls.filter((c) => c.op === 'roundRect');

    // One lane: the Page. The Query is a logic root and gets none.
    expect(outline).toHaveLength(2); // wash + stroke trace the same path
    expect(outline[0].args.slice(0, 4)).toEqual([100 - 12, 100 - 12 - 22, 150 + 24, 400 + 24 + 22]);
    expect(outline[0].args).toEqual(outline[1].args);
  });

  it('moves by the same delta when the root moves — AC1’s drag, at the draw call', () => {
    const before = render(frame()).find((c) => c.op === 'roundRect');
    const moved = fakeRoot('page', 100 + 200, 100 + 100, 150, 400);
    const after = render(
      frame({ roots: [moved, QUERY], laneRoots: laneRootsFor([moved, true], [QUERY, false]) })
    ).find((c) => c.op === 'roundRect');

    expect((after.args[0] as number) - (before.args[0] as number)).toBe(200);
    expect((after.args[1] as number) - (before.args[1] as number)).toBe(100);
    expect(after.args[2]).toBe(before.args[2]);
    expect(after.args[3]).toBe(before.args[3]);
  });

  it('draws the same rectangle at 50% zoom — the lane is in graph units, not screen units', () => {
    // The context is scaled once at the top of `paint`, so the numbers handed to `roundRect` must
    // not move with the zoom. If they did, the lane would drift off its stack as you zoomed.
    const at100 = render(frame()).find((c) => c.op === 'roundRect');
    const at50 = render(frame({ panAndScale: { x: 0, y: 0, scale: 0.5 } })).find((c) => c.op === 'roundRect');

    expect(at50.args.slice(0, 4)).toEqual(at100.args.slice(0, 4));
  });

  it('thickens the stroke at 50% zoom so it still reads as one pixel', () => {
    const calls = render(frame({ panAndScale: { x: 0, y: 0, scale: 0.5 } }));
    const width = calls.filter((c) => c.op === 'set:lineWidth').map((c) => c.args[0]);

    expect(width).toContain(2);
  });

  it('draws THREE rectangles for a three-root component and none for the logic root', () => {
    const a = fakeRoot('a', 0, 0, 150, 200);
    const b = fakeRoot('b', 400, 0, 150, 200);
    const c = fakeRoot('c', 800, 0, 150, 200);
    const logic = fakeRoot('logic', 1200, 0, 150, 60);
    const calls = render(
      frame({
        roots: [a, b, c, logic],
        laneRoots: laneRootsFor([a, true], [b, true], [c, true], [logic, false])
      })
    );

    const xs = calls.filter((call) => call.op === 'roundRect').map((call) => call.args[0]);

    // Two traces each (wash + stroke), three lanes, and nothing at the logic root's x.
    expect(xs).toEqual([-12, -12, 388, 388, 788, 788]);
  });
});

describe('the eyebrow', () => {
  it('writes STRUCTURE inside the space the lane added above the stack', () => {
    const calls = render(frame());
    const text = calls.find((c) => c.op === 'fillText');

    expect(text.args[0]).toBe('STRUCTURE');
    // Inside the lane horizontally, and within the 22px band above the stack vertically.
    expect(text.args[1]).toBe(100 - 12 + StructureLane.padding);
    expect(text.args[2] as number).toBeLessThan(100);
    expect(text.args[2] as number).toBeGreaterThan(100 - 12 - 22);
  });

  it('hides below 50% zoom and the lane keeps drawing', () => {
    const calls = render(frame({ panAndScale: { x: 0, y: 0, scale: 0.49 } }));

    expect(calls.some((c) => c.op === 'fillText')).toBe(false);
    expect(calls.some((c) => c.op === 'roundRect')).toBe(true);
  });

  it('says LOGIC ONLY once, and draws no lane, when nothing in the component draws', () => {
    const calls = render(
      frame({ roots: [QUERY], laneRoots: laneRootsFor([QUERY, false]) })
    );
    const text = calls.filter((c) => c.op === 'fillText');

    expect(text).toHaveLength(1);
    expect(text[0].args[0]).toBe(StructureLane.logicOnlyLabel);
    expect(calls.some((c) => c.op === 'roundRect')).toBe(false);
  });
});

describe('AC3 — the filter dims what it should, and only that', () => {
  const alphaOf = (calls: Call[], op: string, id: string) =>
    calls.find((c) => c.op === op && c.args[0] === id)?.args[1];

  it('leaves everything at full brightness under All', () => {
    const calls = render(frame({ laneFilter: 'all', connections: [fakeConnection('w', QUERY, PAGE)] }));

    expect(alphaOf(calls, 'paintNode', 'page')).toBe(1);
    expect(alphaOf(calls, 'paintNode', 'query')).toBe(1);
    expect(alphaOf(calls, 'paintWire', 'w')).toBe(1);
  });

  it('dims the logic node under Structure and the stack under Logic', () => {
    const structure = render(frame({ laneFilter: 'structure' }));
    expect(alphaOf(structure, 'paintNode', 'page')).toBe(1);
    expect(alphaOf(structure, 'paintNode', 'query')).toBe(StructureLane.dimAlpha);

    const logic = render(frame({ laneFilter: 'logic' }));
    expect(alphaOf(logic, 'paintNode', 'page')).toBe(StructureLane.dimAlpha);
    expect(alphaOf(logic, 'paintNode', 'query')).toBe(1);
  });

  it('never paints anything at zero — R-F, dims and never hides', () => {
    for (const laneFilter of ['structure', 'logic'] as const) {
      const calls = render(frame({ laneFilter, connections: [fakeConnection('w', QUERY, PAGE)] }));
      for (const call of calls.filter((c) => c.op === 'paintNode' || c.op === 'paintWire')) {
        expect(call.args[1]).toBeGreaterThan(0);
      }
    }
  });

  it('reads a wire’s endpoint through to its ROOT, not off the endpoint itself', () => {
    // 🔴 The endpoint of a wire into a stack is a CHILD, deep inside it. Testing the endpoint's own
    // id against the lane set says "not in a lane" for almost every real wire, and the whole
    // filter silently degrades to "dim everything".
    const child = fakeRoot('child', 120, 150, 150, 36);
    child.parent = PAGE;
    const calls = render(
      frame({ laneFilter: 'logic', connections: [fakeConnection('into-stack', QUERY, child)] })
    );

    // One end in the lane, one out: a crossing wire, and R-Y says it stays bright.
    expect(alphaOf(calls, 'paintWire', 'into-stack')).toBe(1);
  });

  it('dims a wire wholly outside the lane under Structure, and one wholly inside under Logic', () => {
    const child = fakeRoot('child', 120, 150, 150, 36);
    child.parent = PAGE;
    const other = fakeRoot('sort', 600, 120, 150, 60);

    const structure = render(
      frame({
        laneFilter: 'structure',
        roots: [PAGE, QUERY, other],
        laneRoots: laneRootsFor([PAGE, true], [QUERY, false], [other, false]),
        connections: [fakeConnection('logic-to-logic', QUERY, other)]
      })
    );
    expect(alphaOf(structure, 'paintWire', 'logic-to-logic')).toBe(StructureLane.dimAlpha);

    const logic = render(frame({ laneFilter: 'logic', connections: [fakeConnection('inside', PAGE, child)] }));
    expect(alphaOf(logic, 'paintWire', 'inside')).toBe(StructureLane.dimAlpha);
  });

  it('declares the dimmed alpha as the painter’s BASELINE, not just on the context', () => {
    // 🔴 The defect a photograph caught and 43 green specs did not: `ctx.globalAlpha` alone dims
    // the root's own card and nothing else, because the painter resets to "opaque" three times on
    // its way down the children. A page stack dimmed its top node and left the whole stack bright.
    render(frame({ laneFilter: 'logic' }));

    const calls = (setBaseAlpha as jest.Mock).mock.calls.map((c) => c[0]);

    expect(calls).toContain(StructureLane.dimAlpha); // the stack
    expect(calls).toContain(1); // the logic root, and the reset afterwards
    expect(calls[calls.length - 1]).toBe(1); // never left dimmed for the next frame
  });

  it('does not touch the painter’s baseline when the filter is off', () => {
    render(frame({ laneFilter: 'all' }));

    expect(setBaseAlpha as jest.Mock).not.toHaveBeenCalled();
  });

  it('does not leak a dimmed alpha into the decorations painted after the nodes', () => {
    // 🔴 The node pass leaves `globalAlpha` at whatever the LAST root was painted at. Everything
    // after it — the insert indicator, the multiselect box — is drawn with a bare `fillRect`/
    // `stroke` and no alpha of its own, so without the reset the insert bar you are dragging
    // against would be drawn at 25% whenever the filter is on. `globalAlpha` is absolute, so this
    // is the only way the filter CAN leak, and it is the reason the reset is there.
    const calls = render(
      frame({
        laneFilter: 'logic',
        // The stack is the last root painted and is the dimmed one under `logic`.
        roots: [QUERY, PAGE],
        laneRoots: laneRootsFor([QUERY, false], [PAGE, true]),
        insertLocation: { pos: { x: 0, y: 0 } }
      })
    );

    expect(alphaInForceAt(calls, indexOf(calls, (c) => c.op === 'set:fillStyle' && c.args[0] === '#4da3ff'))).toBe(1);
  });
});
