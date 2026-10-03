# Next session — P109 session 13

**Phase:** [README](README.md) · **Audit:** [AUDIT-2026-10-01.md](AUDIT-2026-10-01.md) · scoped at `27d891bf3`.
**Session 12 (2026-10-03, on `cline-dev`, `79e84faab`, `97a53c579`):** **7 of 25 closed** — ISL-015 ✅ (AC5, the stranger round, run twice) and
ISL-019 AC7 ✅ (the garden drops its pins). Two MCP door defects found by the stranger and fixed; a ruling owed on
ISL-019 AC6.

## Read first

1. ISL-015 §8 s12 — the stranger round's setup, both rounds, the four-arm drive table, and why the person's own
   wiring grades nothing on re-renders.
2. ISL-019 §8 s12 — AC7's four arms (407 newline-only → re-baseline → 0 differ → wall-clock control red), AC6's two
   rounds and the update-route check.
3. Bugs filed s12: `P109-S12-KITONDISK` (fixed), `-SETROOTSOP` (fixed), `-WORKTREEVIEWER` (fixed),
   `-CAMELROOTS` (open), `-KITGROUPPURPOSE` (open), `-REBUILDSTAMPS` (needs-ruling).
4. Memory: `a-stranger-agent-round-recipe` (what made the agent rounds grade the product, not the setup).

## Gate readings taken s12 (2026-10-03, over `e839f2424` + this session's change)

- `noodl-mcp` full, `--maxWorkers=2`, 178 s: **170 suites, 3,623 tests, 12 failed in 9 suites, every one a HEAD-red by
  name**: CMP-004 ×4 + `nodeIdAllocation` (s5), DEF-038 ×2 (peer templates: dbt-demo, nightbook), FLD-013, D54's mutant,
  TPL-007's byte gate (peer-dirty rocket-school), CN-004's strict arm (`P109-S1-CN004`, Expected 1 Received 2),
  CMP-001 AC2's rate (`CMP001RATE`).
- `tsc --noEmit -p packages/noodl-mcp`: **8 errors, the same 8 in the same six spec files** as HEAD
  (`P109-S10-TYPECHECKMCP`; the committed tree reads 11 — three more in `tpl010`, cleared by a peer's uncommitted edit).
- `cg003Template.test.ts` **150/150**; `npm run template:garden` exit 0 (engine gate 259/259).
- New specs: `isl015KitOnDisk.test.ts` 2/2 (red 2/2 at HEAD), `setVisualRootsOp.test.ts` 3/3 (2 red at HEAD, the A20
  derive case green both sides); `kitTools.test.ts` 10/10.
- `nodegx-node-kit-types`: `isl015-kit-traps` + `docsamples` 34/34 after the docs edit.

## Do, in this order

1. **ISL-009's export half**, only when `nodegx-export/src/emit/component.ts` is committed by P18 (still dirty since
   Sep 26 on 10-03).
2. **Round 3 questions**, mechanism first, plain words with what X is, measured populations first (s11's way):
   ISL-019 AC6 (`P109-S12-REBUILDSTAMPS`: restore the old bytes on a same-session delete + create, steer "rebuild" to
   `set`, or accept the update route), ISL-016, ISL-017, ISL-021, ISL-008, ISL-010, ISL-018's open case,
   `P109-S8-ARRAYFILTERPATH` (re-read first: `a6f629a2e`). Then the ISL-022 follow-ups and the s4 bugs.
3. **Small, buildable without a ruling:** `P109-S12-KITGROUPPURPOSE` (add "scaffold a node kit" to the `project`
   group's purpose; measure against `toolDisclosure.test.ts`'s surface gate first).
4. Reuse for any "person's door" AC: the worktree `../OpenNoodl-worktrees/p109-s12` (its `dist` is HEAD + this session's
   three `src` files; remove it with `git worktree remove` when done), `drive-isl015-stranger-kit.js`'s shape.

## Decisions for Richard (not yours)

- Round 3 above, ISL-019 AC6 first. Pushing `cline-dev` is his call (CI meets `P109-S10-TYPECHECKMCP`).

## Facts measured in session 12 that are not in a task file

- **D3 (P69 CN-003) sanctions an mtime-keyed in-memory kit cache**; CN-006's comment had read it as forbidden. The kit
  overlay now refreshes from `guarded()`, so every tool call costs one `readdir` + a `stat` per kit file.
- **`claude -p --allowedTools` pre-approves, it does not restrict**: both stranger agents also had Bash.
- **AAQ-005's three blocking warnings are forgiven only on an update** (already on disk). A delete + create of a
  component that carries one (a `RouterNavigate` with no target) cannot be written back as it was.
- **The `demo-app` fixture's Router has no pages**; any page drive on it needs a write that registers Home first.
