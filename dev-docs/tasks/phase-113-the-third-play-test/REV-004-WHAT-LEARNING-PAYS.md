# REV-004 — What learning pays

## 1. The person sentence

**Rote memorisation has a score: every item of a list a child learns pays, and learning the whole list pays more, said on
the verdict line and on the result card. And there is more to buy with it.**

Richard: *"We might need more points and prizes too, because this shit is boring AF … give them as much of a way to
distract themselves from the horror of rote memorisation as possible."*

## 2. What was built (session 1) — the stars

`STAR_RULE` gained `item: 2` and `list: 25` (`tpl007Scripts.ts`); `ITEM_LEARNED_AT = 2`.

- The grader takes `itemKey` and `itemCount` from the picker. An item is **learned** after two right answers in a row
  (on separate turns: the picker never asks the same item twice running). Learning it pays 2 ⭐ **once** (`paid`, like a
  mastery level); a miss unlearns it without taking anything back; re-learning pays nothing. Every item of the list
  learned pays 25 ⭐ once per list (`listPaid`).
- The verdict line says it in the same numbers (`· 📚 +2 ⭐`, `· 🏆 +25 ⭐`); the race remembers `itemStars` and the
  result card says `learned +N`; Monster Gate's finish says it too. Player two's turns learn nothing for this profile (D63).
- The list's eyebrow counts what is learned ("Which mode? · 12/20 ✓"), from the model's own count.
- The existing economy applies to a list as to any skill: a list is a skill, so its mastery levels pay the usual 10 each.
  Driven: eight right answers on a four-item list paid "right answers +8 · landed +5 · new level +20 · learned +6".

## 3. Gates and drive

- Engine ("P113 REV-004"): learned after exactly two; paid once; a miss unlearns without taking back; the list bonus once;
  `model.race.itemStars` and the finish's "learned +N"; player two learns nothing; a generated maths question (no item)
  grades as before.
- Driven: `drive-p113-focus.js --arm lists`, clause `learned` (the stored model counts ≥ 2 learned, stars grew beyond the
  answers alone).

## 4. The prizes — Richard ruled "something new": the moon ([REV-005](REV-005-THE-MOON.md))

*Session 3:* *"For the something new, something more concrete like adopting little aliens on a moon in the game and buying
food and accessories for them."* What follows is the menu he chose from.

The hangar sells 47 items: face parts (DiceBear, per look) and the rocket's paints (theme tokens) and patterns (decals
the kit draws: stripes, dots, checker, chevron, flames, stars, bolt). Adding a prize means one of:

| kind | what it costs | gate |
|---|---|---|
| a face item | a DiceBear part the installed schema has, looked at on a contact sheet (PLY-001: a part invisible at avatar size is a prize that changes nothing) | `tpl007Template.test.ts` AC4 (schema) |
| a paint | a `--rocket-paint-*` token in `tpl007Theme.ts` that clears 3:1 on every ground | AC4 (contrast) |
| a pattern | **kit code** in `library/modules/game-kit/src/kit.js` (`PATTERNS`), a build of the kit, and the kit gate | `tpl007GameKit.test.ts` |
| something new (a planet skin, a trail, a sound pack, a title) | a kit node change and a shelf `kind` | new |

Richard's call: which kind, and how many. My suggestion, for a child revising lists: **rewards tied to the lists** — a
"list learned" sticker on the profile card per list mastered, and a rocket trail colour unlocked at five lists — because
the point is to make the grind visible, not to inflate the shop. None of it is built.

## 5. Acceptance criteria

| AC | clause | state |
|---|---|---|
| AC1 | An item learned pays once; a list learned pays once; nothing is ever taken back | ✅ gate + driven |
| AC2 | The verdict line and the result card say what learning paid | ✅ gate (line) + driven (card) |
| AC3 | More prizes on the shelf, of a kind Richard chose | ✅ ruling 4 → [REV-005](REV-005-THE-MOON.md): aliens on a moon, food and things to wear; gated + driven |
| AC4 | The kids say it is less boring | ⬜ |
