import React from 'react';
import { createRoot, Root } from 'react-dom/client';

import { type PortGateReason } from '@noodl-models/nodelibrary/portGateReason';
import {
  capabilityProbes,
  gateForPort,
  gateSentence,
  resolveGateTarget,
  type GateTarget
} from '@noodl-utils/capability-gating';
import { revealGateTarget } from '@noodl-utils/portGate';
import { applyPortHint, hintPortsOf, portNamesForView, HINT_PORTS_ATTRIBUTE } from '@noodl-utils/portHint';
import { SCHEMA_OUTCOME_CHANGED } from '@noodl-utils/schemaCachePolicy';
import {
  addFieldTarget,
  schemaFieldNotice,
  schemaTableForNode,
  type SchemaFieldNotice,
  type SchemaFieldSubject
} from '@noodl-utils/schemaFieldNotice';
import SchemaHandler from '@noodl-utils/schemahandler';

import View from '../../../../../../shared/ListenableView';
import { EventDispatcher } from '../../../../../../shared/utils/EventDispatcher';
import PopupLayer from '../../../popuplayer';
import { CodeEditorType } from '../CodeEditor';
import { PropertyFilterInput } from '../components/PropertyFilterInput';
import { PropertyGroups, PropertyGroupModel } from '../components/PropertyGroups';
import { ControlHost, PropertyRow, type PropertyRowCapability } from '../components/PropertyRow';
import { SchemaAddFieldButton } from '../components/SchemaAddFieldButton';
import { SchemaFieldNoticeView } from '../components/SchemaFieldNoticeView';
import { WIDGET_COMPONENTS } from '../components/widgets';
import { ModelProxy } from '../models/modelProxy';
import { PagesType } from '../Pages';
import { countFilterableRows, filterGroups, isFilterActive, shouldOfferFilter } from '../propertyPanelFilter';
import { hintsForNode, HINTABLE_PORTS, HINT_INPUT_PARAMETERS } from '../propertyPanelHints';
import { ADVANCED_CSS_GROUP, countActivePorts, orderPropertyGroups } from '../propertyPanelTiers';
import { propertyPanelViewState } from '../propertyPanelViewState';
import { describeRows, type RowDescriptor, type RowPortLike } from '../model/describeRows';
import { groupGatesFor, type GroupGate } from '../model/groupGate';
import { widgetForPort, type WidgetId } from '../model/widgets';
import { AlignToolsType } from './AlignTools/AlignToolsType';
import { BasicType } from './BasicType';
import { BooleanType } from './BooleanType';
import { ByobFilterType } from './ByobFilterType';
import { ColorType } from './ColorPicker/ColorType';
import { ComponentType } from './ComponentType';
import { CurveType } from './CurveEditor/CurveType';
import { Dimension } from './Dimension';
import { EnumType } from './EnumType';
import { SourceCodeType } from './FilePicker/SourceCodeType';
import { FontType } from './FontType';
import { IconType } from './IconType';
import { IdentifierType } from './IdentifierType';
import { ImageType } from './ImageType';
import { ListValueType } from './ListValueType';
import { LogicBuilderHiddenType } from './LogicBuilderHiddenType';
import { LogicBuilderWorkspaceType } from './LogicBuilderWorkspaceType';
import { MarginPaddingType } from './MarginPaddingType';
import { NumberWithUnits } from './NumberWithUnits';
import { PopoutGroup } from './PopoutGroup';
import { PropListType } from './PropListType';
import { QuerySortingType } from './QuerySortingType';
import { ResizingType } from './ResizingType';
import { SizeModeType } from './SizeModeType';
import { StringListType } from './StringList/StringListType';
import { TabGroup } from './TabGroup';
import { TextAreaType } from './TextAreaType';
import { TextStyleType } from './TextStyleType';
import { VariableType } from './VariableType';
import {
  WorkflowBackoffType,
  WorkflowCasesType,
  WorkflowConditionType,
  WorkflowFunctionRefType,
  WorkflowParamsType,
  WorkflowTransformType,
  WorkflowTriggerInfoType,
  WorkflowValidateType,
  WorkflowValueType
} from './WorkflowTypes';

type Port = {
  popout?: TSFixme;
  group: string;
  name: string;
  displayName?: string;
  index?: number;
  plug?: string;
  type?: string;
};

/** How many frames to keep looking for the panel's scroller before giving up. */
const SCROLL_BIND_ATTEMPTS = 5;

/**
 * ERG-004 — the longest port description the row puts in a native tooltip.
 *
 * The same 400 `portDescription.ts` used, kept because the reason is unchanged: a native tooltip
 * cannot scroll, so a 900-character description arrives as a wall of text pinned to the pointer.
 */
const MAX_DESCRIPTION_TITLE = 400;

/** The node behind the panel's model: a `ModelProxy` wraps it, a bare model is its own node. */
function nodeOf(model: TSFixme): TSFixme {
  return model && model.model ? model.model : model;
}

/** The graph the panel's node lives in — where connection and attach events are raised. */
function graphOf(model: TSFixme): TSFixme {
  const node = nodeOf(model);
  return node && node.owner && typeof node.owner.on === 'function' ? node.owner : undefined;
}

export class Ports extends View {
  model: ModelProxy;
  popout: TSFixme;
  _selectedTabForGroup: TSFixme;
  activePopout: TSFixme;
  _portsHash: TSFixme;
  views: TSFixme = [];
  _toolsType: TSFixme;
  /** FB-017 AC7: the raw text in the filter box. Empty means the tier view. */
  _filterQuery = '';
  /**
   * Expansion overrides that live only as long as the current filter.
   *
   * 🔴 Non-null exactly while a filter is active, and that is what makes AC7's "clearing the
   * filter restores the tier view" true rather than approximately true. A hit inside `Advanced
   * CSS` has to open it, but opening it by calling `propertyPanelViewState.setExpanded` would
   * write a searching keystroke into the builder's persisted preferences — so the next node they
   * select, and every session after it, would open with Advanced CSS expanded because they once
   * looked for `transform origin`. The tier split would erode itself one search at a time.
   *
   * Absent an entry a group reads as expanded, since a query's hits must be visible. Present
   * entries are the ones the builder collapsed *during* the search, which is them saying "not
   * that one" and is worth honouring until the box is cleared.
   */
  _filterExpansion: Record<string, boolean> | null = null;
  /** The element {@link bindScrollTracking} last attached to, so the listener can be moved. */
  _scrollTrackedEl: HTMLElement | undefined;
  _onScroll: (() => void) | undefined;
  groups: TSFixme[];
  el: HTMLElement;
  private root: Root | null = null;
  private _unsubscribeProbes: (() => void) | null = null;

