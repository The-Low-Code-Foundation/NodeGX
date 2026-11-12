# OWN-029 — results (s1, 2026-10-28; s2, 2026-10-29 — §7; Opus)

Builder: Gemma 4 E2B (`gemma4:e2b-it-qat`). Reviewer: Gemma 4 E4B (`gemma4:e4b-it-qat`). Ollama 0.40.12. MCP `dist`
2026-10-28 16:27 (`a475b0683`). Every run: `own-029/runs/<run>/` (`ledger.json`, `summary.json`, `r<k>/shots/`).
The harness changed during the session; each ledger stamps `harness` (a hash of `agent.mjs` + `lm.mjs`), and the
changes are listed in §4.

## 1. The probes (before the loop was built)

| Probe | Result |
|---|---|
| `logprobs` on `/api/chat`, with and without a `format` schema | ✅ The answer token carries the distribution over the enum: "centred" 0.835 / "left" 0.090. Options that share a prefix ("icon-heart", "icon-paw") are read at the first token that tells them apart. |
| Vision, pairwise A/B on two screenshots (E2B, E4B; pages and crops) | ❌ The second picture every time, both orders. |
| Vision, 1–5 score of a section crop | E2B noise; E4B weakly directional. About 130 image tokens per crop. |
| **Text** critic: a section in words, yes/no in one token (E4B) | Separates every pair: headline-fits 0.31 / 1.00; cut-off button 0.09 / 0.96; "blue pup" 0.18 / 0.99; pizza testimonial on a puppy page 0.01 / 0.99. E2B weak, LFM3 noisy. |
| **One photo** against the page's subject (E4B) | Puppy page: dog 0.98, cat 0.01, city 0.01. Pottery: potter 0.98, hands-clay 0.98, bakery 0.02. E2B answers yes to nearly everything (cat 0.79). |

## 2. Arm A — the agent, six briefs, up to 4 repair rounds

Score = the weighted issues the critics found (lower is better). It is comparable **between rounds of one page**,
not between arms (§3).

| Brief | Score by round | Kept / reverted | Builder calls | Reviewer tokens | Replays | Min | Defects per line r0 → kept |
|---|---|---|---|---|---|---|---|
| puppy (A2) | 21.5 → 5 → 4.5 → **3** | 4 / 0 | 130 | 84 | 321 | 7.0 | 0.38 → 0.05 |
| bakery (A2) | 29.5 → 15.5 → 10.5 → **8.5** | 4 / 0 | 106 | 95 | 229 | 6.6 | 0.70 → 0.19 |
| running | 52.7 → **17.8** → 24.0 | 2 / 1 | 89 | 73 | 124 | 5.7 | 1.20 → 0.52 |
| jazz | 27.8 → **12.6** → 16.2 | 2 / 1 | 123 | 80 | 160 | 6.6 | 0.58 → 0.26 |
| pottery | 17 → 6 → **2** | 3 / 0 | 69 | 65 | 118 | 4.4 | 0.52 → 0.06 |
| plumber | 13 → **6** | 2 / 0 | 87 | 56 | 77 | 4.1 | 0.32 → 0.15 |

- Every first build improved under review. Two rounds made the page worse; the agent saw it and reverted.
- The kept rounds did not shrink the pages (sections and bits held; running lost 10 of 44 lines).
- What got fixed most: repeated phrases (S11), repeated lines (S5), repeated photos (S1), reviewer-flagged weak lines
  (J1), three dark bands in a row (S8). A2-puppy's first-round "dog ×5" became one dog, used twice.
- Opus's read of the kept pages: bakery, pottery and A2-puppy are credible first drafts; jazz and plumber are
  credible in structure, with copy slips (§5); running is the weakest (one phrase said four times, a
  "[Specific Park Name]" placeholder).

## 3. Arm R — the control: random decisions, the model's words, no review

