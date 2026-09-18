# Phase 96 — The backend carries a feed

**Scoped:** 2026-09-18, from Richard's ruling in the Distraction brainstorm (the Thread app reborn as a
NodeGX app at distraction.digitalbricks.io), and a capability survey of `packages/nodegx-backend`,
`packages/noodl-viewer-cloud` and `packages/noodl-runtime` taken the same afternoon at `cline-dev`
HEAD `f3f67874d`.
**Status: 🚧 R1–R4 RULED (§4). FED-001 BUILT AND DRIVEN, AC5 outstanding. FED-002 is next.** **Prefix: `FED`.**

> "I'd really like the NodeGX backend to be able to handle this stuff. I want people to see NodeGX as
> an alternative to tools like Supabase and n8n as well as a front end builder. The old Noodl made the
> backend an afterthought but I want to make it real. If part of the prep for this project is adding
> stuff to the backend functions or workflows, feel free to add a phase directly in the NodeGX
> project on the cline-dev branch to add the stuff you'd need. If we can avoid a custom server next to
> NodeGX that'd be ideal, because a big complaint from vibe coders today is about having no
> visibility in front or back end on how things the AI built actually work, or any ability to tweak
> them by hand as a non coder." — Richard, 2026-09-18

## 1. The person sentences

> **Someone building a feed app in NodeGX points a schedule at a list of RSS, YouTube, Reddit and
> Bluesky sources, and every few minutes new items land in a collection, deduplicated, tagged by a
> model, and readable by the person they belong to. No server exists beside the backend. Every step
> of it is a node or a workflow step they can open and change.**

> **A second app on another NodeGX backend can read and write the first one's collections through
> an API key, and so can Claude on a laptop, through MCP.**

