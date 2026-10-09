# NSP-017 — The escape hatches: the Expression grammar, and the Function/Script contracts

**Opened 2026-09-29.** **Depends on NSP-011.**
**Status: 🟡 s65 (2026-10-09): the Function specced as a CONTRACT (AC2 planted and shown, AC3 built — the ledger's own column); rows C146, C147 — §6.2. The CSS Definition exempt — Richard ruled "leave it out" (README R17, `exemptions.json`); C145 ruled "block the three names" (P109's). s64: the Expression conforms on the runtime (1 of 5) — 33 scenarios, at 200 on six seeds and at 10,000, every mutant killed; rows C144, C145. §3's premise measured wrong for the Expression (its text is JavaScript, not a grammar of ours) — §6. Left: Script, Visual Function (their contracts), AC1's export half, AC3.**

## 1. The person sentence

> **Where a person writes their own code into a node, the spec says exactly what that code can see
> and how its results come out — so the code they wrote runs the same on every target, even though
> the spec cannot say what the code does.**

## 2. The nodes (from the census)

**5**, from the census ([CENSUS.md](CENSUS.md), NSP-000, generated 2026-09-30). Regenerate the census; do not edit this list by hand.

- **T6 escape hatch (5):** CSS Definition · Expression · Script (`Javascript2`) · Function (`JavaScriptFunction`) · Visual Function (`Logic Builder`)

Census notes:
- **CSS Definition** — web-only by nature — exempt with that reason, or spec only its outputs
- **Expression** — not really an escape hatch — its grammar is ours; the most valuable spec in the batch
- **Visual Function** — the Blockly node; the user's blocks are the behaviour

## 3. What to build

- **Expression is not really an escape hatch.** Its language is small and ours
  (`expression-evaluator.ts`, `expression-type-coercion.ts`, and their existing tests). Spec the
  **grammar and the coercions** as a table of expression → inputs → result, generated as well as
  hand-written. This is the most valuable spec in the task: every target must evaluate
  expressions the same way.
- **Function, Script, Visual Function:** a **port contract** — how inputs arrive (`Inputs.x`),
  how outputs are published (the *publish only on change* rule), how signals are sent, what
  globals exist, what happens on a throw, and what the sandbox forbids. Graded with a fixed set of
  user-code fixtures that exercise each rule.
- **CSS Definition:** web-only by nature. Exempt with that reason, or spec only what it outputs. **Ruled s65 (R17): exempt** — `exemptions.json`.

## 4. Acceptance criteria

1. Expression: every operator and coercion in the evaluator is covered by a table row, and the
   generator finds no divergence between the runtime and the export at the deep budget (or each
   is a row).
2. Function/Script: each contract rule has a fixture that goes red if the rule is broken (planted
   and shown).
3. The ledger counts these nodes as *specced (contract)* — a distinct status, so nobody reads a
   contract spec as a behaviour spec.

## 5. Watch for

- Memory: *`Function` `Outputs` publishes only on change — use a fresh object.* This is the
  contract's most surprising rule; it gets the first fixture.
- Memory: *`.catch()` misses a synchronous throw.* The throw-handling rule needs a synchronous and
  an asynchronous fixture.

## 6. Built

### 6.1 s64 (2026-10-09) — the Expression

