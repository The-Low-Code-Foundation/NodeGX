---
id: P125-CCN008-NOSHOWBACK
title: after Approve, the agent rolled the button out to three sections and described it in words; Richard had to ask again to see it
status: fixed
severity: medium
area: mcp / mini editor (the decision message, `records.ts` `decisionMessage`; the tool notes)
found: P125 CCN-008 AC6, Richard's Muddy Paws run in Claude Desktop (Sonnet 5.5), 2026-10-25 08:12–08:21
evidence: ~/Library/Logs/Claude/mcp-server-nodegx.log: Approve 07:18:27Z, six calls 07:18:40–07:18:59 (three writes, one render), no open_studio until his next message at 07:21:11; P125 CCN-008 AC6, Richard's Muddy Paws run in Claude Desktop (Sonnet 5.5), 2026-10-25 08:12–08:21
kit: mcp
commit: 6ce8f171b
regression: packages/noodl-mcp/tests/ccn008MiniEditor.test.ts "the decision is stored and worded as the person's message"
---

Richard: *"it didn't show me the editor to show me the approved changes live in the app, I had to ask in a further
prompt"*.

**Fix:** the message the panel sends as the person's ends *"Apply it where it belongs, then show me the result in the
app."* (*"Show me another option."* for Not that), and `show_mini_editor`'s and `get_mini_editor`'s notes say to show
the result (open_studio) in the same turn.

Also measured: Claude Desktop puts a mini editor's `ui/message` in the composer with a caution banner ("Use caution
before running this prompt…") and the person presses send. That is the host's, not ours; filed as
P125-CCN008-APPROVEWARN.
