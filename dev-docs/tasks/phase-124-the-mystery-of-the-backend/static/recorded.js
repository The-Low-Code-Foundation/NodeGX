// The public copy of the backend map answers its own /api/* calls from a recording (record.mjs), so it
// needs no backend and no server, and a visitor can change nothing anywhere. Every answer was made by the
// map's real server code on a copy of the training app's backend, as each person; this file only plays
// them back. One question is put together here rather than recorded: one row's reach, which is read off
// every person's recorded reach (the same runs, looked at from the row's side).

(() => {
  const realFetch = window.fetch.bind(window);
  const base = new URL('data/', document.currentScript.src);
  const cache = new Map();
  const safe = (s) => String(s).replace(/[^A-Za-z0-9_-]+/g, '_');
  const get = (rel, kind = 'json') => {
    if (!cache.has(rel)) cache.set(rel, realFetch(new URL(rel, base)).then((r) => (r.ok ? (kind === 'json' ? r.json() : r.text()) : Promise.reject(new Error(`No recording for ${rel}`)))));
    return cache.get(rel);
  };
  const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });

  // "What just ran": the recorded runs a visitor plays back, in the order they asked for them
  const runs = [];
  let runId = 0;
  const ran = (person, fn, ok, ms, error) =>
    runs.unshift({ id: `rec-${++runId}`, name: fn, kind: 'cloud', status: ok ? 'success' : 'error', startedAt: Date.now(), durationMs: ms ?? null, errorMessage: ok ? null : error ?? null, byMap: { person, key: null }, byKey: null });

  const lines = (text) => text.trim().split('\n').filter(Boolean).map((l) => JSON.parse(l));
  const reachOf = async (id) => lines(await get(`reach/${id ? safe(id) : 'anonymous'}.ndjson`, 'text'));

  async function recordReach(table, objectId) {
    const [{ people }, { rows }] = await Promise.all([get('people.json'), get(`rows/${safe(table)}.json`)]);
    const row = rows.find((r) => r.objectId === objectId);
    if (!row) throw new Error('No such row in the recording.');
    const all = await Promise.all(people.map(async (p) => [p, (await reachOf(p.id)).find((e) => e.type === 'done')?.summary]));
    const anon = (await reachOf(null)).find((e) => e.type === 'done')?.summary;
    const no = { allowed: false, reason: '' };
    const out = all.map(([p, s]) => {
      const hit = s?.rows?.[table]?.find((r) => r.id === objectId);
      const direct = s?.tables?.[table]?.directly ? { allowed: true, reason: '' } : no;
      const byFn = new Map();
      for (const h of hit?.hits ?? []) if (h.fn !== '(directly)' && !byFn.has(h.fn)) byFn.set(h.fn, h);
      const results = [...byFn.values()].map((h) => ({ fn: h.fn, status: 'ran', found: true, args: h.args ?? {}, from: Object.fromEntries(Object.keys(h.args ?? {}).map((k) => [k, 'what they had been shown'])) }));
      // what ran for them and didn't hand this row back
      for (const f of s?.functions ?? []) if (f.runs && !byFn.has(f.fn)) results.push({ fn: f.fn, status: 'ran', found: false, args: {} });
      for (const c of s?.changers ?? []) results.push({ fn: c.fn, status: 'not-run', why: c.why });
      const via = [...byFn.keys()];
      return { person: p, direct: { get: direct, find: direct }, results, via, reaches: !!hit };
    });
    const anonDirect = anon?.tables?.[table]?.directly ? { allowed: true, reason: '' } : no;
    return { table, row: { objectId, ...row.cells }, needles: [objectId, row.key].filter(Boolean), anonymous: { get: anonDirect, find: anonDirect }, people: out, candidates: [], recorded: true };
  }

  window.fetch = async (input, init = {}) => {
    const url = new URL(typeof input === 'string' ? input : input.url, location.href);
    if (url.origin !== location.origin || !url.pathname.includes('/api/')) return realFetch(input, init);
    const route = '/api/' + url.pathname.split('/api/').pop();
    const body = init.body ? JSON.parse(init.body) : {};
    try {
      if (route === '/api/map') return json(await get('map.json'));
      if (route === '/api/people') return json(await get('people.json'));
      if (route === '/api/rows') return json(await get(`rows/${safe(url.searchParams.get('table'))}.json`));
      if (route === '/api/check') return json(await get(`checks/${safe(url.searchParams.get('table'))}.json`));
      if (route === '/api/runs') return json({ total: runs.length, runs: runs.slice(0, 60) });
      if (route === '/api/as/everything') {
        const events = await reachOf(body.person ?? null);
        const name = events.find((e) => e.type === 'start')?.person?.name ?? 'someone';
        for (const e of events) if (e.type === 'run') ran(name, e.fn, e.status === 'ran', e.ms, e.why);
        return new Response(events.map((e) => JSON.stringify(e)).join('\n') + '\n', { headers: { 'Content-Type': 'application/x-ndjson' } });
      }
      if (route === '/api/everyone') return new Response(await get('everyone.ndjson', 'text'), { headers: { 'Content-Type': 'application/x-ndjson' } });
      if (route === '/api/as/screen') {
        const d = await get(`screen/${safe(body.person)}__${safe(body.screen)}.json`);
        if (d.error) return json({ error: d.error }, 409);
        for (const c of [...(d.extra ?? []), ...(d.calls ?? [])]) if (c.status === 'ran' || c.status === 'refused') ran(d.person.name, c.fn, c.status === 'ran', c.ms, c.why);
        return json(d);
      }
      if (route === '/api/record-reach') return json(await recordReach(body.table, body.objectId));
      if (route === '/api/table-rule')
        return json({ error: 'This is a recording of the backend, so its rules can’t be changed from here. In NodeGX, on your own backend, “Make it so” changes the rule and saves it in the project.', refused: true }, 409);
      return json({ error: 'The recording has no answer to that.' }, 404);
    } catch (e) {
      return json({ error: e.message }, 404);
    }
  };
})();
