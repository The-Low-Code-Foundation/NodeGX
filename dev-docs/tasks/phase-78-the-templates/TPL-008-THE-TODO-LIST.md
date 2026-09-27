# TPL-008 — The todo list

**Opened 2026-09-14**, at Richard's request — *"Can we make a new template please (for me this time)"*:

> *"It's the simplest todo list ever, because I HATE task management software with a vengeance."*
>
> - You add a task, it goes in at priority 1; another goes in at 2, but you can move it up or down.
> - The only way to organise tasks is *"what I need to do next"*, and the user decides.
> - You can open a task to add notes, a deadline, and next actions (subtasks), also in priority order only.
> - You can check things off, but you have to write what happened (like Pipedrive), even
>   *"nothing, I just need to delete this task"*, so there is ALWAYS a trace.
> - Traces are stored: priority changes, notes added, completed, uncompleted, etc.

**Status: 🟢 BUILT, GATED, DRIVEN — with light and dark (s4) — and the demo is PUBLISHED: <https://nodegx.io/templates/todo-list/>.**
`npm run template:todo` → `templates/todo-list/` **and** `templates/todo-list-demo/`. AC1–AC7, AC9, AC10 and **AC11** green
(gates 43/43, template drive 14/14, demo drive 10/10, theme drive 9/9; the public URL driven 19/19).
**s8 (2026-09-20) answered Richard's two reports on a next action — an editable title and a description that saves and
closes — and republished BOTH sites.**
**AC8 is Richard's week of use. R11: the backend stays on his computer; sign-in from other devices and hosting are a later phase.**

---

## 1. Rulings (2026-09-14, from the two mockups)

The mockups are Artifacts: v1, then v2 — the one he approved.

| # | Question | Ruling |
|---|---|---|
| R1 | Delete | **There is no delete.** Closing is the only way a task leaves the list, and it always asks *"What happened?"* — "Good call" |
| R2 | Where new things go | **The bottom.** New and reopened tasks join at the end; nothing jumps the queue unless you move it — "Good call" |
| R3 | Notes | **Notes are history entries**, append-only, not an editable box — "Good call" |
| R4 | Next actions | *"sub tasks could also have descriptions and close notes I think, better try it and then change my mind if it's too much?"* — a next action has a **description**, and **ticking or unticking one asks for a note**. Easy to relax if it grates. |
| R5 | Move noise | **A burst of moves collapses** into one line ("Moved #3 → #1"); only the task you moved gets a line — "Good call" |
| R6 | Row meta | The row shows the task's **next next-action** — "Yep" |
| R7 | Name | **"Todo list"**, not "Then." — "Nope, just Todo list is fine" |
| R8 | Look | v1 was *"trying too hard"*. **v2: one system font, three sizes, one accent, red only for overdue** — "Love it, build it please" |
| R9 | The nodegx.io demo (s2) | **A browser-only demo mode** — not a public backend on nexus-1, not screenshots. A second data layer, to be kept in step with the backend one |
| R4a | A note on every tick (s2) | **"Try it first, decide after use"** — unchanged until Richard has used it |
| R10 | Light and dark (s4) | *"dark and light mode, matching system by default but with a little icon at the top right for changing"* — built s4 (§3b) |
| R11 | Phone, sign-in, hosting (s4) | *"Just let it run locally for now, only on the computer, and we'll do logging in and cloud hosting in a later phase"* — **the backend stays on localhost; the phone half is a later phase, not a TPL-008 gap** |

### 1a. Storage — decided by me, at Richard's request (*"you decide, my head hurts"*)

**Wanting the list on both phone and PC is what decides it: the list has to live on a server.** `localStorage` plus a download-a-backup
button protects against loss but syncs nothing; phone-key signing with a QR hand-off (the *nexus* shape) is a sync protocol,
the wrong project for "the simplest todo list ever". The NodeGX backend already has users, sessions, per-row ACLs and one
SQLite file, so the template connects to it and uses nothing else.

## 2. Data

| collection | fields | policy |
|---|---|---|
| `Task` | `title`, `position` (lower = sooner), `status` `open`/`done`, `deadline` `YYYY-MM-DD`, `closingNote`, `closedAt` | signed-in find/get/create/update, **delete `nobody`**, creator owns |
| `Action` | `taskId`, `title`, `position`, `done`, `note`, `description` | same |
| `Event` | `taskId`, `kind`, `summary`, `body`, `at` | same |

- **`position`, not `rank`.** Ranks are derived when read. Moving swaps two positions (two writes), "Move to #1" is `min − 1`,
  adding and reopening are `max + 1`. Closing a task rewrites nobody else's row.
- **`delete: nobody` everywhere**, so "nothing is lost" is enforced by the backend, not only by the missing button. Driven: the
  owner's own `DELETE` answers **403**.
- ⚠️ **`Event.update` is allowed** — R5's collapse updates the line it extends. A person can therefore edit their own history
  through the REST surface. Accepted: it is their own list.
- ⚠️ **`signup: public`** so a person can make their account. `START-HERE.md` tells them to set it to `nobody` afterwards.

## 3. How it is built

Through the plan door, like TPL-007. Sources: `packages/noodl-mcp/tests/tpl008{Components,Template,Theme}.ts`; policy
`templates/todo-list.security.json` (copied in last); generator `scripts/generate-todo-template.ts`.

**36 components** (s4): `App`, 16 in `Todo/` (what you see, including the theme switch), 5 in `Logic/`, 12 in `Commands/`, 2 pages.

- **`Commands/*`** — one component per thing a person can do (add, move ×3 placements, close, reopen, rename, set deadline,
  add/tick/untick/move/describe a next action, add a note). Each: a guard `Function` → the record write → `Logic/Write history`.
