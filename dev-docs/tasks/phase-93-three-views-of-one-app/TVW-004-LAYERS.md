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

### 6.8 The first drive — seven green arms, and the screenshot that failed them (s14)

`scripts/devtools/drive-tvw004-layers.js`, against a copy of `Prefab marketplace`
(`NodeGX test projects/TVW-004 s14 Drive`, 165 components, root `/App`). Every arm held:

| arm | reading |
|---|---|
| the panel is titled `Project` and carries two tabs | `Layers*` `Components`, header `Layers · Home` |
| Layers drew rows | 6 visible — the shell, `SHOWING HOME`, the Page, a `Loader` |
| the indent stops at 90px however deep the row is | deepest row **level 9**, widest padding **90px** of a 90px cap |
| one level of nesting is 10px | every step seen: 10 |
| the canvas component is a tinted region with an EDITING band | `EDITING MAIN NAVBAR` · **16 tinted rows** |
| double-clicking an instance row opens it on the canvas | `…/Main Navbar` → `…/Atoms/Layout/Limiter` |
| clicking a row writes the shared selection | `{source: 'layers', component: '/App', nodes: [1]}` |

🔴 **And then the screenshot showed the Properties panel where Layers had been.** Selecting a node
opens its properties in the side panel (`SelectionActions.selectNode` → `SidebarModel.switchToNode`,
and it is right to do that when you clicked the node itself). Written from Layers it means **the
tree removes itself on the first click in it** — the surface this task exists to build, deleting
itself the moment it is used. Every number above was about the row; none was about the panel.

Fixed with a rule rather than a deletion: `keepsSidePanel(source)` in `canvasSelection.ts`, threaded
as `keepSidePanel` through `switchToComponent` → `selectNode`. A selection from `layers` or `panel`
leaves the panel alone; one from `canvas` or `preview` still opens Properties, which is TVW-003's
shipped behaviour and the right answer for those two.

⚠️ **The selection arm could not have failed as written.** It clicked the first row in the tree —
which belongs to the root component, so its path is a single id, and a build that had lost the
instance trail entirely would produce exactly that and pass. It now clicks a row **inside a band**
and asserts a path longer than one. Same family as s13's chip arm that fired on all seven rows.

⚠️ The drive also **ends by moving state** (canvas switched, every reachable caret opened). It now
resets to the root component and asserts the reset, as TVW-002's does.

⚠️ **A pre-existing duplicate-key warning sits on the launcher** (`Encountered two children with the
same key` for a project guid, 9 times before any project is open). Not this task's, not filed —
recorded so the next reader does not attribute it to Layers.

**Left to drive** (the box went to a peer mid-run): the fixed panel behaviour on screen, AC1's five
states, both themes at 300px and 240px, AC2's independent DOM walk, and the detached preview.

### 6.9 The second drive — the surface works, and the shot found two more things (s14)

`9/9` arms held, including the two the first run could not fail (a path **inside a band**, and the
**panel still on screen** after a click) and the reset. `/tmp` shots read back, not assumed.

**On screen and correct:** the panel titled `Project` with `Layers | Components`; `Layers · Home ·
in the preview`; the crumb `App › Home › Main Navbar · in 7 places ▾`; rows `Group → Group → Page
Router → SHOWING HOME → Page → Main Navbar → INSIDE MAIN NAVBAR → …`; the footer `+ 27 logic nodes
on the canvas — not on screen, so not in Layers`; and the note
`File Selector isn't on Home. It's on New, Update and Upload.` with both doors.

✅ **The tint's boundary is right, and the screenshot is what proves it.** Read off the rendered
rows: `EDITING MAIN NAVBAR`, `Header`, `Limiter` tinted — then `INSIDE LIMITER` and the rows under
it **not** tinted — then `Group`, `Logo`, `Icon Button` tinted again. The region is *discontinuous*,
because an instance's insides belong to another component's file and the rows after it come back to
this one. That is §2's rule visible as a shape.

