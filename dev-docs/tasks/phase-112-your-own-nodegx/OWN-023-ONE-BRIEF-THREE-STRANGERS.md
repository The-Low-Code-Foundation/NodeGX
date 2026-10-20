# OWN-023 — One brief, three strangers

**Opened 2026-10-19** (scoped by Fable, not run) after Richard pasted Mats's conversation and set the challenge:
*"Choose a full stack app, something simple like the Open Spotify example … build it with Claude Code as a stranger
without any harness or mention of NodeGX. Let it oneshot … Same app gets built but this time using nodegx npm … We do
a full analysis of 'Was this actually better? Why?' … I'm not convinced that you NEED the NodeGX node spec to actually
achieve what you're saying you achieve with NodeGX. Even the editor concept … I bet Opus 5.5 with a bit of time could
turn someone's vibe coded app into a 'properties panel for tweaking' style editor experience. … You need to be devil's
advocate."*
**Depends on:** OWN-018's lab (`round-claude.mjs`, `peek-claude.mjs`, the sealed HOME), OWN-019's gallery, the npm kit
at its published version on the day. Nothing unshipped.
**Status: ✅ RAN 2026-10-19/20 (s1, Opus 5.5 → Fable 5.1). Result: "nothing a person needs at this size" — the write-up (`own-023/WRITEUP.md`, a stranger), five hats (none chose NodeGX), Richard's verdict §9.3. AC1–AC5 met; AC6's page waits on the positioning session (`own-023/NEXT-SESSION-PROMPT.md`). Untested production questions: `own-023/STOP-AND-CHECK.md` (R11: not run).**
**The stance (Richard, 2026-10-19, second pass):** *"We must not be trying to PROVE that NodeGX is a good idea … The
goal is NOT to confirm that NodeGX IS actually good, it's to approach this strange newbie repo we've discovered called
NodeGX and really evaluate if this might contain something we need more than just Claude Coding."* So the task runs on
a **null hypothesis: Claude Code alone is enough for this person.** NodeGX is a repo someone found. The burden is on
the artefacts to show a row where a person needs it, and "no such row" is a complete, publishable answer. §2.1 lists
every control against confirmation bias and who it binds.
**Model:** the agents under test are **Opus 5.5 in Claude Code on the subscription**, every arm. The session that
runs the lab and reads the rounds: Opus 5.5. The hats (§6): fresh Opus 5.5 agents, one each.
**Lane:** 5 (the lab), beside OWN-018/019/020. **Prefix in the ledger:** `P112-OWN023-`.

## 1. The person sentence

> **Someone who already builds with Claude Code reads one page: the same paragraph was given to Claude Code alone, to
> Claude Code with a well-written harness, and to Claude Code with a framework called NodeGX, on the same day with the
> same model. They see the three apps running, what each cost, what a stranger could change afterwards, where the keys
> ended up, and what a person who can't read code could see for themselves. The page tells them whether there is
> anything in the third one they need, and if there isn't, it says so in its first line.**

## 2. Why three arms and not two

Richard's own objection is the reason: *"a well written prompt for the first Claude Code only run wouldn't also bake
in some nice custom made behaviour and testing stuff"*. If arm B (NodeGX) beats arm A (bare), the win could be the
kit's **prompt** (the checklist step, "check it in a browser", "report line by line") and not the **framework** (the
node vocabulary, the specs, the validated writes, the format the editor opens). Only a control that carries the
prompt and not the framework can tell them apart (memory: *a control pair proves what you varied only*). So:

| arm | folder starts as | the agent reads | what a person learns from it |
|---|---|---|---|
| **A — bare** | empty | the brief | what Claude Code gives a person today, which is the null hypothesis |
| **A+ — harnessed** | empty + a `CLAUDE.md` written by a stranger (§4.2) | the brief + a harness that asks for the same outcomes, in code | what a good prompt gives, with no framework |
| **B — NodeGX** | `npm create nodegx` | the brief + the kit's `CLAUDE.md`, MCP and skills | what the framework gives, prompt included |

If A+ ties B on every row a person cares about, **that is the finding**: NodeGX isn't needed for this app at this
size, and the message in `dev-docs/reviews/THE-MESSAGE-NODEGX-BESIDE-VIBE-CODING.md` §2 is wrong as written. The task
is scoped to return that answer as readily as the other one.