- **`Logic/Write history`** — the only writer of `Event`; it decides create-or-extend for R5.
- **`Logic/Todo data`** (s2) — the four queries, the only reader. `refresh` loads everything; `loadHistory` the selected task's.
- **`Logic/Task rows` / `Selected task` / `Log rows`** — what the queries load, turned into what the screen draws.
- **`Todo/Dialog flow`** (s2) — "what happened?" for close, reopen, tick and untick: one input per producer, one confirm per question.
- **`Pages/Todo`** (51 nodes, was 71) holds the selection and places the rest; **`Pages/Sign in`** makes or opens an account.
- The deadline is **typed** (`YYYY-MM-DD`, `today`, `tomorrow`), because Text Input has no date type — **D73**.
- Icon buttons carry their name as a hidden label (`styleCss: 'font-size: 0;'`), because Button has no accessible-name port — **D72**.
- The two app-wide Variables in components drawn more than once (`todoLastHistory`, `todoProblem`) carry a node comment
  **"Shared on purpose: …"** — GAM-005's escape (s3).

### 3a. The demo (AC10, R9) — `packages/noodl-mcp/tests/tpl008Demo.ts`

**Derived, never written twice.** `TPL008_DEMO_COMPONENTS` is computed from `TPL008_COMPONENTS` on every generation, so a change
to a command, a row or a script reaches the demo with no one remembering. The generator writes both projects in one run.

- **Every record write** (15: 13 in `Commands/`, 2 in `Write history`) becomes a `Function` **at the same node id**: `prop-<f>` →
  `in-<f>`, `store` → `run`, `modelId` → `in-modelId`, `done`/`id`/`failure` → `out-*`, every input Run On Value Change off.
  It writes the whole list as one JSON string to `localStorage['nodegx-todo-list-demo-v1']`, with a copy on `window` so a
  blocked storage still works for the visit.
- **`Logic/Todo data`** keeps its interface plus `reset`: one reader whose collections, sort orders, filter and limits are
  **read off the backend queries** at build time, and which puts the example list in the store the first time it finds none.
  Reset forgets the list **and `todoLastHistory`** (see §7 s3 — without that a move after reset does not save).
- **`Pages/Sign in` is gone**; `Pages/Todo` loses its four sign-in nodes and six wires and loads on mount. **Sign out is
  Reset demo.** A line above the header: *"This is a demo. Nothing you type leaves this browser, and Reset demo puts the
  example list back."*
- The example list: four tasks added four days ago, one moved to #1, one overdue (red), one closed with a note, three next
  actions (one ticked with what happened), 13 history lines — each worded as the command that makes it would word it.
- 🔴 Anything the transform does not recognise (an unmapped record port, a query outside `Todo data`, a page wire count
  that drifted) **throws** at generation, rather than shipping a backend node that loads clean and saves nothing.

### 3b. Light and dark (R10, s4) — `tpl008Theme.ts` → `themeCss()`, `Todo/Theme switch`

**Nothing in the runtime knows about dark mode, so it is a stylesheet.** The project's tokens arrive as `:root { … }`
(`ProjectTokenCss`); `App`'s `CSS Definition` adds `TPL008_DARK_TOKENS` on two more specific selectors:
`@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) }` (the system decides, live, no script) and
`:root[data-theme="dark"]` (chosen on a light system). Every colour token the light set overrides is overridden, by name,
and gate §4 recomputes every contrast pair against both sets (dark: lowest text pair 5.77, control edge 4.51).

- **The switch is two icon buttons, and the stylesheet shows one** (`cssClassName` `todo-theme-to-dark` / `-to-light`), from
  the same conditions as the palette. 🔴 Not one button with a wired icon: a `Function` publishes only on change, and
  "which icon" would have two producers (load and click) — the stale-value trap. A system that turns dark at sunset changes
  the icon with the colours.
- **`data-theme` is written only when the choice DIFFERS from the system** (`THEME_FLIP_SCRIPT`), so picking the system's
  own theme forgets the choice and the page follows the system again. Kept in `localStorage['nodegx-todo-list-theme']`, with
  a copy on `window` when storage throws.
- `App` has a `Function` with **nothing wired**, which the runtime runs once at load (`simplejavascript.ts`: the script
  setter schedules a run when `run` is unconnected) — it puts a remembered choice back on every page.
- Placed at the end of the Header's nav (top right) and in a top-right row on Sign in. No `Variable`, so two placements
  raise nothing. Node ids are `th…`: ids are unique across the project, and the first try's `tsRoot` renamed Task
  summary's own to `tsRoot-2`.
- The demo inherits it with no transform change: `App` and `Todo/Theme switch` are the template's.

## 4. Acceptance criteria

