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
**Status: 🟡 s4 ran (2026-10-14, Opus): daytime works (306–406 chars/s, 85–91% cached), R32 holds; Q1 12/12 carryover clean and L1 (Launch) 17/17 by themselves, the editor bonus 13/13 with one lab stop (NOTELOOP); five kit defects fixed (tgz29), four open; GLM-5.3 and Sonnet compared then dropped (R36); levers first, the series on tgz30 (R37). Sprint guide for s5: `own-019/NEXT-SESSION-PROMPT.md`. Earlier: s4 scoped (R33 no fork, R34 no Fable audit, R35 the series then Richard's own run); s3 the process kit then R32 (one session, taught, tgz27).**
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
- **AC5 — a second brief, three in a row**, on its own grader. ✅ s2 (Pack It pk2–pk4, tgz17–19).
- **AC5b — a third brief, three in a row (R35, 2026-10-14).** "Launch" (`own-019/sentence-launch.txt`): a landing
  page where the look is the agent's own choice (the style challenge), a pricing toggle, an FAQ that closes the
  others, a waitlist form with validation, a faked API call with a timed "Sending…" and a deterministic failure
  (`@fail.test`), and the joined state kept over a reload. Its grader measures what it can (the sentences, the
  timings, a non-default font, a palette, a type scale, contrast, no sideways scroll on a phone, a different layout
  on a laptop) and puts each round's screens in front of Richard for the verdict it can't. Three different looks is
  part of the result. A fourth brief (more moving parts) only if this one passes.
- **AC6 — Richard's own, last (R35).** Only after our rounds and experiments are finished: Richard runs `npm create
  nodegx-vibe`, opens Vibe interactively and asks for one of the three test apps **in his own words**; we grade it
  with that brief's grader and compare with the lab's rounds. The task closes on his words.
- **AC7 — shipped.** Published to npm with the core (publishing is Richard's step, R11).
- **AC8 — the claim write-up (reworded 2026-10-14, R34; was a Fable audit).** The round table, the four proofs with
  their numbers (passes repeatedly; three kinds of app; the money read in the console, not inferred; a person gets
  it), the three Launch looks side by side, the open defects, the levers kept and dropped, the fork trigger — in plain
  words, so Richard can rule *yes* or *no* on **"Mistral Large 4 in Vibe is a great way to build NodeGX apps, for €20 a
  month."** The field guide is the audit's record; Fable is not needed for it (*"this one is already pretty good"*).

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
| v10 | tgz19 (+ the next-screen checklist line) | **12/12, clean** | the lab's $6 stop, at its last step | 75 | 6.30 | 61% | 50 | the carry-over line works; the price stop was the lab's |
| v11 | tgz19 | 5/12 (unfinished) | **stalled** — a real loop, 282 KB in 29.6 min | 91 | 4.59 | 69% | — | a loop is measurable (100% repeated) |
| v12 | tgz19 | 8/12, clean | itself | 45 | 2.44 | 76% | — | AFTERTIMEOUT: the right answer after a timeout is not counted |

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
| pk3 | Vibe kit, tgz18 | **12/12** | itself | 83 | 5.59 | 64% | AC5: 2 in a row |
| pk4 | Vibe kit, tgz19 | **12/12** | itself | 55 | 4.49 | 72% | **AC5: three in a row** (pk2–pk4) |
- **s2, v9 (tgz18, lever 3 — the answer-size line in AGENTS.md): 12/12, no stall**, finished by itself in 45 min,
  $2.68 by Vibe's list count (~$1.34 cached, 76%). Its longest think was 98 KB (the stalled rounds' 142–172 KB).
  **Carryover again** (Q2 Sydney green, Q3 Toronto red, Q4 Rabat red) — as v7, so not the temperature. v9's graph:
  one Function colours the buttons from `answered`, `tapped` and the question's `correct`; when the pause ends the
  index (new words, new `correct`) changes while `answered` is still true, and is cleared after. v2/v3 cleared first.
  No checklist line ever looked at the moment a question appears. **P112-OWN019-CARRYOVER** (open): the Vibe
  AGENTS.md checklist step now asks for it, and to reset before the words change (`f9c22c74b`, kit tgz19) — v10.
- **s2, pk3 (tgz18): 12/12**, finished by itself in 83 min, $5.59 by Vibe's list count (~$2.80 cached, 64%). Pack
  It: pk2 ✓ pk3 ✓. pk4 on tgz19 (`--max-price 8`: pk3 came within $0.41 of the old $6 stop).
- **s2, the "stalls" re-measured — the lab, not the model** (P112-OWN019-LONGTHINK → low, `bdf57f43a`): Vibe writes a
  think to the journal only when it ends; the rounds that finished thought for up to 10.1 min at a time (9–17 KB/min),
  and v4/v8 were stopped by `--stall-min 12` at 11.8/12.4 min still writing at full speed, no more repetitive than
  thinks that finished (~1% repeated 8-word phrases; the same density of "wait/hmm"). Default now 30. So v4 and v8
  are not model failures — they are unfinished rounds. Lesson for the lab: a watchdog on silence must be longer than
  the longest productive silence measured, and that has to be measured first.
- **s2, v10 (tgz19 — the checklist asks what the next screen looks like the moment it appears): 12/12, carryover
  clean.** Its checks covered it ("Play again restarting cleanly at question 1 … no leftover colours", a 29-step drive
  among ~50). But the round was stopped by the lab's `--max-price 6` at its very last step (final render, validate,
  docs) — $6.30 by Vibe's list count, ~$3.15 at the cached rate. The third lab-made stop of the day (the unsealed
  root, the 12-minute watchdog, now the price cap on a list count that ignores the cache). Not an AC4 pass as written
  ("finished by itself"). Quiz rounds now run with `--max-price 10`. v11 and v12 side by side, tgz19.
- **s2, pk4 (tgz19): 12/12**, finished by itself in 55 min, $4.49 by Vibe's list count (~$2.24 cached, 72%).
  **AC5 met: pk2, pk3, pk4 — three Pack It rounds in a row, 12/12, each finished by itself** (kits tgz17–19, which
  differ only in two AGENTS.md lines). First read 2/12: the grader typed "Passport" and aimed at Add in the same
  instant; typing clears pk4's "Type an item first" line, which unmounts and moves Add up. A probe without the refusal
  presses graded 12/12 with the same `<select>` presses, ruling the select out. The grader now lets the screen
  settle 350 ms after typing and refuses to press an Add its press would miss (a person taps where the button is).
  Re-proven on the control and the 11 mutants after the change.
- **s2, v12 (tgz19): 8/12, carryover clean**, finished by itself in 45 min (~$1.22 cached). The right answer after a
  timed-out question is not counted (P112-OWN019-AFTERTIMEOUT, open): probed three ways — the score after every tap
  (Bern after Q4's timeout: 2→2), a 1.2 s pause before every tap (still 2: not the grader), five right answers with
  no timeout (5/5). Its checks drove timing-out and scoring apart, never the brief's own example whole.
- **s2, R31 (Richard):** the kit's agent works the way this repo does — a written process, session by session, by
  itself; the lab adds nothing but a fixed "continue". Every real miss today (SAMEVALUE, CARRYOVER, AFTERTIMEOUT) was
  checklist coverage; the long designs lived only in thinks; one round sent ~9M input tokens through one session.
- **s2, v11 (tgz19): stalled — the first real loop.** One think of 282 KB over 29.6 min (the watchdog's 30): Large 4
  debugging why its own `tappedIndex` read 0 after tapping index 2 ("the repeater re-renders rows … phantom runs") —
  in v11's own graph, not reduced. **A loop is measurable:** its last two thirds are 100% repeated 8-word phrases and
  74 doubt words per 10 KB, where every productive think measured is ~1% and 22–30. A guard that watches a think's
  repetition (not its length or silence) would tell them apart; Vibe writes a think only when it ends, so that guard
  needs a streaming read (a candidate Mistral issue, R30). (s2 first wrote that v11 and v12 shared a runtime seam;
  s3 had already shown v12's miss is the app's graph — a timeout gate re-firing mid-reset, 8/12 → 12/12 by reordering
  three wires, `74c19d5ab` — so that claim is withdrawn.)
- **s3 (2026-10-13, Opus): the process kit (R31), `c4878eaf8`.** The Vibe AGENTS.md is now a process, sitting by
  sitting: every sitting greps the folder for `^# Next sitting` to find its step; **sitting 1 plans and builds
  nothing** (creates the project, writes `docs/REQUEST.md` word for word, `PLAN.md` with the build split into parts a
  sitting each, `CHECKLIST.md` with every example in the request as its own whole line, `NEXT.md`); **each later
  sitting builds one part**, drives its lines, updates CHECKLIST/PLAN, rewrites NEXT; **the last proves** every line
  and only then writes `# Done`. Each stop ends "Next: … Type /clear, then "continue"" (Vibe has `/clear`/`/new`), and
  create-nodegx prints the same. **The lab:** `round-kit.mjs --sittings N [--max-total $]` — sitting 1 the person's
  paragraph, every later sitting a fresh `vibe -p` with `own-019/continue.txt` ("Continue."), never chosen from the
  output; stops at `# Done`, N, a stall, two sittings with NEXT.md unchanged, or the total. `sittings.json` per
  sitting: exit, seconds, Vibe $, cached-rate $, calls, input per call, longest think. Kit **tgz20** = tgz19 + the
  process AGENTS.md (MCP and preview unchanged in source since tgz19).
- **s3, AFTERTIMEOUT found — the app, not the runtime (`74c19d5ab`, bug fixed).** v12's timeout Condition (on value
  change, over "seconds ≤ 0 AND not answered") fired again on the next question, because moving on cleared
  `answered` while `seconds` still read 0; Q5 started answered and its tap was refused. **Control pair:** v12 as
  built 8/12; the same app with three wires re-pointed (reset the countdown first) **12/12**, "You scored 3",
  carryover clean. The Condition's notes now name the trap (test `own019AfterTimeout`, control fails on HEAD).
  So every real miss so far (SAMEVALUE, CARRYOVER, AFTERTIMEOUT) is a transient the agent's checks never played:
  the process kit's whole-example lines are the answer to all three.
