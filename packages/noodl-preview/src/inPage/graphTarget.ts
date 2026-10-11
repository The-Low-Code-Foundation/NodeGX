/**
 * P112 OWN-003 — the real engine, with a way in, in a page.
 *
 * ```js
 * const target = NodegxGraphTarget.graphTarget();            // @noodl/runtime, every picker node registered, no viewer
 * const { spec } = NodegxGraphTarget;                        // @nodegx/node-spec's browser entry: scenarios, runner, grader
 * const handles = await target.mountGraph(nodes, wires);     // the graph as a scenario declares it
 * target.set(handles.a, 'value', 3); target.signal(handles.b, 'increase');
 * await target.settle();                                     // ONE frame, as the app's scheduler runs one
 * target.trace(handles.c);                                   // what the node sent, in the trace format every target shares
 * const report = await spec.runGraphScenarios(target, spec.reviveGraphScenarios(json, file));
 * ```
 *
 * This is the runtime test helper's `runtimeTarget` (`noodl-runtime/test/helpers/node-spec-target.ts`) bundled for a
 * browser, not a port of it: the same `adopt` / `intercept` / `settle` that record the reference traces the 76 graph
 * scenarios carry, so a home-made editor that runs a graph through this target shows the value the real app would send,
 * and `scripts/graph-target-check.mjs` says so in headless Chrome. What the bundle changes is only what a page lacks
 * (build.mjs, THE GRAPH TARGET): Node's `AsyncLocalStorage` (a request is attributed to the updating node), `buffer`'s
 * `File` (the page's own), and jsdom (never reached: a graph scenario mounts no node on a page).
 *
 * The viewer's picker nodes are the helper's own four lists, imported statically by the build from the files the lists
 * name (`nodegx-viewer-node-modules` is generated from them), and registered by the helper's `registerViewerModules` —
 * one list, one registration.
 *
 * @module noodl-preview/inPage/graphTarget
 */

import * as spec from '../../../nodegx-node-spec/src/browser';
import { registerViewerModules, runtimeTarget, type RuntimeTarget, type RuntimeTargetOptions } from '../../../noodl-runtime/test/helpers/node-spec-target';
import viewerModules from 'nodegx-viewer-node-modules';

export type { RuntimeTarget, RuntimeHandle, RuntimeTargetOptions } from '../../../noodl-runtime/test/helpers/node-spec-target';

/** A fresh engine with every picker node registered: one per play is what the runtime test does, and what a page should do. */
export function graphTarget(options: RuntimeTargetOptions = {}): RuntimeTarget {
  return registerViewerModules(runtimeTarget(options), viewerModules);
}

export { spec };
