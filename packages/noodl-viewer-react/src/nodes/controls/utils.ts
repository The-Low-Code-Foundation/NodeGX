import { outcomeOutputs } from '@noodl/runtime/src/outcome';

import PointerListeners from '../../pointerlisteners';

function _shallowCompare(o1, o2) {
  let p;
  for (p in o1) {
    if (o1.hasOwnProperty(p)) {
      if (o1[p] !== o2[p]) {
        return false;
      }
    }
  }
  for (p in o2) {
    if (o2.hasOwnProperty(p)) {
      if (o1[p] !== o2[p]) {
        return false;
      }
    }
  }
  return true;
}

const _styleSheets = {};

function updateStylesForClass(_class, props, _styleTemplate) {
  // Setters call this during graph load, which also happens server-side; the
  // injected stylesheet is browser-only and re-created at hydration.
  if (typeof document === 'undefined') return;

  if (_styleSheets[_class]) {
    // Check if props have changed
    if (!_shallowCompare(props, _styleSheets[_class].props)) {
      _styleSheets[_class].style.innerHTML = _styleTemplate(_class, props);
      _styleSheets[_class].props = Object.assign({}, props);
    }
  } else {
    // Create a new style sheet if none exists
    const style = document.createElement('style');
    style.innerHTML = _styleTemplate(_class, props);
    document.head.appendChild(style);

    _styleSheets[_class] = { style, props: Object.assign({}, props) };
  }
}

function mergeAttribute(definition, attribute, values) {
  if (!definition[attribute]) {
    definition[attribute] = {};
  }

  for (const name in values) {
    definition[attribute][name] = values[name];
  }
}

function addInputs(definition, values) {
  mergeAttribute(definition, 'inputs', values);
}

function addInputProps(definition, values) {
  mergeAttribute(definition, 'inputProps', values);
}

function addOutputProps(definition, values) {
  mergeAttribute(definition, 'outputProps', values);
}

function addOutputs(definition, values) {
  mergeAttribute(definition, 'outputs', values);
}

