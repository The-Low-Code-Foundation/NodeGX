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

**2026-10-22, fixer session.** Commits `f3d2a66e9` (A), `328f1dd1d` (B + C + D), plus the ledger/Done commit after
them. **Kit:** `/Users/Shared/nodegx-lab/kits/FIX-02-328f1dd1d/`, packed under HEAVY.lock in the clean worktree
`OpenNoodl-worktrees/own026-fix02-pack` at `328f1dd1d` (`git status` empty after; runtime `build:types` first):

| tarball | sha1 |
|---|---|
| `nodegx-mcp-0.2.5.tgz` | `4f91df0e9ef173938945ce0a01316a63769839f8` |
| `create-nodegx-0.2.5.tgz` | `cee60bdc412884eb655e2816f80973293f3eeb6d` (byte-identical to the registry's: nothing in it changed) |
| `nodegx-preview-0.2.4.tgz` | `6a659b0586fe0c96c00c36af59d4ead56cec8b0e` (**new in this kit**: it carries A, see below) |

**🔴 For the lab: A lives in the runtime, and the app the grader starts is `npx @nodegx/preview` from the registry
(0.2.4, before the fix).** The kit's MCP (its `render_report` / `drive_page`) has the fixed runtime, so the agent sees
a reloaded page work; the grader will see the old behaviour unless its preview comes from this folder's
`nodegx-preview-0.2.4.tgz`, given by path (`npx -y file:<that tgz> <app>`), since the registry's has the same version
number. Your call. What the kit also teaches, on any runtime: `readFirst` rule 9 says to check a page by opening its
own URL in `drive_page`.

**A — a Record reads a record nothing in memory holds (`P112-OWN026-RECORDBYIDMEMORY`, fixed).** Chosen over a
validator warning: the enrichment's own "canonical detail-page shape" (Component Inputs Id → Record) was the broken
one, so the shape had to work rather than be warned about. `setModelID` asks `exists` before `get`. If no record of
that id is held, the bind is quiet and the record is read at the frame end under the `Fetch` key, so a press in the
same pass shares the one read. `fetched` fires on the answer; no outcome is minted (a bind is not an invocation); a
failed read is said on `Error` and as an editor warning. A held record still binds and pulses `fetched` at once;
with no Class, as before. Checked against everything that relied on the old behaviour:
- the runtime's Record specs (47 + 5 new; 3 of the new are red on the old file);
- the viewer's repeater corpus (13);
- the editor's specs (none assert `fetched`).

The node spec is now v5, with 18 new hand scenarios. Conformance on seeds 3, 7, 99 and 20748: 0 divergences, every
non-equivalent mutant killed, two new equivalents named. A seed-3 hole that predates this fix was closed beside it
(`-RECORDSPECSEED3`). The port description, catalog and enrichment were rewritten; the old antiPattern "connecting
Fetch stops following local changes" was stale.
**Proof from the tarball** (empty HOME, the server run exactly as the Cline kit writes it, tarball in place of
`@nodegx/mcp@0.2.5`): `create_project`; `provision_backend` (enforced); Note made public-read; one row imported;
`Pages/Note` = Page `note/{id}` + Page Inputs `id` → Record (Note) → Text `prop-title`. Then `drive_page`
`{navigate: "/note/<id>"}` with nothing having loaded that record: kit **PASSED 4 of 4** ("Stored on the server"
shown). **Control**, same project, same drive, on the registry's `@nodegx/mcp@0.2.5`: **FAILED at step 2 (wait_for 15 s)**.

**B — guidance survives an 8,000-character middle cut (`-GUIDANCECUT`, fixed).** Measured on a fresh project,
keeping the first 4,000 and the last 4,000 characters:
- **Before:** `get_project_info` was 51,827 characters. `authoringTraps` survived to trap 7; `authoringDoctrine`
  (from character 5,042), `interfaceDoctrine`, `designDoctrine` and `backendDoctrine` (from 40,161) were cut.
- **After:** the answer leads with `readFirst` (characters 1–2,149). It holds the answer's length, the nine rules
  that cost a rebuild (one line each, generic, each pointing to its section) and the index. The last field,
  `moreGuidance`, says how to fetch the rest. Every field that was there is unchanged.
- **Sections:** `get_project_info({ section: "backend" })` returns one section, in parts of at most 6,000 characters
  (`"backend/2"`). The resident surface went from 8,274 to 8,266 of 8,280: the description was shortened to pay for
  the new argument.
- **`get_node_type`:** each entry leads with its summary, antiPatterns and runtimeBehavior, ports last. A multi-type
  answer over 8,000 characters says first that it may be cut. The round's eight-type call is 26,180 characters.

**From the tarball:** all five lessons survive the cut (`visualFilter`, `Noodl.Records.increment`,
`cloud-shared-counter`, "taken once", "its own URL"). `section: "backend"` answers part 1 of 2 in under 8,000
characters, and the eight-type `get_node_type` leads with its note.

**C — the update/create slip (`-UPDATEASCREATE`, fixed).** Refused rather than accepted as a create: a path that
doesn't resolve is as often a misspelling of one that does, and creating there would fork the component. The
refusal now says `"<path>" does not exist yet, and nodes, connections, description are create_component's
arguments: call create_component with these same arguments`, with `details.callInstead`. On a component that does
exist, it points at `set`. The same words come through `call_tool`. Proved from the tarball with the round's call.

**D — 44 px buttons (`-BUTTON35`, fixed).** The 35 px came from the kit's Button starter (padding `--space-2` and
`text-sm`, no height), which both rounds wrote through `set_element_style({ starter: true })`. It now carries
`minHeight: var(--space-11)`: a floor, not a height. A project's or node's own `minHeight` wins, and nothing is
restamped. Proved from the tarball.

**Not done / not changed, and why:**
- **The React export still binds without reading** (`P112-OWN026-EXPORTBINDREAD`, open). It's the P18 lane's
  `plan.ts`, which another session was editing at the time.
- **No `info` diagnostic on an Update Record fed from page state.** There's no reliable test for "a value several
  devices change". The lesson is in `readFirst` instead.
- **`get_style_vocabulary` (37,653) and unfiltered `list_examples` (21,224) are still long.** Neither holds guidance
  that `readFirst` doesn't carry.
- **The literal `\uXXXX` warning** (Not now): not done.
- **The editor's own ButtonConfig defaults** are unchanged; that's an editor decision.
- **Two reds found that aren't mine:**
  - `fld013ExportReach` (the export ledger moved ParseCSV to "translated");
  - `cmp001InterfaceDoctrine` (corpus publish rate 37 vs 38, from template edits).
  - `honesty-ledger --check` (three template numbers rose).
  - One I fixed: the briefing goldens said 65 backend tools, and FIX-01 made it 66 (`-BRIEFINGGOLDEN`).
- **Not run:** the full noodl-mcp, runtime and node-spec suites. What was run:
  - the 41 specs that read the changed results, plus the new ones;
  - the Record's runtime, conformance and parity specs;
  - the node-spec golden, ports, ledger and parity specs;
  - `catalog:check` and `catalog:merge --check`.
