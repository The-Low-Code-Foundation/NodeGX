# P107 — next session

**Written 2026-10-02 (end of s26).** Read the [README](README.md) §2–§7. s26's record is [NSP-014 §6.16–§6.18](NSP-014-BATCH-DATA-AND-CLOUD.md);
the world's twelfth seam, AUTH, is the header of [world.ts](../../../packages/nodegx-node-spec/src/world.ts) (after BACKEND).

## Board (from the task files)

| task | built | committed |
|---|---|---|
| NSP-000 the census | ✅ s1; s21 the `NSP-022` batch | `3bd71e837`, s21 |
| NSP-001 the spec + interpreter | ✅ s1 … s25; **s26: `WorldView.session` / `userService`, `world.auth`; a write made elsewhere reaches the registry whoever listens** | s1 … s26 |
| NSP-002 traces + adapter + runtime target | ✅; **s26: `installAuth` — a fresh real `UserService` per play, the REST auth adapter's two operations stood in** | s2 … s26 |
| NSP-003 the runner | ✅; s24 `wrapReducers`; **s26 `world.auth` in it** | s2 … s26 |
| NSP-004 the pilot five | ✅ s3 | `ef6f3b6e1` |
| NSP-005 the export adapter | ✅ (s13); plays the latch nodes only | s13, s15 |
| NSP-006 the stranger | ✅ rounds 1, 2, 3, 3b — s26 refreshed the hashes (exactly spec.ts, world.ts), the three rounds green | `fec895706`, s21 … s26 |
| NSP-007 the world | ✅; BACKEND (s21) + `detail` + USER (s22) + `events` (s24) + **AUTH (s26)**; AC1's export half ✗ | s13, s16 … s26 |
| NSP-008 the graph | ✅ — 70 / 70 | s15, s20, s23 … s25 |
| NSP-010 a change is a version | rows only (two holes, §4) | — |
| NSP-011 / NSP-012 | as s15 | s15 |
| NSP-013 the time batch | 🟡 24 / 24 conform. Left: AC2, the deep run for s11–s14 | s16 |
| **NSP-014 records, users, files, HTTP** | **🟡 11 of 24 — s26: User, Set User Properties; rows C45–C49, D23** | s8, s21 … s26 |
| NSP-015 navigation + components | 🟡 14 of 14 conform. Left: AC2 (export, P18) | s15 … s20 |
| NSP-020 ports without a viewer | rows only | s20 |
| NSP-022 the cloud-only nodes | 📋 opened s21 (needs a second runtime target, `noodl-viewer-cloud`) | s21 |
| NSP-009, NSP-016 … NSP-019, NSP-021 | — | — |

**93 of 147 conform on the runtime (63.3%)** (T1 46/46 · T2 10/11 · T3 10/39 · T4 27/27; 0 exempt). Graph 70 / 70.

## Commits this session (on `cline-dev`)

- the s26 commit — the AUTH seam (world.ts, spec.ts, interpreter.ts, mutants.ts, the runtime target), User and Set
  User Properties (specs, 25 + 12 scenarios), the store-write hole, the batch-records and conformance gates, ledger
  C45–C49 + D23, NSP-014 §6.16–§6.18, README, census, this handoff.

## Gate readings

NSP-014 §6.18. In short: User and Set User Properties CONFORM at 200 (two seeds) and at 10,000; every one of the 73 specs
reads CONFORMS (the whole suite overran its `beforeAll` under load — the three unreported re-read alone); package jest
729 passed; both `tsc` exit 0. **A mutant declared equivalent was killed at 10,000** — declarations are hypotheses; the deep
run grades them.

## What s26 settled (and where the handoff was right)

1. **The seam is the operation (R9) plus the SESSION.** The handoff said "find the AUTH contract first" — right: it is
   `IAuthAdapter` (+ `setUserProperties` beside it), and a call is an ordinary `backend` event. What it did not say: a
   user node SHOWS the session, read through the viewer's `UserService`, and every read is a registry write. So the
   world holds sessions, a landing is the REST adapter's ordered steps, and the SERVICE is part of the world (its bridge,
   its read when made, its start-up check). Probe first, with the REAL service and adapter and only HTTP scripted.