function addControlEventsAndStates(definition, args?) {
  args = args || {};

  definition.visualStates = [
    { name: 'neutral', label: 'Neutral' },
    { name: 'hover', label: 'Hover' },
    { name: 'pressed', label: 'Pressed' },
    { name: 'focused', label: 'Focused' },
    { name: 'disabled', label: 'Disabled' }
  ];

  if (args.checked) {
    definition.visualStates.splice(3, 0, { name: 'checked', label: 'Checked' });
  }

  addInputs(definition, {
    enabled: {
      type: 'boolean',
      displayName: 'Enabled',
      group: 'General',
      description:
        'Lets the user interact with this control; when off it still renders and occupies its space but ignores clicks, touches and typing',
      default: true,
      set: function (value) {
        value = !!value;
        const changed = value !== this._internal.enabled;
        this.props.enabled = this._internal.enabled = value;

        if (changed) {
          this._updateVisualState();
          this.forceUpdate();
          this.flagOutputDirty('enabled');
        }
      }
    }
  });

  addInputProps(definition, {
    blockTouch: {
      index: 450,
      displayName: 'Block Pointer Events',
      // FH-015 finding 3: "anything behind it" read as z-order; what it stops is the event
      // reaching the nodes this control sits inside.
      description:
        'Stops every pointer event that lands on this control from reaching the nodes it sits inside. Blunt: it takes hover and pointer-down with it, so reach for Click Bubbling first if it is only clicks you want to keep in',
      type: 'boolean',
      group: 'Pointer Events'
    },
    clickBubbling: {
      index: 451,
      displayName: 'Click Bubbling',
      description:
        "Whether a click on this control also fires Click on the nodes it sits inside. Automatic keeps it here as soon as this control's own Click is connected, so a Favourite button inside a clickable card runs Favourite and not the card; Always is the older behaviour where both run; Never keeps every click here, wired or not",
      type: {
        name: 'enum',
        enums: [
          { label: 'Automatic', value: 'auto' },
          { label: 'Always', value: 'always' },
          { label: 'Never', value: 'never' }
        ]
      },
      default: 'auto',
      group: 'Pointer Events'
    }
  });

  definition.methods._updateVisualState = function () {
    const states = [];

    //make sure they are in the order they should be applied
    if (this._internal.enabled) {
      if (this.outputPropValues.hoverState) states.push('hover');
      if (this.outputPropValues.pressedState) states.push('pressed');
      if (this.outputPropValues.focusState) states.push('focused');
    }

    if (args.checked && this._internal.checked) states.push('checked');
    if (!this._internal.enabled) states.push('disabled');

    this.setVisualStates(states);
  };

  addOutputProps(definition, {
    // Focus
    focusState: {
      displayName: 'Focused',
      group: 'States',
      description: 'True while this control holds keyboard focus, so typing and Enter go to it',
      type: 'boolean',
      props: {
        onFocus() {
          this.outputPropValues.focusState = true;
          this.flagOutputDirty('focusState');
          this._updateVisualState();
        },
        onBlur() {
          this.outputPropValues.focusState = false;
          this.flagOutputDirty('focusState');
          this._updateVisualState();
        }
      }
    },
    onFocus: {
      displayName: 'Focused',
      group: 'Focus Events',
      description: 'Fires the moment this control takes keyboard focus, whether from a click, a tab or a Focus action',
      type: 'signal',
      props: {
        onFocus() {
          this.sendSignalOnOutput('onFocus');
        }
      }
    },
    onBlur: {
      displayName: 'Blurred',
      group: 'Focus Events',
      description: 'Fires when keyboard focus leaves this control, which is the usual place to validate what was entered',
      type: 'signal',
      props: {
        onBlur() {
          this.sendSignalOnOutput('onBlur');
        }
      }
    },

    // Hover
    hoverState: {
      displayName: 'Hover',
      group: 'States',
      description: 'True while the pointer is over this control; stays false on touch devices with no pointer',
      type: 'boolean',
      props: {
        onMouseOver() {
          this.outputPropValues.hoverState = true;
          this.flagOutputDirty('hoverState');
          this._updateVisualState();
        },
        onMouseLeave() {
          this.outputPropValues.hoverState = false;
          this.flagOutputDirty('hoverState');
          this._updateVisualState();
        }
      }
    },
    hoverStart: {
      displayName: 'Hover Start',
      group: 'Pointer Events',
      description: 'Fires when the pointer moves onto this control',
      type: 'signal',
      props: {
        onMouseOver() {
          this.sendSignalOnOutput('hoverStart');
        }
      }
    },
    hoverEnd: {
      displayName: 'Hover End',
      group: 'Pointer Events',
      description: 'Fires when the pointer leaves this control, including when it leaves while a button is still held',
      type: 'signal',
      props: {
        onMouseLeave() {
          this.sendSignalOnOutput('hoverEnd');
        }
      }
    },

    // Pressed
    pressedState: {
      displayName: 'Pressed',
      group: 'States',
      description: 'True while a mouse button or finger is held down on this control, and false again the moment it is released or slides off',
      type: 'boolean',
      props: {
        onMouseDown() {
          this.outputPropValues.pressedState = true;
          this.flagOutputDirty('pressedState');
          this._updateVisualState();
        },
        onTouchStart() {
          this.outputPropValues.pressedState = true;
          this.flagOutputDirty('pressedState');
          this._updateVisualState();
        },
        onMouseUp() {
          this.outputPropValues.pressedState = false;
          this.flagOutputDirty('pressedState');
          this._updateVisualState();
        },
        onTouchEnd() {
          this.outputPropValues.pressedState = false;
          this.flagOutputDirty('pressedState');
          this._updateVisualState();
        },
        onTouchCancel() {
          this.outputPropValues.pressedState = false;
          this.flagOutputDirty('pressedState');
          this._updateVisualState();
        },
        onMouseLeave() {
          this.outputPropValues.pressedState = false;
          this.flagOutputDirty('pressedState');
          this._updateVisualState();
        }
      }
    },
    pointerDown: {
      displayName: 'Pointer Down',
      group: 'Pointer Events',
      description: 'Fires as a mouse button or finger goes down on this control, before any click has completed',
      type: 'signal',
      props: {
        onMouseDown() {
          this.sendSignalOnOutput('pointerDown');
        },
        onTouchStart() {
          this.sendSignalOnOutput('pointerDown');
        }
      }
    },
    pointerUp: {
      displayName: 'Pointer Up',
      group: 'Pointer Events',
      description: 'Fires when the mouse button or finger is lifted, and also when a touch is cancelled by the system',
      type: 'signal',
      props: {
        onMouseUp() {
          this.sendSignalOnOutput('pointerUp');
        },
        onTouchEnd() {
          this.sendSignalOnOutput('pointerUp');
        },
        onTouchCancel() {
          this.sendSignalOnOutput('pointerUp');
        }
      }
    }
  });

  addOutputs(definition, {
    enabled: {
      type: 'boolean',
      displayName: 'Enabled',
      group: 'States',
      description: 'Reports back whether this control is currently accepting interaction, following the Enabled input',
      getter: function () {
        return this._internal.enabled;
      }
    }
  });

  const oldInit = definition.initialize;
  definition.initialize = function () {
    oldInit && oldInit.call(this);
    this.props.enabled = this._internal.enabled = true;
    this.outputPropValues.hoverState = this.outputPropValues.focusState = this.outputPropValues.pressedState = false;
  };
}

