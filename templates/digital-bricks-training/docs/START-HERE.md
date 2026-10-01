# Digital Bricks Training

A learning platform with no course catalogue: the learner's own project is the spine of their
curriculum, and every lesson is written for it. This template is built entirely out of NodeGX
nodes — the sticker-book design system, a lesson kit of section renderers, the learner's pages and
the coach's — and it runs on a **NodeGX backend**: six cloud functions over 25 collections, behind a
security file that closes everything else. Four read; two write — a learner's answer onto their
project, and a finished step (TASK-L177, L178). `reset-demo` puts the seed back.

Set up the backend first (*The backend, and the way in*, below — about five commands), then press
**Run**. Home has two doors. *Log in as the learner* emails Sam a one-time sign-in link; on your own
machine it lands in **Mailpit**, and pressing the button on the page it opens signs you in. Then
*Open your course* → a lesson. *Log in as their trainer* does the same for their coach, whose way on
is **People**, the roster, and the one linked name on it opens **Learner**, the coach's page about
that person. Every step is a live chip; nothing is locked, numbered or scored.

## The first thing to change

Open **`backend/fixtures/lesson.json`**. It holds a JSON array of lessons, one per step Sam has
reached (TASK-L181): the five he has finished and the one he is on, in path order. Each is what the
backend serves when he opens that step:

```json
{
  "title": "…", "hook": "…", "landing": "…", "conceptId": "…",
  "steps":    [{ "id": "step-1", "title": "…", "goal": "…", "unlocks": "…", "sectionIds": ["s-01", "s-02"] }],
  "sections": [{ "id": "s-01", "kind": "answer_capsule", "text": "…" }, { "id": "s-02", "kind": "reading", "markdown": "…" }]
}
```

A lesson is 3–5 **steps** that index a flat **sections** array. Every id a step claims must exist,
exactly once — **Logic/Sections for step** throws by name on one that does not, rather than
rendering the step with a hole. The 19 section kinds and their fields are listed in
`noodl_modules/dbt-lesson/README.md`, and **Pages/Palette** draws every one of them once.

Then run `node tools/build-seed.mjs` and set the backend up again on a fresh data directory
(`setup-backend.mjs` refuses one that already holds data). `build-seed` also rewrites Palette's
**specimen** (`Data/Specimen lesson`) from the same file, so the lesson is edited in ONE place;
`tools/check-specimen.mjs` fails if the two ever differ. The specimen is the one `Static Data` left
in this template, on purpose: a kit's showcase must not depend on who is signed in (sprint 49
decision 9), so Palette stays public and reads no backend.

## The second thing to change

Open **`backend/fixtures/programme.json`**. It holds the learner's whole programme as the backend
hands it over: their project, the end they agreed with their coach, and every entry on their
timeline. It is not read by any page — the pages read the `course` and `learnerProgramme`
functions — but it is what `build-seed` decomposes into rows, and it is each function's expected
output, which `tools/check-read-functions.mjs` proves. So a change here is a change to the seed,
and then to the page.

```json
{ "projectName": "…", "problemStatement": "…", "endsOn": "2026-12-18",
  "dimensions": [
    { "id": "dim-question", "programmeId": "prog-autumn", "label": "Asking a better question",
      "target": 8, "deliverableId": null, "position": 0, "archivedAt": null }
  ],
  "entries": [
    { "id": "lesson:what-an-api-is", "kind": "lesson", "at": "2026-09-02T11:15:00.000Z",
      "anchor": "what-an-api-is", "state": "done", "position": 2, "programmeId": "prog-autumn",
      "conceptId": "what-an-api-is", "title": "…", "rationale": "…", "status": "complete" }
  ] }
```

Two more fields exist for the coach's page and the learner's page never reads them: `learnerId`
says whose programme this is (the coach's page finds them on the roster by it — an explicit join,
never a match on a project's name), and `history` holds the entries of their OTHER programmes,
which in the product is a separate, gated read a coach makes by choosing a finished programme.

An entry's **id is namespaced by its kind** (`lesson:<conceptId>`, `session:<uuid>`): two tables
produce the same uuid space, and a key collision renders one row and drops the other. `at` is
**null** when an entry genuinely has no moment — a lesson nobody has done yet — which is honest
rather than a gap, and those rows are ordered by `position` inside their band.

**`state` has exactly three members: `done`, `now`, `ahead`.** There is no `overdue` and no
`missed`. A brief whose date has passed is still `now`, with its date on it.

**`dimensions` are the objectives the coach and the learner agreed**, each with the target it was
agreed at. A rating lives on the session or the review it was given at (`ratings: [{dimensionId,
score}]`), and **a rating whose event has no write-up for the learner is not drawn at all** — a
number alone is a verdict; a number with what the coach wrote beside it is coaching. An ARCHIVED
objective stays on the chart: the ratings were really given, and dropping them would be the chart
omitting points without saying so.

**Logic/Standing** turns all of that into the three panels above the programme — two counts in a
sentence, the pace line, and one gauge per objective. Every rule in it is ported from the product's
own pure modules and names the file it came from. Two of its properties are worth knowing before
you edit anything:

- **The counts render for everyone; the charts do not.** No agreed end and nothing booked means no
  horizon, and then there is no pace panel and no trajectory panel at all — a pace line against a
  schedule nobody agreed to is a deadline this product invented and then measured somebody against.
  Counts of your own finished work need no deadline to be true, so they stay.
- **`total` is computed and never rendered.** `done` and `remaining` are two numbers a learner can
  read on their own. Beside each other with a total they become `"6 of 12"`, which is a verdict
  wearing a count's clothes.

**Logic/Ordered timeline** is what turns that array into the page: the band order, the two
`ahead` headings, which rows arrive folded, and the one line a folded row shows. Every rule in it
is ported from the product's own code and says so.

## Where the backend is read

Every piece of data enters through **three components**, and each is one `Cloud Function` node in
front of the same split the fixture had — so no page, no `Logic/*` component and no kit node knew
the fixtures had gone (TASK-L171; the pages' `#root` is byte-identical to the fixture-fed build,
on SQLite and on PostgreSQL):

- **Data/Lesson** — one of the signed-in learner's lessons, named by the lesson page's `?concept=`.
  Its outputs are the fixture's (`title`, `hook`, `landing`, `conceptId`, `steps`, `sections`,
  `loaded`) plus ONE appended, **`found`**: a step nobody has written a lesson for yet answers with
  nothing, and the page says *not written yet* rather than showing a blank. Since TASK-L181 that is
  only ever a step Sam has not reached: every reached step has its lesson, and
  `tools/check-lessons.mjs` fails if one is missing or if a lesson does not pass the product's own
  `validateLessonOutput`, compiled from the product's source under the Digital Bricks pack.
