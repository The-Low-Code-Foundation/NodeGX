# Château Lumière: the next session

**Where it stands (2026-11-12, round 2):** Richard played round 1c and asked (BRIEF.md, dated, verbatim) for two fixes,
a mini-game in the Library, "more levels", and new mini-games "plus the option of repetition with variables". Round 2
did all of it (README.md, "Round 2"):

- **Fixed:** walking mirrored in a won room after its fight (ledger `parked-lumiere-r2-lookatflip-*`) and the won-room
  glare (`parked-lumiere-r2-glare-*`).
- **Library:** Archivist Hoot's shelf of six books with a question each; six stars = the Owl Quill.
- **The Swan Wing:** a door at the back of the Hall (opens with the Library) → the Swan Gallery → the Music Room
  (Maestro Fig's piano), the Tea Room (Chef Praline's biscuits) and the Ballroom (Madame Lune's rhythm dance).
- **Repetition with variables:** `BAKERY` (main.mjs), `SONGS` (piano.mjs), `DANCES` (dance.mjs) are data.

Suite green on the GPU, `DRIVE_GPU=1 sh tools/run-all.sh`: 12 drives, 80 checks (README.md "Checks"; in software GL the
first four time out when the machine is busy). Nothing is committed (the whole folder is untracked). **The live copy at
nodegx.io/lab/lumiere is still round 1c**: rebuild and re-push it only when Richard asks (README.md has the commands).

**Read first:** BRIEF.md (Richard's words), SCOPE.md §13 "As built" (where round 2 parts from the scope tables),
README.md "Round 2", the URL switches and the files.

## Next, in this order

1. **Ask Richard how round 2 played,** for her and for him. His words into BRIEF.md, verbatim and dated. Fix what they
   hit first.
2. **Tuning.** "A little easy" (11-01) is still untouched. Round 2's rooms were set by sums, not by play: the Music Room
   ★★★ (two 60s), the Tea Room ★★★★ (two 70s), the Ballroom ★★★★★ (one 200). Check the door cards' costs read right with
   each gear set, and ask whether the dance's Perfect window (0.11 s) is too tight for her on a tablet.
3. **Frame cost, then the tablet.** The dark Hall read 19–23 ms on the M1 under heavy load against 13.2 on 11-01, and an
   A/B of the new Wing door showed nothing beyond the noise: time it again on a quiet machine before believing either.
   Then the tablet, never measured (README.md "Not measured yet").
4. **More levels.** SCOPE.md §13 round 3 (the Rose Wing corridors, the Sewing Room) or what she asks for. A new room
   is: a `ROOM_SPECS` entry + a `furnish…` function (castle.mjs), a `ROOMS` entry + `REWARDS` + `CREATURE_NAMES` /
   `FREED` (data.mjs), a `VARIANTS` dye of an existing creature (creatures.mjs), and a feature kind wired in
   `nearby()` and `OPEN` (main.mjs). A repeat of a mini-game with other variables is a new `BAKERY` / `SONGS` /
   `DANCES` entry.

## Things that will bite

- **Never turn her with `lookAt`.** `Object3D.lookAt` can store a turn as (π, y, π); everything that steers her only
  sets `rotation.y`, so she walks mirrored. Set `rotation.set(0, atan2(dx, dz), 0)`. `moveHero` flattens such a turn
  now, but a fixed view that reads her rotation before the next move would still see it.
- **Drive the round-2 rooms on the GPU** (`DRIVE_GPU=1`). In software GL a screenshot in the Music Room stalled past the
  45 s limit. `run-all.sh` exports it for those drives.
- **A mini-game opener awaits its panel,** so the code after it (state back to `explore`, the HUD) runs a microtask
  after the close click. A drive must `waitFor` the state, not read it in the same `eval`.
- **Without `?at=` the game opens on the title** (state `title`, `place` null). The Hall is `?at=hall`.
- **A fight's opening camera is clamped inside the room** (`place.W` / `place.D`): a deep room's battle camera outside
  its walls drew a black slab. A new room's `battle.camera` must sit inside it.
- **Staging a mini-game:** the side panel covers the right quarter of the screen. Aim the camera so the heroine, the
  thing she makes and the friend sit in the left three quarters (the biscuit bake is the worked example: `stand` and
  `cam` in `BAKERY.biscuit`, `chefAt` in `furnishTea`).
- **Vertical text** (the books' spines) needs `text-orientation: sideways`, or the apostrophe stands upright and reads as
  a dash.
- **Headless timings lie.** Software GL runs a few frames a second and the game caps a frame's step at 0.1 s: check
  speeds through `__game.hero.speed`. For frame costs, `DRIVE_GPU=1` and `tests/perf.json`.
- **A long `eval` in a drive is cut at 45 s** and reported as `[stuck]`: start a long loop with `void (async …)()` and
  `waitFor` its outcome. Evals share one scope: wrap a step's names in `(() => { … })()`.
- **A copy of the VRM** (Mirabelle, Praline) has no three-vrm of its own: `hero.mjs` rebuilds the twist constraints on
  the copy and strips what the original wore. Dyes are keyed by material NAME.
- **The bloom starts at 1.3** (strength 0.45 since round 2). Anything meant to glow needs emissive 2 or more.
- **Chrome drives run outside the Bash sandbox,** niced, one at a time. `run-all.sh` starts its own server on 8819:
  stop any other server there first, by PID (`lsof -sTCP:LISTEN -ti :8819`), never by name.
- **The kids' names stay out of this public repo.**
