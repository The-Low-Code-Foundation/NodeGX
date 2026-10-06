import React, { useEffect, useRef, useState } from 'react';

import RadioButtonContext, { type RadioClick } from '../../../contexts/radiobuttoncontext';
import { layerDefaults, withDefaultsClass } from '../../../default-style-layer';
import Layout from '../../../layout';
import { Noodl, Slot } from '../../../types';
import { noodlRootRef, dataAttributeProps } from '../../noodl-root-ref';

export interface RadioButtonGroupProps extends Noodl.ReactProps {
  name: string;
  value: string;

  valueChanged?: (value: string) => void;
  /** P107-C76 — counts the node's writes of its Value; the buttons redraw the node's Value at each one */
  valueWrites?: number;

  children: Slot;
}

export function RadioButtonGroup(props: RadioButtonGroupProps) {
  // NDA-012 (Visual) A1. The selection and *how it was made* are one piece of state, not two:
  // stored apart they can be read in an order where the value is new and the provenance is
  // stale, and a Radio Button's `Changed` would then fire for a graph-driven selection.
  // P109 ISL-031 (P107-D37): the "how" is the click itself — which button, over which selection — numbered, so a button
  // reports a click once and a remounted one reports none.
  const [selection, setSelection] = useState<{ value: string; click: RadioClick | null }>({ value: props.value, click: null });
  const clicks = useRef(0);

  const context = {
    selected: selection.value,
    click: selection.click,
    name: props.name,
    checkedChanged: (value: string, by?: string) => {
      const seq = ++clicks.current;
      setSelection((was) => ({ value, click: { seq, by, from: was.value } }));
      props.valueChanged && props.valueChanged(value);
    }
  };

  // The graph's write path. `valueChanged` above also lands here a render later, because the
  // node mirrors the click back onto `props.value` — but by then the buttons' effects have
  // already run against `fromUser: true`, and `checked` does not change a second time, so
  // nothing re-fires.
  //
  // P107-C76 (P109 ISL-031, ruled "Show what Value says"): keyed on the node's write count too, so a Value written back to
  // what React last rendered (in the frame of a pick) is drawn — the buttons show what Value says.
  useEffect(() => {
    setSelection({ value: props.value, click: null });
  }, [props.value, props.valueWrites]);

  const style: React.CSSProperties = { ...props.style };
  Layout.size(style, props);
  Layout.align(style, props);

  let className = 'ndl-controls-radiobuttongroup';
  if (props.className) className = className + ' ' + props.className;

  // P109 ISL-008 — defaults leave the inline style for the defaults sheet, so an author's class can override them.
  const defaultsClass = layerDefaults(style);

  return (
    <RadioButtonContext.Provider value={context}>
      <div ref={noodlRootRef(props.noodlNode)} {...dataAttributeProps(props.dom)} className={withDefaultsClass(className, defaultsClass)} style={style}>
        {props.children}
      </div>
    </RadioButtonContext.Provider>
  );
}
