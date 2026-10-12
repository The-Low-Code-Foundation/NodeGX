# ISL-008 — A stylesheet can place a Group

**Status:** 🟡 s17 (2026-10-05): AC6 met — the island shed 29 `!important`s, measured in the page (§8 s17); AC1–AC5 and Richard's panel warning met s15–s16; owed: AC7's export half (P18's pile). Ruled s15 "Stylesheet beats defaults". Scoped 2026-10-01 at `27d891bf3`
**Source:** [audit F11](AUDIT-2026-10-01.md) · [P105 CG-003 §7.1 item 1](../phase-105-the-coding-garden/CG-003-THE-PAGES.md) (the win card pinned to the top) · [P95 R6](../phase-95-the-second-play-test/README.md) (the buy card) · met before by [TPL-008](../phase-78-the-templates/TPL-008-THE-TODO-LIST.md) line 559, [TPL-010](../phase-78-the-templates/TPL-010-THE-PLANNER.md) lines 268-270 and [TPL-011](../phase-78-the-templates/TPL-011-THE-EVENING-JOURNAL.md) line 390
**Side:** product (runtime styling in `noodl-viewer-react`; the export's style emission)

An author gives a Group a CSS class and writes `.win { position: fixed; inset: 0; align-items: center }` in a CSS Definition.
Nothing happens, because the Group has already written `position: relative` and `align-items: flex-start` on itself as an
inline `style`. An inline style beats any class. The only way through is `!important`, so Olive's Island's stylesheet carries
195 of them. Five templates in a row have hit this.

## 1. The person sentence

**An author gives a Group a class and writes ordinary CSS for it (fixed, centred, full screen), and the Group goes where the
CSS says, without `!important`, unless the author has also set that same property on the node.**

## 2. What was measured

HEAD `27d891bf3`, 2026-10-01. Every row was re-read by this task's author at HEAD unless it says otherwise.

| reading | where |
|---|---|
| The island's one stylesheet: App's `CSS Definition` `style`, **50,220 bytes, 280 rule blocks, 195 `!important`**. The properties most often forced: `display` 28, `width` 22, `position` 12, `font-size` 10, `background-color` 10, `flex-direction` 7, `top` 7, `height` 7, `padding` 7, `align-items` 5, `justify-content` 4. Re-counted at HEAD | `templates/bot-garden/components/App/nodes.json` (parse) |
| The generator states the rule: *"A node writes its own parameters INLINE, so a rule that must beat a parameter says `!important` (TPL-011's lesson), and every positioning property of an overlay is `!important` too (a Group writes `position` inline, P95 R6)."* Re-read at HEAD | [`cg007Look.ts:13-15`](../../../packages/noodl-mcp/tests/cg007Look.ts) |
| Group's `defaultCss` is `{ display: 'flex', position: 'relative', flexDirection: 'column' }`. The React bridge seeds every instance's start style from it: `const startStyle = Object.assign({}, defaultCss)`. Re-read at HEAD | [`group.ts:30-34`](../../../packages/noodl-viewer-react/src/nodes/visual/group.ts); [`react-component-node.ts:989-994`](../../../packages/noodl-viewer-react/src/react-component-node.ts) |
| Every `inputCss` port with a `default` and no `applyDefault: false` is **also** written at start. Group's `alignItems` defaults to `flex-start` and is applied. `justifyContent`, `flexWrap`, `rowGap`, `columnGap` and `backgroundColor` say `applyDefault: false` and are not. The shared `Position` port (`addAlignInputs`) defaults to `relative`. Re-read at HEAD | `react-component-node.ts:996-1015`; `group.ts:274-297` and the `applyDefault` lines after it; [`node-shared-port-definitions.ts:697-720`](../../../packages/noodl-viewer-react/src/node-shared-port-definitions.ts) |
| `setStyle` writes to the DOM element's `style` directly (*"set css styles directly on the raw DOM elements, circumventing React"*). That is an inline style, which no class selector outranks without `!important`. Re-read at HEAD | `react-component-node.ts:1547-1570` |
| `CSS Class` (`cssClassName`) and `CSS Style` (`styleCss`) exist on every visual node. `styleCss` is described as *"overriding the styling ports above"*, but it is also inline. `applyDefault: false` is used 19 times across the viewer. Re-read at HEAD | `react-component-node.ts:1141-1167`; `grep -rn "applyDefault: false"` |
| The CG-003 drive: the win card was fixed and centred across but pinned to the top (`cy 182.4` of 912). The fix was `display:flex; align-items:center; justify-content:center; height:100vh`, **all `!important`**, and a gate now *requires* each `!important`. Re-read at HEAD | CG-003 lines 120-124 |
| P95 R6: the buy card *"took two goes on the screen: the CSS must be `!important` (a Group writes `position` inline) and `fixed`"*. TPL-010: *"A Group renders its own `display: flex` inline, and an inline style beats a class"*. TPL-008: *"a row paints its background inline, so the class needs `!important`"*. Re-read at HEAD | P95 README line 110; TPL-010 lines 268-270; TPL-008 line 559 |
| Not read here: whether a style **variant** (`setVariant`, `react-component-node.ts:1811`) writes inline or as a class. That matters for the ruling and is session 1's first reading | — |

## 3. Where it bites a person

- Anyone who knows CSS and reaches for the `CSS Class` port: overlays, modals, sticky bars, full-screen win cards, centred
  empty states. The class is applied (DevTools shows it) and loses silently, so it looks like the CSS is wrong.
- `!important` everywhere makes the next override impossible too. The island's 195 cannot be overridden by a later theme or a
  media query without another `!important`.
- Agents learn the lesson as lore ("always `!important`"), and that lore leaks into every generated stylesheet.

## 4. Related work and collisions

- **ISL-011** (F15): the same mechanism (`Object.assign({}, defaultCss)`) beating a *kit's* own CSS. Rule the two together. If
  defaults stop being inline here, F15 may close by the same change; ISL-011 must re-measure, not assume.
- **P81 (the look is the product)** and **P92 CHR-003**: tokens and variants. A change to where defaults are written changes
  what a variant overrides. Re-read before building.
- **P18 EXP-011 §48:** the exporter folds `cssClassName` into `className` (`component.ts:361-394`) and emits node styles. The
  exported app must keep the same precedence as the runtime, or the two diverge on every project with a stylesheet.
- **P41 ACC-006** (a shared mixin on every visual node) is the precedent for a node-definition-layer change applied once.
- Owner grep: `grep -rln -i "!important\|inline style.*beat\|writes .* inline" dev-docs/tasks --include='*.md'` → TPL-008, TPL-010,
  TPL-011, P95, P105 CG-003/CG-007 (all consumers, each worked around it), P92 (editor chrome, unrelated). No owner.

## 5. Design — 🔒 rulings first

The question is the specificity model: what may an author's stylesheet override, and what may it not?

1. 🔒 **What does a node write inline?**
   (a) **Only what the author set.** Defaults (`defaultCss` and applied `inputCss` defaults) move to a generated class per node
   type, at the lowest specificity (`:where(.ndl-group)` or a cascade layer), so any author class beats a default and loses to
   an author-set parameter.
   (b) **As today, plus an opt-out:** a per-node switch ("Let my CSS class decide layout") that stops writing the layout
   properties inline when a CSS Class is set.
   (c) **As today, documented:** teach `!important` and lint for it.
   *Recommendation: (a).* It matches what a person who knows CSS expects (a default is the weakest rule), and it needs no new
   port. (b) moves the problem to a checkbox nobody finds. (c) is the status quo the five templates paid for.
2. 🔒 **Do author-set parameters stay inline?** If (a): an author who sets Align Items = Start *and* writes a class saying centre.
   Who wins? *Recommendation: the parameter (inline) wins,* because the panel is the node's own statement, and a class is for
   what the panel does not say. The panel should show, on hover, that a class also sets that property.
3. 🔒 **Blast radius.** (a) must render every existing project identically, because the generated class carries the same values.
   Is a project whose stylesheet *relied* on losing to a default (a rule that never applied) allowed to change? *Recommendation:
   yes, it is the bug being fixed. List those rules by census (AC5) and say so in the release notes.*

Constraints: SSR output carries the same precedence (the default class must be in the server-rendered CSS, or the first paint
differs). The editor's canvas and the deployed app agree. The export emits the same layering. The 19 `applyDefault: false` ports
keep their meaning.

## 6. Acceptance criteria (apply after the rulings are recorded in §8)

| AC | Clause |
|---|---|
| AC1 | **RED at HEAD, recorded in §8.** A deployed page: a Group with class `.win` and a CSS Definition `.win { position: fixed; inset: 0; display: flex; align-items: center; justify-content: center }` and **no** `!important`. Read the card's computed `position`, `align-items` and its box centre in a 390×844 viewport. At HEAD it reads `relative` / `flex-start` / near the top. Known-firing control: the same rules with `!important` read `fixed` / `center` / centred. |
| AC2 | **The person sentence, in a browser.** AC1's page, after the fix, without `!important`: the card is fixed and centred (centre within 2 px of the viewport centre). Read with `elementFromPoint` at the centre (the memory's RECT≠VISIBLE rule), not a rect alone. |
| AC3 | **Author-set still wins** (ruling 2). The same Group with Align Items set to Start in the panel: the panel value wins over the class. |
| AC4 | **Nothing else moves.** Screenshots of every shipped template's main pages (at least `bot-garden`, `nightbook`, Rocket School, the to-do and planner templates) before and after, pixel-diffed. Every difference is listed and explained by AC5's census, or the fix is not done. |
| AC5 | **Census.** Every CSS Definition under `templates/` and `library/`: count rules that set a property a node also defaults inline, split into "has `!important`" and "has not". The "has not" set is the list of rules whose behaviour changes. Record it. |
| AC6 | **The island sheds its `!important`.** Remove every `!important` that existed only to beat a default (expect most of the 195), regenerate, and the CG-003/IG/IW drives stay green. Record the count before and after. **Sabotage arm:** restore inline defaults with the sheet stripped, and the win-card drive goes red. |
| AC7 | **SSR and export.** A server render of AC1's page has the card centred at first paint (screenshot before hydration). The exported app's AC1 page reads the same as the runtime's. |

## 7. Traps

- **A default whose value equals the test value matches everything** (memory: "DEFAULT==TEST VALUE"). AC1 must use values the
  default does not have (`fixed`, `center`), never `relative` / `flex-start`.
- **The class is applied either way.** A check that reads `classList` passes at HEAD. Read computed style and position.
- **`styleCss` is also inline.** It is not an escape hatch for this. Do not grade the fix through it.
- **A cascade layer is not a specificity bump.** Layered rules lose to unlayered author rules, which is the point, but a later
  `@import` order can surprise. Pin the order in a spec.
- **Variants are unread** (§2 last row). If variants write inline, an author's class still loses to a variant default after
  this fix.

## 8. Session log

None yet.

### Session 15 (2026-10-04) — the blast-radius census, taken before asking (read-only, at `c70dde72f`)

Each viewer node definition bundled in memory (esbuild, React layer stubbed) and its starting inline style dumped; every
author stylesheet on this machine crossed against the classes set on nodes.

- **Three inline writers, not one.** (1) `react-component-node.ts:1184-1209` builds the start style from `defaultCss` +
  every `inputCss` default not marked `applyDefault:false`, copied at `:1257`, written by `setStylesOnDOMNode`
  (`:1106-1121`). 🔴 (2) **`Layout.size/align`** (`layout.ts:53-110`) writes `width`/`height` from the 100% defaults,
  `flexShrink:0` always, and `flexGrow`/`alignSelf`/auto margins, on every render from 13 components (e.g.
  `Group.tsx:307-309`) — the docblock at `react-component-node.ts:424-430` saying Layout "never runs" is true only of its
  own render path. 🔴 (3) **Columns** writes nine container properties inline (`Columns.tsx:603-640`) and has no
  `defaultCss`. Variants (`setVariant`, `:2072-2098`) go through the same inputs, so they are inline too (§2's "variants
  unread" is wrong).
- **Inline when the author sets nothing:** Group 10 properties (display, position, flex-direction, align-items, opacity,
  box-sizing, width, height, flex-shrink, flex-grow); Text 6; Button 5 (incl. `background-color #000`); Image 5;
  Columns 9. **28 distinct properties across 27 types.**
- **`applyDefault: false`:** the task says 19; it is **40** literal uses (21 outside `nodes-deprecated`) + 4 computed
  (`node-shared-port-definitions.ts:504-554`), the same at `27d891bf3`.
- **Population:** 478 project folders (the 236-project method, widened: repo 218, NodeGX test projects 174, Noodl
  projects 82, Erleah/MAU 4; copies and backups included); **121 carry author CSS** (CSS Definition `style`, `.css`
  files incl. kits, head-code `<style>`).
- **Rules that would START applying** (no `!important`, class on a node whose type writes that property inline, the node
  not setting it, not a pseudo-element): **99 declarations in 21 folders; 55 equal the default (nothing visible changes);
  44 change something, in 12 folders ≈ 7 distinct sources:** bot-garden 19 (align-items 7, flex 8, place-items 3,
  disabled opacity 1); the DBT kit sheet 6 (`.lesson-layout`, `.dossier-segments {display:grid}` drawn as flex today;
  chip backgrounds 3; disabled opacity 1); Erleah 4 (`inline-block`, 3 copies); landing-pages
  `button.pressable:disabled{opacity:.45}` (3 copies); rocket-school `.rkt-clock-last{display:inline-block}` (2 copies);
  HiveClip `flex:0 0 auto`; 🔴 riskiest: an old Noodl project's head code `.animated{opacity:0}` would hide its elements.
- **`!important` that exists only to beat a default: 217 in 25 projects** (display 139, position 21, flex 28, height 11,
  width 9, other 9).
- 🔴 **AC6's "most of the 195 can go" is wrong.** The island's sheet: 196 `!important` in 267 blocks (the task: 195 in
  280) — **44** beat a default (removable), **44** beat the node's own panel value (stay, under ruling 2), **108** beat
  neither (50 on properties never written inline; 47 on classes no saved node carries — wired `cssClassName` or DOM built
  by Functions, so 44 is a floor). Nightbook 7 of 180 removable; Planning 11 of 37.
- 🔴 **Fix (a) as written** (move the `defaultCss`/`inputCss` defaults) leaves Layout's width/height/flex-shrink/flex-grow
  and Columns' container style inline: it does not reach the island's 22 `width` and 7 `height` forces. The build must
  cover all three writers.

**Ruled s15 (2026-10-05) — "Stylesheet beats defaults" (ruling 1 (a)), with Richard's addition** (README §8 round 4,
verbatim there): *"…maybe we can make a way to warn someone visually in the node props when a style value is being overridden
by a stylesheet and where it lives if it's a custom CSS node or some custom CSS in a visual node?"* Rulings 2 and 3 taken as
recommended (an author-set panel value stays inline and wins; the 44 rules that start applying are the bug being fixed, listed
in the release notes). **New AC, from the request:** the property panel marks a value that a stylesheet rule overrides and
names where the rule lives (the CSS Definition node, a visual node's own custom CSS, a kit sheet or head code). 🔴 The build
covers all three inline writers (the start style, `Layout.size/align`, Columns), or the island's width/height forces stay.

### Session 16 (2026-10-05) — the runtime built: AC1–AC4 and AC7's server half met; the panel warning, AC6 and the export owed

**AC1 ✅ red at HEAD `39bd1c534`, deployed** (`nodegx deploy` of [`isl008-win-card`](isl008-win-card/), driven by
[`drive-isl008-win-card.js`](../../../scripts/devtools/drive-isl008-win-card.js) at 390×844). `.win` with no
`!important`: computed `relative` / `flex-start`, the card at (−95, +284) from the centre. The control `.win-imp` (every
declaration forced): `fixed` / `center`, card at (0, 0). The Group wrote 10 properties inline: `display`, `position`,
`flex-direction`, `align-items`, `opacity`, `box-sizing`, `width`, `height`, `flex-shrink`, `flex-grow`.

**Built** — [`default-style-layer.ts`](../../../packages/noodl-viewer-react/src/default-style-layer.ts) (its header is
the design):
- The node records what the author set on THIS instance: every input setter is wrapped at definition time
  (`_authoredInputs`, by input name) and `setStyle` records its keys (`_authoredStyle`). A parameter stored in the
  project, a wire, a variant, a visual state and `CSS Style` all run one of those; a seeded default runs neither.
- The record rides on the node's style object under a `Symbol.for` key. Spread and `Object.assign` carry it through
  every component's `{ ...props.style }`. React's style writer and the server serialiser enumerate with `for…in`, so
  it never reaches the DOM — no new prop, so nothing leaks through a component that spreads its props (Video does).
- After Layout, a converted renderer calls `layerDefaults(style)`. A key leaves the inline style when the author has
  not written it AND it is either a start key still at its start value, or a `Layout`-derived key none of whose
  inputs is authored (`LAYOUT_SOURCES`: width ← sizeMode/width/fixedWidth/margins/position, …). The keys become one
  `.ndl-d-<cyrb53>{…}` rule (written as React writes numbers: `px` except React's unitless list), deduplicated by
  content, in `<style id="noodl-default-styles">`, and the class goes on the same element.
- 🔴 **The precedence model is source order, not a layer.** The sheet is the first child of `<head>` (and is put back
  there if something prepends later). A default class and an author class tie on specificity, and the author's
  comes later: CSS Definition, control sheets, the font loader and drag-drop all APPEND to `<head>`, head code sits
  mid-head, kit `<link>`s are in `<body>` (census, this session). An element or universal selector still loses to a
  default, as it lost to the inline style, so a reset sheet's `button {…}` does not undo a Button's background. A
  cascade `@layer` would have let it through, and dropped every default on a browser older than Safari 15.4.
- **Converted (10):** Group, Text, Image, Circle, Icon, Video (both paths), Page, Button, Radio Button Group, and
  Columns' container (its own source map: each container key names the Columns input it is computed from). Page now
  lays out a copy of its style — it used to run Layout on the node's own style object, a render at a time.
- **Not converted, on purpose:** Checkbox, Radio Button, Text Input, Dropdown (Select) and Slider put the author's
  class on an inner element and the root style on a wrapper, so no author class can place that element to begin
  with. The deprecated controls have generated class sheets of their own that would start beating their defaults
  (old projects would move). Kit nodes keep `defaultCss` inline (ISL-011's ruling); a kit component never calls
  `layerDefaults`. Tagged inner styles (`props.styles[tag]`) are untouched.
- The SSR page writes the sheet first in `<head>`
  ([`inject-default-styles.js`](../../../packages/noodl-viewer-react/static/ssr/inject-default-styles.js), called from
  `server-core.js`, listed in the SSR deploy manifest — whose own gate went red until it was). The box-model overlay
  reads what a node SPECIFIED as inline over its defaults class (`specifiedStyleOf`), so "width: 100% of the parent"
  still appears for a default-sized node.

**Specs:** `tests/isl-008/defaults-layer.test.tsx` 11/11 (real Groups through the runtime: what leaves the inline
style, the class and its rule, AC3, the size rule, dedup, the sheet first in `<head>`, the rule on its own).
**Reverted arms, each restored by `cp` and byte-compared:** authored recording off → 2 red; layer by value alone → AC3
red; append instead of prepend → the order row red; Group without `layerDefaults` → 6 red.
`tests/isl-008-ssr-default-styles.test.js` 4/4; `tests/isl-008/server-render.test.tsx` 1/1. viewer-react whole suite
**1,718/1,718**. P107's `node-spec/graph` + `runtime-target` 102/102 with the change in the tree (the face reads only
computed `visibility` / `pointer-events`).

**The browser readings — built in a worktree** (`../OpenNoodl-worktrees/p109-s16-isl008`, real copies of
`src/external` and of the `noodl-preview` / `nodegx-export` dist, `OUT_PATH` pointed there), so the shared bundle
peers drive with was never rebuilt (still 2026-10-04 14:11).

- **AC2 ✅** deployed, 390×844: `.win` with no `!important` → `fixed` / `center` / `center`, card at (0, 0);
  `elementFromPoint` at the screen centre lands on the plain card. The bare Group reads exactly as at HEAD (relative,
  flex-start, card at (100, 68)); console errors 0.
- **AC3 ✅** `.win-set` with Align Items = Start in the panel: `align-items: flex-start` stays inline and wins; the
  class's `fixed` and `justify-content: center` apply (card at (−95, 0)).
- **AC4 ✅** — [`isl008-template-shots.js`](../../../scripts/devtools/isl008-template-shots.js): every routed page of
  all 13 templates (nightbook copied in from the primary, where it is uncommitted) at 1280×800 and 390×844, **132
  pictures**. Two runs at HEAD: **5 noisy** (bot-garden Grown-ups desktop; planner Sign in and Week ×2). After the
  change: **6 differ**, one of them noise (Grown-ups). The other five, each looked at side by side:
  - bot-garden Island (desktop, phone) and Workshop (phone): the quest cards' badges ("Steps in order", "Repeat",
    "If") move from the card's top edge to its vertical centre, and some cards grow a few pixels —
    `.bg-quest { align-items: center }`, written by the author and never applied (in s15's census: bot-garden
    align-items ×7).
  - planner-demo Week (desktop, phone): the placed chips ("Coaching offer", "Practice group") dim —
    `.planner-chip-placed { opacity: 0.55 }`. 🔴 **Not in s15's list of 44:** the class is wired, not saved, which is
    the population s15 said its count could not see ("44 is a floor").
  Every difference is a rule its author wrote that now applies: the bug being fixed (ruling 3). Release notes: the
  44 of §8 s15, plus `.planner-chip-placed`.
- **AC7, server half ✅ (narrower than a deploy)** — `tests/isl-008/server-render.test.tsx` renders the four overlays
  through the runtime with `renderToString` and NO `document`, passes the page through the real
  `injectDefaultStyles`, and the drive reads it in Chrome with no scripts at all (the first paint, before any
  hydration): plain `.win` `fixed` / centred (0, 0), the panel-set Align Items still inline and winning, the bare Group
  unchanged. The server's class names equal the deployed client's (`ndl-d-1d4acxlkeoy`, `ndl-d-1ghi8izvn55`): content
  hashing, so hydration agrees. Not run: a server-rendered DEPLOY (the editor's Self Hosting flow builds one; nothing
  in the repo runs that pipeline headless).
- `noodl-mcp` `fld005ColumnMultipliesOut` read Groups' INLINE style for `height: 100%` / `flex-grow: 100` — green only
  because the shared bundle is old. It now reads what the node specified (inline + its defaults-class rules): 10/10
  against the new bundle in the worktree, every geometry reading unchanged. `renderTools`, `isl021DrivePage`,
  `isl022WrappedRow` 21/21 against the new bundle.

**The panel warning — Richard's AC ✅ (later in s16, commits `18d3f059d` and the next).**
- The canvas answers ([`style-sources.ts`](../../../packages/noodl-viewer-react/src/style-sources.ts),
  `NoodlEditorHighlightAPI.explainStyle`): every author rule matching the selected node's element; per property the
  cascade's winner (`!important`, specificity — a Selectors-4 count with `:where` 0 and `:is/:not/:has` their best
  argument — then order); reported when it beats the node's own value (an inline panel value only with `!important`;
  a default at class specificity or above; a port the node never writes, like Justify Content, always) and differs
  from it. Named from its sheet: a CSS Definition's `<style id="style_<nodeId>">`, a `<link>`, else head code; the
  node's own CSS Style too. The defaults and token sheets are never the author's.
