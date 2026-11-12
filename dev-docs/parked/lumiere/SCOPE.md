# Château Lumière: the full scope

*A junior sorceress inherits a fairy-tale château that a curse has turned dark. She takes it back one room at a time,
and her magic is what she knows: every right answer is a spell.* Richard's brief is in [BRIEF.md](BRIEF.md); the toy
version built from this scope is in [README.md](README.md). The title is a working one: hers to change.

## 1. The five promises

1. **Every room is a before and an after.** It starts dark, damp and grey with cobwebs, boarded windows and something
   growling in it. When you win, light sweeps out from where you stand and the room becomes the most beautiful place in
   the game. That moment is the game's reward, so it gets the most work.
2. **Knowing things is your magic.** The questions are Rocket School's, at her year, in the subject and topic she
   chooses. A right answer casts; a wrong one (or the clock running out) lets the creature strike. After a miss, the
   right answer and its one-line explanation show while the creature attacks, so a miss teaches.
3. **Clearing rooms makes you stronger, and you can see it.** Every door says how many hits would knock you out in
   there with what you are wearing now. Shallow rooms give the gear that turns a one-hit room into a three-hit room.
4. **The rewards are things to wear, friends, and places to play.** Dresses, hats, capes, staffs, a pegasus, a chef
   who bakes with you, a piano that teaches you to read music.
5. **Nothing is ever lost.** A knockout means Lumi (your firefly) whisks you back to the Grand Hall. No game over, no
   lives, no "you failed". A won room is yours for good.

## 2. The heroine

The life sim's anime girl (pixiv's VRoid sample), now in a sorceress's colours. The player names her. She starts with
a plain wooden staff with a small crystal, a simple dress, and one spell, **Sparkle**. Everything she wears can be
changed in the Dressing Room once it is won, and every new piece of clothing comes from a room.

Her guide is **Lumi**, a firefly who lives in her staff's crystal: the voice of hints, the way home when she is lost,
and the one who carries her out when she is knocked out.

## 3. The château

Large, Disney-shaped, and easy to get lost in on purpose: wings off a central hall, corridors that turn, towers you
climb, secret passages, and a map that only fills in as you walk.

| Where | Rooms (stars = how deep, ★ easiest) |
|---|---|
| **The Grand Hall** (hub) | The Hall itself: double staircase, broken chandelier, portraits whose eyes follow you, the Moonwell |
| **The Rose Wing** (east, ground floor) | Dressing Room ★ · Sewing Room ★ · Kitchen ★★ · Pantry ★★ · Dining Hall ★★★ |
| **The Swan Wing** (west, ground floor) | Music Room ★★ · Portrait Gallery ★★ · Ballroom ★★★ · Orangery ★★★ |
| **The grounds** | Rose Garden ★★ · Stables ★★ · Hedge Maze ★★★ · Lake and Boathouse ★★★ |
| **The first floor** | Nursery and Toy Room ★★★ · Bathhouse ★★★ · Art Studio ★★★ · Library ★★★★ · Royal Bedchamber ★★★★ |
| **The towers** | Observatory ★★★★ · Clock Tower ★★★★ · the Moon Tower ★★★★★ (the last room) |
| **Below** | The Cellars and the Potion Lab ★★★★ |

**Getting lost, and found:** corridors between rooms with their own small creatures; secret passages (a bookcase that
swings, a portrait that is a door, a dumbwaiter from the kitchen to the bedchamber); stairs blocked by thorns until a
room nearby is won; a map in her satchel that draws itself as she explores (unvisited rooms are blank, won rooms are in
colour); and "Lumi, take me home", which lights a trail of sparks back to the Hall.

**The story, in one breath:** the château belonged to a great-aunt she never met, a sorceress. When the great-aunt's
fairy godmother, **Lady Gloom** (once Lady Lumière), grew lonely and sad after the aunt left, her sadness turned into
the curse, and every creature in the château is something good the curse twisted: moths that were silk butterflies,
soot sprites that were the hearth's fire fairies, a grumpy book that was a storybook. Beating a creature frees it, so
nothing is ever killed: it turns back into what it was and flies out of the window. In the Moon Tower, beating Lady
Gloom frees her too, and she gives the château back its light.

## 4. The room loop

1. **Find the door.** The plaque shows the room's name, its stars, and *"In there, a wrong answer costs you ♥♥♥ — 2
   hits and you're out"*, worked out from what she is wearing now.
