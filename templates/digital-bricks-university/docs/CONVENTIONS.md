# Conventions

## How this file is used

The rules below are read by the assistant on **every authoring turn**, and they
outrank its own defaults. Editing this file changes what gets built.

Write rules that are checkable. "Make it nice" is not a rule; "every page's
outermost node is a Group named `Page Root`" is.

## Structure (DBU-00)

- Every signed-in page is a `Page` node whose one child is a `/Shell/App shell` instance. The page sets
  `coach` (true on coach pages) and `current` (the tab id), and puts its content inside the instance:
  `/Shell/Page head` first, then the page's sections.
- Pages go under `Pages/`. Pieces the shell owns go under `Shell/`. Fixed lists go under `Option sets/`.
  Page URLs: learner pages at the root (`/home`, `/homework`, `/creations`, `/messages`), coach pages under
  `/coach/…`, and `/sign-in`.
- The tabs are `Option sets/Learner tabs` and `Option sets/Coach tabs`. Add a tab there, never in a page.
- An empty list says what will appear and when, with `/Shell/Empty state`. It never renders nothing.

## Words (DBU-02)

- No word a person reads is typed into a page or part. It lives in `Strings` (Language Bundle `common` for
  the shell, `pages` for pages) under a key, and the node shows it through a `Translation` node.
- `Shell/Page head` takes `titleKey` and `leadKey`; `Shell/Empty state` takes `titleKey` and `bodyKey`; tab rows
  carry `labelKey`. Pass keys to them, never text. A page's browser-tab title is a Translation of `<page>.tab`.
- A value inside a sentence is a single-brace tag in the string (`Welcome, {name}`), filled by a `String Format`
  node or the page's own function. Never i18next's `{{name}}`: it HTML-escapes an apostrophe.
- The validator's `typed-word-not-translated` warning is a real finding here. Fix it, don't ignore it.
- The coach's name is never typed into a word (DBU-11). Write `$t(coachName)` mid-sentence and `$t(coachNameStart)`
  at the start of one; the coach sets the name in Settings, App reads it once a visit (the public `coachName`
  function) and adds it to both bundles. i18next looks a nested `$t()` up in the DEFAULT namespace (`common`), so the
  two keys live there, whichever bundle the word is in. Without a name they read "your coach" / "Your coach". No
  he/she for the coach either: "what they think".

## Who may see what (DBU-02)

- Where a person may go is decided once, by the gate in `App` (lists of public and coach pages). A new coach
  page goes in its `COACH` list; no page checks the role itself.
- Who is staff is the backend's `staff` role from the User node's `roles`, never an address. `roles`
  undefined means "not known yet": wait, don't guess.
- A function that saves runs once per press; the runtime ignores a second press within half a second of the
  answer. Drive tests wait a beat before pressing again.

## Text people write (DBU-03)

- A brief (and any text a coach or learner writes with formatting) is Markdown, and is shown only through
  `/Shell/Formatted text`, whose Markdown node has **Allow HTML off**. Never a Markdown node with it on, and never
  HTML built by hand.
- No graph parameter may contain the text `</script>`: the preview harness inlines the project in a `<script>` tag and
  the app stops loading (PLATFORM.md D6).
- A list the person edits row by row keeps its rows in a named Array; each row writes its own record with For Each
  Actions → Set Object Properties, **one Set Object Properties node per field**. Library/Checklist editor is the model.

## Plans and lists (DBU-04)

- A value a Function sends is re-sent only when it changes, unless the same run fires a signal. A Function that feeds a
  shared input fires a signal (`Outputs.go()`) in the same run; where several sources write one sentence on a page,
  each source gets its own line.
- A component's own state is a Component Object. Wire its ports by their runtime names: `value-<p>` on Component
  Object, `prop-<p>` on Set Component Object Properties (PLATFORM.md D7).
- Rows a test must find carry `data-testid` (Plan/Step row: `step-<id>`), set through Data Attributes.
- A coach's time is typed and shown in Europe/Paris; a function stores ISO and reads `YYYY-MM-DDTHH:MM` back in Paris.

## A page worked out on the server (DBU-05)

- A page with real logic (what is up next, what counts as done) gets one function that answers with the decisions,
  and the page only draws them (`learnerHome` for Home). A client-side "in words" component then turns the answer into
  Strings **keys plus the values for their {tags}**; each part fills its own sentence with Translation → String Format.
  So the shaping Function needs no Translation nodes, and every word stays in `Strings`.
