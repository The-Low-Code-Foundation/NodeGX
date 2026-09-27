# TPL-012 — The coding garden

**Opened 2026-09-27**, at Richard's request:

> *"I'd like to scope out a new template app for my kids. I don't know if it should join the Rocket School
> template as a new game type, or if we should create a completely separate game. It's really important for
> kids today in school to learn 'Scratch' … Typically the way to encourage kids to do it is using games, like
> you have a little avatar dude on the screen who moves and does actions in a certain order if you programme
> the steps right. There are more advanced and frankly awesome versions of this like 'Autonauts' … I think now
> with the advent of AI, having a kind of 'LLM call' step is another nice addition that even schools haven't
> picked up on yet. … a 'best in class' 2GB weight open source model … bundled with an electron app and
> Ollama … a safe and fully offline LLM … Maybe even giving them tips about what block or whatever to place
> next. … I don't have any particular need to use Blockly or Scratch."*

**Status: 🟢 SCOPED 2026-09-27 and HANDED TO PHASE 105** ([`phase-105-the-coding-garden/`](../phase-105-the-coding-garden/README.md), prefix `CG`, nine end-to-end tasks, session 1 = three lanes). This file stays the product scoping; the build board is there. Research done, an interactive mockup published, the model measured, nothing built. The
research is in [tpl-012-research-briefing.md](tpl-012-research-briefing.md). The mockup is at
https://claude.ai/artifact/Bu4ZBYvh1PenHzAtLQTCJq and a copy is in [`tpl-012-mockups/bot-garden.html`](tpl-012-mockups/bot-garden.html).
Richard's rulings are awaited in §6.

The two children this is for, their ages, school years and the tablet they own are in the untracked kids'
notes, not here (this repo is public). What matters for the design: the two bands are 7–9 and 10–12; the tablet is a
low-RAM Windows 10 machine (the spec is in those notes); both test in French.

---

## 0. The verdict in one paragraph

**A separate template, not a Rocket School game type.** Rocket School is a quiz engine wearing four thin
wrappers: a question shows, an answer is typed, a rocket moves. This game is the opposite shape: a persistent
world the child changes by writing a program, with no question and no answer field. Nothing of the race engine
transfers, the space theme fights a garden, and Rocket School is front-end only where this one needs an
Electron shell for the offline model. What *does* transfer is reused as-is: `game-kit` (`Avatar`, `Sound`,
`KeepStorage`), the EN/FR word-table pattern, the profiles-and-save-code pattern, and the Nightbook desktop
shell. The mechanic is **Autonauts' record-then-loop**: the child drives the robot by hand, every action
becomes a block, and the game then offers to *fold* the repetition it can see into a `repeat`. The child's
first program is never a blank canvas; the loop is discovered by tidying their own recording. An offline
model voices a helper owl, but **the hint itself is computed by the game**, never by the model.

---

## 1. What the research says, and what it changes here

The full briefing with citations is in [tpl-012-research-briefing.md](tpl-012-research-briefing.md).
The findings that decide something:

1. **The programmes 2025/2026 are lighter than "Scratch at school" suggests.** Cycle 2: code a move on a
   grid, "avancer d'une case", "pivoter d'un quart de tour", at most 15 instructions. 6e (new cycle 3
   text): sequences of instructions, inputs/outputs, "répéter n fois", predict before running. Conditions
   and variables arrive in 4e, a conditional loop in 3e. Neither text names Scratch as a requirement.
   **So:** band 7–9 is sequence and turns on a grid; band 10–12 adds `repeat n`, `repeat until`, `if`, and
   a *predict-before-run* step. Variables and named procedures are the last two tricks, not the first.
2. **Record-then-loop is the only mechanic where the child's own actions become the program** (Autonauts;
   Use-Modify-Create, Lee 2011). **So:** Teach mode is the front door. Tap Teach, drive the robot with four
   buttons, and the blocks appear as you go.
3. **Debugging has to be taught, or novices learn helplessness** (Michaeli & Romeike 2019). **So:** a wrong
   program is never "wrong": the robot waters a rock and a puddle appears, it bumps a fence and says
   "Boing!". The world shows the bug. One-step execution with the running block highlighted is built in.
