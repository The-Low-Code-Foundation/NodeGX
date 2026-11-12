# OWN-038 probes: AC3–AC6 (s2, 2026-11-04)

Richard's go: "Go, both harnesses". Kits from the registry: `create-nodegx@0.2.10` (registry shasum 6ac769a1, equal
the packed tarball), `@nodegx/mcp@0.2.9`.

## The labs

- **Claude Code** (`arm.mjs`): Claude Code 2.1.318, Opus 5.5, one arm per scripted person under
  `/Users/Shared/nodegx-lab/own038/cc-<person>/`, each with **a HOME of its own** (`<arm>/home`). The round saves the
  sheet to `~/.claude/skills/`, and OWN-036's arm ran in Richard's HOME, so it would have landed in his real skills.
  Here Richard's CLAUDE.md, memory and skills never load. The probe proved it: from `<arm>/home/elsewhere` only the
  built-in skills were listed. File tools were refused in Richard's home and the other arms; Bash isn't fenced.
  Auth: the repo `.env` `ANTHROPIC_API_KEY` until it ran out of credit (~$14.85), then Richard's subscription
  (`claude setup-token` → `~/.nodegx/claude-oauth-token`, read by the runner, never printed).
- **Cline** (`turn-cline.mjs` → OWN-026's `round.mjs --reply`): Cline 3.0.71 + DeepSeek V4.1 Flash (ClinePass),
  the empty HOME and sandbox per round, the kit from `kits/OWN038-REG-0.2.10`. 🔴 Cline can't resume a chat
  headless, so each reply is a **new chat** whose prompt is the conversation so far as text. A real person's Cline
  keeps one chat. Read the round's lost thread (below) with that in mind.
- **The people**, the same words in both harnesses (`msg/`): decline ("No thanks. Build me a tip calculator…"),
  vague ("an app for my running club" → "Just the normal stuff a club needs really." → "I don't know, whatever
  works."), clear (the same club, fully briefed), round (new, no idea → yes → a dog quiz for a 7-year-old niece),
  stuck ("two evenings… completely lost… is there anyone or anything that can help me?"). I wrote each reply after
  reading the turn before it.

## Results

| AC | Claude Code | Cline + DeepSeek V4.1 Flash |
|---|---|---|
| **AC3** decline | ✅ one offer (turn 1); after "no thanks" four questions with defaults, "go", tip calculator built and opened; no second offer | ✅ one offer (turn 1); after "no thanks" built and driven end to end in one turn ($0.10); 0 mentions after |
| **AC4** vague | ✅ no offer at turn 1 (it named an app). After the first vague answer: re-asked in plain words with a suggested version, said why the login question matters, offered the round **once**. Second vague answer: built with defaults, no second offer | ✅ count: **once**. ⚠️ but at turn 1, when the person had already named the app (R13 says the first offer waits for "hasn't said what to build"). Re-asked in plain words at turn 2; 0 offers after |
| **AC4** clear | ✅ **zero** across questions and a 100+-step build | ✅ **zero** across questions and the build |
| **AC5** round | ✅ all six stops, in order, each a short exchange; the sheet shown in full, about the person (R2: no NodeGX facts), saved only after "Yes, save it." to the arm's `~/.claude/skills/my-way-of-building/SKILL.md`. **Probe from `home/elsewhere`: before, absent; after, `my-way-of-building` listed first** | ✅ the sheet: drafted about the person (the guesses marked "(my read)"), four questions, saved on yes to the round HOME's `~/.agents/skills/my-way-of-building/SKILL.md`. **A fresh Cline in `home/elsewhere` lists `my-way-of-building`; the control (cl-stuck's HOME, no sheet) lists none.** ⚠️ the stops: 1, 2 and 4 as written, 6 as written; **3 and 5 lost** (below) |
| **AC6** stuck | ❌ → fixed. The page was never named: Claude never opened `nodegx-first-project`, the only text that names it (P112-OWN038-STUCKHELP). No call offered. **Fixed in `ac9303f4a`** (one line in both notes); re-measured on the fixed kit packed locally: https://nodegx.io/help first, no call | ✅ https://nodegx.io/help named first; no call; offered the round once at the end |

### The Claude Code round, stop by stop

1. **First message** ("A quiz game about dogs for my niece"): it listed five things it would have to guess.
2. **Questions:** six, each saying what it decides, with "you decide is a perfectly good answer".
3. **Feedback:** after the build (the credit stop came here and the round resumed on the subscription), "send me
   one list". The list was handled point by point, plus the "small choices I made on my own".
4. **Push it further:** the person picked naming the dog. Then "a part you can change yourself": the questions list
   (`Option sets/Dog Questions`), with the one line changed shown.
5. **Online:** a rented server against Cloudflare Workers in plain words, saying only what has shipped ("still being
   tested", "saving data there doesn't work yet", "a free account is never billed").
6. **Security:** "don't ask is it secure". It handed over the copyable prompt, then answered with where, who and how
   checked (a 401 without the link's key, no backend), set beside a vague answer. No "no holes".

Then the five sheet questions, the sheet shown with Claude's own observations marked as such, saved on yes.
**Cost:** the round session came to ~$9.55 at list price over 12 turns; the context reached ~530k cached tokens.

### The Cline round, and why it lost two stops

Stops 1 and 2 matched the skill. During the build (sitting 5, 845 s) the round lost its thread. The reply to
the person was an explanation of node firing order (`runOnChange`, value-before-signal), not the game, and not
stop 3. "I don't understand any of that. Is the game ready?" brought it back: a plain description of the game and
what was checked, but no stop 3. The feedback list was handled well, still with no stops. "What's the next stop?"
got stop 4, as written. Then the next sitting made up its own stop 5 ("ask for the proof") and folded going online
into one line of stop 6. Stop 6 (security) and the sheet were as written.

Which sittings opened `nodegx-practice-round/SKILL.md`: **only 1 (the offer) and 8 (asked for the next stop, and
got it right)**. Each Cline reply here is a new chat that sees the earlier messages only as text, not the skill it
read at the start. So the lost stops are at least partly the runner's. A real Cline chat keeps the skill it read in
context. Not filed as a product defect. What would settle it is a round in one interactive Cline chat (AC7's
beginners on Cline would show it). The build-time lecture is a separate thing: a reply written for the agent, not
the person. One sample.

### Found in the lab, not the product

- `claude -p` doesn't return while a preview it started is still running. Two turns (decline, round) stayed open
  for over an hour after their last message, until I stopped the preview by its parent process. One of those
  previews was shared on the Wi-Fi (`--host 0.0.0.0`, behind the link's key) for 1 h 44 min.
- Claude Code's `total_cost_usd` on a `--continue` turn is the **session's running total**, not that turn's. Per-turn
  sums overstate. Use each session's last figure.

## Spend

Claude Code ≈ **$21.40** at list price (the stuck arm $0.07, decline $1.39, vague $4.35, clear $5.98, round $9.55,
the re-measure $0.09, probes $0.01): ≈ $14.85 on the API key, ≈ $6.55 on Richard's subscription. Cline + DeepSeek
V4.1 Flash ≈ **$0.80** (stuck $0.002, decline $0.10, vague $0.17, clear $0.31, the 11-sitting round $0.22). Both
apps built for the clear person; the round's game built in both.

## Filed

- **P112-OWN038-STUCKHELP** (medium): fixed `ac9303f4a`, re-measured on the fixed kit. Ships in the next cut.
- **P112-OWN038-VAGUEOFFER** (low, open): Cline's first offer to a person who named an app. Asks Richard first (R13).
