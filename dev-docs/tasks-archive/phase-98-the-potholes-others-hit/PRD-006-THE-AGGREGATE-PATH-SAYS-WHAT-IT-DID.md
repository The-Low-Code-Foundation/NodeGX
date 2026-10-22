# PRD-006 — The aggregate path is bounded, and says what it did

**Status: ✅ Built and gated, s5 (2026-09-20).** 13 specs, three mutants caught; the whole backend
suite green at 167/167. Took **PRD-D7** out of the backlog and closed the second arm PRD-001 AC7
had taken ("capped too, *or* its exemption is written down"). Prefix: `PRD`.

🔴 **§7 is the correction, and it changes which defect this task repaired.** PRD-D7 — the thing
that scoped this — is **not live on the shipped adapter**. The live defect was the one found beside
it. Read §7 before §2.

## 1. The person sentence

> **The two routes that answer with a list instead of a page are bounded like everything else, and
> a caller can tell the difference between "these are all the cities" and "these are the first ten
> thousand cities".**

## 2. What is there (read 2026-09-20, HEAD `c59d6aa3d`)

Both readings are from the artefact, not from the task file that filed them.

| | reading | where |
|---|---|---|
| ✔ | 🔴 **PRD-D7 is still live.** `$addToSet` is rewritten to `distinct` and handed to `rawAggregate`, which clamps nothing — an unbounded array inside a response PRD-001 called "one object of fixed size" | `parse-wire.ts:552`, `AdapterFacade.ts:295-301` |
| ✔ | 🔴 **The distinct cap that DID ship truncates silently.** `rawDistinct` slices at `maxLimit` and returns a bare `unknown[]`; the route answers `sendJSON(res, 200, { results })` with no header and no body flag. Its spec asserts `.length === 10` and asserts nothing about a signal | `AdapterFacade.ts:323-334`, `parse-wire.ts:534-537`, `prd-001-…test.ts:147` |
| ✔ | The rule it misses is written down two files away: *"A capped result **says so** … silent truncation turns an outage into a correctness bug, and a list that looks complete and is not is worse than an error: it is believed"* | `ops/model.ts:177` |
| ✔ | The mechanism already exists and is used by `classesGet` — `splitCapped` emits `X-NodeGX-Result-Capped` + `X-NodeGX-Result-Limit`, and `sendJSON` takes headers as its fourth argument | `http-util.ts:113,146`; `parse-wire.ts:431` |
| ✔ | Exactly **one** caller each: both in `ParseWire.aggregate`. The contract declares both members and `coverage.ts` already has an entry for each, so this task adds **no** facade member and pays **no** BRG-003 ratchet | `storage.ts:688,695`; `coverage.ts:297,302` |

🔴 **The second row is the one that matters most, and it is not PRD-D7.** PRD-D7 is an unbounded
array; the distinct path is a *bounded* array that lies about being complete. By this phase's own
rule that is the worse of the two, and it shipped inside the task that wrote the rule.

## 3. Design

### 3.1 The clamp goes where PRD-001's went, and for the same reason

Above the adapter, in `AdapterFacade`. A clamp in `QueryBuilder` would be SQLite-only and the
Postgres adapter would have to reimplement it — which is how two implementations of one rule get to
disagree. `rawDistinct` is already there; `rawAggregate` joins it.

### 3.2 🔴 Bound by the VALUE's shape, not by the accessor's name

PRD-001 §7.6 declined to clamp here because "the cap would have to reach into an accessor map".
That objection is answered by not doing it that way: the facade bounds **any array-valued entry** in
the aggregate's result object, whatever accessor produced it. `$avg`/`$sum`/`$max`/`$min` return
scalars and are untouched by construction, `$addToSet` is bounded, and an accessor nobody has
written yet is bounded the day it lands rather than the day someone remembers to add its name to a
list. It is the same argument as clamping above the adapter, one level down.

### 3.3 The ceiling, not the default

`maxLimit`, matching `rawDistinct`. An aggregate is an aggregate **by intent** — nobody asks for
distinct values expecting a page — and neither route has a `limit` parameter for a caller to raise,
so the default would be a ceiling with no way past it.

### 3.4 The signal is a header, and there is one spelling of it

Header, not a body field: the Parse wire format is shared with unchanged clients (§3.2 of PRD-001).
`splitCapped` cannot be reused as-is — it is typed for `results: Record<string, unknown>[]`, and
these two return scalars and one object — so the two header **names** move into a
`cappedHeaders(cappedAt)` helper that `splitCapped` then calls. One spelling, three routes. Adding a
second literal `'X-NodeGX-Result-Capped'` to the file would be the drift `splitCapped`'s own
docblock warns about.

### 3.5 What this does NOT claim

🔴 The clamp bounds the **response**, not the adapter's intermediate materialisation: the adapter
still builds the whole distinct set before the facade slices it. That is exactly the residual
`rawDistinct` has shipped with since s3, and it is stated here rather than left for a reader to
discover. Bounding the engine's own work means pushing a limit through `IStorageDataPlane` into
every adapter, which is a contract change and a different task.

## 4. Acceptance criteria

1. An array-valued entry in a grouped aggregate returns at most `maxLimit` values (**PRD-D7
   closed — as a guard, see §7.1**).
2. A scalar accessor (`$avg`/`$sum`/`$max`/`$min`) is returned untouched, and a bounded aggregate
   reports itself as not capped.
3. `GET /aggregate/:collection?distinct=…` that was shortened answers with
   `X-NodeGX-Result-Capped: true` and `X-NodeGX-Result-Limit: <maxLimit>`.
