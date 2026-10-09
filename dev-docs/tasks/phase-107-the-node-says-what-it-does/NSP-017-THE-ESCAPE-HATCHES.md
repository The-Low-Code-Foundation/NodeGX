# NSP-017 — The escape hatches: the Expression grammar, and the Function/Script contracts

**Opened 2026-09-29.** **Depends on NSP-011.**
**Status: 🟡 s65 (2026-10-09): the CSS Definition exempt — Richard ruled "leave it out" (README R17, `exemptions.json`); C145 ruled "block the three names" (P109's). s64: the Expression conforms on the runtime (1 of 5) — 33 scenarios, at 200 on six seeds and at 10,000, every mutant killed; rows C144, C145. §3's premise measured wrong for the Expression (its text is JavaScript, not a grammar of ours) — §6. Left: Function, Script, Visual Function (the port contract), AC1's export half, AC3.**

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

### 6.2 Rows

| row | what | severity | where |
|---|---|---|---|
| **C144** | An Expression's **Error keeps the last failure after the expression works again**: a working evaluation empties the node's error without sending it (expression.ts :409-415; only `_reportFailure` :355 flags it). The D25 / C47 / D26 family. The spec writes the runtime's behaviour (R3 (a)); the fix moves it in the same commit (Expression v2) | low | [P107-C144](../../bugs/p107-c144-an-expression-s-error-keeps-the-last-failure-after-it-works-again.md) |
| **C145** | An Expression that **reads `run`, `expression` or `evaluateAtLoad` never gets an input for it** and always throws "run is not defined" — the setter skips a name that is already one of the node's inputs (:520-524), while the editor still draws the port | low | [P107-C145](../../bugs/p107-c145-an-expression-that-reads-run-expression-or-evaluateatload-always-throws.md) |

Both are P109's under R16.
