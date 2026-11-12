---
id: P125-CCN008-WHITESWATCH
title: the mini editor offered three text colours that all paint white, and drew two of them as empty circles, so picking one changed nothing and nothing said why
status: fixed
severity: medium
area: mcp / mini editor (`src/miniEditor/spec.ts` `colourSwatches` / `controlFor`)
found: P125 CCN-008 AC6, Richard's Muddy Paws run in Claude Desktop (Sonnet 5.5), 2026-10-25 08:12–08:21
evidence: ~/vscode_projects/NodeGX test projects/Muddy Paws/.nodegx/mini-editors/me-mvnhqfuv-baa564.json controls[1].swatches: `background` css "var(--background)", `secondary-foreground` css "var(--secondary-foreground)"; P125 CCN-008 AC6, Richard's Muddy Paws run in Claude Desktop (Sonnet 5.5), 2026-10-25 08:12–08:21
kit: mcp
commit: 6ce8f171b
regression: packages/noodl-mcp/tests/ccn008MiniEditor.test.ts "P125-CCN008-WHITESWATCH"
---

Richard: *"Selecting the 'font colour' change does nothing in the preview"*.

`colourSwatches()` keeps one swatch per painted colour (the first token that paints it), and an agent's choice was
looked up in that list; a second token painting the same white was not in it and was painted with its own
`var(--background)`, which means nothing in the panel. The three text colours offered were primary-foreground,
secondary-foreground (a shipped default) and background: measured, all three resolve to #ffffff in Muddy Paws. All
white in the app, and two of them empty circles in the panel. So nothing changed when he picked one, and he could not
see why.

**Fix:** each choice is painted with what it resolves to, and the agent is warned when two choices paint the same
(`warnings` in the result: "Text colour: primary-foreground and secondary-foreground and background all paint
#ffffff …"). Beside it, a guard (not a measured bug): a `var(--…)` choice the project does not have at all is refused,
naming the tokens it does have.
