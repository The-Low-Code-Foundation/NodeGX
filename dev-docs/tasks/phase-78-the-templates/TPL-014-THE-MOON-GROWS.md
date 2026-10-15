# TPL-014 — The moon grows

**Opened 2026-10-14**, at Richard's request, for **both** Rocket School (TPL-007) and its Africa edition (TPL-013):

> *"We also need to add more to the alien thing, both for Rocket School and this new one. My eldest already has like 5
> aliens, has found their favourite food and doesn't know what to do next, but she loves her aliens. We need more variety,
> maybe evolutions? More accessories. Maybe a game where you get to play with your alien and do more school work practice?
> This would be a big motivational boost, especially if you can buy stuff for your alien to help it win the game (my
> eldest now has too many points and nothing to do with them)."*

**Status: 🟡 M1 BUILT, GATED and DRIVEN in both games (2026-10-14): the Alien Book, two domes and the surprise egg.**
Richard on the picture: *"That's hot shit, the kids are going to go nuts … add the moon stuff to Rocket School, my
eldest is going to shit a brick."* M2–M5 below are next. Research: [tpl-014-research-briefing.md](tpl-014-research-briefing.md)
(about 60 sources). The picture: claude.ai artifact *The Moon grows* (private, `https://claude.ai/artifact/8wajmBYntcKUTCpZ1RRN9v`),
drawn with the kit's real aliens rendered by `renderToStaticMarkup`.

**Where it is built:** in Rocket School's generator (`tpl007Moon.ts`, `tpl007Scripts.ts` `MOON_*`, `tpl007Components.ts`
`Moon/*`), so Star Class (TPL-013) gets every slice on its next regeneration.

## 1. Where the moon runs out today (measured from `tpl007Moon.ts`, 2026-10-14)

| what | the ceiling | what a child who reaches it has left |
|---|---|---|
| aliens | 6 (`ALIEN_COSTS` 0, 60, 90, 120, 160, 200 = 630 ⭐ for all six) | nothing |
| growth | baby → young at 6 meals → grown up at 18, then it stops | feeding does nothing new |
| favourite food | one per alien, found once | nothing to discover |
| things to wear | 12, one purchase each (20–80 ⭐, 440 ⭐ for all) | nothing |
| food | 6, 3–8 ⭐ a meal | the only sink left, and it changes nothing once grown |

A race pays about 35–45 ⭐. **Every alien and every thing to wear costs 1 070 ⭐, and growing six aliens up is about 540 ⭐ of food (18 meals at 3–8 ⭐ each): about 1 600 ⭐, some 40 games.** After that, stars pile up.

## 2. The rule it keeps

🔴 **Nothing on the moon ever gets worse** (REV-005 §2; memory `kids-ellie-saoirse`). No hunger, no decay, no timer, no
streak. A game with the alien can end without a win, but nothing is lost and the alien is never sad.

## 3. Ideas on the table (Richard's, to be shaped by the research)

1. **Evolutions**: a grown-up alien changes form at a milestone.
2. **More things to wear**, and more variety (species, colours).
3. **A game with your alien**, with more school practice in it.
4. **Things to buy that help your alien in that game**: the sink with a purpose. A thing bought never answers a
   question for the child.

## 4. What the research says (the briefing has the sources)

1. **Why she stopped: saturation, not inflation.** In every pet-learning study found, the companion keeps changing as
   long as the child keeps learning. Ours stops at 18 meals, and everything the stars buy is finite.
2. **The protégé effect** (Chase et al. 2009, strong): children work harder for a character they teach than for
   themselves, and lower achievers gain most. Growth tied to the child's own learning is the My-Pet line of work
   (Chen, Chan et al., Taiwan; peer-reviewed, small).
3. **The maths has to be the game's mechanic**: children played 7× longer when it was (Habgood & Ainsworth 2011, strong).
4. **Do not pay more stars per answer**: rewards per answer undermine children's own motivation (Deci et al. 1999,
   d −0.28 to −0.40); reward milestones instead. A red X and a falling tone hurt 6–8 year olds; showing the right answer
   made them persist (Merrick & Fyfe 2024). Both back the no-negative-feedback rule.
5. **Prodigy is the warning**: company-funded evidence, and members got "better pets". Here everything is bought with
   earned stars and no item ever answers a question.
6. **A surprise egg bought with earned stars** is lawful in the UK and EU (no money staked; the UK 2023 principles
   exclude boxes earned through play) and clean if it always hatches an alien not yet met, from a visible pool, with no
   rarity and no slot-machine animation. Brazil's 2025 law needs its text read before an egg ships there.

## 5. Proposal (as drawn in the picture)

