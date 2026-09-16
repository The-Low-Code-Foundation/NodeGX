# Phase 88 — next session

**Read first:** [`README.md`](README.md) §3 (what scoping corrected), §4 (rulings) and §7 (rules). Then read the whole task
you pick, including its §8 (§7 for GAM-025).

**The board (2026-09-16, session 16), re-derived from the task files' status lines:** **12 of 25 built, 1 closed by ruling.**
- ✅ **GAM-019**, `4bb438165` + `15f7bf720`. ✅ **GAM-025 closed by R22 (s16): rename it, nothing built.**
- 🟢 **Committed:** GAM-006 `062dfd9c0`, GAM-005 `44b3a9add`, GAM-007 `d57a11668`, GAM-008 `5da1c9fd6`, GAM-009 `bdf1d3b19`,
  GAM-001/002/003 `89e533625`, **GAM-014 `bcfb1c2aa`, GAM-021 `6a6c309a5`, GAM-022 `593de4f57` (all three s16)**. Nothing of P88's
  product code is uncommitted. Remainders are in each §8 and on the README board.
- 🟡 **GAM-012** (fault 3, AC6), **GAM-018** (🔒 R2), **GAM-004** (🔒 close as disproved?).
- ⬜ **12 not started.** GAM-010 (R11) waits on GAM-012's fault 3. GAM-013, 011, 015, 016, 017, 020 and 023 wait on rulings.
  GAM-024 waits on GAM-023 and R2.

**The ratchet:** session 13 measured nothing, s14 measured AC1's door half, s15 built GAM-014, **s16 measured GAM-014 AC3's editor
half and settled R22.** Session 17 must build or measure an AC.

## Do, in order

1. **Ask Richard the rulings that unblock builds, in plain words, not handoff shorthand** (s16: "R22 … A′ … D" got "wtf are you
   talking about?"). Say what a person sees, what each choice does, and the cost. First ones worth asking: **R2** (GAM-018: a kit
   that registers alone fails in the extractor. Make the extractor's `Noodl` plain, or keep the Proxy and answer `undefined`),
   **GAM-004's close** (AC1 does not reproduce in the runtime), **R20** (GAM-023: a deploy that drops a broken wire refuses,
   warns, or deploys unfiltered). A ruling on R2 unblocks GAM-018 **and** GAM-024.
2. **Remainders, lightest first, one heavy job at a time:**
   - GAM-022 AC7: render TPL-006 `Story/Sidebar` at 390×844 and read that the tags wrap, beside a known-firing control.
   - GAM-003 AC5: a browser page with a meter whose input arrives on a press.
   - GAM-002 AC4: rebuild the `src/external` viewer bundle, type `String(n)` into an Expression in the editor, and read the port
     panel and the preview, with a console listener attached first.
   - GAM-001 AC5: render the corpus both ways. The 14 changes are named in its §8.
   - GAM-014: **the save made before a kit registers** (the fix's editor branch, not driven in s16), and AC6 (remove Rocket
     School `Game/Face`'s wrap and re-drive; TPL-007's template and gate, so tell that peer first).
   - GAM-005, GAM-007, GAM-008, GAM-009: their browser and Rocket School halves (see each §8).
3. **GAM-018, once R2 is ruled.** GAM-024 waits on it.

## Richard's, not a builder's

- 🔒 **Found by GAM-021, not registered:** the editor's own agent loop (`AuthoringSession.ts:1185`) passes no `bodyScroll`,
  so an agent building in the editor is never told a page cannot scroll. Register it, and where?
- 🔒 **Found by GAM-022:** P77 SBR-004 dropped its nav bar's `columnGap` to escape D50 (now fixed). Restore it, or leave it?
- 🔒 **Found by GAM-022:** Rocket School's `Hangar/Shelf` (132px tiles) and `Pages/Profiles` (150px cards) still get
  `uncollapsible-multi-column`. Are fixed-pixel tiles in a wrapped row a defect?
- Carried from session 11: GAM-001's `NaN`-over-unset-inputs abstention; `def036-dash-drive`'s newly visible parts; FLD-004's
  split `NaN` row; two catalog examples that used `Number(…)`; `catalog:examples` red at HEAD (Text Input `text`, AIX-005).
- Still open from earlier sessions: `library/prefabs/form-fields/project/project.json` (re-export or revert?); a jump not
  firing At Target Value (GAM-008); an absorbed focused `Set` deciding what a remount shows (GAM-009); R2 (GAM-018);
  GAM-004's close; rulings R1, R11, R12, R15, R16, R17, R18, R20.

## What session 16 settled, including where the handoff was wrong

- **R22, ruled twice.** Richard first chose D ("point to `row.get`") on the condition it works in exported code. Read before
  building: exported rows are plain objects with no `get`, and the exported Function node swallows the throw. Measured with the
  runtime's `Collection` beside a plain row: `row.get('on')` reads the value in the runtime and **throws** on the plain row.
  🔴 **The s13/s15 handoff's "`row.get('on')` already reads the field, measured" was measured on one target only.** D would
  have taught code that breaks silently on export. Second ruling: **"just rename it"**. GAM-025 closed, GAM-007's texts unchanged.
