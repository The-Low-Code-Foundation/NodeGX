---
id: P125-BRIEFSHAPE
title: noodl-mcp's instructions spec is red — the unbound briefing is 2,222 characters against a ceiling of 70% of the bound one (2,130)
status: open
severity: low
area: mcp / instructions (BOOTSTRAP_INSTRUCTIONS)
found: P26 DEP-002 s4, 2026-10-23
evidence: packages/noodl-mcp/tests/instructions.test.ts "BST-006 — the unbound briefing › is a fraction of the bound briefing"
kit: mcp
---

`npx jest tests/instructions.test.ts` in `packages/noodl-mcp`: 13 of 14, the one red is
`expect(BOOTSTRAP_INSTRUCTIONS.length).toBeLessThan(golden('deferred').length * 0.7)` — received 2222, expected
< 2130.1. Neither file was touched by the session that saw it (P26 DEP-002 s4 changed `server.ts`, `toolGroups.ts`,
`errors.ts` and a new tool). `instructions.ts` last changed in `131914e73` (P125 CCN-001 s2, 2026-10-23 10:44: "the
briefing says call the tools through your client, never a scripted server"), which lengthened the unbound briefing.

The spec's own comment calls it "not a budget, a shape check: if this ever approaches the bound text's length,
somebody has started teaching authoring here". The added sentence is about the transport, not authoring, so the fix
is either a shorter wording of that sentence or a restated ceiling with the reason written in the spec. Lane 3's call.
