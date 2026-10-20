# OWN-020 — Three harnesses

**Opened 2026-10-15** (Richard: *"I'd be interested in trying Cline and OpenCode with those 3 models as a test … 12
building one landing page each and one quiz app each, fixing bugs as we go. Then we can claim compatibility with
Vibe, OpenCode and Cline, pretty cool."*). Lane 5 of the board (cheaper models). It's a task here, not a new phase,
because the board says a lane uses the phase it already has.
**Depends on:** OWN-019 (its kit, the Vibe profile's teaching, the lab, the quiz and Launch graders, which are proven
on mutants); OWN-018 (the OpenCode arm, `round-opencode.mjs`, and the zero-cost mock method); **Richard's ClinePass**
($9.99 a month) and its API key in the repo `.env` as `CLINE_PASS_API_KEY`. Richard adds that line himself; the key is
never pasted into a chat.
**Status (2026-10-19 night): AC2 built, not yet released: `create-nodegx --cline` + `create-nodegx-cline` (§12, "the Cline kit"), 34/34 tests, a zero-cost mock round on the packed kit; it ships with the 0.2.4 cut. Not done for "works with Cline": AC6, AC7 (the 0.2.4 cut, published), AC8. AC5 for Cline met 2026-10-20 (R48: DeepSeek V4.1 Flash, quiz and Launch twice each); OpenCode's AC5 still open. Earlier: 🟡 s1 done 2026-10-15: AC1 ✅. Both harnesses × all three models pass the smoke (6/6, finished by themselves, 55–153 s); the Cline seal (a plugin + disabledTools) proven on a scripted mock; `own-020/round-cline.mjs`, `round-opencode.mjs --provider clinepass`. R41–R43 ruled (§10). First quota reading: 3 smokes = 10% of the 5-hour window. Next: the first real round (calibrates quota per round), then the kits (R41: `--cline`, `--opencode`). Details: §12.**
**Model:** Opus for the sessions that build the kit and read the rounds. The agents under test: **MiMo-V2.6 Pro (R46, replacing Kimi K3), GLM-5.3 and
DeepSeek V4.1 Flash on ClinePass** (V4.1 Flash replaced V4 Pro, R44), in **OpenCode** and in **Cline CLI**, each pinned per round.

## 1. The person sentence

> **Someone who already pays for ClinePass runs `npm create nodegx` (or the Cline kit), starts OpenCode or Cline in
> that folder and says what they want in a paragraph. An open-weight model builds a NodeGX app, checks it in a
> browser against their own words, and reports line by line what works, with nobody else in the loop.**

Then nodegx.io can say **"Works with Claude Code, Mistral Vibe, OpenCode and Cline"**, and every one of those words
is backed by a graded round.

## 2. Why

- **The claim.** Today it's backed for Claude Code (every phase) and for Vibe with Large 4 (OWN-019: quiz 12/12 ×3,
  Launch 17–18/19). OpenCode has one result: Large 4 got 12/12 on the quiz (OWN-018 runs 9 and 10), on a kit written
  for Claude, before the process kit existed. Cline has none.
- **The price.** ClinePass is $9.99 a month, flat, for open-weight models at 2–5× the usage an API key would get. If
  one of these models builds the quiz and Launch, NodeGX has a $10 route beside Vibe's €20.
- **The kit, read by more strangers.** Every agent so far found defects the others missed (DUPCHILD was Sonnet's,
  SAMEVALUE and CARRYOVER were Large 4's). Six new agent pairs will find more, and each fix helps every agent (R29:
  what helps every agent goes in the core).
- **A comparison already exists, so this isn't R36 again.** In OWN-019 s4, GLM-5.3 (served by Mistral, in Vibe) got
  the quiz 12/12 and Launch 12/17, and R36 dropped it to keep that series on Large 4. Here the question is different:
  does each *harness* work, and with which model. GLM-5.3 in three harnesses also shows how much of a score is the
  harness and how much is the model.

## 3. The matrix: 12 rounds, then repeats

| harness ↓ / model → | MiMo-V2.6 Pro (`cline-pass/mimo-v2.6-pro`, R46; was Kimi K3) | GLM-5.3 (`cline-pass/glm-5.3`) | DeepSeek V4.1 Flash (`cline-pass/deepseek-v4.1-flash`, R44; was V4 Pro) |
|---|---|---|---|
| **OpenCode** (1.19.0 as in OWN-018, unless s1 finds a reason to move) | OKQ · OKL | OGQ · OGL | ODQ · ODL |
| **Cline CLI** (3.0.71, npm latest 2026-10-15) | CKQ · CKL | CGQ · CGL | CDQ · CDL |

Q is the quiz (`own-018/sentence-quiz.txt`, `grade-quiz.mjs`, 12 checks). L is Launch (`own-019/sentence-launch.txt`,
`grade-launch.mjs`, 19 checks: 11 behaviour, 8 look). Both graders are used as they are; the agent never sees them.

**Why these three models** (research 2026-10-15, mostly the model makers' own numbers, all within a point or two):
- **Kimi K3** is level at the top on DeepSWE and Terminal-Bench 2.1, and it's the only one that reads images, so
  `render_report`'s screenshots reach it.
- **GLM-5.3** leads clearly on the long, hard Terminal-Bench 3.0 (28.3 vs 17.4). It reads text only, so it uses the
  screenshot-free `drive_page` look read that OWN-019 built.
- **DeepSeek V4.1 Flash** (R44, replacing V4 Pro): ahead of V4 Pro 0813 on Terminal-Bench 2.1 (90.6 vs 87.9) and DeepSWE (74.2% vs 62.7%) in DeepSeek's own, unverified figures; about a quarter of V4 Pro's market cost per token (one call each, 2026-10-15), so likely less quota per round; free in Cline Desktop, so a pass supports "free in Cline". Text only. V4 Pro's two smokes stay on record (§12).

Not now: Qwen3.8 Max (weakest on every coding result found), MiMo, MiniMax M3, Muse Spark. The Flash models are a
later control if the money table wants a cheap row.

**Baselines on the same graders:** Vibe + Large 4 (OWN-019 s5), Vibe + GLM-5.3 via Mistral (OWN-019 s4), OpenCode +
Large 4 (OWN-018 runs 9 and 10, quiz only).

## 4. The kits

- **OpenCode: the core kit first.** `create-nodegx` already writes `opencode.json` (the server, approvals, a Large 4
  provider). For ClinePass the person adds a provider block for Cline's OpenAI-compatible endpoint the way OpenCode's
  docs show (the lab writes it as the person would, as OWN-018 did). Run the core kit as it ships. If the first
  rounds show the misses that the Vibe profile's teaching fixed (no checklist, no drives, a text reply that ends the
  run), lift the shared teaching into the core rather than writing an OpenCode profile. Measure first whether
  OpenCode reads project skills (`.agents/skills`, `.claude/skills`).
- **Cline: a profile, R29's shape.** `create-nodegx --cline` writes `profiles/cline/`, and a thin `create-nodegx-cline`
  is made at publish (Q1). What the Vibe kit does, mapped onto Cline's equivalents:

| Vibe kit | Cline | known? |
|---|---|---|
| `.vibe/config.toml`: the server for this folder only | MCP is configured in **one global file** (`~/.cline/data/settings/cline_mcp_settings.json`, `CLINE_MCP_SETTINGS_PATH` overrides it). The docs name no project MCP file. | **s1, from source.** The kit must not write the global file (`create-nodegx` never touches global agent settings) |
| every nodegx tool approved | `autoApprove: [...]` on the server entry; `--auto-approve` is on by default when headless | docs |
| `AGENTS.md` | read at the project root (listed as "legacy" beside `.clinerules/`) | s1 |
| three skills in `.vibe/skills/` | `.cline/skills/<name>/SKILL.md`, the same format | docs |
| `hand-over.mjs` (before each tool call; deny with a reason) | a TypeScript plugin: `beforeTool` returns `{ skip: true, reason }`; project plugins go in `.cline/plugins/` | s1: does a project plugin load without `cline plugin install`? |
| `--legacy-harness` (so the model sees the server's error text) | ? | **s1**: does an MCP `isError` result's text reach the model? |
| tools that arrive after `open_project` (`tools/list_changed`) | ? | **s1.** If the list doesn't refresh, `call_tool` carries it, as in Vibe |
| `--profile vibe` on the server | `--profile vibe` as it is; a `cline` profile only for sentences that fit Cline worse | census in s2 |

## 5. The lab

- **`round-cline.mjs`** (new), the same rules as `round-kit.mjs` and `round-opencode.mjs`: an empty HOME (`CLINE_DIR`
  and `CLINE_DATA_DIR` inside it, so Richard's own `~/.cline` is never read; it holds his Large 4 settings and two MCP
  servers), the kit from tarballs packed at HEAD, `cline@3.0.71` through npx (his global 1.0.8 install is left
  alone), `--json` captured, the stall stop, a step cap, and `command.txt` saying which key was used (never its value).
- **The seal is s1's biggest unknown.** Headless Cline approves everything by default, including `execute_command`, so
  without a seal the agent can leave the folder. Measure before any paid round, against a scripted OpenAI-compatible
  mock (OWN-018's no-cost method): which `autoApprovalSettings` (read/edit outside the folder, safe/all commands,
  browser, web fetch) turn off which tools, and whether a refused action ends a headless run (as in Vibe `-p` and
  `opencode run`) or comes back as a tool error.
- **`round-opencode.mjs`** gains `--provider clinepass --model <slug>`; nothing else changes.
- **Money is a flat fee, so the cost column becomes quota.** Record the share of the 5-hour, weekly and monthly caps
  each round uses (from the Cline dashboard, or an endpoint if one exists; s1), plus minutes, steps and tokens.
  Twelve rounds of 45–75 minutes is about 12 hours of model time; the 5-hour window may decide how many fit in a day.
- **One heavy job at a time.** Rounds and grades run one after another, never beside OWN-019's series or a peer's
  `test:ci` (memory: one heavy job).

## 6. The method

- Quiz first across all six pairs (the simpler app tests the plumbing), then Launch. Rotate the models so no single
  model's cap decides the order.
- **Fix bugs as we go:** every defect goes into `dev-docs/bugs/` as one file per bug (`p112-own020-…`,
  `node scripts/bugs.js`) when it's found. Kit, server and runtime fixes go in the core when they help every agent,
  with a test that fails without the fix. After a fix that touches a cell's path, re-run that cell. The table keeps
  every attempt.
- Read a round's red before believing it (OWN-019's habit). Find out whether the cause is the grader, the lab, a cap
  (`length` or quota) or the model before it's counted. A quota stop is the lab's, not the model's.