  constructor(args) {
    super();
    this.model = args.model;
    this.popout = args.popout;
    this._selectedTabForGroup = {};

    this.bindModel(this.model);

    // BCN-010: a probe settles asynchronously, so the panel has to be told.
    this._unsubscribeProbes = capabilityProbes().onChange(() => this.renderGroups());

    // DEF-036 AC3 — and so does a schema read. `SchemaHandler` raises this only when the answer
    // actually changed, so this is not a per-focus-event re-render. `EventDispatcher.instance.off(this)`
    // in `dispose` already unsubscribes it.
    EventDispatcher.instance.on(
      SCHEMA_OUTCOME_CHANGED,
      () => {
        this._portsHash = undefined;
        this.renderGroups();
      },
      this
    );
  }
  showPopout(popout) {
    if (this.activePopout) {
      this.hidePopout();
    }

    const _onClose = popout.onClose;
    popout.onClose = () => {
      this.activePopout = null;
      _onClose && _onClose();
    };

    this.activePopout = PopupLayer.instance.showPopout(popout);
  }
  hidePopout() {
    PopupLayer.instance.hidePopout(this.activePopout);
  }
  bindModel(model) {
    model.on(
      [
        'instancePortsChanged',
        'portAdded',
        'portRemoved',
        'portRenamed',
        'connectionRemoved',
        'variantChanged',
        'variantUpdated'
      ],
      () => {
        this.renderGroups();
      },
      this
    );

    // FB-017 AC4. Narrow on purpose: `parametersChanged` fires on every committed edit on the
    // panel, and only these few can change a hint's answer. Everything else is ignored rather
    // than re-derived.
    model.on(
      'parametersChanged',
      (args) => {
        if (args && HINT_INPUT_PARAMETERS.has(args.name)) this.refreshHints();
      },
      this
    );

    // 🔴 CHR-009 slice 3: THE GRAPH, NOT `model.owner`. `model` is a `ModelProxy` everywhere the
    // property panel builds this view, and the proxy has no `owner` — so both `model.owner && …`
    // subscriptions below had never bound anything, since the initial commit. Measured on the dev
    // build: `ModelProxy` has no `owner` field, and a wire into the selected Group's `width` did
    // not reach its row until another node was selected. `graphOf` reads through the proxy and still
    // accepts a model that is its own node (the project settings tab).
    const graph = graphOf(model);

    // A child dragged into or out of the selected node changes whether anything can overflow it.
    graph &&
      graph.on(
        ['nodeAttached', 'nodeDetached'],
        () => {
          this.refreshHints();
        },
        this
      );

    model.on(
      ['modelParameterUndo', 'modelParameterRedo'],
      () => {
        this._portsHash = undefined;
        this.renderGroups();
      },
      this
    );

    graph &&
      graph.on(
        ['connectionAdded', 'connectionRemoved'],
        (args) => {
          // 🔴 CHR-009 slice 3: a wire into THIS node changes what a row draws (FB-018's chip, the
          // gutter's connected dot) but not the ports, the variant or the filter — so the hash
          // below was unchanged and `renderGroups` returned early. Measured on the dev build: a
          // wire into `width` with the Group's panel open drew nothing until another node was
          // selected and this one reselected. Only a wire that touches this node clears the hash;
          // the graph raises these for every wire in the component, and a rebuild costs the caret.
          const connection = args && args.model;
          const nodeId = nodeOf(this.model)?.id;
          if (!connection || connection.toId === nodeId || connection.fromId === nodeId) {
            this._portsHash = undefined;
          }
          this.renderGroups();
        },
        this
      );
  }
  dispose() {
    this._unsubscribeProbes && this._unsubscribeProbes();
    this._unsubscribeProbes = null;
    this.model && this.model.off(this);
    const graph = this.model && graphOf(this.model);
    graph && graph.off(this);
    EventDispatcher.instance.off(this);

    this.views.forEach((v) => v.dispose && v.dispose());

    // CHR-008 §3.4: the Properties panel is no longer remounted per selection, so the next node's view
    // scrolls the SAME `ScrollArea`. A listener left here would record that node's offsets under this
    // node's id.
    if (this._scrollTrackedEl && this._onScroll) {
      this._scrollTrackedEl.removeEventListener('scroll', this._onScroll);
    }
    this._scrollTrackedEl = undefined;
    this._onScroll = undefined;

    if (this.root) {
      this.root.unmount();
      this.root = null;
    }

    this.hidePopout();
  }
  /**
   * Everything the gates would render, as a string, for the re-render hash.
   *
   * Computed rather than snapshotted from the cache so it also moves when the
   * *project's* backend changes, which is the switch the live pass drives.
   */
  private capabilitySignature(): string {
    const typeName = this.model.type && (this.model.type.name || this.model.type.localName);
    if (!typeName) return '';
    const target = this.capabilityTarget();
    const parts = [target.backendId || '', target.type || ''];
    for (const port of this._getPorts()) {
      const gate = gateForPort(typeName, port.name, target);
      if (gate) parts.push(`${port.name}:${gate.effective}:${gate.reason || ''}`);
    }
    return parts.join('|');
  }

