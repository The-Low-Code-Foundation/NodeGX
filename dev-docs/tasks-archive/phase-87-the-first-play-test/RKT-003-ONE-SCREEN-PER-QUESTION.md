# RKT-003 — One screen per question

🔴 **Every answer sends the child scrolling down to read the verdict and back up for the next
question — and on a narrow screen, the race they are playing shrinks to a strip.** Finding 4.

## 1. The person sentence

**The question, the answer, what happened and the button to go on are all on screen together — on a
laptop, a tablet and a phone — and the rockets are big enough to cheer for.**

## 2. What was measured (2026-09-13)

| reading | where |
|---|---|
| `Race/Round` is one column: clock, question box, **the banner under the question box**, keyboard | `tpl007Components.ts` `RACE_ROUND` (~1221) |
| `Pages/Race` stacks the header (two rows once the EN/FR pills wrap), a "Rocket Race" heading, setup or play, then the result banner | `PAGE_RACE` (1628) |
| `Race/Play` puts the track above the round | `RACE_PLAY` (1319) |
| s1's `07-race-verdict.png` (≈1100px wide): track to y≈580, question card y≈620–840, **Next at y≈1010** — past the fold of a 768px laptop, far past a landscape tablet | the screenshot |
| the kit's Race Track draws a fixed **1000×420 viewBox at `width: 100%`**; strokes, rockets (≈40 units) and name labels all scale with it | `library/modules/game-kit/src/kit.js:442-443, 565` |
| at 390px wide that is ≈164px of track and ≈16px rockets, on a course whose S-curves were drawn for landscape | arithmetic from the viewBox |

## 3. Design (confirmed in the look RKT-002 rules)

- **The verdict replaces the answer area in place**, not beneath it. The question stays visible,
  compact; the child's answer and the right one side by side; Next where Check was. Focus moves to
  Next, so Enter, Enter plays on without a mouse.
- **A stage with a budget.** The header is one row (RKT-008 takes the language out); no separate
  heading during play; the track is capped at a share of the viewport height; the round sits below
  it. The race page fits `100dvh` at all five viewports. When the typing keyboard is shown on a
  short screen, it takes the track's space.
- **The track fits its box.** The kit chooses a course by aspect ratio (a landscape S-curve, and a
  portrait zig-zag or spiral under ~600px wide). **Rockets, labels and the planet are sized in screen
  pixels**, counter-scaled against the viewBox scale, with a floor, so a narrow track still shows a
  thumb-sized rocket. This is a kit change: new course presets or an `Aspect` input, documented
  ports, and the kit gate extended.
