# Noodl Desk — predicted before either arm ran (P18 session 134)

The desk: `packages/nodegx-export/tests/helpers/noodl-desk.ts`. Both arms answered by `tests/helpers/fake-parse-backend.js`
(three Tasks, `t1` open with a pointer and a date, `t2` done, `t3` open; the session `tok-ann` is Ann, an admin).

Each reading is every drawn Text in document order:
**hello · n · first · phase · phase2 · seen · doneN · again · added · who · locked · bad · link · note**.

🔴 **doneN and again were added after the first run of both arms**, to grade two things the first desk could not see (a
`settled` that resolves before the body finishes; a late signal whose chain starts another awaiting run — gram's Welcome,
TS1308). Their rows below were predicted before the second run; every other cell before the first.

Steps: Count open, Add one, Count open, Who am I, Refused, Bad filter, Sign, Remember, Reseed, Remember.

## Signed in as Ann (the stored session `{ objectId: 'u1', sessionToken: 'tok-ann', username: 'ann', email: 'ann@x.test' }`)

| after | what changes |
|---|---|
| load | hello `hello Ann` (the arrival run awaits `whoAmI` once); n, first, added, who, locked, bad, link `''`; phase `phase nothing`, phase2 `phase2 nothing`, seen `seen nothing`, note `note nothing` |
| Count open | doneN `2` (Done waits for the body: it reads the count written after the `await`); again `again Ann` (`counted`, sent after the `await`, runs Greet again, which awaits `whoAmI`); n `2`; first `t1\|First\|u1\|2026-10-21T00:00:00.000Z\|undefined` (plain: `objectId`, the pointer as its id, the date as its text, no `id`); phase `started` (sent before the `await`); phase2 `counted` (sent after it: late); seen **`clicked`** (the click's second wire ran before the run finished, so the Done's Set Variable reads the new value) |
| Add one | added `added Fourth` |
| Count open | n `3` and doneN `3` (the Cloud Function stored a fourth Task); first unchanged |
| Who am I | who `Ann admin / ann@x.test ann u1 object` |
| Refused | locked `refused: Not for you. (141) body` — the backend's error body itself, not an `Error` |
| Bad filter | bad `string: A filter must have exactly one key / Error: Permission denied for Locked.` — the translator's words rejected as a string; the backend's refusal as an `Error` |
| Sign | link `signed http://files.test/photo.png?exp=1&sig=abc 2026-10-22T00:00:00.000Z 3600 / refused 403 This file is private.` |
| Remember | note `kept S1` (a Function writes a Variable a Variable node reads; it reads one a Variable node holds) |
| Reseed | nothing drawn changes (the Set Variable writes `seed`) |
| Remember | note `kept S2` |

## Signed out (no stored session)

The same, except: hello `hello nobody`; again `again nobody`; who `nobody / signed out`.

## The wire

Every request the export sends, the runtime sends, in the same order with the same body — except two, predicted as the
runtime's alone:

1. `GET /users/me` once, at the start, signed in only (the viewer's UserService checks a stored session; the export trusts it).
2. The bad filter's query: the runtime's `convertFilterOp` reports the failure (the promise rejects) and returns `{}`, and the
   store's query goes out anyway with an empty `where`. The export rejects and sends nothing.
