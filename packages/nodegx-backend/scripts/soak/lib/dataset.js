'use strict';
/**
 * The workload's data: five collections shaped like the app in Richard's field
 * report, their indexes, and a seeder that fills them.
 *
 * 🔴 **The shape is not invented, and it is not chosen to flatter the number.**
 * PRD-004 §3.1 is explicit that a read-mostly workload would. The app that
 * produced the outage read shared conference data *and* wrote continuously:
 * "my day" saves, and a profile row rewritten **after every AI assistant
 * question**. That last one is the important one — an AI-driven write rate
 * scales with engagement, not with content volume, so a conference app's write
 * load does not flatten out once the programme is published.
 *
 * So: `Talk` and `Exhibitor` are small and read constantly; `Attendee` is large
 * and read by id; `MyDay` is large and written by ordinary use; `Profile` is
 * one row per attendee, rewritten far more often than it is created.
 *
 * 🔴 **The indexes are declared** (§3.2). A load test against an unindexed
 * table measures a table scan, and every app that gets as far as caring about
 * this has declared its indexes. They are the ones the queries below actually
 * use, and no others — an index nothing reads is a write cost with no read
 * benefit, and adding a few for luck would move the write number.
 *
 * @module nodegx-backend/scripts/soak/dataset
 */

const TRACKS = ['platform', 'design', 'research', 'ops', 'community', 'keynote'];
const TIERS = ['diamond', 'gold', 'silver', 'startup'];
const DAYS = [1, 2, 3];

/**
 * The collections, their columns and their indexes.
 *
 * Column types are the ones `POST /admin/schema` takes. `Date` columns are sent
 * as ISO strings, which is what every client on this wire sends.
 */
const SCHEMA = [
  {
    table: 'Talk',
    columns: [
      { name: 'slug', type: 'String' },
      { name: 'track', type: 'String' },
      { name: 'day', type: 'Number' },
      { name: 'room', type: 'String' },
      { name: 'title', type: 'String' },
      { name: 'startsAt', type: 'Date' },
      { name: 'capacity', type: 'Number' }
    ],
    // The programme is read as "this track, in time order" and "this day".
    indexes: [{ fields: ['slug'], unique: true }, { fields: ['track', 'startsAt'] }, { fields: ['day'] }]
  },
  {
    table: 'Exhibitor',
    columns: [
      { name: 'slug', type: 'String' },
      { name: 'name', type: 'String' },
      { name: 'tier', type: 'String' },
      { name: 'hall', type: 'String' }
    ],
    indexes: [{ fields: ['slug'], unique: true }, { fields: ['tier'] }]
  },
  {
    table: 'Attendee',
    columns: [
      { name: 'handle', type: 'String' },
      { name: 'name', type: 'String' },
      { name: 'company', type: 'String' },
      { name: 'country', type: 'String' }
    ],
    indexes: [{ fields: ['handle'], unique: true }, { fields: ['company'] }]
  },
  {
    table: 'MyDay',
    columns: [
      { name: 'attendee', type: 'String' },
      { name: 'talk', type: 'String' },
      { name: 'day', type: 'Number' },
      { name: 'savedAt', type: 'Date' }
    ],
    // Read as "everything this attendee saved"; written once per save.
    indexes: [{ fields: ['attendee', 'day'] }, { fields: ['attendee'] }]
  },
  {
    table: 'Profile',
    columns: [
      { name: 'attendee', type: 'String' },
      { name: 'summary', type: 'String' },
      { name: 'questionCount', type: 'Number' },
      { name: 'interests', type: 'String' },
      { name: 'refreshedAt', type: 'Date' }
    ],
    // One row per attendee, found by attendee and rewritten in place.
    indexes: [{ fields: ['attendee'], unique: true }]
  }
];

/**
 * Row counts at `scale: 1` — a mid-size conference, which is the shape the
 * question was asked about.
 *
 * 🔴 These are recorded in the report, because a ceiling measured at 1,000 rows
 * is not a ceiling (§3.2). `--scale` multiplies them so a smoke run can prove
 * the harness works without waiting for a quarter of a million inserts.
 */
const BASE_ROWS = { Talk: 1200, Exhibitor: 800, Attendee: 40_000, MyDay: 200_000, Profile: 40_000 };

function rowCounts(scale) {
  const at = (n) => Math.max(1, Math.round(n * scale));
  return {
    Talk: at(BASE_ROWS.Talk),
    Exhibitor: at(BASE_ROWS.Exhibitor),
    Attendee: at(BASE_ROWS.Attendee),
    MyDay: at(BASE_ROWS.MyDay),
    Profile: at(BASE_ROWS.Profile)
  };
}

