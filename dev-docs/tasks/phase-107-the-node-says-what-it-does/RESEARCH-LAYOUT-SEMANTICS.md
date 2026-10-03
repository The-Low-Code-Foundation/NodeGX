# NSP-016 — research: what a visual node's layout means, apart from CSS

**Written 2026-10-03 (P107 s36).** NSP-016 §3.1. The numbers come from `node scripts/node-spec/visual-census.js`, which
reads the node catalog (`packages/noodl-types/src/node-catalog.json`), the hand-kept classes in
[visual-params.json](visual-params.json), and the product surface. It writes [visual-census.json](visual-census.json).
`--check` fails when a visual input has no class.

## 1. In short

- **The 19 visual nodes have 274 distinct inputs.** 65 of them are behaviour (values, content, signals). 55 are layout,
  141 are paint, and 13 are web-only.
- **Shipped templates set layout almost entirely inside what four native toolkits share.** Of 11,041 layout settings on
  2,871 visual nodes in 11 templates: 96.6% shared directly, 0.9% expressible with a wrapper or spacer, 2.4% not shared.
  The not-shared share is nearly all `flexWrap: wrap` on rows (173 nodes, 10 templates).
- **Units and tokens are already neutral.** Sizes are `%` (1,412) or `px` (1,141); `em` 31, `vh` 19, `vw` 1. Colour and
  font values are design tokens 92.5% of the time (3,603 `var(--…)` against 291 literals).
- **The finding that changes the question:** 9 of the 10 shelf templates also carry a hand-written stylesheet in a `CSS
  Definition` node. Together they hold about 1,084 rules and 185 KB, with `!important` 445 times, `display: grid` 16 times
  and `@media` 28 times. 498 of the 2,871 visual nodes (17%) take a `cssClassName` that points into those sheets. That
  layout and look is not in any node parameter, so no parameter-level spec can see it, neutral or not. The sheets belong
  to the escape hatches (NSP-017: CSS Definition is T6), not to this task, but they bound what any answer here can grade.
- **The logic half is buildable now.** The viewer's corpus harness (`noodl-runtime/test/corpus/graph-harness`) already
  builds visual nodes without React (ERG-001 and NDA-012 rows use it), and the runtime target registers viewer nodes
  (`withViewerNodes`).

## 2. What four native layout systems share

Four layout systems, read for what each can say natively, without a custom layout: **Yoga** (React Native's flexbox
subset, also used by Litho and ComponentKit), **SwiftUI** (stacks and frames), **Jetpack Compose** (Row, Column, Box and
modifiers) and **Flutter** (Flex, Stack and constraints). "Shared" means all four say it directly. "Expressible" means
all four can say it, but one or more needs a wrapper or a spacer.

| idea | Yoga (RN) | SwiftUI | Compose | Flutter | verdict |
|---|---|---|---|---|---|
| stack children along an axis (row / column) | `flexDirection` | `HStack` / `VStack` | `Row` / `Column` | `Row` / `Column` | **shared** |
| overlay children (z-stack) | `position: absolute` children | `ZStack` | `Box` | `Stack` | **shared** |
| main-axis start / center / end | `justifyContent` | stack + `Spacer` / frame alignment | `Arrangement.Start/Center/End` | `MainAxisAlignment` | **shared** |
| main-axis space-between / around / evenly | `justifyContent` | `Spacer()`s between children | `Arrangement.SpaceBetween/…` | `MainAxisAlignment.space…` | expressible (SwiftUI by spacers) |
| cross-axis start / center / end | `alignItems` | stack `alignment:` | `Alignment.Top/…` | `CrossAxisAlignment` | **shared** |
| cross-axis stretch | `alignItems: stretch` | child `.frame(maxWidth: .infinity)` | child `fillMaxWidth()` | `CrossAxisAlignment.stretch` | expressible |
| fixed gap between children | `gap` (RN ≥ 0.71) | `spacing:` | `Arrangement.spacedBy` | `spacing:` (≥ 3.27) / `SizedBox` | **shared** |
| padding | `padding*` | `.padding` | `Modifier.padding` | `Padding` | **shared** |
| margin | `margin*` | — (padding on a wrapper) | — (padding before background) | — (`Padding` wrapper) | expressible as outer padding |
| size: fixed | `width` / `height` | `.frame(width:)` | `Modifier.size` | `SizedBox` | **shared** |
| size: hug content | default | default | `wrapContentSize` | default | **shared** |
| size: fill parent | `alignSelf: stretch` / `flex: 1` | `.frame(maxWidth: .infinity)` | `fillMaxWidth()` | `Expanded` / `double.infinity` | **shared** |
| size: percent of parent | `width: '50%'` | `GeometryReader` | `fillMaxWidth(0.5f)` | `FractionallySizedBox` | expressible (SwiftUI awkward) |
| min / max size | `minWidth` … | `.frame(minWidth:maxWidth:)` | `widthIn(min, max)` | `ConstrainedBox` | **shared** |
| grow weights (share leftover space) | `flexGrow` | — (`layoutPriority` is not a weight) | `Modifier.weight` | `Expanded(flex:)` | expressible (SwiftUI: equal shares only) |
| shrink | `flexShrink` | `layoutPriority` / `fixedSize` | — | `Flexible` | NOT shared |
| wrap onto lines | `flexWrap` | — (needs the `Layout` protocol, iOS 16) | `FlowRow` | `Wrap` | NOT shared |
| absolute position in parent | `position: absolute` + `top/left` | `ZStack` + `.offset` / `.position` | `Box` + `Modifier.offset` | `Positioned` | expressible (inside an overlay) |
| z-order | `zIndex` | `.zIndex` | `Modifier.zIndex` | child order in `Stack` | **shared** |
| clip content | `overflow: hidden` | `.clipped()` | `Modifier.clip` | `ClipRect` | **shared** |
| scroll | `ScrollView` | `ScrollView` | `verticalScroll` | `SingleChildScrollView` | **shared** |
| opacity / background / corner radius / border | style props | modifiers | modifiers | `DecoratedBox` / `Opacity` | **shared** |
| shadow | `shadow*` (iOS) / `elevation` (Android) | `.shadow` | `Modifier.shadow` (elevation) | `BoxShadow` | expressible, rendering differs |
| visibility (keeps its space) vs removal | `opacity: 0` / `display: none` | `.opacity` / `if` | `alpha` / `if` | `Visibility` / `Offstage` | **shared** (two different ideas) |

