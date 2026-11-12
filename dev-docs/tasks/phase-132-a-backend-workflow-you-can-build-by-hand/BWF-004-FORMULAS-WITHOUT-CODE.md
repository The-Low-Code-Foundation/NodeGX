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
| AC3 | ✅ **in the Electron app on a Greenhouse copy** ([greenhouse-drive-bwf004.mjs](greenhouse-drive-bwf004.mjs), the checkout's backend): a Return added after *Mark the plant watered*, its value *A formula…* → *Time between*, its From picked from the run (*at · from the Watering that was made*), no JSON typed; the file and the backend hold `{"$fn":"date-difference","args":[{"$path":"body.at"},{"$fn":"now"},"days"]}`; tested on a Watering made on 28 October: the record's Return gives `value: 6` (6 expected) and the panel says "value 6" ([formula](look/bwf-004-greenhouse-formula.png), [tested](look/bwf-004-greenhouse-tested.png)). Also in Chrome (automations-drive) |
| AC4 | ✅ in s5 (below), on the build-shaped request: a formula, no function. The task's own sentence built nothing (read as a question) |

Gates: 44/44 formulas; the 18 workflow suites 333 + 3 skipped (ten pinned assertions moved: catalog 1.7.0 → 1.8.0 ×4,
the three value forms → four ×3, the served "no arithmetic" sentences ×3); tsc clean; eslint clean on the new files.
Mutants: no `$fn` in the shallow resolver → 2 red; no formula validation → 3 red; the param error not thrown in the
step → 1 red.

**Found while building:** a number past JavaScript's date range made an Invalid Date whose `toISOString` threw a bare
`RangeError` (not the formula's words); `readDate` now refuses it and a date carried out of range says so.

## s4 (2026-11-03): the Studio half — item 5, AC3 green (nodegx-studio `759b834`, `550d82a`)

- A setting is *Typed*, *From the run* or **A formula…**, offered only when the backend serves `formulaLanguage` (on
  the kit's 0.2.9 backend none is offered, graded). The menu is the backend's list in five groups (Text, Numbers, Yes
  or no, Dates, Lists), searchable, each by its label and description.
- A formula picked is saved at once with values the backend takes (`automations.mjs` `formulaStart`: a date is Now, a
  unit days, Add two numbers, an optional arg left out), and drawn as its served sentence (`formulaParts` /
  `formulaWords`: "days between at and now"; an optional arg left out takes its clause with it, "2.456 rounded").
  Each value in it is a `runValueField` of its own, so it is typed, a pill from the run (picked or dragged), or
  another formula. *More*: another formula, *Edit as JSON*, not a formula. A date slot switched to *Typed* starts at
  today's date, since its start (Now) would undo the choice.
- Served sentences changed so a reader can drop an absent optional arg: *Round* "{number} rounded, to {places} decimal
  places", *Sum* "sum of {list}, by {field}".

**Found:** P132-STEPMENUOFFSCREEN ([bug](../../bugs/p132-stepmenuoffscreen-the-step-menu-opened-low-in-the-window-runs-off-its-bottom-and-its-last-kinds-cannot-be-reached.md),
`launch: beta`, fixed in `550d82a`): after a test, *Add a step after* sits low and the step menu ran from 700 to 1260 in
a 1000 px window; *Stop*, *Return*, *Wait*, *Wait until* could not be pressed. Every gate clicked with `.click()`
(`clientY` 0, the menu at the top), so none saw it; the drive now opens it near the bottom and asserts it fits (a
mutant without the fix fails with the app's numbers). 🔴 The Electron drive's own presses were landing below the
window too (y 1161 in 1000): `press` now scrolls its target into view and says when it had to.

Gates: automations-check 98/98; automations-drive 107/107 with `NODEGX_REPO` (dist rebuilt at `8d9907ccf`), 94/94 on
the kit's backend; hosted 46/46; editor green; app 67/67.

**Not built, for later:** a record's date (`at`) unfolds in *What it can read* into `__type` and `iso`; a person wants
it whole, as a Pointer already is. A JSON setting (a Transform's fields, Validate's rules) still takes no formula
control. AC4, the agent run, is open.

## s5 (2026-11-03): AC4, the agent run, and three things it found

**The lab** ([agent-round-bwf004.mjs](agent-round-bwf004.mjs)): a Greenhouse copy with its own backend (the checkout's,
`dist/` built at `8d9907ccf`, run by Studio's `serve.mjs` with `NODEGX_REPO` and `NODEGX_BACKENDS_DIR`), functions
deployed, a Monstera and one Watering seeded. One `claude -p` on Opus (`opus`: this CLI, 2.1.251, refuses
`claude-opus-5-5`), `--strict-mcp-config` with the nodegx server alone from `packages/noodl-mcp/bin` (dist rebuilt
first: it was 2 November's, older than s4's agent words), no web, no git, no curl, file tools fenced to the copy. The
grade is the copy's `nodegx.automations.json` and `components/` afterwards (`--grade`).

| round | request | what it did | cost |
|---|---|---|---|
| `asked` | AC4's sentence: *"Work out how many days since the plant was watered in the workflow."* | Read it as a question about the data: exported Plant and Watering, answered **"0 days"** (Mark watered stamps `lastWatered` now), offered to build a display. **Wrote nothing**: no formula, no function. | $1.18, 15 turns, 1.3 min |
| `build` | *"In the workflow that runs when a plant is watered, work out how many days ago that watering was, and have the workflow give that number back at the end."* (names neither a formula nor a function) | **A formula, no function**: `when-watered` 2 → 5 steps, `days` = `{"$fn":"date-difference","args":[{"$path":"upstream.when.wateredAt"},{"$fn":"now"},"days"]}`, a Return of it; no new file under `components/`. Probed the value language with a scratch workflow it then deleted; two real runs returned 4 and 2 on dates it set. | $3.18, 44 turns, 5 min |

Both prompts end "(I'm not at my desk: don't ask me anything …)", since a question asked back ends a `-p` run.
**AC4 is green on the second sentence, not the first.** The first is a fair question, and the agent answered it; it
was never a test of formula against function. The grade that matters (the file) held in the build round.

**Found, and fixed this session:**

- **P132-STEPKINDSCUT** (`launch: beta`): `list_backend_step_kinds` came back *"Output too large (53.5KB)… Preview
  (first 2KB)"*. s4's 27 formulas took the served catalog from under Claude Code's 50,000-character limit to 50,351, so
  the change that added formulas hid them from a Claude Code agent. The agent built its formula from the `params`
  description's example and four trial runs. Fixed: the tool joins `WHOLE_RESULT_TOOLS` (120,000 for Claude Code).
  🔴 My fence `Read(//Users/**)` also refused the saved file (P128 S1 recorded this exact trap): fence the repo and
  sibling rounds by name.
- **P132-RUNERRORNOREASON** (`launch: beta`): a probe failed and the run said only *"A step failed with no error
  route"*; the MCP has no tool that reads a run's steps. The step's own message was already good. Fixed: the result
  carries `failedStep` and the error reads *Step "How many days ago" failed: "Time between" needs a date … It has no
  error route, so the workflow halted.*
- **A transform's `$default` inside a formula** was refused with *"needs a date for from, got an object"*, so the agent
  split one step into two. The refusal now adds *("$default" is a transform's shorthand, data inside a formula: write
  {"$fn": "default", "args": [...]})*. Not a row: the refusal was right, its words were short.

Not a defect, recorded so nobody chases it: Greenhouse's *Mark watered* overwrites the Watering's `at` with now, so a
seeded back-dated watering reads 0 days once the trigger has run (round 1's answer). The build round read the
trigger's snapshot (`body.at`, else `body.createdAt`) for that reason.

