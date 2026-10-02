# P107 — next session

**Written 2026-10-02 (end of s21).** Read the [README](README.md) §2–§7. s21's record is [NSP-014 §6](NSP-014-BATCH-DATA-AND-CLOUD.md);
the BACKEND rule is in the header of [world.ts](../../../packages/nodegx-node-spec/src/world.ts) (before "A TARGET'S VIEW").

## Board (from the task files)

| task | built | committed |
|---|---|---|
| NSP-000 the census | ✅ s1; **s21: the batch `NSP-022` added, 17 rows moved, regenerated** | `3bd71e837`, s21 |
| NSP-001 the spec + interpreter | ✅ s1 … s21; **s21: a patch's `backend` effect, `world.backend` handler, `WorldView.backendFor`** | s1 … s21 |
| NSP-002 traces + adapter + runtime target | ✅; **s21: the `backend` event (request group); the runtime target's `installBackend` — the REAL `CloudStore` + resolution, the project's `backendServices` = the script's ids, only `RestDataAdapter`'s operation methods stood in (`BACKEND_OPS`: delete, addRelation, removeRelation); the registry seeds `classes`** | s2 … s21 |
| NSP-003 the runner | ✅; **s21: the `backend` refusal gone; a backend world drawn per sequence; mutants `world.backend`, `drop-backend` (shape key only when present — earlier shapes byte-identical)** | s2 … s21 |
| NSP-004 the pilot five | ✅ s3 | `ef6f3b6e1` |
| NSP-005 the export adapter | ✅ (s13); plays the latch nodes only | s13, s15 |
| NSP-006 the stranger | ✅ rounds 1, 2, 3, 3b; s21 changed guarded format files additively — hashes refreshed (the diff named exactly schema JSON, spec.ts, trace.ts, world.ts), the three rounds green | `fec895706`, s21 |
| NSP-007 the world | ✅; **s21: BACKEND, the eleventh seam (not at the HTTP level — R9)**; AC1's export half ✗ | s13, s16 … s21 |
| NSP-008 the graph | ✅ (s15, s20) — 60 / 60, re-read s21 | s15, s20 |
| NSP-010 a change is a version | rows only (two holes, §4) | — |
| NSP-011 / NSP-012 | as s15 | s15 |
| NSP-013 the time batch | 🟡 24 / 24 conform. Left: AC2, the deep run for s11–s14 | s16 |
| **NSP-014 records, users, files, HTTP** | **🟡 4 of 24 — s21: split (17 cloud-only → NSP-022), R9, BACKEND, Delete Record, Add / Remove Record Relation; row C33** | s8, s21 |
| NSP-015 navigation + components | 🟡 14 of 14 conform. Left: AC2 (export, P18) | s15 … s20 |
| NSP-020 ports without a viewer | rows only | s20 |
| **NSP-022 the cloud-only nodes** | **📋 opened s21** (needs a second runtime target, `noodl-viewer-cloud`) | s21 |
| NSP-009, NSP-016 … NSP-019, NSP-021 | — | — |

**86 of 147 conform on the runtime (58.5%)** (T1 45/46 · T2 10/11 · **T3 4/39** · T4 27/27; 0 exempt). Counted s21 from the
66 specs × tiers.json (T1 45 · T2 9 · T3 4 · T4 8) + On App Error + the 19 graph-graded T4 nodes. Graph 60 / 60.

## Commits this session (on `cline-dev`)

One commit, s21: R9, the BACKEND seam, Delete Record, Add / Remove Record Relation, the NSP-014 / NSP-022 split, row C33 (+
its ledger file), the docs, this handoff.

## Gate readings (2026-10-02, s21, on the tree of the s21 commit; HEAD before it `8a98742cf`)

| gate | reading |
|---|---|
| `packages/nodegx-node-spec`: `npx jest` (whole package) | **18 suites, 673 passed, 17 skipped, exit 0** (s20: 17 suites, 649) — + `tests/batch-records.test.ts` (12), BACKEND in `world.test.ts` (3), the runner's backend test rewritten |
| runtime: `NSP_ONLY="DeleteDbModelProperties,AddDbModelRelation,RemoveDbModelRelation" … conformance.test.ts` | **all three CONFORM**, seed 20728 — Delete 20 / 20, 200 / 200, 34 / 34; Add / Remove 18 / 18, 200 / 200, 36 / 36. Interpreter: every mutant killed on seeds 13, 20728–20731 |
| runtime: `npx jest test/node-spec/runtime-target.test.ts test/node-spec/graph.test.ts` | **2 suites, 86 passed, exit 0** |
| runtime: whole `npx jest test/node-spec`, FIRST try (load 12–17) | **not a clean reading** — 1,011 s vs the 600 s `beforeAll` budget, 65 tests failed on the hook timeout. Its log: 62 of 64 specs CONFORM; Stream Buffer + Text Accumulator never reported → re-read alone: both CONFORM. See below for the retry |
| runtime: `npx jest test/node-spec/conformance.test.ts -t "NSP-004 / NSP-011 — every"`, SECOND try (load ~3–5) | **1 suite, 67 passed, 70 skipped, exit 0, 448 s — all 66 specs CONFORM at seed 20728, the known rows still fire.** The clean reading |
| `tsc --noEmit` node-spec, runtime (`tsconfig.json`, includes `test/`) | exit 0 · exit 0 |
| `node scripts/node-spec/census.js --check` | fresh — 147, 33 excluded, all tiered |
| `packages/nodegx-export` node-spec tests, whole runtime `npx jest`, `test:main` | NOT RUN — s21 touched no export code; in the runtime only `test/helpers/node-spec-target.ts` |

