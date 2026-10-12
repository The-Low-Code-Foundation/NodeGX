# IW-001 — The Workshop fixes

**Opened 2026-09-29** from README §1.3. **Status: ✅ s1 (lane A), AC1–AC8 driven — §6. P108 s7: R5 ruled — the Workshop's run cap is `RUN_CAP` = 400 ticks (≈ 2¾ min), not MAX_TICKS (README §3; `drive-iw001-workshop.js` reads the deployed cap: 38/38).** Depends on nothing. Lane A. **First job of session 1.**

## 1. The person sentence

> **A run that goes round and round can be stopped. A block tapped in the drawer lands in the program, and its `?` is
> in the drawer. Tapping a placed block no longer throws it away. The program has room, and the pad has every action
> the mission uses.**

## 2. What it is (each measured in README §1.3)

| # | Fix | Where | Survives IW-004? |
|---|---|---|---|
| F1 | **Stop** on the bar while a run plays (Play hides, Stop shows); fires the Runner's existing `stop` (K3:717-721) | K3:870-875, 1181-1184 | yes (the bar) |
| F2 | **A run cap** in the page Runner: `MAX_TICKS` (E:73) applies to a played run too; hitting it stops the run and Olive says "Pip is going round and round — is there a loop that never ends?" (new hint key, EN/FR) | E:486, the Runner | yes (engine) |
| F3 | **The first drawer tap places the block.** The card opens beside it, not instead (`CARD_GATE_SCRIPT` stops undoing, S3:797-826); closing it leaves the block | S3:797, K3:899-907 | card logic yes |
| F4 | **`?` on the drawer blocks**, not on placed ones (KIT:650-663, 747); the "? <block>" chips row goes (S3:850-861) | KIT | the rule yes |
| F5 | **A tap on a placed simple block selects it, never deletes it**; delete is the `✕` only (KIT:609-615) | KIT | replaced by drag-to-drawer |
| F6 | **The program area:** the drawer and the program in two boxes; the program box takes the column's height down to the bar (not `min(52vh, 460px)`, LOOK:318-319) | LOOK | layout replaced |
| F7 | **The pad = the drawer's actions:** every action block in the mission's palette gets a key (adds `say`, `read`) | `cg003Content.ts:163-171`, S3:269-274 | yes |
| F8 | **Cards seen are saved** per profile (the save's profile row, optional field — no version bump), not the page Variable `gardenCardsSeen` (K3:962) | cg002 save, K3 | yes |

Drag from the drawer is **not** built here: IW-004's Blockly has it. F5 and F6 are the cheapest change that stops the harm.

## 3. Acceptance criteria

1. F1: a drive starts `until wall_ahead { left }` (never ends before the guard) inside `repeat 9`, presses Stop, and
   the robot stops within one tick; the bar returns to its idle state; Start over works after.
2. F2: the same program with no Stop hits the cap and shows the new line (EN/FR).
3. F3: a fresh profile's first tap on `fill` places it **and** opens its card; "Got it" closes it; the block stays.
4. F4/F5: placed blocks carry no `?`; the drawer's do; a tap on a placed `fwd` leaves the program unchanged.
5. F6: at 1024 × 768 a 12-block program is visible without scrolling; at 1368 × 900 a 20-block one.
6. F7: on `letter-say` the pad has pick, put and say; on `mamie-note` it has read; each key does what its block does.
7. F8: cards seen survive a reload and are per profile (a sibling still sees the card).
8. Garden specs, page drive, modes drive, template byte-identical, 0 console errors; screenshots looked at.

## 4. Gates

As P106 IG-001 §5.

## 5. Traps

- The Runner's `stop` path also resets `rnWait` (Olive's parked ask) — Stop during "Olive is thinking" must clear it too
  (P106 D1 was this family).
- F8 writes a profile field: an on-load migration owes its own save (the page writes the migrated profile back at once, as the v4 load does, `cg002Scripts.ts:877`).

## 6. Notes

### Session 1 (2026-09-29, lane A, branch `iw001-fixes`, base `ac5fb8227`)

**Built** (paths under `packages/noodl-mcp/tests/` unless named):