- **Data/Programme** — a learner's programme. **`reader` has no default and every instance says it**:
  `learner` asks `course` (their own; no parameter, so nothing a learner's page sends can name
  somebody else), `coach` asks `learnerProgramme` for the learner named by `/learner?learner=`.
- **Data/Roster** — the coach's people, from `roster` (staff only), in the server's order.
- **A refusal is an empty answer**, in all three. The backend answers every refusal with one body,
  so a page cannot tell "not yours" from "not there", and it shows its empty state rather than
  waiting.
- **Lesson/Section row** — the kit's `Section` node emits `Acted`, `Saved` (+ `Field`, `Value`),
  `Submitted` (+ `Content`), `Write requested`, `Listen requested` and the rest. **`Saved` is a
  write** (TASK-L177): the row calls `capture` itself — see *The two write functions* below. The
  others are wired to the row's outputs and nowhere else yet.

## The backend, and the way in (sprint 49)

In this order, from this folder. `<admin>` is any long random string you choose; it is the
backend's admin credential, so keep it out of the project.

```bash
# 1. A mail sandbox, so a sign-in link has somewhere to land. SMTP on 1026, inbox at :8026.
docker run -d --name dbt-mailpit -p 127.0.0.1:1026:1025 -p 127.0.0.1:8026:8025 axllent/mailpit

# 2. A local backend on this project. The policy file is applied on its first start; the name is
#    what the sign-in mail calls the app ("Your sign-in link for …").
node <OpenNoodl>/packages/nodegx-backend/bin/nodegx-backend.js serve --data-dir /tmp/dbt-backend \
  --port 8577 --token <admin> --project-dir . --backend-name "Digital Bricks Training"

# 3. The data, the functions and the way in.
node tools/build-seed.mjs                 # backend/fixtures/ → backend/seed.json (+ Palette's specimen)
node tools/setup-backend.mjs    --backend http://127.0.0.1:8577 --token <admin>
node tools/deploy-functions.mjs --backend http://127.0.0.1:8577 --token <admin>
node tools/setup-signin.mjs     --backend http://127.0.0.1:8577 --token <admin> \
  --app-origin <where the app is served, e.g. http://127.0.0.1:8602> --smtp 127.0.0.1:1026
node tools/reset-demo.mjs --seal --backend http://127.0.0.1:8577 --token <admin>   # LAST: the seed archive

# 4. Proofs.
node tools/check-seed.mjs           --backend http://127.0.0.1:8577 --token <admin>
node tools/check-read-functions.mjs                    # offline; add --backend/--token/--scratch for live
node tools/check-pages.mjs capture --app <app origin> --out now.json --audit   # see its header
```

**If the backend stops on its own, a dev stack started.** OpenNoodl's `npm run dev` sweeps, at
startup, any process whose command line holds the OpenNoodl checkout's path and `nodegx-backend`
— so a backend started from `<OpenNoodl>/packages/...` exits cleanly (SIGTERM) whenever the editor's
dev stack starts. Launch it through a symlink outside the checkout to keep it running.

`nodegx.project.json` points the pages at `http://127.0.0.1:8577` (`metadata.cloudservices`). In
the editor the Backend Services panel does the same for a backend it started.

### Putting the demo back (TASK-L179)

`reset-demo --seal`, the last setup step, takes a NodeGX backup of a backend that `check-seed` says
holds exactly the seed, and copies it to `<data dir>/dbt-seed.ngxbackup.tar.gz`. It is copied out of
`backups/` on purpose: retention keeps the last seven there and prunes the rest, so a seed left in
the folder would quietly disappear. It is the last step because an archive holds the database, the
deployed functions and the security, email and schema config, and **not** `auth.json` (the magic
link), which a restore leaves as it is. Sealing refuses a backend `check-seed` fails on, and refuses
to replace a seed that exists; to replace it, delete the file yourself.

**On SQLite**, to go back: stop the backend, then

```bash
node tools/reset-demo.mjs --data-dir <data dir> --backend http://127.0.0.1:8577
```

and start it again. It refuses while the backend is answering (NodeGX's restore swaps files and wants
the service stopped), restores only the sealed seed (it takes no archive argument), and keeps
NodeGX's pre-restore safety snapshot of what it replaced, in `backups/`.

**On PostgreSQL** NodeGX cannot back up at all (BRG-008: the rows are not in a file, and the backup
route answers 409), so seal on SQLite before migrating. To go back: stop the backend, **drop and
recreate the database yourself**, run the SQLite reset above, then `migrate` again and serve with
`NODEGX_STORAGE_URL`. Do not migrate over a database that still holds rows. Measured: `migrate` does
not refuse a non-empty target. It replaced the rows, and then its own verification failed on
`_Audit` and said *do not cut over*.

### Signing in

- **Magic links, no passwords, no public sign-up.** The link opens a page that spends nothing
  (OpenNoodl HLT-015): a mail scanner that follows it signs nobody in, and only the button on that
  page does. The sign-in form says the same sentence whatever address was typed, because the
  backend answers identically for a known and an unknown one and a page that knew better would
  rebuild the oracle it removed.
- **The two doors on Home PREFILL an address; they decide nothing** (sprint 49 decision 8). Who is
  staff is the backend's `staff` role, read from the `User` node's `roles` — never from an email.
  `tools/check-backend-pages.py` fails if a staff address appears anywhere else in the graph.
