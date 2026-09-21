# Planner demo

The planner with the backend taken out, which is what nodegx.io serves. It is the same app as
`templates/planner/` — the same envelopes, the same week, the same evening drawer — reading and
writing an invented week in the browser instead of a database.

🔴 **Do not start a project from this one.** It cannot keep anything: close the tab on another
machine and the week is not there. Start from **Planner**, which stores your week in the NodeGX
backend, and read `docs/START-HERE.md` there.

## What is different, and nothing else is

Every component here is *computed* from the template when `npm run template:planner` runs, so the
demo can never be older than the template. The transform lives in
`packages/noodl-mcp/tests/tpl010Demo.ts` and changes exactly this:

- **`Logic/Planner data`** reads the week from this browser's local storage (`nodegx-planner-demo-v2`),
  and puts the example week there the first time it finds none. It keeps the template’s own week
  window and arrows, so `‹ ›` moves through the weeks the way the app does.
- **Every command writes to that same store.** Each record node became one Function with the same
  id, the same fields and the same `done` / `failure` outputs.
- **There is no sign in.** The week loads when the page opens. **Reset demo** in the app bar (where
  the app has Sign out) puts the example week back.

## The week in it

Invented, and dated from the day you open it: the days behind you are logged, today is half done,
the rest is planned. The clients, the figures, the rates and the cash are all made up — no real
income appears anywhere in this repository.

