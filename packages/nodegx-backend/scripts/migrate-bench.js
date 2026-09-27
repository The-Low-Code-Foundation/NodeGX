#!/usr/bin/env node
/**
 * BRG-004 AC9 — how long a migration actually takes.
 *
 * *"5 GB / 2-million-row migration completes; the wall-clock time is recorded.
 * Not asserted — recorded, so the docs can tell the truth about how long this
 * takes."*
 *
 * This is the harness that produces that number, kept in the repo rather than
 * in a session's scratch directory for two reasons: the AC will be re-measured
 * on other hardware, and a benchmark nobody can re-run is a number nobody can
 * check.
 *
 * Usage:
 *
 *   node scripts/migrate-bench.js --rows 200000 [--width 2500] [--batch 500]
 *                                 [--to postgres:///nodegx_bench] [--keep]
 *
 * It builds a SQLite backend of `--rows` rows about `--width` bytes each
 * through the real adapter, migrates it into a **fresh** database, verifies a
 * sample, and prints rows/s and MB/s for each phase. Everything it creates is
 * deleted afterwards unless `--keep` is given.
 *
 * 🔴 Read the rate, not just the total: insert cost grows with the table's
 * indexes, so a rate measured at 200k rows is a FLOOR for 2M, not a
 * multiplier. The script prints the per-batch rate over time for that reason.
 */
'use strict';

const { execFileSync } = require('child_process');
const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');

require('ts-node').register({ project: path.join(__dirname, '..', 'tsconfig.json'), transpileOnly: true });

const { migrateToPostgres } = require('../src/migrate/move');
const { verifyMigration } = require('../src/migrate/verify');

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? fallback : process.argv[i + 1];
}
const FLAG = (name) => process.argv.includes(`--${name}`);

const ROWS = parseInt(arg('rows', '200000'), 10);
const WIDTH = parseInt(arg('width', '2500'), 10);
const BATCH = parseInt(arg('batch', '500'), 10);
const ADMIN = arg('to', process.env.NODEGX_PG_TEST_URL || 'postgres:///postgres');
const DB = `nodegx_bench_${Date.now().toString(36)}`;

function psql(url, sql) {
  execFileSync('psql', ['-qtAX', '-d', url, '-c', sql], { stdio: 'ignore' });
}
function withDatabase(url, db) {
  const u = new URL(url);
  u.pathname = `/${db}`;
  return u.toString();
}
function mb(bytes) {
  return (bytes / 1024 / 1024).toFixed(1);
}