2. **Go in.** Dark room, cold light, dust in the air, a creature waking up. The camera swings to the battle view.
3. **Battle** (section 5) until she wins or is knocked out.
4. **Knocked out:** Lumi carries her to the Hall with a little health. Potions glow in the Hall (and later in won
   rooms) to fill up again before going back. The creature is back to full health too.
5. **Won:** the creature turns back into something good, light sweeps the room, colour floods back, candles light, the
   windows open. Then the surprise: a reward card and, where there is one, the room's character steps out.
6. **The room is hers.** She can walk in any time. It is a safe place: some rooms heal, some hold a mini-game, some
   change what she wears or carries.

## 5. The battles

**Final Fantasy turns, a question at a time.** The heroine stands on the right, the creatures on the left, the party
window at the bottom (name, a health bar, a magic bar). On her turn the command window offers:

- **Magic** — a question appears, with four answers and a moon that empties as time runs out.
  - **Right:** she steps forward and casts. The bolt flies, the creature flashes and reels, the damage number pops.
    Answered in the first third of the time: **"Brilliant!"**, half as much again.
  - **Wrong or out of time:** the right answer and its explanation appear; the creature attacks; she is hit.
  - Each spell costs magic. With no magic left she can still **bonk** with the staff, for much less. That is what
    makes potions matter.
- **Items** — potions and cakes. Using one is free: the creature does not get a turn for it.
- **Friend** (once a friend has joined) — her friend's special move, once a battle.
- **Run** — leave the room. The creature heals.

**The clock** is a setting: Relaxed 45 s, Normal 30 s, Brisk 20 s, or no timer at all (a grown-up can switch it off;
her older sister hates time pressure, so it is never forced on).

**Several creatures:** she picks a target, the creatures take turns striking after a miss (one strike per miss, from
the next creature in line), and a Starfall spell (later) hits them all.

## 6. The danger curve

The question difficulty never changes with depth: she always gets her own year. **Depth changes how hard creatures hit
and how much they can take.** Starting numbers (to tune after playtests):

| Depth | A creature's hit | Its health | Hits to knock her out at the start | …after the Starlight Cloak | Right answers to win with the first staff |
|---|---|---|---|---|---|
| ★ | 20 | 30 | 5 | 10 | 3 |
| ★★ | 34 | 30 each | 3 | 6 | 3 a creature |
| ★★★ | 50 | 60 | 2 | 4 | 6 |
| ★★★★ | 100 | 120 | **1** | 2 | 12, but magic runs out at 6: about 20 with bonks |
| ★★★★★ | 150 | 200 | **1** | 1 (needs more gear) | 20 + |

- **Health** starts at 100, **magic** at 30 (a Sparkle costs 5).
- **Ward** (from clothes with magic in them) divides a hit: a hit lands as *hit ÷ (1 + ward)*.
- **Staff power** is the damage of a spell: 10 for the first staff, 20 for the Moonlit Staff, 30 for the Starfall Staff.
- **Health and magic** grow with some rewards (a locket, a tiara).

So a perfect run *can* beat the Library on day one, with twenty answers in a row and no slip. Two rooms of gear later,
the same fight is half the length and survives a mistake.

## 7. The rewards

Every room has one surprise. A mix of the four kinds: **wear** (dress-up), **power** (the fight), **friends and
places** (the play), and **the castle itself** (shortcuts, the map).