- **An origin not on the redirect allow-list gets no mail and no error** — the backend logs
  `auth.redirect-refused` and the person waits for a link that never comes. Every origin the app is
  served from goes to `setup-signin.mjs --app-origin`, comma-separated.
- **Five link requests per 15 minutes per IP.** Try both doors a few times and the sixth answers
  *"The link could not be requested just now"*. That is the backend's rate limit working; it resets
  when the backend restarts.
- **ONE gate, in `App`.** Signed out, every page but Home, Sign in and Palette goes to sign-in;
  signed in without the `staff` role, People and Learner go to Home. Neither rule is what keeps
  data private — every read is a function behind the security file, and a page reached some other
  way is refused by the backend first — they decide what the browser DRAWS.
- **`roles` arrives with the session; the gate never asks for it.** A magic link's `POST
  /oauth/exchange` carries them (NodeGX HLT-024), and a stored session is re-read through
  `/users/me` when the app loads. While `roles` is unknown the gate waits rather than guessing —
  `undefined` means "the backend has not said", never "in no roles". Until HLT-024 the exchange
  left them off and the gate asked once through a `Switch`; that ask was deleted when it measured
  at zero (TASK-L171 follow-up).

- **`backend/schema.json` is the schema.** NodeGX keeps a collection's schema in the backend, not
  the project, so a template carries it as a file and `setup-backend.mjs` applies it. 25 collections,
  one per product table a page reads, with the product's keys as unique indexes.
- **`backend/seed.json` is GENERATED** from the three fixtures — never edit it. `build-seed.mjs`
  fails by name on any fixture field it cannot place, and it stores **nothing derived**: no timeline
  `state`, no counts, no `lastActivity`. The read functions derive those (sprint 49, L170).
- **`nodegx.security.json` closes everything.** Every collection is `nobody` to every client and
  public sign-up is `nobody`. The pages will call functions, never read a collection, so there is
  one gate and it is in one file.
- **Users have no password** — this product has none. They are created with the admin credential.
- **`setup-backend.mjs` refuses a backend that already holds data**, so it cannot write over a live
  one. Start a fresh data directory instead.
- **An empty object `{}` is written as itself** since NodeGX HLT-018. The workaround that left it
  off the row is gone, so a `{}` that stops round-tripping fails `check-seed` rather than being
  excused by it.
- **Every function reads with `{ plain: true }`** (NodeGX HLT-022): the row as it was saved, with
  its `objectId`. A default `Records` read turns each nested object into a Model with a generated id,
  and a lesson's steps index its sections BY id — so a default read silently breaks a lesson. Both
  offline fakes REFUSE a read without the option, by name. The one-day `json:`-text workaround is
  gone.

### The four read functions (L170)

`components/__cloud__/` — `course` (a learner's own programme; takes **no parameter**, so a learner
cannot name anybody else), `lesson` (the caller's cached lesson, only for a live, unlocked step on
their newest path), `learnerProgramme` and `roster` (`role:staff`). Two helpers with no Request node:
`shared/Caller learner` (the signed-in account → its learner, one query) and `shared/Programme` (a
PORT of the product's timeline model — `assembleTimeline`, `orderEntries`, the state rules,
`currentProgramme` — run once per request, 25 queries in 3 rounds).

- **Each function's output IS its fixture's array** (`backend/fixtures/`), so L171 swapped a
  source, not a shape. `check-read-functions.mjs` proves it through the PRODUCT's own projections, compiled from
  the product repo (`DBT_REPO`), and fails if the product is absent rather than comparing nothing.
- **The fixture's `state`s hold only between `2026-09-18T19:15Z` and `2026-09-30T22:59:59.999Z`**
  (measured, both edges). `learnerProgramme` takes a `now` for that reason; `course` uses the server
  clock and cannot, so **a backend-fed `/course` only matches the fixture until 30 September**.
- **`deploy-functions.mjs`** walks the nested `__cloud__` folders, derives each component's ports
  (an empty port list is a silent 30-second hang, not an error) and refuses a signal a script fires
  on a port it never declared.
- **The live half runs only on a disposable backend**: `check-read-functions.mjs --backend … --token
  … --scratch` mints sessions and writes a probe note, and deletes both, verified by re-reading.
- **Runs on the default `ops.json`** (NodeGX HLT-023): a function's own queries are charged to the
  run, not to one shared `admin` bucket, and `rateLimit.functionRunQueries` (default 1000) is the
  runaway guard. Measured: 100 `course` loads from two learners, all 200, with the operator's admin
  requests in the middle all served. Before the fix, 13 loads drained the deployment.

### The two write functions (L177, L178)

`capture` and `finishStep`, in `components/__cloud__/`. Both are `authenticated`, both take their
learner from `shared/Caller learner` — the session — and neither accepts a learner id. Every refusal
is one body, *"This could not be saved."*

- **`capture`** saves one answer onto the learner's project context: read it, merge the one field,
  write it back **only if `version` is still what was read** (`Records.save(…, { className,
  ifMatch: { version } })`, OpenNoodl HLT-016). A conflict is read again and retried, never answered
  200. It refuses a field their lesson does not ask for, on a step that is not open to them.
  Identical words write nothing. There is no version history (sprint 51 §3.1).
- **`finishStep`** marks a step complete and opens the next, as three single-row writes each
  guarded on what was read: stamp the progress row, **open the next step, then complete this one.**
  The order is a measurement (decision 006): the other order can leave every step done and nothing
  open after a crash.
- **The row writes, not the page.** A For Each hands its page only a signal and the row's id, so
  `Lesson/Section row` calls `capture` itself, when it carries its lesson's concept. Palette's
  rows carry none and write nothing.
- **The kit waits.** `Capture` and `Activity` show *Saving…* until the row says `saved:<token>`
  (a token new for every save), and only then the ✓. A failure keeps the words and says it could
  not save.
- **The last step of a lesson** shows its landing and *Mark complete & continue →*. On success the
  page goes to the course. On failure it stays and says so.
- **`tools/check-write-functions.mjs`** runs both functions' own scripts against a fake that
  enforces `ifMatch` as the backend does, including the race by construction and its control (the
  script with `ifMatch` cut out must lose facts). `--backend … --token … --scratch [--log <backend
  log>]` runs the real race. It WRITES; run `reset-demo` afterwards. Measured on SQLite and
  PostgreSQL 16: 12 captures at once keep 12 facts, with 10–19 conflicts retried. With `ifMatch`
  cut out, 6 of 12 kept on SQLite and 4 of 12 on PostgreSQL, every caller told 200.
- **A client Cloud Function's outcome port is `done`, not `success`.** A `success` wire validates
  and never fires. The check refuses one.
- **A NodeGX archive carries the deployed functions**, so `reset-demo` restores the SEALED ones
  too. Deploy after a reset, never before.

**The fixtures were made into one consistent world first**, because one database could not hold
all three as they were, and because the world has to be one person's.

**Who the learner is: `l-sam`** — somebody running a small business alone, who has never built
anything, making a one-page site with a contact form. Their project, their 20-step path and every
rationale on it were written by a real `training_set_project` / `training_propose_path` round trip
through the connector on 2026-09-22; the coaching layer around it (sessions, notes, reviews,
objectives, ratings) is authored here, because none of that has ever lived in a database.
**Whose name links on `/people` is one stated value** — the Function *"The one learner whose page
this template holds"* on `Pages/People` — and it also becomes the `?learner=` that link carries, so
the two cannot disagree. The seed holds one learner's coaching programme; making every row link is
right and is its own change, once the seed has a second programme worth opening.

**What the fixture carries on purpose, and must keep carrying.** These are not decoration; six of
them are the only reason `tools/check-dossier.mjs` and `tools/check-roster.mjs` can prove anything,
and a re-author that drops one fails those checks by name — which is exactly how they were found
again:

| the case | where | why it must exist |
|---|---|---|
| an objective with **no answers**, at index 3 | `deliverables` | an empty objective must be a button with no bar, no caption and no `0` — the L167 rule |
| exactly **two** live objectives with answers | `deliverables` + `facts` | so "carries a bar" is a real distinction |
| an **archived** objective that still holds an answer | `obj-seo` | off the learner's meter, on the coach's list, answers kept for both |
| a fact under **no namespace and no authored label** | `coverageArea` | it must humanise whole, never split at a dot |
| a fact carrying `<b>`, `**bold**` and an `<img onerror>` | `scopeNote.notYet` | a captured answer is shown as TEXT and must reach the screen as the characters it is |
| a required concept **not on anybody's path** | `picking-a-host` on `obj-live` | it renders as its slug, beside one that resolves to a title |
| a submission filed under **no** objective | `submissions[1]` | "filed" and "unfiled" are different rows |
| somebody who **signed up and never onboarded** | `l-newstart` | the roster exists to surface exactly this person (L89) |
| somebody with **no activity at all** | `l-newstart` | *No activity yet* is a rendering path, not a gap |
| a **cancelled** session, and a session in the future | `entries` | a cancelled one keeps its place and is never called "missed" |
| **two** programmes, one finished | `programmes` + `history` | the scope selector is absent below two |

**`build-seed.mjs` reads whose programme it is from the fixture**, never from a name written in the
tool. It was pinned to a learner id in three places and produced three silently wrong answers the
first time the world moved.

## How it is built, in the graph

- **`noodl_modules/dbt-lesson/`** is the lesson kit: one node per section kind and a `Section`
  dispatcher, over ONE sanitised markdown path (react-markdown + rehype-sanitize + remark-gfm) and
  DOMPurify for the two SVG fields. AI content is data; these nodes are the only thing that turns
  it into UI. Its `styles.css` carries the product's design-token names as aliases of NodeGX's
  (`--ink: var(--foreground)`, `--thread: var(--primary)` …) and the lesson CSS lifted from the
  product's own stylesheet. **Do not delete it.** Its source is `library/modules/dbt-lesson/`.
- **`Pages/Course`** is the learner's home: their project, then where they are (counts, pace,
  objectives), then the lesson they are in, then their whole programme as one `For Each` over
  `Course/Timeline row`. The three panels are `Course/Where you're at`, the kit's `PaceTracker`,
  and a `For Each` over `Course/Trajectory row` — all four fed by one `Logic/Standing`.
