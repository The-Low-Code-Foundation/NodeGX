import { Slider } from '../../components/controls/Slider';
import guid from '../../guid';
import NodeSharedPortDefinitions from '../../node-shared-port-definitions';
import { createNodeFromReactComponent } from '../../react-component-node';
import Utils from './utils';

const thumbPopout = { group: 'thumb-styles', label: 'Thumb Styles' };

/** P107 R39 — the editor's key for a Max below Min (`_attributeChanged`) */
const MAX_BELOW_MIN = 'slider/max-below-min';
const trackPopout = { group: 'track-styles', label: 'Track Styles' };

const RangeNode = {
  name: 'net.noodl.controls.range',
  displayNodeName: 'Slider',
  docs: 'https://docs.noodl.net/nodes/ui-controls/slider',
  allowChildren: false,
  noodlNodeAsProp: true,
  connectionPanel: {
    groupPriority: [
      'General',
      'Style',
      'Actions',
      'Events',
      'States',
      'Mounted',
      'Hover Events',
      'Pointer Events',
      'Focus Events'
    ]
  },
  initialize() {
    this.props.sizeMode = 'contentHeight';
    this.props.id = 'input-' + guid();

    this.props.value = this.props.min;
    this._internal.outputValue = 0;
    // P107-C73 + D36 (P109 ISL-031, both ruled "Fix it now"): the handle is the node's, not the component's. `handle` is where
    // it was last put — by a person's slide or by the graph's word drawn — so a remounted component starts there instead of
    // taking the author's Value back (D36, "where the person left it"). `wordPending` is a Value the graph wrote that the page
    // has not drawn yet; `valueWrites` counts those words, so the component draws each one, the same value as the last
    // included (C73: a Reset after a slide was dropped because it equalled the author's last Value).
    this.props.handle = 0;
    this.props.valueWrites = 0;
    this._internal.wordPending = true;

    this.props._nodeId = this.id;

    // a person's slide: Changed fires when the value moves
    this.props.updateOutputValue = (value: string | number) => this._reportValue(value, true);
    // the paint: the handle drawn as the browser holds it — the graph's word when one is waiting, else where it was —
    // against the attributes now, and reported without Changed (D36). P107-C74 (ruled "Follow the handle"): Value and Value
    // Percent describe the handle the browser draws, clamped and rounded to the step, after a Value and after Min, Max or Step
    // moved. Returns the value the handle shows.
    this.props.drawHandle = () => {
      const target = this._internal.wordPending ? this.props.value : this.props.handle;
      this._internal.wordPending = false;
      const value = Number(browserRangeValue(this.props, target));
      this._reportValue(value, false);
      return value;
    };

    this._reportValue(this.props.value, false); // Set the value output to an initial value
  },
  getReactComponent() {
    return Slider;
  },
  inputs: {
    value: {
      // NDA-012 (Visual), E1. This was declared `type: 'string'` while the `Value` *output* is
      // `type: 'number'`, so one Slider could not feed another without a cast and the property
      // panel offered a text field for a number. `string → number` is in the typecast table
      // (`nodelibraryexport.ts`), so a connection from anything textual still lands.
      type: 'number',
      displayName: 'Value',
      group: 'General',
      description:
        'Moves the handle to this value, clamped to Min and Max and rounded to the Step; changing it from the graph does not fire Changed. An empty value leaves the handle where it is',
      index: 100,
      set(value) {
        this._setInputValue(value);
      }
    }
  },
  outputs: {
    value: {
      type: 'number',
      displayName: 'Value',
      group: 'States',
      description: 'The value the handle is currently at, between Min and Max, as a number',
      get() {
        return this._internal.outputValue;
      }
    },
    valuePercent: {
      type: 'number',
      displayName: 'Value Percent',
      group: 'States',
      description: 'Where the handle sits as a whole number from 0 to 100, regardless of Min and Max',
      get() {
        return this._internal.valuePercent;
      }
    },
    onChange: {
      type: 'signal',
      displayName: 'Changed',
      group: 'Events',
      description: 'Fires when the user moves the handle; a value arriving on the Value input does not fire it'
    }
  },
  inputProps: {
    min: {
      type: 'number',
      displayName: 'Min',
      group: 'General',
      description: 'Value at the far left of the track; the current value is clamped up to it if it is below',
      default: 0,
      index: 100,
      onChange() {
        this._attributeChanged();
      }
    },
    max: {
      type: 'number',
      displayName: 'Max',
      group: 'General',
      description: 'Value at the far right of the track; the current value is clamped down to it if it is above',
      default: 100,
      index: 100,
      onChange() {
        this._attributeChanged();
      }
    },
    step: {
      type: 'number',
      displayName: 'Step',
      group: 'General',
      description: 'Smallest amount the handle can move by, so the value lands on multiples of it',
      default: 1,
      index: 100,
      onChange() {
        this._attributeChanged();
      }
    },
    width: {
      index: 11,
      group: 'Dimensions',
      displayName: 'Width',
      description: 'Overall width of the slider, which is the length of the track plus the handle',
      type: {
        name: 'number',
        units: ['%', 'px', 'vw'],
        defaultUnit: '%'
      },
      default: 100,
      allowVisualStates: true
    },
    // Styles
    thumbWidth: {
      group: 'Thumb Style',
      displayName: 'Width',
      description: 'Width of the handle the user drags',
      type: {
        name: 'number',
        units: ['px', 'vw', '%'],
        defaultUnit: 'px',
        allowEditOnly: true
      },
      default: 16,
      popout: thumbPopout,
      allowVisualStates: true
    },
    thumbHeight: {
      group: 'Thumb Style',
      displayName: 'Height',
      description: 'Height of the handle the user drags',
      type: {
        name: 'number',
        units: ['px', 'vh', '%'],
        defaultUnit: 'px',
        allowEditOnly: true
      },
      default: 16,
      popout: thumbPopout,
      allowVisualStates: true
    },
    thumbColor: {
      group: 'Thumb Style',
      displayName: 'Color',
      description: 'Fill colour of the handle',
      type: { name: 'color', allowEditOnly: true },
      default: '#000000',
      popout: thumbPopout,
      allowVisualStates: true
    },
    trackHeight: {
      group: 'Track Style',
      displayName: 'Height',
      description: 'Thickness of the bar the handle slides along',
      type: {
        name: 'number',
        units: ['px', 'vh', '%'],
        defaultUnit: 'px',
        allowEditOnly: true
      },
      default: 6,
      popout: trackPopout,
      allowVisualStates: true
    },
    trackColor: {
      group: 'Track Style',
      displayName: 'Inactive Color',
      description: 'Colour of the part of the track the handle has not reached yet',
      type: { name: 'color', allowEditOnly: true },
      default: '#f0f0f0',
      popout: trackPopout,
      allowVisualStates: true
    },
    trackActiveColor: {
      group: 'Track Style',
      displayName: 'Active Color',
      description: 'Colour of the part of the track between Min and the handle',
      type: { name: 'color', allowEditOnly: true },
      default: '#f0f0f0',
      popout: trackPopout,
      allowVisualStates: true
    }
  },
  methods: {
    /** Value (and Value Percent) as the handle now shows; Changed only for a person's slide (`announce`) */
    _reportValue(value: string | number, announce: boolean) {
      value = typeof value === 'string' ? parseFloat(value) : value;
      this.props.handle = value;

      const valueChanged = this._internal.outputValue !== value;
      if (valueChanged) {
        this._internal.outputValue = value;
        this.flagOutputDirty('value');
        announce && this.sendSignalOnOutput('onChange');
      }

      // P107-C74: recomputed at every report, so a moved Min or Max reaches it (it was recomputed only with the value)
      this._updateOutputValuePercent(value);
    },
    /** Min, Max or Step written: the next paint draws the handle against them (C74) — no word for it */
    _attributeChanged() {
      // P107 R39 (2026-10-14, Richard: "Yes, warn"), as the Counter's `counter/min-above-max`: a Max below Min holds the
      // handle at Min and a person's slide takes nothing (`browserRangeValue`), and nothing said why. Over the attributes as
      // the browser reads them (a blank Min or Max is 0 or 100). The spec says the same sentence (nodegx-node-spec slider.ts).
      const min = rangeAttribute(this.props.min) ?? 0;
      const max = rangeAttribute(this.props.max) ?? 100;
      this.setDiagnostic(MAX_BELOW_MIN, max < min ? `Max ${max} is below Min ${min}, so the handle stays at Min and cannot be moved.` : null);
      this.props.valueWrites++;
      this.forceUpdate();
    },
    _updateOutputValuePercent(value: number) {
      // P107-C75 (ruled "Percent 0, defaults for blanks"): over the attributes as the browser reads them, a blank Min or Max
      // as 0 or 100; 0 when they are equal — the handle sits at the start (0 / 0 read NaN, and every report re-sent it). A -0
      // (a reversed range at its start) is 0.
      const min = rangeAttribute(this.props.min) ?? 0;
      const max = rangeAttribute(this.props.max) ?? 100;
      const valuePercent = max === min ? 0 : Math.floor(((value - min) / (max - min)) * 100) + 0;
      // NDA-012 (Visual), A3. This compared against `this._internal.valuePercentChanged` — a
      // field nothing ever writes, so always `undefined`, so the comparison was always true and
      // `valuePercent` was flagged dirty on *every* value change whether the percentage moved or
      // not. Dragging within one percent re-ran everything downstream.
      //
      // ⚠️ PLAT-003 slice 10 found this exact bug, wrote four lines explaining it, and kept it
      // verbatim in the *deprecated* `range.tsx` — without ever looking at the live node, which
      // carried the identical code with no comment. This is the live one.
      const valuePercentChanged = this._internal.valuePercent !== valuePercent;

      this._internal.valuePercent = valuePercent;
      valuePercentChanged && this.flagOutputDirty('valuePercent');
    },
    /** A Value write is the graph's word for the handle whatever it equals (C73, R14 "the last word wins"); the paint draws it */
    _setInputValue(newValue) {
      // NDA-012 (Visual), G1. This was `Math.min(this.props.max, newValue || 0)`, and the two
      // things wrong with it were both invisible:
      //
      // - `null` and a legitimate `0` were the same arrival, and both clamped to `Min`. A Slider
      //   with `Min = 10` fed `null` by a query that matched nothing silently read 10.
      // - anything non-numeric survived `||` and became `NaN` at `Math.min`, so `props.value` was
      //   `NaN` with nothing said anywhere. The port used to be declared `string` (E1), so that
      //   was an ordinary arrival rather than a malformed graph.
      //
      // A handle position has no representable empty state, so per `EMPTY-VALUE-CONTRACT.md` the
      // empty values abstain and leave the handle alone — the shape `Radio Button Group`'s
      // `Value` took earlier in this phase — and a value that is not a number is reported on the
      // runtime channel rather than coerced into a plausible one.
      if (newValue === undefined || newValue === null || newValue === '') return;

      const asNumber = Number(newValue);
      if (!Number.isFinite(asNumber)) {
        this.raiseRuntimeError(
          'slider/value-not-a-number',
          `Value cannot be read as a number (got ${JSON.stringify(newValue)}), so the handle has not moved.`
        );
        return;
      }

      // the paint clamps and steps it as the browser does (C74, `drawHandle`)
      this.props.value = asNumber;
      this._internal.wordPending = true;
      this.props.valueWrites++;
      this.forceUpdate();
    }
  }
};

