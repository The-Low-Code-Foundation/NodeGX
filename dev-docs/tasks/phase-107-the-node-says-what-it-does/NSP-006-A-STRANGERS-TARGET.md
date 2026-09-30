# NSP-006 — A stranger's target

**Opened 2026-09-29.** **Depends on NSP-004.**
**Status: ✅ built and graded — s5, 2026-09-30. The thesis held: a stranger built the pilot five in plain JS from the spec and the suite alone, green on its FIRST run at 200 and 10,000, every mutant caught both ways; 15 ambiguities written up, 14 fixed as sentences in the format files + a schema fix; one hole the pilot five cannot see, measured (§5.4).**

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
