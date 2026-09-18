# TVW-002 — The preview says what it is not showing

The foundational misunderstanding, given a sentence. Proposal §2 row 11 and §4.5.

## 1. The person sentence

**Someone who clicks `Hero` while the preview is on `Pricing` reads, in the preview, that Hero isn't
on Pricing, that it is on Home, and that the Workbench would show it on its own with sample values —
and the preview has not moved.**

## 2. The spec

| element | detail |
|---|---|
| **the rule** | The app preview never changes route or mode because the canvas moved. Not in this task, not in any. The only things that move the preview are the route pill, a `Navigate` in the running app, and the person pressing a door |
| **when the strip shows** | the component on the canvas (`nodegrapheditor.activeComponent`) is not in the DOM of the page the preview is showing. "In the DOM" = the page component, or reachable from it by walking `NodeGraphNode.children[]` through instances (`ComponentModel` types) — the same walk TVW-004 draws. The page the preview is showing is the route's component (`UseRoutes.ts`, `EditorDocument.tsx:199-204 onRouteChanged`) |
| **where** | one line under the preview caption, inside `VisualCanvas.tsx`'s stage column, above the `<webview>`; never over it. 28px, `amber-bg` wash, no icon, dismissable with `×` for the session-pair (component, page) |
| **shape 1 — on another page** | `**Hero isn't on Pricing.** It's on **Home** → Go to Home · or see it on its own on the **Workbench** — with sample values, not the app's data.` Pages listed are those a Router lists (`RouterAdapter.getPageInfoForComponents`) that contain an instance, from the `findComponentUsages` walk (`TopologyMapPanel/hooks/useTopologyGraph.ts:35-68`). More than three pages: the first three and `+N` |
| **shape 2 — on no page** | `**Price Tag isn't on any page yet** — nothing in the app places it. See it on its own on the **Workbench**, or drag it into Layers to put it on this page.` (before TVW-004 ships, the second door reads "or drag it onto a page's canvas") |
| **shape 3 — logic** | `**Format price is logic** — it draws nothing. It runs on Home and Pricing. **Watch it run on the Workbench**: feed it inputs, read its outputs.` |
| **when they agree** | no strip. The first instance of the canvas's component on the page is outlined in the preview with the design-mode highlight and its label (`Hero · instance`), on the same channel design mode already uses for click-to-select. When the canvas shows the page itself, nothing is outlined |
| **canvas on a different page** | the strip's door is `Go to /work` |
| **`Go to Home`** | `canvasView.setCurrentRoute` + the `viewer-set-route` IPC (`EditorDocument.tsx:199-204`); instant, because the app preview is never unmounted (BEN R3, `VisualCanvas.tsx:419`) |
| **the scope control** | `PreviewScopeControl` (`PreviewChrome.tsx:56`) becomes a segmented `App \| Workbench` (`Workbench · <name>` when active); the picker listbox (`:130-177`) opens from the Workbench segment. TVW-008 adds the third segment. The strip's Workbench door calls `choose({mode:'bench', target})` (`:100`) with the canvas's component |
| **FIX-019's chip** | the `Back to X` divergence chip (`VisualCanvas.tsx:371-387`, `previewScope.ts:283`) stays for the bench case it was built for; it does not appear while the strip's shape 1–3 is showing, because the strip already says where you are |

## 3. Scope

In: the strip, its three shapes, the dismissal, the outline-when-agreeing, the segmented control,
both themes, the detached-preview layout (`benchRequest.ts:78-90` parks; the strip must render in
the detached window too, reading `activeCanvasComponentName()` `:67-69`).

