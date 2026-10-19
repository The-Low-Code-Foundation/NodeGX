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

## 2026-10-19 s1, the builds (step 3)

- Waited 32 min for Richard's encodes (R10). A started 19:00 CEST (CPU 76% idle), A+ 19:36 (80%), B 20:10 (65%).
  Back to back, one evening window, Claude Code 2.1.301, Opus 5.5, kit 0.2.2 (B's server warmed in 5.7 s — the
  cache already held the package from the smokes; R9's cost is the cold 25.8–27.8 s measured before).
- **Each arm ended in ONE sitting, judge DONE, 0 continues, 0 rate-limit waits.** R3's N never came into play.

  | arm | API-eq $ | wall | turns | stack the arm chose |
  |---|---|---|---|---|
  | A bare | 9.25 | 33.9 min | 17 | Express + multer + `node:sqlite`, plain HTML/JS in `public/` ("Hum") |
  | A+ harness | 8.56 | 33.7 min | 150 | Next.js + Prisma/SQLite + Vitest + Playwright, SPEC/REPORT/DECISIONS/verification ("OpenSound") |
  | B NodeGX | 16.48 | 31.0 min | 210 | NodeGX project `openwave` + its local backend ("OpenWave") |

  (A's 17 turns beside 2,033 s: to read in its transcript — likely long tool calls or subagents; not interpreted here.)
- Audit, read by hand (the regex lists URL paths from curl as "leaks"): **no arm touched another arm's root or read
  Richard's files.** A: wrote /tmp/a.txt, b.txt, /tmp/humc; looked for Chrome under /Applications twice (refused).
  A+: Claude Code's own task-output dir + 4 logs in /tmp; `ls ~/Library/Caches/ms-playwright` refused ×3 (the `~`
  misfire, s1 notes above). B: screenshots and a seed script in /tmp/ow-*; **tried to write a Claude Code auto-memory
  file under Richard's ~/.claude (refused)** — A and A+ didn't. No re-run owed (§4.1: only if it touched another arm).
- Gallery: `~/vscode_projects/NodeGX test projects/OWN-023 apps/` — `rounds/<arm>` (copied out of /tmp, minus npm and
  Playwright caches), `arms.json` (the letter map, random), `apps/<L>` served by `serve-apps.mjs` on 5101–5103, each
  the way its own folder says (A `npm start`; A+ README: setup then `npm run dev`, it left no production build so
  `next start` refuses; B `noodl-preview`).
- **Serving facts that are rows, not lab fixes:** the two code arms open on a phone over Wi-Fi as they are (A+'s
  README even says how); B's preview binds 127.0.0.1, and with `--host 0.0.0.0` its page still calls its backend at
  127.0.0.1:8584 → filed P112-OWN023-PHONEPREVIEW. A+ in `next dev` shows Next's "N" badge over its Home tab.
- **pull:** none felt while the numbers came in. Noted the urge to explain B's $16.48 (2× A) by the server's
  instruction overhead before reading the transcript; not written anywhere but here, not interpreted.
