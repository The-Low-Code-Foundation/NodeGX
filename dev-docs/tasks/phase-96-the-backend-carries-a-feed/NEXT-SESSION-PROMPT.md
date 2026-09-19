# Phase 96 — next session

Shaped per [PHASE-EXECUTION.md §3](../../guidelines/PHASE-EXECUTION.md): the board, the next task,
the end condition, the register.

## 1. The board (re-derived from the task FILES, 2026-09-19 after s6)

| task | state |
|---|---|
| FED-001 Parse XML / Parse Feed | ✅ **CLOSED (s1).** Six ACs green; bundle delta +14.8 KB gzipped vs a 50 KB budget |
| FED-002 Indexes a collection declares | ✅ **CLOSED (s2).** Seven ACs green; 40 specs; `EXPLAIN QUERY PLAN` names the index |
| FED-003 A function calls a model | ✅ **CLOSED (s3).** Nine ACs green; 24 specs across two suites |
| FED-004 A schedule does not trip over itself | ✅ **CLOSED (s4).** Seven ACs green; 26 specs across three suites |
| FED-005 A backend speaks MCP | ✅ **CLOSED (s5).** Eight ACs green; 39 specs, one driven by the OFFICIAL MCP client |
| FED-006 The drive | 🟢 **AC1–AC4 GREEN, and AC5's two CONDITIONS built (s6). 31 specs.** What is left is Richard looking at the dashboard and saying the word |

**All four rulings are in** (README §4), plus THREE taken at s6: AC4's wording, and the two
conditions Richard put on AC5 — *a failing step must name its subject* and *the model cost reads
as a summary line*. Both are built and mutation-tested (FED-006 §5.6). **Nothing is gated on a
ruling except AC5 itself, and AC5 is now only the looking.**

✅ **s5's owed whole-package run is DONE (s6): `nodegx-backend` WHOLE, 154 suites / 1827 tests in
510 s at `--maxWorkers=2`** — and it found a real defect no subset could see. See register R13.

## 2. The next task: FED-006 AC5, and that is the whole phase

**AC5 — Richard rules the execution record legible.** §3.4 wants two screenshots in `shots/`: the
`/_admin` execution list after a poll, and one `pollSources` record open. Ruled 2026-09-19:
**take them next session, on a quiet box** — two peers were driving editors all through s6 and a
stack would have collided.

✅ **Both of his conditions are already paid** (FED-006 §5.6), so the screenshots are of a record
that already names which feed failed and already carries the cost sentence. Do NOT rebuild either.

🔴 **Check the box first.** `lsof -ti :9222 -sTCP:LISTEN` and `ps` for a peer's `dev`/`dev:debug`;
a peer's `dev` run REAPS your stack. Then:

1. Provision a backend from the drive's own project. The cheapest honest way is to run
   `tests/feed-drive.test.ts` with the teardown skipped, or to boot a `BackendService` on a fixed
   port from a small script using `tests/fixtures/feed-drive/project.ts` — the fixture HTTP server
   has to be up too, since the graphs point at it.
2. Open `/_admin`, find the `pollSources` executions, capture the list and one record open.
3. ✅ **The model-cost sum IS formatted now** — FED-003 §5.5 was settled at s6, by his ruling, as
   a summary line with no money in it. It is on the list as well as the row.
4. The sentence he is ruling on: *a person who did not build this should be able to read the
   record and say which source produced which items.*

**What the record carries, measured at s6:** `triggerSource` (`run-once-on-start catch-up` or
`schedule * * * * *`), `triggerId`, `durationMs`, `modelCost` with its one-line summary, and a
step per node with `nodeId`, `nodeType`, `status`, a real `errorMessage`, and — new at s6 — a
`detail` naming the SUBJECT of a failure, so a failed fetch says which URL.

🔴 **What it still does NOT carry, and you should say so rather than let him find it:** which
instance or which ITEM a happy-path step belongs to. `nodeId` is the graph node's id, so seven
items write seven steps called `store` and nothing distinguishes them. Richard was shown this and
chose the narrow fix; **per-item execution history is scoped as its own work, not a FED-006
tail** — it is the surface people compare to n8n, and it deserves a task.

## 3. The phase's end condition

