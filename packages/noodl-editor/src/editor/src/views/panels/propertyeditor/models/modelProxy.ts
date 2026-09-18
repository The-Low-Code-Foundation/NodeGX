import { isEqual } from 'underscore';

import type { LookFacts, NodeStyleFacts } from '@noodl-models/Looks/fieldState';
import { NodeGraphNode } from '@noodl-models/nodegraphmodel';
import { NodeLibrary } from '@noodl-models/nodelibrary';
import { partitionGatedPorts, reasonsForGatedPorts } from '@noodl-models/nodelibrary/portGateReason';

/**
 * The model proxy is used to simulate different models for different interaction states / default values etc
 */
export class ModelProxy {
  model: NodeGraphNode;
  editMode: string;
  visualState: TSFixme;

  get parameters() {
    return new Proxy(this.model.parameters, {
      get: (_target, prop) => {
        const source = this.editMode === 'variant' ? this.model.variant : this.model;

        if (this.visualState === undefined || this.visualState === 'neutral') return source.parameters[prop];
        else
          return source.stateParameters !== undefined && source.stateParameters[this.visualState] !== undefined
            ? source.stateParameters[this.visualState][prop]
            : undefined;
      }
    });
  }

  get type() {
    return this.model.type;
  }

  get variantName() {
    return this.model.variantName;
  }

  /**
   * SYL-003 — the node's own label, forwarded like `type` and `variantName` above.
   *
   * 🔴 Its absence was not visible from a property row. A `TypeView` is handed this proxy rather
   * than the `NodeGraphNode`, and `label` is a *getter* on the node, so `parent.model.label` read
   * `undefined` in silence — the avatar picker prefilled an empty box instead of the name on the
   * node, and looked exactly like a picker that had simply chosen not to prefill. Measured in a
   * running editor, not reasoned about.
   */
  get label() {
    return this.model.label;
  }

  /**
   * P94 STY-003 — what `readField` needs to answer *where did this value come from?*, or
   * `undefined` when the question does not apply.
   *
   * 🔴 **Two cases deliberately return `undefined` rather than a guess:**
   *
   * - **Editing the Look itself** (`editMode === 'variant'`). Every field on that surface *is* the
   *   Look's own, so there is no provenance to draw — and reading it through this proxy would be
   *   actively wrong: {@link parameters} traps only `get`, so `hasOwnProperty` would answer about
   *   the *node* while the value came from the *Look*, and `readField` decides on ownership.
   * - **A non-neutral visual state.** `hover` / `pressed` values live in `stateParameters`, which
   *   is a second axis this task does not draw (`STY-DESIGN-THE-LOOK-MODEL.md` §9 — states are the
   *   next thing and must not be smuggled in). Saying nothing is the honest answer; saying
   *   "linked" off the neutral parameters would be a treatment about the wrong value.
   *
   * ⚠️ Returns the node's **own** `parameters` bag, never the resolved one. `readField` asks who
   * owns the key, and the resolved read (`getParameter`) has already merged the Look in.
   */
  get lookProvenance(): { node: NodeStyleFacts; look: LookFacts | undefined } | undefined {
    if (this.editMode === 'variant') return undefined;
    if (this.visualState !== undefined && this.visualState !== 'neutral') return undefined;

    const variant = this.model.variant;
    const look =
      variant && variant.name !== undefined
        ? { name: variant.name as string, parameters: (variant.parameters ?? {}) as Record<string, unknown> }
        : undefined;

    return { node: { parameters: this.model.parameters ?? {} }, look };
  }

