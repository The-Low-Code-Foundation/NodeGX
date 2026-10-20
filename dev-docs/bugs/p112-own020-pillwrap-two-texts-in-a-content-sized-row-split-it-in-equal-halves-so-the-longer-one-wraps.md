---
id: P112-OWN020-PILLWRAP
title: "Two Texts in a content-sized row each take 100% width and shrink to equal halves, so the longer one wraps onto a second line and the pair sits unevenly in its pill; nothing warns the agent"
status: needs-ruling
phase: P112
task: OWN-020
severity: medium
area: runtime / Group (row, sizeMode contentSize) + Text default width; render_report / validate (no warning)
found: P112 OWN-020 s1, 2026-10-16 (Richard on CGQ1, GLM-5.3 in Cline: "the initial text '5 questions 10 s each' is poorly formatted, questions is on a second line and it doesn't look well spaced inside the containing group")
evidence: dev-docs/tasks/phase-112-your-own-nodegx/OWN-020-THREE-HARNESSES.md §12 (CGQ1); the app in the OWN-020 gallery (CGQ1, Pages/Start, Group `s_glas…`)
kit: core
---

What a person sees: on CGQ1's start screen, a glass pill under the Start button reads "5 / questions" on two lines
beside "10 s each" on one, with the two parts spread unevenly inside the pill. The words would fit on one line.

What the agent wrote (sensible): a row Group, `sizeMode: "contentSize"`, `columnGap: var(--space-8)`, padding 20 px, with
two Texts (`text-sm`) and no width set on either.

Measured in the running preview at 390 px (CDP, `getComputedStyle`): the row is 213 px wide, exactly what both texts
plus the gap and padding need (so content sizing worked for the row). But each Text is `flex: 100 1 auto` with the
Text's default width of 100%: both ask for the row's whole content width (~141 px), overflow it, and shrink equally to
**69.7 px each**. "5 questions" needs ~78 px, so it wraps; "10 s each" fits in its half and sits at its start.

Why it matters: an agent (or a person) reading "this row sizes to its content" expects the texts in it to hug their
words. Nothing in validate_project or render_report says otherwise; GLM-5.3 rendered and reported "fully verified".
Every pill, tag row, stat strip or button-with-label built this way breaks the same way.

Reproduce: a row Group with sizeMode contentSize holding two Texts of different lengths and no width; render at any
width. Or open CGQ1 from the OWN-020 gallery at phone size.

Fix options (Richard rules which):
1. Runtime: a Text whose parent is a content-sized row defaults to content width (as the row's own sizing already
   assumes). Changes how existing projects lay out, so it needs a migration check.
2. Validate/render_report: flag "a fill-width Text in a content-sized row" (static), and/or "a short text wrapped inside
   a row with room for it" (render measure), with the one-line fix (set the Texts to sizeMode contentSize).
3. Kit: the style guidance says texts in rows take `sizeMode: contentSize`. Cheapest, but only reaches agents that read
   it, and leaves the trap for people in the editor.
Related: P18-S110-NOWRAP (the export's content-size Text wraps), P112-OWN019-LETTEREDGE, P112-OWN019-LAPTOPGAPS.
