---
id: P107-D3
title: String Format expands $&, $$ and friends inside a value
status: fixed
commit: 2b30bc667
phase: P109
task: ISL-032
severity: medium
area: runtime / String Format
found: P107 (the node says what it does) s3, 2026-09-30/10-01
kit: node-spec
regression: packages/nodegx-node-spec/scenarios/String Format.json "$-patterns in a value come out as typed: …"
evidence: dev-docs/tasks/phase-107-the-node-says-what-it-does/NSP-004-THE-PILOT-FIVE.md §6.2 (row D3) — the row names how it is reproduced and pinned
---

String Format expands $&, $$ and friends inside a value.

**Node:** String Format

**What, with the line:** `formatted.replace('{' + name + '}', String(v))` (:93): a string pattern still expands `$&`, `$$`, `` $` ``, `$'` in the REPLACEMENT. A value of `$&` prints `{v}` back; `$$` prints `$`

**How it was found / where it is pinned:** scenario *$-patterns in a value are interpreted*; the spec reproduces it verbatim so the two agree

**Proposed answer:** **intended?** almost certainly not — a price of `$$5` renders as `$5`. Fix is a function replacement, `() => String(v)`; the spec then drops the verbatim call

**Ruling:** P107's rule R3 (a) — the runtime wins until Richard rules; each fix then ships alone, with the
scenario's `row` mark and the known-row predicate (packages/noodl-runtime/test/node-spec/conformance.test.ts)
dropped in the same commit. Plain-words question: README §7 of P107.

**Ruled 2026-10-05 (Track F rulings page), as recommended: "Insert values exactly".** Dollar signs come out as typed. A one-line change. Nobody is likely to rely on the current behaviour. The question as asked: *"Should String Format insert every value exactly as it is?"* (https://claude.ai/artifact/CPcSy8ABRQpn2dMZYuvXDH)

**Fixed 2b30bc667 (P109 ISL-032, 2026-10-06), as ruled.** A function replacement, so no `$`-pattern applies. String Format v2; the stranger fixtures of rounds 1 and 2 moved with the spec.
