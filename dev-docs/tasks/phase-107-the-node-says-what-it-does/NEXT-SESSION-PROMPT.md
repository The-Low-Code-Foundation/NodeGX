# P107 — next session

**Written 2026-10-02 (s28).** Read the [README](README.md) §2–§7. s28's record is [NSP-014 §6.22–§6.24](NSP-014-BATCH-DATA-AND-CLOUD.md)
(s27's §6.19–§6.21); the world's AUTH seam is the header of [world.ts](../../../packages/nodegx-node-spec/src/world.ts) (after BACKEND).

## Board (from the task files)

| task | built | committed |
|---|---|---|
| NSP-000 the census | ✅ s1; s21 the `NSP-022` batch | `3bd71e837`, s21 |
| NSP-001 the spec + interpreter | ✅ s1 … s27 | s1 … s27 |
| NSP-002 traces + adapter + runtime target | ✅; s27 T14; **s28: T15 (the user service's GETTERS forwarded to the play's service), Request Magic Link + Sign In With registered** | s2 … s28 |
| NSP-003 the runner | ✅; s24 `wrapReducers`; s26 `world.auth` | s2 … s26 |
| NSP-004 the pilot five | ✅ s3 | `ef6f3b6e1` |
| NSP-005 the export adapter | ✅ (s13); plays the latch nodes only | s13, s15 |
| NSP-006 the stranger | ✅ rounds 1, 2, 3, 3b — s28 refreshed the hashes (exactly world.ts), the three rounds green | `fec895706`, s21 … s28 |
| NSP-007 the world | ✅; … AUTH (s26) + `logIn` / `signUp` / `logOut` (s27) + **`requestMagicLink` / `signInWithProvider`, a backend rule's `times` (s28)**; AC1's export half ✗ | s13, s16 … s28 |
| NSP-008 the graph | ✅ — 76 / 76 | s15, s20, s23 … s27 |
| NSP-010 a change is a version | rows only (two holes, §4) | — |
| NSP-011 / NSP-012 | as s15 | s15 |
| NSP-013 the time batch | 🟡 24 / 24 conform. Left: AC2, the deep run for s11–s14 | s16 |
| **NSP-014 records, users, files, HTTP** | **🟡 16 of 24 — s28: Request Magic Link, Sign In With (the launcher; the return leg = slice B); rows C50, D25** | s8, s21 … s28 |
| NSP-015 navigation + components | 🟡 14 of 14 conform. Left: AC2 (export, P18) | s15 … s20 |
| NSP-020 ports without a viewer | rows only | s20 |
| NSP-022 the cloud-only nodes | 📋 opened s21 (needs a second runtime target, `noodl-viewer-cloud`) | s21 |
| NSP-009, NSP-016 … NSP-019, NSP-021 | — | — |

**98 of 147 conform on the runtime (66.7%)** (T1 46/46 · T2 10/11 · T3 15/39 · T4 27/27; 0 exempt) — counted from 78 specs ×
tiers.json + On App Error + 19 graph-graded T4. Graph 76 / 76.

## Commits this session (on `cline-dev`)

- the s28 commit — `requestMagicLink` / `signInWithProvider` in the world's AUTH (world.ts; no provider refused before the wire;
  a backend rule's `times`), `src/nodes/user-handovers.ts` + 22 scenarios, the user helpers exported from `user-actions.ts`,
  one declared equivalent mutant (D25), runtime target T15 + two viewer nodes registered, batch-records gate, hashes, census,
  ledger C50 + D25, NSP-014 §6.22–§6.24, README, this handoff.

## Gate readings

NSP-014 §6.24. In short: both CONFORM on the runtime first run, on seeds 20728 and 13, and at 10,000; interpreter on seeds 13
and 20728, every mutant killed or declared; the WHOLE runtime `test/node-spec/` 3 suites, 185 passed, exit 0, 387 s (78 specs
CONFORM); package jest 18 suites, 760 passed, exit 0; both `tsc` exit 0.

## What s28 settled (and where the handoff was right or wrong)

1. **The handoff guessed Sign In With would use the LOCATION seam ("`window.location.assign`? check").** Wrong seam: the node
   hands an OPERATION (`signInWithProvider`) and the ADAPTER navigates (`window.location.href = …`, RestAuthAdapter.ts :1436,
   after a discovery request). R9 puts the seam at the operation, so the world plays `signInWithProvider` as an AUTH op whose
   accepted handover lands NOTHING — no LOCATION event.
2. **Request Magic Link is supported on the `nodegx` backend type only**; RestAuthAdapter refuses every REST one in the call
   (`begin` / the empty `magicLink` profile field). The world doesn't play the capability gate — a REST refusal is a script answer.
3. **T15**: s27 forwarded the app singleton's METHODS to the play's service, not its GETTERS — Sign In With reads
   `UserService.instance.oauthReturn`. Fixed. Before mounting a viewer node that reaches a service, list EVERY member it touches.
4. **The return leg was probed, not played (row C50, measured with controls):** a sign-in cancelled at the provider fires
   Failure TWICE (init reads the final state AND hears the deferred event). My first reading — "a report at `initialize`
   reaches no wire" — was WRONG: the late wire catches up (graph c01); a Counter on the wire counted 2. What IS true: the
   runtime target installs its outcome hooks after the node is made, so a mount-time report is OFF the single-node trace —
   **T16, found, not fixed**.
5. **A probe file under `test/` is counted by the census** (`placesWritten`): regenerate the census AFTER deleting probes.

## What s29 does

- **Sign In With slice B — the return leg** (design worked out in s28, not built):
  - world.ts: a backend script `return` — `{ error }` (a provider error: the adapter's state is final at the service's
    construction and the `oauthReturn` event is deferred one tick, `setTimeout(0)` = 1 ms on the clock) or `{ answer, after }`
    (a code: state `inProgress` at construction; the exchange lands — ok: session written, `sessionChanged`, state succeeded
    (+ `notice`), `oauthReturn`, `loggedIn`; failed: state failed with the message or `Sign-in could not be completed.`,
    `oauthReturn`). A scripted return REPLACES the start-up check (userservice.ts :138 returns early). New AuthStep(s): the
    return state, and an `oauthReturn` notice carrying it (AuthNotice grows `state`).
  - interpreter: the notice to `world.auth` listeners; a WorldView read of the return state that queues it as an auth notice
    delivered with the first settle's deliveries (the Router's build-time page params are the precedent) — Sign In With's
    `initialize` calls its own handler with what it read (:86-88).
  - runtime target: FIX T16 first (hook `beginOutcome` / `reportOutcome` / `sendSignalOnOutput` so a report made inside
    `initialize` lands in the first frame); stand in `RestAuthAdapter.prototype.consumeAuthReturn` with the world's return.
  - **The format gap s28 found last (why slice B was not started):** `applyReturn` OPENS an outcome no input invoked
    (`beginOutcome` inside a session handler — signinwith.ts :191-201 calls it "the one place in the phase where something
    other than a port opens an invocation"). Today: the schema says an outcome's `port` IS the invoked input; the
    interpreter's `resolveOpen` throws on an outcome with no pending slot; the runtime target writes a placeholder `'?'`
    (`token.port ?? s.currentInput ?? '?'`, seen in the s28 probe). Decide the port for "no input" (proposed `''` with a
    schema sentence — String Format's `''` port has no outcomes, so no clash), add a patch field for an outcome opened and
    settled at once (e.g. `opens`), teach `runner/mutants.ts` the new field (s24: an unknown field is DROPPED silently),
    and make the target write the same port. spec.ts + the schema + world.ts are guarded — hashes + three rounds, one commit.
  - Sign In With → v2: init reads the return; the `world.auth` handler runs `applyReturn`. C50 is the RUNTIME's behaviour
    (R3 a) — the spec follows it; a scenario named for C50 shows two Failures; the row stays for Richard.
  - The s28 probe is in the session scratchpad only (deleted from the tree): three stub arms copied from the adapter's branches.
  - spec.ts / world.ts are guarded: refresh the hashes, re-grade the three stranger rounds, same commit.
- Then the files (Cloud File, Upload File, Sign File URL, Open File Picker), then WebSocket / SSE / Subscribe To Changes.
- **Cheap, alongside, on a QUIET box only:** the deep runs s20 listed (clock-driven specs under T9, Pop Component Stack,
  s11–s14 at `NSP_DEEP=10000`); the D24 probe on a `nodegx`-type backend (Parse wire) if a target can play it.

**Human decisions outstanding:** rows to ask, in plain words (README §7 has them written): **C27 + C29 together** (one ruling:
"hand a copy"), then **C30**, **C26**, **C24**, C31, C32, C28, C25, D20, D21; then C22, D19 (second half), C11 **with C37**,
C12, C15, C16, C20, C7, D14, D16; the Record family: C34, C36, C35, C33, D22; Query Records: C38, C39, C40 + C41 together;
**Filter Records: C42 (the one an author meets), C44, C43**; **the user nodes: C47 (the one an author meets), C45 + C46
together, C48 (with C11 + C37), C49 (with R7), D23, D24; s28: C50 (Sign In With fires Failure twice on a cancelled sign-in),
D25 (with C47 — "is empty a blank text or nothing")** (`node scripts/bugs.js --from P107`); R7; R8; R4's confirmation; G1.

## Before you start

- Shared checkout: pathspec commits through a temporary index (`GIT_INDEX_FILE=…; git read-tree HEAD; git add <mine>;
  commit-tree; update-ref <branch> NEW OLD`), then `git reset -q -- <mine>`. Never `git add -A`, never `git stash`; one heavy
  job at a time — `uptime` before any deep run. The `/next` state file belongs to another workstream — do not overwrite it.
- Throwaway probes go in `packages/noodl-runtime/test/node-spec/zz-*.test.ts`, deleted in the same session (BEFORE the census).
  The play sinks `console.*` — print with `process.stdout.write`. A graph probe: `playGraph(withViewerNodes(runtimeTarget()),
  scenario)`; a graph `advance` step names a node (`{ node, advance }`).
- `tiers.json` is hand-kept and line-per-node: edit it TEXTUALLY, then `node scripts/node-spec/census.js`.
- A spec behaviour change is a version; an ADDITIVE format change needs the hashes
  (`node -e "require('./tests/stranger-suite-hashes.helper.js').write()"`, check the diff names only what you touched) and
  the three rounds green.
- A scenario's `row` means KNOWN TO FAIL on the runtime. A runtime throw is not written into a spec: the spec states the
  sensible reading and the runtime's is a known row with a narrow predicate (C24, C25, C36, C37, C43, C44).
- Deep-run every new spec before its handoff; grade new specs' mutants on two seeds; print two runtime traces before
  trusting a first-run green; **record a graph scenario in a FULL graph run or re-check it in one** (T13: alone ≠ full).
