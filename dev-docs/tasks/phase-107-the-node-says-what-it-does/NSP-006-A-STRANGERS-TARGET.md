# NSP-006 — A stranger's target

**Opened 2026-09-29.** **Depends on NSP-004.**
**Status: ✅ built and graded — s5, 2026-09-30. The thesis held: a stranger built the pilot five in plain JS from the spec and the suite alone, green on its FIRST run at 200 and 10,000, every mutant caught both ways; 15 ambiguities written up, 14 fixed as sentences in the format files + a schema fix; one hole the pilot five cannot see, measured (§5.4). **s6 (2026-09-30): round 2 — a fresh stranger handed Inverter + Boolean To String beside the five: 7 / 7 conform at 200 and 10,000, 78 / 78 mutants caught; Inverter (the §5.4 shape) right on run 1; one new hole (the mount-time read) → a procedure sentence; §5.6. **s13 (2026-10-01): round 3 — five nodes that live by the WORLD (Delay, Repeat, Animate To Value, UUID, Screen Resolution): 5 / 5 at 200 and 10,000, 81 / 81 mutants caught, on its FIRST run — which grades less than it sounds (§5.7).**

## 1. The person sentence

> **An agent that has never seen the NodeGX runtime builds the pilot five for a brand-new target
> from the spec, the suite and the adapter interface alone — and the suite, not the agent, says
> when it is done.**

This is the phase's thesis, tested directly. If it fails, the batches are a documentation
exercise; if it passes, every future target (framework-free web, native, a cloud runtime in
another language) is a mechanical, parallel job.

## 2. What to do

1. **The target:** plain JavaScript, no framework, no `@nodegx/core` — a tiny signal library the
   agent writes itself. Deliberately different from both existing implementations.
2. **The brief** handed to a fresh subagent contains only: the five spec files, their JSON
   scenarios, the trace schema, the `TargetAdapter` interface, and the runner command. **It is
   not given** the runtime source, the exporter, or this phase's README. (A worktree with those
   paths removed is the simplest way to be sure — memory: use `make-worktree.sh`.)
3. The agent loops until the runner is green, then writes up what was ambiguous.
4. **The suite is read-only to the agent.** The runner hashes the spec and scenario files before
   and after; a changed hash fails the run regardless of the result.

## 3. Acceptance criteria

1. The stranger's target conforms on all five at the **deep** budget, with the suite's hashes
   unchanged.
2. The mutants (NSP-003 AC3) are also run against the stranger's target's own adapter to show the
   suite is not trivially satisfied by it.
3. §5 records: the agent's questions (every place the spec was ambiguous), time and tokens spent,
   and how many runner iterations it took. **Each ambiguity becomes a spec fix** before the batches
   start.
4. The target is **not** kept as a product. It stays in the repo as a test fixture (a second
   independent implementation catches spec bugs the runtime shares with its own spec).

## 4. Watch for

- **A stranger who reads the runtime anyway is not a stranger.** Check the brief and the worktree,
  and ask the agent in its final report which files it opened.
- If it passes easily, suspect the suite before celebrating (memory: *a green gate pins nothing if
  the hole is shaped like the defect*). AC2 is there for that.

## 5. Built — s5, 2026-09-30

**Where.** `packages/nodegx-node-spec/stranger/` — the stranger's target, kept as a fixture (AC4): `target.js` (exports
`strangerTarget()`), `engine.js` (its own cell / patch / frame model, 175 lines), `canon.js`, `coerce.js`, `nodes/{counter,
switch,and,condition,string-format}.js`, and its own `REPORT.md` verbatim (the seven sections the brief asked for).
`tests/stranger.test.ts` is the runner command it looped on and now the permanent gate: the hash gate over the 16 files it
was handed (`tests/stranger-suite-hashes.json`, refreshed by `tests/stranger-suite-hashes.helper.js`), AC4 as a static check
(nothing under `stranger/` requires anything outside `stranger/`), AC1 at 200 with the interpreter-side mutants, a schema
validation of every trace it produces, **AC2 the other way round** (each mutant of a spec as the REFERENCE, the stranger as
the actual — every mutant must be caught somewhere in the suite), and the deep run behind `NSP_DEEP`.

