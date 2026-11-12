/**
 * HST-006 AC3 grader: the export file, reimported into the NODE backend, answers what the Durable Object answered.
 *
 *   node dist/reimport.cjs <exit.json>
 *
 * Builds `<tmp>/data/local.db` from the file with node:sqlite (the schema statements replayed in order, every row
 * inserted), then opens that directory exactly as `nodegx-backend` opens a data dir — `createAdapter({ dataDir })`,
 * never naming LocalSQLAdapter — and asks it the same questions `/__exit` asked on Cloudflare. Exit 0 only when
 * every answer is deep-equal.
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { isDeepStrictEqual } from 'util';

import { makeContext } from '@noodl/backend-contract/conformance';
import { createAdapter } from '../../../../../packages/nodegx-backend/src/persistence/createAdapter';
import { EXPORT_FORMAT, type RecordsExport } from './exit';

const { DatabaseSync } = (process as unknown as { getBuiltinModule(id: string): any }).getBuiltinModule('node:sqlite');

interface ExitAnswer {
  collections: { learners: string; interactions: string; badges: string };
  people: string[];
  answers: Record<string, unknown>;
  file: RecordsExport;
}

function decode(v: unknown): unknown {
  if (v && typeof v === 'object' && '$blob' in (v as object)) return Buffer.from((v as { $blob: string }).$blob, 'base64');
  return v;
}

async function main() {
  const exit = JSON.parse(fs.readFileSync(process.argv[2], 'utf8')) as ExitAnswer;
  if (exit.file.format !== EXPORT_FORMAT) throw new Error('not an export file: ' + exit.file.format);
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hst006-reimport-'));
  fs.mkdirSync(path.join(dataDir, 'data'));
  const db = new DatabaseSync(path.join(dataDir, 'data', 'local.db'));
  let rowsIn = 0;
  for (const o of exit.file.objects) {
    db.exec(o.sql);
    if (o.type !== 'table') continue;
    for (const row of exit.file.rows[o.name] ?? []) {
      const cols = Object.keys(row);
      if (cols.length === 0) continue;
      db.prepare(`INSERT INTO "${o.name}" (${cols.map((c) => `"${c}"`).join(',')}) VALUES (${cols.map(() => '?').join(',')})`).run(
        ...cols.map((c) => decode(row[c]))
      );
      rowsIn++;
    }
  }
  db.close();

  const handle = await createAdapter({ dataDir });
  const ctx = makeContext(handle.adapter, 'reimport');
  const { learners, interactions, badges } = exit.collections;
  const got: Record<string, unknown> = {};
  for (const c of [learners, interactions, badges]) got[c] = (await ctx.query(c, { sort: ['objectId'], limit: 1000 } as never)).results;
  got['count active learners'] = await ctx.count(learners, { active: true });
  got['quiz interactions score >= 50'] = (await ctx.query(interactions, { where: { kind: 'quiz', score: { $gte: 50 } }, sort: ['objectId'] } as never)).results.length;
  got['badges of learner 0'] = (ctx.schema.getRelatedIds(learners, exit.people[0], 'badges') as string[]).map(String).sort();
  got['badges of learner 5'] = (ctx.schema.getRelatedIds(learners, exit.people[1], 'badges') as string[]).map(String).sort();
  // A write after the move: the reimported backend is a working backend, not a read-only copy.
  const after = await ctx.create(learners, { email: 'after@example.com', name: 'After the move', active: true });
  const writable = (await ctx.count(learners, {})) === (exit.answers[learners] as unknown[]).length + 1 && !!after.objectId;
  await handle.adapter.disconnect();

  const rows = [];
  let ok = writable;
  for (const key of Object.keys(exit.answers)) {
    const same = isDeepStrictEqual(got[key], exit.answers[key]);
    if (!same) ok = false;
    const size = Array.isArray(exit.answers[key]) ? (exit.answers[key] as unknown[]).length : exit.answers[key];
    rows.push({ question: key.replace(/_?exit[0-9a-z]+/, ''), cloudflare: JSON.stringify(size), same });
    if (!same) {
      console.error('DIFF', key, '\n  cloudflare:', JSON.stringify(exit.answers[key]).slice(0, 600), '\n  node:      ', JSON.stringify(got[key]).slice(0, 600));
    }
  }
  console.table(rows);
  console.log(JSON.stringify({ tablesAndIndexes: exit.file.objects.length, rowsIn, fileBytes: fs.statSync(process.argv[2]).size, writableAfterTheMove: writable, verdict: ok ? 'SAME' : 'DIFFERENT' }));
  fs.rmSync(dataDir, { recursive: true, force: true });
  process.exit(ok ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(2);
});
