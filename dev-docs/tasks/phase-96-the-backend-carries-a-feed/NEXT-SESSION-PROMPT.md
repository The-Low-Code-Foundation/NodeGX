# Phase 96 — next session

Shaped per [PHASE-EXECUTION.md §3](../../guidelines/PHASE-EXECUTION.md): the board, the next task,
the end condition, the register.

## 1. The board (re-derived from the task FILES, 2026-09-19 after s5)

| task | state |
|---|---|
| FED-001 Parse XML / Parse Feed | ✅ **CLOSED (s1).** Six ACs green; bundle delta +14.8 KB gzipped vs a 50 KB budget |
| FED-002 Indexes a collection declares | ✅ **CLOSED (s2).** Seven ACs green; 40 specs; `EXPLAIN QUERY PLAN` names the index and 20k rows answer in 0.04 ms against a control's 8.92 ms |
| FED-003 A function calls a model | ✅ **CLOSED (s3).** Nine ACs green; 24 specs across two suites |
| FED-004 A schedule does not trip over itself | ✅ **CLOSED (s4).** Seven ACs green; 26 specs across three suites; `nodegx-backend` WHOLE at 149/149 suites / 1758 tests |
| FED-005 A backend speaks MCP | ✅ **CLOSED (s5).** Eight ACs green; 39 specs across three suites, one of them driven by the OFFICIAL MCP TypeScript client; `test:main` 508/508 suites / 8103 tests. **It did not grow past the phase** — ruling R3's "liftable into 97" was not needed, and R3 asked to be told either way |
| FED-006 The drive | ⬜ never built — **the last task in the phase** |

**All four rulings are in** (README §4). **Nothing is gated on a ruling.**

⚠️ **One thing s5 owes you and could not do: the `nodegx-backend` WHOLE run.** A peer held an
Electron editor on CDP 9222 for the entire session and the box sat at load 7–11.
`tests/ac2-page-editor-drag-drive.test.ts` drives a real editor, and s4's own correction says the
historical "it hangs forever" report was almost certainly a peer holding that port — so running
it would have measured contention, not the package. **Do it first, on a quiet box:** check no
peer is driving an editor, budget ten minutes, `npx jest --maxWorkers=2` in
`packages/nodegx-backend`, and read the duration with `time` (macOS has no `timeout`). s5 ran the
15 suites its changes could reach (165 tests, green) and `test:main` in full.

## 2. The next task to build

**FED-006 — the drive, end to end.** It is the phase's close condition (README §8) and the only
thing between here and done.

**Read first, in this order:**

1. 🔴 **README §8, which is the pass/fail condition and is stricter than the task file.** Two
   fixture feeds (one RSS 2.0, one Atom) polled by a schedule, items landing once each in `Item`
   under a unique index, each tagged by a model call with a key from `secrets.json`, readable by
   a session user **and** by an API key, **and readable through `/mcp` by an MCP client** — with
   **no process other than `nodegx-backend` running**. Then Richard rules the execution record
   legible.
2. 🔴 **Register R1 — the shape every feed graph is drawn in.** A graph that wires only the happy
   path does not fail, it **HANGS for the whole function timeout**, and a 30-second red tells you
   nothing about which port fired. Wire `Failure` beside every path you expect, in every fixture.
   Every FED-004 suite does this and says why at the top of the file.
