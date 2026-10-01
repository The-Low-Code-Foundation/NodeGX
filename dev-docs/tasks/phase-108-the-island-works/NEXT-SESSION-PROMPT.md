# Phase 108 — next session

> ### ⬜ SESSION 6 = the touch path onto her land (IW-007's two 🟡), then IW-009 — START HERE
>
> **Read first:** [README.md](README.md) §0, §3 (R1–R4, R6 ruled; D1–D9; **R5 open**), §6 (the board), §7 (the gates).
> Then [IW-007](IW-007-BUILDING-AND-ANIMALS.md) whole — §4 has lane B's and lane A's session-5 blocks and the
> **"Session 5 merge"** block (the merged readings, what the merge decided, what is owed). [BRIEF-s5.md](BRIEF-s5.md) is
> session 5's brief: §4.1–§4.2 are the land's contract (still true); reuse its shape for a session-6 brief if you run lanes.
>
> **Rulings already given (do not re-ask):** R1 scored play IN (nothing earned is taken away); R2 wear and regrowth only
> while the game is open, nothing dies; R3 real Blockly 12, customised; R4 the order is ours; R6 the island is 55 × 22.
> D9: every robot has hands and walks to things.
>
> **Session 5 (2026-10-01) — merged in `p108-s5`, fast-forwarded onto `cline-dev`.** A base (`b40be26c8`: her land at
> (46, 15) — the meadow R6 kept —, BLUEPRINTS spa / refuge, ANIMALS rabbit / sheep, tree → planks and patch → carrots as
> sources, a building's parts sharing one `bstage`, `keep` sites never wearing, a bowl taking its own food, `island.land`
> in the save (v5, row 18), `tests/iw007Land.ts`, the gate `tests/iw007Build.test.ts`, BRIEF-s5.md), then three lanes,
> merged O → B → A:
> - **O (IW-006 owed + AC5):** IW-006 ✅. The upgrade slot names the shop, prices retuned (spa 30, refuge 35, rabbit 15,
>   sheep 20, boots 15), "now in the shop" under the win card's thanks, a robot sent from My robots; **AC5 over a REAL v4
>   package** (`garden-desktop/drive-upgrade-v4.js` 18/18; CG-004's `drive-upgrade.js --exe` 10/10 on the same package).
> - **B (building):** her land on the island (Read family's `land`, Island world's land plot, a helper of ANY kind on it,
>   every drop a keep moment, a bowl's change too), the Build tab, the ghost on a legal footprint with reasons in words, the
>   spa and the refuge by stage in both kits, the puff, the Workshop on the land (`Logic/Land request`).
> - **A (animals):** the Animals tab shut until the refuge stands, a rabbit / a sheep named (default Hazel / Cloud), her by
>   her bowl in both kits (happy fed, waiting hungry, never gone), the patch, a carrot carried, the drawer's go-to-nearest
>   lists the patch and the tree; AC4's frame gate p95 16.7 ms at CPU ×4 with two buildings and two animals.
>
> **Merged readings (`p108-s5`, 2026-10-01; every exit 0):** specs **1021** in 20 files (cg002Engine 259 · cg003Template
> 148 · cg005Olive 41 · cg006Requests 83 · ig004Island 38 · cg001GardenKit 62 · ig007Garden3d 52 · iw004Blocks 59 ·
> p108s2Join 4 · iw003Missions 63 · iw006Save 17 · iw006Earn 34 · iw006Shop 34 · iw008Crew 25 · iwLook 15 · p108s4Join 3 ·
> iw007Build 22 · iw006Owed 19 · iw007Building 21 · iw007Animals 22) · shell 92/92 · `template:garden` 0 drift · the
> whole drive set on one deploy: page drive **331/331** · look 143 · earn 15 · shop 60 · crew 39 + `--perf` 5 · modes 90 · IW-001 38 · IW-004 19 + 3D 3 · island `--perf` 69 + 3D 5 · robots 60 + 3D 4 · Workshop 3D 24 + nogl 8 · Olive 22 · Mamie 34 + 7 + 3 + 6 · stones 32 + 3D 14 · post 17 + 3D 10 · Biscuit 24 · kit fixtures 2D **50** (+4 B, +2 A) and 3D **37** (+5 B, +2 A) · **owed 19 · build 26 + 3D 4 · animals 16 + 3D 4 + `--perf` 5** (new).
> **The whole drive set is one command:** `R=<tree> X=<out> zsh dev-docs/tasks/phase-108-the-island-works/drives/drive-all.sh`
> (detach it with nohup; it writes `<X>/summary.txt` and ends with DONE; about 2 h now).
>
> **Session 6, in order:**
> 1. **A second robot onto her land BY TOUCH** (IW-007 AC1's 🟡). The island and the engine build the spa with two robots
>    (the pinned one + a helper of any kind, `helps: 'land'`), but a child can only pin ONE robot there (by teaching in the
>    Workshop on the land); the second is seeded in every drive. Two doors exist, neither wired: the land card's crew pills
>    (lane C's assign rule asks for the plot's own kind and a WON plot — the land is neither) and My robots' "send to a job"
>    (lane O's HOOK in `tests/iw006Owed.ts`: Robot cards does not read `land` yet; `Logic/Send robot` must hand `crewAssign`
>    the land's request). Build one, drive it: buy the spa → place it → teach Pip on the land (a Workshop win needs
>    `job_done`, so the FIRST robot's program must finish the whole building — or decide a land win rule) → send Cobble to
>    help → it stands.
> 2. **Teaching on the land, driven** (AC2's 🟡). MEASURED 2026-10-01 on the engine: with the spa and the refuge standing,
>    `until [her bowl] is full { go to nearest patch; pick; go to her bowl; put }` WINS on the land in 46 ticks (job_done
>    5/5); while a building is unfinished it cannot (4/5 — job_done needs every target). So a child builds first, then
>    teaches feeding there. Drive it on the page (the Workshop on the land, the win, the pin replacing the builder's, the
>    bowl filled on the island). Decide what happens to the feeding pin when she places a NEW building (today the land's
>    job reopens and the feeding program cannot fill it: teach again).
> 3. **Small owed:** the spa's `rest` (robots walk there when done); a tune on the last drop (garden-kit has no sound);
>    "a fed animal sometimes gives something" (no AC asks it); earning from a helper's drops (lane E's island earnings pay
>    the plot's first robot only); `drive-iw006-shop.js` and `drive-iw008-crew.js` still type a copy price 30 and a brain
>    price 25 (unchanged values — read them from SHOP). **A look item** (merge, `iw7a-perf-land-1368.png`): on her land's
   close-up the rabbit stands half hidden behind the sheep, and the two animals sit over the refuge's meter chips — draw
   the pen's animals apart and the chips above them.
> 4. **Then IW-009** with Richard (the children's sitting on the build).
>
> **Open for Richard (not blocking):** **R5** (the Workshop's run cap: 2000 ticks ≈ 14 min; recommended ~200 with Olive's
> "going round and round" line). **More land** beyond 55 × 22 (IW-008; one land in s5). **The FR lines** of every lane
> (IW-003 §7, IW-006 §5 lanes E/H/O, IW-007 §4 lanes B/A, IW-008 §5) and the missions' look beside IW-000. **The prices**
> lane O set (IW-006 §5, lane O's table). **sami-thanks' Predict**, **the self-filling can**, **at 1024 the drawer at the
> foot**, **Play 4 px below the first screen at 390 FR** (IW-006 §5, IW-003 §7). The tablet: Blockly by touch, placing the
> ghost on 16 px island tiles, the crew's frame time with Olive in flight. The children's first sitting (IW-009). P106's
> R11, R12.
>
> **Traps paid for in session 5:**
> - **Two lanes appending blocks at one spot, again** — in both kits git matched lane B's closing `}` / `return g; };` to
>   the common tail and the union lost it; `template:garden` then refused with "Unknown node type garden-kit.Garden" (the
>   module did not load). `node --check` on both kit sources names the line; restore the closer. Then PROVE the union: a
>   line-multiset check of each doubly-touched file against base + each lane's adds and removes — it showed every hand join
>   and nothing else.
> - **A control row in one lane pins another lane's word**: lane A's "the Build tab is not mine, it says its old line"
>   went red when lane B gave Build a new line — the join's one spec red. Run every spec file after EACH lane merge.
> - **zsh does not split `$EXTRA`** in `for f in a b $EXTRA` — two names became one ("Tests:" empty for it). Write the
>   names out.
> - ✅ The plumbing-first contract worked: lane B committed the island plumbing as its first commit, the orchestrator
>   watched the branch and told lane A to merge THAT sha; A's rows were green on it at once.
>
> **Before any heavy job:** one heavy job on the box at a time; check `uptime` (< 6), a peer's suite, and `df -h`.
>
> **End of session:** `/next` — this block rewritten, README §6 from the task FILES, the memory, the worktrees removed.
