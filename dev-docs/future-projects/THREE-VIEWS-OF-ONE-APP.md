# Three views of one app — the components panel, the canvas and the workbench as one idea

**Written:** 2026-09-17, during P92, from a read of the shipped panel, canvas and bench code at
`cline-dev` HEAD `a2f5ce210`. **Status: PROPOSAL, nothing built, nothing ruled.** **Revised the same day after Richard's first read** — the
Layers tree changed scope (§4.2) so it no longer duplicates the canvas column, the auto-Workbench rule was
withdrawn for a sentence in the preview (§4.5), and the old multi-component preview returns as a Workbench view
(§4.7). **Accepted in principle by Richard the same day** (*"You've done it Watson. I think you've cracked it"*) with one
correction — the visual stack is not pinned to the left of the canvas (§4.4, R-J) — and scoped as
[**Phase 93**](../tasks/phase-93-three-views-of-one-app/README.md).
**Mock:** [`mocks/three-views-mock.html`](./mocks/three-views-mock.html) — the left panel with both
trees, the canvas with its structure lane, the preview in app and workbench modes, three scenarios,
selection shared across all of them. Open it before reading §4.

> "It's a place that kind of sets NodeGX apart from all other low code editors. It doesn't reflect
> what's in your project folder. It doesn't reflect the DOM. It's a little space all by itself, a
> third way actually to organise components. […] a bit fucking stupid, but at the same time genius."
> — Richard, 2026-09-17

## 0. The proposal in one paragraph

