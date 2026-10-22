# OWN-026 lab — the foundation and the circuit board (tests 1 and 2), then the handover (part 3)

**Written 2026-10-22 ~11:40 CEST (Opus 5.5), before any real round ran.** Everything in §1–§6 is pre-registered: the
request, the arms, the checks (`checks.md`), the change list (`changes/`), the measures and the reading rules. What
changes after a round has run is written in §8 with its date, never folded back in above.

## 0. Why (Richard, 2026-10-22)

After round 3/3b (strangers *reading* the gala, code vs NodeGX: a tie for Opus; DeepSeek ahead on code), Richard: *"I
feel like our tests mustn't have been difficult enough."* He set out the canon the test has to put under pressure:

1. *"You're using a library that was built on top of AI Coding experience excellence, so you have the best foundation
   possible (though a good Claude.md file might be capable of doing the same)."*
2. *"The node system gives the flexibility to add or change any part with ease … the node system is a circuit board that
   can have new wires and nodes added any time."*
3. *"You own and control everything the AI builds, and can ask the AI to open up any part of the app to editing, thanks
   to the 'build your own editor' system."*

Then: *"first run tests 1 and 2 with DeepSeek 4.1, but not the gala game it's too difficult for DeepSeek, pick something
easier like the basic version of the rocket school, just the rocket game nothing else, just some math questions for
learning the times tables up to 10"*, on **ClinePass with the Cline CLI**; *"Part 3 I'd love to have that run by Sonnet 5.5
on the experiments we did yesterday, as a follow up test."*

Reading and planning (rounds 3/3b) measure the one thing the theory says is equal. These tests make the app get
**built** and then **changed ten times**, and grade it by using it.

## 1. The model, the harness, the fence

- **DeepSeek V4.1 Flash** (`cline-pass/deepseek-v4.1-flash`) in **Cline CLI 3.0.71**, headless (`--json`), through
  `own-020/stream-tap.mjs` in retry mode (OWN-020: the only thing that finishes long Cline rounds on ClinePass).
