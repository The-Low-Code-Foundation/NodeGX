/**
 * TVW-008 — the board's export: one harness, N frames, one client.
 *
 * The board is a **picked set** (R-7), and §6 is why: a board of every visual
 * component fits at 100% in 0 of 99 projects, needs a zoom below the specified
 * floor in 46% of them, and reaches 244 megapixels of live DOM at the top of the
 * distribution. What is graded here is the thing that survived — N chosen
 * components, side by side, at their authored sizes.
 *
 * 🔴 **The frame wrapper is the thing BEN-001 deliberately refused to build**,
 * on the grounds that `sizeMode` silently voids `width`/`height` and a wrapper
 * that gets either wrong makes a correct component look broken inside the tool
 * built to tell you whether it is. A board cannot sidestep it the way the single
 * bench did, so the wrapper's two failure modes are pinned here directly.
 */

import {
  BENCH_COMPONENT_NAME,
  BOARD_ROOT_ID,
  ESTIMATED_CONTENT_FRAME_HEIGHT,
  boardBounds,
  boardFrameNodeId,
  boardHarness,
  boardInstanceNodeId,
  buildBoardExport,
  type BoardFrameMount
} from '../../src/editor/src/models/AiAssistant/authoring/componentBench';
import { BENCH_FRAME_KEY } from '../../src/editor/src/views/VisualCanvas/benchFrameDefault';
import { BENCH_SCENARIOS_KEY } from '../../src/editor/src/views/VisualCanvas/benchScenarios';
import { NodeLibrary } from '@noodl-models/nodelibrary';
import { ProjectModel } from '../../src/editor/src/models/projectmodel';

/* eslint-disable @typescript-eslint/no-var-requires */
const gitRepoUtf8 = require('../testfs/git-repo-utf8/project.json');
/* eslint-enable @typescript-eslint/no-var-requires */

const SHARE_ITEM = '/Pop-ups/Share/Share Item';
const LOGIC_ONLY = '/Logic Components/Get Article From Slug';

function loadProject(): ProjectModel {
  return ProjectModel.fromJSON(JSON.parse(JSON.stringify(gitRepoUtf8)));
}

/** See the long note in `tests/ai/component-bench.test.ts` — without this, every interface is empty. */
function loadNodeLibrary() {
  window.NodeLibraryData = require('../nodegraph/nodelibrary');
  NodeLibrary.instance.loadLibrary();
  expect(NodeLibrary.instance.getNodeTypeWithName('Component Inputs')).toBeDefined();
}

const mount = (over: Partial<BoardFrameMount> = {}): BoardFrameMount => ({
  target: '/A',
  x: 0,
  y: 0,
  width: 768,
  height: null,
  parameters: {},
  // TVW-008 slice 2 — `scenario` is required rather than optional, and the
  // helper supplies it rather than the type relaxing to let it through: every
  // mount comes from `boardFrameMounts`, which always knows whether the values
  // it just resolved came from a saved scenario, and the caption always asks.
  // A frame that could not answer would be one the editor draws `no inputs set`
  // under on the strength of a missing key.
  scenario: null,
  ...over
});

function harnessOf(json: { components: Array<{ name: string; nodes?: TSFixme[] }> }) {
  return json.components.find((c) => c.name === BENCH_COMPONENT_NAME)!;
}

describe('TVW-008 — the board is laid out before it is drawn', () => {
  it('an empty board has a 1 × 1 extent, not a zero one', () => {
    // A zero-sized root is a Group the runtime has nothing to lay out. The
    // surface draws its own empty state over it either way.
    expect(boardBounds([])).toEqual({ minX: 0, minY: 0, width: 1, height: 1 });
  });

  it('spans from the leftmost edge to the rightmost', () => {
    const bounds = boardBounds([
      mount({ target: '/A', x: 0, width: 360, height: 200 }),
      mount({ target: '/B', x: 1000, width: 768, height: 400 })
    ]);
    expect(bounds).toEqual({ minX: 0, minY: 0, width: 1768, height: 400 });
  });

  it('🔴 records the offset when a frame sits at a NEGATIVE coordinate', () => {
    // Someone dragged a frame left of where the first one landed. A
    // `marginLeft: -500` inside the document pushes the frame out of its own
    // parent rather than moving the view, so the document is shifted instead —
    // and this is the single place that knows by how much.
    const bounds = boardBounds([
      mount({ target: '/A', x: -500, y: -200, width: 360, height: 100 }),
      mount({ target: '/B', x: 0, y: 0, width: 360, height: 100 })
    ]);
    expect(bounds.minX).toBe(-500);
    expect(bounds.minY).toBe(-200);
    expect(bounds.width).toBe(860);
  });

  it('uses the estimate for a content-sized frame, and names it as an estimate', () => {
    const bounds = boardBounds([mount({ height: null, width: 360 })]);
    expect(bounds.height).toBe(ESTIMATED_CONTENT_FRAME_HEIGHT);
  });
});

