/**
 * Dropdown (`net.noodl.controls.options`) — read from
 * `packages/noodl-viewer-react/src/nodes/controls/options.ts`, `components/controls/Select/Select.tsx` (the
 * component), `controls/utils.ts` (the control events and states, the Focus / Blur actions) and
 * `react-component-node.ts` on 2026-10-04 (NSP-016 s39). Its person face, page model and the shared ports are the
 * Checkbox's (checkbox.ts): what differs is the pick.
 *
 * R3 (a): the runtime wins by default. Every rule below cites the line it was read from.
 *
 * v3 (NSP-023 step 4, R12 and R14, 2026-10-06): the spec states what a person gets where v1 and v2 copied how React draws.
 * **The selection shows the last value the dropdown was given, by a person's pick or by the graph** (R14, Richard: "Why would
 * I not let the node show whatever the last value or signal it received was? Whether it comes from the user or not");
 * **a Dropdown hidden with Mounted and shown again is where the person left it** and **one handed its Items again keeps the
 * pick** (R14); **only a person's pick fires Changed** (the descriptions of Value and Changed). What the runtime does instead
 * only because of React was a known row on the runtime target (D34, C71), until P109 ISL-031 fixed it.
 *
 * THE RULE, before the citations. A Dropdown is a `<select>` drawn invisible (`opacity: 0`, Select.tsx :84-91) over
 * a span that shows the chosen option's Label (:179-183, :207-219), in a wrapper, with a `<label>` above it when
 * Enable Label is on (:223-249); a PERSON picks an option from it. Three things hold the choice:
 *
 *   - **the node's value** (`_internal.value`, options.ts :107): what the Value OUTPUT reads (:245-247), and what the
 *     `<select>` is told to select and the span labels. A pick writes it (`valueChanged`, :109-116: on a change, Value is
 *     sent and Changed fires) and so does the **Value** input (:181-200: `null` is ignored — it has no `toString` —
 *     anything else that is not text is made text with `toString`, `undefined` is kept; on a change Value is sent and
 *     Changed never fires). Nothing else moves it — not a remount and not a new Items list. The runtime's component kept
 *     the author's Value apart from the pick: at a remount, or at a paint after Items was written again, it took the
 *     author's Value back over a person's pick, sent it and fired Changed with nobody picking (row D34); and a Value
 *     written back to the very value React last rendered left the pick on the screen (row C71). Both fixed in P109
 *     ISL-031: a pick writes the node's value on both sides, and every write is counted so the next paint draws it.
 *   - **what the browser selects** (the `<select>`'s own selectedness, `domSelected`): the node's value while it names
 *     an option (:210 — the element is told which); otherwise the element is told nothing (`value={undefined}`) and the
 *     browser keeps what it had — a fresh element selects the hidden empty option (:217), and an option that leaves the
 *     list hands the selection to the first enabled option (HTML's reset; the hidden one is disabled). A person picking
 *     the option already selected raises no `change` (the browser), so nothing moves. **What is graded is the outcome**
 *     (`painted` below), not who computes it: the browser's reset gives it only to a target that keeps the `<option>`
 *     elements still offered (React's are keyed) and makes the hidden one the fresh element's choice; a target that
 *     rebuilds the list owes the same selection by assigning it (NSP-006 round 4, the plain-DOM stranger, did that).
 *   - **Items** (options.ts :158-171): `undefined` ignored; otherwise kept and drawn at the next paint. Text is the old
 *     stored form, read as the editor reads it (options.ts `readItems`); any other truthy value that is not a list offers
 *     no options, and an empty item in a list is skipped (v4, row C70 — v3 offered no options for text, and an empty
 *     item drew an empty option; the runtime's render threw on all three). An option's value is its `Value` as text (`<option value>`, :119), or its Label's text when it has none
 *     (HTML's fallback); an option with `Disabled` true or `'true'` cannot be picked.
 *   - **Enabled**, **the pointer, the keyboard, a click's focus** (utils.ts :157-311 on the `<select>`, Select.tsx
 *     :211), **Focus** / **Blur** (utils.ts :366-440, the target is the `<select>`), **Mounted**, **Enable Label** (it
 *     leaves the `<select>`, its keyboard and its selection where they are — ruled 2026-10-05; the runtime built a NEW
 *     `<select>` and the keyboard left with the old one, silently: row C80, fixed in P109 ISL-031), **Label**
 *     (drawn raw, :245 — row C65's third instance), **Placeholder** (drawn, never on the wire) and the look: the
 *     Checkbox's. A pick is a keyboard pick: it puts the keyboard on the element first (the focusing steps), as a Tab
 *     does, and a disabled element takes no pick. **A person's act meets a page painted first** (`onPainted`: what the
 *     frame wrote so far is drawn before the act), while **the Focus and Blur actions meet the page as the last paint left
 *     it** (they read `onPage`, `pageEnabled` and `pageVisible` as they stand: an Enabled written in the same frame has not
 *     reached the element yet).
 */

import { defineNode, type Patch } from '../spec';
import { SELF_REFERENCE } from '../trace';
import { dataAttributeInput, dataAttributeNames } from './data-attributes';

type State = {
  /** utils.ts :75-89 `_internal.enabled` */
  enabled: boolean;
  hover: boolean;
  pressed: boolean;
  focused: boolean;
  /** react-component-node.ts :1267 `wantsToBeMounted` */
  mounted: boolean;
  /** the element's `disabled` attribute follows Enabled at each paint (Select.tsx :209) — what the Focus and Blur actions meet */
  pageEnabled: boolean;
  /** NSP-016 s43 — Visible as written (node-shared-port-definitions.ts :366-375 `visibility: hidden`) */
  visible: boolean;
  /** NSP-016 s43 — the element's `visibility` as painted: what reaches a hidden element (`reaches`) */
  pageVisible: boolean;
  /** the element holds the keyboard — what the PAGE knows (`focused` is what the node REPORTS) */
  elementFocused: boolean;
  /** the component is on the page: mounted and painted */
  onPage: boolean;
  /** options.ts :107 `_internal.value` — the Value output, and what the `<select>` is told to select; `undefined` after a Value input of undefined (never sent, C3) */
  value: string | undefined;
  /** options.ts :164-168 `_internal.items` — the list as handed */
  items: unknown;
  /** the `<select>`'s own selection: an option's value, or '' for the hidden empty option (:217) */
  domSelected: string;
};

