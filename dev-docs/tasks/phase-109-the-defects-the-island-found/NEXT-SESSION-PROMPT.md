# Next session — P109 session 18

**Phase:** [README](README.md) · **Audit:** [AUDIT-2026-10-01.md](AUDIT-2026-10-01.md) · scoped at `27d891bf3`.
**Session 17 (2026-10-05, on `cline-dev`, `350054fbc` `86af5a3e7` `f01ad4f8f` `897d33924` `ccfb45156` `a7c596cd1`
`c0ee346c6`):** still **11 of 25 closed**. Round 5 ruled four tasks and the shared-code design page ("ship shape 1",
built as ISL-005 by session `opennoodl-8e`). Built and driven this session: ISL-018 (the door pins its own nodes),
ISL-008 AC6 (the island sheds 29 `!important`s), ISL-004 (a page can be kept), ISL-012's deployed drives.

## The board (re-derived from each task file's status line, s17 — re-derive it again, never copy this table)

| state | tasks |
|---|---|
| ✅ closed (11) | ISL-001, 002, 003, 011, 014, 015, 016, 017, 019, 021, 023 |
| 🟢 built, owed a reading | **ISL-018** (AC5: an agent round over the real protocol, then the editor's clean-up log; AC7 on the DBT demo is its owner's, `P109-S6-DEF038`) |
| 🟡 built here, one half elsewhere | **ISL-008** (AC1–AC6 ✅; AC7's export half → P18) · **ISL-010** (AC4: llama.cpp, Richard's call) |
| 🟡 built, rulings owed | **ISL-004** (ruling 1 built, AC1/AC2/AC6 ✅; rulings 2 and 3 not asked → AC3, AC5; AC4 the census) · **ISL-012** (AC1 browser + AC2 + AC3 on a deployed page ✅; owed: AC1's reader arm, AC3's full server render with hydration, AC4 = ruling 2) |
| 🔁 waits for ISL-005 to land | **ISL-020** (becomes a small-file edit), **ISL-006**, **ISL-013** — re-scope each against shape 1 once ISL-005's island slice is on `cline-dev` |
| 🟢 ruled, not built | **ISL-024** ("Own package + a note"): only in a gap with no P108 lane open; check `drive-deployed.js` and `package-lock.json` for peer edits right before |
| 🟡 one case open | ISL-022 (AC6 inconclusive) · ISL-007 (AC4 → P108 IW-010) · ISL-009 (export half: P18) · ISL-025 (the closing task) |
| 🟡 building elsewhere | ISL-005 (session `opennoodl-8e`; slices 4 export and 6 island owed) |

**End condition:** every task closed or handed over by name; ISL-025 last.

## Do, in this order

1. **ISL-004 rulings 2 and 3, and ISL-012 ruling 2 — one AskUserQuestion, plain words, populations measured first.**
   ISL-004 §5 has both (2: does a component get its own state — Component Object as doctrine, or a scoped Variable;
   3: F05, a Timer's write landing after a rebuild). ISL-012 ruling 2 is the reader (a node touching `THREE` at
   definition). Re-measure each before asking; say what X is in each question.
2. **ISL-012 AC1's reader arm** (cheap, no ruling): a second node in the scratch kit that reads `THREE` at definition;
   record what `get_project_info` says and the refusal `create_component` gives. The scratch kit is
   `isl012-cube-kit/` + `scripts/devtools/drive-isl012-cube.js`; the bundled three is rebuilt by the docs recipe.
3. **ISL-018 AC5** — an agent round (recipe: [[a-stranger-agent-round-recipe]] in memory): Claude Code over the stdio
   server from `dist/noodl-mcp.cjs` (rebuild `dist` first) builds a page that loads rows on open in a COPY of a format-4
   project; open it on a throwaway profile; the clean-up log reports 0 writes for the agent's nodes.
4. ISL-020 / ISL-006 / ISL-013 once ISL-005 lands (check `git log` for its island slice first).
5. ISL-024's move, only in a quiet gap.

## Decisions for Richard (not yours)