- The editor ([`portStyleSource.ts`](../../../packages/noodl-editor/src/editor/src/utils/portStyleSource.ts),
  [`styleSourceBridge.ts`](../../../packages/noodl-editor/src/editor/src/utils/styleSourceBridge.ts)): one note per
  row, applied in place as FB-017's hints are, its own class so neither note erases the other; asked after each
  settle, 400 ms after an edit, and when the canvas reloads (CanvasView registers the provider and says "stale" on
  `dom-ready`).
- Specs: viewer `style-sources.test.ts` 18/18 (reverted arms: no specificity check → the element-selector row red;
  inline losing to any class → the panel-value row red; no equal-value check → its row red); editor
  `portStyleSource.test.ts` 9/9, property-editor + row suites 192/192; editor `tsc` 0.
- **Live, in the editor** (`dev:debug` on a throwaway profile in the scratchpad, a copy of `isl008-win-card` opened
  through the launcher): selecting `plain` (class `.win`) — Position "In Layout" in the panel with *"Your CSS sets this
  to fixed, from .win, .win-set in the CSS Definition “the author's stylesheet” (/Pages/Home)."*, Align Items "Start"
  with the same sentence for `center`, Justify Content the same. Controls: `set` (Align Items set in the panel) —
  Position and Justify Content noted, Align Items NOT; `bare` (no class) — no note. Live: Align Items set to End →
  its note goes within 4 s, no reselect.
