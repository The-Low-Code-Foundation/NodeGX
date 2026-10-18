// The map editor's model of one NodeGX project: every component's three files, parsed, and the
// eight changes a person can make to them. The page's buttons and the editor suite's adapter both
// call these methods; nothing else changes the files. Plain ES module, no dependencies, so it runs
// in the page and in Node alike. Saving is not done here: `changes()` hands the changed components
// to a writer (core/commit.mjs, through the kit's store) with the revision each one was read at.

export class MapRefusal extends Error {
  constructor(message) {
    super(message);
    this.name = 'MapRefusal';
  }
}

const clone = (v) => JSON.parse(JSON.stringify(v));

let counter = 0;
/** A node id of our own: short, unique enough within a component, never reused in a session. */
function mintId() {
  counter += 1;
  const rand = Math.random().toString(36).slice(2, 8);
  return `map-${Date.now().toString(36)}-${counter.toString(36)}${rand}`;
}

export class ProjectModel {
  constructor() {
    /** key → { key, legacyName, files, revision, dirty } */
    this.components = new Map();
    this.listeners = new Set();
    this.history = [];
  }

  /** `list`: [{ key, legacyName, files: { component, nodes, connections }, revision }] as read. Reading writes nothing. */
  load(list) {
    this.components.clear();
    this.history = [];
    for (const c of list) {
      this.components.set(c.key, { key: c.key, path: c.path ?? c.key, legacyName: c.legacyName, files: clone(c.files), revision: c.revision, dirty: false });
    }
    this.emit({ kind: 'load' });
  }

  /**
   * Components someone else changed on disk (an agent, the NodeGX editor) and that have no
   * unsaved change here: replaced by what is on disk now. A component with unsaved changes is
   * kept; its Save will be refused rather than overwrite theirs, unless the person chose to
   * drop their own changes to it (`discard`). Returns the keys replaced.
   */
  refresh(list, { discard = [] } = {}) {
    const replaced = [];
    for (const c of list) {
      const mine = this.components.get(c.key);
      const dropMine = discard.includes(c.key);
      if (mine && !dropMine && (mine.dirty || mine.revision === c.revision)) continue;
      this.components.set(c.key, { key: c.key, path: c.path ?? c.key, legacyName: c.legacyName, files: clone(c.files), revision: c.revision, dirty: false });
      this.history = this.history.filter((h) => h.key !== c.key);
      replaced.push(c.key);
    }
    if (replaced.length) this.emit({ kind: 'refresh', keys: replaced });
    return replaced;
  }

