---
id: P125-CCN008-MOCKUP
title: asked for options for the buttons in a NodeGX conversation, the model drew four HTML mock-ups in Claude Desktop's own visualizer and called no NodeGX tool
status: fixed
severity: high
area: mcp / the briefing (BOOTSTRAP_INSTRUCTIONS) and show_mini_editor's description
found: P125 CCN-008 AC6, Richard's first run in Claude Desktop, 2026-10-25 08:03
evidence: ~/Library/Logs/Claude/claude.ai-web.log 08:03:54 `visualize:read_me`, 08:04:09 `visualize:show_widget`; no `nodegx:` tool after 2026-10-24 12:12
kit: mcp
commit: a0362a33a
regression: packages/noodl-mcp/tests/instructions.test.ts
seen: Richard's next conversation (2026-10-25 08:12, 'Muddy Paws project button options') answered the same ask with show_mini_editor
---

Richard, in the Muddy Paws conversation (built 2026-10-24 on the old server), after reopening Claude Desktop on the
rebuilt one: *"Can you give me some options for the buttons? I don't like the look of them"*. The answer was four
inline widgets ("Current: solid pill", "A: soft rounded corners", "B: pill with arrow…", "C: soft blue tint") drawn by
Desktop's built-in visualizer: pictures of buttons, not the app's buttons; nothing picked there reaches the project.

Three things stacked:

1. **The conversation's tool index predates the tool.** Desktop indexes a server's tools once per conversation
   (CCN-001 s4), and this one began yesterday: `show_mini_editor` was not in it. A new conversation is needed.
2. **The restarted server was unbound** (it always starts with no project), and nothing re-opened Muddy Paws.
3. **Nothing the model reads before it chooses named the mini editor.** In Desktop the only NodeGX text it holds all
   conversation is the unbound briefing; the mini editor was in tool results and its own description only, and the
   model never searched NodeGX's tools — it reached for its own visualizer.

Fixed (3): the briefing says *when the person should choose how a part looks (options for the buttons, the hero, a 3D
model), show them the real part with show_mini_editor … never a mock-up drawn as HTML, a widget or an artifact*; the
tool's title and description say "options" and "not a mock-up". `tests/instructions.test.ts` asserts the sentence.
Fixed in code; not yet seen in Desktop: a NEW conversation asked the same thing should draw a mini editor (CCN-008 AC6).
