# NSP-014 — Batch: records, users, files, HTTP, streams, and the cloud-only nodes

**Opened 2026-09-29.** **Depends on NSP-007** (the world's network and backend) and R4 = continue.
**Status: 🟡 s35 (2026-10-03): Query Records slice C — its realtime half (Subscribe To Changes on the node, BCN-008) conforms on the runtime, first run (56 / 56 scenarios, 0 divergences), three seeds and at 10,000; four defects planted in a copy of the runtime node, all caught. The format grew `subscribeFirst` (a frame end that ran its reconnect before its query). Row D29; C55 reaches Query Records (§6.43). The count does not move (24 of 24); its grading does.** **s34 (2026-10-03): WebSocket and Server-Sent Events conform on the runtime — WebSocket on its first run, SSE after one interpreter fix (T17: an answer landing mid-`advance` was handled at the advance's end) — three seeds each and at 10,000; six defects planted in copies of the two runtime nodes, all caught. The world grew SOCKET (a WebSocket server is a script on the clock; every play has the world's `WebSocket`, none has an `EventSource`) and NETWORK's STREAMED BODY (a `fetch` body that arrives in pieces); canonical `$bytes` (§6.40). Rows C56, C57, C58. **24 of 24 — every node conforms. Left: AC2's export half (the batch is T3: it needs the export adapter to play the world, P18).** s33 (2026-10-03): Subscribe To Changes conforms on the runtime, first run (0 divergences; three survivors, the stuck-flag kind, declared equivalent), two more seeds and at 10,000. It opens its subscription through the realtime layer (`createRealtimeSubscription`), so the world's BACKEND grew REALTIME: the subscribe recorded as handed, answered by a scripted STREAM of statuses, changes and errors on the clock, by the handle's own rules; the unsubscribe recorded too (§6.37). Row C55 (a same-value write reconnects). 22 of 24. Left: WebSocket, Server-Sent Events.** s32 (2026-10-03): Cloud Function conforms on the runtime, first run (one survivor, a dead deletion, removed), two more seeds and at 10,000. It makes its OWN request — a raw `XMLHttpRequest` to `<endpoint>/functions/<name>`, not the backend contract — so it joined NETWORK, which grew an XHR face, and PROJECT grew the project's cloud services; rows C54 (a `null` success body never answers the Call), D28 (Error can be an object) (§6.34). 21 of 24. Left: WebSocket, Server-Sent Events, Subscribe To Changes.** s31 (2026-10-03): Open File Picker conforms on the runtime, first run (one survivor closed by a scenario), two seeds and at 10,000 — the world's PICKER, the 13th seam (a `document` only where the script has a picker; a file input whose `accept` / `capture` reflect; the n-th click answered by the n-th scripted answer, to whatever handler the element holds when it lands); the format's `settles` (a press that supersedes a pending one); rows C53, D27 (§6.31). 20 of 24 — T2 complete. Left: Cloud Function, WebSocket, Server-Sent Events, Subscribe To Changes.** s30: Cloud File, Upload File and Sign File URL conform on the runtime, first run, two seeds and at 10,000 — the world's BACKEND grew FILES (the contract's `uploadFile` / `signFileUrl`, a failure as one envelope, the REST adapter's not-a-file refusal); a scenario can hand a node a file (`$file`) or a stored file (`$cloudFile`); rows C51, C52, D26 (§6.28). 19 of 24. Left: Open File Picker (a FILE PICKER seam), WebSocket, Server-Sent Events, Subscribe To Changes, Cloud Function.** s29: Sign In With slice B — the return leg (§6.25). s28: Request Magic Link, Sign In With (16 of 24). s27 (2026-10-02): Log In, Sign Up, Log Out conform on the runtime, first run and at 10,000; graph s10 (the session moving); target hole T14; row D24 (§6.19). 14 of 24. s26: User and Set User Properties — the world's AUTH seam (§6.16); rows C45–C49, D23. 11 of 24. s25: Filter Records (9 of 24). s24: Query Records slice B. **s23 (2026-10-02): Record (`DbModel2`) and Query Records (`DbCollection2`, slice A — the query) conform on the runtime, first run and at 10,000; `fetch` and `query` joined the BACKEND seam; rows C37, C38, C39, D22. 8 of 24.** s22: Create Record and Update Record conform on the runtime (the world's BACKEND grew a failure's `detail` and the signed-in USER); the deep run found row C36 in s21's Delete Record; rows C34–C36 filed. 6 of 24 at s22 (HTTP Request s8; Delete Record, Add / Remove Record Relation s21; Create / Update Record s22). s21: split (the 17 cloud-only nodes → [NSP-022](NSP-022-BATCH-CLOUD-ONLY.md)); the world's BACKEND seam built (R9: the request, not the wire).

## 1. The person sentence

> **Every node that talks to the app's backend or the internet is specced as the requests it
> makes and what it does with each answer — including failures — so a new backend or a new
> target can be checked against it.**

## 2. The nodes (from the census)

**24**, from the census ([CENSUS.md](CENSUS.md), regenerated 2026-10-02 at the split). Regenerate the census; do not edit this list by hand.
**s21 split:** the 17 nodes that run only in the cloud runtime moved to [NSP-022](NSP-022-BATCH-CLOUD-ONLY.md) (`tiers.json` batch
`NSP-022`) — they need a second runtime target; these 24 run in the browser runtime the target already drives.

- **T1 pure / state machine (1):** Filter Records (`FilterDBModels`)
- **T2 clock, randomness & environment (1):** Open File Picker
- **T3 network & backend (22):** Add Record Relation (`AddDbModelRelation`) · Cloud File · Cloud Function (`CloudFunction2`) · Query Records (`DbCollection2`) · Record (`DbModel2`) · Delete Record (`DeleteDbModelProperties`) · HTTP Request (`net.noodl.HTTP`) · Server-Sent Events (`net.noodl.SSE`) · Log In (`net.noodl.user.LogIn`) · Log Out (`net.noodl.user.LogOut`) · Request Magic Link (`net.noodl.user.RequestMagicLink`) · Set User Properties (`net.noodl.user.SetUserProperties`) · Sign In With (`net.noodl.user.SignInWith`) · Sign Up (`net.noodl.user.SignUp`) · User (`net.noodl.user.User`) · WebSocket (`net.noodl.WebSocket`) · Create Record (`NewDbModelProperties`) · Remove Record Relation (`RemoveDbModelRelation`) · Update Record (`SetDbModelProperties`) · Sign File URL · Subscribe To Changes (`SubscribeToChanges`) · Upload File

Census notes:
- **Query Records** — the request is part of the behaviour
- **Filter Records** — client-side over the store ('one subscription, no requests' — filterdbmodelsnode.ts:42), so T1 with the store as a world fake
- **Open File Picker** — no network — a DOM input and a user gesture; environment-fed, so T2, kept with the file family

## 3. What is special here

- **The request is part of the behaviour.** A Query Records node that returns the right rows by
  fetching the whole table is wrong. **R9 (ruled s21): the request, not the wire** — a record node's
  trace carries `backend` events (world.ts BACKEND): the backend contract's operation as the node
  hands it (collection, filter in the contract's neutral model, sort, limit), never the HTTP one
  adapter makes of it. HTTP Request, Cloud Function's HTTP and the like keep `request` events.
- **Every failure path is specced**: network error, 4xx, 5xx, timeout, a malformed body. The
  outcome contract's `failed` and each node's *Failure* signal and error output.
- **Cloud-only nodes** moved to NSP-022 (s21): they run in `noodl-viewer-cloud`, a second runtime target.
- **Filter Records** may be client-side (`recordFilterLib`), which makes it T1. The census decides.

## 4. Acceptance criteria

As NSP-011 §4, plus:

5. For every node in §2, at least one **failure** scenario per failure kind it can meet, each
   asserting the outcome and the error output.
6. For every record node, the request it makes is asserted, and one scenario proves it does
   **not** make a request when it should not (e.g. no fetch before its inputs are ready) —
   beside a known-firing control.

## 5. Watch for

- Memory: *an awaited callback-style write has a dead error path.* Failure paths in the runtime
  may be unreachable; a spec that says "on failure, pulse Failure" may describe code that never
  runs. Prove each failure path fires on the runtime before writing it into the spec.
- Memory: *a throw is reported against the emitter, not the thrower.* Error attribution is
  behaviour; spec which node's error output carries it.
- Memory: *count the request, not the node that would make it.*

## 6. Built

### 6.1 s21 (2026-10-02) — the split, R9, the world's BACKEND seam, Delete Record

**The split** (the status line's own prediction, done from the census): the 17 `availableIn: ["cloud"]` rows moved to
[NSP-022](NSP-022-BATCH-CLOUD-ONLY.md) — `tiers.json` batch `NSP-022`, `census.js` knows the batch, the census
regenerated (`spec-census:check` fresh). NSP-014 is the 24 the browser runtime runs.

**R9 — ruled by Richard 2026-10-02: "the request, not the wire."** Measured before asking: one record node reaches five
backends through two wires — NodeGX's own server over its legacy `/classes/<Name>` wire (`ParseWireAdapter`,
`XMLHttpRequest`) and Directus / PocketBase / Supabase / PostgREST over REST (`RestDataAdapter`, `fetch`, one URL shape
each) — and NSP-007 §2 had said "record the HTTP". Recording the HTTP would bind every record spec to one backend's
wire and re-grade the adapter inside every node spec; the adapter's HTTP is already graded by
`nodegx-backend-contract/conformance/`. So a record node's trace carries the OPERATION it hands the backend
contract (`delete({ collection, objectId })`), and the world plays the backends at that level. (The first wording of
the question called the built-in wire "Parse"; Richard: *"We don't use Parse anymore"* — right: the server is NodeGX's
own, `packages/nodegx-backend`, keeping a Parse-SHAPED wire, `src/server/parse-wire.ts`, for old apps. Re-asked in
those words.) **One correction to the question as asked:** the node does not hand both layers literally the same
thing — for a filter it computes a `/classes`-shaped `where` for the legacy wire and a neutral one for REST
(`dbcollectionnode2.ts:882`). Under R9 the spec states the neutral one; the legacy translation (`queryutils
.convertVisualFilter`) is outside every record spec's reach — Query Records' spec must say so.

**The seam — world.ts BACKEND (the world's eleventh seam, after s20's POPUP; the format's `backend` effect, `world.backend` handler,
`WorldView.backendFor`, the `backend` trace event in the request group, schema v1 extended additively).**
- WHICH BACKEND: the script's `backends` (absent `['main']`, never none), the first active; a node's Backend input
  resolves as `resolveBackend.pure.ts :232-249` does — falsy or `_active_` is the active one, an id the project has is
  that one, anything else is none (the node's sentence, no call).
- A CALL: recorded as handed — `{ op, backend, args }`, callbacks left out, canonical.
- THE ANSWER: first-match rules on `op` / `collection` / `backend` — `{ ok }`, `{ error }` (`null`: none), `{ never }`;
  `after` on the clock; an unanswered call is a VIOLATION (AC5), as an unanswered request is.
- On the runtime (`node-spec-target.ts installBackend`): the REAL `CloudStore`, the REAL resolution
  (`CloudStore.forBackend`), the project's `backendServices` the script's ids (converged, each `directus` so it takes
  the REST adapter and the neutral filter, no `cloudservices` endpoint); ONLY `RestDataAdapter`'s operation methods
  are the world's (`BACKEND_OPS`, one entry per operation, each read from the adapter: `delete` = `success()` then the
  contract's `delete` event, RestDataAdapter.ts :1216-1219). The answer lands a microtask after its moment.
- Runner: the `backend` refusal is gone (it was `report.refused` since NSP-007); the generator draws one backend world
  per sequence from the spec's `worldPool.backends`; mutants gained `world.backend` and `drop-backend`; a branch's shape
  carries `backend: true` ONLY when it calls one, so every earlier spec's shapes are byte-identical (the declared
  equivalent mutants still match). Format change additive → stranger hashes refreshed: the diff named exactly
  `schema/trace.schema.json`, `src/spec.ts`, `src/trace.ts`, `src/world.ts`; the three rounds green.

**Delete Record (`DeleteDbModelProperties`) — CONFORMS on the runtime on its first run: 20 / 20 scenarios, 200 / 200
sequences (seed 20728), 34 / 34 mutants killed.** Ten probe questions answered on the runtime BEFORE a spec line
(`zz-` probe, deleted): the Class is checked at the PRESS (`No class name specified`, at once, joins no batch), the Id at
the FRAME END (`Missing Record Id`), the Backend at the frame end (the not-configured sentence naming the input's
value); one `delete` per frame for every press; a press while one is out is a second call; `''` / no message →
`Failed to delete.`; Error never clears. Shared Record-family pieces in `src/nodes/record-base.ts` (the twin of
`dbmodelcrudbase.ts`'s `addBaseInfo` + `addModelId`) for Create / Update Record and the relation nodes.
- **Two mutant holes found on the interpreter and closed before the runtime ran:** the in-flight list's removal was
  unobservable (call ids never repeat) — the bookkeeping went, not a declared equivalent; and no scenario showed that
  Repeater Component re-binds under From repeater — two scenarios added.
- **Two port facts the first draft had wrong, from the code:** the Backend picker is in group **General** for this
  family (`record-ports.ts :120`) and **edit-only** (`allowEditOnly`, `schema-ports.ts :564`) — so the generator draws
  only what the panel can hold.
- **Reach, measured:** a generated sequence reaches a call only with a Class, an Id and a resolvable Backend before a
  press — 17–24 of 200 do on seeds 20728–20730 (0 Dones on 20729 before the pool was weighted; 5–11 after). The hand
  scenarios carry the protocol; the deep run multiplies the rest.
- **Not graded, named in the spec's header:** the success's `model.notify('delete')` (a graph will see it); Delete
  Record resolving its store against NO scope (`nodeScope.ModelScope`, capital M — PLAT-003 §27.3; one scope per play
  hides it); and a project with **no backend configured at all** — row **C33** (§6.2), outside the seam's world.

### 6.1b s21 — Add Record Relation and Remove Record Relation

**Both CONFORM on the runtime: 18 / 18 scenarios, 200 / 200 sequences (seed 20728), 36 / 36 mutants killed** — one spec
factory (`src/nodes/record-relation.ts`), because the two runtime files are the same code but for their words and the
operation (a diff of the two names nothing else). What they do that Delete Record does not:
- **No check at the press** — every check is at the frame end, in `validateInputs`' order, each `=== undefined` (so
  `''` and `null` pass): no Class (`No class specified` — not Delete Record's `No class name specified`), no Relation,
  no Target Record Id, no record bound, and a Target Record whose CLASS is unknown — a record named by a raw string was
  never loaded from a backend. That last one needed the world to say which records were loaded: the registry script
  grew `classes` (what `CloudStore._fromJSON` stamps as `_class`, cloudstore.js :407-409), seeded on both targets.
- The call carries the target's class: `addRelation` / `removeRelation({ collection, objectId, key, targetObjectId,
  targetCollection })`; success copies every key the backend hands back onto the record (the REST adapter hands
  `{ objectId }` and then emits `save`, RestDataAdapter.ts :1584-1597 — `BACKEND_OPS` does the same).
- **A seed-dependent kill, again (s20's lesson):** at seed 13 the generated sequences killed the `repeaterComponent`
  drop-set mutant; at the runtime's seed 20728 they did not. A hand scenario now kills it on every seed, and the
  package's batch test (`tests/batch-records.test.ts`) grades all three record specs on TWO seeds for that reason. Five
  seeds read 36 / 36, 36 / 36, 34 / 34 on the interpreter.
- One behaviour the scenarios now state, measured: under Id Source *From repeater* the re-bind is one frame's job; an
  Id written in a LATER frame still binds the record and the call goes out.

### 6.2 Rows (s21)

| row | node | what the trace shows | proposed |
|---|---|---|---|
| **C33** | the Record family (`CloudStore.forBackend`) | **Outside the seam's world (R9), measured by a probe:** a project with NO backend configured — a browser sends `DELETE undefined/classes/Lesson/r1` to the app's own host and reports its `Not Found`; off the browser the press is never answered (the legacy store reaches for `XMLHttpRequest`). Ledger: `dev-docs/bugs/p107-c33-…` | refuse at the call with a sentence ("no backend configured"); keep the deploy-time injection working (cloudstore.js :512-514). Ships alone, after a ruling |

### 6.3 Gate readings (s21, 2026-10-02)

| gate | reading |
|---|---|
| `nodegx-node-spec`: `npx jest` | **18 suites, 673 passed, 17 skipped, exit 0** (s20: 17 suites, 649) |
| runtime: `runtime-target.test.ts` + `graph.test.ts` | 2 suites, 86 passed, exit 0 |
| runtime: `NSP_ONLY=<the three> … conformance.test.ts` | Delete Record 20 / 20, 200 / 200, 34 / 34; Add / Remove Record Relation 18 / 18, 200 / 200, 36 / 36 — all CONFORM, seed 20728 |
| runtime: whole `npx jest test/node-spec` under load 12–17 | **not a clean reading** — 1,011 s against the 600 s `beforeAll` budget: 65 tests failed on `Exceeded timeout … for a hook`. Its log: 62 of its 64 specs CONFORM at seed 20728; Stream Buffer and Text Accumulator never reported → re-read alone: both CONFORM. Graph and runtime-target suites passed |
| runtime: the same suite, retried at load ~3–5 | **67 passed, exit 0, 448 s — all 66 specs CONFORM at seed 20728** (the clean reading) |
| `tsc --noEmit` node-spec, runtime | exit 0 · exit 0 |

### 6.4 s22 (2026-10-02) — Create Record, Update Record; the deep run's C36

**Both CONFORM on the runtime on their first run, and at 10,000:** Create Record (`NewDbModelProperties`) 23 / 23
scenarios, 200 / 200 sequences (seed 20728), 40 / 40 mutants; Update Record (`SetDbModelProperties`) 30 / 30, 200 / 200,
78 / 78 — every mutant killed on SIX seeds (13, 1, 20728–20731; s21's rule asked for two). Fourteen probe questions
answered on the runtime BEFORE a spec line (two `zz-` probes, deleted). Shared pieces in `src/nodes/record-write.ts`
(the twin of `addInputProperties` + `addAccessControl`).

**The handoff's open question — "a project's schema is world data the seam does not have yet" — measured, and the
answer is no:** the runtime registers ANY `prop-<field>` on its first write and stores it raw (dbmodelcrudbase.ts
:711-725); the Class's schema only decides which ports the EDITOR offers. So the spec `discover`s any `prop-` port,
and the schema stays out of the world. (The success's schema-typed conversions — Date, Pointer, File, a list of
objects — are named as not graded; the world's answers carry plain values.)

**What the two nodes do that Delete Record does not, from the code and the probes:**
- **Create:** no Id input at all (`addModelId` with outputs only, :173-175). The data is `Object.assign({}, <the Source
  Object Id's record's data — create-on-read, so a name nobody loaded is an empty record>, <the property ports>)`. A
  success becomes a registry record under the answer's `objectId` (anonymous when none), its class the Class AS IT IS
  WHEN THE ANSWER LANDS (:154 reads it live), every key but `objectId` and `ACL` written; `Id` is its id. Upsert On is
  trimmed; blank is absent from the call. `Failed to insert.`
- **Update:** TWO NODES IN ONE by `Store to` at each press. Cloud: the Class pre-flight at the press, then at the frame
  end Missing Record Id → the Only If Unchanged names read off the record BEFORE the write (a name it does not hold, or
  a list/object, fails with its own sentence and writes nothing) → the property ports written onto the record → the
  backend resolved → `save({ collection, objectId, data: <the ports, or the whole record under All>, acl, ifMatch })`.
  Success writes every key handed back onto the record; a failure whose `detail.reason` is `precondition-failed` puts
  back what the write replaced and says "Someone else changed this record…"; any other failure is the message or
  `Failed to save.`. Local: NO pre-flight (the token is minted before the guard), one write per frame, Done per press,
  no call. Anything but unset / `cloud` is local.
- **The ACL** (both): built at the call from `Access Control Rules` and the `acl-<id>-<field>` ports (stored by
  splitting the port name on `-`); a rule no port wrote is the signed-in user; Target unset is `user`; a later rule's
  key overwrites an earlier one's.

**Two world changes, both additive (guarded files: the hashes refreshed — the diff named exactly `src/spec.ts` and
`src/world.ts`; the three stranger rounds green):**
- a backend failure may carry the contract's **`detail`** (`error(message, detail)`, `@noodl/backend-contract`
  data.ts :214-215) — `{ error, detail }` in the script, `answer.detail` in a spec's handler;
- **USER** — the script's `backend.user`, `WorldView.backendUser()`: the signed-in user's id as the access rules read it.
  Measured: the rules ask the LEGACY store (`CloudStore.instance.currentUserId()` → `ParseWireAdapter` → the session
  under `Parse/<cloudservices appId>/currentUser`), not the backend the record goes to. The runtime target writes the
  user through the REAL `SessionStore` into a storage the play owns (`installUser`).
- Runtime target: `create` and `save` joined `BACKEND_OPS` (each read from RestDataAdapter.ts :1028-1135: `success(record)`
  then the contract's event); a failure's `detail` is handed on; and a throw inside a success callback now goes to
  `error` with its message, as the REST adapter's promise chain does (RestDataAdapter.ts :515-531) — before s22 the
  stand-in let it escape as an unhandled rejection, which the real adapter never does.

**The deep run (10,000, seed 20728) over all five record specs:** Create, Update, Add / Remove Record Relation conform;
**Delete Record diverged 19 times — row C36**, a real defect s21's 200 sequences and 20 scenarios did not reach: the
success reads the record binding LIVE (`internal.model.notify('delete')`, :70), so an Id cleared while the delete is out
throws, and a REST backend reports Failure with V8's TypeError text for a delete that happened (an Id moved to another
record tells THAT one it was deleted). The spec keeps its reading (Done — the call's own record, as Update Record and the
relation nodes capture it); the runtime's reading is a known row with a narrow predicate (the TypeError text on Error,
or — when a later failure in the same frame overwrote the text before the settle — Done against Failure after a press
and then a binding-clearing write; the first predicate caught 18 of 19, the 19th was exactly that overwrite) and a hand
scenario marked `row`. Re-run: **all 19 attributed to C36, 0 divergences, 34 / 34 mutants.**

**A lead, NOT measured to a row (named so it is not rediscovered at full price):** because the access rules read the
LEGACY store's user, a project whose backend is a `backendServices` v2 NodeGX entry with its own `auth.publicToken` and
no `cloudservices` would sign users in under `Parse/<that token>/currentUser` while the rules read
`Parse/undefined/currentUser` — every "current user" rule naming nobody, the record written with no ACL. Unmeasured:
whether such a project exists (does the editor still write `cloudservices` beside a v2 NodeGX backend?) and where Log In
writes its session for one. Measure before filing.

### 6.5 Rows (s22)

| row | node | what the trace shows | proposed |
|---|---|---|---|
| **C34** | Update Record | the property ports are written onto the record BEFORE the backend is resolved and the save sent (:184-192), and only a refused precondition puts them back — a backend not configured (nothing sent), a 4xx, a network error all leave the record showing values the backend does not hold; a later Only If Unchanged sends them as its precondition. Two conforming scenarios show it. Ledger `p107-c34-…` | put back what the write replaced on every failure. Ships alone, after a ruling |
| **C35** | Create / Update Record (`_getACL`) | a rule with Target Role and no Role written → the ACL key `role:undefined` (:1015) — NDA-012 guarded the User branch's `acl['undefined']`, not this one; the record is then locked to a role called "undefined". A conforming scenario shows it. Ledger `p107-c35-…` | skip the rule when the Role is empty, as the User branch does |
| **C36** | Delete Record | found by the deep run (19 / 10,000): the success reads the binding live and throws when it was cleared while the delete was out — Failure (REST) or never answered (the legacy wire) for a delete that happened; a binding moved to another record tells that record it was deleted. A known row + a `row` scenario. Ledger `p107-c36-…` | capture the record at the call, as Update Record does; the known row goes with the fix |

### 6.6 Gate readings (s22, 2026-10-02)

| gate | reading |
|---|---|
| `nodegx-node-spec`: `npx jest` | **18 suites, 687 passed, 17 skipped, exit 0** (s21: 673) |
| runtime: the whole conformance suite | 69 passed, exit 0, 336 s — all 68 specs CONFORM at seed 20728 |
| `nodegx-node-spec`: `tests/batch-records.test.ts` | 20 passed — five record specs × two seeds, AC5 sentences, AC6 call / no-call |
| interpreter mutants, four more seeds (1, 20729–20731) | Create 40 / 40, Update 78 / 78, Delete 34 / 34 on each |
| runtime: `NSP_ONLY=<the five record specs> … conformance.test.ts` | all five CONFORM at seed 20728 — Delete 20 / 21 (+1 known, C36), 200 / 200; Add / Remove 18 / 18, 200 / 200; Create 23 / 23, 200 / 200; Update 30 / 30, 200 / 200 |
| runtime deep, `NSP_DEEP=10000`, seed 20728 | Add / Remove Record Relation CONFORM (0 divergences); Delete CONFORMS with 19 attributed to C36, 34 / 34; Create CONFORMS 40 / 40 and Update 92 / 92 (re-read after the last spec change; 11 and 1 sequences attributed to the old known row C6 — a unit object on a `prop-` port) |
| runtime: `runtime-target.test.ts` + `graph.test.ts` | 2 suites, 86 passed |
| `tsc --noEmit` node-spec, runtime | exit 0 · exit 0 |

### 6.7 s23 (2026-10-02) — Record (`DbModel2`), the read

**Record CONFORMS on the runtime on its first run, and at 10,000:** 24 / 25 scenarios + the one `row` scenario (C37),
200 / 200 sequences (seed 20728), 145 / 147 mutants (2 declared equivalent, `equivalent-mutants.ts`); deep 10,000: 0
divergences, 86 sequences attributed to C37, 204 / 206. Interpreter: every mutant killed or declared on seeds 13 and
20728. Spec `src/nodes/record.ts` — its own file, the Object node's backend twin (object.ts), sharing with the write family
only the Class / Backend ports and the failure code (record-base.ts).

**What the code says, read before the spec (no `zz-` probe this time — the six questions below were each settled by a
scenario that conforms on the runtime):**
- **A bind reads nothing.** `Id` binds the record of that name (create-on-read), sends `Id` and the fields the record
  already holds, and pulses Fetched (:320-343) — the port's description already says so (P77 D25). Fetch is the read.
- **Fetch has no Class pre-flight** (the write family's `checkWarningsBeforeCloudOp` is not this node's): no Class goes
  out as `collection: undefined`. Its own guard is `Missing Id.` for `undefined` / `''` only — **row D22**: a `null` Id
  (what binding treats as empty) is fetched as record `null`.
- **The answer is written under ITS `objectId`** (`_fromJSON`): an answer naming another record moves the node there,
  quietly (no Changed for either); an answer for the record the node is ALREADY bound to is heard by the node's own
  listener — Changed per key that moved, BEFORE Fetched and Done.
- **`delete response.objectId`** (:444) mutates the body the success is handed: the runtime target now hands every
  success a COPY of the world's answer (a real adapter parses a fresh body per response) — otherwise the script's object
  answers a second Fetch with no `objectId` (an anonymous record). The five earlier record specs re-read green on it.
- **The property outputs exist when a graph wires them** (`registerOutputIfNeeded`, `prop-` only) — the Class's
  fields; a play declares `title` and `n`. **Row C37**: the `<field> Changed` beside each is offered by the editor
  (`includeChangedSignals`) and never registered — C11's twin. The `prop-` INPUTS are accepted and inert
  (`scheduleStore` is dead).
- **Id overrides From repeater**: the `Id` setter binds in either mode; From repeater's bind only happens at a frame end
  after Id Source / Repeater Component is written.

**Graph (AC6's watching half):** `scenarios/graph/s07-the-record-watches.json` — (1) Update Record writes `other` onto
`r1`: a Record on `r1` pulses Changed, a Record on `r2` nothing; (2) a Record's Fetch writes its answer: a SECOND Record
on `r1` hears every key that moved (Changed ×2, `n` re-sent, no Fetched), `r2` nothing; (3) `title` moved under a Record
= the C37 claim, known. Claims written from the clause before recording; (1) and (2) held on the runtime first time.

**Runtime target:** `fetch` joined `BACKEND_OPS` (RestDataAdapter.ts :972-1015: `success(record)` then the contract's
`fetch` event).

### 6.7b s23 — Query Records (`DbCollection2`), slice A: the query

**CONFORMS on the runtime on its first run** — 23 / 23 scenarios, 200 / 200 (seed 20728), 255 / 255 mutants; the
interpreter's every mutant killed on seeds 13 and 20728 (two were sharpened: a later failure with the SAME message
could not show a dropped Error, and Do's reducer now sets its flag on one branch). Spec `src/nodes/query-records.ts`.
Two runtime traces printed and read beside the spec before trusting the green (the neutral `where` on the call; the
first failure publishing `[]`, the later one keeping the rows).

**What the node is, from the code (1,513 lines):** NO declared input — every port registers on first write. Three
per-port Run On Value Change boxes (Class, Search, each `qp-<name>`) compare old and new (DEF-046); everything else —
Backend, the visual filter and sort, Use limit / Limit / Skip, Fetch total count, any other name — shares the ONE
`Query settings` box, and the visual filter and sort re-query on EVERY write (no comparison); Do always. One query per
frame. **No outcome contract** — `Success` is the `fetched` signal, Do has no tokens.

**The filter is the CONTRACT's:** the visual filter (two saved shapes — the builder's and the retired QueryEditor's)
becomes the neutral filter through `@noodl/backend-contract/translators`, which the spec IMPORTS (a pure workspace
module — "types and data only", shared with the editor; as Parse XML imports fast-xml-parser). The call carries the
neutral filter (R9). The same filter is ALSO lowered to Parse for the local matcher, and that lowering is what refuses
(`pointsTo` with no class schema — a play's project has none) → Error + Failure, no call. A connected rule whose
parameter has supplied nothing drops (the optional filter port).

**Slice A's edges, named in the spec's header:** realtime (no REALTIME seam), the Javascript filter (NSP-017's escape
hatch — but measured, rows C38 / C39), and WATCHING the store (another node's create / save / delete patches `Items` in
place through the local Parse matcher — the next slice, a graph through the world's contract events: a world change).

**Runtime target:** `query` joined `BACKEND_OPS` (RestDataAdapter.ts :601-636: `success(records, total)`, no event); the
world's `ok` carries the two as `{ results, count }`.

**The Javascript filter, probed (six arms on the runtime target, world answering every query; probe deleted):** control
(Class only) → query, rows, Success. Javascript with NO script stored → nothing at all: no call, no Success, no Failure,
no Error — **C38** (`filterCode.replace` on undefined is caught and logged, `getStorageFilter` returns `undefined`, and
`fetch()` throws reading `f.where` in the frame-end callback, which the scheduler only logs). A syntax error → the same
silence. The default script written → a normal query (`where: {}`, `sort: []`). A filtering script → its `where` on the
call. A script that throws BEFORE `where(…)` → the query goes out with NO `where` — every row, Success — **C39**, the
widening FLD-008 closed for the error callback, arriving by a throw. Unmeasured for C38: whether the editor stores its
default script as a parameter when an author switches to Javascript (a port default is not a parameter, A-D1).

**A lead dropped, not filed:** reading Query Records' per-port boxes suggested a saved `runOnChange-search` would land in
the catch-all setter (the node scope applies every `runOnChange-…` parameter FIRST, before its port exists). It does
not: `nodedefinition.ts` wraps every dynamic family's `registerInputIfNeeded` so a `runOnChange-…` name always registers
the real box (:512-528) — measured by reading, the guard names this exact case.

### 6.8 Rows (s23)

| row | node | what the trace shows | proposed |
|---|---|---|---|
| **C37** | Record | `<field> Changed` never fires: offered by the editor (:560), never registered (:473-481 handles `prop-` only), the pulse at :142 guarded by `hasOutput`. Control beside it: `Changed` fires for the same write. 86 / 10,000 generated sequences meet it. Ledger `p107-c37-…` | register `changed-` beside `prop-`; rule WITH C11 |
| **C38** | Query Records | Filter = Javascript with no script stored, or a syntax error: no query, no Success, no Failure, no Error — ever (a TypeError at `f.where`, :874, in the frame-end callback, logged only). Probe with a control arm. Ledger `p107-c38-…` | a missing or unparseable script fails the filter, as the visual filter's refusal does |
| **C39** | Query Records | a filter script that throws before `where(…)` sends the query with NO filter — every row, as a Success (:1079-1089; FLD-008 guarded only the error callback). Probe with a control arm. Ledger `p107-c39-…` | a throw in the script fails the filter |
| **D22** | Record | the Fetch's guard (:411) checks `undefined` and `''` but not `null`, which binding treats as empty (:313): a cleared Id wire fetches record `null` and reports the backend's sentence instead of `Missing Id.`. A conforming scenario shows it. Ledger `p107-d22-…` | use `emptyId` at :411 |

### 6.9 Gate readings (s23, 2026-10-02)

| gate | reading |
|---|---|
| `nodegx-node-spec`: `npx jest` | **18 suites, 705 passed, 17 skipped, exit 0** (s22: 687) — the stranger hash gate green (no guarded file moved) |
| runtime: the WHOLE `conformance.test.ts -t "NSP-004 / NSP-011 — every"` | **71 passed, 74 skipped, exit 0, 336 s — all 70 specs CONFORM at seed 20728** (load ~2–3) |
| runtime: `NSP_ONLY=<the five earlier record specs> + DbModel2` at 200, on the changed target | **all six CONFORM**, seed 20728 — Delete 20 / 21 (+C36), Add / Remove 18 / 18, Create 23 / 23, Update 30 / 30, Record 24 / 25 (+C37); each 200 / 200; mutants 34, 36, 36, 40, 78 all killed, Record 145 / 147 + 2 equivalent |
| runtime: `NSP_ONLY=DbCollection2` at 200 | **CONFORMS** 23 / 23, 200 / 200, 255 / 255 |
| runtime deep, `NSP_DEEP=10000`, one spec at a time (load ~2–7, a VM; no peer suite) | **Record CONFORMS** (129 s): 0 divergences, 86 → C37, 204 / 206; **Query Records CONFORMS** (89 s): 0 divergences, 23 → C6 (any port), 255 / 255 |
| interpreter, `tests/batch-records.test.ts` | every record spec × seeds 13, 20728 — all mutants killed or declared; AC5 sentences; AC6 call / no-call |
| runtime: `runtime-target.test.ts` + `graph.test.ts` | **2 suites, 90 passed, exit 0** (s22: 86; +4 = s07) — the four s07 claims written before recording; three held first time, the fourth is C37's (known) |
| `tsc --noEmit` node-spec, runtime (`tsconfig.json`) | exit 0 · exit 0 |
| `node scripts/node-spec/census.js --check` | fresh — 147, 33 excluded, all tiered |
| export, `test:main` | NOT RUN — s23 touched the runtime only in `test/helpers/node-spec-target.ts` (`fetch`, `query`, the answer copy) and `test/node-spec/conformance.test.ts` (one known row) |

### 6.10 s24 (2026-10-02) — Query Records slice B: watching the store

**CONFORMS on the runtime on its first run with the world change** — 37 / 37 scenarios (23 + 14 new), 200 / 200 (seed
20728), 297 / 297 mutants. Spec `src/nodes/query-records.ts` (state `bound`, `query`, `recordsBox`; a `world.store`
handler), the matcher `src/nodes/record-match.ts` (queryutils.ts `matchesQuery` / `matchesOperator` / `compareObjects`
stated as they are — loose `$eq`, a permissive unknown operator, `$relatedTo` never matching, no short-circuit so a
throwing child throws whatever the others did; Filter Records will share it).

**The world change — WRITES MADE ELSEWHERE (world.ts BACKEND, guarded, additive):** the backend script's `events`, each
`{ at, backend?, type, collection, objectId, data? }` a world timer. At its time the writer's half first (`_fromJSON`:
the record takes the class, then each key of `data` — one registry write each, watchers notified), then the adapter's
half: every store listener hears the contract event with the backend it came from. The handoff asked for the world to
route ANOTHER NODE's event; reading the runner said otherwise — the interpreter is not a graph target (no `mountGraph`),
so a single-node play needs the write to come FROM THE WORLD, as a resize does. The real writers are graded beside it
in graph s08 (below). Spec format: `WorldHandlers.store` (spec.ts, guarded). Interpreter: one subscription per world
(`listenToStore`); at a firing every listening instance's inbox is DELIVERED FIRST — the first draft did not, and a
scenario caught it: an answer due at 10 and a write at 15 in one `advance(20)` reached the node in the wrong order,
because the clock's `advance` fires every timer in one sweep (world.ts CLOCK: "what each timer delivers lands BEFORE the
next one fires"). Runtime target: the write through the REAL `CloudStore._fromJSON`, the event through the REAL store of
its backend (`forBackend(…)._adapter.emitAdapterEvent`) — so the node's own subscription is what hears it.

**What the node does, from the code (:251-363, :600-616, :850):** in the spec's header. The points a reader would not
guess: it listens to ONE store — the legacy store from creation, then the store of the backend each query resolved,
rebound at :850 BEFORE the filter is built (a refused filter still moves it). Heard only with the `Record changes` box
ticked, an array held (an answer or the FIRST FAILURE — whose empty array then fills from writes), and the write's class
equal to the Class AS IT IS NOW. A Search term re-queries (BAK-008). Otherwise matched against the query MADE last, even
while its answer is still out. Two behaviours a backend would not give — **C40** (Limit drops the FIRST record unless the
first sort key descends) and **C41** (a member whose sort field moved keeps its place).

**Graph s08 (`s08-the-query-watches.json`, recorded on the runtime, claims written first):** a REAL Create Record, Update
Record and Delete Record writing into a Query Records' rows (`title = a`, sorted by `n`): `[r1 r2 r3]` → create r4 (n 0)
→ `[r4 r1 r2 r3]` → update r1's title to `z` → `[r4 r2 r3]` → delete r2 → `[r4 r3]`; and a Search-term Query Records
re-querying on a real create. All nine claims of the first held on the first recording; the second's were wrong about
WHEN — the re-query is made in the drain after the create's answer and its rows land the frame after — corrected from
the trace, re-recorded.

**A hole in the mutant machinery, found by three survivors:** `wrapReducers` (runner/mutants.ts) copies a spec's world
handlers one by one and did not know `store` — so the reference play AND every mutant ran with the store handler GONE:
the writes made elsewhere were silently dropped from the whole mutant phase, and the only visible sign was three
survivors on the `Record changes` box. Fixed (`world.store` wrapped and named). Every future world handler must be added
there too — its comment says so.

**Reach, measured (an interpreter probe; deleted):** a generated sequence acts on a write only when several independent
draws line up (Class `Lesson` out of examples + the whole string pool, a query made and answered BEFORE the advance, the
box ticked, no Search). With seven hand-placed writes: 0 of 200 on seeds 20728 and 20729. With a write at every doubling
of the clock (2 ms … 65 s) and `Lesson` weighted: still 2 of 400 at 200 — but **70 of 10,000** (100 creates, 31 saves,
66 deletes patched, 23 re-queries). So slice B's 200-gate is the 14 hand scenarios; its random grade is the deep run.

### 6.11 Rows (s24)

| row | node | what the trace shows | proposed |
|---|---|---|---|
| **C40** | Query Records | over Limit after a write made elsewhere, the FIRST record is dropped unless the first sort key descends (:301-311): ascending `[n1 n3]` + `n0` → `[n1 n3]` (the new one dropped at once), + `n9` → `[n3 n9]`; no sort `[r1 r2]` + r4 → `[r2 r4]`. Control: descending right both ways. Two scenarios, both on the runtime. Ledger `p107-c40-…` | drop the LAST under any sort; with none, re-query |
| **C41** | Query Records | a `save` of a member that still matches leaves it where it was, whatever moved (:330-349): ascending by `n`, r1 saved with `n 9` → Items unchanged, nothing re-sent. Ledger `p107-c41-…` | re-place it at its sorted position; rule with C40 |

### 6.12 Gate readings (s24, 2026-10-02; load 8–24 — a busy browser, no peer suite)

| gate | reading |
|---|---|
| `nodegx-node-spec`: `npx jest` | **18 suites, 707 passed, 17 skipped, exit 0** (s23: 705) — the stranger hash gate green after the refresh, which named exactly `src/spec.ts` and `src/world.ts`; the three rounds re-graded in the same run |
| runtime: `NSP_ONLY=DbCollection2` at 200 | **CONFORMS** 37 / 37, 200 / 200, 297 / 297 — on seeds **20728, 20729, 20730** |
| runtime deep, `NSP_DEEP=10000`, Query Records | **CONFORMS** (154 s): 0 divergences, 23 → C6 (any port, as s23), 297 / 297 — the run in which 70 sequences act on a write |
| runtime: the six other record specs at 200 on the changed target | **all CONFORM** (Delete, Add / Remove Relation, Create, Update, Record) |
| runtime: `runtime-target.test.ts` + `graph.test.ts` | **2 suites, 92 passed** (s23: 90; +2 = s08) |
| `tsc --noEmit` node-spec, runtime (`tsconfig.json`) | exit 0 · exit 0 |
| `node scripts/node-spec/census.js --check` | fresh — 147, 33 excluded, all tiered |
| runtime: the WHOLE `conformance.test.ts -t "NSP-004 / NSP-011 — every"` | **NOT RUN** — load 12–24 overruns its 600 s hook (s21's lesson). Why it is safe to defer: the target change acts only in a world with `events` (Query Records' pool alone), and the mutants.ts change only wraps a `store` handler (Query Records' alone) |
| export, `test:main` | NOT RUN — no export code touched |

### 6.13 s25 (2026-10-02) — Filter Records; a step that hands a node a registry array; s24's NOT RUN closed

**s24's NOT RUN, closed first (load 1.9, no peer suite):** the WHOLE runtime conformance suite — exit 0, 75 passed,
70 deep runs skipped, 415 s; **71 specs CONFORM**, every survivor a named equivalent mutant, no hook timeout. (The one
"DOES NOT CONFORM" line is AC1's planted off-by-one in a copy of Counter, as it should be.)

**Filter Records (`FilterDBModels`, T1) CONFORMS on the runtime** — 28 / 30 scenarios (the other two are the known rows
C43, C44), 200 / 200 on seeds **20728, 20729, 20730** with 0 unexplained divergences (14–18 → C10, 4–8 → C43 per seed),
**157 / 157 mutants on each seed**; on the interpreter (batch-records) on seeds 13 and 20728. Spec `src/nodes/filter-records.ts`:
Array Filter's twin over RECORDS — the same six trigger paths and the same failure rule (twins to the end, as the runtime
file says), the visual filter lowered and matched by the shared `record-match.ts` (Query Records' two lowerings moved
there, prefix as a parameter: `qp-` / `fp-`). It makes no request at all, so AC6 reads "no scenario records a `backend`
event — beside one where a save made elsewhere re-runs it" (batch-records.test.ts).

**The handoff's question — `events` or `change`?** Both. It listens for the store's `save` (not `create`, not `delete`)
on ONE store, and for the bound array's own `change`. So the world's `events` serve it as built in s24 (`world.store`
handler), and `world.change` is Array Filter's, unchanged — but no single-node play can change the array; graph s09
grades that path with a real Query Records.

**A step that hands a node a registry array (adapter.ts, additive):** a scenario value — a mount param or a `set`
step's value — that is EXACTLY `{ "$array": "<name>" }` is handed to the node as the world registry's array of that name.
`play` resolves it through a new optional `registryArray(name)` on the target (interpreter: the installed world's
registry; runtime: `Collection.get(name)`, seeded from the same script); a target without it refuses the scenario by
name. Without it a single-node play could hand Filter Records only plain JSON — rows a matcher cannot read
(`model.get is not a function`) — and the store path, its reason for existing, would be graded by graph claims alone.
Stranger hashes refreshed (the diff named `src/adapter.ts` and `src/canonical.ts`, below), the three rounds green.

**Measured before the spec was written (probes, deleted):** (1) the store path depends on the Backend input — the same
graph with it unwritten does not re-filter, with it written (`_active_` or `main`) does: **row C42**; (2) plain-object
rows fail with V8's own sentence, which names the variable — so the shared matcher's parameter is now `model`, as the
runtime's (and its `objectId` branch reads the id whatever `match` already holds, as `&=` does); (3) `null` on Items +
a save of the Class: the runtime throws INSIDE the store's event — in a graph the WRITER's Error carries it and a Query
Records listening after it misses the save (control: Items unset — no Error, the Query Records drops the record):
**row C44**.

**Graph s09 (`s09-the-filter-follows.json`, recorded on the runtime, claims written first):** Query Records → Filter
Records with real writers — (a) Backend written: an Update Record moving a member out of the filter leaves the result
(2 → 1); (b) **C42** as a row (Backend unwritten: the claim `count 1` fails, the trace shows Filter Records silent in the
save's frame); (c) a real Create Record joins the Query Records' rows and the array's `change` re-runs the filter (2 → 3)
with no Backend written — the path C42 leaves open; (d) **C44** as a row (the writer's Error carries the throw, the
Query Records is silent). Both rows checked to fail for exactly their defect, not some other one.

**Two target / runner holes the new scenarios exposed:**
- **T13 — a process-wide object made inside a play draws from the world's stream.** Graph s09 was green alone and red
  in the full run: the first play of a process minted one id shifted by one draw. A call-site diff of the world's
  `Random.next` (raw call sites — reading `Error.stack` under jest runs source-map's quick-sort, which itself draws:
  T8, and the first probe drew 72,028 times through its own stacks) found `SessionStore`'s constructor (`tabId`,
  SessionStore.ts :131), made once per process on the first `currentUserId()` — an access-rule check. The runtime
  target now makes the legacy session store in `installUser`, before the world is installed, in every play.
- **The canonical form of an array was its class's.** `canonicalise` built `items` with `obj.map`, which keeps a
  subclass through `Symbol.species` — the runtime's `CollectionImpl` (collection.ts :739) canonicalised as that class,
  and a trace read back from JSON never is. Now `Array.from` — plain always.
- And C10's known-row predicate read a registry array's canonical form (`{ "$array", items }`) as a plain object and
  missed 3 C10 divergences on seeds 20729 / 20730 — it now recognises the form.

**Reach, measured (an interpreter tally; deleted):** of 400 generated sequences (seeds 20728, 20729) the store handler
is REACHED in 166 and re-runs the node in **0**; the array's own `change` re-runs it in 0 (no single-node play can cause
one). As in s24: the 200-gate for the store path is the 14 hand scenarios; the deep run grades it at random.

### 6.14 Rows (s25)

| row | node | what the trace shows | proposed |
|---|---|---|---|
| **C42** | Filter Records | it binds the LEGACY store at creation (:172) and only a written Backend moves it (:547-553); the editor hides that picker with one backend, so a project with its backend under `backendServices` never re-filters on a save made elsewhere. Measured in a graph with a control (Backend written: re-filters). Scenario + graph s09 row. Ledger `p107-c42-…` | resolve the active backend's store when Backend is unset |
| **C43** | Filter Records | the sort runs OUTSIDE the filter's `try` (:486-491): a Sorting over two or more non-record rows throws `a.get is not a function` out of the run — no Error, no Failure, the press never answered (token drained at :436-437). Known row; 4–8 / 200 per seed. Ledger `p107-c43-…` | move the sort inside the `try` |
| **C44** | Filter Records | `collection === undefined` (:157) lets `null` through to `null.contains` (:164) inside the store's event — fired from the WRITER's success: the writer's Error carries it and a later listener misses the save. Measured in a graph with a control. Known row; graph s09 row. Ledger `p107-c44-…` | `if (!collection) return` |
| C10 (s9) | + Filter Records | the same `bindCollection` (:319): a number, boolean or plain object on Items throws in the setter. The ledger row now names three nodes | as C10 |

### 6.15 Gate readings (s25, 2026-10-02; load 1.4–5.5 — a peer's webpack for a minute, no peer suite)

| gate | reading |
|---|---|
| runtime: the WHOLE `conformance.test.ts`, BEFORE the s25 changes (s24's NOT RUN) | **exit 0, 75 passed, 70 skipped, 415 s — 71 specs CONFORM**; every survivor a named equivalent; no hook timeout |
| runtime: the WHOLE `conformance.test.ts`, AFTER them | **exit 0, 76 passed, 71 skipped, 350 s — 72 specs CONFORM** (+ Filter Records); the survivor set identical to the run before |
| runtime: `NSP_ONLY=FilterDBModels` at 200 | **CONFORMS** 28 / 30 (+ C43, C44 known), 200 / 200, 157 / 157 — on seeds **20728, 20729, 20730** |
| runtime deep, `NSP_DEEP=10000`, Filter Records | **CONFORMS** (147 s): 0 divergences; 723 → C10, 259 → C43, **1 → C44** (the generator found it once), 157 / 157 |
| `nodegx-node-spec`: `npx jest` | **18 suites, 717 passed, 17 skipped, exit 0** (s24: 707) — the stranger hash gate green after the refresh, which named exactly `src/adapter.ts` and `src/canonical.ts`; the three rounds re-graded in the same run |
| runtime: `runtime-target.test.ts` + `graph.test.ts` | **2 suites, 96 passed** (s24: 92; +4 = s09) — in a FULL run, after T13 (alone it was green before the fix too) |
| `tsc --noEmit` node-spec, runtime (`tsconfig.json`) | exit 0 · exit 0 |
| `node scripts/node-spec/census.js` | unchanged — 147, all tiered (Filter Records was tiered T1 at s1) |
| export, `test:main` | NOT RUN — no export code touched |

### 6.16 s26 (2026-10-02) — AUTH, the twelfth seam; User and Set User Properties

**The seam first, measured before written.** A probe ran the User node on the REAL viewer `UserService` and the REAL REST
auth adapter with only the HTTP scripted (the world's NETWORK), eleven situations (the page-load check answered 200 / 503 /
401; a Fetch with nobody, with 503 / 401 / a network error; a Backend another backend, gone, switched; Run On Value Change
off; Set User Properties with nobody, ok, a gone Backend, 403). What it settled:
- **Under R9 the trace carries the auth OPERATION** — `fetchCurrentUser`, `setUserProperties` (`@noodl/backend-contract`
  `IAuthAdapter` and the one beside it) — as a `backend` event, answered by BACKEND's rules. No new trace event; the
  schema is unchanged.
- **What a user node SHOWS is the session its backend holds**, read through the service: `currentFor` hands it to the
  record store (`_fromJSON(user, '_User')`) on EVERY read, so a read is a registry write a bound node hears. The world
  therefore holds the SESSIONS (`backend.sessions`, per backend id), and an auth answer's landing is a list of STEPS the
  REST adapter takes in a fixed order (`landAuth`: the session written or cleared, `sessionChanged`, `sessionGained` /
  `sessionLost`, the caller's callback) — performed by the interpreter on its world and by the runtime target through the
  adapter's own session store and event surface. Both adapters agree on the contract-level order (read, not assumed:
  RestAuthAdapter.ts :978-1186, ParseAuthAdapter.ts :387-521, :656-713); the world plays the REST one, as BACKEND does.
- **The service is part of the world** (THE SERVICE): made by the first node that reaches `forScope` — the User at its
  mount, a Set User Properties at its frame end; it reads a stored session when made; its BRIDGE writes the active
  backend's session into the record store at every `sessionChanged`; and it makes a **start-up check** when made with a
  session — the service's call, on no node's trace, landing never before 1 ms. When that check FAILS, the service clears
  the Parse-wire store and announces `sessionLost` (userservice.ts :147-158) — the source of rows C45 and C46.
- **The refusal before the wire** — `Nobody is signed in.` with no session — is the REST adapter's (and the Parse
  adapter's, ERG-001 made them one sentence): answered at once, inside the call; recorded, never a violation.
- Not played, named in world.ts: the token lifecycle (refresh timers, cross-tab), the Parse-wire auth adapter, the
  service's `current` model (no node specced reads it), the provider return leg.

**The runtime target (`installAuth`):** a FRESH real `UserService` per play behind `Services.UserService.forScope`
(the module's own process-wide assignment undone at load — found by `runtime-target.test.ts`, whose "User cannot mount
without a world" ratchet went green by accident when the module was first loaded); the REST auth adapter's two
operations stood in (`AUTH_OPS`): the call recorded as handed, the landing's steps through the adapter's real store and
`emitAuthEvent`; the constructor's own `fetchCurrentUser` routed to `startService` (unattributed). The args are read AT
THE CALL (the adapter builds its body there; the node's held properties are one live object). Sessions are written into
the play's storage under the REST adapter's key by `installUser`.

**User (`net.noodl.user.User`) CONFORMS on the runtime: 25 / 26 scenarios (the 26th is row C48, known), 200 / 200
(seed 20728; 24 generated divergences attributed to C48), 91 / 91 mutants** — on seeds 20728 and 20729 (82 / 82 on 13).
One mutant was first DECLARED equivalent (the Backend reducer's quiet branch swapped with its sibling: "a repeat write of
the Backend the node holds") — and the 10,000 deep run killed it: a switch to ANOTHER account in between makes the
sibling's last example an older Backend. The declaration is gone; a three-backend hand scenario kills it at 200. First runtime play: 18 of 20 hand scenarios identical; the two that were not were both C48.
Spec `src/nodes/user.ts` — Record's twin for the signed-in account: the four session events, the Backend picker (an id
the project lacks: nobody, and a Fetch fails with the service's sentence, no call), Run On Value Change (`User
properties`), Roles (a real list only), the three session signals and the property outputs as derived outputs.
**Set User Properties CONFORMS: 12 / 12, 200 / 200, 25 / 25 mutants** — first run identical on all twelve. Both green
on the interpreter on seeds 13 and 20728 (batch-records.test.ts), with AC5 (every failure sentence on Error beside a
Failure) and AC6 (a not-configured Backend makes no call, beside scenarios that make one).

**Two interpreter holes the User's mutants found:**
- **A write made elsewhere reached the registry only when some node listened to the store** (s24 subscribed in
  `listenToStore`). A User watching its record never heard a save made elsewhere on the interpreter — the runtime always
  writes it. The world is now subscribed once per world at its first mount (`hearWritesMadeElsewhere`): the write lands
  whoever listens, the store's listeners hear the event as before, then every instance hears what changed on records it
  watches. Found by two `world.auth` mutants that only such a write could kill.
- **AC5's own gate caught a scenario of mine that graded nothing** ("a Fetch that fails with no message" answered at
  +4 ms and never advanced the clock) — a green that would have said the fallback sentence was graded.

**Reach:** the generated sequences draw one of nine backend worlds (sessions or none, the check failing two ways, two
backends with two accounts, roles); the session-loss paths, the backend switch onto the same account and the writes made
elsewhere are the hand scenarios' — each mutant they alone kill is named above.

### 6.17 Rows (s26)

| row | node | what the trace shows | proposed |
|---|---|---|---|
| **C45** | the user service (every User node) | a page-load check that fails (503, network) clears the PARSE-WIRE store, not the REST backend's: Session Lost fires and the user stays signed in (Authenticated true, the session still stored); the legacy session (USER) goes too. Measured on the real service + adapter. Ledger `p107-c45-…` | clear the active adapter's store, and only when the backend rejected the session — the adapter already announces that |
| **C46** | the user service | a session rejected at page load: Session Lost **twice** (the adapter's, then the service's). Ledger `p107-c46-…` | one announcement — ask with C45 |
| **C47** | User | an ended session sends nothing for Id / Email / Username / the properties (`undefined` is never sent, CONTRACT C3; the properties are not even flagged): every wire keeps the person who left. Ledger `p107-c47-…` | send an explicit empty value — needs "what is empty" ruled |
| **C48** | User | `<field> Changed` is offered by the editor and never registered (C11 / C37's twin). Known row. Ledger `p107-c48-…` | register `changed-` beside `prop-` — ask with C11 + C37 |
| **C49** | User (via the service) | Roles is a fresh array on every session read, so a Fetch that changes nothing pulses Changed three times (bridge, `sessionGained`, success). Ledger `p107-c49-…` | write a list only when its content differs — the R7 family |
| **D23** | Set User Properties | Username is dropped by the REST adapter (measured: the body carried Email and the properties, not `zed`); the node says Done. Ledger `p107-d23-…` | say so on the port, or refuse with a sentence on a REST backend |

### 6.18 Gate readings (s26, 2026-10-02; load 3–14 — a busy box, no peer suite)

| gate | reading |
|---|---|
| runtime: `NSP_ONLY=net.noodl.user.User` at 200 | **CONFORMS** 25 / 26 (C48 known), 200 / 200, **91 / 91** on seeds 20728, 20729 (82 / 82 on 13) |
| runtime: `NSP_ONLY=net.noodl.user.SetUserProperties` at 200 | **CONFORMS** 12 / 12, 200 / 200, **25 / 25** on seeds 20728, 20729 |
| runtime deep, `NSP_DEEP=10000`, both | **both CONFORM**: 10,000 / 10,000, 0 divergences; User 1,150 → C48, 91 / 91 (it killed the mutant declared equivalent — §6.16); SUP 25 / 25 |
| runtime: the WHOLE `conformance.test.ts` under load 8–14 | **not a clean reading** — 957 s against the 600 s `beforeAll`: hook-timeout reds that grade nothing. Its log: **71 specs CONFORM** (User and SUP among them), the three last in registry order never reported → re-read alone: Pattern Extractor, Text Accumulator, Stream Buffer CONFORM. Every one of the 73 specs read CONFORMS |
| runtime: `runtime-target.test.ts` + `graph.test.ts` | **96 passed** (after the `userservice` module's global assignment was undone — the first full run read "User mounts without a world") |
| `nodegx-node-spec`: `npx jest` | **18 suites, 729 passed, 17 skipped, exit 0** (s25: 717) — the hash gate green after the refresh, which named exactly `src/spec.ts` and `src/world.ts`; the three stranger rounds green |
| `tsc --noEmit` node-spec, runtime | exit 0 · exit 0 |
| `node scripts/node-spec/census.js` | 147, all tiered; two `placesWritten` counts moved (the new specs name the nodes) |
| `node scripts/bugs.js check` | my six files valid; 3 problems, all P109's (a peer's file names) |
| export, `test:main` | NOT RUN — no export code touched |

### 6.19 s27 (2026-10-02) — Log In, Sign Up, Log Out; graph s10, the session moving

**Built.** `src/nodes/user-actions.ts` — three specs, one shape (a token per press, one call per frame, the batch taken before
the call goes out, Done / Failure with the node's code, Error as given and never cleared), three operations. 10 + 11 + 8
scenarios. All three **conform on the runtime on the first run and at 10,000**; 15 / 15, 17 / 17, 9 / 9 mutants on the
runtime, every mutant killed on the interpreter on seeds 13 and 20728. **96 of 147.**

**The world (world.ts AUTH).** `logIn`, `signUp`, `logOut` joined `AUTH_OPS`. Read from RestAuthAdapter.ts before writing:
- `logIn` / `signUp` ok → the session becomes the ANSWER (`readSession(…, undefined)` :999 — no `previous`, so whoever was
  signed in is replaced), `sessionChanged`, the caller's success, `loggedIn` (:1019-1020). A sign-up's success IS the
  adapter's own sign-in after the account (:1087-1142), so at the contract level it is one operation with the sign-in's
  landing. Failed: the error only.
- `logOut` → cleared WITH `sessionChanged`, success, `loggedOut` — **whatever the backend answers** (`{ ok: finish, fail:
  finish }`, :1083). With nobody signed in there is no request at all (:1070-1073) and it is Done INSIDE the call: the
  world's `authRefusal` became `authBeforeWire`, which answers a refusal OR an in-call success (`inCall`). The interpreter's
  caller now hears the landing's STEP, not the delivery: a refused sign-out is a success.
- Not played, named in the header: the capability gate (`begin`; Directus's `auth.signUp` is `conditional`), and each wire's
  own steps inside a sign-in — Directus writes the tokens first and merges `/users/me` after, so it raises `sessionChanged`
  TWICE, the first time with a session that has no `objectId`. Unmeasured; a lead for the contract's own conformance suite.

**The runtime target — two holes.**
- **T14: a play that started with nobody signed in had no `localStorage`.** `installUser` installed a storage only when the
  script held a session, so a Log In into an empty world wrote its session into nothing and a User watching read nobody —
  Logged In pulsed and nothing else moved, while the same graph starting signed in moved correctly. Found by graph s10's
  claims on the first record; now a storage every backend play. No other graph's trace moved (a full record run: every file
  byte-identical but the escaping of two, restored).
- **The viewer's user nodes reach `UserService.instance`, not `forScope`.** In the app they are one service (userservice.ts
  :525-536); in the target the module singleton would have been a process-wide service made inside the first play. It is now
  made ONCE, before anything of a play is installed (`appUserService`), and every method called on it during a play runs on
  the play's own service.

**Graph s10 — the session moves** (6 scenarios, `S1 N`, claims from each node's sentence BEFORE recording; all held on the
record after T14): Log In into an empty world (User: Authenticated true, Id, Email, `prop-nick`, Logged In); Log In over
another person (the User moves); a refused Log In (Failure and the Error; nothing moves on the User); **Log Out with C47's
evidence beside it** (Logged Out and Authenticated false fire; Id, Email and `prop-nick` record nothing); a sign-out the
backend refuses (Done, never Failure; Logged Out); **Sign Up then Set User Properties with D23's evidence** (the written
`prop-nick` arrives; Username records nothing).

**A lead measured, not a guess (row D24).** The Record family's access rules read the LEGACY store (s22). A probe graph,
three arms on the runtime target: Log In as `u2`, then Create Record with an Owner rule → `create` with NO `acl`; control
(legacy user `u1` scripted) → `acl: { u1: … }`; neither → none. Every REST backend ignores a per-record ACL anyway
(`data.acl` unsupported), so access does not change — but the adapter's "ACL ignored" warning, there so the drop is never
silent, never fires after a REST Log In. The `nodegx` backend on the Parse wire (where ACL is real) is not measured.

**Observed, not a row:** on every REST backend Log Out's Failure and Error can never fire — by the adapter's design (a
sign-out that fails remotely still signs out locally). Its description ("Fires when the sign-out was refused") holds for the
Parse wire only.

### 6.20 Rows (s27)

| row | node | what the trace shows | proposed |
|---|---|---|---|
| **D24** | the Record family's access rules, after any REST Log In | an Owner rule hands no `acl` (the rules read the legacy store a REST Log In never writes), so `RestDataAdapter`'s "ACL ignored" warning never fires. Probe, three arms. Ledger `p107-d24-…` | read the signed-in user from the record's own backend, or warn at the rule when the backend has no `data.acl` |

C47 and D23 now have graph evidence too (s10).

### 6.21 Gate readings (s27, 2026-10-02; load 1.4–9.9 — this session's jest only, no peer suite)

| gate | reading |
|---|---|
| interpreter: `batch-records.test.ts`, the three on seeds 13 and 20728 | 6 / 6 green — scenarios, 200 sequences, every mutant killed, none unreached |
| runtime: `NSP_ONLY=` the three, at 200 (seed 20728) | **all CONFORM, first run**: Log In 10 / 10, 15 / 15 · Sign Up 11 / 11, 17 / 17 · Log Out 8 / 8, 9 / 9 |
| runtime deep, `NSP_DEEP=10000`, the three | **all CONFORM**: 10,000 / 10,000, 0 divergences; Sign Up 61 → C6 (R7: a unit object merged into a `prop-` port); mutants as at 200 |
| runtime traces printed (probe, deleted) | Log Out refused → Done; Log Out signed out → Done in the call, the call recorded; Log In signed in → the start-up check on the world's calls, on no node's trace |
| runtime: `graph.test.ts` — FULL record run, then check mode | **87 / 87** both (76 scenarios; s10's claims held after T14). Record rewrote t04 / t05 escape-only (parsed equal) — restored from HEAD |
| runtime: the WHOLE `test/node-spec/` (conformance + graph + runtime-target) | **3 suites, 183 passed, 76 skipped, exit 0, 386 s** (inside the 600 s `beforeAll`): **76 specs CONFORM** + Counter's AC5; the one DOES NOT CONFORM is AC1's planted off-by-one, as designed |
| `nodegx-node-spec`: `npx jest` | **18 suites, 750 passed, 17 skipped, exit 0** (s26: 729) — the hash refresh named exactly `src/world.ts`; the three stranger rounds green |
| `tsc --noEmit` node-spec, runtime | exit 0 · exit 0 |
| `node scripts/node-spec/census.js` | 147, all tiered; `placesWritten` counts moved only |
| `node scripts/bugs.js check` | 152 files, every header valid |
| export, `test:main` | NOT RUN — no export code touched |

### 6.22 s28 (2026-10-02) — Request Magic Link, Sign In With (the launcher); the return leg probed

**Built.** `src/nodes/user-handovers.ts` — the two user nodes whose sign-in finishes somewhere else (an inbox, a
provider), so neither moves the session on the page that pressed Do. Log In's shape (a token per press, one call per
frame, the batch taken before the call goes out, Failure with the node's code, Error as given). Request Magic Link 10
scenarios, Sign In With 12. Both **conform on the runtime on the first run, on two seeds, and at 10,000**; mutants 15 / 16
(+1 declared equivalent — D25) and 12 / 12 on the runtime, every mutant killed or declared on the interpreter on seeds 13
and 20728. **98 of 147.**

**Read what each CALLS first (s18).** Request Magic Link: `UserService.instance.requestMagicLink({ email, redirect,
success, error })` and nothing else. Sign In With: `UserService.instance` in `initialize` (the service made at MOUNT, with
its start-up check — like the User node), a subscription to `oauthReturn` and a read of the service's `oauthReturn`
state; at the frame end Signing In true, then `signInWithProvider({ provider, redirect, error })` — no `success`
(the contract's one call without one, auth.ts :116-128).

**The world (world.ts AUTH).** `requestMagicLink` and `signInWithProvider` joined `AUTH_OPS`:
- `requestMagicLink` — the session untouched either way: ok → the caller's success; failed → the error. Only the
  `nodegx` backend type offers magic links (`auth.magicLink` is `supported` there, `unsupported` on Directus /
  PocketBase / Parse — RestAuthAdapter.ts :1562-1570 refuses every REST one in the call, through `begin`). That is the
  capability gate, which the world does not play (s27); a world plays a REST backend's refusal as an answer.
- `signInWithProvider` — ok is the HANDOVER ACCEPTED: the adapter navigates the browser away and NOTHING lands (no step;
  the press is never settled — the node's own docblock :227-241). Failed → the error. A falsy provider is refused BEFORE
  the wire, inside the call, by both adapters in the same words (`Sign In With: no provider was set.`, RestAuthAdapter.ts
  :1377-1380, ParseAuthAdapter.ts :616-619) → `authBeforeWire` (now takes the call's args).
- Where the browser goes on a handover (the REST adapter's discovery request, its parked flow, the provider URL) is the
  adapter's — R9's seam, not played. No LOCATION event: the node hands the operation, the adapter makes the navigation.
- **`times` on a backend rule** (additive): a rule answers the first `times` calls it fits, then fits none — so a
  scenario can script a refusal and then a retry that succeeds (D25's scenario needs it).

**Runtime-target hole T15:** the viewer's user nodes reach `UserService.instance` (the module singleton), and s27
forwarded its METHODS to the play's service — not its GETTERS. Sign In With reads `UserService.instance.oauthReturn`, a
getter, which read the app singleton's adapters. Now getters are forwarded too. No other spec read a getter (the whole
suite unmoved).

**The return leg — not played, but probed (row C50).** The receiver half (`applyReturn`, a sign-in coming back on a
later page load through the service's `_consumeAuthReturn` at its construction) needs a world that plays the return —
slice B. Reading it for the seam found a lead, measured before filing: on a PROVIDER ERROR (the person pressed Cancel,
or the provider refused; on REST also a `state` mismatch) the adapter sets the final state at once AND defers the
`oauthReturn` event by `setTimeout(0)`; Sign In With's `initialize` both READS the state and SUBSCRIBES, so it reports
twice. The probe (the real node and service; only `consumeAuthReturn` stood in by the adapter's own branches, verbatim):
- a wire — Sign In With's Failure → a Counter's Increase: **0 → 1 → 2** on a provider error; the control (the exchange
  refused — no early state) → 1;
- the error bus — an On App Error mounted before the Sign In With fires **twice**, mounted after it once; controls:
  exchange refused once in either order, exchange succeeded and no return none.
The node's comment ("idempotent per page load because UserService only ever consumes one return") is wrong: every call
mints a fresh token.

**Runtime-target hole T16 (found, not fixed — slice B's):** the target installs its `beginOutcome` / `reportOutcome` /
signal hooks AFTER a node is made, so an outcome a node reports inside `initialize` is not on its single-node trace —
while in the app it DOES reach the wire (the late wire catches up, graph c01: the probe's Counter counted it). No spec
before Sign In With's return leg reports at mount; slice B must fix it first (hook the definition before the mount).

**Also measured:** Request Magic Link clears Error on a Done with `undefined`, which is never sent (C3) — the wire keeps
the last failure (row D25). The clear is unobservable on every port, so the mutant that drops it is declared
equivalent (`equivalent-mutants.ts`), pointing at D25 — a structural reason (no dedup in `node.ts` `sendValue`), not a
seed's luck.

### 6.23 Rows (s28)

| row | node | what the trace shows | proposed |
|---|---|---|---|
| **C50** | Sign In With (return leg) | a sign-in cancelled or refused at the provider fires Failure TWICE on the returning page (Counter 0 → 1 → 2) and raises twice on the error bus (On App Error ×2 when mounted first); control (exchange refused) once. `initialize` reads the final state AND hears the deferred event (:76-89; RestAuthAdapter.ts :1497-1513, ParseAuthAdapter.ts :765-770). Probe, four arms × two mount orders + a wire arm. Ledger `p107-c50-…` | report a terminal return once per page load (remember the state already reported) |
| **D25** | Request Magic Link | after a Failure, a Done clears Error with `undefined` — never sent (C3): the wire keeps the last failure. Measured on the runtime (the Done frame sends only the outcome). Sign In With's return leg clears the same way (:217-220, read). Ledger `p107-d25-…` | send `''` when clearing a text output (one decision with C47) |

### 6.24 Gate readings (s28, 2026-10-02; load 2.6–5 — this session's jest and one peer jest worker for a minute)

| gate | reading |
|---|---|
| interpreter: `batch-records.test.ts`, the two on seeds 13 and 20728 | 4 / 4 green — scenarios, 200 sequences, every mutant killed or declared (RML 1 declared: D25), none unreached |
| runtime: `NSP_ONLY=` the two, at 200, seeds 20728 and 13 | **both CONFORM, first run, both seeds**: Request Magic Link 10 / 10, 200 / 200, 15 / 16 (+1 equivalent) · Sign In With 12 / 12, 200 / 200, 12 / 12 |
| runtime deep, `NSP_DEEP=10000`, the two | **both CONFORM**: 10,000 / 10,000, 0 divergences (87 s, 81 s); mutants as at 200 |
| runtime traces printed (probe, deleted) | SIW no provider → refused in the call: Error + Failure, Signing In true-and-back inside one frame records no value change; SIW handover → Signing In true, the call, no outcome; RML Failure then Done → nothing on Error (D25); interpreter traces identical |
| return-leg probe (deleted) | C50 as above |
| runtime: the WHOLE `test/node-spec/` (conformance + graph + runtime-target), after T15 | **3 suites, 185 passed, 78 skipped, exit 0, 387 s**: **78 specs CONFORM** + Counter's AC5; the one DOES NOT CONFORM is AC1's planted off-by-one, as designed. Graph 76 / 76 unmoved |
| `nodegx-node-spec`: `npx jest` | **18 suites, 760 passed, 17 skipped, exit 0** (s27: 750) — the hash refresh named exactly `src/world.ts`; the three stranger rounds green |
| `tsc --noEmit` node-spec, runtime | exit 0 · exit 0 |
| count, from `specs` × tiers.json | 78 specs (T1 46 · T2 9 · T3 15 · T4 8) + On App Error + 19 graph-graded T4 = **98** |
| `node scripts/node-spec/census.js` | 147, all tiered; `placesWritten` counts moved only (Text / Group, not this session's) — a first run counted this session's probe files and was re-run after they were deleted |
| `node scripts/bugs.js check` | 154 files, every header valid |
| export, `test:main` | NOT RUN — no export code touched |

### 6.25 s29 (2026-10-02) — Sign In With slice B: the return leg

**Built.** Sign In With **v2** — the receiver half: a sign-in coming back on a later page load. 23 scenarios (+11). It
**conforms on the runtime on the first run, on seeds 20728 and 13, and at 10,000**, mutants 27 / 27. Still 98 / 147:
the node was counted in s28, and v2 grades the rest of it.

**The world (world.ts AUTH, THE RETURN LEG).** A backend script's `return` says this page load is a sign-in coming back
to the active backend. As the user service is made it asks the adapter FIRST (`consumeReturn`; userservice.ts :138),
and a page load carrying a return makes NO start-up check.
- `{ error }` (a provider's error, or REST's `state` mismatch): the state is final at once, and it is ANNOUNCED at 1 ms
  (the adapter's `setTimeout(0)`).
- `{ exchange, after }`: the state is `{ inProgress: true }` at once, and the exchange lands at `after`, never before
  1 ms. If ok, the session is written, then `sessionChanged`, then the state goes to succeeded (with `outcome` /
  `notice`) and is announced, then `loggedIn` (RestAuthAdapter.ts :1536-1547). If it fails, the state goes to failed
  (no message means `Sign-in could not be completed.`) and is announced. `never` lands nothing.
- `notice` is only ever set by the Parse wire's adapter (ParseAuthAdapter.ts :782); a script that carries one plays that.
- A target is handed each later moment's steps with what the moment is (`ReturnLanding`): the adapter's `timer` runs at
  its moment; the exchange's `answer` runs a microtask after its moment, as a `fetch` resolves.

**The format (spec.ts — additive; s28 named the gap).**
- `opens` on a world handler's patch: an invocation NO INPUT opened, opened and reported at once, recorded with the
  port `''` (trace.ts and the schema say so). A reducer may not use it, and the interpreter refuses one that tries.
  The mutant machinery counts it in a branch's shape and flips it.
- `world.mount`: the end of the node's `initialize`. It runs once at mount, after `init` and before the params, and
  what it sends and reports lands in the first settle.
- `world.authReturn`: the service's `oauthReturn` event, heard only by a spec with this handler. The runtime's
  subscription is to this one event; it is not one of the four session events `world.auth` hears, and the User spec
  would have pulsed a derived port for it.
- `WorldView.authReturn()`: the service's `oauthReturn` getter.
- `runner/mutants.ts` wraps both new handlers. s24's lesson: a handler it does not list is dropped silently.

**Runtime target.**
- `RestAuthAdapter.prototype.consumeAuthReturn` is stood in by the world's return, performed on the real adapter: its
  `oauthReturn` state, its store, its events.
- **T16 fixed:** for the making only, `beginOutcome` / `reportOutcome` / `sendSignalOnOutput` on `Node.prototype` hook
  the node being made, at its first call. So a report or a signal made inside `initialize` is on its trace, as it is
  on a wire in the app: a scope makes its nodes and then its connections before the first update, and `connectInput`
  replays a signal sent this update (node.ts :554-556).
- An outcome no input opened was written with the port `'?'`; it is now `''`.

**What T16 moved besides Sign In With.** The whole runtime suite (§6.27) found two graph scenarios in
`t09-component-object.json` whose recorded `expect` lacked Parent Component Object's `changed` / `fetched` sent from its
`initialize` (its `setModelId` at the making). Those signals reach a wire connected at build time (the replay above).
The expectations were recorded through the hole, so they were re-recorded in a full graph run, and the diff adds
exactly those signals (§6.27).

**C50 is graded now.** The spec follows the runtime (R3 (a)). The scenario "A provider's error coming back …" records
two `failure` outcomes on port `''`, and the runtime fires the same two from the real node. A ruled fix is v3, shipped
alone with that scenario.

### 6.26 Rows (s29)

None new. **C50 is graded now.** The scenario records the two Failures the runtime fires, so the row stays open for
Richard's ruling, and a fix is a v3 of the spec.

### 6.27 Gate readings (s29, 2026-10-02/03; load 2–4.3 — this session's jest only)

| gate | reading |
|---|---|
| interpreter: `batch-records.test.ts -t SignInWith`, seeds 13 and 20728 | 2 / 2 green: scenarios, 200 sequences, every mutant killed, none unreached |
| runtime: `NSP_ONLY=net.noodl.user.SignInWith`, at 200, seeds 20728 and 13 | **CONFORMS on the first run, both seeds**: 23 / 23 scenarios, 200 / 200, 27 / 27 mutants |
| runtime deep, `NSP_DEEP=10000` | **CONFORMS**: 10,000 / 10,000, 0 divergences, 91 s, 27 / 27 |
| traces printed, interpreter and runtime (probes deleted) | C50 (two Failures on port `''`), the exchange that lands, Do after a provider's error, Do during an exchange: identical, event for event |
| runtime: the WHOLE `test/node-spec/`, first run | 3 suites, **183 passed, 2 failed**, 372 s. Conformance: 79 CONFORMS (78 specs + Counter's AC5), and the one DOES NOT CONFORM is AC1's planted off-by-one, as designed. The two red were the `t09` graph scenarios (§6.25, what T16 moved) |
| graph: `NSP_RECORD=1`, a FULL run, then a check run | 87 / 87. The record rewrote t04 / t05 with escape-only changes (`—`→`—`), so both were restored from HEAD. The t09 diff adds exactly six `signal` events (`near` and `named`: `changed`, `fetched`). The check run is green: **graph 76 / 76** |
| `nodegx-node-spec`: `npx jest` (after the record) | **18 suites, 760 passed, 17 skipped, exit 0**. The hash refresh named exactly `schema/trace.schema.json`, `src/spec.ts`, `src/trace.ts` and `src/world.ts`; the three stranger rounds are green |
| export: `tests/node-spec-*` | 2 suites, 12 passed, exit 0 |
| `tsc --noEmit` node-spec, runtime | exit 0 · exit 0 |
| count | unchanged, **98** (Sign In With was counted in s28) |
| `node scripts/node-spec/census.js` (after the probes were deleted) | 147, all tiered. Only `placesWritten` moved (Text — not this session's files) |
| `node scripts/bugs.js check` | 159 files, every header valid |
| export `test:main` | NOT RUN: no export code was touched |

### 6.28 s30 (2026-10-03) — the files: Cloud File, Upload File, Sign File URL; the world's FILES

**Built.** Three specs (`cloud-file.ts`; `upload-file.ts` holds Upload File and Sign File URL), 6 + 19 + 11 scenarios.
All three **conform on the runtime on the first run** (Cloud File after one scenario gained its control, below), on
seeds 20729 and 13, and at 10,000; mutants 3 / 3, 25 / 25, 21 / 21. **101 / 147.** Open File Picker (T2) is the fourth
file node and is NOT built: it needs a person choosing a file (a FILE PICKER seam).

**Read first (s18's rule: what does each CALL?).** Cloud File calls nothing: it reads a stored file it is handed. Upload
File and Sign File URL call the routed store (`CloudStore.forBackend`, as the Record family does since BCN-007 step 6),
which hands the adapter the contract's own operations `uploadFile({ file, private, target })` and
`signFileUrl({ name, target })` — the same `(handle, options)` shape as `delete` / `save`, so they joined BACKEND (R9).

**The world (world.ts BACKEND, FILES).**
- The two operations are recorded and answered by the BACKEND rules.
- **The failure is an envelope.** The contract's file callbacks take ONE object, `FileError { error?, code?, status? }`
  (data.ts :51-61), not `(message, detail)`. A failed answer hands `fileError(d)`: the rule's `detail` fields, with
  `error` the message over them, and no `error` key when the rule gave none. The REST adapter hands `{ error }` alone
  (its `fail` has no status — row C51).
- **A refusal before the wire:** an `uploadFile` whose `file` has no `arrayBuffer` is refused inside the call with the
  REST adapter's sentence (`NOT_A_FILE`, RestDataAdapter.ts :1738-1749).
- No store event follows a file operation; upload PROGRESS is not played (the REST adapter never calls
  `onUploadProgress`), so Progress Changed never fires and Uploaded Percent reads 0.

**The format (additive; the hash refresh named exactly `src/adapter.ts`, `src/canonical.ts`, `src/spec.ts`,
`src/world.ts`; the three stranger rounds green).**
- **canonical.ts, two rows.** A file the browser hands (a `Blob` by its surface) is `{ "$file": { name?, size, type } }`
  (no bytes, no `lastModified`). A STORED file (`getUrl`, `getName`, `getTarget` all functions — the runtime's
  `CloudFile`) is `{ "$cloudFile": { name, url, contentType?, size?, target? } }`. The stored file is TAGGED, unlike other
  class instances: Cloud File, Sign File URL and a record's file property take ONLY a stored file (`instanceof
  CloudFile`) and drop a plain object with the same keys, so a trace that could not tell them apart would let a target
  hand a plain object and pass. canonical.test.ts has a row for each.
- **adapter.ts, two scenario values**, resolved by `play` through two OPTIONAL target hooks as `$array` is (s25):
  `{ "$file": { name, type?, size? } }` → `file(desc)` (Node's own `File`, zero bytes, `lastModified` 0, on both targets);
  `{ "$cloudFile": { … } }` → `cloudFile(desc)` (the runtime's `CloudFile`; the interpreter's `StoredFile`, world.ts).
  A target without the hook refuses the scenario by name (adapter.test.ts).
- **spec.ts:** a patch's `backend` may be a LIST — several calls in order. Upload File needs it: every press in a frame is
  its own after-inputs callback and its own call (measured: two presses, two calls, two Dones; no coalescing).

**Runtime target.** `uploadFile` / `signFileUrl` joined `BACKEND_OPS` (success hands the answer; no event). A file
operation's failure goes through `fileError`, a refusal before the wire lands inside the call, and a throw in a success
is `{ error: message }`, as the adapter's `fail` hands it. Upload File joined `VIEWER_NODES`; Cloud File and Sign File
URL are the runtime's own.

**What the probe measured first (on the runtime, before any spec).**
- Upload File reports Uploaded Percent `0` at the first settle (its getter's `!total` branch); the other progress
  outputs are `undefined`.
- Two presses in one frame make two calls. A string on File reaches the adapter and is refused there.
- `{ error, detail: { status: 403, code: 119 } }` shows **119** on Error Status Code: `code || status || 0` (C51).
- A message-less envelope puts the object itself on Error (`{}` / `{ status: 500 }`) (C51).
- Cloud File drops a plain object with a stored file's keys, and drops `null` and strings.
- Re-signing to a public link leaves Expires At and TTL on the wire (D26).
- Two traces per node were printed side by side (two presses; a string; a re-sign to public): identical, and not empty.

**Reach (s24's rule: measure it before trusting a 200 / 200).** On 400 generated sequences (seeds 20729 and 13) Upload
File reached a call in 96 and a Done in only **6**: 71 of the calls were a refused string. The file pool was weighted
(six of eight examples a real file): 111 calls and **14** Dones. Sign File URL: 60 calls, 17 Dones. Cloud File took a
stored file in 249 of 400. The hand scenarios are the 200-gate for the success paths.

**Not graded, named in the specs' headers:** the Parse wire's XHR progress; the editor's Backend picker and inspector; a
failure envelope that is `undefined` (the contract allows `error()` with nothing; `setError` would throw on
`.hasOwnProperty` — the world always hands one); a stored file with no name (Cloud File's Name getter would throw).

**The census tier.** Cloud File is T3 in `tiers.json`, but its spec needs no world at all — everything it reports, the
stored file carries. Left as tiered (a judgement for the census's owner, not this batch's); its spec declares no `needs`.

### 6.29 Rows (s30)

- **C51** — Upload File and Sign File URL's **Error Status Code is never the HTTP status**: always 0 on Directus,
  Supabase and PocketBase (the REST adapter's `fail` drops it), the Parse error CODE (119) on the NodeGX / Parse wire
  (`code || status`), and a message-less body puts the envelope OBJECT on Error. Graded by three scenarios.
  ([P107-C51](../../bugs/p107-c51-upload-file-and-sign-file-url-error-status-code-is-never-an-http-status.md))
- **C52** — Cloud File's **Name is the original file name only on NodeGX**: the "drop up to the first `_`" rule is
  Parse's, so PocketBase's `photo_g235k8arvj.png` (measured in BCN-007's probe) reads `g235k8arvj.png`, Directus's
  reads a UUID (the FileRef's `filename` is dropped by the stored file), Supabase's the bucket path. Graded by one
  scenario. ([P107-C52](../../bugs/p107-c52-cloud-file-name-is-not-the-original-file-name-on-three-of-four-rest-backends.md))
- **D26** — after Sign File URL mints a link with no expiry, **Expires At and TTL keep the previous link's** on the wire
  (C3; one decision with D25 and C47). ([P107-D26](../../bugs/p107-d26-sign-file-url-expires-at-keeps-the-previous-link-s-expiry-after-a-public-link.md))

### 6.30 Gate readings (s30, 2026-10-03; load 2.8–4.8 — this session's jest only, no peer suite)

| gate | reading |
|---|---|
| probe on the runtime FIRST (zz probe, deleted) | the measurements in §6.28 — before any spec was written |
| runtime: `NSP_ONLY="Cloud File,Upload File,Sign File URL"`, at 200, seeds 20729 and 13 | **CONFORMS**: Upload File and Sign File URL on the first run; Cloud File after its drop scenario gained a firing control (the runner refused it — "an arm with no predicate grades nothing"). 6 / 6, 19 / 19, 11 / 11 scenarios; 200 / 200; mutants 3 / 3, 25 / 25, 21 / 21 |
| runtime deep, `NSP_DEEP=10000` | **CONFORMS**, all three: 10,000 / 10,000, 0 divergences (40 s, 89 s, 84 s) |
| interpreter: `batch-records.test.ts`, seeds 13 and 20728 | 6 / 6 green (the three added to `CONFORMING`); AC5 / AC6 for Upload File and Sign File URL: every failure sentence on Error beside a Failure, the call's `op`, a no-file and a not-configured scenario making no call |
| two traces printed side by side, interpreter and runtime | two presses, a string File, a re-sign to public: identical, event for event, and not empty |
| reach, 400 generated sequences (seeds 20729, 13) | Upload File 111 calls / 14 Dones (6 before the file pool was weighted); Sign File URL 60 / 17; Cloud File took a stored file in 249 |
| runtime: the WHOLE `test/node-spec/`, first run | 3 suites, **186 passed, 2 failed**, 337 s. Graph and runtime-target green (the canonical change moved no recorded graph). The two red: **mutant survivors on today's rotated seed 20729**, in specs this session did not touch — CollectionClear (`afterInputs drop-set` on the failure branch whose Error is unchanged) and DbModel2 (`modelId drop-set` on the unbind branch). Control: both CONFORM at 20728 with this session's changes in place, so the rotation exposed them (s12's T4 lesson). Each closed by a hand scenario (CollectionClear: two failed Dos, then bind and Do once; DbModel2: Id emptied while bound, then Fetch) — both conform at 20729 and 20728 |
| runtime: the WHOLE `test/node-spec/`, second run | **3 suites, 188 passed, exit 0**, 351 s; 82 conformance reports (81 specs + Counter's AC5), the one DOES NOT CONFORM is AC1's planted off-by-one, as designed. GRAPH 76 / 76 |
| `nodegx-node-spec`: `npx jest` | **18 suites, 784 passed, 17 skipped, exit 0** (+7 canonical rows, +2 adapter tests, the batch additions). The hash refresh named exactly `src/adapter.ts`, `src/canonical.ts`, `src/spec.ts`, `src/world.ts`; the three stranger rounds green |
| export: `tests/node-spec-*` | 2 suites, 12 passed |
| `tsc --noEmit` node-spec, runtime | exit 0 · exit 0 |
| count | **101** (+3) |
| `node scripts/node-spec/census.js` | run, then RESTORED from HEAD: it picked up a peer's uncommitted viewer-react work (dynamic ports 68 → 69, Button / Columns / Text test counts). No census number depends on specs |
| `node scripts/bugs.js check` | 164 files, every header valid |
| export `test:main` | NOT RUN: no export code was touched |

### 6.31 s31 (2026-10-03) — Open File Picker; the world's PICKER (the 13th seam)

**Built.** `open-file-picker.ts`, 16 scenarios. It **conforms on the runtime on the first run** (15 scenarios and 200
sequences; one mutant survived and was closed by a 16th scenario, below), on seeds 20729 and 13, and at 10,000; mutants
26 / 26. **102 / 147 — and T2 is complete (11 / 11).** 20 of NSP-014's 24.

**Read first (what does it CALL?).** One browser surface, and no backend: `document.createElement('input')` in
`initialize` (once, reused for every Open — :43-51, for Safari); on Open, `accept` / `capture` assigned, `onchange` /
`oncancel` assigned, `input.click()`. The person then answers through the element's handlers. The handoff's sketch held,
with one correction: the n-th answer reaches the handler the element holds WHEN it lands, not "the n-th Open". That
difference is the race below.

**The world (world.ts PICKER).**
- A play has a `document` exactly when its script has a `picker` (`{}` included), so no other node's play changes.
  `createElement('input')` hands the world's file input; any other tag is refused.
- The element REFLECTS `accept` and `capture`: assigned values are held as strings (`String(v)`, WebIDL's DOMString),
  `''` until assigned. That is where D27 shows: `undefined` → `"undefined"`.
- A click is a `picker` trace event in the LOCATION group, carrying `{ accept, capture }` as the ELEMENT holds them at the
  click, not as the node last set them. That is where C53 shows: the node skips an assignment, the element keeps the old
  value.
- The n-th click is answered by the script's n-th entry (the last repeating; none: never): `{ file }`, `{ empty }`,
  `{ cancel }`, `{ never }`, or `{ throws }` (inside the call, after it is recorded). The three that land do so at `after`
  (never before 1 ms) and fire the handler the element holds THEN, as a DOM event does.
- Not played, named: Electron's `path` (a world file has none, so Path is never sent), the dialog's own filtering,
  `multiple`, drag-and-drop. Whether a real browser ever THROWS from `click()` was not measured: the node's comment says
  a sandboxed frame does; Chrome without a gesture opens nothing (the world's `never`).

**The format (additive; the hash refresh named exactly `schema/trace.schema.json`, `src/spec.ts`, `src/trace.ts`,
`src/world.ts`; the three stranger rounds green).**
- trace: a `picker` event `{ accept, capture }` (two strings) in the LOCATION group; schema.ts and the JSON schema.
- spec.ts: the `picker` need; `WorldView.pickerAnswer(ahead)` (a reducer reads a throw before it reports); a `picker`
  effect; `WorldHandlers.picker`; `WorldPool.pickers`.
- **spec.ts: `OutcomePatch.settles`** — an outcome reducer settles its OWN input's still-pending invocations, oldest first,
  BEFORE its own opens. A second Open makes the first Unchanged inside its own handler (:66-70). No existing field could
  say it: a world handler's `outcomes` would land after the new press's in-call Failure, out of report order. Refused on
  a non-outcome reducer, and on nothing pending.
- mutants.ts: `world.picker` wrapped and named. **s24's trap again**: the first run threw "the spec has no world.picker
  handler" because `wrapReducers` copies handlers by name. Also new in mutants.ts: a click and `settles` in a branch's
  shape (only when present, so every earlier shape is unchanged), `flip-outcome` flips `settles`, and a new
  `drop-picker` mutant (the dialog never opens).

**Runtime target.** `openfilepicker` joined `VIEWER_NODES`; the `document` is `installWorld`'s. A click is attributed to
the node whose `_internal.inputElement` is the element clicked. Neither the async context nor `inUpdate` would do: a
pulse over a wire reaches Open inside ANOTHER node's update.

**What the probe measured first (zz probe on the runtime, a hand-made document, deleted).**
- Never set, Accepted file types reaches the element as `"undefined"` (D27).
- Capture `user` → Open → Capture `''` → Open: the second click still holds `capture: "user"` (C53).
- A second Open makes the first Unchanged in its own frame, before anything of its own.
- A pick fired outside any frame sends its four values and Done in the next settle.
- A refused click puts `Could not open the file picker: <message>` on Error with Failure `open-file-picker/open-failed`.
  A later pick is Done, and Error is not cleared (D25's family).
- After any answer both handlers are `null`.

**The race the world makes gradeable.** A first dialog's answer that lands while a second Open waits meets the SECOND's
handler: the second press is Done with the first dialog's file. One that lands after the second was answered meets no
handler and does nothing. Both are scenarios; the spec models "a handler is there" as `pending`, which is exactly when
the element's handlers are the node's.

**The survivor.** At 200 on today's seed, `open drop-set` on the superseding branch survived. No scenario changed
Capture across a superseding Open and then cleared it. It was closed by "C53 through a superseding Open". Then 26 / 26.

**Reach (400 generated sequences).** 582 clicks; Done in 51 sequences, Unchanged in 162, Failure in 34, File sent in 51.
The pool is weighted to the success path (a pick at once, late, after a cancel, after a refused click, racing a later
Open).

### 6.32 Rows (s31)

- **C53** — Open File Picker: **clearing Capture after an Open that used it still opens the camera.** `capture` is
  assigned only when truthy, on an element reused for every Open (:143-145). Graded by two scenarios.
  ([P107-C53](../../bugs/p107-c53-open-file-picker-capture-cleared-still-opens-the-camera.md))
- **D27** — with Accepted file types never set, **the dialog's `accept` is the string `"undefined"`** (:141, unguarded).
  Latent: the browsers ignore an unknown token, which was not measured here. Rides with C53's fix.
  ([P107-D27](../../bugs/p107-d27-open-file-picker-accept-is-the-string-undefined-when-blank.md))
- Error keeping the last failure across a later Done is **D25's family** (Request Magic Link, Upload File). No new row.

### 6.33 Gate readings (s31, 2026-10-03; load 2.9–3.7 — this session's jest only, no peer suite)

| gate | reading |
|---|---|
| probe on the runtime FIRST (zz probe, deleted) | the measurements in §6.31 — before any spec was written |
| runtime: `NSP_ONLY="Open File Picker"`, at 200, today's seed | first run: 15 / 15 scenarios, 200 / 200, **one survivor** (`open drop-set`, the superseding branch); after the 16th scenario **CONFORMS**, 16 / 16, mutants 26 / 26 |
| runtime, seeds 20729 and 13 | **CONFORMS** both |
| runtime deep, `NSP_DEEP=10000` | **CONFORMS**: 10,000 / 10,000, 0 divergences, 26 / 26 (99 s) |
| two runtime traces printed by hand | C53 (the second click `capture: "user"`) and the race (the second press Done with the first dialog's `photo.png`): read event by event, as §6.31 says |
| reach, 400 generated sequences | §6.31 |
| runtime: the WHOLE `test/node-spec/` | **3 suites, 189 passed, exit 0**, 340 s (s30's 188 + Open File Picker); the one DOES NOT CONFORM is AC1's planted off-by-one. GRAPH 76 / 76 |
| `nodegx-node-spec`: `npx jest` | first run 786 passed / **1 red, the hash gate**, naming exactly `schema/trace.schema.json`, `src/spec.ts`, `src/trace.ts`, `src/world.ts`. Refreshed: 787 passed. With +5 PICKER tests in `world.test.ts` and Open File Picker in `batch-records.test.ts`'s `CONFORMING` (interpreter, two seeds): **18 suites, 794 passed, 17 skipped (the opt-in deep runs), exit 0** |
| export: `tests/node-spec-*` | 2 suites, 12 passed |
| `tsc --noEmit` node-spec, runtime | exit 0 · exit 0 |
| count | **102** (+1); T2 11 / 11 |
| `node scripts/node-spec/census.js` | run, then RESTORED from HEAD (the peer's viewer-react work is still uncommitted: dynamic ports 68 → 69, test counts). No census number depends on specs |
| `node scripts/bugs.js check` | C53 and D27 valid; 1 problem, a PEER's file (`p109-s5-kitrecording-…`: status fixed, no commit line), not touched |

### 6.34 s32 (2026-10-03) — Cloud Function; NETWORK's XHR face, PROJECT's cloud services

**Built.** `cloud-function.ts`, 18 scenarios (one the C54 row). It **conforms on the runtime on the first run** (17 / 17
and 200 / 200; one mutant survived and the branch it named was removed, below), on seeds 13 and 20730, and at 10,000;
mutants 26 / 26. **103 / 147.** 21 of NSP-014's 24.

**Read first (what does it CALL?).** Not the backend contract, so R9 does not reach it. The node makes its OWN request:
`new XMLHttpRequest()`, `POST <cloudservices.endpoint>/functions/<encodeURIComponent(name)>` (cloudfunction2.ts :38-79,
:286), headers `X-Parse-Application-Id`, `Content-Type: application/json`, `x-noodl-cloud-version` (a deployed backend
only) and `X-Parse-Session-Token` (when the browser holds a session for the app id, read through `parseSessionStore`). The
body is the JSON of the held parameters. So it is a NETWORK conversation with the project's cloud services. The handoff
asked "BACKEND or NETWORK?": NETWORK, but through a face the world did not have, because NETWORK played `fetch` only.

**The world (additive; the hash refresh named exactly `src/spec.ts`, `src/world.ts`; the three stranger rounds green).**
- **NETWORK, TWO FACES.** `worldXMLHttpRequest(world)` issues into the same rules and records the same request as
  `worldFetch`. `open` fires `readystatechange` at 1 synchronously. A second value for one header name is APPENDED after
  `, ` (XHR's rule). `send(null)` sends no body. The answer lands a microtask after its moment, where a fetch's resolution
  lands; a browser uses a task, and no node in a play can tell the two apart. A response walks `readyState` 2, 3, 4; a
  network error is state 4, status 0, `''`, then `onerror`. **A handler that throws is reported, never propagated** (the
  DOM's rule). Found by C54: the runtime's throw first escaped as an unhandled rejection and failed the jest suite.
  `installWorld` gives EVERY play the XHR face beside `fetch`, and the whole runtime suite was re-run to show no other spec
  moved.
- **PROJECT, `cloudServices`.** The project's `cloudservices` metadata as handed (`{ appId, endpoint, deployVersion? }`,
  absent: none). Beside it, `sessionToken` is the session the browser holds for that app id. That is a fact of the play's
  STORAGE, so the target writes it through the real `SessionStore` and never into the metadata. `WorldView.cloudServices()`.
  `WorldPool.cloudServices` is drawn ONLY when a pool names it, so every earlier `project` spec draws what it drew (a
  world test checks it).

**Runtime target.** `data/cloudfunction2` joined `VIEWER_NODES`. `installBackend` sets the play's `cloudservices` (it
used to set none). It does so AFTER the legacy store and the user service are made, so neither binds to it. The session
store for the app id is made there too, before `installWorld` (s25's T13: its constructor draws `Math.random`). The
request is attributed like HTTP Request's: the after-inputs callback runs inside the node's update.

**What the probe measured first (zz probe, a stand-in XHR, deleted).**
- Two presses in a frame: one request, two Dones. A press while a call is out owns the next batch; answers landing in
  reverse settle their own batches.
- No cloud services: `No cloud services defined in this project.` and Failure, no request.
- An unset function posts to `/functions/undefined`.
- A 204 is a Failure (`Failed running cloud function.`): only 200 and 201 succeed.
- Error is the body when it is a JSON string, else its `error` field. That field can be an OBJECT (D28). Status 0 gives
  `Could not reach the backend at <endpoint>`.
- A body that is not JSON (or none) is Done with nothing moved. A string `result` is iterated by index.
- Results and Error are never cleared: a later call that drops a key, or succeeds, leaves them.
- **A 200 whose body is `null` throws `Cannot read properties of null (reading 'result')` inside the XHR's handler: no
  outcome ever (C54).**

**The ports.** All are dynamic. The editor draws `in-<p>` and `out-<r>` from the PROJECT's cloud function (its Request and
Response nodes, CloudFunctionAdapter.ts :79-121), not from the params. As with Record's FIELDS, a play's function takes
`a`, `b` and answers `sum`, `message` (`RESULT_FIELDS`). `function` and `in-*` are discovered on first write. A result key
the graph does not wire is held and never sent (`hasOutput`, :304). The spec sends only `RESULT_FIELDS`, and the
runtime target registers exactly those.

**The survivor.** At 200 on today's seed, `world.response drop-set` on the no-result branch survived: dropping the deletion
of the finished call from `inFlight`. Nothing reads that deletion, because an answer lands once (the world's rule) and the
runtime keeps each batch in a closure. So the deletion was removed rather than declared equivalent. Then 26 / 26.

**Reach (400 generated sequences, today's seed).** 265 requests; Done 179, Failure 302; `out-sum` sent 44 times,
`out-message` 23. That is after weighting the answer pool with three more results that move (before: 25 result sends).

### 6.35 Rows (s32)

- **C54** — Cloud Function: **a success whose body is JSON `null` throws reading `.result`, and the Call is never answered**
  (:292 checks `res !== undefined`, :301 reads `res.result`). DEF-026 made the error path total; this is the success
  path's one hole. The spec reads it as no result (Done). Graded by a scenario, and hit 216 times in the 10,000.
  ([P107-C54](../../bugs/p107-c54-cloud-function-a-null-success-body-never-answers-the-call.md))
- **D28** — Cloud Function: **Error carries an object when the backend's `error` field is one** (:324-327), on a port
  typed `string`. Upload File has the same habit (§6.28). The spec states the runtime's reading.
  ([P107-D28](../../bugs/p107-d28-cloud-function-error-can-be-an-object-on-a-string-port.md))
- Error and the results never cleared across calls: **D25's family**. No new row.
- A 204 as a Failure: our backend answers a function with `{ result }` and 200 (not measured against a live one). Written
  into the spec; not a row.

### 6.36 Gate readings (s32, 2026-10-03; load 2.3–3.5 — this session's jest only, no peer suite)

| gate | reading |
|---|---|
| probe on the runtime FIRST (zz probe, a stand-in XHR, deleted) | the measurements in §6.34, before any spec was written |
| runtime: `NSP_ONLY=CloudFunction2`, at 200, today's seed (20729) | first run: 17 / 17 + C54 known, 200 / 200, **one survivor** (`world.response drop-set`), and C54's throw escaped as an unhandled rejection. After the XHR face swallows a handler's throw and the dead deletion went: **CONFORMS**, mutants 26 / 26 |
| runtime, seeds 13 and 20730 | **CONFORMS** both (C54 known 2 and 4 times; C6 1 and 2) |
| runtime deep, `NSP_DEEP=10000` | **CONFORMS**: 10,000 / 10,000, 0 divergences, 26 / 26 (85 s); C54 known 216, C6 55 |
| two runtime traces printed by hand | "one call" (request with lower-cased headers, `out-message`, `out-sum`, Done) and "a press while a call is out" (the later call's `sum` 2 first, the earlier's 1 at +100). Both IDENTICAL to the interpreter's, read event by event |
| reach, 400 generated sequences | §6.34 |
| runtime: the WHOLE `test/node-spec/` | **3 suites, 190 passed, exit 0** (s31's 189 + Cloud Function); GRAPH 76 / 76. Every play now has the world's `XMLHttpRequest`; nothing else moved |
| `nodegx-node-spec`: `npx jest` | hash refresh first (named exactly `src/spec.ts`, `src/world.ts`). With +4 XHR / cloud-services tests in `world.test.ts` and Cloud Function in `batch-records.test.ts` (interpreter, two seeds; the failure sentences; a no-request scenario beside requesting ones): **18 suites, 804 passed, 17 skipped, exit 0** |
| export: `tests/node-spec-*` | 2 suites, 12 passed |
| `tsc --noEmit` node-spec, runtime | exit 0 · exit 0 |
| count | **103** (+1); T3 19 / 39 |
| `node scripts/node-spec/census.js` | run, then RESTORED from HEAD (a peer's uncommitted viewer and export work moves dynamic ports 68 → 69 and test counts; Cloud Function's row does not move). No census number depends on specs |

### 6.37 s33 (2026-10-03) — Subscribe To Changes; BACKEND's REALTIME

**Built.** `subscribe-to-changes.ts`, 14 scenarios. It **conforms on the runtime on the first run**: 200 / 200 and 0
divergences. Three mutants survived, all the stuck-flag kind, and are declared equivalent (below). It also conforms on seeds
13 and 20730 and at 10,000. **104 / 147.** 22 of NSP-014's 24.

**Read first (all three stream nodes, as the handoff asked).** Subscribe To Changes reaches its backend through ONE call:
`createRealtimeSubscription(handle, { collection, where, primaryKey, onEvent, onStatus, onError })`
(subscribetochanges.ts :437-444). It asks `realtimeSupportFor(handle.type)` first. Under the call sit five transports (the
SSE dialects, Directus's socket, Parse's probe) and `RealtimeSubscription`, which holds the reconnect backoff and the connect
deadline. **Query Records' realtime half goes through the same door** (dbcollectionnode2.ts :697-707), so this seam serves
both. Server-Sent Events and WebSocket do not touch the backend layer at all: each owns a raw connection (`SseConnection`
with two transports; `WebSocketConnection`). So the handoff's guess holds: **two seams**. This one is R9's, at the
operation. The other is a STREAM face on NETWORK, still to build.

**The world (additive; the hash refresh named exactly `src/spec.ts`, `src/world.ts`; the three stranger rounds green).**
- **BACKEND, REALTIME.** `world.backend.subscribe(call, tell)` records `{ op: 'subscribe', backend, args }` (the options
  without their three callbacks) and returns the HANDLE the node holds (`status`, `dispose()`). The first rule that fits
  answers it with `{ stream: [ { at, status | change | error } ] }`, or with `never`. Each entry is told `at` ms after the
  subscribe, never before 1 (a connection answers nothing inside the call that opened it). The handle's own rules
  (RealtimeSubscription.ts) are the world's:
  - a status equal to the one held is not told (`_setStatus`);
  - a change is completed to the contract's `RealtimeChange`: the subscription's collection, and `ids` / `records` `[]`
    and `recordsComplete` `true` when the entry gives none;
  - an error's `kind` defaults to the contract's classification (`REALTIME_FAILURE_KINDS`, copied, because this package
    depends on no contract). A `fatal` error then stops the subscription: `stopped` is told and nothing after it;
  - a handler's throw is swallowed (`_notify`), the rule s32 set for every face;
  - `dispose()` records `{ op: 'unsubscribe', backend, args }` with the subscribe's args, sets `stopped` WITHOUT telling it,
    and tells nothing more. A second dispose does nothing.

  A subscribe no rule answers is a VIOLATION and tells nothing. A stream answering any other operation is a script error.
- **The format.** Two new patch effects: `unsubscribe` (ids, applied first) and `subscribe` (a `SpecBackendCall` with op
  `subscribe`). Both are recorded as `backend` events in the request group. The new handler `world.realtime` was added in
  the FOUR places (spec.ts `WorldHandlers` and the erased `AnyNodeSpec.world`, interpreter.ts `handleInbound`, mutants.ts
  `reducerNames` + `wrapReducers`). There are two new mutation kinds, `drop-subscribe` and `drop-unsubscribe`, and the patch
  shape names the two effects only when present, so every earlier spec's shapes are the strings they were.

**Runtime target.** `installBackend` replaces the realtime module's `createRealtimeSubscription` export for the play. The
node calls it through the module object at each reconfigure; the probe measured this before anything was built.
`realtimeSupportFor` stays the real one, and every play's backend is `directus`, which it calls supported.

**What the probe measured first (zz probe, deleted).** The handle the node gets is `{ status, dispose }`, and it reads
`status` once, right after the call (`connecting`). `primaryKey` is `id` (no class schema in a play). `where` is absent
with no Filter. **Writing the Class it already holds disposes the subscription and opens another (C55).** Enabled `false`
disposes it and clears the status. An unknown Backend raises `CAPABILITY_UNAVAILABLE` with no call.

**The survivors.** The frame end's quiet reconfigure (Enabled off, or no Class, with nothing held) has nothing to tear
down and nothing to open. A stuck `scheduled` flag therefore re-runs it silently, and every input that could change the
outcome schedules a reconfigure anyway. These are Map Collection's three `STUCK_FLAG` rows, declared in
`equivalent-mutants.ts`. The teardown now clears `sub` only when one was held, so the quiet branch sets `scheduled` alone.
Before the hand scenarios, six more `world.realtime` mutants survived: a value told and then overwritten before any
settle. The scenarios killed all six.

**Planted on a COPY of the runtime node (in memory, never the file).** Three defects, each caught at 200 on today's seed:
`init` pulsing; a held error not cleared by `subscribed`; Enabled read as `=== true` (untouched = off). The suite grades
the runtime, not only the interpreter's mutants.

**Reach (400 generated sequences, seeds 20729 + 13).** 138 subscribe, 95 unsubscribe. Signals: Record Created 23, Record
Updated 21, Record Deleted 18, Records Changed 25, Realtime Failure 68. Realtime Status `subscribed` was seen in only 5
and `interrupted` in 1. Any input write tears the subscription down, so a told status is observed only when an advance is
followed by a settle with no write between. That limit is the node's own churn, not the pool. The pool already tells
something at every doubling of the clock (Query Records' WRITES), which lifted the signals from 3–18; the status paths are
pinned by hand scenarios. At 10,000 the counts are 25× these.

### 6.38 Rows (s33)

- **C55** — Subscribe To Changes: **a write of the value an input already holds tears the subscription down and opens a new
  one** (every setter schedules a reconfigure unconditionally, :327-348, :567-572). Subscribed goes false until the backend
  confirms again, and a change in the gap is lost (no replay). Its twin, Query Records, guards with `valueDidChange`. The
  spec states the runtime's reading (R3 (a)).
  ([P107-C55](../../bugs/p107-c55-subscribe-to-changes-a-same-value-write-reconnects.md))
- The teardown keeps Realtime Error: an old error stays until a NEW subscription says `subscribed`. It is consistent with
  the docblock ("The last realtime failure") and is in the spec. Not a row.

### 6.39 Gate readings (s33, 2026-10-03; load 2.2–5 — this session's jest only, no peer suite)

| gate | reading |
|---|---|
| probe on the runtime FIRST (zz probe, the export stood in by hand, deleted) | §6.37, before any spec was written |
| runtime: `NSP_ONLY=SubscribeToChanges`, at 200, today's seed (20729) | first run, before any scenario: 200 / 200, 0 divergences, **8 survivors** (6 overwritten-before-a-settle, 2 stuck-flag). With the 14 scenarios: 14 / 14, survivors 3 (stuck flag). Declared: **CONFORMS**, 138 / 141 + 3 equivalent |
| runtime, seeds 13 and 20730 | **CONFORMS** both, 14 / 14, 138 / 141 + 3 equivalent (and again after the doubling pool) |
| runtime deep, `NSP_DEEP=10000` | **CONFORMS**: 10,000 / 10,000, 0 divergences (113 s); C6 known 14 (a `{ unit, value }` on `qp-min` merged into a later number — R7's row, not this node's) |
| a runtime trace printed by hand | a stream (subscribed, a create, a key-only delete, a fatal error, a change after it) and an Enabled write: the subscribe with the lowered `where`, `created` / `deleted` / `realtimeFailure`, the unsubscribe and the new subscribe — read event by event |
| planted defects on a copy of the runtime node | 3 / 3 caught (§6.37) |
| reach, 400 generated sequences | §6.37 |
| runtime: the WHOLE `test/node-spec/` | **3 suites, 191 passed, exit 0** (s32's 190 + Subscribe To Changes); graph scenarios unmoved |
| `nodegx-node-spec`: `npx jest` | hash refresh first (named exactly `src/spec.ts`, `src/world.ts`). With +4 REALTIME tests in `world.test.ts` and Subscribe To Changes in `batch-records.test.ts` (two seeds; the failure codes on Realtime Error beside Realtime Failure; no call while the Backend is unknown, beside the subscribe that follows): **18 suites, 814 passed, 17 skipped, exit 0**. Catalog parity first failed on four port descriptions abridged in the spec; now copied verbatim |
| export: `tests/node-spec-*` | 2 suites, 12 passed |
| `tsc --noEmit` node-spec, runtime | exit 0 · exit 0 |
| count | **104** (+1); T3 20 / 39 |
| `node scripts/node-spec/census.js` | NOT run: a peer's uncommitted viewer and export work still moves it (s30, s32), and no census number depends on specs |

### 6.40 s34 (2026-10-03) — WebSocket and Server-Sent Events; the world's SOCKET and NETWORK's streamed body

**Built.** `websocket.ts` (59 scenarios) and `sse.ts` (68 scenarios, two of them row C57). **Both conform on the runtime:**
WebSocket on its first run (28 / 28 scenarios, 200 / 200, 0 divergences), SSE after one interpreter fix (T17, below) and one
declared coercion. Both on seeds 20729, 13 and 20730, and at 10,000. **106 / 147. NSP-014: 24 of 24.**

**Read first (all four files, as the handoff asked).** Neither node touches the backend layer. Each owns its connection
class (`WebSocketConnection`, `SseConnection`), so the reconnect backoff, WebSocket's jitter and heartbeat, and SSE's
duplicate window are the NODE'S code and are graded here, on the world's clock and random stream. WebSocket reaches the
browser through the `WebSocket` constructor. SSE reaches it through `fetch` with a body that streams (its `auto` transport
is fetch whenever fetch exists — always, in a play) or through `EventSource` when asked for it.

**What the probe measured first (zz probes, deleted).** Jest's Node 22 environment HAS a real `WebSocket` (a play's socket
would have reached the network), has no `EventSource`, and has `ReadableStream` and `Response`. A `Response` built from `''`
has a body that yields no chunk; from `null`, no body; a stream errored with an `AbortError` rejects a read with it. The
real WebSocket node, played against the new face, opened, took messages, answered heartbeats and reconnected with jitter
before any spec was written.

**The world (additive; the hash refresh named exactly `src/spec.ts`, `src/world.ts`; the three stranger rounds green).**
- **SOCKET**, the 14th seam (world.ts header). Every play has the world's `WebSocket` (`worldWebSocket`) and NO
  `EventSource`. A construction is recorded as handed (`socket` trace event `{ op: 'connect', url, protocols }`, request
  group) and answered by the first fitting rule (`match.url`, `times`): a script of events on the clock — `open`, a text
  `message`, a `binary` one, an `error`, a `close` (`code` absent → 1006, `wasClean` absent → `code !== 1006`) — or `never`,
  or `throws` (a `SyntaxError` inside the constructor, recorded first). `send` and `close` are recorded as handed; a send
  while CONNECTING throws `InvalidStateError` (the browser's rule); the rule's `replies` answer a sent text (`ping` →
  `pong`) after a delay. After a `close` event, or the node's `close()`, nothing more is delivered. A construction no rule
  answers is a VIOLATION.
- **NETWORK, A STREAMED BODY.** A response may carry `chunks` instead of a `body`: the head lands at `after`, then each
  piece `at` ms after the head — text, `end`, or `error` (a dropped connection). The `fetch` face hands a `ReadableStream`
  the world feeds in UTF-8; aborting while the body is read fails it with an `AbortError`; a reader's cancel drops the rest
  silently. An XHR reading a streamed body is a script error.
- **The format.** A `socket` patch effect (ops `connect` / `send` / `close` by the spec's own socket id), a
  `WorldView.socketAnswer(url)` (a constructor that will throw is read before the connect is named, as `pickerAnswer` is),
  two handlers — `world.socket` and `world.stream` — each in the FOUR places (spec.ts `WorldHandlers` + the erased
  `AnyNodeSpec.world`, interpreter.ts `handleInbound`, mutants.ts `reducerNames` + `wrapReducers`), the need `socket` with
  its pool `sockets`, the mutation kind `drop-socket`, the trace event `socket` (trace.ts, schema.ts, the JSON schema,
  compare.ts), and `settles` entries may now name another outcome input's `port` (a Disconnect settles a Connect still
  shaking hands; the interpreter's spread already honoured it). **Canonical `$bytes`** for an `ArrayBuffer`, a typed array or
  a `DataView`, recognised by brand: a binary frame canonicalised by its own keys was `{}` for every buffer.

**T17 — the interpreter's `advance` fired every timer and only then delivered its inbox.** An answer that landed at +2
inside an `advance(2)` from +1 reached its handler at +3; the runtime target, which yields between timers (T6), read +2.
No earlier spec read the clock inside a response handler; SSE's Last Message Time does (eight scenarios differed by that one
value). world.ts CLOCK already says "what each timer delivers lands BEFORE the next one fires": the interpreter now steps the
clock timer by timer and delivers every instance's inbox after each — what s24 and s26 did for store writes and the
start-up check, done once for all. The whole runtime suite and the package suite were re-run after it (§6.42).

**A declared coercion found by a divergence.** SSE's Headers is an `object` port, and `node.ts` parses a JSON string on an
object port before the setter sees it: the runtime sent a header the spec did not. `coerce: 'object-literal'`.

**How the two specs are written.** One call into the node (a reducer, the frame end, a timer, a socket event, a stream
piece) runs on a working copy of the state (`Run`), as the runtime runs it on the node's internals, and is handed back as a
patch: the keys that moved, the signals in order, the effects in order, the Connect it settled. WebSocket's status outputs
are read at the call's end (checked path by path: nothing moves after its last flag). SSE's are recorded AT each flag
(`world.send`), because SSE flags Retry Count before it raises it and does not re-flag when the state is already
`reconnecting` — what the wire then carries is row C56.

**The survivors, and what closed them.** First runs: WebSocket 45 of 586, SSE 33 of 474. Two families were provably
silent and are declared (`equivalent-mutants.ts`):
- a URL / Protocols / Auto Connect write that changes nothing, and the frame end's flag left set (Map Collection's
  `STUCK_FLAG`): between frames a live connection always matches the URL it was opened against, and with none there is no
  URL or Auto Connect is off — every write that could change that schedules too;
- SSE only: Event Types (it reaches only the EventSource transport, which no play has), With Credentials (`credentials`
  is not on the world's request record), and a Connect that fails inside the call swapping one dead connection for another;
  WebSocket only: the refused constructor's id counter, and a blank Heartbeat Interval's NaN-for-0 on a live connection.

Everything else was killed by a hand scenario. Most were one defect class: a connection's end of life (a stream ended, a
final failure, a teardown) not kept, which shows only when a later Disconnect reports Done instead of Unchanged, or when a
reconnect does or does not go out. The generator rarely presses Disconnect right after, so the scenarios carry it.
The interpreter-side survivor count was then read at 200 on eight to ten seeds per node and at 10,000 on two: zero.

**Planted on COPIES of the runtime nodes (in memory, never the files).** Six defects, each caught at 200: WebSocket — 1008
retried, the queue flushed newest first, On Reconnect on the first open; SSE — a replayed id delivered despite Dedupe By Id,
a 429 treated as final, the unfinished last event dropped at the end.

**Reach (400 generated sequences, seeds 20729 + 13), after weighting the pools.** WebSocket: a socket made in 94, open in
19, a message in 14, a reconnect in 4 (before weighting the URLs: 41 / 9 / 7 / 1 — the string pool a wire can deliver held
no ws:// URL). SSE: a request in 108, open in 58, an event in 27, a reconnect in 10. The rest is the nodes' own churn (every
URL write rebuilds) and sequences with no URL; the scenarios pin the deep paths. At 10,000 the counts are 25× these.

### 6.41 Rows (s34)

- **C56** — Server-Sent Events: **Last Error, Retry Count and Duplicates Suppressed change without being sent.** Last
  Error is not re-sent when a retry opens (the wire keeps the old failure beside `open`); Retry Count is sent before it is
  raised and not re-sent while already `reconnecting` (the wire lags one behind); Duplicates Suppressed reaches the wire only
  at the next error. ([P107-C56](../../bugs/p107-c56-sse-three-outputs-move-without-being-sent.md))
- **C57** — Server-Sent Events: **Event Types or Method wired a value that is not text throws at Connect** (`value || …`
  kept, then `.split` / `.toUpperCase`). The spec reads both as text; the runtime's throw is a known row (`sseNonText`).
  ([P107-C57](../../bugs/p107-c57-sse-non-text-event-types-or-method-throws-at-connect.md))
- **C58** — Server-Sent Events: **a URL change with Auto Connect off tears the stream down silently, and Connected stays
  true** (Connection State is the node's field; the teardown sends nothing). WebSocket's rebuild sends every status output
  after disposing. ([P107-C58](../../bugs/p107-c58-sse-says-connected-after-a-url-change-tore-the-stream-down.md))
- WebSocket: none. Its heartbeat reply is filtered only while a heartbeat runs (documented, conn :723-727); a Disconnect of a
  connection a Send made idle reports Unchanged and still sets `closed` (documented, :518-522).

### 6.42 Gate readings (s34, 2026-10-03; load 1.6–3.2 — this session's jest only, one at a time)

| gate | reading |
|---|---|
| probes on the runtime FIRST (zz, deleted) | §6.40, before any spec was written: the host's globals; the real WebSocket node through the new face |
| runtime: WebSocket at 200, today's seed (20729) | **first run: 28 / 28, 200 / 200, 0 divergences**; 45 / 586 survivors → scenarios and 12 declared. Final: **60 / 60, 0 divergences, CONFORMS** |
| runtime: SSE at 200, today's seed | first run: 8 scenarios and 9 sequences differed — all Last Message Time (T17), then three headers (the object coercion), then the C57 throws (known). Final: **69 / 71 + 2 known (C57), 0 divergences, CONFORMS**; C57 known in 22 generated |
| runtime, seeds 13 and 20730 | **CONFORMS** both, both nodes, final scenario sets |
| runtime deep, `NSP_DEEP=10000` | WebSocket **10,000 / 10,000, 0 divergences** (903 s; one tail survivor, killed by a scenario after). SSE **10,000 / 10,000, 0 divergences** (1,438 s; C57 known 1,102; six tail survivors, killed by scenarios after). Interpreter-side survivors at 10,000 after the last scenarios: **0** for both (seeds 20729 and 13 for SSE) |
| interpreter-side survivors at 200, after the last scenario | 0 — SSE on 13, 20728, 20729, 20730, 20735, 20736; WebSocket on 13, 20728–20731 (and 20732–20740 at earlier scenario sets) |
| planted defects on copies of the runtime nodes | **6 / 6 caught** (§6.40) |
| two runtime traces read by hand | WebSocket (open, a JSON message, the heartbeat's ping answered and measured, a 1001 close reconnecting with jitter, a dead heartbeat) and SSE (open, three events, the end) — read event by event; the C56 and C58 traces (§6.41) |
| reach, 400 generated sequences | §6.40 |
| runtime: the WHOLE `test/node-spec/` | first: **192 passed, 1 failed** (412 s) — every other spec CONFORMS and the GRAPH scenarios pass after T17 and the world's WebSocket in every play; the one red was SSE's survivor the newest scenario examples exposed, killed since. **Final: 3 suites, 193 passed, exit 0** (414 s) — s33's 191 + WebSocket + SSE; every spec CONFORMS, the one DOES NOT CONFORM is AC1's planted off-by-one, as designed; GRAPH unchanged |
| `nodegx-node-spec`: `npx jest` | hash refresh first — it named exactly the five guarded files this session changed (`schema/trace.schema.json`, `src/canonical.ts`, `src/spec.ts`, `src/trace.ts`, `src/world.ts`). With +4 SOCKET and +3 STREAMED BODY tests in `world.test.ts`, +4 `$bytes` rows in `canonical.test.ts`, and both nodes in `batch-records.test.ts` (two seeds each; WebSocket's four failure codes each beside its Last Error and a no-socket scenario beside connecting ones; SSE's six Connect failures beside their Last Error, the two after-open failures on Last Error beside On Error, a no-request scenario beside requesting ones): **18 suites, 837 passed, 17 skipped, exit 0** — the three stranger rounds green |
| export: `tests/node-spec-*` | 2 suites, 12 passed |
| `tsc --noEmit` node-spec, runtime | exit 0 · exit 0 |
| count | **106** (+2); T3 22 / 39 — NSP-014 24 / 24 |
| `node scripts/node-spec/census.js` | NOT run: a peer's uncommitted viewer and export work still moves it (s30–s33); no census number depends on specs |

### 6.43 s35 (2026-10-03) — Query Records slice C: Subscribe To Changes on the node

**Read first** (`dbcollectionnode2.ts` :455-805, :1147-1210, :1320-1336): the realtime half is Subscribe To Changes' twin
(BCN-008 folded the retired node in), with four differences that matter to a trace. (1) **No filter** on the subscribe:
`{ collection, primaryKey }` only. The header at :626-648 explains that a transport which cannot filter server-side must not
filter client-side, so every change in the class fires and the re-query settles what Items holds. (2) **A change re-runs the
query** at the next frame end, under the `Record changes` box (:772-774); `init` does not. (3) **The status is not read**
after subscribing, so Realtime Status is empty until the backend tells one (row D29). (4) **Two frame-end callbacks.** The
query and the reconnect are each `scheduleAfterInputsHaveUpdated`, run in the order FIRST scheduled that frame. Writing
Subscribe To Changes before the Class (or before Do) makes the subscribe before the query, measured on the runtime trace.

**The format: `subscribeFirst`** (spec.ts `Patch`, interpreter.ts `effects`): a patch's unsubscribes and subscribe are made
before its backend calls. Additive; the hash refresh named `src/spec.ts` only; the three stranger rounds green. The mutants
know it (`drop-subscribe-first`, in the shape only when present). A spec sets it only when the patch also makes a backend
call: with nothing to order against, the first draft's three `drop-subscribe-first` survivors could not be killed.

**The spec** (`query-records.ts`): `realtime` discovered (`!!value`); the Class, the Backend and Subscribe To Changes each
schedule ONE reconnect at every write, changed or not (C55 reaches this node: the query beside it re-runs only on a change).
`afterInputs` runs `query()` and `reconnect()` and merges them in the order scheduled (signals in that order; `subscribeFirst`
when the reconnect came first). `world.realtime` is Subscribe To Changes' handler plus the re-query. The Realtime outputs read
state. The generator: `realtime` joined the candidates (about half of 400 sequences write it, three seeds). Every pool world
puts a subscribe rule FIRST, because a match-less query rule answering a subscribe is a script error (world.ts REALTIME). Five
streams (two phases of a told cycle, a refusal, a fatal heartbeat, never).

**Scenarios: 37 → 58** (21 slice C): the subscribe with no filter and an empty status; the order both ways (realtime before
the Class; Do before the Class; a held subscription re-subscribed or turned off beside a Do); a create told and the re-query;
the box unticked (create, update, a whole delete, resync, each told, nothing re-queried); init / update / key-only delete /
resync; an error, its clearing, a fatal stop; a Backend the project has not (both failures, in either order); the same Class
re-written (C55); off (the error kept); the Backend switched; no Class; a refused filter beside a quiet reconnect, then Do and
the Class (a stuck flag would reorder); a subscription that never answers, re-written twice, off and on again; the Class,
realtime and a refused filter in one frame; a subscription still connecting, torn down beside a query (good, or refused) and
opened again.

**Survivors, read one by one** (the interpreter on six seeds): the first draft left 15. They were cured by scenarios that read
the follow-up: a key a swap brought in, a flag a drop left set, an order a stale flag would flip. Two remain declared
equivalent (`equivalent-mutants.ts`, exact shapes): a frame end with no reconnect scheduled, handed the patch of its twin that
ran a quiet one, clears two flags already clear. The pair the other way round is killed.

**The first deep run did NOT conform: 10,000 / 10,000 with 0 divergences, but three mutant survivors** on branches only that
many sequences reach. Each was a teardown of a subscription STILL CONNECTING (no status held) in a frame that also queried:
a drop-set left the subscription id or the query's bookkeeping stale, and a swap brought in its twin with a status, equal but
for that status. Two scenarios close them; each turns realtime on again afterwards, so a stale id is read. One also makes a
second query first so the ids differ from the twin's (s34's lesson: a swap's sibling may EQUAL the real patch but for ids).
**A 200-sequence green does not grade a branch the 200 never reach: the deep run is where mutants of rare branches first
exist.**

### 6.44 Rows (s35)

- **D29** ✅ ruled *"Yes, say connecting"* 2026-10-03, fixed s36 (§6.46) — Query Records: **Realtime Status reads empty while connecting**. Its description and Subscribe To Changes say
  `connecting`. Proposed: read the handle's status after subscribing, as Subscribe To Changes does
  ([P107-D29](../../bugs/p107-d29-query-records-realtime-status-is-empty-while-connecting.md)).
- **C55 reaches Query Records**: a same-value write of the Class, the Backend or Subscribe To Changes reconnects. Noted in
  [P107-C55](../../bugs/p107-c55-subscribe-to-changes-a-same-value-write-reconnects.md); the same guard fixes both.

### 6.45 Gate readings (s35, 2026-10-03; load 2.3–5.5 — a peer's single P109 jest file alongside, nothing heavy)

- Query Records on the runtime: CONFORMS at seeds 20729, 13 and 20730 — 56 / 56 scenarios (58 / 58 after the deep run's two), 200 / 200 generated, 0
  divergences; mutants 1272 / 1274, 1223 / 1225, 1377 / 1379 killed (the 2 declared each run).
- Deep (seed 20729, 10,000): first run DOES NOT CONFORM — 0 divergences, three mutant survivors on branches only 10,000
  reach (above); after the two scenarios CONFORMS — 58 / 58, 10,000 / 10,000, 0 divergences, mutants 1876 / 1878 (the 2 declared).
  Seeds 13 and 20730 re-run after: 58 / 58, 0 divergences, mutants 1324 / 1326 and 1490 / 1492.
- Four defects planted in an in-memory copy of `dbcollectionnode2.ts`, all caught: the Class write not reconnecting (5
  scenarios, 3 generated), `init` re-querying (1 scenario), the teardown keeping the status (4 scenarios, 1 generated), a
  `subscribed` not clearing the error (1 scenario).
- Runtime traces printed before trusting the green: the subscribe before the query when realtime came first; the query
  before the subscribe with params in the Class-first order; Realtime Status `""` in the frame that subscribed (D29).
- Package: 18 suites, 837 passed, exit 0 (after the hash refresh); the three stranger rounds green. Whole runtime
  `test/node-spec/`: 3 suites, 193 passed, exit 0. Both `tsc --noEmit` exit 0.

### 6.46 s36 (2026-10-03) — D29 fixed: Realtime Status says `connecting` (Richard: "Yes, say connecting")

Asked in plain words with the next batch and C59 + C60. The runtime fix is Subscribe To Changes' own line, after the
subscription is made: `this.handleRealtimeStatus(this._internal.subscription.status)` (dbcollectionnode2.ts :714). It is
one added line, so every cite past :713 moved by one. All 70 in `query-records.ts` and 19 in `DbCollection2.json` were
shifted by a script and spot-checked against the file (:717 teardownRealtime, :745 handleRealtimeChange, :778
handleRealtimeStatus, :832 fetch, :1216 userInputSetter, :1228 updatePorts).

- **Query Records v2**: a subscription made sets `connecting` and sends Subscribed and Realtime Status at once. A teardown
  now has a status to clear: Realtime Status goes back to `""`. Three scenarios whose name or reason said the v1 reading
  ("stays empty until the subscription says subscribed", "nothing told, so no status to clear", "the teardown with no
  status held") now say what the trace shows. They were read from printed traces first: `connecting` at the subscribe,
  `subscribed` when told, `""` after Subscribe To Changes is turned off.

**Gate readings (load 3.2–5.6, this session's jest only).** Control: the v2 spec against the unfixed runtime (HEAD's file
copied back, then the fix restored by `cp`) gave DOES NOT CONFORM, 39 / 58 scenarios, 19 generated divergences. Treatment:
CONFORMS at seeds 20729, 13 and 20730 (58 / 58, 0 divergences; mutants 1224 / 1226, 1131 / 1133, 1224 / 1226, the 2
survivors being s35's two declared equivalents). At 10,000 / 10,000 it also conforms, with 0 divergences and mutants
1323 / 1325, the same 2 declared. s35's first deep run did NOT conform (3 survivors); this one does. Package: 18 suites, 837
passed, exit 0 (`query-records.ts` is not a guarded file; the hash gate is green). `tsc --noEmit` exit 0 for both packages.
Runtime: the whole jest suite, 183 suites, 3,210 passed, exit 0, 511 s. Its one "DOES NOT CONFORM" line is AC1's planted
Counter defect (seed 1), as it should be.
