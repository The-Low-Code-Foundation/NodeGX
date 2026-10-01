# ISL-025 — The island drops the workarounds

**Status: ⬜ not started — scoped 2026-10-01 at 27d891bf3.** **Source:** [AUDIT](AUDIT-2026-10-01.md), every "WA" cell;
modelled on P88's closing ruling **R28** (`phase-88-the-defects-the-games-found/README.md:116`) and its per-task clauses
(e.g. `GAM-008…:257-263`, `GAM-015…:148-153`) · **Side:** template (`templates/bot-garden/` and its generator). This is the
**closing task**: it removes nothing until the ISL task behind each row has landed. The two exceptions are **slice 0**
(W1 and W2), which need no product work and no ruling.

Olive's Island carries a workaround for every defect the push met. P109 fixes the product. This task takes each workaround
back out of the template, so the template teaches the product as it now is, not the product as it was. It is not tidying:
a template is read as the way to build something, and a workaround the product no longer needs teaches a person to write it.
That was R28's reason, and it is this task's.

## 1. The person sentence

**A person who opens Olive's Island to learn how it is built finds the product's own nodes doing the work, and every
workaround still in it carries a comment that says why it stays.**

## 2. What was measured

Every location below was **re-read by me at HEAD `27d891bf3`**. Paths are relative to `packages/noodl-mcp/tests/` unless
they start with a top-level folder. "Now" means the fix already exists at HEAD.

