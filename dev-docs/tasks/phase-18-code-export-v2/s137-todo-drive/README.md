# s137 — EXP-021 AC1, todo-list driven on a backend (P18 session 137, 2026-10-22)

## What the drive is

`templates/todo-list`, copied and bound to one real `nodegx-backend` from `src` on :8597 running the template's own policy
(`devOpen: false`; an anonymous read is refused). One account seeded through the REST API with its own session: four
tasks (one done, one due today), two next actions, one history line, one daily routine (`backend.ts`). Three arms in one
headless Chrome (`--use-mock-keychain`), each signing in through the app's own Sign in page and pressing its own tabs:

- **runtime**: `scripts/devtools/render-from-disk.js` on the bound copy. 🔴 The viewer bundle it serves was older than two
  runtime commits (one to `simplejavascript.ts`, the Function node, which todo-list is made of): rebuilt from HEAD first
  (`noodl-viewer-react` `npm run build`, 07:42).
- **export-head**: the copy emitted by HEAD's export `src` (a `git archive` base, deleted after), built with the export's
  own `npm run build` (`tsc -b && vite build`) against npm's packages (react-router-dom 7.18.4, `@nodegx/core` 0.1.0), as a
  person builds it. tsc 0.
- **export-fixed**: the same, emitted after this session's change. tsc 0.

`EXPECTED.md` was written before any arm ran. `./build.sh`, then `node drive.cjs` (it starts and stops the backend, the
runtime server, the two static servers and Chrome). `readings.json` holds every reading, request and console line;
`shot-D2-*.png` the list after signing in.

## Reading the page first found the blocker

The emitted page dropped every list's `rows` wire: "instance output "openRows" is not lifted by /Logic/Task rows". Task
rows (and Today rows, Log rows, Selected task, Selected routine) is Component Inputs → one Function → Component Outputs,
and the Function reads the clock, so it is an **arrival run** (EXP-019 slice 2, no Run wire). The hook ran it and kept its
row; the lift pass resolved the Component Outputs read before that run had compiled and refused it ("that run writes no
row this read can reach"). `useTodoData` fetched every list, and nothing reached the page. Filed and fixed:
**P18-S137-ARRIVALLIFT** (high). The census on the templates: 65 refusals carry that reason, 57 of them Component Outputs,
in 9 templates (`census.cts` → `census.json`).

The fix: the lift pass compiles an arrival-run feeder first, with every Function upstream of it, exactly as the sink loop's
`compileFunctionFeedersOf` does (so those two helpers are defined above the lift pass now; nothing else moved).

## The drive, against the prediction

| step | runtime | export-head | export-fixed |
|---|---|---|---|
| D0 open `/` | Sign in page | Sign in page | Sign in page |
| D1 sign in | the Todo page (`/`) | the Todo page (`/todo`) | the Todo page (`/todo`) |
| D2 tabs | `List (3)` `Today (2)` `Done (1)` `Log` | **three blank buttons**, `Log` | `List (3)` `Today (2)` `Done (1)` `Log` |
| D2 list | 1 MOT · `Next: Ring the garage`; 2 VAT · `Due today`; 3 release notes | **"Nothing on the list."** | the same three, the same lines |
| D3 Done | Renew the domain · Paid for three years. · Closed Wed 21 Oct | no button to press | the same |
| D4 Today | 08:00 Take the tablets; Due today VAT; Things that repeat: Take the tablets, Every day at 08:00 | no button to press | the same |
| D5 Log | Today · 06:48 · Book the van in for its MOT · Added the task | "Nothing has happened yet." | the same |
| console errors | none | none | none |

Every graded cell is as predicted. **AC1 holds: the page's lists fill from the backend in both arms**, the same rows in
the same order with the same lines.

### What I predicted wrong

- **The requests.** I predicted the export would make none of `/Logic/Projects`'s requests, because the report lists
  "Read the projects and the money" as left out. Both export arms queried `Project`, `MoneyItem`, `MoneyMark` and
  `BalanceReading`. The node has two Run wires: the hook's `refresh` (exported, it runs) and "Bring Planning's moves over"'s
  `changed` (refused). The report calls the whole node left out. Filed **P18-S137-HALFREFUSED** (low, open). 🔴 I took the
  report's sentence as a fact about the code; the requests were the fact.
- The runtime asked for `Task` once more at the end (Projects' `changed` refreshing the list); the export did not, because
  that trigger is the refused one.

### What differs and is not AC1 (recorded, not chased)

- **The look**: the runtime opens dark, two columns, drag handles, one theme icon and no bell; the export opens light, one
  column, both bells and both theme icons. All of it is `App`'s CSS Definition ("The page ground, the dark palette, which
  theme icon shows and whether the bell does") and "Put back the theme the person chose", refused as **"node beside the
  router shell"**: 77 template nodes, 15 of them whole CSS Definitions. The report says so; a ranking candidate.
- "Also keep track of projects and money" is not drawn in the export (Projects' `showTurnOn` is not lifted; predicted).
- After sign-in the runtime's URL is `/` and the export's `/todo` (both routes draw the Todo page in the export).
- Selecting a task (pressing a row) was not driven: the export drops the row's `taskId` into the selecting Set Variable.

## Graded beside the drive

- `tests/a-logic-component-is-a-hook.test.ts` **25 / 25**: the Hook Desk gained `/Logic/Stamp`, an arrival run lifted to the
  page (A7, its column predicted in `EXPECTED.md` first; the runtime read it, A1), C7 the plan, E7 todo-list's Task rows
  lifts its rows and the page hands them to the Task list. A mutant that switches the new branch off fails A2, A7, C1, C7
  and E7 by name. (The first mutant, `false && …`, did not compile and read "0 total": s133's trap again.)
- Reach (`dispdiff.cts`, HEAD's `src` against the tree; `dd.py` summarises): **templates 61 gained, 0 lost, 5 re-worded**
  (planning 13, rocket-school 10, star-class 10, planning-demo 8, todo-list 6, todo-list-demo 5, digital-bricks-training 4
  + 4, bot-garden 1; the re-worded are planning's data loader now naming its next refusal); **corpus 18 gained, 0 lost**.
- `tplbuild.cts`: all 17 at the floor (1 in 1, nightbook STYLENULL). Package `tsc --noEmit` 0.
- Whole package (`nice -n 19 --runInBand`, JSON 08:06): **154 suites, 5,246 passed, 0 failed, 3 skipped** (predicted 5,243
  + 3 = 5,246; read on the first run).

## Files

`EXPECTED.md`, `backend.ts` + `run-backend.cjs`, `emit.ts`, `build.sh`, `drive.cjs`, `readings.json`, `shot-D2-*.png`,
`census.cts`/`census.json` (the templates' refusals on the tree before the fix), `dispdiff.cts`, `dispdiff.json`,
`dispdiff-corpus.json`, `dd.py`, `tplbuild.cts`, `tplbuild.json`. `work/` (gitignored) holds the bound copy, both builds
and npm's packages.
