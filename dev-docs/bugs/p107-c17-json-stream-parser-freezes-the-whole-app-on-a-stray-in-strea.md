---
id: P107-C17
title: JSON Stream Parser freezes the whole app on a stray `}` in Stream or Single format
status: fixed
commit: 6b3361189
severity: blocker
area: runtime / JSON Stream Parser
found: P107 (the node says what it does) s12, 2026-09-30/10-01
evidence: dev-docs/tasks/phase-107-the-node-says-what-it-does/NSP-013-BATCH-DATES-PARSERS-UTILITIES.md §6.2 (row C17) — the row names how it is reproduced and pinned
---

JSON Stream Parser freezes the whole app on a stray `}` in Stream or Single format.

**Where:** JSON Stream Parser (stream-parsers.ts :234-241 `scanJsonValues`; json-stream-parser.ts :287-300)

**What the wire shows:** Stream or Single format, a stray `}` (Single: also `]`, `,`) where a value should start: the scanner records `Could not parse JSON value: Unexpected end of JSON input` and does not advance — an infinite loop on the main thread, memory growing until the process dies. Any format that is none of the three reads as Stream and hangs too

**Plain words:** *"One stray `}` from an agent stream freezes the whole app, for good."* Graded through a seam that throws where the runtime loops (§6.1b); two scenarios and the generated sequences counted

**Proposed:** step over the character after recording the error once — `i = end > i ? end : i + 1` (the spec's line)

**Ruling:** P107's rule R3 (a) — the runtime wins until Richard rules; each fix then ships alone, with the
scenario's `row` mark and the known-row predicate (packages/noodl-runtime/test/node-spec/conformance.test.ts)
dropped in the same commit. Plain-words question: README §7 of P107.

**Ruled (Richard, 2026-10-01, P107 s16):** fix it. **Fixed:** `scanJsonValues` records the error once and steps
over the character (`i = end > i ? end : i + 1`, the spec's line). The runtime conformance test's `jest.mock` seam
(which turned the loop into a throw), the known row and the two scenarios' `row` marks are gone; both scenarios now
pass on the runtime. Runtime node-spec + agent suites: 304 passed, 55 skipped.