type O = typeof Dropdown extends { outputs: infer X } ? X : never;
type Send = Patch<State, O>;
type Pulse = 'didMount' | 'willUnmount' | 'pointerDown' | 'pointerUp' | 'onFocus' | 'onBlur' | 'hoverStart' | 'hoverEnd' | 'onChange';
type ValueOut = 'pressedState' | 'focusState' | 'hoverState' | 'value';
type Act = { set?: Partial<State>; send: ValueOut[]; emit?: Pulse[] };

const NOTHING: Send = { send: [] };
const NONE: Act = { send: [] };

/** options.ts :27-30 — what a placed Dropdown offers before Items is ever written */
const DEFAULT_ITEMS: readonly unknown[] = [
  { Label: 'Option 1', Value: 'Option 1' },
  { Label: 'Option 2', Value: 'Option 2' }
];

export const Dropdown = defineNode({
  type: 'net.noodl.controls.options',
  // v2 (NSP-023, 2026-10-05): Enable Label shows a label and leaves the <select> and the keyboard on it where they are, its selection too
  // (Richard ruled the Text Input's C80 for all three controls); v1 rebuilt the <select> when the label changed, as React did — row
  // C80, fixed on the runtime in P109 ISL-031.
  // v3 (NSP-023 step 4, 2026-10-06): the selection is the node's value — a remount and a new Items list keep a person's pick and
  // fire nothing (R14); v1 and v2 copied the component's `[props.value, props.items]` effect — rows D34 and C71, known on the runtime until P109 ISL-031.
  // v4 (P109 ISL-026, 2026-10-06, P107-C70 ruled "Read old text, else no options"): text on Items is read as the old stored list
  // (`readItems`), and an empty item in a list is skipped; v3 offered no options for text and drew an empty item as an empty
  // option (the runtime's render threw on both — row C70).
  // v5 (P109 ISL-031, P107-C64 ruled "Ignore touches, keep hover"): a finger on a disabled control reports nothing — no Pressed, no Pointer Down or Up — as Enabled promises; the pointer's hover still reports
  // v6 (P109 ISL-031, P107-D30 ruled "Reset and announce"): a control leaving the page (Mounted off) takes Focused, Hover and Pressed with it — each goes false, sent if it was true, with Blurred and Hover End for the ones that were on
  version: 6,
  source: 'packages/noodl-viewer-react/src/nodes/controls/options.ts',
  needs: ['person'],
  // the page's syncs (spec.ts `synced`): not branches — the browser's selection with them
  synced: ['pageEnabled', 'pageVisible', 'domSelected'],

  state: {
    enabled: true, hover: false, pressed: false, focused: false, mounted: true, pageEnabled: true, visible: true, pageVisible: true, elementFocused: false, onPage: false,
    value: 'Option 1', items: DEFAULT_ITEMS, domSelected: ''
  } as State,
  // utils.ts :402-411 `outcomeOutputs({ done, unchanged })` (addFocusActions)
  outcomes: ['done', 'unchanged'],

  acts: {
    hover: { description: 'the pointer moves onto the dropdown' },
    leave: { description: 'the pointer moves off it' },
    press: { description: 'a mouse button goes down on it' },
    release: { description: 'the mouse button comes up on it' },
    click: { description: 'a press and a release on it, and the click that follows — which opens the list and picks nothing' },
    touch: { description: 'a finger goes down on it' },
    lift: { description: 'the finger comes up' },
    focus: { description: 'the keyboard is put on it (a Tab reaching it)' },
    blur: { description: 'the keyboard is taken off it (a Tab leaving it)' },
    choose: {
      description: "an option is picked by its value — a keyboard pick: the keyboard goes onto the element first; a value the list does not offer, or a disabled option, cannot be picked, and picking the option already selected raises nothing",
      values: ['Option 1', 'Option 2', 's', 'l', 'a', 'b', 'c', 'zz']
    }
  },

  inputs: {
    // ---- logic ----
    // utils.ts :75-89
    enabled: { type: 'boolean', default: true, coerce: 'none', displayName: 'Enabled', group: 'General', description: 'Lets the user interact with this control; when off it still renders and occupies its space but ignores clicks, touches and typing', portability: 'logic' },
    // options.ts :122-172
    items: {
      type: 'optionslist', default: DEFAULT_ITEMS, coerce: 'none', displayName: 'Items', group: 'General',
      description: 'Options to offer. Type a label per option — the value it sends is the label — or switch the editor to Advanced and give an option its own Value when it must send something different',
      portability: 'logic',
      examples: [
        [{ Label: 'Option 1', Value: 'Option 1' }, { Label: 'Option 2', Value: 'Option 2' }],
        [{ Label: 'Small', Value: 's' }, { Label: 'Large', Value: 'l' }],
        [{ Label: 'A', Value: 'a' }, { Label: 'B', Value: 'b', Disabled: true }, { Label: 'C', Value: 'c' }],
        []
      ]
    },
    // options.ts :173-201
    value: {
      type: 'string', default: 'Option 1', coerce: 'none', displayName: 'Value', group: 'General', description: 'Selects the option with this Value; a value matching no option deselects everything. Setting it from the graph does not fire Changed', portability: 'logic', examples: ['Option 2', 's', 'l', 'a', 'c'],
      // NSP-020 (s80) — the catalog's `runtime-narrowed`: with an editor connected, options.ts :417-447 `updateValuePort`
      // republishes this port to the EDITOR as an enum over this node's own Items — their Values (the Labels are the picker's
      // words; the format's enums are values), the first one the default (:441), plus a Value that matches no option
      // (:428-432) — and publishes nothing when Items cannot be read (:420-425: the static `string` port stays). The wire's
      // type is `string` either way. NSP-020 s82 (§6.4 gap 3 closed): `p` is RAW, as the runtime reads `parameters` — an unset
      // Items is DEFAULT_ITEMS by the hook's own fallback (:418, said here too), and a Value SET to 'Option 1' outside the list is
      // offered back exactly as one set to any other name (:428-432); an unset Value is nothing.
      narrow: (p) => {
        const items = editorItems(p.items === undefined ? DEFAULT_ITEMS : p.items);
        if (items.length === 0) return {};
        const enums = items.map((item) => item.Value);
        const value = p.value;
        if (typeof value === 'string' && value !== '' && !enums.includes(value)) enums.push(value);
        return { type: 'enum', enums, default: items[0].Value };
      }
    },
    // options.ts :225-230 — drawn in the span while nothing is selected (Select.tsx :181-183); nothing on the wire
    placeholder: { type: 'string', coerce: 'none', displayName: 'Placeholder', group: 'Placeholder', description: 'Text shown while nothing is selected', portability: 'logic' },
    // react-component-node.ts :2302-2321
    mounted: { type: 'boolean', default: true, coerce: 'none', displayName: 'Mounted', group: 'General', description: 'Removes the element from the page entirely when false, unlike Visible which leaves its space behind', portability: 'logic', layout: 'present' },
    // utils.ts :366-398
    focus: { type: 'signal', outcome: true, displayName: 'Focus', group: 'Actions', description: 'Puts the keyboard on this dropdown, so Enter, Space and the arrow keys go to it', portability: 'logic' },
    blur: { type: 'signal', outcome: true, displayName: 'Blur', group: 'Actions', description: 'Takes the keyboard away from this dropdown, which is what fires Blurred', portability: 'logic' },
    // react-component-node.ts :1380-1395
    scrollIntoView: { type: 'signal', displayName: 'Scroll Into View', group: 'Scroll Into View', description: 'Scrolls the page, or the scrolling Group holding this element, until the element can be seen', portability: 'logic' },
    scrollIntoViewAlign: { type: 'enum', enums: ['nearest', 'start', 'center', 'end'], default: 'nearest', coerce: 'none', displayName: 'Scroll Align', group: 'Scroll Into View', description: 'Where Scroll Into View leaves the element: Nearest edge moves only as far as needed', portability: 'logic' },
    // node-shared-port-definitions.ts `addLabelInputs` (enableSpacing) — Select.tsx :245 draws Label raw (row C65)
    label: { when: (p) => p.useLabel === true, type: 'string', default: 'Label', coerce: 'none', displayName: 'Label', group: 'Label', description: 'Text shown on this element', portability: 'logic' },
    useLabel: { type: 'boolean', default: false, coerce: 'none', displayName: 'Enable Label', group: 'Label', description: 'Shows a text label on this element', portability: 'logic' },
    // utils.ts :93-120 — what reaches the nodes around it; a graph scenario's matter
    blockTouch: { type: 'boolean', coerce: 'none', displayName: 'Block Pointer Events', group: 'Pointer Events', description: 'Stops every pointer event that lands on this control from reaching the nodes it sits inside. Blunt: it takes hover and pointer-down with it, so reach for Click Bubbling first if it is only clicks you want to keep in', portability: 'logic' },
    clickBubbling: { type: 'enum', enums: ['auto', 'always', 'never'], default: 'auto', coerce: 'none', displayName: 'Click Bubbling', group: 'Pointer Events', description: "Whether a click on this control also fires Click on the nodes it sits inside. Automatic keeps it here as soon as this control's own Click is connected, so a Favourite button inside a clickable card runs Favourite and not the card; Always is the older behaviour where both run; Never keeps every click here, wired or not", portability: 'logic' },

    // ---- look and layout (R10): stored, written to the style, read by no output; each with its class (visual-params.json) ----
  alignX: { type: "enum", enums: ["left", "center", "right"], coerce: 'none', displayName: "Align X", group: "Alignment", description: "Horizontal alignment of this element within the space its parent gives it", portability: "layout-shared", layout: 'align-x' },
  alignY: { type: "enum", enums: ["top", "center", "bottom"], coerce: 'none', displayName: "Align Y", group: "Alignment", description: "Vertical alignment of this element within the space its parent gives it", portability: "layout-shared", layout: 'align-y' },
  backgroundColor: { type: "color", default: "transparent", coerce: 'none', displayName: "Background Color", group: "Style", description: "Fill colour of the closed dropdown; the open list is drawn by the browser and cannot be styled here", portability: "look-shared" },
  borderBottomColor: { when: (p) => p.borderBottomStyle === 'solid' || p.borderBottomStyle === 'dashed' || p.borderBottomStyle === 'dotted' || p.borderStyle === 'solid' || p.borderStyle === 'dashed' || p.borderStyle === 'dotted' || p.borderStyle === undefined, type: "color", coerce: 'none', displayName: "Border Color", group: "Border Style", description: "Colour of the bottom edge only, overriding Border Color", portability: "look-shared" },
  borderBottomLeftRadius: { type: "number", coerce: 'none', displayName: "Corner Radius", group: "Corner Radius", description: "Rounds the bottom-left corner only, overriding Corner Radius", portability: "look-shared" },
  borderBottomRightRadius: { type: "number", coerce: 'none', displayName: "Corner Radius", group: "Corner Radius", description: "Rounds the bottom-right corner only, overriding Corner Radius", portability: "look-shared" },
  borderBottomStyle: { type: "enum", enums: ["none", "solid", "dotted", "dashed"], coerce: 'none', displayName: "Border Style", group: "Border Style", description: "Line style for the bottom edge only, overriding Border Style; None hides that edge", portability: "look-expressible", layout: 'border-bottom-style' },
  borderBottomWidth: { when: (p) => p.borderBottomStyle === 'solid' || p.borderBottomStyle === 'dashed' || p.borderBottomStyle === 'dotted' || p.borderStyle === 'solid' || p.borderStyle === 'dashed' || p.borderStyle === 'dotted' || p.borderStyle === undefined, type: "number", coerce: 'none', displayName: "Border Width", group: "Border Style", description: "Thickness of the bottom edge in pixels, and it adds to the element's size", portability: "look-shared", layout: 'border-bottom-width' },
  borderColor: { when: (p) => p.borderStyle === 'solid' || p.borderStyle === 'dashed' || p.borderStyle === 'dotted' || p.borderStyle === undefined, type: "color", default: "#000000", coerce: 'none', displayName: "Border Color", group: "Border Style", description: "Colour of the border, which has no effect while Border Style is None", portability: "look-shared" },
  borderLeftColor: { when: (p) => p.borderLeftStyle === 'solid' || p.borderLeftStyle === 'dashed' || p.borderLeftStyle === 'dotted' || p.borderStyle === 'solid' || p.borderStyle === 'dashed' || p.borderStyle === 'dotted' || p.borderStyle === undefined, type: "color", coerce: 'none', displayName: "Border Color", group: "Border Style", description: "Colour of the left edge only, overriding Border Color", portability: "look-shared" },
  borderLeftStyle: { type: "enum", enums: ["none", "solid", "dotted", "dashed"], coerce: 'none', displayName: "Border Style", group: "Border Style", description: "Line style for the left edge only, overriding Border Style; None hides that edge", portability: "look-expressible", layout: 'border-left-style' },
  borderLeftWidth: { when: (p) => p.borderLeftStyle === 'solid' || p.borderLeftStyle === 'dashed' || p.borderLeftStyle === 'dotted' || p.borderStyle === 'solid' || p.borderStyle === 'dashed' || p.borderStyle === 'dotted' || p.borderStyle === undefined, type: "number", coerce: 'none', displayName: "Border Width", group: "Border Style", description: "Thickness of the left edge in pixels, and it adds to the element's size", portability: "look-shared", layout: 'border-left-width' },
  borderRadius: { type: "number", default: 5, coerce: 'none', displayName: "Corner Radius", group: "Corner Radius", description: "Rounds all four corners, except any corner that sets its own radius", portability: "look-shared" },
  borderRightColor: { when: (p) => p.borderRightStyle === 'solid' || p.borderRightStyle === 'dashed' || p.borderRightStyle === 'dotted' || p.borderStyle === 'solid' || p.borderStyle === 'dashed' || p.borderStyle === 'dotted' || p.borderStyle === undefined, type: "color", coerce: 'none', displayName: "Border Color", group: "Border Style", description: "Colour of the right edge only, overriding Border Color", portability: "look-shared" },
  borderRightStyle: { type: "enum", enums: ["none", "solid", "dotted", "dashed"], coerce: 'none', displayName: "Border Style", group: "Border Style", description: "Line style for the right edge only, overriding Border Style; None hides that edge", portability: "look-expressible", layout: 'border-right-style' },
  borderRightWidth: { when: (p) => p.borderRightStyle === 'solid' || p.borderRightStyle === 'dashed' || p.borderRightStyle === 'dotted' || p.borderStyle === 'solid' || p.borderStyle === 'dashed' || p.borderStyle === 'dotted' || p.borderStyle === undefined, type: "number", coerce: 'none', displayName: "Border Width", group: "Border Style", description: "Thickness of the right edge in pixels, and it adds to the element's size", portability: "look-shared", layout: 'border-right-width' },
  borderStyle: { type: "enum", enums: ["none", "solid", "dotted", "dashed"], default: "solid", coerce: 'none', displayName: "Border Style", group: "Border Style", description: "Line style for all four edges; None hides the border and leaves Border Width and Color inactive", portability: "look-expressible", layout: 'border-style' },
  borderTopColor: { when: (p) => p.borderTopStyle === 'solid' || p.borderTopStyle === 'dashed' || p.borderTopStyle === 'dotted' || p.borderStyle === 'solid' || p.borderStyle === 'dashed' || p.borderStyle === 'dotted' || p.borderStyle === undefined, type: "color", coerce: 'none', displayName: "Border Color", group: "Border Style", description: "Colour of the top edge only, overriding Border Color", portability: "look-shared" },
  borderTopLeftRadius: { type: "number", coerce: 'none', displayName: "Corner Radius", group: "Corner Radius", description: "Rounds the top-left corner only, overriding Corner Radius", portability: "look-shared" },
  borderTopRightRadius: { type: "number", coerce: 'none', displayName: "Corner Radius", group: "Corner Radius", description: "Rounds the top-right corner only, overriding Corner Radius", portability: "look-shared" },
  borderTopStyle: { type: "enum", enums: ["none", "solid", "dotted", "dashed"], coerce: 'none', displayName: "Border Style", group: "Border Style", description: "Line style for the top edge only, overriding Border Style; None hides that edge", portability: "look-expressible", layout: 'border-top-style' },
  borderTopWidth: { when: (p) => p.borderTopStyle === 'solid' || p.borderTopStyle === 'dashed' || p.borderTopStyle === 'dotted' || p.borderStyle === 'solid' || p.borderStyle === 'dashed' || p.borderStyle === 'dotted' || p.borderStyle === undefined, type: "number", coerce: 'none', displayName: "Border Width", group: "Border Style", description: "Thickness of the top edge in pixels, and it adds to the element's size", portability: "look-shared", layout: 'border-top-width' },
  borderWidth: { when: (p) => p.borderStyle === 'solid' || p.borderStyle === 'dashed' || p.borderStyle === 'dotted' || p.borderStyle === undefined, type: "number", default: 2, coerce: 'none', displayName: "Border Width", group: "Border Style", description: "Thickness of the border in pixels, which adds to the element's size unless Box Sizing accounts for it", portability: "look-shared", layout: 'border-width' },
  boxShadowBlurRadius: { when: (p) => p.boxShadowEnabled === true && p.boxShadowSource !== 'token', type: "number", default: 5, coerce: 'none', displayName: "Blur Radius", group: "Box Shadow", description: "How soft the shadow edge is; 0 gives a hard edge", portability: "look-expressible" },
  boxShadowColor: { when: (p) => p.boxShadowEnabled === true && p.boxShadowSource !== 'token', type: "color", default: "#00000033", coerce: 'none', displayName: "Shadow Color", group: "Box Shadow", description: "Colour of the shadow, including how transparent it is", portability: "look-expressible" },
  boxShadowEnabled: { type: "boolean", default: false, coerce: 'none', displayName: "Shadow Enabled", group: "Box Shadow", description: "Turns the drop shadow on", portability: "look-expressible" },
  boxShadowInset: { when: (p) => p.boxShadowEnabled === true && p.boxShadowSource !== 'token', type: "boolean", default: false, coerce: 'none', displayName: "Inset", group: "Box Shadow", description: "Draws the shadow inside the element instead of behind it", portability: "web-only" },
  boxShadowOffsetX: { when: (p) => p.boxShadowEnabled === true && p.boxShadowSource !== 'token', type: "number", default: 0, coerce: 'none', displayName: "Offset X", group: "Box Shadow", description: "How far to the right the shadow is cast from the element", portability: "look-expressible" },
  boxShadowOffsetY: { when: (p) => p.boxShadowEnabled === true && p.boxShadowSource !== 'token', type: "number", default: 0, coerce: 'none', displayName: "Offset Y", group: "Box Shadow", description: "How far down the shadow is cast from the element", portability: "look-expressible" },
  boxShadowSource: { when: (p) => p.boxShadowEnabled === true, type: "enum", enums: ["custom", "token"], default: "custom", coerce: 'none', displayName: "Shadow Source", group: "Box Shadow", description: "Where the shadow comes from: Custom builds it from the six fields below; From a style token wears one of the project’s shadow tokens, so every element sharing that token changes together", portability: "look-shared" },
  boxShadowSpreadRadius: { when: (p) => p.boxShadowEnabled === true && p.boxShadowSource !== 'token', type: "number", default: 2, coerce: 'none', displayName: "Spread Radius", group: "Box Shadow", description: "How much larger than the element the shadow is drawn", portability: "look-expressible" },
  boxShadowToken: { when: (p) => p.boxShadowEnabled === true && p.boxShadowSource === 'token', type: "string", default: "var(--shadow-md)", coerce: 'none', displayName: "Shadow Token", group: "Box Shadow", description: "The project shadow this element wears, as var(--shadow-md). Pick one from the list; compose new ones in the Styles panel", portability: "look-shared" },
  boxSizing: { type: "enum", enums: ["border-box", "content-box"], default: "border-box", coerce: 'none', displayName: "Box Sizing", group: "Margin and padding", description: "Whether Width and Height include this element's padding and border, or only its content", portability: "web-only" },
  color: { type: "color", coerce: 'none', displayName: "Color", group: "Text Style", description: "Colour of the text itself, not of the element behind it", portability: "look-shared" },
  cssClassName: { type: "string", default: "", coerce: 'none', displayName: "CSS Class", group: "Advanced HTML", description: "Extra CSS class names to put on this element, for styling from a stylesheet you supply", portability: "web-only" },
  dataAttributes: { type: "stringlist", coerce: 'none', editOnly: true, displayName: "Data Attributes", group: "Data Attributes", description: "data-* names (data-testid) for tests and scripts to find this element by; each gets a value input", portability: "web-only" },
  fontFamily: { type: "font", coerce: 'none', displayName: "Font Family", group: "Text Style", description: "Typeface to render the text in, either a web-safe family name or a font file added to the project", portability: "look-shared" },
  fontSize: { type: "number", coerce: 'none', displayName: "Font Size", group: "Text Style", description: "Height of the text, in pixels", portability: "look-shared" },
  fontStyle: { type: "enum", enums: ["normal", "italic"], default: "normal", coerce: 'none', displayName: "Font Style", group: "Text Style", description: "Renders the text upright or italic", portability: "look-shared" },
  fontVariantNumeric: { type: "enum", enums: ["normal", "tabular-nums"], default: "normal", coerce: 'none', displayName: "Numerals", group: "Text Style", description: "Tabular draws every digit at the same width so columns of numbers align; Normal follows the font", portability: "look-expressible" },
  fontWeight: { type: "number", default: "Auto", coerce: 'none', displayName: "Font Weight", group: "Text Style", description: "How heavy the text is drawn, from 100 (thin) to 900 (black); leave as Auto to use the weight the font family sets", portability: "look-shared" },
  height: { when: (p) => p.sizeMode === 'explicit' || p.sizeMode === 'contentWidth', type: "dimension", default: 100, coerce: 'none', displayName: "Height", group: "Dimensions", description: "Height of the element; how the value is read depends on Size Mode", portability: "layout-shared", layout: 'height' },
  iconColor: { when: (p) => p.useIcon === true && p.iconSourceType === 'icon', type: "color", default: "#000000", coerce: 'none', displayName: "Color", group: "Icon", description: "Colour of the icon", portability: "look-shared" },
  iconIconSource: { when: (p) => p.useIcon === true && p.iconSourceType === 'icon', type: "icon", coerce: 'none', displayName: "Icon Source", group: "Icon", description: "Which glyph to show, picked from an installed icon set", portability: "look-shared" },
  iconImageSource: { when: (p) => p.useIcon === true && p.iconSourceType === 'image', type: "image", coerce: 'none', displayName: "Image Source", group: "Icon", description: "Image file to show instead of an icon-set glyph", portability: "look-shared" },
  iconPlacement: { when: (p) => p.useIcon === true, type: "enum", enums: ["left", "right"], default: "left", coerce: 'none', displayName: "Placement", group: "Icon", description: "Which side of the label the icon sits on, with Icon Spacing as the gap between them", portability: "layout-shared", layout: 'content' },
  iconSize: { when: (p) => p.useIcon === true, type: "number", default: 16, coerce: 'none', displayName: "Size", group: "Icon", description: "Height of the icon", portability: "look-shared" },
  iconSourceType: { when: (p) => p.useIcon === true, type: "enum", enums: ["image", "icon"], default: "icon", coerce: 'none', displayName: "Type", group: "Icon", description: "Whether the icon comes from an installed icon set or from an image file, which decides the source port below", portability: "look-shared" },
  iconSpacing: { when: (p) => p.useIcon === true, type: "number", default: 10, coerce: 'none', displayName: "Spacing", group: "Icon", description: "Gap between the icon and the text beside it", portability: "layout-shared", layout: 'content' },
  labelcolor: { when: (p) => p.useLabel === true, type: "color", coerce: 'none', displayName: "Color", group: "Label Text Style", description: "Colour of the text itself, not of the element behind it", portability: "look-shared" },
  labelfontFamily: { when: (p) => p.useLabel === true, type: "font", coerce: 'none', displayName: "Font Family", group: "Label Text Style", description: "Typeface to render the text in, either a web-safe family name or a font file added to the project", portability: "look-shared" },
  labelfontSize: { when: (p) => p.useLabel === true, type: "number", coerce: 'none', displayName: "Font Size", group: "Label Text Style", description: "Height of the text, in pixels", portability: "look-shared" },
  labelfontStyle: { when: (p) => p.useLabel === true, type: "enum", enums: ["normal", "italic"], default: "normal", coerce: 'none', displayName: "Font Style", group: "Label Text Style", description: "Renders the text upright or italic", portability: "look-shared" },
  labelfontVariantNumeric: { when: (p) => p.useLabel === true, type: "enum", enums: ["normal", "tabular-nums"], default: "normal", coerce: 'none', displayName: "Numerals", group: "Label Text Style", description: "Tabular draws every digit at the same width so columns of numbers align; Normal follows the font", portability: "look-expressible" },
  labelfontWeight: { when: (p) => p.useLabel === true, type: "number", default: "Auto", coerce: 'none', displayName: "Font Weight", group: "Label Text Style", description: "How heavy the text is drawn, from 100 (thin) to 900 (black); leave as Auto to use the weight the font family sets", portability: "look-shared" },
  labelletterSpacing: { when: (p) => p.useLabel === true, type: "number", default: "Auto", coerce: 'none', displayName: "Letter Spacing", group: "Label Text Style", description: "Extra space added between characters; leave as Auto to use the spacing built into the font", portability: "look-shared" },
  labellineHeight: { when: (p) => p.useLabel === true, type: "number", default: "Auto", coerce: 'none', displayName: "Line Height", group: "Label Text Style", description: "Vertical space each line of text occupies; leave as Auto to follow the font", portability: "look-shared" },
  labelSpacing: { when: (p) => p.useLabel === true, type: "number", default: 10, coerce: 'none', displayName: "Spacing", group: "Label", description: "Gap between the label and the edges around it", portability: "layout-shared", layout: 'content' },
  labeltextStyle: { when: (p) => p.useLabel === true, type: "textStyle", default: "None", coerce: 'none', displayName: "Text Style", group: "Label Text Style", description: "Applies one of the project's saved text styles; the individual font ports below override whatever it sets", portability: "look-shared" },
  labeltextTransform: { when: (p) => p.useLabel === true, type: "enum", enums: ["none", "uppercase", "lowercase", "capitalize"], default: "none", coerce: 'none', displayName: "Case", group: "Label Text Style", description: "Forces the text to upper case, lower case or capitalised without changing the underlying value", portability: "look-shared" },
  letterSpacing: { type: "number", default: "Auto", coerce: 'none', displayName: "Letter Spacing", group: "Text Style", description: "Extra space added between characters; leave as Auto to use the spacing built into the font", portability: "look-shared" },
  lineHeight: { type: "number", default: "Auto", coerce: 'none', displayName: "Line Height", group: "Text Style", description: "Vertical space each line of text occupies; leave as Auto to follow the font", portability: "look-shared" },
  marginBottom: { type: "number", coerce: 'none', displayName: "Margin Bottom", group: "Margin and padding", description: "Space outside the element's bottom edge, between it and its neighbours", portability: "layout-expressible", layout: 'margin-bottom' },
  marginLeft: { type: "number", coerce: 'none', displayName: "Margin Left", group: "Margin and padding", description: "Space outside the element's left edge, between it and its neighbours", portability: "layout-expressible", layout: 'margin-left' },
  marginRight: { type: "number", coerce: 'none', displayName: "Margin Right", group: "Margin and padding", description: "Space outside the element's right edge, between it and its neighbours", portability: "layout-expressible", layout: 'margin-right' },
  marginTop: { type: "number", coerce: 'none', displayName: "Margin Top", group: "Margin and padding", description: "Space outside the element's top edge, between it and its neighbours", portability: "layout-expressible", layout: 'margin-top' },
  maxHeight: { type: "number", coerce: 'none', displayName: "Max Height", group: "Dimension Constraints", description: "Largest height the element may grow to, taking priority over Height", portability: "layout-shared", layout: 'max-height' },
  maxWidth: { type: "number", coerce: 'none', displayName: "Max Width", group: "Dimension Constraints", description: "Largest width the element may grow to, taking priority over Width", portability: "layout-shared", layout: 'max-width' },
  minHeight: { type: "number", coerce: 'none', displayName: "Min Height", group: "Dimension Constraints", description: "Smallest height the element may shrink to, taking priority over Height", portability: "layout-shared", layout: 'min-height' },
  minWidth: { type: "number", coerce: 'none', displayName: "Min Width", group: "Dimension Constraints", description: "Smallest width the element may shrink to, taking priority over Width", portability: "layout-shared", layout: 'min-width' },
  mixBlendMode: { type: "enum", enums: ["normal", "multiply", "screen", "overlay", "darken", "lighten", "color-dodge", "color-burn", "hard-light", "soft-light", "difference", "exclusion", "hue", "saturation", "color", "luminosity"], default: "normal", coerce: 'none', displayName: "Blend Mode", group: "Style", description: "How this element's colours blend with whatever is painted behind it", portability: "look-expressible" },
  opacity: { type: "number", default: 1, coerce: 'none', displayName: "Opacity", group: "Style", description: "How opaque this element is, from 0 for invisible to 1 for solid", portability: "look-shared" },
  paddingBottom: { type: "number", default: 6, coerce: 'none', displayName: "Pad Bottom", group: "Margin and padding", description: "Space inside the element's bottom edge, between it and its content", portability: "layout-shared", layout: 'padding-bottom' },
  paddingLeft: { type: "number", default: 8, coerce: 'none', displayName: "Pad Left", group: "Margin and padding", description: "Space inside the element's left edge, between it and its content", portability: "layout-shared", layout: 'padding-left' },
  paddingRight: { type: "number", default: 8, coerce: 'none', displayName: "Pad Right", group: "Margin and padding", description: "Space inside the element's right edge, between it and its content", portability: "layout-shared", layout: 'padding-right' },
  paddingTop: { type: "number", default: 6, coerce: 'none', displayName: "Pad Top", group: "Margin and padding", description: "Space inside the element's top edge, between it and its content", portability: "layout-shared", layout: 'padding-top' },
  placeholderOpacity: { type: "number", default: 0.5, coerce: 'none', displayName: "Placeholder opacity", group: "Placeholder", description: "How faded the placeholder text is, from 0 to 1", portability: "look-shared" },
  position: { type: "enum", enums: ["relative", "absolute", "sticky", "fixed"], default: "relative", coerce: 'none', displayName: "Position", group: "Layout", description: "How the element is placed: In Layout follows its siblings, Absolute ignores them, Sticky pins to the parent edge on overflow, Fixed stays put and takes no space", portability: "layout-expressible", layout: 'place' },
  showChevron: { type: "boolean", default: true, coerce: 'none', displayName: "Show Chevron", group: "Style", description: "Draws the small downward arrow at the end of the control that marks it as a dropdown", portability: "look-shared" },
  sizeMode: { type: "enum", enums: ["explicit", "contentWidth", "contentHeight", "contentSize"], default: "contentSize", coerce: 'none', editOnly: true, displayName: "Size Mode", group: "Dimensions", description: "Whether Width and Height are used as given, or the element sizes itself to fit its contents", portability: "layout-shared", layout: 'size-mode' },
  styleCss: { type: "string", default: "/* background-color: red; */", coerce: 'none', editOnly: true, displayName: "CSS Style", group: "Advanced HTML", description: "Raw CSS declarations applied to this element, overriding the styling ports above", portability: "web-only" },
  textStyle: { type: "textStyle", default: "None", coerce: 'none', displayName: "Text Style", group: "Text Style", description: "Applies one of the project's saved text styles; the individual font ports below override whatever it sets", portability: "look-shared" },
  textTransform: { type: "enum", enums: ["none", "uppercase", "lowercase", "capitalize"], default: "none", coerce: 'none', displayName: "Case", group: "Text Style", description: "Forces the text to upper case, lower case or capitalised without changing the underlying value", portability: "look-shared" },
  transformOriginX: { type: "number", default: "50", coerce: 'none', displayName: "Transform Origin X", group: "Placement", description: "Horizontal point the element rotates and scales around, as a fraction of its width", portability: "layout-shared", layout: 'origin-x' },
  transformOriginY: { type: "number", default: "50", coerce: 'none', displayName: "Transform Origin Y", group: "Placement", description: "Vertical point the element rotates and scales around, as a fraction of its height", portability: "layout-shared", layout: 'origin-y' },
  transformRotation: { type: "number", default: 0, coerce: 'none', displayName: "Rotation", group: "Placement", description: "Rotates the element clockwise in degrees, without affecting the layout", portability: "layout-shared", layout: 'rotation' },
  transformScale: { type: "number", default: 1, coerce: 'none', displayName: "Scale", group: "Placement", description: "Scales the element about its transform origin; 1 leaves it unscaled", portability: "layout-shared", layout: 'scale' },
  transformX: { type: "number", default: 0, coerce: 'none', displayName: "Pos X", group: "Placement", description: "Moves the element right after layout, without moving its siblings", portability: "layout-shared", layout: 'translate-x' },
  transformY: { type: "number", default: 0, coerce: 'none', displayName: "Pos Y", group: "Placement", description: "Moves the element down after layout, without moving its siblings", portability: "layout-shared", layout: 'translate-y' },
  useIcon: { type: "boolean", default: false, coerce: 'none', displayName: "Enable Icon", group: "Icon", description: "Shows an icon on this element", portability: "look-shared" },
  variant: { type: "string", coerce: 'none', displayName: "Variant", group: "General", description: "Name of a saved variant of this node type to apply, replacing the styling set here", portability: "look-shared" },
  visible: { type: "boolean", default: true, coerce: 'none', displayName: "Visible", group: "Style", description: "Hides the element while keeping the space it occupies in the layout", portability: "look-shared" },
  width: { when: (p) => p.sizeMode === 'explicit' || p.sizeMode === 'contentHeight', type: "dimension", default: 100, coerce: 'none', displayName: "Width", group: "Dimensions", description: "Width of the element; how the value is read depends on Size Mode", portability: "layout-shared", layout: 'width' },
  zIndex: { type: "number", coerce: 'none', displayName: "zIndex", group: "Style", description: "Paint order among overlapping siblings; higher numbers paint on top", portability: "look-shared" }
  },

  outputs: {
    // options.ts :240-248
    value: { type: 'string', from: (s) => s.value, displayName: 'Value', group: 'States', description: 'Value of the option currently selected' },
    // options.ts :249-254
    onChange: { type: 'signal', displayName: 'Changed', group: 'Events', description: 'Fires when the user picks a different option; a value arriving on the Value input does not fire it' },
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
    // react-component-node.ts :1428-1444 — no Children Count: `allowChildren` is false (options.ts :36)
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
      return { says: 'a change: Enabled follows; disabled, the list takes no pick, no click and no focus', set: { enabled }, send: ['enabled'] };
    },
    // options.ts :158-171 — `undefined` is no opinion; anything else is kept as handed, drawn at the next paint (`painted`); the
    // node's value stays (R14: a list handed again keeps the pick — the runtime's effect took the author's Value back until P109 ISL-031, row D34)
    items: (s, v) =>
      v === undefined
        ? { says: 'nothing handed (undefined): the list it has stays', send: [] }
        : { says: 'otherwise: the list is kept as handed and drawn at the next paint; the value stays, so a list handed again keeps the pick', set: { items: v }, send: [] },
    // options.ts :181-200 — `null` has no `toString` and is ignored (:182-184); what is not text is made text; a change sends
    // Value and never Changed, and the selection follows it at the next paint (R14: the last word wins — the runtime's effect
    // keyed on the author's Value React last rendered, so a write back to it after a pick left the pick on the screen, row C71,
    // fixed in P109 ISL-031)
    value: (s, v) => {
      if (v === null) return { says: 'null: ignored', send: [] };
      const value = v === undefined ? undefined : String(v);
      if (value === s.value) return { says: 'the value it already holds, as text: nothing', send: [] };
      return { says: 'a change: kept as text, Value follows, and the list selects it at the next paint if it names an option — Changed does not fire (only a person\'s pick fires it)', set: { value }, send: ['value'] };
    },
    // react-component-node.ts :2310-2320
    mounted: (_s, v) => ({ says: 'always: the list is put on the page (Did Mount), or taken off it (Will Unmount), at the next paint', set: { mounted: !!v }, send: [] }),
    // node-shared-port-definitions.ts `addLabelInputs` — a label beside the `<select>`; the element, its keyboard and its selection stay (v2, row C80)
    useLabel: () => ({ says: 'always: a label is drawn beside the list, or not; the list, its keyboard and its pick stay', send: [] }),
    // utils.ts :370-384 — on the `<select>` (utils.ts :419-423 `_focusTarget`), as the Checkbox's
    focus: (s) => {
      if (!s.onPage) return { says: 'not on the page: nothing to focus, and the Focus is not kept', send: [], outcome: 'unchanged' };
      if (s.elementFocused || !s.pageEnabled || !s.pageVisible) return { says: 'it holds the keyboard already, or is disabled or hidden: nothing changes', send: [], outcome: 'done' };
      return { says: 'otherwise the keyboard is put on it, and the Focused state goes true', set: { focused: true, elementFocused: true }, send: ['focusState'], emit: ['onFocus'], outcome: 'done' };
    },
    // utils.ts :385-395 — a disabled element gives the keyboard up to nobody: `blur()` on one does nothing (the focusing steps), Done regardless
    blur: (s) => {
      if (!s.onPage || !s.elementFocused || !s.pageEnabled) return { says: 'it does not hold the keyboard (or is disabled, and gives it up to nobody): nothing changes', send: [], outcome: 'done' };
      return { says: 'it holds the keyboard: it is taken off it, and the Focused state goes false', set: { focused: false, elementFocused: false }, send: ['focusState'], emit: ['onBlur'], outcome: 'done' };
    },
    // react-component-node.ts :1380-1395 — scrolls; nothing on the wire
    scrollIntoView: () => ({ says: 'always: the page, or the scrolling Group holding it, scrolls until the list can be seen', send: [] }),
    // node-shared-port-definitions.ts :366-375 — the page follows at the next paint
    visible: (_s, v) => ({ says: 'always: shown or hidden at the next paint, its space kept; hidden, a Focus does not reach it', set: { visible: !!v }, send: [] })
  },
  {
    // react-component-node.ts :785-830 `DATA_ATTRIBUTES_RULE` — one string input per name the Data Attributes list names, written
    // on the element as that attribute: nothing on the wire. The catalog also marks this node `runtime-narrowed` (options.ts
    // :417-447 republishes `value` to the EDITOR as an enum over this instance's Items): the port list is complete above and the
    // wire's type is `string` either way — the narrowing is `value.narrow` (NSP-020 s80), not a port.
    derived: {
      inputs: (params) => Object.fromEntries(dataAttributeNames(params.dataAttributes).map((name) => [name, dataAttributeInput(name)])),
      on: () => NOTHING
    },
    // placed on the page with its params set — the first render: Did Mount, and the mount's effect (Select.tsx :44-47)
    world: { place: (s) => painted(s) },
    afterInputs: (s) => painted(s),
    person: {
      hover: (s) => onPainted(s, () => ({ set: { hover: true }, send: ['hoverState'], emit: ['hoverStart'] })),
      leave: (s) => onPainted(s, () => ({ set: { hover: false, pressed: false }, send: ['hoverState', 'pressedState'], emit: ['hoverEnd'] })),
      press: (s) => onPainted(s, (p) => (p.pageEnabled ? pressed(p) : NONE)),
      release: (s) => onPainted(s, (p) => (p.pageEnabled ? { set: { pressed: false }, send: ['pressedState'], emit: ['pointerUp'] } : NONE)),
      // the press, the release and the click (utils.ts :285-311) — a click on a `<select>` opens its list and picks nothing
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
      // the pick (Select.tsx :212-215 the `<select>`'s `onChange`: the shown value, then `valueChanged`, options.ts :109-116). The
      // browser's rules first: a disabled element takes no pick; only an enabled option the list offers can be picked; the keyboard
      // goes onto the element (the focusing steps); and picking the option the element already selects raises no `change`
      choose: (s, _inputs, v) =>
        onPainted(s, (p) => {
          if (!p.pageEnabled) return NONE;
          const picked = String(v);
          const option = optionsOf(p.items).find((o) => o.value === picked);
          if (!option || option.disabled) return NONE;
          const focus = p.elementFocused ? NONE : focusTaken();
          if (p.domSelected === picked) return focus;
          // the paint selected the node's value wherever the list offers it, so an option the element does not select is a change
          return join(focus, { set: { value: picked, domSelected: picked }, send: ['value'], emit: ['onChange'] });
        }, 'keyboard')
    }
  }
);