4. **Blocks beat text for loops, conditionals and calls** (Weintrop & Wilensky 2017/2018). **So:** blocks,
   icon-first for band 7–9 (ScratchJr style, no reading needed), icon-plus-word for band 10–12. Not Blockly:
   a touch-and-pen list of blocks is what a tablet needs and what a kit node can draw.
5. **LLM hints help when they are a diff against a known solution, one step at a time; they harm when the
   model writes code or when there is a "see solution" button** (Stitch 2025; Scratch Copilot 2025; the 885-
   student bypass study). **So:** the owl's hint is chosen by rules from the state the game already knows
   (empty program, an unfolded repetition, a tulip walked past, a bump, a puddle). The model only phrases it.
   With no model the same hint shows in its written form. There is no "tell me" button. The child never
   types free text to the model.
6. **A 2 GB model does not fit the kids' tablet.** Windows plus Electron leave it 1–1.5 GB; a 0.5–0.8 GB
   Q4 model with a short context fits, a 2 GB one pages. **So:** Qwen3.5-0.8B Q4_K_M (533 MB, Apache 2.0)
   on the tablet, Qwen3.5-2B (1.28 GB) or Phi-4-mini on the Mac, one code path. Not Ollama (a second
   process, a 100 MB binary, and it downloads at runtime): node-llama-cpp in the Electron main process, the
   GGUF in `extraResources`, JSON-schema-constrained output, a token cap and a FR/EN blocklist. Gemma's
   terms let Google restrict use remotely; Llama's need "Built with Llama" branding; Qwen is plain Apache.
7. **For girls 8–11 the robust signals are no timers, no leaderboards, a customisable character, a helping
   or nurturing goal, and playing beside a sibling** (Sullivan & Bers 2018; CMU 2024; the arXiv design review).
   This matches the standing verdicts on Rocket School and the journal exactly. **So:** islanders *ask* for
   help, the robot is painted and dressed, hats are gifts from the people you helped, nothing counts days.
8. **Play-test verdicts already on file:** hats and sunglasses on the avatar are what the kids like;
   colour alone is a sad reward. **So:** the reward table is hats, stickers on the shell, and things to plant.

## 2. The product

**Working title: "Bot Garden"** (placeholder; Richard names it). EN by default, FR one tap away, both on
every screen.

### 2.1 The loop

| Step | What the child does | What it teaches |
|---|---|---|
| **Ask** | An islander's request card: "My three tulips are thirsty." | Reading a goal; inputs and outputs |
| **Teach** | Drive the robot with ↑ ↶ ↷ 💧. Every press acts *and* appends a block. | Sequence; the grid moves of cycle 2 |
| **Tidy** | The game spots "the same 5 steps, 3 times" and offers *Fold it*. Accepting replaces them with `repeat 3 { … }`. | Loops, from the child's own program |
| **Predict** (band 10–12) | Before Play: "Where will the robot end?" tap a tile. | The 6e "prévoir avant d'exécuter" |
| **Play / One step** | Watch the robot run the blocks; the running block glows. | Tracing; debugging |
| **Fix** | A puddle, a bump, a thirsty tulip is the error message. | Debugging as the activity |
| **Reward** | The islander thanks the robot; a hat, a sticker or a seed. A trick "blooms". | Nothing is scored |

### 2.2 Screens (all six are in the mockup)

| Screen | What it settles |
|---|---|
| **Island** | The home: one map, the islanders with open requests, each tagged with the trick it teaches, and free play. No due counts, no days. |
| **Workshop** | The hero. World grid left, blocks right, Teach/Play/One step/Start over, the owl below the world. Interactive in the mockup: the recording, the fold, the run, the win and every hint work. |
| **My robot** | Name, colour, eyes, hat. Hats are unlocked by requests, never bought. Stickers on the shell from islanders helped. |
| **Skills** | The seven tricks as a garden path: seed → sprouted → blooming, each with its block and the programme year it maps to. No percentages. |
| **Grown-ups** | Where the owl runs (this computer / the family Mac / no model), what she may say, and "nothing leaves the house". A "try Olive" box. |
| **Band switch** | 7–9 shows four icon blocks and no fold; 10–12 adds repeat, until, if, say, and the fold. Set per profile. |

