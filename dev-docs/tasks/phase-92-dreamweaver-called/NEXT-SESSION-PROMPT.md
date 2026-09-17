# Phase 92 — next session

**Written 2026-09-17 at the end of s30.** Branch `cline-dev`, commits `git log -- dev-docs/tasks/phase-92-dreamweaver-called`.
The platform half (`~/vscode_projects/nodegx-community`, deployed `f39d20f`) was not touched.

s30 in one paragraph: **CHR-004's gate exists, is graded, and has been driven.** `scripts/look-gate/`
collects a live surface in the renderer over CDP and judges it in Node — text ≥ 4.5:1, control edge
≥ 3:1, font size on R1's ramp, radius on CHR-003's, and does the text fit its box — every finding
naming the element, every result carrying the population it came from. The judgement half is graded
by 39 specs in `tests-unit/chr-004/` (in CI today via `test:main`), 10 mutants of it are red. The
person sentence is **proved on a running build**: moving every `LauncherButton` fill one token step
with the ink intact produced a finding set *byte-identical* to the unarmed baseline (19 = 19, same
rules, elements and values), and moving it to a failing colour produced 8 new `text-contrast`
findings naming each button. Then Richard ruled **"delete them now"**, and the six colour-pinning
`*-control-borders` specs are **gone** — but not before the gate learned to force `hover`/`focus`/
`active`, because those specs asserted *"no state of it moves the edge below 3:1"* and a resting-only
gate could not have made that claim (§6.5).

⚠️ Peers work in this checkout: **P88 / GAM** (`viewer-react/src/nodes/controls/*`, `templates/*`)
and **P93** (`ComponentsPanelNew/*` — a live refactor with STAGED deletions in the shared index).
Commit through a temp index; `git commit -- <paths>` would sweep their work.

## The board, re-derived from the task files

| id | state |
|---|---|
| CHR-001, 002, 003, 005, 006, 012, 013 | ✅ closed on Richard's look |
| CHR-007 | ✅ built s4, invisible by design. Its snapshot went red on a P88 port mid-session; **they fixed it** |
| CHR-008 the panel is one tree | 🟡 R8, identity, scaffold, 1 widget **inert** (s8–s11). Left: undo re-seed defect, 37 widgets, AC3/AC4 wrong as written (§10.4) |
| CHR-009 the panel designed | ✅ **AC1 WORTHY (s29)**. Left: **AC5 only** — the gate now exists; it needs a run against HEAD over §3.6's node set, plus a `test:ci` |
| **CHR-004 the gates measure the scale** | 🟡 **gate BUILT + DRIVEN, six specs RETIRED (s30)**. AC1 ✅ AC2 ✅ AC3 ✅ AC5's CI half RULED. Left: **AC4/§3.3** (class-name assertions) and a HEAD run |
| CHR-010, 011 | ⬜ |

## What to do next, in order

1. **Run the gate against HEAD, on a dev build, over CHR-009 §3.6's node set.** That is CHR-009
   AC5's first half and it is now one command per surface:
   `NOODL_REMOTE_DEBUG_PORT=9333 node scripts/look-gate/run.js --surface=property-panel --theme=both --json=…`
   🔴 Everything measured so far is about **packaged 0.2.4**, which predates CHR-003, CHR-005 and
   CHR-009. Those findings are the gate working, not a defect list for HEAD.
2. **§3.3 — the class-name assertions**, the one piece of AC3/AC4 left. `groupHeading`, `portHint`,
   `bindingChipRows` and `nodeCommentRow` keep every behavioural assertion and lose the class-name
   ones; `PropertyPanelInput.module.scss`'s `:global(.sidebar-property-editor)` hook goes with them.
   Not done in s30 because it is a source change inside the property panel — which P93 is
   refactoring next door — and it could not be driven. Count the `expect(` lines before and after
   (they are recorded unchanged at 18 / 24 / 24 / 36 in CHR-004 §6.6).
3. A **`test:ci`** when no peer holds the box — the last one was s10 (at the floor, 2,984/8, seed
   53977). CHR-009 AC5 needs it.
