// Which ports a node has. Nothing here is written from memory; each answer names where it came from.
//
//   spec       @nodegx/node-spec `drawnPorts(spec, parameters)`: declared ports, and the ones its parameters make
//   component  an instance of one of the project's own components: that component's Component Inputs / Outputs
//   script     a Function's code: `functionScriptPortNames` from @nodegx/project-contract (`in-x`, `out-x`)
//   node       the ports saved on the node itself (`ports`, a Component Inputs / Outputs node's list)
//   runtime    the runtime's own node library, read from @nodegx/preview in a page (vocabulary/node-library.json)
//
// A port that none of these names is still shown when the node has a value or a wire on it, marked as
// one the vocabulary does not know: the file has it, so the table must show it.
import { specFor, specs, drawnPorts } from '@nodegx/node-spec';
import { functionScriptPortNames } from '@nodegx/project-contract/function-ports.js';
import { toPathForm } from '@nodegx/project-contract/format.js';

export class Vocabulary {
  /** `nodeLibrary` is the runtime's node library JSON (`preview.nodeLibrary`), or undefined. */
  constructor({ nodeLibrary } = {}) {
    this.runtime = new Map();
    for (const t of nodeLibrary?.nodetypes ?? []) {
      if (t && typeof t.name === 'string') this.runtime.set(t.name, t);
    }
    this.hasRuntime = this.runtime.size > 0;
  }

  /** Every type the vocabulary can name, for the "add a node" field. */
  knownTypes(componentKeys = []) {
    const names = new Set([...this.runtime.keys(), ...Object.keys(specs)]);
    for (const key of componentKeys) names.add('/' + key);
    return [...names].sort();
  }

  /**
   * The ports of one node: { inputs, outputs }, each name → { type, source, description?, displayName? }.
   * `readComponent(key)` hands back another component's files (for an instance), or undefined.
   */
  portsOf(node, readComponent) {
    const inputs = new Map();
    const outputs = new Map();
    const add = (map, name, port, source) => {
      if (!name || map.has(name)) return;
      map.set(name, { type: port?.type ?? '*', source, displayName: port?.displayName, description: port?.description, enums: port?.enums });
    };
    const params = node.parameters ?? {};

    const spec = specFor(node.type);
    if (spec) {
      try {
        for (const p of drawnPorts(spec, params, {})) add(p.plug === 'input' ? inputs : outputs, p.name, p, 'spec');
      } catch {
        // A spec whose ports need the project (a schema, a component) cannot draw them from parameters alone.
        for (const [name, p] of Object.entries(spec.inputs ?? {})) add(inputs, name, p, 'spec');
        for (const [name, p] of Object.entries(spec.outputs ?? {})) add(outputs, name, p, 'spec');
      }
    }

    if (node.type === 'JavaScriptFunction') {
      const named = functionScriptPortNames(params.functionScript);
      for (const n of named.inputs) add(inputs, 'in-' + n, { type: '*' }, 'script');
      for (const n of named.outputs) add(outputs, 'out-' + n, { type: '*' }, 'script');
      for (const n of named.signals) add(outputs, 'out-' + n, { type: 'signal' }, 'script');
    }

    if (node.type.startsWith('/')) {
      const files = readComponent?.(toPathForm(node.type));
      for (const inner of files?.nodes?.nodes ?? []) {
        if (inner.type === 'Component Inputs') for (const p of inner.ports ?? []) add(inputs, p.name, p, 'component');
        if (inner.type === 'Component Outputs') for (const p of inner.ports ?? []) add(outputs, p.name, p, 'component');
      }
    }

    // Ports saved on the node. On Component Inputs a port is an output of the node, on Component Outputs an input.
    for (const p of node.ports ?? []) {
      if (!p?.name) continue;
      add(p.plug === 'output' ? outputs : inputs, p.name, p, 'node');
    }

    const lib = this.runtime.get(node.type);
    for (const p of lib?.ports ?? []) {
      if (p?.plug === 'input' || p?.plug === 'input/output') add(inputs, p.name, p, 'runtime');
      if (p?.plug === 'output' || p?.plug === 'input/output') add(outputs, p.name, p, 'runtime');
    }

    return { inputs, outputs, described: Boolean(spec || lib || node.type.startsWith('/') || node.ports?.length) };
  }
}
