// BMG-009 AC1–AC5 through the page, with the server measured beside every step.
// Rendered text is `innerText` of #main / .drawer / .modal (the inlined bundle is not in it).
export default async ({ ev, sleep, nav, shot, requests }) => {
  const port = process.env.PORT || '8697';
  const base = `http://127.0.0.1:${port}`;
  const out = { checks: {} };
  const ok = (name, pass, detail) => {
    out.checks[name] = { pass: !!pass, detail };
    console.log((pass ? 'PASS ' : 'FAIL ') + name + (detail !== undefined ? ' — ' + JSON.stringify(detail).slice(0, 400) : ''));
  };
  const J = JSON.stringify;
  const call = async (method, p, body, headers = {}) => {
    const r = await fetch(base + p, { method, headers: { authorization: 'Bearer t0k', ...headers, ...(body ? { 'content-type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined });
    return { status: r.status, json: await r.json().catch(() => null), total: r.headers.get('x-total-count') };
  };
  const click = (sel) => ev(`(function(){var e=document.querySelector(${J(sel)}); if(!e) throw new Error('no '+${J(sel)}); e.click(); return true})()`);
  const clickText = (sel, text) =>
    ev(`(function(){var b=[...document.querySelectorAll(${J(sel)})].find(function(b){return b.textContent.trim()===${J(text)}}); if(!b) throw new Error('no '+${J(sel + ' ' + text)}+' among '+[...document.querySelectorAll(${J(sel)})].map(function(b){return b.textContent.trim()}).join('|')); b.click(); return true})()`);
  const setVal = (sel, v) =>
    ev(`(function(){var e=document.querySelector(${J(sel)}); if(!e) throw new Error('no '+${J(sel)}); var proto=e.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:e.tagName==='SELECT'?HTMLSelectElement.prototype:HTMLInputElement.prototype; Object.getOwnPropertyDescriptor(proto,'value').set.call(e,${J(v)}); e.dispatchEvent(new Event('input',{bubbles:true})); e.dispatchEvent(new Event('change',{bubbles:true})); return true})()`);
  const txt = (sel) => ev(`(function(){var e=document.querySelector(${J(sel)}); return e ? e.innerText.trim() : null})()`);
  const exists = (sel) => ev(`!!document.querySelector(${J(sel)})`);
  const count = (sel) => ev(`document.querySelectorAll(${J(sel)}).length`);
  const open = async (hash) => {
    await nav('about:blank');
    await nav(`${base}/_admin#token=t0k`);
    await sleep(1200);
    await ev(`location.hash = ${J(hash)}`);
    await sleep(1500);
  };
  const rowsOf = () => ev(`[...document.querySelectorAll('#main tbody tr')].map(function(r){return [...r.querySelectorAll('td')].map(function(c){return c.innerText.trim()})})`);
  const rec = (id) => call('GET', '/executions/' + encodeURIComponent(id));
  const waitFor = async (fn, tries = 30, ms = 300) => {
    for (let i = 0; i < tries; i++) {
      const v = await fn();
      if (v) return v;
      await sleep(ms);
    }
    return null;
  };

  // ---- AC5 + the Workflows list -----------------------------------------------------------------------
  await open('#/workflows');
  await shot('bmg009-workflows');
  let rows = await rowsOf();
  ok('AC5 the Workflows page has no textarea at rest', !(await exists('#main textarea')) && !(await exists('textarea')));
  const names = rows.map((r) => r[0].split('\n')[0].trim());
  ok('the list: Greet · Nightly digest · Ping · Slow with their step counts', J(names.slice().sort()) === J(['Greet', 'Nightly digest', 'Ping', 'Slow']) && rows.every((r) => r[1] === '1'), rows.map((r) => r.slice(0, 2)));
  const digestRow = rows.find((r) => r[0].startsWith('Nightly digest'));
  const greetRow = rows.find((r) => r[0].startsWith('Greet'));
  ok('Last run: the seeded digest run is an error chip with a time; Greet has never run', /^error/.test(digestRow[2]) && digestRow[2].length > 6 && greetRow[2] === 'never', { digest: digestRow[2], greet: greetRow[2] });
  ok('AC5 no Run payload (JSON) anywhere on the page', !/JSON/.test(await txt('#main')));

  // ---- AC1 arm 1: Greet reads body.name → a field for it -----------------------------------------------
  await ev(`(function(){var r=[...document.querySelectorAll('#main tbody tr')].find(function(r){return r.innerText.startsWith('Greet')}); [...r.querySelectorAll('button')].find(function(b){return b.textContent.trim()==='Run'}).click()})()`);
  await sleep(700);
  ok('Run opens #/workflows/greet as a drawer titled "Run Greet"', (await ev('location.hash')) === '#/workflows/greet' && (await txt('.drawer h3')) === 'Run Greet', await txt('.drawer h3'));
  const keys = await ev(`[...document.querySelectorAll('#run-payload .kv-key')].map(function(i){return i.value})`);
  ok('AC1 the drawer opens with one row per name the steps read: "name"', J(keys) === J(['name']) && /ask for “name” by name/.test(await txt('#run-inputs')), keys);
  ok('AC5 the drawer has no textarea', !(await exists('.drawer textarea')));
  await setVal('#run-payload .list-row:nth-child(1) .kv-value', 'Ann');
  await click('#run-payload .list-add');
  await sleep(200);
  await setVal('#run-payload .list-row:nth-child(2) .kv-key', 'count');
  await setVal('#run-payload .list-row:nth-child(2) .kv-type', 'number');
  await setVal('#run-payload .list-row:nth-child(2) .kv-value', '3');
  await shot('bmg009-run-drawer-greet');
  const before = requests.length;
  await clickText('.drawer-foot button', 'Run');
  await sleep(1500);
  const hash1 = await ev('location.hash');
  const id1 = /^#\/runs\/(exec_[a-z0-9]+)$/.exec(hash1 || '') ? hash1.slice('#/runs/'.length) : null;
  ok('Run lands on #/runs/<id> (the route answered 202 with the record id)', !!id1, hash1);
  const runReq = requests.slice(before).find((r) => r.method === 'POST' && /\/admin\/workflow-defs\/greet\/run$/.test(r.url));
  ok('the page asked POST /admin/workflow-defs/greet/run', !!runReq, runReq);
  const r1 = id1 ? await rec(id1) : { json: null };
  ok('AC1 GET /executions/:id — the base input equals what was typed: {name:"Ann", count:3} (number), status success', !!r1.json && J(r1.json.triggerData && r1.json.triggerData.body) === J({ name: 'Ann', count: 3 }) && r1.json.status === 'success' && r1.json.kind === 'workflow', r1.json && { body: r1.json.triggerData && r1.json.triggerData.body, status: r1.json.status, kind: r1.json.kind });
  ok('the record opened as the FED-007 dialog: the band says success, ran Greet', (await exists('.modal.wide')) && /success/.test(await txt('.modal .rec-band')) && /ran\s+Greet/.test(await txt('.modal .rec-band')), await txt('.modal .rec-band'));
  await shot('bmg009-record-greet');

  // ---- AC1 arm 2: Ping reads nothing → the key/value editor ----------------------------------------------
  await open('#/workflows/ping');
  ok('AC1 a workflow that reads nothing by name opens with an empty editor titled "What each step starts with"', (await count('#run-payload .kv-key')) === 0 && /What each step starts with/.test(await txt('#run-inputs')) && /reads nothing by name/.test(await txt('#run-inputs')));
  await click('#run-payload .list-add');
  await sleep(200);
  await setVal('#run-payload .list-row:nth-child(1) .kv-key', 'note');
  await setVal('#run-payload .list-row:nth-child(1) .kv-value', 'hi');
  await clickText('.drawer-foot button', 'Run');
  await sleep(1500);
  const hash2 = await ev('location.hash');
  const id2 = hash2 && hash2.startsWith('#/runs/exec_') ? hash2.slice('#/runs/'.length) : null;
  const r2 = id2 ? await rec(id2) : { json: null };
  ok('AC1 the key/value editor’s rows are the base input: {note:"hi"}', !!r2.json && J(r2.json.triggerData && r2.json.triggerData.body) === J({ note: 'hi' }), r2.json && r2.json.triggerData && r2.json.triggerData.body);

  // ---- AC4 + AC5 + the filter row ------------------------------------------------------------------------
  await open('#/runs');
  await shot('bmg009-runs');
  ok('AC5 the Runs page has no textarea at rest', !(await exists('textarea')));
  ok('the list opens with no filter rows and "Showing 1–N of N"', (await count('#runs-filter .filter-line')) === 0 && /^Showing 1–\d+ of \d+$/.test(await txt('#runs-count')), await txt('#runs-count'));
  rows = await rowsOf();
  ok('every row has a kind, a name, a status word: workflow/function per row', rows.length >= 5 && rows.every((r) => ['workflow', 'function'].includes(r[1])) && rows.some((r) => r[1] === 'function' && r[2] === 'hello'), rows.map((r) => r.slice(1, 5)));
  const helloRow = rows.find((r) => r[1] === 'function');
  const trgList = (await call('GET', '/admin/triggers')).json;
  const trg = (trgList.triggers || [])[0];
  ok('the function run’s Trigger cell names the trigger ("Nightly hello"), linked', !!helloRow && helloRow[3] === 'Nightly hello' && !!trg, helloRow && helloRow[3]);
  await click('#runs-filter .filter-adds button');
  await sleep(300);
  const statusOptions = await ev(`[...document.querySelector('#runs-filter select[aria-label="status value"]').options].map(function(o){return o.value})`);
  const storeStatuses = ['', 'running', 'success', 'error'];
  ok('AC4 the status row offers exactly the store’s statuses (running, success, error) and a blank', J(statusOptions) === J(storeStatuses), statusOptions);
  const fieldOptions = await ev(`[...document.querySelector('#runs-filter select[aria-label="Field"]').options].map(function(o){return o.value})`);
  ok('the fields: status · kind · name · trigger · workflow · started · duration (s)', J(fieldOptions) === J(['status', 'kind', 'name', 'trigger', 'workflow', 'started', 'duration (s)']), fieldOptions);
  ok('flat rows: no "+ Add group" and no and/or', !(await ev(`[...document.querySelectorAll('#runs-filter button')].some(function(b){return b.textContent.trim()==='+ Add group'})`)) && !(await exists('#runs-filter select[aria-label="And or or"]')));

  // ---- AC2: status is error · name contains digest · started is within the past 7 days -------------------
  await setVal('#runs-filter .filter-line:nth-child(1) select[aria-label="status value"]', 'error');
  await click('#runs-filter .filter-adds button');
  await sleep(200);
  await setVal('#runs-filter .filter-line:nth-child(2) select[aria-label="Field"]', 'name');
  await sleep(200);
  await setVal('#runs-filter .filter-line:nth-child(2) input[aria-label="name value"]', 'digest');
  await click('#runs-filter .filter-adds button');
  await sleep(200);
  await setVal('#runs-filter .filter-line:nth-child(3) select[aria-label="Field"]', 'started');
  await sleep(200);
  await setVal('#runs-filter .filter-line:nth-child(3) select[aria-label="started window"]', 'past7');
  await sleep(1200);
  await shot('bmg009-runs-filtered');
  const sentence = await txt('#runs-count');
  const lastList = requests.filter((r) => r.method === 'GET' && /\/executions\?/.test(r.url)).pop();
  const query = lastList ? lastList.url.slice(lastList.url.indexOf('?')) : '';
  ok('AC2 the page asked the route ONE query: status=error&name=digest&since=…&until=…', /status=error/.test(query) && /name=digest/.test(query) && /since=\d+/.test(query) && /until=\d+/.test(query), query);
  const route = await call('GET', '/executions' + query);
  rows = await rowsOf();
  ok('AC2 the rows equal what the route returns for the same query: two Nightly digest errors, and the count says so', route.status === 200 && rows.length === route.json.length && route.json.length === 2 && route.json.every((r) => r.workflowName === 'Nightly digest' && r.status === 'error') && rows.every((r) => r[2] === 'Nightly digest' && r[4] === 'error') && route.total === '2' && /Showing 1–2 of 2/.test(sentence), { rows: rows.map((r) => [r[2], r[4]]), route: route.json.map((r) => [r.workflowName, r.status]), total: route.total, sentence });
  ok('the sentence says the filter in words', /where status is error and name contains digest and started is within the past 7 days/.test(sentence), sentence);
  await setVal('#runs-filter .filter-line:nth-child(1) select[aria-label="status value"]', 'success');
  await sleep(1000);
  ok('changing a row re-asks: status is success + name contains digest → no runs match', (await txt('#main .empty-state')) === 'No runs match.' && /^No runs/.test(await txt('#runs-count')), await txt('#runs-count'));

  // ---- Runs of this trigger, from the trigger drawer ----------------------------------------------------
  await open('#/triggers/' + trg.id);
  ok('the trigger drawer has "Runs of this trigger"', await ev(`[...document.querySelectorAll('.drawer-foot button')].some(function(b){return b.textContent.trim()==='Runs of this trigger'})`));
  await clickText('.drawer-foot button', 'Runs of this trigger');
  await sleep(1500);
  const trgHash = await ev('location.hash');
  const trgSel = await ev(`(document.querySelector('#runs-filter select[aria-label="trigger value"]')||{}).value`);
  rows = await rowsOf();
  ok('#/runs?trigger=<id>: the Runs page opens with "trigger is Nightly hello" filled, and only that trigger’s runs', trgHash === '#/runs?trigger=' + trg.id && trgSel === trg.id && rows.length >= 1 && rows.every((r) => r[3] === 'Nightly hello'), { trgHash, trgSel, rows: rows.map((r) => r.slice(1, 4)) });
  const trgRoute = await call('GET', '/executions?trigger=' + encodeURIComponent(trg.id) + '&limit=50');
  ok('…and they are what GET /executions?trigger= answers', trgRoute.json.length === rows.length && trgRoute.json.every((r) => r.metadata && r.metadata.triggerId === trg.id), trgRoute.json.length);
  await shot('bmg009-runs-of-trigger');

  // ---- AC3: Cancel a running workflow ----------------------------------------------------------------------
  await open('#/workflows/slow');
  await clickText('.drawer-foot button', 'Run');
  await sleep(1500);
  const hash3 = await ev('location.hash');
  const id3 = hash3 && hash3.startsWith('#/runs/exec_') ? hash3.slice('#/runs/'.length) : null;
  const r3 = id3 ? await rec(id3) : { json: null };
  ok('Slow started (20 s wait) and the page landed on its record while it runs', !!r3.json && r3.json.status === 'running', r3.json && r3.json.status);
  ok('the record dialog shows "running" and a "Cancel the run" button; the list behind it wears the live chip', /running/.test(await txt('.modal .rec-band')) && (await ev(`[...document.querySelectorAll('.modal .foot button')].some(function(b){return b.textContent.trim()==='Cancel the run'})`)) && (await txt('#main .chip.accent')) === 'live', await txt('#main .chip.accent'));
  await shot('bmg009-running-live');
  await clickText('.modal .foot button', 'Cancel the run');
  await sleep(400);
  ok('Cancel asks first, in words, with the verb on the button', /stops where it is/.test(await txt('.modal .notice.bad')) && (await ev(`[...document.querySelectorAll('.modal .foot button')].map(function(b){return b.textContent.trim()}).join('|')`)).includes('Cancel the run'));
  await ev(`[...document.querySelectorAll('.modal')].pop().querySelector('.foot button.danger').click()`);
  const cancelled = await waitFor(async () => {
    const r = await rec(id3);
    return r.json && r.json.status !== 'running' ? r.json : null;
  });
  ok('AC3 the record says cancelled: status error with engineStatus "cancelled", the message says so', !!cancelled && cancelled.metadata.engineStatus === 'cancelled' && cancelled.metadata.cancelled === true && /cancelled/.test(cancelled.errorMessage || ''), cancelled && { status: cancelled.status, engineStatus: cancelled.metadata.engineStatus, errorMessage: cancelled.errorMessage });
  await sleep(1200);
  await ev(`(function(){var m=[...document.querySelectorAll('.modal')].pop(); if(m){var b=[...m.querySelectorAll('.foot button')].find(function(b){return b.textContent.trim()==='Close'}); b&&b.click();}})()`);
  await sleep(400);
  await open('#/runs');
  await sleep(500);
  rows = await rowsOf();
  const slowRow = rows.find((r) => r[2] === 'Slow');
  ok('AC3 in the list the Slow run wears "cancelled", not "error", and has no Cancel button any more', !!slowRow && slowRow[4] === 'cancelled' && !/Cancel/.test(slowRow[6] || ''), slowRow);
  ok('nothing is running: no live chip', !(await exists('#main .chip.accent')));
  await shot('bmg009-runs-cancelled');

  // ---- the Workflows list after the runs --------------------------------------------------------------------
  await open('#/workflows');
  rows = await rowsOf();
  const greetAfter = rows.find((r) => r[0].startsWith('Greet'));
  const slowAfter = rows.find((r) => r[0].startsWith('Slow'));
  const greetHref = await ev(`(function(){var r=[...document.querySelectorAll('#main tbody tr')].find(function(r){return r.innerText.startsWith('Greet')}); var a=r.querySelector('a'); return a && a.getAttribute('href')})()`);
  ok('Last run now: Greet success (linked to its record), Slow cancelled', /^success/.test(greetAfter[2]) && greetHref === '#/runs/' + id1 && /^cancelled/.test(slowAfter[2]), { greet: greetAfter[2], greetHref, slow: slowAfter[2] });
  await shot('bmg009-end');

  const n = Object.keys(out.checks).length;
  const passed = Object.values(out.checks).filter((c) => c.pass).length;
  console.log(`\n${passed}/${n} checks passed`);
  const fs = await import('fs');
  fs.writeFileSync(process.env.OUT, JSON.stringify(out, null, 2));
};
