# OWN-036 — The first project: what our builds learned, in the folder a stranger's Claude opens

**Phase:** [112](README.md). **Opened:** 2026-11-03 by Richard. **Status:** 🟡 s1 — skill and note written; the
measurement (AC5) not run.

> "I just want to make sure that someone today with a brand new Claude subscription and no previously created projects
> at all, who says 'let's use nodegx to build my first project', would be greeted with the combined knowledge of all of
> our successes and failures and beyond … The npm installation of a nodegx project should facilitate this ultimate
> power boost. I dunno if we need to include skills or other bits and pieces" — Richard, 2026-11-03.
> On the write-up: *"Heck yes, write it up and start knocking it out."*

## What a stranger got on 2026-11-03 (measured before this task)

- **`npm create nodegx`** (create-nodegx 0.2.8) writes `.mcp.json`, a 40-line `CLAUDE.md`/`AGENTS.md`, and two Claude
  skills, both about building *an editor of your own* (`nodegx-your-own-editor`, `nodegx-your-own-backend-editor`).
- **The server** sends the NodeGX know-how once a project is bound: eleven must-know lines, six guidance sections,
  the scoping conversation (brief, conventions, the first decision, a plan not run), `render_report`, `drive_page`.
  That is strong, and it is about NodeGX's mechanics.
