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

## s4 (2026-11-03): the engine half — items 1–4, AC1 and AC2 green

**The form stays `{"$fn": "<name>", "args": [...]}`, beside the transform's `{"$upper": …}`, on purpose.** The engine
already had a closed op table (CWF-004, `steps/transform.ts`), but its form, an object whose sole key starts with `$`,
cannot be switched on in every setting: in an ordinary param such an object is DATA (a function may be handed
`{"$in": [...]}`), so reading it as an operation would break definitions that run today. `$fn` is one reserved key, so
it is on everywhere — every step param, every condition operand, a transform's fields — and nothing else is
reinterpreted. The transform keeps its shorthand for reshaping; `{"$upper"}` outside a transform is still data (pinned).

**Built** (`packages/nodegx-backend`):

- `steps/formulas.ts`: the closed table, the spec's 27 (text: `text` `upper` `lower` `trim` `length`; numbers: `add`
  `subtract` `multiply` `divide` `round` `min` `max`; logic: `is-empty` `equals` `default` `not`; dates: `now`
  `add-to-date` `date-difference` `format-date` `start-of`; lists: `count` `first` `last` `sum` `pick` `join`), each
  with a label in words ("Time between"), a **sentence** (`{unit} between {from} and {to}`, for Studio and the agent
  to draw it the same way), typed args (`text` `number` `numbers` `boolean` `date` `list` `choice`+`oneOf` `any`,
  `optional`, `repeats`), what it gives, a description and an example. Pure; no eval; names looked up with
  `hasOwnProperty` (`constructor` is not a formula).
- `values.ts`: `$fn` resolved in `resolveValue` (conditions, Switch, Wait, For Each) and `resolveValueDeep` (params,
  transform); args resolved two levels down, where `exceedsValueDepth` refuses.
- Validate (`WorkflowEngine.validateValueReferences`, every param, raw ones included): an unknown name lists the set
  and says "A setting takes no JavaScript"; wrong arg count; a literal arg of the wrong type ("Divide" needs a number
  for divided by, got "two"); a formula nested where its result cannot fit ("Join" needs a list, and "Count" gives a
  number); extra keys. A `$path` arg is typed only at run. `isValueSpec` (a Wait's duration, a Split's size) knows `$fn`.
- Run: a formula that cannot be computed throws a `FormulaError` in the formula's words. 🔴 **Params were resolved
  OUTSIDE the step's `try`**, so such a throw would have escaped the step (no `onError`, no step named): the error is
  now held and thrown inside it. Dates: ISO text, epoch ms, or `{__type:"Date", iso}`; out is ISO text (conditions
  order it); UTC; a month added to 31 January clamps to February's end, and *Time between* counts by the same rule.
- Served: `formulaLanguage` in `/admin/workflow-step-kinds` (catalog **1.8.0**); `$fn` is the value language's fourth
  form; the four served "no arithmetic — compute in a cloud function" sentences (value language, condition language,
  transform notes and kind) now send a reader to formulas. `docs/runtime/WORKFLOW-NODES.md`: *No expressions —
  formulas instead*, the transform's "not here" list corrected.
- MCP (item 4): `list_backend_step_kinds` names `formulaLanguage`; the step `params` text says "Compute small things
  with a FORMULA … a cloud function is for what no formula or step expresses", where it said "No arithmetic". The
  always-on instructions do not mention workflows at all, so nothing there changed. Budget and backend tool tests 65/65.

| AC | state |
|---|---|
| AC1 | ✅ `tests/workflow-formulas.test.ts`: each of the 27 with a working and a failing case (a case per formula, asserted against the table), the date edges, the served list = the table = the docs page, every served sentence names exactly its args, every served example validates |
| AC2 | ✅ `{"$fn":"eval"}` is a 400 naming the set and "takes no JavaScript"; inside a condition and a transform field too |
| AC3 | Studio: next |
| AC4 | agent run: after AC3 |

Gates: 44/44 formulas; the 18 workflow suites 333 + 3 skipped (ten pinned assertions moved: catalog 1.7.0 → 1.8.0 ×4,
the three value forms → four ×3, the served "no arithmetic" sentences ×3); tsc clean; eslint clean on the new files.
Mutants: no `$fn` in the shallow resolver → 2 red; no formula validation → 3 red; the param error not thrown in the
step → 1 red.

**Found while building:** a number past JavaScript's date range made an Invalid Date whose `toISOString` threw a bare
`RangeError` (not the formula's words); `readDate` now refuses it and a date carried out of range says so.
