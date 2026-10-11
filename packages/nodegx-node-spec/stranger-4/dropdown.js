'use strict';
/**
 * The Dropdown (`net.noodl.controls.options`) on a plain DOM page, written by hand from src/nodes/dropdown.ts.
 *
 * THE NODE keeps what the node knows (Enabled, Mounted, Visible, Value, Items, the reported Hover / Pressed / Focused).
 * THE PAGE is what the browser knows, and it is never copied into the node: whether the element is on the page
 * (`root.isConnected`), whether it is disabled or hidden (`select.disabled`, `visibility`), whether it holds the keyboard
 * (`document.activeElement`) and what it selects (`select.value`). A paint writes the node onto the page; a person's act
 * reaches the node only through the DOM listeners on the <select>.
 *
 * Drawn: <div root> [<label>] <div wrap> <select (opacity 0)> <option hidden disabled value=""> <option>… </select>
 * <span shown/> </div></div>.
 */

const { optionsOf, text } = require('./options');

const DEFAULT_ITEMS = [
  { Label: 'Option 1', Value: 'Option 1' },
  { Label: 'Option 2', Value: 'Option 2' }
];

const SIGNALS = ['focus', 'blur', 'scrollIntoView'];

/** Every declared value input with its default (dropdown.ts `inputs`); every coercion is `none`. */
const VALUE_INPUTS = {
  enabled: true, items: DEFAULT_ITEMS, value: 'Option 1', placeholder: undefined, mounted: true, scrollIntoViewAlign: 'nearest',
  label: 'Label', useLabel: false, blockTouch: undefined, clickBubbling: 'auto',
  alignX: undefined, alignY: undefined, backgroundColor: 'transparent', borderBottomColor: undefined, borderBottomLeftRadius: undefined,
  borderBottomRightRadius: undefined, borderBottomStyle: undefined, borderBottomWidth: undefined, borderColor: '#000000',
  borderLeftColor: undefined, borderLeftStyle: undefined, borderLeftWidth: undefined, borderRadius: 5, borderRightColor: undefined,
  borderRightStyle: undefined, borderRightWidth: undefined, borderStyle: 'solid', borderTopColor: undefined, borderTopLeftRadius: undefined,
  borderTopRightRadius: undefined, borderTopStyle: undefined, borderTopWidth: undefined, borderWidth: 2, boxShadowBlurRadius: 5,
  boxShadowColor: '#00000033', boxShadowEnabled: false, boxShadowInset: false, boxShadowOffsetX: 0, boxShadowOffsetY: 0,
  boxShadowSource: 'custom', boxShadowSpreadRadius: 2, boxShadowToken: 'var(--shadow-md)', boxSizing: 'border-box', color: undefined,
  cssClassName: '', dataAttributes: undefined, fontFamily: undefined, fontSize: undefined, fontStyle: 'normal', fontVariantNumeric: 'normal',
  fontWeight: 'Auto', height: 100, iconColor: '#000000', iconIconSource: undefined, iconImageSource: undefined, iconPlacement: 'left',
  iconSize: 16, iconSourceType: 'icon', iconSpacing: 10, labelcolor: undefined, labelfontFamily: undefined, labelfontSize: undefined,
  labelfontStyle: 'normal', labelfontVariantNumeric: 'normal', labelfontWeight: 'Auto', labelletterSpacing: 'Auto', labellineHeight: 'Auto',
  labelSpacing: 10, labeltextStyle: 'None', labeltextTransform: 'none', letterSpacing: 'Auto', lineHeight: 'Auto', marginBottom: undefined,
  marginLeft: undefined, marginRight: undefined, marginTop: undefined, maxHeight: undefined, maxWidth: undefined, minHeight: undefined,
  minWidth: undefined, mixBlendMode: 'normal', opacity: 1, paddingBottom: 6, paddingLeft: 8, paddingRight: 8, paddingTop: 6,
  placeholderOpacity: 0.5, position: 'relative', showChevron: true, sizeMode: 'contentSize', styleCss: '/* background-color: red; */',
  textStyle: 'None', textTransform: 'none', transformOriginX: '50', transformOriginY: '50', transformRotation: 0, transformScale: 1,
  transformX: 0, transformY: 0, useIcon: false, variant: undefined, visible: true, width: 100, zIndex: undefined
};

