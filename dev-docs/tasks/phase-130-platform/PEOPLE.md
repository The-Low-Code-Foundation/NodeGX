# The people: hundreds on a Windows tablet

**The question:** two hundred dwellers in view (Fallout Shelter's own cap) at 30 fps on a Surface Pro 2017 (Core m3-7Y30,
HD 615, 4 GB, Chrome or Edge on Windows 10), and 60 fps on a consumer laptop. Nothing below is claimed until the probe in
§4 has run on the tablet.

## 1. What we already measured (Life Sim, 2026-10-27, same tablet)

| people | kind | tablet | note |
|---|---|---|---|
| 1 | VRM (anime, skinned) | 59 fps | 5.4 s load per Sim |
| 6 | VRM | 44 fps, 21 ms main thread | 855k drawn triangles |
| 12 | VRM | 44–47 fps, 17–19 ms | 36k triangles each (hair 16.6k) |
| 12 | Rocketbox realistic (skinned, welded, ~1.1 MB GLB) | 58–60 fps, 9–10 ms | about 0.8 ms a person |
| 12 | Quaternius low-poly | 60 fps | — |

The arithmetic kills the obvious route: 200 skinned people at 0.8 ms each is 160 ms a frame. Skinning on the CPU (one
`Skeleton.update` and one bone-texture upload per person per frame) is the cost, not the triangles. Life Sim also found
that `SkeletonUtils.clone` gives every clone its own skeleton even when the source shared one; re-sharing was the fix for
twelve and is not a fix for two hundred.

## 2. The routes

| route | how | what it costs | what it gives | what it loses |
|---|---|---|---|---|
| **A. Sprites rendered from the 3D models** (recommended to probe first) | at build time, render each person's clips (idle, walk, work ×3, sit, fight ×2, fall, climb) from the game's fixed side camera to a sprite sheet; at run time, one `InstancedMesh` of quads, a per-instance frame index and a palette swap in the shader for hair, skin and clothes (Life Sim's per-region masks already exist) | a baking tool (Life Sim's `convert-people.mjs` pipeline does the heavy half); sheets at 128 px tall: about 12 clips × 12 frames × 128 × 64 × 4 B ≈ 4.7 MB a person uncompressed, 12 base people ≈ 56 MB of texture, less with 96 px or fewer frames | two hundred people in **one draw call** and no skinning at all; the "2D platformer" look is literal; hundreds of distinct dwellers from 12 bodies × palettes | no turning (left/right by mirroring only); flat lighting (fine for the look); close-ups weak, so the party you control uses the real model |
| **B. Vertex animation textures** (`three-vat`, or our own baker) | bake each clip's vertex positions into a texture; the GPU reads the frame per instance; one draw call per body type | the texture: verts × frames × 8 B. A welded Rocketbox at ~10k verts × 10 clips × 24 frames ≈ 19 MB a person, too much for 12 on 4 GB; a 1.5k-vertex low-poly ≈ 3 MB | real 3D shading, turning, any angle; PlayCanvas's crowd example drew 10,000 at 2.1 ms CPU (not three.js, not this GPU) | needs low-poly people (KayKit, Kenney, Quaternius); the look is stylised, which Richard rejected for Life Sim; a baker to write and debug |
| **C. Instanced skinning** (`@three.ez/instanced-mesh`, InstancedMesh2 with `setBonesAt`) | one skinned mesh, per-instance bone matrices in a texture, one draw call | a library dependency; bone uploads per frame are still the cost it warns about | real skinning per instance, real models, LOD | still CPU skeleton updates per person; unmeasured on an HD 615 |
| D. Stock three.js skinned clones | what Life Sim does | nothing new | — | 12 is the ceiling on the tablet; **out** |

Core three.js has no skinned `InstancedMesh` or `BatchedMesh`; the two library routes (B, C) are third-party and must be
pinned and read before use.

## 3. The recommendation, and why

**A for the crowd, the real skinned model for the few.** The side view is fixed, so the one thing sprites lose (turning)
is not needed; the one thing the game needs (two hundred bodies walking, working, sitting) is what sprites are for. Richard
picked realistic people over stylised for Life Sim (*"not stylised it's terrible"*), and route A keeps that: the sprites
are the Rocketbox people, lit once at bake time. The party on an expedition is at most three, plus the monsters: the
skinned Rocketbox models and Life Sim's mocap clips carry that at Life Sim's measured cost, with room to spare, and the
camera is close enough that it matters there.

Fallback: B on a low-poly set if the sprites read as cardboard at the room zoom. Richard judges that on the probe page,
side by side.

