# Phase 113 — next session

**Read first:** [`README.md`](README.md) (Richard's words, the rulings owed), then the four task files. Session 1
(2026-10-04) built all four tasks' mechanisms in one pass and drove the two flows; what is left is Richard's rulings, his
replay, and the prizes.

## The board, from the task files (after session 1, commit `6bbd34f38`)

| task | built | gated | driven | left |
|---|---|---|---|---|
| [REV-001](REV-001-CHOOSE-WHAT-TO-PRACTISE.md) choose what to practise | ✅ | ✅ engine + artefact | ✅ race, EN laptop + FR phone (7/7 ×2) | AC5 Monster Gate drive · AC6 Richard + the youngest |
| [REV-002](REV-002-MY-REVISION-LISTS.md) my revision lists | ✅ | ✅ | ✅ EN laptop 8/8 | AC2 monster drive · AC4 both-ways drive · AC5 edit/delete drive · AC6 Richard + the eldest's real list |
| [REV-003](REV-003-FRENCH-ENGLISH-HISTORY.md) French, English, history | ✅ 46 skills, 500 items, 10 cards | ✅ | — (content, not a flow) | AC6 a French teacher reads it · AC7 the eldest after her test |
| [REV-004](REV-004-WHAT-LEARNING-PAYS.md) what learning pays | ✅ stars · ⬜ **prizes** | ✅ | ✅ (`learned` clause) | **AC3 prizes = a RULING (README §4)** · AC4 the kids |

**Built-but-undriven:** Monster Gate with a focus / a list (the wires are gated, the page not driven); the editor's
Edit and Delete; a list asked both ways. Three drive arms, an hour's work.

## Gate readings (2026-10-04, commit `6bbd34f38`)

```
npm run template:rocket                                    # 95 components, 108 skills, 26 cards, 8 pages; 0 warnings, 260 info
cd packages/noodl-mcp && npx jest tests/tpl007Engine.test.ts     # 265/265 (was 246)
cd packages/noodl-mcp && npx jest tests/tpl007Template.test.ts   # 106/106 (was 102), 17 s
node packages/noodl-preview/dist/nodegx-deploy.cjs templates/rocket-school <scratch>/rocket --allow-development-engine
node scripts/devtools/drive-p113-focus.js <scratch>/rocket [--arm focus|lists] [--shots <dir>]
#   focus en 1366x768: 7/7 · focus fr 390x844: 7/7 · lists en 1366x768: 8/8 · 0 console errors
```

🔴 `--allow-development-engine` is not optional (P95's note): without it the deploy exits 0 and writes nothing.

## What session 1 settled, including where the first idea was wrong

- **The setup owns the focus, not the page.** The race page sits at 32 of 32 nodes once it places a navigate to the lists
  page; `Logic/Resolve focus` and the `Update settings` that writes the chooser's save live inside `Race/Setup` and
  `Monster/Setup` (the Header's shape: `app` in, `app` + `write` out). The page's old `setup.mode → play.mode` wire is
  back, now carrying the resolved focus.
- **One list engine.** A shipped French/history bank and the person's own typed list are the same `generator: 'list'`
  path, the same per-item memory, the same stars. Do not grow a second path for "custom".
- **Dates as "around", with the disagreement in the note**, never a near-miss distractor. The research (briefing §5) is
  what makes this defensible: textbooks and scholarship disagree by ±100 000 years on fire and sapiens.
- **Official terminology wins, the book's term is told.** Conditionnel = a tense of the indicatif; voix pronominale.
- **The RKT-003 stage budget bit five times.** The longest correction on screen is capped by the stage drive's worst case
  (183 EN / 189 FR characters). Long notes and the compound-tense paradigm were shortened to fit; the clause now runs
  over every subject. If a note must be longer, `drive-rkt003-stage.js`'s worst case moves first, then the phone drive.
- **A two-item list is typed.** Distractors come from the other items only from four items up (a two-way coin toss is
  not a question).
- **The "Maths or typing" row is gone from both setups.** Typing is a subject in the chooser. Two P87/P95 artefact clauses
  were re-pointed (`rsInitPlayers`, `zsInitStyle`).
- **The door kept every promise.** It refused a wire to `mounted` on a component without it and an inert `height`,
  each with the fix in the message; it keeps a node comment in the artefact under `metadata.comment`.

## Do, in order

1. **Ask Richard the four rulings in README** (plain words, one message), especially the prizes (REV-004 §4): a prize is
   either kit code (a pattern), a theme token (a paint), a DiceBear part looked at on a sheet, or something new.
2. **Drive the three undriven arms**: Monster Gate with a focus and with a list (copy the `focus` arm, open the monster
   card, read `lastSkill`); the editor's Edit → change a line → Save → row updates, and Delete → asks → Yes → row gone;
   a both-ways list (`Ask both ways`) seen asked backwards (the prompt begins with the answer side).
3. **Build the prizes Richard chose** (REV-004 AC3). A pattern: `library/modules/game-kit/src/kit.js` `PATTERNS`, rebuild
   the kit, `tpl007GameKit.test.ts`, then the shelf row and its contrast/schema gates.
4. **Republish to nodegx.io** (TPL-007 §15.3: a COPY of the project with `navigationPathType: "hash"`, `--base-url
   /templates/rocket-school/`, drive the public URL first). Not done this session — the live site still has the P95 build.
5. If Richard's replay finds the chooser's maths topics in the wrong order for a CE2 teacher's year, reorder `TOPICS` in
   `tpl007Subjects.ts` (the order there is the order shown).

## Rulings owed by Richard (not the builder's)

README §"Richard's rulings owed": the cycle-4 verb items, the date compromise, typed conjugation, the prizes, the kids'
verdicts. Also from REV-002 §6: should the save code carry the lists?

## Product findings

Filed: **none** (nothing new was measured). Met and recorded in README §"Product findings": the door's two refusals (both
right, both said the fix), the "shared on purpose" comment (GAM-005 R6) kept as `metadata.comment`, GAM-024's D52 phantom
drop still reported for Hunt at deploy, and the rows-cannot-translate pattern.

## Traps this session, for the next builder

- 🔴 **A regex inside a TS template literal doubles its backslashes** (`\\s` in the source is `\s` in the generated
  script). The Python edit scripts had to write `\\\\s`. Read `tpl007Scripts.ts` as source, run the engine test as truth.
- 🔴 **Eight fluent right answers land the rocket** (`RACE_STEP = 1/8`): a drive that asks a ninth question reads
  `kind: 'none'` and fails itself.
- 🔴 **`git status` listed `tpl007Components.ts` modified before I touched it.** The 2026-09-20 pile (turbo armed visible,
  rocket B's face) was two weeks uncommitted; it landed in `6bbd34f38` with this work because a regeneration cannot
  separate them. Said in the commit.
- The template test's "every page is small" counts the BUILT nodes (children included); count them from
  `templates/rocket-school/components/Pages/<X>/nodes.json`, not from the source list.
- `timeout` is not on this Mac; run a drive bare.
