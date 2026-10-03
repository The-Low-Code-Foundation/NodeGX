# Next session — P109 session 9

**Phase:** [README](README.md) · **Audit:** [AUDIT-2026-10-01.md](AUDIT-2026-10-01.md) · scoped at `27d891bf3`.
**Session 8 (2026-10-03, on `cline-dev`, `a36d28e90` … `2c38d43a4`):** ISL-007 **built** (the i18next add-on 1.1.0);
the island's rebuild scoped as [P108 IW-010](../phase-108-the-island-works/IW-010-THE-ISLAND-IN-NATIVE-NODES.md);
Array Filter **"Is one of"** built (one of IW-010's three product gaps). **4 of 25 closed** (ISL-007 stays 🟡: AC4
moved to IW-010, AC6 and AC7's catalog half open).

## Read first

1. ISL-007 §8 s8: the build route (sources recovered from the map, `build.mjs`, no install), what changed, the AC
   table, and "Later in s8": why AC4 belongs to the island's rebuild (69 of 88 Functions make words themselves).
2. [IW-010](../phase-108-the-island-works/IW-010-THE-ISLAND-IN-NATIVE-NODES.md): its dependency table is the gap list.
3. Bugs filed or moved in s8: `P109-S8-I18NESCAPE` (fixed), `P78-TPL011-TRANSLATION` (fixed), `P109-S5-ARRAYFILTERIN`
   (fixed, in-list half), `P109-S8-ARRAYFILTERPATH` (needs a ruling).

## Do, in this order

1. **ISL-003, the last product gap IW-010 waits on** (rows shared app-wide by id). Its §5 has 🔒 rulings: check the
   existing mechanism first (how For Each / Model ids scope today), then ask in plain words with a "what X is" sentence.
2. **ISL-007 AC6, the door:** an agent lists a project's strings and sets a French column in one call each. Check
   what the door already offers for a module's nodes (`get_node_type` on `Translation`, the kit overlay) before
   designing a tool. Also AC7's catalog half: what `get_node_type('Translation')` says about `{{x}}`, escaping, and the
   missing-word warnings.
3. **ISL-009's export half**, only when `nodegx-export/src/emit/component.ts` is committed by P18 (still that pile on
   10-03, mtime Sep 26).
4. **ISL-019's remainder:** AC6 (needs `noodl-mcp` dist rebuilt), AC7 (decide the trailing-newline byte first).
5. **Round 3 questions**, each mechanism checked first: ISL-016, ISL-017, ISL-021, ISL-008, ISL-010, ISL-018's open
   case (the DBT demo at format 4), and now `P109-S8-ARRAYFILTERPATH`. Then the ISL-022 follow-ups and the s4 bugs.

## Decisions for Richard (not yours)

- `P109-S8-ARRAYFILTERPATH`: should `owner.id` in Array Filter's list mean "the id inside owner"? (A key literally
  named `owner.id` would read differently.)
- ISL-018's open case; Round 3 above. Pushing `cline-dev` is Richard's call.

## Readings taken in session 8 (2026-10-03)

- Runtime spec [`isl-007-i18next-module.test.js`](../../../packages/noodl-runtime/test/isl-007-i18next-module.test.js)
  (the BUILT `index.js` through `registerModule`): 5/5; the module as imported 1/5; the verbatim source rebuilt reads the
  same 1/5 (parity).
- Deployed new project `isl007-two-languages/` (`nodegx deploy` exit 0): `drive-isl007-two-languages.js` **16/16**,
  `--control` on the imported module **5/5** (`Hello Tom &amp; &lt;Jerry&gt;`, `<html lang>` stuck at `en`).
- `tpl011Template.test.ts` 35/35; `library:check` i18next OK (the one FAIL is the peer's untracked `nightbook-kit`).
- Array Filter: [`isl-005-array-filter-in-list.test.ts`](../../../packages/noodl-runtime/test/isl-005-array-filter-in-list.test.ts)
  7/7, mutant 6 red + control green; existing suites 8/8 (runtime) and 58/58 (viewer corpus).

## Facts measured in session 8 that are not in a task file

- **A stub `editorConnection` needs `isConnected()`:** the runtime calls it on every signal; without it the throw
  lands inside i18next's event emitter and silently stops every later listener (the language changed, no node told).
- **The node docs generator has no `--only`**, and 27 pages under `docs-site/docs/nodes` were already stale on
  10-03. To change one page: regenerate, then put the others back with `git show HEAD:<path> > <path>` (they were clean).
- `library/modules/*/project/noodl_modules/*/index.js.map` often carries `sourcesContent`: a module imported as a
  bundle can be rebuilt from its own sources with no install (`library/modules/i18next-translation/build.mjs` is the shape).
- The root `package-lock.json` diff on 10-03 is the REVERSE of `a9c10ff8c` plus an editor version (mtime Sep 24): a
  stale working-tree copy, not a fresh edit. Still not ours to touch.