  /**
   * The backend this node's ports are gated against — BCN-010.
   *
   * Resolved once per render rather than per row: every port on one node
   * resolves to the same backend, and `resolveGateTarget` reads project
   * metadata. The node's own `backendId` parameter wins when it has one (the
   * six Record and two relation nodes, since BCN-004 step 5); everything else
   * gets the project's active backend, which is what it resolves to at runtime.
   */
  private capabilityTarget(): GateTarget {
    try {
      const backendId = this.model.getParameter ? (this.model.getParameter('backendId') as string) : undefined;
      return resolveGateTarget(backendId);
    } catch (e) {
      // A panel that cannot resolve a backend must still render its ports.
      return {};
    }
  }

  /**
   * FB-017 AC4 — the structural hints that apply to the selected node, keyed by port name.
   *
   * 🔴 `hasPort` deliberately asks the **node** and not `_getPorts()`. `_getPorts()` is already
   * filtered — by `applyPortConditionsFilterForNode` in `ModelProxy.getPorts`, by the popout
   * split, and by `allowVisualStates` when a state is selected. A port missing from that list has
   * been *hidden*; a port missing from the node has never existed. The hint's two sentences turn
   * on exactly that difference, so reading the filtered list would tell a `Group` author their
   * node has no Clip Content the moment a condition folded the row away.
   *
   * Children come from `this.model.model` rather than the proxy: a variant has no children of its
   * own, and it is the instance on the canvas whose corners the author is looking at.
   */
  private structuralHints(): Map<string, string> {
    const node = this.model && this.model.model;
    if (!node) return new Map();

    try {
      return hintsForNode({
        getParameter: (name) => this.model.getParameter(name),
        hasPort: (name) => node.getPort(name, 'input') !== undefined,
        childCount: node.children ? node.children.length : 0
      });
    } catch (e) {
      // A panel that cannot work out a hint must still render its ports — the same rule
      // `capabilityTarget` follows one method up.
      return new Map();
    }
  }

  /**
   * DEF-036 — everything the two schema surfaces on this panel are decided from, read once.
   *
   * 🔴 One subject for the warning and the button, because AC2 is a claim about the *pair*: the
   * button must not exist in the state the warning explains. Reading the outcome twice would
   * make that a coincidence rather than a fact — `schemaFieldNotice` and `addFieldTarget` both
   * refuse the same subject, and `tests-unit/def-036` asserts they do.
   *
   * 🔴 Reads `SchemaHandler.lastOutcome` and derives nothing. A second computation of "is there
   * a backend" in this panel is the shape that gave us two palettes and two answers; the handler
   * already asked, and its answer is the one the ports were minted from.
   *
   * The count is taken from the **node**, across both plugs, not from `_getPorts()`. Two reasons
   * and both bite: `_getPorts()` is the input-side, property-row-bearing subset, and half this
   * family — `Record` and `User` — publishes its `prop-*` ports as **outputs**, so counting the
   * panel's own list would read zero for a node whose schema is perfectly healthy and put a
   * warning on it.
   */
  private schemaFieldSubject(): (SchemaFieldSubject & { selectedTable?: string }) | undefined {
    const node = this.model && this.model.model;
    if (!node) return undefined;

    try {
      const typename = this.model.type && (this.model.type.name || this.model.type.localName);
      const ports = node.getPorts ? node.getPorts() : [];
      const getParameter = (name: string) => (this.model.getParameter ? this.model.getParameter(name) : undefined);

      return {
        typename,
        outcome: SchemaHandler.instance ? SchemaHandler.instance.lastOutcome : undefined,
        fieldPortCount: ports.filter((port) => port.name && port.name.startsWith('prop-')).length,
        // BCN-004 step 5: a Record node aimed at its own backend is not described by the
        // built-in backend's outcome at all. Passed raw — `namesOwnBackend` owns the judgement,
        // and `_active_` is a value that looks like a backend and is not one.
        backendIdParameter: getParameter('backendId'),
        selectedTable: schemaTableForNode(typename, getParameter)
      };
    } catch (e) {
      // A panel that cannot work out a notice must still render its ports — the same rule
      // `capabilityTarget` and `structuralHints` both follow above.
      return undefined;
    }
  }

  /** DEF-036 AC1 — the warning, or nothing. */
  private schemaNotice(): SchemaFieldNotice | undefined {
    const subject = this.schemaFieldSubject();
    return subject ? schemaFieldNotice(subject) : undefined;
  }

  /** DEF-036 AC4 — where an `Add a field` button would land, or nowhere. */
  private schemaAddField(): { backend: { id: string; name: string }; table: string } | undefined {
    const subject = this.schemaFieldSubject();
    return subject ? addFieldTarget(subject) : undefined;
  }

  /**
   * Bring the notes already on screen into line with the node's current state.
   *
   * 🔴 In place, and not through `renderGroups`. Two reasons, and both are load-bearing:
   *
   * 1. `renderGroups` would return early anyway. Its hash is built from the *port list*, and
   *    `clip` gates no ports, so flipping it changes nothing the hash can see.
   * 2. Rebuilding the rows under a focused `borderRadius` field takes the focus with it — and
   *    typing a radius is precisely when this hint needs to appear.
   *
   * Finds its targets by the attribute `applyPortHint` left behind, so nothing here needs to know
   * which row class or tab group ended up holding the port.
   */
  private refreshHints(): void {
    if (!this.el) return;

    const hints = this.structuralHints();
    const hosts = this.el.querySelectorAll(`[${HINT_PORTS_ATTRIBUTE}]`);

    hosts.forEach((host: HTMLElement) => {
      applyPortHint(host, hintPortsOf(host.getAttribute(HINT_PORTS_ATTRIBUTE)), hints, HINTABLE_PORTS);
    });
  }