/** The value outputs, read from the node (dropdown.ts `outputs`). `undefined` is never sent. */
const SELF = Object.freeze({ $node: 'self' });
const OUTPUTS = {
  value: (n) => n.value,
  focusState: (n) => n.focused,
  hoverState: (n) => n.hover,
  pressedState: (n) => n.pressed,
  enabled: (n) => n.enabled,
  childIndex: () => 0,
  this: () => SELF,
  screenPositionX: () => undefined,
  screenPositionY: () => undefined,
  boundingWidth: () => undefined,
  boundingHeight: () => undefined
};

/** dropdown.ts imports these two from text-input.ts: the Data Attributes list's names, each a string input. */
const DATA_ATTRIBUTE_NAME = /^data-[a-z0-9][a-z0-9._-]*$/;
function dataAttributeNames(value) {
  if (value === undefined || value === null || value === '') return [];
  const names = Array.isArray(value) ? value.map((v) => String(v)) : typeof value === 'string' ? value.split(',') : [];
  return names.filter((name) => DATA_ATTRIBUTE_NAME.test(name));
}

class Dropdown {
  /**
   * @param page   { window, document }
   * @param frame  { pulse(name), sent(port), outcome(port, value) } — what the node tells its frame
   * @param params the mount params (for the derived ports)
   */
  constructor(page, frame, params) {
    this.page = page;
    this.frame = frame;
    this.inputs = Object.assign({}, VALUE_INPUTS);
    this.derived = {};
    for (const name of dataAttributeNames(params.dataAttributes)) this.derived[name] = undefined;
    // the node
    this.enabled = true;
    this.mounted = true;
    this.visible = true;
    this.hover = false;
    this.pressed = false;
    this.focused = false;
    this.value = 'Option 1';
    this.items = DEFAULT_ITEMS;
    // the page: nothing drawn yet
    this.root = null;
    this.select = null;
  }

  // ---------------------------------------------------------------------------------------------
  // ports

  kindOf(port) {
    if (SIGNALS.indexOf(port) >= 0) return 'signal';
    if (Object.prototype.hasOwnProperty.call(VALUE_INPUTS, port)) return 'value';
    if (Object.prototype.hasOwnProperty.call(this.derived, port)) return 'derived';
    return undefined;
  }

  /** A write to a value input. Returns the outputs it sends: a list, or 'all' (a plain store). */
  write(port, v) {
    const kind = this.kindOf(port);
    if (kind === undefined) throw new Error(`net.noodl.controls.options has no input "${port}"`);
    if (kind === 'signal') throw new Error(`"${port}" is a signal input, not a value input`);
    if (kind === 'derived') {
      this.derived[port] = v;
      if (this.root) this.drawDataAttributes();
      return [];
    }
    this.inputs[port] = v;
    switch (port) {
      case 'enabled': {
        const enabled = !!v;
        if (enabled === this.enabled) return [];
        this.enabled = enabled;
        return ['enabled'];
      }
      case 'items':
        if (v !== undefined) this.items = v;
        return [];
      case 'value': {
        if (v === null) return [];
        const value = v === undefined ? undefined : text(v);
        if (value === this.value) return [];
        this.value = value;
        return ['value'];
      }
      case 'mounted':
        this.mounted = !!v;
        return [];
      case 'visible':
        this.visible = !!v;
        return [];
      default:
        // useLabel, Label, Placeholder and every look input: stored and drawn at the next paint. A plain store SENDS
        // NOTHING — not "all" (spec.ts Patch.send's "absent means all" is about a patch; the deep run: a look write
        // before Value undefined must not catch Value)
        return [];
    }
  }

