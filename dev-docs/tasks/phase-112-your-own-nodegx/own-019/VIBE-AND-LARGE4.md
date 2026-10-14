# Vibe 2.26.1 + Mistral Large 4 — the field guide

**What this is.** Everything measured about how Mistral Vibe (the harness) and Mistral Large 4 (the model) behave
when they build NodeGX apps, each fact with its evidence, so the kit can be optimised from measurements instead of
guesses — and the AC8 audit's first read. Started OWN-019 s3 (2026-10-13) at Richard's request after the two
process rounds: *"record as much as possible about how vibe and Large 4 work to try to optimise."* Keep adding to it:
a new measurement goes in the section it belongs to, with its round.

**How to measure more** (the lab, all in this repo):
- `own-019/anatomy.mjs <round-root>…` — where a session's time and tokens go, from Vibe's own stream (`agent*.jsonl`,
  every event has createdAt/updatedAt): thinking vs tools vs silence, think sizes and speed, reads/writes/drives,
  refusals, hook denials, cache, Vibe $. `--timeline` prints every event.
- `own-018/round-kit.mjs … --record` — every request body and every call's timings, Mistral's own `usage` (prompt,
  cached, completion, reasoning tokens) and finish reason, in `<root>/calls/`; `record-proxy.mjs --compare <dir>`
  says whether each request extends the one before (what a prefix cache can reuse).
- `own-018/peek.mjs <root> [--tag N]` — what the agent said and called, in order.

## The optimisation summary (s3) — what the numbers say to change

1. **Time is the model's thinking, not the tools.** In every session measured (s2's one-shots and s3's sittings),
   82–95% of wall time is Large 4 thinking; NodeGX's tools (drives, renders, writes) take 1–2 min an hour. Speed
   levers are on the model side: fewer, shorter thinks — small parts, one component per answer, no whole-app design
   in one answer.
2. **Mistral's speed and cache vary by time of day.** Median think speed was 130–260 chars/s 13:00–18:30 CEST and
   ≈50 chars/s 20:00–22:30 on 2026-10-13; the same evening's cache fell to 9–41% (afternoon 60–76%) and two streams
   dropped. Run comparison rounds in the same window, and record the hour with every result.
3. **Vibe's `cost_usd` is the real cost at list prices** (verified to the cent); the "≈half" is the launch sale, which
   ends ~2026-10-20. Budget R30's allowance on Vibe's figure from then on.
4. **Headless `-p` pushes "a single pass"** (Vibe's own system prompt); a person's interactive session doesn't. The lab is
   harsher than real use on process-following; the kit works *with* one long session (R32) and hands over only at
   ~100 calls.
5. **Teaching pays.** The three guides halved a part's cost (q6 $1.34/32 calls vs q4 $3.20/73) and made the plan split
   into ≤4-line parts unprompted.
6. **Fixed overhead per session ≈ 8.9k tokens** before any work: Vibe's system prompt + AGENTS.md + the skill list
   (21.8k chars) and 13 tools' definitions (14k chars). Every session or hand-over pays it again (cached after the
   first call, when the cache works).
