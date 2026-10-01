# ISL-004 — A component keeps its own state, and a page you come back to still has it

**Status: ⬜ not started — scoped 2026-10-01 at `27d891bf3`.** **Source:** [audit](AUDIT-2026-10-01.md) F04, with F05 as
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