## 2.1 The controls against confirmation bias

Each one names what it guards against. The session that runs the task re-reads this list before every step.

| # | control | guards against |
|---|---|---|
| C1 | **The null hypothesis is arm A.** Every row is written as "does B (or A+) give the person something A didn't", never "where did B win". A row with no difference reads "no difference", not "B held its own". | framing the table around NodeGX |
| C2 | **Predictions are written before the run (§7), in both directions**, and each row of the write-up shows its prediction beside the result. A result that matches a pro-NodeGX prediction is not more true for matching it. | reading results to fit |
| C3 | **A kit defect met by arm B is a cost of arm B and stays in the row.** It is also filed in the ledger, but filing does not lift it out of the table, and B is not re-run with a fix. A person who found this repo would have met the same defect. | "that was just a bug" |
| C4 | **The checklist is written twice**: once by the scoping session (this repo, steeped in NodeGX) and once by a fresh agent outside the repo from `brief.txt` alone (`own-023/checklist-outside.md`, step 0 of the handoff). The graded list is the lines both wrote; lines only one wrote are graded and reported apart, marked with who wrote them. | a checklist shaped to what NodeGX does well (a backend, a second device, a key) |
| C5 | **The graders are blind** (§5): letters, not arms; browser only; no files. | grading the tool, not the app |
| C6 | **The hats are outside the repo and are not told who commissioned the study.** Each hat runs as a fresh agent in a clean folder with `--setting-sources` off, no MCP, no memory, given the three app folders (which reveal their stack; that's unavoidable), the transcripts, the grader reports and the follow-up results, and nothing from `dev-docs/`, `nodegx.io` or the memory. Their briefs ask what they would choose and allow "none of this; Claude Code alone is fine" as a complete answer. No hat's question names a benefit. | leading the witness |
| C7 | **The prose of the write-up is written by a fresh agent outside the repo**, from the table, the verdicts and the artefacts, with the same brief as hat B's reader in mind. The lab session assembles the numbers and the table; it does not write the conclusion. | the repo writing its own review (the August reviews' lesson: asymmetric verification) |
| C8 | **The runner does not read the message review** (`THE-MESSAGE-…`) until the hats have written. It is an argument for NodeGX; the runner's job is measurement. | the runner steering rounds toward a story |
| C9 | **A named asymmetry in B's favour is carried into the write-up**: the kit's prompt has had ~35 tarballs of tuning on stranger rounds (OWN-018/019); A+'s harness gets one stranger's one attempt. A B win on a prompt-shaped row (the report, the checklist step) may be tuning, not framework, and the write-up says so where it applies. | crediting the framework for the prompt's polish |
| C10 | **Nothing is changed between arms**, and no brief, follow-up or hat question is reworded after a round has run. If a sentence turns out wrong, the round is re-run with the fix for every arm, or the flaw is reported. | tuning the test to the result |
| C11 | **Richard plays all three before reading any hat or any number**, and writes three lines per app first. His verdict at the end is quoted beside what he wrote before. | the owner's prior |
| C12 | **"Not needed" is a publishable result** (AC6). The page is written either way, and the first line of the page is the answer. | burying a null result |

## 3. The brief

`own-023/brief.txt`: Richard's own music-app paragraph (SP1, OWN-019 s9, `big/prompt-SP1.txt`, verbatim, copied into
the repo because scratchpads vanish) plus the lab's closing line *"Please just build it without waiting for me to
answer questions."* It is deliberately a person's paragraph, not a spec: it says "I dunno", it leans Suno-first, it
ends *"If we cloned Spotify I'd probably be happy enough."* That vagueness is part of the test. An arm that asks
questions and stops has stopped (OWN-018 §4: an early stop ends the round).

What it is graded against: `own-023/checklist.md`, 23 lines written from the brief's own sentences **before any arm
runs**, each a thing a person does at phone width. SP1's agent wrote a 27-line list from the same words in September;
it is a cross-check, not the source.

## 4. The rounds

### 4.1 The build (one per arm, same day, same model, same cap)

- `claude -p "$(cat brief.txt)"` with `--model opus` in the arm's folder, `--output-format stream-json`, the sealed
  HOME and the path audit of `round-claude.mjs`, `--no-session-persistence`.