/** Deterministic pseudo-random, so two runs seed the same database. */
function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0x1_0000_0000;
  };
}

const CONFERENCE_START = Date.UTC(2026, 4, 12, 9, 0, 0);

function makeRow(table, i, rand, counts) {
  switch (table) {
    case 'Talk':
      return {
        slug: `talk-${i}`,
        track: TRACKS[i % TRACKS.length],
        day: DAYS[i % DAYS.length],
        room: `room-${i % 40}`,
        title: `A talk about ${TRACKS[i % TRACKS.length]} number ${i}`,
        startsAt: new Date(CONFERENCE_START + (i % 400) * 15 * 60_000).toISOString(),
        capacity: 40 + (i % 12) * 25
      };
    case 'Exhibitor':
      return {
        slug: `exhibitor-${i}`,
        name: `Exhibitor ${i}`,
        tier: TIERS[i % TIERS.length],
        hall: `hall-${i % 6}`
      };
    case 'Attendee':
      return {
        handle: `attendee-${i}`,
        name: `Attendee ${i}`,
        company: `Company ${i % 4000}`,
        country: ['GB', 'US', 'DE', 'FR', 'NL', 'SE'][i % 6]
      };
    case 'MyDay': {
      const attendee = `attendee-${Math.floor(rand() * counts.Attendee)}`;
      return {
        attendee,
        talk: `talk-${Math.floor(rand() * counts.Talk)}`,
        day: DAYS[i % DAYS.length],
        savedAt: new Date(CONFERENCE_START + i * 1000).toISOString()
      };
    }
    case 'Profile':
      return {
        attendee: `attendee-${i}`,
        // Roughly the size an assistant-written summary actually is. A 40-byte
        // string here would make the write number a statement about 40 bytes.
        summary: `Interested in ${TRACKS[i % TRACKS.length]}. `.repeat(8),
        questionCount: 0,
        interests: TRACKS.slice(0, 1 + (i % 4)).join(','),
        refreshedAt: new Date(CONFERENCE_START).toISOString()
      };
    default:
      throw new Error(`no generator for ${table}`);
  }
}

/**
 * Declare every collection and its indexes.
 *
 * Done before seeding on purpose: creating the index after the rows is faster,
 * and is not what an app does. The write cost of maintaining an index on every
 * insert belongs in the number.
 */
async function declareSchema(base, adminToken) {
  const created = [];
  for (const decl of SCHEMA) {
    const res = await fetch(`${base}/admin/schema`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ action: 'createTable', table: decl.table, columns: decl.columns, indexes: decl.indexes })
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(`createTable ${decl.table} answered ${res.status}: ${JSON.stringify(json)}`);
    created.push({ table: decl.table, indexes: json.indexesCreated || [] });
  }
  return created;
}

/**
 * Fill the collections through `POST /api/_batch` — the ordinary write path,
 * with the schema and the indexes in place.
 *
 * `onProgress` gets `{table, done, total, rowsPerSecond}` so a long seed says
 * what it is doing; a silent twenty-minute wait is indistinguishable from a
 * hang.
 */
async function seed(base, adminToken, { scale = 1, batchSize = 500, onProgress = () => {} } = {}) {
  const counts = rowCounts(scale);
  const rand = rng(20260920);
  const report = {};

  for (const decl of SCHEMA) {
    const table = decl.table;
    const total = counts[table];
    const startedAt = Date.now();
    let done = 0;

    while (done < total) {
      const n = Math.min(batchSize, total - done);
      const operations = [];
      for (let k = 0; k < n; k++) {
        operations.push({ method: 'create', collection: table, data: makeRow(table, done + k, rand, counts) });
      }
      const res = await fetch(`${base}/api/_batch`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({ operations })
      });
      if (!res.ok) throw new Error(`seed ${table} batch answered ${res.status}: ${await res.text()}`);
      const body = await res.json();
      const failed = (body.results || []).filter((r) => r && r.error);
      if (failed.length) {
        throw new Error(`seed ${table}: ${failed.length}/${n} rows refused, first: ${failed[0].error}`);
      }
      done += n;
      onProgress({
        table,
        done,
        total,
        rowsPerSecond: Math.round(done / Math.max(0.001, (Date.now() - startedAt) / 1000))
      });
    }

    report[table] = { rows: total, seconds: Number(((Date.now() - startedAt) / 1000).toFixed(1)) };
  }

  return { counts, report };
}

module.exports = { SCHEMA, BASE_ROWS, rowCounts, declareSchema, seed, TRACKS, TIERS, DAYS };