- **`Pages/Lesson`** places the stepper (a `For Each` over `Lesson/Step chip`), the active step's
  sections (a `For Each` over `Lesson/Section row`, whose root IS the kit node so each row lands
  as a direct child of the `.lesson-layout` grid) and `Lesson/Step close`. Which step is open is
  one app variable, `dbtActiveStepId`, written by a chip or by the step close.
- **`Logic/Sections for step`** is the step index — one Function, one calculation.
- **The look** is the Styles panel: 37 project tokens (cream ground, ivory cards, 3px ink edges,
  the 4px pop, coral to press, teal for done, Grandstander 800 over Nunito). Both fonts are bundled
  in `noodl_modules/` (SIL OFL) and never fetched. There is no dark theme, on purpose.

Two mechanics worth knowing before you edit a page: a NodeGX `Button` paints its background and
colour inline, so a class alone cannot restyle one — set the two ports (the chips take theirs from
the row data); and a `Group` writes `display: flex` inline, so the lesson grid restates
`display: grid` in `styleCss`.

## Every string has one owner

Every learner-facing string on the three pages is one entry in **`Data/Strings`**, and the language
is one value: the `Language` parameter on the **`i18next` node in `App`**. Change that one value and
the page changes language. Nothing else in the graph decides it —
`tools/check-language-owner.py` fails the build if anything tries.

`Data/Strings` holds **three** nodes and they are not interchangeable:

| node | what it holds | who writes it |
|---|---|---|
| *"EDIT — this is every word on screen"* | the lesson kit's 80 strings | **generated** by `library/modules/dbt-lesson/build.mjs` from `src/kit.js` — do not hand-edit |
| *"EDIT — this template's own page copy"* | these pages' 19 headings and labels | **you**, here and nowhere else |
| *"EDIT — a second locale goes here"* | one key per language code | **you**, when you add a locale |