- **s3, the community (`own-019/VIBE-COMMUNITY.md`):** Vibe's issues, discussions and source. **Verified here:**
  2.26.1's headless system prompt says *"Complete the entire task in a single pass … Override any earlier
  instructions that say to wait for confirmation"* (`system_prompt.py:357`) — against a sitting kit; and a
  `post_agent` hook in `.vibe/hooks.toml` that answers `{"decision":"deny","reason":…}` sends the agent back to work
  on the legacy loop (`_loop.py:2214`). Others to weigh: legacy is a "temporary escape hatch"; #1242 (no temperature
  0 on Large 4 without `top_p`); exit codes 3/4; Large 4 reportedly serves 524k, not 1M.
- **s3, q1 (tgz20, the first process round): sitting 1 wrote no plan.** It found its step by itself ("This is sitting
  1 — plan"), created the project, then read for 18 min (8 examples, 24 node types) and thought for 21 min in one
  answer — port-level wiring ("Variable2 runOnChange-variable default true?") — until Mistral's stream ended with no
  finish reason (Vibe exit 2, `infrastructure_failure`, `incomplete_stream`). 60 min, $0.89 list (~$0.45 cached), 11
  calls, ~54k input per call, longest finished think 84 KB. Its todo list planned the whole build in that sitting.
  Stopped in sitting 2 (no NEXT.md: it would have replayed sitting 1). **Read:** "PLAN.md: components, values,
  timings, decisions" read to Large 4 as "design every wire first" — LONGTHINK's shape (v4, v8, v11) invited by the
  kit's own words. **Lever (`6970c8f5c`, kit tgz21):** the plan sitting writes notes in plain words, a file per
  answer, in order (REQUEST, CHECKLIST from the words alone, PLAN a page at most, NEXT), and reads no node types —
  each build sitting reads its own part's; plus "the task of a sitting is its step" against Vibe's headless
  "complete the entire task in a single pass". q2 measures it.
- **s3, q2 (tgz21): the process works from sitting 2.** Sitting 1 (4.5 min, $0.06): "Since you asked me to build it
  all without waiting, I'll run the whole process in this pass" — the brief's own "Please just build it without
  waiting" plus Vibe's "single pass" beat AGENTS.md — then Mistral's stream dropped again (exit 2,
  `incomplete_stream`, twice in two rounds this evening; never in s2). **Sitting 2 ("Continue." only, 8.4 min,
  $0.33):** "the project exists … the sitting-1 docs were never written … this is sitting 1 — plan"; wrote REQUEST,
  CHECKLIST, PLAN, NEXT in order and stopped by itself. **The checklist is what s2's rounds lacked:** "You scored 3
  out of 5" as a whole game "mixing right answers, wrong taps and questions left to time out"; best 4 then a 3;
  reload then a 0; "no green or red from the previous question remains on the new answers". PLAN.md: a page in plain
  words, four parts (start + routing; quiz screen, 11 lines; results; prove). NEXT.md names what to read, the node
  types for the part, the lines to drive, the next NEXT, and "Stop there."
