# OWN-037 — The first project, in Mistral Vibe and in Cline

**Phase:** [112](README.md). **Opened:** 2026-11-04 by Richard. **Status:** ✅ AC1–AC4 (2026-11-04, s1). AC5 owed: Vibe's AC2 in the next lockstep cut (then the site's "next release" line).

> "Can we scope a task to try it out on Vibe and see if we can help it the same way please? And Cline?"
> — Richard, 2026-11-04, after create-nodegx 0.2.9 shipped the [OWN-036](OWN-036-THE-FIRST-PROJECT-KIT.md) guides.

**Depends on:** OWN-036 (the two guides, its sealed lab, the two briefs, and [its results](own-036/RESULTS.md) as the
Claude Code reference); OWN-019/OWN-026 (the Vibe kit and `own-026/round-vibe.mjs`); OWN-020 (the Cline kit and
`own-020/round-cline.mjs`). Keys in the repo `.env`: `MISTRAL_API_KEY`, `CLINE_PASS_API_KEY` (both present).

## 1. What each kit gives a stranger today

Measured 2026-11-04 by installing the published 0.2.9 tarballs into an empty folder outside the checkout:

| | Cline (`npm create nodegx-cline`) | Vibe (`npm create nodegx-vibe`) |
|---|---|---|
| The two OWN-036 guides | **already there**: `.claude/skills/nodegx-first-project`, `nodegx-making-a-game` (+ `traps.md`) | **absent** |
| How the harness finds them | Cline lists `.claude/skills/` as project skills (OWN-020 R29) | `.vibe/skills/` holds the kit's own three: `nodegx-first-day`, `-sizing-the-work`, `-when-stuck` |
| Folder note | `AGENTS.md` = the core note: names both guides, and says a game's moving world is plain code | its own `AGENTS.md`: a written process (notes first: `REQUEST.md`, `CHECKLIST.md`, `PLAN.md`; "you build the whole app in this session") |
| Game exception | yes | **no**: "Don't write … hand-written HTML and JavaScript instead". A Vibe stranger asking for the sub game is told to build its moving world in nodes, which [CANON](../../../docs/CANON.md) "Where NodeGX fits" says doesn't hold up |

So the two harnesses ask different questions:

- **Cline:** the guides ship already. *Does an open-weight model in Cline load and follow them, and does the person
  get a better first build?* Nobody has measured it.
- **Vibe:** *should the guides go in, and how do they sit beside a note that obliges a process?*

## 2. The tension in Vibe, stated before anyone builds

OWN-036 is held to **knowledge, never obligation**. On Opus, [P130](../phase-130-platform/RESULTS.md) measured that
making the model follow a method up front produced the worse game. The Vibe note is the other shape: a process the
model must follow, written for models below Opus. This task doesn't re-litigate that note. Its own rounds (OWN-019,
OWN-026) measured it on its own briefs. This task measures the person's outcome on OWN-036's two briefs.

The direct clash is one line. The first-project guide says *ask everything you need in one message, then build in
rounds from the person's notes*. The Vibe note says *build the whole app in this session*. An arm that carries both
gives the model two orders. R1 decides which one wins in arm V-b.

## 3. The arms

The two OWN-036 briefs, word for word (`own-036/msg/app.txt`, `own-036/msg/game.txt`). Richard answers every question
an arm asks; nobody answers for him. He sees the builds under numbers (Vibe 1/2, Cline 1/2), not which has the
guides.

| arm | harness, model | kit |
|---|---|---|
| **V-a** | Mistral Vibe 3.0.4, Mistral Large 4 (Richard's Vibe key; OWN-026's $3 cap a round) | create-nodegx-vibe 0.2.9 as published |
| **V-b** | the same | V-a + the two guides in `.vibe/skills/`, the note naming them, and the game exception (R1 decides the clashing line) |
| **C-a** | Cline CLI on ClinePass, one model (R2) | create-nodegx-cline **0.2.8** (no guides) |
| **C-b** | the same | create-nodegx-cline **0.2.9** as published (the guides) |

