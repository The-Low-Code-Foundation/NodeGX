/**
 * File-based access to a v2 project directory.
 *
 * Concurrency model (see docs/DESIGN.md): optimistic. Every read snapshots
 * file stats and computes a content `revision`; writes re-check both before
 * touching disk and refuse on drift (an open editor autosaving, git checkout,
 * a second agent). All writes are temp-file + atomic rename; validation
 * happens before any file is created, so a rejected write leaves no trace.
 *
 * P112 OWN-001 slice 2 — those rules are the format's now. The component reads
 * and writes below delegate to `@nodegx/project-contract/format`'s
 * `V2ProjectStore` over `diskFiles`, so a page, a script or another editor
 * writes a project with exactly this server's rules. What this class keeps on
 * top: the write clock (component ids, `created`/`modified`), the
 * run-on-value-change pins for projects older than format 5, the
 * project-level files (settings, tokens, cloud), the normalized model for the
 * semantic validator, and the `ToolError`s the tools answer with, in this
 * door's words (a refusal names `get_component` / `update_component`).
 */

import * as fs from 'fs';
import * as path from 'path';

import {
  FormatRefusal,
  V2ProjectStore,
  componentRevision,
  sameComponentContent,
  type RegistryComponentEntry,
  type StoredComponent
} from '@nodegx/project-contract/format';
import { diskFiles } from '@nodegx/project-contract/format-node';

import type { ComponentV2File, NormProject, ProjectV2File, RegistryV2File, RoutesV2File, StylesV2File } from '../editor-deps';
import { buildComponentRefs, isComponentRef, normalizeV2Component, refToPath } from '../editor-deps';
import { ToolError } from '../errors';
import type { ComponentFiles } from '../graph';
import { toPathForm } from '../paths';
import { WriteClock, type ReproducibleOutput } from './writeClock';
import { pinAuthoredRunOnChange, projectWillBeCleanedUp, type TickedBox } from './runOnChangePins';

export type { StoredComponent };
/** The format's `sameComponentContent`, the one no-change rule (P109 ISL-019). */
export { sameComponentContent };
/** The format's revision (cyrb53, 14 hex characters, the same in a page); the SHA-1 it replaced was this server's alone. */
export const computeRevision = componentRevision;

export interface ComponentListRow {
  path: string;
  legacyName: string;
  type: string;
  nodeCount: number;
  connectionCount: number;
  description?: string;
}

/** P125 CCN-002 — a component as this server last read or wrote it. */
export interface SeenComponent {
  files: ComponentFiles;
  revision: string;
  at: string;
}

/** P125 CCN-002 — a component whose files differ from what this server last saw. */
export interface SeenChange {
  key: string;
  before: SeenComponent;
  now: ComponentFiles;
  revision: string;
}

export interface Usage {
  component: string; // path form
  legacyName: string;
  nodeId: string;
}

function readJson<T>(file: string): T {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8')) as T;
  } catch (err) {
    throw new ToolError('io-error', `Failed to read ${file}: ${(err as Error).message}`);
  }
}

function writeJsonAtomic(file: string, data: unknown): void {
  const tmp = `${file}.tmp-${process.pid}-${Math.random().toString(36).slice(2, 8)}`;
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf8');
  fs.renameSync(tmp, file);
}

/** JSON with every object's keys sorted, so two documents that differ only in key order compare equal. */
function canonicalJson(value: unknown): string {
  return JSON.stringify(value, (_key, v: unknown) =>
    v && typeof v === 'object' && !Array.isArray(v)
      ? Object.fromEntries(Object.entries(v as Record<string, unknown>).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)))
      : v
  );
}

export class ProjectStore {
  readonly projectDir: string;
  /** P109 ISL-019 — the one source of time and component ids for every write below and in the tools. */
  readonly clock: WriteClock;
  /** The format's store, over this folder. Every component read and write goes through it. */
  readonly format: V2ProjectStore;
  /**
   * P125 CCN-002 — each component as this server last read or wrote it, for `what_changed_since`: the
   * format's snapshots say THAT a file changed (stamps), this says WHAT (the files, copied at the read).
   */
  private readonly seen = new Map<string, SeenComponent>();
  /** P125 CCN-002 — the registry's keys when this store opened, so a component added since can be named. */
  private readonly keysAtOpen: ReadonlySet<string> | undefined;

