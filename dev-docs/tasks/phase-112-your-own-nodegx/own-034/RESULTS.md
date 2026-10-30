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

### Round 2 (`runs/d-kit-2/`, 2026-10-30 15:18 CET)

| | |
|---|---|
| finish | **`completed`**, exit 0, by itself |
| wall time | **16 min 56 s**, 55 iterations |
| tokens | 7.67 M in (7.43 M of it cached, 97%), 37.7 K out |
| tools | 16 `get_node_type`, 10 `stage_plan_operation`, 7 `list_examples`, 7 `get_example`, 6 `update_component`, 4 `drive_page`, 3 `write_project_doc`, 2 `write_script_file`, … |
| tap | 55 requests, 0 bad, 0 retries |
| seal audit | **one path outside:** `editor: /tmp/fix-note.txt`. The seal refused it (the reason is in the journal) and the file was never written |
| **grade** | **12/13**: B13 `too small: the name field 216×22`, the same Text Input defect (P112-OWN034-INPUTHIT) |

**What it built:** components Home, Habit Store, Habit Row, Day Dot and Empty State. It uses 20 Groups, 9 Expressions,
4 JavaScript Functions, Component Inputs/Outputs on the reused parts, and 2 For Each. The rules (the day string, the
streak, what the screen is shown) are in a **script file, `scripts/habits.js` (143 lines)**, which the Habit Store's
Functions call. The Functions do the `localStorage` reading and writing, and the script touches no browser API.
That is the kit's script-file mechanism used as the kit means it, not one big Function. Again it does not use the
Global Store with Persist.

The look is the cleanest of the four: a round tick disc beside the name, Delete as a quiet text button, seven dots
with day letters, a streak pill that appears only above 0, and **"N of M done today" (C1, unasked, a third time)**.
**Delete asks first, in the page.** The list gives way to "Delete this habit and its ticks?" with Delete and Keep.
That was the grader's first real `confirmRemove`, and B11 passed through it. It says itself that the tick disc is a
Group with a click, so a screen reader cannot name it; the reason is written in its decision record.

**The locator:** rows are `div:has(> .habit-tick)` (the model set that class itself). The streak shows only above 0,
as an 8th cell at the end of the day row, so the days are the cells that hold a dot (`div:has(> div:not(.ndl-visual-text))`).
A done day is the dot's `var(--primary)`. Done today is the check icon inside the tick.

## 4. The DeepSeek lanes, side by side

| run | grade | wall | iterations | in (cached) | out | delete asks | C1 / C2 unasked |
|---|---|---|---|---|---|---|---|
| D·code 1 | **13/13** | 3 m 50 s | 20 | 0.62 M (90%) | 14.3 K | `confirm()` | C2 |
| D·code 2 | **13/13** | 3 m 25 s | 19 | 0.51 M (88%) | 14.0 K | `confirm()` | C1 |
| D·kit 1 | 12/13 | 23 m 10 s | 52 | 8.83 M (97%) | 29.9 K | no | C1 |
| D·kit 2 | 12/13 | 16 m 56 s | 55 | 7.67 M (97%) | 37.7 K | in the page | C1 |

- **§7's prediction holds on the numbers.** D·code was predicted at 12–13 and scored 13 twice. D·kit was predicted at
  11–13 "at about 2–3× the time and quota". It scored 12 twice, but **at about 5–6× the time and about 14× the input
  tokens**. The prediction was too kind on cost. Most of that input is cache reads (97%), on a ClinePass that
  Richard has said not to meter.
- **The predicted misses were wrong.** I expected D·kit to miss on B8–B10 (date logic in a Function) and B13. Both
  kit rounds got all the date logic right. Both missed only B13, and both for a reason in NodeGX, not in the model's
  app: P112-OWN034-INPUTHIT. Fix that, and both kit apps would score 13/13 on the same graph.
- **Where the logic lives.** Neither kit app used the Global Store with Persist. Both kept the store and the date rules
  in JavaScript (one 144-line Function; a 143-line script file behind four small Functions) and drew the screen
  with For Each, Component Inputs and Expressions. Whether that counts as "NodeGX helping" is §2.3's question. The
  graph holds the screens and the wiring; the logic is code in both media.
- **The change round will say less than planned.** C1 is already in three of the four apps and C2 in one. On these
  lanes, C3 (days of the week per habit) is the change that tests anything.

## 5. G4·code and G2·code (Gemma 4 on Ollama, one call each)

**The lane:** `gemma-code.mjs`, OWN-030's bare lane on this brief. The prompt is §3's brief word for word plus
"Write it as one HTML file, with the CSS and the JavaScript inline." It is one `/api/chat` call: T 0, `think: false`,
`num_ctx` 20480, `num_predict` 16000, unloaded after (`keep_alive: 0`). Ollama was checked idle first (the OWN-031
session shares it). The digests match OWN-030 §0.

