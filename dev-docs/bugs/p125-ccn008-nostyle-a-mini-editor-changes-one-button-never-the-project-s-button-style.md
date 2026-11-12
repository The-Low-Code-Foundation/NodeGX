---
id: P125-CCN008-NOSTYLE
title: a mini editor could change only the one button shown, never the project's Button style, so 'the button style' was rolled out by hand to three buttons and Studio's Styles tab never heard of it
status: fixed
severity: medium
area: mcp / mini editor (`spec.ts`, `http.ts` `writeSetting`)
found: P125 CCN-008 AC6, Richard's Muddy Paws run in Claude Desktop (Sonnet 5.5), 2026-10-25 08:12–08:21
evidence: nodegx.styles.json last written 2026-10-24 12:06; NavBar, Hero, ClosingCta nodes.json written 08:18:51–54 each with its own fill; P125 CCN-008 AC6, Richard's Muddy Paws run in Claude Desktop (Sonnet 5.5), 2026-10-25 08:12–08:21
kit: mcp
commit: 6ce8f171b
regression: packages/noodl-mcp/tests/ccn008MiniEditor.test.ts "P125-CCN008-NOSTYLE"
---

Richard: *"do you know if Claude correctly updated the button 'style' in the style editor in the NodeGX studio? Does
it know to change the global styles when the user replies to mini editor questions?"* It did not: each button got its
own fill, colour and radius, and the project's Button style (the no-name variant in `nodegx.styles.json`, which Studio's
Styles tab edits and every Button follows unless it sets the value itself) kept its old values.

**Fix:** a setting can be `scope: "style"`: the person's change is written to the style the node wears (its named one,
else its type's element style) and the node's own value for it is dropped (it would win). The decision says *"That is
the project's style now. These keep their own setting instead: …"* naming the buttons that set it themselves. When an
editor's settings are the node's own and the project has more of that type, the agent is told scope "style" exists.
