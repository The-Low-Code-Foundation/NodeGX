**For none of the people the reviewers stood in for did the framework setup (B) give anything they needed more than Claude Code alone (A). The one thing it did better was how its app looked to the app owner, and no reviewer chose it.**

Sources: `table.md` (the measurements, cited as §section and row), `grades.md`, `verdicts/A–D.md` and `verdicts/X.md` (cited as hat A, B, C, D, X), and `owner.md`.

## What was compared

One paragraph asked for a music app. Three setups built it, each once, with the same model and the same Claude Code version (table §intro).

- **A, bare:** Claude Code in an empty folder. Its app is **K**.
- **A+, harness:** Claude Code with an 8.8 KB `CLAUDE.md` written by a stranger in one attempt. Its app is **R**.
- **B, NodeGX:** Claude Code with a low-code framework, its MCP server, a 17 KB skill and two short instruction files. Its app is **M**. The table notes that B's prompt has had about 35 releases of tuning (§1, instructions).

Each build then got four follow-up requests from fresh agents on copies: add an AI feature that needs an API key (F1), add a settings screen (F2), explain where a number comes from (F3), and check the app line by line against the paragraph (F4) (§3).

Graders and reviewers did not know which letter was which (§intro). Hat X worked the map out from the folders anyway (hat X, first line).

## Who should choose what

- **A non-developer who ships, or a beginner:** all of hats A and B chose R, the harness (§6). They chose it for its plain README with hosting steps, its readable report, and settings they could use from a phone (hat A §7; hat B §6).
- **A freelance developer:** hat C chose R, with K close behind. It would not take M on as a code job (hat C, first line).
- **A tech lead:** hat D chose R, with K close behind. It would not put M in front of real users (hat D, first line).
- **The null-hypothesis reviewer:** "What the framework gave that a prompt could not: nothing" (hat X, last line).
- **The app owner, blind:** liked M's look best and R's least (owner.md §9.2). **After seeing the map and the hats:** "Nobody cares about being able to manage security settings and tweak parts of their app manually when they just want to play with Claude or make some small scale app for friends or colleagues" (owner.md §9.3).

No reviewer chose M. The app owner preferred M on looks but did not say to build with B.

## The build

| | A bare (K) | A+ harness (R) | B NodeGX (M) |
|---|---|---|---|
| cost | $9.25 | $8.56 | $16.48 |
| time to first answer | 28.8 min | 33.6 min | 31.0 min |
| turns | 76 | 150 | 210 |
| tests in the folder | 1 file | 10 files and a leak check | none |
| README | how to run, no hosting | how to run and host on Render | none |
| data lives | in the app folder | in the app folder | in `~/.noodl/backends/`, outside the app folder |
| opens on a phone on the same Wi-Fi | yes | yes | no (a filed defect) |

All from table §1.

- B cost 1.8–1.9 times as much as A or A+ (§1, cost).
- A+ was the cheapest. A was the fastest, by 2–5 minutes (§1).
- K and R are ordinary code: Express with SQLite, and Next.js with Prisma (§1, what it built). M is 37 node-graph components with its logic held as code strings inside them (§1; hat C §1).

## The blind grade

| stage | K | R | M |
|---|---|---|---|
| as built (shared 19 · one-list 22) | 19 · 19 | 19 · 19 | 19 · **21** |
| after F1 | 19 · 18 | 19 · 20 | 18 · 17 |
| after F2 | 19 · 19 | 19 · 19 | 19 · 18 |

From `grades.md`.

- As built, M passed two more one-list lines than K or R. That is the only grade row where any app led.
- M fell after F1. But each stage had a fresh pair of graders. A moving line may be the change or may be the graders (`grades.md`, note). Hat C found one after-F1 grader failing G11 on the same ordering the other passed (hat C, opening). **The measurements can't tell these two apart.**
- The grades missed the worst problems. Both graders passed K's phone lines, but on a phone K's song lists show no titles and tapping a row plays nothing. K's own F4 agent found it, and hats A, B and X confirmed it at 390 px (hat A §1; hat B §3; hat X §1). No grader tested M's open user table (hat A §1; hat D §2).

## Problems the grades didn't catch

- **K:** song lists broken on a phone (above).
- **R:** anyone can add fake plays to push a song up the charts. On a live site with no admin password set, whoever signs up first with the admin email becomes admin (hat X §1, F4 row; hat A §1).
- **M:** an anonymous request returns all seven users' emails and every like (§4). Seeking within a song is broken because the file server ignores Range requests (§4). Every song and cover is stored at `127.0.0.1` (§4). The framework's own command to open the app fails on 0.2.2 (§3, F1 extra; hat B §1).

On the email leak: the backend's code refuses to start in this open mode beyond the person's own machine. That was read from the code, not measured, so the measured reach is the person's machine (§4).

Whether the agent or the framework chose the `127.0.0.1` addresses is "not yet read" (§4). Hat X judged that one prompt line would probably have locked the user table, but no prompt line could fix Range or the stored addresses (hat X §2). That is a reading, not a test.

## F1: the API key

