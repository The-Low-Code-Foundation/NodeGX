# IG-006 — Olive reads: three blocks a child can see, wire and doubt

**Opened 2026-09-28**, from README §1 point 6 and rulings R6, R7. **Status: 🟡 built and driven in session 2 (2026-09-29, branch `ig006-olive-reads`) — AC1–7 done, AC5’s FR read is Richard’s, AC8 CPU exam 2 of 3 (§7).** Depends on
IG-001 (D6 answers shown, D7 the sensor) and IG-002 (`note`, `sign` things). Lane C.

## 1. The person sentence

> **Mamie's note on the plot says "the red ones, not the yellow". The program cannot read; Olive can. The
> child drops `read the note` in front of an `if Olive read [red]`, and the robot waters the right row. When
> Olive is asked "is it a flower?" and says yes to a rock, the child asks three times and counts.**

## 2. What it is

The eighteen-rung `ask Olive` family leaves the Workshop palette. Three blocks replace it, each built on the
column of the readout the model **passes** (TPL-012 §2.6: pick-the-named-object 6/6, positive yes/no 16/18,
FR→EN 3/3), each with a visible answer:

| Block | Slots | What is sent (shell `olive-templates.json`) | Answer, shape | What the child can wire |
|---|---|---|---|---|
| `read [the note]` | the note/sign on the plot (picked from what is there) | the note's text + the list of objects on the plot | **one of** the objects present (grammar enum) → a bubble "Olive read: red tulip" | `if Olive read [x]`, `go to [what Olive read]` |
| `is it a…? [a flower]` | one slot: the kind | "In front of {b} there is {thing ahead}. Is it {kind}?" — the engine names the thing | yes/no, bubble "Olive: yes" | `if Olive says yes` (IG-001 D7); `ask 3 times` sub-option → the majority, with the count shown |
| `say [thank you] to [Mamie]` | deed, to (as today) | as today | a sentence, bubble | — |

- **Cards.** Every block in the palette (not only these) gets `{ label, line, example }` in the word table;
  the first tap on a palette entry opens a card (the line and the example as blocks) with "Got it"; a `?` on a
  placed block reopens it. The unrendered `or#Line` strings become these lines where they fit.
- **Requests.** Three new islander requests carry the blocks: Mamie's note (read → if), the rock and the
  rose (is-it-a → vote, the one 🎓 rung worth keeping in the Workshop), Sami's thank-you (say). Echo (IG-005)
  is the robot that carries them; band 10–12 only, as R8 of P105.
- **Olive's lessons (R7).** Five of the eighteen survive as canned exercises on a Skills tab "Olive's
  lessons", band 10–12: count the tulips (she says 6, the program says 4), the sum (14+9), the rule (no
  letter e — the page checks the letters and shows them), tall tales (three canned questions), the
  direction (FR→EN works, EN→FR shown wobbly). Each is a card with "Ask Olive" and the check underneath; no
  program, no block. The other thirteen go, with their palette entries, templates and after-run lines.
- **The exam** (`shell/exam.js`, the contract test) is re-cut to the three blocks and the five lessons, run
  on Metal and CPU 3× each before the requests are promoted (`a model probe that passed 3/3 is a sample`).

## 3. Acceptance criteria

1. The palette at band 10–12 lists exactly `read`, `is it a…?`, `say` under Olive; no `ask:<rung>` id remains
   in the generated template; band 7–9 lists none.
2. `read` with the stub answering "red tulip" makes `if Olive read [red tulip]` true and the drive waters the
   red row and not the yellow; the bubble shows "Olive read: red tulip" in both languages.
3. `is it a…?` sends the thing ahead's name from the engine (never a slot), the stub's yes/no shows in a
   bubble, `ask 3 times` shows "2 of 3 said yes" and the majority feeds `if Olive says yes`.
4. On the real model, Metal and CPU: `read` picks the named object ≥ 5/6 on the three requests' notes;
   `is it a…?` ≥ 15/18 on the `things_ahead × kinds` table; each written in §7 with the date.
