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

- **2026-10-22 11:57 CEST, t1-code-1 ended** (completed, judge DONE, 1 sitting, 2,671 s, $0.208 at ClinePass prices).
  Its seal audit named five paths in `/tmp` (`/tmp/rt-smoke.mjs`, `rt-browser.log`, `rt-live.log`, `rt-jar`,
  `rt-npm.log`): its own scratch files, written there by name though its TMPDIR was inside the round. `/tmp` is shared
  by every round, so a later round of another arm could have read them. **Lab change (not the agent's conditions):**
  from t1-harness-1 on, `round.mjs` moves anything a round named in `/tmp` into `<round>/left-in-tmp/` when it ends;
  t1-code-1's three surviving files were moved by hand before t1-harness-1 started.

- **2026-10-22 12:10 CEST, the first grade of t1-code-1 stopped by the lab (kept as `t1-code-1.lab-broken-1`).** The
  grader's sandbox denied `/private/tmp/claude-501`, where Claude Code's Bash writes each command's output: `cat`
  answered "stdout: Operation not permitted" and node aborted at start, so the grader was working round its own shell.
  Lab fault, §5: re-run. The grader's sandbox and file-tool rules no longer deny the scratchpads (Richard's home and every
  round of the lab stay denied). The series restarted; t1-code-1's round stands and is re-graded first.

- **2026-10-22 14:30 CEST — Chrome inside the fence; t1-code-1 and t1-nodegx-1 set aside as `.lab-broken-chrome`,
  to be re-run.** t1-nodegx-1's `render_report` hung twice for 240 s (the kit's renderer waited on a Chrome that never
  answered), and its killed renders stayed running. Reproduced on a copy: under the round's sandbox the render hangs
  with no output; outside it, the same render finishes in 8 s. Cause, measured: **Chrome's own sandbox can't start
  inside sandbox-exec** ("sandbox initialization failed: Operation not permitted"; renderer, GPU and network processes
  crash). The grader's Chrome had worked only because Playwright launches it with `--no-sandbox`. Checked the code
  arms: t1-harness-1 used Playwright and was unaffected (its screenshots exist); **t1-code-1's agent wrote its own CDP
  probe against `/Applications/Google Chrome.app` and spent ~20 minutes (09:29–09:48 UTC) getting no page from it**,
  so it was hit too, though it still scored 20/22. §5: both re-run, the originals and t1-code-1's grade kept beside them.
  **Lab change:** every round (and grader) gets `CHROME_PATH=/Users/Shared/nodegx-lab/bin/chrome`, a two-line wrapper
  that runs the same Chrome with `--no-sandbox`. The kit's render harness honours `CHROME_PATH`; so do many tools. An
  agent that launches Chrome by its own path still fails inside the fence: `round.json`'s neighbour
  `chrome-sandbox-hits.txt` counts the tool results that show it, per round, so the cost is visible wherever it falls.
  Proven before the restart: the kit's renderer under the round's sandbox with the wrapper, 8.9 s, all pages drawn; a
  mock round's shell, `"$CHROME_PATH" --dump-dom` → the page.
