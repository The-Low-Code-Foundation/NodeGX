# NSP-014 — Batch: records, users, files, HTTP, streams, and the cloud-only nodes

**Opened 2026-09-29.** **Depends on NSP-007** (the world's network and backend) and R4 = continue.
**Status: 🟡 s26 (2026-10-02): User and Set User Properties conform on the runtime — the world's AUTH seam (§6.16); rows C45–C49, D23. 11 of 24.** s25: Filter Records (9 of 24). s24: Query Records slice B. **s23 (2026-10-02): Record (`DbModel2`) and Query Records (`DbCollection2`, slice A — the query) conform on the runtime, first run and at 10,000; `fetch` and `query` joined the BACKEND seam; rows C37, C38, C39, D22. 8 of 24.** s22: Create Record and Update Record conform on the runtime (the world's BACKEND grew a failure's `detail` and the signed-in USER); the deep run found row C36 in s21's Delete Record; rows C34–C36 filed. 6 of 24 at s22 (HTTP Request s8; Delete Record, Add / Remove Record Relation s21; Create / Update Record s22). s21: split (the 17 cloud-only nodes → [NSP-022](NSP-022-BATCH-CLOUD-ONLY.md)); the world's BACKEND seam built (R9: the request, not the wire).

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
