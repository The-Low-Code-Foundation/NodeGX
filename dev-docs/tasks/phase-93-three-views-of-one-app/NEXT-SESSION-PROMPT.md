# Phase 93 — next session

**Written 2026-09-18, end of session 13.** s1–5 drove TVW-003; s6–11 built and closed TVW-001;
s12 built TVW-002; **s13 got Richard's four rulings, built them, and drove the lot.** TVW-002 is
now **6 of 7 ACs green**. It needs one gate and one look — neither is a build.

## The board, re-derived from the task files

| id | task | built | driven |
|---|---|---|---|
| TVW-001 | The panel tells the truth | ✅ six rows + AC7's fixes | **CLOSED — all 8 ACs** |
| TVW-002 | The preview says what it is not showing | ✅ 6 modules + the row + the outline + the detached window | **ALL 7 ACs green.** Richard ruled every finding; his look at the s13 shots is the last word |
| TVW-003 | One selection, three surfaces | ✅ slices 1–6 | **CLOSED — all 6 ACs** |
| TVW-004 | Layers (**unblocked**) | — | — |
| TVW-005 | Layers can move things (needs 004) | — | — |
| TVW-006 | The structure lane | — | — |
| TVW-007 | An instance says what it is (needs 003) | — | — |
| TVW-008 | The board (needs 002) | — | — |
| TVW-009 | The words (needs 001, 002, 004) | — | — |
| TVW-010 | The disorientation test (needs all) | — | — |

**ACs closed: 25** (TVW-003 six, TVW-001 eight, TVW-002 seven). **Three of ten tasks.**

## Start here — build TVW-004

**TVW-002 is done.** Richard ruled every finding s13 put to him and all seven ACs are green.
`test:ci` was re-run *after* the last change: **2985 specs, 8 failures, seed 24947, HEAD `3c498b0e`**
— the floor **by name** (3 SUB-011, 3 SUB-006, 2 NDA-017), none mine, a **seventh** agreeing seed.
⚠️ A **stale `test-results.json` was on disk** at the start of s13 and would have read as a pass;
delete it before every run and check the mtime on what comes back.

1. *(optional)* **Show Richard `verdicts/TVW-002/2026-09-18-s13/{light,dark}/` for AC6.** `open -a Preview <paths>`
   — markdown links open nothing in his VS Code. He has already ruled on all three of s13's
   findings and they are built; this is a courtesy look at the result, not a blocker.
2. Then **TVW-004 (Layers)**. It should **import `pageReach.ts`**, not write a second walk — and note
   that `firstRendered` now returns a **path to the node that paints**, which is exactly what Layers
   needs to point at something.

## What s13 settled

**Richard ruled four things** (R-K…R-N, all in the task file). The one to carry forward:

🔴 **R-N — his own earlier ruling had retired a spec line and nobody noticed.** §2 said "when they
agree: no strip", and the build was correct against it. But his placement ruling four hours earlier
had made the row a **separator**, and a separator that comes and goes is not one. So the row is now
drawn **always**; `agree` is a `quiet` *tone* with a short sentence, not an absence. **When a ruling
changes what a surface IS, re-read every spec line that assumed what it was.**

The quiet sentences, all pinned:

    Main Navbar is on Home. The preview is showing that screen.
    Home is the screen the preview is showing.              (the canvas IS the page)
    Algolia Search is logic — it draws nothing. It runs on this screen.

None claims the person can **see** it — a component can be on the page and scrolled past, inside a
closed accordion, or behind a popup.

## What the drive found, and what it nearly reported instead

🔴 **The count said 1 and nothing was on screen.** AC1's outline pointed at the node that *places*
the component. `getRef` is only the highlighter's existence filter; the element comes from
`getDOMElement()`, which an instance does not have. `selectedNodes.size` read a healthy **1** and
nothing was ever drawn. **A count is the mechanism; a rect is the consequence** — the arm asserts a
measured box now. ⚠️ My first *explanation* was also wrong ("getRef drops instances" — it does not).

🔴 **The outline dragged the box-model chip over the running app** — five lines of CSS facts over the
hero, because §2 had it travel down the **selection** channel and `updateHighlights` takes inspector
focus from the selection. Every number was clean; the **screenshot** showed it. **Sending a new
meaning down an existing channel inherits everything else that channel pulls.**

🔴 **The drive was not idempotent.** It *ends* by pressing its known-firing `Go to` door, so it left
the preview elsewhere; run again it read five different sentences about the wrong screen — all
correct answers, nothing broken. It resets and asserts the reset now, and two runs compare identical.

⚠️ **Two instrument faults that looked like defects:** the first AC1 drive read NOTHING because the
editor was in **Preview** mode (no outline is pushed there at all), and the chip arm first asked
whether the chip *element* existed — it always does, sized to nothing — so it fired on all seven rows.

## Driving TVW-002 again (reuse)

```bash
NOODLPORT=8680 NOODL_REMOTE_DEBUG_PORT=9444 NOODL_USER_DATA_DIR=<scratch>/profile \
  npm run dev:debug -- --quiet        # backgrounded; gate on the CDP port, ~40s
node scripts/devtools/drive-tvw002-strip.js --components "…" --shots <dir> --json <file>
```

- 🔴 **A fresh user-data-dir means the launcher has NO projects** and *Open project…* is a native
  dialog CDP cannot drive. Open it with the MCP server's own path:
  `EventDispatcher.emit('ViewerConnection.openProjectRequested', {directory, requestId, replyTo})`.
- 🔴 **Design mode, or there is no outline at all.** The segmented control is at **x≈1245,y=56**.
- 🔴 Corpus page names are `/Pages/Main/Home`, **not** `/Pages/Home` — probe the Router.
- 🔴 **Detach** = the layout dropdown at **x≈1178,y=56**, then scan `elementFromPoint` **down the
  column** for `Detached`. `MenuDialog` keeps a measuring ghost one row above the real rows, and a
  probe that collects rows by text and **dedupes** keeps the ghost.
- `ThemeManager` is `./src/editor/src/models/ThemeManager.ts`; read the applied theme in a
  **separate** eval.
- Fixture: a **copy** of `Noodl projects/Prefab marketplace`. This session's copy is at
  `NodeGX test projects/TVW-002 s13 Drive`.

## The box

One dev stack per checkout. `node scripts/devtools/stop-dev.js --list`, and **ask the peer**.
At handoff time **opennoodl-5f** (P95 Rocket School) has the box for a `build.mjs` +
`template:rocket` run and will ping when done; **opennoodl-14** (P92/CHR-011) is waiting on a clean
tree for a packaged build.

🔴 **The 09-16 dirty pile is still unowned and still uncommitted** — `templates/todo-list*`,
`library/prefabs/date-picker`, `packages/nodegx-backend/src`, `packages/noodl-mcp/tests/tpl008*`,
`packages/noodl-runtime` local-sql, plus staged deletions of two Inter fonts. **Three sessions have
now disowned it** (this one, opennoodl-14, opennoodl-5f), and 5f identified it as **P78/TPL-008's
todo-list work**. It blocks CHR-011. It needs Richard, not a fourth guess.

## Committing

🔴 The working tree carries other sessions' work. Commit by **explicit pathspec**; add untracked
files first; put `-F <file>` **before** the `--`.
