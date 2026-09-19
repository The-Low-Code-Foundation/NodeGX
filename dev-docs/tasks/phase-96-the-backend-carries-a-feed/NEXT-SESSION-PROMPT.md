# Phase 96 — next session

Shaped per [PHASE-EXECUTION.md §3](../../guidelines/PHASE-EXECUTION.md): the board, the next task,
the end condition, the register.

## 1. The board (re-derived from the task FILES, 2026-09-19 after s3)

| task | state |
|---|---|
| FED-001 Parse XML / Parse Feed | ✅ **CLOSED (s1).** Six ACs green; bundle delta +14.8 KB gzipped vs a 50 KB budget |
| FED-002 Indexes a collection declares | ✅ **CLOSED (s2).** Seven ACs green; 40 specs; `EXPLAIN QUERY PLAN` names the index and 20k rows answer in 0.04 ms against a control's 8.92 ms |
| FED-003 A function calls a model | ✅ **CLOSED (s3).** Nine ACs green; 24 specs across two suites; `test:main` 8055/8055; `noodl-mcp` back at R4's floor |
| FED-004 A schedule does not trip over itself | ⬜ never built |
| FED-005 A backend speaks MCP | ⬜ never built |
| FED-006 The drive | ⬜ never built |

**All four rulings are in** (README §4). **Nothing is gated on a ruling.**

## 2. The next task to build

**FED-004 — a schedule does not trip over itself.** Nothing is outstanding from FED-003, and no
register entry carries `BLOCKS <AC>`: build it.

**Read first, in this order:**

1. 🔴 **Register R1, which FED-004 was told to re-read the moment it touched polling** — and it
   does. A feed graph that wires only the parser's `Failure` hangs for the whole function timeout
   when the FETCH is what failed (CWF-018). A schedule firing into that graph is the case where
   the hang stops being one slow request and starts being an overlap: the run that has not
   finished is the reason the next fire has something to trip over. **R1 and FED-004 are the same
   defect seen from two ends**, and the overlap policy this task adds is what makes the hang
   survivable rather than compounding.
2. `triggers/registry.ts:68-88` and `triggers/scheduler.ts:102-122` — the survey read them (README
   §2, both ✔) and measured that `ScheduleConfig` has **no overlap policy** and the scheduler
   tracks `running` **for itself, not for the target**. Re-read `scheduler.ts` before designing:
   the distinction between those two is the whole task.
3. FED-003 §5.2 decision 2 — the failure vocabulary a feed graph branches on, and §5.5, because a
   schedule that skips a fire has something to say and the execution record is where it says it.
4. 🔴 **README §7 rule 5 does NOT apply unless FED-004 adds a node type.** An overlap policy is a
   key in `triggers.json` (rule 1: a key the admin dashboard and MCP already edit). If it turns
   out to need a node, the checklist is now **eight** steps, not six — see the two new ones at the
   end of rule 5, both found by FED-003 the expensive way.

## 3. The phase's end condition

README §8: FED-006 green on a fresh backend with one `nodegx-backend` process and nothing beside
it, and Richard has ruled the execution record legible. Distance: FED-004 through FED-006.

⚠️ **FED-006 inherits one thing from FED-003 by name.** §5.5: the model-cost sum is on the wire as
JSON and is deliberately **not** formatted, because §8's close condition is Richard ruling the
record *legible* — guessing the presentation before that ruling means building it twice.

## 3a. What s3 measured, and the one thing it did not

Green and captured: `test:main` **8055/8055** tests (503/504 suites, the miss being R5);
`noodl-runtime` **2833**; `noodl-viewer-cloud` **234**; `noodl-mcp` at R4's floor; both FED-003
suites **24/24**; `export-ledger:check`, `picker-coverage --check`, `catalog:merge:check` and
`docs:nodes:check` all clean.

🔴 **The full `nodegx-backend` package suite (144 files) was NOT run end to end.** Three attempts
were killed — two straddled a peer's commit, the third died at exit 144 with no output on a
load-40 box. What ran instead, green, exit 0, **121/121 across 8 suites**, chosen as the ones that
can actually regress from this task's two backend changes:
`fed-003-model-request`, `cloud-feed-nodes`, `fed-002-indexes`, `cloud-function-timeout`,
`cloud-log-node` (the same `createRunContext` this task extended), `cwf-016-idempotency`,
`admin-dashboard` (the `byob-admin` route this task changed) and `cloud-secret-node`.
**A next session with a quiet box should run the package whole once** — not because anything is
suspected, but because "the eight most likely" is a smaller claim than "the package", and the
difference should be somebody's deliberate call rather than an unstated one.

## 4. The register

