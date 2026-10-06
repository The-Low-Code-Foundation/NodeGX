# Next session — P109 session 21

**Phase:** [README](README.md) · **Audit:** [AUDIT-2026-10-01.md](AUDIT-2026-10-01.md) · scoped at `27d891bf3`.
**Session 20 (2026-10-06, on `cline-dev`, `a7914b837` and `68f2d4d88`):** **15 of 25 closed: ISL-006 ✅.** The editor session read
AC2's panel half and AC10 live on copies. It found that s19's shared reader made **no port** in the editor's preview, and fixed it.

## What s20 found that s19's handoff did not know

- 🔴 **s19 shipped a regression, and every s19 gate was green.** The viewer bundle compiles `@nodegx/project-contract/function-ports.ts`
  with ITS OWN tsconfig (`noodl-viewer-react`, `target: es5`), not the runtime's. There `for…of source.matchAll(…)` became an index
  loop over `.length` and ran zero times. In the editor, every Function port made only by code was missing, and a copy of SuntappedX
  showed **1,769 error-level Function wires**. jest compiles at ES2015+, the deploy drive never depended on mined ports, and
  the dev log's `[tsl] TS2802 … compiled with 1 error` still emitted the bundle. Fixed (`a7914b837`). The spec now type-checks the file
  with the viewer's options (no TS2802) and runs the ES5-compiled reader against the native one. Sabotage: 4 red.
  **Any file the runtime imports from another package is compiled by the viewer at ES5.** Do not `for…of` or spread a Map, a Set or `matchAll` there.
