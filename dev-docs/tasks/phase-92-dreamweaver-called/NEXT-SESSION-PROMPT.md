# Phase 92 — next session

**Written 2026-09-17 at the end of s31.** Branch `cline-dev`, my commit `e685a9d72`.
`git log -- dev-docs/tasks/phase-92-dreamweaver-called` for the phase's history.
The platform half (`~/vscode_projects/nodegx-community`, deployed `f39d20f`) was not touched.

s31 in one paragraph: **the gate was pointed at HEAD for the first time, it found something real, and
Richard ruled on it.** Over CHR-009 §3.6's eight-node verdict set, both themes, on a dev build:
**3,384 graded readings, and the scale half is GREEN on every node** — 0 off-scale font sizes, 0
off-scale radii, 0 cut text. That is CHR-002 and CHR-003 holding, graded for the first time on more
than the Group. Of the 84 contrast findings, **82 were one decision counted 80 times**: the panel's
fields paint `border-default` (1.260:1 dark / 1.267:1 light against the panel ground) where NAT-001
ruled a control edge at 3:1, while `border-control` reads 3.719:1 / 4.512:1 on that *same* ground.
`nat-001/palette-contrast.spec.ts` is green and always was, because it grades the token and never
asks which one a field paints — §2's thesis with a live defect behind it. Priced with the gate's own
`--arm` before proposing anything; **Richard ruled "fix it", saw the armed picture and took it back:
*"no outlines like in the after pic, I don't like it."*** So the product is unchanged and the quiet
edge is now a recorded ruling the gate carries.

⚠️ Peers work in this checkout: **P88 / GAM** (`viewer-react`, `templates/*`, backend + mcp) and
**P93 / TVW** (`ComponentsPanelNew/*`, with STAGED deletions in the shared index —
`library/prefabs/date-picker/.../Inter-Medium.ttf` was still staged at my commit and survived it).
Commit through a temp index; `git commit -- <paths>` would sweep their work.

## The board, re-derived from the task files

| id | state |
|---|---|
| CHR-001, 002, 003, 005, 006, 012, 013 | ✅ closed on Richard's look |
| CHR-007 | ✅ built s4, invisible by design |
| CHR-008 the panel is one tree | 🟡 R8, identity, scaffold, 1 widget **inert**. Left: undo re-seed defect, 37 widgets, AC3/AC4 wrong as written (§10.4) |
| **CHR-009 the panel designed** | ✅ AC1 WORTHY (s29), **AC5 met except one thing**: a ruling on the `IconInput` placeholder (§24). `test:ci` taken at the floor |
| **CHR-004 the gates measure the scale** | 🟡 AC1 ✅ AC2 ✅ AC3 ✅ AC5's CI half RULED, **HEAD run ✅ (s31 §7)**. Left: **AC4/§3.3, which s31 re-priced — read §7.7 before touching it** |
| CHR-010, 011 | ⬜ |

## What to do next, in order

1. **Ask Richard about the one finding still standing.** `IconInput`'s `None` placeholder word reads
   **3.897:1 dark / 3.373:1 light** against 4.5:1. It is text, not an edge, and nobody has looked at
   it. Two honest options to put to him: darken that one word to the AA token, or rule it as
   placeholder text and add a second entry to `scripts/look-gate/rulings.js`. 🔴 Related trap: s21's
   *"greyed is a picture, not a DOM attribute"* — show him a PNG, not a ratio.
2. **§3.3 / AC4 — but NOT as written.** s31 measured it and **three of its premises are wrong**; the
   whole re-pricing is in CHR-004 §7.7. Summary:
   - The `:global(.sidebar-property-editor)` removal is **not free**. `showPopout` appends into the
     popup layer (`popuplayer.ts:918`), so five row types (`PopoutGroup`, `CodeEditorType`,
     `CurveType`, `ImageType`, `PickerTypeView`) render rows OUTSIDE that ancestor. Dropping the
     hook silently gives them a 118px label column, a 30px min-height and absolutely-positioned
     gutter dots. Doing it properly = a variant the panel's rows opt into, threaded through ~18 call
     sites (each row is its own `createRoot`, so one provider cannot wrap them). **Ask whether that
     is worth a session before starting it.**
   - The class-name half is mis-scoped: `byClass(node, '<product class>')` is **this runner's house
     style — ~40 spec files, ~180 call sites**, documented in `renderElements.ts`. §3.3 names four.
   - Two of §2's four claims are **stale**: `fb-018` no longer asserts `sidebar-panel-dark-input`
     anywhere in `tests-unit/`, and `leg-005`'s CSS read **must not be retired** — it asserts the
     placeholder is dimmed by a colour token with `opacity: 1`, and the rendered gate **cannot see a
     `::placeholder`** (it grades elements; a pseudo-element has none).
   - The one genuinely worth fixing, and small: `property-editor/portHint.test.ts:123,128` asserts
     `className === 'property-row'`, a **stale** literal (CHR-008 §3.2 moved it to
     `.property-panel-row`). It is only a sentinel — make it a neutral one.
