# ISL-008 — A stylesheet can place a Group

**Status:** ⬜ not started — scoped 2026-10-01 at `27d891bf3`
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
