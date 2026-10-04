# Phase 113 — next session

**Read first:** [`README.md`](README.md) (Richard's words, his five rulings of 2026-10-04 and what each became), then the
task file for whatever you touch. Session 1 built the four REV tasks, session 2 drove the undriven arms, and session 3
built all five rulings, including the prizes as a new task, [REV-005 — the moon](REV-005-THE-MOON.md). **Every acceptance
criterion left in the phase belongs to a person**: the kids' verdicts and a French teacher's read.

## The board, from the task files (after session 3)

| task | built | gated | driven | left |
|---|---|---|---|---|
| [REV-001](REV-001-CHOOSE-WHAT-TO-PRACTISE.md) choose what to practise | ✅ | ✅ | ✅ race + Monster Gate, EN + FR | AC6 Richard + the youngest |
| [REV-002](REV-002-MY-REVISION-LISTS.md) my revision lists | ✅ + ruling 5 (the save code carries lists, focus, moon) | ✅ | ✅ race, Monster Gate, Edit/Delete, both ways · 🟡 save code not driven | AC6 Richard + the eldest's real list |
| [REV-003](REV-003-FRENCH-ENGLISH-HISTORY.md) French, English, history | ✅ + ruling 1 (5e verb material identify-only, `beyond: '5e'`) | ✅ (sabotage arm) | — content · 🟡 the 5e tag not driven | AC6 a French teacher reads it · AC7 the eldest after her test |
| [REV-004](REV-004-WHAT-LEARNING-PAYS.md) what learning pays | ✅ stars · AC3 → REV-005 | ✅ | ✅ | AC4 the kids |
| [REV-005](REV-005-THE-MOON.md) the moon | ✅ kit `Alien`, 5 components, `/moon` | ✅ kit + engine + artefact | ✅ EN laptop + FR phone, 8/8 each | AC5 the kids |

Built ACs: REV-001 5/6, REV-002 5/6, REV-003 5/7, REV-004 3/4, REV-005 4/5. Nothing buildable is left without a new ruling.

## Gate readings (2026-10-04, session 3, this session's commit)

```
node library/modules/game-kit/build.mjs                          # 400 KB avatars + ~105 KB kit (7 nodes)
npm run template:rocket                                          # 102 components, 0 warnings, 296 info
cd packages/noodl-mcp && npx jest tests/tpl007Engine.test.ts     # 273/273 (was 265)
cd packages/noodl-mcp && npx jest tests/tpl007GameKit.test.ts    # 52/52 (was 47)
cd packages/noodl-mcp && npx jest tests/tpl007Template.test.ts   # 110/110 (was 106)
#   kit consumers, after the kit gained a node: cg001 + cg003 212/212 · gam-014 + isl017 ×2 pass · tpl011 Template + Kit 68/68
node packages/noodl-preview/dist/nodegx-deploy.cjs templates/rocket-school <scratch>/rocket --allow-development-engine
node scripts/devtools/drive-p113-focus.js <scratch>/rocket       # 6 arms, 9 cells, ~7 min, exit 0
#   focus en 7/7 · focus fr 7/7 · lists 8/8 · monster en 7/7 · monster fr 7/7 · editor 6/6 · both 5/5
#   moon en 1366x768 8/8 · moon fr 390x844 8/8 — 71/71, 0 console errors
```

🔴 `--allow-development-engine` is not optional (without it the deploy exits 0 and writes nothing).

## What session 3 settled

- **Ruling 1 was read as "identify-only, a choice, never in everything".** The game's classes stop at 6e, so there is no
  5e level; `beyond: '5e'` on a skill is the whole mechanism (the picker's unfocused loop skips it, the chooser tags it).
  If Richard meant a fuller version for a 5e child, that is a new `LEVELS` entry. Said in REV-003 §7.
- **The moon is the hangar's kind of place**, reached from the hangar, not from Home (Home 32/32; the 2026-09-14 ruling).
- **Nothing on the moon gets worse.** No hunger, no clock, no leaving: the engine reads the store 30 days on and gets the
  same moon. Keep it that way; it is the kids' standing rule (memory `kids-ellie-saoirse`).
- **One purse.** The moon spends `model.spent` like the hangar; `model.stars` (earned) never moves.
- **A component owns its acts** (the setup's shape from session 1): `Moon/Care` and `Moon/Adopt` take the store in and hand
  the store to write out, so the page is 22 nodes.
- **The alien sheet was looked at before the page was built** (`scratchpad/sheet.png` method: render each species ×
  outfit through `renderToStaticMarkup`, `rsvg-convert` to PNG). Two drawing fixes came of it. Do the same for any new
  species or thing to wear.

## Do, in order

1. **Record the kids' verdicts verbatim** the day Richard relays them: REV-001 AC6, REV-002 AC6, REV-003 AC7, REV-004 AC4,
   REV-005 AC5.
2. **If Richard overrules a session-3 judgement** (REV-005 §7: food without a "Buy it?" card, the first alien free, the
   prices; README ruling 1's reading), it is a data change in `tpl007Moon.ts` or one field in `tpl007Subjects.ts`, then
   `npm run template:rocket`, the three jest gates, a fresh deploy, the full drive.
3. **Drive the two ruling builds that are only gated**: the save code carrying a list across two browser profiles
   (REV-002 §6), and a 6e chooser showing "Repérer le subjonctif · 5e" unticked (REV-003 §6). Add each as an arm.
4. **Republish to nodegx.io only when asked** (TPL-007 §15.3: a COPY of the project with `navigationPathType: "hash"`,
   `--base-url /templates/rocket-school/`, drive the public URL before announcing). The live site still has the P95 build.
5. Small: the French buy card says "Acheter Nœud ?" (no article), as the hangar's always has; Nightbook's copy of the kit
   lacks `Alien` until it is next regenerated (harmless).

## Rulings owed by Richard (not the builder's)

None of the five. Owed: the kids' verdicts; and, only if he wants to, the session-3 judgements in REV-005 §7.

## Product findings

Filed: **none** (no NodeGX defect was measured this session). Met, as expected: the plan door took a fourth source into
one input (`Moon/Care` `mcSaid.text` from the page and three acts) without a word, which is how the Header already writes
`app`; the deploy still reports GAM-024's D52 phantom drop on Hunt, and now lists `game-kit.Alien` among the kit nodes it
publishes unchecked (104 wires).

## Traps this session, for the next builder

- 🔴 **A kit change reaches other templates' tests.** `game-kit` is also shipped by Nightbook and loaded by the coding
  garden and the ISL-017 install-order tests; run cg001, cg003, gam-014, isl017 ×2 and tpl011 after any kit change.
- 🔴 **`tpl007GameKit.test.ts` pins the node count** ("exactly seven nodes"). A new node moves it, by design.
- 🔴 **A drive's "Home" is where both game cards are**, not where "Rocket Race" is (the race page's own title).
- 🔴 **`ok` on a list item is "learned" (two in a row).** Grade "answered right" on `k === n`.
- 🔴 **A cell that stops early fails** (`EXPECT` in the drive): add each new clause there.
- `timeout` is not on this Mac; run a drive bare. `NODE_PATH=$PWD/node_modules` lets a scratchpad script `require('react')`.
