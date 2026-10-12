import React from 'react';

import Layout from '../../../layout';
import Utils from '../../../nodes/controls/utils';
import { outwardValueForFieldType } from '../../../nodes/controls/textInputValue';
import { Noodl, Slot } from '../../../types';
import { noodlRootRef, dataAttributeProps, clearedRootStyles } from '../../noodl-root-ref';
import { IconGlyph } from '../../visual/Icon/IconGlyph';
import { labelText } from '../labelText';

//this stops a text field from being unfocused by the clickHandler in the viewer that handles focus globally.
//The specific case is when a mouseDown is registered in the input, but the mouseUp is outside.
//It'll trigger a focus change that'll blur the input field, which is annyoing when you're selecting text
function preventGlobalFocusChange(e) {
  e.stopPropagation();
  window.removeEventListener('click', preventGlobalFocusChange, true);
}

export interface TextInputProps extends Noodl.ReactProps {
  id: string;
  type: 'text' | 'textArea' | 'email' | 'number' | 'password' | 'url';
  /** GAM-011 (a) — unset renders no attribute. */
  inputMode?: 'text' | 'numeric' | 'decimal' | 'tel' | 'email' | 'url' | 'search' | 'none';
  enterKeyHint?: 'enter' | 'done' | 'go' | 'next' | 'previous' | 'search' | 'send';
  textStyle: Noodl.TextStyle;

  enabled: boolean;

  placeholder: string;
  maxLength: number;

  startValue: string | number;
  value: string;

  useLabel: boolean;
  label: string;
  labelSpacing: string;
  labeltextStyle: Noodl.TextStyle;

  useIcon: boolean;
  iconPlacement: 'left' | 'right';
  iconSpacing: string;
  iconSourceType: 'image' | 'icon';
  iconImageSource: Noodl.Image;
  iconIconSource: Noodl.Icon;
  iconSize: string;
  iconColor: Noodl.Color;

  onTextChanged?: (value: string | number | null) => void;
  onEnter?: () => void;

  children: Slot;
}

// Based on (HTMLTextAreaElement | HTMLInputElement)
type InputRef = (HTMLTextAreaElement | HTMLInputElement) & {
  noodlNode?: Noodl.ReactProps['noodlNode'];
};

type State = {
  value: string;
};

/** GAM-009 — the two things the field asks of its node. Optional: a stand-in node may have neither. */
interface TextInputNodeSeam {
  _typed?: (text: string) => void;
  _announcedValueIs?: (value: string | number | null) => boolean;
  /** P107-C72 — the node's own props, current as each input arrives; React's copy waits for the holder's render */
  props?: { type?: unknown; maxLength?: unknown };
}

export class TextInput extends React.Component<TextInputProps, State> {
  ref: React.MutableRefObject<InputRef>;
  /**
   * The text the field holds as of the last write, at once — `state.value` only catches up when
   * React draws, so a second write in the same frame would read the text before the first.
   * Every write and keystroke goes through `setText`. Clear reads it (P107-D33); so does `edit`,
   * so an Insert Text or Backspace after another write in the same frame works on what that write
   * left (P107-C69, ruled "each sees the last").
   */
  text: string;

  /**
   * P107-C69 — the cursor as the writes since React last drew left it, or `null` when none has: the
   * element's selection only catches up at the commit. A changed value puts it at the end (HTML's
   * value setter); an edit in a focused field puts it after what it wrote.
   */
  private pendingCaret: number | null = null;

  /** P107-D35 — the <textarea> whose cursor was put at the end when it attached. */
  private restedTextArea: HTMLTextAreaElement | null = null;

  /** P107-C72 — the Type or Max length as it stands on the node, not as React last drew it. */
  private live(key: 'type' | 'maxLength') {
    const props = (this.props.noodlNode as unknown as TextInputNodeSeam | undefined)?.props;
    return props && key in props ? props[key] : this.props[key];
  }

  constructor(props: TextInputProps) {
    super(props);

    this.state = {
      // Same coercion `setText` does, for the same reason: a Number field can be given its
      // start value as a number, and the controlled `<input>` needs a string.
      value: props.startValue === null || props.startValue === undefined ? '' : String(props.startValue)
    } satisfies State;
    this.text = this.state.value;

    this.ref = React.createRef();
  }