7. **Untried levers worth a round each:** `auto_compact_threshold` (~118k; the kit declares a 1M window, so a long
   session never compacts), a `post_agent` "no `# Done` with a line unproven" hook, `system_prompt_id` (replaces
   Vibe's base prompt — could drop the "single pass" line), and comparing rounds by time of day.

## s3's new measurements (2026-10-13 evening)

- **The first process-kit app passed** (q6, per-part sittings): 12/12, carryover clean, finished by itself, its own
  17-line proof matching the grader; 7 sittings, 197 min, $9.65 list (~$4.82 at the sale). Think speed recovered
  after midnight (217–222 chars/s, 75–81% cached in sittings 6–7), confirming the evening slowdown was load.

- **The evening cache, settled — Mistral's side, not the requests** (q6 sitting 4, recorded, 23:5x–00:0x CEST): every
  chat request was a pure extension of the one before (identical prefix, the new turn appended), yet 7 of 22 calls
  got 0–11% cached (#17 11%, #40 5%, #47 0%, #60 0%, #63 0%, #79 0%, #85 2%), most of them 0.1 s after the previous
  call — so not a timeout either. The others got 87–99%. A miss costs time too: first byte 6–12 s against 1–2 s on a
  hit (prefill of ~50–110k tokens). The likeliest reading: under evening load, calls land on servers that don't hold
  the prefix. Nothing the kit writes changes it; running in the daytime does (s2's 60–76%).
- **Per-call shape of a build sitting** (same recording): 22 calls; most answers are small (60–950 output tokens), but
  a handful carry the session's thinking — 6.5k, 6.7k, 6.8k, **15.9k** (449 s), 7.3k, 5.5k output tokens, ~97%
  reasoning. Time-to-first-byte 0.6–2 s on a cache hit.

- **One session vs sittings, think size** (same brief, same evening): o1 (one session, taught) designed the whole app
  in one 171 KB / 30 min think before writing a component (stopped by the watchdog; not a loop, 1.0% repetition);
  q6 (one part per sitting) never thought past 69 KB. With the whole plan in front of it, Large 4 designs everything
  first; a fresh sitting with one part in front of it doesn't. A silence watchdog in minutes is speed-dependent: at
  50–90 chars/s a productive 150 KB think needs 30 min.

- **Where the time goes** (`anatomy.mjs`, 24 sessions): thinking 82–95% of wall; tools 0.1–2 min per session; the
  model's silence after a tool result (prefill + queue) median 2–9 s per call.
- **Think speed by hour (CEST), median chars/s over thinks >20 s:** 13:00 259 · 13:30 206 · 14:00 170 · 14:30 204 ·
  15:00 199 · 15:30 161 · 16:00 138 · 16:30 159 · 17:00 97 · 17:30 129 · 18:00 169 · 18:30 186 · 19:00 97 · 19:30 98 ·
  20:00 50 · 20:30 50 · 21:00 72 · 21:30 49 · 22:00 51 · 22:30 50. (A think's span is createdAt→updatedAt of its
  `reasoning` event.)
- **What Vibe sends Large 4** (recorded through the proxy, `rec-smoke`): `POST /v1/chat/completions` with
  `model: "mistral-large-4"`, `temperature: 1.0`, **`max_tokens: null`**, `stream: true`, `tool_choice: "auto"`,
  **`reasoning_effort: "high"`**, 13 tools (Vibe's skill, edit, grep, read_file, todo, write_file + 7 `nodegx_*`), and
  `metadata` {agent_entrypoint "programmatic", client_name "vibe_programmatic", **user_plan "Pro"**, **call_type
  "main_call"**, **call_source "vibe_code"**, session_id, **a fresh message_id per call**, os, versions}. The answer's
  `usage` includes `prompt_tokens_details.cached_tokens`, `completion_tokens_details.reasoning_tokens` and
  **`service_tier: "standard"`**. First call of a session: 8,911 prompt tokens, 0 cached; 2.4 s to the first byte.
- **Vibe's other calls to Mistral:** `GET /v1/connectors/bootstrap` (once, 22 KB answer), `GET /v1/users/me`, and
  **`POST /v1/datalake/events` — telemetry, several per session (~3 KB each)**. Rate-limit headers seen:
  `x-ratelimit-limit-read-minute: 200`.
- **The hook mechanics** (verified): a `pre_tool` deny reaches the model as the tool's error text; Large 4 read it,
  summarised and stopped every time (q4, q6). It also *read the hook's source* when it wanted to work around it (q5).
- **Skills:** listed in the legacy system prompt, loaded with the `skill` tool; Large 4 loaded all three first thing
  in q5 and q6, unprompted beyond AGENTS.md naming them.

## s4's new measurements (2026-10-14, daytime 09:10–14:00 CEST)

- **Daytime speed and cache:** thinks at 306–406 chars/s (o2 09:14–09:24) — faster than s3's afternoon (130–260);
  every round cached 85–91% of input (s3 evening 9–41%). A whole-app design think: 103 KB in 5.6 min (o1's 171 KB took
  30 min at evening speed). The evening was load, not the kit.
- **One taught session finishes by itself** (R32 holds): o2 52 min / 2 sittings (hand-over at 100 calls), Q1 56 min /
  3, L1 90 min / 2 — all `# Done` without the lab. Per round $3.49–5.12 list.
- **The money, read in the console:** €30.90 (09:12) → €34.49 (10:47) over $7.10 list counted by the recorder — read
  then as "list $ halved, number for number". 🔴 **Superseded in s5:** the recorder ran low (RECORDERTAIL — it lost
  the usage of calls whose last stream line was over 8 KB; L1's $2.29 vs Vibe's $2.70 was that), so the ratio was
  computed against too small a sum. See s5's reading.
- **Large 4 reaches for a tool with the wrong shape, and routes around it:** a synonym list as one query
  (NODETYPEWORDS: 15 category calls); `call_tool` called through `call_tool` to describe a tool (NESTEDCALLTOOL: ~10
  refusals, then it found the bare form itself). Both now forgiven server-side.
- **Its checklists are right; its proofs read what the tool lets them.** o2's lines named the flash and the reload; the
  settled `look` and a navigate-instead-of-reload passed them. With `watch` and `reload` (tgz29) Q1 used both 3× and
  came back clean. Teach the tool, not the line.
- **It plans storage like a senior dev:** E1 proved the backend's record contract on a scratch page (create, read back,
  update, delete, export the collection) before building the editor on it.
- **A loop on its own notes:** E1's second session spent 67 min (18 of 23 `edit`s refused, probe files to calibrate
  the tool) patching NEXT.md after the app was done — no rail covers notes (NOTELOOP).
- **Its looks are its own:** L1 chose Fraunces + DM Sans (a Google Fonts `@import` in a CSS Definition), a warm paper
  palette, drawn product vignettes instead of photos — Richard: *"blow me over with a feather."*
- **Against other models, same kit and lab (then dropped, R36):** GLM-5.3 (`zai-glm-5-3`, Vibe's routed default)
  quiz 12/12 in 47 min, Launch 12/17 (its form broken, no font chosen), cached 97–98%; Sonnet in Claude Code quiz
  12/12 in 15 min, editor 13/13 in 27 min.

## s5's new measurements (2026-10-14, 14:22–18:00 CEST, the series on tgz30)

- **The money, re-read against Vibe's own export:** console €51.54 (14:30) → €57.16 (16:06) = €5.62 while R1, R2
  and RL1 ended ($13.66 list by Vibe's export, ≈ $13.5 inside the window) — **≈ €0.42 per list $**, which fits list ÷ 2
  then $→€ (~0.86), not "÷ 2" alone. A quiz ≈ €1.0–1.8 ($2.45–4.39 list); a landing page ≈ €2.9–3.1 ($6.82–7.27).
  Over s4's whole day: €20.64 against ≥ $29.8 list (GLM at unverified prices, E1/Q2 partly unexported) — the same
  ~0.55–0.69 band at most.
- **Daytime held:** every series round finished by itself, cached 82–92%, in 1–3 sittings (quiz 39–66 min, Launch
  87–100 min). Longest think 180 KB (R1) — no stall.
- **The hand-over rail works as built:** R1 reached past its "# Done" once and the hook stopped it; no round looped
  on its notes (NOTELOOP's new cap never fired in the series — it was not needed, which is not the same as proven).
- **Its proofs read what the tool lets them — again:** R3 proved "nothing left over" by watching Canberra while the
  carried green landed, by position, on Sydney (WATCHONE). R1/R2 watched Sydney and were clean. Teach the tool.
- **Its laptop pages have holes and drifts** (Richard, on RL1): a number given a fifth of the page by Columns "1 4";
  eyebrows left of centred headings in all three Launch rounds; L1's price 256 px off its heading. Measured now
  (LAPTOPGAPS: `row-gap`, `alignment-drift`); the agent never saw them — render_report had no such reading.
- **Its type is chosen, sometimes only for headings:** RL2b set Fraunces headings over an Inter body.
- **Infrastructure:** RL2's first sitting died 27 s in — Mistral's stream ended without a finish reason
  (`infrastructure_failure`); "continue" then had no note to continue and headless Vibe stopped on approval prompts.
  One in seven series rounds.

---

## A. Vibe the harness

### Models, config and the kit's config.toml
- Vibe 2.26.1 ships no Mistral Large 4 entry. Its default model is routed to `glm-5-3` (GLM-5.3, a Z.ai model that Mistral hosts), and its only Mistral entry is Medium 3.5. [OWN-018 §3, s1]
- The kit adds Large 4 as a `[[models]]` entry: `name/alias = "mistral-large-4"`, `provider = "mistral"`, `temperature = 1.0`, `thinking = "high"`, `thinking_levels = ["low","high"]`, `max_context_length = 1000000`, `input_price = 1.36`, `output_price = 4.18`, `cached_input_price = 0.14`, plus `active_model = "mistral-large-4"`. [cnx `renderVibeConfig`]
- The temperature 1.0 and `thinking = "high"` were copied from Vibe's Medium 3.5 entry and never tuned. [OWN-018 §3, §12]
- **The sources disagree on Vibe's default temperature.** OWN-018 §3 calls 1.0 "Vibe's defaults for a Mistral model". OWN-019 §4/s2 (later) says Vibe's default is 0.2 and the kit writes 1.0. [OWN-018 §3 vs OWN-019 §4, s2]
- Always pin `mistral-large-4`, never `mistral-large-latest`. On 2026-10-12, `-latest` answered as a different model: it refused `reasoning_effort` with "not enabled for this model". [OWN-018 §3, measured]
- Vibe reads `.vibe/config.toml` from the folder it runs in, and only once the person trusts the folder. It does not read `.mcp.json`. [cnx header comment; OWN-018 PROJECTAGENTS]
- With the Vibe profile, the kit's config sets `default_agent = "nodegx"`, so plain `vibe` in the folder starts the NodeGX agent profile. [cnx; OWN-019 s1]
- The kit's server entry: `npx -y @nodegx/mcp@0.2.0 --allow-writes --profile vibe`, stdio, `startup_timeout_sec = 240`, `tool_timeout_sec = 600`. `--profile vibe` implies `--screenshots-to-files`. [cnx `VIBE_SERVER_FLAGS`]
- Vibe's own MCP defaults are `tool_timeout_sec` 60 s and `startup_timeout_sec` 10 s per server. [VC, unverified]
- The kit writes `permission = "always"` for 7 tools: `nodegx_list_projects`, `open_project`, `create_project`, `list_examples`, `get_example`, `find_tools`, `call_tool`. [cnx `VIBE_ALLOWED_TOOLS`]
- Config keys are named `[tools.<server>_<tool>]`, and the agent sees the tools as `nodegx_<tool>` on legacy, e.g. "nodegx_call_tool". [cnx; OWN-018 §10 quote]
- A user config can replace Vibe's built-in `mistral` provider with `[[providers]] name="mistral", api_base, api_key_env_var, backend="mistral"`. Layers merge by name and the higher layer wins whole. The lab uses this to point Vibe at a recording proxy. [round-kit.mjs `--record` comment, s3]
- `enable_update_checks = false` and `enable_auto_update = false` are config keys the lab sets in the user config. [round-kit.mjs]
- An exported `MISTRAL_API_KEY` wins over `~/.vibe/.env`. [OWN-018 §15, Mistral docs]
- Two kinds of key exist. A subscription user makes theirs under Code › Vibe CLI. A pay-as-you-go user makes theirs under Organization › API keys. [OWN-018 §15, Mistral docs]
- Vibe is included in Le Chat Pro and Team. [OWN-018 §15, Mistral docs]
- Use the wrong key and a round draws on API credit instead of the plan: v1 did this. With the Vibe Code key, Richard watched the allowance rise during v1b. [OWN-019 s1]
- R30 economics: about €20/month buys €255 of usage, and the allowance is about €255/month. [README R30; OWN-019 s1]
- There is no API that reports how much subscription allowance is left (#1161). [VC, unverified]

### Legacy vs unified harness
- 2.26.0 made the unified harness the default. `--legacy-harness` is the only way to choose legacy, it works on the command line only, and the community calls it a "temporary escape hatch". Plan for legacy going away. [cnx comment; VC, unverified for "temporary"]
- The default harness (code-mode, `mistralai_vibe_local_harness`) has the model write TypeScript that calls tools inside a `run_typescript` sandbox. [OPAQUEERRORS bug]
- On the default harness, an MCP `isError` answer reaches the model as `mcp_tool_error: The MCP tool returned an error`, and a client-side schema refusal as `argumentsValidationErrors: [{}]`. The server's diagnostics never arrive (#1227). [OPAQUEERRORS, control: same refused `open_project`, default vs legacy, s1]
- On legacy, the same refusal reaches the model as the server's whole message. [OPAQUEERRORS control, s1]
- In OWN-018 sitting 2, on the default harness, 11 of 17 staged operations were refused and the model never saw why: about 61 min, $1.86 real ($3.43 Vibe). [OWN-018 §7]
- The default harness also refused two cloud-function calls with `argumentsValidationErrors: [{}]` before they ever reached the server. [OWN-018 §7]
- The default harness defers MCP tools behind `search_tool_functions` and names them `mcp_nodegx.<tool>`. [OWN-018 §5, smoke s1]
- `call_tool` answers a refusal as `{ok:false, tool, error}` rather than as an MCP error, so the default harness shows it. The bootstrap tools called directly are still opaque there. [LISTCHANGED fix 4a18723fe; OWN-018 §12]
- On legacy, a reply with no tool call ends the run (`_loop.py` ~2200). v1b measured this. [VC; OWN-019 v1b]
- On legacy, a `post_agent` hook can send the agent back (`_loop.py:2214`). [OWN-019 s3, verified in source]

### Thinking, temperature, max_tokens
- On legacy, `thinking = "low"` sends `reasoning_effort: "none"`, and `medium`, `high` and `max` all send `high` (`llm/backend/mistral.py:257`). [VC; the low→none half is also in the cnx comment]
- `thinking = "high"` sends `reasoning_effort: "high"`. The OpenCode runs that graded 12/12 sent no effort at all. [OWN-018 §15, read from source]
- Legacy sends no per-call `max_tokens`. `max_output_tokens` reaches the unified harness only (`config/models.py:476`: "Unified Harness runtime only"). [OWN-018 §15; OWN-019 s1; LONGTHINK bug, read from source]
- On legacy, the per-call `max_tokens` can be set only through the app-server protocol. [LONGTHINK bug, source]
- `--max-tokens` is a total for the whole session, checked between turns. It never cuts one answer. [LONGTHINK; VC]
- So nothing the kit can write caps one think on legacy, and a runaway think runs to Mistral's own limit. [LONGTHINK, source]
- A cap on the unified harness would not rescue a long think either: an answer cut at the cap is appended as it stands, and an answer with no tool call ends a `-p` turn. [LONGTHINK bug]
- Legacy also does not send `top_p` or `api_stream_idle_timeout`. [VC, unverified]
- `api_timeout` is 720 s. [VC, unverified]
- #1242 (open): `mistral-large-4` refuses `temperature=0` unless `top_p=1` is also sent, and legacy cannot send `top_p`. [VC, unverified]

### Compaction and context
- On legacy, compaction is checked before every step. The threshold is the per-model `auto_compact_threshold` if it is below the window, else 80% of `max_context_length`, else 200k. A global threshold at or above the window is ignored. [VC; OWN-018 §15 read from source]
- With the kit's `max_context_length = 1000000` and no `auto_compact_threshold`, compaction sits near 800k, which in practice means it never compacts. [OWN-018 §15; VC]
- Third parties say Large 4 serves a 524,288-token window, which would put an 800k compaction point past the real window. [VC, unverified]
- The kit still writes 1,000,000 with no threshold. The candidate value is about 118k, near OpenCode's compaction point. [cnx; OWN-019 §4]
- Vibe cuts a tool result at 40,000 characters and saves the full result to a file the agent can read. [OWN-018 §5, smoke]

### Permissions, trust and the folder
- Permissions match exact tool names; there are no globs. An MCP tool defaults to "ask", and has since 2.25.5. [cnx comment; VC]
- In `-p`, an "ask" is answered no ("User cancelled the operation") and that ENDS the run. [OWN-018 §8–9, kit smokes 1–3]
- A configured `"never"`, or a denylist hit, is a skip ("permanently disabled") that the run survives. [OWN-018 §9, smokes]
- `--disabled-tools 'bash*'` disables nothing, because the shell is `file_system.bash` (and `process.*`); the first smoke agent ran `jq`. A regex form `re:.*(bash|powershell|process).*` does work: the call is answered "denied". [OWN-018 §5, smoke s1]
- `bash` ignores a configured "never" and asks per command, so the lab doesn't offer shells at all: it passes `--disabled-tools` for bash, git_bash, experimental_bash, windows_shell, web_fetch and web_search. [OWN-018 §9; round-kit.mjs]
- Vibe's `grep`, `read_file` and `web_fetch` are not confined to the folder. Round 2 grepped the lab's scratchpad and `/Applications`, and fetched `opennoodl.dev/schemas/*`. [OWN-018 §7, round 2]
- Vibe checks a denylist before the workspace boundary. The denylist uses fnmatch, which has no negation but does have `[!…]`. [round-kit.mjs comments, s1–s2]
- Vibe's own scratchpad (`HOME/tmp/vibe-scratchpad-…`) is checked first and is always writable. [OWN-019 s2 v5/v6; round-kit.mjs]
- `--trust` lets a `-p` run read the project's `.vibe/` and AGENTS.md; without it they are ignored. A person accepts trust when Vibe asks. [VC, unverified; the lab always passes `--trust`]
- A `.vibe/hooks.toml` needs trust. [VC, unverified]
- The tested setup was the sealed lab: no `--auto-approve`, with file tools on `"always"` plus a denylist of everything outside the lab. Smoke 3 put a canary outside the folder; `read_file`, `grep` and a subagent read it 0 times, and the run survived. [OWN-018 §9]
- s2 found the lab's own root was unsealed: v5's stray write and v6's read of `home/.npm` were "asks" and ended the run. Now fixed with `<root>/[!w]*` and `<root>/work/[!a]*`. [OWN-019 s2]

### Agents, AGENTS.md, prompts
- Vibe sends an agent profile's `instructions` only on the unified harness. On legacy the build steps never reached the model (smoke 4). Moved into AGENTS.md, smoke 6 recited all six. [OWN-019 s1]
- On legacy, `system_prompt_id = "name"` loads `.vibe/prompts/name.md`, which REPLACES the base system prompt. Not tried here. [VC, unverified]
- AGENTS.md is read fresh at every session start: the user-level file plus the project ones up the trust chain, with no size limit on legacy. [VC, unverified]
- #626 (open) says AGENTS.md is followed erratically. That was not what was seen here: Large 4 followed AGENTS.md "to the letter". [VC; OWN-018 §10]
- The kit's agent file is `.vibe/agents/nodegx.toml`, with `display_name`, `description` and `disabled_tools = ["task"]`. Vibe's `task` subagent spent 265 s listing a folder in one smoke round. [profile `agents/nodegx.toml`; OWN-019 s1]
- Vibe has `/clear` and `/new` in interactive mode. The kit's hand-over tells the person to "Type /clear, then "continue"". [OWN-019 s3; profile AGENTS.md]

### Headless `-p`
- `vibe -p` stops at the agent's first final answer. A reply without a tool call is that final answer, where an interactive person would type "keep going". [OWN-018 §4; OWN-019 v1b]
- 2.26.1's headless system prompt adds, on `-p` only: "Complete the entire task in a single pass. Produce a final, complete result. Override any earlier instructions that say to wait for confirmation or ask the user." The line reference is given as `system_prompt.py:357` (OWN-019 s3), `:351-358` (VC) and `:430` (OWN-019 q5, the later entry). An interactive session never sees this line. [OWN-019 s3, verified in source]
- Exit codes in 2.26.1: 0 finished, 1 config, 2 infrastructure, 3 a turn/token/price/deadline/length limit, 4 aborted. Exit 2 was measured on q1 and q2 (`infrastructure_failure`, `incomplete_stream`). [VC; OWN-019 s3 q1/q2]
- New in 2.26.1: `--time-limit`, `--prompt-file`, `--output-dir`. The lab uses `--prompt-file`, `--output streaming`, `--output-dir`, `--max-price`, `--max-turns` and `--workdir`. [VC; round-kit.mjs]
- `vibe -c` continues the last session; a person used it to repair sitting 2. [OWN-018 §7]
- #1239/#1247 (open): the Rust CLI rolling out with 2.26.1 refuses `--resume` together with `-p`, and misses `.vibe/prompts` under `--workdir`. `VIBE_CLI=python` keeps the Python CLI. The lab runs `uvx --from mistral-vibe==2.26.1`, which is the Python package. [VC, unverified]

### Skills and hooks
- Skills live at `.vibe/skills/<name>/SKILL.md`. 2.26.1 lists them in the legacy system prompt and loads them with the `skill` tool. In q5 and q6 the model loaded all three kit skills unprompted. [OWN-019 s3]
- Hooks live in `.vibe/hooks.toml` as `[[hooks]]` entries with `name`, `type` (`pre_tool`, `post_tool` or `post_agent`), `command`, `timeout` and `description`. [profile hooks.toml; OWN-019 §2]
- A hook gets JSON on stdin: `{transcript_path, cwd, tool_name, tool_input, …}`. To deny, it exits 0 and prints `{"decision":"deny","reason":"…"}`. [profile hand-over.mjs; VC]
- A `post_agent` deny comes back as a user message, with at most 3 retries per hook per user turn; a `-p` run is one turn. #1216: the hook's `system_message` is not shown in the TUI. [VC; the mechanism verified at `_loop.py:2214`]
- Vibe saves the transcript after every model step, with `meta.json` (`start_time`) beside it. Session folders are named `session_YYYYMMDD_HHMMSS_id` in UTC. [profile hand-over.mjs comments]
- The kit's hook is a `pre_tool` hook (`hand-over.mjs`). At 100 tool calls it asks for a hand-over. Once this session has written any app's `docs/NEXT.md`, it denies every tool except `read_file`, `grep` and writes to `docs/*.md`. It fails open. [profile hooks.toml + hand-over.mjs, tgz27]
- When the hook denied a call, Large 4 summarised and stopped, with no argument and no workaround (q4 part 1, q6 plan). [OWN-019 s3]

### MCP handling
- Vibe ignores `tools/list_changed`: the tool namespace is built once per session (#1240). In round 1 the agent created the project and then spent 10 turns looking for tools. A control on legacy, after `create_project`, still named 6 tools. [LISTCHANGED; OWN-018 §7]
- The server advertises 6 tools unbound and 24 bound; `--all-tools` gives 116 bound, but a client that never re-lists sees 6 either way. [LISTCHANGED bug, MCP SDK]
- Large 4 used `call_tool` straight away: "the newly revealed tools aren't in my static tool list, so from here on I'll call everything through `nodegx_call_tool` (as the AGENTS.md anticipates)". [OWN-018 §10, round 3]
- Legacy keeps text blocks only and drops images. When a tool returns `structuredContent`, only that reaches the model (`core/tools/mcp/tools.py:116`). [VC, unverified]
- The kit runs the server with `--screenshots-to-files` anyway: `render_report` writes to `.previews/render` plus a manifest, and `drive_page` to `.previews/drive`. [IMAGECACHE; cnx]

### Cost accounting, journals, telemetry
- **What Vibe's `cost_usd` counts has changed over the sessions:**
  - Session 1: Vibe's export said `cached_input_tokens: 0` and priced every token uncached, so `cost_usd` and `--max-price` read about 3× the real spend. The per-step journal had the real cached counts (62,856 of 82,299). [OWN-018 §5]
  - The kit now writes `cached_input_price = 0.14`, so `cost_usd` should count the cache. The s2 "list count ignores the cache" note was written before anyone checked that. [VC; flagged to re-check]
  - **Verified (s3): Vibe's `cost_usd` counts the cache, at the kit's prices.** q4 part 1: (2,653,639 − 529,620) × 1.36 + 529,620 × 0.14 + 55,789 × 4.18 per M = $3.1960 = Vibe's figure to the cent. So "Vibe list ≈ 2× real" is the launch-sale discount (sale $0.68/$0.07/$2.09 vs the kit's list $1.36/$0.14/$4.18) — it ends around 2026-10-20, after which Vibe's figure *is* the real cost. The earlier "list count ignores the cache" note was wrong once the kit wrote `cached_input_price`. [s3, arithmetic on export.json]
- The lab reprices at the launch-sale rates: $0.68/M input, $0.07/M cached, $2.09/M output (`peek.mjs`, `round-kit.mjs`). [OWN-018 §5]
- `--max-price` caps on Vibe's own count. It stopped round 3 at $6 (real $3.08) and v10 at its last step ($6.30 list). [OWN-018 §10; OWN-019 v10]
- `--output streaming` writes `agent.jsonl`, which stamps every event with `createdAt`/`updatedAt`. Event types: `reasoning` (one think), `effect` (one tool call, with status and output), `notice` (hook decisions). `export.json` holds the tokens and `cost_usd`. [anatomy.mjs header, s3]
- Vibe writes a think to the journal (`HOME/.vibe/logs/session/<s>/messages.jsonl`) only when the think ends, so a long think looks like silence. [OWN-019 s2 LONGTHINK re-measure; round-kit.mjs]
- Vibe doesn't inject the `todo` list into the prompt. [OWN-019 s3, cache paragraph]
- Vibe reads `Retry-After`, but Mistral sends `x-ratelimit-*` (#1133). [VC, unverified]
- Rate-limit issues: #1235 (429 retry loop, then a silent crash, on large-4) and #760 (hang after a rate limit). Other stalls: #1116 (a reasoning-only turn, about 1 in 16, on GLM), #705, #1244 (TUI deadlock in 2.26.1). [VC, unverified]
- Telemetry: none of the sources measure or mention it. The lab only turns off update checks and auto-update. [grep of sources]

## B. Large 4 the model

### What it does well
- It follows AGENTS.md: it chose the NodeGX path unprompted ("I'll build this as a NodeGX app") and scoped well. [OWN-018 §7, round 1; §10 round 3]
- It corrects itself in one turn when it can read the refusal ("The validator is precise"). Round 3 staged 17/17 components after 2 refusals and got the cloud functions right with 0 errors on the first try. [OWN-018 §10]
- It reasons about the app, not just the format: String ids vs pointers, and double-posting from a button plus a trigger. [OWN-018 §10]
- It chose the cloud `modelrequest` node pointed at Mistral's OpenAI-compatible URL on its own. [OWN-018 §7]
- It found its own bugs with controlled drives. Run 4: four drives, and it stated the FANOUT rule exactly. Round 3: `render_report` found three real bugs. v2: it found its `ontrue`/`onfalse` gate fault. [OWN-018 §10, §14; OWN-019 v2]
- On the fixed runtime, its first OpenCode build graded 12/12 with the app unchanged; both earlier failures were NodeGX defects (COUNTERZERO ×2). [OWN-018 §14 run 1]
- It designs well: the playful preset, For Each over an AnswerButton component with inputs (the list node Sonnet skipped), 0 validation errors. [OWN-018 run 1; OWN-019 v2]
- It used the LOCALKEEP line once it was in the notes (`backend: none`, `localStorage`). [OWN-019 v2]

### Long thinks: sizes, speeds, loops
- Single steps run long: 3–5 min (s1 sitting 2) and 3–16 min (round 3). [OWN-018 §7, §10]
- A think that finishes writes 9–17 KB/min, and the longest productive thinks ran up to 10.1 min: v3 151 KB in 9.0 min, pk2 134 KB in 10.0 min, pk1 91 KB in 10.1 min. [LONGTHINK re-measure, s2]
- **v4 and v8 were stopped by the lab, not the model.** The 12-minute watchdog stopped v4 (172–175 KB, about 44k tokens, at 11.8 min) and v8 (143–145 KB at 12.4 min) while they were still writing at 14.5 and 11.5 KB/min. [LONGTHINK; OWN-019 s2]
- What the long thinks were about: plan-operation order (v4, "chicken-and-egg"), designing every component and its cross-wiring before staging anything (v8), and port-level wiring in a plan sitting (q1, 21 min in one answer). [OWN-019 s2, s3]
- Longest thinks in other rounds: v9 98 KB (after the one-answer-one-tool line), q1 84 KB longest finished, q2 sitting 4 88 KB, q4 part 1 61 KB. [OWN-019 s2–s3]
- v1 sat 32 min in one step on the plain kit with the wrong key. It was never re-measured and is still unexplained. [OWN-019 s1; LONGTHINK]
- v11 was a real loop: one think of 282 KB over 29.6 min, debugging why its own `tappedIndex` read 0. [OWN-019 s2]
- A loop can be measured. In the last two thirds of v11's think, 100% of 8-word phrases repeat and there are 74 doubt words per 10 KB. Productive thinks run about 1% repeated (0.2–8%) with 22–30 doubt words per 10 KB. [OWN-019 s2]
- In OpenCode the same habit hits the 32k-token output ceiling instead: run 4 thought 117,000 chars after a compaction with no tool call; run 10 thought 129,000 chars while planning. Both ended on `length`. Run 1 had a 24,484-token step that fitted. [OWN-018 §14]
- In OpenCode, `length` at a 16,384-token output cap ended runs 2 and 3. That was the lab's own setting, not Mistral stopping early. [OWN-018 §14]

### Low thinking, temperature, malformed output
- `thinking = "low"` (v5) was worse. In 93 s and 2.7k output tokens it sent malformed `call_tool` describe probes (15 in the s2 text, 36 in the table; the sources differ), then wrote to a scratchpad path it invented, and that refusal ended `-p`. At `high` (v2, v3) it never did either. [OWN-019 s2]
- OpenCode with reasoning off (run 5, `--variant none`) graded 2/12. It was fast and cheap per step (85% cached) but sloppier: per-row values never reached the list items. [OWN-018 §14]
- At temperature 0.2, v7 graded 12/12 with no stall but showed carryover and ran only about 3 drives (v3 ran 110 steps). v6 at 0.2 was inconclusive because the lab was unsealed. [OWN-019 s2]
- v9 at 1.0 showed the same carryover as v7 at 0.2, so carryover is not a temperature effect. [OWN-019 s2]
- Degenerate tool calls happened at default temperature in OpenCode runs 6 and 7: malformed JSON with tabs repeating until 32k. [OWN-018 §14]

### Reading habits
- It reads everything before it writes. Round 3 made 53 `call_tool` reads (26 single-tool `describe`s) and read 13 examples before its first component, about 45 min in. [OWN-018 §10]
- READWASTE: s1 sitting 2 read 651k chars (about 163k tokens) and used about 16%. Waste was 51%, and 19% of all characters were two-space JSON indentation. [READWASTE; OWN-018 §11]
- It searches in sentences: 5 of 6 `list_examples` searches found nothing with substring matching. [READWASTE]
- It reads the same answer twice (`get_project_info` 49k, `get_style_vocabulary` 55k). [READWASTE]
- It goes to the runtime's source. v6 tried to read the npx cache "to verify `isTrueEv` and how For Each republishes item signals"; the ask ended `-p`. [OWN-019 s2]
- Mining 15 journals (about 3,000 question sentences) found four questions the notes never answered. Each recurred across rounds: whether a row's values have arrived when its signal fires (8 rounds), a row index (11), whether a signal carries a value (12), how rows are matched (11). For Each's notes now answer all four. [OWN-019 s3]

### Output habits
- It writes big batches: one 17-operation plan in s1, so one refused batch costs a lot. [OWN-018 §7]
- It writes `stringlist` parameters as JSON arrays (2 of 2 rounds) and fixes it in one turn. [STRINGLISTARRAY]
- It invents plausible names: `p-clientId` (the right prefix is `pm-`), a `description` argument on `create_project` (2/2 rounds), `width` on a content-sized Group, `dataAttributes` as an array. [OWN-018 §7; READWASTE]
- It claimed to probe backend port 8581 while its backend was on 8578. The agent said so; it was not measured. [OWN-018 §10]
- It wrongly theorised that a second Evaluate with an unchanged `true` stays silent. The runtime harness shows three evals give three On True. [OWN-018 run 8]

### Ending runs and following the process
- It ends a `-p` run on a sentence of intent. v1b ended on "I need to find where that port comes from" with no tool call. [OWN-019 v1b]
- Headless pressure beats AGENTS.md. In q2 sitting 1: "Since you asked me to build it all without waiting, I'll run the whole process in this pass". The brief's "just build it", plus Vibe's single-pass line, overrode the process. [OWN-019 s3]
- q3 wrote the four notes and then carried on into building part 1. Words got the step finished, not the sitting stopped. [OWN-019 s3]
- q5 held NEXT.md back to keep building: "I need to understand the folder's one-step-per-sitting hook … and I've been asked to finish the whole build in one pass". It read the hook's source, wrote REQUEST, CHECKLIST and PLAN, and withheld NEXT.md. [OWN-019 s3]
- "PLAN.md: components, values, timings, decisions" read to Large 4 as "design every wire first", which invited LONGTHINK. [OWN-019 s3 q1]
- With the guides, it splits work well. q5 split the quiz into six parts of at most 4 lines. q6 wrote PLAN as a table of six parts, read no examples and tried no building tool in the plan sitting. [OWN-019 s3]
- With "Continue." alone, q2 sitting 2 recognised the plan sitting had been cut off and wrote REQUEST, CHECKLIST, PLAN and NEXT in order, then stopped by itself. [OWN-019 s3]
- It lets the model pick the part size. A part as big as the whole quiz screen (11 lines) took 40 min and 58 calls with 1 write. [OWN-019 s3 q2 sitting 4]

### Driving and looking
- It tests a page opened on its own unless told otherwise. Run 1 drove `page:"quiz"` (42 steps passed) and never pressed Start. [OWN-018 run 1]
- Drive counts vary a lot: run 9 28 drives, run 10 7 (2 renders), v2 15 (49/49 and 17/17 full runs), v3 110 steps, v7 about 3, v10 about 50 (one of 29 steps), v1b 0. [OWN-019 s1–s2]
- Its checks read what is written on screen, not what it looks like or when. Run 8's drives passed but it graded 9/12 with no colour ever on screen; run 10's drives passed with a quarter-second carryover flash. [OWN-019 §2]
- It prefers its own `getComputedStyle` expressions (13 in v2) to the kit's `look` read (2 or fewer). [OWN-019 v2]
- It debugs with read steps once told about screenshots (run 9: variables and text, no screenshots). Earlier runs opened screenshots with `read` (run 8 mid-debug; runs 7 and 10 at the end), and that cost the cache. [OWN-018 §14]
- With the guides it reports measured evidence, e.g. "at 390×844 the Start button measures 342×53 px". [OWN-019 s3 q2 sitting 3]

### Checklist coverage gaps (every real miss so far)
- SAMEVALUE (pk1): its drives pressed Add empty only once, so a second empty Add showing no message went unseen. [SAMEVALUE bug]
- CARRYOVER (v7, v9): no checklist line looked at the moment a question appears. Adding a next-screen line made v10 clean. [CARRYOVER bug; OWN-019 v10]
- AFTERTIMEOUT (v12, 8/12): it drove timing-out and scoring separately, never the brief's whole example. The app's gate re-fired mid-reset, and re-ordering three wires gave 12/12. [AFTERTIMEOUT bug]
- LOCALKEEP (v1b): it scoped a backend for a single-device best score and spent a third of the run provisioning it. In OpenCode (runs 9, 10) it chose `none`, so it is a coin flip the kit has to settle. [LOCALKEEP bug]
- Its own verdict can be wrong where its tools agree and the person's preview doesn't (DUPCHILD/TWOLOADERS). This was seen on Sonnet; the instruments are the same for Large 4. [TWOLOADERS]
- When a gap is in the kit, it fills it from memory. After an OpenCode compaction it rebuilt the answer list from memory and got the order wrong (SUMMARYLOSS, run 7). [SUMMARYLOSS]
- Without starter assets it skips icons ("installing a module just for two glyphs would be gold-plating", run 10), or goes looking with `list_library`, which fails from npm (NOLIBRARY). [OWN-018 §14]

### Infrastructure
- Mistral's stream ended with no finish reason twice in one evening (q1 and q2, exit 2 `incomplete_stream`), and never in s2. [OWN-019 s3]
- Preview-era research says about 50 tok/s, 15–20 s to first token, and 429s on low tiers. None of these were measured here. [OWN-018 §4, unverified]
- Pre-launch research also flagged ending a turn early, long output when reasoning is on, invented APIs, and multi-file coordination. Of these, invented names and ending early were seen. [OWN-018 §4]

## C. Cost and speed

### Prices
- Prices per million tokens. List: $1.36 input, $4.18 output. Launch sale: $0.68 input, $0.07 cached, $2.09 output, ending around 2026-10-20. [OWN-018 §5, §12]
- The kit's config writes the list prices (1.36 / 4.18), with `cached_input_price = 0.14` (inferred here as twice the sale's cached rate). [cnx]

### The cache
- Mistral caches. On the API, a repeat cached 4,076 of 4,903 tokens; Vibe's per-step journal showed 62,856 of 82,299. [OWN-018 §5]
- **IMAGECACHE: any image part in a request turns Mistral's prompt cache off for that request.** Replays (with `max_tokens: 1` and a fresh nonce):
  - no image in history: 26,092 of 43,320 cached
  - two screenshots: 0 of 96,465
  - the same with the 19 revealed tools removed: still 0
  - images replaced by text: 93,676 of 96,100
  - a 1×1 PNG: 0
  [IMAGECACHE bug, OpenCode run 6 requests]
- An inline screenshot stays in the conversation until a compaction, so every later step is full price. Run 6 recovered after a compaction and lost the cache at the next screenshot. [IMAGECACHE]
- CACHE128K (cache 70% under 128k, 5% over) was a misreading of IMAGECACHE: run 1's misses began right after a full-screenshot render. [CACHE128K, status duplicate]
- A tool-list change moves the prompt prefix once (15 → 40 tools diverged at char 4,340), costing one miss per reveal. The tool list never reorders, and requests extend each other by character, compaction included. [CACHE128K; OWN-018 run 6]
- With screenshots kept out of the conversation, the cache held in run 7 (e.g. 96k → 91k cached) until the agent `read` its screenshots at the end. [OWN-018 run 7]

### Cache rates by setup (share of input tokens)
- Sonnet yardstick: 98% (run 0), 98% (s3 check), 97% (Pack It p0). [OWN-018 §14–15; OWN-019 s2]
- Vibe default harness, s1: 84–91% (sitting 2), and 76–91% across s1. [OWN-018 §7, §12]
- Vibe legacy, s1: round 3 47% (3.18M of 6.80M), the list-changed smoke 40%, `v/smoke1` 41%. These predate `--screenshots-to-files`. Whether images explain them on legacy is open; see E. [OWN-018 §10, §12, §15]
- OpenCode:
  - run 3: 75%
  - run 5: 85% before compaction
  - run 9: 81% (4.29M of 5.28M)
  - run 10: 51% (read its screenshots at the end)
  [OWN-018 §14]
- Vibe-kit quiz rounds (s1–s2):
  - v1b 77%, v2 83%, v3 64%
  - v4 37%, v5 86%, v6 47%
  - v7 64%, v8 45%, v9 76%
  - v10 61%, v11 69%, v12 76%
  [OWN-019 table]
- Pack It rounds: pk1 82%, pk2 72%, pk3 64%, pk4 72%. [OWN-019 table]
- The evening of s3: every sitting cached 9–41%. q4 part 1: 20% (530k of 2.65M). q6 part 1: 34%. That afternoon's single sessions had cached 60–76%. No images were involved, and it isn't `todo`. Cause unresolved; see E. [OWN-019 s3]
- At 20% cached, a start page costs what a whole s2 round did. [OWN-019 s3]

### Cost and time per round
- s1 total was about $2.30 real. Round 1 $0.05 ($0.29 Vibe), 17 steps, 2 min. Sitting 2 $1.86 ($3.43 Vibe), 34 steps, 61 min, 4.5M input. [OWN-018 §7; READWASTE]
- Round 3: 85 min, $3.08 real, capped at `--max-price 6`. 6.80M input, 189k output; uncached input was $2.46 of the $3.08. At 90% cached it would have cost about $1.29, or about $1.06 with the READWASTE cuts. [OWN-018 §10, §12]
- OpenCode quiz runs (real $):
  - run 1: $2.26 (2 sittings, 35 + 4 min)
  - runs 2 and 3: $0.21 and $0.18 (cut off by the lab's output cap)
  - run 4: $1.59 (55 + 9 min)
  - run 5: $1.51 (11 min)
  - run 6: $2.06 (capped)
  - run 7: $1.09 (39 min)
  - run 8: $1.35 (24 min)
  - run 9: $1.41 (43 min, 12/12)
  - run 10: $1.20 (2 sittings, 12/12)
  [OWN-018 §14]
- Vibe quiz rounds, Vibe count / about half real:
  - v1: $1.78, 67 min, stalled
  - v1b: $1.25, 23 min
  - v2: $3.20, 46 min
  - v3: $4.90, 64 min
  - v4: $0.35, 23 min
  - v5: $0.28, 1.5 min
  - v6: $0.82, 23 min
  - v7: $2.97, 41 min
  - v8: $0.34, 18 min
  - v9: $2.68, 45 min
  - v10: $6.30, 75 min
  - v11: $4.59, 91 min
  - v12: $2.44, 45 min
  [OWN-019 table]
- Pack It rounds, Vibe count: pk1 $3.95 (63 min, 78 calls), pk2 $4.34 (59 min, 66 calls), pk3 $5.59 (83 min), pk4 $4.49 (55 min). Real cost was about €2–2.80 each. [OWN-019 table; NEXT-SESSION-PROMPT]
- Yardsticks, as API-equivalent cost (not money spent): Sonnet quiz $6.30 (28 min, 85 turns, 17.7M input), Sonnet s3 check $5.07 (22 min, 95 turns), Sonnet Pack It $3.85 (20 min). [OWN-018 §14–15; OWN-019 s2]
- One single-session round sent about 9M input tokens through one session. [OWN-019 R31; README R31]
- Per-sitting costs on the process kit (Vibe list $):
  - q1 sitting 1: 60 min, $0.89, 11 calls, about 54k input per call
  - q2 sitting 1: 4.5 min, $0.06
  - q2 sitting 2: 8.4 min, $0.33
  - q2 sitting 3 (part 1): 17.5 min, $1.47, 29 calls, about 55k input per call
  - q2 sitting 4: 40 min, 58 calls
  - q4 part 1: 53 min, 73 calls, $3.20, a start page
  - q6 plan: 16 min, $0.26
  - q6 part 1: 37 min, 32 calls, $1.34
  [OWN-019 s3]
- Per-part sittings put a whole quiz at about 4–6 h. A YouTuber reportedly one-shot three.js games in Vibe in about an hour for €30 (unverified). [README R32; OWN-019 s3]
- The guides made a part cheaper: q6 part 1 cost $1.34 with 32 calls; q4 part 1 cost $3.20 with 73 calls, without the guides. [README R32]

## D. Levers tried

| Lever | Round(s) | Result | Kept / dropped |
|---|---|---|---|
| `--legacy-harness` (vs default code-mode) | error control s1; round 3; every round since | Server diagnostics reach the model, and it self-corrects in one turn. The default harness hid 11 of 17 refusals. | Kept (the closing words say `vibe --legacy-harness`) |
| `call_tool` resident dispatcher (LISTCHANGED) | round 3 onwards | Every post-bind tool reachable in the same session; refusals arrive as `{ok:false}` | Kept (server) |
| Self-binding folder (LISTCHANGED option 1) | not run | Not built: a server binds once | Dropped |
| `--disabled-tools 'bash*'` | smoke s1 | Disables nothing | Replaced by exact names / `re:` regex |
| Kit `.vibe/config.toml` pinning Large 4 with 7 tools on "always" | round 3 onwards | Stops the routed GLM default; no ask ends `-p` on bootstrap tools | Kept |
| Compact JSON, `list_examples` menu, phrase search, multi-describe (READWASTE) | built s1, used from tgz3 | 19% indentation removed; no before/after round measured on Vibe | Kept (server) |
| `--screenshots-to-files` (IMAGECACHE) | OpenCode runs 7–10; all Vibe rounds | Cache held until the agent opened a picture itself | Kept (Mistral-facing configs only) |
| `drive_page` note: screenshots cost the cache, read steps instead | run 9 | Debugged with reads, 81% cached, 12/12 | Kept |
| OpenCode `limit {context 150000, output 32000}` | runs 2–3 (16k: broke), 4–10 | Compaction near 118k; 16k cut answers off; 32k still hit by runaway thinks (runs 4, 10) | Kept (`opencode.json`) |
| Reasoning off / `thinking = "low"` | OpenCode run 5; Vibe v5 | 2/12 sloppy; v5 sent malformed probes, made a stray write and ended in 93 s | Dropped (stays `high`) |
| Temperature 0.2 (vs the kit's 1.0) | v6, v7 | v6 inconclusive (lab unsealed); v7 12/12 with no stall but about 3 drives and carryover | Not adopted; kit still 1.0 |
| Verbatim request pointer in project notes (SUMMARYLOSS) | run 8 onwards | Order held after a summary | Kept (core) |
| Start-page drive note | runs 4, 9 onwards | Agents test from the start page | Kept |
| Condition / Timer / Function / For Each notes (run-on-change, chain gates, `timerFinished`, same-value, row facts, mid-chain gate) | runs 4–9, pk2+, s3 | Each measured miss now named where the model reads | Kept (core) |
| LOCALKEEP lines (`backend: none` + `localStorage`) | v2 onwards | v1b 0/12 became v2 12/12 (along with the rest of the Vibe kit) | Kept |
| Vibe kit (profile AGENTS.md, `nodegx` agent, `--profile vibe` server) vs plain kit | v1b vs v2 | 0/12 to 12/12, same model, harness and settings | Kept |
| Agent profile `instructions` | smoke 4 | Never reach the model on legacy | Moved to AGENTS.md |
| `disabled_tools = ["task"]` | smoke s1 | A subagent spent 265 s listing a folder | Kept |
| Stall watchdog 12 min → 30 min | v4, v8 re-measured | 12 min was shorter than productive thinks (≤10.1 min) | Lab: 30 |
| "One answer = one component + one tool call" line | v9 | No stall; longest think 98 KB (stalled rounds 142–172 KB) | Kept (as a speed lever, under measurement) |
| Next-screen ("moment it appears") checklist line (CARRYOVER) | v10, v11, v12 | v10 and v12 carryover clean | Kept |
| `--max-price` 6 → 10 for quiz rounds (8 for pk4) | v10 | $6 stopped v10 at its last step | Lab: 10 |
| Process kit, sittings (plan sitting builds nothing) | q1 | Plan sitting thought 21 min about wiring; stream dropped | Reworded |
| Plan notes "in plain words, a file per answer, no node types" | q2 | Notes written well (in sitting 2); sitting 1 obeyed the brief's "just build it" | Kept, then superseded |
| "just build it" = don't ask, not skip the sittings | q3 | Wrote four notes, then kept building | Words alone insufficient |
| `pre_tool` hook closing tools once NEXT.md is written | q4 | Large 4 stopped cleanly on denial | Kept (in R32 form) |
| Three teaching skills (first-day, sizing, when-stuck) | q5, q6 | Six parts of ≤4 lines; part 1 half the cost of q4's ($1.34 vs $3.20) | Kept |
| Hook rails (no building tools in the plan sitting; 60-call cap) | q6 | Plan sitting tried no building tool; part 1 stopped under 60 | Plan lock removed in R32; call cap now 100 |
| R32 one-session taught kit (tgz27: notes, parts ≤4 lines, prove, hand over at ~100 calls or 2 failed fixes) | o1 (not yet reported) | Unmeasured | Current kit |
| `auto_compact_threshold` (≈118k) | none yet | — | Candidate (OWN-019 §4) |
| `post_agent` deny hook as a "no Done until proven" guard | none (mechanism verified) | — | Candidate |
| `system_prompt_id` prompt replacement | none | — | Candidate (VC) |

## E. Open questions

- The low cache on the evening of s3 (9–41% vs 60–76% that afternoon): is it Mistral's side or the shape of the sitting's prompts? Next step is recording a sitting through `record-proxy.mjs --compare`. [OWN-019 s3]
- Was the 40–47% cache on legacy in s1 caused by images? The community says legacy drops MCP image blocks, which would rule out MCP screenshots, but not images the agent opened with `read_file`. Unmeasured. [OWN-018 §12; VC]
- Does Vibe's `cost_usd` now price the cache correctly with the kit's `cached_input_price = 0.14`? Re-check against the lab's `estimatedUsd`. The arithmetic in C suggests yes. [VC; inferred here]
- How does the subscription allowance debit compare with `cost_usd`? There is no API for the allowance left (#1161). [VC]
- Is there a compaction threshold that keeps prompts small without losing the brief? No `auto_compact_threshold` has been tried on Vibe yet. [OWN-019 §4]
- Is Large 4's real window 524,288 tokens or 1M? [VC, unverified]
- Nothing caps one think on legacy. A guard on think repetition would need a streaming read, since Vibe writes a think only when it ends. This is a candidate Mistral issue (R30). [OWN-019 s2]
- v1's 32-minute step is unexplained. [LONGTHINK]
- The unified harness hides error text (#1227), but legacy is a "temporary escape hatch". What does the kit do when legacy goes away? [VC]
- Temperature: is 0.2 better than 1.0 over more than one round? Temperature 0 is blocked by #1242 on legacy. [OWN-019 s2; VC]
- Should the kit use the `post_agent` hook to block "# Done" while a checklist line is unproven? [VC; OWN-019 s3]
- Does R32's one-session kit (tgz27, round o1) hold the process under Vibe's headless "single pass" pressure? Does q6 reach `# Done`, and how does it grade? [OWN-019 s3]
- The headless "single pass" line is only in `-p`. Will an interactive session (AC6, Richard's own run) behave better than the lab? [OWN-019 q5]
- Is AGENTS.md's answer-size line a speed lever over more rounds? [LONGTHINK]
- FANOUT needs a ruling: should a signal's fan-out see its siblings' effects? [FANOUT bug]
- TWOLOADERS is open: `validate_project` and `drive_page` can pass a graph the person's preview refuses. [TWOLOADERS bug]
- NOSTARTERASSETS and NOLIBRARY are open: npm projects have no icons, imagery or Inter, and the library tools fail from npm. [bugs]
- STRINGLISTARRAY is open: teach the comma-string form, or accept arrays? [bug]
- COUNTERZERO's class has not been censused: any getter that reads state a queued parameter sets has the same window. [COUNTERZERO bug]
- The Rust CLI (#1239/#1247) may break `--resume` with `-p` and `.vibe/prompts` under `--workdir`. [VC]
- 429 handling: Vibe reads `Retry-After` while Mistral sends `x-ratelimit-*` (#1133, #1235). No 429 was recorded in these rounds. [VC]
- Telemetry: nothing in the sources. [—]
- AC4 (three clean quiz rounds in a row) is still unmet. AC8 is a Fable 5.1 audit: can Vibe + Large 4 on the subscription be made to work? [OWN-019 §6]
