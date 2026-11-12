# OWN-023 round 2 — the gala: same game, different insides

**Opened 2026-10-21** (Opus 5.5) from Richard's words, after the music went live at nodegx.io/gala/. **Status: 🟡 BUILT 2026-10-21 (§8): A+ $7.73/51 min, B $17.38/31 min (B wrapped the old game instead of rebuilding
it: VOID, §9). B2 converted it for real, $34.90/70 min, 54 components / 762 nodes (§9.4). Next: H1–H3 on A+ vs B2. Next: H1–H3 with Richard as the parent (B first needs his household key in `.env` + "done" to its agent).** The game's own phase is P122 (its folder is private, so this file names
no player).

## 0. What Richard asked

> Both versions will likely look the same … I'm not worried about the play or look experience. What I'm wondering about
> is the underlying architecture. I'm the first to admit that NodeGX does nothing to 'improve' the visible output of
> Claude, it's what it's built on top of that you don't see that counts. That part I want to judge … the ability to go
> into the editor and change a dance move name or number of starting points etc without having to ask Claude to do it …
> a 'settings' page where they can make fundamental changes … nodegx permits changing the actual underlying project JSON
> permanently so you get your own copy of the app and not just the base copy with new config in the front end that gets
> wiped when you clear the cache. It's also code that's guaranteed safe for kids …

And first: *"look at how far we got with the custom three.js editor we built using nodegx concepts, to see if this can
be a first test of that."*

## 1. The stance does not change

Round 1's null hypothesis holds: **Claude Code alone is enough for this person.** Each row below says what would count
against it. A claim that a well-written prompt could equally deliver doesn't count. The control is the same as round 1:
an arm with a good harness and no framework.

Richard's own sentence names the strongest rival: *"could pull things like starting points from an initial baked in JSON
settings file as I'm sure many apps do"*. That is arm A+. The rows must hold against it, not just against the
bare game.

## 2. The three arms