  /**
   * FB-026 — what the field *holds* and what the node *emits* are two different things, and
   * before this they were the same string. The rule, and why the state stays raw text, is in
   * `nodes/controls/textInputValue.ts`.
   */
  setText(value: string | number, afterRender?: () => void) {
    // Inward it is always text: `startValue` may arrive as a number on a Number field, and the
    // `<input>`'s `value` has to be a string or React drops the control.
    const text = value === null || value === undefined ? '' : String(value);
    if (text !== this.text) this.pendingCaret = text.length;
    this.text = text;
    this.setState({ value: text }, afterRender);
    this.props.onTextChanged &&
      this.props.onTextChanged(outwardValueForFieldType(this.live('type') as TextInputProps['type'], text));
  }

  componentDidMount() {
    //plumbing for the focused signals
    this.ref.current.noodlNode = this.props.noodlNode;

    // GAM-009 🔒 R10 — a remount fires `Value Changed` only on a real change. The constructor has
    // already put `startValue` in the state, so all a mount adds is the announcement, and a field
    // coming back to the value it last announced has nothing to announce. A value the node wrote
    // while the field was away was never announced, so it still is, here, as before.
    const node = this.props.noodlNode as unknown as TextInputNodeSeam | undefined;
    const text = this.props.startValue === null || this.props.startValue === undefined ? '' : String(this.props.startValue);
    if (node?._announcedValueIs?.(outwardValueForFieldType(this.props.type, text))) return;

    this.setText(this.props.startValue);
  }