- **GAM-014 AC3, editor half: true.** The preview draws Ada (kit-rooted) 96×96 beside Bea, and a save writes `["face"]` beside
  `["wrap"]`. But the editor resolves the kit type, so HEAD before the fix reads the same: a reading, not an arm.
- **Three commits by pathspec**, each diff checked for peer edits first (`tpl006/tpl007Template.test.ts` held only GAM pins).
  The P78 register's D50, D53, D56 rows and 11 stale "uncommitted" stamps now carry commit hashes.

## State of the tree (session 16)

**Committed in s16:** `bcfb1c2aa` (GAM-014), `6a6c309a5` (GAM-021), `593de4f57` (GAM-022), then one docs commit (this handoff,
the README, GAM-001/002/003/007/014/023/025 task files, the P78 register).

**Not ours, left alone:** `dev-docs/tasks/phase-24-mock-parity/PAR-004-POLISH-PASS.md`, `phase-26-deployment/README.md`,
`phase-92-*` (the CHR-009 peer), `library/prefabs/form-fields/project/project.json`, the date-picker prefab and todo/TPL-008
changes, the untracked `phase-89` to `phase-91` folders, Rocket School's template files, the property-editor files (P92), and
the SYN-003 peer's `nodegx-backend/src/server/*` and `noodl-runtime/src/api/adapters/local-sql/*`.

**Scratch:** s16 `755e094b…/scratchpad/`: `gam025/probe.ts` (+ `.cjs`), `gam014/{project,profile,before.sha,setroot.js}`.
s15 `e7a088f7…/scratchpad/gam014/` (the three arms' projects, deploys, logs, mutants, census).

**Bundles:** `packages/noodl-preview/dist/{nodegx-deploy,noodl-preview}.cjs` rebuilt locally with the GAM-014 fix (gitignored).
The installed app still carries the old export.

## Readings taken in session 16 (2026-09-16, HEAD `593de4f57`)

| reading | result |
|---|---|
| `row.on` / `row.get('on')` / descriptor `.value` / guarded read, runtime row vs plain row | member / value / value / value vs value / **throws** / value / value; control `faces.a` 1 and 1; `collection/reserved-field-name` fired 3× |
| editor (`dev:debug`, scratch `NOODL_USER_DATA_DIR`), copy `gam014-ac3-s16` | components' SHAs unchanged by the open; `Kit/Face` root `game-kit.Avatar` resolves (`allowAsChild` true) |
| editor preview | marker ✓, Ada 96×96, Bea 96×96, 0 `[renderer:exception]` |
| save after `setLabel` on both roots | `Kit/Face` `["face"]`, `Kit/Wrapped face` `["wrap"]` |
| suites | **none run in s16**. The committed code's readings are s12's (GAM-021/022) and s15's (GAM-014: `noodl-preview` 47/47, `tsc` 0). Editor `test:ci` has not been run over GAM-014 or GAM-022 |

## Traps found in session 16

- 🔴 **A door-built fixture has no `rootNodeId`**: the editor preview shows "No HOME component selected". Set it in the live model.
- 🔴 **`toDirectory` does not rewrite an unchanged component**: edit first, then compare mtimes, or the read grades the copy.
- 🔴 **An "escape that works, measured" is measured on the targets it was run on.** Interpreter and export hand scripts different
  row objects.

## Readings taken in session 15 (kept for reference) (2026-09-16, HEAD `6621a992b`)

| reading | result |
|---|---|
| s14 door spec, `GAM014_OUT` | `AC1_EXIT=0`, 3/3, same arms as s14 |
| deployed `/Kit/Face` `roots`, Sep 11 engine and HEAD-built engine | `[]` both; control `/Kit/Wrapped face` `["wrap"]` |
| Chromium, before | marker ✓, Bea 96×96, **Ada absent**, 0 errors, `game-kit.Avatar` registered |
| `noodl-preview` GAM-014 spec: HEAD / fix / 3 mutants / restored | RED `["/Kit/Face","/Kit/Storage"]` / 3/3 / RED, RED, RED on AC4 (`[]`) / 3/3 |
| Chromium, after | `/Kit/Face` `["face"]`; Ada 96×96 beside Bea 96×96; 0 errors |
| `noodl-preview` suite; `tsc --noEmit` | 47/47, `SUITE_EXIT=0`; `TSC_EXIT=0`, both changed files listed |
| AC5 census, 238 components | 16 kit-typed roots, all logic, 0 recorded visual ⇒ 0 deploys change |
| editor `test:ci`, editor canvas (AC3) | **not run** |

## Traps found in session 15

- 🔴 **`gradeRoots` passes a deploy that drops one component's root.** It refuses only an all-rootless export or a rootless start
  component. Read the per-component `withoutRoots`.
- 🔴 **`nodegx deploy` never loads `noodl_modules`**, so every kit type is `UnknownNodeType` in the export (and in GAM-023's future
  health filter).
- 🔴 **The two candidates a task file names can both be wrong.** AC1's "record the `visualRoots`" reading was right, but reading the
  **deployed bundle** between the file and the browser is what named (C).
- ⚠️ The door's `nodes.json` pretty-prints arrays over lines, so a one-line `grep` for `visualRoots` reads nothing.
- ⚠️ `timeout` is not on this Mac's PATH.
