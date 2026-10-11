# P107 — next session

**Written 2026-10-11 (s84, Opus).** Read the [README](README.md) §2–§7 (R18 is the newest ruling). Then read
[NSP-020 §6.6, §6.7 and §6.8](NSP-020-PORTS-WITHOUT-A-RUNNING-VIEWER.md): the decided format, and how s83 and s84 put
every padded spec on it. Then [NSP-019 §5.1](NSP-019-RICHARD-READS-IT.md), Richard's drive, which is still owed.

**Model: Opus.** What is left on NSP-020 is L5, then the one 10,000-sequence run.

**s84 in one paragraph.** L1 is done. The last 14 specs draw their ports from `(params, context)` as their runtime hooks
announce them:
- the Record CRUD five, Query / Filter / Subscribe;
- User, Set User Properties, Sign Up;
- Push Component To Stack, Show Popup, For Each.

Oracle (a) is at 40 graded rows, 227 cases, 0 owed. Every existing hand trace is byte-identical. `wiredOutputs` was
written on 297 hand scenarios and 7 graph nodes. Five new scenarios each kill a mutant that only some seeds reached, or
grade a `hasOutput` gate. `spec.ts` grew four small things:
- `BackendField.relation`;
- the `query-filter` / `query-sorting` value types;
- `ComponentInterface.nodes` (and `'signal'` ports);
- `NamedPages.components`.

The stranger hash was refreshed and the rounds re-graded. Found **P107-S84-USERACL**: the User family draws a `prop-ACL`
port on the Parse wire, while the Record family hides it.

## Board (from the task files)

| task | built | committed |
|---|---|---|
| NSP-000 … NSP-015 | as s44 (NSP-013 left: AC2's export half and the deep run for s11–s14; NSP-014 / NSP-015 left: AC2's export half, P18's) | s1 … s44 |
| NSP-016 the visual nodes | ✅ s71; s73 SCROLLROOM | `aa8abb06f` … `fd6385beb` |
| NSP-018 the spec speaks | ✅ s77 | s72 … s77 |
| NSP-019 Richard reads it | 🟡 s77: AC1, AC2 and the §2 table built; **AC3 is Richard's drive** | s77 |
| NSP-009 the ratchet | ✅ s64; s65 a `contract` column | `6a1ed0084`, s65 |
| NSP-010 a change is a version | ✅ s78 | `36e08e29e`, `64f9576d9` |
| NSP-017 the escape hatches | 🟡 s64–s68. Left: AC1's export half (P18's) | s64 … s68 |
| NSP-023 the spec without React | ✅ (s50) | s45 … s57 |
| NSP-006 the stranger | ✅ rounds 1–4 (the `spec.ts` hash refreshed s84; all four rounds re-graded) | `649e6864d`, s70 … s84 |
| **NSP-020 ports without a viewer** | 🟡 s79 design; s80 L2 ✅, L4 ✅; s82 the format (§6.6); s83 L3 ✅ (§6.7); **s84 L1 ✅ (§6.8). Left: L5, oracle (c), the 10,000 run** | s79 … s84 |
| NSP-021 the second editor | 📋 not started (depends on NSP-020 L5) | — |
| NSP-022 the cloud-only nodes | 📋 (needs a second runtime target) | s21 |

`spec-ledger --check` (s84): exit 0, holding at 125 of 147 on the runtime, 3 contract, 2 export, 2 exempt, 17 owed (all
NSP-022).

## What s85 does (in order)

1. **L5.**
   - `portContextFor(project, nodeId)` in `@nodegx/project-contract` fills every `PortContext` field from a saved project:
     - `wired` and `wiredOutputs` from the component's connections;
     - `backends` from `backendServices`;
     - `schema` from `dbCollections` + `systemCollections` (a Parse `Relation` column → `relation`; `_User` lives in
       `systemCollections`);
     - `stacks` from the project's Page Stack nodes (`name` or `Main`, `pages[].id`, `pageComp-<id>` → `components`);
     - `components` from each component's Component Inputs / Outputs ports and `nodes` (by type, each node's params).

     Oracle (a)'s fake (`nsp-020-oracle-a.ts` `announcedPorts`) is the reverse map: read it first, it is the measured
     shape.
   - The cache drive over the templates (§5): a pure `drawnPorts` must agree with the ports the editor cached in each
     template's project file.
   - AC3: the MCP's per-instance ports (`drawnPorts` draws the outcome ports now).
   - AC4: the ledger column from `portsDerivability`.

   Oracle (c) waits on P107-S79-ADAPTERLABEL.
2. **ONE 10,000-sequence run on the primary** (`NSP_DEEP=10000 … -t deep`), now that L1 and L3 have landed. It is one
   heavy job: run it alone and tear it down after.

**The L1 recipe, for any spec that moves later.** The recipe is s82 + s83 + s84, one step per line:
- grep the runtime node's `registerOutputIfNeeded` callers;
- write `wiredOutputs` from the gated names the HEAD trace mentions (`scratchpad`-style script: read
  `git show HEAD:…/golden/<T>.json`, collect ports matching the gated pattern per scenario);
- move the spec;
- diff the traces by scenario name (NOT `golden --check` alone: a moved input hash also reads "stale");
- run the interpreter with mutants at seeds 13 and 20728, and the runtime at 200 with seed 20737;
- for a seed-only survivor, run HEAD's spec at the same seed first, then add the hand scenario that kills it;
- add the oracle (a) cases and a planted break;
- run both graph suites.

**Human decisions:**
- NSP-019 AC3 and its three choices; C160; C161; C162.
- **P107-S84-USERACL**: should the User family hide `ACL` like the Record family?
- The Frappe note in NSP-010 §4 is owed to Richard **before the first `changes` entry answers `project`**. None does yet.

NSP-010's and NSP-017's uncommitted notes (not this phase's sessions') were left out again.

**P109 holds:**
- D38, the Page Stack, the Router, LIBRARYDOCS and CHR007SNAPSHOT.
- **P107-S82-STATESVALUEPORT** (states.ts :534-541). When it is fixed, drop `KNOWN_ROWS.States` in the runtime's
  `conformance.test.ts` and the `row` on the States scenario in the same commit.
- **P107-S82-STATESLOADGATE** (states.ts :1248). The two pins on the States row in `nsp-020-module-table.ts` then go stale
  and come out.

**Open, kit `project-contract`:** **P107-S83-SENDFORM**. The fix is a `.send()` signal pattern in `function-ports.ts` and
its byte-identical copy. The Function spec then goes to v3 with a `changes` entry naming the id.

**P112 holds:** P107-SIZE (308.2 KB gzipped against 240).

## Gates (s84, this tree, on `6e44387bc`)

See NSP-020 §6.8 for the full list. In short:
- every hand trace byte-identical; `spec-golden:check` 0 (9,216 scenarios); `spec-ledger:check` 0;
- the 19 moved specs conform on the interpreter (seeds 13, 20728, mutants, 0 survivors) and on the runtime (200, seed 20737);
- `nsp-020-ports-parity` 324 / 324; both graph suites (96, 128); runtime-target, the contracts and the editor-suite graph
  86 / 86;
- editor `tests-unit/nsp-020` 452 / 452 and `typecheck:editor-tests` 0;
- the stranger rounds 46 / 46 (+18 deep skipped, hash refreshed); the full node-spec suite 33 suites, 1,895 / 1,895.

**Not run:** the whole runtime conformance batch, `test:main`, `test:ci`, and any 10,000 run.
