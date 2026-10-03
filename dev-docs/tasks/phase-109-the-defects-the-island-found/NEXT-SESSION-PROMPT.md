# Next session — P109 session 7

**Phase:** [README](README.md) · **Audit:** [AUDIT-2026-10-01.md](AUDIT-2026-10-01.md) · scoped at `27d891bf3`.
**Session 6 (2026-10-03, on `cline-dev`, commit `0951dbbe3`):** ISL-009 ruling 1 ("A data-* list") **built and
driven**; `kitAgreement` re-recorded from the running editor (`P109-S5-KITRECORDING` fixed); the first full
`noodl-mcp` run in P109 (three red neighbours filed). **4 of 25 closed** (none closed this session: ISL-009 still owes
its export half and AC7).

## Read first

1. ISL-009 §8 s6: what was built and why each design choice (a `namedports/derived` rule, derived on read in
   `getPorts`, a per-instance runtime claim, the kit catalog keeping it declared, the ref-arrival sync).
2. The three bugs filed in s6: `P109-S6-DEF038` (may be ISL-018's own AC7, never recorded), `P109-S6-D54`,
   `P109-S6-TPL007`. And `P109-S1-CN004`, whose diagnosis s6 corrected (it is the fixture's wire, not a duplicate).

## Do, in this order

1. **`P109-S6-DEF038` first, because it may be P109's own debt.** ISL-018 AC7 says `def038SettledTemplates` stays
   green; it reads 6 red (four templates at format 4 would gain `runOnChange-*` on an editor load). Measure at
   `b2ba0320a^` and `b2ba0320a` in a worktree (`scripts/make-worktree.sh`) before touching anything: if ISL-018
   made it red, fix it under ISL-018; if not, hand it to its owner.
2. **ISL-009's export half**, only if `nodegx-export/src/emit/component.ts` and `coverage-ledger.json` are no longer a
   peer's open pile (they held uncommitted edits from **Sep 26** on 2026-10-03; read that pile's task file first).
   Emit `data-*` in JSX from `dataAttributes` + the listed values (wired values too), and the scroll as a translated
   action or a named deferral in the ledger. Today the export reports both as unmapped, loudly.
3. **ISL-009 AC7** (the island uses it): `FIND_ROBOTS_SCRIPT`'s card branch → the node's Scroll Into View; the
   CG-005 owl-row hook → a `data-` name its drive reads. The robots branch (inside a kit) stays, with the reason.
   Record the selector-count change across the garden drives. ⚠️ Peer has garden content open: check
   `git status` on `cg00*Content.ts` first.
4. **ISL-007 "Adopt the add-on"** (ruled s4, not started) — also the first product gap "Native nodes first" names.
5. **"Native nodes first":** scope the island rebuild as its own template task (P108/P78), and the product gaps as P109
   work (Array Filter's "in list" `P109-S5-ARRAYFILTERIN`; rows shared app-wide by id, which ISL-003 owns). Re-scope ISL-006
   and ISL-020 against the ruling. Tell Richard the gap list is three, not four (String Format was never a gap).
6. **ISL-019's remainder:** AC6 (needs `noodl-mcp` dist rebuilt), AC7 (only when no peer has the garden content open;
   decide the trailing-newline byte first).
7. **Round 3 questions**, each mechanism checked first: ISL-016, ISL-017, ISL-021, ISL-008, ISL-010, plus ISL-018's
   open case. Then the ISL-022 follow-ups and the s4 bugs.

## Decisions for Richard (not yours)

- **ISL-018's open case**, still not asked: the door writing into a format-4 project no current editor has opened.
- **Round 3** above.
- Pushing: local `cline-dev` is far ahead of `origin`; that is Richard's call.

## Readings taken in session 6 (2026-10-03)

- viewer-react full: **131 suites, 1,692 tests, 0 failed** (final source, after the ref-arrival fix).
- editor `test:main`: **568 suites, 8,835 tests, 1 failed** (`exp-013/exportBadge`, a peer's ledger; red in s5 too).
  Run before the editor-session fixes; the suites those touched were re-run green after.
- full `noodl-mcp`: **166 suites, 3,585 tests, 20 failed in 10 suites**. None this change after its fixes.
  `kitAgreement` 3 (since fixed, 9/9). On the HEAD-red list: `cmp004Parts` 2, `cmp004RoundTrip` 2,
  `nodeIdAllocation` 1, `cmp001` 1, `fld013` 1, `cn004` 1. Filed: `def038` 6, `d54` 1, `tpl007` 1.
- Catalog gates: `catalog:check`, `catalog:merge:check`, `catalog:groups:check` green.
- Deployed drive (`nodegx deploy` exit 0, both bundles from the final source): 1024 and 390 4/4, ten names found by
  `[data-testid]`, 0 classes, 0 console errors; control 4/4 unmoved.

## Facts measured in session 6 that are not in a task file

- **React attaches a class component's ref after its `componentDidMount`.** In the Noodl wrapper, `getRef()` is null
  inside `NoodlReactComponent.componentDidMount`, so anything there that needs a third-party component's element finds
  none. The wrapper's ref callback in `render()` is where it first exists (s6 moved the data-* sync and the held scroll
  there).
- **`nodegx deploy` does not prerender**; its page renders on the client. A "server-rendered HTML" AC is graded by
  rendering `node.render()` with `renderToStaticMarkup`, unless someone runs `static/ssr/server-core.js`.
- `npm run cdp -- reload --target=viewer` reloaded the **editor** back to the launcher (the preview target disappeared).
  Reopen the project after it.
- The `kit-app` fixture has no home component: its preview is empty until `ProjectModel.setRootComponent(/App)`
  (reachable as `window.__nodeGraphEditor.activeComponent.owner`).