function controlEvents(props) {
  return Object.assign(
    {},
    {
      onFocus: props.onFocus,
      onBlur: props.onBlur
    },
    PointerListeners(props)
  );
}

/** The elements a person can put the keyboard on. A control's root is often a wrapper `div` around one. */
const FOCUSABLE_SELECTOR = 'button, input, select, textarea';

/**
 * GAM-010 — `Focus` and `Blur` for a control, one definition for Button, Checkbox, Radio Button,
 * Dropdown and Slider.
 *
 * 🔒 R11 follows R13 (GAM-012 §5): a Focus to a control that is on the page puts the keyboard on it
 * every time. One that is not on the page does nothing and is **not held** for later, because taking
 * focus once the control appears would steal it from wherever the person has gone since. It reports
 * `Unchanged` and sets the editor-only `focus/not-mounted` diagnostic, so a deployed page prints
 * nothing. Both actions go through the viewer's focus tracker (`focus-tracker.ts`), the same path
 * as Text Input, so a Focus blurs a Group that was focused elsewhere and a repeated Focus lands.
 *
 * The target is the **real** control, never the wrapper: a Checkbox, Radio Button and Slider render
 * a `div` around an `<input>`, and a Dropdown an invisible `<select>` inside two `div`s. Focusing the
 * `div` does nothing in a browser, silently.
 *
 * Text Input keeps its own Focus and Blur, which predate this and read its inner component.
 *
 * @param options.unchanged the `Unchanged` sentence for a node that has no outcome ports yet. A node
 * that already declares `done` (Checkbox) keeps its own ports and says Focus in its own sentences.
 */
function addFocusActions(definition, options: { noun: string; done?: string; unchanged?: string }) {
  const noun = options.noun;

  addInputs(definition, {
    focus: {
      type: 'signal',
      group: 'Actions',
      displayName: 'Focus',
      description: `Puts the keyboard on this ${noun}, so Enter, Space and the arrow keys go to it`,
      valueChangedToTrue() {
        const outcome = this.beginOutcome();
        const took = this.context.setNodeFocused(this, true) !== false;
        this.setDiagnostic(
          'focus/not-mounted',
          took
            ? null
            : `Focus arrived while this ${noun} was not on the page, so nothing was focused. A Focus is not kept ` +
                `for later: send it once the ${noun} has mounted, for example from its Did Mount or its row’s`
        );
        this.reportOutcome(outcome, took ? 'done' : 'unchanged');
      }
    },
    blur: {
      type: 'signal',
      group: 'Actions',
      displayName: 'Blur',
      description: `Takes the keyboard away from this ${noun}, which is what fires Blurred`,
      valueChangedToTrue() {
        const outcome = this.beginOutcome();
        this.context.setNodeFocused(this, false);
        this.reportOutcome(outcome, 'done');
      }
    }
  });

  if (!definition.outputs || !definition.outputs.done) {
    addOutputs(
      definition,
      outcomeOutputs({
        done: options.done || `Fires when Focus put the keyboard on this ${noun}, or Blur took it away`,
        unchanged:
          options.unchanged ||
          `Fires when Focus arrived while this ${noun} was not on the page, so nothing was focused`
      })
    );
  }

  mergeAttribute(definition, 'methods', {
    /** The element that takes the keyboard, or null when the control is not on the page. */
    _focusTarget() {
      const root = this.getDOMElement();
      if (!root || !root.isConnected) return null;
      return root.matches(FOCUSABLE_SELECTOR) ? root : root.querySelector(FOCUSABLE_SELECTOR);
    },
    _focus() {
      const target = this._focusTarget();
      if (target) target.focus();
    },
    _blur() {
      const target = this._focusTarget();
      if (target) target.blur();
    },
    /** GAM-012 — the tracker asks before it records a Focus. */
    _canFocus() {
      return !!this._focusTarget();
    },
    /** GAM-012 — being listed by the tracker is not holding focus: a remounted control is a new element. */
    _hasFocus() {
      const target = this._focusTarget();
      return !!target && target.ownerDocument.activeElement === target;
    }
  });
}

export default {
  updateStylesForClass,
  addControlEventsAndStates,
  addFocusActions,
  controlEvents
};