README §8, unchanged. **Everything in it is now green except the last clause.** The drive is
green on a fresh backend, in one process; two fixture feeds (RSS 2.0 and Atom, plus a third) are
polled by a schedule; items land once each under a unique index; each is tagged by a model call
with a key from `secrets.json`; the rows are read back by a session user, by an API key, and
through `/mcp` by the official MCP client. **Distance: Richard's ruling, and that is all.**

## 4. The register

Unchanged rows are kept short; read s5's copy in git history for the full text of R1–R12.

| | finding | owner |
|---|---|---|
| R1 | **A feed graph that wires only the happy path HANGS for the full function timeout** (CWF-018). ✅ *s6 paid it forward again:* every graph in `tests/fixtures/feed-drive/project.ts` wires `Failure` beside the path it expects — five of them in the task template alone, because a `Run Tasks` item that never reaches a completion output is one the loop waits for forever | CWF-018 |
| R2 | The scoping session's `fast-xml-parser` figure was wrong. Corrected in FED-001 §3.1. **No action.** | — |
| R3 | 🔴 **`id` is reserved at the adapter layer** — never auto-created as a column, never changeable (`PUT` answers 200 and writes nothing). ✅ **Re-measured at s6 exactly as this row asked.** A DECLARED `id` column with a unique index works, and `upsertOn: 'id'` through the `Create Record` node writes once and updates thereafter — 7 items after two polls, 11 model calls, one row each. **FED-006 did not trip on it. Row can close** unless someone wants the adapter-layer note written down somewhere a person would find it | ✅ paid by FED-006 |
| R4 | A new node type owes `packages/noodl-mcp`. ✅ *s6 confirms the floor a third time:* **7 suites / 8 tests**, and the SET is the same seven — `nodeIdAllocation` · `cn004` · `cmp004Parts` · `nodeDocBudget` · `cmp001InterfaceDoctrine` · `def038SettledTemplates` · `d54ThemePresetIdentity`. `nodeDocBudget` still reds on **`Group` at exactly 14,315**, unmoved by s6's new catalog example | P18 (the wider ruling) · the seven: unattributed |
| R5 | ✅ **CLOSED 2026-09-18.** Kept for its attribution lesson: presence in `git status` is not authorship; mtime is | ✅ closed |
| R6 | The `list_node_types` ratchet had 327 bytes of headroom and nobody knew. **No action beyond awareness.** | — |
| R7 | ✅ **CLOSED BY FED-006 (s6).** `noodl.cloud.modelrequest` now cites one validated example — `docs/node-catalog/examples/cloud-tag-a-feed-item-with-a-model.json`, the `Secret → Model Request (Output Schema) → Create Record (Upsert On)` task template the drive actually runs. `catalog:examples` validates it clean; `catalog:merge:check` exits 0; `docs:nodes` regenerated | ✅ closed (s6) |
| R8 | 🔴 The `noodl-mcp` **tool-surface** budget reads **8,274 against 8,280 — six tokens.** s6 added nothing to that surface (an example is not a tool description), and the ratchet is unmoved. A session that finds itself a few tokens under a ratchet should read that as the surface needing a diet | the ratchet: unowned |
| R9 | ✅ **CLOSED (s5)** — the scoped-API-key privilege escalation on system collections, found and fixed in FED-005 | ✅ closed (s5) |
| R10 | **A cloud component's `description` is dropped at export**, so a deployed backend has none. An EDITOR change (the exporter), which ruling R4 puts outside this phase | unowned — an editor phase |
| R11 | **A graph refusing an unauthenticated caller answers HTTP 500, not 401.** True over `POST /functions/:name` too | unowned — the cloud-function door |
| R12 | Two FED-005 design sentences deliberately not built (FED-005 §5.6): the joined key-usage panel, and the create form (refused behind R8) | the panel: unowned · the form: blocked behind R8 |
| R13 | 🔴 **NEW (s6) — a deployed backend could not serve `/mcp` at all, and only the WHOLE package run could see it.** `tests/deploy-assets.test.ts` starts the real service, reads its real route table, and requires `deploy/nginx.conf` to forward every top-level family. `/mcp` is a family FED-005 added and nginx did not forward, so the endpoint FED-005 exists to offer would have 404'd in production while working in every test. **Fixed at s6** in both places the test names — the alternation in `deploy/nginx.conf` and the reserved-path list in `docs/runtime/SELF-HOSTING.md` — and that suite is 21/21. 🔴 **The lesson is the board's own warning from s5, paid off:** this is invisible to `test:main`, invisible to a per-suite run, and invisible to the 15-suite subset s5 ran. A task that adds a ROUTE FAMILY owes the whole-package run | ✅ closed (s6) |
| R14 | 🔴 **NEW (s6) — `Model.create` takes `data.id` as the record's IDENTITY and then skips the key**, so a `Parse Feed` item's `id` is on `record.getId()` and **nowhere in `record.data`**. Any script mapping records to plain objects and reading `item.id` gets `undefined`. Cost an hour and surfaced as *"Upsert On names id, but this record has no value for it"* — a good error, several layers from the cause. `runtasks.ts` carries the same knowledge as two hand-written lines. **Not a defect** — it is how Model has always worked — but it is undocumented and it is the exact shape of "each item lands once" | unowned — worth a line in the `Parse Feed` / `Run Tasks` enrichment |
| R15 | 🔴 **NEW (s6) — NDA-017's "run on value change" default silently halves a sequenced graph.** `Run` is additive: wiring a control signal does not make the other inputs passive, so a node whose value and signal arrive in sequence runs FIRST on the value with everything else unset. Measured: a poll that fetched its feed, reported **success in 48 ms** and wrote nothing. The fix is per-input (`runOnChange-<port>: false`) and every mapping node in the drive carries it. 🔴 **Nothing warns you** — the graph is correct, the run is green, and the only symptom is a suspiciously fast success | unowned — the shape is "a correct graph that does nothing" |
| R16 | 🔴 **NEW (s6) — `catalog:examples` has TWO pre-existing reds**, both the same defect: `agent-sse-chat-stream` and `agent-store-shared-state` wire `net.noodl.controls.textinput`'s output `text`, which does not exist (it is `textChanged`/`onTextChanged`). 106/108 validate clean. **Not FED-006's** — measured before this session's example was added, and the example added is one of the 106 | unowned — whoever owns the agent examples |

