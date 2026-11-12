# HTX-004 — The backend through the one client

**Phase:** [134](README.md). **AC:** AC3. **Sessions:** 1 (now 2). **Needs:** HTX-003.

**Status (2026-11-04, session 7): ✅ done.** The Build was graded in jsdom in session 6 (README §10,
`tests/html-the-backend.test.ts`). The Chrome drive ran in session 7 ([`htx-004/`](htx-004/README.md)). The HTML export
equals the React export at all 12 steps, request for request. All three arms agree on sign in, add, close, reload and
sign out, and the field keeps its cursor. The one difference, filed: neither export can open a task
(P134-HTX004-SELECTREFUSED, the plan's). todo-list has no delete to drive.

## The sentence

> "The plain-files todo app signed me in and showed the same lists as the NodeGX app and the React export, on the same
> backend."

## Build

- The React export's client (`src/lib/noodl.ts`, `src/api/client.ts`, written per project by EXP-020) type-stripped at
  export time into `lib/noodl.js` and `lib/api.js`, the route Swift S3 measured (`emit/swift/client.ts`). One client,
  three hosts. A React module-line shape the stripper does not know throws by name (Swift S3's rule).
- Record verbs, Cloud Functions, `Noodl.Users` wired to it as React's printer wires them.

## Done when

- todo-list driven in Chrome against one fresh backend per arm (EXP-022 S4's rule): the runtime, the React export and
  the HTML export; sign in, add, tick, delete, open a task's page and come back, reload. (Open and back are HTX-003's
  drive, moved here on 2026-11-04 because todo-list's lists are records; HTX-003's sentence is graded here: the list
  right, the field keeping its cursor, nothing run twice.) The wire read from the backend's own request log, split by
  step. The three arms equal at every step, or the difference filed.
- The two writes EXP-022 S6 fixed in both exports (add, and every dialog) work here too.
