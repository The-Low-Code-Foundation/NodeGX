# GAM-003 — A meter computed by an Expression loads without an error

**Status: 🟢 built, session 11 (2026-09-14, over `5df2a01a6`), committed `89e533625`.** R3: a `null` or `NaN` magnitude on a units port is empty, silently. AC1 RED at HEAD with the register's exact message. AC2's control explained, AC3 graded by a reverted arm (4 red), and AC4 holds for `"tall"`. One FLD-004 row was changed, because the ruling overturns its `NaN` half. AC6: 0 sites change. **Left:** AC5 in a browser, and AC7 on Rocket School (the peer's). **Source:** [P78 D62](../phase-78-the-templates/DEFECTS-THE-TEMPLATES-FOUND.md) · found by P87 [RKT-007](../phase-87-the-first-play-test/RKT-007-THE-CLOCK-AND-THE-BOOST-EXPLAIN-THEMSELVES.md), 2026-09-13 · **Side:** product (runtime wiring, viewer size ports)

An author wires `round(s * 48)` into a Group's Width. Before any answer has been given, the console says `"Width" was sent {"value":null,"unit":"px"}, which is not a size`. It looks like a wiring mistake the author never made, and nothing on screen is wrong.

## 1. The person sentence

**Someone builds a progress bar whose width an Expression computes. The page loads with no error, and the bar fills when the value arrives. A value that really is not a size is still refused out loud.**

## 2. What was measured

HEAD `eb12ebe99`.

| reading | where |
|---|---|
| **As recorded 2026-09-13, not re-driven:** `drive-rkt007-boost.js` logged the error in 8 of 8 cells on build 1 (`round(s * 48)`), and 8 of 8 again on build 2 (`round((s \|\| 0) * 48)`). A guard inside the expression changes nothing. Build 3 has no Expression before the Width: 8 of 8 cells with no console error | RKT-007 §5 |
| `connectInput` pushes the source output's current value down a new wire **whenever it is not `undefined`**. Re-read at HEAD. The register cites `:545-569`; at HEAD the function is `:531-572` and the seed is `:558-568` | [`node.ts:558-568`](../../../packages/noodl-runtime/src/node.ts#L558-L568) |
| An Expression's `result` getter returns **`null`** until `hasEvaluated`. That is NDA-017 constraint 4. Re-read at HEAD | [`expression.ts:549-561`](../../../packages/noodl-runtime/src/nodes/std-library/expression.ts#L549-L561) |
| An Expression whose referenced inputs have never delivered does not evaluate at load. Re-read at HEAD; the register's line numbers hold | [`expression.ts:208-212`](../../../packages/noodl-runtime/src/nodes/std-library/expression.ts#L208-L212) |
| `null` becomes `{value: null, unit}` two ways. `setInputValue` merges it into the port's unit, because `isNaN(null) === false`. During the first update, `queueInput` wraps any non-object in the unit of the queued value it replaces. Re-read at HEAD | [`node.ts:414-421`](../../../packages/noodl-runtime/src/node.ts#L414-L421), [`:1241-1266`](../../../packages/noodl-runtime/src/node.ts#L1241-L1266) |
| The units setter clears on a **bare** `null`. It sends `{value: null}` to the FLD-004 (b) branch, because `dimensionIsUsable` is false for a non-number magnitude. That branch keeps the previous value and raises `dimensions/not-a-dimension`. Re-read at HEAD; the register's `:662-689` holds | [`react-component-node.ts:609-615`](../../../packages/noodl-viewer-react/src/react-component-node.ts#L609-L615), [`:654-695`](../../../packages/noodl-viewer-react/src/react-component-node.ts#L654-L695) |
| **The unexplained control.** `Game/Countdown bar` wires `cdAnim.currentValue → cdWidth.v` and `cdWidth.result → cdFill.width` (`round(v * 3)`), and it never raised the error. Re-read at HEAD: Animate To Value's `currentNumber` starts at `0`, so its first wire seeds `v = 0`, and the Expression then has an arrived input | [`tpl007Components.ts:1094`, `:1161-1162`](../../../packages/noodl-mcp/tests/tpl007Components.ts); [`animate-to-value.ts:44`, `:167-173`](../../../packages/noodl-viewer-react/src/nodes/std-library/animate-to-value.ts) |
| **Hypothesis from source, not measured.** `cdFill`'s first update pulls `cdWidth` through `_updateDependencies`, and `cdWidth` evaluates and sends a number. First-update consolidation then replaces the queued `{value: null}` before `cdFill` drains, so the setter never sees `null`. The banner's `s` came from a Component Inputs port that holds nothing until grading, so nothing replaced the `null` | [`node.ts:782-789`](../../../packages/noodl-runtime/src/node.ts#L782-L789), `:1241-1266` |
| Function outputs and Component Inputs outputs read `undefined` before a value exists, so they seed nothing. As recorded in RKT-007, not re-read | `simplejavascript.ts:137-166`, `componentinputs.ts:53-54` |
| Workaround at HEAD: `fbIn.boostPct → fbMeterFill.width`, and a gate pins that Width has exactly that one source. Re-read at HEAD | [`tpl007Components.ts:1306`](../../../packages/noodl-mcp/tests/tpl007Components.ts), [`tpl007Template.test.ts:691-693`](../../../packages/noodl-mcp/tests/tpl007Template.test.ts) |

## 3. Where it bites a person

Every progress bar, meter, chart bar or computed spacing built with an Expression whose input arrives after the page is built. Only a console listener sees it. For an author who does watch, it is a false alarm that teaches them to ignore `not-a-dimension`, which is the refusal FLD-004 built to be heard.

## 4. Related work and collisions

- 🔴 **P84 [FLD-004](../phase-84-the-defects-the-field-report-found/FLD-004-A-WIRE-INTO-A-DIMENSION-PORT-ARRIVES.md), built.** See [WHAT-WAS-BUILT](../phase-84-the-defects-the-field-report-found/FLD-004-WHAT-WAS-BUILT.md). `904957606` and `46fd16065` made a units port abstain and raise `dimensions/not-a-dimension` for a value that is not a size, including the `{value: "tall", unit: "px"}` shape a live wire delivers. `1b4d263aa` fixed the `registerInput` `type:` → `unit:` typo. **D62 is that refusal firing correctly on a `null` seed.** The refusal and the abstain are not the defect. The fix must leave FLD-004 (b) exactly as built. FLD-004 §6 found `not-a-dimension` firing nowhere in its 20-project corpus, so that corpus does not contain this shape.
- **[GAM-001](GAM-001-AN-OPTIONAL-PORT-LEFT-UNSET-SHOWS-THE-PART.md), this phase.** The same seed of an unevaluated `null`, landing on `Mounted` instead of Width. A fix at the seed closes both. A fix at the size setter closes only this one. **Rule the seed question once for both tasks before either builds.**
- **P30 [NDA-017](../phase-30-node-library-audit/NDA-017-SIGNAL-INPUT-FRESHNESS.md), built.** Constraint 4 chose `null` as the value a never-evaluated node reports, instead of a confident `0`. Changing what a wire does with that `null` touches that decision.
- **P79 G1** (`fac770da2`). Expression's `asNumber` / `asString` / `asBoolean` are flagged on evaluation, but their getters do **not** abstain (`expression.ts:636-658`). So `As Number → Width` seeds `0`, not `null`. That is a different shape: a zero-sized bar with no error.
- Grep run: `grep -anl "seeds the target\|connectInput.*null\|not a size" -r dev-docs/tasks`. Only P78, P84 FLD-004 and unrelated hits.

## 5. Design

| option | where | trade |
|---|---|---|
| **A. Do not seed an answer that does not exist** | `connectInput`, or the getters: a never-evaluated Expression or Condition output reads `undefined` for seeding | closes GAM-001 too. 🔴 It changes what every consumer of an unevaluated Expression receives, including ones that today rely on `null → false`. For example, `Game/Countdown bar#cdShown` (`enabled === true`) keeps an unfed countdown unmounted only because of the `null` |
| **B. `{value: null}` is the empty value, not a non-size** | the units setter: a `null`/`undefined` magnitude takes the bare-`null` branch (clear), or abstains without raising | touches size ports only, and FLD-004's `"tall"` still raises. Leaves GAM-001 open |
| **C. Do not merge `null` into a unit** | `setInputValue`'s `isNaN` test and `queueInput`'s first-update wrap stop treating `null` as a number | the most local fix to the actual accident. A bare `null` then reaches the existing clear branch. Two sites, both shared by every units port |

🔒 **Richard, asked once for GAM-001 and GAM-003: is an answer an Expression has never produced a value a wire should deliver (keep A's `null` seed and fix consumers with B or C), or an absence a wire should not deliver (A)?**

> 🔒 **Ruled for GAM-001, 2026-09-14 (session 1):** *"Can't we do B but with a checkbox or something that lets the user turn
> off auto evaluation, a bit like we have with the function node?"* — Richard. That is GAM-001's option B: evaluate at load,
> with a per-node opt-out. It is recorded in full in [GAM-001 §5](GAM-001-AN-OPTIONAL-PORT-LEFT-UNSET-SHOWS-THE-PART.md).

⚠️ **What that ruling leaves open here, read from source and not yet measured.** It overrides this section's "do not make the
Expression evaluate at load" for GAM-001's purposes, and it does not fix this row:
- with evaluation on, `round(s * 48)` over an unset `s` publishes `NaN`, and `{value: NaN, unit: "px"}` fails
  `dimensionIsUsable` exactly as `null` does, so `not-a-dimension` is predicted to fire at load still;
- with the switch off, the unevaluated `null` seed is still delivered, which is this row's original shape.

So GAM-003 still needs one of this table's consumer-side fixes (B or C, extended to `NaN`), and whether a `NaN` computed from
unset inputs is "empty" or "not a size" is a second question for Richard. Ask it with GAM-001's owed default question.

> 🔒 **Ruled, 2026-09-14 (session 2): empty, silently.** A `NaN` magnitude reaching a units port takes the same branch as a
> bare `null`: the port keeps or clears to its default and raises nothing. A value that is not a number, such as
> `{value: "tall", unit: "px"}`, is still refused out loud (FLD-004 (b) untouched, AC4). Richard accepted the trade: a real
> `0/0` bug in an author's expression also goes quiet at the size port. Framed alongside GAM-001's answers: saved
> Expressions evaluate at load, and the opt-out is a new node-level checkbox.
>
> **So the fix is option C extended to `NaN`,** or B restricted to `null`/`undefined`/`NaN` magnitudes. Either way it
> covers both shapes: the `{value: null}` seed (switch off, or `Run` wired) and the `{value: NaN}` evaluation (switch on).
> AC1 and AC3 grade both. ⚠️ The sentence *"do not make the Expression evaluate at load"* below predates the ruling. Load-time
> evaluation is GAM-001's to build, and this task does not use it as its fix.

**Do not** remove or soften `dimensions/not-a-dimension` for a non-numeric value. **Do not** restore the `delete` FLD-004 (b) removed. **Do not** "fix" this by making the Expression evaluate at load. That is GAM-001's ruling, and it would reintroduce NDA-004's load-time throw.

## 6. Acceptance criteria

| AC | clause |
|---|---|
| AC1 | **RED at HEAD, recorded in §8.** A spec: an Expression `round(s * 48)` with `s` never delivered, wired into a Group's Width, raises exactly one `dimensions/not-a-dimension` whose detail carries `{"value":null,"unit":"px"}`. Known-firing control in the same file: `s` delivered as `0.5` gives Width `24px` and no error |
| AC2 | **The control, explained.** One arm with `s` seeded from a source holding a number at creation (the `cdWidth` shape), and one arm where the Expression cannot evaluate before the consumer's first drain. §8 records which reading the two exclude. If neither matches §2's hypothesis, say so |
| AC3 | After the ruled fix, AC1's arm raises nothing, and Width holds the declared default until `s` arrives, then the computed size. **Sabotage arm:** revert the fix line, and AC1's error returns |
| AC4 | 🔴 **FLD-004 (b) untouched.** `{value: "tall", unit: "px"}` still raises `not-a-dimension` and keeps the previous value. `packages/noodl-viewer-react/tests/fld-004-units-port-abstains.test.ts` and `packages/noodl-runtime/test/fld-004-dynamic-units-port.test.js` pass unchanged |
| AC5 | **Browser.** A page with an Expression-driven meter whose input arrives on a button press, served and loaded in Chrome with a console listener attached before navigation. Beside a known-firing console signal: zero `not-a-dimension` at load, and after the press the meter's rendered width matches the computed px |
| AC6 | **Blast radius before landing.** Count Expression and Condition value outputs wired into units ports, and (if option A) into any port, across `library/`, `templates/`, `project-examples/` and both corpora. Render the corpus before and after. List every site whose first-frame value changes, `cdShown` among them if A |
| AC7 | **Workaround.** In a copy of Rocket School, put `round((s \|\| 0) * 48)` back between the grader and `fbMeterFill.width`. Run `drive-rkt007-boost.js` 8/8 with no console error, then decide whether the one-source gate (`tpl007Template.test.ts:691-693`) is relaxed or stays as a style choice |

## 7. Traps

- 🔴 **An absence needs a firing signal.** A console listener attached after load, or a page whose Expression has an arrived input (the countdown), reads "no error" for the wrong reason. That is the control this row could not explain.
- `update()` is synchronous and `settle()` yields. A spec written with `settle()` can report this class absent (P30 PROGRESS, NDA-017 §0).
- The error comes from the viewer's setter, not the runtime. A runtime-only spec with a stub consumer grades `null` reaching a stub, not the refusal. AC1 goes through `react-component-node`'s units setter.
- 🔴 **Varying the expression grades nothing.** Build 2's `(s || 0)` changed the expression and not the seed. Vary what the wire carries.
- FLD-004 (iii): a report can be correct and never reached. Grade the wiring through the real Group, not a function call.

## 8. Record

### Session 11 (2026-09-14, HEAD `5df2a01a6`)

**What was built.** `noodl-viewer-react/src/react-component-node.ts`: `isEmptyMagnitude`, and the units setter (`inputProps`
path) takes the clearing branch for `undefined`, `null` **or** an empty magnitude. An empty magnitude is a bare `NaN`, or
`{value: null}` or `{value: NaN}`. It deletes the prop, so the port falls back to its default, and raises nothing.
`Infinity`, `{unit}` alone and `{value: "tall"}` still reach FLD-004 (b), which keeps the value and raises
`dimensions/not-a-dimension`.

**AC1: RED at HEAD.** `packages/noodl-viewer-react/tests/gam-003-a-meter-computed-by-an-expression.test.ts`: a source, then
Expression `round(s * 48)`, then a node carrying Group's **real compiled `width` setter**, through the real runtime wiring,
with Width authored as 10px. With `react-component-node.ts` and `node.ts` both equal to HEAD: **3 failed, 3 passed.**
- Unset `s`: the setter was handed `{"value":null,"unit":"px"}` and raised exactly the register's message: *"Width" was sent
  {"value":null,"unit":"px"}, which is not a size … The previous value is kept.* The same error sits in the "fills when the
  value arrives" row.
- 🔴 **A computed `NaN` arrives BARE, not merged.** The row assumed `{value: NaN}`, and HEAD handed the setter `NaN`:
  `setInputValue`'s `isNaN` test does not merge a `NaN` into the port's unit. The row now records the shape, and the fix
  covers both.
- Green at HEAD: a source holding 0.5 at creation gives 24px with no error (the known-firing control). A source holding 0 at
  creation never hands the setter `null` (AC2). `"tall"` over a live wire is refused and keeps 30px (AC4).

**AC2: the control, explained.** The source holding a number at creation is the countdown's shape: Width is never handed
`{value: null}` and nothing is raised. Reverted arm G4 isolates why (GAM-001 §8). When the Expression produces a value
during the first update, `queueInput`'s consolidation replaces the queued `null` seed before the consumer drains, so the
setter never sees it. That matches §2's hypothesis. The arm where the Expression cannot evaluate before the first drain is
AC1's unset arm, and it is the one that raised.

**AC3: after.** 6/6: silent at load, Width cleared to its default, then `24px` once `s` arrives; a `NaN` computed later
clears silently; `"tall"` still refused. **Reverted arm G5** (the empty-magnitude test removed): **4 red**, exactly the
unset row, the fill row, the `NaN` row, and FLD-004's new clearing row. Restored `cmp`-identical.

**AC4: FLD-004 (b) untouched for what is not a number, and one row changed as ruled.** `"tall"`, a bare `400`, `{unit}` and
the token reference behave as built. FLD-004's row *"keeps it for NaN and Infinity"* could not pass unchanged: R3 rules a
`NaN` empty. It is split in two. `Infinity` still keeps and now also asserts the raise. A new row, marked 🔴 and dated,
asserts that `NaN` (bare or merged) and `{value: null}` clear silently. The runtime half,
`fld-004-dynamic-units-port.test.js`, runs in the whole `noodl-runtime` suite (gates below).

**The CSS-input loop** (`react-component-node.ts:2031-2074`, the `inputCss` units path) was read and **not** changed. A
`{value: null}` there becomes `nullpx` and a bare `NaN` becomes `NaNpx`. The browser drops both as invalid CSS, so the
element keeps its style and nothing is raised. That is "keeps, silently", inside the ruling.

**AC5: owed** (a browser page with a console listener).

**AC6: blast radius.** GAM-001's census counted **4** Expression wires into units ports. None has an input that can be
unset at build (their sources are a Boolean, a Function and similar), so **no site's first frame changes** under the unset
rule.

**AC7: owed.** Rocket School's `fbMeterFill.width` workaround and its one-source gate are the TPL-007 peer's.

**Gates** (with GAM-001 and GAM-002, one job at a time): the whole `noodl-viewer-react` suite, FLD-004's file included, is
**114 suites, 1,496 passed**, exit 0. The whole `noodl-runtime` suite, including `fld-004-dynamic-units-port.test.js`, is
**162 suites, 2,759 passed**, exit 0. `nodegx-export` passed 3,510 and editor `test:main` 7,522 / 7,522, both exit 0.
