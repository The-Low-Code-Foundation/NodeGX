# P107 — next session

**Written 2026-10-11 (s86, Opus).** Read the [README](README.md) §2–§7 (**R19 is the newest ruling**). Then
[NSP-020 §6.10](NSP-020-PORTS-WITHOUT-A-RUNNING-VIEWER.md): what s86 built and measured. Then
[NSP-021](NSP-021-THE-SECOND-EDITOR.md) and its census ([NSP-021-EDITOR-KNOWLEDGE-CENSUS.md](NSP-021-EDITOR-KNOWLEDGE-CENSUS.md),
built by P112 OWN-000).

**Model: Opus.**

**s86 in one paragraph.** The 10,000 run's 9 mutant survivors are closed by five hand scenarios, and no spec moved
(`6b6cf0d4d`). R19 part 2 is built (`306c917e1`). The agent server refuses a wire to a port a `DRAWN_PORT_TYPES` node does
not have, and names the right one (`addToBasket` → `itemOutputSignal-addToBasket`). The test of "has the port" is drawn
∪ minted on the wire. It runs on a write, a plan and the validate tools. Over Richard's 117 local projects: **575 skipped
wire endpoints → 471 checked OK, 99 refused (every one a dead wire), 0 false.** Found and fixed on the way:
**P107-S86-NODEIDSCOPE**. The port builder found a node by id across the whole project, and 27 of 117 projects reuse
an id in a second component. Filed: **P107-S86-STOREDWIRE**. In 22 copies of a prefab made before ERG-001, Set Object
Properties wires `stored`, which nothing registers.

## Board (from the task files)

| task | built | committed |
|---|---|---|
| NSP-000 … NSP-015 | as s44 (NSP-013 left: AC2's export half and the deep run for s11–s14; NSP-014 / NSP-015 left: AC2's export half, P18's) | s1 … s44 |
| NSP-016 the visual nodes | ✅ s71; s73 SCROLLROOM | `aa8abb06f` … `fd6385beb` |
| NSP-018 the spec speaks | ✅ s77 | s72 … s77 |
| NSP-019 Richard reads it | 🟡 s77: AC1, AC2 and the §2 table built; **AC3 is Richard's drive** | s77 |
| NSP-009 the ratchet | ✅ s64; s65 a `contract` column; s85 a `ports` column (`floor.ports` 130) | `6a1ed0084`, s65, s85 |
| NSP-010 a change is a version | ✅ s78 | `36e08e29e`, `64f9576d9` |
| NSP-017 the escape hatches | 🟡 s64–s68. Left: AC1's export half (P18's) | s64 … s68 |
| NSP-023 the spec without React | ✅ (s50) | s45 … s57 |
| NSP-006 the stranger | ✅ rounds 1–4 | `649e6864d`, s70 … s84 |
| **NSP-020 ports without a viewer** | 🟡 L1–L5 ✅, AC4 ✅, **R19 parts 1 and 2 ✅ (s86)**. Left: **oracle (c)**, which waits on P107-S79-ADAPTERLABEL (open), so Cloud Function, Navigate and Router can join `DRAWN_PORT_TYPES` | s79 … s86 |
| **NSP-021 the second editor** | 📋 not started. Its census (P112 OWN-000) and its round trip (P112 OWN-006, three adapters) are built in P112 | — |
| NSP-022 the cloud-only nodes | 📋 (needs a second runtime target) | s21 |

`spec-ledger --check` (s86): exit 0. It holds at 125 / 147 on the runtime, 3 contract, 2 export, 130 ports, 2 exempt and
17 owed (all NSP-022).

## What s87 does (in order)

1. **NSP-021 step 2, from the census.** Read `NSP-021-EDITOR-KNOWLEDGE-CENSUS.md`. Pick the rows the spec can already
   answer (ports: NSP-020; descriptions and the catalog: NSP-018), and write which spec field answers each one. Then
   build the first question the MCP still asks a viewer or an adapter, so that the spec answers it instead. Measure
   before planning: count each row's reach across Richard's projects
   ([[count-the-reach-first]]).
2. **Oracle (c)** only once P107-S79-ADAPTERLABEL moves. Check the bug's status first, and do not inherit it unmeasured.

