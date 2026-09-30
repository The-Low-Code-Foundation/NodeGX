# Phase 108 — next session

> ### ⬜ SESSION 4 = IW-006 shells and the shop ∥ IW-008 the crew (+ a small look lane) — START HERE
>
> **Read first:** [README.md](README.md) §0 (Richard's words), §3 (R1–R4, **R6** ruled; D1–D9; **R5 open**), §4.3–§4.4, §6
> (the board), §7 (the gates). Then [IW-006](IW-006-SHELLS-AND-THE-SHOP.md) and [IW-008](IW-008-THE-CREW-AND-MORE-LAND.md)
> whole, and [IW-003](IW-003-THE-MISSIONS-AS-JOBS.md) §7 — the four lanes' notes and **"Session 3 merge"** (the merged readings,
> what the merge decided, the seven look items). Session 3's shared contract is
> `../OpenNoodl-worktrees/p108-COMMON-BRIEF-s3.md` (§1 where lanes work, §2 the CPU rule, §3 the gates, §4 the contract,
> §5 the method, §7 the final message); session 4's brief copies what still holds and adds the economy's names (the wallet,
> the shop's items, the save v5 fields) BEFORE any lane starts — the s3 base-first pattern worked (below).
>
> **Rulings already given (do not re-ask):** R1 scored play IN (shells; nothing earned is taken away); R2 wear and regrowth
> only while the game is open; R3 real Blockly 12, customised; R4 the order is ours; **R6 (2026-09-30): the island is
> 55 × 22** — six columns × three rows, eighteen slots; (46, 15) on Biscuit's row is a meadow kept for IW-007. **D9 (a
> default, change it by saying so): every robot has hands and walks to things** (`pick put go_nearest go_to` for all) — so
> IW-008 §2's "a program using `pick` cannot go to Pip" no longer holds; a refused copy now turns on water / fill / say /
> Olive.
>
> **Session 3 (2026-09-30) — merged in `p108-s3-merge`, fast-forwarded onto `cline-dev`.** A base commit first
> (`2e1035bfa`: R6's island, D9, the palettes open to the walks and variables, the `door` kind, `site.build`, `ball`, seeded
> `choose` / `shuffle` / `place`, the hints `iw3NoCan` / `iw3Job`, the gate `iw003Missions.test.ts` with rows by lane), then
> four lanes in worktrees, merged P → B → S → M, then `cline-dev` (P107 s2; no shared file).
> - **M (Mamie):** tulip-door (the can picked up first), tulips-three (three drinks a tulip), eggs-count (the hen lays,
>   `until count of 🥚 in [basket] = 4 { go to nearest egg, pick, go to [basket], put }`), rows-trick, mamie-note (the note
>   changes with the day); the job card under the world (IW-000's look); the pad's go keys; `sayNone` by kind; the Island
>   page goes on from the island it left (IW-002 AC3 — a real defect: reopening reset every plot); island job plots answer
>   Olive with her written answer.
> - **S (Sami's stones):** path-stones (4 squares × 4 stones, dirt → path), rock-flower, **sami-bench** (NEW: a build of 8,
>   drawn by stage in both kits, Sami sits on it); `go to nearest` skips a used-up rock or a full target.
> - **P (the post):** path-postbox, letter-say, sami-thanks, **envelopes** (NEW: Olive reads the name, `go to` what she read,
>   the letter only goes through its owner's door); doors in both kits; Olive's `read` of an envelope (IW-005 dev. 6 closed).
> - **B (Biscuit):** bowl-if, wall-until (a real wall, the ball by it, `repeat 7` bumps), meow-when; the ball in both kits;
>   the island's meters as bars; the program fitted at 1024; **teach again** (a pinned program its rewritten job outgrew
>   waits at home and the Workshop says "Teach Pip again — the job changed").
>
> **Merged readings (`p108-s3-merge` at `5afba75cb`, 2026-09-30; every exit 0):** garden specs **800** (cg002Engine 259,
> cg003Template 148, cg005Olive 41, cg006Requests 83, ig004Island 38, cg001GardenKit 56, ig007Garden3d 49, iw004Blocks 59,
> p108s2Join 4, **iw003Missions 63/63**) · shell 92/92 · `template:garden` 0 drift · page drive **331/331** (`--mockup`) ·
> IW-001 38/38 · IW-004 19/19 + 3D 3/3 · modes 90/90 · robots 60/60 + 3D 4/4 · island `--perf` 65/65 (AC6 p95 16.8 ms at
> CPU ×4) + 3D 5/5 · Workshop 3D 24/24 + nogl 8/8 · Olive 22/22 · the lanes' drives: Mamie 34 + 7 + 3 + 6, stones 32 + 3D 14,
> post 17 + 3D 10, Biscuit 24 · kit fixtures 2D 44/44, 3D 30/30. Screenshots looked at (IW-003 §7, the merge).
>
> **Session 4 = IW-006 ∥ IW-008, plus a small look lane (L):**
> 1. **IW-006 shells and the shop** — earning per job step (D2) and the bonus, paid again only after wear; the wallet
>    (`earned` only grows, `spent` a second number, D4); the shop's tabs; the purchase card; the helpers; **save v5** —
>    which must now also carry each plot's live job state (meters, wear clock): IW-002 AC3 holds within a session but an app
>    restart starts every job plot from its request (IW-002 §6). The v4 → v5 packaged upgrade drive (P106 IG-004 AC7's).
> 2. **IW-008 the crew** — copies of a robot kind, named, assigned to plots; copy a program (a refusal names the block);
>    reservation across the crew; the frame gate at the crew cap. "More land" beyond R6's 55 × 22 is a question for
>    Richard before anyone builds it (R9 → R6 was a ruling).
> 3. **Lane L (look, small, one worktree)** — IW-003 §7's open items that a child sees: the 1024 fit for the bench's program;
>    the envelopes' read block still saying "read the note"; the drawer's `go to nearest` starting on "egg" whatever the
>    plot; the 390 pad covering the right half of the world; `iw3Job`'s "0 of 1 done" on the eggs; the kits' full meters at
>    3.05:1 (the page overrides with `--leaf`); possibly two Samis on the island.
>
> IW-007 (building and animals) is session 5 (after the shop sells blueprints); then IW-009 (the children).
>
> **Open for Richard (not blocking session 4):** **R5** (README §3): the Workshop's run cap is 2000 ticks ≈ 14 min;
> recommended ~200 with Olive's "going round and round" line. **The FR lines** of the fifteen missions (each lane's block in
> IW-003 §7) and **the missions' look beside IW-000** (AC3, AC5). **sami-thanks' Predict:** with home = start, a finished
> job always ends at home, so "tap where the robot will stop" now asks "does the job get done?" — keep, reword, or move the
> challenge? The tablet: Blockly by touch (IW-000 AC5, IW-004 AC9). The children's first sitting (IW-009). P106's R11, R12.
>
> **Traps paid for in session 3:**
> - **Two lanes appending at one spot interleave in git** (a describe block, a drive's check block): resolve by taking one
>   side and re-appending the other lane's block from its own `git diff -U0 <base> <lane>`, then diff each merged file
>   against the pre-merge tree — it must differ by exactly that lane's hunks. A hand-picked line slice went wrong once
>   (cg006's wrong-program table): verify every picked line by `git diff <lane> -- <file>`.
> - **A lane's change is right alone and red at the join**: teach again (B) × a pinned fixture (P); containers matching by
>   shape (M) × bowl-if's `if` (B); the day's note (M) × the envelope row (P); the go keys (M) × the stones pad (S). Run
>   every spec file after EACH lane merge, not once at the end.
> - The page drive with fifteen missions runs past 10 minutes: background it writing an exit file, poll the file.
> - Four lanes on one Mac: every lane waited for load < 6; nothing was killed. Keep it.
>
> **Before any heavy job:** one heavy job on the box at a time; check `uptime` (< 6) and for a peer's suite first.
>
> **End of session:** `/next` — this block rewritten, README §6 from the task FILES, the memory.
