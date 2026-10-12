# ISL-004 — A component keeps its own state, and a page you come back to still has it

**Status: ✅ CLOSED s18 (2026-10-05) — every AC met: AC1/AC2/AC6 (s17, Keep When Leaving), AC3 (the doctrine says how long a Component Object lasts, measured in a browser), AC4 (the census: no live defect), AC5 (F05 recorded as a spec under "No, it's app logic"). Filed P109-S18-REFRESHROWSTATE.** **Earlier status: 🟡 s18 (2026-10-05): rulings 2 ("Component Object") and 3 ("No, it's app logic") ruled; Component Object's lifetime measured in a browser (kept when hidden and shown or when its row id stays; lost on a For Each Refresh, a row leaving and returning, a page left); AC3 built (the doctrine says it, spec + sabotage). Owed: AC4 (the census), AC5 (F05 as a spec, a record). Filed P109-S18-REFRESHROWSTATE.** **Earlier status: 🟡 s17 (2026-10-05): ruling 1 ruled "Yes, if ticked" and built — AC1 and AC2 met in a browser (§8 s17); owed: rulings 2 and 3 (AC3, AC5), the census (AC4). AC6 (the workaround read) written s17. Scoped 2026-10-01 at `27d891bf3`.** **Source:** [audit](AUDIT-2026-10-01.md) F04, with F05 as
evidence · P108 [IW-002](../phase-108-the-island-works/IW-002-THE-JOB-MODEL.md) AC3 (lane M, s3, lines 322-329) ·
P106 [IG-004](../phase-106-the-island-grows/IG-004-THE-ISLAND-AS-A-WORLD.md) §6 line 77 and §7.6 item 13 (lines
328-332) · P108 [IW-006](../phase-108-the-island-works/IW-006-SHELLS-AND-THE-SHOP.md) deviation 2 (lines 219-221) ·
**Side:** product (runtime: component instances, Variables, routers; doctrine). **Ruling-heavy: nothing is built
before §5's rulings are recorded.**

Olive's Island keeps its whole world in app-wide Variables named `garden…`. That works only because one Workshop is
ever on screen. When the child left the Island page and came back, the page rebuilt every plot from its seed, so the
tulips were back at 0/3. The template then threaded the world through a "quiet" input, a build hash and a save code to
get it back.

## 1. The person sentence

**Someone builds a component that remembers something, places it twice, leaves the page and comes back. Each copy
still remembers its own, and nothing they wrote had to carry it there by hand.**

## 2. What was measured