| run | model (digest) | grade | wall | tokens in / out | stop |
|---|---|---|---|---|---|
| `runs/g4-code/` | E4B (`ee6656371218`) | **11/13** | 3 m 57 s | 74 / 3,572 | `stop` |
| `runs/g2-code/` | E2B (`07ea59a47401`) | **7/13** | 1 m 35 s | 74 / 2,808 | `stop` |

**G4·code (449 lines), 11/13.** It is a working tracker on `localStorage`: a form, a card per habit, a "Mark Complete"
/ "✅ Done Today" button, a × with `confirm()`, and seven grey or green squares.
- **B9 fails, `streak: 1`.** The streak counts *forward* from today (`checkDate.setDate(+1)`), so it is only ever 1 or
  0. B10 passes by luck: 0, then 1 is what forward counting gives on a broken run.
- **B13 fails: `scrolls sideways: 400 > 390; too small: Drink water's delete 22×23`.** The `.container` is
  `width: 100%` with 30 px padding and no `box-sizing`. The phone shot shows the card's left edge cut off.
- It mixes a local "today" with `toISOString()` (UTC) days for the history. At noon in Paris both agree, so the
  frozen clock does not catch it. Late in the evening west of Greenwich, it would file a tick under tomorrow.

**G2·code (341 lines), 7/13.** It is the nothing-saved control, written by a model: **`getHabits()` is defined and
never called**, so every load starts empty. It fails exactly the six checks `control/nothing-saved` fails (B6,
B8–B12). The tick is any day cell, and every cell toggles *today* (the locator presses the today cell). An empty
name raises an `alert()`, which the grader accepts. Its streak loop also mutates its date cumulatively (`-0, -1,
-2 …` from an already moved date), but nothing reached that far.

**Against §7:** I predicted G4·code at 7–10 (persistence and the 7 days present, the streak wrong on B10). It scored
**11**: persistence and the week are right, and the streak is wrong on **B9**, not B10. I predicted G2·code at 4–7. It
scored **7**, with persistence as the whole failure.

## 6. Where the race stands (s3, 2026-10-30)

| lane | runs | B1–B13 |
|---|---|---|
| D·code | 2 | 13, 13 |
| D·kit | 2 | 12, 12 (both: P112-OWN034-INPUTHIT) |
| G4·harness | 1, and 1 under tuning T1 | 11; **12** under T1 (B13: INPUTHIT) |
| G2·harness | 1, and 1 under tuning T1 | 11; **12** under T1 (B13: INPUTHIT) |
| G4·code | 1 | 11 |
| G2·code | 1 | 7 |

All six lanes are built and graded (AC2). Next is §8 step 5, the blind gallery for Richard.

## 7. The harness lab: G4·harness and G2·harness (s3, 2026-10-30)

**The lab** (`harness.mjs`, `prompts.mjs`, `blocks.mjs`, `blocks/days.js`; every question verbatim in
`questions.md`) is an MCP stdio client (`mcp.mjs`) against **the same `@nodegx/mcp` 0.2.8 the D·kit lane ran**,
installed from the registry tarball. Every write goes through `create_project`, `write_script_file`,
`create_plan`, `stage_plan_operation` and `apply_plan`, and meets their validation. The preview is the 0.2.8 tarball
too, run on a scratch copy at a fixed port, as for D·kit.

**What the model decides** (8 decisions and 4–5 words calls, each a closed question with every option in the words):
the item's name, what a day records, the actions, whether delete asks first, the views, how many days back, the
numbers, the look (clean, bold or warm: OWN-032 rule D), and the words, one call per section.

