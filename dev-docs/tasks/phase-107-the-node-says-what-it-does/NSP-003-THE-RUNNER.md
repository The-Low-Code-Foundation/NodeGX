# NSP-003 — The runner: scenarios, generated sequences, shrinking, mutants

**Opened 2026-09-29.** **Depends on NSP-002.** Needs **R5** (CI budget).
**Status: 📋 not started.**

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

## 5. Built

*(empty)*
