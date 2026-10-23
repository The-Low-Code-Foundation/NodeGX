# OWN-026 — what each stop-and-check learned

One entry per graded round that taught something, newest last. Each says what the model did, why (in its own words
where the trace has them), and what went into a FIX file. Measurements, not impressions.

## #1 — t1-nodegx-1 (re-run), kit 0.2.5 registry, 16/22 (2026-10-22)

- **The filter it couldn't write.** Iterations ~12–24 (13:08–13:12 UTC, about 12 of 96 model turns): `get_node_type
  DbCollection2 detail:full ports:[querySettings…]` → notFound; `list_examples "filter the query on the server owner
  isolation"` → only a client-side example; a shell hunt for the server's source outside its folder (refused by the
  fence). Its words: *"No filter shape documented. I'll discover it empirically at runtime."* Shipped: whole
  collections to the page, `rows.filter(r => r.ownerId === owner)` in two Function nodes. → FIX-01 B.
- **The open backend it saw and couldn't close.** It read `get_backend_permissions` (`devOpen: true, enforced: false`),
  wrote *"That's concerning"*, looked for a tool to enforce, found none, reasoned *"when deployed with enforcement on,
  the ACLs also hold"*, planned `set_collection_permissions` and never called it. → FIX-01 A.
- **State on the page, written back whole.** Progress lived in a page object and an Update Record wrote all of it after
  each answer: two tabs overwrite each other (T5), and a double press reached the next question (T3). The plain-code arms
  kept it on the server. → FIX-01 C.
- **Its own JavaScript.** 17 Function nodes, 346 lines, held the game's rules; the mastery window used `.slice(0, 10)`
  (keeps the oldest ten). Not the kit's: noted so a later round can see whether script share falls as the kit teaches more.
- **What it did well with the kit:** 3 `render_report` + 13 `drive_page` runs to check its own work (after the lab's
  Chrome fix), a working PIN gate, sign-in and restart. 12 of its 186 tool calls were refused (mostly
  `create_component` validation-failed, one unknown `update_component` argument); not yet read for a pattern.

## #2 — t1-nodegx-2, kit FIX-01 (`ddd876378`), 17/22 (2026-10-22)

- **FIX-01 A and B arrived and worked.** Backend enforced from its first start; T7/T8 pass. DeepSeek found
  `cloud-query-own-rows` and wrote `visualFilter` on 2 of 4 Query Records. Script fell to 14 Function nodes / 114 lines.
- **FIX-01 C never arrived.** Its lesson sits at character 40,311 of a 51,834-character `get_project_info`; Cline
  keeps ~8,000. 26 nodegx results this round were over 8,000 characters. The kit's long answers are written for a
  reader that sees all of them; DeepSeek in Cline sees each one's first and last few thousand. → FIX-02 B.
- **The record that reads memory.** The game page binds a Record to the URL's child id; `setModelID` takes the
  in-memory copy (empty after a reload) and fires `fetched` anyway; a launch from there overwrites real progress
  (T1, T2). → FIX-02 A.
- **One slip, eleven times.** `update_component` with `create_component`'s arguments for components that didn't exist
  yet; `didYouMean: null`; it never stopped. → FIX-02 C.
- **Buttons 35 px** in both NodeGX rounds, 40+ in every code round (T9). → FIX-02 D.

## #3 — t1-nodegx-3, kit FIX-02 (`328f1dd1d`), 18/22 (2026-10-23)

