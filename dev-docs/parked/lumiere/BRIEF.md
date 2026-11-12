# Château Lumière: the brief, as asked

Richard, 2026-11-01, for one of his children (her age is left out of this public repo; she is at primary school in
France, so the default school year is CE2). Verbatim:

> Let's scope out a new game for my middle child […]. She'd like a game with the following scope:
>
> * Anime character style, we can reuse the anime character we abandoned for the sims life game
> * Setting is inside a haunted chateau, very large Disney style with lots of wings and turrets and places to explore
>   and easy to get lost
> * Background is castle is haunted, you've inherited it, it was a beautiful castle back in the days but has fallen
>   into ruin and been taken over by bad magical creatures. Your job is to clear out each room in the castle to reclaim
>   it. You're a junior sorceress, you have a staff and you can do basic magic at the start. You enter the 'easy' rooms
>   at the start, get faced with one or more bad magical creatures in a very dark, dank run down room, and have to
>   answer questions from the Rocket Game (for her school level, she can choose the level, subject and subsubject as in
>   the Rocket Game), and if you answer right it shoots magic at the bad creature, answer wrong and they shoot you.
>   Final Fantasy style animation and turn taking until you either get knocked out and have to leave the room, go find
>   magic potion and health stuff to regenerate your health and magic, then come back to try again, or you beat the
>   creature and the room suddenly becomes bright and beautiful again.
> * Each room conquered if permanently yours again, and each one contains a surprise feature. Say the first one is an
>   old dressing room and when you win it back, you get rewarded with a new item of clothing or accessory. Other rooms
>   can have similar rewards, or a more powerful staff that allows taking on bigger challenges, or a friend you can
>   quest with who's also a sorceress, or etc etc use your imagination to make a diverse list of rewards that play
>   into the dress up girly concept but also being able to beat the game more easily.
> * If a player takes on a deeper room in the castle too quickly, each hit form the enemy deals more damage that if
>   they'd got better equipment from previous rooms, so say one hit in certain rooms will take them down, others two
>   hits, so the player sees that clearing rooms is the way to get stonger and not risk getting knocked down with one
>   wrong answer in later rooms. In theory if the player answers everything correctly (questions are time limited),
>   they could beat a bigger boss, but it'd take a lot more questions than if they'd levelled up first. So in general
>   they'll be discouraged from that
> * Maybe some rooms can unlock mini games with funny characters in the castle, like reclaiming the kitchen lets you
>   cook cakes with the beautiful castle chef sorceress or something, or beating the music room lets you practise the
>   piano and learn some basic sheet music. Use your imagination on that one, it'll be important
>
> Let's put the full scope and decide on the first step toy version and build it out for testing please. 3rd person
> view, focus on attractive style and design to make it feel like a Final Fantasy style attractive anime game for girls

## What that rules

- **The heroine** is the life sim's anime VRM (pixiv's VRoid sample), set aside there on 2026-10-27 round 3 for the
  realistic people. Here it is the pick.
- **The questions** are the Rocket School's, through the copy the life sim already made (round 9): she chooses the
  year, the subject and the topic.
- **Right answer = your spell; wrong answer (or time up) = their attack.** Questions are timed.
- **Knocked out = leave the room**, find potions, come back. No game over.
- **A won room stays won**, turns bright, and holds a surprise.
- **Deeper rooms hit harder** unless you have the gear from shallower ones: one hit, two hits, and so on. A perfect run
  can still beat a big room early, at the cost of many more questions.
- **Mini-games with funny castle characters** matter ("it'll be important").
- **Third person, FF-style anime, attractive.**

Rulings and reactions after this go below, verbatim and dated.

### 2026-11-01, Richard, after trying round 1

> Let's improve Chateau Lumiere. The basic gameplay is ok, but the walk and run speeds are painfully slow, and the
> chateau visuals need a second pass to improve them please. Focus on making it a bit more visually impressive and more
> visually impressive gameplay

What it ruled: round 1b (README.md, "The look"). Her paces went from 0.95 / 1.6 m/s to walk 1.6, jog 3.4, sprint 5.6;
the château got its second visual pass, and the fights and the won-room moment got bigger effects.

### 2026-11-01, Richard, after trying round 1b

> Let's fix some bugs in the chateau lumiere game:
>
> 1. When the player casts a spell, her face glows bright for some reason, and her spell lands on the enemy as a
>    bright ball but the ball stays there, throughout the fight and even after the fight ends.
> 2. When inside a room, the player often runs backwards when pressing forwards
> 3. The questions with the pointing up emoji or the not equals emoji are confusing, these should be stated in words
>    not with emojis, an 8 year old can read fine
> 4. Some clothing parts are not coherent. The cape when viewed from the side is often detached from the neck and
>    stiff.
>
> apart from that the concept is perfect, game mechanics ok if a little easy, and the visuals are stunning. This is a
> keeper

What it ruled: round 1c, the four fixes (dev-docs/bugs/parked-lumiere-r1c-*). The concept, the look and the mechanics
stand; "a little easy" is noted for round 2's tuning, not changed yet.

### 2026-11-12, Richard, after playing round 1c

> Can you advance the lumiere game please? The only bug is that the girl still walks backwards when inside rooms after
> clearing them, and the lights are too bloomy and bright when the rooms are cleared so it can be hard to see. Also when
> you beat the boss and you open the library, it's sad that this was just a room and had no 'mini game', because a mini
> game could be as simple as just discovering some lore about the castle in books in the library, or reading a recipe
> for cookies or something, it doesn't have to be complex. You can also reuse minigames, for example later on there
> could be another dressing room that has more clothing options, another kitchen that's cooking different kinds of
> food, or whatever. Otherwise I think we're ready for more levels

And, a moment later:

> P.S. Don't JUST re-use the mini games, it was just a suggestion. We need new mini games, plus the option of repetition
> with variables

What it ruled: round 2 (README.md, "Round 2"). The two bugs are fixed (dev-docs/bugs/parked-lumiere-r2-*): the fight
start turned her with `lookAt`, which can leave a turn of half a circle on x and z that the walk never undoes, so she
walked mirrored in every won room; and the won rooms' lights, fog, glass and bloom came down. The Library got Archivist
Hoot's shelf (six books of lore, a recipe and jokes, each with a question; a star on all six is the Owl Quill). Then the
Swan Wing behind a new door in the Hall: the Music Room (Maestro Fig's piano, new), the Tea Room (Chef Praline's
biscuits: the cake game played again with other things to pick, its Moon shape unlocked by the recipe read in the
Library) and the Ballroom (Madame Lune's rhythm dance, new). Songs, dances and bakes are data, so a later room adds more
of each without new code.