| Brief | Random r0 score | Model r0 score | Random bits / lines | Model bits / lines |
|---|---|---|---|---|
| puppy | 25.9 | 21.5 | 26 / 38 | 41 / 56 |
| bakery | 16.4 | 29.5 | 26 / 33 | 33 / 42 |
| running | 21.5 | 52.7 | 18 / 26 | 31 / 44 |
| jazz | 8.0 | 27.8 | 28 / 35 | 39 / 48 |
| pottery | 13 | 17 | 16 / 24 | 27 / 33 |
| plumber | 10 | 13 | 18 / 26 | 34 / 41 |

**The defect score cannot tell random decisions from the model's.** A random page has 30–40% fewer bits, so fewer
things to flag; per line it is a draw. **By eye it is not close:** R-jazz opens on a bare form with no hero, sets
every heading in monospace, and shows a cat and a machine shop; R-puppy stacks six identical dog cards in one column
under a giant monospace headline. The model's decisions are worth a lot, and the critics do not measure what they
are worth: order, type, structure. That is the next critic to write (§6), and it is why the score is only used to
compare rounds of one page.

### 3b. The control scored with the quality term (arms R4 and Q, harness v4)

v4 adds the reviewer reading the page's OUTLINE (section kinds, grounds, parts, first line, the type pairing) and
answering two questions: "is this page well organised …" and "do the type and the parts suit this kind of page?".
Q = the model's decisions; R4 = random decisions; both with the same words door, critics and reviewer.

| Mean over six briefs | Random (R4) | Model, round 0 (Q) | Model, kept round (Q) |
|---|---|---|---|
| raw score | 21.9 | 28.6 | 10.0 |
| defects per line | 0.56 | 0.60 | **0.17** |
| organised, P(yes) | 0.50 | **0.66** | 0.65 |
| type and parts suit, P(yes) | 0.87 | **0.91** | 0.94 |

The model's first build beats random on "organised" 5/6, on "suits" 4/6, on defects per line 3/6 and on the raw
score 0/6. **The outline judges see what the defect count cannot.** But the repair rounds do not raise organisation
(0.66 → 0.65), and on the bakery the climb kept a round where it fell from 0.83 to 0.36, because a weighted sum let
fewer defects pay for it. **Quality has to be a constraint on accepting a round, not a term in the sum.**

## 3c. Arm V (one copy call per section + the contradiction critic) and arm L (V + learned rules)

| Brief | A: score by round | V: score by round | L: score by round | Builder calls A / V / L |
|---|---|---|---|---|
| puppy | 21.5 → 5 → 4.5 → 3 | 41 → 14 → 23.1 → 14.5 | — | 130 / 118 / — |
| bakery | 29.5 → 15.5 → 10.5 → 8.5 | 49.0 → 27.5 → 19 → 15 → 9 | 40 → 14 → **4** | 106 / 121 / 90 |
| running | 52.7 → 17.8 → 24.0 | 50.5 → 21.0 → 22.6 → 15 → 16.9 | — | 89 / 80 / — |
| jazz | 27.8 → 12.6 → 16.2 | 24.0 → **8.8** → 16.0 → 12.2 | 35.7 → 23.5 → 19.9 → 20.4 → 18.4 | 123 / 73 / 111 |
| pottery | 17 → 6 → 2 | 11 → 2 → **0** | — | 69 / 64 / — |
| plumber | 13 → 6 | 17 → 8.1 → 10 → 10 | 20 → 8 → 5 → 5 → **2** | 87 / 74 / 67 |

- **One run per arm is dominated by the decisions' own sampling.** V-puppy's round 0 was 41 because its model
  chose a form in five sections (16 points of S10), not because of the copy. Copy-driven issues were about equal
  (S5 + S11: 11 against 12.5 on puppy). So `--decisions-from <run>` was added: a paired run replays another run's
  decisions, so only the words differ (§3d).
