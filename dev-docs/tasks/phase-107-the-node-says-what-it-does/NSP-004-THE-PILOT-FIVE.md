# NSP-004 — The pilot five, and the go / no-go

**Opened 2026-09-29.** **Depends on NSP-003.** Ends by asking **R4**.
**Status: ✅ built s3, 2026-09-30 — five specs conform on the runtime at 10,000 sequences, every mutant killed;
2 runtime divergences + 3 documentation divergences found, none caught by an existing test; R4 asked in the
README §7 with the numbers.**

## 1. The person sentence

> **Five nodes everyone uses have a spec, conform on the runtime, and we know — as a number —
> whether writing specs finds things the existing tests missed.**

## 2. The five, and why these

| node | why it is in the pilot |
|---|---|
| **Counter** | State, limits, three outcome signals, an asymmetric setter, and a known historic drift (FH-022) — the worked example |
| **Switch** | A latch; special-cased in `plan.ts` beside Counter (`isLatchType`) |
| **And** | Trivial on purpose — measures the *floor* cost of speccing a node |
| **Condition** | Value in, two signals and a boolean out; compiles away in the export (logic.test.ts Step 6) — sets up NSP-005's hardest case |
| **String Format** | **Dynamic ports** from a parameter — proves NSP-001's design for derived ports |

## 3. What to do

For each node:
1. Write the spec **from the runtime source**, citing the lines each rule came from in a comment
   (R3 (a): the runtime wins by default).
2. Hand scenarios for every edge named in the source's docblocks and in existing tests.
3. Run against the runtime adapter at the **deep** budget (10,000 sequences), locally, alone on
   the box.
4. Every divergence becomes a row in §6: the shrunk sequence, both traces, and a proposed answer —
   *spec wrong* / *runtime bug* / *intended*. **No runtime change in this task.**

## 4. Acceptance criteria

