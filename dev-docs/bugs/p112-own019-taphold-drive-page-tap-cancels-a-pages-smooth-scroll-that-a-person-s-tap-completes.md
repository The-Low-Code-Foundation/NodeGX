---
id: P112-OWN019-TAPHOLD
title: "drive_page's tap leaves a smooth-scrolling page 2–201 px down where a person's tap reaches the target — so an agent can be told a working 'scroll to the form' button is broken (or, at one width, that it works)"
status: open
phase: P112
task: OWN-019
severity: low
area: drive steps (`scripts/devtools/drive-steps.js` `press`, shipped in @nodegx/mcp's render harness)
found: P112 OWN-019 s4, 2026-10-14 (Launch round L1, Mistral Large 4, tgz28 — read while grading)
evidence: dev-docs/tasks/phase-112-your-own-nodegx/OWN-019-THE-VIBE-KIT.md §7 (s4)
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
