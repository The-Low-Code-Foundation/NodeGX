# NSP-002 — Traces, the adapter interface, and the runtime as a target

**Opened 2026-09-29.** **Depends on NSP-001.**
**Status: ✅ built s2 (2026-09-30) — §5.**

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

- **From s1 (NSP-001 §5): the interpreter groups events between two settles as values (output declaration
  order) → signals (emission order) → outcomes (invocation order), and records a value only when it changed
  (canonical compare). The runtime pulses a signal synchronously inside a setter and delivers the value at frame end,
  so the runtime adapter must buffer to the same grouping and drop unchanged re-sends — otherwise every trace differs
  in order and nothing is graded. The type is `TraceEvent` in `packages/nodegx-node-spec/src/trace.ts`.
- **From s1:** the interpreter's outcome event is one `{ t: 'outcome', port, value }` per invocation; the runtime
  expresses the same thing as pulses on the `done` / `unchanged` / `failure` signal outputs plus a universal
  `completed` pulse (`outcome.ts`). The adapter maps the three to outcome events and must decide what to do with
  `completed` (drop it as implied, or record it) — decide here, once, and write it into the schema.

- **C8, the first update consolidates**: the runtime's first frame behaves differently from later
  ones. The adapter must mount *and settle* before a scenario's first step, and the trace must
  include what the first settle emitted (Counter's `startValue` pulse lives there).
- **C11, a late connection catches up**: irrelevant for one node, but the harness wires ports as
  a graph would — make sure it doesn't wire them late by accident.
- Memory: *`Function` outputs publish only on change* — a trace that skips an unchanged value is
  correct runtime behaviour, not an adapter bug. Record it; don't "fix" the adapter.

## 5. Built — s2, 2026-09-30

**Where.** In `packages/nodegx-node-spec`: `schema/trace.schema.json` (draft-07, `$id …/trace/v1.json`),
`src/canonical.ts` (the table: `-0`/`NaN`/`±Infinity` → `{ "$num": … }`, `Date` → `{ "$date": iso | null }`,
sorted keys, unit object kept whole, `toJSON` honoured, class instances by own keys with no class tag,
functions/symbols/bigints/cycles refused with the path), `src/schema.ts` (`validateTrace` → `{ ok } |
{ ok: false, path, message }`, `assertTrace`, the constants the JSON file is held to), `src/adapter.ts`
(`TargetAdapter`, `Handle`, `Step`, `play()`), `src/adapters/interpreter.ts`. In `packages/noodl-runtime/test`:
`helpers/node-spec-target.ts` (the runtime adapter — it lives where the runtime compiles, the spec package
imports nothing from the runtime), `node-spec/runtime-target.test.ts`. The interpreter now records canonical
values and sorts `value` events by port name.

**Acceptance criteria, measured (2026-09-30, working tree at HEAD `9b1aea6d4` + this task's files):**

| AC | reading |
|---|---|
| 1 mount by name; Counter equal | The adapter constructs a real `NoodlRuntime` (type `browser`), so `mount(type)` reaches `registerNodes`' own list. The catalog's **79** `providedBy: noodl-runtime` picker nodes (measured from `node-catalog.json`, 2026-09-30) are all registered; **78** mount, settle and dispose headlessly with no params and produce a valid trace; the one that cannot is `net.noodl.user.User` (reads `NoodlRuntime.Services.UserService` at mount, user.ts:114 — a service the browser viewer installs; NSP-007/014), pinned by name and reason. Six Counter scenarios (the NSP-001 24-event script, limits, no params, later Start Value, coercion `"3"`/`"abc"`/`""`, caller-order params) give `expect(runtime).toEqual(interpreter)` |
| 2 canonicalisation table | `tests/canonical.test.ts`: 21 table rows + refusals with paths + `canonicalKey` (NaN = NaN, -0 ≠ 0, Date ≠ its ISO string) + `findNonCanonical` paths — **48 tests** |
| 3 schema | `tests/schema.test.ts`: a 20-row verdict table gets the SAME verdict from ajv over the JSON file and from `validateTrace`; nine malformed traces name their path (`$[1].value`, `$[0].value.x.a`, `$[0].extra` …); the door is open — `{ subject: "app:click" }` and a node-id subject validate; the JSON file's `oneOf` kinds, `required`/`properties` per kind and outcome enum are compared with the TS constants; `$id` ends in `/v1.json` = `TRACE_FORMAT_VERSION`. Runtime traces validate (AC3 block in the runtime test), including a NaN value arriving tagged, not as `null` |
| 4 settle drains C5 | Condition (evaluates in `scheduleAfterInputsHaveUpdated`): after `set condition true` and before `settle` the trace holds only the `set` and `result` reads `null`; after `settle` the trace has `value result true` beside the known-firing `signal ontrue` and no other signal |
| gates | `packages/nodegx-node-spec`: `npx jest` **130/130**, `tsc --noEmit` exit 0, `lerna run test --scope @nodegx/node-spec` exit 0. `packages/noodl-runtime`: `npx jest` **178/178 suites, 3017 passed, 13 skipped (pre-existing)**, `tsc --noEmit` exit 0 |

**Decisions made here, once (§4 asked for them):**

1. **`completed` is never an event.** Every `outcome` event implies it; written into the schema's description and
   graded by `tests/schema.test.ts`. The runtime adapter folds the `done`/`unchanged`/`failure`/`completed` pulses
   that fire *inside* `reportOutcome` into the one outcome event; a hand-rolled `sendSignalOnOutput('failure')`
   outside one stays an ordinary `signal` event (the schema cannot tell them apart; the fold is the adapter's).
2. **An outcome's `port` is the INPUT that was invoked.** The runtime does not know it inside `reportOutcome`, so
   the adapter stamps the input being pulsed onto the token in `beginOutcome` — async-safe (Condition's deferred
   `eval` reports against `eval`).
3. **A `failure` carries the error CODE** (`options.code`, the runtime's `outcome/unspecified-failure` default, or
   `outcome/unchanged-as-failure` after a *Treat Unchanged as* remap), never the message.
4. **Value events sort by port NAME**, not by the spec's declaration order as NSP-001 §5 first wrote — a stranger's
   target (NSP-006) can compute name order without reading the spec; the parity gate compares ports by name too.
5. **Params apply in the caller's key order on every target** (`Object.keys(parameters)` is the runtime's own order,
   nodescope.ts). NSP-001's interpreter normalised to declaration order for trace stability; reversed here so the
   two targets are driven identically. The NSP-001 test now asserts the `set` order follows the literal and the
   observations are unchanged.
6. **Values are recorded from `sendValue`, not from getters at settle** — what a wire carries. Reading getters would
   hide the defect class "state moved but nothing told downstream". The one exception is the **first settle**, which
   also reads the getter of any output nothing sent, because `connectInput` delivers a getter's current value to a
   wire made before the first frame — that is how a Counter with no Start Value publishes its 0, and how a
   Condition with no params publishes `result: null`.
7. **Stimulus goes through `setInputValue`, not the input queue.** So C8 first-update consolidation and nodescope's
   `inputPriority`/`runOnChange-` ordering are deliberately not reproduced by this adapter; they are graph clauses
   and NSP-008's.
8. **A lone node gets a minimal scope** (`modelScope: undefined` → the global `Model`, a component owner named after
   the handle): five picker nodes read `nodeScope` at mount. What a scope means is NSP-008's.
9. **Runtime errors are on the handle, not in the trace.** The trace is behaviour on the wire; the error channel is
   the runner's to read (NSP-003 can grade "no error raised" as a separate arm).
10. **Where the runtime adapter lives:** the runtime's test tree, as `nodegx-core-parity.test.ts` chose and for the
    same reason. NSP-003's runner therefore takes an adapter as a parameter and the runtime-side conformance test
    lives in `packages/noodl-runtime/test/node-spec/`.

**Found, not fixed (R3 (a)):** nothing diverged on Counter. `Condition.result` is `null` until the first test
(condition.ts's own description) — a value the wire delivers, so a Condition spec (NSP-004) must declare that.

**Dependency note:** `ajv` was already a root devDependency (`^8.18.0`); the package declares it too, for its
schema test only. No install was run (a Mac install drops other platforms' prebuilts); the lockfile row for
`packages/nodegx-node-spec` gained the one devDependency line.

**Addendum, s4 (NSP-011, 2026-09-30) — what a frame's value IS.** The runtime sends an output at every write that flags it
(`flagOutputDirty` → `sendValue`, node.ts :832-835, synchronously) and never sends `undefined` (:820-822, C3). So a wire
carries the **last defined value a frame sent**: an Inverter handed `null` then `undefined` in one frame leaves `true`
downstream while its getter says `undefined` — the two readers disagree, the C2 shape, and the format models the wire
(decision 6). The interpreter now observes every value output after each step and records at settle the last defined
observation per port; `Patch.send` narrows which writes observe, for the one node whose flag is conditional. The runtime
adapter already did exactly this ("the LAST value sent per output in the frame"). Two more: scenario files are canonical
JSON both ways (`revive` in canonical.ts; `loadScenarios` / `writeReplay`), and the runtime handle carries Log's line
(`logs`, through a `runContext.log` sink on the scope) beside `errors`; `withViewerNodes` registers the three
viewer-provided specced nodes from the viewer's source.
