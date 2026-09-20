# Phase 96 — next session

Shaped per [PHASE-EXECUTION.md §3](../../guidelines/PHASE-EXECUTION.md): the board, the next task,
the end condition, the register.

## 1. The board (re-derived from the task FILES, 2026-09-20 after s8)

| task | state |
|---|---|
| FED-001 Parse XML / Parse Feed | ✅ **CLOSED (s1).** Six ACs green; bundle delta +14.8 KB gzipped vs a 50 KB budget |
| FED-002 Indexes a collection declares | ✅ **CLOSED (s2).** Seven ACs green; 40 specs; `EXPLAIN QUERY PLAN` names the index |
| FED-003 A function calls a model | ✅ **CLOSED (s3).** Nine ACs green; 24 specs across two suites |
| FED-004 A schedule does not trip over itself | ✅ **CLOSED (s4).** Seven ACs green; 26 specs across three suites |
| FED-005 A backend speaks MCP | ✅ **CLOSED (s5).** Eight ACs green; 39 specs, one driven by the OFFICIAL MCP client |
| FED-006 The drive | 🟡 **AC1–AC4 GREEN; AC5 built at s8 and BACK WITH RICHARD.** The drive is 35/35 and now proves ruling 2 itself |
| FED-007 The record reads like a record | 🟡 **AC1–AC6 GREEN (s8). AC7 is the ruling, and it is with Richard.** Plus §8: one ruling the build found and needs |

🔴 **The phase is one conversation from done.** Everything buildable in FED-007 is built and
gated. What is left is Richard looking at four screenshots, and answering §8's question.

## 2. 🔴 FIRST JOB: two things are with Richard, and both are in FED-007

**Do not start anything else until these are put to him** — they are the phase's close condition.

### (a) AC7 — the shots

`dev-docs/tasks/phase-96-the-backend-carries-a-feed/shots/fed007-*.png`, four of them, taken
against a real backend serving the records FED-006's own drive produced:

| shot | what it shows |
|---|---|
| `fed007-executions-list.png` | the list, with the broken polls in **red** and the healthy ones green — AC1 and AC2 in one picture |
| `fed007-record-open.png` | a record as it opens: the band, the cost line, **4 steps failed** naming the URL and its 403, then the steps |
| `fed007-step-expanded.png` | the failed fetch opened — its error, and `url` / `status` in the tree |
| `fed007-explorer.png` | a model call's input as the explorer draws it: strings green, numbers violet, booleans cyan |

The question is §1's sentence: *a run went wrong, you open it, and the thing that went wrong is
the thing you see.*

### (b) 🔴 The ruling FED-007 §8 needs, in plain words

Ruling 2 — *"a run with a failed step must not read `success`"* — is built exactly as taken, and
on its first day it found the shipped contact form failing **two** steps on every submission:

- **One is a real defect** (register R24): `Send Email` refuses with *"To" is required*, so **the
  visitor's confirmation email has never been sent**, since SB-004.
- **One is by design** (register R23): the template PROBES for an optional secret
  (`CONTACT_RECIPIENT_EMAIL`), and a `Secret` that is not provisioned reports a failed step. The
  graph is correct and the run did what it should.

So: **should a correct graph that treats an absent optional value as ordinary control flow read
`error`?** FED-007 §8 has the three options and shows why the obvious narrowing ("only unrouted
failures count") does **not** work — measured, not assumed.

⚠️ **Do not change the built behaviour without his answer.**

## 3. What s8 built

**FED-007 §5.1a and §5.2a have the full account.** In short:

- **AC1** — `ExecutionLogger.completeExecution` now reads the caller's `success` as *what the
  caller observed*: a run whose record contains a failed step is `error` and borrows the step's
  message (`The run answered, but a step failed: <node> — <reason>`). Built at the logger, not in
  `WorkflowRunner`, because **eight** call sites complete an execution and all eight write
  through that object. The `partial`-vs-`error` question §5.1 left open was settled by counting:
  a third value costs changes in **ten** places across three packages, reusing `error` costs none.
- **AC2** — the dashboard's status vocabulary was wrong three ways (`failed` and `cancelled`,
  which the store never writes; no `error`, the only failure value; failures painted AMBER). Now
  `EXECUTION_STATUSES` / `STEP_STATUSES` / `executionStatusKind` / `stepStatusKind` are named
  things, and a spec lifts them out of the shipped page and compares them to the unions in
  `types.ts` — the closest thing that document has to a compiler.
- **AC3–AC6** — the record opens as a band + a failures band + steps-as-rows + a collapsible
  tree, with the raw JSON one click away. +6.8 KB gzipped against a stated 48 KB ceiling.

## 4. The phase's end condition

README §8, unchanged. **Every clause is green except the last.** 🔴 **Distance: one conversation.**

## 5. The register

Unchanged rows are kept short; read s5's copy in git history for the full text of R1–R12.