describe('TVW-008 — the harness graph', () => {
  it('is ONE component with one root, whatever N is', () => {
    // §2: one export, one client, one `<webview>`. N harnesses would be N
    // runtimes, which is the arrangement R1 was written against.
    const harness = boardHarness([mount({ target: '/A' }), mount({ target: '/B', x: 816 })]);
    expect(harness.name).toBe(BENCH_COMPONENT_NAME);
    expect(harness.graph.roots.length).toBe(1);
    expect(harness.graph.roots[0].id).toBe(BOARD_ROOT_ID);
  });

  it('gives the root `layout: none`, which is what makes the frames absolute at all', () => {
    // `Layout.size` sets `position: absolute` from `parentLayout === 'none'`
    // (`layout.ts:56`); `align` then defaults such a child to left:0/top:0
    // (`layout.ts:120`). Without this the frames stack in a column and every
    // stored position is ignored.
    const harness = boardHarness([mount()]);
    expect(harness.graph.roots[0].parameters.layout).toBe('none');
  });

  it('adds 2N nodes — a frame and an instance each — and not N²', () => {
    // §5 called this an N² landmine; §6.3 measured it and it is not. The whole
    // project is already in the export before the harness adds anything.
    const frames = [mount({ target: '/A' }), mount({ target: '/B' }), mount({ target: '/C' })];
    const root = boardHarness(frames).graph.roots[0];
    expect(root.children.length).toBe(3);
    for (const [index, frame] of root.children.entries()) {
      expect(frame.id).toBe(boardFrameNodeId(index));
      expect(frame.children.length).toBe(1);
      expect(frame.children[0].id).toBe(boardInstanceNodeId(index));
    }
  });

  it('instantiates each picked component by its legacy name', () => {
    // ⚠️ `typename`, not `type`. `ComponentModel.fromJSON` resolves a node's type
    // through the global `NodeLibrary`, so a project component this fixture does
    // not define comes back as `UnknownNodeType` — which is the resolution, not
    // the authored value. `typename` is the string the board wrote; the string
    // the runtime finally reads is the `type` in the exported JSON, asserted in
    // the AC2 block below.
    const root = boardHarness([mount({ target: '/Sections/Hero' })]).graph.roots[0];
    expect(root.children[0].children[0].typename).toBe('/Sections/Hero');
  });

  it('carries each frame own parameters through to its instance', () => {
    const root = boardHarness([
      mount({ target: '/A', parameters: { Label: 'one' } }),
      mount({ target: '/B', parameters: { Label: 'two' } })
    ]).graph.roots[0];
    expect(root.children[0].children[0].parameters).toEqual({ Label: 'one' });
    expect(root.children[1].children[0].parameters).toEqual({ Label: 'two' });
  });

  describe('the two ways a frame wrapper goes wrong — BEN-001 warning, pinned', () => {
    it('🔴 sizes in PIXELS, never a bare number', () => {
      // `width`/`height` are `dimension` ports whose defaultUnit is '%' and
      // whose default is 100 (`node-shared-port-definitions.ts`). A bare 768 is
      // therefore 768 PERCENT — a frame seven times its parent, which reads on
      // screen as "the board is broken" and in the graph as correct.
      const frame = boardHarness([mount({ width: 768, height: 200 })]).graph.roots[0].children[0];
      expect(frame.parameters.width).toEqual({ value: 768, unit: 'px' });
      expect(frame.parameters.height).toEqual({ value: 200, unit: 'px' });
      expect(typeof frame.parameters.width).not.toBe('number');
    });

    it('🔴 sizes the ROOT in pixels too', () => {
      const root = boardHarness([mount({ width: 360, height: 200 })]).graph.roots[0];
      expect(root.parameters.width).toEqual({ value: 360, unit: 'px' });
      expect(root.parameters.height).toEqual({ value: 200, unit: 'px' });
    });

    it('🔴 NAMES the sizeMode rather than leaving it to the default', () => {
      // This is BEN-001's warning verbatim: `sizeMode` decides whether `width`
      // and `height` are read at all, so a wrapper that does not say it is a
      // wrapper whose size is a suggestion.
      const frame = boardHarness([mount({ height: 200 })]).graph.roots[0].children[0];
      expect(frame.parameters.sizeMode).toBe('explicit');
    });

    it('takes its height from the CONTENT when no height was authored', () => {
      // The ordinary case — §6.4 measured 3 stored frames in 5,922 components.
      // `contentHeight` fixes the width and lets the content decide the rest,
      // which is the honest answer; a default number would draw every component
      // as a 768px box and call that the component's size.
      const frame = boardHarness([mount({ height: null })]).graph.roots[0].children[0];
      expect(frame.parameters.sizeMode).toBe('contentHeight');
    });

    it('omits `height` entirely when the content decides it', () => {
      // A number the mode ignores is a number a later reader mistakes for the
      // answer.
      const frame = boardHarness([mount({ height: null })]).graph.roots[0].children[0];
      expect('height' in frame.parameters).toBe(false);
    });
  });

  describe('positions', () => {
    it('offsets a frame with margins, because there are no left/top ports', () => {
      // Measured from the board's own top-left, which is why there are two
      // frames here: a lone frame IS the top-left. See the next spec.
      const root = boardHarness([
        mount({ target: '/A', x: 0, y: 0, height: 200 }),
        mount({ target: '/B', x: 120, y: 340, height: 200 })
      ]).graph.roots[0];
      expect(root.children[1].parameters.marginLeft).toEqual({ value: 120, unit: 'px' });
      expect(root.children[1].parameters.marginTop).toEqual({ value: 340, unit: 'px' });
    });

    it('draws a LONE frame at the document origin, wherever it was dragged to', () => {
      // 🔴 The first cut of the spec above asserted a 120px margin on a SINGLE
      // frame and went red on a correct build. Normalisation makes the
      // leftmost/topmost frame the origin by definition, so a board of one sits
      // at 0,0 however far it was dragged — its stored x/y still change, and the
      // editor places the whole document through `boardBounds`. Absolute
      // position is the surface's business; the graph carries the arrangement.
      const frame = boardHarness([mount({ x: 4000, y: -900, height: 200 })]).graph.roots[0].children[0];
      expect(frame.parameters.marginLeft).toEqual({ value: 0, unit: 'px' });
      expect(frame.parameters.marginTop).toEqual({ value: 0, unit: 'px' });
    });

    it('🔴 normalises a negative position instead of emitting a negative margin', () => {
      const root = boardHarness([
        mount({ target: '/A', x: -500, y: -200, height: 100 }),
        mount({ target: '/B', x: 0, y: 0, height: 100 })
      ]).graph.roots[0];
      expect(root.children[0].parameters.marginLeft).toEqual({ value: 0, unit: 'px' });
      expect(root.children[0].parameters.marginTop).toEqual({ value: 0, unit: 'px' });
      // The relative arrangement is what the person made, and it is preserved.
      expect(root.children[1].parameters.marginLeft).toEqual({ value: 500, unit: 'px' });
      expect(root.children[1].parameters.marginTop).toEqual({ value: 200, unit: 'px' });
    });
  });
});

