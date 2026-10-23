# OWN-026 — the next lab session: test 2 is RUNNING, all three chains (NodeGX on FIX-03 since 10:35 CEST)

**Updated 2026-10-23 ~08:30 CEST by the lab session `opennoodl-8c` (Opus 5.5), the one that started test 2.** Read
PLAN §8's 2026-10-23 08:12 entry first: what changed in the lab and why.

## Test 2, as left

- Three series started 08:12 CEST from `own-026/`: `node series.mjs t2 code t1-code-3` (pid 53944),
  `t2 harness t1-harness-1` (53945), `t2 nodegx t1-nodegx-3 --lock` (80216 since 16:09; 59102 before), and the FIX-04 comparison chain `--rounds own026-fix04 --grades own026-grades/fix04 --changes 3 --lock --lock-dir own026 --port-base 49300` (80561).
  Logs: `/Users/Shared/nodegx-lab/own026/series-t2-<arm>.log`. Check they live by **pid** (`kill -0`, one pid per call:
  zsh doesn't split a `$list`), never by name.
- **Code and harness take turns** on `LOCK-web3000` (both apps serve :3000), first come first served; NodeGX runs
  beside them. Don't delete the lock or a `.want-<pid>` file whose pid is alive.
- **FIX-03 is proven and in use** (PLAN §8 10:35; `mock/steps-fix03.json` is the probe to copy for FIX-04). **A NodeGX chain waits for two things:** `HOLD-nodegx` gone (the fixer deletes it) **and** `KIT-PROVEN` = `KIT`
  (the lab writes it). When FIX-03 lands: (1) `M=/Users/Shared/nodegx-lab/own026-mocks/fix03`, `mkdir -p $M $M-grades`,
  `ln -s /Users/Shared/nodegx-lab/own026/t1-nodegx-3 $M/`, `cp ../KIT $M/KIT $M/KIT-PROVEN`; (2) a $0 one-change chain:
  `JUDGE_BIN=$PWD/mock/fake-claude.mjs CLAUDE_BIN=$PWD/mock/fake-claude.mjs node series.mjs t2 nodegx t1-nodegx-3 --changes 1 --rounds $M
  --grades $M-grades --mock mock/<steps>.json --port-base 49300` with steps that call the tools FIX-03 changed (copy
  `mock/steps-list-projects.json`; `mock/steps.json` is the lab-plumbing one); read `$M/t2-nodegx-c01/mcp-entry.json`
  (names the new tgz) and the tool results in `$M/t2-nodegx-c01-tap/req-*.json`; (3) `cp KIT KIT-PROVEN` in the real
  lab folder. The chain starts within a minute.
- **FIX-04 (thinning) is a PARALLEL experiment** (Richard, 13:40): its fixer packs `kits/FIX-04-*` and messages the lab, but does NOT write `KIT`; the t2 NodeGX chain stays on FIX-03. When it lands: $0 mock, then c01–c03 on it in `own026-fix04/` from t1-nodegx-3, graded, compared by `measure.mjs compare` (same checks, less overhead).
- **Test 2 is TWENTY changes now** (PLAN §8 14:25). The running series stop at c10 ("series done"); restart each with the same command (`node series.mjs t2 <arm> <start>`), and it skips what's finished and runs c11–c20.
- **Per change:** `node measure.mjs <arm>` prints PLAN §4's row (also `own026-grades/measure-t2-<arm>.json`).
  Stop-and-check after every graded NodeGX change → `fixes/LEARNINGS.md` #4…; a gating defect → `FIX-04.md`, set
  `HOLD-nodegx`, tell Richard, give him the fixer prompt.

## Before test 2 (kept for the record)

## Where it stood at 00:50

- **Test 1 is done** (PLAN §8's table): code 21/21/21, harness 20/21/20, NodeGX 16 → 17 → 18 on kit 0.2.5 → FIX-01 → FIX-02.
- **The fix loop works.** FIX-01 (`opennoodl-54`) and FIX-02 (`opennoodl-ac`) landed. Kits are in
  `/Users/Shared/nodegx-lab/kits/`; `/Users/Shared/nodegx-lab/own026/KIT` points at `FIX-02-328f1dd1d`.
- **FIX-03 is written, not started.** `HOLD-nodegx` is set. Richard opens a fixer for it.
- **Richard's rulings for test 2** (PLAN §8, 2026-10-23):
  - NodeGX starts from `t1-nodegx-3`; code from `t1-code-3`; harness from `t1-harness-1`.
  - The three chains run side by side.
  - The NodeGX chain waits for FIX-03.

## What to do, in order

1. ✅ (done 2026-10-23 08:12, PLAN §8) **Before any test-2 round, make `series.mjs` safe to run three at once:**
   - **The log** is per series (`series-t2-<arm>.log`), not one shared `series-t2.log`.
   - **The tap port:** each chain takes its own range (code 49000+, harness 49100+, nodegx 49200+). The free-port check
     alone races between processes.
   - **Disk:** after change *n* is graded, delete `node_modules` (and `.next`, `test-results`) from the grade copy
     and from round *n−1*. Keep round *n*, because *n+1* copies it. Disk had 69 GB free at 00:30, down to 17 GB
     earlier in the day; a harness round is about 1.2 GB.
   - **The hold:** a t2 NodeGX chain waits while `HOLD-nodegx` exists, and so does `round.mjs`. Check it doesn't spin
     a log line a minute.
2. **Prove it with $0 mock rounds** (`mock-model.mjs`, a two-step `--seed` chain) before any spend. Every lab change
   so far was caught that way: the kits folder blocked by the fence, the shared /tmp, the orphan tap.
3. **Start the code and harness chains:** `node series.mjs t2 code t1-code-3`, `node series.mjs t2 harness t1-harness-1`
   (in the background, from `own-026/`). Start the NodeGX chain (`t2 nodegx t1-nodegx-3`) at once too: it waits on the
   hold by itself.
4. **When FIX-03 lands** (the fixer messages the lab session by name), prove its kit with a mock round before the
   chain uses it, as FIX-01 and FIX-02 were. If its `Done` says a fix lives in the runtime, the preview shim
   (`kitnpx`) already routes `npx @nodegx/preview` when the kit folder has a `nodegx-preview-*.tgz`.
5. **A stop-and-check after every graded NodeGX change:** append to `LEARNINGS.md`, and write `FIX-04`… when something
   gates the next change (set `HOLD-nodegx`; tell Richard; give him the fixer prompt). Measure per change (PLAN §4):
   - dollars, minutes and sittings;
   - the change's own checks;
   - **regressions** (passed after *n−1*, failed after *n*);
   - files and lines touched;
   - for NodeGX, the script share.
6. **After test 2: part 3** (PLAN §6). Sonnet 5.5 in Claude Code on the gala builds A+ and B2 (`own-023/runs-r2/Aplus`,
   `runs-r2b/B2`): the eldest's own editor, three changes, does the editor still tell the truth, then Richard's five
   timed jobs. Scope it with Richard first.

## Traps this session hit (all fixed, each in PLAN §8)

- **Chrome's own sandbox can't start inside `sandbox-exec`.** Every round and grade gets `CHROME_PATH` →
  `/Users/Shared/nodegx-lab/bin/chrome` (`--no-sandbox`). An agent that launches Chrome by its own path still fails;
  `chrome-sandbox-hits.txt` counts it.
- **A grader shell can't write to the scratchpads, where Claude Code saves command output.** So the grader's sandbox
  doesn't deny them.
- **A killed series orphans its tap**, which keeps its port. Kill taps by PID; ports are now checked.
- **The hold must be checked before a round makes its folder**, so a waiting round can be stopped clean.
- **`npx` ignores a globally installed package** and reuses the shared cache's registry copy. Hence the PATH shim.
- **zsh doesn't split `$P`:** kill PIDs in a loop.
- **Cline's loop guard ends a sitting** after 5 identical `run_commands` (the harness arm polling its own test suite,
  twice). An aborted sitting ends the round.
- **The network can drop** (`ENOTFOUND api.cline.bot`). Set such a round aside as `.infra-broken-*`, don't grade it,
  and re-run.
- **A Cline prompt of one word is read as a subcommand.**

## Waits on Richard

- His ClinePass bars before and after test 2: OWN-020's rule, not yet read this run. Test 1 cost about $2.4 at
  ClinePass prices.
- Opening the FIX-03 fixer session.
