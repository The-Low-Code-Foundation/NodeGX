# Château Lumière (parked, round 2: the Swan Wing and four mini-games)

A junior sorceress inherits a haunted fairy-tale château and wins it back room by room. Her spells are Rocket School
questions: a right answer casts, a wrong one lets the creature strike. Each won room lights up and holds a surprise.
Richard's brief is in [BRIEF.md](BRIEF.md), the whole game in [SCOPE.md](SCOPE.md). This folder is the first playable
toy (SCOPE.md §12).

## Run it

```sh
cd dev-docs/parked/lumiere
npm start            # installs three.js + three-vrm, fetches the heroine and her animations, opens http://127.0.0.1:8812/
npm run lan          # the same, reachable from a tablet on the Wi-Fi: http://<this-mac's-ip>:8812/
```

The assets are copied from `../lifesim/public/assets` when it has them, downloaded otherwise (`tools/fetch-assets.mjs`;
both gitignored). Everything except the heroine and her animations is drawn in code.

**Controls:** tap or click the floor to go there (a short hop walks, further jogs, across the hall sprints); drag to
turn the camera; or the arrow keys / WASD, which jog (Shift sprints, Q and E turn). Enter or Space presses the button on
a door's card. Escape or ☰ pauses: questions, thinking time, sound, picture.

## What is in the toy

- **The title:** the château at night (moon, mist, bats, cursed green windows, one gold one), her name, and Rocket
  School's chooser: year CP–5e, subject (or "a bit of everything"), topic.
- **The Grand Hall:** dark marble, pillars, a grand staircase blocked by thorns, portraits whose eyes glow, four potion
  tables (pink Heart Potions +50 HP, blue Star Potions +15 MP, back 45 s after she takes one), and three doors that glow
  violet while cursed. A door's card gives its stars and **what a wrong answer costs in there with what she wears now**.
- **The Dressing Room ★** (one Tatter Moth) → the **Enchanted Wardrobe** (hats, capes, five dresses, five hair colours)
  and the **Starlight Cloak** (hits hurt half as much; she puts it on at once).
- **The Kitchen ★★** (two Soot Sprites; tap a name to aim) → **Chef Mirabelle** and **Magic Cakes**: sponge, tiers,
  icing, toppings, then "Lumière!" bakes it with a spell. A cake in the bag fills health and magic, even mid-fight.
- **The Library ★★★★** (the Grumpy Grimoire) → the **Moonlit Staff** (spells hit twice as hard). At the start one wrong
  answer here knocks her out; with the cloak it takes two.
- **Fights:** Magic (a question, a moon that empties: 30 s by default), Items (free), Run. Answered in the first third of
  the time = **Brilliant!** (×1.5). No magic left = a staff bonk (×0.4). A miss shows the right answer and Rocket's
  explanation while the creature strikes. Knocked out = Lumi carries her to the Hall with 30% health.
- **Winning a room:** the creature turns back into what it was (a silk butterfly, fire fairies, a storybook), a ring of
  light runs out from her, and the room turns from cold, foggy and boarded-up to warm, sunlit and beautiful.
- **Saved** in the browser (`lumiere.save.v1`); "Start a new château…" in the pause menu wipes it.

The numbers live in `public/src/data.mjs` (SCOPE.md §6 explains them), so a playtest can retune without touching code.

## Round 2 (2026-11-12): the Swan Wing

Richard after round 1c (BRIEF.md): she still walked backwards in a won room, the won rooms glared, the Library had no
mini-game, "ready for more levels", and new mini-games "plus the option of repetition with variables". So:

- **Fixed:** walking mirrored after a fight (the fight start's `lookAt` left a half-turn on x and z; `moveHero` now
  also flattens any such turn) and the glare (won-room lights, fog, glass, light shafts and bloom all down).
- **The Library: Archivist Hoot's shelf** (`books.mjs`). Six books: the château's story, great-aunt's Moon Biscuits
  recipe, the Bestiary (a page per creature, filled once it is freed), Hoot's owl jokes, a guide to the Swan Wing, and
  the Moon and the stars. Each ends in Hoot's question; a right answer is a star on its spine, six stars the **Owl
  Quill** (+10 magic).
