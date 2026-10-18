// The table editor's one model: a NodeGX project held as one table per component, changed one cell
// at a time, saved through the kit's store. The page's clicks and the suite's adapter both call the
// actions below; neither has a shortcut around them.
//
// Opening reads and writes nothing. A component is read when its table is first asked for, and its
// `revision` is kept; Save hands that revision back (`ifRevision`), so a file the person's agent or
// the NodeGX editor changed meanwhile is refused, not overwritten. Nothing is saved until Save.
import { V2ProjectStore, FormatRefusal, SchemaValidator, SCHEMA_IDS, toPathForm } from '@nodegx/project-contract/format.js';
import { pinRunOnValueChangeDefaults, projectPredatesRunOnValueChange } from '@nodegx/project-contract/run-on-value-change-migration.js';
import { randomUUID } from 'node:crypto';
import { parseValue, formatValue, portKind } from './cells.mjs';

/** A refusal of one action, in a sentence the page shows as it is. */
export class CellRefusal extends Error {}

const clone = (v) => JSON.parse(JSON.stringify(v));
const CLOUD = /^\/?#__cloud__\//;

export class TableSession {
  /** `files` is a `ProjectFiles` (diskFiles for a folder, memoryFiles in the suite). */
  constructor(files, { vocabulary, mintId = randomUUID } = {}) {
    this.store = new V2ProjectStore(files);
    this.vocabulary = vocabulary;
    this.mintId = mintId;
    this.work = new Map(); // key → { revision, files, dirty, touched:Set }
    const project = this.store.readProjectFile();
    this.projectName = project?.name;
    this.formatVersion = project?.version;
  }

  componentKeys() {
    return this.store.componentKeys();
  }

  dirtyKeys() {
    return [...this.work].filter(([, w]) => w.dirty).map(([k]) => k);
  }

  /** The working copy of a component. A clean one is read again, so a change on disk shows. */
  working(input) {
    const resolved = this.store.resolve(input);
    if (!resolved) throw new CellRefusal(`There is no component "${input}" in this project.`);
    const key = resolved.key;
    const w = this.work.get(key);
    if (w && w.dirty) return { key, w };
    const read = this.store.readComponent(key);
    if (w && w.revision === read.revision) return { key, w };
    const fresh = { revision: read.revision, files: clone(read.files), dirty: false, touched: new Set() };
    this.work.set(key, fresh);
    return { key, w: fresh };
  }

  /** Another component's files for an instance's ports: the working copy when there is one, else as stored. */
  filesForPorts(key) {
    const w = this.work.get(key);
    if (w) return w.files;
    const r = this.store.resolve(key);
    return r ? this.store.filesOf(r.key, r.entry) : undefined;
  }

  portsOf(node) {
    return this.vocabulary.portsOf(node, (k) => this.filesForPorts(k));
  }

  inputPort(node, name) {
    return this.portsOf(node).inputs.get(name);
  }

  // ---------------------------------------------------------------- actions (one per thing a person does)

  /** "Add a node" row. Returns the id it minted. */
  addNode(component, { type, parent, index, label, x, y }) {
    const { w } = this.working(component);
    if (!type || typeof type !== 'string') throw new CellRefusal('A new node needs a type.');
    const nodes = w.files.nodes.nodes;
    const id = this.mintId();
    if (nodes.some((n) => n.id === id)) throw new CellRefusal(`A node "${id}" is already there.`);
    const node = { id, type };
    if (label !== undefined && label !== '') node.label = label;
    if (x !== undefined) node.x = num(x, 'x');
    if (y !== undefined) node.y = num(y, 'y');
    if (parent !== undefined && parent !== '') {
      const p = nodes.find((n) => n.id === parent);
      if (!p) throw new CellRefusal(`There is no node "${parent}" to be the parent.`);
      p.children = p.children ?? [];
      const at = index === undefined ? p.children.length : Math.max(0, Math.min(index, p.children.length));
      p.children.splice(at, 0, id);
      node.parent = parent;
    }
    nodes.push(node);
    this.touch(w, id);
    return id;
  }

