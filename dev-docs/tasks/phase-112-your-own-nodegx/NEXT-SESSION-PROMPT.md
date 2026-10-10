# Phase 112 — next session

**Written 2026-10-10 at the end of session 3** (Opus 5.5). Session 3 built OWN-004 slice 1: the real app runs in a
page from files held in memory. Sessions 1 and 2's handoffs are in this file's git history (`git log -p --
NEXT-SESSION-PROMPT.md`); what they found that still holds is in "Standing findings" below.

## The board (re-derived from the task files, 2026-10-10)

| task | built | driven / gated | Model |
|---|---|---|---|
| OWN-000 the prototypes, measured | 🟢 NEEDS.md, `scripts/own/census.js`, CENSUS.md | census re-run s3 (10,093 nodes; 108 specs) | — |
| OWN-001 the format leaves the editor | 🟡 slice 1: `@nodegx/project-contract/format`, the store, the page | package 219 / 219 (s2) | slice 2 **Fable** |
| OWN-002 the spec in a page | 🟢 `src/browser.ts`, own SHA-2, `build.mjs`, browser-check | §6 | — |
| OWN-003 one way to run a graph | 🟡 step 1 measured | R1 asked in §6 | steps 2–4 **Fable** |
| OWN-004 the real app beside it | 🟡 **slice 1 (s3): AC1 met** — in-page build of `@noodl/preview`, live values, kits | `in-page-check --all` 13 / 13; jest 54 / 54 | slice 2 **Opus** (AC3 needs a ruling first, below) |
| OWN-005 the look, as a projection | 🟢 `@nodegx/canvas-look` | §6 | — |
| OWN-006 the editor suite | 📋 not started (needs OWN-001, OWN-003) | — | Fable |
| OWN-007 the brief | 📋 not started | — | see its file |
| OWN-008 three strangers | 📋 not started | — | see its file |
| OWN-009 Richard's own | 📋 not started | — | see its file |
| OWN-010 every bug teaches the kit | 🟡 ledger half; package half not started | `bugs.js kits`: preview 2 / 2 fixed with regressions | see its file |
| OWN-011 one install | 📋 not started (needs R2) | — | see its file |

**Built but undriven: 0.** **ACs closed this session: OWN-004 AC1.** The ratchet is not tripped.

## Session 3 in five lines

- **The design question, settled by measurement:** a plain legacy→deployed rename differs from the editor's export on
  2,135 nodes' ports and every component's port list (the runtime reads both), so the page runs **the editor's own
  exporter**, bundled for a browser (1.60 MB / 329 KB gz). No second copy.
- `mountPreview(container, { runtimeBase })` → `update(files)` / `onTrace(cb)` / `frame` / `nodeLibrary`; the node
  library comes from the runtime the page renders with (boot page with the project's kits); each update a fresh
  deployed frame (`document.write`, because `srcdoc` forbids `pushState` off `#`); live values = the runtime's OBS-001
  trace. OWN-004 §6.1 has the design and every reading.
- **Gate:** `npm --prefix packages/noodl-preview run in-page-check -- --all` — 13 / 13 PASS: parity with `nodegx
  deploy` on 747 / 747 components and every top-level field; a Text changed through `V2ProjectStore` shows without a
  reload; live values arrive. Todo: export 183 ms, frame 74 ms.
- **Two bugs found and fixed** in the CLI the page shares code with: P112-S3-IGNOREINEXPORT (`nodegx deploy`
  published Title / Head code in `projectData`) and P112-S3-DISPOSE (every `noodl-preview` rebuild ~200 ms slower than
  the last: 256 → 1,668 ms over eight saves; now flat ~190 ms).
- Commits: `0aa8954f1` (code, bugs, OWN-004), then the docs commit with this file.

## What to do next, in order

**First, in your first message: say which model you are running on and whether the task's Model line says Richard
should switch** (README §0.2). Say it again if the work changes kind. Do not wait for an answer.

1. **Ask R4 again, with the screen** (README §8 has the re-ask, with today's numbers). Show the todo app running in
   the page beside a Text written through the store (the check's `--screenshot <png>` makes it). Ask in plain words:
   *"a home-made editor shows your real app beside it — keep that as the way, or draw the screen from the node specs?"*
2. **The Orbit question, before AC3** (OWN-004 §6.2 item 1): Orbit's 3D phone is a canvas texture the page paints; an
   iframe cannot be one. Show Richard both — the real app as a flat window beside the 3D graph, and the real app
   positioned in 3D (Three.js `CSS3DRenderer`) — and let him pick. Then **OWN-004 slice 2 (Opus):** Orbit's timer as
   v2 files, shown by `mountPreview`, cards fed by `onTrace` (AC2, AC3).
3. **OWN-001 slice 2 (Fable):** the MCP's `ProjectStore` onto `V2ProjectStore`, `editor-deps.ts` importing from the
   package, the two shapes, the editor's `test:ci` once, alone. Grades AC1 and closes the task. Note for "the two
   shapes": OWN-004 measured that the deployed shape **cannot** be produced without the node library (ports), so the
   answer is "the transform is the editor's exporter, which `@noodl/preview`'s in-page build carries" — say so in
   `PROJECT-FORMAT-V2.md` rather than writing a `toDeployed`.
4. **Ask R1, R2, R3, R6** (README §8). R2 now lists six undeclared dependencies across three packages.
5. OWN-004's smaller items (§6.2): binary assets from memory; the trace pump on planning-demo.

## Standing findings (still true)

1. **Two shapes of the format**: the editor writes v2 (`fromId`); the runtime reads the deployed shape (`sourceId`,
   nested children, component `ports`, node `ports`). s3: the deployed shape needs the node library, so it is the
   exporter's to make (above).
2. **`@nodegx/node-spec` is not standalone** (`@noodl/backend-contract` by relative path); **project-contract** uses
   `ajv`/`ajv-formats` undeclared; **the preview's in-page build** uses `buffer` (5.7.1, hoisted, undeclared),
   `@nodegx/project-contract` and `@nodegx/module-inject` (workspace, undeclared). R2's publish must declare all six.
3. **Sibling packages compile node-spec's SOURCE** under their own tsconfigs (runtime below ES2020): keep ES2019
   syntax in node-spec `src/`.
4. **The registry is the lever** for a spec runner (1,020 of the world nodes need it, census s3); the unspecced
   bucket is the component interface (146 of the todo app's 146 unspecced).
5. **No conformance ledger** exists (NEEDS.md §3; P107 / OWN-010).
6. **Kits ship as library entries, not in template folders**: bot-garden's `kit-provenance.json` imports 4 kits its
   folder does not carry, so a page or a deploy of the folder cannot run them. The check names them.
7. **Not measured (s3):** `nodegx deploy` writes `*` for a component port wired to a kit node where the editor (and
   the page) write the kit port's type (`signal`, `array`), because the CLI's headless runtime loads no kits. Whether
   that changes what a CLI-deployed app does is open — OWN-004 §6.1.

## Rulings owed by Richard (README §8, plain words there)

R1 what runs a graph outside the app · R2 publish the kit at 0.x and declare the six dependencies · R3 where the
method is served · **R4 re-ask with the screen** · R5 the look as an optional generated package (built, private) ·
R6 an open blocker stops a package release · **and the Orbit choice** (flat window or 3D), before OWN-004's AC3.
