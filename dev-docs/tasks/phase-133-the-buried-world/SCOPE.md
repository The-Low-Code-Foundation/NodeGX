# The Dig, grown up: a buried civilisation, a pulse to find it, your list inside it

Scoping, 2026-11-03; ruled the same day (§11) and opened as phase 133 ([README](README.md)). Nothing here is built yet. Written from Richard's message of the same day (the sonar, the
lost civilisation, nightly lore, accounts, the todo app and Betr), his P.S. (the base becomes a landed spaceship),
and a read of the game, the todo app, its backend and Betr.

**No spoilers in this file.** Richard asked to discover the lore himself. This file says how the lore is made,
stored and shown, never what it says. The lore itself lives behind a spoiler wall (§7) and no summary to him
quotes it.

---

## 1. What he asked for, in his words

> "a new tool or accessory that can do a kind of subterrainian radar blast, that would show within X blocks where
> there are cavities in the rock … not like a cheat … but good enough that you're not just digging for miles …
> when you're like 3 blocks away from a cavern on your left."

> "do away with the map with the directional indicators entirely … Maybe make the sonar thing the only way to find
> new areas, and its limited to a block radius around your position so you're motivated to keep going deeper."

> "a civilisation that lived on the world's surface a long time ago … underground you still have passages, rooms,
> caverns … Sprawling networks of tunnels, some collapsed … Connections between 'villages' underground have
> collapsed so you do have to dig and discover."

> "libraries of lessons about how to reach perfect equilibrium between mind, body and environment … meditation and
> mindfulness, gratitude, empathy … principles from nice religions like Buddhism, Taoism, Hinduism, etc. but white
> label them."

> "Some areas collapsed and broken, needing to be dug out … some small parts reasonably intact and beautiful,
> showcasing their art and culture."

> "Claude running to create new lore and places and secrets, expanding the world a bit every day … players have to
> add their own todo items … no Claude spend for users from now on personalising their todo tasks."

> "a todo task is assigned a certain category, how anxious it makes the person, how important it is, if they're
> losing sleep over it … if it's a big life change."

> "integrate Betr … 'say what you think will happen and then record how bad it actually was' … absorbed into the
> todo app somehow, and synced with the Dig game."

> P.S. "make the 'home base' … a space ship, so it's like you've landed and gone out the hangar to explore the
> planet, but the ship doesn't do anything. Make it a nice big ship for fun."

His standing rules still hold (README): no streaks, no points, no "should", nothing social, warn but never punish,
the iPhone in landscape with few buttons.

## 2. What exists today, measured

- **The game** is plain JavaScript and three.js, about 8,000 lines in `public/src/`. The world comes from a seed;
  every building (cabins, mine corridors, geodes, shrines, hamlets, lairs, vaults) is decided from its own 48-block
  cell, so every chunk agrees without talking to the others. The room Richard found today, "a stone pillar
  structure inside a small room with a box in the middle with some ammo", is a **shrine**: by the picker in
  `siteIn`, 15 cells in 100 between 16 and 30 blocks down and 6 in 100 below that, before the check that drops a
  site with no rock under it. Unlike a vault, it has no compass mark.
- **The compass** marks the day's rooms, open portals, the base, daylight shafts, lairs and vaults.
- **The night shift** (Claude reads his todo list and plants 3–5 rooms) is written but **not installed**. Today's
  rooms are always the samples.
- **The live copy** at nodegx.io/lab/dig/ is static: no accounts, the save lives in that browser.
- **Rounds 2–6 are not committed.** They sit in the working tree of the NodeGX repository, which is **public**
  on GitHub.
- **The todo app** (todo.digitalbricks.io) is a NodeGX app on NodeGX's own backend: accounts with sign-up open,
  password reset, email verification, per-person rows (`Task`, `Action`, `Project` …), and **delete switched off
  on purpose** (you close a task by writing what happened). It can accept requests from another web address once
  that address is on its allow-list.
- **Betr** is a separate, public, MIT app with promises written into its tests: no account, no AI, nothing
  leaves the phone, no numbers or streaks, fixed wording, crisis lines. Its research file (`docs/research/10-…`)
  holds the legal line between a wellness tool and a medical device.
- **Claude on the API**, today's prices: Opus 5.5 is $4 per million tokens in and $20 out, with cached input at
  $0.20 and overnight batches at half price. Fable is not used (his rule, 2026-10-24).

## 3. The idea in one paragraph

