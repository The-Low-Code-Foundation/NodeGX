# Stranger round 2 — report

Seven nodes (Counter, Switch, And, Condition, String Format, Inverter, Boolean To String) built in plain
CommonJS from the spec files, the format files, the scenarios, the schema and `tests/stranger.test.ts` alone.
Green at 200 on the third jest run; green at 10,000 on the first deep run.

## 1. Ambiguities

1. **When the "first settle" reads an output that no step sent** — `src/adapter.ts`, `settle()`: "the first
   settle records every output that is defined, `null` included (C8)" sits next to "WHAT A FRAME SENDS for an
   output is the last DEFINED value that output held after ANY step of the frame — not the settle-time value".
   The scenario `because` lines say "connectInput delivers the getter's value to a wire made before the first
   frame". None of those three sentences says *when* that first read happens relative to the params: at mount
   (before the params are applied) or at the first settle (after them). I guessed **mount**, i.e. the initial
   state counts as a step-zero sample. **The suite corrected me**: Boolean To String, seed 2310069663, params
   `{}`, steps `[{set: falseString}, settle, …]` — the reference publishes nothing at the first settle (the
   output is `undefined` because `falseString` is `undefined`), mine published `''` from the mount read. The
   rule the reference actually follows: the first settle samples the outputs *as they stand at that settle*,
   on top of the per-step samples. I moved the seed to the first `close()`. Every other node was indifferent
   because none of the other six can move an output from defined to `undefined` inside the first frame.

2. **Whether the settle-time sample applies to every frame or only the first** — same sentences. After
   the correction I sample at settle only in the first frame, because the `send` paragraph in `src/spec.ts`
   (`Patch.send`) says a wire holds "the last DEFINED value a frame sent", which a settle-time read every
   frame would contradict whenever a `send: []` step changed an output. For these seven nodes the two
   readings are indistinguishable (a `send`-restricted step never changes the selected string), so the suite
   could not tell me which is right. Untested guess.

3. **What `send` means for a step whose patch has no `send` and no `set`** (`src/spec.ts`, `Patch.send`:
   "Absent means all of them") — e.g. Counter's `{ outcome: 'unchanged' }`, or the frame-end reducer's `{}`.
   I read outputs after every step regardless, restricted only when `send` is present. The suite agreed;
   it could not have disagreed for these nodes since a no-`set` step leaves every output where it was.

4. **Whether the frame-end reducer runs when nothing was scheduled** — `src/spec.ts`, `AfterInputs`: "the
   interpreter calls this ONCE per `settle`". I call it on every settle, including frames with no steps at all
   (a scenario like `["settle", "settle"]`). Condition's returns `{}` then, so nothing depends on it, but a
   node whose `afterInputs` had side effects unconditionally would.

5. **A value input with no `default`** — `src/spec.ts`, `ValueInputDecl.default`: "What the port holds before
   anything is sent to it". String Format's `format`, Inverter's `value`, Condition's `condition`, Boolean To
   String's three inputs have none. I hold `undefined`. Since no reducer reads those inputs through `inputs`
   before they are set (they read state), the guess is unobservable. Note the odd pair in String Format: the
   input `format` starts `undefined` while the state `format` starts `''`. The state is what the output reads,
   so it does not matter here; a spec where a reducer read `inputs.format` before the first set would differ.

6. **A derived port that `inputs(params)` mints with a declared name** — `src/spec.ts`, `DerivedPorts`: "a
   spec whose `inputs(params)` or `discover` mints a declared name is a spec error (String Format's `{format}`
   reads an unset placeholder, never the `format` input)". The two halves point different ways: "spec error"
   (refuse?) versus "reads an unset placeholder" (silently ignore the derived registration). I ignore it: a
   declared name is never registered as a derived port, and `formatValue` reads `values['format']`, which is
   never set, so `{format}` fills with `''`. The generator never wrote a format containing `{format}` as far as
   the run shows, so the suite did not grade this.

