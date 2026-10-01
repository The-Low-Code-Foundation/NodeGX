# NSP-007 — The world: clock, randomness, network, backend

**Opened 2026-09-29.** **Depends on NSP-004.**
**Status: ✅ BUILT s8 (2026-09-30) — clock, randomness, network; the backend seam is NSP-014's. Delay, UUID and HTTP Request conform on the runtime at 200 with every mutant killed. AC1's export half is not done (§5.5).**

## 1. The person sentence

> **A node that waits, rolls dice, or talks to a server is specced as a conversation with the
> outside world, and that world is scripted — so its behaviour is as checkable as Counter's.**

## 2. What to build

A `World` the runner owns and every adapter is handed. Four parts:

| part | what the spec sees | what the test controls |
|---|---|---|
| **Clock** | `now()`, `after(ms, event)`, frame ticks | `advance(ms)`; the time zone and locale are fixed per scenario |
| **Randomness** | `random()`, `bytes(n)`, `uuid()` | the seed |
| **Network** | reducers return `request: {…}` effects; responses arrive as events | a script: *for request matching R, answer X after N ms* (or fail, or never) |
| **Backend** | the same, for records, users, files, cloud functions | a scripted backend reusing `nodegx-backend-contract`'s filter and record semantics, **not** a real server |

Reducers stay pure: an effect is a value the reducer returns (`{ request: … }`, `{ after: … }`),
and the interpreter hands it to the world. Adapters for the runtime and the export install the
same world into their own seams (fake timers, a fetch stand-in, the backend client stand-in).

Traces gain `request` and `response` events, so *what the node asked for* is compared too, not
only what it did with the answer.

**Requests are recorded at the HTTP level** — method, URL, the headers that carry meaning, and
the body — never in the NodeGX backend's own vocabulary (not "query collection X with filter F").
The record-node specs may *also* state the query in the contract's neutral filter model, but the
trace records what went over the wire. Two reasons:
- a target talking to a different backend (Supabase, PocketBase — both already declared types in
  `nodegx-backend-contract/src/backends.ts`) produces traces that can still be compared; and
- a future *import your app into a canvas* feature (README §8) would record a hand-written React
  app's network traffic and the imported graph's, and compare them. HTTP is the one language both
  speak.

Normalisation (volatile headers, generated ids, timestamps, query-parameter order) is a table in
the canonicaliser (NSP-002), not ad hoc in each scenario.

## 3. Acceptance criteria

1. **Delay** (clock), **UUID** (randomness) and **HTTP Request** (network) have specs that conform
   on the runtime and the export.
2. A scenario that advances the clock past a Delay proves the pulse lands at the right `settle`,
   and one that does not advance it proves the pulse does **not** arrive (an absence asserted
   beside a known-firing control, memory).
3. HTTP Request's trace includes the request it made (method, URL, headers it chose, body), and a
   failing response takes the *Failure* path with the outcome contract's `failed`.
4. A request event recorded from a **plain `fetch` call outside NodeGX** (a hand-written fixture)
   validates against the same schema and compares equal to HTTP Request's event for the same call
   after normalisation — proof the format is not NodeGX-specific.
5. No scenario touches the real network or the real clock (the runner fails a run that does).

## 4. Watch for

- Memory: *a frame throttle never fires in a hidden window* — `requestAnimationFrame` must come
  from the world's clock in every adapter, or the export adapter will hang headless.
- Memory: *`Timer` is one-shot; NodeGX has no ticker node.* Spec what the node does, not what its
  name suggests.
- The backend fake must not become a second backend. Use the contract's filter semantics; skip
  anything the conformance suite at `nodegx-backend-contract/conformance/` already grades.

## 5. Built — s8, 2026-09-30

### 5.1 The numbers

| node | scenarios | generated (200, seed 20726) | mutants | on |
|---|---|---|---|---|
| **Delay** (`Timer`) | 9 / 9 | 0 divergences | 32 / 32 killed | interpreter ✅ runtime ✅ |
| **UUID** (`net.noodl.UUID`) | 4 / 4 | 0 divergences | 2 / 2 killed | interpreter ✅ runtime ✅ |
| **HTTP Request** (`net.noodl.HTTP`) | 17 / 17 | 0 divergences | 115 / 115 killed | interpreter ✅ runtime ✅ |

All three conformed on the runtime on their FIRST full run once the target had the seams (§5.3). The
18 specs before them still conform (runtime node-spec suite: 3 files, 66 passed); both stranger rounds
still pass on the grown format (hashes refreshed, same commit). Deep run (10,000) not done — a quiet box
and eight minutes; nothing here depends on it.