/**
 * P107-C74 / C75 — an attribute of the `<input type="range">` as the element carries it (`String(v)`; `undefined`, `null`, a
 * boolean, a function draw none) read by HTML's rules for parsing floating-point number values, the lenient prefix parse
 * (`"1,2"` is 1). The node reads Min, Max and Step as the browser reads what the component renders (Slider.tsx `min`, `max`,
 * `step`), so Value describes the handle drawn.
 */
function rangeAttribute(v: unknown): number | undefined {
  if (v === undefined || v === null || typeof v === 'boolean' || typeof v === 'function' || typeof v === 'symbol') return undefined;
  const str = String(v);
  const lead = str.length - str.trimStart().length;
  if (/[^\t\n\f\r ]/.test(str.slice(0, lead))) return undefined;
  const n = parseFloat(str);
  return Number.isFinite(n) ? n : undefined;
}

/**
 * P107-C74 — the value an `<input type="range">` holds for `v`, as the element renders `props`: not a valid floating-point number
 * → the middle (or Min when Max is below it); clamped to [Min, Max]; then, when Max is not below Min, rounded to the step from
 * Min (else from the handle the element carries, else 0), a tie upwards, a rounding past Max stepped back one, below Min forward
 * one (HTML's value sanitization and step-mismatch rules). Step only when truthy (Slider.tsx), a step that is not a positive
 * number is 1. Returned as the text the element holds.
 */
