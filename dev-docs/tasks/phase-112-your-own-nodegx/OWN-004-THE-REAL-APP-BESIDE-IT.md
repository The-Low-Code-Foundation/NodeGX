# OWN-004 — The real app beside it

**Opened 2026-10-02.** **Depends on OWN-001** (the in-memory project) **and R4** (README §8).
**Status: 🟡 slice 1 built (s3, 2026-10-10): AC1 met (todo template; 13 / 13 templates render, parity exact); the page receives live values; AC2's cards and AC3 wait on Orbit as a v2 project (§6.2).**
**Model:** **Opus.** Embedding the preview and feeding it from memory is wiring with a clear finish line. Switch to Fable only if the preview's internals resist and the task turns into design. At the start of a session on this task, and again if the work changes kind, say which model you are running on and whether this line says Richard should switch (README §0.2).

## 1. The person sentence

> **Beside my home-made editor is my real app, running, and when I change something in my editor the app changes; I
> can see the last value on any wire, from the real app, not a simulation.**

## 2. Why

README §1 reading 5. No visual node has a spec, so the prototype drew its screen by hand from the values the visual
nodes' wires carried, and said so on the page. Two things in the repo already do the real job:

- `@noodl/preview` renders a v2 project in a browser with no editor process and reloads when the files change. It is a
  command-line server today (`noodl-preview <project-dir>`).
- `nodegx-observe` reads a running app over the editor's local relay; its session dictionary ships every node's id,
  label, type and component and every connection, which is what a canvas needs to light up a wire.

## 3. What to build

1. **The preview as a library.** An entry that a page can call with an in-memory project (OWN-001's backend) and a
   container element, and that re-renders when the project changes. The CLI becomes a thin user of it. Measure size and
   first-render time on the todo template.
2. **Live values without the editor.** The observe protocol's frames delivered to a page in the same tab (no relay,
   no editor): the preview emits, the home-made editor subscribes. Each frame names a node id and a port, so an editor
   can light the wire and show the value on the card, as the prototype does from the spec runner.
3. **The prototype switches over.** Its hand-drawn Preview window and its phone in Orbit come from the real preview;
   its visual nodes stop being stand-ins (their cards keep the "no spec yet" tag, because that is still true).

## 4. Acceptance criteria

1. A page with no editor process shows the todo template's real app from in-memory files, and a change written through
   OWN-001 appears without a reload of the page.
2. The page receives live values for at least the wires the prototype draws, from the real app, and the prototype's
   cards show them.
3. The prototype's `page.html` no longer draws the screen itself.

## 5. Watch for

- The preview's README: its live reload is driven by the files, while the editor's own live preview is driven by its
  in-memory model over a WebSocket and *"cannot see anything written to disk from outside"*. Do not wire the library to
  the editor's socket; the point is that it does not need the editor.
- P111 SEE-003 (the picture follows the app) wants the same live values from an exported app. Use its trace format if
  it exists by then; if not, use the observe frames and note it in SEE-003.

## 6. Built

### 6.1 Slice 1 — the preview as a library in a page (s3, 2026-10-10, Opus)

**AC1 met on the todo template (and 13 / 13 templates render, kits included). AC2's source built (the page receives
live values); the prototype's cards showing them is AC3's work. AC3 not started.**

**The design question the Model line warned about, settled by measurement rather than taste.** The preview turns
v2 files into `window.projectData` with the editor's own `ProjectModel` + `Exporter`, which need the node library.
Two ways into a page: write a light exporter (a second copy), or bundle the editor's. Measured on all 13 templates
(747 components, 9,808 nodes, 20,341 wires) against `nodegx deploy`:

| | a plain rename (legacy → deployed shape) | the editor's exporter, bundled for a browser |
|---|---|---|
| wires, parameters, types, states, children, metadata | identical | identical |
| node `ports` | **2,135 nodes differ** (a Function's ports come from parsing its script; Component Inputs/Outputs) | identical |
| component `ports` | not derivable without the library (9,212 ports on 649 components) | identical |
| top level | — | identical (after the bug below) |

The runtime reads both kinds of port (`componentmodel.ts:476`, `nodemodel.ts:255`), so a rename is wrong, and a
second exporter would be a copy that drifts. The editor's exporter bundles for a browser with seven Node built-in
imports stubbed (none on the export path) and `Buffer` injected (xxhash64 loads its WebAssembly with it). No second
copy, no rebuild of the runtime.

**What was built** (`packages/noodl-preview`):

- `src/projectExport.ts` — the fs-free half of the CLI's loader (`projectModelFromLegacy`, the root guess,
  `PREVIEW_EXPORT_OPTIONS`); `loader.ts` uses it, so the CLI and the page run one copy.
- `src/inPage/exportInPage.ts` — files (path → text) → `V2ProjectStore` (OWN-001) → `ProjectImporter` → SUB-006
  validation → `ProjectModel` → `Exporter`; `pageFromFiles` adds the deploy's own `HtmlProcessor` (title, head code,
  **the design-token CSS**) and inlines the export, so a page is a deploy and nothing else.
- `src/inPage/kits.ts` — the project's kits (`noodl_modules/*`) from the files: `@nodegx/module-inject`'s own
  `manifestEntry` (now exported), `toInjectModules` and `buildInjectionTags`, each kit file a `blob:` URL.
