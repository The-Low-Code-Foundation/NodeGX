---
id: P107-C48
title: A User node's `<field> Changed` signals never fire — the editor offers them, nothing registers them (C11 / C37's twin)
status: needs-ruling
severity: low
area: runtime / User (`user.ts` `registerOutputIfNeeded` :447-463)
found: P107 (the node says what it does) s26, 2026-10-02
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
