# Phase 119 — Learn with Simple Rick

**Scoped:** 2026-10-12, at HEAD `bca1363b8`, from a conversation with Richard that began as *"let's jam and brainstorm
something new"* for his AI training and coaching offer. **Status: 🟡 OPEN — s1 (2026-10-12): SRK-000 three of six
measured (§1a), three owed by Richard; SRK-001's backend half built and tested.** **Prefix: `SRK`.** Route: the P116 path, **npm packages only, no editor MCP**,
like P118. The five gates are the board, as in P118.

> "eLearning + coaching concepts, but disguised as a chat platform." — Richard, 2026-10-12

> "I need Claude more as my personal teaching assistant, and leave all the pedagogy to me please." — Richard, 2026-10-12

## 0. The idea in one paragraph

Richard records a screencast. The first minute is for Claude only: who the learner is, what he is about to show, why,
what he predicts will happen, what the assignment is. He says a phrase, and from there the recording is what the learner
may see. The studio (a private repo in the parent folder, `~/vscode_projects/learn-with-simple-rick`) transcribes it,
cuts it into clips, and writes a **chat thread** in Richard's words: one message at a time, a clip as the hook, a tap or
two, one paste, and an ending that asks the learner to come back and say what happened. The learner opens it in an
installed PWA that looks like every chat app they already use. Rick reads their messages on his phone and replies, by
hand, by voice, or with a draft from Claude that is marked as such. Coaching sessions recorded on Google Meet go through
the same studio and come back as a review thread. Nothing in the cloud decides what to teach. **The DBT template
(25 tables, 19 section kinds, a lesson generator with a gate) is replaced on training.digitalbricks.io by this: about
seven tables, six message kinds, and a human.**

## The five gates, as the board

| gate | what | file | state |
|---|---|---|---|
| 1 | the brief in the person's words | [BRIEF.md](BRIEF.md) | ✅ Richard verbatim, rulings R1–R5, the sixteen answers; two slots owed (welcome-popup wording, the first learner's words) |
| 2 | the route | this README §0 | ✅ full lane: a chat-shaped coaching product, two apps, npm packages, no editor MCP |
| 3 | a picture the person said yes to | [LOOK.md](LOOK.md), `look/learner-thread.html` | ✅ *"This is fucking clever"*; the teacher side has no picture yet (sketch owed before SRK-006) |
| 4 | the build held to the picture | LOOK.md §built | ⬜ |
| 5 | the person it is for uses it, words written down | PLAYTEST.md | ⬜ one real learner, one real screencast, one real session recording |

## 1. What was measured before scoping (2026-10-12)

| # | fact | source | consequence |
|---|---|---|---|
| 1 | The LX dubbing pipeline **never calls Claude and takes no frames**: it uploads whole video windows (~300 s) to Gemini, which returns 2–12 s segments with narration and on-screen text; then translates, speaks (Gemini TTS), cuts, assembles, muxes. Python stdlib + ffmpeg. | `~/vscode_projects/LX-elearning/tools/dub/dub.py` | Stage 1 is the studio's ingest, ported as is. The dubbing stages are the R11 switch. |
| 2 | The backend has **magic-link sign-in** (BAK-004), no email code. | `packages/nodegx-backend/src/auth/identities.ts:150`, `service.ts:1035` | R5 wants a six-digit code: a magic link from a phone's mail app opens the browser, not the installed PWA. **Core task SRK-001.** |
| 3 | **P110 (the app in your pocket) has 0 of 14 built.** `nodegx-export` mentions a manifest only in its IR types. | `phase-110 README`, `packages/nodegx-export/src/ir/types.ts` | "PWA from the start" is this template's own manifest, service worker, install prompt and push subscription (SRK-005), and it feeds P110. |
| 4 | **training.digitalbricks.io serves the DBT template today**, own backend on `127.0.0.1:8691`, data in `/var/lib/dbtraining/data`, nightly gpg backup to the `training-digitalbricks` bucket (Hetzner Object Storage, nbg1). | `templates/digital-bricks-training/hosting/README.md` | R2 is a migration: count the real learners first (SRK-000), tell them, keep the backup. The clips bucket is a **second, public-read bucket** in the same Object Storage project, never the encrypted backup bucket (R4). |
| 5 | ~~`scripts/package-deploy.js` **refuses every build**~~ **already fixed** by P109 ISL-042 (`ac78efb4b`); s1 measured `dist/cli.js`: the packager's pattern finds nothing, and the looser hosting-doc check finds only the placeholder `postgres://USER:PASS@`. The hosting README was out of date and is corrected. | hosting README §1 | SRK-002 needs no work. |
| 6 | The DBT template's MCP pattern (one staff key, `actsAsUserId`, nine `role:staff` cloud functions, `/mcp` through Caddy) **is reusable as is**. | `digital-bricks-training/CLAUDE.md` 7901–7965 | The studio publishes threads over the same kind of key. No MCP server to write. |
| 7 | The sister repo's content-authoring skill and `tools/checks/written.py` run offline (miniconda base). The mockup's copy: one flag, fixed. | `~/vscode_projects/Claude-content-authoring` | Every learner-facing sentence the studio writes is checked by it before publish (SRK-009). |

