import React from 'react';

import { layerDefaults, withDefaultsClass } from '../../../default-style-layer';
import Layout from '../../../layout';
import PointerListeners from '../../../pointerlisteners';
import { Noodl } from '../../../types';
import { noodlRootRef } from '../../noodl-root-ref';

export interface TextProps extends Noodl.ReactProps {
  as?: keyof React.JSX.IntrinsicElements | React.ComponentType<unknown>;

  textStyle: Noodl.TextStyle;
  text: string;

  sizeMode?: Noodl.SizeMode;
  width?: string;
  height?: string;
  fixedWidth?: boolean;
  fixedHeight?: boolean;

  // Extra Attributes
  dom: Record<string, unknown>;
}

/**
 * What an empty `Text` value renders as — NDA-012 (Visual), check G1.
 *
 * This used to be a bare `String(props.text)`, which is the Empty-Value Contract's headline
 * defect in the one place an author cannot miss it: **the literal four characters `null`
 * painted on the page.** `String(null)` is `'null'` and `String(undefined)` is
 * `'undefined'`, and both are ordinary arrivals here — a record property that has not been
 * filled in, a Function node's early return, a Repeater item's missing field. The same
 * `String(value)` cast is recorded in `FINDINGS.md` class A2 against the String *variable*,
 * where the garbage at least stays inside the graph; here it is on screen.
 *
 * `null` clears, per the contract. Every other value keeps its old rendering, and that is
 * deliberate rather than incidental: `0` and `false` are legitimate things to put in a Text
 * node, and a truthiness test here would blank both.
 */
export function renderableText(value: unknown): string {
  return value === null || value === undefined ? '' : String(value);
}

/**
 * P18-S112-FLEXELLIPSIS — the line an Ellipsis Text draws its words in: a flex item that shrinks to the box and draws the
 * "…". It clips as the element does (`hidden` unless the author chose an Overflow), so an author's own Overflow stays theirs.
 */
const ELLIPSIS_LINE: React.CSSProperties = { minWidth: 0, textOverflow: 'ellipsis', whiteSpace: 'nowrap' };

export function Text(props: TextProps) {
  // React.ElementType collapses the intrinsic-elements union; with the ref prop added,
  // the raw union exceeds the compiler's representation limit (TS2590).
  const Component = (props.as || 'div') as React.ElementType;

  const style = {
    ...props.textStyle,
    ...props.style
  };

  Layout.size(style, props);
  Layout.align(style, props);

  style.color = props.noodlNode.context.styles.resolveColor(style.color);

  // DEF-031 — `text-overflow` does something only on a single line that is allowed to
  // overflow, and this function decides both of those rather than the author: the branch
  // below forces `white-space`, and the wrapping arm adds `overflow-wrap: anywhere` on top.
  // A `textOverflow` port on its own would therefore have reached the DOM and done nothing,
  // which is why the port and this branch had to land together.
  //
  // `'wrap'` is the port's default and is deliberately not a CSS value, so that the panel
  // and the node agree: the default wraps, and it must not reach the DOM as invalid CSS.
  const truncates = style.textOverflow === 'ellipsis' || style.textOverflow === 'clip';

  if (truncates) {
    style.whiteSpace = 'nowrap';
    // Only supply the clipping the author did not; an explicit `overflow` stays theirs.
    if (style.overflow === undefined) {
      style.overflow = 'hidden';
    }
  } else {
    if (style.textOverflow !== undefined) {
      delete style.textOverflow;
    }

    // Respect '\n' in the string
    if (props.sizeMode === 'contentSize' || props.sizeMode === 'contentWidth') {
      style.whiteSpace = 'pre';
    } else {
      style.whiteSpace = 'pre-wrap';
      style.overflowWrap = 'anywhere';
    }
  }

  if (style.opacity === 0) {
    style.pointerEvents = 'none';
  }

// P109 ISL-008 — defaults leave the inline style for the defaults sheet, so an author's class can override them.
const defaultsClass = layerDefaults(style);

  return (
    <Component
      ref={noodlRootRef(props.noodlNode)}
      className={withDefaultsClass(['ndl-visual-text', props.className].join(' '), defaultsClass)}
      {...props.dom}
      {...PointerListeners(props)}
      style={style}
    >
      {style.textOverflow === 'ellipsis' ? (
        // P18-S112-FLEXELLIPSIS — the Text is `display: flex` (its default CSS, which Text Vertical Align's `alignItems`
        // needs), so its words were an anonymous flex item and `text-overflow` on the element drew no "…": Ellipsis
        // looked the same as Clip. The words go in a block of their own that may shrink to the box and draws the "…";
        // the element keeps its flex, so both alignments still place them.
        <span style={{ ...ELLIPSIS_LINE, overflow: style.overflow }}>{renderableText(props.text)}</span>
      ) : (
        renderableText(props.text)
      )}
    </Component>
  );
}