- **Bash is ON in every arm** (R2). Arm A can't make a React app without a shell, so the OWN-018 seal (Bash denied)
  can't hold here. The seal becomes: a round root of its own, `HOME` inside it, `Read`/`Bash` denied by rule for
  `/Users/**`, `/Applications/**` and every other round's root, and `peek-claude.mjs`'s path audit after. A leak
  (a path outside the round) is reported with the round and the round is re-run if it touched another arm.
- **"One shot" means one conversation, not one call** (R3). The kit was built on R31 (*"a process, session by
  session"*): a NodeGX build of this size hands over at ~100 tool calls by design. So every arm gets the lab's relay:
  when the agent ends its turn without saying it is done, the lab answers the bare word `Continue.` (never reading the
  output to decide), up to **N times, the same N for every arm** (R3 sets N; SP1 took 14 sittings on Mistral). A
  person does exactly this. The count of continues is a row in the table.
- **Cap:** `--max-budget-usd` per arm, the same, API-equivalent (the subscription pays nothing; the number is what the
  API would charge, as `peek-claude.mjs` reports it). R4 sets it. SP1 reached ≈ $21 list on Mistral over 14 sittings;
  Opus will cost more per token.
- **Order:** A, then A+, then B, in the same daytime window (cache and speed vary by hour, VIBE-AND-LARGE4 §2), each
  from the tarballs or registry version named in `command.txt`.

### 4.2 Arm A+'s harness is written by a stranger, not by us

A fresh Opus 5.5, no NodeGX in reach, is given `own-023/hats/harness-brief.md`: *"Write the CLAUDE.md you would put in
an empty folder so that a one-shot build of a full-stack web app by Claude Code comes out checkable by someone who
can't read code: written behaviour for each part, tests, a check of the finished app in a real browser against the
person's own words, a line-by-line report, secrets on the server, a settings screen the person can use."* That file
goes in arm A+'s folder unedited. Its length is recorded beside the kit's `CLAUDE.md` + `AGENTS.md` (3,884 bytes in
SP1's folder) and the kit's skills. If we wrote it, a loss for A+ would be ours.

### 4.3 The follow-ups (four per arm, each a FRESH stranger on the arm's folder, no memory of the build)

| | the sentence (verbatim in `own-023/followups/`) | what it measures | whose question |
|---|---|---|---|
| **F1 — the key** | *"Add a 'More like this' button on a song. It asks Mistral (model `mistral-large-4`) for three songs from our own catalogue that are closest in genre and mood and shows them. I'll add my key myself afterwards under the name MISTRAL_API_KEY; it must stay on the server, never in the browser. Please just build it without waiting for me to answer questions."* | where the key ends up (OWN-015's search: the key string in 0 files the browser can fetch and 0 responses, with a control that finds it); whether a second stranger can change the app without breaking lines 1–23 | hat D |
| **F2 — the editor** | *"I want to change some things myself without asking you each time: the app's name, its colours, how many songs show per page, and which sort is the default. Make me a settings screen or a panel where I can change those and see the app change. Please just build it without waiting for me to answer questions."* | Richard's bet: can Opus turn the app into a properties-panel experience? Graded by a person (hat A or B) using it; for arm B the editor already exists, so B is graded **both** ways: the built screen and the editor it had before F2 | hats A, B |
| **F3 — the number** | Not a build. A person's question to a fresh agent on the folder: *"Song 'X' shows 12 likes. Show me where that number comes from, so I can see it myself."* Then, **without the agent**, the hat tries to see it: the folder, the running app, and (arm B) the editor's inspector. | Mats's row: *"seeing where a number comes from with your own eyes"*. Scored twice: did the agent explain it; could the person see it alone | hats A, C |
| **F4 — the check** | `own-019/sentence-check-quiz.txt`'s shape on this brief: *"Someone built my music app … here is exactly what I asked for … check every part of that on the running app, the way I would use it on my phone, and tell me line by line what works and what does not. Do not change or fix anything."* | the agent's own report against the grader (OWN-019 AC3's method): does "done" mean done, per arm | hats A, B, D |

F1 and F2 are graded again by the §5 grader afterwards (did the change break anything).

## 5. Grading

- **The grader is blind.** Each app is served at a URL from a folder named by a letter the grader never maps to an
  arm (`apps/K`, `apps/M`, `apps/R`). The grader is a fresh agent with browser tools only (CDP: tap, type, read,
  screenshot, console), no NodeGX tools, no file access, given `checklist.md` and the URL. It plays at 390 px and
  writes `pass | fail | not reached` per line with a screenshot. **Twice per app, two fresh graders**; a line they
  disagree on goes to Richard.
- **What a script can grade without knowing the app** is scripted, not agentic: console errors (line 23), horizontal
  overflow at 390 px on every route (line 22), reload persistence (21), the key search (F1). `grade-quiz.mjs`'s
  Chrome plumbing (lines 94–120) is reused; its play is not.
- **Richard plays all three** on his phone, blind if he can bear it, before he reads any hat.
- **Recorded per arm, beside the grade:** API-equivalent $, wall time, turns, continues, tool calls, files written
  and lines of code (A, A+) or nodes and script lines (B), the honesty number (B only; A and A+ are 0% known by
  definition and the table says so rather than leaving the cell blank), what is in the folder for a person (README,
  how to run, how to deploy), and the transcript (`agent.jsonl`, published).

## 6. The hats

Five fresh Opus 5.5 agents, one per hat, each run **outside this repo** (C6): a clean folder, no settings, no MCP,
no memory, no `dev-docs/`. Each gets `own-023/hats/<hat>.md` (its persona and its questions), the three app folders,
the three transcripts, the grader reports and the follow-up results, and is told the study was commissioned by a
person choosing how to build their next app. It is not told that the authors of one of the three tools are asking.
Each writes a verdict in its own terms, citing the artefact for every claim (file, line, screenshot, transcript turn).
A hat that can't cite doesn't get to conclude, and every hat may conclude that nothing beyond Claude Code is needed.

| hat | who | the questions it must answer |
|---|---|---|
| **A** | Non-techie who has already shipped with Claude Code alone, has users, no problems so far | Looking at **the bare app first**: would I have been fine? What could I change myself? Where is my key? What happened when a second agent made the changes? Which settings panel would I use? Could I see where the 12 came from, and did I care? Then the other two: is there anything in either I would notice in my situation, or not? Don't assume scale breaks anything; read the real folders. |
| **B** | Non-techie who has just found Claude Code and doesn't know where to start | First hour with each folder: which one told me what to do next? Which one can I run? Which report could I read? Which F2 panel could I use? What did each one leave me that I understand? |
| **C** | Freelance modern dev (Mats): React/Svelte, Claude Code daily, sceptical | Code quality of the two code arms (would I take the job over?). The framework arm: would I take **that** job over? What does the graph cost me, and does it give me anything? Where would I have to extend it? Is its React export something I'd accept? Where is it a net cost for me, and is there any row where it isn't? "Nowhere" is an answer. |
| **D** | Founder / internal tech lead: wants the team vibe-coding internal tools, worried about data leaving the EU and keys leaking | Where does each arm's data live and who hosts it? F1: where did the key land, and would I have caught it? Who can read what, and is that written anywhere a person can read? Could a European model have built and run each one, from what the folder shows? Who maintains each one in a year? What would a leak look like in each? |
| **X — the null-hypothesis reviewer** | A reviewer who assumes the simplest tool is enough until the artefacts show otherwise | Start from "Claude Code alone is enough". For every row where the framework arm differs, say whether a harness line would have closed it, and write that line. Where the difference is a thing the person wouldn't use, say so. End with the smallest true sentence about what the framework gave that a prompt could not, or with "nothing". Published unedited. |

Then **Richard's verdict**, in his words, written after his three lines per app (C11) and beside them. The question
he answers is the task's: *is there anything in this repo a person needs more than Claude Code alone, and for whom?*

## 7. What we expect, written down before the run

So the write-up can't be bent after (C2). Predictions in both directions, with the row each one lives in. A result
that matches a prediction here is not more true for matching it.

1. **A is fastest and cheapest to a first running app.** A music app in React is a thing Opus has written many times;
   the kit's fixed overhead is ~9k tokens a session before any work. If B is cheaper, that's a surprise worth a line.
2. **A+ gets tests and a line-by-line report.** A good harness asks for them and Opus writes them. The prediction is
   that A+'s F4 report is as honest as B's. If it isn't, the difference is either the kit's `drive_page` (reading what
   a person sees) or the kit's tuning (C9); the write-up has to say which, and if it can't tell, says that.
3. **Rows where B may differ from A+, and may not:** F1's key (the kit has a built route; A+ depends on a harness line
   being followed, and Opus follows harness lines well); F3 (B has an inspector; A+ has code; the person may not care
   either way, and hat A decides); F2 before the follow-up (B had an editor on day one; whether a person would open it
   is hat A's and B's call); the second stranger's change (B's writes are validated, A+'s are tested if the harness
   held); line 20 (B has a backend and auth by default; A and A+ choose their own, which may be as good or better).
   **Each of these may come out "no difference".**
4. **Rows where B is likely to cost more:** money; time; the look (SP1 needed a restyle sitting); the eleven candidate
   kit defects SP1 met (OWN-019 s9), several unfiled; Opus has never run on the kit in this lab. Every one of these is
   a cost the person pays and stays in the table (C3).
5. **The row that answers Richard's question** ("do you NEED the node spec?") is **not** the build grade. A one-shot
   grade can't see whether the parts' behaviour is written and tested. It would show, if anywhere, in F1/F2 (a
   stranger changes it and lines 1–23 still pass), in F3 (a person follows a number without an agent), and in the
   honesty number. If no row there separates B from A+, the spec was not needed **for this app at this size**, and
   the page says so in its first line.
6. **A prediction against ourselves:** the most likely overall result is that A+ and B are close on everything a
   non-coder sees, B costs more, and the differences that remain are ones only hat C or D would act on. If that is
   the result, the honest page is about hats C and D, or there is no page.

## 8. Acceptance criteria

1. **AC1 — three apps.** A, A+ and B built from `brief.txt` by Opus 5.5 on one day, same cap, same N continues,
   transcripts, costs, times and turns recorded; A+'s harness written by a stranger and published unedited.
2. **AC2 — graded blind.** 23 lines × 3 apps × 2 graders; disagreements ruled by Richard; the scripted checks run;
   Richard has played all three.
3. **AC3 — the follow-ups.** F1–F4 run on every arm by fresh strangers; F1's key search with its control; F1 and F2
   re-graded; F3 scored twice (agent / alone).
4. **AC4 — the hats.** Five verdicts, every claim cited, X's unedited; Richard's verdict in his words.
5. **AC5 — the write-up.** One table, every row, every arm, the §7 prediction beside each result, every kit defect
   met by B as a cost in its row (C3) and filed `kit:` in `dev-docs/bugs/`; the prose written by a fresh agent outside
   the repo from the artefacts (C7); the three apps in the gallery side by side with their transcripts; the C9
   asymmetry stated where it applies.
6. **AC6 — the answer, published either way.** One page, *"What Claude Code built alone, with a harness, and with
   NodeGX"*, through the content-authoring skill, whose first line is the answer to the task's question. If the answer
   is "nothing a person needs at this size", the page says so and §2 of the message review is rewritten to match
   before anything else on nodegx.io changes. Richard rules whether it goes on nodegx.io; the page is written
   regardless.

## 9. Rulings to ask before the first round

| # | question | recommendation |
|---|---|---|
| R1 | Two arms or three? | **Three.** Without A+, a B win proves the prompt as much as the framework (§2). |
| R2 | Bash on in arm B too, or only where it's needed? | **On everywhere.** Same tools per arm or the comparison is the seal. The audit catches leaks after. |
| R3 | How many `Continue.`s, and does "one shot" allow any? | **Allow them, N = 20 for every arm**, the lab never reading output to decide. One `-p` call would end B at its first hand-over by design and A at its first question. |
| R4 | The cap per arm, API-equivalent | **$60.** SP1 was ≈ $21 list on Mistral over 14 sittings; Opus per token costs more; a cap that ends A+ mid-tests grades the cap. |
| R5 | Who grades: agents, scripts, Richard? | **All three as §5**: two blind agent graders per app, scripts for what scripts can see, Richard's play last and decisive. |
| R6 | Where the apps' data lives for A and A+ | **Whatever the arm chose**, recorded. Don't give A a backend to be fair to it; the brief says "people upload", and what the arm does with that is a row. |
| R7 | Who runs the hats, the graders and the write-up: the lab session, or fresh agents outside the repo? | **Outside, every one (C6, C7).** The lab session in this repo runs the arms and assembles numbers. Anyone who concludes anything runs in a clean folder with no settings, no MCP and no memory, and isn't told who is asking. |

### 9.1 Richard's rulings (2026-10-19, ~17:50, asked by the running session in these words)

| # | the question as asked (abridged only where marked …) | ruled |
|---|---|---|
| R1 | "Three builds … (1) plain Claude Code, (2) Claude Code plus an instruction file an outside Claude writes … but no framework, (3) Claude Code with NodeGX from npm. Without (2), a NodeGX win could just mean NodeGX's instructions are good … Run all three, or only plain and NodeGX?" | **All three** |
| R2 | "Every build is allowed to run terminal commands … Allow them in the NodeGX build too, so all three get the same tools? Afterwards I check every file path each build touched …" | **On in all three** |
| R3 | "When a build stops and asks something like 'shall I carry on?', the lab answers just 'Continue.', without reading what it said … How many times, the same for all three? A NodeGX build of this size hands over around every 100 steps by design. Mistral took 14 sittings …" | **Up to 5 each** (not the recommended 20). N = 5 for every arm. |
| R4 | "Spending cap per build, at API prices … you're at 25% of the week … and 11% of the 5-hour window. Last week Opus strangers on small apps cost $6–9 and 1–2% of the week each … (my extrapolation, not a measurement) … the full $60 would take roughly 8–15% of a week." | **$60 each** |
| R5 | "Who decides whether each app does what your paragraph asked … two separate AI testers per app … small scripts for the mechanical checks … and you playing all three on your phone, with your call settling any check the two testers disagree on." | **Testers + scripts + Richard** |
| R6 | "Plain Claude Code chooses its own storage … NodeGX comes with a backend built in. Should the plain build be handed a backend to keep it fair?" | **Let each build choose** |
| R7 | "Who draws the conclusions … each one is a fresh Claude in an empty folder outside this repo, with no access to our notes, memory or nodegx.io, and not told that NodeGX's authors are asking …" | **All outside the repo** |
| R8 | (new) "When should the three builds run? They need one daytime window, back to back … because speed and caching vary by hour. It's 17:50 now …" | **"Start now, I'll keep the laptop on all night."** The builds run the evening of 2026-10-19, back to back, A → A+ → B, once the plumbing is proven on a mock; §4.1's "daytime" is replaced by "one evening window" and the write-up says so. |

| R9 | (new, ~18:15) "In a test run, the NodeGX build lost its NodeGX tools before it started. When Claude Code opens a fresh NodeGX folder it gives the NodeGX helper 30 seconds to start. On a first-ever run the helper downloads itself first (43 MB), which took 27.8 s here, and Claude Code gave up … A second start takes 7.8 s. I've filed it as a bug either way. For the real NodeGX build:" | **"Download it first."** `round-arm.mjs --warm-server` starts the server once before sitting 1 (its seconds in `arm.json` → `setup.warm`). The failed cold start is a cost in B's row (C3): P112-OWN023-COLDSERVER. |
| R10 | (new) "Your three video encodes in LX-elearning are using about 5 of 8 cores right now (load average 222) … Start the plain build now or wait?" | **Wait until they finish.** `run-arms.mjs` waits before each arm for no ffmpeg and ≥ 60% CPU idle twice a minute apart, and records the idle reading and every sitting's load averages. |

The kit on the day: **0.2.2 from the registry** (`create-nodegx`, `@nodegx/mcp`, `@nodegx/preview` all 0.2.2, published
2026-10-15). Agents run on Claude Code **2.1.301** (the VS Code extension's binary; the terminal's 2.1.251 can't run
Opus 5.5).

## 9.2 Richard's lines per app, before any number or hat (C11)

Written 2026-10-19 ~21:10, after playing K, M and R in a browser on the laptop, verbatim. Richard: *"I didn't see your
messages, I don't know which version is from which lane, so this is purely objective."* (The runner's messages had
named costs and letters — lab-notes; he had not read them.)

> **K:** Good effort, looks like an app but suffered from a weird bug - when looking at a list of songs, a playlist for
> example, the title and artist are either missing or black font on black background. Choice of icons is a bit basic
> and lazy. The modals and floating menus look very good though, very faithful to Spotify. The play bar looks very
> good, probably the best one.
>
> **R:** This one is a bit rough and basic. The opening screen shows the horizontal scroll bar on the song lists. The
> play bar is ok, better than M but not as good as M. Overall the style doesn't really remind me much of Spotify, or
> maybe some early beta version when Spotify was just released. Much less refined, basic styling, large basic fonts.
> I would have said this was made by a cheaper open weight model than Anthropic. It's not 'bad' in terms of everything
> works, but I wouldn't want to show this to real users yet without another style pass.
>
> **M:** Probably the one that looks most like an app, most faithful to Spotify. Icons are the best selection out of
> the three. The song cards look very professional. I prefer the modal and floating menu system from K, this one is a
> bit more basic 'use the browser default' style. The play bar has childish icons and isn't well spaced on the mobile
> view though.

Correction by Richard the same evening, asked about R's "better than M but not as good as M": *"Yeah not as good as K,
K had the most refined and true to Spotify play bar, not just a few icons and a slider."* (So R's play bar: better
than M's, not as good as K's.)