  constructor(args) {
    this.model = args.model;
    this.visualState = 'neutral';
  }
  setVisualState(state) {
    this.visualState = state;
  }
  setEditMode(mode) {
    this.editMode = mode;
  }
  getParameter(name) {
    const source = this.editMode === 'variant' ? this.model.variant : this.model;
    return source.getParameter(name, { state: this.visualState });
  }
  setParameter(name, value, args = {}) {
    const _oldPorts = this.getPorts();

    // @ts-expect-error
    args.state = this.visualState;

    const target = this.editMode === 'variant' ? this.model.variant : this.model;

    // Set the parameter for the specific interaction state
    target.setParameter(name, value, args);

    // Check if the ports have changed for this specific interaction state
    if (!isEqual(_oldPorts, this.getPorts())) this.model.notifyListeners('instancePortsChanged');
  }
  isPortConnected(name) {
    if ((this.editMode !== 'variant' && this.visualState === undefined) || this.visualState === 'neutral') {
      return this.model.isPortConnected(name);
    } else return false;
  }
  on(event, handler, group) {
    return this.model.on(event, handler, group);
  }
  off(group) {
    return this.model.off(group);
  }
  /**
   * FB-022 — completes the listener facade `on`/`off` already start.
   *
   * 🔴 **Found by driving, not by a spec.** Every row that reaches this proxy treats it as the
   * node: it subscribes through `on` here, and `NodeGraphNode.setParameter`'s own undo closures
   * fire `modelParameterUndo`/`modelParameterRedo` on the *node* to make the panel rebuild. A
   * caller holding the proxy had no way to do the same — `notifyListeners` simply was not here,
   * so an undo restored the value in the model and left the field on screen showing the old
   * one. That is exactly what FB-022's first drive saw: `width` reverted to 160 in the project
   * and the input still read 220.
   *
   * Forwarding to `this.model` is the whole fix, and it is correct rather than convenient:
   * `on` already registers against the node, so this reaches the same listeners the node's own
   * notifications do.
   */
  notifyListeners(event: string, ...args: unknown[]) {
    return this.model.notifyListeners(event, ...args);
  }

  getPorts(filter?: 'input' | TSFixme) {
    const source: NodeGraphNode = this.editMode === 'variant' ? this.model.variant : this.model;

    let ports = [].concat(source.getPorts(filter));

    // Apply ports condition filter
    //
    // FB-021 — the splice this used to be is what made Jordan ask "where is
    // width?" four times. A `conditionalports/basic` rule does not remove the
    // port (see `portConnectivity.ts`, and `portGateReason.ts`'s header for the
    // measurement): the port is live, a wire to it survives a reload and
    // delivers its value, and the layout then throws that value away. Removing
    // the row made a live-but-ignored port and an absent one look identical.
    //
    // So a port whose condition can be put into a sentence is **kept and
    // marked**; `Ports.renderParams` draws it as a disabled row carrying that
    // sentence. One that cannot be explained is spliced out exactly as before —
    // `portDecoration.ts`'s rule, that a dead control with no reason reads as
    // broken rather than as switched off, applies here unchanged.
    const portFilter = NodeLibrary.instance.applyPortConditionsFilterForNode(this);
    if (portFilter.length) {
      const reasons = reasonsForGatedPorts(source.type && source.type.dynamicports, portFilter, ports);
      ports = partitionGatedPorts(ports, portFilter, reasons);
    }

    // Apply filter for allowVisualStates
    if (this.visualState !== undefined && this.visualState !== 'neutral') {
      ports = ports.filter((p) => !!p.allowVisualStates);
    }

    return ports;
  }

  getVisualStates() {
    return this.model.type.visualStates;
  }
  getPossibleTransitionsForState(state) {
    const source = this.editMode === 'variant' ? this.model.variant : this.model;
    return source.getPossibleTransitionsForState(state);
  }
  getStateTransition(property) {
    const source = this.editMode === 'variant' ? this.model.variant : this.model;
    return source.getStateTransition(this.visualState, property);
  }
  setStateTransition(property, curve, args) {
    const target = this.editMode === 'variant' ? this.model.variant : this.model;
    target.setStateTransition(this.visualState, property, curve, args);
  }
  getDefaultStateTransition() {
    const source = this.editMode === 'variant' ? this.model.variant : this.model;
    return source.getDefaultStateTransition(this.visualState);
  }
  setDefaultStateTransition(curve, args) {
    const target = this.editMode === 'variant' ? this.model.variant : this.model;
    target.setDefaultStateTransition(this.visualState, curve, args);
  }
  hasDefaultStateTransition() {
    const source = this.editMode === 'variant' ? this.model.variant : this.model;
    return (
      source.defaultStateTransitions !== undefined && source.defaultStateTransitions[this.visualState] !== undefined
    );
  }
  hasStateTransition(parameterName) {
    const source = this.editMode === 'variant' ? this.model.variant : this.model;
    return (
      source.stateTransitions !== undefined &&
      source.stateTransitions[this.visualState] !== undefined &&
      source.stateTransitions[this.visualState][parameterName] !== undefined
    );
  }
}
