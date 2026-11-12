# HTX-005 — Graded the same way

**Phase:** [134](README.md). **AC:** AC4. **Sessions:** 1. **Needs:** HTX-002, HTX-003.

## Build

- `tests/helpers/html-graph-target.ts`: a `GraphTarget` (from `@nodegx/node-spec`) over the HTML printer's output,
  mounted in jsdom, following `node-spec-target.ts` (React) and `swift-graph-target.ts` (Swift). No transpile: the
  output is JavaScript.
- The P107 scenarios played against it; the line on P18's ledger beside React's and Swift's, in the ledger's own words.
  🔴 Never quote the number bare: on the ledger, many of the cases are rig limits or refused by design (memory:
  phase-18-code-export-v2). Say how many are played and how many match React's trace.

## Done when

- The ledger line is written and a mutant in the HTML printer turns it red (a mutant that changes nothing is a finding).
- The cost is written beside React's and Swift's in EXP-022's words: sessions, printer lines, and the lines moved into
  shared cores (HTX-002) counted apart.
