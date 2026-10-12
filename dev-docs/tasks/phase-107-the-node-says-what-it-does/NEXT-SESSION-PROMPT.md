# P107 — next session

**Written 2026-10-12 (s89, Opus).** Read the [README](README.md) §2–§7 (**R23 is the newest ruling**). Then
[NSP-021 §6.3](NSP-021-THE-SECOND-EDITOR.md) (what s89 drove, measured and built) and the census's
[§5 "the source after"](NSP-021-EDITOR-KNOWLEDGE-CENSUS.md).

**Model: Opus.**

**s89 in one paragraph.** Both owed drives ran in one editor launch on a copy of CMG Drive Looks B. **R20 ✅**: the For
Each `addToBasket` wire is an error naming `itemOutputSignal-addToBasket`. **R21 ✅**: a real canvas drag from a Static
Data onto a Dropdown offers Items, connects, and carries no type warning, with a signal → Items control firing beside it.
Then `allowAsChild` was measured first. Types: 0 differences between the runtime export and the catalog. Visual roots: 0
differences. **But the agent's checker asked none of the editor's four hierarchy errors**: 60 nodes in 208 projects
(nightbook 52, an agent's For Each cards 6), the same 60 counted in the running editor. Richard ruled **R23 "Yes, as
errors"**. Built: `@nodegx/project-contract/hierarchy`, which the editor's node warnings, `ComponentModel` and the
validator's new `invalid-hierarchy` all call. The catalog now takes its child rules from the runtime export (it gained
`haveComponentChildren`; without it the rule would have flagged 70 correct nodes). **Found on the way: R21 had never
reached the agent server** — the enriched catalog it reads was not regenerated in s88 (P107-S89-ENRICHEDSTALE, fixed).

## Board (from the task files)

| task | built | committed |
|---|---|---|
| NSP-000 … NSP-015 | as s44 (NSP-013 left: AC2's export half and the deep run for s11–s14; NSP-014 / NSP-015 left: AC2's export half, P18's) | s1 … s44 |
| NSP-016 the visual nodes | ✅ s71; s73 SCROLLROOM | `aa8abb06f` … `fd6385beb` |
| NSP-018 the spec speaks | ✅ s77 | s72 … s77 |
| NSP-019 Richard reads it | 🟡 s77: AC1, AC2 and the §2 table built; **AC3 is Richard's drive** | s77 |
| NSP-009 the ratchet | ✅ s64; s65 `contract`; s85 `ports` (`floor.ports` **132** since s87) | `6a1ed0084`, s65, s85, s87 |
| NSP-010 a change is a version | ✅ s78 | `36e08e29e`, `64f9576d9` |
| NSP-017 the escape hatches | 🟡 s64–s68. Left: AC1's export half (P18's) | s64 … s68 |
| NSP-023 the spec without React | ✅ (s50) | s45 … s57 |
| NSP-006 the stranger | ✅ rounds 1–4 | `649e6864d`, s70 … s84 |
| NSP-020 ports without a viewer | 🟡 L1–L5 ✅, AC4 ✅, R19 ✅, oracle (c) ✅, R20 ✅ **and driven (s89)**. Left: Router's labels (ADAPTERLABEL) | s79 … s87 |
| **NSP-021 the second editor** | 🟡 AC1 ✅ (s87); §3.2: Navigate, Cloud Function (s87), `typecasts` ✅ s88 (R21 driven s89), **`allowAsChild` / visual-ness ✅ s89 (R23)**. Round trip (§3.3) = P112 OWN-006 | s87, s88, s89 |
| NSP-022 the cloud-only nodes | 📋 (needs a second runtime target) | s21 |

## What s90 does (in order)

1. **The kit overlay's copy of the child rules** (`packages/nodegx-kit-catalog/src/index.js` :392-443): the last of the
   three hand mirrors census §2 named. Measure first, as s89 did: a kit node's `allowAsChild` / `allowChildrenWithCategory`
   from the overlay against what the editor's node library gets for the same kit (the runtime registers kit nodes through
   the same `defineNode`, so `generateNodeLibrary` over a register with the kit loaded is the oracle). Keep a
   known-firing control beside any zero. If they agree, move the overlay onto `@nodegx/project-contract/hierarchy`'s
   reading of the export (or note why a published package cannot), and only then retire it.
