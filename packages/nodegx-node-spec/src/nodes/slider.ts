/**
 * Slider (`net.noodl.controls.range`) — read from `packages/noodl-viewer-react/src/nodes/controls/slider.ts`,
 * `components/controls/Slider/Slider.tsx` (the component), `controls/utils.ts` (the control events and states, the Focus /
 * Blur actions) and `react-component-node.ts` (`initialize` :1245-1322, `defineRegularInputProp` :729-740) on 2026-10-04
 * (NSP-016 s41). Its person face, page model and the shared ports are the Dropdown's (dropdown.ts): what differs is the slide.
 *
 * R3 (a): the runtime wins by default. Every rule below cites the line it was read from.
 *
 * v2 (NSP-023, R12 and R14, 2026-10-05): the spec states what a person gets where v1 copied how React draws. **The handle
 * shows the last value it was given, by a person or by the graph** (R14, Richard: "Why would I not let the node show whatever
 * the last value or signal it received was? Whether it comes from the user or not"); **only a person's slide fires Changed**
 * (the descriptions of Value and Changed — D36); **a Slider hidden with Mounted and shown again is where the person left it**
 * (ruled the same day). What the runtime did instead only because of React was a known row on the runtime target (D36, C73),
 * until P109 ISL-031 fixed it: the node counts the graph's words and the component draws each one without announcing it.
 *
 * v3 (P109 ISL-031, rows C74 and C75, ruled 2026-10-05 "Follow the handle" and "Percent 0, defaults for blanks"): **Value and
 * Value Percent describe the handle as the browser draws it.** A word from the graph, and every paint after Min, Max or Step
 * moved, puts the handle where the browser would hold it — clamped to the range and rounded to the step — and reports it
 * without Changed. v2 copied the node: a Value of 33.5 with Step 1 read 33.5 where the handle sits at 34; a slid handle past a
 * lowered Max kept its Value; Value Percent kept its old figure when Min or Max moved; Min equal to Max read Value Percent NaN;
 * a Min written empty clamped the Value to NaN. A Min or Max re-clamp is no longer a word for the handle (v2: one that moved
 * the author's Value moved a slid handle to it); the attributes are read as the browser reads them, a blank Min or Max as 0 or
 * 100.
 *
 * THE RULE, before the citations. A Slider is an `<input type="range">` drawn invisible (`opacity: 0`, Slider.tsx :108-111)
 * over a track and a thumb it paints itself (:147-175), in a wrapper (:173-186); a PERSON slides it. Four things hold the
 * value:
 *
 *   - **the author's Value** (`props.value`, slider.ts `_setInputValue`): Min at the making, then what the **Value** input
 *     writes — an empty value (`undefined`, `null`, `''`) is ignored, a value `Number` cannot make finite is reported on the
 *     runtime channel and ignored, anything else is kept as the number. Every such write is the graph's word for the handle,
 *     the same value again included (R14; C73, fixed in P109 ISL-031). **Min**, **Max** and **Step** are attributes the
 *     next paint draws; they are no word (v3).
 *   - **the node's value** (`_internal.outputValue`, slider.ts `_reportValue`): 0 at the making; what the **Value** output
 *     reads. A person's slide reports it: sent, and Changed fired, when it differs (`!==`). The paint reports it the same way
 *     and **never with Changed** (D36, fixed in P109 ISL-031). Value Percent is recomputed at every report — `Math.floor((v -
 *     min) / (max - min) * 100)` over the attributes as the browser reads them, 0 when they are equal (v3, C75) — and sent when
 *     it differs.
 *   - **the handle** (`shown`: what the `<input>` is told to hold): a slide moves it; every paint on the page draws it as the
 *     browser would hold it — the graph's word when one is waiting, else where it was — clamped and rounded to the step
 *     against the attributes now (v3, C74), and reports it. A remount finds it where it was (D36).
 *   - **what the browser holds** (the `<input>`'s own value): the shown value sanitized by the BROWSER's range rules against
 *     the attributes as rendered (`min` / `max`, and `step` only when Step is truthy — :116-122): not a number → the middle
 *     (or Min when Max is below it); then clamped to [Min, Max] and rounded to the nearest step from Min (a tie upwards),
 *     stepping back inside when the rounding leaves the range. A slide to the value the browser already holds raises
 *     nothing. Nobody on the wire reads it; the slide's no-change rule does.
 *   - **Enabled**, **the pointer, the keyboard, a click's focus** (utils.ts :157-311 on the `<input>`, Slider.tsx :178),
 *     **Focus** / **Blur** (utils.ts :366-440, the target is the `<input>`), **Mounted** and the look: the Dropdown's. A slide is
 *     a keyboard slide: it puts the keyboard on the element first (the focusing steps), as a Tab does, and a disabled element
 *     takes none — nor does a reversed range (Max below Min), whose sanitization jsdom and a browser disagree on (the face's
 *     choice). The attributes are read as jsdom reads them (HTML's lenient parse: Max wired `[1, 2]` is the attribute `"1,2"`,
 *     a Max of 1); jsdom clamps but never steps, and the face adds the browser's step rule. The node reads the attributes the
 *     same way (slider.ts `browserRangeValue`). A click is a press and a release where the handle already is (the face has no geometry): it moves nothing.
 */

import { defineNode, type Patch } from '../spec';
import { SELF_REFERENCE } from '../trace';
import { controlFocusNotMounted, focusChange, focusDiagnostics, focusMissed } from './focus-not-mounted';

type State = {
  /** utils.ts :75-89 `_internal.enabled` */
  enabled: boolean;
  hover: boolean;
  pressed: boolean;
  focused: boolean;
  /** react-component-node.ts :1267 `wantsToBeMounted` */
  mounted: boolean;
  /** the element's `disabled` attribute follows Enabled at each paint (Slider.tsx :182) — what the Focus and Blur actions meet */
  pageEnabled: boolean;
  /** NSP-016 s43 — Visible as written (node-shared-port-definitions.ts :366-375 `visibility: hidden`) */
  visible: boolean;
  /** NSP-016 s43 — the element's `visibility` as painted: what reaches a hidden element (`reaches`) */
  pageVisible: boolean;
  /** the element holds the keyboard — what the PAGE knows (`focused` is what the node REPORTS) */
  elementFocused: boolean;
  /** the component is on the page: mounted and painted */
  onPage: boolean;
  /** v6 — the last Focus found the node off the page: the editor is told (focus-not-mounted.ts) */
  focusMissed: boolean;
  /** `props.min` / `props.max` / `props.step` as written (react-component-node.ts :729-740: `undefined` deletes the prop) */
  min: unknown;
  max: unknown;
  step: unknown;
  /** slider.ts `props.value` — the author's Value: the graph's last word, as the number */
  authorValue: number;
  /** slider.ts :34 `_internal.outputValue` — the Value output */
  out: number;
  /** slider.ts `_internal.valuePercent` — the Value Percent output */
  percent: number;
  /** the handle: what the `<input>` is told to hold — kept off the page too (a remount finds it where it was) */
  shown: number;
  /** v2 — the graph gave the handle a word the page has not drawn yet (the author's Value, at the next paint) */
  pending: boolean;
};

type O = typeof Slider extends { outputs: infer X } ? X : never;
type Send = Patch<State, O> & { says: string }; // NSP-018 s77: every input patch says its case
type Pulse = 'didMount' | 'willUnmount' | 'pointerDown' | 'pointerUp' | 'onFocus' | 'onBlur' | 'hoverStart' | 'hoverEnd' | 'onChange';
type ValueOut = 'pressedState' | 'focusState' | 'hoverState' | 'value' | 'valuePercent';
type Act = { set?: Partial<State>; send: ValueOut[]; emit?: Pulse[] };

const NONE: Act = { send: [] };

