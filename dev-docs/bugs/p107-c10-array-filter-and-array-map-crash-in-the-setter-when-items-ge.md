---
id: P107-C10
title: Array Filter and Array Map crash in the setter when Items gets a number, boolean or plain object
status: fixed
commit: 06ca94db1
phase: P109
task: ISL-026
severity: medium
area: runtime / Array Filter, Array Map, Filter Records (s25)
found: P107 (the node says what it does) s9, 2026-09-30/10-01
kit: node-spec
regression: packages/nodegx-node-spec/scenarios/Filter Collection.json "A number on Items is not a list: the run fails with array-filter/not-a-list, a Filter press with it (row C10)"
evidence: dev-docs/tasks/phase-107-the-node-says-what-it-does/NSP-012-BATCH-ARRAYS-OBJECTS-STORES.md §6.2 (row C10) — the row names how it is reproduced and pinned
---

Array Filter and Array Map crash in the setter when Items gets a number, boolean or plain object.

**Where:** Array Filter (:343), Array Map (:233), Filter Records (`filterdbmodelsnode.ts` :319 — the same `bindCollection`, found s25: 14–18 of 200 generated sequences per seed, NSP-014 §6.14)

**What the wire shows:** `Items` handed a number, a boolean or a plain object THROWS in the setter (`collection.on is not a function`) — a wire can carry any of them

**Plain words:** *"A non-array on Items crashes the node instead of refusing."* 21 / 42 counted

**Proposed:** guard `on` (a `Failure` on the next run, or treat as no array)

**Ruling:** P107's rule R3 (a) — the runtime wins until Richard rules; each fix then ships alone, with the
scenario's `row` mark and the known-row predicate (packages/noodl-runtime/test/node-spec/conformance.test.ts)
dropped in the same commit. Plain-words question: README §7 of P107.

**Ruled 2026-10-05 (Track F rulings page), as recommended: "Refuse it with a Failure".** The node produces no items and Failure fires with a message saying Items is not a list. A small change in one shared place. The question as asked: *"When Items is not a list, should these nodes refuse it with a Failure?"* (https://claude.ai/artifact/CPcSy8ABRQpn2dMZYuvXDH)

**Fixed 2026-10-06 (P109 s21, ISL-026), as ruled.** `data/itemsinput.ts`: a value that is not a list binds nothing and the next run fails with `<node>/not-a-list` ("Items is not a list — it received a number"), for Array Filter, Array Map and Filter Records. Specs v4 / v3 / v2 (`nodes/items-input.ts`). Runtime 200: all three conform, 0 generated divergences. Control: the three scenarios fail on HEAD's files. The export's handling of such an Items was not checked.