### 5.2 What was built

**The world** — `packages/nodegx-node-spec/src/world.ts`. One `World` per play, from a `WorldScript`
(JSON on a scenario or a generated sequence: `seed`, `network` rules). Three seams, each a rule every
target shares (the file's header is the contract):

- **Clock.** Time starts at 0 and moves only on an `advance` step. Every world timer keeps Node's
  delay rule (`Number(ms)`, not 1…2³¹−1 → 1). `advance(ms)` is three moves: what the world already
  delivered lands; the clock moves, firing due timers in (due, scheduled) order with each callback
  AT its firing; what the move delivered lands. A settle is a frame AT the current time.
- **Randomness.** One mulberry32 stream behind `random()`, `bytes(n)`, `uuid()`; a target's
  `Math.random`, `crypto.getRandomValues`, `crypto.randomUUID` are the same three.
- **Network.** The world is the server: it parses no URL and refuses nothing on shape; the first
  rule whose `match` fits answers (a status + headers + body, a network error, or never), `after` ms
  on the clock or at once. A request no rule answers is a VIOLATION — answered with a network error
  so the play goes on, and the runner fails the play (AC5). The wire forms are fixed once: a request
  is `{ method, url, headers (lower-cased), body (text | { $form } | absent) }`; an answer is
  `{ status, statusText, headers (completed as a constructed Response completes them), body text }`.
- **The globals.** `installWorld(world)` swaps `setTimeout` / `clearTimeout` / `fetch` / `crypto` /
  `Math.random` / `Date.now` / `performance.now` for the world's and hands back `restore()`; `worldFetch`
  builds a real `Response` per delivery and honours `AbortSignal`.

**The format grew** (spec.ts): every reducer gets the world as its last argument (`WorldView`: `now`,
`random`, `bytes`, `uuid`); a patch may carry effects `after` (timers by tag), `cancel`, `request`
(`SpecRequest` with the spec's own `id`), `abort`; `outcome: 'pending'` — settled frames later by a
WORLD HANDLER (`extras.world = { timer, response }`), oldest pending per port first, and recorded in
the frame it is settled in; `init(world)` for state drawn at creation (UUID's first id); `examples` on
a value port (the only way `url` ever draws a URL); `worldPool` for the generator. **The trace grew**:
`advance` (stimulus, `ms`) and `request` (observation) — schema, validator, `hasObservation`. **One
sentence changed**: outcomes are recorded in the order they were REPORTED (trace.ts) — identical to
invocation order for every node before this task, and the only order a world-settled outcome can have
(a Cancel's immediate `done` before the aborted Fetch's `unchanged`).

**The interpreter** owns a `World` per instance (a default one for a spec without `needs`, which
notices nothing): effects applied after `set`; a timer's handler runs at the firing; answers queue in
an inbox delivered on `advance` (before and after the clock moves) and at `settle` (after the frame-end
reducer, until empty); `request` events recorded in the frame issued, after the outcomes.

**The runner**: no more refusal of `needs` — a refusal only for `backend` (NSP-014) and for a target
without `install`; a world per play from the scenario's / sequence's script, the same script for both
sides; a reference play that violates its own script throws (a scenario error); a target play that
violates is a failed play whatever the traces say. The generator draws `advance` steps and one network
rule per sequence for a `needs` spec, and is byte-identical for every other spec (the pinned digest
holds). Shrink carries the script and halves an `advance`; replays carry `world`. Mutants: the world
handlers are reducers (`world.timer`, `world.response`), a branch's `request` is in its shape, and
`drop-request` is a mutation. Reach: an `advance` is inside every reach.

**The adapter contract** (adapter.ts): `install?(world) → restore`, `advance?(h, ms)` (async — a
target with an event loop flushes at the two moments), `Step` gains `{ advance }`, `play` takes a
world and installs it BEFORE the mount.

**The runtime target** (`noodl-runtime/test/helpers/node-spec-target.ts`): `install` points the
platform clock at the world and installs its globals; the first half of a settle is `_doUpdate`'s
frame exactly — `currentFrameTime` from the clock, `frameStart`, **`context.update()`** (the drain,
then the TIMER PASS, which the target had never run: it called `updateDirtyNodes()` and no Delay
could ever fire), `frameEnd` — and the second half is a DRAIN (no second timer pass), so a settle is
ONE tick of the scheduler's clock, the way the spec reads it; `advance` yields, moves the clock,
yields; a request is attributed to the node whose update started the promise chain that made it
(`AsyncLocalStorage` — `fetch` is reached from `conditionalHeaders(url).then(fetch)`, a microtask
after the update); Delay (viewer source) and HTTP Request (runtime source, registered only by the
viewer's `register-nodes.js` :64-65) are registered as the viewer registers them.

**The specs**: `src/nodes/delay.ts` (the scheduler's frame pass as `afterInputs` reading `now()`;
raw JavaScript arithmetic on the raw inputs), `uuid.ts` (`init` draws the first id), `http.ts` (URL /
headers / body building as the node's own functions, the request effect with a timeout timer, the
`.then` / `.catch` chain as the response handler, `Cancel` as an abort — response mapping and
`conditional` named out, §5.5). Scenarios: `Timer.json` (9), `net.noodl.UUID.json` (4),
`net.noodl.HTTP.json` (17, each with its world script). Tests: `tests/world.test.ts` (25 — AC1–AC5
and the world's own rules), `tests/runner.test.ts` (the refusal rules).

### 5.3 What the world found — the target, then the runtime

Two holes in the runtime TARGET (not the runtime), both fixed here: **T3** the settle never ran the
scheduler's timer pass (`updateDirtyNodes()` instead of `update()`) — no clock-driven node could ever
have conformed, and no earlier spec noticed because none kept a timer; **T4** a request made from a
promise chain could not be attributed to its node by "which node is updating" — the async context can.

And the runtime rows below, none graded by any existing test.

### 5.4 The rows — for Richard to rule on (R3 (a): nothing in the runtime changed)

| row | node | what, with the line | how it is pinned | proposed answer |
|---|---|---|---|---|
| **C7** | HTTP Request | The authentication presets contribute NOTHING. `authConfigurators` read `inputs.authToken`, `inputs.authUsername` … (httpnode.ts :131-157) from `_internal.inputValues`, which the `auth-…` ports fill under their FULL names (`_storeInputValue(name)`, :421-423, :452-462) — so `bearer` never adds `Authorization`, `apiKey` never adds a header or a query parameter. The docblock at :114-118 says the prefix is "stripped by the port names themselves"; nothing strips it | scenario *Bearer authentication adds no header (C7)* — the request carries no `Authorization` on the interpreter AND the runtime; `authType` is stored beside the value ports in the spec because nothing observable reads it (a state key of its own had two ungradable mutants) | **runtime bug**: read the bag by the prefixed names (or strip the prefix when storing). A behaviour change; ships alone. Then the spec's `authContribution` reads `values['auth-…']`, `authType` gets its key back, and the scenario flips to asserting the header |
| **C8** | HTTP Request | A non-string `url` (`.match`, :1069), or a truthy non-string `headers` / `queryParams` / `bodyFields` (`.split`, :909-975), throws inside `doFetch` AFTER the tokens were drained (:1050-1051); nodecontext.ts :472 swallows it. The Fetch's outcomes are never reported — no `Failure`, no `Completed` — and nothing says why | scenario *a non-string URL loses the Fetch's outcome for good (C8)*; the spec models the loss (pending invocations never settled) | **runtime bug** (the C3 family, NSP-004): coerce with `String()` where the node reads text, or report `failure` before the throw |
| **D10** | Delay | `Stop` on a QUEUED countdown (started this frame, not yet joined) reports `unchanged` — `_isRunning` is false until the timer joins at the frame (timerscheduler.ts :181) — yet `stop()` removes it from the queue (:108-113): the countdown is cancelled and the outcome says nothing changed | scenario *Stop while queued: reports unchanged, yet the countdown is cancelled — no Started ever (D10)* | **runtime bug** (ERG-001): `done` when the stop removed a queued timer; or the description names the frame boundary |
| **D11** | HTTP Request | A body that fails to parse under `Response Type: JSON` (:1139-1150) or an `application/json` answer under Auto reaches the `.catch` (:1191-1203), whose code is `http/network-error` — "never reached a server" — for a request the server answered 200 | scenario *Response Type JSON on a body that is not JSON: … under http/network-error (D11)* | **runtime bug**: an `http/bad-body` code (a new one in `HTTP_ERROR_CODES`), message unchanged |
| **D12** | HTTP Request | ONE abort controller per node (:1073-1074), cleared on ANY completion (:1108, :1176). Two overlapping requests: when the earlier completes — an answer, a 304, an abort — `Cancel` can no longer abort the later one and reports `unchanged` with a request still in flight | scenarios *an earlier request's completion disarms Cancel for a later one (D12)* and *the same disarming by a 304 (D12)* | **runtime bug**: a controller per request (the token array at :330-337 already is per request); `Cancel` aborts every request in flight, or the latest — a decision |

Notes, not rows: UUID's failure path (no cryptographic source, uuid.ts :99-104) cannot happen under a
world and has no reducer branch; the world always has entropy. Delay's arithmetic on raw inputs (a
string Duration counts down as a number, a string Start Delay makes `start` a string that compares as
a number, a `null` Duration is `t = 1`) is modelled verbatim and pinned in a scenario — an author who
wires a string sees the number; whether that is a row is a taste question, not a defect.

### 5.5 Acceptance, honestly

| AC | reading |
|---|---|
| 1 Delay, UUID, HTTP Request conform on the runtime **and the export** | **Runtime ✅** (§5.1). **Export ✗ — not attempted.** The exporter translates Delay in one shape (a per-verb callback over a `useRef` timer, plan.ts :12611-12700), UUID as `randomUuid` on a trigger, HTTP Request in six of nine slices; each needs its own REACH found by a spike the way s6 found Counter's, and the emitted code's `setTimeout` / `fetch` / `crypto` must be reached through `installWorld` inside jsdom. A session of its own (§7) |
| 2 a clock advanced past a Delay proves the pulse lands; one not advanced proves it does not, beside a known-firing control | ✅ scenarios 1–2 of `Timer.json` and `tests/world.test.ts` AC2 — on the interpreter and the runtime |
| 3 HTTP Request's trace includes the request it made; a failing response takes the Failure path with the contract's `failed` | ✅ every HTTP scenario carries its `request` event; 404 → `http/error-status`, network error → `http/network-error`, timeout → `http/timeout`, no URL → `http/no-url` |
| 4 a request recorded from a plain `fetch` outside NodeGX validates against the schema and equals HTTP Request's event for the same call | ✅ `tests/world.test.ts` AC4: `worldFetch` on a hand-written POST → the same `request` event, byte for byte, as the node's |
| 5 no scenario touches the real network or the real clock; the runner fails a run that does | ✅ the world owns the globals for the play (`installWorld`, restored in `finally`); an unscripted request is a violation the runner fails the play on (a rogue target in the test); the clock cannot move but on `advance` |

**Not built, named:** the BACKEND seam (records, users, files, cloud functions — §2's fourth part):
the runner still refuses `needs: ['backend']`; NSP-014 builds it on the request seam at the HTTP
level. **Derived OUTPUTS** are not a shape the format has (HTTP's response mapping `out-<name>`,
Query Records' fields) — NSP-014 needs them first. `conditional` (FED-004) waits for a validator
store on the world. A `drop-after` / `drop-abort` mutant (a dropped timeout timer shows only in a
sequence that waits past it with an answer that never comes) — the runner's next hole.

### 5.6 Decisions made here

1. **A timer's handler runs at the firing, an answer's at the next flush.** A `setTimeout` callback is
   synchronous at its due time; a promise resolution is a microtask. The first design queued both to
   the next settle and a timeout tying with an answer (both due at 100) let the answer win on the
   interpreter and the timeout on the runtime. Now `after` timers call the handler inside
   `clock.advance`, answers go through the inbox — and the runtime's own order is what comes out.
2. **`advance` flushes before AND after the clock moves.** Without the second flush, a step right after
   an `advance` sees the node mid-chain (the runtime's `.then` hops interleave with the play's
   continuation) — a `Cancel` after an answer had landed found a controller the answer was about to
   clear. With it, the next step sees the node after the answer, as a person acting seconds later would.
3. **A settle is one clock tick.** The target's second frame became a drain: with two `update()` calls
   per settle a Duration-0 Delay showed `Started` and `Finished` in one settle, which the app never
   does (two animation frames). The spec reads the scheduler once per settle; so does the target.
4. **Outcomes in report order.** The one sentence of the format this task changed; identical for every
   earlier spec (measured: 18 / 18 still conform, the strangers still pass), and the only order the
   world admits.
5. **The world parses no URL.** Node's `fetch` throws on `'abc'`, a browser's resolves it against the
   page; the world is neither, so it answers whatever string it is handed. What a URL means is the
   real network's business.
6. **`authType` lives with the value ports** until C7 is ruled: a state key nothing reads is a branch
   nothing can grade (two equivalent mutants said so). The row, not the spec, carries the intent.
7. **One network rule per generated sequence.** A node's behaviour under ONE answer is what a sequence
   grades; the mix comes from the run (ten answer kinds in the default pool: 2xx, 304, 4xx, 5xx,
   bad JSON, a network error, silence).