function browserRangeValue(props: { min?: unknown; max?: unknown; step?: unknown; handle?: unknown }, v: unknown): string {
  const minAttr = rangeAttribute(props.min);
  const min = minAttr ?? 0;
  const max = rangeAttribute(props.max) ?? 100;
  const text = typeof v === 'number' ? (Number.isFinite(v) ? String(v) : '') : v;
  const parsed = typeof text === 'string' && /^-?(?:\d+|\d*\.\d+)(?:[eE][-+]?\d+)?$/.test(text) ? parseFloat(text) : undefined;
  const valid = parsed !== undefined && Number.isFinite(parsed) ? parsed : undefined;
  const proposed = valid === undefined ? (max < min ? min : (min + max) / 2) : valid;
  const inRange = valid === undefined ? proposed : proposed < min ? min : proposed > max ? max : proposed;
  // a reversed range holds Min, as Chromium draws it (it raises Max to Min)
  if (max < min) return String(min);
  const stepAttr = props.step ? rangeAttribute(props.step) : undefined;
  const step = stepAttr !== undefined && stepAttr > 0 ? stepAttr : 1;
  const base = minAttr ?? rangeAttribute(props.handle) ?? 0;
  const rounded = base + Math.round((inRange - base) / step) * step;
  const clamped = rounded > max ? rounded - step : rounded < min ? rounded + step : rounded;
  return String(clamped < min || clamped > max ? inRange : clamped);
}

