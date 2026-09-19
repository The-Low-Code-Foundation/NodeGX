/**
 * BEN-001 — The component bench: mount one component *with its inputs set*
 *
 * `buildSandboxExport` already mounts a single component as the runtime's root,
 * which is why "preview one component" looked solved. It is not, and the reason
 * is structural: **a root component has no parent, and a `Component Inputs`
 * port is fed by its parent.** Every declared input sits at `undefined` for the
 * life of the preview, so a card previews as its empty state and a list as zero
 * rows — indistinguishable, on screen, from a component that does not work.
 * That is the phase-55 dead-placeholder failure arriving by a different route.
 *
 * The fix needs no runtime change and no new protocol message: give the
 * component a parent. A **synthetic harness component**, built in memory and
 * spliced exactly the way a candidate already is —
 *
 *   harness: one node, of type `<target legacyName>`, whose `parameters` are
 *   the static input values; `rootComponent` = the harness, `rootNode` = that
 *   node's id.
 *
 * — and the runtime then feeds the instance exactly as a page would.
 *
 * ## The plug inversion, which is **two** inversions and not one
 *
 * This cost a red suite, so it is written down in full:
 *
 * 1. A port **declared** on a `Component Inputs` node carries `plug: 'output'`.
 *    It is an output *of that node*, feeding the graph around it. LAS-001 is
 *    this fact; phase-55 F8 and F23 are both it, and both shipped.
 * 2. `ComponentModel.getPorts()` then **republishes** it as `plug: 'input'` —
 *    because from the point of view of an *instance* of the component it is an
 *    input, which is the direction that matters to everyone downstream.
 *
 * So the two `plug` values describe the same port from opposite ends, and the
 * one this module wants is the second. The runtime settles it:
 * `noodl-runtime/src/models/componentmodel.ts` reads the exported `ports` array
 * — which is `getPorts()` verbatim — and calls `addInputPort` for
 * `plug === 'input'`. Verified against the corpus fixture too: `Share Item`
 * declares `Icon Src Set`/`Label` as `output` on its Component Inputs node and
 * `Click` as `input` on its Component Outputs node, and `getPorts()` returns
 * the first two as `'input'` and `Click` as `'output'`.
 *
 * ⚠️ **The BEN-001 task file says `plug === 'output'` and is wrong.** So is any
 * reasoning that stops at inversion 1. Setting the values as instance
 * `parameters` is the right side of both.
 *
 * ⚠️ **A component instance carries zero built-in ports** (LAS-001). Every
 * parameter the harness sets must name a real declared input or it is the exact
 * defect `unknown-instance-parameter` blocks — so the parameter set is built
 * *from the interface*, and a key that names nothing is dropped and said out
 * loud rather than passed through.
 *
 * ## What this module deliberately does not do
 *
 * BEN-001 §3 proposed wrapping the instance in a Group sized to the frame. It
 * does not, and the reason is the warning in that same section: `sizeMode`
 * silently voids `width`/`height`, an unsized absolute Group fills its parent
 * (phase-55 F7), and a wrapper that gets either wrong makes a correctly-built
 * component look broken — inside the tool built to tell you whether it is.
 *
 * The frame is instead the **size of the surface the export is rendered into**,
 * which is what a page gives a component anyway, is BEN-004's existing job
 * (`CanvasView.setViewportSize` displays exactly this for the app preview), and
 * is measurable in the rendered document rather than inferred from a parameter.
 * The surface owns that size outright and this module has no opinion on it:
 * FIX-011 removed the `frame`/`stretch` pair that used to be accepted and
 * echoed here, because nothing ever passed one and nothing ever read one back.
 * See the phase README register (B3) — whether a graph-level wrapper is ever
 * needed is a live question for BEN-007, not a thing to guess at here.
 *
 * @module AiAssistant/authoring/componentBench
 */

import { SANDBOX_METADATA_KEY, type SandboxDataset } from '@noodl/runtime/src/sandbox/types';

import * as Exporter from '../../../utils/exporter';
import { ComponentModel } from '../../componentmodel';
import type { NodeGraphNode } from '../../nodegraphmodel';
import type { ProjectModel } from '../../projectmodel';
import { componentClosure, type SandboxExport, type SandboxExportJson } from './sandboxExport';
import { buildSandboxDataset, unknownShapeNotice } from './sandboxData';
import type { AgentSampleData } from './types';

