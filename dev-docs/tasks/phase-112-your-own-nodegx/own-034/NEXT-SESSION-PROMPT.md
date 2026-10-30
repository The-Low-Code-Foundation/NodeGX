# OWN-034 — next session (s1): the grader first

**Paste this to start the session:**

> OWN-034 s1. Read `dev-docs/tasks/phase-112-your-own-nodegx/own-034/NEXT-SESSION-PROMPT.md`, then
> `../OWN-034-THE-HABIT-TRACKER-RACE.md` in full. Build the grader (task §5b.1, §8 step 1): the checklist script, a
> hand-made clean habit tracker, and two broken copies. Nothing else runs until the grader fails exactly where it
> should. Commit when it does.

## Where it stands (s0, 2026-10-30, Opus, `cline-dev` at `0bda9f7a3`)

**Scoped, written, not built, NOT COMMITTED.** Nothing has run and no model has been called.

On disk, uncommitted:
- `OWN-034-THE-HABIT-TRACKER-RACE.md` (new, untracked);
- the OWN-034 row in `README.md` and the "Task files: … OWN-034" range in its line 8;
- this file.

Commit these three with a pathspec before anything else. A peer's `git add -A` would otherwise sweep the untracked
file (see memory `staged-files-get-swept-by-a-siblings-commit`).

## What s0 settled (Richard, in chat, 2026-10-30)

- **Next step for the small-model rounds:** stop at pages and test an app with logic and saved data, as a race between
  DeepSeek V4.1 Flash (his ClinePass) and Gemma E2B/E4B. This answers "can it build an app, not only a page?".
- **No emit lane (his ruling).** Harness HTML is "a watered-down NodeGX" rebuilt by hand, and logic between components
  is where it would break. The change round's C1 (a "done today X of Y" count at the top that reads the list's state)
  is the test of that claim.
- **Where my plan of record was wrong or changed:**
  - I had proposed testing "2B + harness vs a ~100B model" on the six landing-page briefs. Richard moved it to an app,
    so that question is answered in this race instead.
  - I had proposed a separate editability probe. That is now the change round (§6).
- **A habit tracker, not a todo list.** `templates/todo-list` exists, so a todo list could be copied, and every model
  has seen thousands.
- **OWN-033 stays reserved for stitching** (parked).
- **OWN-032:** I advised closing it with defaults (shorten running's line, button text 16 px) rather than asking
  round five's pixel questions. Richard did not rule on that. It is OWN-032's own handoff, not this lane's.

## Next, in order (an agent can do these alone)

1. Commit the three files (above).
2. **The grader** (`own-034/grade.mjs` or similar), driven over CDP:
   - checks B1–B13 from §5b.1;
   - a frozen clock per day: inject a `Date` override with `Page.addScriptToEvaluateOnNewDocument` before load, and
     keep `localStorage` across reloads (one profile per app);
   - a locator file per app (which input, which button, where the streak is), read by the grader.
   - Chrome from Claude's shell needs the sandbox off. See memory `my-bash-sandbox-hangs-every-chrome-test`.
3. **The control:** hand-write one clean habit tracker as a plain HTML file using `localStorage`. Then make two broken
   copies: the streak off by one, and nothing saved.
   - The grader must pass the clean one 13/13.
   - It must fail the broken copies on exactly the checks they break: B9/B10 for the streak, B6/B11 for saving.
   - Write that prediction in `own-034/RESULTS.md` §1 before running.
4. Commit. Then stop, or go on to §8 step 2 (the DeepSeek rounds) **only after asking Richard**. It spends his
   ClinePass, and he reads the 5-hour and week bars before and after each round.

## Needs Richard (do not do alone)

- A go for each DeepSeek round, with his quota readings.
- The blind ranking, later (§5b.2).
- Porting the harness into `build_app` is the OWN-031 session's lane. Ask that session first, and briefly.

## Known before starting

- **The DeepSeek runner** is `own-020/round-cline.mjs`, used with `stream-tap.mjs --mode retry`:
  - the pinned Cline install has vanished from the scratchpads, so reinstall it with `npm i cline@3.0.71` in this
    session's scratchpad and pass `--cline-bin`;
  - exit 0 is not success, so read `finishReason`;
  - the key comes from the repo `.env` (`CLINE_PASS_API_KEY`). Never print it.
- **D·code** needs the runner without the NodeGX server. `round-cline.mjs` always adds the MCP entry, so check whether
  a flag exists before writing one.
- **Saved data in NodeGX** is `net.noodl.GlobalStore` with Persist on
  (`packages/noodl-runtime/src/nodes/std-library/agent/globalstorenode.ts`).
- **Box:**
  - one heavy job at a time;
  - the OWN-031 session also uses Ollama, so check `ollama ps`;
  - `nice -n 19` for anything long.
- **Memory index:** it is at ~19.5 KB against a 17.1 KB target, and other sessions share it. Keep additions net-neutral.
