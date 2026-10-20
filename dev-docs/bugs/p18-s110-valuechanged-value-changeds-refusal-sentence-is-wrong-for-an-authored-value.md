---
id: P18-S110-VALUECHANGED
title: Value Changed's refusal says it never fires when an authored value fires it once
status: open
severity: low
area: export / Value Changed
found: P18 EXP-008 per-parameter check, session 110, 2026-10-15
evidence: packages/nodegx-export/parameter-ledger.json (measured silent by tests/parameter-coverage.test.ts); a hand-built translated context in session 110 scratch emitted byte-identical files and notes; ports: Value Changed.value
---

`plan.ts` :17365 refuses an unwired Value Changed with "nothing is wired into Input — the node never receives a value, so it
never fires". With an authored literal the runtime queues the parameter at load (`nodescope.ts` :211) and the setter fires
Changed once (`valuechanged.ts`). The refusal is right; its sentence is not. Fix the sentence (or translate the one boot pulse).