describe('TVW-008 AC2 — the export a project produces', () => {
  beforeEach(loadNodeLibrary);

  it('splices exactly ONE harness and roots the runtime at the board', () => {
    const project = loadProject();
    const result = buildBoardExport({ project, frames: [{ target: SHARE_ITEM, x: 0, y: 0 }] });
    const json = result.json!;
    expect(json.components.filter((c) => c.name === BENCH_COMPONENT_NAME).length).toBe(1);
    expect(json.rootComponent).toBe(BENCH_COMPONENT_NAME);
    expect(json.rootNode).toBe(BOARD_ROOT_ID);
  });

  it('carries one instance node per picked frame', () => {
    const project = loadProject();
    const result = buildBoardExport({
      project,
      frames: [
        { target: SHARE_ITEM, x: 0, y: 0 },
        { target: LOGIC_ONLY, x: 816, y: 0 }
      ]
    });
    const root = harnessOf(result.json!).nodes![0];
    expect(root.children.length).toBe(2);
    expect(root.children.map((f: TSFixme) => f.children[0].type)).toEqual([SHARE_ITEM, LOGIC_ONLY]);
  });

  it('changes nothing about the project — splice, never apply', () => {
    const project = loadProject();
    const before = project.getComponents().length;
    buildBoardExport({ project, frames: [{ target: SHARE_ITEM, x: 0, y: 0 }] });
    expect(project.getComponents().length).toBe(before);
    expect(project.getComponentWithName(BENCH_COMPONENT_NAME)).toBeUndefined();
  });

  it('gives a component with NO saved scenario an empty parameter set', () => {
    // §6.4: this is every component in all 129 projects on this machine.
    const project = loadProject();
    const result = buildBoardExport({ project, frames: [{ target: SHARE_ITEM, x: 0, y: 0 }] });
    const instance = harnessOf(result.json!).nodes![0].children[0].children[0];
    expect(instance.parameters).toEqual({});
  });

  it('sets a component saved scenario as the instance parameters', () => {
    // ⚠️ The fixture is AUTHORED here, and §6.4 says so out loud: no component
    // in the corpus carries `bench.scenarios`, so this branch is unreachable on
    // real data and a drive that wrote one and read it back would be grading
    // the fixture.
    const project = loadProject();
    const component = project.getComponentWithName(SHARE_ITEM)!;
    component.setMetaData(BENCH_SCENARIOS_KEY, {
      scenarios: [{ name: 'default', inputs: { Label: 'From the scenario' } }]
    });

    const result = buildBoardExport({ project, frames: [{ target: SHARE_ITEM, x: 0, y: 0 }] });
    const instance = harnessOf(result.json!).nodes![0].children[0].children[0];
    expect(instance.parameters.Label).toBe('From the scenario');
  });

  it('takes the FIRST scenario when a component has several', () => {
    const project = loadProject();
    project.getComponentWithName(SHARE_ITEM)!.setMetaData(BENCH_SCENARIOS_KEY, {
      scenarios: [
        { name: 'first', inputs: { Label: 'first' } },
        { name: 'second', inputs: { Label: 'second' } }
      ]
    });
    const result = buildBoardExport({ project, frames: [{ target: SHARE_ITEM, x: 0, y: 0 }] });
    expect(harnessOf(result.json!).nodes![0].children[0].children[0].parameters.Label).toBe('first');
  });

  it('drops a scenario key that names no declared input, and says so', () => {
    // `benchParameters`' third rule, inherited: passing it through would
    // reproduce the phase-55 F2 defect inside the tool built to expose it.
    const project = loadProject();
    project.getComponentWithName(SHARE_ITEM)!.setMetaData(BENCH_SCENARIOS_KEY, {
      scenarios: [{ name: 'default', inputs: { NotAPort: 1 } }]
    });
    const result = buildBoardExport({ project, frames: [{ target: SHARE_ITEM, x: 0, y: 0 }] });
    expect('NotAPort' in harnessOf(result.json!).nodes![0].children[0].children[0].parameters).toBe(false);
    expect(result.summary).toContain('NotAPort');
  });
});

