# P107 — next session

**Written 2026-10-12 (s93, Opus).** Read the [README](README.md) §2–§7 (**R33 and R34 are the newest rulings; R34 is
built, R33 is the next build**). Then [NSP-019 §5.3–§5.4](NSP-019-RICHARD-READS-IT.md) (Richard's verdict and the mockup he
approved) and [NSP-021 §6.5](NSP-021-THE-SECOND-EDITOR.md) (what s93 measured and built).

**Model: Opus.**

**s93 in one paragraph.** R24 and R25 were seen where a person and the agent see them. The agent's data flow names an
unlabelled Variable `Variable "hangarTab" [hsTab].value` with `title`; in the running editor the card titles under R24 equal
the pre-R24 rule on all 7,326 nodes of Erleah-2's copy (a control that drops truncation differs on 35); the Problems panel
lists the 8 REST2 as retired, naming HTTP Request. That drive found **P107-S93-DIDYOUMEAN** (every such row also asked "did
you mean “net.noodl.HTTP”?"), fixed (`e1f847269`: 2,457 of 2,677 suggested rows on that project repeated their own
sentence); the 220 left are **P107-S93-NOTANAME** (open, owes words). `deprecated-node` run over 370 projects: **55
warnings in 21 projects**, equal to a file scan project by project. Units and enum labels: the agent's catalog equals the
runtime export on **596 of 596** and **365 of 365** ports (a planted difference is caught), so those §3.2 rows close.
Singleton: the filed fix would have marked 1,477 single Pages and cloud Requests; Richard ruled **R34**, built
(`83bb0de10`) and driven. The R30 modal was drawn as a mockup and Richard ruled **R33, "Build it like this"**. P107's
bug ledger had seven missing `commit:` / `regression:` lines from s76–s92; filled.

## Board (from the task files)

| task | built | committed |
|---|---|---|
| NSP-000 … NSP-015 | as s44 (NSP-013 left: AC2's export half and the deep run for s11–s14; NSP-014 / NSP-015 left: AC2's export half, P18's) | s1 … s44 |
| NSP-016 the visual nodes | ✅ s71; s73 SCROLLROOM | `aa8abb06f` … `fd6385beb` |
| NSP-018 the spec speaks | ✅ s77 | s72 … s77 |
| **NSP-019 Richard reads it** | 🟡 s77: AC1, AC2, the §2 table; s91: "Needs changes" (R30); s93: the modal mocked up (§5.4), **R33 "Build it like this"**. Left: build it, then Richard drives it (AC3) | s77, s91, s93 |
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

## What s94 does (in order)

1. **Build the R33 modal** (NSP-019 §5.4; the canvas Richard approved: https://claude.ai/artifact/CmkJLfJu7NGhzsquJgoDHS,
   two artboards, read them with the Artifact tool's `read` before building). In the editor:
   - a **"How this node works"** button at the top of the property panel for a node with a spec, replacing the two folds
     (`views/panels/propertyeditor/spec/SpecSections.tsx`); a spec with no words (And, Or, Query Records, Page Inputs,
     Screen Resolution) shows the dashed "How it works: spec in progress" instead;
   - the **modal**: rules left (`NodeRulesSection`'s content, each case's outcome as a Done / Unchanged chip), *Try it*
     right, both open; *Try* draws **the node as the canvas draws it** (card, ports with dots, a value bubble per port, the
     dark preview pill above with the first value output), lights the inputs a step reached and the outputs it moved for
     about a second, **styled controls** (signal pills, − / + steppers, a switch for booleans; the clock and *Same frame*
     only for a node that has timers or needs them), and **What happened follows the latest event**;
   - it runs `tryNodeModel` (the interpreter), as the panel does today — the mockup plays a hand copy of the Counter;
   - a loading state that says why it waits (§5.3: the dev stack held the lazy chunk 99 s with no word).
   Memory: [[a-working-wireframe-is-not-the-mockup]] — screenshot the built modal beside the mockup's artboard before
   calling it done; and the editor's two `BaseDialog`s / a `Select` inside a `Modal` closes it. Then ask Richard to drive it
   (NSP-019 AC3).
2. **The agent server gets R34** when `packages/noodl-mcp` is next built (`npm run build` in that package). s93 did not
   build it: `dist/` bundles the working tree, and peers had open edits in `nodegx-export`. Build it when `git status`
   shows no peer edit in a package it bundles, or leave it to the next P112 build, and say which.
3. Cheap alongside: **P107-S92-VIDEOEMBEDSEED** (low; Video conformance red on the day's seed on an embed; recipe in the
   bug file) and **P107-S93-NOTANAME** (low; 220 Problems rows wrap an instruction in "did you mean"; owes words, the
   content-authoring skill, memory [[copy-passes-the-content-authoring-skill]]).

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

**Open, filed this phase:** P107-S93-NOTANAME (low, new), P107-S92-VIDEOEMBEDSEED (low), P107-S89-NIGHTBOOK (medium),
P107-S89-CFEXAMPLES (low; it is why `npm run catalog:examples` exits 1 at 107 / 109), P107-S89-XMLEXAMPLE (low);
P107-S86-STOREDWIRE (medium); P107-S85-RESTCOLTYPES (low); P107-S83-SENDFORM; P107-S79-ADAPTERLABEL (low). **Fixed s93:**
P107-S93-DIDYOUMEAN, P112-S1-SINGLETON.

**Routed to P18 (the export):** `nodegx-export/src/emit/dragLib.ts` :69 / :356 still disables dragging only on `=== false`
(R26). **P109 holds:** D38, the Page Stack, the Router, LIBRARYDOCS, CHR007SNAPSHOT; P107-S82-STATESVALUEPORT and
P107-S82-STATESLOADGATE. **P112 holds:** P107-SIZE.

NSP-010's and NSP-017's uncommitted notes (not this phase's sessions') were left out again.

## Gates (s93, 2026-10-12, on the tree at each commit)

- **`e1f847269` (DIDYOUMEAN):** `tests-unit/nsp-021/problems-panel-did-you-mean` 2 / 2; control (the old unconditional tail)
  red on exactly the retired-node case. `nsp-020/problems-panel-wire-check` + `nsp-021` 22 / 22 (5 suites).
  `typecheck:editor` 0, `typecheck:editor-tests` 0.
- **`83bb0de10` (R34):** contract `tests/singleton` 4 / 4, `tests-unit/nsp-021/duplicateSingleton` 4 / 4; control
  (`hasNodesWithType`'s meaning) red on 3 and 2. `tests-unit/nsp-021` + `validation` + `lib-006` 305 / 305 (22 suites).
  `typecheck:editor` 0, `typecheck:editor-tests` 0, contract `tsconfig.tests.json` 0. `catalog:examples` exits 1 at
  107 / 109 clean, both CloudFunction2 examples = P107-S89-CFEXAMPLES, 0 `duplicate-singleton`.
- **Drives (two launches, one at a time, each torn down; 15 peer MCP servers survived both):** R24 / R25 on a renamed copy
  of Erleah-2-react19 (source SHA unchanged); R34 on a copy of fld-012.
- **Not run:** `test:main`, `test:ci`, the Jasmine suite (`tests/validation/rules.test.ts`, `tests/nodegraph/*`: the
  fixture lost its two dead `allowSingleInstanceOnly` lines, which nothing reads), the MCP suite (no MCP source changed;
  `dist/` not rebuilt).
