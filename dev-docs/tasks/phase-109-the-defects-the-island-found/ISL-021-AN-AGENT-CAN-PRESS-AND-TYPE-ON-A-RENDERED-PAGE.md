# ISL-021 — An agent can press and type on a rendered page

**Status: ✅ CLOSED s15 (2026-10-04) — AC3 met on Richard's ruling "build the cheap 9, drop 8": `read` gained `console_errors`, `network_errors` and `other_origins` (each a list so far), and a twelfth verb `reduced_motion`; the 8 changing/delayed/body-matched fake-server answers ruled out of scope, so the only "not" left is those 8 and drag (2). All seven ACs met. s14: all eleven verbs (`stub_route` added); AC2, AC4, AC5, AC6, AC7 met. Slice 1 s13. Ruled s13: "One call, a step list"; rulings 2–3 as recommended (README §8 round 3). Scoped 2026-10-01 at `27d891bf3`.** **Source:** [AUDIT F28](AUDIT-2026-10-01.md) · the 18
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

### Session 13 (2026-10-04) — ruled "One call, a step list"; slice 1 built; AC2, AC4 met, AC5 by PID

**Ruled** (README §8 round 3), asked with the census: 114 hand-written `drive-*.js` in `scripts/devtools/`, 45,773
lines, 22 for the island (12,402 lines; 18 / 10,209 at scoping). Rulings 2–3 as recommended.

**Built:**

- `scripts/devtools/drive-steps.js` — the step runner, inside the render harness's own `withRenderedPage` (one
  Chrome, its server, its teardown and signal handlers; no second launcher). Ten verbs: `tap`, `type`, `key`,
  `wait_for`, `read` (+ `expect`), `navigate`, `viewport`, `screenshot`, `seed_storage`, `clear_storage`.
  🔴 **`stub_route` (the eleventh) is NOT built**: the harness's CDP client takes its event handler at connect time,
  so `Fetch.requestPaused` needs a change inside `render-report.js`'s `attachTab` — left for slice 2.
- `drive_page` (`src/tools/renderTools.ts`, runner resolved beside the harness in `src/render.ts`
  `resolveDriveCli`; `NODEGX_DRIVE_CLI` overrides), deferred in `explore` with keywords `press`, `click`, `tap`,
  `drive`, `interact`, `play`, `test the page`. Resident surface **8,261 before and after**. A PASSED/FAILED headline
  before the JSON, as `render_report`'s verdict is; caveats for a hidden page, no WebGL2, console errors.
- Packaged: `drive-steps.js` added to the editor's `render-harness` mapping (`noodl-editor/package.json`) and to
  `uni-012/harness-packaging.test.ts`'s list (7/7).

🔴 **Met on the way — a near-miss, recorded:** the runner was first written to `scripts/devtools/drive-page.js`,
which EXISTS (P77's persistent URL driver, last committed `f77e66476`). The Write tool overwrote it. Restored from
HEAD at once; no peer had uncommitted edits in it (40 most recent transcripts searched: none edited it). The new
runner is `drive-steps.js`, and two of P77's designed-in traps were taken from the file it nearly replaced: text
matches **exactly** (`text_contains` is the opt-in — a substring once pressed `Published` for `Publish`), and text is
searched inside `<body>` among elements with area (`<title>` matches every query with zero area).

**The rules designed in** (each from a drive that once read wrong): a tap is `Input.dispatchMouseEvent` at the
centre after `scrollIntoView`, refused unless `elementFromPoint` there is the element or inside it (`el.contains(at)`
only — never an ancestor); the element is lent `pointer-events: auto` for that one measurement (a label inside a
button) and restored before the press, so the press lands where a finger's would; waits poll a condition; after an
input the runner waits two animation frames, not a sleep.

| AC | reading |
|---|---|
| AC1 | Red at HEAD by source: `render_report`'s inputs are `viewports`, `screenshot`, `scale`, `backend_port`, `page`, `out_dir` and no deferred tool presses or types (`find_tools` "press"/"click" revealed nothing before this). Not re-run as a spec at HEAD. |
| AC2 | ✅ `isl021DrivePage.test.ts` through the MCP door on a copy of `templates/bot-garden` rendered from disk: clear storage → `/` → tap "New player" → type "Ada" into the first input → tap "10–12" → tap "Let’s go!" → wait for `island` → read the saved family's active profile name → **`Ada`**, `PASSED — 8 of 8 steps`, 0 console errors (~2 s). The covered arm: a real full-screen element added to the page, then tap "New player" → `FAILED at step 2 (tap)`: *"… a finger at its centre would press div#isl021-cover"*, step 3 not run. |
| AC3 | ⬜ The corpus count (`drive-iw006-shop.js`, `drive-cg003-pages.js` clause by clause) — not done. |
| AC4 | ✅ 🔴 Reverted arm (the hit test removed): the covered case red (it tapped through the cover), the other three green. Restored. |
| AC5 | ✅ The run reports `visibilityState: "visible"` (and `webgl2: false` — headless; said in the headline). No Chrome left behind: orphaned render-profile Chromes by PID, before vs after, none new. |
| AC6 | ⬜ An agent proves a form of its own — not run. |
| AC7 | ⬜ The shop drive's `SHORT`/`BUY` as step lists vs the CDP drive on the deployed artefact — not run; note the runner drives a FROM-DISK render, the drives a deployed one (§7's first trap). |