  /** "Remove" on a row: the node, every node under it, and every wire to or from them. */
  removeNode(component, id) {
    const { w } = this.working(component);
    const files = w.files;
    this.node(w, id);
    const doomed = new Set([id]);
    for (let grew = true; grew; ) {
      grew = false;
      for (const n of files.nodes.nodes) {
        if (n.parent !== undefined && doomed.has(n.parent) && !doomed.has(n.id)) {
          doomed.add(n.id);
          grew = true;
        }
      }
    }
    files.nodes.nodes = files.nodes.nodes.filter((n) => !doomed.has(n.id));
    for (const n of files.nodes.nodes) {
      if (n.children) {
        n.children = n.children.filter((c) => !doomed.has(c));
        if (n.children.length === 0) delete n.children;
      }
    }
    files.connections.connections = files.connections.connections.filter((c) => !doomed.has(c.fromId) && !doomed.has(c.toId));
    if (files.nodes.visualRoots) {
      files.nodes.visualRoots = files.nodes.visualRoots.filter((r) => !doomed.has(r));
      if (files.nodes.visualRoots.length === 0) delete files.nodes.visualRoots;
    }
    for (const d of doomed) w.touched.delete(d);
    w.dirty = true;
    return [...doomed];
  }

  /** What removing a node would take with it, for the page's confirmation. */
  removalOf(component, id) {
    const { w } = this.working(component);
    const doomed = new Set([id]);
    for (let grew = true; grew; ) {
      grew = false;
      for (const n of w.files.nodes.nodes) {
        if (n.parent !== undefined && doomed.has(n.parent) && !doomed.has(n.id)) {
          doomed.add(n.id);
          grew = true;
        }
      }
    }
    const wires = w.files.connections.connections.filter((c) => doomed.has(c.fromId) || doomed.has(c.toId)).length;
    return { nodes: doomed.size, wires };
  }

  /**
   * Typing in a cell. `column` is `label`, `parent`, `position` or `in:<port>`; `text` is what was typed.
   * Returns the value that was stored.
   */
  setCell(component, id, column, text) {
    const { w } = this.working(component);
    const node = this.node(w, id);
    if (column === 'label') {
      node.label = text;
      this.touch(w, id);
      return text;
    }
    if (column === 'position') {
      const m = /^\s*(-?\d+(?:\.\d+)?)\s*[, ]\s*(-?\d+(?:\.\d+)?)\s*$/.exec(text);
      if (!m) throw new CellRefusal('A position is two numbers, x and y: "120, 40".');
      node.x = Number(m[1]);
      node.y = Number(m[2]);
      this.touch(w, id);
      return { x: node.x, y: node.y };
    }
    if (column === 'parent') return this.setParent(w, node, text);
    if (column.startsWith('in:')) {
      const name = column.slice(3);
      const port = this.inputPort(node, name);
      if (port && portKind(port).kind === 'signal') {
        throw new CellRefusal(`"${name}" is a signal: it has no value to type. Wire something to it instead.`);
      }
      let value;
      try {
        value = parseValue(text, port);
      } catch (err) {
        throw new CellRefusal(err.message);
      }
      node.parameters = { ...(node.parameters ?? {}), [name]: value };
      this.touch(w, id);
      return value;
    }
    if (column === 'id' || column === 'type') throw new CellRefusal(`A node's ${column} is not changed here: remove the row and add another.`);
    throw new CellRefusal(`"${column}" is not a column that holds a value. An output's cell holds wires.`);
  }