The Claude Code builds of OWN-036 stand as the reference. They aren't re-run.

**Staging (R3).** The game first: four builds (V-a, V-b, C-a, C-b on the game brief). The game is where OWN-036
showed the gap, and where the Vibe note's missing exception bites. The app brief is a second stage, if the game
reads clearly.

## 4. Known harness traps (from the labs, so the rounds grade the kit and not the runner)

- **Cline has no headless resume.** A reply is a new chat in the same folder: `round-cline.mjs --seed <previous
  round>` copies `work/apps` and `home/.noodl`. The first-project guide makes turn 1 a question, so turn 2 starts cold:
  whether the model finds its own questions and the person's answers is part of what's measured. The guide's
  `docs/LOOK.md` habit is what should carry it.
- **ClinePass stream errors are fatal** in Cline (no retry). Run through `own-020/stream-tap.mjs`.
- **Vibe:** in `vibe -p`, an "ask" answered no ends the run. Seal with a denylist and `--disabled-tools` for shells.
  MCP tools sit behind `search_tool_functions`. Sub-agents can't be turned off, so count them. File tools read
  anywhere under auto-approve: no sibling arm may be in reach. Always set `MISTRAL_API_KEY`, or Vibe reads the macOS
  Keychain.
- **Vibe's reply turn** is unmeasured for this shape (a question, then a build). Measure it in AC1 before any round.
- One preview port per arm (`--port`): two arms on 8575 share browser storage (P112-OWN036-PREVIEWSHAREDORIGIN).

## 5. Acceptance

- **AC1 — the probe, before any build (≈ $0).** In each arm's folder, the harness lists the skills it can load and
  quotes the first heading of `nodegx-first-project`. C-a lists none of the OWN-036 guides; C-b, V-b list both; V-a
  lists only its own three. Then a two-turn dry run per harness (a one-line brief, a one-line answer) shows the reply
  turn reaches the model with its first turn's question in view.
- **AC2 — the Vibe kit can carry the guides (only after R1).** `create-nodegx --vibe` writes the two guides into
  `.vibe/skills/`. The Vibe note names them and carries the game exception, worded as the core note words it. The
  package test covers it. **Not released** until AC4 says it helps.
- **AC3 — the rounds.** Each arm gets the brief word for word as turn 1. Richard's answers go in word for word as
  turn 2, then he plays each build. Every turn, cost, time and his words go in `own-037/RESULTS.md`, as OWN-036 did.
- **AC4 — the verdict, per harness.** The guides pass in a harness if Richard wouldn't throw the guided arm. A loss
  is the finding: read which line cost, cut it, run again.
- **AC5 — what ships.** Vibe: AC2 in the next lockstep cut, if AC4 passed. Cline: nothing to ship if C-b passes. If
  C-b never loaded the guides, the folder note's pointer is the fix. nodegx.io/first-project/ gains a line naming
  Vibe and Cline only after AC4, with the same honesty section (one build per cell, who judged).

## 6. Rulings Richard makes first

- **R1 — In Vibe arm V-b, which wins: the guide's "ask first, then rounds" or the note's "build the whole app in
  this session"?** Recommendation: the guide's order for the first exchange only. The note keeps its process for the
  building, so the change is one sentence in the note. The alternative, both left as written, measures the clash
  rather than the guides.
- **R2 — Which model in Cline?** Recommendation: DeepSeek V4.1 Flash, the model OWN-020 and OWN-026 ran most rounds
  on, so its traps are known. GLM-5.3 or MiMo-V2.6 Pro are the alternatives.
- **R3 — Game first (4 builds), or both briefs now (8 builds)?** Recommendation: game first. Each build is one
  more for Richard to play.

**Ruled 2026-11-04 (Richard, one screen, the questions as asked):**

- R1, *"which one should win in the guided Vibe build?"* → **"Ask first, then build"**: one sentence in the Vibe
  note; the first reply asks the guide's questions, the note's process runs the build.
