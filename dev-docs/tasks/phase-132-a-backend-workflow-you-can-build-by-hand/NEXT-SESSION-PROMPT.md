# P132 — next session

**BWF-002 is built** (s2, 2026-11-02: NodeGX `4aec3b83b` + `511e41d5d`, nodegx-studio `0872094`; its
[s2 log](BWF-002-RUN-IT-ON-SAMPLE-DATA.md#s2-2026-11-02-built-ac1ac4-green) has each AC). BWF-001's P132-STEPPANEL was
found with Richard and fixed (`2702c96`).

**Take BWF-003** ([task](BWF-003-PICK-A-VALUE-FROM-WHAT-CAME-BEFORE.md)): pick a value from what came before. What s2
leaves for it:

- A step's panel draws *What went in* / *What came out* as a tree (`valueTree` in `studio.html`), each line carrying
  its path as `data-path` (`body.title`, `trigger.action`, `result.plant`). The picker builds on those lines.
- *What went in* still holds the backend's deprecated top-level copy of the payload (`action`, `collection`, `id`,
  `record` beside `body` / `trigger`: WFA-003's legacy view). Offer `body.*`, `trigger.*`, `upstream.<step>.*` only.
- The tree needs a run: a person tests on a sample first (BWF-002). With no run yet, the field list comes from the
  step kinds' declared output shapes (`GET /admin/workflow-step-kinds`, each kind's output) and the trigger's table
  columns.

Before anything: `git status` in both repos (NodeGX `cline-dev`, `../nodegx-studio`). Studio's `editor/studio.html`
is the file every Studio session edits; an uncommitted change in it is someone's live work. (At the end of s2, Studio's
`docs/SCOPE.md` and three `docs/look/s2-composer-*.png` were someone else's, uncommitted.)

🔴 **Studio from the kit refuses every test** until a NodeGX release carries `511e41d5d` (`testRuns` in the catalog):
the published backend (`@nodegx/mcp` 0.2.9) ignores `stopAfter` and would run every step for real. Drive with
`NODEGX_REPO=<the NodeGX checkout>`, and **rebuild the backend's `dist/` first** (`npm run build` in
`packages/nodegx-backend`: it is gitignored, and was 6 days stale at s2's start).

**Driving the Electron app on a Greenhouse copy:** [greenhouse-drive.mjs](greenhouse-drive.mjs) is s2's: it copies
Greenhouse, gives it its own backend (`NODEGX_BACKENDS_DIR` under its own folder), starts Studio's Electron hidden on
CDP 9461, deploys the functions, makes a Plant and a Watering row, then clicks through BWF-002. Copy it, change the
middle. It drops `ELECTRON_RUN_AS_NODE`: a shell under VS Code or Claude Code inherits it, and Electron then starts as
plain Node (`app` undefined in `main.cjs`). The first open of a workflow can take >10 s to be editable (the backend's
step kinds): wait for `[data-act=sample]:not([disabled])`, not a fixed time.

Studio gates before you commit: `npm run check:automations` (with and without `NODEGX_REPO`: the second grades the
refusal only), `check:hosted`, `check:editor`, `check:app` (screen unlocked), one at a time; the Chrome ones outside
the Bash sandbox.

Still open from s1: the list shows triggers as rows of their own (BWF-001 item 8's fold); TriggerTest's three ports
crowd the column gap at 71 %; Richard's re-walk of BWF-001 points 2–4 (AC7) unless he did it with STEPPANEL.