  /** Delete on a value cell: the parameter is unset, so the node goes back to its default. */
  clearCell(component, id, column) {
    const { w } = this.working(component);
    const node = this.node(w, id);
    if (!column.startsWith('in:')) {
      throw new CellRefusal(column === 'label' ? 'Type a new label instead: a label is never removed here.' :
        column === 'parent' ? 'Type another parent instead: a child is moved, not set loose.' :
          column === 'position' ? 'Type another position instead.' : `"${column}" cannot be cleared.`);
    }
    const name = column.slice(3);
    if (node.parameters && name in node.parameters) {
      delete node.parameters[name];
      this.touch(w, id);
    }
  }

  /** "Add a wire" in a cell: from an output of one node to an input of another. */
  connect(component, from, to) {
    const { w } = this.working(component);
    this.node(w, from.node);
    this.node(w, to.node);
    if (!from.port || !to.port) throw new CellRefusal('A wire needs a port at each end.');
    const list = w.files.connections.connections;
    if (list.some((c) => c.fromId === from.node && c.fromProperty === from.port && c.toId === to.node && c.toProperty === to.port)) {
      throw new CellRefusal(`That wire is already there: ${from.node}.${from.port} → ${to.node}.${to.port}.`);
    }
    list.push({ fromId: from.node, fromProperty: from.port, toId: to.node, toProperty: to.port });
    this.touch(w, to.node);
  }

  /** The ✕ on a wire in a cell. */
  disconnect(component, from, to) {
    const { w } = this.working(component);
    const list = w.files.connections.connections;
    const kept = list.filter((c) => !(c.fromId === from.node && c.fromProperty === from.port && c.toId === to.node && c.toProperty === to.port));
    if (kept.length === list.length) throw new CellRefusal(`There is no wire ${from.node}.${from.port} → ${to.node}.${to.port}.`);
    w.files.connections.connections = kept;
    w.dirty = true;
  }

  /** "Undo my changes" for one component: the working copy goes back to the files. */
  revert(component) {
    const resolved = this.store.resolve(component);
    if (resolved) this.work.delete(resolved.key);
  }

  // ---------------------------------------------------------------- saving

  /**
   * Writes every changed component through the store, each with the revision it was read at.
   * Returns { written, unchanged, refused: [{ component, reason, sentence }] }. A refused component keeps its edits.
   */
  save() {
    const result = { written: [], unchanged: [], refused: [] };
    const predates5 = projectPredatesRunOnValueChange(this.formatVersion);
    for (const key of this.dirtyKeys()) {
      const w = this.work.get(key);
      const problems = validateComponent(w.files);
      if (problems.length) {
        result.refused.push({ component: key, reason: 'invalid', sentence: `${key} was not saved: ${problems.slice(0, 3).join('; ')}` });
        continue;
      }
      try {
        const out = this.store.writeComponent(key, w.files, {
          ifRevision: w.revision,
          // A format-4 project: the official writers pin run-on-value-change on what they write, so the
          // NodeGX editor's 4 → 5 upgrade will not silence an input a person wired today (NDA-017, ISL-018).
          prepare: () => {
            if (predates5) pinTouched(key, w);
          }
        });
        (out.unchanged ? result.unchanged : result.written).push(key);
        this.work.delete(key);
      } catch (err) {
        if (!(err instanceof FormatRefusal)) throw err;
        result.refused.push({
          component: key,
          reason: err.reason,
          sentence: err.reason === 'drift' || err.reason === 'stale-revision'
            ? `${key} changed on disk after you opened it (someone else saved it). Your edits to it are kept here and were not written. To take theirs, press "Undo my changes here" on ${key}; your edits to it will be lost.`
            : `${key} was not saved: ${err.message}`
        });
      }
    }
    return result;
  }

  // ---------------------------------------------------------------- the table

