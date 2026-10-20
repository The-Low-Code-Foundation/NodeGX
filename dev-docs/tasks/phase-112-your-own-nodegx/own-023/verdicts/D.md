I'd let the team start with **R**. **K** is close behind. I would not use **M** with real users as it stands: its running backend hands every user's email address to anyone who asks, with no sign-in needed.

## 1. Where the data lives, who hosts it, and whether a second device sees it

All three keep the data on a server, not in the browser. Both graders confirmed that a second browser profile sees the same data for all three (`grades/after-F2/*/{K,M,R}/report.md`, lines G18 and O10). That "second device" was a second browser profile on the same machine, so it shows a shared server, not a real phone.

| | Where it lives | Who hosts it |
|---|---|---|
| **K** | A SQLite file (`data/hum.db`) plus the uploads folder (`data/uploads`), on the server's own disk (`apps/K/README.md:63`) | You do, on any Node server. The README's "Before going public" section lists what's missing: HTTPS, rate limits, object storage (`README.md:68-77`). |
| **M** | A separate "nodegx-backend" program at `127.0.0.1:8584` (`openwave/nodegx.project.json:21-26`), described as a "built-in backend that runs on this computer" (`docs/decisions/000-initial-scope.md:71`) | Not written anywhere. I searched M's docs for deploy, host, backup, sqlite and `.db` and found nothing about running it in production. |
| **R** | A SQLite file through Prisma, plus an `uploads/` folder | The README gives a step-by-step Render setup with a disk, and a cost of about $10 a month (`apps/R/README.md:38-67`). |

## 2. Where the key ended up after the "More like this" change

I searched the after-F1 folders for `MISTRAL` (ignoring case), skipping transcripts. In all three, the key's name appears only in server code and the empty key files, never in code the browser downloads.

- **K:** The key is read on the server only, in `followups/K/F1/folder-after/server/mistral.js:41,79`. In `public/`, the only match is a code comment (`public/js/views.js:353`). `.env` was added to `.gitignore` (line 5). A test checks that the key never appears in the reply to the browser (`test/api.test.js:279`).
- **M:** The key is an empty line in `openwave/.env:3`, which git ignores (`openwave/.gitignore:5`). Otherwise only its name appears, in the server-side function `components/__cloud__/moreLikeThis/nodes.json:93`. No page component mentions it.
- **R:** The key is an empty line in `.env.local:26`, which git ignores. It is read only in `lib/mistral.ts:21`, and the settings screen shows just "set / not set" (`lib/settings.ts:36`). Nothing under `app/` or `components/` reads `process.env`.

**Would the team have caught a leak?** Only R has a check that would catch it. `scripts/leak-check.mjs` builds the app with fake secret values and searches every browser file and every page, as a visitor and as admin. It runs as part of `npm run check`. R's report says the check was extended to cover the Mistral key (`REPORT.md:14`). I couldn't run it myself (no terminal).

- One gap in R's check: it only covers variables whose comment in `.env.example` contains "(secret)" (lines 17-28 of the script). A colleague who leaves that word off would bypass it.
- K's test covers only the one API reply.
- M has no check at all.
- None of the six graders' reports checks for secrets at all.

## 3. Who can read and write what

- **K:** The server enforces it. Changing an artist, album, track or playlist checks that you own it ("belongs to someone else", `server/api.js:32-46, 585-648`). No email is collected. When I tested the running app without signing in, `PUT /api/settings` was refused with 401, and `/.env` and `hum.db` were not served. One weakness: if `HUM_ADMINS` is not set, the settings admin is "the first account ever created" (`F2/server/settings.js:79-88`). On a fresh public install, that's whoever signs up first.
  - Plain-language rules: only the README line about the settings owner (`F2/README.md:66`). Screenshot: `my-screenshots/K-settings-anon.png` shows "Log in to change app settings".
- **M:** Tracks, playlists and follows are readable by anyone and writable only by their owner. Likes and dislikes go through a server function (`__cloud__/react`). But the user table has no access rule. Without signing in, `GET :8584/classes/_User` returned all 7 users' usernames and emails, and every like/dislike record (who liked what) is also public.
  - There is no plain-language statement of the rules anywhere in M's folder.
  - M's settings panel is a separate tool that only accepts connections from the same computer (`openwave-settings/server.mjs:62,80`; `my-screenshots/M-settings-panel.png`). Settings are saved into project files, so a change on a live site needs a redeploy.
- **R:** `SPEC.md` states the rules in plain words. For example: "Nobody else can [edit a song], except the admin" (line 105), private playlists show "This playlist is private" (line 99), and only the admin can open Settings (lines 121-122). In the running app, signed out, `/settings` says "Only the admin can change settings" (`my-screenshots/R-settings-anon.png`).

## 4. Could a European model have built and run it?

What I can verify: all three were built by `claude-opus-5-5` with `inference_geo: "global"`. I found no other model name in any of the three transcripts.

- M's folder includes an `opencode.json` with a `mistral-large-4` provider set up (lines 16-26). So that setup is meant to be usable with a European model, but this build didn't use one.
- At runtime, the only outside provider is Mistral, which is EU-based. All three send song titles, genres and descriptions to it from the server.

What I can't verify: whether any of these setups produces the same quality with a European model. Nothing in the folders tests that.

## 5. Who maintains each one in a year

**No app has a licence file**, and no `package.json` has a `license` field. That needs fixing before anyone reuses the code.

- **K:** Two dependencies, Express and Multer, plus Node 22.13 or later. The only thing that has to stay running is one Node process and its `data/` folder. The README explains the code layout well. There are no notes written for a future agent.
- **M:** It needs the NodeGX toolchain pinned at version 0.2.2 (`.mcp.json`), its backend program, the preview program and the settings panel. Its licence isn't in the folder.
  - The app is generated files that its own instructions say not to edit by hand (`openwave/CLAUDE.md:7`). That makes you dependent on one vendor's tools.
  - The design decisions are written down well (`docs/decisions/`), but nothing covers operations.
- **R:** Standard Next.js, Prisma and SQLite. `CLAUDE.md` §6 tells any later agent exactly what to do: read SPEC, DECISIONS and REPORT, run `npm run check`, never renumber requirements, use database migrations. It has a requirement-by-requirement test suite and screenshots. R is the strongest on this question.

## 6. What a leak would look like, and which one I'd start with

- **K:** Most likely a colleague committing a `.env` that isn't ignored, or calling `more-like-this` with no sign-in or rate limit, which runs up the Mistral bill. Customer data is safe, because there are no emails and ownership is enforced on the server.
- **M:** It is already leaking. Anyone who can reach the backend can read every customer's email, and the backend allows requests from any website (`access-control-allow-origin: *`). The settings live in project files, there is no deploy story, and nothing checks for secrets.
- **R:** A secret missing the "(secret)" marker would bypass the leak check, or a server action could return too much data. Even so, `npm run check` gives a reviewer something concrete to look at.

R is the only setup whose folder lets a non-developer check the rules, the secrets and the behaviour without trusting the agent: SPEC, REPORT, DECISIONS, `.env.example`, a leak check and a settings screen that requires admin. As blind-graded features, the three are about even: 19/19 on the shared checklist after F2 for each (`grades/final.md`). Before going live with R, I'd add a licence and put "(secret)" on every secret line in `.env.example`. K is an acceptable second choice if you set `HUM_ADMINS` and add rate limits.