- 🔴 **Found live, fixed:** clearing that value left the note gone and the canvas holding `align-items: flex-start`
  INLINE. The runtime restores a cleared parameter by setting the port's declared default through the setter
  (`node.ts` `_onNodeModelParameterUpdated`), and the setter counted as the author speaking — so a cleared value
  outranked the stylesheet until the next reload, when it did not. Now that branch names the input to
  `_resetReactVirtualDOM(name)`, and the next set of it is recorded as a DEFAULT (un-authored; its style write goes
  through a render, so React removes the stale inline value). Spec row "a panel value the author CLEARS is a default
  again at once" (reverted arm: red). Live after the fix: set End → note gone; cleared → note back, the canvas element
  with no inline style and `align-items: center`. viewer-react 1,737/1,737; P107 graph/target 102/102.
- Stack stopped with `dev:stop` (26 processes; 16 MCP servers survived). The shared `src/external` bundles were
  rebuilt by the stack's watcher and now carry ISL-008 (a dev build).

**Owed:**
- ~~The panel warning~~ built above. What it does not name yet: head code and a kit's sheet are named by kind only
  ("the project's head code", the `<link>` file name); a kit `<link>` lands in `<body>` and is matched like any other
  sheet. Mapped this session for reference: the canvas answers through a new
  `NoodlEditorHighlightAPI` call (`viewer.jsx:17-104`, reached by the editor's `executeJavaScript`, as
  `CanvasView.ts` already does), resolving the node and walking `document.styleSheets` for rules that match its
  element and win. The rule's source is its `ownerNode`: a CSS Definition's `<style id="style_<nodeId>">` names the
  node; head code and kit sheets are anonymous today (a marker is owed, and a kit `<link>` lands in `<body>`). The row
  is marked in place the way FB-017's hints are (`Ports.refreshHints`, `portHint.ts:157`), not as a warning, which
  would ring the node as a problem.