  /** A pulse on a signal input — the Focus and Blur actions reach the page through the element's own focus() / blur(). */
  pulse(port) {
    const kind = this.kindOf(port);
    if (kind === undefined) throw new Error(`net.noodl.controls.options has no input "${port}"`);
    if (kind !== 'signal') throw new Error(`"${port}" is a value input, not a signal`);
    if (port === 'focus') {
      if (!this.onPage()) return this.frame.outcome('focus', 'unchanged');
      this.select.focus();
      return this.frame.outcome('focus', 'done');
    }
    if (port === 'blur') {
      if (this.onPage()) this.select.blur();
      return this.frame.outcome('blur', 'done');
    }
    // scrollIntoView: the page scrolls; nothing on the wire
    if (this.onPage()) this.root.scrollIntoView();
  }

  read(port) {
    return OUTPUTS[port](this);
  }

  // ---------------------------------------------------------------------------------------------
  // the page

  onPage() {
    return !!this.root && this.root.isConnected;
  }

  /** Writes the node onto the page — at placement, at every frame's end, and before a person acts. */
  paint() {
    const document = this.page.document;
    if (!this.mounted) {
      if (this.root) {
        this.root.remove(); // the keyboard leaves with it, silently
        this.root = null;
        this.select = null;
        this.frame.pulse('willUnmount');
        // Not the stranger's line: Dropdown v6 (P109 ISL-031, row D30) — the states go with the element: Focused, Hover and
        // Pressed false, Blurred and Hover End for the ones that were on; v4, the spec this round was handed, kept them
        if (this.focused) {
          this.focused = false;
          this.frame.sent('focusState');
          this.frame.pulse('onBlur');
        }
        if (this.hover) {
          this.hover = false;
          this.frame.sent('hoverState');
          this.frame.pulse('hoverEnd');
        }
        if (this.pressed) {
          this.pressed = false;
          this.frame.sent('pressedState');
        }
      }
      return;
    }
    let fresh = false;
    if (!this.root) {
      this.build();
      document.body.appendChild(this.root);
      fresh = true;
      this.frame.pulse('didMount');
    }
    const select = this.select;
    select.disabled = !this.enabled;
    const visibility = this.visible ? '' : 'hidden';
    this.root.style.visibility = visibility;
    select.style.visibility = visibility;
    this.drawLabel();
    this.drawDataAttributes();
    this.drawLook();

    // the options, and what the element is told to select
    const held = fresh ? '' : select.value;
    // Not the stranger's line: Dropdown v7 (P109 ISL-045, row P109-S21-DROPDOWNEMPTYRESET) — read before the rebuild, which
    // the DOM's own selectedness rules would answer for it
    const heldNothing = !fresh && select.selectedIndex === -1;
    const options = optionsOf(this.items);
    while (select.options.length > 1) select.remove(1);
    for (const o of options) {
      const el = document.createElement('option');
      el.setAttribute('value', o.value);
      el.textContent = o.label;
      el.disabled = o.disabled;
      select.appendChild(el);
    }
    const offered = (v) => options.some((o) => o.value === v);
    const inList = this.value !== undefined && offered(this.value);
    let selected = held;
    // Not the stranger's line: Dropdown v7 (P109 ISL-045, row P109-S21-DROPDOWNEMPTYRESET) — with no enabled option left the
    // element selects nothing (`null`, selectedIndex -1), and the next enabled option to arrive is selected as it arrives; v6,
    // the spec this round was handed, kept the hidden option selected in both places
    const firstEnabled = () => {
      const first = options.find((o) => !o.disabled);
      return first ? first.value : null;
    };
    if (fresh) selected = inList ? this.value : '';
    else if (inList) selected = this.value;
    else if (held !== '' && !offered(held)) selected = firstEnabled();
    else if (heldNothing) selected = firstEnabled();
    if (selected === null) select.selectedIndex = -1;
    else select.value = selected;
    this.drawShown();
  }

