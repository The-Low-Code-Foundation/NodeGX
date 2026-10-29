# OWN-032 — next session (s7)

**Paste this to start the session:**

> OWN-032 s7. Read `dev-docs/tasks/phase-112-your-own-nodegx/own-032/NEXT-SESSION-PROMPT.md` (this section), then
> `RESULTS.md` §11. First read Richard's three answers on https://claude.ai/artifact/P7umD3HEoDJrTiv1Q3KQqh (version 3;
> it has no answer store, so ask him in chat if he has not commented). Then run the experiments below in order: one at a
> time on Ollama, each against a control, each pre-registered in RESULTS §12 before it runs. Commit after each one.

## Where it stands (s6, 2026-10-29 night)

- **The warm look is built by the arm (11a, `a2781b475`).**
  - The switch is `look3` in `runs/w21.edit.json` = w20 + `look3`.
  - Richard picked "rounded, with a handwritten line", on the Soft lavender for a brand with no colour.
  - w21w-bakery, -pottery and -puppy ended by `endGate` in 33, 35 and 33 turns (calm controls 23, 22 and 22, the
    last being the new w20m-puppy). Every warm check closed; only bakery left contrast open.
- **`look3`'s `--style auto` is NOT safe (11b).**
  - With three looks, E2B sends all 20 plain requests to warm, 11 of them at ≥ 0.9, so they would be built warm
    without asking.
  - It flips "A calm, simple page for Park Runners…" to warm (0.54).
  - It does hear warm without its own words: 8 of 8 strict requests at ≥ 0.976.
  - Use `--style warm` to build the look; do not run `look3` with `style: auto` on a request that does not name warm.
- **Centring the words beside the photo works on the calm look (11c, `centre.mjs`):**
  - the gap between the middles of the words and the photo goes from −2 to −59 px down to 0–1 px;
  - phones do not change;
  - the bold look is unaffected, because its words are taller than its photo.

  No arm code yet.
- **Bench fixes:** a `color-mix()` ground is now read (Chrome gives `color(srgb …)`, which used to read as white), and
  the facts carry `photos`.

## Waiting on Richard (the page above, version 3)

1. Is the warm look right? Should the bakery's amber line above the headline be dark (2.78 on the amber wash)?
2. Top or centred words beside the photo?
3. A request that names no look: ask "clean, bold or warm?", calm by default, or something else?

## The experiments, in order

1. **The look question with three looks, by his answer to 3.** Whichever he picks needs the 11b probe (strict, plain
   and sets: `probe-look3b.mjs`) to pass before `--style auto` offers warm. Candidates:
   - a separate yes/no "do they ask for warm and friendly?" after the two-look question (strict ≥ 0.976 leaves room);
   - a warm description without "welcoming", which may be the sink;
   - asking whenever no look is named.

   Pre-register: plain requests do not reach warm at ≥ 0.9, and m-running stays minimal.
2. **The centred words as an `only` fix**, if he says centred. Set the words Group to `height 100 %` with `justify
   centre` on the calm and warm looks. Control: w20m-* and w21w-*. Pre-register: 0–1 px offset, no phone change, +1
   turn each.
3. **The bakery's warm line, if he says dark:** the `eyebrowColour` fix offers dark text on the warm look instead of
   the brand colour, or the brand colour only when it reads (≥ 3). Control: w21w-bakery.

## Not this session

- **Folding the looks, the "ask" and the s5/s6 switches into OWN-031 `build_app`** is the other session's lane. Ask
  first, briefly.
- **OWN-033 stitching** waits until the hero work settles.
- **The kit's contrast** (P112-OWN030-PRIMARYCONTRAST): bakery's white on amber, 3.19, is still open.

## Traps (s6)

- **The three-look question has a default.** Offered a third, friendlier look, E2B puts requests that name nothing on
  it, with high confidence. A probe of only named requests (9d) cannot show this: always include plain ones.
- **The bench's colour reader saw only `rgb()`.** Any new CSS colour form (`color-mix`, `oklch`) needs a check of what
  Chrome computes before a contrast number on it is trusted.
