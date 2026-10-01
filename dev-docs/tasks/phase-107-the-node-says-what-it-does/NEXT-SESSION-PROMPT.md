# P107 — next session

**Written 2026-10-01 (end of s11).** Read the [README](README.md) §2–§7 (**R7, R8 asked; the time batch's rows C16,
D14 are under "Also for a ruling, the time batch's rows"; C12–C15 under the T4 half's; C9–C11, D13 under the second
batch's; C7, C8, D10–D12 under the world's; R4's caveat stands**), then [NSP-013 §6](NSP-013-BATCH-DATES-PARSERS-UTILITIES.md)
(the two world seams, the two harness traps, what is built, §6.4 what is not), and whichever task file the board points at.

## Board (from the task files, not from this table's predecessor)

| task | built | driven | committed |
|---|---|---|---|
| NSP-000 the census | ✅ s1 | n/a | `3bd71e837` |
| NSP-001 the spec + interpreter | ✅ s1 … s9; **s11: `run()` installs a world's zone for the play** | n/a | s1 … s11 |
| NSP-002 traces + adapter + runtime target | ✅ s2 … s10; **s11: Repeat joins `VIEWER_NODES`; the conformance test runs under `jest-env-real-process.js` (the real `process.env`)** | n/a | s2 … s11 |
| NSP-003 the runner | ✅ s2 … s10; **s11: the comparison's hole closed — `eventKey` sorts keys at every level (T3); the generator draws a zone per sequence** | n/a | s2 … s11 |
| NSP-004 the pilot five | ✅ s3 — untouched | n/a | `ef6f3b6e1` |
| NSP-005 the export adapter | ✅ s6, s7, s10; **s11: the graph gate's regex lagged s10's "no world to install" reason — red since s10's commit, one line** | n/a | s6, s7, s10, s11 |
| NSP-006 the stranger | ✅ s5 round 1, ✅ s6 round 2; s11 moved `src/spec.ts` (two needs, `WorldPool.timeZones`) → hashes refreshed, both rounds re-graded green under the real comparison. **Round 3 is due FIVE times over** (graphs s7, the world s8, the registry s9, the tree s10, the zone + digest s11) | n/a | s5, s6, s9, s11 |
| NSP-007 the world | ✅ s8; **s11: TIME ZONE and DIGEST seams (`WorldScript.timeZone`, `installTimeZone`, `digestBytes`; `needs: 'timezone' \| 'digest'`)** — AC1's export half ✗ | n/a | s8, s11 |
| NSP-008 the graph | ✅ s7, s9, s10 — untouched in s11 | n/a | s7, s9, s10 |
| NSP-011 the first batch | ✅ s4 at 200, ✅ s5 at 10,000; AC2 ⏳ | n/a | `c1998f2fa`, s5 |
| NSP-012 the second batch | 🟡 s9 + s10 (13 T1 + 12 of 13 T4; AC2 not run; the deep run not run) | n/a | s9, s10 |
| NSP-013 the time batch | **🟡 s11: 12 of 24 — Date Add / Compare / Difference / Parts, Date To String, Now, Hash, Random Bytes, Unique Id, Parse CSV, To CSV, Repeat; 12 / 12 conform on the runtime at 200, every date node in two zones (AC5), byte for byte under a seed (AC6); rows C16, D14, D15, T3. The other 12 in §6.4** | n/a | s11 |
| NSP-020 ports without a viewer | rows only: 10 of 68 dynamic-port nodes have `ports(params)` | — | — |
| NSP-009, NSP-010, NSP-014 … NSP-019, NSP-021 | — | — | — |

Built-but-undriven: 0 (nothing is driven in the app until NSP-019). **58 of 147 conform on the runtime** (T1 42, T2 7,
T3 1, T4 12; 1 exempt). Catalog parity: 46.

## Gate readings (2026-10-01, end of s11, before the commit)

| gate | reading |
|---|---|
| `cd packages/nodegx-node-spec && npx jest` | **16 suites, 529 passed, 12 skipped** (both strangers' deep tests) — was 466 |
| `npx tsc -p packages/nodegx-node-spec/tsconfig.json --noEmit` · `… noodl-runtime …` | exit 0 · the runtime's `tsc` names no node-spec file |
| `cd packages/noodl-runtime && npx jest test/node-spec` | **3 suites, 120 passed, 46 skipped** (the deep run) — 58 / 58 specs CONFORM at 200 under the REAL comparison; known rows C3, C4, C6, C9, C10, C11, C16 all fire; graph 42 / 42 |
| `cd packages/nodegx-export && npx jest tests/node-spec-conformance.test.ts tests/node-spec-graph.test.ts` | **12 passed, 2 skipped**; graph CONFORM — 1 passed, 2 diverged as declared, 1 known, 39 outside, 0 failed of 43 (after the one-line regex fix; red before it since s10) |
| `tests/stranger-suite-hashes.json` | refreshed for `src/spec.ts`; both rounds green |
| `npm --prefix packages/noodl-editor run test:main` | **NOT RUN** (s3's 564 / 565 stands; nothing this phase touches is in it) |

## What s11 settled

1. **The runner's comparison had a hole the size of every object value** (T3): `JSON.stringify(e, keys)` filters
   nested keys too, so a Date, a NaN, a registry array or a unit compared as `{}`. Every "conforms" from s3 to s10 on
   an object-valued port was weaker than it said. Fixed; everything re-graded green — the hole changed no verdict,
   which is luck, not design. **Treat a mutant that survives a scenario whose traces look different as a comparison
   bug first.**
2. **A play runs in the world's zone, never the machine's** — and inside jest that needs the REAL `process.env`
   (`tests/jest-env-real-process.js` + the `@jest-environment` docblock); the sandbox copy swallows the write
   silently. A `node -e` probe proves nothing about jest.
3. **An async host computation becomes deterministic by letting the world answer it** — `crypto.subtle.digest`
   resolved in the microtask after the call; the spec is a frame-end reducer settling `deferred` tokens.
4. **A reducer's `set` names only what it changes.** A spread-everything `set` makes every `drop-set` mutant
   survive or die by accident; the first probe's six survivors were all this.
5. **The s10 handoff was wrong on one gate**: the export graph test read red from s10's commit (its regex lagged
   s10's own reason). Say the test's exit, not the CONFORM line.

## ⚠️ The checkout, as s11 found and left it

- **Root `package.json` is STILL the peer's stray Nightbook (TPL-011) manifest.** `npm run <anything>` at the root
  fails. Eleven sessions have told Richard. Use each package's own `npx jest`.
- `packages/nodegx-export/tests/*.test.ts` and `src/` carry a peer's (P18) open edits; s11's one file there
  (`tests/node-spec-graph.test.ts`, byte-identical to HEAD before the one-line fix) was committed by pathspec.

## Rulings — R1 R2 R3 R5 R6 ruled; **R4 taken as (a) (confirm); R7 and R8 asked**; rows C2–C16, D1–D15, G1 open; T3 closed by its fix; E1–E6 are phase 18's

The rows an author meets first, in plain words: **C11** (Object's `<name> Changed` never fired), **C12** (*"Consume
on a Global event never stopped anything"*), **C15** (*"Dispatch says Done when its one action was refused"*), **C16**
(*"a Unit Date Add does not know kills the node"*), then **C7** (HTTP auth never sent a credential) and **D14**.

## What s12 does

- **NSP-013's second half.** The four agent parsers first (JSON Stream Parser, Pattern Extractor, Stream Buffer,
  Text Accumulator — pure T1 with outcomes, nothing the world lacks; read `streamingLib.ts` in the export beside
  them), then Parse XML / Parse Feed (find the runtime's XML parser first), then Animate To Value (Repeat's timer
  pass plus `easecurves.ts` and `onRunning`). States (1191 lines, dynamic ports), Screen Resolution and On App
  Error (each needs a seam: a viewport with a `resize` step; an error stream with a `raise` step) are each a
  session or a format decision — build the parsers before deciding. **Build; a defect is first only if it blocks an AC.**
- **Or NSP-015** (14 T4) — needs the component BOUNDARY in the format; Run Tasks closes with it.
- **Cheap, alongside**: the deep run for the 12 new nodes and the 13 data nodes (`NSP_DEEP=10000 NSP_ONLY=…`, a
  quiet box, ~15 min a batch); a `drop-after` mutant.
- **The third stranger round is due five times over** (README §5's rule). `src/world.ts`, `src/registry.ts`,
  `src/graph.ts` and `src/runner/compare.ts` join `FORMAT_FILES` then. Candidate: a target for the five date nodes
  from `date-math.ts`'s header + `world.ts`'s TIME ZONE rule + the scenarios alone — the zone rule is the thing a
  stranger in another language must get right by hand.
- **If any row is ruled "runtime bug"**: each fix ships ALONE with the scenario's `row` mark dropped in the same
  commit (C16: one guard in dateadd.ts or datemath.ts; C13: two `for…of` loops; C14: one `notifyQueue()`; C12: the
  global path honours the first `true`; C11: one line in modelnode2.ts). Any edit to the 20 guarded files ⇒ refresh
  `tests/stranger-suite-hashes.json` + re-grade BOTH strangers, same commit.

**Human decisions outstanding:** R7; R8; R4's confirmation; rows C2–C16, D1–D15, G1; the stray root `package.json`.

## Before you start

- Shared checkout: pathspec commits or the temp-index CAS, never `git add -A` at the root, never `git stash`, one heavy
  job at a time (the runtime node-spec suite is ~90 s at 200 for 58 specs; the package suite ~30 s; the deep run is one
  job). `uptime` first; `ps` before believing it.
- `npm run test:packages` cannot run from the root while the stray `package.json` is there — use each package's own
  `npx jest`; `cd packages/noodl-runtime && npx jest test/node-spec` for the runtime side.
- **A `timezone` spec's test file needs the docblock** `@jest-environment ./tests/jest-env-real-process.js` (the
  runtime's: `../nodegx-node-spec/tests/jest-env-real-process.js`), or the zone silently stays the machine's.
- **Record mode writes `expect` BEFORE checking claims** (`NSP_RECORD=1 npx jest test/node-spec/graph.test.ts`): a
  failing claim is a finding or a misread — read the recorded frame before deciding.
- A reducer's `set` names only the keys it changes; a value input a reducer reads comes from `inputs` or from a
  reducer that stored it. A known-row predicate for a throw matches the throw's own message (a bad value can arrive
  as a mount parameter with no `set` event).
- The runtime's jest compiles this package's files under `strict: false` — `v.ok === false`, never `!v.ok`.
- Parallel Bash calls share ONE working directory — absolute paths in every call of a batch; `echo =====` is an error
  in zsh, so separators are quoted.
