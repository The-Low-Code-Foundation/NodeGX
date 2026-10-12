# ISL-009 — A node can be named for a test and scrolled to

**Status:** 🟢 s6 (2026-10-03): **both rulings built.** ruling 1 ("A data-* list"): a `Data Attributes` list on every visual node but Drag, each listed `data-*` name an input of that name, typed or wired, in the markup; the door refuses a name outside `data-*` with the rule; the deployed drive now finds every element by `[data-testid]` only, 4/4 at 1024 and 390 with its control (§8 s6). ruling 2 (s5): `Scroll Into View` on all 27. ⬜ The export half (P18 s101's §76 pile in `component.ts`, still uncommitted on 2026-10-03), ✅ AC7 (s7: the island uses it). `kitAgreement` re-recorded (s6). Scoped 2026-10-01 at `27d891bf3`
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
| AC7 | ✅ s7 — see §8 s7: the plot card scrolls itself (`iwFound.ontrue → iwCard.scrollIntoView`; the 80 ms Timer and `FIND_ROBOTS_SCRIPT`'s card branch gone), driven with a control; the owl row is `data-testid` `owl-row`/`owl-say` and the CG-005 drive reads it. |

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

### Session 6 — 2026-10-03: ruling 1 built ("A data-* list") and driven

**As built.** Read P41 first: ACC-006's mixin does not exist, so the list sits beside `cssClassName` in
`react-component-node.ts`'s shared inputs, like s5's scroll ports.

- **The rule is data, declared once.** `DATA_ATTRIBUTES_RULE`, a `namedports/derived` entry in every visual node's
  `dynamicports`: parameter `dataAttributes` (a stringlist), port template `{{*}}` (the port is named exactly as the
  attribute), type string, group `Data Attributes`, and `accept: { pattern: '^data-[a-z0-9][a-z0-9._-]*$', rule, example }`.
  The runtime, the catalog, the editor and the door all read that one entry.
- 🔴 **Why a new rule name and not WFA-009's `namedports/list`:** a `list` rule is pushed by `NamedPortsAdapter`
  through `setDynamicPorts`, which REPLACES a node's dynamic ports. Page Stack, Router (runtime) and Text Input /
  Options (runtime-narrowed) already have a writer there, so two writers would erase each other on every parameter
  change (the trap `CloudDynamicPortsAdapter.ts:22` records). A `derived` rule is read by `NodeGraphNode.getPorts()` on
  read (`dynamicPortRules.derivedPortsForNode`), so it competes with nothing.
- 🔴 **Why the runtime claim is per instance:** the catalog generator calls any type with a `registerInputIfNeeded`
  method `runtime-discovered`, and that switches off GAM-019's unknown-port and unknown-parameter checks. These ports
  are declared, so `claimDataAttributeInputs` chains onto the instance in `initialize`, and the catalog records
  `declared-port-groups`. Measured: no visual type gained `runtime-discovered`.
- **Runtime.** A listed name with no value is written empty; a value for an unlisted name is not written; taking a
  name off the list takes it off the element; a name outside `data-*` is never claimed. The values go through
  `props.dom`, and every built-in root that did not spread it now spreads its `data-*` keys (`dataAttributeProps`,
  beside `noodlRootRef`): 13 current types and 9 deprecated controls. A control whose label wrapper also takes the
  root ref carries the attribute once, on the wrapper. **Drag offers no list** (`noDataAttributes`): it has no element
  of its own; it moves its child.
- **Kit nodes** inherit the rule, and a kit component need not spread `props.dom`, so the runtime also writes the
  listed attributes onto the element the node reports (`syncDataAttributesOnElement`), removing only names it set
  itself. That path is client-only: a kit node's attribute is not in server HTML.
- **Validator / door.** `CatalogIndex.derivedPortNames` and `refusedDerivedNames` read the rule from the catalog's
  `declaredPortGroups`. `nonexistentPort` accepts a wire to a listed name (step 2b); `parameterValues` accepts a value
  for one; a list entry the rule refuses is an `invalid-parameter-value` **error** naming the rule (it blocks the
  door). Existing code, not a new one (the `layoutString` grammar precedent).
- **Catalog.** `derive-encoding.withDerivedRules` writes the `<name>` pattern; 🔴 the seeder no longer seeds a
  derived list: seeding it drove Page's setup as if it read the list, and turned Page's true `known: false` into a
  false `known: true` (caught in the diff and fixed before commit). Four types newly dynamic (Checkbox, Radio Button,
  Range, Columns) got a `runtimeBehavior`. `nodegx-kit-catalog` keeps a derived entry verbatim and declared: 🔴 read as a
  `port` entry, it had made every kit visual node `runtime-discovered`, and CN-010's port checks on kit nodes stopped
  (its AC3 went red — found by running the catalog readers, fixed, now green). A kit node whose only dynamism is
  declared gets a `known: true` encoding.

**AC readings**

| AC | reading |
|---|---|
| AC2 | ✅ **Selected by `[data-testid]` only.** The project carries no `cssClassName` at all (all ten replaced by `data-testid`), and the iScroll card's name arrives **over a wire** from an Expression. Redeployed with both bundles rebuilt from this change (`noodl.deploy.js` and `nodegx-deploy.cjs` 09:00), `nodegx deploy` exit 0. Drive: all ten names found on the page, 0 `isl009-` classes (the drive fails otherwise). **1024×768** 4/4 unseen → seen (page scrollY 0 → 1570; native box `scrollTop` 920; iScroll `matrix3d(… -920 …)`); **390×844** 4/4; console errors 0; **control** 4/4 unmoved. Screenshot looked at (390, iScroll arm: the card at the window's foot). |
| AC3 | ✅ **By spec, through the server-render path:** `renderToStaticMarkup(node.render())` in jest's plain `node` environment (no `document`) shows the attribute on Text, Button, Checkbox (with and without label), Text Input (both), Icon, Columns and the deprecated Label. ⚠️ `nodegx deploy` does not prerender, and the SSR server itself (`static/ssr/server-core.js`) was not run. |
| AC5 | ✅ The door refuses `onclick` in the list with an error that quotes the rule, and a value for it as never read. **Sabotage arm:** the pattern widened to `'.*'` and the catalog regenerated → 2 rows red; restored, `catalog:check` up to date. `validate:project` on a copy with `onclick` → 1 error, same sentence. |
| AC6 | Catalog, enriched catalog (Group's `dataAttributes` line is the one place `get_node_type` says a listed name becomes a port), CHR-007 snapshot (+26 rows, exactly `dataAttributes → StringListType`), FB-017 tier (`Data Attributes` = plumbing beside `Advanced HTML`; 22 → 23 headings, basic unmoved at 10), AWP-005 ratchets (below). ⬜ **Export:** `component.ts` / `coverage-ledger.json` still hold a peer's uncommitted pile from **Sep 26** (a week old). Until then the export reports `dataAttributes` and each `data-*` value as unmapped ("no style/content mapping — dropped"): loud, not silent. |

**Specs.** `noodl-viewer-react/tests/isl-009/data-attributes.test.ts` 14/14 and `data-attributes-element.test.ts` 1/1.
Mutants, each restored from a `cp`: the claim removed → 13 red; Button's spread removed → 1; any name accepted → 1;
the element sync off → 1; the sync removing names it did not set → 1. `noodl-editor/tests-unit/isl-009/dataAttributesDoor.test.ts`
7/7. Mutants: the wire accept (2b) removed → 1 red; the value accept removed → 2; the pattern widened → 2.
`nodegx-kit-catalog` +3 rows (81/81).

**What the list moved elsewhere, each attributed:**
- **AWP-005** (`nodeDocBudget`): basket summary 8,115 → 8,254, ratchet 8,200 → 8,350; `Group` full 16,141 → 16,261,
  ceiling 16,200 → 16,350 (the port entry +67; Group's enrichment line +53). Table in the spec.
- **CN-010** population 88 → 92 (the four newly dynamic types) and kit `Feed`'s mechanisms; **CN-004** Feed's
  mechanisms; **kitOverlay** Badge is no longer static. Each row says why in the spec.
- 🔴 **`P109-S1-CN004` was misdiagnosed** (re-measured, bug file corrected): the strict arm's second error is the
  fixture's own wire *from* Panel's `title`, which is an input; there is no duplicate `unknown-node-type`.

**Gates (2026-10-03).** viewer-react **131 suites, 1,691 tests, 0 failed**. Full `noodl-mcp` (first time in P109):
166 suites, 3,585 tests, 20 failed in 10 suites. Attributed: this change 0 after its fixes (the expectations above);
`kitAgreement` 3 (the owed re-record); on s4/s5's HEAD-red list `cmp004Parts` 2, `cmp004RoundTrip` 2,
`nodeIdAllocation` 1, `cmp001` 1, `fld013` 1, `cn004` 1 (above). Red and not this change, filed:
`def038SettledTemplates` 6 (`P109-S6-DEF038`, possibly ISL-018's AC7, unrecorded), `d54ThemePresetIdentity` 1
(`P109-S6-D54`), `tpl007Template` 1 (`P109-S6-TPL007`, a peer has its files open). Editor: §8 s6 gates row below.

**The editor, the same session (one launch, a throwaway profile, a copy of `kit-app`; torn down after).**
- **`kitAgreement` re-recorded** (`P109-S5-KITRECORDING` fixed): see the bug file for the diff against August. 9/9.
- 🔴 **The re-record exposed a product miss:** `ContextBuilder.KIT_BASE_INPUT_PORTS`, the shared inputs the kit
  handout leaves out of a kit author's port list, had never learned s5's two scroll ports; the stale recording hid it.
  Its own comment predicted this ("it cannot catch the runtime *adding* one"). Now seven names; CN-008 green.
- **Live:** `setParameter('dataAttributes', 'data-testid,onclick')` on the copy's Group and its kit Badge → each
  node's `getPorts()` lists `data-testid` (string) and no `onclick`. In the editor's preview, the Group's element
  carried `data-testid`, and 🔴 **the kit Badge's did not**. React attaches the wrapper's ref *after* the wrapper's
  `componentDidMount`, so for a component that reports no root, the sync found no element and nothing ran again. Now
  the wrapper's ref callback runs the sync (and a held Scroll Into View, which waited the same way). After that:
  the Badge's own element carries `data-testid="app_badge-name"`, though its component never renders `props.dom`.
  Spec row + mutant (the ref-path sync removed → red).
- After that fix: both bundles rebuilt from the final source; redeployed; the drive re-run at 1024 and 390 (4/4
  each, ten names, 0 classes, 0 console errors) and the control (4/4 unmoved). viewer-react full again: **131 suites,
  1,692 tests, 0 failed**.

**Editor gates (2026-10-03):** `test:main` **568 suites, 8,835 tests, 1 failed**: `exp-013/exportBadge`, red in s5
too, reads the peer's uncommitted export ledger. Run before the editor-session fixes; the suites those touched were
re-run after (CN-006b, CN-008, CN-014, SB-017, cn-003: 68 + 22 green; isl-009 7/7).

### Session 7 — 2026-10-03: AC7, the island uses it

**What changed** (generator in `packages/noodl-mcp/tests/`, the artefact regenerated with `npm run template:garden`, exit 0,
7 files in `templates/bot-garden`, nothing else drifted):

- **The plot card scrolls itself.** `iwFound.ontrue → iwCard.scrollIntoView` (align left at its default, Nearest edge).
  Gone: the `iwRevealWait` Timer (80 ms, "a moment for the card to be drawn": the held-until-mount makes it unneeded)
  and `iwReveal` (`Logic/Find robots` with `what: 'card'`). Island/World: 82 → 80 nodes, 199 → 198 connections.
- **`FIND_ROBOTS_SCRIPT` keeps its robots branch, with the reason beside it:** the robots are drawn inside the garden
  kit's node and a kit's own elements are out of a node action's reach (§5); the ring's restart (`void box.offsetWidth`)
  is ruling 3's named need. `what` is gone from the script, so it is gone from the component's ports. ISL-025's W11
  therefore stays `present` (it matches the robots branch), and correctly.
- **The owl row has names:** `plOwl` `data-testid="owl-row"`, `plOwlSay` `data-testid="owl-say"` (a `testId()` helper
  in `cg003Components.ts`); the classes stay for the look. `drive-cg005-olive.js` reads the names (`OWL`, `SAY`, and the
  P-390 fit box).

**Selector count, garden drives (`scripts/devtools/drive-*.js` reading the owl row):** `drive-cg005-olive.js` moved
from 2 class selectors to 2 names (`OWL`/`SAY` read on 9 lines, the P-390 fit box among them; its contrast list keeps
`.bg-owl-say`, a look check). Still on the classes (uses, `grep -o`): `drive-cg003-pages.js` 8, `drive-ig003-modes.js` 4,
`drive-iw-look.js` 3, `drive-iw001-workshop.js` 2 (AC7 asked for the CG-005 hook; these can follow without a product
change). Card: `drive-ig004-island.js` and `drive-ig005-robots.js` read `.bg-plot-card` (the look's class), unchanged.

**Spec** (`cg003Template.test.ts`): hook 2 now pins both names; a new row "the plot card scrolls itself into view, and no
script reaches into the page for it" (one wire into `iwCard.scrollIntoView`, from `iwFound.ontrue`; no `iwRevealWait` /
`iwReveal`; `iwFindFn` with no parameters; no script queries `.bg-plot-card`, beside the known-firing `.bg-isle-scroll`).
Mutants, each from a `cp`: the wire removed → red; `querySelector('.bg-plot-card')` put back in the script → red.
Garden specs: 17 suites, **768/768**.

**Drive** (one `nodegx deploy` of an assembled copy, exit 0; the deploy's engine carries `scrollIntoViewAlign` and
`dataAttributes`): `drive-ig004-island.js` gained a clause. The **last request** in the list (Mamie Rose; Pip's garden
is free play and goes straight to the Workshop) is tapped where it sits, and the plot card must be on the screen.
- A first version tapped ANOTHER's request (AC3's step) and read 4/4 PASS with **the page scroll 429 → 429**: the card
  was already on the screen. That grades nothing; the clause was moved to the case the scroll exists for.
- **Main: 70/70.** 390 EN: page scroll 1537 → 776, card top 0; 390 FR 1631 → 777, top −1 (sub-pixel; the clause takes
  ≥ −1); 1368 EN 873 → 592, FR 980 → 615, top 0.
- **Control** (the same deploy rebuilt from a copy with only that wire removed): **66/70, the 4 AC7 clauses red**: the
  page does not move (390 EN 1537 → 1775), and the card sits at top −999 (390 EN), −1139 (390 FR), −281 / −365 (1368).
- `drive-cg005-olive.js pages`: **19 pass / 3 fail**, and its pre-edit copy (class selectors) reads the same 19/3 on
  the same deploy. The names are read positively ("the owl says she is thinking", "Play and the owl on screen at
  390"). The 3 reds are the drive walking the layout from before P108 R7's can: filed `P109-S7-OLIVEDRIVE` (P108's).
- P108's s8 handoff lists the island drive as "not re-driven since the tab renumbering": it reads **70/70** here.
