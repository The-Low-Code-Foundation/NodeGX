/**
 * P112 OWN-006 — what "the same files" means when two editors saved them.
 *
 * Ids are matched (an editor may mint its own: `idMap` maps the candidate's ids to the reference's);
 * layout is free (`x`/`y` are ignored unless the edit script moved that node); the stamps every write
 * sets (`modified`, `modifiedBy`, `created`, `lastUpdated`) are ignored; everything else must be equal:
 * every node and every field on it, every wire, the children order, the visual roots, the component's
 * ports and info, the registry's entries and counts, the project-level files, and any other file
 * byte for byte. A file the candidate wrote that the reference did not, or did not write that the
 * reference did, is a difference too.
 *
 * Each difference is one sentence naming the file, the node and the field, so an agent can act on it.
 */
import type {
  ComponentV2File,
  ConnectionV2,
  ConnectionsV2File,
  NodeV2,
  NodesV2File,
  RegistryV2File
} from '../format/types';

export interface Difference {
  file: string;
  node?: string;
  field: string;
  reference: unknown;
  candidate: unknown;
  sentence: string;
}

export interface CompareOptions {
  /** candidate id → reference id, for nodes the editor minted its own ids for. */
  idMap?: Record<string, string>;
  /** Reference node ids whose `x`/`y` the edit script set: compared on those, ignored elsewhere. */
  movedIds?: Set<string>;
  /** Files ignored entirely (an editor's own sidecar, say). Project-relative paths. */
  ignoreFiles?: Set<string>;
}

const STAMPS = new Set(['modified', 'modifiedBy', 'created', 'lastUpdated']);

function canonical(value: unknown): string {
  return JSON.stringify(value, (_k, v: unknown) =>
    v && typeof v === 'object' && !Array.isArray(v)
      ? Object.fromEntries(
          Object.entries(v as Record<string, unknown>).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
        )
      : v
  );
}

function show(value: unknown): string {
  if (value === undefined) return 'nothing';
  const text = JSON.stringify(value);
  return text.length > 80 ? text.slice(0, 77) + '…' : text;
}

function parse(text: string, file: string, out: Difference[]): unknown {
  try {
    return JSON.parse(text);
  } catch (err) {
    out.push({
      file,
      field: '(file)',
      reference: 'JSON',
      candidate: text.slice(0, 40),
      sentence: `${file} is not JSON: ${(err as Error).message}`
    });
    return undefined;
  }
}

/** The candidate's nodes with every id rewritten to the reference's. */
function remapNodes(nodes: NodesV2File, idMap: Record<string, string>): NodesV2File {
  const m = (id: string) => idMap[id] ?? id;
  return {
    ...nodes,
    nodes: nodes.nodes.map((n) => ({
      ...n,
      id: m(n.id),
      ...(n.parent !== undefined ? { parent: m(n.parent) } : {}),
      ...(n.children ? { children: n.children.map(m) } : {})
    })),
    ...(nodes.visualRoots ? { visualRoots: nodes.visualRoots.map(m) } : {})
  };
}

function remapWires(c: ConnectionsV2File, idMap: Record<string, string>): ConnectionsV2File {
  const m = (id: string) => idMap[id] ?? id;
  return { ...c, connections: c.connections.map((w) => ({ ...w, fromId: m(w.fromId), toId: m(w.toId) })) };
}

