# The stranger's report — five nodes from the spec and the suite alone

Delivered: `stranger/target.js` (exports `strangerTarget()`), `stranger/engine.js`, `stranger/canon.js`,
`stranger/coerce.js`, `stranger/nodes/{counter,switch,and,condition,string-format}.js`. Nothing outside
`stranger/` was touched; nothing under `src/` is required.

Result in one line: all five nodes CONFORM at 200 and at 10,000 with zero divergences and every mutant
killed, on the first run. One test in the file stays red, and no target can turn it green: the suite
contradicts itself on the port named `''` (ambiguity 1).

## 1. Ambiguities

Ordered by how much they cost. "Corrected" means the suite told me I had guessed wrong.

1. **The port `''` — the conformance gate and the schema gate contradict each other.** `src/nodes/string-format.ts`
   says (docblock on `PLACEHOLDER`) "`{}` names the port `''`", and `scenarios/String Format.json` ("the
   empty placeholder {} names the port ''") sends `{ "set": "", "value": "X" }`. `schema/trace.schema.json`
   defines `port` as `{ "type": "string", "minLength": 1 }`. My adapter records the stimulus faithfully as
   `{ t: 'set', port: '' }`; the conformance test passes (the reference records the same event) and the test
   "every trace the stranger produces validates against schema/trace.schema.json" fails on exactly that event.
   I measured the alternative: with `''` recorded under another name the schema test passes and the
   conformance test fails at event 1 of that scenario — so `set` events ARE compared and the reference's own
   trace for this scenario also violates the schema. Nothing under `stranger/` can satisfy both gates. The
   suite was not able to correct me because it disagrees with itself; the fix belongs in the schema
   (`minLength: 0` for `port`, or a note that a derived port may be named `''`) or in the spec (refuse `{}`).
   This is the only red test in the delivered state.

2. **What the first settle sends.** `src/adapter.ts` says a settle records "values that CHANGED since the
   last settle" — there is no previous settle before the first one, and neither adapter.ts nor trace.ts says
   what the baseline is. `src/spec.ts` says only that "`undefined` is never sent (C3)". I guessed: the baseline
   is "nothing sent yet", so every output whose value is not `undefined` is sent at the first settle,
   including `null`. The scenarios confirmed it ("no Start Value: the first settle publishes 0", Condition
   "publishes null on both booleans", And "nothing is published before the first input"), but the rule lives
   in three scenario files, in `because` lines that cite a file I may not read (`node.ts :555-565`,
   "connectInput delivers the getter's value to a wire made before the first frame"). Not corrected — guessed
   right — but it should be a sentence in adapter.ts.

3. **The value baseline after an output returns to `undefined`.** The `send` docblock in `src/spec.ts` says a
   wire "carries the last DEFINED value a frame sent". I read that as: an `undefined` at settle sends nothing
   AND leaves the baseline where it was, so a later return to the same defined value is not a change. None of
   the five can go defined → undefined, so the suite neither confirmed nor corrected this.

4. **Whether a `set` event carries the raw value or the coerced one.** adapter.ts: "records `{ t: 'set' }` and
   writes the value". I guessed raw (the stimulus as sent); the coercion scenarios passed with `"3"` in the
   `set` and `3` in the `value`, so raw is right. Not corrected, but one word ("as sent") would settle it.

5. **Whether `inputs` handed to a value reducer already holds the value being written.** The `Reducers` type in
   spec.ts gives a value reducer `(state, value, inputs)` and says nothing about whether `inputs[port]` is the
   old or the new value. I write first, then reduce. Condition's reducer reads a *different* input, so the five
   cannot tell; a node whose value reducer reads its own port would.

6. **Equality for "changed" on outputs.** Identity, `===`, `Object.is`, or canonical equality? I compare
   canonical fingerprints (so `NaN` → `NaN` is no change and two structurally equal objects are no change).
   All five outputs are primitives, so ungraded. trace.ts should say which.

7. **"Sorted by port name" — which collation.** I used the default `Array.prototype.sort` (UTF-16 code-unit
   order). Only Condition has two value outputs (`isfalse`, `result`), where every collation agrees.

8. **A declared input and a derived port with the same name.** String Format's `discover` accepts "any name at
   all", so a format `{format}` would derive a port that collides with the declared `format` input. spec.ts
   does not say which wins; I let the declared input win (the write goes to `format`, not to `values.format`).
   The generator never produced it at 10,000, so ungraded.

9. **A write to a signal port, or a pulse to a value port.** adapter.ts says "an unknown port throws"; a KNOWN
   port of the wrong kind is not covered. I throw. The generator never did either (no `PlayError` in any run).

10. **Where `afterInputs`'s emits land relative to the frame's earlier emits.** spec.ts says it is called
    "ONCE per settle, before the frame's observations are recorded"; I append its pulses after the pulses the
    frame's reducers queued. Condition's `eval` reducer emits nothing, so the order is unobservable here; a node
    whose signal reducer AND frame-end reducer both emit would grade it.

11. **`deferred` outcomes.** The format describes them at length; none of the five uses them, so my
    implementation (resolve in invocation order, matched by `port`) is written but ungraded. A pilot node with
    a `deferred` reducer, or a note in the brief that none of the five defers, would have saved the reading.

12. **`derived.inputs(params)` at mount — does a target need it at all?** For both derived nodes `discover`
    accepts a superset of what `inputs(params)` returns, so whether a target computes the mount-time ports is
    unobservable. I do compute them, and coerce a write by the declaration `inputs(params)` gave when it has
    one, else by `discover`'s. spec.ts says the editor uses `inputs(params)`; it should also say whether a
    target must.

13. **`coerce` fallback for a port with no `default`.** `applyCoercion(kind, value, undefined)`: for the `js-*`
    rules the fallback is unused, so String Format's `format` with `undefined` becomes the string
    `'undefined'`. The spec says so literally (`js-string` = `String(value)`) and the reference agreed, but a
    reader has to put two files together to see that `{ set: 'format' }` with no value yields `"undefined"`.

14. **The `row` field on a scenario.** `scenarios/String Format.json` carries `"row": "NSP-004 §6 C3"` on two
    scenarios, undocumented in any file I could read; only a comment in `tests/stranger.test.ts` explains that a
    row-marked scenario documents a runtime defect and is expected to pass on a stranger. The runner prints
    "no longer reproduces here — close the row or drop the mark" for both, which reads like a failure and is
    not one.

15. **Citations to files I may not read.** Every spec and scenario explains itself by line numbers in
    `counter.ts :125-133`, `nodescope.ts`, `node.ts :217-219`, `run-on-value-change.ts :137`, and by
    ticket names (FH-022, DEF-046, NDA-017 §2 constraint 3, C3, C5, C8, C10, ERG-001 §4). For a stranger these
    are noise; the behaviour has to be recoverable from the reducer bodies and the port descriptions alone,
    and it was — but only just (the first-settle rule, item 2, is stated nowhere except as a citation).

Files I wanted and did without: `src/runner/compare.ts` (does the comparison include `set` events? — I had
to probe it with a run instead), `src/runner/generate.ts` (what values the generator sends: Dates? objects?
`undefined`? — I canonicalised defensively for all of them), `src/schema.ts` (what the validator checks beyond
the JSON schema, e.g. key order), the package `README.md` (not on the list, so unopened).

## 2. Files opened

In the order I first opened them (the `ls` of the package root showed the names of `README.md`,
`jest.config.js`, `package.json`, `tsconfig.json`; none was opened):

1. `tests/stranger.test.ts`
2. `src/spec.ts`
3. `src/adapter.ts`
4. `src/coerce.ts`
5. `src/trace.ts`
6. `src/canonical.ts`
7. `schema/trace.schema.json`
8. `src/nodes/counter.ts`
9. `src/nodes/switch.ts`
10. `src/nodes/and.ts`
11. `src/nodes/condition.ts`
12. `src/nodes/string-format.ts`
13. `scenarios/Counter.json`
14. `scenarios/Switch.json`
15. `scenarios/And.json`
16. `scenarios/Condition.json`
17. `scenarios/String Format.json`
18. `src/index.ts` — `grep '^export'` only (names)
19. `src/runner/index.ts` — `grep '^export'` only (names)
20. `src/nodes/index.ts` — `grep '^export'` only (names)

Nothing under `src/adapters/`, no body under `src/runner/`, no `src/interpreter.ts`, no `node_modules`, no
parent directory.

## 3. Iterations

Four jest runs in all.

1. Default suite, no filter: 17 / 18 pass. All five CONFORM (scenarios, 200 sequences, mutants) and all five
   AC2 mutant tests pass. First difference: none in any trace. The one failure is the schema test:
   `String Format / the empty placeholder {} names the port '': $[1].port port is a non-empty string`.
2. `NSP_ONLY="String Format"`, a deliberate probe with `''` recorded as `PROBE` (engine backed up and restored
   afterwards): conformance now fails at "first difference at event 1" of that scenario, schema passes —
   proving the contradiction in ambiguity 1. Not a fix; reverted.
3. `NSP_DEEP=10000 -t deep`: 5 / 5 pass, 0 divergences.
4. Default suite again, to confirm the restored engine: identical to run 1 (17 / 18, the schema test red on
   the same event).

So: green at the default budget for every gate a target can satisfy on run 1; zero behavioural divergences at
any point.

## 4. Readings

Default budget (run 4, verbatim):

```
Counter v1 on stranger: CONFORMS (127 ms, seed 20726)
  scenarios: 7 / 7 passed
  generated: 200 / 200 ran, 0 divergence(s)
  mutants: 23 / 23 killed
Switch v1 on stranger: CONFORMS (87 ms, seed 20726)
  scenarios: 8 / 8 passed
  generated: 200 / 200 ran, 0 divergence(s)
  mutants: 26 / 26 killed
And v1 on stranger: CONFORMS (103 ms, seed 20726)
  scenarios: 6 / 6 passed
  generated: 200 / 200 ran, 0 divergence(s)
  mutants: 4 / 4 killed
Condition v1 on stranger: CONFORMS (82 ms, seed 20726)
  scenarios: 16 / 16 passed
  generated: 200 / 200 ran, 0 divergence(s)
  mutants: 16 / 16 killed
String Format v1 on stranger: CONFORMS (95 ms, seed 20726)
  scenarios: 12 / 12 passed
  generated: 200 / 200 ran, 0 divergence(s)
  mutants: 2 / 2 killed
Counter: 23 / 23 mutants caught by the stranger's target
Switch: 26 / 26 mutants caught by the stranger's target
And: 4 / 4 mutants caught by the stranger's target
Condition: 16 / 16 mutants caught by the stranger's target
String Format: 2 / 2 mutants caught by the stranger's target
Tests:       1 failed, 5 skipped, 12 passed, 18 total
```

(the 1 failed is the schema test on `port: ''`, ambiguity 1.)

Deep budget (run 3, verbatim):

```
Counter v1 on stranger: CONFORMS (2069 ms, seed 20726)
  scenarios: 7 / 7 passed
  generated: 10000 / 10000 ran, 0 divergence(s)
  mutants: 23 / 23 killed
Switch v1 on stranger: CONFORMS (1776 ms, seed 20726)
  scenarios: 8 / 8 passed
  generated: 10000 / 10000 ran, 0 divergence(s)
  mutants: 26 / 26 killed
And v1 on stranger: CONFORMS (2505 ms, seed 20726)
  scenarios: 6 / 6 passed
  generated: 10000 / 10000 ran, 0 divergence(s)
  mutants: 4 / 4 killed
Condition v1 on stranger: CONFORMS (1490 ms, seed 20726)
  scenarios: 16 / 16 passed
  generated: 10000 / 10000 ran, 0 divergence(s)
  mutants: 16 / 16 killed
String Format v1 on stranger: CONFORMS (1821 ms, seed 20726)
  scenarios: 12 / 12 passed
  generated: 10000 / 10000 ran, 0 divergence(s)
  mutants: 2 / 2 killed
Tests:       13 skipped, 5 passed, 18 total
```

## 5. Time

Start: `Wed Sep 30 16:32:31 CEST 2026`. End: `Wed Sep 30 16:38:03 CEST 2026` (after the confirming run; the
report was written after that). About six minutes wall clock.

## 6. What I would change

- **Schema vs spec on `''`**: decide once. Either `port` allows the empty string in `schema/trace.schema.json`
  or `string-format.ts` refuses `{}`. As delivered, a stranger cannot go fully green, which defeats the
  "the suite says when you are done" premise.
- **State the first-settle baseline in `adapter.ts`**: "before the first settle nothing has been sent; the
  first settle sends every output whose value is not `undefined`, `null` included". Say too what the
  baseline is after an output has been `undefined` at a settle.
- **State the change comparison for outputs** in `trace.ts`: canonical equality (I assume), not identity.
- **Say "the value as sent"** for the `set` event, and "the old value" or "the new value" for `inputs[port]`
  inside a value reducer.
- **Say which wins when a declared input and a `discover`ed port share a name**, and what a target does with a
  `set` to a signal port / a `signal` to a value port (throw, I assume).
- **Give the `row` field a definition** in the scenario format (one line in `adapter.ts` beside `Step`, or a
  `scenarios/README`), and make the runner's "no longer reproduces here" line say it is expected on a stranger.
- **Put the rule before the citation.** Every `because` and every reducer comment leads with a line number in
  a file a stranger cannot read. The behaviour survived the ban only because the reducer bodies are short;
  a one-sentence rule in plain words ahead of each citation would make the citations optional.
- **Tell the stranger what is not exercised**: `deferred`, `send`, `needs`, `typed-*` coercions — none is used
  by the five. I implemented or read all of them; a sentence in the brief would have saved that.
- Optional: expose the generator's value vocabulary (which JavaScript values it can send to a `number`,
  `boolean`, `string`, `*` port) in a readable file. I canonicalised for Dates, objects, `toJSON`, circular
  references and bigints on the off chance; the reader of a report wants to know whether that mattered.

## 7. Design of my target

Each node is a plain object of a shape I invented (`boot`, `ports`, `react`, `fire`, `outs`, `pulses`,
optional `frameEnd` and `dynamic {portsFor, accept, write}`), and every behaviour is a small function returning
my own patch shape `{ state, pulse, outcome, error, resolved }` — different words from the spec's
`{ set, emit, outcome }` on purpose. `engine.js` holds a `Cell` per mounted instance with its state, its
coerced input record, its dynamic-port values, two queues (pulses in emission order, outcomes in invocation
order, a deferred outcome being an outcome slot with no value yet) and a fingerprint of the last defined
value each output sent; `endFrame` runs `frameEnd` once, refuses an unresolved deferred slot, then writes
`settle`, the changed values in name order, the pulses, the outcomes. `canon.js` is the canonicaliser rewritten
from the table in `canonical.ts`'s docblock, and `coerce.js` the nine rules from `coerce.ts`; events are stored
already canonical so `trace()` is a shallow copy. `target.js` builds a fresh adapter with its own instance map
on every call.