7. **Where the `outcome` event's `port` comes from** — `schema/trace.schema.json` says "`port` is the INPUT
   that was invoked"; `src/spec.ts` `OutcomePatch` carries no port. Clear enough once both are read, but
   the adapter contract (`src/adapter.ts`) never mentions outcomes' port at all. I tag each outcome with the
   signal input being pulsed. Suite agreed.

8. **Multiple outcomes from one invocation** — `src/spec.ts` rule 3 says "exactly one outcome per
   invocation". I did not enforce more than one; I do throw if an `outcome: true` input reports none. Not
   graded.

9. **Which `params` key order the target must follow** — `src/adapter.ts` `mount`: "IN THE ORDER OF THE PARAMS
   OBJECT'S KEYS". JavaScript puts integer-like keys first whatever the literal order, so a param named
   `"3"` would be applied before `"format"` even if written after. No node here has such a port; noting it
   because a numbered-inputs node whose ports were bare digits would be bitten.

10. **Mount with a param naming an unknown port** — `src/adapter.ts` says a `set` on an unknown port throws;
    it does not say what `mount` does with a param that names one. I throw (a param is "an ordinary write").
    Not graded.

11. **`discover` and signals** — `src/adapter.ts`: a signal on a value input throws; nothing says whether a
    signal on a name that `discover` *would* accept counts as "known port of the other kind" or "unknown".
    Both throw in my target, so the distinction is invisible. Not graded.

12. **Frozen state** — `src/spec.ts` says the interpreter hands reducers frozen state. A target that mutates
    is fine by the adapter contract; I mutate. Mentioned only because the spec file reads as if immutability
    were part of the behaviour when it is part of the interpreter's rule-checking.

