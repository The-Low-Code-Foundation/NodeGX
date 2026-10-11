# OWN-003 — One way to run a graph

**Opened 2026-10-02.** **Depends on OWN-002 and on R1** (README §8).
**Status: 🟢 built, s8 (2026-10-11, Fable): steps 2–4 — the real engine with a way in, in a page (`@noodl/preview`'s `noodl-graph-target.js`: the runtime test helper bundled, not ported), 85 / 85 graph scenarios passed in headless Chrome with traces equal to the Node recordings, the control red, the census re-run (todo-list 19 of 531 → 382 of 883 headless), and the suite grading an adapter's runner (§6.1). Found and fixed P112-S8-SESSIONLEAK. Step 1 measured s1 (2026-10-03); R1 ruled s6 (2026-10-10): the real engine, opened up.**
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

**Since, from OWN-004 s4 (2026-10-10) — evidence for R1, measured.** Orbit, the prototype's own app, rewritten as v2
files and run by the real engine in a page (OWN-004 §6.2), has a bug the prototype's runner (`prototype/src/graphrun.ts`,
wave-at-a-time) never showed: Skip more than five minutes into Focus went to Break and straight back, because in the
engine the toggle's new phase length reaches *Seconds left* before the reset's new count does. Replayed on `GraphRun`
at the same point: Break, elapsed 0 — no bounce. **An editor running its own loop showed its author a working app that
was not.** The real engine also already runs in a page whole, viewer included, through `@noodl/preview` (the deploy
runtime, 1.74 MB, every template); what still does not exist is setting an input or sending a signal into it from
outside, which is this task's step 2. Not yet asked again: R1 (README §8).