export const Slider = defineNode({
  type: 'net.noodl.controls.range',
  // v4 (P109 ISL-031, P107-C64 ruled "Ignore touches, keep hover"): a finger on a disabled control reports nothing — no Pressed, no Pointer Down or Up — as Enabled promises; the pointer's hover still reports
  // v5 (P109 ISL-031, P107-D30 ruled "Reset and announce"): a control leaving the page (Mounted off) takes Focused, Hover and Pressed with it — each goes false, sent if it was true, with Blurred and Hover End for the ones that were on
  // v6 (NSP-019 R35): a Focus that finds the node off the page shows as its warning until a Focus reaches it (`diagnostics`)
  version: 6,
  changes: [focusChange(6)],
  diagnostics: focusDiagnostics(controlFocusNotMounted('slider')),
  source: 'packages/noodl-viewer-react/src/nodes/controls/slider.ts',
  needs: ['person'],
  // the page's syncs (spec.ts `synced`): not branches — the handle with them
  synced: ['pageEnabled', 'pageVisible', 'shown'],

  // react-component-node.ts :1274-1301 the defaults into props, then slider.ts `initialize`: the author's Value is Min (0),
  // `_reportValue(0)` finds the node's 0 unchanged and Value Percent 0; the making's Value is a word for the first paint (`pending`)
  state: {
    enabled: true, hover: false, pressed: false, focused: false, mounted: true, pageEnabled: true, visible: true, pageVisible: true, elementFocused: false, onPage: false, focusMissed: false,
    min: 0, max: 100, step: 1, authorValue: 0, out: 0, percent: 0, shown: 0, pending: true
  } as State,
  // utils.ts :402-411 `outcomeOutputs({ done, unchanged })` (addFocusActions)
  outcomes: ['done', 'unchanged'],

  acts: {
    hover: { description: 'the pointer moves onto the slider' },
    leave: { description: 'the pointer moves off it' },
    press: { description: 'a mouse button goes down on it' },
    release: { description: 'the mouse button comes up on it' },
    click: { description: 'a press and a release on it where the handle already is, and the click that follows — which moves nothing' },
    touch: { description: 'a finger goes down on it' },
    lift: { description: 'the finger comes up' },
    focus: { description: 'the keyboard is put on it (a Tab reaching it)' },
    blur: { description: 'the keyboard is taken off it (a Tab leaving it)' },
    slide: {
      description: 'the handle is moved to a value — a keyboard slide: the keyboard goes onto the element first; the browser clamps the value to Min and Max and rounds it to the step, and a slide to the value it already holds raises nothing; a reversed range (Max below Min) takes none',
      values: [0, 25, 50, 50.25, 51, 99.5, 100, 150, -10, 7]
    }
  },

  inputs: {
    // ---- logic ----
    // utils.ts :75-89
    enabled: { type: 'boolean', default: true, coerce: 'none', displayName: 'Enabled', group: 'General', description: 'Lets the user interact with this control; when off it still renders and occupies its space but ignores clicks, touches and typing', portability: 'logic' },
    // slider.ts :62-77, :237-271
    value: { type: 'number', coerce: 'none', displayName: 'Value', group: 'General', description: 'Moves the handle to this value, clamped to Min and Max and rounded to the Step; changing it from the graph does not fire Changed. An empty value leaves the handle where it is', portability: 'logic', examples: [30, 50, 0, 100, 120, -5, 33.5, '40', null, ''] },
    // slider.ts :105-115
    min: { type: 'number', default: 0, coerce: 'none', displayName: 'Min', group: 'General', description: 'Value at the far left of the track; the current value is clamped up to it if it is below', portability: 'logic', examples: [0, 10, -20, 40] },
    // slider.ts :116-126
    max: { type: 'number', default: 100, coerce: 'none', displayName: 'Max', group: 'General', description: 'Value at the far right of the track; the current value is clamped down to it if it is above', portability: 'logic', examples: [100, 60, 40, 200] },
    // slider.ts :127-134 — on the element only (Slider.tsx :120-122)
    step: { type: 'number', default: 1, coerce: 'none', displayName: 'Step', group: 'General', description: 'Smallest amount the handle can move by, so the value lands on multiples of it', portability: 'logic', examples: [1, 5, 0.5, 0, 25] },
    // react-component-node.ts :2302-2321
    mounted: { type: 'boolean', default: true, coerce: 'none', displayName: 'Mounted', group: 'General', description: 'Removes the element from the page entirely when false, unlike Visible which leaves its space behind. Wired, it counts as true until the first value arrives, so set it to false here to start hidden (a lock, a private screen)', portability: 'logic', layout: 'present' },
    // utils.ts :366-398
    focus: { type: 'signal', outcome: true, displayName: 'Focus', group: 'Actions', description: 'Puts the keyboard on this slider, so Enter, Space and the arrow keys go to it', portability: 'logic' },
    blur: { type: 'signal', outcome: true, displayName: 'Blur', group: 'Actions', description: 'Takes the keyboard away from this slider, which is what fires Blurred', portability: 'logic' },
    // react-component-node.ts :1380-1395
    scrollIntoView: { type: 'signal', displayName: 'Scroll Into View', group: 'Scroll Into View', description: 'Scrolls the page, or the scrolling Group holding this element, until the element can be seen', portability: 'logic' },
    scrollIntoViewAlign: { type: 'enum', enums: ['nearest', 'start', 'center', 'end'], default: 'nearest', coerce: 'none', displayName: 'Scroll Align', group: 'Scroll Into View', description: 'Where Scroll Into View leaves the element: Nearest edge moves only as far as needed', portability: 'logic' },
    // utils.ts :93-120 — what reaches the nodes around it; a graph scenario's matter
    blockTouch: { type: 'boolean', coerce: 'none', displayName: 'Block Pointer Events', group: 'Pointer Events', description: 'Stops every pointer event that lands on this control from reaching the nodes it sits inside. Blunt: it takes hover and pointer-down with it, so reach for Click Bubbling first if it is only clicks you want to keep in', portability: 'logic' },
    clickBubbling: { type: 'enum', enums: ['auto', 'always', 'never'], default: 'auto', coerce: 'none', displayName: 'Click Bubbling', group: 'Pointer Events', description: "Whether a click on this control also fires Click on the nodes it sits inside. Automatic keeps it here as soon as this control's own Click is connected, so a Favourite button inside a clickable card runs Favourite and not the card; Always is the older behaviour where both run; Never keeps every click here, wired or not", portability: 'logic' },

    // ---- look and layout (R10): stored, written to the style, read by no output; each with its class (visual-params.json) ----
  alignX: { type: "enum", enums: ["left", "center", "right"], coerce: 'none', displayName: "Align X", group: "Alignment", description: "Horizontal alignment of this element within the space its parent gives it", portability: "layout-shared", layout: 'align-x' },
  alignY: { type: "enum", enums: ["top", "center", "bottom"], coerce: 'none', displayName: "Align Y", group: "Alignment", description: "Vertical alignment of this element within the space its parent gives it", portability: "layout-shared", layout: 'align-y' },
  boxSizing: { type: "enum", enums: ["border-box", "content-box"], default: "border-box", coerce: 'none', displayName: "Box Sizing", group: "Margin and padding", description: "Whether Width and Height include this element's padding and border, or only its content", portability: "web-only" },
  cssClassName: { type: "string", default: "", coerce: 'none', displayName: "CSS Class", group: "Advanced HTML", description: "Extra CSS class names to put on this element, for styling from a stylesheet you supply", portability: "web-only" },
  dataAttributes: { type: "stringlist", coerce: 'none', editOnly: true, displayName: "Data Attributes", group: "Data Attributes", description: "data-* names (data-testid) for tests and scripts to find this element by; each gets a value input", portability: "web-only" },
  marginBottom: { type: "number", coerce: 'none', displayName: "Margin Bottom", group: "Margin and padding", description: "Space outside the element's bottom edge, between it and its neighbours", portability: "layout-expressible", layout: 'margin-bottom' },
  marginLeft: { type: "number", coerce: 'none', displayName: "Margin Left", group: "Margin and padding", description: "Space outside the element's left edge, between it and its neighbours", portability: "layout-expressible", layout: 'margin-left' },
  marginRight: { type: "number", coerce: 'none', displayName: "Margin Right", group: "Margin and padding", description: "Space outside the element's right edge, between it and its neighbours", portability: "layout-expressible", layout: 'margin-right' },
  marginTop: { type: "number", coerce: 'none', displayName: "Margin Top", group: "Margin and padding", description: "Space outside the element's top edge, between it and its neighbours", portability: "layout-expressible", layout: 'margin-top' },
  mixBlendMode: { type: "enum", enums: ["normal", "multiply", "screen", "overlay", "darken", "lighten", "color-dodge", "color-burn", "hard-light", "soft-light", "difference", "exclusion", "hue", "saturation", "color", "luminosity"], default: "normal", coerce: 'none', displayName: "Blend Mode", group: "Style", description: "How this element's colours blend with whatever is painted behind it", portability: "look-expressible" },
  opacity: { type: "number", default: 1, coerce: 'none', displayName: "Opacity", group: "Style", description: "How opaque this element is, from 0 for invisible to 1 for solid", portability: "look-shared" },
  paddingBottom: { type: "number", default: 0, coerce: 'none', displayName: "Pad Bottom", group: "Margin and padding", description: "Space inside the element's bottom edge, between it and its content", portability: "layout-shared", layout: 'padding-bottom' },
  paddingLeft: { type: "number", default: 0, coerce: 'none', displayName: "Pad Left", group: "Margin and padding", description: "Space inside the element's left edge, between it and its content", portability: "layout-shared", layout: 'padding-left' },
  paddingRight: { type: "number", default: 0, coerce: 'none', displayName: "Pad Right", group: "Margin and padding", description: "Space inside the element's right edge, between it and its content", portability: "layout-shared", layout: 'padding-right' },
  paddingTop: { type: "number", default: 0, coerce: 'none', displayName: "Pad Top", group: "Margin and padding", description: "Space inside the element's top edge, between it and its content", portability: "layout-shared", layout: 'padding-top' },
  position: { type: "enum", enums: ["relative", "absolute", "sticky", "fixed"], default: "relative", coerce: 'none', displayName: "Position", group: "Layout", description: "How the element is placed: In Layout follows its siblings, Absolute ignores them, Sticky pins to the parent edge on overflow, Fixed stays put and takes no space", portability: "layout-expressible", layout: 'place' },
  styleCss: { type: "string", default: "/* background-color: red; */", coerce: 'none', editOnly: true, displayName: "CSS Style", group: "Advanced HTML", description: "Raw CSS declarations applied to this element, overriding the styling ports above", portability: "web-only" },
  thumbBorderBottomColor: { when: (p) => p.thumbBorderBottomStyle === 'solid' || p.thumbBorderBottomStyle === 'dashed' || p.thumbBorderBottomStyle === 'dotted' || p.borderStyle === 'solid' || p.borderStyle === 'dashed' || p.borderStyle === 'dotted', type: "color", coerce: 'none', displayName: "Border Color", group: "Thumb Border Style", description: "Colour of the bottom edge of the handle you drag only, overriding Thumb Border Color", portability: "look-shared" },
  thumbBorderBottomLeftRadius: { type: "number", coerce: 'none', displayName: "Corner Radius", group: "Thumb Corner Radius", description: "How rounded the bottom left corner of the handle you drag is, overriding Thumb Corner Radius", portability: "look-shared" },
  thumbBorderBottomRightRadius: { type: "number", coerce: 'none', displayName: "Corner Radius", group: "Thumb Corner Radius", description: "How rounded the bottom right corner of the handle you drag is, overriding Thumb Corner Radius", portability: "look-shared" },
  thumbBorderBottomStyle: { type: "enum", enums: ["none", "solid", "dotted", "dashed"], coerce: 'none', displayName: "Border Style", group: "Thumb Border Style", description: "Line style for the bottom edge of the handle you drag only, overriding Thumb Border Style; None hides that edge", portability: "look-shared" },
  thumbBorderBottomWidth: { when: (p) => p.thumbBorderBottomStyle === 'solid' || p.thumbBorderBottomStyle === 'dashed' || p.thumbBorderBottomStyle === 'dotted' || p.borderStyle === 'solid' || p.borderStyle === 'dashed' || p.borderStyle === 'dotted', type: "number", coerce: 'none', displayName: "Border Width", group: "Thumb Border Style", description: "Thickness in pixels of the bottom edge of the handle you drag, which has no effect while that edge's Border Style is None", portability: "look-shared" },
  thumbBorderColor: { when: (p) => p.thumbBorderStyle === 'solid' || p.thumbBorderStyle === 'dashed' || p.thumbBorderStyle === 'dotted', type: "color", default: "#000000", coerce: 'none', displayName: "Border Color", group: "Thumb Border Style", description: "Colour of the border around the handle you drag, which has no effect while Thumb Border Style is None", portability: "look-shared" },
  thumbBorderLeftColor: { when: (p) => p.thumbBorderLeftStyle === 'solid' || p.thumbBorderLeftStyle === 'dashed' || p.thumbBorderLeftStyle === 'dotted' || p.borderStyle === 'solid' || p.borderStyle === 'dashed' || p.borderStyle === 'dotted', type: "color", coerce: 'none', displayName: "Border Color", group: "Thumb Border Style", description: "Colour of the left edge of the handle you drag only, overriding Thumb Border Color", portability: "look-shared" },
  thumbBorderLeftStyle: { type: "enum", enums: ["none", "solid", "dotted", "dashed"], coerce: 'none', displayName: "Border Style", group: "Thumb Border Style", description: "Line style for the left edge of the handle you drag only, overriding Thumb Border Style; None hides that edge", portability: "look-shared" },
  thumbBorderLeftWidth: { when: (p) => p.thumbBorderLeftStyle === 'solid' || p.thumbBorderLeftStyle === 'dashed' || p.thumbBorderLeftStyle === 'dotted' || p.borderStyle === 'solid' || p.borderStyle === 'dashed' || p.borderStyle === 'dotted', type: "number", coerce: 'none', displayName: "Border Width", group: "Thumb Border Style", description: "Thickness in pixels of the left edge of the handle you drag, which has no effect while that edge's Border Style is None", portability: "look-shared" },
  thumbBorderRadius: { type: "number", default: 0, coerce: 'none', displayName: "Corner Radius", group: "Thumb Corner Radius", description: "How rounded all four corners of the handle you drag are; half its width and height makes it a circle", portability: "look-shared" },
  thumbBorderRightColor: { when: (p) => p.thumbBorderRightStyle === 'solid' || p.thumbBorderRightStyle === 'dashed' || p.thumbBorderRightStyle === 'dotted' || p.borderStyle === 'solid' || p.borderStyle === 'dashed' || p.borderStyle === 'dotted', type: "color", coerce: 'none', displayName: "Border Color", group: "Thumb Border Style", description: "Colour of the right edge of the handle you drag only, overriding Thumb Border Color", portability: "look-shared" },
  thumbBorderRightStyle: { type: "enum", enums: ["none", "solid", "dotted", "dashed"], coerce: 'none', displayName: "Border Style", group: "Thumb Border Style", description: "Line style for the right edge of the handle you drag only, overriding Thumb Border Style; None hides that edge", portability: "look-shared" },
  thumbBorderRightWidth: { when: (p) => p.thumbBorderRightStyle === 'solid' || p.thumbBorderRightStyle === 'dashed' || p.thumbBorderRightStyle === 'dotted' || p.borderStyle === 'solid' || p.borderStyle === 'dashed' || p.borderStyle === 'dotted', type: "number", coerce: 'none', displayName: "Border Width", group: "Thumb Border Style", description: "Thickness in pixels of the right edge of the handle you drag, which has no effect while that edge's Border Style is None", portability: "look-shared" },
  thumbBorderStyle: { type: "enum", enums: ["none", "solid", "dotted", "dashed"], default: "none", coerce: 'none', displayName: "Border Style", group: "Thumb Border Style", description: "Line style for all four edges of the handle you drag; None hides the border and leaves its Width and Color inactive", portability: "look-expressible" },
  thumbBorderTopColor: { when: (p) => p.thumbBorderTopStyle === 'solid' || p.thumbBorderTopStyle === 'dashed' || p.thumbBorderTopStyle === 'dotted' || p.borderStyle === 'solid' || p.borderStyle === 'dashed' || p.borderStyle === 'dotted', type: "color", coerce: 'none', displayName: "Border Color", group: "Thumb Border Style", description: "Colour of the top edge of the handle you drag only, overriding Thumb Border Color", portability: "look-shared" },
  thumbBorderTopLeftRadius: { type: "number", coerce: 'none', displayName: "Corner Radius", group: "Thumb Corner Radius", description: "How rounded the top left corner of the handle you drag is, overriding Thumb Corner Radius", portability: "look-shared" },
  thumbBorderTopRightRadius: { type: "number", coerce: 'none', displayName: "Corner Radius", group: "Thumb Corner Radius", description: "How rounded the top right corner of the handle you drag is, overriding Thumb Corner Radius", portability: "look-shared" },
  thumbBorderTopStyle: { type: "enum", enums: ["none", "solid", "dotted", "dashed"], coerce: 'none', displayName: "Border Style", group: "Thumb Border Style", description: "Line style for the top edge of the handle you drag only, overriding Thumb Border Style; None hides that edge", portability: "look-shared" },
  thumbBorderTopWidth: { when: (p) => p.thumbBorderTopStyle === 'solid' || p.thumbBorderTopStyle === 'dashed' || p.thumbBorderTopStyle === 'dotted' || p.borderStyle === 'solid' || p.borderStyle === 'dashed' || p.borderStyle === 'dotted', type: "number", coerce: 'none', displayName: "Border Width", group: "Thumb Border Style", description: "Thickness in pixels of the top edge of the handle you drag, which has no effect while that edge's Border Style is None", portability: "look-shared" },
  thumbBorderWidth: { when: (p) => p.thumbBorderStyle === 'solid' || p.thumbBorderStyle === 'dashed' || p.thumbBorderStyle === 'dotted', type: "number", default: 0, coerce: 'none', displayName: "Border Width", group: "Thumb Border Style", description: "Thickness in pixels of the border around the handle you drag, which has no effect while Thumb Border Style is None", portability: "look-shared" },
  thumbBoxShadowBlurRadius: { when: (p) => p.thumbBoxShadowEnabled === true, type: "number", default: 5, coerce: 'none', displayName: "Blur Radius", group: "Thumb Box Shadow", description: "How soft the shadow edge is; 0 gives a hard edge", portability: "look-expressible" },
  thumbBoxShadowColor: { when: (p) => p.thumbBoxShadowEnabled === true, type: "color", default: "#00000033", coerce: 'none', displayName: "Shadow Color", group: "Thumb Box Shadow", description: "Colour of the shadow, usually a mostly-transparent black", portability: "look-expressible" },
  thumbBoxShadowEnabled: { type: "boolean", coerce: 'none', displayName: "Shadow Enabled", group: "Thumb Box Shadow", description: "Draws a shadow behind the handle you drag; the rest of this group does nothing while it is off", portability: "look-expressible" },
  thumbBoxShadowInset: { when: (p) => p.thumbBoxShadowEnabled === true, type: "boolean", default: false, coerce: 'none', displayName: "Inset", group: "Thumb Box Shadow", description: "Draws the shadow inside the element instead of behind it, for a recessed look", portability: "web-only" },
  thumbBoxShadowOffsetX: { when: (p) => p.thumbBoxShadowEnabled === true, type: "number", default: 0, coerce: 'none', displayName: "Offset X", group: "Thumb Box Shadow", description: "How far right the shadow sits from the element; negative values move it left", portability: "look-expressible" },
  thumbBoxShadowOffsetY: { when: (p) => p.thumbBoxShadowEnabled === true, type: "number", default: 0, coerce: 'none', displayName: "Offset Y", group: "Thumb Box Shadow", description: "How far down the shadow sits from the element; negative values move it up", portability: "look-expressible" },
  thumbBoxShadowSpreadRadius: { when: (p) => p.thumbBoxShadowEnabled === true, type: "number", default: 2, coerce: 'none', displayName: "Spread Radius", group: "Thumb Box Shadow", description: "Grows the shadow outwards before it is blurred; negative values shrink it", portability: "look-expressible" },
  thumbColor: { type: "color", default: "#000000", coerce: 'none', displayName: "Color", group: "Thumb Style", description: "Fill colour of the handle", portability: "look-shared" },
  thumbHeight: { type: "number", default: 16, coerce: 'none', displayName: "Height", group: "Thumb Style", description: "Height of the handle the user drags", portability: "look-shared" },
  thumbWidth: { type: "number", default: 16, coerce: 'none', displayName: "Width", group: "Thumb Style", description: "Width of the handle the user drags", portability: "look-shared" },
  trackActiveColor: { type: "color", default: "#f0f0f0", coerce: 'none', displayName: "Active Color", group: "Track Style", description: "Colour of the part of the track between Min and the handle", portability: "look-shared" },
  trackBorderBottomColor: { when: (p) => p.trackBorderBottomStyle === 'solid' || p.trackBorderBottomStyle === 'dashed' || p.trackBorderBottomStyle === 'dotted' || p.borderStyle === 'solid' || p.borderStyle === 'dashed' || p.borderStyle === 'dotted', type: "color", coerce: 'none', displayName: "Border Color", group: "Track Border Style", description: "Colour of the bottom edge of the bar the handle slides along only, overriding Track Border Color", portability: "look-shared" },
  trackBorderBottomLeftRadius: { type: "number", coerce: 'none', displayName: "Corner Radius", group: "Track Corner Radius", description: "How rounded the bottom left corner of the bar the handle slides along is, overriding Track Corner Radius", portability: "look-shared" },
  trackBorderBottomRightRadius: { type: "number", coerce: 'none', displayName: "Corner Radius", group: "Track Corner Radius", description: "How rounded the bottom right corner of the bar the handle slides along is, overriding Track Corner Radius", portability: "look-shared" },
  trackBorderBottomStyle: { type: "enum", enums: ["none", "solid", "dotted", "dashed"], coerce: 'none', displayName: "Border Style", group: "Track Border Style", description: "Line style for the bottom edge of the bar the handle slides along only, overriding Track Border Style; None hides that edge", portability: "look-shared" },
  trackBorderBottomWidth: { when: (p) => p.trackBorderBottomStyle === 'solid' || p.trackBorderBottomStyle === 'dashed' || p.trackBorderBottomStyle === 'dotted' || p.borderStyle === 'solid' || p.borderStyle === 'dashed' || p.borderStyle === 'dotted', type: "number", coerce: 'none', displayName: "Border Width", group: "Track Border Style", description: "Thickness in pixels of the bottom edge of the bar the handle slides along, which has no effect while that edge's Border Style is None", portability: "look-shared" },
  trackBorderColor: { when: (p) => p.trackBorderStyle === 'solid' || p.trackBorderStyle === 'dashed' || p.trackBorderStyle === 'dotted', type: "color", default: "#000000", coerce: 'none', displayName: "Border Color", group: "Track Border Style", description: "Colour of the border around the bar the handle slides along, which has no effect while Track Border Style is None", portability: "look-shared" },
  trackBorderLeftColor: { when: (p) => p.trackBorderLeftStyle === 'solid' || p.trackBorderLeftStyle === 'dashed' || p.trackBorderLeftStyle === 'dotted' || p.borderStyle === 'solid' || p.borderStyle === 'dashed' || p.borderStyle === 'dotted', type: "color", coerce: 'none', displayName: "Border Color", group: "Track Border Style", description: "Colour of the left edge of the bar the handle slides along only, overriding Track Border Color", portability: "look-shared" },
  trackBorderLeftStyle: { type: "enum", enums: ["none", "solid", "dotted", "dashed"], coerce: 'none', displayName: "Border Style", group: "Track Border Style", description: "Line style for the left edge of the bar the handle slides along only, overriding Track Border Style; None hides that edge", portability: "look-shared" },
  trackBorderLeftWidth: { when: (p) => p.trackBorderLeftStyle === 'solid' || p.trackBorderLeftStyle === 'dashed' || p.trackBorderLeftStyle === 'dotted' || p.borderStyle === 'solid' || p.borderStyle === 'dashed' || p.borderStyle === 'dotted', type: "number", coerce: 'none', displayName: "Border Width", group: "Track Border Style", description: "Thickness in pixels of the left edge of the bar the handle slides along, which has no effect while that edge's Border Style is None", portability: "look-shared" },
  trackBorderRadius: { type: "number", default: 0, coerce: 'none', displayName: "Corner Radius", group: "Track Corner Radius", description: "How rounded all four corners of the bar the handle slides along are; half its width and height makes it a circle", portability: "look-shared" },
  trackBorderRightColor: { when: (p) => p.trackBorderRightStyle === 'solid' || p.trackBorderRightStyle === 'dashed' || p.trackBorderRightStyle === 'dotted' || p.borderStyle === 'solid' || p.borderStyle === 'dashed' || p.borderStyle === 'dotted', type: "color", coerce: 'none', displayName: "Border Color", group: "Track Border Style", description: "Colour of the right edge of the bar the handle slides along only, overriding Track Border Color", portability: "look-shared" },
  trackBorderRightStyle: { type: "enum", enums: ["none", "solid", "dotted", "dashed"], coerce: 'none', displayName: "Border Style", group: "Track Border Style", description: "Line style for the right edge of the bar the handle slides along only, overriding Track Border Style; None hides that edge", portability: "look-shared" },
  trackBorderRightWidth: { when: (p) => p.trackBorderRightStyle === 'solid' || p.trackBorderRightStyle === 'dashed' || p.trackBorderRightStyle === 'dotted' || p.borderStyle === 'solid' || p.borderStyle === 'dashed' || p.borderStyle === 'dotted', type: "number", coerce: 'none', displayName: "Border Width", group: "Track Border Style", description: "Thickness in pixels of the right edge of the bar the handle slides along, which has no effect while that edge's Border Style is None", portability: "look-shared" },
  trackBorderStyle: { type: "enum", enums: ["none", "solid", "dotted", "dashed"], default: "none", coerce: 'none', displayName: "Border Style", group: "Track Border Style", description: "Line style for all four edges of the bar the handle slides along; None hides the border and leaves its Width and Color inactive", portability: "look-expressible" },
  trackBorderTopColor: { when: (p) => p.trackBorderTopStyle === 'solid' || p.trackBorderTopStyle === 'dashed' || p.trackBorderTopStyle === 'dotted' || p.borderStyle === 'solid' || p.borderStyle === 'dashed' || p.borderStyle === 'dotted', type: "color", coerce: 'none', displayName: "Border Color", group: "Track Border Style", description: "Colour of the top edge of the bar the handle slides along only, overriding Track Border Color", portability: "look-shared" },
  trackBorderTopLeftRadius: { type: "number", coerce: 'none', displayName: "Corner Radius", group: "Track Corner Radius", description: "How rounded the top left corner of the bar the handle slides along is, overriding Track Corner Radius", portability: "look-shared" },
  trackBorderTopRightRadius: { type: "number", coerce: 'none', displayName: "Corner Radius", group: "Track Corner Radius", description: "How rounded the top right corner of the bar the handle slides along is, overriding Track Corner Radius", portability: "look-shared" },
  trackBorderTopStyle: { type: "enum", enums: ["none", "solid", "dotted", "dashed"], coerce: 'none', displayName: "Border Style", group: "Track Border Style", description: "Line style for the top edge of the bar the handle slides along only, overriding Track Border Style; None hides that edge", portability: "look-shared" },
  trackBorderTopWidth: { when: (p) => p.trackBorderTopStyle === 'solid' || p.trackBorderTopStyle === 'dashed' || p.trackBorderTopStyle === 'dotted' || p.borderStyle === 'solid' || p.borderStyle === 'dashed' || p.borderStyle === 'dotted', type: "number", coerce: 'none', displayName: "Border Width", group: "Track Border Style", description: "Thickness in pixels of the top edge of the bar the handle slides along, which has no effect while that edge's Border Style is None", portability: "look-shared" },
  trackBorderWidth: { when: (p) => p.trackBorderStyle === 'solid' || p.trackBorderStyle === 'dashed' || p.trackBorderStyle === 'dotted', type: "number", default: 0, coerce: 'none', displayName: "Border Width", group: "Track Border Style", description: "Thickness in pixels of the border around the bar the handle slides along, which has no effect while Track Border Style is None", portability: "look-shared" },
  trackBoxShadowBlurRadius: { when: (p) => p.trackBoxShadowEnabled === true, type: "number", default: 5, coerce: 'none', displayName: "Blur Radius", group: "Track Box Shadow", description: "How soft the shadow edge is; 0 gives a hard edge", portability: "look-expressible" },
  trackBoxShadowColor: { when: (p) => p.trackBoxShadowEnabled === true, type: "color", default: "#00000033", coerce: 'none', displayName: "Shadow Color", group: "Track Box Shadow", description: "Colour of the shadow, usually a mostly-transparent black", portability: "look-expressible" },
  trackBoxShadowEnabled: { type: "boolean", coerce: 'none', displayName: "Shadow Enabled", group: "Track Box Shadow", description: "Draws a shadow behind the bar the handle slides along; the rest of this group does nothing while it is off", portability: "look-expressible" },
  trackBoxShadowInset: { when: (p) => p.trackBoxShadowEnabled === true, type: "boolean", default: false, coerce: 'none', displayName: "Inset", group: "Track Box Shadow", description: "Draws the shadow inside the element instead of behind it, for a recessed look", portability: "web-only" },
  trackBoxShadowOffsetX: { when: (p) => p.trackBoxShadowEnabled === true, type: "number", default: 0, coerce: 'none', displayName: "Offset X", group: "Track Box Shadow", description: "How far right the shadow sits from the element; negative values move it left", portability: "look-expressible" },
  trackBoxShadowOffsetY: { when: (p) => p.trackBoxShadowEnabled === true, type: "number", default: 0, coerce: 'none', displayName: "Offset Y", group: "Track Box Shadow", description: "How far down the shadow sits from the element; negative values move it up", portability: "look-expressible" },
  trackBoxShadowSpreadRadius: { when: (p) => p.trackBoxShadowEnabled === true, type: "number", default: 2, coerce: 'none', displayName: "Spread Radius", group: "Track Box Shadow", description: "Grows the shadow outwards before it is blurred; negative values shrink it", portability: "look-expressible" },
  trackColor: { type: "color", default: "#f0f0f0", coerce: 'none', displayName: "Inactive Color", group: "Track Style", description: "Colour of the part of the track the handle has not reached yet", portability: "look-shared" },
  trackHeight: { type: "number", default: 6, coerce: 'none', displayName: "Height", group: "Track Style", description: "Thickness of the bar the handle slides along", portability: "look-shared" },
  transformOriginX: { type: "number", default: "50", coerce: 'none', displayName: "Transform Origin X", group: "Placement", description: "Horizontal point the element rotates and scales around, as a fraction of its width", portability: "layout-shared", layout: 'origin-x' },
  transformOriginY: { type: "number", default: "50", coerce: 'none', displayName: "Transform Origin Y", group: "Placement", description: "Vertical point the element rotates and scales around, as a fraction of its height", portability: "layout-shared", layout: 'origin-y' },
  transformRotation: { type: "number", default: 0, coerce: 'none', displayName: "Rotation", group: "Placement", description: "Rotates the element clockwise in degrees, without affecting the layout", portability: "layout-shared", layout: 'rotation' },
  transformScale: { type: "number", default: 1, coerce: 'none', displayName: "Scale", group: "Placement", description: "Scales the element about its transform origin; 1 leaves it unscaled", portability: "layout-shared", layout: 'scale' },
  transformX: { type: "number", default: 0, coerce: 'none', displayName: "Pos X", group: "Placement", description: "Moves the element right after layout, without moving its siblings", portability: "layout-shared", layout: 'translate-x' },
  transformY: { type: "number", default: 0, coerce: 'none', displayName: "Pos Y", group: "Placement", description: "Moves the element down after layout, without moving its siblings", portability: "layout-shared", layout: 'translate-y' },
  variant: { type: "string", coerce: 'none', displayName: "Variant", group: "General", description: "Name of a saved variant of this node type to apply, replacing the styling set here", portability: "look-shared" },
  visible: { type: "boolean", default: true, coerce: 'none', displayName: "Visible", group: "Style", description: "Hides the element while keeping the space it occupies in the layout", portability: "look-shared" },
  width: { type: "number", default: 100, coerce: 'none', displayName: "Width", group: "Dimensions", description: "Overall width of the slider, which is the length of the track plus the handle", portability: "layout-shared", layout: 'width' },
  zIndex: { type: "number", coerce: 'none', displayName: "zIndex", group: "Style", description: "Paint order among overlapping siblings; higher numbers paint on top", portability: "look-shared" },
  },

  outputs: {
    // slider.ts :79-87
    value: { type: 'number', from: (s) => s.out, displayName: 'Value', group: 'States', description: 'The value the handle is currently at, between Min and Max, as a number' },
    // slider.ts :88-96
    valuePercent: { type: 'number', from: (s) => s.percent, displayName: 'Value Percent', group: 'States', description: 'Where the handle sits as a whole number from 0 to 100, regardless of Min and Max' },
    // slider.ts :97-102
    onChange: { type: 'signal', displayName: 'Changed', group: 'Events', description: 'Fires when the user moves the handle; a value arriving on the Value input does not fire it' },
    // utils.ts :157-195
    focusState: { type: 'boolean', from: (s) => s.focused, displayName: 'Focused', group: 'States', description: 'True while this control holds keyboard focus, so typing and Enter go to it' },
    onFocus: { type: 'signal', displayName: 'Focused', group: 'Focus Events', description: 'Fires the moment this control takes keyboard focus, whether from a click, a tab or a Focus action' },
    onBlur: { type: 'signal', displayName: 'Blurred', group: 'Focus Events', description: 'Fires when keyboard focus leaves this control, or the control leaves the page while holding it, which is the usual place to validate what was entered' },
    // utils.ts :204-243
    hoverState: { type: 'boolean', from: (s) => s.hover, displayName: 'Hover', group: 'States', description: 'True while the pointer is over this control; stays false on touch devices with no pointer' },
    hoverStart: { type: 'signal', displayName: 'Hover Start', group: 'Pointer Events', description: 'Fires when the pointer moves onto this control' },
    hoverEnd: { type: 'signal', displayName: 'Hover End', group: 'Pointer Events', description: 'Fires when the pointer leaves this control, including when it leaves while a button is still held, or when the control leaves the page under it' },
    // utils.ts :246-311
    pressedState: { type: 'boolean', from: (s) => s.pressed, displayName: 'Pressed', group: 'States', description: 'True while a mouse button or finger is held down on this control, and false again the moment it is released or slides off' },
    pointerDown: { type: 'signal', displayName: 'Pointer Down', group: 'Pointer Events', description: 'Fires as a mouse button or finger goes down on this control, before any click has completed' },
    pointerUp: { type: 'signal', displayName: 'Pointer Up', group: 'Pointer Events', description: 'Fires when the mouse button or finger is lifted, and also when a touch is cancelled by the system' },
    // utils.ts :314-325
    enabled: { type: 'boolean', from: (s) => s.enabled, displayName: 'Enabled', group: 'States', description: 'Reports back whether this control is currently accepting interaction, following the Enabled input' },
    // react-component-node.ts :982-990, :993-1003
    didMount: { type: 'signal', displayName: 'Did Mount', group: 'Mounted', description: 'Fires once this element has been added to the page and can be measured' },
    willUnmount: { type: 'signal', displayName: 'Will Unmount', group: 'Mounted', description: 'Fires just before this element is removed from the page, while it still exists' },
    // react-component-node.ts :1428-1444 — no Children Count: `allowChildren` is false (slider.ts :14)
    childIndex: { type: 'number', from: () => 0, displayName: 'Child Index', group: 'Advanced', description: "This element's position among its parent's children, counting from 0" },
    this: { type: 'reference', from: () => SELF_REFERENCE, displayName: 'This', group: 'Advanced', description: 'A reference to this node itself, for ports that take a node rather than a value' },
    // react-component-node.ts :1446-1500 — never measured here
    screenPositionX: { type: 'number', from: () => undefined, displayName: 'Screen Position X', group: 'Bounding Box', description: "Distance in pixels from the left edge of the window to this element's left edge" },
    screenPositionY: { type: 'number', from: () => undefined, displayName: 'Screen Position Y', group: 'Bounding Box', description: "Distance in pixels from the top edge of the window to this element's top edge" },
    boundingWidth: { type: 'number', from: () => undefined, displayName: 'Width', group: 'Bounding Box', description: 'Width this element actually ended up with after layout, in pixels' },
    boundingHeight: { type: 'number', from: () => undefined, displayName: 'Height', group: 'Bounding Box', description: 'Height this element actually ended up with after layout, in pixels' }
  }
}).on(
  {
    // utils.ts :82-89
    enabled: (s, v) => {
      const enabled = !!v;
      if (enabled === s.enabled) return { says: 'the value it already holds: nothing', send: [] };
      return { says: 'a change: Enabled follows; disabled, the handle takes no slide and no focus', set: { enabled }, send: ['enabled'] };
    },
    // slider.ts `_setInputValue` — every write a word for the handle (R14); the next paint draws it (`painted`)
    value: (_s, v) => word(v),
    // the attributes (`undefined` deletes the prop): the next paint draws the handle against them (v3, C74)
    min: (_s, v) => ({ says: 'always: at the next paint the handle is held at or above it (an empty Min is 0) and on the Step; Value and Value Percent follow when they move — never Changed', set: { min: v }, send: [] }),
    max: (_s, v) => ({ says: 'always: at the next paint the handle is held at or below it (an empty Max is 100; below Min, the handle holds Min) and on the Step; Value and Value Percent follow when they move — never Changed', set: { max: v }, send: [] }),
    step: (_s, v) => ({ says: 'always: at the next paint the handle is rounded to it (one that is not above 0 is 1); Value and Value Percent follow when they move — never Changed', set: { step: v }, send: [] }),
    // react-component-node.ts :2310-2320
    mounted: (_s, v) => ({ says: 'always: the slider is put on the page (Did Mount), or taken off it (Will Unmount), at the next paint; put back, the handle is where it was left', set: { mounted: !!v }, send: [] }),
    // utils.ts :370-384 — on the `<input>` (utils.ts :419-423 `_focusTarget`), as the Dropdown's
    focus: (s) => {
      if (!s.onPage) return { says: 'not on the page: nothing to focus, the Focus is not kept, and the editor is told', set: focusMissed(s, true), send: [], outcome: 'unchanged' };
      if (s.elementFocused || !s.pageEnabled || !s.pageVisible) return { says: 'it holds the keyboard already, or is disabled or hidden: nothing changes', set: focusMissed(s, false), send: [], outcome: 'done' };
      return { says: 'otherwise the keyboard is put on it, and the Focused state goes true', set: { focused: true, elementFocused: true, ...focusMissed(s, false) }, send: ['focusState'], emit: ['onFocus'], outcome: 'done' };
    },
    // utils.ts :385-395 — a disabled element gives the keyboard up to nobody: `blur()` on one does nothing (the focusing steps), Done regardless
    blur: (s) => {
      if (!s.onPage || !s.elementFocused || !s.pageEnabled) return { says: 'it does not hold the keyboard (or is disabled, and gives it up to nobody): nothing changes', send: [], outcome: 'done' };
      return { says: 'it holds the keyboard: it is taken off it, and the Focused state goes false', set: { focused: false, elementFocused: false }, send: ['focusState'], emit: ['onBlur'], outcome: 'done' };
    },
    // react-component-node.ts :1380-1395 — scrolls; nothing on the wire
    scrollIntoView: () => ({ says: 'always: the page, or the scrolling Group holding it, scrolls until the slider can be seen', send: [] }),
    // node-shared-port-definitions.ts :366-375 — the page follows at the next paint
    visible: (_s, v) => ({ says: 'always: shown or hidden at the next paint, its space kept; hidden, a Focus does not reach it', set: { visible: !!v }, send: [] })
  },
  {
    // placed on the page with its params set — the first render: Did Mount, and the mount's effect (Slider.tsx :88-90)
    world: { place: (s) => painted(s) },
    afterInputs: (s) => painted(s),
    person: {
      hover: (s) => onPainted(s, () => ({ set: { hover: true }, send: ['hoverState'], emit: ['hoverStart'] })),
      leave: (s) => onPainted(s, () => ({ set: { hover: false, pressed: false }, send: ['hoverState', 'pressedState'], emit: ['hoverEnd'] })),
      press: (s) => onPainted(s, (p) => (p.pageEnabled ? pressed(p) : NONE)),
      release: (s) => onPainted(s, (p) => (p.pageEnabled ? { set: { pressed: false }, send: ['pressedState'], emit: ['pointerUp'] } : NONE)),
      // the press, the release and the click (utils.ts :285-311) — where the handle already is: the value stays
      click: (s) =>
        onPainted(s, (p) => {
          if (!p.pageEnabled) return NONE;
          const d = pressed(p);
          return { set: { ...d.set, pressed: false }, send: d.send, emit: [...(d.emit ?? []), 'pointerUp'] };
        }),
      touch: (s) => onPainted(s, (p) => (p.pageEnabled ? { set: { pressed: true }, send: ['pressedState'], emit: ['pointerDown'] } : NONE)),
      lift: (s) => onPainted(s, (p) => (p.pageEnabled ? { set: { pressed: false }, send: ['pressedState'], emit: ['pointerUp'] } : NONE)),
      focus: (s) => onPainted(s, (p) => (p.pageEnabled && !p.elementFocused ? focusTaken() : NONE)),
      blur: (s) => onPainted(s, (p) => (p.elementFocused && p.pageEnabled ? { set: { focused: false, elementFocused: false }, send: ['focusState'], emit: ['onBlur'] } : NONE), 'blur'),
      // the slide (Slider.tsx :183 the `<input>`'s `onChange`: `Number(e.target.value)` into the shown value, then
      // `updateOutputValue`, slider.ts :39-54). The browser's rules first: a disabled element takes none; the keyboard goes
      // onto the element (the focusing steps); the value lands sanitized (clamped, rounded to the step); a slide to the value
      // the browser already holds raises no `input`, so nothing moves. A reversed range (Max below Min, as the attributes read)
      // takes no slide: jsdom's sanitization of it does not settle where a browser's does — not played (the face's choice)
      slide: (s, _inputs, v) =>
        onPainted(s, (p) => {
          if (!p.pageEnabled || reversed(p)) return NONE;
          const focus = p.elementFocused ? NONE : focusTaken();
          const held = rangeValue(p, p.shown);
          const to = rangeValue(p, v);
          if (held === to) return focus;
          const n = Number(to);
          return join(focus, join({ set: { shown: n }, send: [] }, reported({ ...p, shown: n }, n, true)));
        }, 'keyboard')
    }
  }
);