- **The contradiction critic fired once in six briefs:** bakery "Open daily in the heart of Lyon." (p = 0.505;
  the brief says Tuesday to Sunday). It did not catch jazz's "$45" beside "$35".
- **Learned rules:** `learn.mjs` found 10 rules in 152 questions across the ledgers (the model answered the same
  way, p ≥ 0.9, in 3+ runs and 2+ briefs): the hero headline is `displayHeadline` (14 of 14, p = 1), every main
  action is `primaryButton`, a gallery is a grid of cards, "about" and "location and hours" sit on a plain band.
  In arm L they answered 4–7 questions a page (about 7–10% of round 0). Their questions are the cheap ones; the
  run-to-run spread is larger than the saving, so this is "fewer calls, no measurable loss", not more. The list of
  NEAR-rules is the more useful output: it names the questions where the model's taste is unstable (alignment,
  band grounds, photo placement: min p 0.17–0.47), which is where a designed rule or an exploration belongs.

## 3d. Arm P — paired: the same decisions, words per line (P1) vs one call per section (P2)

`--decisions-from <A run>` replays every round-0 decision of that run, so the two arms build the same sections with
the same parts and grounds; only the words differ. Round 0 only. Jazz is left out: its source run (A-jazz) predates
the band-offer change, so 13 look questions had other option lists, were sampled afresh in each arm, and the
structure differed (`paired.mjs` checks this).

| Brief (5 paired) | Word issues per line, per-line → per-section | Reviewer P(every line sounds real) | Copy calls |
|---|---|---|---|
| puppy | 0.295 → 0.277 | 0.918 → 0.938 | 37 → 11 |
| bakery | 0.250 → **0.071** | 0.960 → 0.987 | 28 → 9 |
| running | 0.603 → 0.371 | 0.345 → 0.556 | 29 → 7 |
| pottery | 0.242 → 0.182 | 0.968 → 0.976 | 24 → 7 |
| plumber | 0.451 → 0.463 | 0.889 → 0.968 | 34 → 8 |
| **mean** | **0.368 → 0.273 (−26%)** | **0.816 → 0.885** | **30.4 → 8.4 (−72%)** |

