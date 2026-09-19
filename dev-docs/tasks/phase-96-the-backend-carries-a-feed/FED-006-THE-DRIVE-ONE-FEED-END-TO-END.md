# FED-006 — The drive: one feed, end to end

## 1. The person sentence

**A fresh backend, a schema, a schedule and one cloud function. Fifteen minutes later there are
items in the list, each once, each tagged, and a person signed in on the app sees theirs. Nothing
else is running.**

## 2. What is there

Nothing. This is the gate for the phase and it is built last. Its fixtures are built first, in
FED-001, and reused.

## 3. Design

### 3.1 The fixture world

A test-local HTTP server (the pattern in `cloud-http-node.test.ts`) serves:

- `/blog.xml` — RSS 2.0, 5 items, with `ETag`
- `/channel.xml` — a captured YouTube channel Atom feed, 3 entries, `yt:videoId`, thumbnails
- `/r/selfhosted.rss` — a captured subreddit Atom feed, 4 entries, refuses requests without a
  `User-Agent` (403)
- `/model` — a fake Anthropic Messages endpoint that returns a fixed `tool_use` block tagging
  any input with `["ai-coding", "self-hosting"]`, and records the `x-api-key` it received

The test provisions a backend with `secrets.json` holding `functions.MODEL_KEY = "test-key-123"`
and `functions.MODEL_BASE_URL` pointed at `/model`.

### 3.2 The project

`tests/fixtures/feed-drive/` is a minimal NodeGX project:

- `schema.json`: `Source { url, kind, title }`, `Item { id (unique), sourceId, title, link,
  published, image, summary, topics }`, `Follow { userId, sourceId }`, `Keep { userId, itemId,
  value }`, with indexes from FED-002 on `Item.id` (unique), `Item.published desc`,
  `Follow.userId`.
- One cloud function `pollSources`: `Query Records (Source)` → `for-each (concurrency 4,
  continueOnError)` → `HTTP Request (conditional, text)` → `Parse Feed` → `for-each` →
  `Model Request (tag)` → `Create New Record (Item, upsertOn: id)`.
- One cloud function `myList`: caller's `Follow` rows → `Item` where `sourceId $in` those, order
  `-published`, limit 50. Runs as system, filters by the caller's `userId` from the Request node.
- A schedule trigger `@minutely` → `pollSources`, `overlapPolicy: skip`.
- `security.json`: `Item` readable by `authenticated` and not creator-owned; `Follow` and `Keep`
  creator-owned; `pollSources` callable by `nobody` (schedule only); `myList` by `authenticated`.

### 3.3 The drive

1. Provision, push schema, deploy the functions, create the trigger. Assert the process count.
2. Insert three `Source` rows over HTTP as admin. Create users A and B; A follows blog and
   channel, B follows the subreddit.
3. Wait for two fires. Assert: `Item` count is 12 exactly (5 + 3 + 4, after two polls); every
   item has `topics` set; the fake model saw `x-api-key: test-key-123` twelve times and never in
   any execution record, log line or HTTP response (grep the captured stdout and the records).
4. As A, call `myList`: 8 items, newest first. As B: 4. A cannot read B's `Follow` rows over HTTP.
5. The second poll of `/blog.xml` was a 304 (fixture log). The subreddit fixture saw a
   `User-Agent` starting `NodeGX/`.
6. Make `pollSources` sleep past the minute; assert one `skipped-overlap` record.
7. With an API key that acts as A, over `/mcp`: `tools/list` shows `Item_find`, `Follow_find`,
   `Follow_create`, `Keep_create`, `myList`, and no `_delete`; `myList` returns A's 8.
8. `ps`: one `nodegx-backend` process and the test's fixture server. Nothing else.

### 3.4 What Richard sees

A screenshot of the `/_admin` execution list after step 3, and of one `pollSources` record open,
goes in `shots/`. The close condition in the README says he must rule it legible: a person who
did not build this should be able to read the record and say which source produced which items.

## 4. Acceptance criteria

1. **AC1** — Steps 1–8 pass as one test file in `packages/nodegx-backend/tests/feed-drive.test.ts`
   on a clean checkout, under 5 minutes.
2. **AC2** — The model key appears nowhere but the request to the fixture: asserted by grepping
   every execution record, the test's captured stdout/stderr, and every HTTP response body.
3. **AC3** — Deleting the trigger and re-running from step 3 with `missedFirePolicy:
   run-once-on-start` after a simulated restart produces exactly one extra run.
4. **AC4** — The fixture project is added to the examples the MCP `get_example` tool can serve,
   named `feed-reader`, with a `docs/START-HERE.md` in the house style of `Todo list`.
5. **AC5** — Richard has ruled the execution record legible (§3.4).

---

## 5. What was built (s6, 2026-09-19)

**AC1 ✅ · AC2 ✅ · AC3 ✅ · AC4 ✅ (ruled) · AC5 🟢 both conditions BUILT; the ruling itself is the last step.**

