# ISL-029 — Records and queries say what really happened

**Status: ✅ CLOSED s24 (2026-10-06): 12 of 12 fixed — D24 (`225542f5b`, after the real-backend probe its ruling asked for found a security row: §10). s23: 11 of 12 fixed — C43 (`83908a71e`), D22 (`1b367e1fa`), C36 (`011f0a9bd`), C38 + C39 (`724db53e7`), C42 (`8d3ebc83f`), C40 + C41 (`6593e7deb`), C34 (`8a1afd591`), C33 (`5286345e8`), C35 (`8ec177377`). ✅ AC2: all 12 rulings taken 2026-10-05, all as recommended. Scoped 2026-10-05 at `8292f1d55` by the ledger sweep (Track F).** **Source:** 12 bugs from
the ledger (`dev-docs/bugs/`) that had no task: 4 high · 4 medium · 4 low, **12 awaiting a ruling**. **Side:** runtime (Record family, Query Records `DbCollection2`, Filter Records `FilterDBModels`), backend contract

## 1. The person sentence

**A Record or Query Records node reports the outcome the backend really gave. A live query stays right when another node saves, and a filter script that fails says so.**

## 2. Why these belong together

This is the data layer every app with a backend leans on, and P107 NSP-014 found these rows by grading the real
`CloudStore` against the backend contract. Query Records with a Javascript filter and no script never queries, and never
says so (C38). A script that throws fetches **every row** as a Success (C39): a filter meant to narrow the rows hands over all of them. A live query
with a Limit drops the wrong record (C40), and keeps a saved record in its old place (C41). Filter Records is deaf to saves
unless a hidden picker was written (C42). Update Record keeps a failed write (C34). Delete Record reports Failure for a
delete that succeeded (C36). With no backend configured, a request goes to `undefined/classes/…` (C33).

## 3. The bugs

Worst first. Each file holds the measurement, the reproduction and, for most of them, the proposed fix and the question
to ask. This table is generated from the ledger headers. **The ledger file is the source**, so read it before you start.

| bug | severity | status | what a person sees |
|---|---|---|---|
| [P107-C38](../../bugs/p107-c38-query-records-with-a-javascript-filter-and-no-script-never-queries-and-never-says-so.md) | high | needs-ruling | Query Records with a Javascript filter and no stored script (or a syntax error) never queries — and never says so |
| [P107-C39](../../bugs/p107-c39-a-query-records-filter-script-that-throws-before-where-fetches-every-row.md) | high | needs-ruling | A Query Records filter script that throws before calling where() fetches every row, as a Success |
| [P107-C40](../../bugs/p107-c40-a-live-query-records-with-a-limit-drops-the-wrong-record-unless-sorted-descending.md) | high | needs-ruling | A live Query Records with a Limit drops the wrong record when a new one arrives, unless it is sorted descending |
| [P107-C42](../../bugs/p107-c42-filter-records-never-hears-a-save-when-its-backend-was-never-written.md) | high | needs-ruling | Filter Records never re-filters when another node saves a record, unless its Backend picker was written — and that picker is hidden when the project has one backend |
| [P107-C33](../../bugs/p107-c33-a-record-node-with-no-backend-configured-sends-to-undefined-classes.md) | medium | needs-ruling | A Record node in a project with no backend configured sends its operation to `undefined/classes/…` on the app's own host, and off the browser is never answered |
| [P107-C34](../../bugs/p107-c34-update-record-keeps-its-write-on-the-record-when-the-save-fails.md) | medium | needs-ruling | Update Record keeps its write on the record when the save fails — including when nothing was ever sent |
| [P107-C36](../../bugs/p107-c36-delete-record-reports-failure-for-a-delete-that-succeeded-when-its-id-changes-while-out.md) | medium | needs-ruling | Delete Record reports Failure for a delete that succeeded when its Id changes while the delete is out |
| [P107-C41](../../bugs/p107-c41-a-live-query-records-keeps-a-saved-record-in-its-old-place-when-its-sort-field-moved.md) | medium | needs-ruling | A live Query Records keeps a record in its old place when another node saves it with a different sort value |
| [P107-C35](../../bugs/p107-c35-an-access-rule-set-to-role-with-no-role-names-role-undefined.md) | low | needs-ruling | An access rule set to Role with no Role named writes the ACL key `role:undefined` |
| [P107-C43](../../bugs/p107-c43-filter-records-sort-over-non-records-throws-out-of-the-run.md) | low | needs-ruling | Filter Records never answers a Filter press when its Sorting meets rows that are not records — no Error, no Failure |
| [P107-D22](../../bugs/p107-d22-a-record-s-fetch-asks-the-backend-for-record-null.md) | low | needs-ruling | A Record's Fetch with a null Id asks the backend for the record "null" |
| [P107-D24](../../bugs/p107-d24-after-a-rest-log-in-an-owner-access-rule-is-dropped-without-the-acl-ignored-warning.md) | low | needs-ruling | After a Log In on Directus / PocketBase, a record's Owner access rule is dropped without the "ACL ignored" warning that exists to say so |