  /**
   * FB-021 AC3 — travel to the control that switched a port off.
   *
   * 🔴 Through `this.views`, and deliberately **not** through the `data-identifier` selector
   * `_tryPropertyPanelInputInteraction` uses. That attribute is set by `PropertyPanelBaseInput`,
   * and the gating control in the motivating case — `Size Mode` — is a `SizeModeType` rendering
   * a bespoke `SizeModeInput` that sets no such attribute. A selector-based jump would have
   * compiled, specced green against a `BasicType` fixture, and done nothing on the one node the
   * task was filed about. Every `TypeView`, bespoke or not, assigns a real element to `el`.
   *
   * The gate may be inside a folded group — `Size Mode` is not, but `Border Style` gating nine
   * of `range`'s ports is — so the group is opened first. That re-renders, which rebuilds every
   * view, so the element has to be found *again* afterwards rather than captured before.
   */
  focusGatePort(gatePortName: string): void {
    const viewFor = () => this.views.find((v) => portNamesForView(v).indexOf(gatePortName) !== -1);

    const view = viewFor();
    if (!view) return;

    const groupName = view.group || 'Other';
    if (!this.isGroupExpanded(groupName)) {
      if (this._filterExpansion) this._filterExpansion[groupName] = true;
      else propertyPanelViewState.setExpanded(groupName, true);
      // The port list has not changed, so the hash guard would refuse the re-render that draws
      // the open group — the same clearing `onToggleGroup` does.
      this._portsHash = undefined;
      this.renderGroups();
    }

    // React commits asynchronously, so a row that has just been re-rendered is not in the DOM
    // yet. Same reason `settleScroll` and `_tryPropertyPanelInputInteraction` both defer.
    setTimeout(() => {
      revealGateTarget((viewFor() || ({} as TSFixme)).el as TSFixme);
    }, 1);
  }

  /**
   * CHR-007: the panel's rows as data — what `renderParams` draws, answerable without a DOM.
   *
   * Every probe is the one `renderParams` used to call inline, so the descriptor is not a second
   * opinion: `gateForPort` against the backend resolved once, and `isPortConnected` through the same
   * `ModelProxy` the rows get. The switched-off reason is read off the port, where
   * `ModelProxy.getPorts` put it.
   */
  rowDescriptors(target: GateTarget = this.capabilityTarget()): RowDescriptor[] {
    const typeName = this.model.type && (this.model.type.name || this.model.type.localName);

    return describeRows({
      ports: this._getPorts() as readonly RowPortLike[],
      capabilityGate: (portName) => (typeName ? gateForPort(typeName, portName, target) : undefined),
      isConnected: (portName) => Boolean(this.model.isPortConnected(portName))
    });
  }

  /**
   * A group's rows, as React nodes — CHR-008 §3.2.
   *
   * This used to decorate each row by mutating the element a row class had just built: ERG-004's
   * description, BCN-010's capability gate and FB-021's switched-off gate, applied in turn by
   * `describePortElement` / `decoratePortElement` / `applyPortGate`. All three are facts about the
   * port, known before anything is drawn, so they are **props on `PropertyRow`** now and the rows
   * are siblings in one tree rather than elements appended into a host.
   *
   * ⚠️ The structural hint is deliberately still a post-render pass — see `renderGroups`'s tail and
   * `PropertyRow`'s note. `PropertyRow` only *marks* the row with `data-hint-ports`, exactly as
   * `applyPortHint` did, so `refreshHints` can keep bringing notes into line **in place**: a hint
   * must not rebuild a row under a focused field, which §8 measured costs the caret.
   *
   * CHR-008 (R8): a row a group line already speaks for (`groupGates`) is drawn quiet — dimmed, no sentence.
   */
  renderParams(views, groupGates?: Map<string, GroupGate>): React.ReactNode[] {
    const nodes: React.ReactNode[] = [];
    const target = this.capabilityTarget();

    // CHR-007: every decoration below is read off the row's descriptor. Looked up by the view's
    // `name`, which only a port row carries — `TabGroup` and `PopoutGroup` set `group` and never
    // `name` — so a descriptor exists for exactly the views the old per-view lookups reached.
    const rows = new Map<string, RowDescriptor>();
    for (const row of this.rowDescriptors(target)) rows.set(row.name, row);

    for (const j in views) {
      const v = views[j];
      v.childViews && v.childViews.forEach((v) => v.render()); // Render any child views first

      const row = v.name ? rows.get(v.name) : undefined;

      // CHR-008 §3.1 — a widget that has become a React component is rendered as one, under a key
      // stable across re-renders, so React reconciles the control instead of replacing it. That is
      // what keeps a focused field's caret through a rebuild (§8.3). A widget still on the old path
      // falls through to `ControlHost` and behaves exactly as before.
      const Widget = row ? WIDGET_COMPONENTS[row.widget] : undefined;

      // 🔴 Once per view, and the result is held by `ControlHost` for as long as the view lives: a
      // row class's `render()` mints a NEW element each call (`BasicType` builds a fresh div while
      // its React root stays bound to the old one), so a second call hands back an empty row.
      // ⚠️ NOT called on the component path: a converted row has no root to build, and calling it
      // would build one nothing would ever render into.
      const control = Widget
        ? React.createElement(Widget, { view: v })
        : React.createElement(ControlHost, { el: v.render() });

      // FB-021 — a port a `dynamicports` condition has switched off. `applyPortConditionsFilterForNode`
      // remains the only thing that decides; the descriptor carries what it decided.
      const switchedOff: PortGateReason | undefined = row && row.switchedOff;
      // CHR-008 (R8): the group's one line already says why — the row is dimmed and says nothing itself.
      const groupGate = row && groupGates ? groupGates.get(row.group) : undefined;
      const quiet = Boolean(groupGate && row && groupGate.portNames.indexOf(row.name) !== -1);

      nodes.push(
        React.createElement(
          PropertyRow,
          {
            key: v.name || `${v.group || 'group'}#${j}`,
            description: this.rowDescription(row),
            capability: this.rowCapability(row, target),
            gate: switchedOff
              ? {
                  reason: switchedOff,
                  isConnected: Boolean(row && row.connected),
                  onFocusGate: quiet ? undefined : () => this.focusGatePort(switchedOff.gatePortName),
                  quiet
                }
              : undefined,
            // FB-017 AC4 — keyed by `portNamesForView`, because the corner-radius ports arrive
            // folded into a nameless `TabGroup` and would otherwise be reachable from nowhere.
            hintPorts: portNamesForView(v).filter((name) => HINTABLE_PORTS.has(name)),
            // As a prop rather than `createElement`'s third argument: `PropertyRowProps` declares
            // `children`, and the variadic overload does not satisfy a props type that requires it.
            children: control
          }
        )
      );
    }
    return nodes;
  }

