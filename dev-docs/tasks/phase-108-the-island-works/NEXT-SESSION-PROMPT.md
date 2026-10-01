# Phase 108 — next session

> ### ⬜ SESSION 7 = IW-007's small owed items, then IW-009 with Richard — START HERE
>
> **Read first:** [README.md](README.md) §0, §3 (R1–R4, R6 ruled; D1–D11 — **D10, D11 are session 6's**; **R5 open**),
> §6 (the board), §7 (the gates). Then [IW-007](IW-007-BUILDING-AND-ANIMALS.md) §4 **"Session 6"** (what was measured,
> built, fixed and decided; the readings; the look items).
>
> **Rulings already given (do not re-ask):** R1 scored play IN (nothing earned is taken away); R2 wear and regrowth only
> while the game is open, nothing dies; R3 real Blockly 12, customised; R4 the order is ours; R6 the island is 55 × 22.
> D9: every robot has hands and walks to things. D10/D11 (s6) are defaults — Richard may change them.
>
> **Session 6 (2026-10-01) — on `cline-dev`, from `47929a133`, committed (this session's files only).** IW-007 ✅:
> - **Her land by touch.** Her land's card names her robots of ANY kind ("Your robots"); a tap CHOOSES who learns there
>   (Variable `gardenLandBot`); Go and help says "Teach Cobble here"; the Workshop teaches that robot. A Workshop win on
>   the land is a **part finished** (`part_done`: a building's part or an animal's bowl that was not full). A robot that
>   wins there while another works it becomes the **helper** with its own program; the land is never put in `done`.
> - **The handoff was wrong in one place:** "send Cobble to help" as the crew rule does it (a COPY of the program) is a
>   dead end on the land — measured, the copy stands still (one rock, one tree, the source reserved): 183 ticks against
>   181 alone; two robots on two materials: 131. So My robots' send does NOT list the land (lane O's hook closed).
> - **Found by driving it by touch — every spec was green:** the Workshop on her land wiped her program at every
>   "Got it" (Read family's `land` is a fresh object each read → Land request → Start world's reset; fixed with
>   `landText`); Cobble's drawer there was empty (Start world said the land needs 'pip'; fixed); the Workshop's card said
>   "Free play" / "'s request" (fixed). Bugs filed in `dev-docs/bugs/p108-iw7-*`.
> - **Two look items fixed** (seen on the touch drive's shots): a land part's chip says "🧱 the spa's stone part … is
>   built" and her bowl "🥣 Hazel's bowl" (Pick thing carries `build`/`item`/`name`; kit `chipLabel`); the pen's animals
>   at 160%, centred, staggered by column, under the chips (kit CSS; graded by a new `--perf` clause that FAILS on the
>   old kit: 44% covered, 2/4 chips on top).
>
> **Readings (2026-10-01; every exit 0):** specs **1042** in 21 files (the 20 of s5 = 1021, + `iw007Touch` 21) · shell
> 92/92 · generator exit 0, 0 drift · **the final tree, one deploy:** page drive 331/331 · `drive-iw007-touch.js` **25/25**
> · animals 16/16 + `--perf` 6/6 (the new pen clause; p95 16.8 ms) · kit2d 50/50 · **the regression set before the look
> items, one deploy:** touch 23 · build 26 · animals 16 · owed 19 · shop 60 · crew 39 · earn 15 · island 69 · robots 60 ·
> modes 90 · iw004 19 · stones 32 · page 331. Not re-run this session: the 3D drives, Olive, Mamie, post, Biscuit,
> look, kit3d, crew `--perf` (nothing they draw changed but the island's pen CSS, which is 2D-only).
>
> **🔴 Before anything: the primary checkout's root `package.json` is Nightbook's app manifest** (uncommitted, since
> 2026-09-28 — `dev-docs/bugs/p108-repo-pkgjson-…`), so `npm run template:garden` fails. `drives/drive-all.sh` now calls
> the generator directly; do the same by hand:
> `TS_NODE_COMPILER_OPTIONS='{"module":"CommonJS"}' npx ts-node -T -P ./scripts/tsconfig.json ./scripts/generate-garden-template.ts`.
> Ask whether to restore it (`git show HEAD:package.json`) — it is not this phase's file.
>
> **Session 7, in order:**
> 1. **Small owed (IW-007 §4 "Session 6" → Not done):** two robots' name pills overlap at home ("Cobble ²ip",
>    `iw7t-04-here.png` — the crew's, any plot's home); the spa's `rest` (robots walk there when done); a helper's drops
>    earning (lane E pays the plot's first robot only); "a fed animal sometimes gives something" (no AC asks); 3D for the
>    touch path (the 2D island and Workshop were driven; `drive-iw007-touch.js` has no `--mode 3d`).
> 2. **Then IW-009** with Richard (the children's sitting on the build).
>
> **Open for Richard (not blocking):** **R5** (the Workshop's run cap: 2000 ticks ≈ 14 min; recommended ~200 with
> Olive's "going round and round" line). **D10/D11** (her land taught robot by robot, two robots at most; a new building
> does not take the feeding robot) — defaults, his to change. **More land** beyond 55 × 22 (IW-008). **The FR lines** of
> every lane (IW-003 §7, IW-006 §5, IW-007 §4 lanes B/A **and s6**: « Tes robots » · « Touche un robot pour choisir qui
> apprend un travail ici. Chacun peut porter autre chose. » · « Apprendre à {b} ici » · « {b} aide ici, avec le travail
> que tu lui as appris ici. Entre pour le lui réapprendre, ou ramène {b} à la maison. »), IW-008 §5) and the missions'
> look beside IW-000. **The prices** lane O set (IW-006 §5). **sami-thanks' Predict**, **the self-filling can**, **at 1024
> the drawer at the foot**, **Play 4 px below the first screen at 390 FR**. The tablet: Blockly by touch, placing the
> ghost and choosing a robot on 16 px island tiles, the crew's frame time with Olive in flight. The children's first
> sitting (IW-009). P106's R11, R12. **The root `package.json`** (above).
>
> **Traps paid for in session 6:**
> - **A fresh object output re-runs every reader; `null` hides it.** Read family's `land` was rebuilt on every read, so
>   every profile write restarted the Workshop on her land — a family with no land (`null === null`) never showed it.
>   Hand TEXT to a node whose re-run resets something (memory: `a-javascript-output-publishes-only-when-it-changes`).
> - **A specced path is not a driven path.** Lane B's "the Workshop on the land" had rows and a seeded drive; the first
>   touch drive found two defects in five minutes (the reset, the empty drawer). Drive the child's taps before calling
>   a path built.
> - **A copy on a single-source job does nothing**: the engine's reservation makes the second robot wait on the source
>   the first reserved. Measure two robots before promising that a second one helps.
> - On the island, a tap on a land tile under a pen animal's sprite does not reach the tile: the drive picks a free tile.
> - **`elementFromPoint` skips `pointer-events:none`**: a garden-kit chip is never "on top" by that test, old kit or new.
>   Lend it pointer events for the measurement; run a new look check on the OLD build first and read WHICH half went red.
> - **A drive that exits with `process.exit()` inside `withDeployedSite` (or is killed) leaves its Chrome running**
>   (PPID 1, `--user-data-dir=…/nodegx-deployed-*`): s6 left ten. Attribute by START TIME before killing — a peer's
>   `setup.mjs` drive had one up at the same moment.
> - **A green look check is not a look:** the pen clause passed with the animals under the fence; only the screenshot
>   showed the rabbit gone. Look at the shot after every drawing change.
> - **Another lane's look clause is a floor:** 140% pets broke lane A's "≥ 20 px on a 390 phone" — run the owner's drive
>   after changing their drawing.
>
> **Before any heavy job:** one heavy job on the box at a time; check `uptime` (< 6), a peer's suite, and `df -h`.
>
> **End of session:** `/next` — this block rewritten, README §6 from the task FILES, the memory, the worktrees removed.
