---
id: P124-S1-WRITESRECORDSJS
title: "`writesRecords` reads the graph's record-node types only: a function that writes records from a JavaScript node is reported as writing nothing"
status: fixed
commit: (this session, the Beta sweep s5)
severity: medium
area: backend / function declarations (`packages/nodegx-backend/src/workflow/functionDeclarations.ts` `graphWritesRecords`, `RECORD_WRITE_NODE_TYPES`)
found: P124 s1 (the mystery of the backend), 2026-10-20, on a copy of `templates/digital-bricks-training`
regression: packages/nodegx-backend/tests/def009-public-write-default.test.ts "P124-S1-WRITESRECORDSJS: a public function that writes from a script gets the same default"
evidence: `GET /health` on the copy's backend → `workflows.functions[*].writesRecords === false` for all 27 endpoints
---

`graphWritesRecords` walks a deployed function's node tree and answers true when it meets one of five record-write
node types (`NewDbModelProperties`, `SetDbModelProperties`, `DeleteDbModelProperties`, `AddDbModelRelation`,
`RemoveDbModelRelation`). A `JavaScriptFunction` node that calls `Noodl.Records.create / save / delete` is not one of
them, so the flag is false.

Measured on the training product's 27 functions (2026-10-20): **0 record nodes in any function**; all record access is
in 40 `JavaScriptFunction` nodes (17 `Records.query`, 11 `.save`, 6 `.create`) and six shared helpers. `GET /health`
reports `writesRecords: false` for every one of the 27. At least eight create rows by a literal collection name
(`copyLesson`, `finishStep`, `openThread`, `openThreadAsCoach`, `publishLesson`, `replyAsCoach`, `saveLessonDraft`,
`sendMessage`; `stranger/facts.mjs` in P124 counts them) and seven more call `Records.save` on a row held in a
variable. One of them, `unsubscribe`, is `call: public`: a public function that writes, which DEF-009's default
exists to catch, read as read-only.

**Why it matters:** DEF-009 AC4 decides the public-write default and the deploy interlock on this flag ("which endpoints
the public-write default applies to"), and `/admin/permissions/functions` shows it to the person. A function that
writes from code is treated as read-only by both. Any canvas that draws "what this function writes" from the backend
draws nothing for this whole app (P124 README §2, §5.2).

**Fix shape:** read the script nodes too (`parameters.functionScript` for `Records.(create|save|delete|increment|addRelation|removeRelation)\(`),
and say `writesRecords: "maybe"` where a call's collection is a variable; or record the truth per run (the data door
already receives the run's id through `FunctionRuns`) and let the static flag become a hint.

**Fixed (Beta sweep s5, 2026-10-25), the first fix shape.** `graphWritesRecords` also answers true for a node whose
`functionScript` calls a writing `Records` member (`create`, `save`, `delete`, `increment`, `addRelation`,
`removeRelation`), read by its text. The editor's door (`publicWriteDoor.ts`) reads the same list, a second copy held
equal by the DEF-009 parity spec beside the node-type list, and names the call ("writes records (a script calls
Records.save)"). Generous on purpose: a call in a comment counts (the default applies, the safe direction); a call
through an alias is not seen. The `"maybe"` value was not needed: the collection is not what decides the default.

Measured on `templates/digital-bricks-training`: **8 of 27** functions now read as writing (0 before), the public
`unsubscribe` among them. The other four the row names (`openThread`, `openThreadAsCoach`, `replyAsCoach`,
`sendMessage`) write only through the shared `/#__cloud__/shared/Thread` component: the per-graph limit both sides
document, now with a measured instance, filed as P124-S1-WRITESHELPER.

**Graded.** DEF-009 16/16 with two new arms (a public script writer is refused at its 31st call with "60/min" and
"burst 30"; every member is a write, a `query` script is not, spacing and nesting read) and the script list in the
parity check; the mutant without the script check red 2/16. The editor's door spec 14/14 (a script writer fires and is
named, a reading script is silent). Backend specs reading the flag 62/62, editor validator specs 371/371, backend and
`noodl-mcp` tsc clean.