- **Also seen, a kit defect to file:** when `render_report` times out it reports "killed", but the `render-from-disk`
  server it started keeps running (three were left, 8–17 minutes old; the next render's own orphan sweep reaped them).

- **2026-10-22 15:00 CEST, a fence note.** An agent can list its own round root (`command.txt`, `sandbox.sb`,
  `sittings/`): t1-code-1 (re-run) ran `ls` on it once. `command.txt` names the arm. Left as is so every round runs
  under the same conditions; any round whose agent read those files is noted beside its result.
- **2026-10-22 15:56 CEST, t1-nodegx-1 (re-run) ended** (completed, DONE, 1 sitting, 2,981 s, $0.203; 3 `render_report`
  + 13 `drive_page`, none timed out; chrome-sandbox-hits 0). **Its agent read the lab's files and probed the fence:** at
  13:10 UTC one command ran `grep -rl 'querySettings' /Users/Shared`, `ls /Users/richardosborne/vscode_projects`
  (refused: "Operation not permitted") and `cat` of its round's `sandbox.sb`. Looking, by its own words around it, for
  where a setting is read (a kit-docs gap, not an escape); the fence held. Noted per the fence note above.
- **2026-10-22 16:26 CEST, first three grades in (one round per arm):** t1-code-1 (re-run) **21/22** (T6), t1-harness-1
  **20/22** (F6, T6), t1-nodegx-1 (re-run) **16/22** (F7, T3, T5, T7, T8, T9). The grades stand as graded (§5). One
  reading owed beside them: T7 and T8 (any family's children, answers and parent PIN read and changed, with B's token or
  none) come from the kit's local backend default **`"devOpen": true`** (its `security.json`: `collections: {}`,
  defaults `authenticated` + `creatorOwns: true`, unenforced while devOpen is on, on loopback only; filed as
  P112-OWN023-DEVOPENREAD / -NOENFORCETOOL). The same file makes that backend **refuse to bind beyond loopback**
  (`security/state.ts` the deploy interlock), so as delivered, the family tablet the request names can't reach it at
  all, while t1-code-1's server announced a Wi-Fi address with auth enforced on every request. What it would do with
  devOpen off (the defaults' `creatorOwns`) is a separate measurement, to be made on a copy and reported beside this
  grade, never in place of it. The other four (double press answers the next question too, two tabs overwrite each
  other, the "last 10" window freezes after 10 answers, small buttons) are the app's own graph.

- **2026-10-22 ~17:15 CEST — Richard rules a learning loop (design change, from t1-nodegx-2 on).** His words:
  *"after each test we can do a little stop and check, draft a fix prompt somewhere and I can open it in a new session
  that keeps in touch with this one, so the next tests have a better chance of succeeding … I'm hoping if we keep
  analysing the issues in the reasoning, we can perfect how the models read our shit and interact with NodeGX projects
  to at least get them to the same level as Claude coded ones with good instructions … we can learn and hotfix on the
  fly, and any big stuff can go in separate sessions and the tests can maybe wait for fixes before starting their
  round."* So: the plain-code arms stay as pre-registered (the control, no fixes); **each later NodeGX round runs on the
  kit as it stands after the fixes before it**, and its `round.json` names that kit. The question test 1 answers for
  NodeGX becomes "how far do the fixes move it, round by round, towards the harness arm", not "0.2.5 against code".
  t1-nodegx-1 (16/22) stays the 0.2.5 baseline. Mechanism: `fixes/README.md` (the loop), `fixes/FIX-NN.md` (one per
  stop-and-check), `fixes/LEARNINGS.md`; the gate `HOLD-nodegx` + `KIT` in the lab folder (round.mjs waits before
  making a folder; series.mjs runs the other arms meanwhile). FIX-01 written; HOLD-nodegx set.
- **2026-10-22 18:10 CEST — FIX-01 landed** (fixer `opennoodl-54`: `f2afd62b0`, `0b9becca8`, `ddd876378`; kit
  `/Users/Shared/nodegx-lab/kits/FIX-01-ddd876378/`, its `Done` section in `fixes/FIX-01.md`). HOLD-nodegx lifted, KIT
  written. **Lab fix before any round used it:** round.mjs's sandbox denied the kits folder (a mock round's
  `create-nodegx` exited 255); it now allows reading the round's own KIT folder. Proven with two $0 mock rounds: the
  MCP entry becomes `npx -y --package=<kit>/nodegx-mcp-0.2.5.tgz noodl-mcp --allow-writes --screenshots-to-files`,
  `round.json` names the kit, and `get_example cloud-query-own-rows` (FIX-01 B's new example) answers. t1-nodegx-2
  runs on it after t1-harness-2.
- **2026-10-22 19:03 CEST, t1-harness-2 ended `aborted` after 1 sitting (5,570 s, $0.308).** Not the lab: Cline's own
  loop guard stopped it ("Detected 5 consecutive identical calls to `run_commands`; stopping to avoid a loop") while the
  agent polled its own `npm run check` (`sleep 29; grep -c ✓ /tmp/rt-check2.log …`, 63 tests passed so far). The relay
  (§1) continues only a *completed* sitting the judge calls MORE, so this round ends here and is graded as it stands,
  as a person's Cline would have left it. The rule holds for every arm from here on: a Cline-aborted sitting is the
  end of the round, and the round says so.
- **2026-10-22 20:50 CEST — t1-nodegx-2 (kit FIX-01) 17/22; t1-harness-2 21/22, t1-code-2 21/22.** Stop-and-check #2
  in `fixes/LEARNINGS.md`; `fixes/FIX-02.md` written (a Record by Id reads only memory, so a page opened by URL shows an
  empty record and writes it back; the kit's guidance is cut by Cline's ~8,000-character tool-result limit, so FIX-01
  C never reached the model; `update_component` given create arguments 11 times; 35 px default buttons). HOLD-nodegx
  set again; t1-code-3 and t1-harness-3 run meanwhile.
- **2026-10-22 21:07 CEST, t1-code-3 died of the network (kept as `.infra-broken-dns`), re-run.** Turn 48 went
  silent for 90 s, then every retry answered `getaddrinfo ENOTFOUND api.cline.bot` (the Mac lost DNS); Cline ended
  `error` ("Response stream ended without a finish reason") at 2,011 s, half-built. Its grade was stopped before it
  finished (a grade of a build the network cut tells nothing about the arm). Re-run as t1-code-3; the network answered
  again at 21:24 (HTTP 200).
- **2026-10-22 22:25 CEST — FIX-02 landed** (fixer `opennoodl-ac`: `f3d2a66e9` A, `328f1dd1d` B–D, `829b6cf08` Done;
  kit `/Users/Shared/nodegx-lab/kits/FIX-02-328f1dd1d/`, which for the first time carries a rebuilt
  `nodegx-preview-0.2.4.tgz`, because A, the Record reading an unheld record, lives in the runtime). **The graded app must
  run what a person with this kit would run**, so the lab routes `npx @nodegx/preview …` (any version spec, as the
  command or `-p`/`--package`) to the kit's tarball through `/Users/Shared/nodegx-lab/bin/kitnpx/npx`, first on the
  PATH of the round's shell and of the grader's, when the kit has a preview tarball; every other npx call passes
  through. Measured first: a preview installed globally in the round's HOME is **not** used (npx reuses the shared
  cache's registry copy, `_npx/f673…`); with the shim both shells resolve `preview` to `_npx/ff4932…`, whose lock
  names the kit's file. Mock round + grader prefix both proven. t1-code-3 21/22 (T6). t1-nodegx-3 runs on FIX-02
  after t1-harness-3.