**Web-only, with no native counterpart:** CSS length units other than px and % (`em`, `rem`, `vh`, `vw`, `calc()`),
`position: fixed` / `sticky`, CSS Grid, `box-sizing`, `cursor`, `pointer-events`, `user-select`, filters and blend modes,
CSS transitions written as CSS, `!important`, and design tokens as CSS custom properties (`var(--x)`). A token is a
neutral idea (a named value), but the `var()` syntax is CSS.

## 3. The census

**Population:** the 19 T5 nodes in the census, with each node's inputs taken from the catalog (signals excluded). The
inputs are 274 names, because many nodes share the same helper sets (`node-shared-port-definitions.ts`).

**Surface** (ranked by the product, never by a corpus):
- the 10 shelf templates in `templates/` (each `-demo` folder is its template again with data in it, so it is counted
  once, under the template);
- the editor's embedded Site Builder template;
- the 109 examples an agent is taught from (`docs/node-catalog/examples`), counted separately.

The embedded Landing Pages template duplicates `templates/landing-pages` and is not counted twice. The counts are 2,871
visual nodes on the templates and 592 on the examples.

| class | inputs | set on templates (inputs / settings) | share of template settings | set on examples (inputs / settings) |
|---|---|---|---|---|
| logic | 65 | 22 / 1,692 | 7.9% | 27 / 323 |
| layout-shared | 34 | 26 / 10,669 | 50.0% | 24 / 1,267 |
| layout-expressible | 12 | 9 / 103 | 0.5% | 8 / 53 |
| layout-not-shared | 9 | 6 / 269 | 1.3% | 5 / 39 |
| look-shared | 107 | 31 / 6,738 | 31.6% | 25 / 795 |
| look-expressible | 34 | 15 / 965 | 4.5% | 12 / 79 |
| web-only | 13 | 6 / 902 | 4.2% | 4 / 8 |

**Which inputs carry each class** (template nodes / templates):
- **layout-shared:** `sizeMode` 2,279 / 11, `width` 1,445, `flexDirection` 1,232, the four paddings 727–778 each,
  `rowGap` 730, `alignItems` 553, `columnGap` 360, `mounted` 297, `maxWidth` 198, `height` 132, `justifyContent` 132.
- **layout-not-shared:** `flexWrap` 220 / 10 (`wrap` 173, every one on a row), the Columns node's own settings
  (`marginX` 16, `marginY` 13, `layoutString` 9, `sizing` 7) and `alignContent` 4.
- **layout-expressible:** margins 59 in all, the Columns breakpoints 9 each, and `position` 8 (`fixed` 7, `sticky` 1).
- **look-expressible:** `borderStyle` 516, but by value it is `solid` 353, `none` 108 and `dashed` 3, so all but 3 are
  shared. The rest is box shadow (60 on 3 templates), `fontVariantNumeric` 34, and gradients and background images (13
  and 6).
- **web-only:** `cssClassName` 498 / 10, `as` 364 / 10, `styleCss` 34 / 3, then `backdropBlur` 3, `dataAttributes` 2 and
  `nativeScroll` 1. `as` is the HTML tag: `p` 83, `h2` 65, `span` 46, `h3` 45, `h1` 39, `section` 29, `main` 16, then
  `nav`, `footer` and `header`. That is document SEMANTICS (heading level, landmark), which native platforms express as
  accessibility roles. It is a neutral idea in HTML clothes, not styling.

