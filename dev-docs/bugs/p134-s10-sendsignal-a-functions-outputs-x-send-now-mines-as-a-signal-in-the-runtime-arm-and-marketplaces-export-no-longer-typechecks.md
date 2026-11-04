---
id: P134-S10-SENDSIGNAL
title: "export suite: `Outputs.x.send()` now mines as a signal on the runtime's side too, so ISL-006's one deliberate difference is gone and marketplace's React export has a new type error"
status: open
severity: medium
area: Function port mining, the runtime's against the export's (`packages/nodegx-export/tests/isl-006-mined-ports-agree.test.ts`); marketplace's `Tabs.tsx` in the React export (`tests/the-templates-typecheck.test.ts`)
found: P134 session 10, 2026-11-04, the whole nodegx-export suite in band, run for SELECTREFUSED
evidence: isl-006 "the one deliberate difference" expected the runtime to read `Outputs.ready.send();` as an output and reads it as a signal; the-templates-typecheck "marketplace: 1 errors, the ledger says 0 — TS2345 src/components/Tabs.tsx:42: Argument of type '{ sellers?: (() => void) | undefined; … }' is not assignable to parameter of type 'SetStateAction<Record<string, never> | undefined>'"
---

Not session 10's: marketplace's React export is byte-identical when written from HEAD's `src` and from the tree's (both
in today's checkout, which shares `@nodegx/project-contract` and the runtime), and no file of the four session 10 changed
mines a Function. Something outside `packages/nodegx-export/src` moved how a Function's `send()` ports are read, and the
two red rows are its consequences: the pin in ISL-006 still describes the old runtime, and marketplace's "Bring this page's
tab into view" now has six signal outputs whose row the export still types `Record<string, never>`.

Owed: find the commit that moved the runtime's mining (`git log` over the runtime's Function node and
`@nodegx/project-contract`'s function-ports), then either move ISL-006's pin (if the runtime is now right) and type the
row from the signals, or put the runtime back.