/**
 * slider.ts `_setInputValue(v)`: an empty value abstains; one `Number` cannot make finite abstains (reported on the runtime
 * channel); else it is the graph's word for the handle whatever it equals (R14; C73), drawn by the next paint.
 */
function word(v: unknown): Send {
  if (v === undefined || v === null || v === '') return { says: 'empty: no word, and the handle stays where it is', send: [] };
  const n = Number(v);
  if (!Number.isFinite(n)) return { says: 'not a number: no word (the runtime reports it), and the handle stays where it is', send: [] };
  return { says: 'a number: at the next paint the handle goes there, clamped to Min and Max and rounded to the Step; Value and Value Percent follow when they move — Changed does not fire (only a person\'s slide fires it)', set: { authorValue: n, pending: true }, send: [] };
}

/**
 * slider.ts `_percentOf` — where the handle sits from 0 to 100 over the attributes as the browser reads them (a blank Min or Max
 * is 0 or 100), 0 when they are equal: the handle sits at the start (v3, C75 — v2 read `NaN` from 0 / 0 and `NaN` for a blank).
 * A -0 (a reversed range at its start) is 0.
 */
function percentOf(s: Readonly<State>, v: number): number {
  const min = attrNumber(s.min) ?? 0;
  const max = attrNumber(s.max) ?? 100;
  return max === min ? 0 : Math.floor(((v - min) / (max - min)) * 100) + 0;
}

