---
id: P135-DESKTOP-NOTOOLS
title: In Claude Desktop, "open my Puppy test 3 project" was answered "the NodeGX tools aren't connected here" while they were, because Claude did not search for them
status: open
severity: medium
area: noodl-mcp / Claude Desktop tool loading
found: P135 session 2, 2026-11-07, Richard's Desktop drive of cloudflare_sign_in (ODT-001 AC5)
evidence: Richard's pasted transcript, 2026-11-07 ~21:15 UTC; the server's own stderr on start: "loads tools itself: yes (124 more tools advertised from the first list)"
launch: beta
---

**Seen once (n = 1).** Claude Desktop, a NEW chat, NodeGX served from the checkout as a plain `mcpServers` entry named
`nodegx-dev` (`packages/noodl-mcp/bin/noodl-mcp.js --allow-writes`, Node 22, `NODEGX_SERVER_NAME=nodegx-dev`), the
`.mcpb` extension switched off. Richard's first message, "open my Puppy test 3 project", got:

> "I can't open it from this chat because the NodeGX tools aren't connected here … This one doesn't have it, and it
> isn't in the connector directory either."

No tool was called. His next message, "let's sign in to Cloudflare", made Claude run Desktop's tool search
(`{"query": "cloudflare sign in"}`), which loaded `nodegx-dev:cloudflare_sign_in` and seven others, and Claude then
said: "The NodeGX tools are available in this chat after all. My first tool search didn't bring them up."

**Why it matters.** It is the person's first sentence to NodeGX, and the answer is that NodeGX is not there. The
server's `instructions` say "WHEN THE PERSON ASKS FOR AN APP … call list_projects", but in a host that defers tools,
Claude has to search before it can see `list_projects`, and here it did not search, or searched with words that found
nothing (the transcript shows no first search; Claude's own later sentence says one did not find them).

**Not known yet:** whether the `.mcpb` (server name `nodegx`) does the same, whether the `-dev` name matters, and
which query (if any) was made. Re-run in a fresh chat with the extension on, the same sentence, and read Desktop's
tool-call rows. If it repeats: the deferred-loading set Desktop indexes first should include `list_projects` and
`open_project` under the words a person uses ("open", "my project", the project's name), or the server's
instructions should name the search ("search your tools for 'nodegx open project'").
