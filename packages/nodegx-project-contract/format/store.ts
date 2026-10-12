/**
 * P112 OWN-001 — reading and writing a v2 project with the MCP's rules, on any `ProjectFiles`.
 *
 * The rules are the MCP `ProjectStore`'s (packages/noodl-mcp/src/project/ProjectStore.ts), moved
 * here so a page, a script or another editor writes a project the way the official writers do:
 *
 * - **Refuse on drift.** Reading a component snapshots its three files' stamps. A write re-checks
 *   them first and refuses when any changed since (an open editor autosaving, a second agent, a
 *   second tab). A caller that passes the `revision` it read is refused when the content differs.
 * - **Write nothing that would not change** (P109 ISL-019): a component whose content equals what
 *   is stored, `modified` and `modifiedBy` aside, writes no file, the registry included.
 * - **Keep the registry true**: every write or delete updates the component's entry, its counts and
 *   the totals.
 *
 * What stays in the MCP, on top of this store (OWN-001 slice 2): the component-id clock
 * (`writeClock.ts`, passed in as `now`), the run-on-value-change pins for projects older than format 5
 * (run in `writeComponent`'s `prepare` hook), the project-level files (settings, tokens, cloud), the
 * normalized model for the semantic validator, and the tool errors (`FormatRefusal.code` is the
 * `ToolError` code; `reason` says which rule refused, so the MCP can say it in its own door's words).
 */
import type { ProjectFiles } from './files';
import { hash53 } from '../hash';
import type {
  ComponentV2File,
  ConnectionsV2File,
  NodesV2File,
  ProjectV2File,
  RegistryComponentEntry,
  RegistryV2File,
  RoutesV2File,
  StylesV2File
} from './types';

export const PROJECT_FILE = 'nodegx.project.json';
export const ROUTES_FILE = 'nodegx.routes.json';
export const STYLES_FILE = 'nodegx.styles.json';
export const COMPONENTS_DIR = 'components';
export const REGISTRY_FILE = `${COMPONENTS_DIR}/_registry.json`;
export const COMPONENT_FILE_NAMES = ['component.json', 'nodes.json', 'connections.json'] as const;

/** One component's three files, parsed. */
export interface ComponentFiles {
  component: ComponentV2File;
  nodes: NodesV2File;
  connections: ConnectionsV2File;
}

export interface StoredComponent {
  /** Registry key, path form: `Pages/Home`. */
  key: string;
  entry: RegistryComponentEntry;
  /** What instance nodes use as their `type`: `/Pages/Home`. */
  legacyName: string;
  files: ComponentFiles;
  revision: string;
}

export type FormatRefusalCode = 'conflict' | 'not-found' | 'already-exists' | 'not-a-v2-project' | 'io-error';

/**
 * Which rule refused. One per sentence a caller might want to say differently (the MCP names its
 * tools in its wording; a page names its buttons): `drift` a file changed since this store read it,
 * `stale-revision` the caller's `ifRevision` is not the files' revision, `exists` a create over a
 * registered component, `missing` an update of an unregistered one, `unregistered-files` a create
 * over files the registry does not list, `unknown-component` a read of a name the registry does not
 * have, `legacy-project` / `not-a-project` the constructor's two, `read-failed` a file that is not JSON,
 * `missing-registry` no `components/_registry.json`.
 */
export type FormatRefusalReason =
  | 'drift'
  | 'stale-revision'
  | 'exists'
  | 'missing'
  | 'unregistered-files'
  | 'unknown-component'
  | 'legacy-project'
  | 'not-a-project'
  | 'read-failed'
  | 'missing-registry';

/** A write or read the rules refuse. `code` is the MCP's `ToolError` code for the same refusal; `reason` the rule. */
export class FormatRefusal extends Error {
  readonly code: FormatRefusalCode;
  readonly reason: FormatRefusalReason;
  readonly details?: Record<string, unknown>;
  constructor(code: FormatRefusalCode, reason: FormatRefusalReason, message: string, details?: Record<string, unknown>) {
    super(message);
    this.name = 'FormatRefusal';
    this.code = code;
    this.reason = reason;
    this.details = details;
  }
}