/**
 * slider.ts `_reportValue(v, announce)`: a different value (`!==`) is kept and sent, and — for a person's slide (`announce`) —
 * Changed fires; Value Percent is recomputed at every report and sent when it differs (v3: v2 recomputed it only with the value,
 * so a moved Min or Max left it stale — C74). The paint reports the same way with `announce` false (D36).
 */
function reported(s: Readonly<State>, v: number, announce: boolean): Act {
  const set: Partial<State> = {};
  const send: ValueOut[] = [];
  const emit: Pulse[] = [];
  if (s.out !== v) {
    set.out = v;
    send.push('value');
    if (announce) emit.push('onChange');
  }
  const p = percentOf(s, v);
  if (p !== s.percent) {
    set.percent = p;
    send.push('valuePercent');
  }
  return { set, send, emit };
}

/**
 * An attribute as the element carries it (`String(v)`; `undefined`, `null`, a boolean, a function draw none) read by HTML's rules for
 * parsing floating-point number values — the lenient prefix parse jsdom uses for a range input's `min` / `max` / `step`
 * (`parseFloatingPointNumber`: ASCII whitespace, then `parseFloat`, finite): `"1,2"` is 1, `"[object Object]"` none. Chromium
 * reads the whole string strictly (`"1,2"` would be none); jsdom re-sanitizes every value the face writes, so the face and
 * this spec read it as jsdom does (README §7, NSP-016 §7.6).
 */