- **The Swan Wing.** Winning the Library opens a door at the back of the Hall onto the **Swan Gallery**, a long corridor
  of stained glass and potion tables with three doors. Like the Hall it brightens as its rooms are won.
  - **Music Room ★★★** (two Off-Key Sprites) → **Maestro Fig**, a frog in a tailcoat, and the **piano** (`piano.mjs`):
    Find the note (eight notes on the stave, do ré mi with C D E), then five songs, each played twice over: Follow the
    glow (silver star), then Read the music with no names and no glow (gold star). Fig plays each tune back. Reward:
    the Song of Courage, +50 health.
  - **Tea Room ★★★★** (a Nibble Moth and a Crumb Sprite) → **Chef Praline** and **biscuits** (`biscuit.mjs`): dough,
    cutter, icing, sprinkles, then a spell. The Moon cutter is locked until she has read great-aunt's recipe in the
    Library; Moon Biscuits are two in the bag. A biscuit gives back 40 health and 10 magic. Reward: the Sugar-Glass
    Charm (ward 2: hits hurt a third).
  - **Ballroom ★★★★★** (the Midnight Moth Queen, 200 health) → **Madame Lune**, a moonlight butterfly, and the **ball**
    (`dance.mjs`): arrows fall down four lanes in time to a tune; tap or press ← ↓ ↑ → on the line. Perfect, Good or
    Missed; one to three stars per dance (the Waltz, the Polka, the Gavotte). Reward: the Dawn Staff (power 30), and
    four ballgowns, a moon crown and a midnight cape in the wardrobe.
- **Repetition with variables.** The cake and the biscuits are one bakery (`BAKERY` in main.mjs: each bake is its steps,
  its options, its model and its reward), the songs are `SONGS` and the dances `DANCES`. A later kitchen, music lesson
  or ball adds an entry, not code.

## The look (round 1b, 2026-11-01)

Richard after round 1: the walking was "painfully slow" and the château wanted a second visual pass. So:

- **Her paces:** walk 1.6 m/s, jog 3.4, sprint 5.6 (round 1: 0.95 and 1.6), on the walk, jog and sprint animations,
  each sped up to match (only so far: see `PACE` in main.mjs). She eases between them, slows as she arrives, leaves
  stardust when she runs, and at a sprint the view widens a touch. A tap leaves a rune ring where she is going.
- **Everywhere:** one shared environment map (gold, marble and glass shine), a vignette and colour grade, light shafts
  that are real cones of dusty light, low mist over the floor of a cursed room, wall sconces that burn witch-green
  while cursed and gold once won, panelled doors with gilded mouldings and a stained-glass fanlight.
- **The Grand Hall:** a mirror-polished marble floor (Pretty only), fluted columns with gilded bases and capitals,
  dressed stone, a stained-glass rose window over the gallery with its shaft of light down the stairs, a crimson runner,
  balusters and handrails up the stairs, newel lamps, a turning violet rune on each cursed door, potion auras.
- **The rooms:** a hearth of flickering flame with embers (kitchen), a moonbeam from the rose window and haloed floating
  candles (library), sconces and mist in all three.
- **Fights:** a magic circle opens under her as she gathers a spell; the bolt is a comet with a spinning star; it lands
  in a ring of light. Winning a room: a burst of sparkles and a shock ring, then a pillar of light and a turning rune
  under her while two rings of light run out across the floor.

## Checks

```sh
sh tools/run-all.sh   # smoke (title → first room → wardrobe), kitchen (two sprites, cakes), library (knockout, potions),
                      # speed (three paces, a far tap sprints, a near one walks); then on the GPU: after-fight (she
                      # walks forward in a won room after its fight), bright (won rooms not washed out), books, wing
                      # (the Hall's new door, the Gallery, the Music Room fight), piano, tea, ball, gown
```

