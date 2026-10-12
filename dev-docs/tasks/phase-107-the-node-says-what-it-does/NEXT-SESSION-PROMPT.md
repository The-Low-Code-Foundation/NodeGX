# P107 — next session

**Written 2026-10-12 (s94, Opus).** Read the [README](README.md) §2–§7, then [NSP-019 §5.5](NSP-019-RICHARD-READS-IT.md)
(what s94 built and drove) — §5.3 and §5.4 are Richard's verdict and the mockup it answers.

**Model: Opus.**

**s94 in one paragraph.** R33 is built: the property panel's two folds are gone and *How this node works* sits under the node's
name (a dashed *spec in progress* for And, Or, Query Records, Page Inputs, Screen Resolution; nothing for a node with no spec).
It opens a pop-out: the rules on the left, each case with its outcome as a chip; *Try it* on the right with the node drawn as on
the canvas (card, port dots, value bubbles, the dark preview pill), ports that light for a second, signal pills, steppers, a
switch per boolean, the clock only for a clock node, and *What happened* following the newest row. It runs the spec in the
interpreter (`playTry` in `tryNodeModel.ts`). Driven in the dev editor on a copy of nodegx-debug-demo: eight presses wrote eight
right rows. `spec-disagreements.json` was stale since s92 (C160–C162) and is regenerated. The dev server died of heap twice
while driving: filed P107-S94-DEVHEAP.

## Board (from the task files)

| task | built | committed |
|---|---|---|
| NSP-000 … NSP-015 | as s44 (NSP-013 left: AC2's export half and the deep run for s11–s14; NSP-014 / NSP-015 left: AC2's export half, P18's) | s1 … s44 |
| NSP-016 the visual nodes | ✅ s71; s73 SCROLLROOM | `aa8abb06f` … `fd6385beb` |
| NSP-018 the spec speaks | ✅ s77 | s72 … s77 |
| **NSP-019 Richard reads it** | 🟡 s77: AC1, AC2, the §2 table; s91: "Needs changes" (R30); s93: mockup, R33; **s94: the modal built and driven (§5.5)**. Left: **Richard drives it (AC3)** | s77, s91, s93, s94 |
| NSP-009 the ratchet | ✅ s64; s65 `contract`; s85 `ports` (`floor.ports` **132** since s87) | `6a1ed0084`, s65, s85, s87 |
| NSP-010 a change is a version | ✅ s78. s92: 5 more specs carry a `changes` history (10 in all) | `36e08e29e`, `64f9576d9` |
| NSP-017 the escape hatches | 🟡 s64–s68. Left: AC1's export half (P18's) | s64 … s68 |
| NSP-023 the spec without React | ✅ (s50) | s45 … s57 |
| NSP-006 the stranger | ✅ rounds 1–4 | `649e6864d`, s70 … s84 |
| NSP-020 ports without a viewer | 🟡 L1–L5 ✅, AC4 ✅, R19 ✅, oracle (c) ✅, R20 ✅ and driven (s89). Left: Router's labels (ADAPTERLABEL) | s79 … s87 |
| **NSP-021 the second editor** | 🟡 AC1 ✅ (s87); §3.2: Navigate, Cloud Function (s87), `typecasts` ✅ s88, `allowAsChild` ✅ s89 (R23), kit mirror retired, card title ✅ (R24), deprecation ✅ (R25) s90, both driven s93; **units ✅, enum labels ✅ (measured equal), singleton ✅ (R34) s93**. Left in §3.2: which runtimes (NSP-022). Round trip (§3.3) = P112 OWN-006 | s87 … s93 |
| NSP-022 the cloud-only nodes | 📋 (needs a second runtime target) | s21 |
| R26–R29 (the s91 rulings) | ✅ s92 | `a94119947`, `b8090d121`, `dccaa77e0`, `1c3166c57` |
| R34 (singleton) | ✅ s93 | `83bb0de10` |
| R33 (the modal) | ✅ built s94; Richard's drive owed | s94 |

## What s95 does (in order)

1. **Ask Richard to drive the modal (NSP-019 AC3)** — in plain words, with the two shots
   ([built](shots/nsp-019-s94-modal-built.png), [mockup](shots/nsp-019-s94-modal-mockup.png)), memory
   [[ask-richard-a-ruling-in-plain-words]]. If he asks for it running: `npm run dev:debug`, a renamed copy of
   `NodeGX test projects/nodegx-debug-demo/project.json` registered in `~/Library/Application Support/NodeGX/recently_opened_project.json`
   (remove it afterwards, check the source SHA), select the Counter. Record his verdict in §5.5's place in his words. Four
   choices s94 made that the ruling did not name, to say in one line each if he raises them: full port names on the steppers;
   the editor's white backdrop (the mockup drew a dark dim); the card in the canvas card's colours, not the picker's category
   scheme; *Start over* at the top of *Try it* (as drawn), disabled until something was tried.
2. **Before driving again, mind P107-S94-DEVHEAP:** batch every edit before launching; the dev server survives one rebuild and
   died on the second or third, twice. A hot reload of the side panel unmounts the modal (reselect the node, reopen).
