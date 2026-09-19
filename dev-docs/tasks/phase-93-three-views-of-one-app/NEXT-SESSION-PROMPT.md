# Phase 93 — next session

**Written 2026-09-19, end of session 21.** s1–5 drove TVW-003; s6–11 closed TVW-001; s12–13 closed
TVW-002; s14–17 built and closed TVW-004 (bar Richard's AC6 look) and TVW-005; s18 built and drove
TVW-006 and censused TVW-007; s19 got two rulings and reshaped TVW-008; s20 built TVW-007's eyebrow
and photographed four placements for Richard. **s21 built TVW-007's trail and closed AC3 and AC4** —
the first closed ACs in three sessions.

## The board, re-derived from the task files

| id | task | built | driven |
|---|---|---|---|
| TVW-001 | The panel tells the truth | ✅ | **CLOSED — all 8 ACs** |
| TVW-002 | The preview says what it is not showing | ✅ | **CLOSED — all 7 ACs** |
| TVW-003 | One selection, three surfaces | ✅ | **CLOSED — all 6 ACs** |
| TVW-004 | Layers | ✅ | AC1–5, AC7 green. **AC6's 20 shots SENT s18 — Richard's verdict is all that is left** |
| TVW-005 | Layers can move things | ✅ | **CLOSED — all 6 ACs** |
| TVW-006 | The structure lane | ✅ | AC1–4, AC6 green. **AC5's 18 shots SENT s18 — Richard's verdict is all that is left** |
| TVW-007 | An instance says what it is | ✅ slices 1–2 | **AC2 ✅ AC3 ✅ AC4 ✅.** AC1/AC5 need a drive; AC2b (hover) and `Edit ›` not started; the 4 placement shots are WITH RICHARD |
| TVW-008 | The board | ✅ slice 1 | Reshaped by R-7. AC8's `test:ci` half green. **Slice 2 is the surface and needs the box** |
| TVW-009 | The words (needs 001, 002, 004) | — | — |
| TVW-010 | The disorientation test (needs all) | — | — |

**ACs closed: 52** (+2 at s21).

## 🔴 Start here

1. **THREE verdicts are with Richard and nobody else can do any of them**: TVW-004 AC6 (20 shots,
   s18), TVW-006 AC5 (18 shots, s18), TVW-007's four placement shots (s20). The first two close
   their tasks on the spot. **Do not re-send any of them.** No ruling file had landed at s21.
2. **If Richard has ruled on the placement**: the winner becomes a constant, `eyebrowPlacement.ts`
   is **deleted** with the three losing branches in `instanceEyebrow.ts`, and AC1/AC5 can be driven.
   🔴 Do not leave the switch standing — a switch that outlives its verdict is a second copy of a
   decision, and the second copy drifts.
3. **If he has not**: the honest next build is **AC2b, the hover**, which R-Z made load-bearing (with
   no name on the card it is the only place the component's identity lives). ⚠️ It has to be built
   **together with `Edit ›`**: §2 puts both on the same gesture at the same corner, which is also the
   existing 20×20px connection-drag zone, and the canvas has **no click dispatch for sub-regions**
   today — so whoever builds one builds that too.
4. 🔴 **Check whose editor is on 9222 before any drive** — see below. This cost a peer three misread
   runs at s20 and it has not stopped being true.

## 🔴 What s21 owes the next drive

AC3/AC4 closed on specs, and specs cannot see one thing: **whether the crumb appears at all.** The
ordering is right by inspection — `activeComponent = component` → `push(component, via)` →
`bindModel` → `updateTitle`, so `updateTitle` reads the fresh entry against the fresh component —
but that is an argument, not a photograph.

**The drive to write** (it is small, and it closes AC1's trail half):
1. Open a project, open `Home` from the Components panel → the trail reads the folder path.
2. Double-click an instance node → the trail reads `[◆ Parent] › Child`, and the first crumb is a
   `<button data-test="trail-instance-crumb-…">` carrying `data-test="trail-instance-diamond"`.
3. Press that crumb → back on the parent.
4. Open the same child from the Components panel → the folder path again. **This is the arm that
   matters**: it is the one that fails if `via` is being recorded for every route.
5. ⌘[ / ⌘] → each trail is the one that was on screen at that step.

🔴 **Read the crumb off the DOM, not off the model** — `elementFromPoint` on it, because the bar has
a `Spacer` and a lane filter to its right and a crumb can be scrolled out of the `Trail` container
([[a-rendered-surface-can-be-behind-a-blocker]]).

## 🔴 The drive hazard, unchanged from s20

`npm run dev:debug` exiting **144** is the **single-instance lock**, not a launch failure — an
Electron is already on 9222 and it may be a **peer's**. `cdp.js` attaches to whoever holds the port
and never asks whose it is. `drive-tvw007-eyebrow.js` walks the Electron's **PPID chain** (40 hops)
to the owning `claude` CLI and **refuses on unattributable** — copy that guard, and note the two
things that made its first version useless:

- 🔴 **It failed OPEN** — the CLI is ~11 hops up and the loop was capped at 12. An owner you cannot
  name is not an absent one.
- 🔴 **`node -e "require('./drive-x.js')"` is not a syntax check — it RUNS the drive.** Use
  `node --check`, and guard every drive with `if (require.main === module)`.

⚠️ **Never `dev:stop` a stack you have not attributed.** At s21 there were **six** live Claude
sessions on this box, four holding `dev` stacks — that is why s21 did not drive.

## What s21 built (`931f817a0f`)

The trail's containment form. `instanceTrail.ts` (pure: `instanceParentCrumb`, `leafName`,
`buildComponentTrail`), `NavigationHistory` entries as `{name, via}` + `currentEntry()`,
`switchToComponent`'s `viaInstance` arg, and the instance crumb in `NodeGraphComponentTrail.tsx`.

- 🔴 **AC3's last clause changed by building it.** §4 asked `discardInvalidEntries` to **drop**
  entries whose `via` is deleted; it now **clears the `via` and keeps the entry**. `Hero` still
  exists and is still reachable — dropping it makes ⌘[ skip a valid destination because something
  *else* was deleted. What is broken is the route, not the entry. The spec arms **both halves**,
  because asserting only the `via` would pass just as happily on an entry thrown away. The
  §4-as-written behaviour is mutant M5 and it is killed.
- 🔴 **Thirty lines moved out of `updateTitle` so they could be graded at all.** It is a choice
  between two plausible trails for the same component, and in there it needed Electron and a live
  `ProjectModel` to run — so in practice it would have been graded by looking at it. The
  folder-path cases are now a **regression floor**.
- ⚠️ **Only the instance crumb is a real `<button>`.** Every clickable crumb in that bar should be
  one, but that is a change to the look of a surface P92/P94/P78 are all editing this week and it
  needs a photograph first. The new crumb has nothing to regress — and it is what makes the two
  crumb kinds differ in the **rendered DOM** rather than only in a class name.
- **`viaInstance` is passed by the two doors that open a real instance only.** The double-click's
  component-port branch does not: that node *names* a component in a parameter, it does not contain
  one, and the diamond is a containment claim that relationship never makes.
- `getTopComponent` deleted — no callers anywhere in the repo.

## Gates at s21

- `tests-unit/tvw-007` — **53 specs, 4 suites green**, and **TWELVE mutants killed, none survived**:
  the stale-entry guard, the self-parent guard, `leafName`, the dead-route clear, dropping-instead-
  of-clearing, the crumb's button, the diamond's condition, `push` ignoring its `via`, the descent
  gate, replace-vs-prepend, `isFolderComponent`, and which segment is current.
- ✅ **`test:main` — 517 suites, 8,258 specs, ALL GREEN, exit 0.** The whole plain-Node runner, not
  just this task's directory, and it ran safely beside four live `dev` stacks.
- `typecheck:editor` **0**; `typecheck:editor-tests` **0**.
- ⚠️ `tsconfig.tests-main.json` reports 3 errors in `erg-005/componentContract.pending.ts` and
  `rel-004/webpackHeapCeiling.test.ts` — **committed files this session never touched**, and that
  config is not wired to any `typecheck:*` script. Pre-existing, not TVW-007's.
- 🔴 **`test:ci` NOT RUN** — six live sessions, four `dev` stacks. AC6 still needs it. No jasmine
  spec names `NavigationHistory` or the trail (checked), and `typecheck:editor-tests` covers the
  bundle's compile, but **that is not the same as running it**.

## Committing

🔴 The working tree carries other sessions' work (P78 TPL-009, P94's Styles panel, P96, P98, docs).
**Commit through a temporary index with a compare-and-swap** — `BASE=$(git rev-parse HEAD)`,
`GIT_INDEX_FILE`, `read-tree $BASE`, stage only your paths (untracked first: a pathspec commit skips
them), `write-tree`, `commit-tree -p $BASE`, `update-ref HEAD $NEW $BASE`. Then refresh the real
index immediately (`git show --name-only --format="" -z HEAD | xargs -0 git reset -q --`) and
confirm `git diff --cached --stat` is empty. This worked cleanly at s21.

⚠️ `scripts/devtools/` holds peers' untracked drive scripts. Never `git add` that directory; name
your file.