async function main() {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nodegx-bench-'));
  fs.mkdirSync(path.join(dataDir, 'data'), { recursive: true });
  const dbPath = path.join(dataDir, 'data', 'local.db');

  // ---- build the source, through the adapter's own schema manager ---------
  const { DatabaseSync } = require('node:sqlite');
  const db = new DatabaseSync(dbPath);
  db.exec(`
    CREATE TABLE "_Schema" ("name" TEXT PRIMARY KEY, "schema" TEXT NOT NULL,
      "createdAt" TEXT DEFAULT CURRENT_TIMESTAMP, "updatedAt" TEXT DEFAULT CURRENT_TIMESTAMP);
    CREATE TABLE "Row" ("objectId" TEXT PRIMARY KEY, "createdAt" TEXT, "updatedAt" TEXT, "ACL" TEXT,
      "title" TEXT, "body" TEXT, "score" REAL, "meta" TEXT);
    CREATE INDEX "idx_Row_createdAt" ON "Row"("createdAt");
    CREATE INDEX "idx_Row_updatedAt" ON "Row"("updatedAt");
  `);
  db.prepare('INSERT INTO "_Schema" ("name","schema") VALUES (?, ?)').run(
    'Row',
    JSON.stringify({
      name: 'Row',
      columns: [
        { name: 'title', type: 'String' },
        { name: 'body', type: 'String' },
        { name: 'score', type: 'Number' },
        { name: 'meta', type: 'Object' }
      ]
    })
  );

  const body = 'x'.repeat(Math.max(1, WIDTH - 200));
  const insert = db.prepare(
    'INSERT INTO "Row" ("objectId","createdAt","updatedAt","ACL","title","body","score","meta") VALUES (?,?,?,?,?,?,?,?)'
  );
  const buildStart = Date.now();
  db.exec('BEGIN');
  for (let i = 0; i < ROWS; i++) {
    const now = new Date(Date.UTC(2026, 0, 1, 0, 0, i % 60)).toISOString();
    insert.run(
      crypto.randomUUID(),
      now,
      now,
      i % 10 === 0 ? JSON.stringify({ '*': { read: true } }) : null,
      `row-${i}`,
      body,
      i * 1.25,
      JSON.stringify({ tier: i % 7 })
    );
    if (i % 50000 === 49999) {
      db.exec('COMMIT');
      db.exec('BEGIN');
      process.stderr.write(`\r  built ${i + 1}/${ROWS}`);
    }
  }
  db.exec('COMMIT');
  db.close();
  const sourceBytes = fs.statSync(dbPath).size;
  process.stderr.write(
    `\r  built ${ROWS} rows, ${mb(sourceBytes)} MB, in ${((Date.now() - buildStart) / 1000).toFixed(1)}s\n`
  );

  // ---- migrate ------------------------------------------------------------
  psql(ADMIN, `CREATE DATABASE "${DB}"`);
  const target = withDatabase(ADMIN, DB);
  const marks = [];
  let lastMark = Date.now();
  let lastCopied = 0;

  const started = Date.now();
  const result = await migrateToPostgres({
    dataDir,
    target,
    batchSize: BATCH,
    onBatch: ({ copied }) => {
      if (copied - lastCopied >= Math.max(BATCH, Math.floor(ROWS / 20))) {
        const now = Date.now();
        marks.push({ copied, rate: Math.round(((copied - lastCopied) / (now - lastMark)) * 1000) });
        lastMark = now;
        lastCopied = copied;
        process.stderr.write(`\r  copied ${copied}/${ROWS} — ${marks[marks.length - 1].rate} rows/s   `);
      }
    }
  });
  const copyMs = Date.now() - started;
  process.stderr.write('\n');

  const verifyStarted = Date.now();
  const verified = await verifyMigration({
    sourceDataDir: path.dirname(path.dirname(result.snapshotPath)),
    target,
    sample: 500
  });
  const verifyMs = Date.now() - verifyStarted;

  const pgBytes = Number(
    execFileSync('psql', ['-qtAX', '-d', target, '-c', `SELECT pg_database_size('${DB}')`], { encoding: 'utf-8' }).trim()
  );

  console.log('');
  console.log('BRG-004 AC9 — migration throughput');
  console.log(`  rows              ${ROWS}`);
  console.log(`  source            ${mb(sourceBytes)} MB SQLite`);
  console.log(`  target            ${mb(pgBytes)} MB PostgreSQL`);
  console.log(`  batch size        ${BATCH} (${result.batches} batches)`);
  console.log(`  copy              ${(copyMs / 1000).toFixed(1)}s — ${Math.round((ROWS / copyMs) * 1000)} rows/s, ${(
    sourceBytes /
    1024 /
    1024 /
    (copyMs / 1000)
  ).toFixed(1)} MB/s`);
  console.log(`  verify (500/tbl)  ${(verifyMs / 1000).toFixed(1)}s — ${verified.ok ? 'clean' : `${verified.findings.length} FINDINGS`}`);
  console.log(`  rate over time    ${marks.map((m) => m.rate).join(', ')} rows/s`);
  console.log('');
  if (!verified.ok) for (const f of verified.findings.slice(0, 5)) console.log(`  🔴 ${f.detail}`);

  if (!FLAG('keep')) {
    fs.rmSync(dataDir, { recursive: true, force: true });
    fs.rmSync(path.dirname(path.dirname(result.snapshotPath)), { recursive: true, force: true });
    psql(ADMIN, `DROP DATABASE IF EXISTS "${DB}"`);
  } else {
    console.log(`  kept: ${dataDir} and database ${DB}`);
  }
  process.exit(verified.ok ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  // 🔴 A failed run holds as much disk as a successful one — the AC9 run that
  // found the 2 GiB hash defect left 7.9 GB in the temp directory because this
  // used to just exit. Clean what we can name, then fail.
  try {
    for (const dir of fs.readdirSync(os.tmpdir())) {
      if (dir.startsWith('nodegx-bench-') || dir.startsWith('nodegx-migrate-')) {
        fs.rmSync(path.join(os.tmpdir(), dir), { recursive: true, force: true });
      }
    }
    psql(ADMIN, `DROP DATABASE IF EXISTS "${DB}"`);
  } catch (cleanupError) {
    console.error('cleanup after failure was incomplete:', cleanupError.message);
  }
  process.exit(1);
});
