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
| **where** | 🔴 **RULED 2026-09-18 (Richard): the LAST row of the preview column**, directly above the frame divider — *at the seam between the app and the node canvas*, not under the caption. The original "one line under the preview caption" is superseded; see §"Where the bar goes". 28px, `amber-bg` wash over an opaque base, no icon, dismissable with `×` for the session-pair (component, page). Never over the app |
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

---

## Driven — session 12 (2026-09-18)

Shots and readings in `verdicts/TVW-002/2026-09-18/` (🔴 PNGs gitignored, `.gitignore:265`;
`manifest.json` + `numbers.json` carry every measurement and every sentence). Fixture: a **copy** of
`Prefab marketplace`, 165 components, 11 routed pages.

✅ **Five shapes, five for five, verbatim against the prediction.** The sentences were written down
*before* the editor was launched, from the pure modules run offline over the project file, and the
running editor printed exactly those strings. That is the whole point of the pure split.

✅ **AC3 HELD across 7 canvas switches** — `webview.src` and `[data-preview-mode]` identical
before and after every one, and the canvas moved through the same `ComponentPanel.SwitchToComponent`
event the panel emits.

🔴 …and **the control is what makes that mean anything.** The first run reported AC3 HELD with
`known-firing navigation: false` — it looked for the `Go to` door *after* the loop had ended on an
`agree` component, so no door was on screen. Five HELD readings with nothing to tell them apart from
a drive that cannot move the preview at all. Fixed, re-run: pressing **Go to Design System** moved
the preview `/` → `/design-system` and the strip went to `agree`.

✅ **AC1's round trip.** *Open on the Workbench* → mode `app`→`bench`, caption *"Workbench — _DSI
Atoms on its own, not the app."*, and the app preview **kept its route** (R3). Scope chip →
*App preview* → back to `app`, same `src`, the same strip returned identically.

### 🔴 The defect the drive found, that no number could

The strip's amber is `--theme-color-notice-bg`, which is `rgba(…, 0.12)` — and the strip sits inside
`.Background`, whose backdrop is the preview **checkerboard**. The first shots show the checker
squares straight through the strip, in **both themes**.

Every geometry reading was clean: 28px tall, text 653/653 and 789/789, `scrollWidth === clientWidth`,
no truncation anywhere. **A translucency defect has no width.** Fixed with an opaque
`--theme-color-bg-2` base under the wash (both still tokens), and re-shot; the committed images are
after the fix.

### Still owed

- **AC1's outline-when-agreeing** — the first instance highlighted and labelled in the preview when
  the two surfaces agree. **Not built.** §2 puts it on the design-mode channel to the app client;
  §5 warns it must not go on `modelUpdate`, which is broadcast.
- **AC5** — see the section above: its premise is wrong and the fix is a build.
- **AC6** — Richard's WORTHY ruling, with the two questions in the section above.
- A **v2-format** project: the populations quoted throughout are measured on legacy `project.json`
  files, which is what the offline probe can read. The editor path is the same model either way, but
  that is reasoning, not a measurement.


---

## Where the bar goes — ruled 2026-09-18

§2 originally put the strip "one line under the preview caption … above the `<webview>`". Driven, it
was ~300px from the edge it is about. Richard, on seeing the shots:

> *"I wonder if it wouldn't be cognitively clearer if that bar was at the top of the node canvas, in
> between the node canvas and the preview, as a kind of visual separator before your eye confuses
> what's on the node canvas with the preview?"*

**Ruled: the last row of the preview column**, directly above the frame divider. A separator has to
be at the seam to be one, and the seam is where the eye slides from the running app onto the graph
with nothing marking the change — which is proposal §2 row 11 stated as a piece of geometry rather
than as a sentence.

**Why that side of the divider**, rather than the top of the node canvas as literally described —
three structural reasons, all of which would have had to be undone later:

1. the sentence is about what the **preview** is showing, and R4 keeps the way back on this surface;
2. the node graph frame is a **legacy non-React view**, so a row there is a different kind of change;
3. in the **detached** layout the node graph is the only thing in the editor window, so a strip at
   its top would describe a preview in another window — the AC5 problem, acquired for free.

⚠️ **The `vertical` layout (the lessons default) puts the two surfaces side by side**, so they meet
at a vertical edge and no horizontal row can sit in it. There the strip is simply the preview's last
row. Not solved, recorded: if it matters, it is a second placement rule, and it needs its own look.

The border moved with it — the rule is drawn on the **app** side, because that is the edge the row
separates you from; the frame divider already draws the other one.


---

## Session 13 (2026-09-18) — Richard's four rulings, built and driven

