# PLY-001 — The hangar fits the face you chose

> "Kids like putting on sunglasses and hats on their avatars, but it needs to correspond to the type of avatar they
> picked. Right now you have pixel avatar sunglasses that don't fit on the adventurer avatar the kid picked offered
> in the hanger. We need to build a restricted range of rewards that are consistent with the type of avatar picked"
> — Richard, 2026-09-18

**Read first:** [RKT-011 §3.2](../phase-87-the-first-play-test/RKT-011-THE-HANGAR.md), which ruled the opposite, and
why. This task overturns it with the reason a play test gives.

## 1. The person sentence

**A child who chose the adventurer face opens the hangar and every single thing on the shelf is an adventurer
thing.**

## 2. What is there (read 2026-09-18)

| reading | where |
|---|---|
| the shelf shows **every** item of the tab; a misfit is drawn greyed, on a face it does fit, captioned "Fits the Pixel and Smile faces" | `HANGAR_SHELF_SCRIPT`, `tpl007Scripts.ts:1964` — the `!fits` branch |
| this was deliberate: *"It is never hidden, so the shelf does not shrink under a child who changed their face"* | RKT-011 §3.2 |
| 12 face items ship. **Only 3 fit pixel-art, 6 fit big-smile, 3 fit adventurer** | `HANGAR_SHELF`, `tpl007Curriculum.ts:797` |
| so an adventurer child sees 12 tiles, **9 of them greyed** | the two readings above, together |
| 🔴 `fun-emoji` and `thumbs` have **no wearable part at all** in DiceBear 9.4.2 — `eyes`, `mouth`, `face`, `shape` and nothing else | `node_modules/@dicebear/{fun-emoji,thumbs}/lib/schema.js` |
| both are offered at creation, 2 of 5 | `LOOK_ITEMS`, `tpl007Components.ts:1534` |
| what the three wearable styles actually have | `node_modules/@dicebear/*/lib/schema.js` |
| · **pixel-art** — `hat` 10, `glasses` 14, `accessories` 4, `beard` 8, `clothing` 23 | |
| · **big-smile** — `accessories` 8, `hair` 13 | |
| · **adventurer** — `glasses` 5, `earrings` 6, `features` 4, `hair` 45 | |

**So the art to make a full shelf per style is already bundled.** Nothing new is drawn; what is missing is rows.

## 3. Design

### 3.1 The shelf is filtered, not greyed

`HANGAR_SHELF_SCRIPT` drops the `!fits` branch: a face item reaches the rows **only** when `item.faces[look]`
exists. The rocket tab is unaffected — a paint fits every face.

RKT-011's fear ("the shelf shrinks under a child who changed their face") is answered by §3.3, not by greying:
each style has a shelf of its own of comparable size, so changing face changes *which* things are offered, never
*how many*.

🔴 **What is owned is never lost.** `owned` is by item id and is never filtered, never pruned and never spent
twice. A child who bought the pixel woolly hat and then moved to the adventurer face keeps it, and it is worn
again the moment they move back — `wear.face` is already keyed by look (`wearOf`, `tpl007Scripts.ts:113`).

### 3.2 A hidden item a child owns is still theirs, and says so

One line under the face shelf, only when it is true: **"3 things you own are for other faces."** It is a fact, not
a tile — it never offers, never sells and never takes away, and it stops a bought thing from silently vanishing.

### 3.3 The range per style

**At least ten face items per kept style**, drawn from that style's own parts, in slots a child recognises:

| style | slots used | about |
|---|---|---|
| pixel-art | Hat, Glasses, Gear (`accessories`), Beard, Outfit (`clothing`) | 12 |
| big-smile | Accessory, Hair | 12 |
| adventurer | Glasses, Earrings, Feature, Hair | 12 |

An item is one row with a `faces` map, exactly as today, so an item that exists for more than one style (Sunglasses
does, for all three) stays **one** id, one price and one purchase. A child who buys Sunglasses and changes face
keeps them, in that face's art.