- **Peers drive Chrome with software GL all evening** (lifesim, threadspace); load stays at about 9. Arm runs were fine
  at `nice -n 10`, one at a time.
- Everything in s5's traps below still holds.

---

# s6 plan (done: RESULTS §11)


**Paste this to start the session:**

> OWN-032 s6. Read `dev-docs/tasks/phase-112-your-own-nodegx/own-032/NEXT-SESSION-PROMPT.md` (this section), then
> `RESULTS.md` §9–§10. First read Richard's pick of a warm look on https://claude.ai/artifact/P7umD3HEoDJrTiv1Q3KQqh
> (ask him if he has not picked). Then run the experiments below in order: one at a time on Ollama, each against a
> control, each pre-registered in RESULTS §11 before it runs. Commit after each one lands.

## Where it stands (s5 + s5b, `62d0cae45`, 2026-10-29)

- **The final harness is `runs/w20.edit.json`.** It is w15 plus six switches from s5, all off by default:
  - `fixesOnly` (9a): once every part is there, the menu is the fixes plus undo;
  - `factsKept` (9b): the brief's name and a date in the request must be in the hero's words;
  - `nameAndMore` (10a, Richard: "saying a bit more is nice"): a shortened headline is the name and a few words
    ("Maison Levain: Family Bakery", "The Blue Room: Live Jazz");
  - `writeRepeat` (10a′): a rewrite that came back too long is told so. Without it, w18m-running wrote the same 5
    words 22 times to the cap;
  - `rhythmCalm` (10b, Richard left the pick to me): the calm look takes the bold look's 16/24 px rhythm, 5 of 5.
- **The last full set per request:**
  - calm: w20m-* (all five);
  - bold: w19s-running, and w17s-* for the other four (w19 and w20 do not change them: no shorten fix fires, and
    `rhythmCalm` is calm-only).
- **E2B separates a third look** (9d): "minimal / stylish / warm and friendly", 24 of 24.
- **The warm look, drawn by hand for Richard** (10c, `warm.mjs` on `-warm` bench copies): a pastel wash, rounded
  photo and pill, and a Fredoka or Caveat headline. Five pictures across bakery and pottery.
- `drift.mjs <control> <test>` read 0.0000 on every s5 pair: at T 0 a control is exact wherever the prompts match.

## Waiting on Richard

1. **Which warm look** (the page above): rounded headline, handwritten headline, or rounded with a small handwritten
   line. Also, for a black-and-white brand, the Soft theme's lavender instead of a grey wash.

## The experiments, in order

