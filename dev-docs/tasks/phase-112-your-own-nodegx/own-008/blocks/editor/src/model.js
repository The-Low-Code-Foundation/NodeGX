// The editor's document: the app's components held in memory, and the eight things a person can do
// to them. Every button on the page calls one of these, and so does the test suite's adapter, so
// what the suite grades is what a click does. Plain ES module with no imports: it runs in the page
// and in Node.

const clone = (value) => JSON.parse(JSON.stringify(value));

function mintId() {
  if (globalThis.crypto && typeof globalThis.crypto.randomUUID === 'function') return globalThis.crypto.randomUUID();
  return 'b-' + Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 10);
}

/** A sentence the page can show a child as it is. */
export class BlockError extends Error {
  constructor(message) {
    super(message);
    this.name = 'BlockError';
  }
}

export class BlockDocument {
  constructor() {
    this.components = new Map(); // key → { key, revision, files, dirty }
    this.projectFiles = {}; // path → text, as opened: what the live app is built from
    this.history = [];
    this.listeners = new Set();
  }

  /** `project` is what the server's `readProject` hands back. Opening only reads. */
  open(project) {
    this.components.clear();
    this.history = [];
    this.projectFiles = { ...(project.files || {}) };
    for (const c of project.components) {
      this.components.set(c.key, { key: c.key, revision: c.revision, files: clone(c.files), dirty: false });
    }
    this.emit({ kind: 'open' });
  }