- R2, *"which model should run the two Cline builds?"* → **DeepSeek V4.1 Flash**. ClinePass lists it today as
  `cline-pass/deepseek-v4.1-flash-1017`.
- R3, *"how many builds will you play this round?"* → **game only, 4 builds**.

## 7. Not in it

- OpenCode. The same ClinePass models would run in it; it can join once Cline reads clearly.
- The server's own text (`instructions.ts`). It reaches every harness, and OWN-036 kept it out for the same reason.
- Rewriting the Vibe kit's process. Only the one clashing line (R1) and the game exception change.

## Log

- **2026-11-04: scoped** from the 0.2.9 tarballs (above) and the lab records named in §4. Nothing run.
- **2026-11-04, s1: rulings in (§6); AC2 built, NOT released.** `create-nodegx --vibe` writes `nodegx-first-project`
  and `nodegx-making-a-game` (+ `traps.md`) into `.vibe/skills/` from the core kit's own files (one copy of each). The
  Vibe note gains the core note's game exception (its path `.vibe/skills/…`), and R1's sentence: *"When I ask for a
  new app or game, your first reply is only your questions, all in one message: the ones the skill
  `nodegx-first-project` … says to ask. From my answers, you build the whole app in this session, by a process"*.
  Test `P112 OWN-037 (R1)`: 41/41; two mutants (no shared skills; the ask sentence reworded) both turn it red.
  🔴 **A cut before AC4 must leave this out, or AC4 must pass first.** Lab kits (`/Users/Shared/nodegx-lab/kits/`):
  `OWN037-REG-0.2.9` (V-a, C-b: create-nodegx 0.2.9 + mcp 0.2.9 + preview 0.2.8, from the registry; there is no
  preview 0.2.9), `OWN037-VB` (V-b: the checkout's create-nodegx, which differs from 0.2.9 by AC2 alone, measured by
  `diff -r`), `OWN037-CA-create028-mcp029` (C-a: create-nodegx 0.2.8 with the 0.2.9 server, so both Cline arms run one
  server; mcp 0.2.8 → 0.2.9 changed `noodl-mcp.cjs` and the backend CLI).
- **2026-11-04, s1: AC1 ✅, AC3 ✅ (game, four builds), AC4 ✅ both harnesses.** All in [own-037/RESULTS.md](own-037/RESULTS.md).
  AC1: each arm lists the skills it should. Vibe replies resume with `-c`. Cline 3.0.71 can't resume headless, so a
  Cline reply carries the chat as text (`round.mjs --reply`). AC3, one builder at a time: only Vibe-with-guides asked
  (seven questions). Cline-with-guides read both guides and built without asking, the whole game in plain code. Both
  no-guides arms built at once. AC4, Richard blind: *"Vibe 1 is terrible. Vibe 2 is playable but the control are
  weird and the visuals too, bit boring. Cline 1 is playable, probably the closest to the Claude efforts. Cline 2 is
  awful"*. Vibe 2 and Cline 1 are the guided arms. Asked whether he'd throw Vibe 2: **"Keep it: ship the guides"**.
  Filed P112-OWN037-SECONDSERVER. Spend: Vibe $3.82, Cline $0.71 (ClinePass prices), probes $0.10.
  **AC5 owed:** (1) the next lockstep cut carries `22333b7fe` (create-nodegx-vibe); (2) nodegx.io/first-project/ gains
  a Vibe and Cline line with the honesty section (one build per cell, Richard judged, the turn-2 difference). The site
  push deploys, so it needs Richard's go.
- **2026-11-04, s1: the site section is LIVE** (Richard: *"please add the results to the page we published today"*).
  nodegx.io/first-project/#other-assistants: a table of the four builds with his words, the costs, the honesty line,
  and "the Vibe kit … gets them in its next release". Only `first-project/index.html` was rebuilt (build.py's `wrap`)
  and rsynced. nodegx-web had another session's uncommitted changelog/start edits, which stay local. Live md5 = local;
  the neighbours answer 200. nodegx-web `a1c2310`. **When the Vibe cut ships, change that line.**
