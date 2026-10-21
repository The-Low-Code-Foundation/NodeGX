# s136 — a logic component is a hook (EXP-021 slice 1), measured first

## How the slice was chosen

Session 135's handoff ranked next: (1) the Component scope's other members (the Filters prefab's `Component.UpdateCondition`
…), (2) a For Each fed by a Function's output (gram's Feed), (3) EXP-021. Measured on the tree first (`census.cts` →
`census.json`, every template's deferred dispositions by reason):

| the handoff's item | template refusals it reaches |
|---|---|
| the scope's other members | **0** — no template refusal mentions `Component.*` any more; the members live in a library prefab and its corpus copies |
| For Each fed by a Function | **0** — gram's Feed no longer appears among the refusals at all |
| EXP-021, logic components | **1,962 of 3,790** — every bare "logic node (…)" row, in 15 of 17 templates |

So EXP-021, which is also the next task in Richard's ruled order (EXP-019 → EXP-020 → EXP-021 → EXP-022).

`logic.cts` → `logic.json`: **332 logic components** (no node that draws), 1,301 nodes, placed **649** times, 16 never
placed, none placed by another or in a repeater row. **223 of 332 are exactly Component Inputs → one Function → Component
Outputs** (180 with a signal in and out, 101 with a signal out only). `wires.cts`: what the parents do with their outputs —
≈1,580 wires into a drawn component's input, 223 into a Text, ≈200 into other drawn sinks, 813 into another logic
component, ≈360 into a logic node (§101's unsolved case, still refused).

## What was built

- **The plan** (`src/analyze/plan.ts`): `isLogicComponent` (every node's render role null, or a placement of another logic
  component, with a cycle guard); a placed one is planned rootless as the router shell is, `plan.hook`, its file
  `components/<Name>.tsx` with the symbol `use<Name>`. Its placements (`placesLogic`), parentless or met in the visual walk,
  never root a component and never join the JSX tree: they join the rendered set as instances and `plan.hookCalls`, so every
  instance pass applies unchanged (props, §94 pulses, signal outputs' handlers, §4d lifts, §96 delivered counts).
- **The emitter** (`src/emit/component.ts`): the hook is the component's body with no JSX and no return, typed
  `<Name>Props = {}`; the parent calls `use<Name>({ … })` from the attributes a drawn placement takes, after its state rows,
  refs and render locals.
- Beside it, each found by grading or by reading emitted code:
  - a Run-wired Function's value may feed Component Outputs (`isRowReader`; s122 refused it before §96 ordered a pulse after
    its value — the desk's Echo grades the order), and the lift pass compiles that Function's run first;
  - a Function's value may feed a placed component's declared input (Pass 4e), passed as it is and asserted to the prop's type
    where the plan knows they differ (a Function's typed output, a lifted row, an Expression's inferred type);
  - **P18-S126-PAGEGROUP fixed** (it had 0 reach until hooks gave it 26 nodes in nightbook): a Group whose Mounted is wired
    is not folded into the page div;
  - **P18-S136-QUERYPUSH fixed**: a push effect depends on a query's rows (todo-list's Todo data pushed six empty lists once);
  - **P18-S136-NESTEDROWS fixed**: `readonly (readonly number[])[]`;
  - **P18-S136-CHAINWATCH filed, refused by name**: a ticked input read from a call's answer inside its chain.

## Files

- `census.cts` / `census.json` — every template's deferred dispositions (the ranking above); `census-after.json` the same
  on the tree after: 3,790 → 2,219 refusals, bare "logic node" rows 1,962 → 102.
- `logic.cts` / `logic.json`, `wires.cts` — the logic components, their shapes and their parents' wires.
- `EXPECTED.md` — the Hook Desk, predicted before either arm ran (and the first run's miss, the instrument's).
- `dispdiff.cts`, `dispdiff.json` (templates), `dispdiff-corpus.json` — reach against HEAD's `src` (`packages/.s136-base`).
- `tplbuild.cts`, `tplbuild.json` — every template's export typechecked.
- `mutants.py`, `mutants.out` — 17 arms, 0 survived (the first pass misread its own output as 17 survived: no per-row
  marks with three specs, and arm A failed the spec at load; `--verbose` and a missing file reading `''`, rerun).
