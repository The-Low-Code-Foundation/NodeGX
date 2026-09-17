# Phase 93 — next session

**Written 2026-09-17 at scoping. Nothing built.**

## The board, re-derived from the task files

| id | task | state |
|---|---|---|
| TVW-001 | The panel tells the truth | 📋 |
| TVW-002 | The preview says what it is not showing | 📋 (needs 001) |
| TVW-003 | One selection, three surfaces | 📋 |
| TVW-004 | Layers | 📋 (needs 001, 003) |
| TVW-005 | Layers can move things | 📋 (needs 004) |
| TVW-006 | The structure lane | 📋 |
| TVW-007 | An instance says what it is | 📋 (needs 003) |
| TVW-008 | The board | 📋 (needs 002) |
| TVW-009 | The words | 📋 (needs 001, 002, 004) |
| TVW-010 | The disorientation test | 📋 (needs all) |

## First job

**TVW-001.** It has no dependency, it is the cheapest, and every later surface is built on rows that
already tell the truth. Read the proposal's §2 and §4.3 and the task's §2 table; re-read every
`file:line` at HEAD before writing on it. Measure the four numbers in README §3 on the artefact
first and commit the count script beside the baseline screenshots in `verdicts/TVW-001/<date>/`.

In parallel, a second lane can take **TVW-006** (paint only, no dependency) or **TVW-003** (a plain
module with a spec) without colliding — they touch `canvas/` and a new store respectively; TVW-001
touches `ComponentsPanelNew/` and `VisualCanvas.tsx`'s caption. Announce before editing editor
`src/`; it full-reloads a peer's editor.

## Read first

1. `future-projects/THREE-VIEWS-OF-ONE-APP.md` — the spec. §2 is the measured diagnosis, §4 the design,
   §7 the rulings (R-J is ruled; the rest inherited).
2. The mock, `future-projects/mocks/three-views-mock.html` — scenario 2 is the phase's reason.
3. This README's §2 (settled) and §6 (rules).
4. `phase-56-component-bench/README.md` — BEN R1–R5 and the landmines; this phase changes the bench's
   scope control and adds a target, nothing else.

## The rule that will be tempting to break

**The app preview never moves because the canvas did.** When a task finds it would be easier to
navigate the preview for the person, it has found the disorientation this phase exists to end.