  render() {
    const style: React.CSSProperties = { ...this.props.style };

    Layout.size(style, this.props);
    Layout.align(style, this.props);

    if (style.opacity === 0) {
      style.pointerEvents = 'none';
    }

    const { height, ...otherStylesTmp } = style;
    
    // otherStylesTmp is not React.CSSProperties, reassigning it will correct the type.
    const otherStyles: React.CSSProperties = otherStylesTmp;

    const props = this.props;

    const _renderIcon = () => {
      if (props.iconSourceType === 'image' && props.iconImageSource !== undefined)
        return (
          <img
            alt=""
            src={props.iconImageSource}
            style={{
              width: props.iconSize,
              height: props.iconSize
            }}
            onClick={() => this.focus()}
          />
        );
      else if (props.iconSourceType === 'icon' && props.iconIconSource !== undefined) {
        const style: React.CSSProperties = {
          userSelect: 'none',
          fontSize: props.iconSize,
          color: props.iconColor
        };
        if (props.iconPlacement === 'left' || props.iconPlacement === undefined) style.marginRight = props.iconSpacing;
        else style.marginLeft = props.iconSpacing;

        return <IconGlyph source={props.iconIconSource} style={style} />;
      }

      return null;
    };

    let className = 'ndl-controls-textinput ' + props.id;
    if (props.className) className = className + ' ' + props.className;

    let inputContent;

    const inputStyles: React.CSSProperties = {
      ...props.textStyle,
      ...props.styles.input,
      width: '100%',
      height: '100%'
    };

    inputStyles.color = props.noodlNode.context.styles.resolveColor(inputStyles.color);

    const events = Utils.controlEvents(props);
    const inputProps = {
      id: props.id,
      value: this.state.value,
      ...events,
      // GAM-011 (b) — a field that has held focus has a caret someone placed; Insert Text uses it.
      onFocus: (e) => {
        this.hadCaret = true;
        events.onFocus && events.onFocus(e);
      },
      disabled: !props.enabled,
      style: inputStyles,
      className,
      placeholder: props.placeholder,
      maxLength: props.maxLength,
      // GAM-011 (a) — `undefined` when unset, which React leaves off the element.
      inputMode: props.inputMode || undefined,
      enterKeyHint: props.enterKeyHint || undefined,
      onChange: (e) => this.onChange(e)
    };

    if (props.type !== 'textArea') {
      inputContent = (
        <input
          // Block body on purpose: React 19 treats a ref callback's return value as a
          // cleanup function, and the concise `(ref) => (this.ref.current = ref)` form
          // returns the element itself.
          ref={(ref) => {
            this.ref.current = ref;
          }}
          type={this.props.type}
          {...inputProps}
          onKeyDown={(e) => this.onKeyDown(e)}
          onMouseDown={(e) => {
            // P107-C68 (P109 ISL-031, ruled "Pointer Down fires"): this replaced the control's own handler from the
            // spread above, so a mouse press fired no Pointer Down, set no Pressed and ran no drain; run both
            (inputProps as { onMouseDown?: (e: React.MouseEvent) => void }).onMouseDown?.(e);
            window.addEventListener('click', preventGlobalFocusChange, true);
          }}
          noodl-style-tag="input"
        />
      );
    } else {
      inputProps.style.resize = 'none'; //disable user resizing
      inputContent = (
        <textarea
          // Block body on purpose: React 19 treats a ref callback's return value as a
          // cleanup function, and the concise `(ref) => (this.ref.current = ref)` form
          // returns the element itself.
          ref={(ref) => {
            // P107-D35 (P109 ISL-031, ruled "at the end, both"): React gives a new <textarea> its text as default
            // content, cursor at 0, where an <input> gets its value through the setter, which leaves it at the end.
            // A field nobody has put a cursor in has it at the end. Once per element: this runs again on every render.
            if (ref && ref !== this.restedTextArea) {
              this.restedTextArea = ref;
              try {
                ref.setSelectionRange(ref.value.length, ref.value.length);
              } catch (e) {
                // no selection API
              }
            }
            this.ref.current = ref;
          }}
          {...inputProps}
          onKeyDown={(e) => this.onKeyDown(e)}
          noodl-style-tag="input"
        />
      );
    }

    const inputWrapperStyle = {
      display: 'flex',
      alignItems: 'center',
      ...props.styles.inputWrapper
    };

    const heightInPercent = height && height[String(height).length - 1] === '%';

    if (props.useLabel) {
      if (heightInPercent) {
        inputWrapperStyle.flexGrow = 1;
      } else {
        inputWrapperStyle.height = height;
      }
    } else {
      Object.assign(inputWrapperStyle, otherStyles);
      inputWrapperStyle.height = height;
    }

    if (props.type !== 'textArea') {
      inputWrapperStyle.alignItems = 'center';
    }

    const inputWithWrapper = (
      <div
        ref={props.useLabel ? undefined : noodlRootRef(this.props.noodlNode)}
        {...(props.useLabel ? undefined : dataAttributeProps(props.dom))}
        style={props.useLabel ? { ...clearedRootStyles(style), ...inputWrapperStyle } : inputWrapperStyle} noodl-style-tag="inputWrapper">
        {props.useIcon && props.iconPlacement === 'left' ? _renderIcon() : null}
        {inputContent}
        {props.useIcon && props.iconPlacement === 'right' ? _renderIcon() : null}
      </div>
    );

    if (props.useLabel) {
      otherStyles.display = 'flex';
      otherStyles.flexDirection = 'column';
      if (heightInPercent) otherStyles.height = height;

      const labelStyle: React.CSSProperties = {
        ...props.labeltextStyle,
        ...props.styles.label,
        marginBottom: props.labelSpacing
      };
      labelStyle.color = props.noodlNode.context.styles.resolveColor(labelStyle.color);

      return (
      // P107-C80 / C66 (P109 ISL-031, ruled "keeps the keyboard" and "Fix it with the label work"): ONE tree whether the label
      // shows or not, so React keeps the field (and the keyboard on it) when Enable Label changes, and one element carries
      // the root ref. Without a label the outer div makes no box (display: contents) and the wrapper is the root, as before.
        <div ref={noodlRootRef(this.props.noodlNode)} {...dataAttributeProps(props.dom)} style={otherStyles}>
          <label htmlFor={props.id} style={labelStyle} noodl-style-tag="label">
            {labelText(props.label)}
          </label>
          {inputWithWrapper}
        </div>
      );
    } else {
      return (
        <div style={{ ...clearedRootStyles(style), display: 'contents' }}>
          {null}
          {inputWithWrapper}
        </div>
      );
    }
  }

