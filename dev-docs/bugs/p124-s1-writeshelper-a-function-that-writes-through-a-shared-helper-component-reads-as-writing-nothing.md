---
id: P124-S1-WRITESHELPER
title: A cloud function that writes records only through a shared helper component is reported as writing nothing
status: fixed
commit: (this session, the Beta sweep s6)
severity: low
area: backend / function declarations (`packages/nodegx-backend/src/workflow/functionDeclarations.ts` `graphWritesRecords`, per-graph) and its twin the editor's door (`packages/noodl-editor/src/editor/src/validation/publicWriteDoor.ts`, one component's nodes only)
found: Beta sweep s5, 2026-10-25, fixing P124-S1-WRITESRECORDSJS, on `templates/digital-bricks-training`
regression: packages/nodegx-backend/tests/def009-public-write-default.test.ts "P124-S1-WRITESHELPER: a write inside a placed helper is the function’s write; a loop of helpers ends"
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

**Fixed (the Beta sweep s6, 2026-10-25), both together.** Backend: `graphWritesRecords(nodes, helpers?, seen?)` follows
a node whose type is another `/#__cloud__/` component of the bundle, each once; `componentWritesRecords` (never into
itself) is what `declaredFunctionsIn` and `WorkflowRunner.functionWritesRecords` ask. Door: `checkPublicWriteDoor`
takes `views` and follows the same instances, naming the helper ("writes records (a script calls Records.create, in
"/#__cloud__/shared/Thread")"); `authoredPreconditionDiagnostics` hands it the views it already has. Without views the
door is per-component, as before. A helper reached only through `Run Tasks`' template is followed by neither (both
docblocks say so).

**Graded.** Backend DEF-009 18/18: a public endpoint placing a writing helper gets the 60/min burst 30 default over
HTTP, and the predicate (helper write, a loop of helpers, no helpers given) — both red at HEAD. The fixture now gives
its class buckets room (`ops.json`), since a seventh 40-call arm outspent the shared burst 200 and reddened the opt-out
arm for the wrong reason. Door 16/16 (the helper write named; a reading helper, a loop, no views: silence; the
composition passes the views). Mutants red: door ignoring views, composition dropping them, both cycle guards
(RangeError), `declaredFunctionsIn` without helpers. Measured on `templates/digital-bricks-training` with the real
predicate: 8 → 12 of 27 functions write, the four gained exactly the row's four. Editor validator 19 suites 263/263,
backend declaration suites 81/81; backend, editor and noodl-mcp tsc clean.
