---
id: P107-C3
title: String Format dies for good when Format is not text (a wired number, null, an object)
status: fixed
commit: 350c3ec31
phase: P109
task: ISL-026
severity: high
area: runtime / String Format
found: P107 (the node says what it does) s3, 2026-09-30/10-01
kit: node-spec
regression: packages/nodegx-node-spec/scenarios/String Format.json "a wired number on Format is read as its text: '5'" and "after a non-string Format the node formats again — a later good format is sent"
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

**Ruled 2026-10-05 (Track F rulings page), as recommended: "Fix both halves".** A number on Format is read as its text, and a node that fails once builds again on the next change. Two small changes; the second is the one that stops a dead node. The question as asked: *"Should String Format turn a non-text Format into text, and recover after one bad update?"* (https://claude.ai/artifact/CPcSy8ABRQpn2dMZYuvXDH)

**Fixed 2026-10-06 (P109 s21, ISL-026), both halves as ruled.** `stringformat.ts`: the Format setter stores `String(value)`
(the spec's `js-string`, unchanged), and the frame-end callback clears `formatScheduled` in a `finally`, so a frame that
throws can no longer leave the node dead. The two scenarios lost their `row` mark and the conformance test's known row is
gone. Runtime 200 at the day's seed: String Format conforms. Control: the old setter with the row dropped fails exactly the
two scenarios. The export was not affected: it refuses a wired Format by name (`plan.ts` `formatExprOf`).
