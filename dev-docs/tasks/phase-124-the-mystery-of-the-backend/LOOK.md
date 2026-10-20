# Gate 3 — what was built, and what it looks like

The canvas is graded the OWN-008 way: the stranger's report, the screens, the facts read back from the backend
beside them, and Richard's words on the real screen. Nothing here is a claim the canvas makes about itself.

## s1 (2026-10-20): the first stranger — "backend map"

**The lab:** `stranger/round.mjs canvas <labRoot>` (`stranger/README.md`); `<labRoot>/base` from
`npm create nodegx@0.2.3`, a copy of `templates/digital-bricks-training` as `training/`, `stranger/BACKEND.md`, the
running backend copy's URL and admin credential in two one-line files. The stranger: **Opus 5.5** in `claude -p`
(Claude Code 2.1.304), the kit's skill page, the `nodegx` server from the folder's `.mcp.json`, no repo, no git, no
web. Its wish is BRIEF.md's; the prompt as sent is `stranger/prompt.txt`.

**The round, measured** (`stranger/verify-s1.json`): 22.1 minutes, 160 turns, **$7.12** (API-equivalent; the kit was
cached), no quota stop, exit 0. Tools: 59 Bash, 49 Edit, 24 Write, 11 Read, 8 Grep, 1 Skill. Writes outside the lab:
three probe scripts in `/tmp/probe/` (its shell was `Bash(npm|npx|node|curl|…)`, pre-approved, not restricted). The
project copy in the lab and the one at the root hash the same before and after (244-file manifests). It left nothing
running. It made one call to the real backend (`POST /functions/finishStep` with the admin credential, refused, so
"what just ran" would have a row), changed no rule there, and said so.

**What it built** (`editor/`, 2,076 lines: a Node server of 210 lines over the kit's store and the admin API, a
`<canvas>` page of 1,109 lines, `words.js` for the sentences; its REPORT.md is beside it). `cd editor && npm start`
opens `../training` and the backend named in `../BACKEND-URL`; `node server.mjs <app> --backend <url> --token-file
<f> --port <n> --no-open` for any other. The admin credential stays in its server; the page never sees it.

- **One canvas, three columns:** the app's 9 screens ("where people click", each *asks N functions*), the 27
  functions ("the doors to the data, with their locks": a padlock coloured by who may run it, the rule in words
  under the name), the 27 tables ("where the data lives": rows, *sealed*, a shield coloured by who may open it).
- **Wires:** screen → function (*asks it to run*, blue), function → table *reads* (green) and *adds, changes,
  deletes* (amber), *names it in its code* (dotted) where the table is a variable, *rows point at rows* (dashed
  arcs) for links read from column names. A legend names the six.
- **Look at it as:** Everyone / Someone not signed in / A signed-in learner / Staff. What that person cannot reach
  dims, and one sentence says what they can: *"Someone not signed in can run 1 of 27 functions (unsubscribe), open
  0 tables directly, and reach 1 more only through those functions, which choose the rows in their own code."*
- **Is it secure?** A card of sentences from the live policy: the backend enforces; no table opens directly; **1
  function anyone can run without signing in, `unsubscribe`, which reads and changes rows in People**; the backend
  and the folder agree; nobody can make their own account; nobody can reach files directly; and what the map cannot
  see (which rows a function hands back is decided in its code).
- **What just ran:** polls `/executions` every 2 s; a run flashes its function green or red and sends sparks along
  its wires; the strip at the bottom says *"finishStep was turned away: nobody was signed in · just now · took 9 ms"*.
- **Taking control:** click a table → *Who may open it directly*: *Looking at rows* and *Adding, changing or deleting
  rows*, each Nobody / The staff group / Anyone signed in / Anyone at all, plus *whoever made a row may always see and
  change that row*; a sentence says what the choice will mean; **Make it so** sends the `PUT`, writes the same entry
  into `nodegx.security.json` through the kit's store, reads both back, and shows the backend's own dry run for a
  stranger, a learner and staff. A stale etag or a changed file stamp is refused in words; a failed file write puts
  the backend back. *Back to the app's standard rule* undoes it.
- **Not built, said so:** a function's call rule (it was asked for tables), the app running beside the map (it did
  not want to start a second backend), triggers and workflows (none to draw; the shapes are read).