English is the **base**; a locale is an **overlay on top of it**. So a key you have not translated
renders English rather than a raw key or a blank — for the kit and for the graph's `Translation`
nodes alike, by one rule in one place. Adding a locale is adding one key to the overlay node:
nothing else in the graph names a language.

**There is one locale — English.** The switch has been driven against a second, throwaway locale
and works: a kit string and a `Translation` string both changed in one page load, the tab title
followed, interpolation (`{product}`, `{label}`) still filled, and every key the throwaway locale
left out came back English. Switching back restored all four pages byte-identically. **No human
translation has been written or reviewed by anyone**, so this template is i18n-**ready**; it is not
a template in two languages.

### What the table does NOT own yet, and it is deliberate

Two kit nodes — **`RatingGauge`** and **`PaceTracker`** — are still handed no copy object, so the
handful of strings they draw themselves render the kit's built-in English whatever the language is.
Everything else on all four pages changes language.

`/course`'s timeline labels and `Logic/Standing`'s sentences used to be on this list too; TASK-L163
moved them, which is what gave `/course` a string table at all. `Pages/Lesson` and `Pages/Course`
both show the shape to copy: a `/Data/Strings` instance, a `Variable` named `language`, and the copy
folded into each repeated row.

## And one value decides WHO IS READING

A coach and their client read the **same programme**, assembled once, and must not read the same
sentences: *"You've finished 7 things"* is right for one of them and wrong for the other. So
`Data/Strings` takes an **`audience`** — `learner` or `coach` — and the coach's words are an
**overlay on the English base, exactly as a locale is**. Thirty override keys replace sixty-five
duplicated strings, and a neutral one (`Lesson`, `Brief`, `Review`, `goal`) keeps a single owner
and cannot drift between audiences. The overlay lives under a `coach` key in the same node you
write page copy in.

**There is no default.** Every `/Data/Strings` instance says who is reading, and an instance that
does not throws by name rather than quietly serving the learner's words to somebody else —
`tools/check-coach-voice.py` catches it before the page does.

That tool also catches the failure this whole arrangement creates. A locale miss falls back to
English: wrong language, right meaning, and visible. **A voice miss falls back to the LEARNER's
sentence** — it tells a coach *"Your coach hasn't written this one up yet"* about their own review,
which is grammatical, in the right language, and invisible. So it resolves the coach's bundle the
way the graph does and fails on any string that still addresses the reader as the learner.

**A learner's programme and a coach's differ in exactly two ways**, both ported from the product:
a learner's drops every `signal` (our inference about their confusion — `Logic/Ordered timeline`
does it, which is the projection's own layer), and a learner's row does not draw a `message` (a
conversation belongs to the thread — `TimelineRow` does it, which is the renderer's layer). Nothing
else differs, and the entries are loaded once for both on purpose.

## The coach's roster

**`Pages/People`** answers *"who am I responsible for"* — not *"who has done the work"*, because
the people it must not hide are the ones who most need a coach. It lists every account, including
somebody who signed up and never finished setting up.

- **`Logic/Roster filter`** is the whole of it: programme, then cohort, then a search, as a pure
  reduction over rows already in memory. It never fetches and never reorders. Its second Function
  computes what the two selects offer from the people alone — **a Dropdown handed a new `items`
  array resets itself to its default**, so options recomputed on every filter change snap the
  select straight back to "Everyone".
- **The programme filter's default hides a person only when EVERY programme they have is
  finished — never because they have none.** Getting that backwards hides every learner who has
  not been enrolled yet. `tools/check-roster.mjs` runs the graph's own scripts against the fixture
  and fails by name if it happens.
- A select appears **only when it can change the list**. It is never disabled.
- Nothing on a row is a verdict: a count of steps (never `0 of 0`, never a percentage),
  *"No activity yet"* rather than *"never"*, and a waiting-for-a-reply line that is **a date, not a
  count**. No pace, rating or ranking column, ever — comparing learners is the one thing a roster
  would do most naturally and must not do.
- **One name is a link**: the person whose programme this template holds. The other eight stay
  names, because opening that one programme under somebody else's name would be a page about the
  wrong person. The backend COULD open any of them now (`learnerProgramme` takes a learner id);
  it does not yet, because the seed holds one coaching programme and the others would be pages
  about people the seed says almost nothing about. That is its own change (TASK-L171 §0b).

**The gate is the backend's.** `roster` and `learnerProgramme` are `role:staff` in
`nodegx.security.json`, so a learner who types `/people` is refused by the backend (403) before
App's gate sends them Home. And the trainer's private labels (`coachLabel`) are now **in no page's
source at all**: while the roster was a fixture it was project data, inlined into every page anyone
loaded — measured on the served HTML, 6 of them on every page including the sign-in page before
TASK-L171, 0 after. They reach a browser only through the staff-only function, for a coach.

## The coach's page about one learner

**`Pages/Learner`** is where the template's central claim stops being an argument: **a coach and
their client read the same assembly.** Their programme on this page is `Logic/Ordered timeline`
with `audience: coach`, through the **same** `Course/Timeline row` the learner's own page places —
not a copy. `tools/check-learner-page.mjs` runs both projections over the fixture and compares them
field by field: the coach's list minus its signals IS the learner's, and the only field allowed to
differ is whether a message is unread, which depends on who is reading. It fails if a second
timeline-row component ever appears.

Above everything, three facts (**People/Head** — where they are, what they just did, what is next),
then **People/Programme scope**, then three surfaces:

- **Their programme** — the same pace chart, the same objective gauges and the same programme the
  learner reads, in the coach's words, plus the three moments they got stuck and the message thread
  that only a coach's programme draws. No ask control: it would post as the coach.
- **Activity log** — every entry as its own row, in the **model's order, not newest first**. That is
  the product's own recorded choice (a coach and their client must not disagree about the shape of
  the fortnight). **Logic/Feed filter** owns the chips — one per kind this person has, words only,
  never a count — and the saved filter, under one key for every learner because it is the coach's
  preference, not a fact about anyone.
- **What they must produce** — their project, the objectives agreed with them, and everything they
  have told us. Read-only; see "What they must produce" below.

