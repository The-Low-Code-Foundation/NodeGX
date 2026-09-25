/**
 * Admin backup / export-import / schema-promotion routes (BAK-007).
 *
 * All routes are `admin` access (the supervisor credential), mirroring
 * admin-triggers / admin-security. This is the HTTP surface the editor's
 * Backend Services panel and the MCP backup tools drive.
 *
 *   GET    /admin/backups             list archives + policy + status
 *   PUT    /admin/backups/config      update retention/destination/schedule/secrets
 *   POST   /admin/backups             run a backup now
 *   POST   /admin/backups/restore     restore { archive }  (danger; see notes)
 *   GET    /admin/export/:collection  ?format=json|csv  -> { content }
 *   POST   /admin/import/:collection  { format, content, dryRun } -> report
 *   POST   /admin/schema/diff         { source } -> diff against THIS backend
 *   POST   /admin/schema/apply        { source, allowDestructive } -> apply result
 *
 * BMG-011 (R4: restore is a button in the browser, behind the backend's typed
 * name). Restore over HTTP used to swap `data/local.db` under the running
 * adapter's open handle: the process kept serving the OLD rows from the
 * unlinked inode and every write after the "restore" went into a file nothing
 * would ever read again. It now quiesces first — `persistence.pause()`
 * disconnects the adapter, the archive is unpacked, `persistence.resume()`
 * reconnects and re-ensures the system tables — so what the route answers is
 * what the next request reads. Requests that arrive in between fail loudly
 * against a closed adapter rather than reading torn state; the page blocks its
 * own controls for the duration. Without a `persistence` dep (a harness that
 * builds the routes bare) the old swap-only behaviour stands, and the response
 * says `reconnected: false`.
 *
 *   GET    /admin/backups/archive?file=<name>   stream one listed archive (download)
 *
 * @module nodegx-backend/server/admin-backups
 */

import * as fs from 'fs';

import type { RequestContext } from './HttpServer';
import type { IStorageFacade } from '@noodl/backend-contract';
import type { BackupSubsystem } from '../backup/BackupSubsystem';
import type { BackupListItem } from '../backup/BackupManager';
import { BackupNotFileBackedError } from '../backup/BackupManager';
import type { BackupConfig } from '../backup/config';
import { exportCollection, importCollection, DataFormat } from '../backup/dataio';
import {
  applySchema,
  diffSchema,
  renderDiff,
  SchemaDiff,
  SchemaSnapshot,
  snapshotFromLiveDir
} from '../backup/schema-migrate';
import { HttpError, readJSONBody, sendJSON } from './http-util';

/** BMG-011: how the service lets a restore swap the database it is serving. */
export interface PersistenceControl {
  /** Close the adapter's handle so the file can be replaced. */
  pause(): Promise<void>;
  /** Reopen the (new) file and re-ensure the system tables. */
  resume(): Promise<void>;
}

export interface AdminBackupDeps {
  backups: BackupSubsystem;
  facade: IStorageFacade;
  dataDir: string;
  /** Absent only in a harness that builds the routes without a service. */
  persistence?: PersistenceControl;
}

/** `GET /admin/backups`. */
export interface BackupListResponse {
  config: BackupConfig;
  backups: BackupListItem[];
}

/** `GET`/`PUT /admin/backups/config`. */
export interface BackupConfigResponse {
  config: BackupConfig;
}

/** `POST /admin/backups`. */
export interface BackupRunResponse {
  ok: boolean;
  archive: string;
  bytes: number;
  mechanism: string;
  deleted: string[];
}

/** `POST /admin/schema/diff`. */
export interface SchemaDiffResponse {
  diff: SchemaDiff;
  rendered: string;
}

/**
 * BRG-008: turn the backup subsystem's "this engine is not a file" refusal into
 * a 409. Anything else is rethrown untouched — this translates ONE named error
 * and is not a general error swallow.
 */
async function asRefusal<T>(run: () => Promise<T>): Promise<T> {
  try {
    return await run();
  } catch (e) {
    if (e instanceof BackupNotFileBackedError) throw new HttpError(409, e.message);
    throw e;
  }
}

export class AdminBackupRoutes {
  constructor(private readonly deps: AdminBackupDeps) {}

  list(ctx: RequestContext): void {
    const { backups } = this.deps;
    sendJSON(ctx.res, 200, {
      config: backups.config.get(),
      backups: backups.manager.listBackups()
    } satisfies BackupListResponse);
  }

  async updateConfig(ctx: RequestContext): Promise<void> {
    const body = await readJSONBody(ctx.req);
    // Schedule goes through the subsystem (validates cron + rearms).
    if (body.schedule !== undefined) {
      this.deps.backups.setSchedule(
        body.schedule
          ? {
              enabled: !!(body.schedule as Record<string, unknown>).enabled,
              cron: String((body.schedule as Record<string, unknown>).cron || ''),
              missedFirePolicy:
                (body.schedule as Record<string, unknown>).missedFirePolicy === 'run-once-on-start'
                  ? 'run-once-on-start'
                  : 'skip'
            }
          : null
      );
    }
    const patch: Record<string, unknown> = {};
    if (body.retention !== undefined) patch.retention = body.retention;
    if (body.destination !== undefined) patch.destination = body.destination;
    if (body.includeSecrets !== undefined) patch.includeSecrets = body.includeSecrets;
    if (Object.keys(patch).length) this.deps.backups.config.update(patch);
    sendJSON(ctx.res, 200, { config: this.deps.backups.config.get() } satisfies BackupConfigResponse);
  }

