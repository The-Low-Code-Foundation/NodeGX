---
id: P18-S110-STORENOTES
title: A store plan's notes are written and never reach the export report
status: open
severity: medium
area: export / Global Store
found: P18 EXP-008 per-parameter check, session 110, 2026-10-15
evidence: packages/nodegx-export/parameter-ledger.json (measured silent by tests/parameter-coverage.test.ts); a hand-built translated context in session 110 scratch emitted byte-identical files and notes; ports: (no port — found while adjudicating net.noodl.GlobalStore.storageKey)
---

`analyze/appState.ts` pushes sentences to `StorePlan.notes` (:587 "sets storageKey without persist — inert, ignored", and :597,
:603), but nothing in `src` reads `StorePlan.notes`, so they never reach `app.notes`, the report or the pre-flight. EXP-004's
"nothing dropped silently" holds only for notes that reach a reader; this channel has none. Fix: route them into the component
notes as the other plans do, and grep for any other `.notes` array with no reader.
