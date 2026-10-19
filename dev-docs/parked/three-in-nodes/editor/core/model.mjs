// The scene editor's model: the project's component files in memory, the edits a person makes to them, and undo.
// Plain ES module, no DOM: the page uses it, and so could a test in Node.
//
// A component is { key, legacyName, path, files: { component, nodes, connections }, revision }, as the server reads
// it through the kit's store. An edit changes `files` in place; Save sends every component whose files differ from
// what was read, with the revision it was read at, so a file changed on disk since is refused, never overwritten.

const clone = (v) => JSON.parse(JSON.stringify(v));

export class SceneModel {
  constructor() {
    this.comps = new Map();
    this.past = [];
    this.future = [];
    this.lastStep = null;
  }

  load(components) {
    this.comps.clear();
    for (const c of components) this.comps.set(c.key, { ...clone(c), saved: JSON.stringify(c.files) });
    this.past = [];
    this.future = [];
    this.lastStep = null;
  }

  /** After a save: the new revisions, and what is on disk now counts as clean. */
  markSaved(components) {
    for (const c of components) {
      const mine = this.comps.get(c.key);
      if (!mine) continue;
      mine.revision = c.revision;
      mine.saved = JSON.stringify(c.files);
    }
  }

  comp(key) {
    return this.comps.get(key);
  }

  byLegacyName(name) {
    for (const c of this.comps.values()) if (c.legacyName === name) return c;
    return undefined;
  }

  nodes(key) {
    return this.comps.get(key)?.files.nodes.nodes ?? [];
  }

  node(key, id) {
    return this.nodes(key).find((n) => n.id === id);
  }

  wires(key) {
    return this.comps.get(key)?.files.connections.connections ?? [];
  }

  /** The wire that drives this input, if one does: a wired port takes its value from the graph, not from here. */
  wireInto(key, id, port) {
    return this.wires(key).find((w) => w.toId === id && w.toProperty === port);
  }

  dirtyKeys() {
    return [...this.comps.values()].filter((c) => JSON.stringify(c.files) !== c.saved).map((c) => c.key);
  }

  changes() {
    return this.dirtyKeys().map((key) => {
      const c = this.comps.get(key);
      return { key, files: c.files, revision: c.revision };
    });
  }

  // ── undo ────────────────────────────────────────────────────────────────────────────────────────────────────

  /**
   * Remembers the component before an edit. Edits with the same `merge` tag in a row (one slider dragged, one
   * object dragged) are one step, so undo takes the whole drag back, not its last pixel.
   */
  step(key, merge) {
    const now = Date.now();
    if (merge && this.lastStep && this.lastStep.merge === merge && this.lastStep.key === key && now - this.lastStep.at < 1500) {
      this.lastStep.at = now;
      return;
    }
    this.past.push({ key, files: JSON.stringify(this.comps.get(key).files) });
    if (this.past.length > 200) this.past.shift();
    this.future = [];
    this.lastStep = { key, merge, at: now };
  }

  /** Ends a merged run, so the next drag is its own step. */
  settle() {
    this.lastStep = null;
  }

  undo() {
    return this.travel(this.past, this.future);
  }

  redo() {
    return this.travel(this.future, this.past);
  }

  travel(from, to) {
    const s = from.pop();
    if (!s) return null;
    const c = this.comps.get(s.key);
    const before = c.files;
    to.push({ key: s.key, files: JSON.stringify(before) });
    c.files = JSON.parse(s.files);
    this.lastStep = null;
    return { key: s.key, before, after: c.files };
  }

  // ── edits ───────────────────────────────────────────────────────────────────────────────────────────────────

  setParam(key, id, name, value, merge) {
    const n = this.node(key, id);
    if (!n) return;
    this.step(key, merge);
    n.parameters = n.parameters ?? {};
    if (value === undefined) delete n.parameters[name];
    else n.parameters[name] = value;
  }

  rename(key, id, label) {
    const n = this.node(key, id);
    if (!n) return;
    this.step(key, `rename:${id}`);
    n.label = label;
  }

  newId(key, base) {
    const taken = new Set(this.nodes(key).map((n) => n.id));
    const stem = (base || 'node').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'node';
    if (!taken.has(stem)) return stem;
    for (let i = 2; ; i++) if (!taken.has(`${stem}-${i}`)) return `${stem}-${i}`;
  }

