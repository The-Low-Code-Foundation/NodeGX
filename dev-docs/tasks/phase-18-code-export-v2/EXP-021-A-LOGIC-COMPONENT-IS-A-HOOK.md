# EXP-021 — A logic component is a hook

**Scoped:** 2026-10-21 (P18 session 132, BOARD lane 6), under Richard's ruling of 2026-10-21. This is **EXP-003 Tier B**
("logic components in the export"), the row the BOARD's 0.5.0 line already names. **Status: 🟡 slice 1 built (session 136, §6); AC1 driven (session 137, §7); AC4's path translated (sessions 138–139, §8–§9) and driven (session 140, §10); the parent's reads (§101) to come.**
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

## 7. Session 137 (2026-10-22): AC1, driven

[EXP-011 §107](EXP-011-PICKER-COVERAGE.md) is the ledger entry; `s137-todo-drive/` holds the drive.

Reading the emitted Todo page before driving it found the lists dropped: todo-list's row builders (Task rows, Today rows,
Log rows, Selected task, Selected routine) read the clock, so each is an arrival run, and the lift pass refused a Component
Outputs value fed by one (**P18-S137-ARRIVALLIFT**, high, fixed: the lift compiles the arrival run first, with its
upstream). Then the drive: one backend running the template's policy, the runtime against HEAD's export and the fixed
export, each built as a person builds it and signed in through its own page. The runtime and the fixed export show the same
lists; HEAD's showed none.

| AC | |
|---|---|
| AC1 | ✅ `useTodoData` fetches, and the page's lists fill from the local backend in both arms: List, Today, Done and Log, the same rows, order and lines (`s137-todo-drive/README.md`) |
| AC2 | ✅ (session 136) |
| AC3 | ✅ for the reach; the arrival lift adds templates 61, corpus 18, 0 lost |
| AC4 | ⬜ not attempted |
| AC5 | ✅ `tplbuild` all 17 at the floor; `dispdiff` 0 lost |

What the drive showed that is not AC1: the export's look (`App`'s CSS Definition and theme Function are "node beside the
router shell"), Projects (refused by its `Noodl.Records` member), selecting a task (a lifted value into a Set Variable), and
the report calling a Function left out that the export runs from its other trigger (**P18-S137-HALFREFUSED**, low, open).

## 8. Session 138 (2026-10-22): a logic component's list draws a repeater's rows (AC4's first blocker)

[EXP-011 §108](EXP-011-PICKER-COVERAGE.md) is the ledger entry; `s138-lifted-list/` holds the measurements.

62 For Each in 8 templates take their items from a hook's lifted list; they drew no rows, and every row signal and relay
behind them was refused. The lift is now the repeater's items. A row's value into another hook arrives with the row's
signal (**P18-S138-ROWINTOINSTANCE**, high, fixed: on HEAD, 10 pulses ran their component with that value missing). A
lifted render run is memoised (**P18-S138-LIFTLOOP**). A hook's Variable-fed props are passed
(**P18-S138-HOOKPROPWALK**). Templates: repeaters drawing rows 114 → 161, 146 wires gained, 0 lost.

| AC | |
|---|---|
| AC4 | ⬜ rocket-school's Lists page now draws its list, and Delete hands Delete question set the row's id. Editing a set waits on `/Logic/App store`, a persisted Global Store the export refuses (no hook on the page gets `app`, so the list is drawn from nothing), and on §101 (the Editor's `items` into Save) |
| AC5 | ✅ `tplbuild` all 17 at the floor; 0 wires lost, 0 nodes lost |

## 9. Session 139 (2026-10-22): the persisted store, and the write idiom over it (AC4's second blocker)

[EXP-011 §109](EXP-011-PICKER-COVERAGE.md) is the ledger entry; `s139-persisted-store/` holds the measurements.

`/Logic/App store` is a Global Store with Persist on: refused whole (51 report lines, and 106 wires "not lifted by
/Logic/App store"), so every rocket-school and star-class page drew from nothing. It is kept where the runtime keeps it
now (`src/lib/persistStore.ts`). Opening it made the idiom around it reachable, and the slice carries that too:

- App store's `app` (a Subscribe of an untyped key) lifts through its output.
- Several hooks' `app` into App store's one input are one row (**P18-S139-MULTIFEED**). On HEAD the last one placed
  bound it: App store would have written Delete's value when Save sent the pulse.
- The Editor's `items` passes through to Save question set.
- A pulse whose value the export does not deliver is refused by name (**P18-S139-STALEPULSE**, high: 115 template pulses
  ran on HEAD with that value missing; the Header's `write` would have written `undefined` over the stored app object).

Graded on the Store Desk, predicted first, both arms with localStorage seeded and read. Templates: 482 wires gained, 115
lost (every loss a STALEPULSE refusal); nodes 32 gained, 0 lost.

| AC | |
|---|---|
| AC4 | 🟡 translated, not driven: the Lists page hands App store one `app` row, the Editor's `items` reaches Save, Save's and Delete's writes are kept and saved. The Header's settings writes are refused (its `app` has three feeds). Next: the drive |
| AC5 | ✅ `tplbuild` all 17 at the floor; 0 nodes lost; the 115 wires lost are refusals of pulses HEAD ran on missing values |

## 10. Session 140 (2026-10-22): AC4 driven — a set edited in the exported app

[EXP-011 §110](EXP-011-PICKER-COVERAGE.md) is the ledger entry; `s140-lists-drive/` holds the drive, its predictions and
its readings.

The exported rocket-school, built with its own `npm run build`, beside the runtime in one headless Chrome, the store
seeded in localStorage. A set opened, renamed and given three lines, a set added, a set deleted, the page reloaded.
Predicted first; every step read as predicted. HEAD's export saved every set as one question: its lines field was
`<input type="textArea">` (**P18-S120-TEXTAREA**, fixed here, graded on the Field Desk against the runtime's own
control). After the fix the export's stored JSON equals the runtime's at every step.

| AC | |
|---|---|
| AC4 | ✅ driven: open, edit (name and lines), save, add, delete with its ask, reload; the export's page and store read as the runtime's at every step. Not part of the list editing and still refused: the Header's settings writes (its `app` has three feeds), the Editor's count line (§101), the page's ground (P18-S140-SHELLUNSAID) |
| AC5 | ✅ `tplbuild` all 17 at the floor; hls001 65 moved, 0 added, 0 removed, predicted |


## 11. Session 141 (2026-10-22): the Header writes the store

[EXP-011 §111](EXP-011-PICKER-COVERAGE.md) is the ledger entry; `s141-header-app/` holds the census, the desk, the drive,
their predictions and readings.

The Header's `app` has three writers (two Update settings and a Delete profile). Each is now handed the Header's own
callback, so the last to change is the last writer, as in the runtime, and the Header's `write` runs on every page
that places it. Measuring it on a desk first found **P18-S141-PASSLATE**: s139's single pass-through arrived one commit
after its own run's pulse, and wrote `undefined` over a persisted store. Driving rocket-school found
**P18-S141-MOUNTEDIN**: the Edit player form never drew. Both fixed. In the built app, renaming and deleting the player
through the Header store what the runtime stores, at every step.

| AC | |
|---|---|
| AC4 | ✅ (session 140) list editing. Now also the Header: rename and delete-player driven, the store equal to the runtime's at every step. A setting still cannot be changed: the menu's Choice rows draw no choices (their `items` from a Static Data or a Function, refused) |
| AC5 | ✅ `tplbuild` all 17 at the floor; 50 wires gained, 0 lost |