| Room | The surprise | What it does |
|---|---|---|
| Dressing Room ★ | **The Enchanted Wardrobe** and the **Starlight Cloak** | Dress-up opens: hats, capes, dress and hair colours. The cloak is ward 1 (hits hurt half) |
| Sewing Room ★ | **The Mice Seamstresses** | Design a dress: fabric, pattern, colour, cut; each one joins the wardrobe |
| Kitchen ★★ | **Chef Mirabelle** and Magic Cakes | Bake and decorate cakes with her; a cake heals fully in battle |
| Pantry ★★ | **The Cookie Jar of Plenty** | Two potions every visit |
| Music Room ★★ | **Maestro Fig** and the piano | Learn the notes on the stave and play songs; each song learned is a charm |
| Portrait Gallery ★★ | **Your portrait** and the **Ruby Ribbon** | A painting of her in today's outfit appears on the wall; ribbon = +25 health |
| Rose Garden ★★ | **Basile the gnome** and the flower beds | Grow magic flowers; their petals are new dye colours |
| Stables ★★ | **Étoile, a pegasus foal** | Groom, braid her mane with ribbons; later ride her between wings |
| Dining Hall ★★★ | **The Tea Party of Ghost Aunties** | Lay the table and pour the tea; the aunties tell you which room to try next |
| Ballroom ★★★ | **The Dancing Suits of Armour** and the **Glass Slippers** | A rhythm dance; the slippers are ward 1 |
| Orangery ★★★ | **Lila, a light sorceress** (a friend) | Joins battles: after each right answer she adds her own spell; once a battle she shields a miss |
| Hedge Maze ★★★ | **The Moon Rose** | A shortcut gate from the garden to the towers |
| Lake ★★★ | **Coralie the mermaid** and a fishing rod | Fish for lost treasures (accessories) |
| Nursery ★★★ | **The Dollhouse** | A tiny château she decorates with the furniture of rooms she has won |
| Bathhouse ★★★ | **The Bubble Salon** | Hairstyles and hair colours; the **Bubble Shield** spell |
| Art Studio ★★★ | **Madame Palette**, who steps out of her frame | Colour in portraits of herself and her friends |
| Library ★★★★ | **The Moonlit Staff** and **Archivist Hoot** (an owl) | Spells hit twice as hard; the Bestiary of every freed creature |
| Royal Bedchamber ★★★★ | **The Heart Locket** and the **Great-aunt's diary** | +50 health; the story, page by page |
| Observatory ★★★★ | **Selene the star-sorceress** (a second friend) and **Starfall** | A spell that hits every creature; join-the-dot constellations |
| Clock Tower ★★★★ | **The Pocket Watch** | The clock runs half as fast in battle |
| Cellars ★★★★ | **Professor Toadwick's Potion Lab** | Brew potions from recipes (counting drops, mixing colours) |
| Moon Tower ★★★★★ | **Lady Lumière** freed, the **Lumière Gown** and the **Crown of Light** | The ending: the whole château lit, a ball with every friend |

## 8. The mini-games (and who runs them)

The brief says these matter, so each is a place to go back to, with a character worth visiting:

- **Magic Cakes with Chef Mirabelle** (Kitchen). A flamboyant pastry sorceress who sings while she whisks with a wand
  shaped like a spoon. Choose the sponge, the number of tiers, the icing and the toppings, then bake it with a spell.
  Cakes heal in battle. Later: recipes that count (three eggs a tier, so how many eggs?).
- **The Piano with Maestro Fig** (Music Room). A small, fussy ghost owl in a waistcoat who conducts with a feather.
  Learn where do, ré, mi sit on the stave; play falling notes; then read a short tune off a page of sheet music
  without help. Each song learned is a **charm** to play in battle (the creature skips its next strike).
- **The Seamstress Mice** (Sewing Room). Pick a cut, a fabric, a pattern and trims; the mice sew it in a whirl.
- **Étoile the pegasus foal** (Stables). Brush, braid, feed, then fly between wings (the fast way round).
- **The Dancing Armour** (Ballroom). A rhythm game on four arrows; the steps become dance moves she can do anywhere.
- **Basile's flower beds** (Rose Garden). Plant, water, wait; the colours become new dyes.
- **Selene's star charts** (Observatory). Join the dots into real constellations and learn their names.
- **Professor Toadwick's potions** (Cellars). A frog alchemist: follow a recipe by counting, measuring and mixing.
- **Madame Palette's portraits** (Art Studio). Colour a portrait; it hangs in the gallery for good.
- **The Dollhouse** (Nursery). A tiny copy of the château to furnish with what she has won.
- **The Bubble Salon** (Bathhouse). Coralie's cousin washes and styles her hair; bubbles to pop.
- **The Ghost Aunties' tea** (Dining Hall). Set the table, pour the tea; the aunties gossip about which room to try next.

## 9. Learning design

- **The chooser is Rocket School's:** year (CP to 5e), subject (maths, French, English, science, geography, history),
  then a topic or "everything". "Mix all subjects" is one more choice. It is on the title screen and in the pause menu.
- **Questions come from the year and the two before it,** her own year most often (Rocket's rule, as the life sim uses
  it). Rocket's per-item memory asks the ones she has not got right yet more often.
- **A miss always teaches:** the right answer and Rocket's worked line show during the creature's turn.
- **Depth never makes questions harder;** her year does. A hard topic does not lock her out of a room.

## 10. Look, sound, feel

- **Final Fantasy anime:** the heroine in MToon (her own anime shading), dramatic coloured light, bloom on magic and
  candles, particles everywhere (dust in the dark, sparkles and petals in the light), damage numbers that bounce,
  screen shake on hits, a victory pose.
