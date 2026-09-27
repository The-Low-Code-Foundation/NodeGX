# FED-004 — A schedule does not trip over itself

## 1. The person sentence

**Someone sets a poll to every fifteen minutes and a slow source one morning makes the run take
twenty. The next fire waits its turn, or skips, as the person chose. Nothing runs twice. And a
source that has not changed since the last poll answers "not modified" and costs nothing.**

## 2. What is there (read 2026-09-18, HEAD `f3f67874d`)

| reading | where |
|---|---|
| `ScheduleConfig` is `cron`, `missedFirePolicy`, `payload`. Nothing about overlap | `triggers/registry.ts:68-88` |
| The scheduler keeps one `setTimeout` per schedule and re-arms on fire. Its `running` flag is the scheduler's own lifecycle, not whether the target is mid-run. A fire while the previous dispatch is still executing **dispatches again** | `triggers/scheduler.ts:7, 102-122` |
| Workflows already have `concurrency` slots that a waiting run occupies, so a workflow can be told "at most one of me". A **function** target has no such thing | `workflow/steps/kinds.ts:950-952` |
| Every run writes an execution record; the dashboard and `Query the audit trail` read them | `workflow/`, `executions.sqlite` |
| `HTTP Request` takes custom headers and exposes `responseHeaders`, so a graph *could* hand-roll `If-None-Match`. Nothing helps it remember the last `ETag` per URL | `httpnode.ts:107, 170, 182` |
| Reddit refuses requests without a descriptive `User-Agent`; YouTube and most feed hosts honour `ETag` / `Last-Modified` | source behaviour, not repo |

## 3. Design

### 3.1 `overlapPolicy` on a schedule

```json
"schedule": { "cron": "*/15 * * * *", "missedFirePolicy": "skip", "overlapPolicy": "skip" }
```

- `skip` (**default**): if the previous fire of this trigger is still running, this fire is
  recorded as `skipped-overlap` and not dispatched. The record carries the run id it yielded to.
- `queue-one`: at most one fire waits; it dispatches the moment the running one finishes. A third
  fire while one is waiting is `skipped-overlap`.
- `allow`: today's behaviour, explicit.

The scheduler holds `inFlight: Map<triggerId, runId>` and clears it on the dispatcher's completion
promise, whether the target is a function or a workflow. This is per process, which is the only
thing there is (`scheduler.ts:7`).

### 3.2 Conditional GET on the HTTP node

`HTTP Request` gains `conditional: boolean` (default false). When on, the node:

1. looks up the last `ETag` and `Last-Modified` it saw for this URL in a small
   `_HttpCache` system table (URL hash, etag, lastModified, seenAt; capped at 50,000 rows,
   oldest evicted);
2. sends `If-None-Match` / `If-Modified-Since`;
3. on **304** fires a new `Not Modified` output instead of `Success`, with an empty body;
4. on 200 stores the new validators.

The table is system-owned, never exposed as a collection, and is the whole of "remembering" so no
graph has to build it. In the browser runtime the port exists and is a no-op with a console
warning, so a shared graph does not break.

### 3.3 A name on the door

The backend sends `User-Agent: NodeGX/<version> (+<publicUrl>)` on every outbound request from the
HTTP node unless the graph sets its own. Reddit's rule is the reason; being identifiable is the
principle.

## 4. Acceptance criteria

1. **AC1** — A schedule at `@minutely` targeting a function that sleeps 90 s, with `overlapPolicy:
   skip`: over four minutes, exactly two runs execute and two records read `skipped-overlap`, each
   naming the run it yielded to.
2. **AC2** — Same, `queue-one`: three runs execute back to back and one record reads
   `skipped-overlap`.
   🔴 **Corrected at build time — the drafted timeline was wrong.** Over FOUR minutes
   `queue-one` gives three runs and **no** skip: the fourth fire is *waiting*, not refused. The
   measured timeline (`fed-004-overlap.test.ts`, and written out in full there) is
   60 dispatch A → 120 queue → 150 A ends, B goes → 180 queue → 240 B ends, C goes, and the 240
   fire queues behind it → **300 skip** (one running, one already waiting). So the AC's three
   runs and one skip are real; they need a FIFTH fire, and the spec runs five minutes. Corrected
   here rather than asserted around: an assertion written from the intent would have fought the
   decision.
3. **AC3** — Same, `allow`: four runs execute, overlapping, as today.
4. **AC4** — A fixture server returning an `ETag` and honouring `If-None-Match`: two consecutive
   `HTTP Request` calls with `conditional: true` produce one `Success` and one `Not Modified`; the
   `_HttpCache` row exists; the fixture's request log shows the second request carried the header.
5. **AC5** — A fixture that ignores validators: both calls are `Success`; nothing breaks.
6. **AC6** — The fixture's request log shows a `User-Agent` starting `NodeGX/` on every request,
   and a graph-set `User-Agent` overrides it.
7. **AC7** — The dashboard's trigger view shows the policy and the last skip, and `Get trigger`
   over MCP returns `overlapPolicy`.

## 5. What was built, and the decisions taken while building it

**Status: ✅ CLOSED (s4, 2026-09-19).** All seven ACs green; **26 specs across three suites**.
Three commits: the overlap policy, the conditional GET, the surfaces.

### 5.1 The decisions

1. 🔴 **`skip` is the default, and that is a BEHAVIOUR CHANGE.** It is the one place in
   `registry.ts` where an omitted key does not mean "exactly what this trigger did before"
   (compare `responseMode`, which defaults to `async` for precisely that reason). §3.1 says
   `skip`, and it is right: "start another one" was never a policy anybody *chose* — it is what
   a scheduler with no opinion does. A schedule that genuinely wants concurrent runs now has a
   word for it (`allow`); a schedule that wanted one at a time had no way to say so at all.
   **Both other consumers of `CronScheduler` inherit the guard** — BAK-007's backup and the file
   orphan sweep — which is a fix they wanted and never asked for.
