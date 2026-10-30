# The game: a tower above a drowned world (a design for the brief Opus gets, not a spec Opus must follow)

**Setting ruled 2026-10-30 (README §Rulings 1):** the drowned-world tower, not the recommended metro. This page was
rewritten for it the same day; the metro version is in git history if wanted.

Everything numeric below is a default an owner will say "a bit more" about. Under the canon every one of them is a knob,
so the numbers are here to make the design concrete, not to bind. Where Fallout Shelter already solved a mechanic, this
takes its answer (castle canon rule 3: copy the genre for what it has solved) and says where it departs.

## 1. The setting: a tower in a drowned city

Twenty years after the bombs and the melt, the sea stands at the eighth floor of what was a city. Your people live in one
office tower whose top dozen floors are dry. Below the waterline the old floors are flooded, dark and full of things;
above, the roof catches rain and wind. Other towers stand across the bay, each with its own people. Expeditions go by boat
to whatever still sticks out of the water: the top floors of a department store, a hospital roof, a stranded ferry, the
bridge.

Why it works for the brief (and what it costs):

| | the tower |
|---|---|
| cutaway | vertical, two or three rooms a floor, the front wall cut away: Fallout Shelter's own shape, with the sea line across it. The flooded floors below are visible, murky green, and are where the station grows (pump one out to claim it) |
| expeditions | by boat (the crossing is a cut, not a level) to half-sunk buildings: side-scrolling levels of rooftops, broken floors and short swims |
| politics | the towers across the bay, the boats that pass, who gets the dry floors |
| the cost | swimming is a different platformer (slower, a breath meter, things below); the levels are mostly above water, swims are short gaps. The tower is tall and the tablet is wide: panning is mostly up and down |

The working title PLATFORM belonged to the metro (a station platform); with the tower it is only "a platformer". Ruling 8
stays open.

## 2. The look

- **The camera** is a fixed side view: a perspective camera with a narrow field of view (about 20°), so near window frames
  and far walls shift a little as it pans, which is what makes it read as 3D rooms and not a flat drawing. Pan with drag
  or arrows (mostly vertical in the tower), zoom with the wheel or pinch between "the whole tower" and "one room". Nothing
  moves unless the person moves it; a change of place is a cut (castle canon rule 5).
- **Rooms** are three.js boxes with the front face removed, interiors built in the room's frame (Threadspace's method),
  painted and lit per room. The tower's shell, its windows and the bay behind give depth; the waterline is a surface
  across the cutaway, with the flooded floors below it.
- **People** move on the plane of the floor (x and y), never in depth. They are drawn by the route PEOPLE.md picks.
  Zoomed out, two hundred of them are small figures on twelve floors; zoomed in, one room's six are readable.
- **The expedition levels** use the same camera and the same plane: rooftops and broken floors, the sea as the bottom of
  the screen, drowned skyline behind.