### Session 14 (2026-10-04) — slice 2: `stub_route`; AC3 counted; AC7 met; two runner rules the corpus forced

**Built** (`ede6bf86b`, `2a05865f9`):

- **`stub_route`, the eleventh verb.** `{ stub_route: "/path", json? | body?, status?, content_type? }` answers that
  path through CDP `Fetch` (a route ending `*` is a prefix; a full `https://` URL stubs another origin); unclaimed
  paused requests continue. **Stubs at the head of the list are installed before the page first loads** — the
  harness gained `withRenderedPage({ beforeBoot })` and an `onEvent` hook on `attachTab` (its `connect` took one
  handler at connect time, which is why slice 1 stopped). `read: { stub }` gives `{ hits, body }`; the result
  lists every stub's hits. Spec `isl021DrivePage` 7/7: the boot stylesheet stubbed first reads **1 hit**, the same
  stub after a step reads **0** (the control); 🔴 reverted arm (no before-boot install) → the first red, hits 0.
  ⚠️ An unstubbed path is **200**, not 404 — `render-from-disk` falls back to `index.html`; the known-firing control
  reads the body.
- **`navigate` reloads the document on a path-routed project**, even to the route it is on (the garden, 4 of 4,
  a `window` mark lost each time). That is how a step list proves what survives a reload; on a hash-routed project
  it would be a fragment change. Written into the runner's header.
- 🔴 **A seed is written again at the start of the NEXT document load, before the app's scripts, once.** The AC7
  lists first seeded with a `read` expression (the drives' `writeStore`) and went red in 3 of 4 arms, shells 0: the
  island writes its model **7–23 ms after a page appears, or not at all** (3 runs instrumented, `setItem` hooked) —
  so no condition on the page orders a step after it, and the drive's own `wait(700)` is what hid it.
  `Page.addScriptToEvaluateOnNewDocument`, guarded by a `sessionStorage` mark so a LATER reload is not reset; the
  scripts are removed after the next `navigate`. 🔴 Reverted arm (the mark check replaced by `return`): 4 of 4 red,
  twice. **Edit form** `{ seed_storage: "key", edit: "js changing v" }` — the corpus's `writeStore` (the profile id
  is made at runtime, so a whole-value seed cannot be written by a model); the edited value is computed once and
  that value re-written, so an edit never applies twice.
- 🔴 **A tap waits for its target to hold still** (the same centre two animation frames apart, ≤ 2 s). Without it,
  2 suite runs in 7 failed at "A new Pip" — the Robots tab was pressed while the shop's sheet slid in. The CDP drive
  had this as `wait(200)` + re-measure. With it: 6 + 8 suite runs, 0 failures.

