# Threadspace — s7: Richard plays the animations, then the next ship (or the next room)

**Written 2026-10-30 at the end of s6.** Read, in order: this file; `README.md` (the s6 section is the animations, s5 the
shipyard, the s4 table the game before it). Verify a claim here by measuring it, not by trusting it. s4, s5 and s6 are
**uncommitted** at the time of writing unless Richard asked for a commit: check `git status dev-docs/parked/threadspace` first.

## Where it stands

Richard drove the shipyard at the start of s6; his verdict is in PLY-009 verbatim (*"FTL meets the SIMs… designing the ship
is a joy. That has to be a core feature"*). Then: *"maybe some animations would be cool, like getting into the airlock and
alarms going off… open the wren's cockpit and jump in… the hanger opens… ask to dock first, the hangar doors open… fly at
least to the door and let the animation take over and land you back in the hangar safely."*

s6 built all of it (README s6 has the detail):

- `src/sequence.mjs`: `Sequence` (tracks that set state from k, events, camera shots, `skip()` lands where the full run
  lands) and `Tweens`. Phase `scene` plays one; E or Tab skips.
- `src/cinematics.mjs`: `airlockOut`, `airlockIn`, `launchSequence`, `landSequence`, each ending in the old verb.
- The Kestrel: the stern is a plate with the bay's mouth cut in it, a split blast door, beacons, a ladder, a turntable;
  the airlock's outer door and the hull's hatch move. The Wren's outer wing panels fold (`foldWings`), her canopy hinges.
- Coming home: E within 1.2 km calls the bay, fly within 70 m astern of the door and the bay's guidance lands her.
- `?cine=0` turns the animations off (the old suites run that way).

**Readings (2026-10-30, each drive alone at `nice 19`, after a quiet minute with no headless Chrome using CPU):**

| drive | reading |
|---|---|
| `sh tools/run-all.sh`: smoke, boarding, eva, command (`?cine=0`), sequences | **38/38, 20/20, 12/12, 27/27, 31/31** |
| `tests/shipyard.json` | **15/15** (the Wren check now passes on her folded span, 7.3 m against the 8 m door, and the test asserts it) |
| `tests/refit.json` | **7/7** |

## Rulings owed by Richard (one line each)

1. **Play the animations** (`npm start`, new captain, walk to the airlock or the bay, E). Too long? Which ones does he
   want to skip by default after the first time? Does the bay guidance take over at the right distance (70 m)?
2. **TS-S5-WRENBAY, decided by default in s6:** her outer wing panels fold up. Keep it, or a smaller Wren / a belly bay?
3. **TS-S5-TURRETWALL**: the turret pod's wall comes 0.23 m through her starboard flank. Widen her, or move the pod inboard?
4. **Commit s4 + s5 + s6?** (s4 has been uncommitted since 2026-10-22; PLY-003 waits on it.)
5. The cutaway as a game mode (his "FTL meets the SIMs"): what would he play in it?

## Next, in order (an agent can do these alone)

1. **The other ships as models**, starting with the Wren (`fighter`) declared like the Kestrel; the shipyard needs a model
   picker (`?model=`). Her fold hinge (x ±3.3) and folded span then become her settings, and the Kestrel's Wren check reads
   her design.
2. **Rooms as geometry, not only colour** (s5's next step 2, still open).
3. **PLY-009's lineup** and **an agent's read of the declaration** (s5's steps 3 and 4).
4. Animation polish, not urgent: shot 4 of the launch frames the Wren leaving but not the Kestrel's doors closing behind
   her; the airlock-out picture as the doors open is only stars (the camera is already past the door frame); the cockpit
   shots show none of the Wren's own nose.
5. From s4, still open: HUD labels overlapping (the BAY DOOR and KESTREL labels sit on each other when you are astern).

## Not observed (needs Richard's screen)

- The animations on a real GPU and with sound: the klaxon, hiss, servos and roar (`sfx.cue`) have never been heard by
  anyone; a drive has no ears.
- How the bay call feels to fly: a drive teleports the Wren to 54 m; nobody has flown her to the door by hand.

## How to run and drive

```
cd dev-docs/parked/threadspace
npm start                                   # :8787; the game at /, the shipyard at /shipyard.html
node server.mjs --port 8795 &               # for drives
nice -n 19 node tools/drive.mjs http://127.0.0.1:8795/ tests/sequences.json shots
nice -n 19 sh tools/run-all.sh              # everything above on :8793; exit 1 on any FAIL
```

One headless Chrome at a time on this box (peers' lifesim and triage drives count); tear the server down when a drive ends.

## What s6 settled

- 🔴 **A timeline that fires events before tracks breaks on a slow frame.** The frame that crossed both the end of the climb
  and "sit in her seat" ran the event first, then the climb's last step placed your body in the wrong frame: you rode out
  standing in space 27 m behind her. Every check passed; only the picture showed it. Events and tracks now run in time
  order, and a check measures your distance from her seat.
- 🔴 **A hand-over that ends against a wall is a defect even when every state check passes**: the landing put you 1.5 m
  from her flank, and the use point was out of reach. Look at the picture of the first frame a person gets back.
- **An alarm is a colour on the room's existing lights, never a new light** (the pool of 8 holds). A lamp panel baked
  into the room can't change colour; the two alarmed rooms' panels are their own meshes.
