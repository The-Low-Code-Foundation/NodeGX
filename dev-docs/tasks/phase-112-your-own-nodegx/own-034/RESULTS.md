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

## 2. D·code (DeepSeek V4.1 Flash, bare Cline, plain HTML)

**The lane:** `own-020/round-cline.mjs --bare` (s2). The work folder starts empty: no create-nodegx, no AGENTS.md, and
an empty `mcpServers`. The HOME seal and `disabledTools` are the same as in D·kit. It ran through `stream-tap.mjs
--mode retry` with Cline 3.0.71 on its defaults (no `--thinking`), with §3's brief as the whole prompt
(`brief.txt`). The script is `round-d.sh`.

Before any quota was spent, a mock round (`mock-model.mjs`) checked the bare mode. Cline offered the model
`read_files`, `search_codebase` and `editor`, and nothing else. Its system prompt does not mention NodeGX or MCP. A
`nodegx__…` call was rejected as an unavailable tool, the seal refused all four paths outside the folder, and the one
write inside the folder landed.

### Round 1 (`runs/d-code-1/`, 2026-10-30 14:35 CET)

| | |
|---|---|
| finish | **`completed`**, exit 0, by itself |
| wall time | **3 min 50 s**, 20 iterations |
| tokens | 620 K in (557 K of it cached, 90%), 14.3 K out |
| tools | 13 `editor` writes to `index.html`, 1 to `README.md`, 8 `read_files`, 3 `search_codebase` |
| tap | 20 requests, 0 bad, 0 retries |
| seal audit | clean |
| ClinePass bars | _Richard's readings: to come_ |
| **grade** | **13/13** (after P112-OWN034-SRONLY; 12/13 before it, a grader fault) |

**What it built:** one `index.html` (695 lines, 25 KB, no dependencies) on `localStorage` (`habit-tracker.v1`), and a
README. A dark card per habit holds a "Mark done for today" button, the last 7 days as buttons that can be pressed
to correct a day, and three chips: the streak, the **best streak**, and the number done in the last 7 days.
It also shows the date, an empty state, a warning if storage is blocked, and syncing between tabs. Delete goes
through `window.confirm`. The streak counts back from yesterday when today is not yet ticked, and the page says so.

Not asked for, and worth noting for §6: **C2 (best streak) is already there.** It also wrote self-tests behind
`#selftest`, and its final message says it "built and verified". It could not have run them, because `run_commands`
is disabled. So "verified" is a claim, not a run.

**The locator** (`runs/d-code-1/locator.json`) was written from the markup before grading. The tick is the row's
`[data-action=toggle-today]`. The days are `[data-role=days] .day`, oldest first, done when `aria-pressed`. The streak
is `[data-role=streak]` ("No streak yet" at 0, which the grader reads as none shown).

**The first grading failed B13, and the grader was wrong.** The check read `cut off: Habit name`, but the phone shot
(`grade/phone.png`) shows nothing cut off. The text was the form's `sr-only` label, a 1×1 px clipped box that is
meant for screen readers only. B13 now skips boxes of at most 1×1 px. Re-measured: clean 13/13 and scrolls-sideways
12/13 (B13, the same reasons) are unchanged, and d-code-1 is 13/13. B13's note: the delete ✕ is under 44 px
(noted, not failed). Filed as P112-OWN034-SRONLY (fixed).

**Richard, after round 1 (2026-10-30):** "Don't worry about ClinePass, just rock out". So the bars are not read in
this study, and that is a standing go for the remaining DeepSeek rounds. The cost per round is the token counts and
the wall time.

### Round 2 (`runs/d-code-2/`, 2026-10-30 14:46 CET)