/**
 * TVW-001 (f) — the surface's name, from the one module that holds it.
 *
 * A model importing a view constant is the inversion it looks like, and it is
 * deliberate: this sentence is drawn on the Workbench (`ComponentBench`'s
 * summary strip), so it is that surface's vocabulary and must not become a
 * second spelling of it. `captureReferences.ts` sets the precedent for the
 * direction; `benchWords.ts` is pure and pulls in no React.
 */
import { WORKBENCH } from '../../../views/VisualCanvas/benchWords';

/**
 * TVW-008 — the board reads the same two authored records the single bench does,
 * through the same readers. A second parser for `bench.frame` would be a second
 * thing to keep in step with the file format, and `benchFrameDefault.ts` already
 * clamps a hand-edited value on the way in.
 */
import { BENCH_FRAME_KEY, readBenchFrameDefault } from '../../../views/VisualCanvas/benchFrameDefault';
import { BENCH_SCENARIOS_KEY, readBenchScenarios } from '../../../views/VisualCanvas/benchScenarios';
import { DEFAULT_BENCH_WIDTH } from '../../../views/VisualCanvas/previewScope';

/**
 * The harness component's name.
 *
 * Prefixed out of any namespace a user can author into: component paths are
 * built from folders in the project tree, and `#` is not a legal folder
 * character. A collision would put two components with one name in the export,
 * which is a runtime coin toss — {@link buildBenchExport} therefore also
 * removes any same-named component before splicing, and a spec pins the case.
 */
export const BENCH_COMPONENT_NAME = '/#bench';

/** The id of the instance node inside the harness — stable, so `rootNode` is predictable. */
export const BENCH_NODE_ID = 'bench-subject';

/**
 * How `getPorts()` publishes a component **input**. See the module note: this
 * is the *second* of the two inversions, and it is the one the runtime reads.
 */
const PUBLISHED_AS_INPUT = 'input';

/** One input the bench can offer a control for. Shaped as `getPorts()` publishes it. */
export interface BenchPort {
  name: string;
  /** `'*'` when `getPorts` could not derive one — an input wired to nothing. */
  type: unknown;
  /** Only ever present when the port has exactly one connection; see `_deriveDef`. */
  default?: unknown;
  group?: string;
  index?: number;
}

/** What a component offers a bench: the form's schema, and why it might be empty. */
export interface BenchInterface {
  /** Declared component **inputs** — `getPorts()` entries plugged `'output'`. */
  inputs: BenchPort[];
  /** Declared component **outputs** — plugged `'input'`. BEN-003's read-out reads these. */
  outputs: BenchPort[];
  /**
   * Names declared on a `Component Inputs` node the wrong way round, so they
   * are not part of the interface at all (LAS-001 / phase-55 F8).
   *
   * Carried because this is the one place a human ever sees the consequence: a
   * component with eleven "inputs" and an empty rail is not a component with no
   * interface, it is a component whose interface is backwards, and the bench is
   * where that becomes visible instead of merely true.
   */
  backwards: string[];
}

export interface BenchMount {
  /** The component to mount, by legacy name (`/Components/Card`) or path form. */
  target: string;
  /** Input values, keyed by declared input port name. */
  inputs?: Record<string, unknown>;
  /*
   * 🔴 There is deliberately **no `frame`/`stretch` here**, and there was until
   * FIX-011 removed them.
   *
   * They were accepted and echoed straight back onto the result — and **no
   * caller ever passed one and no reader ever read one**, so what the pair
   * actually did was describe a capability the export does not have. FIX-011
   * went looking for where the bench's height was handled, found a `height?`
   * declared right here, and had to read three more files to establish that it
   * had never been connected to anything. That is the cost of a lying type: it
   * answers the question wrongly and the reader believes it.
   *
   * The frame is applied by the *surface* (`ComponentBench`), and that is the
   * design rather than an omission: making it a build input would put a
   * `location.reload()` on the frame control, because a changed export makes the
   * runtime reload and destroys the state someone opened the bench to look at.
   * See the module note.
   */
  /** `sample_data`-shaped records for the backend the component runs against (BEN-006). */
  userData?: AgentSampleData;
  /** False for "Real backend": ship no dataset, so nothing is faked. */
  useSampleData?: boolean;
  /** Whether the bench runs signed in as the sample user. Defaults to `true`, as POL-008 settled. */
  signedIn?: boolean;
}

export interface BenchExport extends SandboxExport {
  /** The interface the parameter set was built from — the inputs rail's schema (BEN-002). */
  interface?: BenchInterface;
  /*
   * 🔴 The matching half of the removal above: this claimed the frame was
   * "echoed back so the surface can size its stage", and nothing ever wrote it.
   * The surface owns the frame outright. See `BenchMount`.
   */
}

