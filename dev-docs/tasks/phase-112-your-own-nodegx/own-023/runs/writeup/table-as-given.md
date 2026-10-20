#  — the table

Assembled by the running session (s1, 2026-10-20) from the artefacts. Numbers only (): no verdict sentence here.
Every row is "does A+ or B give the person something A didn't". The §7 prediction written before the run sits beside
each result. Letters were blind to graders and hats: **K = A (bare), M = B (NodeGX), R = A+ (harness)** (,
shown after the hats wrote). $ is API-equivalent (the subscription paid nothing extra); "to answer" is the time to the
agent's first answer. Everything: Opus 5.5, Claude Code 2.1.301, one evening and the next morning (R8), kit 0.2.2.

## 1. The build

| row | A bare (K) | A+ harness (R) | B NodeGX (M) | §7 prediction |
|---|---|---|---|---|
| cost | $9.25 | $8.56 | $16.48 | P1: A cheapest — **no** (A+ 7% cheaper). P4: B costs more — **yes, 1.8–1.9×** |
| time to answer | 28.8 min | 33.6 min | 31.0 min | P1: A fastest — **yes, by 2–5 min** |
| turns · sittings · continues | 76 · 1 · 0 | 150 · 1 · 0 | 210 · 1 · 0 | (R3's N = 5 never used in a build) |
| instructions in the folder before the brief | none | `CLAUDE.md` 8,805 B, a stranger's (§4.2) | `CLAUDE.md` 1,420 B + `AGENTS.md` 1,420 B + skill 17,007 B + the MCP server's own instructions (not measured) | B's prompt has ~35 releases of tuning; A+'s is one attempt |
| what it built | Express + `node:sqlite` + plain HTML/JS; 19 code files, 5,727 lines | Next.js + Prisma/SQLite; 86 code files, 6,079 lines | NodeGX graph: 37 components, 743 nodes; 69 code blocks in nodes (489 lines) + 49-line script | — |
| tests in the folder | 1 test file (node:test) | 10 test files (Vitest + Playwright), `npm run check` incl. a leak check | none in the folder (the framework's server validates writes; `drive_page`/`render_report` checks run in the transcript) | P2: A+ gets tests — **yes** |
| a person's documents | README (run; no deploy) | README (run, deploy to Render, what each part is), SPEC, REPORT, DECISIONS, verification/ screenshots | kit CLAUDE.md/AGENTS.md; `openwave/docs/` ARCHITECTURE, BRIEF, CONVENTIONS, 1 decision; no README; no deploy line | — |
| where the data lives | `data/hum.db` + `data/uploads/` inside the folder | `prisma/dev.db` + `uploads/` inside the folder | a local NodeGX backend under `~/.noodl/backends/` — **outside the app folder** | P3 (line 20): "B has a backend by default; A and A+ choose their own, which may be as good" — all three passed G18/O10 (second device) |
| opens on a phone on the same Wi-Fi | yes, as is | yes, as is (its README says how) | **no**: the preview binds 127.0.0.1; with `--host` the page still calls its backend on 127.0.0.1 (a filed defect) | P4 (B costs) |

## 2. The blind grade (two graders per app per stage; disagreements ruled by the app owner; grades.md)

| stage | A bare (K) | A+ harness (R) | B NodeGX (M) |
|---|---|---|---|
| as built: shared 19 · one-list 22 | **19 · 19** (fail O3, O12, O22) | **19 · 19** (fail O3, O4, O21) | **19 · 21** (fail O12) |
| after F1 (the key), on its own copy | 19 · 18 (+O8) | 19 · 20 | **18** · 17 (G11, O12, O13, O18, O19, O20) |
| after F2 (settings), on its own copy | 19 · 19 | 19 · 19 (+O12) | 19 · 18 (O13, O19, O20, O22) |
| scripted (as built): console errors not favicon · pages scrolling sideways at 390 | 0 · 0 (25 routes) | 0 · 0 (25 routes) | 0 · 0 (11 routes, from its project: no `<a>` links to crawl) |

Prediction 5: "the row that answers the question is not the build grade … it would show in F1/F2 (a stranger changes it and
lines 1–23 still pass)". Measured: each stage had its own pair of graders, so a moving line can be the change or the graders
(`final.md`'s note). B's after-F1 fails include G11 (the most-liked song not first in the default ranking) and O19/O20 (find a
person; taste suggestions empty for one grader); B's as-built graders passed those lines.

the app owner's lines before any number (the owner's lines): K "good effort … black font on black background … play bar probably the best";
R "rough and basic … wouldn't show this to real users without another style pass"; M "most like an app, most faithful to
Spotify … play bar has childish icons".

## 3. The follow-ups (each a fresh stranger on a copy of the build; the follow-up records)

| row | A bare (K) | A+ harness (R) | B NodeGX (M) | §7 prediction |
|---|---|---|---|---|
| F1 the key: cost · to answer | $0.93 · 2.7 min | $3.01 · 18.3 min | $2.73 · 4.8 min to answer ($3.43 with 5 judge-sent continues, no file written after) | — |
| F1: where the person is told to put the key | `.env` in the folder; restart | `.env.local`; restart; Settings shows set/not set | `openwave/.env`, then **"tell me. I'll then load it into the backend"** — the person can't switch it on alone | P3: "F1's key … Opus follows harness lines well" |
| F1 key search (canary where the agent said, "More like this" pressed, every response + direct paths; control in a served file) | 0 hits / 68 responses; control found | 0 / 33; control found | 0 / 95; control found | **no difference** on the leak itself |
| F1 extra | its own test checks the key isn't sent to the browser | tests + the leak check extended to the key | the command it gives to see the app (`npx @nodegx/preview openwave --open`) **fails on 0.2.2** (a filed defect, unpublished fix) | P4 |
| F2 settings: cost · to answer | $2.40 · 7.3 min | $2.65 · 22.8 min | $5.47 · 16.1 min (+$7.22 of lab-fault sittings, no file written) | — |
| F2: what was built | a settings screen in the app | `/settings` in the app (admin), stored in the DB | a separate panel (`openwave-settings`, `npm start`): form beside the live app, writes the project files, built on the framework's editor library and suite | P3: "B had an editor on day one; whether a person would open it is hat A's and B's call" — hats |
| F3 "where does that number come from": cost · to answer | $0.22 · 0.6 min | $0.27 · 0.8 min | $0.73 · 1.0 min | P3: B has an inspector; "the person may not care" — hats A, C |
| F4 "check it line by line": cost · to answer | $3.46 · 19.3 min | $1.60 · 9.4 min | $3.30 · 10.0 min | P2: A+'s report as honest as B's; the asymmetry applies (B's checklist step is a tuned prompt) — hats compare with the graders |

## 4. Kit defects B met (each a cost in B's row; filed, not fixed during the study)

| defect | where it bit |  |
|---|---|---|
| the NodeGX server misses Claude Code's 30 s start on a first run (cold `npx` 25.8–27.8 s) | B's first conversation would have had no NodeGX tools; the lab warmed it (R9) | a filed defect (fixed in the repo the makers, not published) |
| the app can't be opened from a phone on the same Wi-Fi | §1 row | a filed defect |
| `npx @nodegx/preview` can't choose a command | F1's "to see the app" line; the framework's own create output | a filed defect (open since 0.2.0; fix unpublished) |
| the key in `openwave/.env` doesn't reach the backend without an agent | F1 | a filed defect |
| a `[noodl]` runtime error in the console after F2 (`ParentComponentObject (/Shared/Track Row): No ancestor component has a Component Object node`) | after-F2 grader 1, O13 | a filed defect |

| the local backend answers an anonymous `/classes/_User` with all 7 users' emails (and every reaction): "devOpen" on by default, CORS `*` | reported by B's F4 agent and hats A, D, X; verified by the lab on the served copy. By code (not measured) the backend refuses to start devOpen beyond loopback, so the measured scope is the person's machine | a filed defect |
| the file server ignores Range (200 + the whole file for bytes 0–99): seeking, Safari/iOS playback | hat X, B's F4 agent; verified | a filed defect |
| every song's audio and cover stored as `http://127.0.0.1:8584/files/…` (14 of 14) | hat X, B's F4 agent; verified; whose choice (agent or kit) not yet read | a filed defect |

Not the framework: B's build agent alone tried to write a Claude Code auto-memory file under the person's `~/.claude` (refused by the
lab's fence).

## 5. Lab faults (all arms' numbers corrected; the lab notes)

- Resumed sittings' `total_cost_usd` is cumulative: B-F1 first read $18.74 (true $3.43). Fixed; every $ above is true.
- A sitting outlived the agent's answer when it left background servers (B-F2, 9.5 h, judge read the servers' exit notices).
  Fixed; B-F2 reported at its first answer.
- The judge sent B-F1 five continues on an answer that said "built, can't try it without your key" (A's and A+'s similar
  answers read DONE). Kept, reported .
- The runner named costs and letters in messages to the app owner before his lines (he had not read them).
- The agents' shells carried the lab owner's login name; B's build named a test user after the lab owner. Neutralised in the reviewers'
  copy; next round should set a neutral USER.
- Not measured: the honesty number (B), the NodeGX editor's inspector (no hat can open an Electron app), a real phone.

## 6. The hats (verdicts/, unedited; each read ~40 files and, bar C, used the running apps)

| hat | what it chose (its own words, first line or verdict line) | file |
|---|---|---|
| A — non-techie who already ships | "I'd choose R" | verdicts/A.md |
| B — beginner | "I'd start my next app with **R**" | verdicts/B.md |
| C — freelance dev | "I'd take over R, and K is a close second. I wouldn't take over M as a code job." | verdicts/C.md |
| D — founder / tech lead | "I'd let the team start with **R**. **K** is close behind. I would not use **M** with real users as it stands" | verdicts/D.md |
| X — null hypothesis | "What the framework gave that a prompt could not: **nothing**." | verdicts/X.md |

Two hats' cost figures for B-F2 ($12.69) are the as-run total including the lab's fault sittings (§5); the agent's own
work cost $5.47. Hats were not told; the transcript they read contains the extra sittings.

## 7. Owed

Hats' verdicts (`verdicts/`), F3 scored twice (agent / alone) and F4 against the graders by the hats, the write-up by a
stranger, the app owner's verdict beside his lines.
