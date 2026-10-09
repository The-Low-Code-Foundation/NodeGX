/**
 * NDA-012 (Visual), check `B2` — does the diagnosis reach a **deployed** app?
 *
 * `B2` is the second leg of defect class B and it is not about whether a node has a `Failure`
 * *port* — that is `B1`, and `ERG-001` owns the whole Visual family's outcome ports as one
 * collision sweep. `B2` asks only whether the report exists in a runtime that is not the editor.
 * `context.editorConnection.sendWarning` fails that by construction: it is the editor bridge, so
 * every diagnosis an author leaned on while building vanished the moment the app shipped.
 *
 * The channel already exists — `FAILURE-CONTRACT.md`, built 2026-07-29, with `sendWarning`
 * demoted to one *subscriber* of it. So these fixes are re-pointing, not designing.
 *
 * Four `B2` cells were open. Two are closed here (`Group`, `Repeater`) and two are not:
 *
 * - ⚠️ **`Drag`'s cell is stale.** It reads "nothing is reported anywhere", which was true when
 *   filed and stopped being true in remediation stream B: the `G1` fix gave both snap-value
 *   ports `raiseRuntimeError('drag/snap-position-not-a-number', …)`, and the bus *is* the
 *   deployed channel. Re-derived by reading the node, not by trusting the cell. The `Do`-cannot-
 *   act condition it also mentions is `B1`'s port and stays with `ERG-001`.
 * - ⚠️ **`Page`'s cell records no mechanism at all** (its note is a dash). Read for one, the only
 *   thing `Page` silently fails at is `DV-vii` — its `Title` and `Url Path` ports are dead — and
 *   that is a prose defect the handover explicitly parks pending Richard, because making `Title`
 *   work means deciding whether the Page or the Router owns the document title. Not closed here,
 *   and deliberately not closed *quietly*.
 */

/* eslint-env jest */

import type { NodeInstance } from '@noodl/types';

import { createCorpusGraph, type CorpusGraph } from '../../../noodl-runtime/test/corpus/graph-harness';

import NoodlRuntime from '@noodl/runtime';
import Model = require('@noodl/runtime/src/model');

(globalThis as unknown as { Noodl: unknown }).Noodl = { deployed: true, baseUrl: '/' };

// The Group's React component pulls in three ES-module scroll plugins ts-jest will not
// transform. Same three mocks as `nda-012-visual-premount-actions.test.ts`.
jest.mock('../../src/components/visual/Group/scroll-plugins/nested-scroll-plugin', () => ({ default: class {} }));
jest.mock('../../src/components/visual/Group/scroll-plugins/patched-momentum-scroll', () => ({
  default: class {}
}));
jest.mock('../../src/components/visual/Group/scroll-plugins/slide-scroll-plugin', () => ({ default: class {} }));

/* eslint-disable @typescript-eslint/no-var-requires */
const GroupModule = require('../../src/nodes/visual/group').default;
const ForEachModule = require('../../src/nodes/std-library/data/foreach').default;
/* eslint-enable @typescript-eslint/no-var-requires */

const savedNoodlRuntimeInstance = (NoodlRuntime as unknown as { instance?: unknown }).instance;
beforeAll(() => {
  (NoodlRuntime as unknown as { instance?: unknown }).instance = { getProjectSettings: () => ({}) };
});
afterAll(() => {
  (NoodlRuntime as unknown as { instance?: unknown }).instance = savedNoodlRuntimeInstance;
});

interface DrivableNode extends NodeInstance {
  setInputValue(name: string, value: unknown): void;
  innerReactComponentRef: unknown;
  _flushPendingInnerActions(): void;
  _internal: Record<string, unknown>;
  /** Repeater methods these rows drive directly. */
  getTemplateForModel(model: unknown): string | undefined;
  reportTemplateProblem(code: string, message: string): void;
  registerInputIfNeeded(name: string): void;
  addItem(model: unknown, index: number): Promise<void>;
  _mapInputs(itemNode: unknown, model: unknown): void;
  _queueOperation(op: () => unknown): void;
  _copyItems(): void;
  itemOutputSignalTriggered(name: string, model: unknown, itemNode: unknown): void;
  registerOutputIfNeeded(name: string): void;
  getItemOutput(name: string): unknown;
}