1. Five specs, each with all mutants killed (NSP-003 AC3), **each passing the catalog-parity gate** (R6: port
   names, kinds, display names, groups, descriptions, defaults, outcome ports equal the catalog's) and each
   with `ports(params)` where the node has dynamic ports (String Format, And — NSP-020's first two rows).
2. Each spec conforms on the runtime **or** every mismatch is a §6 row with its replay file.
3. **The pilot's numbers**, written in §6:
   - divergences found, by answer;
   - how many of those an **existing** test already caught (grep the test suites for the
     scenario — if one existed, the spec found nothing new);
   - time spent per node (a session log), and lines of spec per node.
4. **R4 asked in plain words** with those numbers, in the README's §7, and the recommendation.

## 5. How to read the result (for R4)

- **≥ 1 new divergence across the five**, or specs that cost well under a session per node:
  continue into the batches.
- **Zero new divergences and high cost**: narrow to T1 only, keep the runner as a tool for new
  nodes, and skip the batches.
- Either way NSP-005 and NSP-006 are worth doing: they answer a different question (whether
  targets become swappable), which the pilot's divergence count does not.

## 6. Built — s3, 2026-09-30

**Where.** `packages/nodegx-node-spec/src/nodes/{switch,and,condition,string-format}.ts` (registered in `nodes/index.ts`),
`scenarios/{Switch,And,Condition,String Format}.json`, `tests/pilot.test.ts` (24 tests, interpreter side), the
catalog-parity gate grown by one test per node (`dynamicPorts` ⇔ `derived`); the runtime reading in
`packages/noodl-runtime/test/node-spec/conformance.test.ts` (the pilot loop at 200 + mutants, the known rows, and the
env-gated deep run: `NSP_DEEP=10000 NSP_REPLAY_DIR=<dir> npx jest test/node-spec/conformance.test.ts -t deep`;
`NSP_ONLY="String Format"` narrows either to one node).

### 6.1 The pilot's numbers (AC3)

| | Counter | Switch | And | Condition | String Format |
|---|---|---|---|---|---|
| spec lines (code, no comments) | 123 (88) | 92 (62) | 89 (46) | 139 (84) | 109 (58) |
| hand scenarios | 7 | 8 | 6 | 16 | 12 (2 marked `row`) |
| PR-CI reading (200, seed 20726, mutants) | conforms, 23/23 | conforms, 26/26 | conforms, 4/4 | conforms, 16/16 | conforms, 2/2; 113 sequences + 2 scenarios attributed to row C3 |
| deep reading (10,000, shrink, replays) | conforms, 37.5 s | conforms, 36.8 s | conforms, 37.4 s | conforms, 37.3 s | conforms, 46.0 s; **5,719** attributed to C3, **0** unknown |
| unreached branches | 0 | 0 | 0 | 0 | 0 |
| divergences (spec ≠ runtime on the wire) | 0 | 0 | 0 | **1** (C1, → C2) | **1 class** (C3) |
| doc ≠ code found by reading | — | D5 | D1, D4 | (the `[No input]` inspect, already documented in the source) | D2, D3 |
| caught by an existing test already | n/a | — | — | **no** — gam-004 fixes `runOnChange-condition: false` and asserts signal timing, never getter vs wire; def046 counts scheduler calls | **no** — nothing feeds String Format a non-string; the exporter's tests compile it away |

**Divergences found: 2 on the wire + 3 doc-vs-code, 0 of them graded by any existing test.** What the existing tests DID
already pin, the hand scenarios reproduce and pass: Switch's boot announce and Off-when-off (nda-012), Condition's two
coalesced Evaluates and value-arrival-reports-nothing (erg-001 longtail), the same answer twice (def046), Counter's reset guard
(fh-022).

**Time (session clock, one session, 2026-09-30):** 14:52 start; 14:52–14:55 reading the four sources and the s2 files;
14:55–15:02 the four specs' first cut **and** their scenario files (≈ 2 min per node, with the source open); 15:02–15:04
package suite green, parity passes for all five on the first run; 15:04 first runtime reading (Condition C1, String Format
C3 seen); 15:05–15:09 the Condition fix, the two scenarios the run pointed at, the known-row mechanism; 15:09–15:12 the deep
run (3 min 18 s, all five); then the pilot tests and this section. The format extensions (§6.3) were the real cost — about
25 minutes across the session — and they are done for the two idioms that cover most of T1.

### 6.2 The rows — for Richard to rule on (R3 (a): nothing in the runtime changed)

| row | node | what, with the line | how it was found / where it is pinned | proposed answer |
|---|---|---|---|---|
| **C1** | Condition | The spec's first cut published *Is True* / *Is False* from the live input at every settle. The runtime sends them only at evaluation (`flagOutputDirty` :177-178); a value arriving while unticked moves nothing on the wire | generated, seed 20726 sequence 840288232 at 200: `runOnChange-condition: false`, then `condition: -1`, then settle — interpreter `value isfalse false`, runtime `<end of trace>`. Now the scenario *a passive change moves nothing on the wire* | **spec wrong → fixed** (`tested` state; NSP-002 decision 6: the wire is the behaviour) |
| **C2** | Condition | The runtime's two readers disagree: the getters (:133 `!!this.getInputValue('condition')`, :143) read the input LIVE, the wire carries the value at the last test. A wire connected AFTER a passive change is handed a value no test produced (`connectInput` reads the getter, node.ts :555-565), while wires made before hold the tested one. The description says "whether the **last test** found Condition true" | by reading, while fixing C1. No one-node trace arm can show it: the connection-time read happens at the first settle only, when `hasEvaluated` is false and both agree on `null`. NSP-008's graph adapter can (connect after a passive change) | **runtime bug**: cache the tested value at :176 and return it from both getters. A behaviour change — ships alone after the ruling, like FH-022 |
| **C3** | String Format | A non-string on `format` (a wired number, `null`, an object, `undefined`) is stored unconverted (:57); `.match` throws in the after-inputs callback (:81); `nodecontext.ts:472` catches and logs it; `formatScheduled` was set at :114 and is cleared only after `formatValue` (:118) — **so the node never formats again**, a later good format included | scenarios *a wired number on Format* and *after a non-string Format the node never formats again* (both marked `row`); 113 / 200 and 5,719 / 10,000 generated sequences, attributed by a predicate that requires a non-string `set format` BEFORE the first difference | **runtime bug, two of them**: (a) convert on arrival (`String(value)`, what the spec does) or guard `.match`; (b) clear the flag in a `finally` so one bad frame is not a dead node. The second is the worse one and is the general shape of every `hasScheduled…` family — worth a sweep (NSP-011) |
| **D1** | And | Port description "**false when no input is connected at all**" (:57). The code: `result` is `undefined` until an input arrives (:14, :44-46), so nothing is published (C3) and a wire reads nothing | scenario *nothing is published before the first input* | **docs wrong** — or the runtime initialises `result = false` and sends it; either way a ruling. The inspector (:25-28) shows `false` for the same node, so the inspector and the wire already disagree |
| **D2** | String Format | Port description (:52) and the code comment (:91-92): "**a placeholder used twice fills only the first time**". The loop (:89-94) runs once per MATCH and each `replace` fills the first occurrence still standing — `{a}{a}` with `a = x` gives `xx`. Every occurrence fills | scenario *a placeholder used twice fills EVERY time*; `tests/pilot.test.ts` | **docs wrong**, and a comment that says "kept verbatim" about a behaviour the line does not have. The description is published on the port (an-example-description-is-published) |
| **D3** | String Format | `formatted.replace('{' + name + '}', String(v))` (:93): a string pattern still expands `$&`, `$$`, `` $` ``, `$'` in the REPLACEMENT. A value of `$&` prints `{v}` back; `$$` prints `$` | scenario *$-patterns in a value are interpreted*; the spec reproduces it verbatim so the two agree | **intended?** almost certainly not — a price of `$$5` renders as `$5`. Fix is a function replacement, `() => String(v)`; the spec then drops the verbatim call |
| **D4** | And | `registerNumberedInput` (nodedefinition.ts :137-149) accepts any name starting with `input` and parses what follows the space with `Number()`: `input` alone aliases `input 0`, `input 01` aliases `input 1`, `input  2` aliases `input 2`, `input 1.5` lands outside the array's length and is never counted | by reading; the spec's `discover` refuses all of them (only `input <digits>`, what the editor mints) | **intended / unreachable** from the editor; a corrupted project file is the only route. Recorded, no action proposed |
| **D5** | Switch | `_internal.initialized` is set at :24 and read nowhere | by reading | cosmetic; drop it with the next Switch change |

### 6.3 Decisions made here (the format grew three things and the runner two)

1. **`afterInputs(state, inputs) → patch` — the frame-end reducer.** The runtime's `scheduleAfterInputsHaveUpdated` idiom
   (Condition, Expression, Function, String Format, every `hasScheduled…` family — NDA-017 §2 constraint 3) is "collect the
   frame's triggers, do the work once against the frame's final inputs". A reducer records `scheduled: true`; the interpreter
   calls `afterInputs` once per `settle`, before the frame's observations are recorded. Outcomes still come from the invoking
   reducer (they queue to the same settle and the format orders them after signals). Mutants wrap it like any reducer.
2. **`derived.discover(port)` and `derived.candidates`.** `inputs(params)` is what an EDITOR draws (R6's `ports(params)`, now
   graded against the catalog's `dynamicPorts` block); `discover` is what the TARGET registers on first write (the runtime's
   `registerInputIfNeeded`: And any `input <n>`, String Format any name). The interpreter registers a discovered port at its
   default before the write. The generator drives `inputs(params)` for the generated params plus `candidates` — so And's
   200 sequences write to `input 0 … input 3` and String Format's to `name` and to the placeholder its own pool string
   `'Hello, {name}'` draws. No rng draw happens for a spec without `derived`, so Counter's pinned digest is unchanged.
3. **`.on(reducers, extras)`** replaces `.on(reducers, derived)`: `extras: { derived?, afterInputs? }` (NSP-001 §5 struck).
4. **A target that throws is a divergence, not a crash of the run.** `play()` rethrows a `PlayError` carrying the trace up to
   the throw; the runner compares it and marks `difference.threw`, shrinks it like any other, and prints `<threw: …>`. The
   interpreter's own throws (a spec bug) still propagate.
5. **A divergence class written up as a §6 row is COUNTED, never hidden.** `known: [{ row, matches(divergence) }]` on the
   runner; a matched divergence increments the row's count (first example kept, unshrunk) and is not held against
   conformance. A scenario JSON can carry `row`; a failing one reports `known`, a PASSING one reports *the row no longer
   reproduces — close it*. The runtime test asserts each known row **still fires** (`count > 0`), so a fix that lands without
   closing its row goes red — an absence asserted beside a known-firing signal. ⚠️ Predicates must be narrow: C3's names the
   port, the value's type and requires the difference AFTER that step; a wider one eats the next finding (P99: *AUDIT ate it*).
6. **`not-false` coercion** (coerce.ts): the `runOnChange-*` checkboxes untick only on an explicit `false`
   (run-on-value-change.ts :137); `null`, `0`, `""` leave them ticked — unlike `js-boolean`.
7. **Unobservable guards are not carried.** The same-value early returns in And (:37-39), String Format (:55, :126) skip a
   reschedule and nothing else a wire can see; the interpreter already sends a value only when it changed. Carrying them
   would add branches no trace can distinguish, and a `swap-branch` mutant of such a branch could only survive.
8. **The spec models the WIRE where the runtime disagrees with itself** (C1/C2): NSP-002 decision 6, applied.

**Found, not fixed (R3 (a)):** C2, C3, D1, D2, D3 above. The runtime, its descriptions and its comments are untouched.

**A hole in the runner, named:** mutants mutate PATCHES (set / emit / outcome), never an output's `from`. String Format's
behaviour lives almost entirely in `formatValue` (2 mutants; the runtime comparison is what grades it), Condition's booleans in
`from`. An "output-function mutant" kind (return the previous value; return the default) belongs in NSP-009's ratchet before a
node whose whole behaviour is a `from` counts as specced on the interpreter alone.