function compareObjects(
  file: string,
  ref: Record<string, unknown>,
  cand: Record<string, unknown>,
  out: Difference[],
  options: { node?: string; skip?: (field: string) => boolean; prefix?: string } = {}
): void {
  const keys = new Set([...Object.keys(ref), ...Object.keys(cand)]);
  for (const key of keys) {
    if (STAMPS.has(key) || options.skip?.(key)) continue;
    const a = ref[key];
    const b = cand[key];
    if (canonical(a) === canonical(b)) continue;
    const field = options.prefix ? `${options.prefix}.${key}` : key;
    // Two bags (parameters, metadata, ports' bags): name the field inside, not the bag.
    if (a && b && typeof a === 'object' && typeof b === 'object' && !Array.isArray(a) && !Array.isArray(b)) {
      compareObjects(file, a as Record<string, unknown>, b as Record<string, unknown>, out, {
        node: options.node,
        prefix: field
      });
      continue;
    }
    const where = options.node ? `node "${options.node}" in ${file}` : file;
    out.push({
      file,
      node: options.node,
      field,
      reference: a,
      candidate: b,
      sentence:
        b === undefined
          ? `${where}: "${field}" is missing; the official editor saves ${show(a)}.`
          : a === undefined
          ? `${where}: "${field}" is ${show(b)}; the official editor does not save it.`
          : `${where}: "${field}" is ${show(b)}; the official editor saves ${show(a)}.`
    });
  }
}

function wireKey(w: ConnectionV2): string {
  return `${w.fromId}.${w.fromProperty} → ${w.toId}.${w.toProperty}`;
}

function compareNodesFile(
  file: string,
  ref: NodesV2File,
  cand: NodesV2File,
  moved: Set<string>,
  out: Difference[]
): void {
  const refById = new Map(ref.nodes.map((n) => [n.id, n]));
  const candById = new Map(cand.nodes.map((n) => [n.id, n]));
  for (const [id, r] of refById) {
    const c = candById.get(id);
    if (!c) {
      out.push({
        file,
        node: id,
        field: '(node)',
        reference: r.type,
        candidate: undefined,
        sentence: `${file}: node "${id}" (${r.type}) is missing.`
      });
      continue;
    }
    compareObjects(file, r as unknown as Record<string, unknown>, c as unknown as Record<string, unknown>, out, {
      node: id,
      skip: (f) => (f === 'x' || f === 'y') && !moved.has(id)
    });
  }
  for (const [id, c] of candById) {
    if (!refById.has(id)) {
      out.push({
        file,
        node: id,
        field: '(node)',
        reference: undefined,
        candidate: c.type,
        sentence: `${file}: node "${id}" (${c.type}) is there; the official editor would not have saved it.`
      });
    }
  }
  compareObjects(file, ref as unknown as Record<string, unknown>, cand as unknown as Record<string, unknown>, out, {
    skip: (f) => f === 'nodes'
  });
}

function compareWiresFile(file: string, ref: ConnectionsV2File, cand: ConnectionsV2File, out: Difference[]): void {
  const refWires = new Map(ref.connections.map((w) => [wireKey(w), w]));
  const candWires = new Map(cand.connections.map((w) => [wireKey(w), w]));
  const explained = new Set<string>();
  for (const [k, w] of refWires) {
    const c = candWires.get(k);
    if (!c) {
      // Say which end is wrong when the candidate has a wire from the same source to the same node (one sentence, not two).
      const near = cand.connections.find(
        (x) =>
          x.fromId === w.fromId && x.fromProperty === w.fromProperty && x.toId === w.toId && !refWires.has(wireKey(x))
      );
      if (near) explained.add(wireKey(near));
      out.push({
        file,
        field: 'connections',
        reference: w,
        candidate: near,
        sentence: near
          ? `${file}: the wire ${k} arrives at "${
              near.toProperty === undefined ? 'nothing' : near.toProperty
            }" instead of "${w.toProperty}" (toProperty).`
          : `${file}: the wire ${k} is missing.`
      });
      continue;
    }
    compareObjects(file, w as unknown as Record<string, unknown>, c as unknown as Record<string, unknown>, out, {
      prefix: `wire ${k}`
    });
  }
  for (const [k, w] of candWires) {
    if (!refWires.has(k) && !explained.has(k)) {
      out.push({
        file,
        field: 'connections',
        reference: undefined,
        candidate: w,
        sentence: `${file}: the wire ${k} is there; the official editor would not have saved it.`
      });
    }
  }
  compareObjects(file, ref as unknown as Record<string, unknown>, cand as unknown as Record<string, unknown>, out, {
    skip: (f) => f === 'connections'
  });
}

