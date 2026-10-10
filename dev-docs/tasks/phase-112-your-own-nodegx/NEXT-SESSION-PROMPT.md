# Phase 112 — next session

**Written 2026-10-10 at the end of session 4** (Opus 5.5). Session 4 built OWN-004 slice 2: Orbit as a real project,
its graph in 3D around the real app or beside it in a window, and asked two rulings with that page running. Earlier
handoffs are in this file's git history (`git log -p -- NEXT-SESSION-PROMPT.md`); what still holds is in "Standing
findings" below.

## The board (re-derived from the task files, 2026-10-10)

| task | built | driven / gated | Model |
|---|---|---|---|
| OWN-000 the prototypes, measured | 🟢 NEEDS.md, `scripts/own/census.js`, CENSUS.md | census re-run s3 | — |
| OWN-001 the format leaves the editor | 🟡 slice 1 | package 219 / 219 (s2) | slice 2 **Fable** |
| OWN-002 the spec in a page | 🟢 | §6 | — |
| OWN-003 one way to run a graph | 🟡 step 1 measured; **s4 evidence for R1** (§6) | R1 not yet asked | steps 2–4 **Fable** |
| OWN-004 the real app beside it | 🟡 **slices 1–2: AC1, AC2 met** | `prototype/real/check.mjs` 5 / 5; `in-page-check --all` 13 / 13; jest 58 / 58 | slice 3 (AC3) **Opus** |
| OWN-005 the look | 🟢 | §6 | — |
| OWN-006 the editor suite | 📋 (needs OWN-001, OWN-003) | — | Fable |
| OWN-007 the brief | 📋 | — | see its file |
| OWN-008 three strangers | 📋 | — | see its file |
| OWN-009 Richard's own | 📋 | — | see its file |
| OWN-010 every bug teaches the kit | 🟡 ledger half | `bugs.js kits`: preview 3 fixed with regressions | see its file |
| OWN-011 one install | 📋 (needs R2) | — | see its file |
| **OWN-012 the screen, from the descriptions** | 📋 **new (R4)** | — | step 1 **Opus**, 2–3 **Fable** |

**Built but undriven: 0.** **ACs closed this session: OWN-004 AC2.** The ratchet is not tripped.

## Session 4 in six lines

- **Orbit as v2 files** (`prototype/real/orbit/`, 28 nodes, 37 wires) ran first time on the real engine through
  `@noodl/preview`; the trace names the files' node ids, so a card is lit straight from an event.
- **The real engine found a bug the prototype's own runner hid**: Skip > 5 min into Focus bounced back to Focus. Fixed
  in the graph (*Phase over* evaluated on each tick, clamp kept) after two wrong fixes were measured and dropped. R1
  evidence, in OWN-003 §6 and README §8 R1.
- **`orbit.html`**: the real app as a CSS3DObject on the WebGL camera, a depth-writing hole so cards pass in front and
  behind; one switch between *in the scene* and *in a window*; hover a card → its element outlined in the app.
- **Rulings, asked with that page open in Richard's browser:** R7 (Orbit) → *keep both, with the switch*; R4 → *teach
  both equally* (the real app, and drawing from the descriptions) → **OWN-012** opened.
- **`@noodl/preview`**: `preview.elementsOf(nodeId)`; **P112-S4-TRACEARM** fixed (start values lost ~1 load in 8; the
  trace is now armed inside the app page before `setData`; deterministic regression, red without the fix).
- Filed **P112-S4-SCHEMADUP** (low, P107's file): `trace.schema.json` declares `params` twice in two observations.
  Commits: `529684e32` (code), then the docs commit with this file.

## What to do next, in order

**First, in your first message: say which model you are running on and whether the task's Model line says Richard
should switch** (README §0.2). Say it again if the work changes kind. Do not wait for an answer.

1. **OWN-004 slice 3 (Opus), AC3: one prototype page.** Port `prototype/page.html`'s editing (picker, drag-a-wire,
   property panel, delete) and its three missions onto `prototype/real/orbit.html`, every edit through
   `V2ProjectStore` and shown by `update`; bring the Graph and Lift stages; then `page.html` retires and the prototype
   README says so. Missions check by running the graph in the real app, not `GraphRun` (s4 showed they disagree).
   Extend `real/check.mjs` with each mission.
2. **Ask R1 again, with the s4 evidence** (README §8), in plain words, with the page: *"the prototype's own loop showed
   a working Skip; the real app's Skip was broken."* Then R2, R3, R5, R6. Ask each with something on screen
   (memory: rulings are asked with screens, recommendation first, numbers measured).
3. **OWN-001 slice 2 (Fable):** the MCP's `ProjectStore` onto `V2ProjectStore`, `editor-deps.ts` importing from the
   package, "the two shapes" answered as *the transform is the editor's exporter* (OWN-004 s3), the editor's
   `test:ci` once, alone. Closes the task.
4. **OWN-012 step 1 (Opus):** draw Orbit's nine visual nodes from the specs + NSP-016's layout model, graded box by
   box against `elementsOf` — the measurement that says what the drawer needs.
5. OWN-004 §6.3 items 2–5: keep the app's state across an edit (or say why not), diagnostics to the page, assets, the
   trace pump on planning-demo.

## Standing findings (still true)

1. **Two shapes of the format** (v2 `fromId` vs deployed `sourceId`); the deployed shape needs the node library, so
   the editor's exporter makes it (OWN-004 s3).
2. **Undeclared dependencies for R2**: node-spec → `@noodl/backend-contract`; project-contract → `ajv`, `ajv-formats`;
   the preview's in-page build → `buffer`, `@nodegx/project-contract`, `@nodegx/module-inject`.
3. **Keep ES2019 syntax in node-spec `src/`** (sibling packages compile it below ES2020).
4. **The registry is the lever** for a spec runner; the unspecced bucket is the component interface.
5. **No conformance ledger** exists (NEEDS.md §3; P107 / OWN-010).
6. **Kits ship as library entries, not in template folders.** bot-garden names 4 missing kits in its provenance;
   **digital-bricks-training-demo has no `noodl_modules` and no provenance at all** (s4: 51 console errors for its
   `Language Bundle` / `i18next` nodes in the in-page check), so nothing names what it lacks. Not filed: how the editor
   makes a project from that template was not measured.
7. **Not measured:** `nodegx deploy` writes `*` for a component port wired to a kit node (OWN-004 §6.1).
8. **s4: headless software WebGL starves the app's frames** (~4 ticks a second against ~50 without WebGL). A check of
   a WebGL page must wait for the screen it expects, never a fixed time (`check.mjs` does; two of its early failures
   were a half-redrawn screen).
9. **s4: a number wired into `width` of a child of a row is a share, not a percent** (FLD-004, by design). The editor
   warns; a page does not receive the warning (OWN-004 §6.3 item 3).

## Rulings

Answered s4: **R4** teach both equally · **R7** Orbit keeps both poses with the switch. Still to ask (README §8): **R1**
what runs a graph outside the app (now with s4's evidence) · **R2** publish at 0.x and declare the six dependencies ·
**R3** where the method is served · **R5** the look as an optional generated package · **R6** an open blocker stops a
release.

To see the page: `prototype/real/build.sh`, `node prototype/real/serve.mjs 47812`, open
`http://127.0.0.1:47812/orbit.html` (open it for Richard with `open <url>`; links in chat do nothing for him).