/**
 * How a v2 file is written: two-space JSON. Both official writers (the editor's `ComponentSaver`
 * and the MCP) end the file there; the templates end it with a newline. Pass the text being
 * replaced and its final newline is kept, so rewriting a template's file changes only what changed.
 */
export function serializeV2File(value: unknown, previous?: string | null): string {
  const text = JSON.stringify(value, null, 2);
  return previous && previous.endsWith('\n') ? text + '\n' : text;
}

/** JSON with every object's keys sorted, so two documents that differ only in key order compare equal. */
function canonicalJson(value: unknown): string {
  return JSON.stringify(value, (_key, v: unknown) =>
    v && typeof v === 'object' && !Array.isArray(v)
      ? Object.fromEntries(Object.entries(v as Record<string, unknown>).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)))
      : v
  );
}

/**
 * P109 ISL-019 — whether a write would change anything but the stamp of who wrote it when.
 * `modified` and `modifiedBy` are left out of the comparison because every write sets them;
 * everything else, `created` and the id included, must be equal.
 */
export function sameComponentContent(a: ComponentFiles, b: ComponentFiles): boolean {
  const unstamped = (f: ComponentFiles) => {
    const { modified: _m, modifiedBy: _b, ...component } = f.component as ComponentV2File & {
      modified?: string;
      modifiedBy?: string;
    };
    return [component, f.nodes, f.connections];
  };
  return canonicalJson(unstamped(a)) === canonicalJson(unstamped(b));
}

/** The content revision a reader hands back with a write. Pure, the same in a page and in Node. */
export function componentRevision(files: ComponentFiles): string {
  return hash53(JSON.stringify([files.component, files.nodes, files.connections]));
}

/** Any accepted component identifier ("Pages/Home", "/Pages/Home", "/#Card") in path form. The MCP's `toPathForm`. */
export function toPathForm(input: string): string {
  let p = input.trim();
  if (p.startsWith('/')) p = p.slice(1);
  if (p.startsWith('#')) p = p.slice(1);
  return p;
}

/** Whether these files hold a v2 project: a registry or a project file. */
export function isV2Project(files: ProjectFiles): boolean {
  return files.read(REGISTRY_FILE) !== null || files.read(PROJECT_FILE) !== null;
}

export class V2ProjectStore {
  readonly files: ProjectFiles;
  private readonly now: () => string;
  private snapshots = new Map<string, Record<string, string | null>>();

  /** `now` stamps `created`, `modified` and `lastUpdated`; the MCP passes its write clock. */
  constructor(files: ProjectFiles, options: { now?: () => string } = {}) {
    this.files = files;
    this.now = options.now ?? (() => new Date().toISOString());
    if (!isV2Project(files)) {
      const legacy = files.read('project.json') !== null;
      throw new FormatRefusal(
        'not-a-v2-project',
        legacy ? 'legacy-project' : 'not-a-project',
        legacy
          ? 'These files hold a legacy monolithic project.json. Migrate it to the v2 format (NodeGX editor: project settings → migrate) first.'
          : 'These files are not a NodeGX v2 project (no nodegx.project.json or components/_registry.json).'
      );
    }
  }

  private readJson<T>(path: string): T | undefined {
    const text = this.files.read(path);
    if (text === null) return undefined;
    try {
      return JSON.parse(text) as T;
    } catch (err) {
      throw new FormatRefusal('io-error', 'read-failed', `Failed to read ${path}: ${(err as Error).message}`, { path });
    }
  }

  // ─── Project-level files ────────────────────────────────────────────────────

  readProjectFile(): ProjectV2File | undefined {
    return this.readJson<ProjectV2File>(PROJECT_FILE);
  }

  readRoutes(): RoutesV2File | undefined {
    return this.readJson<RoutesV2File>(ROUTES_FILE);
  }

  readStyles(): StylesV2File | undefined {
    return this.readJson<StylesV2File>(STYLES_FILE);
  }

  readRegistry(): RegistryV2File {
    const registry = this.readJson<RegistryV2File>(REGISTRY_FILE);
    if (!registry) throw new FormatRefusal('io-error', 'missing-registry', 'Missing components/_registry.json.');
    return registry;
  }