- **s3, lever (`589f8e089`, tgz22):** "just build it / don't wait for me" means don't ask, not skip the sittings; a
  project with no NEXT.md is a cut-off sitting 1.
- **s3, mining the thinks (step 5):** 15 journals, ~3,000 question sentences clustered (regex counts, noisy). Most
  doubts the notes already answer (when a Function runs, Condition on change vs eval, Expression re-evaluation,
  Variable force-change, States, Repeat/Timer). **Answered nowhere:** whether a row's values have arrived when its
  signal fires (8 rounds), a row index (11), whether a signal carries a value (12), how rows are matched (11). Ground
  truth read in the runtime (`foreach.tsx` fills `itemOutput-*` before `itemOutputSignal-*`; `node.ts` takes values
  before signals; rows get only `id` + mapped fields; `collection.ts` matches plain items by `id` or identity).
  **For Each's notes now say all four (`f419f035c`, test `own019ForEachRows`).** Wrong conclusions built on: only
  v12's timeout gate (AFTERTIMEOUT). Scripts and data: s3 scratchpad `mine/`.
- **s3, kit tgz23:** create-nodegx as tgz22; **MCP re-packed at `f419f035c`** in `own018-s3-pack` (carries the
  Condition and For Each notes; also whatever else landed in its dependencies since tgz19); preview = tgz12's. q3.
