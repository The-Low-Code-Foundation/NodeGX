---
id: P123-STU071-OBJECTOBJECT
title: A NodeGX tool's refusal reached the person in Studio as "[object Object]"
status: fixed
commit: nodegx-studio d0d16b2
severity: medium
area: nodegx-studio `lib/publish.mjs` `callMcpTool` (Publish to a server, the cloud functions deploy)
found: board lane 2, the 0.2.6 pin bump (opennoodl-d7), 2026-10-24
evidence: nodegx-studio `npm run check:server` at the bump: the row that runs the pinned @nodegx/mcp's real deploy_to_vm read "[object Object]"
---

NodeGX's tools refuse as `{ error: { code, message, details } }`. Studio's `callMcpTool` built its Error from
`body.error` (the object), so a Publish to a server that could not reach the box said "[object Object]" where the
tool had said "Could not reach root@… over ssh". Every tool Studio calls through it was affected; the pins before
0.2.6 had no deploy_to_vm, so the gate never ran a real refusal until the bump.

Fixed: the Error carries `error.message` (and `code`, `details`). `check:server` runs the real tool against
TEST-NET-3 (203.0.113.7) and reads the sentence.
