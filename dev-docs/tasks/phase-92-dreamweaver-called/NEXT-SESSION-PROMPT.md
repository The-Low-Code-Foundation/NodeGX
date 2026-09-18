# Phase 92 — next session

**Written 2026-09-18 at the end of s32.** Branch `cline-dev`.
`git log -- dev-docs/tasks/phase-92-dreamweaver-called` for the phase's history.
The platform half (`~/vscode_projects/nodegx-community`, deployed `f39d20f`) was not touched.

s32 in one paragraph: **Font Awesome is gone from the editor, and it has been driven.** The 1.1 MB
vendored FA 4.7 directory, both `<link>`s and all 23 source uses are deleted, converted to core-ui
`Icon` across 13 files, with a gate (`npm run icons:font`) holding it at zero over 3,183 files in 22
packages. **AC2 is closed on the live renderer** — no FA link, no `@font-face`, no FontAwesome rule
across 284 stylesheets, 0 FA-classed elements — and AC1's *mechanism* is verified on two panels in
both themes: 0 empty hosts, 0 collapsed glyphs, every glyph recolouring with the theme. **AC1 is not
closed**: three of the surfaces its sentence names were unreachable in the project I drove, and it
ends on Richard's look. Six of the task's own premises were wrong (CHR-010 §6) — including AC3's
"there is a spec; keep it green", where the spec did not exist.

⚠️ Peers work in this checkout: **P88 / GAM** (`viewer-react`, `templates/*`, backend + mcp) and
**P93 / TVW** (`ComponentsPanelNew/*`, `VisualCanvas/*`, with STAGED deletions in the shared index —
`library/prefabs/date-picker/.../Inter-Medium.ttf` is still staged). Commit through a temp index;
`git commit -- <paths>` would sweep their work.

## The board, re-derived from the task files

| id | state |
|---|---|
| CHR-001, 002, 003, 005, 006, 012, 013 | ✅ closed on Richard's look |
| CHR-007 | ✅ built s4, invisible by design |
| CHR-008 the panel is one tree | 🟡 R8, identity, scaffold, 1 widget **inert**. Left: undo re-seed defect, 37 widgets, AC3/AC4 wrong as written (§10.4) |
| CHR-009 the panel designed | ✅ AC1 WORTHY (s29), **AC5 met except one thing**: a ruling on the `IconInput` placeholder (§24) |
| CHR-004 the gates measure the scale | 🟡 AC1–AC3 ✅, AC5 RULED + HEAD run ✅. Left: **AC4/§3.3, re-priced in §7.7 — read it before touching** |
| **CHR-010 the last icon font** | 🟡 **BUILT + DRIVEN s32.** AC2 ✅ (live), AC3 ✅, AC4 ✅ (`colors` 16=16, `test:ci` at the floor). Left: **AC1 — three named surfaces unreached, and Richard's look** |
| CHR-011 | ⬜ blocked on CHR-010 |

## What to do next, in order

1. **Finish AC1's surface list.** The mechanism is proven (§7 of the task file: 0 empty hosts, 0
   collapsed, correct recolouring, both themes, two panels). What is NOT seen is three of the
   surfaces AC1's sentence names, because `rocket-school` cannot show them:
   - **a variants editor** — the node has no variants, so the popout opens straight into its
     create-mode branch and never draws the `.variants-add-header` **+** (the one place my deletion
     of `.variants-add-header > i.fa` could have moved something; the `+` now rides the existing
     `.add-button` rule instead, argued but unseen).
   - **the icon picker** — needs an `Icon` node (`fa-search` → `IconName.Search`).
   - **a proplist / the Component Ports panel** — `ComponentPortsView`'s six conversions need a
     component with its own ports, and [[only-two-projects-have-a-component-with-input-ports]].
   Pick a project that has all three, or add the nodes with `NodeGraphNode.fromJSON` +
   `graph.addRoot` the way `verdicts/CHR-009/2026-09-17/set/drive-set.js` does. Also unseen: the
   drag overlay's drop indicator (`iconHost`), and `.queryeditor-caret-icon`, where I fixed a
   `border-box` collapse statically and nothing has rendered it.
   🔴 **Fix the drive script's dead arm first if you reuse it** — see the trap list below.
2. **The full `npx jest tests-unit`**, which s31 also deferred. I ran only the 28 suites that import
   the 13 changed files (617 tests, green). ✅ `test:ci` is **taken** — see Readings.