## What s21 settled (and where the handoff was wrong)

1. **R9, ruled: the request, not the wire.** Measured first: one record node reaches NodeGX's own backend (a
   Parse-SHAPED `/classes/<Name>` wire, `XMLHttpRequest`) or four REST backends (`fetch`, one URL shape each). Recording the
   HTTP would have bound every record spec to one wire. My first wording said "Parse" and Richard corrected it — the server
   is NodeGX's own (`packages/nodegx-backend`); the wire is merely Parse-shaped. **Say "NodeGX's own backend (its legacy
   `/classes` wire)", never "Parse", to Richard.**
2. **The handoff's "reuse the request seam at the HTTP level" (NSP-007 §5, world.ts' old footer) was overruled by R9** —
   the seam is the backend contract's operation. The record node still computes a `/classes`-shaped `where` for the legacy
   wire (`dbcollectionnode2.ts:882`); that translation is outside every record spec's reach — Query Records' spec must say so.
3. **The design that worked:** keep the runtime's own `CloudStore` and backend resolution REAL (they are runtime code —
   POPUP's rule), stand in only `RestDataAdapter`'s operation methods (`BACKEND_OPS`, one per operation, each READ from the
   adapter: what it hands `success`, which event it emits after). The project's backends are `backendServices` v2, each
   typed `directus` → the REST adapter → the neutral filter.
4. **A seed-dependent kill, the second time (s20 then s21):** the relation pair's `repeaterComponent` mutant died at seed
   13, lived at 20728. Rule now in the batch test: grade a new spec's mutants on TWO seeds; any mutant that lives on one gets
   a hand scenario.
5. **The full runtime suite cannot finish inside its 600 s `beforeAll` under a loaded box** (1,011 s at load 12–17). A
   timed-out hook fails EVERY test after it with "Exceeded timeout … for a hook" — 65 reds that say nothing about the gates;
   read the per-spec CONFORMS lines and re-read the ones that never reported. Consider splitting the beforeAll per spec.
6. **Generated reach is thin for multi-precondition nodes:** a Record press reaches the backend only with a Class, an Id and
   a resolvable Backend — 17–24 of 200 sequences. The Backend port is edit-only (the panel's values only) and in group
   General for this family — the first draft had both wrong.
7. **Row C33** (no backend configured: a browser sends `DELETE undefined/classes/…` to the app's own host and reports its
   404; Node never answers) — filed in the ledger, outside R9's world.

## What s22 does

- **Continue NSP-014 — Create Record and Update Record next** (`NewDbModelProperties`, `SetDbModelProperties`): the same
  base (`src/nodes/record-base.ts`) plus `addInputProperties` (the `prop-*` ports from the Class's schema — a project's
  schema is world data the seam does not have yet: decide where it lives, probably `BackendScript.collections`) and
  `addAccessControl` (the ACL, which reads the CURRENT USER — measure where the user comes from before speccing). Add each
  operation to `BACKEND_OPS` from `RestDataAdapter.create` / `.save` (read what they hand `success` and emit). Probe first
  (`zz-` file), as s21 did for Delete Record: ten questions on the runtime before a spec line.
- Then **Record** (`DbModel2` — fetch) and **Query Records** (`DbCollection2`, 1,513 lines; the neutral filter; state the
  legacy `where` translation is out of reach). Filter Records (T1, over the store) can come with Query Records.
- **Cheap, alongside, on a QUIET box only** (`uptime` first): the deep runs s20 listed (clock-driven specs under T9, Pop
  Component Stack, s11–s14 at `NSP_DEEP=10000`); the three record specs at 10,000; the 200-gate on seeds 20729 / 20730.
- **NSP-009 the ratchet** is still the small protective alternative.

**Human decisions outstanding:** rows to ask, in plain words (README §7 has them written): **C27 + C29 together** (one ruling:
"hand a copy"), then **C30**, **C26**, **C24**, C31, C32, C28, C25, D20, D21; then C22, D19, C11, C12, C15, C16, C20, C7, D14,
D16; **new: C33** (`node scripts/bugs.js --from P107`); R7; R8; R4's confirmation; G1.

## Before you start

- Shared checkout: pathspec commits through a temporary index (`GIT_INDEX_FILE=…; git read-tree HEAD; git add <mine>;
  commit-tree; update-ref <branch> NEW OLD`), then `git reset -q -- <mine>`. Never `git add -A`, never `git stash`; one heavy
  job at a time — `uptime` before any deep run. The `/next` state file belongs to P108's workstream — do not overwrite it.
- Throwaway probes go in `packages/noodl-runtime/test/node-spec/zz-*.test.ts`, deleted in the same command. The play sinks
  `console.*` — print with `process.stdout.write`. To probe the backend before the seam knows an operation, patch
  `RestDataAdapter.prototype.<op>` around one play and set `backendServices` on `NoodlRuntime.instance.graphModel`
  (s21's probe did exactly that).
- `tiers.json` is hand-kept and line-per-node: edit it TEXTUALLY (a `json.dump` rewrite reformatted all 785 lines, s21),
  then `node scripts/node-spec/census.js`.
- A spec behaviour change is a version; an ADDITIVE format change needs the hashes
  (`node -e "require('./tests/stranger-suite-hashes.helper.js').write()"`, check the diff names only what you touched) and
  the three rounds green.
- A scenario's `row` means KNOWN TO FAIL on the runtime. A scenario whose reference trace has no observation event is refused.