  /**
   * ERG-004 — the port's own description, as the row's native tooltip.
   *
   * Capped rather than passed whole: a native tooltip has no scrollbar, and a wall of text on hover
   * is a worse answer than a trimmed one. `describeRows` has already trimmed and dropped the empty
   * and non-string cases, which is why there is no type check left here.
   */
  private rowDescription(row: RowDescriptor | undefined): string | undefined {
    const text = row && row.description;
    if (!text) return undefined;
    return text.length > MAX_DESCRIPTION_TITLE ? `${text.slice(0, MAX_DESCRIPTION_TITLE - 1)}…` : text;
  }

  /**
   * BCN-010 — what this row says about the backend, or nothing.
   *
   * 🔴 **Refuses to gate a port it cannot explain**, and says so loudly. A disabled control with no
   * reason converts "this backend cannot do that" into "this is broken", which is the bug BCN-010
   * was filed for; the contract's own tests make the state impossible, so reaching this branch is a
   * hole in a capability descriptor rather than a UI fault.
   */
  private rowCapability(row: RowDescriptor | undefined, target: GateTarget): PropertyRowCapability | undefined {
    const gate = row && row.capabilityGate;
    if (!gate || gate.effective === 'supported') return undefined;

    const sentence = gateSentence(gate as TSFixme, target);
    if (!sentence) {
      // eslint-disable-next-line no-console
      console.error(
        `[capability-gating] port "${row.name}" resolved to ${gate.effective} with no reason string; ` +
          'leaving it enabled. This is a hole in the capability descriptor, not a UI bug.'
      );
      return undefined;
    }

    return { portName: row.name, state: gate.effective, isUsable: gate.isUsable, sentence };
  }
  /**
   * Bind scroll tracking and restore the offset, once the panel is actually in the DOM.
   *
   * 🔴 This runs on a short retry rather than a single `setTimeout(0)`, and that is the whole
   * reason scroll memory works at all. `index.tsx` builds the view with
   * `new PropertyEditorView(props); instance.render()` and only *then* calls `setInstance`,
   * which is the state update that mounts the `Frame` and the `ScrollArea` around it. So the
   * first `renderGroups` for a newly selected node runs while `this.el` has no parent at all —
   * `scrollContainer()` finds nothing, and a listener bound there would be bound to nothing.
   *
   * The previous attempt bound only inside `if (scrollTop)`, which is never true on a first
   * render, so the listener was never attached and nothing was ever recorded to restore. ⚠️ That
   * failed *silently and identically* to the pre-existing defect it was meant to fix: a panel
   * that opens at the top looks the same whether the offset was restored as `0` or never stored.
   *
   * Bounded at {@link SCROLL_BIND_ATTEMPTS}, because a panel that has not mounted after a few
   * frames is one that is not going to.
   */
  settleScroll(scrollTop: number, attempt = 0): void {
    setTimeout(
      () => {
        this.bindScrollTracking();

        const target = this.scrollContainer();
        if (target) {
          if (scrollTop) target.scrollTop = scrollTop;
        } else if (attempt < SCROLL_BIND_ATTEMPTS) {
          this.settleScroll(scrollTop, attempt + 1);
        }
      },
      attempt === 0 ? 0 : 50
    );
  }

  /**
   * FB-017 AC4's notes, applied once the rows they attach to are in the DOM — CHR-008 §3.2.
   *
   * 🔴 **A bare `setTimeout(0)` here drew nothing on a fresh selection, and only there.** Measured
   * (`verdicts/CHR-008/2026-09-16/`): typing a radius drew the note; selecting away and back with the
   * radius still set drew none, and a frame-by-frame trace of the reselect showed the marked rows
   * arriving at **t = 60 ms** — long after a `setTimeout(0)` had already run and queried
   * `[data-hint-ports]` against a panel with no rows in it yet. The live path worked precisely because
   * its rows were committed by an earlier render. Half a feature, and invisible to every spec.
   *
   * So this retries on the same bounded pattern — and for the same reason — as {@link settleScroll}
   * directly below: React commits asynchronously, and the first render of a newly selected node runs
   * before the panel is mounted at all.
   *
   * ⚠️ `applyPortHint` stays the ONE thing that draws a note, in both paths. Drawing it from
   * `PropertyRow` instead would put React and `refreshHints` in charge of the same DOM node — and
   * `applyPortHint` removes any note it finds before adding one, which is not a thing to do to a child
   * React owns. The row is marked declaratively; the note is written in place, which is what lets a
   * hint change while a field is focused without rebuilding the row (§8: a rebuild costs the caret).
   */
  settleHints(attempt = 0): void {
    setTimeout(
      () => {
        if (!this.el) return;

        // Nothing marked yet means React has not committed these rows — not that there is nothing to
        // say. A node with no hintable ports falls through the attempts and applies harmlessly.
        if (this.el.querySelectorAll(`[${HINT_PORTS_ATTRIBUTE}]`).length === 0 && attempt < SCROLL_BIND_ATTEMPTS) {
          this.settleHints(attempt + 1);
          return;
        }

        this.refreshHints();
      },
      attempt === 0 ? 0 : 50
    );
  }

  /**
   * CHR-008 §3.4 — put the panel where this node was left, now, in the caller's task.
   *
   * For the moment a kept-mounted panel swaps one node's view for the next: called in the same task
   * as the swap, the first frame that shows this node's rows shows them at its offset. `settleScroll`
   * stays for every other render; this only removes the frames it used to leave at the old offset.
   */
  restoreScroll(): void {
    this.bindScrollTracking();
    const target = this.scrollContainer();
    if (!target || isFilterActive(this._filterQuery)) return;
    target.scrollTop = propertyPanelViewState.getScroll(this.nodeId());
  }

