# Phase 93 — next session

**Written 2026-09-19, end of session 20.** s1–5 drove TVW-003; s6–11 closed TVW-001; s12–13 closed
TVW-002; s14–17 built and closed TVW-004 (bar Richard's AC6 look) and TVW-005; s18 built and drove
TVW-006 and censused TVW-007; s19 got two rulings, reshaped TVW-008 and built its slice 1. **s20
built TVW-007 slice 1 and put a question to Richard that R-Z could not answer.**

## The board, re-derived from the task files

| id | task | built | driven |
|---|---|---|---|
| TVW-001 | The panel tells the truth | ✅ | **CLOSED — all 8 ACs** |
| TVW-002 | The preview says what it is not showing | ✅ | **CLOSED — all 7 ACs** |
| TVW-003 | One selection, three surfaces | ✅ | **CLOSED — all 6 ACs** |
| TVW-004 | Layers | ✅ | AC1–5, AC7 green. **AC6's 20 shots SENT at s18 — Richard's verdict is all that is left** |
| TVW-005 | Layers can move things | ✅ | **CLOSED — all 6 ACs** |
| TVW-006 | The structure lane | ✅ | AC1–4, AC6 green. **AC5's 18 shots SENT at s18 — Richard's verdict is all that is left** |
| TVW-007 | An instance says what it is | ✅ slice 1 | **4 placement shots SENT at s20. AC2 built. The hover (AC2b) and the trail (AC3/4) not started** |
| TVW-008 | The board | ✅ slice 1 | Reshaped by R-7. AC8's `test:ci` half green. **Slice 2 is the surface and needs the box** |
| TVW-009 | The words (needs 001, 002, 004) | — | — |
| TVW-010 | The disorientation test (needs all) | — | — |

**ACs closed: 50.** s20 closed none outright — it built TVW-007's slice 1, and the thing that would
close AC1/AC5 is a verdict, not more code. ⚠️ **That is now two sessions in a row without a closed
AC. The next one should finish something.**

## 🔴 Start here

1. **THREE verdicts are with Richard and nobody else can do any of them**: TVW-004 AC6 (20 shots,
   s18), TVW-006 AC5 (18 shots, s18), and **TVW-007's four placement shots (s20)**. The first two
   close their tasks on the spot. **Do not re-send any of them.**
2. **If Richard has ruled on the placement**: the winner becomes a constant, `eyebrowPlacement.ts`
   is **deleted** along with the three losing branches in `instanceEyebrow.ts`, and AC1/AC5 can be
   driven. 🔴 Do not leave the switch standing — a switch that outlives its verdict is a second
   copy of a decision, and the second copy drifts.
3. **If he has not**: build what the placement does not block — **the hover (AC2b)** or **the trail
   (AC3/AC4)**. Both are independent of where the count sits. The trail is the bigger and is
   entirely untouched.
4. 🔴 **Check whose editor is on 9222 before any drive.** See the next section; this cost a peer
   three misread runs at s20.

## 🔴 What s20 cost a peer, and the check that prevents it

`npm run dev:debug` exited **144** — that is the **single-instance lock**, not a launch failure. It
means an Electron was already on 9222, and because mine had died, **that Electron was a peer's**.
`cdp.js` attaches to whatever holds the port and never asks whose it is, so the drive ran **green**
against `opennoodl-ec`'s window: it opened my project in it and reloaded it twice. They read three
of their own P94 runs as *stale bundle + panel moved* and chased them as product defects.

`drive-tvw007-eyebrow.js` now walks the Electron's **PPID chain** to the owning `claude` CLI and
refuses if it is not this session's. Two things that made the first version of that check useless,
both worth copying:

- 🔴 **It failed OPEN.** The CLI is **~11 hops** above the Electron and the loop was capped at 12
  iterations, so it stopped one short, returned "unattributable" and drove the peer anyway. It
  walks 40 now and **refuses on unattributable** — an owner you cannot name is not an absent one.
- 🔴 **`node -e "require('./drive-x.js')"` is not a syntax check — it RUNS the drive.** That is how
  a *fourth* unwanted run reached the peer's editor after I had apologised for the first three. Use
  `node --check`, and guard every drive with `if (require.main === module)`.

⚠️ **Never `dev:stop` a stack you have not attributed.** It would have killed theirs.

## 🔴 The TVW-007 question that is with Richard

R-Z settled the eyebrow's **text** (`· 3×`, path on hover). It did not settle its **row**, and two
numbers behind the ruling were wrong in a way that changes the cost, not the text:

- The name's real allowance is **93px (81 with an icon)**, not the 114px §6 assumed —
  `headerTextInset` is 37. The ruling survives this; the count still fits.
- 🔴 **There is no free row.** `titlebarHeight()` = label + sub-label + 22, and UIX-005 records that
  this formula fixes **every connection-anchor position**. A count on its own row moves the ports
  on every instance node in every project.

Measured over 128 projects first: **9,634 instance nodes**, **17.7% renamed** (they already pay for
a sub-label row), and of the unrenamed only **44.7%** have room for the count after the name's last
line. What the drive read back off the model, on 33 instance cards:

| placement | titlebar | what it costs |
|---|---|---|
| `hover-only` (today, and **what ships until he rules**) | 36–64px | nothing on the card |
| `own-row` | 48–76px | every port on all 33 cards moves |
| `reserve-width` | 36–78px | ports also move — its tallest card exceeds `own-row`'s |
| `inline-if-fits` | 36–64px | nothing moves; **the count is absent on 55%** |

Shots + numbers: `verdicts/TVW-007/2026-09-19/` (`manifest.json`, `readings.json`; the PNGs are
gitignored). Drive: `scripts/devtools/drive-tvw007-eyebrow.js`, 12/12 arms.

## 🔴 The defect the photograph caught and every arm missed

The first `reserve-width` shots showed **names clipped inside the titlebar**. The painter narrowed
the name's allowance; `titlebarLabelHeight()` did not — so the card was *measured* for a one-line
wrap and *painted* with a two-line one. **Every arm was green**, and the arm meant to catch it
reported *"card geometry unchanged"*, because it read a height that had never seen the narrowing.

Both now call the same `titleAllowanceFor` with the same `eyebrowReserveWidth()`, and the placement
is part of the label-height cache key. Re-driven, `reserve-width` read **36–78px** — the arm had
been describing the bug all along. ⚠️ **A number read from the model is not a reading of the
screen.** The picture is what verified this; the twelve arms did not.

## What s20 built (`068931145`)

`instanceEyebrow.ts` (pure: text, the 75% zoom gate, the four placements, the allowance),
`instanceCounts.ts` (TVW-001's `buildUsageIndex`, cached behind a dirty flag so a per-frame painter
can read it), `eyebrowPlacement.ts` (**the switch — delete it when he rules**), the painter, and
`titlebarHeight()`/`titlebarLabelHeight()`.

- 🔴 **The zoom gate must read `getPanAndScale().scale`, never `ctx.getTransform().a`** — the
  context is scaled by `ratio × scale`, so `.a` is 1.5 at 75% zoom on a 2× display and the gate
  would open at a different zoom on a retina screen than on an external monitor.
- ⚠️ **`reserve-width` reserves a fixed three-digit band, never the live count.** Reserving the real
  width would re-wrap a card — and move its ports — when a *tenth* instance was placed in another
  component, with nothing on screen saying why. The corpus has 198 components at 10–99 and **two
  over 100** (max 140, `Show Toast` in `Erleah-2`).
- **AC2 is stated as `usage.instances.length`, not "the row meta"**: `rowMetaFor` gives a routed
  page its *route* instead of a count. Measured: **0 instance nodes point at a routed page or the
  home component** across 128 projects, so the population where they could disagree is empty.

## Gates at s20

- ✅ **`test:ci` AT THE FLOOR BY NAME** — **3012 specs, 8 failures, seed 99487**: 3 SUB-006,
  3 SUB-011, 2 NDA-017, none of them mine. 🔴 The log ended `TESTCI_EXIT=1` **while the harness
  reported the background command as exit 0** — again. Gate on the number in the log.
- `tests-unit/tvw-007` — **18 specs green**, and **six mutants killed, none survived** (scale gate
  `>=`→`>`, the count floor, the inline overflow boundary, `own-row`'s height, `reserve-width`'s x,
  and the inline gap).
- `tests-unit/tvw-007` + `tvw-001` together — **81 specs, 8 suites green**.
- `tsc -p packages/noodl-editor --noEmit` **0**; `tsconfig.tests.json --noEmit` **0**.

## Committing

🔴 The working tree carries other sessions' work (P78 TPL-009, P94's Styles panel, P96, P98, docs),
and `nodegrapheditor.ts` / `SelectionActions.ts` were **a peer's open edits sitting right beside
mine in the same directory**. **Commit through a temporary index with a compare-and-swap** —
`BASE=$(git rev-parse HEAD)`, `GIT_INDEX_FILE`, `read-tree $BASE`, stage only your paths (untracked
first: a pathspec commit skips them), `write-tree`, `commit-tree -p $BASE`,
`update-ref HEAD $NEW $BASE`. Then refresh the real index immediately
(`git show --name-only --format="" -z HEAD | xargs -0 git reset -q --`) and confirm
`git diff --cached --stat` is empty.

⚠️ `scripts/devtools/` holds peers' untracked drive scripts. Never `git add` that directory; name
your file.