| W | workaround | where | removed by | what removing it must prove |
|---|---|---|---|---|
| **W1** | **Two loops hand-built from Timers.** The Runner: a `Timer` (`rnTimer`, 420 ms) restarted by a `Still playing?` Condition, a run cap, Olive's answer and Step. The component holds 85 wires, the loop's part among them. The island: `iwTimer` (2 × Step Ms) started after the build is held, then restarted by its own tick's write | Runner `cg003Components.ts:663-814` (`rnTimer` `:699`; restarts `:726`, `:772-773`, `:781`; stops `:760`, `:786`; Step Ms `:718`). Island `:1729`, `:1769-1777`. The tick's *script* is `ig004Island.ts:444` (`ISLAND_TICK_SCRIPT`) and does not change. `cg003Template.test.ts` pins `rnTimer`/`iwTimer`/`rnLoop` at 9 places | **Now:** the `Repeat` node, `packages/noodl-viewer-react/src/nodes/std-library/repeat.ts` (P88 GAM-013, `9e165a5ca`, 2026-09-17; Start, Stop, Interval → Tick, Count; stops on navigate; export translated) | Runner: Play runs a program to its end with the same tick count and the same per-tick world as before, Stop halts it, the cap stops it at `MAX_TICKS`, a parked run asks Olive once, Step takes one tick. Island: the same robots move the same number of steps over 20 s, and a rebuild does not stack two beats. The counts are compared before and after on one seed |
| **W2** | **The drives call the internal deploy bundle and guard on `index.html`'s mtime**, because "the deploy exits 0 when it refuses". That is the bundle's *documented* contract: "This process exits 0 whenever it managed to say something … the contract is the JSON" | `packages/noodl-preview/src/deploy-cli.ts:10-13` (the contract). Callers: `dev-docs/tasks/phase-105-the-coding-garden/drives/drive-pages.sh:18-21`; `dev-docs/tasks/phase-108-the-island-works/drives/drive-all.sh:24-25`, `:34-35` (a STALE deploy is written to the summary and the run **continues**); the headers of `scripts/devtools/drive-cg003-pages.js:16-19`, `drive-cg001-kit.js:15`, `drive-ig007-3d.js:15`; 15 garden drives name the bundle. `garden-desktop/build-app.js:51`, `:106-117` already reads the JSON verdict correctly | **Now:** the product command `nodegx deploy` (`packages/nodegx-export/src/cli/deploy.ts`). It maps the engine's stage to an exit code (`deploy.ts:140-154`): `engine` → 11 (`cli/exitCodes.ts:123`), `project` → 2, `target` → 3, a site that renders nothing → 9. It takes `--allow-development-engine` (`deploy.ts:64`, `:430`) | A refusal (a development engine without the flag; a folder that is not a project) exits non-zero and the drive stops before driving, with no mtime file. A good deploy exits 0. `build-app.js` may stay on the JSON (it is correct by the contract); the ruling is not needed for it |
| W3 | A 120 ms Timer plus a `Logic/Latch` Function in front of every list given twice | `cg003Components.ts:47` (`PAD_SETTLE_MS`), the pad `:637-655`, the crew `:1717-1718`, the robot cards `:2809`; `LATCH_SCRIPT` `cg003Scripts.ts:1311` | ISL-001 (D85) | The pad shows 5 keys for 5, My robots 9 cards for 9, on the drives that measured 10 and 14, with the latch gone |
| W4 | `record` sent as `'yes'`/`'no'` strings instead of a boolean | `cg003Components.ts:1072-1074` (with its 🔴 comment) | ISL-002 | Four Drive presses record no block; a Teach press records one |
| W5 | Hand-made row-id prefixes so two lists do not share a row | `cg003Scripts.ts:330-332`, `:1252-1254` | ISL-003 | Five lesson cards show five different cards' lines with the prefixes removed |
| W6 | A build hash (a stale tick dropped) and a signal-only `kept` input, because state is global by name | `cg003Components.ts:355` (`'Logic/Island world': ['kept']`), `:1767`, `:1773-1774` | ISL-004 | A reopened Workshop keeps each plot's progress, and a late tick write cannot restore an old island |
| W7 | **17 copies of one engine**, `${ENGINE}` / `${ISLAND_ENGINE}` interpolated into each script | `cg002Scripts.ts:1400`, `:1414`, `:1434`, `:1443`, `:1452`, `:1536`, `:1569`; `cg003Scripts.ts:360`, `:1086`, `:1321`, `:1425`; `ig004Island.ts:53`, `:444`; `iw006Shop.ts:116`, `:244` | ISL-005 | One engine definition in the project; the engine gate (`cg002Engine.test.ts`) green against it; `nodes.json` total size recorded before and after |
| W8 | A 696-output `Logic/Translate words`, generated one line per word, and a name→type table plus a `portsOf` regex mirroring the runtime | `cg002Scripts.ts:2309-2355` (`TRANSLATE_SCRIPT`), `:2384` (`portsOf`); `cg003Components.ts:356-399` (the type table) | ISL-006, ISL-007 | Every page's words in EN and FR are unchanged (a page-by-page text diff); the mirror regex is deleted, not left unused |
| W9 | A 693-row `Data/Words` Static Data table fed to that Function, placed 16 times | `cg003Components.ts:291` | ISL-007 | As W8; a `{name}` placeholder other than `{b}` renders filled |
| W10 | `!important` on every rule that must beat a node's inline layout: 197 occurrences | `cg007Look.ts:14-15` (the reason), the stylesheet below it | ISL-008 | The six screens' screenshots at 1368 × 912 and 390 × 844 are unchanged with the `!important`s ISL-008 makes unnecessary removed (count before and after) |
| W11 | DOM access from Functions: `document.querySelector(…).scrollIntoView` and a reflow hack (`void box.offsetWidth`) | `ig004Island.ts:555-568` | ISL-009 | The found robot and the plot card scroll into view on a phone without a Function touching `document` |
| W12 | A loopback `fetch` from a Function to the shell's `/__garden/olive` route | `cg005Olive.ts:93` (`OLIVE_URL`), `:561` (`fetch`) | ISL-010 | Olive answers through `Model Request` in the packaged app and in the stub drive |
| W13 | The kit forces `display: grid` after the bridge's merge, and sets `defaultCss` to grid | `library/modules/garden-kit/src/kit.js:1932-1944`, `:1970` | ISL-011 | 48 cells draw as a grid with the force removed |
| W14 | three.js pinned to r158 (the last UMD build), read at mount; a 3-line shim keeps Blockly's FR and EN messages apart | `library/modules/garden-3d-kit/src/kit3d.js:12-18`; `library/modules/garden-kit/project/noodl_modules/garden-kit/blockly-msg-keep.js` | ISL-012 | A current three.js loads with no deprecation warning; FR and EN blocks both read correctly in one session |
| W15 | Pinned copies between the two kits, and `JOB_VOCABULARY` in three places, pinned equal by tests | `garden-3d-kit/src/kit3d.js:29`, `:186`, `:329-335`; `garden-kit/src/kit.js:1306-1312`; `cg002Content.ts:1401`; the copy gate `ig007Garden3d.test.ts:1105` | ISL-013 | One definition; the copy gate deleted because there is nothing to compare, not because it was red |
| W16 | `NODEGX_KIT_EXTRACT` set by hand in specs; `make-worktree.sh` links `noodl-mcp/dist` | `ig007Garden3d.test.ts:1151-1158`; `helpers.ts:130`; `scripts/devtools/make-worktree.sh:139-145` | ISL-014 | In a fresh worktree with no `dist/`, the door's refusal names the missing extractor; with it built, the env var is not needed |
| W17 | Raw `fs` writes around the door: the project skeleton, module copies, `rootNodeId` | `cg003Template.ts:58-83` (`writeSkeleton`), `:86-110` (`installModules`, `cpSync` at `:90`), `:207` (`pinRootNode`); `templatePins.ts:109-120` | ISL-016, ISL-017 | The same project bytes, written only through door tools |
| W18 | The run-on-value-change settle, run from test code after authoring | `cg003Template.ts:194`; `templateArtefact.ts:70-101` | ISL-018 | Opening the door-built project in the editor writes 0 files |
| W19 | Id and timestamp pins for byte-identical regeneration | `cg003Template.ts:195-196`; `templatePins.ts:1-120` | ISL-019 | Two runs of `template:garden` give identical bytes with the pins removed |
| W20 | `apply_plan({ render: 'off' })`, and 18 external CDP drives (10,209 lines) for what a render cannot do | `cg003Template.ts:12-14`, `:182`; `scripts/devtools/drive-{cg,ig,iw}*.js` | ISL-021 | Named drives replaced by door-driven checks, one at a time; the drives that remain say why |
| W21 | The `uncollapsible-multi-column` warnings pinned as expected noise, by component | `cg003Template.test.ts:269-276` | ISL-022 | The warning list is empty, or each warning left is a real overflow, measured at 390 px |
| W22 | Kit gates run in a two-module project (D41) | `phase-105-the-coding-garden/README.md:107-108`; `ig007Garden3d.test.ts:1162` | P88 GAM-018 (R2 built; its status line still says "uncommitted", session 17) | Re-read only: does a kit now register the same beside the 33-module library? If yes, the gate may run beside the library; if no, it stays and says why |