2. **The service's start-up check is where the defects are** — C45 (a 503 says Session Lost while signed in: it clears
   the Parse-wire store on a REST project) and C46 (Session Lost twice). C47 (sign-out leaves Email / Username / Id on the
   wires) is CONTRACT C3 meeting `setUserModel(undefined)`.
3. **Loading `userservice.ts` assigns `Services.UserService` process-wide** — the runtime target undoes it at load; the
   service exists only inside a play.
4. **A world write must not depend on who listens** — the interpreter wrote a write made elsewhere only when a store
   listener existed. Fixed; found by mutants only that write could kill.

## What s27 does

- **Log In, Sign Up, Log Out** (viewer, `noodl-viewer-react/src/nodes/std-library/user/`) — `logIn` / `signUp` / `logOut`
  join `AUTH_OPS` (world.ts `landAuth`: logIn ok → write the answer, `sessionChanged`, success, `loggedIn`; logOut →
  REST: cleared WHATEVER the backend says, then success, `loggedOut`; signUp → REST signs in after, read
  RestAuthAdapter.ts :1087-1142 first). Then the graph the user family needs: `s10` — a Log In / Set User Properties
  writing, a User watching (Logged In, the bridge, D23 on the wire, C47 after a Log Out). Record it in a FULL graph run.
- Then **Request Magic Link, Sign In With** (a navigation away — the LOCATION seam), then the files, then WebSocket / SSE /
  Subscribe To Changes.
- **Cheap, alongside, on a QUIET box only:** the deep runs s20 listed (clock-driven specs under T9, Pop Component Stack,
  s11–s14 at `NSP_DEEP=10000`).

**Human decisions outstanding:** rows to ask, in plain words (README §7 has them written): **C27 + C29 together** (one ruling:
"hand a copy"), then **C30**, **C26**, **C24**, C31, C32, C28, C25, D20, D21; then C22, D19 (second half), C11 **with C37**,
C12, C15, C16, C20, C7, D14, D16; the Record family: C34, C36, C35, C33, D22; Query Records: C38, C39, C40 + C41 together;
**Filter Records: C42 (the one an author meets), C44, C43**; **the user nodes: C47 (the one an author meets), C45 + C46 together, C48 (with C11 + C37), C49 (with R7), D23** (`node scripts/bugs.js --from P107`); R7; R8; R4's
confirmation; G1.

## Before you start

- Shared checkout: pathspec commits through a temporary index (`GIT_INDEX_FILE=…; git read-tree HEAD; git add <mine>;
  commit-tree; update-ref <branch> NEW OLD`), then `git reset -q -- <mine>`. Never `git add -A`, never `git stash`; one heavy
  job at a time — `uptime` before any deep run. The `/next` state file belongs to another workstream — do not overwrite it.
- Throwaway probes go in `packages/noodl-runtime/test/node-spec/zz-*.test.ts`, deleted in the same session. The play sinks
  `console.*` — print with `process.stdout.write`. A graph probe: `playGraph(withViewerNodes(runtimeTarget()), scenario)`.
- `tiers.json` is hand-kept and line-per-node: edit it TEXTUALLY, then `node scripts/node-spec/census.js`.
- A spec behaviour change is a version; an ADDITIVE format change needs the hashes
  (`node -e "require('./tests/stranger-suite-hashes.helper.js').write()"`, check the diff names only what you touched) and
  the three rounds green.
- A scenario's `row` means KNOWN TO FAIL on the runtime. A runtime throw is not written into a spec: the spec states the
  sensible reading and the runtime's is a known row with a narrow predicate (C24, C25, C36, C37, C43, C44).
- Deep-run every new spec before its handoff; grade new specs' mutants on two seeds; print two runtime traces before
  trusting a first-run green; **record a graph scenario in a FULL graph run or re-check it in one** (T13: alone ≠ full).
