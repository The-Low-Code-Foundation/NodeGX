# ISL-011 — A kit node keeps the display its author gave it

**Status: 🟡 built on the recommended route (1a + 2a), session 2 (2026-10-02) — AC1 measured both ways, AC2 gated, AC3's page and export arms read, AC5 censused (0 conflicts); s3: AC3's port-write-after-mount arm driven (the grid survives); owed: AC3's canvas arm, AC6 (ISL-025 W13's ruling).** **Source:** [the island audit](AUDIT-2026-10-01.md) row
**F15** · found by P105 [CG-001](../phase-105-the-coding-garden/CG-001-THE-KIT.md) §7.1 item 1, the first page drive,
2026-09-27 · **Side:** product (React bridge, node-kit types and docs, scaffold; the export's half is P84 **P40**)

The garden kit's world drew as one flat green rectangle. Its 48 tile buttons were on the page at zero size. The kit's
stylesheet said `display:grid` on the world's class, but an inline `display:block` arrived through `props.style` and
won, as an inline style always beats a class rule. Nothing logged.

## 1. The person sentence

**A kit author says once how their node lays out its own insides, and that is what draws: in the editor canvas, on a
deployed page and in an exported app.**

## 2. What was measured

Read at HEAD `27d891bf3`, 2026-10-01, by the author of this file. Nothing was run.

| reading | where |
|---|---|
| `defaultCss` is copied into one `startStyle` per node type at definition. Re-read at HEAD | `noodl-viewer-react/src/react-component-node.ts:989`, `:994` |
| The declared defaults of `inputCss` ports go into the same `startStyle` (or a tagged one). Re-read at HEAD | `react-component-node.ts:996-1020` |
| Each instance starts with `this.style = Object.assign({}, startStyle)`. Re-read at HEAD | `react-component-node.ts:1066` |
| The bridge hands `this.style` to the kit's component as `props.style`. A React parent's `style` is merged over it. Re-read at HEAD | `react-component-node.ts:824-834`, `:851` |
| 🔴 **A later style write skips React.** `setStyle` writes straight onto `element.style` (`setStylesOnDOMNode`) unless the property is on a short force-render list (opacity edges, `position`, `flexDirection`, `clip`, margins under a % size). So a value the component worked out at render can be overwritten on the DOM by a later port write, and put back at the next render. The **CSS Style** input (`styleCss`) goes this way too, through `updateAdvancedStyle`. Re-read at HEAD | `:1547-1636`, `:917-932`, `:1153-1166`, `:1274` |
| 🔴 **The `display:block` was the kit's own, not the bridge's.** At the kit's first commit `f7d3ab33f`, the `Garden` node declared `defaultCss: { display: 'block' }` (line 1239 there), and its stylesheet said `.gd-world{…display:grid…}` (line 980). The world spread `props.style` last. The bridge adds no `display` when a kit gives no `defaultCss` (`defaultCss = {}`, `:989`). **So the audit's "the bridge seeds `display:block`" does not hold as written.** What does hold: whatever an author puts in `defaultCss` reaches the root as an inline style, which beats every rule in the kit's own stylesheet, and nothing the author reads says so. Re-read at HEAD (`git show`) | `git show f7d3ab33f:library/modules/garden-kit/src/kit.js` |
| **The docs send display to `defaultCss`.** "If it is what makes the node a box at all — `display: flex`, `flexDirection` — it is structure, and it belongs in `defaultCss`." Every sample puts `style: props.style` on its root. The page never says that `props.style` is inline, or that it beats a stylesheet. Re-read at HEAD | `docs-site/docs/custom-nodes.md:147-149`; samples `:52`, `:252`, `:529` |
| The types say only *"Styles applied to every instance before any input is set."* Re-read at HEAD | `nodegx-node-kit-types/src/index.d.ts:787-788` |
| The scaffold's example node puts `display: 'flex', flexDirection: 'column', borderStyle: 'solid'` in `defaultCss`. Re-read at HEAD | `nodegx-kit-scaffold/src/index.js:544` |
| **Census of shipped kit `defaultCss`:** game-kit 4 (`inline-block`, `block`, `inline-flex`, `flex`), nightbook-kit 2 (`block`), garden-kit 3 (`block` ×2, `grid`), garden-3d-kit 1 (`block`). Whether each kit's stylesheet also sets `display` on the same root was **not counted** (AC5). Re-read at HEAD | `grep -n defaultCss library/modules/*/src/*.js` |
| **The workaround the kit carries at HEAD.** The world's style is built as `Object.assign({grid…}, props.style)`, then `display` is forced to `grid` unless it is `none`, and `defaultCss` is now `grid`. ⚠️ So a person who types `display: flex` into the node's CSS Style input sees it written on the DOM, then undone at the next render. Re-read at HEAD | `library/modules/garden-kit/src/kit.js:1932-1944`, `:1970` |
| No product code writes `display: 'none'` to a node: `grep -rn "display: 'none'" packages/noodl-viewer-react/src` → 0. The kit's "keep the graph's `display:none`" branch serves only a CSS Style the person typed. Re-read at HEAD | as cited |
| **The export does the opposite.** `nodegx-export`'s `parse/kitSource.ts` and `emit/kits.ts` contain neither `inputCss` nor `defaultCss` (grep → 0 in both). In an exported app a kit's `defaultCss` does not exist at all. P84 **P40**, owner **UNOWNED**. Re-read at HEAD | `nodegx-export/src/parse/kitSource.ts`, `src/emit/kits.ts`; [P84 register](../phase-84-the-defects-the-field-report-found/DEFECTS-THE-FIELD-REPORT-FOUND.md) line 175 |
| The drive's readings (48 cells, zero size, the robot the only thing on screen). **As recorded 2026-09-27, not re-driven** | CG-001 §7.1 item 1 |

## 3. Where it bites a person

- Any hand-written kit that styles its root with a class from its own stylesheet string, which is the natural shape
  once a node draws more than one element, **and** follows the docs by putting structure in `defaultCss`. The two
  disagree and the inline value wins. A grid, a flex row or a sticky header silently collapses.
- The same node renders three ways. The canvas and a deployed page use `defaultCss` inline. An exported app has no
  `defaultCss` at all (P40). The kit's stylesheet is a third opinion.
- A kit that "fixes" it the garden way, by forcing its own value after the merge, takes the property away from the
  person using the node (the CSS Style input stops working for it).

## 4. Related work and collisions

- **P84 [P40](../phase-84-the-defects-the-field-report-found/DEFECTS-THE-FIELD-REPORT-FOUND.md)** (🔴 UNOWNED): the
  export reads no `inputCss` or `defaultCss`. Any sentence this task writes about `defaultCss` is false in an exported
  app unless P40's `defaultCss` half is fixed or the sentence says so. 🔴 This task either takes that half or names it.
- **P88 [GAM-017](../phase-88-the-defects-the-games-found/GAM-017-A-KIT-NODE-TAKES-A-SIGNAL-AND-A-SIZE-THE-WAY-A-BUILT-IN-DOES.md)** ✅:
  R17 ruled size by a wrapping Group (z3), not `frame`. It never touched `defaultCss` precedence.
- **P88 [GAM-014](../phase-88-the-defects-the-games-found/GAM-014-A-KIT-NODE-DRAWS-WHEN-IT-IS-THE-WHOLE-COMPONENT.md)** ✅
  (register **D53**): a kit node as a component's root. Different defect, same root element.
- **P69 [CN-007](../phase-69-the-node-you-write-yourself/CN-007-THE-DOCS-PAGE-THAT-REPLACES-THE-BROKEN-ONE.md)** ✅: the
  docs page. Its gate `nodegx-node-kit-types/tests/docsamples.test.js` compiles every complete sample and **counts**
  the fragments. A new sample changes that count deliberately.
- **P30 [NDA-016](../phase-30-node-library-audit/NDA-016-LAYOUT-SIZEMODE.md)**: built-in nodes (`group.ts`, `text.ts`,
  `image.ts`, …) use the same `defaultCss` route through the same bridge. Nothing here may change their behaviour.
- **[ISL-015](ISL-015-A-KIT-AUTHOR-READS-THE-TRAPS-BEFORE-MEETING-THEM.md)**: this trap is one of its rows. The fix
  lives here; ISL-015's gate checks the words are where an author reads.
- Owner grep: `grep -rlai --include='*.md' "defaultCss" dev-docs/tasks` → 11 files (P9, P18 EXP-011, P30 ×4, P54,
  P84 ×2, P95, P105). None owns kit `defaultCss` precedence. P95's is about `group.ts` writing `position: relative` inline.

## 5. Design — 🔒 rulings first

[README §5](README.md) puts this task in slice 0, with no ruling. That holds for the recommended route: (1a) and (2a)
below change no behaviour on a page, only what an author reads and what an exported app draws. **Build (1a) and (2a)
without waiting.** The two questions are written out so that (1b), which changes every kit's look, is never taken on
the way past. If Richard prefers (1b) or (2b), he says so and §6 is re-read.

1. 🔒 **What should `defaultCss` mean for a kit node?**
   - **(a) It stays inline, and everything an author reads says so.** The docs, the types, the scaffold's comment and
     the `create_node_kit` README say: "`defaultCss` and `inputCss` reach your root as `props.style`, an inline style.
     It beats any rule in your stylesheet. Set a property in one place, never both." Optionally, a kit check warns
     when a node's `defaultCss` names a property that the kit's own stylesheet string also sets on the class its root
     wears. No runtime change.
   - **(b) It becomes the lowest layer.** The bridge writes a kit's `defaultCss` as a generated class rule, so the
     kit's stylesheet and the person's ports both beat it. The bridge is shared with every built-in (§4), so this has
     to tell kits from built-ins. It changes every shipped kit that relies on `defaultCss` winning today (AC5 counts them).
   - **(c) Docs only:** "put `display` in `defaultCss` and nowhere else", with no check.
   - **Recommendation: (a)**, with the check only if AC5 finds a second kit with the same conflict. The runtime path is
     shared with every built-in node, and (b) has the largest blast radius for a trap that a sentence prevents.
2. 🔒 **Does this task take P40's `defaultCss` half?** (a) Yes: the export's kit shim applies `defaultCss` as the
   page does, so the docs sentence is true everywhere. (b) No: the docs say in a sentence that an exported app drops
   `defaultCss`, and P40 stays UNOWNED. **Recommendation: (a)** for `defaultCss` only (one object, applied once);
   `inputCss` stays P40's.

Constraints, after the rulings:
- Built-in nodes' `defaultCss` keeps its present meaning and order (NDA-016).
- The direct DOM patch in `setStyle` is the hot path for animated `opacity` and `transform`. Do not route it through a render.
- The garden kit's workaround stays until AC6 decides it. Removing it changes four copies of the kit (audit F19).

## 6. Acceptance criteria (on the recommended route; re-read if a ruling differs)

| AC | Clause |
|---|---|
| AC1 | **RED at HEAD, recorded in §8.** A minimal kit in a scratch project, not beside `library/`: one React node whose stylesheet sets `.k{display:grid; grid-template-columns:repeat(4,1fr)}` on its root class, with `defaultCss: { display: 'block' }`, `style: props.style` on the root, and four children. Deployed and driven in Chromium, `getComputedStyle(root).display` reads `block` and the four children are stacked. **Known-firing control:** the same kit with `defaultCss` removed reads `grid` with four columns. **Export arm:** the same project exported and built; record what `display` reads there (P40 predicts `grid`, the opposite of the page). |
| AC2 | **The ruled fix.** Under (a), the sentence is in the docs page, the types comment, the scaffold comment and the scaffold README, and ISL-015's gate grades each. The optional check, if built, names the node, the property and both values. **Reverted arm:** remove the check and a fixture with the conflict is no longer reported, by name. |
| AC3 | **Person sentence, on a deployed page and in the editor canvas.** A kit written the way the updated docs show lays out as a four-column grid in the canvas, on a deployed page and (under ruling 2a) in an exported app. Screenshots taken and looked at. Then a port write after mount (change the node's opacity) does not lose the grid. |
| AC4 | **Sabotage arm for ruling 2a.** Remove the export shim's `defaultCss` line and AC3's export reading changes, by name. |
| AC5 | **Blast radius.** For every `reactNodes` definition under `library/modules`, list its `defaultCss` properties and whether that kit's stylesheet sets the same property on the root's class. Each module is read in its own project (D41). Record the list before and after; under (b), every row whose look changes. |
| AC6 | **The garden workaround.** Decide whether `kit.js:1932-1944` stays. If it goes, CG-001's gate row ("`display:block` in, `display:grid` out") and the page drive's THE LOOK clause are re-read, both still green, and the person's CSS Style `display` is no longer undone at the next render. |

## 7. Traps

- 🔴 **Read the computed style, not `props.style`.** An assertion on the props grades the bridge's input, not the
  page. Read `getComputedStyle` on the element a person sees.
- 🔴 **The DOM patch bypasses render.** A fix that only changes what render returns can be undone by the next port
  write, then put back at the render after. Drive a port change after mount (AC3).
- A React parent's `style` beats the node's own (`:828-834`; `Drag` does this). Do not read that as this defect.
- The canvas and a deployed page share the bridge. The export does not (P40). Three readings, never one standing in for another.
- `docsamples.test.js` counts fragments. A new sample is either complete, and compiled, or a counted fragment.
- Rebuilding garden-kit changes `src`, the built `index.js`, the module's `project/` copy and the template's
  `noodl_modules` copy (audit F19). The template must still regenerate byte-identical apart from the kit.

## 8. Record

### Session 2 — 2026-10-02, P109 s2, on `cline-dev` from `68b1549f5`

**AC1, measured before any change, both ways.** The minimal kit is `packages/nodegx-export/tests/fixtures/isl011-kit-grid`
(`isl011.World`: root class `.isl011-k{display:grid;grid-template-columns:repeat(4,1fr)}`, `defaultCss: { display: 'block' }`,
`style: props.style` on the root, four cells; `isl011.WorldBare` the same component with no `defaultCss` — the
known-firing control on the same page). Deployed with `nodegx deploy … --allow-development-engine` (exit 0) and driven in
headless Chromium by `scripts/devtools/drive-isl011-kit-display.js`:

| node | computed `display` | `grid-template-columns` | inline `style.display` | cells | rows |
|---|---|---|---|---|---|
| `World` (defaultCss block) | **`block`** | `repeat(4, 1fr)` (declared, inert) | `block` | 4 | **4** (stacked, 320 px wide each) |
| `WorldBare` (control) | **`grid`** | `77px 77px 77px 77px` | `` | 4 | **1** (side by side) |

0 console errors; the kit registered both nodes. So the page does what §2 predicted: the inline `defaultCss` beats the
class rule, and nothing says so. **Export arm, at HEAD:** the emitted kit runtime handed the component no `style` at all
(`emit/kits.ts` `componentProps = { ...node.props, ...params }`), so `World` read `inline: ''`, `computed: grid` — the
opposite of the page, as P40 predicted.

**Ruling 1a, built.** The sentence is on all four surfaces an author reads: `docs-site/docs/custom-nodes.md` (a
`:::caution` block after "it belongs in `defaultCss`"), `nodegx-node-kit-types/src/index.d.ts` (the `defaultCss` field's
comment), the scaffold's example node comment and its generated README (`nodegx-kit-scaffold/src/index.js`). **AC2's
gate:** `nodegx-node-kit-types/tests/isl011-default-css-is-inline.test.js` — 6/6; it reads each surface by name and its
known-firing control is that each still names `defaultCss`. The optional kit check is **not built**: AC5 found no second
conflict (below). `docsamples.test.js` is unchanged (the new block is prose, no counted fragment).

**Ruling 2a, built.** `emit/kits.ts`: `componentProps.style = { ...definition.defaultCss, ...componentProps.style }` —
the page's order (the definition's defaults first, then what was set). Spec
`nodegx-export/tests/isl-011-default-css-reaches-an-exported-kit.test.ts` (GAM-017's jsdom harness over the fixture): the
emitted page typechecks; `WorldBare` → `inline '' / computed grid` (control); `World` → `inline block / computed block`;
a graph `style: { display: 'grid' }` on `World` still wins (`grid`). 4/4. `inputCss` is still not read by the export —
P40's other half, named in the P84 register row (annotated: `defaultCss` half → ISL-011).

**AC3:** the deployed page and the exported app now read the same `block` for the same kit (above). **Owed:** the editor
canvas arm (the same bridge as the page, so predicted `block`, not measured), and the port-write-after-mount drive
(§7's second trap).

**AC5, the census** (every `reactNodes` `defaultCss` under `library/modules`, read against the kit's own stylesheet):

| kit | `defaultCss` | root class | stylesheet sets `display` on that class? |
|---|---|---|---|
| game-kit | 4 (`inline-block` Avatar, `block`, `inline-flex`, `flex` Pad) | — | no class rule sets `display` anywhere in the kit; the Pad writes `flex` inline itself (consistent) |
| garden-kit `kit.js:786` BlockList | `block` | `gd-blocks gd-band…` | no (`.gd-prog`/`.gd-palette` are inner elements) |
| garden-kit `kit.js:2311` Garden | `grid` | `gd-world` | yes, `grid` — **consistent since the s1 workaround set both to grid**; the force at `:2283` stays (W13) |
| garden-kit `blocks.js:2666` Blocks | `block` | `gd-blocks gd-bk gd-band` | `.gd-bk{display:block}` — consistent |
| nightbook-kit `:1292`, `:1526` | `block`, `block` | `nb-item…`, none | no |
| garden-3d-kit `:3192` Garden3D | `block` | `gd3-world` | no (`.gd3-canvas` etc. are inner) |

11 entries, 5 kits, **0 conflicts at HEAD** (example-node-kit, keyboard-shortcuts, nodegx-charts declare none). The one
conflict this task came from was already papered over in the garden kit; under (1a) nothing's look changes.

**A pre-existing red met on the way:** editing the types made GAM-015's copy gate (`nodegx-kit-scaffold/tests/types-copy.test.js`)
the thing to re-run, and it read **8 failed at HEAD** before the edit (control: `typesCopyStatus` over `git show HEAD:…game-kit/types/node-kit.d.ts`
→ `current: false`): the seven shipped copies were stale since 09-17 and the known-firing count said 5 for 7 kits. Refreshed
(stamp kept, body = the published types), `templates/bot-garden`'s three module copies regenerated with them, the count
gate now names the kits; 76/76. Filed `dev-docs/bugs/p109-s2-gam015-…md`. nightbook's, rocket-school's and
digital-bricks-training's own copies are left to their templates (GAM-015 leaves rocket out on purpose).

**AC4 (the shim removed, export reading changes by name):** see the end of this record.

**Ledger:** P109-F15 → `fixed` (this session's commit); P84 P40's owner cell annotated.

**AC4, run after the drive** (`componentProps.style = …` removed from `emit/kits.ts`, `cp` snapshot restored
`cmp`-identical): **1 red by name** — *"ruling 2a: defaultCss reaches the root as an inline style in the exported app"* —
with the control, the page check and the graph-style row still green; 4/4 again after the restore.

**Owed, with why:** AC3's canvas arm (needs `run-editor`, a heavy job the drive set held the box for), the
port-write-after-mount drive (the same), AC6 (ISL-025 W13's ruling, asked when W13 is next).

### Session 3 — 2026-10-02, P109 s3: AC3's port write after mount

`isl011-port-write/` in this folder: a copy of `nodegx-export/tests/fixtures/isl011-kit-grid` (the export corpus
fixture stays as it is — HLS-001 pins it) whose kit nodes also declare an `opacity` style input (`inputCss`), and a
Function that writes `0.5` to both 300 ms after load. `validate:project` 0 errors (the kit's new port read). Deployed with
`nodegx deploy` (exit 0) over the 14:01 bundle and read 1.5 s after load by `drive-isl011-kit-display.js --settle 1500`
(the drive grew `--settle`, `--shot`, and `opacity` / `wrote` in its readings):

| node | the write landed | computed `display` | inline `display` | cells' rows |
|---|---|---|---|---|
| `WorldBare` — the kit written as the updated docs say (no `display` in `defaultCss`) | `opacity 0.5`, inline | **`grid`** | — | **1** (four columns) |
| `World` — `defaultCss: { display: 'block' }` | `opacity 0.5`, inline | `block` | `block` | 4 (stacked, as documented) |

**The grid survives a style write after mount** (`setStyle`'s direct DOM patch writes only the property it was given).
Screenshot looked at: both faded, the docs-way node four across, the other stacked. 0 console errors.

**Still owed:** AC3's editor-canvas reading (`run-editor`, a heavy job), AC6 (ISL-025 W13's ruling).