**The screens:** `look/stranger-0-map-live.png` (the map with a run arriving and the safety card open) and
`look/stranger-1-progress-grant.png` (Progress opened, a staff-only choice previewed, the dry run), both the
stranger's own on the real backend; `look/s1-map.png` and `look/s1-lens-not-signed-in.png`, this session's own,
headless Chrome 1680×1000 on the same backend. By eye: dark ground, three tidy columns, wires readable one at a time
on hover and a tangle in the middle at rest (27 × 27), plain words everywhere, no JSON, no id, no x/y.

**Checked here, against the facts** (`stranger/facts.mjs` → `facts.json`, the map's own `/api/map` beside it):

| fact | backend / files | the map |
|---|---|---|
| tables, functions | 27, 27 | 27, 27 (headline *27 tables · 27 functions · 12 people*) |
| every table's rule | all 27 fall to the defaults, "nobody" | all 27 *sealed*; the card says so in one sentence |
| function → table touches, literal names | 34 (8 functions write) | all 34 drawn, 0 missing; **more** drawn as *names it* where the script holds the table in a variable or an alias (`addLearner` → LearnerInvite, LearnerProfile, ProjectContext: the words are in its script, the verb is not) |
| page → function calls | 20 `CloudFunction2` nodes | 31 calls (a node inside a component placed on several screens counts once per screen); every one names a real function |
| links between tables | 47 by name (mine: a person id → `_User`) | 45 by name, labelled *rows point at rows*, said on screen to be read from the names (its: `learnerId` → LearnerProfile, a different guess, both guesses) |
| the public function | `unsubscribe`, `call: public`, saves a `_User` row | the one amber line on the card and the one red padlock |
| a run | one row per function call | shown within 2 s, in words |
| the lens sentence | 1 of 27 functions public; 0 tables | the same |

The canvas is a `<canvas>` element, so a DOM gate cannot count its nodes; the gate reads `/api/map` against
`facts.json` and the screen by eye. Page errors in headless Chrome: 0.

**Taking control, driven here on the running copy** (the editor's `POST /api/table-rule`, the thing *Make it so*
sends): `Concept` → *Looking at rows: Anyone signed in*, *changing: Nobody*. Read back: the live policy has the entry;
`nodegx.security.json` has the same entry; the dry run answers *a signed-in learner may find, someone not signed in
may not*. **The backend restarted** (same data directory; it printed SB-015's *already configured* notice): the rule
is still live. `diff -rq` against the template: the one file that differs is `nodegx.security.json`. *Back to the
standard rule*: live entry gone, file **byte-identical to the template again**. The map answered after the restart.

**What the stranger found that this session had wrong or had not seen** (REPORT.md "Questions", ten of them):

1. **The policy file is read once.** BACKEND.md said the backend re-applies `nodegx.security.json` at every start;
   the stranger measured the kit's backend (`applyProjectPolicy`: only when the backend has no `security.json`) and
   said so. The repo's backend does the same (`backend-already-configured`). README §2 and §5.4 corrected.
2. **A refusal at the door is invisible**: a 403 from a rule is no run and no audit row. Confirmed here; filed
   `P124-S1-DOORREFUSALUNSEEN`.
3. **No suite for a backend editor**: the kit's editor suite has no edit kind for the policy file and no schema for
   it, so its PASS graded an empty edit script (it said so, and wrote its own tests: 11, all on copies, with restarts).
4. The kit has `functionScriptPortNames` for a script's ports and nothing for the records a script reaches; it asks
   for `functionScriptRecordTouches(script)` (README §5.1's gap, from the other side).
5. What makes a call happen (which button) is found by walking wires back to an `onClick` and reading the node's
   `label`; nothing in the node spec says how to find a call's cause.
6. `/admin/roles` lists only groups that exist; the rules name `role:staff` whether or not the group does.
7. No push channel for runs; `since` not said to be inclusive.

**Richard, on it** (PLAYTEST.md, from the screens): *"It looks so cool … very psychadelic, in a good way"*, and three
asks. Round 2 below.

## s2 (2026-10-20, late): the same stranger, with Richard's words — real people, one pathway, one row's reach

**The round:** `round.mjs canvas <labRoot> --again stranger/richard-said-2.txt` (his words verbatim, plus
`stranger/BACKEND-2.md`: a key bound to a person on the MCP door runs a function AS them, measured first on all 12
people). Same session resumed, same lab. **19.0 minutes, 118 turns, $13.40**, exit 0; 67 Edit, 19 Bash, 19 Read,
9 Write. Project copies unchanged (lab and root). It left nothing running (the teardown's five Chrome processes were
this session's own headless Chrome from the s1 screenshots, cwd in the lab). On the real backend afterwards: 42 keys,
**0 usable** (every map key revoked; the backend keeps revoked records), 72 runs, 0 tables with a rule of their own.

**What it built** (`editor/`, now 2,680 lines + `public/render.js`; REPORT.md "Round 2"):

- **People**, a fourth column on the far left: the 12 real accounts, and *A real person…* in the top bar. Picked,
  the map asks the backend two things under a short-lived key bound to them: which functions it offers them
  (`tools/list`, runs nothing) and whether it would let them open each table (`permissions/check`). Their pathways
  go pink, the rest dims, and the note says it: *"As Marie Dubois: the backend lets them run 12 of 27 functions and
  open 0 tables directly."*
- **Follow a pathway:** with Marie picked, click Course: every function the screen asks for is run as her or shown
  with the reason it was not (*not allowed* by the backend: `learnerProgramme`, `openThreadAsCoach`, `replyAsCoach`;
  *not run* because it changes data: `openThread`, `sendMessage`). The real answer is laid out the way the screen
  lists it: her project *Parent evening booking*, 13 entries, her conversation *A question for my coach*. The panel
  says these are real runs, by a key named `view-as-marie-dubois-by-backend-map`, deleted straight after.
- **One row's reach:** click a table, pick a row, *Find who can reach it*. For each of the 12 and for someone not
  signed in: directly (the dry run with the row, `get` and `find`) and through every read-only function that touches
  the table, run as them, the row's ids looked for in the answer; required arguments taken from the row when the
  names match and said so. For `conv-l-marie`: **"2 of 12 people can reach this row: Marie Dubois, Richard Osborne.
  Someone not signed in can't. Nobody can open it directly: every pathway goes through a function."** Marie through
  `course` and `exportMine`; the staff member through `learnerProgramme` *(asked with learnerId = l-marie, this
  row's learnerId)*; the other ten *can't reach it: course and exportMine answered without it; the backend's rule
  check says no to opening it directly*. What it did not check is listed (the writing functions). On the map, two
  people tagged REACHES IT with pink wires through the function that hands the row over, ten tagged CAN'T REACH IT.
- **Its runs are its own:** each shows in *What just ran* as *"course worked · run by this map, as Marie Dubois"*
  with a pink border; runs made with other keys are named by their key through the audit's `mcp.tool.call` row
  (the same request id), so this session's `who-probe-…` measurement runs are labelled too. The page is checked
  for `ngxk_` (no secret reaches it); leftover map keys are swept at start and stop.

**The screens:** `look/stranger-2-as-marie-course.png`, `look/stranger-3-one-conversation-reach.png`, both the
stranger's own on the real backend.

**Checked here, against this session's own measurement** (README §s2: `course` run as each of the 12 through the
MCP door, before the round): Marie's answer contains `conv-l-marie`, the other eleven's do not, staff is offered 27
tools and a learner 12. The map's sentences say the same. Read back through the editor's own API on the real
backend (`POST /api/as/screen` Marie + Pages/Course; `POST /api/record-reach` Conversation `conv-l-marie`): Course as
Marie = `course` **ran**, `learnerProgramme` / `openThreadAsCoach` / `replyAsCoach` **not allowed** (the backend's
answer), `openThread` / `sendMessage` **not run** (they create rows); the row's reach = 12 people answered, Marie
`true` through `course` and `exportMine`, the staff member `true` through `learnerProgramme`, the other ten `false`,
the same two names this session's own 12-key probe found.

**What it found** (REPORT.md "What I had to decide"): deleting a key revokes it and the backend keeps the record,
so "no key left" has to mean "no usable key"; the run record does not name the key, the audit does; which arguments
a function needs is read from the tool's description and the row; the staff member reaches every learner's
conversation through `learnerProgramme` because that function takes the learner id from its caller: by design for
a coach, and now on screen.