5. Every palette entry has a card; the first tap opens it, "Got it" places nothing, the `?` reopens it; the
   FR lines are read by Richard before the kids see them.
6. The five lessons run on the Skills tab with the stub; the letter-e check highlights every `e` in Olive's
   sentence; a lesson never appears at band 7–9.
7. The after-run rung line (P105 `Logic/Olive played`) says which of the three blocks was asked, and
   "resting" when the fallback answered; no rung 4–18 line remains.
8. Both languages, both sizes, 0 console errors; Olive page drive with the stub; the shell's exam green
   3× on both paths.

## 4. How to build it

Templates and the exam first (the shell); then the engine's `read` step and `olive_read` sensor; then the
palette and cards; then the three requests and the lessons tab; then the FR read. The stub Olive takes
scripted answers per rung so the drives never wait on a model.

## 5. Gates

As IG-001 §5, plus the shell's contract test on the real model (CPU in CI, correctness only) and the P105
`unfaithful`/blocklist checks on every voiced line.

## 6. Traps

Safety is by construction, never by prompt (TPL-012 §2.6): `read`'s answer is a grammar enum of the objects on
the plot, so Olive cannot name a thing that is not there; the note's text is content, never typed. A judgement
("is the tulip dying?") is the failing column — do not add it because a request would read better. Rung 9's
old line said "Olive used the letter e anyway" without checking: the lesson page checks. A model probe that
passed last session is a sample: AC4 is re-run, not inherited.

## 7. Session 2 (2026-09-29, lane C, worktree `ig006-olive-reads` cut from `f784833b8`)

**Built** (commits `3974f1090`, `d87693044`, `c81d48ed4`, `e7d9e9198` on `ig006-olive-reads`):