- **AC6** — the island sheds the `!important`s that only beat a default (s15: 44 of 196, a floor), through
  `cg007Look.ts`; the CG-003/IG/IW drives stay green; the sabotage arm.
- **AC7, export half** — `nodegx-export` must emit the same layering. Its files are in P18's uncommitted pile
  (`plan.ts`, `component.ts`, `emitApp.ts` dirty since 2026-09-26): handed to P18.

### Session 17 (2026-10-05) — AC6: the island sheds the 29 `!important`s that only beat a default

**The instrument** — [`scripts/devtools/isl008-important-census.js`](../../../scripts/devtools/isl008-important-census.js),
hooked into every garden drive through `drive-deployed.js` when `ISL008_IMPORTANT_CENSUS=<json>` is set (opt-in; off, the
drive is unchanged). Before each press, key, touch and navigation, in ONE synchronous evaluate, it takes each `!important`
of the island's sheet whose rule matches something now and reads every longhand it sets on every element it matches, with
that one `!important` removed: NEW (the ISL-008 runtime as it is) and OLD (each element's `.ndl-d-*` defaults copied back
inline, as the runtime wrote them before ISL-008). removable = OLD moved and NEW never did; keep = NEW moved; neither =
seen, never moved; unseen = no state of any drive matched it (kept, as a floor).

