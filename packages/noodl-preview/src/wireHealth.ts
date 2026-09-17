/**
 * P88 GAM-023 + GAM-024 — which wires in a project cannot work, read headlessly and honestly.
 *
 * ## What this answers, and for whom
 *
 * `exportComponent` drops every wire `getConnectionHealth` calls an error, and that verdict is only
 * ever computed for a project registered as a node-library module. Nothing headless registers one,
 * so `nodegx deploy` has shipped every wire unchecked (D48). Its validation gate refuses a wire into
 * a port a **built-in's declaration** lacks, and a wire to a missing node. It cannot judge a port
 * that only exists once something runs: a component's inputs and outputs, `Set Variable`,
 * `Function`, `For Each` item ports, a kit's ports. Measured at HEAD `67e1c7639` (GAM-023 §8 s18):
 * **6 of 10 kinds of broken wire deployed with `ok: true`.**
 *
 * Richard's ruling (R20, 2026-09-16): **publish every wire, and name the broken ones.** So this reads
 * health and reports it; {@link readWireHealth} leaves the export filter inert again unless the caller
 * asks for it on, and only the `deploy-from-disk` devtool does.
 *
 * ## 🔴 Ports first, or the report is mostly phantoms
 *
 * Health reads `node.getPort(name)`, and many families mint their ports inside a runtime `setup()`
 * that only runs when an editor is connected. Without them the verdict called 46 of TPL-005's 139
 * correct wires broken (D44). So the runtime is run the way the editor runs it
 * ({@link registerRuntimeDiscoveredPorts}) before a single wire is judged.
 *
 * ## An unchecked wire is not a broken one
 *
 * `nodegx deploy` does not load a project's `noodl_modules`, so a kit node's type is an
 * `UnknownNodeType` here and has no ports at all. Every wire touching one would read broken.
 * Those are counted apart, as **unchecked**, and never named as broken (GAM-024 §5).
 *
 * @module noodl-preview/wireHealth
 */

import type { NodeGraphNode } from '@noodl-models/nodegraphmodel';
import { NodeLibrary } from '@noodl-models/nodelibrary/nodelibrary';
import { CloudFunctionAdapter } from '@noodl-models/NodeTypeAdapters/CloudFunctionAdapter';
import { NamedPortsAdapter } from '@noodl-models/NodeTypeAdapters/NamedPortsAdapter';
import { PageInputsAdapter } from '@noodl-models/NodeTypeAdapters/PageInputsAdapter';
import { RouterNavigateAdapter } from '@noodl-models/NodeTypeAdapters/RouterNavigateAdapter';
import { ProjectModel } from '@noodl-models/projectmodel';
import { WarningsModel } from '@noodl-models/warningsmodel';
import { exportComponent } from '@noodl-utils/exporter/util';

type DynamicPorts = Parameters<NodeGraphNode['setDynamicPorts']>[0];
type DynamicPortsOptions = Parameters<NodeGraphNode['setDynamicPorts']>[1];

/**
 * The four warning methods silenced on the probe. A tuple so a typo is a compile error: a mistyped
 * key would add a property the runtime never calls and leave the real method live.
 */
const QUIET_CONNECTION_METHODS = ['sendWarning', 'clearWarning', 'sendWarnings', 'clearWarnings'] as const;

/**
 * The runtime objects the port pass reaches into, described by the surface it touches. Structural
 * because the real `EditorConnection` and runtime graph model are untyped JS behind `@noodl/runtime`.
 */
interface ProbeEditorConnection {
  isRunningLocally(): boolean;
  sendDynamicPorts(nodeId: string, ports: DynamicPorts, options?: DynamicPortsOptions): void;
  sendWarning?: () => void;
  clearWarning?: () => void;
  sendWarnings?: () => void;
  clearWarnings?: () => void;
}

interface ProbeGraphModel {
  listeners?: Record<string, unknown[]>;
  listenersWithRefs?: Record<string, { size: number }>;
  importEditorData(exportData: unknown): Promise<void>;
  emit(event: string, args?: unknown): Promise<unknown>;
}

