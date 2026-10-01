# ISL-021 — An agent can press and type on a rendered page

**Status: ⬜ not started — scoped 2026-10-01 at `27d891bf3`.** **Source:** [AUDIT F28](AUDIT-2026-10-01.md) · the 18
CDP drives of P105, P106 and P108 · **Side:** product (MCP door, `noodl-mcp` render harness; possibly `nodegx-observe`)

`render_report` loads every page and measures it as it first draws. It cannot press a button, type a name, wait for
something to happen, seed what the browser has saved, or read what the app now holds. Olive's Island is a game: nothing it
does is visible on first draw. So every claim about it was proved by an external Chrome DevTools script, 18 of them,
10,209 lines, none of which an agent using the MCP tools could have written or run.

## 1. The person sentence

**An agent that has just built a page presses its button, types into its field and reads what the page shows and what the
app saved, through the MCP door, without writing a browser script, and Richard can read the steps it took.**

## 2. What was measured

All rows **re-read by me at HEAD `27d891bf3` on 2026-10-01**, from source and with `wc`/`grep -l` over the drives. Neither
`render_report` nor a drive was run.

| reading | where |
|---|---|
| `render_report`'s inputs are `viewports`, `screenshot`, `scale`, `backend_port`, `page`, `out_dir`. Nothing presses, types, waits, seeds or reads state | `packages/noodl-mcp/src/tools/renderTools.ts:38-96` |
| It renders from disk through a child process (`scripts/devtools/measure-from-disk.js` and `render-report.js`), one page per measurement, ~2 s a page by its own description | `src/render.ts:1-26`, `:299-317`; `renderTools.ts:60-64` |
| `render_report` is resident (core group) | `src/toolGroups.ts:153-156` |
| The generator turns rendering off with the **environment** escape `NODEGX_RENDER_DISABLED=1`. `render: 'off'` alone is **refused** on a plan that writes anything visual ("you may not skip looking"). The audit's "turns it off entirely" is right, by the env var | `cg003Template.ts:12-14`, `:125`; `src/tools/planTools.ts:939-945`, `:1018-1033`; `src/render.ts:153` |
| 18 drives `scripts/devtools/drive-{cg,ig,iw}*.js`, **10,209 lines**; the largest `drive-cg003-pages.js` at 1,514. All run against the **deployed** template through `drive-deployed.js` (`withDeployedSite`, 334 lines), not the from-disk render | `wc -l`; `drive-iw006-shop.js:37`, `drive-iw004-blocks.js:31` |
| What the drives do, by files that use it: a tap after `elementFromPoint` says the finger would hit it (17 of 18); a CDP mouse press (18); `Runtime.evaluate` reads (18); screenshots (18); console and network error counts (18); reads of the app's Variables (17); a stub for the shell's `/__garden/*` routes inside Chrome (16); `localStorage` seeds and reads (15); key presses (8); touch events (5); viewport emulation (5); a drag (1) | `grep -l` over the 18 files, this session |
| Sample, `drive-iw006-shop.js` (408 lines): a `tap(finder)` that scrolls, re-measures and refuses a tap that would land on something else; `until(expr, ok, ms)` polling; a storage seed that rewrites the saved family then navigates; fresh-state by `Storage.clearDataForOrigin`; clauses `BUTTON`, `TAB`, `SHORT`, `BUY` … each at three viewports in two languages | `drive-iw006-shop.js:1-33`, `:100-170` |
| Sample, `drive-iw004-blocks.js` (550 lines): presses and drags on a Blockly workspace, mouse and touch, and reads the program from the page's `gardenProgram` Variable | `drive-iw004-blocks.js:1-25` |
| A second server, **`nodegx-observe`**, already clicks and types in a running app, addressed by node id (`click`, `set_text`), reads a port's current value (`get_port_value`), and walks provenance. It needs the **editor** running with a preview open, and its events are untrusted DOM events | `packages/nodegx-observe/src/server.ts:118-440`; `packages/nodegx-observe/README.md:1-30` |

## 3. Where it bites

- **An agent building anything interactive** (a form, a game, a cart) can only report that the first frame looks right.
  The VIB-007 verdict says "rendered clean" over a page whose only button does nothing.
- **Richard, watching an agent build**: the evidence that a game works is a script in `scripts/devtools/`, written by
  hand, run outside the conversation, read by nobody but its author.
- **Every template push** re-writes `tap`, `until` and the storage seed; the island wrote them three times over.

## 4. Related work and collisions

- **P55 LAS-005** (`render_report`) and **VIB-007** (the done/not-done verdict): this extends their loop past the first
  frame. A page-scoped run does not certify the project (`renderTools.ts` note); neither may a step run.
- **P36 OBS-004** (`nodegx-observe`): the other half of this already exists for the editor's preview. Ruling 1(c) below.
- **ISL-009** (a node can be named for a test): addressing a step by a stable name instead of a CSS class depends on it.
- **ISL-025** moves the drives to `nodegx deploy`; a door that drives the deployed page shares that entry point.
- **P56 BEN-003 / P57 BLD-004**: an occluded window throttles timers about 1000×. A headless step runner must say its page
  was visible, as GAM-013's drive did.
- Owner grep: `grep -rlai "interaction door\|drive_page\|render_report.*tap\|press and type\|interact_page\|scripted step" dev-docs/tasks --include='*.md'`
  → P17's curriculum notes and this phase. **No owner.**

## 5. Design — 🔒 rulings first