**The census** (20 drive runs over the 19 CG-003/IG/IW drives, 3,544 states, 1,240 measured; deployed island with
ISL-008): of **196**, **29 removable**, **41 keep**, **121 neither**, **5 unseen**. s15's static "44 removable, a floor"
was a reading of the sheet; in the page 29 move under OLD and not under NEW. The 29: `display: grid`/`none` 18,
`position` 8, `flex-direction` 2, `align-items` 2 (`.bg-win` and `.bg-shop`, the two overlays). The 41 kept beat a value
the graph SETS: `font-size` 7, `background-color` 7, `width` 5, `color` 3, paddings 6, flex 5, and 8 others. The 121
"neither" stay too: a later census can take them, but they are not ISL-008's (a property never written inline, or a
rule that matched nothing it could beat).

**The strip** — `isl008-important-census.js strip --write` on `packages/noodl-mcp/tests/cg007Look.ts`: 201 → 171
`!important` in the file (29 declarations, and the header's rule rewritten: *"a rule says `!important` only to beat a value
the graph SETS"*). `npm run template:garden`: only `templates/bot-garden/components/App/nodes.json` changed (the CSS
Definition), 199 → 170 in the template. Three CG-003 rows pinned a removed `!important` (AC7's win card, the island grid,
the pad stage); each now pins the decision with a comment. `cg003Template` 150/150; ISL-025's W10 row notes 171.