/** Both spellings of a component reference resolve, exactly as the validator's do. */
function findComponent(project: ProjectModel, target: string): ComponentModel | undefined {
  const trimmed = target.trim();
  const both = trimmed.startsWith('/') ? [trimmed, trimmed.slice(1)] : [`/${trimmed}`, trimmed];
  for (const name of both) {
    const found = project.getComponentWithName(name);
    if (found) return found;
  }
  return undefined;
}

/**
 * The ports the harness may set, read off the live component.
 *
 * `getPorts()` is the source because it is the one the runtime agrees with, and
 * because it carries the type/default/group/index the rail needs. Its honest
 * limitation is that `type` is derived from *connections*: an input wired to
 * nothing comes back `'*'` with no default, which on the corpus is the normal
 * path and not an edge case. The form degrades — it does not guess.
 *
 * `backwards` is read off the **raw declared** ports instead, the way
 * `validation/componentInterface` reads them, because a port pointed the wrong
 * way does not appear on `getPorts()`' input side at all — it silently crosses
 * to the output side, and its absence from the rail is the thing worth naming.
 */
export function benchInterface(component: ComponentModel): BenchInterface {
  const ports = component.getPorts() ?? [];
  const inputs: BenchPort[] = [];
  const outputs: BenchPort[] = [];

  for (const port of ports) {
    const entry: BenchPort = {
      name: port.name,
      type: port.type,
      default: port.default,
      group: port.group,
      index: port.index
    };
    // The inversion, and the only line in this module that depends on it.
    if (port.plug === PUBLISHED_AS_INPUT) inputs.push(entry);
    else if (port.plug === 'output') outputs.push(entry);
  }

  const declared = new Set(inputs.map((p) => p.name));
  const backwards: string[] = [];
  // NB: a truthy return from this callback ABORTS the walk. Return nothing.
  component.graph.forEachNode((node: NodeGraphNode) => {
    if (String(node.typename ?? '') !== 'Component Inputs') return;
    for (const port of (node.ports ?? []) as Array<{ name?: unknown; plug?: unknown }>) {
      const name = typeof port?.name === 'string' ? port.name.trim() : '';
      const plug = typeof port?.plug === 'string' ? port.plug : '';
      if (!name || declared.has(name) || backwards.includes(name)) continue;
      if (plug && plug.indexOf('output') === -1) backwards.push(name);
    }
  });

  return { inputs, outputs, backwards };
}

/**
 * The mounted component's interface, re-derived from the live project.
 *
 * Separate from {@link buildBenchExport} because the two have different costs.
 * Rebuilding the export re-serialises the whole project and, if the bytes
 * changed, makes the runtime call `location.reload()` — so a component whose
 * graph is being edited beside the bench would flash and lose its state on
 * every port added. Re-deriving the *interface* is one `getPorts()` call on one
 * component and reloads nothing.
 *
 * That split is what lets a new `Component Inputs` port appear in the rail
 * while the running bench keeps its state: the runtime already learned about
 * the graph edit from the editor's ordinary broadcast `modelUpdate` stream
 * (`Model.portAdded` and its siblings), because the bench's export contains the
 * component being edited. The rail was the only half that had no way to know.
 */
export function benchInterfaceFor(project: ProjectModel, target: string): BenchInterface | undefined {
  const component = findComponent(project, target);
  return component ? benchInterface(component) : undefined;
}

/**
 * The component the bench is pointed at, resolved the way everything else here
 * resolves one — both spellings of a reference, exactly as the validator's do.
 *
 * Exported for BEN-005: a scenario is stored in the component's own metadata,
 * so the surface needs the model and not just its interface. Re-implementing
 * the lookup there would be a second answer to "which component is
 * `Components/Card`", and the two would eventually disagree.
 */
export function benchComponent(project: ProjectModel, target: string): ComponentModel | undefined {
  return findComponent(project, target);
}

/** How the rest of the project already uses the component on the bench. */
export interface BenchInstanceUsage {
  /** Nodes in the project that instantiate the target. */
  instances: number;
  /** Of those, how many pass at least one parameter. */
  withParameters: number;
  /** The parameter names they pass, deduplicated — the interface they believe in. */
  parameterNames: string[];
}