The app that proves it is Distraction (mockup:
[claude.ai/artifact/DuqGkuCT4JoCFaXZKpUg8P](https://claude.ai/artifact/DuqGkuCT4JoCFaXZKpUg8P)).
Its UI build waits for phase 94; **this phase is the backend and does not wait for 94.**

## 2. What the survey measured (2026-09-18)

**✔** = re-read at HEAD `f3f67874d` by the scoping session. **·** = reported by the survey agent
from one grep, not re-read — **re-read before building on it.**

**Already there. No work in this phase.**

| | reading | where |
|---|---|---|
| · | Cloud functions are node graphs under `/#__cloud__/`, entered by `noodl.cloud.request`, invoked at `POST /functions/*name`, with `call` / `rateLimit` / `timeoutMs` / `idempotency` rules per function | `noodl-viewer-cloud/src/index.ts:111`; `nodegx-backend/src/server/HttpServer.ts:645-651, 2017`; `security/model.ts:166-215` |
| · | A function's own DB access runs **as system with the master key** and bypasses CLPs and ACLs; `runAs: 'system'` is the only accepted value. A function may stamp any `ACL` on create, or mint a real session for a user via `Users.impersonate` | `service.ts:531-545`; `security/model.ts:169-171, 541`; `noodl-viewer-cloud/src/api/users.js:68-120` |
| ✔ | Schedule triggers exist: 5-field cron, `missedFirePolicy: skip \| run-once-on-start`, constant `payload`; targets a function or a workflow. **"Single process, no queue — honest v1 semantics."** | `triggers/registry.ts:68-88`; `triggers/scheduler.ts:7` |
| ✔ | Workflow `for-each` already carries `concurrency` (default 1), `maxIterations` (1000, loud failure) and `continueOnError` | `workflow/steps/kinds.ts:484-512` |
| ✔ | The `HTTP Request` node is cloud-registered, takes custom request headers, and exposes `responseHeaders` | `noodl-runtime/src/nodes/std-library/data/httpnode.ts:107, 170, 182`; `noodl-viewer-cloud/src/nodes/index.ts` (CWF-003 block) |
| ✔ | Secrets: `<dataDir>/secrets.json` mode 0600; a function can read **only** the `functions` namespace, through the cloud-only `Secret` node; env fallback `NODEGX_SECRET_<NAME>` | `config/SecretsStore.ts`; `service.ts:43, 808`; `noodl-viewer-cloud/src/nodes/cloud/secret.ts` |
| · | Collections: `$in/$nin/$regex/$text/$exists/$gt…`, `limit/skip/order/count`, `creatorOwns` default true with the ACL predicate built **in SQL**, FTS5 full-text search opt-in per collection | `local-sql/QueryBuilder.ts:337-607`; `server/parse-wire.ts:48-69, 177`; `security/model.ts:164, 294, 492`; `src/search/` |
| · | Auth principals: master key, **scoped API keys** (`X-NodeGX-Api-Key`, `classes:*`, `functions:<name>`, hashed, revocable), session users with flat roles | `security/state.ts:282-330`; `security/model.ts:503-521` |
| · | Files (25 MB default, local or S3), SSE realtime, execution records in `executions.sqlite`, the `/_admin` dashboard, and ~30 admin MCP tools in `packages/noodl-mcp` | `src/storage/`; `workflow/`; `noodl-mcp/src/tools/backendTools.ts` |

**Missing. This phase.**

| | reading | where |
|---|---|---|
| ✔ | 🔴 **No XML parsing anywhere.** No `xml2js`, `fast-xml-parser`, `DOMParser` in any `package.json`, no XML node, no XML branch in the HTTP node. RSS, Atom, YouTube's channel feed, Reddit's `.rss`, every podcast: unreadable. CSV has a node; XML has nothing | grep of `packages/*/package.json`, `noodl-runtime/src`, `noodl-viewer-cloud/src`, `nodegx-backend/src` — zero hits |
| ✔ | 🔴 **Only `createdAt` and `updatedAt` are ever indexed.** No index API on the schema surface, no unique constraint. A feed items table keyed on `guid` / `sourceId` / `publishedAt` full-scans, and dedupe is a query-then-insert race | `local-sql/SchemaManager.ts:128-129, 341, 467-468`; `persistence/SchemaManagerLike.ts:77-79` |
| ✔ | 🔴 **No model call from the backend.** The only `anthropic` hit in the cloud runtime is the sentence saying SDKs are unsupported. A function cannot `require()` (single prebuilt bundle, no `node_modules`). The Electron editor's assistant client is not a runtime capability | `noodl-viewer-cloud/src/kitModules.ts:111-118`; grep of `nodegx-backend/src`, `noodl-viewer-cloud/src` |
| ✔ | A schedule that fires while its previous run is still going **starts a second run**. `ScheduleConfig` has no overlap policy; the scheduler tracks `running` for itself, not for the target | `triggers/registry.ts:68-88`; `triggers/scheduler.ts:102-122` |
| · | The backend exposes no MCP endpoint; `packages/noodl-mcp` is a client of the backend's admin routes and has no data CRUD tool. Nothing lets a *backend* publish tools to an external MCP client | grep `mcp` in `nodegx-backend/src` (comments only); `noodl-mcp/src/tools/backendTools.ts` |

**Known, out of scope here, already specced elsewhere:** a function cannot emit a stream
(phase 45, `phase-45-streaming/README.md:15-19`); no vector search and no multi-collection reads
(phase 48, `phase-48-data-ceiling/README.md`); aggregation is single-group only
(`parse-wire.ts:305-342`). See §6.

## 3. What the feed app needs, and which gap each need hits

| the app needs to | today | gap |
|---|---|---|
| fetch a YouTube channel feed, a subreddit `.rss`, an OPML import's feeds, a Bluesky JSON feed | HTTP node fetches; JSON works | **XML** — FED-001 |
| put each item in `Item` once, however many users follow the source | insert races; no unique key | **indexes** — FED-002 |
| tag each new item with a few topics, and run "dig deeper" | nothing | **model call** — FED-003 |
| poll 1,000 sources every 15 min without a second poll piling on the first | for-each concurrency ✔; overlap ✗; ETag ✗ | **polling etiquette** — FED-004 |
| let the todo app, and Claude on the laptop, read and write its collections | API key ✔ for server-to-server; MCP ✗ | **MCP** — FED-005 |
| prove all of it works end to end with no sidecar | | **the drive** — FED-006 |

Ranking per user is a function over that user's recent items and topic weights: nothing new
needed. Search across items is FTS5: nothing new needed. Push to the phone is out of this phase
(the PWA reads the list).

## 4. Rulings — RULED by Richard, 2026-09-18

### What the scoping session asked, and recommended

- **R1 — Parse Feed: a built-in node, or a vendored cloud kit module?** Recommend **built-in,
  shared** (browser and cloud), like Parse CSV. A kit module would keep it out of the catalogue and
  out of the person's sight, which is the opposite of the ask.
- **R2 — The model node: Anthropic-only, or a provider enum from day one?** Recommend **one
  `Model Request` node with a `provider` enum, Anthropic implemented in this phase**, an
  OpenAI-compatible endpoint left as a declared value that errors "not yet". The graph the person
  builds never changes when the second provider lands.
- **R3 — MCP on the backend: in this phase, or its own?** It is the largest task and the one with
  the widest blast radius (a new auth surface). Recommend **in this phase, last, and split-able**:
  FED-005 can become phase 97 without touching FED-001–004 or the drive.
- **R4 — Runs in parallel with 94 and 95?** No file in this phase touches the editor. Recommend
  **yes, a second session**, and the drive (FED-006) is what keeps it honest.

### The rulings as given

Asked in plain words, answered in one pass, 2026-09-18 (session 1).

| | asked | **ruled** |
|---|---|---|
| **R1** | where the feed reader lives, and whether a library does the XML | **Visible node + proven library.** `Parse XML` and `Parse Feed` in the node picker beside `Parse CSV`, browser and cloud; `fast-xml-parser` (MIT, no transitive deps) vendored rather than hand-rolled. The hand-rolled alternative was put to him with the CSV precedent measured (`noodl-runtime/src/csv.ts`, 253 lines, zero deps) and the reason to refuse it (entity bombs, CDATA, namespaces) — he took the library |
| **R2** | one model node with a provider dropdown, or Anthropic-only | **One node with a provider dropdown.** `Model Request` ships `provider` from day one; `anthropic` works, anything else fails with `not_implemented`. No graph built now is ever rewired |
| **R3** | MCP in this phase or its own | **Keep it here, build it last.** FED-005 stays in the table and stays liftable into phase 97 if it grows |
| **R4** | run beside phases 94 and 95 | **Yes.** No file in this phase touches the editor. Commits use explicit pathspecs so a sibling's work is never swept |

**Nothing in this phase is now gated on a ruling.** FED-001 is buildable.


## 5. The tasks

| task | one line | built | gated | driven |
|---|---|---|---|---|
| [FED-001](FED-001-A-FEED-IS-A-THING-YOU-CAN-PARSE.md) | `Parse XML` and `Parse Feed` nodes; RSS 2.0, Atom, RDF, YouTube, Reddit, podcasts → one item shape | ✅ | 🟢 5/6 | ✅ | 

**FED-001, s1:** built, driven over HTTP on a real backend, 53 tests green across the two suites. **AC5 (browser bundle ≤ 50 KB gzipped) is the one thing left** — it needs two webpack production builds and the box was at load 18.9 under a peer's stack. See FED-001 §6.

| [FED-002](FED-002-A-COLLECTION-DECLARES-ITS-INDEXES.md) | `indexes` per collection in `schema.json`, unique included; upsert-on-unique on create | ⬜ | ⬜ | ⬜ |
| [FED-003](FED-003-A-FUNCTION-CALLS-A-MODEL.md) | `Model Request` cloud node: key from `Secret`, structured JSON out, usage counted, no SDK | ⬜ | ⬜ | ⬜ |
| [FED-004](FED-004-A-SCHEDULE-DOES-NOT-TRIP-OVER-ITSELF.md) | `overlapPolicy` on schedules; conditional GET (ETag / 304) on the HTTP node; a `User-Agent` | ⬜ | ⬜ | ⬜ |
| [FED-005](FED-005-A-BACKEND-SPEAKS-MCP.md) | `/mcp` on the backend: functions and collections as tools, scoped by API key | ⬜ | ⬜ | ⬜ |
| [FED-006](FED-006-THE-DRIVE-ONE-FEED-END-TO-END.md) | the drive: fixture feeds → schedule → parse → dedupe → tag → per-user read, on a provisioned backend | ⬜ | ⬜ | ⬜ |

## 6. Out of scope, and why

- **Streaming a function's response** — phase 45 owns it. Dig deeper renders when done in v1.
- **Vector search / embeddings** — phase 48 owns it. Topic tagging to a fixed list plus FTS5 is
  enough for the first feed.
- **A durable job queue** — the scheduler stays one process. With `for-each` concurrency and FED-004's
  overlap guard, 1,000 sources at 15-minute intervals is a few hundred fetches a minute in one
  process, which is fine. Revisit when a real number says otherwise.
- **Multi-group aggregation and cross-collection joins** — the feed app computes per-user ranking in
  a function over that user's rows. Not needed to close this phase.
- **Push notifications** — not this phase.
- **The Distraction UI** — waits for phase 94's design system, by Richard's ruling.

## 7. Rules every task inherits

1. **Everything a person can open.** Every capability lands as a node, a workflow step, or a key in
   a JSON file the admin dashboard and MCP already edit. No capability lives only in code a person
   cannot see from the editor.
2. **No new dependency reaches the client bundle.** A parser added for the cloud runtime is
   pure JS and small; check `packages/noodl-viewer-react`'s bundle size before and after.
3. **Secrets never cross the wire out.** A model key is read by `Secret`, used in the request, and
   never appears in a port value, an inspector, a log line or an execution record.
4. **Tests are the drive, not the unit.** Each task ships a test in `packages/nodegx-backend/tests/`
   that provisions a backend and exercises the feature over HTTP, in the house style of
   `cloud-http-node.test.ts` and `impersonate-session.test.ts`.
5. **[PHASE-EXECUTION.md](../../guidelines/PHASE-EXECUTION.md) applies.** A defect found while
   driving is filed, with an owner, and the next session builds the next task unless the defect
   carries `BLOCKS <AC>`.

## 8. Close condition

FED-006 is green on a fresh backend: two fixture feeds (one RSS 2.0, one Atom) polled by a
schedule, items landing once each in `Item` under a unique index, each tagged by a model call with
a key from `secrets.json`, readable by a session user and by an API key, and readable through
`/mcp` by an MCP client. **No process other than `nodegx-backend` is running.** Richard has seen
the execution record in the dashboard and ruled it legible.