**What the script supplies** (the blocks, `questions.md` §1):
- one Global Store, Persist on, holding `{ items, ticks }`; this is the first app in the race that uses it;
- an add row (the kit vocabulary's `textField` and `primaryButton`);
- a For Each of an Item Row component;
- a tick, a delete (with or without `confirm()`) and the last N days (a For Each of a Day Cell);
- one Function per number, each a single call into `scripts/days.js`;
- a Summary component that declares the same store by name and subscribes to it itself, with no wire from the list.

The date logic is `blocks/days.js`, written once. It was tested by `test-days.mjs` against the grader's frozen days
(B5, B7–B10, B12, the October clock change, a late evening) in Europe/Paris, America/Los_Angeles and Pacific/Auckland
before any model ran: 10 checks, all passing in each zone.

**The blocks' control** (`runs/blocks-control/`): the same build on answers written by hand (every block on), with
no model. It scored **12/13**. Its one miss is **B13 `too small: the name field 248×22`**, which is
P112-OWN034-INPUTHIT, as the handoff predicted. The block was not routed around it.

### The runs (T 0, `think: false`, one call per question, no history; Ollama idle before, unloaded after)

| run | model (digest) | tuning | calls | model time | tokens in / out | B1–B13 | failed |
|---|---|---|---|---|---|---|---|
| `g4-harness-unguarded` | E4B (`ee6656371218`) | — | 12 | 28 s | 2,144 / 216 | 9/13 | B6, B11 (a page error, below), B7, B13 |
| `g4-harness` | E4B | — | 12 | 36 s | 2,144 / 216 | **11/13** | B7, B13 |
| `g2-harness` | E2B (`07ea59a47401`) | — | 13 | 20 s | 2,423 / 203 | **11/13** | B7, B13 |
| `g4-harness-t1` | E4B | T1 | 12 | 36 s | 2,134 / 216 | **12/13** | B13 |
| `g2-harness-t1` | E2B | T1 | 13 | 17 s | 2,413 / 203 | **12/13** | B13 |

Each build (the questions, then the MCP writes) took under a minute. All 62 model answers parsed. Every component
staged with no errors and no warnings, and every app applied in one `apply_plan`.

**What they chose.** At T 0, every untuned run and its T1 rerun gave the same answers.

| | G4 (E4B) | G2 (E2B) |
|---|---|---|
| actions | add, delete, tick for today | add, tick for today, delete |
| ask before delete | yes | yes |
| views | the last days per item (7) | the last days per item (7) |
| numbers | streak | streak, done this week, done today out of all |
| look | clean (modern) | warm (soft) |
| words | "Habit Tracker", "Mark as done" / "Done for today", "1 Streak" | "Habit Tracker", "mark done" / "done today", "1 streak count", and a summary that reads **"1 of 2 Habit Tracker"** |

Neither chose rename or "a number per day", so nothing chosen went unbuilt. G2's summary label is the worst words in
the six apps: it was asked for the words "shown after the count at the top, as in '3 of 5 …'" and gave the title.
The grader does not read the summary, so this shows only in Richard's ranking.

**The page error, and a kit defect: P112-OWN034-SUBSCRIBEFIRST (open, `kit: runtime`).** The first G4 build failed
B6 and B11 on `The script threw: items.map is not a function`, from the Function that makes the rows. The screen was
right. A logging copy (`probe-console.mjs`) showed what the Function receives on every load. Its first input is
`{}`, an empty whole store, not the `items` key; its second is the key's array. The Subscribe node's `value` getter
answers with no keys on the store `app` until its own setters run. `connectInput` copies that first value down the
wire, because it is defined. The blocks now take a key only when it has the key's shape
(`Array.isArray(Inputs.items)`), which is what a careful author would write. The control was rebuilt and still scored
12/13, with no page errors. G4 was then run again from scratch: it gave the same answers and scored 11.
`runs/g4-harness-unguarded/` keeps the 9.

**B7, and tuning T1.** Both models answered the actions question with add, delete and tick for today. Neither
chose untick, which the brief does not name, so a second press did nothing and B7 failed. In code, the undo comes
free with a toggle, and every DeepSeek app has it unasked. Here the menu had made it a separate decision. **T1**
(`prompts.mjs` TUNINGS, recorded in each run's ledger): a mark a person can make, they can take back. The tick
always toggles, and untick leaves the menu. Both lanes were rerun under T1 with the same answers, and both scored
12/13. This is the only tuning, and it was done on the habit brief.

**Against §7.** I predicted the harness lanes at 12–13, "because the script owns the date logic".
- **Untuned, both scored 11.** The date checks (B8–B10, B12) all passed, as predicted. The miss was a decision on
  the menu (B7), which the prediction did not foresee.
- **Under T1, both scored 12.** The one miss is the kit's (INPUTHIT), the same miss as D·kit's.
- **E2B equals E4B.** With the script owning the logic, the 2B model's app passes the same checks as the 4B
  model's. It also chose more of the menu (three numbers and the summary), and its words are worse.

**Where the logic lives, for §2.3.** This is the first app in the race whose saved data is a NodeGX node, not
JavaScript: the Global Store with Persist. Its summary is a second component that reads the same store by name, so
no wire runs from the list to it. Both D·kit apps kept their store in a Function with `localStorage`. The kit itself
points that way:
- `create_project`'s `backend` field says that what one person keeps on their own device is "saved by a Function
  with localStorage" (P112-OWN019-LOCALKEEP, 2026-10-13);
- the Global Store's one-line summary in `list_node_types` does not mention Persist.

D·kit 2 saw both lines. Whether that sentence should name the Global Store with Persist is a question for the kit
(and for Richard), not a defect, so it is not filed. It does show that the harness's one decisive structural choice,
the store, was made by the script, not by any model.

**What the cost looks like next to D·kit.** One harness build is about 2.2 K tokens in and 0.2 K out, local, in under
a minute. One D·kit round was 7.7–8.8 M in (97% cached) and 30–38 K out, in 17–23 minutes. The scores are the same
(12/13), and the miss is the same kit defect.

**The locator** (`runs/<run>/locator.json`) is the same for every harness app. The blocks put a fixed
`cssClassName` on the row, its name, tick, delete, day cell, day dot and streak (`B-classes`). Done today is the
tick's inline `var(--primary)`; a done day is the dot's. The class names change nothing a person sees.

**Saved per run:** the ledger (every call verbatim), the build log, the app (the 4.1 MB unused `starter-imagery`
left out), the render report's two shots, and `grade/`.
