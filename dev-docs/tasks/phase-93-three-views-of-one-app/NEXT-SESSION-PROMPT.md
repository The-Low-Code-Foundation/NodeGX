# Phase 93 — next session

**Written 2026-09-18, end of session 15.** s1–5 drove TVW-003; s6–11 built and closed TVW-001;
s12–13 built and closed TVW-002; s14 built TVW-004. **s15 drove TVW-004's AC1 and AC2 against the
running preview, and the independent walk found three defects in the surface s14 had already driven
twice with nine green arms.**

## The board, re-derived from the task files

| id | task | built | driven |
|---|---|---|---|
| TVW-001 | The panel tells the truth | ✅ | **CLOSED — all 8 ACs** |
| TVW-002 | The preview says what it is not showing | ✅ | **CLOSED — all 7 ACs** |
| TVW-003 | One selection, three surfaces | ✅ | **CLOSED — all 6 ACs** |
| TVW-004 | Layers | ✅ | **AC1, 2, 3, 4, 7 green.** AC5 open (needs a cold start). **AC6 captured — Richard's verdict is the only thing left** |
| TVW-005 | Layers can move things (needs 004) | — | — |
| TVW-006 | The structure lane | — | — |
| TVW-007 | An instance says what it is (needs 003) | — | — |
| TVW-008 | The board (needs 002) | — | — |
| TVW-009 | The words (needs 001, 002, 004) | — | — |
| TVW-010 | The disorientation test (needs all) | — | — |

**ACs closed: 33** (29 + AC1, AC2 and — pending his look — AC6 is capture-complete; AC7 re-run).

## Start here

1. 🔴 **Put AC6 in front of Richard.** 20 shots in `verdicts/TVW-004/2026-09-18/` with a
   `manifest.json` naming what to look at. **The PNGs are gitignored by design** — he has to look
   at them on this machine, or they have to be sent to him. Two specific questions are in the
   manifest's `whatToLookAt` and in §9 of the task file; do not turn them into a summary.
2. **AC5** — the tab default and ⌘⇧L, **from a cold start on each of the four component kinds**.
   ⚠️ §8.2: this cannot ride the AC1 drive. `chosenTab` is remembered for the session, the panel
   does not remount between runs, and the attempt read `Components` at 300px and `Layers` at 240px
   from one unchanged build. A cold start means a fresh renderer per kind, or a way to clear
   `chosenTab` that is verified to work.
3. Then **TVW-005** (Layers can move things) — the first task that needs 004 and is not blocked.

## What s15 found, and what it cost to find

**The AC2 instrument is the point.** `scripts/devtools/drive-tvw004-ac2.js` walks the **viewer's**
DOM — every element, up React's fiber tree to `noodlNode`, path from the runtime's own scope links.
Different process, different tree, different data structure; the only thing shared with
`layersTree.ts` is the node id. s14's "independent walk" was a second walk over the same structure
in the same process, and it agreed with the build for two sessions.

🔴 **101 of 104 rendered nodes had no row that addressed them.** A Router mounts its page through a
node it mints at run time; a `For Each` mints one per item. `layersTree` was putting its own id
where the runtime had those guids, so `pathAddresses` matched nothing. Against the live preview:
`[router, navbar, header]` → **0** nodes selected, `[navbar, header]` → 1, `[header]` → 1 — three
known-firing arms beside the one absence. Under R-R that was **every row of every routed screen**.

🔴 **The fix duplicated React keys, and `.logs/dev.log` is where that showed up.** `key` and `path`
were one array. Two repeaters drawing one template then produced identical keys. They are two
arrays now: `path` is the runtime's identity, `key` is React's. **The unit fixture has one repeater
and could not have seen it.**

🔴 **A repeater whose template arrives on a wire was asserting its stale parameter.** 38 of 864
`For Each` nodes on this machine have the port wired; 34 still carry a `template`. It draws a note
now. ⚠️ **Refusing made the raw count worse** (30 → 36 unaddressed) and the arm had to learn to
attribute them, or it would have scored the honest build below the mis-naming one.

🔴 **The crumb lost the component name for want of 3px**, and only the screenshot could say so —
`scrollWidth` is meaningless on an inline element and `elementFromPoint` still returned the button.
A button is an atomic inline box, so Chromium drops the whole name rather than clipping it.
**Fourth time this phase a screenshot has failed a set of green arms.**

## The instrument faults, which cost more than the defects

Every one of these produced a confident wrong answer first. They are written up in §8.1.

- **Twenty screenshots of one width, named as two** — `useSidePanelLayout` reads its widths once at
  mount, so writing the setting changed the store and nothing on screen. Drag the divider (the one
  **taller than it is wide**), and put the **measured** width in the filename.
- **State 3 read a designed-in absence** — `previewMode` starts `true` and gates the whole outline
  channel (DES-001). "Outlined in the preview" is a claim about **design mode**.
- **The subject was a `Loader`** — a component that draws nothing until something is loading. An
  arm about an outline needs a subject the preview is drawing.
  ⚠️ An **instance** row is never on screen by the leaf test: a component instance draws no element
  of its own. Test whether its path is a **prefix** of a rendered path.
- **"On no screen" asked of the row list** picked `/App`, the project's own root.
- **`Page.reload` returns before the navigation starts**, so a poll for "the bundle is ready"
  passes on the page that is about to be destroyed. Stamp the document first. (The AC1 drive no
  longer reloads at all.)

## Gates at s15

`test:ci` **2985 specs, 8 failures, seed 90754 = the floor BY NAME** (3 SUB-006, 3 SUB-011,
2 NDA-017), none mine — a **ninth** agreeing seed, from a readout whose mtime was checked.
⚠️ The run was backgrounded through `tail`, which **ate the exit code**; the log said
`lerna ERR! exited 1` while the harness reported 0. Read the log, not the status.
`test:main` **497 suites / 7939** green. `tests-unit/tvw-004` **2 suites / 41 specs**, 4 new mutants
each `cmp`-proven applied and each red on its own spec. `tsc --noEmit` **0**.

## The box

s15 left it **free** (`Stopped 26 process(es). Nothing left running.`) and told **opennoodl-5f** so;
5f had held its P95 drives for about 40 minutes at s15's request and should be assumed to be using
the box now. **opennoodl-ec** was on P94/STY-001. Announce before launching `dev`.

## Committing

🔴 The working tree carries **three** other sessions' work — P78's TPL-009, P94's STY-001 and
P96's whole directory were all there throughout s15. Commit by explicit pathspec, add untracked
files first, and put `-F <file>` **before** the `--`. s15's commit is `105ba39bf`.

🔴 **Verdict PNGs are gitignored** (`.gitignore:265`). The tracked artefact is `manifest.json`.
`git check-ignore -v` every image before believing it is committed.

## Owed to Richard

**AC6's look, and nothing else.** Everything he ruled on in s14 (R-R…R-V) is built, driven and
still green.