async function build(module: { node: { name: string } }, parameters: Record<string, unknown> = {}) {
  const graph: CorpusGraph = await createCorpusGraph({
    modules: [module as never],
    data: {
      components: [{ name: '/root', nodes: [{ id: 'under-test', type: module.node.name, parameters }] }]
    } as never
  });

  (graph.context as unknown as { styles: unknown }).styles = {
    getTextStyle: () => ({}),
    resolveColor: (c: unknown) => c
  };
  graph.update();

  return { graph, node: graph.node('under-test') as unknown as DrivableNode };
}

const codes = (graph: CorpusGraph) => graph.errors.map((e) => e.code);

describe('B2-a — Group reports an invalid Layout on a channel a deployed app has', () => {
  it('raises on the runtime error bus rather than only in the editor', async () => {
    const { graph, node } = await build(GroupModule);

    node.setInputValue('flexDirection', 'sideways');
    graph.update();

    expect(codes(graph)).toEqual(['group/layout-not-a-flex-direction']);
    expect(graph.errors[0].message).toContain('"sideways"');
    // The message has to say what *would* have worked; "invalid" on its own is the complaint
    // class B is about, one level up.
    expect(graph.errors[0].message).toContain('"row"');
  });

  it('carries the provenance the bus fills in, so the editor can still point at the node', async () => {
    const { graph, node } = await build(GroupModule);

    node.setInputValue('flexDirection', 'sideways');
    graph.update();

    expect(graph.errors[0].nodeId).toBe('under-test');
    expect(graph.errors[0].nodeType).toBe('Group');
  });

  // The controls. Both valid directions and the documented `'none'` escape must stay silent —
  // without these the setter could raise unconditionally and every row above would pass.
  it.each([['row'], ['column'], ['none']])('says nothing about %s', async (value) => {
    const { graph, node } = await build(GroupModule);

    node.setInputValue('flexDirection', value);
    graph.update();

    expect(codes(graph)).toEqual([]);
  });
});

