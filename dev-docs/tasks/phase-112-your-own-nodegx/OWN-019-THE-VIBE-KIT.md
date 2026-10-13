# OWN-019 — The Vibe kit

**Opened 2026-10-13** (OWN-018 s3). Richard: *"Can we not make a special npm kit for people who want to use Vibe and
preload all of the cool things you talked about that we could add? Make a really custom version that we perfect here
over as many sessions as it takes, that makes it purr like a kitten when run in Vibe with Large 4?"*
**Ruled (R29):** its own name over a shared core — *"as long as we can have the right amount of freedom to really
make the necessary changes to perfect Mistral Large 4 and Vibe usage. So if there are some parts of the core npm
package that only work well with Claude and Claude Code, we need to be able to override them when installing the
vibe version."*
**Depends on** OWN-018 (the lab: `round-kit.mjs`, `grade-quiz.mjs`, kit tgz12, everything Mistral taught the kit) and
Richard's Vibe subscription key (`MISTRAL_VIBE_API_KEY` in the repo `.env`, made under Code › Vibe CLI).
**Status: 📋 opened s3 (2026-10-13). Next: AC1, the census.**
**Model:** Opus for the sessions that build and read the rounds. The agent under test: **Mistral Large 4
(`mistral-large-4`, never `-latest`) in Mistral Vibe**, pinned to a version per round (2.26.1 at opening).

## 1. The person sentence

> **Someone who codes with Mistral Vibe runs `npm create nodegx-vibe apps`, starts `vibe` in that folder and says
> what they want in a paragraph. Large 4 builds a NodeGX app, checks it in a browser against their own words, and
> reports line by line what works — with nobody else in the loop.**

## 2. Why