- Each round records: the kit tarball, harness version, model slug, thinking level (the harness default unless a
  lever says otherwise, one change at a time), grade, how it ended, minutes, steps, quota, drives, and whether its own
  report agrees with the grader.
- **A model is withdrawn mid-series** (ClinePass has already retired GLM-5.2, Kimi K2.6, Kimi K2.7 Code and DeepSeek
  V4 Flash since launch): record it, ask, never swap silently.

## 7. Acceptance

- **AC1: plumbing.** Both harnesses reach all three models on the ClinePass key from a sealed lab. Six smokes: the
  NodeGX server is bound, `get_project_info` answers, nothing outside the folder is touched, and the seal is proven by
  a mock round where a forbidden read is refused and the run goes on.
- **AC2: the Cline kit.** `create-nodegx --cline` (from a tarball) writes the Cline files, and a test proves they land
  and that nothing global is written. If Cline has no project MCP file, the measured route (a project
  `CLINE_MCP_SETTINGS_PATH`, a launcher, or a documented one-time `cline mcp add`) is put to Richard (Q2) before it
  ships.
- **AC3: the twelve.** Every cell in §3 run at least once and graded, in one table, each red read and attributed.
- **AC4: fixed as we went.** Every defect filed. Every fix has a test and the list of cells it re-ran.
- **AC5: compatible, per harness (Q3).** For each of OpenCode and Cline, at least one model passes **both** briefs
  **twice in a row** on one kit version: quiz 12/12, Launch with all 11 behaviour checks passing and at least 17/19
  overall (the bar Vibe + Large 4 met), finished by itself, no intervention.
- **AC6: Richard's own, last.** He opens Cline (Desktop or the CLI) in a folder the kit made, asks in his own words for
  one of the two apps, and we grade it. This is the check that a person gets the same result the lab does.
- **AC7: shipped.** The Cline kit and any core fixes published to npm (publishing is Richard's step, R11).
- **AC8: the claim.** The round table, the best pair per harness with its numbers, quota per app, the open defects,
  and the exact words for nodegx.io and the changelog ("Works with …", each harness with its model). The words go
  through the content-authoring skill, and Richard rules yes or no.

## 8. Sessions, planned

- **s1, plumbing (smokes only):** Richard has put the key in `.env`. Read the endpoint's base URL and the CLI's ClinePass
  provider id. Read `cline@3.0.71`'s source for: a project MCP file, refused actions when headless, `list_changed`,
  MCP error text, AGENTS.md and skills loading, project plugins. Run the mock round for the seal. Build
  `round-cline.mjs` and add `--provider clinepass` to `round-opencode.mjs`. Run the six smokes. Answers go in §9.
- **s2, the Cline profile:** the census (the Vibe-variant sentences, each labelled shared, Vibe-only or needs a Cline
  variant), `profiles/cline/`, `create-nodegx --cline`, the test, and the tarball.
- **s3–s5, the twelve:** quiz ×6, then Launch ×6, fixing between rounds; then the repeats AC5 needs.
- **s6, the claim:** AC6 with Richard, AC8's write-up, and publish (Richard).

## 9. Measured before scoping (2026-10-15)

- **ClinePass:** $9.99 a month (a promo first month); 5-hour, weekly and monthly caps with no published numbers;
  model ids `cline-pass/<model>`. The current list (docs; the marketing page still shows retired models): GLM-5.3,
  GLM-5.3 Flash, Kimi K3, DeepSeek V4 Pro, DeepSeek V4.1 Flash, MiMo-V2.5 / V2.5-Pro, MiniMax M3, Muse Spark 1.3
  Contributor, Qwen3.8 Max, Qwen3.7 Max / Plus. **The key works outside Cline** through an OpenAI-compatible Chat
  Completions endpoint, and the product page says it can be used "with other coding agents". That's what makes the
  OpenCode arm possible.
- **Cline:** CLI 3.x runs on the Cline SDK (the CLI, Desktop and VS Code extension share it since 2026-09-02). Headless
  mode: `--json`, `-P` provider, `-m` model, `--thinking none|low|medium|high|xhigh`, `--compaction
  agentic|basic|off`, `-c` folder, `--auto-approve` (default true), `-t` timeout. Cline Desktop launched 2026-09-14
  (macOS, Windows beta; Linux beta 2026-09-30). The February `cline@2.3.0` was a stolen-token publish (fixed in 2.4.0,
  and publishing moved to OIDC), so the lab pins an exact version.
- **This Mac:** `/opt/homebrew/bin/cline` is CLI **1.0.8** (December 2025, from before the SDK). `~/.cline` holds
  Richard's own settings (act model `mistralai/mistral-large-4-0` via the Cline provider; MCP servers `speak-tts`,
  `brain`). The lab reads neither.

## 10. Rulings to ask (plain words)

