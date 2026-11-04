Pick up OWN-038 (lane 1): AC1–AC6 are ✅. What's left is the next kit cut and the real beginners.

Read first: `dev-docs/tasks/phase-112-your-own-nodegx/OWN-038-LEARN-WHILE-YOU-BUILD.md` (rulings R1–R14, the s2 logs)
and `own-038/RESULTS.md` (the probes, per harness, with the caveats).

Where things stand on 2026-11-04 (end of s2):
- R13 (the first offer only for someone new who hasn't said what to build) and R14 (a game's world is one plain
  page) are ruled.
- Two kit fixes are committed and **not on npm**:
  - `943328f1d`: R14, P112-OWN037-SECONDSERVER;
  - `ac9303f4a`: the stuck person pointed to nodegx.io/help from the folder note, P112-OWN038-STUCKHELP, re-measured
    on a locally packed kit.
- The probes: Claude Code ≈ $21.40, Cline ≈ $0.80. The `.env` API key ran dry; Claude Code arms now read
  Richard's subscription token from `~/.nodegx/claude-oauth-token`. Never print it, not even its first bytes: the
  classifier refuses that.

Next, in order:
1. **The 0.2.11 cut** (create-nodegx, -vibe, -cline in lockstep; `@nodegx/mcp` only if its own lane has moved). The
   two fixes above go out with it. First run `node scripts/kit-learnings/harvest.mjs --count` and triage. Then the
   cut's own edits. Then triage again (a closed bug file re-trips `--gate`). Hand Richard the publish command with
   `KIT_HARVEST_SKIP` naming the peers' status notes, and run `--count` after. Changelog section: a stuck person gets
   the help page from the first reply; a game's world is one plain page.
2. **Ask Richard P112-OWN038-VAGUEOFFER** (`node scripts/bugs.js --from P112-OWN038`), in plain words: Cline offered
   the round to "an app for my running club" at its first reply, and Claude Code waited for a vague answer. Keep it
   (one line, and a vague brief is who the round is for), or add "if my first message names an app or game, don't
   offer it then"? Recommend keeping it, unless he wants R13 exact.
3. **AC7:** Anna Malzy and one or two more beginners do the round, then build their own thing. Record time, their
   words, and Richard's read. No claim on the site until it has run. A beginner on Cline in a real chat also settles
   the open question in RESULTS.md: whether Cline's two lost stops were the runner (a new chat per reply) or the
   skill.

Lab, if a probe is needed again: `own-038/arm.mjs make|turn|probe cc-<name>` (a HOME per arm; `OWN038_KIT=<tgz>` for
a local kit), `own-038/turn-cline.mjs <name> <msg> [--reply]`, `own-038/probe-cline.mjs <name>`. 🔴 A `claude -p`
turn doesn't return while a preview it started is running: stop that preview by parent PID when the transcript's
last message is written. 🔴 `total_cost_usd` on `--continue` is the session's running total.

Not in this task: the learn.nodegx.io security guides (`~/vscode_projects/nodegx-learn/dev-tasks/securing-your-app/TASK.md`);
the help page in the nav.

End with the handoff and memory (the OWN-036 memory carries OWN-038's line).
