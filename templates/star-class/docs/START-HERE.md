# Star Class

Maths, English, Science, Reasoning, Geography and French practice for school children from P1 to JSS3 (P1, P2, P3, P4, P5, P6, JSS1, JSS2, JSS3), in an
English or French interface, built entirely out of NodeGX nodes. Press **Run**, make a player, and race the computer
to the planet.

It is an edition of Rocket School: the same four games, the same learner model, the same hangar and moon. What
differs is the school: 9 classes, money is naira in English and CFA francs in French, and neither typing nor
the French history bank is shipped.

The class a child picks is a first guess. A new player is rated 2 classes below it, and the race climbs
to their class as they answer. A class with nothing to ask yet borrows the nearest class that has something.

There is no backend and nothing is downloaded while playing. Profiles and progress live in this browser
(localStorage, key `star-class`), and every player has a **save code** to carry their progress to
another device.

## The first thing to change

Open **Data/Curriculum** and find the node labelled **"the skills — this list IS the school"**. One entry is one
skill, with the class it starts in (`"level": "P3"`). 154 skills ship: maths (73), English (16), Science (11), Reasoning (10), Geography (11) and French (33).
Add an entry and every game can ask about it.

## How it is made

`npm run template:star-class` writes this folder. It builds Rocket School through the same plan and changes
only the class names, the money, the subjects and the name (`packages/noodl-mcp/tests/tpl013Edition.ts`), so a fix
to the game reaches both.
