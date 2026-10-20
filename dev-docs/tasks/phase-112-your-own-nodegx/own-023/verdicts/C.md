# Verdict (as Hat C, a freelance React/Svelte dev)

**I'd take over R, and K is a close second. I wouldn't take over M as a code job.** All three do the same things on a phone; the difference is how much each one costs me to own.

The grades don't separate them. All three score 19/19 on the shared lines at every stage (`grades/final.md:5-7`). The one-list scores move by a line or three between stages, and `final.md:9` itself warns that a move "may be the change or may be the graders". M's dip after F1 (18/17) is mostly that. Grader 2 in `grades/after-F1/grader-2/M/report.md:17` passed G11 on the same Trending order that grader 1 failed. So I decided on the code, the follow-ups and the cost.

## 1. Would I take each job?

**K (Express 5 + SQLite + vanilla-JS single-page app): yes.**
- **Good:** only two runtime dependencies (`apps/K/package.json:17-20`). There are API tests in `test/api.test.js`. The F1 Mistral module is careful work (more in Q3), and each follow-up was cheap.
- **Mess:** a hand-rolled frontend that builds HTML from tagged templates and assigns it with `innerHTML` (`public/js/ui.js:24`, `views.js:11`). `server/api.js` is 845 lines and `views.js` is 602. The player's progress bar makes every page scroll sideways by 2 px (`grades/as-built/grader-1/K/report.md:46`). The upload form has about 15 inputs (`:56`).
- **Rewrite:** the frontend in Svelte, and split `api.js` by resource. I'd also change how F2 picks the admin. By default it's "the first account ever created" (`followups/K/F2/folder-after/server/settings.js:82-88`), which on a seeded install is the seed user. I'd make `HUM_ADMINS` required.

**R (Next 15 + Prisma + SQLite + Tailwind): yes, and it's the one I'd pick.**
- **Good:** it's my stack. It has typed `lib/` code, vitest and Playwright tests, and one `npm run check` that runs everything (`apps/R/package.json:16`). The README includes how to deploy and what it costs (`README.md:38-67`).
- **Mess:** ranking loads every song into memory and sorts in JavaScript (`lib/songs.ts:59`, `:102`, `:135`). Search only updates after you tap Go (grader-1 R, O4). It's being served by `next dev`, whose dev-tools button blocks the Home tab (O12). There are a lot of SPEC/REPORT/verification documents written for a non-developer.
- **Rewrite:** move ranking into SQL, make search update as you type, and trim the paperwork.

**M (a NodeGX low-code project, built through an MCP server): no, not as code.** The app is JSON node graphs, and its JavaScript lives inside those files as strings. For example, the like/dislike logic is one string at `components/__cloud__/react/nodes.json:24`. The project tells me not to hand-edit any of it and to go through the MCP server instead (`openwave/CLAUDE.md:7-9`). Like counts are stored on the Track record rather than counted. The popularity formula is written out twice and carries a comment saying "change both together" (`react/nodes.json:91`). There are no tests in the folder.

## 2. What M's format gives and costs

- **What it gives:**
  - Labelled nodes with comments.
  - Checks on every change made through the MCP server.
  - Design tokens in `nodegx.project.json`.
  - A live preview.
  - The F2 settings panel I opened at :8590. It edits the project's source files and reloads the app beside it, and it only listens on 127.0.0.1 (`openwave-settings/server.mjs:80`). It also refuses a save if the files changed since it read them (`core.mjs:189`).
- **What it costs:**
  - I can't review or edit the logic as normal code: there's no lint, no types and no tests.
  - Server functions have to be deployed as a separate step (`.claude/skills/nodegx-your-own-editor/SKILL.md:238`).
  - The backend is NodeGX's own (`nodegx.project.json:21-25`).
  - Every change goes through their tools.
- **Where I'd have to extend it:** every real feature already ends up as a JavaScript Function node, which is plain JS in a worse place to keep it. I'd expect payments, OAuth and background jobs to need custom work. I didn't test any of those, so I can't say how hard they'd be.
- **Export to code:** I didn't find one. The only export among the NodeGX tools in the transcripts is `export_backend_collection`, which exports database records, not the app. So I couldn't export M and judge the result.

## 3. The key and the server call (F1)

All three kept `MISTRAL_API_KEY` on the server.

- **K (`followups/K/F1/folder-after/server/mistral.js`):**
  - Reads the key from the environment and returns a clear 503 when it's missing (`:79`).
  - Times out after 30 s (`:42`).
  - Tells the model that song text is data, not instructions (`:53`).
  - Keeps only song ids that really are in the catalogue (`:85-92`).
  - Caches answers for 10 minutes and limits how often one person can ask (`api.js:476`).
  - Has a test that stands in for Mistral (`test/api.test.js:251`).
  - The change cost **$0.93**.
- **R (`lib/mistral.ts`, `lib/similar.ts`):** the same ideas, plus a Playwright test that runs a fake Mistral server and checks the key never reaches the browser or the page (`e2e/similar.spec.ts:105-119`). It also lets the admin change the model name in Settings. It cost **$3.01**.
- **M (`__cloud__/moreLikeThis/nodes.json`):** the key is named as a platform secret (`:93`), and only signed-in users can call it (`:16-19`). It also filters ids. I saw no cache and no rate limit. It cost about **$3.43**.

**I'd ship K's.** I'd borrow R's leak test.

## 4. Following a number from the screen to where it's stored (F3)

- **K ($0.22):** explained that the number is a live count of rows in `reactions`. It gave the file and line for each step and read-only `sqlite3` commands to check it.
- **R ($0.27):** also a live count. It named the four seed accounts behind it and explained how to check by logging in as each. It also noticed the README leaves two of those accounts out.
- **M ($0.73):** found a stored counter on the Track record. It couldn't confirm the 4, because the backend wasn't running and starting it would rewrite a project file.

Clients do ask "why does it say 4?", but it's a debugging question. Readable code and a database I can query answer it. The visual format was supposed to help with this and came out worst.

## 5. Where each setup is a net cost for me

- **M:** the build cost **$16.48**, against $9.25 for K and $8.56 for R (the transcripts' final costs). F2 cost about $12.69, against $2.40 and $2.65. The grades came out the same. The one thing in M that isn't a cost is the settings panel beside the app, for a non-technical owner editing on their own machine. Any change still has to be redeployed, though, so for me it's still a cost. My answer for M is: nowhere.
- **R:** not a net cost overall. The paperwork and its 150-turn build are overhead, but the paperwork is handy to give a non-technical client.
- **K:** cheapest to change. The cost comes later, when its hand-rolled frontend grows.

## 6. What would make me try M on a client's internal tool

- A code export I'd accept.
- Logic kept in real `.js` files I can lint and test, not strings inside JSON.
- A backend I can host on Postgres myself.
- A client whose own staff want to rearrange screens after I hand it over.

Without those, I'd stay on plain code.
