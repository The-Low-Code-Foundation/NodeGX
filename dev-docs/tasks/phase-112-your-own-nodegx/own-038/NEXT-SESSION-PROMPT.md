Pick up OWN-038 (lane 1) after Richard publishes 0.2.11: check the registry, test the three kits from npm, put the
changelog section on the site. Then AC7, the real beginners.

Read first: `dev-docs/tasks/phase-112-your-own-nodegx/OWN-038-LEARN-WHILE-YOU-BUILD.md` (rulings R1–R15, the s3 log)
and `own-038/RESULTS.md` (the probes, per harness, with the caveats).

Where things stand on 2026-11-05 (end of s3):
- The cut is committed: `738b11a36` `chore(release): npm 0.2.11` (create-nodegx, -vibe, -cline at 0.2.11;
  `@nodegx/mcp` stays 0.2.9). It carries R14 (`943328f1d`, a game's world is one plain page) and STUCKHELP
  (`ac9303f4a`, the stuck person gets nodegx.io/help from the folder note). Package test 42/42. `--gate` passed after
  the release commit and again after the docs commit.
- Tarballs, packed from `738b11a36` with `git archive`, in `~/vscode_projects/OpenNoodl-worktrees/npm-0.2.11-tarballs/`:
  - `create-nodegx-0.2.11.tgz` 0d926772eda066e3c430351367a9429ec9a6a40f
  - `create-nodegx-cline-0.2.11.tgz` 88dd88852d9c8a4aaad0ceeef1122929ad60068b
  - `create-nodegx-vibe-0.2.11.tgz` 51ee81b039d249f7a07e642bb45a89fbb41ec57a
  Installed together into an empty folder, all three folder notes say "one plain page" and name the help page.
- R15 (Richard, 2026-11-05): the first offer stays as worded. P112-OWN038-VAGUEOFFER is `wontfix`.
- Not pushed: `cline-dev` is ahead of origin. Richard pushes, then publishes:
  `git push origin cline-dev && scripts/own/publish-npm.sh ~/vscode_projects/OpenNoodl-worktrees/npm-0.2.11-tarballs`
  If the gate stops him, it's a peer saving its phase memory between the triage and his run (it happened twice on
  0.2.10). Triage that entry, or he adds `KIT_HARVEST_SKIP="<the peer's status note, named>"` in front. Run `--count`
  after either way.

Steps, once he says it's published:
1. Registry shasums equal the three above. Read the full document with `curl` (`publish-npm.sh`'s `registry_shasum`);
   `npm view` lags.
2. In empty folders outside the checkout: `npm create nodegx@0.2.11`, `npm create nodegx-cline@0.2.11` (with `HOME`
   set to a scratch folder, or it writes Richard's real Cline MCP file) and `npm create nodegx-vibe@0.2.11`. Each
   `AGENTS.md` names `https://nodegx.io/help` and says "one plain page".
3. The site changelog, the s1 way: in `~/vscode_projects/nodegx-web`, run `python3 ops/changelog.py`, then wrap
   `changelog/_page.html` into `index.html` with `build.py`'s `wrap()` for that one folder. Never run all of
   `ops/build.py`: other sessions have edits in `site/`. First check `git status` and the mtime of `site/changelog/`, and
   compare its md5 with the live page. The diff against live should be the 0.2.11 section only. rsync
   `site/changelog/index.html` alone (flags written inline), `chown caddy:caddy`, curl 200, commit by pathspec.
4. `--count` once more; the handoff and memory.

Then **AC7:** Anna Malzy and one or two more beginners do the round, then build their own thing. Record their time,
their words and Richard's read. No claim on the site until it has run. A beginner on Cline in a real chat also settles
the open question in RESULTS.md: were Cline's two lost stops the runner's fault (a new chat per reply) or the skill's?
This waits on Richard's people; ask him where it stands, don't chase it.

Lab, if a probe is needed again: `own-038/arm.mjs make|turn|probe cc-<name>` (a HOME per arm; `OWN038_KIT=<tgz>` for
a local kit), `own-038/turn-cline.mjs <name> <msg> [--reply]`, `own-038/probe-cline.mjs <name>`. Claude Code arms read
Richard's subscription token from `~/.nodegx/claude-oauth-token`; never print it, not even its first bytes. 🔴 A
`claude -p` turn doesn't return while a preview it started is running: stop that preview by parent PID once the
transcript's last message is written. 🔴 `total_cost_usd` on `--continue` is the session's running total.

Not in this task: the learn.nodegx.io security guides (`~/vscode_projects/nodegx-learn/dev-tasks/securing-your-app/TASK.md`);
the help page in the nav.

End with the handoff and memory (the OWN-036 memory carries OWN-038's line).