- Times a learner reads are shown in their profile's `timezone`, else the browser's; times a coach reads in Europe/Paris.
- Every tap target is at least 44px tall (`var(--space-11)`, the Button element style's minHeight). Don't set a smaller
  `minHeight` on a button that a learner may press on a phone.

## Files people hand in or open (DBU-06)

- A stored file is shown or downloaded only through `Work/File viewer` (mode `own`, `coach` or `resource`). Never put a
  raw `/files/…` address in a link, an image or a frame by hand: the viewer mints a 5-minute link through the function
  that checks who may have it, shows HTML only in a `sandbox="allow-scripts"` frame, and downloads under the file's own name.
- What may be handed in is `Option sets/Hand-in kinds` on the page and `handIn`'s list on the server; change both together.
- A file version carries 1 to 5 files (`Submission.files`, `[{file, fileName}]`), reviewed as one. The limit lives in
  `Homework/Hand in` (its Script node) and in `handIn`; change both together.
- A page that reads a query parameter, and can be reached again while it is open, is linked to with that parameter present
  even when empty (`/homework?step=`): an absent one is never cleared (PLATFORM.md D9).

## My creations (DBU-09)

- A creation is written only by `saveCreation`, `deleteCreation` and `handIn` (`addToCreations`). A creation from a
  hand-in points at the `Submission`; never copy its files or text into the creation.
- The file kinds a creation may hold are the hand-in list: `Option sets/Hand-in kinds`, `handIn`'s TYPES and
  `saveCreation`'s TYPES. Change all three together.
- A `Static Data` row is a Model named by its id for the whole app, and `get('id')` on it answers nothing: give option
  set rows a prefixed id (`ck-document`) and carry the value itself in its own field (`kind`).

## Check-ins (DBU-10)

- Check-in forms are defined only in `__cloud__/shared/Checkin forms`. A new form or question is a change there (bump
  the form's `version`); never a form inside a page or a fixture.
- A question's `id` is forever: it is the key of every answer ever given. Reword the label, or drop the question and
  add one with a new id; never reuse or rename an id.
- Which questions are asked is decided in three places that must agree: `answerCheckin` (the authority),
  `Checkin/Form` (which rows show) and `Checkin/Answers` (which unanswered rows read "No answer"). Change them together,
  and `tools/check-checkins.mjs` with them.
- `Option sets/Check-in forms` names the forms in the editor; each row's `value` must be a form id in the helper.
- Read answers against `CheckinResponse.form`, never against today's form.

## The demo (DBU-11)

- The demo is generated. Change the template, then `node tools/build-demo.mjs`; never edit `../demo/`.
- A cloud function may use only what the demo engine plays: `Noodl.Records` (query, count, fetch, create, save
  with `ifMatch`, delete), the request/response/function/component/user/role nodes, `_noodl_send_email`,
  `_noodl_get_secret`, and `fetch` only to the backend's own `/files/<name>/sign`. Anything else fails
  `build-demo` (an unknown node) or a step of `drive-demo`; teach `tools/demo/engine.js` first.
- A mail's result is `{ success }`; read that, not `ok`.
- Words in `Demo/` components are in Strings under `demo.*` like any other; nothing outside `Demo/` may read
  `window.dbuDemo`.
- A new flow worth showing gets a step in `tools/drive-demo.mjs`.

## Naming

- Component names are words a person would use ("Page head", "Empty state"). Node labels say what the
  node is *for*.

## Styling

- Product colours have named tokens: step kinds `--live-*`, `--homework-*`, `--checkin-*`; statuses
  `--done-*` and `--waiting-*`; file badges `--file-<kind>-bg/fg`; `--coach-badge`, `--attention`.
  Use these rather than the raw palette scale.
- `--border-control` is #9CA3AF, darker than the mockup's #D1D5DB, so a control's edge has about 3:1
  contrast against white. `--border` stays #E5E7EB for card hairlines.
- Buttons and text inputs get their look from the project's element styles. Set a parameter on a
  node only where that node is different.

## Data

- A Static Data row is a Model: read its id with `getId()`, not `get('id')` (that returned undefined
  and left every tab unmarked in DBU-00).
- Messages and their mail (DBU-07): every message is saved by `sendMessage` or `replyAsCoach` and mailed only by
  `shared/Message mail`; nothing else sends message mail. A new kind of notification goes through the same
  pending → hold → flush shape, never a database trigger.
- What waits for the coach (DBU-08) is decided only in `__cloud__/shared/Inbox items`; a new kind of inbox item is a
  rule there, not a field other functions keep in step. Anything time-based ("gone quiet") is decided by the daily
  `morningRound`, never when a page loads, and must be safe to run twice.

## What not to do

- Don't hard-code a coach email address anywhere in the graph. Staff is a backend role.

## Established during scoping

- Every colour, spacing, radius and font parameter is var(--token); no raw hex or px in any component parameter.
- The look is the mockup: Inter, ground #F9FAFB, white cards with a #E5E7EB border and radius 14, one indigo accent #4F46E5. Plain, pedagogy first, no showing off.
- Plain words on screen. Empty states say what will appear and when, in a sentence.
- Clients never read or write a collection directly: every read and write goes through a role-checked cloud function (nodegx.security.json closes everything else).
- Who is the coach is the backend's staff role, never an email address in the graph.
- Learners never see a Step that is not shared.
- Learner pages sit inside the learner shell (Home, Homework, My creations, Messages); coach pages sit inside the coach shell (COACH badge; Learners, Inbox, Plan templates, Homework library).

_Source: `docs/decisions/000-initial-scope.md`._
