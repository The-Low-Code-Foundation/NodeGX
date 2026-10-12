/**
 * P116 ONT-015 — the doors' half of a series: a screen cannot invent a number.
 *
 * The store fills a series field on create and keeps a value it is given (the admin's backfill).
 * Every door a person, an app or an API key creates through refuses a body that brings its own,
 * with a 400 naming the field, before anything is stamped or written; only the admin credential
 * passes. The create's answer carries the number the store handed out, so the screen that made the
 * record can show it without reading it back.
 *
 * @module nodegx-backend/server/series-door
 */

import { seriesColumns, seriesFieldsIn, seriesRefusal } from '@noodl/runtime/src/api/adapters/series';
import type { IStorageSchema } from '@noodl/backend-contract';
import type { Principal } from '../security/model';
import { HttpError } from './http-util';

type SchemaOf = Parameters<typeof seriesColumns>[0];

/** Throws the 400 when `body` brings a series field and the caller is not the admin. */
export function assertSeriesWrite(principal: Principal, schema: IStorageSchema | undefined, collection: string, body: Record<string, unknown>): void {
  if (principal.kind === 'admin') return;
  const [field] = seriesFieldsIn(schema?.getTableSchema(collection) as SchemaOf, body);
  if (field) throw new HttpError(400, seriesRefusal(collection, field), 142, { reason: 'series', collection, field });
}

/** The series fields of a created record, for the create's answer. */
export function seriesAnswer(schema: IStorageSchema | undefined, collection: string, record: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const c of seriesColumns(schema?.getTableSchema(collection) as SchemaOf)) if (record[c.name] !== undefined) out[c.name] = record[c.name];
  return out;
}
