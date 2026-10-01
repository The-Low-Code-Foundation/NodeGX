# Phase 108 session 5 — common brief for the three lanes (2026-10-01)

Three lanes work in parallel on Phase 108 "the island works" of OpenNoodl / NodeGX (the kids' coding game "Olive's
Island"; slugs stay `bot-garden`). Session 5 builds **IW-007 building and animals** and pays **IW-006's debts**:

| Lane | Branch / worktree | Task | What it builds |
|---|---|---|---|
| **B** building | `iw007-build` | IW-007 AC1, AC3 (buildings), AC4 (2D + 3D drives) | her land on the island; the shop's Build tab; a blueprint bought, its ghost placed on a legal footprint, built by two robots with two materials; each stage drawn in 2D and 3D; the last drop finishes it with a puff; the Workshop on the land |
| **A** animals | `iw007-animals` | IW-007 AC2, AC3 (animals), AC4 (the frame gate) | the Animals tab (shut until a refuge is finished); a rabbit / a sheep bought and named; her bowl and the animal drawn in 2D and 3D (happy fed, waiting hungry); the carrot patch; a feeding job taught and pinned; the bowl empties on wear and the robot refills it; the island's frame gate with two buildings and two animals |
| **O** owed | `iw006-owed` | IW-006 §5 "Session 4 merge" owed items; AC5 | My robots' upgrade slot (no more "from Mamie Rose"); prices retuned from lane E's earnings table; "now in the shop" under the win card's thanks; a crew robot sent from My robots; **AC5: the packaged upgrade drive over a real v4 app** |

The orchestrator merges (O → B → A, regenerating and running every spec file after EACH lane) and runs every gate on the
merged tree. **Read this whole file before touching anything.** Then read, in your worktree:

- `dev-docs/tasks/phase-108-the-island-works/README.md` — §0 Richard's words, §3 rulings R1–R4, R6 and D1–D9, §4.3 (the
  economy, building), §5 the research (**principle 2: the meter and the thanks come first on screen; the shells
  follow**), §7 the gates, §8 out of scope. **R5 (the run cap) is open and Richard's — do not change the cap.** "More
  land" beyond R6's 55 × 22 is Richard's question — nobody builds it; session 5 has ONE land (the meadow at (46, 15)).