  onChange(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  emit(change) {
    for (const l of this.listeners) l(change);
  }

  keys() {
    return [...this.components.keys()];
  }

  component(key) {
    const c = this.components.get(key);
    if (!c) throw new BlockError(`There is no part called "${key}".`);
    return c;
  }

  nodes(key) {
    return this.component(key).files.nodes.nodes;
  }

  wires(key) {
    return this.component(key).files.connections.connections;
  }

  node(key, id) {
    const n = this.nodes(key).find((x) => x.id === id);
    if (!n) throw new BlockError(`That block is not in "${key}" any more.`);
    return n;
  }

  hasNode(key, id) {
    return this.nodes(key).some((x) => x.id === id);
  }

  // ── the one way a change happens: remember how it was, change it, mark it unsaved ──

  change(key, what, fn) {
    const c = this.component(key);
    const before = { key, files: clone(c.files), dirty: c.dirty, what };
    const working = clone(c.files);
    const result = fn(working); // throws BlockError and changes nothing
    c.files = working;
    c.dirty = true;
    this.history.push(before);
    if (this.history.length > 200) this.history.shift();
    this.emit({ kind: 'edit', key, what });
    return result;
  }

  canUndo() {
    return this.history.length > 0;
  }

  undo() {
    const last = this.history.pop();
    if (!last) return undefined;
    const c = this.component(last.key);
    c.files = last.files;
    c.dirty = last.dirty;
    this.emit({ kind: 'undo', key: last.key, what: last.what });
    return last;
  }

  // ── the eight things a person can do ──

  /**
   * Adds a block. `parent` puts it inside a box (at `index`, or last); a block with no parent is a
   * helper on the shelf, placed at `x`/`y`. Returns the id it minted.
   */
  addBlock(key, { type, parent, index, parameters, label, x, y }) {
    return this.change(key, 'add', (files) => {
      const nodes = files.nodes.nodes;
      let id = mintId();
      while (nodes.some((n) => n.id === id)) id = mintId();
      const node = { id, type };
      if (label !== undefined) node.label = label;
      if (x !== undefined) node.x = x;
      if (y !== undefined) node.y = y;
      if (parameters) node.parameters = { ...parameters };
      if (parent !== undefined) placeInside(nodes, node, parent, index);
      nodes.push(node);
      return id;
    });
  }

  /** Takes a block away, with everything inside it and every wire that touched any of them. */
  removeBlock(key, id) {
    this.node(key, id);
    return this.change(key, 'remove', (files) => {
      const gone = new Set([id]);
      for (let more = true; more; ) {
        more = false;
        for (const n of files.nodes.nodes) {
          if (n.parent !== undefined && gone.has(n.parent) && !gone.has(n.id)) {
            gone.add(n.id);
            more = true;
          }
        }
      }
      files.nodes.nodes = files.nodes.nodes.filter((n) => !gone.has(n.id));
      for (const n of files.nodes.nodes) {
        if (!n.children) continue;
        n.children = n.children.filter((c) => !gone.has(c));
        if (n.children.length === 0) delete n.children;
      }
      files.connections.connections = files.connections.connections.filter((w) => !gone.has(w.fromId) && !gone.has(w.toId));
      if (files.nodes.visualRoots) {
        files.nodes.visualRoots = files.nodes.visualRoots.filter((r) => !gone.has(r));
        if (files.nodes.visualRoots.length === 0) delete files.nodes.visualRoots;
      }
      return [...gone];
    });
  }

  /** "When this happens, do that": a wire from one block's output to another's input. */
  link(key, from, to) {
    this.node(key, from.node);
    this.node(key, to.node);
    if (this.findWire(key, from, to)) throw new BlockError('Those two are already joined that way.');
    return this.change(key, 'link', (files) => {
      files.connections.connections.push({ fromId: from.node, fromProperty: from.port, toId: to.node, toProperty: to.port });
    });
  }

  unlink(key, from, to) {
    if (!this.findWire(key, from, to)) throw new BlockError('Those two are not joined that way.');
    return this.change(key, 'unlink', (files) => {
      files.connections.connections = files.connections.connections.filter((w) => !sameWire(w, from, to));
    });
  }

  findWire(key, from, to) {
    return this.wires(key).find((w) => sameWire(w, from, to));
  }

  /** Changes one of a block's settings; `undefined` puts it back to how it starts. */
  setSetting(key, id, name, value) {
    this.node(key, id);
    return this.change(key, 'setting', (files) => {
      const node = files.nodes.nodes.find((n) => n.id === id);
      if (value === undefined) {
        if (node.parameters) delete node.parameters[name];
      } else {
        node.parameters = { ...(node.parameters || {}), [name]: value };
      }
    });
  }

  /** Puts a helper somewhere on the shelf. */
  placeHelper(key, id, x, y) {
    this.node(key, id);
    return this.change(key, 'place', (files) => {
      const node = files.nodes.nodes.find((n) => n.id === id);
      node.x = x;
      node.y = y;
    });
  }

  rename(key, id, label) {
    this.node(key, id);
    return this.change(key, 'rename', (files) => {
      files.nodes.nodes.find((n) => n.id === id).label = label;
    });
  }

  /** Moves a block into a box (or to another place in the same box). */
  putInside(key, id, parent, index) {
    this.node(key, id);
    this.node(key, parent);
    if (parent === id) throw new BlockError('A block cannot go inside itself.');
    const byId = new Map(this.nodes(key).map((n) => [n.id, n]));
    for (let cur = byId.get(parent); cur; cur = cur.parent !== undefined ? byId.get(cur.parent) : undefined) {
      if (cur.id === id) throw new BlockError('That box is inside this block, so this block cannot go inside it.');
    }
    return this.change(key, 'move', (files) => {
      const nodes = files.nodes.nodes;
      const node = nodes.find((n) => n.id === id);
      if (node.parent !== undefined) {
        const old = nodes.find((n) => n.id === node.parent);
        if (old && old.children) {
          old.children = old.children.filter((c) => c !== id);
          if (old.children.length === 0) delete old.children;
        }
      }
      placeInside(nodes, node, parent, index);
    });
  }

  // ── reading the document the way the page draws it ──

  /** The blocks on the screen, as a tree: the roots, then each block's children by id. */
  tree(key) {
    const nodes = this.nodes(key);
    const byId = new Map(nodes.map((n) => [n.id, n]));
    const listed = this.component(key).files.nodes.visualRoots;
    const roots = (listed && listed.length ? listed : nodes.filter((n) => n.parent === undefined && n.children && n.children.length).map((n) => n.id)).filter((id) => byId.has(id));
    return { roots, byId };
  }

  /** Blocks that are not on the screen: the helpers that do the work behind it. */
  helpers(key) {
    const { roots, byId } = this.tree(key);
    const inTree = new Set();
    const walk = (id) => {
      if (inTree.has(id)) return;
      inTree.add(id);
      for (const c of byId.get(id)?.children || []) walk(c);
    };
    roots.forEach(walk);
    return this.nodes(key).filter((n) => !inTree.has(n.id) && n.parent === undefined);
  }

  unsavedKeys() {
    return [...this.components.values()].filter((c) => c.dirty).map((c) => c.key);
  }

  /** What a save sends: each changed part, with the revision it was read at. */
  changes() {
    return [...this.components.values()].filter((c) => c.dirty).map((c) => ({ key: c.key, revision: c.revision, files: clone(c.files) }));
  }

  /** After a save: the parts that were written take their new revision and are no longer unsaved. */
  saved(results) {
    for (const r of results) {
      if (!r.ok) continue;
      const c = this.components.get(r.key);
      if (!c) continue;
      c.revision = r.revision;
      c.dirty = false;
      if (r.files) c.files = clone(r.files);
    }
    this.emit({ kind: 'saved', results });
  }

  /** Replaces one part with what is on disk now (after someone else changed it). Its own unsaved changes go. */
  reload(key, fresh) {
    const c = this.component(key);
    c.files = clone(fresh.files);
    c.revision = fresh.revision;
    c.dirty = false;
    this.history = this.history.filter((h) => h.key !== key);
    this.emit({ kind: 'reload', key });
  }

  /** Every file of the app as it stands in the editor, saved or not: what the live app is built from. */
  liveFiles() {
    const out = { ...this.projectFiles };
    for (const c of this.components.values()) {
      if (!c.dirty) continue;
      const base = `components/${c.key}/`;
      out[base + 'component.json'] = JSON.stringify(c.files.component, null, 2);
      out[base + 'nodes.json'] = JSON.stringify(c.files.nodes, null, 2);
      out[base + 'connections.json'] = JSON.stringify(c.files.connections, null, 2);
    }
    return out;
  }
}

function sameWire(w, from, to) {
  return w.fromId === from.node && w.fromProperty === from.port && w.toId === to.node && w.toProperty === to.port;
}

function placeInside(nodes, node, parentId, index) {
  const parent = nodes.find((n) => n.id === parentId);
  if (!parent) throw new BlockError('That box is not there any more.');
  if (!parent.children) parent.children = [];
  if (!parent.children.includes(node.id)) {
    const at = index !== undefined ? Math.max(0, Math.min(index, parent.children.length)) : parent.children.length;
    parent.children.splice(at, 0, node.id);
  }
  node.parent = parentId;
}
