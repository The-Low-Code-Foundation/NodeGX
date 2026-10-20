# The failure runs its chain (P18 session 123, 2026-10-17)

The measurements and the drive behind EXP-011 §90. Each `.ts` names its usage on its first line; run them from
`packages/nodegx-export` with `../../node_modules/.bin/ts-node -P tsconfig.json --transpile-only <script> $PWD/src <roots…>`.
The shipped templates are `templates/` plus the two `*.content.json` written out by `../s119-fnchain-measure/materialize.ts`.

| script | what it reads |
|---|---|
| `conds.ts` | every Evaluate-wired Condition, its disposition, its reason and the sender of its Evaluate (the census that picked this session's target) |
| `after-await.ts` | every action list where an awaited call is followed by another action of the same list, and where the two write the same state |
| `locals.ts` | every catch-local read (`outcome-error` with no row) outside the Failure chain whose catch declares it (0 in 238 projects, before and after) |
| `twowires.ts` | every Set Variable / Global Store Set with two or more wires into Value, and its disposition |
| `gen-fail-desk.py` | the suite's fixture (`packages/nodegx-export/tests/fixtures/fail-desk`), or the folder given |
| `drive.cjs`, `build.sh` | the three-arm drive: the runtime (`render-from-disk.js`), the export from the tree, the export from HEAD `06ea65ea3` |

## What was measured first

`conds.ts` over the templates: of the Conditions §87 left deferred, the senders are a Delete's Failure (members-area's
Announcement and Meeting), Log In's and Sign Up's Failure (members-area's, todo-list's, the Site Builder's and the
planner's Sign in), New Record's Done (members-area's Post: refused for its access-control rules, not for the chain) and
an External Link's Done (landing-pages' contact: its Function is fed by a `/Site/Field`). Every record and user verb
refused a wired Failure outright ("only the done chain and the Error value are translated in this slice").

## What reading the gains found

The count said "22 gained, 0 lost". Reading the emitted diff of every gained node found three things the count hid:

1. **The order.** todo-list's Sign in fires Log In, then puts the refusal away. The export awaited the request, then
   ran the clear, so the refusal vanished as it was shown. The runtime's Log In, Delete, Cloud Function and HTTP Request
   all act in an after-update callback and their request answers later, so a click's later wires run first. HEAD
   already had it for a Cloud Function: digital-bricks-training's Settings sets "preparing" on its next wire, and the
   export said "preparing" for ever (`after-await.ts`: 4 lists at HEAD, all Cloud Functions; 14 in the tree).
2. **A shared sink.** One Set Variable run by two Failure chains was compiled once (`compiledSinks` is keyed by node and
   port), so Sign Up's catch read Log In's catch local (planning's Sign in; a name the catch never declares), and a
   button beside a Failure chain read it too.
3. **The first Value wire.** A Set with several Value wires compiled the first and dropped the rest; the runtime's Value
   holds whichever wrote last, which at a sender's pulse is the sender's own (nightbook's toggles, planning's two
   verbs). 36 such Sets on this machine, all refused for something else at HEAD; this session's chains reached two.

## The drive

`fail-desk`, S0 load, S1 Remove, S2 Remove, 4 s after each real click, one headless Chrome.

- **Run 1, no backend** (`readings-run1-nobackend.json`, `shot-run1-*`). The runtime refused before any request
  ("This project has no backend configured"), so its Failure ran before the clear: refusal hidden, message in Error and
  Said. The fixed export's no-backend stub throws from an `async` function, so its catch ran after the clear: refusal
  shown. Two ways of not being connected, not a failed request (P18-S123-STUBORDER, low, filed).
- **Run 2, a backend declared at `localhost:8599`, where nothing listens** (`fail-desk-backend`, `readings-run2.json`,
  `shot-run2-*`). **The runtime and the fixed export agree at every step**: the refusal shown after each Remove, Error
  and Said the same message in each ("Object not found." in the runtime, "Could not reach the backend at
  http://localhost:8599" in the export; which server answered the runtime's request was not traced). HEAD's export never
  changes: its Remove is not wired.

The runtime shows "Text" in an unwritten wired Text (P18-S122-TEXTDEFAULT).

## Running it again

`python3 -I gen-fail-desk.py "$PWD/fail-desk"` (run 2: `fail-desk-backend`, with `metadata.cloudservices` added as in
the session: endpoint `http://localhost:8599`, app id `backend_faildesk`). Emit the fixed arm from the working tree with
`../s119-pulse-drive/emit.ts`, the control from a copy of the package at HEAD (`packages/.nx-ctl-s123`, `git archive
HEAD`, removed after). Then `zsh build.sh` (run 2: `DEFINES='--define:import.meta.env.VITE_NODEGX_ENDPOINT="http://localhost:8599"
--define:import.meta.env.VITE_NODEGX_APP_ID="backend_faildesk"'`) and `node drive.cjs` (run 2: `FIXTURE=fail-desk-backend RUN=run2`).