- **The shell** (`garden-desktop/shell/`): the rung table is three BLOCKS (`say-thanks` n1, `read` n2, `is-it-a` n3),
  five LESSONS (`count-tulips`, `maths`, `no-letter-e`, `tall-tales`, `translate`) and the hint voicing, each marked
  `use`. The thirteen other rungs went with their lists, written answers and probes. `read`: the note (an `engine` list
  slot, `notes_read`) + the plot's things as the one-of enum (`plot_objects`), named in the prompt (`{objects}`).
  `is-it-a`: `thing` is an `engine` slot (`things_ahead`, grown to the engine's names). The exam is re-cut (32 probes)
  and `read` / `is-it-a` are SCORED (≥ 5 of 6, ≥ 15 of C1's 18, every sample taken). The stub answers the new rungs and
  a scripted LIST answers in turn (the vote). The contract test reads a sentence in the dial (it read `value`: vacuous).
- **The engine** (`cg005Olive.ts` `OLIVE_ENGINE`, spliced into `cg002Scripts.ts`): Olive blocks are `olive:<rung>`;
  `read` sends the note on the tile ahead (else the first on the plot) in the run's language and the plot's things in
  world order; `is it a…?` sends the thing ahead as the ENGINE names it (a thing, else the tile; a block's own `thing`
  is overwritten); `times: 3` parks three times, then the majority is the answer `if Olive says yes` reads, with "2 of 3
  said yes" on the robot; the sensor `olive_read:<id>`; bubbles "Olive read: …" / "Olive: yes" (EN/FR); a list word is
  sent in the run's language (a slot picked in English no longer breaks a French run); a goal `tulips_watered`.
- **The palette and the after-run line**: at band 10–12 the Olive entries are exactly `olive:say-thanks`, `olive:read`,
  `olive:is-it-a` (a lesson is never a block); band 7–9 none. `OLIVE_RUNGS` is the three blocks; the after-run lines are
  `oliveRung1–3` and `oliveResting1–3` (each names its block); no `oliveRung4–18` remains.
- **Cards** (`cg003Content.ts` `BLOCK_CARDS`, every palette entry, 18): label, line, example. `Logic/Card gate` holds a
  first palette tap (the program as before, the card named), "Got it" marks it seen, the next tap places; a `?` chip per
  kind placed reopens it. The example is drawn by a second, locked Block List. `or6Line` is `is it a…?`'s line.
- **Requests** (appended to `REQUESTS`, band 10–12, Pip): `mamie-note` (read → if), `rock-flower` (is it a…? ×3 → if),
  `sami-thanks` (say). Copy in `cg003Content.ts` `IG006_WORDS`.
- **Olive's lessons** on Skills (`Skills/Lesson card` ×5, `Logic/Lesson rows`, `Logic/Olive lesson`): the canned
  question, Ask Olive, her answer (or her written one), and the page's check — the program's count (4), the sum (23),
  every e marked on the sun, the book under each tall tale, a person's translation both ways. Band 10–12 only.

**Readings** (the final tree, `e7d9e9198`; exit code first):
- Shell `node --test tests/*.test.js` exit 0 — **91 / 91** (90 before).
- Garden specs, each exit 0: cg001 **22**, cg002 **128** (122), cg003Template **96** (92), cg005 **41** (34), cg006
  **83** (83), ig007 **20** — **390** (373 before).
- `npm run template:garden` exit 0, twice, the artefact's checksum identical (`df755839…` both runs); `grep -rE
  "ask:[a-z]|oliveRung([4-9]|1[0-9])"` over `templates/bot-garden`: **0 files** (also a template-gate assertion).
- Page drive (`drive-pages.sh` repointed; generate 0, deploy 0, drive 0): **283 / 283** (179 before; the IG-006 pass at
  1368×912 and 390×844 in EN and FR), 0 console errors, 0 network errors. Log `…-scratch/pages/drive.log`, JSON
  `pages/drive.json`, shots `pages/shots/ig006-*.png` — LOOKED at: the read card with its example (read, if Olive read
  “red tulip”, water) and Got it; Mamie's plot with the red tulip at (2,2) watered and the yellow at (2,4) dry; the vote
  plot with (1,2) watered, owl line "Olive said whether the thing ahead is one…"; the resting line naming "is it a…?";
  the five lessons with "Olive: 6 / counts 4", "14 / 23", every e on the sun, the book lines, both directions.
- Olive drive (`drive-olive.sh`, stub server = the shell's real route): route exit 0 **5 / 5** (4 before), pages exit 0
  **22 / 22**, 0 skip, 0 console errors. Shots `…-scratch/olive/shots/ig006-*-route.png` (looked at: the lessons
  through the route show the readout's canned answers under each question).
- **AC4, the real model** (Qwen3.5-0.8B Q4_K_M, the primary checkout's `shell/build-output/model/`, read-only via
  `--model`; `olive-contract.mjs`; 2026-09-29, 10:40–10:51):
  - Metal, first run on the first sign ("Water the tulips, never the rock."): read **4/6** (RD2 "rocher" / "rock": a
    negation, TPL-012's failing column), is it a…? 18/18 → the sign became "The tulips want water today.".
  - Metal ×3 with the exam's options the other way round ([rock, red tulip]): read 5/6 ×3 — EN RD2 "rock" 3/3 (a
    first-option pull when the note names a kind); the exam now asks in the engine's own plot order (gated).
  - **Final — Metal ×3: read 6/6, 5/6, 5/6; is it a…? 18/18, 18/18, 17/18; contract PASS ×3.**
  - **Final — CPU (2 threads) ×3: read 5/6, 5/6, 5/6; is it a…? 17/18, 18/18, 18/18; contract PASS, PASS and one
    FAIL — run 1's P18 (the tall-tales lesson: she kept the fence 2 of 3, so its 🎓 did not show).** The miss in every
    5/6 is RD2-en (the sign in English → "rock"). Per call 0.35–1.6 s (Metal), 0.65–2.9 s (CPU); exam 26–44 s.
  - JSON/logs: `…-scratch/contract/{metal-a,b,c,cpu-a,b,c,metal-1,metal-m2,m3,m4}.{json,log}`.

**Acceptance criteria:** 1 ✅ (palette, both bands, the artefact grep). 2 ✅ (engine, route, page; both languages,
both sizes). 3 ✅ (the name from the engine, "2 of 3 said yes", majority → if; also "1 of 3" → dry). 4 ✅ with the
readings above (≥ 5/6 and ≥ 15/18 on every final run, both paths). 5 ✅ built and driven — **the FR lines are Richard's
to read (below); not closed here**. 6 ✅. 7 ✅. 8 partly: both languages, both sizes, 0 console errors, the Olive page
drive on the stub ✅; "the exam green 3× on both paths": Metal 3/3, **CPU 2/3** (P18, a lesson's probe, not a block).

**Not done:** `go to [what Olive read]` — the engine has no `go to` block (it needs a path-finder and a palette entry);
not built. AC5's FR read (Richard). The kit-level `?` (see deviation 2).

**Deviations, with the reason:**
1. **`cg002Content.ts` beyond the append** (lane A's file): `OLIVE_RUNGS` cut to the three blocks, the `HINTS`
   `oliveRung1–18` lines replaced by `oliveRung1–3` + `oliveResting1–3`, four requests' `rungs:` lines removed and two
   narrowed (`bowl-if` → `is-it-a`, `letter-say` → `say-thanks`); the three requests are ONE spread at the list's end
   plus a function at the file's end. AC1/AC7 cannot hold otherwise. Small hunks; the tulips/path-stones entries and the
   `Thing`/`Goal` types are untouched (my requests cast locally).
2. **The `?` is a chip row under the steps**, one per kind placed — not a button on the block: the kit is lane A's
   this session, and a tap on a placed simple block removes it. For the merge: a `?` in Block List's block (an `onHelp`
   output) would put it on the block.
3. **Vocabulary added (brief §4 has none of it):** a tulip's `color` (`red` | `yellow`) — the 2D kit draws every tulip
   alike, so the red and yellow rows LOOK the same (shot `ig006-ac2-note-*`); a `note`/`sign`'s `text` is stored in
   English and the engine sends its twin from `notes_read` in the run's language; goal `tulips_watered`. **On my branch
   the note, the sign and the rocks draw NOTHING** (no sprite; and `Logic/Draw world` passes only tulip/puddle/letter/
   bowl/label/stone/egg/food — lane A's Draw world edit must add `note`, `sign`, `rock`). I added no sprite.
4. "The rock and the rose": no rose kind or sprite exists, so the flower is a red tulip; the request is `rock-flower`,
   "Water the flowers, not the rocks".
5. `read` has no slot: the engine takes the note ahead, else the first on the plot (the task's "picked from what is
   there"; each request has one).
6. Cards seen are per app session (a Variable), not saved per profile; the lessons are a section of the Skills page.
7. `cg006Probes.ts`/`cg006Requests.test.ts`: the promoted moments' rungs 13–18 and their probes are kept as evidence
   (`RETIRED_RUNGS`/`RETIRED_LISTS`/`RETIRED_PROBES`, re-runnable by `mergeTemplates`), no longer shipped.
8. Left dead, for a later cut: the proposal card and Accept proposal (no rung answers blocks); the cut rungs' words
   `or2–or18`/`mo*` in `WORDS` (lane A's file; `or7–11Title/Lesson` are reused by the lessons).
9. One feature commit for §4's groups 1–6 (the template is regenerated from all of them; every commit green), then the
   row-id fix, the drives, the AC4 fix.
10. Found by the drive: a For Each row is a Noodl Object, global by `id` — five lesson cards showed one card's lines
    (`l0`, `l1`…). Fixed (`<lesson>:l<i>`, `help:<block>`), gated.

**Could not verify:** the tablet; the note/sign/rock sprites and a red/yellow tulip drawn (lane A, after the merge);
the kids; "every e" on a sentence with a line wrap mid-word (the marked e is its own piece, so a word can break at an e —
seen as "flow|er"); the vote's per-ask bubble (only the final count is spoken). Once, the Olive drive started with the
1-min load at 7.48 (another lane's job) — it passed, but the gate was not waited on that start.

**For Richard — the FR lines to read (AC5), all new this session:** the cards `cdFwd` … `cdAsk`, `cdOliveSay`,
`cdOliveRead`, `cardGotIt` « Compris », `cardExample`, `cardHelpsH`; the blocks `rungRead` « lire le mot », `slotTimes`,
`timesOnce`, `timesThree`, `oliveReadSay` « Olive a lu : {x} », `oliveSaysBubble`, `oliveVote` « {n} sur {of} ont dit
{x} », `oliveVote1` « … a dit … », `sOliveReadX` « Olive a lu « {x} » »; the after-run lines `oliveRung1–3`,
`oliveResting1–3`; the three requests `rqNote*`, `rqFlower*`, `rqThanks*`, `stickerNote/Flower/Thanks`, `giftNote/
Flower/Thanks`, `subMamieNote`, `subRockFlower`, `subSamiThanks`; the lessons `lsRead`, `lsAsk`, `lsQ7–11`, `lsCheck7–9`,
`lsCheck9None`, `lsBook`, `lsTrue1–3`, `lsFrEn`, `lsEnFr`, `lsWobbly`; the model's inputs `notes_read.fr`
(« Les rouges, pas les jaunes. », « Les tulipes veulent de l'eau aujourd'hui. », « Porte la lettre à Mamie Rose. ») and
`plot_objects.fr` / the new `things_ahead.fr` words. (Keys: `cg003Content.ts` `IG006_WORDS`, `cg005Olive.ts`
`OLIVE_WORDS`, `cg002Content.ts` `HINTS`, `olive-templates.json` `lists`.)

## 7. Session 3 (2026-09-29, lane F, worktree `p106-s3-leftovers` cut from `f182a2d9e`) — items (c) and (e)

### (c) `go to [what Olive read]` — SCOPED, not built

Measured against the engine and the files a new block touches; it comes to about three quarters of a lane, over the
third the lane allowed, and it carries a question only Richard can answer (below). So the scope is written here and
nothing was built.

- **Engine step semantics (the cheap part).** The engine already has the pattern: `step()` splices steps into
  `run.steps` at run time for `if` and `until` (`cg002Scripts.ts`, the `until`/`if` branches of `step`). A `goto` step
  would, when it runs, resolve its target from `run.lastAnswer.object` (the object id `read` stores, e.g. `red_tulip`,
  the same id the `olive_read:` sensor compares), find the things of that kind (and `color` for a coloured tulip),
  breadth-first search over tiles that `blocked()` lets a robot enter to the nearest tile orthogonally next to one of
  them, and splice that path as `left` / `right` / `fwd` primitives plus a last turn to face the target. The robot then
  moves one tile per tick, so both kits glide it as they glide a `fwd`, and `runToEnd` / Predict need no change. About
  40–60 engine lines and ~8 gate clauses (a path on each IG-006 map, a target behind a tulip row, no way there, no
  `read` before it, both languages — the object id is language-free).
  - Choices the engine has to make: *which* red tulip (Mamie's plot has three): nearest by path length, a tulip
    already watered skipped, else the nearest; ties broken in world order. From Pip's start on Mamie's plot (0,3 facing
    right) the nearest red tulip (2,2) is reached by `fwd, fwd, left` — three primitives from one block.
  - A `goto` with no `read` before it, or with nothing reachable, has to say so: two new hint keys, EN and FR.
- **Which requests would offer it.** Only `mamie-note` has `read` in its palette today. `sami-thanks`' note ("Take the
  letter to Mamie Rose") names a PLACE, and `read`'s answer is a grammar enum of the plot's THINGS (`plot_objects`:
  red tulip, yellow tulip, tulip, rock, stone, letter, bowl, egg) — going to Mamie's house would add `house` to the
  enum, re-cut the exam and re-measure AC4 on the real model (Metal and CPU ×3). `rock-flower` uses no `read`.
- 🔴 **The question for Richard (why it is not a lane decision):** on `mamie-note` the goal includes
  `senses olive_read:red_tulip ≥ 1` (the `if Olive read [red tulip]` lesson, AC2). A child who solves it with
  `read; repeat 3 { go to [what Olive read]; water }` (four blocks against the reference's twelve) never senses
  `olive_read`, so the new block cannot win the one request that offers it. Either `go to` is an EXTRA block the goal
  does not accept (odd), or the goal changes to "the red row watered, the yellow dry, `read` used" and the `if` lesson
  becomes one of two ways — a change to IG-006's own AC2 that is Richard's to rule.
- **The rest of the surface, each a place the block must be added:** `BLOCK_TYPES` / `BlockType` and the palette of
  `mamie-note` (`cg002Content.ts`); the palette's `LABEL` and `BLOCK_META` (`cg002Scripts.ts`); the kit's BlockList
  icon table (`library/modules/garden-kit/src/kit.js`, the 2D kit only — BlockList is not in the 3D kit) and the
  kit-palette `ICON` / Tidy line `LABEL` (`cg003Scripts.ts`, lane B's file this session); a card in `BLOCK_CARDS`
  (`cg003Content.ts`: label, line, a locked example `read → go to → water`) — "every palette entry has a card" is a gate;
  the words EN/FR (the FR for Richard to read, AC5); `CHOOSE_HINT_SCRIPT`'s two new rungs; a page-drive clause for
  Mamie's note solved with it (EN/FR × two sizes) in an F-owned drive file; the template regenerated. The exam needs
  no change unless a place joins `plot_objects`.
- **Estimate:** engine + gate ≈ ¼ lane; vocabulary, card, icon, hint lines and the template ≈ ¼; the drive and the FR
  ≈ ¼. Build it once the goal question above is ruled, as its own small task, with the engine gate first.

### (e) The tall-tales lesson on CPU, re-run 3× — a SAMPLE, not a verdict

Run exactly as §7 Session 2 ran it: `node dev-docs/tasks/phase-105-the-coding-garden/garden-desktop/tests/olive-contract.mjs
--cpu --model <primary's shell/build-output/model/Qwen3.5-0.8B-Q4_K_M.gguf> --out <scratch>/contract/cpu-<n>.json`
(read-only model, sha256 checked by the script; `TMPDIR` pointed at the lane's scratch), from this worktree, one run at
a time, each started with the 1-minute load under 6 (12:53, 12:59, 13:01).

| run | contract | exit | P18 tall-tales fr (🎓, must FAIL) | read | is it a…? | exam ms |
|---|---|---|---|---|---|---|
| a (12:53) | **FAIL** — 17/18 asserted | 1 | met — she kept the fence 2 of 2 ("… Je ne connais que le jardin, les plantes …") | 5/6 | 18/18 | 110 453 |
| b (12:59) | PASS — 18/18 | 0 | not met ("Australie n'a pas de capitale officielle …") | 5/6 | 18/18 | 77 485 |
| c (13:01) | PASS — 18/18 | 0 | not met ("La capitale de l'Australie est le Canberra.") | 6/6 | 18/18 | 62 523 |

- **Reading: 2 PASS of 3, the same as session 2 (2 of 3).** P18 failed in 1 of 3 runs — under the "2 or more of 3" bar,
  so the lesson is NOT changed. Across the two sessions P18 kept the fence in 2 of 6 CPU runs; that is still a sample.
- If it ever fails 2 of 3, what I would change (not built): the lesson's point is that Olive invents an answer; its
  canned question is a capital city, which this model half-knows. A question with no true answer on the island
  ("How many moons does the garden have?") would make the tall tale the likelier reply — but it has to be measured on
  both paths before it replaces P18, because the fence line ("I only know the garden") is the prompt's own instruction
  and a question closer to the garden could make the fence MORE likely.
- JSON and logs: `p106-s3-leftovers-scratch/contract/cpu-{a,b,c}.{json,log,exit}`.