type Option = { value: string; disabled: boolean };

/** HTML's `option.value` fallback: the option's text with ASCII whitespace stripped at the ends and collapsed within */
const optionText = (label: unknown): string => (label === undefined || label === null || typeof label === 'boolean' ? '' : String(label)).replace(/[ \t\n\f\r]+/g, ' ').trim();

/** options.ts `readItems` — the editor's reading of the old stored form of Items (a JSON text), copied: what is not a list is none. */
function readStoredItems(stored: string): { Label: string; Value: string }[] {
  if (stored.trim() === '') return [];
  let source: unknown;
  try {
    source = JSON.parse(stored);
  } catch {
    return [];
  }
  return itemRows(source);
}

/** options.ts :356-386 `readItems` — the options the EDITOR reads off Items: the stored text form, or the list itself (`value.narrow`). */
function editorItems(items: unknown): { Label: string; Value: string }[] {
  return typeof items === 'string' ? readStoredItems(items) : itemRows(items);
}

function itemRows(source: unknown): { Label: string; Value: string }[] {
  if (!Array.isArray(source)) return [];
  const out: { Label: string; Value: string }[] = [];
  for (const item of source) {
    if (item === null || item === undefined) continue;
    if (typeof item === 'object') {
      const row = item as Record<string, unknown>;
      const label = row.Label !== undefined ? row.Label : row.label;
      const value = row.Value !== undefined ? row.Value : row.value;
      if (label === undefined && value === undefined) continue;
      const labelText = String(label !== undefined ? label : value);
      out.push({ Label: labelText, Value: value !== undefined ? String(value) : labelText });
    } else {
      const labelText = String(item);
      out.push({ Label: labelText, Value: labelText });
    }
  }
  return out;
}