  onKeyDown(e) {
    if (e.key === 'Enter' || e.which === 13) {
      this.props.onEnter && this.props.onEnter();
    }
  }

  onChange(event) {
    const value = event.target.value;
    // GAM-009 🔒 R10 (a) — what a person typed is what the next mount starts from. Only typing
    // writes it from here, and it writes the raw text: `Set` and `Clear` already write the start
    // value through the node, and a converted value would bring a Number field's "1." back as "1".
    (this.props.noodlNode as unknown as TextInputNodeSeam | undefined)?._typed?.(value);
    this.setText(value);
    // a keystroke is committed before the event returns, and the browser's caret is where the person typed
    this.pendingCaret = null;
  }

  componentDidUpdate() {
    // drawn: the element's selection is current again (an edit's own cursor is set by its callback, after this)
    this.pendingCaret = null;
  }

  /**
   * GAM-011 (b) — the caret an on-screen key lands at: the selection if the field has ever held
   * one, otherwise the end. `selectionStart` is `null` (and can throw) on a Number or Email field,
   * and a field nobody has focused has no caret a person chose, so both append.
   */
  private caret(value: string): { start: number; end: number } {
    const el = this.ref.current;
    if (el && this.hadCaret) {
      try {
        if (el.selectionStart !== null && el.selectionEnd !== null) {
          if (this.pendingCaret !== null) {
            const at = Math.min(this.pendingCaret, value.length);
            return { start: at, end: at };
          }
          return { start: Math.min(el.selectionStart, value.length), end: Math.min(el.selectionEnd, value.length) };
        }
      } catch (e) {
        // A type with no selection API: append.
      }
    }
    return { start: value.length, end: value.length };
  }

  /** Whether the field has held focus since it mounted, so its selection is a caret someone placed. */
  private hadCaret = false;

  /**
   * GAM-011 (b) — write text the way a key press does, whether or not the field has focus: through
   * React state, never `el.value` (a controlled input reverts that), and as typing, so the next mount
   * starts from it (GAM-009 R10). Focus stays where it was; the caret ends up after what was written.
   *
   * @param replacement what to put at the caret (or over the selection)
   * @param mode `insert` writes `replacement`; `backspace` removes the selection, or the character before the caret
   * @returns whether the field's text changed
   */
  edit(mode: 'insert' | 'backspace', replacement = ''): boolean {
    const value = this.text ?? '';
    const { start, end } = this.caret(value);
    let from = start;
    let text = replacement;

    if (mode === 'backspace') {
      text = '';
      if (start === end) {
        if (start === 0) return false;
        // One character, not one UTF-16 unit: an emoji is two.
        const before = Array.from(value.slice(0, start));
        from = start - before[before.length - 1].length;
      }
    } else {
      // 🔒 R12 — Max length holds, as it does for a typed key: what does not fit is not written.
      const maxLength = Number(this.live('maxLength'));
      if (maxLength > 0) {
        const room = Math.max(0, maxLength - (value.length - (end - start)));
        text = Array.from(text).reduce((kept, ch) => (kept.length + ch.length <= room ? kept + ch : kept), '');
      }
      if (text.length === 0) return false;
    }

    const next = value.slice(0, from) + text + value.slice(end);
    if (next === value) return false;
    const caret = from + text.length;

    (this.props.noodlNode as unknown as TextInputNodeSeam | undefined)?._typed?.(next);
    this.setText(next, () => {
      const el = this.ref.current;
      // Only a field that holds focus shows a caret; setting a selection elsewhere can pull focus on some browsers.
      if (el && this.hasFocus()) {
        try {
          el.setSelectionRange(caret, caret);
        } catch (e) {
          // A type with no selection API keeps the browser's caret.
        }
      }
    });
    // P107-C69 — the next edit in this frame starts where this one left the cursor, as the callback will put it
    if (this.hasFocus()) this.pendingCaret = caret;
    return true;
  }

  focus() {
    this.ref.current && this.ref.current.focus();
  }

  blur() {
    this.ref.current && this.ref.current.blur();
  }

  hasFocus() {
    return document.activeElement === this.ref.current;
  }
}
