---
id: P132-BST006GOLDEN
title: The bound briefing's golden copy says "Its 67 tools", the server now says 68, so BST-006 is red
status: open
phase: P132
severity: low
area: packages/noodl-mcp / tests/instructions.test.ts, tests/fixtures/boundInstructions.{deferred,readOnly}.txt
found: running the MCP's surface tests after BWF-005's description changes, P132 s6, 2026-11-03
evidence: "BST-006 — the bound briefing is unchanged, character for character › deferred mode matches the pre-move capture": expected "Its 67 tools are not advertised yet", received "Its 68 tools"
---

`tests/instructions.test.ts` (BST-006) compares the bound briefing with a captured copy character for character. The
briefing names how many backend tools are deferred, and that count is now 68 against the capture's 67, in both the
deferred and the read-only capture. BWF-005 registered no tool (it changed descriptions and one schema field in
`backendTools.ts`), so a tool was added elsewhere without the capture being refreshed; which commit is not measured.

Not fixed here: the right fix is to refresh both captures in the change that added the tool, or to make the count in
the capture a placeholder so a new tool does not turn a briefing check red. Owner: whoever added the 68th backend tool.
