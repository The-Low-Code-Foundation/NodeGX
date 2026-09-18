# Phase 92 — next session

**Written 2026-09-18 at the end of s32.** Branch `cline-dev`.
`git log -- dev-docs/tasks/phase-92-dreamweaver-called` for the phase's history.
The platform half (`~/vscode_projects/nodegx-community`, deployed `f39d20f`) was not touched.

s32 in one paragraph: **CHR-010 is built — Font Awesome is gone from the editor — and it is
UNDRIVEN.** The 1.1 MB vendored FA 4.7 directory, both `<link>`s and all 23 source uses are
deleted, converted to core-ui `Icon` across 13 files, with a gate (`npm run icons:font`) holding it
at zero over 3,183 files in 22 packages. Every static reading is green and **not one pixel has been
looked at**: P93 held the box with a live dev stack for the whole session, so AC1's drive, AC2's
boot-network reading and `test:ci` are all still owed. Six of the task's own premises were wrong and
are corrected in CHR-010 §6 — including one, AC3's "there is a spec; keep it green", where the spec
simply did not exist.

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
| **CHR-010 the last icon font** | 🟡 **BUILT s32, UNDRIVEN.** AC2 static half ✅, AC3 ✅, AC4's `colors` ✅. Left: **AC1 drive + look, AC2's network reading, `test:ci`** |
| CHR-011 | ⬜ blocked on CHR-010 |

## What to do next, in order

1. **Take the box and drive CHR-010.** This is the only thing standing between the task and its
   look, and the instrument is already written and syntax-checked:
   `verdicts/CHR-010/drive-icons.js`, run as
   `NOODL_REMOTE_DEBUG_PORT=<port> node drive-icons.js --expect=<scratch copy>`.
   It grades three things and each is there for a reason:
   - **the glyph BOX, not the element count.** `Icon` renders an empty `<span>` when its name has
     no SVG, and a fixed-size `Icon` in a padded box collapses to zero width under the global
     `box-sizing: border-box` — I hit that second one statically on `.queryeditor-caret-icon`
     (`padding-left: 15px` would have eaten the whole 12px box) and fixed it, but only a rendered
     reading can say it is the last one. `44 rows / 44 hosts` is what both defects look like.
   - **AC2's absence**, from `performance.getEntriesByType('resource')` — a `<link>` can be deleted
     while a stylesheet or `@font-face` still pulls the font.
   - **both themes**, because the FA glyphs were `color`-driven text and the SVGs are
     `currentColor`; "recolours with the theme" is AC1's actual sentence.
   Then shoot the surfaces AC1 names — a variants editor, the icon picker, a colour style picker,
   the Router's Pages list, the Component Ports panel, and the drag overlay's drop indicator.
2. **`test:ci`** (AC4), and the full `npx jest tests-unit` that s31 also deferred. I ran only the
   28 suites that import the 13 changed files (617 tests, green).
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
- **NOT run, and owed:** the drive, `test:ci`, and the full `npx jest tests-unit`. P93 held a live
  dev stack on :8080 for the session; load peaked at 10.0.

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