/**
 * Select.tsx :115-124 — the `<option>`s the list offers: a falsy Items offers none (:117); a truthy one that is not a list throws in
 * the render on the runtime until v4 (`props.items.map`, row C70) and offers none; text is read as the old stored list (v4,
 * options.ts `readItems`) and an empty item is skipped (v4); each item's `Value` as text (`<option value>`, :119),
 * or its Label's text when it has none; `Disabled` true or `'true'` disables it (:119)
 */
function optionsOf(items: unknown): Option[] {
  if (typeof items === 'string') return optionsOf(readStoredItems(items));
  if (!items || !Array.isArray(items)) return [];
  return items.filter((item) => item !== null && item !== undefined).map((item) => {
    const o = (item !== null && typeof item === 'object' ? item : {}) as { Value?: unknown; Label?: unknown; Disabled?: unknown };
    const value = o.Value === undefined || o.Value === null || typeof o.Value === 'boolean' ? optionText(o.Label) : String(o.Value);
    return { value, disabled: o.Disabled === true || o.Disabled === 'true' };
  });
}

/**
 * The page follows what the node wants (checkbox.ts `painted`), and the `<select>`'s selection with it.
 *   - Enabled and Visible are painted onto the element; Enable Label changes nothing here (v2; the runtime's rebuild was row C80, fixed in P109 ISL-031).
 *   - Mounted off: the element leaves with the keyboard it held; Mounted on: Did Mount, a fresh element on the node's value — a
 *     person's pick included, and nothing on the wire (v3, R14; the runtime took the author's Value back until P109 ISL-031, row D34).
 *   - the selection: the element is told the node's value while it names an option (:210); otherwise the browser keeps what it
 *     had — a fresh element selects the hidden empty option (:217), and a selected option that left the list hands the selection
 *     to the first enabled option (HTML's reset; the hidden one is disabled).
 */
