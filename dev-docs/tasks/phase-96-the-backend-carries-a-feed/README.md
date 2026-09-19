# Phase 96 — The backend carries a feed

**Scoped:** 2026-09-18, from Richard's ruling in the Distraction brainstorm (the Thread app reborn as a
NodeGX app at distraction.digitalbricks.io), and a capability survey of `packages/nodegx-backend`,
`packages/noodl-viewer-cloud` and `packages/noodl-runtime` taken the same afternoon at `cline-dev`
HEAD `f3f67874d`.
**Status: 🚧 R1–R4 RULED (§4). FED-001 ✅ CLOSED. FED-002 ✅ CLOSED. FED-003 ✅ CLOSED. FED-004 ✅ CLOSED. FED-005 ✅ CLOSED. FED-006 (the drive) is next and is the last task.** **Prefix: `FED`.**

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
| [FED-001](FED-001-A-FEED-IS-A-THING-YOU-CAN-PARSE.md) | `Parse XML` and `Parse Feed` nodes; RSS 2.0, Atom, RDF, YouTube, Reddit, podcasts → one item shape | ✅ | ✅ 6/6 | ✅ |
| [FED-002](FED-002-A-COLLECTION-DECLARES-ITS-INDEXES.md) | `indexes` per collection in `schema.json`, unique included; upsert-on-unique on create | ✅ | ✅ 7/7 | ✅ |
| [FED-003](FED-003-A-FUNCTION-CALLS-A-MODEL.md) | `Model Request` cloud node: key from `Secret`, structured JSON out, usage counted, no SDK | ✅ | ✅ 9/9 | ✅ |
| [FED-004](FED-004-A-SCHEDULE-DOES-NOT-TRIP-OVER-ITSELF.md) | `overlapPolicy` on schedules; conditional GET (ETag / 304) on the HTTP node; a `User-Agent` | ✅ | ✅ 7/7 | ✅ |
| [FED-005](FED-005-A-BACKEND-SPEAKS-MCP.md) | `/mcp` on the backend: functions and collections as tools, scoped by API key | ✅ | ✅ 8/8 | ✅ |
| [FED-006](FED-006-THE-DRIVE-ONE-FEED-END-TO-END.md) | the drive: fixture feeds → schedule → parse → dedupe → tag → per-user read, on a provisioned backend | ⬜ | ⬜ | ⬜ |

**FED-001 is CLOSED (s1):** built, gated, driven over HTTP on a provisioned backend, 53 tests green
across the two suites, and the bundle budget measured at **+14.8 KB gzipped against 50 KB**.

**FED-002 is CLOSED (s2):** built, gated, driven over HTTP on a provisioned backend, 40 tests green
across the two suites (26 over HTTP, 14 against the SQL). Twenty concurrent upserts of one id leave one row; 20,000 rows sorted by an
indexed `published desc` answer in **0.04 ms against a control's 8.92 ms**, with
`EXPLAIN QUERY PLAN` naming the index. One defect filed (R3: a property called `id` is never
*auto*-created as a column — declared ones are fine, which is what every AC drives through).

**FED-004 is CLOSED (s4):** built, gated and driven, **26 specs across three suites** — a
timeline on fake timers, a provisioned backend over real HTTP, and a `node:http` fixture that
honours `If-None-Match`. `overlapPolicy` (`skip` default, `queue-one`, `allow`), conditional GET
through a `_HttpCache` validator table that is deliberately **not a cache**, a `Not Modified`
output, and `User-Agent: NodeGX/<version> (+<publicUrl>)` on every outbound request the graph did
not name one for. 🔴 **And the run s3 owed: `nodegx-backend` WHOLE at 149/149 suites / 1758
tests**, plus `test:main` at **504/504 suites, 8065/8065**.

**FED-005 is CLOSED (s5):** built, gated and driven, **39 specs across three suites** — the
surface and the door, the acting-as-a-user half, and one suite driven by the **official MCP
TypeScript client** rather than by another `fetch`. `POST /mcp` speaks stateless Streamable HTTP
and computes `tools/list` per request from the key's scopes; an `_ApiKey` may be BOUND to one
`_User` (`actsAsUserId`) and then sees exactly what that person sees — **across the whole data
plane, not only over MCP**, because two authorization models means an attacker uses the weaker
one. No `_delete` tool exists for any collection, the master key is refused at the door, and
every tool call writes an audit row.

🔴 **It found and fixed a live privilege escalation on the way (register R9).** A scoped API key
with `classes:read` could read `_Session` through `/classes` and get **live session tokens in
plaintext** — impersonation of every account on the backend — plus `_ApiKey`, `_User` and
`_Audit`. `checkClp` consulted a key's scopes and never the system-collection posture that
`effectiveRule` carries for everyone else. Users and anonymous callers were correctly refused the
whole time, which is why no test saw it. Fixed at the root, above the key branch, so it covers
every non-admin principal in one statement.