- **Land ISL-005's ES5 fix**: `scriptfiles.ts` (committed) breaks `noodl-viewer-react`'s ts-jest (TS2802: `for…of` over
  `matchAll`, `[...Set]`); every viewer-react spec that reaches the runtime reports "Test suite failed to run". Fixed on
  branch `p109-isl005-island` (`b63d5bfec`), whose landing the ISL-005 session could not do itself.
- ISL-010 AC4 (llama.cpp's server, or accept Ollama alone) and the Effort port's "None (no thinking)".
- Pushing `cline-dev`; publishing Bot Garden Fonts / Garden Kit / Garden 3D Kit at the origin.

## Handed over (owed by another phase; say so where you meet it)

- **P18:** ISL-008 AC7's export half (defaults as a class rule first in `<head>`); **`P109-S17-EXPORTKITDEPS`** — an
  exported app never loads a kit's `manifest.dependencies` (the files are copied, nothing references them; read from the
  emitted files, not a built export); ISL-009's export half.
- **P108 (IW-010):** README §6 now says which island workarounds *Keep When Leaving* retires (the `kept` quiet input) and
  which stay (build hash, `iw6Unlive`, land key, land-lift); ISL-007 AC4.
- **Runtime, unowned:** **`P109-S17-KITTHROWBLANKS`** — a kit node that throws at mount blanks the whole page (no error
  boundary in the viewer; same root as P107-C65).
- **Release notes:** ISL-008 (s16's list; AC6 changes nothing visible on an ISL-008 runtime); ISL-004's new Page port.

## Gate readings taken s17

- **Garden, the stripped island (ISL-008 AC6):** 19 drives, 18 exit 0 (`cg003-pages` 330/330, `ig004-island` 70/70);
  `iw007-touch` red on three 1368-en clauses (BUILD, PILLS, PAY) on the original sheet too, and on HEAD (the ISL-005
  session measured it). Sabotage (defaults inline again) → `cg003-pages` 13 red.
- `noodl-mcp` whole: 3,775 / 3,790 (15 red) before the two fixes below; attributed in a clean worktree: 2 were ISL-018's
  (SB-006, fixed, 67/67) and 1 ISL-010's (CMP-001's shelf count, fixed); **the rest are red at HEAD and not this
  session's**: CMP-001's corpus publish rate (39 for a pinned 33 since `c6c72aed6`, 09-22), CMP-004 ×4, CN-004,
  D54's mutant, DEF-038 on the DBT demo (and on the untracked nightbook), FLD-013 (P18's ledger), ISL-005's array
  `uses` (live work), node id allocation (*"Text has no output named 'text'"* — the validator got stricter).
- `isl018DoorPins` 5/5; `cg003Template` + `isl025Census` 175/175; CHR-007 23/23; `isl-004-keep-page` 7/7 (in a
  worktree without `scriptfiles.ts`); `catalog:check`, `catalog:merge:check`, `docs:nodes:check` exit 0.

## Facts measured in session 17 that are not in a task file

- 🔴 **The shared `src/external` viewer, deploy and ssr bundles were rebuilt at 15:47 by a dev stack's watcher and carried
  UNCOMMITTED ISL-004 source.** Before calling any shared bundle "HEAD", grep it for a marker of your own uncommitted
  change. A pre-change runtime survives inside any earlier deploy folder (`noodl.deploy.js`): copy it over a fresh
  deploy's to get a "before" arm without a webpack build.
- `make-worktree.sh` needs an ABSOLUTE parent folder: a relative one leaves every `@nodegx/*` link dangling and the
  `noodl-mcp` suites fail to load ("Cannot find module '@nodegx/kit-catalog'").
- The door names the first page written the Router's start page while none is set, and says so
  (`registeredPages.startPage`); a fixture written B-then-A opens on B.
- Headless Chrome in `drive-deployed.js` has no WebGL by default; pass `{ gpu: true, chromeArgs: ['--use-angle=swiftshader',
  '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] }` (IG-007's 3D mode).
- A console warning a script prints while it loads is missed by any listener registered after navigation: register,
  then `Page.reload`.
- The worktree `../OpenNoodl-worktrees/p109-s12` (s12) is still there; `p109-isl005-island` is the ISL-005 session's.