- **FIX-02 arrived and worked.** `get_project_info` called 12 times, by `section`; `readFirst` read. T1/T2 (reload)
  pass: the Record reads an unheld record. T9 passes (44 px). The update/create slip came back 3 times, each answered
  by the new hint and fixed on the next call; refusals 22 of 228, mostly argument-name slips the `didYouMean` fixed.
  Script fell to **4 Function nodes / 106 lines** (17 / 346 at 0.2.5). T7/T8 hold with no owner filter written at
  all (the backend's enforced `creatorOwns`, as `cloud-query-own-rows` says).
- **Delivered advice gets argued away.** It read the shared-value lesson and wrote: *"The doctrine explicitly warns
  … contention is negligible … Simpler and defensible: compute the whole new state"* → one whole-record
  `Noodl.Records.update` per answer → two tabs overwrite (T5). It read "a press that saves is taken once" and
  wrote: *"double presses are a minor risk … the Check button is hidden"*, but Enter in the field still answers
  twice → fuel +2 (T3; t1-nodegx-2 had passed it). The plain-code arms got both right unprompted: a server endpoint
  per answer increments by itself. → FIX-03: make the safe path the shortest path in the graph, not a warning.
- **T6** failed here for the first time in a NodeGX round (the unlocked page stays open after the parent's setup),
  as in all six plain-code rounds; **F6** failed on the grader's doubt over the Moon, as in t1-harness-1 and
  t1-nodegx-2. Neither is the kit's.

## #4 — t2-nodegx-c01 (division), kit FIX-03 (`cb7e0d6e4`), 14/15 (2026-10-23)

- **Level with both plain-code arms** on the first change: 14/15 each, C1.1 and C1.2 passed, no regressions, T6 the
  one fail in all three (still a property of the request). Cost and time sit between them: $0.075 and 17 min, against
  code's $0.051 / 10 min and harness's $0.098 / 19 min; 1 sitting each. Touched 17 files (+345/−46): 9 nodes added,
  4 changed, none removed. Script: **+1 JavaScriptFunction (4 lines, a flip of the child's setting) and +22 lines in
  the existing question drawer** (4 → 5 functions, 102 → 128 non-blank lines; `measure.mjs`), plus 4 Expressions
  for the wording. The division rule itself lives in script.
- **Day N worked through the server:** `list_projects` → `open_project` on its own copy, then 116 `call_tool`. 14
  were refused, all argument-shape slips the error named (`typeName` → `type_names` ×3; `drive_page`'s `wait_for`
  given `text_contains` ×5; one nested `call_tool`; `search_project` `query`). Same rate as #3 (about 1 in 9).
- **FIX-03 C was read and argued away, the #3 pattern a third time.** `shared-value-written-back-whole` fired on
  the inherited score save (`fuel`, `currentPlanet`, `bestRound`, `recentAnswers`, written back from the page's Record,
  the T5 shape). Its words: *"The 6 remaining infos are all pre-existing (including `lp_save`'s 'written back whole',
  which is the app's existing single-small-write design …)"*. Not wrong for a change that asked for division: the
  person didn't ask for it to be fixed, and T5 isn't in test 2's regression set. Add To went unused (no count in this
  change). B, the press guard, is on by default in the runtime, so the inherited Check button is covered without a
  graph change. Not measured here (T3 isn't in the set).
- **Not gating; no FIX-04.** Filed on the way: `P112-OWN026-CONFIGFOUROHFOUR` (low). The preview's deliberate 404 for
  `nodegx-config.json` puts 1–2 red console errors on every page load of every previewed app (27 in this grade).
  It cost no agent anything yet.

## #5 — t2-nodegx-c02 (number pad for one child), kit FIX-03, 15/17 (2026-10-23)

- **The only arm whose number pad was a number pad.** C2.1 and C2.2 passed. The grader saw keys 1–9, 0, ⌫ and Clear
  at about 93×80 px, a 48 px Check and no text field, answered by touch only; the setting showed on a fresh device.
  The code arm built four multiple-choice buttons instead (C2.1 FAIL); harness built a pad but took 56 min / $0.238.
  NodeGX: $0.089, 19 min, 1 sitting. Touched 21 files (+973/−55): 33 nodes added, 6 changed. Script: +2
  JavaScriptFunctions (5 → 7, 128 → 150 lines), +10 Expressions. 48 calls (counted as starts/ends), 5 refused.
- **The F6 "regression" is the grader's, not the change's.** The planet nodes are the same in t1-nodegx-3, c01 and
  c02 (Moon as the pad, then Mercury … Earth … Neptune). c01's grader passed it with an "interpretation note" (the
  Moon is the launch pad, Earth is included). c02's grader wrote the same facts as a doubt, so FAIL by the rules.
  Harness shows the same shape at its c02: c01's grader read the strip after a reload, and c02's and c03's watched it
  during play and saw it never move. That one may be a real defect the first grader didn't look for, not a change's
  doing. By PLAN §5 the grades stand (each one's evidence supports its own verdict). **But F6 is a borderline check
  graded both ways on identical apps**, so the regression curve should be read with it marked.
- **FIX-03 C again:** `shared-value-written-back-whole` came back on the inherited score save (7 mentions). It wasn't
  touched, and the change didn't ask. Add To unused.
- **Not gating; no FIX-04.**

## #6 — t2-nodegx-c03 (a two-child race), kit FIX-03, 17/19 (2026-10-23)

- **Level on checks again** (17/19 in all three arms; F6 on the grader's doubt over the Moon and Earth, as in #5, and
  T6). C3.1 and C3.2 passed. No regressions.
- **The first change where the layer was clearly thick:** $0.228 and 44 min, against code's $0.092 and 18 min
  (2.5×, 2.4×), and harness's $0.197. **Tokens written 2.4× code's**, where c01–c02 were 1.0–1.2×. The race is a new
  page: 174 nodes added, +4,693/−240 lines in 38 files, JavaScriptFunctions 7 → 11 (150 → 253 lines), Expressions
  66 → 105. What it wrote, by tool input: 142k characters of graph operations (25 `update_component`, 9
  `create_component`), 36k through the editor (docs, decisions), 25k of `drive_page` scripts. Code wrote 90k through
  the editor for the same feature. **A new feature costs about 1.6× the characters as graph operations as it does as
  code**, before the checking.
- 19 refused calls. 17 `read_files` calls, mostly its own screenshots (requests reached 2.1M characters).
- **Not gating; no FIX-04 for a fail.** For the thin layer (PLAN §8 12:30) this is the lever #5 didn't show: the
  cost of WRITING a feature in the graph's operation format, beside the cost of reading (screenshots) and of refusals.

## #7 — t2-nodegx-c04 (stars and a shop), kit FIX-03, 22/22 (2026-10-23)

- **The first full grade in test 2:** C4.1–C4.3 passed, no regressions, and T6 and F6 passed too. Code scored
  20/22 (T6, C2.1), harness 21/22 (T6).
- **Thinner than c03:** $0.151 and 28 min, against code's $0.125 / 18 min (1.2× in $, 1.6× in minutes, **0.7× the
  turns**, 1.4× tokens written) and harness's $0.389 / 81 min / 3 sittings. Touched 65 files (+3,673/−521): 96 nodes
  added, 26 changed, 14 removed (the shop: a Static Data catalogue, two pages, Star Bank / Shop Shelf / Shop Till
  components). Script: JavaScriptFunctions 11 → 15 (253 → 385 lines; the buying rules live in `st_buy`,
  `sh_decorate`), Expressions 105 → 114. Its decision note (`docs/decisions/004-stars-and-the-shop.md`) keeps the
  journey bar unspendable, so "reaching planets works as before" stays true (C4.3).
- **T6 passed with no change to the gate.** No node about the lock or PIN changed between c03 and c04. The router only
  gained `/Pages/Shop`. c03's grader got in by "Players → Grown-ups" after an unlock; c04's tried the button, back
  and the typed URL and was asked each time. So T6 joins F6 (#5): **graded both ways on an unchanged mechanism.** It
  may be a real defect that only some paths reach, or a race in how the unlock clears. Not driven: one per grader is
  what §5 allows. In the table it's listed apart, like F6.
- **Not gating; no FIX-04 for a fail** (FIX-04, thinning, runs in parallel).

## #8 — t2-nodegx-c05 (a teacher invited by email), kit FIX-03, 21/25 (2026-10-23)

- **The first real loss to plain code, and it's security.** Code 23/25 (C5.1–C5.3 passed; T6 and C2.1 carried).
  NodeGX passed C5.1 (invite, two families) and C5.2 (the teacher changes nothing) but **failed C5.3 and regressed T7**
  through one hole. The invite row (`teacherinvite`) is created from the page with a **client-supplied `familyId`**.
  The rules let any signed-in user create a row (`create: authenticated`, `creatorOwns`), and the cloud function
  *Teacher Children* returns every child whose `familyId` matches an invite for the caller's address. So:
  - a teacher who replays family C's invite with their own address sees family C's children (C5.3);
  - **a parent from family B who replays it with their own address reads family A's children**: planets, stars,
    mastered tables (T7, the trap course's cross-family check, passed in every earlier change).
- **It believed the opposite, in writing.** The function's comment: *"both sides of the decision come from the
  server: the address from the caller's OWN session, the invitations from the rows a grown-up wrote. No value arrives
  from the caller, so there is nothing to forge."* The rows are caller-written. The truth is in the database: each
  row's ACL is stamped with its creator by the server, and a forged invite carries the forger's id there and the
  victim's in `familyId`. The function never compares them. The rule model can say it (a path rule from the caller,
  P116 ONT-004/014), but nothing in what the agent read led it there. The code arm's endpoint takes the family from
  the session, which is the shortest code and is safe. **FIX-03's lesson in a new place:** the safe way isn't the short
  way in the graph, and the model reasons its way past it.
- Cost: $0.109, 27 min, 1 sitting (code $0.056 / 12 min; harness $0.161 / 39 min). Touched 30 files (+2,217/−32): 85
  nodes added, a cloud function, JavaScriptFunctions 15 → 19. Kit lookups rose again for the new shape (23 calls, 210k
  characters; c04 had 13), own-docs reads 7.
- F6 and T6 failed on the graders' reading again (#5, #7).
- **Not gating change 6; no hold** (Richard: the chain stays on FIX-03). → `FIX-05.md`, drafted for after the chain.