  onChange(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  emit(event) {
    for (const fn of this.listeners) fn(event);
  }

  keys() {
    return [...this.components.keys()];
  }

  component(key) {
    const c = this.components.get(key);
    if (!c) throw new MapRefusal(`There is no component "${key}" in this project.`);
    return c;
  }

  /** The component a node type like "/Commands/Add task" instantiates, if it is one of this project's. */
  componentForType(type) {
    if (typeof type !== 'string' || !type.startsWith('/')) return undefined;
    for (const c of this.components.values()) if (c.legacyName === type) return c;
    return undefined;
  }

  nodes(key) {
    return this.component(key).files.nodes.nodes;
  }

  wires(key) {
    return this.component(key).files.connections.connections;
  }

  node(key, id) {
    return this.nodes(key).find((n) => n.id === id);
  }

  mustNode(key, id, what) {
    const n = this.node(key, id);
    if (!n) throw new MapRefusal(`${what}: there is no node "${id}" in ${key}.`);
    return n;
  }

  /** Runs one change on one component: snapshot for undo, mark dirty, tell the page. */
  change(key, what, fn) {
    const c = this.component(key);
    const before = JSON.stringify(c.files);
    const result = fn(c.files);
    this.history.push({ key, before, what });
    if (this.history.length > 200) this.history.shift();
    c.dirty = true;
    this.emit({ kind: 'change', key, what });
    return result;
  }

  undo() {
    const last = this.history.pop();
    if (!last) return undefined;
    const c = this.component(last.key);
    c.files = JSON.parse(last.before);
    c.dirty = true;
    this.emit({ kind: 'undo', key: last.key, what: last.what });
    return last;
  }

  // --- the eight changes -------------------------------------------------------------------

  /** A new node. With `parent` it is a visual child (and has no position); otherwise it sits at x, y. Returns its id. */
  addNode(key, { type, parent, index, parameters, label, x, y }) {
    if (!type) throw new MapRefusal('Add node: pick a node type first.');
    const nodes = this.nodes(key);
    if (parent !== undefined) this.mustNode(key, parent, 'Add node');
    let id = mintId();
    while (nodes.some((n) => n.id === id)) id = mintId();
    return this.change(key, `add ${type}`, (files) => {
      const node = { id, type };
      if (label !== undefined) node.label = label;
      if (x !== undefined) node.x = x;
      if (y !== undefined) node.y = y;
      if (parameters) node.parameters = { ...parameters };
      if (parent !== undefined) attach(files.nodes.nodes, node, parent, index);
      files.nodes.nodes.push(node);
      return id;
    });
  }

  /** Removes a node, everything inside it, and every wire to or from any of them. */
  removeNode(key, id) {
    this.mustNode(key, id, 'Remove node');
    return this.change(key, `remove ${id}`, (files) => {
      const doomed = subtreeOf(files.nodes.nodes, id);
      files.nodes.nodes = files.nodes.nodes.filter((n) => !doomed.has(n.id));
      for (const n of files.nodes.nodes) {
        if (n.children) {
          n.children = n.children.filter((c) => !doomed.has(c));
          if (n.children.length === 0) delete n.children;
        }
      }
      files.connections.connections = files.connections.connections.filter((w) => !doomed.has(w.fromId) && !doomed.has(w.toId));
      if (files.nodes.visualRoots) {
        files.nodes.visualRoots = files.nodes.visualRoots.filter((r) => !doomed.has(r));
        if (files.nodes.visualRoots.length === 0) delete files.nodes.visualRoots;
      }
      return [...doomed];
    });
  }

  connect(key, from, to) {
    this.mustNode(key, from.node, 'Connect');
    this.mustNode(key, to.node, 'Connect');
    if (!from.port || !to.port) throw new MapRefusal('Connect: a wire needs an output port and an input port.');
    if (this.wires(key).some((w) => sameWire(w, from, to))) {
      throw new MapRefusal(`Connect: ${from.node}.${from.port} is already wired to ${to.node}.${to.port}.`);
    }
    this.change(key, `wire ${from.port} → ${to.port}`, (files) => {
      files.connections.connections.push({ fromId: from.node, fromProperty: from.port, toId: to.node, toProperty: to.port });
    });
  }

  disconnect(key, from, to) {
    if (!this.wires(key).some((w) => sameWire(w, from, to))) {
      throw new MapRefusal(`Cut wire: there is no wire ${from.node}.${from.port} → ${to.node}.${to.port} in ${key}.`);
    }
    this.change(key, `cut ${from.port} → ${to.port}`, (files) => {
      files.connections.connections = files.connections.connections.filter((w) => !sameWire(w, from, to));
    });
  }

  /** `value` undefined takes the parameter off the node (back to its default). */
  setParameter(key, id, name, value) {
    this.mustNode(key, id, 'Set parameter');
    if (!name) throw new MapRefusal('Set parameter: the parameter needs a name.');
    this.change(key, `set ${name}`, (files) => {
      const node = files.nodes.nodes.find((n) => n.id === id);
      if (value === undefined) {
        if (node.parameters) delete node.parameters[name];
      } else {
        node.parameters = { ...(node.parameters ?? {}), [name]: value };
      }
    });
  }

  move(key, id, x, y) {
    this.mustNode(key, id, 'Move');
    if (!Number.isFinite(x) || !Number.isFinite(y)) throw new MapRefusal('Move: a position is two numbers.');
    this.change(key, `move ${id}`, (files) => {
      const node = files.nodes.nodes.find((n) => n.id === id);
      node.x = x;
      node.y = y;
    });
  }

  rename(key, id, label) {
    this.mustNode(key, id, 'Rename');
    this.change(key, `rename ${id}`, (files) => {
      files.nodes.nodes.find((n) => n.id === id).label = label;
    });
  }

  /** Puts a node inside another (taking it out of its old parent first), at `index` or last. */
  reparent(key, id, parent, index) {
    const node = this.mustNode(key, id, 'Put inside');
    this.mustNode(key, parent, 'Put inside');
    if (parent === id) throw new MapRefusal('Put inside: a node cannot go inside itself.');
    const nodes = this.nodes(key);
    for (let cur = this.node(key, parent); cur; cur = cur.parent !== undefined ? nodes.find((n) => n.id === cur.parent) : undefined) {
      if (cur.id === id) throw new MapRefusal(`Put inside: "${parent}" is inside "${id}" already.`);
    }
    void node;
    this.change(key, `put ${id} inside ${parent}`, (files) => {
      const all = files.nodes.nodes;
      const n = all.find((x) => x.id === id);
      if (n.parent !== undefined) {
        const old = all.find((x) => x.id === n.parent);
        if (old?.children) {
          old.children = old.children.filter((c) => c !== id);
          if (old.children.length === 0) delete old.children;
        }
      }
      attach(all, n, parent, index);
    });
  }

  // --- saving ------------------------------------------------------------------------------

  /** Every component changed since it was read or saved, with the revision it was read at. */
  changes() {
    return [...this.components.values()].filter((c) => c.dirty).map((c) => ({ key: c.key, files: clone(c.files), revision: c.revision }));
  }

  /** After a writer accepted a component: the revision now on disk, and nothing left to save. */
  saved(key, revision) {
    const c = this.component(key);
    c.revision = revision;
    c.dirty = false;
    this.emit({ kind: 'saved', key });
  }

  dirtyCount() {
    let n = 0;
    for (const c of this.components.values()) if (c.dirty) n++;
    return n;
  }
}

function sameWire(w, from, to) {
  return w.fromId === from.node && w.fromProperty === from.port && w.toId === to.node && w.toProperty === to.port;
}

function attach(nodes, child, parentId, index) {
  const parent = nodes.find((n) => n.id === parentId);
  if (!parent.children) parent.children = [];
  if (!parent.children.includes(child.id)) {
    const at = index !== undefined ? Math.max(0, Math.min(index, parent.children.length)) : parent.children.length;
    parent.children.splice(at, 0, child.id);
  }
  child.parent = parentId;
}

/** A node and everything whose `parent` chain reaches it. */
export function subtreeOf(nodes, id) {
  const doomed = new Set([id]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const n of nodes) {
      if (n.parent !== undefined && doomed.has(n.parent) && !doomed.has(n.id)) {
        doomed.add(n.id);
        grew = true;
      }
    }
  }
  return doomed;
}