## 1a. SRK-000, measured in s1 (2026-10-12)

| # | question | answer | consequence |
|---|---|---|---|
| 1 | learners on training.digitalbricks.io today | **not measured.** Reading the box's admin token over `ssh` was refused by the auto-mode classifier as credential exploration. The last count on record (hosting README §4, 2026-09-30, the OLD host): 1 account, Richard's own. | **Owed by Richard:** run the tunnel and `GET /admin/users` himself, or grant the read. |
| 2 | Gemini vs Groq STT, French + English | **not measured.** It needs the two screencasts Richard records for it. | **Owed by Richard:** one ~3 min English and one ~3 min French screencast, with the ten sentences he actually said written down (the reference for word error). |
| 3 | a public-read clips bucket beside `training-digitalbricks` | **not measured.** The Object Storage key is in `/etc/dbtraining/backup.env` on the box, and reading it was refused, as in #1. On this Mac: `aws` CLI yes, `rclone` no. | **Owed by Richard:** a second key, or the bucket made in the Hetzner console (public-read, nbg1). Expected URL shape `https://<bucket>.nbg1.your-objectstorage.com/<key>`, unconfirmed. |
| 4 | Drive API to Meet recordings, and matching a recording to a session | **Measured through the Google Drive connector.** The recordings live in `Meet Recordings` in **Richard's personal Gmail account's** Drive (there is a second, older folder of that name from 2023). A file is named `<meet code> (<YYYY-MM-DD HH:MM> GMT+N)` with **no attendee in the name**, and a "Notes by Gemini" doc sits beside it. **A recurring meeting keeps its code**: the same `jtf-…` code on 2026-04-13 and 2026-05-29. Files appeared 28 min to 2 h after the meeting started (three measured), at 50 MB to 1.48 GB each. The recordings named "<person> and Richard Osborne – Recording", in per-person folders, are **LangueXpert evaluations**, a different business. | `watch-drive` matches on a **`Learner.meetCode`** (the learner's recurring Meet code) plus the time, with no attendee API needed. It watches `Meet Recordings` only, never the LangueXpert folders. It waits for a file to stop growing before ingesting it. The studio needs its own OAuth desktop client (`drive.readonly`) **signed in as that personal Gmail account**, not the digitalbricks.io one (no `gcloud` on this Mac). |
| 5 | Web Push from `nodegx-backend` | **None.** `vapid`, `web-push` and `pushManager` have 0 hits in `nodegx-backend`, `noodl-runtime`, `noodl-viewer-react` and `templates/`. | SRK-005 owes a sender: VAPID keys in the backend's secrets and a cloud function or core route that sends. That finding feeds P110. |
| 6 | `nodegx deploy` + manifest + service worker on an iPhone and an Android | **not measured.** It needs the phones. | **Owed by Richard**, once SRK-004 has a first build to install. |

## 2. The data (about seven collections, policy in `nodegx.security.json`)

| collection | fields (sketch) | who reads | who writes |
|---|---|---|---|
| `Learner` | email, name, language, prefs (theme, font), aliases (the R3 find-and-replace table), inviteToken, package (sessions bought or monthly cadence), meetCode (§1a #4), notes (**coach-only free text**) | own row minus `notes`/`aliases` | staff; learner writes `prefs` only |
| `Conversation` | learnerId, title, kind (lesson · session-review · follow-up), state (open · done · archived), language, dubbed, linkedFrom, summary (the refresh block), dueBefore (next session), shareable, run (reset counter) | own | staff; learner writes `run` |
| `Message` | conversationId, run, seq, from (rick · learner), origin (cut · typed · drafted · dictated), kind (text · clip · choice · question · paste · learner), body, clip {url, start, end}, options, revealsAfter | own | staff; learner writes `from: learner` |
| `Progress` | learnerId, conversationId, run, lastSeq, lastOpened | own | learner |
| `CoachNote` | learnerId, conversationId?, messageId?, text, on | **staff only** | staff |
| `Objective` | learnerId, text, setOn, doneOn | **staff only** | staff |
| `Session` | learnerId, at, recordingDriveId, predicted, happened, comparison, reviewConversationId, reminderOn | **staff only** | staff |
| `PushSubscription` | learnerId, endpoint, keys | own | learner |

Rule, carried from DBT and TPL-010: **nothing is ever deleted; `delete: nobody` everywhere.** A reset is a new `run`.
Rule, from R3: the Anthropic-bound text is built from rows and passed through `Learner.aliases` before it leaves; the
privacy page says so in Richard's words.

## 3. The studio (the private repo, `~/vscode_projects/learn-with-simple-rick`)

One CLI, one command per stage, every stage idempotent and skipped when its output exists (the dub tool's habit).

| command | does | stage of |
|---|---|---|
| `ingest <video>` | transcribe (Gemini video windows **or** Groq STT, measured on one French and one English recording in SRK-000), segments with on-screen text, the preamble cut at the start phrase, code words found and stripped | SRK-008 |
| `thread <work-dir> --learner <id>` | Claude Opus 5.5 writes the message sequence from the preamble + transcript + Richard's notes (aliased), **no learner-facing sentence without a transcript timestamp**; `written.py` on every bubble | SRK-009 |
| `cut` | ffmpeg clips per message; dubbed voice when the conversation says so (the dub tool's translate → speak → assemble → mux) | SRK-009, SRK-010 |
| `preview` | renders the thread locally through the same thread component the app uses | SRK-009 |
| `publish` | clips to the public bucket, rows over the staff key; appends to an existing conversation when told | SRK-009 |
| `verify` | fetches every clip back, compares hashes, validates the thread with the app's validator | SRK-009 |
| `clean` | deletes the source video and work folder **only after verify**; transcript and thread JSON stay, git-tracked | SRK-009 |
| `watch-drive` | polls the Meet Recordings folder in Google Drive, matches a recording to a `Session` by time and attendee, runs ingest → review | SRK-011 |
| `review` | the session thread in two modes (pick a part · the whole thing), "off the record" cut, the "before next time" segment as a **linked new conversation** | SRK-011 |
| `compare <session>` | prediction vs what happened → advice for the next session, progress toward the objectives, whether a stop-and-check is due; staff-only | SRK-012 |

**Code words** (brainstorm #15, *"keyboard shortcuts for my voice"*) live in the studio's `CODEWORDS.md` and grow with
use. The start phrase, "Claude, note:" asides, "off the record" / "back on", "this is the trap", "ask them here", "paste
point", "a choice: puppy or kitten", "new conversation from here", "cut that", "say that again" (take two replaces take
one).

## 4. The board

| task | what | depends on | state |
|---|---|---|---|
| SRK-000 | **Measure first:** learners on training.digitalbricks.io today; Gemini vs Groq STT on one French + one English screencast (word error on ten sentences each, on-screen text yes/no, cost); the Object Storage project and a public bucket; Drive API access to Meet Recordings from the Mac; Web Push from this backend (none today?); `nodegx deploy` + manifest + service worker on a phone | — | 🟡 #4 and #5 measured (§1a); #1, #2, #3 and #6 owed by Richard |
| SRK-001 | **Core:** six-digit email code sign-in in `nodegx-backend`, beside magic links (R5) | 000 | 🟡 **backend ✅ s1**: `POST /auth/email-code` and `POST /auth/email-code/verify`, the session as JSON in `/oauth/exchange`'s shape, the magic link's identity (one account for a link and a code), at most 5 wrong guesses per code, newest code only, 10 tries per address per 15 min; the `emailCode` template; `tests/srk-001-email-code.test.ts` 14/14, two mutants caught. **Owed:** the client side (a node, both auth adapters, the code export), carried in SRK-005; a switch on the admin Sign-in page and in the MCP auth tool (today it is turned on by `PUT /admin/auth {emailCode:{enabled:true}}`) |
| SRK-002 | **Core:** `package-deploy.js` secret-scan false positive | 000 | ✅ s1: already fixed by P109 ISL-042 (`ac78efb4b`), confirmed on `dist/cli.js`; the hosting README is corrected |
| SRK-003 | The schema, the policy, the staff key, the privacy page (R3 wording) | 000 | ⬜ |
| SRK-004 | Learner app: the thread held to LOOK.md 1–13, the conversations drawer, the summary block + reset with runs, the welcome popup, themes, the reply bar wording | 003 | ⬜ |
| SRK-005 | Learner app: code sign-in, the invite link, PWA (manifest, service worker, install), push "Rick replied" (brainstorm #12) | 001, 004 | ⬜ |
| SRK-006 | Teacher app: inbox, learner page (notes, objectives, sessions), the conversation with coach notes **unmistakably separate from the reply bar**, add learner, share link, quick replies, next-session highlight | 003, a sketch Richard says yes to | ⬜ |
| SRK-007 | Claude mode: one cloud function, Opus 5.5, dictation or draft in → a marked message out, aliased per R3 | 006 | ⬜ |
| SRK-008 | Studio: ingest, preamble, code words | 000 | ⬜ |
| SRK-009 | Studio: thread, cut, preview, publish, verify, clean; append to a conversation | 003, 008 | ⬜ |
| SRK-010 | Studio: the dubbing switch, Richard's voice replaced, French or English (R11) | 009 | ⬜ |
| SRK-011 | Studio: watch-drive, review in two modes, "off the record", the linked "before next time" conversation | 009 | ⬜ |
| SRK-012 | Sessions: prediction vs happened + advice; objectives; the optional check-in reminder; the package count | 006 | ⬜ |
| SRK-013 | Hosting: replace DBT on training.digitalbricks.io (learners told, data kept, backup kept), the clips bucket, Caddy, `/mcp` | 000, 002, 005 | ⬜ |
| SRK-014 | Forward to a colleague: a blank, non-interactive copy of Rick's messages (brainstorm #10) | 004 | ⬜ |
| SRK-015 | **Gate 5:** one real learner, one real screencast, one real session; their words in PLAYTEST.md | all | ⬜ |

Order: 000 → 001/002/003 in parallel → 004 + 008 in parallel → 009 → 005/006 → 007/010/011/012 → 013 → 014 → 015.

## 5. What this phase is not

- Not a SaaS. One teacher, his learners. No sign-up page.
- Not a course. No concepts table, no learning path, no programme, no catalogue. Session by session, as far as the next
  session.
- Not a page. Anything that needs a new surface to understand is out. *"The same UI as every other chat app they use
  with some twists."*
- No automated messages to learners. The system reminds Rick; Rick writes.
- No model in the cloud except Claude mode's one function. Everything else runs in the studio on Richard's Mac.

## 6. Dependencies on other phases

- **P110** (PWA): this template ships its own manifest/service worker/push; the findings go to P110's board.
- **P116/P118** (the npm-packages path, the five gates): same procedure; the canon written there applies here.
- **P78 TPL-010-MCP** (the coach key pattern) and the DBT template's sprint 55: reused, not rebuilt.
- **LX-elearning `tools/dub`**: ported, stage by stage, into the studio; the original stays where it is.
