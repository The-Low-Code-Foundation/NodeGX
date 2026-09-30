# P107 — next session

**Written 2026-09-30 (end of s6).** Read the [README](README.md) §2–§7 (**R7 is asked in §7, with R4's caveat**), then
[NSP-005 §6](NSP-005-THE-EXPORT-ADAPTER.md) (the spike's finding: the exporter translates graph SHAPES, not nodes; the
REACH; rows E1–E4), [NSP-006 §5.6](NSP-006-A-STRANGERS-TARGET.md) (round 2; the mount-time read; the open format row
F1), and whichever task file the board points at.

## Board (from the task files, not from this table's predecessor)

| task | built | driven | committed |
|---|---|---|---|
| NSP-000 the census | ✅ s1 | n/a | `3bd71e837` |
| NSP-001 the spec + interpreter | ✅ s1 … s5; **s6: `default` = undefined when absent, declared-wins rewritten to one behaviour, afterInputs "every settle, steps or none"** | n/a | s1 … s6 |
| NSP-002 traces + adapter + runtime target | ✅ s2 … s5; **s6: the sampling PROCEDURE in `adapter.ts` (mount is not a sample), the outcome `port` sentence in `adapter.ts` + `trace.ts`** | n/a | `fe9b13cd1`, s5, s6 |
| NSP-003 the runner | ✅ s2 … s5; **s6: `reach` — `src/runner/reach.ts`, `ConformanceOptions.reach`, `outside` scenarios, projected reference, survivors "not graded by this reach", `outsideReducers`; `tests/reach.test.ts` (10)** | n/a | `a1b102eb5`, s5, s6 |
| NSP-004 the pilot five | ✅ s3 — untouched | n/a | `ef6f3b6e1` |
| NSP-005 the export adapter | **✅ s6** — spike §6.1 (the wrapper is deferred for all five; (a) closed, (b) works); `packages/nodegx-export/tests/helpers/node-spec-target.ts` + `tests/node-spec-conformance.test.ts`; **Counter + Switch CONFORM inside their reach at 200 (1.3 s) and at 10,000 (24.5 s + 12.0 s)**; rows E1–E4 → `phase-18-code-export-v2/FROM-P107-NODE-SPEC-ROWS.md`; And / Condition / String Format refused in the exporter's words | n/a | s6 |
| NSP-006 the stranger | ✅ s5 round 1 (five); **✅ s6 round 2 (seven, `stranger-2/`)**: 7 / 7 at 200 and 10,000, 78 / 78 mutants; Inverter right on run 1; one new hole → a sentence; two hand scenarios added (Inverter, Boolean To String) | n/a | s5, s6 |
| NSP-011 the first batch | ✅ s4 at 200, ✅ s5 at 10,000; AC2 ⏳ — no batch node has an export reach yet | n/a | `c1998f2fa`, s5 |
| NSP-020 ports without a viewer | rows only: 5 of 68 dynamic-port nodes have `ports(params)` | — | — |
| NSP-007 … NSP-010, NSP-012 … NSP-021 | — | — | — |

Built-but-undriven: 0 (nothing is driven in the app until NSP-019).

## Gate readings (2026-09-30, end of s6, before the commit)

| gate | reading |
|---|---|
| `cd packages/nodegx-node-spec && npx jest` | **12 suites, 289 passed, 12 skipped** (both strangers' deep tests) — was 11 / 262 |
| `npx tsc -p packages/nodegx-node-spec/tsconfig.json --noEmit` | exit 0 |
| `npx tsc -p packages/nodegx-export/tsconfig.json --noEmit` | exit 0 (this is the gate the editor's `test:ci` webpack would otherwise be) |
| `cd packages/nodegx-export && npx jest tests/node-spec-conformance.test.ts` | **6 passed, 2 skipped**; Counter and Switch CONFORM at 200 inside `EXPORT_REACH` |
| `NSP_DEEP=10000 npx jest tests/node-spec-conformance.test.ts -t deep` (export) | **2 / 2 CONFORM at 10,000**, 39 s, exit 0 |
| `cd packages/noodl-runtime && npx jest test/node-spec` | 2 suites, **38 passed, 18 skipped** — the two new scenarios fire on the runtime |
| `npx jest tests/stranger.test.ts` (package) | 29 passed, 12 skipped — both rounds |
| `npm --prefix packages/noodl-editor run test:main` | **NOT RUN** (s3's 564 / 565 stands; nothing this phase touches is in it) |

## What s6 settled

1. **The exporter translates graph shapes, not nodes.** The task file's every-port wrapper is deferred for all five pilot
   nodes, each with its own sentence; the one shape that emits running code is the latch (literal params, element events,
   a callback prop). "(a) without React" is closed for every pilot node — the latch is a `useState`. So the adapter
   grades inside a declared **reach**, and the mutants the reach cannot see are printed as the honesty number.
2. **The reach is a runner feature, not an adapter change** — no guarded file moved for it. A target with full reach
   passes nothing and nothing changes (the generator's pinned digest holds).
3. **Four export/runtime rows, none fixed here**: literals-only params (E1), a non-numeric Start Value counts from 0 in the
   export and NaN in the app (E2), `-0` → `0` (E3), a Switch's Start State read `=== true` vs truthiness (E4). Routed
   to phase 18 in a NEW file (its README, ledger and EXP-011 all carry a peer's open edits — not touched).
4. **The stranger's second round held the §5.4 fix** (Inverter right first time) and found the next frame under it: the
   first-settle read is AT the settle, never at mount. The sampling rule is now a procedure sentence in `adapter.ts`.
5. **F1, open for the format** (NSP-006 §5.6): the interpreter samples every output at EVERY settle; the runtime target
   reads unsent getters at the FIRST settle only. Indistinguishable on all 18 specs; a `send: []` step that changes a
   still-defined output would tell them apart. NSP-001 / NSP-018 decide which sentence the format means (the runtime's
   is the safer reading).
6. **NSP-005 AC4 does not apply as written** — the parity test's scenario drives synthetic test-only nodes with no spec.
   Said so in §6.5 rather than faked.
7. The rounds table lives in `tests/stranger-suite-hashes.helper.js` (plain JS) so a lab copy edits ONE line to point
   its round at `stranger/`; `stranger.test.ts` loops over the rounds. Twenty guarded files, one hash file.

## ⚠️ The checkout, as s6 found and left it

- **Root `package.json` is STILL the peer's stray Nightbook (TPL-011) manifest** (mtime 2026-09-28 19:14). `npm run
  <anything>` at the root fails. Six sessions have told Richard.
- Peers' uncommitted work all over `git status` (P78, P102, P104, P18's export `src/` and tests, noodl-mcp tests, 28
  worktrees). Nothing in this phase's paths was anyone else's; committed through the temp index with compare-and-swap.
  ⚠️ `packages/nodegx-export/src/analyze/plan.ts` and `emit/*.ts` carry a PEER's open edits — the export target was
  graded against the working tree, i.e. the peer's version of the exporter; if a row moves after their commit, that is why.

## Rulings — R1 R2 R3 R5 R6 ruled; **R4 taken as (a) (confirm); R7 asked (README §7)**; rows C2–C6, D1–D9 open; E1–E4 are phase 18's

R7 in plain words: *"If a wire ever carries a size with a unit into a port, that port turns every later plain value into a
size with that unit, for ever — a Value Changed fires on a repeated 2 because of it. Is that a rule every target must copy,
or a runtime quirk to narrow to the ports that declare units?"* Recommendation (a): narrow it.

And the rows an author meets first: **C5** (*a Variable ignores a first value of 0 — fix the seed?*), **D8** (*Color
Blend shows `#NaNNaNNaN` for a non-numeric blend — guard it?*), **C4** (*four `.toString()` setters throw on null*).

## What s7 does

- **NSP-007 the world** (fake clock, seeded random, scripted network, scripted backend) — the gate for T2/T3 and for
  NSP-013 / NSP-014; the runner refuses a spec with `needs` today. Or **NSP-008 the graph** (CONTRACT C1–C11 as graph
  scenarios on every target) — NSP-012 waits on it, and the two graph behaviours the runtime target deliberately does not
  reproduce (C8 consolidation, `inputPriority`) belong to it. **Build one; a defect is first only if it blocks an AC.**
- **Cheap, alongside**: give the four Variables an export reach (the exporter lifts them to `value()` — the one shape
  reachable without React; NSP-011 AC2 starts there); settle F1 with one sentence in NSP-001's format files and a test
  that pins it; NSP-018 owns the rule-before-citation sweep.
- **If any row is ruled "runtime bug"**: each fix ships ALONE as a behaviour-change commit; its scenario's `row` mark and
  its `KNOWN_ROWS` entry go in the same commit. Any edit to the 20 guarded files ⇒ refresh
  `tests/stranger-suite-hashes.json` + re-grade BOTH strangers, same commit.
- **A third stranger round** only when the format grows again (README §5's rule) — the next candidate is a node with
  `deferred` outcomes (a Variable's Set) beside the seven.

**Human decisions outstanding:** R7; R4's confirmation; rows C2, C3, C4, C5, C6, D1–D9; the stray root `package.json`.

## Before you start

- Shared checkout: pathspec commits or the temp-index CAS, never `git add -A` at the root, never `git stash`, one heavy job
  at a time (the runtime deep run is one, ~8 min; the export deep run is 40 s; a stranger's deep is 18 s; `test:main` is
  one). Check `uptime` first — s6's box read load 6–9 from system daemons, not test runners; `ps` before believing it.
- `npm run test:packages` cannot run from the root while the stray `package.json` is there — use each package's own
  `npx jest`; `cd packages/noodl-runtime && npx jest test/node-spec` for the runtime side.
- A spike script in the scratchpad needs `node_modules` symlinked beside it (`ln -s <repo>/node_modules <scratch>/spike/`)
  and runs with `npx ts-node -T --project packages/nodegx-export/tsconfig.json <file>` from the export package.
- The runtime's jest compiles this package's files under `strict: false` — `v.ok === false`, never `!v.ok`.
- A stranger's lab: NSP-006 §5.1 + the brief files (a copy, no `.git`, `node_modules` symlinked, the root `tsconfig.json`
  two levels up, the helper's ROUNDS trimmed to one round pointing at `stranger/`).
