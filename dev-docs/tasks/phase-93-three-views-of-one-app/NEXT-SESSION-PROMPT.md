# Phase 93 — next session

**Written 2026-09-18, end of session 14.** s1–5 drove TVW-003; s6–11 built and closed TVW-001;
s12–13 built and closed TVW-002. **s14 built TVW-004 — the Layers tab exists, opens, draws the
screen, and was driven once.** It also corrected a defect in TVW-002's closed surface that only
showed up because Layers was being built next to it.

## The board, re-derived from the task files

| id | task | built | driven |
|---|---|---|---|
| TVW-001 | The panel tells the truth | ✅ six rows + AC7's fixes | **CLOSED — all 8 ACs** |
| TVW-002 | The preview says what it is not showing | ✅ + s14's repeater fix | **CLOSED — all 7 ACs** |
| TVW-003 | One selection, three surfaces | ✅ slices 1–6 | **CLOSED — all 6 ACs** |
| TVW-004 | Layers | ✅ the walk, the tabs, the rows, the crumb, the footer | **AC3, AC4, AC7 green.** AC1, 2, 5, 6 open — driven twice, 9/9 arms, and the shots found three things the arms did not |
| TVW-005 | Layers can move things (needs 004) | — | — |
| TVW-006 | The structure lane | — | — |
| TVW-007 | An instance says what it is (needs 003) | — | — |
| TVW-008 | The board (needs 002) | — | — |
| TVW-009 | The words (needs 001, 002, 004) | — | — |
| TVW-010 | The disorientation test (needs all) | — | — |

**ACs closed: 29.** Three of ten tasks; the fourth is the phase's centrepiece, is on screen, and
has had six rulings of its own (R-R…R-V plus §2's note retired).

## Start here — AC1, AC2 and AC6

The surface is built and driven; what is left is the **evidence** and Richard's verdict.

1. **AC1's five states**, in one run: canvas on Home; double-click `Hero`; click a row inside a
   band; navigate the preview to another page; a component that is on no screen. The drive script
   already resets itself, so it can be extended rather than restarted.
2. **AC2** — the row count against an **independent DOM walk of the preview**, on three projects
   (corpus, QA fixture, TPL-008), plus every row's glyph colour read off the rendered element and
   compared with the canvas's colour for that category.
3. **AC6** — screenshots of all five states, both themes, 300px and 240px, into
   `verdicts/TVW-004/<date>/`. **Richard rules WORTHY.** This is the phase's centrepiece surface.
4. **AC5's remainder** — the ⌘⇧L flip and the cold-start default on each of the four component
   kinds, driven rather than specced.

## What s14 settled, and what it cost to find

**Richard ruled three things** (R-R, R-S, R-T — all in the task file §6.6), each from a measurement
over all 117 projects on this machine rather than from the spec:

- **R-R — Layers starts at the top of the screen**, shell included, with `SHOWING HOME` where the
  page begins. 73 of the 78 routed projects have a root that draws more than the Router, so §2's
  *"the page in the preview"* would have hidden on-screen content in 94% of them.
- **R-S — the tab opens on the branch you are editing.** Fully expanded, one modest page is 330
  rows and the worst on this machine is 2,994. After: **23 rows on a median screen, 39 at p90.**
- **R-T — the indent is reduced and capped at 8 levels.** 🔴 §2's *"14px per level"* was never the
  artefact: the panel has shipped `--tree-indent: 12px` since PNL-006. Now 10px, capped at 80px, and
  a component boundary costs one level instead of two. **Rows past the right edge of a 240px panel:
  28% → 0.**

🔴 **The strip told 190 components they were on no page.** `pageReach` never followed a repeater's
template, and a `For Each` places its template through a **parameter**, not a child. 498 components
on this machine are placed only that way; for 190 of them in 56 projects the repeater's own
component is on a screen the app shows. Every list row and table row in this corpus. Fixed, because
a note that contradicts the tree under it is worse than no note — **not** because it was found.
The outline was deliberately *not* extended: a template has no instance node to point at.

🔴 **Seven green arms and the screenshot failed them.** The first drive read the row, the path, the
store's `layers` source, 16 tinted rows under `EDITING MAIN NAVBAR`, a level-9 row at the 90px cap —
and the shot showed the **Properties panel where Layers had been**. Selecting a node opens its
properties in the side panel, so the tree removed itself on the first click in it. `keepsSidePanel`
is the rule now. **A count is the mechanism; the screenshot is the consequence — third time this
phase.**

🔴 **Two mutants survived the first spec, and both were fixtures rather than code.** `roots[0]` is
not the drawn root in **572 of 5,039 components**; **20 of 66 dynamic repeaters carry a stale
`template`**. A fixture that happens to avoid a real population grades a coincidence.

## Instruments s14 leaves behind

- `scripts/devtools/tvw004-layers-census.ts` — the whole corpus through `layersTree`, offline, in
  seconds. ⚠️ Project files written before the `visualRoots` field existed have none; the census
  derives visual types from the corpus itself. Its first run read **57 screens as empty** for that
  reason alone.
- `scripts/devtools/drive-tvw004-layers.js` — the arms above, each refusing when its subject is not
  on screen (the indent arm says so rather than passing on a shallow screen).
- `tests-unit/tvw-004` — 2 suites, 29 specs, **13 mutants** on `layersTree` and 3 on `pageReach`,
  each proven applied by a byte compare and each red with a real count.

## Gates at s14 (all re-run after the last change)

`test:ci` **2985 specs, 8 failures, seed 86492, HEAD `1ecd432e` = the floor BY NAME** (3 SUB-006,
3 SUB-011, 2 NDA-017), none mine — an **eighth** agreeing seed, from a readout whose mtime was
checked. `test:main` **497 suites / 7,934** green. `jest tests-unit/tvw-004` **2 suites / 36**,
`tvw-002` **4 / 74**. `tsc --noEmit` **0**. **20 mutants across the two modules**, each proven
applied by byte compare and each red with a real count. **AC7 is green.**

## The box

One dev stack per checkout. `node scripts/devtools/stop-dev.js --list`, and **ask the peer**.
At handoff **opennoodl-5f** (P95 rocket-school drives) holds it; they confirmed in writing that
their drives use ephemeral ports, and their `dev` launch reaped s14's editor stack mid-drive
(exit 144) — **a `dev` launch sweeps the whole checkout, so announce before launching.**

🔴 **The 09-16 dirty pile is still unowned and still uncommitted.** Four sessions have now disowned
it. It needs Richard, not a fifth guess.

## Committing

🔴 The working tree carries other sessions' work — P94's `STY-001` files and P95's rocket drives
were there all session. Commit by **explicit pathspec**; add untracked files first; put `-F <file>`
**before** the `--`.

## Owed to Richard

**AC6's look**, once AC1's states are captured. Nothing else is outstanding: he ruled six times in
s14 (R-R…R-V and the note's removal), and every one is built and driven.
