Pick up OWN-038 (lane 1): AC7, the real beginners. Everything before it is done.

Read first: `dev-docs/tasks/phase-112-your-own-nodegx/OWN-038-LEARN-WHILE-YOU-BUILD.md` (rulings R1–R15, the log to
s4) and `own-038/RESULTS.md` (the probes, per harness, with the caveats).

Where things stand on 2026-11-05 (end of s4):
- 0.2.11 is on npm: create-nodegx, create-nodegx-vibe and create-nodegx-cline, `latest` on all three, registry
  shasums equal to the tested tarballs. `@nodegx/mcp` stays 0.2.9. Installed from npm in empty folders, each kit's
  `AGENTS.md` names `https://nodegx.io/help` and says a game's world is "one plain-code page in its own folder".
- The site changelog has the 0.2.11 section (rendered alone; the diff against live was that section only). If
  `curl -s https://nodegx.io/changelog/ | grep -c 'id="create-nodegx-0-2-11"'` says 0, Richard never ran the rsync:
  hand him the command again (s4's log), and commit `site/changelog/` in nodegx-web by pathspec once it's live.
- AC1–AC6 ✅. R15: the first offer stays as worded (VAGUEOFFER `wontfix`).
- `--count` was 0 at the end of s4.

**AC7:** Anna Malzy and one or two more beginners do the practice round, then build their own thing. Record their
time on the round, their words, and Richard's read of what they built next to what an equally new person built
without the round. No claim on the site until it has run. A beginner on Cline in a real chat also settles the open
question in RESULTS.md: were Cline's two lost stops the runner's fault (a new chat per reply) or the skill's?
This waits on Richard's people. Ask him where it stands; don't chase it. If nobody is booked, say so and stop.

Lab, if a probe is needed again: `own-038/arm.mjs make|turn|probe cc-<name>` (a HOME per arm; `OWN038_KIT=<tgz>` for
a local kit), `own-038/turn-cline.mjs <name> <msg> [--reply]`, `own-038/probe-cline.mjs <name>`. Claude Code arms read
Richard's subscription token from `~/.nodegx/claude-oauth-token`; never print it, not even its first bytes. 🔴 A
`claude -p` turn doesn't return while a preview it started is running: stop that preview by parent PID once the
transcript's last message is written. 🔴 `total_cost_usd` on `--continue` is the session's running total.

For the next kit publish (s4's lessons): the harvest gate stops Richard's run whenever an active session re-saves its
phase memory. Triage, then give him the command with `KIT_HARVEST_SKIP="<the note, named>"` already in it, and run
`--count` after. An E404 on `PUT` for a package that exists is an expired npm login: `npm whoami`, then `npm login`.
`ssh`/rsync to nodegx.io is refused by the auto-mode classifier, so the deploy is his command.

Not in this task: the learn.nodegx.io security guides (`~/vscode_projects/nodegx-learn/dev-tasks/securing-your-app/TASK.md`);
the help page in the nav.

End with the handoff and memory (the OWN-036 memory carries OWN-038's line).
