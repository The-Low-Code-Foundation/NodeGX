# ISL-009 — A node can be named for a test and scrolled to

**Status:** 🟢 s5 (2026-10-02): **ruling 2 built** ("Signal on every node") — `Scroll Into View` + `Scroll Align` on all 27 visual node types, Page included; driven on a deployed page at 1024 and 390 with its control (§8 s5). ✅ Ruling 1 asked in round 2 and ruled **"A data-* list"** (§5 1(b): name/value rows, `data-*` only, wirable, server-rendered) — not built. ⬜ The export half, ⬜ AC7 (the island uses it), ⬜ `kitAgreement`'s editor recording. Scoped 2026-10-01 at `27d891bf3`
**Source:** [audit F12](AUDIT-2026-10-01.md) · [P105 CG-003 line 114](../phase-105-the-coding-garden/CG-003-THE-PAGES.md) ("there is no `[data-owl-row]` attribute — a node cannot write one") · [CG-005 §8 hook 2](../phase-105-the-coding-garden/CG-005-OLIVE-IN-THE-GAME.md) line 166 · the island's `Logic/Find robots` page glue
**Side:** product (shared visual-node ports in `noodl-viewer-react`, the export, the door's vocabulary)

The garden's 18 drives find things on screen by CSS class: 499 `querySelector` and 299 `querySelectorAll` calls. That is
because a node cannot carry a `data-*` attribute, so classes do two jobs, styling and naming. When the island needed to bring
a card into view, a Function reached into the page with `document.querySelector('.bg-plot-card').scrollIntoView(…)`, because
no node can say "scroll me into view".

## 1. The person sentence

**An author gives a card a name for tests (`data-testid="plot-card"`) that no stylesheet uses, and wires a tap to "scroll the
card into view". The page scrolls so the card can be seen, with no script.**

## 2. What was measured

HEAD `27d891bf3`, 2026-10-01. Every row was re-read by this task's author at HEAD unless it says otherwise.

| reading | where |
|---|---|
| **No node writes an author-chosen attribute.** `grep` over `noodl-viewer-react/src` for `'data-`: the only writers are the runtime's own drag-and-drop (`data-ndl-*`), the box-model overlay and the transform-origin crosshair. There is no `id`, `testid`, `aria-*` or `role` port on any visual node, and no free attribute list. The audit marked this "I from grep"; it is now a grep at HEAD, still not a run | `drag-drop.ts:265-945`; `box-model-overlay.ts:561, 588`; `transform-origin-crosshair.ts:436, 459`; `grep -rn -i "testid\|htmlId\|aria\|role"` over `nodes`, `components`, `node-shared-port-definitions.ts`, `react-component-node.ts` → 0 author ports |
| Visual nodes do have `CSS Class` (`cssClassName`) and `CSS Style`, under *Advanced HTML*. The island sets `cssClassName` **200** times. Re-read and counted at HEAD | `react-component-node.ts:1141-1167`; `grep -rho '"cssClassName"' templates/bot-garden/components` |
| 🔴 **"There is no scroll-into-view" does not hold as written.** Group has a **Scroll To Element** action (`scrollToElement.do`, `.element` taking another node's DOM Element, `.duration`) and **Scroll To Index**. It refuses by name an element outside the Group (*"scrolling it would move a different container"*). Re-read at HEAD | [`group.ts:118-160`](../../../packages/noodl-viewer-react/src/nodes/visual/group.ts); [`Group.tsx:95-160`](../../../packages/noodl-viewer-react/src/components/visual/Group/Group.tsx) |
| **But it is hidden in the usual case.** Both actions appear only when `flexDirection != none AND scrollEnabled = true AND nativeScroll = false`. `nativeScroll` defaults to **true** and `scrollEnabled` to false. So a Group that scrolls the native way, which is the default, and the page itself (body scroll) offer no scroll-to. Re-read at HEAD | `group.ts:440-470` (dynamicports); `nativeScroll` default `true`, `scrollEnabled` default `false` |
| The island's need is exactly that case: `FIND_ROBOTS_SCRIPT` scrolls `.bg-plot-card` with `{ block: 'nearest' }` and the island's robots (`.gd-bot`, inside a **kit** node) with `inline: 'center'`, then restarts a CSS animation with `classList.remove`, `void box.offsetWidth` and `classList.add`. Re-read at HEAD | [`ig004Island.ts:545-570`](../../../packages/noodl-mcp/tests/ig004Island.ts) |
| The Router already calls `dom.scrollIntoView()` when body scroll is on (`scrollToTop`), so the runtime has a precedent for page-level scrolling. Re-read at HEAD | `router.tsx:420-430` |
| CG-005's hook 2 dropped `[data-owl-row]` for `.bg-owl-say` *"(a node cannot write one)"*, and the gate pins the class instead. Re-read at HEAD | CG-005 line 166; CG-003 line 114 |
| The drives' selectors across `scripts/devtools/drive-{cg,ig,iw}*.js` (18 files): 499 `querySelector(`, 299 `querySelectorAll(`, 170 distinct `.bg-*` / `.gd-*` class names, 25 `scrollIntoView` calls. Counted at HEAD | `grep -o` over the 18 drives |
| Inline `<svg>` and `Icon` (also in F12) are **not** this task's. `Icon`'s silent empty glyph is owned by P75 [FB-019](../phase-75-0.2.1-the-feedback/FB-019-THE-NUMBER-THAT-WAS-SECRETLY-AN-OBJECT.md) (`be2921a5`: an icon port warns instead of drawing an empty span), P78 D77 and P92 CHR-010. Cross-reference only | `cg007Look.ts:16-18` |

## 3. Where it bites a person

- Anyone writing an automated test for their app, or an agent driving it: every selector is a styling class, so a restyle
  breaks the tests, and a test-only class pollutes the stylesheet's namespace.
- Any long page or list where a tap should bring something into view: "jump to the form error", "show the new message", "the
  card you tapped is below". Today that is a Function touching `document`, which the exporter and server render cannot follow.
- The palette a phone shows is a small window on the island. Without scroll-to, a child taps a request and sees nothing change.

## 4. Related work and collisions

- **P41 [ACC-006](../phase-41-accessibility/README.md)** (specced): an *Accessibility* property group on every visual node
  (`Label`, `Description`, `Role`, `Hidden`, `Tab index`), *"one shared mixin, applied through the node-definition layer"*. An
  attribute port belongs in the **same** mixin and the same panel area. Build one mixin, not two.
- **P92 / P81 (look and variants):** a test name must not become a styling hook, or this task recreates the class problem.
- **ISL-008** (F11): classes stop fighting inline defaults there. This task stops classes being used as names.
- **ISL-021** (F28, `render_report` cannot tap or wait): a stable test name is what a richer render report would select by.
- **P18 export:** a new port needs a `coverage-ledger.json` treatment (it is a port on many types, not a new type). Record how
  `component.ts` emits it.
- **Icon:** FB-019 / D77 / CHR-010, cross-reference only (memory: "`Icon`=EMPTY SPAN").
- Owner grep: `grep -rln -i "data-testid\|data attribute\|data-\* attribute\|scroll into view\|scrollIntoView" dev-docs/tasks --include='*.md'`
  → P105/P106 (consumers), P75 FB-019 (Icon), P41 ACC-006 (the mixin). No owner for an attribute port or a page-level scroll-to.

## 5. Design — 🔒 rulings first

1. 🔒 **What attribute surface?**
   (a) **One `Test ID` port** on every visual node, written as `data-testid`.
   (b) **A `Data Attributes` list** (name/value rows) on every visual node, restricted to `data-*` names, values wirable.
   (c) **Free attributes** (any name). This collides with `aria-*`/`role` (ACC-006) and with event-handler attributes, which are
   a script-injection risk.
   *Recommendation: (b), in ACC-006's mixin.* It covers test names, state hooks for CSS (`[data-state="open"]`) and analytics in one
   port, and the `data-` prefix keeps it away from behaviour.
2. 🔒 **What scroll-into-view?**
   (a) **Lift the condition on Group's existing Scroll To Element** so it shows on native-scroll Groups too.
   (b) **A `Scroll Into View` signal on every visual node** (with Block/Inline alignment), which scrolls *this* node into view in
   whatever scrolls it (page, native Group, or iScroll Group via its API).
   (c) **A Utilities node** `Scroll Into View` taking an Element.
   *Recommendation: (b).* It is the shape the island needed (the card scrolls itself), it works for body scroll, and the target
   need not be inside the Group that owns the port. (a) still cannot scroll the page. (c) adds a wire for every use.
3. 🔒 **Restarting a CSS animation** (the `void offsetWidth` hack). Is it in scope? *Recommendation: no.* Record it as a named need
   for a later task, because it is a different capability.

Constraints: server render writes the attribute (it is static markup). Scrolling is client-only and silent on the server. A
scroll requested before mount is held until mount (Group's actions already do this with `withInnerComponent`). Inside a kit node,
the kit's own elements are out of reach. Say so, do not fake it.

## 6. Acceptance criteria (apply after the rulings are recorded in §8)

| AC | Clause |
|---|---|
| AC1 | **RED at HEAD, recorded in §8.** A spec walks the catalog for any visual-node input that writes an author-named DOM attribute, and any scroll action reachable on a default (native-scroll) Group or for the page. It finds none of the first. For the second, it finds Group's Scroll To Element only under `nativeScroll = false`. Known-firing control: the same walk finds `cssClassName` writing `class`. |
| AC2 | **The person sentence, in a browser.** A deployed page taller than the viewport: a card far down with `data-testid="plot-card"` (as ruled), a button at the top wired to the card's scroll-into-view. Before the tap, `elementFromPoint` at the card's centre is not the card. After it, it is. The drive selects the card by `[data-testid="plot-card"]` only, with no class. |
| AC3 | **Server render.** The attribute is in the server-rendered HTML before hydration. A scroll pressed during server render does nothing and logs nothing. |
| AC4 | **Native Group and iScroll Group.** The same press scrolls a card inside a native-scroll Group, and inside a `nativeScroll = false` Group (through iScroll, not `element.scrollIntoView`). Both are read with `elementFromPoint`. |
| AC5 | **Refusals by name.** A press on an unmounted node reports the ruled outcome (ERG-001 `Failure` with a code, or held until mount). A name outside `data-*` is refused at write time by the door with the rule. **Sabotage arm:** allow `onclick` as a name, and the spec goes red. |
| AC6 | **Catalog, picker, docs, export.** Shared-port docs, enrichment for the mixin, the door's vocabulary and the export (the attribute emitted in JSX; the scroll as a translated action, or deferred by name in the ledger notes). `catalog:check` is green, and the CHR-007 snapshot is updated with the reason. |
| AC7 | **The island uses it.** `FIND_ROBOTS_SCRIPT`'s card branch is replaced by the node action. At least the CG-005 owl-row hook moves to a `data-` name, and its drive reads it. The robots branch (inside the kit) stays, and the reason is written. Record the selector count change in the drives. |

## 7. Traps

- **A rect is not visibility** (memory: RECT≠VISIBLE). Grade AC2 with `elementFromPoint` and `el.contains(hit)`, after a wait for
  smooth scrolling to end, never with `getBoundingClientRect` alone.
- **`scrollIntoView` scrolls the nearest scrolling ancestor**, which may not be the one you meant (Group.tsx's own comment). A page
  with a nested scroller is the test that matters.
- **The Scroll To Element that exists is easy to miss:** it is hidden by a panel condition, not absent. A survey that reads only
  the panel says "no scroll-to". This task's first scoping nearly did.
- **A test name used by CSS is a class again.** The docs should say a `data-testid` is for tests, and the door could warn when a
  stylesheet selects one.

## 8. Session log

### Session 5 — 2026-10-02: ruling 2 built and driven

**What was asked and ruled.** Only §5 ruling 2 ("Should every visual node get its own 'Scroll into view' signal that
works anywhere, including on the page itself?" → *"Signal on every node"*). Ruling 1 (the attribute surface:
`data-testid` / a `data-*` list / free attributes) was **not** in the question, so it is not built and goes to round 2.
Ruling 3 (restarting a CSS animation) stays out, as recommended.

**As built** (`react-component-node.ts`, the shared inputs beside `cssClassName`, so every node made by
`createNodeFromReactComponent` has them — 27 catalog types including Page, Router and the controls):
- `scrollIntoView` (signal, group `Scroll Into View`) and `scrollIntoViewAlign` (enum Nearest edge / Start / Center / End,
  default Nearest edge).
- In a Group with Native Scroll off, the nearest such ancestor whose scroller contains the element is asked through its
  own `iScroll.scrollToElement` (Center centres; the rest align the start), and the Group itself is then brought into view
  with the browser's `scrollIntoView` (`nearest`), because it may be below the fold. Everywhere else: the browser's
  `scrollIntoView`, which moves every scrolling ancestor. `behavior: 'smooth'` unless `prefers-reduced-motion`.
- **Held until the element exists, not until the inner component's ref.** 🔴 The first build used `withInnerComponent`
  (Group's pattern). The deployed drive's fourth arm (the Page) did nothing and said nothing: `innerReactComponentRef` is
  set only by class components, and a Page — like every function component that reports its root through
  `setDOMElement` — never sets it, so the scroll queued for ever. Now: run at once if `getDOMElement()` answers, else one
  pending flag (presses coalesce), run from `setDOMElement` when the element arrives, with the wrapper's `componentDidMount`
  as the fallback.
- No `document` (server render): returns before anything, holds nothing, says nothing.
- A scroll that cannot run raises `visual/scroll-into-view-failed` on the failure channel. No outcome ports: the outcome
  contract needs them declared, and Done/Failure on 27 node types was not asked for.

**AC readings**

| AC | reading |
|---|---|
| AC1 | Not written as a spec. The catalog at HEAD had no `scrollIntoView` on any type (`catalog:check` regenerated: 27 types gained it, the same 27 that carry `cssClassName`). |
| AC2 | ✅ **On a deployed page, graded by `elementFromPoint`.** Project `isl009-scroll-into-view/` (this folder, hand-written, `validate:project` 0 errors, 8 endpoints) deployed with `nodegx deploy … --allow-development-engine` → exit 0; [`drive-isl009-scroll-into-view.js`](../../../scripts/devtools/drive-isl009-scroll-into-view.js) presses each button with a real mouse event (reachability checked first). **1024×768:** page card seen false → true (scrollY 0 → 1570); **390×844:** the same four arms all false → true. Console errors 0. **Control** (a copy whose bundle's call is replaced by `undefined`): every arm false → false, nothing moves (exit 0 in `--control` mode). Screenshot looked at (390, iScroll arm: the card at the window's foot). ⚠️ The card is selected by `cssClassName`, not `data-testid`: ruling 1 is not built. |
| AC3 | Half: the scroll half is a spec (no `document` → silent, nothing pending, no error). The attribute half waits on ruling 1. |
| AC4 | ✅ Native Group: seen false → true, the box's `scrollTop` 0 → 920. **iScroll Group: seen false → true through iScroll** — the scroller's transform `matrix3d(…, 0, -920, …)`, the box's own `scrollTop` stays 0, so it was not `element.scrollIntoView`. |
| AC5 | Held until mount: specced (two presses before the element → one scroll when it arrives, with `innerReactComponentRef` left unset). The `data-*` refusal waits on ruling 1. |
| AC6 | Catalog, enriched catalog (Group and Page enrichment lines), port groups, CHR-007 snapshot (+54 rows, exactly the two ports on 27 types: signal → no row class, enum → `EnumType`), FB-017's panel tier (`Scroll Into View` filed as plumbing beside `Scroll To Element`; Group 21 → 22 headings, basic unmoved at 10). ⬜ **Export:** not done — a peer has `nodegx-export` open (`plan.ts`, `component.ts`, `coverage-ledger.json` uncommitted). `hls001-catalog-cardinality` green. |
| AC7 | ⬜ Not started (the island's `FIND_ROBOTS_SCRIPT` card branch). |

**Specs:** [`tests/isl-009/`](../../../packages/noodl-viewer-react/tests/isl-009/) 5/5 — mutants: pending run removed from
`setDOMElement` → red; the `document` guard removed → red; both restored from a `cp`.

**What the new ports moved elsewhere, each attributed:**
- **GAM-019's "did you mean"** (`nonexistentPort.ts`): a Text Input's `startValue` was **24th of the 24** alternatives at
  HEAD; the two ports pushed it to 26th and D66's refusal stopped naming it (2 rows red in `gam-019/builtinPortDoor`).
  Fixed by rule, not by a bumped cap: ports whose heading the panel folds into Advanced CSS join the styling tier
  (`tierForGroup`, one list for both), and a value wire leads with value ports, as GAM-019's ruling has the suggestion do.
- **AWP-005's response ratchet** (`nodeDocBudget`): basket summary 7,919 → 8,115, ratchet moved 8,000 → 8,200 with the
  table in the spec. Full detail: `Group` 15,840 → 16,141 after the descriptions and Group's enrichment line were cut —
  under 16,200, not moved, 59 tokens left.
- 🔴 **`kitAgreement` is red (3 rows), and is not fixed:** its editor side is a **recording** of the running editor's
  node library (`noodl-editor/tests-unit/cn-003/fixtures/kit-app.editor-nodelibrary.json`, 2026-08-17), and kit nodes
  now carry the two shared ports on the MCP route only. Hand-editing a recording would forge it. Re-record with the
  editor (its `_recording.how` says how): next session.
- `noodl-preview/dist/nodegx-deploy.cjs` (gitignored) was **five weeks stale** (Sep 17): `nodegx deploy` refused the
  project with *"Group has no input named scrollIntoView"* until `node build.mjs` was run. The deploy bundle
  (`noodl-editor/src/external/deploy/noodl.deploy.js`, gitignored) was rebuilt from this change at 23:26 (the build the drive graded).

**Gates (2026-10-02):** editor `test:main` before the fixes: 567 suites, 8,821 passed, 7 failed — 5 of them this change
(CHR-007, FB-017 ×2, GAM-019 ×2), all green after (the 19 affected suites 346/346); `exp-013/exportBadge` (a peer's
ledger) and `hlt-021/viewerPort` (green when re-run) are not this change. `noodl-viewer-react` 127 suites / 1,671 green.
`noodl-mcp`, 50 catalog-reading specs: `nodeDocBudget` and `kitAgreement` this change (the first fixed, the second
above); `cmp001`, `cmp004Parts`, `cn004`, `fld013` on s4's HEAD-red list; `fld011` the reaper under load.

**Ruling 1, the same evening: "A data-* list"** (README §8 round 2). Build it next: AC2's drive then selects the card by
`[data-testid=…]`, and AC3's and AC5's attribute halves become runnable.
