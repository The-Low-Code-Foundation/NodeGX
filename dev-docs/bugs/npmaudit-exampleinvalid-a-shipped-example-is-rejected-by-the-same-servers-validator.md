---
id: NPMAUDIT-EXAMPLEINVALID
title: A shipped example is rejected by the same servers validator
status: open
severity: medium
area: mcp / examples
found: NPMAUDIT stranger audit of the published packages, 2026-10-23
evidence: dev-docs/reviews/npm-stranger-audit-2026-10-23.md
---

`get_example("agent-store-shared-state")` from `@nodegx/mcp@0.2.5`, written back with `create_component`, is rejected: 'String Format has no output named "result" … available: formatted'. An example the server teaches cannot be built by it. Fix: run every example through the write validator in the examples test.