2. **A skip is not a failure, and nothing in the product says it is.** It goes through a new
   `dispatcher.recordSkip`, which writes a **successful** execution row carrying
   `disposition: 'skipped-overlap'` and `yieldedTo`, stamps `status.lastSkip` / `skipCount`,
   and touches neither `fireCount` nor `nodegx_trigger_fires_total`. A schedule skipping
   correctly every morning must not read as one that is broken — on the record, on the metric,
   or in the dashboard's colour.
3. **`RunTriggerContext.onStarted`** is how a fire learns its own execution id *while it is still
   running*. `run()` resolves when the run is over, which is exactly too late for the question
   the policy asks: *which run is the one still going?* Both target kinds announce it.
4. **`_HttpCache` is not a cache.** No bodies, no expiry, no freshness heuristic, and it never
   answers a request on its own. That is the safety argument: the worst a wrong row can do is
   cost one round trip, because a server that does not recognise a validator answers 200 with
   the body — which is what would have happened anyway. Keyed by SHA-256 of the full URL (query
   strings are unbounded and routinely carry credentials).
5. 🔴 **The 304 is intercepted before `response.ok` is consulted.** `ok` is false for 304, so
   without that branch a conditional request that worked perfectly would report `Failure` with
   "the server answered 304 Not Modified" — the feature succeeding and being reported as the
   feature failing. `Not Modified` names the CAUSE of an `Unchanged`, exactly as `Canceled`
   does, which is why it is a port and not a fourth outcome.
6. **`effectiveOverlapPolicy` is decorated onto the routes, not recomputed by each reader.**
   The field is omitted on disk when unauthored, so every consumer would otherwise carry its own
   copy of "absent means skip" — and a second copy of a rule is a copy that drifts. It sits in
   `TRIGGER_KEYS` for the same reason `createdAt`/`updatedAt`/`status` do: `GET` → edit → `PUT`
   is the obvious gesture, and refusing a field the route itself added would 400 every round
   trip.
7. **The overlap policy guards the SCHEDULER's fires and nothing else.** A manual test fire, a
   webhook and a db-change trigger all reach `dispatcher.fire` without passing the gate, and
   that is correct: a person pressing "Run now" is not a schedule tripping over itself. Pinned,
   because the opposite reading is the natural one.

### 5.2 What the gates are, and what they are not

| suite | specs | what only it can see |
|---|---|---|
| `fed-004-overlap.test.ts` | 11 | Four minutes of a minutely schedule against a 90-second run, on fake timers — the defect has no unit smaller than a TIMELINE. Plus AC7's dashboard cell, **extracted and RUN** against DOM stubs |
| `fed-004-overlap-drive.test.ts` | 7 | A provisioned backend over real HTTP: real registry, dispatcher, runner, execution store. Fires driven through `POST /admin/triggers/:id/enabled`'s re-arm rather than a fake clock, so nothing is stubbed |
| `fed-004-conditional-get.test.ts` | 8 | A real `node:http` fixture that honours `If-None-Match`. Four halves of the feature live in four places and no unit holds them; and the thing that decides whether it worked is a THIRD PARTY |

⚠️ **The dashboard specs do not `toContain` the markup.** That page is one large inline script no
compiler ever reads, and a string assertion passes just as happily when the function is dead code
nothing calls. `overlapCell` is lifted out by brace-matching and executed. Both assertions were
**mutant-checked**: colouring a skip `bad` reds one, and reading `schedule.overlapPolicy` instead
of the route's field reds the other.

⚠️ **Every fixture graph wires `Failure` as well as the path it expects** — register R1. A graph
whose Response node is unreachable does not fail, it HANGS for the whole function timeout, and a
spec that wires only the happy path reports a 30-second red that says nothing about which port
fired.

### 5.3 The regenerations rule 5 asks for, and what they came to

No new node TYPE — two new PORTS on `net.noodl.HTTP`. Run anyway, and worth recording:

| step | outcome |
|---|---|
| `catalog:generate` | `notModified` catalogues (a static output). **`Conditional` does NOT** — it is a dynamic input, and this node catalogues only `cancel`, `fetch`, `url` statically, exactly as FED-001's `responseType` is also absent. Not a miss |
| `catalog:merge` + `docs:nodes` | clean; one line of `net-noodl-http.md` moved |
| `CHR007_WRITE_SNAPSHOT=1` | 🔴 **ZERO delta.** The snapshot records port CLASSES for inputs; a signal output adds none. Rule 5's step 4 is a no-op for a port of this shape |
| `noodl-mcp` | R4's floor holds: 7 suites / 8 tests, the same seven names, `Group` still at exactly **14,315** |
| `export-ledger:check` · `picker-coverage --check` | clean, and **no row is owed** — a ledger row follows a TYPE, and no type was added |

### 5.4 The runs

- 🔴 **`nodegx-backend` WHOLE — the run s3 could not finish.** Three attempts there, two
  straddling a peer's commit and one dead at exit 144 on a load-40 box. Here, on a quiet box at
  `--maxWorkers=2`: **149/149 suites, 1758 passed, 10 skipped, 0 failed**, 506 s. Nothing was
  suspected and nothing was found — the point is that the claim is now "the package" rather than
  "the eight most likely", which was s3's own request.
- **`test:main` 504/504 suites, 8065/8065 tests** (s3: 8063).
- `noodl-runtime` 2833 · `noodl-viewer-cloud` 234 · `noodl-mcp` at R4's floor.
