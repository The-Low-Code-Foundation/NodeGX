---
id: P112-OWN018-OPAQUEERRORS
title: "Mistral Vibe 2.26.1's default (code-mode) harness hands the model \"mcp_tool_error: The MCP tool returned an error\" instead of the server's error text, so every NodeGX diagnostic and suggested fix is lost — not ours; recorded so a Vibe round isn't read as a kit failure"
status: open
severity: high
area: external — Mistral Vibe 2.26.1 code-mode harness (`mistralai_vibe_local_harness`, `run_typescript` sandbox); our side only as a mitigation (docs for Vibe users, or a non-error channel for rejections)
found: P112 OWN-018 sitting 2, 2026-10-12
evidence: dev-docs/tasks/phase-112-your-own-nodegx/OWN-018-A-STRANGER-ON-MISTRAL.md §7
---

Vibe's default harness has the model write TypeScript that calls tools inside a sandbox. When an MCP tool answers
with `isError: true`, the model gets only `mcp_tool_error: The MCP tool returned an error`; a client-side schema
refusal arrives as `argumentsValidationErrors: [{}]`. NodeGX answers every refused write with the rule, the place
and a suggested fix, and that's how an agent corrects itself, so in this harness Mistral authored blind: 11 of 17
staged operations refused, no reason seen, ~60 minutes and ~$1.86 before the round was stopped.

Measured with a control, same prompt (`open_project` on `/no/such/folder`, quote the error):
- default harness: `mcp_tool_error: The MCP tool returned an error`
- `--legacy-harness`: the server's whole message (`not-found`, "Project directory does not exist … Call list_projects …")

Replaying sitting 2's 15 staged graphs against the same server showed what it would have read: precise diagnostics
for every refusal (inert widths, an invented `p-` route port, a `mounted` input that isn't declared, `dataAttributes`
as an array), plus one false refusal of ours (P112-OWN018-WIREDTARGET).

**Ours to do:** nothing in the server is wrong. Options: tell Vibe users to run `--legacy-harness` (in the README's
"any other MCP client" lines, or `create-nodegx`'s closing words), and report it to Mistral (mistralai/mistral-vibe).
