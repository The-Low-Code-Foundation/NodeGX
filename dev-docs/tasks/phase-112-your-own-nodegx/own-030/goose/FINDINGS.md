# Goose as a local-model chat host for NodeGX: findings, 2026-10-29

This was a side test from the OWN-030 conversation. Richard asked whether a familiar chat app (Open WebUI, Goose)
could show Studio inside the chat with a local model, the way Claude Desktop does. It belongs with OWN-029 next-step
5 (the `guided_build` door). Setup: Goose Desktop 1.57.0, Ollama 0.40.12, `@nodegx/mcp` 0.2.9 run from the Claude
Desktop .mcpb's folder, Puppy test 3. I drove Goose over CDP (`--remote-debugging-port=9333`) and logged the
traffic with a stdio spy between Goose and the server.

## What was measured

| # | Finding | Evidence |
|---|---|---|
| 1 | **Goose Desktop renders MCP Apps.** `initialize` carries `extensions["io.modelcontextprotocol/ui"]` with `text/html;profile=mcp-app`. Our server logs `client goose-app 1.57.0; renders MCP Apps: yes`. The Goose CLI (`goose-cli`) sends `extensions: {}`. | `handshake-and-calls.txt` |
| 2 | **Studio draws inside the Goose chat** after a direct `open_studio`: the top bar, HOLD, the rail and the project name. **The preview stays blank** because Goose's sandbox forbids eval. Filed as P125-GOOSE-NOEVAL. | `studio-panel-in-goose.png`, `panel-console.txt` |
| 3 | **Ollama's default window is 4096 tokens and it truncates silently.** Goose sends 12.7k tokens (24k once a project is bound, with 34 KB of tool descriptions), and Ollama keeps the last 2,051 (`truncating input prompt limit=2051 prompt=12743` in `~/.ollama/logs/server.log`). The model never sees the person's request, and appears "not to understand". `GOOSE_INPUT_LIMIT` does not change Ollama's `num_ctx`. Fix: a model variant with `PARAMETER num_ctx 32768` (`gemma4-e4b-32k`). | Ollama log |
| 4 | **With 32k, E4B follows plain words.** "Open my NodeGX project called Puppy test 3 and open Studio so I can see it" → `list_projects` → `open_project` → `find_tools("studio")` → `open_studio`, in the CLI and in Desktop. It is slow: about 10 minutes, with 19–25k-token prompts each turn. | run logs |
| 5 | **Goose's Code Mode extension breaks it.** The model must write JS to call tools. E4B ran failing code for 15 minutes and never reached nodegx. Even when Code Mode works, the host sees "run code", not `open_studio`, so no panel is drawn (the same failure as our `call_tool` proxy, CCN-001 s4). Turn Code Mode off for NodeGX. | `spy-desktop-run1.log` (scratchpad) |
| 6 | Goose re-lists tools after `notifications/tools/list_changed` (19 notifications, then one `tools/list`), so the bootstrap reveal works without the Claude special case. | spy logs |
| 7 | `list_projects` is full of lab projects (`own-029-*-r*`). With E2B and no context fix, "Studio" was read as a project name. | run 1 |

## What a person needs today (until P125-GOOSE-NOEVAL is fixed)

- An Ollama model with a ≥32k window (a Modelfile with `PARAMETER num_ctx 32768`). Goose's context meter says
  128k and is wrong about what Ollama runs.
- Code Mode off. The nodegx extension as stdio, with absolute paths (a Dock-launched app has no nvm PATH).
- E4B or bigger. A 2B model in a free chat over this tool surface is the OWN-027 v1 dead end. The product shape
  for 2B is one tool that runs the harness.

## Round 2, same day: one tool, and a working counter in the chat

