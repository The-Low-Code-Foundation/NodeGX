# BKO-009 — A stranger builds their own backend editor

**Phase:** [127](README.md). **Depends on:** BKO-008 (the kit and the suite). **State:** s1 (2026-10-30): R2 and R3
ruled; the kit is its own package, the suite has a read half, the skill is written. Round 1: the stranger's editor
says PASS from outside (AC1); its report, cost and guesses are below (AC2). AC3 (Richard's verdict) and AC4 (the cut
and the publish) are open.

## What

1. **The skill.** A backend section in `nodegx-your-own-editor`, or a sibling skill `nodegx-your-own-backend-editor`
   if the section would double the page. Its shape is the front-end page's: the questions every backend editor
   answers, which kit export answers each one, *Done means PASS*, and *what the editors before yours got wrong*. That
   last part is seeded from P124's bugs (LENSBYNAMING, ACTSASHTTP, WRITESRECORDSJS, DOORREFUSALUNSEEN) and BKO-007's.
2. **A stranger round** in OWN-008's shape: an Opus `claude -p` in a sealed lab, from `npm create nodegx` plus the
   kit, a running backend, and a brief in a person's words. The brief is **not** "a map". It's a shape Studio
   doesn't have, so the kit is tested and not the map copied. Candidates for Richard to pick:
   - *"A door list: every table is a door, every kind of person a key; show me which keys open which doors, and
     let me cut a key."*
   - *"A day in the life: pick someone, play their day, and show what the app handed them at each step."*
   - *"A timeline of what my backend did by itself overnight, and why."*