describe('B2-b — Group says why a scroll did nothing', () => {
  /**
   * The component, constructed directly.
   *
   * `scrollToIndex`/`scrollToElement` are plain methods that touch only `scrollRef` and
   * `iScroll`, so a real mount buys nothing here and would need a DOM that this package's jest
   * environment (`node`) does not have. What is being measured is the *reason string*, which is
   * the whole of the new contract between the component and the node.
   */
  function groupComponent(children: unknown[]) {
    /* eslint-disable @typescript-eslint/no-var-requires */
    const { Group } = require('../../src/components/visual/Group/Group');
    /* eslint-enable @typescript-eslint/no-var-requires */

    const element = {
      children,
      contains: (el: unknown) => children.indexOf(el) !== -1,
      scrollIntoView: () => undefined
    };

    const instance = Object.create(Group.prototype);
    instance.scrollRef = { current: element };
    instance.iScroll = undefined;
    return { instance, element };
  }

  const child = (name: string) => ({ name, scrollIntoView: () => undefined });

  /**
   * A target node shaped the way the React 19 runtime actually shapes one.
   *
   * ⚠️ These rows used to hand `scrollToElement` a `{ getRef: () => ({ current: el }) }` fake,
   * and **no real node has ever looked like that**. `getRef` returns `reactComponentRef`, the
   * pre-React-19 field; since RUN-001 a node reports its root through `setDOMElement` /
   * `getDOMElement`, and `reactComponentRef` stays empty. So the reason-string rows all passed
   * while the feature they describe could not resolve a single real target — the fake encoded
   * an accessor nothing populates. Found by driving stream C's pre-mount fix in the editor.
   *
   * `getRef` is kept on the fake, populated the way React 19 leaves it, so a regression back to
   * the old accessor reddens these rows instead of quietly passing again.
   */
  const target = (el: unknown) => ({ getRef: () => ({ current: undefined }), getDOMElement: () => el });

  it('names the index and the length when the index is past the end', () => {
    const { instance } = groupComponent([child('a'), child('b')]);

    expect(instance.scrollToIndex(5, 0)).toContain('no child at index 5');
    expect(instance.scrollToIndex(5, 0)).toContain('the Group has 2');
  });

  it('says nothing when the child exists', () => {
    const { instance } = groupComponent([child('a'), child('b')]);

    expect(instance.scrollToIndex(1, 0)).toBeUndefined();
  });

  it('reports an element that is not inside this Group', () => {
    const { instance } = groupComponent([child('a')]);
    const stranger = child('elsewhere');

    const reason = instance.scrollToElement(target(stranger), 0);

    // ⚠️ This is the sharp one. `scrollIntoView` scrolls the nearest scrollable *ancestor*, so
    // an element outside the Group does not error — it silently scrolls a different container,
    // which looks like the Group ignoring the action.
    expect(reason).toContain('not inside this Group');
  });

  it('reports a node that has not rendered a DOM element', () => {
    const { instance } = groupComponent([]);

    expect(instance.scrollToElement(target(null), 0)).toContain('no rendered DOM element');
  });

  it('scrolls, and says nothing, for an element it does contain', () => {
    const { instance, element } = groupComponent([]);
    const inside = child('inside');
    element.children.push(inside);

    expect(instance.scrollToElement(target(inside), 0)).toBeUndefined();
  });

  /**
   * The defect row: **a target that has rendered must scroll, not be reported as unmounted.**
   *
   * This is the same node shape as `target()` above, spelled out rather than shared, because
   * what it pins is the *accessor* and not the reason text. Against the old `getRef()` code the
   * `current` is `undefined`, the element resolves to null, and the row gets
   * "no rendered DOM element — it may not be mounted" — a plausible reason and the wrong one,
   * which is exactly how this survived a green corpus. Live QA saw the Group receive the action
   * on time (stream C's queue working) and then decline to scroll to a `SCROLL TARGET` that had
   * been on screen the whole time.
   */
  it('resolves the target through getDOMElement, not the empty React-18 ref', () => {
    const { instance, element } = groupComponent([]);
    const rendered = child('rendered');
    element.children.push(rendered);

    const reactNineteenNode = {
      // Populated the way React 19 leaves it: present, and empty.
      getRef: () => ({ current: undefined }),
      getDOMElement: () => rendered
    };

    expect(instance.scrollToElement(reactNineteenNode, 0)).toBeUndefined();
  });

  // The control that keeps the Empty-Value Contract honest: an unwired `Element` is a port with
  // no opinion, not a failure, and must not raise.
  it('treats an unwired Element as no opinion rather than a failure', () => {
    const { instance } = groupComponent([]);

    expect(instance.scrollToElement(undefined, 0)).toBeUndefined();
  });
});