- **s3, q2 sitting 3 (part 1): 17.5 min, $1.47 list (~$0.74 cached), 29 calls, ~55k input per call**, stopped by
  itself; the four start-screen lines marked with what it measured ("at 390×844 the Start button measures 342×53
  px"); NEXT → part 2. Small contexts as R31 wanted (s2's one-session rounds sent up to ~9M input).
- **s3, q3 (tgz23, the "just build it" line): sitting 1 wrote the four notes — and went on.** Past its NEXT.md it
  began asking `describe` for create/update_component, drive_page, render_report: building part 1 in the plan
  sitting. Words got the step finished, not the sitting stopped. Stopped by the lab (me) in sitting 1.
- **s3, the hook (`0b60c2cb0`, kit tgz24):** `.vibe/hooks.toml` + `.vibe/hooks/one-step.mjs`, a `pre_tool` hook:
  once this session has written an app's `docs/NEXT.md` (mtime after the session's `meta.json` start, else its
  folder's UTC name), every tool but `read_file`, `grep`, and `write_file`/`edit` on `docs/*.md` is refused with
  "This sitting's step is done … tell me in two lines … and stop." Fails open on anything unexpected. Test with a
  control (a NEXT.md from an earlier sitting closes nothing). AGENTS.md says NEXT.md is written last and why the tools
  close. q4 measures it; q2 (tgz21, no hook) runs on as the other arm.
- **s3, q2 sitting 4 (part 2, the whole quiz screen, 11 lines): 40 min, 20 answers, 58 tool calls, 1 write, an
  88 KB think** — reading theme tokens, examples and `describe`s, designing the screen in its head. Stopped by me.
  The plan step got chunked; the build step didn't get chunked small enough: the model picks the part size, and a
  screen with a timer, taps and a score is too much for one sitting.
- **s3, Richard (on chunking and teaching):** *"We need to teach it to chunk up tasks to stay well within its limits
  … we're on maybe nearly 100 sessions just for [P107] … If Mistral doesn't [know how to scope a session], we need to
  teach it … You need to be like the senior dev showing the junior dev around the office … Be gentle and a good
  teacher please."* (P107 is at s103.)
- **s3, the teaching kit (`98178a030`, tgz25):** three Vibe skills (`.vibe/skills/…/SKILL.md`; Vibe 2.26.1 lists
  them in the legacy system prompt and loads them with the `skill` tool), in a senior colleague's voice:
  **`nodegx-first-day`** (where everything is — the server as manual: traps, node notes, examples, style, render,
  drive; how we work — small steps written down, a graph is a claim and a drive is evidence, measure before you
  believe, the notes are the manual, stuck is normal and spinning is not; the s1–s3 defects as stories: LOCALKEEP,
  SAMEVALUE, CARRYOVER, AFTERTIMEOUT, the For Each rows, screenshots), **`nodegx-sizing-a-sitting`** (a part is at
  most four checklist lines and one or two components, split by what a person sees change; a worked split for a
  different app; the signs to cut — ~30 tool calls, ten reads with nothing written, designing two components at
  once, two failed fixes, a long think; a good NEXT.md with "where things are"), **`nodegx-when-stuck`** (read what
  you measured, ask the notes, try it small, look at the moment between, two tries then hand over). AGENTS.md names
  the three and carries the sizing rule and the cut signals. q5 measures it beside q4 (tgz24, no skills); q2 stopped.
- **s3, q5 (tgz25, the teaching kit): the teaching took; the headless pull didn't let go.** Its first moves: load all
  three skills, read `.vibe/hooks.toml` — then the plan sitting split the quiz into **six parts of ≤4 lines** (start;
  quiz display; countdown; answer taps; results; prove with the brief's own 3-of-5 game) — the split q2 did not make.
  Then: "I need to understand the folder's one-step-per-sitting hook, since it may refuse tools once a NEXT.md exists
  — and I've been asked to finish the whole build in one pass"; it read the hook's source, wrote REQUEST, CHECKLIST
  and PLAN, **held NEXT.md back**, and began reading examples and `describe`s to build. Stopped by me in sitting 1.
  Vibe adds the "single pass" line only in headless `-p` (`system_prompt.py:430`): a person's interactive session
  (AC6) never sees it, so the lab is harsher than real use here.
- **s3, the rails (`3263a643e`, tgz26):** the hook also closes the building tools (component writes, plans,
  render_report, drive_page) while no app has a NEXT.md (sitting 1; reading and the notes stay open), and at **60 tool
  calls** in a sitting leaves only the notes open, asking it to write where it got to (the skill teaches ~30; q2 and
  q4 built part 1 in 47–51). AGENTS.md names the rails up front, "the way a team's tooling does — not a judgement on
  you … plan for the rails rather than around them." q6 measures it; q4 (tgz24) runs on.
- **s3, the hook's first firings (q4 part 1, q6 plan):** each sitting wrote NEXT.md, then reached for one more call (a
  `todo` update); the hook answered "this sitting's step is done", and Large 4 summarised and stopped — no argument, no
  workaround. q6's plan sitting (tgz26) loaded the three skills, read no examples, tried no building tool, and wrote
  PLAN.md as a table: six parts, each naming its ≤4 checklist lines and the components it touches. 16 min, $0.26.
- **s3, q4 part 1 (tgz24, no skills): 53 min, 34 answers, 73 tool calls, $3.20 list, longest think 61 KB** — for a
  start page. Proven (12 drive steps) and handed over cleanly, but big for its size.
- **s3, open — the cache this evening.** Every sitting tonight cached 9–41% of input (q4 part 1: 20%, 530k of
  2.65M); s2's single-session rounds this afternoon cached 60–76% (v12 76%, pk4 72%). Not images (none sent —
  IMAGECACHE), not `todo` (Vibe doesn't inject it into the prompt; v12 used it at 76%). The same evening had two
  `incomplete_stream` drops, which points at Mistral's side, but the request shape isn't ruled out. **Next: record a
  sitting's requests through `own-018/record-proxy.mjs` (`--compare`: does each request extend the one before?)** —
  it decides between "Mistral's cache tonight" and "something in the sitting's prompts". At 20% a start page costs
  what a whole s2 round did; it matters for R30.
- **s3, q6 part 1 (tgz26, the guides): 37 min, 32 tool calls, $1.34 list (34% cached)** — half q4's part 1 ($3.20, 73
  calls, no guides); both start-screen lines passed with what it measured; stopped by itself under the 60-call rail.