  // ─── Resolution ─────────────────────────────────────────────────────────────

  resolve(input: string): { key: string; entry: RegistryComponentEntry } | undefined {
    const registry = this.readRegistry();
    const p = toPathForm(input);
    if (registry.components[p]) return { key: p, entry: registry.components[p] };
    for (const [key, entry] of Object.entries(registry.components)) {
      if (entry.path === p || key === input || entry.path === input) return { key, entry };
    }
    return undefined;
  }

  private mustResolve(input: string): { key: string; entry: RegistryComponentEntry } {
    const hit = this.resolve(input);
    if (!hit) {
      const known = Object.keys(this.readRegistry().components).sort();
      throw new FormatRefusal('not-found', 'unknown-component', `No component "${input}" in this project.`, {
        knownComponents: known
      });
    }
    return hit;
  }

  private componentPaths(entryPath: string): string[] {
    return COMPONENT_FILE_NAMES.map((f) => `${COMPONENTS_DIR}/${entryPath}/${f}`);
  }

  // ─── Reads ──────────────────────────────────────────────────────────────────

  /** The three files, with the defaults the MCP gives a file that is missing. */
  private readComponentFiles(entryPath: string, key: string): ComponentFiles {
    const [c, n, cn] = this.componentPaths(entryPath);
    const component =
      this.readJson<ComponentV2File>(c) ?? ({ id: key, name: key.split('/').pop() ?? key, type: 'visual' } as ComponentV2File);
    const nodes = this.readJson<NodesV2File>(n) ?? ({ componentId: component.id, nodes: [] } as NodesV2File);
    const connections =
      this.readJson<ConnectionsV2File>(cn) ?? ({ componentId: component.id, connections: [] } as ConnectionsV2File);
    return { component, nodes, connections };
  }

  /** The three files as stored, or `undefined` when any is missing (a write must create it). */
  private readFilesIfPresent(entryPath: string): ComponentFiles | undefined {
    const [component, nodes, connections] = this.componentPaths(entryPath).map((p) => this.readJson<unknown>(p));
    if (component === undefined || nodes === undefined || connections === undefined) return undefined;
    return { component, nodes, connections } as ComponentFiles;
  }

  private takeSnapshot(key: string, entryPath: string, files: ComponentFiles): string {
    const stamps: Record<string, string | null> = {};
    for (const p of this.componentPaths(entryPath)) stamps[p] = this.files.stamp(p);
    this.snapshots.set(key, stamps);
    return componentRevision(files);
  }

  readComponent(input: string): StoredComponent {
    const { key, entry } = this.mustResolve(input);
    const files = this.readComponentFiles(entry.path, key);
    const revision = this.takeSnapshot(key, entry.path, files);
    return { key, entry, legacyName: files.component.path ?? '/' + key, files, revision };
  }

  /**
   * A registered component's three files with no snapshot taken: for a walk over the registry
   * (usages, a validation model, a listing) that is not a read-before-write. A missing file gets the
   * same default `readComponent` gives it.
   */
  filesOf(key: string, entry: RegistryComponentEntry): ComponentFiles {
    return this.readComponentFiles(entry.path, key);
  }

  /** The three files exactly as stored, or `undefined` when any is missing. No snapshot, no defaults. */
  storedFiles(entry: RegistryComponentEntry): ComponentFiles | undefined {
    return this.readFilesIfPresent(entry.path);
  }

  /** Every component's registry key, in registry order. */
  componentKeys(): string[] {
    return Object.keys(this.readRegistry().components);
  }

  // ─── Writes ─────────────────────────────────────────────────────────────────

  private assertNoDrift(key: string, entryPath: string, ifRevision?: string): void {
    const snapshot = this.snapshots.get(key);
    if (snapshot) {
      for (const [p, stamp] of Object.entries(snapshot)) {
        if (this.files.stamp(p) !== stamp) {
          throw new FormatRefusal(
            'conflict',
            'drift',
            `${p} changed since this store last read it (open editor? another process?). Re-read the component and retry.`,
            { component: key, path: p }
          );
        }
      }
    }
    if (ifRevision !== undefined) {
      const current = componentRevision(this.readComponentFiles(entryPath, key));
      if (current !== ifRevision) {
        throw new FormatRefusal(
          'conflict',
          'stale-revision',
          `Revision mismatch for "${key}": expected ${ifRevision}, the files have ${current}. Re-read the component and retry with the fresh revision.`,
          { component: key, expected: ifRevision, actual: current }
        );
      }
    }
  }