**The scope sits above the nav**, because the first two surfaces read what it chooses; a copy on
each would be two controls over one piece of state. It is absent when there is only one programme.
**The third surface ignores it, and that is not a bug**: see below.

**Each surface points at the other.** *Show in the activity log* on a programme card, *Show on their
programme* on a log row. A saved filter that would hide the row being pointed at is cleared, and one
that would not is left alone. **Logic/Bring into view** scrolls only once the row is there AND open,
never in the same moment as the change that opens it.

Two mechanics worth knowing before you edit this page:

- **A `Function` whose `Run` is wired still runs when its inputs change**, unless each input's *Run On
  Value Change* box is unticked (`runOnChange-in-<name>: false`). Wiring Run used to make them
  passive; it no longer does. Missing it here meant opening a row in the log also jumped to the
  programme. `tools/check-learner-page.mjs` fails on any run-driven Function in the template that
  forgets.
- **A `Dropdown` reserves `""` for its own hidden placeholder**, so the scope's "current programme" is
  the value `current`, not the product's `""`.

**Nothing on this page writes.** The product's version is mostly composers — schedule a session,
change the path, set up a programme, write a review, reply — and every one would be a control that
cannot save.

## What they must produce

**`Logic/Dossier`** is the one place that decides what each objective holds, for the learner's
meter and for the coach's list alike. It is the product's `dossierProgress`, `humaniseFactName` and
`toMarkdown` **ported verbatim**, and `tools/check-dossier.mjs` bundles those three functions from the
product's own source and compares every field — over this fixture and three probes (LangueXpert's
six deliverables by `labelKey`, an empty set, a fact under a prefix nobody owns). It needs the
product checked out beside OpenNoodl, or `DBT_REPO` pointing at it, and **fails** rather than
comparing nothing.

Things worth knowing before you change it:

- **An archived objective is off the learner's meter and on the coach's list.** The fixture carries
  it deliberately (the product filters it in a query, and a fixture that pre-filtered would make the
  rule untestable); `Audience` decides who sees it, here and nowhere else. Its answers stay for both.
- **Nothing says whether an objective is complete** — no `done`, `complete`, `remaining`, `missing`.
  `fillPct` is a bar width and is never printed. An empty objective carries what it **asks for**
  and no count. The check fails on any of these keys.
- **An objective's title is the trainer's words and is never looked up in the string table.** Only a
  pack's `labelKey` is (`dossier.deliverable.*`).
- **The coach's "What they have told us" labels a namespaced answer `<objective> · <fact>`.** The
  product prints the raw key (`Observation log.what you saw`); that defect is deliberately not ported.
- **A concept that is not on the learner's path renders as its slug**, as the product does, rather
  than vanishing from what an objective needs.
- The fixture's second submission is filed under no objective and has **no timeline entry** — it
  appears on no dossier surface by design, and adding it would have changed `/course`.

- **The fixture's third submission is filed on the lesson page's own concept** (`what-is-a-backend`),
  which is not on this programme — the lesson fixture and the programme fixture are two different
  projects. So it renders as its slug, and it is the one piece of work on `/course` that links
  anywhere (below).

### On the coach's page: *What they must produce*

The third surface on `Pages/Learner` is **People/What they must produce**, one section component
placed once (the page was already past the validator's ~40-node advisory, so the section is its own
component rather than eight more nodes on the page). It places the **same** `Logic/Dossier` the
learner's meter reads, with `audience: coach`, and one Function that only fills in sentences — it
computes nothing about an objective. In the product's order:

1. **Their project** — its name, and the problem it solves in their words.
2. **The objectives**, one **People/Objective row** each, in the order they arrive (the product's
   query orders by position; the fixture is in that order): the title, an **Archived** pill on an
   archived one and nothing else about its state, where its answers are filed, what it is for, what
   it expects, and what it needs from their programme — **the concepts as text**, by title.
3. **What they have told us**, one **People/Told us row** per fact — an archived objective's answers
   included, and their own words shown as text.

Things worth knowing before you change it:

- **Nothing on it writes.** The product's rows carry Move up, Move down, Edit, Archive, a concept
  picker and an assignment composer; every one writes, so none is here. The product's empty
  sentence *"Nothing set yet. Add the first thing you have agreed they will produce."* keeps only its
  first half, because the second points at a control that is not on the page.
- **The programme scope does not filter it, and the product does the same.** Objectives belong to
  the LEARNER, not to a programme: `learner_deliverables.programme_id` exists and nothing writes it.
  So choosing a finished programme leaves this surface exactly as it was (measured: byte-identical),
  while *Their programme* changes under it. It is fed straight from the fixture, never from the scope.
- **The one sentence it says to the coach about the learner's side is exact**: they see each title
  on their own course page, *apart from the archived ones* — the archived objective is off the meter.
- **`tools/check-objectives.py`** holds all three rules: no control of any kind in the section or its
  rows, nothing reaching the section from the programme scope, and the surface gated on `mounted`
  rather than `visible`.

### The meter and its reveal, on `/course`

Between *How it is going* and *Your programme*: **Your dossier**, one button per objective, and one
dialog. Pressing a segment opens what the objective asks for, what they have captured under it, the
work they sent in for it, and **Copy as markdown**.

- **Every segment is a button, including an empty one.** An empty objective is its label and nothing
  else — no bar, no caption, no `0` — and it opens to what it asks for. The product's LX17 made an
  empty segment inert, and when every segment was empty the whole block was: that was a real bug.
- **The dialog is the kit's `DossierReveal`, not `Show Popup`.** The runtime's popup is a plain
  Group: no dialog role, no Escape, no focus handling, and its `Dismissed` means *replaced* rather
  than *closed*. The kit node is a real dialog — Escape, the overlay and Close all close it, focus
  goes in and comes back to the segment that opened it, Tab stays inside, the page does not scroll
  behind it, and the page's own `overflow` comes back as it was. OpenNoodl's `HLT-014` makes the
  popup a dialog for every app; when it lands this is a candidate for replacement, not a promise.