1. **The warm look in the arm, once he picks.**
   - The arm's vocabulary needs three things it lacks: a font setting (Fredoka / Caveat, with the font module
     copied into the bench, as `warm.mjs` does), a soft ground (a wash of the brand, or the Soft pastel when the
     brand has no colour), and a 40 px photo corner;
   - then `only` fixes for the look, as the stylish ones are (8g's pattern);
   - `--style auto` learns three looks (`lookq.mjs` LOOKS + `probe-look3.mjs`'s description);
   - test on bakery, pottery and puppy, with a warm request each, against the calm runs.
2. **A stricter third-look probe (9d's caveats):** 8 warm requests written WITHOUT "warm", "friendly" or
   "welcoming", and the 20 `PLAIN` requests against three looks, to see whether "named a look or not" still
   separates.
3. **Centre the words beside the photo** (seen in 9c): measure first, across the ten heroes, then show Richard.

## Not this session

- **Folding the looks, the "ask" and the s5 switches into OWN-031 `build_app`** is the other session's lane. Ask
  first, briefly.
- **OWN-033 stitching** waits until the hero work settles.
- **The kit's contrast** (P112-OWN030-PRIMARYCONTRAST) is the kit's: bakery and running still end with it open.

## Traps (s5)

- **Importing a probe module runs it.** `probe-look.mjs` had top-level code, so `import { REQUESTS }` ran the whole
  probe on Ollama beside an arm run. Its main body is now guarded. A `node -e 'import(…)'` "load check" is a run.
- **A switch that changes an existing fix's prompt moves every run where that fix fires.** 9b missed two runs that
  way. Pre-register for both.
- **A write fix can loop at T 0 like a menu can.** A rewrite that does not clear its finding is offered the same
  prompt and returns the same words. `writeRepeat` cures the shorten fix; any new write fix needs the same.
- **`warm.mjs` writes only to `-warm` copies of a bench.** Never render a hand variant on a bench an arm run is
  using: `writeHero` overwrites the hero mid-run.
- Everything in s4's traps below still holds.

---

# s5 plan (done: RESULTS §9)

## Where it stands (s4, `a4051a33c`)

- **The final harness is `runs/w15.edit.json`.** It is w10's switches plus four from s4, each off by default:
  - `addWhileMissing` (8a);
  - `shortHeadline` (8b);
  - `blankRetry` (the bench fix);
  - `rhythm` (8g);
  - plus `askBand [0.1, 0.9]`.
- **Every brief ends clean in both looks**, except the kit's white on amber or green (P112-OWN030-PRIMARYCONTRAST),
  including running and pottery, which were held out. Page, same URL, now with the final harness and the held-out
  briefs: https://claude.ai/artifact/2M1WenHSVPsUE21P3N1NcB
- **Richard's rulings (RESULTS §8f):**
  - the stylish words column takes "medium": 16/16/24 px;
  - **a request that names no look asks "clean or bold?"** E2B scores every request that names a look at ≤ 0.001
    or ≥ 0.91, and plain ones at 0.11–0.70, flipping with the option order on 9 of 20.
- **The control is exact:** at T 0, re-running w10s-jazz reproduced all 40 actions with no odds drift. A w-run that
  parts from its control parts because of the switch.
- `compare.mjs <control> <test>` prints turns, free moves, the turn where the runs part, the end findings, and the
  headline. `zsh run-set.sh <prefix> <edit.json> m-bakery s-jazz …` runs the s3/s4 requests one at a time.

## The experiments, in order

1. **Only fixes once every part is there.** 8a's miss: with "add" gone, its odds moved onto the generic "set"
   (w11m-bakery +3 turns: two hand-made size changes before the move fix). Under `endGate`, once `goalMet`, offer
   only the fixes and undo while any fix is on the menu. Control: w15 and w12/w14 (all ten requests). Pre-register:
   free moves after `goalMet` reach 0, and no run gains turns.
2. **The request's facts stay in the hero.** 8b's jazz rewrite dropped "on 14 November", and s-running's hero
   never says "Park Runners". Add a finding: a name or a date in the request that is nowhere in the hero's words
   gets a write fix on the part that should carry it (the headline for the name; the line for a date). Control:
   w12m-jazz, w15s-running.
3. **The minimal rhythm.** Richard ruled for the bold look only. The minimal words column is "huge" too
   (48/48/48). Run `rhythm.mjs` on a minimal hero (w12m-jazz) and show him the same four spacings before changing
   anything.
4. **A third look (s4's 8e, now unblocked).** Probe only: "minimal / stylish / warm and friendly", 8 requests per
   look, all option orders. Stop there if E2B cannot separate it.

## Not this session

- **Folding the looks and the "ask" into OWN-031 `build_app`** is the other session's lane. Ask first, briefly.
- **OWN-033 stitching** waits until the hero work settles.
- **The kit's contrast** (P112-OWN030-PRIMARYCONTRAST) is the kit's, not the arm's.

## Traps (s4)

- **The bench can measure before the page draws** (P112-OWN032-BLANKSHOT, 11 of 1003 shots). Keep `blankRetry` on.
  look.mjs's `blank` means fewer than 5 words, not "nothing drew": test `words === 0`.
- **Over a gradient, the bench's contrast is the WORST stop.** A line over the dark end can read 3.30.
- **A held-out brief needs a GOALS entry and a bench** (`node bench.mjs make <G round project> <bench>`, from the
  KEPT round in `own-029/runs/G-<brief>/summary.json`).
- Everything in s3's traps below still holds: one Ollama job, `nice -n 10`, commit through a temporary index, never
  `*.png`.

---

# s4 plan (done: RESULTS §8)

**Paste this to start the session:**

> OWN-032 s4. Read `dev-docs/tasks/phase-112-your-own-nodegx/own-032/NEXT-SESSION-PROMPT.md` (this section), then
> `RESULTS.md` §7. Run the experiments below in order: one at a time on Ollama, each with a control. Record each in
> RESULTS §8 and commit after each one lands.

## Where it stands (s3, `179343f8b`)

- The arm (`arm.mjs`) builds a hero one step at a time with Gemma 4 E2B, from closed menus. With `roles` +
  `fixMenu` + `endGate`, every finding the script can trace becomes a fix on the menu. The model picks which fix to
  make, picks values (size, gap, padding), and writes every word.
- **Two looks, both shippable (Richard's ruling, §7):** `minimal` (w6) and `stylish` (w8s: dark brand gradient,
  small-capitals line above the headline, bold white headline, white pill button).
- **The look follows the words:**
  - `lookq.mjs` asks E2B "minimal or stylish?" in both option orders. It got 16 of 16 requests that name a look right.
  - `--style auto --request "…"` built in the right look 6 of 6 times (w10m/w10s × bakery, jazz, plumber). Page:
    https://claude.ai/artifact/2M1WenHSVPsUE21P3N1NcB
- Benches: `~/vscode_projects/NodeGX test projects/own-032-bench-{puppy,bakery,jazz,plumber}`. The viewer is
  `node server.mjs` → `127.0.0.1:8732/?t=runs/arm-<run>`. Picture pairs come from `ac5.mjs`.
- The command that reproduces w10:
  `node arm.mjs --run <name> --brief <b> --turns 40 --look script --bench "<bench>" --edit <edit.json> --request "<words>"`.
  The edit is `runs/arm-w10s-jazz/edit.json`.

## The experiments, in order

1. **"Add" only while a part is missing.** Under `endGate`, drop the generic `add` move once `goalMet`. Control:
   w10s-jazz, which spent 7 free turns adding Columns and Groups. Measure turns to the end and how many were free
   (non-fix) moves, on all six w10 requests. Pre-register: turns fall, and no look or measure gets worse.
2. **A headline too long for its column.** At the display-md floor, a headline that breaks onto 3+ lines on a
   desktop gets a write fix: "make the headline shorter (n words, it breaks onto k lines)". Control: w10m-bakery
   ("Maison Levain: Artisanal baking from our family kitchen.", 4 lines). Watch for the old trap: the rewrite must
   not lose the name.
3. **Spacing rhythm in the words column.** The stylish small line floats as far from the headline as the line sits
   from the button. Options:
   - a "the small line belongs to the headline" finding: wrap the eyebrow and the headline in their own Group with a
     small gap;
   - or a gap rule by role pair.

   Show Richard a before/after of w8s-puppy before keeping either.
4. **Ask when the request doesn't say.** If `lookOf` gives P(stylish) between 0.3 and 0.7, the arm stops before
   turn 1 and returns "ask: clean or bold?". In the product, the client shows that question.
   - First widen `probe-look.mjs`'s undecided set to ~20 requests that name no look (trades, shops, clubs, events).
   - Report how many fall in the band, and whether the band holds across both option orders.
   - Pre-register: fewer than a third of plain requests are undecided.
5. **A third look?** Only if 1–4 land. Probe first, no arm code: can E2B separate three looks ("minimal / stylish
   / warm and friendly", or "playful")? Same both-orders method, 8 requests per look. If it can't separate a third,
   stop there and record that.
6. **Held-out briefs:** running and pottery. Neither has a bench yet: `node bench.mjs make` from
   `own-029-G-running-r4` / `own-029-G-pottery-r2`. Run the final harness on a calm and a bold request for each.
   Then update the two-looks page (same file path, same URL).

## Not this session

- **Folding the looks into OWN-031 `build_app`** (what Richard sees in Goose) belongs to the other session's lane.
  Ask it first (ListAgents → SendMessage, short).
- **OWN-033 stitching** waits until the hero work settles.

## Traps

- **16 GB box:** one Ollama job at a time. Check that `ollama ps` is empty before a run, and run with `nice -n 10`.
  The fork server refuses while another model is loaded.
- **Every new behaviour is a switch, default off,** so old runs replay unchanged. Document it in the arm.mjs header.
- **Commit through a temporary index** (`--pathspec-from-file`, guard the staged count, `update-ref` with the old
  HEAD), then `git reset -q HEAD --pathspec-from-file` to sync the real index. Never commit `*.png`.
- **The bakery theme's white on amber (3.19)** is the kit (P112-OWN030-PRIMARYCONTRAST). Under endGate the run ends
  with it open; that is expected.
- **Goose** starts with `~/.config/goose/start-goose.sh` (it hides `~/.claude/skills`). Never from the Dock.
- **Richard judges looks; the script judges measures.** Never call a look "better" without his eye on it.

## s3 status (2026-10-29 late, opennoodl-9f)

- Richard's ruling on AC5 (RESULTS §7): the two harnesses give two LOOKS, both shippable. The criterion is now "the
  look follows the request". It does, 6 of 6 (§7c, page https://claude.ai/artifact/2M1WenHSVPsUE21P3N1NcB).
- New in arm.mjs: `style` (minimal | stylish | auto + `--request`, via `lookq.mjs`), `endGate`, a missing part as a
  fix, order as a fix. The bench crop now keeps bottom padding (his "no inner padding" was the crop).
- Next: the four items at the end of §7c.

## s2b status (2026-10-29 evening, Opus session opennoodl-9f)

- **The puppy hero is solved at the arm level.** `w6-puppy` is done at turn 24 with every check clean
  (`runs/arm-w6-puppy/t23/`). The `roles` switch made the difference: the checks read what each part IS, plus
  `wrap`, placeholder words as a write fix, and a headline-wraps check fed by line counts from bench.mjs. RESULTS §5c
  has rows t15a, w5, w5-t16a and w6.
- **AC5 has run:** w6-bakery, w6-jazz and w6-plumber were all done by the model in 22–25 turns, measures clean except
  the kit's bakery button contrast. RESULTS §6.
- **Waiting on Richard:** the blind page https://claude.ai/artifact/XoSSP3TPGwqbhnAhu7vcEP. Read his picks with
  ArtifactData `list` on `ac5` and `ac4`, the key is `runs/ac5-w6/blind-key.json`, then grade the pre-registered
  prediction in §6 (the composition wins ≥ 2 of 3, because the arm has no ground, display font or eyebrow).
- **Next, if the prediction holds:** add ground, display font and eyebrow as findings with fixes, and test on running and pottery
  (held out). If AC4 and AC5 pass, OWN-033 stitching. Separately, fold the menu lessons into OWN-031 `build_app`,
  but that is the other session's lane: ask first.
- Goose now starts with `~/.config/goose/start-goose.sh` (own-030/goose/FINDINGS.md, last section).

## s2, as it was planned

1. **Show Richard the viewer first** (build order step 2; he has not seen it yet). He may change what it shows.
2. **Surgery from the page (3c, AC3):**
   - server routes that start `arm.mjs` with `--replay <run> --upto k`, `--override k=…`, `--hint k=…` and
     `--edit <file>`, writing the edit beside the fork;
   - in the viewer, an "edit and re-run from here" control on each builder step (prompt text, answer override, a
     hint), and forks side by side with their end pictures.
   The arm already supports every one of these from the command line.
3. Then Richard pokes. The obvious first pokes, from w1–w3:
   - a finding that names the part that owns a space ("n00 has no padding left and right");
   - a menu that lists only the settings that would fix the findings;
   - words at temperature 0, so forks differ only by the edit (w2 → w3 showed that the 0.7 words move every later
     prompt).

   Record each fork and what it changed in RESULTS §5.

## Traps met in s1

- `render-from-disk.js` builds its page once: a reload serves the first project. `bench.mjs` answers the request over
  CDP `Fetch`.
- Node names must be fixed-width (`n01`): `n1` / `n10` / `n11` tie in the grammar.
- `git add -A -- <dir> ':(exclude)*.png'` staged NOTHING, silently. Use `--pathspec-from-file`, and guard the staged
  count before `commit-tree`.
- 16 GB box: E2B + E4B + a peer's e4b-32k do not fit together. Wait for Ollama to go quiet (no request for 3 min and
  no model loaded) before a probe.
