# P107 — next session

**Written 2026-10-02 (end of s22).** Read the [README](README.md) §2–§7. s22's record is [NSP-014 §6.4–§6.6](NSP-014-BATCH-DATA-AND-CLOUD.md);
the BACKEND rule (now with a failure's `detail` and USER) is in the header of [world.ts](../../../packages/nodegx-node-spec/src/world.ts).

## Board (from the task files)

| task | built | committed |
|---|---|---|
| NSP-000 the census | ✅ s1; s21 the `NSP-022` batch | `3bd71e837`, s21 |
| NSP-001 the spec + interpreter | ✅ s1 … s22; **s22: `BackendAnswerEvent.detail`, `WorldView.backendUser()`** | s1 … s22 |
| NSP-002 traces + adapter + runtime target | ✅; **s22: `BACKEND_OPS` + `create`, `save`; a failure's `detail` handed on; a throw in a success callback goes to `error` (as the REST adapter's promise chain does); `installUser` (the signed-in user through the REAL `SessionStore`)** | s2 … s22 |
| NSP-003 the runner | ✅ (s21) | s2 … s21 |
| NSP-004 the pilot five | ✅ s3 | `ef6f3b6e1` |
| NSP-005 the export adapter | ✅ (s13); plays the latch nodes only | s13, s15 |
| NSP-006 the stranger | ✅ rounds 1, 2, 3, 3b; s22 changed guarded files additively — hashes refreshed (the diff named exactly spec.ts, world.ts), the three rounds green | `fec895706`, s21, s22 |
| NSP-007 the world | ✅; BACKEND (s21) **+ `detail` + USER (s22)**; AC1's export half ✗ | s13, s16 … s22 |
| NSP-008 the graph | ✅ (s15, s20) — 60 / 60 | s15, s20 |
| NSP-010 a change is a version | rows only (two holes, §4) | — |
| NSP-011 / NSP-012 | as s15 | s15 |
| NSP-013 the time batch | 🟡 24 / 24 conform. Left: AC2, the deep run for s11–s14 | s16 |
| **NSP-014 records, users, files, HTTP** | **🟡 6 of 24 — s22: Create Record, Update Record; the deep run's row C36 in Delete Record; rows C34–C36** | s8, s21, s22 |
| NSP-015 navigation + components | 🟡 14 of 14 conform. Left: AC2 (export, P18) | s15 … s20 |
| NSP-020 ports without a viewer | rows only | s20 |
| NSP-022 the cloud-only nodes | 📋 opened s21 (needs a second runtime target, `noodl-viewer-cloud`) | s21 |
| NSP-009, NSP-016 … NSP-019, NSP-021 | — | — |

**88 of 147 conform on the runtime (59.9%)** (T1 45/46 · T2 10/11 · **T3 6/39** · T4 27/27; 0 exempt). Counted s22 from the
68 specs × tiers.json (T1 45 · T2 9 · T3 6 · T4 8) + On App Error + the 19 graph-graded T4 nodes. Graph 60 / 60.

## Commits this session (on `cline-dev`)

One commit, s22: Create Record + Update Record, `record-write.ts`, the world's `detail` + USER, the runtime target's
`create` / `save` / catch / `installUser`, the C36 known row + scenario, catalog parity for a list-seeded node, rows
C34–C36 (+ ledger files), the docs, this handoff.

## Gate readings (2026-10-02, s22, on the tree of the s22 commit; HEAD before it `5d1ab1e72`)

| gate | reading |
|---|---|
| `packages/nodegx-node-spec`: `npx jest` (whole package) | **18 suites, 687 passed, 17 skipped, exit 0** (s21: 673) — the three stranger rounds inside it green |
| runtime: `NSP_ONLY=<the five record specs> … conformance.test.ts` | **all five CONFORM**, seed 20728 — Delete 20 / 21 (+1 known, C36), 200 / 200; Add / Remove 18 / 18; Create 23 / 23; Update 30 / 30; every one 200 / 200 |
| runtime deep, `NSP_DEEP=10000` (load ~2–4) | Add / Remove CONFORM; **Delete CONFORMS with 19 attributed to C36**, 34 / 34; Create CONFORMS 40 / 40, Update 92 / 92 (11 and 1 attributed to the old row C6) |
| interpreter mutants, seeds 13, 1, 20728–20731 | Create 40 / 40, Update 78 / 78, Delete 34 / 34 on each |
| runtime: whole `conformance.test.ts -t "NSP-004 / NSP-011 — every"` (load ~3) | **69 passed, 72 skipped, exit 0, 336 s — all 68 specs CONFORM at seed 20728** |
| runtime: `runtime-target.test.ts` + `graph.test.ts` | **2 suites, 86 passed, exit 0** |
| `tsc --noEmit` node-spec, runtime (`tsconfig.json`, includes `test/`) | exit 0 · exit 0 |
| `node scripts/node-spec/census.js --check` | fresh — 147, 33 excluded, all tiered |
| `packages/nodegx-export` node-spec tests, whole runtime `npx jest`, `test:main` | NOT RUN — s22 touched no export code; in the runtime only `test/helpers/node-spec-target.ts` and `test/node-spec/conformance.test.ts` |

