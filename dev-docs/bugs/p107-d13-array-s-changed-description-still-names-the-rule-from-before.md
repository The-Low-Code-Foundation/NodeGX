---
id: P107-D13
title: Array's Changed description still names the rule from before the "Array contents" checkbox
status: fixed
commit: 8f31517cc
phase: P109
task: ISL-033
severity: low
area: runtime / Array
found: P107 (the node says what it does) s9, 2026-09-30/10-01
kit: node-spec
regression: packages/nodegx-node-spec/scenarios/Collection2.json "Array contents unticked: the copy changes the array silently — no Changed, Count stays as last sent"
evidence: dev-docs/tasks/phase-107-the-node-says-what-it-does/NSP-012-BATCH-ARRAYS-OBJECTS-STORES.md §6.2 (row D13) — the row names how it is reproduced and pinned
---

Array's Changed description still names the rule from before the "Array contents" checkbox.

**Where:** Array `changed` description (:213)

**What the wire shows:** "suppressed while Fetch is connected" — NDA-017 §2 replaced that rule with the `Array contents` checkbox (:73)

**Plain words:** a sentence from before the checkbox

**Proposed:** rewrite

**Ruling:** P107's rule R3 (a) — the runtime wins until Richard rules; each fix then ships alone, with the
scenario's `row` mark and the known-row predicate (packages/noodl-runtime/test/node-spec/conformance.test.ts)
dropped in the same commit. Plain-words question: README §7 of P107.

**Ruled 2026-10-05 (Track F rulings page), as recommended: "Rewrite the description".** It says Changed fires when the array gains or loses items, and that unticking Array contents silences it so only Fetch updates the node. Words only; no app changes. The question as asked: *"Should Changed's description be rewritten to name the Array contents checkbox?"* (https://claude.ai/artifact/CPcSy8ABRQpn2dMZYuvXDH)

**Fixed 8f31517cc (P109 ISL-033, 2026-10-06), as ruled.** Wording only: Changed's sentence is now "Fires when the bound array gains or loses items; with Array contents unticked it stays silent and only Fetch updates the node" in every copy. The existing Array contents scenario grades the second half.