13. **Canonicalising at record time versus at trace time** — `src/adapter.ts` `set`: "carrying the value AS
    SENT (raw, canonicalised for the trace)". If a scenario mutated an object after setting it, the two
    readings differ. I canonicalise when the event is recorded. Not graded (the generator's objects are fresh).

Things I wanted and did without: the `formatReport` output format was learnt by running it; nothing else.
I did not need the runner bodies.

## 2. Files opened (in order of first opening)

1. `src/spec.ts`
2. `src/coerce.ts`
3. `src/canonical.ts`
4. `src/trace.ts`
5. `src/adapter.ts`
6. `schema/trace.schema.json`
7. `scenarios/README.md`
8. `src/index.ts` (export lines only, via `grep "^export"`)
9. `src/runner/index.ts` (export lines only, via `grep "^export"`)
10. `src/nodes/index.ts`
11. `tests/stranger.test.ts`
12. `tests/stranger-suite-hashes.helper.js`
13. `src/nodes/counter.ts` (a first batched `cat` of all seven specs overflowed the tool's output limit and
    was persisted to a file outside the package; I did not open that file, and re-read each spec singly)
14. `src/nodes/switch.ts`
15. `src/nodes/and.ts`
16. `src/nodes/condition.ts`
17. `src/nodes/string-format.ts`
18. `src/nodes/inverter.ts`
19. `src/nodes/boolean-to-string.ts`
20. `scenarios/Counter.json`
21. `scenarios/Switch.json`
22. `scenarios/And.json`
23. `scenarios/Condition.json`
24. `scenarios/String Format.json`
25. `scenarios/Inverter.json`
26. `scenarios/Boolean To String.json`

(The seven scenario files were read in one call after the test files; the seven spec files were read in
parallel after that. `ls -la` of the package root and `stranger/` was run once at the start.) Nothing under
`src/adapters/`, `src/interpreter.ts`, or the bodies under `src/runner/` was opened. No file outside the
package was opened.

## 3. Iterations

Three jest runs to green at the default budget, plus one deep run.

1. Full suite — 6/7 conform. Boolean To String: seed 2310069663, params `{}`, steps
   `[{set: falseString}, settle, …]`, first difference at event 2: reference `{t: set, port: input, value: "true"}`,
   mine `{t: value, port: currentValue, value: ""}` (I published `''` at the first settle from a mount-time read of
   the output; the reference published nothing because the output was `undefined` at that settle). Second
   divergence the same cause (seed 3803964780, params `{trueString: undefined, input: "true"}`).
2. `NSP_ONLY="Boolean To String"` after moving the first-frame seed to the first settle — CONFORMS.
3. Full suite, no filter — all seven CONFORM, 78/78 mutants caught.
4. Deep run, `NSP_DEEP=10000 -t deep` — all seven CONFORM, 0 divergences.

## 4. Readings

### Default budget (run 3, no filter)

```
Counter v1 on stranger-2: CONFORMS (30 ms, seed 20726)
  scenarios: 7 / 7 passed
  generated: 200 / 200 ran, 0 divergence(s)
  mutants: 23 / 23 killed
Switch v1 on stranger-2: CONFORMS (23 ms, seed 20726)
  scenarios: 8 / 8 passed
  generated: 200 / 200 ran, 0 divergence(s)
  mutants: 26 / 26 killed
And v1 on stranger-2: CONFORMS (28 ms, seed 20726)
  scenarios: 6 / 6 passed
  generated: 200 / 200 ran, 0 divergence(s)
  mutants: 4 / 4 killed
Condition v1 on stranger-2: CONFORMS (24 ms, seed 20726)
  scenarios: 16 / 16 passed
  generated: 200 / 200 ran, 0 divergence(s)
  mutants: 16 / 16 killed
String Format v1 on stranger-2: CONFORMS (24 ms, seed 20726)
  scenarios: 12 / 12 passed
    passed a wired number on Format: the spec says '5', the runtime throws in the frame (§6 row) [row NSP-004 §6 C3]: row NSP-004 §6 C3 does not reproduce on stranger-2 — expected on a target without the runtime's defect; on the runtime, close the row or drop the mark
    passed after a non-string Format the node never formats again — a later good format sends nothing (§6 row) [row NSP-004 §6 C3]: row NSP-004 §6 C3 does not reproduce on stranger-2 — expected on a target without the runtime's defect; on the runtime, close the row or drop the mark
  generated: 200 / 200 ran, 0 divergence(s)
  mutants: 2 / 2 killed
Inverter v1 on stranger-2: CONFORMS (17 ms, seed 20726)
  scenarios: 3 / 3 passed
  generated: 200 / 200 ran, 0 divergence(s)
  mutants: 1 / 1 killed
Boolean To String v1 on stranger-2: CONFORMS (22 ms, seed 20726)
  scenarios: 7 / 7 passed
  generated: 200 / 200 ran, 0 divergence(s)
  mutants: 6 / 6 killed

Counter: 23 / 23 mutants caught by the stranger's target
Switch: 26 / 26 mutants caught by the stranger's target
And: 4 / 4 mutants caught by the stranger's target
Condition: 16 / 16 mutants caught by the stranger's target
String Format: 2 / 2 mutants caught by the stranger's target
Inverter: 1 / 1 mutants caught by the stranger's target
Boolean To String: 6 / 6 mutants caught by the stranger's target

Tests:       7 skipped, 17 passed, 24 total
```

### Deep budget (`NSP_DEEP=10000 npx jest tests/stranger.test.ts -t deep`, run once)

The Counter summary block scrolled off the top of the `tail -80` I piped the run through; the deep run is
run once by the brief, so it is not reconstructed here. Its test line is verbatim below.

```
Switch v1 on stranger-2: CONFORMS (804 ms, seed 20726)
  scenarios: 8 / 8 passed
  generated: 10000 / 10000 ran, 0 divergence(s)
  mutants: 26 / 26 killed
And v1 on stranger-2: CONFORMS (1310 ms, seed 20726)
  scenarios: 6 / 6 passed
  generated: 10000 / 10000 ran, 0 divergence(s)
  mutants: 4 / 4 killed
Condition v1 on stranger-2: CONFORMS (1189 ms, seed 20726)
  scenarios: 16 / 16 passed
  generated: 10000 / 10000 ran, 0 divergence(s)
  mutants: 16 / 16 killed
String Format v1 on stranger-2: CONFORMS (1457 ms, seed 20726)
  scenarios: 12 / 12 passed
    passed a wired number on Format: the spec says '5', the runtime throws in the frame (§6 row) [row NSP-004 §6 C3]: row NSP-004 §6 C3 does not reproduce on stranger-2 — expected on a target without the runtime's defect; on the runtime, close the row or drop the mark
    passed after a non-string Format the node never formats again — a later good format sends nothing (§6 row) [row NSP-004 §6 C3]: row NSP-004 §6 C3 does not reproduce on stranger-2 — expected on a target without the runtime's defect; on the runtime, close the row or drop the mark
  generated: 10000 / 10000 ran, 0 divergence(s)
  mutants: 2 / 2 killed
Inverter v1 on stranger-2: CONFORMS (951 ms, seed 20726)
  scenarios: 3 / 3 passed
  generated: 10000 / 10000 ran, 0 divergence(s)
  mutants: 1 / 1 killed
Boolean To String v1 on stranger-2: CONFORMS (1232 ms, seed 20726)
  scenarios: 7 / 7 passed
  generated: 10000 / 10000 ran, 0 divergence(s)
  mutants: 6 / 6 killed

  NSP-006 AC1 deep run round 2 (s6, stranger/) — 10000 sequences on the stranger's target, shrink on
    ✓ Counter at 10000 (1090 ms)
    ✓ Switch at 10000 (807 ms)
    ✓ And at 10000 (1311 ms)
    ✓ Condition at 10000 (1190 ms)
    ✓ String Format at 10000 (1458 ms)
    ✓ Inverter at 10000 (952 ms)
    ✓ Boolean To String at 10000 (1232 ms)

Tests:       17 skipped, 7 passed, 24 total
```

## 5. Time

- Start: `Wed Sep 30 16:58:04 CEST 2026`
- End: `Wed Sep 30 17:05:57 CEST 2026`

## 6. What I would change

1. **Write the first-frame rule as one sentence with a timeline.** In `src/adapter.ts` `settle()`, replace the
   three "words" with an ordered procedure: "(1) every step samples the outputs it sends and keeps the last
   defined sample; (2) at the FIRST settle only, the outputs are sampled once more before the frame-end reducer
   runs; (3) the frame-end reducer runs and samples; (4) each kept sample that differs from the last recorded
   value is written." That is what the reference does, and it is not derivable from "the first settle records
   every output that is defined" plus "not the settle-time value" — the first stranger fell into this hole from
   one side, I fell into it from the other.
2. **Say whether the settle-time sample is first-frame-only.** (Ambiguity 2.) One sentence.
3. **Put the outcome event's `port` in the adapter contract**, not only in the schema's description.
4. **Give `ValueInputDecl.default` an explicit "absent means `undefined`"** and a note that a reducer reading
   `inputs.x` before the first write sees that, not the state's initial value (String Format's `format`
   input/state mismatch is the example).
