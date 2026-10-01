---
id: P78-DBT-KEYORDER
title: An Object field reads back with its keys in a different order from the one saved
status: needs-ruling
severity: low
area: backend / Object fields (PostgreSQL jsonb; seen on SQLite by TPL-011)
found: P78 Digital Bricks Training template, 2026-09-23 (PostgreSQL); P78 TPL-011 s6, 2026-09-27 (Nightbook)
evidence: templates/digital-bricks-training/docs/START-HERE.md PostgreSQL notes ("An Object field comes back with its keys in a DIFFERENT ORDER", "Reported to NodeGX"); decisions/005-the-backend-reads.md; dev-docs/tasks/phase-78-the-templates/TPL-011-THE-EVENING-JOURNAL.md §3c (keepThing)
---

A record's Object field does not come back with its keys in the order they were saved:
- **PostgreSQL** stores it as `jsonb`, which sorts the keys. DBT's coach page lists a learner's facts in key order,
  so the order changes after the move. `migrate`'s own comparison ignores key order, and the template's `check-seed`
  does not, so it reports three fields "different" that differ only in order.
- **Nightbook** runs on `node:sqlite`. Its backend "hands a value back with its keys in another order", so a
  duplicate check that compared JSON text kept the same heart twice. The template now compares without regard to
  key order.

Neither was re-measured here.

**Ruling wanted:** is key order part of an Object field's value? If yes, PostgreSQL needs `json` (or an order-keeping
encoding) and the SQLite path needs finding. If no, the docs and the Records API should say so, and the node reference
should warn that `JSON.stringify` comparison of a read-back object is unreliable. Either way, small.