3. **Graded** by the backend suite (BKO-008), plus a drive of the editor's page as a person would, plus Richard on
   a screen. Every question the stranger had to guess becomes a sentence in the skill or a fix in the kit
   (OWN-010's rule).

## Acceptance

1. The stranger's editor says PASS on the backend suite, run by us from outside its lab.
2. Its report and cost are written here. The questions it guessed at are each filed or fixed.
3. Richard's verdict on the screen, verbatim.
4. The skill ships in the next `create-nodegx` cut. The kit is on npm (Richard's OTP).

## Ruling

| id | question | recommendation |
|---|---|---|
| R2 (BKO-008) | Its own package, or `@nodegx/backend-map/kit`? | **Ruled 2026-10-30: its own package first** (`@nodegx/backend-kit`) |
| R3 | Which brief does the stranger get? | **Ruled 2026-10-30: "A day in the life"** (the recommendation was the door list) |

## Session log

### s1 (2026-10-30): R2 and R3 ruled; the kit's own package; the suite's read half; the skill; the club

**R2 as built.** `@nodegx/backend-kit` 0.1.0 is `phase-127-the-backend-in-the-open/kit/` (`lib/` and
`bin/backend-suite.js` moved there from the map with `git mv`). It is **not** under `packages/`: the kit imports
`@nodegx/project-contract/format.js`, which exists only in that package's published build. A workspace links
`packages/nodegx-project-contract` (TypeScript source, no `format.js`), so the kit would break in this checkout. It
also needs no lockfile entry this way (`package-lock.json` still holds a peer's 10-27 edit). Moving it under
`packages/` for noodl-mcp is the later row BKO-008 names, and needs a build like project-contract's. The map
(`@nodegx/backend-map` 0.1.6, still unpublished) depends on `@nodegx/backend-kit ^0.1.0` and drops its `./kit`
export and the `backend-suite` bin. In the checkout the map resolves the kit through
`npm install --no-save ../../phase-127-the-backend-in-the-open/kit` (a symlink in its `node_modules`); the kit has
its own `node_modules` (`npm install` there; delete the lockfile it writes).

**R3 needed a read half.** The backend suite graded only writes, and a day in the life mostly shows. So
`lib/handed.mjs` (`gradeHanded`): the adapter's optional `handed(person)` returns the steps the editor shows, each
`{ fn, args, rows }` (run as them on the MCP door) or `{ table, rows }` (read directly, row by row through
`/admin/permissions/check` with the row, which answers `recordAllowed` for its access list). The suite does each step
again as that person and compares rows by id, both ways. A function that changes data is never run (`runnable`); a
table a path rule narrows can't be checked row by row: both are counted as not graded and said in the PASS line.
`runSuite` grades it first, on the backend as it starts, then the edits. `[]` edits grades reads alone.

**The club.** `day/lab.mjs`: a members-area copy and a backend of its own, filled through the app's own doors —
`claimAssociation` with the setup token (Ada, moderator), `requestAccess` for Ben, Chloé and Dev, Ada's own key
running `decideMembership` for Ben and Chloé, and the notices and meetings with the access list the Post page writes.
The training app's `tools/deploy-functions.mjs` deploys the functions (it reads the `__cloud__` folder beside it, so
it's copied in and out). Members-area, not the training app: the kit grew up on the training app.

**The skill.** `packages/create-nodegx/profiles/core/skills/nodegx-your-own-backend-editor/SKILL.md` (a sibling: the
front-end page is 413 lines). The agent notes name it. The "got wrong" section is seeded from LENSBYNAMING,
ACTSASHTTP (as "the key's functions are the person's"), WRITESRECORDSJS (as "never run a writer"), DOORREFUSALUNSEEN,
PROFILEWRITE, BACKENDONLY, SCHEDULEAUTH and BKO-007/008's lessons. Run through the content-authoring checks
(`written`, `closer`, `contract`, `opener`, `rollercoaster`) and fixed where they caught a real fault.

**Measured:**
- `test/handed.test.mjs` (in the map's `npm test`): a hand-written adapter that knows the club's rules says PASS,
  16 steps for 3 people (one per set of groups). The liar control (Dev, still waiting, shown the notices) says FAIL
  naming Dev, step 3 and Announcement. The naming control (`myNotifySetting` shown handing back the person's own
  directory row) says FAIL for Ada and Chloé, never Dev. People named by email; an unknown one is said. No working
  key left. The command exits 0 and 1. The copy's folder is byte-identical. 9/9. Mutant (`extra` never said): 3 red.
- My own first probe made the naming mistake: `myNotifySetting` reads your Member row and answers a yes/no. The suite
  said so. That is LENSBYNAMING at the size of one function, and it's a line in the skill.
- `backend-suite.test.mjs` 15/15 after the move (the map's adapter, the reference, both controls, the command).
- The map's whole `npm test` after the move: 226 ok, 1 FAIL: "members: the backend's rules are back as they started,
  after four runs". Every run in it said "both places put back"; re-run alone, 15/15. Seen once, unexplained. The
  check now names each key that moved, so a repeat says what it was.
- The kit packed (21 files), installed in `/private/tmp/bko009/install` from the tarball with its dependency from the
  registry: `backend-suite` from that `.bin` on a fresh club, PASS exit 0, the liar FAIL exit 1.
- `create-nodegx` `npm test`: 33/35. The two red (`the pinned server is the version the checkout would publish`:
  0.2.9 vs 0.2.8; `the allowed tools are exactly what the bootstrap server advertises`) don't touch the skills and
  were red before this change. Two skill tests were updated (the "Wrote" line lists both skills; a person's own
  editor skill is kept and only the backend one is written), and one test was added for the backend skill.

**Seen, not filed:** `makeViews().screen` keeps a training-app branch (it runs `course` first when a function needs
`conceptId`, `findNow`). On an app without those names it does nothing; no harm measured. `makeViews().recordReach`
reads `allowed` and not `recordAllowed`, so a row whose access list shuts someone out would read as reachable;
unmeasured on an app whose rule and row list disagree.


### s1, round 1 (2026-10-30, 22:43–22:55): one Opus stranger, "A day in the life"

**The lab** (`day/round.mjs`, kept in `day/round-1/`): `npm create nodegx@0.2.8`, plus the skill and the agent notes'
line (what the next cut ships), the Riverside club (`day/lab.mjs`) with its backend running outside the lab, and the
kit as `nodegx-backend-kit-0.1.0.tgz` (not on npm yet; the prompt said so in one sentence). The prompt is
`round-1/prompt.txt`: the person's words and R3's brief verbatim. Claude Code 2.1.312 (the PATH one is older),
`claude-opus-5-5`.

**What it built**, in 11.7 minutes for **$4.24** (88 turns): `day-in-the-life/`, a small server holding the key and a
page (`round-1/editor/`, 953 lines). Pick Dev, Chloé, Ben or Ada and it plays their day through the app's own pages:
the front page, sign in, where signing in lands, then each button in the band they can see, opening the first item of
each list. It plays the pages' own logic (it reads the graphs and runs their scripts), runs `myStanding` and
`myNotifySetting` as them through the kit, and checks each list row by row with the rule check. Each step says why the
page asked and what came back: rows, an answer with no row, or a refusal. Each step also lists the buttons that would
change something, whether the backend would let them, and whether the button is on their screen. It never presses
them. Its report is `round-1/REPORT.md`.

**Graded from outside** (`day/grade.mjs`, `round-1/grade.json`):
- AC1: **PASS — A day in the life on Members' Area, 0 edits; 40 steps shown to 3 people (5786 ms)**, on a FRESH
  club it never saw (its adapter calls the same `playDay` its server calls). Its own broken adapter, from outside:
  FAIL, Dev shown 2 notices.
- It left the app and the backend as the person asked: `riverside/`'s 105 files hash as they did at the start; the
  club's rules, triggers, people, groups and every row id are as they were (snapshot `club-before.json`).
- The page, driven in headless Chrome on a fresh club: every person's day plays in 0.6 s (Ada's 7 s). The counts are
  the club's rules: Dev only the association, the members the 3 notices and 2 meetings and never a Member row, Ada
  everything. One console error: a 404 (no favicon). Pictures: `round-1/bko-009-dev.png`, `bko-009-chloe.png`.

**Its guesses (OWN-010's rule), each one placed:**

| # | the guess | now |
|---|---|---|
| 14 | a page that opens one row by its id has no step shape (a table step means "every row they may read") | **fixed**: `{ table, ids, rows }`; the honest adapter in `handed.test.mjs` uses it (19 steps) |
| 15 | a list whose filter leaves rows out has no step shape | **open**: the skill says to leave it out and say so |
| 16 | `rowsIn` isn't exported | **fixed**: exported |
| 17 | "a backend of its own": the kit makes none, so it ran the read half on the live backend | **skill**: an empty script changes no rule, trigger or file and may run live; edits need a copy and its own backend, which the person's agent makes |
| 17b | the suite "rewrites the rules files at the end even when nothing changed" | **fixed**: put back writes a file only when it moved |
| — | 27 stopped key records it couldn't erase | **skill**: a deleted key stops working and the backend keeps its record |
| 10 | a person's key can't read a table, so lists are checked by the rule check | **skill**: says so, and how |
| 18 | CLAUDE.md asks for NodeGX apps; the tool isn't one | **skill**: the tool is a program of your own |
| 19 | the guide asks for a public GitHub issue | **skill**: if the person agrees |
| 1–6 | what a day is (the route, the first item of each list, a wide window, names from rows, nothing pressed) | the brief's to decide, not the kit's: for Richard |
| 7–9, 11–13 | how a page runs (once per moment, a filtered list's first load, "today", the 200-row cap, rows inside a list, buttons found by label) | it re-implemented the page engine. No kit export plays a page as a person; that is a candidate row, not filed |

After the fixes: `handed.test.mjs` 9/9, `backend-suite.test.mjs` 15/15, create-nodegx 33/35 (the same two red).

**AC3 waits on Richard's verdict on the screen. AC4 waits on the next create-nodegx cut and the kit's publish.**
