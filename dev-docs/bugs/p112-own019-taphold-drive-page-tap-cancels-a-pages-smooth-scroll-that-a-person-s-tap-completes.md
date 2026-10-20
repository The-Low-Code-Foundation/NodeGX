---
id: P112-OWN019-TAPHOLD
title: "drive_page's tap leaves a smooth-scrolling page 2–201 px down where a person's tap reaches the target — so an agent can be told a working 'scroll to the form' button is broken (or, at one width, that it works)"
status: fixed
commit: d256c1ab1
phase: P112
task: OWN-019
severity: medium
area: drive steps (`scripts/devtools/drive-steps.js` `press`, shipped in @nodegx/mcp's render harness)
found: P112 OWN-019 s4, 2026-10-14 (Launch round L1, Mistral Large 4, tgz28 — read while grading)
evidence: dev-docs/tasks/phase-112-your-own-nodegx/OWN-019-THE-VIBE-KIT.md §7 (s4)
regression: packages/noodl-mcp/tests/own019TapScroll.test.ts "a tap answers once the glide it started has stopped, and a target off screen is still pressed"
kit: mcp
---

L1's hero button runs `scrollIntoView({ behavior: 'smooth' })` under `html { scroll-behavior: smooth }`. Measured on
its app, the page 3788 px tall at 390×844:
- a CDP mouse press held 120 ms, or a CDP touch tap (touch emulation on): the page glides to 3788 in ~1 s (polled
  every 250 ms: 1444 → 3226 → 3674 → 3787 → 3788) — what a person gets;
- `drive_page` `{ tap: "Join the waitlist" }`: 101 px at 390, 2 px at 768, 201 px at 1280, read 3 s later — and held
  100 ms inside drive-steps' press, still 108 px. So the instant press is not the whole cause; something else in the
  runner (its pre-press locate/stability loop, the page's focus state) stops the glide. Unexplained.
- Large 4's own proof of the line, at 1280, reached the form (scrollY 2920) — the same step, a different result.

The Launch grader had the same false red (its press and its own `scrollTop` writes, which the page's smooth
behaviour turned into glides); both fixed in `own-019/grade-launch.mjs` (held press, instant scrolls) and re-proven
(control 17/17, 12/12 mutants). The agent's tool is not fixed. **Next:** reproduce with drive-steps' locate loop
removed, and with focus emulation on, before changing the shared runner.

**s5 (2026-10-14), re-measured on a copy of L1's app — the reading above was wrong in its middle, and the defect was
two things.** drive-steps' tap does NOT stop the glide: tap, then any wait (a 2.5 s `wait_for`, a 3 s `watch`, an
expression awaiting 3 s), reads 3788 at 390, 3352 at 768, 3020 at 1280 — directly and through the packed tgz29
`drive_page`. s4's 101 px is exactly what a read taken *straight after* the tap returns (the glide ~1 s, the tap
answered after two frames). Found while re-measuring, and worse: the runner's own `scrollIntoView` (centring a
target before pressing it) glided too under `scroll-behavior: smooth`, so **every target off screen was refused**
("undefined is there but … off screen even after scrolling") — on HEAD, tapping "Monthly" after the hero button
failed at 390 and 1280 (severity raised to medium: an agent on a smooth-scrolling page could press nothing below the
fold).

**Fixed:** a tap answers once no scroll position (window or any scrolled element) has moved for two frame pairs, ≤2 s
(`scrolledMs` on the step when it moved, `stillScrolling` at the cap); locate centres with `behavior: 'instant'`; the
off-screen refusal names its target. On L1 after the fix: the read straight after the tap 3788/3352/3020, then
"Yearly" (off screen) pressed and "€60 a year" read, at all three widths. The regression fails on HEAD on all four
fields (glided, reached the form, verdict, the off-screen refusal). The drive_page description says it.
