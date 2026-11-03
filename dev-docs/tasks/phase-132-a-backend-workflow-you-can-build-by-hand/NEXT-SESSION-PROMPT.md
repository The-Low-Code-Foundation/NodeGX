# P132 — next session

**BWF-008 item 3 (the words) is built** (s10, 2026-11-03, NodeGX `fed5b74d5`, [the record](BWF-008-THE-NODEGX-EDITOR-EDITS-THEM-TOO.md#s10-2026-11-03-item-3s-words-built-and-driven-in-the-editor)).
Steps titled by name, function or kind (never the id); routes in served words (catalog **1.9.0**, a route's
`displayName`); *Then* / *Always, as well* / *If it fails*; no page banner over a workflow; no "· COMPONENT"; the picker's
preview from the catalog; retry help about the step; "It starts at Transform.". All driven in the editor on a Greenhouse
copy. P132-STUDIOPRIVACYDROP fixed first (Studio `27a8727`). The stale picker search did not reproduce.

**Next, in this order:**

1. **The value input's picker as field trees** (BWF-008 item 3's last part): BWF-003's model (`upstreamOf`,
   `readSources`, `shapeFields` in Studio's `automations.mjs`) in the editor's `WorkflowValueInput.tsx` /
   `workflowScope.ts`. Studio's is plain JS: decide whether the editor ports it or both read one shared module.
2. **AC2's crossing**: Studio and the editor open on one Greenhouse copy; a change in each shows in the other.
3. **Studio reads the served route words** (catalog 1.9.0) before its own `ROUTE_WORDS`, so a new route's words reach
   both surfaces from the backend. Studio from the kit keeps the table until a release carries 1.9.0.
4. The picker's preview speaks the catalog's agent prose ("(P132)", `create-record`): a person's sentence per kind
   needs a served field. Ask Richard if it matters before the Beta.

**Driving the editor on a copy** (s9, the recipe is in BWF-008's s9 step-1 record): fresh `id`, no
`metadata.cloudservices`, `NOODL_USER_DATA_DIR=<scratch profile>` with a `recently_opened_project.json` listing only
the copy, `npm run dev:debug -- --quiet` in the background, Backend Services → *Add backend* → *Run one on this
computer*. The backend lands in `~/.noodl/backends/`: remove it by its id after `dev:stop`. Canvas presses need a real
`Input.dispatchMouseEvent` with `buttons: 1` on the press, a move and a pause before it ([editor-drive.cjs](editor-drive.cjs)); a
key event needs `code` too, or Escape does not close the picker. `cdp reload` leaves this renderer blank: restart the
stack instead. The window size can change between
launches: find cards and buttons by text, never by a remembered x,y.

Editor gates: `npx jest tests-main/local-backend tests-unit/workflow tests-unit/bmg-012` (green s9), `tsc -p
packages/noodl-editor --noEmit` (0). Full `jest` has 10 suites red that are not ours (same set at HEAD, s9 list in the
record): compare by name before reading a red as yours.

What s8 leaves (still open):

- `P132-ROUTEDINSERT` (low, needs a ruling): *Add a step after* on a step puts a Find (or any kind with sides) between
  it and the next, the find keeps a plain `next`, and the backend's warning shows over the canvas in engine words
  (`routes (nonempty)`, `routes.<name>`). Ask Richard: warn only for `branch`/`switch`, or ask at the insert?
- A `join` separator cannot be a new line from Studio (a one-line box): "one plant per line" needs JSON.
- No agent round for BWF-006 or BWF-007 (none in their ACs); the MCP wording is in, ungraded by an agent.
- From s7: a query row draws its name above its value; an enum at its default reads "(default)", not its value.
- From s6: Studio has no control for *Ignore privacy rules*; "change every plant found" needs a function; a Date typed
  as text is a date only when the backend's table has the column (`provisionFor` in a lab).
- From s4: a record's date unfolds into `__type` / `iso` in *What it can read*; a JSON setting takes no formula or drop.
- `P132-BST006GOLDEN` (open, not ours): `tests/instructions.test.ts` red on 67 vs 68 backend tools.

🔴 **Syntax-check `studio.html` before a drive**: extract the `<script type="module">` body to a scratch `.mjs` and
`node --check` it.

Before anything: `git status` in both repos (NodeGX `cline-dev`, `../nodegx-studio`). Studio's `editor/studio.html`:
`git diff -U0 editor/studio.html | grep ^@@` before committing. Three `docs/look/s2-composer-*.png` in Studio are still
someone else's, uncommitted. NodeGX's index may hold a peer's staged file (`dev-docs/parked/README.md`): commit
through a temporary index.

🔴 **Studio from the kit** (backend 0.2.9) has no tests, formulas, record steps, Call an API or Send an email until a
NodeGX release carries `511e41d5d`, `8d9907ccf`, `24914b305`, `c3a95ea65` and s8's commit. Drive with
`NODEGX_REPO=<the NodeGX checkout>`, and **rebuild the backend's `dist/` first** if `src/` is newer (`npm run build` in
`packages/nodegx-backend`; the kinds are bundled into `dist/cli.js`, there is no `dist/workflow/`).

**Driving Studio's Electron app on a Greenhouse copy:** [greenhouse-drive-bwf007.mjs](greenhouse-drive-bwf007.mjs) is
the newest (an SMTP catcher, `choose` / `type` / `mark` helpers). CDP 9461 (check: `lsof -nP -iTCP:9461 -sTCP:LISTEN`),
`NODEGX_DRIVE_DIR` your scratchpad, Bash sandbox off. 🔴 Pressing a step that is already picked does not reopen it;
a step with sides (find, filter, branch) has *Add on <side>*, not *Add a step after*.

Studio gates before you commit: `check:automations` (with and without `NODEGX_REPO`), `check:hosted`,
`check:editor`, `check:app` (screen unlocked), one at a time, outside the Bash sandbox (s8: 127/127 and 94/94,
46/46, 262/262, 67/67). Backend: the 42 suites that reach the workflow layer (`grep -lE
"workflow/|WorkflowEngine|WorkflowSubsystem|/steps/|workflow-defs|stepKindCatalog" tests/*.test.ts`), about 4
minutes, `nice -n 19 … --runInBand`.

Still open from earlier: the list shows triggers as rows of their own (BWF-001 item 8's fold); TriggerTest's three
ports crowd the column gap at 71 %; Richard's re-walk of BWF-001 points 2–4 (AC7).