| | |
|---|---|
| finish | **`completed`**, exit 0, by itself |
| wall time | **3 min 25 s**, 19 iterations |
| tokens | 510 K in (449 K of it cached, 88%), 14.0 K out |
| tools | `editor`: `index.html` ×1, `styles.css` ×4, `app.js` ×5, `README.md` ×1; 9 `read_files`, 2 `search_codebase` |
| tap | 19 requests, 0 bad, 0 retries |
| seal audit | clean |
| **grade** | **13/13** (B13's note: the tick and the delete are under 44 px, noted, not failed) |

**What it built:** three files this time (`index.html`, `styles.css`, `app.js`) on `localStorage`. The look is close
to round 1: dark cards, a pill "Mark done" button, Delete, and seven day buttons. Under the date, it shows
**"N of M done today"**. That is §6's C1, built without being asked. There is no best streak (round 1 had one). The
page has two `sr-only` elements (the form label and a list heading), so the B13 fix held on a second app.

**The locator** (`runs/d-code-2/locator.json`): the tick is `[data-action=toggle-today]` (`aria-pressed`), the days
are `[data-role=week] .day__btn`, oldest first, and the streak is `.streak` ("No streak yet" at 0).

**D·code, both rounds:** 13/13 twice, in under 4 minutes each, at about 0.5–0.6 M input tokens (≈90% cached) and 14 K
output. §7 predicted 12–13. Between them, the two rounds have already built C1 and C2 without being asked, which will
matter when the change round is read.

## 3. D·kit (DeepSeek V4.1 Flash, Cline with the NodeGX kit)

**The lane:** `round-cline.mjs --kit cline` on **the kit a person gets from `npm create nodegx` today**: create-nodegx
0.2.8, `@nodegx/mcp` 0.2.8 and `@nodegx/preview` 0.2.8, packed from the registry. `@nodegx/mcp` 0.2.9 is published,
but it was P128's MCP-only re-cut for the Desktop `.mcpb`. The published create-nodegx 0.2.8 pins
`@nodegx/mcp@0.2.8`, and the runner refuses a kit whose server does not match. A dry run (s2) confirmed the kit lane
after s2's if/else: create-nodegx wrote AGENTS.md and Cline's MCP entry itself, and the round only pointed it at the
tarball. The same tap, retry mode, brief and defaults were used as in D·code.

**Grading a NodeGX app:** the preview runs from the tarball (`noodl-preview <app> --port 48810 --no-watch`) on the
scratch copy, never the copy in the repo, on a fixed port so the app's storage is one origin for the whole grade. A
preview of the repo copy wrote nothing (`diff -rq`: identical). The locator was read from the rendered DOM, after
adding a habit and ticking it in a throwaway profile. NodeGX draws plain `div`s with generated classes and no ids or
ARIA, so:
- the rows are found by shape (`div:has(> button):has(> div > button)`);
- a done day is its inline `background-color: var(--primary)` (an undone day has `var(--muted)`);
- done today is the button's text, "Done today" against "Mark done today".

The locator only finds these things; it computes nothing.

### Round 1 (`runs/d-kit-1/`, 2026-10-30 14:51 CET)

| | |
|---|---|
| finish | **`completed`**, exit 0, by itself |
| wall time | **23 min 10 s**, 52 iterations |
| tokens | 8.83 M in (8.54 M of it cached, 97%), 29.9 K out |
| tools | 11 `drive_page`, 11 `update_component`, 10 `get_node_type`, 4 `stage_plan_operation`, 3 `create_plan`, 1 `apply_plan`, 1 `render_report`, 1 `validate_project`, … (nearly all through `call_tool`: Cline never refreshes its tool list) |
| tap | 52 requests, 0 bad, 0 retries |
| seal audit | clean |
| **grade** | **12/13**: B13 `too small: the name field 257×22`, a NodeGX defect (below) |

**What it built:** a NodeGX project `habit-tracker/` with components Home, HabitRow and DayMark. It uses 12 Groups,
9 Texts, 2 For Each, 3 Expressions, 5 Boolean To String, 3 String Format and a Variable. **All the data and the date
logic is one 144-line JavaScript Function on Home** that reads and writes `localStorage` itself. It does not use
the Global Store with Persist. It also wrote `docs/` (BRIEF, ARCHITECTURE, CONVENTIONS, a decision record). The look
is light, with blue for done: a title, the date, **"N of M done today" (C1 again, not asked)**, the field and Add,
then a card per habit with its name, a streak pill, Delete, seven day letters (no dates), and a full-width "Mark done
today" button.

Choices it reported itself:
- a streak survives an unticked morning;
- **names must be unique** (a second "Drink water" is refused, with the reason under the field);
- **delete is one press with no confirmation.** It offered to add one.

**B13 is a real defect, in NodeGX, not in the app.** The field is drawn 40 px tall (a 1 px border and 8 px / 12 px
padding on the Text Input's `inputWrapper`), but only the 22 px `<input>` inside it takes a press. Measured with real
presses at 390 px: the input's centre focuses it; 4 px inside the drawn box's top or bottom edge lands on the wrapper
and focuses nothing. Nothing on the wrapper moves focus to the input (`TextInput.tsx:296–303`; only the optional
icon has `this.focus()`). Every NodeGX Text Input with padding has this band. Filed as **P112-OWN034-INPUTHIT** (`kit:
node-spec`, open), not fixed in this lane.
