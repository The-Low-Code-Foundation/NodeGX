# P18-S111-RECORDLIVE drive: expected readings, written before the drive

`record-desk` (packages/nodegx-export/tests/fixtures/record-desk): one page with a "page id" input, two Records on that
Id (Fetch unwired, so each reads whenever the Id changes), each showing its `title` in a Text: **Shown** has "Record
properties" ticked (the default), **Frozen** has it unticked. Below them a `Rename` component (a separate visual
component, "elsewhere in the app") with a "new title" input, a Save button wired to a Set Record Properties on the same
Id, and that node's Error in a Text.

One real `nodegx-backend` (from `src`) on :8594 with one `Page` record seeded, `title: "Home"`. Three arms in one
headless Chrome, each from a fresh page load, the record's title reset to `Home` through the backend before each:

- **runtime**: the fixture served by `scripts/devtools/render-from-disk.js`, its endpoint pointed at :8594;
- **export-control**: the export with the store and the subscription switched off (what HEAD emits for this app);
- **export-fixed**: the export as committed.

The reading is the page's visible text, line by line (`innerText`; an empty Text has no line).

| step | runtime | export-control | export-fixed |
|---|---|---|---|
| D0 load | `Record Desk`, `Save` | same | same |
| D1 type the seeded id | Shown `Home`, Frozen `Home` | same | same |
| D2 type `Welcome`, press Save (backend answers 200) | Shown **`Welcome`**, Frozen `Home`; no error | Shown **`Home`** (the defect), Frozen `Home` | Shown **`Welcome`**, Frozen `Home` |
| D3 backend's record read directly | `title: "Welcome"` | same | same |
| D4 the browser refuses the next PUT (CDP `Fetch.failRequest`, `ConnectionRefused`), type `Gone`, press Save | Shown back to **`Welcome`** (the old value put back, P107-C34), Frozen `Home`, an error line | Shown `Home`, Frozen `Home`, an error line | Shown back to **`Welcome`**, Frozen `Home`, an error line |

Not predicted: the exact wording of D4's error (the runtime's network-failure sentence and the export's "Could not
reach the backend at …" are two producers), and any intermediate frame (the optimistic write shows before the answer;
`tests/the-live-record.test.ts` §C grades that order).

## Run 1 read, and why there is a run 2

Run 1 (`readings-run1-effect-form.json`) read every export cell as above. The runtime arm did not: at D1 it showed no
title and made no request, because a runtime Record's Id only binds it to the record the app already holds; it reads
the backend only on Fetch (dbmodelnode2.ts, and the published doc). That is the export's own defect, filed as
P18-S113-IDBINDREAD. At D2 the runtime showed one `Welcome` line: the ticked Record picking up the Set Record
Properties write through the shared record, which is this row's behaviour, seen in the runtime itself.

So for run 2 the fixture takes the documented record-detail flow: a **Load** button wired to both Records' Fetch, and
"Record properties" ticked by hand on Shown (with Fetch wired an unstated box is settled unticked, as the editor
settles it). Expected, written before run 2:

| step | runtime | export-control | export-fixed |
|---|---|---|---|
| D0 load | `Record Desk`, `Load`, `Save` | same | same |
| D1 type the seeded id, press Load | Shown `Home`, Frozen `Home`; one GET per Record | same | same |
| D2 type `Welcome`, press Save (200) | Shown **`Welcome`**, Frozen `Home`; no error | Shown **`Home`**, Frozen `Home` | Shown **`Welcome`**, Frozen `Home` |
| D3 backend's record read directly | `title: "Welcome"` | same | same |
| D4 the next PUT refused, type `Gone`, press Save | Shown back to **`Welcome`**, Frozen `Home`, an error line; backend still `Welcome` | Shown `Home`, Frozen `Home`, an error line | Shown back to **`Welcome`**, Frozen `Home`, an error line |
