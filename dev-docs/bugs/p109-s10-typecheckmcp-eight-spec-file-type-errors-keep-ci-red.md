---
id: P109-S10-TYPECHECKMCP
title: "`typecheck:mcp` (a CI step) is red with eight type errors in the island's spec files"
status: fixed
commit: fa1dc081c
phase: P109
task: ISL-036
severity: low
area: tooling / noodl-mcp tests (typecheck:mcp, pr.yml)
found: P109 ISL-023 s10, 2026-10-03
evidence: dev-docs/tasks/phase-109-the-defects-the-island-found/ISL-023-THE-GENERATOR-GATES-CATCH-A-TYPE-ERROR-AND-A-STRAY-BACKTICK.md §8 AC1
regression: packages/noodl-mcp/tests/cg003Template.test.ts
---

`npm run typecheck:mcp` (`tsc -p packages/noodl-mcp --noEmit`, run by `.github/workflows/pr.yml` on a push to
`cline-dev`) exits 2. Nothing local runs it, and jest transforms with `diagnostics: false`, so every spec is green.
After ISL-023 removed the duplicate imports and fixed `dynamicPortRules.ts:351`, eight errors remain, all in specs
written by P105–P108 (none in a template generator module, so `scripts/template-gate.js` is green):

- `tests/cg001GardenKit.test.ts:331` TS2345 (`string | undefined` to `string`)
- `tests/cg002Engine.test.ts:2828` TS2339 (`owner` on a union)
- `tests/cg003Template.test.ts:799` TS2352 (`LegacyNode[] | undefined` as `string[]`), `:1599` and `:2392` TS2352 (`Bi` as `Record<string, string>`)
- `tests/ig007Garden3d.test.ts:175` TS2345 (an object to `never`: an empty array literal's type)
- `tests/iw007Animals.test.ts:176` TS2339 (`body` on `{ id; t }`)
- `tests/p108s8Feedback.test.ts:53` TS2352 (`Thing[]` as `Record<string, unknown>[]`)

**Reproduce:** `npx tsc -p packages/noodl-mcp --noEmit` (9 s). **Proposed:** fix each in its spec: typed array
literals and `as unknown as` where a cast is deliberate. Small. The first push of `cline-dev` meets this.

**Fixed 2026-10-10 (P109 s39, ISL-036, `fa1dc081c`).** Re-measured: 10 errors, not 8 (two had arrived since). All ten fixed, each type-only except one: cg003 D8 cast a Legacy node's `children` (node objects) to `string[]`, so `not.toContain('plAsk')` could never go red; it compares ids now, and a mutant is red by name. `npm run typecheck:mcp` exit 0. Specs 561/561.
