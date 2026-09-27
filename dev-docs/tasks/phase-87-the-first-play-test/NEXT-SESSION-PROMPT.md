# Phase 87 — next session

**Read first:** [`README.md`](README.md), then the session 10 records: §5 in [RKT-008](RKT-008-THE-PLAYER-MENU.md) and
[RKT-011](RKT-011-THE-HANGAR.md), and §6 in [RKT-009](RKT-009-MORE-KINDS-OF-QUESTION.md). Older rulings and traps: RKT-010 §5,
RKT-007 §5, RKT-006 §5, and TPL-007 §10–§11 (`../phase-78-the-templates/TPL-007-THE-MATHS-AND-TYPING-GAME.md`).

**The board, from the task files (2026-09-14, after session 10):** 0/11 closed. Every close needs Richard's replay (README §6: a
tablet and a French laptop). **Every task a builder can finish is built.** What is left is Richard's, apart from the open item below.

| task | state |
|---|---|
| RKT-001 text that wraps | built: AC1–AC5 ✅; AC6 waits on Richard |
| RKT-002 the look | AC1–AC4 ✅; AC5 waits on Richard |
| RKT-003 one screen per question | built: AC1–AC5 ✅; AC6 waits on the tablet replay |
| RKT-004 "Show me how" teaches | built: AC1–AC5 ✅; AC6 waits on Richard |
| RKT-005 the answer pad | built: AC1–AC5 ✅; AC6 waits on Richard |
| RKT-006 restart from inside the race | built: AC1–AC5 ✅; AC6 waits on Richard |
| RKT-007 the clock and the boost | built: AC1–AC4 ✅; AC5 waits on Richard |
| RKT-008 the player menu | **built in session 10: AC1–AC7 ✅** (template builds 7 and 8); closes on Richard's replay |
| RKT-009 more kinds of question | **AC1 ✅ (session 10's briefing)**; AC2 needs Richard's ruling on the shortlist, then build |
| RKT-010 stars that add up | built: AC1–AC9 ✅; AC10 waits on Richard |
| RKT-011 the hangar | **built in session 10: AC1–AC9 ✅**; AC10 waits on Richard |
| RKT-012 a wrong key is refused | **added and built 2026-09-14 at Richard's request: AC1–AC5 ✅** (gates 200 + 73, `drive-rkt012-wrong-key.js` ALL PASS EN+FR, sabotage red); AC6 waits on Richard, who also feels whether 3 wrong keys should be a miss. Deploy `rocket-rkt012` in session `3ea2339d…`'s scratchpad, not served. The board is now **0/12** |

**2026-09-14, at Richard's request (session `b72700d9`): Make Ten Merge is built and the hangar left Home's games.** Read
[TPL-007 §13](../phase-78-the-templates/TPL-007-THE-MATHS-AND-TYPING-GAME.md). The hangar is now the player menu's first item and Home's
bar to the next pick ([RKT-011 §5](RKT-011-THE-HANGAR.md)). Template build 3 of that session (`merge3` in its scratchpad, not served):
gates 283/283, `drive-tpl007-merge.js` ALL PASS, hangar screen arm and menu drive ALL PASS. Open for Richard: the pool and star
constants, swipe, and an older empty Langue row in the French menu (TPL-007 §13.4). Uncommitted, like everything here.
After Richard's first play ("bloody hard"; a full board "doesn't say anything"): **Easy/Hard modes, a full-board hint and a greyed lock**
(TPL-007 §13.5, ruled). Build 4 (`merge4`): gates 288/288, every drive arm ALL PASS; served for him on `http://127.0.0.1:8780/`.

**2026-09-14 evening, at Richard's request (session `d1980510`): Number Hunt is built** — read [TPL-007 §14](../phase-78-the-templates/TPL-007-THE-MATHS-AND-TYPING-GAME.md).
Build 3 (`hunt3`): gates 305/305, `drive-tpl007-hunt.js` play ALL PASS on builds 2 and 3, screen ALL PASS on build 2 (build 3 adds only four node comments),
served on `http://127.0.0.1:8781/`. Open for Richard: five grids, help after two misses, a star a way (§14.4). 🟡 `def038`'s rocket-school
control is red from its own choice of key, not from Hunt (§14.3). Uncommitted. Home is at 31 of 32 page nodes.

**🌐 PUBLISHED 2026-09-14 at Richard's request: <https://nodegx.io/templates/rocket-school/>** (TPL-007 §15). The live build navigates by
HASH, from a copy of the project: path navigation under `--base-url` leaves the base and 404s on reload (**D74**). Republishing must repeat
the copy (§15.3). Driven on the public URL: Hunt, Home + menu, Merge, and the race stage (`drive-rkt003-stage.js`, 4 cells) ALL PASS. 🟡 `drive-tpl007-rocket.js` is stale since P87 (14/17 on
any build).

**Template build 8 (`rocket-m8`) is served at `http://127.0.0.1:8779/`** from session 10's scratchpad (`cda04be0…`), which may be gone;
redeploy with the commands below. It carries everything from RKT-001 to RKT-011, including RKT-008 and its AC7. Build 5 (the hangar,
without the menu) is still on 8776.

## Do, in order

1. **🟡 Decide: the stage drive's `focusNext` on a timeout round is the probe's timing, measured.** The product focuses Next.
   - The `--keys` arm, EN 1366×768, red on the timeout round:
     - build 7: 2 of 4 runs
     - build 5: 0 of 4 (the control)
     - **build 8: 2 of 6**
   - **Both build 8 reds, with session 10's new message:** at the verdict's first reading the focus was on `BODY`, and **600 ms later it was
     on `BUTTON Next`**. So Next gets the focus a little after the drive's first look, well before a child could read "Time's up." and
     press Enter.
   - The cause fits the code, but the gap is not timed: `FOCUS_BUTTON_SCRIPT` focuses one frame after the card mounts, and the drive reads
     at the first poll showing the verdict. Builds 7 and 8 are heavier than build 5, which may widen the gap.
   - **Session 10 left the clause as it was** (graded at the first reading). The choice for you:
     - grade "focused within one poll" (e.g. 250 ms), and say so in RKT-003
     - or focus Next without waiting a frame, and see whether 0 of N holds
2. **Richard's replay of build 8** (8779), on a tablet and a French laptop. Record his words in:
   - RKT-002 AC5, RKT-003 to RKT-006 AC6, RKT-007 AC5, RKT-010 AC10 and RKT-011 AC10
   - RKT-008 (it has no human AC, but the phase close is his replay)

   What to try, per task:
   - **RKT-008:** tap the name on Home → the menu. Rename, change class, delete a second player. On a French keyboard with an English
     player, type one key in a typing race: the map turns AZERTY. The FR / UK / US dropdown sits at the keyboard's corner.
   - **RKT-011:** finish a race past 15 ⭐ → "🎁 Tu as gagné un choix !" → the hangar → a face item and a paint → the next race.
3. **RKT-009 build**, once Richard rules the shortlist in the briefing.
4. **D63** (player two graded into player one's model) has no task yet. It needs Richard's choice: a throwaway model or a second profile.

Keep these drives green after any change to the stage, the result screen, `Game/Header`, the menu, Home or the keyboard:
- `drive-rkt008-menu.js` (14 cells), `drive-rkt008-keys.js` (2 arms), `drive-rkt008-home-lang.js`
- `drive-rkt011-hangar.js` (`--arm pick`, `--arm screen`, `--reduced`)
- `drive-rkt010-stars.js`, `drive-rkt007-boost.js`, `drive-rkt006-restart.js`, `drive-rkt003-stage.js` (with `--keys`), `drive-rkt004-teach.js`,
  `drive-rkt005-pad.js`

## Human decisions (not the builder's)

- 🟡 **RKT-009:** the shortlist. The top three are a tap-to-place number line, "Who is right?" and fill the gap.
- 🟡 **The race rewards guessing:** a wrong answer costs nothing, so four fast buttons beat typing. This bears on RKT-009, and on
  RKT-008's "Answers: Buttons", which a child can now pick.
- 🟡 **RKT-011:**
  - 6% of Smile faces already wear the Crown, so a pick on it changes nothing for them. Turn the Smile face's random accessory off?
  - The curve (15/40/75/120/175, then +60) is a play-test value.
  - Header faces are 40 px now (D65), which is smaller than the build he played.
- 🟡 **RKT-008:**
  - The menu opens under the bar, in the page, not as a sheet or popover.
  - There is no Pad row, because nothing reads a pad setting.
  - UK is `qwerty-uk`, drawing QWERTY's letters.
  - The keyboard dropdown is a plain browser select.
  - The Profiles page's "English · Français" link and the cards' edit affordance were not built.
- 🟡 **Earlier, still open:**
  - RKT-010: stars pop in (they do not count up); on a phone the stars tile gets its own row.
  - RKT-007: "turbo".
  - RKT-006: no confirmation on Restart.
- **Committing.** Nothing from TPL-007 or this phase is committed. Ask Richard first.

## Serve it and drive it

```sh
node library/modules/game-kit/build.mjs      # only after a kit change, and BEFORE the generator
npm run template:rocket                      # check GEN_EXIT=0; TPL007_DIAG_DETAIL=1 prints every diagnostic
node packages/noodl-preview/dist/nodegx-deploy.cjs templates/rocket-school <scratch>/rocket
node -e "require('./scripts/devtools/drive-deployed.js').serveFolder(process.argv[1], 8779)" <scratch>/rocket
node scripts/devtools/drive-rkt008-menu.js <scratch>/rocket --shots <dir>     # row × 10, edit × 2, delete, answers; ~12 min
node scripts/devtools/drive-rkt008-keys.js <scratch>/rocket --shots <dir>     # detect + pick
cd packages/noodl-mcp && npx jest tests/tpl007GameKit.test.ts tests/tpl007Engine.test.ts tests/tpl007Template.test.ts   # 268
npm run typecheck:mcp
```

The 19-drive regression set is `regress.sh <deploy> <log> <shots>` in session 10's pre-clear scratchpad
(`3d93c33e…/scratchpad/regress.sh`, ~50 min). Copy it into your scratchpad if it is gone. Run one drive at a time.

**Readings from session 10 (2026-09-13 to 14), on the uncommitted tree over HEAD `eb12ebe99`:**
- **RKT-011:**
  - hangar build 5: gates 259/259, pick 13/13 × 3, screen × 6, reduced 7/7
  - build 3's regression set: 18/19, and the one red (the Défi clock cell) was 11/11 in six re-runs
- **RKT-008:**
  - **RED first:** the engine gate on build 5 (2 failed); the bar 106 px (phone 158/214), all 10 cells; AC7 `detect` red, no dropdown
    (build 6)
  - build 6: two faults (D66, and a drive clause), both fixed
  - **build 7:**
    - gates 268/268
    - menu 14/14 cells
    - hangar pick/screen/reduced all exit 0
    - regression set 18/19 (the red is the focus item above)
    - keys `detect` red, from one script fed a report and a pick
  - **build 8:** gates 268/268, typecheck 0, deploy 0, **keys `detect` 4/4 and `pick` 7/7**, pad typing 0
- **RKT-009:** the briefing, cited
- **Not run:** `test:ci`, `test:main`

## Traps (session 10)

- 🔴 **After a `/clear`, a running drive and a queued waiter were this session's own pre-clear work** (the same CLI pid). `ps | grep`
  missed the waiter, and it ran anyway. Read task notifications and output files.
- 🔴 **A known-firing clause that reads false is a blind instrument.** The hangar's `expected` could not see the crown on a Smile seed that
  already wore one. Measure the input before blaming the product.
- 🔴 **A drive finder that only the new build satisfies reads the old build as `null`,** and grades nothing. Find what both builds share.
- 🔴 **One script fed two wires, where one carries a live value, reads that value on every run.** The header's settings and the race
  page's keyboard both needed two `Update settings`. An engine gate that feeds one input at a time cannot see it.
- 🔴 **D66: a wire to a built-in node's input that doesn't exist passes the door.** Only the console and a clause saw it.
- **A page is capped at 32 nodes.** Home was at 31, so the menu's scripts live in `Game/Header`.
- **A Function node with no inputs runs only when told:** wire a `didMount` to its `run`. Its script ports are `in-x` / `out-x`.
- **A Dropdown's Items is an `optionslist`.** A Static Data array raises `type-incompatible-connection`; a Function's output does not.
- **The monitor deduplicated exit lines by text,** so the regression set's `KEYS_EXIT=1` hid behind the keys drive's own line of the same
  text. Give every exit a unique name, or read the logs directly.
- **Peer sessions:** Richard's AC7 ruling arrived through a peer at 22:40. Its socket was gone by the time of a reply.

⚠️ **Nothing from TPL-007 or this phase is committed:** the template, kit, generator, gates, every `drive-rkt0*.js` (`drive-rkt008-menu.js`
and `drive-rkt008-keys.js` are new), fonts, and this folder. P78's register (D58–D66) is modified and uncommitted too. Ask Richard
before committing; commit by pathspec, and `git add` untracked paths first.
