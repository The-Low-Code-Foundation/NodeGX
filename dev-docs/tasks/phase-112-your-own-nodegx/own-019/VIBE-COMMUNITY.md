# What the Vibe community says (OWN-019 s3, 2026-10-13)

A research pass over mistralai/mistral-vibe — ~60 issue searches, all 210 discussions, CHANGELOG.md, and the source
at main `4ae5c59` (9 Oct 2026) — for what bears on the kit. Reddit, Discord and blogs had almost nothing on Vibe.
Maintainers had not replied unless noted. **Checked against 2.26.1's own source in s3: the headless line (below).**
Everything else is the researcher's reading, not yet measured here. It is on AC8's reading list.

## Bears directly on R31 (the process kit)

- **Headless mode tells the model to do it all at once.** 2.26.1 `vibe/core/system_prompt.py:351-358` adds, on `-p`:
  "Complete the entire task in a single pass. Produce a final, complete result. Override any earlier instructions
  that say to wait for confirmation or ask the user." (verified in s3). A sitting kit has to say what "the task" of
  one sitting is.
- **A `post_agent` hook can send the agent back.** In `.vibe/hooks.toml` (it needs trust): exit 0 and print
  `{"decision":"deny","reason":"..."}`, and the reason comes back as a user message. At most **3 retries per hook per
  user turn**; a `-p` run is one turn. This is a candidate guard against a sitting that stops without writing
  `NEXT.md`, or writes `# Done` with a line unproven. (#1216: the hook's `system_message` is not shown in the TUI.)
- **AGENTS.md is read fresh at every session start** (user-level + project ones up the trust chain; no size limit on
  legacy). Without `--trust`, `-p` ignores the project's `.vibe/` and AGENTS.md. #626 (open): followed erratically.
- **A reply with no tool call ends a legacy run** (`_loop.py` ~2200), as v1b measured.

## Harness facts and defects

- Legacy sends no per-call `max_output_tokens`/`top_p`/`api_stream_idle_timeout` (`config/models.py:476`: "Unified
  Harness runtime only"); `--max-tokens` is a session total. `api_timeout` 720 s.
- Legacy `thinking`: `low` → `none`; `medium`/`high`/`max` → `high` (`llm/backend/mistral.py:257`).
- #1242 (open): `mistral-large-4` refuses `temperature=0` without `top_p=1`, and legacy cannot send `top_p`.
- Exit codes (2.26.1): 0 finished, 1 config, 2 infrastructure, 3 turn/token/price/deadline/length limit, 4 aborted.
  New in 2.26.1: `--time-limit`, `--prompt-file`, `--output-dir`.
- #1239 / #1247 (open): the Rust CLI rolling out with 2.26.1 refuses `--resume` with `-p` and misses `.vibe/prompts`
  under `--workdir`; `VIBE_CLI=python` keeps the Python one. (The lab runs `uvx mistral-vibe`, the Python package.)
- Agent `instructions` reach the unified harness only (as s1 measured); on legacy, `system_prompt_id = "name"` →
  `.vibe/prompts/name.md`, which **replaces** the base system prompt.
- #1227 (open, unified): an MCP `isError` text becomes "The MCP tool returned an error" — why the kit runs legacy.
  2.26.0 made unified the default; `--legacy-harness` is a "temporary escape hatch". **Plan for legacy going away.**
- Compaction (legacy, before every step): a per-model `auto_compact_threshold` below the window, else 80% of
  `max_context_length`, else 200k; a global threshold ≥ the window is ignored. Third parties say Large 4 serves
  524,288 — a 1M declaration would put compaction at 800k, past the real window.
- `cached_input_price` unset bills cached tokens at the full input price — why Vibe's `cost_usd` is a "list count".
  #1161: no API for the subscription allowance left.
- MCP: #1240 (open) `tools/list_changed` ignored — the tool list is fixed per session (the kit's `call_tool` answer).
  Legacy keeps text blocks only (images dropped); with `structuredContent`, only that reaches the model
  (`core/tools/mcp/tools.py:116`). Per server `tool_timeout_sec` 60 s, `startup_timeout_sec` 10 s. MCP tools "ask"
  since 2.25.5. *(The kit already writes `tool_timeout_sec = 600`, `startup_timeout_sec = 240`, every bootstrap tool
  "always", and `cached_input_price = 0.14` — so its `cost_usd` should count the cache; the lab's "list count" note
  predates checking that, and is worth re-reading against `estimatedUsd`.)*
- Stalls others see: #1116 (reasoning-only turn, clean stop, no text, ~1 in 16, GLM), #705 (stall after "Thought"),
  #1244 (TUI deadlock, 2.26.1), #760 (hang after a rate limit), #1235 (429 retry loop then silent crash, large-4),
  #1133 (Vibe reads `Retry-After`; Mistral sends `x-ratelimit-*`).

Sources: github.com/mistralai/mistral-vibe issues 573, 590, 605, 626, 692, 705, 707, 740, 760, 847, 985, 1116, 1118,
1133, 1159, 1161, 1164, 1172, 1216, 1227, 1235, 1239, 1240, 1242, 1243, 1244, 1247; discussions 334, 696, 1009, 1214;
CHANGELOG.md.