OWN-018 got Large 4 to 12/12 on the quiz in OpenCode (runs 9, 10) on a kit written for Claude, and showed where it
still needs a hand: its own checks read what is *written* on screen, not what it *looks like* or *when* (run 8: its
drives passed, the grader 9/12, no colour ever shown; run 10: drives passed, a quarter-second flash of the last
question's colours); nothing turns the request into a checklist; a think can run away (runs 4, 10); the kit's Vibe
config never compacts and asks for `reasoning_effort: high`. Vibe has the hooks to fix that from the folder — project
`AGENTS.md`, project skills (`SKILL.md`), agent profiles with their own `instructions`, and hooks (pre-tool,
post-tool, post-agent) — and the kit uses none of them yet.

## 3. The shape (R29)

- **`create-nodegx-vibe`** is a thin package: it runs `create-nodegx` with a **Vibe profile**. Every fix to the core
  reaches it; nothing is copied.
- **The profile may override anything the core writes or says**: each file `create-nodegx` writes (`AGENTS.md`, the
  Vibe config, the app's own notes), and the agent-facing text the nodegx server sends (its instructions, tool
  descriptions, guidance, refusals) — through a server profile (`--profile vibe` in the config the kit writes), not a
  fork. Where a sentence only suits Claude, the Vibe profile replaces it; where it suits both, it stays shared.
- **What helps every agent goes in the core**, Vibe first: the checklist and the look step (§4) belong to Claude too.

## 4. What the kit preloads (candidates; each kept only if it measures better, §5)

- **`.vibe/config.toml`, tuned:** Large 4; compaction that fires (an `auto_compact_threshold` near OpenCode's 118k,
  not the 1M window); thinking level and temperature measured (kit today: `high`, 1.0; Vibe's default 0.2; OpenCode's
  12/12 runs sent no effort); the legacy harness; every nodegx tool approved; `--screenshots-to-files` on the server.
- **A nodegx build skill** (`.vibe/skills/…/SKILL.md`), written for Large 4: scope → plan → one component at a time →
  **the checklist** → drive each line → report pass/fail per line before "done".
- **A nodegx agent profile** as the folder's default agent, carrying those instructions.
- **A finish hook** (post-agent), if Vibe's hook can send the agent back: no "done" until the checklist has been
  driven. Measured from Vibe's source before it is relied on.
- **Core, for every agent:** a checklist step — the request turned into lines, each with the `drive_page` steps that
  prove it; a `drive_page` step that reads **what a person sees** (an element's colour, whether it is visible, when it
  changed) without a screenshot (screenshots turn Mistral's cache off, P112-OWN018-IMAGECACHE); starter fonts, icons
  and imagery (P112-OWN018-NOSTARTERASSETS), so apps stop measuring as "a default template".

## 5. The method

- Headless Vibe rounds in OWN-018's sealed lab (`own-018/round-kit.mjs`, on the subscription key), the kit from
  tarballs packed at HEAD, graded by a script the agent never sees.
- **Two briefs at least**: the quiz (`own-018/sentence-quiz.txt`, `grade-quiz.mjs`) and a second, different app with
  its own grader proven on mutants — so the kit is not tuned to one app.
- One change per round, kept only if it measures better (grade, the agent's own report against the grader, cost,
  cache, time, interventions). Finish reasons read first (`length` is a cap, not the model).
- Every defect into `dev-docs/bugs/` as found; every kit lesson for every agent unless it only suits one.

## 6. Acceptance

- **AC1 — the census.** Every sentence the kit and the server send an agent, labelled *shared*, *Claude-only* or
  *needs a Vibe variant*, with the evidence for each label.
- **AC2 — the profile.** `npm create nodegx-vibe` (from a tarball) writes the Vibe files; any core file and any
  agent-facing server text can be overridden by the profile; a test proves an override lands and a non-overridden
  sentence stays shared.
- **AC3 — it checks itself.** On the quiz, Large 4's own end-of-run report flags what the grader flags: proven by
  rounds whose apps the grader fails (or planted mutants), where its checklist goes red on the same lines.
- **AC4 — the quiz, three in a row.** Three fresh headless Vibe rounds grade 12/12, `carryover` clean, finished by
  itself, no intervention.
- **AC5 — a second brief, three in a row**, on its own grader.
- **AC6 — Richard's own.** Richard runs `npm create nodegx-vibe`, opens Vibe himself and builds something of his
  choosing with only what the kit printed; the task closes on his words.
- **AC7 — shipped.** Published to npm with the core (publishing is Richard's step, R11).

## 7. Sessions

- **s1 (2026-10-13, opened in OWN-018 s3):** R29 ruled. Inputs measured this session (OWN-018 §15): Vibe 2.26.1 never
  compacts on the kit's config and sends no `max_tokens` on the legacy harness; Large 4 drove its own app 28× (run 9)
  and 7× (run 10), rendered twice; its checks never read colour or timing; Vibe has project skills, agent profiles
  with `instructions`, and pre-/post-tool and post-agent hooks.
- **s1, built:** the server's Vibe profile (`--profile vibe`, `21f46ca3e`: the census's 29 Vibe-variant sentences
  answered — `call_tool` named in both briefings, reveal hints as `call_tool` calls, screenshot pushes turned into
  `drive_page` proof; a test with a control arm); `create-nodegx --vibe` (profiles/vibe: AGENTS.md, the `nodegx`
  agent as `default_agent`, the server with the profile; no Claude files) — `npm create nodegx-vibe` itself is made
  at publish (a new workspace now would put the shared lockfile out of step); `drive_page`'s `{ read: { look: T } }`
  (`1f8098049`: the settled colour as a word; run 8's apps fail it, runs 9/10 pass — the grader's verdicts).
- **s1, the baseline (v1, the plain kit on tgz12, Vibe 2.26.1, `thinking high`, temperature 1.0): stopped at 67 min.**
  34 min of sound work (everything through `call_tool`, plan → apply → render → drive), then ONE step sat 32 min
  with no output on two open connections — the legacy harness sends no `max_tokens`, so nothing cuts a long think
  off (runs 4 and 10 in OpenCode hit the 32k ceiling instead). $1.78 by Vibe's list-price count. **Key mix-up:**
  the key in `MISTRAL_VIBE_API_KEY` was not the Vibe Code one (Richard replacing it with the key from the Vibe Code
  app), so v1 drew on API credit, not the plan. Lab: `round-kit.mjs --stall-min` (default 12) now stops a round
  whose journal stops growing. **Lever added:** the long-think cap on the legacy harness (Vibe's `max_output_tokens`
  only reaches the unified harness).
- **s1, the key, settled:** `MISTRAL_VIBE_API_KEY` in the repo `.env` must be the key from Richard's **Vibe Code**
  app (the subscription, €255/month allowance), not an Organization API key. With it, Vibe rounds draw on the Vibe
  Code allowance — Richard watched it rise in the console during v1b (2026-10-13). Never use that key outside Vibe
  (the s1 speed probe sent three raw API calls with the wrong key; nothing since).
- **s1, the Vibe kit's agent:** Vibe 2.26.1 sends an agent profile's `instructions` on its unified harness only; on the
  legacy harness (the kit's) the build steps never reached the model (smoke 4). They live in the Vibe kit's
  AGENTS.md now (`8f47ba49e`); smoke 6 recited all six. The agent file keeps its tool settings (`task` off). Kit tgz13
  (`v/tgz13`): create-nodegx at `8f47ba49e`, MCP at `d8572ccdb`, preview = tgz12.
- **s1, v1b — the baseline on the Vibe Code key: 0/12**, finished itself in 23 min, $1.25 (Vibe's list count), 77%
  cached. It scoped the quiz with a backend (`kind: "nodegx"`, a `Score` collection) and spent its first third
  provisioning it (P112-OWN019-LOCALKEEP, filed + notes fixed), then built through plans, **never called drive_page**,
  and ended on a sentence of intent ("I need to find where that port comes from") — in `vibe -p` a reply with no tool
  call ends the run (a person would type "keep going"). The app: question 1 draws; the timer never moves and a tap
  does nothing. So the plain kit in Vibe, as a person gets it today, is far from OpenCode's 12/12.
- **s1, v2 — the Vibe kit (tgz14, same model settings as v1b): 12/12, carryover clean**, finished by itself in 46 min,
  $3.20 by Vibe's list count (~half real), 83% cached, from the Vibe Code allowance. `backend: none` and the best
  score in `localStorage` (LOCALKEEP's line read and used); For Each over an AnswerButton component; 78 nodes, 0
  validation errors. **It checked itself as the kit says:** a 14-line checklist, 15 drives (49/49 and 17/17 full
  runs), every line reported with what it measured, no screenshot opened. Its first drive showed taps doing nothing;
  it found its own wiring fault (the answer gate on `ontrue` instead of `onfalse`), fixed it and drove again.
  It read colours with its own `getComputedStyle` expressions (13) more than the `look` read (≤2).
  **v1b → v2: 0/12 → 12/12, the same model, harness and settings; only the kit changed.**

| round | kit | grade | ended | min | $ (Vibe list) | cached | drives | what it taught |
|---|---|---|---|---|---|---|---|---|
| v1 | plain, tgz12, wrong key | — | stalled (one 32-min step) | 67 | 1.78 | — | 1 | no max_tokens on the legacy harness; the key |
| v1b | plain, tgz12 | 0/12 | itself, mid-work | 23 | 1.25 | 77% | 0 | LOCALKEEP; a text reply ends `vibe -p` |
| v2 | Vibe kit, tgz14 | **12/12** | itself, all lines passed | 46 | 3.20 | 83% | 15 | the kit works |