## 4. The probe (one sitting, before the harness ships a shelf)

One static page, run on the tablet by Richard (as Life Sim's benchmark was) and headless on the Mac for the pixel gates:

| arm | what | measure |
|---|---|---|
| A1 | 200 sprite people, 12 bodies, random palettes, walking and working, two zooms | ms a frame, draw calls, memory, Richard's eye at the room zoom |
| A2 | the same with 400 | the ceiling |
| B1 | 200 VAT low-poly (KayKit Adventurers, CC0) if a baker is cheap enough in the sitting; otherwise skipped and said so | the same |
| C1 | 100 InstancedMesh2 skinned Rocketbox | the same; where the CPU cost lands |
| D1 | 24 stock skinned clones (the known-firing control) | what we know, as the yardstick |

Gates: a probe arm that cannot hold 30 fps at 200 on the tablet is out. Richard's verdict on the look, verbatim, decides
between the survivors. Memory's traps apply: Chrome's CPU throttling does not model a slow CPU for a rAF page (measure on
the tablet itself); Chrome RSS on macOS is not a memory figure (`HeapProfiler.collectGarbage` + `Runtime.getHeapUsage`,
and GPU memory by texture arithmetic).

**Built 2026-10-30 (s1):** [`dev-docs/parked/platform-probe/`](../../parked/platform-probe/README.md), arms D1, A1, A2
and a side-by-side page (the same four people flat at 128 px, flat at 256 px and real 3D). B1 and C1 not built (the
probe's README says why). The tablet numbers and Richard's verdict on the look go here when he has run it:

| arm | tablet fps (whole tower / one room) | worst 5 % ms | our work ms | Richard's words |
|---|---|---|---|---|
| D1, 24 real 3D | — | — | — | — |
| A1, 200 flat | — | — | — | — |
| A2, 400 flat | — | — | — | — |
| side by side | — | — | — | — |

## 5. Sources, licences, pipeline

| source | licence | what | state |
|---|---|---|---|
| Microsoft Rocketbox (12 people converted for Life Sim, with face shapes and per-region masks) | as fetched for Life Sim (memory says MIT, `master` branch); confirm before it ships in a kit a stranger uses | the realistic bodies, 326 mocap clips on one Biped | in `dev-docs/parked/lifesim/public/assets/people` (13 MB) and `tools/convert-people.mjs` |
| Polygonal Mind 100 Avatars | CC0, 167 rigged humanoids, FBX and glTF | realistic-proportion variety if 12 bodies read as clones | not fetched |
| KayKit Adventurers | CC0, 5 rigged characters, 76 animations, 25 weapons for hand sockets, glTF | the low-poly fallback (route B) | fetched for the zoo (§7): 4 characters, 6 pieces of gear |
| Rocketbox job outfits (73 of the 115: military, fire, police, construction, medical…) | MIT | realistic people with their gear modelled on | fetched for the zoo (§7): 5 |
| Open Source Avatars (VRM registry: 100Avatars, Grifters, Halloween Rising, VIPE…) | per collection: CC0, VIPE CC-BY | variety; creatures for monsters | fetched for the zoo (§7): 5 |
| Kenney Animated Characters | CC0, blocky | a kids' version if ruled | not fetched |
| Quaternius Ultimate Animated Character Pack | free for commercial use, not CC0, not redistributable alone | out of a kit a stranger downloads | — |
| Quaternius Modular Men/Women, knight, weapons, guns (via `trebeljahr/quaternius-showcase`) | CC0 | stylised people with separate helmets, weapons, guns | fetched for the zoo (§7) |
| Quaternius Universal Base Characters + Modular Character Outfits – Fantasy (v2.0, 2026-01-29) | CC0 | one shared rig, 62 outfit parts: gear rows shareable between bodies | itch.io only (name your price); not fetched |

Triangle counts for the CC0 packs were not in the search results; read the files when fetched. The play kit's shelf rule
(P126 R2) is MIT or CC0 for anything a stranger's game inherits.

## 6. What the harness ships

**Shipped 2026-10-30 (s2), as ruled 9 (no palette):** `platform-kit/kit/people.mjs` (README there). The crowd: one sheet
baked ahead, `makeCrowd` draws hundreds in one call, `pick(x, y)` names head · torso · hands · legs from points baked per
cell. The party: `people.party(id)`, the same person as a GLB with 19 clips. What follows is the plan as written before
ruling 9.

The surviving route as one shelf module: a `people` model whose declaration carries the body (one of 12), the palette
(hair, skin, three cloth regions), the clip, and the pose; `build()` returns an instance handle, not a mesh, because the
mesh is the crowd. Named parts for pointing: `head`, `torso`, `legs`, `hands`. The expedition party's skinned model is a
second declaration of the same person (same palette), so "let me pick every dweller's jumpsuit colour" is one knob that
both read.

## 7. The zoo: heavier people, flattened, with gear (s1b, 2026-10-30)

**Richard asked:** *"The 2D models obviously work best, but I wonder if we can go for more interesting people models if
we're going to just flatten them anyway? … push to 3D models we normally wouldn't have used because they're too heavy
… they'll need to have additional armour and weapons … find a library of 3D characters … or maybe several? Just grab a
few of them each to test."*

**Built:** [`dev-docs/parked/platform-probe/public/zoo.html`](../../parked/platform-probe/README.md#the-zoo) (`/zoo.html` on
the probe's server). Nineteen people from four libraries, each stood twice: real 3D on the left, flat on the right,
baked from the same model at load. Buttons for what they do (idle, walk, melee, shoot, swim, fix), what is in each hand
and on the head, and how big a person is on the tablet (room zoom, whole tower, close). `tests/zoo.json` 3/3 headless, on
the dev server and on the static build; screenshots in the probe's `shots/zoo/`.

### What was fetched (all without a login; `tools/fetch-zoo.mjs`, into the probe's gitignored `assets-zoo/`)

| library | licence | the people | gear | real-3D cost, one person | clips |
|---|---|---|---|---|---|
| Microsoft Rocketbox, job outfits (73 in the library) | MIT | soldier ×2, firefighter, police, builder | modelled on: helmets, vests, masks, holsters | 8.7–15.4k triangles, 80 bones, 8–13 draws, **29–40 MB of textures** (at 1024 px; the source's 2048 px is 4×) | Rocketbox mocap (idle, walk) + retargeted |
| Quaternius (Modular Men/Women, the knight) | CC0 | swat, spacesuit, soldier, medieval, knight | separate: 3 helmets, shoulder pads, 4 melee weapons, a shield, 3 guns | 1–10.6k triangles, 31–51 bones, 3–14 draws, no textures | retargeted (knight: its own) |
| KayKit Adventurers | CC0 | knight, barbarian, mage, rogue | 25 weapons and shields made for its **hand sockets**; hats and helmets on | 4–4.8k triangles, 41 bones, 7–8 draws, 5.3 MB | its own 76 + retargeted |
| Open Source Avatars (VRM) | CC0; VIPE CC-BY | 2 Grifters squaddies, a VIPE hero, 2 Halloween Rising creatures | none | 6.3–19.2k triangles, 52–59 bones, 1–2 draws, **43–85 MB of textures**, files up to 15 MB | retargeted |

"Retargeted" is Quaternius's Universal Animation Library (CC0) through Life Sim's `retarget.mjs`: every rig in the zoo got
the same six clips, swim and pistol included, without a clip of its own.

### Findings

1. **Every one of the nineteen flattens and matches its real self**, in every clip tried (walk, sword, pistol, swim,
   idle with a rifle), on all four rigs. A flat person costs the same whatever it was baked from: a 16-frame clip is a
   3.7 MB row at 256 px (about 1 MB at 128 px). So Richard's premise holds for drawing: a VRM with 85 MB of textures, or a
   Rocketbox at full resolution, is the same quad as a Quaternius one.
2. **Gear works as layers, not combinations.** Each piece is baked as its own row, the same frames as the body, with the
   body's depth already in the cell and its colour off, so whatever of the sword the body hides is cut out; laid over the
   body at run time it is right on either side. Twelve bodies and twenty pieces is 12 × 21 rows, not a sheet for every
   loadout. Changing a dweller's sword is a uniform, not a rebake.
3. **Fitting gear to a rig that was not made for it** is a rule read off the hand's bones at rest (forearm direction,
   forward, palm normal): blade tip forward, gun muzzle down the forearm, shield away from the palm, helmet fitted to the box
   of the head's own vertices. It held on Rocketbox, Quaternius and VRM rigs with no per-character numbers. KayKit's own
   gear goes in KayKit's sockets as authored, and is the tidiest of the four.
4. **"Heavy" in the free, no-login, MIT/CC0 world tops out at about 20k triangles.** The heaviest here are heavy in
   textures, not geometry (the VRMs, Rocketbox). Really heavy characters (50k+ triangles, 4K textures: Sketchfab, Fab,
   MetaHuman) need an account or carry a licence the kit cannot pass on; none was fetched. The bake does not care, so one
   can be tried the day Richard has one he likes.
5. **The bake has to move off the tablet for the premise to pay.** The zoo bakes at load (as the probe does), so the
   tablet would still download a 15 MB VRM to draw a 1 MB row. The game should bake ahead (headless Chrome, as Life Sim's
   converter runs) and ship the sheets.
6. **Gear rows are the memory risk.** Body plus six pieces, six clips, twelve bodies at 128 px is about 12 × 6 × 7 × 1 MB ≈
   500 MB of sheets: too much for a 4 GB tablet. Untested ways down: bake gear only for the clips that show it (a sword
   at the workbench is not needed); share gear rows between bodies that share a skeleton and proportions (Quaternius's
   2026 Universal Base Characters plus its Fantasy outfits are built for exactly that, CC0, but only on itch.io, so not
   fetched); compressed textures (KTX2).
7. **Small things seen:** the Grifters squaddies have heads half a metre wide, so a fitted helmet is that big too; an
   idle sword points forward, not down (the grip rule); Quaternius's knight's own attack is a running one; KayKit ships
   every character holding all its props at once (the knight: two swords, four shields), which the zoo takes off.

### Open for Richard

Which shelf reads best at the room zoom on the tablet, and whether the dwellers and the monsters should come from
different ones (the Halloween Rising creatures are the only monsters here). The probe's README has the two push commands.

### The survivor look (s1c, 2026-10-30)

**Richard asked:** *"It's sad that we don't have any 'survivor' style models? The rocketbox ones are obviously the best,
but do we really have enough choice to make this look like a credible 'survivor' game and not the Life Sim style well
dressed SIMS looking people?"*

**As shipped, no.** All 115 Rocketbox people (contact sheet read 2026-10-30) are clean and pressed: 40 adults in
everyday clothes, 4 children, 73 in uniform (business 11, construction 9, fire 10, medical 8, military 8, police 7, pilots
5, security 2, sports 6, chef, delivery, gardener, woodsman). About 30 are usable raw material (workwear, hoodies,
jackets, boots); none is worn. Searches for free survivor characters under MIT or CC0 found none: paid packs, one
CC-BY-SA, one with no stated licence.

**But the bake is where a survivor is made, and it costs nothing at run time.** Three levers, the first built:

1. **Built: the survivor pass** ([`src/zoo/weather.mjs`](../../parked/platform-probe/public/src/zoo/weather.mjs), the zoo's
   "Look" buttons): sun-faded and dusty, grime in blotches, dirt gathering low, and the flood's stain up the legs to a
   ragged tide line at the knees. Painted at bake time on the flat person only (the real one beside it stays clean, for
   comparison), placed on the body at rest so it stays on the cloth as the person moves. Any Phong/Standard material;
   VRM's MToon is left clean. Five more Rocketbox people fetched for it (woodsman, gardener, a hood up, a field vest, a
   leather jacket): `rocketbox-plain` shelf. Dirt alone does not make a survivor: it makes a clean person dirty.
2. **Not built: scavenged mismatches.** Life Sim's wardrobe already lends an outfit or a hairstyle from one Rocketbox
   person to another (its round 4/5). Military trousers with a hoodie and a hi-vis vest is what reads "survivor", and
   115 people give thousands of mixes. Rips and frayed hems are the same noise cutting holes in the bake.
3. **Not built: survivor gear layers.** Scarves, backpacks, gas masks (the firefighters have them), patched pads,
   improvised armour, makeshift weapons, each a layer (§7 finding 2). We have Quaternius helmets and pads; nothing else
   free fits. These pieces are small and rigid, the easiest kind to make or find.

**Open for Richard:** whether a paid survivor pack is allowed (it would make the look quickly, but the play kit's shelf
rule, P126 R2, is MIT or CC0 for anything a stranger's game inherits, so it could live in our game, not in the kit), or
the three levers on Rocketbox.

### Ruled (README ruling 9, 2026-10-30)

*"Nah let's go with simple functional clothes, no customisation, and just make do with what we have. They don't need to
look dirty or worn, they're quite small and I think it's not worth the effort."* So the shelf module is **flat Rocketbox
people in functional clothes, as the library ships them**: no palette recolouring, no wardrobe borrowing, no survivor
pass, no paid pack. The survivor pass and the other shelves stay in the probe as the record, not in the kit. §6's
palette knob is dropped with it. Weapons and armour: the expedition party is real 3D (§3), so its gear hangs on bones as
plain meshes (`zoo/gear.mjs`'s fitting rule); the crowd in the tower carries none, which also retires §7 finding 6 (the
gear-row memory risk) unless a dweller is ever drawn armed.
