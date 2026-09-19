# TVW-007 — An instance says what it is

Proposal §4.4 (third and fourth bullets), mock callouts 6 and 7. Builds on FIX-018's look.

## 1. The person sentence

**Someone looking at the `Hero` node on Home's canvas reads that it is an instance of Sections/Hero
used once, sees a door to edit it, and after going through that door the trail reads `Home › Hero`
with Home drawn as the instance they came through — and clicking Home takes them back.**

## 2. The spec

| element | detail |
|---|---|
| **the eyebrow** | ✅ **REWRITTEN TO R-Z, s20.** The count alone — `· 3×` — in 10px mono, the number in the component hue, painted by `NodeGraphEditorNodePainter.ts` in the same pass as FIX-018's chip. `INSTANCE` and the path are gone. The count is TVW-001's, from the same walk (`instanceCounts.ts` → `buildUsageIndex`). Hidden below 75% zoom — read off `getPanAndScale().scale`, **never** `ctx.getTransform().a`, which is `ratio × scale` and so opens the gate at a different zoom on a retina screen |
| **where the count sits** | 🔴 **NOT SETTLED BY R-Z — with Richard as four photographs (s20, `verdicts/TVW-007/2026-09-19`).** R-Z settled the text; the *row* is a separate cost, because `titlebarHeight()` fixes every connection-anchor position on the card (UIX-005). See §8 |
| **the path** | on hover, and 🔴 **load-bearing** — with no name on the card it is the only place the component's identity lives. Not built at s20 |
| **the door** | `Edit ›` at the node's top-right on hover, `primary` on `primary-bg`. It is `NodeContextMenu.ts:243-262`'s *Open component* given a visible control; double-click keeps working. Also on logic instances (a `Format price` node) |
| **the trail** | today: `OverlayViews.updateTitle()` splits `fullName` on `/` (`OverlayViews.ts:483-503`). After: when the current component was entered *through an instance* (`switchToComponent` called from `SelectionActions.ts:167-169`, the `Edit ›` door, a Layers `›`, or TVW-001's *Used in*), the trail's first crumb is the **parent component**, drawn as the instance chip (diamond + component-hue wash), live, followed by `›` and the current component. Entered from the panel or search, the trail reads as today (folder path, folder crumbs inert). `NavigationHistory` (`NavigationHistory.ts:47-56`) records the entry route alongside the name so ⌘[ / ⌘] rebuild the right trail |
| **more than one parent** | the parent crumb is the one you came through. `in 3 places ▾` on hover lists the others (TVW-001's popover) |
| **cloud / workflow crumbs** | the synthetic two-crumb trail (`OverlayViews.ts:414-445`) and the cloud-function descent (`:466-480`) are unchanged; WFA-006 already made a workflow step behave as an instance |
| **always visible** | LGC-008's ruling holds: the trail is never hidden, including in the Visual Function pane |

## 3. Scope

In: the eyebrow, the door, the trail's containment form, history, both themes, the zoom rule.

Out: the panel's containment crumb (TVW-004). Any change to what the trail's `+` does. The lane.

## 4. Acceptance criteria

1. **(person)** Home's canvas. The `Hero` node shows `· 1×` (R-Z), and hovering it shows `Sections/Hero`. Hover it:
   `Edit ›`. Press it: the canvas is Hero; the trail reads `[◆ Home] › Hero`. Press `Home` in the
   trail: back on Home with the Hero node selected. Now open Hero from the Components panel: the trail
   reads `Sections › Hero`. ⌘[ twice, ⌘] twice: each trail is the one that was shown at that step.
2. The eyebrow's count equals TVW-001's for the same component — **one call, not one rule applied
   twice**: both read `usage.instances.length` from `buildUsageIndex`. ⚠️ Stated as the *instances*, not
   as "the row meta", because `rowMetaFor` gives a routed page its **route** instead of a count, so
   a page that was also placed would show `/about` on its row and `· 2×` on its card. Measured
   across 128 projects at s20: **0 instance nodes point at a routed page, 0 at the home component**
   — the population where they can disagree is empty.
2b. **(the hover, R-Z)** Hovering an instance node shows its full path, on visual **and** logic
   instances, at every zoom where the count is drawn — graded on the rendered surface a person
   sees, not on the handler firing. ⚠️ `Edit ›` is already specified on the same gesture at the
   node's top-right, which is also the existing 20×20px connection-drag zone (`NodeGraphEditorNode.ts:261`)
   — the canvas has **no** click dispatch for sub-regions today, so whoever builds it builds that too.
3. A spec on `NavigationHistory`: entries carry `{name, via: parentName | null}`; `goBack` from an
   instance-entered component rebuilds the containment trail; `discardInvalidEntries` drops entries
   whose `via` component is deleted.
4. The trail's crumb kinds are asserted on the rendered DOM: an instance crumb has the diamond; a
   folder crumb has no button.
5. Screenshots: both trail forms, the node with and without hover, both themes. **Richard rules
   WORTHY.**
6. `test:ci` at the floor; `leg-005`/LGC-008's trail-visibility pins green.

## 5. Landmines

- PAR-003 ruled the trail a breadcrumb, not tabs, and the mock's tab treatment was applied to the
  existing mechanism. This task changes crumb *meaning*, not the mechanism; do not reintroduce tabs.
- `Router.route()` is a silent no-op editor→editor (`CanvasTabs/tabNavigation.ts:11-15`); every
  navigation goes through `switchToComponent`.
- The painter's text measurement is per frame; cache the eyebrow's measured width per node like the
  name.

## 6. Scoping census — §2's eyebrow does not fit, in any form

**Measured 2026-09-19 (s18) before anything was built**, over 128 projects / 5,558 components.
Script: `scripts/devtools/tvw007-instance-census.js`. ⚠️ Text width is ESTIMATED at 6.0px/char for
`CanvasFonts.portLabel` (10.5px mono); a string this estimate calls 3× too wide **is** too wide, and
the near-fits would need the editor's real `measureText`. There are no near-fits.

| what | number |
|---|---|
| instance nodes in the corpus | **8,833**, in 2,570 components |
| distinct placed components (each would get an eyebrow) | 2,385 |
| available width on a 150px node (less insets and FIX-018's chip) | **114px** |
| §2's `INSTANCE · <path> · used N×` — **fits** | **0** |
| — overflows | **2,385 (100%)**, p50 **396px**, p90 516px, max 846px |
| the same sentence with the path reduced to its last segment — fits | **0** |

🔴 **R-Z needed — the eyebrow's fixed chrome alone is wider than the node.** `INSTANCE · ` plus
` · used 1×` is 21 characters ≈ 126px before a single character of the component's name. So this is
not "long paths overflow"; **no component name can fit**, and shortening the path does not help.
§2's format has to change, not be truncated. The options, in ascending order of how much they give
up:

1. **Drop the word `INSTANCE`.** FIX-018's chip and diamond already say it — the eyebrow would read
   `Sections/Hero · 3×`. Still over at p50, but the leaf-name form (`Hero · 3×`) fits.
2. **Two lines** — the path on one, `used 3×` on the next. Costs 12px of node height on 8,833 nodes.
3. **The count only** (`· 3×`) on the node, with the path on hover. Cheapest, says least.

🔴 **A placed component usually has MORE THAN ONE parent.** 424 have two and **632 have three or
more** — 1,056 of 2,385 (44%). §2 treats `in 3 places ▾` as the exceptional case and "the parent
crumb is the one you came through" as the ordinary one; it is the other way round for nearly half
of them.

⚠️ **This corrects a number carried since s8.** TVW-004's notes record that *"5 of the 6 corpus
components with 2+ instances have them all in ONE parent"* — true, and about **six components in
one project**. Across 128 projects the ratio inverts. Neither measurement is wrong; the first one's
population was never the corpus ([[a-budget-measured-on-a-fixture-is-a-budget-on-the-fixture]]).

## 7. R-Z — RULED 2026-09-19 (s19): the count only, the path on hover

Richard chose **option 3**. The eyebrow on the node is **the count alone** — `· 3×` — and the
component's path appears **on hover**.

**What this changes in §2.** The eyebrow row reads `· N×` in 10px mono, `N×` in the component hue,
painted in the same pass as FIX-018's chip. `INSTANCE` is gone (the chip and the diamond already say
it) and so is the path. The hover surface carries `Sections/Hero`. Everything else in §2 stands: the
count is still TVW-001's, from the same source (AC2 is unchanged and is now the *only* thing the
painted row has to agree with), and the row is still hidden below 75% zoom.

**Why it was the right shape to ask for.** It is the one option that **cannot overflow** — the
painted string is 2–4 characters wide on every one of the 8,833 instance nodes in the corpus,
against 114px of room. Options 1 and 2 both trade a measured cost for information the hover already
carries: option 1 still loses the folder (two components named `Hero` draw identically), and option
2 spends 12px of height on all 8,833 nodes. ⚠️ **What it gives up is real and must be built for, not
apologised for**: with no name on the node, the hover is not a nicety — it is the only place the
identity lives, so it has to be reachable, fast, and present on logic instances too.

🔴 **The hover is now load-bearing, so it needs an AC of its own.** §4 was written when the node
carried the name and the hover was a bonus. Add: *hovering an instance node shows its full path
within Xms, on both visual and logic instances, and at every zoom where the eyebrow is drawn* — and
grade it on the rendered surface a person sees, not on the handler firing
([[a-rendered-surface-can-be-behind-a-blocker]]).

⚠️ **Where the hover goes is not decided.** `Edit ›` (§2's door) is already specified at the node's
top-right **on hover**, so two different things now appear on the same gesture. Whoever builds this
resolves them together — one hover surface carrying both, or the path beside the eyebrow and the
door where it is — and measures it before choosing.

## 8. s20 — built, and the one thing the ruling did not price

**Built (slice 1):** `instanceEyebrow.ts` (the pure rules: text, zoom gate, the four placements,
the allowance), `instanceCounts.ts` (TVW-001's walk, cached behind a dirty flag for a per-frame
caller), `eyebrowPlacement.ts` (the switch, 🔴 **delete it when Richard rules**), and the painter +
`titlebarHeight()`/`titlebarLabelHeight()` wiring. 18 jest specs in `tests-unit/tvw-007`, **six
mutants killed, none survived**.

### 🔴 The question that went to Richard, and why R-Z could not answer it

R-Z chose the count because it "cannot overflow" — 2–4 characters against **114px**. Two things
were wrong with that number, and neither changes the text, only its cost:

- **The real allowance is 93px (81px with an icon)**, not 114: `headerTextInset` is 37, not the
  7 the s18 census assumed. The ruling holds *a fortiori* — the count still fits.
- 🔴 **There is no free row to put it in.** `titlebarHeight()` = label + sub-label + 22, and
  UIX-005 records that this formula fixes **every connection-anchor position**. So a count on its
  own row moves the ports on every instance node in every project — the cost option 2 was rejected
  for, one row's worth instead of two.

Measured over 128 projects before anything was built (`scratchpad/eyebrow-*.js`): **9,634 instance
nodes**; **1,702 (17.7%) renamed** so they already pay for a sub-label row; of the 7,932 unrenamed,
the count fits after the name's last line on only **3,547 (44.7%)**.

Asked to choose, Richard said he would need to see them — so all four were built and photographed
on one canvas (`drive-tvw007-eyebrow.js`, 12/12 arms, `verdicts/TVW-007/2026-09-19`). What the
**model** said, per placement, on 33 instance cards:

| placement | titlebar | verdict from the drive |
|---|---|---|
| `hover-only` (today) | 36–64px | nothing on the card |
| `own-row` | 48–76px | **every port on 33 cards moves** |
| `reserve-width` | 36–78px | **also moves** — and its tallest card exceeds `own-row`'s |
| `inline-if-fits` | 36–64px | nothing moves; **the count is absent on 55%** |

### 🔴 The defect the photograph caught and every arm missed

The first run's `reserve-width` shots showed **names clipped inside the titlebar** — `Main Navbar`
lost its second line. The painter narrowed the name's allowance; `titlebarLabelHeight()` did not,
so the card was *measured* for a one-line wrap and *painted* with a two-line one. Every arm was
green, and the arm that was supposed to catch it reported **"card geometry unchanged"** — because
it read a height that had never seen the narrowing. Both now call the same `titleAllowanceFor` with
the same `eyebrowReserveWidth()`, and the placement is part of the label-height cache key. Once
fixed, the same drive reported `reserve-width` at **36–78px**: the arm had been describing the bug.

⚠️ **`reserve-width` reserves a fixed three-digit band, never the live count.** Reserving the real
width would re-wrap a card — and move its ports — when a *tenth* instance was placed in another
component, with nothing on screen saying why. The corpus holds counts needing three digits (198
components at 10–99, **two over 100**, max 140).

### What the next session does

1. **Richard's verdict on the four shots.** Then: the winner becomes a constant, `eyebrowPlacement.ts`
   is deleted with the three losers, and AC1/AC5 can be driven.
2. `hover-only` is what ships until then — it is the only placement that moves nothing.
3. Then the hover (AC2b) and the trail (AC3/AC4), which R-Z did not touch and which are independent
   of the placement.

## 9. s21 — the trail (AC3 ✅ AC4 ✅), built while the placement is still with Richard

`931f817a0f`. The placement verdict (§8) was still unanswered, so this session built the half of
the task it does not block: **the trail's containment form**. Nothing here touches the eyebrow, the
painter or `titlebarHeight()` — a peer was in `NodeGraphEditorNode.ts` the same evening and the two
sets of files do not intersect.

**What a person gets.** Double-click the `Hero` node on Home's canvas and the trail reads
`[◆ Home] › Hero` — the component you came *through*, drawn as a crumb with a diamond, followed by
where you are. Open the same component from the Components panel and it reads `Sections › Hero`,
exactly as before. ⌘[ and ⌘] rebuild whichever trail was on screen at that step.

**Built:** `instanceTrail.ts` (pure: `instanceParentCrumb`, `leafName`, `buildComponentTrail`),
`NavigationHistory` entries as `{name, via}` + `currentEntry()`, `switchToComponent`'s
`viaInstance` arg, the instance crumb in `NodeGraphComponentTrail.tsx` + its styling.
**53 specs / 4 suites green in `tests-unit/tvw-007`; TWELVE mutants killed, none survived.**
✅ **`test:main` — 517 suites / 8,258 specs all green, exit 0.** `typecheck:editor` 0,
`typecheck:editor-tests` 0. 🔴 `test:ci` NOT run — six live sessions, four `dev` stacks; AC6 owes it.

### 🔴 AC3's last clause, changed by building it

§4 asked for `discardInvalidEntries` to **drop entries whose `via` component is deleted**. It now
**clears the `via` and keeps the entry**, and the difference is worth the words:

after deleting `Home`, the entry for `Hero` still names a component that exists and is still
perfectly reachable. Dropping it makes ⌘[ skip a valid destination because something *else* was
deleted. What is actually broken is the **route**, not the entry: the trail would draw a `Home`
crumb wired to `switchToComponent(undefined)` — a crumb that looks live and does nothing. Clearing
the route fixes exactly that and falls back to the folder path, which is what every other route
shows anyway.

⚠️ The spec arms **both halves** — the entry survives *and* its `via` is null — because asserting
only the second would pass just as happily on an implementation that threw the entry away. The
`§4`-as-written behaviour is mutant M5 and it is killed.

### 🔴 Thirty lines that only a drive could have graded

The trail construction was inside `OverlayViews.updateTitle()`. It is a **choice between two
plausible trails for the same component**, and in there it needed Electron, a renderer and a live
`ProjectModel` to run at all — so in practice it would have been graded by looking at it. It is now
`buildComponentTrail`, called from the one place, and **the folder-path cases are a regression
floor**: the containment branch cannot quietly become the only branch
([[a-gate-can-have-a-hole-shaped-like-the-defect]]).

### What was deliberately NOT done

- ⚠️ **Only the instance crumb is a real `<button>`.** Every clickable crumb in that bar should be
  one — a `<div onClick>` is unreachable by keyboard and silent to a screen reader — but that is a
  change to the look of a surface P92/P94/P78 are all editing this week, and it needs a photograph
  before it ships. The new crumb has nothing to regress, and it is what makes the two crumb kinds
  differ in the **rendered DOM** rather than only in a class name, which is what AC4 asks to read.
- **The component-port branch of the double-click does not pass `viaInstance`.** That node *names*
  a component in a parameter; it does not contain one. The diamond is a containment claim that
  relationship never makes.
- **`in 3 places ▾`** (§2's multi-parent popover) — §6 measured that 44% of placed components have
  2+ parents, so this is the ordinary case, not the exceptional one. The crumb drawn is the one you
  came through, which is always right; what is missing is the way to see the others.
- **`getTopComponent` deleted** — no callers anywhere in the repo.

### AC1 and AC5 still need a drive

AC3/AC4 close on specs. **AC1 is the person sentence end to end** (the eyebrow's `· 1×`, the hover,
`Edit ›`, the trail, ⌘[/⌘]) and **AC5 is Richard's WORTHY on screenshots** — both need the editor.
🔴 Not driven this session: **six Claude sessions were live on this box**, four of them holding
`dev` stacks, and the s20 handoff records what an unattributed drive cost a peer. Use
`drive-tvw007-eyebrow.js`'s PPID ownership check.

**What a drive must actually confirm**, because no spec here does: that the crumb *appears*. The
ordering is right by inspection — `activeComponent = component` → `push(component, via)` →
`bindModel` → `updateTitle` — so `updateTitle` reads the fresh entry against the fresh component.
That is an argument, not a photograph ([[verify-the-consequence-not-just-the-mechanism]]).

## 10 — s22: the hover and the door (AC2b built, AC5's shots still owed)

`hover-only` is still what ships (§8's verdict has not arrived), so this session built the surface
that ruling made load-bearing: **the hover**, together with **`Edit ›`**, because §2 puts both on
the same gesture at the same corner and §7 asked for them to be resolved together.

**What a person gets.** Hovering an instance node — visual or logic — raises a one-line card just
above it reading `Sections/Hero · 3×`, with `Edit ›` at its right end. Pressing that opens the
component, and the trail then reads `[◆ Account] › Hero`, because the door passes `viaInstance`
like the other two.

**Built:** `canvas/instanceHover.ts` (pure: the close condition as a state machine, the content,
the anchor, the graph→pane transform), `InstanceHoverController.ts` (the timer, the slot, the
coordinates — no rules), `CanvasOverlays/InstanceHoverCard/` (the view + its stylesheet), a new
`instanceHoverRoot` layer in `CanvasShell` at `INSTANCE_HOVER_Z = 8`, and the four wiring points:
`NodeGraphEditorNode.mouse` (`move`, `move-out`, `down`), `ViewportActions.setPanAndScale` and
`switchToComponent`.

### 🔴 The door is NOT painted at the node's top-right, and that is a measurement

§2 asks for `Edit ›` "at the node's top-right on hover". Those pixels are already spoken for:
`NodeGraphEditorNode.ts:263` reads `pos.x > width - 20 && pos.y < 20` as the **connection-drag
zone**, and a `down` there starts a wire. A control painted in that rectangle — or a DOM element
floating over it — takes that gesture away from all **9,634 instance nodes** in the corpus, and
takes it silently: the same pixels, a different result.

So the door rides on the hover surface, anchored *outside* the card, which is where §2 was
pointing and none of the pixels the canvas has already promised. Two consequences worth having:
it is a real `<button>` (keyboard-reachable, announced, and a hit target the canvas cannot make —
there is still **no click dispatch for sub-regions**, and this task no longer needs one), and
AC2b can be graded the way it asks to be, with `elementFromPoint`.

### 🔴 A hover surface over a canvas must own its close condition

The obvious implementation hides the card on the node's `move-out`. The pointer has to cross
`InstanceHover.gap` px of canvas to reach the button, and that boundary crossing *is* `move-out` —
so the door would be drawn and unpressable ([[correct-and-usable-were-never-the-same-criterion]],
fifth repeat). Hence a grace window (`graceMs: 220`) and a visible-while rule of **on the node OR
on the card**.

⚠️ **And the spec found the second half of it.** Writing the arm for "pointer leaves both surfaces"
turned up a state the canvas actually produces and the first implementation could not represent:
the card is a DOM element **above** the canvas, so a pointer that lands on it stops generating
canvas mouse events **entirely** — the node's `move-out` never arrives. A machine that only
cleared `overNode` on `node-leave` would go on believing the pointer was on the node and would
survive every later `card-leave`: a box left on screen with the pointer elsewhere. So an arrival is
also a departure, stated in both directions.

### What the numbers say

- `tests-unit/tvw-007` — **80 specs, 6 suites green** (+27 specs, +2 suites on s21).
- **16 mutants, 16 killed, none survived**: the id-guarded leave, the immediate hide (the
  unpressable door), the arrival-that-is-not-a-departure, the pointer carried across subjects, the
  unconditional grace, the no-op dismiss, a count formatted here instead of by `eyebrowText`, the
  path losing its folder, an unscaled screen rect, the card that never flips, right-alignment
  without its off-the-left guard, room measured from the node instead of the clamped card edge,
  identity-only state equality, a view ignoring its vertical anchor, a `<div>` door, and an empty
  count drawn anyway.
- 🔴 **Two of those survived first.** `M11` (the off-the-left guard) and `M16` (room read from the
  node) both passed because the arm written for them **read the same answer in both arms** — a
  narrow pane alone never reaches either branch ([[a-rule-reading-zero-in-both-arms-grades-nothing]]).
  Two new cases, chosen so the correct and mutant answers differ, kill them.
- ✅ **`test:main` — 520 suites, 8,292 specs, all green, exit 0**, beside a peer's live `dev` stack.
- `typecheck:editor` **0**; `typecheck:editor-tests` **0**. `tsconfig.tests-main.json` still reports
  the same 3 pre-existing errors in `erg-005/componentContract.pending.ts` and
  `rel-004/webpackHeapCeiling.test.ts` — files this session never touched, in a config no
  `typecheck:*` script runs.
- 🔴 `test:ci` **NOT run** — a peer held a `dev` stack on this checkout for the whole session, and
  AC6 still owes it.

### What only a drive can settle, and the instrument for it

`scripts/devtools/drive-tvw007-hover.js` is written and **UNRUN** — a peer's editor held 9222 from
before this session started until after it ended, two dev stacks cannot coexist on this checkout
(webpack-dev-server hardcodes 8080), and driving a stack you have not attributed is what cost a
peer three misread runs at s20. It carries the PPID ownership guard, fails closed, and is guarded
by `require.main === module`; `node --check` passes.

Its arms, which are AC1's and AC2b's remainder: the card appears on hover and its path is
**reachable by `elementFromPoint`** (not merely rendered); the door is a `BUTTON` and reachable;
the count equals `buildUsageIndex`'s for the same component, read in the same run; the card
**survives the pointer's journey** to the door and the press then lands on the component, with the
trail's diamond crumb read off the DOM; the card does not outlive the canvas; a non-instance node
gets **no** card (the control, in the same run); the second instance kind carries it too; and the
path is still reachable at **50% zoom**, where the painted count is gated off — the arm R-Z's
ruling makes load-bearing. Then both themes, shot.

⚠️ **One thing no spec here covers**: that the door passes `viaInstance`. It is an options object
in the controller, which needs a renderer to reach, so the trail's diamond after pressing `Edit ›`
is the only place it is graded — the drive's job, exactly as the crumb's appearance was at s21.
