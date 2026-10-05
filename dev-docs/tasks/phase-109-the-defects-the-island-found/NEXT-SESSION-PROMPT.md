# Next session — P109 session 16

**Phase:** [README](README.md) · **Audit:** [AUDIT-2026-10-01.md](AUDIT-2026-10-01.md) · scoped at `27d891bf3`.
**Session 15 (2026-10-04/05, on `cline-dev`, `3ad262aa3`…, see `git log --grep "p109"`):** **11 of 25 closed** (was 8).
ISL-021, ISL-016 and ISL-017 closed; round 4 asked and ruled (five questions; README §8 round 4, verbatim); the Array
Filter nested-field change built on its ruling.

## The board (re-derived from each task file's status line, s15 — re-derive it again, never copy this table)

| state | tasks |
|---|---|
| ✅ closed (11) | ISL-001, 002, 003, 011, 014, 015, 016, 017, 019, 021, 023 |
| 🔓 **ruled, buildable now** | **ISL-010** (rulings 1 "From the app's backend", 2 "Only for other computers"; 3–4 as recommended) · **ISL-008** ("Stylesheet beats defaults" + Richard's panel warning, a new AC) |
| 🔁 a design question, not a build | **ISL-020** — Richard re-scoped it: how a big script splits into parts that share code (it is ISL-005's open "shared code" half, grown) |
| 🟡 one case open | ISL-018 (the format-4 open case: measured s15, question NOT asked — see item 4) · ISL-022 (AC6 inconclusive) · ISL-007 (AC4 moved to P108 IW-010) · ISL-009 (export half: P18's pile) · ISL-025 (the closing task) |
| ✅ ruled, built elsewhere | ISL-005 ("Native nodes first" → P108 IW-010) |
| ⬜ 🔒 not started, a ruling first | ISL-004, ISL-006, ISL-012, ISL-013, ISL-024 |

**End condition:** every task closed or handed over by name; ISL-025 last.

## Do, in this order

1. **Build ISL-010** (ruled; the smaller of the two). Read its §8 s15 first — the measurement corrected §5:
   - `openai-compatible` in the cloud `Model Request` node (`noodl-viewer-cloud/src/nodes/cloud/modelrequest.ts`, today
     refused with `not_implemented` at :522-533): POST `<base>/v1/chat/completions`, structured output through the server's
     JSON-schema option; same retries/deadline/failure codes (the real set is :66-80 — `rate_limited`, not `http_error`,
     for 429/5xx).
   - Key optional **only** when the Base URL's host is loopback (`127.0.0.1`, `::1`, `localhost`); a look-alike
     (`127.0.0.1.evil.example`) is not local — that is the reverted-arm spec.
   - 🔴 Close the leak §5 does not know about: `http_error`'s message embeds 400 characters of the provider's body (:722)
     and reaches the execution record (:487-495). A local server's error can echo the prompt.
   - Nothing listens on 11434/8080/8000 on this machine. Use an in-test loopback OpenAI-compatible stub for the specs;
     whether to install Ollama for AC2's real-server reading is a question for Richard (below).
2. **Build ISL-008** (ruled). Read §8 s15's census before writing a line: **three inline writers, not one** — the start
   style (`react-component-node.ts:1184-1257`), `Layout.size/align` (`layout.ts:53-110`, on every render from 13
   components) and Columns (`Columns.tsx:603-640`). Fixing the first only leaves the island's width/height forces. The
   44 rules that start applying are the bug being fixed (list them in the release notes); `.animated{opacity:0}` in an old
   Noodl project is the riskiest. The new AC: the property panel marks a value a stylesheet overrides and names where the
   rule lives. SSR, canvas, deploy and export must agree.
3. **ISL-020 + ISL-005's shared code — a design page for Richard, not a build.** His words are in README §8 round 4 ("Let's
   think about it"). Lay out how a coded project does it (modules, imports, one entry point), what NodeGX already has that
   could carry it (existing mechanism first — the head-code / Script node / `Noodl.*` globals; ISL-013's kit `requires`),
   and 2–3 shapes with cost, using the measured population: 961 scripts in `templates/`, 219 over 4,000 characters, 73
   over 20,000, the biggest 182,819 (`bot-garden/Logic/Island world`). Publish it as a page he can read and comment on.
4. **ISL-018's open case — re-derive the options, then ask.** Measured s15 (§8): 239 of 242 folder-format projects are
   still format 4 (all 13 templates); the one-time clean-up changes 20, all built after the checkbox shipped — the
   site-builder theme page stops loading its theme until Save. 🔴 The drafted recommendation ("the door runs the clean-up
   first") applies the same wrong guess earlier; it is not a fix. Candidate shapes: tell a post-checkbox format-4 project
   from an old one by a date it carries (templates now carry `modified` — ISL-016 AC8), save generated templates at 5, or
   accept the 20.
5. Rulings for ISL-004, ISL-006, ISL-012, ISL-013, ISL-024 — measure each population first, ask in plain words.

## Decisions for Richard (not yours)

- ISL-020's design (item 3) — he asked to think it through together.
- Whether to install Ollama (or a llama.cpp server) on this machine for ISL-010 AC2's real-server reading.
- Publishing Bot Garden Fonts / Garden Kit / Garden 3D Kit at the origin (`library:verify-origin` lists all three as
  unpublished). Pushing `cline-dev`.

## Peer-blocked (do not touch; re-check each)

- `tpl007` / `tpl008` / `tpl010` still call `templatePins.pinRootNode` (peer-dirty generators); the helper stays.
- The export's Array Filter copy (`nodegx-export/src/analyze/plan.ts:7841`, peer pile) — [P109-S15-ARRAYFILTERPATHEXPORT](../../bugs/p109-s15-arrayfilterpathexport-the-export-filters-a-dotted-key-as-one-field-name.md).
- `publish-templates-to-shelf.sh` still carries the peer's Sep 23 P78 edit (counts, planner → planning, `--unpublish`);
  this session's hook was committed around it through a temporary index.

## Gate readings taken s15

- `noodl-mcp`: `isl021DrivePage` 10/10; neighbours (`toolDisclosure`, `renderTools`, `isl021ShopParity`,
  `p109FindToolsPhrase`, `rel011cAdminSurfaces`) 64/64; the garden readers (`cg003Template`, `isl017ResolveKits`,
  `isl025Census`, `isl021*`, `isl022WrappedRow`, `libraryTools`, `isl017LibraryProvenance`) 213/213; `tpl001/003/005/006`
  + `isl016ProjectSettings` 261/261; `isl017InstallOrder` 1/1. `tsc --noEmit -p packages/noodl-mcp` **8 = the floor**, read
  twice (after the drive_page change and after the generators).
- `noodl-mcp` **full**, `--maxWorkers=2`, over `7c4bcbf38` (2026-10-05 10:35–10:38, JSON mtime 10:38 inside the run):
  **177 suites, 3,745 tests, 12 failed in 9 suites.** By name against s14's baseline: CMP-004 ×4, `nodeIdAllocation`,
  DEF-038 ×2, FLD-013, D54's mutant, CN-004 strict, CMP-001 AC2's rate — **the same**; TPL-007's byte gate has **left**
  the list (not this session's doing); **new:** `fld011ParallelTabs` "reaps an orphan…" — passes alone 11/11 twice; it is a
  race with another worker's render sweep, filed [P109-S15-FLD011ORPHANRACE](../../bugs/p109-s15-fld011orphanrace-a-parallel-render-suite-reaps-fld-011s-planted-orphan.md).
  If it is red alone, it is not the race.
- `noodl-runtime`: `p109-array-filter-nested-field` 6/6 + `isl-005-array-filter-in-list` 7/7; conformance
  (`NSP_ONLY="Filter Collection"`) CONFORMS, 98/98 mutants. `nodegx-node-spec` batch-data + canonical + catalog-parity
  362/362. `catalog:merge:check` clean; `docs:nodes:check` already stale on other nodes' pages (peers), not Filter
  Collection's.
- `noodl-editor`: FLD-009's `projectLevelGuard.test.ts` 16/16 **under plain jest** (`--testMatch`); its home runner
  (`test:ci`) not run.
- Deployed garden (`assemble` + `nodegx deploy`, after the kits left the template): shop drive `--quick` **28/28**.
- Every reverted arm is in its task's §8 s15 (drive_page ×2, assemble, generator drop, tpl003 ×2, tpl001, AC5 guard,
  Array Filter ×2).

## Facts measured in session 15 that are not in a task file

- `document.fonts.check('16px X')` answers **true when no face named X exists** — read `[...document.fonts]` for a
  `loaded` face instead (a face loads only when text uses it).
- Chrome asks for `/favicon.ico` itself on every load; `render-from-disk` answers 404. `drive_page`'s `network_errors`
  leaves it out.
- A pure spec under `packages/noodl-editor/tests/` runs under plain jest with `npx jest --testMatch '<rootDir>/tests/…'`
  — seconds instead of the Electron `test:ci`.
- `NSP_ONLY` takes the node's display name (`"Filter Collection"`); an empty value runs **every** spec (it ran 10
  minutes before it was stopped).
- The worktree `../OpenNoodl-worktrees/p109-s12` is now detached at `1fb213812` with a `noodl-mcp` dist built there
  (AC5's server). Remove it with `git worktree remove` when the phase ends.
- An agent round over the door: ISL-017 AC5 cost **$1.13 / 46 turns** (sonnet).