## 4. Order of work

C39 (fetches everything) and C38 first, then C42, C40 and C41 (live queries), then C34, C36, C33 and the low rows.

## 5. Rules for every row

- **Re-measure first, cheaply.** Every P107 row is a *known row* on the runtime target, and
  `packages/noodl-runtime/test/node-spec/conformance.test.ts:714` asserts each one **still fires** on every run. A row
  that has stopped firing turns that test red. So run the node-spec suite before you start. A row that no longer fires was fixed
  by someone else: close it in the ledger with the commit that fixed it, and do not fix it again.
- **A `needs-ruling` row is asked before it is fixed.** P107's R3 says the runtime wins until Richard rules. Most rows
  already carry the plain-words question and a recommended fix in their evidence section (the NSP task's §6, or the P107
  README §7). Ask the rows of this task **in one batch**, plain words, one decision per question, recommendation first,
  and say what the node is in each question. Ask only when this task is next to build.
- **A fix ships alone and closes its row in the same commit:** drop the known row from the spec's runtime list, bump
  the spec's `version` with a `changes` entry that names the bug's id (P107 NSP-010, P112 OWN-010), set the ledger
  file to `status: fixed` with `commit:`, and add a `regression:` line (the scenario that now passes). `node
  scripts/bugs.js check` fails a fixed kit bug without one.
- **The export is not fixed here.** If the exported app has the same fault, write a row on P18's ledger, as P107 §8 does.

## 6. Related work and collisions

- **P104 (the backend manager)** and **P99 HLT-016** touch the adapters. C33 and D24 meet the REST adapter. Grep
  `dev-docs/bugs` for `backend /` before you touch it.
