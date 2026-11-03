# Kit learnings: how a lesson from any project reaches `npm create nodegx`

Richard, 2026-11-03: *"make sure that any future breakthroughs or learnings we make here in this repo or any Claude
built project in the vscode projects folder contribute new versions to the npm package."* Task:
[OWN-036](../tasks/phase-112-your-own-nodegx/OWN-036-THE-FIRST-PROJECT-KIT.md).

## The loop

1. **Capture, in any project.** Step 0 of `/next` (`~/.claude/commands/next.md`) asks every session, in every
   project, for the lessons any Claude building an app or game would need. Each goes as one line into
   `~/.nodegx/learnings/inbox/<project>.md`. Claude's own memory in every project is read as well, so a lesson saved
   there is not lost when `/next` is skipped.
2. **Harvest, here.** `node scripts/kit-learnings/harvest.mjs` lists what nobody has considered: the inbox, every
   project's memory, `LEARNINGS*.md` / `LESSONS*.md` / `LOOK.md` files, and `dev-docs/bugs/`. `--count` is one line.
3. **Triage, here.** For each entry, decide and record it with `--mark <key> <verdict> [note]`:
   - `taken` — written into a skill (say which in the note);
   - `general-no` — true, but only about that project (its state, its client, its deploy). Most entries are this;
   - `private` — it can't be told without the project's private facts. Never re-listed;
   - `duplicate` — a skill already says it (name the line).
4. **Version.** `--count` ends with the skills' state: *"changed since 0.2.8 shipped — the next release cut carries
   them"* means a cut is due, and the handoff says so. The kit's versions move together in the release cut
   (`chore(release): npm 0.2.x`: `@nodegx/mcp`, create-nodegx and its two wrappers, the lockfile's workspace lines). That
   cut runs `npm run stamp` in `packages/create-nodegx` after the bump. The package test fails if the version moved
   without a stamp. Publishing stays Richard's.

**When it runs:** a session on lane 1 runs `--count` first, and triages when the count is above zero.
`scripts/own/publish-npm.sh` runs `--gate` before a cut that ships create-nodegx, and so does the package's
`prepublishOnly` for a publish from the folder. Either refuses while an entry from the last 14 days is unconsidered,
unless `KIT_HARVEST_SKIP` says why.

## What goes in

A lesson goes in when **all** of these hold:

- **A stranger's Claude would hit it.** It is about building an app or a game with Claude (a trap in three.js, a
  phone control, how a brief was asked, what made an owner call it fun), not about one project's own state.
- **It was measured.** The source says how it was found (a screenshot, a count, an owner's verdict). A guess stays out.
- **It is knowledge, not an obligation.** P130 measured that obliging Opus up front cost the game. A lesson becomes a
  fact with its fix, never a gate, a required file or a step to prove.

Where it goes:

| the lesson is about | file |
|---|---|
| how a build is run with the person (brief, rounds, what not to build up front, notes) | `profiles/core/skills/nodegx-first-project/SKILL.md` |
| a game or 3D trap, with symptom → cause → fix | `profiles/core/skills/nodegx-making-a-game/traps.md` (its group) |
| one of the game traps that cost the most | `nodegx-making-a-game/SKILL.md`, and only by replacing a weaker one |
| NodeGX's own mechanics (a node, the format, the server) | not a skill: the server's guidance or a node's notes (OWN-010's `kit:` route) |

A new skill is a decision for Richard; propose it in the handoff with the entries that would fill it.

## 🔴 The privacy line

This repository and the npm package are public. Many sources are not: client projects, Richard's own apps, the
children's games.

- **Rewrite, never copy.** The skill line names the mechanism, not the project, the client, the people or their data.
  "A webhook signed with the wrong secret fails silently" is a lesson; the client's name and their payment flow are not.
- **Never take** names of people (the children above all), clients, companies, domains, keys, prices, private repos, or
  anything from the Gala's `game/` folder.
- **The ledger stays out of git.** `~/.nodegx/learnings/considered.json` names private projects; it is never copied into
  this repository. `~/.nodegx/learnings/exclude.txt` lists projects never to read (one folder name a line).
- When in doubt, mark it `private`.

## Copy

A line added to a skill passes the offline content-authoring checks (`written`, `closer`, `contract`, `opener` from
`~/vscode_projects/Claude-content-authoring/tools/checks/`; the memory note *copy passes the content-authoring skill*
says how to run them) and carries no task id (the package test greps for them).
