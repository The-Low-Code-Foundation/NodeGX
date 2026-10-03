# Next session — P109 session 8

**Phase:** [README](README.md) · **Audit:** [AUDIT-2026-10-01.md](AUDIT-2026-10-01.md) · scoped at `27d891bf3`.
**Session 7 (2026-10-03, on `cline-dev`, `4988a5948` … `fb94c1c01`):** DEF038 attributed and its gate's control arm
fixed; **ISL-009 AC7 built and driven** (only its export half is left); **ISL-007 AC1 read** and the add-on read from
its own source. **4 of 25 closed** (none this session: ISL-009 still owes the export half).

## Read first

1. ISL-007 §8 s7: the AC1 table, what the add-on does (from `sourcesContent` in its map), why `{{name}}` stays, and the
   build route.
2. ISL-009 §8 s7: the card wire, the drive clause and its control, the selector counts.
3. The three bugs filed in s7: `P109-S7-DEF038CONTROL` (fixed), `P109-S6-DEF038` (narrowed to the DBT demo, handed to
   the dbt-template workstream), `P109-S7-OLIVEDRIVE` (P108's drive walks the old can).

## Do, in this order

1. **ISL-007, the build.** Check `git status package-lock.json` first: on 2026-10-03 it held a peer's uncommitted edit,
   which is why s7 did not add i18next. When it is clean (or by a route that does not touch the root lock): put the
   recovered `src/i18next-module.js` beside the module with a build script; `interpolation: { escapeValue: false }`; a
   warning naming a missing key. Then AC2's new-project drive with AC3 and AC5's cases (`&`, `<`, *l'île*, a missing
   variable: measure what i18next v19 shows first). Then the ruling's third clause, "words for this page" cheaper than a
   node per word: check the mechanism the module already has (a bundle object, Variables) before designing a node.
2. **ISL-009's export half**, only when `nodegx-export/src/emit/component.ts` is no longer P18 s101's pile (uncommitted
   since Sep 26; P18's handoff says its next session commits it). Emit `data-*` from `dataAttributes` + the listed
   values (wired too), and the scroll as an action or a named deferral in the ledger.
3. **"Native nodes first":** scope the island rebuild as its own template task (P108/P78); the product gaps as P109 work
   (Array Filter's "in list" `P109-S5-ARRAYFILTERIN`; rows shared app-wide by id, ISL-003). Re-scope ISL-006 and ISL-020
   against the ruling. Tell Richard the gap list is three, not four.
4. **ISL-019's remainder:** AC6 (needs `noodl-mcp` dist rebuilt), AC7 (decide the trailing-newline byte first).
   s7 regenerated the garden (`npm run template:garden` exit 0) and nothing outside its 7 files drifted.
5. **Round 3 questions**, each mechanism checked first: ISL-016, ISL-017, ISL-021, ISL-008, ISL-010, and ISL-018's open
   case (now with a live example: the DBT demo at format 4, six Function inputs an editor's first open would set to
   `false`). Then the ISL-022 follow-ups and the s4 bugs.

## Decisions for Richard (not yours)

- **ISL-018's open case** (above), still not asked.
- **Round 3** above.
- Pushing: local `cline-dev` is far ahead of `origin`; that is Richard's call.

## Readings taken in session 7 (2026-10-03)

- `def038SettledTemplates`, committed population only (a clean worktree at `5fc537fb5`): 3 red, the same at
  `b2ba0320a^` and `b2ba0320a`. After the control-arm fix: 1 red (the DBT demo). Mutant (a planner that never writes):
  14/14 control arms red. In the shared tree it reads 2 red (the demo + the peer's uncommitted nightbook).
- Garden specs (17 suites that read the garden): **768/768**. `cg003Template` mutants: the card wire removed → red; the
  page query put back → red.
- Deployed garden (`nodegx deploy` exit 0): `drive-ig004-island.js` **70/70**; control without the card wire 66/70 (the
  4 AC7 clauses; the card at −999 px at 390). `drive-cg005-olive.js pages` 19/3, the same 19/3 with its pre-edit copy.
  `drive-isl007-words.js` exit 0, 288 of 334.

## Facts measured in session 7 that are not in a task file

- **`def038SettledTemplates` reads the working tree**, so a peer's uncommitted template turns it red in the shared
  checkout. To grade committed artefacts, run it in a worktree (`scripts/devtools/make-worktree.sh <name> HEAD`).
- The garden's create button reads **"Let's go!"**; My robots is at **`/robot`** (`/my-robot` falls to the start page
  and reads like a page that did not translate).
- The add-on's map has `sourcesContent`: `src/i18next-module.js` is recoverable with
  `JSON.parse(map).sourcesContent[map.sources.indexOf('webpack:///./src/i18next-module.js')]`.