You land a big ship on a quiet green planet and walk out of the hangar. There is nothing on the surface. Under it
are the remains of a people who went underground long ago and lived there for a very long time: their halls,
roads, gardens and libraries, most of them collapsed, some of them still beautiful. Your ship's **pulse** shows
you, fuzzily, where the rock is hollow within a short reach, so you dig toward the nearest one and find out what it
was. What they left behind is partly their story and partly **what they practised to stay sane down there**:
attention, gratitude, care for each other, letting go. Every night Claude writes **one more district** of this
world for everyone. Your own todo list lives in the todo app, now with a little more about each task (how heavy it
feels, whether it keeps you up, what you think will happen), and the game brings **your** tasks into **their**
world: a sealed chamber with your task on the door and one of their practices beside it. Answering opens a portal,
as now. Claude never reads anyone's list.

## 4. The pulse (the sonar)

**What it is in the fiction:** standard kit from the ship, like the multitool and the hook. Things found down
there tune it further. That makes it something you have from the first minute, so a new player is never lost.

**How it works:**
- Hold the pulse button for about a second and let go. A ring goes out through the rock (you see it ripple across
  the view) and comes back.
- **Only in front of you**, in a cone about 100° wide, out to **about 28 blocks** to start (a weak sphere of 8
  blocks all round, so a cave right under your feet still shows). Tuning finds push the reach to roughly 40 and 56.
  "Three blocks to the left" is always caught: turn and pulse.
- **What you see:** soft, fuzzy glows hanging in the rock where the hollows are, as if you could half see them
  through it. They appear as the ring reaches them (near ones first, far ones a beat later, so distance reads
  without a number) and fade over about six seconds. The farther away, the bigger and blurrier the glow and the
  more it wanders from the true spot. No outlines, no shapes, no labels.
- **Colours, five only:** plain hollow (cool grey-blue), water (teal), lava (dull red), **worked space**, meaning
  anywhere they built (warm gold), and **a chamber with one of your tasks in it** (slow violet pulse). Creatures do
  not show: that would make it a radar for fights.
- **Sound does half the work.** A low ping, then the echoes come back from where the hollows are, panned left and
  right and delayed by distance. Built spaces ring like a bowl; plain caves sound dull. With headphones you can find
  a room with your eyes shut.
- **The cost:** a pulse recharges in about 12 seconds, and it is **loud**. The brute that hunts by sound hears it
  from about 40 blocks. Pulse in a quiet patch, or pulse and move.
- **Pins:** tap a glow (or press E while looking at it) to pin it. A pin is yours, so it goes on the compass.
- **Phone:** one round button above the jump button, there whatever is in hand, so you pulse and then dig. Desktop:
  R.

**How it is built:** sample the cells in the cone on a 2-block grid (about 17,000 samples at the full reach, a
few milliseconds), group the open cells into blobs, sort each by what borders it (built blocks make it gold), and
draw each blob as a few additive soft sprites drawn over the rock. Cells not yet built into chunks are read from
the generator, as the rooms' placement already does.

**The compass after this:** north, east, south, west, your depth, your own pins, and the ship. Every room, vault,
lair and daylight-shaft mark goes. Today's task chambers keep their hum (a sound, close up) and their violet pulse
glow; nothing points at them from afar. *(R2 in §11: ruled as written here.)*

## 5. The ship (the P.S.)

- Replaces the plank house at the spawn clearing (`stampBase`). **Big**: about 60 blocks nose to tail, 30 across
  the wings, 14 high, standing on landing legs with the ground under it levelled and scorched in a ring.
- **Inside:** the hangar at the back with its ramp down to the grass (where you walk out), crew bunks (where a new
  game starts), the med bay (where you come round after dying, pack untouched as now), a workshop with the crafting
  bench and the ship's log on a screen, a mess, a corridor of lit panels, and the cockpit up front with a big window
  over the nose. Nothing in it does anything, as asked.
- **Look:** Minecraft-style blocks in new hull plating, dark glass, warm cabin lights, hazard stripes on the ramp,
  running lights blinking on the wingtips. A few new block textures and two or three voxel props (seats, a console
  bank).
- The ship's log replaces the base's logbook note, and the old miners' logbooks become an earlier expedition that
  came down before you (their notes stay, their wording kept).
- A ship that size crosses several 16-block chunks and must never float: it is levelled the way the cabins are
  (rock or soil under every leg) and stamped by every chunk it touches, as the base is now.

## 6. The buried world

### 6.1 Three layers

1. **The engine (in the game, the same for everyone):** the rules for how their places are built and how they fall
   apart. Deterministic, like the caves: the same seed always gives the same village.