🔴 **`hair` and `clothing` are always drawn by the seed; `hat`, `glasses`, `accessories`, `beard`, `earrings` and
`features` are optional and need their `*Probability` forced to 100** (RKT-011 §3.3, still true — `wearOptions`,
`tpl007Scripts.ts:114`).

### 3.4 R3 — the two faces that can wear nothing

**Ruled 2026-09-18: drop `fun-emoji` and `thumbs` from the chooser.**

- **The kit keeps all five.** `AVATAR_STYLES` (`kit.js:55`) is a library node other projects use, and an existing
  profile on a dropped style must still render. Only Rocket School's chooser narrows.
- `LOOK_ITEMS` stops being a `Static Data` constant and becomes a Function fed the player's current look: the three
  kept styles, **plus their own if it is not one of them**. A new player sees three; a child already on Thumbs sees
  four and may keep theirs. Nothing is taken away, and nobody new lands in a dead end.
- A child on a dropped style opening the face tab sees, in place of tiles: **"The Thumbs face doesn't wear things.
  Change your face in the player menu to dress up."** Their rocket tab is untouched.

## 4. Acceptance criteria

| AC | Clause |
|---|---|
| AC1 | **RED on today's build**: sign in as an `adventurer` player, open the hangar's face tab, and count the tiles that are `dim` because they do not fit. It is 9 of 12. Recorded before any change. |
| AC2 | ✅ (s1) Engine gate: for each of the three kept styles, the rows `HANGAR_SHELF_SCRIPT` returns for `tab: 'face'` are **all** items that fit that look, and **no** item that does not. Sabotage: restore the `!fits` branch, and the arm goes RED. |
| AC3 | ✅ (s1) Template gate: every kept style has **≥ 12** (17, 20 and 17 as built) face items, and every row's `part` + `value` exists in the installed DiceBear schema for each look it lists — read from `node_modules/@dicebear/<look>/lib/schema.js`, never a copied list. Sabotage arm. |
| AC4 | ✅ (s1) Kit gate: for every face item on the new shelf, the SVG with the option differs from the SVG without it, on every look it claims (RKT-011 AC3's method, including its coincidence arm for a seed that already draws that part). *What building it found: that coincidence arm had ONE way of telling a coincidence from a miss — draw the part with its probability at 0 — and that only works for an OPTIONAL part. `hair` and `hairColor` are always drawn and have no probability at all, so every seed that already had the value read as a miss. The second way is to draw the part at a different value.* |
| AC5 | ✅ (s1) Engine gate: a profile that owns items for look X, moved to look Y and back to X, still owns every one and wears the same ones it wore. `owned` only ever grows. Sabotage: prune `owned` on a look change, and the arm goes RED. |
| AC6 | ✅ (s1) Template gate: the chooser's styles are the three kept ones for a new player, and four for a profile whose `look` is `thumbs` or `fun-emoji` — the fourth being their own. |
| AC7 | ✅ (s2) **DRIVEN GREEN, both arms.** `--scenario ply001`. An adventurer's face tab draws **17** tiles, **none** dim (read from computed `opacity`/`filter`, not only from the words — a tile could be greyed and say nothing), the "fits another face" wording is gone from the page, every tile is ≥ 132×155 px, and the document does not scroll sideways at either width. |
| AC8 | 🔴 **RED (s2), and the missing half was never built.** Driven both arms: a `thumbs` profile **does** still draw its face on Home, and its rocket tab **does** still work — but its face tab shows **nothing at all**: no tiles, and no sentence. §3.4's third bullet (*"The Thumbs face doesn't wear things. Change your face in the player menu to dress up."*) exists nowhere — `grep` finds no such string in `tpl007Curriculum.ts`, in any `tpl007*` source, or in the built `templates/rocket-school/**`. A child on a dropped look opens the face tab and is told nothing. AC6's template gate is green because it grades the CHOOSER's narrowing, which is a different half of §3.4. |
| AC9 | Richard opens the hangar on each of the three faces and says whether the range now feels like *his* avatar's range. |
