# TVW-007 — An instance says what it is

Proposal §4.4 (third and fourth bullets), mock callouts 6 and 7. Builds on FIX-018's look.

## 1. The person sentence

**Someone looking at the `Hero` node on Home's canvas reads that it is an instance of Sections/Hero
used once, sees a door to edit it, and after going through that door the trail reads `Home › Hero`
with Home drawn as the instance they came through — and clicking Home takes them back.**

## 2. The spec

| element | detail |
|---|---|
| **the eyebrow** | beneath an instance node's name, 10px mono: `INSTANCE · Sections/Hero · used 3×`, `INSTANCE` in the component hue. Painted by `NodeGraphEditorNodePainter.ts` in the same pass that paints FIX-018's chip (`:205-231`). The count is TVW-001's, from the same source. Hidden below 75% zoom |
| **the door** | `Edit ›` at the node's top-right on hover, `primary` on `primary-bg`. It is `NodeContextMenu.ts:243-262`'s *Open component* given a visible control; double-click keeps working. Also on logic instances (a `Format price` node) |
| **the trail** | today: `OverlayViews.updateTitle()` splits `fullName` on `/` (`OverlayViews.ts:483-503`). After: when the current component was entered *through an instance* (`switchToComponent` called from `SelectionActions.ts:167-169`, the `Edit ›` door, a Layers `›`, or TVW-001's *Used in*), the trail's first crumb is the **parent component**, drawn as the instance chip (diamond + component-hue wash), live, followed by `›` and the current component. Entered from the panel or search, the trail reads as today (folder path, folder crumbs inert). `NavigationHistory` (`NavigationHistory.ts:47-56`) records the entry route alongside the name so ⌘[ / ⌘] rebuild the right trail |
| **more than one parent** | the parent crumb is the one you came through. `in 3 places ▾` on hover lists the others (TVW-001's popover) |
| **cloud / workflow crumbs** | the synthetic two-crumb trail (`OverlayViews.ts:414-445`) and the cloud-function descent (`:466-480`) are unchanged; WFA-006 already made a workflow step behave as an instance |
| **always visible** | LGC-008's ruling holds: the trail is never hidden, including in the Visual Function pane |

## 3. Scope

In: the eyebrow, the door, the trail's containment form, history, both themes, the zoom rule.

Out: the panel's containment crumb (TVW-004). Any change to what the trail's `+` does. The lane.

## 4. Acceptance criteria

1. **(person)** Home's canvas. The `Hero` node shows `INSTANCE · Sections/Hero · used 1×`. Hover it:
   `Edit ›`. Press it: the canvas is Hero; the trail reads `[◆ Home] › Hero`. Press `Home` in the
   trail: back on Home with the Hero node selected. Now open Hero from the Components panel: the trail
   reads `Sections › Hero`. ⌘[ twice, ⌘] twice: each trail is the one that was shown at that step.
2. The eyebrow's `used N×` equals TVW-001's row meta for the same component (one source; assert
   both read from it).
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
