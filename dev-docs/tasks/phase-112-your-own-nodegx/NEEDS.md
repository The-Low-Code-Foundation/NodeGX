# NEEDS — what two prototypes needed that no package could give them

> **s6 (2026-10-10):** the original page and its build (`page.html`, `src/`, `tools/genpicker.ts`) were removed on Richard's ruling; every `page.html:N`, `src/…:N` and `tools/genpicker.ts:N` below is a line at `d4f6fb637` (`git show d4f6fb637:dev-docs/tasks/phase-112-your-own-nodegx/prototype/<path>`). The prototype now is `prototype/real/orbit.html`, on the real app (OWN-004 §6.4).

**OWN-000 §3.1. Written 2026-10-03 from the working tree at `c25fb8ee5`**, reading [`prototype/`](prototype/README.md)
(Orbit, 2026-10-02) and [`prototype-under-the-lid/`](prototype-under-the-lid/README.md) (Under the Lid, 2026-10-03) line
by line. One row per question a prototype answered. Columns: where it got the answer (file and line), whether that place
is a package an outsider can install today (`npm view` 2026-10-02: nothing but `@nodegx/core` is; README §1 reading 8), and
which task moves it. The second half of this task, the editor-knowledge census, is NSP-021's and is linked from §3, not
copied.

Both prototypes were built by an agent in one conversation each. Neither could import anything: Orbit bundled the spec
package from its TypeScript source with two aliases and a define; Under the Lid imported nothing at all and hand-copied
what it needed. **Every row below is a thing an agent building "its own NodeGX" today has to find in this repo by reading.**

## 1. Orbit (`prototype/`)