/**
 * BEN-002 — what the empty inputs rail says instead of nothing.
 *
 * "This component declares no inputs" is true and useless on its own. If eleven
 * places in the project are already passing `name` and `price` to it, then the
 * component does not lack an interface — its interface is **backwards**
 * (LAS-001), every one of those parameters is landing on a port that does not
 * exist, and the rail's emptiness is the symptom rather than the fact.
 *
 * This is the number that turns the first into the second, and the bench is the
 * only surface in the product where a human is looking at exactly the right
 * thing at exactly the right moment to be told it.
 *
 * ⚠️ A truthy return from `forEachNode` aborts the walk — the callbacks below
 * deliberately return nothing.
 */
export function benchInstanceUsage(project: ProjectModel, target: string): BenchInstanceUsage {
  const component = findComponent(project, target);
  if (!component) return { instances: 0, withParameters: 0, parameterNames: [] };

  const legacyName = component.name;
  const parameterNames = new Set<string>();
  let instances = 0;
  let withParameters = 0;

  for (const owner of project.getComponents()) {
    if (owner.name === legacyName || owner.name === BENCH_COMPONENT_NAME) continue;

    owner.graph.forEachNode((node: NodeGraphNode) => {
      if (String(node.typename ?? '') !== legacyName) return;
      instances += 1;

      const names = Object.keys(node.parameters ?? {});
      if (names.length === 0) return;
      withParameters += 1;
      for (const name of names) parameterNames.add(name);
    });
  }

  return { instances, withParameters, parameterNames: Array.from(parameterNames) };
}

/**
 * The parameter set for the harness instance, built from the interface.
 *
 * Three rules, and the third is the one that matters:
 *
 * - an input present in `inputs` is set;
 * - an input absent from `inputs` but carrying a derived default is set to it,
 *   so a component previews the way it would in a page that leaves the port
 *   unwired rather than the way it would in a page that explicitly blanked it;
 * - a key naming no declared input is **dropped and named**. Passing it through
 *   would reproduce the phase-55 F2 defect — a parameter aimed at a port that
 *   does not exist, rendering nothing, reported as nothing — inside the tool
 *   built to expose exactly that.
 */
export function benchParameters(
  iface: BenchInterface,
  inputs: Record<string, unknown> | undefined
): { parameters: Record<string, unknown>; unknown: string[] } {
  const declared = new Map(iface.inputs.map((port) => [port.name, port]));
  const parameters: Record<string, unknown> = {};

  for (const port of iface.inputs) {
    if (inputs && Object.prototype.hasOwnProperty.call(inputs, port.name)) {
      const value = inputs[port.name];
      // `undefined` abstains, per the Empty-Value Contract: it means "I have not
      // set this", which is not the same as "set this to nothing", and letting
      // it through would shadow the default below.
      if (value !== undefined) {
        parameters[port.name] = value;
        continue;
      }
    }
    if (port.default !== undefined) parameters[port.name] = port.default;
  }

  const unknown = Object.keys(inputs ?? {}).filter((name) => !declared.has(name));
  return { parameters, unknown };
}

/** The harness: one component, one node, no connections, never owned by the project. */
export function benchHarness(targetLegacyName: string, parameters: Record<string, unknown>): ComponentModel {
  return ComponentModel.fromJSON({
    name: BENCH_COMPONENT_NAME,
    id: 'bench-harness',
    graph: {
      roots: [{ id: BENCH_NODE_ID, type: targetLegacyName, x: 0, y: 0, parameters, children: [] }],
      connections: []
    }
  });
}

function describe(component: ComponentModel, iface: BenchInterface, unknown: string[], visual: boolean): string {
  const parts: string[] = [];
  parts.push(
    iface.inputs.length === 1 ? '1 input' : `${iface.inputs.length} inputs`,
    iface.outputs.length === 1 ? '1 output' : `${iface.outputs.length} outputs`
  );
  let summary = `${component.name} on the ${WORKBENCH} — ${parts.join(', ')}.`;

  if (!visual) {
    summary +=
      ' This component has no visual root, so there is nothing to draw —' +
      ' feed it inputs and watch the outputs rail.';
  }
  if (unknown.length > 0) {
    summary += ` Ignored ${unknown.map((n) => `"${n}"`).join(', ')}: not a declared input.`;
  }
  if (iface.backwards.length > 0) {
    summary +=
      ` ${iface.backwards.map((n) => `"${n}"`).join(', ')} ` +
      (iface.backwards.length === 1 ? 'is declared' : 'are declared') +
      ' on a Component Inputs node with plug "input", which publishes it as a component OUTPUT —' +
      ' it must be plugged "output" to be settable here.';
  }
  return summary;
}

