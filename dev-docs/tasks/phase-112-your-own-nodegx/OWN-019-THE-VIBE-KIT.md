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
**Status: 🟡 s1 done (2026-10-13). The Vibe kit grades 12/12 in Vibe (v2) where the plain kit graded 0/12 (v1b) — same model, harness and settings. AC1 (census) met. Next: AC4, two more v2 rounds; then a second brief. Handoff: `own-019/NEXT-SESSION-PROMPT.md`.**
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
- **AC8 — the audit (Richard, 2026-10-13, s2).** When the experimenting is finished, a **Fable 5.1** session audits the
  whole record — every round's journal, grade and cost, the kit's levers and what each measured, the bugs, the lab's
  own faults (s2 found two: the unsealed root and the 12-minute watchdog) — and answers one question: *can Vibe +
  Large 4 on the Vibe Code subscription (R30) be made to work, or not?* Its options include the Mistral issues R30
  keeps (no PRs: the repo takes no code). Richard rules on its answer.

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
| v3 | Vibe kit, tgz14 | **12/12** | itself, all lines passed | 64 | 4.90 | 64% | 110 steps | AC4: 2 in a row |
| v4 | Vibe kit, tgz16 | — | **stalled** (one think, 12+ min, 175 KB) | 23 | 0.35 | 37% | 0 | LONGTHINK; the series breaks |
| v5 | tgz16, `thinking low` | — | itself, before authoring | 1.5 | 0.28 | 86% | 0 | low is worse: 36 malformed probes, a stray write ended `-p` |
| v6 | tgz16, temperature 0.2 | — | a refused read ended `-p`, before authoring | 23 | 0.82 | 47% | 0 | inconclusive; the lab's root was unsealed |
| v7 | tgz17, temperature 0.2, sealed lab | 12/12, **carryover** | itself | 41 | 2.97 | 64% | ~3 | 0.2: no stall, fewer drives, the last question's colours flash on the next |
| v8 | tgz17, kit defaults, sealed lab | — | **stalled** (one think, 145 KB) | 18 | 0.34 | 45% | 0 | LONGTHINK again at the defaults: designing the whole app in one answer |
| v9 | tgz18 (one answer, one tool call) | 12/12, **carryover** | itself | 45 | 2.68 | 76% | — | no stall (longest think 98 KB vs 142–172 KB stalled); CARRYOVER |

- **s2 (2026-10-13, Opus):** kit tgz14 reused for v3 (create-nodegx and MCP byte-identical in source to HEAD at the
  time; the runtime had moved only in Aggregate Records, which the quiz never touches). **v3: 12/12, carryover clean,
  finished by itself** in 64 min, $4.90 by Vibe's list count (~$2.45 at the cached rate, 64% cached); a checklist,
  110 `drive_page` steps over three sessions, every line reported with what it measured. Two in a row.
- **s2, LOCALKEEP's field half fixed (`a8511d032`):** `create_project`'s `backend` says a backend is for data shared
  between people or devices and a value kept on one device is kind "none", saved by a Function with localStorage.
  s1's reason for leaving it (AWP-006's resident budget) was measured wrong: `create_project` is deferred once a
  project is bound and listed only on the unbound surface, which has no token gate (resident 8,277/8,280 unchanged).
- **s2, the second brief (AC5): "Pack It"** (`own-019/sentence-pack.txt`) — a form (a text field, a choice of three
  bags, Add) and a list (a checkbox that crosses out and greys, a delete, "1 of 3 packed", three filters with the
  chosen one highlighted, "Nothing to pack yet", everything kept over a reload). Grader `own-019/grade-pack.mjs`,
  12 checks: start, refuse, add, bag, keepbag, tick, count, untick, filter, active, delete, reload; sentences read
  off SHOWN leaves only (innerText carries opacity-0 text — the yardstick's "Type an item first" sits in the page at
  opacity 0 from the start); "active" compares each filter with itself chosen and not (comparing buttons with each
  other proves nothing: "All" is shorter than "To pack"); keepbag follows Carry-on, never the default.
- **s2, the yardstick found a defect: P112-OWN019-DUPCHILD (high, fixed `3b5a18238`).** Sonnet (`round-claude.mjs`,
  core kit tgz14, 20 min, $3.85 API-eq., finished itself, 11 passing drives) wrote a Group with `children: [...]`
  and each child with `parent` in one `update_component`; `add_node` listed every child twice. The person's packed
  preview refused the page — **"38 diagnostics — waiting for a valid graph"**, all duplicate-node-id — while
  `validate_project` said 0 errors and the agent's drives passed (P112-OWN019-TWOLOADERS, filed open: the agent's
  checks and the person's preview read a component differently). Graded as the person sees it: **0/12**. Fixed in
  `reconcileHierarchy` (every write path) and `add_node`; control arm fails both regression tests.
- **s2, the grader proven:** the yardstick with each child listed once (what the fixed writer writes) **12/12**;
  11 mutants (`own-019/mutate-pack.mjs`: noguard, nonag, noclear, nokeepbag, nobag, nostrike, nogrey, nofilter,
  noactive, nodelete, nopersist) **11/11 fail exactly their declared checks**, the control none.