| AC | Criterion | Result |
|---|---|---|
| AC1 | Generates reproducibly with 0 refusals | ✅ gate §1 compares every byte; 0 warnings, 148 infos (s3: after the GAM-005 comments) |
| AC2 | The policy validates, and denies delete on all three collections | ✅ gate §2 (with a control the validator rejects); drive §6: owner `DELETE` → 403 |
| AC3 | Sign up → three tasks list 1, 2, 3 in the order added | ✅ drive §1, account made on the page, each task has "Added at #n" |
| AC4 | Move #3 up twice → 3,1,2 and ONE line "Moved #3 → #1" | ✅ drive §2, read off the server |
| AC5 | Close needs a note; closed task leaves the list, shows under Done, has a `closed` line | ✅ drive §3: OK disabled until typed; "Closed from #2 \| note" |
| AC6 | Next actions: add, tick-with-note, describe; each leaves a line | ✅ drive §4–§5; **s3: untick driven** ("Unticked “…” \| note", position to the bottom) and **reopen driven** (§5b: "Reopened at #3 \| note", closing note and date cleared) |
| AC7 | A second account sees none of the first account's rows | ✅ drive §6: Task/Action/Event 0/0/0 |
| AC8 | Richard's look, and a week of real use | ⬜ Richard |
| AC9 | Every icon button has a name a screen reader says; the icon shows and the words do not (D72) | ✅ s2 gate §4 (sabotaged) + drive: Chrome's AX tree |
| AC10 | A browser-only demo mode for nodegx.io (R9) | ✅ **built, gated 18/18, driven 10/10, PUBLISHED** (s3): shipped `nodegx deploy` on the production engine, `drive-tpl008-demo.js` 12/12 on the folder and **12/12 on <https://nodegx.io/templates/todo-list/>** |
| AC11 | Light and dark: follows the system, a switch at the top right overrides it, the choice is remembered (R10) | ✅ **s4**: gate §4 both palettes AA + §4b (4 rules); `tpl008-theme-drive.test.ts` **9/9** (sabotaged: the sun's hide rules removed → exactly §0 and §2 red); template drive reads the switch on Sign in; **republished, live 16/16** |

Gates: `packages/noodl-mcp/tests/tpl008Template.test.ts` **24/24** · `tpl008Demo.test.ts` **18/18** ·
`packages/nodegx-backend/tests/tpl008-todo-drive.test.ts` **14/14** · `tpl008-todo-demo-drive.test.ts` **10/10** ·
`tpl008-theme-drive.test.ts` **9/9**, all drives **0 console errors** · `tsc -p packages/noodl-mcp --noEmit` exit 0 ·
`scripts/devtools/drive-tpl008-demo.js` **19/19** on the built folder and on the live URL. Pictures: `TPL008_SHOTS=<dir>`.

## 5. Not in this build

- File uploads (Richard: *"maybe not file uploads yet (complicated)"*).
- Paging: the queries cap at 1,000 tasks, 1,000 next actions and 1,000 history lines per task; the Log shows the latest 300.
- The in-editor template shelf: the demo is a static page on the marketing site, like TPL-006's; the shelf is T3's.

## 6. Questions for Richard

1. ~~The public demo on nodegx.io~~ — **ruled R9 (s2): browser-only demo mode.** Built in s3.
2. **R4 in practice**: is a note on every tick of a next action too much? **Deferred by Richard (s2) until he has used it.**
3. ~~AC10 defaults~~ — built as proposed; Richard looked at it running locally: *"Looks great"*.
4. ~~Publish the demo?~~ — *"you can push to the nodegx site as a template"* — **published s3 at `/templates/todo-list/`.**

## 7. Session log

### s1 — 2026-09-14: mockups, rulings, built, gated, driven

**Built** in one pass through the plan door. The door refused four things while building, each fixed at the source:
`paddingTop` on a `Text` (a Text has no box) and `mounted` on three component instances (an instance has only the ports its
Component Inputs declare, so each view is gated on a wrapper Group). It warned once: `gate-only-turns-on` on the sign-in
error, fixed with a constant-false Condition fired by each new attempt.

**Driving found three things the gate and the door could not:**

1. 🔴 **D71 — a wired `run` does not make a Function signal-only**, although `get_node_type` says it does. `Commands/Move
   task` had one input (`in-itemId`) wired from outside its guard list with the box still ticked, so clicking ANY row moved
   that task. The first drive read **three `moved` lines where one was expected** and "Closed from #3" for a task at #2, all
   with 0 console errors. Fixed (`quietIns`), and gate §3 now fails on any run-wired Function with a ticked wired input.
   **Sabotaged:** removing the fix reddens exactly `Move task` and `Move action`; restored by `cp`, md5 matched.
2. 🟠 **A filter parameter has its own Run On Value Change box** (`dbcollectionnode2.ts:1145`), ticked by default and NOT
   covered by the `collectionName`/`querySettings` boxes. The history query's `qp-taskId` fetched at boot for a signed-out
   visitor, and the only trace was a 403 in the console (attributed to boot by the drive's per-step error log). Fixed: the
   box off, the filter fed straight from the selection variable, and history fetched only when a task is selected.
   ⚠️ **Candidate, UNMEASURED:** TPL-001's `NO_LOAD_TIME_FETCH` has the same gap on the meetings query's `qp-today`.
3. The deadline refusal, rename and note all worked first time.

**Looking found one thing no check could:** the page ground stopped under the content and the rest of the window was white
(body scroll makes the App's 100% height the content's height). Fixed with a `CSS Definition` on `App`.

**Filed:** D71 (catalog text), D72 (an icon-only Button has no accessible name — the up, down and tick buttons are silent to a
screen reader), D73 (Text Input has no date type). All three owner `NONE`.

**Open, deliberately not done:**
- ~~`Pages/Todo` is 70 nodes~~ — split in s2 (71 → 51).
- The page's selection and dialog use app-wide Variables (global by name). Correct for one page, and it would need revisiting
  if a second page placed them.

**Committed in s2** as `2ad64ccee` (every s1 path) and `7b6f7c650` (D71–D73), each from a private `GIT_INDEX_FILE` holding
only TPL-008's hunks, so the peer's TPL-007 and P88 edits in `package.json`, `NEXT-SESSION-PROMPT.md` and
`DEFECTS-THE-TEMPLATES-FOUND.md` stayed unstaged and theirs.

### s2 — 2026-09-14: Richard's rulings, D72 fixed in the template, `Pages/Todo` split, committed

**Rulings** (asked at the start): R9 — the demo is browser-only; R4a — the note on a tick stays until he has used it.

**D72, fixed in the template (AC9).** A Button writes its `label` inside the `<button>`, and the icon's size is set on the
glyph, so `label: 'Move up'` plus `styleCss: 'font-size: 0;'` gives the button a name and shows only the icon. The tick box's
name is wired from the row (`checkLabel`: "Mark done" / "Mark not done"). Names were chosen not to collide with the dialog's
"Close task" / "Tick off", which the drive clicks by exact text. **Measured, not assumed:** the drive reads Chrome's
accessibility tree (`Accessibility.getFullAXTree`, private-use icon glyphs stripped) — 9 named list buttons, 0 nameless, the
tick box renamed after a tick — and the first "Move up" computes `font-size: 0px`, its icon draws, its words are 0px wide.
Gate §4 rule sabotaged (one label removed → exactly that rule red, plus the byte-identical check); restored by `cp`, md5 matched.

**The split.** `Logic/Todo data` (9 nodes: the four queries, the has-a-task gate, the load-problem setter, and its own reader
of the selection variable, so the history filter still has the new id before `loadHistory` fires). `Todo/Dialog flow`
(18 nodes: the dialog, the mode States node, three variables, six setters, four gates) — each producer keeps its own input,
so the list's close and the detail pane's close still never share a value port. The refresh `Function` became the component's
`refresh` signal input. `Pages/Todo` **71 → 51 nodes**; the door still says `oversized-page` (the 15 command placements are
the page's job). Re-gated 20/20, re-driven 12/12 with 0 console errors; the drive closes from the list and ticks a next
action through the new flow. ⚠️ **Reopen and untick are not driven** — same wiring shape, unclicked.

**Set up for Richard to use (his ask), localhost only:**
- Project copy: `~/vscode_projects/NodeGX test projects/Todo list` (starter assets placed, `cloudservices` →
  `{appId: todo-list, endpoint: http://localhost:8690, type: nodegx}`).
- Backend: `~/.noodl/todo-list/data`, the todo-list policy installed before first start, **ENFORCED**, persistent. Started from
  the repo with `node packages/nodegx-backend/bin/nodegx-backend.js serve --data-dir ~/.noodl/todo-list/data --port 8690
  --backend-id todo-list --backend-name "Todo list"`. Outside `~/.noodl/backends/`, so the editor's supervisor never starts a
  second copy. It is a process of the session that started it — re-run the command after a reboot.
- 🔴 **The phone half was NOT done.** Binding the backend to `0.0.0.0` (the backend's own LAN mode: sessions for data, the
  admin credential for admin) was **denied by the auto-mode classifier as "Expose Local Services"**. That is Richard's call.

**🔴 Found while deploying it: the deploy devtool gutted the list — D44, two more port families.** `deploy-from-disk.cjs`
(rebuilt from source first: the gitignored copy was 09-12, its entry 09-14) exited 0 with **24 of 628 wires dropped by the
health filter**, and the diff against the project names every one: all 18 `For Each` `itemOutput-*` / `itemOutputSignal-*`
wires into a list's `Component Outputs` (row open, up, down, close, tick, untick, describe — the whole list is inert) and 6
into `DbCollection2` (`storageFetch` ×5, `qp-taskId`). Neither family is in D44's table. The site was **not** served to
Richard and was deleted. The editor's **Run** is unaffected (it renders, it does not export); the editor's Deploy button is
still D44's unmeasured hypothesis. Recorded on D44 (owner GAM-024, P88). Also: the devtool must run with cwd
`packages/noodl-editor` (it reads `src/external/deploy/index.json` from the cwd), and it copies `nodegx.security.json` into
the site while excluding `components/` and `docs/`.

### s3 — 2026-09-14: AC10 built — the browser-only demo, derived from the template — and reopen/untick driven

**Built** as §3a: `tpl008Demo.ts` (the transform), `tpl008Template.ts` (`variant: 'demo'`, `prepareTodoDemoArtefact`, its own
START-HERE, no policy), the generator writing both. The door took the demo first time: 0 refusals, 0 warnings, 138 infos,
34 components, only `Pages/Todo` routed.

**Gate `tpl008Demo.test.ts` 18/18.** §1 byte-identical build; §2 no backend node type in the demo — **with the same rule run over
the template as its control** (it finds query, create, update and the four user nodes there); §3 **in step**: exactly the 16
declared components change, only two interfaces change (Todo data `+reset`, Header `signOut → reset`), every template record
write is a Function at the same id **with the same wires in and out** (counted against the sources' 15), every other template
node is in the demo at the same id and type less a named list of 10; §4 the store scripts against a fake browser (seed once,
changes survive, filter/order/limit, update writes only wired fields, unknown id fails and writes nothing, **storage that
throws still works**, reset) and the example list read through the template's own `Task rows`/`Selected task` scripts; §5 D71.
- 🔴 **My own count was wrong first**: I typed 16 record writes; the sources have 15. Fixed by counting the sources, not by
  changing the literal.
- **Sabotaged:** leaving `Close task`'s write unconverted reddens exactly byte-identity, the backend-type rule and the
  record-write rule (naming `ClosetaskWrite`); restored by `cp`, md5 matched.

**Drive `tpl008-todo-demo-drive.test.ts` 10/10, first run, 0 console errors**, no backend port at all, consequences read from
`localStorage`: opens on `/` with the example list in order and the notice; add → "Added at #4"; up twice → ONE "Moved #4 → #2";
close → "Closed from #3 | note"; **reopen** → bottom, "Reopened at #4 | note", note and date cleared; **untick** a seeded action →
position 3, "Unticked “List what shipped” | note"; **a reload keeps the store byte-for-byte**; Reset demo → the example list
(4/3/13); no request to `/classes|users|login|functions|__backend`, **beside a control fetch the same reading sees**.
- 🔴 **Reset had a bug the design would have shipped, and the drive is built to catch it.** The example list's ids are
  constant, and Write history remembers the last line it wrote (`todoLastHistory`) to extend it. Move an example task, reset,
  and move it again inside two minutes: the move tries to extend a line that no longer exists, `update` fails, and **no history
  line is written**. So reset also clears `todoLastHistory`. **Sabotaged:** without that step the drive reads
  `postResetMoveLines []` where `["Moved #3 → #2"]` is expected — only §7 red; restored (md5 matched), regenerated, byte-identity
  green.

**The template's own drive, 14/14 (was 12/12): reopen and untick are driven.** Untick from a ticked line (one button in it) →
`done: false`, note cleared, position 2, "Unticked “List what shipped” | note"; reopen from Done → "Reopened at #3 | note",
`closingNote` and `closedAt` cleared, back at the bottom. The helpers both drives use moved to `tests/helpers/todo-drive.ts`.

**🔴 Found on regeneration: 54 new warnings — GAM-005's rule, a peer's work in progress.** `variable-in-repeated-component`
(uncommitted, `validation/repeatedComponentVariable.ts`, 19:55 today) warned on both builds, which would have reddened gate §1's
"no warning". Measured before acting: **108 lines, 4 holder/name pairs** — `todoLastHistory` and `todoProblem` in `Logic/Write
history` (every command places it), `todoProblem` in `Move task` (×3) and `Move action` (×2). All four are app-wide on purpose:
R5's collapse *needs* the up and down placements to share the last line, and the problem banner shows one sentence. Fixed with
the rule's escape, a node comment beginning "Shared on purpose:" (constants `SHARED_LAST_LINE`, `SHARED_PROBLEM`). The template
artefact changed by exactly 14 `metadata.comment` blocks; 0 warnings on both builds again. **Not a defect** — the rule did what
it says; recorded here so GAM-005 knows a real template met it.

**Shown to Richard, then published at his word.** Served locally with `render-from-disk`. 🔴 **The first copy served was the
SABOTAGED build**: the newest `tpl008-demo-drive-*` temp folder was the sabotage arm's, and `diff -rq` against the committed
demo caught `Logic/Todo data/connections.json` before the link was given; re-served from `templates/todo-list-demo/` plus the
starter `noodl_modules`. He: *"Looks great, you can push to the nodegx site as a template."*

**The publish (TPL-006's recipe):** `node packages/noodl-preview/dist/nodegx-deploy.cjs <demo + noodl_modules>
<site>/templates/todo-list --base-url /templates/todo-list/` → `ok: true`, engine `kind: production`, no warnings, 2.9 MB,
`<base href="/templates/todo-list/">`. New gate `scripts/devtools/drive-tpl008-demo.js` (site root + `--path`, real CDP clicks,
clean storage first): **12/12 on the local folder**. Before pushing, the host's `/srv/nodegx/site` held exactly the local
`site/` (same three templates, same `index.html` md5), so `deploy.sh`'s `--delete` removed nothing. `ops/deploy.sh
49.12.102.195`: neighbours 200 before and after, `index.html` md5 unchanged by `build.py`. **`/templates/todo-list/` 404 → 200,
and the gate against <https://nodegx.io> is 12/12** — first visit, add, move and its line, reload, Reset demo, 0 console and
network errors, no backend request beside a control. ⚠️ `site/templates/` in `nodegx-web` is still untracked (as TPL-006 left it).

`test:ci` / `test:main` not run.

### s4 — 2026-09-14: light and dark (R10), republished; R11 keeps the backend local

**Rulings** (asked mid-session): R10 is the request itself. R11 — asked what "finish the backend" meant, since the backend was
already built and driven: *"Just let it run locally for now, only on the computer, and we'll do logging in and cloud hosting in a
later phase"*. The demo redeploy: *"Yes, redeploy it"*.

**Built** as §3b. Measured before writing: the token block is `:root{}` in `<style id="noodl-design-tokens">`, every colour token the
template draws is a literal there (only spacing and gradients reference other tokens), nothing in the viewer stamps `data-theme`,
`icon-moon`/`icon-sun` exist in the lucide set, and a Function with `run` unwired runs at load. Dark palette computed before it was
typed (lowest text pair 5.77, control edge 4.51 vs a floor of 3).

**Gates:** tsc exit 0; regenerated with 0 refusals and 0 warnings (148 / 138 infos, as before); template gate **24/24** (§4 icon
buttons now include the switch's two, contrast over BOTH palettes, §4b: the dark set names exactly the light set's colours, App's
stylesheet carries each dark token twice, the boot Function has nothing wired, the flip scripts against a fake browser — light and
dark systems, blocked storage, a stored value that is not a theme); demo gate **18/18** unchanged.

**Drives:** `tpl008-theme-drive.test.ts` **9/9** first run, 0 console errors — light → the system turning dark redraws dark with the
sun and nothing stored → the switch picks light and stores it → a reload keeps it → picking dark (the system's own) forgets it and the
dialog panel reads `--surface` dark → the system turning light is followed → dark chosen on a light system. **Sabotaged:** the
`todo-theme-to-light` hide lines removed from the demo's App → exactly §0 and §2 red; restored by `cp`, md5 matched, clean 9/9.
Demo drive **10/10**. Template drive **14/14**.

**Found on the way, all mine:**
- 🔴 **Node ids are unique across the project**: the switch's first root id `tsRoot` made the door rename `Todo/Task summary`'s own to
  `tsRoot-2`. Seen as an untouched component changing in `git status`; the switch's ids are now `th…` and Task summary is byte-identical again.
- 🔴 **Headless Chrome follows the Mac's light/dark setting.** My Sign in assertion said "headless reports light"; at 21:30 it read a dark
  system and the sun, which is correct. The drive now reads `matchMedia` beside the switch; the theme drive emulates both settings.
- `drive-tpl008-demo.js` needs an `index.html` at the site root and an existing `--shots` directory — harness, not product.

**Published.** Deploy build: the SAME `nodegx-deploy.cjs` (Sep 11) as s3, not rebuilt, because runtime sources now carry a peer's
uncommitted edits; production engine, no warnings. `drive-tpl008-demo.js` gained 4 light/dark clauses: **16/16 on the built folder**.
Before `ops/deploy.sh` (`--delete`), every local `index.html` (homepage and all five demos) matched the live one and nodegx-web had
nothing else pending. Old folder moved aside, not deleted. `deploy.sh`: neighbours 200 before and after, homepage md5 unchanged.
**<https://nodegx.io/templates/todo-list/> 16/16.**

⚠️ **Not done:**
- **Richard's working copy has no dark mode.** Mirroring the template's `components/` into it with `rsync --delete` was **denied by
  the auto-mode classifier** ("Irreversible Local Destruction"). Nothing ran. His copy dates from s2 and he had not edited it since 19:21.
- **Uncommitted**, not asked for: `packages/noodl-mcp/tests/tpl008{Theme,Components,Template,Template.test}.ts`,
  `packages/nodegx-backend/tests/{tpl008-theme-drive.test.ts,tpl008-todo-drive.test.ts,helpers/todo-drive.ts}`,
  `scripts/devtools/drive-tpl008-demo.js`, `templates/todo-list/`, `templates/todo-list-demo/`, this file, and one hunk of
  `NEXT-SESSION-PROMPT.md` (which also holds a peer's uncommitted hunk — commit from a private index).
- `test:ci` / `test:main` not run.

### s5 — 2026-09-15: hosted at <https://todo.digitalbricks.io> (R11's "later phase", at Richard's request)

**Ask:** *"a version of our todo list app published to any VM we have easily available … maybe nexus-1, and I'll point
todo.digitalbricks.io at it"*. Read as the **real template with its backend**, not the demo: the demo is already public on
nodegx.io and keeps its list in one browser, which is the opposite of §1a's reason for a server.

**Shape** (files: `todo-digitalbricks/` beside this file — `provision.sh`, `ops.json`, `README.md`):
- Frontend: `templates/todo-list` (committed, `8d046807b`) + starter `noodl_modules`, `cloudservices` →
  `{appId: todo-list, endpoint: https://todo.digitalbricks.io, type: nodegx}`, built with the Sep 11 `nodegx-deploy.cjs`
  (production engine, 0 warnings) → `/srv/todo/site`. **One origin**: Caddy proxies the backend's route families (the list
  `deploy/nginx.conf` keeps, test-enforced) and falls back to `index.html` for the rest, so a reload on `/todo-list` works.
- Backend: `dist/cli.js` from **Sep 9** — packaged with `package-deploy.js --skip-build` (sourcemap dropped, credential scan
  passed), deliberately **not rebuilt** over today's uncommitted SYN-003 edits in `nodegx-backend/src/server`. systemd
  `todo-backend`, user `todo`, `127.0.0.1:8690`, `--no-admin`, data `/var/lib/todo/data`, the template's policy installed
  before first start (**ENFORCED**, `devOpen: false`, `signup: public`). `ops.json`: CORS = the app origin, metrics off.
- 🔴 **Behind a same-host proxy every request is loopback.** Measured what that changes: only `clientIp` (X-Forwarded-For
  trust, which Caddy sets) and `metrics.allowLoopback`. So `/_admin`, `/admin`, `/executions`, `/metrics` are answered **404
  by Caddy** and never reach the backend.
- Additive on a shared box (nexus, digitalbricks.io, nodegx.io, community): only new paths plus `conf.d/todo.caddy`, which the
  script deletes if `caddy validate` fails. Four neighbours 200 before and after.

**Graded:**
- Server-side REST: unauthenticated `find` 403 · sign-up OK · A sees 1, B sees 0, B `get` of A's row 404 · owner `DELETE` 403.
- Public (from the box — this laptop's VPN resolver cached the NXDOMAIN): Let's Encrypt cert (to Dec 14) · `/`, `/sign-in`,
  `/todo-list` 200 · `/health` 200 · the four closed routes 404.
- Headless Chrome on the live host (`--host-resolver-rules` to the IP): sign-in drawn → account created → lands on
  `/todo-list` → task added (server holds the Task and its "Added at #1" Event) → **reload keeps it** → 390px has no
  horizontal overflow → every backend request same-origin → **0 console errors, 0 failed or ≥400 requests**.
- The 4 probe accounts were the only rows; the database was deleted and the service restarted — **0 users** at handoff.

⚠️ **Open:** `signup` is `public` so Richard can make his account. After he has, set it to `nobody` in
`/var/lib/todo/data/security.json` and `systemctl restart todo-backend` (the admin surface is off, so the file is the switch —
command in `todo-digitalbricks/README.md`). No backups are scheduled for `/var/lib/todo` yet (`nodegx-backend backup` exists).

### s6 — 2026-09-15: a PWA, and a push at 9am on the day a task is due

**Ask:** *"Can we make it a PWA please? With push notifications that come when deadlines are coming? Maybe at 9am on the day
of the deadline?"* Scoped against P89 first: BOX-013 (installable deployed apps) is an unstarted index row and push is in no
phase, so this is built for the hosted list and recorded here, not as BOX-013.

**The split.** The template carries only what every copy can have; the host carries the rest.
- **Template** (`tpl008Components.ts`, `tpl008Theme.ts`): `Todo/Reminders switch`, placed in `Todo/Header` only — two icon buttons
  (`rmTurnOn` crossed-out bell, `rmTurnOff` ringing bell) and a Function that calls `window.todoReminders.toggle()` if it exists.
  **The stylesheet shows neither unless the root has `data-reminders`** (`off`/`install` → turn on; `on` → turn off), so the demo,
  the editor and a server without a sender draw no bell. Policy gains `PushSubscription` (same rules as Task: owner-only, delete
  `nobody` — off is `enabled: false`). START-HERE says all of this. 37 components / demo 36.
- **Host** (`todo-digitalbricks/`): `apply-pwa.js` adds `pwa/manifest.webmanifest`, icons, `sw.js` (no caching — a stale shell
  after a redeploy asks for bundles that are gone), `pwa/reminders.js`, and swaps `black-translucent` for `default` so an installed
  app's header is not under the iPhone status bar. `todo-push` (systemd) reads the backend's SQLite READ-ONLY once a minute and
  sends with a bundled `web-push@3.6.7`; the VAPID key pair is made on the box and never leaves it.
- **When:** 09:00–12:00 in the device's own time zone (stored per device, refreshed on each open), once a day, the person's open
  tasks due that day. 12:00 is catch-up after downtime, so turning reminders on at 10pm does not fire at once.

**Graded:**
- Gates `tpl008Template.test.ts` + `tpl008Demo.test.ts` **43/43** (new §4b test: buttons, classes, the hand-over script against
  a host and no host, placed only in Header, the three hide rules; §2 names the fourth collection). Regenerated: only App,
  Header, registry, START-HERE, policy and the new component changed in both artefacts; 0 warnings.
- Sender on a fixture: done / other person's / disabled rows skipped, per-zone date (Auckland already tomorrow), bad zone → UTC,
  08:59 no / 09:00 yes / 12:00 no, `--only`.
- **FCM for real, from this laptop**: headless Chrome subscribes; the bundle's push → 201 → the service worker showed it.
- **Local staging of the whole shape** (`staging-e2e.js`: one origin, SPA fallback, the Sep 9 backend, headless Chrome) **18/18**:
  manifest no errors · SW active · no installability errors · no bell on Sign in · after sign-up the crossed bell only · press →
  "Reminders are on" notification, one enabled row with zone + endpoint, the ringing bell only · tasks due today / closed today /
  due later → a `--once` tick sends ONE push (201) that arrives as "Due today | <the open one>" · a second tick sends nothing ·
  press → row kept `enabled: false`, crossed bell back, not reminded · no attribute → no bell · 0 dialogs, 0 console errors.
  🔴 **It found a bug first:** `reminders.js` padded the 87-character key to 89 (`'===='.slice(...)`), `atob` threw, and the
  failure `alert()` froze the page — the harness now records and dismisses dialogs.
- **Production**: rsynced (`--exclude pwa/vapid-public-key.txt`), `push/provision-push.sh` (policy + old file kept, Caddy headers
  with its old drop-in kept, backend restarted, `todo-push` up). Live headless Chrome on Sign in (no account): manifest no
  errors, SW active, **no installability errors**, `data-reminders=off`, status bar `default`, 0 console errors. Richard's data
  before/after: 1 user, 8 tasks, 9 events, 1 session. Neighbours 200 before and after. The old site is `/srv/todo/site.before-pwa`.

🔴 **The shared viewer engine was a DEVELOPMENT build** at deploy time — a peer's editor `test-ci` webpack rewrote
`packages/noodl-editor/src/external/deploy/noodl.deploy.js` at 21:50. Not rebuilt and not shipped: a control build of the
unchanged s5 project with `--allow-development-engine` was **byte-identical in every file except `noodl.deploy.js`**, so the
site was built that way and the production engine copied in (md5 `43041dd…`, the one live since s5).

⚠️ **Not done:** a push to a real phone (Richard: add to Home Screen on iOS 16.4+, press the bell;
`sender.js --test <email>` on the box sends one on demand) · the backend drives (`tpl008-todo-drive`, `tpl008-theme-drive`,
`tpl008-todo-demo-drive`) were not re-run — the staging drive covers the built template, not those suites · sign-up is still
`public` · nothing committed.

### s7 — 2026-09-16: the deadline field gets a date picker, and the library's Date Picker is rewritten

**Ask:** *"the date field in the task details doesn't have a date picker … unfuck the current date picker prefab, and fix the
todo app at the same time … the template AND todo.digitalbricks.io AND the template demo"*, then *"bin the existing date picker
prefab and start from scratch, with default fallback to the system date picker if it fucks up"*.

**What was wrong with the old prefab** (measured on its script): it fetched `vanillajs-datepicker` from jsdelivr at run time;
the popup was removed on the field's `blur`, and pressing a day blurs the field first, so a click never picked a day; its
colours were palette names pasted into CSS; its touch path read `new Date('YYYY-MM-DD')` (UTC) and wrote `getMonth()` unpadded;
an empty blur called `null.getFullYear()`.

**The new part — one source, two consumers:** `packages/noodl-mcp/tests/datePicker.ts` (script, CSS, graph).
`npm run library:date-picker` writes `library/prefabs/date-picker/project/project.json` (`--check` gates drift; v2.0.0, README,
the unused Inter font dropped); `tpl008Components.ts` builds `Todo/Date picker` from the same graph and places it in Task summary
(`Value` ← deadline; `Value` → deadlineText; `Changed` → setDeadline).
- A real `<input type="date">` holds the value (`YYYY-MM-DD`, a LOCAL day). On `pointer: fine` a dependency-free calendar drops
  down (tokens with fallbacks, keyboard: Alt+↓/F4, arrows, PgUp/PgDn, Home/End, Enter, Esc; Today/Clear). The native calendar
  button is hidden only after the calendar has rendered once; if opening it throws, the enhancement is removed and
  `showPicker()` is tried. On touch the system picker is the picker.
- `Changed` fires on a decision: a picked day at once, typing on Enter/blur (a date input fires `change` per completed segment).
  A half-deleted date (`badInput`, value `''`) is put back, never written as a clear.
- 🔴 **Two runtime facts it needed.** (1) `Outputs.changed()` is only callable for an output the SAVED node declares a signal —
  a prefab never re-saved by the editor must carry the Function's `dynamicports`, or it throws "not a function". (2) The D71 gate
  forbids a wired `run` on a Function whose inputs run on change, and this script must run on change — so the host Group's
  `didMount` drives a tiny "count mounts" Function whose count is an ordinary input. A remount is a new element and rebuilds.

**Graded:**
- `scripts/library/drives/date-picker.js` **27/27**, real CDP mouse and keys: incoming value, no CDN request, a mouse press on a
  day picks it and `Changed` sees the NEW value, Escape, keyboard across a month, typed change commits on blur not keystroke,
  Clear, half-deleted restore, forced throw → system picker, unmount/remount keeps the date, touch → no enhancement. Mutation
  control: without the mount-count wire the field never draws (reds).
- `tpl008Template.test.ts` + `tpl008Demo.test.ts` **43/43**; `library:check` date-picker OK. Regenerated artefacts: only
  `Todo/Date picker` (new), Task summary, Set deadline's description, registry, START-HERE changed. 38 components / demo 37.
- `tpl008-todo-drive` **14/14** — §5 now presses the calendar (5 days out) and reads the stored deadline and "Due in 5 days";
  the "Use a date like" refusal clause is gone (a date input cannot hold "next week-ish"). `tpl008-todo-demo-drive` **10/10**.
- Not mine, red before this session: `cmp004Parts` export-vs-shipped (the three parts gained `icon.png` in `1fad0cad7`) and
  `cmp001` corpus publish rate 33→37 (reads `node-catalog-enriched.json`).

**Deployed:**
- **todo.digitalbricks.io** — s6 recipe: the shared `noodl.deploy.js` was again a DEVELOPMENT build, so built with
  `--allow-development-engine` and the live production engine (md5 `43041dd…`) copied in. Diff vs live: index hash, `index.html`
  (that hash only), one bundle. rsync `--delete` excluding `nodegx.security.json` and `pwa/vapid-public-key.txt`; backend untouched.
  `live-pwa.js`: manifest ok, SW active, installable, `data-reminders=off`, 0 console errors. Not driven signed in (would need an
  account on Richard's list).
- **nodegx.io/templates/todo-list/** — built with `--base-url`, the demo's own live engine (md5 `ab1982c…`) kept, Inter's
  `LICENSE.txt` carried over (today's starter modules lack it). Only that folder rsynced (the other four demos md5-identical local
  vs live; homepage not rebuilt). Neighbours 200 before/after. nodegx-web's local copy replaced (old one in the session scratchpad).
  `drive-tpl008-demo.js` gained a clause (calendar press → stored → "Due in 5 days"): **17/17 on the public URL**; control: the
  OLD build fails exactly that clause.

⚠️ **Not done:** Richard's own copy (`NodeGX test projects/Todo list`) still has the text field · the library shelf's published
zip is not rebuilt/published (`library:build`) · `Form Fields/Labelled Date` is a separate date field, untouched · nothing committed.

**s7b — Richard, same day, screenshot: *"there's two date icons in the date field now"*.** It was **Firefox** (`17 / 09 / 2026`
spacing): its calendar button sits inside the field and `::-webkit-calendar-picker-indicator` cannot reach it, so the picker's own
button drew beside it. Every drive had been headless Chrome. Reproduced in Playwright Firefox 148 (both icons, `enhanced: true`).
- **Fix: Firefox is not enhanced** — it keeps its own picker, one icon. 🔴 Two detections were tried and measured FALSE in Chrome
  before shipping (the library drive went 27 → 4 on each): `CSS.supports('selector(::-webkit-calendar-picker-indicator)')`, and
  `getComputedStyle(input, '::-webkit-calendar-picker-indicator').display` (neither engine reads the pseudo). What ships is an engine
  check, `'mozInnerScreenX' in window` (Firefox true, Chrome false, both measured).
- Graded: library drive **27/27** (Chrome), TPL gates **43/43**, demo drive **17/17** local and on nodegx.io; new
  `scripts/devtools/drive-date-picker-firefox.js` (needs `PLAYWRIGHT_CORE`) **4/4 on nodegx.io**: no enhancement, no popup of ours,
  a keyboard change stored when the field is left (🔴 Tab moves between Firefox's date segments — leaving needs a click), no errors.
- Redeployed both (same recipe, engines unchanged: todo `43041dd…`, demo `ab1982c…`); neighbours 200 before/after; `live-pwa.js` clean.
- ⚠️ Safari desktop not driven (no WebKit here): it takes the enhanced path and relies on `::-webkit-calendar-picker-indicator`.

### s8 — 2026-09-20: a next action's title is a field, and its description saves and closes — D76

**Ask** (Richard, with a screenshot of his own list): *"In the todo template, I can't edit a 'next action' title, and when
I type a description I can't save or exit the description input field. Can you please fix and push to the demo nodegx page
and my digital bricks page?"*

**Measured before anything was changed** — the demo in headless Chrome, reading `localStorage`:
- **The title.** The detail pane's fields were `Task title`, the date, `Add a next action` and `Add a note`. **There was no
  field for a next action's title at all**: `arTitle` was a `Text`, and there was no `Commands/Rename action`. The report is
  exactly right — the feature did not exist.
- **The description.** Enter typed a newline (it is a `textArea`) and Escape did nothing, so **the only commit was the
  field's blur**, and the only way to fold the box was clicking the same title that had to be typed in. Worse, it was a
  *race*: with nothing to save the second click closed the box, and with a save in flight it closed on one run and left the
  box open on another — the write refreshes the list and the rebuild lands between the press and the release often enough to
  eat the click. **A toggle is not safe on a press that also saves.**

**Built.**
- `Todo/Action row`: the title is a `Text Input` that renames on Enter/blur, exactly as the task's does, and a new
  `Commands/Rename action` writes it with an `action-renamed` line. A **Description** icon button opens the box and **Save**
  closes it.
- **Which next action is open is one value on the page** (`todoOpenAction`), SET by the Description button and CLEARED by the
  field's blur — not a per-row `States` toggle. Nothing toggles, so there is no press for a rebuild to eat, and only one
  description is ever open. `Logic/Selected task` takes `openActionId` and each row is told `descriptionOpen` / `showPreview`.
- **Leaving the box writes it AND shuts it**, so the exit never depends on a click landing; Save is there for a box nobody
  typed in, and to say so.

🔴 **D76, found by the first attempt at that last point.** Blur was wired to two of the row's outputs (`describe` and
`closeDescription`) and **the save silently vanished**: `For Each` forwards item signals through a single
`scheduleAfterUpdate`, and a second signal in the same update overwrites which name is sent. The box shut, the record stayed
empty, and nothing said so — the drive read it after a 20-second wait. The row now emits ONE signal and `Pages/Todo` drives
both jobs from it. Filed in `DEFECTS-THE-TEMPLATES-FOUND.md`, owner `NONE`.

**Graded.**
- Regenerated: **0 refusals, 0 warnings**, 39 components / demo 38. `tsc -p packages/noodl-mcp --noEmit` exit 0.
- Gates `tpl008Template.test.ts` + `tpl008Demo.test.ts` **43/43**. The command count is now read off the SOURCES rather than
  typed, so a command added without its history writer reddens the rule and not the literal.
- `tpl008-todo-drive` **14/14** with two new readings in §4: pressing **Save** writes the description *and* shuts the box
  (`boxAfterSave === 0`), and typing over a next action's title and pressing Enter renames it, with its history line.
  `tpl008-todo-demo-drive` **10/10**, `tpl008-theme-drive` **9/9** — all 0 console errors.
- `drive-tpl008-demo.js` gained the same two clauses: **19/19** on the built folder. **Control: the OLD live build fails
  exactly those two and passes the other 17** (`foundField: false` — there was no title field, and no button to open the box).

**Published — both, as asked.**
- **<https://nodegx.io/templates/todo-list/>** — the demo. The shared viewer engine was AGAIN a DEVELOPMENT build (a peer's
  webpack, 09-19 23:08), so built with `--allow-development-engine` and the live production engine copied in (md5
  `ab1982c…`, unchanged); Inter's `LICENSE.txt` carried over, as today's starter modules still lack it. Before the push the
  live site and the local `site/` were **byte-identical, all 123 files**, so `deploy.sh --delete` removed nothing else;
  homepage md5 unchanged either side; neighbours 200 before and after. **19/19 against the live URL.**
- **<https://todo.digitalbricks.io>** — Richard's own list, with its backend. Same engine problem, same answer (production
  engine md5 `43041dd…`). `nodegx.security.json` removed from the build and `apply-pwa.js` run; rsynced `--delete` excluding
  `nodegx.security.json` and `pwa/vapid-public-key.txt`, which both survived. The old site is `/srv/todo/site.before-s8`.
  `/var/lib/todo` was never touched. Diff vs live was exactly the three bundles, the index hash and `index.html`.
  `live-pwa.js` clean: `/sign-in`, manifest no errors, SW active, no installability errors, `data-reminders=off`, 0 console
  errors. Four neighbours 200 before and after.

⚠️ **Not done:** todo.digitalbricks.io was **not driven signed in** — that needs an account on Richard's list, as in s7; the
behaviour itself is graded by the template drive against a real enforcing backend. · Richard's local working copy
(`NodeGX test projects/Todo list`) still has the old Action row. · `test:ci` / `test:main` not run. · sign-up is still `public`.
