# P107 — next session

**Written 2026-10-01 (end of s12).** Read the [README](README.md) §2–§7 (**R7, R8 asked; C17 is the row to ask
first** — under "Also for a ruling, the time batch's rows"; C12–C15 under the T4 half's; C9–C11, D13 under the
second batch's; C7, C8, D10–D12 under the world's; R4's caveat stands), then [NSP-013 §6.1b](NSP-013-BATCH-DATES-PARSERS-UTILITIES.md)
(the four parsers, C17, and T4–T8 — the harness holes a real seed rotation exposed), and §6.4 for what is left.

## Board (from the task files)

| task | built | driven | committed |
|---|---|---|---|
| NSP-000 the census | ✅ s1 | n/a | `3bd71e837` |
| NSP-001 the spec + interpreter | ✅ s1 … s11; **s12: `Clock.nextDue()` (world.ts; the CLOCK rule now says what each timer delivers lands before the next fires)** | n/a | s1 … s12 |
| NSP-002 traces + adapter + runtime target | ✅ s2 … s11; **s12: the runtime target fixed four ways — frame time reset per play (T5), `advance` steps timer by timer (T6), teardown finishes and empties the context's queues (T7), the console goes to a sink during a world play (T8); `NSP_SEED`; the C17 seam (jest.mock of stream-parsers.ts)** | n/a | s2 … s12 |
| NSP-003 the runner | ✅ s2 … s11; **s12: `sequenceSeed` mixes the run seed first — the daily rotation is real (T4); "known rows still fire" is per row: hand scenario OR generated** | n/a | s2 … s12 |
| NSP-004 the pilot five | ✅ s3 | n/a | `ef6f3b6e1` |
| NSP-005 the export adapter | ✅ s6, s7, s10, s11 — untouched in s12 | n/a | — |
| NSP-006 the stranger | ✅ rounds 1, 2. **Round 3 due SIX times over now** (graphs s7, world s8, registry s9, tree s10, zone + digest s11, the clock's between-timers rule s12) | n/a | — |
| NSP-007 the world | ✅ s8, s11; s12: `nextDue` — AC1's export half ✗ | n/a | s8, s11, s12 |
| NSP-008 the graph | ✅ s7, s9, s10 — untouched | n/a | — |
| NSP-011 the first batch | ✅ s4, s5; AC2 ⏳; s12: String Mapper +1 scenario; **Boolean To String spec v2** (the same-value guard s4 dropped) | n/a | s12 |
| NSP-012 the second batch | 🟡 s9 + s10; s12: +10 scenarios / marks (Clear / Remove / Insert Array, Object ×6, Set Object Properties), Clear Array 1 equivalent declared; **Object spec v2** (the reaction to its own `Model.create` write) | n/a | s12 |
| NSP-013 the time batch | **🟡 16 of 24** — s11's 12 + s12's JSON Stream Parser, Pattern Extractor, Text Accumulator, Stream Buffer. Left (§6.4): Parse XML, Parse Feed, Animate To Value, States, Screen Resolution, On App Error, AC2, the deep run | n/a | s11, s12 |
| NSP-020 ports without a viewer | rows only: 10 of 68 | — | — |
| NSP-009, NSP-010, NSP-014 … NSP-019, NSP-021 | — | — | — |

**62 of 147 conform on the runtime** (T1 46/46, T2 7/11, T3 1/39, T4 12/27; 1 exempt). Catalog parity: 50.

## Gate readings (2026-10-01, s12, after the last fix — see the T4 commit's message for the final sweep)

| gate | reading |
|---|---|
| `cd packages/nodegx-node-spec && npx jest` | **16 suites, 546 passed, 12 skipped** |
| `npx tsc -p packages/nodegx-node-spec/tsconfig.json --noEmit` · `… noodl-runtime …` | exit 0 · exit 0 |
| `cd packages/noodl-runtime && npx jest test/node-spec` | **3 suites, 124 passed, 50 skipped, exit 0** on today's seed; `NSP_SEED=<n> npx jest test/node-spec/conformance.test.ts` exit 0 on the seeds named in the commit |
| `cd packages/nodegx-export && npx jest tests/node-spec-conformance.test.ts tests/node-spec-graph.test.ts` | **12 passed, 2 skipped** |
| interpreter mutant sweep, every spec × 20 seeds (a throwaway, deleted) | 2 survivors → 1 scenario, 1 declared equivalent; 0 left |
| `npm --prefix packages/noodl-editor run test:main` | NOT RUN (nothing this phase touches is in it) |

## What s12 settled

1. **C17 — JSON Stream Parser freezes the app on a stray `}`** (Stream; Single also `]` `,`): the scanner never
   advances. Proved in a worker with a deadline; graded through an in-memory copy of stream-parsers.ts with one
   inserted throw. The first runtime run spun seven minutes before it was stopped. **A hang cannot be a
   divergence — turn the loop into a throw in a copy, never on disk.**
2. **T4: the daily rotation was nearly one corpus** — adjacent days shared 192/200 sequences; 30 days = 429
   distinct. Every "conforms" s2–s11 was read on ~one set of sequences. Fixed; the fix exposed nine mutants
   killed by luck (each now has a scenario), a wrong s4 spec (Boolean To String → v2), an incomplete s9 spec
   (Object → v2), C6 on Object, Variable and HTTP's Headers (and a C6 fallback on any
   port, counted, never asserted), and the four runtime-target holes T5–T8.
3. **A divergence that vanishes on a fresh target is the harness, not the node** (T5, T7). One that appears ONLY
   on the first play of a fresh target is something the host does once (T8). The cheap check: play the generated
   sequence as a scenario on a fresh target, then the same scenario twice.
4. **Mutants are interpreter-side** — sweeping many seeds for luck-killed mutants is cheap there; the runtime suite
   is the expensive way to find them.
5. The s11 handoff's readings were right; what was wrong was how much ground they covered (T4).
6. **Expect a red day.** The rotation now explores ~200 new sequences daily; every seed s12 tried beyond the
   first few found SOMETHING until the last ones (luck-killed mutants, then two spec gaps). A red run is a
   finding: reduce it (fresh target → shrink by dropping steps/params → `Math.random` stack if ids differ), never
   widen a predicate to make it green.

## ⚠️ The checkout, as s12 found and left it

- **Root `package.json` is STILL the peer's stray Nightbook (TPL-011) manifest** — `npm run <anything>` at the root
  fails. Use each package's own `npx jest`.
- Peers' open edits in `packages/nodegx-export` (P18) and elsewhere; s12 committed only its own files by pathspec.

## Rulings — R1 R2 R3 R5 R6 ruled; R4 taken as (a) (confirm); **R7 and R8 asked**; rows C2–C17, D1–D15, G1 open; T3–T8 closed by their fixes; E1–E6 are phase 18's

In plain words, the rows an author meets first: **C17** (*"one stray `}` from an agent stream freezes the whole
app, for good"* — one line, ships alone), **C11**, **C12**, **C15**, **C16**, then C7 and D14.

## What s13 does

- **NSP-013's last six**: Parse XML / Parse Feed first (find the runtime's XML parser; pure T1), then Animate To
  Value (Repeat's timer pass + `easecurves.ts` + `onRunning` — the clock now steps timer by timer on the runtime
  target), then decide States / Screen Resolution / On App Error (each a session or a format decision — a viewport
  seam, an error-stream seam).
- **Or NSP-015** (14 T4, the component boundary; Run Tasks closes with it).
- **Cheap, alongside**: the deep run (`NSP_DEEP=10000 NSP_ONLY=…`, quiet box, one batch at a time) — with T4 fixed
  it now explores new ground; a `drop-after` mutant.
- **The third stranger round** (due six times): `src/world.ts`, `src/registry.ts`, `src/graph.ts`,
  `src/runner/compare.ts` join `FORMAT_FILES`. Candidate: the four agent parsers from stream-parsers.ts's header +
  the scenarios alone — C17 is exactly what a stranger's scanner must NOT reproduce.
- **If C17 is ruled "fix it"**: one line in stream-parsers.ts (`i = end > i ? end : i + 1`), the jest.mock seam's
  anchor then fails loudly — drop the seam, the KNOWN_ROWS entry, the two scenarios' `row` marks and the spec's
  marked line, same commit.

**Human decisions outstanding:** C17 (first); R7; R8; R4's confirmation; rows C2–C16, D1–D15, G1; the stray root
`package.json`.

## Before you start

- **Every new row also gets a file in the common bug ledger** (`dev-docs/bugs/`, rules in its README; `node
  scripts/bugs.js` lists them). P107's 32 open rows are there as `P107-<row>`, all `needs-ruling`. When a row is
  ruled and fixed, set its ledger file to `status: fixed` + `commit:` in the fix's commit.

- Shared checkout: pathspec commits, never `git add -A`, never `git stash`, one heavy job at a time (the runtime
  node-spec suite ~100 s; each extra seed ~75 s). `uptime` first.
- **Throwaway probes go in `packages/noodl-runtime/test/node-spec/zz-*.test.ts` and are deleted in the same
  command** — a peer's suite would pick them up.
- **A JSON scenario file is appended as TEXT when its existing formatting is compact** (`net.noodl.HTTP.json`):
  `json.dumps` of the whole file reformatted 500 lines in s12 before it was caught.
- A `timezone` spec's test file needs the `@jest-environment` docblock; record mode writes `expect` before checking
  claims; the runtime's jest compiles this package under `strict: false` (`v.ok === false`, never `!v.ok`); parallel
  Bash calls share one working directory — absolute paths; `echo =====` is an error in zsh.