**Two corrections to the brief this task was scoped from.** (1) The island's loop *wiring* is in `cg003Components.ts`
(`:1729-1777`), not in `ig004Island.ts`, which holds only the tick's script. (2) The audit's 195 `!important` reads 197 in
`cg007Look.ts` at HEAD (counted with `grep -o`). Neither changes the work.

**Not here, on purpose.** ISL-015 (kit lore) and ISL-020 (one-line script edits) remove no code from the template. F07's
traps (publish on change, a fresh object every tick) are the product's documented behaviour, not workarounds.

## 3. Where it bites

- **A person learning from the island** copies a Timer loop, a latch and `'yes'` strings into their own app, because the
  template is the example.
- **The next template** inherits the generator's helpers (`templatePins`, `installModules`) as if they were the method.
- **A drive that believes a stale deploy** grades the old app. `drive-all.sh:35` writes "STALE" and carries on.

## 4. Related work and collisions

- **P88 R28** is the model: nine workarounds, each asked in plain words, each answered "keep with a comment" or "drop",
  each with its cost recorded before it was done. Two answers were "Dunno" and the builder decided, overturnable.
- **P108** owns the island's content and runs lanes in session 5 (`phase-108…/NEXT-SESSION-PROMPT.md`). Every row here
  edits the generator. **No row lands while a P108 lane is open**; each is a commit at a merge point, regenerated, with
  P108's gates re-run.
- **ISL-024** may move these files. The row locations then change; the rows do not.
- **The memory "NO TICKER"** (09-11) was the reason W1 exists; it was corrected on 2026-10-01 (AUDIT R-e). **The memory
  "the deploy exits 0"** is about the internal bundle (AUDIT §2).