| | finding | owner |
|---|---|---|
| R1 | **A feed graph that wires only the happy path HANGS for the full function timeout** (CWF-018). ✅ Paid forward by every graph in `tests/fixtures/feed-drive/project.ts` | CWF-018 |
| R2 | The scoping session's `fast-xml-parser` figure was wrong. Corrected in FED-001 §3.1. **No action.** | — |
| R3 | 🔴 **`id` is reserved at the adapter layer.** Re-measured at s6; FED-006 did not trip on it. **Row can close** unless someone wants the adapter-layer note written down where a person would find it | ✅ paid by FED-006 |
| R4 | A new node type owes `packages/noodl-mcp`. The floor is **7 suites / 8 tests**, the same seven names; `nodeDocBudget` still reds on `Group` at 14,315 | P18 · the seven: unattributed |
| R5 | ✅ **CLOSED 2026-09-18.** Kept for its attribution lesson: presence in `git status` is not authorship; mtime is | ✅ closed |
| R6 | The `list_node_types` ratchet had 327 bytes of headroom and nobody knew. **No action beyond awareness.** | — |
| R7 | ✅ **CLOSED BY FED-006 (s6).** `noodl.cloud.modelrequest` cites one validated example | ✅ closed (s6) |
| R8 | 🔴 The `noodl-mcp` **tool-surface** budget reads **8,274 against 8,280 — six tokens.** A session that finds itself a few tokens under a ratchet should read that as the surface needing a diet. ✅ *s8 took the lesson:* FED-007's own size gate is a loose absolute ceiling, not a ratchet at the current figure | the ratchet: unowned |
| R9 | ✅ **CLOSED (s5)** — the scoped-API-key privilege escalation on system collections | ✅ closed (s5) |
| R10 | **A cloud component's `description` is dropped at export.** An EDITOR change | unowned — an editor phase |
| R11 | **A graph refusing an unauthenticated caller answers HTTP 500, not 401.** | unowned — the cloud-function door |
| R12 | Two FED-005 design sentences deliberately not built: the joined key-usage panel, and the create form (refused behind R8) | the panel: unowned · the form: blocked behind R8 |
| R13 | ✅ **CLOSED (s6)** — a deployed backend could not serve `/mcp` at all, and only the WHOLE package run could see it. **A task that adds a ROUTE FAMILY owes the whole-package run** | ✅ closed (s6) |
| R14 | 🔴 **`Model.create` takes `data.id` as the record's IDENTITY and then skips the key.** Undocumented, and exactly the shape of "each item lands once" | unowned — worth a line in the `Parse Feed` / `Run Tasks` enrichment |
| R15 | 🔴 **NDA-017's "run on value change" default silently halves a sequenced graph.** The only symptom is a suspiciously fast success | unowned |
| R16 | 🔴 **`catalog:examples` has TWO pre-existing reds** — `agent-sse-chat-stream` and `agent-store-shared-state` wire a port that does not exist. Not FED-006's | unowned — whoever owns the agent examples |
| R17 | 🔴 **A step is named by the GRAPH node's id**, so nothing distinguishes one instance or one ITEM from another. Per-item identity already exists on the FAILING path (FED-006 §3.4) — ✅ **and s8 shows it working on the screen:** the failures band prints `itemIndex` and `itemId` for a `Run Tasks` failure. The SUCCESS path still has nothing | unowned — **scope it as its own task** |
| R18 | 🔴 **`MAX_STEPS_PER_RUN` is 1000 and a loop-shaped function eats it.** FED-006's poll writes ~45 steps; a real reader with fifty sources is not far off. ⚠️ **s8 makes this worse and better at once:** the record view now shows every step as a row, so a record that silently stops at 1000 is more visible AND more annoying | unowned |
| R19 | 🔴 **`catalog:examples` and `test:main` both carry reds that belong to live peer edits, and mtime is the only thing that says so.** ✅ *Paid again at s8:* s7's `typecheck` reds were a peer's `src/migrate/plan.ts` mid-write, and at s8 the same command exits 0 with nothing changed by us | not ours — P93/P97 |
| R20 | 🔴 **The served dashboard's Executions view had NEVER shown a row** (bare-array route, envelope reader), since 2026-07-26. Fixed and gated at s7 | ✅ closed (s7) |
| R21 | **The other list views on that page were NOT audited.** The reach of "a view reads a key its route does not answer" is every view on `/_admin`; only the executions one has a spec. ✅ *s8 adds the cheap instrument:* three helpers in `admin-dashboard.test.ts` lift a declaration out of the shipped page and compare it to its source of truth — the sweep is now a table of (page declaration, real source) pairs | unowned — a dashboard sweep |
| R22 | 🔴 **The Executions view's status vocabulary disagreed with the store's, three ways.** ✅ **CLOSED (s8) as FED-007 AC2**, and gated against the union in `types.ts` from the shipped document | ✅ closed (s8) |
| R23 | 🔴 **NEW (s8) — the status ruling paints a CORRECT graph red, and the shipped contact form is the example.** `/#__cloud__/site/ContactRecipient` probes for an optional secret; an unprovisioned `Secret` reports a failed step; the graph handles it and is right to. Under ruling 2 every contact submission now reads `error`. 🔴 **The obvious narrowing does not work** — "routed" is a `WorkflowEngine` concept (`inputData.previous.error`) and does not exist for graph runs, and this probe does not wire `failure` at all. **FED-007 §8 is the question, and it is Richard's** | 🔴 **WITH RICHARD** |
| R24 | 🔴 **NEW (s8) — the site template's contact form has NEVER sent its confirmation email.** `noodl.cloud.sendemail#mail` fails with *"To" is required* on every submission, since SB-004: the recipient probe fails, `pick` produces no address, and nothing downstream notices. The visitor is still told *"sent"* and the message really is stored — only the confirmation is missing. **Pinned by a spec in `sbr010-messages-drive.test.ts`, which will red when it is fixed — that is the intended way to find out.** Invisible for months because the run read `success` | unowned — **the site-builder phase (P76/P77)** |
| R25 | 🔴 **NEW (s8) — one down feed makes FIVE failed steps, the cascade's size is NOT STABLE, and one of them names nothing.** The fetch, the `Parse Feed` handed the refusal body, and `Run Tasks` reporting *"Task 4 of 4 failed"* **twice byte-for-byte** (folded by the band). A spec pinning the count went red once and green twice on identical code, so the spec now gates the stable properties and PRINTS the shape each run. 🔴 **And the first failure a person reads is a `Run Tasks` step whose entire message is *"The action could not be performed"*, with no detail** — a failure naming neither subject nor reason, which is precisely what FED-006's ruling 1 was about, one layer up | unowned — `runtasks.ts` |