Out: Layers (the strip's second door in shape 2 changes wording when TVW-004 lands). The board
(TVW-008). Any change to the harness, inputs, outputs, scenarios or frame. The vocabulary sweep
(TVW-001 does it; this task uses the swept words).

## 4. Acceptance criteria

1. **(person)** Corpus project, preview on `/`. Navigate the preview to `/pricing` with the route
   pill. Click `Hero` in the Components panel. The preview still shows Pricing; the strip reads
   shape 1 naming Home. Press `Go to Home`: the preview shows `/` with the Hero outlined and labelled,
   and the strip is gone. Press the Workbench door instead (from Pricing again): the preview shows
   Hero on the bench with the caption; press `App`: Pricing is still there, unmoved.
2. Click `Price Tag` (unplaced): shape 2. Click `Format price`: shape 3 naming its pages. Click
   `Home`: no strip; nothing outlined. Click `Work` while the preview is on `/`: the door reads
   `Go to /work`.
3. **The negative arm.** A spec that drives every navigation in AC1–2 asserts the preview's route
   and mode **did not change** on any canvas move — the `webview.src` and `scope.mode` before and
   after each `switchToComponent` are identical. This is the phase's standing rule as a gate.
4. Shape 1's page list equals the set of Router-listed pages whose DOM walk reaches an instance —
   assert against an independent walk, on a project where a component is placed on a page that no
   Router lists (that page must **not** be offered).
5. Detached preview: the same strip renders in the detached window for the same three cases.
6. Screenshots in `verdicts/TVW-002/<date>/`: three shapes, the agree case with the outline, both
   themes, docked and detached. **Richard rules WORTHY.**
7. `test:ci` at the floor.

## 5. Landmines

- `benchRequest.ts:27-41` documents why the bench is decoupled from the canvas after the initial
  jump: `VisualCanvas` remounts on layout changes and would yank the canvas back. The strip reads the
  canvas; it never writes it. Keep that direction.
- `modelUpdate` is broadcast; the outline-when-agreeing must go on the design-mode channel to the
  app client, not on a `modelUpdate`.
- The DOM walk through instances can recurse (a component that places itself, illegal but
  representable). Cap depth and mark the cycle; do not hang the strip.
- "The page the preview is showing" is not always a page: a Component Stack proxy path
  (`UseRoutes.ts:63-86`) resolves to a stack's current component. Resolve it, or say
  `isn't on this screen` and offer the doors without a page name.

## ⚠️ Wording in this task that AC7 has already ruled against (added s11, 2026-09-18)

🔴 **"sample values" / "not the app's data" must not be used on this surface as written.** Richard
ruled on 2026-09-18 (TVW-001 AC7) that the word *sample* was doing two jobs at once on the Workbench:
the caption said **"Sample values."** (synthesised *input port* values) while the bench summary, ~44px
below it, said **"No sample data"** (`sandboxData.ts:580`, about *backend records*) — in the
empty-data branch that every project without a backend shows. The caption's claim was **cut**; the
summary line now owns the data story alone.

This task's strings were written before that ruling and still carry the retired phrasing. Rewrite
them when you build it: say the data thing **once**, in **one** vocabulary, and check what renders
*beside* your string, not just the string. Otherwise this re-opens the exact defect AC7 closed.

See TVW-001 §"AC7 — Richard's rulings, built and re-driven", and
`a-pinned-string-is-blind-to-its-neighbour`.

---

## Built — session 12 (2026-09-18). UNDRIVEN.

Three commits: `038cd2288` (the walk and the words), `2ad10f7ec` (route resolution, the hook, the
row), `9566ed145` (shape 2's sentence, corrected by measurement).

**Gates:** `npx jest tests-unit/tvw-002` — 3 suites / 40. `tsc -p packages/noodl-editor --noEmit`
EXIT=0. Three mutants on the walk, each `cmp`-proven to have applied, each red with a real count.
Tokens only, no hex.

| module | what it is | pure? |
|---|---|---|
| `pageReach.ts` | the walk: `renders` (what you can see) and `mounts` (what runs), from one pass | ✅ graded |
| `previewStripWords.ts` | the three shapes and every word in them | ✅ graded |
| `screenRoute.ts` | the preview's route → the page component it is showing | ✅ graded |
| `usePreviewStrip.ts` | subscriptions, the project walk, the one navigation | plumbing |
| `VisualCanvas.tsx` / `.module.scss` | the 28px row above `.Stages`, its doors and its `×` | view |

### 🔴 Three things the measurements changed, all before the drive

1. **"In the DOM" is not "in the graph."** `componentinstance.render()` returns
   `roots[0].render()` and nothing else, so a component placed as a *second* visual root is
   instantiated and never attached. Over the 130 projects on this machine: 525 page components hold
   1504 instances, **592 outside the page's `Page` root** — 521 with no visual root (shape 3's
   population) and **71 that do draw**. A containment test on graph membership would have sent 71
   people to look at a page for something that is not on it.
2. **A screen is not one component.** The walk starts at the **root** component and resolves a
   Router to the page being shown, or an app shell's nav bar — on every page, named by none of them
   — would get a strip saying it is somewhere else while the person looks straight at it.
3. **Shape 2's specced sentence was false for 1094 components.** *"Nothing in the app places it"*,
   run over the 57 projects with two or more routed pages, would have been printed over 1094
   components that **are** placed, inside something no page reaches (231 inside a popup, 863 inside
   components as dead as they are). Shape 2 now has two sentences, and the second names the host:
   *"— it's only inside Cards big popup, which no page shows."*

### Departures from §2's table, and why

All three are downstream of TVW-001 AC7's rulings; none is a matter of taste.

- **The strip does not describe the Workbench.** §2 said *"with sample values, not the app's data"*.
  That phrasing was cut from the Workbench on 2026-09-18 for colliding with the bench summary's
  "No sample data". The strip names the Workbench and points at it; the Workbench says what it is
  when you arrive.
- **Every door names a page, never a URL.** §2 has `Go to Home` and `Go to /work` in one table.
  `authoredPageUrl` settled which way that resolves — a page whose `urlPath` was never set has no
  path to put in a door at all.
- **One door label for all three shapes** (`Open on the Workbench`, the panel's own menu row) rather
  than a second verb for logic. What the bench does with logic is in the sentence.

### For Richard, when it is driven

1. **The wording of all three shapes** — they are rewritten from §2 for the reasons above.
2. **A question with 231 real cases behind it.** A component that only ever appears inside a
   **popup** is not on any page: a popup is opened by a `Show Popup` node, not placed, so no walk
   from a Router reaches it. Right now it gets shape 2's second sentence (*"only inside X, which no
   page shows"*), which is true. The alternative is to say it is on the page that opens the popup —
   but shape 1's door would then navigate somewhere the component still is not visible, which is a
   new lie in place of the old one. **Left as the true sentence; worth a ruling.**

### Next

AC1, AC2 and AC6 need the drive; AC3 is instrumented in it. **AC5 needs a build first — see
below.** The fixture is picked by
measurement, not by guess: **`Noodl projects/Prefab marketplace`** (165 components, 11 routed
pages) produces all four shapes, with these exact sentences —

- shape 1 `/#Noodl Component System/__DESIGN SYSTEM INTERNALS/_DSI Atoms` → *"_DSI Atoms isn't on
  Home. It's on Design System."*
- shape 2 (nothing places it) `…/Atoms/Avatar/User Avatar Skeleton`
- shape 2 (placed, unreached) `…/Atoms/Checkbox/Save button` → *"— it's only inside Package Hero
  section, which no page shows."*
- shape 3 `/#Integrations/Check if user is logged in` → *"It runs on My Packages and Account."*
- agree `/#Integrations/Algolia/Algolia Search`

Drive with `scripts/devtools/drive-tvw002-strip.js --components "…"`, which asserts AC3's
before/after pair around **every** canvas switch and ends on a known-firing navigation — without
that control, "the preview did not move" cannot be told apart from "this drive cannot move it".

⚠️ **Drive a COPY.** ⚠️ The probe that picked the fixture reads legacy `project.json` files only, so
the populations above are measured on legacy projects; a v2 project goes through the same model and
is worth one look in the drive.

### 🔴 AC5's premise is wrong, and the correction is a build, not a drive

§3 says the strip "must render in the detached window too, reading `activeCanvasComponentName()`
`:67-69`". Measured, that is the one function that cannot work there — and `benchRequest.ts` says so
in its own doc comment, four lines further down than the citation.

What is actually true:

- the detached preview is a **separate `BrowserWindow`** (`main.js:551`, `FloatingWindow`) loading
  `src/frames/viewer-frame/index.html`, a different renderer;
- that renderer **does** build a `CanvasView`, so `VisualCanvas` — and therefore the strip's host —
  really is rendered there. §3's instinct was right;
- but it has **no node graph and no project**: `NodeGraphContextTmp.nodeGraph` is `null` and
  `ProjectModel.instance` is not that window's. So `usePreviewStrip` correctly computes *nothing*
  there, and the strip is absent rather than wrong. ✅ No crash — `NodeLibrary.instance` is a static
  initialiser, so the subscriptions are safe in that renderer.

**The buildable shape, with a precedent already in the tree.** DES-001's design-mode toast has this
exact problem and solves it: the editor window owns the project model, resolves the click to a
label, and pushes it with `viewer-design-selection`, which `viewer.js:74` renders. The strip is the
same shape — the editor computes the `StripModel` (the hook already does) and pushes it on a
`viewer-preview-strip` channel added to `forwardIpcEvents` (`main.js:1080`).

⚠️ **The doors are the part that is not free.** A toast is one-way; the strip has two buttons. A
click in the viewer renderer has to travel back — `viewer.js` already sends upward
(`viewer-navigation-state`), so the channel exists, but it is a third process in the loop and
nothing about it can be graded without a drive.

**For Richard, with the other two questions:** in the detached preview, should the strip carry its
doors, or say the sentence only? The detached window is deliberately close to "just the app", and
two editor buttons on it is a different promise from a line of explanation.