  /** A new node under `parent` (a node id; none puts it at the component's top), at `index` among its children. */
  addNode(key, { type, parent, index, label, parameters }) {
    const c = this.comps.get(key);
    this.step(key);
    const id = this.newId(key, label || type.split('.').pop());
    const node = { id, type, label: label || undefined, parameters: clone(parameters ?? {}) };
    if (!node.label) delete node.label;
    if (parent) {
      node.parent = parent;
      const p = this.node(key, parent);
      p.children = p.children ?? [];
      p.children.splice(index ?? p.children.length, 0, id);
    }
    c.files.nodes.nodes.push(node);
    return id;
  }

  /** The node and everything under it, with every wire that touches one of them. */
  removeNode(key, id) {
    const c = this.comps.get(key);
    const gone = new Set(this.subtree(key, id));
    if (!gone.size) return;
    this.step(key);
    const n = this.node(key, id);
    if (n.parent) {
      const p = this.node(key, n.parent);
      if (p?.children) p.children = p.children.filter((x) => x !== id);
    }
    c.files.nodes.nodes = c.files.nodes.nodes.filter((x) => !gone.has(x.id));
    if (c.files.nodes.visualRoots) c.files.nodes.visualRoots = c.files.nodes.visualRoots.filter((x) => !gone.has(x));
    c.files.connections.connections = c.files.connections.connections.filter((w) => !gone.has(w.fromId) && !gone.has(w.toId));
  }

  subtree(key, id) {
    const out = [];
    const walk = (nid) => {
      const n = this.node(key, nid);
      if (!n) return;
      out.push(nid);
      for (const ch of n.children ?? []) walk(ch);
    };
    walk(id);
    return out;
  }

  /** Moves a node under another one. Refused (false) into itself or its own descendants. */
  reparent(key, id, parent, index) {
    if (this.subtree(key, id).includes(parent)) return false;
    const n = this.node(key, id);
    const p = this.node(key, parent);
    if (!n || !p) return false;
    this.step(key);
    if (n.parent) {
      const old = this.node(key, n.parent);
      const at = old.children.indexOf(id);
      old.children.splice(at, 1);
      if (old === p && index !== undefined && at < index) index--;
    }
    n.parent = parent;
    p.children = p.children ?? [];
    p.children.splice(index ?? p.children.length, 0, id);
    return true;
  }

  /** A copy of the node and what is under it, beside it, nudged so it does not sit inside the original. */
  duplicate(key, id) {
    const c = this.comps.get(key);
    const n = this.node(key, id);
    if (!n || !n.parent) return null;
    this.step(key);
    const ids = this.subtree(key, id);
    const map = new Map();
    for (const old of ids) map.set(old, this.newIdAvoiding(key, old, map));
    const copies = ids.map((old) => {
      const src = clone(this.node(key, old));
      src.id = map.get(old);
      if (src.children) src.children = src.children.map((ch) => map.get(ch));
      if (old !== id) src.parent = map.get(src.parent);
      return src;
    });
    const top = copies[0];
    top.parameters = top.parameters ?? {};
    top.parameters.x = Math.round(((Number(top.parameters.x) || 0) + 1.5) * 100) / 100;
    if (top.label) top.label = `${top.label} copy`;
    const p = this.node(key, n.parent);
    p.children.splice(p.children.indexOf(id) + 1, 0, top.id);
    c.files.nodes.nodes.push(...copies);
    return top.id;
  }

  newIdAvoiding(key, base, pending) {
    const taken = new Set([...this.nodes(key).map((n) => n.id), ...pending.values()]);
    for (let i = 2; ; i++) if (!taken.has(`${base}-${i}`)) return `${base}-${i}`;
  }
}

/** True when two versions of a component differ only in parameter values: the running app can take those live. */
export function onlyParameters(before, after) {
  const shape = (files) =>
    JSON.stringify({
      nodes: files.nodes.nodes.map((n) => [n.id, n.type, n.parent ?? null, n.children ?? []]),
      roots: files.nodes.visualRoots ?? [],
      wires: files.connections.connections
    });
  return shape(before) === shape(after);
}

/** Every parameter whose value differs between two versions, as [nodeId, name, value-after]. */
export function parameterDiff(before, after) {
  const out = [];
  const old = new Map(before.nodes.nodes.map((n) => [n.id, n.parameters ?? {}]));
  for (const n of after.nodes.nodes) {
    const a = old.get(n.id) ?? {};
    const b = n.parameters ?? {};
    for (const name of new Set([...Object.keys(a), ...Object.keys(b)])) {
      if (JSON.stringify(a[name]) !== JSON.stringify(b[name])) out.push([n.id, name, b[name]]);
    }
  }
  return out;
}
