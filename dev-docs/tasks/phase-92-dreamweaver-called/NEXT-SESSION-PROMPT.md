# Phase 92 — next session

**Written 2026-09-17 at the end of s29.** Branch `cline-dev`, commits `git log -- dev-docs/tasks/phase-92-dreamweaver-called`.
The platform half (`~/vscode_projects/nodegx-community`, deployed `f39d20f`) was not touched.

s29 in one paragraph: **CHR-009 is closed on its look.** Richard put `verdicts/CHR-001/…/editor-group-panel-top-*.png`
beside a fresh Group panel, same crop, both themes, and ruled **WORTHY** — that is **AC1**, the criterion the task was
written for. **R6 is final**: keep the fixed label column, shorten what does not fit, and the column is **118px**. The
four long labels were repeating their own group heading, so the value ports carry the bare word and the two signals keep
the full action (the canvas draws a wired port's label with no heading beside it). Then two defects the task's own
instruments could not see: a **sub-pixel** label cut (`scrollWidth` is an integer) and **two label edges** on the panel
(the sections nested in `Advanced CSS` indented their rows 11px, invisible because they are collapsed by default and the
census only reads visible rows). Both fixed and driven: `a42f48665`, `c1e05ec60`.

⚠️ Peers work in this checkout: **P88 / GAM** (`viewer-react/src/nodes/controls/*`, `templates/*`, `validation/*`,
`noodl-mcp/*`) and **P93** (`VisualCanvas/*`, `ComponentsPanelNew/*`). Commit by pathspec — and see the index trap below.

## The board, re-derived from the task files

| id | state |
|---|---|
| CHR-001, 002, 003, 005, 006, 012, 013 | ✅ closed on Richard's look |
| CHR-007 | ✅ built s4, invisible by design |
| CHR-008 the panel is one tree | 🟡 R8, identity, scaffold, 1 widget **inert** (s8–s11). Left: undo re-seed defect, 37 widgets, AC3/AC4 wrong as written (§10.4) |
| **CHR-009 the panel designed** | ✅ **AC1 WORTHY (s29)**, AC2 met over the whole panel for the first time, R6 final at 118px. Left: **AC5 only** — CHR-004 + a `test:ci` |
| CHR-004 the gates measure the scale | ⬜ **next**, and AC5 needs it |
| CHR-010, 011 | ⬜ |

## What to do next, in order

1. **CHR-004** (the gates measure the scale, not the fills). It is what CHR-009's AC5 waits on, and s29 handed it two
   ready-made lessons: the gate must grade text with `measureText` (not `scrollWidth`) and must state the population it
   measured. Read §25.3 and §25.5 of CHR-009 before writing a single check.
2. A **`test:ci`** when no peer holds the box — the last one was s10 (at the floor, 2,984/8, seed 53977). AC5 needs it.
3. Then **CHR-010** (the last icon font: 22 of the editor's 32 FontAwesome uses were in the property panel, which is now
   React) and **CHR-011** (the after picture: re-runs CHR-001's `capture.js` + `measure.js` UNCHANGED).

## Still Richard's

1. The Projects tab's two full-width cards (BST-003 / UNI-001).
2. Whether CHR-008's §3.1 widget conversions resume after CHR-009, or only where a region needs one.
3. `···` menu DECLINED; CHR-007 AC4's `_portsHash` clause DECLINED; §3.4 closed by position (s20); the docked bound
   edge's `S…` left as-is (s28); the switch's colours and a 4px option in a 6px track ALLOWED (s24).

## Settled in s29 (and what it cost)

- **A ruled number must have one home.** `116px` was written in five stylesheets, three of which commented "must
  match". It is now `--property-label-column` on `:root` in `propertyeditor.css`, read as `var(--property-label-column,
  118px)` so a core-ui surface outside the editor keeps the geometry. `npm run tokens:css` verifies it resolves.
- **Renaming a port's `displayName` is cheap; renaming its `name` is not.** Ids untouched ⇒ no migration. But the
  committed catalogs are CI-gated: `catalog:generate` + `catalog:merge`, then `catalog:check`, `catalog:merge:check`,
  `catalog:groups:check`. Check the catalog is clean BEFORE editing so you do not inherit a peer's staleness.
- **Two labels had been cut for the whole task** and two label edges had been reported as one for nine slices. Both were
  instrument faults, not new regressions (§25.3, §25.5).

## Traps (s12–s29)

- 🔴 **`scrollWidth`, `clientWidth` and a `Range` cannot see an overflow under 1px** (s29). `canvas.measureText` with the
  element's computed font is the only honest "does this text fit" reading.
- 🔴 **`drive-set.js`'s `MEASURE` grades only the labels VISIBLE in the viewport** (s29) — 12 of 71 on the Group. Any
  claim about the whole panel needs the whole population, with its size printed beside the reading.
- 🔴 **The shared git index can hold two peers' staged work** (s29: font deletions, a deleted drive script, and a peer's
  regenerated catalog carrying their new port). `git commit -- <paths>` would have swept the worktree state of those
  paths. Commit through a temp index: `GIT_INDEX_FILE=<scratch>/idx git read-tree HEAD`, `git add <my paths>`,
  `write-tree`, `commit-tree -p HEAD`, `update-ref refs/heads/cline-dev`. For a shared generated file, commit
  `HEAD's blob + only your lines` (`git show HEAD:<path>`, patch it, `hash-object -w`, `update-index --cacheinfo`).
- 🔴 **Load decides your session length.** At load 25 (Docker held all 8 cores) a renderer rebuild took ~25 min; at load
  3 the same CSS edit was live in ~60 s. Check `uptime` before planning a drive.
- 🔴 **Never edit a source file while a stack is compiling or live** (s28). Edits go BEFORE the launch or after teardown.
- 🔴 **A reload leaves the editor on the LAUNCHER** (s29): `__nodeGraphEditor` never appears until you click the project
  card again — a wait-loop on it will burn ten minutes reporting "booting".
- 🔴 **Your `dev:debug` REAPS a peer's live stack** (`reapPreviousSession` sweeps the checkout), and **your stack's
  webpack holds :8080**, which a peer's stack cannot share. Announce the launch AND the teardown; ask for the box back
  rather than reaping (s29: c5 held GAM-016/017 for 15 min when asked).
- 🔴 `npm run dev:stop` did NOT stop my stack in s29. Kill by process tree walked from your own `npm run dev:debug` pid
  (plus anything whose command line carries your `NOODL_USER_DATA_DIR`), never by process name.
- ✅ **Drive on `NOODL_USER_DATA_DIR=<scratch>/profile`** (copy `firstRunLegal.json`, write a one-row
  `recently_opened_project.json`): Richard's recents are never touched, so the peer-launch race cannot happen.
  s29's profile + project copy: `/private/tmp/claude-501/-Users-richardosborne-vscode-projects-OpenNoodl/d7b2c2ac-9a30-4bb0-a9a2-8104576365e0/scratchpad/{profile,story-engine}`.
- 🔴 **Numbers passed while the picture was broken** (s12, s13, s15, s17, s19, s21, s25, **s29 twice**). Look at every PNG.
- 🔴 `verdicts/…/*.png` and `out/` are gitignored; `node --check` every drive edit. `appTarget()` returns what
  `connect()` takes, and `evaluate()` already unwraps to the value — copy `drive-set.js`'s helpers verbatim.
- 🔴 A spec reaching `common/Icon` needs FLD-017's `jest.mock` stub; `@noodl-models/projectmodel` throws at load in
  `tests-unit`. A CDP Cmd+A selects nothing on macOS (call `input.select()`). Plain `npx jest` adds `tests-main`.
- 🔴 A nested control reads as its own height: grade the outermost drawn field (s23). **A count is not a finding** (s24).

## Readings at the end of s29 (2026-09-17)

Live, dev build, docked 312, every section open: `--property-label-column` **118px**, **71 labels on one left edge (70)**,
19 section headings on one edge (86), **68 rows all ending at 350**, **0 cut labels** by `measureText`. The 8-node verdict
set (`set/final/`, before the flat fix): 2 font sizes (11, 12) on every type, one label edge, 0 cut labels after the
renames at both 312 and 736. Editor panel suites **24 suites / 281 tests**, `tsc --noEmit` **EXIT 0**, `npm run colors`
/ `type` / `tokens:css` **holding**, the three catalog gates **green**. `test:ci` **not run** (owed by AC5). Stack torn
down, 8080/8674/9333 free, `dev3.out` 0 `ERROR in`.