/**
 * Build the export for one bench mount.
 *
 * Returns the existing `SandboxExport` shape, deliberately, so the surfaces
 * already written for it — empty state, toolbar summary, notice chip — work
 * unchanged.
 *
 * ⚠️ Unlike `buildSandboxExport`, a component with no visual root is **not**
 * `unrenderable` here. Refusing it is right for a review document, where a
 * white rectangle is the only alternative. On the bench it is wrong: a
 * logic-only component is precisely what the outputs read-out exists to show,
 * and mounting it is the first time in this product's history that one has been
 * previewable at all. `unrenderable` stays on the interface untouched so the AI
 * preview's behaviour does not change.
 */
export function buildBenchExport({
  project,
  target,
  inputs,
  userData,
  useSampleData = true,
  signedIn = true
}: { project: ProjectModel } & BenchMount): BenchExport {
  const component = findComponent(project, target);
  if (!component) {
    return { unrenderable: `${target} is not a component in this project, so there is nothing to mount.` };
  }

  const json = Exporter.exportToJSON(project, { useBundles: false }) as unknown as SandboxExportJson | undefined;
  if (!json) {
    return { unrenderable: 'This project has no root component yet, so the runtime has nothing to boot.' };
  }

  const iface = benchInterface(component);
  const { parameters, unknown } = benchParameters(iface, inputs);
  const harness = benchHarness(component.name, parameters);

  // Splice, never apply: nothing is added to `ProjectModel` and nothing is
  // written. Filtering by name first covers the (unreachable-by-design, pinned
  // by a spec) case of a project component sharing the harness's name.
  json.components = json.components
    .filter((c) => c.name !== BENCH_COMPONENT_NAME)
    .concat([Exporter.exportComponent(harness) as { name: string }]);
  json.rootComponent = BENCH_COMPONENT_NAME;
  json.rootNode = BENCH_NODE_ID;

  // Routes are derived from the component set, so they are re-derived from the
  // set the bench is actually running. The harness is not a page and adds none.
  json.routerIndex = Exporter.getRouterIndex([
    ...project.getComponents().filter((c) => c.name !== BENCH_COMPONENT_NAME),
    harness
  ]);

  json.metadata = { ...(json.metadata ?? {}) };

  const visual = (component.graph.roots ?? []).some((node: NodeGraphNode) => node.type?.allowAsExportRoot);
  const summary = describe(component, iface, unknown, visual);
  const result: BenchExport = { json, interface: iface };

  if (!useSampleData) {
    delete json.metadata[SANDBOX_METADATA_KEY];
    return { ...result, summary: `${summary} Real backend — this ${WORKBENCH} uses your project’s live data.` };
  }

  // The closure starts at the harness, which reaches the target through its one
  // node and the target's own instances through the target — the same walk, and
  // the same depth cap, that guards a self-referencing component from hanging.
  const dataset: SandboxDataset = buildSandboxDataset({
    components: componentClosure(project, harness),
    userData,
    signedIn,
    // FIX-013 ruling 1(c) — the bench serves **no rows**. The component shows
    // its real empty state and the user feeds it through the inputs rail,
    // which is the whole of *"just let the user define the inputs and outputs,
    // done"*.
    //
    // ⚠️ **Hard-coded here rather than offered as an option, and that is the
    // ruling rather than a shortcut.** A bench that can be switched back to
    // synthesized rows needs a control to switch it with, and the control is
    // the reported defect. The AI preview keeps sample data — it goes through
    // `buildSandboxExport`, not this function — which is ruling 2 answered as
    // *the two surfaces diverge*.
    //
    // 🔴 This is **not** `useSampleData: false`. That uninstalls the network
    // shim and lets the preview reach the project's live backend (AC3's
    // violation); this keeps the shim installed and serving, with nothing in
    // it. See `SandboxMount.emptyState`.
    emptyState: true
  });
  json.metadata[SANDBOX_METADATA_KEY] = dataset;

  return {
    ...result,
    dataset,
    summary: `${summary} ${dataset.summary}`,
    notice: unknownShapeNotice(dataset.unknownShape)
  };
}

/* ------------------------------------------------------------------------ *
 * TVW-008 — the comparison board
 * ------------------------------------------------------------------------ */

