# ISL-009 — A node can be named for a test and scrolled to

**Status:** 🔒→✅ ruled s4 (2026-10-02): **"Signal on every node"** — a Scroll into view signal on every visual node, page included (README §8). Not built. Scoped 2026-10-01 at `27d891bf3`
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

None yet.