  /**
   * The element that actually scrolls this panel.
   *
   * 🔴 FB-017 found the existing scroll-restore reading the wrong element, and it had been wrong
   * for as long as the panel has been inside a `ScrollArea`. The code below used to say
   * `this.el.parentElement.parentElement`, which lands on `.sidebar-property-editor` — that
   * carries `overflow-y: auto` but its content never overflows it, so its `scrollHeight` equals
   * its `clientHeight` and its `scrollTop` is permanently `0`. The real scroller is
   * `ScrollArea`'s root, six levels up, mounted by `index.tsx` around the legacy `Frame`.
   *
   * So "remember the scrolling so a re-render doesn't reset the scroll position" has been reading
   * `0`, storing `0`, and restoring nothing — which is exactly the symptom Jordan reported as the
   * single costliest thing about the panel. ⚠️ A fixed hop count is what made it silent: two
   * `parentElement`s cannot fail, they just arrive somewhere else after someone wraps the panel.
   * This walks for the property instead of counting levels.
   */
  scrollContainer(): HTMLElement | undefined {
    let el = this.el ? this.el.parentElement : null;

    while (el) {
      const overflowY = getComputedStyle(el).overflowY;
      if ((overflowY === 'auto' || overflowY === 'scroll') && el.scrollHeight > el.clientHeight + 1) {
        return el;
      }
      el = el.parentElement;
    }

    return undefined;
  }

  /**
   * Start recording this panel's scroll offset, once there is something to record it on.
   *
   * Bound lazily from `renderGroups` rather than in `render`, because the scroller is not this
   * view's element and does not exist — or does not yet overflow — when `el` is created. Bound
   * against the specific element it was found on, so a `ScrollArea` replaced underneath the panel
   * moves the listener rather than leaving it on a detached node.
   */
  bindScrollTracking(): void {
    const scroller = this.scrollContainer();
    if (!scroller || scroller === this._scrollTrackedEl) return;

    if (this._scrollTrackedEl && this._onScroll) {
      this._scrollTrackedEl.removeEventListener('scroll', this._onScroll);
    }

    this._onScroll = () => {
      // ⚠️ A filtered panel is a different document: its offsets are measured against a handful
      // of surviving rows and mean nothing once the box is cleared. Recording one would replace
      // the offset the builder actually left the node at — so the search reads the scroll memory
      // and never writes to it.
      if (this._filterExpansion) return;
      propertyPanelViewState.setScroll(this.nodeId(), scroller.scrollTop);
    };
    this._scrollTrackedEl = scroller;
    scroller.addEventListener('scroll', this._onScroll);
  }

  /**
   * The selected node's id — the key FB-017 remembers a scroll offset under.
   *
   * `this.model` is a `ModelProxy`; the id lives on the `NodeGraphNode` it wraps. Optional all
   * the way down because the ports view is also built for things that are not graph nodes (the
   * component-inputs editors), and a missing id must mean "remember nothing" rather than throw.
   */
  nodeId(): string | undefined {
    return this.model && this.model.model ? this.model.model.id : undefined;
  }

  /**
   * How many of a group's ports are connected or set — FB-017 AC2's badge.
   *
   * Counted from the *views*, because that is the set of ports the group actually drew: a port
   * filtered out by `_getPorts` (a capability gate, an `allowConnectionsOnly` object type) has
   * no row to be hidden, so counting it would report activity the builder cannot go and find.
   *
   * ⚠️ `TabGroup` views stand in for several ports at once and carry no `name`, so they
   * contribute nothing here rather than a wrong number. A tab group inside a collapsed section
   * is the one case the badge under-reports, and under-reporting is the safe direction: the
   * badge exists to say "look in here", never to certify that there is nothing to find.
   */
  countActiveInGroup(group: TSFixme): number {
    const names: string[] = [];
    for (const view of group.views || []) {
      if (view && typeof view.name === 'string') names.push(view.name);
    }

    return countActivePorts(names, {
      isConnected: (name) => Boolean(this.model && this.model.isPortConnected(name)),
      isSet: (name) => Boolean(this.model) && this.model.parameters[name] !== undefined
    });
  }

  /**
   * Whether a group draws open right now — the persisted preference, or the search's override.
   *
   * While a filter is active every group reads as expanded unless the builder has collapsed it
   * during this search, because a hit the query found and the panel then hid is worse than no
   * filter at all. See {@link _filterExpansion} for why this is not simply written through to
   * `propertyPanelViewState`.
   */
  isGroupExpanded(groupName: string): boolean {
    if (this._filterExpansion) {
      return Object.prototype.hasOwnProperty.call(this._filterExpansion, groupName)
        ? this._filterExpansion[groupName]
        : true;
    }

    return propertyPanelViewState.isExpanded(groupName);
  }

  /**
   * Take a new query from the filter box.
   *
   * The override map is created and destroyed on the *transitions* into and out of an active
   * filter, not on every keystroke — otherwise a group the builder collapsed mid-search would
   * spring back open on the next character they typed.
   */
  setFilterQuery(value: string): void {
    const wasActive = isFilterActive(this._filterQuery);
    const nowActive = isFilterActive(value);

    this._filterQuery = value;

    if (nowActive !== wasActive) {
      this._filterExpansion = nowActive ? {} : null;
    }

    this.renderGroups();
  }

