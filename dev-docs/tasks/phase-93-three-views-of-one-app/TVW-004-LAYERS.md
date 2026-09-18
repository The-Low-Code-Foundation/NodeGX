# TVW-004 — Layers

The missing tree. Proposal §4.1–4.2, mock scenarios 1 and 2, callouts 1–3 and 9.

## 1. The person sentence

**Someone editing `Hero` opens Layers and sees the whole of `Home` — Page, Nav and what is inside it,
Hero with its own five elements lit as the thing being edited, the work strip, the footer — and can
tell at a glance which rows belong to Home and which belong to a component Home placed.**

## 2. The spec

| element | detail |
|---|---|
| **where** | a second tab in the Components panel: `Layers \| Components`, the panel titled `Project`, rail glyph unchanged (R-E). Default tab: Layers when the canvas opens a page or a placed visual component; Components otherwise. ⌘⇧L flips. The tab is remembered per session, not per project |
| **scope** | **the page the preview is showing** (TVW-002's resolution of the route), not the canvas's component. Header: `Layers · Home` with `in the preview` at the right |
| **content** | the visual tree of that page from `NodeGraphNode.children[]` (`models/nodegraphmodel/NodeGraphNode.ts:57,156`) in render order, **recursing through every instance** into its `ComponentModel`'s graph roots (`ComponentModel` instance = a node whose `type instanceof ComponentModel`, `SelectionActions.ts:167`). Logic nodes are excluded (no `allowAsChild`, `componentmodel.ts:454-458`). Same glyphs and category colours as the canvas via the `--theme-color-node-category-*` tokens (`componentKind.ts:31-36` rule: no second palette) |
| **an instance** | a purple row with FIX-018's diamond, `›` at the right (`Edit ›` on hover), then an indented **band** row: `INSIDE SECTIONS/HERO · Edit ›` in 10px mono in the component hue, then the instance's elements one shade quieter (`fg-shy`). `›`, double-click or `Enter` on the instance row = `switchToComponent(type, {pushHistory:true})`. A repeated instance (`For Each`) shows `× n` and one band |
| **the editing region** | when the canvas's component is on this page, its rows carry a `component`-hue 9% tint and its band reads `EDITING HERO` with no `Edit ›`. When the canvas's component *is* the page, nothing is tinted |
| **the note** | when the canvas's component is not on this page, an `amber-bg` note under the header, same three shapes and words as TVW-002's strip, doors included. The tree below still shows the page |
| **the containment crumb** | when the canvas's component is on this page and is not the page: `Home › Hero` on a second header line, with `in N places` at the right; `Home` is live (`switchToComponent`). N places → `▾` lists them (the `×N` popover from TVW-001). Computed by walking usages upward as `useTopologyGraph.ts:35-68` does |
| **selection** | rows subscribe to and write TVW-003's store, using the instance-path identity; a row inside a band writes the path through its instance. Hover writes hover |
| **the footer** | `+ 14 logic nodes on the canvas — not on screen, so not in Layers`, the number being the canvas's component's non-visual nodes; the link sets the lane filter to `Logic` (TVW-006) or, before it exists, selects them |
| **empty page** | `Nothing here yet. Add a Group to start a screen, or a Function to start logic.` |
| **rows** | CHR-009's geometry: 28–30px, 14px indent per level with PNL-006's guides, kind glyph, name with ellipsis + tooltip, no second font size |
| **updates** | on the `Model.*` events the bench already subscribes to (`ComponentBench.tsx:219-234`) plus `componentAdded/Removed/Renamed` and route change. Virtualised above 200 rows |

## 3. Scope

In: everything above, both themes, at 300px and 240px, docked and with the preview detached (Layers
still follows the detached preview's route).

Out: reorder/reparent and drag-in (TVW-005). The strip in the preview (TVW-002). The Components tab
(TVW-001). Filtering Layers (PNL-006's filter is for Components; a Layers filter is a follow-up row,
not this task).

## 4. Acceptance criteria

1. **(person)** Corpus project, preview on `/`, canvas on `Home`. Layers shows Page → Nav → *inside
   Nav* → Brand, Links, Primary Button → *inside Primary Button* → Label … through Hero, the work
   strip, Footer. Double-click `Hero`'s row: the canvas opens Hero; Layers still shows Home, with
   Hero's five rows tinted and the band reading `EDITING HERO`; the header's second line reads
   `Home › Hero · in 1 place`. Click `Headline`'s row: it is selected on Hero's canvas and outlined in
   the preview. Navigate the preview to `/pricing`: Layers shows Pricing with the shape-1 note.
2. Row count = the size of an independent DOM walk of the page through instances (a spec on three
   projects: corpus, QA fixture, TPL-008), and every row's glyph colour equals the canvas's colour
   for that node's category (read both off the rendered elements).
3. The tinted region is exactly the rows whose owner component is the canvas's component; on a page
   with two instances of it, both regions tint.
4. A cycle (a component placing itself) is drawn once with a `↻ places itself` row and does not
   recurse further; the editor does not hang (a spec with a deliberately cyclic fixture).
5. The tab default and the ⌘⇧L flip behave as specified from a cold start on each of: a page, a
   placed visual, an unplaced visual, a logic component.
6. Screenshots in `verdicts/TVW-004/<date>/`: AC1's five states, both themes, 300px and 240px.
   **Richard rules WORTHY.** This is the phase's centrepiece surface.
7. `test:ci` at the floor; `test:main`'s cross-phase gates green (a spec not in `index.ts` never
   runs — [[editor-ui-pointers]]).

## 5. Landmines

- The panel's existing tree is built from *names* (`useComponentsPanel.ts:293-369`); Layers is built
  from *graphs*. Do not share the builder; share the row component.
- `NodeGraphModel.forEachNode` stops on a truthy return.
- A `For Each` places its `template` component through a parameter, not a child; find the repeater's
  target the way the MCP's `repeats` does, or the band under a repeated row is empty.
- Popups (`NavigationShowPopup.target`) and Router pages are reachable but not *children*; they are
  not in Layers. A Component Stack's pages likewise. Say so in the empty band if someone expands a
  Router: `pages are in Components → Pages`.
- `useSidePanelLayout`'s shared width: the tab must not change the panel's width.

---

## 6. Slice 1 — the walk, and what measuring it first changed (s14, 2026-09-18)

`layersTree.ts` (pure, `tests-unit/tvw-004`, 17 specs, 9 mutants each `cmp`-proven applied and each
red with a real count). Before any UI, it was run over **every project on this machine** — 117 with
a readable `project.json`, 514 screens, **47,494 rows** — the technique that changed TVW-002's
design before a pixel existed. Four things came back.

### 6.1 🔴 The spec's scope is wrong in 94% of routed projects — and the walk was built to the screen

§2 says Layers shows *"the page the preview is showing"*. Of the **78 routed projects, 73 have a
root component that draws something besides the Router** (median 2 rows, p90 **21**). Those rows —
an app shell's nav bar, a toast layer, a modal host — are **on the screen the person is looking at**
and are named by no page's graph. A Layers built from the page alone would omit them, which is
exactly row 11's disorientation with a new surface drawn around it.

So the walk starts at the **root** and descends the Router into the routed page, as `pageReach`'s
`reachOfScreen` does, and the page arrives under a `SHOWING HOME` band with the shell above it.
**Owed to Richard: is that right, or does he want the page only?** (§6.5, Q1.)

### 6.2 🔴 The indent in §2 does not fit the panel — 28% of rows have no room for a label

Row depth over the corpus: **p50 12, p75 19, p90 26, max 41**. At §2's *14px per level*:

| | depth | indent | panel at 240px |
|---|---|---|---|
| median row | 12 | 168px | 72px left for the label |
| p75 | 19 | 266px | **past the right edge** |
| p90 | 26 | 364px | **past the right edge** |

**48.5% of all rows are deeper than 12 levels; 28.0% are deeper than 17** — 17 being where a 240px
panel runs out. A third of that depth is this task's own doing: an instance costs **two** levels
(the purple row, then the band), p50 4 of 12 and p90 10 of 26. Removing one is available; it does
not fix it. (§6.5, Q3.)

### 6.3 🔴 Nothing in §2 or the proposal collapses, and one modest page is 330 rows

`Prefab marketplace` → `Home` is **330 rows** fully expanded. Across the corpus: p50 24, p90 189,
**49 of 514 screens over 200**, max **2,994** (`Erleah-2` → `Discover`). §2 asks for virtualisation
above 200 rows, which answers *drawing* cost but not *reading* cost: a person opening Layers to
find the thing they are editing would arrive at a 2,994-row list. Building the whole tree is free
(**1.15ms** for the 2,888-row worst case), so this is purely a question about what is open when the
tab opens. (§6.5, Q2.)

### 6.4 What the walk settles, measured

- **A repeater's template is drawn, and 92% of repeaters can be read statically** — 770 of 836 name
  their template in a parameter. The row says **how** it repeats (the repeater's own label), never
  `× n`: the count is a runtime fact about data, and §2's `× n` would be an invention. **20 of the
  66 dynamic repeaters still carry a stale `template` parameter**, so `templateType` is the field
  that decides, not the presence of `template` — a mutant survived until the fixture kept the stale
  one.
- **`roots[0]` is not the root that draws in 572 of 5,039 components** (11%). A fixture whose first
  root happened to be visual graded both readings identically; the mutant survived until `/Home`
  authored its logic root first.
- **Logic needs no filter.** A child is visual *by construction* — `canCreateNode` refuses a parent
  for a type whose `allowAsChild` is false — so walking `children[]` from the first visual root
  excludes logic without a single type read, and therefore without inheriting
  `allowaschild-is-stale-until-the-node-library-loads`.
- **No project on this machine contains a cycle.** AC4's fixture must be built, as its spec says.
- **731 instances carry children of their own** (slotted content). They are drawn at the instance's
  depth, outside the band, because they belong to the *placing* graph.

⚠️ **The census's first run said 57 screens were empty. That was the instrument** — project files
written before the `visualRoots` field existed have none, and the editor computes it live. Replaced
with a visual-type set derived from the corpus itself (every type that appears as a child anywhere
is provably `allowAsChild`); 57 → 4.

### 6.5 Owed to Richard before the UI is drawn

1. **Q1 — the shell.** Layers shows the **screen** (shell rows, then `SHOWING HOME`, then the page)
   rather than the page alone. 73 of 78 routed projects have shell rows. Right?
2. **Q2 — what is open when the tab opens.** Fully expanded is 330 rows on a modest page and 2,994
   at worst. Proposal: open with **only the path to the editing region expanded**, everything else
   collapsed, carets on every row that has children.
3. **Q3 — the indent.** 28% of rows are past the right edge of a 240px panel at 14px/level.
   Proposal: cap the indent (it stops growing after N levels, the guides carry the rest), and drop
   the band's extra level so an instance costs one, not two.

### 6.6 The three rulings, and what they did to the numbers (s14)

Richard ruled all three the same session, on the measurements in §6.1–6.3:

- **R-R — Layers starts at the top of the screen.** The shell's rows first, then `SHOWING HOME`
  where the page begins, then the page. *"Nothing you can see is missing from the list."* Built as
  measured; §2's **scope** row is superseded.
- **R-S — the tab opens on the branch you are editing.** Every ancestor of the editing region is
  open, plus the chain down to the page on screen; everything else is closed with a caret.
- **R-T — reduce the indent a bit, and cap it at 8 levels.** 🔴 §2's *"14px indent per level"* was
  never the artefact: `ComponentsPanel.module.scss` has shipped `--tree-indent: 12px` since PNL-006.
  Reduced to **10px** and capped at **8 levels** = 80px, which is the whole of the indent a row can
  ever carry. The band's extra step went with it — a component boundary now costs **one** level.

**Measured after, not assumed** (`tvw004-layers-census.ts` and its depth arm):

| | before | after |
|---|---|---|
| row depth p50 / p90 / max | 12 / 26 / 41 | **10 / 22 / 33** |
| rows past a 240px panel at the step | 28.0% | **0%** — the indent stops at 80px |
| rows visible when the tab opens (p50 / p90 / worst screen) | 68 / 325 / 2,994 | **23 / 39 / 309** |

`expandedForEditing` + `visibleRows` are pure and graded with the rest; the collapse state is the
view's, the default is not. **21 specs, 13 mutants, each `cmp`-proven applied and each red with a
real count** — including one for each ruling, so a later session cannot quietly undo them.

⚠️ **The band is a *sibling* of the rows it introduces, not their parent.** Both hang off the
instance row, which is what lets one press fold an instance away — and what makes a
parent-chain visibility check (not an immediate-parent one) load-bearing. Mutant 11.

### 6.7 🔴 A defect in TVW-002's *closed* surface, found by building the note beside it (s14)

§2's **note** must say the same words as TVW-002's strip. Building it meant asking whether the two
walks agree — and they did not, because `pageReach` never followed a **repeater's template**.

A `For Each` places its template through a **parameter**, not a child (this task's own §5 landmine).
Measured over the corpus: **498 components are placed only as a `For Each` template**, and for
**190 of them, in 56 projects, the repeater's own component is on a screen the app shows.** Every
list row, table row and tab in this corpus is one of these. What the shipped strip said, in these
exact words, run through the real modules:

    Checkbox Item isn't on any page yet — it's only inside Multi Choice, which no page shows.

…about a component drawn once per row of a list the person is looking at. After the fix, the same
component on the same screen:

    Checkbox Item is on Home. The preview is showing that screen.
    Tab Bar Item isn't on Home. It's on Package Details, New, My Packages and 3 more.   [Go to Package Details]

**Fixed in `pageReach.ts`**, because it blocked this task's note rather than because it was found:
a note that contradicts the tree drawn directly beneath it is worse than no note. 4 new specs in
`tests-unit/tvw-002/pageReach.test.ts`, 3 mutants, each red.

⚠️ **The outline is deliberately NOT extended.** `firstRendered`'s paths are chains of
component-instance ids and a template has no instance node of its own, so the only id to point at
is the repeater's — and whether the highlighter resolves that is a question for the running app.
TVW-002's own drive is where the last *"this path outlines nothing"* was found, at full price. The
sentence is corrected; the outline stays `null` until something measures it.

⚠️ **`renders` now means "the app places it on that screen"** for a repeated component. Whether a
row exists depends on the **data** — an empty list draws none — and no static walk can know that.
Saying *"it's on Home"* about an empty list is a far smaller error than telling someone their list
item is on no page at all. **Owed to Richard: is a repeated component's sentence worth a word of
its own** (*"Checkbox Item is on Home — once per item"*), or is the plain one right?
