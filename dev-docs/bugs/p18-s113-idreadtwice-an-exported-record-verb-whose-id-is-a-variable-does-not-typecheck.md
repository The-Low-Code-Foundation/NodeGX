---
id: P18-S113-IDREADTWICE
title: An exported Update or Delete Record whose Id is read from a Variable does not typecheck
status: fixed
commit: (s113)
regression: packages/nodegx-export/tests/the-live-record.test.ts
severity: medium
area: export / record verbs
found: P18 session 113, 2026-10-15, building tests/fixtures/record-desk for P18-S111-RECORDLIVE
evidence: packages/nodegx-export/tests/the-live-record.test.ts §D — TS2345 src/components/Rename.tsx:27, "Argument of type 'string | undefined' is not assignable to parameter of type 'string'"
---

A Set Record Properties (or Delete Record) whose Id is wired from a Variable that something writes as a string
exports as:

```ts
if (!pageId.get()) throw new Error('Missing Record Id');
await updatePage(pageId.get(), { title: newTitle });
```

TypeScript narrows a local, never a second call, so the second `pageId.get()` is still `string | undefined` and the
exported app fails `tsc` (TS2345). The guard reads the value twice where the runtime reads the stored value once.

The relation verbs already bind a local for exactly this reason (EXP-011 §62, `${stem}RecordId`); the record verbs'
`guardId` predates that and never got it. An Id read from a form field's local or a component prop is a plain
identifier and narrows; an untyped Variable is coerced with `String(… ?? '')` and is a `string`. Only a typed read
through a call is hit.

**Fixed, session 113.** `actionCode`'s `api-call` binds an Id read through a call to `<stem>RecordId` first, the
relations' naming, and the guard and the call read that local. A plain identifier and a coerced read are left as they
were, so no corpus app moved (HLS-001 moved only where RECORDLIVE did). Graded by `the-live-record.test.ts` §D (the
form's code, and record-desk typechecking); the mutant that switches the binding off turns exactly those rows red.