4. Then **CHR-010** (the last icon font) and **CHR-011** (re-runs CHR-001's instruments UNCHANGED).

## Still Richard's

1. The Projects tab's two full-width cards (BST-003 / UNI-001).
2. Whether CHR-008's §3.1 widget conversions resume after CHR-009, or only where a region needs one.
3. **RULED in s30:** the look gate stays a **hand-run check** taken each session before work is shown
   to Richard, NOT wired into CI (its judgement half does run in CI via `test:main`); and the six
   colour-pinning specs were to be **deleted now**, which they were.
4. `···` menu DECLINED; CHR-007 AC4's `_portsHash` clause DECLINED; §3.4 closed by position (s20);
   the docked bound edge's `S…` left as-is (s28); the switch's colours and a 4px option in a 6px
   track ALLOWED (s24).

## Settled in s30 (and where the task file was wrong)

- 🔴 **CHR-004 §3.1 and §5 both say "run it in `test:main`". It cannot go there.** `test:main` is
  `jest` with `testEnvironment: 'node'` — no DOM at all, not jsdom — and there is no headless
  browser anywhere in the repo (no puppeteer, no playwright; `jsdom` is transitive and its
  `getComputedStyle` does not resolve custom properties, which is every colour here). The only
  renderer in CI is `test:ci` under `xvfb-run` (`pr.yml:132`). ⇒ the gate is a **drive** whose
  judgement half is unit-graded — and Richard has now ruled that it stays a hand-run check.
- 🔴 **AC3 is unmeasurable as written.** Its grep (`readFileSync.*\.s\?css`) returns **three** files
  and returned three before this session too: the retired specs read CSS through `support/themeTokens.ts`,
  not with a `readFileSync` on the same line, so "down from 28" was never what that grep counted. The
  population that answers the question — specs that resolve a token out of a stylesheet — went **18 → 12**.
- ✅ **The gate covers the STATES**, with Chromium's `CSS.forcePseudoState` (`--state=all`). Forcing
  zero nodes is a failure, not a pass. Positive control: a `:hover`-only failure is invisible at rest
  and caught under hover (19 → 27 findings, 8 naming each button).
- ✅ **One home for the contrast formula.** It had four (`themeTokens.ts`, `icon-contrast.js`,
  `deploy-from-disk.cjs`, `CanvasTheme.ts`) and this would have been a fifth.
  `scripts/look-gate/lib/color.js` is it; `themeTokens.ts` re-exports, public API unchanged, and the
  28 suites that depend on it are green (978 tests). `CanvasTheme.ts` is deliberately not rewired
  (product code, own headless fallbacks, own spec). `icon-contrast.js` / `deploy-from-disk.cjs`
  still carry copies — neither can be run without a live editor or a deploy, and rewiring an
  untestable script is how you ship a broken tool. Owed.
- ✅ **The ramps are read, never retyped.** `scale.js` reads `--font-size-*` from `fonts.css` and
  `--radius-*` from `spacing.css`, and throws if it finds none — a gate with an empty allowed set
  passes everything.

## Readings at the end of s30 (2026-09-17)

**Final: `npx jest tests-unit` = 465 suites / 7,483 tests, ALL PASSING, real exit 0.** (Was 471 /
7,630 before the six retirements: −6 suites, −147 tests.) `npm run typecheck:editor-tests` **clean**.
`tests-unit/chr-004` **39 / 39**, 10 mutants 10 red. `test:ci` **not run** (owed).
Packaged instance torn down; 9333 / 8674 free.

Mid-session `tests-unit` read 470 / 471: **`tests-unit/chr-007/widgetDispatch.test.ts`**, one added
port `keepsFocus: BooleanType` from P88's `238c455e9`. Not this session's, and **P88 fixed it** with
the spec's own `CHR007_WRITE_SNAPSHOT=1`. Their note, worth keeping: a new catalog port reddening
CHR-007 is **by design**, and the snapshot's history shows GAM-013 and GAM-011b regenerating it for
the same reason — **add the port, then run `test:main`, in that order.**

## Traps (s12–s30)

- 🔴 **Before retiring a test, read what it ASSERTS, not what it is filed under.** The six retired
  here looked like fill pins and four of them also graded every `:hover`/`:focus` state. The gate
  gained `--state=all` before they went, not after.
- 🔴 **An identical reading across arms is only believable next to an arm that differs** (s30: all
  four forced states returned the same 19 findings, which looked exactly like forcing that had not
  taken; a probe showed the fill moving `rgb(43,52,64)` → `rgb(51,62,77)` under forced hover, and a
  hover-only arm reddened 8 buttons).
- 🔴 **`git rm` stages into the SHARED index.** `git reset -q HEAD -- <paths>` puts it back (the
  files stay deleted on disk). Also: the shared index can be STALE against your own commit, so it
  reads as a staged revert of your work — reset your paths after committing through a temp index.
- 🔴 **A pipe eats the exit code.** `npx jest … | tail -8; echo "EXIT=$?"` logged `JEST_EXIT=0` over
  a run with a failing suite — `$?` was `tail`'s. Capture the status before piping, and gate on it.
- 🔴 **The first drive of a new instrument finds instrument faults, not product defects** (s30: four
  of them, all of which had passed 37 unit specs — a transparent border scored 1.000:1 against its
  own ground on seven buttons, `svg`/`circle`/`path` were graded for a font size they paint no text
  in, `className` on an SVG is an `SVGAnimatedString` so three findings were named
  `[object SVGAnimatedString]`, and a real 4.4968:1 printed as `4.50:1 — < 4.5:1`). Budget for it.
- ✅ **The packaged app is an instrument that needs no compile and cannot disturb a peer** —
  `env -u ELECTRON_RUN_AS_NODE -u NODE_OPTIONS NOODLPORT=8674 NOODL_REMOTE_DEBUG_PORT=9333
  /Applications/NodeGX.app/Contents/MacOS/NodeGX --user-data-dir=<scratch>/profile`, with
  `firstRunLegal.json` copied in. 🔴 **But it answers about the build IT carries, not your tree**
  (0.2.4, built Sep 12). Right subject for shipped chrome; wrong one for verifying a source change.
- 🔴 **`scrollWidth`, `clientWidth` and a `Range` cannot see an overflow under 1px** (s29).
  `canvas.measureText` with the element's computed font is the only honest "does this text fit".
- 🔴 **`drive-set.js`'s `MEASURE` grades only the labels VISIBLE in the viewport** (s29) — 12 of 71.
  Any claim about a whole surface needs the whole population, with its size printed beside it.
- 🔴 **The shared git index can hold two peers' staged work.** Commit through a temp index:
  `GIT_INDEX_FILE=<scratch>/idx git read-tree HEAD`, `git add <my paths>`, `write-tree`,
  `commit-tree -p HEAD`, `update-ref refs/heads/cline-dev`.
- 🔴 **Load decides your session length.** At load 25 a renderer rebuild took ~25 min; at load 3 the
  same CSS edit was live in ~60 s. Check `uptime` before planning a drive.
- 🔴 **Never edit a source file while a stack is compiling or live** (s28).
- 🔴 **A reload leaves the editor on the LAUNCHER** (s29): `__nodeGraphEditor` never appears until
  you click the project card again.
- 🔴 **Your `dev:debug` REAPS a peer's live stack** and your webpack holds :8080, which a peer's
  cannot share. Announce the launch AND the teardown; ask for the box back rather than reaping.
- 🔴 **Numbers passed while the picture was broken** (s12, s13, s15, s17, s19, s21, s25, s29 twice).
  Look at every PNG.
- 🔴 A spec reaching `common/Icon` needs FLD-017's `jest.mock` stub; `@noodl-models/projectmodel`
  throws at load in `tests-unit`. A CDP Cmd+A selects nothing on macOS (call `input.select()`).
  `npx jest tests-unit` is 449 suites of the 471 a plain `npx jest` runs.
- 🔴 A nested control reads as its own height: grade the outermost drawn field (s23). **A count is
  not a finding** (s24).
