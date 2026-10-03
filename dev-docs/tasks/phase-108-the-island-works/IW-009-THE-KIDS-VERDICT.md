# IW-009 — The children's verdict

**Opened 2026-09-29.** Merges P106 IG-008 (⬜). **Status: ⬜ — the build sitting is READY (s7: the Mac app, §4–§5); the sitting itself is Richard's.** Two sittings: after IW-000 (the mockup), and after the
build. Richard's task; the notes stay untracked (no names or ages in the repo).

## 1. Why twice

Neither child has played Olive's Island yet (README §5). The mockup is the cheapest moment to learn whether jobs,
meters, dragging blocks and tapping a thing to make a block are fun **before** thirteen missions are rewritten.

## 2. What to watch for (the mockup sitting)

- Do they drag from the drawer, or tap? Do they find the `?` in the drawer, and read the card?
- Do they understand the meter on a tulip / the stages on a path square without being told?
- Does tapping the basket to make a block make sense to the older one? Does the younger one need it?
- Do they want to watch the robot finish and walk home? Do they press "time passes" to see it again?
- Does Stop get used? Did anything feel like a chore?
- Their words, the same day, written into §4 of this file by Richard (or read to the session).

## 3. The build sitting

The same, plus the shop: what do they buy first, do they understand the purchase card, do they want a second robot,
do they name it.

## 4. Ready for the build sitting (P108 s7, 2026-10-01)

Richard chose the **Mac** for it (not a new Windows installer): the packaged app built from the session-7 tree,
`dev-docs/tasks/phase-105-the-coding-garden/garden-desktop/shell/dist/mac-arm64/Olive's Island.app` (§5 says how it was
built and what was checked). Each child makes her own player on the first screen (one island each, no cloud).

**A path through it in about 30 minutes, in the order the game opens up** (a suggestion, not a script — follow what
she wants to do):
1. The first requests on the island (Sami's letter, Mamie's tulip): the Workshop, the drawer, Play, Stop.
2. A job she has won goes on by itself on the island; time passing wears it and her robot goes back. The shells.
3. The shop: a second robot (Cobble comes with Sami's letter), then the spa (30 🐚) in the Build tab, its ghost put
   on her land (the meadow at the bottom right).
4. Her land's card: tap Pip, "Teach Pip here" — the spa's stones; back, tap Cobble — the planks. The spa rises on the
   island; when it is finished both robots go and rest in front of it.
5. The refuge, then a rabbit or a sheep (named by her); a robot taught to feed her; a present when her bowl is filled.

**To make it quicker:** there is no "give shells" button. A session can write a save code (shells earned, the first
requests won) and the Grown-ups page takes it ("Paste a code" → "Replace the islands") — ask for one before the sitting.

**What to watch** is §2 and §3. Add: does she understand that a robot taught on her land keeps working there? Does she
notice the robots resting at the spa, the "+N 🐚" lines, the present? Does anything feel like waiting?

## 5. The build (P108 s7)

Built 2026-10-01 from the session-7 tree (`c051ca68d`), on Richard's Mac:
- `node dev-docs/tasks/phase-105-the-coding-garden/garden-desktop/build-app.js --allow-development-engine` → exit 0
  (`index-6375d994abd3bbd5.js`, origin `http://127.0.0.1:47633`, the model present and its sha256 verified). The
  **development engine**, as every Mac build of this game so far: fine for a sitting on this Mac, never for an installer
  anyone else gets (a production engine is a viewer build first).
- `(cd …/garden-desktop/shell && npm run dist:mac)` → exit 0: `shell/dist/mac-arm64/Olive's Island.app`, signed with the
  Developer ID, not notarized (a local app: macOS opens it on the Mac that built it).
- **Checked:** `drive-upgrade.js --exe "<the app>/Contents/MacOS/Olive's Island"` → **PASS, 10/10 clauses** (the window
  up in 1.6 s, Olive's model ready, a new player and her robot made and renamed, the day's island backup written, all of
  it kept across a relaunch as 0.0.2, the control launch clean, no backend left running). The drive's rename step had
  gone stale (a scripted focus/blur no longer reached My robot's save; real key presses do, measured on the deployed
  build) — re-pointed to real keys (`dev-docs/bugs/p108-s7-upgradedrive-…`).
- Not graded, seen in the drive's log: Electron prints "sandboxed_renderer.bundle.js script failed to run" (a preload
  in a sandboxed renderer) — twice in three launches; the page and every clause were unaffected.
- Everything the island does in this build was driven on the deployed web build of the same tree (IW-007 §4 "Session 7").

**Rebuilt after s8 (2026-10-03, from `746f0dff9`, the template at `4914f6e86`):** the same two steps, both exit 0 —
`build-app.js --allow-development-engine` (`index-1ad13a9b2b92cb01.js`, same origin, model sha256 verified), then
`npm run dist:mac` (signed with the Developer ID at 08:30, not notarized; the app's `Resources/app` carries that
bundle). `drive-upgrade.js --exe "<the app>/Contents/MacOS/Olive's Island"` → **PASS, 10/10 clauses**. This is the
build for the sitting; the s7 one is gone (overwritten in place).

To open it: Finder → `dev-docs/tasks/phase-105-the-coding-garden/garden-desktop/shell/dist/mac-arm64/` → Olive's
Island. It keeps its islands in its own data folder (not the browser), so a sitting starts clean.

## 6. Notes

(empty — her words, the same day)