**Fewer calls AND better words:** one call per section wins on word issues 4/5 (plumber level) and on the reviewer 5/5,
with 72% fewer copy calls. "As small as possible" is the wrong target for the words: the right grain is the unit of
coherence. Decisions split as small as they go; words are grouped by what has to agree (OWN-027 found the same for a
list's rows; this is the whole section).

## 4. What changed in the harness during the session, and why (each from a run)

| Change | From |
|---|---|
| The schema's `maxLength` became loose, with the limit in the prompt's words | Buttons cut mid-word ("View available puppies and "). **This was OWN-027's truncated button too.** |
| Copy prompts carry the brief and the facts, never the stage-1 purpose or the raw request | "Puppy Haven Landing Page Concept: Blue, Modern Style" on every button; 8/8 clean without the purpose |
| Band grounds offered by section kind (only the hero gets `heroGround`, a footer `footerBand`) | `heroGround` on five sections in a row |
| A `featureItem` is led by an icon or a number, never a photo | a photo lead squeezed the words to one character wide |
| Form labels and placeholders answered by the script; the fields became one component | "Why Adopt With Us" as a field label; the MCP refused four identical field subtrees |
| The bits question sees the sections above it | every section had the same six bits and an "Adopt a Puppy" button |
| Photos: the reviewer looks at each stock photo against the page's subject | picked by file name: soil textures and a cat. Asked about the raw request, it rejected the dog (it judged "blue and modern") |
| Facts about the look are dropped from the must-show list, unless part of a name | "blue colour theme" became a fact to show; then "The Blue Room" was dropped as a look word |
| A quote gets a name line by rule; a second form, a phrase said 4+ times, four bands of one ground: new critics | A-puppy r1 scored 4 with two forms and "Find your perfect…" ten times |
| An accent colour (date and place, price) only on a light ground | "Lyon, France | …" unreadable on a dark band |
| Two tries per issue; substance sections protected from a drop | plumber's "[City/Area]" came back once; the reviewer proposed dropping "location and hours" from a bakery |

## 5. What still fails (the kept pages)

- **Contradiction and invention:** bakery "Mon–Sat 8am–5pm" (the brief: Tuesday to Sunday), "123 Artisan St",
  "$5–8" beside "€"; jazz "$45 per person" and "Tickets: $35" on one page; plumber "Since 1985", "John Smith".
- **Quotes everywhere:** A2-puppy has a quote in five sections, three from "Sarah".
- **imageGround with tall content** starts its text flush at the top edge — a product defect, filed as
  `P112-OWN029-IMAGEGROUNDNOTOP`.
- The jazz page is blue: the script did not read "The Blue Room" as a colour, but the model, asked for the main
  colour, chose blue.
- **The photo gate is lenient when the subject is broad:** on the running brief the reviewer passed a dog (0.956)
  and sheep (0.94) beside the coast (0.973). "Would this photo make sense on …" invites yes; "does it show what this
  page is about" is the next wording to try.
- **Lists repeated across sections:** L-bakery (score 4) shows the same three products as a card row in three
  sections. No critic compares one list's items with another's.
- **Repair does not raise organisation** (§3b): only words and parts get fixed; the section plan is re-asked only when
  "organised" falls under 0.5.

## 6. Next

See `NEXT-SESSION-PROMPT.md`.

## 7. Session 2 (2026-10-29, Opus): the accept rule, paired

### 7a. What changed in the harness

- **The s1 winners are the defaults:** one copy call per section, the contradiction critic, and the v4 outline judges.
  The old paths stay behind `--line-copy`, `--no-contradict` and `--no-v4`. The ledger records them in `mode`.
- **The accept rule (`--accept constraint`, the default).** A round is kept if:
  - defects **per line** fall and "organised" drops by no more than 0.1; or
  - "organised" rises by at least 0.1 and defects per line stay within 110% of the best.

  `--accept sum` is s1's weighted sum. The Q terms are marked `quality`, so they no longer count as defects.
- **S13, a list repeated across sections:** two lists share at least two item titles by content word. The flag goes
  on the later list, unless that list is the menu or prices, which is the products' rightful home.
- **S14, prices:** two currencies on one page, or two single prices that disagree outside a list.
- **The photo scout has two gates.** "Would this photo make sense on a web page for …" must be ≥ 0.6, AND
  "This page is about "<name>": <must show>. Does this photo show what this page is about?" must be ≥ 0.3.

### 7b. The series (`series.sh S2`)

- For each of the six briefs:
  - one source run, S0, with no review;
  - K1 and K2, accepting by the constraint;
  - W1 and W2, accepting by the sum.
- Each K and W run has 4 rounds and replays S0's round-0 decisions (`--decisions-from`).
- All 24 runs paired: their sections, bits and bands equal S0's. Analysis: `node s2.mjs`.

| Brief | K: kept /line · organised | W: kept /line · organised |
|---|---|---|
| puppy | 0.28 · 0.85, 0.03 · 0.94 | 0.24 · 0.93, 0.15 · 0.80 |
| bakery | 0.26 · 0.87, 0.38 · 0.77 | 0.17 · **0.58**, 0.23 · 0.77 |
| running | 0.32 · 0.74, 0.40 · 0.39 (nothing kept) | 0.46 · 0.26, 0.24 · 0.23 |
| jazz | 0.24 · 0.14, 0.23 · 0.11 | 0.21 · 0.11, 0.08 · 0.18 |
| pottery | 0.04 · 0.93, 0.00 · 0.97 | 0.03 · 0.97, 0.00 · 0.94 |
| plumber | 0.22 · 0.87, 0.10 · 0.93 | 0.10 · 0.78, 0.11 · 0.87 |
| **mean (12 runs each)** | **0.21 · 0.71** (round 0: 0.53 · 0.58) | **0.17 · 0.62** (round 0: 0.56 · 0.47) |

- **Both rules repair.**
  - Defects per line fall 0.53 → 0.21 (K) and 0.56 → 0.17 (W).
  - "Organised" rises +0.13 (K) and +0.15 (W).
  - Organisation fell by more than 0.1 in one run of each arm.
- **The trade is the one expected, with little in it:**
  - W ends with fewer defects per line on 4 of 6 briefs.
  - K ends better organised on 3 of 6 and level on the rest.
  - Both differences are smaller than the spread between two runs of the same arm (7c).
- **What the constraint prevents can be seen.** The bakery's W1 kept round 3, with "organised" 0.58: it fell from
  0.92 in round 0 because defects per line kept falling.
  - On that page the gallery became a full-bleed photo whose heading the image crosses.
  - K1's kept bakery page (round 2, 0.87) is calmer.
  - Shots: `runs/W1-bakery/r3/shots/` and `runs/K1-bakery/r2/shots/`.
- **The constraint ratchets: it compares each round with the best kept so far, not with round 0.**
  - K2-bakery went 0.90 → 0.80 (kept, −0.10) → 0.77 (kept, −0.03 against the new best).
  - That is −0.13 in all, each step within the limit.
  - Fix: compare with the highest "organised" any kept round reached.
- **Decision: the constraint stays the default.** It is the rule that refuses the page Richard would refuse. Fix the
  ratchet before OWN-030 freezes the harness.

### 7c. The "organised" judge reads the words as much as the outline

The five runs of each brief share one structure: the same sections, bits and bands. Only round 0's words were
sampled afresh. Their round-0 "organised" scores:

| Brief | Round-0 "organised", five samples of words | Range |
|---|---|---|
| puppy | 0.13 0.74 0.21 0.36 0.60 | 0.61 |
| plumber | 0.92 0.92 0.78 0.48 0.53 | 0.44 |
| running | 0.39 0.05 0.39 0.05 0.04 | 0.35 |
| bakery | 0.84 0.83 0.90 0.92 0.65 | 0.27 |
| pottery | 0.87 0.92 0.96 0.93 0.92 | 0.09 |
| jazz | 0.15 0.16 0.10 0.08 0.08 | 0.08 |

- The reviewer answers with temperature 0, so this is not sampling noise. **The judge is sensitive to the words on an
  outline whose structure has not changed.**
- On four briefs that sensitivity is larger than the 0.1 the constraint guards, so the constraint partly guards
  wording.
- Jazz is low on every sample (0.08–0.18 round 0, and 0.11–0.18 kept): the judge dislikes that structure, whatever
  the words.
- **Next:** score "organised" twice, on the outline in words and on the outline with the words removed (section
  kinds, parts and bands only). Constrain on the second. Its spread can then be measured the same way.

### 7d. The new critics

- **S13 fired in 5 of 24 runs:** all four bakery runs and K2-puppy.
  - It is right: the bakery's call to action repeats the feature cards (sourdough, croissants, cakes).
  - **A reword does not clear it:** the brief names only three products, so the model writes the same three again.
  - The fix that would work is structural: drop the list from the later section (a parts change, not a reword).
- **S14 never fired.** Every kept page uses one currency (bakery €, jazz and pottery $). But the s1 jazz defect is
  back, in a form S14 cannot see:
  - K1-jazz says "Tickets from $45" above a "General Admission — $35" item;
  - W1-jazz says "$50 Admission" above items at $75 and up.

  S14 compares single prices outside lists only. The next check: a "from $X" line must equal the lowest item price,
  and a single section price must be one of its items' prices.

### 7e. The photo scout: two gates, all six briefs right

| Brief | Kept photos (would make sense · shows) | Refused by "shows" |
|---|---|---|
| puppy | dog 0.98 · 0.85 | |
| bakery | bakery 0.94 · 0.97, bread 0.87 · 0.95 | |
| pottery | potter 0.99 · 0.96, hands in clay 0.99 · 0.83, market 0.89 · 0.38 | leather bench 0.84 · 0.16 |
| running | none | coast 0.98 · 0.003, dog 0.97 · 0.002, sheep 0.94 · 0.001, carpenter 0.72 · 0.004 |
| jazz | none (nothing makes sense ≥ 0.6) | |
| plumber | none | carpenter 0.61 · 0.006, leather bench 0.60 · 0.013 |

- The "shows" question alone was too strict: the puppy's dog scored 0.18 when the subject was written by hand. With
  the harness's own words (the page's name plus what it must show) it scores 0.85.
