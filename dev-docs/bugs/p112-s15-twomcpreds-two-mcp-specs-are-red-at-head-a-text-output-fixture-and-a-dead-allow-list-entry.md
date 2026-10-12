---
id: P112-S15-TWOMCPREDS
title: "Two noodl-mcp specs are red at HEAD: nodeIdAllocation's fixture wires a Text output `text` the stricter port door now refuses, and writePathConformance's allow-list holds a dead `component.type`"
status: open
severity: low
area: tests / packages/noodl-mcp/tests/nodeIdAllocation.test.ts:62-74, packages/noodl-mcp/tests/writePathConformance.test.ts:272
found: P112 s15, 2026-10-12, running every MCP spec that passes visual_roots after the DETACHEDVISUAL check
evidence: both red with s15's check switched off (2 failed / 17 passed, the same as with it on), so neither comes from s15
---

1. **`nodeIdAllocation` › "create_component reallocates ids the project already uses"**: the write is refused with
   *"Text has no output named "text""*. The fixture wires `title.text → sub.text`, and a Text node has no `text`
   output. The port door started refusing a wire to a port a node can't have (P107 NSP-020 R19/R20, `306c917e1` /
   `2a05e8833`, not bisected), and this fixture was never updated. Fix: wire a port Text has (or two Strings). The
   spec is about id reallocation, not ports.
2. **`writePathConformance` › AWP-002 §1 "keeps the allow-list honest"**: `ALLOWED_DIFFERENCES` has a
   `component.type` entry that no round trip produces any more. Not traced. Something now writes `component.type`
   the way the editor does, so the entry is dead and the spec says to remove it.