| | finding | owner |
|---|---|---|
| R1 | **A feed graph that wires only the parser's `Failure` hangs for the full function timeout when the FETCH is what failed** (CWF-018). Found by FED-001's drive suite: 30 s, then 504. Not a FED-001 defect — CWF-018 owns the missing function timeout — but it is the shape every feed graph will be drawn in, so it is documented as a pattern on both nodes and wired in both worked examples. FED-002's drive hit it again; FED-003's drive wires every failure path in all four of its fixture graphs for the same reason, and says so at the top of the file. 🔴 **This is FED-004's first read** — see §2 above. | CWF-018 |
| R2 | The scoping session's `fast-xml-parser` figure ("MIT, no dependencies, ~40 KB") was wrong at every version and was repeated to Richard when R1 was put to him. Corrected in place in FED-001 §3.1 with the measured numbers. **No action.** | — |
| R4 | ✅ **RULED AND PAID, 2026-09-18.** A new node type owes `packages/noodl-mcp`, which neither a per-package run nor `test:main` sees. **Richard's ruling:** *"I'll likely convert all nodes to code export, so you can add them to the list of exportable ones to work on."* `Parse Feed` and `Parse XML` are the ledger's first two **`scheduled`** rows — commitments, not decisions. 🔴 **The wider reach is still P18's open question:** it makes the ledger's twelve remaining *"deliberately out of scope"* picker rows provisional, `Parse CSV` in particular. **Still not put to Richard.** ✅ *s3 confirms the floor holds:* `noodl-mcp` is back at **7 suites / 8 tests**, the same seven names, and `nodeDocBudget` still reds on **`Group` at exactly 14,315** — R4's own figure, so `Model Request` is not what moves it. `Model Request`'s row is `backend-only`, and picker coverage stayed **118/130** because a backend-only row is not in that denominator. | P18 (the wider ruling) · the seven: unattributed |
| R3 | 🔴 **`id` is a reserved property name at the adapter layer, in three places and nowhere written down.** (a) Never AUTO-created as a column — importing 20,000 feed-shaped rows into an undeclared collection rolled back entirely with `table Control has no column named id`. (b) Cannot be CHANGED — `QueryBuilder.buildUpdate` deletes `data.id`, so a `PUT` with a new `id` answers **200 and writes nothing**. Both pinned as specs in `fed-002-indexes.test.ts`. **Does not block FED-006**, but **re-measure before FED-006 writes items into a collection it created on the fly, or tries to correct an item's id.** | unowned — file against the adapter if FED-006 trips on it |
| R5 | ✅ **CLOSED the same day, by its owner and then by this row.** `tests-unit/chr-007/widgetDispatch.test.ts` failed to RUN — `TypeError: Cannot read properties of undefined (reading 'on')` at `warningsmodel.ts:33`, reached through an uncommitted `Ports.ts:31` import of `projectmodel` — so one of the two gates README §7 rule 5 names for a new node type **graded nothing**, and `test:main`'s 503/504 was a green with a hole in it. ⚠️ **Two attribution errors on the way, both worth keeping:** s3 first called it "pre-existing on HEAD" on a control that swapped only the CATALOG files and left the peer's edit standing in both arms — it proved the catalog was not the cause and nothing about HEAD, which one command settled (`git show HEAD:…/Ports.ts | grep -c projectmodel` → **0**); then s3 reported it to the session that happened to be in `nodegx-backend` at the time. *Presence in `git status` is not authorship and neither is `git log`; mtime is.* The owner was `opennoodl-ec` (P94/STY-003), who **fixed it at `13d60a921`** — the subscription now fetches the `NodeLibrary` singleton at call time instead of importing it — and deliberately did NOT run the regeneration, on the grounds that a snapshot regen is a wholesale write over a shared artefact and belongs in the commit that owns the type. Correct, and taken: `CHR007_WRITE_SNAPSHOT=1` run here, delta verified as **14 insertions / 0 deletions — one type and its twelve ports, nothing else moved** (so no in-progress catalog was baked in), gate re-run read-only 8/8. ✅ **`test:main` is now 504/504 suites and 8063/8063 tests**, up from 503/504 and 8055 — the eight new tests are the ones that could not run. | ✅ closed — `13d60a921` + this phase's snapshot commit |
| R6 | **The `list_node_types` ratchet had 327 bytes of headroom left and nobody knew.** FLD-013 built it at 62,000 with a measured 58,386 — 3,614 bytes of room. s3 measured HEAD at **61,673** by a one-variable control (this branch's catalog and ledger vs. HEAD's, same listing). So ~3,000 bytes were spent between FLD-013 and now by changes that each fitted underneath and therefore never had to say so — **which is the one thing a ratchet cannot catch**, and the reason it read healthy right up to the session that tipped it. `Model Request` cost **+464**. Ceiling moved to 66,000 with the measurement in the docstring. **No action beyond awareness:** a session that finds itself a few hundred bytes under it again should read that as the listing needing a diet, not the ceiling needing a nudge. | — |
| R7 | **`docs/node-catalog/enrichment/noodl.cloud.modelrequest.json` lists no examples**, which `catalog:merge` warns about (a warning; `catalog:merge:check --require-coverage` passes). Every other documented node carries one. **The natural home is FED-006**, which is literally "one feed end to end" and is the worked example a `Model Request` entry would point at — so this is a row to close there rather than a defect to farm now. | FED-006 |