function compareRegistry(file: string, ref: RegistryV2File, cand: RegistryV2File, out: Difference[]): void {
  const keys = new Set([...Object.keys(ref.components), ...Object.keys(cand.components)]);
  for (const key of keys) {
    const r = ref.components[key];
    const c = cand.components[key];
    if (!r || !c) {
      out.push({
        file,
        field: `components.${key}`,
        reference: r,
        candidate: c,
        sentence: r
          ? `${file}: component "${key}" is not registered.`
          : `${file}: component "${key}" is registered; the official editor would not have it.`
      });
      continue;
    }
    compareObjects(file, r as unknown as Record<string, unknown>, c as unknown as Record<string, unknown>, out, {
      prefix: `components.${key}`
    });
  }
  compareObjects(file, ref as unknown as Record<string, unknown>, cand as unknown as Record<string, unknown>, out, {
    skip: (f) => f === 'components'
  });
}

/**
 * Every difference between what the reference saved and what the candidate saved, as sentences.
 * Both are project-relative path → text.
 */
export function compareSaves(
  reference: Record<string, string>,
  candidate: Record<string, string>,
  options: CompareOptions = {}
): Difference[] {
  const out: Difference[] = [];
  const idMap = options.idMap ?? {};
  const moved = options.movedIds ?? new Set<string>();
  const ignore = options.ignoreFiles ?? new Set<string>();
  const files = new Set([...Object.keys(reference), ...Object.keys(candidate)]);

  for (const file of [...files].sort()) {
    if (ignore.has(file)) continue;
    const r = reference[file];
    const c = candidate[file];
    if (r === undefined) {
      out.push({
        file,
        field: '(file)',
        reference: undefined,
        candidate: '(present)',
        sentence: `${file} was written; the official editor would not write it.`
      });
      continue;
    }
    if (c === undefined) {
      out.push({
        file,
        field: '(file)',
        reference: '(present)',
        candidate: undefined,
        sentence: `${file} is missing; the official editor writes it.`
      });
      continue;
    }
    if (r === c) continue;
    if (!file.endsWith('.json')) {
      out.push({
        file,
        field: '(file)',
        reference: r.length,
        candidate: c.length,
        sentence: `${file} differs from what the official editor writes (not JSON: compared byte for byte).`
      });
      continue;
    }
    const rj = parse(r, file, out);
    const cj = parse(c, file, out);
    if (rj === undefined || cj === undefined) continue;

    if (file.endsWith('/nodes.json')) {
      compareNodesFile(file, rj as NodesV2File, remapNodes(cj as NodesV2File, idMap), moved, out);
    } else if (file.endsWith('/connections.json')) {
      compareWiresFile(file, rj as ConnectionsV2File, remapWires(cj as ConnectionsV2File, idMap), out);
    } else if (file.endsWith('/_registry.json')) {
      compareRegistry(file, rj as RegistryV2File, cj as RegistryV2File, out);
    } else if (file.endsWith('/component.json')) {
      compareObjects(file, rj as unknown as Record<string, unknown>, cj as unknown as Record<string, unknown>, out);
    } else if (
      rj &&
      typeof rj === 'object' &&
      !Array.isArray(rj) &&
      cj &&
      typeof cj === 'object' &&
      !Array.isArray(cj)
    ) {
      compareObjects(file, rj as Record<string, unknown>, cj as Record<string, unknown>, out);
    } else if (canonical(rj) !== canonical(cj)) {
      out.push({
        file,
        field: '(file)',
        reference: rj,
        candidate: cj,
        sentence: `${file} differs from what the official editor writes.`
      });
    }
  }
  return out;
}

export type { ComponentV2File, NodeV2 };