**The L1 recipe, for any spec that moves later** (s82 + s83 + s84, one step per line):
- grep the runtime node's `registerOutputIfNeeded` callers;
- write `wiredOutputs` from the gated names the HEAD trace mentions;
- move the spec;
- diff the traces by scenario name (NOT `golden --check` alone: a moved input hash also reads "stale");
- run the interpreter with mutants at seeds 13 and 20728, and the runtime at 200 with seed 20737;
- for a seed-only survivor, run HEAD's spec at the same seed first, then add the hand scenario that kills it;
- add the oracle (a) cases and a planted break;
- run both graph suites.

**The survivor recipe (s86):** reproduce on the INTERPRETER at the deep run's own seed (`runConformance(spec,
interpreterAdapter(…), { sequences: 10000, seed, mutants: true, scenarios: loadScenarios(type) })`: Dropdown 5 min, the
others 30 s). Find the generated sequences that reach the branch by playing them on `discoverBranches(spec).spec` and
watching the branch's `hits`. A sequence that ENDS at the branch is the hole: the killing scenario puts a READER after
it. A scenario that reaches a new branch also arms its neighbours' swap-branches with its example. Distinct values are
not enough: the neighbour needs a reader too.

**Human decisions:**
- **Should the editor's own validator check wires with the spec too?** R19 named the agent server, and the editor passes
  no callback. The number to ask with: 99 refusals over 117 projects, 0 false. Ask it in plain words
  ([[ask-richard-a-ruling-in-plain-words]]).
- NSP-019 AC3 and its three choices; C160; C161; C162.
- **P107-S84-USERACL**: should the User family hide `ACL` like the Record family?
- The Frappe note in NSP-010 §4 is owed to Richard **before the first `changes` entry answers `project`**. None does yet.

NSP-010's and NSP-017's uncommitted notes (not this phase's sessions') were left out again.

**Open, filed this phase:** P107-S86-STOREDWIRE (medium, no load migration for ERG-001's renamed outputs);
P107-S85-RESTCOLTYPES (low, format); P107-S83-SENDFORM (kit `project-contract`; then Function v3).

**P109 holds:**
- D38, the Page Stack, the Router, LIBRARYDOCS and CHR007SNAPSHOT.
- **P107-S82-STATESVALUEPORT**. When it is fixed, drop `KNOWN_ROWS.States` and the `row` on the States scenario in the
  same commit.
- **P107-S82-STATESLOADGATE**. Its two pins in `nsp-020-module-table.ts` then come out.

**P112 holds:** P107-SIZE.

## Gates (s86, this tree)

- **survivors:** at seed 20737 × 10,000 on the interpreter, Dropdown 0 survivors (1133 / 1160, 27 declared), For Each
  445 / 445, Record 236 / 238 (2 declared); at seeds 13 and 20728, all three clean; runtime 200: Dropdown 64 / 64,
  For Each 298 / 298, Record 33 / 33, 0 divergences. `spec-golden:check` 0.
- **R19 part 2:** MCP `nsp020WireCheck` 4 / 4 (planted: 3 red with the callback inert, 1 red with the lookup unscoped);
  editor `tests-unit/nsp-020/wire-check` 4 / 4; project-contract `port-context-node-scope` 3 / 3; the drive
  `nsp-020-port-context` 7 / 7 committed corpus, 7 / 7 over 212 local projects (7,815 nodes).
- MCP `tsc` 0; `typecheck:editor-tests` 0; project-contract `tsc` (both configs) 0; `spec-ledger:check` 0.
- **the whole MCP suite:** 185 / 194 files, 3866 / 3880 tests. The 9 files that fail (14 tests) fail the same with the check
  made inert, so none is R19's: nodeIdAllocation (Text has no `text` output in the catalog), DEF-038 (two templates an
  editor load would rewrite), FLD-013, CMP-004 ×2, writePathConformance, the TPL-011 template (a peer's untracked
  test), and the two drives DEF-018/020 and SBR-009.

**Not run:** the whole runtime conformance batch, `test:main`, `test:ci`, the node-spec jest suite (its batch functions
were run directly at the same seeds).
