# REV-005 — The moon

## 1. The person sentence

**The stars a child earns adopt little aliens on a moon, and buy them food and things to wear: an alien hops when it is
fed, grows up over many meals, has a favourite food to discover, and never gets worse — so revising has something to look
after at the end of it.**

Richard, 2026-10-04, ruling 4 on the prizes (REV-004 §4): *"For the something new, something more concrete like adopting
little aliens on a moon in the game and buying food and accessories for them."* Behind it, the same day: *"this shit is
boring AF … give them as much of a way to distract themselves from the horror of rote memorisation as possible."*

## 2. The design, and the one rule it keeps

🔴 **Nothing on the moon ever gets worse.** The two children were promised no negative feedback (memory
`kids-ellie-saoirse`: no timers, no streaks, no "you missed"). So an alien has no hunger, no mood that drops, no clock:
a meal makes it hop and brings it closer to growing, and a week away changes nothing. The engine gate reads the same store
thirty days later and gets the same moon.

| what | how it works | price (⭐, the hangar's purse: earned − spent) |
|---|---|---|
| **Adopt** | a species (six), a colour (six), a name (or the one suggested); up to six aliens | the first free; then 60, 90, 120, 160, 200 |
| **Feed** | one tap on a food: a meal, and a hop. Six meals and it is young, eighteen and it is grown up (it grows from its feet). Each alien has a secret favourite: fed it, it counts two meals and is found ("Zib LOVES 🍩!") | 3–8 a meal |
| **Dress** | hats (bow, party hat, bobble hat, top hat, crown), eyes (glasses, sunglasses, monocle, star glasses), neck (scarf, bow tie, necklace). Bought once per player, then any of their aliens wears it, on and off for free | 20–80 |

A race or a Monster Gate game pays about 35–45 ⭐, so a game buys five or six meals, a hat is one or two games, a crown a
few. Earned stars (`model.stars`) never go down; spending is `model.spent`, as in the hangar.

**Where it is:** a page of its own, `/moon`, reached from the hangar ("🌙 Visit your aliens on the Moon") and back. Not a
Home card: Home is at 32 of 32 nodes, and Richard ruled on 2026-09-14 that the hangar is not a game, so not a Home card;
the moon is the hangar's kind of place.

## 3. What was built (session 3, 2026-10-04)

| piece | where |
|---|---|
| **`game-kit.Alien`**, a seventh kit node: six species drawn in SVG, filled with Colour and edged in ink (the outline carries the contrast), eyes, cheeks and a smile; Hat / Eyes / Neck (twelve things to wear, each in its own place, drawn per species); Grown 0–2 (grows from its feet); a Happy count that goes UP makes it hop once (mounting with a count does not); a gentle breathing; reduced motion stills both. `data-alien`, `data-grown`, `data-hops`, `data-wear` let a drive read what is drawn | `library/modules/game-kit/src/kit.js`, rebuilt `project/noodl_modules/game-kit/index.js` |
| The catalogue: species (with names to suggest), colours, food, things to wear, prices, growth | `packages/noodl-mcp/tests/tpl007Moon.ts` |
| Six colour tokens `--alien-lime … --alien-sunny`, emitted with the theme | `tpl007Theme.ts` |
| `Logic/Moon view` (the moon as the active player sees it, every line in their language) and `Logic/Moon act` (adopt, select, feed, buy, wear; refused with nothing changed when the purse is short, the moon full, or the thing not theirs) | `tpl007Scripts.ts` `MOON_HELPERS`, `MOON_VIEW_SCRIPT`, `MOON_ACT_SCRIPT` |
| `Moon/Alien tile` (a row: an alien, its name, its stage; also the adopt card's species), `Moon/Shop tile` (a food's glyph, or the chosen alien wearing the thing; Use or Ask), `Moon/Care` (the chosen alien close up, food, things to wear, the hangar's buy card for what is not owned), `Moon/Adopt` (species, colour, name; folded once the moon has aliens), `Pages/Moon` (22 nodes) | `tpl007Components.ts` |
| The hangar's way to the moon (28 nodes) | `Pages/Hangar` `hgMoon`, `hgGoMoon` |
| The save code carries the moon (v4) | `ENCODE_SAVE_SCRIPT` / `DECODE_SAVE_SCRIPT` |
| Ten interface words, EN and FR | `WORDS` |

The alien sheet was rendered and looked at before the page was built (six species × baby, young and four outfits): two
fixes came of it (the scarf's tail hung below the feet; the star's scarf sat across its legs).

## 4. Gates

- **Kit** (`tpl007GameKit.test.ts`, "P113 REV-005"): seven nodes register; six species, each a different body, every
  filled part edged in the Outline; what the moon sells (`tpl007Moon.ts`) is exactly what the kit draws, every species and
  every thing to wear in its own place, each different on every species, an unknown id drawing nothing; Grown 0/1/2 at
  0.62/0.8/1, anything else grown up; a hop is a Happy count going up, mounting with one hops nothing; both animations
  stilled for reduced motion (**sabotage arm**: without the block, both named); the picture says its name.
- **Engine** (`tpl007Engine.test.ts`, "P113 REV-005"): the first alien free, the next 60 ⭐, a short purse refused with
  the store unchanged; six aliens and the seventh refused; a meal spends and counts, the favourite counts two and is found
  once, six meals grow it ("Zib grew!"), eighteen grow it up, `stars` never moves; a thing to wear bought once and worn at
  once, then on and off any alien for free, not owned cannot be worn, too dear cannot be bought and is greyed; French
  lines; no clock (the store read 30 days later is the same moon) and the save code carries it.
- **Artefact** (`tpl007Template.test.ts`, "P113 REV-005"): the moon is a page (`/moon`), reached from the hangar and back,
  not from Home; a food tap feeds; a thing not owned asks first and `mcBuy` runs on `Yes` and on nothing else; the first
  alien adopts at once and a later one asks; every writer of the store is wired to Write; every alien colour is a token
  the theme emits; the aliens are drawn by `game-kit.Alien`; every moon word in both languages.

## 5. Driven (`scripts/devtools/drive-p113-focus.js --arm moon`)

EN 1366×768 and FR 390×844, a 6e player, **8/8 each** (2026-10-04): the stars are earned honestly first (a typed list,
eight right answers in a race: 39 ⭐), then the race's result card → **To the hangar** → **Visit your aliens on the
Moon**.

`moonPage` (the adopt card says the first is free, six species drawn, "You have 39 ⭐") · `adopted` (Fuzz, Pink, "Zorp":
stored, nothing spent, "Welcome to the moon, Zorp!", the close-up draws a fuzz, the card folds to "＋ Adopt another alien ·
60 ⭐") · `fed` (a strawberry: 3 ⭐, a meal, "Zorp munches 🍓. Yum!", and the close-up hopped: `data-hops` rose by one) ·
`asks` (the bow asks first: "You have 36 ⭐ · This costs −20 ⭐ · You'll have 16 ⭐", nothing spent) · `bought` (Yes: 23
spent in all, owned, worn, the kit draws `hat:bow`) · `offFree` (a second tap takes it off, nothing spent) · `keptMoon`
(`/moon` reloads as itself with Zorp and the meal) · `quiet`.

Looked at: the adopt card at 1366 and 390 (two species a row on the phone), the close-up, the wear tiles (each drawing
Zorp wearing that thing; with 16 ⭐ left everything over 16 is greyed), the buy card over the tiles in French ("Acheter
Nœud ?").

## 6. Acceptance criteria

| AC | clause | state |
|---|---|---|
| AC1 | A child adopts an alien (species, colour, name), the first free | ✅ gate + driven EN + FR |
| AC2 | Stars buy food (a meal, a hop, growth, a favourite to find) and things to wear (bought once, any alien wears them), from the hangar's purse, asking first before anything but a meal | ✅ gate + driven |
| AC3 | Nothing on the moon gets worse with time, and nothing earned is taken away | ✅ gate (no clock; `stars` never moves) |
| AC4 | It survives a reload and travels in the save code | ✅ driven (reload) + gate (save code) |
| AC5 | The kids' verdict | ⬜ |

## 7. Judgements made here, Richard's to overrule

- **A food tap feeds at once**, with no "Buy it?" card: a meal is 3–8 ⭐, its price is on the tile, and feeding is the
  steady, repeated thing. Adopting (after the first) and anything to wear ask first on the hangar's card (P95 PLY-002).
- **The first alien is free**, so the moon is never an empty page the first time a child opens it.
- **Prices** (table above) are a first guess at "a game buys a few meals; a crown takes a few games".
- The colour pills say the colour's name; the species tiles above them are drawn in it.

## 8. Open

- The French confirm card reads "Acheter Nœud ?" (no article): the hangar's own card has always said "Acheter {item} ?"
  the same way. A wording pass for both.
- Nightbook (TPL-011) ships its own copy of the kit; it now lacks `game-kit.Alien` until its next regeneration. It draws
  no aliens, so nothing breaks.
- Names: an alien cannot be renamed after adoption yet, and there is no way to give one away (on purpose: nothing leaves).
