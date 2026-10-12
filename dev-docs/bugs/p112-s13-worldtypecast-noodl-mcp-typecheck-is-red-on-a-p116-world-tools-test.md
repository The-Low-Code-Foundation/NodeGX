---
id: P112-S13-WORLDTYPECAST
title: "`noodl-mcp`'s typecheck is red on a P116 test: `ont002WorldTools.test.ts:253` casts a union to a type neither member overlaps"
status: open
severity: low
area: tests / P116 world tools (`packages/noodl-mcp/tests/ont002WorldTools.test.ts:253`)
found: P112 OWN-014 s13, 2026-10-12 (while typechecking an unrelated change)
evidence: `npm run typecheck` in packages/noodl-mcp at 63992760c → exit 2, one error
---

`npm run typecheck` in `packages/noodl-mcp` exits 2 with one error, TS2352 at `tests/ont002WorldTools.test.ts(253,21)`.
The test casts the tool's result (a union of `{ ok: true; ask; waiting; enough; record; volunteered; schema:
{ collections: { name }[] } }`, `{ ok: false; problems }` and `undefined`) straight to
`{ schema: { collections: { name; description }[] } }`, and neither member overlaps. The line was last changed in
`120baf39d` (P116 ONT-013, 2026-10-11). Jest still runs the test, because ts-jest's diagnostics don't fail it this
way, so only the typecheck shows it. The likely fix is `as unknown as …`, or adding `description` to the result type
if the tool now returns it. Left for P116, which owns the test.
