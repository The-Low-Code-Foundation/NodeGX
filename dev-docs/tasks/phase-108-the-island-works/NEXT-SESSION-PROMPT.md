# Phase 108 — next session

> ### ⬜ SESSION 10 = the tablets again on the s9 build, or what the children find — START HERE
>
> **Session 9 (2026-10-03) built what the children found on the Windows TABLETS** (Richard's report: IW-009 §6). All
> five items are built and driven (below). **The tablets' installer and the Mac app are from BEFORE s9** — ask Richard
> whether to build a new Windows installer (`garden-desktop.yml`: a push of the tip to `p105-garden-desktop` on the PUBLIC
> repo — ask first; run `npm ci --dry-run` over HEAD's package.json files before pushing, P108-S9-LOCKFILE) and rebuild
> the Mac app (IW-009 §5's two steps). Then: what the children say on it.
>
> **Session 9 — on `cline-dev`: `c25fb8ee5` (3D, hints, buildings) · `cc4d1ad06` (lane BLOCKS) · `51fee1145` (regen) ·
> `710c7a05c` (pad saves too, the bar's place, the drive) · `4ee7c8ee8` (bugs):**
> - **3D stays (P108-S9-3D):** `RENDERER_CHOICE_SCRIPT` — Too Slow never takes back `{3d, grown-up}`; only `unsupported`
>   falls back over it. Grown-ups says so (`guRend3dKept`). Nothing chosen: Too Slow still flattens (the control).
> - **The hints (P108-S9-HINTS):** hintStart / hintEmpty / hintPattern (the shell's table — the apps carry it),
>   hintDriveReady, `empty`, subTulipsThree, subPathPostbox lead with the blocks; Teach second.
> - **Several blocks (lane BLOCKS, `blocks.js`):** shift/⌘/ctrl-click toggles a block in a set (`gd-multi`); the block
>   menu's "Select several" / « Choisir plusieurs » (long-press on a tablet) turns on a mode where each tap toggles; a bar
>   (one row, top right of the workspace) offers "Delete N blocks", "Fold into repeat ×k" (a contiguous run that is k
>   copies of its first p blocks, FOLD_HELPERS' sameness, smallest p, k ≤ 9, only where the drawer has a repeat) and
>   Done; Delete/Backspace deletes the set (a stack heals); one undo, one emit. Words in `SEL_WORDS` (not the page's
>   table — cg003Content would have to carry the five `iw4Sel*` keys first).
> - **Buildings stay built (P108-S9-BUILT, `p108s9Land.ts`):** `Land keep here` (Pages/Workshop) writes each part the
>   moment it is delivered — runner tick or pad press, Drive or Teach — have only rises; `Land start` (the drawn start,
>   after Start world) and `Land lift` (runner, pad, Teach) give the Workshop every part her save holds; Island world
>   lifts a kept island's land (`iw9LiftLand`); Read family's `landText` drops `have`, so the Workshop's own write never
>   re-runs Start world (its Ran clears her program). Sources and bowls stay the island's.
>
> **Readings (session 9):** garden specs **1086 in 23 files** + `p108s9.test.ts` (in that count; an arm per rule) ·
> generator 0 · drives on one deploy of the final tree: `drive-p108s9.js` 2d **14/14** (the same drive on the pre-s9
> template: 5/14 — only setup clauses; the reported defect reproduced), 3d **8/8** (CPU ×8; control flattens, grown-up 3D
> holds while gd3.tooSlow fires), `drive-iw004-blocks.js` **23/23** (S9 clauses), page drive **331/331** (`--mockup`).
> `drive-p108s9.js` is in `drives/drive-all.sh` as `s9` and `s9-3d`.
>
> **Open (not blocking):** P108-S9-BKFONT (the Blocks node's `font:… inherit` shorthand, unmeasured); the selection bar
> covers the ▶ hat while blocks are chosen (accepted: nothing needs it then); a building's parts delivered in the
> Workshop take stones the save never loses (sources stay the island's — free stones in the Workshop).
>
> **Session 8 (kept for reference) — Richard's own play, five items, all built and driven:**
>
> **Rulings already given (do not re-ask):** R1 scored play IN; R2 wear and regrowth only while the game is open; R3 real
> Blockly 12, customised; R4 the order is ours; R5 run cap 400 ticks; R6 the island is 55 × 22; more land: not in this
> phase; the sitting is on the Mac. **R7 (s8):** every watering mission lays the can on the grass ("Every watering
> mission"). **R8 (s8):** her land keeps 6 stones / 6 planks and the wait — but shows it ("Keep the wait, but show it").
> Richard's three direct asks (no ruling needed, his words in the bugs): a draggable divider between the world and the
> steps; no Workshop tab; the pad's go-to-nearest walks and can teach the walk back.
>
> **Session 8 — on `cline-dev`: `3bb2e084e` (the build) + the drive/look commit after it:**
> - **The can (R7):** tulips-three, rows-trick, mamie-note, rock-flower lay the can on the plot as tulip-door did; each
>   reference picks it first and still fits a 12-block brain (tulips-three: Pip starts at (2,1), the can between him and
>   the pond, each pass starts with a step; rows-trick: the can on the pond's edge tile, in front of Pip — the only
>   12-block layout found); a robot's bigger can (can+) is the can lying there (Start world, `islStart`). Home = start,
>   so an island lap with the can already in hand runs the same program (the pick finds nothing).
> - **The walk:** the pad offers go to the nearest square (and her land's tree, patch; `PAD_GO.nearest`), one key per
>   place (a kind `go to` already keys is not also a nearest key); a go press keeps its route as the robot row's `via`
>   (Record step) and BOTH kits draw it a tile at a time (`walkTiles`, `stepFacing` — one rule, pinned in both; a via
>   that does not join where the robot was drawn is ignored). The world still changes once (drives read data-x at once).
>   The pad gained a fifth row of slots.
> - **The divider:** `garden-kit.Divider` (new kit node: drag, arrow keys ±32, double-click resets, kept in localStorage
>   `bot-garden-steps-w`) sets `--bg-steps-w` on `.bg-ws`; default 44vw from 1200 px (was 50vw); Min 420 — narrower,
>   Blocks' workspace drops under 380 and its drawer goes to the foot, off the screen (seen on a shot at 375); the world
>   is bounded by the window's height (`--bg-world-max`), not 640 px.
> - **No Workshop tab** (the page, its reload guard and every way in stay; seven drives renumbered `tab(n)`).
> - **The refuge (R8):** a wrong-item put says what the place wants (`sayWants<Item>`, bowls too); a pick at an empty
>   source that grows back says so (`sayGrows<Kind>`); a source under its max wears a 🌱 on its chip (`grows`, both kits);
>   the tree has a chip now; `landKeep` writes each source's left onto her land (`land.left`, optional, bounded by
>   `LAND_LEFT_MAX`) and `landThings` lays it, so the Workshop shows the island's real amount.
> - **Found by the drives and fixed:** P108-S8-PICKER (a slot picker at a phone's foot ran off the screen — long French
>   options wrap; now measured after opening), P108-S8-EDGECHIP (a chip in the plot's first/last column was cut by the
>   world's edge; her land's tree and rock).
> - Bugs filed (all fixed): P108-S8-CAN, -PADGO, -PADJUMP, -WIDTH, -WSTAB, -WRONGPART, -ROCKWAIT, -LANDLEFT, -PICKER,
>   -EDGECHIP.
>
> **Readings (session 8):** specs **1112 in 27 garden files**, exit 0 (`p108s8Feedback.test.ts` 13 with an arm per rule; the
> 3D walk 3 in `ig007Garden3d`) · generator 0, no drift · drives on the final tree, one deploy: page 331/331, s8 28/28, s8-3d 28/28, touch-3d 29/29, iw001 38/38, stones-3d 14/14, kit2d 50/50, kit3d 37/37 · **not re-driven since the tab renumbering (owed, cheap): island, crew, owed, build, build-3d, animals** · on the tree before the
> picker/edge-chip/Min fixes: stones 32/32, mamie-ws 34/34, ws3d 24/24, robots 60/60, touch 29/29 (2D), page 329/332 (the
> three: the picker, fixed). New drive: `scripts/devtools/drive-p108s8-feedback.js` (`s8`, `s8-3d` in
> `drives/drive-all.sh`) — tabs, the can, the go keys, the walk on her land (11 tiles, ~4 s), the divider, her land's
> chips and lines.
>
> **Open for Richard (not blocking):** IW-009 (the sitting; the Mac app is the s8 build); the tablet; the FR lines — s8 adds
> « Ici, il faut des planches. » … (`sayWants*`), « Le rocher est vide. Il repousse, une pierre à la fois. » (`sayGrows*`),
> « L’arrosoir est dans l’herbe : remplis-le à la mare, et reviens ! », « l’arrosoir au bord de la mare »; the rows-trick
> can on the pond's edge tile (the only 12-block layout — a can drawn on water); the prices; D10–D13.
>
> **Look items noticed, not built:** her land's drawer starts "go to the nearest 🥚 egg" (no reference program there, so
> the drawer's default seek is the first kind) — a source on the land would read better; P108-S7-METERS3D (the spa's two
> chips overlap in 3D) is still open.
>
> **Traps paid for in session 8:**
> - **A content change re-pins every drive that hand-builds that mission.** Four watering missions changed shape; the
>   page drive went 331 → 249 on the first run — every red was a drive still teaching the old dance (`tap key undefined`),
>   not the product. Grep the drives for the mission ids BEFORE the first deploy (`grep -l "tulips-three\|mamie-note" drive-*.js`).
> - **A seeded world can make a gate trivially green or red:** Sami's rocks on that day's seed sat one step from Cobble —
>   a one-tile walk has no route to draw. Measure a walk where the route is long by construction (her land: home to the
>   far rock, 11 tiles).
> - **A wider/narrower column can flip a kit's layout mode:** the divider's first Min (360) let Blocks' workspace drop
>   under its 380 px "narrow" rule — the drawer moved to the foot, off screen. Bound a resizer by its children's modes.
> - **A chip/picker placed from an ESTIMATE overflows when the text is longer than the estimate** (French): measure after
>   it is in the DOM.
>
> **Before any heavy job:** one heavy job on the box at a time; check `uptime` (< 6), a peer's suite (`pgrep -f
> node_modules/.bin/jest`), and `df -h`. `drive-all.sh` with every drive > 2 h: run it in named batches.
>
> **End of session:** `/next` — this block rewritten, README §6 from the task FILES, the memory, the worktrees removed.