- **Two palettes a room:** dark = cold blue and sick green, dim, foggy, desaturated; won = warm gold and rose, clear,
  lit by candles and sun. The change is a sweep, not a cut.
- **Creatures are cute-spooky,** never gory: big eyes, sulky faces, glowing bits.
- **Sound** is made in the browser (no files): a low hum and drips in a dark room, a music-box tune once it is won,
  chimes for spells, a soft thump for hits, a fanfare for a win.
- **Pause any time; sound on and off; quality low or high** (the tablets are slow).

## 11. Platforms and limits

The family's Windows tablets (slow, 4 GB) in Chrome or Edge, a desktop, touch and mouse and keyboard. Static files, no
server needed once built. Everything except the heroine and her animations is drawn in code, so the download stays
small. English first, every word through a table so French can follow.

## 12. The toy version (round 1, this build)

**One night in the château: the Grand Hall and three doors.** Enough to try the whole loop and the danger curve.

| In | Out (later rounds) |
|---|---|
| Title: the château at night; her name; the chooser (year, subject, topic, mix) | The wings, corridors, the map, getting lost |
| The Grand Hall: walk in third person (tap or click the floor, or the arrow keys / WASD) | Friends in battle, Items beyond potions and cakes |
| Potions that glow in the Hall and come back a minute after she drinks one | More spells (Starfall, charms, Bubble Shield) |
| **Dressing Room ★** — a Tatter Moth → **the Wardrobe** (dress-up) + **Starlight Cloak** | The Music Room and piano, the pegasus, every other room |
| **Kitchen ★★** — two Soot Sprites → **Chef Mirabelle** + **Magic Cakes** | Sound beyond simple made-in-code effects and tunes |
| **Library ★★★★** — the Grumpy Grimoire (one hit knocks her out at first) → **Moonlit Staff** | French |
| FF battles: Magic / Items / Run, timer, Brilliant!, bonk, explanations, knockouts | |
| The light sweep when a room is won | |
| Saved in the browser; settings: timer, sound, quality | |

**What the playtest asks her** (her words, verbatim into BRIEF.md):

1. Does she like her sorceress? What would she change first?
2. Is the clock too fast, too slow, or should it go?
3. Did she try the Library early? What happened, and did she understand why?
4. Are the fights the right length?
5. Which next: the piano, the pegasus, the sewing mice, or the friend?

## 13. After the toy

- **Round 2:** her playtest notes; the Music Room and Maestro Fig's piano; the first corridor.

  **As built (2026-11-12, BRIEF.md):** Richard asked for more levels and new mini-games "plus the option of repetition
  with variables". Built, and where it parts from the tables above:
  - **The Library's mini-game** (§7 named only the Bestiary): Hoot's shelf of six books, each with a question; all six
    give the **Owl Quill** (+10 magic). The Bestiary is one of the six, its pages filled as creatures are freed.
  - **The Swan Wing** is one corridor, the **Swan Gallery**, behind a door in the Hall that opens with the Library. It
    holds three rooms, not the four in §3: the Portrait Gallery and the Orangery wait.
  - **Music Room ★★★** (two Off-Key Sprites) → **Maestro Fig**, a frog in a tailcoat (§8 had a ghost owl: Hoot is the
    owl now). Find the note, Follow the glow, Read the music; five songs; reward the Song of Courage (+50 health), not a
    charm yet.
  - **Tea Room ★★★★** (a Nibble Moth and a Crumb Sprite; not in §3) → **Chef Praline**, Mirabelle's cousin: biscuits,
    the cake game's way of playing with other choices. Reward the Sugar-Glass Charm (ward 2: hits a third).
  - **Ballroom ★★★★★** (the Midnight Moth Queen) → **Madame Lune**, a moonlight butterfly, in place of the Dancing
    Armour; the four-arrow rhythm dance of §8 with three dances. Reward the **Dawn Staff** (power 30), not the Glass
    Slippers; ballgowns, a moon crown and a midnight cape join the wardrobe.
  - **Repetition with variables:** the bakery (`BAKERY` in main.mjs), the songs (`SONGS`) and the dances (`DANCES`) are
    data, so a later room adds a bake, a song or a dance without new code.
- **Round 3:** the Rose Wing as real corridors with the map and "Lumi, take me home"; the Sewing Room.
- **Round 4:** Lila joins (friends in battle); the Orangery; the Portrait Gallery.
- **Round 5:** the grounds and Étoile; the first floor.
- **Then:** the towers, the Cellars, the Moon Tower and the ending.