function attrNumber(v: unknown): number | undefined {
  if (v === undefined || v === null || typeof v === 'boolean' || typeof v === 'function' || typeof v === 'symbol') return undefined;
  const str = String(v);
  const lead = str.length - str.trimStart().length;
  if (/[^\t\n\f\r ]/.test(str.slice(0, lead))) return undefined;
  const n = parseFloat(str);
  return Number.isFinite(n) ? n : undefined;
}

/** A value as a range input checks it: a VALID floating-point number (HTML's strict syntax), else none */
function valueNumber(v: unknown): number | undefined {
  if (typeof v === 'number') return Number.isFinite(v) ? valueNumber(String(v)) : undefined;
  if (typeof v !== 'string' || !/^-?(?:\d+|\d*\.\d+)(?:[eE][-+]?\d+)?$/.test(v)) return undefined;
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : undefined;
}

/**
 * The value a range input holds for `v`: the range state's value sanitization as jsdom applies it to every write (not a valid
 * number → the middle, or Min when Max is below it; below Min → Min; else above Max → Max), then — when Max is not below Min —
 * the browser's step-mismatch rule, which jsdom lacks (HTML; Chromium `StepRange::ClampValue`): rounded to base + n × step, a tie
 * upwards, a rounding past Max stepped back one, below Min forward one, still outside → the clamped value. Attributes as
 * rendered: `min` (default 0), `max` (default 100), `step` only when Step is truthy (Slider.tsx :120-122; default 1, a step that
 * is not a positive number is the default); the step base is `min`, else the `value` attribute the element carries (the
 * handle), else 0. Returned as the text the element holds.
 */