5. **Resolve the "spec error" sentence under `DerivedPorts`**: say "the target ignores the derived
   registration and the placeholder reads its own unset value" or "the target throws" — not both.
6. **State the frame-end reducer's contract for an empty frame** ("called even when no step ran").
7. **Add one scenario per node that ends the first frame with an output `undefined` after a defined value**
   (Boolean To String: `{ input: true, trueString: undefined }`; Inverter: `[{set: value, value: null},
   {set: value}, settle]`). The generated phase found the first-frame hole at 200; a hand scenario would have
   named it in the `because` line.
8. **The test's report prints `interpreter` for the reference** even though the spec calls it "the reference"
   elsewhere; harmless, but a stranger who has been told not to read `interpreter.ts` blinks at it.

## 7. Design of the target

The engine (`target.js`) is a *frame ledger* wrapped around ordinary mutable JavaScript classes (`nodes.js`):
each node keeps its own fields, exposes `read()` returning every value output, and has one method per port
that receives an `fx` object with three verbs — `pulse(signal)`, `outcome(kind)`, `only(...outputs)`. After
every write, pulse or frame-end call the engine reads the outputs the step was allowed to send and keeps the
last defined value per output in the ledger; `close()` (settle) writes the ledger out as settle, changed values
sorted by name, pulses, outcomes, then empties it. Derived ports are a small registry per instance
(`atMount(params)` and `accept(name)` on the node class), consulted only after the declared ports. There are
no reducers, no patches, no frozen state and no spec object; the coercion table and the canonicaliser are
re-written from the tables in `coerce.ts` and `canonical.ts`.

