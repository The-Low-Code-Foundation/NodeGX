# Phase 113 — next session

**Read first:** [`README.md`](README.md) (Richard's words, the rulings owed), then the task file for what you build.
Session 1 (2026-10-04) built all four tasks' mechanisms; session 2 (2026-10-04) drove the three arms that were built but
not driven. **Every acceptance criterion left in the phase belongs to a person**: Richard's rulings, his replay, a French
teacher's read, the kids' verdicts. Nothing is buildable until a ruling arrives.

## The board, from the task files (after session 2)

| task | built | gated | driven | left |
|---|---|---|---|---|
| [REV-001](REV-001-CHOOSE-WHAT-TO-PRACTISE.md) choose what to practise | ✅ | ✅ engine + artefact | ✅ race EN + FR · ✅ **Monster Gate EN + FR** (s2) | AC6 Richard + the youngest |
| [REV-002](REV-002-MY-REVISION-LISTS.md) my revision lists | ✅ | ✅ | ✅ race · ✅ **Monster Gate, Edit/Delete, both ways** (s2) | AC6 Richard + the eldest's real list |
| [REV-003](REV-003-FRENCH-ENGLISH-HISTORY.md) French, English, history | ✅ 46 skills, 500 items, 10 cards | ✅ | — (content) | AC6 a French teacher reads it · AC7 the eldest after her test |
| [REV-004](REV-004-WHAT-LEARNING-PAYS.md) what learning pays | ✅ stars · ⬜ **prizes** | ✅ | ✅ race + Monster Gate end cards | **AC3 prizes = a RULING (README §4, REV-004 §4)** · AC4 the kids |

Built ACs: REV-001 5/6, REV-002 5/6, REV-003 5/7, REV-004 2/4. The one unbuilt mechanism is the prizes.

## Gate readings

```
# Template inputs unchanged since 6bbd34f38 (no commit, no working-tree edit to tpl007*, templates/rocket-school, game-kit),
# so session 1's readings stand and were not re-run:
npm run template:rocket                                          # 95 components, 0 warnings
cd packages/noodl-mcp && npx jest tests/tpl007Engine.test.ts     # 265/265
cd packages/noodl-mcp && npx jest tests/tpl007Template.test.ts   # 106/106

# Session 2, 2026-10-04, fresh deploy of 6bbd34f38's template, the drive at this session's commit:
node packages/noodl-preview/dist/nodegx-deploy.cjs templates/rocket-school <scratch>/rocket --allow-development-engine
node scripts/devtools/drive-p113-focus.js <scratch>/rocket       # all five arms, 7 cells, 5 min, exit 0
#   focus en 1366x768 7/7 · focus fr 390x844 7/7 · lists en 8/8 · monster en 7/7 · monster fr 390x844 7/7
#   editor en 6/6 · both en 5/5 — 47/47, 0 console errors
```

`--arm focus|lists|monster|editor|both` runs one arm. 🔴 `--allow-development-engine` is not optional: without it the
deploy exits 0 and writes nothing. The deploy still reports GAM-024's known D52 phantom drop on Hunt.

## What session 2 settled, including where the first idea was wrong

- **Monster Gate obeys the focus and the list (REV-001 AC5, REV-002 AC2).** Its own setup's Change stores the same
  `{ maths, [table-5, table-8] }`, six monster questions were all tables 5/8, and the race's setup then says the same two
  tables: the focus is the player's, not the game's. A list made and chosen from Monster Gate is the only thing it asks.
  A Monster Gate game is exactly six right answers (three monsters, two hits each), so six is the whole game.
- **Edit and Delete work (REV-002 AC5).** Edit fills the editor; a changed line saves into the same list (same id, four
  items, the old line gone); Delete asks, "No, keep" keeps it, "Yes, delete" removes it from the store and the page.
- **Both ways works (REV-002 AC4).** "the dog" was asked with the French words as buttons, and the backwards answers were
  graded right. A control (answer every backwards question wrong) turns `rightBack` red, so the clause can fail.
- **My first `rightBack` read the wrong field.** An item's `ok` means "two right in a row" (`ITEM_LEARNED_AT = 2`), so an
  item asked once in eight questions is right but not `ok`. "Never missed" is `k === n` (a miss resets `k` to 0).
- **My first `reloadHome` assumed every reload lands on Home.** A live game's page does; `/lists` reloads as itself. And
  "Rocket Race" on screen does not mean Home: it is the race page's title too. Home is where both game cards are.
- **The drive's summary passed clauses that never ran.** Filed and fixed: [P113-S2-UNRUNCLAUSE](../../bugs/p113-s2-unrunclause-a-drive-cell-that-stops-early-printed-all-pass.md).
  Each arm now lists what it owes (`EXPECT`).
- **A shot taken after `answerOne` shows the NEXT question** (it presses Next). The `both` arm shoots inside
  `answerList`, before the answer.

## Do, in order

1. **If Richard has answered the rulings below, build what he ruled.** The prizes (REV-004 AC3) first: see REV-004 §4
   for what each kind costs. A pattern is `library/modules/game-kit/src/kit.js` `PATTERNS`, a kit rebuild,
   `tpl007GameKit.test.ts`, then the shelf row and its contrast/schema gates; a paint is a token in `tpl007Theme.ts`.
   Then any change to the verb bank (ruling 1), the history bank (ruling 2) or the answer mode (ruling 3) in
   `tpl007Subjects.ts`, `npm run template:rocket`, both jest gates, a fresh deploy, the full drive.
2. **Record the kids' verdicts verbatim** in the AC tables the day Richard relays them (REV-001 AC6, REV-002 AC6,
   REV-003 AC7, REV-004 AC4).
