---
id: P124-S1-WRITESHELPER
title: A cloud function that writes records only through a shared helper component is reported as writing nothing
status: open
severity: low
area: backend / function declarations (`packages/nodegx-backend/src/workflow/functionDeclarations.ts` `graphWritesRecords`, per-graph) and its twin the editor's door (`packages/noodl-editor/src/editor/src/validation/publicWriteDoor.ts`, one component's nodes only)
found: Beta sweep s5, 2026-10-25, fixing P124-S1-WRITESRECORDSJS, on `templates/digital-bricks-training`
evidence: after that fix, 8 of the template's 27 functions read as writing; `openThread`, `openThreadAsCoach`, `replyAsCoach` and `sendMessage` write only inside `/#__cloud__/shared/Thread`, which each places as a node, and still read `writesRecords: false`
---

Both predicates are per-graph on purpose, and both docblocks say why: the backend's public-write default and the
editor's warning must name one population, and the door sees one component at a time. Widening was left as "a corpus
decision for the day a measured instance exists". This is the measured instance: four functions of the training
product, each writing a thread row through one shared helper component.

**Who it reaches today:** none of the four is public, so the rate-limit default is not affected. It is wrong in
`/admin/permissions/functions` and in any canvas that draws "what this function writes" (P124 README §2, §5.2).

**Fix shape:** follow component instances (a node whose type is another `/#__cloud__/` component of the same bundle)
in `graphWritesRecords`, cycle-safe; the door needs the project's other cloud components to do the same, so it is
the door's signature that changes. Both together, or the warning and the default part. Owner: NONE.