| AC | reading |
|---|---|
| AC3 | 🟡 **Counted; the bar is not met** (149 `check(` call sites; a read-only agent, line-cited): **88 expressible, 42 only through an `expression` into app internals, 19 not.** Of the 19: drag **2** (cg003 393, 858), touch **0**, other **17** — no network errors in the run output (3: iw006 404, cg003 645, 1480), console errors per step (3: 644, 757, 960), a stub whose answer depends on a value read mid-run (3: 887–889), a stub answering in a set order (3: 912, 913, 919), a stub that holds its reply (2: 1274, 1290), reduced-motion emulation (2: 1413, 1414), a whole-run request log (1: 1400). **So the AC's "drag and touch are the only not" is NOT met** — 17 others, named. The count was taken BEFORE the edit form; it is the missing verb the agent ranked first (11 iw006 + 3 cg003 sites needed only a save edit — they move from "internals" to plain steps that still need the save's format). Next by reach: a wheel/scroll at a target (11 cg003 sites use Blockly's `reveal`), network output (4), per-step console errors (3), stub `sequence`/`delay_ms`/match-on-body (5). |
| AC6 | ✅ **Round 2.** Claude Code 2.1.251, `claude -p`, sonnet, `--strict-mcp-config`, the stdio server from the worktree's `dist` (built at `78707c829`), `--disallowedTools Bash Edit Write NotebookEdit Agent`, a git-tracked copy of `demo-app`. Told only: *"add a page called "Sign up" with two text fields — Name and Email — and a Submit button. When Submit is pressed, the name … should be saved into a Variable called signupName. Then prove to me that it actually works, not just that it draws … Use the nodegx tools."* It built `Pages/SignUp`, called `render_report` three times, then — on the new last line of that answer — `find_tools({ query: "press" })` → `drive_page`, and drove its own form: **`PASSED — 5 of 5`**: `signupName` null → type "Ada Lovelace" → still null → tap Submit → **"Ada Lovelace"**. 36 turns, **$1.47**. Its transcript holds the steps and the value; it wrote no browser script (it could not: Write and Bash were removed, so that clause holds by construction). **Round 1** (the same prompt, `Agent` allowed, the server at `2a05865f9`) never called `find_tools`: it read `render_report` four times, searched Claude Code's OWN `ToolSearch` ("nodegx interact click type fill test runtime") — which cannot see a tool the server has not advertised — then the `run` skill, then subagents hunting Playwright; stopped by me. **Fixed between the rounds** (`ae295e7bb`, `78707c829`): `render_report` ends with `FIRST_FRAME_NOTE` (response text, 0 resident tokens), and `find_tools` falls back to words (`P109-S13-FINDTOOLSPHRASE`). **Round 2's failed tries, each fixed after (`403dae9bf`):** a `testid` it never set (it took the node id for one — the description now says Data Attributes); `text_contains: "Your name"` found nothing (a placeholder is not `innerText` — a field's placeholder/aria-label now counts); a second name typed into a filled field read "Grace HopperKatherine Johnson" (`type` appends, as a keyboard; `replace: true` added and said); it expected the last call's Variable to survive (each call is a fresh browser — now said). Spec 8/8, reverted arm (no placeholder match) red. |
| AC7 | ✅ `isl021ShopParity.test.ts` 4/4: the shop's SHORT and BUY (+ the reload check) at 1368 × 900, EN and FR, as one step list per language through the in-process client on a copy rendered from disk; a copy with `shBuy.onClick → shBuyFn.go` removed → `failed`, clause **BUY**, SHORT green, both languages. **The CDP drive on the same pair, DEPLOYED** (`assemble` + `nodegx deploy` exit 0 each, `--quick`): template **28/28**; without the wire **SHORT ×4 PASS, BUY ×4 FAIL** (EN and FR) plus the later clauses that need a bought robot. Same verdict per clause. One difference, by design: the step list stops at its first failure, so its BUY-reload is not run; the CDP drive grades it red. The drive_page side cannot run on the deployed artefact (§7's first trap): the comparison is from-disk vs deployed of the same template. |