- **s2, kit tgz16** (`3b5a18238`: LOCALKEEP field + DUPCHILD; preview = tgz12's): v4 and the Pack It rounds.
- **s2, v4 (tgz16): stalled.** 11 min of sound work, then one answer that never ended — Vibe flushed a single
  175 KB reasoning entry when the lab stopped it (12 min, no journal growth), Large 4 weighing whether the App's plan
  operation must come before the pages it routes to. As v1. **P112-OWN019-LONGTHINK** (filed open): measured in
  Vibe 2.26.1's source, nothing the kit can write caps one answer on the legacy harness (the per-call `max_tokens` is
  set only through the app-server protocol; `max_output_tokens` reaches the unified harness only; `--max-tokens` is a
  session total). AC4's series on `thinking = "high"`: v2 ✓ v3 ✓ v4 ✗. **Lever 1: `thinking = "low"` (v5).**
- **s2, v5 (lever 1, `thinking = "low"`): worse.** 93 s, 2.7k output tokens: it read node types, then sent 15
  malformed `call_tool` "describe" probes, then wrote to a scratchpad path it invented (`scratchpad-vibe-…` at the
  round's root — Vibe's own is `HOME/tmp/vibe-scratchpad-…` and is always allowed); the refusal ends a `-p` run (a
  person would decline and go on). At `high` (v2, v3) it never did either. Dropped. **Lever 2: temperature 0.2**
  (Vibe's default; the kit writes 1.0), thinking back at `high` — v6. `round-kit.mjs --temperature T` added.
- **s2, Pack It round pk1 (Vibe kit tgz16, `high`, 1.0): 11/12**, finished by itself in 63 min, $3.95 by Vibe's
  list count (~$1.97 cached, 82% cached), 78 tool calls; `backend: none`, localStorage, For Each over a row
  component with Component Inputs. It reported every checklist line passing. **The grader's red, read before
  believed:** `refuse` — a second empty Add after typing shows no message: the Function sets `error` to the text it
  already holds, and a Function output is sent only when it changes (**P112-OWN019-SAMEVALUE**, the Function's notes
  now say it; `21a3d0b98`). A real miss a person sees; its own drives pressed Add empty once. (First read 5/12: the
  grader pressed a checkbox at coordinates read before pk1's message line mounted and shifted the list — fixed in
  the grader, every press re-reads its row; a probe pressing boxes in another order showed every press landing.)
- **s2, v6 (lever 2, temperature 0.2): inconclusive.** No stall in 23 min, and no authoring either: before planning
  it went to read the runtime's source in the npx cache (`home/.npm`, "to verify `isTrueEv` and how For Each
  republishes item signals"); the read was an "ask", `-p` answered no, the run ended. **The lab, fixed:** the seal
  covered the ancestors' siblings, not the round's own root — `home/`, `out/` and anything new there were "ask", and
  an ask ends a `-p` run where a person declines and goes on (v5's stray write too). `round-kit.mjs` now denies
  `<root>/[!w]*` and `<root>/work/[!a]*` (fnmatch, existing or not); Vibe checks its scratchpad first, so that stays
  writable. **v7 (0.2) and v8 (kit defaults, 1.0)** run side by side on the sealed lab, kit tgz17 (`21a3d0b98`).
- **s2, v7 (temperature 0.2, sealed lab): 12/12, carryover NOT clean** — for a moment each new question shows the
  last one's colours (Q2–Q4: Sydney green, Toronto red, Rabat red…). Finished by itself in 41 min, no stall, but
  only ~3 drives where v3 ran 110 steps; its checklist never looked at the moment a question appears. Not an AC4
  pass. **v8 (kit defaults, same lab, side by side): stalled** — 6 min in, one 145 KB answer designing every
  component and their cross-wiring before staging anything (v4's shape). At the kit's settings the quiz series is
  v2 ✓ v3 ✓ v4 ✗ v8 ✗. **Lever 3, the words (`f94777cde`):** the Vibe AGENTS.md step 4 keeps each answer to one
  component and one tool call, and says why. v9 (kit tgz18, defaults) measures it.
- **s2, Pack It pk2 (tgz17, kit defaults): 12/12**, finished by itself in 59 min, $4.34 by Vibe's list count (~$2.17
  cached, 72% cached), 66 tool calls. The first AC5 pass (pk1's SAMEVALUE miss is in the notes now).
- **s2, R30 (Richard):** Vibe on the subscription as far as it goes, or no Mistral. Reporting Vibe's harness defects to
  Mistral (as issues — the repo takes no code) is an option for the final evaluation.

| Pack It | kit | grade | ended | min | $ (Vibe list) | cached | what it taught |
|---|---|---|---|---|---|---|---|
| p0 Sonnet | core, tgz14 (Claude Code) | 0/12 as served; 12/12 healed | itself | 20 | 3.85 API-eq. | 97% | DUPCHILD; the grader proven |
| pk1 | Vibe kit, tgz16 | 11/12 | itself | 63 | 3.95 | 82% | SAMEVALUE |
| pk2 | Vibe kit, tgz17 | **12/12** | itself | 59 | 4.34 | 72% | AC5: 1 of 3 |
- **s2, v9 (tgz18, lever 3 — the answer-size line in AGENTS.md): 12/12, no stall**, finished by itself in 45 min,
  $2.68 by Vibe's list count (~$1.34 cached, 76%). Its longest think was 98 KB (the stalled rounds' 142–172 KB).
  **Carryover again** (Q2 Sydney green, Q3 Toronto red, Q4 Rabat red) — as v7, so not the temperature. v9's graph:
  one Function colours the buttons from `answered`, `tapped` and the question's `correct`; when the pause ends the
  index (new words, new `correct`) changes while `answered` is still true, and is cleared after. v2/v3 cleared first.
  No checklist line ever looked at the moment a question appears. **P112-OWN019-CARRYOVER** (open): the Vibe
  AGENTS.md checklist step now asks for it, and to reset before the words change (`f9c22c74b`, kit tgz19) — v10.