/**
 * One frame on the board, fully resolved.
 *
 * Everything here is already decided by the time it arrives: the size has been
 * read from `bench.frame` or defaulted, the parameters have been through
 * {@link benchParameters}, and the position is where the person dropped it.
 * {@link boardHarness} does arithmetic and nothing else, so a spec can grade the
 * graph it builds without a `ProjectModel` anywhere near it.
 */
export interface BoardFrameMount {
  /** Legacy name — the form a node uses to instantiate a project component. */
  target: string;
  x: number;
  y: number;
  width: number;
  /**
   * The frame's height, or `null` for **as tall as its content**.
   *
   * `null` is the ordinary case and it mirrors `BenchFrame['height']`, where
   * absent means *fill the stage*. A board frame has no stage to fill, so the
   * equivalent honesty is the component's own height: `sizeMode:
   * 'contentHeight'` fixes the width and lets the content decide the rest
   * (`layout.ts:63`). Inventing a number here would draw every unmeasured
   * component as a 768px box and call it the component's size.
   */
  height: number | null;
  parameters: Record<string, unknown>;
  /**
   * The name of the scenario whose values this frame is showing, or `null` when
   * the component has none.
   *
   * ⚠️ **Carried on the mount rather than re-read by the caption**, and that is
   * the point of it: the editor draws `scenario: default` / `no inputs set`
   * beside each frame, and a caption that answered that question from its own
   * second read of `bench.scenarios` would be a second copy of the decision
   * {@link boardFrameMounts} already made — free to drift the moment either
   * side learns about a second scenario. `boardHarness` ignores the field.
   */
  scenario: string | null;
}

/** The id of the board's single root Group. Stable, so `rootNode` is predictable. */
export const BOARD_ROOT_ID = 'board-root';

/** Per-frame ids, derived from position in the list so they are stable across a re-export. */
export const boardFrameNodeId = (index: number) => `board-frame-${index}`;
export const boardInstanceNodeId = (index: number) => `${BENCH_NODE_ID}-${index}`;

/**
 * The height a content-sized frame is *assumed* to be while the board's extent
 * is computed, before anything has rendered.
 *
 * ⚠️ **An estimate, and named as one.** The root Group must be explicitly sized
 * — absolutely positioned children contribute nothing to a parent's content size
 * — so the extent has to be computed before the runtime has laid a single frame
 * out. The editor re-measures the real boxes for its captions, which is
 * `benchSizeLabel`'s standing rule: report the frame that was **measured**, not
 * the one that was asked for. Frames are absolutely positioned and unclipped, so
 * an under-estimate shows the whole frame anyway; it only costs scroll extent.
 */
export const ESTIMATED_CONTENT_FRAME_HEIGHT = 768;

/**
 * The board's extent, and the offset the runtime document is drawn at.
 *
 * 🔴 **The runtime document always starts at 0,0, and this is the one place that
 * knows how far it was shifted to get there.** A frame may legitimately sit at a
 * negative coordinate — someone dragged one left of where the first one landed —
 * but a `marginLeft` of `-500` inside the document pushes the frame out of its
 * own parent rather than moving the view. So the frames are normalised on the
 * way into the graph, and the editor draws its captions through the same
 * `minX`/`minY`. Two places computing that offset separately is how the captions
 * end up half a frame away from the frames.
 *
 * An empty board has no extent; `1 × 1` rather than `0 × 0` because a zero-sized
 * root is a Group the runtime has nothing to lay out and the surface shows its
 * own empty state over it anyway.
 */
export function boardBounds(frames: BoardFrameMount[]): { minX: number; minY: number; width: number; height: number } {
  if (frames.length === 0) return { minX: 0, minY: 0, width: 1, height: 1 };

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const frame of frames) {
    if (frame.x < minX) minX = frame.x;
    if (frame.y < minY) minY = frame.y;
    const height = frame.height ?? ESTIMATED_CONTENT_FRAME_HEIGHT;
    if (frame.x + frame.width > maxX) maxX = frame.x + frame.width;
    if (frame.y + height > maxY) maxY = frame.y + height;
  }

  return { minX, minY, width: Math.max(1, maxX - minX), height: Math.max(1, maxY - minY) };
}

/** A `dimension`/`number` port value. See the note on {@link boardHarness}. */
const px = (value: number) => ({ value, unit: 'px' });