| # | Finding | Evidence |
|---|---|---|
| 8 | **Goose Desktop does not pass an extension's `envs` from config.yaml.** The spy's start line lists zero NODEGX/CHROME variables in every Desktop run (the CLI's `--with-extension` passes them). The workaround is a launcher script that exports them and execs node; it is `cmd` in the config. | `nodegx-launch.sh` |
| 9 | **Goose reads the skills in `~/.claude/skills` whatever its Skills switch says.** That is 14.5k characters (about 3.6k tokens) of Richard's 22 Claude skills in every system prompt. Not changed: Claude Desktop syncs that folder. | Ollama request capture |
| 10 | **The free-chat benchmark, E4B with the full tool surface, counter request:** it planned well (Text, Button, Group, Counter, "button click → counter → text") and corrected itself from refusals, but its `create_plan` had three operations on one page, it invented `play_tool`, and its stage call carried no nodes. After 25+ minutes and 23k tokens there was still no page. | Goose chats "NodeGX Counter App" |
| 11 | **`build_app` (OWN-031, the server asks Ollama):** E4B made ONE call. The server asked four small questions (kind, words, behaviour, look), then built, validated and applied the counter. "My Daily Tea Counter": + and Reset as asked, "Cups of tea", 0 warnings, about 11 s of server time. The whole turn took about 4 min, nearly all of it the chat model reading its 14k-token prompt. The count went 0 → 3 on three presses and back to 0 on Reset, in the Goose panel. | `build-app-tea-counter-in-goose.png`, `build-app-tea-counter-pressed-three-times.png` |
| 12 | **The framed panel needs Studio's `/panel` page, not `/`.** Framing the full page put the desktop layout (both side panels) into 789 px, and the preview was 150 px wide. The wrapper now frames `/panel` and relays MCP Apps messages both ways, so Studio's own bridge does the handshake. | `framed-full-studio-cramped.png` |

## Code (uncommitted, 2026-10-29)

- `packages/noodl-mcp/src/tools/buildApp.ts`: `build_app` (OWN-031), registered in the `project` group, advertised
  first in bootstrap mode when `NODEGX_LOCAL_MODEL` is set.
- `src/tools/openStudio.ts` + `src/clientApps.ts`: the framed panel for an eval-free host (P125-GOOSE-NOEVAL).
- `src/tools/listProjects.ts`: the cap and `query` (P125-GOOSE-LONGLIST).
- `tests/p125GooseNoEval.test.ts`: 6 tests.
- Goose runs a separate bundle, `dist/noodl-mcp-goose.cjs` (built by esbuild with the package's `build-common.mjs`);
  the shared `dist/noodl-mcp.cjs` is untouched.

## Row 9, fixed on the machine (2026-10-29 16:06, OWN-032 s2 session, Richard: "Goose is your playground")

- Goose 1.57.0 scans `~/.agents/skills`, `<config>/skills`, `~/.claude/skills` and `~/.config/agents/skills`
  (`crates/goose/src/skills/mod.rs`). The home is `dirs::home_dir()`, which reads `HOME`. Nothing in the config turns
  the scan off, so the Skills switch never could.
- Goose Desktop gives its server `HOME = process.env.HOME` (app.asar, `Qt`). So **`start-goose.sh`** starts the app with
  `open -a Goose --env HOME=~/.goose-home`. That folder links every top-level entry of the real home except `.claude`.
  `Library` is a link, so the keychain and Application Support are the real ones, and no keychain dialog appeared.
  `.config` and `.local` are links too, so the config, sessions and logs are the same.
- Measured with `goose skills list`: 22 skills (Richard's, 14.5k characters) with the real home; 2 built-ins
  (`goose-doc-guide`, `web-search`, 104 description tokens) under `~/.goose-home`. `goose serve` runs with
  `HOME=/Users/richardosborne/.goose-home` (read from `ps eww`).
- `nodegx-launch.sh` now exports the real `HOME` first, so NodeGX and its Chrome are unchanged.
- Starting Goose from the Dock gives back the real home. Use `~/.config/goose/start-goose.sh`. Copies of both scripts
  sit beside this file.
