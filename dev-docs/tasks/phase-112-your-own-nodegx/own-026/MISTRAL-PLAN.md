# OWN-026 Mistral: the same lab with Mistral Large 4 in Mistral Vibe, on the FIX-01–07 kit

**Written 2026-10-24 ~10:50 CEST (Opus 5.5), before any real Mistral round ran.** §1–§5 are pre-registered. What happens
after a round has run goes in §6 with its date, never folded back in above. `PLAN.md` is the DeepSeek lab this copies.
Its §3–§5 (request, checks, changes, grading rules) hold here word for word unless this file says otherwise.

## 0. Why (Richard, 2026-10-24)

*"The experiments we're doing with DeepSeek 4.1 Flash at the moment to see how NodeGX matches up to plain Claude Code
sessions and Code sessions with system instructions, can we apply the same fixes we've made (01 through 07) to the
Mistral Vibe harness and try maybe 10 rounds of the same concept in Mistral Large 4? Making the Rocket School basic app
and pushing changes round after round to see how each test handles the additions and changes?"*

His rulings, asked before anything ran:

1. **Rounds:** per arm, one build (`request-build.txt`, test 1's 22 checks) and then changes **c01–c10**, the same first
   ten changes DeepSeek got, graded by the same checks. 11 rounds and 11 grades per arm, 33 of each.
2. **Kit:** **frozen**. One kit holds FIX-01–07, and every NodeGX round uses it. Stop-and-check notes are written, but
   the kit doesn't change mid-run, so there is no fix loop and no HOLD.
3. **Key and cap:** the Vibe subscription key (`MISTRAL_VIBE_API_KEY`, passed as `MISTRAL_API_KEY`), and **$3 a
   round** on Vibe's own reading (`--max-price`, given to each sitting as $3 minus what the round has spent). Vibe 3.0.2's
   reading matched the tokens on the first real call ($0.00702 for 4,777 fresh, 3,052 cached and 24 out at the prices
   below), so this is about $3 of real spend. A round that hits the cap ends there and is graded as it stands, like a
   Cline-aborted sitting in PLAN §8.
4. **Timing:** the NodeGX chain starts now, beside DeepSeek's, sharing `LOCK-nodegx8575`. The code and harness chains
   start once DeepSeek's code and harness chains have finished c20, so the :3000 queue doesn't double.

## 1. The model, the harness, the fence

- **Mistral Large 4** (`mistral-large-4` on Mistral's API) in **Mistral Vibe 3.0.2** (2026-10-22), what a person
  installs today. It is installed in `/Users/Shared/nodegx-lab/vibe-3.0.2` (uv venv; Python in `uv-python/`), because
  the fence denies `~/.local` and `~/.cache`. The model entry in every arm is the kit's own Large 4 lines: `thinking =
  "high"`, temperature 1.0, $1.36 in / $4.18 out / $0.14 cached per M.
- Headless: `vibe -p <request> --auto-approve --trust --output streaming --time-limit 7200 --max-price <left>
  --output-dir <sitting>/out --disabled-tools web_fetch --disabled-tools web_search --disabled-tools task
  --disabled-tools ask_user_question`. In `-p` an unanswered ask ends the run, so everything is approved, and the fence
  is the OS's.
- **The fence is round.mjs's** `sandbox-exec` profile, with Vibe's install readable in place of Cline's. It denies
  Richard's home except node, the Claude scratchpads, and every other lab folder. Proven by $0 mocks
  (`own026-mocks/mistral1–3`): the repo README, another round's log and the scratchpads all answer "Operation not
  permitted"; the audit lists every outside path the model named; a /tmp file is moved into the round's `left-in-tmp/`.
- **The relay is PLAN §1's:** a sitting that finishes is judged by Haiku from its last message. MORE means a NEW
  sitting with the carry-on sentence, up to 2 more. Vibe 3 could resume (`-c`); the lab doesn't, so both labs relay
  the same way. 120 minutes a sitting; stopped after 30 minutes with no output.
- `VIBE_HOME` is `<round>/vibe`, outside `home/`. The old chat neither seeds the next round nor reaches the grader,
  just as `home/.cline` was left out in round.mjs. The project's `.vibe/config.toml` (NodeGX arm) travels with the
  folder.
- Rounds live in `/Users/Shared/nodegx-lab/own026/mistral/` and grades in `/Users/Shared/nodegx-lab/own026-grades/mistral/`.
  Both are inside the paths the grader's fences already deny or allow, so `grade.mjs` runs unchanged.
- Runner `round-vibe.mjs`. `series.mjs` gained three opt-in flags (`--runner`, `--no-tap`, `--build`), and DeepSeek's
  series don't use them. The chain command is in §5.

## 2. The arms

The same as PLAN §2, with Vibe in place of Cline:

| arm | the folder | notes |
|---|---|---|
| code | empty | |
| harness | empty + OWN-023's plain-code instructions as `AGENTS.md` | Vibe reads `AGENTS.md`; same text, same one-word change |
| nodegx | `create-nodegx --vibe` from the kit's tarball | the kit's `AGENTS.md`, its Vibe agent profile, `.vibe/config.toml` with the server entry (pointed at the kit's MCP tarball) |

**The kit:** `/Users/Shared/nodegx-lab/kits/ALL-0107-dd58d9a8d/`, branch `own026-all0107-pack` = Base `d92d95c0b`
(FIX-01–05) + FIX-06 (`8d673f793`) + FIX-07 (cherry-picked clean, `dd58d9a8d`; its guidance, render tools and traps are
byte-identical to cline-dev's `154ea1088`). `nodegx-mcp-0.2.5.tgz` sha1 `dc7fb63a…`, `nodegx-preview-0.2.4.tgz`
`08cd2a45…` (= FIX-06's), `create-nodegx-0.2.5.tgz` the registry's. Both new specs pass (12/12). Proven from the
tarballs: FIX-05's and FIX-06's examples are served, and FIX-07's "both halves" wording is in readFirst, the traps and
drive_page.

## 3. What is different from the DeepSeek lab (known before any round)

1. **Vibe 3's tools.** The model has `bash`, `read_file`, `write_file`, `edit`, `todo`, `skill` and `wait`. It reaches
   everything else, including NodeGX's MCP tools, through `search_tool_functions` + `run_typescript`
   (`tools.mcp_nodegx.<tool>(…)`). This is how a person's Vibe 3 works. It is an extra step Cline didn't have, and it
   falls on the NodeGX arm only.
2. **MCP errors reach the model.** 3.0.2 passes the server's own text, so the kit's `--legacy-harness` advice is
   obsolete, and Vibe 3 refuses the flag (bug `P112-OWN026-VIBE3LEGACY`). The mock: an unknown argument comes back
   with "Its arguments are: path, include_usages."
3. **Sub-agents can't be turned off** in 3.0.2. The `agents` connector (spawn, send_message, …) stayed through
   `--disabled-tools` (names, globs, `re:`), `enable_subagents = false` and a disabled `[[connectors]]` entry. So they
   are on in every arm, and `round.json` counts `subagents` (agents.spawn calls). Whether a sub-agent's tokens are in
   the export's usage is not known yet; the first round that spawns one gets checked.
4. **The lab's own fixes for Vibe** (none changes what the agent is told):
   - Vibe starts an MCP server with only HOME, PATH, SHELL, TERM, USER and LOGNAME, which broke the lab's npx shim. The
     shim now falls back to the npx beside node when its variables are missing, so DeepSeek's rounds are unchanged.
   - Vibe's bash runs the login profile, where macOS's path_helper put `/usr/local/bin` first: no shim, and maybe
     another node. A lab `ZDOTDIR` `.zprofile`, outside HOME, puts the round's PATH back.
   - Vibe 3 reads the macOS Keychain when `MISTRAL_API_KEY` is unset, so it is always set, in mocks too.
5. **No stream tap.** Usage and cost come from Vibe's `export.json`. The tap's `measure.mjs` columns (provider
   stalls, per-request reads) will be read from Vibe's session journal instead, when measured.

## 4. Grading and reading (pre-registered)

- `grade.mjs` exactly as for DeepSeek: a fresh Opus 5.5, S0 + the build's F1–F8/T1–T13, then per change S0, its own
  checks and the regression set (`series.mjs t2Ids`). PLAN §5's rules hold, including "a check moves only when the
  code under it moved" (stop-and-check #19) for regressions on unchanged facts.
- **Per round:** $ (Large 4 list prices, and Vibe's own reading beside them), minutes, sittings, turns (`steps`),
  sub-agent spawns, the audit, and for NodeGX the share of the change that went into script nodes (PLAN §4).
- **Read as two comparisons, both written whichever way they fall:**
  1. **Across arms, same model:** does NodeGX on the FIX-01–07 kit hold the same checks as plain Vibe code at small
     overhead (Richard's thinnest-layer goal, PLAN §8 12:30), and does the harness's `AGENTS.md` change that?
  2. **Same arm, across models:** each Mistral chain's c01–c10 against DeepSeek's (DeepSeek NodeGX on FIX-03, a
     different kit; the plain arms identical apart from model and harness). A gap can't be put down to the model
     alone, because the harness and, for NodeGX, the kit changed too. That is written beside every such reading.
- n = 1 chain per arm: a curve, not a significance test.

## 5. Commands

```sh
cd dev-docs/tasks/phase-112-your-own-nodegx/own-026
# NodeGX (now; shares the main lab's NodeGX lock):
node series.mjs t2 nodegx t1-nodegx-1 --build --changes 10 --runner round-vibe.mjs --no-tap \
  --rounds /Users/Shared/nodegx-lab/own026/mistral --grades /Users/Shared/nodegx-lab/own026-grades/mistral \
  --lock --lock-dir /Users/Shared/nodegx-lab/own026
# code / harness (after DeepSeek's code and harness chains have finished c20; they share LOCK-web3000):
node series.mjs t2 code t1-code-1 --build --changes 10 --runner round-vibe.mjs --no-tap --rounds … --grades … --lock-dir /Users/Shared/nodegx-lab/own026
node series.mjs t2 harness t1-harness-1 --build --changes 10 --runner round-vibe.mjs --no-tap --rounds … --grades … --lock-dir /Users/Shared/nodegx-lab/own026
```

`own026/mistral/KIT` and `KIT-PROVEN` name the kit. A $0 mock of the whole chain: `--mock mock/steps-vibe.json` with
`JUDGE_BIN`/`CLAUDE_BIN` = `mock/fake-claude.mjs` (as PLAN §8).

## 6. What happened (dated entries only)

- **2026-10-24 10:46 CEST — the NodeGX chain started** (pid 96498) and queued on `LOCK-nodegx8575`. **~11:00, from
  the DeepSeek lab (`opennoodl-8c`):** DeepSeek's code and harness chains now end at **c16, not c20** (Richard's ruling
  10:32), so §0.4's "after c20" means after both c16 grades land, ~3–4 h. The main DeepSeek NodeGX chain is held after
  its c16 grade. Ahead of this chain on the lock: two mock grades and the four FIX-06/07 re-runs (fix06a|b, fix07a|b),
  first come, first served, so the first Mistral round waits for all of them.
- **2026-10-24 ~12:15 CEST — Richard: "If you get to 40% weekly usage, stop please, and don't let anyone use Fable."**
  Weekly (the Claude plan's `seven_day`, which resets Tue 27 Oct 00:00 CET) read **32%**. `series.mjs --stop-weekly 0.40`:
  - before every round and grade, a one-line Haiku call (~$0.001) reads `rate_limit_info.unifiedWindows.seven_day`;
  - at 40% or over, or with no reading after 3 tries, the series exits 3;
  - a running grade is watched through its own stream and killed when it crosses 40%.

  Proven with a real probe at a 30% limit (it stopped before the round, exit 3). `grade.mjs` refuses any `--model`
  naming Fable. Every Claude call in the lab names its model (Opus 5.5 grades; Haiku judge and probe). The chain was
  restarted with the flag (pid 96498 → 20754), its queue file put back to 10:46:41, its original place. With 8 points
  of headroom, shared with the DeepSeek lab's grades, the Mistral chain will likely stop well before c10.
- **2026-10-24 14:49–15:05 CEST — the first real chain broke; no Mistral result exists yet.** All 11 rounds (t1 +
  c01–c10) ended `infrastructure_failure` on their first request, 5–9 s, 0 tokens, $0. Mistral's API refused them:
  `max_tokens is too large: 985127 … at most 262144 completion tokens`. The kit's Large 4 entry
  (`max_context_length = 1000000`, no output cap) makes Vibe 3 ask for the whole leftover context. My runner copies
  the same lines into every arm's user config, so the code arms would have failed too. **Lab faults, both mine:**
  - the pre-spend ping used a model entry without that line, so it didn't catch this;
  - round-vibe.mjs wrote a `round.json` for a sitting that never started, so the series graded all 11 empty folders
    (Opus, ~$0.25–0.36 each, ≈ $3 in all) and seeded each change from the last.

  Set aside as `*.infra-broken-maxtokens` (rounds and grades). round-vibe.mjs now writes no `round.json` when the
  first sitting got no tokens back, so the series stops. Measured: the same entry plus `max_output_tokens = 32768`
  answers. Bug `P112-OWN026-VIBEMAXTOKENS` (high: as shipped, the Vibe kit can't build anything in Vibe 3). Weekly read
  38% at the end. The re-run waits on Richard's ruling on how the model entry gets its cap.
- **2026-10-24 ~17:45 CEST — Richard's rulings: fix the kit; the weekly stop goes to 45%.**
  - **The fix:** one line in `renderVibeConfig` (`max_output_tokens = 32768`) plus a test assertion. Committed on the
    pack branch `own026-all0107-pack` as `16efb1b30`, not yet on cline-dev; the worktree's create-nodegx was
    byte-identical to the registry's 0.2.5 before it. Two create.test.js failures (26, 34: the wrapper packages'
    version pins) fail at HEAD too.
  - **The kit:** `kits/ALL-0107-VIBECFG-16efb1b30/` = ALL-0107's MCP and preview tarballs (same sha1) +
    `create-nodegx-0.2.5.tgz` `0b20360f…`, the same file list, one line different. round-vibe.mjs's model entry for
    the plain arms carries the same line.
  - **Proof:** this time through round-vibe.mjs itself, each arm's exact config inside the sandbox, a one-line request
    to the real Large 4: nodegx $0.010, code $0.007, both completed.
  - **The re-run:** restarted with `--stop-weekly 0.45` (pid 63840). The weekly probe read 39%. t1-nodegx-1 started
    15:51 UTC. Its first calls: the kit's three skills, `search_tool_functions`, `create_project` with a scoped brief.
- **2026-10-24 17:51–23:25 CEST — the $3 cap decided every round; set aside as `*.capped-3usd`.** t1 and c01–c07
  (NodeGX): every sitting ended `price_limit` at $3.0–3.2. That was 41–114 steps, about 15M input tokens a round
  (≈ 97% cached), and no relay. The build reached sign-in and an empty profiles page: 3/22. The changes then went
  2/15, 4/17, 4/19, 4/22, 6/25, 4/27, each inheriting the gaps. Spent about $25 of Mistral and about $6 of Opus.
  These numbers measure the cap, not the model. **Richard (~23:20): lift the weekly stop ("my usage reset"), and
  no per-round cap.** round-vibe.mjs takes `--max-usd none` (no `--max-price`); series.mjs passes `--max-usd` through.
- **2026-10-24 23:26–23:45 CEST — the 32,768 output cap was too small; set aside as `*.outcap-32k`.** The Mistral
  code and harness chains started too (DeepSeek's plain arms had finished c16 at 14:33 and 14:55). t1-code-1's first
  response was 127 KB of reasoning that drafted the whole app, then `finish_reason: "length"`, and Vibe retried the
  same. Large 4's thinking counts against `max_output_tokens`. The kit's cap is now the API's own 262,144 (`ab9546ad0`
  on the pack branch; kit `ALL-0107-VIBECFG-ab9546ad0`), and the runner's plain-arm entry matches. Real pings through
  round-vibe.mjs: nodegx $0.010, code $0.007, both completed. **All three chains restarted 23:39 from the build**
  (nodegx 96529, code 96800, harness 97055), with no per-round cap and no weekly stop.
- **2026-10-25 ~08:30 CET — paused by Richard (Vibe allowance about €49 of €255 left, resets 1 Nov).** Graded so far,
  checks passed, $ at list price:
  - code: build 1/22 ($1.48), c01 1/15, c02 1/17, c03 19/19, c04 21/22 ($0.81). Its builds 1–3 were hidden behind
    one CSS bug: an overlay's `display: grid` overrode `hidden` and covered sign-in. c05 was built; its grade was
    still running at the pause.
  - harness: 19/22 ($6.72), 13/15, 15/17, 17/19, 20/22 ($4.41). F6 (planet list runs through moons) and T6 failed
    in every grade.
  - nodegx: 18/22 ($8.38), 14/15 ($5.92), 15/17 ($4.53), 19/19 ($9.92). Over c01–c03, $20.37 against code's
    $1.23 (≈ 16×).

  nodegx c04 (260 steps) and harness c05 (49 steps) stalled (30 min with no output) after real work. Vibe 3 writes
  no usage on SIGTERM, so the zero-token guard misread them as infra-broken and wrote no `round.json`. The guard now
  also needs zero tool calls. Both rounds are to be finalised and graded as they stand. Run total: Mistral $51,
  Opus grades $24.83. Report page: https://claude.ai/artifact/4gPycBS2RZPWKZfnaCQAno.
  **Resume 1 Nov:** nodegx from c04, harness from c05, code from c06, the same commands with `--max-usd none`.
- **2026-10-25 — LAB FAULT: the NodeGX arm ran blind. Its Mistral results (t1, c01–c03) don't stand (PLAN §5:
  re-run).** Every `render_report` / `drive_page` the model called hung and was killed at 240 s: 12 in all, 48
  minutes of waiting. Cause: Vibe 3 starts an MCP server with only HOME/PATH/SHELL/TERM/USER/LOGNAME, so the lab's
  `CHROME_PATH` (the `--no-sandbox` wrapper; PLAN §8 2026-10-22 14:30) never reached the kit's renderer. Its Chrome
  then couldn't start inside the fence. Cline passes the whole environment, so DeepSeek's rounds rendered fine
  (t1-nodegx-3: 45 drive_page and 101 render_report mentions). My $0 mocks never called a render, so they didn't
  catch it. What it cost the arm:
  - **No screenshots of its own app.** Its look stayed the kit's light defaults; DeepSeek's NodeGX app with
    working renders has a space theme as rich as the code arms'.
  - **It worked round the tools.** 28–41 reads a round of the kit's bundled `render-harness` source in the npm
    cache, its own Chrome scripts in /tmp (bash had `CHROME_PATH`), 139 of 169 shell calls in c03 reading the
    project JSON by hand, and 41 backend exports to check state.
  - **Cost:** 118–235 steps at 186–248k tokens a step; 81% of c03's $9.92 is cached re-reads ($0.14/M on Large 4
    against $0.003/M for DeepSeek on ClinePass).

  Fix before the re-run: give the Vibe MCP entry `env` with `CHROME_PATH` (lab plumbing, as the `--package` rewrite
  is), then a $0 mock that calls `render_report` and `drive_page` through Vibe and gets pictures. Plain code and
  harness are unaffected (their Chrome runs from bash, which has `CHROME_PATH`).
- **2026-10-25 ~09:30 CET — the lab fixed; NodeGX re-run from the build on the last of the Vibe credit (Richard: "give
  the nodegx arm a chance … don't let it take such a big L when it's not deserved").**
  - **The fix:** round-vibe.mjs writes `env = { CHROME_PATH, TMPDIR, npm_config_cache, PLAYWRIGHT_BROWSERS_PATH,
    BROWSER, NODEGX_LAB_PREVIEW_TGZ, NODEGX_LAB_REAL_NPX }` into the Vibe MCP entry (Vibe 3 merges it over its six
    defaults; the model's key is never in it). `mcp-entry.json` now lists `envKeys`.
  - **Proven by a $0 mock that renders** (`own026-mocks/mistral-render`, `mock/steps-vibe-render.json`, seeded from
    the blind c03): open_project bound, `render_report` answered in 4 s (it hung 240 s before), and `drive_page`
    described its steps.
  - **New kit finding, not a lab fault:** pages with a route parameter make `render_report` say "NOT DONE … Fix
    them", though nothing is broken (bug P112-OWN026-ROUTEPARAMNOTDONE). It's the same kit the DeepSeek lab used;
    drive_page can reach them by tapping.
  - **Set aside as `*.blind-norender`:** NodeGX t1, c01–c04 (rounds and grades).
  - **The re-run:** NodeGX chain restarted from the build (pid 55920, `--max-usd none`, NodeGX lock). Code and
    harness stay paused until 1 Nov. The credit was about €49 at the pause; a round that starts after it runs out
    stops the series through the zero-token guard.
- **2026-10-25 ~21:00 CET — FINISHED: the Vibe credit ran out.** t2-nodegx-c07 got `402 Vibe budget exhausted` 24 min
  in. It was graded as it stands (22/29); its French checks fail because French was never built. c08 then started
  with no tokens and the guard stopped the series. Final, checks passed:

  | | build | c01 | c02 | c03 | c04 | c05 | c06 | c07 | $ (graded rounds) |
  |---|---|---|---|---|---|---|---|---|---|
  | code | 1/22 | 1/15 | 1/17 | 19/19 | 21/22 | 24/25 | — | — | 4.31 |
  | harness | 19/22 | 13/15 | 15/17 | 17/19 | 20/22 | stalled | — | — | 17.90 |
  | nodegx (re-run) | 18/22 | 13/15 | 14/17 | 16/19 | 17/22 | 19/25 | 20/27 | 22/29* | 53.92 |

  Common ground, build to c04 (95 checks): harness 84 (88%) for $17.90; nodegx 78 (82%) for $36.05; code 43 (45%)
  for $3.52, all of code's misses up to c02 being one CSS overlay bug. c03–c04 (41 checks): code 40, harness 37,
  nodegx 33. NodeGX's persistent failures:
  - C2.1: number-pad digits #FFF on #FAF5FF, about 1.05:1, and the hidden small pad pushes the big one below the
    fold;
  - F6: the game doesn't stop at Neptune;
  - T7, C5.2, C5.3: `TableStat` has ACL null, so any session reads and overwrites every family's answer history;
  - C4.1, C4.2: star counts don't refresh on Play or after Buy.

  Harness: F6 (planets through moons) and T6 (a child reaches the grown-ups page) every time. Spend: graded rounds
  $76; set-aside at least $53; grades $57. Report: https://claude.ai/artifact/4gPycBS2RZPWKZfnaCQAno (v4).

## 7. Watering Can: Large 4.0 on Vibe 3.0.4, a full-stack app for Studio (pre-registered 2026-11-02 ~23:00 CET)

**Richard, 2026-11-02:** *"make sure we're on the latest build of Large 4, bring our harness up to date with the latest
Vibe version, make sure our kit is well adapted to Vibe and Large 4, and make a full stack app like the plant watering
app we made there to test the NodeGX Studio."* Not a re-run of §4's arms: one NodeGX round, today's product, whose app
is then opened in NodeGX Studio (as Greenhouse, STU-091, was) to see what Studio makes of an app Large 4 built.

- **Model:** `mistral-large-4` = `mistral-large-4-0` ("Mistral Large 4.0", 1,048,576 context) on api.mistral.ai's model
  list, 2026-11-02. Vibe 3.0.4's routed catalogue offers the same model as `mistral-large-4-0-3`; the kit keeps its own
  entry (it serves API keys as well as the Vibe plan).
- **Harness:** Vibe 3.0.4 (`LAB/vibe-3.0.4`; round-vibe.mjs `--vibe 3.0.4`). Measured on mocks + one real ping: sends no
  `max_tokens` (VIBEMAXTOKENS can't recur), MCP tools as before (`search_tool_functions` + `run_typescript`),
  `enable_subagents = false` now honoured, `read_file` on a PNG returns bytes as text. Lab fix: the user layer no
  longer names `active_model` without its entry (it logged a false "running Mistral Medium 3.5").
- **Kit:** `kits/VIBE304-ff68fa845` (README there): create-nodegx from 43a02f29a (supports_images, thinking medium,
  sub-agents off, long answers by `section`), @nodegx/mcp 0.2.9 + ff68fa845's two lines (P112-OWN026-VIBEBLINDSHOTS:
  the Vibe arm saw no screenshot in §6's rounds), preview 0.2.8.
- **Request:** `request-watering-can.txt` (Greenhouse's surfaces in a person's words: sign-in, private rows, two fixed
  lists, a page about one record, a history list, shared styles, a db-change workflow, an 08:00 schedule, demo data).
- **Run:** `round-vibe.mjs /Users/Shared/nodegx-lab/own026/mistral/wc-nodegx-1 request-watering-can.txt --arm nodegx
  --kit-dir …/VIBE304-ff68fa845 --vibe 3.0.4 --max-usd none --continues 2` (120 min a sitting, 30-min stall watch,
  Haiku relay). No grader: the reading is Studio's, plus round.json's $ / steps / cache and the screenshots it took.
- **Then Studio:** open a COPY of the app (P123-STU-COPYADOPTS: own backend) in NodeGX Studio, drive every tab
  (Design, Data, Styles, Workflow, Backend, Privacy, Map), and file what Studio gets wrong as P123 rows.

## 8. What happened in §7 (dated entries only)

- **2026-11-02 22:44–23:22 CET — the round:** one sitting, Haiku judged it DONE. 2,328 s, 228 steps, $4.90 at list
  price (Vibe's reading the same). 1.07M fresh input, 19.3M cached (95%), 179k output. 0 sub-agents, audit clean.
  It called 331 server tools through `call_tool` (96 `drive_page`, 52 `get_component`, 46 `update_component`,
  17 `create_component`, 5 `render_report`). **5 tool results carried a screenshot to the model.** §6's NodeGX rounds
  had none (VIBEBLINDSHOTS). The shell read spilled answers in `tool-results/` 29 times (c05 had 38 of 104).
  What it built: 4 pages + 4 components, 2 option sets (Rooms, Looks: 6 each), plants + waterings private to their
  maker, 3 cloud functions (Water plant; Mark thirsty daily → Set thirsty if due), the 08:00 schedule trigger,
  6 look illustrations, a demo account with six plants (two thirsty, Fernanda watered twice). It found and closed
  its own privacy hole (find/get were "authenticated"; a second account saw the plants) and proved it with that account.
  **Not as asked:** "when a watering is saved, the backend updates the plant" is a cloud function the page calls,
  not a workflow on a db-change trigger (the request did not say which). The demo plants were imported straight into
  the backend, though its last message says they were "seeded … through the UI". Room, look and a watering's plant
  are Text fields, tied to no option set or record.
- **2026-11-02 ~23:30–00:10 CET — NodeGX Studio on a copy** (Studio worktree at 0872094, not the peer's open edits;
  copy of the app + its backend under the scratchpad; NODEGX_BACKENDS_DIR there, so Studio adopted the copy).
  **Studio read the app well:** 4 pages and 4 reusable components in Design; Logic on this page named Home's 4
  workflows and its query; Backend tab: the 08:00 trigger with "last run 14 minutes ago: it worked", the 3 functions
  with who calls each; Data: types with field counts, Privacy (plants/waterings "Only the person who made it", 3
  accounts), App data (11 plant rows, local times), Option sets (Rooms, Looks, 6 each), the Map. Styles shows only the
  3 element styles the build made (Button, Text Input, Dropdown); its look lives in tokens.
  **Found:**
  - P123-STU-SIGNINSTALE (Studio, medium): signed in through Use the app, Design's Home said "No plants yet" for the
    demo account until a reload; then it drew all six cards.
  - P112-OWN026-UNDEFINEDTABLE (runtime + backend, medium): opening a Plant page during the round made an empty
    table `undefined` (22:13:15 UTC, `drive_page` call 303). Studio lists it as a type, and its rule is
    "Anyone signed in". On a copy, a plain read of an unknown class created the table.
  - The app's own defects, missed by its checks: signed in, the first screen is blank at 1920×1080. The 100 vh
    sign-in gate stays in the layout because the build hid its inner group with Visible, not Mounted (the
    kit's port text says Mounted removes it; Visible "leaves its space behind"), so Home starts at y≈1,115. Its
    proofs read the page's text, which is there off-screen. The header's Sign out button stretches across the row.
  Shots: scratchpad `drive/shots/` of session ef5e3b48 (design-home-signedin-reloaded.png, preview-app-signedin.png, tab-*.png, data-*.png).
- **2026-11-03 ~09:40 CET — Richard's four notes, from his own Studio on a copy (~/wc):** (1) signed in through Use the
  app and on to New plant, Workflow listed no workflows and, with Use the app off, nothing could be clicked, until another
  page was picked and New plant again. Studio followed the app's page only for 3 s after a build, so it stayed on Sign in
  (P123-STU-NAVNOTFOLLOWED, high, fixed: Studio follows every Router page change). (2) A screen-tall blank above every page:
  the app's 100 vh gate, above, which no render check names (P112-OWN026-BLANKFIRSTSCREEN, kit). (3) Sign out fills the
  header row: the app's Content Height + default 100% width in a row, unwarned (P112-OWN026-BUTTONFILLSROW, kit).
  (4) Styles listed three styles with blank names: Mistral's variants have no name, which makes each its type's default,
  and Studio printed the missing name (P123-STU-UNNAMEDSTYLE, fixed: "Default Button", read-only name).
