# ISL-029 — Records and queries say what really happened

**Status: ⬜ not started — ✅ AC2: all 12 rulings taken 2026-10-05, all as recommended. Scoped 2026-10-05 at `8292f1d55` by the ledger sweep (Track F).** **Source:** 12 bugs from
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