| R17 | 🔴 **NEW (s6) — a step is named by the GRAPH node's id, so nothing distinguishes one instance or one ITEM from another.** `RuntimeStepStart.nodeId` is `this.id`; seven items through one `Run Tasks` template write seven steps all called `store`. s6 closed the half that bites — a FAILING step now carries `detail`, so a refused fetch names its URL — on Richard's ruling. **The other half is open and is a product surface, not a phase-96 remainder:** per-item execution history is what people compare this to n8n on. `runtasks.ts` already holds `entry.index` and the item's record, so the data exists; what is missing is a field on the step and somewhere to show it | unowned — **scope it as its own task**, do not bolt it onto a feed task |
| R18 | 🔴 **NEW (s6) — `MAX_STEPS_PER_RUN` is 1000 and a loop-shaped function eats it.** `WorkflowRunner.beginStep` stops recording past it and logs `function.steps.suppressed` ONCE. FED-006's poll of four feeds writes ~45 steps, so it is nowhere near — but a real feed reader with fifty sources and twenty items each is, and the failure mode is a record that silently stops half way. **Not measured against a realistic corpus by anything.** Related to R17: per-item identity makes the record bigger, so the two want sizing together | unowned |
| R19 | 🔴 **NEW (s6) — `catalog:examples` and `test:main` both carry reds that belong to live peer edits, and mtime is the only thing that says so.** `tests-unit/tvw-007/instanceHover.test.ts` failed one `test:main` run (519/520) with mtime **23:00:32 — during the run** — and its whole `InstanceHoverCard/` tree is untracked P93 work; a re-run failed a DIFFERENT test in the same file, which is what a file being written mid-run looks like. ✅ **Attribute by mtime, never by `git status` and never by the failure text**, and re-run before believing any delta | not ours — P93 (TVW-007) |

## 5. What s6 measured

- **`tests/feed-drive.test.ts`: 31/31**, and `fed-003-model-request` 17/17 — **48/48 together**,
  78 s. AC1's budget is five minutes.
- **`def004-execution-steps.test.ts` 9/9** — the step contract, which the `detail` change touches.
- `typecheck:runtime`, `typecheck:cloud`, `typecheck:backend-tests` all **exit 0**.
- 🔴 **`nodegx-backend` WHOLE: 154 suites / 1827 tests, 510 s** at `--maxWorkers=2` on a quiet box,
  **one red** — `deploy-assets`, register R13, fixed, and that suite is 21/21 after.
  ⚠️ Measured at 21:17–21:26. A peer began editing `packages/nodegx-backend/src/**` at 21:37 and
  was still editing at 21:50, so **this figure is about the tree as it was at 21:17**.