Run it outside any sandbox (headless Chrome won't start inside one). Last green: 2026-11-12 (round 2), all on the GPU
(`DRIVE_GPU=1 sh tools/run-all.sh`): smoke 11/11, kitchen 5/5, library 3/3, speed 2/2, after-fight 2/2, bright 1/1, books
10/10, wing 6/6, piano 10/10, tea 10/10, ball 6/6, gown 4/4, and every `waitFor` in them (a `waitFor` prints only when it
fails). Without `DRIVE_GPU=1` the first four run in software GL; on a busy machine (load 12+) they time out waiting, so
a red there is first rerun on the GPU.
`DRIVE_GPU=1 node tools/drive.mjs <url> tests/perf.json shots/perf` draws on the Mac's GPU instead and times forced
frames in the Hall. `tests/forward.json` (round 1c, about 4 minutes, GPU only: `DRIVE_GPU=1`, with
`?fresh=1&mute=1&timer=off&quality=low&won=dressing&at=dressing`) holds ↑ from 72 spots and headings, and again the
moment a fixed view hands the camera back, and checks she never runs at the camera. The lab pages show one part at a time:
`/lab/hero.html`, `/lab/places.html?place=kitchen&f=1`, `/lab/creatures.html`, `/lab/exterior.html`, `/lab/cake.html`
(drives in `tests/lab-*.json`; `tests/lab-cape.json` shows the cape from the side, close at the clasp, jogging and
sprinting).

**On the web: https://nodegx.io/lab/lumiere/** (unlisted, `noindex`; live since 2026-11-01; round 2 pushed 2026-11-12, the live smoke and wing drives green on the GPU). To update it:

```sh
node tools/build-static.mjs ~/vscode_projects/nodegx-web/site/lab/lumiere   # the copy a full site deploy keeps
rsync -az ~/vscode_projects/nodegx-web/site/lab/lumiere/ nexus:/srv/nodegx/site/lab/lumiere/
ssh nexus 'chown -R caddy:caddy /srv/nodegx/site/lab/lumiere'
```

Explicit source and target folders: macOS rsync ignores `-R`'s `/./`. Then drive the live page:
`DRIVE_GPU=1 node tools/drive.mjs 'https://nodegx.io/lab/lumiere/?fresh=1&mute=1&timer=off' tests/smoke.json shots/smoke-live`.

Test URL switches: `?fresh=1` (no save read or written), `?auto=1` (skip the title), `?at=kitchen` (start in a room),
`?won=dressing,kitchen`, `?at=hall` / `?at=gallery` (a hub; `?at=music`, `tearoom`, `ballroom` start in a fight), `?timer=off|relaxed|normal|brisk`, `?quality=low|high`, `?mute=1`. `window.__game` is the
drives' handle (`state`, `save`, `answer(right)`, `walkTo(x, z)`, `enter(id)`, `toasts`, and since round 1c `cam`
and `follow(opts)`; round 2: `openBooks()`, `openPiano()`, `openBake('cake'|'biscuit')`, `openDance()`, and `mini`, the
open mini-game's own handle for drives). A mini-game opener awaits its panel closing, so after a click on its close
button `waitFor` the state to come back to `explore`. A drive's `eval`s share the page's top-level scope: a second `const o` in another step is a
SyntaxError, so wrap a step's own names in `(() => { … })()`.

## Files

| File | What it holds |
|---|---|
| `public/src/main.mjs` | The game: title, moving about, doors and potions, the HUD, rewards, the wardrobe, the bakery (cakes and biscuits), the mini-games' openers |
| `public/src/battle.mjs` | A fight: the windows, questions, casting, strikes, victory and knockout |
| `public/src/castle.mjs` | The Hall, the Swan Gallery and the rooms in code, each with a dark and a won state (`Mood`) and the light sweep; the piano |
| `public/src/books.mjs`, `piano.mjs`, `dance.mjs`, `biscuit.mjs` | Round 2's mini-games: Hoot's shelf, Fig's piano, Madame Lune's ball, Praline's biscuits |
| `public/src/friends.mjs` | Hoot the owl, Maestro Fig the frog and Madame Lune the butterfly |
| `public/src/hero.mjs` | The heroine: the VRM loaded, the animations baked on, dyes, hat, cape, skirt, staff; Mirabelle is a copy |
| `public/src/creatures.mjs` | The Tatter Moth, the Soot Sprite and the Grumpy Grimoire, with their attacks and freed forms; round 2's are dyed and resized copies of them (`VARIANTS`) |
| `public/src/exterior.mjs`, `cake.mjs` | The château at night (the title); Mirabelle's cakes |
| `public/src/fx.mjs` | Bolts, sparkles, numbers, shake; the shock ring, the tap's rune ring, the magic circle under her (`channel`) |
| `public/src/look.mjs`, `audio.mjs` | The renderer, bloom, grade and environment map, and the shared glow, light-shaft and rune pieces; sound made in the browser |
| `public/src/data.mjs` | Every number and reward |
| `public/src/school/` | The questions: a copy of the life sim's copy of Rocket School (`school.mjs` + `rocket.mjs` + `france.mjs` + `stem.mjs`) |
| `public/src/retarget.mjs`, `face.mjs` | Copied from the life sim unchanged: clip baking and the face |

## Not measured yet

- **The family's tablets.** Everything was checked on the Mac in headless Chrome (software rendering). The Hall has
  about ten lights, a bloom pass and (round 1b) a mirror floor. On the Mac's M1 (`tests/perf.json`, 1600×1000, a
  forced frame each): Pretty 13.2 ms, of which the mirror is about 2 ms (it was 4.3 at 1024² before it was halved to
  512²); Simple 11.4 ms. If the tablet stutters on Pretty, the mirror is the first thing to cut (`Reflector` in
  `buildHall`, castle.mjs); a stutter on Simple too means fewer lights.
- **Round 2's frame costs** (`tests/perf.json`, GPU, 2026-11-12, but with the machine's load at 7–20, so noisy): the
  Swan Gallery 12–13 ms, the Music Room 9.5–11, the Ballroom 11, the Tea Room 15.5 (21.7 until its glass domes lost a
  `transmission` material, which draws the room twice). The dark Hall read 19–23 ms against 13.2 on 11-01; an A/B in
  one page (the Wing door and its light on, then off) showed no difference beyond the noise, so whether the Hall is
  slower is not settled. Measure it again on a quiet machine, then on the tablet.
- **Her verdict.** The five playtest questions are in SCOPE.md §12; her answers go in BRIEF.md, verbatim.

## Credits

The heroine is pixiv's VRoid sample (VRM Public License 1.0); the animations are Quaternius's Universal Animation
Library (CC0). See `public/assets/CREDITS.md` once fetched. Everything else is made in code here.
