import React from 'react';

import Layout from '../../../layout';
import Utils from '../../../nodes/controls/utils';
import { Noodl, Slot } from '../../../types';
import { noodlRootRef } from '../../noodl-root-ref';
import { IconGlyph } from '../../visual/Icon/IconGlyph';

export interface ButtonProps extends Noodl.ReactProps {
  enabled: boolean;
  buttonType: 'button' | 'submit';

  textStyle: Noodl.TextStyle;

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

  onClick: () => void;
  /** GAM-027 (R26): leave the keyboard where it was when this button is clicked. Off by default. */
  keepsFocus: boolean;

  children: Slot;
}

export function Button(props: ButtonProps) {
  let style: React.CSSProperties = { ...props.style };
  Layout.size(style, props);
  Layout.align(style, props);

  if (props.textStyle !== undefined) {
    // Apply text style
    style = Object.assign({}, props.textStyle, style);
    style.color = props.noodlNode.context.styles.resolveColor(style.color);
  }

  function _renderIcon() {
    const iconStyle: React.CSSProperties = {};

    if (props.useLabel) {
      if (props.iconPlacement === 'left' || props.iconPlacement === undefined) {
        iconStyle.marginRight = props.iconSpacing;
      } else {
        iconStyle.marginLeft = props.iconSpacing;
      }
    }

    if (props.iconSourceType === 'image' && props.iconImageSource !== undefined) {
      iconStyle.width = props.iconSize;
      iconStyle.height = props.iconSize;
      return <img alt="" src={props.iconImageSource} style={iconStyle} />;
    } else if (props.iconSourceType === 'icon' && props.iconIconSource !== undefined) {
      iconStyle.fontSize = props.iconSize;

      /**
       * 🔴 **`undefined` here means "the label's colour", and that is load-bearing.**
       *
       * React omits a style property whose value is `undefined`, so when the author has set no
       * `Icon Color` this line emits nothing and the glyph inherits the `<button>`'s own resolved
       * text colour (`style.color`, above). That is what makes `button.ts` able to ship **no**
       * default for `iconColor` — which is where the actual fix lives; this line did not have to
       * change for it, and a guard here would be dead code.
       *
       * Ruled by Richard, 2026-09-04, asked what a Button's icon should default to: *"Same as
       * label colour I'd imagine."* No constant could be right for this node: the default
       * `primary` variant is a filled `--primary` ground wanting a light icon, while `outline`
       * and `ghost` are transparent with `--foreground` text and want a dark one.
       */
      iconStyle.color = props.iconColor;

      return <IconGlyph source={props.iconIconSource} style={iconStyle} />;
    }

    return null;
  }

  let className = 'ndl-controls-button';
  if (props.className) className = className + ' ' + props.className;

  let content = null;

  if (props.useLabel && props.useIcon) {
    content = (
      <>
        {props.iconPlacement === 'left' ? _renderIcon() : null}
        {String(props.label)}
        {props.iconPlacement === 'right' ? _renderIcon() : null}
      </>
    );
  } else if (props.useLabel) {
    content = String(props.label);
  } else if (props.useIcon) {
    content = _renderIcon();
  }

  /**
   * GAM-027 (R26, ruled off by default). Focusing the thing you pressed is the **default action**
   * of `mousedown`, so cancelling that event is the only way to leave the keyboard where it was —
   * and it is what a keypad key needs: the caret stays in the field, and the next digit typed on
   * the real keyboard lands where the person is looking.
   *
   * 🔴 **Composed, not appended.** FH-015 slice 1 (below) is the standing lesson: a handler written
   * after the `controlEvents` spread REPLACES the one the spread built, taking `blockTouch`'s
   * `stopPropagation` and the runtime's dirty-node flush with it. So this wraps the handler that
   * is already there rather than adding a second `onMouseDown` to the element.
   *
   * ⚠️ `mousedown` only. Cancelling `touchstart` would stop the browser synthesising the click
   * and take scrolling with it, and a tap on a touch screen does not focus a button anyway.
   *
   * ⚠️ With the port off, nothing is installed at all — the props are byte-for-byte what they
   * were, which is what "unset changes nothing" has to mean for a node in every existing app.
   */
  const events = Utils.controlEvents(props);
  if (props.keepsFocus) {
    const inner = events.onMouseDown;
    events.onMouseDown = (e: React.MouseEvent) => {
      e.preventDefault();
      inner && inner(e);
    };
  }

  // FH-015 slice 1. There used to be a trailing `onClick={props.onClick}` here, after the
  // `controlEvents` spread. JSX later-wins, so it replaced the handler `pointerProps` had
  // built — which is the one that carries the `blockTouch` `stopPropagation` wrapper and the
  // `updateDirtyNodes()` flush. The consequence: "Block Pointer Events" on a Button blocked
  // mousedown/mouseup/touchstart and let the click through to the parent Group anyway, which
  // is exactly the "it doesn't work" report. `controlEvents` already supplies `onClick`
  // (`pointerProps` picks `props.onClick` up off the props root), so the line was pure loss.
  return (
    <button
      ref={noodlRootRef(props.noodlNode)}
      className={className}
      disabled={!props.enabled}
      {...events}
      type={props.buttonType}
      style={style}
    >
      {content}
      {props.children}
    </button>
  );
}