**Gates:**
- **Verify, on the ORIGINAL sheet** (the 29 removed together, both modes, every drive state): NEW moved **0** values;
  OLD moved **28**. The 29th, the phone's `.bg-stage:has(> .bg-pad) { flex-direction: column }`, moves alone (census: `column → row`, because the unconditional `row` rule then wins) but not together: with its `row` twin also stripped, the Group's inline default is `column`, the value the rule wanted.
- **The stripped island**, assembled and deployed with `nodegx deploy` (exit 0), the same 19 drives: **18 of 19 green**, each exit 0 (`cg003-pages` 17 min, `ig004-island` 70/70 …). The 19th, `iw007-touch`, is red on the same three 1368-en clauses (BUILD, PILLS, PAY: Cobble's planks) on the ORIGINAL sheet too (the verify run), and the ISL-005 session measured the same three red on HEAD's garden with HEAD's drive: older than this strip, not moved by it.
- **Sabotage arm, as a drive:** a copy of the stripped site with one script added before the runtime that copies every
  `.ndl-d-*` default back inline (the pre-ISL-008 runtime's behaviour), `drive-cg003-pages.js`: **13 red** (exit 1, 317 pass), where the stripped site reads 330/330: AC7's win card "fixed and centred after scrolling" at 1368 and 390 in both languages (it reads `position: relative`, centred at x 222 of 1368), back to the island from the win card, the island's 360 px request column, Play and the owl on screen at scroll 0. The in-page arm (verify OLD, 28 values) and the drive arm agree..

**AC6 met.** Release note (with s15's list): none — removing an `!important` that only beat a default changes nothing on a runtime with ISL-008; on an older runtime the island would break (the sabotage arm), so the template needs ISL-008's runtime, which it ships with.