- **R41 (was Q1), ruled 2026-10-15: own names, both of them.** `npm create nodegx-cline` **and** `npm create
  nodegx-opencode`, each a thin package over the core with its own profile (R29's shape). Richard: *"Yep I reckon it
  should, opencode too."* So OpenCode gets a profile as well (`profiles/opencode/`, `create-nodegx --opencode`). The
  core kit is still run first in OpenCode as the baseline, so the profile has to earn its place.
- **R42 (was Q2), ruled 2026-10-15: yes.** If Cline reads MCP servers only from the home folder, the Cline kit may add
  one `nodegx` entry there, never replacing an entry already present. A per-folder route is still preferred if s1
  finds one.
- **R43 (was Q3), ruled 2026-10-15: yes.** "Works with" = AC5: the best model per harness passes both apps twice in a
  row on one kit version.
- **R44, ruled 2026-10-15 (Richard: "Yes please"): DeepSeek V4.1 Flash replaces V4 Pro** in the matrix (switch, not
  add: still 12 rounds). Asked because V4.1 Flash looked like one of ClinePass's best models: ahead on the agentic
  benchmarks, roughly a quarter of the market cost per token, and free in Cline Desktop. A search claim that DeepSeek
  routes V4 Pro to V4.1 Flash was checked and doesn't hold on ClinePass (V4 Pro is served as `deepseek/deepseek-v4-pro`).
- **R47, ruled 2026-10-20 (Richard: "Yes, update its own"): the Cline kit may move its OWN entry to a newer release.**
  Re-running `npm create nodegx-cline` updates a `nodegx` entry marked `metadata.writtenBy: "create-nodegx"` to the
  new version; an entry without that mark (the person's own) is never replaced (R42). This is the behaviour `377d4d312`
  built, so nothing changes in the code.
- **R48, ruled 2026-10-20 (Richard: "1. Yep 2. Tep", read as yes to both): AC5 for Cline is met by DeepSeek V4.1 Flash.**
  (1) tgz35 → the 0.2.4 candidate counts as one kit version for AC5 (the same core note and server; the candidate adds
  the Cline kit and element styles). (2) A pass through the lab's retry tap counts. So DeepSeek on Cline has the quiz
  twice in a row (CDQ1 12/12, CDQ4 12/12) and Launch twice in a row (CDL1 17/19, CDL2 18/19, every behaviour check ✓
  in both). AC8's words must still say what the retry hides: on ClinePass today, a 90 s silence ends Cline's run (CDQ4's
  request 017), and two quiz sittings died on ClinePass's in-band stream error (CDQ2, CDQ3). OpenCode's half of AC5 is
  still open (quiz only so far: OKQ1, ODQ1; no Launch).

## 11. Risks

- **Quota stops a round partway.** Mitigation: read the caps in s1, plan rounds around the 5-hour window, and record a
  quota stop as the lab's, not the model's.
- **No seal for Cline headless** (if a refused action ends the run, or commands can't be turned off). Mitigation: the
  mock first. If there's no seal, run Cline rounds in a throwaway user account or VM, never on this checkout's user.
- **The models churn.** Mitigation: pin the slugs, record any withdrawal, and ask before swapping.
- **Tuning to two apps.** The quiz and Launch are the claim's apps. Pack It (OWN-019 AC5) is a third brief if a pair
  looks suspiciously good.

## 12. Sessions

- **s1 (2026-10-15, Opus), the plumbing.** Richard put `CLINE_PASS_API_KEY` in `.env` and ruled R41–R43.
  - **The endpoint, measured:** `https://api.cline.bot/api/v1/chat/completions`, `Authorization: Bearer`. All three
    slugs answer and call a tool. **Streamed** responses are standard OpenAI SSE (`choices`, tool-call deltas,
    `[DONE]`, usage at the end); **non-streamed** ones are wrapped in `{ data, success }`, so a client that reads a
    plain completion would see nothing. Usage carries `market_cost` per request, so a round gets a "what this would
    cost at market price" figure even on a flat fee. Kimi K3 and GLM-5.3 are routed to `private/k3-contributor` and
    `private/glm-5p3-contributor`; DeepSeek V4 Pro goes to `deepseek/deepseek-v4-pro`. **Open:** what "contributor"
    means for data. Cline's docs don't say, and a third-party README claims a contributor tier may train on prompts.
    That's fine for these test apps; it must be answered before nodegx.io says anything about privacy.
  - **Cline CLI 3.0.71:** postinstall only links the platform binary and sets aside a running hub's discovery record;
    the package was published with SLSA provenance. The CLI is a compiled binary; `@cline/core` etc. ship as bundled
    JS. The provider id is `cline-pass`. It runs a hub daemon (port 25463) and updates itself in the background, so the
    lab isolates both (§5).
  - **`round-opencode.mjs --provider clinepass --model cline-pass/<m>`** (additive): the key from `.env`, a
    `cline-pass` custom provider (`@ai-sdk/openai-compatible`, 128k context, 32k output, image input on Kimi K3 only)
    added to the kit's `opencode.json`, and the OWN-018 seal unchanged.
  - **OpenCode smokes (`smoke-hello.txt`, kit tgz35 = npm 0.2.2's contents, OpenCode 1.19.0): 3/3.**

| pair | exit | steps | tools | cached | "Hello there" in the graph | its own words |
|---|---|---|---|---|---|---|
| OpenCode + GLM-5.3 | itself, 56 s | 9 | 9, one write refused and fixed | 81% | ✓ | "render verified … I couldn't view the screenshot myself (this model doesn't accept image input)" |
| OpenCode + Kimi K3 | itself, 82 s | 8 | 10 | 57% | ✓ | "verified by rendering it at three viewport widths" |
| OpenCode + DeepSeek V4 Pro | itself, 55 s | 10 | 11 | 84% | ✓ | "rendered clean across desktop, tablet and phone" |

  All three: `create_project` → `get_project_info` through `call_tool` (the bootstrap path) → read → write →
  `render_report`, with no prompting. The server's refusal text reached GLM-5.3, which read it and fixed its write.
  - **The quota, first reading (Richard, 2026-10-15 evening, from the Cline dashboard):** after the three OpenCode
    smokes and six one-call probes (~0.9M input tokens, 57–84% cached; ~4k output): **5-hour 10%, weekly 4%,
    monthly 2%.** If a real round is 10–20 smokes' worth, that's about 2 rounds per 5-hour window, 5–7 a week and 15–30
    a month: the 12 + repeats (~18–20 rounds) take about three weeks and most of a month. **Unmeasured:** to be read
    before and after the first real round. The method from here: Richard reads the three bars before and after each
    round, as with Mistral's console, and the table gets a quota column.
  - **Cline 3.0.71's source, read (subagent; `scratchpad/cline-source-findings.md`).** It changed the lab:
    - No project MCP file exists. The one file is `CLINE_MCP_SETTINGS_PATH`, else
      `$CLINE_DATA_DIR/settings/cline_mcp_settings.json`, and `autoApprove` is silently dropped. So R42 applies: the
      Cline kit writes one `nodegx` entry there.
    - `tools/list_changed` is never handled. Tools are listed once, as `nodegx__<tool>`, so `call_tool` carries the
      rest, as in Vibe.
    - An MCP result reaches the model as JSON text (so `isError` text is seen; images arrive only as base64 text), cut
      in the middle past **8,000 characters**. Only the env var `CLINE_MESSAGE_BUILDER_MAX_TOOL_RESULT_CHARS` raises
      that, so the kit can't, and `get_node_type`/`get_component` results may be cut. That's a lever to measure.
    - The MCP connect timeout is 10 s unless the entry sets `timeout`.
    - Headless approves every enabled tool, and **`read_files`/`editor` accept absolute paths anywhere**. There is no
      workspace setting, and file hooks can only cancel the whole run, so the seal is a **plugin** (`beforeTool` →
      `{ skip: true, reason }`, `$CLINE_DIR/plugins/seal.js`) plus `disabledTools` (`run_commands`,
      `fetch_web_content`, `spawn_agent`, `ask_question`, `team_*`) and `tools.web_search.enabled = false`.
    - The plugin fails open (a throw or >3 s lets the call through), so the runner audits every tool input afterwards.
      Skipped calls count toward `--retries` (3 all-failed turns abort the run with exit 0), so the lab passes 5.
    - **Exit 0 isn't success**: the round reads `run_result.finishReason`. There's no step cap (only `-t`).
      `ask_question` answers itself with its first option when there's no TTY. Compaction fires at 90% of the
      catalog's window (1,048,576 for all three), and `max_tokens` is ~283k for Kimi K3 and GLM-5.3, ~115k for
      DeepSeek V4 Pro.
  - **`own-020/round-cline.mjs`** (new) and **`own-020/mock-model.mjs`** (a scripted OpenAI-compatible model;
    `--base-url` points Cline at it).
  - **The seal, proven at no cost (`cl-mock1`):** `/etc/hosts` → skipped with the reason, the run goes on; a `../`
    escape → skipped; `AGENTS.md` (inside, relative) → read; an outside write → skipped, no canary on disk; an inside
    write → written; `nodegx__list_examples` → answered; `run_commands` → never offered, the call rejected, the run
    goes on; finish `completed`. The audit names exactly the four planted escapes (control arm) and is clean on all
    three real smokes. AGENTS.md is in Cline's system prompt; the tools offered are `skills, read_files,
    search_codebase, editor` + the seven bootstrap `nodegx__*`.
  - **Cline smokes (`smoke-hello.txt`, tgz35, Cline 3.0.71, harness defaults): 3/3.**

| pair | finish | iterations | tools | input (cached) | seal | "Hello there" in the graph |
|---|---|---|---|---|---|---|
| Cline + GLM-5.3 | completed, 65 s | 12 | 15 | 336k (45%) | clean | ✓ |
| Cline + Kimi K3 | completed, 87 s | 10 | 13 | 247k (41%) | clean | ✓ |
| Cline + DeepSeek V4 Pro | completed, 153 s | 21 | 28 | 1.30M (48%) | clean | ✓ |

  Compared with OpenCode: the cache share is lower in Cline (41–48% vs 57–84%), and DeepSeek V4 Pro read files and
  searched the folder for a one-text page (1.3M input against 347k in OpenCode). Quota per round may differ by
  harness. GLM-5.3 sent `create_plan`, `stage_plan_operation` and `apply_plan` in one turn and still finished.
  Cline reports `totalCost: 0` on ClinePass, so market cost isn't in the log.
  - **AC1 ✅ (2026-10-15):** both harnesses reach all three models on the ClinePass key from a sealed lab; 6/6 smokes;
    the seal proven by the mock round. The OpenCode seal is OWN-018's, proven there.
  - **The gallery (Richard: "a directory thing like for Mistral where I can see the progress of different attempts and
    preview them myself"):** `GALLERY=own-020 node own-019/gallery.mjs add|serve|stop|list` (an additive switch on
    OWN-019's script: its own folder `~/vscode_projects/NodeGX test projects/OWN-020 ClinePass apps/`, **index
    http://localhost:4900**, apps from 4901). `add … --live` serves a round's app straight from its folder, watched,
    while the agent is still building ("● building"); re-run `add` without `--live` when the round ends to copy it out of
    the scratchpad. The six smokes are on it, and each was checked in headless Chrome to show "Hello there"
    (`scratchpad/shown-text.mjs`, CDP on a private port). Gotcha: six previews installing into a fresh npm cache at once
    raced (`ENOTEMPTY`); a second `serve` with the cache warm brought them all up.
  - **Quota, second reading (Richard, after the three Cline smokes):** 5-hour 17%, weekly 6%, monthly 3%. The Cline
    smokes cost ~7% / 2% / 1%; the OpenCode smokes plus probes cost ~10% / 4% / 2%. **OKQ1 starts at 17 / 6 / 3.**
  - **R44:** DeepSeek V4.1 Flash replaces V4 Pro (§10). Its slug answers (`cline-pass/deepseek-v4.1-flash`; the
    hyphenated `-v4-1-` is a 404).
  - **OKQ1, the first real round (OpenCode 1.19.0 + Kimi K3, the quiz, core kit tgz35, 128k context, started at
    17 / 6 / 3% quota): 12/12, carryover flash, STOPPED BY THE 5-HOUR LIMIT.** 53 min, 67 steps, 82 tool calls,
    input 550k + 3.42M cached (86%), output 54k + 51k thinking. Then a 429: *"You have reached your 5-hour Clinepass
    limit. The limit resets in 3h 5m"*, mid final playthrough. **One Kimi K3 quiz round used the 83% of the 5-hour
    window that was left, and still wasn't finished.**
    - What it did: create → reads → `set_style_preset` → a plan of 7 staged operations (2 refused and fixed) → apply →
      render → 30+ `drive_page` checks. It found its own "answer revealed on the first frame" bug through drives,
      tested theories one at a time ("I need facts about the actual first-frame DOM instead of theories"), fixed it
      and reverted its probe. No checklist file, no line-by-line report: the quota cut it off before any report.
    - The grade (`grade-quiz.mjs`, packed preview): **12/12** (start, order, timer, green, advance, red, timeout,
      score, best, again, keep, reload), validate 0/0, 65 nodes, an AnswerButton component with Component Inputs,
      best score in localStorage. **Observed carryover:** the last question's colours flash on the next question's
      answers, which is the bug it was fixing when the quota stopped it (fix in the graph, never re-driven).
    - Kit candidates (not filed yet; to see if other models repeat them): three `drive_page` shape errors (`wait_for:
      {text_contains}`, an unknown `read` key, a step naming no action). Each refusal named the right shape, and it
      recovered from each.
    - The gallery: OKQ1 at :4907, graded.
  - **Quota after OKQ1 (Richard, 2026-10-16):** 5-hour 0% (reset), **weekly 40%, monthly 20%**. So OKQ1 cost **34% of
    the week and 17% of the month**: about 3 Kimi K3 rounds a week, 6 a month. Priced at market rates (Cline's catalog
    has Kimi K3 at $3 / $15 / $0.30 per M input / output / cached; ClinePass's own per-call `market_cost` came out at
    about double that), OKQ1 was worth about $4–8.50. So the allowance is roughly $25–50 of market value a month for
    $9.99: the advertised "2–5×". It's cost-weighted, and **Kimi K3 is ClinePass's priciest model** (~40× GLM-5.3 and
    ~4× V4.1 Flash on identical tiny calls). A NodeGX build is context-heavy: ~59k tokens re-read per step × 67 steps.
  - **R45, ruled 2026-10-16 (Richard): the limits are a result, not an obstacle.** *"Don't worry about limits, if we hit
    them the Clinepass test has ended with a result of 'the limits aren't high enough'."* Next round: OpenCode +
    DeepSeek V4.1 Flash on the quiz (ODQ1), from 0 / 40 / 20.
  - **The double tap (Richard on OKQ1):** "if you click an answer in the quiz, then quickly click another one, it shows
    both answers highlighted before moving on". `grade-quiz.mjs` now plays it after the 12 checks as an OBSERVED
    `doubletap` (not scored, so the series stays comparable). On OKQ1: Coimbra turns red after Porto (second tap
    coloured), and Sydney-then-Canberra scores 0, so **the first tap is the one scored**. The first version read
    Canberra's colour too, a false positive (the right answer turns green after any wrong tap), so Q2 is read by the
    score alone. **Still owed: a clean control** (a quiz that locks after the first tap) from our own rounds.
  - **ODQ1 (OpenCode 1.19.0 + DeepSeek V4.1 Flash, the quiz, core kit tgz35, from 0 / 40 / 20%): 12/12, finished by
    itself in 13.5 min.** 47 steps, 70 tool calls, input 515k + 2.13M cached (81%), output 30k + 56k thinking. Plan
    of three components (AnswerButton refused three times for a missing Component Inputs, then fixed; Home once),
    apply, render, ~15 drives, a fix, a final report ("built and proven … green-600 background, white label, Score 1").
    Grade: **12/12**, validate 0/0, 40 nodes, AnswerButton and QuestionScreen components with Component Inputs, a
    `Javascript2` engine (setInterval, setTimeout, localStorage). **Double tap: clean**, which is the control the
    check owed (OKQ1 flags, ODQ1 clean). **Carryover: the flash**, as in OKQ1.
  - **Kit fix, confirmed by two models:** both Kimi K3 and V4.1 Flash wrote `drive_page` `wait_for: { text_contains }`.
    The server should accept it as `text` (or the tool description should lead with `text`). V4.1 Flash also wrote
    `viewports` for `viewport` (the server's "did you mean" fixed it at once).
  - **Quota after ODQ1 (Richard):** 5-hour 1%, weekly 41%, monthly 20%. ODQ1 cost ~1 / 1 / 0 points against OKQ1's
    ≥83 / 34 / 17. Richard: *"Kimi can't be 20X more expensive than Deepseek. Something has gone wrong we need to
    investigate."*
  - **The investigation (`scratchpad/price-probe.mjs`: the same ~3.8k-token prompt cold then warm, per model, reading
    the gateway's `inputInferenceCost` / `outputInferenceCost` and `cached_tokens`). ClinePass's per-million prices:**

| model | input | cached input | output (incl. thinking) | route |
|---|---|---|---|---|
| Kimi K3 | $6.00 | $0.60 | $30.00 | `private/k3-contributor` |
| GLM-5.3 | $1.40 | $0.26 | $4.40 | `private/glm-5p3-contributor` |
| DeepSeek V4.1 Flash | $0.15 | ~$0.003 | $0.60 | `private/deepseek-v4p1-flash-contributor` |

    Repriced: **OKQ1 ≈ $8.50** (550k × 6 + 3.42M × 0.60 + 105k × 30), **ODQ1 ≈ $0.14** (515k × 0.15 + 2.13M × 0.003 +
    86k × 0.60), about 60×. Both fit one set of allowances in market value: **5-hour ≈ $10, weekly ≈ $25, monthly ≈
    $50** (OKQ1: the 83 points left of 5-hour, 34 weekly, 17 monthly; ODQ1: ~1.3%, ~0.5% → "40→41", ~0.3% → "20→20").
    **No hidden calls: every point is accounted for by price.** Cache did apply on Kimi (3,786 of 3,787 tokens cached on
    the warm call).
  - **The real finding: ClinePass's "market" price for Kimi K3 is double the going rate.** Cline's own catalog lists
    Kimi K3 at $3 / $15 / $0.30 elsewhere (vercel-ai-gateway, opencode-go), and ClinePass charges $6 / $30 / $0.60
    against the quota. So the advertised "2–5× the usage compared to standard API rates" is measured against an
    inflated reference: about 1–2.5× at the going rate for Kimi K3. For V4.1 Flash, $50 a month of market value is
    ~350 quiz rounds.
  - **Plan consequences:** a Flash round ≈ 0.5% of the week; GLM-5.3 ≈ $1.60 if it behaves like ODQ1 (≈ 6–7% weekly,
    16% of a 5-hour window); a Kimi K3 round ≈ $8.50 (3 a week, 6 a month). Kimi rounds are rationed.
- **R46, ruled 2026-10-16 (Richard): MiMo-V2.6 Pro replaces Kimi K3** (*"Let's drop Kimi and pick a different model
  around the GLM or Deepseek price"*; then *"Ok for Mimo"*). The line-up is now three open-weights models: MiMo-V2.6
  Pro, GLM-5.3, DeepSeek V4.1 Flash. OKQ1 (Kimi, 12/12, quota-stopped) stays as a reference result.
  - **The ClinePass list, live (2026-10-16; Richard: "it changes every day"):** the API
    (`GET /api/v1/ai/cline/recommended-models` → `clinePass`) has 14 models, two more than the docs page (**MiMo-V2.6
    Flash, MiMo-V2.6 Pro**). Measured charges (`price-probe.mjs`, salted for a cold call), per M input / cached /
    output: MiMo-V2.6 Pro ~$0.43 / ~$0.01 / ~$1–2 (estimated from totals: no breakdown returned); DeepSeek V4 Pro
    $1.32 / $0.044 / $3.96; Qwen3.8 Max $2 / $0.25 / $6; Qwen3.7 Max $2.50 / $0.50 / $7.50; Qwen3.7 Plus $0.40 / $0.08
    / $1.60; MiniMax M3 ~$0.30 / ~$0.06 / ~$1.20; MiMo-V2.6 Flash ~$0.14 / ~$0.003; GLM-5.3 Flash $0.15 / **no
    caching** / $0.50; **MiMo-V2.5 and V2.5-Pro $0 on every call**; Muse Spark 1.3 Contributor very cheap (Meta's, not
    open weights). The docs give Kimi K3 as **$3 / $15**, but it's counted at **$6 / $30**; the only hint is the API's
    own description ("reliability might be unstable and will consume usage faster than others"). That's a
    documentation issue to raise with Cline, and a line for the write-up.
  - **MiMo-V2.6 Pro:** open weights, MIT (published on Hugging Face as MiMo-V2.6-Pro-RL; several reports, model card
    not read), ~1.02T total / 42B active. Artificial Analysis Intelligence Index 46, the top open-weights model (GLM-5.3
    45, Kimi K3 44). Xiaomi's own figures: DeepSWE v1.1 71.9 (V2.5-Pro: 19.0), Terminal-Bench 2.1 89.9,
    Terminal-Bench 4.0 34.9.
  - **CDQ1 (Cline 3.0.71 + DeepSeek V4.1 Flash, the quiz, core kit tgz35, from 1 / 41 / 20%): 12/12, carryover CLEAN,
    double tap CLEAN, finished by itself in 20 min.** The first full build in Cline, and the first quiz with neither
    observed flaw. 41 iterations, 73 tool calls, `finishReason: completed`, seal audit clean (no skips). Tokens:
    **4.62M uncached + 4.21M cached (48%)**, 20.7k output. That's ~3× the input of the same model in OpenCode (ODQ1:
    2.6M, 81% cached). Cline's low cache share again (smokes: 41–48%). Priced at ClinePass's Flash rates ≈ $0.72
    (≈ 3% weekly, 1.4% monthly, 7% of a 5-hour window), a prediction to check against Richard's reading.
    Its route: reads of the folder (`read_files`, `search_codebase`) and many examples first, then `set_project_tokens`,
    a plan of 4 operations, apply, ~10 drives, `validate_project`, `write_project_doc`, and a line-by-line final report.
    Grade: 12/12, 58 nodes, 5 components (App router with Home, Quiz, Results pages), AnswerButton with Component
    Inputs, Timer + Repeat, Static Data for the questions, localStorage best, validate 0/0. Gallery :4909.
  - **Quota after CDQ1 (Richard):** 5-hour 3%, weekly 42%, monthly 21% (+2 / +1 / +1). That was lower than predicted,
    which exposed **a misreading of Cline's tokens: its `inputTokens` is the provider's `prompt_tokens`, which
    INCLUDES cached tokens** (`@cline/llms`: `inputTokens: … || prompt_tokens`). **Corrected:** CDQ1 = 4.62M input in
    total, 4.21M cached (**91%**), 0.41M uncached, ≈ $0.09 at market price (fits the bars with rounding and the price
    probes in between). The Cline smokes were 70–94% cached, not 41–48%. **Cline caches as well as OpenCode; it reads
    ~1.7× the input** (4.6M vs ODQ1's 2.6M). The cache-share and input figures written above for the Cline smokes and
    CDQ1 read the counter wrong; `cl-summary.mjs` is fixed.
  - **CGQ1 (Cline + GLM-5.3, the quiz, tgz35, from 3 / 42 / 21%): 12/12, carryover clean, double tap clean, finished by
    itself in 22 min.** 43 iterations, 61 tool calls, 3.22M input (95% cached), 22.8k output, seal clean. Three pages
    (Start, Quiz, Results; it deleted the placeholder Home and pointed the router at Start), a styled gradient start
    screen. Audit: 72 nodes, **no reusable components** (no Component Inputs), a 48-node page (validator info
    `oversized-page`), JavaScriptFunction holds the questions, Timer + Repeat, localStorage best, validate 0/0/1 info.
    Graded while CMQ1 was building (mostly idle, waiting on its model); all timing checks passed. Gallery.
  - **Richard on CGQ1's start screen:** the "5 questions · 10 s each" pill wraps "questions" onto a second line and sits
    unevenly. Measured at 390 px: the content-sized row is right (213 px), but each Text defaults to 100% width, so
    both shrink to equal halves (69.7 px) and the longer one wraps. **Filed: P112-OWN020-PILLWRAP** (needs-ruling:
    runtime default, a validate/render warning, or kit guidance). The quiz grader can't see it; it's a look defect,
    like OWN-019's LAPTOPGAPS and LETTEREDGE.
  - **CMQ1 (Cline + MiMo-V2.6 Pro, the quiz, tgz35): 12/12, carryover clean, double tap clean, finished by itself in
    54 min.** 30 iterations, 57 tool calls, 3.18M input (94% cached), 34.2k output, seal clean. Slow per turn (1–3 min,
    3–4 tool calls batched per turn); it read node types and examples for ~35 min before planning. One self-reported
    malformed call ("the arguments got stringified — let me retry with a compact payload"). Audit: 60 nodes, 4
    components, no reusable components, JavaScriptFunction holds the questions, Timer + Repeat, localStorage best,
    validate 0/0. Gallery.
  - **The Cline quiz row is complete: all three models 12/12 with both observed checks clean** (CDQ1 Flash 20 min,
    CGQ1 GLM-5.3 22 min, CMQ1 MiMo-V2.6 Pro 54 min), on the core kit as shipped. The two OpenCode quizzes so far
    (OKQ1 Kimi, ODQ1 Flash) both had the colour flash.
  - **Quota after CGQ1 + CMQ1 (Richard):** 5-hour 0% (reset), weekly 48%, monthly 24%: **+6 weekly, +3 monthly for
    both** (~$1.50 at market price). Kimi's one round was +34 weekly.
  - **Richard's look notes:** *"So far Deepseek 4.1 Flash is king."*
    - CGQ1: "the question 3 of 5 / time bar is quite far above the question block". Measured: the header row (no
      sizeMode) takes the Group default `flex: 100` and absorbs the column's spare height: 251 px tall for 17 px of
      text. **Filed P112-OWN020-FILLGROW** (same root as PILLWRAP: a node with no size setting fills its parent).
    - CMQ1: "the answers don't have any outline … the whole row turns green when you didn't see that there even was a
      row". The model's design, and a kit lesson. **Filed P112-OWN020-NOAFFORDANCE** (kit: tap targets look tappable;
      render_report could measure it).
  - **CDL1 (Cline 3.0.71 + DeepSeek V4.1 Flash, Launch, core kit tgz35; Richard: "build a landing page with DeepSeek
    4.1 Flash like we did with Mistral"): 17/19, every behaviour check ✓, finished by itself in 19.6 min.** The first
    Launch in OWN-020, on Vibe + Large 4's grader (RL1 17/19, RL2b/RL3 18/19), so it meets AC5's Launch bar once.
    48 iterations, 96 tool calls (one outside read refused by the seal, the run went on), `finishReason: completed`,
    seal audit clean. Tokens: 6.17M input, 5.89M cached (95%), 39.9k output; ≈ $0.08 at ClinePass's Flash rates (a
    prediction for Richard's bars). Runner: `scratchpad/run-cdl1.sh` (CDQ1's script with `sentence-launch.txt`).
    Its route: examples and node types first (12 `list_node_types`, 12 `get_node_type`), `set_project_tokens` +
    `set_style_preset`, a plan of 13 staged operations, apply, `render_report` ×4, `drive_page` ×7, `validate_project`,
    and a final report ("verified end to end").
    Grade: ✓ hero scroll features pricing faq refuse sending joined fail reload notyou palette scale phone laptop gaps
    align; **✗ font** (the headline is `--font-serif` = "Georgia, Times New Roman, Times, serif", which the model
    described as a "System serif stack", over the template's Inter body; no font loaded); **✗ contrast** (its
    `--muted-foreground` #6C736A is 4.54:1 on the page but 4.21:1 on the tinted band behind feature 2). Both reds are
    the model's own look, not the lab's. Audit: 10 components, 114 nodes, FaqItem / FeatureRow / Waitlist with
    Component Inputs, localStorage for the kept state, validate 0/0 (3 infos, `gate-starts-shown`). The look: deep
    green and cream, a serif headline over an aerial-water photo, alternating photo/text feature rows, a pill toggle.
    Gallery :4912.
  - **CDS1 → CDS1b (Cline 3.0.71 + DeepSeek V4.1 Flash, SP1's brief verbatim — the open Spotify that OWN-019 built with
    Large 4 in Vibe — core kit tgz35, 2026-10-18; Richard: "I think DeepSeek V4.1 Flash might be a big deal").** Not
    SP1's setup: SP1 ran on the Vibe process kit (sittings, PLAN/NEXT.md, relayed replies); Cline has no such kit yet.
    - **CDS1: scoped, built nothing (88 s, 6 iterations, 109k input).** It read the examples, then asked, as the
      server's instructions say: 3 slices, a data model, 9 decisions each with a default, and one risk to prove
      first (a Router page change unmounts the page; does the audio keep playing?). Richard: *"Defaults are fine, go."*
    - 🔴 **Cline 3.0.71 can't resume a session headless:** `--id` sets `interactive: true, prompt: undefined`, and
      `--json` refuses interactive ("JSON output mode requires a prompt argument or piped stdin"), whether the reply
      is a positional prompt or on stdin (read from the binary). So a lab reply between sittings is a **new chat**.
    - **CDS1b = a new chat:** the SP1 prompt + CDS1's whole scoping reply + "Defaults are fine, go."
      (`scratchpad/prompt-CDS1b.txt`). **Completed by itself in 17 min**, 49 iterations, 6.23M input (96% cached),
      44k output, seal clean; ≈ $0.08 at ClinePass's Flash rates. It created **OpenTune**, wrote BRIEF / ARCHITECTURE /
      CONVENTIONS / two decision records, and built **only the spike it had planned**: App (nav + router + player
      bar), a logic `Player` component holding one `new Audio()` in a Global Store, Home and Browse pages; 5
      components, 50 nodes. Its `drive_page` proof: 12/12 steps, still playing after the page change. Then it stopped
      for "go" on slice 1 (backend, upload, song page, browse facets, home shelves, sign-in). Gallery :4913.
    - **Its five "traps" (its `docs/decisions/001-…`), checked:** (4) `update_component` drops a top-level
      `connections` — **measured in its journal and filed P112-OWN020-CALLTOOLSTRIP** (high): `call_tool` strips any
      argument a tool lacks, skipping P109-S12's guard, so 2 calls returned `updated`, 0 errors, wires gone. (5) "a
      reallocated id drops its wires": the same call shows the remap AND the strip, so most likely (4) misattributed.
      (1) `Outputs.audio(x)` throws and (2) "`done` never fires" are the spec (`JavaScriptFunction.json`: a value port
      called throws; a load run sends Success alone, Done answers a Run). (3) Global Store `state` not reactive: no
      spec scenario for Global Store, unmeasured.
  - **CDS1c (sitting 3, 2026-10-19; Richard: "ye" to "go on slice 1"):** a new chat in CDS1b's folder
    (`round-cline.mjs --seed <apps-dir>`, added for this), its last report pasted + "Go."
    (`scratchpad/prompt-CDS1c.txt`; the pasted preview path repointed at the copy). Gallery :4914. **Ended `error`
    at 9 min** (31 iterations, 1.96M input, 92% cached): ClinePass sent bad stream data mid-reply
    (`AI_InvalidResponseDataError`, `isRetryable: false`), so Cline ended the run; `--retries 5` doesn't cover it. No
    429, no limit text. Built: backend (files, roles), Sign In, Song Row, Form Field.
  - 🔴 **A later sitting needs the person's `~/.noodl` too:** `provision_backend` puts the backend in
    `$HOME/.noodl/backends/<id>` and the project names it by id. `--seed` now takes the previous **round root** and
    copies `work/apps` and `home/.noodl` (no absolute paths inside).
  - **CDS1d** (CDS1c's folder + backend; "the chat ended on a connection error … carry on"): it reopened the
    project, found and restarted the backend, built **Upload** and **Song** (rendered at desktop and phone). **Ended
    `error` at 22 min** (82 iterations, 11.8M input, 98% cached): the stream went silent mid-thinking for 5 m 43 s,
    then "The operation timed out.", non-recoverable again. A probe straight after answered in 2 s. **Two provider
    stream failures in two sittings, each ending the whole run with no retry:** a reliability line for the write-up
    (Cline + ClinePass, 2026-10-19 morning). Gallery :4915.
  - **CDS1e** (CDS1d's folder + backend): **ended `error` at 11 min**, "Stream error occurred" again (30 iterations,
    2.35M input, 92% cached). **Three provider failures in three sittings (08:45, 09:09, 09:21 CEST)**, each fatal.
    Not context size: the last request's context was 130k (CDS1c), 248k (CDS1d), 189k (CDS1e), while CDS1b finished
    at 23:42 the night before with 217k. Time of day (load on `private/deepseek-v4p1-flash-contributor`) fits but is
    unproven. Stopped here to ask Richard. Gallery :4916.
  - **CDS1f** (Richard: "Retry once now"; CDS1e's folder + backend, 10:14): **ended `error` at 27 min**, "Stream
    error occurred" (52 iterations, 6.33M input, 95% cached, 33k output). **Four provider failures in four morning
    sittings; recorded as the Cline + ClinePass result for long builds, no more retries without Richard.** Furthest
    yet: seed songs imported, **Browse proven by its own drives** (search 1 of 7, chips 3 of 7 and off, three sorts,
    Clear, a card opens `/song/<id>`, the filter survives a router return, no console errors; it caught its own
    wrong sort assertion by reading every card twice), then a `Shelf` component for Home's three shelves when the
    stream died. Seal audit: 3 `read_files` of `/Users/richardosborne/.noodl/backends/…`, all **skipped by the seal**.
    The model guessed `~` from the lab's own path (the scratchpad folder name carries the username): a lab leak of
    the user name, not a product one. Gallery :4917.
  - **Slice 1 state (CDS1f's folder):** backend (files, roles, songs seeded), Player + Player Bar, Song Row, Form
    Field, Shelf; pages Home (shelves half-done), Browse ✓, Song ✓ (desktop + phone), Upload, Sign In. Not yet
    driven by the lab's own grader (SP1 has none; OWN-019 graded it by Richard's eye).
  - **Why it craps out (Richard asked).** All four deaths came just as the model began a large tool call (a whole
    component or plan as JSON). Three were `AI_InvalidResponseDataError`, which the AI SDK's openai-compatible parser
    raises for a chunk it can't accept (e.g. a tool call opening without `id` / `function.name`); one was 5 m 43 s
    of silence, then Cline's own timeout. Cline marks both non-retryable and keeps no byte of what was sent.
    **`own-020/stream-tap.mjs`** (new; `round-cline.mjs --base-url http://127.0.0.1:<port>/api/v1`) sits in front of
    `api.cline.bot`. `record` streams through and saves each response; `retry` holds each reply, checks it as that
    parser does (JSON lines, no error object, tool calls open with id + name, `[DONE]`), re-asks a bad or 90-s-silent
    one up to 4 times (bad attempts saved as `bad-NNN-<try>.sse`) and pings Cline meanwhile.
  - **CDS1g** (CDS1f's folder + backend, through the tap in `retry`, 10:48): **completed by itself in 10.6 min**, 45
    iterations, 4.41M input (96% cached), 14.5k output, seal clean. **The tap saw 45 requests, 0 bad, 0 retries**, so
    no failure was caught and the cause is still unmeasured; the retry is unexercised. One difference the tap does
    make: Cline gets each reply in one local burst instead of a long stream from the gateway, so a client-side cause
    can't be ruled out yet. **Next to tell them apart: a sitting in `record` mode** (pass-through, bytes saved).
    Built: Home wired (one query, a Function for three shelves of six, search hand-off to Browse; it found and fixed
    "Browse everything" landing on a filtered Browse); `drive_page` 15/15. It restarted the backend itself (a seeded
    sitting copies the backend's data, not its process). It flags that **no song can play yet**: the 7 seed rows have
    `audioFile: null`, so every Play is disabled until a real upload. Gallery :4918.
  - **CDS2 chain** (Richard: "keep trying to figure out wtf is going on with ClinePass and push the thing to the
    end"; `scratchpad/chain-cds2.sh`: sittings seeded from the last, the tap in **record** mode, the instruction to
    finish all three slices on its proposed defaults and end with `ALL SLICES DONE`). **CDS2-01 finished OpenTune in
    one sitting: completed by itself in 62 min**, 200 iterations, 72.1M input (98.5% cached), 153k output, seal
    clean; ≈ $0.30 at ClinePass's Flash rates. **200/200 responses clean**, at up to ~2.4M characters of context.
    Its report: slice 1 finished (a real WAV uploaded via a drop target it added because headless can't reach the
    file chooser, played, kept playing across pages; the Song page's broken Play fixed), slice 2 (Artist, Album,
    Playlist, Profile, a play queue, follows, playlists with share), slice 3 (For You from likes' genres, private
    dislikes, report → Admin takedown behind an `admin` role); `validate_project` 0/0 over 692 nodes; an end-to-end
    drive from sign-in to "Play the album, 1 of 3". Four more NodeGX traps it hit (`idSource` default ignoring a
    wired `modelId`; a query item's key is `id`; a Function fed by a live query not re-running on an update; a signal
    into an Expression input as a one-frame pulse): its claims, unmeasured. Gallery :4919 (its backend has to run:
    `nodegx-backend serve` from the kit, port 8583, on the round's `home/.noodl`).
  - **Opus's own look (headless Chrome, 1280 px, backend up):** Home shows five shelves with cover art; Browse
    shows the facet chips and 8 songs; **logging in as `cds2-tester` works** (Profile and Admin appear); no console
    errors. Nits: the nav still says "Sign in" when signed in; "No audio file" cards' Play looks the same as a live
    one; the uploaded test song has no cover.
  - **ClinePass, where it stands:** direct, 4 of 4 sittings died (08:45–10:42); through the tap, 0 bad in 245
    responses (10:48–12:16). Two readings fit and the data doesn't separate them: (a) ClinePass's DeepSeek route
    was unstable that morning and recovered; (b) the tap changes the transport. Cline (Bun's fetch) then talks plain
    HTTP/1.1 to localhost with no compression (the tap asks upstream for `identity`), so a Cline-side fault reading
    long compressed streams from the gateway would vanish. **To separate them: a direct sitting and a tapped
    sitting at the same hour.**
  - **The supervised UI/UX pass (Richard, on his own phone and desktop shots: "a bit blocky … sections aren't really
    'defined' … the responsive mobile view is particularly bad, some buttons overflowing their containers. Can you
    supervise a second pass on UI UX specifically?").** Opus measured first (`scratchpad/ui-audit.mjs`: sign in, 10
    pages at 360 / 390 / 1280, a full-page shot each, plus overflow, broken words and overlap counted in the page):
    an overlap or two per width (Report on the description, "5 likes" on a heading, Add out of its row, an artist
    cover), the player bar breaking "Nothi/ng" at every phone width, the album cover wider than its box at 360, and
    forms always open. Brief = Richard's words verbatim + the measured list + checks to prove at 4 widths on 10
    pages, behaviour untouched (`scratchpad/prompt-UI1.txt`).
    - **UI-1: UI PASS DONE, 47 min**, 140 requests, all clean through the tap, seal clean. A written system
      (`005-ui-system.md`: widths, spacing, type, three surfaces, four button styles), two root causes (a
      `contentWidth` Button takes 100% height and stretches in a wrapping row; a Text left at 100% width grows in a
      row: the same family as PILLWRAP / FILLGROW), one play/pause toggle, forms behind buttons, the username in the
      nav. **Opus's re-audit:** 0 overlaps at every width, but at 360 the nav overflowed with a longer username
      (the model tested with a 7-character name; `cds2-tester` pushed Admin off-screen, the document 364 px wide).
    - **UI-2 (Opus's correction: the nav at any username length at 320 / 360, and the Profile heading it found
      showing `cds2-tester` on every profile): UI FIXES DONE, 25 min**, 62 requests, all clean. The pill truncates
      with an ellipsis, `Columns` capped at 100% (Home / Browse / Song / Artist were 321–324 px at 320), the Profile
      name read from that person's rows. **Opus's re-audit at 320 / 360 / 390 / 1280: overflow 0, overlap 0, console
      errors 0 on every page; the documents are exactly screen width.** The remaining "broken" flags are the
      intended ellipsis at 320 and two canvas false positives in the audit ("OpenTune", "catalogued": both seen
      whole in the shots). Gallery :4921 (FINAL), backend on :8583.
    - It added test accounts to the local backend (`a-very-long-username1` with the `admin` role,
      `second-viewer`, password `testpass123`) and says so.
    - **Filed P112-OWN020-OUTDIRANYWHERE** (medium): UI-2 sent `drive_page` `out_dir: "/tmp/opentune-shots"`, our
      server wrote a PNG there (outside the project), and the sealed `read_files` couldn't open it.
      `renderTools.ts` is `path.resolve(args.out_dir)` for both tools.
  - **The ClinePass tally for the day: direct 4 of 4 sittings died (08:45–10:42); through the tap 0 bad in 447
    responses across 4 sittings (10:48–13:55).**
  - **"Why the weird mix of fonts and chunky controls?" (Richard, on UI-2's Sort-by radios) → element styles, built
    2026-10-19 (Richard: "Rock out and do option 4 too if you think it'll really help").** Measured cause: the model
    styled what it was thinking about and placed three Radio Buttons with no parameters, which draw the runtime's
    32px / 2px-black defaults; the kit offered on-system defaults for 4 types and the MCP stamped none; the runtime's
    nameless-variant layer (one look per type) existed but nothing could write it. Built: `set_element_style`
    (theme group), the styles writer, schema/type for a nameless variant, element styles in every new project and from
    `set_style_preset`, `get_style_vocabulary.elementStyles`, the doctrine's "controls are styled once" sentence, and
    `control-off-scale` in render_report. Option 4 done in its safe form (new projects carry the look) rather than as
    token runtime defaults, which would restyle every existing app on upgrade. Found and fixed on the way:
    **P112-OWN020-RENDERNOVARIANTS** (render_report drew no Looks or element styles). Proof on an OpenTune copy, kit
    preview, no node touched: Sort-by 32x32 / 2px black / 16px → 16x16 / 1px `--border-control` / 14px. Tests:
    `own020ElementStyles` 8/8, `own020RenderVariants` 3/3 (+ mutant), render-measure 38/38 (reverted arm), editor
    doctrine 21/21, MCP subset 249/251 (the 2 = `cmp004RoundTrip`, red before: OWN-001 l.179), contract 359/360
    (`verbs` scenario census, a peer's node-spec work). All uncommitted. Not yet run: a stranger round on a kit
    packed with this (needs a tarball from a clean worktree).
- **The Cline kit, AC2 (2026-10-19 night, Opus; Richard: "can we declare the Cline / DeepSeek version … done as the
  Mistral one and publish it?" → not yet, nothing to publish; "Yep rock out" to building it).**
  - **No per-folder route, re-measured (R42's preference).** Cline 3.0.71 from the s1 source, and 3.0.73 (npm latest,
    2026-10-19; `@cline/core`/`shared` 0.0.95 read): MCP servers come from `CLINE_MCP_SETTINGS_PATH`, else
    `$CLINE_DATA_DIR/settings/cline_mcp_settings.json`, else `<CLINE_DIR or ~/.cline>/data/settings/…`. A plugin's
    `registerMcpServer` is collected and never connected (`getRegisteredMcpServers` has no caller in either), and agent
    plugins (`plugin.json` + `mcp.json`) are searched only in `~/.agents/plugins`. So the kit writes the home file (R42).
  - **Why the kit writes the entry itself, not `cline mcp add`:** `cline mcp add nodegx --yes -- …` (3.0.71, empty
    HOME) writes the nested shape, **silently replaces** an existing `nodegx`, and can't set `timeout`, so Cline's 10-s
    connect limit meets a cold npx (27.8 s, P112-OWN023-COLDSERVER).
  - **Built** (`packages/create-nodegx`): `--cline` writes `AGENTS.md` (the core note, verbatim: what CDQ1 / CDL1 /
    CDS2 read) and the core skill in `.claude/skills/` (Cline lists it), no `.mcp.json` / `CLAUDE.md` / `.vibe/` /
    `opencode.json` (R29), and one entry in Cline's file: `npx -y @nodegx/mcp@<pin> --allow-writes
    --screenshots-to-files`, `timeout: 300`, `metadata: { writtenBy: "create-nodegx" }` (Cline's schema keeps
    `metadata`). Rules: no file → write; other servers and top-level keys kept; the person's own `nodegx` (no mark)
    never replaced, and the sentence names it; the kit's own entry from another release → moved to this release's
    (a judgement call beyond R42's words: R42 says "never replacing an entry already present"; this replaces only an
    entry the kit marked as its own — **put to Richard**); a file that isn't a JSON object → exit 1 before anything is
    written; written through a temp file. `--vibe --cline` refused. `cline/` = `create-nodegx-cline` (the vibe
    wrapper's shape, pinned to the same version, outside the workspaces). `publish-npm.sh` publishes it last; it needs
    the next cut (0.2.4): `create-nodegx@0.2.3` has no `--cline`, and the 0.2.3 tarball folder has no Cline tarball,
    so Richard's pending 0.2.3 run is unchanged.
  - **Proof:** `create.test.js` **34/34** (8 new); mutant: the own-entry guard removed → exactly test 30 red. 
    `publishable.js packages/create-nodegx/cline`: 1 package, 0 problems. **Mock round `kc-mock1`** (`round-cline.mjs
    --kit cline`, now reading the entry the kit wrote instead of `opencode.json`; create-nodegx packed from this
    checkout + the 0.2.3 MCP tarball; Cline 3.0.71; `mock-model.mjs`; $0): Cline accepted the kit's entry with its
    `timeout` and `metadata`, offered the seven `nodegx__*` tools, `list_examples` answered, AGENTS.md in the system
    prompt, the skill listed; finish `completed`; seal audit = exactly the four planted escapes. Scratchpad
    `e824a1ee-…/scratchpad/rounds/kc-mock1`.
  - **Not measured:** Cline Desktop and the VS Code extension (whether they read the same file); Windows paths; a real
    model on the kit (the next rounds: CDQ2 / CDL2 on a 0.2.4-candidate tarball from a clean worktree, with the
    element styles, for AC5's second passes).
- **Option 4 (element styles stamped on every new project), measured and parked (2026-10-20, Opus; Richard: "Yep write
  it up and rock out" to the plan below).** Committing the 2026-10-19 element-styles pile for the 0.2.4 candidate:
  - **What the stamp did, measured.** The server's whole suite (241 files, 13.5 min) with the pile in: 16 red files,
    23 tests. 5 red for other reasons (an `emailCode` template from another lane, ParseCSV's export status, the
    untracked TPL-011 Nightbook files ×2, `cmp004RoundTrip` red since OWN-001). The other 10 were the pile: 8 template
    artefacts no longer byte-identical to a fresh build (each gained `nodegx.styles.json`), the D28 layout drive and
    the SBR-009 theme-editor drive. **With both stamps off, all 8 template files pass; D28 and SBR-009 stay red**, so
    those two are not option 4 (whether they predate the pile is unmeasured).
  - **Why: every template is built through `create_project`.** A creation stamp can't reach a blank project without
    restyling every shipped template on its next rebuild. Census of `templates/*/components` (nodes naming no Look):
    ~700 controls in 13 templates leave at least one starter parameter unset, e.g. To-do list 85 buttons + 27 text
    inputs, Marketplace 94 + 37, Planning 82 + 38, Gram 80 + 17; Rocket School's and Star Class's 61 buttons set every
    look parameter themselves (their text inputs and dropdown don't); Learn with Simple Rick has no controls.
  - **The starters change size, not only look.** Their comment said "never where anything sits"; padding (Button,
    Text Input, Dropdown) and width/height (Checkbox, Radio Button) are sizes, and many template controls leave those
    unset (Marketplace's 37 text inputs, To-do list's 25). The D28 drive's buttons stopped overlapping once they wore
    the Button starter. Comment corrected.
  - **The uncommitted stamp leaked.** `tpl005Template.test.ts` and `tpl006Template.test.ts` rebuild
    `templates/pixel-game` and `templates/story-engine` IN PLACE (`OUTPUT = …/templates/<id>`); the 2026-10-20 run
    wrote a `nodegx.styles.json` into each (09:56–09:57; removed, every other file byte-identical). Any session building
    a template from the shared checkout got element styles silently while the pile sat uncommitted.
  - **Done (step 1):** committed without the stamp. `set_element_style` gains `starter: true` (the on-system look for
    one control type, parameters on top; refused for a type with no starter), so the doctrine's instruction is one
    call per type: "call `set_element_style({ type, starter: true })` before placing the first control of a type". The
    vocabulary's "none" line names the call. `create_project` and `set_style_preset` write no element style, pinned by
    a test. The stamp is `own-020/option4-stamp.patch` (applies to the committed tree). Tests: own020ElementStyles
    10/10 (mutant: the starter merge dropped → 2 red), own020RenderVariants, toolDisclosure (resident 8274 of 8280
    tokens), createProject, skeletonCreate, bootstrap, instructions, styleTools: 90/90; the 8 template files green;
    render-measure 38/38; contract 359/360 (`verbs` scenario census, not this); editor doctrine 21/21; tsc clean (mcp,
    contract, preview; the editor's reads of a variant's `name` already treat it as optional).
  - **The plan for option 4 (step 2, its own task): "adopt, keeping what's there".** One routine adds the element
    styles to a project after copying every existing control's current look onto that control (each starter
    parameter it leaves unset gets the runtime's value as its own), so nothing on screen moves and only controls added
    later get the on-system look. A gate renders before and after and fails on any existing control whose computed
    style changed, so adoption is proven neutral by machine, not by eye. Used in three places: (a) blank projects at
    creation (nothing to keep: option 4 exactly); (b) each template generator, by an explicit per-template choice with
    no default, and a test listing every generator so a new template can't skip it; (c) existing apps only on request
    (a tool / an editor action), never on upgrade. Known risk: some runtime defaults are "unset" (a button's font
    inherits the page's), which no plain parameter value reproduces; the gate names each, and each needs an explicit
    "inherit" value or an exception.
  - **Step 3, per template, by eye (Richard's call):** whether to restyle a template's OWN controls onto the system,
    a design change to approved templates. First candidates: where a person most likely adds controls (To-do list,
    Planning, Members Area, Marketplace).
- **The 0.2.4 candidate, packed and mock-rounded (2026-10-20 midday, Opus; handoff steps 2–3).** Nothing published;
  `cline-dev` unchanged by it.
  - **Packed** in worktree `OpenNoodl-worktrees/own020-pack024` (branch `own020-pack024`, local only), from
    `a93f0d2ed` + one commit `a6544370c` that bumps ONLY there: `@nodegx/mcp`, `@nodegx/preview`, `create-nodegx`
    (`MCP_VERSION`), `create-nodegx-vibe`, `create-nodegx-cline` → 0.2.4, the two wrappers pinning
    `create-nodegx@0.2.4`. The lockfile was not touched (a pack doesn't read it; the real cut bumps its workspace
    versions as `307bb8b38` did). Recipe as OWN-021 §10: the worktree's `dist` links into primary removed first,
    `build:types` in noodl-runtime, `npm pack` under HEAVY.lock (taken after nodegx-studio's measure-shots), `nice 19`;
    `git status` empty before and after. Bundle inputs read off the module comments: MCP 1,169 first-party, preview
    726, **0 first-party from outside the worktree** (third-party `node_modules` resolve through primary's links, as
    always). `set_element_style` is in the MCP bundle; `--cline` in create-nodegx.
    Folder `/Users/richardosborne/vscode_projects/OpenNoodl-worktrees/tgz024/`:

    | tarball | sha1 | bytes |
    |---|---|---|
    | `nodegx-mcp-0.2.4.tgz` | `fab573cbf6e6abd9af2fa06369c6443f0df79500` | 11,972,453 |
    | `nodegx-preview-0.2.4.tgz` | `c4328e206b97d80d2486f287cd80082f960b2f1e` | 5,574,454 |
    | `create-nodegx-0.2.4.tgz` | `191cc6e2fe6d593076bd2f5c0994388766135822` | 42,552 |
    | `create-nodegx-vibe-0.2.4.tgz` | `ab5cd4daed8e930903a231bb6e2ef32e2abb0f6e` | 13,641 |
    | `create-nodegx-cline-0.2.4.tgz` | `12e3514daee74f9d89f1b47a8fbfff7afcd8656f` | 13,967 |

  - **Tested from the tarballs**, empty folder, empty HOME, npm cache inside it, `CLINE_*`/`NODEGX_*`/`NOODL_*` unset;
    expected results written first. (1) `create-nodegx my-apps` → exit 0; `.mcp.json`, `.vibe/config.toml`,
    `opencode.json` all `@nodegx/mcp@0.2.4`. (2) `npx --package=<cline tgz> --package=<core tgz> create-nodegx-cline
    my-cline` → exit 0; `AGENTS.md`, `.claude/skills/nodegx-your-own-editor/SKILL.md`, and ONE `nodegx` entry in
    `$HOME/.cline/data/settings/cline_mcp_settings.json`: `npx -y @nodegx/mcp@0.2.4 --allow-writes
    --screenshots-to-files`, `timeout: 300`, `metadata.writtenBy: "create-nodegx"`; the next-steps text names DeepSeek
    V4.1 Flash on ClinePass. (3) vibe → `.vibe/config.toml` pins 0.2.4. (4) The MCP tarball as Cline's entry runs it,
    from `my-cline`, through the SDK's stdio client: connected 9.6–15.2 s (cold npx), `noodl-mcp 0.4.2`, the seven
    bootstrap tools; `create_project` "Reading List" → 78 files, its `.mcp.json` pinned 0.2.4; 25 tools after bind;
    `validate_project` 0 / 0; `call_tool get_project_info` answers (the path Cline uses: it lists tools once).
    `set_element_style` is NOT in the 25 (its group is `resident: false`, keyword "theme"): after `open_project`,
    `call_tool find_tools {query:"theme"}` names it, it is then listed, and `set_element_style({type:"Button",
    starter:true})` → ok, `nodegx.styles.json` written with the Button starter, `nodesOfType: 0` (the skeleton has no
    Button). (5) `npx -y file:<preview tgz> reading-list --port 48741 --no-watch` → up in 9 s, 163 node types, rendered
    in 14 ms; headless Chrome 390 × 844 drew "Reading List — nothing built yet. Review the plan in docs/ …" (the line
    runs past the 390 px edge; unmeasured whether that is headless window sizing); `GET /.mcp.json` 404. Torn down,
    port free.
  - **Mock round `kc-mock2`** (`round-cline.mjs --kit cline --base-url http://127.0.0.1:48793`, `mock-model.mjs`,
    Cline 3.0.71 freshly installed in this session's scratchpad because `kc-mock1`'s pinned install had been cleaned
    away; $0): finish `completed`, 8 iterations, cost 0; the requests the mock saw: 1 `GET recommended-models`, 8 chat
    completions, nothing else. Cline accepted the kit's entry (the tgz standing in for `@nodegx/mcp@0.2.4`, `timeout`
    and `metadata` kept), offered the seven `nodegx__*` tools (11 tools in all), AGENTS.md in the system prompt, the
    skill listed, `list_examples` answered; seal audit = exactly the four planted escapes; neither canary written.
    Scratchpad `e824a1ee-…/scratchpad/rounds/kc-mock2` (+ `-model`).
  - **Gates.** `publishable.js` in the worktree: 6 packages, 1 problem: project-contract's `dist/publish` unbuilt (this
    candidate doesn't pack it); the two wrappers 1 / 0 each. `bugs.js gate mcp` 0 blockers, 5 known; `gate preview` 0
    blockers, 6 known. `create.test.js` in the worktree 32 / 34: tests 26 and 34 (the wrappers' pins) fail because
    the worktree's `node_modules/create-nodegx` resolves into primary (0.2.3), read off the assertion (`0.2.3` actual,
    `0.2.4` expected): the artefact `307bb8b38` recorded, not a defect; the tarballs themselves pin 0.2.4 ((2), (3)).
  - **For the real cut:** `@nodegx/project-contract` changed since 0.2.0 (`3cb9eb745`: the nameless variant in
    `format/types.ts`, `format/store.ts`, `schemas/styles.schema.json`), so a 0.2.1 belongs in it (the MCP and preview
    inline it either way); node-spec's change since 0.2.0 is README only. The cut also needs npm 0.2.3 finished first
    (at 12:04 CEST mcp, preview, create-nodegx, create-nodegx-vibe still answered 0.2.2 on the registry).
- **AC5's DeepSeek rounds on the 0.2.4 candidate's Cline kit (2026-10-20 afternoon, Opus; Richard: "Yes, run both",
  then "Both through the tap", then "Yes, retry mode").** Runner `scratchpad/run-cd2.sh` (CDL1's script on `tgz024`
  with `--kit cline`, Cline 3.0.71; `TAP=<port>` puts `stream-tap.mjs` in front, `TAPMODE` record|retry). Gallery
  `OWN-020 ClinePass apps`, index :4900.
  - **CDQ2 (quiz, DIRECT, 12:23 CEST): ended `error` at 14.5 min, "Stream error occurred"** (34 iterations, 78 tools,
    3.05M input, 94% cached, seal clean). Unfinished, ungraded. Its last render had caught its own fault (below).
    Gallery :4922.
  - **CDQ3 (quiz, tap in RECORD mode, 12:42): ended `error` at 6 min, "Stream error occurred"** (20 iterations, 0.83M
    input). **The first failure with its bytes saved, and it answers where the stream deaths come from:** response 020
    (`resp-020.sse`, 10,222 lines, 1.9 MB, 51 s) is ~10k well-formed reasoning chunks from
    `vmc/deepseek-v4p1-flash-contributor-fallbacks`, then ONE chunk carrying `"error":{"code":"error","message":"Stream
    error occurred","name":"AI_InvalidResponseDataError"}` with `finish_reason: "error"`, then `[DONE]`. **The error
    is in-band from ClinePass's gateway**: the gateway's own AI SDK parser rejected what its upstream sent and relayed
    the error; Cline only reports it and, as measured before, never retries it. Not the client, not the tap (record is
    pass-through), not context size (376k characters of request). So CDS1c / CDS1e / CDS1f / CDQ2's identical message is
    explained; CDS1d's 5 m 43 s silence is the other shape (next item). A line for the write-up and for Cline. Gallery
    :4923.
  - **CDL2 (Launch, tap in RECORD mode, 12:48): 18/19, every behaviour check ✓, finished by itself in 33 min.** 64
    iterations, 101 tools, seal clean, tap 64 responses all ok. Tokens 10.58M input, **58% cached** (CDL1: 95%; the
    cause is unread), 40k output. ✗ **font** only: the headline names "Iowan Old Style", which nothing ships; the
    validator said so (`font-face-not-shipped`, 1 warning) and the model left it. Contrast min 5.01. Audit: 9
    components, 115 nodes, FaqItem / FeatureSection / PricingSection / SiteFooter / WaitlistSection with Component
    Inputs, localStorage for the kept state. **With CDL1 (17/19, core kit tgz35) that is two Launch passes in a row
    for DeepSeek on Cline**, on two kit versions (see the AC5 note below). Gallery :4924.
  - **CDQ4 (quiz, tap in RETRY mode, 14:02): 12/12, carryover clean, double tap NOT clean, finished by itself in 19
    min.** 39 iterations, 72 tools, 3.92M input (95% cached), 20.8k output, seal clean, validate 0/0. **The tap
    re-asked one reply:** request 017 went silent for 90 s (`try 1: silent 90s`), was asked again, and the run went
    on; in record mode or direct that is CDS1d's silence, then Cline's own timeout and the end of the run. So the
    quiz pass is **with the lab's retry**, not what a person on ClinePass gets today. Double tap: Q1's second tap
    coloured too, and Q2's second tap was scored (CDQ1 was clean on both; CGQ1 and CMQ1 too). Audit: 5 components, 65
    nodes, AnswerOption with Component Inputs, Static Data for the questions, Timer ×2 + Repeat, localStorage best.
    Gallery :4925.
  - **AC5 bookkeeping, for Richard.** AC5 says "twice in a row **on one kit version**". DeepSeek on Cline now has quiz
    12/12 on tgz35 (CDQ1, direct) and 12/12 on 0.2.4c (CDQ4, retry tap), Launch 17/19 on tgz35 (CDL1) and 18/19 on
    0.2.4c (CDL2, record tap). Read strictly, 0.2.4c has one pass of each, and the 0.2.4c quiz needed the retry. The
    ruling owed: whether tgz35 → 0.2.4c (the same core note and server, plus the Cline kit and element styles) counts
    as one version for AC5, and whether a pass through the retry tap counts.
  - **P112-OWN020-UNWIREDSIGNAL, filed (open, medium, kit preview).** CDQ2's Functions end `Outputs.done();` with no
    `out-done` wire and no saved port; rendered from disk, each throws "Outputs.done is not a function". The Function
    spec's "a signal the code calls with no wire on it sends nothing; the run still succeeds" passes, because the
    spec's target registers code-derived ports at mount and the from-disk runtime doesn't. Minimal repro and the
    editor side not yet measured.
  - **Quota (Richard's bars, read 15:22 CEST): 5-hour 10%, weekly 61%, monthly 30%.** The 5-hour window resets at
    17:24, so it opened at 12:24, one minute after CDQ2 began: **the four rounds (CDQ2 + CDQ3 + CDL2 + CDQ4, ≈ 18.4M
    input, 90% cached, ~94k output) cost 10% of a 5-hour window**, about $1 on the market-value estimate above. Weekly
    48 → 61 and monthly 24 → 30 since the CGQ1 + CMQ1 reading also hold CDL1, the CDS1 chain, CDS2-01 (72M input) and
    UI-1 / UI-2, so they don't split per round.
- **UNWIREDSIGNAL fixed, CDQ4's double tap read (2026-10-20 evening, Opus; next-session steps 1 and 2).**
  - **UNWIREDSIGNAL, fixed in `3026899d4`** (runtime, `placingSignalPorts` in simplejavascript.ts; regression
    `noodl-runtime/test/p112-own020-an-unwired-signal-a-function-calls.test.ts`). Measured first, from disk (no module
    `setup`, the component as the file holds it): the CDQ2 shape threw with `out-done` unwired **and with it wired**. A
    wire registers the node's output, not a model port, so the bug file's first workaround was wrong. Only a saved
    `ports` entry (what an editor deploy writes) ran clean. The run now prepares the placing's signals too (written list
    typed Signal, then the code's `Outputs.x()`, read from `model.parameters`). The spec's two Function rows are
    unchanged; the sabotage turns exactly the three fixed cases red. **Not driven in the product:** the MCP render and the
    deploy engine are built bundles, so the 0.2.4 cut's smoke owes one render of an unwired-signal Function with
    `consoleErrors` empty.
  - **CDQ4's double tap is the model's design, not the kit's.** `Pages/Quiz` has a Condition `lock_gate`, labelled "The
    question is locked", with `condition: true` as a literal and no wire. Its own comment says "Its condition is a
    constant, so it is a fan-out, not a test". Every tap fires `picked` → `write_tapped_N` and `pickedRight` →
    `score_counter.increase`, and nothing reads `quizRevealed` before counting, so a second tap is coloured and scored.
    The sentence never asks for a lock, and the double tap is observed, not scored. A kit note would be teaching to an
    unscored check, so none was written. CDQ1, CGQ1 and CMQ1 were clean on the same kit family.
  - **Reported to Cline (Richard: "You can send the report to Cline"):** https://github.com/cline/cline/issues/15214.
    The in-band `AI_InvalidResponseDataError` chunk verbatim (generation `gen_01M5CESD7DAFQQW8223ZRZ12QX`, CDQ3), the
    six deaths of 10-19 / 10-20, the 5 m 43 s silence, and three asks: the gateway retries upstream, the CLI treats an
    in-band error and a stall as retryable, and a shorter stall timeout. The recorded response is offered privately,
    not attached. Filed on `cline` 3.0.71 (3.0.73 is current, not retested).
