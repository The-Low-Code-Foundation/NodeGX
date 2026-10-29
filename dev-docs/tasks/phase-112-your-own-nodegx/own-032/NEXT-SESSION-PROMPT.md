# OWN-032 — next session (s4): the next experiments

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
