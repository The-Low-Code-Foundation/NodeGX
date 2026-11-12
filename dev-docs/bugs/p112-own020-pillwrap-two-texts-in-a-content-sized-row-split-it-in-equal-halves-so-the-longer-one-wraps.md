---
id: P112-OWN020-PILLWRAP
title: "Two Texts in a content-sized row each take 100% width and shrink to equal halves, so the longer one wraps onto a second line and the pair sits unevenly in its pill; nothing warns the agent"
status: fixed
commit: ef0e90f79
regression: packages/noodl-editor/tests-unit/p112-own020-filltraps/layoutFillTraps.test.ts "fires on CGQ1’s glass pill, from the pill"
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

**Ruled by Richard, 2026-10-26, for this row and P112-OWN020-FILLGROW together.** Asked: *"A box or text with no size
setting fills the space it's given: change the default, warn and teach, or guidance only?"* Answer: **warn and teach**
(options 2 and 3, no default change), "but make sure it works because adding texts with default sizing and seeing them
have weird layout used to drive me nuts". So the done-condition is a person's, not an agent's: the warning must reach a
person in Studio as well as `validate_project` / `render_report`, and it is graded on CGQ1's two screens (the pill and
the quiz header) with the one-line fix applied and re-rendered.

**Fixed as ruled (ef0e90f79; Studio 8bc0b53).** Warn and teach, no default change.
- **Two live rules** in `ALL_RULES` (`rules/layoutFillTraps.ts`), so the editor's Problems panel says them while a
  person edits, and an agent's write gets them: `content-row-splits-its-children` (PILLWRAP) and
  `row-of-words-fills-its-column` (FILLGROW).
- **Calibrated** over 196 local projects: 2 and 33 hits, 0 on the 17 templates. Rendered at 390 and 1280, every
  FILLGROW hit on a page shorter than the screen was a tall empty band (Members area "Ways in" 398 px for 26; the site
  builder's "New page" 774 px for 48; five quizzes by five models, 181–279 px of slack).
- **What a static rule cannot know:** whether the page is shorter than the screen. Neither `bodyScroll` nor `minHeight`
  separates the cases, so the message says "whenever the page is shorter than the screen".
- **Teaching:** the style guidance's `badge` and `shell` compositions say it.
- **Studio:** with the app on screen, it lists both warnings under it, each with a button that applies the named fix.
  This needs the in-page preview from this commit, which passes the report on (a vendored older preview shows nothing).
- **It works:** CGQ1 rendered before and after the named fixes. The pill's "5 questions" went from 2 lines to 1, and
  the quiz header from 251/296 px to 17 px. Studio's `check:layouttips` runs NodeGX's own validator on CGQ1's screens:
  both fire, Studio's buttons apply the fixes, and neither fires after.
- **Graded:** `tests-unit/p112-own020-filltraps` 11/11. The editor tests-unit and mcp suite reds are identical to the
  session base with this session's files swapped back.
