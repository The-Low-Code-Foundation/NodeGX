/**
 * CHR-008 §3.1 — the first row whose control is a React component instead of a React *root*.
 *
 * ## What changes, and why it is the cure §8.3 asked for
 *
 * Every other row is still built the old way: the row class creates a detached `div`, calls
 * `createRoot` on it, renders into it, and `ControlHost` appends the result. A row class's
 * `render()` mints a **new** element each call, so every panel re-render hands `ControlHost` a new
 * `el`, its `useLayoutEffect` tears the old one out, and anything focused inside it is destroyed —
 * which is exactly what §3.5 measured: one undo rebuilds every row and `activeElement` lands on
 * `BODY` with the caret gone.
 *
 * Rendered as a component under a stable `key`, React reconciles instead: same element type, same
 * key, so the textarea underneath is updated in place and keeps its focus and its caret. Nothing
 * here saves and restores `document.activeElement` — §8.3 rules that out explicitly, because it
 * would move the number without the structure.
 *
 * ## Why `TextAreaType` is the one that goes first
 *
 * Measured, not assumed (the census is in the task file §10). Four things still read a row's
 * `.el`: `TabGroup` appends it, `VariableInput` appends it, `PropListType` reads its children's,
 * and FB-021's `revealGateTarget` focuses the gating row's. A widget reachable by any of those
 * cannot become a component yet — and `appendChildEl` guards with `if (el)`, so converting one
 * would make those rows **silently vanish** rather than fail. `enum` and `boolean` are reachable
 * by all four; `textArea` is reachable by none.
 *
 * ## The split, and the hook that forces it
 *
 * The props this draws are built by `model/textAreaRow.ts`, which is import-free and graded in
 * `tests-unit`. This file cannot be: it imports the connection lookup (which reaches
 * `NodeGraphContext`) and the expression modal (which reaches `common/Icon`), and it calls hooks.
 * Same split as `PropertyRow`/`ControlHost` and `PropertyGroups`/`GroupHeading` — the decidable
 * half is graded, the wiring is driven.
 */
import React, { useEffect, useState } from 'react';

import { PropertyPanelInputType } from '@noodl-core-ui/components/property-panel/PropertyPanelInput';

import { expressionProps } from '../../DataTypes/expressionProps';
import { shouldCommitTextArea, textAreaRowProps } from '../../model/textAreaRow';
import { ROW_CHANGED } from '../../TypeView';
import { getConnectionSourceLabel, getConnectionSourceNavigate } from '../../utils';
import { PropertyPanelInputWithExpressionModal } from '../PropertyPanelInputWithExpressionModal';

export interface WidgetProps {
  /** The row's `TypeView` — still the model-side half: `fromPort`, grouping, filtering, dispose. */
  view: TSFixme;
}

/**
 * A multiline string property.
 *
 * 🔴 The subscription is what replaces `this.root.render(...)`. `TypeView.resetToDefault` and
 * `expressionProps` both call `renderReact()` on the view to redraw it in place; on a converted
 * view that method raises {@link ROW_CHANGED} instead, and this re-reads the model. Without it, a
 * style-metadata change or an `fx` toggle would write the parameter and leave the field showing
 * the value it replaced.
 */
export function TextAreaWidget({ view }: WidgetProps) {
  const [, bump] = useState(0);

  useEffect(() => {
    // A plain object as the listener group, the shape `ListenableView.off` filters on.
    const group = {};
    view.on(ROW_CHANGED, () => bump((n) => n + 1), group);
    return () => view.off(group);
  }, [view]);

  const model = view.parent.model;
  const parameter = model.getParameter(view.name);

  return (
    <PropertyPanelInputWithExpressionModal
      {...textAreaRowProps({
        name: view.name,
        displayName: view.displayName,
        isDefault: view.isDefault,
        isConnected: view.isConnected,
        parameter,
        connectionLabel: view.isConnected ? getConnectionSourceLabel(model, view.name) : undefined,
        onConnectionClick: view.isConnected ? getConnectionSourceNavigate(model, view.name) : undefined
      })}
      // The real enum member at runtime; the pure module states the literal it must equal.
      inputType={PropertyPanelInputType.TextArea}
      onReset={() => {
        model.setParameter(view.name, undefined, { undo: true, label: 'reset parameter' });
        view.isDefault = true;
        // ⚠️ Deferred, as the legacy row deferred it: this runs from inside a React event
        // handler, and the re-render it asks for must not re-enter one already in progress.
        setTimeout(() => view.renderReact(), 0);
      }}
      onChange={(value: unknown) => {
        if (!shouldCommitTextArea(value, model.getParameter(view.name))) return;
        view.parent.setParameter(view.name, value, { undo: true, label: `change ${view.displayName}` });
        view.isDefault = false;
        // No redraw: the textarea holds the text the author just typed, and re-seeding it from
        // the model here is how a commit becomes a cursor jump.
      }}
      {...expressionProps(view)}
    />
  );
}
