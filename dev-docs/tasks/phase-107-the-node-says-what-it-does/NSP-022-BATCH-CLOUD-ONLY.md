# NSP-022 — Batch: the cloud-only nodes

**Opened 2026-10-02 (s21), split from [NSP-014](NSP-014-BATCH-DATA-AND-CLOUD.md) as its status line said it would be.**
**Depends on NSP-007 and NSP-014's BACKEND seam (s21).** **Status: ✅ s99 (2026-10-12): 17 of 17 — Aggregate Records conforms (§6.8). s96: 13 of 17 conform on the runtime's new cloud target — HMAC, JWT Sign, JWT Verify, Secret, Create / Update / Delete User, Verify Session Token, Add User To Role, Remove User From Role, Get User Roles, List Users In Role, Send Email — each on its first or second run, every mutant killed. The world grew the KEYED SIGN (DIGEST) and HOST (the backend process's services). s97: Request and Response conform on HOST's new INVOCATION (§6.5–§6.6); P107-S97-USERSMEHANG fixed on the way. s98: Model Request conforms (16 of 17, §6.7), its two defects fixed first.**

## 1. The person sentence

> **Every node that runs only in the app's cloud functions is specced as the requests it makes and what it does with
> each answer — including failures — so a new cloud runtime can be checked against it.**

## 2. The nodes (from the census)

**17**, the census's `availableIn: ["cloud"]` rows of the old NSP-014 ([CENSUS.md](CENSUS.md); `tiers.json` batch
`NSP-022`). Regenerate the census; do not edit this list by hand.

Add User To Role · Aggregate Records · Create User · Delete User · Get User Roles · HMAC · JWT Sign · JWT Verify ·
List Users In Role · Model Request · Remove User From Role · Request · Response · Secret · Send Email · Update User ·
Verify Session Token (`noodl.cloud.*`).

Census notes carried over: **Aggregate Records** — category Cloud Services but cloud only; **HMAC** — deterministic
given the secret, T1 shape on the cloud target; **JWT Sign** — deterministic given key and clock; **JWT Verify** —
needs the clock for expiry; **Request** — the inbound request, a protocol's first event; **Response** — the outbound
response, a protocol's last event.

## 3. What is special here

- **They run in `noodl-viewer-cloud`, not the browser runtime.** The runtime target (`noodl-runtime/test/helpers/
  node-spec-target.ts`) mounts browser nodes; a cloud target is a second runtime adapter. Measure first what the cloud
  runtime registers and how a function's `Request` → `Response` round trip is driven headless.
- **HMAC, JWT Sign, JWT Verify** need WebCrypto's `importKey` / `sign`, which the world's DIGEST seam left to the host
  (world.ts DIGEST). They are deterministic given key, secret and clock — a seam extension, not a new one.
- **The user-admin nodes** (Create / Update / Delete User, roles) talk to the backend with the master key — through the
  BACKEND seam (R9: the operation, never the wire) if their calls go through the contract's adapter; measure that
  before assuming it.
- These specs are one input to the (uncommitted) Rust backend idea in README §8 — record that, don't act on it.

## 4. Acceptance criteria

As NSP-014 §4.

## 5. Watch for

As NSP-014 §5, and: *a target that cannot be pointed at a world is refused, not run flaky* (NSP-003 §4) — until the
cloud target exists, these specs are refused on the browser runtime with a reason, never counted.

## 6. Built

### 6.1 s96 (2026-10-12) — the cloud target, the keyed sign, HOST, 13 nodes

Richard's ask for s96: *"start focussing asap on the remaining node to spec … so the npm package stuff can be finished, and the
backend specs."* The ledger at the start: 125 of 147, 17 owed, all here.

