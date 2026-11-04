Pick up OWN-038 (lane 1) after Richard publishes 0.2.10: check the registry, smoke-test the three kits from npm,
re-render and deploy the site changelog, update the email, and run the probes if he has given the go.

Read first:
- `dev-docs/tasks/phase-112-your-own-nodegx/OWN-038-LEARN-WHILE-YOU-BUILD.md`: rulings, AC1–AC7, and s1 in the log
  (where each harness reads a person's own skills; the first-offer choice; what's live; the probes priced).
- `dev-docs/guidelines/KIT-LEARNINGS.md` before touching any skill.

Where things stand on 2026-11-04 (end of s1):
- The practice round is in the kit for Claude Code, Cline and Mistral Vibe: `bae12bb41`. Package test 42/42.
- The cut is committed: `26c973376` `chore(release): npm 0.2.10` (create-nodegx, -vibe, -cline at 0.2.10; `@nodegx/mcp`
  stays 0.2.9). The harvest gate passed after it.
- Tarballs, packed from `26c973376` with `git archive` (not the working tree), in
  `~/vscode_projects/OpenNoodl-worktrees/npm-0.2.10-tarballs/`:
  - `create-nodegx-0.2.10.tgz` 6ac769a1767f8389a57fea6c6a20216129d5b0e1
  - `create-nodegx-cline-0.2.10.tgz` bc4caaf53bfe27f0ee551a9098bbf0eff3a47d9b
  - `create-nodegx-vibe-0.2.10.tgz` 0242c0fd92d9d042d2fa6dadfa2ad54f55abec1a
  Installed together into an empty folder, all three kits wrote the practice round, and the Vibe folder had both guides.
- nodegx.io/help is LIVE (nodegx-web `Help: nodegx.io/help is live`). Not in the nav yet.
- Not pushed: `cline-dev` is ahead of origin. Richard pushes, then publishes:
  `git push origin cline-dev && scripts/own/publish-npm.sh ~/vscode_projects/OpenNoodl-worktrees/npm-0.2.10-tarballs`

Steps, once he says it's published:
1. Registry shasums equal the three above. Read the full document with `curl` (see `publish-npm.sh`'s
   `registry_shasum`); `npm view` lags.
2. In an empty folder outside the checkout: `npm create nodegx@0.2.10`, `npm create nodegx-cline@0.2.10` (with `HOME` set
   to a scratch folder, or it writes Richard's real Cline MCP file) and `npm create nodegx-vibe@0.2.10`. Each writes
   `nodegx-practice-round`; the Vibe folder has `nodegx-first-project` and `nodegx-making-a-game`.
3. The site changelog. `nodegx-web/site/changelog/` shows as modified, but it's the render already LIVE (local md5 ==
   live md5 at s1), not a peer's work. Re-render ALONE from OpenNoodl's `CHANGELOG.md`:
   `cd ~/vscode_projects/nodegx-web && python3 ops/changelog.py`, then wrap `changelog/_page.html` into `index.html`
   with `build.py`'s `wrap()` for that one folder (NEVER a full `ops/build.py` run: `site/start/index.html` holds
   another session's edits). Diff `index.html` against live: only the 0.2.10 section may differ. rsync
   `site/changelog/index.html` alone (flags written inline; zsh won't split `$OPTS`), `chown caddy:caddy`, curl 200,
   commit the changelog paths by pathspec.
4. The email (`nodegx-web/drafts/2026-11-kit/email.md`): the Vibe line gets 0.2.10; the practice-round paragraph says
   it's in the kit, still asking beginners to reply. Tell Richard it's ready to send.
5. Probes AC3–AC5 (and AC6's stuck person) ONLY on Richard's go: about $15–20 in Claude Code (OWN-036's sealed lab,
   `own-036/turn.sh`), $2–3 in Cline on DeepSeek V4.1 Flash (`own-037/turn.mjs`). Three scripted people per harness: "no
   thanks, build me X"; vague twice; clear. Offer once / zero / zero. One full round saves the sheet, and a fresh
   session in another folder lists it (Claude Code `~/.claude/skills/`, Cline `~/.agents/skills/` — in the lab, the
   sealed HOME's).

Rulings to ask Richard (plain words, recommendation first):
- **When the first offer fires.** Built: only when the person is new AND hasn't said what to build yet, because AC4
  wants zero offers for a clear person. The alternative is offering it in every first conversation.
- **SECONDSERVER** (`node scripts/bugs.js --from P112-OWN037`): where a game's plain-code world goes. One plain page,
  or inside the app. Parked as `backlog` in the harvest until he picks.

Not in this session: AC7 (Anna Malzy, after the publish); the learn.nodegx.io security guides
(`~/vscode_projects/nodegx-learn/dev-tasks/securing-your-app/TASK.md`); the help page in the nav.

End with the handoff and memory (the OWN-036 memory carries OWN-038's line).
