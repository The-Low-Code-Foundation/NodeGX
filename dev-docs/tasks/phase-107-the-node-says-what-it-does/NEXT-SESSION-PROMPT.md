# P107 — next session

**Written 2026-10-12 (s95, Opus).** Read the [README](README.md) §2–§7, then [NSP-019 §5.6](NSP-019-RICHARD-READS-IT.md)
(Richard's drive, his words, and what s95 built from it) and R35 in the README's rulings.

**Model: Opus.**

**s95 in one paragraph.** Richard drove the R33 modal on the Counter and set Start 2, Min 3, Max 1. Nothing anywhere said the
settings were wrong: *"you said it would include automated checks and tests so there's no way to fuck it up. I just managed
to fuck it up first try."* He did not want a separate checker: the modal should run the spec like a real node, and the spec
should say what is wrong (R35). Measured: the runtime had the channel (`setDiagnostic`, DIAGNOSTICS-CONTRACT.md) and the
Counter never used it; the spec format could not declare one; the runtime test harness had no editor. s95 built all three:
`diagnostics` on a spec and a `diagnostic` trace event; the interpreter and the runtime target record them (the runtime
target has a recording editor now, and records the node's own `<type>/` keys for a spec that declares any); a target
without an editor (the export, the strangers) is graded without them. Counter v2 warns *"Min Value 3 is above Max Value 1.
With Limits Enabled on, the count gets stuck."* The modal shows it above the card with a danger ring, as a *Warning* row,
and *Fixed* when it clears. Also fixed: the Video page model, red since s92 (P107-S95-VIDEOPAGEMODEL). Driven in the editor afterwards and signed off by Richard: **"Yes, that's it"** — NSP-019 is ✅.

## Board (from the task files)

| task | built | committed |
|---|---|---|
| NSP-000 … NSP-015 | as s44 (NSP-013 left: AC2's export half and the deep run for s11–s14; NSP-014 / NSP-015 left: AC2's export half, P18's) | s1 … s44 |
| NSP-016 the visual nodes | ✅ s71; s73 SCROLLROOM | `aa8abb06f` … `fd6385beb` |
| NSP-018 the spec speaks | ✅ s77 | s72 … s77 |
| NSP-019 Richard reads it | ✅ s95: AC3 met — Richard drove the modal, "It's cool, but" (R35, §5.6), the warning built, signed off in the editor: "Yes, that's it" (§5.7) | s77 … s95 |
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
| R33 (the modal) | ✅ built s94, driven by Richard s95 | s94 |
| R35 (the settings say when they make no sense) | ✅ built and signed off s95 for Counter; the other nodes owed | `0d81cd398` |

## What s96 does (in order)

1. **Done in s95:** Richard saw the warning in the editor and said "Yes, that's it" (NSP-019 §5.7). Seen there and not measured:
   at a 1368 × 784 window the red line pushes the newest *What happened* rows below the dialog's edge — read whether the Try
   column scrolls them into view (R30 asked for that) before anything else; if not, a small fix and a bug file.
2. **The other nodes (R35's "then go through the other nodes").** Two halves:
   - **Declare what the runtime already says.** 9 runtime call sites raise a diagnostic and no spec declares one: Date Add
     and Date Difference (`*/unknown-unit`), Text Input, the controls' shared helper (`controls/utils.ts` :410), For Each
     (`ITEMS_DIAGNOSTIC`), States (`UNKNOWN_STATE_CODE`), Group, Icon (`ICON_SOURCE_DIAGNOSTIC`), layout
     (`dimensions/wired-dimension-becomes-grow`). Declaring one switches the runtime target's recording on for that node, so
     each is graded the moment it lands. Expect message-text and timing rows (C-numbers in the spec's §6).
   - **Census the contradictions nobody raises.** Settings pairs that can disagree (Slider's Min/Max is the next by name;
     ranges, lengths, a start outside its bounds). Each one found is a runtime change plus a spec version, as Counter v2.
3. **The rules column** (`NodeRulesColumn`) does not list a node's diagnostics: it reads the generated catalog
   (`scripts/node-spec/rules.js` → `catalog:generate` → `noodl-types/src/node-catalog.json`). Add them there (a regen of a
   shared file: memory "REGEN can DELETE a hand edit", check `git status` first).
4. **Static reading (not asked yet, offer it):** the Problems panel and the agent's checker could evaluate a spec's
   `diagnostics` over a node's saved parameters without a running preview. Today the panel shows the runtime's warning only
   while the preview runs, and the agent learns nothing before it writes. Say the cost and ask.
5. Carried from s94: the agent server gets R34 when `packages/noodl-mcp` is next built (peer edits in `nodegx-export` and
   `noodl-mcp/src` again in s95's `git status`); P107-S94-DEVHEAP (one launch, no edits while it runs: s95 did that and the
   server lived); P107-S92-VIDEOEMBEDSEED and P107-S93-NOTANAME (low).

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

**Open, filed this phase:** P107-S95-MINABOVEMAX (fixed for Counter; the other nodes are step 2), P107-S94-DEVHEAP (medium, new: the editor's dev server dies of heap on its 2nd–3rd rebuild), P107-S93-NOTANAME (low), P107-S92-VIDEOEMBEDSEED (low), P107-S89-NIGHTBOOK (medium),
P107-S89-CFEXAMPLES (low; it is why `npm run catalog:examples` exits 1 at 107 / 109), P107-S89-XMLEXAMPLE (low);
P107-S86-STOREDWIRE (medium); P107-S85-RESTCOLTYPES (low); P107-S83-SENDFORM; P107-S79-ADAPTERLABEL (low). **Fixed s95:** P107-S95-VIDEOPAGEMODEL. **Fixed s93:** P107-S93-DIDYOUMEAN, P112-S1-SINGLETON.

**Routed to P18 (the export):** `nodegx-export/src/emit/dragLib.ts` :69 / :356 still disables dragging only on `=== false`
(R26). **P109 holds:** D38, the Page Stack, the Router, LIBRARYDOCS, CHR007SNAPSHOT; P107-S82-STATESVALUEPORT and
P107-S82-STATESLOADGATE. **P112 holds:** P107-SIZE.

NSP-010's and NSP-017's uncommitted notes (not this phase's sessions') were left out again.

## Gates (s95, 2026-10-12, on the tree of `0d81cd398`; day's seed 20738)

- **Runtime, Counter:** `NSP_ONLY=Counter npx jest test/node-spec/conformance.test.ts` (packages/noodl-runtime) — Counter v2
  CONFORMS, 8 / 8 scenarios, 200 / 200 generated, 23 / 23 mutants. **Planted control:** one letter of the runtime's sentence
  changed → red on the new scenario and on 69 of 200 sequences; restored.
- `test/node-spec/nsp-019-diagnostics.test.ts` 4 / 4 (reads the runtime's own trace: raised at load, withdrawn on the fix,
  equal to the interpreter's; control: agreeing settings raise nothing beside values that do arrive). `nsp-010-counter-history`,
  `graph`, `editor-suite-graph`, `runtime-target`: 121 / 121 with them.
- **Runtime, every spec** (`npx jest -w 2 test/node-spec`, 1,479 s): 9 failed / 625 passed before the namespace fix. 3 were
  s95's (graph C9: the loop breaker's `runtime/cyclic-loop` recorded as the Counter's → now only the node's own `<type>/`
  keys; green after). 6 are not: mutant survivors on today's seed in DbModel2, JavaScriptFunction, Router, Radio Button
  (DbModel2 CONFORMS on 20737, not on 20738), Video (P107-S92-VIDEOEMBEDSEED), and known row C96 no longer firing (the same
  with and without s95's recording editor) → **P107-S95-SEED20738**.
- **node-spec package** (`npx jest`): every file but `stranger.test.ts` ran in the full run — 3 red, all fixed and rerun:
  `golden` + `runner` + `counter` + `schema` + `reach` + `adapter` 104 / 104 (the version-rule tests now read
  `Counter.version`), Video page model G1–G8 green (P107-S95-VIDEOPAGEMODEL). `stranger.test.ts` with `NSP_ONLY=Counter`:
  13 / 13, hash gate green (`stranger-suite-hashes.json` rewritten for the six guarded files s95 changed), 23 / 23 mutants
  caught in both rounds that hold the Counter. **The full stranger file was not run to the end** (the whole-package run
  hit its 30-minute limit inside it); no other node declares diagnostics, so its code paths are unchanged.
- `golden.js --check` 108 specs fresh, version rule held (Counter v1 → v2, "no golden trace moved").
- Editor: `npx jest -w 1 tests-unit/nsp-019` 44 / 44 (the warning in rows, above the card, Fixed; control: no banner, no
  ring). `typecheck:editor` 0, `typecheck:editor-tests` 0, `typecheck:runtime` 0, `typecheck:node-spec` 0,
  `css-token-check` clean, `spec-disagreements.js --check` up to date (166 rows, 60 types).
- **Drive:** Richard's (§5.6), one launch, no edits while it ran: the dev server lived; torn down with `dev:stop`; the copy
  unregistered; source SHA unchanged. **Then driven:** a second launch, the warning in the visible dialog (banner, ring, Warning row, Unchanged), Richard's "Yes, that's it"; torn down (26), copy unregistered, SHA `fa5f5a42` unchanged.
- **Not run:** `test:main`, `test:ci`, the Jasmine suite, the MCP suite (no MCP source changed).