- **s3, R32 (Richard): one session, taught** (README R32). Per-part sittings held the process but cost 4–6 h a quiz and
  fought Vibe's single pass; the one-shot rounds were already near a YouTuber's "an hour, €30" for three.js games.
  **The kit, rebuilt (`23f96461e`, tgz27):** AGENTS.md — one session by a written process: notes first (REQUEST,
  CHECKLIST with whole examples, PLAN with parts ≤4 lines), then each part built and its lines driven before the next,
  then prove and `# Done`; hand over through `docs/NEXT.md` ("# Next session: …", where things are, what to try) only
  at ~100 tool calls or two failed fixes. The hook (`hooks/hand-over.mjs`): asks for the hand-over at 100 tool calls,
  and closes all but the notes once a session has written NEXT.md; the plan-sitting lock is gone. Skills:
  `nodegx-first-day`, **`nodegx-sizing-the-work`** (was `-a-sitting`: part size, the signs, the hand-over, a good
  NEXT.md), `nodegx-when-stuck`. o1 measures it (`--sittings 4`, `--max-price 10` per session); q6 runs on to `# Done`.
- **s3, o1 (tgz27, one session taught, 22:52–23:31 CEST): stopped by the lab's 30-min watchdog in one think.** It
  loaded the three skills, wrote REQUEST, CHECKLIST and PLAN, read three examples and its node types, then: "Let me
  now design the graph carefully before writing. ## Design ### App component…" — one think of **171 KB over 30.3 min**
  (at the evening's ~90 chars/s), still weighing an answer button's five inputs when stopped. **Not a loop:** 1.0% of
  its 8-word phrases repeat in the last two thirds (v11's loop: 100%; productive thinks ~1%), 44 doubt words / 10 KB.
  39 min, 34 tool calls, 0 components written, $0.57 list (42% cached). **Read:** the per-part sittings were what
  kept thinks small (q6 longest 69 KB) — with the whole plan in one session Large 4 designs the whole app up front
  (s2's one-shots: 92–147 KB, ~10 min at afternoon speed). At afternoon speed this think was ~10 min, the price of the
  s2 rounds that passed; at evening speed the lab's watchdog (minutes of silence) cuts a productive think off — a
  silence watchdog is speed-dependent. The recorder (attached from session 2) never saw a call: the round stopped
  on the stall.
- **s3, the evening cache settled (q6 sitting 4, recorded):** every chat request extended the one before, yet 7 of 22
  calls were 0–11% cached, mostly 0.1 s after the previous call, with first byte 6–12 s (hits: 87–99%, 1–2 s) — Mistral's
  cache missing identical prefixes under evening load, not the requests and not a timeout. q6 sitting 3 (part 2,
  answering): 49 min, $2.71 list, 5 drives passed, NEXT → part 3 (countdown).
- **s3, q6 (tgz26, per-part sittings, 22:53 → 01:10 CEST): 12/12, carryover clean, finished by itself** — the first
  process-kit app. 7 sittings (plan; parts 1–5; prove), 197 min, **$9.65 list (~$4.82 at the sale)**, 276 tool calls,
  38 drives, 11.7M input over all sittings, longest think 131 KB (part 2, 25 min at evening speed). Its own proof
  ("all seventeen checklist lines were driven fresh") agrees with the grader line for line — the brief's whole
  3-of-5 game included (v12's miss). Per sitting: 16 / 37 / 49 / 38 / 10 / 19 / 27 min; $0.26 / 1.34 / 2.71 / 2.13 /
  0.91 / 0.82 / 1.48. **Mistral recovered after midnight:** sittings 6–7 thought at 217–222 chars/s and cached 75–81%
  (sittings 1–3: 48–94 chars/s, 26–54%). For the comparison: s2's one-shot quiz passes cost $2.44–4.90 list in 41–64
  min at afternoon speed; q6 cost about 2–4× that, mostly in the evening's slow window — the daytime pair (o2 vs q7)
  decides it.
- **s4 scoping (2026-10-14 morning, Fable 5.1, with Richard) — three rulings, no rounds run.** Richard asked for the
  verdict so far and about forking Vibe. Measured for the answer: Vibe 2.26.1 is the latest release (PyPI, 9 Oct);
  the community has **no report of Large 4's long thinks** (every Vibe issue since 25 Sep searched: the nearest are a
  Slovak prose loop, #1176, and GLM's empty turns, #1116 — Large 4 is a week old and Vibe's default model is GLM);
  #1227 (error text hidden on the unified harness) and #1240 (`tools/list_changed` ignored) are open and unanswered;
  the unified harness's Rust core is public (`harness/core`), Apache-2.0. Our own record, re-read: most "long-think
  failures" were the lab's watchdog cutting productive thinks (v4, v8, o1); one real loop (v11) and two dropped
  streams (q1, q2) in ~24 rounds. **R33 — no fork**: it would win little on cost (the thinking is the cost; editing
  history breaks the prefix cache), a little on reliability, and compatibility only once legacy is gone; **trigger to
  reopen: Mistral removes legacy before fixing #1227 and #1240**. Everything short of a fork is allowed, including a
  Mistral-specific integration in the MCP. **R34 — no Fable audit** (the field guide is it; AC8 reworded as the claim
  write-up). **R35 — the series**: three or more briefs × three rounds on one kit, levers between series, the
  integration tuned throughout; **Richard's own interactive run comes last**, in his own words, after our rounds.
  Written this session: the third brief (`own-019/sentence-launch.txt`) and the sprint guide
  (`own-019/NEXT-SESSION-PROMPT.md`: the four proofs, the series rules, the round columns including the console's
  allowance Δ that Richard reads, the Launch grader's checks and mutants, the lever list). The kit stays tgz27 (a copy
  survives in the s3 scratchpad; matches HEAD). Opus runs the sprint.
- **s4 (2026-10-14, Opus, 09:10–14:00 CEST): the first daytime day.** Console €30.90 → €34.49 by 10:47.
  - **o2 (tgz27, quiz, 09:10): 11/12, carryover not clean, finished by itself** in 52 min, $3.64 list, 86% cached;
    one 103 KB design think in 5.6 min (o1's 171 KB took 30 min at evening speed) — R32 holds by day. Both misses had
    the right checklist line; the tool could not play it: `read: { look }` settles (a 55 ms flash of the last
    question's green read idle) and there was no reload (it navigated to `/start`; reloading its results page shows
    "You scored  out of 5"). **WATCHMOMENT + RELOADHERE fixed (`5f8dee6d7`): `drive_page` `watch` (every state a
    target shows during a change, `expect: { never }`) and `reload`**, taught in the Vibe AGENTS.md.
  - **o2's first minutes found three more:** NODETYPEWORDS (a multi-word `list_node_types` query matched nothing;
    15 calls walking categories), NESTEDCALLTOOL (`call_tool` called through `call_tool`, refused ~10×, so no tool
    schemas), and the Launch yardstick PRESETFONTS (npm shipped no preset typefaces). Fixed `cda7ea056` (tgz28).
  - **The Launch grader** (`own-019/grade-launch.mjs`, 17 checks incl. measured look: painted font via
    `CSS.getPlatformFontsForNode`, chosen palette vs the template's own tokens, scale, contrast from pixels, phone,
    laptop): Sonnet's l0 16/17 (font = PRESETFONTS, real); its control (look replayed through tgz28) 17/17; 12
    mutants exact. Four grader faults read before believed and fixed (a `\S` in a template; default slate/blue
    counted as chosen; an instant press; the grader's own scrolls gliding under `scroll-behavior: smooth`).
  - **Q1 (tgz29, quiz, 10:14): 12/12, carryover clean, by itself** — 56 min, $3.49, 91% cached; `watch` ×3,
    `reload` ×3, a reset-first component. Its proof and the grader agree.
  - **L1 (tgz28, Launch, 09:50): 17/17, by itself** — 90 min, $5.12; Fraunces + DM Sans painted, its own palette and
    drawn product vignettes. Richard: *"Fuck it actually looks good, blow me over with a feather."*
  - **Richard's bonus — "your own editor" (`own-019/sentence-editor.txt`, `grade-editor.mjs`, 13 checks: edit in
    browser A, a fresh browser plays it, everything restarted, a third plays it):** a second session on q6 (`--seed`).
    **E1 (Large 4): 13/13** — chose the local backend, proved the record contract on a scratch page and exported the
    collection before building; then **NOTELOOP: 67 min failing to edit its own NEXT.md** (18 of 23 edits refused,
    probe files to calibrate the tool) — **lab stop**. SE1 (Sonnet) 13/13. Found: **BACKENDSESSION** (high) — a local
    backend lives only while the agent's MCP session does; the grader and the gallery restart it, a person can't.
    The editor grader first saved its edit into the rounds' own backends (a regrade found no Portugal): now grades a
    copy; the rounds' data restored from SQLite.
  - **Comparisons (Richard: "a GLM 5.3 round … and Sonnet using Claude Code"):** `round-kit --model zai-glm-5-3`.
    GLM quiz 12/12 (47 min); GLM Launch **12/17** (the error line before any press; `ada@nowhere` saved; no font);
    Sonnet quiz 12/12 (15 min). **R36: dropped — Large 4 only.**
  - **Money (proof 3, first reading):** €3.59 of allowance over $7.10 list (recorder) — the console tracks Vibe's list
    $ halved (the sale). A quiz ≈ €1.8 → ~140/month in the sale, ~70 after.
  - **The gallery (Richard's ask):** every app copied out of the scratchpad and served from its own packed preview,
    `own-019/gallery.mjs`, http://localhost:4800 (9 apps; backends kept alive for E1/SE1).
  - **TAPHOLD (open):** `drive_page`'s tap stops L1's smooth scroll 2–201 px down where a person's tap reaches the
    form; holding the press inside drive-steps didn't fix it.
  - **R37: the levers first** (NOTELOOP, TAPHOLD, BACKENDSESSION, Q1's empty sitting, recorder-vs-Vibe $, the editor
    grader's mutants) **into tgz30, then the series on it** — nothing so far counts as "three in a row on one kit"
    (o2 tgz27, L1 tgz28, Q1/E1 tgz29). Q2 and SL1 started and stopped by that ruling.