4. The grouped aggregate carries the same two headers when any accessor was shortened.
5. A distinct or aggregate result that **fits** carries neither header — the AC4 rule of PRD-001:
   a caller who fit is not marked.
6. Neither `capped` nor `cappedAt` appears in either response **body**.
7. There is exactly one occurrence of each header name in `src/`.

## 5. Tests

- Facade-level, against a recording adapter (the `recordingAdapter` shape PRD-001's spec uses), with
  a `TINY` cap so the numbers are readable: `$addToSet` over more values than the ceiling; a scalar
  accessor; a mixed group where one alias is bounded and another is a scalar.
- Route-level for the headers, including the negative case (AC5).
- **Mutants that must be caught:** (a) the clamp reads `defaultLimit` instead of `maxLimit`;
  (b) the aggregate slices but does not signal — the exact defect this task exists to repair;
  (c) `capped` leaks into the body.

## 6. Out of scope

- Pushing a limit into `IStorageDataPlane` so the engine stops early (§3.5).
- The other two §4 backlog items of the phase: **PRD-003 §6** (`local.db` reclamation) and
  **PRD-D6** (unscrubbed workflow step input/output). Both are blocked on a decision from Richard,
  and neither is a code change waiting on this one.
- Re-taking PRD-004's number. Nothing here touches the mixed read/write path this task's own
  throughput was measured on, and the box is not quiet.

---

## 7. What was built, and where §2 was wrong (s5, 2026-09-20)

### 7.1 🔴 PRD-D7's array does not exist on the shipped adapter

The backlog item said `$addToSet` "returns an unbounded array inside an otherwise bounded
response". It does not, here. `QueryBuilder.buildAggregate` (line 1319) emits **`COUNT(DISTINCT
col)`** for the `distinct` accessor, with the comment *"COUNT DISTINCT as alternative to
$addToSet"*, and `LocalSQLAdapter.aggregate` then reads **one row** and copies scalar columns out
of it. Every value a grouped aggregate can return today is a scalar.

**How the wrong reading happened, and it is worth naming.** The word `distinct` means two things in
the two files: in `parse-wire.ts` it is the accessor name `$addToSet` is rewritten to, and in
`QueryBuilder` it is a `COUNT`. PRD-001 §7.6 read the mapping (`addToSet` → `distinct`), saw the
`rawDistinct` route returning a list of values under the same word, and carried that meaning one
file across. It is the trap recorded as *a field that means two things breaks on a fallback* — and nothing in a
task file is a substitute for opening the file that does the work.

So **AC1's clamp is a guard, not a repair**. It is worth keeping: the natural Postgres
implementation of `$addToSet` is `array_agg`, which *does* return a set, and the clamp bounds it
above the adapter where phase 97's adapter inherits it for free. But it is **inert on SQLite
today**, and the spec file says so in its header rather than letting a green run imply otherwise.

### 7.2 🔴 The live defect was the silent one, and it shipped inside the task that banned it

`rawDistinct` has sliced at `maxLimit` since s3 and **told nobody**: it returned a bare array, and
the route answered `{ results }` with no header. A caller asking for the distinct cities of a
400,000-row table got exactly 10,000 values and no way to know there were more.

That is the failure `ops/model.ts:177` names in as many words — *"a list that looks complete and is
not is worse than an error: it is believed"* — and `BACKEND-OPERATIONS.md` was already telling
operators that **every** capped response carries the two headers. The page was not wrong about the
product's intent; it was wrong about one route, which is the sharper version of *a claim
written into a doc can grade the code it describes*. It is true now.

PRD-001's own AC7 spec is what let it through: it asserted `.length === 10` and nothing about a
signal, where every other capped path in that file asserts `capped: true` beside the count.
**Counting the rows is not checking the contract.**

### 7.3 The mutants

| mutant | caught by |
|---|---|
| the route slices but sends no header (**the s3 defect**) | HTTP AC3 (1 failed) |
| the clamp reads `defaultLimit` instead of `maxLimit` | 4 specs across both halves |
| the GROUPED branch's header line removed | §3 of the spec — and by **nothing else** |

🔴 The third is the reason the spec file has a block that stubs the facade and calls the route
directly. SQLite cannot produce an array from an aggregate (§7.1), so over real HTTP `cappedAt` is
always `undefined` on that branch and the header line is **dead code every green run walks past** —
*a gate can have a hole shaped like the defect*, with the hole in this task's own new code.

### 7.4 What it cost elsewhere — nothing

Both members already existed on `IStorageFacade` with a `coverage.ts` entry each, so the return-type
change pays **no** BRG-003 ratchet and adds no facade member. Two callers, both in
`ParseWireRoutes.aggregate`; one spec line in PRD-001's file moved to the new shape. `rawQuery`'s
coverage `why` is a bare delegation sentence even though it clamps, so these two were left the same
way rather than growing a second convention.

### 7.5 Filed, not fixed: `$addToSet` answers with a count, and the docs promise a set

Downstream of §7.1 and outside this task's ACs. The **Aggregate Records** node documents its
Distinct operation as returning a value "typed number (Min/Max/Sum/Avg) or **string** (Distinct)"
(`docs-site/docs/nodes/cloud-services/noodl-cloud-aggregate.md`), and a Parse client emitting
`$addToSet` is asking for a **set**. It gets an integer. Whether the repair is the wire (return the
set) or the vocabulary (call it `$count` and say so) is a product decision, not a clamp — filed as
**PRD-D8**.