`packages/nodegx-backend/tests/feed-drive.test.ts` — **24 specs, green in ~40 s**, well inside
AC1's five minutes. The project it drives is `tests/fixtures/feed-drive/project.ts`: the schema,
the access rules, two cloud functions, two helper components and the schedule, with nothing about
the graphs in the test file itself.

### 5.1 Where this deviates from §3, and why

Each of these is the artefact correcting the design, not a shortcut.

| §3 said | what was built | why |
|---|---|---|
| twelve items (5 + 3 + 4) | **seven** (3 + 2 + 2), as a constant with a spec that counts the fixture documents | The FED-001 fixtures on disk hold 3, 2 and 2. §3.3's arithmetic was written before anyone counted the files. Editing a fixture now reddens the constant. |
| the fake model returns a **`tool_use`** block | it returns a text block whose text is the JSON | `Model Request` does not implement structured output as a tool. It sends `output_config.format = {type: 'json_schema', schema}` and parses the text (FED-003 §3.2). A `tool_use` fixture would have been answering a question the node never asks. |
| `MODEL_BASE_URL` in `secrets.json` | a **`Secret` node** reads it and wires it into `Base Url` | `Model Request` has `apiKeySecret` (a secret NAME) but `baseUrl` is an ordinary input. Reading it through `Secret` is what makes "point this at a gateway" an operator's edit. It also puts a second cloud node in the drive for free. |
| `@minutely` polled, "wait for two fires" | a real `* * * * *` cron, fired twice through `run-once-on-start` catch-up + `POST /admin/triggers/:id/enabled` | FED-004's compression. Both fires are real dispatches through the real `TriggerDispatcher`; waiting for two minute boundaries would not fit AC1's budget. |
| `Item.topics` unspecified | `String`, holding `"ai-coding, self-hosting"` | §3.4's close condition is Richard ruling the record **legible**. A JSON blob in a column is not. |
| AC4: *"added to the examples `get_example` can serve, named `feed-reader`, with a `docs/START-HERE.md`"* | **one validated example fragment**, `docs/node-catalog/examples/cloud-tag-a-feed-item-with-a-model.json` | 🔴 Measured: no artefact has both properties. `get_example` serves graph FRAGMENTS (108 of them, none with a START-HERE.md); a project with `docs/START-HERE.md` is a `templates/` entry served by `create_project`. **Put to Richard 2026-09-19 and ruled: the fragment.** Named in the examples directory's own descriptive style rather than `feed-reader`. |

### 5.2 Four findings, each of which cost a wrong reading first

1. 🔴 **`Model.create` takes `data.id` as the record's IDENTITY and drops the key.**
   `for (var key in modelData) { if (key === 'id') continue; ... }`. So a `Parse Feed` item's `id`
   — the entire basis of "each item lands once" — is on `record.getId()` and **nowhere in
   `record.data`**. A script reading `item.id` off one gets `undefined`, and the write then fails
   with *"Upsert On names id, but this record has no value for it"*. `runtasks.ts` has the same
   knowledge written out by hand, one line above the loop that copies every other field.

2. 🔴 **`Run` is additive, and the default runs the node early with everything else unset.**
   NDA-017's default is that a new value on ANY input re-runs the node; wiring a control signal
   does not make the others passive. Measured: `mapItems` ran the moment `sourceRowId` arrived,
   produced an empty list from an `items` input that had not been set yet, handed `Run Tasks`
   nothing to do — and the poll **fetched the feed, reported success in 48 ms and wrote no rows**.
   Every value input in this project that a signal already sequences is declared
   `runOnChange-<port>: false`.

3. 🔴 **`Query Records` has no `filter` port.** Its JSON filter is a script
   (`storageJSONFilter`) in the neutral vocabulary — `where({ sourceId: { containedIn: $sourceIds } })`
   — and each `$var` mints an input port named `storageFilterValue-<var>`. The fetch signal is
   `storageFetch`, not `fetch`. Both `Query Records` and `Parse Feed` publish a **Collection of
   records**, not plain objects, so `row.url` is `undefined` and the fields are on `row.data`.

4. 🔴 **A `status: success` execution row says nothing about whether the graph succeeded** — see
   the mutant table below.

### 5.3 Three mutants, because a green drive has told you nothing

| mutant | first result | after the gate was fixed |
|---|---|---|
| **remove `upsertOn: 'id'`** from Create Record | 🔴 **24/24 STILL GREEN** | 1 red |
| `Conditional` off on the HTTP node | 2 red (the 304 spec, and the model-call count) | 2 red |
| the API key not bound to Alice (`actsAsUserId` dropped) | 1 red (`myList` over `/mcp` is an error result) | 1 red |

🔴 **The first mutant is the finding.** Both of `pollSources`' Response nodes answer HTTP 200 —
one says `polled`, the other `failed` — so the execution row reads `success` whichever fired.
Without `upsertOn` the second poll's writes were refused by the unique index one item at a time,
`Run Tasks` reported the failures, the graph answered on `resErr`, the row still said `success`,
and the item count was still seven **because the refusals wrote nothing**. A gate with a hole
shaped exactly like the defect. It now reads the STEPS: which Response node ran, and whether any
step errored — which is the same thing §3.4 asks Richard to rule legible, and that is not a
coincidence.

