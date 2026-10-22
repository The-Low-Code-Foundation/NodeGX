# s138 — a repeater fed by a placed component's list (EXP-011 §108)

P18 session 138, 2026-10-22, BOARD lane 6. The handoff's item 1: "a repeater fed by a placed component's lifted list draws
no rows", EXP-021 AC4's blocker.

## Measured first

- `fed.cts` → `fed-before.json`: **62 For Each** in 8 templates have `items` wired from a placed component (the handoff's
  "90" counted report lines, which repeat per wire and per copy). All 62 children are logic components (hooks); all map
  their rows by template inputs. 47 children already lift that output (typed `any`); 15 do not, because their Function
  is refused upstream (bot-garden's `scripts/save.js` / `engine.js` reads, digital-bricks-training's unticked
  run-on-change box). 44 carry row signals and 31 relay row values.
- `reports.cts` (s137's): "draws no rows" lines **121** on HEAD.
- The rest of "feeds For Each.items, which has no static binding" is another shape: a **Function's** own output into
  `items` (nightbook 16, todo-list 4 + 4, rocket-school 2, star-class 2). Not this item.

## Built

| what | where |
|---|---|
| An instance output into a planned repeater's `items` is a pending lift (`intoItems`); the repeater is marked `itemsLifted`, which counts as fed in the first plan (so its §99 relays are kept) | `src/analyze/plan.ts` (§4d parent pass, the relay pass) |
| `liftInto` makes the lifted row the repeater's `itemsExpr` (§4e's untyped list), or, if the child does not lift it (or lifts something that is not a list), drops the wire by name and takes the relays back (`takeBackRowRelay`, factored out of the first plan's relay pass) | `plan.ts` |
| The list reads `((rows ?? []) as any[]).map(…)`: an `any` row's `.map` callback is TS7006 under the scaffold's strict options (89 errors on the first `tplbuild`) | `src/emit/component.ts` |
| **P18-S138-ROWINTOINSTANCE** (high, fixed): a row value into a placed component's input is §99's relay, written by every row signal before its chain; a row pulse whose value cannot be relayed (computed inside the row) is refused by name | `plan.ts` (a pass before §4d; `compileInstanceSignal`'s row guard); `takeBackRowRelay` takes the binding back too |
| **P18-S138-HOOKPROPWALK** (fixed): the walk that earns a render read's hook and state row never visited a hook call, so a hook's prop fed by a Variable was dropped unsaid (bot-garden's Pick thing: `usePickThing()` with the world wired), and the relay's state row was never declared (TS2304 ×75) | `component.ts` (`preOrder` + `hookCalls`) |
| **P18-S138-RESERVEDLOCAL** (low, fixed): `gardenChallengeFor` → `const for` | `component.ts` (`hookLocals`) |
| **P18-S138-LIFTLOOP** (fixed): a render-run Function whose value is lifted ran every render; a list it returns is a new array each time, so the push effect, the parent's row and the hook re-ran for ever (the Hook Desk's Shelf hung the export arm). It is `useMemo(() => Work({ n }), [n])` now, run when its inputs change, as the runtime's is | `component.ts` (`memoJsIds`) |

## Graded

- **Predicted first** (`EXPECTED.md`): the runtime arm read exactly the prediction (A1), all ten readings.
- `tests/a-logic-component-is-a-hook.test.ts` **31 / 31**: the Hook Desk gains Shelf (a logic component's list), a
  For Each of `/Row/Item`, and Picker (the row's id and signal); A8 the rows, A9 the row pressed is the row picked, B4,
  C8 (a child that lifts nothing: rowless, relay and binding taken back, the pulse refused), C9 (a row value computed in
  the row: its pulse refused by name), E8 (rocket-school's Lists), E5 rewritten (it pinned HOOKPROPWALK's drop as "a
  placement that passes nothing"), B2 (Double's lifted run is memoised).
- Mutants (`mutants.py`, `mutants.out`): **9, all killed**, each by the rows named for it. M1, M5 and M6 take the whole export arm down with them: no rows to press, a hung render, a page that does not compile.
- `tplbuild`: all 17 at the floor (1 in 1, nightbook STYLENULL). Package `tsc --noEmit` 0.
- Reach, HEAD's `src` (`packages/.s138-base`) against the tree (`wires.cts`, `wires.json`): **repeaters drawing rows 114 →
  161; 146 wires gained, 0 lost** (rocket-school 39, star-class 37, bot-garden 30, digital-bricks-training 9 + 9,
  planning 8 + 8, todo-list 3 + 3). "draws no rows" lines 121 → 57. Node dispositions (`dispdiff`): templates 11 gained,
  0 lost; corpus 1 gained, 0 lost. Row values carried into placed components: 36 (27 with their pulse); on HEAD 10 pulses
  ran with the value missing.
- HOOKPROPWALK's reach (`hookstore.cts`, `hookstore.out`): the templates' plans bind **215** hook props to a Variable or an Object's key. On HEAD only those whose Variable a drawn element also read were printed (bot-garden's `useShopRows` had no `tab`). LIFTLOOP: **64** render runs are memoised now (`hookprops.cts`, `hookprops.out`). How many HEAD templates actually looped was not measured.
- Whole package (`nice -n 19 --runInBand`, JSON 09:05): **154 suites, 5,252 passed, 0 failed, 3 skipped**, predicted 5,246 + 6 and read on the first run.

## What it leaves

- The 15 children that do not lift their list (their Function is refused upstream: bot-garden's shared `scripts/*.js`, the
  unticked boxes).
- A Function's own output into `items` (nightbook 16 …).
- A row output computed inside the row (bot-garden's robot card, todo-list's Money editor and Move form): its value
  and the pulse with it are refused by name.
- EXP-021 AC4: rocket-school's list now draws, and Delete hands the row's id; editing a set is still refused by `/Logic/App store`, a persisted Global Store ("a declarer authors persist — browser-storage rehydration is not translatable"; no hook on the page gets `app`, so the list draws from nothing), and by §101 (the Editor's `items`, a hook's output read by the parent's Save).
