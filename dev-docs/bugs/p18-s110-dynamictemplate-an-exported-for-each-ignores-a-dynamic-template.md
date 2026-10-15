---
id: P18-S110-DYNAMICTEMPLATE
title: An exported For Each with Template Type dynamic renders the static Template on every row
status: fixed
commit: 94e80af95
severity: medium
area: export / For Each
found: P18 EXP-008 per-parameter check, session 110, 2026-10-15
evidence: packages/nodegx-export/parameter-ledger.json (measured silent by tests/parameter-coverage.test.ts); a hand-built translated context in session 110 scratch emitted byte-identical files and notes; ports: For Each.templateScript (and templateType)
---

Runtime: `foreach.tsx` :509 — with Template Type dynamic, each row's component is chosen by `templateScript(model)`.
Export: the repeater path (`plan.ts` :5393-5404) reads `literalParam('template')` and never `templateType` / `templateScript`.
cheer's Notes list with `templateType: dynamic` and a script choosing `/Components/GreetingCard` still emits `<NoteRow …>` per
row, no note. The export knows the shape (`plan.ts` :5056-5066 excludes a dynamic For Each from template hosts) but the
repeater path does not. Fix: refuse by name whenever Template Type is dynamic (or translate the script).

**Fixed (refused by name), session 111.** `roleOf` refuses a For Each whose Template Type is dynamic (or wired) before it
becomes a repeater: "its Template Type is dynamic — each row's component is chosen by the Template Script at run time,
and this slice renders one static template". The ledger's `For Each.templateScript` moves from `gap` to `refused-with`.
The probe varies the script under Template Type dynamic, and both sides of that variation now refuse with the same sentence.
Graded in `tests/silent-parameters-closed.test.ts`.
