# OWN-034 — The habit tracker race: DeepSeek in Cline against Gemma through questions

**Opened 2026-10-30** (Opus, after OWN-032 s8, at Richard's ask). **Status: ⬜ scoped, not started.** OWN-033 stays
reserved for stitching heroes into pages (parked).
**Models:** DeepSeek V4.1 Flash on Richard's ClinePass (`cline-pass/…`, the OWN-020 lab); Gemma 4 E2B and E4B on
Ollama 0.40.12, the OWN-030 §0 digests (`07ea59a47401`, `ee6656371218`).

## 1. The person sentence

Richard, 2026-10-30:

> I'd love to do a test of something more difficult like a todo list app or habit tracker, something that requires
> logic and local data storage, maybe doing a competition between DeepSeek 4.1 Flash using my Clinepass, and Gemma 4
> 2B and/or 4B.
>
> [On the emit lane:] for that to work you kind of have to create a watered down nodegx anyway, because the Gemma
> model isn't writing code, it's making decisions and the HTML snippet comes primed with options and tweaks […]
> essentially reinventing the wheel of what's already very finely tuned in NodeGX. I'd also wonder if multiple
> components would work well together visually in harness HTML vs harness NodeGX, especially for logic between
> components, which is why I think a more complex app is called for to push it.

The test of done: **one brief, six apps, the same checks on every one. Richard uses each blind and ranks them. Then
the same three changes are asked of each lane, and the checks run again.**

## 2. What it decides

1. **Can a 2B or 4B model build an app with logic and saved data, not only a page?** So far that has been done only
   for a counter (OWN-031) and pages (OWN-027 to OWN-032).
2. **How close is the small model with the harness to a cheap frontier model?** Richard said "near ~100B, at 2B"
   (OWN-030 §6). That was never measured.
3. **Does NodeGX help once there is logic between components?** On pages, the same answers turned into HTML looked as
   good as NodeGX (OWN-030). Richard's argument is that this holds only because the HTML was a small NodeGX rebuilt
   by hand, and that logic shared between components is where that stops working. The change round (§6) is where
   this shows: a change that crosses components.

## 3. The brief (written before any lane runs; nothing is tuned on it except the harness lane, §5)

> I want a habit tracker. I can add habits, tick each one off for today, and see the last 7 days for each one, with a
> streak count. It should remember everything when I come back. I can delete a habit.

Why not a todo list: `templates/todo-list` is in the repo and in the kit's world, and every model has seen a thousand
of them. A habit tracker needs dates, a streak worked out from the ticks, and a list where each row holds its own days.

**Held out (stretch, for the harness lane only, after it is tuned):**
- H1: "A chore chart for my two kids: each chore ticked off per child per day, and how many stars each one has this
  week."
- H2: "A plant watering tracker: my plants, when I last watered each one, and which ones are due today. Each plant has
  its own number of days between waterings."

## 4. The lanes

| lane | model | medium | how it runs |
|---|---|---|---|
| **D·kit** | DeepSeek V4.1 Flash | NodeGX, through the kit's MCP | `own-020/round-cline.mjs --kit cline` + `stream-tap.mjs --mode retry`, an empty HOME, the sentence alone |
| **D·code** | DeepSeek V4.1 Flash | plain HTML/JS, `localStorage` | the same runner on an empty folder, no NodeGX server |
| **G4·harness** | Gemma E4B | NodeGX, the server asks | the new lab harness (§5) |
| **G2·harness** | Gemma E2B | NodeGX, the server asks | the same harness |
| **G4·code** | Gemma E4B | one HTML file | one prompt, one answer (OWN-030's bare lane) |
| **G2·code** | Gemma E2B | one HTML file | the same |

- **DeepSeek runs twice per lane** (it samples); the Gemma lanes run at T 0, once each.
- **No emit lane.** This is Richard's ruling (§1). For an app, emit would mean writing a state framework that copies
  NodeGX. Instead, the write-up states plainly what the harness's script supplies (the building blocks of §5) and
  what the model chose.
- **No Gemma-in-Cline lane** with the full kit surface. OWN-027 v1 and OWN-030's Goose benchmark (no page in 25 min)
  already measured that failure.

## 5. The harness lane: what the model decides and what the script owns

**The lab first, in `own-034/`, not in `build_app`.** `build_app` is the OWN-031 session's lane; porting into it is a
later step, asked first. The lab is an MCP stdio client against `noodl-mcp`, as `own-027/harness.mjs` was, so every
write goes through the real tools and their validation.

**The model answers closed questions, with every option in the words (OWN-027's rule):**
- what is tracked (the item's name, and what an item holds);
- what each item records per day (done or not; later, a number);
- which derived numbers to show, from a menu: a streak (days in a row ending today or yesterday), done this week,
  done today out of all, best streak;
- which actions it needs, from a menu: add, delete, tick for today, untick, rename;
- which views to show: a list, the last N days per item, a summary at the top;
- the look (OWN-032's rule D: ask "clean, bold or warm?" when the request names none);
- the words (one call per section, OWN-029's grain).

**The script owns the building blocks**, each a fixed NodeGX graph piece the model picks by name:
- the store: a Global Store with Persist on (`net.noodl.GlobalStore`), as `{ items: [...], ticks: {itemId: [dates]} }`;
- an add row (input, button, empty-name refusal);
- a For Each over the items with a row component (`Component Inputs` for the item), holding the last N days;
- one Function node per derived number, with the date logic written and tested once;
- the summary band, which reads the same store (this is the "logic between components" piece).

**The honest caveat:** in this lane we write the logic and the model chooses it. That is the thesis ("the taste lives
in the system"). H1 and H2 test whether it is a general app kit or a habit tracker template in disguise.

## 5b. Grading

1. **The checklist**, driven by one script over CDP on every app, with a frozen clock per "day" (a `Date` override
   injected before the page loads) and the browser's storage kept between reloads:

   | # | day | check |
   |---|---|---|
   | B1 | Mon 2 Nov | It starts empty and says so, or asks for a first habit. No crash and no placeholder text. |
   | B2 | | Adding "Drink water" shows it. |
   | B3 | | Adding "Read 10 pages" shows both, in the order they were added. |
   | B4 | | An empty name adds nothing. |
   | B5 | | Ticking "Drink water" for today shows it done. |
   | B6 | | After a reload, both habits and the tick are still there. |
   | B7 | | Unticking works, and ticking again works. |
   | B8 | Tue 3 Nov | Yesterday's tick shows as yesterday, and today is empty. |
   | B9 | | After ticking today, Drink water's streak is 2. |
   | B10 | Thu 5 Nov | The streak has broken (0, or no streak shown); after ticking, it is 1. |
   | B11 | | Deleting "Read 10 pages" removes it, and it stays gone after a reload. |
   | B12 | | The last 7 days are visible for each habit, with the done days marked correctly. |
   | B13 | | On a phone (390 px), nothing is cut off, nothing scrolls sideways, and every control can be tapped. |

   The apps differ, so a **locator file per app** (which input, which button, where the streak is) is written after
   the build and before the checks run, and is saved with the run. **Before any lane, the grader runs on a hand-made
   control and on two broken copies of it** (streak off by one; nothing saved) and must fail exactly those checks.
2. **Richard, blind:** a gallery page in the OWN-030 pattern (the `db` capability, ranks under `rankings/habit`). Each
   app opens full size and on a phone, already seeded with the same three habits and a week of ticks. He ranks them
   and says why.
3. **The cost:**
   - wall time;
   - tokens in and out;
   - the ClinePass 5-hour and week bars, read by Richard before and after each DeepSeek round (OWN-020's way);
   - local minutes for the Gemma lanes.

## 6. The change round (after the first ranking)

The same three changes go to each lane in its own medium. DeepSeek gets them in the same Cline session it built in.
Each Gemma code lane gets its file and the change. The harness lane takes each change as a re-run from the request
with the change added, and **the saved data must survive the change**.

- C1: "At the top, show how many habits I've done today out of how many." This crosses components: the summary reads
  the list's state.
- C2: "Show each habit's best streak ever, beside the current one."
- C3: "Let me choose which days of the week a habit is for. Days it isn't for don't break the streak."

Then B1–B13 run again, plus one check per change, on the same frozen days.

## 7. Pre-registered (Opus, 2026-10-30, before anything is built)

- **D·code** passes 12–13 of 13 and costs the least DeepSeek time. **D·kit** passes 11–13 at about 2–3× the time and
  quota. Its likeliest misses are B8–B10 (date logic in a Function node) and B13.
- **G4·code** produces one file that mostly works. I predict 7–10 of 13: persistence and the 7 days present, the streak
  wrong on B10. **G2·code** gets 4–7.
- **G4·harness and G2·harness** pass 12–13, because the script owns the date logic. Whether they look as good as
  D·kit is Richard's ranking; I guess D·kit ≥ harness > the code lanes.
- **The change round:** C1 and C2 work on the harness lane (both on the menu). **C3 fails on the harness lane**
  unless "days of the week per item" is a building block, which it will not be at the start. D·kit and D·code pass
  C1–C2 and at least half of C3. **The interesting row is C1 on G4·code**, where the logic between components lives
  in one file the small model must edit.
- If every harness check passes but H1 or H2 fail outright, the harness is a template, and the write-up says so.

## 8. Build order

1. **The grader first (§5b.1):** the checklist script, the hand-made control and its two broken copies. Nothing else
   runs until it fails exactly where it should.
2. **The DeepSeek lanes:** D·code ×2, then D·kit ×2, one round at a time, Richard reading the quota bars. These set
   the bar, cheaply.
3. **G4·code and G2·code:** one call each, minutes.
4. **The harness lab (§5),** tuned on the habit brief only, and run on G4 and G2.
5. **Grade all six, then the blind gallery for Richard.**
6. **The change round (§6),** then grade again.
7. **H1 and H2** on the harness lane, unchanged.
8. The write-up answers §2's three questions in `own-034/RESULTS.md`.

## 9. Acceptance criteria

1. The grader fails the two broken controls on exactly the checks they break, and passes the clean one 13/13.
2. All six lanes have built an app (or failed on the record, with the reason) and been graded on B1–B13, with their
   locator files saved.
3. Richard has ranked the six blind.
4. The change round has run on every lane that built an app, and been graded.
5. `RESULTS.md` answers §2.1–§2.3 in plain words, grades §7's predictions, and states the cost per lane.
6. Every kit defect met is filed in `dev-docs/bugs/` (`kit:`).

## 10. Box discipline

- One heavy job at a time.
- The DeepSeek rounds run remotely, but Cline, the MCP server and the preview are local. Run them while Ollama is
  idle (check `ollama ps`: the OWN-031 session also uses Ollama).
- Never run two lanes at once, and never run a lane beside the grader's Chrome.
- Unload the Gemma models with `keep_alive: 0` when stopping.
- The OWN-020 traps apply:
  - exit 0 is not success, so read `finishReason`;
  - the gateway's in-band stream error is real, so use the retry tap;
  - the pinned Cline 3.0.71 install lives in a scratchpad and vanishes, so reinstall it with `npm i cline@3.0.71`.

## 11. Links

`own-020/` (round-cline, stream-tap), `own-030/` (the bare lane, the gallery pattern, RESULTS §6), `own-031/` and
`noodl-mcp/src/tools/buildApp.ts` (the counter branch, the door), `own-032/` (rule D, the looks),
`noodl-runtime/src/nodes/std-library/agent/globalstorenode.ts` (Persist), memory notes `own-030-code-or-nodegx`,
`own-032-the-workbench`.