describe('B2-c — Repeater reports the three ways its template can fail', () => {
  it('raises when the Script does not compile', async () => {
    const { graph, node } = await build(ForEachModule, { templateType: 'dynamic' });

    node.setInputValue('templateScript', 'this is not javascript(');
    graph.update();

    expect(codes(graph)).toContain('repeater/template-script-syntax-error');
  });

  // ⚠️ Found by writing the row: a Script that stops compiling used to leave the *previous*
  // compiled function in place, so the Repeater kept rendering rows from code the author had
  // already replaced.
  it('drops the previous compiled function instead of silently still using it', async () => {
    const { graph, node } = await build(ForEachModule, { templateType: 'dynamic' });

    node.setInputValue('templateScript', 'component = "/A";');
    expect(node._internal.templateFunction).toBeDefined();

    node.setInputValue('templateScript', 'component = (');
    graph.update();

    expect(node._internal.templateFunction).toBeUndefined();
    expect(codes(graph)).toContain('repeater/template-script-syntax-error');
  });

  it('raises when the Script throws for an item rather than dropping the row silently', async () => {
    const { graph, node } = await build(ForEachModule, { templateType: 'dynamic' });

    node.setInputValue('templateScript', 'throw new Error("no component for this one");');
    graph.update();

    node.getTemplateForModel(Model.create({ id: 'a' }));

    expect(codes(graph)).toContain('repeater/template-script-threw');
    expect(graph.errors[graph.errors.length - 1].message).toContain('no component for this one');
  });

  // The control: a Script that compiles and returns a component must produce no diagnosis at
  // all. Without it every row above would pass against a node that raised unconditionally.
  it('says nothing when the Script compiles and returns a component', async () => {
    const { graph, node } = await build(ForEachModule, { templateType: 'dynamic' });

    node.setInputValue('templateScript', 'component = "/Item";');
    graph.update();

    expect(node.getTemplateForModel(Model.create({ id: 'a' }))).toBe('/Item');
    expect(codes(graph)).toEqual([]);
  });

  // ⚠️ `inputMappingScript` is a **dynamic** port — it exists only once
  // `registerInputIfNeeded` has been asked for it (`foreach.tsx:851`). Driving it without that
  // registers nothing, the setter never runs, and the row reads as "the fix does not work"
  // while measuring nothing at all.
  it('raises when the input mapping script does not compile', async () => {
    const { graph, node } = await build(ForEachModule);

    node.registerInputIfNeeded('inputMappingScript');
    node.setInputValue('inputMappingScript', 'map({ a: ');
    graph.update();

    expect(codes(graph)).toContain('repeater/input-mapping-syntax-error');
    expect(node._internal.inputMapFunc).toBeUndefined();
  });

  it('says nothing about an input mapping script that compiles', async () => {
    const { graph, node } = await build(ForEachModule);

    node.registerInputIfNeeded('inputMappingScript');
    node.setInputValue('inputMappingScript', 'map({ title: "name" });');
    graph.update();

    expect(codes(graph)).toEqual([]);
    expect(node._internal.inputMapFunc).toBeDefined();
  });
});

describe('B2-d — the report is raised once per rebuild, not once per item', () => {
  /**
   * A 5,000-row list whose Template names a missing component would otherwise raise 5,000
   * identical events. The editor's warning panel keys by code and would collapse them; the
   * `console.error` subscriber a deployed app uses would not, and the diagnosis this task exists
   * to deliver would arrive as a wall of noise.
   */
  it('collapses the same problem across items in one rebuild', async () => {
    const { graph, node } = await build(ForEachModule);

    node._internal.reportedTemplateProblems = new Set<string>();
    for (let i = 0; i < 50; i++) {
      node.reportTemplateProblem('repeater/template-component-not-found', 'the same problem');
    }

    expect(codes(graph)).toEqual(['repeater/template-component-not-found']);
  });

  it('still reports two different problems in the same rebuild', async () => {
    const { graph, node } = await build(ForEachModule);

    node._internal.reportedTemplateProblems = new Set<string>();
    node.reportTemplateProblem('repeater/template-component-not-found', 'one problem');
    node.reportTemplateProblem('repeater/no-template-for-item', 'a different problem');

    expect(codes(graph)).toEqual(['repeater/template-component-not-found', 'repeater/no-template-for-item']);
  });

  // Outside a rebuild there is no dedupe set — a one-off `add` on the bound collection is
  // exactly the case where one report is the right number, and swallowing it would be worse.
  it('reports when there is no rebuild in progress to dedupe against', async () => {
    const { graph, node } = await build(ForEachModule);

    node._internal.reportedTemplateProblems = undefined;
    node.reportTemplateProblem('repeater/no-template-for-item', 'a one-off add');
    node.reportTemplateProblem('repeater/no-template-for-item', 'a one-off add');

    expect(codes(graph)).toEqual(['repeater/no-template-for-item', 'repeater/no-template-for-item']);
  });
});

