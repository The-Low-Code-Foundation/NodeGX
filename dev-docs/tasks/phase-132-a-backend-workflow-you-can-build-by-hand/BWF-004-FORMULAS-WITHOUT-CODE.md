# BWF-004 — Formulas without code

**Phase:** [132](README.md). **Repo:** NodeGX `packages/nodegx-backend/src/workflow/values.ts` (+ the catalog),
`packages/noodl-mcp` (the agent's words); nodegx-studio (the editor for one). **Ruling:** R2, *"Ok"*: a small fixed
set, no JavaScript in a setting.

## Why

Most of what a person computes between two steps is small: a total, a name joined to a greeting, a date three days ago,
"is this empty". Today that is a cloud function or a `transform` step's JSON (README, point 5). n8n answers it with
`{{ }}` JavaScript; R2 keeps the engine's no-eval rule (`values.ts:19-25`) and answers it with named functions.

## What to build

1. **A third value form** beside `$path` and `$literal`: `{"$fn": "<name>", "args": [<value>, …]}`, each arg itself a
   value (so formulas nest and take `$path`s). Resolved in `values.ts`, pure, no eval, a bounded depth.
2. **The set** (a first cut; each with a one-line description and its arg types in the catalog, so every reader gets
   it from one place):
   - text: `text` (text with values: literals and values joined, BWF-003's pills), `upper`, `lower`, `trim`, `length`
   - numbers: `add`, `subtract`, `multiply`, `divide`, `round` (places), `min`, `max`
   - logic: `is-empty`, `equals`, `default` (the first that is not empty), `not`
   - dates: `now`, `add-to-date` (amount, unit), `date-difference` (unit), `format-date` (a named format, not a pattern
     language), `start-of` (day / week / month)
   - lists: `count`, `first`, `last`, `sum` (of a field), `pick` (a field from each), `join` (with a separator)
3. **Validate knows them.** An unknown name, a wrong arg count or an arg of the wrong declared type is a `validate`
   error naming the formula and the list. A formula that fails at run time (a divide by zero, a date that is not one)
   fails its step with that sentence, through `onError` like any step.
4. **The agent's words.** The catalog carries the set; the MCP's backend instructions say "compute small things with a
   formula; a cloud function is for what no formula or step expresses". No new tool.
5. **Studio.** A setting's value menu offers *A formula…*: pick one by its words ("Days between", "Text with values"),
   fill its arguments with pills (BWF-003) or typed values; drawn as a sentence ("Days between *last watered* and
   *now*"), with *Edit as JSON* behind *More*. Reuse STU-098's composer look where it fits.

## Acceptance

- AC1: a backend test per formula (each with a failing case) and a parity check that every formula in `values.ts` is
  in the catalog and the reverse.
- AC2: `validate` refuses `{"$fn":"eval"}` and names the list.
- AC3: in Studio, *Days since last watered* built from the menu on a copy of Greenhouse with no JSON typed; the test run
  (BWF-002) shows the number.
- AC4: an agent asked "work out how many days since the plant was watered in the workflow" writes a formula, not a
  cloud function (one run, the result read from the file).
