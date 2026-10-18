# OWN-022 — Le Chonk plays

**Opened 2026-10-18** for Mistral's Discord challenge (*"Le Chonk wants to play"*: using Mistral Large 4 Preview via the
Studio API under `mistral-large-4`, build a harness that lets it play a game of your choice). Richard: *"I reckon we could
have it play Rocket School, the monster game … or make a game WITH Mistral, then have Mistral play test it and win?"* —
ruled the same day: **both, in that order** ("Rock out").
**Depends on** nothing unshipped: the game is the live Rocket School on nodegx.io; the build half uses OWN-019's Vibe kit.
**Status: 🟡 s1 (2026-10-18): Large 4 WON its first full game of Monster Gate from screenshots alone** — new player made,
game found and started, three monsters sent home with all three hearts, 33 calls, 123 s, $0.09, 0 console errors.
Next: two more wins in a row (AC2), let the strip run to "The gate held!", then Challenge (AC3), then the build half.
**Deadline:** not in the announcement as pasted — ask Richard.

## 1. The person sentence

> **Mistral Large 4 looks at a NodeGX game in a browser, decides, and taps — and the game, not the model, says it won.
> Then Large 4 builds a new game in NodeGX from a brief we wrote, and plays that one too.**

## 2. Decisions (and why)

- **Vision only.** The model gets a JPEG of the screen and tools (`click`, `type`, `key`, `scroll`, `wait`, `finish`).
  It is never shown the DOM or the page's text; the challenge is about its vision and agency.
- **The referee is the harness.** Each game names the page text that means won / lost; the harness reads
  `document.body.innerText` after every step. The model's `finish` ends a run but never decides its verdict.
- **The Studio API directly, `mistral-large-4` pinned** (the challenge's words; `-latest` is a different model,
  OWN-018 §3). Not Vibe: Vibe is the *builder* in stage 2, not the player.
- **Monster Gate first, Practice pace.** It already exists and is drivable, so it proves the loop cheaply. Practice
  has no clock: Large 4's thinking time must not be what loses (VIBE-AND-LARGE4.md: 82–95% of its time is thinking).
- **Stage 2: the rules are ours, not Mistral's.** A game it designs and then beats proves nothing; the brief fixes the
  rules and the difficulty, the referee text is in the brief, and the game should be turn-based and visual (a board
  it has to read), so the win shows vision rather than arithmetic.

## 3. Acceptance criteria

| AC | What | Status |
|---|---|---|
| AC1 | `own-022/play.mjs` plays live Monster Gate from screenshots alone; a run writes every call (latency, tokens, what it said and did), the screenshots and a result | ✅ s1 |
| AC2 | Large 4 **wins** Monster Gate (Beat it to the gate, Practice) — the harness's verdict, three runs in a row, cost and wall time recorded | 🟡 1 of 3 (game1: won, 33 calls, 123 s, $0.09) |
| AC3 | The same on Challenge (the walking clock): the result is the finding, win or lose — how much does its thinking cost it? | ⬜ |
| AC4 | A game brief (ours: rules, difficulty, referee text, turn-based, visual) → Large 4 in Vibe builds it as a NodeGX app with OWN-019's kit | ⬜ |
| AC5 | `play.mjs --game <that>` — Large 4 plays the game it built and wins, by the harness's verdict | ⬜ |
| AC6 | The entry: a short video / gif strip from the shots, the harness public, posted to the Discord | ⬜ Richard posts |

## 4. Measured (s1, 2026-10-18)

- **Large 4 points in 0–1000, not pixels.** Asked for the centre of "New player" on a 1024×768 shot (true centre ≈ 512, 238):
  normalised 0–1000 → (500, 315) ×3 = (512, 242) ✅; pixels → y = 310–340 ✗ (below the button); a pixel bbox → y 295–350 ✗.
  The click tool takes 0–1000. In pixels, the first smoke run never left the start screen.
- **It sometimes sends the pair in one field** — `{"x": [470, 660]}` — 5 of 46 actions in smoke3, 19 of 50 in game1; one
  dropped a keypad digit and cost it a question (it typed "5" for 51). The harness accepts the pair and logs `shape: pair-in-x`.
- **game1 (the win):** 33 calls, 50 actions (1 failed), 1 wrong answer, 0 retries; 78 s of the 123 s is the model.
  The referee stops on "All three sent home!" — the verdict card before the end card — so the strip ends one Next early.
- **One request hung 300 s** (Node's fetch default) while answers take 1–6 s; requests now time out at 90 s and retry.
- **Cost:** smoke3, 30 calls (a player made, Monster Gate opened, 7 of 8 right, monster 1 sent home): 114k input,
  2.6k output, $0.08 at the launch sale. 0% cached: pruning old screenshots rewrites the prefix. Not worth fixing yet.
- **With tools it thinks little** (18–415 reasoning tokens a call, 1.4–5.4 s); without tools, asked for coordinates,
  it reasoned for minutes.
- CDP's `mouseWheel` answered "Invalid parameters"; the harness scrolls the nearest scroller under the centre instead.

## 5. Session log

- **s1 (2026-10-18):** task opened; `own-022/play.mjs`; the probes above; smoke1–3; game1 **won**. Runs live in the
  session scratchpad (not committed); rerun with `node dev-docs/tasks/phase-112-your-own-nodegx/own-022/play.mjs --out <dir>`.
