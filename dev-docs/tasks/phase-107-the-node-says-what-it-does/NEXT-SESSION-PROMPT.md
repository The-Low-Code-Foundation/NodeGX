# P107 — next session

**Written 2026-10-12 (s90, Opus).** Read the [README](README.md) §2–§7 (**R24 and R25 are the newest rulings**). Then
[NSP-021 §6.4](NSP-021-THE-SECOND-EDITOR.md) (what s90 measured and built) and the census's
[§5 "the source after"](NSP-021-EDITOR-KNOWLEDGE-CENSUS.md).

**Model: Opus.**

**s90 in one paragraph.** The kit overlay's copy of the child rules was measured against the real kit extractor over 203
projects: 0 of 358 kit entries differed (a control did), so it now copies the export's fields (`429404268`). Display name
and deprecation: 0 of 180 types differ between export and catalog, so a spec `displayName` would change nothing. The gap
was **per node**. 17,130 cards (169 projects) are titled by one of their ports, and the agent named them by type. Richard
ruled **R24 "Card title + type"**. 52 nodes of retired types exist, which the editor refuses to create while no agent
check read the flag. Richard ruled **R25 "Warn on any"**. Both are built (`7ce9223ee`): `@nodegx/project-contract/node-title`
for the editor and `describe.ts`, and `replacedBy` on 16 node definitions through to `deprecated-node`. Also fixed:
P107-S90-EMPTYLABEL (`97617baab`, 97 nodes named "" by the agent). The new rule found two published examples teaching
retired nodes; both are handled.

## Board (from the task files)

## Board (from the task files)

| task | built | committed |
|---|---|---|
| NSP-000 … NSP-015 | as s44 (NSP-013 left: AC2's export half and the deep run for s11–s14; NSP-014 / NSP-015 left: AC2's export half, P18's) | s1 … s44 |
| NSP-016 the visual nodes | ✅ s71; s73 SCROLLROOM | `aa8abb06f` … `fd6385beb` |
| NSP-018 the spec speaks | ✅ s77 | s72 … s77 |
| NSP-019 Richard reads it | 🟡 s77: AC1, AC2, the §2 table; **s91: driven by Richard — "Needs changes" (R30): a pop-out modal, §5.3** | s77, s91 |
| NSP-009 the ratchet | ✅ s64; s65 `contract`; s85 `ports` (`floor.ports` **132** since s87) | `6a1ed0084`, s65, s85, s87 |
| NSP-010 a change is a version | ✅ s78 | `36e08e29e`, `64f9576d9` |
| NSP-017 the escape hatches | 🟡 s64–s68. Left: AC1's export half (P18's) | s64 … s68 |
| NSP-023 the spec without React | ✅ (s50) | s45 … s57 |
| NSP-006 the stranger | ✅ rounds 1–4 | `649e6864d`, s70 … s84 |
| NSP-020 ports without a viewer | 🟡 L1–L5 ✅, AC4 ✅, R19 ✅, oracle (c) ✅, R20 ✅ **and driven (s89)**. Left: Router's labels (ADAPTERLABEL) | s79 … s87 |
| **NSP-021 the second editor** | 🟡 AC1 ✅ (s87); §3.2: Navigate, Cloud Function (s87), `typecasts` ✅ s88, `allowAsChild` ✅ s89 (R23), **kit mirror retired, display name / card title ✅ (R24), deprecation ✅ (R25) s90**. Left in §3.2: singleton, units, enum labels, which runtimes (NSP-022). Round trip (§3.3) = P112 OWN-006 | s87 … s90 |
| NSP-022 the cloud-only nodes | 📋 (needs a second runtime target) | s21 |


## What s91 does (in order)

1. **See R24 and R25 where a person and the agent see them.** Neither has been driven. (a) The agent: rebuild
   `packages/noodl-mcp` (`dist/` is stale until then; memory: a stale dist hides a merged field), then call
   `get_component` on a COPY of a project with unlabelled Variables (Erleah-2-react19 has `screenWidth`, `viewport`) and
   read `Variable "screenWidth" [id].value` plus `title` on the rows. (b) The editor (run-editor skill, one launch, a
   copy with a REST2: 34 such nodes in the census, find one by grep on `"REST2"`): the Problems panel lists
   `deprecated-node` naming HTTP Request; the canvas card titles are unchanged (R24 moved the editor's rule into the
   contract package and must not move a pixel). Keep a control beside the zero.
2. **Run `deprecated-node` over the projects.** s90 counted 52 by the export's flag and did not run the rule. Count the
   rule's warnings over the same 357 (both formats) and compare.
