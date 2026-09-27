/**
 * HttpCacheStore — the `_HttpCache` system table (FED-004 §3.2).
 *
 * ## What it is, and the smaller thing it deliberately is not
 *
 * It is NOT an HTTP cache. It stores no bodies, no expiry, no freshness
 * heuristic, and it never answers a request on its own. It stores the two
 * VALIDATOR strings a server handed back with the last 200 — `ETag` and
 * `Last-Modified` — so the next request for that URL can carry `If-None-Match`
 * / `If-Modified-Since` and let the SERVER decide whether anything changed.
 *
 * That distinction is the whole safety argument. A cache can be stale; this
 * cannot be, because every conditional request still goes out and the answer is
 * still the origin's. The worst a wrong row can do is cost one round trip: a
 * server that does not recognise the validator simply answers 200 with the body,
 * which is exactly what would have happened anyway.
 *
 * ## Why a system table rather than a collection
 *
 * `_`-prefixed names are refused at the CLP layer (`isSystemCollection`,
 * security/model.ts), so this is unreachable from `/api/:table`,
 * `/classes/:collection` and every graph. Rule 1 of the phase says every
 * capability lands somewhere a person can open — and this is the exception that
 * proves it: what a person opens is the `Conditional` port on the node, not the
 * bookkeeping behind it. A collection here would be a table an author can
 * corrupt and gains nothing by reading.
 *
 * ## The cap, and what happens at it
 *
 * 50,000 rows, oldest-`seenAt` first when it is exceeded. A feed backend polling
 * a thousand sources reaches roughly a thousand rows and never sees this; the
 * cap is for the graph that builds URLs with a cache-busting query parameter,
 * which would otherwise write one row per request forever. Eviction is checked
 * every {@link EVICTION_CHECK_EVERY} writes rather than on each one, because a
 * `COUNT(*)` on the write path of every outbound request is a cost paid by every
 * backend to protect against a shape almost none of them have.
 *
 * @module nodegx-backend/persistence/HttpCacheStore
 */

import * as crypto from 'crypto';

import type { IStorageFacade, IStorageSchema } from '@noodl/backend-contract';
import type { HttpValidators, HttpValidatorStore } from '@noodl/runtime/src/runcontext';

import { logger } from '../ops/logger';

export const HTTP_CACHE_COLLECTION = '_HttpCache';

/** §3.2's number. See the module doc for who actually reaches it. */
export const HTTP_CACHE_MAX_ROWS = 50000;

/** How many writes pass between two `COUNT(*)`s. */
export const EVICTION_CHECK_EVERY = 500;

/** How much of the table one eviction removes, so the check is not paid every write once full. */
const EVICTION_BATCH = Math.floor(HTTP_CACHE_MAX_ROWS / 10);

/**
 * The row key.
 *
 * SHA-256 of the full URL rather than the URL itself, for two reasons that both
 * matter: a URL can exceed any sane index width (query strings are unbounded),
 * and a URL frequently carries a credential in a query parameter — an API key,
 * a signed-download token — which this table has no business storing in the
 * clear for the life of the backend. The hash is enough to look a row up and
 * useless for anything else.
 *
 * ⚠️ The `url` column beside it is a TRUNCATED, query-stripped copy, kept so an
 * operator reading the table can tell what it holds. It is never read back.
 */
export function hashUrl(url: string): string {
  return crypto.createHash('sha256').update(url).digest('hex');
}

/** What an operator sees in the row: origin + path, never the query string. */
function readableUrl(url: string): string {
  const withoutQuery = url.split('?')[0].split('#')[0];
  return withoutQuery.length > 300 ? withoutQuery.slice(0, 300) : withoutQuery;
}

/** Create `_HttpCache` and its unique index. Idempotent — call at every startup. */
export function ensureHttpCacheTable(schemaManager: IStorageSchema | null | undefined): void {
  if (!schemaManager) return;
  schemaManager.createTable({
    name: HTTP_CACHE_COLLECTION,
    columns: [
      { name: 'urlHash', type: 'String' },
      { name: 'url', type: 'String' },
      { name: 'etag', type: 'String' },
      { name: 'lastModified', type: 'String' },
      { name: 'seenAt', type: 'Date' }
    ]
  });

  // FED-002's index surface, used by the first thing in the product that needs
  // one for its own sake. `urlHash` is unique because two rows for one URL is
  // not a slow lookup, it is an ambiguous answer; `seenAt` is what eviction
  // orders by, and a full scan to find the oldest 5,000 rows is the one place
  // this table could be slow.
  if (schemaManager.reconcileIndexes) {
    try {
      schemaManager.reconcileIndexes(HTTP_CACHE_COLLECTION, [
        { fields: ['urlHash'], unique: true },
        { fields: ['seenAt'], order: 'asc' }
      ]);
    } catch (e) {
      // An index this table would merely be FASTER with must never stop a
      // backend booting. The feature works without it.
      logger.warn('httpCache.indexes.failed', { error: e instanceof Error ? e.message : String(e) });
    }
  }
}