export interface PortPassReading {
  /** Node types that minted ports on this project, read off what was actually pushed. */
  types: string[];
  /** Nodes that received at least one push. */
  nodesPorted: number;
  portsAdded: number;
  /** Pushes naming a node id the editor's model does not hold. */
  unmatched: number;
  /** 🔴 The lazy families waiting on `editorImportComplete` — the witness that the event was sent. */
  importCompleteListeners: number;
}

/** Test-only switches for the reverted arms (GAM-024 AC4). Never set by a product caller. */
export interface PortPassArms {
  skipAdapters?: boolean;
  skipImport?: boolean;
  skipImportComplete?: boolean;
}

/**
 * D44 · GAM-024 — give the editor's nodes the ports only the runtime knows how to derive.
 *
 * 🔴 **The same sequence the editor's viewer performs, not a re-derivation.** When the editor sends
 * `exportDataFull`, the runtime imports it (`graphModel.importEditorData`, which emits
 * `nodeAdded.<type>` for every node), fetches its bundles, and then emits `editorImportComplete`
 * (`noodl-runtime.ts`). Ten families subscribe to their node type only inside that last event,
 * `For Each` and `Function` among them, and `For Each` reads the template component off the
 * runtime's own `graphModel.components`. The devtool this replaced hand-built one fake node per
 * type and sent neither the import nor the event, so `For Each` never minted a port and three of
 * TPL-006's working wires read broken (D52).
 *
 * ⚠️ **A second runtime, deliberately.** `bootstrapNodeLibrary()` builds one in `runDeployed` mode
 * with no connection, and it populates `NodeLibrary` for every headless consumer. It is not changed.
 *
 * 🔴 **Called with the project NOT registered.** `exportComponent` flushes health first; with the
 * module registered that would judge every wire before a single port arrived.
 */
export async function registerRuntimeDiscoveredPorts(
  project: ProjectModel,
  arms: PortPassArms = {}
): Promise<PortPassReading> {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const NoodlRuntime = require('@noodl/runtime');
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const registerViewerNodes = require('../../noodl-viewer-react/src/register-nodes').default;

  const pushed: Array<{ nodeId: string; ports: DynamicPorts; options?: DynamicPortsOptions }> = [];

  const probe = new NoodlRuntime({
    type: 'browser',
    dontCreateRootComponent: true,
    platform: {
      requestUpdate: (cb: () => void) => setTimeout(cb, 0),
      getCurrentTime: () => 0,
      objectToString: (o: unknown) => JSON.stringify(o)
    }
  });

  /**
   * 🔴 The runtime builds its OWN `editorConnection` and ignores one passed in, and the families
   * capture it two ways (`setvariablenode.ts` reads `context.editorConnection` at call time,
   * `states.ts` keeps it from setup). Patching the one object the runtime made is the only thing
   * both see. The built-in families' setups already ran in the constructor, so their listeners exist.
   */
  const conn = probe.editorConnection as ProbeEditorConnection;
  conn.isRunningLocally = () => true;
  conn.sendDynamicPorts = (nodeId: string, ports: DynamicPorts, options?: DynamicPortsOptions) => {
    pushed.push({ nodeId, ports: ports || [], options });
  };
  for (const quiet of QUIET_CONNECTION_METHODS) {
    conn[quiet] = () => undefined;
  }

  // The viewer families register here and capture the connection above, which is why the patch precedes it.
  registerViewerNodes(probe);

  const gm = probe.graphModel as ProbeGraphModel;
  const importCompleteListeners =
    ((gm.listeners ?? {})['editorImportComplete'] ?? []).length +
    ((gm.listenersWithRefs ?? {})['editorImportComplete']?.size ?? 0);

  // Every component, every wire: the filter is inert while the module is unregistered, and a
  // numbered-inputs family reads its ports off the wires into it.
  const editorNodes = new Map<string, NodeGraphNode>();
  const components = project.getComponents();
  for (const comp of components) {
    comp.graph.forEachNode((n: NodeGraphNode) => {
      editorNodes.set(n.id, n);
    });
  }

  if (!arms.skipImport) {
    await gm.importEditorData({ components: components.map((c) => exportComponent(c)), componentIndex: {} });
  }
  // 🔴 `_onNodeAdded` emits without awaiting, and `EventSender.emit` awaits each listener in turn.
  // Let those land before the event that starts the lazy families, as the editor's bundle fetch does.
  await new Promise((resolve) => setTimeout(resolve, 0));
  if (!arms.skipImportComplete) {
    await gm.emit('editorImportComplete');
  }
  await new Promise((resolve) => setTimeout(resolve, 0));

  const types = new Set<string>();
  const ported = new Set<string>();
  let portsAdded = 0;
  let unmatched = 0;
  for (const { nodeId, ports, options } of pushed) {
    const node = editorNodes.get(nodeId);
    if (!node || typeof node.setDynamicPorts !== 'function') {
      unmatched++;
      continue;
    }
    // `setDynamicPorts` replaces, so a later push for the same node wins, as it does in the editor.
    node.setDynamicPorts(ports, options);
    types.add(typeof node.type === 'string' ? node.type : node.type?.name);
    ported.add(nodeId);
    portsAdded += ports.length;
  }

  return {
    types: [...types].filter(Boolean).sort(),
    nodesPorted: ported.size,
    portsAdded,
    unmatched,
    importCompleteListeners
  };
}

