# Phase 93 — next session

**Written 2026-09-20, end of session 26.** s1–5 drove TVW-003; s6–11 closed TVW-001; s12–13 closed
TVW-002; s14–17 built TVW-004/005; s18 built and drove TVW-006; s19 got two rulings and reshaped
TVW-008; s20–22 built TVW-007's eyebrow, trail and hover; s23 built TVW-008's surface; s24 drove
TVW-007's hover; s25 closed TVW-007 AC1/AC6 and TVW-008 AC8.
**s26 DROVE TVW-008 FOR THE FIRST TIME — the first press of the board segment deleted the whole
preview — fixed it, closed four ACs, and got two rulings from Richard.**

## The board, re-derived from the task files

| id | task | built | driven |
|---|---|---|---|
| TVW-001 | The panel tells the truth | ✅ | **CLOSED — all 8 ACs** |
| TVW-002 | The preview says what it is not showing | ✅ | **CLOSED — all 7 ACs** |
| TVW-003 | One selection, three surfaces | ✅ | **CLOSED — all 6 ACs** |
| TVW-004 | Layers | ✅ | AC1–5, AC7 green. **AC6's 20 shots SENT s18 — Richard's verdict is all that is left** |
| TVW-005 | Layers can move things | ✅ | **CLOSED — all 6 ACs** |
| TVW-006 | The structure lane | ✅ | AC1–4, AC6 green. **AC5's 18 shots SENT s18 — Richard's verdict is all that is left** |
| TVW-007 | An instance says what it is | ✅ | **AC1–AC4, AC6 green. ONLY AC5 (Richard's WORTHY) is left.** ⌘[ ruling built at s26 |
| TVW-008 | The board | ✅ slices 1–2 | **AC1, AC3, AC5, AC6, AC8 ✅. AC4 half. AC7 = 6 shots WITH RICHARD** |
| TVW-009 | The words (needs 001, 002, 004) | — | — |
| TVW-010 | The disorientation test (needs all) | — | — |

**ACs closed: 61** (57 at s25; s26 added TVW-008 **AC1, AC3, AC5, AC6**).

## 🔴 Start here

1. **FOUR verdicts are with Richard and nobody else can do any of them.** TVW-004 AC6 (20 shots,
   s18), TVW-006 AC5 (18 shots, s18), TVW-007's four placement shots (s20), and **new at s26:
   TVW-008 AC7 — six shots in `verdicts/tvw-008/`** (empty board, three frames before and after a
   rearrange, one frame benched, light, dark). The first two close their tasks on the spot.
   **Do not re-send them.** No ruling file had landed at s26.
2. 🔴 **TVW-008 AC4's second clause is RULED AND UNBUILT, and the fix is already named.** Richard
   ruled the bench should open on its first scenario, as the board does. s26 built it, measured it,
   and **reverted it** — the chip and the inputs rail said `Checkout` while the runtime went on
   drawing `Button`, because the bench delivers through `sendModelUpdateToClient`, a **targeted
   delta**, and at mount the sandbox client has not connected. **The fix is the EXPORT path the
   board already uses**: `boardFrameMounts` writes `bench.scenarios[0]` into the harness node's
   `parameters`, which is exactly why the board renders it from the first paint. `buildBenchExport`
   needs the same, **for the opening scenario only** — every later switch must stay a delta or
   changing scenario reloads the window. TVW-008 §10.5 has the whole diagnosis.
3. **If Richard has ruled on TVW-007's placement**: the winner becomes a constant,
   `eyebrowPlacement.ts` is **deleted** with the three losing branches in `instanceEyebrow.ts`.
   🔴 A switch that outlives its verdict is a second copy of a decision.
4. **TVW-009 and TVW-010 are unblocked** — 001, 002 and 004 are all built. TVW-009 is the cheapest
   unstarted task on the board.
5. Two §9.6 items no AC names are still owed on TVW-008: **selection through a frame**, and the
   `Add all` bound **explained** in the picker rather than merely enforced.

## 🔴 What s26 found — read this before driving anything

### The defect the drive existed to find

**The first press of the board segment deleted the entire preview.** `[data-test="app-preview"]`,
the scope chip and the board were all absent from the DOM. Cause: `executeJavaScript` on a
`<webview>` calls `getWebContentsId()` **first**, which **throws synchronously** — and the guard was
a `.catch()`, a rejection handler on a call that in that failure mode never returns a promise. The
throw escaped a passive effect and React unmounted the subtree. Fixed as **`applyInspectScript.ts`**,
a pure module, *because the defect was unreachable from a spec where it lived* — `useSandboxViewer`
imports `ViewerConnection` → `projectmodel` → `bugtracker`, which reads Electron's user-data path at
module scope, so ts-jest cannot load it. 4 arms, 3/3 mutants, **M1 is the shipped defect verbatim**.

### 🔴 The bundle lied twice, and cost two drives

`packages/noodl-editor/src/editor/index.bundle.js` **on disk is from Sep 10**. The dev server serves
webpack's in-memory bundle over `http://localhost:8080`, so grepping the on-disk file "proves" your
change is absent while it is live. **Gate on the served artefact:**

```
curl -s http://localhost:8080/src/editor/index.bundle.js | grep -q '<a distinctive string from your change>'
```

and in the renderer, `window.__wreq('<module path>')` tells you whether the module is really there.
⚠️ Also: a rebuild takes ~60s and **webpack logs only when it finishes**, so "no new line in the log"
is indistinguishable from "building". One drive ran against the previous bundle for exactly this.

### 🔴 Four instrument faults, and three were one mistake

Full detail in TVW-008 §10.4. **Every one produced a FAIL against working product, or a PASS
against nothing.**

1. **`null === null` graded AC6 GREEN in a run whose subject had crashed** — the only green in that
   run. A drive must now **refuse** when the preview is absent rather than score 25 arms about it.
2. **`[data-preview-mode]` is the SCOPE's mode, not the app's.** AC6's subject is the app window's
   **URL**.
3. **`project.json`'s mtime ATTRIBUTES NOTHING** — this editor saves it for its own reasons, twice
   during an open. AC5's subject is the **stored `bench.board` coordinate**. Re-armed that way AC5
   is green, and a later run proved the point: the mtime moved mid-drag while `bench.board` did not.
4. **A screen rect cannot tell "the frame moved" from "the camera moved"** — the board's viewport
   resets on remount, shifting every frame together. Grade the stored coordinate and the offset from
   the neighbours.

### ⚠️ Two hangs, both the same root: nothing in this harness has a timeout

`connect()` resolves on socket open and never rejects; `evaluate` on a target destroyed by a reload
never settles. **Benching a component reloads the `<webview>`**, so a viewer client reused across
that boundary hangs forever — the first run sat **ten minutes with no output**. Race every CDP await
against a deadline. ⚠️ And **`BOOT` must be retried**: `webpackChunknoodl_editor` does not exist
until the bundle has evaluated, so a drive starting soon after a renderer reload dies forty lines
later with *"window.__wreq is not a function"*.

### ⚠️ The editor has TWO `<webview>`s and `appTarget('viewer')` picks whichever matches first

`http://localhost:8574/` is the **app preview**; `http://localhost:8574/?noodl-sandbox=<id>` is the
**bench and the board**. Select the sandbox **by its URL**. A probe that did not got the app's own
page back and would have failed AC4 against a window that was never its subject.

### ⚠️ A `pgrep`-based waiter whose own command line contains the pattern NEVER EXITS

Three of s26's background waiters spun until killed. Match on something the waiter itself does not
contain, or wait on a pid.

## The fixture

`scripts/devtools/tvw008-board-fixture.js` writes
`NodeGX test projects/TVW-008 s26 Board` deterministically and **checks its own claims before
exiting**. §6.4 measured 0 of 5,922 components with a scenario, so AC4's branch had never been
drawn. 🔴 **Re-run it before every drive** — a drive leaves `bench.board` behind, and AC1's first
arm is the *empty* board. Its `label` port is **connected** to the visual root and its scenario
value **differs** from the node's own, or the arm would pass on dead code.

## The gates, as of s26

- `tests-unit/tvw-007` **103 specs / 6 suites** (was 95 — 8 new for the ⌘[ ruling, 3/3 mutants).
- `tests-unit/tvw-008` **106 specs / 4 suites** (was 102 — 4 new for the crash, 3/3 mutants).
- `typecheck:editor` **0**, `typecheck:editor-tests` **0**.
- **`test:main` 522 suites / 8362 specs, exit 0** — was 521 / 8350 at s25, so the delta is exactly
  the +1 suite and +12 specs this session adds and nothing stopped loading.
- 🔴 **`test:ci` NOT re-run at s26.** It was at the floor at s25 (8 failures by name: 3 SUB-006,
  3 SUB-011, 2 NDA-017) and nothing s26 shipped touches a jasmine path, but that is an argument.

## The drive hazard

`npm run dev:debug` exiting **144** is the single-instance lock, not a failure. **Two dev stacks
cannot coexist** (`webpack.renderer.dev.js:24,38` hardcode 8080). **Attribute before you touch**:
`lsof -nP -iTCP:9222 -sTCP:LISTEN -t`, walk `ppid` to a Claude Code pid, compare with your own.
⚠️ **`dev:stop --list` first** — at s26 it labelled a **peer's `nodegx-backend` jest run** as a
"dev stack"; it was not, and stopping it would have killed a peer's suite. ⏱️ The stack takes
~7 minutes to reach 9222. s26 tore its stack down cleanly (26 processes) leaving all 10 peer
`noodl-mcp` Electrons alive.

## Committing

🔴 The working tree carries other sessions' work. **Commit through a temporary index with a
compare-and-swap** — `BASE=$(git rev-parse HEAD)`, `GIT_INDEX_FILE`, `read-tree $BASE`,
`update-index --add` **naming your paths** (untracked included; a pathspec commit skips them),
`write-tree`, `commit-tree -p $BASE`, `update-ref HEAD $NEW $BASE`. Then refresh the real index and
confirm `git diff --cached --stat` is empty. **Re-read `HEAD` immediately before each commit.**
⚠️ `scripts/devtools/` holds peers' untracked drive scripts — never `git add` that directory.
⚠️ `dev-docs/tasks/**/verdicts/**/*.png` is **gitignored**; shots are for Richard and the local
record, never committed.