  build() {
    const document = this.page.document;
    const root = document.createElement('div');
    root.className = 'nsp-dropdown';
    const wrap = document.createElement('div');
    wrap.style.position = 'relative';
    const select = document.createElement('select');
    select.style.opacity = '0';
    select.style.position = 'absolute';
    const empty = document.createElement('option');
    empty.setAttribute('value', '');
    empty.disabled = true;
    empty.hidden = true;
    select.appendChild(empty);
    const shown = document.createElement('span');
    wrap.appendChild(select);
    wrap.appendChild(shown);
    root.appendChild(wrap);
    this.root = root;
    this.wrap = wrap;
    this.select = select;
    this.shown = shown;
    this.labelEl = null;
    this.listen(select);
  }

  /** The node's answer to a person: only what reaches these listeners. */
  listen(select) {
    const frame = this.frame;
    const on = (type, fn) => select.addEventListener(type, fn);
    on('mouseover', () => {
      this.hover = true;
      frame.sent('hoverState');
      frame.pulse('hoverStart');
    });
    on('mouseout', () => {
      this.hover = false;
      this.pressed = false;
      frame.sent('hoverState');
      frame.sent('pressedState');
      frame.pulse('hoverEnd');
    });
    on('mousedown', () => {
      this.pressed = true;
      frame.sent('pressedState');
      frame.pulse('pointerDown');
    });
    on('mouseup', () => {
      this.pressed = false;
      frame.sent('pressedState');
      frame.pulse('pointerUp');
    });
    // Not the stranger's line: Dropdown v5 (P109 ISL-031, row C64) — a finger on a disabled control reports nothing, as a mouse
    // press on one does; v4, the spec this round was handed, let the finger land
    on('touchstart', () => {
      if (select.disabled) return;
      this.pressed = true;
      frame.sent('pressedState');
      frame.pulse('pointerDown');
    });
    on('touchend', () => {
      if (select.disabled) return; // not the stranger's line (C64, above)
      this.pressed = false;
      frame.sent('pressedState');
      frame.pulse('pointerUp');
    });
    on('focus', () => {
      this.focused = true;
      frame.sent('focusState');
      frame.pulse('onFocus');
    });
    on('blur', () => {
      this.focused = false;
      frame.sent('focusState');
      frame.pulse('onBlur');
    });
    on('change', () => {
      this.value = select.value;
      frame.sent('value');
      frame.pulse('onChange');
      this.drawShown();
    });
  }

  drawLabel() {
    const on = !!this.inputs.useLabel;
    if (on && !this.labelEl) {
      this.labelEl = this.page.document.createElement('label');
      this.root.insertBefore(this.labelEl, this.wrap);
    } else if (!on && this.labelEl) {
      this.labelEl.remove();
      this.labelEl = null;
    }
    if (this.labelEl) this.labelEl.textContent = this.inputs.label === undefined || this.inputs.label === null ? '' : text(this.inputs.label);
  }

  drawDataAttributes() {
    for (const name of Object.keys(this.derived)) {
      const v = this.derived[name];
      if (v === undefined || v === null) this.root.removeAttribute(name);
      else this.root.setAttribute(name, text(v));
    }
  }

  drawLook() {
    const i = this.inputs;
    const css = (v) => (typeof v === 'string' ? v : '');
    this.wrap.style.backgroundColor = css(i.backgroundColor);
    this.shown.style.color = css(i.color);
  }

  drawShown() {
    if (!this.select) return;
    const opt = this.select.selectedOptions && this.select.selectedOptions[0];
    const placeholder = this.inputs.placeholder;
    this.shown.textContent = opt && opt.value !== '' ? opt.textContent : opt && !opt.hidden ? opt.textContent : placeholder === undefined || placeholder === null ? '' : text(placeholder);
  }

  dispose() {
    if (this.root) this.root.remove();
    this.root = null;
    this.select = null;
  }
}

module.exports = { Dropdown, OUTPUTS };