  /**
   * ⚠️ **The two refusal messages below are mirrored in the editor**, in
   * `packages/noodl-editor/src/main/src/mcp/mcpFrontDoor.js` (MCP-001). That is what lets the
   * "Connect an AI agent" settings section withhold the copy button for exactly the projects this
   * constructor would reject, saying the same thing — rather than emitting a command that dies at
   * spawn time. The editor cannot import this module (`@nodegx/mcp` is not one of its
   * dependencies), so if you change the wording here, change it there too.
   */
  constructor(projectDir: string, options: { reproducible?: ReproducibleOutput } = {}) {
    this.projectDir = path.resolve(projectDir);
    this.clock = new WriteClock(options.reproducible);
    if (!fs.existsSync(this.projectDir) || !fs.statSync(this.projectDir).isDirectory()) {
      throw new ToolError('not-found', `Project directory does not exist: ${this.projectDir}`);
    }
    try {
      this.format = new V2ProjectStore(diskFiles(this.projectDir), { now: () => this.clock.now() });
    } catch (err) {
      if (!(err instanceof FormatRefusal)) throw err;
      throw new ToolError(
        'not-a-v2-project',
        err.reason === 'legacy-project'
          ? `${this.projectDir} holds a legacy monolithic project.json. Migrate it to the v2 format ` +
            `(NodeGX editor: project settings → migrate) before using the MCP server.`
          : `${this.projectDir} is not a NodeGX v2 project (no nodegx.project.json or components/_registry.json).`
      );
    }
    try {
      this.keysAtOpen = new Set(this.format.componentKeys());
    } catch {
      this.keysAtOpen = undefined;
    }
  }

  /**
   * The format's refusal as this door's `ToolError`: the same code, the same details, and the
   * wording this server has always used — the tool to call next is named, and a path is said
   * relative to the project. Anything else is thrown as it came.
   */
  private refused(err: unknown, key?: string): never {
    if (!(err instanceof FormatRefusal)) throw err;
    const component = (err.details?.component as string | undefined) ?? key;
    switch (err.reason) {
      case 'drift':
        throw new ToolError(
          'conflict',
          `${err.details?.path as string} changed on disk since this server last read it ` +
            `(open editor? another process?). Re-read the component (get_component) and retry.`,
          { component }
        );
      case 'stale-revision':
        throw new ToolError(
          'conflict',
          `Revision mismatch for "${component}": expected ${err.details?.expected as string}, disk has ` +
            `${err.details?.actual as string}. Re-read the component (get_component) and retry with the fresh revision.`,
          err.details
        );
      case 'exists':
        throw new ToolError('already-exists', `Component "${component}" already exists. Use update_component instead.`);
      case 'missing':
        throw new ToolError('not-found', `Component "${component}" does not exist. Use create_component instead.`);
      case 'unregistered-files':
        throw new ToolError(
          'conflict',
          `Directory ${err.details?.path as string} already holds component files but is not in the registry. Refusing to overwrite.`
        );
      case 'missing-registry':
        throw new ToolError('io-error', `Missing components/_registry.json in ${this.projectDir}.`);
      default:
        throw new ToolError(err.code, err.message, err.details);
    }
  }

  private viaFormat<T>(run: () => T, key?: string): T {
    try {
      return run();
    } catch (err) {
      return this.refused(err, key);
    }
  }

  // ─── Project-level files ────────────────────────────────────────────────────

  readProjectFile(): ProjectV2File | undefined {
    return this.viaFormat(() => this.format.readProjectFile());
  }

  private get projectFilePath(): string {
    return path.join(this.projectDir, 'nodegx.project.json');
  }

  /** P109 ISL-019 — the stamp for a `created`/`modified` written now (the epoch when reproducible). */
  now(): string {
    return this.clock.now();
  }