/**
 * The board harness: one component, one root Group, one frame per picked
 * component, one instance inside each frame.
 *
 * 🔴 **This is the wrapper BEN-001 deliberately refused to build, so its reasons
 * are answered here rather than ignored.** That module's argument was that
 * `sizeMode` silently voids `width`/`height` and an unsized absolute Group fills
 * its parent (phase-55 F7), so a wrapper that gets either wrong makes a correct
 * component look broken *inside the tool built to tell you whether it is*. The
 * single bench sidestepped it by letting the **surface** be the frame. A board
 * has N frames in one document and cannot. What makes it safe here is that every
 * value below was read off the real port definitions rather than guessed:
 *
 * - **`sizeMode: 'explicit'`** on every frame, named rather than left to the
 *   default, because that is the only mode in which `Layout.size` assigns both
 *   `width` and `height` (`layout.ts:60`). This is BEN-001's warning, disarmed
 *   by saying the word.
 * - **`{ value, unit: 'px' }`, never a bare number.** 🔴 `width` and `height` are
 *   `dimension` ports whose **`defaultUnit` is `'%'`** and whose default is
 *   `100` (`node-shared-port-definitions.ts:1183`). A bare `768` is therefore not
 *   768 pixels, it is **768 percent** — a frame seven times its parent, which
 *   would read on screen as "the board is broken" and in the graph as correct.
 *   Verified against the corpus: every stored `width` in 129 projects is
 *   `{"value":N,"unit":"px"}`.
 * - **`layout: 'none'` on the root**, which is what makes the children
 *   absolutely positioned at all: `Layout.size` sets `position: 'absolute'` from
 *   `props.parentLayout === 'none'` (`layout.ts:56`), and `align` then defaults
 *   an absolute child to `left: 0; top: 0` (`layout.ts:120`). The offsets are
 *   margins from that origin, which is why they are `marginLeft`/`marginTop` and
 *   not `left`/`top` — there are no `left`/`top` ports.
 *
 * ⚠️ **The frames are normalised through {@link boardBounds}**, so a frame at a
 * negative coordinate moves the whole document rather than escaping its parent.
 */
export function boardHarness(frames: BoardFrameMount[]): ComponentModel {
  const bounds = boardBounds(frames);

  const children = frames.map((frame, index) => ({
    id: boardFrameNodeId(index),
    type: 'Group',
    x: 0,
    y: 0,
    parameters: {
      // Named rather than defaulted, because this is BEN-001's warning exactly:
      // the mode is what decides whether `height` is read at all.
      sizeMode: frame.height === null ? 'contentHeight' : 'explicit',
      width: px(frame.width),
      // Omitted entirely when the content decides it. Sending a height that
      // `contentHeight` ignores would put a number in the graph that nothing
      // reads — the kind of parameter a reader later mistakes for the answer.
      ...(frame.height === null ? {} : { height: px(frame.height) }),
      marginLeft: px(frame.x - bounds.minX),
      marginTop: px(frame.y - bounds.minY)
    },
    children: [
      {
        id: boardInstanceNodeId(index),
        type: frame.target,
        x: 0,
        y: 0,
        parameters: frame.parameters,
        children: []
      }
    ]
  }));

  return ComponentModel.fromJSON({
    name: BENCH_COMPONENT_NAME,
    id: 'bench-harness',
    graph: {
      roots: [
        {
          id: BOARD_ROOT_ID,
          type: 'Group',
          x: 0,
          y: 0,
          parameters: {
            layout: 'none',
            sizeMode: 'explicit',
            width: px(bounds.width),
            height: px(bounds.height)
          },
          children
        }
      ],
      connections: []
    }
  });
}

/** What {@link boardFrameMounts} resolved, and what it could not. */
export interface BoardFrameMounts {
  mounts: BoardFrameMount[];
  /** Frames naming a component this project no longer has, in board order. */
  missing: string[];
  /** `Component.port` for every stored scenario key naming no declared input. */
  unknownParams: string[];
}

/**
 * Every stored frame resolved against the project: its size, its values, and the
 * scenario those values came from.
 *
 * 🔴 **Extracted from {@link buildBoardExport} at slice 2 because the editor
 * needs the same answer, and needed it for the same frames.** The board draws
 * its own chrome — a border, a caption, a drag target — *over* the single
 * `<webview>` the export renders into, so the editor has to know each frame's
 * box and each frame's origin offset. Computing that beside the export rather
 * than from it is how the captions end up half a frame away from the frames,
 * which is the failure {@link boardBounds} already warns about in the one
 * direction it could see. One function, one answer, two readers.
 *
 * ⚠️ **The returned coordinates are the stored ones, un-normalised.** The
 * `minX`/`minY` shift belongs to {@link boardBounds}, and both readers apply it
 * from there — the harness into `marginLeft`/`marginTop`, the editor into the
 * position it draws chrome at.
 */