1. 🔒 **What kind of door.** (a) **A scripted step list in one call**: `drive_page({ page, viewport, steps: [...] })`, run
   headless and torn down, returning one row per step (passed, value read, screenshot path). (b) **An exploratory
   session**: `open_page`, `press`, `type`, `read`, `close`, a browser kept alive between turns. (c) **Extend
   `nodegx-observe`** to attach to a headless page the door opens, so its `click`/`set_text`/`get_port_value` work without
   the editor. **Recommendation: (a) first.** It is one tool, deterministic, gradable, maps one-to-one onto a drive's
   clauses, and leaves no Chrome running on a shared machine. (b) is what a person exploring wants and costs a live browser
   per conversation. (c) is worth doing after (a), so one vocabulary serves both servers.
2. 🔒 **The verbs, measured against the corpus, not invented.** From §2's census: `tap` (by visible text, by node label,
   by selector; refused if `elementFromPoint` would hit something else), `type`, `key`, `wait_for` (an expression or a text,
   with a timeout), `seed_storage` / `clear_storage`, `read` (text, a Variable, a stored key), `screenshot`, `navigate`,
   `viewport`, `stub_route` (a canned response for a path). Drag and touch are named and deferred (6 of 18 drives).
   **Recommendation: these eleven**, and AC3 is the count of clauses they can express.
3. 🔒 **The budget.** The tool is deferred. (a) Appended to an existing deferred group, at **0** resident tokens, and found
   by keywords (`press`, `click`, `type`, `drive`, `interact`, `play`). (b) A new `drive` group, about **26** tokens, which the
   bar cannot hold (below). **Recommendation: (a)**, in the `explore` group, and name the trade in the manifest as
   `create_node_kit` and `open_in_editor` did: a model browsing group purposes will not meet it.

Constraints:

- 🔴 **The resident surface is full**: `SURFACE_TOKEN_BUDGET = 8280` (`tests/toolDisclosure.test.ts:83`), last recorded at
  8,275, **5 tokens of headroom** (`src/toolGroups.ts:425-430`). `render_report` is resident: **no parameter is added to
  it.** A new group costs ~26; resident costs the whole schema. Only (a) of ruling 3 fits without a renegotiation.
- A new tool owes registration, a `TOOL_GROUPS` home (guard at `toolDisclosure.test.ts:141`), a README §Tools row, a spec
  that reaches it through `find_tools` by keyword, and packaging: if it spawns a sibling bundle, `mcpPackagingCompleteness
  .test.ts` must find it shipped.
- It reuses the render harness's Chrome and teardown; no second Chrome launcher. One heavy job: a step run is one render.
- Every step result is in the response as text, so a transcript is the record Richard reads (the person sentence's second
  half). Screenshots follow `render_report`'s `out_dir` rule.

## 6. Acceptance criteria

| AC | Clause |
|---|---|
| AC1 | **RED at HEAD, recorded in §8.** A spec lists `render_report`'s input schema and every tool `find_tools` can reveal, and finds none that takes a press, a key or a wait. **Known-firing control beside it:** `render_report({ page })` on a copy of `templates/bot-garden` returns a measured row for the Profiles page (it renders at all, with the kits; if it does not, that is recorded as the first finding). |
| AC2 | After: `drive_page` on the garden copy runs "tap New player, type Ada, tap 10–12, tap Create, wait for `/island`, read the saved family's profile name" and returns one row per step and `Ada`. A tap whose target is covered is refused with what it would have hit. |
| AC3 | **The corpus, counted.** Every clause of `drive-iw006-shop.js` and `drive-cg003-pages.js` is listed as expressible in the ruled verbs or not, with the reason. The count is recorded; drag and touch are the only "not" the ruling allows. |
| AC4 | 🔴 **Reverted arm:** remove the `elementFromPoint` check from `tap`, and AC2's covered-target arm goes red (it taps through the cover). |
| AC5 | The run leaves no Chrome process behind (counted by its own PID, never by name), and reports the page was visible. |
| AC6 | **The person's door, over the real protocol.** Claude Code (stdio server from `dist/noodl-mcp.cjs` under a project-local `--mcp-config`) builds a two-field form with a Submit that writes a Variable, then proves it works with `drive_page`. Its transcript holds the steps and the read value; nothing in `scripts/devtools/` was written. |
| AC7 | **The generator's matching step.** The generator writes no file for this, so there is no raw-fs step to drop. Its matching workaround is the drive. One existing drive's clauses (`drive-iw006-shop.js`'s `SHORT` and `BUY`, both languages, one viewport) are rewritten as `drive_page` step lists, run through the in-process client, and give the **same verdict per clause** as the CDP drive on the same deployed artefact. Run once with a deliberately broken template (the Buy button's wire removed): both go red on `BUY`. |

## 7. Traps

- 🔴 **`render_report` renders from disk; the drives run on the deployed site.** Kits, fonts and the `/__garden/*` routes
  behave differently in each. AC7 compares the two on purpose; a step runner graded only on from-disk renders proves
  nothing about a deployed app.
- 🔴 A tap that dispatches a DOM `click()` passes where a finger fails (the drives' `elementFromPoint` rule, memory
  "RENDERED≠REACHABLE"). Press with input events at coordinates, as the drives do, or say the step was synthetic.
- ⚠️ A wait that polls with a fixed sleep grades the machine's speed. `wait_for` takes a condition and a timeout.
- ⚠️ Headless Chrome with `--disable-gpu` has no WebGL2, and the 3D kit falls back and remembers it (F36). A step run must
  report the renderer it got, or a 2D pass reads as a 3D one.
- ⚠️ `isTrusted` is false for synthetic events (`nodegx-observe`'s own warning). A kit that checks it behaves differently.

## 8. Record

None yet.