  /**
   * P109 ISL-019 "Keep the same id" — the id a component at `legacyName` has in this project, derived
   * from the project's own `id` (its name, then its folder, when it has none) and the path. A
   * component rebuilt or recreated in the same place keeps it.
   */
  componentIdFor(legacyName: string): string {
    const project = this.readProjectFile() as (ProjectV2File & { id?: string }) | undefined;
    const namespace = project?.id || project?.name || path.basename(this.projectDir);
    return this.clock.componentId(namespace, legacyName);
  }

  /**
   * AIX-006: the project's design-token metadata (`{ getMetaData }` shim for the
   * editor's ProjectTokenCss helpers). Tokens live under
   * `nodegx.project.json → metadata.designTokens`; the importer restores that
   * block into `ProjectModel` metadata, so what the editor reads back is exactly
   * what is written here.
   */
  designTokenMetaSource(): { getMetaData(key: string): unknown } {
    const project = this.readProjectFile() as (ProjectV2File & { metadata?: Record<string, unknown> }) | undefined;
    const metadata = project?.metadata ?? {};
    return { getMetaData: (key: string) => metadata[key] };
  }

  /**
   * Persist the design-token override block under
   * `nodegx.project.json → metadata.designTokens`. Atomic; creates the project
   * file's metadata bag if absent. Passing `null` clears the overrides.
   */
  writeDesignTokens(key: string, data: unknown): void {
    const p = this.projectFilePath;
    if (!fs.existsSync(p)) {
      throw new ToolError('not-found', `Missing nodegx.project.json in ${this.projectDir}; cannot store tokens.`);
    }
    const project = readJson<ProjectV2File & { metadata?: Record<string, unknown> }>(p);
    const metadata = { ...(project.metadata ?? {}) };
    if (data === null || data === undefined) {
      delete metadata[key];
    } else {
      metadata[key] = data;
    }
    writeJsonAtomic(p, { ...project, metadata });
  }

  /**
   * AAQ-005 — write project settings, **never overwriting one already set**.
   *
   * Returns the names actually written. The non-overwriting rule is the editor's
   * (`planStaging.applySettings`) and carries its reasoning: a plan states what a
   * *new* app needs, not what an existing one should have chosen. `bodyScroll`
   * defaults to unset-and-falsy, so "the project has not decided" and "the
   * project chose `app`" are the same state on disk — which means the only safe
   * reading of an absent value is that nobody chose, and the only safe treatment
   * of a present one is to leave it alone.
   */
  writeProjectSettings(settings: Record<string, unknown>): string[] {
    const { project, settings: current, written } = this.projectSettingsAfterWrite(settings);
    if (written.length === 0) return [];
    writeJsonAtomic(this.projectFilePath, { ...project, settings: current, modified: this.now() });
    return written;
  }

  /**
   * P109 ISL-016 — an explicit request to change the project file, which **does** overwrite: ruled
   * 2026-10-04, "Replace, say what changed". The plan door's non-overwriting rule above stays as it
   * is (a plan states what a *new* app needs); this is the door a caller uses when it means a value.
   *
   * Returns one row per field that changed, `was` → `now`. A request that changes nothing writes
   * nothing — not even `modified` (ISL-019: a no-change write leaves the bytes alone). The caller
   * validates; this only writes. `rootNodeId` is appended where the editor's save and `pinRootNode`
   * put it, after the keys already there.
   */
  writeProjectFields(fields: {
    name?: string;
    settings?: Record<string, unknown>;
    rootNodeId?: string;
  }): Array<{ field: string; was: unknown; now: unknown }> {
    const p = this.projectFilePath;
    if (!fs.existsSync(p)) {
      throw new ToolError('not-found', `Missing nodegx.project.json in ${this.projectDir}; cannot store settings.`);
    }
    const project = readJson<ProjectV2File & { rootNodeId?: string }>(p);
    const changes: Array<{ field: string; was: unknown; now: unknown }> = [];
    const next: Record<string, unknown> = { ...project };
    if (fields.name !== undefined && fields.name !== project.name) {
      changes.push({ field: 'name', was: project.name, now: fields.name });
      next.name = fields.name;
    }
    const settings: Record<string, unknown> = { ...(project.settings ?? {}) };
    for (const [key, value] of Object.entries(fields.settings ?? {})) {
      if (value === undefined || canonicalJson(settings[key]) === canonicalJson(value)) continue;
      changes.push({ field: `settings.${key}`, was: settings[key], now: value });
      settings[key] = value;
    }
    if (changes.some((c) => c.field.startsWith('settings.'))) next.settings = settings;
    if (fields.rootNodeId !== undefined && fields.rootNodeId !== project.rootNodeId) {
      changes.push({ field: 'rootNodeId', was: project.rootNodeId, now: fields.rootNodeId });
      next.rootNodeId = fields.rootNodeId;
    }
    if (changes.length === 0) return [];
    // Every key keeps its place (key order is bytes). A NEW `rootNodeId` goes last, after
    // `modified`, where `pinRootNode` has always put it.
    if (project.rootNodeId === undefined && next.rootNodeId !== undefined) {
      const { rootNodeId, ...rest } = next;
      writeJsonAtomic(p, { ...rest, modified: this.now(), rootNodeId });
    } else {
      writeJsonAtomic(p, { ...next, modified: this.now() });
    }
    return changes;
  }

