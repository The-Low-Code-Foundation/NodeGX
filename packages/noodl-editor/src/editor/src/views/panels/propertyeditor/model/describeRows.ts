/**
 * CHR-007 — what rows a node's property panel gets, without a DOM.
 *
 * `Ports.renderParams` used to work each row's decorations out *while* building its element: the
 * port's description, the capability gate, the `dynamicports` switch that turned it off, and which
 * structural hints it can carry. Those are facts about the port and the node, not about the element,
 * so they are computed here once, as data, and `renderParams` draws what a descriptor says.
 *
 * Nothing here imports the editor. The node is reached through {@link RowContext}, whose probes
 * `Ports` fills from the same `ModelProxy` the rows get — so the answer a spec reads is the answer
 * the panel draws, and a probe the proxy does not forward is fixed in one place.
 *
 * ## What a descriptor deliberately does not carry
 *
 * - **A widget class.** `widget` is an id; `Ports` maps it to a row class. A descriptor must be
 *   serialisable, because it is also the panel's re-render hash.
 * - **A gate that is on.** `switchedOff` is present only while a `dynamicports` condition is
 *   switching the port off, because that is the only state `ModelProxy.getPorts` marks
 *   (`partitionGatedPorts`). A port whose condition currently holds is indistinguishable from an
 *   ungated one, on the panel and here.
 * - **The value.** A parameter edit must not change the hash: rebuilding rows under a focused field
 *   takes the focus with it (FB-017). Values stay with the rows, which read the model themselves.
 */
import { GATED_PORT_REASON_KEY, type PortGateReason } from '@noodl-models/nodelibrary/portGateReason';

import { widgetForPort, type WidgetId } from './widgets';

/** The port fields the panel reads. `ModelProxy.getPorts` hands over more; these are the ones that decide. */
export interface RowPortLike {
  name: string;
  displayName?: string;
  group?: string;
  type?: unknown;
  description?: unknown;
  tab?: { group: string; tab: string; label?: string };
  popout?: { group: string; label?: string; parentGroup?: string };
  parent?: string;
  [extra: string]: unknown;
}

/** A capability gate, narrowed to what the hash and the decoration need. */
export interface RowCapabilityGate {
  effective: string;
  isUsable?: boolean;
  reason?: string;
}

export interface RowContext {
  /** The ports the panel draws — `Ports._getPorts()`, already filtered and gate-marked. */
  ports: readonly RowPortLike[];
  /** BCN-010: the capability gate for one port, or none. */
  capabilityGate?: (portName: string) => RowCapabilityGate | undefined;
  /** FB-021: whether a wire is delivering a value to the port. */
  isConnected?: (portName: string) => boolean;
}

export interface RowDescriptor {
  /** Unique within one panel. The port name; a popout's rows are keyed under its group. */
  key: string;
  name: string;
  displayName: string;
  /** The English group label, `'Other'` when the port names none — tiers and expansion key on it. */
  group: string;
  widget: WidgetId;
  /** ERG-004: the port's own description, trimmed, when it has one. */
  description?: string;
  capabilityGate?: RowCapabilityGate;
  switchedOff?: PortGateReason;
  connected: boolean;
  tab?: { group: string; tab: string; label?: string };
  popout?: { group: string; label?: string; parentGroup?: string };
  parent?: string;
}

const OTHER_GROUP = 'Other';

function descriptionOf(port: RowPortLike): string | undefined {
  if (typeof port.description !== 'string') return undefined;
  const text = port.description.trim();
  return text === '' ? undefined : text;
}

/**
 * One descriptor per port that gets a row, in port order.
 *
 * A port with no widget is skipped rather than described — `_getPorts` already drops those, and a
 * descriptor with nothing to draw would be a row the panel cannot render.
 */
export function describeRows(context: RowContext): RowDescriptor[] {
  const rows: RowDescriptor[] = [];

  for (const port of context.ports) {
    const widget = widgetForPort(port);
    if (widget === undefined) continue;

    const row: RowDescriptor = {
      key: port.popout ? `${port.popout.group}/${port.name}` : port.name,
      name: port.name,
      displayName: port.displayName || port.name,
      group: port.group || OTHER_GROUP,
      widget,
      connected: Boolean(context.isConnected && context.isConnected(port.name))
    };

    const description = descriptionOf(port);
    if (description !== undefined) row.description = description;

    const gate = context.capabilityGate && context.capabilityGate(port.name);
    if (gate) row.capabilityGate = { effective: gate.effective, isUsable: gate.isUsable, reason: gate.reason };

    const switchedOff = port[GATED_PORT_REASON_KEY] as PortGateReason | undefined;
    if (switchedOff) row.switchedOff = switchedOff;

    if (port.tab) row.tab = port.tab;
    if (port.popout) row.popout = port.popout;
    if (port.parent) row.parent = port.parent;

    rows.push(row);
  }

  return rows;
}

/**
 * Whether the panel draws group headings — kept as a decision rather than inlined, because CHR-009
 * decides whether a lone `Other` group keeps its chrome.
 *
 * 🔴 Read against the UNFILTERED groups, as `renderGroups` always has: deciding against surviving
 * rows would let the headings vanish while a builder types into the filter.
 */
export function showsGroupHeaders(groupNames: readonly string[]): boolean {
  return !(groupNames.length === 1 && groupNames[0] === OTHER_GROUP);
}