**The cloud target** (`noodl-runtime/test/helpers/node-spec-target.ts`): `CLOUD_NODES` (the cloud runtime's own node files),
`withCloudNodes`, `cloudTarget()` = `runtimeTarget({ type: 'cloud' })` with them registered — a `NoodlRuntime` of type `cloud`,
what the backend's function runner builds; none of the browser's session nodes, none of the viewer's. `conformance.test.ts`
grades a spec on it when its type is one of `cloudNodeTypes()` (read from the modules). A second ADAPTER was not needed: the
cloud nodes are node definitions on the same interpreted runtime; what differs is what the process gives them, which is the world.

**The keyed sign** (world.ts DIGEST, extended): `importKey('raw', key, { name: 'HMAC', hash })` then `sign('HMAC', key, data)` are
the world's — each an already-resolved promise, RFC 2104 over the package's own SHA-2 (`sha2.ts hmac`, graded against Node's
`createHmac` over keys across the block boundary and RFC 4231 case 2). An unknown hash is refused with `digestBytes`'s message, an
empty key with WebCrypto's own (`Zero-length key is not supported`). Before, they were the host's.

**HOST** (world.ts, a new seam; need `host`; trace event `host` in the request group; spec effect `host`, handler `world.host`,
view `hostHas(service)`; pool `hosts`; mutant `drop-host`): the four process globals nodegx-backend installs for a cloud function —
`secrets` (`_noodl_get_secret`, synchronous), `users`, `roles`, `mail` (each answered through `Promise.resolve`). A service the
script does not list has no global (the node's "outside a backend" sentence); a call is recorded as handed and answered by
first-match rules (`ok` / `throws` / `never`, `after`, `times`); an unanswered call is a violation. The page model's pinned world
kinds took `host` (a world answer like `backend`, never a turn of the page: no cloud node is on a page).

**The nodes** (specs in `nodegx-node-spec/src/nodes/`): `hmac.ts`; `jwt.ts` (Sign and Verify, one module, the runtime's
`crypto/jwt.ts` as the spec's own functions); `secret.ts`; `system-calls.ts` (the shared call of the user and role families —
`system-users.ts` and `system-roles.ts` in the cloud package are the same code but for their words) with `system-users.ts`
(Create / Update / Delete User, Verify Session Token) and `system-roles.ts` (Add / Remove User To/From Role, Get User Roles, List
Users In Role); `send-email.ts`. Read from the code, with nodegx-backend's `SystemUsers.ts` / `SystemRoles.ts` for which operations
can answer Unchanged (update never does; every role op can).

Measured on the way (the runtime wins, R3 (a)):
- **A string on JWT Sign's Claims is never refused:** the object port evaluates it as an object literal, `{}` when it is none
  (node.ts `setInputValue`), so `"text"` signs an empty claim set. The first draft said it failed; the runtime corrected it.
- **HMAC with a Key of `[]`** passes the node's `!key` and fails in `importKey`: "Zero-length key is not supported".
- **JWT Verify's reasons include V8's words** for what throws on the way (`token.split is not a function` for a non-string Token;
  `Cannot read properties of null (reading 'alg' / 'nbf')` for a header or payload of JSON `null`) — the runtime's `.catch` makes
  each the Failure's reason.
- **Send Email's fan-out** (DEF-021) is specced as built: presses that agree are one send to To as it stands at the frame end;
  presses that disagree are one send per run of the same stamped address, each sent only after the one before is answered (so a
  run behind an answer that never comes is never sent), each run's content read when it is sent.
- **A Done never touches Send Email's Error** where its siblings clear it — but a cleared output never reaches a wire
  (node.ts :858 `sendValue` returns on `undefined`; the trace's C3), so on the wire the two are the same. Not filed.

### 6.2 Readings (s96, seed 20738)

| node | scenarios | generated | mutants | planted in a copy of the runtime file |
|---|---|---|---|---|
| HMAC | 8 / 8 | 200 / 200 | 15 / 15 | Encoding default → base64 caught; Signature never flagged caught |
| JWT Sign | 5 / 5 (2nd run: Claims coercion) | 200 / 200 | 15 / 15 | arrays accepted as Claims caught; Expires In + 1 caught |
| JWT Verify | 7 / 7 | 200 / 200 | 15 / 15 | Clock Tolerance default 1 caught; Valid not cleared caught |
| Secret | 6 / 6 | 200 / 200 | 18 / 18 | Name defaulted caught (by the `host` event's request); Value not cleared — invisible (C3) |
| Create User | 5 / 5 | 200 / 200 | 37 / 37 | Email Verified as `!!` caught; Unchanged's error not published (in `system-users.ts`) caught |
| Update User | 3 / 3 | 200 / 200 | 20 / 20 | Password left out of the request caught |
| Delete User | 3 / 3 | 200 / 200 | 33 / 33 | `sessionsRevoked \|\| 1` caught |
| Verify Session Token | 4 / 4 (2 survivors closed by an Unchanged that says why) | 200 / 200 | 33 / 33 | `user/no-answer` → `user/failed` caught; Username not cleared — invisible (C3) |
| Add User To Role | 4 / 4 | 200 / 200 | 35 / 35 | Create Role If Missing as `!!` caught |
| Remove User From Role | 2 / 2 | 200 / 200 | 34 / 34 | Roles not defaulted to `[]` (in `system-roles.ts`) caught |
| Get User Roles | 2 / 2 | 200 / 200 | 33 / 33 | op `list` → `roles` caught |
| List Users In Role | 3 / 3 | 200 / 200 | 35 / 35 | Total as `Number(…)` caught |
| Send Email | 7 / 7 | 200 / 200 | 47 / 47 (one no-op write removed) | fan-out off caught; runs sent at once instead of in turn caught; Subject defaulted caught; a Done that clears Error — invisible (C3) |

Plants: 16 planted, 13 caught, the 3 survivors all an output cleared to `undefined`, which the runtime never sends (node.ts :858).
A first plant harness of mine (one `test.each` row per plant, `stopAtFirst`) reported plants as passing that a direct probe caught;
rebuilt as one loop on the probe's shape, the reading above is that one's. The harness was not kept (scratch, `zz-`).

### 6.3 Gates (s96)

See the handoff (NEXT-SESSION-PROMPT.md) for the full list; the ledger: **138 of 147** (floor 138), owed 4.

### 6.4 Left

- **Request** and **Response** — the function's first and last events. Request is called by the backend's runner
  (`NoodlCloudRuntime.run` → `sendRequest(req)`), resolves the caller through the UserService (AUTH), checks the request contract
  (`requestContract.ts`), writes the `Request` model and throws for the function's error answer; Response hands the answer to
  `_sendResponseCallback`, which tears the function down inside the call. They need an INBOUND INVOCATION seam (the world hands the
  play a request; what the function answers, or throws, is recorded) — design it first, with both nodes in view.
- **Model Request** (1,056 lines) — NETWORK (`fetch` to a model provider) and HOST `secrets` (the provider key): both seams exist.
- **Aggregate Records** — `CloudStore` aggregate over BACKEND: measure first whether it reaches the contract's adapter.
- The census (`census.json` / `CENSUS.md`) was NOT regenerated: it reads `nodegx-export`'s `plan.ts`, ledger and tests, which hold
  a peer's uncommitted edits (97 → 99 names in `plan.ts`). Regenerate when those land.

### 6.5 s97 (2026-10-12) — the INVOCATION design, before a line of it

**Measured first** (a scratch test through the real `CloudRunner.run`, not kept):

| request | what the function answered |
|---|---|
| session token, no `_noodl_cloudservices` in the process, Allow Unauthenticated off | refused: `Unauthenticated requests not accepted.` |
| no token, Allow Unauthenticated off | the same refusal |
| token, `/users/me` answers 200 `{"objectId":"u1"}` | 200; Authenticated true, User Id `u1`. The lookup: `GET <endpoint>/users/me`, headers `X-Parse-Application-Id`, `X-Parse-Master-Key`, `content-type: application/json`, `X-Parse-Session-Token`, no body |
| token, `/users/me` answers 200 `{}` (no `objectId`) | 200; User Id a random 10-character id (`Model.guid`, the world's random) |
| token, 200 `{"objectId":7}` | 200; User Id the NUMBER 7 |
| token, 401 `{"error":…}`, Allow Unauthenticated off / on | refused / 200 unauthenticated |
| token, the lookup's fetch rejects (network), Allow Unauthenticated on | 200 unauthenticated |
| token, `/users/me` answers a body that is not JSON (200 text, 500 HTML) or JSON `null` | **no answer at all** — the run times out (504), and the process gets an unhandled rejection. Allow Unauthenticated on or off. Filed: P107-S97-USERSMEHANG |
| body `null`, a contract declared (`ptype-total: number`) | **refused with a `TypeError`** (`Cannot read properties of null (reading 'total')`), a 500, where the contract promises a 400. Filed: P107-S97-NULLBODY |
| body `"ab"` (a JSON string), params `0,1` | 200; `pm-0` = `a`, `pm-1` = `b` (`for … in` over a string) |

**The seam: HOST grows the function's INVOCATION** (world.ts HOST; the same need, `host` — it is the backend process that hands a
function its request and takes its answer). Two new script fields:

- `cloudServices: { appId, masterKey, endpoint, runId? }` — the `_noodl_cloudservices` global the process installs (the cloud
  UserService reads it, userservice.js :33-50). Absent: not installed. The caller lookup it makes is a plain `fetch`, so it travels
  on the world's NETWORK like any request, and is answered by the network's rules.
- `invocation: { at?, headers?, body?, settledAt? }` — the node is part of a function component that a request reached
  (`CloudRunner.run`). From the mount (the component is built before the request is handed, index.ts :284-323) every Response
  node holds the request's two callbacks; at `at` ms on the clock (absent: 1, a world timer) the Request node is handed
  `{ headers, body }` (`sendRequest`). The request is OPEN until it is answered — by a Response's send in the play, by a refusal,
  or elsewhere at `settledAt` (another Response, or the runner's timeout, `settle` :261-271). Absent: the node is in no function a
  request reached — a Response has no callbacks, a Request is handed nothing.

**What is recorded** — the function's answer, as an `answer` event (trace.ts; THE CALLERS' event, in the LOCATION group): op
`respond` with `status` and `body` (Response's payload, `_sendResponseCallback`), or op `refuse` with `reason` (the message
`sendRequest` rejected with) and `fields` (only for the contract's 400, `CloudFunctionBadRequestError.fields`). A refusal is
recorded when it lands, whether or not the request was still open (the node's act; the runner drops a late one).

**The spec side:** `WorldView.invocation()` (`'none' | 'open' | 'settled'`, what Response checks) and `WorldView.hostCloud()`
(the `_noodl_cloudservices` object, or `undefined`); `WorldHandlers.invoke` (the request handed, at its moment); `answers` take
`{ op: 'respond', status, body }` and `{ op: 'refuse', reason, fields? }`, and either one settles the request.

**Not in a one-node play** (graph rows, NSP-008, if ever): the `Request` model the function's scope holds (Parameters, Headers,
UserId — read by other nodes); the runner's teardown after an answer (CloudRunner's, graded by `cwf-018` / `def023`); Response's
belt-and-braces branch (:208-210), reached only when something downstream of its own Done answers first.

### 6.6 s97 — built: THE INVOCATION, Request, Response

**The seam, as designed above.** world.ts HOST: `cloudServices`, `invocation`, `WorldHost.requestState / respond / refuse`, the
`_noodl_cloudservices` global (`installWorld`). trace.ts / the schema / `validateTrace`: `answer` ops `respond` (`status`, `body`)
and `refuse` (`reason`, `fields?`). spec.ts: `WorldView.invocation()`, `hostCloud()`, `WorldHandlers.invoke`, the two
`AnswerCall`s. The interpreter schedules the hand-off and records the answers; mutants wrap `world.invoke`; the page model's pinned
world kinds took `invoke`. The runtime target (cloud type): the CLOUD user service for the play (not the browser's AUTH
stand-in), a fresh `Model.Scope` per mount (`requestScope.modelScope`, index.ts :216), and the invocation played into the real
nodes as `CloudRunner.run` does — the Response's two callbacks at its making, `sendRequest` at the moment, a rejection recorded
as `refuse`.

**The specs:** `cloud-request.ts` (the contract and the origin as the spec's own functions, each cited; the lookup over NETWORK;
the random id over the world's random) and `cloud-response.ts`.

**The fix it needed (P107-S97-USERSMEHANG, fixed):** the suite could not run while the lookup leaked unhandled rejections, and the
hang is a production 504. `userservice.js _makeRequest` now reads the body inside the chain: a body that does not parse, or is
`null`, reaches `options.error`. Control: the old chain restored for one run → 2 of 25 scenarios, 5 of 200 sequences red, and the
suite failed on the rejections.

| node | scenarios | generated | mutants | planted in a copy of the runtime file |
|---|---|---|---|---|
| Request | 25 / 25 | 200 / 200 | 23 / 23 (5 equivalent survivors on the refusal branches closed by writing nothing a refusal cannot show) | 9 / 9: the no-token check inverted, the contract skipped, Origin / User Id never flagged, parameters stringified, the token header read capitalised, a Default not beating Required (`requestContract.ts`), `x-forwarded-host` ignored and a trailing slash kept (`requestOrigin.ts` — both SURVIVED the first pool, which had no such request; the pool and three scenarios took them) |
| Response | 8 / 8 | 200 / 200 | 7 / 7 | 5 / 5: Status read as not-failure, the already-sent check dropped, the failure body's key renamed, the no-request code renamed, Error not published |

Filed, not fixed: P107-S97-NULLBODY (low — a `null` body with a contract is a 500 `TypeError`), P107-S97-USERIDBOOLEAN (low — User
Id is declared `boolean`).

**Left for the ports column (NSP-020):** `nsp-020-ports-parity.test.ts`'s census walks `noodl-runtime` and `noodl-viewer-react`
only, so no cloud module's `setup` is graded and Request, Response, Create User and Update User stay "no view" in the ledger's AC4
column. Adding the cloud package to its ROOTS brings every cloud hook into the table (rows or exclusions) — its own piece of work.

**The rules column** shows only Request's two input rows: what it does when a request comes is a `world.invoke` handler, whose
words nothing reads yet (NSP-018 §6 item 1).

### 6.7 s98 (2026-10-12, the same sitting as s97) — Model Request

**Measured first, through a probe calling the node's own `dispatch`:** an Anthropic 200 JSON `null` was sent THREE times (each
answered and paid) and then reported "did not reach the provider" (P107-S97-MRNULLRETRY). An Anthropic 200 `{}` or `5` was
Done with an empty Text (P107-S97-MREMPTYANSWER). **Both fixed before the spec:** `readMessagesAnswer` refuses JSON with no
`content` list, as `readChatAnswer` refuses JSON with no `choices`. The answer fails once, `network`, with its status. Two
fed-003 tests are red without the guard.

**The world grew one thing:** NETWORK rules take `times` (as BACKEND's and HOST's do), so a script can say "503, then an
answer". Without it, no scenario could reach a retry that succeeds.

**The spec** (`model-request.ts`): HOST `secrets` (synchronous, inside the frame-end call) and NETWORK, with the clock the
deadline's. The bodies, the answer readers and the error identifiers are the spec's own copies, byte-for-byte what the node
sends. One deadline per call. Each attempt is aborted at it (a world timer, `abort:<request>`). The backoff and `retry-after`
are timers (`retry:<call>`). Calls are keyed, so a press while one is out is its own call.

**The cost channel** (`recordModelCall`) is not on the wire. The runtime target now keeps it on the handle (`modelCalls`, a
lone node's run context), graded in conformance.test.ts beside the Log line. An answered call, a refusal included, hands the
run its model, four token counts and its duration, retries included (540 ms over a 503 and a 40 ms answer). A call no
provider answered hands it nothing. Control: `recordCall` removed → red.

| node | scenarios | generated | mutants | planted in a copy of the runtime file |
|---|---|---|---|---|
| Model Request | 26 / 26 | 200 / 200 (first run, 0 divergences) | 79 / 79 (one equivalent write removed; one survivor — attempts never counting up on a retry — was a pool hole, closed by the retry scenarios) | 13 / 13: three attempts become two, the backoff halved, `retry-after` ignored, a 4xx retried, Anthropic sent `effort: none`, "this computer" read as a prefix, Instructions not cached, a refusal read as Done, the s98 guard removed, Max Tokens not floored, a deadline per attempt, a Status-0 failure keeping the last status (survived until a scenario put a failure after an answered call), Messages ignored when Input is set |

A plant I wrote badly (`errorCode = code + ''`, a no-op) is not counted. The property it meant, provider prose never on the
execution record (ISL-010), is not on the wire. fed-003's tests own it.

Read live, and pinned: the timeout sentence reads Timeout (ms) when the call fails, so a Timeout changed mid-call says the new
number ("did not finish inside 7ms" for a 1,000 ms call). That is the runtime's read; not filed.

### 6.8 s99 (2026-10-12) — Aggregate Records, the seventeenth

**Measured first, through probes on the cloud target** (scratch `zz-` tests, not kept):

| question | what the runtime does |
|---|---|
| which store | `CloudStore.forScope(modelScope)` (aggregatenode.js :156) — the LEGACY store. No backend is resolved, so the adapter is always `ParseWireAdapter`; BACKEND (R9's seam) is the contract-resolved stores and never sees the call (world.ts says so: "the project with none is the legacy store, not a world this seam plays") |
| what goes out, in a cloud function | the Parse wire's `fetch` face (ParseWireAdapter.ts :302-339) to `_noodl_cloudservices.endpoint` — HOST's `cloudServices` (s97) — with the master key, and `X-NodeGX-Run` when the run has an id: `GET <endpoint>/aggregate/<Class>?group={…,"objectId":null}`, or `$group` / `_id` when `dbVersionMajor > 4` |
| what it reads at run time | the class's columns, from the project's `dbCollections` metadata (`CloudStore._collections`, :290-292). The first node in the phase that reads the schema at PLAY |
| the cloud build's constant | the Parse wire takes its `fetch` face only when `_noodl_cloud_runtime_version` is defined (the cloud bundle's webpack prefix). The cloud target never declared it — no graded node had reached the Parse wire. Without it every aggregation fails (the XHR face, no address) |

**The seam: NETWORK + HOST, not BACKEND**, as Request's caller lookup (s97) — the call is a plain `fetch` to the process's loopback,
and what the Parse adapter does with each answer (its spelling, its row rule, its one failure sentence) is graded, not copied into a
stand-in. R9 ("the request, not the wire") was ruled for the contract-resolved record stores; this node never reaches one. A choice
this session made, not a ruling.

**The world grew** (world.ts PROJECT): `collections` (the project's classes, as the editor caches them in `dbCollections`) and
`dbVersionMajor`; `WorldView.collections()` / `dbVersionMajor()`; the pool's `projectData` (drawn only when a pool names it — every
earlier `project` spec draws what it drew). **The runtime target**: installs the two as metadata for a play (the legacy store's class
cache dropped before and after), and declares `_noodl_cloud_runtime_version` for a CLOUD play only.

**The spec** (`aggregate-records.ts`, v1): the frame-end aggregation, the filter lowered as `convertVisualFilter` does (no value-port
prefix), `getAggregates` over the world's classes (the throw where a named aggregate has no Property: nothing at all), the request in
the Parse wire's spelling, and each answer through the adapter's callbacks. Not specced, named in its header: the Javascript filter
(NSP-017's escape hatch, as Query Records), a `relatedTo` whose class the record store supplies, the editor's warnings, the error bus,
the outputs' drawn types.

| node | scenarios | generated | mutants | planted in a copy |
|---|---|---|---|---|
| Aggregate Records | 35 / 35 | 200 / 200 on seeds 20738, 20739, 20740; 10,000 / 10,000 (99 s) | 99 / 99 (first run 101 / 108: two survivors were a field nothing read, removed; two were one branch written twice, collapsed; three closed by scenarios) | 15 / 15 — node: a setting asking with Do wired, `sum` as the number default, a non-column Property kept, the failure sentence's full stop, a filter failure's own words replaced, two requests a frame, `qp-` kept whole, Success never sent, a nameless aggregate skipped instead of thrown on, Error cleared by a Success; wire: the new spelling from version 6, `$sum` misspelt, two rows read as the first, `match=` not encoded, the server's words passed on (the AGGWORDS fix — so that fix will move a scenario) |

**Five defects, measured, filed, none fixed** (the spec pins today's runtime, R3):

- **P107-S99-AGGFILTERPREFIX (high)** — the filter builder saves a wired value as `qp-min`; the node looks it up without the prefix its
  siblings pass, drops the condition, and aggregates the WHOLE class, saying Success. Control: the same condition with a static value
  filters; the retired shape filters. Issue #14's wrong number on the visual path.
- **P107-S99-AGGCOLUMNS (high)** — the built-in backend's `dbCollections` carries `columns`, not `schema.properties`; the node reads only
  the second, so on our own backend it asks for no aggregate (and its editor draws no Property ports). Control pair: the two shapes,
  same params.
- **P107-S99-AGGNOPROP (medium)** — an aggregate named with no Property throws inside the swallowed frame-end callback: no request, no
  Success, no Failure, ever.
- **P107-S99-AGGSTALE (medium, needs a ruling)** — an aggregation matching no record is a Success that leaves the previous totals on
  every output.
- **P107-S99-AGGWORDS (medium)** — every failure is `Failed to aggregate.`; HLT-023 fixed this for `query` and missed `aggregate`,
  `count`, `distinct`.

Not filed: Error is never cleared by a Success (the family's shape — HTTP Request says so in its description).

