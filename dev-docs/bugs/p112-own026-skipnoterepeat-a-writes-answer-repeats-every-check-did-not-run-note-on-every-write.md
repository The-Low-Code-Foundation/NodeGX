---
id: P112-OWN026-SKIPNOTEREPEAT
title: A write's answer repeats every "this check did not run" note, one per node, on every write
status: open
severity: medium
area: mcp authoring answers (`packages/noodl-mcp/src/tools/author.ts` successPayload / rejectWith, `planTools.ts`)
kit: mcp
found: P112 OWN-026 t2-nodegx-c03, 2026-10-23; FIX-04 D
evidence: t2-nodegx-c03 — 19 `dynamic-port-skipped` notes (a Set Variable's `value` each) were 12,005 of a 13,534-character validation block, sent back unchanged on six writes in a row; 212 of the round's ~240 write diagnostics; write answers were 20.8% of all billed input
---

`validate_project` has always left the two skip-note codes out (`SKIP_NOTE_CODES`: they say a check did not run, not
that anything is wrong). The write doors sent every one, in full, per node, on every write and in every rejection's
`allDiagnostics`, so the answers a model gets most often were mostly notes about the checker.
