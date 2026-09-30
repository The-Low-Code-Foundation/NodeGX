# NSP-002 — Traces, the adapter interface, and the runtime as a target

**Opened 2026-09-29.** **Depends on NSP-001.**
**Status: 📋 not started.**

## 1. The person sentence

> **What a node did is written down in the same form whichever implementation did it, so two
> implementations can be compared line by line.**

## 2. What to build

### 2.1 The trace format (JSON, R2 (a))

```json
[
  { "t": "set",    "port": "startValue", "value": 0 },
  { "t": "settle" },
  { "t": "value",  "port": "currentCount", "value": 0 },
  { "t": "signal", "port": "countChanged" },
  { "t": "in",     "port": "increase" },
  { "t": "settle" },
  { "t": "value",  "port": "currentCount", "value": 1 },
  { "t": "signal", "port": "countChanged" },
  { "t": "outcome","port": "increase", "value": "done" }
]
```

- Inputs and outputs in one ordered stream. `settle` marks where the target drains its frame.
- **Every event may carry a `subject`** — what it happened to. It is omitted in a one-node trace
  (the subject is the node under test), names a node id in a graph trace (NSP-008), and is left
  open for an **app-level** subject later: a person's click, text appearing on screen, a network
  call. That keeps one format able to record a whole running app, which is what a future
  *import your app into a canvas* feature would compare — the original app and the imported graph,
  driven the same way (README §8). Nothing in this phase emits an app-level subject; the schema
  just must not forbid one.
- **Values are canonicalised** before comparison: numbers by the runtime's own rules (`-0`,
  `NaN`), dates as ISO strings, objects with sorted keys, unit objects kept whole.
- A **schema** for the format lives in the package, versioned, so a non-TypeScript target can
  validate its own output.

### 2.2 The adapter interface

```ts
interface TargetAdapter {
  name: string;
  mount(type: string, params: Record<string, unknown>): Handle;
  set(h: Handle, port: string, value: unknown): void;
  signal(h: Handle, port: string): void;
  settle(): Promise<void>;
  trace(h: Handle): TraceEvent[];
  dispose(h: Handle): void;
}
```

Two adapters in this task: **the spec interpreter** (NSP-001) and **the interpreted runtime**,
built on `packages/noodl-runtime/test/helpers/node-harness.ts` (it already registers a definition,
intercepts `sendSignalOnOutput`, and reads outputs — the four suites it replaced each did exactly
this). Outcomes are read from the outcome ports `outcome.ts` declares.

## 3. Acceptance criteria

1. The runtime adapter mounts any picker node **by type name from the catalog** — not a hand list
   — and a scripted Counter sequence produces a trace equal to the spec interpreter's.
2. Canonicalisation has its own table-driven spec (`-0`, `NaN`, `Date`, key order, unit object).
3. The trace schema validates both adapters' output; a malformed trace is refused with the path
   to the bad field. The schema accepts an event with a `subject` the runtime never produces (a
   hand-written app-level event, e.g. `{ "subject": "app:click", … }`) — a spec proves the door is
   open.
4. `settle` on the runtime adapter drains the deferred work C5 describes; a spec proves a value
   written before `settle` is not observed until after it.

## 4. Watch for

- **C8, the first update consolidates**: the runtime's first frame behaves differently from later
  ones. The adapter must mount *and settle* before a scenario's first step, and the trace must
  include what the first settle emitted (Counter's `startValue` pulse lives there).
- **C11, a late connection catches up**: irrelevant for one node, but the harness wires ports as
  a graph would — make sure it doesn't wire them late by accident.
- Memory: *`Function` outputs publish only on change* — a trace that skips an unchanged value is
  correct runtime behaviour, not an adapter bug. Record it; don't "fix" the adapter.

## 5. Built

*(empty)*
