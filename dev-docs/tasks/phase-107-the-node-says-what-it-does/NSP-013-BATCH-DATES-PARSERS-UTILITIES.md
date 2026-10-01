# NSP-013 — Batch: dates, time, randomness, parsers, animation

**Opened 2026-09-29.** **Depends on NSP-007** (the world) and R4 = continue.
**Status: 🟡 s14 (2026-10-01) — 24 of 24 conform on the runtime (UUID and Delay are NSP-007's; s11–s14 built the other 22; On App Error by graph scenarios). AC2 (the export) and the deep run are left (§6.4).**

## 1. The person sentence

> **Nodes that depend on the time, the time zone, chance, or the shape of text people paste in
> behave the same on every target and every machine.**

## 2. The nodes (from the census)

**24**, from the census ([CENSUS.md](CENSUS.md), NSP-000, generated 2026-09-30). Regenerate the census; do not edit this list by hand.

- **T1 pure / state machine (14):** Date To String · Date Add (`net.noodl.DateAdd`) · Date Compare (`net.noodl.DateCompare`) · Date Difference (`net.noodl.DateDifference`) · Date Parts (`net.noodl.DateParts`) · Hash (`net.noodl.Hash`) · JSON Stream Parser (`net.noodl.JSONStreamParser`) · Parse CSV (`net.noodl.ParseCSV`) · Parse Feed (`net.noodl.ParseFeed`) · Parse XML (`net.noodl.ParseXML`) · Pattern Extractor (`net.noodl.PatternExtractor`) · Stream Buffer (`net.noodl.StreamBuffer`) · Text Accumulator (`net.noodl.TextAccumulator`) · To CSV (`net.noodl.ToCSV`)
- **T2 clock, randomness & environment (10):** Animate To Value (`net.noodl.animatetovalue`) · Now (`net.noodl.Now`) · Random Bytes (`net.noodl.RandomBytes`) · UUID (`net.noodl.UUID`) · On App Error · Repeat · Screen Resolution · States · Delay (`Timer`) · Unique Id

Census notes:
- **Date Add** — pure given its inputs; the zone and locale come from the world
- **Hash** — deterministic — no entropy
- **On App Error** — listens to the environment's error stream — world-fed
- **Screen Resolution** — reads the environment (window size) — world-fed
- **States** — sits in Animation; a state machine (T1 shape) with timed transitions — the clock decides the tier
- **Delay** — one-shot, not a ticker
- **Unique Id** — sits in String Manipulation but needs randomness

## 3. What is special here

- **The date family already has parity tests** (`nodegx-export/tests/date-family.test.ts`) that
  run the emitted `dateLib` beside the runtime node. Port their cases into scenarios first; they
  are the best-researched edges in the repo.
- **Time zone and locale are part of the scenario**, set by the world, never read from the
  machine. Run every date scenario in at least two zones, one with a DST change inside the range.
- **Parsers are pure but have huge input spaces.** Seed the generator with the fixtures the
  existing tests use, then add malformed input (unterminated quotes, BOM, `\r\n`, empty) as hand
  scenarios.
- **States** is a state machine (T1) with timed transitions (T2); spec the machine first, then
  the timing through the clock.

## 4. Acceptance criteria

As NSP-011 §4, plus:

5. Every date node conforms in two time zones, one crossing a DST boundary.
6. **Hash** and **Random Bytes** conform byte-for-byte under a fixed seed and are refused by the
   runner (a clear reason) if a target reads real entropy.

## 5. Watch for

- Memory: *midnight is ≥12:00 CEST in some drives* — date scenarios must never depend on when
  they run.
- Memory: *`currentState` works only if `states` is set* — States driven by a value stays in its
  first state. That is a real behaviour to spec, not a bug to work around.

## 6. Built

### 6.1 s11, 2026-10-01 — the time zone, the digest, and twelve nodes

**The number: 12 of 12 conform on the runtime at 200 generated sequences, every mutant killed or declared
(§6.3) — 58 of 147.** Date Add, Date Compare, Date Difference, Date Parts, Date To String, Now, Hash, Random
Bytes, Unique Id, Parse CSV, To CSV, Repeat (UUID and Delay, which the census lists here too, were NSP-007's).
Specs in `packages/nodegx-node-spec/src/nodes/` (date-math.ts — datemath.ts verbatim, date-add.ts,
date-compare.ts, date-difference.ts, date-parts.ts, date-to-string.ts — `_format` verbatim, now.ts, hash.ts,
random-bytes.ts, unique-id.ts, bytes.ts, csv.ts — csv.ts verbatim, parse-csv.ts, to-csv.ts, repeat.ts — the
scheduler's timer pass as Delay's spec reads it), scenarios in `scenarios/<type>.json` (103 hand cases), the
interpreter gate `tests/batch-time.test.ts`, the runtime gate `packages/noodl-runtime/test/node-spec/conformance.test.ts`
(known row C16 counted, never hidden; Repeat registered from the viewer's source in `VIEWER_NODES`).

**The world grew two seams** (`src/world.ts`, the header is the rule). **TIME ZONE**: a play runs in ONE IANA
zone, the script's `timeZone` (`UTC` when it names none), never the machine's — `installTimeZone` writes
`process.env.TZ`, which V8 re-reads on every assignment; a spec declares `needs: 'timezone'`; the generator draws a
zone per sequence from `WorldPool.timeZones` (defaults: UTC, Europe/Paris, America/New_York, Asia/Kolkata,
Pacific/Auckland — two DST zones, a half-hour offset, the date line); every date scenario file carries the same
steps in two zones, one across a DST change (AC5). **DIGEST**: `crypto.subtle.digest` is answered by the world
(`digestBytes`, Node's SHA-2, the standard's bytes) as an already-resolved promise, so a digest lands in the
microtask after the call — the same settle on every target — where the host's lands on a thread-pool completion a
frame boundary may or may not carry; a spec declares `needs: 'digest'`; `importKey` / `sign` stay the host's.
Hash is written as a frame-end reducer settling `deferred` tokens, which is where the runtime's microtask lands.

**Two traps, both in the harness, neither in a node:**

1. **The trace comparison saw no nested key** (row T3, §6.2). `compare.ts` `eventKey` was
   `JSON.stringify(e, Object.keys(e).sort())`, and a replacer ARRAY applies at every level: `{ "$date": … }`,
   `{ "$num": "NaN" }`, `{ "$array": …, "items": … }` and a unit object's `unit` all compared as `{}`. Found by
   a Date Add mutant that survived a scenario whose two traces visibly differed in a date. Fixed (a recursive
   key-sorted stringify); the 46 earlier specs and both stranger rounds re-graded green under the real
   comparison — the hole changed no verdict, but every earlier reading on an object-valued port was weaker than
   it said.
2. **Jest's `process.env` is a copy** V8 never hears about (jest-util `createProcessObject`): a write to
   `process.env.TZ` inside a test moves nothing, though the same line under `node -e` moves the zone.
   `tests/jest-env-real-process.js` (a `jest-environment-node` subclass) hands the real env over on a global
   `installTimeZone` reads first; a test file opts in with the `@jest-environment` docblock (batch-time.test.ts;
   the runtime's conformance.test.ts). The `run()` helper and both adapters install the zone per play and restore it.

**Lessons for a spec author:** a reducer's `set` names ONLY the keys it changes — a spread-everything `set` puts
every key in every branch's shape, and a `drop-set` mutant on such a branch is killed by nothing in particular (the
first probe's six survivors were all this); a value input the reducer reads must be read from `inputs`, or have a
reducer that stores it (Random Bytes read a `length` it never stored); the throw a known-row predicate matches
should be the throw's own message, because a bad value can arrive as a mount parameter with no `set` event before
it (C16's first predicate missed nine of twenty-two).

**The export gate** (`nodegx-export/tests/node-spec-graph.test.ts`) had read red since s10's commit: its "outside
in the exporter's own words" regex lagged the reason s10 added for a scenario that declares a world. One line; the
s10 handoff's "12 passed" on that gate was wrong.

### 6.1b s12, 2026-10-01 — the four agent parsers, and a scanner that never returns

**The number: 4 of 4 conform on the runtime at 200, every mutant killed or declared — 62 of 147.** JSON Stream
Parser (54 mutants), Pattern Extractor (18), Text Accumulator (81 + 1 declared), Stream Buffer (58 + 1 declared).
Specs in `packages/nodegx-node-spec/src/nodes/`: stream-parsers.ts (the runtime's helpers verbatim but for types
and ONE marked line, C17), json-stream-parser.ts, pattern-extractor.ts, text-accumulator.ts, stream-buffer.ts
(`needs: ['clock']` — the interval flush is a host `setTimeout`, one per arming). Scenarios
`scenarios/net.noodl.{JSONStreamParser,PatternExtractor,TextAccumulator,StreamBuffer}.json` (60 hand cases). Read
on five days' seeds (20727–20731, `NSP_SEED`, new in conformance.test.ts): conforms on all five, both known rows
fire on all five — but see T4 below: those five seeds are nearly one seed.

**What the source does that its words do not say** (each pinned by a scenario, none a row): every one of the four
RETAINS its input between pulses, so a second Parse / Add with no new chunk appends the same text again (the
port descriptions of Text Accumulator and Stream Buffer say so; JSON Stream Parser's Parse description says
"retained" and means the same); a Clear never clears that retained input; JSON Stream Parser's Clear does not
re-send `Parsed`, and its Max Pending give-up does not re-send `Pending Characters` or `Is Complete` (the wire keeps
the last parse's); in Single format a SECOND whole document in the same buffer is dropped with no error, and a
malformed one with an incomplete one behind it is re-reported on every Parse; Text Accumulator refuses a non-text
chunk on ARRIVAL — `Failure` pulses from the setter with no invocation behind it — and an Add after it is
`Unchanged`; Stream Buffer counts an `undefined` write as data having arrived; its `Error` is never cleared.

**C17 — a hang, and how a hang is graded.** `scanJsonValues` (stream-parsers.ts :234-241) never advances on a
stray `}` where a value should start (and, with no array framing, `]` or `,`): `scanOneValue` returns the index it
was given, `JSON.parse('')` throws, the error is pushed and `i = end` — forever, on the main thread, the errors array
growing until the process dies. Measured outside jest in a worker with a 1 s deadline: `"1}"` and `"}"` framed,
`"}"`, `","`, `"]"` unframed all hang; `{"a":1}` returns. The first runtime run of this batch spun for seven minutes
on a generated sequence before it was stopped. A target that spins cannot be graded, so the runtime conformance
test loads the runtime's OWN stream-parsers.ts through `jest.mock` with one line inserted before `i = end;` — no
progress throws `C17: scanJsonValues made no progress…` — compiled in memory (the Counter copy's technique; the
file on disk is untouched; the factory refuses to load if the anchor moves). Everything up to the hang is the
runtime's code. The spec steps over the stray character after recording the error the first pass records — the
proposed fix. KNOWN_ROWS predicate: the seam's own message. Two hand scenarios carry `row` (Stream `1}`, Single
`"a",3`).

**C6 again**: Stream Buffer's `Data` is type `*`, so a number after a `{ value, unit }` is merged into it by node.ts
(R7) — added to the known row with a hand scenario.

**T4 — the daily rotation is nearly one seed** (found reading why five seeds each gave "known: 1" with the SAME
example sequence). `sequenceSeed` (runner/random.ts) mixes `runSeed ^ (index + 1)`: day *d* index *i* is the same
sequence as day *d′* index *i′* whenever `d ^ (i+1) = d′ ^ (i′+1)`, and adjacent days differ in low bits. Measured:
day 20727 and 20728 share 192 of their 200 sequences; thirty days of PR-CI (6,000 plays) reach **429** distinct
sequences. Fixed in its own commit: `sequenceSeed` mixes the run seed on its own before the index joins it
(murmur3's finaliser twice) — thirty days are 6,000 distinct sequences and adjacent days share none (pinned in
tests/runner.test.ts; the seed-1 digest re-pinned). **What a real rotation found at once**, every item hidden by
T4 since NSP-003:

- **Ten mutants were killed by luck, not by a scenario** — the frozen corpus happened to contain the one
  sequence that told them apart: Clear Array's, Remove Object From Array's (twice) and Insert Object Into Array's
  consumed presses (the reset only shows at the NEXT settle), the Object node's write-then-write-back in one frame, its
  unbind-then-write, its Id stored with binding off, Set Object Properties' consumed re-resolve, Date Compare's
  readable-then-unreadable Date, and String Mapper's null on a numbered port (a `swap-branch` replays the FIRST
  recorded patch of that shape — the file's first scenario's `{ 0: 'A' }`). Each now has a hand scenario; one
  more (Clear Array's two failure branches, the same constant sentence) is declared equivalent. Found by
  sweeping: the runtime suite on 13 seeds, then every spec's mutants on the interpreter over 20 more (mutants are
  interpreter-side — the cheap way to look).
- **Row C6 reaches three more nodes**: Object (a held `prop-…` value, written when a Fetch binds), Variable
  (`Value`) and HTTP Request (`Headers` — the Fetch sends no request); known rows plus hand scenarios. The Object
  one was reduced step by step from generated seed 4128598514 — three guesses at it (a `set` step, a bound
  record, no Fetch) did not reproduce. C6 is node.ts's, on every port of every node, so the runtime test also
  counts it on ANY port (`C6_ANY_PORT`, never asserted to fire) — otherwise each day's rotation could find it on a
  port nobody listed and read red.
- **The "known rows still fire" rule was calibrated on the frozen corpus.** It demanded every row fire in the
  GENERATED sequences of every run; a rare row (Value Changed's C6: 0, 2, 1 on three seeds) reads 0 on some days.
  Now per row: its hand scenario reproduces OR the generated sequences hit it.
- **A second-batch spec was incomplete.** The Object node's `Id` reducer wrote a plain object's fields with
  `Model.create` and wrote NO reaction beside it — but when the object names the record the node is already
  bound to, that write lands on the node's own record and the runtime's listener pulses `Changed` for each key
  that differs (modelnode2.ts :107-116; model.ts `set` notifies on `!==`). Reduced from generated seed 1104497702
  (run seed 24680) to two steps. Object spec → **version 2**, two scenarios (the reaction, and the Id stored
  beside it while Id changes are unticked).
- **A first-batch spec was wrong.** Boolean To String's s4 spec dropped the runtime's same-value guard on both
  strings (booleantostring.ts :43, :57) as "the wire dedups" — it does not on a frame that has sent nothing yet:
  `String for false = ''` at mount equals the held `''` and sends nothing, so a Selector picking an unset String
  for true in that frame leaves the wire empty where the spec said `''` (generated seed 799069363 on run seed 31).
  The spec carries the guard and is **version 2**; one scenario pins it. Its file is stranger-guarded: hashes
  refreshed, and round 2's target — which implemented v1 faithfully, the thesis working as intended — was
  re-handed the v2 spec alone (round 2b, `stranger-2/REPORT.md`): a fresh agent, reading only the format files,
  the spec, the scenarios and its own code, found the change by comparing handlers, added the guard, and both
  rounds read green (`npx jest tests/stranger.test.ts`: 29 passed, 12 skipped, exit 0). Its notes: the version
  line cited runtime line numbers a stranger may not read (rewritten as a plain-words rule — the format's own
  NSP-006 §5 authoring rule, broken by s12 and caught by the stranger); `===` leaves NaN-twice and
  undefined-after-'' unscenarioed; the PORT DESCRIPTIONS (the catalog's) still do not say a repeated value is
  ignored — NSP-018's, when descriptions come from the spec.
- **T5 — plays leaked the last frame's time.** `context.currentFrameTime` outlived the play that ran the frame,
  so a Repeat started before a play's first settle read the PREVIOUS play's time and ticked early or late: three
  "divergences" on seeds 20800 and 1 that vanished when the same sequence was played on a fresh target. The
  runtime target's `install` now sets it to 0, what a fresh context holds (nodecontext.ts :257). Not a runtime
  defect — the app has one context and one clock.
- **T6 — the runtime target's clock fired every due timer in one synchronous sweep.** An HTTP answer due at +100
  and its timeout due at +30000, crossed by one `advance`, fired back to back; the answer's `.then` chain never
  ran and the timeout aborted it ("Request timed out" where the interpreter read the body). Reproduced on a fresh
  target, so not isolation. An event loop runs microtasks between timers: `Clock.nextDue()` (world.ts, the CLOCK
  rule now says so) and the runtime target's `advance` steps timer by timer, yielding between.
- **T7 — no teardown in the runtime target ever finished.** The stand-in graph `model` the target hands a node
  (NSP-012) had no `removeListenersWithRef`, which `_onNodeDeleted` calls on its FIRST line (node.ts :1312), so
  every dispose threw there, `dispose` swallowed it, and no delete listener ever ran — Delay's and Repeat's timers
  stayed in the scheduler (a probe counted ~200 plays per run starting with a previous play's timers) and a
  disposed node still in the dirty list ran in the next play's first frame (Filter Collection, seed 73757, minted
  other ids; it vanished on a fresh target). The stand-in has the method now, and dispose also empties the
  context's dirty list, after-update callbacks and the scheduler's queues: a finished play's work is not the
  next play's.
- **T8 — the host stole world draws.** With teardowns finishing, a Filter Collection sequence failed on its FIRST
  play on a fresh target and passed on the second and third, with a different id every run. A `Math.random`
  trace named the caller: an array port given the literal `x` evals it, throws, and node.ts :456 `console.log`s the
  error; jest formats a logged Error through `source-map`, whose quick-sort calls `Math.random` — the WORLD's during
  a play — once per process while the map cache is cold. The runtime target now routes the console to a sink for
  the length of a world play (what the runtime prints is not in the trace).

**Readings after the fixes** (2026-10-01): see the commit message — the sweep is the last thing run before it.

### 6.1c s13, 2026-10-01 — Parse XML and Parse Feed: a spec whose grammar is a library's

**Built:** `src/nodes/xml.ts` and `src/nodes/feed.ts` (the runtime's `xml.ts` from :55 and `feed.ts` from :40,
verbatim, each under a header that states the rules with line cites), `parse-xml.ts`, `parse-feed.ts`, 13 + 14
hand scenarios. **Both CONFORM on the runtime on their first run at 200** (seed 20727: Parse XML 13/13, 200/200,
15/16 mutants + 1 declared; Parse Feed 14/14, 200/200, 12/13 + 1 declared) → **64 of 147**.

1. **The tree is a library's, and the spec says so.** XML's object shape is `fast-xml-parser` 4.5.7's under the
   runtime's options (FED-001's ruling). The spec imports the same library — `@nodegx/node-spec` now has its first
   runtime dependency (`fast-xml-parser ^4.5.7`, the runtime's range; already hoisted, so the lockfile moves by
   one entry). The honest size of the spec: the node's own behaviour is the guards (empty, size, entity and
   DOCTYPE-subset refusals before a byte reaches the parser), the codes, the abstain and the frame; the tree is
   the library's, and a stranger's target in another language owes the same tree — the scenarios pin attributes,
   `#text`, CDATA, namespaces, entities and Always Array so it can see what that means.
2. **Parse Feed is not T1 — it needs the world's ZONE.** The census calls it pure; `toISODate` is `Date.parse`,
   which reads a zoneless date in the process's zone. `needs: ['registry', 'random', 'timezone']`; the zone arms
   are row D16.
3. **Its items are NAMED records** (each carries `id`, and `Collection.set` → `Model.create` keys by it), so the
   registry seam was already the right model — the spec's `collection.set` reproduced the runtime's duplicate-id
   collapse (D18) without a line written for it.
4. The idle branch's stuck-flag `drop-set` is declared equivalent for both, as Parse CSV's.

Rows: C18, D16, D17, D18 (§6.2), each in the bug ledger.

### 6.1d s13, 2026-10-01 — Animate To Value: the scheduler's timer, frame by frame

**Built:** `src/nodes/ease-curves.ts` (the viewer's `easecurves.ts` verbatim), `animate-to-value.ts` (the
scheduler's bookkeeping for the one timer in state — queued, running, the raw `_start` — as Repeat's spec keeps
it; the frame-end reducer runs the jump's callback and then `runTimers(now)`), 15 hand scenarios; the runtime
target registers the viewer's node (`VIEWER_NODES`). **Conforms on the runtime on its first run at 200**
(seed 20727: 14/15 scenarios + 1 under C19, 200/200 sequences, 10 attributed to C19, 25/25 mutants) and on five
more seeds (3, 77, 20728, 20729, 99991 — every divergence C19); interpreter mutant sweep, 20 seeds × the three
s13 specs: no survivors. → **65 of 147**.

1. **Every input is stored RAW on the timer**, and the scheduler does JS arithmetic on them: a text Duration
   works (`'100' > 0`, `'100' * 1`), a text Delay does not (`now + '100'` concatenates — C20), an undefined
   Delay is a NaN start no frame reaches (C20). The spec does the same arithmetic on the same raw values.
2. **The join reads t = 0, so a run only moves on a LATER frame** — Duration 0 included (GAM-008's R-zero, now a
   scenario on both sides).
3. **C19 is app-wide, measured, not reasoned.** A throwaway probe (real Animate ×2 + Repeat in one corpus
   graph, deleted after): with one curve `bounce` or `''`, 31 of 31 frames threw; the other Animate froze at 0
   (bad one queued first) or reached 100 and never fired At Target Value (queued second); Repeat ticked 0 times
   against 9 in the control (both curves good: 0 throws, At Target ×1). `runTimers` reassigns `runningTimers`
   and joins `newTimers` only after its loop, so one throw holds every timer where it is. `''`, `null` and
   `undefined` throw too — what an emptied or disconnected wire carries. The same lookup (`EaseCurves[value]`)
   is in Transition (:175) and Animation (:286), both under `nodes-deprecated/` and still loaded by old projects
   (a grep, NOT measured); easecurves.ts :28-31 also names Number Blend, which has no such line; States' is
   commented out (states.ts :821).

### 6.1e s13, 2026-10-01 — On App Error: graded by the nodes that raise, not by a seam

The census calls it T2 "world-fed"; its input is the errors OTHER nodes raise on `context.errorBus`. Rather than
give the world an error-stream seam with a raise step (a format change, and a stand-in for a raiser), its
scenarios mount REAL raisers beside it — Parse XML and Parse CSV, whose failures raise `parse-xml/parse-failed`
and `parse-csv/parse-failed` — as the T4 nodes were graded (NSP-012 s10): `scenarios/graph/t07-on-app-error.json`,
four `N` scenarios, 35 claims written from its port sentences and docblock BEFORE recording (no filter catches
all, values set and Error pulsed once, a second instance fires too; Filter is a code prefix — `parse-csv`,
the full code, `parse`; null clears it, a later error replaces the values; declared after the raiser it still
hears the first frame's error). **All four bear their claims out on the runtime** → 66 of 147 (T2 8/11). No row.

1. **The runtime target mounted graph nodes as `<type>#<n>`**, so "Node Id: the graph id of the node that
   raised the error" could not be what a scenario names — the first record failed exactly the four Node Id
   claims, read as the harness before as a finding. `mountGraph` now mounts each node under its scenario id
   (what a loaded app does with a project id; a still-mounted id throws); the 42 earlier graph recordings did
   not move.
2. The export's graph harness emits from reducer specs; a graph-graded node has none, so a scenario with one is
   `outside` with a reason naming the HARNESS's limit (`node-spec-graph.test.ts` admits that reason, commented).
   `tests/graph.test.ts` gates it named-by-an-`N`-scenario (`GRAPH_GRADED`).

### 6.1f s13, 2026-10-01 — Screen Resolution, and the world's sixth seam: a VIEWPORT

**The seam** (world.ts header, VIEWPORT): a play either HAS a browser viewport — `WorldScript.viewport =
{ width, height, resizes: [{ at, width, height }] }` — or has NONE, which is a server render (no `window`, the
node's `typeof window === 'undefined'` branch). The size changes only at the scripted resizes, each a world
TIMER on the clock; the size moves, then every `resize` listener runs in subscription order, inside the
`advance` that reaches it. Format (`spec.ts`, guarded): `WorldView.viewport()`, `listen` / `unlisten('resize')`,
`WorldHandlers.resize`, `needs: 'viewport'`, `WorldPool.viewports` (defaults: none, a still desktop, a phone
rotated, a window dragged to 0 height and 0 × 0). Interpreter: a resize is delivered like a timer, at its
firing. Runtime target: `installWorld` defines a fake `window` (`innerWidth` / `innerHeight`,
`add/removeEventListener('resize')`) only when the script has a viewport, and removes it after the play.
Generator: a node with NO input port could only ever draw `settle` — never `advance` — so its sequences could
not reach a resize; such a node now draws settle or advance, and every spec with a port draws exactly the
sequence it drew before. Hashes refreshed (`spec.ts` only); both stranger rounds re-graded green.

**The node:** `screen-resolution.ts` (init reads the viewport and listens; the resize handler re-reads and sends
all three), 5 hand scenarios. **Conforms on the runtime on its first run at 200** (seed 20727: 5/5, 200/200) and on
seeds 3, 77, 20728, 99991 → **67 of 147** (T2 9/11). Mutants 1/1 — thin by construction: the node is an `init`
(not mutated) and one handler; the no-window, still-window and resize scenarios grade `init`'s two branches.
What the scenarios pin: a server render sends NO Width or Height but DOES send Aspect Ratio — `undefined /
undefined` is NaN, which is a value; a window of height 0 is Aspect Ratio Infinity, 0 × 0 is NaN. Not rows: the
description does not promise otherwise. No row.

### 6.1g s14, 2026-10-01 — States: the machine, then its run on the scheduler

**Built:** `src/nodes/states.ts` (the machine — the queue, the first move that jumps, every later move,
the refusals — then the one timer as Animate To Value's spec keeps it: queued, running, `onStart` once a
run, `onRunning(t)`, `onFinish`), `bezier-easing.ts` (bezier-easing 1.1.1, the version the viewer pins —
copied as ease-curves.ts is, because a target owes the same numbers: a single-precision sample table),
`nearest-name.ts` (diagnostics.ts's, for the Error sentence), 20 hand scenarios; the runtime target
registers the viewer's node. **Conforms on the runtime at 200** (seed 20727: 19/20 scenarios + 1 under
C21, 200/200 sequences, 5 attributed to C21) and on seeds 3, 77, 20728, 20729, 99991 (C21 6–11 a run, C6 0–2) → **68 of 147** (T2 10/11).

1. **The format grew two things, both for the first node that needed them** (NSP-001; spec.ts guarded,
   hashes refreshed, all three stranger rounds re-graded green): a derived input may be a SIGNAL —
   `{ type: 'signal', outcome? }`, pulsed with `signal()`, reaching `derived.signal` (States' `To
   <state>`, one per state named and any `to-<name>` on first write); and `pulses`, one ordered list of
   declared and derived pulses (`State Changed` then `Has Reached <state>`, per state a frame passes
   through — `emitDerived` always queued first and could not say it). The generator pulses derived
   signals only for a spec that declares one (every other spec draws what it drew; the pinned digest
   holds); the mutants wrap `derived.signal` and read `pulses` into a branch's shape. The runtime target
   asks the spec's declaration whether a port the type's metadata does not list is a signal.
2. **The runtime target now has the styles the viewer always gives the context** — a project with no
   colour styles: `resolveColor` is the identity (styles.ts :122-127). Without it every colour transition
   threw `context.styles` in the timer pass, which would have stopped every timer (C19's mechanism).
   node.ts :431 resolves every `color` input through it too; the identity changes nothing Color or Color
   Blend read. Named palette colours are NOT graded; `var(--token)` reads only its own fallback (a play has
   no document).
3. **A frame end that writes one output three times leaves the wire on the last DEFINED one** — the first
   run diverged twice on exactly that (0, then false, then `undefined`: the runtime's wire said false, a
   read at the end said nothing). The spec sends every output where the runtime flags it (`world.send` at
   each `flagOutputDirty` site), as Boolean To String's `send` (NSP-011).
4. **Rows (§6.2): C21, C22, D19**, each measured on the runtime from its own trace, each in the bug
   ledger. C21 is the only one the spec cannot write: an invocation the runtime never answers.
5. Mutants: 3986 at seed 20727, 3613 at seed 13; the frame end's `drop-set` is declared equivalent for the
   whole reducer (equivalent-mutants.ts — the frame's sends stand without its `set`, so only a NEXT settle
   shows it, and which branch ends a sequence moves with the seed), as Model2's.
6. **Not graded:** the `values` setter's refusal of a reserved name (it raises on the error channel and
   registers nothing — no trace event), `states/unreadable-color` (reported only where `CSS.supports` can
   be asked), palette colours, the editor's `updatePorts` and its rename hints (NSP-020's), a States node
   in a graph (a wire into `To <state>` — the format allows it; no graph scenario yet).

### 6.2 Rows for a ruling (R3 (a): the runtime wins until ruled; each counted every run)

| row | where | what the wire shows | plain words | proposed |
|---|---|---|---|---|
| **C16** | Date Add (dateadd.ts :77-78; datemath.ts :88) | a `Unit` that is not one of the eight and not empty — a wire can carry any string — is STORED, then `addToDate` THROWS inside the setter: the node is dead from then on (every later recompute throws). Date Difference, Date Compare and Date To String take the same value without throwing | *"A Unit value Date Add does not know crashes the node in the setter instead of refusing or ignoring it."* 22 sequences counted; one scenario under the row | refuse: `Invalid Date`-style failure, or read as days (`\|\| 'days'` already handles empty) |
| **D14** | Date To String (datetostring.ts :264-273, :39-71) | with NO Timezone, `null` and a numeric timestamp on `Date` render blank with `Invalid Date` (getDate throws); WITH a Timezone the same timestamp RENDERS and `null` renders the epoch (`formatToParts` accepts anything `Number()` accepts) — one port, two validity rules | *"Whether a timestamp or a null on Date is 'invalid' depends on whether a Timezone is set."* Two scenarios record both arms | one rule: read through `toDate` as the rest of the family does (a timestamp renders in both; null is invalid in both) |
| **D15** | Date Difference (datemath.ts :98-115) | a `Unit` not in the list misses every fixed unit and lands on the month path, whose last line reads anything but `'months'` as YEARS | *"An unknown Unit on Date Difference is counted in years; the same value on Date Add throws (C16)."* One scenario | the C16 answer, applied to both |
| **C17** | JSON Stream Parser (stream-parsers.ts :234-241 `scanJsonValues`; json-stream-parser.ts :287-300) | Stream or Single format, a stray `}` (Single: also `]`, `,`) where a value should start: the scanner records `Could not parse JSON value: Unexpected end of JSON input` and does not advance — an infinite loop on the main thread, memory growing until the process dies. Any format that is none of the three reads as Stream and hangs too | *"One stray `}` from an agent stream freezes the whole app, for good."* Graded through a seam that throws where the runtime loops (§6.1b); two scenarios and the generated sequences counted | step over the character after recording the error once — `i = end > i ? end : i + 1` (the spec's line) |
| **C18** | Parse XML (parsexml.ts :108, :191-192, :202-205) | a truthy non-string on `Always Array` (a number, `true`, an array a wire carries) is stored by `value \|\| ''`, and `.split(',')` THROWS in the frame-end callback — after `scheduled` was cleared, so the node is not dead: every parse while the value stands sends NOTHING, not `Failure`, not `Error`; the scheduler logs a `TypeError` | *"Put anything but text on Always Array and Parse XML goes quiet — no result and no failure — until text arrives there."* One scenario; the spec writes the silence | `String(value)` in the setter, or refuse it through the Failure contract with an `xml/…` code |
| **D16** | Parse Feed (feed.ts :190-202 `toISODate`) | a date with no offset (`2026-09-15T08:00:00`, `2026-09-15 08:00:00`) is read in the PROCESS's zone — 08:00Z in a UTC cloud function, 06:00Z in a browser in Paris, for one feed; a named zone `Date.parse` declines (`CEST`, `BST`) is rewritten to ` UTC` and published hours wrong, where the module's own sentence says *"a feed whose date it cannot read gets null rather than a guess"*. Its example of a declined zone, `EST`, is one V8 reads correctly | *"The same feed gets different Published times depending on where it was parsed, and a CEST or BST date is published one or two hours wrong instead of being left empty."* Three scenarios, three zones | read a zoneless date as UTC (one answer everywhere); a named zone not in V8's list → `null`, as the sentence promises |
| **D17** | Parse Feed (parsefeed.ts :269, :273-284) | `Feed Updated` is `\|\| undefined` and is flagged — an undefined is never sent, so after a feed that said when it changed, a feed that does not leaves the OLD date on the wire; the description says *"empty when it did not say"* and every other Feed output falls back to `''` | *"Feed Updated keeps the previous feed's date when the next feed has none."* One scenario | `\|\| ''`, as its five siblings |
| **D18** | Parse Feed (parsefeed.ts :257-263; model.ts :243-252) | every item carries an `id`, so `collection.set` makes each a NAMED record: two items with one id in a feed are one record — `Items` holds it ONCE with the LATER item's fields, while `Count` (`items.length`) says two. The same id is also the same record app-wide (an Object node with that id, another Parse Feed) — by design for FED-002's store-once, but nothing on the node says the records are shared | *"A feed that repeats a guid shows Count 2 and one item, and the item is the second one."* One scenario | `Count` = what `Items` holds; say on `Items` that an item IS the record of that id |
| **C19** | Animate To Value (animate-to-value.ts :226, :108; timerscheduler.ts :116-198; nodecontext.ts :500-503) | an Easing Curve the set does not have — `''`, `null`, `undefined`, unknown text — is stored as `undefined`; the run's first curve call throws `this.ease is not a function` inside the scheduler's timer pass, uncaught, EVERY frame from then on; the loop dies before `runningTimers` is reassigned and before `newTimers` join, so every timer in the app stops where it is — other animations freeze or never fire their end signal, Repeat never ticks | *"One Animate To Value with an empty or unknown Easing Curve stops every animation and every Repeat in the app, for good."* Measured app-wide (§6.1d); one scenario + 10 generated per run counted | fall back to Ease Out on an unknown name (one line); separately, catch a timer's throw in `runTimers` so one node cannot stop the others |
| **C20** | Animate To Value (animate-to-value.ts :208; timerscheduler.ts :180, :185) | `Delay` is stored raw and added to the frame time with a JS `+`: text (`'100'`) CONCATENATES — at time 1000 the run starts at 1000100 (16 minutes); after an hour, weeks — and `undefined` gives a NaN start no frame reaches, so the value does not move and At Target Value does not fire until a number reaches Delay and a new target restarts the run | *"A Delay that arrives as text, or is disconnected, makes the move wait forever."* Two scenarios | `Number(value) \|\| 0` in the setter (one line) |
| **C21** | States (states.ts :811; bezier-easing 1.1.1 :63-79; node.ts :743-746) | a transition that is not a curve — `{ dur }` with no `curve`, `"easeOut"`, `true`, `{}`, an x outside [0, 1] — throws `BezierEasing` inside the frame-end callback: the queue is already spliced, so the move and every later request of the frame are lost; State does not change and NO outcome is reported (no Done, Failure or Completed); values earlier in the list have already taken the new state's text and true/false. Measured: after `to-B` nothing moves and the next `to-A` reads Unchanged | *"A transition setting that isn't a curve makes every move into that state silently do nothing — no Done, no Failure."* One scenario; 5 of 200 generated (seed 20727) counted. Reached by an agent writing parameters (MCP) or a `*` wire; the curve editor always writes a curve | read a refused transition as the state's Default (or a 0 ms jump — the spec writes the jump), checked before `BezierEasing`; report it once on the node |
| **C22** | States (states.ts :824-829, :196-258) | the timer is started — and so stopped — only when a move animates something. A move that sets every value at once (Use Transitions off, all curves 0 ms) leaves a run still going: it keeps writing the PREVIOUS state's targets and lands on them, and Has Reached fires for the new state twice. Measured: 0 in A, 100 in B, at 50 ms Use Transitions off + To A → x reads 50, 70, 100 and stays at B's value in A | *"Switch transitions off (or go to a state with 0 ms curves) while a move is running, and the value ends on the old state's value."* One scenario; the spec writes it (R3 (a)) | stop the timer at the start of every move, as `jumpToState` does (:586) |
| **D19** | States (states.ts :592, :787) | the FIRST move reads `value \|\| 0` whatever the type: a text value the starting state leaves empty is the number 0 (a Text shows "0"), a false is 0. Later moves read the type, but a text a state leaves empty is `undefined` — never sent — so after A → B → A the wire keeps B's text | *"A States text value shows 0 when the node starts, and after a round trip keeps the other state's text."* One scenario; the spec writes it | one empty value per type in both paths (`''`, `false`, 0) |
| **T3** | the runner — compare.ts `eventKey` (NSP-003) | **two traces whose nested values differed compared EQUAL** — a Date, NaN, a registry array, a unit — from NSP-003 to NSP-012 | a hole shaped like the defect in the gate itself; fixed in s11, the 46 earlier specs re-graded green | closed by the fix; recorded so the s3–s10 readings are read with it |

### 6.3 Acceptance, measured

1. ✅ for the 16 — s12's four: conform on the runtime at 200 on five seeds (20727–20731), every mutant killed or declared (Text Accumulator and Stream Buffer: a Clear with nothing to clear writes values every key already holds). ✅ for the 12 (specced, mutants killed or declared — DateParts ×2: a cleared part is never sent so its store is
   unobservable; ParseCSV / ToCSV: the stuck-flag shape — conform on the runtime at 200: `NSP_ONLY=… npx jest
   test/node-spec/conformance.test.ts`, 2026-10-01).
2. ✗ not run: no node here has an export reach (NSP-005 declares one per node after a spike).
3. ✅ every divergence is a row with a hand scenario under it (`row`), a `KNOWN_ROWS` predicate and a proposed
   answer; no runtime change rides here.
4. ⏳ NSP-009's ledger is not built; README §6 says the number by hand.
5. ✅ every date node's scenario file carries the same steps in two zones with a DST change in at least one arm
   (UTC + Europe/Paris, America/New_York, Asia/Kolkata or Pacific/Auckland); the generator draws a zone per
   sequence; `tests/batch-time.test.ts` AC5 asserts the two answers and the restore.
6. ✅ Hash: SHA-256("abc") is the FIPS 180-4 vector on every target, base64url the same bytes; Random Bytes: the
   first New is the hex of the world stream's first 32 bytes, a failed encoding still consumed its draw; a target with
   no `install()` is refused for a `random` / `digest` / `timezone` spec with the reason (conformance.ts step 0) —
   never graded against real entropy.

### 6.4 Not done, named

Every node is specced (States s14's, §6.1g). Left: the deep run for s11–s14 (`NSP_DEEP=10000 NSP_ONLY=…`, a
quiet box). AC2 (no node here has an export reach). States' ungraded corners (§6.1g item 6) — a graph scenario
with a wire into `To <state>` is the cheapest next. The third stranger round is s13's — five world nodes,
NSP-006 §5.7; round 4 (digest, zone, registry, graph) is named there; States would test the derived-signal
sentence.
