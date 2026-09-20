'use strict';
/**
 * The load generator, and the workload it generates.
 *
 * **Closed loop, not open loop.** Each virtual user sends one request, waits
 * for the answer, and sends the next. That is what a phone does, and it is the
 * model under which "p95 at concurrency N" means something: an open-loop
 * generator that keeps firing at a fixed rate regardless of whether the server
 * is keeping up measures a queue growing without bound, and reports it as
 * latency. The knee we are looking for (§3.4) is the concurrency at which
 * service time stops absorbing more callers, and a closed loop is how you see
 * it.
 *
 * **The mix comes from the application shape, not from a round number.** §3.1
 * again: the report's app read shared programme data and wrote continuously,
 * with a profile row rewritten after every assistant question. 85:15 read:write
 * is the ratio used, it is stated in the report beside the number, and it is
 * the first thing anyone re-running this should change to match their own app.
 *
 * @module nodegx-backend/scripts/soak/drive
 */

const { settle } = require('./backend');
const { TRACKS, TIERS } = require('./dataset');

// ============================================================================
// Statistics
// ============================================================================

/**
 * Percentiles over an unsorted sample array, by nearest-rank.
 *
 * No interpolation on purpose: an interpolated p99 over a few hundred samples
 * invents a number between two real observations. Every figure this harness
 * prints is a latency some request actually had.
 */
function percentiles(samples) {
  if (!samples.length) return { n: 0, p50: null, p95: null, p99: null, max: null, mean: null };
  const sorted = [...samples].sort((a, b) => a - b);
  const at = (q) => sorted[Math.min(sorted.length - 1, Math.ceil(q * sorted.length) - 1)];
  return {
    n: sorted.length,
    p50: round(at(0.5)),
    p95: round(at(0.95)),
    p99: round(at(0.99)),
    max: round(sorted[sorted.length - 1]),
    mean: round(sorted.reduce((a, b) => a + b, 0) / sorted.length)
  };
}

const round = (n) => (n === null || n === undefined ? null : Number(n.toFixed(2)));

// ============================================================================
// The workload
// ============================================================================

/**
 * One request, timed.
 *
 * A non-2xx is recorded rather than thrown: a rate-limit refusal (429) is a
 * RESULT — SCALING.md's signal 4 — and a driver that threw on it would turn the
 * product's own backpressure into a crashed harness.
 */
async function timed(op, run) {
  const startedAt = performance.now();
  let status = 0;
  let capped = false;
  let error = null;
  try {
    const res = await run();
    status = res.status;
    capped = res.headers.get('x-nodegx-result-capped') === 'true';
    // Drain the body. Timing that excluded it would measure the headers.
    await res.arrayBuffer();
  } catch (e) {
    error = e instanceof Error ? e.message : String(e);
  }
  return { op, ms: performance.now() - startedAt, status, capped, error, ok: status >= 200 && status < 300 };
}