- **Tablet budget:** 60 fps on the Mac, 30 fps on the HD 615 with two hundred people in view; no shadow maps; a pool of at
  most eight real lights, the rest baked into vertex colours (Threadspace's `lights.mjs` rule, learned the hard way).

## 3. The base loop (Fallout Shelter's, with the departures named)

**Resources.** Power, food and water, as in the Vault, with fresh water the scarce one (the sea is everywhere and
undrinkable), plus **fuel** (the boats burn it; an expedition costs fuel) and **light** (a dark floor breeds fear and
incidents). Each room produces one and consumes power. Storage caps; surplus spoils or vents.

**Rooms** (built on a floor of the tower; each a declared model with named parts and a build cost):

| room | makes | needs | departs from the Vault by |
|---|---|---|---|
| generator | power | a mechanic | the hum, the exhaust (the asked-for particle case lives here) |
| wind turbine (the roof only) | power | — | free power that stops in a calm and breaks in a storm |
| hydroponics | food | power, water, light | lamps whose colour is the first pedantic ask |
| desalinator | water | power | brine and a broken pump when it fails |
| rain catchers (the roof only) | water | — | weather-driven |
| dorms | beds, morale | — | couples and quarrels happen here |
| infirmary | healing, rad cure | power, herbs | — |
| workshop | scrap into tools, weapons, parts, fuel | a tinkerer | crafting as in the Vault |
| armoury | weapons kept, party kitted | — | — |
| radio room | recruits, news from the bay, trade offers | power | brings the politics |
| school | children's lessons; stats for the young | a teacher | children can't go out; they tell you so |
| canteen | morale, the place votes happen | food | the assembly |
| the pumps | a flooded floor claimed, slowly | power, fuel | how the tower grows: down, into the water |
| the dock (the waterline only) | the boats; trade comes in, parties go out | — | the expedition door |

**Dwellers.** Each has a name, a face, a body (PEOPLE.md), four stats and a mood. Stats: **Grit** (fighting, carrying),
**Hands** (fixing, growing, crafting), **Wits** (water, radio, teaching, medicine), **Heart** (morale around them, votes,
trade). Room output scales with the stat the room asks for. Dwellers eat, drink, sleep and tire. Mood rises with light,
company, a dry bed and a job that fits; falls with hunger, dark, damp, grief and losing a vote.

**Incidents** (the Vault's, plus the sea's): fire, rat swarm (the irradiated kind, which swim and climb: the same monsters
as on expeditions), a storm surge that floods the lowest dry floor, a blackout, raiders by boat at the dock, a sickness in
a dorm. Dwellers in the room respond with the same fighting mechanics the expeditions use, automatically; the player can
take one of them (the "optional control" rule applies at home too).

**Growth.** Recruits arrive by radio and by boat (rescued strays, a trader's family). Couples form in the dorms; children
arrive and grow (Life Sim's rule: no ageing to death). The tower grows by building rooms on dry floors and by pumping out
a flooded floor to claim it, and across the bay by allying with or taking over the next tower (a late goal, not the
prototype).

## 4. Politics (the part the Vault never had)

The tower is a town, not a workforce. Dwellers hold **opinions** on a few axes: open or closed (take in strangers?), out
or in (send boats out or keep the fuel?), share or ration, old guard or newcomers. Opinions move with what happens to
them. Three or four **cliques** form from shared opinions and from which floor they sleep on (the high floors are drier).

**The assembly.** Every few days a question comes up in the canteen (a boat of strays at the dock, a trade offer, who gets
the dry floor just pumped out, whether to search for the lost party). The player proposes; the tower votes; cliques sway
members; a lost vote costs mood for the losers and the player's **standing**. Low standing: dwellers refuse jobs, a clique
talks of leaving for the next tower, or of a new leader. High standing: hard calls pass. The player can also **talk**:
pick a dweller, pick a line (reassure, promise, lean on, listen), which moves their opinion and costs time.

**Neighbours.** Two others on the bay, each with a character: the Faithful in the cathedral spire, the Market on a
container ship run aground. Trade, visits, a feud, a storm that drives their people to your dock. News comes over the
radio in one-line stories.

Scope for the prototype: one question kind (strays at the dock), two cliques, one neighbour. Enough to see whether
politics is fun or a chore. Richard's call after the first play.

## 5. Expeditions

**Choosing.** Pick a party of one to three from the dwellers, kit them from the armoury, pick a destination on the bay
map (graded by rads, loot and fuel to get there), pick **auto** or **control**.

**Auto** resolves like the Vault's: a ticking log of what they found and fought, a return time, injuries. Cheap, and what
most players will do most of the time.

**Control** opens the platformer. One dweller under the keys (or the touch pad: left, right, jump, hit, shoot, use), the
others follow and fight on their own. Run, jump between roofs, climb, crouch under things, swim a short gap (slow, a
breath meter); pick up scrap, cans, seeds, meds, parts, fuel; fight irradiated things with a pipe, a blade, a pistol with
few rounds. Rads tick up in marked zones and in the water (a visible meter), down in cover; a dose over the line is
sickness back home, never death on the spot. A level ends back at the boat. What you carry is what the tower gets.

**Monsters** (each a declared model with named parts, so "the rats' tails are too short" is a part): irradiated rats
(fast, low, swim), gulls (dive from above), crabs (armoured, sideways, on the roofs at the water's edge), the lurkers
(slow, tall, in the dark flooded floors; they hate light: a torch pushes them back). Kids' version if ever ruled: same
silhouettes, slapstick knock-backs, no blood.

**Loss.** A dweller who goes down is **stranded** where they fell. The tower learns on the radio. A rescue is the next
expedition to that level; the stranded dweller is found hiding, weaker, with a story. The Vault kills; this game does not
(ruled, README §Rulings 3).

## 6. The first play (what round one must show)

A tower with four dry floors and the dock: generator, hydroponics, desalinator, dorm, and twelve dwellers walking and
working; the cutaway readable at two zooms with the waterline across it; one incident (rats); one expedition to one level
(the department store's top floors) with auto and with control; one assembly question. Fun before breadth: Richard plays
and writes the list, as in every game here.

## 7. Where the canon shows in the design

Every row above is a declaration on purpose: rooms, monsters and people are models with named parts; the numbers are
knobs; the expedition levels and the tower's floors are places in files; strings a player reads are data; the owner's
changes are deltas in design files. None of that is in the brief Opus gets as a design. It is in the harness as a gate.
