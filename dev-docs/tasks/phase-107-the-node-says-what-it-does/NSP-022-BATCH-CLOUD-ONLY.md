# NSP-022 — Batch: the cloud-only nodes

**Opened 2026-10-02 (s21), split from [NSP-014](NSP-014-BATCH-DATA-AND-CLOUD.md) as its status line said it would be.**
**Depends on NSP-007 and NSP-014's BACKEND seam (s21).** **Status: 🟡 s96 (2026-10-12): 13 of 17 conform on the runtime's new cloud target — HMAC, JWT Sign, JWT Verify, Secret, Create / Update / Delete User, Verify Session Token, Add User To Role, Remove User From Role, Get User Roles, List Users In Role, Send Email — each on its first or second run, every mutant killed. The world grew the KEYED SIGN (DIGEST) and HOST (the backend process's services). s97: Request and Response conform (15 of 17) on HOST's new INVOCATION (§6.5–§6.6); P107-S97-USERSMEHANG fixed on the way. Left: Model Request, Aggregate Records.**

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