describe('TVW-008 AC3 — a frame is the size the component was authored at', () => {
  beforeEach(loadNodeLibrary);

  it('defaults to 768 when no size was saved', () => {
    const project = loadProject();
    const result = buildBoardExport({ project, frames: [{ target: SHARE_ITEM, x: 0, y: 0 }] });
    const frame = harnessOf(result.json!).nodes![0].children[0];
    expect(frame.parameters.width).toEqual({ value: 768, unit: 'px' });
  });

  it('uses the stored `bench.frame` when there is one', () => {
    const project = loadProject();
    project.getComponentWithName(SHARE_ITEM)!.setMetaData(BENCH_FRAME_KEY, { width: 360, height: 240 });
    const result = buildBoardExport({ project, frames: [{ target: SHARE_ITEM, x: 0, y: 0 }] });
    const frame = harnessOf(result.json!).nodes![0].children[0];
    expect(frame.parameters.width).toEqual({ value: 360, unit: 'px' });
    expect(frame.parameters.height).toEqual({ value: 240, unit: 'px' });
    expect(frame.parameters.sizeMode).toBe('explicit');
  });

  it('reads a stored width with NO height as content-sized', () => {
    // `bench.frame`'s absent height means "fill the stage" on the single bench.
    // A board frame has no stage, so the equivalent is the component's own
    // height.
    const project = loadProject();
    project.getComponentWithName(SHARE_ITEM)!.setMetaData(BENCH_FRAME_KEY, { width: 360 });
    const result = buildBoardExport({ project, frames: [{ target: SHARE_ITEM, x: 0, y: 0 }] });
    const frame = harnessOf(result.json!).nodes![0].children[0];
    expect(frame.parameters.sizeMode).toBe('contentHeight');
    expect('height' in frame.parameters).toBe(false);
  });

  it('gives two components on one board their OWN sizes', () => {
    const project = loadProject();
    project.getComponentWithName(SHARE_ITEM)!.setMetaData(BENCH_FRAME_KEY, { width: 360, height: 200 });
    const result = buildBoardExport({
      project,
      frames: [
        { target: SHARE_ITEM, x: 0, y: 0 },
        { target: LOGIC_ONLY, x: 816, y: 0 }
      ]
    });
    const frames = harnessOf(result.json!).nodes![0].children;
    expect(frames[0].parameters.width).toEqual({ value: 360, unit: 'px' });
    expect(frames[1].parameters.width).toEqual({ value: 768, unit: 'px' });
  });
});

