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
findings naming each button. AC3 and AC4 — retiring the pinned specs — are deliberately **not**
started: see §2.

⚠️ Peers work in this checkout: **P88 / GAM** (`viewer-react/src/nodes/controls/*`, `templates/*`)
and **P93** (`ComponentsPanelNew/*` — a live refactor with STAGED deletions in the shared index).
Commit through a temp index; `git commit -- <paths>` would sweep their work.

## The board, re-derived from the task files

| id | state |
|---|---|
| CHR-001, 002, 003, 005, 006, 012, 013 | ✅ closed on Richard's look |
| CHR-007 | ✅ built s4, invisible by design. 🔴 its snapshot is RED right now — not ours, see §4 |
| CHR-008 the panel is one tree | 🟡 R8, identity, scaffold, 1 widget **inert** (s8–s11). Left: undo re-seed defect, 37 widgets, AC3/AC4 wrong as written (§10.4) |
| CHR-009 the panel designed | ✅ **AC1 WORTHY (s29)**. Left: **AC5 only** — the gate now exists; it needs a run against HEAD over §3.6's node set, plus a `test:ci` |
| **CHR-004 the gates measure the scale** | 🟡 **gate BUILT + DRIVEN (s30)**. AC1 ✅ / AC2 ✅ (live arms, §6.3). Left: AC3, AC4, AC5 |
| CHR-010, 011 | ⬜ |

## What to do next, in order

1. **Run the gate against HEAD, on a dev build, over CHR-009 §3.6's node set.** That is CHR-009
   AC5's first half and it is now one command per surface:
   `NOODL_REMOTE_DEBUG_PORT=9333 node scripts/look-gate/run.js --surface=property-panel --theme=both --json=…`
   🔴 Everything measured so far is about **packaged 0.2.4**, which predates CHR-003, CHR-005 and
   CHR-009. Those findings are the gate working, not a defect list for HEAD.
2. **Then, and only then, AC3/AC4** — retire the eight `*-control-borders` specs and the four
   class-name ones. The order matters: a pinned test retired before its replacement has covered the
   same surface on HEAD trades a gate that works for one that has not been shown to. Count the
   `expect(` lines before and after, as AC4 asks.
3. A **`test:ci`** when no peer holds the box — the last one was s10 (at the floor, 2,984/8, seed
   53977). CHR-009 AC5 needs it.
4. Then **CHR-010** (the last icon font) and **CHR-011** (re-runs CHR-001's instruments UNCHANGED).

## Still Richard's

1. **Where the rendered gate runs, if anywhere, in CI.** It needs a running editor, and the only
   renderer CI has is `test:ci` (xvfb + Electron, already near its 900 s ceiling and timed out three
   times in August). Asked at the end of s30 — the answer decides AC5 and nothing else in the task
   waits on it.
2. The Projects tab's two full-width cards (BST-003 / UNI-001).
3. Whether CHR-008's §3.1 widget conversions resume after CHR-009, or only where a region needs one.
4. `···` menu DECLINED; CHR-007 AC4's `_portsHash` clause DECLINED; §3.4 closed by position (s20);
   the docked bound edge's `S…` left as-is (s28); the switch's colours and a 4px option in a 6px
   track ALLOWED (s24).

## Settled in s30 (and where the task file was wrong)

- 🔴 **CHR-004 §3.1 and §5 both say "run it in `test:main`". It cannot go there.** `test:main` is
  `jest` with `testEnvironment: 'node'` — no DOM at all, not jsdom — and there is no headless
  browser anywhere in the repo (no puppeteer, no playwright; `jsdom` is transitive and its
  `getComputedStyle` does not resolve custom properties, which is every colour here). The only
  renderer in CI is `test:ci` under `xvfb-run` (`pr.yml:132`). ⇒ the gate is a **drive** whose
  judgement half is unit-graded, which is why §2's order above puts a HEAD run before any retirement.
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

`npx jest tests-unit` (the 471-suite runner, plain Node): **470 passed / 471, 7,629 / 7,630 tests**.
The single red is **`tests-unit/chr-007/widgetDispatch.test.ts`** and it is **not this session's**:
the diff is one added port, `keepsFocus: BooleanType`, which arrived in `238c455e9`
*(feat(p88/gam-027): a Button can be told to leave the keyboard where it was)*. CHR-007's
characterisation snapshot has to be regenerated by whoever adds a port; regenerating another task's
snapshot from here would be a wholesale write over a shared artefact. **P88 has been told.**
`npm run typecheck:editor-tests` **clean**. `tests-unit/chr-004` **39 / 39**, 10 mutants 10 red.
`test:ci` **not run** (owed). Packaged instance torn down; 9333 / 8674 free.

## Traps (s12–s30)

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
