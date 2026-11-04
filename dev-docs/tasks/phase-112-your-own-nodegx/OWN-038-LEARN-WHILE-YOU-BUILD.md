# OWN-038: Learn while you build (a practice round, your own way of building, and a help page)

**Phase:** [112](README.md). **Opened:** 2026-11-04 by Richard. **Status:** 🟡 s2: **AC1–AC6 ✅** (2026-11-04). The probes ran on both harnesses on 0.2.10 from npm ([own-038/RESULTS.md](own-038/RESULTS.md)). Two kit fixes are committed for the next cut: R14's game rule `943328f1d` and the stuck person's help pointer `ac9303f4a`. **AC7 (real beginners) is next.**

> "What if the npm package and kit comes with a sort of 'tutorial mode' that offers the user to first engage in a
> Claude discussion to learn our lessons about how to best construct a project and communicate with Claude, guide
> them step by step through the process of building a simple test game or app, develop collaboratively a sort of
> 'cheat sheet' they can save to Claude skills and pull out whenever they want to do their own real app or game?
> Meet the user with the eLearning where they're actually doing the work." (Richard, 2026-11-04)

**Depends on:** [OWN-036](OWN-036-THE-FIRST-PROJECT-KIT.md) (the two guides, its sealed lab, the briefs);
[OWN-037](OWN-037-THE-FIRST-PROJECT-IN-VIBE-AND-CLINE.md) (the Cline round runner and its results).

## Why

OWN-036 taught the **agent** what our builds learned. Nothing teaches the **person**, and a disappointing first
build mostly fails on the person's side:

- a vague first prompt;
- "just do it" when a question wasn't understood;
- feedback like "it's not quite right";
- the security paragraph skimmed.

Claude could help with every one of these, but the person doesn't know what to ask. The fix should happen where the
work happens, in the chat they're already building in, and not on a separate learning site
([P119](../phase-119-learn-with-simple-rick/README.md) learned the same thing: a new surface is the wrong surface).

## 🔴 The constraint stays: knowledge, never obligation

Everything here is **offered** and never required. Saying no takes one reply, and the build starts straight away.
[P130](../phase-130-platform/RESULTS.md) measured what obligation costs on Opus. A person made to sit a tutorial
before their real project pays the same cost.

## Rulings (Richard, 2026-11-04)

- **R1. Offered at the start, and offered again when it would help.** The first-run offer is one line. If Claude
  later sees the person having trouble wording their prompts, it gently offers the practice round again as an option.
- **R2. The saved sheet is about the person, not about NodeGX.** It records how they like to work: what they care
  about, how they like questions asked, what "done" means to them, their checks before going live. NodeGX facts stay
  in the kit's skills, which improve with each npm release.
- **R3. Never promise "no holes".** Teach the questions that bring out evidence (where the data is stored, who can
  read it, what happens if someone calls this URL directly) and what a real answer looks like next to a vague one.
- **R4. Help is a page, and the call is one option on it.** Claude points to a help page on nodegx.io with free
  resources: learn.nodegx.io, which grew out of the AI Coding Docs beginner's guide to working with Claude, and the
  nodegx.io guides. The page also has a link to book a call with Richard. Claude never says "why don't you just call
  Richard". **One free discovery call per person.** Paid coaching follows only if the person asks for it.
- **R5. Real beginners grade it.** Richard knows a few people he can send it to.
- **R6. Claude Code and Cline now, Vibe later.** Cline matters because it's the cheaper route (DeepSeek V4.1 Flash).
  Vibe's community is more hardcore and may not want this yet.
- **R7. The pitch for the practice round:** people get very good very fast with Claude, and 20 minutes moves them up
  a level. Richard's phrase is "Super Saiyan level 2". Whether that exact line ships is for the copy pass and
  Richard. AC7 measures the 20 minutes.
- **R8. The eLearning thread (P119) is the next step** for someone who wants sustained training. Richard expects
  this to be rare: a discovery call and a couple of hours of sessions is usually enough.

## What ships

1. **The practice round:** a skill in `packages/create-nodegx/profiles/core/skills/` (name to settle; working name
   `nodegx-practice-round`). It's a tiny build of about 20 minutes (a small game; OWN-036's game was the one Richard's
   kids would play) that stops at six moments, each a short exchange and not a lecture:
   1. **the first prompt**: what to put in it, and what Claude does with a vague one;
   2. **answering Claude's questions**: what each one is for, and why "you decide" is also a fine answer;
   3. **looking and giving feedback in rounds**: say what you saw and what you wanted, one list per round;
   4. **pushing it further**: asking for the next thing, and for a part you can change yourself;
   5. **putting it online**: what actually happens on a rented server compared with Cloudflare Workers, in plain
      words: what runs where, what it costs, and what a visitor reaches;
   6. **asking about security**: the R3 questions, asked of the app they've just built.
   It ends by writing the person's sheet (2).