  /**
   * GAM-021 — what {@link writeProjectSettings} would leave, without writing it.
   *
   * The write calls this, and so does the plan door's `page-cannot-scroll` check,
   * so the value a warning is judged against is the value the apply writes.
   */
  projectSettingsAfterWrite(settings: Record<string, unknown>): {
    project: ProjectV2File;
    settings: Record<string, unknown>;
    written: string[];
  } {
    const p = this.projectFilePath;
    if (!fs.existsSync(p)) {
      throw new ToolError('not-found', `Missing nodegx.project.json in ${this.projectDir}; cannot store settings.`);
    }
    const project = readJson<ProjectV2File>(p);
    const current: Record<string, unknown> = { ...(project.settings ?? {}) };
    const written: string[] = [];
    for (const [name, value] of Object.entries(settings)) {
      if (value === undefined) continue;
      if (current[name] !== undefined) continue;
      current[name] = value;
      written.push(name);
    }
    return { project, settings: current, written };
  }

  /**
   * AAQ-011/F13 — the project's backend binding, in the editor's own shape.
   *
   * ⚠️ `metadata.cloudservices` stores `{instanceId, endpoint, appId, type}` —
   * `instanceId`, not `id`. `projectmodel.editor.getCloudServices` projects that
   * to `{id, endpoint, appId, type}` on the way out, and AIB-007 already caught
   * one bug from confusing the two (an undo that snapshotted the *projection*
   * silently dropped `workspaceId`). This reads and writes the RAW metadata.
   */
  readCloudServices(): { instanceId?: string; endpoint?: string; appId?: string; type?: string } {
    const project = this.readProjectFile() as (ProjectV2File & { metadata?: Record<string, unknown> }) | undefined;
    const raw = project?.metadata?.cloudservices;
    return raw && typeof raw === 'object' ? (raw as Record<string, string>) : {};
  }

  /**
   * Bind the project to a backend.
   *
   * **Refuses rather than repointing** when the project already points
   * somewhere, which is `provisionBackend.endpointRefusal`'s rule and carries
   * its reasoning: overwriting an endpoint is how a user loses a deployed
   * backend to a change they approved for something else, and the repair for a
   * silently repointed project is finding out at runtime. Pass `force` to mean
   * it.
   */
  writeCloudServices(binding: { instanceId: string; endpoint: string; appId: string; type: string }, force = false): void {
    const current = this.readCloudServices();
    if (!force && current.endpoint && current.endpoint !== binding.endpoint) {
      throw new ToolError(
        'invalid-argument',
        `This project already points at ${current.endpoint}. Nothing was changed — disconnect it first ` +
          '(editor: Backend Services), or pass force to repoint it deliberately.'
      );
    }
    const p = this.projectFilePath;
    if (!fs.existsSync(p)) {
      throw new ToolError('not-found', `Missing nodegx.project.json in ${this.projectDir}; cannot bind a backend.`);
    }
    const project = readJson<ProjectV2File & { metadata?: Record<string, unknown> }>(p);
    const metadata = { ...(project.metadata ?? {}), cloudservices: { ...current, ...binding } };
    writeJsonAtomic(p, { ...project, metadata, modified: this.now() });
  }

