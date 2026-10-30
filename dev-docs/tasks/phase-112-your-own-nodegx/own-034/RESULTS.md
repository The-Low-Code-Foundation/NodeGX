# OWN-034 — results

## 1. The grader on its controls (s1, 2026-10-30)

**The grader:** `grade.mjs <locator.json>`. One headless Chrome profile per app, a frozen clock per day (noon,
Europe/Paris), and a new page load for each day. It uses real presses and accepts dialogs. The run order is Mon B1–B5,
B7, B6; Tue B8–B9; Thu B10, B12, B11, B13.

**The controls** (`control/`): one hand-made tracker (`clean/`) and two copies, each made by `make-broken.mjs` with
one line changed:

- `streak-off-by-one`: the streak always counts back from yesterday, so ticking today never adds to it;
- `nothing-saved`: `save()` writes nothing.

### Prediction (written before the first run)

| control | fails | passes |
|---|---|---|
| clean | — | 13/13 |
| streak-off-by-one | **B9** (streak 1, not 2) and **B10** (0 before the tick is right; 0 after, not 1) | 11/13 |
| nothing-saved | **B6, B8, B9, B10, B11, B12** | 7/13: B1–B5, B7, B13 |

**Where the handoff was wrong:** it said that nothing-saved would fail "B6/B11". But every new day is a new page load,
as it is for a person who comes back the next day. So an app that saves nothing has no Monday on Tuesday, and every
check from B8 on that reads yesterday's tick or a habit added earlier fails with it. A grader that passed B8–B12 on
that copy would be wrong. B7 was moved ahead of B6, so that untick and tick again are tested before the reload and do
not depend on saving. B13 still passes on nothing-saved, but it has only the add field and button to test.

### Readings, first three (2026-10-30, `cline-dev` at `46f0ee55e`, Node 22.22.0, headless Chrome)

| control | result | failed, and why |
|---|---|---|
| clean | **13/13**, exit 0 | — |
| streak-off-by-one | **11/13** | B9 `streak: 1`; B10 `before: 0, after: 0` |
| nothing-saved | **7/13** | B6 `rows: []`; B8 `days: null`; B9, B10, B11 `nothing to press`; B12 `null` |

The prediction matched in every row. The clean run's screenshots (`control/clean/grade/thu.png`, `phone.png`) show
Fri–Thu with Mon, Tue and Thu ticked. That is the frozen clock working, not only the checks agreeing with each other.
The delete went through a real `confirm()`, which the grader accepted (`dialogs` in `grade.json`).

### Three more copies (a control proves only what it varied)

After the first three runs, B1, B3, B4, B12 and B13 had never been seen to fail, so a check that could not fail
would have looked the same. I made three more one-line copies, predicted before running:

| control | the line | predicted to fail |
|---|---|---|
| adds-empty | `if (!name) return;` → `if (false) return;` | **B4** (a nameless row), **B6** and **B11** (the row list still holds it) |
| week-ends-yesterday | days `[6…0]` → `[7…1]` | **B8** (Tue's last two cells are Sun, Mon), **B12** (Thu 29 Oct – Wed 4 Nov) |
| scrolls-sideways | day cells `1fr` → `60px` | **B13** only |

B1 and B3 still have no copy that fails them. B1 is mostly a "no crash" check, and B3 differs from B2 only in the
order.

### Readings, all six on the final grader (2026-10-30, `cline-dev` at `46f0ee55e`)

| control | result | failed |
|---|---|---|
| clean | **13/13**, exit 0 | — |
| streak-off-by-one | 11/13 | B9, B10 |
| nothing-saved | 7/13 | B6, B8, B9, B10, B11, B12 |
| adds-empty | 10/13 | B4 `rows: […, ""]`, B6, B11 |
| week-ends-yesterday | 11/13 | B8 `[…, false, true]`, B12 |
| scrolls-sideways | 12/13 | B13 `scrolls sideways: 486 > 390; off screen: Delete, Wed, Thu …` |

Each copy failed exactly the checks predicted for it. **AC1 is met.**

**One miss on the way, now fixed.** On its first run, scrolls-sideways scored **13/13**: B13 was blind to the very
defect it exists for. The cause is that with `mobile: true` (as on a real phone), Chrome grows `innerWidth` to the
content's width. The probe read `innerWidth` 486, `clientWidth` 390, `visualViewport.width` 390, `scrollWidth` 486.
So `scrollWidth > innerWidth` can never be true. The grader now measures against the 390 it set itself. Two older
graders compare against `innerWidth` under the same emulation: `own-019/grade-launch.mjs` (its `phone` check) and
`phase-78-the-templates/todo-digitalbricks/staging-e2e.js`. Filed as P112-OWN034-INNERWIDTH.

**Not tested by the controls:** the locator for a NodeGX app (an app drawn by the runtime after load; the grader
waits for the name field), and an in-page delete confirm (`confirmRemove`). Both get their first run on D·kit.