2. **The canon (written once, hidden):** who they were, their history, their practices, what happened. Written in
   the first lore session and only ever added to.
3. **The nightly districts (one a day, for everyone):** each night Claude writes one district *as data*: which
   kind of place, how big, how ruined, what is carved where, which of their practices it holds, any secret, and the
   portal worlds behind it. **Claude never places blocks.** The engine turns the data into rock, and a checker
   refuses a night that breaks the rules, so a bad night ships nothing and the world simply doesn't grow that day.

### 6.2 What the engine builds

- **Settlements**, from a few rooms to a town, as a graph of spaces (halls, homes, stores, cisterns, gardens, a
  library, a shrine, vent shafts, stairwells) joined by passages and laid out on a grid of district slots well
  apart. Several **styles** of building, each with its own block palette and proportions: rooms carved straight
  out of the rock, towns built into a natural cavern on terraces, water gardens, crystal sanctuaries and deep
  archives (the names of their styles are lore, so they are not here).
- **Roads between settlements**, mostly fallen in: a road runs for 20 blocks, then it is a wall of rubble, then it
  carries on. That is the "connections have collapsed, you have to dig" he asked for.
- **Collapse, run as a pass after building:** sections of roof come down into rubble (a new block, fast to dig,
  like digging a buried room out), pillars break, floors split over a cavern, a hall half fills with gravel.
  Most of every place is damaged. **A few pockets in each settlement are left whole on purpose**, and those carry
  the beauty: murals, mosaics, carved friezes, statues, lit gardens, a library wall.
- **Remnants everywhere between settlements**, unmarked, many more than today's shrines: wayside shrines (in
  variety, not today's one shape), sealed caches, a buried stair going nowhere, a carved niche, a ventilation shaft,
  a lone statue in a cave wall. Found with the pulse and by accident. Aim: something worth finding within a short
  dig of anywhere below 16 blocks, so long tunnels are never empty, with the counts measured in Node per depth the
  way the caves are.
- **Real places to learn from** (inspiration for the shapes, not copies): Derinkuyu and Kaymaklı in Cappadocia
  (cities cut many storeys deep, with air shafts, stables, chapels, stone doors rolled shut from inside, and a
  tunnel between the two towns); Naours in Picardy (a refuge town of a few hundred rooms under a plateau); the
  rock-cut temples at Ellora (carved top-down from one cliff); the salt chapel at Wieliczka (chandeliers and
  reliefs carved from the rock itself); the pit houses of Matmata. One mechanic comes straight from Derinkuyu: **a
  rolling stone door** you roll aside to get in.
- **New blocks and props:** carved stone and its cracked form, rubble, mosaic tiles, mural panels (a mural spans
  several blocks; the motifs are a fixed set drawn in code at first, and in a later round Claude may draw small
  pixel murals as data on a fixed palette, checked), friezes, statues as voxel models, lanterns of crystal, shelves
  of tablets, banners, water channels and pools, the stone door.
- **What a player reads:** carved lines on lintels, tablets on shelves, captions under murals, a few personal
  notes, songs. Each is short. Everything found goes into a **record** you can read again from the menu, in the
  order you found it, with **no total and nothing marked missing** (the same rule as the ammo panel).
- **Some places creatures won't enter.** A few intact rooms are safe to stand in. Why is for the lore.

### 6.3 Where each night's district lands

The world is the same shape for everyone, but **where each district lands is decided per player, at the edge of
what that player has explored, and then kept.** A player coming back finds the new district a short dig from
where they last were; a player who starts in week six finds the forty-odd districts already written laid out from
the ship outward and downward, oldest nearest. Nothing about a district depends on where on the map it sits, so the
story reads the same either way. (Nothing is social, so nobody needs to share coordinates. If that ever changes,
one shared map is a later decision, not a rebuild.)

### 6.4 Their practices (the "lessons")