**§3 was wrong about the Expression, measured.** It said the Expression's "language is small and ours (`expression-evaluator.ts`,
`expression-type-coercion.ts`)" and asked for "the grammar and the coercions as a table". There is no grammar: the node compiles the
author's text as JavaScript — `new Function(<ports>…, 'Noodl', preamble + 'return (' + text + ');')` (expression.ts :455-477, :504,
:783-791). The two files §3 named serve a different feature: an expression typed into ANY node's port (node.ts :340-343, `mode:
'expression'` parameters), which is not a picker node. So AC1's "every operator and coercion in the evaluator is covered by a table
row" has nothing to grade on this node. What IS ours is everything around the JavaScript, and that is what the spec says.

**The spec** (`packages/nodegx-node-spec/src/nodes/expression.ts`, v1) compiles and runs the same text with the same `Function` in
the same engine — the Repeater's Script and Array Map's precedent — and writes down:

- **the ports** — the runtime's lexer (`expression-ports.ts`) as a third byte-identical copy in the spec package, held by
  `tests/expression-ports-parity.test.ts` (as nodegx-export's copy is held by its GAM-002 test); each port with its
  `runOnChange-<name>` checkbox; any other name accepted on first write (a reserved name as a port that does nothing, a
  `runOnChange-x` as `x`'s checkbox, anything else as a STRAY the text does not read);
- **when it runs** — once per frame at the frame's end: a changed value on a ticked port, Run, the text set; the LOAD evaluation over
  ports that never arrived (Evaluate At Load), where a compile failure, a throw or `NaN` is no answer;
- **what it sends** — Result / Is True / Is False / the typed results only when the answer is not `!==` the last, On True or On False
  every evaluation; `null` on the first three until the first answer;
- **failure** — 0, Error, Failure once per distinct message, every waiting Run answered `failure` with the code instead;
- **the positional call** exactly as the runtime makes it: the function compiled with the scope's names when it first runs, the values
  handed in the names' order as they stood when the text was set.

Not in v1: an expression reading `Variables` / `Objects` / `Arrays` (re-run when the global moves — the world's REGISTRY seam, v2),
and Run wired at load (a graph rule — a lone node's Run is never wired).

**How it was built.** Probe first: 36 cases played on the runtime target, then on both targets side by side — identical on the first
try once the spec was written. One generated-run survivor at seed 20729 (`drop-set` on a repeated failure with no Run waiting: the
frame's flag left set would re-run the text) — killed by its SHAPE, a settle after a repeated failure, added to the compile-failure
scenario. One reading was wrong, and measured before it was filed: a `runOnChange-a` parameter applied before the text looked like it
broke the node (nothing ran); it is the runtime working — nodedefinition.ts :519-527 makes it the checkbox, and the port was rightly
passive.

**Readings.** Runtime `NSP_ONLY=Expression`: 33 / 33 scenarios, 200 / 200 generated, 0 divergences, 175 / 175 mutants killed on
seeds 20735, 20734, 13, 20733, 20729 (after the scenario), 7; at 10,000 (`npm run spec-ledger -- --deep Expression`, the day's seed
20735 — the deep block reads no `NSP_SEED`): 0 divergences, 175 / 175, 55 s. `spec-ledger`: **125 of 147** (T6 1/5), the floor
raised and Expression removed from `owed` in the same commit — the ratchet's first real use.

**AC3 ("specced (contract)", a distinct status)** is not needed for the Expression: it has a behaviour spec, graded like any other.
It stays for Function, Script and Visual Function, whose code the spec cannot run as the runtime does without the author's text.

### 6.2 s65 (2026-10-09) — the Function, a contract; the CSS Definition exempt

**Two rulings first (README R17).** The CSS Definition: **"Leave it out"** — exempt as web-only by nature (`exemptions.json`); the
recommendation had been to spec its stylesheet as a page effect, so nothing grades that an export or a new runtime adds its CSS. And
C145: **"Block the three names"** — P109's.

**The Function (`JavaScriptFunction`) is a CONTRACT (AC3).** The spec (`packages/nodegx-node-spec/src/nodes/function.ts`, v1, with
`contract:` set) runs the author's code the same way the runtime does — the same five parameters (`Inputs`, `Outputs`, `Noodl`,
`Component`, `Scripts`), the same prefix, the same receiver — and writes down everything around it, each rule with its line:

- **ports** — `Inputs.x` → `in-x` with its `runOnChange-in-x`; `Outputs.y = …` → `out-y`; `Outputs.z()` → the signal `out-z`; the
  written lists' rows with their type pickers. The reader is `@nodegx/project-contract/function-ports`, carried as a byte-identical
  copy (`src/nodes/function-ports.ts`, held by `tests/function-ports-parity.test.ts`) — the package depends on nothing in the repo;
- **when the code runs** — once a frame, at its end: the Script set, Run, a CHANGED value on a ticked input (`undefined` and every
  object count as changed); a Script set to nothing asks for no run;
- **what the code sees** — `Inputs` is the node's own object (what the code writes there is what the next arrival is compared with),
  `this` is kept across runs, `Noodl` carries `Inputs` and `Outputs`;
- **what comes out** — a write sends only when `!==` the last write; a signal output is a function on `Outputs`, fired at once; Success
  when the (async) code has finished, then Done for each Run;
- **a throw** (sync, or after an `await`) — Error in JavaScript's words, Failure or each Run answered `failure`; **a compile failure**
  — the engine's message, the same; **no script** — a Run answered Unchanged.

**THE FIXTURES** (`FUNCTION_FIXTURES`, exported): ten scripts, one per rule — `sum`, `count` (`this` counts the runs: once a frame,
once per changed input), `signal`, `throws`, `late` (a write, an `await`, a throw), `bare` (a string thrown), `broken`, `empty`,
`fresh` (a new object every run), `rewrite` (the code writes to `Inputs`). They are the Script port's examples, so the generator plays
them as an author edits the Script while the app runs. **The spec's await:** a fixture awaits only a settled value (`await null`), which
resumes inside the settle's own yield, so the spec runs the body with its `await`s removed — the same effects in the same order.
**The play's ports:** every fixture's outputs are on the node from the placing (what a project's saved `dynamicports` give the model);
the runtime face now builds the lone node's `model.outputPorts` from the spec's derived outputs, and reads a derived SIGNAL output as a
signal (the Function's signal getter returns the function the code calls — it was read as a value and could not be canonicalised).

**Publish on change — NSP-017 §5's "most surprising rule", its first fixture — cannot be seen on a lone node** (its trace never
repeats an unchanged value), so it is graded through the graph: `scenarios/graph/t14-a-function-publishes-on-change.json`, three
scenarios, one Function feeding another that counts its runs — the same value written again: the second does not run (an absence
claim beside two known-firing ones); a fresh object every run: it runs every time; the same value written in a run that fires a
signal (GAM-011): it runs again.

**AC2, planted and shown** (`noodl-runtime/test/node-spec/function-contract.test.ts`): thirteen rules, each broken by ONE textual
change to an in-memory copy of `simplejavascript.ts`, registered on a fresh target; the scenario that names the rule goes red every
time, and the copy with no change conforms on all 27 scenarios and bears every graph claim out. (Dropping the call's `await` was the
first plant for "the code is async" and was replaced: it leaves the code's rejection unheard, and jest fails the whole test on it before
a scenario can be read — s59's lesson. The plant used compiles the code as a plain `Function`: `await` no longer parses.)

**AC3, built.** `NodeDecl.contract` (spec.ts) names what a contract's fixtures cover; `spec-ledger.js` counts such a spec in a column
of its own — "1 specced as a contract (Function)" — with its own floor (`floor.contract`), never in `runtime`, whatever grades it (a
graph claim about it included). The new-node gate and `owed` treat it as graded. Two ledger tests: the Function is a contract and the
Expression is not; a planted contract-floor fall fails, named.

**How it was built.** Probe first, both targets side by side: 16 cases SAME on the first try, then two found on the runtime — the
face's signal read (above) and **C147** (`throw null` reports nothing). Mutants at seed 13 left 16 survivors: `lastReported` (the
editor's once-per-message report) was spec state no port can read — removed; three are a stuck flag on a frame end with no script
(STUCK_FLAG, declared as Map Collection's are); the rest were holes, each closed by a scenario read off its shape (an unticked input
read at the next Run; a checkbox written while the app runs, with settles between; a type picker written while the app runs — with
inputs no other play holds, because a swap hands the RICHEST sibling example and one from the same play reads the same).

**Readings.** Interpreter (`tests/batch-escape.test.ts`, seeds 13, 20735, 7, 20729): 27 scenarios, 200 generated, 0 divergences, 180 /
180 mutants killed (3 declared equivalent). Graph: t14's 3 scenarios hold on the runtime and the recorded traces bear them out
(`tests/graph.test.ts` 126 / 126). AC2: 15 / 15. `spec-ledger --check`: holds at 125 / 147 on the runtime, 1 as a contract, 2 on the
export; 19 owed. Runtime `NSP_ONLY=JavaScriptFunction`: 27 / 27 scenarios, 200 / 200 generated, 0 divergences, 177 / 180 mutants killed + 3 declared equivalent, on seeds 20735, 13, 20734 and 7; at 10,000 (`npm run spec-ledger -- --deep JavaScriptFunction`, seed 20735): 0 divergences, 60 s.

Not in v1: Uses (the project's script files — a graph seam, ISL-005: `undriven`), `Component`, Noodl's globals, a write to an output no
fixture names (`Outputs[key]`), and the editor's warnings (not on the wire). Script (`Javascript2`) and Visual Function are next.

### 6.3 Rows

| row | what | severity | where |
|---|---|---|---|
| **C144** | An Expression's **Error keeps the last failure after the expression works again**: a working evaluation empties the node's error without sending it (expression.ts :409-415; only `_reportFailure` :355 flags it). The D25 / C47 / D26 family. The spec writes the runtime's behaviour (R3 (a)); the fix moves it in the same commit (Expression v2) | low | [P107-C144](../../bugs/p107-c144-an-expression-s-error-keeps-the-last-failure-after-it-works-again.md) |
| **C145** | An Expression that **reads `run`, `expression` or `evaluateAtLoad` never gets an input for it** and always throws "run is not defined" — the setter skips a name that is already one of the node's inputs (:520-524), while the editor still draws the port | low | [P107-C145](../../bugs/p107-c145-an-expression-that-reads-run-expression-or-evaluateatload-always-throws.md) |

| **C146** | A Function's **Error keeps the last failure after a run that works**, and a new Script empties it without sending it (simplejavascript.ts :645-652 never touches `lastError`; `clearRunDiagnostics` :771-775 flags `undefined`, which is never sent). The C144 twin; D25's ruling ("clear it to blank text") covers it. The spec writes the runtime's behaviour (R3 (a)); the fix moves it to v2 | low | [P107-C146](../../bugs/p107-c146-a-function-s-error-keeps-the-last-failure-after-a-run-that-works.md) |
| **C147** | A Function whose code **throws `null` or `undefined` reports nothing** — no Error, no Failure, a Run never answered: the error logger's `Object.getPrototypeOf(err)` throws inside the catch (utils.ts :24-34, simplejavascript.ts :654). The spec says the intent (Error "null", a failure) and no fixture throws null: an unhandled rejection fails the whole jest suite on the runtime target. Measured beside a `throw 'x'` control | medium | [P107-C147](../../bugs/p107-c147-a-function-whose-code-throws-null-or-undefined-reports-nothing.md) |

All four are P109's under R16.
