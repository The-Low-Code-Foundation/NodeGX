/**
 * ISL-026 / P109-S17-KITTHROWBLANKS — a kit node that throws when it draws loses itself, not the page.
 *
 * A kit's node is a stranger's React component: a dependency that failed to load, a browser API a
 * WebView lacks, a library's own error. Before this, its throw unmounted the whole React root, so the
 * page went blank, built-in nodes included, and nothing said which node had failed (ISL-012 s17, the
 * cube kit with three.js missing).
 *
 * The boundary sits around each kit node's component and nothing else: a built-in node's throw still
 * takes the root down (C65 and C70 were fixed at their source; a boundary for built-ins is a ruling of
 * its own). When it catches, the node draws nothing, and the failure is raised once on the error bus
 * (`raiseRuntimeError`), which already carries it to the editor's warning on the node, the console and
 * `On App Error` (nodecontext.ts). A `setDiagnostic` beside it would report the same failure twice.
 *
 * The component is wrapped in `forwardRef`, so the ref the node hands its component (`innerReactComponentRef`,
 * a host element's `setDOMElement`) reaches the kit's own component exactly as before.
 */
import React from 'react';

import type { ReactNodeDefinition } from './react-component-node';

/** The runtime node, as the boundary reports to it. */
interface ReportingNode {
  name?: string;
  raiseRuntimeError?(code: string, message: string, detail?: unknown): void;
}

export const KIT_NODE_FAILED = 'kit-node/render-failed';

export function kitNodeFailedMessage(nodeName: string, error: unknown): string {
  const reason = error instanceof Error ? error.message : String(error);
  return `The kit node "${nodeName}" failed while drawing and shows nothing: ${reason}`;
}

interface BoundaryProps {
  node: ReportingNode;
  children?: React.ReactNode;
}

class KitNodeBoundary extends React.Component<BoundaryProps, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    const { node } = this.props;
    const message = kitNodeFailedMessage(node.name ?? 'unknown', error);
    // Reporting must not throw out of the boundary that is containing a throw.
    try {
      node.raiseRuntimeError && node.raiseRuntimeError(KIT_NODE_FAILED, message, { error: String(error) });
    } catch (e) {
      /* the node draws nothing either way */
    }
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}

/** The kit's component, inside a boundary that reports to `node`. */
type KitProps = Record<string, unknown>;

function withKitNodeBoundary(Inner: React.ComponentType<KitProps> | string, node: ReportingNode): React.ComponentType<KitProps> {
  const Bounded = React.forwardRef<unknown, KitProps>(function KitNode(props, ref) {
    return React.createElement(KitNodeBoundary, { node }, React.createElement(Inner, { ...props, ref }));
  });
  Bounded.displayName = `KitNode(${typeof Inner === 'string' ? Inner : Inner.displayName || Inner.name || 'Component'})`;
  return Bounded;
}

const BOUNDED = Symbol('kit-node-boundary');

/**
 * Draw a kit node definition's component inside a boundary. In place, as `createNodeFromReactComponent`
 * itself patches the definition it is given; a definition registered twice is wrapped once.
 * `getReactComponent` is called with the runtime node as `this` (react-component-node.ts), so the
 * boundary reports to that node.
 */
export function withKitBoundary(def: ReactNodeDefinition): ReactNodeDefinition {
  const marked = def as ReactNodeDefinition & { [BOUNDED]?: true };
  const getReactComponent = def.getReactComponent;
  if (marked[BOUNDED] || typeof getReactComponent !== 'function') return def;
  def.getReactComponent = function (this: ReportingNode) {
    return withKitNodeBoundary(getReactComponent.call(this as never), this);
  } as ReactNodeDefinition['getReactComponent'];
  marked[BOUNDED] = true;
  return def;
}
