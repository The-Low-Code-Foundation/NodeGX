# Phase 124 — The mystery of the backend

**Scoped:** 2026-10-20 (s1, Fable 5.1), from the close of the OWN-023 positioning interview
(`reviews/THE-PLACE-NODEGX-BESIDE-REPLIT.md` §9.4 and §10, handoff `phase-112-your-own-nodegx/own-023/NEXT-SESSION-PROMPT.md`).
**This is a prototype phase in the shape Phase 118 set and Phase 123 kept: four files and a handoff (this README is the
think, [BRIEF.md](BRIEF.md) his words and the wish, [LOOK.md](LOOK.md) what was built and what it looks like,
[PLAYTEST.md](PLAYTEST.md) his sitting), no task grid, its own gate (`editor/check.mjs` once there is an editor), no
defect rows until it takes a lane.** It is a lane-3 artefact (full stack, our own backend) built the lane-2 way (an
editor from the kit, OWN-008's route). The board lists it in §4 until Richard says otherwise. **Prefix: `WHO`.**
**Status: 🟡 s1 — the think written (§3), a copy of a real backend running and measured (§2), the first Opus stranger
built the §3 shape from the kit in 22 minutes for $7.12 ("backend map", `editor/`, LOOK.md: 27 tables, 27 functions,
9 screens, the lens per person, the *Is it secure?* card, live runs, a grant that writes the backend and the file and
held through a restart here); two bugs filed (`P124-S1-WRITESRECORDSJS`, `P124-S1-DOORREFUSALUNSEEN`); the stranger
corrected s1's cheat-sheet on when the policy file is read. Waits on Richard: §7's three rulings and the sitting
(PLAYTEST.md).**

> "I want the mystery of the backend / cloud functions and the database schema and management, privacy etc., to become
> as cool as the star wars editor or the kids block editor we made in a recent session. … Having that DB view FUSED with
> the backend workflows and functions that make it work would be a very interesting thing, and a way to complete the
> 'I can explain all of this and you can take control' argument." — Richard, 2026-10-20 (the whole of it in BRIEF.md)

## 0. The answer in a paragraph

The canvas draws the things a client asks about and nothing else: the **tables** (where is the data), the **people**
who may touch them (who can see it), the **functions, workflows and triggers** that touch them (why does it do X),
and the **runs** that just happened (did it). A wire is a real fact read from the running backend or from the project's
files: a relation, a permission, a touch (this function reads that table, writes this one), a call (this page calls
that function), a firing (this trigger runs that). When the app runs, the facts light up in order along the wires. The
person's hands do three things: click a thing to see everything that touches it, drag a person onto a table to grant
(and cut the wire to revoke), drop a function on a table to make a trigger. What a function computes stays in the
function editor; row data stays a table; secrets stay a lock. "I can explain all of this" is true when a non-coder
answers *where is the data, who can see it, why does it do X* from the canvas without asking anyone; "you can take
control" is true when the grant is a drag and the backend obeys it. §2 measures a real backend of Richard's against
this; §3 is the think; §7 is what he has to rule.

## 1. Where it comes from

The positioning session (OWN-023, review §9) found what Richard sells: *a human who checks*, and the one editor job
Claude's screenshots do not take from him: catching what the client did not ask for, in the schema and the decisions.
The client questions he could always answer in Bubble and cannot about a Claude Code app (review §9.1 Q9–Q10) are all
backend questions: where the data is and who can see it; why it does X when he clicks Y; is it secure; what if we grow,
move, sell. The front half of the workbench exists (the editor, Studio, the preview). The back half is P104's admin
manager (fourteen views, good, "nothing here looks like a serious BaaS … something a non technical person could still
use") and P43's unanswered question ("wtf is the difference" between a workflow and a function). Nobody has drawn the
backend. That is this phase.

## 2. The ground, measured (s1, 2026-10-20)

A copy of Richard's real training product (`templates/digital-bricks-training`, the product behind the `dbt-lessons`
connector) was given its own backend from the repo's `nodegx-backend` (rebuilt first: 9 source files were newer than
`dist/`), its schema, policy, seed rows and functions applied with the template's own tools:

