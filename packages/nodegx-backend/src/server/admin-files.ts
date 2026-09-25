/**
 * Admin file-storage config routes (BAK-006). Mirrors admin-backups.ts:
 * `admin`-only, the surface the editor's Backend Services panel, the served
 * dashboard, and the MCP file-config tools all drive.
 *
 *   GET  /admin/files/config    limits, content-type policy, driver, presets,
 *                               orphan-sweep schedule, transform (sharp) status
 *   PUT  /admin/files/config    update the above (S3 credentials via a
 *                               separate field — never echoed back)
 *   POST /admin/files/sweep     run the orphan sweep now (report-only unless
 *                               `deleteOrphans: true`)
 *
 * BMG-011 — the Storage page's file browser:
 *
 *   GET    /admin/files?q&limit&offset   the stored files, newest first, with a count
 *   GET    /admin/files/uses?names=a,b   which records point at each named file
 *   DELETE /admin/files/:name[?clear=1]  remove one; 409 by name while a record
 *                                        points at it, unless `clear` also blanks
 *                                        those fields
 *
 * The listing reads `_Files` through the metadata store (never `/api/_Files`,
 * a system collection kept off the wire). "Used by" is a walk over every
 * File-typed column of every collection, done ONCE per request for the names
 * the page shows — not once per row, and not on every listing (§5).
 *
 * @module nodegx-backend/server/admin-files
 */

import type { IStorageFacade } from '@noodl/backend-contract';

import type { RequestContext } from './HttpServer';
import type { FileSubsystem } from '../storage/FileSubsystem';
import type { FileRecord } from '../storage/MetadataStore';
import { FILES_COLLECTION } from '../storage/MetadataStore';
import type { FileConfigPatch, FileStorageConfig, OrphanSweepReport } from '../storage/config';
import { isSystemCollection } from '../security/model';
import { HttpError, readJSONBody, sendJSON } from './http-util';

/** One row of `GET /admin/files`. The stored name is what a record's File value carries. */
export interface FileListItem {
  name: string;
  originalName: string;
  size: number;
  contentType: string;
  createdAt: string;
  owner: string | null;
  private: boolean;
  objectId: string;
}

/** The 200 body of `GET /admin/files`. */
export interface FileListResponse {
  files: FileListItem[];
  count: number;
}

/** One record that points at a file, from `GET /admin/files/uses`. */
export interface FileUse {
  collection: string;
  objectId: string;
  field: string;
}

/** The 200 body of `GET /admin/files/uses`: every asked name, even with no uses. */
export interface FileUsesResponse {
  uses: Record<string, FileUse[]>;
}

/** `DELETE /admin/files/:name` refuses with this code while a record points at the file. */
export const FILE_IN_USE = 'FILE_IN_USE';

/** The most names one `uses` request may ask about — a page, not a dump. */
const MAX_USES_NAMES = 200;

/** The page size ceiling of the listing. */
const MAX_LIST_LIMIT = 200;

/** A record's File value, as the wire stores it (`fields.tsx` `FileValue`). */
function fileNameOf(value: unknown): string | null {
  if (!value || typeof value !== 'object') return null;
  const v = value as { __type?: unknown; name?: unknown };
  if (v.__type !== 'File' || typeof v.name !== 'string' || !v.name) return null;
  return v.name;
}

export function fileListItem(record: FileRecord): FileListItem {
  return {
    name: record.storedName,
    originalName: record.originalName,
    size: record.size,
    contentType: record.contentType,
    createdAt: record.createdAt,
    owner: record.owner,
    private: !!record.private,
    objectId: record.objectId
  };
}

/** The 200 body of `GET`/`PUT /admin/files/config`. */
export interface FileConfigResponse {
  config: FileStorageConfig;
  driverKind: string;
  /** Honest, not aspirational: `sharp` is an optionalDependency. */
  transformsAvailable: boolean;
  transformUnavailableReason?: string;
}

/** The 200 body of `POST /admin/files/sweep`. */
export interface SweepResponse {
  report: OrphanSweepReport;
}

export class AdminFileRoutes {
  constructor(
    private readonly files: FileSubsystem,
    private readonly facade: IStorageFacade
  ) {}

  /** `GET /admin/files?q&limit&offset` — newest first; `q` is a contains over the uploaded name. */
  async list(ctx: RequestContext): Promise<void> {
    const q = (ctx.query.q || '').trim();
    const limitRaw = parseInt(ctx.query.limit || '', 10);
    const offsetRaw = parseInt(ctx.query.offset || '', 10);
    const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(limitRaw, MAX_LIST_LIMIT) : 50;
    const offset = Number.isFinite(offsetRaw) && offsetRaw > 0 ? offsetRaw : 0;
    const where: Record<string, unknown> = q ? { originalName: { contains: q } } : {};
    const { results, count } = await this.facade.rawQueryAll(FILES_COLLECTION, {
      where,
      sort: '-createdAt',
      limit,
      skip: offset,
      count: true
    });
    const files = (results as unknown as FileRecord[]).map(fileListItem);
    sendJSON(ctx.res, 200, { files, count: typeof count === 'number' ? count : files.length } satisfies FileListResponse);
  }