2. **Display name / deprecation at node level** (census §2's next rows). Measure the editor's answer against the MCP's
   over Richard's projects before designing anything.
3. Router (ADAPTERLABEL) only if a reason appears.

**The census recipe (s89):** write a scratch entry that `import`s `scripts/node-catalog/dom-shim` by absolute path,
registers the browser runtime + viewer nodes as `extractor-entry.js` does, and calls the REAL `generateNodeLibrary`;
bundle it with `require('./scripts/node-catalog/lib/bundle').bundleEntry(entry, outDir)` (the `@noodl/runtime` alias and
the type-stub plugin come with it) and run the bundle with node. Population: everything under `vscode_projects` (depth 3,
OpenNoodl excluded) plus the v2 projects in `~/Library/Application Support/NodeGX/recently_opened_project.json`, by
realpath (123 on 2026-10-12), and the committed corpus (85). Put a synthetic control project in the list.

**Driving recipe (s89):** copy the project to the scratchpad and rename `nodegx.project.json`'s `name`; open it with
`LocalProjectsModel.instance.openProjectFromFolder(dir)` then the fiber router's `route({ to: 'editor', project })`;
`cdp reload` between projects. `ProjectValidationService.instance.report` is `null` until the Problems panel mounts
(click `[aria-label="Problems"]`). A real wire drag is `node scripts/devtools/cdp.js drag "x,y" "x,y" 25` from the
source's output dot onto the target node (screen = canvas rect + (graph + pan) × scale); the popup's rows are
`[class*=listElementPort]`, `enabled` when offered. Afterwards remove your entries from `recently_opened_project.json`.

**Human decisions:**
- NSP-019 AC3 and its three choices; C160; C161; C162.
- **P107-S84-USERACL**: should the User family hide `ACL` like the Record family?
- The Frappe note in NSP-010 §4 is owed to Richard **before the first `changes` entry answers `project`**. None does yet.
- **P107-S89-NIGHTBOOK** is the template owner's (P78): make each `/Data/*` instance a root of its page; it moves the 26
  pinned in `tests-unit/nsp-021/hierarchy`.

NSP-010's and NSP-017's uncommitted notes (not this phase's sessions') were left out again.

**Open, filed this phase:** P107-S89-NIGHTBOOK (medium), P107-S89-CFEXAMPLES (low; `catalog:examples` red on two Cloud
Function examples before s89), P107-S89-XMLEXAMPLE (low); P107-S86-STOREDWIRE (medium); P107-S85-RESTCOLTYPES (low);
P107-S83-SENDFORM; P107-S79-ADAPTERLABEL (low). **Fixed s89:** P107-S89-HIERARCHY (R23), P107-S89-ENRICHEDSTALE.

**P109 holds:** D38, the Page Stack, the Router, LIBRARYDOCS, CHR007SNAPSHOT; P107-S82-STATESVALUEPORT and
P107-S82-STATESLOADGATE. **P112 holds:** P107-SIZE.

## Gates (s89, 2026-10-12, this tree on `8a714409f` + s89's uncommitted changes, then committed)

- **Drives**: R20 and R21 in the running editor (screens in `shots/s89-*`); hierarchy counts in the running editor:
  nightbook 26 + 26, phase55-s6-haiku 3 + 3, SBR-006 Admin Drive 0.
- project-contract: `tests/hierarchy` 11 / 11; `tsc` 0 (both configs).
- editor: `tests-unit/nsp-021` 13 / 13 (planted: Component Children's categories dropped → the control red; "cannot be a
  child" always false → two red); `tsc` 0. `tests/validation` 89 / 90 — the one red is `rules.test.ts` nonexistent-port
  "lists available alternatives", as s88 recorded. **Whole `tests-unit`: 557 / 565 suites, 9,199 / 9,214 tests.** The 8
  red suites, none reading s89's files: `exp-013/exportBadge` (export ledger), `hlt-013/libraryDocs` (library prefab),
  `vfn-011/drift-gate`, `def007-project-load-seam` and `hls003`/`hls009` scans (peers' open edits in `noodl-preview`,
  `noodl-mcp`, `LocalProjectsModel.ts`), `chr-007/widgetDispatch` (Page Stack port snapshot), `el-009` (a kit render,
  3 / 3 red alone). `nsp-019/tryNode` was red too: `spec-disagreements.json` stale since s88's bug — regenerated, green.
- catalog: `catalog:check` 0, `catalog:merge:check` 0; `catalog:examples` 107 / 109 (the two Cloud Function examples,
  red with the new rule off too).
- MCP whole suite (before the last three fixes): 182 / 196 suites, 3,887 / 3,905 tests. Attributed by re-running the 14
  red ones with the new rule switched off: **3 were s89's** — `kitOverlay` and `kitAgreement` (the kit fixture's `/Broken`
  puts a Badge inside a Meter that declares `allowChildren: false`: two true placement errors, now named in both tests;
  30 / 30) and `cmp001InterfaceDoctrine` (the new `/Post Row` moved the corpus publish rate 39 → 38; constant moved; 26 / 26).
  `iw008Crew` passed alone (load). **10 red with the rule off too, none s89's**: `cmp004Parts` / `cmp004RoundTrip` (a shelf
  entry's `icon.png`), `def018-def020-layout-drive`, `def038SettledTemplates` (nightbook, a peer's generator is untracked
  in the tree), `fld013ExportReach` (export ledger), `nodeIdAllocation` (its fixture wires Text's `text` OUTPUT, which
  Text does not have), `sbr009ThemeEditorDrive`, `tpl010Template`, `tpl011Template` (refused on a cloud component's
  `unknown-function-port`), `writePathConformance` (an allow-list entry `component.type` no longer seen).
  ⚠️ **`tpl011` authors nightbook through the agent's door: once its cloud error is fixed, R23 will refuse its page writes
  until P107-S89-NIGHTBOOK is fixed** (predicted from the template's tree; not run). `typecheck:mcp`: 1 error, in P116's
  `ont002WorldTools.test.ts` (not touched). `typecheck:editor-tests` 0.
- **Committed:** `9da5979f9` (code), then the docs commit.

**Not run:** `test:main`, `test:ci`, the node-spec suite (s89 changed no spec).