//Add borders
function addBorderInputs(definition, opts) {
  opts = opts || {};
  const defaults = opts.defaults || {};
  const popout = opts.popout;

  defaults.borderStyle = 'none';
  defaults.borderWidth = 0;
  defaults.borderColor = '#000000';

  const prefixLabel = opts.propPrefix[0].toUpperCase() + opts.propPrefix.slice(1);

  function defineBorderTab(definition, suffix, tabName, indexOffset) {
    const styleName = opts.propPrefix + `Border${suffix}Style`;
    const widthName = opts.propPrefix + `Border${suffix}Width`;
    const colorName = opts.propPrefix + `Border${suffix}Color`;

    let orNotSet = defaults.borderStyle !== 'none' ? 'OR borderStyle NOT SET' : '';

    if (suffix) {
      if (defaults[styleName] && defaults[styleName] !== 'none') orNotSet += `OR ${styleName} NOT SET`;
      NodeSharedPortDefinitions.addDynamicInputPorts(
        definition,
        `${styleName} = solid OR ${styleName} = dashed OR ${styleName} = dotted OR borderStyle = solid OR borderStyle = dashed OR borderStyle = dotted ${orNotSet}`,
        [`${widthName}`, `${colorName}`]
      );
    } else {
      NodeSharedPortDefinitions.addDynamicInputPorts(
        definition,
        `${styleName} = solid OR ${styleName} = dashed OR ${styleName} = dotted ${orNotSet}`,
        [`${widthName}`, `${colorName}`]
      );
    }

    const tab = {
      group: opts.propPrefix + '-border-styles',
      tab: tabName,
      label: suffix
    };

    const editorName = (name) => `${prefixLabel} ${name} ${suffix ? '(' + suffix + ')' : ''}`;
    const index = 202 + indexOffset * 4;

    const groupName = prefixLabel + ' Border Style';

    // NDA-012 (Visual), check C1. These three generators produce ~60 of Slider's ports and are
    // private to this file, so the shared pass in NDA-005 §0 could not reach them — see DV-vi.
    const part = opts.propPrefix === 'thumb' ? 'the handle you drag' : 'the bar the handle slides along';
    const edge = suffix ? suffix.toLowerCase() : '';

    NodeSharedPortDefinitions.addInputProps(definition, {
      [styleName]: {
        index: index + 1,
        displayName: 'Border Style',
        editorName: editorName('Border Style'),
        description: suffix
          ? `Line style for the ${edge} edge of ${part} only, overriding ${prefixLabel} Border Style; None hides that edge`
          : `Line style for all four edges of ${part}; None hides the border and leaves its Width and Color inactive`,
        group: groupName,
        type: {
          name: 'enum',
          enums: [
            { label: 'None', value: 'none' },
            { label: 'Solid', value: 'solid' },
            { label: 'Dotted', value: 'dotted' },
            { label: 'Dashed', value: 'dashed' }
          ]
        },
        default: defaults[`border${suffix}Style`],
        tab,
        popout,
        allowVisualStates: true
      },
      [widthName]: {
        index: index + 2,
        displayName: 'Border Width',
        editorName: editorName('Border Width'),
        description: suffix
          ? `Thickness in pixels of the ${edge} edge of ${part}, which has no effect while that edge's Border Style is None`
          : `Thickness in pixels of the border around ${part}, which has no effect while ${prefixLabel} Border Style is None`,
        group: groupName,
        type: {
          name: 'number',
          units: ['px'],
          defaultUnit: 'px'
        },
        default: defaults[`border${suffix}Width`],
        tab,
        popout,
        allowVisualStates: true
      },
      [colorName]: {
        index: index + 3,
        displayName: 'Border Color',
        editorName: editorName('Border Color'),
        description: suffix
          ? `Colour of the ${edge} edge of ${part} only, overriding ${prefixLabel} Border Color`
          : `Colour of the border around ${part}, which has no effect while ${prefixLabel} Border Style is None`,
        group: groupName,
        type: 'color',
        default: defaults[`border${suffix}Color`],
        tab,
        popout,
        allowVisualStates: true
      }
    });
  }

  defineBorderTab(definition, '', 'borders-all', 0);
  defineBorderTab(definition, 'Left', 'borders-left', 1);
  defineBorderTab(definition, 'Top', 'borders-top', 2);
  defineBorderTab(definition, 'Right', 'borders-right', 3);
  defineBorderTab(definition, 'Bottom', 'borders-bottom', 4);
}

