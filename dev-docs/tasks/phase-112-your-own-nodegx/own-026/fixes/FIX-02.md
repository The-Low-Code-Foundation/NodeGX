# FIX-02 — after t1-nodegx-2: what the kit says must arrive, and a record must be read from the backend

**Written 2026-10-22 ~20:50 CEST by the lab session.** Read `README.md` here first. **Gates:** the next NodeGX round
(t1-nodegx-3) waits for items A–D. The plain-code rounds run meanwhile (t1-code-3, then t1-harness-3).

## Where it stands

| round | kit | score | failed |
|---|---|---|---|
| t1-nodegx-1 | 0.2.5 (registry) | 16/22 | F7, T3, T5, T7, T8, T9 |
| t1-nodegx-2 | FIX-01 (`ddd876378`) | **17/22** | F6, T1, T2, T5, T9 |
| plain-code arms so far | — | 20, 21, 21, 21 | T6 every time (+ F6 once) |

**FIX-01 worked where it was delivered:** the backend came up enforced (`devOpen: false`); T7 and T8 (another user's
token, no token) now pass; DeepSeek found `cloud-query-own-rows` and wrote `visualFilter` on 2 of its 4 Query Records;
T3 (double press) passed; script share fell from 17 Function nodes / 346 lines to 14 / 114. Evidence:
`/Users/Shared/nodegx-lab/own026/t1-nodegx-2/` (journal `sittings/1/agent.jsonl`), grade
`/Users/Shared/nodegx-lab/own026-grades/t1-nodegx-2/grade.json`, `LEARNINGS.md` #2.

## A. A Record by Id reads only memory, so a page opened by its URL shows an empty record (gates)

T1 and T2: reload the game page → "You are on the Moon", and the next launch **overwrites** the child's real progress
(Asteroids → Mars). The page reads the child with a `DbModel2` (Record) whose `Id` is wired from `PageInputs`
(`pm-child`), and no `fetch` is wired. Measured in the runtime: `dbmodelnode2.ts` `setModelID` binds
`(modelScope || Model).get(id)`, the **in-memory** copy (a new empty one when nothing loaded it), and `setModel` then
sends **`fetched`** although nothing was fetched. Coming from Home works only because Home's Query Records had already
put the record in memory. Any page reached by URL (a reload, a bookmark, a second device, a shared link) gets an empty
record, and an Update Record fed from it writes the emptiness back.

Decide and build the smallest honest fix; measure, don't assume. Candidates: the node fetches when the record it binds
has never been loaded from the backend (a runtime change: check the editor, the exporter and every spec that relies on
today's behaviour); a validator rule (a Record whose Id is wired and whose `fetch` is not, on a page with a route
parameter, gets a warning with the fix); the node description says it; `fetched` stops firing for a record that wasn't
fetched. Whatever you choose: a page reloaded on its own URL shows the stored record.

## B. The kit's guidance never reaches a model whose harness cuts long tool results (gates)

FIX-01 C was written into `get_project_info`'s `backendDoctrine`. **DeepSeek never saw it.** That result was 51,834
characters; Cline keeps about 8,000 of any tool result (the start and the end, `CLINE_MESSAGE_BUILDER_MAX_TOOL_RESULT_CHARS`,
OWN-020), and the lesson sat at character 40,311. DeepSeek read the cut-result cache twice, for other results. **26 of
its nodegx results were over 8,000 characters** this round: `get_project_info` 51,834; the style categories 39,680;
`list_examples` 32,151; `get_node_type` answers 25,901 / 19,438 / 18,511 / 16,378 / 13,984; the vocabulary 18,404;
two `describe` answers 16,052 / 13,687; a `create_component` result 12,815. (Vibe's cap is 50 KiB, OWN-019.)

The goal: what an agent must know to build safely reaches it inside the first ~4,000 characters of the result it
already asks for, and the rest is fetchable by name. Candidates: `get_project_info` leads with a short index of what it
holds and the handful of rules that cost a rebuild when missed, with the rest behind a `section` argument; a lesson
also appears where the decision is made (a write's result, as an `info` diagnostic, when it adds an Update Record
whose field values come from page state: "several devices change this value? change it by the amount" with the example
id); long `get_node_type` answers put the shape and traps first. Measure the before and after: for each of the kit's
guidance texts, does it survive an 8,000-character middle cut?

## C. `update_component` called with `create_component`'s arguments (gates, small)

11 of the round's 26 refused calls were the same: `update_component` with `nodes` / `connections` / `description`, for
components that **did not exist yet**, mixed into batches whose other calls were correct `create_component`s. The
refusal lists `update_component`'s own arguments, and `didYouMean` is `null` for all three, so the same slip came back
all run long. Say what happened: "`Components/X` does not exist, and these are `create_component`'s arguments: call
`create_component`" (or accept the create shape when the component is absent; your call, and say why).

## D. Buttons 35 px tall by default (gates, small, generic)

Both NodeGX rounds failed T9 on the same thing: main buttons measured 35–37 px at 390 px wide (sign in, start, next,
unlock, add, reset, remove); every plain-code arm passed. Find where the 35 comes from (the Button's default height,
padding, or a token) and make the kit's default a comfortable touch target (44 px is the usual guidance), without
changing a project that already set its own.

## Not now (don't gate)

- **A literal `—`** shows on two screens (the grader saw the six characters): DeepSeek escaped twice inside a
  JSON string. A warning when a text parameter holds a literal `\uXXXX` would catch it. Small; add it to C if it's free.
- F6 (a start on the Moon read as one of the 8 planets) is a reading of the request, as in one plain-code round.
- `P112-OWN026-NESTEDCHROME`, `-SBR009HOME` (open from FIX-01).

## Done

(the fixer writes this)
