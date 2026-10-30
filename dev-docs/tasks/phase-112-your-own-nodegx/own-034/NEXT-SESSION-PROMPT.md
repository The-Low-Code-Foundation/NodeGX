# OWN-034 — next session (s3): the harness lab, for G4 and G2

**Paste this to start the session:**

> OWN-034 s3. Read `dev-docs/tasks/phase-112-your-own-nodegx/own-034/NEXT-SESSION-PROMPT.md`, then
> `../OWN-034-THE-HABIT-TRACKER-RACE.md` §5 and `RESULTS.md` §4–§6. Four of the six lanes are run and graded. Next is
> §8 step 4, the harness lab: Gemma answers closed questions, and the script builds the NodeGX app from fixed blocks.

## Where it stands (s2, 2026-10-30, Opus, `cline-dev`)

**Done and committed** (`41315bb95`, `31959346a`, `9ddc65f8a`, and this file):

| lane | runs | B1–B13 | where |
|---|---|---|---|
| D·code | 2 | **13, 13** | `runs/d-code-1/`, `runs/d-code-2/` |
| D·kit | 2 | **12, 12** | `runs/d-kit-1/`, `runs/d-kit-2/` |
| G4·code | 1 | **11** | `runs/g4-code/` |
| G2·code | 1 | **7** | `runs/g2-code/` |

Each run folder holds its locator, `grade/` (grade.json and four screenshots) and the app. DeepSeek runs also hold
the journal (gzipped from d-code-2 on), `run-result.json`, the tap log and the seal audit.

**Richard, 2026-10-30:** "Don't worry about ClinePass, just rock out". So no quota readings, and a standing go for
the DeepSeek rounds; the cost is tokens and wall time.

**Built in s2:**
- `own-020/round-cline.mjs --bare` (an empty folder, no create-nodegx, `mcpServers: {}`, the same seal) and
  `--dry-run`;
- `round-d.sh` (one DeepSeek round through the retry tap, copied to `runs/<name>/`);
- `brief.txt`;
- `gemma-code.mjs` (one Ollama call, T 0).

**The kit the D·kit lane ran:** create-nodegx, mcp and preview, all **0.2.8** from the registry. `@nodegx/mcp` 0.2.9
is P128's `.mcpb` re-cut, and create-nodegx 0.2.8 pins mcp 0.2.8.

**Filed:**
- **P112-OWN034-SRONLY** (fixed). B13 read an `sr-only` label as cut-off text. It now skips boxes of at most 1×1 px;
  clean and scrolls-sideways were re-run unchanged.
- **P112-OWN034-INPUTHIT** (open, `kit: node-spec`). A NodeGX Text Input is drawn 40 px tall, but only the 22 px
  `<input>` takes a press. It is the only miss in both D·kit apps. It is not this lane's to fix: it touches the
  runtime, the node-spec scenarios and P107-C68's onMouseDown. Tell Richard if a controls lane picks it up.

**What the readings say so far (RESULTS §4):**
- The kit costs about 5–6× the time and about 14× the input tokens of plain code. Most of that input is cache reads.
- Both kit apps got the date logic right.
- Neither used the Global Store with Persist. Both put the store and rules in JavaScript: one big Function in
  d-kit-1; a `scripts/habits.js` file behind four Functions in d-kit-2.
- C1 is already built, unasked, in three of four DeepSeek apps, and C2 in one.

## Next, in order

1. **The harness lab (§5), in `own-034/`, not in `build_app`.**
   - It is an MCP stdio client against `noodl-mcp`, as `own-027/harness.mjs` and `own-027/mcp.mjs` were. Read those
     first, and OWN-027's rule: every option in the words.
   - The model answers closed questions (§5's list).
   - The script owns the blocks:
     - the store: a Global Store with Persist on (`net.noodl.GlobalStore`);
     - the add row;
     - For Each with a row component;
     - one Function per derived number, with the date logic written once and **tested against the grader's frozen
       days before any model runs**;
     - the summary band.
   - Tune it on the habit brief only.
   - The Text Input in the add row will hit P112-OWN034-INPUTHIT, so expect B13 to fail on it too. Do not route
     around it in the block: that would hide the kit defect from the race.
2. **Run G4·harness and G2·harness** at T 0. Check `ollama ps` first, and unload with `keep_alive: 0`.
3. **Grade both,** with a locator per app as in D·kit (preview from the 0.2.8 tarball, fixed port, scratch copy).
   - `dom-dump.mjs` / `tick-probe.mjs` were scratchpad probes. If you need them, rewrite them in `own-034/`.
4. **Then §8 step 5:** the blind gallery for Richard (OWN-030's `gallery.mjs` pattern, the `db` capability, ranks under
   `rankings/habit`). Each app is seeded with the same three habits and a week of ticks, at full size and on a phone.

## Needs Richard (do not do alone)

- The blind ranking (§5b.2), once all six are built.
- Porting the harness into `build_app` is the OWN-031 session's lane: ask that session first, and briefly.
- Not this lane's: whether OWN-019's phone passes should be re-graded (P112-OWN034-INNERWIDTH), and who fixes
  P112-OWN034-INPUTHIT.

## Known before starting

- **Kit pack:**
  `npm pack create-nodegx@0.2.8 @nodegx/mcp@0.2.8 @nodegx/preview@0.2.8` into a scratch folder.
- **Pinned Cline:**
  `npm i cline@3.0.71` in the scratchpad. The binary is `node_modules/cline/bin/cline`; the `.bin` link is not
  made.
- **Locating a NodeGX app's DOM:** the runtime draws `div`s with generated `ndl-d-…` classes, no ids and no ARIA. Find
  rows by shape (`:has`), done days by the inline `style.backgroundColor` token, and done today by text or an icon.
  A class the model set itself (d-kit-2's `.habit-tick`) is the best anchor there is.
- **Previews:** run the preview on the scratch copy, never the repo copy (it wrote nothing in s2, but do not rely on
  that). Use a fixed port, so storage is one origin for the whole grade, and stop it before the next lane.
- **Committing:** a peer has `dev-docs/parked/README.md` staged. s2 committed through a temporary index and then
  `git reset -q HEAD -- <own paths>`, so the real index matches HEAD.
- **Box:** one heavy job at a time; never run a lane beside the grader's Chrome; `nice -n 19`.
