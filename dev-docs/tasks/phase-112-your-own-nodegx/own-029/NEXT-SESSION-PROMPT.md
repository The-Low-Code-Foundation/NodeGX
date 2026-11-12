# OWN-029: the next session (s3)

Read these first:
1. `../OWN-029-THE-SMALL-AGENT.md` (status line);
2. `RESULTS.md` §7 (s2), then §3b, §3d and §5 if you need the reasons behind the harness;
3. one pair of kept pages: the constraint's `runs/K1-bakery/r2/shots/` beside the sum's `runs/W1-bakery/r3/shots/`.

Before any Ollama + Chrome drive, check `git status` and the box: it is the one heavy job. Runs go one after
another (`series.sh <arm>`). Do not rebuild `noodl-mcp` `dist` during a series, because ledgers stamp it.

**At the end of s2 (2026-10-29, 02:23):**
- **Ollama:** both models are unloaded (`series.sh` does it).
- **Git:** the own-029 files and `../OWN-031-THE-SERVER-ASKS.md` are not committed. The phase README's OWN-031 row
  sits beside another person's uncommitted edit, so commit by pathspec or through a temporary index.

## Where it stands (s2)

- **The defaults are the s1 winners** plus the new accept rule (`--accept constraint`):
  - a round is kept if defects per line fall and "organised" drops by no more than 0.1;
  - or if "organised" rises by at least 0.1 and defects per line stay within 110% of the best.
- **New critics:** S13 (a list repeated across sections) and S14 (prices). The photo scout has two gates (would
  this photo make sense ≥ 0.6, and does it show what the page is about ≥ 0.3); it was right on all six briefs.
- **The paired A/B (24 runs) shows both rules repair:**
  - constraint: 0.53 → 0.21 defects per line, "organised" 0.71 kept;
  - sum: 0.56 → 0.17, "organised" 0.62.
  - The constraint refused the page the sum kept on the bakery ("organised" 0.92 → 0.58).
- **`../OWN-031-THE-SERVER-ASKS.md` is scoped:** `guided_build`, where the server asks and the client's model
  answers. Three rulings wait on Richard.

## Next, in order

1. **Fix the constraint's ratchet.** Compare with the highest "organised" any kept round reached, not with the last
   kept round. K2-bakery lost 0.13 in two allowed steps.
2. **Take the words out of the organisation judge.** On one fixed structure, round-0 "organised" ranged by up to 0.61
   (puppy) across five samples of words (§7c).
   - Add a judge on the outline without words (section kinds, parts, bands), and constrain on that one.
   - Measure its spread the same way: S0 plus four paired runs.
3. **Critic repairs that work:**
   - S13 should repair by dropping the list from the later section (a parts change). A reword returns the same three
     products when the brief names only three.
   - S14 needs a "from $X" check: it must equal the lowest item price, and a single section price must be one of its
     items' prices (jazz: "Tickets from $45" above a $35 item).
4. **Then freeze the harness for OWN-030.** Its graph lane runs OWN-029's best arm, so a hash in its task file is
   enough.
5. **`P112-OWN029-IMAGEGROUNDNOTOP`:** add `paddingTop` to `imageGround`, regenerate the tpl001 and tpl003 fixtures
   (they spread the composition), and run the suite. This is a heavy job, so not while an Ollama series runs.
6. **OWN-031 step 1, the probe,** once Richard has ruled on its §7.

## Facts worth keeping

- **Ollama returns `logprobs` under a `format` schema** (0.40.12). Read the distribution at the answer's first token;
  for options sharing a prefix, at the first token that tells them apart.
- **A schema `maxLength` cuts the model mid-word** (OWN-027's truncated button was this). Put the limit in the words;
  critique what runs long.
- **Never hand a small model the stage-1 purpose or the raw request when it writes words or judges a photo.** The
  purpose became "Landing Page Concept" labels; the request made the photo judge rate "blue and modern".
- **A repair loop fixes slips, not a bad question:** when every re-ask returns the same defect, the prompt is the bug.
- **A score that counts defects rewards emptiness.** Check any score against a random control before trusting it.
- **A paired run needs every decision to replay.** A look question's signature includes its option list, so a source
  run on an older harness does not pair.

- **The same structure with new words moves "organised" by up to 0.6** (s2). A constraint on a judge needs that
  judge's spread on one fixed structure measured first.
- **A "keep only if not worse than the best" rule ratchets:** each step may lose a little. Compare with the best
  value ever reached.
- **A reword cannot fix a repetition the brief forces:** three named products give three cards every time.
- **A photo question that names the page in the harness's own words** ("This page is about "<name>": <must show>")
  separates the right photos; asked with a hand-written subject, the same question refused the right dog.