  readRoutes(): RoutesV2File | undefined {
    return this.viaFormat(() => this.format.readRoutes());
  }

  readStyles(): StylesV2File | undefined {
    return this.viaFormat(() => this.format.readStyles());
  }

  /** P112-OWN020-OFFSYSTEM — element styles (nameless variants) are written here; see `tools/elementStyles.ts`. */
  writeStyles(styles: StylesV2File): void {
    this.viaFormat(() => this.format.writeStyles(styles));
  }

  private get componentsDir(): string {
    return path.join(this.projectDir, 'components');
  }

  readRegistry(): RegistryV2File {
    return this.viaFormat(() => this.format.readRegistry());
  }

  // ─── Resolution ─────────────────────────────────────────────────────────────

  /** Resolve any accepted identifier ("Pages/Home", "/Pages/Home", "/#Card") to a registry entry. */
  resolve(input: string): { key: string; entry: RegistryComponentEntry } | undefined {
    return this.viaFormat(() => this.format.resolve(input));
  }

  componentDir(entry: RegistryComponentEntry): string {
    return path.join(this.componentsDir, entry.path);
  }

  // ─── Reads ──────────────────────────────────────────────────────────────────

  readComponent(input: string): StoredComponent {
    const stored = this.viaFormat(() => this.format.readComponent(input), input);
    this.remember(stored.key, stored.files, stored.revision);
    return stored;
  }

  private remember(key: string, files: ComponentFiles, revision: string): void {
    this.seen.set(key, { files: structuredClone(files), revision, at: new Date().toISOString() });
  }

  /**
   * P125 CCN-002 — what changed on disk since this server last read or wrote each component: the answer to
   * "they released the hold; what did they do?". Reads with no snapshot, so it neither satisfies nor resets the
   * drift rule: a write after it is still refused until the component is read again.
   */
  changesSinceSeen(): { changed: SeenChange[]; deleted: string[]; added: string[]; unchanged: number } {
    const changed: SeenChange[] = [];
    const deleted: string[] = [];
    let unchanged = 0;
    for (const [key, before] of this.seen) {
      const hit = this.format.resolve(key);
      if (!hit) {
        deleted.push(key);
        continue;
      }
      const now = this.viaFormat(() => this.format.filesOf(hit.key, hit.entry), key);
      const revision = computeRevision(now);
      if (revision === before.revision) unchanged++;
      else changed.push({ key, before, now, revision });
    }
    const added = this.keysAtOpen ? this.format.componentKeys().filter((k) => !this.keysAtOpen!.has(k) && !this.seen.has(k)) : [];
    return { changed, deleted, added, unchanged };
  }

  listComponents(): ComponentListRow[] {
    const registry = this.readRegistry();
    const rows: ComponentListRow[] = [];
    for (const [key, entry] of Object.entries(registry.components)) {
      const text = this.format.files.read(`components/${entry.path}/component.json`);
      let legacyName = '/' + key;
      let description: string | undefined;
      let type: string = entry.type;
      if (text !== null) {
        let c: ComponentV2File;
        try {
          c = JSON.parse(text) as ComponentV2File;
        } catch (err) {
          throw new ToolError('io-error', `Failed to read components/${entry.path}/component.json: ${(err as Error).message}`);
        }
        if (c.path) legacyName = c.path;
        if (c.description) description = c.description;
        if (c.type) type = c.type;
      }
      let nodeCount = entry.nodeCount;
      let connectionCount = entry.connectionCount;
      if (nodeCount === undefined || connectionCount === undefined) {
        const files = this.viaFormat(() => this.format.filesOf(key, entry), key);
        nodeCount = files.nodes.nodes.length;
        connectionCount = files.connections.connections.length;
      }
      rows.push({
        path: key,
        legacyName,
        type,
        nodeCount,
        connectionCount,
        ...(description ? { description } : {})
      });
    }
    rows.sort((a, b) => (a.path < b.path ? -1 : 1));
    return rows;
  }

  // ─── Normalized model for validation ────────────────────────────────────────

