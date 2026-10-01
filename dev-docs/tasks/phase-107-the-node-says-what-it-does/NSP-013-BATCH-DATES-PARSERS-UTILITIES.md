# NSP-013 — Batch: dates, time, randomness, parsers, animation

**Opened 2026-09-29.** **Depends on NSP-007** (the world) and R4 = continue.
**Status: 🟡 s11 (2026-10-01) — 12 of 24 built and conform on the runtime; the other 12 named in §6.4.**

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

### 6.2 Rows for a ruling (R3 (a): the runtime wins until ruled; each counted every run)

| row | where | what the wire shows | plain words | proposed |
|---|---|---|---|---|
| **C16** | Date Add (dateadd.ts :77-78; datemath.ts :88) | a `Unit` that is not one of the eight and not empty — a wire can carry any string — is STORED, then `addToDate` THROWS inside the setter: the node is dead from then on (every later recompute throws). Date Difference, Date Compare and Date To String take the same value without throwing | *"A Unit value Date Add does not know crashes the node in the setter instead of refusing or ignoring it."* 22 sequences counted; one scenario under the row | refuse: `Invalid Date`-style failure, or read as days (`\|\| 'days'` already handles empty) |
| **D14** | Date To String (datetostring.ts :264-273, :39-71) | with NO Timezone, `null` and a numeric timestamp on `Date` render blank with `Invalid Date` (getDate throws); WITH a Timezone the same timestamp RENDERS and `null` renders the epoch (`formatToParts` accepts anything `Number()` accepts) — one port, two validity rules | *"Whether a timestamp or a null on Date is 'invalid' depends on whether a Timezone is set."* Two scenarios record both arms | one rule: read through `toDate` as the rest of the family does (a timestamp renders in both; null is invalid in both) |
| **D15** | Date Difference (datemath.ts :98-115) | a `Unit` not in the list misses every fixed unit and lands on the month path, whose last line reads anything but `'months'` as YEARS | *"An unknown Unit on Date Difference is counted in years; the same value on Date Add throws (C16)."* One scenario | the C16 answer, applied to both |
| **T3** | the runner — compare.ts `eventKey` (NSP-003) | **two traces whose nested values differed compared EQUAL** — a Date, NaN, a registry array, a unit — from NSP-003 to NSP-012 | a hole shaped like the defect in the gate itself; fixed in s11, the 46 earlier specs re-graded green | closed by the fix; recorded so the s3–s10 readings are read with it |

### 6.3 Acceptance, measured

1. ✅ for the 12 (specced, mutants killed or declared — DateParts ×2: a cleared part is never sent so its store is
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

The other 12: **JSON Stream Parser, Pattern Extractor, Stream Buffer, Text Accumulator** (the agent parsers,
375 / 267 / 396 / 477 lines — pure T1 with outcome ports, nothing the world lacks), **Parse XML, Parse Feed**
(need the XML parser the runtime uses, read first), **Animate To Value** (the scheduler's `onRunning` with an
ease curve — Repeat's pass plus `easecurves.ts`), **States** (1191 lines, dynamic ports — a session of its own),
**Screen Resolution** and **On App Error** (each needs a seam the world does not have: a viewport with a resize
step; an error stream with a raise step). The deep run (`NSP_DEEP=10000 NSP_ONLY=…`, a quiet box). AC2. The
third stranger round (due five times over: graphs s7, the world s8, the registry s9, the tree s10, the zone and
digest s11).
