# OWN-023 round 3 — the reading (2026-10-21, Opus 5.5)

Richard's idea, 2026-10-21 evening: *"An app written in NodeGX, no matter how complex, is easier to read, appropriate and
pick up for an LLM than a pure vibe coded one."* Two strangers pick up the two gala repos, A+ (Claude, plain code) and
B2 (the same game converted to NodeGX, round 2b), with **no documentation, only the source**, and plan one feature:
kids sign in online and keep their progress (a backend and cloud workflows). Nothing is built. The plans are compared:
the thought process, the difficulty, how accurate their understanding was (micro and macro), and how likely each plan
is to be a good one. Bonus: the same pair on Vibe with DeepSeek V4.1 Flash.

Everything below was written before any arm's result was read.

## 1. The arms

| arm | folder | harness · model | NodeGX kit |
|---|---|---|---|
| **A-claude** | the plain-code gala | Claude Code 2.1.301 · Opus 5.5 | none |
| **B-claude** | the NodeGX gala | Claude Code 2.1.301 · Opus 5.5 | `npm create nodegx@0.2.4` (the registry's latest) + its MCP server |
| **A-vibe** | the plain-code gala | Vibe 2.26.1 `--legacy-harness` · DeepSeek V4.1 Flash (ClinePass) | none |
| **B-vibe** | the NodeGX gala | Vibe 2.26.1 `--legacy-harness` · DeepSeek V4.1 Flash (ClinePass) | as B-claude (the kit's `.vibe/config.toml`, model line switched) |

Same brief (`round3/brief.txt`) and same quiz (`round3/quiz.txt`) for all four, word for word. The brief never names
NodeGX, code or a file; it asks for `PLAN.md` in four parts (how it works today; the plan; checks; how you found your
way around) and "don't build, don't change any other file".

## 2. What "no documentation" means (the strip rule, one rule for both)

The repos are the two published downloads (`nodegx.io/from-code/downloads/`), with **every prose file about the project
removed and every source file kept, comments included** (comments are part of the code a stranger reads).
- A: `work-gala/` minus `README.md`, `CLAUDE.md`, `changes/` (the change log and its screenshots). Kept: `src/`,
  `tests/`, `index.html`, `style.css`, `serve.mjs`, `package*.json`, `vendor/`.
- B: `gala/` minus `CONVERSION.md`, **`reference/` (the original plain-JS game: left in, B would be arm A)**,
  `app/CLAUDE.md`, `app/AGENTS.md`, `app/docs/` (brief, architecture, conventions, decisions), `app/.mcp.json`,
  `gala-rules/README.md`. Kept: `app/` (components, scripts, security, project file), `gala-rules/`, `tools/`.
- What B gets that A doesn't, by Richard's rule: the npm package — the kit's generic `CLAUDE.md`/`AGENTS.md`/skill
  (byte-identical for every `npm create nodegx`, nothing about this game) and the MCP server with its node specs.
- **Known asymmetry, kept on purpose:** B's code comments say "GENERATED from reference/src/play.js" and "From
  reference/src/ui.js hud()" about a folder that is gone. They tell B the app was converted from code. A's comments
  mention "round 2's blocks". That's what each repo really says.
- **Known asymmetry in the apps themselves:** B2 already has a backend (accounts, a `grownup` role claimed by the first
  account, a `GameChange` collection, three cloud functions); A+ has none (its grown-ups' gate is in the page). The
  same feature is a different job in each, and each plan is graded against its own app's truth.

## 3. The fence

- Claude arms: `round-arm.mjs` as round 2 (round HOME through the shell prefix, `--setting-sources project,local`,
  `--strict-mcp-config`, no web tools, file tools denied in /Users, /Applications and the other arms), with the rounds
  moved to `/private/var/tmp/own023-r3/` so that **all of `/private/tmp`** (every scratchpad with B2's run in it, and
  `/private/tmp/galanotes`, B2's own notes) is denied to the file tools by one rule (`--deny-read`). Bash paths are
  caught by `audit.json` afterwards, as in round 2. Not `sandbox-exec`: measured, Chrome cannot start its own sandbox
  inside one, and the NodeGX server's `render_report` launches Chrome without `--no-sandbox`. B-claude keeps its eyes.
- Vibe arms: `round3/round-vibe.mjs` runs Vibe **inside `sandbox-exec`** (reads and writes refused in ~/vscode_projects,
  ~/.claude, ~/.vibe, ~/.noodl, ~/Documents|Desktop|Downloads, /private/tmp, the other arms). Bash ON. Smoke
  2026-10-21 19:53: `ls /private/tmp/galanotes` and `ls ~/vscode_projects` → "Operation not permitted"; the round's own
  files read fine; $0.0014. Cost of the seal: neither Vibe arm can open a browser (symmetric).
- ClinePass through `own-020/stream-tap.mjs --mode retry` (the lab's fix for in-band stream errors).

## 4. The relay and the quiz

- Claude: a sitting ends at the first answer; a Haiku judge (`round3/judge-plan.txt`) reads the last message: MORE →
  "Continue.", up to 3; cap $40 an arm. Vibe: "Continue." while `PLAN.md` doesn't exist, up to 2; 300 turns, 90 min,
  $10 (Vibe's own price reading) a sitting.
- Then **the quiz, closed book**, in the same session: Claude `--tools ''` and no MCP server; Vibe
  `--enabled-tools no_tool_at_all`. 11 factual questions (what it is, screens, what's saved and where, backend and
  accounts today, who may change settings, the gala evening step by step, points, seasons, languages, old saves,
  pure vs screen code) + 1 opinion (the plan's riskiest point). Answered from the understanding the plan was built on.

## 5. How it is graded (pre-registered)

1. **Answer keys**, written from the full material (docs + code) by two agents that never see an arm's output:
   `round3/key-code.md`, `round3/key-nodegx.md`. Each question: the answer, citations, the points a full answer must
   hold, the plausible wrong answers. Plus per app: TOUCH POINTS (MUST/SHOULD), mechanisms to reuse, TRAPS, SECRETS.
2. **Quiz score**: each answer 0 / 1 / 2 against its key; confidence calibration (a "sure" that is wrong counts apart).
3. **Plan, micro**: every factual claim the plan makes about the existing app is extracted and checked in the source:
   claims made, claims right, claims wrong (and which wrong ones the plan builds on).
4. **Plan, macro**: TOUCH POINTS found (MUST recall), TRAPS avoided or fallen into, SECRETS found.
5. **Plan, soundness**: child sign-in without email set up by a grown-up; siblings on one device; anonymous play kept;
   the first-sign-in merge of local progress; offline and mid-game drops; the server-side workflows; children's data
   (consent, minimum data); fit to the app as it is (B: does it reuse or collide with the existing accounts and the
   first-account-is-grown-up rule?). Then one number: the grader's probability that a team following the plan ships
   the feature without a redesign.
6. **Process and difficulty, from the transcripts**: wall time, cost, turns, tool calls by kind, files/components read,
   time to the first look at the save path, time to PLAN.md, errors and dead ends, and the arm's own part 4.
7. Graders are fresh agents with the key and one arm at a time. A grader can't be blind to the arm (NodeGX words give it
   away); the rubric is what holds it.

## 6. What went wrong in the lab (all fixed, none a stranger's doing)

1. **B-claude killed twice by a sibling's teardown.** `round-arm.mjs` (then `round-vibe.mjs`) killed every process whose
   command line held its root; B-claude's `--deny <A's root>` rules held it. Fixed in both: a runner or a `claude`
   counts by cwd only. Third start fenced the Vibe roots by glob (`*-vibe`). Killed transcripts: `runs-r3/_killed*`.
2. **B-vibe's NodeGX server never started**: the seal denied the rounds' parent folder and `npx` lstat's every
   ancestor (EPERM, "Connection closed"). Fixed (ancestors' metadata open, contents sealed) and re-run. The first run
   is kept as an extra row, **B-vibe-noserver**: DeepSeek on the raw NodeGX folder with no server.
3. **The brief kept the NodeGX stranger out of its server**: "don't change any other file" + the kit's wording (below).
   Added the pair **A2/B2-claude-open** with one sentence changed ("the only file you should write yourself is
   PLAN.md"). It changed nothing for B (below), so this was the kit, not the sentence.
4. The metrics' "minutes to plan" first matched a todo item naming PLAN.md (a grader caught it); fixed, all recomputed.

## 7. Results (2026-10-21 ~20:30)

Grades by fresh Opus graders, one arm each, against the pre-registered keys (`round3/grades/*.{json,md}`); process
numbers from the transcripts (`round3/metrics/*.json`). Claims = facts the plan states about the existing app, checked
in the source. P(ship) = the grader's probability that a team following the plan ships without a redesign. $ for Vibe
arms is Vibe's own reading at ClinePass prices.

| arm | app | quiz /22 | claims right / wrong / unverif. | MUST | traps fallen | secrets | sound /18 | P(ship) | min to plan | $ (plan + quiz) | tool calls |
|---|---|---|---|---|---|---|---|---|---|---|---|
| A-claude | code | **21** | 73 / 0 / 2 | 7/8 | 0 | 6/10 | **18** | **75%** | 4.4 | 2.02 | 13 |
| A2-claude-open | code | **21** | 62 / 2 / 2 | 7/8 | 1 | 6/10 | **18** | 70% | 5.7 | 2.30 | 17 |
| B-claude | NodeGX | **21** | 80 / 1 / 5 | 7/8 | 0 | 6/9 | **18** | **75%** | 5.7 | 3.06 | 33 |
| B2-claude-open | NodeGX | 20 | 66 / 0 / 5 | 7/8 | 1 | 7/9 | 17 | 65% | 6.3 | 3.20 | 26 |
| A-vibe | code | 19 | 72 / 3 / 1 | 7/8 | 1 | 1/10 | 16 | 65% | 3.1 | 0.06 | 38 |
| B-vibe | NodeGX (+server) | 17 | 54 / 2 / 1 | 5/8 | 1 | 2/9 | 15 | 40% | 4.4 | 0.06 | 42 |
| B-vibe-noserver | NodeGX (no server) | 20 | 62 / 3 / 1 | 5/8 | 2 | 3/9 | 14 | 40% | 10.8 | 0.07 | 57 |

Every quiz was closed book (0 tool calls in every quiz sitting); no arm was "confidently wrong" on any answer; no
arm built a plan step on a wrong fact except A-vibe once. Fence: 0 reads outside the round in any audit (the only
outside paths are each arm's own tool-result files and its own `/tmp` scratch, created during its run).

**Each app's deep trap** (the one the keys rank first, and the one a skim misses):
- code: `mend()` repairs a save against the grown-ups' settings applied on *this* machine, so a save moved between
  devices loses custom steps/costumes and the loss syncs back. **A-claude and A2 built their plans around it; A-vibe
  missed it.**
- NodeGX: the existing `grownup` is ONE first-come content admin per backend, auto-claimed on any sign-in at the
  gear page; reusing it for "the family's grown-up" makes one parent admin of everyone's game. **B-claude and B2 saw
  it and split the roles; B-vibe and B-vibe-noserver read it correctly and built on it anyway.** (B2 then fell into
  the second one: settings applied once per page load, before a child signs in.)
- Opus caught its app's deep trap 4/4; DeepSeek 0/3.

### 7.1 What it says about Richard's sentence

*"An app written in NodeGX, no matter how complex, is easier to read, appropriate and pick up for an LLM than a pure
vibe coded one."* — **Not shown by this round, on this app. Also not refuted. Honest reading:**

1. **Opus: a tie.** Same quiz (21/21), same soundness (18/18), same P(ship) (75/75), same MUST coverage, more claims
   made on NodeGX (86 vs 75) and as accurate. NodeGX cost **~50% more and ~1.3 min longer** to reach it ($3.06 vs
   $2.02). The replication pair (A2/B2) lands the same way, one notch lower for B2.
2. **DeepSeek V4.1 Flash: plain code read better.** 16/18 and 65% on code; 15/18 and 14/18, 40% on NodeGX, with or
   without the server. Both NodeGX DeepSeek arms read the role mechanism right and failed to draw the consequence.
   n=1 per cell; the NodeGX app is also the harder job (it already has a backend with a trap in it).
3. **The NodeGX server was not what produced understanding.** Opus never opened the project in two runs (§8) and
   read the graph JSON with throwaway Python; DeepSeek with the server (opened, `get_project_info` 53k chars,
   backend node types) did no better than DeepSeek without it, and read less of the game's code (its quiz lost the
   engine questions).
4. **What the NodeGX version did give a reader**, in the strangers' own words: *"The project explains itself
   unusually well. Nearly every component has a `description`, and most nodes have a `label` that says what they're
   for"* (B-claude); *"the graphs are JSON … I had to write throwaway one-liners to list nodes and wires. Function
   code is inside JSON strings"* (same). The plain-code arm: *"Most files open with a comment that says what they are
   for and why"*; *"the style is dense: long one-line functions, single-letter names"* (A-claude). Both apps were
   written by Opus with the same care; **the comparison is two well-documented-in-code apps, not NodeGX vs a messy
   vibe-coded one.** A+ is ~5,000 lines, cleanly split, with header comments: the best case for code.
5. So the sentence the round supports: **"An agent with no docs understands a converted NodeGX app as fully and as
   accurately as the code it came from, and plans a backend feature on it as well; the graph names its own parts."**
   Not "easier". The test that could show "easier" is an app where code's best case doesn't hold: bigger, written
   over many sessions, by a weaker model, or after N features (§9).

## 8. Product finding: P112-OWN023-READONLYOPEN

Opus on a plan-only task **never calls `open_project`**, in both briefs: *"I didn't open the project with the
`nodegx` server (opening writes `app/.mcp.json`, and I was asked not to change files)"* (B-claude); *"using its
read-only example library so I don't touch the project"* (B2, brief loosened). Measured: opening writes nothing
(B-vibe opened it; only its PLAN.md changed). But the tool exists only behind `--allow-writes`, its description never
says it writes nothing, and the project's `.gitignore` says `.mcp.json` is "written when the project is created or
opened". The kit's reading tools (the half of the claim about "reveal the secrets of your app") went unused by the
strongest model. Filed `dev-docs/bugs/p112-own023-readonlyopen-…md`.

## 9. Next, if Richard wants the sentence tested where it could win

- Fix READONLYOPEN, then re-run B-claude once: does Opus with the server read faster or deeper than with Python?
- A harder pair: the same game after several features added by a weaker model in many sittings (the vibe-coded
  case), converted the same way; or a much larger app. Same brief, same keys method.
- n>1 per cell for DeepSeek (cheap: ~6¢ an arm).

Runs (transcripts, plans, quizzes, metrics inputs): `runs-r3/` (caches stripped; the ClinePass key scanned for, absent).
