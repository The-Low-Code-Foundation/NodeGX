# OWN-034 — next session (s4): the blind gallery for Richard

**Paste this to start the session:**

> OWN-034 s4. Read `dev-docs/tasks/phase-112-your-own-nodegx/own-034/NEXT-SESSION-PROMPT.md`, then
> `../OWN-034-THE-HABIT-TRACKER-RACE.md` §5b–§6 and `RESULTS.md` §6–§7. All six lanes are built and graded. Next is
> §8 step 5: the blind gallery, so Richard can use the six apps and rank them.

## Where it stands (s3, 2026-10-30, Opus, `cline-dev`)

| lane | runs | B1–B13 | where |
|---|---|---|---|
| D·code | 2 | 13, 13 | `runs/d-code-1/`, `runs/d-code-2/` |
| D·kit | 2 | 12, 12 | `runs/d-kit-1/`, `runs/d-kit-2/` |
| G4·harness | untuned; T1 | 11; **12** | `runs/g4-harness/`, `runs/g4-harness-t1/` (+ `g4-harness-unguarded/`, 9: the SUBSCRIBEFIRST evidence) |
| G2·harness | untuned; T1 | 11; **12** | `runs/g2-harness/`, `runs/g2-harness-t1/` |
| G4·code | 1 | 11 | `runs/g4-code/` |
| G2·code | 1 | 7 | `runs/g2-code/` |

Every 12 has the same single miss, B13 on a Text Input (P112-OWN034-INPUTHIT). `runs/blocks-control/` is the
harness blocks on hand-written answers, with no model: 12/13.

**Also s3, at Richard's question** ("isn't this just Claude prebuilding the app and giving the 2B model some
choices?"), RESULTS §8:
- a null model (`--random <seed>`, `runs/random-1/` … `random-5/`) scores **9, 4, 5, 10, 5**;
- **H1 and H2 ran early** on the blocks unchanged (`runs/g{4,2}-harness-h{1,2}/`). Both build a habit tracker
  wearing the new brief's words: no children or stars in H1; no interval or due date in H2. G4·H2 cannot even
  record a watering (it chose add and rename).
- The conclusion is in RESULTS §8 "What this says". Richard's reading was right: the app is the blocks, the model
  reads, and the blocks do not carry to the next app. §8 step 7 is done. Do not rerun it.

**Built in s3:**
- `--brief <file>` and `--random <seed>` on the harness; `brief-h1.txt`, `brief-h2.txt`;
- the lab: `harness.mjs` (questions → blocks → the kit's MCP), `prompts.mjs`, `blocks.mjs`, `blocks/days.js` (the
  date logic), `test-days.mjs` (10 checks × 3 time zones), `mcp.mjs` (the 0.2.8 server), `probe-console.mjs`;
- `questions.md` is generated (`node harness.mjs --questions`). Do not edit it by hand.

**Running the lab:** `OWN034_MCP_BIN=<install>/node_modules/@nodegx/mcp/bin/noodl-mcp.js node harness.mjs --run <name>
--model gemma4:e4b-it-qat [--tuning T1] --project <empty dir>`. The install is `npm i <the 0.2.8 tarballs>` in a
scratch folder (see "Known before starting"). `--answers control-answers.json` builds with no model.

**Filed:** **P112-OWN034-SUBSCRIBEFIRST** (open, `kit: runtime`). A Subscribe to Store's first value down a wire is
the whole store of the default name (`{}`), not its key. This happens on every load. The blocks now guard against
it; the evidence is in RESULTS §7 and the bug file.

**Not filed, but worth Richard's eye:** the kit steers device-local data to "a Function with localStorage"
(`create_project`'s `backend` description, from P112-OWN019-LOCALKEEP). The Global Store's summary never mentions
Persist. Both D·kit apps followed that line. The harness is the only lane that used the Global Store (RESULTS §7).

## Next, in order

1. **Decide which run stands for each lane in the gallery.** The task says "six apps". My recommendation:
   - D·code and D·kit: round 1 of each (`d-code-1`, `d-kit-1`), chosen before looking, so neither is the
     prettier pick. Alternatively, show both rounds as eight apps.
   - G4 and G2 harness: the **T1** runs, the tuned harness as it now stands, with the untuned scores in RESULTS.
   - If Richard would rather choose, ask him on one screen, in plain words.
2. **How the gallery shows a live app.** OWN-030's `gallery.mjs` showed screenshots only. This brief says Richard
   *uses* each app, seeded with the same three habits and a week of ticks, at full size and on a phone. Options:
   - **(a) Static builds as artifact files.** Each NodeGX app is the preview's bundle (`noodl.deploy.js` and the
     project JSON). Check whether `noodl-preview` or the kit can write a static build first. The code apps are
     single HTML files.
   - **(b) Seeded screenshots,** plus a local link list for the use part.

   Seeding goes through each app's own storage: D·code's `localStorage` keys, D·kit's keys, and the harness's
   `noodl_store_nodegx.tracker`. Seed on a frozen Thursday, as the grader does.
3. **The page:** letters A–F in a shuffled order from a recorded seed, with the key in `runs/blind-key.json` and
   never on the page. Ranks are stored under `rankings/habit` (the `db` capability). Load `artifact-capabilities`
   before writing it.
4. **Then §6, the change round,** after Richard ranks. Run C1–C3 per lane, then grade again. The harness lane takes
   each change as a re-run from the request with the change added, and the saved data must survive the change.
   - C1 (done today out of all) and C2 (best streak) are on the harness menu.
   - C3 (days of the week per habit) is not a block. §7 predicts it fails there.
   - Given §8, ask Richard whether the change round is still worth running on the harness lane. On the code and
     kit lanes it still tests something (C3).

## Needs Richard (do not do alone)

- The blind ranking (§5b.2).
- Porting the harness into `build_app` is the OWN-031 session's lane: ask that session first, and briefly.
- Not this lane's: P112-OWN034-INPUTHIT, P112-OWN034-SUBSCRIBEFIRST and P112-OWN034-INNERWIDTH; the LOCALKEEP wording.

## Known before starting

- **Kit:** `npm pack create-nodegx@0.2.8 @nodegx/mcp@0.2.8 @nodegx/preview@0.2.8` into a scratch folder, then
  `npm i ./nodegx-mcp-0.2.8.tgz ./nodegx-preview-0.2.8.tgz` there. The preview is `node_modules/.bin/noodl-preview
  <app> --port <fixed> --no-watch`, run on a scratch copy and stopped by its port
  (`kill $(lsof -nP -t -iTCP:<port> -sTCP:LISTEN)`).
- **Grading** needs Chrome, so run it with the Bash sandbox off. Never run it beside a lane.
- **Saved apps** leave out `noodl_modules/starter-imagery` (4.1 MB, unused). Copy it back from a fresh
  `create_project` if a preview needs it. The harness apps do not.
- **Ollama:** check `ollama ps` first (the OWN-031 session shares it). The harness unloads its model when it finishes.
- **Committing:** a peer has `dev-docs/parked/README.md` staged. Commit through a temporary index with pathspecs,
  then `git reset -q HEAD -- <own paths>`.
