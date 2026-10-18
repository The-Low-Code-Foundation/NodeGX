/**
 * MetadataStore — the `_Files` system table (BAK-006).
 *
 * `_Files` is created through `SchemaManager.createTable` exactly like every
 * other collection (`service.ts`'s `ensureSystemTables`), which is what gives
 * it a real `ACL` column for free (SchemaManager stamps one onto every table)
 * — private files reuse BAK-003's ROW-LEVEL ACL predicate and JS twin
 * (`canReadRecord`) rather than inventing a second access model. Reads go
 * through `AdapterFacade.raw*` like any collection; the one difference from a
 * normal collection is that these routes are UNFILTERED reads (no `acl`
 * option passed) followed by an explicit `canReadRecord` check in
 * `FileRoutes` — because file lookup is by `storedName` (the wire-visible
 * name), not `objectId`, and "which principal is asking" has to be decided
 * AFTER the row is found, not as a query-time filter (see FileRoutes' module
 * doc for the full private-file flow, including signed URLs).
 *
 * `_Files` is deliberately unreachable through `/api/:table` and
 * `/classes/:collection` — `isSystemCollection` in security/model.ts already
 * refuses any `_`-prefixed collection at the CLP layer, so this table's ONLY
 * front door is FileRoutes.
 *
 * @module nodegx-backend/storage/MetadataStore
 */

import type { IStorageFacade } from '@noodl/backend-contract';
import type { IStorageSchema } from '@noodl/backend-contract';

export const FILES_COLLECTION = '_Files';

export interface FileAclEntry {
  read?: boolean;
  write?: boolean;
}

export interface FileRecord {
  objectId: string;
  storedName: string;
  originalName: string;
  size: number;
  contentType: string;
  hash: string;
  driver: 'local' | 's3';
  key: string;
  owner: string | null;
  private: boolean;
  /** P121-TWO001-MEMBERSPHOTO: the roles it is shared with (each also a read entry in `ACL`); absent when none. */
  readers?: string[] | null;
  ACL: Record<string, FileAclEntry> | null | undefined;
  createdAt: string;
  updatedAt: string;
}

export interface CreateFileRecordInput {
  storedName: string;
  originalName: string;
  size: number;
  contentType: string;
  hash: string;
  driver: 'local' | 's3';
  key: string;
  owner: string | null;
  private: boolean;
  /**
   * P121-TWO001-MEMBERSPHOTO: the `role:<name>` keys that may READ a private
   * file as well as its owner (`X-NodeGX-File-Readers`). Never write: a file
   * shared with a role is still deleted only by whoever uploaded it.
   */
  readers?: string[];
}

const FILE_COLUMNS = [
  { name: 'storedName', type: 'String' },
  { name: 'originalName', type: 'String' },
  { name: 'size', type: 'Number' },
  { name: 'contentType', type: 'String' },
  { name: 'hash', type: 'String' },
  { name: 'driver', type: 'String' },
  { name: 'key', type: 'String' },
  { name: 'owner', type: 'Pointer', targetClass: '_User' },
  { name: 'private', type: 'Boolean' },
  // P121-TWO001-MEMBERSPHOTO: the roles a private file is shared with, the same keys its ACL grants read. Kept as a
  // column because every record read drops a row's ACL (`cloudstore.js`), and a cloud function must be able to ask
  // "is this photo the members'?" before it puts it in a post.
  { name: 'readers', type: 'Array' }
];

/**
 * Ensure `_Files` exists with the right shape. Idempotent — call at every startup. A backend made before a column
 * was added gains it here (`createTable` leaves an existing table alone).
 */
export function ensureFilesTable(schemaManager: IStorageSchema | null | undefined): void {
  if (!schemaManager) return;
  if (schemaManager.createTable({ name: FILES_COLLECTION, columns: FILE_COLUMNS })) return;
  const have = new Set((schemaManager.getTableSchema(FILES_COLLECTION)?.columns ?? []).map((c) => c.name));
  for (const column of FILE_COLUMNS) if (!have.has(column.name)) schemaManager.addColumn(FILES_COLLECTION, column);
}

export class MetadataStore {
  constructor(private readonly facade: IStorageFacade) {}

  async create(input: CreateFileRecordInput): Promise<FileRecord> {
    let acl: Record<string, FileAclEntry> | undefined;
    if (input.private) {
      const entries: Record<string, FileAclEntry> = {};
      if (input.owner) entries[input.owner] = { read: true, write: true };
      for (const reader of input.readers ?? []) entries[reader] = { read: true };
      if (Object.keys(entries).length) acl = entries;
    }
    const record = await this.facade.rawCreate(FILES_COLLECTION, {
      storedName: input.storedName,
      originalName: input.originalName,
      size: input.size,
      contentType: input.contentType,
      hash: input.hash,
      driver: input.driver,
      key: input.key,
      owner: input.owner,
      private: input.private,
      ...(input.private && input.readers?.length ? { readers: input.readers } : {}),
      ACL: acl
    });
    return record as unknown as FileRecord;
  }

  /**
   * Unfiltered lookup by the wire-visible stored name (there is at most one
   * row per stored name — the random suffix in the key guarantees this).
   * Callers decide readability themselves (see module doc).
   */
  async findByStoredName(storedName: string): Promise<FileRecord | null> {
    const { results } = await this.facade.rawQuery(FILES_COLLECTION, { where: { storedName }, limit: 1 });
    return (results[0] as unknown as FileRecord) || null;
  }

  async findById(objectId: string): Promise<FileRecord | null> {
    try {
      return (await this.facade.rawFetch(FILES_COLLECTION, objectId)) as unknown as FileRecord;
    } catch {
      return null;
    }
  }

  async deleteById(objectId: string): Promise<void> {
    await this.facade.rawDelete(FILES_COLLECTION, objectId);
  }

  /**
   * Every row — the orphan sweep's "what metadata thinks exists" half.
   * Unbounded (v1; see BAK-006-NOTES).
   *
   * PRD-001 §3.3: `rawQueryAll`. A sweep that saw only the first page would
   * read every unlisted file as an orphan and DELETE it — the one caller where
   * a page cap does not truncate a listing but destroys data.
   */
  async listAll(): Promise<FileRecord[]> {
    const { results } = await this.facade.rawQueryAll(FILES_COLLECTION, {});
    return results as unknown as FileRecord[];
  }
}