| | K | R | M |
|---|---|---|---|
| cost · time | $0.93 · 2.7 min | $3.01 · 18.3 min | $2.73 · 4.8 min |
| person told to put it in | `.env`, restart | `.env.local`, restart; Settings shows set/not set | `openwave/.env`, then "tell me. I'll then load it into the backend" |
| key found anywhere it shouldn't be | 0 of 68 | 0 of 33 | 0 of 95 |

From §3.

- **No difference on the leak itself.** All three kept the key on the server (§3, key search; hat D §2).
- Only with M could the person not switch the key on alone (§3; §4, filed defect).
- R's leak check covers only lines marked "(secret)", so a colleague who leaves the word off would bypass it (hat D §2).
- Hat C would ship K's version, which has a timeout, a cache and a rate limit, and borrow R's leak test (hat C §3).

## F2: the settings screen

- **K:** a screen inside the app, stored in the database, owner-only. Cost $2.40 (§3).
- **R:** `/settings` inside the app, admin-only. Cost $2.65 (§3).
- **M:** a separate panel beside the live app that writes the project's files. Cost $5.47 (§3).

Hats C and X quote $12.69 for M. That includes sittings lost to a lab fault, and the hats weren't told (§6, note). The agent's own work cost $5.47. That is still about twice K's or R's.

M's panel was the best-looking (hat A §4; hat B §4). It is also the strongest case for B. Hat C names it as "the one thing in M that isn't a cost", for a non-technical owner editing on their own machine (hat C §5). Against it:

- it runs only on the owner's computer and stops when the chat ends (hat A §4)
- the owner has to start it in a terminal (hat B §4)
- a hosted copy changes only after a redeploy (hat D §3; hat X §1)

Hat A: "I'd stop using it after the first time it disappeared." The app owner's verdict says nobody in this audience wants to tweak their app by hand (owner.md §9.3).

## F3 and F4: checking the app

- **F3, "where does that number come from":** K gave SQL commands. R said to log in as a sample user and look. M couldn't confirm the number because its backend wasn't running (hat A §5; hat C §4). The table predicted that B's inspector might help. Its editor was never opened, because no reviewer could run an Electron app (§5, not measured). So the inspector was not tested. What was tested came out worst for M (hat C §4).
- **F4, line by line:** K's and M's reports found more than their graders did. R's mostly agreed with its graders and added the fake-plays and admin problems (hat A §6). M's F4 agent left a test account, a song and a playlist in the real app (hat A §6). R cost the least, at $1.60, against $3.46 for K and $3.30 for M (§3).

## What the app owner saw first

Written blind, after playing all three (owner.md §9.2):

- **K:** "looks like an app", but titles in lists missing or "black font on black background". Best play bar.
- **R:** "rough and basic … I wouldn't want to show this to real users yet without another style pass."
- **M:** "most like an app, most faithful to Spotify". Best icons. "Childish" play-bar icons.

This runs against the hats. The setup every hat chose made the app the owner liked least to look at. Polish was one person's judgement, and each setup built once. **The measurements can't tell whether M's look came from the framework or from this one run.**

## Predictions against results

| prediction (written before the run) | result | source |
|---|---|---|
| A is cheapest | **No.** A+ was 7% cheaper. | §1, cost |
| A is fastest | Yes, by 2–5 min. | §1, time |
| B costs more | Yes, 1.8–1.9×. | §1, cost |
| A+ gets tests | Yes, 10 files and a leak check. | §1, tests |
| B has a backend by default; A and A+ pick their own, "which may be as good" | All three passed the second-device lines. But only B's lived outside the folder, failed on a phone over Wi-Fi and exposed emails. | §1; §4 |
| Opus follows harness lines on the key | No difference on the leak. | §3, key search |
| The answer shows in F1/F2, not the build grade | M dropped after F1, but new graders at each stage mean this can't be told from grader noise. | §2; `grades.md` |
| B's editor on day one; whether a person opens it is the hats' call | No hat would rely on M's panel. | hats A–D, X |
| B's inspector; "the person may not care" | Not tested. Hat A: "it didn't matter to me." | §5; hat A §5 |

## What the measurements can't separate

- **One run each.** Every difference between setups could be the setup or the run.
- **Tuning.** B's prompt had about 35 releases of tuning and A+'s had one attempt (§1, instructions). A+ led anyway, but this doesn't show how a tuned harness would compare.
- **Cause of R's lead.** Hat X credits R's phone-width touch rule with R not having K's broken lists (hat X §1, citing `R/CLAUDE.md:52`). Without a second run, that can't be told from chance.
- **Framework or agent.** For M's open user table and its `127.0.0.1` addresses, the table records the first as a framework default and leaves the second unread (§4).
- **A European model.** M's folder has a Mistral provider set up, but every build used Claude (hat D §4). Nothing tested whether any setup works as well with another model.

## Lab faults that touch these numbers

- The judge sent M's F1 five extra "continue" messages on an answer that A's and A+'s equivalents would have closed. No file changed after them (§3; §5). The $2.73 is at first answer.
- B's first run would have had no framework tools: the server starts slower than Claude Code waits. The lab warmed it first (§4). A person on a cold machine would not get that.
- The runner's messages to the app owner named costs and letters before the owner wrote their lines. The owner says they had not read them (owner.md §9.2; §5).
- Not measured: a real phone, B's honesty figure, B's editor inspector (§5).