/**
 * P109 ISL-049 — what used to stop a Repeater for good is caught where it happens and said on the bus (rows C128, C135, C140,
 * C141). Whether the queue then runs on, and when, is graded by the For Each scenarios on the runtime target; the trace there
 * carries no runtime errors, so the codes are graded here. Each catch has a control beside it that raises nothing.
 */
describe('ISL-049 — a Repeater names what it cannot build and goes on', () => {
  const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

  // C135: `startsWith` on a number threw outside the Script's try
  it('reports a Script whose component is not text, and gives that item no row', async () => {
    const { graph, node } = await build(ForEachModule, { templateType: 'dynamic' });

    node.setInputValue('templateScript', 'component = 7;');
    graph.update();

    expect(node.getTemplateForModel(Model.create({ id: 'a' }))).toBeUndefined();
    expect(codes(graph)).toEqual(['repeater/template-script-threw']);
    expect(graph.errors[0].message).toContain('7');
  });

  // C128: `createNode` throws for a component the project does not have; the `!itemNode` branch never ran
  it('reports a Template the project does not have, and the build resolves', async () => {
    const { graph, node } = await build(ForEachModule, { template: '/Missing' });

    await expect(node.addItem(Model.create({ id: 'a' }), 0)).resolves.toBeUndefined();

    expect(codes(graph)).toEqual(['repeater/template-component-not-found']);
    expect(graph.errors[0].message).toContain('"/Missing"');
  });

  // C140 / C141: the same catch serves the landing and a record's change
  it('reports a mapping that throws for an item, keeps what it set before, and does not throw into the caller', async () => {
    const { graph, node } = await build(ForEachModule);
    const set: Record<string, unknown> = {};
    const row = { hasInput: () => true, setInputValue: (k: string, v: unknown) => (set[k] = v) };

    node.registerInputIfNeeded('inputMappingScript');
    node.setInputValue('inputMappingScript', "map({ id: function (o) { return o.getId() }, label: function () { throw new Error('no label'); } })");
    graph.update();

    expect(() => node._mapInputs(row, Model.create({ id: 'b' }))).not.toThrow();
    expect(set).toEqual({ id: 'b' });
    expect(codes(graph)).toEqual(['repeater/input-mapping-threw']);
    expect(graph.errors[0].message).toContain('"b"');
    expect(graph.errors[0].message).toContain('no label');
  });

  it('says nothing about a mapping that does not throw', async () => {
    const { graph, node } = await build(ForEachModule);
    const set: Record<string, unknown> = {};
    const row = { hasInput: () => true, setInputValue: (k: string, v: unknown) => (set[k] = v) };

    node.registerInputIfNeeded('inputMappingScript');
    node.setInputValue('inputMappingScript', 'map({ id: function (o) { return o.getId() } })');
    graph.update();

    node._mapInputs(row, Model.create({ id: 'b' }));
    expect(set).toEqual({ id: 'b' });
    expect(codes(graph)).toEqual([]);
  });

  // C128's backstop: anything an operation does not catch itself
  it('reports an operation that throws, and runs the next one', async () => {
    const { graph, node } = await build(ForEachModule);
    let ran = false;

    node._queueOperation(() => {
      throw new Error('broken op');
    });
    node._queueOperation(() => {
      ran = true;
    });
    await flush();

    expect(ran).toBe(true);
    expect(codes(graph)).toEqual(['repeater/operation-threw']);
    expect(graph.errors[0].message).toContain('broken op');
  });

  it('says nothing when every operation completes', async () => {
    const { graph, node } = await build(ForEachModule);
    let ran = 0;

    node._queueOperation(() => void ran++);
    node._queueOperation(() => void ran++);
    await flush();

    expect(ran).toBe(2);
    expect(codes(graph)).toEqual([]);
  });
});

