# EXP-021 — A logic component is a hook

**Scoped:** 2026-10-21 (P18 session 132, BOARD lane 6), under Richard's ruling of 2026-10-21. This is **EXP-003 Tier B**
("logic components in the export"), the row the BOARD's 0.5.0 line already names. **Status: ⬜ scoped, not started.**
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
when AC1 lands), `Component.Object` bodies (the controlled-state slice).
