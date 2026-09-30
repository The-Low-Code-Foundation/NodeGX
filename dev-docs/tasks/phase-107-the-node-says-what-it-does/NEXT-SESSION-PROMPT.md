# P107 — next session

**Written 2026-09-30 (end of s8).** Read the [README](README.md) §2–§7 (**R7, R8 asked; NSP-007's rows C7, C8, D10–D12 are
under "Also for a ruling, the world's rows"; R4's caveat stands**), then [NSP-007 §5](NSP-007-THE-WORLD.md) (the world: the
three rules every target shares, what grew in the format, the two target holes, the five rows, what is not done and why),
and whichever task file the board points at.

## Board (from the task files, not from this table's predecessor)

| task | built | driven | committed |
|---|---|---|---|
| NSP-000 the census | ✅ s1 | n/a | `3bd71e837` |
| NSP-001 the spec + interpreter | ✅ s1 … s6; **s8: the world — reducers take a `WorldView`, patches carry `after` / `cancel` / `request` / `abort`, `outcome: 'pending'` + world handlers, `init(world)`, `examples`, `worldPool`; outcomes recorded in REPORT order** | n/a | s1 … s6, s8 |
| NSP-002 traces + adapter + runtime target | ✅ s2 … s7; **s8: `advance` and `request` events; `install` / `advance` on the adapter; the runtime target's settle runs `context.update()` (the timer pass) then a drain; a request attributed through the async context; Delay + HTTP Request registered as the viewer registers them** | n/a | `fe9b13cd1`, s5 … s8 |
| NSP-003 the runner | ✅ s2 … s7; **s8: a world per play, the AC5 violation rule, `advance` in the generator / shrinker / reach, world handlers as mutant reducers, `drop-request`** | n/a | `a1b102eb5`, s5 … s8 |
| NSP-004 the pilot five | ✅ s3 — untouched | n/a | `ef6f3b6e1` |
| NSP-005 the export adapter | ✅ s6, s7 — untouched in s8 (still compiles and passes: Counter + Switch conform, graph 1 / 2 / 1 / 10) | n/a | s6, s7 |
| NSP-006 the stranger | ✅ s5 round 1, ✅ s6 round 2; **s8: the four format files changed → hashes refreshed, both rounds re-graded green in the same commit** | n/a | s5, s6, s8 |
| NSP-007 the world | **✅ s8** — clock, randomness, network (`src/world.ts`); Delay, UUID, HTTP Request conform on the runtime at 200, every mutant killed; AC2 ✅ AC3 ✅ AC4 ✅ AC5 ✅; **AC1's export half ✗** (§5.5); the backend seam → NSP-014 | n/a | s8 |
| NSP-008 the graph | ✅ s7 — untouched | n/a | s7 |
| NSP-011 the first batch | ✅ s4 at 200, ✅ s5 at 10,000; AC2 ⏳ (no batch node has an export reach) | n/a | `c1998f2fa`, s5 |
| NSP-020 ports without a viewer | rows only: 5 of 68 dynamic-port nodes have `ports(params)` (HTTP Request's `derived.inputs` is the sixth, unmeasured by the gate) | — | — |
| NSP-009, NSP-010, NSP-012 … NSP-019, NSP-021 | — | — | — |

Built-but-undriven: 0 (nothing is driven in the app until NSP-019). **21 of 147 conform on the runtime** (T1 18, T2 2, T3 1).

## Gate readings (2026-09-30, end of s8, before the commit)

| gate | reading |
|---|---|
| `cd packages/nodegx-node-spec && npx jest` | **14 suites, 359 passed, 12 skipped** (both strangers' deep tests) — was 13 / 323 |
| `npx tsc -p packages/nodegx-node-spec/tsconfig.json --noEmit` | exit 0 |
| `npx tsc -p packages/nodegx-export/tsconfig.json --noEmit` | exit 0 |
| `cd packages/noodl-runtime && npx jest test/node-spec` | **3 suites, 66 passed, 21 skipped** — 21 / 21 specs CONFORM at 200 (Timer 32 / 32 mutants, UUID 2 / 2, HTTP Request 115 / 115); known rows C3, C4, C6 still fire; graph 25 / 25 |
| `cd packages/nodegx-export && npx jest tests/node-spec-conformance.test.ts tests/node-spec-graph.test.ts` | **2 suites, 12 passed, 2 skipped** — unchanged |
| `node -e "require('./tests/stranger-suite-hashes.helper.js').write()"` | refreshed this session (spec.ts, trace.ts, adapter.ts, trace.schema.json moved); rounds 1 and 2 green |
| `npm --prefix packages/noodl-editor run test:main` | **NOT RUN** (s3's 564 / 565 stands; nothing this phase touches is in it) |

## What s8 settled

1. **The world is three rules, not a library.** Clock (moves only on `advance`; Node's timer rule; a settle is a frame AT the
   time), randomness (one seeded stream behind the three JS doors), network (the world is the server; parses no URL; first
   rule answers; an unscripted request fails the play). Both targets get a World from the same script and agree by
   construction. Header of `src/world.ts`.
2. **When things land is the whole difficulty, and the answer is the event loop's.** A timer callback runs at its firing
   (a tie between a timeout and an answer goes to the timeout on every target); an answer is a microtask and lands at
   the next flush; `advance` flushes before AND after the clock moves (the step after an advance sees the node after the
   answer). Two divergences were found by reasoning before any run and are pinned in `tests/world.test.ts`.
3. **A settle is one clock tick.** The runtime target had never run the scheduler's timer pass (`updateDirtyNodes()`, not
   `update()`) — no clock node could have conformed. Fixed; and the second half of the settle is a drain, not a second
   frame, or a Duration-0 Delay finishes in the settle it started (the app takes two frames).
4. **Outcomes in report order** — the one format sentence that changed; 18 / 18 earlier specs and both strangers are
   unmoved (measured), and it is the only order a world-settled outcome can have.
5. **The specs found five rows the tests never graded**, the biggest a dead feature: HTTP Request's authentication
   presets read `inputs.authToken` from a bag the ports fill under `auth-authToken` (C7) — no credential has ever been
   sent. Also: outcomes lost on a non-string URL (C8), Delay's Stop-while-queued says Unchanged and cancels (D10), an
   unparseable body reported as a network error (D11), one abort controller per HTTP node (D12).
6. **AC1's export half is a session, not an afternoon.** Delay / UUID / HTTP Request each need a reach found by a spike
   (plan.ts translates Delay per verb over a `useRef` timer, UUID as a trigger, HTTP in six slices) and the world's
   globals inside jsdom. Said so; not started.
7. **Derived OUTPUTS are not in the format** (HTTP's response mapping). NSP-014 needs them before any record node.

## ⚠️ The checkout, as s8 found and left it

- **Root `package.json` is STILL the peer's stray Nightbook (TPL-011) manifest** (mtime 2026-09-28 19:14). `npm run
  <anything>` at the root fails. Eight sessions have told Richard.
- Peers' uncommitted work all over `git status` (P78, P102, P104, P18's export `src/`, noodl-mcp tests). Nothing in this
  phase's paths was anyone else's (checked per path before the commit). The export graph target is still graded against
  the working tree, i.e. a peer's open exporter edits.

## Rulings — R1 R2 R3 R5 R6 ruled; **R4 taken as (a) (confirm); R7 and R8 asked (README §7)**; rows C2–C8, D1–D12, G1 open; E1–E6 are phase 18's

R8 and R7 in plain words: unchanged from s7 (README §7). New, in plain words, the row an author meets first:
**C7** — *"Bearer, Basic and API-key authentication on HTTP Request have never sent a credential: the presets read a bag
by names the ports never write. Fix it (a behaviour change, shipped alone), or remove the presets?"* Recommendation: fix.
Then **D12** — *"An HTTP Request node keeps one abort controller: when two requests overlap and the first finishes,
Cancel can no longer stop the second. One controller per request?"*

## What s9 does

- **NSP-012 the second batch** (arrays, objects, variables, stores, events — 26; the 13 T4 ones are graph scenarios now).
  Its §3 "model registry" is the shared `Model` / `Collection` store: on the runtime it exists; the interpreter needs the
  SAME datum visible to two instances — the world is where it goes (a fourth seam, `registry`, beside clock / random /
  network). **Build it; a defect is first only if it blocks an AC.** Or **NSP-013** (24 T1/T2: dates, parsers, animation —
  `Now`, `Date Add`, `Random Bytes`, `Unique Id` run on the world as built; `Animate To Value` / `States` need the frame
  tick, which `settle` already is).
- **Cheap, alongside**: the deep run for the three world nodes (`NSP_DEEP=10000 NSP_ONLY="Timer,net.noodl.UUID,net.noodl.HTTP"`,
  a quiet box, ~10 min); an export reach for the four Variables (`value()`); F1 (NSP-006 §5.6) still open; a
  `drop-after` mutant.
- **A third stranger round is due twice over** (README §5's rule — the format grew graphs in s7 and the world in s8). The
  candidate: a spec-level GRAPH engine from CONTRACT.md + the 14 recordings, OR a target for the three world nodes from
  `world.ts`'s header + the scenarios alone (does the header say enough about landing order? §5.6 decisions 1–3 are the
  sentences to hand over). One new sentence per clause the recordings settled.
- **If any row is ruled "runtime bug"**: each fix ships ALONE as a behaviour-change commit; the scenario's `row` mark and
  its `KNOWN_ROWS` entry (or, for C7, the flip of the auth scenario to asserting the header) go in the same commit. Any
  edit to the 20 guarded files ⇒ refresh `tests/stranger-suite-hashes.json` + re-grade BOTH strangers, same commit.
  `src/world.ts` is NOT guarded yet — round 3 is where it joins `FORMAT_FILES`.

**Human decisions outstanding:** R7; R8; R4's confirmation; rows C2–C8, D1–D12, G1; the stray root `package.json`.

## Before you start

- Shared checkout: pathspec commits or the temp-index CAS, never `git add -A` at the root, never `git stash`, one heavy job
  at a time (the runtime node-spec suite is ~20 s at 200; the deep run is one job, ~10 min; the export deep run is 40 s).
  `uptime` first; `ps` before believing it.
- `npm run test:packages` cannot run from the root while the stray `package.json` is there — use each package's own
  `npx jest`; `cd packages/noodl-runtime && npx jest test/node-spec` for the runtime side.
- A world node on the runtime: the target's `install` swaps the GLOBALS (`fetch`, `setTimeout`, `crypto`, `Math.random`,
  `Date.now`) for the play and restores them in `finally`; a test that awaits real time inside a play must use
  `installed.real.setTimeout`. `NSP_RECORD=1` is the graph test's, not this.
- The runtime's jest compiles this package's files under `strict: false` — `v.ok === false`, never `!v.ok`.
- Parallel Bash calls share ONE working directory — use absolute paths in every call of a batch (s7 and s8 both lost a
  command to it).