- **Drawn faithfully from real traditions**, renamed into their culture but never invented, never misquoted. The
  families: attention and the breath (Buddhist mindfulness), noticing that everything passes (impermanence),
  loving-kindness toward others and yourself (metta), steadiness (equanimity), going with the grain like water
  (the Tao Te Ching's water, wu wei), doing the work and letting go of the result (the Bhagavad Gita, karma yoga),
  sorting what is yours to change from what isn't (Epictetus), picturing the hard thing beforehand to take its
  sting (Seneca), three questions about what you were given, gave and cost others (Naikan), a daily look back with
  gratitude (the Ignatian examen), rest as sacred (the sabbath), "I am because we are" (Ubuntu), mending with gold
  (kintsugi). The canon picks which ones they lived by and how.
- **Inside the game, everything stays in their world.** Outside it, the menu has a plain page, **Where these come
  from**, naming the real traditions each practice is drawn from. That keeps the white-labelling honest and is the
  only place real names appear.
- **Never advice in our voice.** A practice is something *they* did, shown as theirs. No "should", as always.

### 6.5 The nightly job

- Runs on the nexus box at night: Claude through the API with its own key (not Richard's subscription; this is a
  product other people use), **Opus 5.5**.
- **It reads only the canon and the last districts. It cannot read any player's data**: the job has no database
  credentials at all. This is the promise for the launch: *Claude writes the world. It never reads your list.*
- Two passes: the writer drafts the district, then a second pass reads it against the canon and the rules
  (consistency, no contradictions, every practice carrying its source, length limits, no "should"), then
  `check-district.mjs` checks the shape. A refused night is logged and nothing ships.
- **Cost, estimated:** the canon read from cache, a district of 20–40 short texts plus the review pass is in the
  region of $1–2 a night, **$30–60 a month**, and it does not grow with the number of players. Measured on the
  first week of real runs before the cron goes in.
- Output goes into a published folder of district files the game fetches, so the world grows for everyone at once.

## 7. The spoiler wall

- The canon and the districts live in a **private** place: a new private repository for the game's content, or
  the server only. **Not in the NodeGX repository, which is public**; anything there can be read by every player.
- Whoever writes the canon (a lore session with me) reports to Richard only *that* it is done and how big, never
  what it says. Task files carry ids and counts, never quotes.
- The game's own code says how things are shown, not what they say. The texts are data, fetched.

## 8. The todo app and Betr

### 8.1 The todo app gains a little (a NodeGX template change, TPL-008)

All of it **optional**, under a fold in the task's pane, so the simple list he likes stays simple:
- **Kind:** admin, work, money, home, body, people, learning, a big change.
- **How heavy it feels:** light, some, heavy, keeping me up at night.
- **How much it matters:** a little, a lot.
- **What do you think will happen?** Betr's own shape: *If I ___, then ___.*, written before, locked in.
- **At close**, after the closing note it already asks for: *Did it go how you expected?* (*Yeah!*, *Sort of*,
  *Not really*). With the prediction above it, that is Betr's loop on a task: predict, do it, see what happened,
  read it back.
- **Predictions without a task** (a hope, a worry, something to look forward to): a small opt-in tab, like the
  Projects tab, in Betr's exact shape.

### 8.2 Betr stays Betr

Betr promises, in its tests, no account, no AI and nothing leaving the phone. A synced app with a game written by
Claude can't make those promises, so **Betr isn't merged**. Its technique, which is Richard's own, comes into the
todo app as above, and Betr stays the private, offline one. Its research carries over as rules for this product
(§10).

### 8.3 Your list inside their world

- When the game opens, it reads **your** open tasks from the todo backend (signed in), and each task you have
  marked heavy, keeping you up or a big change, plus a few others, becomes a **sealed chamber** in the nearest
  district: your task in your own words on the door, and one of their practices inside, chosen **by a fixed table**
  from the task's kind and weight (keeping you up → sorting what is yours from what isn't; a big change → things
  passing; people → kindness; body → attention; a pile of small things → one at a time; and so on). No AI picks
  anything for a person; the table is a chapter in a book.
- Each practice is written nightly with **two or three asks**, templates that take the task's words ("Write the
  part of *call the tax office* that is yours to do, and the part that isn't."). Carving an answer opens a portal,
  as now, and **the answer goes back to the task as a note** in the todo app (notes there are append-only already).
- **The record wall:** a closed task with a prediction shows up, the next time you play, carved into a wall in one
  of their halls: what you thought would happen, and what did. Read back later, in their world.
- **The portals** stay the reward. The worlds behind them now come from the nightly districts instead of from a
  personal plant.
- No task, no problem: a player with an empty list just explores. The game never asks them to add one.

## 9. Accounts, saving, hosting

- **One account for both**, on the todo app's existing backend. The game gets a sign-in screen (email and
  password, reset by email; both exist), and its own rows: the save (today's save is about 5 KB), what you have
  found, your answers, your trophies, where your districts landed. Each row belongs to its owner, as the tasks do.
- **Works offline first**, as now: everything is kept on the phone and sent when there is a connection. iPhone
  Safari wipes a web page's storage after about seven days unused (Betr's research), so the server copy is what
  keeps a person's world safe.