3. **Ask Richard the two questions he owes**, both with a PNG rather than a ratio (s21: *"greyed is
   a picture, not a DOM attribute"*):
   - CHR-009 §24 — `IconInput`'s `None` placeholder at **3.897:1 dark / 3.373:1 light** against
     4.5:1. Darken it to the AA token, or rule it as placeholder text and add a second entry to
     `scripts/look-gate/rulings.js`.
   - CHR-010 AC1 — the person sentence, on the shots from item 1.
4. **§3.3 / AC4 — but NOT as written**, and ask before starting: s31 measured it and three premises
   are wrong (CHR-004 §7.7). The `:global(.sidebar-property-editor)` removal costs a variant
   threaded through ~18 call sites, not a four-file edit. ✅ The one small piece §7.7 called
   *"genuinely worth fixing"* is **done** (s32): `portHint.test.ts`'s stale `property-row` literal
   is now a neutral sentinel that names no product class.
5. Then **CHR-011** (re-runs CHR-001's instruments UNCHANGED) — the phase's close.

## 🔴 One thing I did wrong, so the next session does not

**I ran a four-arm mutant check that wrote and restored a source file eight times while a peer's dev
stack was live and watching it.** I had told them I was "static-only", meaning no jest and no stack,
and a file mutation is neither — a mid-compile flip is exactly what wedged two stacks in s28. All
four arms restored byte-identical (`cmp`-verified) and the peer had a caption check that would have
caught a stale bundle, so nothing was lost, but that was luck. **"Static" means no writes to
`packages/**`, not "no test runner."** Mutants belong in the window where you hold the box.

The peer also made the right move in the other direction and it is worth copying: they opened with a
strong claim (*"your deletion may invalidate my screenshots"*), then **measured instead of assuming**
and downgraded it themselves — neither surface they were shooting references FA at all.

## Readings at the end of s32 (2026-09-18)

- `npm run icons:font` (new) — **0 findings over 3,183 files / 22 packages, exit 0**. Four mutant
  arms, one per pattern, **all red naming the file**; every arm restored byte-identical.
- `npx jest tests-unit/chr-010` — **1 suite / 3 tests, exit 0**; **3 mutants, 3 red**, including the
  instrument guard (rename the enum ⇒ red, so a silent zero cannot read as a clean run).
- `npx jest` over the 28 suites importing the 13 changed files — **617 tests, exit 0**.
- `npm run typecheck:editor` — **clean**.
- `npm run colors` **16 = 16** (unchanged with the FA exemption removed, exactly as AC4 predicted:
  FA's CSS was excluded, not counted). `npm run type` −6 vs baseline (that is s31's, not mine).
  `icons:css` and `tokens:css` green.
- ✅ **`test:ci` AT THE FLOOR, AT MY COMMIT — and I did not run it.** P93 ran it for their own AC8
  and it landed on HEAD `382b716f` (this session's CHR-010 commit): **2,985 specs / 8 failures,
  seed 98435, 67s**, and the eight are the standing floor by name (3 SUB-006, 3 SUB-011, 2 NDA-017),
  none in this phase's surface. That is **a fourth seed agreeing** (46376, 38645, 68399, 98435).
  ⚠️ Relayed, so relay the MEASUREMENT and not my conclusion: it carries seed, HEAD, duration and
  the eight by name, which is what makes it checkable
  ([[a-relayed-conclusion-decays-faster-than-a-relayed-measurement]]). Deleting Font Awesome moved
  nothing in `test:ci`.
- ✅ **The drive, dev build at HEAD `382b716f`, scratch copy of `rocket-school`** (repo template
  clean afterwards). AC2: `<link>`s `["../assets/css/style.css"]`, `@font-face` families
  `["Bricolage Grotesque"]`, **0 FontAwesome rules across 284 stylesheets**, 0 FA-classed elements.
  AC1 mechanism: Router panel **47 drawn / 0 empty / 0 collapsed** dark and **54 / 0 / 0** light,
  Group properties **42 / 0 / 0**; both `Pages.tsx` glyphs 14×14 with real SVGs, recolouring
  `rgb(221,228,236)`→`rgb(74,86,99)` across the theme flip. PNGs in
  `verdicts/CHR-010/2026-09-18/`, read not just counted.
  ⚠️ That build carried **P93's uncommitted TVW-001 delta** (committed after as `d541b6442`) — see
  the task file's §7 caveat.
- **NOT run, and owed:** the full `npx jest tests-unit`.

## 🟡 One unowned failure, measured, NOT inherited

`tests-unit/property-editor/portWireShape.test.ts` **fails to run** —
`noodl-viewer-react/src/fontloader.ts:77 error TS2304: Cannot find name 'Noodl'`. What I measured
before leaving it:

- It fails **in isolation**, so it is not an interaction with my edit in the same directory.
- **Nothing I changed is in its import graph** (`portWireShape.test.ts` →
  `node-shared-port-definitions.ts` → `fontloader.ts` + `@noodl/runtime/src/utils`); my 13 files are
  all under `views/`, `reactcomponents/`, `styles/` and `assets/`.
- `fontloader.ts` is **unmodified**, mtime Jul 27, last touched by `0d323b38c`. `noodl-viewer-react`
  is entirely clean in the working tree. No `tsconfig` or `.d.ts` is modified.
- It is a missing **global** (`typings/global.d.ts` declares `Noodl`), i.e. a type-environment
  problem, not a code change.

🔴 So either s30's *"465/465 suites, exit 0"* was taken with a different scope — memory warns
repeatedly that `npx jest tests-unit` (449) and a plain `npx jest` (471) are different populations,
so **name the command with the count** — or a peer's uncommitted work moved the type environment.
Do not assume it is yours; re-measure it against HEAD in a worktree before spending a session on it
([[a-none-owned-blocker-is-the-one-most-likely-already-fixed]]).

## Still Richard's

1. The Projects tab's two full-width cards (BST-003 / UNI-001).
2. Whether CHR-008's §3.1 widget conversions resume, or only where a region needs one.
3. Whether §3.3's `:global` removal is worth the ~18-call-site refactor it actually costs.
4. The `IconInput` placeholder, and CHR-010's person sentence (item 3 above).
5. **RULED s30:** the gate is a hand-run check, not CI; the six colour-pinning specs deleted.
   **RULED s31:** the panel's quiet field edge STAYS — *"no outlines like in the after pic"*.
   🔴 **Do not re-propose `border-control` on panel fields.**
6. `···` menu DECLINED; CHR-007 AC4's `_portsHash` clause DECLINED; §3.4 closed by position (s20);
   the docked bound edge's `S…` left as-is (s28); the switch's colours and a 4px option in a 6px
   track ALLOWED (s24).

## How to take the gate reading each session (Richard's standing rule)

The look gate stays a **hand-run check taken before work is shown to him**, not wired into CI (its
judgement half does run in CI via `test:main`). One command per surface once a dev build is up:

```
NOODL_REMOTE_DEBUG_PORT=<port> node scripts/look-gate/run.js --surface=property-panel --theme=both
NOODL_REMOTE_DEBUG_PORT=<port> node scripts/look-gate/run.js --surface=launcher --theme=both --state=all
```

- **`--no-rulings` is the raw picture.** Any claim about a whole surface should be taken once
  without them, or the claim is about the exceptions as much as the surface.
- 🔴 **Gate on the exit status**: 0 green, 1 findings, **2 = could not measure at all**. Never on
  the last line of the log, and never through a pipe.
- The ruled-exception facility (`scripts/look-gate/rulings.js`, 21 specs, 7 mutants) and the six
  properties it is held to are unchanged from s31 — an exception matches a measured COLOUR PAIR,
  never an element, a class or a rule; a ruling matching nothing is named.

## Traps (s12–s32)

- 🔴 **"Static-only" is about writes, not about runners.** See the section above.
- 🔴 **`performance.getEntriesByType('resource')` SEES NO FONTS AND NO STYLESHEETS in this
  renderer.** My AC2 arm read `[]` for `font-awesome` and was **vacuous** — the same call returns
  `[]` for every font and every CSS file, so it could not have reported a request had one existed.
  Use `document.fonts` (it lists every `@font-face` a live stylesheet declares, so Bricolage's
  presence is the signal that makes FontAwesome's absence mean something) plus the `link` list and a
  rule-text scan **that reports how many rules it scanned**. The script is fixed; the lesson is
  [[assert-an-absence-with-a-known-firing-signal-beside-it]], and it cost nothing only because I
  checked the instrument before believing it.
- 🔴 **"Nothing of theirs was in the tree I shot" needs a `git status` AT LAUNCH TIME, not the
  absence of their commit.** A peer's work sits uncommitted in a shared checkout and your webpack
  compiles it. I made this claim twice in one session from commit timing and was corrected twice.
- ✅ **Opening a scratch project without touching recents or the launcher:** emit
  `ViewerConnection.openProjectRequested` on `EventDispatcher.instance` with `{directory, requestId,
  replyTo}` — it runs `performExternalOpen`, which does the load AND the `router.route({to:'editor'})`
  that `LocalProjectsModel.openProjectFromFolder` alone does **not** (that call resolves a
  ProjectModel and leaves you on the launcher, which reads exactly like a failure).
- 🔴 **The panel's tab row and the panel's TITLE both say "Properties".** A click at the title's
  coordinates silently leaves the wrong tab active and the row census reads `rows: 0` — which looks
  like a broken panel, not a missed click. The tabs are the y≈145 row; the title is y≈53.
- 🔴 **A gate's population is exactly what its regex matches** (third time this phase). AC2's three
  strings would have missed the two hardest FA dependencies in the repo: `classList.add('fa-share')`
  in `popuplayer.ts`, and ``className={`fa ${x ? 'fa-caret-up' : …}`}`` in `PortGroup.tsx`, where
  the pair is split by an interpolation. **Strip comments too** — at the moment CHR-010 landed the
  only two `FontAwesome` strings left under `packages/*/src` were both prose describing the history,
  and a gate that reddens on its own changelog is one somebody switches off.
- 🔴 **A repo-wide grep counts `index.bundle.js`.** It is gitignored build output that holds the old
  strings until the next rebuild, so counting it reports the build's age, not the source's. CHR-003
  §2 made this mistake; CHR-010 §2's glyph list repeated it.
- 🔴 **`Icon` is `display: block`.** Four containers relied on inline flow and needed explicit
  centring; the drag overlay needed an `inline-flex` host, because blockifying the glyph would have
  dropped the drag label onto its own line.
- 🔴 **A fixed-size `Icon` inside a padded box loses the padding to `border-box`** and renders zero
  wide. Nothing reports it but the picture.
- 🔴 **A count is not a finding.** 82 of s31's 84 were one token decision.
- 🔴 **An index line is a POINTER, not the claim** — open the file before declaring an artefact has
  moved. (s31 reported the `test:ci` floor as drifted on a stale reading of `MEMORY.md`.) s32 found
  the same shape in this phase's own README: *"floor is 4 by name (AIX-006); a fifth red is yours"*
  was still there after AIX-006 was fixed and the floor moved to **8**. Corrected in §7.
- 🔴 **A leftover popout silently zeroes the whole gate** (1,018 of 1,018 refused, exit 2). Close
  what a drive opened; Escape and `.click()` do not dismiss it, a real dispatched press does.
- 🔴 **`execFileSync` returns only STDOUT, and jest prints its summary to STDERR even on a PASS** —
  a passing mutant reads byte-identical to a suite that failed to run. `spawnSync`.
- 🔴 **A pipe eats the exit code.** Redirect to a file, capture `$?`, grep.
- 🔴 **`Test Suites: 1 failed` beside `Tests: N passed` means a suite failed TO RUN** — the one
  outcome that must never be read as a pass. s32's `portWireShape` is exactly this shape.
- 🔴 **`cdp.js` defaults to 9222** — set `NOODL_REMOTE_DEBUG_PORT` on every call.
- 🔴 **Load decides your session length.** ~25 min for a renderer rebuild at load 25, ~60 s for a CSS
  edit at load 3. `uptime` before planning a drive.
- 🔴 **Your `dev:debug` REAPS a peer's live stack** and holds :8080. Announce the launch AND the
  teardown, and ask for the box rather than reaping.
- 🔴 **Numbers passed while the picture was broken** (s12, s13, s15, s17, s19, s21, s25, s29 twice).
  Look at every PNG.
- 🔴 A spec reaching `common/Icon` needs FLD-017's `jest.mock` stub — and note that **no
  `moduleNameMapper` stub exists**, contrary to CHR-010 §5: 23 specs each carry their own
  `jest.mock`. Read `Icon.tsx` as TEXT when you want to grade the icon set itself, because the stub
  is precisely what would hide a missing glyph.
