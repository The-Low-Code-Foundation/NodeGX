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
- **2026-10-22 22:55 CEST, a tap mix-up (no effect on any agent).** A `stream-tap.mjs` orphaned when the series was
  killed at 14:25 kept port 48901; the restarted series gave t1-harness-3 that port, its own tap failed to bind, and
  the round's traffic went through the orphan: the same retry tap to the same gateway, so the round ran as every other,
  but its log is in `t1-nodegx-1-tap/tap.log` after 19:56 UTC, not in `t1-harness-3-tap/`. series.mjs now takes the
  first port nothing listens on; the orphan is stopped when t1-harness-3 ends.
- **2026-10-22 23:07 CEST, t1-harness-3 ended `aborted` (1 sitting, 4,209 s, $0.426), Cline's loop guard again**
  ("5 consecutive identical calls to `run_commands`") while the agent polled its own long `npm run check`. Two of
  the harness arm's three rounds ended this way and none of the other arms': the harness asks for a full
  typecheck + unit + Playwright run before "done", DeepSeek polls it with an identical `sleep; grep` command, and
  Cline stops it. Graded as it stands (the rule above). The orphan tap (pid 82515) stopped.
- **2026-10-23 00:31 CEST — test 1 complete.** F+T out of 22 (S0 passed in all nine):

  | arm | round 1 | round 2 | round 3 | median | DeepSeek $ (3 rounds) |
  |---|---|---|---|---|---|
  | code | 21 (T6) | 21 (T6) | 21 (T6) | **21** | 0.17 + 0.23 + 0.13 |
  | harness | 20 (F6, T6) | 21 (T6) · aborted by Cline's loop guard | 20 (T6, T13) · aborted | **20** | 0.26 + 0.31 + 0.43 |
  | nodegx | 16 · kit 0.2.5 (F7, T3, T5, T7, T8, T9) | 17 · FIX-01 (F6, T1, T2, T5, T9) | 18 · FIX-02 (F6, T3, T5, T6) | — | 0.20 + 0.20 + 0.25 |

  **Reading (PLAN §3's rule):** on the kit as shipped (0.2.5) NodeGX was below both code arms by more than either's
  spread, so pillar 1 is **not supported** for 0.2.5 with DeepSeek in Cline; the harness did not beat plain code
  (pillar 1's caveat moot: plain DeepSeek was already at 21). Under the fix loop the NodeGX arm rose one point per
  round (16 → 17 → 18) and every gap it closed was a kit defect named in a FIX file; the two traps left (T3, T5) are
  ones the lessons now reach and the model argued away (`fixes/LEARNINGS.md` #3). T6 is failed by 7 of 9 rounds
  across all arms: a property of the request, not of an arm. Not significance; n = 3 per arm and the NodeGX arm's
  kit changed between its rounds.
- **2026-10-23 ~00:45 CEST — Richard's rulings for test 2** (asked with the test 1 table in front of him):
  1. **NodeGX starts from t1-nodegx-3** (the FIX-02 build, 18/22), not the pre-registered median (t1-nodegx-2): the
     learning loop's latest kit and its build. The code arms keep §4's rule: median F+T, ties to the cheaper →
     **t1-code-3** (21, $0.129) and **t1-harness-1** (20, $0.255).
  2. **The three chains run side by side** (about 10–12 hours), not one after another.
  3. **The NodeGX chain waits for FIX-03** (`fixes/FIX-03.md`: the safe way must be the short way); the code chains
     start without it. HOLD-nodegx set. The session closed here; test 2 is the next session's (`NEXT-SESSION-PROMPT.md`).
- **2026-10-23 08:12 CEST — the lab made safe for three chains at once; test 2 started** (session `opennoodl`, Opus 5.5).
  series.mjs: a log per series (`series-t2-<arm>.log`); tap ports per chain (t1 48900+, code 49000+, harness 49100+,
  nodegx 49200+), free only when lsof sees no LISTEN on any address, and the started tap must be the port's listener;
  after change *n* is graded, `node_modules`/`.next`/`test-results` go from the grade copy and from round *n−1* (never
  a t1 seed, never round *n*); a step waits while the disk has under 8 GB free. **Two hazards the handoff didn't name,
  found by measuring first:**
  1. **The code and harness apps both serve on localhost:3000** (t1-code-3's `server/index.js` defaults `PORT` to
     3000; t1-harness-1 is `next dev`), and every code and harness grader of test 1 drove :3000. Side by side, one
     arm's agent or grader would test the other arm's app. So a code or harness round or grade holds
     `LOCK-web3000` (an atomic mkdir, owner pid inside, a dead owner's lock taken over and logged) for as long as it
     runs, and also waits for :3000 to be free. Those two chains **take turns**, first come first served (a
     `LOCK-web3000.want-<pid>` queue: in the first mock the code chain dropped the lock and took it straight back,
     round → grade → next round, and harness starved); the NodeGX chain (its apps on 8584/8575) runs beside them.
     Richard's "side by side" holds for NodeGX against the plain-code arms, not between the two plain-code arms.
  2. **A seeded NodeGX round would have crashed:** the seed copy leaves out `home/.cline` (the old chat), and with it
     the MCP settings file the kit wrote once at create, which round.mjs then read. round.mjs now copies that one file
     (a person's MCP servers are theirs on day N) and points its `--package=<tgz>` at today's KIT; the entry is saved
     as `mcp-entry.json`. A $0 seeded round called `nodegx__list_projects` and got "Rocket Tables" at its own round's
     path. The kit's other create-time files (`AGENTS.md`, the skill) come with the seed from FIX-02's kit and are not
     re-written: a kit fix that lives only in those files would not reach a t2 NodeGX round (FIX-03's targets, the
     guidance, `get_node_type` and the examples, come from the server and do).
  round.mjs takes `--hold`/`--kit-file` (defaults the lab's), so a mock series keeps its own; grade.mjs accepts a grade
  root under `own026-mocks/`. **Proven with $0 mocks** (`own026-mocks/t2s1`, `t2s2`: mock-model on the tap port, a
  stand-in `claude` as judge and grader via `JUDGE_BIN`/`CLAUDE_BIN`, `--changes 2` from the real t1 seeds): three
  chains at once; the hold logged once over two minutes and the chain started within a minute of lifting; code and
  harness strictly alternate; each round carried the last change forward; pruning left `node_modules` only in round
  *n* (a harness round + grade copy: 1.6 GB back). Then the real chains: `node series.mjs t2 code t1-code-3`,
  `t2 harness t1-harness-1`, `t2 nodegx t1-nodegx-3` (waiting on HOLD-nodegx for FIX-03). First requests have the
  same shape as test 1's (4 tools plain code, 12 NodeGX in the mock). **Known, not fenced:** `/tmp` is still shared;
  two concurrent rounds that name the same `/tmp` file would share it (each round's `seal-audit.txt` lists the
  names, so overlaps can be counted afterwards).
- **2026-10-23 10:35 CEST — FIX-03 landed and proven; the NodeGX chain of test 2 started on it.** Fixer `opennoodl-26`
  (`cb7e0d6e4`, `a877b99e7`; kit `kits/FIX-03-cb7e0d6e4/`, with a rebuilt preview tgz: A and B live in the runtime).
  The KIT-PROVEN gate held: the hold went at ~10:33 and the chain waited. $0 mock (`own026-mocks/fix03b`, steps
  `mock/steps-fix03.json`), on a seed of t1-nodegx-3 as the chain runs it: the MCP entry names FIX-03's tgz;
  `open_project` binds the round's own copy; `get_node_type SetDbModelProperties` has Add To at character 832 and
  "taken once" at 1,180 (the fixer's numbers); `get_example cloud-shared-counter` answers; the round's `npx` is the
  kitnpx shim on FIX-03's preview tgz. (The first mock, `fix03`, sent wrong argument names; the server refused them by
  name.) KIT-PROVEN written; t2-nodegx-c01 started 10:35. Code and harness were at change 3 by then: c01 14/15 both;
  c02 code 15/17 (C2.1 FAIL: multiple choice instead of a number pad), harness 15/17 (F6 regressed, graded as a doubt;
  harness 56 min / $0.238 against code's 12 min / $0.052).
- **2026-10-23 11:37 CEST — a seed carries its old folder's path; left as it is for the rest of test 2.** Each round
  works on a copy at a new path, so a file that names its own folder names the seed's. t2-nodegx-c02 found the
  project's `.mcp.json` (written by `create_project`, for Claude Code) pointing at t1-nodegx-3. It ran
  `ls -d …/t1-nodegx-3`, the fence refused it ("Operation not permitted"), and it rewrote the path to its own folder (2
  calls). The code arm's README names its builder's folder too (t2-code-c01's grader). A person on day N has the
  same folder, so this is the lab's. It's small and touches every arm, and rewriting seeds mid-test would change the
  conditions halfway through, so the lab is unchanged; the audits show each case. The product side is a real defect,
  filed: `P112-OWN026-MCPJSONABSPATH` (a moved, renamed or cloned project points its Claude Code server at the old
  folder).
- **2026-10-23 12:10 CEST — F6 is graded both ways on identical apps.** t2-nodegx-c02 and t2-harness-c02 each show F6
  as a regression, but NodeGX's planet nodes didn't change between c01 and c02 (LEARNINGS #5). c01's grader passed the
  same facts with an "interpretation note"; c02's wrote them as a doubt, so FAIL. §5 holds: each grade stands, since
  its evidence supports its verdict. The test-2 table will **list F6 separately from the regression count**, so the
  curve isn't moved by a borderline check's coin. Stop-and-check #5: NodeGX c02 15/17, the only arm that built the
  number pad well (code built multiple choice: C2.1 FAIL; harness passed at 2.7× NodeGX's cost).
- **2026-10-23 12:30 CEST — Richard's goal for NodeGX, and how test 2 is read for it.** His words: *"our goal now
  is not to make NodeGX 'better' than coding pure, it's to make it the thinnest layer of additional context
  possible, to be easily as good as a coded app in your LLM vibe coding engine without much extra cost or work for
  the LLM, such that even DeepSeek can do it"*. The payoff is the Studio in the agent's chat (a true copilot, not the
  driver), deploy and CI/CD from the Studio, and the off-ramp only when it's worth the bother (DIRECTION D8).
  §4's pre-registered reading stands. Beside it, test 2 is read as **parity at small overhead**: per change, NodeGX's
  checks against the plain-code arm's, and its overhead as ratios (`node measure.mjs compare`: $, minutes, turns,
  tokens read fresh, tokens written). So far: checks level on c01 and c02 (14/15, 15/17 in all three arms; NodeGX
  the only one to build c02's number pad well); overhead over code 1.5× and 1.7× in $, 1.3× in turns, but **1.0–1.2×
  in tokens written**. The model writes about the same; the extra is what it reads (1.6×, 2.1× fresh input).
  In t2-nodegx-c02, 2.9M of 3.5M characters of tool results were its own screenshots read back with `read_files`
  (the kit saves `drive_page` shots to files; DeepSeek does see them: *"⌫ renders as a real backspace glyph"*),
  carried in every later request (3.7M characters a request by the end, mostly cached). So from here a stop-and-check
  also asks **what made the layer thicker**, and a FIX may aim to cut overhead, not only to fix a fail. The two
  levers seen so far: defaults that just work beat advice that's read and argued away (FIX-03 B against FIX-03 C),
  and argument-name refusals are pure overhead (14 in c01).
- **2026-10-23 14:25 CEST — test 2 extended to twenty changes, pre-registered before any arm's change 5 was graded.**
  Richard, after change 4 (NodeGX 22/22 at 1.2× code's $; code needed 135 turns): *"we have to keep this experiment
  going with more and more features to see if this trend holds up, if code is struggling more the deeper we go and
  NodeGX is sailing through … I'll not get my hopes up."* So `changes/c11–c20.txt` and checks C11.1–C20.2
  (`checks.md` §C) are written now, while only change 4's results are known. That way they can't be chosen to fit a
  trend. Half cut across the design: a second parent (roles), tables up to 12 (every 1–10 assumption), homework
  (teacher writes, a new entity), a themed world (every picture and word), a child shared between two families (the
  ownership edge). The other half are additions: a weekly report, the shop off per child, a CSV download, a wrong
  answer costs a star, undo a purchase. Same rules as §4: the same words in the same order to every arm; after each,
  one grade of S0, the change's checks and the regression set, which by c20 holds every earlier change's checks.
  `series.mjs` runs as many changes as `changes/` holds. The running chains stop at c10 ("series done") and are
  restarted to go on. Cost, from c01–c04: about $6–7 a change for the three Opus grades and $0.3–0.7 of DeepSeek;
  ten more is about $70 and, with the plain-code arms taking turns, about 15 hours. `measure.mjs nodegx` now also
  reports **kit lookups** (calls and characters to the kit's teaching tools) and **reads of its own `docs/`**: c01–c04
  went 19/119k → 16/206k → 23/492k → 13/115k against 2 → 3 → 8 → 10. Whether the project, not the kit, teaches the
  agent as the chain grows is the reading of LEARNINGS #7 to test.
- **2026-10-23 ~14:30 CEST — Richard's ClinePass bars during test 2** (OWN-020's rule; after 13 test-2 rounds,
  $1.84 at ClinePass prices): 5-hour **5%**, weekly **13%** (he thinks it reset this morning), monthly **42%**
  (holds test 1 and earlier labs). He ruled to go on to twenty changes. The Opus grades (12 so far, $21.86 by Claude
  Code's own count) use his Claude plan, not ClinePass, and show on neither bar.
- **2026-10-23 15:35 CEST — FIX-04 (thinning) landed; proven; its comparison chain shares the NodeGX ports by a
  lock.** Fixer `opennoodl-0d`: `eee0d410a` (+ Done `ebc1b699f`), kit `kits/FIX-04-eee0d410a/` packed on FIX-03's
  commit plus FIX-04 only (the P125 commits since would have changed what's measured). Its Done **corrects this
  lab's reading of the screenshots**: an opened shot is 200–490k base64 characters in a request but ≤ ~1k billed
  tokens; images were 0–2% of c01–c03's input. The tap log's `chars=` is not billing. The thickness by billed
  input: write answers 20.8%, `read_files` 13%, the writes 9.5%, `get_node_type` 9.3%. FIX-04:
  - wires as one line (c03's writes −26%);
  - one line per skipped-check code in write answers (−57%);
  - argument aliases (15 of 27 refusals);
  - screenshots measured and left as they are;
  - the resident tool surface at 8,277 of 8,280.

  $0 mock (`own026-mocks/fix04`, `mock/steps-fix04.json`): `get_node_type` answers `typeName` and a string list,
  `search_project` answers `query`. **Ports:** every NodeGX app serves the preview on 8575 (its default) and the
  backend on 8584 (the app's own `config.json`, inherited by every seed). So two NodeGX chains take turns on
  `LOCK-nodegx8575` (`series.mjs --lock`, opt-in, with `--lock-dir` to share the main lab's lock from another rounds
  folder). The lock also waits while either port is held by anyone. A $0 two-chain mock waited, correctly, on the
  real c06 grade's preview. The main NodeGX series (59102) was stopped during t2-nodegx-c06's grade (the grade runs
  on: it writes `meta.json` before it prints) and restarted with `--lock` once that grade ended. Beside it,
  **`own026-fix04/`: c01–c03 on FIX-04 from t1-nodegx-3** (grades in `own026-grades/fix04/`), compared with the
  FIX-03 chain's c01–c03 by `measure.mjs`: the same checks, less overhead.
- **2026-10-23 17:15 CEST — did FIX-04 touch the main chain's grades? No (Richard asked).** c04–c07's `mcp-entry.json`
  and `round.json` all name `kits/FIX-03-cb7e0d6e4`; `KIT` and `KIT-PROVEN` still do. c05 was built 14:16–14:43 and
  graded by 15:14; FIX-04 was packed at 15:30, and its chain's first round started after 16:59. c05's failure is in the
  agent's own function, and c06's grader found it again independently. No port clash in c05 or c06's grader logs (no
  EADDRINUSE; each drove its own 8575/8584). **Noted:** a grader's `lsof` lists other processes' listening ports on
  the Mac (c05's saw 8520, 8591 …, other sessions' servers). It doesn't reach them, and the fence doesn't hide them.