## Round 2b (NSP-013 s12) — Boolean To String v2

**What changed, as read from the spec.** `version: 2` adds a same-value guard to the two string inputs.
Writing `String for true` (or `String for false`) with a value `===` to the one the node already holds now
does nothing at all: no state change and an empty `send` list (`{ send: [] }`), so the write records nothing
on the wire. Only a *different* value is stored, and it is sent exactly as in v1 (true string only while
Selector is truthy, false string only while it is not). `Selector` already had this guard in v1; the strings
now match it. It is observable in one case, which the new scenario pins: the initial strings are `''`, so
`falseString = ''` at mount sends nothing; if Selector then flips to true while `String for true` is unset
(`undefined`) in the same frame, Current Value ends the frame `undefined` and the wire stays empty, where v1
would have carried the `''` the mount write sent.

**What I changed** (`nodes.js`, Boolean To String only):

```js
// v2: a string identical (===) to the one held does nothing at all, not even a send
trueString(fx, v) { if (this.yes === v) return fx.only(); this.yes = v; fx.only.apply(fx, this.sel ? ['currentValue'] : []); }
falseString(fx, v) { if (this.no === v) return fx.only(); this.no = v; fx.only.apply(fx, this.sel ? [] : ['currentValue']); }
```

`fx.only()` with no arguments is my engine's "send nothing", the same verb the v1 `input` guard used.

**Readings.**
- Before the change: `npx jest tests/stranger.test.ts -t "round 2"` → exit 1, `Tests: 1 failed, 25 skipped,
  15 passed, 41 total`. The one failure was the new scenario "String for false = '' at mount equals what the
  node already holds: nothing is sent, so a Selector picking an unset String for true in the same frame
  leaves the wire empty".
- After: `npx jest tests/stranger.test.ts -t "round 2"` → exit 0, `Tests: 25 skipped, 16 passed, 41 total`.
- After, both rounds: `npx jest tests/stranger.test.ts` → exit 0, `Tests: 12 skipped, 29 passed, 41 total`.

**Where the spec alone was thin.**
1. The spec carries no changelog. `version: 2 // NSP-013 s12: the :43 / :57 same-value guard (v1 dropped
   it)` names the change only by line numbers in a runtime file a stranger may not read. I found the change by
   comparing the reducers with my own v1 code. One line in prose ("v2: a string write equal (`===`) to the
   held string sends nothing and stores nothing") would let a stranger find it without a diff.
2. The behaviour itself was unambiguous from the reducer code (`s.t === v ? { send: [] } : …`). The prose
   comment explains why it matters (the empty-wire case) well. Two edge cases follow from `===` without being
   said: `NaN` written twice is never "the same" (it stores and sends each time), and `undefined` after the
   initial `''` is a change. I followed `===` literally. The scenarios did not need either case.
3. The port descriptions are unchanged and still do not mention the guard. That is fine for an author, but
   it means the description is not enough to implement the node.
