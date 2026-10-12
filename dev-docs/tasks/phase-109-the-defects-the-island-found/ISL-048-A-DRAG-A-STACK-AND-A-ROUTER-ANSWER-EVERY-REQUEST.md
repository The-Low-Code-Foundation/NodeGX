# ISL-048 — A drag, a stack and a router answer every request

**Status: ✅ s36 (2026-10-09): 29 of 29 fixed — C120 and C126 `08d62276b` as ruled, on P107's session history (`b7950a3b9`); Page Stack spec v18 (§13). s34 (2026-10-09): 27 of 29 fixed — C139 `c22c9aceb` (§12.2: Keep Pages When Unmounted, Page Stack v17); left C120, C126 (P107's world). s33 (2026-10-09): 26 of 29 fixed — C114 `4e2d846d5` (§12); RouterNavigate v3 `491e8af72` (§12, C118's debt); left C139, and C120, C126 (P107's world). s32 (2026-10-09): 25 of 29 fixed — C138 `40c9fc310` (§11); left C139, C114, and C120, C126 (P107's world). s31 (2026-10-08): 11 of 27 fixed — the Component Stack's never-answered six (C107–C112, §9); all four asks ruled (C103, C104 as recommended in session; C120, C126 on P107's rulings page). s30 (2026-10-08): 5 of 27 fixed — C101, C115, C116, C117, C118 (§8); C119–C127 joined from P107 s58; 4 to ask (C103, C104, C120, C126).** Scoped s30 at `a6caefdde`. **Source:** 27 bugs P107 NSP-016 filed (18 at scoping, C119–C127 from s58) in s55–s57 after
ISL-038 was scoped (the Drag C101–C106, §7.16; the Component Stack C107–C114, §7.17; the Page Router C115–C118, §7.18), handed to
P109 under R16 ("Hand all to P109"): 1 high · 7 medium · 10 low, **2 to ask** (C103, C104). **Side:** noodl-viewer-react
(`components/visual/Drag/Drag.tsx`, `nodes/navigation/navigation-stack.tsx`, `router.tsx`, `router-handler.ts`), the Drag,
Page Stack and Router specs.

## 1. The person sentence

**Everything inside a Drag can be tapped and is drawn, it moves only the way it is locked, and a Component Stack or a Page Router
answers every Navigate, Push, Pop and Reset — Done or Failure, never silence.**

## 2. Why these belong together

P107 NSP-016 rendered the three nodes that move a person around an app and drove them. On a phone nothing inside a Drag can be
tapped (C101): the Site Builder's section rows have buttons and fields inside one. A Drag locked to one axis reports the other
(C102), draws only its first child (C103), and a NaN start blanks the page (C106). A Component Stack leaves a request unanswered
when the component is missing (C107), the transition is unknown (C108), or a Reset arrives during a back's animation (C110). A
Page Router blanks on a link with `%zz` in its query (C115) and shows a page with the old parameters after Back (C117). Each one
is a request the app made and never heard back from, or something drawn that the app did not ask for. One hand-over, one task,
the same shape as [ISL-038](ISL-038-A-VISUAL-NODE-DRAWS-WHAT-IT-WAS-GIVEN.md).

## 3. The bugs

Worst first, generated from the ledger headers. **The ledger file is the source**: each holds the measurement, the
reproduction and a proposed fix. "As proposed" means the bug's own fix has one obvious reading: build it. "Ask first" means
the fix has two reasonable answers that a person would see differently: ask in plain words (§5) before building.

| bug | node | severity | status | build | what a person sees |
|---|---|---|---|---|---|
| [P107-C101](../../bugs/p107-c101-nothing-inside-a-drag-can-be-tapped-on-a-touch-screen.md) | Drag | high | fixed `534203afc` | as proposed | On a touch screen nothing inside a Drag can be tapped — its buttons never click and its text fields never take the keyboard |
| [P107-C102](../../bugs/p107-c102-a-drag-locked-to-one-axis-reports-movement-on-the-other.md) | Drag | medium | fixed `c1623eec2` | as proposed | A Drag locked to one Axis still reports movement on the other — Drag Y moves while the element stays put, then jumps back to 0 at the next drag |
| [P107-C103](../../bugs/p107-c103-a-drag-draws-only-its-first-child.md) | Drag | medium | fixed `3506fc6e9` | ruled (as recommended) | A Drag draws only its first child — every other child vanishes without a word, and the catalog's drag example teaches a readout that never appears |
| [P107-C106](../../bugs/p107-c106-a-start-drag-x-of-nan-blanks-the-page.md) | Drag | medium | fixed `a36403e21` | as proposed | A Start Drag X or Y of NaN blanks the page — the Drag's update compares NaN with itself and sets state until React gives up |
| [P107-C107](../../bugs/p107-c107-a-push-to-a-component-the-project-does-not-have-is-never-answered.md) | Component Stack | medium | fixed `4b29cb7f0` | as proposed | A push, replace or Reset to a page whose component the project does not have is never answered — the caller's Navigate hangs with no Done and no Failure |
| [P107-C110](../../bugs/p107-c110-a-reset-during-a-backs-animation-empties-the-stack.md) | Component Stack | medium | fixed `e9a35da48` | as proposed | A Reset during a back's animation empties the stack: the animation's end takes the new start page off it, and every push after is never answered |
| [P107-C115](../../bugs/p107-c115-a-malformed-escape-in-the-query-blanks-every-page-router.md) | Page Router | medium | fixed `6096fadae` | as proposed | A link whose query has a malformed escape (`?q=%zz`, `?off=50%`) blanks every Page Router — nothing is shown, and its Reset is never answered |
| [P107-C117](../../bugs/p107-c117-back-to-the-same-page-with-new-parameters-after-a-navigate-keeps-the-old-ones.md) | Page Router | medium | fixed `47f987ef6` | as proposed | After a Navigate, Back or Forward to the same page with other parameters keeps showing the old ones — the Page Router hands the new parameters to a page it already deleted |
| [P107-C104](../../bugs/p107-c104-css-class-and-css-style-on-a-drag-do-nothing.md) | Drag | low | fixed `9e19b3841` | ruled (as recommended) | CSS Class and CSS Style on a Drag do nothing — the Drag has no element and passes neither to the child it moves |
| [P107-C105](../../bugs/p107-c105-a-snap-that-waited-for-the-drag-to-mount-starts-from-0.md) | Drag | low | fixed `3049f95d5` | as proposed | A Snap To Position that waited for the Drag to mount starts from 0 — the element jumps to the edge, then animates |
| [P107-C108](../../bugs/p107-c108-a-push-with-a-transition-the-stack-does-not-know-is-never-answered.md) | Component Stack | low | fixed `9f3a5ad49` | as proposed | A push with a transition the stack does not know (a wired Transition such as "Fade") is never answered, and the page it built is dropped |
| [P107-C109](../../bugs/p107-c109-a-components-value-that-is-not-a-list-blanks-the-stack.md) | Component Stack | low | fixed `ed3a693cf` | as proposed | A Components value that is not a list blanks the stack and its Reset is never answered; a page looked up by its label whose component was never set throws the same way |
| [P107-C111](../../bugs/p107-c111-a-back-whose-page-below-left-components-never-pops.md) | Component Stack | low | fixed `62b89308b` | as proposed | A Pop whose page below is no longer in the Components list throws: the pusher hears the results and the page below comes back, but the stack never pops |
| [P107-C112](../../bugs/p107-c112-a-reset-that-finds-no-components-keeps-naming-the-old-page.md) | Component Stack | low | fixed `cd5f66a1a` | as proposed | A reset that finds no components (or no start page) deletes every page but leaves Top Component Name and Stack Depth naming what was there |
| [P107-C113](../../bugs/p107-c113-writing-a-stacks-name-rebuilds-it.md) | Component Stack | low | fixed `2cc6d1dd7` | as proposed | Writing a Component Stack's Name — even the name it already has — rebuilds it at its start page, losing every page pushed |
| [P107-C114](../../bugs/p107-c114-children-count-lags-a-frame-after-a-remount.md) | Component Stack | low | **fixed** `4e2d846d5` | as proposed | A Component Stack mounted again at a frame sends no Children Count in that frame — the page it builds is counted a frame late |
| [P107-C116](../../bugs/p107-c116-a-url-path-of-null-blanks-the-page-router.md) | Page Router | low | fixed `34218468a` | as proposed | A Page Router whose Url path is null shows nothing and never answers a Reset; a Navigate to it shows the page but never pushes its URL or answers |
| [P107-C118](../../bugs/p107-c118-a-navigate-with-no-router-name-made-before-the-router-is-on-the-page-is-never-answered.md) | Page Router | low | fixed `d85e4e6d9` | as proposed | A Navigate with no Router name, pressed while no Page Router is on the page, waits for good — a router registering as Main never takes it |
| [P107-C119](../../bugs/p107-c119-the-browsers-back-resets-a-component-stack-without-use-routes.md) | Component Stack | medium | fixed `b5b06bcb6` | as proposed | The browser's Back or Forward sends every Component Stack on the page back to its start page, Use Routes or not |
| [P107-C120](../../bugs/p107-c120-a-component-stacks-pop-pushes-a-new-history-entry.md) | Component Stack | medium | scheduled | ruled (as leaned) | With Use Routes, a Pop pushes the page below as a new history entry, so the browser's Back then shows the page just popped, as the only page, with a Pop that does nothing |
| [P107-C122](../../bugs/p107-c122-a-component-stack-writes-its-query-parameters-unencoded.md) | Component Stack | medium | fixed `159d0dfaf` | as proposed | With Use Routes, a page's parameters go into the URL's query unencoded: a value with &, #, + or a space comes back different, and one with % empties the stack at the next reset |
| [P107-C124](../../bugs/p107-c124-a-malformed-escape-in-the-url-empties-a-component-stack.md) | Component Stack | medium | fixed `f13a3d88f` | as proposed | With Use Routes, a URL whose query or path parameter has a malformed escape (%zz) empties the Component Stack, and its Reset is never answered |
| [P107-C121](../../bugs/p107-c121-a-component-stack-keeps-the-last-pages-query-in-the-address.md) | Component Stack | low | fixed `437a1bfaa` | as proposed | With Use Routes in hash mode, pushing a page with no parameters keeps the previous page's query in the address, and a reload or Back hands it those parameters |
| [P107-C123](../../bugs/p107-c123-a-page-pushed-by-its-label-has-no-url.md) | Component Stack | low | fixed `52367365b` | as proposed | With Use Routes, a page pushed (or started) by its label rather than its id gets no URL: the address becomes #, and a reload or Back shows the start page |
| [P107-C125](../../bugs/p107-c125-a-page-path-of-null-empties-a-component-stack.md) | Component Stack | low | fixed `230565982` | as proposed | A Component Stack page whose Path is wired null empties the stack at every reset that reaches it |
| [P107-C126](../../bugs/p107-c126-a-component-stacks-reset-shows-the-url-page-not-the-start-page.md) | Component Stack | low | scheduled | ruled (as leaned) | With Use Routes, a Component Stack's Reset (and a Components edit) rebuilds the page in the URL, not the start page its Reset port promises |
| [P107-C127](../../bugs/p107-c127-the-catalog-does-not-know-a-component-stack-page-has-a-path.md) | catalog | low | fixed `df238bd79` | as proposed | The node catalog does not know a Component Stack page has a Path — `pagePath-<pageId>` is missing, so the MCP cannot set one |
| [P107-C138](../../bugs/p107-c138-a-drag-start-drag-x-that-arrives-as-text-joins-with-the-movement.md) | Drag | low | **fixed** `40c9fc310` | ruled | A Drag's Start Drag X (or Y) that arrives over a wire as text joins with the movement as text — a 10 px drag from "50" puts the element at "5010" |
| [P107-C139](../../bugs/p107-c139-a-component-stack-turned-off-with-mounted-loses-its-pages.md) | Component Stack | low | **fixed** `c22c9aceb` | ruled | A Component Stack turned off with Mounted and back on comes back at its start page — the pages pushed, and anything typed on them, are gone; ruled: keep them when an option is ticked |

**Added s30 (P107 s58, `841f0dfe3`):** C119–C127, the Component Stack with Use Routes (NSP-016 §7.19) and one catalog row — 4
medium, 5 low; C120 (which history a Pop leaves) and C126 (whether a Reset with Use Routes re-reads the address) carry "ruling
needed" in their ledger files. C124 is C115's twin on the stack: fix both the same way.

**The two to ask.** C103: draw every child (wrap them in one element the library moves), or keep one child and say so (a
validation warning, the catalog example fixed to put the Circle and the Text in one Group). C104: pass CSS Class and CSS Style
through to the child the Drag moves, or stop offering the two ports on a node with no element of its own. The catalog example
`vis-drag-snap-back.json` is fixed either way.

## 4. Order of work

C101 first (high; one prop and a jsdom regression; check that a drag started on a row's background still works on touch).
Then the requests that are never answered, which share one shape — a throw inside an async build that nobody catches: C107, C108,
C109, C110, C111, C112 on the stack, C115, C116, C118 on the router. Then C117, C113, C114. Then the Drag's C102, C105, C106.
Ask C103 and C104 in one batch when the Drag is next, and build what is ruled.

## 5. Rules for every row

ISL-031 §5 and ISL-038 §5 hold, word for word: re-measure first; a fix ships alone (or one per shared mechanism) and closes its
row in the same commit; a control on every fix (the file before the fix, red on exactly the fix's scenarios); the export is P18's.

- **Where each row lives.** The Drag's C102, C105 and C106 are KNOWN ROWS on the runtime target
  (`packages/noodl-runtime/test/node-spec/conformance.test.ts` `KNOWN_ROWS.Drag`; C106 also two `WITHHELD` entries): the fix drops
  them and the scenario's `row` mark. The Component Stack's and the Page Router's rows are MODELLED — "the spec copies it (R3)":
  the fix is a new spec version that says the intent, and every scenario whose name describes the old behaviour is renamed for what
  happens now (s30 did this for C77 and C78: diff the interpreter's trace of every scenario before and after the spec change, and
  rename only the ones that changed and whose names claim the old outcome).
- **Grade on the runtime at two seeds** (13 and 20732), one node per run so no run reaches jest's 30-minute `beforeAll`, then the
  spec package's gates (`page-model`, `page-model-plants`, `catalog-parity`, `schema`, `batch-visual`, `world`).

## 6. Related work and collisions

- 🔴 **P107 still writes specs** in the same tree (`conformance.test.ts`, `equivalent-mutants.ts`, the scenario files). Build in a
  worktree (`scripts/devtools/make-worktree.sh`) and land by fast-forward, or by compare-and-swap when P107 has an open edit on a
  landing path (the s29 recipe in the folder's NEXT-SESSION-PROMPT).
- C101 is met by the Site Builder (P76): its section rows put buttons and fields inside a Drag. Say so on P76's board when it lands.
- The Component Stack and Page Router were last touched by ISL-028 (going to a page twice with new parameters). Read its §9 before
  touching `router.tsx`.

## 7. Acceptance criteria

- **AC1** — every row in §3 is re-measured at the session's HEAD before it is built.
- **AC2** — C103 and C104 are asked in plain words and ruled.
- **AC3** — every row ruled or marked "as proposed" is fixed, one commit each (or one per shared mechanism), with its regression
  green, its known row (or modelled behaviour) gone and a control red on exactly its scenarios.
- **AC4** — `node scripts/bugs.js --from P107` lists none of this task's rows as `open` or `needs-ruling`.

## 8. Session 30 (2026-10-08) — five rows

Built in worktree `p109-c101`, landed by fast-forward with ISL-031's C78 and C79. **AC1:** each row re-measured at `34c76830f`
by its regression scenario on the runtime target before it was built.

| Row | Commit | What changed | Grade |
|---|---|---|---|
| C101 | `534203afc` | Drag.tsx passes react-draggable `cancel` (input, textarea, select, button, a, [contenteditable]): the library checks it before it cancels the touch | jsdom regression 8 arms (7 controls + the row's background as control), red on exactly the 7 without the prop; Drag 20 / 20 with the old Drag tests |
| C115 | `6096fadae` | `_getSearchParams` decodes like `_decodePathSegment` (kept as written on a malformed escape); Router v2 | runtime 136 / 136; control red on exactly 8 |
| C116 | `34218468a` | the Url path setter stores null as none (only null threw); Router v3 | 136 / 136; control red on exactly 2 |
| C118 | `d85e4e6d9` | `RouterHandler.navigate` reads a blank name as Main, as `registerRouter` does; Router v4 | 136 / 136; control red on exactly 17 (the matrix's queued blank navigate) |
| C117 | `47f987ef6` | `_buildPage` writes `currentPageComponent`; Router v5 (`built` by both); one scenario added for the two mutants it stranded | 137 / 137; control red on exactly 29 (every Reset after a Navigate) |

Router interpreter mutants at 13 and 20732: 445 / 449, 0 survivors. Runtime, Router and Drag at 13 and 20732: conform; the Drag's
one survivor at 20732 (afterInputs drop-set, `willUnmount`, `snapToPositionX.do:done`) is there before any change (told P107).

## 9. Session 31 (2026-10-08) — the Component Stack answers every request

**AC2:** C103 and C104 asked in plain words and ruled as recommended ("Draw them all"; "Apply to what it moves", ledger files,
`6789e076e`); C120 and C126 ruled on P107's rulings page ("A Pop steps the browser's history back"; "Reset goes to the start page
and writes its address", `db4974932`). **AC1:** each row re-measured by its scenario on the runtime target before it was built.
Built in worktree `p109-isl048`, each with the interpreter's trace of every scenario diffed before and after its spec version;
landed by compare-and-swap on `08bea833f`.

| Row | Commit | What changed | Grade |
|---|---|---|---|
| C112 | `cd5f66a1a` | a reset that fails empties the stack's entries and writes Top Component Name `''`, Stack Depth 0 (`_resetLeftEmpty`); spec v3 | 145 / 145; control red on exactly 3 |
| C107 | `4b29cb7f0` | the build is caught in push, replace and reset: Failure, not found (the reset's leaves the stack empty); spec v4; a replace and a Start Page scenario added | 147 / 147; control red on exactly 3 |
| C109 | `ed3a693cf` | a Components value that is not a list is none; a page found by its label with no component is not found; spec v5 | 147 / 147; control red on exactly 2 |
| C108 | `9f3a5ad49` | a push with a transition the registry has not plays None, as a replace's does; spec v6 | 147 / 147; control red on exactly 1 |
| C110 | `e9a35da48` | a back's end removes the entry it animated; a push onto an empty stack is Failure `push-component-stack/stack-empty`; spec v7 | 148 / 148; control red on exactly 2 |
| C111 | `62b89308b` | the back looks the page below up first and refuses (`pop-component-stack/page-not-found`); `_findPage` by id: a row gone is not found; spec v8 | 149 / 149; control red on exactly 1 |

Every row: runtime at seeds 13 and 20732, interpreter mutants 0 survivors at both. Batch: viewer 1,815 / 1,815, spec gates 502 /
520 (18 skipped); Push and Pop Component Stack conform on the runtime; Page Stack re-graded on the rebased tree.

**What s31 found:**

- **Two recorded scenarios did not test what their names said.** C111's changed Components BEFORE the Pop: the reset that write
  queues runs first, so the Pop found no page the stack pushed — the same trace before and after the fix (renamed; the regression
  is the Pop first). And "a push onto a stack with nothing on it is never answered (row C110)" was already Done at the session's
  base (renamed). A trace diff before and after a fix shows only what changed; a regression that does not change has to be
  played at the base to see it never reached its row.
- **Filed:** `P109-S31-REPLACEDROPSPAGE` (low) — a replace refused after its checks has already removed the page on screen (an
  unanimated replace tears down first). The build could come first.

**Left (16):** C119, C122, C124 (C115's twin), C120 (ruled), C121, C123, C125, C126 (ruled), C127, C113, C114; the Drag's C102,
C105, C106, and C103, C104 (ruled). **The export:** not checked (P18's).

## 10. Session 31, second batch (2026-10-08) — the Component Stack's address, its Name, and the catalog

Built in worktree `p109-isl048` on `5f8fe659f`, each with the interpreter's trace of every scenario diffed before and after its
spec version and the changed scenarios renamed where their names claimed the old outcome; cherry-picked onto `d5876f6b4` (P107
s62, which changed `page-model.helper.ts`) and re-gated there.

| Row | Commit | What changed | Grade |
|---|---|---|---|
| C124 | `f13a3d88f` | the address's query and `{name}` parts decode with `decodeOrKeep`: a malformed escape is kept as written (C115's twin); spec v9 | 149 / 149; control red on exactly 4 |
| C122 | `159d0dfaf` | the query's names and values are written with `encodeURIComponent`, as the Page Router does; spec v10 | 149 / 149; control red on exactly 2 |
| C125 | `230565982` | a Path that is not text is unset, so the page takes its label's path; spec v11, one scenario added | 150 / 150; control red on exactly 2 |
| C123 | `52367365b` | `getRelativeURL` finds the page's row by the id `_findPage` found, so a page pushed or started by its label has its URL; spec v12 | 150 / 150; control red on exactly 2 |
| C121 | `437a1bfaa` | in hash mode, a page with no parameters writes the address's path in front WHILE the address holds a query, so the query goes; spec v13 | 150 / 150; control red on exactly 2 |
| C119 | `b5b06bcb6` | the `popstate` / `hashchange` listener returns at once with Use Routes off, read at the event; spec v14 | 150 / 150; control red on exactly 1 |
| C113 | `2cc6d1dd7` | a Name written that keeps the handler's key (`String(name \|\| 'Main')`) is stored and nothing more: no register, no reset; spec v15; one ROUTES scenario now writes Other so it still plays the register's reset | 150 / 150; control red on exactly 2 |
| C127 | `df238bd79` | the catalog probe drives the stack with Use Routes on, and a new pass marks a pattern that needs a switch with `when` (`pagePath-<pageId>`: `{ "useRoutes": true }`); the description says what the stack draws; parity probes a `when` pattern with and without its switch | catalog checks, parity 312 / 312, nine MCP suites 132 / 132; control red on exactly the stack's parity test |

Every row: runtime at seeds 13 and 20732, interpreter mutants 0 survivors at both. Batch (worktree): viewer 1,815 / 1,815, spec
gates 505 / 523 (18 skipped), Push and Pop Component Stack conform on the runtime at 20732. Landing tree (`d5876f6b4` + the six):
spec gates 505 / 523 (18 skipped), spec tsc 0.

**What the batch found:**

- **C121 was narrowed.** Writing the address's path in front of every hash-mode URL (the proposal) changed 22 traces and nothing a
  browser shows: only the string handed to `pushState`. The fix writes it only while there is a query to clear.
- **C120 and C126 (both ruled) wait on P107.** Building either needs the test world to model the browser's history stepping back
  and an entry being replaced; that is P107's world file.

C113 and C127 landed after the six (`2cc6d1dd7`, `df238bd79`; landing tree viewer 1,815 / 1,815, page model and parity 332 / 332, spec
tsc 0, Page Stack 150 / 150 on the runtime at 20732). **C127 records the switch, not only the port:** the probe alone would have
told an author every page always has a Path; `when` is the generic answer, and only Page Stack carries one today.

**The Drag's three known rows** (built in worktree `p109-drag`, landed on `fd44ad2fc`):

| Row | Commit | What changed | Grade |
|---|---|---|---|
| C106 | `a36403e21` | `componentDidUpdate` compares Start Drag X / Y with `Object.is`; the spec copied the `!==` (it set the element back to NaN at every paint), so Drag spec v2; the two `WITHHELD` entries go; one scenario added (placed NaN, dragged to 30, a paint with NaN held), since a NaN sent again is silent on the wire and no recorded scenario told the two apart | 20 / 22 (the other two known rows); control red on exactly 2 |
| C102 | `c1623eec2` | `reportDrag` and `onStop` read the Axis rendered: a locked axis reports where the element is and a Delta of 0 | 21 / 22, 0 generated divergences (18 attributed to C102 at seed 13 before); control red on exactly 1 |
| C105 | `3049f95d5` | `componentDidMount` keeps the position it set (`mountedAt`) until its `setState` lands; a waited snap and its "already there" check read it | 22 / 22, no known row left on the Drag; control red on exactly 1 |

Every row: runtime at seeds 13 and 20732, interpreter mutants 0 survivors at both (the Drag survivor s30 reported at 20732 is gone
too). Landing tree: viewer 1,815 / 1,815, page model and parity 332 / 332, spec and runtime tsc 0, Drag 22 / 22 at 20732.

**The Drag's two ruled rows** (worktree `p109-drag`, landed on `f3455df8e`):

| Row | Commit | What changed | Grade |
|---|---|---|---|
| C104 | `9e19b3841` | the Drag passes its CSS Class and a non-empty CSS Style on the element it moves; the library and the wrapper add both to the node's own (DEF-027) | viewer `isl048-c104-drag-css.test.tsx` 5 / 5; control red on exactly the 3 rows that pass a class or style |
| C103 | `3506fc6e9` | one child is moved as before; more are wrapped in one `<div>` the library moves: a flex column (each child told `column`), relative in the parent's flow or absolute at the top left of a `none` parent; C104's look goes on it | viewer `isl048-c103-drag-children.test.tsx` 6 / 6; control red on exactly the 4 two-child rows |

Both: Drag 22 / 22 at seeds 13 and 20732, mutants 0 survivors (spec comments only, no version: nothing on the wire). Landing tree:
viewer 1,826 / 1,826, viewer tsc 0, page model and parity 332 / 332, spec tsc 0, Drag 22 / 22 at 20732. **C103's column is this
session's reading** of "wrapped in one element", not part of the ruling. **Owed:** the catalog example `vis-drag-snap-back` (a
Circle and a Text in one Drag) rendered in a browser.

**Scoped into this task (s31):** C138 (the Drag: a Start Drag X that is text joins as text; ruled "Read it as a number" — a Drag
spec version, v3 now that C106 took v2) and C139 (the Component Stack keeps its pages through Mounted off and on only when a new
option is ticked; ruled against the lean — a new input needs a name, a description and its spec version).

**Left (5 of 29):** C120 and C126 (ruled; wait on P107's world — history back and replace), C114 (Children Count a frame late after
a remount: read why first), C138 and C139 (ruled).
**The export:** not checked (P18's).

## 11. Session 32 (2026-10-09) — the Drag reads text as a number

**AC1:** C138 re-measured by its scenario on the runtime at `f1ade5ba9` (the runtime joined "50" with the movement, as Drag v2
modelled). Built in worktree `p109-isl049`, landed by compare-and-swap.

| Row | Commit | What changed | Grade |
|---|---|---|---|
| C138 | `40c9fc310` | Start Drag X / Y read text as a number, in an `onChange` (the generated `inputProps` setter overwrites a node's own `set`); a number, NaN included, goes on as it came. Drag spec **v3**; the old scenario renamed, and a twin with a list as Start Drag X added — the only way left to see Constrain to parent with no layout | runtime 23 / 23 at seeds 13 and 20732; interpreter mutants 0 survivors at both (without the twin, `useParentBounds` drop-set survived at 20732); control red on exactly the C138 scenario; viewer Drag tests 88 / 88 |

**What s32 found:** a fix that makes a value well-formed can stop the only scenario that showed a neighbouring port: the no-layout
bounds code is an identity on numbers, so Constrain to parent was graded only through text joining. Sweep the mutants at both seeds
after every fix, not only the one the row names.

**Left (4):** C139 (ruled: a new Component Stack option that keeps its pages through Mounted off and on), C114 (Children Count a frame
late after a remount — read why first), C120 and C126 (wait on P107's world: the browser's history stepping back, an entry replaced).

## 12. Session 33 (2026-10-09) — C118 left RouterNavigate behind

The wide re-grade for ISL-050's C132 found **RouterNavigate v2 red at every seed**: "two names registered: a blank Router is NOT Main on
this side — queued" and "… Router never set (undefined) is queued too". C118 (`d85e4e6d9`, §8) made `RouterHandler.navigate` read a
blank name as Main and moved the Router spec to v4, but RouterNavigate's world lookup (`world.ts` `router.resolve`) still matched the
name as handed. Control: `router-handler.ts` from before `d85e4e6d9` conforms 23 / 23, and the seed-13 generated divergence goes too.

| Commit | What changed | Grade |
|---|---|---|
| `491e8af72` | `router.resolve` reads `routerName(name)` (`name \|\| 'Main'`); RouterNavigate spec **v3**, the two scenarios renamed. Also pinned: the `afterInputs` drop-set of `answered` on a lone Unchanged survived at seed 20735 (v2 the same) — a scenario where a later frame with no press reports nothing | 24 / 24 + 200 / 200 at 13, 20732, 20735; mutants 74 / 74 at all three; control red on exactly the two renamed |

The s32 lesson again, one phase-step wider: **a fix to a shared handler moves every spec that plays it, not only the spec of the node
it was filed on** — C118 re-graded the Router and never RouterNavigate, which reaches the same handler through the world.

### 12.1 C114 — Children Count in the frame the stack mounts

| Commit | What changed | Grade |
|---|---|---|
| `4e2d846d5` | `react-component-node.ts` `updateChildCountAndIndiciesNow` (the queued count runs only when a child changed since); the stack's reset counts its pages beside Stack Depth on success and on every failing exit. Page Stack spec **v16**; three scenarios renamed, one added | 151 / 151 + 200 / 200 at 13 and 20732; mutants 0 survivors at both; control red on exactly the 4 C114 scenarios; Group, Circle, Drag, For Each, Columns, Radio Button Group, Repeat conform at 13; viewer 1,837 / 1,837 |

**Why it waited** (the row said "read why first"): the runtime target's settle is frame → yield → drain inside React's `act`, and
React runs the stack's mount effects as `act` exits — after the drain. The reset then lands outside any update; what it sends at once
(Stack Depth) is in the frame, what it queues (the count) is in the next. In a browser the same: the reset completes in a microtask after
the frame's update. A queued send cannot be pulled forward without sending twice (`OutputProperty.sendValue` does not dedupe), hence
the flag. ERG-001's hand-made stack stubs the new count as it stubs `setPageOutputs`.

**Left (3):** C139 (ruled: a new Component Stack option that keeps its pages through Mounted off and on), C120 and C126 (P107's world).

### 12.2 C139 — Keep Pages When Unmounted (s34)

| Commit | What changed | Grade |
|---|---|---|
| `c22c9aceb` | A new Component Stack input beside Use Routes, **Keep Pages When Unmounted** (`keepPagesWhenUnmounted`, default off). On a mount with it ticked and pages held, `reset` with no outcomes (the handler's mount reset — a Reset press always carries them) returns, so what waited lands on the kept pages. A reset is owed instead when, while off, the Components are written or the Name moves to another key (C113's same-key write owes nothing); with Use Routes, an address that moved since the unmount starts it again. Page Stack spec **v17**, seven scenarios; page model classifies the three new fields; both catalogs | 158 / 158 on the runtime at 13 and 20732; mutants 0 survivors at both (771 / 772, one declared); controls on the seven: mount reset never skipped → red on exactly the 3 that keep, the owed reset ignored → exactly Components and Name, the address ignored → exactly the Back |

**Use Routes with the option on** (the handoff's question): an address moved while the stack was off means a Back or Forward the stack
could not hear. A mounted stack with Use Routes resets on that (C119), so the remount does too and builds the page in the address —
keeping pages that no longer match the URL would show one page and address another. Not asked: only one answer keeps the stack and
the address agreeing.

**Control note:** HEAD's `navigation-stack.tsx` is red on 6 of 7 for want of the input (`no input "keepPagesWhenUnmounted"`) — that
grades nothing, so the controls are behavioural mutants of the fixed file.

**Left (2):** C120 and C126 (P107's world: history back, an entry replaced).

## 13. Session 36 (2026-10-09) — the browser's history: C120 and C126, as ruled

P107 added the world's session history in `b7950a3b9`: `history.replaceState`, and `history.back()` landing at the next yield as a
`popstate`. Both rows were then built as ruled on P107's rulings page, in worktree `p109-isl049`, and landed by compare-and-swap.

| Row | Commit | What changed | Grade |
|---|---|---|---|
| C120 | `08d62276b` | A push records whether it made a history entry. Its Pop's end calls `history.back()` over that entry and counts the Back as the stack's own (`ownBacks`), so its `popstate` resets nothing. A page whose push made no entry has the address replaced. A Replace uses `history.replaceState`. On any `popstate`, a stack whose address names the page and parameters on top does nothing (`_addressShowsTop`, as the Page Router keeps a page it already shows). | below |
| C126 | `08d62276b` | A Reset press or a Components edit builds the Start Page (`pendingResetToStart` beside the frame's tokens), and pushes its URL when the address names another page. The mount and the browser's Back or Forward still read the address. | below |

**Why two guards on `popstate`.** A `popstate` reaches every listener on the page: the Page Router and every other Component Stack.
A parent stack with Use Routes rebuilds on any reset, which would delete the child that popped. A shared "this one is ours" mark
cannot be told apart on the runtime target, where the world hands each listener its own event object. And a microtask clear would
fail in a browser, where microtasks run between listeners. So each stack counts its own Backs, and every stack also keeps a page
whose address it already shows.

**Page Stack spec v18.** 13 scenarios renamed to what they now do. 5 URL read-backs (C121, C122 ×2 and its control, C123) moved
from a Reset to the person's Back and Forward: under C126 a Reset no longer reads the address, so they would have stopped grading
their rows. 2 scenarios (C123's label start page, the `''` path) moved their URL write from the Pop to the Reset's address write.
4 added: a Pop over a page pushed with Use Routes off (replace), the stack's own Back with the address changed before it lands
(ownBacks), a Back to the address already on top (nothing resets), and a Reset at the start page's own address (nothing written).

**Grades.** Runtime at seeds 13, 20732, 20735 and 7: 162/162 scenarios, 200/200 sequences, 0 divergences. Mutants 846/847 (868/869 at
20735), 0 survivors, the one left the known equivalent (a placing on a node placed off the page). Interpreter mutants at 13 and
20732: 846/847, 0 survivors, 0 unreached. **Control** (HEAD's runtime file against v18): red on exactly 16 scenarios, the 13 the
rulings move and 3 of the 4 added (the fourth, nothing written, is graded by the mutants). The 5 read-backs pass under HEAD, as
they should. Router, RouterNavigate, PageStackNavigate, PageStackNavigateBack and PageStackNavigateToPath conform on the runtime at 13.
Viewer 1,837/1,837; spec package tsc 0, viewer tsc 0. Re-run after the rebase onto `68b4a766b`: Page Stack at 13 the same.

**Found and fixed beside it.** The page model's pinned `WORLD_KINDS` (`tests/page-model.helper.ts`) had no `popstate`. It was red on
`cline-dev` from `b7950a3b9`, before this change. Sorted in, since this spec is the kind's first caller, and the two new state
fields were classified as the node's own. Page model 42/42.

**Consequence recorded, not asked.** A person's Back or Forward to an entry whose address names the page on top now keeps the
stack rather than rebuilding it. A browser reaches that only through two entries with one address, which the stack no longer writes
(C126 writes only when the address moves). **Edge recorded, not built:** a Back of the stack's own that lands on the first entry
fires nothing, so its count waits for the next `popstate`. The world can make this (a traverse to the current address alone resets
its history); a browser cannot from the stack's own pushes.

**ISL-048: 29 of 29.** ✅