**Since, from OWN-004 s6 (2026-10-10) — the prototype's missions now play on the real engine.** `prototype/real/orbit.html`
checks each mission on a copy of the files in a second real app in the same page (a second `mountPreview`), with the
scenario written into the copy as parameters, presses made on the copy's own buttons and the verdict read off its
screen. All three fail on the graph as it starts and pass after Show me (OWN-004 §6.4). So for a *mission*, "run the
real app" already works with no way in but the files and the screen; what it cannot do is what a graph scenario
needs — set one input, send one signal, settle, read one port — which is still step 2. AC3's `#selftest` / `#demo`
now have a real-engine form (`real/check.mjs`'s mission arm; `?demo`); `page.html` was removed on Richard's ruling
(s6), so step 3 means `real/orbit.html`.

### 6.1 Steps 2 to 4 — the real engine, opened up, in a page (s8, 2026-10-11, Fable)

**What was chosen, and why it is not a port.** The way in already existed in Node: the runtime test helper
(`noodl-runtime/test/helpers/node-spec-target.ts`, `runtimeTarget()`) is the `GraphTarget` that RECORDED every graph
scenario's `expect` — its `adopt` / `intercept` / `settle` are the definition of "what the real app sends", frame by
frame. A port of its 3,400 lines would have been a second copy of that definition (memory: a second copy of a palette
drifts silently). So the page gets the helper itself, bundled: **`@noodl/preview`'s `dist/browser/noodl-graph-target.js`**
(`src/inPage/graphTarget.ts`, global `NodegxGraphTarget`, built by `npm --prefix packages/noodl-preview run build`), the
helper with `@noodl/runtime`, the viewer's picker nodes it lists and `@nodegx/node-spec`'s browser entry in one script.
`graphTarget()` is a fresh engine with every picker node registered; `spec` is the spec package's browser entry (the
runner, `reviveGraphScenarios`, the grader). What a page lacks is replaced in the build and named there (build.mjs, THE
GRAPH TARGET): `async_hooks` (a call-stack-only `AsyncLocalStorage`, `src/inPage/asyncLocalStorage.ts`), `buffer`'s
`File` (the page's own), `jsdom` (a constructor that throws — a graph scenario mounts no node on a page) and the
package's `/node` entry (the browser entry instead). The helper itself changed in three small ways, each platform-free:
`withViewerNodes` split into the Node loader and `registerViewerModules(target, modules)` (a page hands it statically
imported modules — the build generates that module from the helper's own four lists, so the page registers exactly what
Node does); the `Noodl` global stand-ins moved into `ensureAppGlobals()`, called before any visual module loads (a
visual node's module reads `Noodl.deployed` at load; the first page run died there); and `installUser` installs the
play's storage by descriptor (P112-S8-SESSIONLEAK below).

**The gate: `npm --prefix packages/noodl-preview run graph-target-check`** (`scripts/graph-target-check.mjs`): the
spec package's graph scenarios — **85 today** (36 files; the task file's 76 was s1's count) — on `graphTarget()` in
headless Chrome, a fresh engine per scenario as `graph.test.ts` does, graded by the spec package's own
`runGraphScenarios` against the `expect` the Node helper recorded and the claims. `--mutant two-frames` is the control
(a `settle()` that runs two frames: a runner wrong the way §5 warns of); `--types <file>` writes the engine's type list
for AC4; `--only <text>` narrows.

**Readings (2026-10-11, headless Chrome, `baa70f788` + this session's edits):**

| | |
|---|---|
| the bundle | **2,881 KB** minified (es2020; 5,883 KB unminified); the in-page preview beside it is 1,637 KB; the two are separate on purpose — an editor that only shows the app does not pay for the engine twice |
| node types registered in the page | **130** (the runtime's 80 + the helper's four lists: 23 + 8 + 18 + 1); Node registers the same 130 |
| run 1 | the bundle did not load: `ReferenceError: Noodl is not defined` from `addDimensions` (node-shared-port-definitions) — ESM evaluates the visual modules before any code runs; fixed by `ensureAppGlobals()` as the generated module's first import |
| run 2 | **80 / 85** — five red, all one cause: `s10` ×4 and `s11` ×1 read the person the PREVIOUS play signed in (`bea@example.com` for `ann@example.com`; a create carrying `u2`'s ACL). **P112-S8-SESSIONLEAK:** `installUser` set `globalThis.localStorage = {}`; a page's `localStorage` is a getter-only accessor, the assignment did nothing, and the real `SessionStore` read the page's storage, which outlives a play. Installed by descriptor, as `installWorld` installs the clock and the network |
| run 3 | **85 / 85 passed**, traces equal to the Node recordings, in **1,230 ms** for all 85 (about 15 ms a scenario); the Node test: 96 / 96 in 4.1 s |
| the `async_hooks` shim, measured both ways | a shim that also carried the store across `.then` continuations: 85 / 85; the call-stack-only shim: 85 / 85 — the simpler one ships, with what it cannot attribute written in its header |
| the control, `--mutant two-frames` | **6 / 85 red** (clauses C9, N, S2) — the gate reads red on a wrong runner |
| `graph.test.ts` after the helper edits | 96 / 96 (run three times across the edits) |

**AC4 — the census on the chosen runner** (`node scripts/own/census.js`, which now reads `engine-types.json`, written
by the check's `--types`; CENSUS.md "On the real engine"). "Runnable in a page" now means the page's engine registers
the type: **todo-list 19 of 531 → 382 of 883 headless**, and 398 more through the real app (visual, R4). Over the 13
templates on disk (10,093 nodes; `templates/nightbook` is a peer's, untracked today): **4,154 headless, 4,049 visual,
158 unregistered** — the cloud-function nodes (`noodl.cloud.request` / `response` / `secret` / `createuser` …, 146;
the browser engine does not register the cloud runtime's) and `CSS Definition` (12; an editor-only node). The
spec-runner table above the new section is unchanged: 37 types run on specs alone; the engine runs 130.

**Step 4 — the suite grades an editor's runner.** `@nodegx/project-contract/editor-suite`: `SuiteOptions.graph`, a
`GraphGrader` the caller hands in (the suite stays free of the spec package); `runSuite` hands it a factory over
`adapter.graphTarget()` when the adapter has one — **a fresh runner per scenario**, because the recordings were made on
one (the first run of the prototype's bridge on a single shared engine differed on 10 of 85, nine by an id minted from
the world's stream and one by a popup's state; P112-S8-SHAREDTARGET, OWN-006 §6.4) — and appends its sentences; an
adapter WITH a runner and NO grader is **not** a pass (a check that silently skips reads green on nothing). The command
(`editor-suite-node.ts`) builds the grader from the spec package's loader and runner (`graphGraderFromNodeSpec`; the
sibling import is named in P116's import gate, which now also catches a relative import that leaves the package).
A second door, `playGraph(scenario, file)`, is for a runner that lives in a page: the editor plays the scenario itself
with the spec package's own driver and hands the trace back — a step-by-step proxy over CDP reads nested popups (t12) a
frame early, because every round trip is an event-loop turn the reference never had (OWN-006 §6.4). Graded in
`noodl-runtime/test/node-spec/editor-suite-graph.test.ts` (six arms: each door passes on the engine and fails on the
two-frames control naming C9; no grader is no pass; no runner is files only). The prototype page offers the second
door (`suite-adapter.mjs` `playGraph()`, `orbit.html` `__orbit.graph`) and **passes the suite, files and 85 / 85
graph scenarios, in 11.4 s**.

**AC3, as it stands.** The prototype IS on the chosen runner since s6: `real/orbit.html` runs Orbit on the real engine
through `@noodl/preview` and checks each mission on a copy in a second real app (`real/check.mjs`, `?demo`). What this
session adds is the same engine with the way in beside it, in the same package, for the editor that wants to set one
input and read one port without the whole app.

**Not measured here:** the engine's frame cost on the todo template's biggest logic component in a page (step 1's
open item; the scenarios are 2–6 nodes); whether a kit consumer's bundler re-bundles the helper or takes the built
script (OWN-011 decides; today the built script is the kit's).