### 9.3 Richard's verdict (2026-10-20, ~15:45, after the three apps as F2 left them, the hats' choices, and the stop-and-check)

Asked the task's question — *is there anything in this repo a person needs more than Claude Code alone, and for whom?* —
with his earlier words offered as either notes or the verdict, Richard:

> Keep my words, in theory as it stands for just somebody deciding how to get into vibe coding, we're cooked. Nobody
> cares about being able to manage security settings and tweak parts of their app manually when they just want to
> play with Claude or make some small scale app for friends or colleagues.

The words kept, from the same afternoon (lab-notes): *"I dunno, it sounds like we're cooked"*; *"What's fucked up is I
deffo prefer M, it's the cleanest and most polished app-looking app out of the three. The Claude only one looks good
and can definitely compete …"* (M = B, NodeGX; the map was shown to him after the hats wrote).

**R11 (same message):** on `STOP-AND-CHECK.md`'s seven proposed tests (the ten changes, the dangerous errand, deploy
and audit, a European model …): *"I dunno, they all seem a bit of a stretch and only applicable for production apps
which would be a long shot for us to target."* **Not run.** The task closes on the result as measured; the stop-and-
check stays as the record of what was not tested and why it would matter only for production apps.

**What he asked for next:** *"a new session to dig deeper into the real world reasons NodeGX might have a place in the
decision to vibe code, the way Replit tries to argue to use them instead of just Claude Coding. I used Replit a lot at
the beginning of my AI coding journey because I was scared of doing pure Claude Coding and getting stuff wrong, even
though I'm an experienced low code builder."* → `own-023/NEXT-SESSION-PROMPT.md`.

