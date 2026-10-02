# Next session — P109 session 6

**Phase:** [README](README.md) · **Audit:** [AUDIT-2026-10-01.md](AUDIT-2026-10-01.md) · scoped at `27d891bf3`.
**Session 5 (2026-10-02, on `cline-dev` from `6bac3db02`):** ISL-019 built (`1f23b05dd`); ISL-009's ruling 2 built and
driven (`6a9d00cee`); ISL-005's research done and **ruled "Native nodes first"**; ISL-009's ruling 1 asked and **ruled
"A data-* list"**; five bugs filed; this handoff's commit. **4 of 25 closed** (none closed this session: ISL-019 and
ISL-009 each have open ACs).

## Read first

1. README §8 — the two round-2 rulings at the end, as asked.
2. ISL-019 §8 s5 (as built; AC7's three measured blockers), ISL-009 §8 s5 (as built; what the two new ports moved
   elsewhere), ISL-005 §8 s5 and [the census](ISL-005-CENSUS-2026-10-02.md).

## Do, in this order

1. **ISL-009 ruling 1: build the `data-*` list** (§5 1(b): name/value rows on every visual node, `data-*` names only,
   values wirable, written in server render). Put it in ACC-006's accessibility group if that mixin exists by then (read
   P41 first). The door refuses a non-`data-*` name with the rule (AC5, sabotage arm: allow `onclick` → red). Then
   AC2's drive selects by `[data-testid]` only (`scripts/devtools/drive-isl009-scroll-into-view.js` + the
   `isl009-scroll-into-view/` project), AC3 reads the attribute in server-rendered HTML. 🔴 A new shared port moves
   CHR-007's snapshot, FB-017's tier list, AWP-005's ratchet, GAM-019's alternatives and **`kitAgreement`'s recording**:
   see ISL-009 §8 s5 for how each was handled. 🔴 Rebuild the two gitignored bundles before any deploy:
   `noodl-viewer-react`: `npx webpack --config webpack-configs/webpack.deploy.dev.js` (**watch mode — it never exits;
   stop it by its own PID once it prints "compiled"**), and `noodl-preview`: `node build.mjs`.
2. **Re-record `kitAgreement`'s editor fixture** (bug `P109-S5-KITRECORDING`, red since `6a9d00cee`): an editor launch
   with a copy of `noodl-mcp/tests/fixtures/kit-app`, per the recording's own `_recording.how`. One heavy job: do it once,
   after step 1, so the recording carries the `data-*` port as well.
3. **ISL-007 "Adopt the add-on"** (ruled s4, not started): fix the i18next add-on's gaps and teach it to agents. It is
   also the first of the four product gaps "Native nodes first" names.
4. **"Native nodes first" (ISL-005's ruling):** scope the island rebuild as **its own template task** (P108/P78, not
   P109), and the product gaps as P109 work: String Format's repeated placeholder (`P109-S5-STRINGFORMAT`), Array
   Filter's "in list" (`P109-S5-ARRAYFILTERIN`), rows shared app-wide by id (ISL-003 owns it, read it first). Re-scope
   ISL-006 and ISL-020 against the ruling (both waited on ISL-005).
5. **ISL-019's remainder:** AC6 (Claude Code over the door rebuilding a component: needs `noodl-mcp` dist rebuilt from
   `1f23b05dd`+), AC7 (the garden drops its pins) only when no peer has `cg002Content.ts`/`cg003Content.ts` open, and
   decide the trailing-newline byte first (ISL-019 §8 s5, AC7 row).
6. **Round 3 questions, each mechanism checked first:** ISL-016, ISL-017, ISL-021, ISL-008, ISL-010 (s4's handoff list
   and pointers still apply: `projectmodel.ts:324-330` "Make home", `font-awesome-*` modules, `drive-page.js` verbs,
   `modelrequest.ts:67`). And ISL-018's open case (below).
7. ISL-022 follow-ups and the s4 bugs (`P109-S4-UNROUTEDPAGE`, `P109-S4-ROWWRAP`), unchanged from s4's list.

## Decisions for Richard (not yours)

- **ISL-018's open case**, still not asked: the door writing into a format-4 project no current editor has opened.
- **Round 3** above.

## Readings taken in session 5 (2026-10-02)

- ISL-019: `isl019SameBytes` 12/12, three mutants killed. Forty write-path `noodl-mcp` specs: 5 failures in 3 suites =
  s4's HEAD-reds (`cmp004Parts` ×2, `cmp004RoundTrip` ×2, `nodeIdAllocation`, reasons printed). `cg003Template` 9 red
  against a **peer's open garden content**; its byte diff lists no `component.json`/registry/project file.
- ISL-009: deployed drive 4/4 at 1024×768 and 390×844, control 4/4 unmoved; viewer-react 127 suites / 1,671 green; the
  editor's affected suites 19 / 346 green; `catalog:check`, `catalog:merge:check`, `catalog:groups:check` green.
- Editor `test:main` with ISL-009 before its fixes: 567 suites, 7 failed (5 this change, fixed; `exp-013/exportBadge`
  a peer's ledger; `hlt-021/viewerPort` green on re-run). **Not re-run in full after the fixes.**
- `noodl-mcp` 50 catalog-reading specs after ISL-009: red = `kitAgreement` (this change, bug filed), `cmp001`,
  `cmp004Parts`, `cn004`, `fld013` (s4 HEAD-reds), `fld011` (reaper under load). **The full `noodl-mcp` suite was not
  run this session.**

## Facts measured in session 5 that are not in a task file

- **`withInnerComponent` waits for `innerReactComponentRef`, which only a class component sets.** A function component
  (Page, and anything reporting its root through `setDOMElement`) never flushes the queue: an action queued that way
  waits for ever, silently. Every current caller (Group, Video, Drag, Text Input) is a class, so nothing is broken today;
  a new shared action must wait on the element instead (ISL-009 does).
- **`noodl-preview/dist/nodegx-deploy.cjs` was 5 weeks stale** and refused a valid project (`P109-S5-STALEDEPLOYCLI`).
- Both deploy-side bundles are now built from `6a9d00cee`'s source: `noodl.deploy.js` 23:26, `nodegx-deploy.cjs` 23:23.
- A research agent did the ISL-005 census in ~18 minutes, read-only; the method (esbuild the generator in memory, strip
  each shared block, judge row by row) is in the census header and can be re-run.
- Local `cline-dev` is far ahead of `origin`; pushing is Richard's call.
