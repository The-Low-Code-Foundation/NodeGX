---
id: P107-C48
title: A User node's `<field> Changed` signals never fire — the editor offers them, nothing registers them (C11 / C37's twin)
status: fixed
commit: b67698798
phase: P109
task: ISL-027
severity: low
area: runtime / User (`user.ts` `registerOutputIfNeeded` :447-463)
found: P107 (the node says what it does) s26, 2026-10-02
kit: node-spec
regression: packages/nodegx-node-spec/scenarios/net.noodl.user.User.json "the start-up check brings a moved field: its <field> Changed, Changed, and the property output (ISL-027, C48)"
evidence: dev-docs/tasks/phase-107-the-node-says-what-it-does/NSP-014-BATCH-DATA-AND-CLOUD.md §6.17 (row C48); scenarios/net.noodl.user.User.json "C48 — …"; conformance.test.ts KNOWN_ROWS
---

`user-ports.ts` offers a `changed-<field>` signal per property (`includeChangedSignals: true`), and the node's watcher
pulses it when `hasOutput('changed-' + name)` (:109). But `registerOutputIfNeeded` registers only `prop-` and the three
session signals — so the output never exists, the pulse never goes, and a wire from it carries nothing. The same defect as
C11 (Object) and C37 (Record).

**Plain words:** *"The User node's 'nick Changed' (one per property) never fires, though the editor lets you wire it.
Changed (the general one) does."*

**Proposed:** register `changed-` beside `prop-` in `registerOutputIfNeeded` — ask together with C11 and C37.

**Ruling:** R3 (a) — the runtime wins until Richard rules; the spec states the pulse, the runtime's silence is a known row.

**Ruled 2026-10-05 (Track F rulings page), as recommended: "Make them fire".** Each 'nick Changed' pulses when that value changes. A one-line change to the User node. Apps that already have such a wire will start running whatever it leads to, which is what their builders meant. The question as asked: *"Should the User node's per-property Changed signals fire when that property changes?"* (https://claude.ai/artifact/CPcSy8ABRQpn2dMZYuvXDH)

**Fixed 2026-10-06 (P109 s22, ISL-027), as ruled "Make them fire".** One shape in all three (C11, C37, C48): each node registers `changed-<field>` when a wire asks, so the pulse behind `hasOutput` reaches it. The specs had never been graded on the signal's ORDER (the runtime never sent it): 17 generated divergences on the Object and 1 on the Record were one shape, fixed in the specs with the format's `pulses` (Object v3, Record v2; the User already used it). Runtime at seeds 20732 and 13: all three conform, 0 divergences. Control (HEAD's three runtime files): the five scenarios fail, plus 35 / 2 / 18 generated.