  renderGroups() {
    if (!this.root) return; // not rendered yet

    const inputData = {
      ports: this._getPorts(),
      variant: this.model.variantName,
      // BCN-010: without this, a probe that settles *after* the panel is open
      // never reaches the screen — the ports have not changed, so the hash has
      // not changed, and `renderGroups` returns early. Subscribe To Changes on
      // Directus is exactly that case: it paints closed-because-unprobed and
      // then a real answer arrives ~200ms later.
      capabilities: this.capabilitySignature(),
      // DEF-036 AC3 — the warning has to clear itself. Ports arriving already moves this hash,
      // but the *reason* can change while the list stays empty (a backend that was not attached
      // becomes one that is starting), and that transition would otherwise never be drawn.
      schemaNotice: this.schemaNotice(),
      schemaAddField: this.schemaAddField(),
      // 🔴 The RAW query, not whether it is active. The filter box is a controlled input rendered
      // from this very call, so a keystroke that does not change the hash is a keystroke that
      // never reaches the box — type a space and the panel would appear frozen.
      filter: this._filterQuery
    };

    const _portsHash = JSON.stringify(inputData);
    if (_portsHash === this._portsHash)
      // No change in ports, no need to re-render
      return;

    this._portsHash = _portsHash;

    //remember the scrolling so a re-render doesn't reset the scroll position
    //
    // FB-017 / Jordan §4: falling back to the node's *remembered* offset is what makes a
    // reselect land where the builder left it. A re-render mid-session measures a live
    // scroller and reads the same number back; a fresh selection measures a panel that has
    // just been rebuilt at 0, and this is the only place that knows better.
    this.bindScrollTracking();

    const scroller = this.scrollContainer();
    let scrollTop = scroller ? scroller.scrollTop : 0;
    if (!scrollTop && !isFilterActive(this._filterQuery)) {
      scrollTop = propertyPanelViewState.getScroll(this.nodeId());
    }

    const allGroups = this.getViewGroupsFromPorts();

    // If only one group then don't render group sections
    //
    // 🔴 Both of these read the UNFILTERED groups, deliberately. Deciding either against the
    // surviving rows would let the panel's chrome change shape as a builder types: filtering down
    // to two rows would take the filter box away from under the cursor, and filtering down to one
    // group would drop every heading — including the one naming the group the hit was found in,
    // which is the answer to "where did this property live".
    const showHeaders = !(allGroups.length === 1 && allGroups[0].name === 'Other');
    const offerFilter = shouldOfferFilter(allGroups);

    const groups = offerFilter ? filterGroups(allGroups, this._filterQuery) : allGroups;

    // FB-017: two tiers. `orderPropertyGroups` decides which groups fold into `Advanced CSS`
    // and puts the rest in Richard's order — the node's own subject headings first, then the
    // shared CSS basics. See `propertyPanelTiers.ts` for the ruling and why it is keyed by
    // group name rather than by a per-port `tier` field.
    const { basic, advanced } = orderPropertyGroups(groups);

    // CHR-008 (R8): which groups say "switched off" once instead of under every row. Read off the same
    // descriptors `renderParams` draws, so a quiet row and its group's line cannot disagree.
    const groupGates = groupGatesFor(this.rowDescriptors());

    const toModel = (g): PropertyGroupModel => ({
      name: g.name,
      isExpanded: this.isGroupExpanded(g.name),
      // AC2: a collapsed group still reports how much of it is live, so folding CSS away
      // cannot become a new hiding place for FB-018's confusion.
      activeCount: this.countActiveInGroup(g),
      rows: this.renderParams(g.views, groupGates),
      gate: this.groupGateLine(groupGates.get(g.name))
    });

    const notice = this.schemaNotice();
    const addField = this.schemaAddField();

    this.root.render(
      React.createElement(
        React.Fragment,
        null,
        // Above the filter box, because it is the answer to "where are my fields" and the filter
        // is a way of searching a list that in this state does not exist.
        notice && React.createElement(SchemaFieldNoticeView, { notice }),
        addField &&
          React.createElement(SchemaAddFieldButton, {
            backendId: addField.backend.id,
            backendName: addField.backend.name,
            table: addField.table
          }),
        offerFilter &&
          React.createElement(PropertyFilterInput, {
            value: this._filterQuery,
            matchCount: countFilterableRows(groups),
            onChange: (value: string) => this.setFilterQuery(value)
          }),
        React.createElement(PropertyGroups, {
          groups: basic.map(toModel),
          advancedGroups: advanced.map(toModel),
          isAdvancedExpanded: this.isGroupExpanded(ADVANCED_CSS_GROUP),
          showHeaders,
          filterQuery: isFilterActive(this._filterQuery) ? this._filterQuery : undefined,
          onToggleGroup: (groupName: string, isExpanded: boolean) => {
            if (this._filterExpansion) {
              // Transient while searching — see the field's note. Writing this to settings would
              // persist a keystroke as a preference.
              this._filterExpansion[groupName] = isExpanded;
            } else {
              propertyPanelViewState.setExpanded(groupName, isExpanded);
            }
            // The ports have not changed, so `renderGroups`'s hash guard would refuse the
            // re-render that draws the new state. Clearing it is what makes the click visible.
            this._portsHash = undefined;
            this.renderGroups();
          }
        })
      )
    );

    //and now the rendering is done. In case any scrolling was done, set the scrolling again.
    //React commits asynchronously, so this has to wait for the rows to be in the DOM.
    this.settleScroll(scrollTop);

    // CHR-008 §3.2 — the structural notes, once React has actually committed the rows.
    this.settleHints();
  }
  render() {
    this._portsHash = undefined; // Clear cache

    if (!this.el) {
      this.el = document.createElement('div');

      // Some element in the prop editor has gained focus — move the ports to
      // the front so dropdowns are not clipped by the panels below.
      this.el.addEventListener('focusin', () => {
        this.el.style.zIndex = '1000';
      });
      this.el.addEventListener('focusout', () => {
        // Move back when blurred (wait 500ms)
        setTimeout(() => {
          this.el.style.zIndex = '';
        }, 500);
      });
    }

    if (!this.root) {
      this.root = createRoot(this.el);
    }

    this.renderGroups();
  }
  /**
   * CHR-008 (R8): what a group line says and does. `Turn on` sets the gate port to `true` through the same
   * undoable write every row uses; the port list then changes (the gate marks go), `ModelProxy` raises
   * `instancePortsChanged`, and the panel redraws with the rows live and no line.
   */
  private groupGateLine(gate: GroupGate | undefined): PropertyGroupModel['gate'] {
    if (!gate) return undefined;
    return {
      sentence: gate.sentence,
      gatePortName: gate.gatePortName,
      actionLabel: gate.turnOn ? 'Turn on' : `Show ${gate.gateLabel}`,
      onAction: gate.turnOn
        ? () => this.setParameter(gate.gatePortName, true)
        : () => this.focusGatePort(gate.gatePortName)
    };
  }
  setParameterEx(name, newvalue, oldvalue, skipundo) {
    this.model.setParameter(name, newvalue, {
      undo: !skipundo,
      oldValue: oldvalue,
      label: 'edit parameter'
    });
  }
  setParameter(name, newvalue) {
    this.model.setParameter(name, newvalue, { undo: true, label: 'edit parameter' });
  }
  /**
   * CHR-007: which row class a port gets. The decision is `widgetForPort` (`model/widgets.ts`), an
   * ordered table that needs no DOM; this only maps its answer to a class. BCN-003b's two filter
   * ports share `byobFilter`.
   */
  private static readonly WIDGET_CLASSES: Record<WidgetId, TSFixme> = {
    logicBuilderWorkspace: LogicBuilderWorkspaceType,
    logicBuilderHidden: LogicBuilderHiddenType,
    alignTools: AlignToolsType,
    sizeMode: SizeModeType,
    enum: EnumType,
    color: ColorType,
    boolean: BooleanType,
    textArea: TextAreaType,
    codeEditor: CodeEditorType,
    listValue: ListValueType,
    marginPadding: MarginPaddingType,
    numberWithUnits: NumberWithUnits,
    dimension: Dimension,
    identifier: IdentifierType,
    basic: BasicType,
    image: ImageType,
    icon: IconType,
    font: FontType,
    textStyle: TextStyleType,
    component: ComponentType,
    sourceCode: SourceCodeType,
    stringList: StringListType,
    resizing: ResizingType,
    variable: VariableType,
    curve: CurveType,
    byobFilter: ByobFilterType,
    querySorting: QuerySortingType,
    pages: PagesType,
    propList: PropListType,
    workflowCondition: WorkflowConditionType,
    workflowCases: WorkflowCasesType,
    workflowValue: WorkflowValueType,
    workflowParams: WorkflowParamsType,
    workflowTransform: WorkflowTransformType,
    workflowValidate: WorkflowValidateType,
    workflowBackoff: WorkflowBackoffType,
    workflowTriggerInfo: WorkflowTriggerInfoType,
    workflowFunctionRef: WorkflowFunctionRefType
  };

