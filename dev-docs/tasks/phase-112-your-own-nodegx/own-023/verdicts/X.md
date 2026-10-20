# Verdict: Claude Code alone is almost enough. Add a CLAUDE.md. Skip the framework.

**Which folder is which:** K is Claude Code alone. R is Claude Code with a written CLAUDE.md (`apps/R/CLAUDE.md`). M is Claude Code with the NodeGX framework (`apps/M/CLAUDE.md`, `apps/M/.mcp.json`).

**What I checked myself in the browser today:**
- M's settings panel renames the app live (I put the name back afterwards).
- K's settings screen is behind a login. I logged in as `demo` and it shows name, colours, songs per page and default sort.
- R's `/settings` says "Only the admin can change settings."
- K's song lists are broken at phone width.
- M hands out user records to anyone who asks.
- M's file server ignores Range requests, which is what seeking needs.

## 1. Where R or M differs from K, and whether anyone would act on it

| Row | The difference | Non-technical, shipped app | Beginner | Freelancer | Tech lead (data, keys) |
|---|---|---|---|---|---|
| **Blind checklist** | As built: K 19·19, M 19·21, R 19·19 (`grades/final.md:5-7`). The gaps are a missing genre on list cards (O3), search not narrowing as you type in R (O4), K's page scrolling 2 px sideways (O12), and a missing favicon (O13). Scores move by up to 4 between stages because the graders disagree (`final.md:9`). For example, the after-F1 graders saw the same M behaviour and one failed it on G11 while the other passed it (`after-F1/grader-1/M/report.md:17` against `grader-2/M:17`). | No. This is noise. | Might notice R's search needing a tap on "Go". | No | No |
| **Song lists on a phone** | K's list rows show only a cover, a heart and "…". There's no title, and tapping a row plays nothing (K F4 transcript line 437). I confirmed it at 390 px on `/charts`: after a tap the player still said "Pick something to play". All four graders missed it. R's CLAUDE.md requires a touch walkthrough at phone width (`R/CLAUDE.md:52`), and R's F4 found "Tapping a song plays it at once". M's lists work. | **Yes. The app's main job is broken on the device it's for.** | Yes | Yes | Not their concern |
| **What the person finds in the folder** | R has a plain-language README with step-by-step Render hosting and costs, plus SPEC, REPORT and DECISIONS (`R/README.md:38-66`). K's README is for developers and ends with a "Before going public" to-do list rather than hosting steps (`K/README.md:68-77`). M has no README. The run command in the framework's own instructions fails: `npx @nodegx/preview` gives "could not determine executable" (M F4 transcript line 370). | **Yes** | Yes | No, they can deploy without help | No |
| **F1: Mistral key** | All three read it on the server only: K `server/mistral.js:41,79`; R `lib/mistral.ts:1,21` (`import "server-only"`); M `__cloud__/moreLikeThis/nodes.json:93` (`apiKeySecret`). R also adds a leak check to `npm run check`, which passed (R F4). | No difference | No | No | Small. R's check is nice, but K's code is already correct. |
| **F2: settings** | K: inside the app, saved in the database, admin-only, with a live preview, colour presets and a contrast check. R: inside the app and admin-only. M: a separate panel on the owner's computer that edits the project's files (`M/F2/.../001-owner-settings.md:16-18`). It works, but a hosted copy only changes after a redeploy, and it can't be used from a phone. Cost of the change: K $2.40, R $2.65, M $12.69. | **Yes. M's panel doesn't reach the live site.** | Yes | Maybe | No |
| **F3: "where does 2 likes come from?"** | K gave a correct, live count with SQL and file:line references. That's right for a developer, but the person can't run it. R answered in plain words: log in as lee@ or dev@ and look. M couldn't see the data because its backend wasn't running. It also found the count is a stored number that "could show a number with no votes behind it". | Yes. R is the only answer they can follow. | Yes | No, K's answer suits them | No |
| **F4: security found when auditing** | **M:** anyone, signed in or not, can download every user with their email, and all likes and dislikes (M F4). I confirmed it: an anonymous `POST /classes/_User` returned 7 users with 7 emails, and `/classes/Reaction` returned 21 rows. **R:** plays can be faked, and on a live site with no admin password set, whoever signs up first with the admin email becomes admin (R F4). **K:** no rate limits or moderation (`K/README.md:73`). From my reading only, not tested: if a live K copy loads the sample data, the owner account is `demo/demo1234` as printed in the README (`K/README.md:11,66`). | Can't see any of it | No | Yes | **Yes, M's email leak first** |
| **Cost to build** | K $9.25, R $8.56, M $16.48 (each build transcript's final result line) | Yes | Yes | Yes | No |

## 2. Where M differs from R, and the CLAUDE.md line that would close it

| Gap | Would a line close it? | The line |
|---|---|---|
| M shows genre on cards and searches as you type; R doesn't (O3, O4) | Yes | "Every song list shows cover, title, artist and genre, and search updates on each keystroke without a Go button." |
| M's settings don't reach the live site | Yes. M's backend can store records; the agent chose files to avoid building an admin role (`001-owner-settings.md:17-18`). | "Settings live inside the running app, saved in the database, editable only by an admin. Never in project files." |
| M exposes user emails and reactions | Probably. It's the backend's open default. | "Before finishing, lock every collection: a signed-out request can't list users or read emails, and a person's likes are readable only by them." |
| No README, and a wrong run command | Partly. A README line closes the first; the wrong command is in the framework's own CLAUDE.md. | "Write a plain README with the exact command that starts the app, run it once from a fresh terminal, and give step-by-step hosting." |
| M's seeking is broken (no Range support); song URLs saved as `127.0.0.1` | **No.** That's the framework's file server, which the agent doesn't write. | — |
| F3: M can't see its own data without starting a backend that rewrites a project file (M F3 transcript) | **No.** That's how the framework runs. | — |

## 3. Differences the person wouldn't use

- **R's SPEC.md with requirement numbers, and the `npm run check` pipeline:** a non-technical person doesn't open these. They read REPORT.md. What earned R its lead is the walkthrough rule and the README, not the requirement numbers.
- **M's design tokens and component graphs** (`M/openwave/CLAUDE.md:7`): nobody in these four situations edits them. They're also a reason the next agent has to go through the framework's MCP server.
- **K's 2 px sideways scroll and everyone's favicon 404:** a real person never notices either.

## 4. Where M did worse: the framework itself, or a defect in it

| Where M did worse | Which | Cost to the person |
|---|---|---|
| Settings stuck on the owner's computer | Framework: settings live in project files | A redeploy for every change |
| Emails readable by anyone | Defect: the backend's open default wasn't locked | A privacy leak on day one |
| Seeking broken, iPhone playback at risk | Framework defect: no Range support (checked) | The core feature is broken on the main device |
| `127.0.0.1` saved in every song and cover URL | Framework defect | Moving the app to a host breaks every saved song |
| The framework's own run command fails | Framework defect | A beginner is stuck on day two |
| F3 couldn't read the data | Framework: the backend has to be running | "Show me" turns into "trust me" |
| Cost: build $16.48 against ~$9; F2 $12.69 against ~$2.50 | Framework: heavier tooling per step | About twice the bill |

## What I'd do

Build with Claude Code and a short CLAUDE.md like R's, keeping three of its rules: test it with touch at phone width, write a plain README with hosting steps, and put settings and secrets inside the app on the server. R cost the same as K, and only that combination found the defect that mattered most (K's unplayable lists). The framework cost twice as much and added defects that no prompt can reach.

**What the framework gave that a prompt could not: nothing.**