/**
 * The editor's OTHER port source: `NodeTypeAdapters`, which mint ports on the editor side when a
 * project loads (`registeradapters.ts`, `projectLoaded`). A `RouterNavigate`'s `pm-` page parameters
 * and a `CloudFunction2`'s `in-`/`out-` ports come only from here, and without them members-area's
 * 25 working wires read broken (s18 census).
 *
 * In `registeradapters.ts`'s order, driven directly the way `cloudDeployEnvironment.ts` drives them,
 * because importing that module registers every adapter the editor has. Left out on purpose:
 * `RouterAdapter` (its `projectLoaded` evaluates router warnings and mints no port) and the three
 * cloud record/query adapters (they serve `/#__cloud__/` components, which a deploy never ships).
 *
 * @returns the adapter names driven, for the census.
 */
const PROJECT_LOAD_PORT_ADAPTERS = [RouterNavigateAdapter, PageInputsAdapter, CloudFunctionAdapter, NamedPortsAdapter];

function runProjectLoadAdapters(project: ProjectModel): string[] {
  // The adapters read `ProjectModel.instance`. The setter registers the module, which the caller undoes.
  ProjectModel.instance = project;
  const ran: string[] = [];
  for (const Adapter of PROJECT_LOAD_PORT_ADAPTERS) {
    const adapter = new Adapter() as unknown as { typename?: string; events: { projectLoaded?: () => void } };
    adapter.events.projectLoaded?.();
    ran.push(adapter.typename ?? Adapter.name);
  }
  return ran;
}

/** One wire, named the way a person finds it on the canvas. */
export interface NamedWire {
  component: string;
  from: string;
  to: string;
  /** Why it cannot work, in the canvas's own words. Empty for an unchecked wire. */
  reason: string;
}

export interface WireHealthReading {
  /** Wires judged, across every component the deploy keeps. */
  checked: number;
  /** Wires health calls an error, with neither end on a type this process could not load. */
  broken: NamedWire[];
  /** Wires health could not judge, because an end is a node type this process never loaded. */
  unchecked: NamedWire[];
  /** The unloaded types those wires touch. */
  uncheckedTypes: string[];
  /** Editor-side adapters driven before the runtime pass. */
  adapters: string[];
  ports: PortPassReading;
}

const isCloudName = (name: string) => name.startsWith('/#__cloud__/');

function typeNameOf(node: NodeGraphNode | undefined): string | undefined {
  if (!node) return undefined;
  return typeof node.type === 'string' ? node.type : node.type?.name;
}

/**
 * By id, not by canvas label: the templates use labels as notes ("EDIT — the name of your game"), and
 * the id is what an agent, a `nodes.json` search and the canvas's node search all find.
 */
function wireEnd(id: string, port: string): string {
  return `${id}.${port}`;
}

/**
 * Judge every wire in the project, after the ports have arrived.
 *
 * @param options.leaveFilterOn keep the project registered, so `exportComponent` then DROPS what was
 *   judged broken. Only the devtool asks for this. The default unregisters it, which clears every
 *   recorded warning (`WarningsModel` listens for `moduleUnregistered`) and so leaves the export
 *   filter as inert as it was, per R20.
 */
