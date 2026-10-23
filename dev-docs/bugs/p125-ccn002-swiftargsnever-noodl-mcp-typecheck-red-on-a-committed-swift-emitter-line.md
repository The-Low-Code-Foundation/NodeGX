---
id: P125-CCN002-SWIFTARGSNEVER
title: noodl-mcp's typecheck is red on a committed line of the Swift emitter (`const args = []` is `never[]`)
status: open
severity: medium
area: export / Swift emitter (modifiers.ts), seen through noodl-mcp's tsc
found: P125 CCN-002, 2026-10-23 (lane 3)
evidence: `npx tsc --noEmit -p packages/noodl-mcp/tsconfig.json` → two errors, nothing else
---

`npx tsc --noEmit -p tsconfig.json` in `packages/noodl-mcp` fails with exactly two errors, both outside it:

    ../nodegx-export/src/emit/swift/modifiers.ts(242,45): error TS2345: Argument of type 'string' is not assignable to parameter of type 'never'.
    ../nodegx-export/src/emit/swift/modifiers.ts(243,41): error TS2345: …

`modifiers.ts:241` declares `const args = [];`, which noodl-mcp's compiler settings type as `never[]`, so the two
`args.push(\`width: …\`)` lines do not compile there. Committed in f42a3d8a2 (P18 EXP-022 s6, 2026-10-22); the file
has no open edit. noodl-mcp's `npm run build` (esbuild) does not typecheck, so the bundle still builds; any gate that
runs noodl-mcp's tsc is red for a reason none of its own files carry.

Fix (one line, lane 4's file): `const args: string[] = [];`. Not fixed here because lane 4 is paused by Richard
(2026-10-23: no session opens on it until he names it).
