# BRG-006 — The drive: a real app crosses

**Status: ⬜ Not started. Closes the phase.**

## 1. The person sentence

**A NodeGX app that a person actually built — pages, workflows, cloud functions, a schedule, login,
row ACLs, realtime — is moved onto Postgres by one command and keeps working, and the person never
opens the editor to do it.**

## 2. Why a drive and not a test suite

BRG-003 proves the adapters agree. It does not prove **the app** moves, and those are different
claims. A conformance suite can be green while the thing a user cares about — their workflow still
firing, their function still returning, their login still working, their realtime list still
updating — is broken by something no unit touched.

The house rule applies (phase README §7.5, `PHASE-EXECUTION.md`, and phase 96's FED-006): the drive
is the gate.

## 3. The app that proves it

Reuse an existing project rather than building one, so the drive measures the product and not a
fixture. It must exercise, at minimum:

| capability | why it is in the drive |
|---|---|
| A cloud function that reads and writes as system | `runAs: 'system'` bypasses CLPs and ACLs (`security/model.ts:169-171`) — a different code path from a user request |
| A workflow with a `for-each` and a `sleep` | holds a concurrency slot across a step boundary; state must survive |
| A schedule trigger | single-process scheduler, `missedFirePolicy` — does it still fire after cutover |
| Login, a session user, and `creatorOwns` rows | 🔴 the row-ACL path end to end, through a real session token |
| A scoped API key | a second auth path with different enforcement (`security/state.ts:411`) |
| A unique index and upsert-on-unique | FED-002; BRG-D2 is precisely this guarantee failing to cross |
| A relation | BRG-D3 |
| Realtime SSE with a filtered subscription | rides the `ChangeBus` commit boundary |
| An uploaded file | storage is already S3-capable and should be unaffected — prove it |

## 4. Acceptance criteria

1. **AC1** — The app runs on the built-in SQLite backend. Its behaviour is recorded: function
   outputs, workflow execution records, a realtime event, the ACL denials. **This is the control,
   captured before anything moves.**
2. **AC2** — `migrate --dry-run` produces a clean carry report. Anything that does not cross is
   named, and `git`-committed as part of the drive record.
3. **AC3** — `migrate` runs to completion and verify is green.
4. **AC4** — After cutover the app serves from Postgres and **every recorded behaviour in AC1 is
   reproduced**, compared against the control, not merely inspected.
5. **AC5** — 🔴 **Zero changes** to the project: `git diff` over the project directory after the
   whole exercise is empty. No node, no workflow definition, no `schema.json` entry, no function
   changed. This is the sentence the phase exists to be able to say, and it is asserted, not claimed.
6. **AC6** — A non-owner is still denied read, update and delete on another user's rows, through
   session **and** API key, on Postgres — re-run from AC1's control, not written fresh.
7. **AC7** — Going back works: flip the config to the untouched SQLite file, restart, the app serves
   again. The source file's sha256 matches AC1.
8. **AC8** — 🔴 **The bounded claim is published.** The docs state what the bridge buys (the storage
   ceiling) and what it does not (the single-process app tier, README §3), in the words R2 rules,
   where a user deciding whether to start on NodeGX will read it — not only in a task file. Richard
   has read it and ruled it honest.