### 5.1 How the stranger was isolated (the brief is the record)

Not a worktree: a worktree carries the whole git history, and `git show HEAD:packages/noodl-runtime/...` recovers every
runtime file the brief removed. The lab was a **copy** of this package alone, with no `.git` above it:
`<scratch>/stranger-lab/{tsconfig.json (the root one, for `extends`), node_modules → primary's, packages/nodegx-node-spec/}`,
trimmed to the pilot five (the 13 batch specs, their scenarios and every test but `stranger.test.ts` removed; `src/nodes/
index.ts` rewritten to the five). The stranger's brief (kept beside this file as [NSP-006-BRIEF.md](NSP-006-BRIEF.md))
listed exactly what it may read — the six format files, the five specs, the five scenario files, the export NAMES of
`src/index.ts` / `src/runner/index.ts` / `src/nodes/index.ts`, and the test — and forbade `src/interpreter.ts`,
`src/adapters/`, the bodies under `src/runner/`, `node_modules`, any parent directory, git and the web. It was a
`general-purpose` agent on the session's own model, non-isolated, pinned to the lab path by absolute paths.

**Checked, not trusted:** its "files opened" list (20 entries, §2 of its report) was compared with its transcript — every
read was a `cat` of a listed file; no `Read` tool calls at all; nothing under `src/adapters/`, no runner body, no
interpreter, no parent. The lab's hash gate passed at the end and the copy's 16 guarded files were byte-identical to
primary's at the start.

### 5.2 The numbers (AC1, AC2)

| | reading |
|---|---|
| iterations to green at 200 | **1** (four jest runs in all: the first was green on every gate a target can satisfy; the second a deliberate probe of the one it cannot, §5.3 item 1; the third the deep run; the fourth a confirmation) |
| at 200, seed 20726, in the lab | Counter 23/23, Switch 26/26, And 4/4, Condition 16/16, String Format 2/2 mutants killed (interpreter side) — 0 divergences, every scenario passed |
| AC2 — mutants caught BY the stranger | Counter 23/23, Switch 26/26, And 4/4, Condition 16/16, String Format 2/2 — **71 / 71**, none survived |
| at 10,000, shrink on, in the lab | 5 / 5 CONFORM, 0 divergences; 2.1 s / 1.8 s / 2.5 s / 1.5 s / 1.8 s per node |
| at 10,000 again, in primary after the AC3 fixes (hashes refreshed) | 5 / 5 CONFORM, 0 divergences, 18.0 s for the five |
| agent cost | 16:32:31 → 16:38:03 wall clock (5½ min to green; REPORT.md by 16:39:21); 128,821 tokens; 22 tool calls |
| its design | a node is `{ boot, ports, react, fire, outs, pulses, frameEnd?, dynamic? }` returning `{ state, pulse, outcome, error, resolved }` — different words on purpose; a `Cell` per instance with two queues and a fingerprint of the last value sent per output; a canonicaliser rewritten from the table in canonical.ts's docblock |

### 5.3 The ambiguities (AC3) — 15 written up; what each became

Its §1, in its order of cost, with the fix made this session. A "sentence" is a docblock sentence in one of the files it
was handed; every such file is in the hash gate, so the hashes were refreshed and the target re-graded after the fixes.