- `src/inPage/index.ts` — `mountPreview(container, { runtimeBase })` → `update(files)`, `onTrace(cb)`, `frame`,
  `nodeLibrary`. The node library comes from the runtime the page renders with (a one-Group boot page with the
  project's kits, hidden, on the first update and whenever the kit files change): kits and runtime version always in
  step, nothing shipped beside it. **Each update is a fresh
  deployed page in a fresh frame**, swapped in when its runtime is up: a deployed runtime has no teardown, so
  rendering into the same document would leave the last project's timers running into the same global variables.
  Written with `document.write`, not `srcdoc`: in `about:srcdoc` the browser lets `pushState` change only the `#`,
  and the todo app's first redirect (`/sign-in`) threw there. **Live values** are the runtime's own trace (OBS-001,
  what `nodegx-observe` reads), armed under the owner `noodl-preview-in-page` as soon as the frame's runtime exists,
  read every 150 ms: each event names `fromNode.fromPort → toNode.toPort`, a value preview and `value`/`signal`;
  the session dictionary (each node's type and component) comes with any batch where the live nodes changed.
  Re-exports `V2ProjectStore`, `memoryFiles`, `FormatRefusal`: one script holds, writes and shows a project.
- `build.mjs` — a third output, `dist/browser/noodl-preview-in-page.js` (global `NodegxPreview`).
- `scripts/in-page-check.mjs` — per template, in headless Chrome over CDP, in real time: parity with `nodegx deploy`
  (made into a temp folder from a copy), the first render, a change to a Text whose words are on screen and nowhere
  else, written through the store, and the trace.

**Readings** (2026-10-10, on `d97d9d5c8` + this slice; the runtime in `external/deploy/` is the 9 Oct development
build). `npm --prefix packages/noodl-preview run in-page-check -- --all`:

| | |
|---|---|
| bundle | **1.60 MB, 329 KB gzipped** (1 MB of it is `noodl-types`; editor code ~160 KB) |
| todo template (AC1) | **PASS**: export 183 ms, frame up 74 ms; a store write shown 77 ms after its 176 ms export; old text gone; same host document; 1,184 live values over 316 wires; no console error from any frame |
| `--all` | **13 / 13 PASS; parity 747 / 747 components and every top-level field, on every template** |
| kits | load from the files on 6 templates; `kitDiffer` 4 / 6 / 10 components (below) |
| bot-garden | its `kit-provenance.json` imports 4 kits its folder does not carry (game-kit, garden-kit, garden-3d-kit, bot-garden-fonts): named by the check, not failed — a deploy of the folder has the same hole |
| package suites | `noodl-preview` jest 54 / 54; typecheck clean (the 6 new files in the program); `@nodegx/module-inject` 41 / 41 |

**Parity is graded with a kit-less library**, because that is what `nodegx deploy` has (its headless runtime loads no
kits). The export the page *renders* reads the kits' node types too, and on 4 templates that changes 4–10 components'
`ports`: a component port wired to a kit node gets the kit port's type (`acted: signal`, `items: array`) where the
CLI writes `*`; in one (rocket-school `/Moon/Alien tile`, port `name`) the CLI's entry carries `default` and `group`
the page's does not. The editor's own deploy reads its library from a viewer with the kits loaded, as the page does.
**Not measured:** whether a `*` where the editor writes `signal` changes what a CLI-deployed app does. A question for
whoever owns `nodegx deploy`, recorded here, not in the ledger, until measured.

**Bugs found and fixed** (both `kit: preview`, regression `scripts/in-page-check.mjs`):

- **P112-S3-IGNOREINEXPORT** (low). The first parity run had `settings` differing on all 13 templates by
  `htmlTitle`: the CLI's headless library never got the viewer's project-settings ports, so `nodegx deploy` and the
  CLI preview published Title and Head code in `window.projectData`; the editor's deploy and the page do not.
  `headless.ts` now hands them over as the viewer does.
- **P112-S3-DISPOSE** (medium). The check's second export was 2.5× its first. Ten exports in a row: 737 → 3,257 ms;
  the CLI preview on eight saves: 256 → 1,668 ms. A `ProjectModel` registers listeners on the one `NodeLibrary` that
  only `dispose()` removes, and neither path called it. Both do now: flat at ~690 ms (Node) and ~190 ms (CLI).

### 6.2 Slice 2 — next

1. **AC3 and the rest of AC2: Orbit's timer as a v2 project**, shown by `mountPreview`, its cards fed from `onTrace`.
   Today its graph is the prototype's own shape (`prototype/src/app.ts`: 18 logic nodes, 24 wires; the 8 visual
   nodes and 11 wires declared in `page.html`). Written as v2 files, its node ids are the trace's `fromNode`, so an
   event names its card directly. 🔴 **One choice is Richard's, not the slice's:** Orbit's 3D phone is a canvas
   texture the page paints, and an iframe cannot be a WebGL texture. The flat Preview window can simply become the
   real app; the phone needs either a DOM layer positioned in 3D (Three.js's `CSS3DRenderer` is the existing
   mechanism) or to stay a picture of the app. Show him both before building either.
2. **Assets.** Project files that are not text (images under the project or a kit — landing-pages' and
   members-area's `starter-imagery/*.webp`) resolve against the runtime folder and 404. `memoryFiles` holds text
   only; decide where binary files live (OWN-001's store or beside it), then serve them as `blob:` URLs like kits.
3. Measure the trace pump on the largest live graph (planning-demo: 1,090 live nodes, 4,999 wires): it builds the
   session dictionary on every tick to see whether the shape changed.