Commits `49eb2256f` (the quiet row + AC1), `1757f0bd6` (AC5), `0b46a67f0` (what the drive found).

### The rulings, asked and answered

| # | question | ruled |
|---|---|---|
| R-K | the wording of all five sentences | **"All five read right."** Shipped unchanged. |
| R-L | a component that lives only inside a **popup** (231 corpus cases) | **Keep the true sentence** — *"isn't on any page yet — it's only inside X, which no page shows."* The built wording was already the option he picked; no change. |
| R-M | the **detached** preview: doors, or the sentence only? | **Carry the doors too.** *No surface that explains less than another.* |
| R-N | the row only appeared on divergence, so the seam he had asked for vanished in the common case | **Always draw the bar, with a quiet agree sentence.** |

R-N is the one worth remembering. **His own placement ruling four hours earlier had retired the
"no strip when they agree" spec without anyone noticing.** A row that is a separator cannot come and
going; `tvw002-agree-no-strip-light.png` showed the app's hero image abutting the canvas's dotted
grid with nothing between them. His stated reason applied to both cases; the row applied to one.

So `agree` is now a **tone**, not an absence. Three quiet sentences, because "they agree" is three
different facts, and **none of them claims the person can see it** (a component can be on the page
and scrolled past, inside a closed accordion, or behind a popup — the row is entitled to a claim
about the *screen*). A dismissal removes the **sentence**, not the **seam**.

### What the drive found that no number did

🔴 **The AC1 outline pointed at a node that cannot be drawn, and the count said 1.**

    placement id  →  found 1,  getRef ✅,  getDOMElement **absent**
    painting  id  →  found 1,  getRef ✅,  getDOMElement → DIV 973×72

`getRef` is only the highlighter's *existence filter*; the element comes from `getDOMElement()` in
`updateHighlights`. A component instance passes the filter, enters `selectedNodes` — so
`selectedNodes.size` reads a healthy **1** — and then yields no element. **A count-based arm would
have reported AC1 green over an outline nobody could see.** The arm reads the measured rect now.

⚠️ I nearly shipped the wrong *explanation* for it. First theory: "the `getRef` filter drops
instances." That fits, and is false — the instance passes `getRef`. Only asking the guest for both
ids side by side separated the two. See [[a-reading-that-fits-is-not-one-that-excludes]].

🔴 **The outline dragged the box-model inspector chip over the running app** — five lines of CSS
facts over the hero, because the author changed which component the canvas was on. Every geometry
reading was clean; the **screenshot** is what showed it. It is the exact thing
`Highlighter.designMode`'s own comment says its gate exists to prevent, and the cause is that §2
specified this outline travel down the design-mode **selection** channel. The placement outline is
now its own thing end to end (`placedNodes`, `showPlacement`, `viewer-placement-outline`), drawing
the same teal line and nothing else. It is a graded arm.

🔴 **The drive was not idempotent** — it *ends* by pressing a `Go to` door, so it left the preview on
another page. Run again it read five different sentences, one fewer agree row, no outline and "no
`Go to` door was on screen": every one a correct answer about the wrong screen, nothing broken. It
resets first now and exits 2 if the reset did not take. Two consecutive runs then compare identical.

⚠️ **Two instrument faults of mine, both of which looked like defects.** AC1's first drive read
NOTHING because the editor was in **Preview** mode, where no outline is pushed at all by design. And
the chip arm's first version asked whether the chip *element* was in the DOM — it always is, sized to
nothing — so it reported the defect on all seven rows, four of which never had an outline. **An arm
that fires everywhere is not measuring its subject.**

🔴 **A `MenuDialog` keeps a measuring ghost**, one row above the real rows. A probe that collected
rows by text and deduped kept the ghost, so every rect was 29px off and `elementFromPoint` reported
the row *above* the one it had matched — which reads exactly like an animation that has not settled.
The only reading that cannot be fooled is what the compositor says is under a pixel; the detach probe
scans `elementFromPoint` down a column.

### Gates at s13

- `npx jest tests-unit/tvw-002` — **4 suites / 62** (was 3 / 40).
- `npx jest` in `noodl-viewer-react` — **122 suites / 1627**, the highlighter's own neighbourhood.
- `tsc --noEmit` EXIT=0 on `noodl-editor` and on `noodl-viewer-react`.
- **7 mutants**, each `cmp`-proven to have applied. Six red first time; the seventh **survived** —
  `pushed ?? local` inline in the JSX was completely ungraded — which is why `stripToRender` exists
  as a function at all. Red now.