  /**
   * Every record whose File-typed field names one of `names`. One pass over
   * the File columns of every user collection; system collections (`_Files`
   * itself, `_User`…) carry no File fields a person placed.
   */
  async usesOf(names: string[]): Promise<Record<string, FileUse[]>> {
    const wanted = new Set(names);
    const uses: Record<string, FileUse[]> = {};
    for (const n of names) uses[n] = [];
    if (!wanted.size) return uses;
    const sm = this.facade.schemaManager;
    const tables = sm ? sm.listTables() : [];
    for (const collection of tables) {
      if (isSystemCollection(collection)) continue;
      const columns = await this.facade.getColumns(collection);
      const fileColumns = columns.filter((c) => c.type === 'File').map((c) => c.name);
      if (!fileColumns.length) continue;
      const { results } = await this.facade.rawQueryAll(collection, { select: ['objectId', ...fileColumns] });
      for (const row of results) {
        for (const field of fileColumns) {
          const name = fileNameOf(row[field]);
          if (name && wanted.has(name) && typeof row.objectId === 'string') {
            uses[name].push({ collection, objectId: row.objectId, field });
          }
        }
      }
    }
    return uses;
  }

  /** `GET /admin/files/uses?names=a,b` — the page asks for the rows it shows, in one request. */
  async uses(ctx: RequestContext): Promise<void> {
    const names = (ctx.query.names || '')
      .split(',')
      .map((n) => n.trim())
      .filter(Boolean);
    if (!names.length) throw new HttpError(400, 'names (comma-separated stored file names) is required');
    if (names.length > MAX_USES_NAMES) throw new HttpError(400, `At most ${MAX_USES_NAMES} names per request.`);
    sendJSON(ctx.res, 200, { uses: await this.usesOf(names) } satisfies FileUsesResponse);
  }

  /**
   * `DELETE /admin/files/:name` — refuses, naming the records, while any
   * points at the file; `?clear=1` blanks those fields first (the person
   * chose *also clear the references* on the page). Idempotent on a name
   * nothing stores, like the public route.
   */
  async remove(ctx: RequestContext): Promise<void> {
    const name = ctx.params.name;
    const record = await this.files.metadata.findByStoredName(name);
    if (!record) {
      sendJSON(ctx.res, 200, { success: true, existed: false, cleared: [] });
      return;
    }
    const uses = (await this.usesOf([name]))[name];
    const clear = ctx.query.clear === '1' || ctx.query.clear === 'true';
    if (uses.length && !clear) {
      const named = uses
        .slice(0, 5)
        .map((u) => `${u.collection} ${u.objectId} (${u.field})`)
        .join(', ');
      ctx.audit({ refused: FILE_IN_USE, uses: uses.length });
      sendJSON(ctx.res, 409, {
        error: `"${record.originalName}" is used by ${uses.length} record${uses.length === 1 ? '' : 's'}: ${named}${uses.length > 5 ? ', …' : ''}. Delete it anyway to clear those fields too.`,
        code: FILE_IN_USE,
        uses
      });
      return;
    }
    for (const u of uses) {
      await this.facade.rawSave(u.collection, u.objectId, { [u.field]: null });
    }
    await this.files.deleteStored(record);
    ctx.audit({ originalName: record.originalName, bytes: record.size, cleared: uses.length });
    sendJSON(ctx.res, 200, { success: true, existed: true, cleared: uses });
  }

  getConfig(ctx: RequestContext): void {
    const config = this.files.config.get();
    const transform = this.files.transformStatus();
    // S3 credentials never round-trip back out — the panel shows "configured: true/false" only.
    sendJSON(ctx.res, 200, {
      config,
      driverKind: this.files.getDriver().kind,
      transformsAvailable: transform.available,
      transformUnavailableReason: transform.available ? undefined : transform.reason
    } satisfies FileConfigResponse);
  }

  async updateConfig(ctx: RequestContext): Promise<void> {
    const body = await readJSONBody(ctx.req);
    // Unvalidated wire data: `FileStorageConfigStore.update` is the validator
    // (and throws a `FileConfigError` this method turns into a 400). Naming the
    // patch type means each field's conversion is written down individually
    // rather than the whole object arriving `as any`.
    const patch: FileConfigPatch = {};
    if (body.maxUploadBytes !== undefined) patch.maxUploadBytes = body.maxUploadBytes as number;
    if (body.contentTypes !== undefined) patch.contentTypes = body.contentTypes as FileConfigPatch['contentTypes'];
    if (body.driver !== undefined) patch.driver = body.driver as FileConfigPatch['driver'];
    if (body.signedUrlTtlSeconds !== undefined) patch.signedUrlTtlSeconds = body.signedUrlTtlSeconds as number;
    if (body.thumbnails !== undefined) patch.thumbnails = body.thumbnails as FileConfigPatch['thumbnails'];

    try {
      if (Object.keys(patch).length) {
        this.files.updateConfig(patch);
      }
      if (body.orphanSweep !== undefined) {
        const s = body.orphanSweep as { enabled?: boolean; cron?: string } | null;
        this.files.setOrphanSweepSchedule(s ? { enabled: !!s.enabled, cron: String(s.cron || '') } : { enabled: false, cron: '0 3 * * *' });
      }
      if (body.s3Credentials !== undefined) {
        const creds = body.s3Credentials as { accessKeyId?: string; secretAccessKey?: string };
        this.files.setS3Credentials(String(creds.accessKeyId || ''), String(creds.secretAccessKey || ''));
      }
    } catch (e) {
      throw new HttpError(400, e instanceof Error ? e.message : String(e));
    }

    this.getConfig(ctx);
  }

  async runSweep(ctx: RequestContext): Promise<void> {
    const body = await readJSONBody(ctx.req).catch(() => ({}) as Record<string, unknown>);
    const report = await this.files.runSweepNow(body.deleteOrphans === true);
    sendJSON(ctx.res, 200, { report } satisfies SweepResponse);
  }
}