- C44 (null Items crashes inside *another* node's save) is in ISL-026.
- Sweep rule: this task was made from the ledger, **not re-measured** when it was written (2026-10-05). The first session
  re-measures each row (§5) and closes the ones already fixed before it asks or builds anything.

## 7. Acceptance criteria

- **AC1** — every row in §3 is re-measured at the session's HEAD. Each one still firing is recorded, and each one that is
  not is closed in the ledger with the commit that fixed it.
- **AC2** — every `needs-ruling` row is asked in plain words and ruled. A row ruled "keep it" becomes `wontfix` with the
  ruling as its `reason:`, or moves to [ISL-033](ISL-033-A-NODES-DESCRIPTION-SAYS-WHAT-IT-DOES.md) when the ruling is
  "describe it, don't change it".
- **AC3** — every row ruled "fix it" is fixed, one commit each (or one per shared mechanism), with its regression
  (`regression:` in the ledger) green and its known row dropped in the same commit.
- **AC4** — `node scripts/bugs.js --from P107` and `--from P109` list none of this task's rows as `open` or `needs-ruling`.

## 8. Rulings (2026-10-05)

Richard ruled every `needs-ruling` row of this task on the [Track F rulings page](https://claude.ai/artifact/CPcSy8ABRQpn2dMZYuvXDH). Each card asked one plain-words
question with the options below; the full card is quoted in the bug's ledger file. **Build what is ruled.** A wording-only
ruling is still this task's work: the description changes, the node does not.

| bug | ruled | as recommended | what it means |
|---|---|---|---|
| P107-C38 | Run the shown script; report typos | yes | With no script saved, the node runs the starter script the editor shows, which fetches every record. A script with a syntax error fires Failure and puts the error on Error. A small change. Apps that were silent start to fetch. |
| P107-C39 | Fail with the script's error | yes | The node does not query. It fires Failure and puts the crash message on Error. A small change. An app that was quietly showing every record now shows an error instead. |
| P107-C40 | Drop the last; re-query if unsorted | yes | Under any sort the record that sorts last is dropped, so the list matches what the backend would return. With no sort the node fetches the list again, because only the backend knows its order. A small change, plus one extra request in the unsorted case. |
| P107-C42 | Follow the project's backend | yes | With no Backend picked, Filter Records listens to the same backend Query Records uses. A small change. Filtered lists start updating after edits, as the box says they do. |
| P107-C33 | Refuse with a clear sentence | yes | At the moment of the write, if there is still no backend address, the node fires Failure with a sentence such as "This project has no backend configured. Add one in the Backend panel." No request goes out. A backend address added later at deploy time keeps working. A small change. |
| P107-C34 | Put the old values back | yes | On any failure the record shows what the backend holds, and Failure fires as today. A small change. Anything bound to the record snaps back to the old value, so a field the person just changed can revert on screen. |
| P107-C36 | Remember the record at the press | yes | The node keeps the record it was asked to delete and reports Success for that one. Update Record already works this way. A small change. |
| P107-C41 | Move it to its new place | yes | On a save, the record is taken out and put back where its new value sorts. A small change. People see the item jump to its right place, which is what they expect. |
| P107-C35 | Refuse the save and say why | yes | The node fires Failure with a sentence saying the Role rule has no role named. Nothing is saved. The author finds the slip at once. A modest change, and an app with this slip stops saving until it is fixed. |
| P107-C43 | Fail with an error | yes | The node fires Failure and puts the reason on Error, as it already does for the filter. A one-line change. |
| P107-D22 | Say 'Missing Id.' | yes | Fetch uses the same test for an empty Id that the rest of the node uses. No request goes out and the node's own sentence shows. A one-line change. |
| P107-D24 | Ask the record's own backend | yes | The rules see the person who really logged in. On Directus and PocketBase the warning appears again. On a NodeGX backend, if the mismatch is real there, Owner rules start working. A modest change to how every access rule finds the user, and the NodeGX case should be checked on a real backend first. |

## 9. Session 23 (2026-10-06) — eleven rows

AC1: each row re-measured at HEAD before its fix, and every one still fired (C43 and C36 were known rows; D22, C42,
C40, C41, C34 and C35's scenarios modelled the runtime; C38, C39 and C33 sit outside the spec world and were red in new
runtime tests first).

| bug | commit | what changed | regression |
|---|---|---|---|
| C43 | `83908a71e` | Filter Records' sort inside the filter's `try`; known row dropped | the C43 scenario; control red |
| D22 | `1b367e1fa` | Record's Fetch uses the binding's empty test (null is Missing Id.); Record v4 | the D22 scenario; control red |
| C36 | `011f0a9bd` | Delete Record takes the record at the call; known row dropped | the C36 scenario; control red |
| C38, C39 | `724db53e7` | no saved script runs the starter script; a parse error or a throw fails the node and asks nothing | `test/nodes/isl-029-query-records-filter-script.test.ts`; red on the 3 defect rows before |
| C42 | `8d3ebc83f` | with no Backend written Filter Records binds the project's backend's store (creation and each run); Filter Records v3 | the C42 hand and graph scenarios + 2 new; controls red |
| C40, C41 | `6593e7deb` | over Limit the record that sorts last goes (unsorted: query again); a saved member moves to its sorted place; Query Records v4 | 3 scenarios; control red on exactly the 3 |
| C34 | `8a1afd591` | Update Record resolves the backend before writing, and puts the write back on ANY failure; Update Record v2 | 2 scenarios (+1 renamed); control red on the 3 |
| C33 | `5286345e8` | the Parse wire refuses a request with no address at the moment it is made, with the ruled sentence | `test/nodes/isl-029-no-backend-configured.test.ts`; red before, control (a later endpoint) green |
| C35 | `8ec177377` | `_aclRefusal`: a Role rule naming no role refuses Create and Update Record before anything goes; Create v3, Update v3 | 2 scenarios (1 new); control red on both |

**D24 is not built.** Its ruling ("Ask the record's own backend") says the NodeGX case should be checked on a real backend
first: does a `nodegx` entry under `backendServices` with no `cloudservices` endpoint (the Parse wire, where `data.acl` IS
supported) keep its session where `CloudStore.instance` looks? If not, Owner rules there are silently dropped today — a
security row. Probe that first (a local `nodegx-backend`, a Log In, a Create Record with an Owner rule, read the call's
`acl`), then build the ruling: the access rules read the signed-in user from the record's OWN backend.

**What the plan did not know.**
- **C39 also closes FLD-008's route.** FLD-008's test rebuilds the node before FLD-008 to show the old widening; the throw
  it provokes now lands in C39's catch, so that arm also puts C39's line back (asserted present).
- **C42's first v3 left a mutant alive** that v2 had killed: a box write handed the Backend write's recorded patch
  (`{ bound: 'main', picked: true }`). With an unwritten Backend now following the project, only a box written AFTER
  Backend named the other backend, with a save on ONE backend, tells them apart. Two saves on two backends did not:
  both arms re-ran once and read the same global registry.
- **A scenario's NAME can go false while its trace still passes:** three did here ("… a save is still not heard" for C42,
  "… nothing to put back" for C34, the access-rules one for C35); each renamed to what the new version shows.
- **Old tests pinned the defects:** `query-records-empty-sort.test.ts` (C40's unsorted guess), `cloudstore-files.test.ts`
  (C33's `undefined/files/…` address), and two stubs lacked what a fix now reads (`nda-004`'s CloudStore without
  `forBackend`, the routing test's record without `get`). Each updated in its fix's commit, with a comment.
- **C34 and C33 meet:** with no backend configured, Update Record now writes nothing at all (C34 resolves the backend
  first), and if the address is missing at the call the wire refuses (C33) and the write is put back.
- **The conformance test file has another session's open edit** (P107's C79 predicate, s50). Both known-row removals
  (C43, C36) were committed as HEAD's file minus those lines, never the working copy.

**Readings (2026-10-06):** each fix at seeds 20732 and 13 where its spec changed, 0 divergences, every mutant killed but
the declared equivalents (Filter Records 157 / 157; Record 145 / 147 and 133 / 135; Delete Record 34 / 34; Query Records
1176 / 1178 and 1131 / 1133; Update Record 78 / 78; Create Record 40 / 40). Runtime jest without the conformance file
3167 passed, 0 failed (after C33); viewer 1772 / 1772 (after C33); runtime graph 87 / 87; spec records batch, catalog parity, graph,
world, schema 556 / 556; runtime and spec tsc 0. `bugs.js check`: 5 problems, none in P109's rows.

**Owed by P18 (the export), not checked:** whether the exported app has any of these eleven.

## 10. Session 24 (2026-10-06) — D24, the twelfth

**The probe first, as the ruling asked.** A real `nodegx-backend` (`dist/cli.js`, built from current source; dev-open off)
configured under `backendServices` with no `cloudservices` endpoint; the real `ParseAuthAdapter` signing in through the
handle `UserService._handle()` answers there (the entry's `publicToken`); the real Create Record methods, an Owner rule.
Log In wrote `Parse/<publicToken>/currentUser`; the rules asked `CloudStore.instance`, whose app id is `undefined`: nobody.
The create carried the person's session and **no `ACL`**. With the collection's creator-owns on (the default) the server
stamped the owner itself and a second signed-in user got 404. **With creator-owns off the record was stored `ACL: null`
and the second user read it** (`GET` 200, and in their `find`). Control: the same press with a `cloudservices` endpoint
sent and stored `ACL: {<owner>: read, write}`. So the NodeGX case was real: a security row, masked by the default posture.
The ledger row's severity went from low to medium on that reading.

| Row | Commit | What changed | Grade |
|---|---|---|---|
| D24 | `225542f5b` | `_getCurrentUser(scope, backendId)` asks `CloudStore.forBackend(…).currentUserId()`; `RestDataAdapter.currentUserId` reads the session a REST Log In wrote (`restSessionKey`, a fixed tab id so it draws no `Math.random`); Create v4, Update v4 (`world.backend.userOn(<the call's backend>)`) | `test/nodes/isl-029-access-rules-ask-the-records-backend.test.ts` (5 rows: NodeGX, two backends, nobody on the record's one, legacy control, Directus warning) red on 3 before; 3 scenarios reseeded `user` → `sessions` + 3 new, control red on exactly those 5; graph s11 (Log In → Owner rule, and beside it nobody), control red on the Log In arm only |

**What the plan did not know.**
- **Creator-owns hid it.** The backend's default stamps the creator as owner on any create with a session, so on a fresh
  backend the dropped rule changes nothing visible. Only a collection with creator-owns off shows the hole; a probe on
  the default posture alone would have read "safe".
- **The world's USER was the defect, written down.** `world.ts` defined `user` as "the legacy store's, whichever backend
  the record goes to" — the reference recorded the bug as the rule. It now plays only the legacy store (which no record
  rule reads), and `userOn(backend)` is the session the backend holds.
- **Two guarded files.** `spec.ts` and `world.ts` are in the stranger rounds' hash list; refreshed in the fix commit, the
  four rounds re-graded green (46 passed, the deep runs skipped).
- **ERG-001's stub store had no `currentUserId`** (the rules now ask the record's store): one line in the fix commit.
- **Not touched:** `packages/noodl-runtime/test/helpers/node-spec-target.ts` (another session's open edit). Its
  `installUser` docblock still says the rules read the legacy store; the code needs no change (it already writes each
  backend's session where `RestDataAdapter.currentUserId` reads it). Correct the sentence when that file is free.

**Readings (2026-10-06, at `225542f5b`):** Create Record and Update Record at seeds 20732 and 13: 25 / 25 and 32 / 32
scenarios, 200 / 200 sequences, 0 divergences, mutants 40 / 40 and 78 / 78. Runtime graph 89 / 89, twice. Runtime jest
without the conformance file 3174 passed, 0 failed; viewer 1772 / 1772 (143 suites). Spec subset (records batch, catalog
parity, graph, world, schema) 558 / 558. Runtime and spec tsc 0. Stranger rounds 46 passed. `bugs.js check`: 5 problems,
none in P109's rows.

**Owed by P18 (the export), not checked:** does the exported app's access rule read the record's own backend's user?