  /** The table a page draws for one component: rows, columns, and every non-empty cell as text. */
  table(component, { allPorts = false } = {}) {
    const { key, w } = this.working(component);
    const nodes = w.files.nodes.nodes;
    const wires = w.files.connections.connections;
    const byId = new Map(nodes.map((n) => [n.id, n]));
    const name = (id) => {
      const n = byId.get(id);
      return n?.label ? `${n.label}` : id;
    };

    // Rows: each visual tree depth first, then every other node in file order.
    const order = [];
    const seen = new Set();
    const visit = (n, depth) => {
      if (!n || seen.has(n.id)) return;
      seen.add(n.id);
      order.push({ n, depth });
      for (const c of n.children ?? []) visit(byId.get(c), depth + 1);
    };
    for (const r of w.files.nodes.visualRoots ?? []) visit(byId.get(r), 0);
    for (const n of nodes) if (n.parent === undefined && n.children?.length) visit(n, 0);
    for (const n of nodes) if (!seen.has(n.id)) visit(n, n.parent !== undefined ? 1 : 0);

    const columns = new Map(); // key → column
    const column = (plug, portName, port, used) => {
      const k = (plug === 'input' ? 'in:' : 'out:') + portName;
      let c = columns.get(k);
      if (!c) {
        c = { key: k, plug, name: portName, used: false, types: new Set(), description: undefined };
        columns.set(k, c);
      }
      if (port) {
        c.types.add(typeof port.type === 'string' ? port.type : port.type?.name ?? '*');
        c.description = c.description ?? port.description ?? port.displayName;
      }
      if (used) c.used = true;
      return c;
    };

    const rows = order.map(({ n, depth }) => {
      const ports = this.portsOf(n);
      const cells = {};
      const has = new Set();
      for (const [p, port] of ports.inputs) { column('input', p, port, false); has.add('in:' + p); }
      for (const [p, port] of ports.outputs) { column('output', p, port, false); has.add('out:' + p); }
      for (const [p, v] of Object.entries(n.parameters ?? {})) {
        const port = ports.inputs.get(p);
        column('input', p, port, true);
        cells['in:' + p] = { text: formatValue(v, port), value: v, unknown: !port };
      }
      for (const c of wires) {
        if (c.toId === n.id) {
          const port = ports.inputs.get(c.toProperty);
          column('input', c.toProperty, port, true);
          const cell = (cells['in:' + c.toProperty] = cells['in:' + c.toProperty] ?? { unknown: !port });
          (cell.wires = cell.wires ?? []).push({ node: c.fromId, port: c.fromProperty, name: name(c.fromId), missing: !byId.has(c.fromId) });
        }
        if (c.fromId === n.id) {
          const port = ports.outputs.get(c.fromProperty);
          column('output', c.fromProperty, port, true);
          const cell = (cells['out:' + c.fromProperty] = cells['out:' + c.fromProperty] ?? { unknown: !port });
          (cell.wires = cell.wires ?? []).push({ node: c.toId, port: c.toProperty, name: name(c.toId), missing: !byId.has(c.toId) });
        }
      }
      const parent = n.parent !== undefined ? byId.get(n.parent) : undefined;
      const childIndex = parent?.children ? parent.children.indexOf(n.id) : -1;
      return {
        id: n.id,
        type: n.type,
        label: n.label ?? '',
        depth,
        parent: n.parent !== undefined ? `${n.parent}${childIndex >= 0 ? ' #' + (childIndex + 1) : ''}` : '',
        position: n.x !== undefined || n.y !== undefined ? `${n.x ?? ''}, ${n.y ?? ''}` : '',
        described: ports.described,
        ports: [...has],
        cells
      };
    });

    const cols = [...columns.values()]
      .filter((c) => allPorts || c.used)
      .sort((a, b) => (a.plug === b.plug ? 0 : a.plug === 'input' ? -1 : 1))
      .map((c) => ({ ...c, types: [...c.types] }));
    return {
      component: key,
      dirty: w.dirty,
      cloud: CLOUD.test('/' + key) || CLOUD.test(key),
      revision: w.revision,
      columns: cols,
      hiddenColumns: columns.size - cols.length,
      rows,
      types: this.vocabulary.knownTypes(this.componentKeys())
    };
  }

