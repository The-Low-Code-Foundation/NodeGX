/**
 * P109 ISL-042 (P78-DBT-BUNDLEWIRES) — the wires in a function bundle that reach nothing, read before it loads.
 *
 * `CloudRunner.load` accepts two bundles that can never answer, and the caller only learns by waiting out the timeout
 * (CWF-018's 504, which talks about unwired `Failure` ports and names neither cause):
 *
 * - **Wires in the on-disk spelling.** A component on disk writes `{fromId, fromProperty, toId, toProperty}`; a bundle
 *   writes `{sourceId, sourcePort, targetId, targetPort}`. A wire without `sourceId` / `targetId` connects nothing.
 *   That is a refusal: no such wire works.
 * - **A wire into a component port the component does not declare.** A bundle component's interface is its `ports`
 *   list (the editor's exporter writes it from `Component Inputs` / `Component Outputs`). DBT's first door wrote
 *   `ports: []`, and every wire into a helper went nowhere. That is a warning: the instance's own `ports`, or a
 *   component in another bundle, may still answer it, and only a component in this bundle is checked.
 *
 * Pure: the caller supplies the bundle body as it arrived.
 *
 * @module nodegx-backend/workflow/bundleWiring
 */

type Row = Record<string, unknown>;

export interface BundleWiringReport {
  /** One sentence per component whose wires cannot connect anything. A deploy carrying any is refused. */
  refusals: string[];
  /** One sentence per wire into (or out of) a component port the component does not declare. */
  warnings: string[];
}

function rows(value: unknown): Row[] {
  return Array.isArray(value) ? value.filter((v): v is Row => !!v && typeof v === 'object') : [];
}

function portNames(ports: unknown, plug: 'input' | 'output'): Set<string> {
  const names = new Set<string>();
  for (const port of rows(ports)) {
    if (typeof port.name === 'string' && (port.plug === undefined || port.plug === plug)) names.add(port.name);
  }
  return names;
}

const SHOWN = 6;
const list = (names: Iterable<string>) => {
  const all = [...names].map((n) => `"${n}"`);
  if (all.length === 0) return 'none';
  return all.length > SHOWN ? `${all.slice(0, SHOWN).join(', ')} and ${all.length - SHOWN} more` : all.join(', ');
};

export function bundleWiringProblems(bundle: unknown): BundleWiringReport {
  const report: BundleWiringReport = { refusals: [], warnings: [] };
  const components = rows(bundle && typeof bundle === 'object' ? (bundle as Row).components : undefined);

  const interfaces = new Map<string, { inputs: Set<string>; outputs: Set<string> }>();
  for (const component of components) {
    if (typeof component.name !== 'string') continue;
    interfaces.set(component.name, { inputs: portNames(component.ports, 'input'), outputs: portNames(component.ports, 'output') });
  }

  for (const component of components) {
    const name = typeof component.name === 'string' ? component.name : '(a component with no name)';
    const wires = rows(component.connections);
    const unwired = wires.filter((w) => typeof w.sourceId !== 'string' || typeof w.targetId !== 'string');
    if (unwired.length > 0) {
      const onDisk = unwired.some((w) => 'fromId' in w || 'toId' in w);
      report.refusals.push(
        `${name}: ${unwired.length} of its ${wires.length} wires ${unwired.length === 1 ? 'has' : 'have'} no sourceId / targetId` +
          (onDisk
            ? `, because ${unwired.length === 1 ? 'it is' : 'they are'} written fromId / fromProperty / toId / toProperty, the spelling of a component on disk`
            : '') +
          '. A bundle writes its wires sourceId / sourcePort / targetId / targetPort. As sent, these wires connect nothing. ' +
          'The function would never answer, and every call would wait out its timeout.'
      );
      continue;
    }

    const nodes = new Map<string, Row>();
    for (const node of rows(component.nodes)) if (typeof node.id === 'string') nodes.set(node.id, node);
    const said = new Set<string>();
    for (const wire of wires) {
      for (const [end, plug] of [
        ['target', 'input'],
        ['source', 'output']
      ] as const) {
        const node = nodes.get(wire[`${end}Id`] as string);
        const helper = node && typeof node.type === 'string' ? interfaces.get(node.type) : undefined;
        const port = wire[`${end}Port`];
        if (!node || !helper || typeof port !== 'string') continue;
        const declared = plug === 'input' ? helper.inputs : helper.outputs;
        if (declared.has(port) || portNames(node.ports, plug).has(port)) continue;
        const key = `${node.type}|${plug}|${port}`;
        if (said.has(key)) continue;
        said.add(key);
        report.warnings.push(
          `In ${name}, a wire ${plug === 'input' ? 'goes into' : 'comes from'} "${port}" on ${node.type as string}, which declares no such ${plug} ` +
            `(its ${plug}s: ${list(declared)}). ${plug === 'input' ? 'The value never arrives' : 'Nothing ever comes out'}. ` +
            `Declare it in the component's "ports" (from its Component ${plug === 'input' ? 'Inputs' : 'Outputs'} node).`
        );
      }
    }
  }
  return report;
}