3. **Three things FED-006 inherits by name** (unchanged from s4's handoff, all still open):
   - **From FED-003 §5.5** — the model-cost sum is on the wire as JSON and deliberately **not**
     formatted, because §8's close condition is Richard ruling the record *legible*. Guessing the
     presentation before that ruling means building it twice.
   - **From FED-004** — the feed poll should carry `overlapPolicy` and `Conditional` explicitly
     rather than by default. The point of the drive is that a person can SEE the decisions; two
     of them are now sayable and a graph that says nothing takes both silently.
   - **Register R7** — `noodl.cloud.modelrequest`'s enrichment lists no examples, and FED-006 is
     the worked example it should point at. A row to close, not a defect to farm.
4. 🔴 **Register R3 before you write items into a collection FED-006 creates on the fly.** `id`
   is a reserved property name at the adapter layer: never auto-created as a column, and never
   changeable (a `PUT` with a new `id` answers **200 and writes nothing**). FED-002 pinned both
   as specs. Declared columns are fine — FED-004's `_HttpCache` declares every column it uses and
   does not trip.
5. **For the `/mcp` half, FED-005 §5 is the map.** The endpoint is `POST /mcp`, the credential is
   a scoped API key (`X-NodeGX-Api-Key` **or** `Authorization: Bearer`), and the key the drive
   uses should be **bound to a user** (`actsAsUserId`) — otherwise "readable by an MCP client"
   measures nothing about per-user reading, which is the half §8 cares about. The official client
   is already a dev dependency of this package and `fed-005-mcp-client.test.ts` is the worked
   example of connecting one. `docs/runtime/BACKEND-MCP.md` is the person-facing version.

**Rule 5 does not apply unless FED-006 adds a node type. It should not need to.**

## 3. The phase's end condition

README §8, unchanged: FED-006 green on a fresh backend with **one `nodegx-backend` process and
nothing beside it**, and Richard has ruled the execution record legible. **Distance: FED-006, and
that is all.** Two of §8's clauses are now reachable that were not before s5 — "readable by an
API key" and "readable through `/mcp` by an MCP client".

⚠️ Richard's ruling is the last step and it is a REAL step, not a formality: the thing he is being
asked to rule on is whether the execution record in the dashboard can be READ. Do not format the
model-cost sum before he has seen it (FED-003 §5.5).

## 4. The register

| | finding | owner |
|---|---|---|
| R1 | **A feed graph that wires only the parser's `Failure` hangs for the full function timeout when the FETCH is what failed** (CWF-018). Found by FED-001's drive suite: 30 s, then 504. Not a FED-001 defect — CWF-018 owns the missing function timeout — but it is the shape every feed graph will be drawn in. ✅ *s4 paid it forward again:* every fixture graph in all three FED-004 suites wires `Failure` beside the path it expects, and the reason is written at the top of each file. **FED-004 was also R1 seen from the other end** — a run that has not finished is the reason the next fire has something to trip over — and `overlapPolicy` is what makes that hang survivable rather than compounding | CWF-018 |
| R2 | The scoping session's `fast-xml-parser` figure was wrong at every version. Corrected in place in FED-001 §3.1. **No action.** | — |
| R4 | ✅ **RULED AND PAID, 2026-09-18.** A new node type owes `packages/noodl-mcp`, which neither a per-package run nor `test:main` sees. **Richard's ruling:** *"I'll likely convert all nodes to code export, so you can add them to the list of exportable ones to work on."* 🔴 **The wider reach is still P18's open question** — it makes the ledger's twelve remaining *"deliberately out of scope"* picker rows provisional, `Parse CSV` in particular. **Still not put to Richard.** ✅ *s4 confirms the floor again:* `noodl-mcp` at **7 suites / 8 tests**, the same seven names, `nodeDocBudget` still reding on **`Group` at exactly 14,315** — R4's own figure, unmoved by two new ports. ✅ *s5 confirms it again AND WRITES THE NAMES DOWN*, because "the same seven names" is not something a later session can check: `nodeIdAllocation` · `cn004` · `cmp004Parts` · `nodeDocBudget` · `cmp001InterfaceDoctrine` · `def038SettledTemplates` · `d54ThemePresetIdentity`. ⚠️ s5's FIRST reading of this package was **8 suites / 10 tests** — taken while `test:main` was still running on a load-10 box with a peer's editor up. The quiet re-run reproduced neither extra red. Compare the SET, and re-run before believing a delta | P18 (the wider ruling) · the seven: unattributed |
| R3 | 🔴 **`id` is a reserved property name at the adapter layer, in three places and nowhere written down.** (a) never AUTO-created as a column; (b) cannot be CHANGED — `QueryBuilder.buildUpdate` deletes `data.id`, so a `PUT` with a new `id` answers **200 and writes nothing**. Both pinned as specs in `fed-002-indexes.test.ts`. **Does not block FED-006**, but **re-measure before FED-006 writes items into a collection it created on the fly.** ⚠️ FED-004's `_HttpCache` declares every column it uses, so it does not trip on (a) — which is evidence about declared tables, not about the defect | unowned — file against the adapter if FED-006 trips on it |
| R5 | ✅ **CLOSED 2026-09-18** by its owner (`opennoodl-ec`, P94/STY-003, at `13d60a921`) and this phase's snapshot commit. `test:main` has been 504/504 since. *Kept for its two attribution lessons: presence in `git status` is not authorship and neither is `git log`; mtime is.* | ✅ closed |
| R6 | **The `list_node_types` ratchet had 327 bytes of headroom left and nobody knew.** ~3,000 bytes were spent between FLD-013 and s3 by changes that each fitted underneath and therefore never had to say so — **which is the one thing a ratchet cannot catch**. Ceiling moved to 66,000 with the measurement in the docstring. **No action beyond awareness.** | — |
| R7 | **`docs/node-catalog/enrichment/noodl.cloud.modelrequest.json` lists no examples**, which `catalog:merge` warns about (`--require-coverage` still passes). Every other documented node carries one. **The natural home is FED-006** | FED-006 |
| R9 | 🔴 **NEW (s5) — a live privilege escalation, found and FIXED in this task.** A scoped API key with `classes:read` could read `_Session` through `/classes` and get **live session tokens in plaintext**, which is impersonation of every account on the backend; `_ApiKey` (key hashes), `_User` and `_Audit` came back the same way. `checkClp` decided a key on its scopes and **never consulted the system-collection posture** that `effectiveRule` carries — users and anonymous callers were correctly refused the whole time, which is exactly why no test saw it. Measured before the fix on a locked backend, then fixed **above** the key branch so one statement covers every non-admin principal. **It was FED-005's to fix because it blocked AC1's shape:** §3.2 derives `tools/list` from `checkClp`, so a literal reading offered `_Session_find` as a tool. 🔴 **And the first spec written for it GRADED NOTHING** — `listTables()` does not report system tables, so no system name reached the gate by that path; the assertion moved to `buildToolSurface` called directly. ✅ **Closed by FED-005** | ✅ closed (s5) |
| R12 | **Two FED-005 design sentences that are not ACs were deliberately not built** (FED-005 §5.6), listed so nobody assumes they shipped: §3.4's *"the dashboard's key view shows the last ten calls per key"* — the rows exist and the Audit section already filters on `mcp.tool.call`, only the joined panel is missing; and §3.3's *"the List backend API keys tool gains a create form"* — **refused**, not deferred, because R8 leaves 6 tokens of headroom and creating a bound key over `POST /admin/keys` works today | the panel: unowned, size it against a real complaint · the create form: blocked behind R8 |
| R10 | **A cloud component's `description` is dropped at export, so a deployed backend has none.** `exportComponent` (`noodl-editor/src/editor/src/utils/exporter/util.ts`) builds `{name, nodes, connections, ports, roots, metadata}` — the sentence an author writes in the editor never reaches a bundle. FED-005 §3.2 asked for it ("description from the component's description") and synthesised from the name and the declared contract instead. **Carrying it is an EDITOR change, which ruling R4 puts outside this phase.** Worth having: it is the string a model reads when choosing between an app's tools | unowned — an editor phase (the exporter), not this one |
| R11 | **A graph refusing an unauthenticated caller answers HTTP 500, not 401.** The Request node throws a plain `Error('Unauthenticated requests not accepted.')` and `WorkflowRunner` maps anything unrecognised to 500 — so a caller who is simply not signed in is told the server is broken. **True over `POST /functions/:name` too**, which is why FED-005 did not change it: altering an existing endpoint's status belongs with that door's owner. The precedent for the fix is immediately above it in the same `catch` — CWF-014's `CloudFunctionBadRequestError` is recognised by `name` and mapped to 400. Caught by FED-005's own suite, which had keyed a hint on the 401 this case never produces | unowned — file against the cloud-function door |
| R8 | 🔴 **NEW (s4) — R6's shape a second time, on a different ratchet.** The `noodl-mcp` **tool-surface** budget reads **8,274 tokens against 8,280 — six tokens of headroom.** Found while confirming R4's floor, not by a red. ✅ **It is not FED-004's:** a one-variable control (HEAD's `backendTools.ts` against this branch's, same listing) reads **8,274 both ways**, because only 20 tools are resident and the trigger tools are not among them. 🔴 **It is FED-005's problem directly:** §3.2 computes `tools/list` per request, and anything that grows the resident surface by a single description tips it. A session that finds itself a few tokens under a ratchet should read that as the surface needing a diet, not the ceiling needing a nudge — which is R6's own lesson, unlearned | FED-005 to watch; the ratchet itself unowned. ✅ *s5 re-measured it and it is UNMOVED:* **8,274 tokens / 20 resident tools, 6 under 8,280** — FED-005 adds nothing to `packages/noodl-mcp`, and §3.3's optional "the List backend API keys tool gains a create form" was deliberately **not built**, because R8 is the reason to leave that surface alone until it has been put on a diet |

## 5. What s5 measured

- **The three FED-005 suites: 39/39.** `fed-005-mcp-surface` 21 · `fed-005-mcp-acts-as` 11 ·
  `fed-005-mcp-client` 7.
- **15 `nodegx-backend` suites / 165 tests, green** — every suite that reads a `Principal`, walks
  the route table, or filters a realtime event: `security-model`, `security-enforcement`,
  `security-functions`, `brg-002-api-key-roundtrip`, `ops-audit`, `ops-rate-limit`,
  `impersonate-session`, `realtime-filter`, `realtime-http`, `realtime-changebus`,
  `service-http`, `cloud-http-node`, plus the three new ones.
- **`test:main` 508/508 suites, 8103/8103 tests.** (s4 read 504/8065 — peers have added suites
  since; both green.)
- `typecheck:backend-tests` and `typecheck:cloud` both **exit 0**.
- `noodl-mcp` at R4's floor, **7 suites / 8 tests**, names now written down in R4 above.
- **R8's ratchet unmoved: 8,274 tokens / 20 resident tools, 6 under 8,280.**
- 🔴 **NOT run: `nodegx-backend` WHOLE.** See §1. It is the one thing s5 owes and the reason is a
  peer's editor on CDP 9222 plus load 7–11 all session, not a shortcut.

### 🔴 Three mutants, because a green security suite has told you nothing

Every load-bearing change was reverted and the suite re-run:

| mutant | result |
|---|---|
| remove the R9 system-collection hoist from `checkClp` | 2 R9 arms red |
| `aclFor` stops narrowing for a bound key | **5** AC2 arms red — and the UNBOUND control stayed green, which is what makes them assertions about the binding rather than about the endpoint |
| `checkFunctionCall` stops narrowing | both AC4 arms red |

🔴 **And the first mutant caught a spec of mine that GRADED NOTHING.** "Ask a live backend for its
tools, assert none start with `_`" stayed **green with the hole deliberately reopened**. Measured:
a backend with rows in `_User`, `_Session`, `_ApiKey` and `_Audit` answers `GET /admin/schema`
with `["Task"]` — `listTables()` does not report system tables at all, so no system name ever
reached `checkClp` by that path. The assertion moved to `buildToolSurface` called directly with
the system names supplied by hand. **Two independent reasons a thing is safe is a good place to
be; a spec that cannot see the one that is a security property is not measuring it.**

### A recorded trap that is WRONG, corrected at s4 and still worth reading

The shared harness notes said *"`npx jest` in `packages/nodegx-backend` NEVER TERMINATES"*, naming
`tests/ac2-page-editor-drag-drive.test.ts`. **Measured 2026-09-19 (s4): the package runs 149/149
in 506 s** at `--maxWorkers=2`, and the named straggler **passes standalone in 284 s** — it is a
real editor drive and that is what one costs. The original observation was probably real, but the
mechanism is **contention, not a dead suite**: a peer holding the CDP port stalls it indefinitely,
which is exactly the state s5 found the box in all session.

⚠️ **`timeout` does not exist on macOS.** `timeout 300 npx jest …` exits instantly with `command
not found`, and a `| grep` swallows it — which reads exactly like a hang. Use `time npx jest …`
and read the duration.

⚠️ **And `grep` skips this package's big TypeScript files as binary.** `grep -n … src/server/HttpServer.ts`
returns NOTHING; `grep -an` returns the matches. s5 lost a few minutes to it before remembering.

**Nothing is outstanding but the whole-package run, which is named above with its reason.**
