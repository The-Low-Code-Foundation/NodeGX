# Phase 92 — next session

**Written 2026-09-17 at the end of s23.** Branch `cline-dev`, commits `git log -- dev-docs/tasks/phase-92-dreamweaver-called`.
The platform half (`~/vscode_projects/nodegx-community`, deployed `f39d20f`) was not touched.

s23 in one paragraph: Richard **approved §16's greyed per-side hint** (re-shot on the obsidian palette) and `fg-disabled`
on every placeholder. Handoff item 4 (`scopeRows` `''`) was **not a defect** (§17). Then CHR-009's **§3.6 verdict set was
shot for the first time**: 8 fresh nodes, docked and wide, both themes, AC2's eval and a cut census (§18). It found
STYLE-004's `Style` block on Text/Button untouched by the whole task ⇒ **slice 10 built: `Preset` (Richard's label) and
`Size` as rows of the label column**, driven on real input. **Slice 10 awaits his look.**

⚠️ A **P88 peer** works in this checkout (`validation/*`, `noodl-mcp/*`, `templates/*`, `library/*`, `nodegx-backend/*`,
`noodl-runtime/*`, `tests-unit/gam-020/` are theirs). Never commit their files; commit by pathspec. Check `ps` for a peer's
`scripts/start.ts` before launching a stack.

## The board, re-derived from the task files

| id | state |
|---|---|
| CHR-001, 002, 003, 005, 006, 012, 013 | ✅ closed on Richard's look |
| CHR-007 | ✅ built s4, invisible by design |
| CHR-008 the panel is one tree | 🟡 R8, identity, scaffold, 1 widget **inert** (s8–s11). Left: undo re-seed defect, 37 widgets, AC3/AC4 wrong as written (§10.4) |
| **CHR-009 the panel designed** | 🟡 slices 1–9 + §16 approved; **slice 10 (`Preset`/`Size`) awaits his look**; AC1's set now exists (§18); AC2 fills/radii unmet (§18.6); AC5 needs CHR-004 + `test:ci` |
| CHR-004, 010, 011 | ⬜ |

## First: Richard's look at slice 10 (CHR-009 §18.3)

Same-crop pairs in `verdicts/CHR-009/2026-09-17/set/`: `after/props-text-docked-top-dark.png` → `preset/props-text-docked-top-dark.png`,
and `after/props-button-popout-docked-top-dark.png` → `preset/…` (light too; the open list is `preset/preset-open-dark.png`).
PNGs are gitignored: if the scratch-free checkout lacks them, re-run the drive (recipe below). Ask in plain words:
1. Do `Variant · Preset · Size · State` read as one column now?
2. `Preset` and `Size` have a **brighter edge** than `Variant`/`State` beside them. That brighter edge is the P75 border
   sweep's ≥3:1 pin (`border-control`); `Variant`/`State` use `border-default`. Which should all four use? (Moving these
   two to `border-default` means relaxing `style-section-control-borders`; moving the other two up changes s13's rows.)

## Then, in order (all measured in §18.2 — re-run the set before and after each)

1. **AC2's fills and radii over the set** (§18.6): print WHICH element paints each of the 4–6 fills and the `4px` radius
   (and Button's `2px`) before touching anything; several may be toggles/segments that the spec already allows.
2. **Function `Script Inputs/Outputs` heading buttons** (bright bordered `</>` `+`) vs **States** (borderless): one look.
3. **Selects don't stretch at wide** while number fields do (`Box Sizing` stays cut at 736).
4. **Button `Icon Source`**: a 24px empty square (gated off at defaults; look at it switched on too).
5. Still-small from s21: comment field 4px overshoot; a token in a pair field ellipsises; a binding chip on an align row.
   (Escape on the **Preset** list closes — driven s23. The s13 note was about the `Variant` picker; still not compared.)
6. The §14.3 opacity input reading `''` on an opaque colour: compare against an opaque hex before calling it a defect.

## Settled in s23 (and where the handoff was wrong)

- **§16 approved** as built, `fg-disabled` everywhere fine including its old blue-grey tint (§16.5).
- **Item 4 was not a defect** (§17): of 144 scoped ports, the two clearable kinds (number+unit, colour) store `undefined`
  on a clear; enums cannot be emptied. `!== undefined` is right there. Not changed.
- **Item 2 was wrong**: a fresh Text with every section open cuts **0** labels (46 drawn); `Text Horizontal Align` is not
  a label at defaults.
- **The handoff's small list was not the next best work**: the verdict set found a whole untouched region (the `Style`
  block) on the most common node. Shoot the set before ranking leftovers.
