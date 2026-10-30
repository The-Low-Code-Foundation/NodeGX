---
id: P123-STU-TWOSHAPES
title: Studio read a declared rule for values in one of the two shapes a project file holds, so a Choice the editor cached was never set on the backend and read as Text
status: fixed
commit: nodegx-studio be3a9c5
severity: medium
regression: ../nodegx-studio/editor/shapes-check.mjs "Data types reads it as a Choice with its values"
area: nodegx-studio `editor/studio.html` allTypes (`declared….checks?.map((rule) => ({ rule, declared: true }))`, :5341) and the field edits that filter `r.field` (:5609, :5637, :5655)
found: fixing P123-MCP-RULESERASED, 2026-10-30
evidence: read only. Studio writes `dbCollections[].checks` as the rule itself (`{ field, oneOf }`); the NodeGX editor's schema cache (`decideSchemaCache`) and provision_backend's write-back store the backend's entry (`{ name, rule, description, built, declared }`). Studio wraps every entry as `{ rule: entry, declared: true }`, so a backend-shaped entry's field is `rule.rule.field`
---

Reached only when the backend is not running (with it up, Studio reads the live table's rules, which are right), on a
project whose rules were last written by the NodeGX editor or by `provision_backend`. Expected: Data types shows the
Choice as Text, and editing that field in the drawer keeps a stale entry beside the new one. Not driven. To measure:
copy a project, write a backend-shaped `checks` entry into `dbCollections`, open it in Studio with no backend, and read
the field's kind in Data types. The fix would be one normaliser (`c.rule ?? c`, dropping `declared: false`) where Studio
reads declared rules. NodeGX's own `declaredCollections` already reads both (P123-MCP-RULESERASED).

## 2026-10-30: measured, wider than written, fixed

Driven on two copies of `templates/todo-list` declaring `Task.status` a Choice (open, done), one in each shape
(`editor/shapes-check.mjs` is that drive, kept as a gate). At nodegx-studio 500cad0, the backend's shape:
- **Start a backend was refused**: `Task's rules for its values were not set on the backend (checks[0]: expected
  { "exactlyOne": [...] } …)`. `lib/backend.mjs` pushDeclaredRules sent the backend's entries back to `setChecks`
  as if they were rules. The backend got `[]`, so it took any value for status.
- **Data types read status as Text** (`status | Aa Text String |  |`), with no backend and with one running (the
  running one had no rule, so the declared one was read, wrongly), and its drawer opened as Text.
- Studio's shape, the control: Choice, `open, done`, rule set.

So the row's "only with no backend" was wrong: on a project whose file holds the backend's shape, the Choice is never
enforced. Severity medium.

Fixed: one reader, `declaredRules` in `editor/data.mjs` (the rule out of a backend entry, its `declared: false` drift
dropped; NodeGX's provision reads them the same way), used by every place Studio reads a declared rule: allTypes,
the Choice of a record's input port, "make it on the backend", a new field's merge, a field's edit and delete, and
`lib/backend.mjs` pushDeclaredRules. A write leaves the file in Studio's shape. check:shapes 15/15: both shapes set
the rule on Start a backend, read as a Choice, and adding a value leaves the file `[{ field: 'status', oneOf: ['open',
'done', 'later'] }]` with the backend the same.
