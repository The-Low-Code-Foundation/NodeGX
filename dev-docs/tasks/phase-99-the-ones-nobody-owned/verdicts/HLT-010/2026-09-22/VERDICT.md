# HLT-010 — verdict, 2026-09-22 (s13)

**Built. `npm run renderer-errors` launches its own dev stack against a throwaway profile and a copy
of `templates/landing-pages`, drives the surfaces Richard's session reached, stops the stack, and
grades the log against `scripts/renderer-errors/budget.json`.** Wired into `pr.yml` as
`renderer-errors` (under xvfb, like `test:ci`).

| run | build | exit | reading |
|---|---|---|---|
| [5](./gate-run5.txt) | HEAD `PropertyPanelCheckbox` | **1** | `react/null-value-prop` 1 / 0, during *components and node selection* |
| [6](./gate-run6.txt) | fixed | **0** | only `whats-new-feed-404` 2 / 2 |
| [7](./gate-run7-mutant.txt) | AC3 mutant: HLT-001's `queueMicrotask` → synchronous | **1** | **`react/sync-unmount` 2,978 / 0** |
| [8](./gate-run8-restored.txt) | restored (`git diff` of the seam empty) | **0** | only `whats-new-feed-404` 2 / 2 |

Every run 5–8 met all 15 preconditions: the editor launched, rAF fires, the launcher drew the seeded
card, `/api/v1/me` was requested, the fixture opened **by pressing its card**, 10 components / 52
node selections, the board drew 3 frames, a component went on the Workbench, the app preview ran
25 s (a thumbnail tick), back to the launcher and reopened, and three sentinels each came back as
exactly one event. Drive + teardown ≈ 175 s after a ~2 min compile.

⚠️ **The build graded is this checkout's working tree**, which carries peers' uncommitted edits to
`ComponentBoard.tsx`, `PreviewChrome.tsx`, `previewScope.ts` and others (P93 TVW). CI grades the
pushed tree. The green reading is about the tree as it stood at 07:45.

## ACs

1. ✅ Exists and runs — `scripts/renderer-errors/run.js`, exit 0 / 1 / 2 (2 = could not measure).
2. ✅ Every class this phase measured is budgeted at **0** (HLT-001…004's seven, plus
   `build/webpack-compile-error`), green at commit (runs 6, 8). The one non-zero budget is below.
3. ✅ Reintroduction: run 7 red **naming** `react/sync-unmount`; run 8 green after restore.
4. ✅ Events, not lines — `tests-unit/hlt-010/classify.test.ts` (15 specs) asserts 232 lines → 116
   events on the doubled `GUEST_VIEW_MANAGER_CALL` fixture. Mutant (sum the channels instead of
   max) → 3 specs red. And it is measured live: the uncaught sentinel is **1 event on 2 lines** in
   every run.
5. ✅ An unknown class fails whatever its count (spec + run 2, which failed on two).
6. ✅ Precondition arms — the 15 above. A missed one is exit **2**, never a pass (runs 2, 3).
7. ✅ `npm run renderer-errors`, `pr.yml` job, and the allowlist printed with a reason per entry.
   ⚠️ **Not yet seen running on a Linux runner** — no push was made this session. The first CI run
   is the first reading of it there.

§6 ✅ P94's README header now says CLOSED.

## 🔴 What the gate found on its first runs

1. **`PropertyPanelCheckbox` rendered `value={null}`** (`// TODO: a bit ugly`, since the initial
   commit): 14 inputs on a selected Group. **Fixed** — `checked={Boolean(value)}`, no `value`.
   🔴 **Why HLT-003 did not count it:** React reports the null-`value` warning **once per
   session, globally**. HLT-003 fixed the first null input its drive rendered, and that unmasked the
   next. A once-per-session class cannot be driven to 0 by fixing what one reading names — only a
   re-read after the fix finds the one behind it. Named by a probe (`--inject`) that walked
   `<input>` React props for `value === null` a tick after the warning.
2. **`NOODLPORT=0` kills the editor at startup** — `design-tool-import-server.js` bound
   `0 + 1` = port 1 → `EACCES` (run 1). web-server.js documents `NOODLPORT=0` for a harness and a
   second editor. **Fixed** (0 ⇒ any free port for that server too).
3. 📋 **`NOODLPORT=0` is still broken in the renderer — NOT fixed, unowned.** Five renderer sites
   (`ViewerConnection.ts:14`, `CanvasView.ts:174,253`, `viewerOrigin.ts:22`, `InspectPopup.tsx:186`)
   read `process.env.NOODLPORT`, which is fixed when the window is created — before the web server
   binds. Run 2: `ws://localhost:0/` **×28** (`ERR_UNSAFE_PORT`) and **67**
   `GUEST_VIEW_MANAGER_CALL` *"Script failed to execute"* — both **gone** at a concrete port
   (runs 3–8). The gate uses a concrete free port pair. Owner needed; the fix is the renderer asking
   main for the bound port.
4. The board's *Add all* is offered only under `ADD_ALL_LIMIT`; the drive picks three rows instead.

## The allowlist

- `network/whats-new-feed-404` ≤ **2** — Chromium's network log, not an app error. `whats-new.ts`
  asks for `/whats-new/feed.json` on every project open; the feed has never existed on
  `nodegx-content` and the client resolves to `null`. Only not asking removes the line. The gate
  opens a project twice. 📋 **Goes to 0 by publishing `{"items":[]}` at that path** (a push to the
  content repo — Richard's call) or by dropping the request.

## Named outs

- The preview `<webview>` (the user's app) is not attached, so HLT-010 §2b's runtime classes are
  outside this gate.
- A scripted session cannot find what a person finds by clicking around. `--log <file>` grades a
  person's own `.logs/dev.log` against the same budget — last night's reads **1
  `setState-in-render` (`ComponentBench` while rendering `ComponentBoard`)**, not reproduced by the
  scripted drive.
- ⚠️ `ExecutionHistory` writes `~/.noodl/execution-history.db` even under an isolated
  `--user-data-dir`. The gate's runs wrote to the real one.