2. **The person's own sheet ("my way of building").** Written *with* the person at the end of the round, shown to
   them in full, and saved only after they say yes. In Claude Code it goes to the user's skills folder
   (`~/.claude/skills/`), so every later project sees it. **Where Cline reads a user-level skill is unmeasured:**
   find out in s1, before writing the step.
3. **Lines in `nodegx-first-project`** (no new obligation):
   - **Signs of trouble:** a one-line answer to a question that needed more; "just do it" straight after a question;
     the same complaint twice. When Claude sees one, it re-asks once in plain words and says why the answer
     matters. If the trouble is with wording prompts, it offers the practice round once (R1).
   - **When the person is stuck:** point them to the help page (4).
4. **The help page: `nodegx.io/help`** (in `nodegx-web`). Free resources come first, picked by situation, from the
   learn.nodegx.io pages that already exist:
   - Prompts to copy;
   - Plan before you build;
   - Building with Claude;
   - When something goes wrong;
   - Staying safe;
   - Putting your app online;
   - Plans and limits.

   Then one free discovery call, with the booking link `nodegx.io/start` already uses. Every page is also served as
   Markdown with an `llms.txt`, so Claude can read the help page and the guide pages itself.
5. **The folder note** (`AGENT_NOTE`): one line naming the practice round as an offer for a first-time person.

## Not in it

- **Mistral Vibe** (R6).
- **The P119 eLearning thread** (R8).
- **Server text** (`instructions.ts`, `guidance.ts`). The skills carry it, the same way OWN-036 did.
- **Sending anything to Richard automatically.** If someone books the call, Claude can help them write three lines
  saying where they're stuck. They read the lines and take them to the call themselves.

## Answered by Richard (2026-11-04)

- **W1 → R9.** The help page offers one free 30-minute discovery call per person and says that later calls are
  paid coaching. The booking form should also ask; that form is Richard's Google Calendar booking page.
- **W2 → R10.** The help page books through `https://calendar.app.google/dmd1P4CanKEgB9p88` for now. A booking page
  of our own on nodegx.io may come later. `/start` still uses the older `DzBHGrtFyJsS9oLJ7` link, and `/richard`
  still uses `digitalbricks.io/#contact`.
- **W3 → R11.** The skill is called `nodegx-practice-round`, and the R7 line ships as written.
- **W4 → R12.** Anna Malzy, a beginner vibe coder, is the first tester. Richard will find one or two more, or ask in
  the NodeGX community. The November mailing (`nodegx-web/drafts/2026-11-kit/email.md`) asks beginners to reply.
- **R13 (s2).** Asked: *"When should the first offer appear?"* Answer: **only when the person is new and hasn't
  said what to build yet**, as built. Someone whose first message is a brief gets their app, and hears of the round
  only if a sign of trouble shows later. The alternative, every first chat, was declined. AC4's zero stands.
- **R14 (s2).** Asked: *"Where does a game's plain-code world go: one plain page, or inside the NodeGX app?"*
  Answer: **one plain page** in its own folder that opens by itself, never opened from a NodeGX app on a second
  server. Both games he kept were one plain page. Fixed in `943328f1d` (P112-OWN037-SECONDSERVER).

## Found while building the help page

- **No guide covers securing an app for real users.** learn.nodegx.io's "Staying safe" page is about add-ons on your
  own computer. Moment 6 of the practice round has nothing to link to, so the help page carries a copyable prompt
  instead. Scoped 2026-11-04 as `~/vscode_projects/nodegx-learn/dev-tasks/securing-your-app/TASK.md`.

## Where each harness reads a person's own skill (measured s1, 2026-11-04)

Read from each harness's own installed code, the versions the labs run:

| harness | in the project folder | in the person's home |
|---|---|---|
| Claude Code | `.claude/skills/` | `~/.claude/skills/` |
| Cline 3.0.71 (`@cline/shared` storage) | `.clinerules/skills/`, `.cline/skills/`, `.claude/skills/`, `.agents/skills/` | `~/.cline/skills/` (or `$CLINE_DIR/skills`), `~/.agents/skills/` |
| Mistral Vibe 3.0.4 (`vibe/core/config/harness_files`) | `.vibe/skills/`, `.agents/skills/` | `~/.vibe/skills/` (`$VIBE_HOME`), `~/.agents/skills/` |

So every harness has a user-level folder. Cline and Vibe share `~/.agents/skills/`; Claude Code doesn't read it. The
round saves the sheet as `my-way-of-building/SKILL.md` in `~/.claude/skills/` for Claude Code and `~/.agents/skills/`
for the other two, offers both to someone who uses more than one, and falls back to `docs/my-way-of-building/` plus
one copy command only when the agent can't write outside the folder. AC5's "a fresh session in a different folder
lists it" is the proof still owed.