**Values.**
- `sizeMode`: `contentHeight` 1,600, `contentSize` 553, `explicit` 126. That is hug and fixed, shared everywhere.
- `flexDirection`: `column` 834, `row` 398.
- `alignItems`: `center` 425, `flex-start` 77, `stretch` 28, `flex-end` 23.
- `justifyContent`: `space-between` 59, `center` 56, `flex-end` 16, `flex-start` 1. `space-between` is the one value
  SwiftUI needs spacers for.

**Caveat on the counts.** The editor's picker stamps defaults on Text, Button, Checkbox and Text Input when one is
placed (`ElementConfigRegistry.applyDefaults`: Text's `width` / `height: auto`, `flexShrink`, `minWidth`, font and colour
tokens). A value that appears in a template was not necessarily chosen by its author. The MCP authoring path does not
stamp them.

## 4. The stylesheet beside the parameters

| template | sheets | characters | rules | `!important` | `display: grid` | `@media` |
|---|---|---|---|---|---|---|
| bot-garden | 1 | 52,135 | 292 | 199 | 13 | 16 |
| todo-list | 4 | 41,377 | 237 | 13 | 1 | 2 |
| nightbook | 2 | 35,026 | 232 | 179 | 1 | 0 |
| planning | 2 | 26,291 | 157 | 37 | 1 | 3 |
| rocket-school | 1 | 24,961 | 122 | 11 | 0 | 2 |
| pixel-game | 1 | 1,962 | 14 | 3 | 0 | 2 |
| landing-pages | 1 | 1,903 | 17 | 0 | 0 | 1 |
| story-engine | 1 | 1,327 | 8 | 0 | 0 | 1 |
| digital-bricks-training | 1 | 620 | 5 | 3 | 0 | 1 |
| members-area | 0 | — | — | — | — | — |

Each sheet is a `CSS Definition` node's `style`, or a `<style>` that a Function injects. The Function sheets are one
shared Date picker component (19,180 characters, in nightbook, planning and todo-list alike) and todo-list's two task lists. The classes do things the parameters cannot: a grid of cards (`.bg-gu { display: grid !important;
grid-template-columns: repeat(auto-fit, minmax(…)) }`), hover and press states, phone-only rules, and uppercase captions.
`!important` overrides the node's own parameters, so on those nodes **the parameter does not say what is drawn**. A
parameter-level spec, CSS or neutral, grades a layout the sheet may have replaced.

This is a fact about how the templates were built (by agents writing mockup CSS), not about the visual nodes. It belongs
to NSP-017 (escape hatches: CSS Definition is T6) and to the templates phase. It is recorded here because it bounds (b).

## 5. The options, with what each costs and grades

- **(a) Logic only.** Spec the 65 behaviour inputs and the nodes' outputs and signals: Button's Click, Text Input's
  Text, Checkbox's Checked, Slider's Value, Repeater's items, Drag's snaps, Video's actions. Look and layout stay graded
  as today (`render_report` geometry, the template drives).
  - Build: a visual-node seam in the runtime target. The corpus harness already makes these nodes without React; the
    events a person causes (a click, typing, a drag) need a world face, like PICKER's click.
  - What it does not grade: anything drawn.
- **(b) Logic plus a neutral layout model.** A layout vocabulary for the shared subset in §2 (axis, main and cross
  alignment, gap, padding, hug / fill / fixed / percent / min / max, overlay, z-order, clip, scroll), each layout input
  mapped onto it, and the not-shared and web-only inputs marked web-only. Geometry asserted with a tolerance through
  `render_report` (AC4).
  - Grades: about 97% of the layout settings the templates make.
  - Does not grade: the stylesheets of §4. On 17% of visual nodes a class can override what the model says.
  - Cost: (a), plus the model, plus a real renderer per play (`render_report` runs a browser), which is several sessions
    and a heavy job on a shared box.
- **(b′) Logic plus the classes, no geometry yet.** (a), plus each layout and look input's class from
  `visual-params.json` written into the spec's port metadata (`PortMeta`), so a future native target knows which inputs
  it owes and which are web-only. Cost: (a) plus a field. It leaves the geometry grading of (b) for later and closes no
  door to it.
- **(c) Stop at research.**

## 6. What the measurement suggests

The neutral subset is not the hard part: the templates already live inside it, with `flexWrap` the one real gap
(SwiftUI needs a custom `Layout` for a wrapping row). What a neutral model could not grade is the 185 KB of CSS beside
the parameters. That is an escape-hatch question, and it is the bigger exposure if NodeGX ever targets native.

**Recommended: (b′)** — the logic for all 19 now (it is T1-shaped, and the harness exists), with every input's class
recorded in the spec so the layout contract is written down. Geometry grading (b) comes after NSP-017 has said what a
`CSS Definition` sheet is, because until then a geometry assertion can be overridden by a sheet it does not read.

**Ruled R10 (Richard, 2026-10-03): (b′), "Logic + record each setting's portability".**

## 7. Not measured here

- Hover, press and focus states: the visual-states parameters. These are not in `inputs` and need their own census.
- Animation and transitions on visual nodes.
- How much of each sheet a native target would need: the rules are counted, not read one by one.