- The library has no runner, band or plumber photo. The right answer for those pages is no photo, and the scout now
  gives it.

### 7f. Open after s2

- **The constraint's ratchet** (7b) and the **"organised" judge's sensitivity to words** (7c).
- **S13 needs a structural repair; S14 needs the "from $X" check** (7d).
- **`P112-OWN029-IMAGEGROUNDNOTOP` is still open.** The fix changes `imageGround`, and the tpl001 and tpl003
  fixtures spread that composition, so it needs a template regeneration and a suite run. That is a heavy job, so it
  was kept off the box while the Ollama series ran.

## 8. Session 3 (2026-10-29, Opus): organisation without the words, the ratchet, two repairs

### 8a. The organisation judge without the words (`shape.mjs`, measured by `shape-probe.mjs`)

The s2 judge reads the outline WITH each section's first line, and new words on one structure moved it by up to 0.61
(7c). The s3 judge, `page.shape`, reads the same outline with the words taken out: section kinds, grounds and parts.
On one structure it is deterministic (temperature 0, identical prompt), so its spread across the paired runs is zero
by construction. The question left is whether it still sees what the decisions are worth. `shape-probe.mjs` asked it
of every round the ledgers hold (145 rounds; `runs/shape-probe.json`):

| Round 0, mean over six briefs | organised, with words | shape, without |
|---|---|---|
| random decisions (R4) | 0.50 | 0.58 |
| the model's decisions (Q) | 0.66 | **0.91** |
| the model beats random on | 5 of 6 briefs | **6 of 6** |