3. **The next §3.2 rows** (census §5): `singleton` (the editor's warning cannot fire, §3), units, enum labels. Measure
   the editor's answer against the agent's before designing, as s88–s90 did.

**The census recipe (s89/s90):** bundle a scratch entry with `require('./scripts/node-catalog/lib/bundle').bundleEntry`
that imports `scripts/node-catalog/dom-shim` by absolute path, registers the browser and cloud runtimes (as
`extractor-entry.js` does) and writes `generateNodeLibrary(...).nodetypes` to JSON. Population: `find vscode_projects
-maxdepth 4` for `nodegx.project.json` / `project.json` (OpenNoodl excluded), the launcher's
`recently_opened_project.json`, the committed `nodegx.project.json` files under `packages/` and `dev-docs/`, by realpath
(357 on 2026-10-12), plus a synthetic control project. Read both formats: v2 `components/**/nodes.json`, legacy
`project.json` graph roots. Kits: `node packages/noodl-mcp/dist/kit-extract.cjs <dir>` is the agent's real extractor.

**Human decisions — RULED 2026-10-12 (s91, on a rulings page; README R26–R32):**
- C160 Drag Enabled → **off means off** (R26). C161 Video → **Restart/Reset go to Start Time** (R27). C162 parsers →
  **rename "Max Characters", keep the check** (R28). USERACL → **hide ACL like the Records** (R29). All four bug files are
  `scheduled`, each with its regression scenario. None is built. Each is small: runtime + spec `version` + `changes`.
- NSP-019 AC3 → **"Needs changes"** (R30): the Try panel becomes a pop-out modal ("How this node works" button) with a
  live mock of the node, data bubbles, inputs lighting up, a timeline that follows the latest event. R31: the folds' open
  state and the five wordless specs fold into it ("spec in progress", never an empty Try). Brief: NSP-019 §5.3.
  **Mockup to Richard before building** (a wireframe is not the mockup).
- The Frappe note → **a named list, built when the first `changes` entry answers `project`** (R32). Nothing to build now.
- Still Richard's: **P107-S89-NIGHTBOOK** is the template owner's (P78). 14 deprecated types have no `replacedBy`; ask
  only if a person hits one.

**s91 did only the rulings** (no build): the page, the measurements behind it, Richard's drive of the panel in the dev
editor (torn down, launcher entry removed, the source's SHA unchanged). The s91 steps 1–3 below are still owed, and now
sit beside the four R26–R29 fixes and the R30 modal. Suggested order: R26–R29 (one session, small, each with its
scenario and mutant), then s91's steps 1–3, then the R30 mockup.

NSP-010's and NSP-017's uncommitted notes (not this phase's sessions') were left out again.

**Open, filed this phase:** P107-S89-NIGHTBOOK (medium), P107-S89-CFEXAMPLES (low), P107-S89-XMLEXAMPLE (low);
P107-S86-STOREDWIRE (medium); P107-S85-RESTCOLTYPES (low); P107-S83-SENDFORM; P107-S79-ADAPTERLABEL (low).
**Fixed s90:** P107-S90-EMPTYLABEL.

**P109 holds:** D38, the Page Stack, the Router, LIBRARYDOCS, CHR007SNAPSHOT; P107-S82-STATESVALUEPORT and
P107-S82-STATESLOADGATE. **P112 holds:** P107-SIZE.

## Gates (s90, 2026-10-12, this tree on `2e3e25ec0` + s90's changes, then committed)

- kit-catalog 83 / 83 (planted: the old derivation → red). project-contract `node-title` + `hierarchy` 17 / 17;
  `typecheck` 0 (exit read without a pipe).
- MCP: `nsp021CardTitle` 4 / 4 (planted: the title port unread → 3 red), `nsp021EmptyLabel` 3 / 3 (planted: `??` back → red),
  the 12 kit suites 215 / 215. **Whole suite: 186 / 198 suites, 3,884 / 3,912 tests** (JSON report, mtime 08:49). 12 red:
  s89's same 10, none reading s90's files (`sbr009ThemeEditorDrive`, `def018-def020-layout-drive`, `tpl011Template`,
  `def038SettledTemplates`, `tpl010Template`, `cmp004Parts`, `cmp004RoundTrip`, `writePathConformance`,
  `nodeIdAllocation`, `fld013ExportReach`); `iw008Crew` (a 5 ms tick budget; alone it passed 1 of 3, at 5.2 and 8.9 ms
  under load from Firefox and a VM: load, as s89); `nodeDocBudget` **was s90's**: Text Input's summary gained
  `replacedBy`, +13 measured (8,338 → 8,351, 12 headroom left). Ratchet moved to 8,450 with the note, now green.
  `typecheck:mcp`: 1 error, P116's `ont002WorldTools.test.ts` (unchanged from s89).
- editor: `tests-unit/nsp-021` 17 / 17 (planted: rule inverted → 3 red); validation, nsp-019, alpha-006, cn-003/004/008/010
  24 suites, 339 / 339 (s89's red `rules.test.ts` case passes now); the electron spec `basicnodetype-label.spec.ts` run
  under jest against the new `labelForNode`, 11 / 11 (temporary copy, removed). `typecheck:editor`, `:editor-tests`,
  `:runtime`, `:viewer`, `:cloud` all 0.
- runtime: export and definition tests 90 / 90. backend `cloud-system-roles` 15 / 15; canvas-look 3 / 3.
- catalog: `catalog:check` 0, `catalog:merge:check` 0, `catalog:examples` 107 / 109 (the two Cloud Function examples,
  P107-S89-CFEXAMPLES; the new rule's three findings in two examples are handled).
- **Not run:** any drive (s91 step 1), `test:main`, `test:ci`, the node-spec suite (no spec changed). The
  `replacedBy` invariant in `build-catalog.js` was not planted.
- **Committed:** `429404268`, `97617baab`, `7ce9223ee`, then the docs commit.
