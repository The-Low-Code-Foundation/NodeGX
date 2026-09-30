# NSP-003 — The runner: scenarios, generated sequences, shrinking, mutants

**Opened 2026-09-29.** **Depends on NSP-002.** Needs **R5** (CI budget).
**Status: ✅ built s2 (2026-09-30) — §5.**

## 1. The person sentence

> **Point the runner at a node and a target, and it either says "conforms" with how hard it
> looked, or hands back the shortest sequence of inputs that shows the difference — as a file you
> can replay.**

## 2. What to build

### 2.1 Scenarios

Hand-written, JSON, beside each spec: a name, the parameters, the steps, and (optionally) the
expected trace. Where there is no expected trace, the **spec interpreter is the expectation**.
Hand scenarios exist for the cases a person thinks of: the edges named in the runtime's own
docblocks (Counter's *Reset when already at Start Value*), and every divergence ever found.

### 2.2 Generated sequences

A small, in-house, seeded generator (mulberry32 or similar; README §9 says why not `fast-check`
yet): from a spec's declared ports and types it generates parameter sets and step sequences —
writes of in-range values, boundary values (`0`, `-1`, `""`, `null`, `undefined`, `NaN`, very
large), and signal pulses — interleaved with `settle`. Each run prints its seed.

### 2.3 Shrinking

On a mismatch, shrink: drop steps, then simplify values, re-running both sides each time, until
nothing smaller still fails. Write the result as a **replay scenario file** named after the node
and seed, and print the first differing trace line side by side.

### 2.4 Mutants

Follows `nodegx-backend-contract/conformance/mutants.ts`. For each spec, the runner generates
**one mutant per reducer branch** (swap the branch, drop an `emit`, change an `outcome`) and
requires the generated suite to catch every one against the spec interpreter. A mutant that
survives means that node's suite has a hole shaped like the defect, and the node **does not count**
as specced.

### 2.5 The report

Framework-neutral, like BRG-003: `runConformance(spec, adapter, options) → Report`. Jest wraps it;
the ledger (NSP-009) reads it.

## 3. Acceptance criteria

1. A planted divergence in a **copy** of the runtime's Counter (never the real file — memory:
   `git checkout --` kills a peer's edit; `cp` before mutating) is caught within the R5 budget, and
   shrinks to a sequence of **≤ 4 steps**.
2. The same seed gives the same sequences on two machines (the seed is the only input).
3. Every mutant of the Counter spec is killed; the report lists them by branch.
4. A scenario whose reference trace is **empty** is refused by the runner (an arm with no
   predicate grades nothing).
5. PR-CI mode stays within R5's budget; the run time per node is printed.

## 4. Watch for

- **Don't generate what the runtime cannot receive.** An editor-typed Number port never receives
  an object from a person, but it can from a wire. Generate from what a *wire* can deliver; say so
  in the generator's docblock.
- **Timing-dependent nodes (T2)** are out until NSP-007 gives the runner a fake clock. Refuse them
  with a clear reason rather than running them flaky.
- Shrinking re-runs targets many times; keep it off in PR CI (report the unshrunk sequence and
  its seed; shrink locally).

## 5. Built — s2, 2026-09-30

**Where.** `packages/nodegx-node-spec/src/runner/`: `random.ts` (mulberry32 + `sequenceSeed`), `generate.ts` (pools per
declared port type, cross-type values every port gets because a wire can deliver them — the §4 docblock), `compare.ts`
(first differing line, side by side; `hasObservation`), `shrink.ts` (drop step chunks → single steps → simplify values
by a ladder → drop params → simplify params; bounded by `maxRuns`), `mutants.ts` (branch DISCOVERY by wrapping every
reducer and recording the patch shapes the suite reaches; four mutation kinds per branch), `scenario.ts`
(`scenarios/<typeName>.json`, `loadScenarios`, `writeReplay` — a replay file IS a scenario file), `conformance.ts`
(`runConformance(spec, adapter, options) → Report`, `formatReport`). `scenarios/Counter.json` holds seven hand
scenarios, each with a `because` naming the runtime line or docblock it came from. `needs?: WorldNeed[]` added to the
spec format (`spec.ts`) so a T2/T3 spec can be refused until NSP-007. Graded by `tests/runner.test.ts` (13 tests, the
interpreter alone) and `packages/noodl-runtime/test/node-spec/conformance.test.ts` (3 tests, the runtime).

**Acceptance criteria, measured (2026-09-30):**

| AC | reading |
|---|---|
| 1 planted divergence caught, shrinks to ≤ 4 | A copy of `counter.ts` made **in memory** from the source text (never the real file — the test asserts the real file still holds `>=`), `>=` → `>` in the Increase limit guard, transpiled and registered on a fresh target. Caught by the hand scenario *limits: at Max* (event 11) AND by the generated phase at sequence **43** of 200 (seed 1); shrunk in **10** runs to **2 steps**: `params {"limitsEnabled":1}`, `[{"signal":"increase"},"settle"]`; the printed first difference: interpreter `value currentCount 0` / runtime `value currentCount 1`. On the interpreter side the same off-by-one as a mutant target: found, shrunk to ≤ 4, replay file written and read back by `loadScenarios`, still failing |
| 2 same seed, same sequences | `generateRun(Counter, 1, 50)` twice → identical; its sha256 prefix `daa8363541ba2c3e` is **pinned** in the test (a change is a versioned decision about the pools). `mulberry32(42)` twice → the same numbers; `sequenceSeed(7,3)` stable |
| 3 every Counter mutant killed | The suite (7 scenarios + 200 sequences at seed 1) reaches all **8** branches (increase ×2, decrease ×2, reset ×2, startValue ×2); **every mutant killed** (≥ 16 mutants: drop-emit / drop-set / flip-outcome / swap-branch per branch as admitted), each with the scenario or sequence that killed it named; `unreached: []`. A two-reducer probe spec with a suite that never pulses `b` reports `unreached: [b]` and does not conform |
| 4 empty reference refused | A scenario with no steps → reference has no observation → `status: 'refused'`, reason *an arm with no predicate grades nothing*; the node does not conform |
| 5 CI budget, time printed | Counter on the runtime, **200 sequences + 7 scenarios: 833 ms** (day seed 20726), printed as `Counter v1 on runtime: CONFORMS (833 ms, seed 20726)`; shrink is off unless asked (§4) |
| gates | `packages/nodegx-node-spec`: `npx jest` **143/143** (8 suites), `tsc --noEmit` exit 0, `lerna run test --scope @nodegx/node-spec` exit 0. `packages/noodl-runtime`: `npx jest` **179/179 suites, 3020 passed, 13 skipped (pre-existing)**, `tsc --noEmit` exit 0. `test:main`: the handoff has the reading |

**Decisions made here:**

1. **A branch is a patch SHAPE the suite reached** — `{ set keys, emit list, outcome }` — discovered by running, not by
   parsing the reducer's source. A reducer is one TypeScript function; its branches are what it returns. A branch the
   suite never reaches is listed as `unreached` before any mutant runs, because a mutant of it would survive trivially
   — that is the hole, named (README §9: *a gate can have a hole shaped like the defect*).
2. **Four mutation kinds**, each a plausible second-implementation defect: `drop-emit` (forgot to pulse), `drop-set`
   (the value never moves), `flip-outcome` (done ↔ unchanged, failure → done), `swap-branch` (returns a sibling
   branch's patch — the inverted condition). A mutation that would not change the patch is not generated.
3. **The mutant suite is the same suite** — hand scenarios plus the run's generated sequences — so "kills every mutant"
   is a statement about the suite that graded the target, not about a different, larger one.
4. **The reference is the interpreter unless a scenario carries `expect`.** With `expect`, both are graded against it.
5. **The seed rotates daily in CI** (`defaultSeed()` = UTC day number) so a year of CI runs 365 different rotations,
   and any day's run is reproducible from the printed seed; a test that needs a fixed run passes `seed`.
6. **Generation is from what a WIRE can deliver**: every value port's pool includes `null`, `undefined`, `""`, `"abc"`,
   `{}`, `[]`, `true` alongside its own boundaries (`-0`, `NaN`, `±Infinity`, `2^53`, `"1e3"` for numbers). Derived
   ports are not generated (NSP-004's String Format drives them by hand).
7. **Runtime errors are not graded yet.** The runtime handle carries them (NSP-002 decision 9); the runner compares
   traces only. An "and no error was raised" arm is NSP-004's to add if the pilot needs it.
8. **No CLI.** `runConformance` is framework-neutral and jest wraps it in both packages; NSP-009's ledger is where a
   command-line entry point (`npm run spec-ledger`) belongs, since it needs the runtime compiled.

**Found, not fixed (R3 (a)):** nothing. Counter conforms on the runtime at 200 sequences on two seeds (1 and the day's).

**Addendum, s4 (NSP-011, 2026-09-30):** a branch's shape includes the outcomes an `afterInputs` resolves (which, not how
many); `discoverBranches` keeps the RICHEST example per branch (a `swap-branch` that sets `undefined` is invisible under C3
and survived by seed on String Mapper); `formatParams` prints an `undefined` param, which `JSON.stringify` had been hiding;
`NSP_ONLY` in the runtime suite takes a comma-separated list. Decision 6's "derived ports are not generated" was already
struck by NSP-004.
