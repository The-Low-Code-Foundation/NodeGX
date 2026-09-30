# P107 — next session

**Written 2026-09-30 (end of s5).** Read the [README](README.md) §2–§7 (**R7 is asked in §7, with R4's caveat**), then
[NSP-006 §5](NSP-006-A-STRANGERS-TARGET.md) (the thesis test: what held, the 15 ambiguities, §5.4 the hole), the
stranger's own [`stranger/REPORT.md`](../../../packages/nodegx-node-spec/stranger/REPORT.md), and whichever task file the
board points at.

## Board (from the task files, not from this table's predecessor)

| task | built | driven | committed |
|---|---|---|---|
| NSP-000 the census | ✅ s1 | n/a | `3bd71e837` |
| NSP-001 the spec + interpreter | ✅ s1 — s3 `.on(reducers, { derived?, afterInputs? })`; s4 `outcome: 'deferred'`, `Patch.send`; **s5: the format files now SAY the first-settle baseline, "changed" = canonical, code-unit sort, the mid-frame rule, reducer timing, declared-wins, afterInputs ordering, js-* fallback** | n/a | s1 … s5 |
| NSP-002 traces + adapter + runtime target | ✅ s2 — s3 `PlayError`; s4 last-DEFINED-value; **s5: the schema admits the empty port name (String Format's `{}`)** | n/a | `fe9b13cd1`, s5 |
| NSP-003 the runner | ✅ s2 — s3 known rows; s4 richest example, `formatParams`; **s5: the row-passed reason names the target; `scenarios/README.md`** | n/a | `a1b102eb5`, s5 |
| NSP-004 the pilot five | ✅ s3 — untouched by s5's sentences (same mutant counts 23/26/4/16/2) | n/a | `ef6f3b6e1` |
| NSP-011 the first batch | ✅ s4 at 200; **✅ s5 the deep run: 13 / 13 CONFORM at 10,000, 0 divergences, 0 replays, 496.6 s** (§6.1 deep column; known rows scale: C4 1,932 + 1,350, C6 115 + 91) | n/a | `c1998f2fa`, s5 |
| NSP-006 the stranger | **✅ s5** — green on run 1 at 200 and 10,000; 71 / 71 mutants caught both ways; 15 ambiguities → 14 fixed (sentences + schema + README), 1 = the authoring rule (NSP-018 sweeps); **§5.4: a target reading outputs only at settle passes the five and diverges on Inverter — measured** | n/a | the s5 commit |
| NSP-020 ports without a viewer | rows only: 5 of 68 dynamic-port nodes have `ports(params)` | — | — |
| NSP-005, NSP-007 … NSP-010, NSP-012 … NSP-021 | — | — | — |

Built-but-undriven: 0 (nothing is driven in the app until NSP-019).

## Gate readings (2026-09-30, end of s5, before the commit)

| gate | reading |
|---|---|
| `cd packages/nodegx-node-spec && npx jest` | **11 suites, 262 passed, 5 skipped** (the stranger's deep tests) — was 10 / 249 |
| `npx tsc -p packages/nodegx-node-spec/tsconfig.json --noEmit` | exit 0 |
| `npx tsc -p packages/noodl-runtime/tsconfig.json --noEmit` | exit 0 |
| `cd packages/noodl-runtime && npx jest test/node-spec` | 2 suites, **38 passed, 18 skipped**; all 18 specs conform at 200 |
| the runtime deep run, 13 batch nodes | **13 / 13 CONFORM at 10,000**, 16:25–16:34, load 4–5, exit 0 |
| `NSP_DEEP=10000 npx jest tests/stranger.test.ts -t deep` (package) | **5 / 5 CONFORM at 10,000**, 18 s |
| `npm --prefix packages/noodl-editor run test:main` | **NOT RUN** (s3's 564 / 565 stands; nothing this phase touches is in it) |
| `npx lerna run test --scope @nodegx/node-spec` | not run separately — the package's own `npx jest` above IS that scope's `test` script |

## What s5 settled

1. **The thesis holds at the pilot's size.** A stranger on the session's model, handed 16 files and one test, was green on
   its first run; 5½ minutes, 128 k tokens. The cost of a new target for five T1 nodes is the cost of reading the format.
2. **The isolation that works is a COPY with no `.git`, not a worktree** — a worktree's history recovers every removed file.
   Recipe in NSP-006 §5.1; the brief is NSP-006-BRIEF.md; "which files did you open" is checked against the transcript.
3. **A green stranger is bounded by what the pilot five exercise.** Its engine reads outputs only at settle; that is
   exactly the Inverter divergence of NSP-011 and no pilot node can show it (§5.4, measured with a probe: nothing recorded
   where the interpreter records `value out null`). The next stranger round gets Inverter and Boolean To String beside
   the five. The fixture is NOT patched (AC4: a fixture nobody but the suite edits).
4. **The format's rules must be stated where a target's author can read them.** Four rules lived only in citations
   (`node.ts :555-565`, the `send` docblock, `scenario.ts`) — now sentences in `adapter.ts` / `trace.ts` / `spec.ts` /
   `coerce.ts` / `scenarios/README.md`, and the authoring rule in `spec.ts`'s header: the rule in plain words first.
5. **The schema disagreed with the spec on the port named `''`** — found twice independently (this session's "every trace
   validates" gate; the stranger ten minutes later). A phase-own defect, fixed in three places, no ruling needed.
6. **Guarded files change by design.** `tests/stranger-suite-hashes.json` is refreshed in the same commit as any edit to
   the 16 files (`node -e "require('./tests/stranger-suite-hashes.helper.js').write()"`), and the stranger re-graded.
7. **Parallel edits to one file race; a perl one-liner can prepend to every line.** Both bit this session (schema.ts was
   restored from HEAD). Python with `assert old in s` for multi-edit files; the Edit tool for one.

## ⚠️ The checkout, as s5 found and left it

- **Root `package.json` is STILL the peer's stray Nightbook (TPL-011) manifest** (mtime 2026-09-28 19:14). `npm run
  <anything>` at the root fails. Five sessions have told Richard.
- Peers' uncommitted work all over `git status` (P78, P102, P104, noodl-mcp tests, a deleted `templates/planner-demo`,
  28 worktrees). Nothing in this phase's paths was anyone else's; committed through the temp index with compare-and-swap.

## Rulings — R1 R2 R3 R5 R6 ruled; **R4 taken as (a) (confirm); R7 asked (README §7)**; rows C2–C6, D1–D9 open

R7 in plain words: *"If a wire ever carries a size with a unit into a port, that port turns every later plain value into a
size with that unit, for ever — a Value Changed fires on a repeated 2 because of it. Is that a rule every target must copy,
or a runtime quirk to narrow to the ports that declare units?"* Recommendation (a): narrow it. The deep run makes the
cost visible: C6 fires 115 + 91 times in 10,000 on two nodes, and every `*` / `number` port inherits it.

And the rows an author meets first: **C5** (*a Variable ignores a first value of 0 — fix the seed?*), **D8** (*Color
Blend shows `#NaNNaNNaN` for a non-numeric blend — guard it?*), **C4** (*four `.toString()` setters throw on null*).

## What s6 does

- **NSP-005 the export adapter** — the other half of "does it make targets swappable?", now the only unbuilt one of the
  pair. The spike first (§3.1): String Format and Condition compile away, so the adapter runs a COMPONENT; the mismatch
  between a node trace and a compiled component is the finding. Export mismatches route to P18.
- **Or the second stranger round, small:** hand the SAME lab recipe Inverter + Boolean To String + the five (the batch
  scenarios exist) and see whether the sentences written this session are enough for a fresh agent to get the mid-frame
  rule right — the direct test of §5.4's fix. Half a session; do it before NSP-005 if the box is quiet and NSP-005's spike
  would want the runtime anyway.
- **If any row is ruled "runtime bug"**: each fix ships ALONE as a behaviour-change commit; its scenario's `row` mark and
  its `KNOWN_ROWS` entry go in the same commit (the "still fires" test goes red otherwise — on purpose). For a pilot spec
  or scenario that changes, refresh the stranger hashes in the same commit and re-grade the stranger.
- **NSP-012 (arrays, objects, stores, events)** depends on NSP-008 (the graph); do not start it before NSP-008.
- **NSP-018** owns the sweep of the five specs' comments to rule-before-citation (NSP-006 §5.3 item 15).

**Human decisions outstanding:** R7; R4's confirmation; rows C2, C3, C4, C5, C6, D1–D9; the stray root `package.json`.

## Before you start

- Shared checkout: pathspec commits or the temp-index CAS, never `git add -A` at the root, never `git stash`, one heavy job
  at a time (the runtime deep run is one, ~8 min; the stranger's deep is 18 s; `test:main` is one). Check `uptime` first.
- `npm run test:packages` cannot run from the root while the stray `package.json` is there — use the package's own `npx
  jest`, and `cd packages/noodl-runtime && npx jest test/node-spec` for the runtime side.
- Parallel tool calls race the working directory on this harness: use absolute paths in every command.
- The runtime's jest compiles this package's files under `strict: false` — `v.ok === false`, never `!v.ok`, on a
  discriminated union, and a narrowed PROPERTY does not stay narrowed: copy it to a local (canonical.ts `revive`).
- A stranger's lab: NSP-006 §5.1 (a copy, no `.git`, `node_modules` symlinked, the root `tsconfig.json` two levels up).
