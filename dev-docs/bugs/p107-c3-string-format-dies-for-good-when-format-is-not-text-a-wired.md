---
id: P107-C3
title: String Format dies for good when Format is not text (a wired number, null, an object)
status: needs-ruling
severity: high
area: runtime / String Format
found: P107 (the node says what it does) s3, 2026-09-30/10-01
evidence: dev-docs/tasks/phase-107-the-node-says-what-it-does/NSP-004-THE-PILOT-FIVE.md §6.2 (row C3) — the row names how it is reproduced and pinned
---

String Format dies for good when Format is not text (a wired number, null, an object).

**Node:** String Format

**What, with the line:** A non-string on `format` (a wired number, `null`, an object, `undefined`) is stored unconverted (:57); `.match` throws in the after-inputs callback (:81); `nodecontext.ts:472` catches and logs it; `formatScheduled` was set at :114 and is cleared only after `formatValue` (:118) — **so the node never formats again**, a later good format included

**How it was found / where it is pinned:** scenarios *a wired number on Format* and *after a non-string Format the node never formats again* (both marked `row`); 113 / 200 and 5,719 / 10,000 generated sequences, attributed by a predicate that requires a non-string `set format` BEFORE the first difference

**Proposed answer:** **runtime bug, two of them**: (a) convert on arrival (`String(value)`, what the spec does) or guard `.match`; (b) clear the flag in a `finally` so one bad frame is not a dead node. The second is the worse one and is the general shape of every `hasScheduled…` family — worth a sweep (NSP-011)

**Ruling:** P107's rule R3 (a) — the runtime wins until Richard rules; each fix then ships alone, with the
scenario's `row` mark and the known-row predicate (packages/noodl-runtime/test/node-spec/conformance.test.ts)
dropped in the same commit. Plain-words question: README §7 of P107.