/** Max below Min, as the rendered attributes read (`rangeValue`'s defaults): a range the face does not slide */
const reversed = (s: Readonly<State>): boolean => (attrNumber(s.max) ?? 100) < (attrNumber(s.min) ?? 0);

function rangeValue(s: Readonly<State>, v: unknown): string {
  const minAttr = attrNumber(s.min);
  const min = minAttr ?? 0;
  const max = attrNumber(s.max) ?? 100;
  const parsed = valueNumber(v);
  const proposed = parsed === undefined ? (max < min ? min : (min + max) / 2) : parsed;
  const inRange = parsed === undefined ? proposed : proposed < min ? min : proposed > max ? max : proposed;
  // v3 — a reversed range holds Min, as Chromium draws it (it raises Max to Min). jsdom's clamp of one does not settle (each
  // re-sanitization flips a value between Min and Max), and the paint now draws the handle at every frame
  if (max < min) return String(min);
  const stepAttr = s.step ? attrNumber(s.step) : undefined;
  const step = stepAttr !== undefined && stepAttr > 0 ? stepAttr : 1;
  const base = minAttr ?? attrNumber(s.shown) ?? 0;
  const rounded = base + Math.round((inRange - base) / step) * step;
  const clamped = rounded > max ? rounded - step : rounded < min ? rounded + step : rounded;
  return String(clamped < min || clamped > max ? inRange : clamped);
}