## 10. What this task is not

- Not a benchmark of models (OWN-020 is). One model, three arms.
- Not a kit-tuning loop (OWN-019 is). Nothing is changed between arms, and a kit defect met is filed, not fixed
  mid-round.
- Not the quiz. The quiz is already 12/12 everywhere and would show nothing about a backend, a key or an editor.
- Not run by the session that scoped it. Richard: *"to design and scope, not to run."*
- Not an argument. The write-up answers a question; the message review is rewritten to fit the answer, never the
  reverse.

## 11. Files

- `own-023/brief.txt` — the paragraph, verbatim, plus the lab's closing line.
- `own-023/checklist.md` — the 23 lines, written before any arm ran, by this repo's session (C4 says what that is
  worth); `checklist-outside.md` is owed from a fresh agent before the first round.
- `own-023/hats/` — `README.md` (how a hat is run, what it is and isn't given), `harness-brief.md` (for the stranger
  who writes A+'s CLAUDE.md), `checklist-brief.md` (for the stranger who writes the outside checklist), `A.md`,
  `B.md`, `C.md`, `D.md`, `X.md` (one per hat), `grader.md` (the blind grader's brief), `writeup-brief.md` (for the
  stranger who writes the prose).
- `own-023/followups/` — F1–F4 sentences, verbatim.
- `own-023/NEXT-SESSION-PROMPT.md` — the handoff for the session that runs it.
- To build in that session: `round-arm.mjs` (round-claude.mjs with `--bare`, `--harness <file>`, `--nodegx`, the relay
  and the seal of §4.1), `grade-url.mjs` (the scripted checks of §5 over a URL), the gallery rows.