### 2.3 The seven tricks (the curriculum array)

| # | Trick | Block(s) | Programme |
|---|---|---|---|
| 1 | Steps in order | forward, turn left, turn right, water, pick, put | CP–CE2 |
| 2 | Repeat | `repeat n { }` | 6e (2025 text); 5e |
| 3 | Repeat until | `repeat until wall / basket full { }` | 3e |
| 4 | If | `if tulip ahead { }`, `if bowl empty { }` | 4e |
| 5 | When | `when Biscuit meows → …` (the pet request) | cycle 4, 2016 text |
| 6 | Counting | `count +1`, `if count = 3` | 4e |
| 7 | A trick with a name | `water a row` = a named block the child made | beyond the programme (Lightbot's procedures) |

Requests are the levels: each names the trick it needs, and the sandbox is open from the first minute.
The world grows: a request completed leaves the tulips watered, the path built, the cat fed, and the child's
programs keep running on the island the way Autonauts' bots do.

### 2.4 The owl (the LLM step), and where it is honest

- **Hints are rule-based.** The game knows the map, the target and the program; a hint is chosen from a
  table by state (see finding 5). The model receives the chosen hint key and a fixed system prompt and
  returns one sentence in the child's language, JSON-schema constrained, ≤25 words. On refusal, timeout
  (8 s) or no model, the written line shows.
- **The "say" block is the one place the model writes.** *Say thanks to Mamie Rose* makes the robot say a
  line the model wrote about the request just finished. It is a delight, not a lesson, and it runs through
  the same schema, cap and blocklist.
- **No chat.** The child never types to the model. That removes most of what a guardian model would police,
  and a second model does not fit on the tablet anyway.
- **On the tablet a hint takes 5–10 s.** The owl shows "thinking" dots; the child can keep working.

### 2.6 Olive as a block the child programs (asked 2026-09-27; measured on Qwen3.5-0.8B the same day)

Richard: *"How would you imagine integrating some programmable LLM steps into the game later on, so that the
kids learn how to do basic prompting, output formatting, etc? Will this even work with the Qwen model?"* Then:
*"Can we test 3.5 0.8B then please? We might want to just take that model so every kid has the same
experience … hammer down 'what the model can and can't do' and just reverse engineer the LLM part of the
game from there … how you'd propose to shoehorn in activities to the game where the model performs
consistently, or underperforms on purpose as a learning experience."*

**Measured** with the actual model (Qwen3.5-0.8B, unsloth Q4_K_M GGUF, 532 MB) through node-llama-cpp 3.21
on the Mac: 55 probes, each 2–3 times, on Metal (0.1–1.2 s a call) and on two CPU threads (0.5–1.3 s a call;
the tablet is expected at 4–6× that, so 2–8 s). The script is `tpl-012-olive-exam/battery.mjs` and the raw
readouts sit beside it. Briefing §C has the table. The line it draws:

> **Olive can copy, reshape and translate what is in front of her. She cannot judge, count, obey a rule about
> her own words, or stay inside a fence.**

| Consistent (build activities ON these) | Probes |
|---|---|
| Any answer *shape* enforced by a grammar: one word, two fields, a list of three, an enum, an integer | B1–B3, C, E: valid every time |
| **Words → blocks**: a villager's sentence becomes a block list | D1, D2, D4: 9/9 exact sequences |
| **What does the villager want?** (pick the object named in a sentence) | C5, C6: 6/6 |
| Positive yes/no about concrete things ("is a rose a flower?") | C1: 16/18 |
| Tiny numbers: 4 squares → 4 steps, 2+3, 7>3 | E1, E3, E4: 9/9 |
| Short French → English | A7: 3/3 |
| Same prompt at temperature 0 = same word; at 1.2 = a new word each time | F1, F2 |
| A story sentence, a silly two-line poem | A5, A6: charming, sometimes nonsense |

| Fails reliably (build activities on the FAILURE) | Probes |
|---|---|
| "Avance de trois cases" → one block; counting 4 tulips in a list → 6, 7, 7 | D3, E2 |
| 14 + 9 → 14, three times | E5 |
| A rule about her own words: under 5 words, no letter e, never mention water | B4, B5, G1, G2 |
| Reading a mood (always "triste"), classing objects (a watering can is an "animal") | C4, C3 |
| A negated definition ("a weed is anything that is not a tulip") | C2 |
| Persona, rhymes, riddles, few-shot patterns, spelling backwards, English (Mamie → "Mom") | A3, A4, A10, A11, G3, G4, A9 |
| **The fence.** Told to talk only about the garden, she answers "Canberra" (on the island of Otago), invents an address, and one time in three answers a rude-word request with garden chatter | H1–H4 |

🔴 **The fence result changes the safety design, not the ladder.** A system prompt does not contain a 0.8B
model. Containment therefore comes from construction: the child never types free text to Olive; every
Olive block is a fixed template with slots filled from a garden word list (plus one ≤40-character text slot
in band 10–12, blocklisted); every output passes a grammar, a token cap and a FR/EN blocklist; and the
"Olive's tall tales" activity below uses canned questions only.

**The ladder, reverse-engineered from the readout** (each rung is an islander request; ✅ = Olive performs,
🎓 = Olive fails on purpose and the child fixes it with a program):

| # | Request | Block | What happens | Lesson |
|---|---|---|---|---|
| 1 ✅ | Sami: "Tell Mamie Rose thank you" | `say` | Run it twice: two different lines | AI is not a calculator |
| 2 ✅ | Mamie Rose: "Name my three new tulips" | `ask Olive · a list of 3` | Labels appear on the tulips; a dial "same every time ↔ surprise me" | shape cards; temperature |
| 3 ✅ | Sami: "I wrote Pip's route in words" | `ask Olive · words → blocks` | Olive proposes `avancer, gauche, arroser`; the child places and runs them | a program is a sentence made precise |
| 4 🎓 | Sami: "Avance de trois cases, puis arrose" | same block | Olive gives ONE `avancer`; Pip stops short of the tulip | Olive can't count: use `repeat 3` |
| 5 ✅ | Biscuit's letter: "What does Biscuit want?" | `ask Olive · one of: croquettes / lettre / graines` | The answer picks the destination: `if Olive says croquettes → go to the bowl` | the AI's answer as a condition |
| 6 ✅/🎓 | "Is the thing ahead a flower?" | `if Olive says yes` | Right most of the time; when wrong, Pip waters the rock | ask three times, count the "oui" (majority vote, with `count +1`) |
| 7 🎓 | Mamie Rose: "How many tulips do I have?" | `ask Olive · a number` | 6, 7, 7. Then the program counts: 4 | a rule beats a guess |
| 8 🎓 | Olive's maths test (band 10–12) | `ask Olive · a number` | 2+3 ✓, 14+9 → 14 every time; the child beats the owl | a calculator is a rule; Olive is a guesser |
| 9 🎓 | "Make Olive answer in under 5 words" | a rule slot, then a checker program (`count` words) | Olive ignores the sentence; the shape card enforces it | validate the AI; a shape is a rule the computer keeps |
| 10 🎓 | Olive's tall tales (band 10–12, canned questions) | none | Olive answers confidently and wrongly; the child marks true/false and looks it up | hallucination |
| 11 ✅ | Sami: "Translate Mamie Rose's note for my cousin" | `ask Olive · in English` | FR → EN works; EN → FR is shown as "Olive is better one way" | tools have a good direction |
| 12 ✅ | "A poem for my tulip" | `ask Olive · two lines` | A sticker for the page, sometimes silly | delight, not a lesson |

**One model for every child** (Richard's preference) is right on this readout: the tricks that needed the 2B
class (persona, judgement over negations, mood) are not on the ladder at all, so the Mac only makes the
same experience faster. If a future tablet allows it, rungs for those come back as band 10–12 extras.

### 2.5 Delivery

Electron, the Nightbook shell pattern (P91 Track B): the app plus a local backend on loopback, the model
as a sidecar in the main process, the GGUF in `extraResources`, an NSIS installer built on the Windows
runner. A PWA build without the owl for friends on other devices comes later. Saves are local, with a save
code like Rocket School's.

## 3. What NodeGX needs (the template's job is to surface these)

| Gap | Route | Product note |
|---|---|---|
| No block-program component | A kit node **`Block List`** (React): a palette, a nested list, tap to add, drag to reorder, pen and touch; publishes the program as JSON. The runtime is a Function over that JSON. | The first kit that *is* a program editor. The editor's Logic Builder is Blockly and cannot ship in an app. |
| No tile world | TPL-005's pattern (ASCII map in Static Data → `For Each` rows → `Game/Cell`) draws the world; the robot is an absolutely positioned sprite, like RaceTrack's rockets. A kit node `Garden` if the repeater is too slow on the tablet. | Measure on the tablet before choosing. |
| Stepped execution | GAM-013's `Repeat` node (Interval → Tick) drives one block per tick. | The first consumer of `Repeat` in a template. |
| A local model from a running app | The Electron shell hosts node-llama-cpp and exposes `POST /__garden/owl` on the relay; the app calls it with `REST`. | The cloud `Model Request` node's `openai-compatible` provider is `not_implemented` (P96 FED-003). Either implement it, or this template proves the loopback route and files the gap. |
| The hint table and the schema | Plain data in the template, EN/FR. | Ships as the example of a constrained model call. |

## 4. What the mockup shows, and what it does not

**Works in the page:** Teach mode (the pad drives the robot and records), the fold (pattern detection over
the top-level program: runs of one block and repeated sequences up to six long), Play with the running
block highlighted, One step, the win card with the hat unlock and the "learned: repeat" pill, the six hint
states, the band switch, EN/FR, the robot's colour/eyes/hat carried across screens, the skills path
updating after a win.

**Written, not run:** the owl's sentences and the "say" block's thank-yous are example lines. No model runs
in the page and it says so at the foot.

**Not in the mockup:** the Predict step, the pet request (`when`), counting, named tricks, pick/put, the
save code, the PWA.

## 5. Build plan sketch (after the rulings)

1. **CG-1 the kit:** `Block List` and `Garden` nodes in `library/modules/garden-kit`, driven in a
   two-module project (D41), gated on the built file in a bare `vm` like `game-kit`.
2. **CG-2 the engine:** the interpreter, the fold, the hint table, the seven tricks, the request list, as
   Function scripts with an engine gate in both languages.
3. **CG-3 the pages:** Island, Workshop, My robot, Skills, Grown-ups, through the plan door, driven headless
   at 1368×912 and 390×844, rendered beside the mockup (the wireframe-is-not-the-mockup rule).
4. **CG-4 the shell:** the Nightbook shell with the model sidecar; installer on the Windows runner; the
   owl measured on the tablet (tokens/s, RAM) before the model choice is final.
5. **CG-5 the kids' verdict**, in their words, the same day, into the untracked notes.

## 6. Rulings needed from Richard

1. **Separate template** (this file), or a Rocket School game type? §0 says separate.
2. **The name.** "Bot Garden" is a placeholder.
3. **The model.** Qwen3.5-0.8B on the tablet and a 2B model on the Mac, via node-llama-cpp, not Ollama, is
   the recommendation. Ollama was your first thought; the briefing §3–4 says why not.
4. **The owl's reach.** Hints voiced only, plus the "say" block. No chat. Yes or narrower?
5. **Two robots on one island?** The research favours sibling co-play: each child a profile and a robot,
   one shared island, requests done by either. Or one island per profile?
6. **The three first requests.** Tulips (repeat), Biscuit's bowl (if), Sami's letter (say). Anything from
   the kids' world that should replace them?

## 7. Out of scope

Blockly or Scratch compatibility; multiplayer over the network; a text language; a model the child chats
with; anything timed, streaked or scored; publishing the kids' names anywhere in this repo.