export function boardFrameMounts(project: ProjectModel, frames: BoardMount['frames']): BoardFrameMounts {
  const mounts: BoardFrameMount[] = [];
  const missing: string[] = [];
  const unknownParams: string[] = [];

  for (const frame of frames) {
    const component = findComponent(project, frame.target);
    if (!component) {
      missing.push(frame.target);
      continue;
    }

    const stored = readBenchFrameDefault(component.getMetaData(BENCH_FRAME_KEY));
    const scenario = readBenchScenarios(component.getMetaData(BENCH_SCENARIOS_KEY))[0];
    const iface = benchInterface(component);
    const { parameters, unknown } = benchParameters(iface, scenario?.inputs);
    for (const name of unknown) unknownParams.push(`${component.name}.${name}`);

    mounts.push({
      target: component.name,
      x: frame.x,
      y: frame.y,
      // `stretch` has no meaning here — there is no stage for a frame to stretch
      // to, which is the whole difference between a board and the single bench.
      // The stored width is the component's authored size either way.
      width: stored?.width ?? DEFAULT_BENCH_WIDTH,
      height: stored?.height ?? null,
      parameters,
      scenario: scenario?.name ?? null
    });
  }

  return { mounts, missing, unknownParams };
}

/** What {@link buildBoardExport} is asked to mount. Positions come from `bench.board`. */
export interface BoardMount {
  frames: Array<{ target: string; x: number; y: number }>;
  userData?: AgentSampleData;
  signedIn?: boolean;
}

/**
 * The board export: one harness, N instances, one client, one `<webview>`.
 *
 * ✅ **§5's N² landmine is not where the cost is, and the task overstated it.**
 * `Exporter.exportToJSON` already emits the whole project — every component the
 * board could show is in the JSON before this function adds anything — so N
 * frames add **2N nodes** (a frame Group and an instance), not N². The real cost
 * is *rendering*: the sum of each frame's transitive closure, measured at 21,488
 * nodes for the worst project in the corpus. That is the number R-7's picked set
 * removes, and capping a frame's depth never would have: the depth **is** the
 * component.
 *
 * ⚠️ **A frame naming a component that is gone is dropped and said out loud**,
 * for the reason `benchParameters` drops an unknown key: an instance node of a
 * type nothing defines renders nothing and reports nothing, which is the exact
 * defect class this surface exists to expose.
 */
export function buildBoardExport({
  project,
  frames,
  userData,
  signedIn = true
}: { project: ProjectModel } & BoardMount): BenchExport {
  const json = Exporter.exportToJSON(project, { useBundles: false }) as unknown as SandboxExportJson | undefined;
  if (!json) {
    return { unrenderable: 'This project has no root component yet, so the runtime has nothing to boot.' };
  }

  const { mounts, missing, unknownParams } = boardFrameMounts(project, frames);

  const harness = boardHarness(mounts);

  json.components = json.components
    .filter((c) => c.name !== BENCH_COMPONENT_NAME)
    .concat([Exporter.exportComponent(harness) as { name: string }]);
  json.rootComponent = BENCH_COMPONENT_NAME;
  json.rootNode = BOARD_ROOT_ID;
  json.routerIndex = Exporter.getRouterIndex([
    ...project.getComponents().filter((c) => c.name !== BENCH_COMPONENT_NAME),
    harness
  ]);
  json.metadata = { ...(json.metadata ?? {}) };

  const counted = mounts.length === 1 ? '1 component' : `${mounts.length} components`;
  let summary = `${counted} on the ${WORKBENCH} board.`;
  if (missing.length > 0) {
    summary += ` Dropped ${missing.map((n) => `"${n}"`).join(', ')}: no longer in this project.`;
  }
  if (unknownParams.length > 0) {
    summary += ` Ignored ${unknownParams.map((n) => `"${n}"`).join(', ')}: not a declared input.`;
  }

  const dataset: SandboxDataset = buildSandboxDataset({
    components: componentClosure(project, harness),
    userData,
    signedIn,
    // FIX-013 ruling 1(c), inherited: the board serves **no rows**, exactly as
    // the single bench does. A board is N benches side by side, and two
    // surfaces disagreeing about where their data comes from is the confusion
    // the whole of TVW-002 was written against.
    emptyState: true
  });
  json.metadata[SANDBOX_METADATA_KEY] = dataset;

  return { json, dataset, summary: `${summary} ${dataset.summary}` };
}