function addBorderRadius(definition, opts) {
  opts = opts || {};
  const defaults = opts.defaults || {};
  const popout = opts.popout;

  if (!defaults.borderRadius) defaults.borderRadius = 0;

  const prefixLabel = opts.propPrefix[0].toUpperCase() + opts.propPrefix.slice(1);

  function defineCornerTab(definition, suffix, tabName, indexOffset) {
    const editorName = (name) => `${prefixLabel} ${name} ${suffix ? '(' + suffix + ')' : ''}`;

    const tab = {
      group: opts.propPrefix + '-corners',
      tab: tabName,
      label: suffix
    };
    const radiusName = `Border${suffix}Radius`;
    const part = opts.propPrefix === 'thumb' ? 'the handle you drag' : 'the bar the handle slides along';
    const corner = suffix ? suffix.replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase() : '';

    NodeSharedPortDefinitions.addInputProps(definition, {
      [opts.propPrefix + radiusName]: {
        index: 240 + indexOffset,
        displayName: 'Corner Radius',
        editorName: editorName('Corner Radius'),
        description: suffix
          ? `How rounded the ${corner} corner of ${part} is, overriding ${prefixLabel} Corner Radius`
          : `How rounded all four corners of ${part} are; half its width and height makes it a circle`,
        group: prefixLabel + ' Corner Radius',
        type: {
          name: 'number',
          units: ['px', '%'],
          defaultUnit: 'px'
        },
        default: defaults[`border${suffix}Radius`],
        tab,
        popout
      }
    });
  }

  defineCornerTab(definition, '', 'corners-all', 0);
  defineCornerTab(definition, 'TopLeft', 'corners-top-left', 1);
  defineCornerTab(definition, 'TopRight', 'corners-top-right', 2);
  defineCornerTab(definition, 'BottomRight', 'corners-bottom-right', 3);
  defineCornerTab(definition, 'BottomLeft', 'corners-bottom-left', 4);
}