- Owner grep: `grep -rn "Repeat\b\|nodegx deploy\|nodegx-deploy.cjs" dev-docs/tasks/phase-10[5-8]*` → the garden's drives
  name the bundle; no task moves them.

## 5. Design — 🔒 rulings first

**Slice 0 (W1, W2) needs no ruling.** The fix exists, the template's behaviour must not change, and the board's order of
work (README §9) names them first. They prove this task's method on two rows before any product task lands.

🔒 **Every other row is asked of Richard when its ISL task lands, one question per row, in R28's form:**

> "ISL-0NN is built. The island still has <workaround>, at <where>. **Drop it** (cost: <regeneration, specs, drives>), or
> **keep it with a comment** that says why it stays?"

The recommendation for each row is **drop**, unless removing it changes what a family sees, or costs a drive that cannot
run on this machine that day. In that case, keep it with a comment and record the reason. A "Dunno" is decided by the
builder, recorded as overturnable, as R28 did.

Constraints:
- **One row per commit**, each with its regeneration and the gates it touched, so a red is attributable to a row.
- A row is removed only after its product fix is **in HEAD and in the build the drive runs** (the dev stack, the deploy
  bundle and the kit's built copy can each be stale).
- The 🔴 comments that explain a workaround go with it. A comment left beside code that no longer exists is a lie.
- W1: `Repeat` beats on its own interval, and the Timer chain waited *after* each tick's write. On a synchronous tick
  these are the same; record the per-tick world on both before believing it.
- W2: `nodegx deploy` spawns the same `noodl-preview/dist/nodegx-deploy.cjs` (`nodegx-export/src/cli/deployEngine.ts:43-46`).
  Moving to it buys an exit code, not a fresher engine. Its mtime on this checkout reads 2026-09-17 18:11; whether that
  matters to the drives is part of W2's first reading.

## 6. Acceptance criteria

| AC | Clause |
|---|---|
| AC1 | **RED at HEAD, recorded in §8.** A census spec lists each W1-W22 workaround by a pattern at its location (e.g. `TIMER_NODE` with `rnTimer`; `'yes'` in `record`; `nodegx-deploy.cjs` in a drive) and finds all 22 present. Known-firing control beside it: the same census finds `Repeat` in the node catalog and `engine: 11` in `exitCodes.ts`, so a row reading "fixed" is not a missed match. |
| AC2 | **Slice 0, W1.** Both loops use `Repeat`. A seeded run of three programs gives the same tick count and the same world per tick as HEAD (recorded both ways). `cg003Template.test.ts`'s 9 timer pins are rewritten to pin the `Repeat` wiring. A sabotage arm (Repeat's Stop unwired) makes the Stop clause red. One garden page drive confirms Play, Stop and Step on screen. |
| AC3 | **Slice 0, W2.** Every garden drive script and shell runner deploys with `nodegx deploy` and gates on its exit code. A sabotage arm (deploy without `--allow-development-engine` on a development build) exits 11 and the runner stops before driving. The "exits 0" header comments are corrected. No `index.html` mtime guard is left (`grep -c "\-nt .*before"` → 0 over the garden drives). |
| AC4 | **Per row, after its ruling.** Each later row's removal proves the clause in §2's last column, with the regeneration's byte diff recorded, and the row's ruling quoted in §8. |
| AC5 | **The end state.** The AC1 census re-run: every row reads removed or "kept: <reason>" with the comment in place. Zero rows are silently present. |

## 7. Traps

- 🔴 **A drive reading an old build grades the old island.** Check the deploy's own report and the drive's page, not only
  the generator's output.
- 🔴 **Removing a pinning gate turns it green for the wrong reason.** W15's copy gate and W21's warning list go because
  there is nothing left to pin, which the row's proof must show first.
- 🔴 **One heavy job at a time.** A regeneration plus a drive is heavy. Never run two rows' drives at once, and never beside
  a peer's `test:ci`.
- The garden's `generate-garden-template.ts` runs the engine gate first and writes nothing if it is red. A red there is
  that gate's reading, not this row's.
- Kit rows (W13-W15) change a kit's source, its built `index.js` and the template's `noodl_modules` copy (four copies, F19).
  Rebuild and regenerate together, or the drive runs the old kit.

## 8. Record

None yet.