| # | the question | where Orbit got the answer | installable? | moves in |
|---|---|---|---|---|
| 1 | which nodes exist, their display names and categories | `tools/genpicker.ts:2-8`: `specs` from `nodegx-node-spec/src/nodes`, names and categories from `noodl-types/src/node-catalog.json`; written to `src/picker.json` | no: `@nodegx/node-spec` is private with a TypeScript `main`; the catalog is a source file in `@noodl/types` | OWN-002 (the package); NSP-018 (the spec speaks for the catalog) |
| 2 | which of them can run in this page | `tools/genpicker.ts:9-16`: `needs ⊆ {clock, random, timezone}`, mounts with `{}`, has ports; 36 at scoping, **37 now** ([CENSUS.md](CENSUS.md)) | no | OWN-003 (the chosen runner decides what "runnable" means; AC4 re-runs the census) |
| 3 | a node's ports: names, display names, descriptions, types, enums, which are signals | `src/entry.ts:19-33` `describe()`: `spec.inputs` / `spec.outputs` plus a mounted instance's `derivedInputs` / `derivedOutputs` | no | OWN-002; the derived ports need a mounted instance today, which is NSP-020's `ports(params)` |
| 4 | mount a node, set an input, send a signal, settle, advance its clock | `src/graphrun.ts:10-12`: `mount / set / signal / settle / advance` from `src/interpreter`, `specFor` from `src/nodes`, `World` from `src/world` | no | OWN-002 |
| 5 | run a **graph**: carry each recorded value and signal down its wires, in frames | invented: `src/graphrun.ts:94-137`, wave-at-a-time, one `World` per node (`:52`, `:65`), never graded | nothing to install: `graph.ts` ships no runner on purpose | OWN-003 (R1) |
| 6 | a new wire hands the receiver the source's current value (CONTRACT C11) | `src/graphrun.ts:68-78` `addWire`, written from reading `connectInput` | no | OWN-003 |
| 7 | which nodes need the clock | `src/graphrun.ts:50`: `spec.needs` includes `'clock'` | no | OWN-002 (ships with the spec) |
| 8 | the project: which nodes, with which parameters, wired how | invented shape: `src/app.ts` (`NodeDecl` / `WireDecl`, `"node.port"` strings), not v2 files | no: the v2 format lives in `noodl-editor/src/editor/src/schemas/` | OWN-001 |
| 9 | the visual nodes, their ports, their parent, where they sit on the screen | hand-declared: `page.html:301-309` `GHOSTS`, `:311` `PARENT`, `:313-322` `REGION`, `:325-329` `GHOST_WIRES` | no: 0 of 19 visual nodes has a spec | NSP-016 (specs); OWN-004 meanwhile (the real preview) |
| 10 | what the app looks like right now | drawn by hand from the ghosts' wire values: `page.html:716-726` | no | OWN-004 |
| 11 | a type's display name | `page.html:335-336`: from the picker (row 1) plus one hand patch (`net.noodl.animatetovalue`) | no | catalog, then NSP-018 |
| 12 | is this output a signal (wire colour, pulse) | `page.html:744` `NGX.describe(...).outputs[…].signal`; a ghost's outputs are always signals (`:744`) | no | OWN-002; NSP-016 for the ghosts |
| 13 | is this input wired, and may it be edited | `page.html:1027`: a `wiredIn` set, and a hand-typed regex of States' derived parameter names (`type-`, `transition`, `value-`, `startState`, `currentState`) | no | NSP-020 (which inputs are parameters), OWN-006 (the edit vocabulary) |
| 14 | the card colour scheme per category | `page.html:523-526` `SCHEMES` copied from `noodl-runtime/src/nodelibraryexport.ts:327-368` (itself the second copy of `CanvasTheme`'s derivation); category decided at `:540` as ghost → `visual`, else `default` | no | OWN-005 |
| 15 | wire colours | `page.html:527` `WIRE` copied from `CanvasTheme.ts:155-156` fallbacks | no | OWN-005 |
| 16 | the ground colour | `page.html:466` `#141318` = `CanvasTheme.ts:80` fallback | no | OWN-005 |
| 17 | card metrics (150 wide, header 44, row 20, foot 8, indent 20, child gap 10) | `page.html:365-368`, read from `NodeGraphEditorNode.ts:18-33` (`size`, `childMargin`, `childSpacing`, `propertyConnectionHeight`, `headerChipSize`) | no | OWN-005 |
| 18 | the structure lane (inset 12, top 34, radius 10, wash `#5ca9ff` at .05, dashed outline, the `STRUCTURE` eyebrow) | `page.html:640-672`, read from `structureLane.ts:49` `StructureLane` and its helpers | no | OWN-005 |
| 19 | the fonts | `page.html:475` its own CSS `--ui` / `--mono`, matching `CanvasTheme.ts:304-307` `CanvasFonts` by eye | no | OWN-005 |
| 20 | a fresh copy of the graph to check a mission on | `src/entry.ts:11` `createFrom`; `page.html:1142-…` `MISSIONS` | no | OWN-006 (a scenario on the editor's own runner) |
| 21 | how many specs there are | `src/entry.ts:15` | no | OWN-002 |
| 22 | Node's `crypto` and `process.env.TZ` in a page | stubbed: `src/crypto-stub.js`; `build.sh` `--alias:crypto`, `--define:process.env.TZ=undefined` | no | OWN-002 |
| 23 | getting the package into a page at all | `build.sh`: esbuild from `src/entry.ts` to an IIFE; `main` is `src/index.ts` | no | OWN-002 |

## 2. Under the Lid (`prototype-under-the-lid/`)

Under the Lid explains, where Orbit edits. It imported nothing and copied by hand, so its rows are the price of **not**
having the kit, item by item.

| # | the question | where Under the Lid got the answer | installable? | moves in |
|---|---|---|---|---|
| 24 | the project | hand-written in the **deployed** shape, `under-the-lid.html:594-671`: `sourceId / sourcePort / targetId / targetPort`, nodes nested as `children` objects, `ports` with `plug`. That is the shape `noodl-runtime/src/nodescope.ts:100-146` reads; the v2 files on disk are `fromId / fromProperty / toId / toProperty` with `children` as ids. **Two shapes, and nothing says which one "the format" is** | no | OWN-001 must name both: v2 is what an editor writes; the deployed shape is what the runtime loads, and the transform between them is part of the package |
| 25 | node labels (the editor keeps them, the export drops them) | `:673-677` `LABELS`, hand-typed | no | OWN-001 (v2 `label`) |
| 26 | port display names | `:679-686` `PORT_NAMES`, 41 names hand-typed | no | the spec's `displayName` (OWN-002) for specced nodes; NSP-016 and NSP-020 for the rest |
| 27 | type display names | `:688-691` `TYPE_NAMES`, 14 hand-typed | no | the catalog; NSP-018 |
| 28 | which ports are signals | `:693` `SIGNAL_PORTS`, 16 hand-typed | no | the spec; NSP-016 for visual ports |
| 29 | the world: the clock, the network's answer | `:696` `WORLD` | no | OWN-002 (`World`) |
| 30 | the engine: one object per node, inputs and outputs, a queue of steps, frames | `:748-911` `Inst` and the tape, "a small model of NodeGX's runtime, written for this page" (its own footnote) | no | OWN-003 (R1) |
| 31 | what Counter does | `:752-771` `CounterCore`, **ported by hand** from `nodegx-node-spec/src/nodes/counter.ts`, with a bug that can be planted | no | OWN-002 (import the spec) |
| 32 | what the other 13 node types do (Page, Group, Text, Image, Button, Text Input, Repeater, Component Inputs, Static Array, Repeat, Expression, HTTP Request, States) | `:913-1136` `DEFS`, hand-written handlers with narration | no | the spec for the 6 that have one; NSP-016 for the 7 visual; NSP-017 for Expression |
| 33 | a visual node's parameter as CSS (`backgroundColor`, `fontSize {value, unit}`, `clip`, `flexDirection`, `transformX`) | `:780-789` `STYLE`, `PROPS` | no | NSP-016; OWN-004 meanwhile |
| 34 | how a component instance is built from its template (Repeater rows, Component Inputs ports) | `:1137-1152` | no | OWN-003; NSP-015's graph scenarios already play it |
| 35 | which nodes have a spec, in which batch, whether they conform, and the file | `:1659-1672` `SPEC_INFO`, 8 entries hand-typed | no: P107's `census.json` has the batch and tier; **nothing machine-readable says "conforms on the runtime"**, the results live in run logs | OWN-002 (`specFor`); a conformance ledger is a new need, logged for P107 / OWN-010 |
| 36 | the Counter scenarios | `:1750-1757` `SCENARIOS`, six, hand-transcribed from `scenarios/Counter.json` | no: the loader is `src/runner/scenario.ts`, which imports `fs` | OWN-002 (scenarios shipped as data; the loader on the Node entry) |
| 37 | a conformance runner in a page | `:1778-1815`, its own (seeded random sequences, step by step) | no: `src/runner` reads files | OWN-002 (the runner's file reading moves to the Node entry); OWN-006 |
| 38 | the P107 progress table | `:1816-1821`, hand-typed `46/46 · 11/11 · 18/39 · 27/27 · 0/19 · 0/5` and "102 of 147" in the explainer; **already stale** (106 at session 35) | no | P107 `census.json` `byTier` plus row 35's ledger |
| 39 | how the runtime boots a project (`projectData`, `noodl_bundles`, `NodeScope.setComponentModel`, `flagOutputDirty`, `sendSignalOnOutput`, `connectInput`, `setStyle`, `forceUpdate`, animation frames) | the explainer and the journey, written from reading `noodl-runtime` and `noodl-viewer-react` | no: nothing in `dev-docs/reference` says it | OWN-007 (the brief): "how the runtime runs a graph" is kit documentation |
| 40 | the look | its own (a green board, copper wires); deliberately not NodeGX's | n/a | OWN-005 is optional for exactly this case |

## 3. What the two prototypes share, counted

| need | Orbit rows | Under the Lid rows | task |
|---|---|---|---|
| the node spec package in a page (vocabulary, ports, behaviour, world, scenarios, runner) | 1, 2, 3, 4, 7, 12, 21, 22, 23 | 26, 28, 29, 31, 35, 36, 37 | OWN-002 |
| the project format (and the deployed shape beside it) | 8 | 24, 25 | OWN-001 |
| a way to run a graph | 5, 6 | 30, 34 | OWN-003 |
| the screen | 9, 10 | 32 (visual half), 33 | OWN-004 now, NSP-016 later |
| the look | 14, 15, 16, 17, 18, 19 | 40 (declined) | OWN-005 |
| what the editor knows that the spec does not say (parameters vs ports, derived names, type names) | 11, 13 | 27 | NSP-018, NSP-020, NSP-021 |
| proof it is right | 20 | 37 | OWN-006 |
| how it all works, written down | — | 38, 39 | OWN-007 |

**Two needs no task owned before this table:**

- **A conformance ledger** (row 35, 38): a machine-readable "this node conforms on the runtime as of commit X" that a page,
  a README or a changelog can read. P107 prints it in run logs and session notes; Under the Lid typed it and it was stale
  within a day. Logged for P107 (NSP-009's ratchet is the natural home) and cited by OWN-010's changelog.
- **The deployed shape** (row 24): the runtime reads `sourceId / sourcePort`; the editor writes `fromId / fromProperty`.
  OWN-001's package has to carry the transform, or an editor that writes "the format" writes a file the runtime cannot load.
  **Answered (OWN-004 s3, OWN-001 s5, 2026-10-10):** the transform is the editor's exporter, not a rename (ports come from
  the node library); the format package carries no `toDeployed`, the preview's in-page build carries the exporter, and
  `PROJECT-FORMAT-V2.md` §"Two shapes, one project" says so.

## 4. The editor-knowledge census

NSP-021 §3.1's table of every question the Electron editor asks about a node and where the answer comes from today is
built once, in P107's folder: [NSP-021-EDITOR-KNOWLEDGE-CENSUS.md](../phase-107-the-node-says-what-it-does/NSP-021-EDITOR-KNOWLEDGE-CENSUS.md).
Rows 11, 13 and 27 above are the ones a home-made editor hits first.