🔴 **One deliberate behaviour change, recorded here because it is the only one in the phase:** a
`triggers.json` written before FED-004 now gets `overlapPolicy: skip` rather than the `allow` it
had. §3.1 asked for it and FED-004 §5.1 says why. BAK-007's backup schedule and the file orphan
sweep inherit the same guard.

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
5. 🔴 **A new node type owes FOUR regenerations, and a per-package test run sees NONE of them.**
   Learned the expensive way in s1: FED-001's suites were green in `noodl-runtime` and
   `nodegx-backend`, and the nodes still red **two editor gates** that only `test:main` runs. Adding
   a node type means, in order:
   `npm run catalog:generate` → `npm run catalog:merge` → `npm run docs:nodes` →
   `CHR007_WRITE_SNAPSHOT=1 npx jest tests-unit/chr-007/widgetDispatch.test.ts` (from
   `packages/noodl-editor`). The two gates that catch a miss are
   `tests-unit/alpha-006/nodeDocs.test.ts` (every catalog node needs a generated docs page on disk)
   and `tests-unit/chr-007/widgetDispatch.test.ts` (the recorded port-class map must cover every
   catalog type). **Then run `npm run test:main` before committing** — it is 500 suites in ~48
   seconds and it is the only run that sees across the editor's packages. **FED-003 adds
   `Model Request`: this is its checklist too.**

   🔴 **And `test:main` is not the end of it: a new node type also owes `packages/noodl-mcp`,
   which `test:main` does not run.** Measured at s2 (2026-09-18): `tests/fld013ExportReach.test.ts`
   named FED-001's two types outright — unclassified against the export coverage ledger
   (`packages/nodegx-export/coverage-ledger.json`), whose own gate refuses an unclassified type.
   So the fifth step of the checklist is **`npx jest` in `packages/noodl-mcp`**, and the sixth is
   **a ledger row plus `node scripts/export-ledger/check.js` and
   `node scripts/export-ledger/picker-coverage.js --check`** for every type added. Both gates
   print the number they measured on a refusal — take it from them, never increment the literal.

   ✅ **Ruled and paid the same day** (register R4). Richard, 2026-09-18: *"I'll likely convert all
   nodes to code export, so you can add them to the list of exportable ones to work on."* The two
   parsers are the ledger's first `scheduled` rows. **What this means for FED-003:** `Model Request`
   is cloud-only, so its row is `backend-only` and the check will insist on exactly that — no
   ruling needed, but the row is not optional.
   ✅ **What a new PORT costs, measured at FED-004 (s4), because rule 5 is written about a new
   TYPE and a port is the commoner case.** Two ports on `net.noodl.HTTP`: `catalog:generate`
   catalogues the static OUTPUT and does **not** catalogue the dynamic INPUT (this node
   catalogues only `cancel`/`fetch`/`url` statically, so FED-001's `responseType` is absent too —
   not a miss); `catalog:merge` and `docs:nodes` move one documentation line; **the CHR-007
   snapshot regenerates to a ZERO delta**, because it records port CLASSES for inputs and a
   signal output adds none; and **no ledger row is owed**, because a row follows a TYPE. The
   `noodl-mcp` run is still owed and still worth doing — it is what confirmed R4's floor held.

   🔴 **And there is a SEVENTH step none of the six catch, found at FED-003 (s3): registering a
   node is not OFFERING it.** `Model Request` was registered in
   `noodl-viewer-cloud/src/nodes/index.ts`, both its suites were green, all nine of its ACs were
   satisfied — and the generated catalog said **`inNodePicker: false`**, the only `false` among
   eighteen cloud nodes. The picker's index is a hand-curated list in
   `noodl-runtime/src/nodelibraryexport.ts`; a type absent from it runs perfectly and **cannot be
   added to a graph by a human being**, which is rule 1 broken by a node that passes every test.
   Nothing in the repo catches this. So: **after `catalog:generate`, read the new type's
   `inNodePicker` out of `packages/noodl-types/src/node-catalog.json`** — add the row, or know why
   not.

   🔴 **An eighth, also found at FED-003: a cloud node owes `AIB-007`'s classification table**
   (`noodl-editor/src/editor/src/validation/backendRequirement.ts`). That one DOES have a gate —
   it is in `test:main` and it caught the miss — but it is worth knowing before rather than after,
   because the decision it forces is a real one, not a formality.
6. **[PHASE-EXECUTION.md](../../guidelines/PHASE-EXECUTION.md) applies.** A defect found while
   driving is filed, with an owner, and the next session builds the next task unless the defect
   carries `BLOCKS <AC>`.

## 8. Close condition

FED-006 is green on a fresh backend: two fixture feeds (one RSS 2.0, one Atom) polled by a
schedule, items landing once each in `Item` under a unique index, each tagged by a model call with
a key from `secrets.json`, readable by a session user and by an API key, and readable through
`/mcp` by an MCP client. **No process other than `nodegx-backend` is running.** Richard has seen
the execution record in the dashboard and ruled it legible.