- The end of a race is a result *screen* in the same stage (RKT-002's reward moment).

## 4. Acceptance criteria

| AC | Clause |
|---|---|
| AC1 | **Reproduced first:** AC2's clause is RED on the s1 build at 1366×768, recorded here. |
| AC2 | Drive, five viewports × FR/EN, five rounds each (right, wrong, and a timeout in Défi). After every answer `window.scrollY === 0`; the bottoms of Next, the prompt and the verdict title are all `<= innerHeight`; `elementFromPoint` at Next's centre is Next (rendered is not reachable). |
| AC3 | At 390×844 the rocket sprite's rendered box is ≥ 28px on its long side and the track is ≥ 180px tall; at 1366×768 the track takes ≤ 40% of the viewport height. |
| AC4 | Kit gate (on the built file, in a bare vm — D41): the course chosen per aspect, the sprite scale compensation, and every existing port unchanged. |
| AC5 | Keyboard-only arm: type, Enter, Enter → the next question; five rounds, no pointer events. |
| AC6 | A screenshot of each viewport with the verdict open, looked at; Richard's verdict on a tablet. |

**Out:** the teach card's own layout (RKT-004 draws into this stage); the clock's legend (RKT-007).

## 5. Record

- **AC1 ✅ 2026-09-13 — RED on the s1 build at 1366×768, FR.** The drive is `scripts/devtools/drive-rkt003-stage.js`
  (a Défi race per language × viewport, rounds planned right / wrong / timeout / right / wrong, the page scrolled
  back to the top before every question, and the drive never scrolls unless it has to press something off screen).
  On s1's deploy, 5/5 rounds failed all four AC2 clauses, and DRIVE_EXIT=1:

  | round | outcome | prompt bottom | answer bottom *before* answering | verdict title / Next bottom | scrollY |
  |---|---|---|---|---|---|
  | typed "60 + 29 = ?" | Rapide et juste ! | 759 | 822 | 848 / 901 | 156 |
  | options "Lequel est le plus grand…" | Pas tout à fait. | 759 | 836 | 848 / 931 | 157 |
  | typed "? × 8 = 8", left to run out | Temps écoulé. | 759 | 822 | 1004 / 1087 | 0 (nothing was pressed) |

  🔴 **It is worse than finding 4 says.** The *answer box* already ends at y 822 on a 768px screen when the question
  arrives, so the child scrolls before answering, not only to read the verdict. `elementFromPoint` at Next's centre was
  never Next. AC3's laptop clause is RED too: the track is **390px tall** (≤ 307 allowed), with 53px rockets.
  Picture: [`rkt-shots/rkt003-before-fr-verdict-1366x768.png`](rkt-shots/rkt003-before-fr-verdict-1366x768.png).
- **Build 1 (2026-09-13): 49/50 rounds across the matrix, DRIVE_EXIT=1.** What changed, all through the generator (GEN_EXIT=0):
  - **The kit's Race Track fits its box** (`library/modules/game-kit/src/kit.js`). It picks a course by the box's width ÷ height
    (wide ≥ 1.9, compact ≥ 1.05, tall below), and sizes rockets, lanes, names and the planet so a rocket is at least
    `Rocket Size` (44) screen pixels long. An author's own Course, or an unmeasured box, draws the s1 course unchanged.
    Two new ports, `Course Shape` and `Rocket Size`; every existing port keeps its name, type and default.
  - **The track's height budget:** `Game/Race track`'s root is 30vh, capped at 56vw.
  - **The verdict takes the answer's place:** `Game/Question box` unmounts the typed row and the options while it is not
    enabled, and the banner card is tighter (glyph at 2xl, 16px padding).
  - **While racing,** the page heading is gone and `Game/Header` is compact, so it is one row: face, name, Home. Switch player
    and EN/FR stay on Home (RKT-008 replaces them with the player menu).
  - **Next takes the focus** when the verdict opens: a Function on the card's `didMount`, because a Button has no Focus input
    (**D59**, filed in P78's register).

  The drive, 5 viewports × FR/EN × a Défi race (right, wrong, timeout, right, wrong): 10/10 cells reached, 50 rounds graded,
  **49 passed every clause**. AC3 passed in all four of its cells: 230px track at 1366×768, and at 390×844 a 218px track with
  40px rockets. The track's box was 928×216 at 1280×720 and 736×307 at 768×1024.

  🔴 **The one failure:** EN 390×844, a timed-out options question with a two-line prompt ("In 778,201, which digit is in the
  hundred thousands place?"). The page scrolled itself 5px with nothing pressed, and Next still ended above the fold. The
  clause only printed `scrollY`, so the cause is not yet read. It now also reports Next's bottom, the page height and the focus.
- 🔴 **A random race never draws the worst case, so the drive now forces it.** The longest real prompt is CM2 `big-999999999`
  spelled out, 118 characters in FR and 129 in EN. Its correction carries the longest strategy, 131 characters. At the 4xl
  a sum wears, that prompt runs about six lines on a phone. The drive's new `foldWorst` clause swaps both strings in at a wrong or
  timed-out verdict (text-node values only, restored before the round goes on), and the prompt now steps down a size with its
  length: 4xl up to 24 characters, 3xl up to 60, then 2xl.
- **Builds 2–4 (2026-09-13), driven at 390×844, the tightest viewport:**
  - **Build 2** (prompt steps down with length): `foldWorst` failed on every wrong or timed-out round, with the prompt at
    7 lines in FR and 10 in EN. 🔴 **Part of that failure was the probe's.** The swap writes text into the page without the graph, so
    the prompt kept the 4xl its *short* original had chosen, a size the real graph never gives a 118-character prompt. The
    probe now copies `Game/Question box#qbLength`'s rule, and a template gate holds the two rules together.
  - **Build 3** (probe corrected; the skill's name hidden while the verdict is up; question card padding 32 → 24px): FR passed,
    `foldWorst` included. EN still failed. The 129-character spelled prompt ran 7 lines at 24px, and Next ended at **871 on an
    844px screen**, with the banner buttons already on one row.
  - 🔴 **Build 3's FR screenshot showed a break no clause measured:** "Lequel est le plus grand : 5 785 ou 8 / 266 ?", with a number
    split across two lines. `fmtNum` grouped French thousands with an ordinary space.
  - **Build 4** (a prompt over 60 characters steps down to xl; French thousands grouped with U+202F, the narrow no-break space,
    and the engine gate proves an answer copied with those spaces still grades): **10/10 rounds pass every clause, FR and
    EN, `foldWorst` included**, DRIVE_EXIT=0. The step-down: 4xl up to 24 characters, 3xl up to 60, then xl.
- **AC2 ✅ 2026-09-13 — build 4, the full matrix.** `drive-rkt003-stage.js`, 5 viewports × FR/EN × a Défi race: **10/10 cells,
  50/50 rounds pass every clause**, DRIVE_EXIT=0. The clauses are `ask`, `noScroll`, `fold` and `reach`, plus `foldWorst`, which ran
  on all 33 wrong or timed-out rounds with none skipped. Build 1's lone `noScroll` failure (EN 390×844, 5px) did not recur.
  | viewport | track box | rockets |
  |---|---|---|
  | 1366×768 | 928×230 | 39px |
  | 1280×720 | 928×216 | 38–39px |
  | 1024×768 touch | 928×230 | 39–40px |
  | 768×1024 touch | 736×307 | 42px |
  | 390×844 touch | 358×218, compact course | 40px |
- **AC3 ✅** — 1366×768: the track is 230px tall (≤ 307). 390×844: the rocket's long side is 40px (≥ 28) and the track 218px (≥ 180). Both
  pass in FR and EN.
- **AC4 ✅** — `tpl007GameKit.test.ts`, *"P87 RKT-003 — the track fits its box"*, on the built kit in a bare vm. It checks the course
  chosen per box shape, that an author's own Course and an unmeasured box both stay on the s1 course, that the phone rocket is
  drawn at Rocket Size and not the strip's 22px, and that a sabotage arm (Rocket Size 0) puts it back under 28px. The SSR
  render of a named shape draws its own viewBox, and all 16 existing ports keep their name, type and default.
- **Template gate** — `tpl007Template.test.ts`, *"RKT-003 — one screen per question, held in the graph"*. It pins the prompt's
  step-down, and the drive's copy of it; the answer surface mounted only while answering; and the track's 30vh / 56vw budget.
- **Gates 157/157** (kit, engine, template; GATES_EXIT=0), `typecheck:mcp` EXIT=0, GEN_EXIT=0.
- **AC6 (screenshots looked at)** — the `rkt-shots/rkt003-after-*` files show a wrong verdict at all five viewports (FR) and a timeout
  at 390×844 (EN). In every one, the track, the question, the verdict and both buttons are on one screen. 1280×720 has about
  40px to spare, and 768×1024 has a third of the screen free. **Richard, 2026-09-13**, asked how he wanted to play build 5 on a tablet: *"I already tried on a smaller screen and it looks fine"*. That was a smaller screen, not the tablet named in README §6's close condition, so the close still waits on that replay.
- **Not built from §3:** the child's own answer beside the right one (the correction still states only the right answer), and
  the typing keyboard taking the track's space on a short screen. Typing mode was not driven. Both are left for RKT-005, which
  rebuilds the answer surface. **Both built in RKT-005 (session 6), see its record:** the correction now opens with the child's own
  answer, and a typing race's course is compact. Typing mode's first drive found the keyboard ending 25–59px below the fold at
  1024×768, 1366×768 and 1280×720.
- **AC5, keyboard-only arm, 1366×768 and 1280×720 × FR/EN (build 4):**
  - **Run 1: 4/4 cells stalled after round 1, and the probe was at fault.** `focusNext` passed (Next *was* focused), then no
    question arrived. The drive's Enter had no `text: "\r"`. The answer box listens to keydown, so it still committed, but a
    focused native button activates only on a real Enter. The drive now sends one.
  - **Run 2: 20/20 rounds graded, and Enter on Next played on every time. 🔴 `focusIn` failed in 13/13 typed rounds after the
    first.** The next typed question arrives with the answer box unfocused, so a keyboard-only child must click it before
    typing. Round 1 passes because the field's Focus signal fires on the first prompt. After a verdict the typed row
    remounts, and that same signal, sent on the row's `didMount`, leaves nothing focused. The cause inside the runtime is
    not isolated. Build 5 focuses the rendered field from a Function on the next frame, the way Next is focused (D59).
  - **AC5 ✅ build 5, run 3: 4/4 cells, 20/20 rounds, every clause passes**, KEYS_EXIT=0, with no pointer event in any round.
    `focusIn` ran on 17 typed rounds, 13 of them after a verdict (the 13 that failed in run 2). `focusNext` ran on every
    verdict, and Enter on Next played on each time.
- **Build 5 regression check:** the mouse arm at 1366×768 and 390×844 × FR/EN is 4/4 cells, all clauses (DRIVE_EXIT=0). Gates 157/157
  (GATES_EXIT=0), `typecheck:mcp` EXIT=0. Build 5 is served at `http://127.0.0.1:8767/` for Richard.