  viewClassForPort(p) {
    const widget = widgetForPort(p);
    return widget === undefined ? undefined : Ports.WIDGET_CLASSES[widget];
  }
  _getPorts(): readonly Port[] {
    let ports = this.model.getPorts('input');

    // Is type editable
    function isOfEditableType(p) {
      return !(typeof p.type === 'object' && p.type.allowConnectionsOnly);
    }

    // Remote not editable and ports that don't have an associated view
    ports = ports.filter((p) => isOfEditableType(p) && this.viewClassForPort(p) !== undefined);

    // If this is a popout remote all ports not beloning to this popout
    if (this.popout !== undefined)
      ports = ports.filter((p) => !(p.popout === undefined || p.popout.group !== this.popout));

    return ports;
  }

  getViewGroupsFromPorts() {
    const ports = this._getPorts();

    // Loop over all ports and create views.
    // DEBT-010: dispose the previous render's views before rebuilding — this
    // used to just drop them (as the legacy `el.html('')` did), leaking every
    // row's React root on each panel re-render.
    this.views.forEach((v) => v.dispose && v.dispose());

    this._toolsType = {};
    const _viewForPort = {};
    const _tabViews = {};
    const _popoutViews = {};
    this.views = [];

    let v: TSFixme;
    for (const i in ports) {
      const p = ports[i];

      if (p.popout !== undefined && this.popout === undefined) {
        // This port belongs to a popout
        if (_popoutViews[p.popout.group] === undefined) {
          _popoutViews[p.popout.group] = new PopoutGroup({
            group: p.popout.parentGroup || p.group,
            popoutGroup: p.popout.group,
            label: p.popout.label,
            parent: this
          });

          this.views.push(_popoutViews[p.popout.group]);
          _viewForPort[p.name] = v;
        }

        continue;
      }

      const viewClass = this.viewClassForPort(p);
      if (viewClass !== undefined) {
        v = viewClass.fromPort({ port: p, parent: this });
        if (v !== undefined) {
          // Rows whose default comes from a text style refresh when it changes.
          // Done here rather than in each row's render() because the converted
          // (React) rows do not all chain up to TypeView.render().
          v.bindStyleDefaultWatch && v.bindStyleDefaultWatch();

          this.views.push(v);
          _viewForPort[p.name] = v;
        }
      }
    }

    // Group property views
    const groups = (this.groups = []);

    function addToGroup(view) {
      const name = view.group ? view.group : 'Other';
      for (const i in groups) {
        const g = groups[i];
        if (g.name === name) {
          g.views.push(view);
          return;
        }
      }

      groups.push({ name: name, views: [view], isExpanded: true });
    }

    for (const i in this.views) {
      v = this.views[i];
      if (v.port !== undefined && v.port.parent !== undefined) {
        // This view port is a child to a parent port
        // add it to that view
        const parentV = _viewForPort[v.port.parent];
        parentV && parentV.addChildTypeView && parentV.addChildTypeView(v);
      } else if (v.port !== undefined && v.port.tab !== undefined) {
        // This port belongs to a tab group
        const group = v.port.tab.group;
        if (_tabViews[group] === undefined) {
          _tabViews[group] = new TabGroup({
            group: v.group,
            tabGroup: group,
            parent: this
          });
          addToGroup(_tabViews[group]);
        }
        _tabViews[group].addView(v);
      } else addToGroup(v);
    }

    return this.groups;
  }
}
