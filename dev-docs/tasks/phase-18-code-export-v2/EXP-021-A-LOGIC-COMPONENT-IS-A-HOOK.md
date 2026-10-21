# EXP-021 — A logic component is a hook

**Scoped:** 2026-10-21 (P18 session 132, BOARD lane 6), under Richard's ruling of 2026-10-21. This is **EXP-003 Tier B**
("logic components in the export"), the row the BOARD's 0.5.0 line already names. **Status: 🟡 slice 1 built (session 136, §6); AC1's drive, AC4 and the parent's reads (§101) to come.**
Follows [EXP-019](EXP-019-THE-SCRIPT-TRAVELS-AS-WRITTEN.md) and [EXP-020](EXP-020-THE-NOODL-API-IN-THE-EXPORT.md),
because most of a logic component's body is Functions those two carry.

## 1. The person sentence

> "My `/Logic/Todo data` component — the one with no visuals that loads the lists — is a hook in the React app,
> `useTodoData()`, and the page calls it where the graph placed it."

## 2. What was measured first (s132, every template dry-run)

| refusal | nodes |
|---|---|
| `Component Inputs` — "the export has no rule for this node yet" | **182** |
| `Component Outputs` — the same | **48** |
| placements of a `/Logic/*` component with no rule (`Translate words` 20, `App store` 18, `Slide and merge` 8, `Roll face` 8, `Read family` 6, `Hunt move` 6, …) | ≈ 90 |
| Function — "no rule" (inside a logic component the plan never enters) | 124 |
| todo-list: "Without them … never run" — every Create / Update / Query Record in the app sits behind `Logic/Todo data`'s `When to load` | 28 record verbs |

A logic component is a component with no visual root, placed as a node: its `Component Inputs` ports are the
placement's inputs, its `Component Outputs` the outputs, signals both ways. The export plans visual components only;
a placement of a logic one falls to the catch-all "logic node (<type>)".

## 3. The rule

A logic component emits as **one hook per component**, `use<Name>(inputs: {…}): { outputs…, signals… }`:

- a value input → a hook parameter (the placement's resolved source, as a visual placement's prop);
- a signal input → a function the hook returns the parent calls (`InstancePulsePlan`'s count mechanism already carries
  a pulse into a placed component, EXP-011 §94; a hook can take the function directly);
- a value output → a returned state row (the component's own state vars, as today);
- a signal output → a callback the parent passes in (`onLoaded`), as `output-signal` already does for visual ones;
- the body's nodes plan exactly as a visual component's logic column does today (Functions, Set Variable, record verbs,
  Conditions), with no render tree.

The hook is called in the parent where the placement sits, unconditionally (hooks' rule), which is also the runtime's:
an instance exists whether or not it is drawn.

## 4. Acceptance criteria

- **AC1** — todo-list's `Logic/Todo data` placed in `Pages/Todo` exports as `useTodoData`; the page's lists fill from the
  local backend in both arms (the React arm against the runtime arm).
- **AC2** — a signal in (`When to load`) and a signal out (`Loaded`) both cross the hook boundary on a desk; a mutant that
  drops either fails by name.
- **AC3** — the 182 + 48 read 0 for components whose nodes EXP-019/020 carry; the rest are refused by the node's own
  reason, never by "no rule for Component Inputs".
- **AC4** — rocket-school's list editing (lane 6's named Tier B row: `lsEach` fed by `/Logic/List question sets`) edits a
  set in the exported app.
- **AC5** — `tplbuild.ts` all 19 at floor; `dispdiff.ts` 0 lost.

## 5. Not this task

A logic component placed inside a repeater row (its hook would be per row: a row component, EXP-011 §99's shape; measured
when AC1 lands), `Component.Object` bodies (built in EXP-020 slice 2, s135: EXP-020 §7).

## 6. Session 136 (2026-10-21): slice 1 — the hook — built, graded

[EXP-011 §106](EXP-011-PICKER-COVERAGE.md) is the ledger entry; `s136-hooks/` holds the measurements (its README says how
the slice was chosen: session 135's next two items reached 0 template refusals; this one reached 1,962 of 3,790).

### 6.1 Measured first

332 logic components in the templates (no node that draws), placed 649 times; **223 are Component Inputs → one Function →
Component Outputs**. Their parents feed their outputs mostly into drawn things (≈2,000 wires) and into each other (813);
≈360 go into a logic node, §101's case, which this slice does not touch.

### 6.2 The rule, built

§3's rule with one change of means: the hook takes **the props interface a visual component has** and gives back through
it (`onXChanged` lifts, `onDone`-style callbacks) rather than returning values, so every instance pass the export already
grades (props, §94's pulses, §4d's lifts, §96's delivered counts) applies to a hook placement unchanged. A hook that returns
its values (`const data = useTodoData(…)`, read in the same render) is the next shape, once §101's parent reads land.

- `isLogicComponent`: every node's render role null, or a placement of another logic component (todo-list's AddAction is
  one placement of Write history); a placed one plans rootless (`plan.hook`), file `components/<Name>.tsx`, `use<Name>`.
- A logic placement never roots a component and never joins the JSX: it joins the rendered set as an instance and
  `plan.hookCalls`; the parent calls it after its state rows, refs and render locals.
- A Run-wired Function's value may feed Component Outputs (s122's refusal predates §96); a Function's value may feed a placed
  component's declared input, asserted to the prop's type where the plan knows they differ.

| AC | |
|---|---|
| AC1 | 🟡 `useTodoData` exports and its six lists push when they answer (after P18-S136-QUERYPUSH); the page sends `refresh` from its Did Mount when signed in. **Not driven against a backend yet.** |
| AC2 | ✅ the Hook Desk, both arms, step by step: a signal in (`go`), a signal out (`done`), two placements, a value and its signal from one hook into another in order (Echo); mutant arms fail by name |
| AC3 | ✅ for the reach: templates **1,571 gained, 0 lost**; what is left of the 182 + 48 is refused by each node's own reason |
| AC4 | ⬜ not attempted |
| AC5 | ✅ `tplbuild` all 17 at the floor (1 in 1, nightbook STYLENULL); `dispdiff` 0 lost (templates and corpus) |

### 6.3 What this leaves

- **AC1's drive** (todo-list against the local backend, both arms) and **AC4** (rocket-school's list editing).
- **§101**: a parent's logic node reading a hook's output (≈360 wires; todo-list's `Which project is the selected task part
  of?` among them). With hooks, the returned-value shape answers its timing question directly.
- A hook call whose every pulse was refused stays, as a drawn placement does (§94): it runs nothing (todo-list's Add task,
  its Create Record refused for an Id read outside its chain). Counted among the gains; it is honest code, not working code.
- **P18-S136-CHAINWATCH** (open): the faithful watch reads the call's answer row.