- The upgrade toast's "Wired Function ports kept" copy was rewritten (one sentence per place, names as the node shows them).
- Filed: `P109-S20-LISTDEFAULTTYPE` (needs-ruling, low), `P109-S20-LONGTOAST` (open, the toast card, not P109's to fix).

## The board (re-derived from each task file's status line, s20 — re-derive it again, never copy this table)

| state | tasks |
|---|---|
| ✅ closed (15) | ISL-001, 002, 003, 004, 005, **006**, 011, 014, 015, 016, 017, 019, 020, 021, 023 |
| 🟡 ruled, one reading owed | **ISL-012** (AC3's full server render with hydration) · **ISL-018** (AC5: the agent round over the real protocol) |
| 🟢 ruled, not built | **ISL-013** ("A kit says what it needs") · **ISL-024** ("Own package + a note", only in a quiet gap) |
| 🟡 built here, one half elsewhere | ISL-008 (AC7 export → P18) · ISL-010 (AC4: llama.cpp, Richard's call) · ISL-009 (export → P18) · ISL-007 (AC4 → P108 IW-010) |
| 🟡 one case open | ISL-022 (AC6 inconclusive) · ISL-025 (the closing task) |
| ⬜ Track F, every ruling taken, **NOT COMMITTED** | ISL-026 … ISL-033 buildable; ISL-034 … ISL-037 had no rulings. See "Track F's pile" below. |

**End condition:** every task closed or handed over by name; ISL-025 last.

## Track F's pile — read before touching ISL-026 … 037

The side session that made Track F (transcript `d34e7a8a`, 2026-10-05) finished all 102 rulings, then asked Richard *"Shall I commit
only my own changes (the 12 new task files, the bug files and the README lines) now?"* It got no answer. At s20's end, all of it is
still uncommitted: the 12 task files ISL-026 … 037 are **untracked** (mtime 10-05 21:33), **102** ledger files carry its
"Ruled 2026-10-05 (Track F rulings page)" hunks, and the README holds its 35-line block. Another 32 modified ledger files belong to
other peers (P107 controls, older P109 rows); do not sweep them. s20 asked Richard (decision below). **If he says commit:** commit
exactly the 12 task files, the 102 ledger files whose diff has the ruling text, and the README hunk, through a temporary index.

## Do, in this order

1. **Track F's pile:** act on Richard's answer (above). Without a commit, ISL-026's ledger edits sit on top of that session's work.
2. **ISL-026** (a wrong-kind value never kills a node, 20 rows, 19 ruled). AC1 first: re-measure every row at HEAD. That is the
   node-spec conformance suite (`packages/noodl-runtime/test/node-spec/conformance.test.ts`, about 15 min for all specs; use
   `NSP_ONLY="String Format,Date Add,…"` for the task's nodes). It is a heavy job: **check `pgrep -f conformance.test.ts` first.**
   P107 peers were running 10,000-run deep suites all through s20. Then build worst first (§4 of the task: C3, C16, C65, C70, the kit
   boundary, then C61–C63). C65 and C70 sit in P107 NSP-023's controls: agree with that session first.
3. **ISL-013 build** (`requires` in the manifest, loaded first, a public accessor, refused by name; the catalog reader does NOT load
   `dependencies`, so it loads a required kit's `main` first).
4. **ISL-018 AC5**, the agent round ([[a-stranger-agent-round-recipe]]), in a worktree with real `dist` copies.
5. **ISL-012 AC3's server render with hydration.** 6. ISL-024's move, only in a quiet gap.

## Decisions for Richard (not yours)

- **Commit Track F's pile?** (the side session's own unanswered question, asked again in s20's closing message).
- **`P109-S20-LISTDEFAULTTYPE`:** a listed Function output left on the panel's "String" is an untyped port. Should the panel show
  "Any" for an output (recommended, nothing saved changes), or should the port become String (this retypes every listed output never
  given a type, including 21 rows ISL-006's fix-up wrote on SuntappedX)?
- **`P109-S18-REFRESHROWSTATE`:** a For Each Refresh rebuilds every row, so each row's Component Object starts empty. Keep it (say so
  on the Refresh port) or reuse rows whose id stays.
- ISL-010 AC4 (llama.cpp, or accept Ollama alone) and the Effort port's "None (no thinking)".
- Pushing `cline-dev`; publishing Bot Garden Fonts / Garden Kit / Garden 3D Kit at the origin.

## Handed over (owed by another phase; say so where you meet it)

- **The toast card (P92 chrome / P100 UPG-002's report):** `P109-S20-LONGTOAST`. A toast taller than the window hides its title, and
  there is no max height or scroll.
- **P78 TPL-011 (uncommitted pile, untracked since 09-27):** `P109-S19-TPL011UNREADID`. Nightbook's generator wires `pm-id` into
  `openEnvelope`, whose script never reads `Inputs.id`, and the door now refuses it (`tpl011Template` 35 → 32). Also: D80's section in P78's
  register is inside that pile. Its ledger file says fixed (`75e0e6cef`).
- **P18:** ISL-008 AC7 export half; `P109-S17-EXPORTKITDEPS`; ISL-009's export half. `nodegx-export` full suite s19: 5 red in 3
  suites (`hls006-every-listener`, `hls001-corpus-identity`, `sse` §F floor), not ISL-006's.
- **P108 (IW-010):** ISL-006 AC8 (`Translate words`, the generator's `TYPE` table and `portsOf`); ISL-007 AC4; README §6.
- **Templates:** `P109-S19-DEMOSTUBWIRES` (low). **Runtime, unowned:** `P109-S17-KITTHROWBLANKS` (ISL-026 lists it).
- **Release notes:** ISL-008; ISL-004's Page port; the doctrine's two paragraphs; the reader's refusal names unloaded dependencies;
  ISL-006: the written port list is the way to type a Function port; `unknown-function-port`; underscore signals work; `Inputs["x"]`
  is an input; a comment makes no port; old projects keep their wired ports ("Wired Function ports kept").

## Gate readings taken s20 (2026-10-06, at `a7914b837`)

- Editor `tests-unit`: isl-006 37 (incl. the ES5 rows and the TS2802 guard), fix-007, sb-017: 79 across 4 suites. `tsc --noEmit -p
  packages/noodl-editor` 0; `project-contract` 0.
- Runtime: 10 Function suites 123/123. core-ui `scriptPorts` + `declaredPorts` 38/38. Exporter function-ports suite 14/14. `noodl-mcp`
  `isl006FunctionPortList` 6/6.
- Editor, live (throwaway profile, copies): SuntappedX 0 Function errors, 2,707 ends alive, 3 dead (dead before ISL-006: the script
  never names them), 6,766 wires saved of 6,766; hsseq 584 alive, 0 dead, 2,959 of 2,959. Stack stopped (26 processes).
- `node scripts/bugs.js check`: 6 problems, all in a peer's P78 file (`p78-tpl008pj-nested-signal-…`), none in P109's.

## Facts measured in session 20 that are not in a task file

- The editor's `getPorts()` for a FRONTEND Function comes from the preview runtime's `sendDynamicPorts` (`simplejavascript.ts`
  `setup`). It runs for every Function in the project, not only the ones on screen. A cloud Function's ports are derived in the editor
  (`cloudDynamicPorts.ts`). So a reader broken only in the viewer bundle shows up only on frontend Functions.
- Graph warnings are computed by `NodeGraphModel.evaluateHealth()`. A wire added through the model reads no warning until that runs.
- Reach editor singletons from `cdp eval` with `webpackChunknoodl_editor.push([[Symbol()],{},r=>req=r])` and a scan of `req.m` for
  the export (`WarningsModel.instance`, `NodeGraphNode`). `window.__nodeGraphEditor.activeComponent.owner` is the ProjectModel.
- A proplist row is added in the panel by `[data-style-ports=scriptOutputs] [data-test=list-add-entry]`, then typing and Enter with
  `Emulation.setFocusEmulationEnabled` on the same connection. The Type select is `[class*=PropertyPanelSelectInput-module__Root]`.
  The driver scripts are in s20's scratchpad (gone); the recipe above is enough to rebuild them.