| # | what | the sink it adds | cost (the briefing's estimate) |
|---|---|---|---|
| 1 | **Expedition**: a fogged 6×6 planet; a right answer walks your alien one tile and clears fog; finds (crystals, fossils, seeds, postcards, egg clues); species have jobs (Squiggle swims). Gear bought with stars changes what a right answer does: lantern clears all four sides, jetpack hops a crater, map shows the clue, boots carry more. Come home any time with everything. | gear (once), trip supplies (each trip) | 5–8 days |
| 2 | **Alien school ("Teach me")**: the alien is stuck on a question; a right answer teaches it; a topic bar per alien fills and never empties. | (none: it is the evolution engine) | 2–4 days |
| 3 | **A fourth form, by what the alien does most**: Scholar (teach it 3 topics), Explorer (20 finds), Superstar (its favourite 10 times). The next step is always shown. | | art: 6 species × 3 forms |
| 4 | **Alien Book**: 36 slots (6 species × 6 colours) plus finds and postcards. | | small |
| 5 | **Big things**: Crater Dome (+2 aliens, 1 200 ⭐), surprise egg (300 ⭐, always new), moon garden, postcard frame. | the long goals | dome small; garden 3–5 days |
| 6 | **More things to wear**: wings, cape, headphones, flower crown. | | art |

## 6. The build, in slices

Each slice: engine first with its gate, then the parts through the plan door, both games regenerated, the moon drive
(`scripts/devtools/drive-tpl014-moon.js`) green on both at 1100 and 390 px, and the screenshots looked at.

| # | slice | acceptance |
|---|---|---|
| M1 ✅ | **The Alien Book, the domes, the egg** | §7 |
| M2 | **Expedition**: `Pages/Expedition` (reached from the moon), a seeded 6×6 fogged map, a right answer walks one tile and clears fog, finds into a backpack and the Book, species jobs (the Squiggle swims), Come home any time | the question is the game's own picker (Logic/Pick next question, the player's focus); a wrong answer shows the right one and moves nothing; nothing is lost on Come home; the trip survives a reload; gear changes what a right answer does and never answers |
| M3 | **Gear and supplies**: lantern, jetpack, old map, big boots; a trip's supplies (the sink that never ends) | bought with earned stars only; each item's effect graded in the engine |
| M4 | **Alien school and the fourth form**: the alien is stuck; a right answer teaches it; a topic bar per alien that never empties; Scholar, Explorer and Superstar, each with its next step shown | art: 3 forms × 6 species in the kit, each drawn and looked at on a sheet before a page uses it (REV-005's rule); `game-kit.Alien` takes a Form |
| M5 | **The moon garden and new things to wear** (wings, cape, headphones, flower crown) | art in the kit, as M4 |

## 7. Built

### M1 (2026-10-14) — somewhere for the stars to go

| | |
|---|---|
| **Catalogue** | `tpl007Moon.ts`: `MOON_DOMES` (Crater Dome 1 000 ⭐, Ridge Dome 1 500 ⭐, room for 2 more aliens each), `EGG_COST` 300, `BOOK_SIZE` 36, `ALIEN_COSTS` to ten places (…, 240, 280, 320, 360); `MAX_ALIENS` stays 6, `MOST_ALIENS` 10, and a module that has fewer prices than places throws. |
| **Engine** | `MOON_HELPERS`: the moon keeps `met` (every species-colour ever had, read as the union with the aliens on it, so an old moon opens with what it has) and `domes`; `moonMax` is six plus each dome's room; `moonFreshName` never suggests a name already on the moon. `Logic/Moon view` publishes `book` (36 rows: drawn and named when had, a grey shape and ? when not), `bookCount`, `bookLine`, `bigs`. `Logic/Moon act` gains `build` (Thing Id) and `egg` (an alien never had while one is left, then any; needs room). |
| **Parts** | `Moon/Book tile`, `Moon/Book` (folded to one button, "Alien Book · 5 of 36"), `Moon/Big things` (the shop tile and the hangar's buy card, then build or hatch). Two words (`moonBig`, `moonBookClose`). Pages/Moon places both under the adopt card. |
| **Gates** | Engine 280/280, 7 new: the book's 36 pages and its grey ones; an old moon's book, kept by the first thing done; a dome's room, built once, too dear refused with the store unchanged; the egg never repeats a page until all are had, needs room, and says how many it could be; French; the save code carries book and domes; no name given twice. Template 111/111, one new: **no two components author one node id** (§8.1). Star Class 9/9. DEF-038 green for both (its one red is `templates/nightbook`, not ours). |
| **Drive** | `drive-tpl014-moon.js`: a player made through the form, given her moon (five grown aliens, favourites found, 2 800 ⭐) by editing the store the game writes; on the moon: "Alien Book · 5 of 36", both domes and the egg with prices, the open book's 36 pages, the dome asked for on the hangar's card and built (1 800 ⭐ left), an egg hatched ("The egg hatched: meet …", 6 of 36, 1 500 ⭐ left), both kept after a reload, 0 console errors. **16/16 on Rocket School at 1100 and 390 px, and 16/16 on Star Class.** |

## 8. Findings

1. **The plan door renames a node in ANOTHER component when two share an id.** `Moon/Big things` first used `mg…` ids;
   `Pages/Merge` already had `mgTitle`, and the regenerated artefact had Merge's node renamed `mgTitle-2`, a diff in a
   page nobody touched. The rename was consistent (its wire followed), so nothing broke. Node ids are project-wide; the
   door's choice to rename silently is reasonable, but a template author cannot see it. Gated now in
   `tpl007Template.test.ts`; `mtIn` (Merge/Tile and Moon/Alien tile, shipped in P113) is the one allowed.
2. **The first drive's screenshot found a bug the text could not:** the egg hatched a second "Tilly" beside her own
   Tilly. Suggestions went round the species' list by count. Fixed (`moonFreshName`) and gated.
