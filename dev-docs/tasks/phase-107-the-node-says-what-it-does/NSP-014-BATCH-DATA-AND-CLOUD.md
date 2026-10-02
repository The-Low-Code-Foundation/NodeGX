# NSP-014 — Batch: records, users, files, HTTP, streams, and the cloud-only nodes

**Opened 2026-09-29.** **Depends on NSP-007** (the world's network and backend) and R4 = continue.
**Status: 🟡 s21 (2026-10-02): split (the 17 cloud-only nodes → [NSP-022](NSP-022-BATCH-CLOUD-ONLY.md)); the world's BACKEND seam built (R9: the request, not the wire); Delete Record, Add Record Relation and Remove Record Relation conform on the runtime; row C33 filed. 4 of 24 (HTTP Request s8; Delete Record, Add / Remove Record Relation s21).**

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

