# HLT-005 — verdict, 2026-09-21 (session 6)

**The comment field wraps inside the panel. 0px of reachable horizontal scroll on a driven
session, in all four cells; control 1,253px and 497px on the identical build.**

| cell | scrollport | bar width — fixed | bar width — control | `scrollLeft` fixed / control |
|---|---|---|---|---|
| dark, panel at min (240px) | 224px | **224px** | 1,489px | **0** / 1,253 |
| dark, panel at max (996px) | 980px | **980px** | 1,489px | **0** / 497 |
| light, panel at min | 224px | **224px** | 1,489px | **0** / 1,253 |
| light, panel at max | 980px | **980px** | 1,489px | **0** / 497 |

Instrument: `scripts/devtools/drive-hlt005-comment.js` — `--arm fixed` **34/34**, `--arm control`
**27/27**, both on the build that is being committed, on a copy (`HLT-005 Comment Drive`) of
`leg001-comment-measure`. Fixture: a 264-character single-line comment — an ordinary note, and
long enough to beat the panel at its **widest**, which the first fixture was not (see below).

## The fix

`NodeComment.tsx:145` lost its inline `style={{ flex: '0 0 auto' }}`; `.property-comment-bar` in
`propertyeditor.css` gained `flex: 1` and `min-width: 0`.

Two declarations, because there are two routes by which a flex item's width can be a function of
its own content and the bar had both open:

1. **`flex: 0 0 auto`** — basis `auto` resolves to the max-content width (the full unwrapped
   longest line of the `pre-wrap` mirror, which has no `max-width`) and `flex-shrink: 0` forbids
   coming back to the scrollport. `flex: 1` is basis 0: the width cannot be content-derived at all.
   It is also the declaration the **Properties tab beside it** already used and never overflowed.
2. **the automatic minimum size** — even at basis 0, a flex item's used `min-width` is `auto`, i.e.
   its min-content width, and `overflow-wrap: break-word` does **not** reduce intrinsic size. This
   is the route the 200-character unbroken run takes: 1,069px of overflow on the control, 0 fixed.

It moved from the element to the stylesheet deliberately. **The inline declaration is why this was
not fixable from the file that describes the row**, and why it could sit in six of P92 CHR-009's
"Left" lists without anyone closing it: an inline style wins the cascade, so no rule in
`propertyeditor.css` could ever have governed this element.

## §2 was right — the first time in six

🔴 **Five task files in this phase have been materially wrong and the correction was the work each
time. This one measured true.** `NodeComment.tsx:145`, the `flex: 0 0 auto`, the row flex container
at `ScrollArea.module.scss:39`, the `pre-wrap` mirror with no `max-width`, the 184px vertical cap,
the Properties tab as the control in the same file — every claim held under measurement.

Two things to add to it rather than correct:

- ⚠️ §2's *"`> * { min-width: 0 }` cannot help"* is exactly right and the drive confirms the
  mechanism: `min-width` computed to **`0px`** on the broken build and the bar still rendered
  1,489px, because `flex-shrink: 0` never shrinks. But it is **not** therefore useless — once the
  shrink is restored it is what stops an unbreakable word, which is why the fix states it locally
  rather than leaning on a container in another package.
- ⚠️ The mirror does carry `overflow-wrap: break-word` already (`propertyeditor.css:694`), which
  §5's landmine anticipates: it makes a long word *break* once the box is bounded, and does nothing
  to the box's own intrinsic width.

## AC3 — the trade that was available, counted

A width fix that broke the mirror's height measurement would have traded one defect for another.
Graded in the same instrument, on both arms: two lines → **48px**, thirty lines → **184px**, cap
intact, and the textarea still matching the mirror it is positioned over to the pixel (184 vs 184).
Unchanged from the control. The mirror was not touched; §5's landmine is why.

## 🔴 Three instrument faults, each of which printed a verdict first

The fourth, fifth and sixth in this phase ([[an-instrument-must-be-armed-before-it-measures]]).

1. **The drive dragged the wrong divider, and reported "min" and "max" about one width.**
   `root.querySelector('[class*="FrameDivider-module__Divider"]')` finds the **canvas/preview**
   divider, not the panel's: a `FrameDivider` renders its own `Divider` *after* `Container2`, and
   `Container2` holds the nested one, so the nested Divider is first in document order. All four
   readings came back at the same 312px scrollport while the run printed two different widths.
   Fixed by taking the **direct child**. Verified: 224px and 980px, as `useSidePanelLayout`'s
   `MIN_PANEL_WIDTH` and `viewportWidth − RAIL_WIDTH − MIN_CANVAS_WIDTH` predict.
