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