- **The shape judge separates the model from random about twice as widely** (0.33 against 0.16), and on every brief.
- **It refuses the page Richard would refuse.** W1-bakery: shape 0.90 at round 0, then 0.75 at the kept round 3
  (the full-bleed gallery). That is 0.15 below the peak, so a constraint on shape with the peak ratchet refuses it.
  K1-bakery's refused round 3 reads 0.77 against a peak of 0.90, so it is refused too.
- **Jazz was the words, not the structure.** The words judge scored every jazz page 0.08–0.26; the shape judge scores
  the same outlines 0.83–0.94.
- **It is compressed high** (SD 0.11, minimum 0.30; correlation with the words judge 0.28). The 0.1 tolerance is
  therefore strict for it, which is the intent: it moves only when the structure moves.
- **Decision:** the constraint reads `page.shape` (`--org-on shape`, the default). The words judge is still asked
  and logged (`org`).

### 8b. The ratchet

`--ratchet peak` (the default) measures the 0.1 from the highest organisation any kept round reached, not from the
last kept round. `--ratchet last` is the s2 rule.

### 8c. The two repairs

- **S13 (a list repeated across sections) repairs by structure:** the list is taken out of that section's choices
  (`exclude`) and its bits are re-asked. A reverted round restores the exclusions with the answers.
- **S14from:** a "from $X" line must equal the lowest item price on the page. **S14list:** a single price above a list
  must be one of that list's prices. These are the two s2 jazz defects.
