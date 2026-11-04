# OWN-037 — results

Lab: `/Users/Shared/nodegx-lab/own037/<round>` (`turn.mjs`, through OWN-026's `round-vibe.mjs` and `round.mjs`, each
with `--reply`). Kits in `/Users/Shared/nodegx-lab/kits/OWN037-*` (task file, log of 2026-11-04). Which numbered build
carries the guides is in `ARMS.json`; Richard sees Vibe 1/2 and Cline 1/2.

| arm | harness, model | kit |
|---|---|---|
| va | Mistral Vibe 3.0.4, `mistral-large-4` (the Vibe subscription key) | create-nodegx-vibe 0.2.9 |
| vb | the same | va + AC2 (`22333b7fe`) |
| ca | Cline CLI 3.0.71, `cline-pass/deepseek-v4.1-flash-1017`, through the stream tap (retry) | create-nodegx 0.2.8 `--cline`, server 0.2.9 |
| cb | the same | create-nodegx 0.2.9 `--cline` |

## AC1 — the probe ✅ (2026-11-04, 11:24–11:40 CET, $0.10 in all)

`msg/probe-1.txt`: list every skill, quote `nodegx-first-project`'s first heading, ask my favourite colour, stop.
`msg/probe-2.txt`: "Green. Now repeat back, word for word, the question you asked me … and name the first skill you
listed." Rounds `/Users/Shared/nodegx-lab/own037/probe-<arm>`.

| arm | skills listed | heading quoted | reply turn |
|---|---|---|---|
| va | `nodegx-first-day`, `-sizing-the-work`, `-when-stuck` + Vibe's four built-ins | "I have no skill by that name" | ✅ the question word for word, `nodegx-first-day` (`-c`, 6 s) |
| vb | both guides first, then the kit's three + the four built-ins | `# Skill: nodegx-first-project` (see below) | ✅ the question, `nodegx-first-project` (`-c`, 6 s) |
| ca | `nodegx-your-own-editor` only (it searched `/` to depth 6 for the guide) | "I have no skill by that name" | ✅ (chat carried, 6 s) |
| cb | `nodegx-first-project`, `nodegx-making-a-game`, both editor skills | `# Building someone's first app here` ✅ | ✅ (chat carried, 5 s) |

- **vb's heading is Vibe's, not a slip.** It called `skill {name: "nodegx-first-project"}`. Vibe 3.0.4 returns
  `<skill_content …>\n# Skill: nodegx-first-project\n\n# Building someone's first app here…`. Large 4 quoted the first
  heading it was shown.
- **Cline 3.0.71 can't resume a chat headless.** `--id <session>` sets interactive mode, and `--json` then exits 1:
  *"JSON output mode requires a prompt argument or piped stdin (interactive mode is unsupported)"*. Both first tries
  died in 1 s (kept as `probe-c?-sitting2-id-refused/`). This is the binary's own check, read in its bundle. So
  `round.mjs --reply` sends a new chat whose prompt is the conversation so far: each of the person's messages and
  Cline's last message of each turn, then the reply (`sittings/<k>/prompt.txt`). That is the text a person's chat
  window shows, without the tool calls. A Vibe reply resumes the real session (`-c`), tool results included. **The
  two harnesses' turn 2 differ in that way, and the results must say so.**
- Both Cline arms read the folder with `run_commands` first. cb called `skills {skill: "nodegx-first-project"}`.

## AC3 — the game