/**
 * The page follows what the node wants (dropdown.ts `painted`).
 *   - Enabled and Visible are painted onto the element.
 *   - Mounted off: the element leaves with the keyboard it held; Mounted on: Did Mount, the handle where it was.
 *   - on the page, the handle: the graph's word when one is waiting (`pending`), else where it was, as the browser holds it
 *     against the attributes now — clamped and rounded to the step (v3, C74) — and the node reports it: Value and Value Percent
 *     sent when they differ, Changed never (D36).
 */
function painted(s: Readonly<State>): { set: Partial<State>; send: ValueOut[]; emit: Pulse[] } {
  const set: Partial<State> = { ...(s.pageEnabled === s.enabled ? {} : { pageEnabled: s.enabled }), ...(s.pageVisible === s.visible ? {} : { pageVisible: s.visible }) };
  if (!s.mounted && s.onPage) {
    // the element leaves with the keyboard it held, and the states go with it (v5, D30)
    const l = leftPage(s);
    return { set: { ...set, onPage: false, elementFocused: false, ...l.set }, send: l.send, emit: ['willUnmount', ...l.emit] };
  }
  if (!s.mounted) return { set, send: [], emit: [] };
  const mounting = !s.onPage;
  const emit: Pulse[] = [];
  if (mounting) {
    set.onPage = true;
    emit.push('didMount');
  }
  const shown = Number(rangeValue(s, s.pending ? s.authorValue : s.shown));
  const r = reported({ ...s, ...set }, shown, false);
  // every paint on the page writes the handle, the node's value, Value Percent and the word's flag — sent only when they move —
  // so a paint that moved nothing is the same branch as one that did (a mutant swapping the two is then a real defect, not a twin)
  return { set: { ...set, shown, pending: false, out: shown, percent: percentOf({ ...s, ...set }, shown), ...r.set }, send: r.send, emit: [...emit, ...(r.emit ?? [])] };
}

