/**
 * Saved views for the Collections page (BMG-002 §3.2).
 *
 *   GET    /admin/views/:collection          { views: SavedView[] } by name
 *   PUT    /admin/views/:collection/:name    { filter, sort, columns } -> the view
 *   DELETE /admin/views/:collection/:name    -> { deleted: true } | 404
 *
 * A view is what a person set up to look at a collection — the filter ROWS
 * (not a resolved `where`, so "this week" stays this week), the sort and the
 * columns — kept by the backend so the team shares it and a second browser
 * opens it. The server does not interpret the filter: it is the page's model,
 * stored as a JSON object and handed back as written.
 *
 * Stored in `views.json` in the data dir, a whole-file read-modify-write with
 * an atomic rename (the `SecretsStore` / `OpsState` shape). It is operator
 * state, not data: it rides a data-dir backup, and nothing reads it but this
 * page.
 *
 * @module nodegx-backend/server/admin-views
 */

import * as fs from 'fs';
import * as path from 'path';

import type { RequestContext } from './HttpServer';
import { HttpError, readJSONBody, sendJSON } from './http-util';

export interface SavedView {
  name: string;
  /** The page's filter rows (a `Group`), or null for none. Opaque to the server. */
  filter: Record<string, unknown> | null;
  /** `±field`, the order the headers were clicked in. */
  sort: string[];
  /** The columns shown, in order. Empty = the page's default. */
  columns: string[];
  savedAt: string;
}

interface ViewsFile {
  version: 1;
  collections: Record<string, Record<string, SavedView>>;
}

const FILE = 'views.json';
/** A view is a few rows and a few names; this is generous for that and small for a store. */
const MAX_VIEW_BYTES = 32 * 1024;
const FIELD = /^[A-Za-z_][A-Za-z0-9_]*$/;

export class ViewsStore {
  private readonly file: string;

  constructor(dataDir: string) {
    this.file = path.join(dataDir, FILE);
  }

  private read(): ViewsFile {
    if (!fs.existsSync(this.file)) return { version: 1, collections: {} };
    const parsed = JSON.parse(fs.readFileSync(this.file, 'utf-8')) as ViewsFile;
    return parsed && parsed.collections ? parsed : { version: 1, collections: {} };
  }

  private write(value: ViewsFile): void {
    const tmp = `${this.file}.tmp-${process.pid}`;
    fs.writeFileSync(tmp, JSON.stringify(value, null, 2) + '\n');
    fs.renameSync(tmp, this.file);
  }

  list(collection: string): SavedView[] {
    const views = this.read().collections[collection] || {};
    return Object.keys(views)
      .sort((a, b) => a.localeCompare(b))
      .map((k) => views[k]);
  }

  save(collection: string, view: SavedView): void {
    const all = this.read();
    all.collections[collection] = { ...(all.collections[collection] || {}), [view.name]: view };
    this.write(all);
  }

  remove(collection: string, name: string): boolean {
    const all = this.read();
    const views = all.collections[collection];
    if (!views || !views[name]) return false;
    delete views[name];
    if (!Object.keys(views).length) delete all.collections[collection];
    this.write(all);
    return true;
  }
}

function viewName(raw: string): string {
  const name = String(raw || '').trim();
  if (!name) throw new HttpError(400, 'A view needs a name.');
  if (name.length > 80) throw new HttpError(400, 'A view name is at most 80 characters.');
  return name;
}

function fieldList(value: unknown, what: string, signed: boolean): string[] {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) throw new HttpError(400, `${what} must be a list of field names.`);
  return value.map((v) => {
    const s = String(v);
    const bare = signed && s.charAt(0) === '-' ? s.slice(1) : s;
    if (typeof v !== 'string' || !FIELD.test(bare)) throw new HttpError(400, `${what}: "${s}" is not a field name.`);
    return s;
  });
}

export class AdminViewRoutes {
  constructor(private readonly store: ViewsStore) {}

  list(ctx: RequestContext): void {
    sendJSON(ctx.res, 200, { views: this.store.list(ctx.params.collection) });
  }

  async save(ctx: RequestContext): Promise<void> {
    const name = viewName(ctx.params.name);
    const body = await readJSONBody(ctx.req);
    const filter = body.filter === undefined ? null : body.filter;
    if (filter !== null && (typeof filter !== 'object' || Array.isArray(filter))) {
      throw new HttpError(400, 'filter must be the page’s filter rows (an object), or null.');
    }
    const view: SavedView = {
      name,
      filter: filter as Record<string, unknown> | null,
      sort: fieldList(body.sort, 'sort', true),
      columns: fieldList(body.columns, 'columns', false),
      savedAt: new Date().toISOString()
    };
    if (Buffer.byteLength(JSON.stringify(view), 'utf-8') > MAX_VIEW_BYTES) {
      throw new HttpError(413, `A saved view is at most ${MAX_VIEW_BYTES} bytes.`);
    }
    this.store.save(ctx.params.collection, view);
    ctx.audit({ collection: ctx.params.collection, view: name });
    sendJSON(ctx.res, 200, view);
  }

  remove(ctx: RequestContext): void {
    const name = viewName(ctx.params.name);
    if (!this.store.remove(ctx.params.collection, name)) throw new HttpError(404, `There is no view called "${name}".`);
    ctx.audit({ collection: ctx.params.collection, view: name });
    sendJSON(ctx.res, 200, { deleted: true });
  }
}
