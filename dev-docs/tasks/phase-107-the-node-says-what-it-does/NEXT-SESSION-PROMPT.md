# P107 — next session

**Written 2026-10-02 (end of s27).** Read the [README](README.md) §2–§7. s27's record is [NSP-014 §6.19–§6.21](NSP-014-BATCH-DATA-AND-CLOUD.md)
(s26's §6.16–§6.18); the world's AUTH seam is the header of [world.ts](../../../packages/nodegx-node-spec/src/world.ts) (after BACKEND).

## Board (from the task files)

| task | built | committed |
|---|---|---|
| NSP-000 the census | ✅ s1; s21 the `NSP-022` batch | `3bd71e837`, s21 |
| NSP-001 the spec + interpreter | ✅ s1 … s26; **s27: an auth caller hears the landing's STEP (a refused sign-out is a success)** | s1 … s27 |
| NSP-002 traces + adapter + runtime target | ✅; s26 `installAuth`; **s27: T14 (storage in every backend play), `UserService.instance` forwarded to the play's service, Log In / Sign Up / Log Out registered** | s2 … s27 |
| NSP-003 the runner | ✅; s24 `wrapReducers`; **s26 `world.auth` in it** | s2 … s26 |
| NSP-004 the pilot five | ✅ s3 | `ef6f3b6e1` |
| NSP-005 the export adapter | ✅ (s13); plays the latch nodes only | s13, s15 |
| NSP-006 the stranger | ✅ rounds 1, 2, 3, 3b — s27 refreshed the hashes (exactly world.ts), the three rounds green | `fec895706`, s21 … s27 |
| NSP-007 the world | ✅; BACKEND (s21) + `detail` + USER (s22) + `events` (s24) + AUTH (s26) + **`logIn` / `signUp` / `logOut` (s27)**; AC1's export half ✗ | s13, s16 … s27 |
| NSP-008 the graph | ✅ — **76 / 76** (s27: s10, the session moving) | s15, s20, s23 … s27 |
| NSP-010 a change is a version | rows only (two holes, §4) | — |
| NSP-011 / NSP-012 | as s15 | s15 |
| NSP-013 the time batch | 🟡 24 / 24 conform. Left: AC2, the deep run for s11–s14 | s16 |
| **NSP-014 records, users, files, HTTP** | **🟡 14 of 24 — s27: Log In, Sign Up, Log Out; graph s10; row D24** | s8, s21 … s27 |
| NSP-015 navigation + components | 🟡 14 of 14 conform. Left: AC2 (export, P18) | s15 … s20 |
| NSP-020 ports without a viewer | rows only | s20 |
| NSP-022 the cloud-only nodes | 📋 opened s21 (needs a second runtime target, `noodl-viewer-cloud`) | s21 |
| NSP-009, NSP-016 … NSP-019, NSP-021 | — | — |

**96 of 147 conform on the runtime (65.3%)** (T1 46/46 · T2 10/11 · T3 13/39 · T4 27/27; 0 exempt). Graph 76 / 76.

## Commits this session (on `cline-dev`)

- the s27 commit — `logIn` / `signUp` / `logOut` in the world's AUTH (world.ts), the interpreter's auth caller, the runtime
  target (T14, the `UserService.instance` forwarding, three viewer nodes registered), `src/nodes/user-actions.ts` + 29
  scenarios, graph s10 (6), the batch-records gate, hashes, census, ledger D24, NSP-014 §6.19–§6.21, README, this handoff.

## Gate readings

NSP-014 §6.21. In short: Log In, Sign Up, Log Out CONFORM on the runtime at 200 and at 10,000 (first run); interpreter on
seeds 13 and 20728, every mutant killed; graph 87 / 87 tests (76 scenarios) in a FULL record run and in check mode;
package jest 750 passed; both `tsc` exit 0. The WHOLE runtime `test/node-spec/` (all 76 specs + graph + runtime-target): 3 suites,
183 passed, exit 0, 386 s — inside its 600 s `beforeAll` (s26 overran it under load).

## What s27 settled (and where the handoff was right or wrong)

1. **The handoff's landing order was right**, read from RestAuthAdapter.ts before writing: logIn ok → write, `sessionChanged`,
   success, `loggedIn`; logOut → cleared whatever the backend says. What it did not say: a sign-in REPLACES the session
   (no `previous`), a sign-out with nobody signed in makes no request and is Done INSIDE the call, and a sign-up is the
   sign-in's landing (one operation at the contract level; the wire's two requests are the adapter's).
2. **The viewer's user nodes reach `UserService.instance`, not `forScope`** — the runtime target would have made a
   process-wide service inside the first play. Read the node's import before mounting a viewer node that reaches a service.
3. **T14 — a target hole a GRAPH found, not a single-node play:** with nobody signed in at the start the play had no
   storage, so a sign-in wrote nowhere. Single-node plays could not see it (no node read the session back). The graph's
   claims, written before recording, are what caught it — a recorded `expect` alone would have pinned the hole.
4. **Record mode rewrites every graph file**: two came back with `\u2014` → `—` escaping only (parsed equal) — restored
   from HEAD. After a record run, diff and restore any file you did not mean to record.
5. **D24 was a lead from reading, measured before filing** (probe graph, three arms). Its impact is the warning, not the
   access — REST backends ignore per-record ACL; the Parse-wire `nodegx` case is unmeasured.

## What s28 does

- **Request Magic Link, Sign In With** (viewer `user/requestmagiclink.ts`, `user/signinwith.ts`) — `requestMagicLink` and
  `signInWithProvider` join AUTH_OPS. Sign In With navigates away (contract: no `success`; `signInWithProvider` →
  RestAuthAdapter.ts :1369-1464 — discovery request first, then a parked flow and a top-level navigation): read what it
  CALLS first (s18's lesson) — likely the LOCATION seam (`window.location.assign`? check) plus a `backend` event. The return
  leg (`consumeAuthReturn`, the service's constructor) is a page-load path: scope it as a separate slice.
- Then the files (Cloud File, Upload File, Sign File URL, Open File Picker), then WebSocket / SSE / Subscribe To Changes.
- **Cheap, alongside, on a QUIET box only:** the deep runs s20 listed (clock-driven specs under T9, Pop Component Stack,
  s11–s14 at `NSP_DEEP=10000`); the D24 probe on a `nodegx`-type backend (Parse wire) if a target can play it.

**Human decisions outstanding:** rows to ask, in plain words (README §7 has them written): **C27 + C29 together** (one ruling:
"hand a copy"), then **C30**, **C26**, **C24**, C31, C32, C28, C25, D20, D21; then C22, D19 (second half), C11 **with C37**,
C12, C15, C16, C20, C7, D14, D16; the Record family: C34, C36, C35, C33, D22; Query Records: C38, C39, C40 + C41 together;
**Filter Records: C42 (the one an author meets), C44, C43**; **the user nodes: C47 (the one an author meets), C45 + C46 together, C48 (with C11 + C37), C49 (with R7), D23, D24** (`node scripts/bugs.js --from P107`); R7; R8; R4's
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
