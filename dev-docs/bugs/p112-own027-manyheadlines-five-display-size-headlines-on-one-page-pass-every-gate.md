---
id: P112-OWN027-MANYHEADLINES
title: Five display-size headlines on one page pass every gate, though the vocabulary says exactly one
status: fixed
severity: low
area: mcp / validate + render_report
found: P112 OWN-027 arm T r1+r2, 2026-10-28
evidence: dev-docs/tasks/phase-112-your-own-nodegx/own-027/runs/T/r2/ledger.json (calls *.look = displayHeadline ×5), runs/T/r2/shots/pages-home-desktop.png
kit: mcp
phase: P112 OWN-028
commit: a475b0683
regression: packages/nodegx-render-measure/tests/own028Gates.test.js "fires when five sections open at 72px, quoting them"
---

What a person sees: every section opens with a 72 px headline ("Step 1: Fill out our fun application",
"Meet Our Happy Pack", two stacked in the closing band), so nothing reads as *the* headline. Gemma 4 E2B chose the
`displayHeadline` look 2 times in r1 and 5 times in r2. Neither the validator nor render_report said anything,
though render_report already counts font sizes per page (`text.fontSizes`, "72px": n).

The rule is prose only: the `displayHeadline` composition's description says *"Exactly ONE per page."*

Proposed fix (small): a render_report warning when more than one text on a page renders at the page's
display size (`--display-lg`/`--display-md`, or the page's largest size used more than once above 48 px).
The OWN-027 harness now applies it as a script rule (R19, tuning 2), which shows the gate is cheap.

Fixed (OWN-028 AC4): render_report `competing-headlines` on desktop when more than one text renders at ≥ 56 px, quoting them. own-027-T-r2: fires, 5 headlines at 94 px; own-027-C: 1, silent.
