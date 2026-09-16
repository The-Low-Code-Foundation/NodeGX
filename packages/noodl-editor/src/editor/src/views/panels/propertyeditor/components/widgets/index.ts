/**
 * CHR-008 §3.1 — the widgets that have become React components, by the id that dispatches them.
 *
 * `Ports.renderParams` asks this registry for the row's widget id (CHR-007's `describeRows` puts it
 * on the descriptor). A hit is rendered as a component under a stable key; a miss falls back to the
 * old path — `v.render()` into a `createRoot`, hosted by `ControlHost`. So the conversion is one
 * widget at a time with no flag day, and a widget that is not in here behaves exactly as before.
 *
 * 🔴 **A widget may only be added here once nothing reads its row's `.el`.** Four things still do:
 * `TabGroup.render`/`onTabClicked` (append + `style.display`), `VariableInput` (append),
 * `PropListType` (its children's), and FB-021's `revealGateTarget` (the gating row). A converted
 * view has no `el`, and `TabGroup`'s `appendChildEl` guards with `if (el)` — so adding a blocked
 * widget here removes its rows from the panel **silently**. The measured blocked set is
 * `basic`, `boolean`, `color`, `enum`, `numberWithUnits` and `sizeMode`; the census that produced
 * it is in the task file (§10) and re-runnable from `node-catalog.json`.
 */
import type React from 'react';

import type { WidgetId } from '../../model/widgets';
import { TextAreaWidget, type WidgetProps } from './TextAreaWidget';

export { type WidgetProps } from './TextAreaWidget';

/**
 * 🔴 **EMPTY ON PURPOSE — the `textArea` conversion is BUILT BUT NOT SHIPPED (CHR-008 §10.8).**
 *
 * `{ textArea: TextAreaWidget }` is the one line that turns it on, and it is commented out rather
 * than deleted because everything else about the slice is finished and driven: the component path
 * renders (0 `ControlHost` in the row against 43 on the panel), a real keystroke commits on blur, a
 * no-op blur writes no undo entry, and the textarea element survives a rebuild with its caret.
 *
 * What it does NOT do is re-seed after an undo. Measured as a control pair on one node, one varied
 * thing — which row:
 *
 * | row | after undo | agreed |
 * |---|---|---|
 * | legacy `fontSize` (createRoot + ControlHost) | field follows the model | ✅ 250 ms |
 * | converted `text` (this component) | model reverts, field keeps the typed text | 🔴 no, 4000 ms |
 *
 * The legacy path re-seeds by construction — a fresh `createRoot` every render — while this one
 * relies on React reconciling and `PropertyPanelTextArea`'s `useEffect([value])` firing. The
 * textarea element is provably never replaced (a marker survives the undo), so the component is
 * re-rendering without a changed `value`, or not re-rendering at all. Diagnosing that needs a
 * render counter in the widget and a dev rebuild; it is the next session's first job.
 *
 * Shipping it as-is would mean the Text node's text field silently stops following Cmd+Z, which is
 * a worse defect than the `ControlHost` div this slice removes. Turning it back on is one line.
 *
 * 🔴 **A row class must keep a working `render()` for as long as its widget can be registered.**
 * Turning this entry off is only a real fallback if `TextAreaType` can still draw itself. The first
 * attempt had reduced that class to `fromPort` plus a redraw signal — so with the registry empty,
 * `renderParams` called `v.render()`, got an `undefined` element, and `ControlHost` hosted an empty
 * div: the Text row drew **nothing**, silently, exactly as `appendChildEl` would have swallowed it.
 * The class was restored from `HEAD` and the panel re-measured (44 rows, 44 hosts, 1 textarea, undo
 * re-seeding in 250 ms). Reduce a row class only once its registry entry is permanently on.
 */
export const WIDGET_COMPONENTS: Partial<Record<WidgetId, React.ComponentType<WidgetProps>>> = {
  // textArea: TextAreaWidget
};

/** Kept referenced so the component and its specs cannot rot while the registry entry is off. */
export { TextAreaWidget };
