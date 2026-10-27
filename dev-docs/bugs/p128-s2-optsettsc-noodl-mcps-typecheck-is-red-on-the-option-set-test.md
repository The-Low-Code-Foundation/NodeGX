---
id: P128-S2-OPTSETTSC
title: "noodl-mcp's typecheck is red at HEAD on `tests/p128OptionSet.test.ts`: two lines read `.parameters` off a union whose Group member has none (TS2339)"
status: open
severity: low
area: "`packages/noodl-mcp/tests/p128OptionSet.test.ts` lines 156 and 161 (from 5a74b841a, P128 S2)"
found: Beta sweep s19, 2026-10-27, `npx tsc --noEmit -p tsconfig.json` in noodl-mcp while building P128-S3-NOSTUDIOFORTHEEDITOR
evidence: "TS2339: Property 'parameters' does not exist on type '{ id: string; type: string; children: string[]; }' at (156,218) and (161,128); the file is unmodified at HEAD 0b98c2f84, so it was red from the commit that added it. jest still runs it (ts-jest reports per file); the package's tsc gate does not pass."
owner: none (P128's file)
kit: mcp
---

A test-only typing slip: the example's node list is a union and two assertions read `parameters` without narrowing
to the node that has them. Narrow (`find((n) => n.id === …) as { parameters: … }`) or type the list. Not touched by
the sweep: it is P128's live file.
