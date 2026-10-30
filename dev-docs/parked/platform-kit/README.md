# The platform kit (P130 s2, THE-TEST.md §1)

The harness a stranger's agent builds the P130 game under (arm A): the smallest play kit that makes P129's canon
binding. **Prose advises, gates bind**: `CLAUDE.md` is the short note, `tools/check.mjs` is ten refusals. Built
2026-10-30. Not shipped in this form: `node _make/pack.mjs <folder>` makes arm A.

## What is in it

| | what | from |
|---|---|---|
| `kit/knobs.mjs` | `knobs(group, { k: num() · int() · on() · colour() · text() · pick() })`, a live object; legal/resolve/changes/show | Threadspace `models/model.mjs` |
| `kit/model.mjs` | `model(id, { parts, knobs })`: `build()` tags every mesh `userData.part`; `refit`, `live`; nested parts read `a.b` | Threadspace + P129 §4 |
| `kit/place.mjs` | `place(id, { build, size, spawns })`; `loadPlaces()` imports every file in `places/` (the server lists them) | new |
| `kit/design.mjs` | `design/<kind>/<id>.json` deltas through the server; `?design=default`; `roundTrip()` | Threadspace `designs.mjs` |
| `kit/registry.mjs` | everything registers; `what()` prints the page; `census()` for the checker | new |
| `kit/strings.mjs` | `strings/<lang>.json`, `say(key, values)` | new |
| `kit/checks.mjs` | the in-page gates: orphan meshes, round-trip, inert knobs (framed on the parts a knob changes, best of three views) | the shipyard's `runGate` |
| `kit/people.mjs` | the shelf: `makeCrowd` (flat people, one draw call, `pick` by part) and `party(id)` (the same person in real 3D) | the probe's `crowd.mjs` |
| `tools/serve.mjs` | the game's server: static, `POST /__design/…`, `GET /__list/places`, `--root`, `--lan` | Threadspace's |
| `tools/drive.mjs` | headless drives with `expect`, exit 1; first step `{ "viewport": [w, h, dpr] }` | Life Sim's, game-specific steps removed |
| `tools/what.mjs` · `tools/check.mjs` · `tools/chrome.mjs` | the page, the ten gates, headless Chrome for both | new |
| `CLAUDE.md` · `RECORD.md` · `LOOK.md` | the note (P129 §8 + the castle procedure, P118 CANON) and the two records | new |
| `_make/` (not packed) | `make.mjs` = `vendor.mjs` + `fetch-people.mjs` + `bake-people.mjs`; `pack.mjs`; `gate-proof.mjs`; `fixture/`; `lab.mjs`; `arm.mjs` (starts Claude in an arm, sealed: no MCP, no skills, file tools fenced to the arm); `read-lab.mjs` (an arm's sessions and git, as measures) | |

## The people (ruling 9: flat Rocketbox, functional clothes, as shipped)

Twelve people (`_make/people-list.mjs`), six women and six men: soldier ×2, firefighter, builder ×2, paramedic, leather
jacket, T-shirt and jeans, woodsman, gardener, field vest, hood up. Police left out (a flag on the sleeve). Baked
**ahead** (PEOPLE.md §7 finding 5) by `_make/bake-people.mjs`, headless Chrome over `_make/bake.html`:

- **The crowd sheet** `assets/people/sheet.png`: 4096 × 2048, cells 64 × 128 px, 72 cells a person (walk 16, idle 12,
  work 12 there-and-back, fix 12 there-and-back, sit 8, talk 12), 4.2 MB PNG, 32 MB on the GPU (+⅓ mipmaps). No mask
  sheet (no recolouring), so half the probe's texture memory at the same cell size. Every cell also records where the
  head, chest, hips, hands and feet are (`index.json` `points`), which is how `crowd.pick(x, y)` names a part.
- **The party models** `assets/people/party/<id>.glb`: the same person, real 3D, 19 clips inside (Rocketbox mocap idle
  and walk; the rest Quaternius's Universal Animation Library retargeted by Life Sim's `retarget.mjs`), 2.6–5.9 MB each.
- 8.2 s for all twelve on this Mac (headless). 56 MB in all. Licences: Rocketbox MIT (its `LICENSE.md` is shipped
  beside), UAL CC0.

Measured while making it: the Universal Animation Library's `Fixing_Kneeling` kneels down in its first second and stands
up in its last, so the crowd's `fix` is cut to 1–4 s and played there and back (a first bake showed a standing frame at
each end).

## The gates, tuned on the fixture

`_make/fixture/` is a game written to the canon at its smallest: two rooms of the tower (a `room` model with five parts
and nine knobs), twenty flat people living in them (walk, rest, work, fix, talk), one person in real 3D running, pointing
by part. `node tools/check.mjs --root _make/fixture` → **10 / 10 green** (2026-10-30). Its drive at the Surface's
window (1368 × 912 at 2×): 20 flat people and one real one in 20 draw calls.

**Gate 1's false-red rate** (THE-TEST §1 asks for it written down). The fixture as first written, by us, knowing the
canon: **24 reds out of 101 numbers read**. All 24 were real by the gate's rule (no knob, no reason): 18 were values
chosen by eye that became knobs (light colours and height, room margins, lamp size, wall thickness, crowd spread), 6
were constants that needed only a `// why:` (the far plane, the random generator's three constants, a floor's slab).
**No misreads**: the lexer was also run over the kit, the checker and all of Threadspace (9,335 numbers) and every
number it reported was a number in code (none from strings, regexes or GLSL in template strings). The cost is the
volume: a first draft gets a long list, which is the point and the risk (THE-TEST §6: if Opus stamps `// why:` on
every line, that is the finding).

Gate 6 first fired on the fixture's own first build (everything new, the engine included); it now counts an engine
file only when the engine existed before that change. Gate 8 first called the lamp's colour and length inert (its
snapshot looked down through the ceiling); it now frames the parts a knob changes and takes the best of three views.

**Every gate fires** (`node _make/gate-proof.mjs`): fourteen cases, a copy of the fixture broken once per gate, each
must turn exactly its gate red, and three controls (the unbroken copy; a place added without touching the engine; an
editor with its `keep:` line) must stay green. **14 / 14, 2026-10-30.** The controls caught a real bug: the checker
crashed in a folder with `git init` and no commit yet, which is how a stranger's folder starts. And the first full run
read three crashes as three reds (Chrome's profile folder deleted while Chrome still wrote to it: exit 1 either way), so
a red now counts only with that gate's own `FAIL n` line; every case prints the reason it went red.

## Not done (said so)

- The tablet still has not run 200 flat people (PEOPLE.md §4's table is empty); flat was ruled on Richard's eye.
- Gate 8 judges only knob groups a model reads; a group nothing renders (sound, rules, the camera) is listed, not judged.
- Gate 10 is a heuristic: words a player reads that reach the screen another way (a variable built from a literal
  elsewhere) are not seen.
- Nothing here has met a stranger yet: that is s3.
