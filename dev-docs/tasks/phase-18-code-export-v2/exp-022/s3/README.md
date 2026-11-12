# EXP-022 S3 — evidence

Swift session 3 of at most 12 (2026-10-22, Opus 5.5). The backend, through the one client. What is here:

- **`noodl-desk-three-arms.json`**: the Noodl Desk (`tests/helpers/noodl-desk.ts`) driven ten steps, signed in and signed
  out, in three arms answered by one fake Parse backend: the Swift app (`swift test`, `swiftBackendArm`), the runtime's
  own nodes (`runtime-mounted-arm.js`) and the React export (`export-react-arm.js`). Per arm, the readings and every
  request the backend was sent. The Swift readings equal React's and the runtime's (but the word "Text",
  P18-S122-TEXTDEFAULT). The Swift wire equals React's, 11 requests, body for body. It also equals the runtime's, but
  for the two requests no export sends (the session check, and the query after a refused filter).
- **`record-desk-two-arms.json`**: the Record Desk (`tests/helpers/record-desk.ts`): a query and its Fetch, create,
  update and delete, Log In right and wrong, a Missing Record Id, Log Out, and the User node read throughout. Swift and
  React, one fake backend. Both read the predicted rows. React draws the Authenticated Text empty
  (P18-EXP022-S3-BOOLTEXT). The wire is the same 11 requests.
- **`todo-list-EXPORT-PREFLIGHT.md`**: todo-list's Swift pre-flight after S3. 5 Swift-side gaps are left (S2: 44,
  S1: 334). Each is a For Each the plan feeds no items, which the React export does not draw either.

Re-run all of it: `cd packages/nodegx-export && NODEGX_SWIFT_BUILD=1 npx jest tests/the-same-graph-in-swift-s3.test.ts`
(add `NODEGX_S3_EVIDENCE=<this folder>/noodl-desk-three-arms.json` to rewrite these files). About 90 seconds, two Swift
builds.

## The mutants (source edited, §A or §D re-run, source restored from a kept copy)

| mutant | what changed | rows that went red |
|---|---|---|
| M1 | `Drive.settle` no longer waits for requests in flight | none: on a local backend every answer lands inside the 80 ms quiet window. An equivalent mutant here; a slow backend (S4) would need it |
| M2 | Done reads the run's outputs as they were at its first `await`, not the node's after the body finished | A1 and A2 both ways, A5 (`doneN` is empty where it should be `2`) |
| M3 | `localStorage` read by key answers nothing (S2's host read only by method) | every signed-in row (A1–A5): the client never sees the stored session |
| M4 | the Swift `Session` never subscribes to the client's session changes | D1, D2b: Log In and Log Out never reach the page |

## Found and fixed before commit

- The transform left `import.meta` on an `export const` line (it rewrote only the other lines). JavaScriptCore refuses
  `import.meta` outside a module, so the client did not load. §C (every template's client loaded in a bare context)
  found it on its first run, in all 7 templates whose export writes a client. The Noodl Desk's endpoint line is such a line.
- S2's §C2 put "Which task did the link ask for" with the Functions the plan defers. It runs behind the session Condition,
  in React too, so it was one of the two "behind the session". It runs in Swift now, where React runs it.
- A For Each fed by a query (or Static Data) was reported as "the plan feeds it no items". The Swift printer read only
  `itemsExpr`; React reads `itemsQueryId` and `itemsStaticId` as well. todo-list's five are truly unfed (checked).