- **What they typed is shown as text.** A captured answer never goes through markdown or HTML — an
  answer is not a lesson. The fixture carries one holding `<img onerror>`, `<b>` and `**bold**` to
  prove it; all three render as the characters they are.
- **Every piece of work opens its own lesson** (TASK-L182). Until L181 there was one lesson page and
  only the work on it was a link; every piece of work now answers a lesson Sam has reached, and each
  is written, so each is a button. The dialog EMITS the concept and `Pages/Course` navigates.
- **Which objective is open is the `dbtDossierOpen` Variable**, set by the segment's signal and
  cleared on close — and cleared when the one link is followed, because a Variable outlives the page
  and the dialog would otherwise reopen on the way back.
- **The meter is absent when there are no objectives** — which is every Digital Bricks learner whose
  coach has set none (the pack ships no deliverables of its own).
- **The dossier's eyebrow needed its own `Language Bundle` in App.** A `Translation` on a namespace
  nothing registers resolves to nothing, and its Text quietly shows the editor default — it read
  `TEXT`, with every other tool green. `tools/check-language-owner.py` now fails on it.
- `Pages/Course` is 55 nodes against the validator's ~40 advisory. Factoring the meter into a
  component of its own is the obvious reduction; it was not done here.

The words are `dossier` (generated from the kit, because the reveal is a kit node) and
`dossierCoach` (the coach's own labels, in the graph's half). There are **no coach wordings for
`dossier`**: the meter and the reveal never reach a coach's page, so they would be sentences nobody
renders.

## Running it for real (TASK-L183)

A real client's backend is **not** the demo world. `hosting/README.md` is the recipe for
`training.digitalbricks.io` on nexus-1, in order; the pieces it uses, all in `tools/`:

- **`build-production.mjs`** writes `backend/production.json`: the concept titles from the
  PRODUCT's corpus (29) and nothing about any person. It fails if the seed's titles disagree with it.
- **`setup-production.mjs`** applies the schema, the policy, the functions and those titles, and
  creates ONE staff account. It never reads `seed.json`, and it refuses a backend holding any row
  (the same refusal as `setup-backend.mjs`: both use `tools/lib/admin-client.mjs`).
- **`setup-signin.mjs`** takes an authenticated relay (`--smtp-user`, the key from a FILE, never
  argv) and `--base-url`, without which every sign-in link points at the backend's local address.
- **`check-production.mjs`** reads a running backend back and fails on a demo-world trace, a
  loosened policy, a sandbox relay, an empty `baseUrl` or an extra redirect origin.
- **`build-production-site.mjs`** derives the site from the template with a named list of
  changes: Home's signed-out doors become one plain *Sign in* (no prefilled address, no coach
  door, no demo note), and Palette leaves the router. It refuses a development engine.
- **`.noodlignore`** keeps `backend/`, `tools/`, `hosting/` and the security file out of any
  deploy. Without it a build published the seed, the fixtures and the trainer's private labels.

## What is a placeholder, and why

Four renders carry their data in a dashed box instead of drawing it: **Mermaid** diagrams (the
library is ~2 MB), **Chart** (recharts is another large bundle), the five **interactive widgets**
(each a React component of its own), and **Audio's text-to-speech** (needs a server). An
**annotated screenshot** whose storage key nothing serves yet shows the key rather than a broken
image. The kit README says which and why.

## PostgreSQL, not one node changed

Phase 97's `nodegx-backend migrate --data-dir <dir> --to postgres://…` moves the backend, reads both
databases back and compares them; then serve the same data directory with `NODEGX_STORAGE_URL` set.
Measured on PostgreSQL 16 (TASK-L171): the four pages byte-identical to the fixture-fed build, every
function equal to its fixture, **no file in this template changed** between the SQLite and the
PostgreSQL runs. Two things the move found, both worth knowing:

- **A NUL byte in a query parameter is fine on SQLite and fatal on PostgreSQL.** `shared/Programme`
  used `'\u0000none'` for an empty `containedIn`; `course` and `learnerProgramme` answered 400 on
  PostgreSQL until it went. Only the move could have found it.
- **An Object field comes back with its keys in a DIFFERENT ORDER on PostgreSQL** (it is `jsonb`,
  which sorts them) — same keys, same values. Arrays keep their order, so a lesson renders
  identically; but the coach's *What they have told us* lists a learner's facts in key order, and
  that order changes. The product stores `facts` as `jsonb` too, so PostgreSQL's order is the one
  the product has always shown, and the fixture's *"in the order they were captured"* is a claim
  neither ever honoured. `migrate`'s own comparison ignores key order, and `check-seed` does not:
  on PostgreSQL it reports three fields that differ in key order ONLY. Reported to NodeGX.

## What is not here yet

Every write but the two above — the coach's composers, the learner's question on a card, answers
to a brief, the confidence check — each a later write on the pattern `capture` set. The engine: a lesson
nobody has written says *not written yet*, and that is every step Sam has not reached yet. Every coach
composer, the assistant, the confusion control, onboarding — and a **second locale**: see "Every
string has one owner" above for exactly which strings the table owns today and which are still
English in place.

**What is still fixture-shaped: one thing, on purpose** — Palette's specimen (above).

## Licences

react-markdown, rehype-sanitize, remark-gfm: MIT. DOMPurify: Apache-2.0 / MPL-2.0. Grandstander and
Nunito: SIL Open Font License 1.1 (the licence files travel beside each font).

## The public demo (TASK-L180)

<https://nodegx.io/templates/digital-bricks-training/> is **this template with its backend taken
out**, so it runs in a visitor's browser with no server and no account. It lives beside this
folder as `templates/digital-bricks-training-demo/`, and it is **generated, never edited**:

```bash
node tools/build-demo.mjs     # writes ../digital-bricks-training-demo/
node tools/check-demo.mjs     # fails on anything but the named list
```

- **The four Cloud Function nodes become Function nodes at the same ids** that answer from
  `backend/fixtures/`, including the backend's empty answers (a learner who is not Sam; a concept
  nobody has written).