- **Hosting:** the game at its own address on the same box, with that address on the backend's allow-list.
- **Owed before strangers sign up:** delete my account and everything in it, and export everything, on both apps
  (the todo app's no-delete rule is about tasks, not about leaving); a short privacy page; sign-up limits; the
  backend's backups switched on. Richard lives in France, so GDPR applies, and **"how heavy it feels / keeping me up"
  may count as health data**, which needs an explicit yes from the person the first time they use it.

## 10. Rules carried over from Betr's research

- Never "treats anxiety", "therapy", "improve your mental health", "reduces stress"; say "a game with a todo list
  in it" and "practices from old traditions". The same sentence everywhere it is described.
- Help in the menu: not therapy, not medical advice; the crisis lines Betr carries (copied only from the providers'
  own pages, as Betr's rule says).
- No numbers about a person: no counts of tasks done, no streaks, no scores.

## 11. Richard's rulings (2026-11-03), with the question each answered

| # | The question | His answer, verbatim | What it means |
|---|---|---|---|
| R1 | Drop the nightly rooms Claude plants from your own list, for you too? | "Yep drop it for me too" | Claude never reads any list, his included. `tools/nightly-prompt.md` and the plant format retire. |
| R2 | Compass: keep N/E/S/W, depth, the ship and your own pins, drop the rest? | "Keep it as you stated" | §4's last paragraph. |
| R3 | The game at its own address, sharing the todo account? | "Yeah its own address would be cool, todo.digitalbricks.io is fine with a new 'Dig' button, but let's take a pass at improving the look of the todo app because it's rough. I wanted to keep it simple and still do, but not make it look like a noob built it" | The game at its own address; the todo app gets a **Dig** button and **a look pass** (simple, finished). |
| R4 | Keep Betr as it is and bring its loop into the todo app? | "Yeah bring the concepts into the todo app please, optional feature, which you could in theory integrate into Dig too at certain lesson points, optional 'what do you think will happen' moments. But make sure it's not skewing towards negative feelings as it used to, positive and negative outcomes and feelings for future events are accepted and equal" | Optional in the todo app; optional prediction moments at lesson points in the game; **hopes and worries equal** in every word, answer and colour. |
| R5 | A private repository before any lore is written? | "Yeah I guess we need one to keep it hidden" | DIG-001. |
| R6 | Invite-only first, or open sign-up? | "Just open it up for anyone, no big deal" | Open sign-up; the abuse limits in §9 still apply. |

## 12. The rounds, in order

Each round is played by Richard on the iPhone before the next starts, and pushed to the live copy.

| Round | Tasks | What |
|---|---|---|
| **7. The ship and the pulse** | DIG-001, 002, 003, 004 | The private home; the ship (§5); the pulse (§4); the compass stripped; many more unmarked remnants; the hum kept. Static, no accounts. |
| **8. The first district (the sandbox)** | DIG-005, 006, 007 | The canon behind the wall; the settlement engine, collapse and the new blocks (§6.2); one hand-made district near the ship; the record; **Where these come from**. |
| **9. The world grows at night** | DIG-008 | The nightly job (§6.5), the checker, placement at each player's edge (§6.3), a week of runs with the cost measured, then the cron. |
| **Any time: the todo app looks finished** | DIG-010 | R3's look pass and the Dig button. Independent of the game; can run beside any round. |
| **10. Accounts** | DIG-009 | Sign-in, saving to the server, delete and export on both apps, privacy page, the game's own address, open sign-up (§9). |
| **11. Predictions in the todo app** | DIG-011 | The task fields and Betr's loop, hopes and worries equal (§8.1, R4). |
| **12. Your list in their world** | DIG-012 | Chambers from tasks, the practice table, asks, answers back to the task, the record wall, optional prediction moments (§8.3, R4). |
| **13. Launch** | DIG-013 | A first five minutes that make sense to a stranger, wording checked against §10, older phones measured, the page on nodegx.io, the post. |

**Checks that decide "done", by round:** a Node census of what is in the rock per depth, before and after; a drive
for each new mechanic (the pulse sees a cavern three blocks behind a wall to the left once you turn, and no cavern 40
blocks off; dying wakes you in the med bay; a district's text is the same on two loads; a task marked "keeping me up"
becomes a chamber with the matching practice); frame time on the iPhone; the nightly checker refusing a bad
district on purpose.
