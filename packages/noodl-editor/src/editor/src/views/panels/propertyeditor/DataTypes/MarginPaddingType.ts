import React from 'react';
import { createRoot, Root } from 'react-dom/client';

import { UndoActionGroup, UndoQueue } from '@noodl-models/undo-queue-model';

// REL-014 — imported from the pure module rather than through the component, so
// nothing but the `createElement` call below depends on a file that cannot be
// loaded outside webpack.
import { MarginPaddingParam, MarginPaddingSide, isMarginPaddingToken, sideOf } from '../components/marginPaddingEdit';
import { MarginPaddingConnection, MarginPaddingInput } from '../components/MarginPaddingInput';
import { TypeView } from '../TypeView';
import { getConnectionSourceLabel, getConnectionSourceNavigate } from '../utils';
import { sameParameterValue } from './scrubCommit';
import { unmountReactRoot } from '../../../../../../shared/utils/unmountReactRoot';

export class MarginPaddingType extends TypeView {
  defaults: Record<string, MarginPaddingParam>;
  values: Record<string, MarginPaddingParam | undefined>;
  ports: TSFixme;
  el: TSFixme;
  private root: Root | null = null;

  /**
   * CHR-009 AC4 — per group, whether the row shows its four per-edge fields instead of the
   * `↕` / `↔` pair.
   *
   * ⚠️ **On the view, not in the React component**, for the reason POL-012's lock lived here:
   * `renderReact()` re-renders the root from outside React, including from a `setTimeout` in
   * the property editor. And **never on the model** — it is how this author is looking at the
   * box, not what the project is.
   */
  private expanded: Record<MarginPaddingSide, boolean> = { margin: false, padding: false };

  constructor() {
    super();
    this.defaults = {};
    this.values = {};
    this.ports = {};
  }

  static fromPort(args) {
    const p = args.port;
    const parent = args.parent;

    const toolTypeId = 'marginsandpadding-' + p.group;
    if (!parent._toolsType[toolTypeId]) {
      const view = (parent._toolsType[toolTypeId] = new MarginPaddingType());

      view.parent = parent;
      view.group = p.group;

      view.addComponentPort(p);

      return view;
    } else {
      parent._toolsType[toolTypeId].addComponentPort(p);
    }
  }

  render() {
    const div = document.createElement('div');
    div.style.width = '100%';

    if (!this.root) {
      this.root = createRoot(div);
    }

    this.renderReact();

    this.el = div;
    return this.el;
  }

  private refreshDefault(comp: string) {
    // Update the default value in case we are resetting
    const defaultValue = this.parent.model.getParameter(this.ports[comp].name);
    // 🔴 REL-014 — a token is a value, not a magnitude. Without this branch it fell
    // into the `else` and became `{ value: 'var(--space-2)', unit: 'px' }`, which
    // every reader of `defaults` then treated as a number: the sides that had no
    // explicit value of their own rendered the token string where a number goes.
    if (isMarginPaddingToken(defaultValue)) {
      this.defaults[comp] = defaultValue;
    } else if (typeof defaultValue === 'object' && defaultValue !== null) {
      this.defaults[comp] = defaultValue;
    } else {
      this.defaults[comp] = { value: defaultValue, unit: this.ports[comp].type.defaultUnit };
    }
  }

  private update(
    comp: string,
    value: MarginPaddingParam | undefined,
    opts?: { drag?: boolean; oldValue?: MarginPaddingParam }
  ) {
    this.values[comp] = value;

    const undoArgs = {
      undo: true,
      label: 'margin or padding changed',
      oldValue: opts ? opts.oldValue : undefined
    };
    this.parent.model.setParameter(this.ports[comp].name, value, opts && opts.drag ? undefined : undoArgs);

    this.refreshDefault(comp);
    this.renderReact();
  }

  /** The comps of one side that this node actually has ports for. */
  private compsOf(side: MarginPaddingSide): string[] {
    return Object.keys(this.ports).filter((comp) => sideOf(comp) === side);
  }

