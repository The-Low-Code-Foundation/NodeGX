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