Keep the components panel. It is the one thing NodeGX gets *right* that the tools people arrive from
also get right (Figma's Assets, a React `src/components/` folder): a list of **what you have**, apart
from **what is on screen**. What NodeGX is missing is the *other* tree every one of those tools also
has — Layers, Navigator, Elements, DevTools — the tree of **what the screen in the preview is made
of**, all the way down through the instances. The DOM exists in the model and is painted on the
canvas as an indented stack, but no panel lists it, and the two ideas (a component you *have*, an
instance you *placed*) are never named apart. So: add the missing tree beside the existing one, scoped
to the page the preview is showing so it is not the canvas column again; name both honestly; build the
two hinges between them (*"where is this used?"* and *"edit the component this came from"*); draw the
canvas's structure lane so the DOM is visibly the DOM; and when the thing on the canvas is not on the
page in the preview, **say so in the preview**, with the two doors out: the page it is on, or the
Workbench, in words that make clear which one has the app's real data. One selection, shared by all of
them. Nothing in the file format, the graph model or the renderer changes.

## 1. What a person has to hold in their head

A NodeGX app is three kinds of thing, and the editor has four surfaces that show them. Nobody is told
this, and the surfaces do not say which one they are.

| the thing | what it is | where you see it today |
|---|---|---|
| **A component** (a definition) | a recipe: a bit of screen plus the logic that drives it. Edited on the canvas. | the Components panel lists them; the canvas shows one at a time |
| **An instance** (a placed component, or a plain element) | a node inside *another* component's recipe. The nesting of visual instances *is* the DOM. | only on the canvas, as the indented stack; only in the preview, as pixels |
| **The app** | the Home component with everything it places, running, with a Router choosing pages | the preview |

And one more surface for one more question: **the workbench** shows one component running alone —
the component, not the app.

The learning curve is not that any one of these is hard. It is that the editor never says which one
you are looking at, and that the *one* tree it offers answers the question people ask second
("what do I have?") and not the one they ask first ("what is this screen made of, and where is the
thing I can see?").

### 1.1 The same idea in three vocabularies

This table is the whole teaching layer. Every audience already owns one row of it.

| | what you have | what this screen is made of | the recipe itself | the whole thing running | one part running alone |
|---|---|---|---|---|---|
| **React developer** | `src/components/` | React DevTools tree | the `.tsx` file (JSX + hooks in one place) | the app in the browser | Storybook |
| **Figma / Webflow / Framer** | Assets · Components | Layers · Navigator | — *(this is the part that is new to them)* | Preview | a component playground |
| **Someone new to all of it** | the parts bin | what is on the page | how a part is made | the finished thing | the workbench |
| **NodeGX, proposed** | **Components** panel | **Layers** panel | the **canvas** | the **preview** | the **Workbench** |

The React row is the honest one: the canvas *is* a `.tsx` file. Markup and the code that drives it,
side by side, in one place. That is why it looks like nothing a designer has seen and exactly like
what a React developer writes every day. The proposal does not hide that; it labels it.

## 2. What is actually wrong today — measured, not felt

Every row below is a reading of the code at HEAD, not an opinion about taste. File paths are under
`packages/noodl-editor/src/editor/src/`.

| # | finding | where | why it costs a user something |
|---|---|---|---|
| 1 | **There is no tree of what is on screen.** The DOM exists in the model (`NodeGraphNode.children[]`, `models/nodegraphmodel/NodeGraphNode.ts:57,156`) and the canvas paints it as an indented stack (`NodeGraphEditorNode.ts:403-412`, `childMargin = 20`), but no panel lists it. | canvas only | The first question a Figma/Webflow/browser-devtools person asks — "where is that thing I can see?" — has no home. Design-mode click in the preview is the only route, and it is one-way. |
| 2 | **A component and an instance are never named apart.** An instance is a node whose `type` is a `ComponentModel` (`SelectionActions.ts:167`). FIX-018 gave it a look (purple chip, diamond, stacked edge). No surface uses the word *instance*, and no row anywhere says *used 3×*. | canvas, panel | "I edited the header and it changed on every page" is the classic instance surprise, and nothing warned. |
| 3 | **The hinge "where is this used?" is hidden.** It lives in the X-Ray panel's *Used In* rows (`ComponentXRayPanel.tsx:142-160`) and the Topology map. The panel row has no count; the canvas has no *go to parent*. | X-Ray | You cannot get from a component to the screens it appears on without knowing a panel exists for that. |
| 4 | **The panel does not know where you are.** `selectedId` is panel-local and set only by clicks inside the panel (`hooks/useComponentsPanel.ts:237-267`); nothing listens to `activeComponentChanged`. Enter a component from the canvas, the trail, a tab or the bench, and the highlight stays on the row you clicked ten minutes ago. | panel | The one tree you have lies about the present. |
| 5 | **The trail is a folder path, not a containment path.** `OverlayViews.updateTitle()` splits `fullName` on `/` (`nodegrapheditor/OverlayViews.ts:483-503`); folder crumbs are inert. PAR-003 ruled it a breadcrumb, not tabs — correct, but it is the *wrong* breadcrumb for "how did I get here". | trail | After a double-click into `Hero` from `Home` the trail reads `Sections › Hero`. `Home` is gone. |
| 6 | **Pages are three things in three places.** The panel's *page* kind is "has a `Page` node" (`componentKind.ts:62,193`) and is Router-blind; the only page-management UI is the Router's `Pages` property editor (`propertyeditor/Pages/Pages.tsx`); the topbar route menu is a third list (`UseRoutes.ts`). A page no Router lists looks identical to one that is live. | panel, Router, topbar | "I made a page and it isn't in the app" has no visible cause. |
| 7 | **Sheets are a fourth axis nobody asked for.** A sheet is a top-level `#Name` folder that filters the tree (`useComponentsPanel.ts:109-190`); WFA-001 F30 recorded it silently mis-filing a new component. The one sheet that *means* something is `#__cloud__`, and it is not organisational — it is a runtime boundary (`types.ts:76-115`). | panel header | Folder, sheet, kind, router: four ways to group the same list, one of which is real. |
| 8 | **No "logic" kind, by design.** `componentKind.ts:46-55` refuses to call a component with no visual root *logic*, because it might be empty. Honest, but it means the panel cannot say "this is a utility", which is exactly the thing P85 says people should be able to find. | panel | The `Sanitise email` P85 wants findable is drawn with the same neutral glyph as an empty component. |
| 9 | **The workbench is two hidden doors and a chip that apologises.** Entry is the right-click *Show in workbench* (`ComponentItem.tsx:232`) or the scope chip's picker (`PreviewChrome.tsx:117-128`); no shortcut, no menu. After the initial jump it is decoupled from the canvas (`benchRequest.ts:27-41`) and a *Back to X* chip appears on divergence. FIX-019 ruled the word *workbench* stays on **one** string; the surface never calls itself that. BEN-007 §C, the disorientation test, is still open. | preview | A component with no instances is invisible in the app preview, and nothing tells you the surface that could show it exists. |
| 10 | **One word, four kinds.** *Components* panel; *component* node; *Create Page / Visual / Logic Component*; a *component-folder*. | everywhere | The user's fault-tolerant reading is "component = anything", which is the reading that makes the panel look like a folder view of nothing in particular. |
| 11 | **The preview and the canvas can show two different things with no sentence between them.** Click `Hero` in the panel while the preview is on `Pricing`: the canvas shows Hero's insides, the preview keeps showing a page that does not contain a Hero, and nothing says so. FIX-019 added a divergence chip for the *bench* case only. | preview | This is the foundational one. It has been true since the single app preview replaced the old component canvas, and it is the moment a new person concludes the two surfaces are unrelated. |

Row 4 is a defect on its own and should be fixed whatever else happens.

## 3. Three ways to go, and which one

**A. Polish only.** Restyle the panel to the P92 scale, add instance counts, fix row 4, section by
kind. Cheap, in-phase, and it leaves rows 1, 3, 5, 9 untouched. It makes the existing tree honest
without giving anyone the tree they came looking for.

**B. Two trees, explicit hinges, one selection — recommended.** Everything in §4. Keeps the canvas
as the one graph (the React row of the table), adds the missing tree beside the existing one scoped
to the page in the preview, names the two ideas apart, and has the preview *say* when it is not
showing what the canvas is editing, with the two doors out.
The graph model, the file format and the renderer are untouched; every new surface is derived from
data the editor already holds.

**C. Split design from logic** (the Bubble / Webflow model): Layers becomes *the* structure editor,
the canvas keeps only logic. It is the most familiar shape for a no-code audience and it is the one
that throws away the thing Richard called genius: one graph where a wire from a Text node's `text`
port to a Function is *visible*. Two editors that both own the same node is also the BCN-003 mistake
in a new coat. Recorded so nobody re-derives it; not proposed.

## 4. The design — option B, surface by surface

The mock shows all of this. Section numbers match its labels.

### 4.1 The left panel: two tabs, `Layers` and `Components`

One panel, two tabs, the Figma shape (Layers | Assets). Not two rail entries: the hinge actions in
§4.2 and §4.3 jump between the two trees, and a jump between tabs in one panel is a thing a person
can see happen; a jump between rail icons is not. The rail entry keeps the grid glyph and is titled
*Project*; its tooltip is the two-line explainer, "Layers — what is on screen in the component you
are editing. Components — every component in the project, placed or not."

Default tab: `Layers` when the canvas opens a page or a placed visual component; `Components` when it
opens a logic component or the project is empty. A keyboard toggle (⌘⇧L is free) flips them.

### 4.2 `Layers` — the DOM of the page in the preview (new)

**Scope is the whole point, and it is what stops Layers duplicating the canvas column.** The canvas
column (§4.4) shows *one component's* fragment, with its ports and wires — the recipe. Layers shows
*the page the preview is showing*, expanded **through** every instance down to the elements — the
result. Same glyphs, different question. When you are editing `Home`, the two look alike for one
level and then Layers keeps going into `Nav`, `Hero`, `Footer` where the canvas stops. When you are
editing `Hero`, the canvas shows Hero's five nodes and Layers shows Home with those five nodes lit up
*inside* the Hero band. That is the DOM view Richard asked for, and it is a thing the canvas cannot be.

- **Content:** the visual tree of the page in the preview, in render order, from
  `NodeGraphNode.children[]`, recursing into each instance's component. Same glyphs and category
  colours the canvas paints, so the two agree by construction (`componentKind.ts` already forbids a
  second palette).
- **Instance boundaries are drawn, not hidden.** An instance is a purple row with the diamond chip,
  followed by an indented band `inside Sections/Hero · Edit ›` and then its elements. Rows inside a
  band are one shade quieter than the page's own rows, because editing them edits *another*
  component's file — that is row 2's instance surprise, made visible instead of avoided. The `›`,
  double-click, or `Enter` on the instance row opens its component on the canvas.
- **The component on the canvas is highlighted as a region.** Whatever the canvas is editing, its
  fragment in Layers carries an `editing` tint and the band reads `editing Hero`. If the canvas is
  editing something that is *not* on this page, the header says so — `Hero isn't on Pricing` — with
  the same two doors the preview offers (§4.5).
- **Logic nodes are not in Layers.** They are not on screen. A one-line footer, "+ 14 logic nodes on
  the canvas", is a link that sets the canvas lane filter (§4.4) to `Logic`.
- **Selection is one thing, shared three ways.** Layers row ⇄ canvas node ⇄ preview element. Design
  mode already does preview → canvas; this adds canvas → preview (hover outline) and both → Layers.
  Behind it is one `selection` the three surfaces subscribe to, not three that message each other.
- **Drag to reorder or reparent** is `attachNode` / `detachNode` (`nodegrapheditor.ts:534-540`) with
  the canvas's own legality check (`ComponentModel.canCreateNode`). Dragging a row that is *inside* an
  instance band is refused with "this is part of Hero — edit Hero to change it", which is the rule
  Figma has for the same reason.
- **Header:** `Layers · Home` — the page in the preview — and the *containment* breadcrumb for the
  component on the canvas when it is on this page: `Home › Hero`. The crumb is computed by walking
  `findComponentUsages` upward, as `useTopologyGraph.ts:35-68` already does. This is the "go to
  parent" the canvas does not have. A component used in several places shows `Hero · in 3 places ▾`
  and the menu lists the parents.
- **Empty state, logic component on the canvas:** the header note reads "Format price is logic — it
  has no screen. *Watch it run on the Workbench*." Layers itself still shows the page. That sentence
  *is* the teaching.

### 4.3 `Components` — the tree of what you have (revised, not replaced)

- **Sections by role, folders inside them.** `Pages` (in Router order, start page marked, each with
  its route: `/`, `/about`), `Components` (has a visual root), `Logic` (does not), and `Cloud
  functions` (the `#__cloud__` runtime boundary, as today). The section is derived from the graph and
  the Router, not chosen; the user's folders live inside each section. A page with a `Page` node that
  no Router lists sits in `Pages` with a `not in a router` chip — today it is indistinguishable from a
  live page (row 6). That chip is a defect surface, which is what a panel is for.
- **The `Logic` section exists.** Row 8's honesty is kept by the empty case: a component with no
  nodes at all is `empty`, drawn dimmed in whichever section its folder is in, not called logic.
- **Row anatomy:** kind glyph · name · right-hand meta. The meta is the hinge: `×3` for a placed
  component, `unplaced` (dimmed) for one with no instances, the route for a page, the warning dot as
  now. `×3` is a button: it opens the *Used in* list (X-Ray's rows, moved to where the question is
  asked), and picking one switches the canvas to that parent, selects the instance, and flips the
  panel to `Layers` with that row highlighted. That round trip is the whole proposal in one gesture.
- **The highlight follows the canvas.** Row 4, fixed: subscribe to `activeComponentChanged`.
- **Sheets retire from the UI.** Existing `#Name` folders draw as ordinary top-level folders with
  the `#` stripped, as the panel already strips them; no name changes on disk, no migration. The
  sheet selector, *Move to…*, and *Add Sheet* go. `#__cloud__` keeps its section because it is a
  runtime, not a folder. (The WFA-001 hide-list machinery becomes unnecessary.)
- **Everything else stays:** click opens on the canvas, double-click renames, the `+` menu, the
  right-click menu (with *Open on the Workbench* promoted above *Make Home* and worded the same
  everywhere), drag onto the canvas places an instance. New and small: drag onto a `Layers` row places
  an instance at that spot in the tree.
- **Styling:** the P92 scale, the CHR-009 row geometry (one label column, 30px rows, drawn chevron),
  PNL-006's kind glyphs and indent guides kept.

### 4.4 The canvas: one graph, two lanes, drawn

Nothing in the model moves. Two paint changes and one filter:

- **The structure lane, drawn around the stack wherever it is.** The nested visual stack gets a
  faint halo — a rounded, dashed region in the canvas's `hierarchyLine` token with a small
  `STRUCTURE` eyebrow — fitted to the root visual node's bounding box, *wherever the user has put
  that node*. 🔴 The stack is **not** pinned to the left edge. Richard: *"Noodl people like putting
  the logic components a bit left right up down wherever around the visual stack with connector
  wires left and right."* Logic nodes stay free, on any side, and the wires reach the stack from
  either side as they do today. The lane is paint fitted to a box the painter already measures
  (`NodeGraphEditorNode.ts:522-525`); it moves when the stack moves. The MCP guidance's "visual tree
  down a left column" stays a *default* for auto-placed graphs, never a constraint on a person.
- **A lane filter on the trail:** `All · Structure · Logic`. Dims the other lane (never hides — a
  hidden node is the one a person cannot find, R8's rule). `Structure` is the "just show me the layout"
  view for the designer; `Logic` is the coder's view. Same graph, same file.
- **The instance node says what it is.** Beneath the name, the eyebrow FIX-018 wanted but did not
  add: `INSTANCE · Sections/Hero · used 3×`, and an `Edit ›` on hover that is the existing
  *Open component* context action given a visible door.
- **The trail becomes containment when you arrived through an instance:** `Home › Hero`, with
  `Home` live. When you arrived from the panel, it reads as today. One trail, always visible
  (LGC-008's ruling holds), two meanings that never collide because a crumb is either a parent or a
  folder and is drawn differently (parent = the instance chip, folder = plain text).

### 4.5 The preview says when it is not showing what you are editing

The first draft of this proposal switched the preview to the Workbench by itself whenever the canvas
opened an unplaced component. Richard's read: do not auto-transport people; the app preview is the
thing that keeps the focus on *"do they really fit together?"*, and it should stay put. Agreed. What
replaces it is a sentence.

- **The rule:** the app preview never changes what it shows because the canvas moved. Instead, when
  the component on the canvas is **not in the DOM of the page the preview is showing**, a one-line
  strip appears under the preview's caption. It is not a modal, it does not dim the page, and it goes
  away on its own when the two agree again.
- **The strip has three shapes, one per cause.** The words carry the distinction Richard named:
  which door shows the component *with the app's data*, and which shows it *with sample values*.
  - Placed, on another page: *"**Hero isn't on Pricing.** It's on **Home** → Go to Home · or see it
    on its own on the **Workbench** — with sample values, not the app's data."*
  - Placed nowhere: *"**Price Tag isn't on any page yet** — nothing in the app places it. See it on
    its own on the **Workbench**, or drag it into Layers to put it on this page."*
  - Logic: *"**Format price is logic** — it draws nothing. It runs on Home and Pricing. **Watch it
    run on the Workbench**: feed it inputs, read its outputs."*
  The "how would they know?" is answered by the strip naming the pages, from the same
  `findComponentUsages` walk Layers uses, filtered to pages a Router lists.
- **When the two agree**, nothing appears and the preview outlines the first instance of the
  component on the canvas (design-mode highlight), so "where is the thing I'm editing?" is answered
  without a word. When the canvas opens a *page* and the preview is on a different route, the strip's
  door is simply `Go to /work`.
- **The scope control** becomes a segmented `App | Workbench` with the target name in the Workbench
  segment — BEN R4's always-present way back, now readable as a mode rather than a chip. The strip's
  Workbench door is the same control, pre-aimed.
- **The surface calls itself the Workbench.** FIX-019 kept the word to one string by ruling; this
  proposes the sweep: caption "Workbench — Hero on its own, not the app. Sample values." If the ruling
  stands, the caption stays; the segmented control still carries the word.
- **Selection extends into the bench:** a click on an element in the benched component selects on the
  canvas and in Layers, exactly as design mode does in app mode.
- **Scenarios, frame sizes, inputs, outputs:** unchanged. BEN R1–R5 all hold — including R3, the app
  preview is never torn down, which is what makes the strip's `Go to Home` instant.

### 4.6 Vocabulary, and the three sentences that teach it

Five words, used the same way on every surface and in the docs:

| word | means | replaces |
|---|---|---|
| **Component** | a definition; what you edit on the canvas | "component" when it meant an instance |
| **Instance** | a component placed inside another; a row in Layers, a purple node on the canvas | "component node", "component" |
| **Page** | a component the Router shows, with a route | "page component" |
| **Layers** | the tree of what is on screen in the component you are editing | (new) |
| **Workbench** | one component running alone, not the app | "bench", "isolated component", "sandbox" |

*Home* stays. *Sheet* goes. *Folder* is a folder.

The teaching layer is not a tour; it is three sentences that appear where the question is asked:

1. Layers, empty: *"Nothing on screen. This component is logic only — open it on the Workbench."*
2. Components, first run: *"Components are the parts you have. Layers shows which of them are on the
   screen you are editing. The canvas is how one part is made."*
3. Workbench caption: *"Workbench — Hero on its own, not the app."*

Plus the §1.1 table, verbatim, as a page in the docs and as P73's tutorial step 2.

### 4.7 The board — every component on the Workbench at once

Richard: *"they had a kind of Figma style canvas preview of all the components spread out and you
could move around and zoom in and out on each one … Bringing that back isn't off the table, but they
might have got rid of it for a reason."*

The reason is knowable from what the bench had to solve. A component shown alone lies in three ways:
its inputs are `undefined` so it draws its empty state (BEN-001's whole premise); it has no parent so
it has no width to inherit (FIX-011); and it can read route params that do not exist. A canvas of
*forty* components alone is forty of those lies at once, and it competes with the app preview for the
title of "the real one" — which is the disorientation BEN R1–R5 exist to prevent. That is a good
reason to have retired it as *the* preview. It is not a reason to have no such view at all.

So: **the board is a view of the Workbench, not a third surface.** `App | Workbench` gains a third
target, *All components*: a grid of every visual component in the project, each drawn in its own
frame at its saved default size (`bench.frame`) with its first saved scenario's inputs
(`bench.scenarios[0]`), captioned with its name and `×N`. One export, one harness component whose
root is a grid `Group` holding one instance per component — `buildBenchExport` already splices a
harness with one instance; this is the same harness with N. Click a frame to bench that one component;
`⌘-scroll` zooms the frame. It is the Figma page of components, and it is honest about what it is
because it lives under the word Workbench and its caption says *sample values*.

What it is for: seeing the parts bin as pictures instead of a list; spotting the two buttons that
drifted apart; the design-system pass P85 keeps asking for. What it is not for: signing anything off.
The app preview stays the authority, exactly as Richard said: *"you've got the right idea with each
component, but do they really fit together?"* is a question only the app can answer.

A component with no scenario draws its empty state and says so in its caption (`no inputs set`),
which is the B31 rule: the bench is right both times.

## 5. Pros, cons and what this deliberately does not touch

**For.** The missing tree arrives, derived from data already in the model, and it is the page's DOM,
not the canvas again. Two hinges make definition ↔ instance a thing you can *do*, not a thing you
have to know. The canvas becomes legible as "DOM plus code" without a second editor. The preview
tells you when it is not showing what you are editing, and which door has the real data. The old
component canvas returns as a bench view without a third surface. Four organisational axes become
two (role, folder). Every audience finds its own row of the table.

**Against, honestly.**
- One more tree to keep in sync, and it recurses through instances. Mitigation: Layers is a view over
  `NodeGraphEditorNode.children` plus one hop per instance into its `ComponentModel`'s graph, on the
  same `Model.*` events the bench already subscribes to (`ComponentBench.tsx:219-234`). A page of
  forty instances is a few hundred rows; the tree virtualises.
- Expanding through instances means a click on a row inside a band selects a node in a component the
  canvas is not showing. Rule: it selects it in Layers and outlines it in the preview, and the canvas
  offers `Edit Hero` rather than silently switching. Silent switching is the disorientation.
- Deriving sections from the graph means a component's section can change under the user when they
  add a `Page` node. That is *correct* and mildly surprising; the row animates rather than teleports.
- Retiring sheets touches a feature with a spec (TASK-008). Nothing on disk changes; the `#` names
  survive as folders. Anyone using sheets as organisation loses nothing but the dropdown.
- Router-awareness is new panel work (`RouterAdapter.getPageInfoForComponents` exists).
- The board renders N components in one webview. N harness instances in one export is cheap; N
  scenarios' worth of sample data is not free, and a component whose scenario reads the network shim
  gets zero rows (FIX-013). The caption says so.
- The strip in the preview is one more thing in the preview, the surface BEN worked hardest to keep
  predictable. It is one line, it never blocks, and it is gated behind the disorientation test, which
  is BEN-007 §C, still open.

**Not touched:** the graph model, `project.json`, the canvas renderer, the exporter, the runtime,
the MCP. The anti-disorientation rules that matter (one preview surface; the bench never full-bleed;
the app preview never torn down; the app preview never moves because the canvas did) stand.

## 6. Order of work — dependency order, no estimates

1. **Honesty first, no new surface.** Row 4 (highlight follows the canvas); instance counts and
   `unplaced`; sections by role; pages with routes and the `not in a router` chip; the one word
   *Workbench* everywhere it is offered; *Open on the Workbench* promoted. All inside the existing
   panel, all in the P92 spirit, all gateable.
2. **The preview strip** (§4.5) and the segmented `App | Workbench` control. Drive it against the
   three causes; run BEN-007 §C on someone who did not build it.
3. **Layers v1** — the page's DOM through instances, select, enter, reorder — and the shared
   selection. Design mode's preview → canvas link is the seam to extend.
4. **The structure spine and the lane filter** on the canvas. Paint only.
5. **The containment breadcrumb** in the trail and the `×3` → *Used in* → Layers round trip.
6. **The board** (§4.7) as a third Workbench target.
7. **The teaching layer**: empty states, rail tooltip, docs page, the P73 step.

Each step ends the P92 way: a screenshot in `verdicts/`, both themes, and Richard's look.

## 7. Rulings needed, in plain words

| # | question | proposed |
|---|---|---|
| R-A | Is **Layers** the word? (alternatives: Structure, Navigator, Elements) | Layers — it is the word most people arrive with |
| R-B | Layers shows the page in the preview, expanded *through* instances, with the canvas's component lit as a region — not the canvas's own fragment again? | yes; that is what makes it a DOM view and not a duplicate of the canvas column |
| R-C | Retire sheets from the UI, keeping `#__cloud__` as the runtime section? | yes |
| R-D | The preview never moves because the canvas did; instead it shows the one-line strip with the two doors and the real-data / sample-values words? | yes (replaces the first draft's auto-Workbench) |
| R-E | One panel with two tabs, or two rail entries? | one panel, two tabs |
| R-F | Does the canvas lane filter dim or hide the other lane? | dim, never hide |
| R-G | Does the Workbench surface get to call itself the Workbench (reverses FIX-019's one-string ruling)? | yes |
| R-H | Is the `Logic` section allowed to exist, with `empty` as the honest exception? | yes |
| R-I | Does the old component canvas come back as **the board**, a third Workbench target, and never as a third preview surface? | yes, as §4.7 |
| R-J | ✅ **Ruled 2026-09-17.** The structure lane is drawn *around* the visual stack wherever the user put it; the stack is never pinned left and logic nodes stay free on every side | as ruled |

## 8. What this proposal is not

It is not a redesign of the canvas, and it is not a second editor. Everything above is a view or a
label over a model that is already right. The thing Richard called genius — a definitions tree that
is neither the file system nor the DOM — survives intact, with the one tree it was always missing put
next to it.