  private writeJson(path: string, value: unknown): void {
    this.files.write(path, serializeV2File(value, this.files.read(path)));
  }

  /**
   * Writes a component (create or update) and keeps the registry true. Validation is the caller's,
   * before this: a refused write leaves every file as it was.
   *
   * `prepare` runs once the write is admitted (the component exists or not as `expectNew` says, no
   * drift, no stale revision) and before the unchanged check, with the files as stored (`undefined`
   * for a create). A rule a caller keeps on top of the format, such as the MCP's run-on-value-change
   * pins, edits `files` there, so a rewrite it pins is still a no-op and a refused write never runs it.
   */
  writeComponent(
    key: string,
    files: ComponentFiles,
    options: { expectNew?: boolean; ifRevision?: string; prepare?: (stored: ComponentFiles | undefined) => void } = {}
  ): { revision: string; unchanged?: true } {
    const registry = this.readRegistry();
    const existing = registry.components[key];

    if (options.expectNew && existing) {
      throw new FormatRefusal('already-exists', 'exists', `Component "${key}" already exists. Update it instead.`, {
        component: key
      });
    }
    if (!options.expectNew && !existing) {
      throw new FormatRefusal('not-found', 'missing', `Component "${key}" does not exist. Create it instead.`, {
        component: key
      });
    }

    const entryPath = existing?.path ?? key;
    const paths = this.componentPaths(entryPath);

    if (existing) {
      this.assertNoDrift(key, entryPath, options.ifRevision);
      const stored = this.readFilesIfPresent(entryPath);
      options.prepare?.(stored);
      if (stored && sameComponentContent(stored, files)) {
        return { revision: this.takeSnapshot(key, entryPath, stored), unchanged: true };
      }
    } else if (paths.some((p) => this.files.read(p) !== null)) {
      throw new FormatRefusal(
        'conflict',
        'unregistered-files',
        `components/${entryPath} already holds component files but is not in the registry. Refusing to overwrite.`,
        { component: key, path: `${COMPONENTS_DIR}/${entryPath}` }
      );
    } else {
      options.prepare?.(undefined);
    }

    this.writeJson(paths[0], files.component);
    this.writeJson(paths[1], files.nodes);
    this.writeJson(paths[2], files.connections);

    const now = this.now();
    registry.components[key] = {
      path: entryPath,
      type: files.component.type,
      nodeCount: files.nodes.nodes.length,
      connectionCount: files.connections.connections.length,
      modified: now,
      ...(existing?.created ? { created: existing.created } : { created: now }),
      ...(existing?.route ? { route: existing.route } : {})
    };
    this.writeRegistry(registry, now);

    return { revision: this.takeSnapshot(key, entryPath, files) };
  }

  /** Removes a component's three files and its registry entry. Refused on drift, like a write. */
  deleteComponent(input: string): { removed: string[] } {
    const { key, entry } = this.mustResolve(input);
    this.assertNoDrift(key, entry.path);
    const removed: string[] = [];
    for (const p of this.componentPaths(entry.path)) {
      if (this.files.read(p) !== null) {
        this.files.remove(p);
        removed.push(p);
      }
    }
    const registry = this.readRegistry();
    delete registry.components[key];
    this.writeRegistry(registry, this.now());
    this.snapshots.delete(key);
    return { removed };
  }

  private writeRegistry(registry: RegistryV2File, now: string): void {
    let totalNodes = 0;
    let totalConnections = 0;
    const entries = Object.values(registry.components);
    for (const e of entries) {
      totalNodes += e.nodeCount ?? 0;
      totalConnections += e.connectionCount ?? 0;
    }
    registry.lastUpdated = now;
    registry.stats = { totalComponents: entries.length, totalNodes, totalConnections };
    this.writeJson(REGISTRY_FILE, registry);
  }
}
