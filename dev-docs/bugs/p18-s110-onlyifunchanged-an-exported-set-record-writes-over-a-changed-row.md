---
id: P18-S110-ONLYIFUNCHANGED
title: An exported Set Record Properties with Only If Unchanged writes over a row someone else changed
status: fixed
commit: 78be5aed5
severity: medium
area: export / Set Record Properties
found: P18 EXP-008 per-parameter check, session 110, 2026-10-15
evidence: packages/nodegx-export/parameter-ledger.json (measured silent by tests/parameter-coverage.test.ts); a hand-built translated context in session 110 scratch emitted byte-identical files and notes; ports: SetDbModelProperties.onlyIfUnchanged
---

Runtime: `setdbmodelpropertiesnode.ts` :114-131, :164+ sends an ifMatch precondition and fires Failure when the row moved.
Export: zero reads of `onlyIfUnchanged` in `packages/nodegx-export/src`; link-desk's `updatePuppy` is emitted identically with the
box ticked — the write is unconditional and the lost-update guard the author asked for is gone, silently.

**Fixed (refused by name), session 111.** A Set Record Properties whose Only If Unchanged names a property (split on
commas, then trimmed, as the setter does), or is wired, defers with a sentence. Carrying it needs a read copy of the
record to take the precondition from, which the export does not hold (see P18-S111-RECORDLIVE for the same missing
cache).