3. Then **CHR-010** (the last icon font) and **CHR-011** (re-runs CHR-001's instruments UNCHANGED).

## How to take the gate reading each session (Richard's standing rule)

The look gate stays a **hand-run check taken before work is shown to him**, not wired into CI (its
judgement half does run in CI via `test:main`). One command per surface once a dev build is up:

```
NOODL_REMOTE_DEBUG_PORT=<port> node scripts/look-gate/run.js --surface=property-panel --theme=both
NOODL_REMOTE_DEBUG_PORT=<port> node scripts/look-gate/run.js --surface=launcher --theme=both --state=all
```

Over §3.6's whole node set, `verdicts/CHR-004/2026-09-17-head/drive-gate-set.js --expect=<scratch copy>`
selects each node and shells out to the gate per reading (so the instrument run is the graded one).

- **`--no-rulings` is the raw picture.** Any claim about a whole surface should be taken once without
  them, or the claim is about the exceptions as much as the surface.
- 🔴 **Gate on the exit status**: 0 green, 1 findings, **2 = could not measure at all**. Never on the
  last line of the log, and never through a pipe.
- 🔴 Everything before s31 was measured on **packaged 0.2.4**, which predates CHR-003, CHR-005 and
  CHR-009. Those findings are the gate working, not a defect list for HEAD.

## Still Richard's

1. The Projects tab's two full-width cards (BST-003 / UNI-001).
2. Whether CHR-008's §3.1 widget conversions resume, or only where a region needs one.
3. Whether §3.3's `:global` removal is worth the ~18-call-site refactor it actually costs (item 2).
4. The `IconInput` placeholder (item 1).
5. **RULED s30:** the gate is a hand-run check, not CI; the six colour-pinning specs deleted.
   **RULED s31:** the panel's quiet field edge STAYS — *"no outlines like in the after pic"*.
   🔴 **Do not re-propose `border-control` on panel fields.** If a field ever needs a stronger edge
   it is a question about THAT field, not a compliance fix for all 40.
6. `···` menu DECLINED; CHR-007 AC4's `_portsHash` clause DECLINED; §3.4 closed by position (s20);
   the docked bound edge's `S…` left as-is (s28); the switch's colours and a 4px option in a 6px
   track ALLOWED (s24).

## The ruled-exception facility, and the line it must not cross

`scripts/look-gate/rulings.js` — added in s31 because a hand-run check that reports 82 findings every
session is a check nobody reads, and the next session to read them would "fix" exactly what was
declined. **`NAT_001.controlEdge` is still 3.** Nothing in that file can change a threshold or except
a rule. If you add an entry, these are the properties 21 specs hold it to (7 mutants, 7 red):

1. An exception matches the **MEASUREMENT** — two colours, the gate's own hex — never an element, a
   class or a rule. There is deliberately no wildcard syntax. Move the token and it reds again.
2. It cannot leak across rules, onto a neighbouring colour, or onto the ruled ink over another ground.
3. A finding with **no** measured pair can never be excepted (or one ruling deletes a whole rule).
4. A ruled exception is **never** a reading that passed: `graded` still counts it, `ruled` counts it
   separately, and the verdict line says `N ruled exception(s)`.
5. A ruling that matched **nothing** is named (`unmatchedRulings`) — a stale ruling is a rule quietly
   switched off, and a clean run is exactly what that looks like.
6. It records who ruled it, when, and the artefact they were shown.

## Readings at the end of s31 (2026-09-17)

- `npx jest tests-unit/chr-004` **3 suites / 60 tests, exit 0** (was 2 / 39). **7 mutants, 7 red**,
  every file restored byte-identical (`cmp`).
- `npm run typecheck:editor-tests` **clean**.
- **Full `npx jest tests-unit` NOT run, deliberately** — P93 held the box with a live dev stack, and
  the only dependents of what I changed are `chr-004/*` (`themeTokens.ts` depends on `color.js`,
  which I did not touch; verified by grep). It is cheap insurance next session: 465 / 7,483 at s30.
- `test:ci` **TAKEN, at the floor**: 2,985 specs / 8 failures, seed 68399, HEAD `e50ea09b`, 78s,
  fresh JSON against a baseline mtime recorded before the run. ✅ **The same eight by name as the
  standing floor — 3 SUB-006, 3 SUB-011, 2 NDA-017 — and a THIRD seed agreeing** (P93 has the set at
  46376 and 38645). None is in this phase's surface; none touches `look-gate` or `chr-004`.
- Gate at HEAD, property panel, both themes: rulings active **0 findings / 7 ruled exceptions per
  theme, exit 0**; `--no-rulings` **14 findings, exit 1**.
- Box left **free**: dev stack torn down (25 procs), 8080 / 9333 clear, peer `noodl-mcp` pids checked
  alive after the sweep. P93 then took it.

## Traps (s12–s31)

- 🔴 **A count is not a finding.** 82 of s31's 84 were one token decision. Attribute by the colour
  pair and the element behind it before reporting a number to anyone.
- 🔴 **An index line is a POINTER, not the claim — open the file before declaring an artefact has
  moved.** s31 read `MEMORY.md`'s *"09-15 reads 8, all P88 BY NAME"* as a claim about the SPEC names,
  found SUB/NDA names instead and reported the floor's composition as drifted. "P88" was an
  ATTRIBUTION (all eight are caused by P88's GAM commits), and the pointer file tabulates these exact
  eight. A peer caught it. The baseline file even says *"Owners: re-judge staleness here, not in the
  index."* When your reading disagrees with a note, the note is a reading too — find the newest one.
- 🔴 **A leftover popout silently zeroes the whole gate.** A `.popup-layer-blocker` left over the
  panel made the next run refuse **1,018 of 1,018** elements and exit 2. Close what a drive opened.
  Escape and `.click()` do NOT dismiss it; a real `Input.dispatchMouseEvent` press does, and
  `dispatchClick(client, {x, y})` takes a POINT, not two numbers.
- 🔴 **`execFileSync` returns only STDOUT, and jest prints its summary to STDERR even on a PASS.** A
  mutant runner built on it reported a passing mutant as `Tests: (none printed)` — byte-identical to
  a suite that failed to run, the one outcome that must never be confused with another. `spawnSync`.
- 🔴 **A pipe eats the exit code** (third time in this phase). Redirect to a file, capture `$?`, grep.
- 🔴 **`cdp.js` defaults to 9222** — set `NOODL_REMOTE_DEBUG_PORT` on every call, one-off `node -e`
  probes included.
- 🔴 A `--json` path handed to a shelled-out `run.js` must be **ABSOLUTE** (it runs with `cwd: ROOT`).
- 🔴 The gate's `contrastRatio` takes **parsed** colours; handed a CSS string it throws inside
  `relativeLuminance`. `flattenGround([css])` first.
- ✅ **A surviving mutant can mean DELETE A LINE, not write a test** (twice in this phase now).
  `rulingFor`'s `!finding.ink || !finding.ground` guard was unreachable — the pair comparison already
  refuses. Pin the invariant where it CAN break instead.
- 🔴 **Before retiring a test, read what it ASSERTS, not what it is filed under** (s30's four hover
  graders; s31's `leg-005` placeholder rule, which the rendered gate cannot replace).
- 🔴 **An identical reading across arms is only believable next to an arm that differs** (s30's four
  forced states; s31's rulings-on/rulings-off pair).
- 🔴 **`git rm` stages into the SHARED index**; `git reset -q HEAD -- <paths>` puts it back. Reset
  your own paths after committing through a temp index, or the shared index reads as a staged revert.
- 🔴 **Load decides your session length.** ~25 min for a renderer rebuild at load 25; ~60 s for the
  same CSS edit at load 3. `uptime` before planning a drive.
- 🔴 **Never edit a source file while a stack is compiling or live.** `scripts/look-gate/*` is outside
  webpack, so it is safe; `packages/**` is not.
- 🔴 **A reload leaves the editor on the LAUNCHER** — `__nodeGraphEditor` appears only after the card
  is clicked again.
- 🔴 **Your `dev:debug` REAPS a peer's live stack** and holds :8080. Announce the launch AND the
  teardown, and ask for the box rather than reaping. Both peers answered in minutes in s31.
- 🔴 **`stop-dev` did NOT touch peers' `noodl-mcp` Electron pids** in s31 — but check before, not
  after: `stop-dev --list | grep -c noodl-mcp` read 0.
- 🔴 **Numbers passed while the picture was broken** (s12, s13, s15, s17, s19, s21, s25, s29 twice).
  Look at every PNG. s31's `field-edge-token.js` probe read `rgb(255,255,255)` for a "border" because
  it had picked a BORDERLESS field and `borderTopColor` fell back to `currentColor`.
- 🔴 `drive-set.js`'s `MEASURE` grades only the labels VISIBLE in the viewport (12 of 71 in s29), and
  the gate grades only what is REACHABLE at the current scroll. Any whole-surface claim needs the
  population printed beside it — which every gate result carries.
- 🔴 A spec reaching `common/Icon` needs FLD-017's `jest.mock` stub; `@noodl-models/projectmodel`
  throws at load in `tests-unit`. CDP Cmd+A selects nothing on macOS (call `input.select()`).
  `npx jest tests-unit` is 449 of the 471 suites a plain `npx jest` runs.