/**
 * P109 ISL-049, row C130 — ruled "Skip the empty entry and report it once". Which rows are drawn is graded by the For Each
 * scenarios on the runtime target; the report is graded here.
 */
describe('ISL-049 — a list with an empty entry draws the rest and says so once', () => {
  const size = (node: DrivableNode) => (node._internal.collection as { size(): number }).size();

  it('copies every entry but the empty ones, and reports them once for that list', async () => {
    const { graph, node } = await build(ForEachModule, { template: '/Row' });
    const items = [{ id: 'a' }, null, { id: 'b' }, undefined];

    node.setInputValue('items', items);
    graph.update();
    node._copyItems();

    expect(size(node)).toBe(2);
    expect(codes(graph)).toEqual(['repeater/items-empty-entry']);
    expect(graph.errors[0].message).toContain('2 empty entries');
  });

  it('says nothing about a list with no empty entry', async () => {
    const { graph, node } = await build(ForEachModule, { template: '/Row' });

    node.setInputValue('items', [{ id: 'a' }, { id: 'b' }]);
    graph.update();

    expect(size(node)).toBe(2);
    expect(codes(graph)).toEqual([]);
  });

  // The second half: a copy that throws at the frame's end no longer drops the rebuild asked for in the same frame
  it('keeps the frame-end rebuild when the copy throws', async () => {
    const { graph, node } = await build(ForEachModule, { template: '/Row' });
    graph.update();
    node._copyItems = () => {
      throw new Error('a listener threw');
    };

    node.setInputValue('items', [{ id: 'a' }]);
    node.setInputValue('template', '/Other');
    graph.update();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(codes(graph)).toContain('repeater/operation-threw');
    expect(node._internal.hasScheduledRefresh).toBe(false);
  });
});

/**
 * P107-C142 — the rows' signals heard in one update. A trace keeps a settle's last value per port, so the For Each scenarios show
 * every signal and the last row's values; which values each signal goes out with is graded here, at the node.
 */
describe('ISL-049 — each row\'s signal goes out with its own row', () => {
  it('reports two rows heard in one update one after the other: Item Id, outputs, then the signal', async () => {
    const { graph, node } = await build(ForEachModule);
    node.registerOutputIfNeeded('itemOutputSignal-Added');
    node.registerOutputIfNeeded('itemOutputSignal-Leaving');
    node.registerOutputIfNeeded('itemOutput-Label');
    const sent: string[] = [];
    const n = node as unknown as { sendSignalOnOutput(name: string): void; flagOutputDirty(name: string): void };
    const send = n.sendSignalOnOutput.bind(node);
    const flag = n.flagOutputDirty.bind(node);
    n.sendSignalOnOutput = (name) => (sent.push(`signal ${name}`), send(name));
    n.flagOutputDirty = (name) => (
      sent.push(`${name} ${name === 'itemActionItemId' ? node._internal.itemActionItemId : node.getItemOutput(name.slice('itemOutput-'.length))}`),
      flag(name)
    );
    const row = (label: string) => ({ _outputs: { Label: { value: label } } });

    node.itemOutputSignalTriggered('Leaving', Model.create({ id: 'c142-a' }), row('A'));
    node.itemOutputSignalTriggered('Added', Model.create({ id: 'c142-b' }), row('B'));
    graph.update();

    expect(sent).toEqual([
      'itemActionItemId c142-a',
      'itemOutput-Label A',
      'signal itemOutputSignal-Leaving',
      'itemActionItemId c142-b',
      'itemOutput-Label B',
      'signal itemOutputSignal-Added'
    ]);
  });
});