| what | measured |
|---|---|
| tables | **26 + `_User`** (`GET /admin/schema`), 47 indexes; **0 columns typed Pointer or Relation**: every link is by name (`conceptId` → `Concept.conceptId`, a unique index; 47 such links read by `stranger/facts.mjs`) |
| rows | 277 in 25 collections; 12 users, 1 role (`staff`, 1 member) |
| rules | `collections: {}` — **every table falls to the default "nobody"**; the only door to any row is a function. 27 functions: 11 `authenticated`, 15 `role:staff`, **1 public** (`unsubscribe`, which saves a `_User` row), 0 with a rate limit (`stranger/facts.mjs`) |
| functions | 27 endpoints + 6 helpers in one bundle. **0 record nodes.** All record access is inside 40 `JavaScriptFunction` nodes (17 `Records.query`, 11 `.save`, 6 `.create`; 13 name their collection as a literal, the rest through a variable) and 6 shared helper components; 20 of the 27 are called from a page |
| `writesRecords` | **`false` for all 27** (`GET /health`), because the backend reads the graph's record-node types only. At least 8 write by a literal name (`copyLesson`, `finishStep`, `openThread`, `openThreadAsCoach`, `publishLesson`, `replyAsCoach`, `saveLessonDraft`, `sendMessage`) and 7 more call `.save` on a variable. Filed: `P124-S1-WRITESRECORDSJS` |
| workflows, triggers | **0 and 0** (`/admin/workflow-defs`, `/admin/triggers`); 15 step kinds served (`/admin/workflow-step-kinds`) |
| the app's calls | 20 `CloudFunction2` nodes in the pages, each naming its function (`parameters.function`): the page → function wire is in the project files |
| a run | one `POST /functions/conceptList` leaves one row in `GET /executions` (id, name, status, startedAt, durationMs, errorMessage) and `X-Total-Count`; `GET /executions/<id>` adds the steps. The row does **not** say which collections the run touched |
| the audit | `GET /admin/audit` — every admin action (who, what, outcome, target), 32 rows after setup |
| a decision | `POST /admin/permissions/check` `{principal, collection, op}` or `{principal, functionName}` answers in words (BMG-006's *Try it as*) |
| a grant | `PUT /admin/permissions/collections/<name>` is live at once and survives a restart: the backend applies the project's `nodegx.security.json` **only on a backend that has no policy yet** (SB-015 `applyProjectPolicy`, `backend-already-configured` afterwards, a console notice). So a live grant that does not also change the file leaves the FILE wrong: the next fresh backend provisioned from the project (a VM, a colleague, Studio) starts with the old rules. s1's cheat-sheet said the opposite; the stranger measured it and was right (LOOK.md) |

Three of these are decisions a vouching person would want to catch on sight, and no screen today shows them together:
nobody can read any table directly (good, and invisible); the whole access story is in function code that the backend
reports as writing nothing; and there are no declared relations, so no tool can draw the data's shape without reading
column names.

## 3. The think: what is a node, what is a wire, what moves, what the hands do, what stays text

### 3.1 A node is a thing a client would ask about

| node | drawn as | from |
|---|---|---|
| **a table** (collection) | a card: its name, its fields (a relation field is a wire, not a line of text), a live row count, three sample rows on click | `/admin/schema`, `/api/<collection>?limit=` |
| **a person** (a principal) | one card each: *Anyone*, *Signed in*, *The owner* (creatorOwns), each role by name with its members, *Nobody* drawn as the absence of wires, never as a card | the rule vocabulary (`public`, `authenticated`, `role:<name>`, `nobody`) and `/admin/roles` |
| **a function** | a card: its name, its call rule as a badge, its last run (status, when, how long) | `/admin/permissions/functions`, `/executions?name=` |
| **a workflow** | a card that expands in place into its steps (the step kinds are already words) | `/admin/workflow-defs` |
| **a trigger** | a small node with its kind as a picture: a clock (schedule), a bell at the door (webhook), a sensor on a table (db-change) | `/admin/triggers` |
| **the app** | one card, "the app", with the pages that call functions listed on hover | the project's `CloudFunction2` nodes |
| **a run** | not a node: a pulse along the wires and a row in a timeline drawer | `/executions` |

Not a node: a row (a table's content), a field (part of the table card), a rule (a wire), a step (inside a workflow), a
secret (a lock badge on the function that uses it), an index (text on the table card, folded).

### 3.2 A wire is a real relation, permission, touch, call or firing

| wire | from → to | drawn | read from |
|---|---|---|---|
| **relation** | table → table | a thin line labelled with the field, a crow's foot where many | a column typed Pointer/Relation with `targetClass`; where there are none (§2), a column named `<table>Id` matching the other table's unique key, labelled *by name* so the inference is visible |
| **permission** | person → table | one wire per pair carrying the ops it allows as letters (R for find+get, C, U, D), colour by the widest op; a dashed wire where the rule narrows with `onlyWhile` or a `{path}` | `/admin/permissions` collections and defaults |
| **may call** | person → function | the same wire into a function | the function's `call` rule |
| **touch** | function → table | solid into the table for a write, dashed out of it for a read | the function's graph (record node types + their collection) **and its JavaScript** (`Records.<verb>('<name>'`), labelled *mentions* where the name is a variable; the honest long-term source is the run row (§5) |
| **call** | app → function, workflow step → function | an arrow | `CloudFunction2.parameters.function`; a `call-function` step's `ref` |
| **fire** | trigger → function or workflow; table → db-change trigger | an arrow; a sensor wire from the table | `TriggerDef.target`, `dbChange.collection` |

A wire that cannot be read is not drawn. The canvas never draws a guess as a fact; *by name* and *mentions* are the
two labelled inferences, and both are gone the day the backend records what a run touched.

### 3.3 When the backend runs, the facts light up in order

The canvas polls `/executions` (2 s, `since=` the last row seen; `X-Total-Count` says whether anything is new). A new
run of function F lights **app → F** (or **trigger → F**), then each **F → table** wire it touches, in the order the run
made them; the run's row slides into a timeline drawer at the bottom (P123 M4's shape: one axis, each row linked to its
node). An error run flashes red on the wire where it stopped and the words of its `errorMessage` appear on the function
card. Clicking a row replays its pulse. A table whose row count changed ticks its number.

The pulse is the fusion demo and the answer to *why does it do X when I click Y*: the real app runs beside the canvas
(`@nodegx/preview`'s in-page bundle, the way Big Blocks did it); the person clicks a button in the app and watches the
call cross the backend. Today the row does not carry the touches, so the pulse along **F → table** is drawn from the
static touches (§3.2) at the run's time, not from the run. That is the first thing to fix in the backend (§5).

### 3.4 What the person does with their hands

1. **Click a thing, see what touches it.** Click a table: every wire into it brightens, everything else dims, and a
   sentence is written at the top from the rules in words (P104's `ruleVocabulary`): *"Lesson: nobody reads it
   directly; 4 functions read it, 2 write it; staff only."* Click a function: its touches, its callers, its rule, its
   last five runs. Click a person: everything they may touch, in one colour.
2. **Grant by dragging, revoke by cutting.** Drag a person card onto a table: a three-letter chooser (read, write,
   delete) appears on the new wire; the grant is `PUT /admin/permissions/collections/<name>` **and** the same change
   written into the project's `nodegx.security.json` through the kit's store, so it is live now and true after a
   restart. Cut the wire: the rule falls back to the defaults (`DELETE` the collection's entry, and the file). A wire
   that would open a table to *Anyone* asks once, in words, what that means (*"anyone on the internet could read every
   row of Lesson"*).
3. **Drop a function on a table to make a trigger.** The sensor appears on the table with *when a row is created /
   changed / deleted* as three ticks; it is `POST /admin/triggers` with `dbChange`. Drop a clock on a function: a
   schedule, with the sentence and next runs from `/admin/triggers/preview` (BMG-008).
4. **Ask.** A question bar with the client's five questions as buttons: *where is the data* (every table, with its row
   count and where the backend runs), *who can see X* (pick a table), *why does it do X* (pick a page's button: the
   call chain lights), *is it secure* (`devOpen`, public tables, public functions with writes, functions without a rate
   limit, listed in words), *what if we move* (the export routes that exist, named; this is P18's offramp and is text).
5. **Try it as.** Pick a person and a table or function; the backend's own dry run answers in a sentence
   (`/admin/permissions/check`). No request is made, nothing changes.

### 3.5 What stays text, because drawing it would be worse

- **What a function computes.** Its graph and its JavaScript stay in the function editor (P59/P64's visual function);
  the card has an *Open* that goes there. The canvas shows what it touches, never how.
- **A workflow's conditions and transforms** (the declarative 19-operator language): words on the step, as today.
- **Row data**: a table, in a drawer, P104's collection view. **Fields and indexes**: a list on the card.
- **Rate limits, timeouts, idempotency, concurrency**: one line of words on the card, from the backend's own sentences.
- **Secrets**: a lock on the function that uses one, with its name; never a node, never a value.
- **The audit**: a list, filtered to the thing clicked.
- **Email, files, backups, keys, OAuth**: the manager's (P104). The canvas links to them; it does not redraw them.

### 3.6 What makes it "cool", from the two verdicts that were measured

OWN-008 s6 is the only measurement of "cool" in the repo. Big Blocks ("really cool, really well thought out"): huge
targets, plain words, the real app beside it, a ring on the app for the picked block, blocks that flash when the app
uses them. The map ("visually impressive"): motion on the connectors that means something, a battle that is the
project's own numbers. The table ("Nope"): bookkeeping shown as content. So the rules this canvas has to keep:

1. **Plain words on every card**, from the backend's own vocabulary; never `find`/`get`, never `CLP`, never an id.
2. **The real app beside it**, and the pulse when it is used. A canvas that does not move when the app runs is a
   schema diagram, and every BaaS has one.
3. **Things flash when they are used**, in the order they are used.
4. **No bookkeeping as content**: no x/y, no ids, no JSON, no port names.
5. **A metaphor is allowed only where it explains access** (a door with a key reads as *who may enter*; a spaceship
   does not), and the builder picks it: the brief says the feeling, not the picture. The verdict is Richard's, on a
   screen (memory: *an editor shape must be one a person would want*; *a working wireframe is not the mockup*).

## 4. The route

The P123 shape, the OWN-008 way, on the handoff's three recommendations (§7 asks Richard to confirm each):

- **In the kit, as another editor** (not in Studio yet): a stranger can build it in a session from the npm kit, a
  running backend and a page saying what the backend answers (`stranger/BACKEND.md`); it moves to Studio if it wins.
- **On a copy of a real backend of his** (§2): a fixture has no decisions to catch.
- **A stranger builds, this session briefs and grades, Richard judges on a screen.** The stranger is an Opus `claude -p`
  in a sealed lab (`stranger/round.mjs`, OWN-008's runner with the project and the backend swapped in; the lab holds
  the kit base from `npm create nodegx@0.2.3`, a copy of the training project, `BACKEND.md`, and the backend's URL and
  admin credential, which is the situation a person is in). Its report, screens and the kit's checks sit in LOOK.md.
  If it fails, s2 builds the §3 shape by hand in `editor/`, P123's way.

## 5. What the backend cannot tell yet (the kit gaps this canvas names)

1. **A run does not say what it touched.** `/executions/<id>` has steps for a workflow and nothing for a function's
   reads and writes. Until it does, the touch wires are static and labelled; the fix is a per-run list of
   `{collection, op, count}` recorded by the data door when the call carries the run's id (`FunctionRuns` already
   threads one through loopback requests).
2. **`writesRecords` reads node types only** (`P124-S1-WRITESRECORDSJS`): a function that writes from JavaScript is
   reported as writing nothing, and DEF-009's public-write default is decided on that flag.
3. **No declared relations in a real app.** The product links by name. The world files (`docs/world/relations.json`,
   P116) say relations in words where they exist; this template has none. The canvas infers *by name* and says so.
4. **Two writers of the rules.** The file (`nodegx.security.json`) and the live config (`/admin/permissions`); the
   file is read once, on a backend's first start, and never again. A grant must write both, or the next backend
   provisioned from the project starts with the old rules; nothing today says when the two disagree. The kit has no
   one call that writes both, and no check that reads both.
5. **No way to run a function as a person from the admin door.** `permissions/check` answers whether; nothing runs it
   as them (this product signs in by magic link, so a demo run needs a mailbox). The canvas can show runs, not make one.

## 6. The gate (when there is an editor)

`editor/check.mjs` on a fresh copy of the training template with a fresh backend: every table on the canvas is one in
`/admin/schema`; every permission wire matches `/admin/permissions` (the defaults included: a table with no wire is
"nobody"); every touch wire names a collection the function's graph or JavaScript names; the pulse appears within 3 s
of a `POST /functions/<name>`; a grant made by drag is read back from `/admin/permissions` **and** from the project
file; a revoke falls back to the defaults in both; a dropped function makes a trigger `/admin/triggers` lists; the
project folder is otherwise byte-identical. Every assertion reads the backend or the files, never the canvas's claim.

## 7. Rulings for Richard, in plain words

1. **Where should this live first?** In the kit as its own editor page, like Big Blocks (a stranger built it in 25
   minutes; this is the route s1 took), or inside NodeGX Studio beside the Design / Workflow / Data tabs (where the
   workflow already sits on its element). Recommendation: the kit first, Studio if it wins.
2. **Which backend should it be judged on?** The training product's copy (26 tables, 27 functions, 12 users, a `staff`
   role, no workflows or triggers: s1's choice), lingo's, or a client's copy. The training product has the sharpest
   decisions to catch (§2). It has no workflows, so the trigger and workflow half is seen only if s2 adds one.
3. **Who builds the next round?** The stranger again with your words (OWN-008's loop, ~25 minutes and ~$30 a round),
   or a hand-built cut from §3 in `editor/`. Recommendation: whichever screen you like more after the first round.

## 8. Sessions

- **s1 (2026-10-20, Fable 5.1):** read the ground (review §9–10, OWN-008, P104, P43, P27, P64, Studio's scope, the
  security model, the workflow and trigger types, the admin routes); rebuilt the backend's dist; ran a copy of the
  training product's backend and measured it (§2); filed `P124-S1-WRITESRECORDSJS`; wrote the think (§3), the brief,
  `stranger/BACKEND.md`, the runner and `facts.mjs`; ran the first stranger (LOOK.md: 22 min, $7.12, the shape built);
  graded it against the facts, drove a grant and a restart on the running copy, kept its editor in `editor/`; filed
  `P124-S1-DOORREFUSALUNSEEN` from its report; corrected §2/§5.4 on the policy file (read once, not every start).
