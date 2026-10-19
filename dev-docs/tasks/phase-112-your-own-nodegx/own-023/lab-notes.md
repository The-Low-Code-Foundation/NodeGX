# OWN-023 lab notes (the running session, Opus 5.5)

Written as it happens. The handoff asks: "If you notice yourself wanting a round to come out a particular way, write
that down." Those lines are marked **pull**.

## 2026-10-19 s1

- 17:45 Step 0: outside checklist by a fresh Opus 5.5 (`stranger.mjs`, `--setting-sources ""`, no MCP, Read/Write/
  Glob/Grep, /Users denied): 22 lines, 40 s, $0.13 API-eq. Saved unedited as `checklist-outside.md`.
- 17:56 Step 2 (early, it needs no plumbing): A+'s harness by a fresh Opus 5.5 given `harness-brief.md` as its prompt
  and an empty folder: `harness/CLAUDE.md`, **8,805 bytes**, 53 s, $0.15. The kit at 0.2.2 for comparison:
  CLAUDE.md 1,420 + AGENTS.md 1,420 + `.claude/skills/nodegx-your-own-editor/SKILL.md` 17,007 (+ the MCP server's
  instructions and tool descriptions, measured in B's transcript).
- Rulings R1–R8 in (task §9.1). R3 = 5 continues, not the recommended 20. R8 = builds tonight.
- Plumbing facts measured:
  - A moved HOME logs Claude Code out ("Not logged in"). So Claude Code keeps Richard's HOME and the round's HOME
    reaches the agent's shell through `CLAUDE_CODE_SHELL_PREFIX` (the prefix gets the whole command as one string;
    `exec /bin/zsh -c "$*"`). Measured: `echo "$HOME"` in the agent's shell = the round's home.
  - Claude Code expands `$HOME` and `~/` with its own HOME when it matches a rule: a `Bash(*/Users/*)` deny refused
    `echo "$HOME"`. Dropped that rule. The Read fence (`Read(//Users/**)`) still refuses `ls ~/` (Claude Code checks a
    shell command's paths against Read rules, with its own `~`). Every refusal is in `audit.json` → `denials`, per
    arm, so a refused `~/` command is counted, not hidden.
  - The agent's shell runs `/usr/local/bin/node` (v20.11.1), npx 10.2.4 — the same for every arm.
  - Mock (zero-cost): plan-asks → MORE → "Continue." on the same session → rate limit waited and resumed (not
    counted) → DONE: 3 sittings, 1 continue, 1 rate-limit resume, 2 planted leaks + 1 climb in the audit.
    plan-never with N=2 → 3 sittings, stop "2 continues used". plan-cap (B path) → $30 + $30 → stop "cap $60", the
    second sitting given $30.00.
  - Real Haiku smokes: /Users reads and another round's root refused by the rules; both still listed as leaks.
  - **Arm B smoke: the NodeGX server failed to connect** (Claude Code's 30 s MCP limit; cold `npx -y @nodegx/mcp@0.2.2`
    = 27.8 s to answer `initialize`, warm 7.8 s, 42.6 MB unpacked). Filed P112-OWN023-COLDSERVER (`kit: create-nodegx`).
- **pull:** my first thought on seeing the server fail was "pre-warm the cache, it's only the lab". That is the
  handoff's named temptation (fixing B's way so B looks like itself). It goes to Richard as a ruling with both costs,
  not into the script on my say.