### Session 15 (2026-10-04) — AC3 ruled "build the cheap 9, drop 8", built; ✅ CLOSED

**Asked** (round 4, one question, in plain words): *"`drive_page` is the tool that lets an agent press and type on a
rendered app page and check what it sees … Counted: 88 can be written plainly, 42 only by reading the app's internals
with a JS expression, 19 can't. 2 of the 19 are drag. The other 17: 'no network request failed' (3) and 'nothing was
fetched from Google Fonts' (1), because the result doesn't list requests; 'no console errors yet' at a given step (3),
because the result only gives the whole run's errors; 'under reduced motion nothing animates' (2), because the tool
can't switch reduced motion on; and 8 where the fake server answer has to change from call to call, wait before
replying, or depend on what the app sent. What should I do?"* Options: build the cheap 9, drop 8 (recommended) / build
all 17 / accept the count as is. **✅ Ruled: "Build the cheap 9, drop 8."**

**Built** (`scripts/devtools/drive-steps.js`, `render.ts`, `renderTools.ts`):

- **Three `read` forms answered from the run, not the page**, each the list so far, so `"expect": []` is "none yet" at
  that step: `{ console_errors: true }` (the harness's per-tab buffer), `{ network_errors: true }` and
  `{ other_origins: true }`. The result carries `networkErrors` and `otherOrigins` beside `consoleErrors`, and the
  headline says "N failed request(s)".
- **The network log starts before the first load** (`Network.enable` in `beforeBoot`, beside the leading stubs), so a
  font the page asks a CDN for at boot is seen. A failure is `Network.loadingFailed` (the drives' reading) **or** a
  response of 400+, with its URL. Not counted: a **cancelled** request (a reload cancels what was in flight — the
  step's doing) and **Chrome's own `/favicon.ico`** — 🔴 measured: with 400+ counted, the garden's clean boot read
  `["404 …/favicon.ico"]`, every run; the browser asks for it, not the app, and the CDP drives never counted it.
- `other_origins` is every http(s) origin other than the requesting document's own — **including another port on
  127.0.0.1** (an app asking a local model on `:11434` is exactly what a person would want named; ISL-010).
- **`{ reduced_motion: true | false }`, the twelfth verb** — `Emulation.setEmulatedMedia` `prefers-reduced-motion`;
  per session, so it holds across later navigations (read `true` after a reload). The row's value is what
  `matchMedia` then answers.

**The 9 clauses, re-read:** iw006 404 + cg003 645, 1480 → `network_errors`; cg003 644, 757, 960 → `console_errors`;
1400 → `other_origins` (the drive's "only 127.0.0.1, data:, blob:, about:" is exactly "no other http(s) origin");
1413, 1414 → `reduced_motion` then an `expression` read of computed style (the page's CSS, not the app's internals).
**AC3's count now: 97 expressible, 42 through an `expression` into app internals, 10 not — drag 2, and the 8 ruled out
of scope** (cg003 887–889, 912, 913, 919, 1274, 1290). **✅ AC3 met.**

| reading | |
|---|---|
| `isl021DrivePage` | **10/10** (2 new): a clean garden boot reads `[]` for all three, then a fetch to `https://isl021.invalid` and a `console.error` are named by each read and in the result (the known-firing arm beside each absence); an injected element whose animation honours `prefers-reduced-motion` reads running **1 → 0 → 1** across `reduced_motion` true/false. 🔴 The garden's own home page reads **0 in both arms** — it grades nothing, so the spec brings its own animation. |
| 🔴 reverted arms | `reduced_motion` sending no preference + the network log never enabled → **both new specs red**, the eight others skipped by `-t`; restored from a `cp` (`cmp` equal). |
| neighbours | `toolDisclosure`, `renderTools`, `isl021ShopParity`, `p109FindToolsPhrase`, `rel011cAdminSurfaces` **64/64** (`drive_page` is deferred: its longer description costs 0 resident tokens). |
| `tsc --noEmit -p packages/noodl-mcp` | **8 errors, the same six spec files** — the floor. |

