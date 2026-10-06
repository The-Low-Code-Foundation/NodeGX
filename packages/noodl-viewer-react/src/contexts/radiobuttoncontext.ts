import React from 'react';

/**
 * P109 ISL-031 (P107-D37, ruled "Fire from the click") — the person's click that made the group's selection: which button
 * (`by`, its element id), the selection it took over (`from`), and a number that is new for every click. Null once the graph's
 * Value has the last word.
 */
export interface RadioClick {
  seq: number;
  by: string | undefined;
  from: string;
}

export interface IRadioButtonContext {
  name: string;
  selected: string;
  /**
   * P107-D37 — the click that made the selection, or null (see RadioClick). It replaced a `selectionFromUser` flag (NDA-012
   * A1), which said the LAST selection was a person's and so let any later move of Checked fire a button's Changed.
   */
  click: RadioClick | null;
  /** a click hands the group its Value; `by` is the button's element id (the deprecated Radio Button passes none) */
  checkedChanged?: (value: string, by?: string) => void;
}

/**
 * `null` when there is no `Radio Button Group` above this button — see NDA-012 (Visual) F1.
 *
 * ⚠️ The default used to be an *object* with undefined fields, which is truthy, so a Radio
 * Button outside a group could not tell that it was outside one. Two consequences: the node had
 * nowhere to report the condition from (F1), and `selected === props.value` compared
 * `undefined === undefined` and rendered a groupless button with no `Value` as **checked** — a
 * control that looks selected, cannot be deselected, and reports nothing.
 */
const RadioButtonContext = React.createContext<IRadioButtonContext | null>(null);

export default RadioButtonContext;
