---
id: P107-D2
title: String Format: a placeholder used twice fills every time, though the description says only the first
status: fixed
commit: 8f31517cc
phase: P109
task: ISL-033
severity: low
area: runtime / String Format
found: P107 (the node says what it does) s3, 2026-09-30/10-01
kit: node-spec
regression: packages/nodegx-node-spec/scenarios/String Format.json "a placeholder used twice fills EVERY time, as the port description says (was row D2: it said only the first)"
evidence: dev-docs/tasks/phase-107-the-node-says-what-it-does/NSP-004-THE-PILOT-FIVE.md §6.2 (row D2) — the row names how it is reproduced and pinned
---

String Format: a placeholder used twice fills every time, though the description says only the first.

**Node:** String Format

**What, with the line:** Port description (:52) and the code comment (:91-92): "**a placeholder used twice fills only the first time**". The loop (:89-94) runs once per MATCH and each `replace` fills the first occurrence still standing — `{a}{a}` with `a = x` gives `xx`. Every occurrence fills

**How it was found / where it is pinned:** scenario *a placeholder used twice fills EVERY time*; `tests/pilot.test.ts`

**Proposed answer:** **docs wrong**, and a comment that says "kept verbatim" about a behaviour the line does not have. The description is published on the port (an-example-description-is-published)

**Ruling:** P107's rule R3 (a) — the runtime wins until Richard rules; each fix then ships alone, with the
scenario's `row` mark and the known-row predicate (packages/noodl-runtime/test/node-spec/conformance.test.ts)
dropped in the same commit. Plain-words question: README §7 of P107.

**Ruled 2026-10-05 (Track F rulings page), as recommended: "Correct the words".** The port description and the code comment say every copy of a placeholder is filled. No app changes; people and agents stop being told the node cannot do something it already does. The question as asked: *"Should the description and the code comment be corrected to say every copy of a placeholder is filled?"* (https://claude.ai/artifact/CPcSy8ABRQpn2dMZYuvXDH)

**Fixed 8f31517cc (P109 ISL-033, 2026-10-06), as ruled.** Wording only: Format's sentence is now "every copy of a placeholder is filled" (runtime node, spec, docs page, both catalogs, cloud node library), and the code comment says the same. No behaviour moved.