## 6. What s8 measured

- **`execution-logger.test.ts` 35/35** (8 new). Mutant — drop `&& !failedStep` — **1 red**, its
  green control still green.
- **`admin-dashboard.test.ts` 32/32** (6 new). Mutant — restore the old vocabulary and the
  `=== 'failed'` chip — **3 red**.
- **`feed-drive.test.ts` 35/35** (4 new), ~100 s. The AC1/AC4/AC5 arms all read the REAL record.
- **`sbr010-messages-drive.test.ts` 23/23**, **`def004-execution-steps.test.ts` 9/9**.
- **The 19 backend suites that assert on a run's status: 353 tests, and the only two reds were
  the ruling doing its job** — a spec whose title was the old behaviour, and R24.
- **`noodl-viewer-cloud` whole: 15 suites / 242 tests, exit 0.**
- `typecheck:cloud`, `typecheck:backend-tests`, `nodegx-backend typecheck`: **all exit 0**
  (gated on exit status, not on empty output). `eslint` clean on every changed file.
- Bundle: **+6.8 KB gzipped** on the served document (23.9 → 30.7 KB).

### ⚠️ Not measured at s8, and the next session should decide whether it matters

- **The whole `nodegx-backend` package** (154 suites / 1827 tests, ~510 s at `--maxWorkers=2`).
  s8 changed a shared substrate — `ExecutionLogger` is the single write point for **every**
  execution record on every backend — and swept the 19 suites that assert on run status plus
  every suite touching the dashboard. 🔴 **R13's lesson says a change with this reach owes the
  whole-package run**, and a peer was driving the editor for much of s8. **Run it before the
  phase closes.**
- **`test:main`**, for the same reason: `ExecutionLogger` lives in `noodl-viewer-cloud`, which
  the editor also consumes.

## 7. Traps s8 paid for, so the next session does not

- ⚠️ **`npm run build` is NOT optional when shooting the dashboard.** `bin/nodegx-backend.js`
  runs `dist/`, and the page is inlined by esbuild's text loader — an unbuilt change shows the
  OLD page while every test passes on the new one.
- ⚠️ **A hash is not a navigation.** `Page.navigate` to `…/_admin#/executions` from `…/_admin`
  changes `location.hash` and does NOT reload, so the boot that reads the seeded admin token
  never runs and the page sits on its login screen — which looks exactly like a wrong credential.
- ⚠️ **Use debug port 9333, not 9222.** 9222 is the editor's and a peer is usually on it.
- ✅ **The shot recipe is a script now** (`scripts/devtools/shoot-admin-dashboard.js`), and
  `FED007_KEEP_DATA=1 npx jest tests/feed-drive.test.ts` leaves the drive's backend on disk and
  prints where. Three commands, in that file's header.
- ⚠️ `timeout` does not exist on macOS — use `time npx jest …`. `grep` skips this package's big
  TypeScript files as binary — use `grep -a`. A backgrounded or piped command's exit code is the
  LAST command's — read the log, not the wrapper.
