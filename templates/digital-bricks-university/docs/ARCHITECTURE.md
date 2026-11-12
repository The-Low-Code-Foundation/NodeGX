# Architecture

## Page map

- **Sign in** (`Pages/Sign in`) — Email magic-link sign-in. No public sign-up; the coach adds learners. `?email=` fills in the address (the welcome email links here).
- **Not found** (`Pages/Not found`) — What anyone sees at an address that is not a page they can open, including a learner at a coach URL.
- **Home** (`Pages/Home`) — Learner home: up next, the programme timeline, progress X of N steps, latest from Richard, 'Stuck? Ask Richard', things you've made.
- **Homework** (`Pages/Homework`) — Learner: one homework step: brief, resources, your work and its versions, hand in by file, link or text, and its message thread.
- **My creations** (`Pages/My creations`) — Learner portfolio: anything they made, of any type, optionally saved from a hand-in.
- **Messages** (`Pages/Messages`) — Learner's general thread with Richard.
- **Learners** (`Pages/Learners`) — Coach: the roster; Open plan goes to the learner's plan.
- **Learner plan** (`Pages/Learner plan`, `/coach/plan?learner=<id>`) — Coach: one learner's plan builder (DBU-04).
- **Check-in** (`Pages/Check-in`, `/checkin?step=<id>`) — Learner: one check-in's questions, then her answers once sent (DBU-10).
- **Inbox** (`Pages/Inbox`) — Coach: every learner question, hand-in waiting for review, learner who has gone quiet, and answered check-in, in one list.
- **Plan templates** (`Pages/Plan templates`) — Coach: reusable plan shapes to start a learner's plan from; create, edit, archive.
- **Homework library** (`Pages/Homework library`) — Coach: reusable homework; adding one to a plan copies it.
- **Settings** (`Pages/Settings`) — Coach: notification address and email sender.

## Data model

### Plan

One learner's programme

Fields:
- learner
- title
- status (active, paused, finished)
- meetingLink
- bookingLink
- startedOn
- fromTemplate

### Step

One item in a plan: a live session, homework or a check-in