describe('TVW-008 — a board that has outlived a component', () => {
  beforeEach(loadNodeLibrary);

  it('drops the frame and NAMES it, rather than exporting a type nothing defines', () => {
    // An instance node whose type nothing defines renders nothing and reports
    // nothing — the defect class this whole surface exists to expose.
    const project = loadProject();
    const result = buildBoardExport({
      project,
      frames: [
        { target: SHARE_ITEM, x: 0, y: 0 },
        { target: '/Deleted/Price Tag', x: 816, y: 0 }
      ]
    });
    expect(harnessOf(result.json!).nodes![0].children.length).toBe(1);
    expect(result.summary).toContain('Price Tag');
    expect(result.summary).toMatch(/no longer in this project/i);
  });

  it('still produces a renderable export when EVERY frame is gone', () => {
    const project = loadProject();
    const result = buildBoardExport({ project, frames: [{ target: '/Gone', x: 0, y: 0 }] });
    expect(result.unrenderable).toBeUndefined();
    expect(harnessOf(result.json!).nodes![0].children.length).toBe(0);
  });

  it('produces an empty board for an empty pick', () => {
    const project = loadProject();
    const result = buildBoardExport({ project, frames: [] });
    expect(result.unrenderable).toBeUndefined();
    expect(harnessOf(result.json!).nodes![0].children.length).toBe(0);
  });
});

describe('TVW-008 — the data story is the single bench, said once', () => {
  beforeEach(loadNodeLibrary);

  it('serves NO rows, exactly as the bench does', () => {
    // FIX-013 ruling 1(c), inherited. A board is N benches side by side, and
    // two surfaces disagreeing about where their data comes from is the
    // confusion TVW-002 was written against.
    const project = loadProject();
    const result = buildBoardExport({ project, frames: [{ target: SHARE_ITEM, x: 0, y: 0 }] });
    expect(result.dataset).toBeDefined();
    expect(result.summary).toContain(result.dataset!.summary);
  });

  it('counts what is on it, in words that do not promise "all"', () => {
    // R-7 removed `All components`; a caption that still says it promises a
    // membership the surface no longer has.
    const project = loadProject();
    const result = buildBoardExport({
      project,
      frames: [
        { target: SHARE_ITEM, x: 0, y: 0 },
        { target: LOGIC_ONLY, x: 816, y: 0 }
      ]
    });
    expect(result.summary).toContain('2 components');
    expect(result.summary).not.toMatch(/all components/i);
  });

  it('says "1 component", singular', () => {
    const project = loadProject();
    const result = buildBoardExport({ project, frames: [{ target: SHARE_ITEM, x: 0, y: 0 }] });
    expect(result.summary).toContain('1 component on');
  });
});