🔴 **A TINT WITH NO BAND TO EXPLAIN IT.** With the canvas on the **root**, the shell's own rows
tinted and nothing said why — the root is entered by the walk itself, so it has no band. Nine arms
held through it; the shot is what showed it. §2 half-anticipated this ("when the canvas's component
*is* the page, nothing is tinted") but named the **page**, which under R-R now has a band and reads
perfectly well tinted. The rule the spec was reaching for is **tint only what a band names**, and
that is what is built. Companion to R-N: *a ruling that changes what a surface is retires the spec
lines that assumed what it was.*

🔴 **The tint was the SELECTION colour.** `--theme-color-primary-bg` — `rgba(77, 163, 255, 0.13)`,
which is what `.Selected` paints a row with eleven lines below in the same stylesheet. A region
*being edited* read as a row you had *clicked*. Now the component hue at 9%
(`color-mix(… var(--theme-color-node-category-component) 9% …)`), which is the hue the band label
above it already uses. §2 said "component-hue 9% tint" and the first build quietly used the token
that was nearest to hand.

⚠️ **THE RENDERER RAN THE OLD MODULE FOR THREE READINGS.** The tint fix appeared not to work; the
module in the renderer still had the previous source (`String(layersOfScreen).includes(…)` is how
that was settled, rather than by re-reading the DOM a fourth time). HMR had not applied it. A
`cdp reload` fixed it. **When a change appears to have no effect, ask the renderer which source it
is running** before doubting the change.

🔴 **Owed to Richard — the same sentence is on screen twice, 188px apart.** With the preview docked,
the note in the panel and the strip at the seam carry the **identical words and the same two
doors**. §2 asked for the note "same words as the strip, doors included" and nobody noticed both
would be visible at once. Exactly the shape he ruled on at TVW-001 AC7 (*"Sample values."* 44px
above *"No sample data"* — he cut one). The note earns its place when the preview is **detached**;
docked, it is a duplicate. [[a-pinned-string-is-blind-to-its-neighbour]]

### 6.10 R-U and R-V — the note is gone, and a repeated component says so (s14)

**R-U — there is no note in this panel.** Shown the duplicate, Richard answered with the question
that settles it: *"That message was supposed to be a visual separator between the node canvas and
preview, anchored to the bottom of the preview, so nobody would ever wonder 'why am I not seeing
this component I have in the canvas / have selected in the left components menu?' — why do we need
the message duplicated in the left menu at all?"*

We do not. **And detaching does not create a case for one**: the detached window renders the strip
itself, with its doors (R-M). So the sentence is on screen in every layout there is, and §2's note
row is a duplicate in all of them. Removed — the JSX, the styles and the second `usePreviewStrip`
instance, which was also a whole-project walk per graph event for an answer now nobody reads.
**§2's `the note` row is superseded.** What the panel says instead is the thing only the panel can:
the **crumb**.

**R-V — a component a repeater draws says so.** *"Checkbox Item is on Home — once per item."*
Threaded as `PageReach.repeated`, which marks a template **and everything inside it** (a `Row` drawn
per item draws its `Avatar` per item), read off the **screen's own walk** so a component repeated on
Pricing does not claim it while the preview is showing Home. 4 specs, 3 mutants, each red.

**Driven after both:** the strip carries `File Selector isn't on Home. It's on New, Update and
Upload.` with its two doors; the panel carries the header, the crumb (absent here, correctly — the
component is not on this screen) and `+ 8 logic nodes on the canvas`. One claim, one place.

---

## 7. Slice 2 — AC2 against the running preview, and what it found (s15, 2026-09-18)

AC2 asks for the rows to be checked against **an independent DOM walk of the page**. s14 had an
independent walk, but it was a second walk over the same data structure in the same process. This
one is written in the **viewer**: every element of the running app, up React's fiber tree to the
`noodlNode` prop, and each node's instance path derived from the runtime's own `nodeScope` links.
Different process, different tree, different data. The only thing the two share is the node id,
which is the thing both are claims about. `scripts/devtools/drive-tvw004-ac2.js`.

**It failed on the first project it was pointed at, and the first number was 101 of 104.**

### 7.1 🔴 A Layers row under a Router page selected NOTHING in the preview

The row for `Header` wrote the path `[pageRouter, mainNavbar, header]`. The runtime's path for the
same element is `[<page guid>, mainNavbar, header]` — a Router mounts its page through a node it
**mints at run time**, and that node's guid is in no project file. `pathAddresses` requires every id
in the selector to appear in the rendered path, so the match failed and nothing was outlined.

Measured, three shapes against the live preview on the corpus's Home:

| path handed to `selectNodesAtPath` | nodes the preview selected |
|---|---|
| `[router, navbar, header]` — what Layers wrote | **0** |
| `[navbar, header]` — the authored convention | 1 |
| `[header]` | 1 |
| `[pageGuid, navbar, header]` — the full rendered path | 1 |

Three known-firing arms beside the one absence, which is the only way an absence means anything.
The Router's own id appeared in **zero of the 104 rendered paths** on that screen.

**The editor's own side already agreed with the runtime rather than with this walk.**
`EditorDocument` stores what a preview click reports through `authoredPath()`, which drops exactly
the ids no project file holds. Layers was the one surface writing a path in a third convention.

Under R-R the tree starts at the top of the screen and *everything below the page* is under the
Router, so this was **every row of every routed screen** — 78 of the 117 projects on this machine.

### 7.2 🔴 The same defect at the repeater, and the rule both are instances of

A `For Each` draws its template through an instance minted **per item**, so the walk was offering
one constant id where the runtime had three different guids. 37 of the remaining 104 nodes.

The rule, now written in both places: **a node's id goes on the trail only when the runtime draws
that node.** A component instance is drawn, so `visitInstance` pushes it. A Router and a `For Each`
place something without being it, so they do not.

⚠️ **What this gives up:** two `For Each`es drawing the same template on one screen now produce rows
with identical paths, so selecting one addresses both. That ambiguity is the runtime's — the ids
that would separate them are per-item guids no editor surface can name — and the alternative was not
a more precise selection but **no selection at all**.

### 7.3 🔴 The key and the path are two identities, and merging them duplicated React keys

Dropping those ids from the trail also dropped them from every **key** beneath, because both were
built from one array. Two repeaters drawing one template under one parent then produced rows with
identical keys — `Encountered two children with the same key` in the editor's console, on the very
screen the drive was photographing, found by reading `.logs/dev.log` while waiting for webpack.

`path` is handed to the preview and may hold only ids the runtime draws. `key` is React's identity
and must be unique among the rows on screen. They are now two arrays. **The unit fixture has one
repeater and could not have seen this**; the corpus said it immediately.

### 7.4 🔴 A repeater whose template arrives on a wire was asserting the stale parameter

s14 guarded on `templateType`, which is the *other* way a template goes dynamic. A **connection into
the `template` port** overrides the parameter at run time and leaves `templateType` unset — so the
walk waved it through and drew whatever the stale parameter still named. On the corpus's Home,
`Multi Choice` carries `template: ".../Checkbox Item"` **and** a wire into `template`; Layers drew
`Checkbox Item`'s insides while the screen was showing `Tag Item`'s.

Measured over the **212 projects** on this machine: **38 of 864 `For Each` nodes have the port
wired, 34 of those still carry a `template` parameter, across 17 projects.**

Now a note — `the template comes from a connection` — rather than a guess, on the same judgement as
`ROUTER_PAGES_NOTE`: which component draws there depends on data the editor has not run, and a tree
that says the wrong name is worse than one that says it cannot know.

⚠️ **Refusing made the raw count WORSE** — 30 unaddressed nodes became 36 — and that is correct. The
arm now attributes them: `2 wired-template repeaters on screen account for 36 of the 36 nodes no row
addresses`. An arm that scored the honest build below the mis-naming one was grading the wrong thing.

### 7.5 AC2 as it now stands

| project | rendered | authored | addressed | glyph colours |
|---|---|---|---|---|
| corpus (Noodl Marketplace, 165 components) | 104 | 103 | **103, +36 under two refusing repeaters** | visual + component, both = canvas |
| QA fixture | 6 | 6 | 6 | visual = canvas |
| TPL-008 (todo list) | 17 | 16 | 16 | visual = canvas |

⚠️ **Only the corpus grades a real population.** The QA fixture's start page is `erg-rig` (6 nodes)
and TPL-008's preview sits on `/sign-in` (17). They agree, on different shapes, and they are not
evidence of much on their own — [[a-budget-measured-on-a-fixture-is-a-budget-on-the-fixture]].

**The colour arm compares the rendered glyph with `CanvasTheme.instance.categoryColors(name).accent`
— what the canvas actually paints — not with the stylesheet.** Read off the `Cat-*` wrapper, because
`Icon` renders an empty span whose colour is inherited.

## 8. Slice 3 — AC1's five states and AC6's shots (s15)

`scripts/devtools/drive-tvw004-ac1.js`, driven twice (300px and 240px), **14/14 graded arms** each.
Shots in `verdicts/TVW-004/2026-09-18/`: five states × two themes × two widths = 20.

**The arm that matters is state 3's third one: `THE PREVIEW OUTLINES IT`.** It is read in the
**viewer**, off `Highlighter.selectedNodes` — the map the outline divs are drawn from — because
reading the editor's selection store confirms only that the editor agrees with itself, which was
true throughout the period when the preview outlined nothing. It now reads 1. That arm is green
only because of §7.1.

### 8.1 What the drive had to learn before it measured anything

Four instrument faults, each of which had produced a confident wrong answer first:

- 🔴 **Twenty screenshots of one width, named as two.** `useSidePanelLayout` seeds its widths with
  `useState(readStoredWidths)` — read once at mount — so writing the setting changed the store and
  nothing on screen. Every shot measured 326px, including the ten called `240px`. The filename now
  carries the width that was **measured**, and the drive drags the divider like a person.
- 🔴 **State 3 read a designed-in absence.** `previewMode` starts `true` and `EditorDocument` gates
  the whole outline channel behind `if (!previewMode)` (DES-001). AC1's "outlined in the preview" is
  a claim about **design mode**; the drive now presses `Design` and refuses if the banner is absent.
- 🔴 **The subject was a `Loader`.** Expanding until *any* instance row appeared picked the shell's
  spinner, which draws nothing until something is loading — so the outline arm read an absence that
  meant nothing. The drive now expands until an instance the preview is **drawing** is reachable.
  ⚠️ An instance row is never "on screen" by the leaf test: a component instance draws no element of
  its own, only its insides do. `Main Navbar`, `Limiter`, `Logo` and `Icon Button` were all among
  AC2's "rows with nothing rendered", correctly.
- 🔴 **"On no screen" was asked of the row list**, which names components only on instance and band
  rows — so it picked `/App`, the project's own root, which is on every screen there is. It is a
  question about **placement**, and is now put to the project.

### 8.2 🔴 AC5's tab rule cannot be graded by this drive, and the attempt read as a defect

The same arm read `Components` at 300px and `Layers` at 240px **from one unchanged build**.
`defaultTabFor` is a *cold-start* default: `ComponentsPanelReact` keeps `chosenTab` and falls back to
the default only while it is null, and §2 says the choice is remembered for the session. This drive
makes such a choice — it clicks `Layers` to ask AC1's own question — and the panel does not remount
between runs. **It was the memory, working as specified.** AC5 wants a cold start on each of four
component kinds; that is a drive of its own, and it is still open.

### 8.3 🔴 The crumb lost the one word that was not already on screen — found by the screenshot

At `MIN_PANEL_WIDTH` the crumb read **`App › Home ›…`**. The three steps measured 143px inside a
140px box, and because a button is an *atomic* inline box Chromium cannot clip three pixels off it:
it drops the whole box and draws the ellipsis. So the name of the thing being edited disappeared for
want of **3px**, leaving a line that says only what the header above it already said.

**The DOM said it was fine.** `scrollWidth > clientWidth` is meaningless on an inline element, and
`elementFromPoint` still returned the button at its midpoint — rendered, reachable, and not drawn.
The pixels were the only honest witness. Fourth time this phase that a screenshot has failed a set
of green arms.

⚠️ **Which step gives up the width was measured, not assumed.** Shrinking the leading steps first is
the obvious answer — they are context, the tail is the subject — and it renders
`A… › Ho… › Main Navb…`: three shredded words, because a step one pixel short still has to find room
for an ellipsis, and the steps are 20px and 29px. The leading steps now hold their ground and the
long tail absorbs it: **`App › Home › Main Nav…`**, every word legible.

## 9. Slice 4 — AC5, the tab a cold start opens (s16, 2026-09-18)

`scripts/devtools/drive-tvw004-ac5.js`. **11 arms, 10 graded, 10 held.** No product code changed:
the surface was already right, and what was missing was a drive that could see it.

### 9.1 The cold start is a door the product already has

§8.2 left AC5 needing "a fresh renderer per kind, or a way to clear `chosenTab` that is verified to
work". It needs neither. `route({to:'projects'})` and back unmounts `EditorPage`, so the panel is
built again with `chosenTab === null` — **leaving the project and coming back is the cold start**,
it costs about twenty seconds, and it is a route a person takes. A renderer reload also works and
buys a webpack race for the privilege.

⚠️ **And the canvas comes back where it was left**, which is why three of the first four readings
started on the tab they expected. An arm that reads `Components` on a panel already showing
`Components` grades nothing. Each subject is now **primed** first: the canvas goes to a component
whose default is the *other* tab, the drive checks it moved there, and only then goes to the
subject. Priming moves the canvas, and only a tab click or ⌘⇧L writes `chosenTab`, so the panel is
still cold — and if priming ever did make a choice, the primed tab would not be the opposite one
and the subject would go **ungraded** rather than pass.

### 9.2 The four subjects were chosen off the project file, not off the panel's index

`buildKindIndex` is the pipeline the tab decision reads; picking the fixture with it would make the
subject and the answer one measurement. `project.json` was read directly instead — a `Page` node at
a root, a visual root type, and how many nodes anywhere carry the component's name as their `type`:

| AC5's kind | component | file says | runtime says |
|---|---|---|---|
| a page | `/Pages/Main/Creator` | `Page` node at its root | `page`, 0 instances |
| a placed visual | `…/Atoms/Layout/Limiter` | `Group` root, 12 nodes place it | `visual`, 12 instances |
| an unplaced visual | `…/File Dropzone/Samples/Image File Dropzone` | `Group` root, nothing places it | `visual`, 0 instances |
| a logic component | `…/Utils/Media Queries/Match Media Query` | no visual root at all | `component`, 6 instances |

The runtime's kind is read too, as a **precondition**: an arm about an unplaced *visual* whose
subject the runtime calls a logic component would expect `Components` for the wrong reason, so it
refuses rather than passes. The logic subject is deliberately a **placed** one — so that arm also
says placement alone does not open Layers.

**The pair that carries the claim** is the two visuals: same kind, different placement, different
tab. Four readings that all said `Components` could be a build that never opens Layers at all.

### 9.3 ⌘⇧L was pressed, not emitted

`Emulation.setFocusEmulationEnabled` and `Input.dispatchKeyEvent` on the same connection, Meta|Shift
and `KeyL`. Emitting `componentsPanel.flipTab` would have proved the panel listens and said nothing
about whether the shortcut reaches it. It flips, it flips back, and — pressed from the **search**
panel — it opens the Project panel and flips, which is the claim `EditorPage` makes for it in its
own comment: *"a shortcut that only worked while the panel happened to be showing would be a door
you have to already be through."* R-E's other half held in the same run: with a tab chosen, moving
the canvas to a component whose default is the other tab does not move it.

### 9.4 🔴 What the memory does NOT survive — §2's row is one word too strong

§2 says the tab is **"remembered per session, not per project"**. Measured: choose `Components`,
leave to the launcher, come back — and the tab is `Layers` again, the default for whatever the
canvas opens. `chosenTab` is `useState` inside `ComponentsPanelReact`, and `EditorPage` unmounts on
the way out, so the choice is remembered **for as long as you stay in the project**, not for the
session.

**This does not block AC5**, whose sentence is about the default and the flip, and both are green.
It is filed because the spec row as written is not true of the build, and a later session reading
§2 would believe it. The fix, if it is ever wanted, is small — `chosenTab` lifted out of the
component into a module-level value — and it is the same shape of thing the drive relies on to get
a cold start at all, so whoever does it has to rewrite `coldStart()` in the drive as a renderer
reload in the same change.

## 10. Where TVW-004 stands after s16

| AC | state |
|---|---|
| 1 — the five states | 🟢 driven end to end, 14/14 arms, both widths |
| 2 — rows against an independent walk, glyph colours | 🟢 4/4 on three projects; three defects found and fixed |
| 3 — the tinted region | 🟢 (s14) |
| 4 — a cycle | 🟢 (s14) |
| 5 — tab default and ⌘⇧L | 🟢 **10/10 arms** on four cold starts, each one primed so the tab is seen arriving (§9) |
| 6 — the shots | 🟡 **20 captured; Richard's WORTHY verdict is what is left** |
| 7 — gates | 🟢 `test:main` 497/7939; `tests-unit/tvw-004` 2 suites / **41 specs**, 4 new mutants each `cmp`-proven applied and each red on its own spec |

**Owed to Richard: AC6.** The shots are in `verdicts/TVW-004/2026-09-18/`.
Two things to look at rather than read about:

1. **`3-selected--light--238px.png`** — a deliberate selection draws the box-model chip over the
   running app (TVW-002 §6 kept it off the *placement* channel for exactly this reason, but a real
   selection is supposed to feed it). It covers a good part of the hero. Is that right here?
2. **`INSIDE LIM…`** — band labels truncate at 240px the way row labels do. The tree above says
   `Limiter` two rows up, so nothing is lost; it is a question of whether it looks unfinished.