  /** The value a cell holds, as the editor shows it to be typed over (JSON pretty-printed). */
  cellText(component, id, column) {
    const { w } = this.working(component);
    const node = this.node(w, id);
    if (!column.startsWith('in:')) return '';
    const name = column.slice(3);
    return formatValue(node.parameters?.[name], this.inputPort(node, name), { pretty: true });
  }

  // ---------------------------------------------------------------- helpers

  node(w, id) {
    const n = w.files.nodes.nodes.find((x) => x.id === id);
    if (!n) throw new CellRefusal(`There is no node "${id}" in this component.`);
    return n;
  }

  touch(w, id) {
    w.touched.add(id);
    w.dirty = true;
  }

  setParent(w, node, text) {
    const m = /^\s*(.*?)\s*(?:#\s*(\d+))?\s*$/.exec(text);
    const parentId = m?.[1];
    if (!parentId) throw new CellRefusal('Type the parent\'s id, and "#2" after it to make this its second child.');
    const nodes = w.files.nodes.nodes;
    const parent = nodes.find((n) => n.id === parentId);
    if (!parent) throw new CellRefusal(`There is no node "${parentId}" to be the parent.`);
    if (parentId === node.id) throw new CellRefusal('A node cannot be its own parent.');
    for (let cur = parent; cur; cur = cur.parent !== undefined ? nodes.find((n) => n.id === cur.parent) : undefined) {
      if (cur.id === node.id) throw new CellRefusal(`"${parentId}" is inside "${node.id}": a node cannot go under its own child.`);
    }
    if (node.parent !== undefined) {
      const old = nodes.find((n) => n.id === node.parent);
      if (old?.children) {
        old.children = old.children.filter((c) => c !== node.id);
        if (old.children.length === 0) delete old.children;
      }
    }
    parent.children = parent.children ?? [];
    const at = m[2] !== undefined ? Math.max(0, Math.min(Number(m[2]) - 1, parent.children.length)) : parent.children.length;
    parent.children.splice(at, 0, node.id);
    node.parent = parentId;
    this.touch(w, node.id);
    return parentId;
  }
}

function num(v, what) {
  const n = typeof v === 'number' ? v : Number(v);
  if (!Number.isFinite(n)) throw new CellRefusal(`${what} is a number.`);
  return n;
}

/** The kit's schemas, on one component's three files. Sentences, empty when they pass. */
export function validateComponent(files) {
  const v = SchemaValidator.instance;
  const out = [];
  for (const [what, id, data] of [
    ['component.json', SCHEMA_IDS.COMPONENT, files.component],
    ['nodes.json', SCHEMA_IDS.NODES, files.nodes],
    ['connections.json', SCHEMA_IDS.CONNECTIONS, files.connections]
  ]) {
    const r = v.validate(id, data);
    if (!r.valid) for (const e of r.errors) out.push(`${what} ${e.path || '/'} ${e.message}`);
  }
  return out;
}

/** The run-on-value-change pins, on the nodes the person touched in this component only. */
// The migration needs every node (a control wire counts only when its source is in the component), so it is
// handed copies of all of them, and only the touched nodes take its answer.
function pinTouched(key, w) {
  const nodes = w.files.nodes.nodes;
  if (!nodes.some((n) => w.touched.has(n.id))) return;
  const shells = nodes.map((n) => ({ id: n.id, type: n.type, parameters: n.parameters ? { ...n.parameters } : undefined, ports: n.ports, dynamicports: n.dynamicports }));
  pinRunOnValueChangeDefaults({ components: [{ name: '/' + toPathForm(key), graph: { roots: shells, connections: w.files.connections.connections } }] });
  nodes.forEach((n, i) => {
    if (w.touched.has(n.id) && shells[i].parameters !== undefined && JSON.stringify(shells[i].parameters) !== JSON.stringify(n.parameters)) {
      n.parameters = shells[i].parameters;
    }
  });
}
