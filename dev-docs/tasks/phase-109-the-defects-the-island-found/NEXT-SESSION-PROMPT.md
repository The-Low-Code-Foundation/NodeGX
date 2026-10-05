# Next session — P109 session 20

**Phase:** [README](README.md) · **Audit:** [AUDIT-2026-10-01.md](AUDIT-2026-10-01.md) · scoped at `27d891bf3`.
**Session 19 (2026-10-05, on `cline-dev`, `75e0e6cef` `b7fcad09a` and the docs commit after them):** **14 of 25 closed** (no change);
**ISL-006 built in two slices**, owed one editor session. Round 8 asked two rulings (ISL-006 rulings 2 and 3), verbatim in README §8.
🔴 Ruling 3 was first asked on a wrong number and re-asked (README §8 round 8; ISL-006 §8 s19).

**New since s18, not mine: Track F's rulings round.** A peer put every `needs-ruling` row of ISL-026 … ISL-033 to Richard on one
page (102 cards): 101 as recommended, 1 against (P107-D31). Each ISL-026 … ISL-033 status line now says "✅ AC2: all rulings taken".
That README block was **uncommitted in the working tree** when s19 ended (the peer's hunk, beside the Track F scaffold); check
`git log -- README.md` before editing round it.

## The board (re-derived from each task file's status line, s19 — re-derive it again, never copy this table)

| state | tasks |
|---|---|
| ✅ closed (14) | ISL-001, 002, 003, 004, 005, 011, 014, 015, 016, 017, 019, 020, 021, 023 |
| 🟡 built, one editor session owed | **ISL-006** (AC2's panel half; AC10 opened live). AC8 → P108 IW-010 |
| 🟡 ruled, one reading owed | **ISL-012** (AC3's full server render with hydration) · **ISL-018** (AC5: the agent round over the real protocol) |
| 🟢 ruled, not built | **ISL-013** ("A kit says what it needs") · **ISL-024** ("Own package + a note", only in a quiet gap) |
| 🟡 built here, one half elsewhere | ISL-008 (AC7 export → P18) · ISL-010 (AC4: llama.cpp, Richard's call) · ISL-009 (export → P18) · ISL-007 (AC4 → P108 IW-010) |
| 🟡 one case open | ISL-022 (AC6 inconclusive) · ISL-025 (the closing task) |
| ⬜ Track F, **every ruling taken** | ISL-026 … ISL-033 buildable now; ISL-034 … ISL-037 had no rulings to take. ISL-026 (a wrong-kind value kills a node, 20 bugs) is the worst. Each AC1 re-measures first. |

**End condition:** every task closed or handed over by name; ISL-025 last.

## Do, in this order

1. **ISL-006's editor session, then close it.** One editor launch on a throwaway profile (`NOODL_USER_DATA_DIR` + seeded recents,
   never Richard's store), driving COPIES:
   - AC2's panel half: a Function, three outputs declared in the Script Outputs panel with types; the node shows them typed.
   - AC10 live: open a copy of `~/vscode_projects/Noodl projects/SuntappedX` (a 0.2 project, so the text-style upgrade may run in
     the same toast). Read: the toast has "Wired Function ports kept" and 21 names on 12 Functions, a backup folder exists, the
     project saves, and those wires are solid (not "Target port doesn't exist"). Control: a copy of `hsseq-test-main` shows no
     such section. The logic is already graded on both copies (ISL-006 §8 s19: 2,140 ends alive before and after, 0 lost).
2. **Track F, ISL-026 first** (rulings taken). Read its file; AC1 re-measures each bug before building.
3. **ISL-013 build** (as s18's prompt: `requires` in the manifest, loaded first, a public accessor, refused by name; the catalog
   reader does NOT load `dependencies`, so it loads a required kit's `main` first).
4. **ISL-018 AC5**, the agent round ([[a-stranger-agent-round-recipe]]), in a worktree with real `dist` copies.
5. **ISL-012 AC3's server render with hydration.** 6. ISL-024's move, only in a quiet gap.

## Decisions for Richard (not yours)

- **`P109-S18-REFRESHROWSTATE` (needs-ruling):** a For Each Refresh rebuilds every row, so each row's Component Object starts
  empty. Keep it (say so on the Refresh port) or reuse rows whose id stays.
- ISL-010 AC4 (llama.cpp, or accept Ollama alone) and the Effort port's "None (no thinking)".
- Pushing `cline-dev`; publishing Bot Garden Fonts / Garden Kit / Garden 3D Kit at the origin.

## Handed over (owed by another phase; say so where you meet it)

- **P78 TPL-011 (uncommitted pile, untracked since 09-27):** `P109-S19-TPL011UNREADID` — Nightbook's generator wires `pm-id`
  into `openEnvelope`'s "May it be written?", which never reads `Inputs.id`; the door now refuses it (`tpl011Template` 35 → 32).
  Fix in the generator (wire it only where the script reads it). Not touched here. Also: **D80's section in P78's register is
  inside that same uncommitted pile** — its ledger file `p78-d80-…` says fixed (`75e0e6cef`); the register text should say so
  when it lands.
- **P18:** ISL-008 AC7 export half; `P109-S17-EXPORTKITDEPS`; ISL-009's export half. `nodegx-export` full suite s19: 5 red in 3
  suites (`hls006-every-listener`, `hls001-corpus-identity` 52→53 projects and every README, `sse` §F floor), the same with
  ISL-006's two exporter files reverted — P18's pile or the open LISTENERREGEX bug, not ISL-006.
- **P108 (IW-010):** ISL-006 AC8 (`Translate words`, the generator's `TYPE` table and `portsOf`); ISL-007 AC4; README §6.
- **Templates:** `P109-S19-DEMOSTUBWIRES` (the training demo's stubs keep 4 wires into inputs nothing reads; low).
- **Runtime, unowned:** `P109-S17-KITTHROWBLANKS`.
- **Release notes:** ISL-008; ISL-004's Page port; the doctrine's two paragraphs; the reader's refusal names unloaded dependencies;
  **ISL-006**: the written port list is the way to type a Function port; `unknown-function-port`; underscore signals work;
  `Inputs["x"]` is an input; a comment makes no port; old projects keep their wired ports ("Wired Function ports kept").

## Gate readings taken s19 (2026-10-05, at `b7fcad09a` + the working tree's peer piles)

- `noodl-mcp`: `isl006FunctionPortList` 6/6 (AC1 red before; sabotage → exactly the 2 refusal rows); 13 template/door suites:
  5 red = DEF-038 ×2 (red with the check off too) + TPL-011 ×3 (one wire, above). `tsc --noEmit` 10 errors, the s18 island files.
- `noodl-editor` tests-unit: isl-006 30, fix-007 24, sb-017, fix-006, oneWayGate, queryBeforeFilter, upg-003 green; `tsc` 0.
- `noodl-runtime`: 14 Function suites 181/181; `tsc` 0. `noodl-core-ui` code-editor 21 suites 392/392 (+4 in scriptPorts).
- `nodegx-export`: full suite 3,840 pass / 5 red (attributed above); `tsc` 0. `project-contract` `tsc` 0.
- Catalog: `catalog:check`, `catalog:merge:check`, `docs:nodes:check` exit 0 (`node-catalog.json` regenerated for the bracket
  input's `plug: "input"`).
- Deployed page (`scripts/devtools/isl006-typed-ports.ts`, `nodegx deploy` exit 0): 8/8, no console errors.

## Facts measured in session 19 that are not in a task file

- 🔴 **A wire to a Function's `in-`/`out-` port is kept by the RUNTIME whatever the editor thinks** (`registerInputIfNeeded` /
  `registerOutputIfNeeded` register any name on arrival; an unread input still re-runs). The editor's port list is the written
  list + the code's names + saved `ports`; any other wire is error-level and `exportComponent` deletes it. A harness that runs
  the runtime alone (graph harness, render-from-disk) cannot see that defect.
- 🔴 **A `//.*` comment strip eats the code after the `//` in a URL string.** It turned 1 comment-only port into 6 and put a wrong
  number in front of Richard. Strip comments with a string-, template- and regex-aware scanner (`stripScriptComments`).
- 🔴 **An agreement test that compares names only cannot see a type drift:** an underscore-signal drift stayed 36/36 green until
  the row compared name, plug and type.
- Plain `grep` on this machine returned nothing for `Outputs` in `scripts/library/render-check.js`; `git grep` found 16
  lines. Use `git grep` for a census.
- `scripts/devtools/*.ts` that import `noodl-mcp/src` need `TS_NODE_TRANSPILE_ONLY=1` (ts-node OOMs typechecking zod), and a
  deferred door tool (`set_project_settings`) needs `find_tools { group: 'project' }` first.