  /**
   * Write several sides — a `↕`/`↔` pair, or a whole group on reset — as **one** undo step.
   *
   * ⚠️ The group is `push`ed, not `pushAndDo`n, and it is built with a label
   * only. `setParameter` has already applied each change by the time we get
   * here, so `push` — which advances the pointer without executing — is the
   * form that leaves the group undoable. The constructor's `do`/`undo` form
   * leaves `ptr` at 0 and produces a group that cannot be undone at all; that
   * is documented on `UndoActionGroup` and is exactly the trap this shape
   * avoids.
   */
  private updateComps(
    comps: string[],
    value: MarginPaddingParam | undefined,
    opts?: { drag?: boolean; oldValues?: Record<string, MarginPaddingParam | undefined>; label?: string }
  ) {
    // A side this node has no port for (a node with padding and no margin) is skipped.
    const present = comps.filter((comp) => this.ports[comp]);
    if (present.length === 0) return;

    const label = (opts && opts.label) || `change ${sideOf(present[0])}`;

    if (opts && opts.oldValues) {
      this.commitDrag(present, value, opts.oldValues, label);
      return;
    }

    // A drag writes continuously and must not record anything; the commit that
    // follows it carries the whole gesture, with the values from before it
    // started. Same contract as `update`, wider.
    const group = opts && opts.drag ? undefined : new UndoActionGroup({ label });

    for (const comp of present) {
      this.values[comp] = value;
      const oldValue = opts && opts.oldValues ? opts.oldValues[comp] : undefined;
      this.parent.model.setParameter(
        this.ports[comp].name,
        value,
        group ? { undo: group, label, oldValue } : undefined
      );
      this.refreshDefault(comp);
    }

    if (group && !group.isEmpty()) UndoQueue.instance.push(group);
    this.renderReact();
  }

  /**
   * The end of a drag: one undo step for the whole gesture, back to the values from the press.
   *
   * 🔴 **Not `setParameter`'s `oldValue`.** It checks `if (args.oldValue)`, so a side that was
   * unset at the press (`undefined`) reads as "not supplied" and the entry records the DRAGGED
   * value — undo then does nothing. Measured on the paired row: `↔` margin dragged from unset to
   * 24, one undo, still 24. The old box never met this because its single-side drag started from
   * an object; a pair starts from whatever each side holds. Same construction as FB-022's
   * `commitScrub`, one group wide.
   */
  private commitDrag(
    comps: string[],
    value: MarginPaddingParam | undefined,
    before: Record<string, MarginPaddingParam | undefined>,
    label: string
  ) {
    const model = this.parent.model;
    const group = new UndoActionGroup({ label });
    for (const comp of comps) {
      const name = this.ports[comp].name;
      const start = before[comp];
      this.values[comp] = value;
      model.setParameter(name, value);
      this.refreshDefault(comp);
      if (sameParameterValue(start, value)) continue;
      group.push({
        do: () => {
          model.setParameter(name, value);
          model.notifyListeners('modelParameterRedo');
        },
        undo: () => {
          // `undefined` deletes the parameter: the side goes back to its default.
          model.setParameter(name, start);
          model.notifyListeners('modelParameterUndo');
        }
      });
    }
    if (!group.isEmpty()) UndoQueue.instance.push(group);
    this.renderReact();
  }

  /** comp → the wire driving that edge, for the edges that are wired (FB-018: each edge is one port). */
  private connections(): Record<string, MarginPaddingConnection> {
    const model = this.parent.model;
    const connections: Record<string, MarginPaddingConnection> = {};
    Object.keys(this.ports).forEach((comp) => {
      const name = this.ports[comp].name;
      if (!model.isPortConnected(name, 'target')) return;
      connections[comp] = {
        label: getConnectionSourceLabel(model, name),
        onClick: getConnectionSourceNavigate(model, name)
      };
    });
    return connections;
  }

  private renderReact() {
    if (!this.root) return;
    const connections = this.connections();

    this.root.render(
      React.createElement(MarginPaddingInput, {
        values: { ...this.values },
        defaults: { ...this.defaults },
        expanded: { ...this.expanded },
        connections,
        onToggleExpanded: (side) => {
          // Writes nothing: AC4's "the model holds four values" is about what was typed.
          this.expanded[side] = !this.expanded[side];
          this.renderReact();
        },
        onUpdate: (comp, value, opts) => this.update(comp, value, opts),
        onUpdateComps: (comps, value, opts) => this.updateComps(comps, value, opts),
        // A wired edge's typed value is not shown, so the reset does not reach it either.
        onResetSide: (side) =>
          this.updateComps(
            this.compsOf(side).filter((comp) => this.values[comp] !== undefined && !connections[comp]),
            undefined,
            { label: `reset ${side}` }
          )
      })
    );
  }

  dispose() {
    if (this.root) {
      unmountReactRoot(this.root);
      this.root = null;
    }
    super.dispose();
  }

  addComponentPort(p) {
    const comp = p.type.marginPaddingComp;

    this.ports[comp] = p;
    let value = this.parent.model.parameters[p.name];
    if (typeof value === 'number') value = { value: value, unit: p.type.defaultUnit };
    // REL-014 — a stored `var(--space-2)` falls through both branches and is kept
    // verbatim, which is what makes the token the widget now displays and re-seeds
    // its edit box with the same string the project holds.
    this.values[comp] = value;

    this.refreshDefault(comp);
  }
}