const json = (base, path, body) =>
  fetch(`${base}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body)
  });

/**
 * The five operations, over the Parse wire — the surface a NodeGX app's own
 * client uses, and the one the outage came through.
 *
 * `find` is the POST tunnel (`_method: 'GET'`) rather than a GET with a query
 * string, because that is what the runtime's cloudstore sends.
 */
function makeWorkload(base, counts) {
  const reads = [
    {
      name: 'programme',
      weight: 34,
      run: (user, rand) =>
        timed('programme', () =>
          json(base, '/classes/Talk', {
            _method: 'GET',
            where: { track: TRACKS[Math.floor(rand() * TRACKS.length)] },
            order: 'startsAt',
            limit: 50
          })
        )
    },
    {
      name: 'exhibitors',
      weight: 17,
      run: (user, rand) =>
        timed('exhibitors', () =>
          json(base, '/classes/Exhibitor', {
            _method: 'GET',
            where: { tier: TIERS[Math.floor(rand() * TIERS.length)] },
            limit: 50
          })
        )
    },
    {
      name: 'my-day',
      weight: 25,
      run: (user) =>
        timed('my-day', () =>
          json(base, '/classes/MyDay', { _method: 'GET', where: { attendee: user.attendee }, limit: 100 })
        )
    },
    {
      name: 'profile-read',
      weight: 9,
      run: (user) =>
        timed('profile-read', () =>
          json(base, '/classes/Profile', { _method: 'GET', where: { attendee: user.attendee }, limit: 1 })
        )
    }
  ];

  const writes = [
    {
      name: 'save-to-my-day',
      weight: 5,
      run: (user, rand) =>
        timed('save-to-my-day', () =>
          json(base, '/classes/MyDay', {
            attendee: user.attendee,
            talk: `talk-${Math.floor(rand() * counts.Talk)}`,
            day: 1 + Math.floor(rand() * 3),
            savedAt: new Date().toISOString()
          })
        )
    },
    {
      // 🔴 The write that makes this workload the one in the field report: a
      // profile row rewritten after every assistant question. It is an UPDATE
      // of an existing row, not an insert, because that is what it was — and an
      // update and an insert do not cost the same thing on one writer.
      name: 'profile-rewrite',
      weight: 10,
      run: (user, rand) =>
        timed('profile-rewrite', () =>
          fetch(`${base}/classes/Profile/${user.profileId}`, {
            method: 'PUT',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
              questionCount: ++user.questions,
              summary: `Asked about ${TRACKS[Math.floor(rand() * TRACKS.length)]}. `.repeat(8),
              refreshedAt: new Date().toISOString()
            })
          })
        )
    }
  ];

  return { reads, writes };
}

/**
 * Build the weighted operation list for a read:write split.
 *
 * `mix` is `{read, write}` percentages. The individual weights inside each half
 * keep their relative proportions, so asking for 100% writes gives the same
 * balance of "save" against "rewrite" that the mixed workload had — which is
 * what makes the writers-only arm (AC3) comparable to the ramp.
 */
function weighted(base, counts, mix) {
  const { reads, writes } = makeWorkload(base, counts);
  const bag = [];
  const fill = (ops, share) => {
    const total = ops.reduce((n, o) => n + o.weight, 0);
    if (!total || !share) return;
    for (const op of ops) {
      const slots = Math.max(1, Math.round((op.weight / total) * share));
      for (let i = 0; i < slots; i++) bag.push(op);
    }
  };
  fill(reads, mix.read);
  fill(writes, mix.write);
  if (!bag.length) throw new Error('the mix selected no operations');
  return bag;
}

/**
 * Resolve the virtual users: real `Profile` rows, so a rewrite updates a row
 * that exists.
 *
 * Paged rather than queried one at a time — `limit` is bounded by the page cap
 * this phase shipped, which is exactly the constraint every other client is
 * under, and using it here keeps the setup honest about what the product does.
 */
async function resolveUsers(base, wanted, pageSize = 1000) {
  const users = [];
  for (let skip = 0; users.length < wanted; skip += pageSize) {
    const res = await json(base, '/classes/Profile', { _method: 'GET', limit: pageSize, skip });
    if (!res.ok) throw new Error(`resolving virtual users: ${res.status} ${await res.text()}`);
    const body = await res.json();
    const rows = body.results || [];
    if (!rows.length) break;
    for (const row of rows) {
      if (users.length >= wanted) break;
      users.push({ attendee: row.attendee, profileId: row.objectId, questions: 0 });
    }
  }
  if (!users.length) throw new Error('no Profile rows — seed before driving');
  return users;
}

/**
 * Run every operation once and prove it moved something, before any of them is
 * timed.
 *
 * 🔴 **This is the difference between a ceiling and a number about nothing.**
 * A query whose `where` matches no rows answers `200` with `results: []` in
 * well under a millisecond, and a driver counting 2xx would report it as
 * enormous throughput. So would a rewrite that updated a row that does not
 * exist. Each check below reads the CONSEQUENCE — rows came back, a row was
 * created, the stored row actually changed — and not the status code.
 *
 * It runs before the ladder, on every invocation, because the thing it guards
 * against is silent: a schema change, a renamed field, a seeder that stopped
 * halfway, all produce a fast green soak reporting a fantasy.
 */
async function preflight(base, users, counts) {
  const checks = [];
  const fail = (what, detail) => {
    throw new Error(`preflight: ${what} — ${detail}\nThe workload is not exercising the backend; the numbers would be meaningless.`);
  };
  const find = async (collection, body) => {
    const res = await json(base, `/classes/${collection}`, { _method: 'GET', ...body });
    if (!res.ok) fail(`${collection} query answered ${res.status}`, await res.text());
    return (await res.json()).results || [];
  };

  for (const [collection, where] of [
    ['Talk', { track: TRACKS[0] }],
    ['Exhibitor', { tier: TIERS[0] }]
  ]) {
    const rows = await find(collection, { where, limit: 50 });
    if (!rows.length) fail(`the ${collection} read matched no rows`, `where ${JSON.stringify(where)}`);
    checks.push(`${collection}: ${rows.length} rows`);
  }

  const user = users[0];
  const mine = await find('MyDay', { where: { attendee: user.attendee }, limit: 100 });
  checks.push(`MyDay for ${user.attendee}: ${mine.length} rows`);

  const profile = await find('Profile', { where: { attendee: user.attendee }, limit: 1 });
  if (!profile.length) fail('the Profile read matched no rows', `attendee ${user.attendee}`);

  // The write that defines this workload. Assert the STORED row changed, not
  // that the PUT answered 200 — a save against a missing id can do that too.
  const marker = `preflight-${Date.now()}`;
  const put = await fetch(`${base}/classes/Profile/${user.profileId}`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ summary: marker })
  });
  if (!put.ok) fail(`the profile rewrite answered ${put.status}`, await put.text());
  const after = await find('Profile', { where: { attendee: user.attendee }, limit: 1 });
  if (!after.length || after[0].summary !== marker) {
    fail('the profile rewrite did not change the stored row', `summary is ${JSON.stringify(after[0] && after[0].summary)}`);
  }
  checks.push('Profile rewrite: the stored row changed');

  const created = await json(base, '/classes/MyDay', {
    attendee: user.attendee,
    talk: `talk-${Math.floor(counts.Talk / 2)}`,
    day: 1,
    savedAt: new Date().toISOString()
  });
  if (created.status !== 201 && created.status !== 200) fail(`the MyDay create answered ${created.status}`, await created.text());
  const body = await created.json();
  if (!body.objectId) fail('the MyDay create returned no objectId', JSON.stringify(body));
  checks.push('MyDay create: a row was created');

  return checks;
}

/**
 * Run `concurrency` virtual users against the backend for `seconds`, after
 * `warmupSeconds` of unrecorded traffic.
 *
 * 🔴 **The warmup is discarded, not merely run.** The first requests against a
 * fresh process pay for JIT, for the first read of each index into the page
 * cache, and for connection setup. Folding those into p95 would report a
 * warmup cost as a ceiling.
 */
async function drive({ base, users, counts, concurrency, seconds, warmupSeconds = 3, mix = { read: 85, write: 15 }, seed = 1 }) {
  const bag = weighted(base, counts, mix);
  const samples = [];
  const byOp = new Map();
  let errors = 0;
  let refusals = 0;
  let capped = 0;
  let completed = 0;

  const warmupUntil = Date.now() + warmupSeconds * 1000;
  const until = warmupUntil + seconds * 1000;
  let measuredFrom = null;

  const runner = async (slot) => {
    let s = (seed * 2654435761 + slot * 40503) >>> 0;
    const rand = () => {
      s = (s * 1664525 + 1013904223) >>> 0;
      return s / 0x1_0000_0000;
    };
    const user = users[slot % users.length];

    while (Date.now() < until) {
      const op = bag[Math.floor(rand() * bag.length)];
      const result = await op.run(user, rand);
      if (Date.now() < warmupUntil) continue;
      if (measuredFrom === null) measuredFrom = Date.now();
      completed++;
      if (result.capped) capped++;
      if (result.status === 429) refusals++;
      if (!result.ok) {
        errors++;
        continue;
      }
      samples.push(result.ms);
      if (!byOp.has(result.op)) byOp.set(result.op, []);
      byOp.get(result.op).push(result.ms);
    }
  };

  const startedAt = Date.now();
  await Promise.all(Array.from({ length: concurrency }, (_, i) => runner(i)));
  const wallSeconds = (Date.now() - (measuredFrom || startedAt)) / 1000;

  const perOp = {};
  for (const [name, values] of byOp) perOp[name] = percentiles(values);

  return {
    concurrency,
    seconds,
    mix,
    completed,
    errors,
    refusals,
    capped,
    wallSeconds: Number(wallSeconds.toFixed(2)),
    throughput: Number((completed / Math.max(0.001, wallSeconds)).toFixed(1)),
    latency: percentiles(samples),
    perOp
  };
}

module.exports = { drive, percentiles, resolveUsers, makeWorkload, weighted, preflight, settle };