export async function readWireHealth(
  project: ProjectModel,
  options: { leaveFilterOn?: boolean; arms?: PortPassArms } = {}
): Promise<WireHealthReading> {
  /**
   * 🔴 Refused, not defaulted. Making the project `ProjectModel.instance` arms the editor's autosave,
   * and the adapters and port pushes are model changes. Measured in s18: the devtool, which did not
   * set this flag, wrote a 0.1–2 MB legacy `project.json` into all seven `templates/` folders during
   * one census. Setting the flag here would hide which caller forgot it.
   */
  if (!project._isReadOnly) {
    throw new Error(
      'readWireHealth needs a read-only project (project._isReadOnly = true): it makes the project the ' +
        'editor instance, which schedules a save of every change it makes to it.'
    );
  }

  const library = NodeLibrary.instance;
  const previousInstance = ProjectModel.instance;

  // Editor order: the adapters run when the project loads, the runtime's ports arrive afterwards.
  const adapters = options.arms?.skipAdapters ? [] : runProjectLoadAdapters(project);

  // 🔴 Unregistered for the runtime pass: its export would otherwise flush health and filter the wires
  // the numbered-input families read their ports from.
  if (library.isModuleRegistered(project)) library.unregisterModule(project);

  const ports = await registerRuntimeDiscoveredPorts(project, options.arms);

  library.registerModule(project);

  const broken: NamedWire[] = [];
  const unchecked: NamedWire[] = [];
  const uncheckedTypes = new Set<string>();
  let checked = 0;

  for (const comp of project.getComponents()) {
    if (isCloudName(comp.name)) continue;
    const graph = comp.graph;
    graph.flushEvaluateHealth();

    for (const c of graph.connections) {
      checked++;
      const health = graph.getConnectionHealth(
        { sourceId: c.fromId, sourcePort: c.fromProperty, targetId: c.toId, targetPort: c.toProperty },
        { levels: ['error'] }
      );
      if (health.healthy) continue;

      const source = graph.findNodeWithId(c.fromId);
      const target = graph.findNodeWithId(c.toId);
      const wire: NamedWire = {
        component: comp.name,
        from: wireEnd(c.fromId, c.fromProperty),
        to: wireEnd(c.toId, c.toProperty),
        // The canvas's hover text is HTML (`<strong>enum</strong>`); a terminal reads the words.
        reason: String(health.message ?? '')
          .replace(/<br\s*\/?>/g, ' ')
          .replace(/<[^>]+>/g, '')
      };

      const missing = [source, target].filter((n) => n && library.typeIsMissing(n.type));
      if (missing.length > 0) {
        for (const n of missing) uncheckedTypes.add(typeNameOf(n));
        unchecked.push({ ...wire, reason: '' });
      } else {
        broken.push(wire);
      }
    }
  }

  if (!options.leaveFilterOn) {
    // Put back whatever was the instance (a deploy: none). The setter unregisters this project.
    if (ProjectModel.instance !== previousInstance) ProjectModel.instance = previousInstance;
    if (library.isModuleRegistered(project)) library.unregisterModule(project);
    // Belt and braces: the unregister listener clears these, and a deploy that shipped fewer wires
    // than R20 promises because a listener moved would be this task's defect in reverse.
    WarningsModel.instance.clearAllWarnings();
  }

  return { checked, broken, unchecked, uncheckedTypes: [...uncheckedTypes].sort(), adapters, ports };
}

/**
 * The sentences a person reads under a deploy that succeeded. Broken wires are named one by one,
 * because "3 wires are broken" sends a person hunting; unchecked ones are counted with their types.
 */
export function describeWireHealth(reading: WireHealthReading): string[] {
  const lines: string[] = [];
  for (const w of reading.broken) {
    lines.push(
      `${w.component}: the wire ${w.from} → ${w.to} cannot work (${
        w.reason || 'unhealthy'
      }). It was published as it is.`
    );
  }
  if (reading.unchecked.length > 0) {
    lines.push(
      `${reading.unchecked.length} wire(s) touch a kit node this deploy does not load ` +
        `(${reading.uncheckedTypes.join(', ')}), so they were published without being checked.`
    );
  }
  return lines;
}
