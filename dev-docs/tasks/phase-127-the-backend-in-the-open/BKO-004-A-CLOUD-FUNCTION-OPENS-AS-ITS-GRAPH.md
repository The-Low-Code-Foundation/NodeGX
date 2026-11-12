# BKO-004 — A cloud function opens as its graph

**Phase:** [127](README.md). **Depends on:** nothing in BKO-001 (functions are already files). **Repos:** nodegx-studio
(the Workflow tab), the map.

## Today

A cloud function is a node graph in the project (`__cloud__/…`, a `Request` node in, nodes, a `Response` out). Studio
draws a step that calls one as "Runs on the backend" (`studio.html:3588,3598`) and never opens it. `__` components are
left out of the reusables (`studio.html:1279`). The map draws a function as a box whose panel lists labelled nodes as
text (`project.mjs:190`, `app.js:1732-1745`).

## What it becomes

- "Runs on the backend" is a link. It opens the function on the Workflow tab, drawn as STU-026 draws a page's
  workflow: the dark canvas, coloured wires, steps as nodes, the inputs it takes and the answer it gives, and Bubble's
  landmarks ("When this function is called", "Return"). The records it reads and writes are named (`touches`, the
  map's word).
- Workflow gets a second list beside "Workflows on this page": **On the backend**, listing every cloud function (and,
  after BKO-005, the backend workflows and triggers).
- The map's function panel gets "Open its steps ↗" to the same view.
- The last run lit up, from `/executions` (STU-026 s22 does this for a page's last run).
- Read-only in this task. Changing a step is the existing Design / composer path (or the agent) for now.

## Acceptance

1. On the training copy's 27 functions and on a fresh agent-made function, each opens as a drawn graph. None is drawn
   empty or as a single box. Screens go in `look/`.
2. A function called by a button: from that button's workflow, one click reaches the function's graph, and Back
   returns.
3. Inside the conversation, it draws (it is Studio's own DOM, so expect yes; check it anyway).
4. `check:editor` gains the specs; the existing ones stay green.

## Session log

### s4 (2026-10-26): built and graded (nodegx-studio `3263783`)

**Measured first.** The training app's functions are wired by VALUE, not by signal: a script runs when its input
changes, a Response sends on a script's Done. The page workflow's `chain()` follows signals only, so it would have
drawn most of them as one box. Five templates hold 83 cloud components (76 called from an app, 7 shared helpers with
Component Inputs / Outputs instead of a Request).

**Built (nodegx-studio):**
- `editor/fngraph.mjs`, pure: the layout (a column per step from where the function starts, by the longest path over
  every wire; a loop's closing wire found first and left out of it; the answers in the last column, a refusal below
  an answer), the Request's asks, a Response's words, a placed helper's key, the names a script gives the records API.
- Workflow's second list, **On the backend**: every function, the called ones first, then the parts they place.
  Opening one draws it in STU-026's look: "When this function is called" (what it is sent, who may call it), the
  steps, "Return" / "Refuse" (what it answers with, or its message), wires coloured as a signal, a value or a
  failure. A placed helper has "Open its steps ↗"; Back and Esc come back.
- A step that runs a function says "Runs on the backend: <name> ↗"; one click opens it; Back returns to that
  workflow card (which keeps its own Back to Design).
- What it reads and writes, as the map reads it: `GET /api/functions` in `serve.mjs` runs the map's own
  `analyseProject` (imported by file: the package exports only its server). With no backend up the map knows no
  table, so every function said nothing (measured: 0 of 27); the names a function's scripts give `Records.query(…)`
  and the like are handed in too, and 22 of 27 now say theirs. With a backend up, its schema adds the rest.
- Its last run, from `GET /executions` on the bound backend, in a line: when, how it ended, how long. Not its steps:
  a function's run records no nodes (**P127-BKO004-FNSTEPS**, filed, low).
- The map's panel (`public/app.js`): "Open its steps ↗" when the map sits in a frame, posting the function to the
  page around it. Studio obeys it only from its own map frame; Back goes to Data → Map. **Not live until
  `@nodegx/backend-map` 0.1.3 is published** (Studio pins 0.1.2).
- Read only, said on screen. Design does not open a cloud function, so the line says to ask the agent (the task's
  "Design / composer path" does not exist for functions).

Two traps met on the way (in this session's own code, fixed before it shipped): Studio's `portsOf` reads a port in
the OPEN PAGE's context, so for a function's nodes it threw and fell back to guessing by name, and every wire read
as a value; the function view reads the node specs directly, at both ends of a wire. And a no-backend Studio handed
the map no table names (above).

**Graded:**
- `editor/fngraph-check.mjs` (no browser) **695/695**: every function of five templates laid out, started in the
  first column, answers last, every node placed once, no wire inside a column; a loop and a loose node; the names a
  script gives the records API.
- `editor/functions-check.mjs` (Chrome, a copy of the training app, no backend) **46/46**: all 33 listed; the 27;
  every one drawn with one card per node and one wire per wire **read from its files**, the start first, the answers
  last, no card empty or overlapping, every data type its record nodes and own scripts name in its touch chips;
  `course` with exactly 1 signal, 5 values, 3 failures and "reads … Concept … LearnerProfile" (through its helpers);
  the helper and back (Esc); from Unsubscribe's "Stop these emails" workflow one click to `unsubscribe` and Back to
  that workflow (Settings' button first: Studio follows the app's redirect of a visitor to Sign in, so the public
  page); a function the kit's MCP server makes with `create_component` while Studio is open, listed and drawn with
  its signals and values told apart.
- `editor/hosted-check.mjs` (the panel at a foreign origin with the host's CSP) **16/16**, 4 new: the agent's
  function draws inside the conversation (5 cards, 10 wires), its touches asked across origins and answered, "Not run
  on this backend yet", then, deployed with `deploy_cloud_functions` and called once, "● Last run … refused:
  Unauthenticated requests not accepted · 12 ms" (true: it takes signed-in callers only); a message from anywhere but
  the map frame is not obeyed; from the map frame it opens the function; Back goes to the map.
- The map's `test/ui.test.mjs`: on its own, no link; in a frame, pressing it posts `__cloud__/course`.
- Mutants (a scratch copy of Studio, never the tree), each red: no signals = 2; no step link = 2; answers not forced
  last = 5; no script table names = 10; Back clears to the list = 1; the helper link opening the same function = 1.
- Studio's whole `check` list, run one by one: every gate green (`check:editor` 204/204, data 80/80, timeline 53/53,
  import 94/94, app 54/54, publish 34/34, server 17/17, unbuilt 17/17, layout tips 10/10, rules, phrases, pagedata,
  reusable), except `vendor --check`, red at HEAD: `3931ddf` moved the map pin to 0.1.2 and left `vendor/NODEGX.json`
  saying 0.1.1. `vendor/` holds nothing built from the map; the record is corrected (PASS, 929 files).

**Against the acceptance list:** AC1 ✅ (27 + 6 helpers + an agent-made one; `look/bko-004-course.png`,
`-helper.png`, `-agent-made.png`). AC2 ✅ (`look/bko-004-step-link.png`). AC3 ✅ in the fake host
(`look/bko-004-hosted-function*.png`); in Claude Desktop it waits on the same rebuild as BKO-002 AC2. AC4 ✅ with one
change of shape: the specs are a gate of their own (`check:functions`, in `check`), not lines in `check:editor`,
because they need the training app from a NodeGX checkout and `check:editor` runs on the vendored todo template.

**Left:** the map's link reaches people with 0.1.3 (Richard's OTP); the steps of a run (FNSTEPS); five training
functions name their tables through variables, which the map counts as "mentions" and the chips leave out.