- Your task file whole: `IW-007-BUILDING-AND-ANIMALS.md` (B, A), `IW-006-SHELLS-AND-THE-SHOP.md` (O; §5 every block,
  above all "Session 4 merge" and lane E's earnings table). Everyone: IW-006 §5 lane H's block (the shop's components and
  rules) and `IW-008-THE-CREW-AND-MORE-LAND.md` §5 (the crew: a second robot on a plot, `helps`, the plot card's assign).
- The session-1–4 notes you build on: `IW-002-THE-JOB-MODEL.md` §6 (every job field, the island's job tick),
  `IW-005-SEEK-AND-REGROW.md` §5 (go_nearest, reservation), `IW-004-REAL-BLOCKS.md` §6 (the Blocks node, the drawer's
  thing list), IW-003 §7 "Session 3 merge" and lane S's notes (Sami's bench — the first build site, drawn by stage in both
  kits: **reuse its pattern**).
- `dev-docs/tasks/phase-106-the-island-grows/README.md` §5 (gates), §7 (traps); `phase-105-the-coding-garden/README.md`
  §6, §7.

## 1. Where you work, and where you never write

- **Your worktree** is `/Users/richardosborne/vscode_projects/OpenNoodl-worktrees/<lane>` on branch `<lane>`, cut from
  the session-5 base (branch `p108-s5`, the commit named in your prompt). Absolute paths in every command, `-C <wt>` on
  every git command. Verify once at the start: `git -C <wt> log --oneline -1` prints the base.
- **The primary checkout `/Users/richardosborne/vscode_projects/OpenNoodl` is READ-ONLY for you.** Never edit,
  `git checkout --`, `git add`, `git commit`, `git stash`, or run anything that writes there. Other sessions have hundreds
  of live uncommitted files in it — irrelevant to you: your worktree has the committed tree.
- **Never run `npm install`** anywhere: the worktree's `node_modules` is a tree of symlinks into primary's.
- Gitignored build outputs are linked READ-ONLY from primary: `nodegx-backend/dist`, `noodl-runtime/dist-types`,
  `noodl-preview/dist`, `noodl-mcp/dist`, `nodegx-export/dist`, `nodegx-core/dist`, the shell's `node_modules`. **Never
  write into them — a build there writes THROUGH the symlink into primary.** If a gate reports fewer tests than the last
  reading, an artefact is missing — say so; never read a smaller green total as a pass.
- Temporary files, logs, screenshots and drive outputs go in `/Users/richardosborne/vscode_projects/OpenNoodl-worktrees/<lane>-scratch/`.
  Never `/tmp`. **The disk is short (≈ 11 GB free at the start; session 4 filled it).** A drive set writes ~120 MB of
  screenshots: delete a drive's screenshots once you have looked at the ones you cite. Check `df -h /System/Volumes/Data`
  before a drive set and stop (say so) under 3 GB.
- **Other lanes are live in sibling worktrees.** Never touch another lane's worktree, branch, scratch dir or processes.
- 🔴 **Commit your notes BEFORE your last drive run** (with a placeholder for the readings), then fill the readings in a
  second commit. Session 4 lost a lane's notes when the worktree folder had to be deleted to free the disk.

## 2. The CPU rule (Richard's, standing: "Stop fucking up the CPU"; shared 16 GB M1, THREE lanes + other sessions live)

- **One heavy job at a time per lane, and only when the box is calm.** A single jest spec file is free. A whole-package
  jest run, the page drive (headless Chrome + deploy), a screenshot drive, a kit build, `template:garden`, a packaged-app
  build: check `uptime` first and start only when the 1-minute load is **below 6**; otherwise wait with an until-loop
  (`until [ $(uptime | awk -F'load averages: ' '{print $2}' | cut -d' ' -f1 | cut -d. -f1) -lt 6 ]; do sleep 30; done`).
  Do engine, content and spec work (free) while the box is busy, and batch your drives.
- Never `npm run test:ci`, `npm run dev*`, `npm run build:editor`, or an editor `tsc`. Lane O alone builds the packaged
  app (§4.4), once, when the load allows.
- **Never `pkill -f <name>`** (it kills a peer's run — another lane's Chrome looks exactly like yours). Kill only pids
  you started, by pid. Tear down every Chrome and server you start the moment its drive ends.
- 🔴 **Do not background a run and end your turn "waiting for a notification"** — every lane that did this stalled.
  Run gates in the foreground with a `timeout` (up to 600000 ms). A background Bash run is killed at ~30 minutes. A long
  drive: background it writing an exit file (`(… > log 2>&1; echo $? > exitfile) &`) and poll that file yourself with a
  foreground until-loop, then continue. Your turn ends only with the FINAL MESSAGE (§7).
- If interrupted (rate limit, a reboot) and resumed: measure your worktree first (`git log`, `git status --short`) and
  carry on from what is committed.

## 3. How the gates run from a worktree (`<wt>` = your worktree)

Readings on the base (`p108-s5`, 2026-10-01): see §8. On the session-4 merged tree (IW-006 §5): specs **930** in 16 files,
shell **92**, `template:garden` 0 drift, page drive **331/331**, every drive green (`drives/drive-all.sh`).

```
cd <wt>/packages/noodl-mcp && pwd && npx jest tests/cg002Engine.test.ts        # each spec file is one free job
#   also cg003Template, cg005Olive, cg006Requests, ig004Island, cg001GardenKit (on the BUILT kit), ig007Garden3d,
#   iw004Blocks, p108s2Join, iw003Missions, iw006Save, iw006Earn, iw006Shop, iw008Crew, iwLook, p108s4Join,
#   iw007Build (the session's gate: your rows with -t "\[B\]" / "\[A\]", and "\[base\]"), and YOUR new spec file
node <wt>/library/modules/garden-kit/build.mjs          # after any garden-kit src change; commit the built file
node <wt>/library/modules/garden-3d-kit/build.mjs       # after any kit3d src change; commit the built file
cd <wt> && npm run template:garden; echo "exit $?"       # READ THE EXIT CODE; then commit templates/bot-garden drift
R=<wt> X=<wt>-scratch/drives zsh <wt>/dev-docs/tasks/phase-108-the-island-works/drives/drive-all.sh island island-3d shop
#   with names: regenerate, the page drive (331 clauses) and the two kit fixture deploys, then ONLY the named drives
#   (names: the script's ALL list); with NO names it runs every drive (~90 min — the merge does that, not a lane)
#   it writes <X>/summary.txt, one line per drive, and DONE at the end — background it, poll the file
cd <wt>/dev-docs/tasks/phase-105-the-coding-garden/garden-desktop/shell && pwd && node --test tests/*.test.js
```

Add your new drive to `drive-all.sh` (one `case` line and a name in `ALL`, at the END, under your lane's comment) so the
merge runs it with the rest.

Rules: **the exit status is the gate, never the run list**; `Tests: 0 total` = wrong directory; a piped or backgrounded
`$?` is the last command's (zsh: `${pipestatus[1]}`); a lone red in a green suite may be a flake — run it once more.
zsh expands `=word` — never `echo =====`. zsh does not word-split `$VAR` but DOES split `$(…)` — quote every path. A
drive clause that compares ENGINE state can pass while the screen is wrong — **look at the screenshot**. A sampler slower
than what it samples misses it (s4: a 1.1 s bubble read every 1.8 s) — record events with a MutationObserver installed
before the action. **Run every drive your change can touch, not only yours** (every session so far had reds at the join
that each lane alone could not see).

## 4. The shared contract (build to it exactly)

The s2–s4 contracts stand (engine programs are the format and Blockly is a view; the job vocabulary; the save v5
fields; `buyItem` the only place `spent` rises; `earnShells` the only place `earned` rises). If you need something that
is not here, add it in YOUR lane and name it in your final message; never rename or reshape anything below.

### 4.1 What the base gives you — do not redo it

**Content** (`cg002Content.ts`):

| Name | What |
|---|---|
| `JOB_VOCABULARY` + `tree`, `patch` | two new **sources**: a tree gives a `plank` per pick, a patch a `carrot`; each has `left`/`max` and regrows one on its clock (`WEAR.tree` 40, `WEAR.patch` 30). The rock now names its item (`stone`). `SOURCE_ITEMS` = `{ rock: stone, tree: plank, patch: carrot }`. Both kits' pinned copies are updated (the gates compare them) — neither kit DRAWS a tree or a patch thing yet: B draws the tree, A the patch |
| site fields + `of`, `keep`, `bstage` | a **building's part**: a `site` with `of` (the building's id on the land), `build` (the blueprint id), `item`/`need`/`have` its material, `keep: true` (never wears), `bstage` (the WHOLE building's stage, written by the engine on every part) |
| bowl fields + `animal`, `name` | an **animal**: her bowl (a container: `item` her food, `capacity`, `count`) with `animal` (rabbit / sheep) and `name` on it — the animal is drawn BY her bowl; there is no animal thing |
| `LAND_ID` `'land'`, `LAND_PLOT` (46, 15), `LAND_MAP` (= the meadow's), `LAND_HOME` (0, 0, d 1), `LAND_SOURCES` | her land: the meadow R6 kept, a tree (7, 0) 6/8, a rock (7, 5) 6/8, a patch (0, 5) 3/4 |
| `BLUEPRINTS` | `spa` (parts: stone 6 at dx 0, plank 4 at dx 1; 4 stages; spot (3, 1); does `rest`) and `refuge` (plank 6, stone 4; **pen 2** — the row below it, one place per animal; 4 stages; spot (3, 3); does `animals`). A building is ONE ROW of parts, one tile each |
| `ANIMALS` | `rabbit` (eats carrot, capacity 3), `sheep` (carrot, 4) |
| `SHOP` + 4 rows | `spa` 40 and `refuge` 50 on **build** (kind `blueprint`), `rabbit` 20 and `sheep` 25 on **animals** (kind `animal`), EN + FR names and lines. Prices are guesses — lane O retunes |

**Engine** (`cg002Scripts.ts` ENGINE): a pick at any source (`SOURCE_ITEMS`) takes its item (the delta keeps `rock: true`
and adds `source: <kind>` for a non-rock); `go to nearest tree / patch` skips a used-up one; a source's `level` and its
`stones` / `used` states work for all three; **a bowl takes its own item** (a rabbit's carrots — and a food bowl still
food); **a `keep` site never wears**; `buildStage(have, need, n)` and `restage(w)` — every part of a building carries the
building's `bstage` (0 nothing · 1 .. n−2 on the way · n−1 finished), recomputed in `worldOf` and after a drop or a wear.

**Save** (SAVE_HELPERS; the shell's mirror `copies.js`; save stays **v5** — the new field is optional):

| Field | Where | Meaning |
|---|---|---|
| `island.land` | a profile's island, **only when something stands on it** | `{ buildings: [{ id, bp, x, y, have: { <item>: n } }], animals: [{ id, kind, name, at, slot, fed }] }` — one of each blueprint, every tile inside the plot, `have` clipped to each part's need; an animal `at` a refuge's id, in `slot` of its pen (one each), `fed` = her bowl, clipped. `model.island.land` is the active profile's (the same object) |
| packed row 18 | the save code | her land, only when there is one (a code without land is unchanged) |

`buyItem(p, id, { name })`: a **blueprint** goes into `owned` once (`owned` again after); an **animal** needs a FINISHED
refuge on her land (`refuge` otherwise), a free place of its pen (`pen` otherwise), takes `name`, is pushed with `fed 0`
(`animalId` in the result). `blueprintSpec`, `animalSpec`, `buildingDone`, `landOf` are in SAVE_HELPERS.

**The land helpers** (`tests/iw007Land.ts` LAND_HELPERS — include `${ENGINE}${SAVE_HELPERS}${LAND_HELPERS}`; read its
header): `landParts`, `landPen`, `landThings(land)` (sources + parts as sites + bowls), `landJob(land)` (every part and
bowl a target; null when nothing stands), `landRequest(land)` (the land as a request: id `land`, plot, map, things, job,
goal `job_done`), `landLegal(land, bp, x, y)` → `''` or `unknown · built · edge · ground · taken · reach`,
`landPlace(land, bp, x, y, id?)`, `landKeep(land, things)` (have only rises; fed follows the bowl).

**The gate** `tests/iw007Build.test.ts`: `[base]` rows green on the base (18); `[B]` 2 rows and `[A]` 2 rows red until
your lane — they pin the island contract below. Read them before you build.

### 4.2 The island contract (lane B builds it FIRST; lane A builds on it)

- **Read family** (`FAMILY_SCRIPT`) outputs `land` — the active profile's `island.land` (or `null`).
- **Island world** (`ISLAND_WORLD_SCRIPT` / `islandWorldScript`) takes `Inputs.land` and puts **the land plot** on the
  island: `landRequest(land)` stamped at `LAND_PLOT`, its things in the composed world (island coordinates), each part
  carrying `bstage`. It is drawn whether or not anything stands on it (the meadow with its three sources). Its card
  status, its words and what tapping it does are B's.
- **Working the land**: `plots[LAND_ID]` pinned like any plot (`{ program, robotId }`) — the robot runs the land's job
  (`landJob`) on the island tick, waits at home when it is done, starts again when wear reopens it (a bowl) — and a
  second robot helps with `helps: LAND_ID` (lane C's rule) **of ANY kind** (the land needs no one kind; the crew's
  same-kind rule does not apply there). The Workshop opens the land (`gardenRequestId` = `land`) with `landRequest`.
- **Island keep** (`ISLAND_KEEP_SCRIPT`, lane E's) writes the land back at its moments with `landKeep` — **a building
  never un-builds**; an animal's `fed` follows her bowl.
- 🔴 **The island's build hash must not move with the land's progress** (s4: lane E left `live` out of it — the same
  rule): the hash includes which buildings stand and where, and which animals, never `have` or `fed`, or every keep
  rebuilds the island.
- 🔴 **Teach again (`islStale`)**: a pinned program is flagged stale when it no longer wins its job alone. The land's job
  is shared by two robots, so one robot's program never wins it alone — decide (B) how a land plot is judged, and say so.
- **B's first commit is this plumbing alone** (Read family's land, the land plot on the island, pinning and helping on
  the land, the keep, the Workshop on the land, the hash) with the `[B]` rows green. The orchestrator watches for it and
  tells lane A to `git -C <A's wt> merge iw007-build` — A builds its island rows on it.

### 4.3 The design defaults (deviate only with a reason and a measurement, named in your final message)

- **Placing (B):** a blueprint bought (Build tab) sits in `owned`; the land's card (or the Build tab) offers "Place the
  spa"; the ghost appears at the blueprint's `spot`, the child moves it by tapping a tile of her land, it is drawn green
  when `landLegal` says `''` and red with the reason in words otherwise; Place calls `landPlace` and writes the model.
  The ghost is a non-job thing of B's (`{ kind: 'ghost', bp, x, y, ok }` — add it to both kits; it never reaches the
  engine). One building at a time is fine; a second while the first is unfinished is allowed (both are targets).
- **Building (B):** each part fills by `put`; the building is drawn as ONE sprite across its parts by `bstage` (pegs and
  string · a frame · walls · finished) in both kits, like Sami's bench; the last drop plays the puff (dust) and a short
  tune where the kit has sound (game-kit's `Sound`), and the robot that dropped it is the one that walks home first. The
  spa's `rest` (robots walk there when done) is NOT built this session — name it in your notes. The refuge's pen is drawn
  as a small fence row once the refuge is finished.
- **Earning on the land (B):** a land run pays like any job (D2: 1 shell per step filled, capped) and no bonus (the
  building is the reward); a finished building pays nothing more. Say what you built and why if you differ.
- **The Animals tab (A):** shut ("Build the refuge first", one line) until a refuge is finished; then the two animals
  with the purchase card's name field (as a robot copy's); `refuge` / `pen` refusals in words. A bought animal appears at
  once by her bowl (empty, hungry).
- **Drawing animals (A):** by her bowl, in both kits: fed (count > 0) happy (a small hop), hungry (count 0) sits and
  waits — never sad, never gone (R2). Her name pill like a robot's. The bowl's meter shows carrots `2/3`.
- **Feeding (A):** a feeding job on the land is taught in the Workshop like any other (go to nearest patch, pick, go to
  her bowl, put — `until [bowl] is full`); the drawer's `go to nearest` offers the patch and the tree on the land;
  the bowl empties on wear (`WEAR.bowl`) and the pinned robot refills it.
- **Owed (O):** see §4.4.
- **Words:** every NEW key starts with the lane's prefix — B `iw7b`, A `iw7a`, O `iw6o` — EN + FR, appended in a block
  under a comment naming the lane at the END of `WORDS` / `HINTS` / `PAGE_WORDS`. Names, ages and the tablet's spec stay
  out of the repo; robot, islander and animal names are fine.

### 4.4 Lane O's items (IW-006 §5 "Session 4 merge", owed)

1. **My robots' upgrade slot** (`ROBOT_CARDS_SCRIPT`, the word `ig5UpEmpty` "Empty slot · {up} · from {who}"): the
   islanders no longer give upgrades — the shop sells them. The empty slot names the upgrade and says it is in the shop
   (its price), never an islander; a tap on it opens the shop on Upgrades if that is cheap to wire, else says where.
2. **Prices retuned** from lane E's earnings table (IW-006 §5): every `SHOP` price including the base's four new rows —
   change the numbers only, give the table you reasoned from (a copy ≈ N finished jobs, a blueprint ≈ M …) and the
   minutes of play each costs a child at band 7–9 and 10–12. `iw006Shop` / `iw007Build` rows that pin a price must read
   it from `SHOP`, never a literal (fix any that do).
3. **"Now in the shop"** under the win card's thanks when this win puts an upgrade on the shop's shelf (lane H moved the
   gift to the shop: COMPLETE_REQUEST gives none now) — smaller than the thanks (principle 2).
4. **A crew robot sent from My robots** (lane C sends only from the plot card): from a robot's card, choose a plot she
   has won (and the land, once lane B is merged — leave a hook) → the crew's `ASSIGN_ROBOT_SCRIPT` rule.
5. **AC5 — the packaged upgrade drive over a real v4 app** (P105 CG-004's `garden-desktop/drive-upgrade.js`; read its
   header and `garden-desktop/README.md`): launch 1 seeds a **v4** family (one of `tests/fixtures/iw006-v4-saves.json`'s
   authentic v4 codes, decoded by the v4 encoder's shape, written into the page's storage as the v4 app left it), launch
   2 is the current build: the family is migrated to v5 and written back at once (nothing lost — profiles, robots,
   stickers, plots, programs), EN and FR. Build the app ONCE (`build-app.js` then the Mac `dist:mac` as the README says)
   when the load allows; **delete `shell/dist` afterwards** (disk). If the packaged build cannot run on this box, drive
   `electron .` in `shell/` (the drive's no-`--exe` mode) and say exactly which was driven.

### 4.5 What each lane owns, may append to, and never touches

**Put new script code in a NEW file of your own** (imports from `cg002Scripts` / `ig004Island` / `cg002Content` /
`iw007Land`, never from `cg003Scripts` or `cg003Components` — no cycle): B `tests/iw007Building.ts`, A
`tests/iw007Animals.ts`, O `tests/iw006Owed.ts`. Register glue scripts by appending rows at the END of `GLUE_SCRIPTS`
(`cg003Scripts.ts`) and `DRIVE` (`cg003Components.ts`) under a lane comment. New components go in a block under a lane
comment immediately before `export const CG003_COMPONENTS` and are appended at the END of that array. Your spec file is
new too: B `iw007Building.test.ts`, A `iw007Animals.test.ts`, O `iw006Owed.test.ts` — plus your rows in
`iw007Build.test.ts` turned green (never weaken a row; if a row is wrong, say why and fix it in place with the reason).
New drives: B `scripts/devtools/drive-iw007-build.js`, A `drive-iw007-animals.js`, O `drive-iw006-owed.js` (+ the
upgrade drive's changes in `garden-desktop/`).

| Lane | Owns (edits freely) | Smallest hunk allowed in | Never touches |
|---|---|---|---|
| **all** | its new files, its words (prefix §4.3), its CSS (a lane block at the END of `GARDEN_CSS` in `cg007Look.ts`), its Notes block (§5 step 5), its clauses at the END of any existing drive, its line in `drive-all.sh` | an existing script or component where its feature must be wired in (each hunk under `// P108 IW-00x (lane X): …`, named in the final message) | another lane's files, words, CSS block, clauses; the base's contract (§4.1, §4.2) except as allowed there; the run cap (R5); `ISLAND_*` sizes; `BAND_PALETTE`, `ROBOT_MOVES/CONTROLS`; the phase README, NEXT-SESSION-PROMPT and the task files' §1–§4 |
| **B** | the land on the island (§4.2), the Build tab's rows and the placing, the ghost, the tree and the buildings drawn in both kits (append to each kit's sprite tables / THING_BUILDERS under a lane comment; built files committed), the puff, the Workshop on the land, the land's card | `FAMILY_SCRIPT`, `islandWorldScript` / `islStepJob` / the hash, `ISLAND_KEEP_SCRIPT` (the land write), the Workshop's request script (`id === 'land'`), `iw006Shop`'s rows script (the build tab) | the Animals tab, the bowl/animal drawing, the patch, O's items |
| **A** | the Animals tab (its rows and its card's name field), the bowl-with-animal and the patch drawn in both kits, the carrot carried, the feeding job's drives, the frame gate with two buildings and two animals (`drive-ig004-island.js --perf` clauses at its END, or your own drive) | `iw006Shop`'s rows/card scripts (the animals tab), the drawer's `go to nearest` thing list (the patch) | the land plumbing (B's — wait for the merge message), the Build tab, O's items |
| **O** | §4.4's five items; `SHOP` prices (numbers only); the upgrade drive | `ROBOT_CARDS_SCRIPT`, the win card / `COMPLETE_REQUEST_SCRIPT` (the shop line), My robots' card (the send action), `garden-desktop/` | the land, the Build / Animals tabs, the kits |

## 5. Method (every lane)

1. **Re-measure before you build.** Task files cite file:line as of earlier commits; open the line and confirm. A
   recorded claim is a hypothesis until you check it (this brief's too).
2. **Assertion first, red; then the build, green.** Never bump a literal to make a count gate pass; use the constant.
   Add an arm (mutate the source, see the row go red, restore by copy) for each new rule.
3. **Regenerate per group, not per change**, and commit the regenerated `templates/bot-garden` with the source that
   made it. To resolve a generated tree: run the generator, `git grep -l '^<<<<<<< '` = nothing, then `git add`.
4. **Commit on your branch with pathspecs** — only the files you touched, one commit per group, message
   `<type>(p108/iw-00x): <what>` ending with the trailer line
   `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Never `git add -A` without a pathspec.
5. **Notes:** B and A each append a block to `IW-007-BUILDING-AND-ANIMALS.md` §4 (B's block first, A's after it — append
   after any block already there in YOUR worktree), headed `### Session 5 (2026-10-01, lane <X> <branch>)`; O to
   `IW-006-SHELLS-AND-THE-SHOP.md` §5 after the "Session 4 merge" block. Each block: what was built, the readings with
   exit codes and totals, what is not done and why, deviations with reasons, the FR lines for Richard's read, a
   could-not-verify list. **Commit it before your last drive run.**
6. **Verify the consequence, not the mechanism**: a drive asserts what a child would see, never only "no error". A
   frame-based mechanism (rAF) never fires in a hidden or headless window.
7. Traps: the engine and page scripts are JS inside TypeScript template literals — **no backtick and no `${` inside
   the script text, including comments**. A `Variable` is global by NAME. A repeater's row is a Noodl Object, global by
   id. A `States` node that drives a value needs `useTransitions: false`. A `Select` in a Modal closes it — build pickers
   from buttons. A For Each fed a changed list while it rebuilds keeps both sets (README §3) — use the pad's settle latch.
   An artefact scan can match a vendored file (blockly, three.js) — scope the scan, never weaken it. A page script that
   writes the model on every tick writes the store on every tick — the store write is what the island's build reads.
8. Screenshots you take for an AC: LOOK at them (Read the PNG) and say what you saw.

## 6. If you finish early

Do not start another lane's work. Re-run your lane's gates once on your final commit, then give the final message.

## 7. FINAL MESSAGE (your last turn; this is all the orchestrator sees)

In this order, plain prose, numbers on their own lines:
1. Branch and every commit sha with its one-line subject.
2. Each gate you ran: the command, the exit code, the total (`N passed, N total`), and the previous reading it is
   compared against. A drive: passed/failed clause counts and the path of the JSON/log and screenshots.
3. What is DONE against your task's acceptance criteria (and §4.3 / §4.4 items), by number; what is NOT done, by number,
   with why.
4. Deviations from the task file or from this brief (esp. §4's contract and §4.3's defaults), with the reason and the
   measurement.
5. Could-not-verify list.
6. Files you touched; every region of a SHARED file you touched (function names, word blocks, drive clause names); any
   `dist/` to rebuild; anything another lane must know at the merge.

## 8. The base's own readings

On the base (orchestrator, 2026-10-01, `p108-s5`), each spec file run alone, `npx jest tests/<f>.test.ts`:

| spec | reading |
|---|---|
| cg002Engine | 259 / 259 (two rows re-pointed: the vocabulary's kinds + tree, patch; lane S's seek arm now mutates the SOURCE_ITEMS line) |
| cg003Template 148 · cg005Olive 41 · cg006Requests 83 · ig004Island 38 · cg001GardenKit 57 · ig007Garden3d 50 · iw004Blocks 59 · p108s2Join 4 · iw003Missions 63 · iw006Save 17 · iw006Earn 34 · iw008Crew 25 · iwLook 15 · p108s4Join 3 | all exit 0, totals unchanged from session 4's merge |
| iw006Shop | 34 / 34 — the "Build and Animals sell nothing yet" row holds because the base keeps those shelves shut (`shShows`, iw006Shop.ts: a blueprint or an animal is not shown). **B opens Build and A opens Animals — and each changes that row in its own tab's half, saying so** |
| **iw007Build** (new) | **18 passed, 4 failed, 22 total — the 18 `[base]` rows green; the 2 `[B]` and 2 `[A]` rows red by design** |
| shell `node --test` | 92 / 92 (the land packs as the page packs it: a new block in the v5 byte test) |
| `npm run template:garden` | exit 0; templates/bot-garden regenerated and committed with the base |

The page drive and the other drives were NOT run on the base: nothing a request uses changed (no request has a tree, a
patch, a building or a bowl of carrots; the food bowl's rule is unchanged — the gate's known-firing row). Lanes run the
drives their change touches; the merge runs them all.