| reading | where |
|---|---|
| A Variable is one value for the whole app, and the node says so: *"Which app-wide variable this node reads and writes"*. *Re-read at HEAD* | `packages/noodl-runtime/src/nodes/std-library/data/variablenode2.ts:171-172`, `:108-109` |
| ⚠️ **"No component-local state" (F04) does not hold as written.** A per-instance store exists. Component Object is keyed `componentState` + the instance id, and its reference page says *"each instance of the component gets its own backing object"*. GAM-005 put it into the doctrine. *Re-read at HEAD* | `packages/noodl-runtime/src/nodes/std-library/componentutils/componentobject.ts:76-86`; `docs-site/docs/nodes/component-utilities/net-noodl-component-object.md:4-10` |
| 🔴 **What does hold: per-instance state does not survive the page being left.** The instance id is a process counter (`'__$ndl_componentInstaceId' + componentIdCounter`, then `++`), so a new instance gets a new id and a new, empty Component Object. *Re-read at HEAD* | `packages/noodl-runtime/src/nodes/componentinstance.ts:10`, `:82-92` |
| The Router deletes the page it leaves and creates the page it goes to, every time. Page Stack does the same. There is no keep-alive option on either. *Re-read at HEAD* | `packages/noodl-viewer-react/src/nodes/navigation/router.tsx:545-549`, `:906-913`; `navigation-stack.tsx:510`, `:550`, `:848`, `:860`; a grep for `keepalive\|keep alive\|keepMounted` over `nodes/navigation/` finds none |
| So the only state that survives leaving a page is app-wide: a Variable, or a Global Store, which can also persist to `localStorage` under `noodl_store_<key>`. *Re-read at HEAD* | `packages/noodl-runtime/src/nodes/std-library/agent/globalstore.ts:59`, `:116`, `:407` |
| The template's rule 4 names the cost: *"A `Variable` is global by NAME (D57): every Variable here is named `garden…`, and only one Workshop is ever on screen."* There are 22 distinct `garden*` Variable names in the built template. *Re-read at HEAD* | `packages/noodl-mcp/tests/cg003Components.ts:24`; `grep -rho '"name": *"garden[A-Za-z0-9]*"' templates/bot-garden/components \| sort -u` → 22 |
| IW-002 AC3, seen on a deploy: the Island page opened again rebuilt every plot from its seed (*"the plots came back at age 1, the tulip 0/3, the basket 0/4"*). *As recorded 2026-09-30 (lane M), not re-driven* | `phase-108…/IW-002-THE-JOB-MODEL.md:322-329` |
| The fix there: the held island (`gardenIsland`) wired back into `Logic/Island world` as a **quiet** input, `kept`. Quiet means the product's per-input run-on-change is unticked, and on the same build the world goes on from it. *Re-read at HEAD* | `cg003Components.ts:352-358` (`QUIET`), `:430` + `:439` (`signalOnly`), `:1766-1767`; `packages/noodl-mcp/tests/ig004Island.ts:421-426` |
| **F05.** A tick's `Set Variable` landed after a rebuild's and put the old world back, so a robot brought home walked back to its plot. The fix: the world carries a hash of what it was built from, and the tick drops a state from another build. *As recorded (IG-004 §7.6 item 13), not re-driven; the hash re-read at HEAD* | `phase-106…/IG-004…md:328-332`; `ig004Island.ts:417-419` |
| Then the hash itself had to leave each plot's `live` out, because a helper used from the shop writes a plot's `live`, and at the base that rebuilt the island. *As recorded (IW-006 deviation 2), not re-driven* | `phase-108…/IW-006…md:219-221` |
| GAM-005's warning (`variable-in-repeated-component`, R6) fires only for a component **placed more than once**. The Workshop is placed once, so the warning never sees the island's case. *Re-read at HEAD (rule as written)* | `phase-88…/GAM-005…md` §5 and §8 |

## 3. Where it bites a person

- **Anything a page should still hold when you come back:** a game in progress, a half-filled form, a scroll of
  choices, a selected tab, a timer's progress. Today the author must lift it into app-wide state by hand and feed it
  back in without making the page rebuild itself. That is the island's `kept` input, and nothing teaches it.
- **Two copies of anything that remembers, if the author used a Variable:** the GAM-005 case. It is warned now, but only
  when both copies are placed in the project at once.
- **Two writers of one Variable (F05).** A clock and a rebuild both write the world, and the last to land wins, even
  when it is the older one. Nothing orders or versions them, so a person sees a robot walk back to where it was.

## 4. Related work and collisions

- **[GAM-005](../phase-88-the-defects-the-games-found/GAM-005-TWO-COPIES-OF-A-COMPONENT-KEEP-THEIR-OWN-STATE.md) / D57,
  ruled R6:** warning only, and *"Do not make Variables per-instance"* (§5). Ruling 2 below must say whether that still
  stands. GAM-005 **AC5 is still owed**: a browser drive of two banners built the doctrine's way, beside the Variable
  version. AC1(ii) below is the same drive. Do it once and record it in both files.
- **[GAM-009](../phase-88-the-defects-the-games-found/GAM-009-WHAT-SOMEONE-TYPED-IS-STILL-THERE-WHEN-THE-FIELD-COMES-BACK.md)**
  / D61 (🟢) made a remounted text field keep what was typed. It is the precedent for "a remount keeps a value", at the
  scale of one field.
- **[GAM-013](../phase-88-the-defects-the-games-found/GAM-013-SOMETHING-CAN-HAPPEN-EVERY-SECOND-WITHOUT-A-SCRIPT.md)
  R1:** a `Repeat` stops when its page is navigated away from. A kept-alive page (ruling 1(b)) has to decide whether
  that is still "navigated away from". Raise it with ruling 1, not after.
