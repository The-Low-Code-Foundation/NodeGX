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

One builder at a time: a plain-code game is served by the agent's own server, and two arms building at once could
drive each other's. Turn 1 = `msg/game.txt` word for word, `--continues 0`.

### Turn 1

| arm (Richard sees) | started (CET) | what came back | min | $ |
|---|---|---|---|---|
| vb (Vibe 2) | 11:28 | **seven questions in one message** (who for, first-screen feeling, device, what it won't do, games loved, what you did in them, what bored you). It says the cave world will be plain canvas code with NodeGX around it for the screens. It loaded `nodegx-first-day`, `nodegx-first-project` and `nodegx-making-a-game` first, then grepped for `# Next session` | 0.4 | 0.04 |
| cb (Cline 1) | 11:29 | **no questions: built the whole game** ("The Glimmer", `submarine/`), all of it plain HTML and JS, menus included. **No `create_project`**: 1 `list_projects`, 1 `find_tools`, 1 `list_examples`, nothing else from the server. Arrow keys/WASD, a four-button pad on a phone. `tools/check.mjs` 10/10 on the rules, `tools/shot.mjs` drives the page at laptop and phone sizes. Ends by naming the guide's three game questions as `> TODO:` in `docs/decisions/000-initial-scope.md` | 46 | 0.32 |

**cb read both guides first and then did the opposite of their first line.** Its first words: *"I'll start by
reading the two skills this folder requires before building anything"*. It called `skills nodegx-making-a-game` and
`skills nodegx-first-project`, then read `traps.md` in three pieces. Then it built. Its `000-initial-scope.md`
answers the guide's four questions itself ("one person, on their own, on a laptop first … a phone held sideways"),
leaves the three game questions as TODOs "written after the first playable version", and gives your brief "word for
word" as a paraphrase: *"Build a browser game: pilot a submarine into a dark sea cave …"*. The brief says "Let's use
nodegx to build my first project". Seal: 23 paths outside the round, all its own `/tmp` scratch (`/tmp/shot.log`,
`/tmp/glimmer-probe` …), moved into `left-in-tmp/` by the audit; one Chrome sandbox hit. Its shell ran `pkill -f
'glimmer-'` several times. That matches its own process names only, but the fence doesn't stop signals.

### Turn 2

- **vb (Vibe 2), Richard's answers** (`msg/vb-2.txt`, 2026-11-04 ~12:05, word for word): me and my kids; *"Calm and a
  little tense, Echo the Dolphin vibes, beautiful but a bit unnerving, the fear of the deep blue"*; phone portrait;
  carte blanche; Echo the Dolphin; *"Discovery, a mix between fun playfulness and the unknown dangers lurking, the
  beautiful visuals and atmosphere"*; *"Repetetiveness, it should increase in difficulty and complexity to keep the
  player hooked"*. Queued after cb (`queue-1.sh`), `--continues 2`.
  **12:16–12:37: built and handed over in one sitting, 21 min, 70 steps, $1.64 (Vibe's own count), judge DONE.**
  "Deep Glow" (`apps/deep-glow`): a NodeGX project (Home → Play, `backend: none`) whose Play page opens a plain-canvas
  world in `game/`. **That world is served by a second server**: Play's Function hard-codes
  `'http://' + window.location.hostname + ':8576/game/'`, so the app works only with `python3 -m http.server 8576`
  running from the project root. The NodeGX app is a launcher with two pages; the game isn't inside it. Hold to dive,
  left/right, collectable creatures (+air), rocks (−air), and a difficulty ramp (the cave narrows 377→211 px, drain
  1.4→2.4, darker). Out of air → depth, creatures, best dive kept in `localStorage` (on the game's origin). It wrote
  REQUEST/CHECKLIST/PLAN/NEXT, and `REQUEST.md` has the brief and all seven answers word for word. 13 game lines and
  3 app lines are marked passed, each with a measured number. It served both on `0.0.0.0` (8575, 8576) and gave a LAN
  address for the phone. The runner reaped both servers at the end of the sitting. Seal: 31 paths outside, all its
  own `/tmp` (a Chrome profile, DOM dumps, logs).
  My look before Richard plays (not shown to him): `game/` at 390×844 headless, the title "DEEP GLOW" runs off the
  right edge and the intro paragraph sits right of centre. This could be the headless window and not the page. His
  phone is the measure.
  Served for Richard: the app `npx @nodegx/preview@0.2.8 . --port 8782` (localhost), the game
  `python3 -m http.server 8576 --bind 127.0.0.1`, both from `deep-glow/`. The arm itself starts 8576, so if Vibe 1
  (va) builds now and reaches for 8576, it finds this one. **Check va's transcript for 8576 before grading it.**