  async runBackup(ctx: RequestContext): Promise<void> {
    // BRG-008: a backend whose rows are not in a file refuses. That is a
    // precondition of this route, not a fault in it — 409, not 500, so an
    // operator's client can tell "you cannot do this here" from "it broke".
    const result = await asRefusal(() =>
      this.deps.backups.manager.createBackup({
        triggerType: 'manual',
        source: 'admin backup'
      })
    );
    sendJSON(ctx.res, 200, {
      ok: true,
      archive: result.archivePath,
      bytes: result.bytes,
      mechanism: result.manifest.snapshotMechanism,
      deleted: result.deleted
    } satisfies BackupRunResponse);
  }

  /**
   * `POST /admin/backups/restore {archive, safetySnapshot?}`. `archive` is a
   * listed archive's `file` or its full `path`; anything else is 404 by name,
   * so the route cannot be pointed at an arbitrary file on the box.
   */
  async restore(ctx: RequestContext): Promise<void> {
    const body = await readJSONBody(ctx.req);
    const asked = typeof body.archive === 'string' ? body.archive : '';
    if (!asked) throw new HttpError(400, 'archive (a listed archive) is required');
    const listed = this.listedArchive(asked);
    if (!listed) throw new HttpError(404, `No archive "${asked}" in this backend's backups.`);
    const safetySnapshot = body.safetySnapshot !== false;
    const control = this.deps.persistence;
    if (control) await control.pause();
    let result;
    try {
      result = await asRefusal(() =>
        this.deps.backups.manager.restore(listed.path, {
          triggerType: 'manual',
          source: 'admin restore',
          safetySnapshot
        })
      );
    } finally {
      // Whatever happened on disk, the service must be serving SOMETHING
      // again — the old file if the swap never happened, the archive if it did.
      if (control) await control.resume();
    }
    ctx.audit({ archive: listed.file, safetyArchive: result.safetyArchive, reconnected: !!control });
    sendJSON(ctx.res, 200, { ok: true, reconnected: !!control, ...result });
  }

  /** A listed archive by `file` or `path` — the only two spellings the routes accept. */
  private listedArchive(asked: string): BackupListItem | null {
    const items = this.deps.backups.manager.listBackups();
    return items.find((b) => b.file === asked || b.path === asked) || null;
  }

  /** `GET /admin/backups/archive?file=<name>` — the bytes of one listed archive, as a download. */
  download(ctx: RequestContext): void {
    const asked = (ctx.query.file || '').trim();
    if (!asked) throw new HttpError(400, 'file (a listed archive) is required');
    const listed = this.listedArchive(asked);
    if (!listed || !fs.existsSync(listed.path)) throw new HttpError(404, `No archive "${asked}" in this backend's backups.`);
    const size = fs.statSync(listed.path).size;
    ctx.res.writeHead(200, {
      'Content-Type': 'application/octet-stream',
      'Content-Length': size,
      'Content-Disposition': `attachment; filename="${listed.file.replace(/[^\w.-]/g, '_')}"`,
      'Cache-Control': 'no-store'
    });
    fs.createReadStream(listed.path).pipe(ctx.res);
  }

  async exportCollection(ctx: RequestContext): Promise<void> {
    const format = (ctx.query.format || 'json') as DataFormat;
    if (format !== 'json' && format !== 'csv') throw new HttpError(400, 'format must be json or csv');
    const result = await exportCollection(this.deps.facade, ctx.params.collection, format);
    sendJSON(ctx.res, 200, result);
  }

  async importCollection(ctx: RequestContext): Promise<void> {
    const body = await readJSONBody(ctx.req);
    const format = (body.format || 'json') as DataFormat;
    if (format !== 'json' && format !== 'csv') throw new HttpError(400, 'format must be json or csv');
    if (typeof body.content !== 'string') throw new HttpError(400, 'content (string) is required');
    const report = await importCollection(this.deps.facade, ctx.params.collection, body.content, {
      format,
      dryRun: !!body.dryRun
    });
    sendJSON(ctx.res, report.error && !report.rejected.length ? 400 : 200, report);
  }

  private sourceFromBody(body: Record<string, unknown>): SchemaSnapshot {
    const source = body.source as SchemaSnapshot | undefined;
    if (!source || !Array.isArray(source.tables)) {
      throw new HttpError(400, 'source must be a schema snapshot: { tables: [...], permissions?, triggers?, templates? }');
    }
    return source;
  }

  async schemaDiff(ctx: RequestContext): Promise<void> {
    const body = await readJSONBody(ctx.req);
    const source = this.sourceFromBody(body);
    const target = snapshotFromLiveDir(this.deps.facade.schemaManager, this.deps.dataDir);
    const diff = diffSchema(source, target);
    sendJSON(ctx.res, 200, { diff, rendered: renderDiff(diff) } satisfies SchemaDiffResponse);
  }

  async schemaApply(ctx: RequestContext): Promise<void> {
    const body = await readJSONBody(ctx.req);
    const source = this.sourceFromBody(body);
    const target = snapshotFromLiveDir(this.deps.facade.schemaManager, this.deps.dataDir);
    const diff = diffSchema(source, target);
    try {
      const result = await applySchema(
        { schemaManager: this.deps.facade.schemaManager, dataDir: this.deps.dataDir },
        source,
        diff,
        { allowDestructive: !!body.allowDestructive, backupManager: this.deps.backups.manager }
      );
      sendJSON(ctx.res, 200, { ok: true, diff, result });
    } catch (e) {
      throw new HttpError(400, e instanceof Error ? e.message : String(e));
    }
  }
}