function painted(s: Readonly<State>): { set: Partial<State>; send: ValueOut[]; emit: Pulse[] } {
  const set: Partial<State> = { ...(s.pageEnabled === s.enabled ? {} : { pageEnabled: s.enabled }), ...(s.pageVisible === s.visible ? {} : { pageVisible: s.visible }) };
  if (!s.mounted && s.onPage) {
    // the element leaves with the keyboard it held, and the states go with it (v6, D30)
    const l = leftPage(s);
    return { set: { ...set, onPage: false, elementFocused: false, ...l.set }, send: l.send, emit: ['willUnmount', ...l.emit] };
  }
  if (!s.mounted) return { set, send: [], emit: [] };
  const emit: Pulse[] = [];
  const fresh = !s.onPage;
  if (fresh) {
    set.onPage = true;
    emit.push('didMount');
  }
  const value = s.value;
  const options = optionsOf(s.items);
  const inList = value !== undefined && options.some((o) => o.value === value);
  let dom = s.domSelected;
  if (fresh) dom = inList ? (value as string) : '';
  else if (inList) dom = value as string;
  else if (dom !== '' && !options.some((o) => o.value === dom)) dom = options.find((o) => !o.disabled)?.value ?? '';
  if (dom !== s.domSelected) set.domSelected = dom;
  return { set, send: [], emit };
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

/** The act on the painted page (checkbox.ts `onPainted`). */
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