- **`test:main` 514/514 / 8220/8220 exit 0** before the runtime change; **519/520 suites,
  8290/8291 tests** after it, the single red being register R19's — a peer's file written during
  the run. `noodl-runtime/src/node.ts` is shared with the browser runtime, which is why this was
  re-run rather than assumed.
- **`noodl-mcp` at R4's floor: 7 suites / 8 tests, the same seven names**, `Group` at 14,315.
- `typecheck:backend-tests` exit 0 (re-measured: a first reading of 2 was transient, taken while a
  peer was mid-edit). `eslint` clean on both new files.
- `catalog:examples` **106/108** — the two reds are R16's and are not ours.
  `catalog:merge:check` exit 0. `docs:nodes` exit 0.

### 🔴 Three mutants, and the first one is the finding

| mutant | result |
|---|---|
| **remove `upsertOn: 'id'`** from Create Record | 🔴 **24/24 STILL GREEN** → gate rewritten → 1 red |
| `Conditional` off on the HTTP node | 2 red (the 304, and the model-call count) |
| the API key not bound to Alice | 1 red (`myList` over `/mcp` is an error result) |

🔴 **Both of `pollSources`' Response nodes answer HTTP 200**, so the execution row reads `success`
whichever fired. Without `upsertOn` the second poll's writes were refused one item at a time, the
graph answered on `resErr`, the row still said `success`, and the item count was still seven
**because the refusals wrote nothing**. A gate with a hole shaped exactly like the defect. It now
reads the STEPS — which Response node ran, and whether any step errored — which is the same thing
§3.4 asks Richard to rule legible.

### One flake, found and closed

The drive went red ONCE, on a spec two immediate re-runs did not reproduce — the worst kind of
result to leave lying. The cause is real and is now fixed rather than re-run away: the trigger's
cron is a genuine `* * * * *`, and the suite was leaving the scheduler ARMED between assertions,
so a minute boundary could land a THIRD poll mid-suite and move both the model-call count and
AC3's "exactly one run was added". `armAndWaitForOnePoll` now disarms the trigger the moment the
fire it asked for has finished. The cron stays minutely on disk — the execution record still reads
`schedule * * * * *`, which is the point — it is simply not armed except while the helper is
waiting. Three consecutive clean runs after: 24/24, 33–40 s.

### 🔴 An incident: `git checkout --` destroyed a PEER's uncommitted work

Reverting a mutant on `src/server/byob-admin.ts`, s6 used `git checkout -- <file>`. That file held
**another session's uncommitted edits** (P98's PRD-002 `?capped=` hunk). `checkout --` does not
undo your change; it discards everything not committed, theirs included.

✅ **Recovered in full, and the recovery route is the reusable part.** VS Code's local history had
nothing — a peer agent writes through Bash, which leaves no editor buffer and therefore no local
history. **Session transcripts record tool inputs verbatim**, so the lost hunk was read straight
out of `~/.claude/projects/<project>/<session>.jsonl`, found by scanning every transcript touched
in the last two days for a write to that path, and restored byte-for-byte. The sweep also proved
it was the ONLY lost hunk: four write-touches to that file in two days, two theirs and two ours.

**The rules this cost, both of which were already written down:** never `git checkout --` on this
checkout (`cp` from a scratchpad copy instead — s6 had made such copies for `WorkflowRunner.ts`
and `modelCost.ts`, and simply did not make one here), and a mutant on a file a peer is editing
needs its own backup before the mutation, not after.

### Two traps that will cost the next person time

⚠️ **`timeout` does not exist on macOS.** `timeout 300 npx jest …` exits instantly with `command
not found` and a `| grep` swallows it, which reads exactly like a hang. Use `time npx jest …`.

⚠️ **`grep` skips this package's big TypeScript files as binary.** `grep -n … src/server/HttpServer.ts`
returns NOTHING; `grep -an` returns the matches.

⚠️ **A backgrounded or piped command's exit code is the LAST command's.** s6's whole-package run
was reported as exit 0 by a wrapper whose last statement was `tail`; the real result — one red —
was in the log. Read the log, not the wrapper.