interface CacheRow {
  objectId: string;
  urlHash: string;
  etag?: string | null;
  lastModified?: string | null;
}

/**
 * The backend's implementation of the runtime's {@link HttpValidatorStore}.
 *
 * Every method swallows its own failures. A backend whose validator table is
 * broken must still serve every HTTP request the graph makes — degraded to
 * unconditional fetches, which is precisely what the feature was added on top
 * of. Nothing here is allowed to be the reason a run fails.
 */
export class HttpCacheStore implements HttpValidatorStore {
  private writesSinceCheck = 0;

  constructor(private readonly facade: IStorageFacade) {}

  async read(url: string): Promise<HttpValidators | null> {
    try {
      const { results } = await this.facade.rawQuery(HTTP_CACHE_COLLECTION, {
        where: { urlHash: hashUrl(url) },
        limit: 1
      });
      const row = results[0] as unknown as CacheRow | undefined;
      if (!row) return null;
      const validators: HttpValidators = {};
      if (row.etag) validators.etag = row.etag;
      if (row.lastModified) validators.lastModified = row.lastModified;
      // A row with neither is a row that says nothing; `null` is the honest
      // answer, and it keeps the node's "do I have anything to send?" a single
      // check rather than two.
      return validators.etag || validators.lastModified ? validators : null;
    } catch (e) {
      logger.warn('httpCache.read.failed', { error: e instanceof Error ? e.message : String(e) });
      return null;
    }
  }

  /**
   * Fire-and-forget by design: the response this describes has already been
   * handed to the graph, and a write that failed must not retro-actively fail
   * it. The promise is returned for tests, which are the only caller that has
   * any business awaiting it.
   */
  write(url: string, validators: HttpValidators): void {
    void this.writeAsync(url, validators);
  }

  async writeAsync(url: string, validators: HttpValidators): Promise<void> {
    const urlHash = hashUrl(url);
    const data = {
      urlHash,
      url: readableUrl(url),
      etag: validators.etag || null,
      lastModified: validators.lastModified || null,
      seenAt: new Date().toISOString()
    };
    try {
      const { results } = await this.facade.rawQuery(HTTP_CACHE_COLLECTION, { where: { urlHash }, limit: 1 });
      const existing = results[0] as unknown as CacheRow | undefined;
      if (existing) {
        // An update, not a delete-then-create: the unique index would make the
        // gap between those two a window where a concurrent write could land.
        await this.facade.rawSave(HTTP_CACHE_COLLECTION, existing.objectId, data);
        return;
      }
      await this.facade.rawCreate(HTTP_CACHE_COLLECTION, data);
      this.writesSinceCheck++;
      if (this.writesSinceCheck >= EVICTION_CHECK_EVERY) {
        this.writesSinceCheck = 0;
        await this.evictIfFull();
      }
    } catch (e) {
      logger.warn('httpCache.write.failed', { error: e instanceof Error ? e.message : String(e) });
    }
  }

  /** Drop the oldest rows when the table is over the cap. Public so a spec can force it. */
  async evictIfFull(): Promise<number> {
    try {
      const count = await this.facade.rawCount(HTTP_CACHE_COLLECTION);
      if (count <= HTTP_CACHE_MAX_ROWS) return 0;

      const overBy = count - HTTP_CACHE_MAX_ROWS;
      // 🔴 PRD-001 §3.3: `rawQueryAll`, and this one is not obvious. The batch
      // below is EVICTION's own decision about how much work one pass does; if
      // the request page cap could shorten it, an operator setting
      // `queries.maxLimit` low enough would make eviction slower than the
      // writes that trigger it — 500 rows added per check against a clamped
      // number removed — and the cache this exists to bound would grow without
      // limit. A maintenance loop's batch size must not be reachable from a
      // control written for requests.
      const { results } = await this.facade.rawQueryAll(HTTP_CACHE_COLLECTION, {
        sort: ['seenAt'],
        limit: Math.max(overBy, EVICTION_BATCH)
      });
      for (const row of results) {
        const id = (row as { objectId?: string }).objectId;
        if (id) await this.facade.rawDelete(HTTP_CACHE_COLLECTION, id);
      }
      logger.info('httpCache.evicted', { removed: results.length, cap: HTTP_CACHE_MAX_ROWS });
      return results.length;
    } catch (e) {
      logger.warn('httpCache.evict.failed', { error: e instanceof Error ? e.message : String(e) });
      return 0;
    }
  }
}