## Acceptance

- **AC1.** `npm create nodegx` and the Cline kit write the practice-round skill, and the folder note and
  `nodegx-first-project` name it. The package test covers it. A person's own files are never replaced.
- **AC2.** No task ids in the shipped text (OWN-036 AC2's grep). The copy passes the content-authoring checks, with
  every flag fixed or listed here as a false alarm.
- ✅ **AC3. Declining costs one reply.** A sealed arm whose scripted person says "no thanks, build me X" gets X built
  with no tutorial step and no second offer.
- ✅ **AC4. The R1 offer fires when it should, and only then.** One scripted person gives vague answers twice: Claude
  re-asks in plain words and offers the round **once**. A clear person on the same brief gets the offer **zero**
  times. The zero only counts alongside the arm where it fired. Run on Claude Code and on Cline with DeepSeek
  V4.1 Flash.
- ✅ **AC5. The round finishes, and the sheet arrives where the next project sees it.** A scripted beginner gets
  through all six moments. After their yes, the sheet is saved, and a fresh session in a *different* folder lists
  it (a skills probe, as in OWN-036 AC1). Both harnesses.
- ✅ **AC6. The help page is live and Claude sends people to it.** `nodegx.io/help` is deployed with the R4 order (free
  resources, then the one call). A stuck scripted person is pointed to the page, and Claude's reply never offers
  the call first.
- **AC7. Real beginners (R5).** Two or three people Richard sends do the practice round, then build something of
  their own. Record their time on the round, their words, and Richard's read of what they built next to what an
  equally new person built without the round. **No claim on the site until this has run.**

## Log

- **s0, 2026-11-04.** Scoped from Richard's question and his rulings on five points. Measured beforehand:
  learn.nodegx.io has 29 pages (IA: `~/vscode_projects/nodegx-learn/dev-tasks/nodegx-rewrite/IA.md`), and seven of
  them cover the six moments. `nodegx.io/start` already has "Book a discovery call" (Google Calendar).
  `nodegx.io/richard` books through `digitalbricks.io/#contact` (W2). There is no `/help` page yet. The Cline kit
  ships skills in `.claude/skills/` (OWN-037).
- **s0 (later), 2026-11-04. The help page and the mailing, drafted.**
  - **The help page.** `nodegx-web/site/help/_page.html` was built alone (a full `ops/build.py` run would rebuild
    another session's uncommitted changelog and `/start` pages). `help` was added to `SUBPAGES`, plus one line in
    `llms.txt`. The page is not in the nav yet: a nav entry only shows on the pages rebuilt after it.
  - **Checked.** Every learn.nodegx.io link returned 200. The page was screenshotted at 1280 and at 390 through an
    iframe. The copy passes `written`/`closer`/`contract`/`opener`, apart from false alarms: a card label, a heading
    in the reader's own words, and a button.
  - **Not deployed:** that waits on Richard's go.
  - **The email.** `nodegx-web/drafts/2026-11-kit/email.md` covers the guides, Cline and Vibe, Studio 0.1, editor
    0.4.1–0.4.3, the help page and the call for testers. Its header lists what must be true before it's sent.
- **s1, 2026-11-04. Built, deployed, cut (Opus 5.5).** Richard: *"Build the practice-round skill and the help-page
  pointer into the kit for Claude Code, Cline and Mistral Vibe, deploy nodegx.io/help, and prepare the 0.2.10 release
  cut for me to publish."* That brings Vibe in now, against R6's "Vibe later".
  - **The skill** (`bae12bb41`): `profiles/core/skills/nodegx-practice-round/SKILL.md`, 144 lines. The six stops as
    scoped; R7's line as written; stop 5 says only what P115 has shipped (Workers apps still being tested, storing
    data there not working yet, R6's "a free account is never billed"); stop 6 uses the help page's own message and
    never says "no holes". The call is never named (R4). `nodegx-first-project` gains the signs of trouble and the
    help pointer; both folder notes gain one line; `VIBE_SHARED_SKILLS` gains the skill.
  - 🔴 **A choice for Richard: when the first offer fires.** AC4 wants zero offers for a clear person, so the first-run
    offer can't be unconditional. The notes say: offer it when the person is new *and hasn't said what to build yet*.
    A person whose first message is an app brief gets no offer unless a sign of trouble shows later. If he wants
    every first conversation offered, it's the one line in `AGENT_NOTE` and in the Vibe note.
  - **AC1 ✅, AC2 ✅.** Package test 42/42, with a new test across all three kits; a mutant (the skill dropped from
    `VIBE_SHARED_SKILLS`) turns two red. The task-id grep is in that test. Copy: `written`/`closer`/`contract`/`opener`
    on the skill, the new guide lines and the changelog section. The changelog section is clean. False alarms on the
    skill: two noun lists read as chained clauses, "There are" and "what would" (no natural contraction), and seven
    `opener` hits on "them", which is the person throughout the guide.
  - **AC6, the page ✅.** `site/help/` and `site/llms.txt` rsynced alone (`_page.html` excluded, 404 live); live bytes
    equal local (md5); `https://nodegx.io/help/` 200; nodegx.io, digitalbricks.io and community.nodegx.io 200 after.
    nodegx-web `Help: nodegx.io/help is live`. The scripted stuck person is AC6's second half, with the probes.
  - **The cut.** create-nodegx, create-nodegx-vibe and create-nodegx-cline at 0.2.10; stamp `8a1cf1ccb67604d7`.
    `@nodegx/mcp` stays 0.2.9 (published 10-27): its commits since are P132's backend work, another lane's, as the 0.2.9
    cut also ruled. CHANGELOG.md has the 0.2.10 section; the site's changelog page is re-rendered from it after the
    publish (the local page equals the live one byte for byte, so the render adds only this section).
  - **Probes owed (AC3–AC5), on Richard's go.** Priced from OWN-036/037: Claude Code about $3 a build turn on Opus,
    Cline on DeepSeek V4.1 Flash under $1 a build. Three scripted people and one full round per harness: about $15–20
    in Claude Code, $2–3 in Cline.
- **s1 (after the publish), 2026-11-04.** Richard published 0.2.10. The gate stopped him twice: the P132 and then the
  P115 session saved their phase memory between my triage and his run (each marked `general-no`, phase status). He
  published with `KIT_HARVEST_SKIP` naming that; `--count` afterwards was 0, so nothing slipped past. Registry shasums
  equal the three tarballs (create-nodegx 6ac769a1…, -cline bc4caaf5…, -vibe 0242c0fd…), `latest` 0.2.10 on all three.
  From npm, in empty folders: each kit writes `nodegx-practice-round` and its note names it; the Vibe folder has both
  guides; the Cline entry went to the scratch HOME. The site changelog was re-rendered alone (`ops/changelog.py` +
  `build.wrap` for that folder; the diff against live was the 0.2.10 section only), rsynced, 200, md5 equal live.
  The email draft says 0.2.10 for Vibe and that the round is in the kit; it still asks beginners to reply.

- **s2, 2026-11-04. The two rulings (Opus 5.5).** R13: the first offer fires only for someone new who hasn't said
  what to build, as built. R14: a game's world is one plain page. `943328f1d` puts R14 in the game guide and both
  folder notes; package test 42/42; a mutant dropping the sentence turns two red; copy clean on
  `written`/`closer`/`contract`/`opener` after one rewrite (the first draft chained its clauses). It ships in the next
  kit cut, not 0.2.10. P112-OWN037-SECONDSERVER fixed; its behaviour is re-measured in a guided game round on that
  release.
- **s2 (the probes), 2026-11-04.** On Richard's go, both harnesses, five scripted people each, the kit from npm at
  0.2.10. Full write-up in [own-038/RESULTS.md](own-038/RESULTS.md).
  - **Claude Code** (`own-038/arm.mjs`, a HOME of its own per arm, so the sheet can't land in Richard's skills).
    AC3 ✅, AC4 ✅ (vague: once, after the first vague answer; clear: zero across a 100+-step build), AC5 ✅ (all six
    stops in order; the sheet saved on yes; a fresh session in another folder lists `my-way-of-building`, absent
    before). AC6 ❌ → fixed: a stuck person was never pointed to the page, because the pointer lived only in a guide
    read before a build (P112-OWN038-STUCKHELP, `ac9303f4a`). Re-measured on the fixed kit: the page first, no call.
  - **Cline + DeepSeek V4.1 Flash** (`own-038/turn-cline.mjs`). AC3 ✅, AC4 ✅ on count (vague's one offer came at
    turn 1, after the person had named an app: P112-OWN038-VAGUEOFFER, low, R13's call), AC6 ✅ (the page first),
    AC5 ✅ for the sheet (a fresh Cline in another folder lists it; the control lists none). Two of its stops were
    lost, probably the runner's fault: each Cline reply is a new chat, and only the sittings that opened the skill
    followed it.
  - **The API key in `.env` ran out of credit** at ≈ $14.85. Richard chose his subscription (`claude setup-token` →
    `~/.nodegx/claude-oauth-token`). Spend: Claude Code ≈ $21.40 at list price, Cline ≈ $0.80.
  - 🔴 Lab traps: `claude -p` holds its turn open while a preview it started runs (two turns sat over an hour, one
    shared on the Wi-Fi); `total_cost_usd` on `--continue` is the session's running total.