Fields:
- plan
- learner
- position
- kind (live, homework, checkin)
- title
- shared
- status
- startsAt
- durationMin
- attended
- recordingUrl
- summary
- dueAt
- brief
- handInChecklist
- resources
- fromLibraryItem
- form (a check-in's copy of its form: `{id, version, title, minutes, questions}`)
- sendsAt
- sendAfter (DBU-10: `{step, days}`, the check-in goes out N days after that step)
- sentAt (DBU-10: when the check-in went out)

### Submission

One version of a hand-in

Fields:
- step
- learner
- version
- kind (file, link, text)
- file
- url
- text
- note
- review (pending, approved, changes)
- reviewedAt

### Message

Learner-coach conversation, optionally attached to a homework

Fields:
- learner
- step
- author
- body
- attachments
- readAt
- settledAt (the coach marked the learner's newest message "No reply needed", DBU-08)

### Creation

Portfolio item

Fields:
- learner
- title
- kind
- file
- url
- text
- fileName
- madeWith
- description (DBU-09)
- fromStep
- submission
- usedInClass

A creation holds exactly one of: its own `file`, `url` or `text`, or a `submission` (then its content is that hand-in
version, read through `shared/Creations of`, never copied). `fromStep` is the homework it came from.

### LibraryItem

Reusable homework

Fields:
- title
- brief
- handInChecklist
- resources
- tags
- estimatedMinutes

### PlanTemplate

Reusable plan shape

Fields:
- title
- description
- items
- archived

### CheckinResponse

A learner's check-in answers

Fields:
- step
- learner
- answers (`{questionId: value}`)
- form (DBU-10: the questions as they were asked)
- seenAt (DBU-10: Richard pressed Done in the inbox)

### CoachNote

The coach's private notes on a learner

Fields:
- learner
- body

### QuietFlag

One learner gone quiet (DBU-08). Raised, updated and closed only by the daily `morningRound`

Fields:
- learner
- reasons (`{kind: 'inactive', lastActiveAt}`, `{kind: 'overdue', stepId, title, dueAt}`)
- raisedAt
- snoozedUntil
- nudgedAt
- closedAt

## Backend contracts

NodeGX backend. One-gate security: every collection closed to clients; every read and write goes through a role-checked cloud function (pattern copied from the digital-bricks-training template). The one exception is `Doorbell`, which a client may `find` (ACL-filtered) to know when to re-read.

- **Schema:** `backend/schema.json` (tables, and `enums`: the one owner of every status and kind value). Relations are String objectIds.
- **Security:** `nodegx.security.json`. Every function has a rule there; `tools/deploy-functions.mjs` refuses to finish if one does not.
- **Functions** (`components/__cloud__/`):

| Function | Rule | Does |
|---|---|---|
| `myPlan` | authenticated | The caller's plan, its **shared** steps, their own hand-ins, and `me` (their own name). No parameters: identity is the session. |
| `addLearner` | role:staff | `name, email, organisation?, templateId?`. A learner account (no password), an active plan (the template's items as **draft** steps, or empty), and a welcome email. A second press with the same address changes nothing and mails nothing; a coach's address is refused. |
| `roster` | role:staff | Every account in the `learner` role with their current plan and step counts, plus the plan templates (for the Add learner form). |
| `fileLink` | authenticated | A 5-minute signed path to one of the caller's own private files. |
| `learnerAsCoach` | role:staff | One learner: profile, plans, every step (shared or not), hand-ins, coach notes. |
| `reviewSubmission` | role:staff | Approve or ask for changes on the newest pending hand-in; moves the step, rings the learner's doorbell. |
| `fileLinkAsCoach` | role:staff | A 5-minute signed path to any private file. |
| `library` | role:staff | Every library item, archived ones flagged, sorted by title, in the editor's shapes (DBU-03). |
| `saveLibraryItem` | role:staff | Create (no `id`) or edit one item. Checks every field and refuses in a sentence: title required, links http(s) only, minutes a whole number, a resource file must be one the caller uploaded or already on the item. Never touches a step. |
| `duplicateLibraryItem` | role:staff | `id, title`: a copy under the new title, sharing the original's resource files; not archived. |
| `archiveLibraryItem` | role:staff | `id, archived`: hides an item from the plan pickers or brings it back. Nothing is deleted; no step changes. |
| `resourceLink` | authenticated | `stepId, file`: a 5-minute signed path to a coach's resource file, only if the step is the caller's, shared, homework, and lists that file. |
| `shared/Signed file link` | helper | Signs over loopback and returns the path only. |
| `addStep` | role:staff | `planId, kind, title, libraryItemId?, formId?`: a **draft** at the end; homework from the library is copied (R4); a check-in gets a copy of its form, "After a session" by default (DBU-10). |
| `saveStep` | role:staff | Edit one step's own-kind fields; times in Paris wall-clock; links http(s); a file must be on the step or the coach's own upload. A live session with a time is booked, without one to book. A check-in takes `formId` and either `sendsAt` or `sendAfterStep` + `sendAfterDays`; both are fixed once it is sent. Moving a step's date moves the check-ins that follow it. |
| `moveStep` | role:staff | `stepId, index` (its place among the others): renumbers the plan 1..n in one call, in two passes, retrying when two moves meet. |
| `removeStep` | role:staff | Removes a step and renumbers; refused if the learner has handed in, written or answered anything for it. |
| `shareSteps` | role:staff | `planId, shared, stepIds` or `allReady`: shares only steps that are ready (homework: brief + due date; check-in: a send date, or a step to follow); unsharing always works. Rings the doorbell. |
| `savePlan` | role:staff | Title, meeting link, booking link, status (active, paused, finished). |
| `applyTemplate` | role:staff | `planId, templateId`: appends the template's items as drafts (through `shared/Steps from template`); an empty plan takes its title and "started from". |
| `planTemplates` | role:staff | Every template with its items, archived ones flagged, and the library's titles. |
| `savePlanTemplate` | role:staff | Create or edit a template; keeps only kind, title, duration, library item and day per step. |
| `templateFromPlan` | role:staff | A new template from a plan's shape; days counted from the plan's start in Paris. Never the learner's data. |
| `archivePlanTemplate` | role:staff | Hides a template from the builder and Add learner, or brings it back. |
| `shared/Steps from template` | helper | `job: {planId, learnerId, templateId}` → the template's items as drafts after the plan's last step. Used by `addLearner` and `applyTemplate`. |
| `coachInbox` | role:staff | Everything waiting on the coach, oldest first (DBU-08); `countOnly` answers just the count (the Inbox tab). |
| `settleQuestion` | role:staff | `messageId`: "No reply needed" on a learner's newest message (`settledAt`, and read). Rings the staff's inbox bell. |
| `snoozeQuiet` | role:staff | `flagId, nudged?`: hides an open quiet flag for 7 days; `nudged` also stamps `nudgedAt`. Rings the inbox bell. |
| `morningRound` | nobody | The daily 07:00 Paris schedule (`nodegx.automations.json`): raises, refreshes and closes quiet flags, then sends the morning digest if anything is new. Safe to run twice. |
| `shared/Inbox items` | helper | The one owner of the inbox's rules: the items, and each learner's facts. Used by `coachInbox` and `morningRound`. |
| `myCheckin` | authenticated | `stepId`: one of the caller's own shared check-ins, its questions, and her answers if sent (DBU-10). |
| `answerCheckin` | authenticated | `stepId, answers`: checks every answer against the step's form (types, required, conditions), keeps only the asked ones, saves a `CheckinResponse` with the form copied, marks the step done. Once only; only after it is sent. |
| `settleCheckin` | role:staff | `responseId`: **Done** on an answered check-in in the inbox (`seenAt`). Rings the inbox bell. |
| `sendCheckins` | nobody | The hourly `send-checkins` trigger: claims each due check-in (`sentAt`), mails the link, reverts the claim if the mail fails. |
| `shared/Checkin forms` | helper | The three built-in forms as JSON, and the condition rules. |

- **Files:** uploaded private (`X-NodeGX-File-Private: true`); `files.read` is `nobody`, so every read is a signed path from a function.
- **Local demo:** `node tools/reset-demo.mjs` (backend on 127.0.0.1:8595, data in `~/.nodegx/dbu-demo`, Mailpit at 127.0.0.1:8028), then the gates `tools/check-seed.mjs` and `tools/check-security.mjs`. The world is `backend/fixtures/`, dated relative to today. The app: `node tools/serve-app.mjs` (http://127.0.0.1:8596, reloads as the project changes). `nodegx.project.json` points the pages at the backend (`metadata.cloudservices`).

## The homework library (DBU-03)

- **Shapes** (also a homework Step's, which copies them, SCOPE R4): `handInChecklist` is `[{text, required}]` (an
  older plain string reads as required); `resources` is `[{label, url}]` or `[{label, file, fileName}]`, where `file`
  is the stored name of a **private** upload by the coach; `archived` hides an item from the pickers.
- **The brief is Markdown, shown only through `Shell/Formatted text`**: the shelf's Markdown module with *Allow HTML*
  off. A tag typed into a brief shows as text; React refuses `javascript:` links. Nothing is sanitised on save, so
  every page that shows a brief must use this part.
- **Resource files reach a learner only through `resourceLink`**, from a shared homework step of hers that lists the
  file. `fileLink` (owner only) refuses them; the coach reads them with `fileLinkAsCoach`.
- **Editing lists in the browser:** the editor keeps the hand-in list and the resources in two named client-side
  Arrays (`library-draft-checklist`, `library-draft-resources`). Each row writes its own record as the coach types
  (For Each Actions → Set Object Properties); add, remove and reorder replace the Array; Save reads it back. One editor
  exists, so the app-wide names are safe.

## The plan builder (DBU-04)

- **Every change is a function, then a re-read.** The page calls one staff function per action and re-reads
  `learnerAsCoach`; nothing is moved or edited only in the browser. `Plan/Plan in words` turns the answer into rows and
  counts in the reader's words (Paris times, kinds and statuses from their option sets).
- **Drafts and sharing.** A new step is a draft (`shared: false`, dashed edge, Draft chip). Learners never see one;
  `shareSteps` refuses a step that is not ready.
- **Reorder.** Rows are `Draggable` Groups in an `Accept Drops` list; Drop Index goes straight to `moveStep`. The keyboard
  works the same way (Tab, Space, arrows, Enter). Dragging is off while a row's editor is open.
- **One editor open at a time** (`Plan/Step list` keeps the open step in its Component Object): the homework editor's
  two lists live in app-wide Arrays (`plan-draft-checklist`, `plan-draft-resources`), as the library editor's do.
- **Templates** are a plan's shape: `[{kind, title, durationMin (live), libraryItem (homework), dayOffset}]`. One helper,
  `shared/Steps from template`, turns them into steps for both `addLearner` and `applyTemplate`.
- **Calendar.** `Plan/Calendar links` builds the `.ics` in the browser (ported from the Hub's ics-generator) and opens
  Google Calendar's "add an event" address; neither names the coach.

## The way in (DBU-02)

- **Magic links only, no passwords, no public sign-up** (`signup: "nobody"` and `magicLink.allowSignup: false`, set by `tools/setup-signin.mjs`). The backend answers a known and an unknown address identically and mails only the known one; the page says the same sentence either way.
- **An app origin not on the backend's redirect allow-list gets no mail and no error.** Every origin the app is served from goes to `setup-signin.mjs --app-url` / `--app-origin`. The same tool sets the `appUrl` function secret, which `addLearner` uses for the welcome email's link.
- **The welcome email links to the sign-in page with the address filled in**, not to a magic link: a link lasts 15 minutes, and a welcome email is often read the next day.
- **One gate, in `App`:** signed out, every page but Sign in and Not found goes to Sign in; a learner on a coach page sees Not found; staff on a learner page go to Learners; a signed-in person on Sign in goes to their side. Who is staff is the backend's `staff` role, read from the User node, never an address. The gate decides what the browser draws; the functions decide what anyone reads.
- The backend allows **5 link requests per 15 minutes per IP**. `check-security.mjs` spends 2.

## The coach inbox (DBU-08)

- **One owner of the rules**, `shared/Inbox items`, so the page, the tab count and the digest never disagree. Only
  learners on an active plan count.
  - **To review:** the newest version of a handed-in homework is pending. It goes when Richard reviews it.
  - **Question:** the newest message in a conversation is the learner's and not settled. It goes when Richard replies
    or presses **No reply needed** (`settledAt`); opening the conversation (which marks it read) does not end it.
  - **Gone quiet:** an open `QuietFlag`, not snoozed, whose reason still holds. It goes at once when the learner does
    anything (her activity is the latest of `lastSeenAt`, a message, a hand-in or a check-in) or the overdue homework
    moves on; the next round closes the flag.
- **Gone quiet is decided once a day**, by `morningRound` (07:00 Paris, `run-once-on-start`), never when the page loads.
  The thresholds are one object in it: `QUIET = { inactiveDays: 7, overdueDays: 2 }`. Overdue counts only homework not
  started; work sent back for changes is already Richard's conversation. One open flag per learner.
- **Activity:** `myUnread`, which every learner page calls from the shell, stamps `_User.lastSeenAt` (at most every 10
  minutes). That is "signed in" for the inbox.
- **The digest:** after the flags, `morningRound` mails the coach address one plain email listing what reached the
  inbox since the last digest (Setting `digestSentAt`), or nothing. The stamp is claimed before the send.
  `reset-demo` fires the round once, because a fresh backend has no missed run to catch up on.
- **The page** (`Pages/Inbox`, `/coach/inbox`): the list (`Inbox/Inbox row`) and the open item side by side; under
  860 px they are two screens with **Back to the inbox**. `Inbox/Inbox in words` turns the items into rows and the open
  item's fields (ages and day counts are calendar days in Paris). The details are `Inbox/Review detail`
  (`Work/Versions` + `Messages/Composer`), `Inbox/Question detail` (`Messages/Conversation` + No reply needed) and
  `Inbox/Quiet detail` (the facts, the nudge prefilled through the composer's `draft`, **Snooze a week**). Sending the
  nudge also snoozes the item. Each detail re-reads the list when it changes something, and so does the inbox bell
  (a `Doorbell` row only staff can read).
- **Gate:** `tools/check-inbox.mjs` (a scratch backend on 8598).

## My creations (DBU-09)

- **One reader**, `shared/Creations of`, used by `myCreations` (the learner, her own) and `creationsAsCoach` (role:staff,
  read-only). Each item says its form (`file`, `link`, `text`), its files, the homework title (only for a shared step of
  hers) and, for one from a hand-in, the content of the version it points at.
- **Writes** only through `saveCreation` (add or edit her own; a file is checked as `handIn` checks one), `deleteCreation`
  (her own row only, never the hand-in) and `handIn` with `addToCreations` (one creation per homework: a later version
  moves its pointer and keeps her words). Each rings the `creation` doorbell.
- **Kinds** are `Option sets/Creation kinds` (document, interactive, prompt, audio_video, link, other: badge words,
  colours, filter words, file endings for the first guess). Row ids are `ck-<kind>`; the value saved is `kind`.
- **The page** (`Pages/My creations`, `/creations`): `Creations/Creation shelf` (filter chips for the kinds she has, the
  grid of `Creations/Creation card`, the opened one in `Creations/Creation view`, which shows files through
  `Work/File viewer`) and `Creations/Creation editor` (file, link or text for a new one; the words for any). The coach's
  plan page shows the same shelf in mode `coach`; the roster and the learner's home card show counts.
- **Gate:** section 16 of `tools/check-security.mjs`.

## Check-ins (DBU-10)

- **Forms** are three JSON objects in `__cloud__/shared/Checkin forms` (`after-session`, `end-of-programme`,
  `six-week-impact`), each `{id, version, title, minutes, questions}`. A question is `{id, type, label, required,
  condition?}`; types are `scale` (1..max with end words), `radio`, `checkbox`, `number` (with a suffix), `text` and
  `textarea`. `condition {field, value}` (one value or a list) or `{field, not}` asks a question only when an earlier
  answer matches; an unasked question's answer is dropped. Question
  ids are the answer keys and never change. `Option sets/Check-in forms` names them in the editor; its `value` is the
  form id.
- **Copies:** the step copies the form when it gets one; the answer copies it again (`CheckinResponse.form`), so every
  reader reads answers against the questions that were asked.
- **When:** `sendsAt` (09:00 Paris on the day), or `sendAfter {step, days}`, from which `saveStep` derives `sendsAt`
  whenever the anchor moves. `sendCheckins` sends what is due, hourly; the step's status becomes `sent`.
- **The learner:** Home's row reads "Check-in, N minutes" with **Answer** once sent; `Pages/Check-in` draws
  `Checkin/Form` (rows of `Checkin/Question`, choices of `Checkin/Choice`), which shows questions by the same rules
  `answerCheckin` enforces, and `Checkin/Answers` once sent.
- **Richard:** the plan's step row shows `Checkin/Answers`; the inbox lists **Check-in answered** last
  (`Inbox/Checkin detail`, **Done** → `settleCheckin`); the digest counts them.
- **The estimate:** `shared/Creations of` returns `estimate {hours, at}` from the latest answered 6-week check-in
  (`hours_per_week`), or none if that latest one has no hours; `Creations/Estimate line` shows it on My creations and on the coach's plan page.
- **Gate:** `tools/check-checkins.mjs` (its own scratch backend) and section 17 of `tools/check-security.mjs`.

## The browser-only demo (DBU-11)

- **Built, never edited.** `tools/build-demo.mjs` writes `../demo/` from this folder: the page components byte for
  byte, `nodegx.project.json` with four changes (its own name and id, hash URLs, `headCode` loading `demo/boot.js`,
  the endpoint `demo-api`), and `demo-sw.js`. `tools/check-demo.mjs` fails on any other difference.
- **The backend is a service worker** (`demo-sw.js` = `tools/demo/engine.js` + `tools/demo/sw.js` + the cloud
  graphs + `nodegx.security.json` + `tools/lib/world.mjs` + the fixtures). It answers every request under
  `demo-api/`: the engine interprets the template's own `__cloud__` graphs (Request, Response, Function, Component
  Inputs/Outputs, the user and role nodes, shared components) against a `Noodl.Records` kept in IndexedDB, applies the
  policy's function rules, stores files with the backend's sniffing and private signed links, and streams changes
  as the backend's server-sent events. It also answers `nodegx-config.json`, so the viewer finds it wherever the
  demo is served. Mail goes to an outbox in the store, never out.
- **The world** is the seed's (`world.mjs`, shared with `tools/lib/seed.mjs`), dated from the first visit; the
  morning round and the check-in send run once after it, as `reset-demo` does.
- **The page side:** `demo/boot.js` registers the worker and creates `window.dbuDemo` (`lookAs`, `reset`, `leave`).
  `Demo/Demo mode` reads it; `Demo/Demo intro` (on Sign in, in place of the email form) and `Demo/Demo strip` (the
  top of `Shell/App shell`) show only when it exists, so the template never shows them.
- **Gates:** `tools/check-demo.mjs` (the build, the engine's policy, and the read functions answering as the real
  backend does) and `tools/drive-demo.mjs` (every flow in headless Chrome, `tools/lib/cdp.mjs`).

## Words (i18n)

- Every word on screen lives in **`Strings`** (two Language Bundles: `common` for the shell, `pages` for every page), in English. i18next falls back to English for any language with no bundle of its own.
- Pages and parts name **keys**, never words: `Shell/Page head` takes `titleKey`/`leadKey`, `Shell/Empty state` takes `titleKey`/`bodyKey`, a tab's row carries `labelKey`. Each page's browser-tab title is a Translation of `<page>.tab`.
- A value inside a sentence is a single-brace tag (`Welcome, {name}`), filled by a String Format node or the page's own function. Not i18next's `{{name}}`, which HTML-escapes an apostrophe (O'Neill).
- **Not covered:** email copy written by a function (the welcome email) is English in the function. It moves to strings when a second language arrives.

## Decisions

Considered during scoping and deliberately not done:

- **Keep the React + PocketBase Learning Hub** — Richard chose NodeGX end to end, to dogfood it and to publish this as a NodeGX template and demo.
- **Evolve the live digital-bricks-training template** — It is built around the AI lesson engine; we reuse only its platform pieces (sign-in, one-gate security, messages + mail, hosting, backups), not its pages or data model.
- **Cohorts in v1** — Coaching is mostly 1:1; a plan per learner is the unit.
- **Scores on hand-ins** — The only verdict is approve or ask for changes.
- **Six-digit sign-in codes** — The backend offers them (`/auth/email-code`), but the runtime has no node for them yet and magic links are proven in the live template. Links only, for now (DBU-02).
- **A magic link inside the welcome email** — It would expire before most people read it (15 minutes). The welcome email links to the sign-in page instead (DBU-02).

Settled: interface language is **English at launch, with i18n wired in** (Richard, DBU-02).

Left open:

> TODO: Domain: university.digitalbricks.io, or replace training.digitalbricks.io? Needed by DBU-12.

_Scoping record: `docs/decisions/000-initial-scope.md`._
