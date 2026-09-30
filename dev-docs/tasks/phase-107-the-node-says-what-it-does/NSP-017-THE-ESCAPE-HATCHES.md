# NSP-017 — The escape hatches: the Expression grammar, and the Function/Script contracts

**Opened 2026-09-29.** **Depends on NSP-011.**
**Status: 📋 not started.**

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
- **CSS Definition:** web-only by nature. Exempt with that reason, or spec only what it outputs.

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

*(empty)*
