# ISL-052 — A scrolling Group lays out as it does without the scroll

**Status: ✅ s37 (2026-10-09): 7 of 7 fixed — C152, C153, P109-S37-ISCROLLALIGN `0859bbbde` (§5); C154, P109-S37-FILLCAP,
ISCROLLPERCENT, CENTRECUT `afac7de50` as ruled (§6). The model's half (P109-S37-SCROLLROOM) fixed by P107 `fd6385beb`.** Scoped s37 at
`f1ad13e2e`. **Source:** P107 NSP-016 s70–s71 (C152, C153, C154, handed over under R16) and what this session measured beside
them. **Side:** noodl-viewer-react (`Group.tsx`, `layout.ts`, `react-component-node.ts`), the layout check
(`packages/nodegx-node-spec/tests/layout-check.test.ts`, `layout-fixtures/`, `scripts/node-spec/layout-measure.js`).

ISL-038 (the Group's earlier task) is closed; these are a different subject: the scroll, both of its paths.

## 1. The person sentence

**A Group that scrolls lays its children out as a person expects: the gap, the alignment and the sizes they set, the same
with Native platform scroll on or off, and a list that is too long starts where scrolling reaches it.**

## 2. The rule (ruled 2026-10-09)

Richard, after a worked demo of three screens (a checkout, onboarding slides, an inbox), each built the obvious way, the
working version beside today's: *"That's clear, deffo fuck the way NodeGX works today, go with your way on the left."*

> **Inside a scrolling Group the room is the visible window, unless the content is longer, and then the content wins.**

So: a share (a % along the scroll, Fixed not ticked) fills what the window leaves and is never shorter than its content; a
Fixed % is a % of the window; centre and end apply only to what fits. The first two questions put to him (abstract boxes,
then the same in three columns) did not land: "I still don't understand … all the solutions look confusing and stupid." What
did was one realistic screen per case, the working phone beside today's, opened in the state that shows the fault.

## 3. The bugs

| bug | severity | status | build | what a person sees |
|---|---|---|---|---|
| [P107-C152](../../bugs/p107-c152-a-scrolling-group-with-native-scroll-off-drops-its-gap.md) | medium | **fixed** `0859bbbde` | as proposed | With Native platform scroll off, the gap disappears |
| [P107-C153](../../bugs/p107-c153-a-scrolling-group-with-native-scroll-off-clips-nothing.md) | medium | **fixed** `0859bbbde` | as proposed | With it off, children past the bottom are drawn over the page and take presses |
| [P109-S37-ISCROLLALIGN](../../bugs/p109-s37-iscrollalign-a-scrolling-group-with-native-scroll-off-loses-its-alignment.md) | medium | **fixed** `0859bbbde` | found s37 | With it off, a centred list moves to the edge |
| [P107-C154](../../bugs/p107-c154-a-percent-child-of-a-native-scrolling-group-grows-into-the-visible-height.md) | low | **fixed** `afac7de50` | ruled 2026-10-09 | The two paths size a % child differently |
| [P109-S37-FILLCAP](../../bugs/p109-s37-fillcap-a-fill-the-rest-section-in-a-scroll-stops-at-the-window-and-its-content-runs-under-the-next.md) | medium | **fixed** `afac7de50` | ruled | A long "fill the rest" section runs under the next item |
| [P109-S37-ISCROLLPERCENT](../../bugs/p109-s37-iscrollpercent-with-native-scroll-off-a-percent-is-of-the-children-added-up-not-the-window.md) | medium | **fixed** `afac7de50` | ruled | With it off, 100% slides come out the wrong width |
| [P109-S37-CENTRECUT](../../bugs/p109-s37-centrecut-a-scrolling-group-set-to-centre-cuts-off-the-start-of-a-list-longer-than-the-window.md) | medium | **fixed** `afac7de50` | ruled | A centred list too long for the window loses its top for good |
| [P109-S37-SCROLLROOM](../../bugs/p109-s37-scrollroom-the-layout-model-reads-a-scroll-as-endless-the-ruling-says-the-window.md) | low | **fixed** `fd6385beb` (P107) | ruled | The layout model read a scroll as endless (30 boxes were KNOWN as ROOM) |

**Reach on the shelf: none.** The templates hold one scrolling Group (landing-pages CaseStudy), native, Justify Content at the
start, one child that hugs.

## 4. Acceptance criteria

- **AC1** — every handed-over row re-measured at the session's HEAD before it is built. ✅ (C152, C153 still fired at `f1ad13e2e`.)
- **AC2** — C154 asked in plain words and ruled. ✅ 2026-10-09 (§2).
- **AC3** — every runtime row fixed, measured on headless Chrome, a control red on exactly its tests, one planted variant per
  piece of the change red. ✅ (§5, §6.)
- **AC4** — `node scripts/bugs.js --from P107` lists none of this task's runtime rows as open or needs-ruling. ✅

## 5. Session 37 — the gap, the clip, the alignment (`0859bbbde`)

The inner box the better-scroll path puts the children in copied only the direction and the wrap. Probing it beside C152
found the alignment lost too (a column's cross axis, a wrapping Group's main axis). The box now takes the gap, Align Items and
Justify Content; the Group clips on that path. `scroll-iscroll` re-recorded, `scroll-align` added (column and row, with and
without wrap, each beside its native twin). Control (HEAD's `Group.tsx`): red on exactly the three tests. Planted: without the
gap lines, C152's and the alignment test (that fixture has a gap); without the alignment lines, the alignment test alone;
without the clip, C153's alone. Viewer 1,837 / 1,837.

**Found on the way:** the viewer did not build (P116-ONT-007-viewerbuild, `06ec2d4e7`): three Map iterations in the migration
executor, refused at ES5, and a production webpack with errors writes no bundle — so no viewer fix could be measured. Fixed as
its own commit. P116's next commit repeated it in `targetGoes.ts`; P116 has the fix in its tree (told, and confirmed).

## 6. Session 37 — the rule (`afac7de50`)

Measured before asking, on the runtime at `0859bbbde` (300 × 200 scrollers): a 100% share holding 300 px stopped at 200 on the
native path and its content ran under the footer; with Native platform scroll off a share never filled (40); Fixed 100%
slides were 300 natively and 120 with it off (a % of the three 40 px pictures added up), 50% was 20; a centred 300 px list
started at y −50 on both paths, its top out of reach.

**The change.** A child knows how its parent scrolls along its stacking axis (`parentScroll`: native, iscroll, or nothing for
no scroll, no axis or a wrap — `scrollAlongLayout`), set beside `parentLayout`; the children memo drops when Enable Scroll,
Native platform scroll or Wrap changes, as `setLayout` drops it for the layout. `Layout.size`, along that axis: a share gets
`min-content` as its minimum (an author's min wins); with Native platform scroll off a Fixed % becomes
`calc(var(--ndl-scroll-<dim>) * f)` and a share states no size, starts at 0 and grows (the inner box sizes itself from its
children's stated widths, so a share with a width made the box as wide as the shares). `Group.tsx`: the window is measured (a
ResizeObserver, first at the mount, before the first paint) and handed to the inner box as `--ndl-scroll-width/height`; the inner
box is never shorter than the window along the scroll; centre / flex-end / end become `safe` (asked of `CSS.supports`) on the
Group and the inner box.

**Measured after:** `scroll-fill` short 130 / long 300 with the footer after it, `scroll-slides` Fixed 300 each, shares 100 each,
50% 150, `scroll-centre-long` the first item at 0, `scroll-percent-content` 140, the old `scroll-iscroll` s4 0 as natively — on
both paths, every child where its twin is. The other 17 recordings did not move (only the Page's random parent id).
**Graded:** the layout check 8 / 8 (a test of the rule with fixed numbers on both paths; the inner box's size, which a person
scrolls through, now recorded as `inner`). Control (HEAD's three files): red on the rule's test and on KNOWN. Planted, one at a
time: no min-content — red; a Fixed % of the inner box — green at first (the slides sat in the right places, in a box one
window wide that the scroller could not move past), so the measuring now records `inner` and the test reads it: red; no
window-high inner box — red; no `safe` — red. Viewer 1,837 / 1,837 (with P116's pending `targetGoes.ts` line; without it 5
suites do not run on `cline-dev`), its tsc clean on the three files.

**The model** (P107, R16) still gave a scroller's children endless room: 30 boxes mismatched and were KNOWN as ROOM
(`P109-S37-SCROLLROOM`) — fixed by P107 in `fd6385beb` the same evening (the old model back reddens exactly those 30). The code export follows the model or the runtime as P18 decides; told.

## 7. What s37 learned

- **A ruling asked over abstract boxes is not asked.** Two rounds ("I still don't understand") until the demo was three real
  screens, the working one beside today's, each opened where the fault shows (the checkout scrolled to the bottom). Measure
  every claim on the page first: three of the demo's first captions were wrong until measured.
- **A position check cannot see how far a scroller scrolls.** A Fixed % of the inner box left the slides in the right places
  and the box one window wide: green on every box. The scroller's own extent had to be recorded.
- **A production webpack with errors writes nothing.** A "compiled with 3 errors" build leaves the last bundle on disk, and a
  measurement after it measures the old code. Read the bundle's mtime, not the exit line alone.
