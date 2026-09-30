# P107 — next session

**Written 2026-09-30 (end of s1).** Read the [README](README.md) §2–§5, then [CENSUS.md](CENSUS.md) and
[NSP-001 §5](NSP-001-THE-SPEC-AND-THE-INTERPRETER.md).

## Board (from the task files, not from this table's predecessor)

| task | built | driven | committed |
|---|---|---|---|
| NSP-000 the census | ✅ s1 — `scripts/node-spec/census.js`, `tiers.json`, `census.json`, `CENSUS.md`; planted gaps exit 1 | n/a (a script) | `3bd71e837` |
| NSP-001 the spec + interpreter | ✅ s1 — `packages/nodegx-node-spec`, `defineNode(decl).on(reducers)`, Counter spec, 44 tests, `tsc` clean, lerna scope green | n/a | s1 commit after `3bd71e837` |
| NSP-002 traces + runtime adapter | — | — | — |
| NSP-003 … NSP-019 | — | — | — |
| NSP-020 ports without a viewer, NSP-021 the second editor | opened s1 (R6) | — | — |

Built-but-undriven: 0 (nothing here is driven in the app until NSP-019).

## Gate readings (2026-09-30, working tree at the NSP-001 commit)

| gate | reading |
|---|---|
| `cd packages/nodegx-node-spec && npx jest` | 3 suites, **44/44**, ~1 s |
| `npx tsc -p packages/nodegx-node-spec --noEmit` | exit 0 |
| `npx lerna run test --scope @nodegx/node-spec` | exit 0 |
| `node scripts/node-spec/census.js --check` | fresh, 147 / 33 excluded |
| `npm --prefix packages/noodl-editor run test:main` | **564 / 565 suites, 8791 / 8792 tests, exit 1, 119 s.** The one red is `tests-unit/exp-013/exportBadge.test.tsx` expecting Parse Feed / Parse XML to be `scheduled`; HEAD's ledger has had them `translated` since P18 commit `fcf68a1c7` (§75, "editor gates owed") — **pre-existing at HEAD, phase 18's to close, not a P107 regression**. Nothing in this phase is read by the editor yet |

## What s1 settled (including where the task files were wrong)

1. **The census corrected the provisional lists** (NSP-000 §6): Aggregate Records is cloud-only (17, not 16);
   Filter Records is T1 (client-side, `filterdbmodelsnode.ts:42`); Open File Picker is T2; "Visual Function" is
   `Logic Builder`; "Repeater Item" is `For Each Actions`. Batch sizes: 13 / 26 / 24 / 41 / 14 / 19 / 5. The
   batch files' node sections are **spliced from `census.json`** — regenerate, don't type.
2. **`defineNode` is curried**, not one literal as §2.1 sketched — for a measured TS 5.9.3 reason (NSP-001 §5,
   memory `key-filtered-mapped-type-collapses-curry`). Don't "simplify" it back.
3. **Coercion is a declared kind** (`js-number` ≠ `typed-number`), eight kinds citing runtime lines (`coerce.ts`).
4. **The trace format groups events between settles** values → signals → outcomes and records a value only on
   change. NSP-002's adapter must group the same way (written into NSP-002 §4, with the `completed`-pulse question).
5. **91 / 147 nodes use the outcome contract; 68 have dynamic ports; 9 cloud-only nodes are named by no test**
   ([CENSUS.md](CENSUS.md) §Phase-level facts). Outcome is the default shape, derived ports are load-bearing.

## ⚠️ The checkout, as s1 found it

- **Root `package.json` in the working tree is a peer's stray Nightbook (TPL-011) manifest** — 8 lines, no
  `scripts`, no `workspaces`, mtime 2026-09-28 19:14, identical in shape to a template's `package.json`; nothing
  running owned it. **`npm run <anything>` at the root fails** until it is restored (`git show HEAD:package.json`
  is the real one). s1 did not revert it (a peer's uncommitted edit) and committed its own edits through the index
  (memory: *commit your delta through a temporary index*). Richard was told in the s1 closing message. If it is
  still there: ask, or if Richard has ruled, `git checkout -- package.json package-lock.json` after `cp` backups.
- `package-lock.json` in the working tree also carries an unrelated `noodl-editor 0.2.4 → 0.3.0` bump (P100's).
- `node_modules/@nodegx/node-spec` is a symlink s1 made by hand (no `npm install` — a Mac install drops other
  platforms' prebuilts). A fresh clone gets it from the lockfile rows s1 added.

## Rulings — all four ruled (a) by Richard at the end of s1 (README §7 has the words)

R1 new package · R2 TS specs, JSON traces · R3 the runtime wins, a divergence is a row · R5 200 sequences per
node in CI, 10,000 locally. Only **R4** (go / no-go after the pilot) remains, asked by NSP-004.

## R6 — the editor is a target (ruled at the end of s1)

Richard: *"make sure that the work in this phase will prepare for a future where even the editor is
exchangeable."* So: every batch row closes on behaviour **and** catalog parity **and** `ports(params)`;
NSP-020 (50 `runtime-discovered` nodes need ports without a viewer) and NSP-021 (the MCP server is the
second editor; the round trip) are the graded form. README §1 third sentence, §4.7.

## What s2 does

1. **NSP-002**: the JSON schema for `TraceEvent` (versioned, `subject` open), the canonicaliser (table-driven:
   `-0`, `NaN`, `Date`, key order, unit object), the `TargetAdapter` interface, and the **runtime adapter** on
   `packages/noodl-runtime/test/helpers/node-harness.ts` — mounting by catalog type name, grouping to the format
   (§4), Counter's trace equal to the interpreter's. Where the runtime adapter lives (in `noodl-runtime/test`, or in
   the spec package with the runtime as a devDependency) is a small decision — the spec package must NOT depend on
   the runtime in `src/`.
2. **NSP-003** the runner — scenarios as JSON files, the in-house seeded generator (no `fast-check`),
   shrinking, mutants per reducer branch following `nodegx-backend-contract/conformance/mutants.ts`.
3. Do not touch `noodl-runtime/src/nodes/` (R3 (a)); a divergence is a row.
4. Keep the parity gate green as specs are added — it is the per-node precondition for NSP-018 and NSP-021.

## Before you start

- Shared checkout: pathspec commits, never `git add -A`, never `git stash`, one heavy job at a time.
- `npm run test:packages` cannot run from the root while the stray `package.json` is there — use
  `npx lerna run test --stream --concurrency 1 --scope @nodegx/node-spec` directly.
