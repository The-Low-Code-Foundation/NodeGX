# Next session — P109 session 19

**Phase:** [README](README.md) · **Audit:** [AUDIT-2026-10-01.md](AUDIT-2026-10-01.md) · scoped at `27d891bf3`.
**Session 18 (2026-10-05, on `cline-dev`, `ae10a580a` `71e860ed7` `40d20df1d` and the ISL-004 close-out after them):**
**13 of 25 closed** (ISL-020 this session; ISL-005 closed by session `opennoodl-8e` at `8292f1d55`). Two rounds asked, six
questions, all answered: round 6 (ISL-004 rulings 2–3, ISL-012 ruling 2), round 7 (ISL-020, ISL-006, ISL-013), verbatim in
README §8. **New since s17: Track F** — a peer swept 133 unowned ledger bugs into ISL-026 … ISL-037 (README §4 and the
"Track F" paragraph; uncommitted in the working tree when s18 ended — check `git log` for it before editing README).

## The board (re-derived from each task file's status line, s18 — re-derive it again, never copy this table)

| state | tasks |
|---|---|
| ✅ closed (13) | ISL-001, 002, 003, 005, 011, 014, 015, 016, 017, 019, 020, 021, 023 |
| 🟡 ruled, one reading owed | **ISL-004** (all rulings in; AC1–AC4, AC6 met; AC5 = the F05 record spec, see "Do" 1) · **ISL-012** (AC3's full server render with hydration) · **ISL-018** (AC5: the agent round over the real protocol) |
| 🟢 ruled, not built | **ISL-006** ("List adds, code still mines": the written list carries types and adds ports; mining stays) · **ISL-013** ("A kit says what it needs": manifest `requires`, loaded first, a public call, refused by name when missing) · **ISL-024** ("Own package + a note", only in a quiet gap) |
| 🟡 built here, one half elsewhere | ISL-008 (AC7's export half → P18) · ISL-010 (AC4: llama.cpp, Richard's call) · ISL-009 (export half: P18) · ISL-007 (AC4 → P108 IW-010) |
| 🟡 one case open | ISL-022 (AC6 inconclusive) · ISL-025 (the closing task) |
| ⬜ Track F (new, the peer's sweep) | ISL-026 … ISL-037; ISL-026 (a wrong-kind value kills a node, 20 bugs) is the worst. Each AC1 re-measures first. |

**End condition:** every task closed or handed over by name; ISL-025 last.

## Do, in this order

1. **ISL-004 AC5, then close ISL-004.** `packages/noodl-runtime/test/isl-004-a-stale-writer-lands-last.test.ts` is written
   (three arms over one Variable: a tick holding its own copy in its Component Object = the record, expected `[1,2,100,3]`;
   a tick reading fresh = `[1,2,100,101]`; the build-stamp idiom = `[1,2,100,101]`). Its first run read `[1,1,100,100]` in
   every arm because I wired the tick's number into Set Variable's `do` (fires only when it turns truthy); now
   `success → do`. **Run it once no peer suite is running** (`pgrep -f "jest|vitest"`), add a sabotage arm if the record
   row could pass vacuously, then record AC5 in ISL-004 §8 and close it. If the harness cannot give a Function a Component
   Object (the root has no component owner), hold the copy on a `Model.get('isl004Held')` record instead and say so.
2. **ISL-006 build** on the ruling: the declared `scriptInputs`/`scriptOutputs` list gains types and is the primary route;
   `Inputs.x`/`Outputs.y` mining still ADDS untyped ports (not the recommended "exact"; a typo still makes a port). One
   grammar for runtime, door and exporter (three copies today, pinned by tests). Census: 1,210 Functions, 35 with a list,
   4 reach a port by variable (planning ×2, planning-demo ×2). Re-read §5–§6 and rewrite the ACs for (a) first.
3. **ISL-013 build:** `requires` in the manifest, `nodegx-module-inject` loads required kits first (today alphabetical by
   path: `garden-3d-kit` before `garden-kit` only because `3` < `k`), the SSR loader and the catalog reader in the same
   order, a public accessor instead of walking `__noodl_modules`, install refused by name when missing. The one consumer:
   garden-3d-kit's `siblingWorld()` (`kit3d.js`). 🔴 The catalog reader does NOT load `dependencies` (ISL-012 ruling 2), so
   it must load a required KIT's `main` first, not a dependency file.
4. **ISL-018 AC5** — the agent round (recipe: [[a-stranger-agent-round-recipe]]) in a worktree with real `dist` copies
   (`make-worktree.sh` with an ABSOLUTE parent; never rebuild the primary's shared `dist/` under the five live Electron MCP
   servers).
5. **ISL-012 AC3's server render with hydration** (Deploy → Self Hosting with server rendering, the cube page).
6. ISL-024's move, only in a quiet gap.

## Decisions for Richard (not yours)

- **`P109-S18-REFRESHROWSTATE` (needs-ruling):** a For Each Refresh rebuilds every row, so each row's Component Object
  starts empty even when its record did not change. Keep it (say so on the Refresh port) or reuse rows whose id stays, as an
  items write already does.
- ISL-010 AC4 (llama.cpp's server, or accept Ollama alone) and the Effort port's "None (no thinking)".
- Pushing `cline-dev`; publishing Bot Garden Fonts / Garden Kit / Garden 3D Kit at the origin.

## Handed over (owed by another phase; say so where you meet it)

- **P18:** ISL-008 AC7's export half; `P109-S17-EXPORTKITDEPS` (an export never loads a kit's `dependencies`); ISL-009's
  export half.
- **P108 (IW-010):** README §6 (which island workarounds Keep When Leaving retires); ISL-007 AC4. ISL-006's s8 note
  ("`Translate words` is deleted in IW-010 AC4") has NOT happened yet: still 31,745 characters in the garden.
- **Runtime, unowned:** `P109-S17-KITTHROWBLANKS` (a kit node that throws at mount blanks the whole page).
- **Release notes:** ISL-008; ISL-004's Page port; the doctrine's two new paragraphs (a Component Object's lifetime; long
  code goes in a script file); the reader's refusal names unloaded dependencies.

## Gate readings taken s18

- `cmp001InterfaceDoctrine` + `isl014KitRefusal` + `isl020ScriptFileDoctrine`: 33 of 34; the one red is CMP-001's corpus
  publish rate (39 for a pinned 33, red at HEAD since `c6c72aed6`, not this session's). Sabotage (all three changes undone in
  one run): exactly the three new rows red; the no-note control and the tool-list row green; restored by `cp`, `cmp` clean.
- `tsc -p packages/noodl-mcp --noEmit`: 10 errors, all in island spec files this session did not touch (P109-S10-TYPECHECKMCP
  lists 8; `cg003Template.test.ts` now has 5).
- ISL-004 remount drive (deployed, 390 px): kept on hide/show and on a same-id items write; lost on Refresh, on a row
  filtered out and back, on a page left; app Variable 2 throughout; no console errors.
- ISL-012 reader arm: definition-time read → `modules: []`, both nodes refused; mount control → both register; the 3
  shipped kits with dependencies register in full.

## Facts measured in session 18 that are not in a task file

- 🔴 **After a temporary-index commit, the REAL index still holds the old blobs of every path you committed** (`git status`
  shows `MM`; a new file shows as a staged `D`). A peer's next commit would revert your work. `git reset -q -- <your paths>`
  right after (index only; the working tree and the peer's hunks untouched).
- A number wired into `Set Variable`'s `do` fires only when it turns truthy: 1 → 2 → 3 fires once. Drive `do` from a signal.
- The door refuses a wire to a Function's script port by its bare name and names the prefixed one (`out-items`), with a
  suggestion — the generator learnt it in one round.
- The P86 corpus folder holds markdown, not graphs; its graphs landed as `docs/node-catalog/examples/*.json` (COM-003).
