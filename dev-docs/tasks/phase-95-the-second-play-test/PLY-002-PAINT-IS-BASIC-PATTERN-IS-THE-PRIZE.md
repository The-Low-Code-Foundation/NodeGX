# PLY-002 — Paint is basic, pattern is the prize

> "Rocket colours are ok but in general a bit of a sad reward. You'd think the colour would be a basic thing, and the
> reward would be stripes or polkadots or something. We need more thought on this. Also when you choose a colour it
> sort of 'auto-buys' it which is strange UX, it should have a confirmation popup showing you your balance, how much
> it costs, what you'll have left after" — Richard, 2026-09-18

**Read first:** [the rewards briefing](../phase-87-the-first-play-test/rkt-010-rewards-research.md) §4 and its Don'ts,
and [RKT-011 §3.1](../phase-87-the-first-play-test/RKT-011-THE-HANGAR.md), whose ruling this overturns.

## 1. The person sentence

**A child looks at polka dots, sees they cost 120 ⭐ and that they have 80, plays two more races, and buys them on
purpose.**

## 2. What is there (read 2026-09-18)

| reading | where |
|---|---|
| the rocket is one `fill` per sprite. There is no second layer and no port for one | `kit.js:777` |
| the shelf's 18 items are 12 face parts and **6 flat paints** — paint is the whole of the rocket | `tpl007Curriculum.ts:797` |
| a tap on a tile spends the 🎁 pick immediately; the tile's own note is "🎁 Touche pour choisir" | `PICK_ITEM_SCRIPT`, `tpl007Scripts.ts:1911`; `HANGAR_SHELF_SCRIPT`, `:1964` |
| there is **no surface between the tap and the spend** — no dialog component exists | `components/Hangar/*` |
| stars only ever go up; nothing spends them. `HANGAR_MILESTONES`/`HANGAR_EVERY` grant picks | `tpl007Scripts.ts:96-97` |

## 3. Design

### 3.1 ✅ Ruled 2026-09-18: **stars become spendable prices** (R1)

This is [RKT-011 §3.1](../phase-87-the-first-play-test/RKT-011-THE-HANGAR.md)'s option **B**, which was refused on
2026-09-13 in favour of **A**. Richard's words — *balance, how much it costs, what you'll have left* — are a purse, and
a purse is what lets a paint be cheap and a pattern dear. **That distinction is the whole of his first sentence, and
option A cannot express it: under A every item costs exactly one pick.**

🔴 **What was earned still never drops.** `model.stars` is what the child has EARNED and only ever grows — every gate
that counts earning still reads it, and RKT-010's rule survives intact. Spending is a **second** number,
`model.spent`, and **the purse is the difference**. A profile from the pick era carries `spent: 0`: it keeps every
item it picked and keeps its whole earned total as its purse. Nothing is charged after the fact.

### 3.2 The two layers of a rocket

| layer | what | price |
|---|---|---|
| **Paint** | the hull colour — a `--rocket-paint-*` token, as today | 2 free, the rest **15 ⭐** (about one race) |
| **Pattern** | a decal drawn over the paint and clipped to the hull | **120–220 ⭐** (six to eleven races) |

Seven patterns ship, all drawn in the kit from shapes — **no new art, no images**: polka dots, racing stripes,
checkerboard, chevrons, flames, stars, lightning. They are white at 0.9 with a hairline dark edge, so one set of
shapes reads on every paint.

They are two independent layers: buying a new paint never removes a decal, and a child can wear one of each.

### 3.3 The prices

Against RKT-010's earn rate of ≈20 ⭐ a race:

| | ⭐ | races |
|---|---|---|
| paint | 15 | 1 |
| face item | 35–70 | 2–4 |
| hair colour | 25 | 1–2 |
| **pattern** | **120–220** | **6–11** |

`PAINT_COST` and `PATTERN_COSTS` are exported constants and the gates read them, never a literal.

### 3.4 The confirmation

A `Hangar/Confirm` surface, over the shelf, opened by a tap on anything not yet owned. Exactly Richard's three lines:

```
Buy Polka dots?
  You have        240 ⭐
  This costs     −120 ⭐
  ─────────────────────
  You'll have     120 ⭐
[ Yes, buy it ]   [ No ]
```

- **Owned items do not open it.** Tapping one wears it, as today — a wear costs nothing and is instantly reversible.
- **Nothing opens it for a free item.**
- Too dear: the tile says `🔒 120 ⭐ · 40 more` and the dialog does not open at all.
- 🔴 **The script re-checks everything.** A dialog left open while a second tab spends must not overdraw; `PICK_ITEM_SCRIPT`
  refuses with `tooDear` and changes nothing.
- 🔴 **Two taps** — a `Modal` in this editor measures a ghost copy, and a single programmatic click hits it
  ([the CDP trap](../../../CLAUDE.md)); the drive must press twice.

### 3.5 What else moves

- **Home's bar** stops being "next 🎁 at 150 ⭐" and becomes the purse: `⭐ 240 to spend in the hangar`, or
  `9 ⭐ more for your first paint` below the cheapest price.
- **The result screens** (race, merge, hunt, monster) offer the hangar when the purse can buy the cheapest thing.
- **Save code v3** carries `spent`. A v2 code restores with an unspent purse — generous on purpose, never in debt.

## 4. Acceptance criteria

| AC | Clause |
|---|---|
| AC1 | ✅ (s1) **RED on today's build:** a tap on a rocket tile spends the pick with no confirmation — read from `PICK_ITEM_SCRIPT` having no gate but the tap, and no `Hangar/Confirm` existing. |
| AC2 | ✅ (s1) Engine gate: over 60 seeded races every buy costs exactly its price, the purse never goes negative, what was EARNED never drops, and owned only grows. **Two sabotage arms**: a buy that does not charge, and one that does not check the purse. *Built; the gate's own purse is deliberately unclamped, because a gate that mirrors the script's clamp can never see an overdraw.* |
| AC3 | ✅ (s1) Engine gate: paint and pattern are two layers — a second paint replaces the paint and leaves the decal alone. |
| AC4 | Kit gate: each of the seven decals draws shapes that are inside the hull path, differ from no-pattern, and differ from each other. Sabotage: drop the hull clip and a decal spills onto the fins. |
| AC5 | Template gate: every price is `PAINT_COST`, `PATTERN_COSTS` or the shelf's own `cost`; a `free` item costs 0 and nothing else does; white passes ≥ 3:1 against every paint token. |
| AC6 | Drive, FR 390×844 and EN 1366×768: tap an unowned pattern → the dialog says balance, cost and what is left, and **the three numbers add up** → No changes nothing → Yes buys it, the purse drops by exactly the price, and the next race's rocket wears it. **Read on the screenshot.** |
| AC7 | Drive: a tap on an OWNED item wears it with no dialog; a tap on one too dear opens no dialog. |
| AC8 | Engine gate: a v2 save code restores with `spent: 0` and every item still owned; a v3 code round-trips the purse. |
| AC9 | Richard buys something he had to save for, and says whether the prices and the dialog feel right. |