- **It is always happening now.** `tools/lib/demo-clock.mjs` moves every date in the programme and
  the roster forward by the whole number of days since the fixture's instant (22 Sep 2026 12:00
  UTC), and the two months named in prose move with them. The clock source is embedded verbatim in
  the page and evaluated by the check, so the rule the check proves is the rule the page runs.
- **No sign-in; three doors on Home** (the learner, the lesson, the trainer); hash URLs, because
  nodegx.io serves template folders with no fallback for a deep path.

**Change the template, then regenerate, check and republish** — the demo does not follow on its
own. The publish (TPL-008's recipe) composes the demo with this folder's `noodl_modules`, runs
`nodegx-deploy.cjs … --base-url /templates/digital-bricks-training/`, and copies the result into
`nodegx-web/site/templates/digital-bricks-training/`. If the deploy refuses a DEVELOPMENT engine,
build with `--allow-development-engine` and replace `noodl.deploy.js` with the production one from
the live site, **after checking it carries the NDA-017 `.value` fix** (the i18next module needs it).

## Every lesson Sam has reached is written, and opens (TASK-L181)

- **Six lessons**, one per reached step, each hand-authored onto Sam's bicycle-repair page and
  passing the product's `validateLessonOutput` unmodified (`node tools/check-lessons.mjs`). The
  two signals' `sectionId`s (`reading-request-response`, `reading-css-gist`) are real sections.
- **A lesson card opens its lesson**, as the product's does: *✓ Review* on a finished step,
  *Continue →* on the current one, *Start →* on an available one, nothing on a locked one. A piece
  of work says *Open the lesson this came from*. The kit's `TimelineRow` EMITS `Open lesson` with
  the concept; `Course/Timeline row` bubbles it; `Pages/Course` looks the row up and navigates.
  **A learner's row only**: on a coach's programme the lesson route is not theirs to follow.
- **Palette's specimen is lesson 0**, not the list (`specimenText()` in `tools/lib/fixtures.mjs`).

## What Sam sent in, and what came back (TASK-L182)

- **`programme.work` in the fixture** holds every submission's words and evaluation: the product's
  `artifactEvaluationSchema`, criteria named verbatim from the rubric, `met | partly | not_yet`
  with a note, a summary, and a nullable `nextEdit`. **No number, ever.** Timeline entries stay the
  product's content-free shape, and `submissions` stays the dossier's projection. `build-seed`
  requires one work entry per submission and the reverse, and refuses a placeholder evaluation.
- **The Programme function returns `work`** from the two submission queries it already made, with
  no new query. `Data/Programme` appends it as an output (`check-backend-pages.py` pins it as
  appended).
- **Under the lesson's challenge:** `Pages/Lesson` reads the learner's own programme and hangs the
  concept's attempts on the `artifact_challenge` section. The kit's `ArtifactChallenge` shows the
  latest attempt's text (as TEXT, in a `<pre>`), its verdict, and earlier attempts behind a toggle.
  The composer sits behind *Revise and send it again* and still writes nothing.
- **Under the brief:** `Logic/Ordered timeline` hangs a brief's answers on its entry, with the date
  formatted by the graph. The kit's assignment card lists them through the one markdown path. A
  coach-read brief (the product's default) says *Your coach reads this…* rather than looking
  unfinished. The coach's programme view shows the same answers, in the coach's own words.

## The privacy floor (TASK-L185)

No real person's data goes in until the app can say what it holds, ask them to accept that, hand it
all back and delete it. Four pieces, each with one owner:

- **The notice is `privacy/notice.en.json`**: its words AND its version. It is this template's own,
  not the product's (which describes model calls, uploads and Google sign-in the template does not
  have). Edit it, bump `version` when anything that matters changes, then run
  `node tools/build-privacy.mjs`. That writes the GENERATED `str_privacy` half of `Data/Strings`
  (the `privacy` namespace, with `{{version}}` and `{{email}}` filled in) and the one server-side
  copy of the version in `__cloud__/shared/Notice`. Redeploy the functions and the site afterwards.
- **Acceptance.** `acceptPrivacy` is the only writer of `_User.privacyVersion` / `privacyAcceptedAt`,
  compared for EQUALITY, never back-filled. In `App`, the notice gate HOLDS the page (class
  `dbt-pages-held`, `display: none`, router still mounted) and renders `Privacy/Accept` in its place,
  so the address survives and accepting reloads it. `/privacy`, `/settings`, sign-in and the
  specimen are never held. The gate re-reads the account when the `User` node says it `changed`
  (through a tick node, because a run-driven Function may not also run on value changes — L165).
  **The browser's gate decides what is drawn; `capture` and `finishStep` refuse the WRITE** with
  their own body, `notice-not-accepted`, while the caller's version is stale.
- **Export and deletion read ONE plan**, `__cloud__/shared/Rows about`. `exportMine` hands the rows
  over as one file (leaving out a coach's internal notes and token values, and saying so at the
  top); `deleteMine` removes them children first, the learner profile after them, sessions just
  before the account and the account last. There is no transaction, so that ORDER is what makes a
  crash recoverable: a second run finishes it. The page asks for the word DELETE and the server
  checks it too. Nothing is kept afterwards.
- **`tools/check-privacy.mjs`** fails if a collection in `backend/schema.json` is neither in the plan
  nor excused with a reason, if any copy of the version disagrees with the notice, or if the notice
  names something (an AI company, Google, uploads, tokens, a connector, payments) the template has no
  node, function or setting for. Demonstrated failing by name all three ways.

**Two things only driving found.** After `deleteMine` the account's sessions are gone, so the Log Out
node FAILS and leaves the stored session behind; Home then held itself behind the acceptance screen
for somebody who had just deleted their account. Settings now forgets the session itself and loads
Home fresh with `?deleted=1`. And a component instance does not take `mounted` (the validator said
so before any render did), so `App` mounts a Group around `Privacy/Accept`.

**NodeGX sessions do not expire** (`oauth-routes.ts:475` writes no `expiresAt`), so the notice says a
sign-in lasts until you sign out. **The demo carries none of this**: `build-demo` drops the privacy
pages, the gate and Home's links by name, because the notice describes a real deployment and the demo
holds nothing.
