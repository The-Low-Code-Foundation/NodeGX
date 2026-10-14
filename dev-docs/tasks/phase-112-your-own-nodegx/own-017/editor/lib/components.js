'use strict';

const { applyEdit } = require('@nodegx/project-contract/editor-suite');
const catalog = require('./catalog');
const { validateComponentFiles } = require('./validate');

function listRegistry(store) {
  const registry = store.readRegistry();
  return Object.entries(registry.components)
    .map(([key, entry]) => ({
      key,
      type: entry.type,
      nodeCount: entry.nodeCount ?? 0,
      connectionCount: entry.connectionCount ?? 0
    }))
    .sort((a, b) => a.key.localeCompare(b.key));
}

/** Every port name a node's type declares, split by direction, plus whatever dynamic ports it carries itself. */
function portNames(node, spec, plug) {
  const names = new Set();
  const table = plug === 'input' ? spec?.inputs : spec?.outputs;
  if (table) {
    for (const name of Object.keys(table)) names.add(name);
  }
  for (const port of node.ports || []) {
    if (port.plug === plug || port.plug === 'input/output') names.add(port.name);
  }
  return [...names].sort();
}

/** The read/edit view of one component: every node's fields (grouped by catalog group) and its wiring. */
function buildComponentView(store, key) {
  const stored = store.readComponent(key);
  const nodes = stored.files.nodes.nodes;
  const connections = stored.files.connections.connections;
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const labelOf = (id) => byId.get(id)?.label || id;

  const nodeViews = nodes.map((node) => {
    const spec = catalog.specFor(node.type);
    const incoming = connections.filter((c) => c.toId === node.id);
    const outgoing = connections.filter((c) => c.fromId === node.id);
    const incomingByProperty = new Map(incoming.map((c) => [c.toProperty, c]));

    const fieldNames = new Set();
    if (spec?.inputs) {
      for (const [name, def] of Object.entries(spec.inputs)) {
        if (def.type !== 'signal') fieldNames.add(name);
      }
    }
    for (const name of Object.keys(node.parameters || {})) fieldNames.add(name);

    const fields = [...fieldNames]
      .map((name) => {
        const def = spec?.inputs?.[name];
        const rawValue = node.parameters ? node.parameters[name] : undefined;
        const wire = incomingByProperty.get(name);
        return {
          name,
          kind: catalog.kindOf(name, def, rawValue),
          displayName: def?.displayName || name,
          description: def?.description || null,
          group: def?.group || 'Parameters',
          enumValues: def?.enums || null,
          value: rawValue === undefined ? null : rawValue,
          wired: wire ? `${labelOf(wire.fromId)} (${wire.fromProperty})` : null
        };
      })
      .sort((a, b) => (a.group === b.group ? a.name.localeCompare(b.name) : a.group.localeCompare(b.group)));

    return {
      id: node.id,
      type: node.type,
      label: node.label || null,
      fields,
      incoming: incoming.map((c) => ({
        fromId: c.fromId,
        fromLabel: labelOf(c.fromId),
        fromProperty: c.fromProperty,
        toProperty: c.toProperty
      })),
      outgoing: outgoing.map((c) => ({
        fromProperty: c.fromProperty,
        toId: c.toId,
        toLabel: labelOf(c.toId),
        toProperty: c.toProperty
      })),
      outputOptions: portNames(node, spec, 'output'),
      inputOptions: portNames(node, spec, 'input')
    };
  });

  return {
    key: stored.key,
    type: stored.entry.type,
    revision: stored.revision,
    nodes: nodeViews,
    nodeOptions: nodes.map((n) => ({ id: n.id, label: n.label || n.id, type: n.type }))
  };
}

/**
 * Applies a batch of node/wire edits to one component and writes it back, through the official
 * edit vocabulary (`@nodegx/project-contract/editor-suite`) and store (drift-checked, schema-validated).
 *
 * `nodeEdits`: [{ id, label?, setFields?: {name: value}, unsetFields?: [name] }]
 * `wireEdits`: [{ action: 'add' | 'remove', from: {node, port}, to: {node, port} }]
 */
function saveComponentEdits(store, key, { nodeEdits = [], wireEdits = [] }) {
  const stored = store.readComponent(key);
  let files = stored.files;

  for (const nodeEdit of nodeEdits) {
    if (nodeEdit.label !== undefined) {
      ({ files } = applyEdit(files, { edit: 'rename', component: key, id: nodeEdit.id, label: nodeEdit.label }));
    }
    for (const [name, value] of Object.entries(nodeEdit.setFields || {})) {
      ({ files } = applyEdit(files, { edit: 'set_parameter', component: key, id: nodeEdit.id, name, value }));
    }
    for (const name of nodeEdit.unsetFields || []) {
      ({ files } = applyEdit(files, { edit: 'set_parameter', component: key, id: nodeEdit.id, name, value: undefined }));
    }
  }

  for (const wireEdit of wireEdits) {
    const edit = {
      edit: wireEdit.action === 'add' ? 'connect' : 'disconnect',
      component: key,
      from: { node: wireEdit.from.node, port: wireEdit.from.port },
      to: { node: wireEdit.to.node, port: wireEdit.to.port }
    };
    ({ files } = applyEdit(files, edit));
  }

  validateComponentFiles(files);
  store.writeComponent(key, files);
  return buildComponentView(store, key);
}

module.exports = { listRegistry, buildComponentView, saveComponentEdits };
