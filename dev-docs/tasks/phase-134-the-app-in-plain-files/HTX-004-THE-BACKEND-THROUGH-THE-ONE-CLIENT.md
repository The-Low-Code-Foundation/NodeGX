# HTX-004 — The backend through the one client

**Phase:** [134](README.md). **AC:** AC3. **Sessions:** 1. **Needs:** HTX-003.

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
  the HTML export; sign in, add, tick, delete, reload. The wire read from the backend's own request log, split by
  step. The three arms equal at every step, or the difference filed.
- The two writes EXP-022 S6 fixed in both exports (add, and every dialog) work here too.