  /**
   * Build the validator's NormProject from disk, optionally substituting a
   * candidate component (create/update) or omitting one (delete). Mirrors
   * loadV2Directory but works on in-memory candidates before anything is
   * written.
   */
  buildNormProject(options: { replace?: { key: string; files: ComponentFiles }; remove?: string } = {}): NormProject {
    const registry = this.readRegistry();
    const components: NormProject['components'] = [];
    const refNames = new Set<string>();

    for (const [key, entry] of Object.entries(registry.components)) {
      if (options.remove !== undefined && key === options.remove) continue;
      let files: ComponentFiles;
      if (options.replace && options.replace.key === key) {
        files = options.replace.files;
      } else {
        files = this.viaFormat(() => this.format.filesOf(key, entry), key);
      }
      const name = files.component.path ?? key;
      components.push(normalizeV2Component(name, files.nodes, files.connections));
      refNames.add(name);
      refNames.add(key);
      refNames.add(entry.path);
    }

    // A brand-new component (not yet in the registry).
    if (options.replace && !registry.components[options.replace.key]) {
      const files = options.replace.files;
      const name = files.component.path ?? options.replace.key;
      components.push(normalizeV2Component(name, files.nodes, files.connections));
      refNames.add(name);
      refNames.add(options.replace.key);
    }

    return { components, componentRefs: buildComponentRefs([...refNames]) };
  }

  /** All places where a component is instantiated as a node. */
  findUsages(target: string): Usage[] {
    const targetPath = toPathForm(target);
    const usages: Usage[] = [];
    const registry = this.readRegistry();
    for (const [key, entry] of Object.entries(registry.components)) {
      const files = this.viaFormat(() => this.format.filesOf(key, entry), key);
      for (const node of files.nodes.nodes) {
        if (typeof node.type === 'string' && isComponentRef(node.type) && refToPath(node.type) === targetPath) {
          usages.push({ component: key, legacyName: files.component.path ?? '/' + key, nodeId: node.id });
        }
      }
    }
    return usages;
  }

  // ─── Writes ─────────────────────────────────────────────────────────────────

  /**
   * Write a component (create or update) and maintain the registry. Assumes validation already passed.
   *
   * P109 ISL-019 — an update whose content equals what is on disk (everything but `modified` and
   * `modifiedBy`) writes nothing, the registry included, and says so with `unchanged`. A component
   * an agent rebuilds exactly as it was then leaves git clean, on the wall clock as well as off it.
   *
   * P109 ISL-018 — in a project the editor will still clean up (format < 5), say "ticked" on the
   * run-on-value-change boxes of the nodes this write authors. That runs in the format's `prepare`
   * hook: after the write is admitted, before the no-op check (so a rewrite of a pinned node is still
   * a no-op), and never on a refused write.
   */
  writeComponent(
    key: string,
    files: ComponentFiles,
    options: { expectNew?: boolean; ifRevision?: string } = {}
  ): { revision: string; dir: string; unchanged?: true; ticked?: TickedBox[] } {
    const willBeCleanedUp = projectWillBeCleanedUp(this.readProjectFile()?.version);
    let ticked: TickedBox[] = [];
    const written = this.viaFormat(
      () =>
        this.format.writeComponent(key, files, {
          expectNew: options.expectNew,
          ifRevision: options.ifRevision,
          prepare: (stored) => {
            if (willBeCleanedUp) ticked = pinAuthoredRunOnChange(key, files, stored ?? null);
          }
        }),
      key
    );
    const entry = this.format.resolve(key)?.entry;
    const dir = path.join(this.componentsDir, entry?.path ?? key);
    if (entry) this.remember(key, this.format.filesOf(key, entry), written.revision);
    if (written.unchanged) return { revision: written.revision, dir, unchanged: true };
    return { revision: written.revision, dir, ...(ticked.length > 0 ? { ticked } : {}) };
  }

  deleteComponent(input: string): { removed: string[] } {
    const key = this.format.resolve(input)?.key;
    const removed = this.viaFormat(() => this.format.deleteComponent(input), input);
    if (key !== undefined) this.seen.delete(key);
    return removed;
  }
}
