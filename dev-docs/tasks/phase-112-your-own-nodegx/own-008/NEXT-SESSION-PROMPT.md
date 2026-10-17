# OWN-008 next session: run the three strangers (lane 2)

**Not before Saturday 2026-10-17, 23:00 CEST** (R47: Richard's weekly allowance was at 92% on the 16th; it resets
then). Opus. Say so at the start (README §0.2).

1. Read [OWN-008](../OWN-008-THREE-STRANGERS.md) §6 s1 and [`README.md`](README.md) here. Nothing else in the phase.
2. Check nobody else is running heavy work (memory: one heavy job), and that the week is really reset: the first
   `rate_limit_event` of a round prints `seven_day.utilization`. The round's own guard stops it at 90% of the week,
   or at 15% spent by that round alone.
3. Make the lab in this session's scratchpad (`$SP` below): `mkdir -p $SP/own008 && cd $SP/own008 && npm create
   nodegx@0.2.2 base --yes`. If a newer `create-nodegx` is on npm by then, use the newest and write down which.
4. `nohup dev-docs/tasks/phase-112-your-own-nodegx/own-008/series.sh $SP/own008 > $SP/own008/series.log 2>&1 &`
   (table, then blocks, then map; each up to 2 h). Peek at `out/<name>/agent.jsonl` every ~20 minutes: a
   tool-calling loop never trips a watchdog.
5. After each one: read its `REPORT.md` and find its adapter (it names it, or grep the editor for `open(` /
   `apply(` / `save(`). Then `node own-008/grade.mjs <name> $SP/own008 --adapter <path> [--own-edits <path>]`.
6. Drive each editor as a person would (CDP on its own page, `elementFromPoint` before every press; OWN-017's
   `editor-drive.mjs` is the pattern): open a COPY of `templates/todo-list`, change one thing, save. Then grade again
   with `--saved <that copy>`. Take a screenshot of each editor for Richard (AC4):
   `"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --use-mock-keychain
   --user-data-dir=$(mktemp -d) --window-size=1400,1000 --screenshot=<out.png> <url>`.
7. Fold back (§3.4): every guess in a report, and every point where the grade and the stranger's claim disagree,
   becomes a sentence in the brief (`packages/create-nodegx/profiles/core/skills/nodegx-your-own-editor/SKILL.md`)
   or a `kit:` row in `dev-docs/bugs/`. A stranger whose result a guess changed runs again.
8. Copy each stranger's `REPORT.md`, `grade.json` and editor (without `node_modules`) into `own-008/<name>/`, so AC3
   is in this folder.
