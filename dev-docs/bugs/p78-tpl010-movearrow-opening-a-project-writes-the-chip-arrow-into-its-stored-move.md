---
id: P78-TPL010-MOVEARROW
title: Opening a project in the planner adds another "→ " (or "✓ Wed 30 · ") to its stored next move, every time
status: fixed
phase: P109
task: ISL-046
severity: high
area: template / planning (Logic/Card rows → Week/Project group For Each), runtime / For Each + Model
found: P78 TPL-010, user report from the hosted planner, 2026-10-05 (read-only trace, not driven)
regression: packages/noodl-mcp/tests/tpl010Template.test.ts (§4 MOVEARROW: four list checks with arms, the runtime consequence with two arms, the save guard)
evidence: templates/planning/components/Logic/Card rows/nodes.json node kdWork, script lines 207 and 212; templates/planning/components/Week/Project group/nodes.json node pgEach; packages/noodl-runtime/src/collection.ts `keptApart` and `set`; packages/noodl-runtime/src/model.ts `Model.create`
---

In the "Moves by urgency" strip, each project's next move gets one more prefix every time the project is opened and
closed. Saving the project writes the prefixes to the backend. Seen on the hosted planner: "Linguaid Training → → Find
out from Joss…" and "Ade work with Clarion ✓ Wed 30 · ✓ Wed 30 · ✓ Wed…". The strip only shows the stored text. The
text is damaged in the data itself.

**Cause: the projects card's display rows reuse the Project record's id.** In `Logic/Card rows`, node `kdWork`
("Group them, then open one") builds one row per project for the list in the card:

```js
rows.push({
  id: proj.id,                                                        // script line 207
  ...
  move: live ? '✓ ' + shortDay(live.date) + ' · ' + (proj.move || '') // script line 212
             : (late ? '! ' : '→ ') + (proj.move || ''),
  ...
});
```

Those rows travel `kdWork.out-groups` → `Pages/Week` `twCardRows.groups` → `twCard.groups` → `Week/Project card`
`pcEach.items` → each group's `rows` → `Week/Project group` `pgEach.items` (template `/Week/Project list row`). A For
Each turns each plain row into a Noodl Object with `Model.create(row)` (`collection.ts` `set`). `Model.create` calls
`Model.get(row.id)` and writes every field of the row onto that record (`model.ts` `Model.create`). `row.id` is the
Project's `objectId`, and the Project query (`Logic/Planning data`, `pnProjects`, a DbCollection2 on `Project`) holds
its records as `Model.get(objectId)` (`api/cloudstore.js` `_fromJSON`). So the row and the Project are the same
record. Converting the row sets `Project.move` to the decorated text, along with `hoursText`, `moveColor`, `mark`,
`barWidth`, `barRest` and `rowBackground`.

ISL-003's guard (`Collection.keepPlainRowsApart`, which the For Each opts into) does not stop this. `keptApart` keeps
a row apart only when another plain list owns the id. A record that came from a query has no owner
(`plainRowOwner.get(shared) === undefined`), so the row writes onto the shared record, as before ISL-003. That is the
ruled behaviour ("a single list behaves as before").

**Why it grows by one each time.** Opening a project sets `twVarCard`. Closing the card clears it (`twCard.close →
twClearCard`). Both changes reach `kdWork.in-selectedId`, so the script runs again. It reads `proj.move` from the record
it already decorated and makes new row objects. New objects miss F50's per-object cache, so `Model.create` runs again
and writes one more prefix: `→ X` → `→ → X`, and `✓ Wed 30 · X` → `✓ Wed 30 · ✓ Wed 30 · X`.

**How the backend gets it.** The editor is not reading the row's display field. `Pages/Week` `twEditRow` prefills from
the project record (`var src = … p` at script line 180, `Outputs.move = str(src.move)` at line 184). That record is
already decorated, so the form shows the prefixes. On save, `Commands/Edit project` `EditprojecGuard.out-move` →
`EditprojecWrite.prop-move` (SetDbModelProperties, store "Only specified") writes them to the Project row. The other
row fields (`hoursText`, `mark`…) are not saved, because only the specified properties are stored. The same polluted
`one.move` also becomes `sendTitle` (`kdWork` line 280 → `twCardRows.sendTitle → cmdSendTodo.title`). So "Send to
todo" makes a task named "→ Find out from Joss…", and the `inTodo` match (line 270-275) compares against the
decorated words.

**The chip adds no arrow.** `Logic/Moves` `mvWork` puts the raw `p2.move` into the chip row (`move: p2.move || ''`).
`Week/Move chip` wires `mcIn.move → mcWhat.text` and nothing else. The chip CSS in `App` (`.planner-chip-what`) has no
`::before` content. The ✓ day the chip shows itself is a separate Text (`mcTick`, `tick: '✓ ' + day`). Every arrow in
the strip comes from the stored value. The strip's rows use `projectId`, not `id`, so they do not touch the record.

