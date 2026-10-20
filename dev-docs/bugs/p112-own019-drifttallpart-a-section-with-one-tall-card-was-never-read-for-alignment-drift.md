---
id: P112-OWN019-DRIFTTALLPART
title: "render_report's alignment-drift skipped any section holding one part taller than 240 px — RL1's waitlist eyebrow sat 302 px left of its centred heading, beside a 290 px form card, and nothing was said"
status: fixed
commit: c52e01e4f
phase: P112
task: OWN-019
severity: medium
area: mcp / render_report look tells (`packages/nodegx-render-measure/src/index.js`, the LAPTOPGAPS layout block)
found: P112 OWN-019 s6, 2026-10-14 — Richard, reading RL1's laptop shot ("the 'waitlist' heading is too far left … out of sync with the vertical alignment of the 'Join the waitlist' block")
evidence: dev-docs/tasks/phase-112-your-own-nodegx/OWN-019-THE-VIBE-KIT.md §7 (s6)
regression: packages/nodegx-render-measure/tests/alignmentDriftOneTallPart.test.js "🔴 RL1's waitlist eyebrow, beside a 290 px form card, is named (HEAD) — the rule before skipped it"
kit: mcp
---

RL1's waitlist section (1280 px): the "WAITLIST" eyebrow is set left, the heading, its line and the form card are
centred. render_report named the same eyebrow in RL2b (302 px) but not in RL1. Measured in the browser: RL1 puts
eyebrow, heading, line and the 290 px form card in ONE group; RL2b puts the eyebrow, heading and line in a group of
their own and the form one level up. The drift rule (LAPTOPGAPS, s5) skipped any group with a part over 240 px tall —
a guard against comparing a page's whole sections with each other — so RL1's section was never read.

Fixed: a group is skipped only when two or more of its parts are tall (a page of sections has many; a section with one
card has one). The gallery corpus (15 apps, rendered from source) moved by exactly one finding — RL1's waitlist eyebrow,
302 px; the nine quizzes, s4's Launch control and the other Launch pages are unchanged. In the kit from tgz33.