- **F1 Stop** — `plStopRun` on the bar in Play's place (`cg003Components.ts`, Workshop/Play): mounted from the Runner's
  Running, Play from its Idle; it fires the Runner's own Stop (timer, mode, Olive's parked ask `rnWait`, the run emptied,
  the cap cleared). Ink fill (never Teach's coral beside it), a square icon (`cg007Look.ts` ICONS.stop), word `iw1Stop`.
  The node is `plStopRun`: the IG-003 spec bans the id `plStop` (an older button of that name).
- **F2 the run cap** — in the Runner: after every tick that is neither done nor parked, `Logic/Run cap` (go; its script
  bakes the engine's exported `MAX_TICKS`, imported, `ENGINE` untouched) reads Step's Tick; at the cap the Runner stops
  (timer, mode idle, `rnCapped` on, `cap` signal) and KEEPS the run; Choose hint says `iw1Loop` (EN/FR, `HINTS` end of
  table, lane-A block; one branch in `CHOOSE_HINT_SCRIPT`).
- **F3** — `CARD_GATE_SCRIPT` never undoes an edit: the first tap on an unseen kind places it and `show` opens its card;
  Got it closes it, the block stays.
- **F4** — `garden-kit.BlockList` (Show Help) draws the `?` on every DRAWER block (a `gd-pal-item` span: the block
  button and its `?`, tucked 4 px), none on a placed one. The "? <block>" chips row is gone: `Workshop/Help chip`,
  `Logic/Help chips`, `HELP_CHIPS_SCRIPT` and the `cardHelpsH` word removed.
- **F5** — a tap on a placed simple block selects it (a second tap lets go; `data-sel` on its row, the control ring);
  only the cross removes. Kit rebuilt (`build.mjs`), the built file committed.
- **F6** — `.bg-steps` on the steps panel: over 980 px it is at least a screen tall (`calc(100vh - 16px)`) and never
  makes the row taller (`contain: size`); inside, the drawer is a strip on the left (`minmax(148px, 42%)`, Scratch's side)
  and the program box takes all the rest of the height and scrolls alone; under 980 px the drawer sits over the program
  box (max 60vh). `min(52vh, 460px)` is gone. Program blocks 32 px on a 3 px rhythm.
- **F7** — `Logic/Pad keys` reads the drawer's palette (band × request × robot, Olive's rungs): `say` and `olive:read`
  are keys where the drawer has them (`PAD_KEYS` + a fourth pad row). Say records `say` with the asker's thank-you
  (`SAY_OF` by the request's islander) and its line shows over the robot (`Record step` → Bubble, a second source into
  both gardens). Read parks on Olive like the block: `Record step` hands out Request and Pending, a second Ask Olive
  (`plPadAsk`) asks her, `Logic/Pad answer` (the engine's own step on the parked run) puts her answer over the robot.
- **F8** — `cardsSeen` on the profile, OPTIONAL (save stays v4): `SAVE_HELPERS` `cardsOf` + `profileOf` (absent = none
  seen), Encode row 15 only when non-empty, Decode reads it, `Update profile` field `cardsSeen`, `Read family` Cards Seen.
  The Workshop takes them from her profile (`plIn.cardsSeen`); Got it hands the list out (`cardsSeen`, `cardSeen`) and
  the Workshop page writes it (`wsSeen` Update profile → store). The `gardenCardsSeen` page Variable is gone. The
  shell's `copies.js` packs row 15 byte-identical (its test).
- **A defect found and worked around (not mine to fix):** a For Each fed a CHANGED list while it is still rebuilding for
  its mount keeps both sets — `noodl-viewer-react/src/nodes/std-library/data/foreach.tsx`: `scheduleRefresh` queues
  `() => { this.refresh(); }` without awaiting the async refresh, so `add` ops queued after it run concurrently. The pad's
  keys now arrive two or three times as a request opens (allowed, the drawer, the job robot), and the first page drive
  measured ten keys on the tulips, each under its twin (276 FAIL, killed). Work-around: stable row ids (`padkey-<op>`)
  and `Logic/Latch` behind a `PAD_SETTLE_MS` (120 ms) Timer. The runtime race is still there for any repeater fed twice.

**Readings** (final commit `1a8a0a8b8`, drives on the deploy `drive-pages.sh` made from it):

- garden specs (7 files) — exit 0, **513 passed, 513 total** (was 502; +11 new).
- `npm run template:garden` — exit 0, drift 0 lines after the commit.
- page drive `drive-cg003-pages.js --mockup` — exit 0, **331/331** (was 328; +3: each IG-006 pass after the first reads
  the last pass's cards from her saved profile).
- IW-001 drive `drive-iw001-workshop.js` — exit 0, **38/38**.
- modes `drive-ig003-modes.js` — exit 0, **90/90**. Island `drive-ig004-island.js --perf` — exit 0, **65/65** (62/62
  without `--perf`: the three perf clauses). Robots `drive-ig005-robots.js` — exit 0, **60/60**.
- Olive page `drive-olive.sh pages` — exit 0, **22/22**. Workshop `drive-ig007-workshop.js` (on `af940fe8a`) — nogl
  exit 0 **8/8**; 3d exit 1 **16 of 18 then a throw** (Garden 3D fired Too Slow under swiftshader and the page fell to
  2D mid-run), rerun exit 0 **24/24** — a lone red on the software renderer, read as a flake.
- shell `node --test` — exit 0, **91/91**.

**ACs:** AC1 ✅ (Stop within one tick: 0 turns after the press; bar idle; Start over; and the §5 trap: Stop while "Olive
is thinking" clears the tag, her late answer moves nothing). AC2 ✅ with a seam (below). AC3 ✅. AC4 ✅. AC5 ✅ as
measured below. AC6 ✅. AC7 ✅ (a reload keeps it; a sibling still sees the card; each kid's list her own in the store).
AC8 ✅ (specs, page drive, modes drive, template byte-identical, 0 console and 0 network errors in every drive run).

**Deviations, with the measurement:**

1. **AC2's program never reaches the cap.** `repeat 9 { until wall_ahead { left } }` from (3,3) ENDS by the until guard
   (`UNTIL_GUARD` 40) at **742 ticks** (spec "F2, measured"), under `MAX_TICKS` 2000; a repeat around it reaches 2000.
   At 420 ms a tick a capped run is **fourteen minutes** — Stop (F1) is what gets a child out; the cap is the backstop.
   The drive plays the run and moves `gardenRun.tick` to the cap − 4 (a named seam); the ticks after it, the stop, the
   bar and the line are the page's own. A page cap lower than the engine's, or stopping on a guard hit, would change
   what "the same program hits the cap" means — a question for Richard, not built (the contract says `MAX_TICKS`).
2. **The cap counts the run's own tick** (Step's Tick, read in the Runner after each tick) rather than a second counter:
   one count, reset by every fresh run with no extra wiring.
3. **F8 owes no on-load write.** The field is optional and omitted when empty, so a v4 profile without it IS the profile
   (the spec reads a stored v4 family: `migrated` false, the model identical, the code 15 rows a profile as before).
   The old `gardenCardsSeen` was never saved, so there is nothing to carry over. §5's trap is met by having nothing to migrate.
4. **AC5 is measured with the Workshop scrolled to the top of the screen.** The page's head takes 250 px at 1024 × 768,
   so at scroll 0 no layout shows 12 blocks beside the world (the 12th block sat at y 779–813 of 768 in the scratch
   measurement). Scrolled, the world, the bar, Olive and the whole program box are on one screen. 20 blocks at
   1368 × 900 fit **with 0 px to spare** (717 ≤ 717) in Teach with the fold offer up; in Drive, the steps note costs
   ~50 px and 20 do not fit. IW-004's Blockly replaces this layout.
5. **F7 keys:** `olive:say-thanks` and `olive:is-it-a` are not keys (they need slots filled; the task names say and
   read). The pad's read shows no "Olive is thinking" tag (the owl row reads the Runner's parked ask only).
6. Clauses changed because this task changed what they grade — page drive: `palTap`, the IG-006 AC5 block (F3/F4), the
   390 AC4 box clause (the program box scrolls now), `PAD_ORDER`, and the new F8 read per IG-006 pass; modes drive: the
   IG-006 deviation 2 clause (the drawer's `?`); Olive drive: `palTap`. Specs: IG-001 D1 (`rnLoop` via `rnCap`), IG-003
   AC4 (the bar's children), the AC4 box CSS, IG-006 dev. 2, the card gate (now F3's), IG-006 AC5 (no chips), IG-007
   AC1 (the four world ports, the bubble fed three ways), IG-001 D10 (say is a key), the kit's Show Help clause.

**Could not verify:** a finger on the tablet (F5's tap against the 8 px drag slop; the drawer strip's scroll by touch);
Richard's read of the `iw1Loop` French line and the ink Stop; the 3D island and robots drives (`--mode 3d`; the island
page is untouched here); the runtime For Each race fixed at its root.