3. **Republish to nodegx.io only when asked** (TPL-007 §15.3: a COPY of the project with `navigationPathType: "hash"`,
   `--base-url /templates/rocket-school/`, drive the public URL before announcing). The live site still has the P95 build.
4. If Richard's replay finds the chooser's maths topics in the wrong order for a CE2 year, reorder `TOPICS` in
   `tpl007Subjects.ts` (the order there is the order shown).

## Rulings owed by Richard (not the builder's)

Asked in plain words at the end of session 2 (2026-10-04); README §"Richard's rulings owed" holds the detail.

1. **The verb study**: subjunctive, passive and pronominal voice are cycle 4 in the 2025 programme, shipped because the
   6e test asked them. Keep them in, or behind a tick?
2. **Prehistory dates**: shipped as "around -400 000" with far-apart wrong buttons. Keep, or ship only period and order
   questions and leave dates to the child's own list?
3. **Conjugation typed by default** (buttons only on a profile set to "Answers: buttons"). Right?
4. **Prizes**: which kind (face part, rocket paint, rocket pattern, or something new such as a "list learned" sticker or
   a rocket trail), and how many?
5. From REV-002 §6: should the save code carry the lists?

## Product findings

Filed: **one, tooling, fixed**: P113-S2-UNRUNCLAUSE (the drive's own summary). **No NodeGX defect measured** this session:
the three flows behaved exactly as built. Met again, not re-filed: GAM-024's D52 phantom drop on Hunt at deploy.

## Traps this session, for the next builder

- 🔴 **A drive cell that stops early is not a pass.** Keep `EXPECT` in step with the clauses when you add one: a clause
  missing from `EXPECT` but run is still graded; one in `EXPECT` and never run fails.
- 🔴 **`ok` on a list item is "learned" (two in a row), not "right".** Grade "answered right" on `k === n`.
- 🔴 **The both-ways direction is a coin toss per question**: eight questions miss one side 1 time in 128. A lone red
  `backwards`/`forwards` with `rightBack` green is that, not a defect; re-run once.
- 🔴 **`answerOne`'s number regex holds non-breaking spaces** (`[\d\s  .,/−-]`): an edit script that retypes it does not
  match. Patch around it by line.
- 🔴 **Eight fluent right answers land the rocket** (`RACE_STEP = 1/8`); **six right answers end Monster Gate**.
- `timeout` is not on this Mac; run a drive bare.
