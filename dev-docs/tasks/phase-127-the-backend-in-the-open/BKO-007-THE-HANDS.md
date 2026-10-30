# BKO-007 — The hands: change the backend by dragging on the map

**Phase:** [127](README.md). **Depends on:** BKO-001 (the files are the truth), BKO-003 (any app), BKO-005 (triggers on
the map). **State:** built 2026-10-30 (s1), AC1–AC8 measured; **AC9 waits on the publish** (Studio pins
`@nodegx/backend-map` 0.1.4 from npm; 0.1.5 carries this and the light look, unpublished: Richard's OTP). **Lives in:** `@nodegx/backend-map`
(`dev-docs/tasks/phase-124-the-mystery-of-the-backend/editor/`), so Studio's Backend map tab gets it with a version bump.

## Where it comes from

P124's README §3.4 promised two halves: *"I can explain all of this"* (built: the map, the person lens, the row reach)
and *"you can take control"*: *"the grant is a drag and the backend obeys it."* The second half was never built. On
2026-10-21 the "drag a person onto a table" sentence was taken off nodegx.io because it wasn't true. Today a rule
changes in the table panel (`/api/table-rule` → `lib/rules.mjs` `setTableRule`, which already writes the backend and
`nodegx.security.json` together and puts the backend back if the file fails). A drag on the canvas only pans it. The
map draws triggers but can't make one.

## What it becomes

1. **Grant by dragging.** Drag a *who* card onto a table: Anyone, Signed in, a role, or *the person who made the row*.
   A chooser sits on the new wire: **See** / **Change** (`entryFor`'s `read` / `change`, and `creatorOwns` for the
   last card). It goes through `setTableRule`, so both places change or neither does.
   - Rules are per audience, not per person. Dragging **Marie** onto a table therefore says what it really does
     before it does it: *"Marie is a learner. This lets every learner see Lesson."* The chooser offers the narrower
     *"only the rows Marie made"* when the table has a creator column.
   - A wire that opens a table to Anyone asks once, in words: *"Anyone on the internet could see every row of
     Lesson."*
2. **Revoke by cutting.** Pick the wire and press Cut (or Delete). The table goes back to the standard rule
   (`setTableRule(…, null)`), in both places.
3. **Drop a function on a table to make a trigger.** A row-change trigger appears on the table, with three ticks:
   *created*, *changed*, *deleted*. It's `POST /admin/triggers` (`type: 'db-change'`) **and** an entry in
   `nodegx.automations.json`, in the project's shape (`nodegx-backend/src/automations/shape.ts`). The map has no
   trigger writer yet. Write one beside `setTableRule` with the same rules: refuse on a stale `etag`/file stamp, roll
   back if the file write fails. Don't add a fourth copy by hand. Read noodl-mcp's `backend/projectFiles.ts` and
   Studio's `editor/automations.mjs` first, and copy their entry shape exactly (BKO-008 makes it one module).
4. **Drop a clock on a function to make a schedule.** The words and the next runs come from the backend
   (`POST /admin/triggers/preview`). The map makes up no sentence about time.
5. **Every gesture says what it did in one sentence and offers Undo.** Undo is the reverse write through the same
   path. This is the canon's hold applied to the map: the person can always take a change back.

The person lens and the row reach re-measure after each change. A grant that makes *Who sees how much?* move is the
point of the demo.

## Acceptance (every check reads the backend or the files, never the canvas)

1. A drag from *Signed in* onto a table: `/admin/permissions` and `nodegx.security.json` both hold the same entry.
   `/admin/permissions/check` lets a signed-in person in and keeps *not signed in* out.
2. A cut: both places fall back to the standard rule, and the dry run agrees.
3. A function dropped on a table: `/admin/triggers` lists the trigger, the file holds it, and creating a row makes a
   run of the function appear in `/executions` within 3 s. `get_project_info` reports no drift between the file and
   the backend (BKO-001 AC6). `what_changed_since` lists the trigger.
4. A clock dropped on a function: the same three checks, with the backend's own `scheduleWords` on the card.
5. A change made elsewhere since the map opened (the file edited by hand; the rule changed on `/_admin`): the gesture
   is refused in words, and nothing changes in either place.
6. Undo of each of 1–4 leaves both places byte-identical to before the gesture.
7. The project folder is otherwise byte-identical (`test/copies.mjs`).
8. A control that must fail: a writer that skips the file. Check 1 has to go red and name the file.
9. In Studio's Backend map tab, one of 1–4 driven end to end after the package is bumped and pinned.

**Gate:** `test/hands.test.mjs` on a fresh copy of the todo template and a fresh backend, plus one `any-app` project
(`test/any-app.test.mjs`'s fixtures). The suite runs `nice -n 19` and goes through the HEAVY lock.

## Not in it

- Editing a function's graph or a workflow's steps from the map. Those stay in their own editors (P124 §3.5).
- A per-person grant. The backend has no per-user rule, only audiences and *the row's creator*. The chooser says so.
- The pulse along function → table wires from a real run. That needs the backend to record what a run touched (P124
  §5.1); it's a later row.
- Publishing the package: that's Richard's OTP.

## Session log

### s1 (2026-10-30): built in the map, graded on a copy with its whole world and in Chrome

**As built.**
- `public/words.js`: the rule changes as pure functions, shared by the page (its preview sentence) and the server (the
  write). `grantRule` adds a who and drops one it now covers (anyone signed in covers a group); `cutRule` takes out
  only the who the rule names; `namedWhos` lists who a rule names; `handEntry` gives the table's entry after a gesture,
  or `null` when that is the app's standard rule again (so a cut removes the table's own entry instead of writing a
  copy of the defaults).
- `lib/hands.mjs`: the gestures. A rule goes through `setTableRule` (both places, refusal on a stale etag or file
  stamp, the backend put back if the file fails). A trigger is new: `POST /admin/triggers`, then the entry in
  `nodegx.automations.json` in the project's shape (`projectTrigger`, key for key `automations/shape.ts`, sorted by id
  as noodl-mcp's `patchAutomations` writes it); the backend's copy is deleted again if the file can't be written. Ids
  are words (`signal-create-runs-acceptprivacy`, `schedule-acceptprivacy`), never one the backend or the file has.
  A schedule is read by the backend's own `/admin/triggers/preview` before it is made. A webhook is never removed by
  the map (its secret can't come back on undo).
- **Undo** is kept on the server, per gesture: what the backend and the file held before, and what the gesture left.
  It refuses when either place no longer holds what the gesture left. **It compares content, not the file's stamp:**
  the first cut compared stamps, and undoing a cut and then the grant before it was refused, because the cut's undo
  wrote the same text back and moved the mtime.
- `server.mjs`: `/api/hand/rule`, `/api/hand/trigger`, `/api/hand/trigger-remove`, `/api/hand/schedule`,
  `/api/hand/undo`; `automationsStamp` on the map. Every gesture forgets the reach's 15 s world cache, so a person
  looked at again is measured on the new rule.
- `public/app.js`: a **Who** column (anyone at all, anyone signed in, each group, whoever made the row) drawn only
  against a live backend, never a recording. A drag that starts on a who, a real person or a function pulls a wire
  (a drag anywhere else still pans). A drop opens a card that says what it will do before it does it. Who→table wires
  appear with a who or a table in focus, labelled *sees* / *changes*; a click offers **Cut it** (Delete works too).
  The 🕘 clock is dragged out of the hint bar. A trigger's panel has **Stop it running by itself**. The toast carries
  **Undo** for 12 s. A real person dragged onto a table says it means their group (or anyone signed in) or only the
  rows they made: the backend has no per-person rule.

**Graded.**
- `test/hands.test.mjs` (a training copy, its world seeded: 27 tables, 12 people, deployed functions): through the
  page's own requests, every check reading `/admin/permissions`, `/admin/permissions/check`, `/admin/triggers`,
  `/executions` and the files. Grant → both places agree, the dry run lets a signed-in person look and not add;
  cut → the standard rule in both, the rules file byte-identical; undo of cut then grant → byte-identical; the
  maker; anyone at all refused without saying it twice; stale etag / stamp / automations stamp refused with nothing
  changed; a function dropped on Signal → `/admin/triggers` lists it, the file's entry equals `projectTrigger` of
  the backend's, **a row made in Signal ran the function 4 ms later**; an unreadable cron refused in the backend's
  words; the schedule with `scheduleWords` in both places; remove and its undo; a webhook refused; an undo after an
  outside write refused, then allowed once the text is back; **the copy's every file byte-identical at the end**;
  **the control** (a writer whose file write does nothing) turns the check red and names `nodegx.security.json`.
- `test/hands-ui.test.mjs` (Chrome, real mouse drags): 31/31. The chooser, Make it so, the toast's Undo, the wire
  clicked and cut with Delete, Undo putting the grant back, a real person's chooser, Escape changing nothing, a
  function onto Signal, the clock onto a function (an unreadable cron disables Make it so), Stop it running by
  itself, no page error, and only the two files the gestures write changed in the folder. Pictures:
  `test/.work/hands-ui-*/bko-007-0[1-7]-*.png`.
- Both are in `npm test` (`test/run-all.mjs`).

**Not measured.** AC3's drift half was graded by putting both sides through the drift check's own normalisation,
not by calling the agent's `get_project_info` / `what_changed_since` (noodl-mcp reads the same file; not driven).
AC9 (inside Studio) waits on 0.1.5's publish and Studio's pin; Studio mounts the package's handler for every
`/backend-map/*` request, POSTs included (`editor/serve.mjs:702`), so no Studio change is expected. The map inside a
conversation (BKO-002's src-less frame) was not driven with the hands.