- **P107 NSP-012** specs Variable and Set Variable as app-wide (34 of 147). A scope option (ruling 2(a)) changes their
  spec and the export.
- **F07 / D71** (a Function's outputs publish only on change, wiring `run` does not make it signal-only) is the trap the
  `kept` pattern steps around. It is already ruled, and is not reopened here.
- **[ISL-003](ISL-003-TWO-LISTS-WITH-THE-SAME-ROW-IDS-KEEP-THEIR-OWN-ROWS.md)** is the same "app-wide by name" shape
  for row ids. Rule them together, so one sentence in the doctrine covers both.
- Owner grep: `grep -rln -i "component-local\|component-scoped state\|per-instance state\|component scope"
  dev-docs/tasks --include='*.md'` hits editor `useState` (AIB-003) and the cloud request scope (SBR-007, CWF-008),
  not an owner. `grep -rln -i "keep.alive\|keepalive\|survives navigation\|page.*remount" dev-docs/tasks` hits editor
  and backend tasks, and D61. No task owns page state across navigation.

## 5. Design — 🔒 rulings first (ask each in plain words, one per question)

🔒 **Ruling 1: when someone leaves a page and comes back, should it be as they left it?**
- (a) **No, as today.** A page is built fresh each time. What must survive goes into app-wide state, and the doctrine
  teaches the "kept" pattern (a quiet input) by name.
- (b) **Yes, if the author ticks it.** A "Keep this page when leaving" option on the page or the Router hides the page
  instead of deleting it, so every node in it, Component Objects included, is simply still there.
- (c) **Yes, by identity.** A placement gets an id that is the same each time it is built (page, placement, row), and its
  Component Object is restored from it.

**Recommendation: (b), opt-in, default unchanged.** It is the smallest change that matches what a person expects of a
tab-like page, and it removes the island's `kept` input, its build hash and F05's race in one go (nothing is rebuilt).
(c) is the most general, but it is a new identity scheme the export would have to copy. (a) leaves every author to
rediscover the pattern.

🔒 **Ruling 2: what is "a component's own state" for someone who would reach for a Variable?**
- (a) A **Scope** option on Variable and Set Variable ("this component" / "the whole app", default the whole app).
  It is the node people already reach for. It reverses GAM-005's "do not make Variables per-instance" for the new
  option only.
- (b) **No new option.** Component Object is the answer. Make it the one the doctrine, the picker and the examples
  show first, and measure why the template did not use it.
- (c) A new "Component State" node.

**Recommendation: (b) first**, because it exists, is per-instance and is documented. Then (a) only if AC4 shows authors
and agents still reach for Variables after the doctrine says otherwise.

🔒 **Ruling 3 (F05): should the product stop an older write landing over a newer one?** (a) No. It is app logic, and
the build-hash pattern is taught as an idiom. (b) Set Variable gains an "only if it is still …" input that refuses a
stale write and says so (`Unchanged`). **Recommendation: (a) for now.** Ruling 1(b) removes the island's case, so
revisit only if a second app meets it.

Design constraints (after the rulings):
- Under 1(b), a kept page's clocks follow one written rule: GAM-013 R1's "stops when navigated away" either still applies
  (the page is paused) or is restated, and the Repeat node's note says which.
- Under 1(b), a kept page is not rendered while hidden, and its memory cost is named in the option's description.
- No change to the default behaviour of any existing project.

## 6. Acceptance criteria (apply once the rulings are recorded in §8)

| AC | Clause |
|---|---|
| AC1 | **RED at HEAD, recorded in §8, before any change.** In a browser, a minimal project built through the door: a `Tally` component with a Component Object count and a + button, placed twice on Page A, and a Router to Page B and back. (i) Tap copy 1 three times and copy 2 once, then go to B and back. Both read **0**, which is RED for the person sentence. **Known-firing beside it:** an app-wide Variable counter on the same page reads its value after the round trip. (ii) Before leaving, the copies read 3 and 1, which is GREEN at HEAD and is GAM-005 AC5's reading. **Control:** a Variable-based Tally placed twice reads 4 and 4. |
| AC2 | **Ruling 1 built.** AC1(i) reads 3 and 1 after three round trips. **Sabotage arm:** switch the option off and it reads 0 and 0. Under 1(b), a `Repeat` on the kept page behaves as the restated rule says, graded by a count across the round trips. |
| AC3 | **Ruling 2 built.** (b): the doctrine an agent receives (a live `get_project_info`) names Component Object as a component's own state, with an example in `catalog:examples`, and the CMP-001 gate stays green. (a): a scoped Variable placed twice keeps two values, and an app-scoped one keeps one. Each has a sabotage arm. |
| AC4 | **Census before landing.** Over the templates, prefabs and the P86 corpus, list every Variable read **only** inside one component (a candidate for component state), and every page that feeds app-wide state back into itself to survive a reopen (the `kept` shape). Olive's Island's `gardenIsland` → `kept` is the known-firing row. |
| AC5 | **F05, recorded.** A spec reproduces a Timer's `Set Variable` landing after a rebuild's write and restoring the older value. It is RED as a person sentence ("the newer state stays") and stays as a record under ruling 3(a), or goes green under 3(b). |
| AC6 | **Workaround read.** Say which of the island's workarounds the rulings make unnecessary: the `kept` quiet input, the build hash, `live` left out of the hash, and the 22 `garden*` names. Change none of them here. Write the sentence into README §6 for P108. |

## 7. Traps

- 🔴 **One copy on screen grades nothing** (GAM-005's trap). AC1 needs two placements and a round trip.
- 🔴 **A drive that reloads the page grades the wrong thing.** A reload resets everything, Variables included. A round
  trip must go through the app's own Router.
- **A Component Object read inside one visit looks perfect.** The loss is only on the way back. Read after the return.
- **The template's workarounds hide it from every garden drive.** The island's AC3 is green **because of** `kept`.
- **"Keep the page" and "keep the clock" are two decisions.** A kept page whose Timer ticks unseen can make F05 worse,
  not better. Measure the island's tick across a round trip under 1(b) before claiming F05 is gone.
- Do not let ruling 2(a) slip in as "just an option". It reverses a recorded ruling (GAM-005 §5), so ask it.

## 8. Session log

None yet.

### Session 17 (2026-10-05) — ruling 1 asked and ruled: "Yes, if ticked"

Re-measured at `8a89300b3` (read-only agent; 242 commits after scoping) before asking:
- **Why a page forgets:** the Router deletes the old page and builds the new one on every navigation (`router.tsx:545-552`
  reset, `:906-916` `_buildPage`); each new component instance takes a new counter id (`componentinstance.ts:10, :84, :92`),
  and Component Object's storage is keyed by that id (`componentobject.ts:83-85`).
- **The island's workaround is 5 pieces, not 3:** the `kept` quiet input (`cg003Components.ts:368-371`, wired `:1855`), the
  build hash (`ig004Island.ts:450`), live jobs left out of it (`iw6Unlive`), a land key (`:452-453`), the land-lift patch
  (`:461`, `c25fb8ee5`). No other of the 13 templates uses the pattern. `garden*` Variables: 24 (22 at scoping).
- 🔴 **"Page Stack does the same" is half true:** replace (`navigation-stack.tsx:848`) and reset (`:510`) delete, but a push
  only detaches the page beneath (`:1020`) and back re-attaches the same page (`:1056`) — a keep-alive path already exists,
  and a Repeat on the hidden page keeps ticking (`repeat.ts:79-82` stops only on delete): the F05 clock hazard, live today.
- **A template that wants forgetting:** `digital-bricks-training` `Pages/Course` clears `dbtDossierOpen` because "the Variable
  outlives the page"; its `Logic/Feed filter`: "Which rows are open is page state, NEVER saved". Supports opt-in.
- 13 of 13 templates have exactly 1 Router and 0 Page Stacks; 69 page components. Component Object: 0 templates, 10 of 48
  library prefabs (option (c)'s reach).

**Ruled (README §8 round 5, verbatim there): "Yes, if ticked"** — ruling 1 (b): an opt-in "Keep this page when leaving", off by
default. Rulings 2 and 3 not asked. 🔴 The build owes the clock rule: a Repeat (and any timer) on a kept page stops while the
page is hidden and resumes on return — and the same rule fixes Page Stack's push today.

**Built s17, in source (the browser half owed):**
- **Page** gains `keepWhenLeaving` ("Keep When Leaving", General, boolean, default off; its description names the
  memory cost and the clock rule) — `page.ts`.
- **Router** (`router.tsx`): both builders (`resetAsync`, `_buildPage`) now `_leaveCurrentPage()` — a page whose Page
  node asks to be kept is detached and held, one copy per page component, instead of deleted — and `_takeKeptPage(key,
  params)` reattaches the SAME group on the next visit with equal parameters (other parameters: the kept copy is deleted
  and the page built fresh). Hidden and shown, every node of the page (`getAllNodesRecursive`) with `_onPageHidden` /
  `_onPageShown` is told. The Router deletes what it kept when it is deleted (a delete listener: detached groups are
  out of reach of its own deletion). 🔴 Met building: viewer-react compiles to **ES5 without downlevel iteration**, so
  a `for…of` over a Map's `.values()` ran ZERO times — the delete-listener row was red for that; `Map.forEach` now.
- **Repeat** pauses its beat (`pausedLeft` = when the next tick was due) and resumes it on show; a Stop while hidden is
  not undone by the show. **Delay** pauses its countdown, resumes with what was left, no second Started, one Finished,
  its own Duration and Start Delay restored after.
- 🔴 **Page Stack unchanged on purpose:** a push still leaves the page underneath ticking (read from code,
  `navigation-stack.tsx:1020` + `repeat.ts`, not run). Pausing it there would change existing projects, which the
  ruling's option did not ask for; not filed as a ledger bug until measured.
- Spec `noodl-viewer-react/tests/isl-004-keep-page.test.ts` **7/7** (kept page comes back, nothing deleted or rebuilt,
  the clock told both times; control: no option → deleted and rebuilt; other parameters → fresh; the Router's deletion
  reaches what it kept; Repeat paused 300 ms before a tick is due 300 ms after showing; a stopped Repeat stays stopped;
  Delay carries on). **Reverted arm:** the keep branch off → the first row red (restored by `cp`, `cmp` clean).
  viewer-react `tsc --noEmit` 0.
- **Fixture + drive written, not yet run:** `isl004-keep-page/` (built through the door by
  `noodl-mcp/tests/isl004KeepPage.ts`, 0 errors/warnings — two Tallies with a Component Object count, an app Variable
  counter as the known-firing control, a Repeat at 200 ms started on Page A's `didMount`, a Router to B and back) and
  `scripts/devtools/drive-isl004-keep-page.js` (three round trips). Owed: AC1 RED on the shared (HEAD) bundle, then the
  same with `keep` on a bundle built in a worktree (AC2, and the sabotage arm = the option off).

**Driven s17 (later the same day), `scripts/devtools/drive-isl004-keep-page.js`, 390 px, three round trips A → B → A
through the app's own Router, 1.66 s on B each time** (each deploy by `nodegx deploy`, exit 0):

| site | before leaving | after trips 1, 2, 3 | Repeat ticks leaving → back | app counter |
|---|---|---|---|---|
| keep ticked, the runtime BEFORE ISL-004 (AC1 red) | 3 · 1 | 0 · 0, 0 · 0, 0 · 0 | 22 → 0, 0 → 0, 0 → 0 (rebuilt) | 2, 2, 2 |
| keep ticked, ISL-004 (AC2) | 3 · 1 | **3 · 1** each time | 22 → 23, 23 → 24, 24 → 25 | 2, 2, 2 |
| keep off (AC2 sabotage arm) | 3 · 1 | 0 · 0 each time | 22 → 0 (rebuilt) | 2, 2, 2 |

- **AC1 met, read after the change:** the "before" runtime is the deploy bundle of the 13:31 island deploy (ISL-008 in,
  ISL-004 not: `keepWhenLeaving` 0 hits), copied over the keep-ticked site's `noodl.deploy.js`. 🔴 The shared
  `src/external` viewer, deploy and ssr bundles were rebuilt at 15:47 by a dev stack's watcher and carry this
  UNCOMMITTED source, so they could not be the HEAD reading. The app-wide Variable counter is the known-firing control
  (2 after every trip). **Not built:** AC1's second control (a Variable-based Tally placed twice reading 4 and 4).
- **AC2 met:** 3 and 1 after three round trips; the option off reads 0 and 0. **The clock rule, counted:** a 200 ms Repeat
  gains ONE tick per round trip (the time on A between the return and the next tap) where 1.66 s away would be about 8;
  with the option off it restarts at 0. No console errors on any site.
- **The fixture needed one fix:** the door registers pages in write order and names the first one written the start page
  while none is set, and says so in its reply (`registeredPages.startPage`), which the generator ignored, so the app opened
  on B. `isl004KeepPage.ts` now sets the Router's `pages` to start on A. Not a defect (designed, and reported).
- **Gates:** the spec 7/7, run in the worktree `p109-s17-isl004` (same four sources, `cmp` clean). In this checkout it
  cannot run since ISL-005's `noodl-runtime/src/scriptfiles.ts` (TS2802 under viewer-react's ES5 ts-jest; fixed on the
  ISL-005 branch `b63d5bfec`, landing with Richard). CHR-007 23/23 (the Page row's snapshot line);
  `catalog:check`, `catalog:merge:check`, `docs:nodes:check` exit 0 with the Page port in `node-catalog.json`,
  `node-catalog-enriched.json` and `docs-site/docs/nodes/visual/page.md`.
- **AC6, the workaround read** (from the source, no change made): with *Keep When Leaving* ticked on the Island page, the
  `kept` quiet input is no longer needed for a return through the Router; the build hash, `iw6Unlive`, the land key and
  the land-lift stay (they answer "did her save change while she was away", which a kept page still asks); the 24
  `garden*` Variables are ruling 2's, not ruling 1's. The kept page's Repeat pausing while hidden matches the island today
  (`kept.tick` resumes the count). The sentence is in README §6 for P108 (IW-010).

### Session 18 (2026-10-05) — rulings 2 and 3 asked and ruled; Component Object's lifetime measured

**Measured before asking:** the doctrine an agent receives already names Component Object as a component's own state
(`interfaces.ts`, GAM-005's paragraph: *"a `States` node, a `Component Object` (every instance has its own), or a `Counter`
or `Switch`"*); one catalog example uses it (`comp-wizard-component-object.json`, of 109); 10 of 48 prefabs; 0 of 13
templates.

**Ruled (README §8 round 6, verbatim there):** ruling 2 **"Component Object"**, with Richard's own words: *"from memory I'm
not sure it stores the value when unmounted and mounted again, so worth investigating"* (and the Parent Component Object's
new ancestor pick makes it much better). Ruling 3 **"No, it's app logic"**: AC5 stays a record.

**The investigation, driven** — [`isl004Remount.ts`](../../../packages/noodl-mcp/tests/isl004Remount.ts) builds the page
through the door (0 errors, 0 warnings; the door refused my first wire to a Function's `items` and named `out-items`), `nodegx
deploy` exit 0 (shared deploy bundle 20:10, ISL-004's keep committed), [`drive-isl004-remount.js`](../../../scripts/devtools/drive-isl004-remount.js)
at 390 px, every press a CDP mouse event after `elementFromPoint`. "same" = the DOM element marked before the step is the one
on screen after it.

| step | the hideable Tally | For Each row 1 | row 2 | app Variable (control) |
|---|---|---|---|---|
| before (3 taps, 2, 1, 2) | 3 | 2 | 1 | 2 |
| Hide, Show (`mounted` off then on; the wrapper absent while hidden) | **3, a new element** | 2 same | 1 same | 2 |
| Rewrite: a fresh array of the same two ids | 3 same | **2 same** | **1 same** | 2 |
| Refresh | 3 | **0, new** | **0, new** | 2 |
| (row 1 tapped once more) | 3 | 1 | 0 | 2 |
| Filter (row 1 out), then Rewrite (row 1 back) | 3 | **0, new** | 0 same | 2 |
| Round trip A → B → A (Keep When Leaving off) | **0, new** | 0, new | 0, new | 2 |

- **What a Component Object survives:** its component hidden and shown (the DOM goes and comes back; the component instance,
  and so its record `componentState<instance id>`, stays), and a For Each items write that keeps the row's id (rows are
  diffed by id). **What loses it:** anything that deletes the component instance and builds a new one — a For Each Refresh
  (a full teardown, `foreach.tsx`, deliberate per NDA-013's comment), a row that leaves the list and comes back, a page left
  and returned to (s17: unless the page ticks Keep When Leaving). No console errors.
- Richard's memory was half right. Filed **`P109-S18-REFRESHROWSTATE`** (needs-ruling, low): Refresh empties the state of
  rows whose records did not change. The filtered row is not filed: a removed row starting empty is what every UI framework
  does.
- **Not measured, so not written into the doctrine:** where state that must outlive a rebuilt row should live. A Parent
  Component Object is ONE record for the parent, so rows would share it; per-row state outliving a Refresh would need the row's
  own record (by id), not drafted.

**AC3 built ((b)):** the interface doctrine's paragraph now says how long a copy's state lasts — hidden and shown keeps it, a
row whose id stays keeps it, a Refresh, a row leaving and returning and a page left each build a new copy that starts empty,
and Keep When Leaving keeps the page. Graded on the text a real server SENDS (`get_project_info.interfaceDoctrine`) by a new
row in `cmp001InterfaceDoctrine.test.ts`. The catalog example exists (`comp-wizard-component-object.json`).

**AC4, the census (s18)** — [`isl004-census.py`](isl004-census.py), both project formats (v2 `nodes.json`, legacy
`project.json` graph roots) over the 13 templates, library prefabs, modules and examples, and the catalog examples (where
COM-003 landed P86's corpus: its own `corpus/` is markdown). A name is used in a component when a `Variable2` / `Set Variable`
names it there, or any script or expression there mentions `Variables.<name>`:
- **17 projects use 214 app-wide Variable names; 178 are used inside ONE component only** — each a candidate for that
  component's own state. Most in nightbook (43), rocket-school (37), bot-garden (18), planning (16) and its demo (15).
- **10 of the 178 sit in a component placed twice or more:** 9 in rocket-school (`Game/Focus picker` on Monster/Setup and
  Race/Setup; `Profiles/New player form` in Game/Header and Pages/Profiles), each Variable node commented *"shared on purpose"*
  (GAM-005's escape); 1 in todo-list (`todoLastHistory`, a scratch value in `Logic/Write history`, a stateless write helper
  placed in five commands). **No live defect.** 🔴 My first run read 70: one placement counted twice (a v2 name already starts
  with `/`, and both lookups hit it), caught by reading the rows, fixed before recording.
- **The `kept` shape** (a page feeding app state back into itself to survive a reopen): bot-garden's Island page only, as s17
  measured (no other template has the quiet input).

**AC5, F05 recorded (s18)** — [`isl-004-a-stale-writer-lands-last.test.ts`](../../../packages/noodl-runtime/test/isl-004-a-stale-writer-lands-last.test.ts),
the runtime's graph harness, one Variable, the steps tick, tick, rebuild (Set Variable 100), tick: **3/3**.

| the tick | Variable after each step | |
|---|---|---|
| holds its own copy (Component Object), as the island's did | 1, 2, 100, **3** | 🔴 the record: the older state put back, where a person expects 101 |
| reads the Variable each run (control) | 1, 2, 100, **101** | the harness sees a fresh write |
| the taught idiom: the rebuild stamps a build, a copy from another build is dropped | 1, 2, 100, **101** | |

Under ruling 3 ("No, it's app logic") the record row stays green while the runtime leaves competing writers unordered, and
goes red if it ever starts refusing a stale write. 🔴 First run read `[1,1,100,100]` in every arm: I had wired the tick's number
into Set Variable's `do`, which fires only when its input turns truthy (1 → 2 is not a change to true); `success → do` now.

**ISL-004 closed:** AC1, AC2 (s17), AC3, AC4, AC5 (s18), AC6 (s17).
