---
id: P107-D3
title: String Format expands $&, $$ and friends inside a value
status: needs-ruling
severity: medium
area: runtime / String Format
found: P107 (the node says what it does) s3, 2026-09-30/10-01
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