2. **The fixture was too short for the claim it made.** At 139 characters the line renders 796px —
   which **fits** the 980px scrollport the panel has at its maximum — so the control arm at `max`
   read "no overflow" and was scored a *failure to fire*. It was neither. The defect is a function
   of content against panel width, and AC1 says min **and** max, so the fixture has to beat the max.
   [[a-budget-measured-on-a-fixture-is-a-budget-on-the-fixture]], in the fixture's own length.
3. **`THE NUMBER` passed on a run that measured nothing.** A hot-reload crash left the panel blank
   in all four cells; every reading was `undefined`, and `Math.max(a, undefined || 0)` is `0`, so
   the drive printed *"✓ THE NUMBER — reachable horizontal scroll ... dark-min=undefined"*. **A
   missing measurement reads exactly like a clean one.** The drive now asserts four cells produced
   a reading before it is allowed to report a zero
   ([[a-window-opened-after-the-event-attributes-nothing]]).

⚠️ **And one arm that looked like a fault and was the defect.** The reach arm hit-tested the
field's **centre** and failed at HEAD: `elementFromPoint` returned
`VisualCanvas-module__Webview`. That is correct — a 1,489px field inside a 378px panel has its own
middle out over the canvas. The arm was split rather than relaxed: a point 6px inside the field's
left edge is the *precondition* (the field is really on screen and touchable), and the centre is an
*acceptance reading* (the middle of the field is inside the panel). Both pass fixed; the centre one
is red on the control at min width.

## ⚠️ Editing editor `src/` while a drive holds the property panel open crashes it

After the two source edits, HMR remounted `PropertyEditor` into
`TypeError: Cannot read properties of undefined (reading 'type')` at
`propertyeditor/index.tsx`, and the error boundary took the whole side panel. **It is a hot-reload
artefact, not this change** — ruled in rather than assumed: a clean reload of the same build drives
34/34. A drive taken straight after a source edit, without a reload, is reading a renderer that no
longer matches either build.

## Gates — both, as README §7 requires

```
typecheck:editor            0
typecheck:editor-tests      0
test:main                   529/529 suites, 8450/8450 tests   (HEAD was 528/8439 — the delta is
                                                               exactly this task's suite, 11 specs)
test:ci                     3036 specs, 8 failures BY NAME    (3 SUB-006, 3 SUB-011, 2 NDA-017),
                                                               seed 30414 — the floor
lint:ci                     876 vs 3916 baseline
```

⚠️ `typecheck:core-ui` remains red at 45 pre-existing `TS2307`; no file of this task is named.

## AC2 — where each half is graded

`packages/noodl-editor/tests-unit/hlt-005/commentBarWidth.test.ts`, 11 specs, under `test:main`.

🔴 **jsdom has no layout engine**, so a rendered-width assertion in that runner would pass
identically on both builds. The width is measured by the drive; the spec grades the flex algorithm's
one deciding branch as arithmetic over the **real declarations read from the real files**, and is
calibrated by a first `describe` that requires the shipped `flex: 0 0 auto` to report the overflow
the drive photographed. **Mutant proven, not argued**: restoring `flex: '0 0 auto'` inline *and*
dropping the two declarations turns exactly the three AC2 specs red and leaves the calibration and
the anchors green.

The last `describe` fails **loudly** if `ScrollArea`'s `.Container` stops being a row, or the
Comment tab stops wrapping the row in a `ScrollArea` — the containing block this whole suite
reasons about. It throws *"this spec is blind; fix it"* rather than passing vacuously, the shape
`uni-001/session-readers.test.ts` earned in HLT-004
([[a-new-check-can-downgrade-an-existing-one]]).

## Screenshots — AC4

`hlt005-{fixed,control}-{dark,light}-{min,max}.png`, this directory — eight frames. The control
frames show the field running off the right-hand edge of the panel and clipped at the panel
boundary; the fixed frames show the whole 264-character note wrapped into nine lines inside a 240px
panel.

⚠️ **They are on disk, not in git** — `.gitignore:265` excludes `dev-docs/tasks/**/verdicts/**/*.png`,
which is why every earlier verdict in this phase carries `.json`/`.txt` arm records instead. Both
arms' records are committed beside this file: `drive-fixed.{json,txt}` (34/34) and
`drive-control.{json,txt}` (27/27).