**Reproduce (from the trace, not driven):** load the planner with a project whose move is `X` and that has no move
block. Open the projects card and pick the project, then close it. Read `Noodl.Object.get(<projectId>).move`: it reads
`→ → X` (one prefix per `kdWork` run with the card's For Each mounted). Edit and save the project, reload, and the
strip shows `→ → X`.

**Fix (small).**
1. `Logic/Card rows` `kdWork`: stop giving the row the record's id. Write `projectId: proj.id`, with no `id` or a
   non-colliding one (`'card:' + proj.id`). In `Week/Project list row`, add a `projectId` input and wire
   `prIn.projectId → prOut.id`, so `pgOut.id → pcOut.projectId` still carries the project id. Putting the display text
   in its own field (`moveText`) as well makes the display field and the data field different names.
2. Same family, latent: `Logic/Day columns` `dlWork` (`id: blk.id`, script line 176) and `Logic/Shutdown` `suWork`
   (`id: cb.id`, line 206) write their display fields onto the Block records (`projectName`, `hoursText`, `mark`,
   `done: !!blk.done`…). None of these is a stored field with a different meaning today, so nothing is damaged yet.
   Apply the same change.
3. Belt and braces: `Commands/Edit project` `EditprojecGuard` strips leading display prefixes from `Inputs.move` before
   it writes.
4. **A one-time clean-up of the stored data, which is already damaged.** Strip repeated leading prefixes from every
   `Project.move`:
   `/^(?:(?:→|!) |✓ (?:Mon|Tue|Wed|Thu|Fri|Sat|Sun) \d{1,2} · )+/u` → `''`. Do the same for open todo tasks whose title
   was sent with a prefix. If this runs as an on-load migration in `Logic/Planning data`, it needs its own save,
   because loading alone does not write anything back.

**Severity: high.** The planner's main data field is corrupted. It gets worse every time the card is opened, it is
persisted on any project save, and it spreads into the linked todo list. The original words survive under the
prefixes, which is why this is high rather than blocker: step 4 can recover them.

Runtime note: a plain row in a For Each that reuses the id of a record from a query still writes onto that record,
silently. ISL-003 left this as it was on purpose. A diagnostic ("a list row is writing different values onto a
record that a query owns") would have named this bug the first time it happened. That diagnostic is a separate
decision and is not part of this fix.

## 2026-10-05 — Planning set aside (TPL-008-PJ)

Richard set Planning aside the same day and its three useful parts moved into the todo list as a Projects tab
([TPL-008-PJ](../tasks/phase-78-the-templates/TPL-008-PJ-THE-PROJECTS-TAB.md)). There:

- the carry-over (`PROJECTS_CARRY_SCRIPT`) takes these prefixes off every stored `Project.move` and every open task
  title, with the regex in this file, before the move becomes a task — so the damaged data is repaired on first open;
- the tab's rows are `pj-<id>`, never a record's id — `tpl008Template.test.ts` §7 *"no row the tab draws carries a
  record's id"*, shown red by setting the prefix to `''`.

**Still open:** `templates/planning` itself is unchanged. Fix it (rows carry `projectId`, not `id`) if Planning is ever
brought back. The runtime warning suggested above is still a separate decision.

## s45 (2026-10-11): ruled "Fix the old planner now", and fixed

Asked a third time, in plain words, with the cost (half a day) and the fact that the todo list's Projects tab already
strips the prefixes. Richard chose **fix it now**.

**Run, not traced, for the first time.** `tpl010Template.test.ts` runs the card's script twice over a project the
runtime's `Model` holds and sets its rows into one runtime `Collection` with `keepPlainRowsApart` (what a For Each does
with its items). With the row wearing the project's id and its words in `move`, the project's move reads
`→ → Offer the add-on`: the field report, reproduced. Fixed, it reads `Offer the add-on` and gains no field.

**Fix** (in the generator, `tpl010Components.ts`; both `templates/planning` and `templates/planning-demo` regenerated,
28 files, only these components):

1. The project card's rows (`Logic/Card rows` `kdWork`): `id: 'card:' + proj.id`, the project's id in `projectId`, the
   decorated words in `moveText`. `Week/Project list row` takes `projectId` and `moveText`; `prIn.projectId → prOut.id`,
   so the card still hands on the project's id.
2. The same family: the day columns (`dlWork`, `id: 'day:' + blk.id`, `blockId`), the shutdown's carry list (`suWork`,
   `id: 'carry:' + cb.id`, `blockId`), and one the bug did not list, found by a census of every row the generator builds:
   the block sheet's next actions (`twSheetRow` `actionRows`, `id: 'pick:' + act.id`, `actionId`). It wore the todo
   action's id and wrote `label`, `ink` and `edge` onto the action record. Each row component sends the record's id on
   as before (`bkIn.blockId`, `crIn.blockId`, `apIn.actionId` → `…Out.id`).
3. The project guard (`PROJECT_GUARD`, used by both Add project and Edit project) takes the arrows and days off a move
   before it is saved, with this file's regex. A move with an arrow in its middle is kept.
4. **Not built: the one-time clean-up of the store.** The todo list's carry-over (TPL-008-PJ, `PROJECTS_CARRY_SCRIPT`)
   moves every project's move into a task and empties `Project.move` on the same backend, so a planner brought back
   finds no damaged move to clean. A move typed back in with the old prefixes is cleaned by step 3 when saved.

**Gates:** `tpl010Template.test.ts` 101/101; the four list checks each with a mutant arm (the row's id put back to the
record's: every row collides); the consequence test with two arms (id alone: the row's `hoursText` lands on the
project; id and `move`: `→ → `); the guard on four moves. `editorSuite` and `tpl008Template` green beside it.
Not driven on a deployed planner (it needs its backend); `planning-demo` on nodegx.io is not republished.