### 5.4 What two polls cost, and why it is not seven

`MODEL_CALLS` is **11**, not `TOTAL_ITEMS`. The first poll tags all seven; the second tags every
item of every feed that answered 200, because this graph re-tags before it upserts. The blog's
`ETag` answers 304 and spares its three. That gap is the economic argument for `Conditional`,
measured in model calls rather than asserted. **Tagging only what the database has not seen is the
obvious next thing to build and was deliberately not built** — the drive's job is to show what the
decisions cost, and a graph that optimised this away would show nothing.

### 5.5 Two parts of §3.3 deliberately not built, so nobody assumes they shipped

- **Step 6 — "make `pollSources` sleep past the minute; assert one `skipped-overlap` record."**
  Not built. `fed-004-overlap-drive.test.ts` already drives exactly this on a provisioned backend,
  and harder: three re-arms during one slow run, three skip records each naming the run they
  yielded to, the trigger's own `skipCount`, and an `allow` control arm proving the word is what
  did it. A second copy here would be a duplicate of the first, and a duplicate check is the
  cheapest way to end up with two that disagree. **What FED-006 does carry is the decision being
  SAYABLE**: the trigger authors `overlapPolicy: 'skip'` rather than inheriting it.
- **Step 7's `Follow_create` and `Keep_create` among the offered tools.** The drive's key is
  scoped `classes:read`, so it offers no create tool at all and the spec asserts that — a
  narrower, more honest thing to measure than "these two creates are present". A key scoped
  `classes:*` would offer them; nothing here says it would not.

### 5.6 AC5 — the two conditions Richard put on ruling, both built (s6)

He was shown what the record does and does not say, and ruled twice on 2026-09-19.

**Ruling 1 — "a failing step must name its subject."** A step is identified by `nodeId`, which is
the GRAPH node's id, so every instance of a component writes under the same name: one poll of four
feeds records four steps called `http`, and `http · error · "The server answered 403 Forbidden"`
could not say which feed. The node always knew — `httpnode.ts` composes `detail: { url, status }`
for the error bus — so `RuntimeStepEnd` gained `detail` and `WorkflowRunner.endStep` carries it
into the record.

- 🔴 **Scrubbed exactly as `inputData` is**, because a URL is one of the likelier places a
  credential turns up. The spec's broken feed carries the model key in its query string, so one
  request measures both halves: the path is in the record, the key is not.
- **Objects only.** `detail` is `unknown` at the node; a bare string would land as a field whose
  meaning nobody could recover, so it is dropped rather than guessed at.
- It rides inside `outputData` so `BoundedExecutionLogger.take` charges it to the run's record
  budget — a detail on a step inside a loop is written hundreds of times.
- **Reach:** five node modules already compose a `detail` and get this for free
  (`httpnode` ×2, `signfileurl`, `modelcrudbase`, `actiondispatchernode`, `componentutils/base`),
  plus every `raiseRuntimeError` call in the library.

**Ruling 2 — "a summary line" for the model cost**, settling FED-003 §5.5. `summariseModelCalls`
now returns `line`:

```
11 model calls · 1,320 in / 121 out tokens · 412 ms · claude-opus-5
```

- 🔴 **No money, and that is the ruling rather than an omission.** A price table the backend
  carried would go stale silently while continuing to render confidently. The specs assert the
  absence of a currency symbol.
- Cached tokens get their own clause — `82 in (24 cached) / 14 out tokens` — pinned in FED-003,
  whose fixture reports them; FED-006 pins the branch where there are none.
- Grouping is done by hand, not `toLocaleString()`: that reads the HOST's locale, so the same run
  would render `1,320` on one machine and `1.320` on another, and a record is a thing people paste
  to each other.
- **On the LIST as well as the row**, because §3.4's first screenshot is the list and "which of
  these runs was expensive" is a question a list answers at a glance or not at all.

**Three mutants, all caught, and the first two are independent claims rather than one:**

| mutant | result |
|---|---|
| `detail` dropped at the sink | the "names which URL" spec reds |
| `detail` carried UNSCRUBBED | only the redaction spec reds — the naming spec stays green |
| the cached-tokens clause removed from the line | FED-003's spec reds; FED-006's stays green |
| the list not decorated | two FED-006 specs red |

### 5.7 Still open

- **AC5's two screenshots** (§3.4) and the ruling itself. Both CONDITIONS Richard put on ruling are
  now built and measured; what is left is him looking at the dashboard and saying the word. Ruled
  2026-09-19: **next session, on a quiet box.** Recipe is in NEXT-SESSION-PROMPT.md §2.
- ✅ **FED-003 §5.5 is settled** — see §5.6. It is no longer waiting on anything.