- The first set run read 12 controls at 24px: the insides of a number+unit field. The eval grades the outer field now.

## Traps (s12–s23)

- 🔴 **Numbers passed while the picture was broken** (s12, s13, s15, s17, s19, s21). Look at every PNG.
- 🔴 **Grading one node hid a region for 9 slices** (s23): run `set/drive-set.js` (8 node types) after any slice.
- 🔴 A nested control reads as its own height: grade the outermost drawn field (s23).
- 🔴 **The served bundle can carry a change while the renderer runs the old module**: check module source, then
  `cdp.js reload` (HMR also leaves old CSS; check `document.styleSheets` rule text).
- 🔴 A long compile drops the dev-server socket ("Disconnected!") — it is not dead; `ps` webpack CPU tells you.
- 🔴 A setup `setParameter` is invisible to an open panel; a group toggle clears the hash.
- 🔴 A select row (`EnumType`) has **no `data-identifier`**: find its input through the visible row's label.
- 🔴 `require('@noodl-models/projectmodel')` in `tests-unit` throws at load (`Tests: 0 total`).
- 🔴 A CDP Cmd+A selects nothing on macOS: call `input.select()` in the page.
- 🔴 `npx jest tests-unit` is only part of it; plain `npx jest` adds `tests-main`. Name the command.
- 🔴 A `verdicts/…/out/` directory is gitignored (`.gitignore:113`), as are `*.log` and PNGs: name result dirs `after/`.
- 🔴 A backtick in a comment inside a JS template literal ends the string: `node --check` every drive edit.
- Recipe: scratch copy of `templates/story-engine` in the session scratchpad, back up
  `~/Library/Application Support/NodeGX/recently_opened_project.json` (sha `a1ea46f2…`), insert one `Story engine`
  entry at `recentProjects[0]`, `NOODLPORT=8674 NOODL_REMOTE_DEBUG_PORT=9333 npm run dev:debug` in background (exit 144
  on `dev:stop` is the stop), wait for `:9333/json/version`, run drives with `--expect=<copy>`, `npm run dev:stop`,
  restore recents, compare `shasum`. The set drive adds its nodes (`chr009-set-*`) to `/App` of the COPY and reuses them.
- One heavy job at a time: stop the stack BEFORE jest.

## Still Richard's

1. Slice 10's look, and which edge tone the four head rows share (above).
2. R6 final ("ok so far"; ask again once the rows are done — the set's cut census is the number to show: Group 4/69
   labels, others 0).
3. The `···` menu is DECLINED. CHR-007 AC4 `_portsHash` clause declined. §3.4 closed by position (s20).
4. The Projects tab's two full-width cards (BST-003 / UNI-001).
5. Whether CHR-008's §3.1 conversions resume after CHR-009, or only where a CHR-009 region needs one.

## Readings at the end of s23 (2026-09-17, working tree on `f25a643b2` + this session)

`tsc --noEmit` (editor) **EXIT 0**. `npm run colors` **holding**; `npm run type` **2 fewer**, baseline lowered to **720**.
`tests-unit/border-sweep/style-section-control-borders.test.ts` 4 red on the change (intended shape) → updated **35/35**;
mutant (divider restored) → 2 red. `palette-contrast.spec.ts` green. Plain `npx jest` (editor, stack down) **477 suites /
7,736 tests: 1 suite / 5 tests red, all `tests-unit/gam-020/textCannotWrap.test.ts`** — the P88 peer's untracked spec,
written 11:19 beside their `validation/*` edit at 11:22, mid-run; it references nothing touched here. The other 476
suites passed. `test:ci` **not run**. Stack 2 `dev.log`: 0 `SassError|ERROR in`; 334 "synchronously unmount" during the
set drive's add-and-select, all before slice 10 compiled, 0 after (CHR-013 §5.2); 57 duplicate-key from `ProjectsPage`
at boot. Recents restored byte-identical (`a1ea46f2…`) after both stacks.
