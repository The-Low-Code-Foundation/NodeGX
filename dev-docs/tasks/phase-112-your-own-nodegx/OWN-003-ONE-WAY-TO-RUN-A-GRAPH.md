# OWN-003 — One way to run a graph

**Opened 2026-10-02.** **Depends on OWN-002 and on R1** (README §8).
**Status: 🟡 step 1 measured, s1 (2026-10-03); R1 to ask with §6. Steps 2–4 wait for the ruling.**
**Model:** **Fable.** Porting the test helper to a page and naming each divergence from the 76 scenarios is hard reasoning over two runtimes; a wrong reading here becomes every editor's wrong answer. At the start of a session on this task, and again if the work changes kind, say which model you are running on and whether this line says Richard should switch (README §0.2).

## 1. The person sentence

> **When a home-made editor shows a value moving down a wire, it is the value the real app would send, and there is a
> test that says so.**

## 2. Why

README §1 readings 3 and 6. `graph.ts` deliberately ships no graph interpreter. The prototype therefore wrote one
(`prototype/src/graphrun.ts`, 139 lines): every node settles, every recorded value or signal is carried down its wires,
repeat until a wave carries nothing. It has never been run against the 76 graph scenarios, it is known to differ on C7
(lockstep: the runtime delivers per setter inside one pass), and it gives every node its own `World`, so two nodes that
share a store (an Array and an Insert, a Variable and a Set Variable) cannot see each other. That last choice is most of
why only 19 of the todo template's 531 nodes could run.

## 3. What to build

1. **Measure the real engine in a page (no ruling needed).** Can `@noodl/runtime` mount a component headless in a
   browser, with no viewer, and run its logic? The P107 runtime target (`noodl-runtime/test/helpers/node-spec-target.ts`)
   already runs nodes headless in Node; try the same in a page. Record: does it load, how large is it minified, which
   node types fail without a viewer, and how long a frame takes on the todo template's biggest logic component. Put the
   numbers in §6, then ask R1 with them.
2. **If R1 rules the tested runner:** add `runGraph` to `@nodegx/node-spec` that implements the package's own
   `GraphTarget` (`mountGraph`, `connect`, `settle`, `trace`), with **one `World` per graph**, so the registry, the
   backend script and the clock are shared the way the scenarios already play them ("one store per play"). Grade it
   with the 76 scenarios through the existing runner. Live edits (`addNode`, `removeNode`, `addWire`, `removeWire`)
   come from the prototype's runner, with C11's rule kept: a new wire hands the receiver the source's current value.
3. **If R1 rules the real engine:** wrap it in the same `GraphTarget` so the suite (OWN-006) grades it the same way, and
   so an editor can swap one for the other.
4. **Either way, the suite grades an editor's own runner** through `graphTarget()` on its adapter (OWN-006). Writing
   your own is allowed; passing is required.

## 4. Acceptance criteria

1. Step 1's numbers are in §6, with the date and commit, and R1 has been asked with them in plain words.
2. The chosen runner passes 76 / 76 graph scenarios, or every scenario it does not pass is listed with the clause, the
   runner's own sentence for why, and a row in P107's §6 if it is a runtime question.
3. The prototype runs on the chosen runner; its `#selftest` still fails all three missions and its `#demo` still passes
   all three.
4. Rerun OWN-000's census with "runnable in a page" meaning "runnable on the chosen runner". Record how far the 19 of
   531 moved.

## 5. Watch for

- P107 G1: C6's sentence ("never computes from a half-updated upstream") is false for a per-setter node on the runtime.
  A runner that is atomic per frame will "fail" scenarios the runtime itself fails its claims on. Read each scenario's
  `row` and `divergence` fields before calling a red a defect.
- Memory: *a settle that only drains is not a frame*. The runtime target needed two holes fixed to pass the graph
  scenarios. Expect the same here.

## 6. Built

**Step 1, measured s1 (2026-10-03) on `77c8ffdf8`, headless Chrome, esbuild.**

1. **`@noodl/runtime` bundles for a browser as it is**: `noodl-runtime.ts` → one IIFE, platform browser, minified:
   **807 KB** (no errors). Of that: `src/nodes` 450 KB, `@noodl/backend-contract` 81 KB, `src/api` 65 KB,
   `fast-xml-parser` 33 KB, `node.ts` 17 KB, `nodecontext.ts` 16 KB, `models` 15 KB, `editorconnection.ts` 10 KB.
   For comparison the spec package's browser entry is 520 KB with 86 specs; the runtime is every node.
2. **It constructs and registers in a page**: `new NoodlRuntime({ type: 'browser', platform: { requestUpdate,
   getCurrentTime, objectToString } })` the way the Node headless target does
   (`noodl-runtime/test/helpers/node-spec-target.ts:762-776`), `context.styles` stubbed as there; **80 node types
   registered**; `context.nodeRegister.createNode('Counter', 'c1')` returns a node; all in **65 ms** from script
   start. The 80 are the runtime's own: the viewer's (visual nodes, Router, Navigate, Page Inputs, HTTP…) are
   registered by `noodl-viewer-react`, which the bundle does not include (`withViewerNodes` in the helper adds
   13 of them by file).
3. **Driving it is the open half.** The page's guessed calls (`setInputValue`, `sendSignalOnInput`, a timer, the
   scheduler) left `currentCount` undefined: a node in the runtime is driven through a scope and a frame, which
   the helper's `adopt()` and `settle()` do (:1176-1215 and after) in **Node only** — the helper imports
   `async_hooks` and `buffer`, installs the spec package's world over the globals, and knows the runtime's frame
   boundary. So the measurement says: **the engine loads and builds nodes in a page; what does not exist yet is a
   browser-side way to set, signal and settle it**, which is exactly what a `GraphTarget` wrapper (§3.3) would be.
   Not measured this session: which node types fail without a viewer at run time, and the frame cost on the todo
   template's biggest logic component.

**R1, with the numbers (plain words):** the real engine is 807 KB minified and does load and build nodes in a page
in 65 ms; the spec package is 520 KB and runs 37 node types fully in a page today (CENSUS.md). The engine runs every
non-visual type (the census's "unspecced" bucket is 1,071 Component Inputs / Outputs out of 1,229). What the engine
lacks in a page is the thing the Node test helper has: a way to set inputs, send signals and run a frame outside the
viewer. Recommendation unchanged (README §8 R1): **the real engine, behind the package's own `GraphTarget` interface**
(a browser port of the helper's `adopt` / `settle`), so every home-made editor runs the reference; the spec runner
stays the grader.
