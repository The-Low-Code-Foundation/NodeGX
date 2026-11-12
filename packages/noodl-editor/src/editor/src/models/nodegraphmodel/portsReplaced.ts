/**
 * P107-S79-SILENTCACHE — what a viewer's port list took away from the one the project was saved with.
 *
 * A node's `dynamicports` are the ports a viewer last announced, saved in the project file. On open, with no viewer
 * yet, that cached list IS the node's ports: the canvas draws wires to it and the validator reads it as real. When the
 * first viewer connects, `NodeGraphNode.setDynamicPorts` replaces the whole list, and it did so with no diff, so a port
 * the new list no longer has was found only by the connection health check ("Target port doesn't exist"), with nothing
 * saying why, and a wired port whose type changed was found by nothing at all.
 *
 * This is the short-of-NSP-020 fix the row names: the replacement of the FILE's list is diffed, logged, and a wire
 * left on a port that went (or now carries another type) is a warning on the node that says so. Pure, so it is graded
 * in `tests-unit/p107-s79-silentcache.test.ts`; `NodeGraphNode` only calls it. Later replacements (a person editing a
 * Function's script, a schema refresh) are not diffed: the person caused those and the wire's own error already shows.
 */

export interface PortLike {
  name: string;
  type?: unknown;
}

export interface PortsReplaced {
  /** Names in the saved list that the viewer's list does not have (renames excluded). */
  dropped: string[];
  /** Names in both lists whose type changed, with the type names before and after. */
  retyped: { name: string; before: string; after: string }[];
}

/** A port type is a bare string or `{ name }`; compared by its name. */
export function portTypeName(type: unknown): string {
  if (typeof type === 'string') return type;
  if (type && typeof type === 'object' && typeof (type as { name?: unknown }).name === 'string') {
    return (type as { name: string }).name;
  }
  return '*';
}

export function diffReplacedPorts(
  before: readonly PortLike[] | undefined,
  after: readonly PortLike[] | undefined,
  renamedAway: readonly string[] = []
): PortsReplaced {
  const next = new Map<string, PortLike>();
  for (const p of after ?? []) if (p && typeof p.name === 'string') next.set(p.name, p);
  const renamed = new Set(renamedAway);

  const dropped: string[] = [];
  const retyped: PortsReplaced['retyped'] = [];
  const seen = new Set<string>();
  for (const p of before ?? []) {
    if (!p || typeof p.name !== 'string' || seen.has(p.name)) continue;
    seen.add(p.name);
    const now = next.get(p.name);
    if (!now) {
      if (!renamed.has(p.name)) dropped.push(p.name);
      continue;
    }
    const was = portTypeName(p.type);
    const is = portTypeName(now.type);
    if (was !== is) retyped.push({ name: p.name, before: was, after: is });
  }
  return { dropped, retyped };
}

export interface PortsNow {
  /** Is a wire on this node attached to the port of this name? */
  isWired(name: string): boolean;
  /** The port's type name as the node has it now, or `undefined` when it has no such port. */
  typeNow(name: string): string | undefined;
}

/**
 * The warning a replacement still owes, read against the node as it is NOW, so it clears itself: once the wire is
 * deleted, or the port comes back (or back to its saved type), there is nothing left to say.
 */
export function portsReplacedWarning(replaced: PortsReplaced | undefined, now: PortsNow): string | undefined {
  if (!replaced) return undefined;
  const gone = replaced.dropped.filter((name) => now.isWired(name) && now.typeNow(name) === undefined);
  const changed = replaced.retyped.filter((r) => now.isWired(r.name) && now.typeNow(r.name) === r.after);
  if (gone.length === 0 && changed.length === 0) return undefined;

  const parts: string[] = [];
  if (gone.length > 0) {
    parts.push(`${gone.length === 1 ? 'This port is' : 'These ports are'} gone but still wired: ${gone.join(', ')}.`);
  }
  for (const r of changed) parts.push(`${r.name} is wired, and now carries ${r.after} instead of ${r.before}.`);
  return `The preview replaced the ports this node was saved with. ${parts.join(' ')}`;
}
