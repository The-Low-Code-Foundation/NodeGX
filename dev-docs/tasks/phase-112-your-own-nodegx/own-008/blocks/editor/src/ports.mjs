// Which ports each block has, from the kit's node specs (never from memory), and for a placed part
// from the part's own Component Inputs and Component Outputs.

import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { specFor, drawnPorts } = require('@nodegx/node-spec');

const slim = (p) => ({ name: p.name, type: p.type, ...(p.displayName ? { displayName: p.displayName } : {}) });

/** Ports for one node type with no parameters set; `null` when the kit has no spec for it. */
export function typePorts(type) {
  const spec = specFor(type);
  if (!spec) return null;
  try {
    const drawn = drawnPorts(spec, {});
    return {
      inputs: drawn.filter((p) => p.plug === 'input').map(slim),
      outputs: drawn.filter((p) => p.plug === 'output').map(slim)
    };
  } catch {
    // A spec whose ports need the project or a schema: fall back to what it declares.
    const ins = typeof spec.inputs === 'object' ? spec.inputs : {};
    const outs = typeof spec.outputs === 'object' ? spec.outputs : {};
    return {
      inputs: Object.entries(ins).map(([name, d]) => slim({ name, ...d })),
      outputs: Object.entries(outs).map(([name, d]) => slim({ name, ...d }))
    };
  }
}

/** A placed part's ports: its Component Inputs' ports are the instance's inputs, its Component Outputs' its outputs. */
export function componentPorts(files) {
  const inputs = [];
  const outputs = [];
  for (const n of files.nodes.nodes) {
    if (n.type === 'Component Inputs') for (const p of n.ports || []) inputs.push(slim(p));
    if (n.type === 'Component Outputs') for (const p of n.ports || []) outputs.push(slim(p));
  }
  return { inputs, outputs };
}

/** Everything the page needs to name ports: by type, and by placed part (`/Todo/Header`). */
export function projectPorts(project, extraTypes = []) {
  const types = {};
  const parts = {};
  const want = new Set(extraTypes);
  for (const c of project.components) {
    parts['/' + c.key] = componentPorts(c.files);
    for (const n of c.files.nodes.nodes) if (!n.type.startsWith('/')) want.add(n.type);
  }
  for (const t of want) {
    const p = typePorts(t);
    if (p) types[t] = p;
  }
  return { types, parts };
}