| # | what the stranger could not tell | it guessed | the suite | became |
|---|---|---|---|---|
| 1 | the port named `''`: `string-format.ts` and its scenario produce it; `schema/trace.schema.json` had `port: minLength 1` | recorded it faithfully | conformance passed, the schema gate failed — **no target could satisfy both** | **schema fix** (found independently by this session's "every trace validates" gate ten minutes before the stranger hit it): the JSON schema, `src/schema.ts` and the verdict-table row in `tests/schema.test.ts` all admit the empty name |
| 2 | what the FIRST settle sends (no previous settle to have "changed since") | nothing recorded yet ⇒ every defined output, `null` included | confirmed by scenarios whose `because` cites `node.ts :555-565` — a file it may not have | sentence in `adapter.ts` `settle()` + `trace.ts` |
| 3 | the baseline after an output ends a frame `undefined` | undefined sends nothing and keeps the baseline | ungraded by the five | sentence in `adapter.ts` — **and §5.4: it got the other half wrong** |
| 4 | does `set` carry the raw or the coerced value | raw | passed | "AS SENT" in `adapter.ts` `set()` |
| 5 | does `inputs[port]` hold the old or the new value inside a value reducer | new | ungraded | sentence above `Reducers` in `spec.ts` |
| 6 | equality for "changed" | canonical | ungraded (all five outputs are primitives) | "CHANGED means…" in `adapter.ts`, `trace.ts` |
| 7 | collation of "sorted by port name" | code-unit order | only Condition has two value outputs | "code-unit order" in `adapter.ts`, `trace.ts` |
| 8 | a declared input and a `discover`ed port with one name (`{format}`) | declared wins | never generated at 10,000 | sentence above `DerivedPorts` in `spec.ts` |
| 9 | a set on a signal port / a signal on a value port | throw | never generated | "a KNOWN port of the other kind throws" in `adapter.ts` |
| 10 | where `afterInputs`'s emits land | after the frame's queued pulses | unobservable (Condition's `eval` emits nothing) | sentence in the `AfterInputs` docblock |
| 11 | `deferred` outcomes | implemented, untested | none of the five defers | told to the next stranger (the brief lists what the five do not exercise) |
| 12 | must a target compute `inputs(params)` at mount | yes, coerce by whichever declaration registered the port | unobservable | the same `DerivedPorts` sentence |
| 13 | `js-*` coercion of a set with no value ⇒ `'undefined'` | spec-literal | agreed | sentence in `coerce.ts` |
| 14 | the `row` field, and the runner's "no longer reproduces here — close the row" printed on a stranger | read it as a failure that was not one | — | `scenarios/README.md` (the scenario shape in a file a stranger may read); the runner's line now says "does not reproduce on <target> — expected on a target without the runtime's defect"; `tests/pilot.test.ts` follows |
| 15 | every rule leads with a citation to `counter.ts :126`, `node.ts`, FH-022, DEF-046 — files and tickets it cannot have | recovered the behaviour "from the reducer bodies and port descriptions alone — but only just" | — | the **authoring rule** in `spec.ts`'s header: the rule in plain words before the citation. NOT applied retroactively to the five specs' comments this session (their reducer bodies carry the rule; the `because` lines are the reviewer's) — NSP-018 owns the sweep |

Files it wanted and did without: `src/runner/compare.ts` (are `set` events compared? — it probed with a run instead),
`src/runner/generate.ts` (the value vocabulary), `src/schema.ts`, the package README. The first two are fair asks for the
next brief: the comparison rule is now in `adapter.ts`; the generator's pools are `generate.ts` `POOLS`, and a target's
canonicaliser must survive them (it wrote a defensive one).

### 5.4 The hole the green gate has (AC — §4's warning, taken)

"If it passes easily, suspect the suite." AC2 says the suite is not trivially satisfied — every one of 71 mutants is
caught by the stranger's target. But **the stranger's engine reads its outputs only at settle** (`engine.js` `endFrame`:
`this.def.outs[name](this.state)` once, after `frameEnd`), and the format's rule is that a frame sends the last DEFINED
value an output held after ANY step (NSP-011 decision 2, from Inverter). None of the pilot five has an output that passes
through `undefined` mid-frame, so 10,000 sequences could not tell. Measured, not read: a probe node on its engine whose
output goes `null` then `undefined` in one frame records **nothing** where the interpreter records
`{ t: 'value', port: 'out', value: null }` — the same divergence NSP-011 saw 12 times in 200 on Inverter before the
interpreter observed after every step. So: **the pilot five grade a target's frame model only where the settle-time value
is the frame's value.** The sentence is now in `adapter.ts` (item 3's fix carries both halves), and the next stranger round
gets Inverter and Boolean To String beside the five (README §5's order: a stranger is re-run when the format grows).
The stranger's target is kept AS IT IS — a fixture that conforms on the five — with this row written here rather than
patched into its code, because a fixture nobody but the suite edits is the point (AC4).

### 5.5 Acceptance, honestly

- **AC1** ✅ 5 / 5 at 10,000, hashes unchanged in the lab; and again in primary after the AC3 fixes, hashes refreshed
  in the same commit.
- **AC2** ✅ 71 / 71 mutants caught with the stranger as the actual (a permanent test).
- **AC3** ✅ 15 ambiguities recorded; 14 became a sentence, a schema fix or a README this session; 1 (the citation-first
  style of the five specs' comments) is a rule written down and a sweep NSP-018 owns. The "before the batches start"
  clause was already false when this task ran (NSP-011 shipped in s4 under R4 (a)) — the sentences fixed here bind the
  batch specs too, and none of the 13 changed behaviour (18 / 18 still conform on the runtime, §5.2's re-grade covers
  the five on the stranger).
- **AC4** ✅ a fixture; the static check refuses any `require` outside `stranger/`.
- **§4's warning** ✅ taken: the hole named and measured (§5.4), not celebrated past.

### 5.6 Round 2 — s6, 2026-09-30: Inverter and Boolean To String beside the five

The direct test of §5.4's fix: a FRESH agent (same model, same lab recipe — a copy with no `.git`, trimmed to the seven
nodes; brief in [NSP-006-BRIEF-2.md](NSP-006-BRIEF-2.md), which also answers the two things round 1 asked for up front:
no node defers, and the generator's value vocabulary) handed the five plus the two nodes whose output passes through
`undefined` mid-frame. Fixture kept at `packages/nodegx-node-spec/stranger-2/` (`target.js`, `nodes.js`, `canon.js`,
`coerce.js`, its `REPORT.md`); `tests/stranger.test.ts` now grades every round listed in
`tests/stranger-suite-hashes.helper.js` (round 1 the five in `stranger/`, round 2 the seven in `stranger-2/`), one hash
file for both. Its 26 tool calls were read against the brief: every read a `cat` of a listed file; nothing under
`src/adapters/`, no runner body, no interpreter, no parent.

| | reading |
|---|---|
| iterations to green at 200 | **3** (run 1: 6 / 7 — Boolean To String, the mount-time read below; run 2: that node alone, green; run 3: all seven) |
| **Inverter on run 1** | **CONFORMS** — the `null` then `undefined` shape of §5.4, right first time from the sentence written in s5 |
| at 200, seed 20726 | 7 / 7 CONFORM; mutants caught by the stranger **78 / 78** (23 · 26 · 4 · 16 · 2 · 1 · 6) |
| at 10,000, once | 7 / 7 CONFORM, 0 divergences, 0.8–1.5 s per node |
| in primary, both rounds | 29 tests green (12 deep skipped) |
| cost | 8 min wall clock (16:58–17:06); 141 k tokens; 26 tool calls |
| its design | mutable classes per node with one method per port and an `fx` of three verbs (`pulse`, `outcome`, `only`); a frame ledger that samples the outputs a step may send after every call and keeps the last defined value; `close()` writes the settle |

**The one correction, a new hole (§5.4 was closed, this one was under it):** *when* the "first settle records every
defined output" read happens. The stranger read them at MOUNT (before the params were applied) and published the `''`
Boolean To String held at mount for a sequence whose only step set `falseString` to `undefined` — the reference sends
nothing. The rule, now a sentence in `adapter.ts` as the procedure it asked for: per-step samples keep the last defined
value; every settle samples once more after the frame-end reducer, and an `undefined` sample never replaces a defined
one; **mount is not a sample**. Two strangers fell into this frame from opposite sides (round 1 read only at settle; round
2 read at mount too).

**Its 13 ambiguities, what each became** (its REPORT.md §1 is the record): 1 the mount read → the procedure sentence;
2 "settle-time sample first-frame only?" → the sentence says every settle (the interpreter's `observe(inst)` at
`settle`, interpreter.ts) — and an open format row **F1** below; 3–4 `afterInputs` on a frame with no steps → "every
settle, steps or none" in `spec.ts`; 5 a port with no `default` → "`undefined` when absent; reducers read state" in
`spec.ts`; 6 the `DerivedPorts` "spec error" / "unset placeholder" pair → one behaviour, rewritten; 7 the outcome
event's `port` → a sentence in `adapter.ts` and on the `trace.ts` union; 8–13 (one outcome per invocation, digit-named
params order, an unknown param at mount, a discoverable name pulsed, frozen state, canonicalise-at-record) → not graded
by any node yet, left as they are. Its item 7 of "what I would change" → **two hand scenarios added** (Inverter: `null`
then `undefined` in one frame; Boolean To String: String for false set to nothing before the first settle), both pass on
the runtime (38 / 38) and on both strangers; the hashes refreshed in the same commit. Its item 8 (the report says
`interpreter` for the reference a stranger is told not to read) — cosmetic, left.

**F1 — an open row for the format, not for Richard:** the interpreter samples every output at EVERY settle
(interpreter.ts `observe` in `settle`); the runtime target reads getters nothing sent at the FIRST settle only (a wire
made before the first frame reads the getter; afterwards only sends reach a wire). The two agree on all 18 specs at
10,000 because no spec's `send: []` step changes an output that is still defined at settle. A spec that did would grade
the two differently — the interpreter would record a change the runtime never sent. NSP-001 / NSP-018 own the sentence
that settles which one the format means; the runtime's is the safer reading (R3 (a)).

### 5.7 Round 3 — s13, 2026-10-01: five nodes that live by the world

Due seven times over (graphs s7, the world s8, the registry s9, the tree s10, zone + digest s11, the clock rule s12,
the viewport s13). The round takes the WORLD first — the seam every later target needs and no stranger had seen:
Delay (timers, `cancel`, `pending` outcomes settled by a handler), Repeat (the frame time), Animate To Value (the
scheduler, raw arithmetic, a `row` scenario), UUID (the random stream), Screen Resolution (the viewport, no window).
None needs a Node built-in. Same lab recipe (a copy with no `.git`, trimmed to the five + `ease-curves.ts`;
`src/world.ts` added to the read list and to the round's guarded files; `src/registry.ts` forbidden). Brief:
[NSP-006-BRIEF-3.md](NSP-006-BRIEF-3.md). Fixture: `packages/nodegx-node-spec/stranger-3/` (`target.js`, `nodes.js`,
`canon.js`, `curves.js`, its `REPORT.md`). The harness first learnt to hand each play a fresh `World` from the
scenario's or sequence's script in the schema and AC2 tests (it played world specs worldless; rounds 1–2 unmoved).

| | reading |
|---|---|
| iterations to green at 200 | **1** — no failing run at all |
| at 200, seed 20727 | 5 / 5 CONFORM; mutants caught by the stranger **81 / 81** (32 · 21 · 25 · 2 · 1); the C19 `row` scenario "does not reproduce" on it, as on the interpreter |
| at 10,000 | 5 / 5, 0 divergences (lab, and again in primary) |
| in primary, three rounds | 41 green, 17 deep skipped |
| cost | 4.5 min (15:18:49–15:23:09); 157 k tokens; 25 tool calls |
| its design | imperative classes per node (`receive`, `trigger`, `frameEnd`, `read`) that never see the `World` — each gets a `link` closure (clock, a uuid, the screen size, a resize subscription) backed by what `install()` stored |

**Checked, not trusted:** its 25 tool calls, read from the transcript: every read a `cat`/`sed` of a listed file;
one `Read` of the harness's saved copy of its own `cat src/spec.ts` output (outside the lab, content = `spec.ts`);
two jest logs written to the scratchpad above the lab and deleted. Nothing under `src/adapters/`, no runner body, no
interpreter, no registry, no parent. Both breaches it reported itself.

**What a first-run green grades, honestly.** Nothing failed, so the suite corrected none of its 12 guesses — and by
its own account 8 of them cannot be seen through these five nodes (no output passes through `undefined` inside an
`advance` or at mount, so the round-2 sampling hole is NOT re-checked here; no node makes a request; UUID has 2
mutants and Screen Resolution 1). The round shows the world's RULES are enough to build against; it does not show
the sampling procedure under world deliveries. A round 4 should carry a node whose output goes `undefined` inside an
advance, and more mutants for the thin ones (a lazy first draw, a missing `listen`, a handler that does not re-read).

**Its ambiguities, what each became:** (1) two world APIs and no map between them — a `WorldView` ↔ `World` table,
"A TARGET'S VIEW", in world.ts's header; (2) what `dispose` owes the world and (3) what `advance` records with
several instances mounted — the same paragraph; (7) "until nothing more is due" at a settle — spec.ts now says only
what is ALREADY delivered can be (an at-once answer to this frame's request), never a timer or a resize. (4), (5),
(6), (8)–(12) were read right and are not graded by these five; (10) `jumpTo` "a rising edge" vs a signal — the
format's signal IS the edge. Hashes refreshed for `spec.ts` and `world.ts`; all three rounds re-graded green.

Round 4, named: Hash (digest — a hand-written SHA-256 or a world `digest` member), the date nodes (the zone — and
jest's `process.env` copy, a trap a stranger would meet), the registry nodes, and a graph target.


### 5.8 Round 3b — s16, 2026-10-01: a CHANGE handed to a stranger (Animate To Value v2)

C19 was ruled "fix it", so Animate To Value's spec went to **v2** (an Easing Curve that is not one of the set's own
names moves along Ease Out; v1 left the value where it was) and its scenario file and `ease-curves.ts` (both guarded)
changed. Round 3's target implemented v1 faithfully and went red, as round 2's did for Boolean To String v2 (round
2b, s12). The same recipe: a lab copy with no `.git`, a FRESH agent handed only the format, the five specs, their
scenarios and the target it inherits — told that ONE spec moved, not which. Brief:
[NSP-006-BRIEF-3B.md](NSP-006-BRIEF-3B.md); its report is the "Round 3b" section of `stranger-3/REPORT.md`.

| | reading |
|---|---|
| found the change by | `grep version` over the five specs (one says 2), then the version note — "the note alone was enough" |
| change | one method (`Glide.frameEnd`): `shapeNamed(name) \|\| shapeNamed('easeOut')`, two `if (shape)` guards gone |
| before / after, narrowed | `1 failed, 1 skipped, 8 passed` exit 1 → `1 skipped, 9 passed` exit 0 |
| full, then deep (`NSP_DEEP=10000`, the one node) | `17 skipped, 41 passed, 58 total` exit 0; v2 CONFORMS, 16/16, 10000/10000, 25/25 mutants |
| cost | 2 min 12 s (19:58:29–20:00:41); 86 k tokens; 18 tool calls |
| in primary, three rounds, after the scenario fix below | `17 skipped, 41 passed, 58 total`, hash gate green |

**Checked, not trusted:** its 18 tool calls, read from the transcript — every one inside the lab, every read a file
on the list; no interpreter, adapter, runner body, registry, other round's target, parent or git.

**What it caught — the round's value.** (1) One of the two v2 scenarios I wrote ("an empty Easing Curve …") graded
NOTHING: it set Target Value 10 as the node's first number, which is adopted outright, so no run and no curve; it
passed on the v1 target. Fixed after the round (a 0 first) and checked as a control: on the v1 target BOTH v2
scenarios now fail, on v2 both pass. (2) `ease-curves.ts`' header still said an unknown name "looks up `undefined`"
as if that were the node's rule — rewritten. (3) No mutant encodes v1 (the count stayed 25), so mutation grades
nothing about a version change. (4) The format has no home for a change note and a target cannot say which version
it implements — an out-of-date target reads as trace differences. (3) and (4) are NSP-010's ("a change is a
version"), named there.