| arm | what it is | built by |
|---|---|---|
| **A** | the game as it is: plain JavaScript and three.js, data in `src/data.js`, the save in the browser | P122 s1–s3 (a session with memory, not a stranger: noted as a bias in A's favour) |
| **A+** | A, plus a settings page for grown-ups written by a fresh Claude Code agent with a harness file written by an outside agent (round 1's §4.2 recipe). It may use a JSON file, a small local server, export/import, anything | a stranger, harness only |
| **B** | the same game rebuilt in NodeGX from the public kit (`npm create nodegx`), with its own settings page built from the kit's editor skill (OWN-007) | a stranger, kit only (Richard, 2026-10-21) |

All three share the game's rules: the pure `engine.js` (and its tests) goes in as one package, as P122's October plan
said. What gets compared is everything around the rules: the screens, the data, the save, the editor. Recommended in §6.

## 3. Step 0 — can NodeGX Scene be the first test? (measured from its files, 2026-10-21)

NodeGX Scene (`dev-docs/parked/three-in-nodes/editor/`) opens a real project folder. It edits the 3D scene's nodes
(position, look, name, behaviour) and saves into the project's files. Each file is validated, and a file is written only
if it hasn't changed since it was read. Richard ran Coin Run in it: "worked really well, no notes".

What the gala would need that it doesn't have:
- **A screen for rows of data.** The moves, costumes, prices and the starting stars are rows. Today Scene shows a For Each
  as one template, not its rows. **This is exactly the settings page Richard describes, so building it is the first task
  of arm B**, either in Scene or as the kit-built settings page.
- **Sound.** No Scene sentence plays one, and game-kit is not on npm. The gala's music would stay in the engine package.
- **Use without a terminal.** Every editor so far runs from `npm start` on the owner's machine. A parent on the
  children's tablet couldn't open one.

So yes, it can be the first test, once the rows screen exists. The gala's 3D (procedural blocky dancers, no models) needs
nothing Scene lacks.

## 4. The rows: what a person can see for themselves

Each row has a person, a thing to do, what's measured, and what would refute the claim.

| # | the person, the thing | measured, in every arm | refutes NodeGX's claim if… |
|---|---|---|---|
| **H1** | A parent, no Claude: rename "Plié" to "Plié royal", start the school with 50 ⭐ not 30, make the fairy costume cheaper | can they; minutes; files or rows touched; do the engine's tests still pass afterwards | A+'s settings page does all three as easily |
| **H2** | The same parent, later: clear the browser, open on another device, and install the next official version (round 3) | which of their changes survive each, and whether the update merges with them or overwrites them | A+'s changes survive all three as well |
| **H3** | A child with the settings page tries to break the game, put a rude word on the stage, and make it do something it never did | what stops each, in each arm, tried by an outside agent told to misbehave | A+ stops them as well |
| **H4** | Every bug the play-tests find, in every arm | the class of each: could this architecture have produced it at all? Today's furniture bug (the list changed, the picture didn't) is the first entry for A | B's bugs come in the same classes, as often |
| **H5** | The next round of changes (round 3's list), each arm by a fresh agent | time, cost, new bugs | B costs more and gains nothing in H4 |
| **H6** | Richard, and the girls, play each arm without being told which | "same game?" — a smoke check only, not a judge (Richard: looks aren't the question) | (none: this is only a check that nothing regressed) |

H3 carries the "safe for kids" idea. In NodeGX, safety would come from the editor only being able to write known nodes and
values, every write passing the validator, and the honesty number showing how much is unchecked code. None of that is
measured yet (round 1 never measured the honesty number). H3 is where it would show, or not.

## 5. What already exists from today

- Arm A is live at **nodegx.io/gala/**, labelled on the homepage as not a NodeGX app (section `#gala`).
- The first H4 entries, from Richard's five points on 2026-10-21 (P122 LOOK.md):
  1. Furniture placed but not drawn until the next pick: **the list and the picture out of step**. Fixed by redrawing on
     placement. A drive check now counts drawn pieces against placed ones.
  2. A try-out never slipped: **a design rule, not a defect** (try-outs and the general rehearsal never rolled the dice).
     Changed: a try-out now rolls its own dice, and steps above a class's level fail far more often.
  3–5. The plan popped out, the step-by-step try-out, and dances made of named blocks chained together: features.
- The blocks-and-chain dance (point 5) is Richard's "components" idea inside the game. It is also an H1 target: can a
  parent add a block of steps without Claude?

## 6. Decisions for Richard

1. **Do all three arms share the game's rules as one package?** Recommended: yes. Then the comparison is about the
   architecture around the rules, which is the part Richard wants judged, and B isn't sunk by rebuilding the rules in
   nodes (Olive's Island's 17 engine copies; Tchac-Boum).
2. **Is arm A+ in?** Recommended: yes. Without it, a win for B could be the prompt, not the framework (round 1's §2).
3. **Who plays the parent in H1/H2:** Richard himself (recommended: it's his question, and round 1 never had a person take
   over), with an outside agent as a second, written record.

### 6.1 Richard's rulings (2026-10-21, asked in the words above)

1. Shared engine package for all arms: **"Yep"**.
2. Arm A+ in: **"Yep"**.
3. Richard plays the parent in H1/H2: **"Yep"**.

4. The paragraph both builders get, as Richard's words (`round2/person.txt`): **"Yes, as written"**.
5. Cap per build: **$100 each** (API-equivalent, the same for both, as round 1's rule; round 1 was $60).
6. When: **"Start now"**: harness writer, then A+, then B, one at a time, each after a quiet-machine check.

The kit on the day: **0.2.4 from the registry** (`create-nodegx`, `@nodegx/mcp`). Materials: `round2/` (`person.txt`,
`brief-Aplus.txt`, `brief-B.txt`, `harness-brief.md`, `make-seeds.mjs`); `round-arm.mjs` gained `--app` and `--seed`.

## 7. Order of work, once ruled

1. Arm B's stranger builds the game from the kit with the engine package (as round 1's §4.1: one sitting, capped, logged).
2. Arm A+'s stranger adds the settings page to A.
3. Arm B's settings page, kit-built (OWN-007 skill), or the rows screen in NodeGX Scene, whichever B's stranger reaches for.
4. H1–H3 with Richard; H4 kept as a running ledger from the first build; H5 when round 3's list arrives.
5. The write-up by an outside agent, as round 1's was.

## 8. The builds (2026-10-21, Opus 5.5 in Claude Code 2.1.301, kit 0.2.4; runs in the s3 scratchpad `own023-r2/`)

| | A+ (harness + settings) | B (NodeGX kit) |
|---|---|---|
| harness | written by an outside agent: 8,607 bytes, $0.52, 2 min (`round2/harness/CLAUDE.md`, unedited) | the kit's own files |
| cost · time · sittings · continues | **$7.73 · 51 min · 1 · 0** | **$17.38 · 31 min · 1 · 0** |
| turns | 115 | 208 |
| rules files kept byte for byte | yes (4/4) | yes (`gala-rules/` used as given) |
| tests it wrote, passing (re-run by us) | 39 rule ✅ (re-run) · 21 browser (its claim) | 31 (its claim) |
| what NodeGX holds | n/a | the grown-ups' screens, the backend, the server checks: **13 components, 152 nodes, 9 of them JavaScript Function nodes (~16,000 chars)**. **The game itself is the reference's JavaScript copied into `game/` and loaded inside a NodeGX page, not rebuilt as nodes** (its own words). |
| where a grown-up's changes live | a JSON file **outside the game folder** (`~/.gala-de-danse/settings.json`) via a small local server, browser copy as fallback, save/load file for another computer | rows in the app's **backend database**, as changes over the defaults (a new version keeps them; a removed row is skipped) |
| who may change them | the page decides: hold ⚙️ 2 s, then answer a sum | **the server decides**: an account given the household key; wrong guesses slowed; the database refuses direct writes; one rule book of fields and ranges, applied on the server and again in the game |
| rude words / code | one filter (FR/EN, l33t, spaced), links and markup refused | letters/digits/simple punctuation only, plus a FR/EN list incl. l33t and spaced |
| another computer | export/import a file | the backend on this machine, others via `--host 0.0.0.0` (untested) |
| a step left for the person | none | **write a household key in `.env` and tell the agent "done"** (until then the grown-ups' page says it isn't set up) |
| path audit | 14 outside the root: 10 its own scratch in `/private/tmp/galaprobe`, 4 false (URLs, a French word); no other arm, no repo | 32: its own scratch in `/private/tmp/gala-*`, URLs, Claude Code's own tool-output file; **never `galaprobe`**; no repo |
| boots in a browser, 0 errors | ✅ (s3, headless) | ✅ (s3, headless) |

**Read before H1–H3 (not a verdict):**
- **The brief asked B to rebuild the game in NodeGX, and B wrapped the old code instead.** The kit allowed it. That's a
  finding for the "restraint" claim: nothing stopped an agent putting an existing JavaScript app inside one page.
- **Neither arm changes the app's own files.** Both lay the grown-up's changes over the defaults: A+ in a file beside
  the game, B in the backend. Richard's "own copy in the project JSON" is in neither.
- **The real architectural difference so far is who enforces the gate:** A+'s page vs B's server. That's an H3 row.
- **B's backend:** its first one "didn't enforce its own permission rules, so I replaced it" (B's words). That's a kit
  defect for the ledger (C3: a cost in B's row), probably DEVOPENREAD's family. To file.

### 8.1 B's last step, done by the person (2026-10-21, Richard: "Just some random password")

At Richard's request s3 wrote a random household key into B's `.env` (Richard never opened the file: "Can't find
it"), then replied as the person in B's own session, with the build's seal:
- reply 1, "done": 3 turns, **$4.00**. The resumed session's NodeGX server was **unbound** (seven tools); the agent read
  that as a dropped connection and asked the person to reconnect. Filed **P112-OWN023-RESUMEUNBOUND**. (The lab's
  helper overwrote this reply's transcript with the next one; these figures were read before that.)
- reply 2, "I reconnected it. done": 6 turns, **$0.66**. It reopened the project, moved the key with `set_function_secret`
  (never reading it), and checked that a wrong key is refused.
- **B's total so far: $22.03**, against A+'s $7.73. A+ needed no step from the person.

## 9. Round 2b: B wrapped, so B2 converts (2026-10-21, Opus 5.5)

Richard on §8: *"The idea was to rebuild the app for B in NodeGX, not just load the whole original app into a NodeGX
shell. That obviously doesn't prove anything … There's no point at all in the experiment if we tell people 'this was
built with NodeGX but you can basically only modify the parents page' it flies against everything we state."*

**B is void as the NodeGX arm.** Its own brief already said "Rebuild it in this folder as a NodeGX app"; it had the code
and wrapped it. A sentence in a brief did not hold.

### 9.1 Rulings (asked in plain words, 2026-10-21)

1. **What B2 starts from: the full code, a strict rule, and a log of the conversion.** Richard: *"Full code + strict
   rule + some sort of log that shows the process the AI takes and how it conceptualises and executes a conversion
   between code and NodeGX. I think people who have existing coded apps and are tempted to use NodeGX would be interested
   in seeing how a 'rebuild' from their codebase actually works, how easy and precise it is"*. (Recommended was
   screenshots only; he chose the code, so the question is now also "what is converting a coded app like".)
2. **The control: A+ as it is.** It had the same folder and the same paragraph, no NodeGX: the "stay in code"
   counterpart of "convert to NodeGX". (Asked twice: the first wording assumed screenshots, and was re-asked.)
3. **Cap: $100**, as round 2.

### 9.2 What B2 got

- The **same seed as B and A+**, byte for byte (round 2's `seeds/B` copied; its `reference/src` = P122's `game/src`
  today, `diff -rq` empty). Kit 0.2.4 (still the registry's latest).
- `round2/brief-B2.txt`: B's brief plus what "rebuilt in NodeGX" means (every screen and the game's state as nodes;
  code only in Function/Script nodes and only for what no node can do, 3D and music expected; no loading the old page
  or `main/ui/state/i18n.js`; no code building page elements outside the 3D canvas; copying only into Function/Script
  nodes) and **`CONVERSION.md`**: the plan before, one entry per part converted as it goes, the summary after.
- Fenced off from round 2's whole folder (B's wrapped build included): `run-round2.mjs` gained arm `B2` and `DENY=`.

### 9.3 The outside check, written before B2's result

`audit-conversion.mjs <work folder>`: the graph (components, nodes by kind), code in nodes and in files, the old screen
modules present or loaded, code that builds or edits page elements (line by line, for a person to read), and the share
of each `reference/src` file copied verbatim. **Run on round 2's B** (the known-firing control):

| | B (round 2) |
|---|---|
| graph | 13 components, 152 nodes (71 visual, 61 logic, 9 code, 11 component instances) |
| code in nodes / in files | 14,469 chars / **229,649 chars** (15 files) |
| old screen modules | all four present, loaded from `Pages/Home` via `boot.js` |
| page-element code | 112 lines (97 in `ui.js`) |
| copied verbatim | `ui.js` 611/611, `world.js` 345/346, `play.js` 224/226, `i18n.js` 246/248, `main.js` 64/64 |

B2's run: copied to `runs-r2b/B2/` (transcript `sittings/1.jsonl`, the app in `work/gala/`, the check in `conversion-audit.json`).

### 9.4 B2's result (2026-10-21 15:48, read by the lab, not by B2)

**$34.90 · 70 min · 282 turns · 1 sitting · 0 continues · no step left for the person.** Fence held (0 references to
round 2's folders in its transcript; its path leaks are its own `/private/tmp/galanotes` scratch and Claude Code's own
tool-result files).

| | B (round 2) | **B2 (round 2b)** | A+ (control) |
|---|---|---|---|
| components · nodes | 13 · 152 | **54 · 762** (138 Text, 137 Group, 74 Send Event, 51 For Each, 39 Store Subscribe, 33 Function) | n/a |
| old screen modules present / loaded | all four / yes | **none / none** | n/a |
| page-element code | 112 lines | **5 lines, all in the 3D stage** (mounting its canvas) | n/a |
| copied verbatim: ui.js · i18n.js · main.js · state.js | 100 · 99 · 100 · 97 % | **10 · 0 · 30 · 44 %** | n/a |
| hand-written code | ~2,000 lines (the old modules) | **1,257 lines** (view rows 585, actions/dispatch/save/text 462, 3D glue 189, settings 21) | the game's own, + 577 for settings |
| generated code | none | 2,112 lines: gala-rules (module syntax only, checked by diff), the 3D/music modules as factories, the checker | none |
| words | `i18n.js` | **389 rows in a Static Data node** (+66 for the grown-ups) | `i18n.js` |
| who may change settings | household key in `.env` (a step for the person) | **the first account made on the settings page**; server-checked role, then nobody else | a long press + a sum, in the page |
| boots, plays, 0 errors | ✅ | ✅ (lab drive, headless: letter → tabs → rehearsal → results → ⚙︎ page; 0 console errors) | ✅ |

**What the conversion did to the code:** the old screen layer was 1,186 lines (`ui/main/state/i18n.js`). It became
762 nodes **plus** 1,257 lines of hand-written code. Code did not shrink: it was split. What a screen *shows* and how
presses are *wired* became nodes (every tab, row, button, toast, the stores, the dispatcher: "the graph shows which
button sends what"); *which* rows and *what a press does to the plan* stayed code, as pure functions with no page access.

**Lost in the conversion (B2's own list, §"What was lost"):** drag-to-reorder of programme cards (▲▼ remain), the
ruler, the enlarged stage plan, bold words in sentences, scrolling the try-out to the step being danced, the narrow
bottom-sheet layout, the round-1 save import. **Seen by the lab, not in its list:** the results tiles wrap names
mid-word ("Les luciole / s", "Lum / ière"). A+ lost nothing. So "the two front ends are identical" no longer holds.

**Kit findings:** dev-open again (3rd NodeGX arm of 3; recurrence added to P112-OWN023-DEVOPENREAD). Candidate, NOT
reproduced by the lab: a For Each's re-published row *value* outputs hold the last row that changed one, not the row
pressed (B2 §10; it packed values into the click instead). Friction it logged: `uses` as a comma string, an Expression
counted as code, "Cyclic loop detected" on a store that reads itself, a percentage string refused by a width, a big
component resent whole to change it. Every refusal named the fix ("I never had a write silently accepted that then
didn't work").

**Not yet measured:** H1–H3 on B2 (Richard as the parent; an outside agent as the child).

### 9.5 Published (2026-10-21 ~18:40 CEST), at Richard's request

**nodegx.io/from-code/** ("From code to NodeGX"), with the agent's log rendered unedited at **/from-code/log/**, both
games playable (**/from-code/claude/** = A+, **/from-code/nodegx/** = B2 via `nodegx-deploy --base-url /from-code/nodegx/`)
and both projects as downloads (`/from-code/downloads/gala-claude-only.zip` 5.6 MB, `gala-nodegx.zip` 5.3 MB; `.mcp.json`,
`opencode.json`, `.vibe/` left out; scanned for keys and machine paths). Copy written to the content-authoring skill
and through its offline checks; every number from §8/§9.4. Pushed by rsync of `site/from-code/` ONLY (the homepage,
nav and other pages untouched; the peer's homepage draft, which links here, waits on DIRECTION D3).
- The public B2 has no backend: its build points at `http://127.0.0.1:8585` (filed **P112-OWN023-DEPLOYLOOPBACK**),
  so it plays with the built-in tables and its grown-ups' page can't sign in; the page says so. A shared public backend
  was refused on purpose: the first stranger to sign up would become every visitor's grown-up.
- One sentence assumes DIRECTION D5 is ruled yes: "For this game, the next test is that later … We'll publish the
  time, the cost and what broke."
- Lab drives of both live copies: 0 errors (A+); 1 expected `Failed to fetch` (B2, no backend). Shots in
  `runs-r2b/lab-drive/`.