## What s22 settled (and where the handoff was wrong)

1. **"A project's schema is world data the seam does not have yet" — wrong.** The runtime registers ANY `prop-<field>`
   on its first write (dbmodelcrudbase.ts :711-725); the schema only decides which ports the editor OFFERS. The spec
   `discover`s any `prop-` port; nothing about schemas entered the world.
2. **The current user** is the LEGACY store's (`CloudStore.instance.currentUserId()` → the session under
   `Parse/<cloudservices appId>/currentUser`), whichever backend the record goes to → world USER (`backend.user`). The
   handoff said "measure where the user comes from before speccing" — done. **Unmeasured lead** (NSP-014 §6.4 end): a v2
   NodeGX backend with its own `auth.publicToken` and no `cloudservices` may sign users in under a key the rules never
   read. Measure before filing.
3. **Update Record is two nodes** (`Store to`): cloud has the Class pre-flight; local has none and mints before its
   guard. Only If Unchanged needed the contract's `error(message, detail)` → the world's answer grew `detail`.
4. **The deep run earns its keep:** s21's Delete Record conformed at 200 and 20 scenarios; at 10,000 it diverged 19
   times — a REAL defect (C36: the success reads the Id binding live). And the stand-in had been wrong about a throw in
   a success callback (unhandled rejection; the REST adapter turns it into `error`). **Deep-run every new spec before its
   handoff**, as s19 said.
5. **A known-row predicate first written narrow caught 18 of 19:** a later failure in the same frame OVERWROTE the
   throw's Error text before the settle recorded it. Read the unshrunk sequence (regenerate it: `generateSequence(spec,
   runSeed, index)` with the index whose `sequenceSeed` matches) before widening, and widen only by the case it shows.
6. **Catalog parity** could not tell a parameter-seeded pattern from a project-seeded one, and probed a list parameter
   with a string. Now: a `proplist` seed is probed with one row; a pattern whose variables name no seed parameter, on a
   node with `seededByProjectMetadata`, must be accepted by `discover`.
7. Seed-dependent kills, a third time: Update's `derived` drop-set {accessControl} lived at seed 13 once `derived.inputs`
   drew the rule ports. A hand scenario kills it; both new specs read every mutant killed on six seeds.

## What s23 does

- **Continue NSP-014 — Record (`DbModel2`, fetch) next, then Query Records (`DbCollection2`, 1,513 lines; the neutral
  filter; state that the legacy `where` translation is out of reach) and Filter Records (T1, over the store).** Add
  `fetch` / `query` to `BACKEND_OPS` from RestDataAdapter.ts (read what each hands `success`, which event after). Probe
  first (`zz-` file in `packages/noodl-runtime/test/node-spec/`), as s21 and s22 did: questions on the runtime before a
  spec line. Record and Query Records WATCH the store's events — the first record specs with a `world.change`-like
  reaction to another node's write; a graph scenario (Create → Query Records) is the natural AC.
- **Cheap, alongside, on a QUIET box only** (`uptime` first): the deep runs s20 listed (clock-driven specs under T9, Pop
  Component Stack, s11–s14 at `NSP_DEEP=10000`); the 200-gate on seeds 20729 / 20730.
- **NSP-009 the ratchet** is still the small protective alternative.

**Human decisions outstanding:** rows to ask, in plain words (README §7 has them written): **C27 + C29 together** (one ruling:
"hand a copy"), then **C30**, **C26**, **C24**, C31, C32, C28, C25, D20, D21; then C22, D19, C11, C12, C15, C16, C20, C7, D14,
D16; **the Record family: C34 (meets an author first), C36, C35, C33** (`node scripts/bugs.js --from P107`); R7; R8; R4's
confirmation; G1.

## Before you start

- Shared checkout: pathspec commits through a temporary index (`GIT_INDEX_FILE=…; git read-tree HEAD; git add <mine>;
  commit-tree; update-ref <branch> NEW OLD`), then `git reset -q -- <mine>`. Never `git add -A`, never `git stash`; one heavy
  job at a time — `uptime` before any deep run. The `/next` state file belongs to P108's workstream — do not overwrite it.
- Throwaway probes go in `packages/noodl-runtime/test/node-spec/zz-*.test.ts`, deleted in the same command. The play sinks
  `console.*` — print with `process.stdout.write`. To probe an operation the seam does not know yet, patch
  `RestDataAdapter.prototype.<op>` in the probe file (s22's probes did exactly that for `create` / `save`).
- `tiers.json` is hand-kept and line-per-node: edit it TEXTUALLY, then `node scripts/node-spec/census.js`.
- A spec behaviour change is a version; an ADDITIVE format change needs the hashes
  (`node -e "require('./tests/stranger-suite-hashes.helper.js').write()"`, check the diff names only what you touched) and
  the three rounds green.
- A scenario's `row` means KNOWN TO FAIL on the runtime. A runtime throw is not written into a spec: the spec states the
  sensible reading and the runtime's is a known row with a narrow predicate (C24, C25, C36).