3. **The agent server gets R34** when `packages/noodl-mcp` is next built. Still not built in s94: `nodegx-export` carries 23
   files of a peer's open edits and `dist/` bundles the working tree. Build when `git status` shows none, or leave it to P112.
4. Cheap alongside: **P107-S92-VIDEOEMBEDSEED** (low) and **P107-S93-NOTANAME** (low; owes words — the content-authoring skill,
   memory [[copy-passes-the-content-authoring-skill]]).

**The census recipe (s89/s90/s93):** population = `os.walk` of `vscode_projects` to depth 4 for `nodegx.project.json` /
`project.json` (paths under `OpenNoodl*` excluded, which also drops `OpenNoodl-worktrees`), the launcher's
`recently_opened_project.json`, and the committed `nodegx.project.json` files under `packages/` and `dev-docs/`, by realpath
(**370 on 2026-10-12, s93**). Read both formats. The runtime export: bundle a scratch entry with
`require('./scripts/node-catalog/lib/bundle').bundleEntry(entry, outDir)` (it returns `<outDir>/extractor.bundle.js`) that
imports `scripts/node-catalog/dom-shim` by absolute path, builds a browser and a cloud `NoodlRuntime`, registers
`noodl-viewer-react/src/register-nodes` and `noodl-viewer-cloud/src/nodes`, and writes `generateNodeLibrary(register).nodetypes`.
The validator over many projects: `npm run validate:project -- <dirs…> --only <code> --json` (both formats; the JSON is
`{results:[{target,summary,diagnostics}]}`). **A list file read with `while read` drops a last line with no newline**: s93
read 369 of 370 and ran the last one alone.

**The agent server over stdio, without registering it:** `node packages/noodl-mcp/dist/noodl-mcp.cjs <dir>` and JSON-RPC
lines (`initialize`, `notifications/initialized`, `tools/call`); `explain_component` is behind `find_tools` (call
`find_tools {query:"explain component"}` first in the same session); `get_component` takes `path`, not `name`. It refuses
a legacy `project.json` (exit 2). s93's client: the session scratchpad's `mcpcall.js` (not kept; 40 lines).

## Human decisions

- **Still Richard's:** P107-S89-NIGHTBOOK is the template owner's (P78). 14 deprecated types have no `replacedBy`; ask only
  if a person hits one.
- **A choice s92 made that the ruling did not name (R26):** a Drag's Enabled with nothing yet (`undefined`, or `null`)
  leaves dragging ON. Say it to Richard in one line if the drive or a person hits it.
- **A choice s93 made that R34 did not name:** the editor's `node-singleton` is now a `warning` (it was declared `error` but
  never fired); Richard's option said "warn". The checker's `duplicate-singleton` is a warning too.
- **The Frappe note** (R32): a named list, built when the first `changes` entry answers `project`. None does yet.

**Open, filed this phase:** P107-S94-DEVHEAP (medium, new: the editor's dev server dies of heap on its 2nd–3rd rebuild), P107-S93-NOTANAME (low), P107-S92-VIDEOEMBEDSEED (low), P107-S89-NIGHTBOOK (medium),
P107-S89-CFEXAMPLES (low; it is why `npm run catalog:examples` exits 1 at 107 / 109), P107-S89-XMLEXAMPLE (low);
P107-S86-STOREDWIRE (medium); P107-S85-RESTCOLTYPES (low); P107-S83-SENDFORM; P107-S79-ADAPTERLABEL (low). **Fixed s93:** P107-S93-DIDYOUMEAN, P112-S1-SINGLETON.

**Routed to P18 (the export):** `nodegx-export/src/emit/dragLib.ts` :69 / :356 still disables dragging only on `=== false`
(R26). **P109 holds:** D38, the Page Stack, the Router, LIBRARYDOCS, CHR007SNAPSHOT; P107-S82-STATESVALUEPORT and
P107-S82-STATESLOADGATE. **P112 holds:** P107-SIZE.

NSP-010's and NSP-017's uncommitted notes (not this phase's sessions') were left out again.

## Gates (s94, 2026-10-12, on the tree of the s94 commit)

- `npx jest -w 1 tests-unit/nsp-019`: **42 / 42** — `playTry` (rows, values, what lights, the Unchanged control, a refused step),
  `ruleParts` (round-trips every catalog line), the three arms of the button, the in-progress drift gate (planted: one name
  dropped → red), the modal body through `react-dom/server` loaded (Counter, Delay as `Timer`) and unloaded (the control).
- `tests-unit/nsp-020` + `nsp-021` + `chr-007`: 556 / 557 — the one red is `chr-007/widgetDispatch`, P107-S77-CHR007SNAPSHOT,
  open since s77 (Page Stack's `keepPagesWhenUnmounted`), not this work.
- `typecheck:editor` 0, `typecheck:editor-tests` 0, `css-token-check` clean, `spec-disagreements.js --check` 0 (166 rows, 60 types).
- **Drive:** three launches (two ended by P107-S94-DEVHEAP), each torn down with `dev:stop`; 28 MCP server processes alive after.
- **Not run:** `test:main`, `test:ci`, the Jasmine suite, the MCP suite (no MCP source changed). Not driven: the dark theme.