- **The shell is on in every arm** (a person's Cline has it; a plain-code app can't be installed or run without it).
  So the fence is the operating system's: the whole Cline process tree runs under `sandbox-exec` with a profile that
  denies reads and writes in Richard's home (except node itself), every Claude scratchpad, and every other round of the
  lab. Proven before any spend (mock rounds `mock1`, `mock2`, 2026-10-22): the repo's README, another round's file and
  the scratchpads all answer "Operation not permitted"; a server the "agent" left running was reaped. Web tools, sub-agents
  and `ask_question` are off in every arm (Cline's `ask_question` answers itself headless).
- Rounds live under `/Users/Shared/nodegx-lab/own026/` (durable, outside every repo); grades under
  `/Users/Shared/nodegx-lab/own026-grades/`. One npm cache and one Playwright browser folder are shared between rounds
  (`/Users/Shared/nodegx-lab/cache/`): packages, not knowledge, and the disk has 23 GB free.
- **The relay**: a sitting ends → OWN-023's `judge.txt` → a fresh Haiku reads Cline's last message only → MORE means a
  new sitting in the same folder (3.0.71 can't resume a chat headless) with the same request and one sentence: "Another
  session already started on this in this folder and stopped before it was finished. Carry on from where it is." At
  most **2** extra sittings. The same rule for every arm, and the count is reported.
- One sitting: at most 120 minutes; stopped after 30 minutes with no output.

## 2. The arms (the same request, model, tools and relay; only the folder differs)

| arm | the folder the person opens | tests which part of the canon |
|---|---|---|
| **code** | empty | the baseline |
| **harness** | empty + OWN-023's plain-code instructions (`own-023/harness/CLAUDE.md`, 8.8 KB: Next.js + SQLite/Prisma, write SPEC.md first, a test per requirement, check at phone width in a real browser, secrets on the server, a settings page, how a later agent changes it) as `AGENTS.md`, the file Cline reads. One word changed: the line naming the file itself. | pillar 1's own caveat: *"a good Claude.md file might be capable of doing the same"* |
| **nodegx** | `npx -y create-nodegx@0.2.5 apps --cline`, from the registry, exactly what a person types (the kit's `AGENTS.md`, `.claude/skills/`, its own entry in Cline's MCP file) | pillars 1 and 2 |

The request never says NodeGX, Next.js or any tool.

## 3. Test 1 — the trap course (pillar 1)

The request (`request-build.txt`, verbatim to every arm): the rocket times-tables game, tables 1–10, fuel → launch →
8 planets, a profile per child, progress remembered and **following the child across devices** with the parent signed
in once, a grown-ups page the kids can't get into, and **other families seeing only their own children**. The game is
small on purpose (Richard: DeepSeek, keep it easy); what makes it a real app is what every AI-built app of this kind
gets wrong, and the checks are those things.

- **3 rounds per arm, 9 in all**, run one at a time in the order code, harness, nodegx, code, harness, nodegx, … (so the
  time of day, and ClinePass's load, fall on every arm alike).
- **Each round graded once** by a fresh **Opus 5.5** in Claude Code (`grade.mjs`, `grader.txt`) on a copy of the round,
  running `checks.md`'s S0, F1–F8, T1–T13: it starts the app from what the builder told the person, then uses it in
  Chrome (phone and desktop contexts, a second device, two tabs, a second family, replayed requests). It can't change the
  app. It is not blind to the arm (a NodeGX folder is obvious); the checks are behaviours, not judgements, to make that
  matter less.
- **Read as:** per arm, the median and the range over 3 of F passes (/8), T passes (/13), S0; dollars at ClinePass's
  Flash prices, minutes, sittings.
- **What would support pillar 1:** nodegx above code on T (the traps), by more than the spread between rounds of one
  arm. **What would show the caveat:** harness level with nodegx. Both outcomes get written the same way.

## 4. Test 2 — the client who keeps changing their mind (pillar 2)

- **The start:** per arm, the test-1 round with the **median** F+T total (ties: the cheaper). An arm whose 3 rounds all
  fail S0 has no chain, and that is the result for it.
- **Ten changes** (`changes/c01.txt` … `c10.txt`), the same words, in the same order, to every arm, each to a **fresh**
  sitting-chain (`round.mjs --seed <previous round>`): division with a per-child switch; a number pad for one child; a
  two-child race; fuel becomes stars + a shop; a teacher invited by email who sees (not changes) children from several
  families; a per-child time limit; French; the mistakes of the last 7 days; mastered tables revisited; delete a child
  for good. Each one moves something the first design had no reason to expect to move: the input, the round, the
  currency, the roles and permissions, every string, the history, the data model's edges.
- **After every change, one grade** (`grade.mjs`): S0, the change's own checks, then the regression set (F1–F8, T1, T4, T6,
  T7 and every earlier change's checks). The checks are in `checks.md` §C, written now.
- **Per change and per arm:** dollars, minutes, sittings; the change's checks passed; **regressions** (a check that passed
  after change n−1 and fails after n); files and lines touched (a diff of the folder before and after, without
  `node_modules` and build output); for nodegx, nodes added and changed and **how much of the change went into script
  code** (Function / Script nodes, lines) rather than nodes (the honest counter-reading: a graph whose logic lives in
  script nodes is code with extra steps).
- **What would support pillar 2:** the curve. nodegx's cost per change and regressions per change stay flat across the
  ten while the code arms' rise. One chain per arm (n = 1): a curve, not a significance test, and written as such.

## 5. Grading rules (pre-registered)

- A check graded by the grader stands as graded; the lab re-reads a grade only when the grade contradicts its own
  evidence, and then the original is kept beside the re-read.
- A grade the lab's own fault broke (a fence that refused the grader something a person would have, a server the lab
  killed) is re-run once and both are kept.
- Numbers are measured from the files (`round.json`, `sittings.json`, `meta.json`), never estimated.

## 6. Part 3 — the handover (pillar 3), Sonnet 5.5, after tests 1 and 2

On round 2's two gala builds (A+ code, B2 NodeGX; `own-023/runs-r2/Aplus`, `runs-r2b/B2`), with **Claude Code + Sonnet
5.5**: (a) a fresh sitting is asked to let Richard's eldest change the songs, the shop prices and the day's timetable
herself, without anyone touching code (the NodeGX arm with the kit's build-your-own-editor skill; the code arm however it
likes); (b) three more changes by fresh sittings that move things her editor shows; (c) after each, does her editor
still work and still tell the truth; (d) Richard does five small jobs on each, by hand, timed, including "find what the
AI changed last time and say whether it's right". Scoped in full after tests 1–2, using what they teach about the lab.

## 7. Cost and what Richard watches

- ClinePass at market value (OWN-020): about $10 per 5 hours, $25 a week, $50 a month. A DeepSeek round that builds an
  app ran $0.08–0.70 in OWN-020; a Next.js + Playwright build may run longer. Test 1 ≈ 9 rounds, test 2 ≈ 30 rounds:
  likely more than one week's allowance, so test 2 may cross into the next week. **Richard reads his bars before and
  after** (OWN-020's rule); a round stopped by the quota is re-run, not counted.
- Graders run on Claude Code (Richard's plan): about 39 Opus grades; each grade's `meta.json` keeps the 7-day utilization its stream reported.

## 8. What happened (dated entries only)
