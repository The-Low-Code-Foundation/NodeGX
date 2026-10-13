# OWN-019 — next session (s4): the same-window comparison, then the series

**Written 2026-10-13 ~23:40, end of OWN-019 s3 (Opus 5.5).** Read, in order: `VIBE-AND-LARGE4.md` (the field guide —
its optimisation summary first), `../OWN-019-THE-VIBE-KIT.md` §7 from "s3" on, the P112 README's R30–R32.

**Model:** Opus. Agent under test: Mistral Large 4 in Vibe 2.26.1 on the Vibe Code subscription key. **Run rounds in the
daytime (before ~18:00 CEST) and record the hour:** on 2026-10-13 Large 4 thought at 130–260 chars/s until 18:30 and
~50 after 20:00, with the cache at 9–41% (afternoon 60–76%) and two dropped streams — evening rounds are not
comparable with afternoon ones.

## The rulings that decide this session

- **R30:** Vibe on the subscription, or no Mistral. Vibe's `cost_usd` is the real cost at list prices (verified s3);
  the "≈half" is the launch sale, ending ~2026-10-20.
- **R31:** a written process the agent runs by itself; the lab says only "Continue.".
- **R32 (s3):** one session, taught — notes, parts ≤4 lines proven as it goes, prove, hand over only at ~100 tool calls
  or two failed fixes. **But o1 measured its cost:** with the whole plan in front of it, Large 4 designed the whole app
  in one 171 KB / 30-min think (not a loop) and the watchdog stopped it; the per-part sittings (q6) never thought past
  69 KB. R32 stands until the same-window comparison below says otherwise — then put the numbers to Richard.
- **Teaching (s3, Richard):** kit text for Large 4 is a gentle senior colleague's voice, with the why and the stories.

## Where things are

- **Kits** (s3 scratchpad `…/f0f280e3-…/scratchpad/v/`, may be gone — re-pack from HEAD: create-nodegx is a plain
  `npm pack ./packages/create-nodegx` (relative path!); the MCP from the worktree `own018-s3-pack` at HEAD; preview =
  tgz12's): **tgz27** = R32 one-session kit (`23f96461e`); **tgz26** = per-part sittings kit with rails (`3263a643e`);
  both with MCP at `f419f035c` (Condition + For Each notes).
- **q6** (tgz26, sittings) was left running overnight to `# Done`, recorded from sitting 4 (`q6/calls/`, proxy on port
  8795 started with nohup — kill it when q6 ends: `lsof -ti tcp:8795 -sTCP:LISTEN`). **First: read q6** — `q6.log`,
  `sittings.json`, `anatomy.mjs q6`, `record-proxy.mjs --compare q6/calls` (does each request extend the one before?
  `calls.jsonl` cached_tokens per call answers the evening-cache question), and **grade it** if it reached `# Done`
  (`own-018/grade-quiz.mjs <q6> --tgz <tgz26>`). Also kill the o1 proxy (port 8796) if still up.
- **AFTERTIMEOUT:** fixed (the app's graph; Condition note). **For Each notes:** the four mined questions answered.

## Do, in order

1. **Read q6** (above) and record it in §7 and the field guide.
2. **The same-window comparison**, daytime, both `--record`, side by side: **o2** = tgz27 (`--sittings 4
   --max-price 10 --stall-min 45`) and **q7** = tgz26 (`--sittings 14 --max-price 6`). Measure per round: grade
   (grade-quiz), finished by itself, wall time, Vibe $, cached %, longest think, hook firings. `anatomy.mjs` on both.
3. **Put the result to Richard in plain words** (one session vs sittings: time, cost, grade) and let him rule.
4. **Then AC4/AC5 on the chosen shape** (three quiz rounds clean in a row; Pack It again).
5. **Untried levers, one per round** (field guide summary §7): `auto_compact_threshold` ~118k; a `post_agent`
   "no `# Done` with a line unproven" hook; `system_prompt_id` (could drop Vibe's headless "single pass" line); a
   repetition-aware stall guard via the recorder (a loop repeats its 8-word phrases ~100%; a productive think ~1%).
6. AC6 (Richard's own run, interactive — no headless "single pass" line there) and AC8 (Fable 5.1 audit; the field
   guide is its first read).
