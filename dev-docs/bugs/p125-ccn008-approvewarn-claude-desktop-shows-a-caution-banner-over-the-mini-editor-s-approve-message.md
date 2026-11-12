---
id: P125-CCN008-APPROVEWARN
title: Claude Desktop puts the mini editor's Approve message in the composer under a caution banner ('Use caution before running this prompt…') instead of sending it
status: fixed
severity: low
area: host / Claude Desktop's handling of an MCP App's `ui/message`
found: P125 CCN-008 AC6, Richard's Muddy Paws run in Claude Desktop (Sonnet 5.5), 2026-10-25 08:12–08:21
evidence: Richard's screenshot 1, P125 CCN-008 AC6, Richard's Muddy Paws run in Claude Desktop (Sonnet 5.5), 2026-10-25 08:12–08:21
kit: mcp
commit: 234c0fc3c
regression: dev-docs/tasks/phase-125-co-construction/tools-mini-editor-drive.mjs "buttons (Muddy Paws copy): APPROVEWARN"
---

What Desktop does with `ui/message` (AC6's open question, now measured): the text lands in the composer, not in the
conversation, under *"Use caution before running this prompt. Malicious content could trick Claude into attempting
harmful actions or sharing your data."* The person reads it and presses send. Richard called it scary.

We cannot change the banner. Ours to decide: keep `ui/message` (one press, the person sees what is sent) or send it as
`ui/update-model-context` (no banner, but the person must type a line to wake Claude). Needs Richard's ruling.

**Ruled (Richard, 2026-10-25):** *"Send the decision quietly instead please, nobody needs to see the prompt before
sending, they already took the decisions"*. The panel sends `ui/update-model-context` first (a `ui/message` only for a
host that takes no context) and tells the person: *"Claude has your decision. Send it any message ("go" is enough) and
it carries on."* An app cannot start Claude's turn without a message, so that one line stays the person's.