/**
 * NSP-016 s43 — what reaches a HIDDEN element (`visibility: hidden`): no pointer (the browser's hit test passes it by), the keyboard
 * only when it holds it already (`focus()` refuses a hidden element — Chromium `IsFocusableStyle` — and jsdom has no focus fixup),
 * a blur always (`blur()` works on one).
 */
type Reach = 'pointer' | 'keyboard' | 'blur';
function reaches(p: Readonly<State>, how: Reach): boolean {
  return how === 'blur' || p.pageVisible || (how === 'keyboard' && p.elementFocused);
}

/** The act on the painted page (dropdown.ts `onPainted`). */
function onPainted(s: Readonly<State>, then: (painted: Readonly<State>) => Act, how: Reach = 'pointer'): Act {
  const p = painted(s);
  const after: State = { ...s, ...p.set };
  const a = after.onPage && reaches(after, how) ? then(after) : NONE;
  return { set: { ...p.set, ...a.set }, send: [...p.send, ...a.send], emit: [...p.emit, ...(a.emit ?? [])] };
}

/** The keyboard onto the element (utils.ts :163-166, :181-183): Focused true and sent, Focused fires. */
function focusTaken(): Act {
  return { set: { focused: true, elementFocused: true }, send: ['focusState'], emit: ['onFocus'] };
}

/** A mouse button down on an enabled element (utils.ts :255-259, :285-293), then the keyboard onto it — the browser's `mousedown` default — if it is not there already. */
function pressed(s: Readonly<State>): Act {
  return s.elementFocused ? { set: { pressed: true }, send: ['pressedState'], emit: ['pointerDown'] } : join({ set: { pressed: true }, send: ['pressedState'], emit: ['pointerDown'] }, focusTaken());
}

function join(a: Act, b: Act): Act {
  return { set: { ...a.set, ...b.set }, send: [...a.send, ...b.send], emit: [...(a.emit ?? []), ...(b.emit ?? [])] };
}

/**
 * P109 ISL-031 (P107-D30, ruled "Reset and announce") — the element leaves the page: what the states said of it goes with it.
 * Focused, Hover and Pressed go false (sent when they were true), and Blurred and Hover End fire for the ones that were on
 * (utils.ts `_leftPage`, called from react-component-node.ts `componentWillUnmount`). Pressed has no signal of its own here.
 */
function leftPage(s: Readonly<State>): { set: Partial<State>; send: Array<'focusState' | 'hoverState' | 'pressedState'>; emit: Array<'onBlur' | 'hoverEnd'> } {
  const set: Partial<State> = {};
  const send: Array<'focusState' | 'hoverState' | 'pressedState'> = [];
  const emit: Array<'onBlur' | 'hoverEnd'> = [];
  if (s.focused) {
    set.focused = false;
    send.push('focusState');
    emit.push('onBlur');
  }
  if (s.hover) {
    set.hover = false;
    send.push('hoverState');
    emit.push('hoverEnd');
  }
  if (s.pressed) {
    set.pressed = false;
    send.push('pressedState');
  }
  return { set, send, emit };
}