- **Missing:**
  1. the way the good builds were run (the castle's procedure in
     [CANON.md](../phase-118-the-castle-holds/CANON.md): one-exchange brief, a picture first, rounds with the person's
     list verbatim). The tasks that would have put it in the server (P118 CAS-010…014) never landed;
  2. the Digital Bricks method (`~/vscode_projects/ai-coding-docs`): 0 references from `create-nodegx` or `noodl-mcp`;
  3. anything for games: `instructions.ts` and `guidance.ts` hold 0 mentions, the play kit (P126) is scoped with
     nothing built, and the server's "do not write hand-made HTML and JavaScript" points a game the wrong way
     ([CANON](../../../docs/CANON.md) "Where NodeGX fits": a game's world is plain code);
  4. the three general skills the Vibe kit carries (`nodegx-first-day`, `-sizing-the-work`, `-when-stuck`)
     reach Mistral Vibe only.

## 🔴 The constraint: knowledge, never obligation (P130)

[P130's RESULTS](../phase-130-platform/RESULTS.md) measured exactly the wrong version of this task. The same Opus,
the same brief, similar time and spend: the arm whose harness *obliged* the canon (gates, a declared layer, `// why:`
reasons) looked less finished on day one (*"B definitely looks more like a nearly finished game"*). Asked for a
monster editor, the bare arm made every creature number a setting **on demand**, in 14 minutes, and built the better
one. Richard: *"adding in nodegx concepts creates extra strain on the model."* One note line (*"a change of view is a
cut"*) also overreached and cost the free zoom.

So this kit carries **facts that remove trial and error** and **the loop with the person**. It carries **no gates, no
up-front layers, no paperwork to comply with**. A line that would make Opus spend effort proving it followed a rule
is cut. Every rule says how far it reaches (the camera rule now says *by itself*).

## What ships

1. **`nodegx-first-project`** — `packages/create-nodegx/profiles/core/skills/nodegx-first-project/SKILL.md`, written
   into every Claude folder by `npm create nodegx`. The brief in one exchange; something to try first; rounds; what
   not to build up front; which parts are NodeGX and which are plain code; look, don't trust a count; the notes that
   carry a long build; when stuck. Drawn from the castle canon, P130, the Vibe skills, the Digital Bricks method.
2. **`nodegx-making-a-game`** — the trap list and harness facts, from [PLY-001](../phase-126-the-play-kit/PLY-001-THE-SKILL-A-STRANGER-READS.md)'s
   sources. Written into the same folder now (Richard's ask today is the npm install). PLY-001 still ships it inside
   `@nodegx/play` when that package exists; the source is one file.
3. **The folder note** (`AGENT_NOTE` in `bin/create-nodegx.js`): names both skills, and says a game's world is the
   exception to "no hand-written HTML and JavaScript".

## Not in it

- **Server text** (`instructions.ts`, `guidance.ts`). The bootstrap paragraph is golden-tested, ships in the published
  `@nodegx/mcp`, and reaches Claude Desktop too. The folder note covers Claude Code here. Whether the server says the
  game exception for every client is a later line, once AC5 says the note works.
- **The full Digital Bricks method** (sprints, task docs, confidence scores, phase audits). It is for a months-long
  build, and P130 says a first build pays for every obligation in what is on screen. The kit carries its two habits
  that cost nothing: a learnings file, and a fresh session from a good note.
- **The shelf, the starter, the panel as a NodeGX app** (PLY-002…005).

## Acceptance

- **AC1.** `npm create nodegx` writes both skills into `.claude/skills/`, and `CLAUDE.md` names them; the package
  test covers it. A person's own file is never replaced (existing behaviour, still tested).
- **AC2.** The published skill text holds no task ids: `grep -E 'P[0-9]+-|OWN-|TPL-|CCN-|ISL-|PLY-|CAS-'` over both
  files returns 0.
- **AC3.** The copy passes the offline content-authoring checks (`written`, `closer`, `opener`, `contract`) with every
  flag either fixed or listed as a false alarm here.
- **AC4.** No line obliges a gate, a declared layer or proof of compliance. Each rule that limits a choice says how far
  it reaches.
- **AC5 — the measurement, before anyone says "boost".** A sealed stranger Claude Code (P130's
  `dev-docs/parked/platform-kit/_make/arm.mjs` seal: no user MCP, no sibling folders) in two fresh `npm create nodegx`
  folders, one with the two skills deleted. The same first-project brief, one app and one game. Richard plays all four
  and says which he'd keep. The kit passes if neither of its arms is the one he'd throw. A loss is the finding: cut the
  lines that cost, and run it again.
  🔴 **`arm.mjs` as written would grade nothing here** (read 2026-11-03): its `--disable-slash-commands` switches
  skills off, which are what this AC measures, and its empty `--strict-mcp-config` drops the folder's own `nodegx`
  server. The OWN-036 arm needs `--strict-mcp-config --mcp-config <arm>/.mcp.json`, no `--disable-slash-commands`, and
  Richard's user-scope skills and commands kept out some other way (a separate `CLAUDE_CONFIG_DIR`, checked with a
  `--probe` that lists the skills the session sees: both arms must list exactly their folder's own).

- **AC6 — new learnings reach new versions.** Richard, 2026-11-03: *"make sure that any future breakthroughs or
  learnings we make here in this repo or any Claude built project in the vscode projects folder contribute new
  versions to the npm package."* The loop is [KIT-LEARNINGS.md](../../guidelines/KIT-LEARNINGS.md):
  1. capture, in any project: step 0 of `~/.claude/commands/next.md`, into `~/.nodegx/learnings/inbox/`;
  2. harvest: `scripts/kit-learnings/harvest.mjs` reads the inbox, every project's Claude memory, the LEARNINGS and
     LOOK files, and the bug ledger;
  3. triage by verdict into the skills, under a privacy line. The ledger stays in `~/.nodegx`, out of this public repo;
  4. version: `packages/create-nodegx/scripts/stamp.js` records what each cut shipped, `--count` says when a cut is
     due, and the package test refuses a version moved without a stamp;
  5. gate: `publish-npm.sh` and `prepublishOnly` refuse a cut while a learning from the last 14 days is unconsidered.

## Log

- **s1, 2026-11-03.** Audit above; task written. Built: `nodegx-first-project/SKILL.md` (108 lines),
  `nodegx-making-a-game/SKILL.md` and `traps.md` (90 traps, symptom → cause → fix, gathered from the game repos'
  bug files, READMEs and memory; three spot-checked against their bug files; 13 dropped as about this repository's own
  tools, NodeGX's three-kit or ES5 only; the "React runs a child's effects first" trap dropped as never measured), the
  folder note's game exception and two skill lines, the install summary and README.
  - **AC1 ✅** `node --test`: 37/39; the two reds are filed and not this task's
    (`p128-createnodegx-mcppin-…`, `p128-createnodegx-buildappregex-…`). A Haiku probe of Claude Code 2.1.317 in a
    fresh `npm create nodegx` folder, MCP off, listed `nodegx-first-project, nodegx-making-a-game,
    nodegx-your-own-backend-editor, nodegx-your-own-editor`.
  - **AC2 ✅** 0 task ids in the three files (the test greps `traps.md` for repo paths too).
  - **AC3 🟡** Both SKILL.md files pass `written`, `closer`, `contract`, `opener`, except two false alarms in
    `nodegx-first-project`: `docs/LEARNINGS.md: …` and `docs/NEXT.md …` read as lead-in fragments, the same list-label
    shape as their sibling `docs/LOOK.md` line, which passes. **`traps.md` is not through the copy pass:** `written`
    flags 75 lines of its arrow notation. It's a reference list; a pass that rewrites it as sentences is owed.
  - **AC4 ✅** read line by line: no gate, no declared layer, no compliance step; the camera rule says *by itself*.
  - **AC5 ⬜** not run. It spends four Opus arms (P130's cost about $9 each), so it waits on Richard's go.
- **s1 (later), 2026-11-03: AC6 built.** The harvester's first run found 2,542 entries. 2,450 older than 2026-11-01
  were parked as `backlog`: not reviewed, and listable with `--backlog`. This session took the game lessons from it by
  hand. 92 remain fresh (memory 24, notes 3, bugs 65), and **the first triage is the next session's**. The stamp
  records 0.2.8 as the release commit `1d4592272` shipped it; `--check` says the skills have changed since (OWN-036's
  two skills and the Vibe kit's 11-02 work), so the next release cut is due. A stamp that bumped the version by itself
  was built and taken out the same hour: the kit's versions move together in the release cut, lockfile included.
  Tested: package tests 38/40 (the two filed reds), the inbox → `--count` → `--mark` loop in a scratch ledger, `--gate`
  exits 1 on today's 92. The `/next` edit is in Richard's own `~/.claude/commands/next.md`, outside this repo; its
  backup is in that session's scratchpad.
