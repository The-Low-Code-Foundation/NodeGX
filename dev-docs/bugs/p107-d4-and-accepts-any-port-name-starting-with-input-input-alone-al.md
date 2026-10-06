---
id: P107-D4
title: And accepts any port name starting with "input" (input alone aliases input 0)
status: wontfix
reason: ruled 2026-10-05 "Leave it, and say so" — No change. The odd names stay possible only through a hand-edited file, and the ledger records why it was left.
phase: P109
task: ISL-032
severity: low
area: runtime / And (nodedefinition.ts numbered inputs)
found: P107 (the node says what it does) s3, 2026-09-30/10-01
evidence: dev-docs/tasks/phase-107-the-node-says-what-it-does/NSP-004-THE-PILOT-FIVE.md §6.2 (row D4) — the row names how it is reproduced and pinned
---

And accepts any port name starting with "input" (input alone aliases input 0).

**Node:** And

**What, with the line:** `registerNumberedInput` (nodedefinition.ts :137-149) accepts any name starting with `input` and parses what follows the space with `Number()`: `input` alone aliases `input 0`, `input 01` aliases `input 1`, `input  2` aliases `input 2`, `input 1.5` lands outside the array's length and is never counted

**How it was found / where it is pinned:** by reading; the spec's `discover` refuses all of them (only `input <digits>`, what the editor mints)

**Proposed answer:** **intended / unreachable** from the editor; a corrupted project file is the only route. Recorded, no action proposed

**Ruling:** P107's rule R3 (a) — the runtime wins until Richard rules; each fix then ships alone, with the
scenario's `row` mark and the known-row predicate (packages/noodl-runtime/test/node-spec/conformance.test.ts)
dropped in the same commit. Plain-words question: README §7 of P107.

**Ruled 2026-10-05 (Track F rulings page), as recommended: "Leave it, and say so".** No change. The odd names stay possible only through a hand-edited file, and the ledger records why it was left. The question as asked: *"Should And refuse input names the editor never makes?"* (https://claude.ai/artifact/CPcSy8ABRQpn2dMZYuvXDH)
