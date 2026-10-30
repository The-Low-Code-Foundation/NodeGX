# OWN-034 — next session (s2): the DeepSeek rounds, with Richard's go

**Paste this to start the session:**

> OWN-034 s2. Read `dev-docs/tasks/phase-112-your-own-nodegx/own-034/NEXT-SESSION-PROMPT.md`, then
> `../OWN-034-THE-HABIT-TRACKER-RACE.md` and `RESULTS.md` §1. The grader is proven. Next is §8 step 2, the DeepSeek
> lanes. First add a bare mode to the Cline runner for D·code, then ask Richard for his go and his quota readings
> before each round.

## Where it stands (s1, 2026-10-30, Opus, `cline-dev`)

**Done and committed:**
- s0's scoping, committed at `46f0ee55e`;
- s1's grader, controls, results and bug, committed with this file.

**No model has been called. No ClinePass quota has been spent.**

**Built in s1:**
- `grade.mjs <locator.json> [--out <dir>]` checks B1–B13 over CDP.
  - The clock is frozen per day: a `Date` override injected before any page script, noon Europe/Paris on Mon 2,
    Tue 3 and Thu 5 Nov.
  - It uses one Chrome profile per app, so storage survives reloads, and a new page load for each day.
  - Presses are real, at the element's centre, and refused if they would land on something else. `confirm()` is
    accepted.
  - It writes `grade.json` and four screenshots. Exit 0 means 13/13.
  - Chrome needs the Bash sandbox off.
- **The locator format** is in the grader's header comment: CSS selectors, plus page-side function source for
  `todayDone` and `dayDone`. It may say only where things are; it never computes a streak or a date. It serves a
  folder (`serve` + `page`) or points at a `url`.
- **`control/`**: `clean/` (a hand-made tracker on `localStorage`), and `make-broken.mjs`, which writes five copies
  with one line changed each.

**Readings, all on the final grader** (`RESULTS.md` §1, each matching its prediction):

| control | result | failed |
|---|---|---|
| clean | 13/13 | — |
| streak-off-by-one | 11/13 | B9, B10 |
| nothing-saved | 7/13 | B6, B8–B12 |
| adds-empty | 10/13 | B4, B6, B11 |
| week-ends-yesterday | 11/13 | B8, B12 |
| scrolls-sideways | 12/13 | B13 |

**AC1 is met.**

## What s1 settled, including where the handoff was wrong

- **The handoff predicted that nothing-saved would fail "B6/B11". That was wrong.** Every new day is a new page load,
  as for a person coming back, so an app that saves nothing has no yesterday and fails B8–B12 too. B7 was moved ahead
  of B6 so that it does not depend on saving. B12 runs before B11, so both habits' weeks are read.
- **B13 was blind on its first version.** Under `mobile: true`, Chrome grows `innerWidth` to the content: on a page
  486 px wide at a 390 px phone, `innerWidth` reads 486. The scrolls-sideways copy scored 13/13. B13 now measures
  against the 390 the grader set.
  - Two older lab graders have the same blind check: `own-019/grade-launch.mjs` (phone) and P78's todo
    `staging-e2e.js`. They are filed as **P112-OWN034-INNERWIDTH**.
  - `render_report` is not affected: `nodegx-render-measure` uses `clientWidth`.
  - Memory: `a-phone-overflow-check-against-innerwidth-never-fires`.
- **Still unexercised:**
  - a locator for a NodeGX app (drawn after load; the grader waits for the name field, for up to 15 s);
  - an in-page delete confirm (`confirmRemove`);
  - B1 and B3, which no copy fails. B1 is mostly "no crash"; B3 is B2 plus order.
- **`own-020/round-cline.mjs` has no bare mode.** It always runs `npm create nodegx` in the folder (AGENTS.md,
  `.mcp.json`) and always writes the nodegx MCP entry (lines ~101–122). D·code needs an empty folder, no AGENTS.md and
  no MCP server.

## Next, in order

1. **A bare mode for D·code** in `round-cline.mjs`, for example `--bare`: an empty `apps/`, no create-nodegx, and an
   empty `mcpServers`.
   - Keep the HOME seal and the `disabledTools` the same, so the two lanes differ only in the kit.
   - Check it without spending quota: run up to the point where Cline would start, then read the written
     `cline_mcp_settings.json` and the folder.
   - Reinstall the pinned Cline first: `npm i cline@3.0.71` in this session's scratchpad, then pass `--cline-bin`.
2. **Ask Richard** for a go on D·code round 1, with his 5-hour and week bar readings before it.
   - Run it with `stream-tap.mjs --mode retry`.
   - Read `finishReason`, because exit 0 is not success.
   - Get his readings after the round.
   - The sentence is §3's brief, word for word.
3. **Write the locator** for the app it built, by reading the DOM, before grading. Save it with the run under
   `own-034/runs/d-code-1/`, then grade.
4. Round 2 of D·code, then D·kit ×2 (`--kit cline`), **one round at a time, each with Richard's go**. For a D·kit app,
   the locator's `url` is the preview of the app. Start the preview as OWN-018/019 did (`npx @nodegx/preview`), and add
   a `start` field to the grader if that is cleaner.
5. Then G4·code and G2·code (§8 step 3: one Ollama call each). Check `ollama ps` first, because the OWN-031 session
   shares Ollama.

## Needs Richard (do not do alone)

- A go for each DeepSeek round, with his quota readings before and after.
- The blind ranking, later (§5b.2).
- Porting the harness into `build_app` belongs to the OWN-031 session's lane. Ask that session first, and briefly.
- Not this lane's to fix, but his call: whether the OWN-019 phone passes should be re-graded now that
  P112-OWN034-INNERWIDTH shows they were blind.

## Known before starting

- The runner's other traps (OWN-020):
  - the key comes from the repo `.env` (`CLINE_PASS_API_KEY`); never print it;
  - the gateway's in-band stream error is real, so use the retry tap.
- **Saved data in NodeGX** is `net.noodl.GlobalStore` with Persist on.
- **Box:**
  - one heavy job at a time;
  - never run a lane beside the grader's Chrome;
  - use `nice -n 19` for anything long.
- **Memory index:** about 20.0 K UTF-16 units against a 17.5 K target, shared with other sessions. s1 added nothing to
  it; the new note is linked from `harness-and-gates-pointers.md`.
