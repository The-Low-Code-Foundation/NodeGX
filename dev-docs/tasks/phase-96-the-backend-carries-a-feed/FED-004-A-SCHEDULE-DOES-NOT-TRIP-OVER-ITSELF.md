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
3. **AC3** — Same, `allow`: four runs execute, overlapping, as today.
4. **AC4** — A fixture server returning an `ETag` and honouring `If-None-Match`: two consecutive
   `HTTP Request` calls with `conditional: true` produce one `Success` and one `Not Modified`; the
   `_HttpCache` row exists; the fixture's request log shows the second request carried the header.
5. **AC5** — A fixture that ignores validators: both calls are `Success`; nothing breaks.
6. **AC6** — The fixture's request log shows a `User-Agent` starting `NodeGX/` on every request,
   and a graph-set `User-Agent` overrides it.
7. **AC7** — The dashboard's trigger view shows the policy and the last skip, and `Get trigger`
   over MCP returns `overlapPolicy`.