- Drive: both themes, exit status **0** (read directly, not through a pipe — a pipe eats it).
- `npm run test:ci` — **2985 / 8, seed 57873, HEAD `bf1c17c0`**, the floor BY NAME. ⚠️ A **stale
  `test-results.json` from an earlier run was still on disk** and would have read as a pass; deleted
  first and the mtime checked on what came back.

### AC status

| AC | state |
|---|---|
| 1 | ✅ built and driven, **including the outline**, which had never been built |
| 2 | ✅ |
| 3 | ✅ HELD across 7 canvas switches per run, both themes, control firing in each |
| 4 | ✅ |
| 5 | ✅ **driven in the detached window**: four shapes, `data-detached=true`, and `Go to Design System` pressed *there* moved the preview and returned the correct new quiet sentence — three processes in the loop |
| 6 | ✅ **all three findings RULED and built** (theme fixed, placement kept, doors stacked). Richard's look at `verdicts/TVW-002/2026-09-18-s13/` is the last word. |
| 7 | ✅ **`test:ci` at the floor, re-run after AC6's changes** — 2985 specs, 8 failures, seed 24947, HEAD `3c498b0e`, fresh JSON. The same eight **by name**: 3 SUB-011, 3 SUB-006, 2 NDA-017. None mine. A **seventh** agreeing seed. |

### AC6 — Richard's three rulings, built and re-driven (2026-09-18)

1. **The detached window's theme: *"just fix it."*** `ThemeManager` now sends the **resolved** theme
   beside the native-theme send it already made; `main.js` forwards it and seeds it on
   `did-finish-load`. 🔴 **Graded as a TRANSITION, both ways** — reading *"it says dark"* while the
   editor is dark grades nothing, because the broken build (attribute never set, window falls back
   to the dark `:root` defaults) reads identically. Driven light→dark→light: the attribute follows
   **and so do the strip's painted colours** (two distinct backgrounds), which is the consequence
   rather than the mechanism.
2. **The bottom placement in the detached window: *"that's ok."*** Left as built.
3. **The truncation — and I had described it wrongly.** I told him it "truncates by 25px". That was
   the **quiet** row, which has no doors. The **notice** row kept **96px of the 266 it needed
   (36%)** — `_DSI Atoms isn'…` — while the two doors kept **277px of the 372px window**. The same
   shape as the Workbench caption he ruled on the day before. Re-asked with the real number; he
   ruled **the doors stack under the sentence**. Built with `flex-wrap`, not a container query —
   the trigger is *"these items do not fit"*, which is the question flex already answers, so there
   is no breakpoint to pick and a narrow **docked** panel is covered for free.
   **Re-driven: 352 of 352px, nothing truncated.** Docked geometry holds — quiet rows 28px, notice
   rows 29px (the row gained 4px of block padding so it *can* become two).

🔴 **A gap found by accident while driving that fix: the strip was pushed on CHANGE and never
seeded when the window opens.** A freshly loaded detached window had no strip at all until the next
canvas switch — and the wordless seam is a legitimate state, so that looks exactly like working.
AC5's own drive missed it because the drive switches component immediately after detaching, which
pushes. Fixed by having the window **ask** (`StripAction {kind:'ready'}`) rather than the editor
guessing when to seed: the window cannot ask before it exists, so it is ordered by construction,
and it covers a reload as well as an open.

⚠️ **Instrument note: do not `Page.reload` the detached viewer window.** Its `index.html`
document-writes its bundle, so a reload leaves it at `readyState: 'interactive'` with an empty body
and no strip — which reads as a defect in the strip. Re-detach through the layout menu instead;
that is also the path a person takes.

### For Richard, with the shots (AC6) — SUPERSEDED, all three ruled above

1. **The detached preview is stuck on the dark theme.** Measured: `data-theme` is `null` in that
   window. `ThemeManager` stamps it on the editor renderer only, and its `backgroundColor` is
   hard-coded `#131313`. **Pre-existing — the strip inherits it, it does not cause it.** The fix is a
   theme push on the forward list the strip's own channel now uses, i.e. cheap, but it is a change to
   the *window*, not to this task. Worth a ruling on whether it belongs to P93 at all.
2. **In the detached window the row sits at the bottom, where there is no node canvas below it.**
   The seam it was moved to marks the boundary with the graph — and in that window there is no
   graph. It is simply the preview's last row there, the same situation as the `vertical` layout.
3. **The quiet sentence truncates in the detached window at its default width** (377px needed,
   352 available — by 25px). The ellipsis is AC7's ruled shrink behaviour working correctly, but the
   detached window opens narrow, so it is the common case there rather than the squeezed one.