function addShadowInputs(definition, opts) {
  opts = opts || {};
  const popout = opts.popout;
  const prefix = opts.propPrefix;

  NodeSharedPortDefinitions.addDynamicInputPorts(definition, `${prefix}BoxShadowEnabled = true`, [
    `${prefix}BoxShadowOffsetX`,
    `${prefix}BoxShadowOffsetY`,
    `${prefix}BoxShadowInset`,
    `${prefix}BoxShadowBlurRadius`,
    `${prefix}BoxShadowSpreadRadius`,
    `${prefix}BoxShadowColor`
  ]);

  const prefixLabel = opts.propPrefix[0].toUpperCase() + opts.propPrefix.slice(1);
  const editorName = (name) => `${prefixLabel} ${name}`;
  const part = opts.propPrefix === 'thumb' ? 'the handle you drag' : 'the bar the handle slides along';

  NodeSharedPortDefinitions.addInputProps(definition, {
    [`${prefix}BoxShadowEnabled`]: {
      index: 250,
      group: opts.group || 'Box Shadow',
      displayName: 'Shadow Enabled',
      editorName: editorName('Shadow Enabled'),
      description: `Draws a shadow behind ${part}; the rest of this group does nothing while it is off`,
      type: 'boolean',
      allowVisualStates: true,
      popout
    },
    [`${prefix}BoxShadowOffsetX`]: {
      index: 251,
      group: opts.group || 'Box Shadow',
      displayName: 'Offset X',
      editorName: editorName('Offset X'),
      description: 'How far right the shadow sits from the element; negative values move it left',
      default: 0,
      type: {
        name: 'number',
        units: ['px'],
        defaultUnit: 'px'
      },
      allowVisualStates: true,
      popout
    },
    [`${prefix}BoxShadowOffsetY`]: {
      index: 252,
      group: opts.group || 'Box Shadow',
      displayName: 'Offset Y',
      editorName: editorName('Offset Y'),
      description: 'How far down the shadow sits from the element; negative values move it up',
      default: 0,
      type: {
        name: 'number',
        units: ['px'],
        defaultUnit: 'px'
      },
      allowVisualStates: true,
      popout
    },
    [`${prefix}BoxShadowBlurRadius`]: {
      index: 253,
      group: opts.group || 'Box Shadow',
      displayName: 'Blur Radius',
      editorName: editorName('Blur Radius'),
      description: 'How soft the shadow edge is; 0 gives a hard edge',
      default: 5,
      type: {
        name: 'number',
        units: ['px'],
        defaultUnit: 'px'
      },
      allowVisualStates: true,
      popout
    },
    [`${prefix}BoxShadowSpreadRadius`]: {
      index: 254,
      group: opts.group || 'Box Shadow',
      displayName: 'Spread Radius',
      editorName: editorName('Spread Radius'),
      description: 'Grows the shadow outwards before it is blurred; negative values shrink it',
      default: 2,
      type: {
        name: 'number',
        units: ['px'],
        defaultUnit: 'px'
      },
      allowVisualStates: true,
      popout
    },
    [`${prefix}BoxShadowInset`]: {
      index: 255,
      group: opts.group || 'Box Shadow',
      displayName: 'Inset',
      editorName: editorName('Inset'),
      description: 'Draws the shadow inside the element instead of behind it, for a recessed look',
      type: 'boolean',
      default: false,
      allowVisualStates: true,
      popout
    },
    [`${prefix}BoxShadowColor`]: {
      index: 256,
      group: opts.group || 'Box Shadow',
      displayName: 'Shadow Color',
      editorName: editorName('Shadow Color'),
      description: 'Colour of the shadow, usually a mostly-transparent black',
      type: 'color',
      default: '#00000033',
      allowVisualStates: true,
      popout
    }
  });
}

NodeSharedPortDefinitions.addAlignInputs(RangeNode);
NodeSharedPortDefinitions.addTransformInputs(RangeNode);
NodeSharedPortDefinitions.addMarginInputs(RangeNode);
NodeSharedPortDefinitions.addPaddingInputs(RangeNode);
NodeSharedPortDefinitions.addSharedVisualInputs(RangeNode);
addBorderInputs(RangeNode, { propPrefix: 'track', popout: trackPopout });
addBorderRadius(RangeNode, { propPrefix: 'track', popout: trackPopout });
addShadowInputs(RangeNode, {
  propPrefix: 'track',
  popout: trackPopout,
  group: 'Track Box Shadow'
});

addBorderInputs(RangeNode, { propPrefix: 'thumb', popout: thumbPopout });
addBorderRadius(RangeNode, { propPrefix: 'thumb', popout: thumbPopout });
addShadowInputs(RangeNode, {
  propPrefix: 'thumb',
  popout: thumbPopout,
  group: 'Thumb Box Shadow'
});

Utils.addControlEventsAndStates(RangeNode);
Utils.addFocusActions(RangeNode, { noun: 'slider' });

export default createNodeFromReactComponent(RangeNode);
