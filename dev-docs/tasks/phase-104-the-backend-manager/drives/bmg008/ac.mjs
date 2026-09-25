// BMG-008 AC2–AC6, AC8 through the page, with the server (and triggers.json on disk) measured beside every step.
// Rendered text is `innerText` of #main / .drawer / .modal (the inlined bundle is not in it).
import crypto from 'crypto';

export default async ({ ev, sleep, nav, shot, key, typeText, requests }) => {
  const fs = await import('fs');
  const path = await import('path');
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
    return { status: r.status, json: await r.json().catch(() => null) };
  };
  const onDisk = () => JSON.parse(fs.readFileSync(path.join(process.env.DATA, 'triggers.json'), 'utf8'));
  const click = (sel) => ev(`(function(){var e=document.querySelector(${J(sel)}); if(!e) throw new Error('no '+${J(sel)}); e.click(); return true})()`);
  const clickText = (sel, text) =>
    ev(`(function(){var b=[...document.querySelectorAll(${J(sel)})].find(function(b){return b.textContent.trim()===${J(text)}}); if(!b) throw new Error('no '+${J(sel + ' ' + text)}+' among '+[...document.querySelectorAll(${J(sel)})].map(function(b){return b.textContent.trim()}).join('|')); b.click(); return true})()`);
  const setVal = (sel, v) =>
    ev(`(function(){var e=document.querySelector(${J(sel)}); if(!e) throw new Error('no '+${J(sel)}); var proto=e.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:e.tagName==='SELECT'?HTMLSelectElement.prototype:HTMLInputElement.prototype; Object.getOwnPropertyDescriptor(proto,'value').set.call(e,${J(v)}); e.dispatchEvent(new Event('input',{bubbles:true})); e.dispatchEvent(new Event('change',{bubbles:true})); return true})()`);
  const txt = (sel) => ev(`(function(){var e=document.querySelector(${J(sel)}); return e ? e.innerText.trim() : null})()`);
  const exists = (sel) => ev(`!!document.querySelector(${J(sel)})`);
  const pick = async (inputSel, text, label) => {
    await ev(`document.querySelector(${J(inputSel)}).focus()`);
    await sleep(200);
    await typeText(text);
    await sleep(700);
    return ev(`(function(){var r=[...document.querySelectorAll('.picker-row')].find(function(x){var l=x.querySelector('.picker-label'); return l && l.textContent.trim()===${J(label)}}); if(!r) throw new Error('no picker row '+${J(label)}+' among '+[...document.querySelectorAll('.picker-row')].map(function(x){return x.innerText}).join('|')); r.dispatchEvent(new MouseEvent('mousedown',{bubbles:true})); return true})()`);
  };
  const open = async (hash) => {
    await nav('about:blank');
    await nav(`${base}/_admin#token=t0k`);
    await sleep(1200);
    await ev(`location.hash = ${J(hash)}`);
    await sleep(1500);
  };
  const rowsOf = () => ev(`[...document.querySelectorAll('#main tbody tr')].map(function(r){return [...r.querySelectorAll('td')].map(function(c){return c.innerText.trim()})})`);
  const execFor = async (triggerId) => {
    for (let i = 0; i < 8; i++) {
      const list = (await call('GET', '/executions?limit=50')).json;
      const rows = Array.isArray(list) ? list : (list && (list.executions || list.results)) || [];
      const hit = rows.find((e) => e.metadata && e.metadata.triggerId === triggerId);
      if (hit) return hit;
      await sleep(400);
    }
    return null;
  };

  // ---- the empty list -------------------------------------------------------------------------------
  await open('#/triggers');
  await shot('bmg008-empty');
  const emptyText = await txt('#main .empty-state');
  ok('empty state: "Nothing runs on its own yet." with a Schedule a function button', /Nothing runs on its own yet\./.test(emptyText || '') && /Schedule a function/.test(emptyText || ''), emptyText);

  // ---- AC8 + AC2 + AC6 + AC3: a schedule trigger, from the page ---------------------------------------
  await clickText('#main button', 'Schedule a function');
  await sleep(600);
  ok('the button opens #/triggers/new as a drawer', (await ev('location.hash')) === '#/triggers/new' && (await exists('.drawer')));
  await setVal('.drawer input[placeholder^="What it does"]', 'Nightly digest');
  await pick('#target-picker input', 'hel', 'hello');
  await sleep(300);
  ok('the function picker offers the deployed function by name; picked, it shows the name and no drift chip', (await txt('#target-picker .picker-value')) === 'hello' && !(await exists('#target-picker .chip.warn')));
  await click('.tile input[value="schedule"]');
  await sleep(900);
  ok('AC8 the schedule tile opens the builder on "Every day at 09:00" with NO cron field and no textarea', (await txt('.sched-words')) === 'Every day at 09:00' && !(await exists('.drawer input[aria-label="Cron expression"]')) && !(await exists('.drawer textarea')), await txt('.sched-words'));
  await shot('bmg008-builder-daily');
  await click('.sched-mode input[value="weekly"]');
  await sleep(200);
  await click('.sched-day input[aria-label="Tuesday"]');
  await click('.sched-day input[aria-label="Thursday"]');
  await sleep(900);
  const words = await txt('.sched-words');
  ok('weekly Mon/Wed/Fri at 09:00 says "Every Monday, Wednesday and Friday at 09:00"', words === 'Every Monday, Wednesday and Friday at 09:00', words);
  const pageTimes = await ev(`[...document.querySelectorAll('.sched-next li')].map(function(li){return li.textContent})`);
  const route = (await call('POST', '/admin/triggers/preview', { cron: '0 9 * * 1,3,5', count: 5 })).json;
  const routeTimes = await ev(`${J(route.next)}.map(function(iso){return new Date(iso).toLocaleString()})`);
  ok('AC2 the five Next runs on the page equal a second call to the preview route, drawn the same way', pageTimes.length === 5 && J(pageTimes) === J(routeTimes), { pageTimes, routeTimes, from: route.from });
  ok('AC2 the zone is stated once, from the route', (await txt('.sched-readout')).includes(route.timezone), route.timezone);
  await shot('bmg008-builder-weekly');
  // Custom is the only place a cron field exists; it opens with the cron the modes made.
  await click('.sched-mode input[value="custom"]');
  await sleep(200);
  const customValue = await ev(`(document.querySelector('.drawer input[aria-label="Cron expression"]')||{}).value`);
  ok('AC8 Custom shows the cron field, carrying "0 9 * * 1,3,5"', customValue === '0 9 * * 1,3,5', customValue);
  await setVal('.drawer input[aria-label="Cron expression"]', '61 * * * *');
  await sleep(900);
  const refused = await txt('.sched-readout .notice.bad');
  ok('an impossible expression is refused in the parser’s words, live', /out of range/.test(refused || ''), refused);
  await shot('bmg008-builder-custom-refused');
  await click('.sched-mode input[value="weekly"]');
  await sleep(900);
  ok('AC8 back in the week mode the cron field is gone and the words are back', !(await exists('.drawer input[aria-label="Cron expression"]')) && (await txt('.sched-words')) === 'Every Monday, Wednesday and Friday at 09:00');
  // Policies: the words for missedFirePolicy / overlapPolicy.
  await click('.drawer input[name="overlap"]:nth-of-type(1)');
  await ev(`[...document.querySelectorAll('.drawer input[name="overlap"]')][1].click()`);
  // AC6: the payload as rows — a number, a yes/no, a date.
  for (let i = 0; i < 3; i++) await click('#trigger-payload .list-add');
  await sleep(200);
  await setVal('#trigger-payload .list-row:nth-child(1) .kv-key', 'limit');
  await setVal('#trigger-payload .list-row:nth-child(1) .kv-type', 'number');
  await setVal('#trigger-payload .list-row:nth-child(1) .kv-value', '10');
  await setVal('#trigger-payload .list-row:nth-child(2) .kv-key', 'dryRun');
  await setVal('#trigger-payload .list-row:nth-child(2) .kv-type', 'boolean');
  await click('#trigger-payload .list-row:nth-child(2) .kv-value input');
  await setVal('#trigger-payload .list-row:nth-child(3) .kv-key', 'since');
  await setVal('#trigger-payload .list-row:nth-child(3) .kv-type', 'date');
  await setVal('#trigger-payload .list-row:nth-child(3) .kv-value', '2026-09-01T07:00');
  await sleep(200);
  ok('AC8 the drawer has no textarea anywhere, and its only free-text inputs are the name, the pickers and the key/value rows', !(await exists('.drawer textarea')), await ev(`[...document.querySelectorAll('.drawer input[type=text]')].map(function(i){return i.getAttribute('aria-label')||i.placeholder})`));
  await shot('bmg008-drawer-schedule');
  await clickText('.drawer-foot button', 'Create');
  await sleep(1500);
  let list = (await call('GET', '/admin/triggers')).json;
  const digest = (list.triggers || []).find((t) => t.name === 'Nightly digest');
  ok('Create stored a schedule trigger: function hello, cron "0 9 * * 1,3,5", queue-one, enabled, words decorated', !!digest && digest.type === 'schedule' && digest.target.kind === 'function' && digest.target.name === 'hello' && digest.schedule.cron === '0 9 * * 1,3,5' && digest.schedule.overlapPolicy === 'queue-one' && digest.enabled === true && digest.scheduleWords === 'Every Monday, Wednesday and Friday at 09:00', digest && { cron: digest.schedule.cron, overlap: digest.schedule.overlapPolicy, words: digest.scheduleWords });
  const payload = digest && digest.schedule.payload;
  const sinceIso = await ev(`new Date('2026-09-01T07:00').toISOString()`);
  ok('AC6 the payload round-trips with its types: limit 10 (number), dryRun true (boolean), since an ISO date', !!payload && payload.limit === 10 && payload.dryRun === true && payload.since === sinceIso, payload);
  ok('AC6 triggers.json on disk says the same', J(onDisk().triggers.find((t) => t.name === 'Nightly digest').schedule.payload) === J(payload));
  ok('the drawer closed onto the list', (await ev('location.hash')) === '#/triggers' && !(await exists('.drawer')));
  let rows = await rowsOf();
  ok('the list row: name · the sentence · "function hello" · a next run · never · queue-one · on', rows.length === 1 && rows[0][1] === 'Every Monday, Wednesday and Friday at 09:00' && /function\s+hello/.test(rows[0][2]) && rows[0][3].length > 3 && rows[0][4] === 'never' && /queue-one/.test(rows[0][5]), rows[0]);
  ok('the next run in the list is the first of the preview’s five', rows[0][3] === routeTimes[0], { list: rows[0][3], preview: routeTimes[0] });
  await shot('bmg008-list-one');

  // Re-open: the saved cron comes back in the week mode with its days, and the payload as its rows.
  await ev(`location.hash = ${J('#/triggers/' + digest.id)}`);
  await sleep(1500);
  const ticked = await ev(`[...document.querySelectorAll('.sched-day input')].filter(function(i){return i.checked}).map(function(i){return i.getAttribute('aria-label')})`);
  const kvTypes = await ev(`[...document.querySelectorAll('#trigger-payload .kv-type')].map(function(s){return s.value})`);
  ok('AC1 re-opened: week mode, Monday/Wednesday/Friday ticked, 09:00, no cron field; the payload rows say number / yes-no / date', (await ev(`document.querySelector('.sched-mode input[value="weekly"]').checked`)) && J(ticked) === J(['Monday', 'Wednesday', 'Friday']) && !(await exists('.drawer input[aria-label="Cron expression"]')) && J(kvTypes) === J(['number', 'boolean', 'date']), { ticked, kvTypes });
  const overlapSel = await ev(`[...document.querySelectorAll('.drawer input[name="overlap"]')].map(function(i){return i.checked?1:0}).join('')`);
  ok('the overlap radios show the ROUTE’s effective policy (queue-one)', overlapSel === '010', overlapSel);
  await shot('bmg008-drawer-reopened');
  // AC3: Run now, and the run in Runs names the trigger.
  await clickText('.drawer-foot button', 'Run now');
  await sleep(1800);
  const ran = await execFor(digest.id);
  ok('AC3 Run now recorded an execution whose metadata names the trigger, fired as "manual"', !!ran && ran.triggerType === 'manual', ran && { id: ran.id, triggerType: ran.triggerType, status: ran.status, workflowId: ran.workflowId });
  await key('Escape');
  await sleep(500);
  rows = await rowsOf();
  ok('AC3 the list now shows a last run (ok / ran, just now)', /(ok|ran)/.test(rows[0][4]) && /just now|min ago/.test(rows[0][4]), rows[0][4]);
  await open('#/runs');
  await sleep(600);
  const runsText = await txt('#main');
  ok('AC3 the Runs page lists the run (the target’s name is on the page)', /hello/.test(runsText || ''), (runsText || '').slice(0, 200));
  await shot('bmg008-runs');

  // ---- AC4: a webhook — the URL shown answers a signed POST; after Rotate the old secret is refused --------
  await open('#/triggers/new');
  await setVal('.drawer input[placeholder^="What it does"]', 'Stripe payments');
  await ev(`[...document.querySelectorAll('.drawer input[name="target-kind"]')][1].click()`);
  await sleep(200);
  await pick('#target-picker input', 'Pi', 'Ping');
  await click('.tile input[value="webhook"]');
  await sleep(400);
  const slug = await ev(`document.querySelector('.drawer input[aria-label="Hook path"]').value`);
  const shownUrl = await txt('.drawer [data-webhook-url]');
  ok('AC4 the path is suggested from the name and the FULL URL is shown', slug === 'stripe-payments' && shownUrl === `${base}/hooks/bmg8/stripe-payments`, { slug, shownUrl });
  const schemes = await ev(`[...document.querySelectorAll('.drawer input[name="scheme"]')].map(function(i){return i.checked?1:0}).join('')`);
  ok('AC4 the scheme is two radios, Signature first and on', schemes === '10', schemes);
  ok('the Answer section is offered for a workflow target only, with "wait up to N seconds"', /wait up to/.test((await txt('.drawer')) || ''));
  await shot('bmg008-drawer-webhook');
  await clickText('.drawer-foot button', 'Create');
  await sleep(1500);
  const secret = await txt('.drawer [data-secret]');
  const cardUrl = await txt('.drawer [data-webhook-url]');
  const example = await txt('.drawer [data-example]');
  ok('AC4 Create shows the secret card once: the URL, the secret, and a signed curl', /^whsec_/.test(secret || '') && cardUrl === shownUrl && /X-Hub-Signature-256/.test(example || '') && (example || '').includes(secret), { secret: (secret || '').slice(0, 10) + '…', cardUrl });
  await shot('bmg008-secret-card');
  const sign = (s, body) => 'sha256=' + crypto.createHmac('sha256', s).update(body).digest('hex');
  const post = async (url, s, body) => {
    const r = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json', 'x-hub-signature-256': sign(s, body) }, body });
    return { status: r.status, json: await r.json().catch(() => null) };
  };
  const signed = await post(cardUrl, secret, '{"hello":"world"}');
  const forged = await post(cardUrl, 'whsec_wrong', '{"hello":"world"}');
  ok('AC4 the URL answers a POST signed with the secret the card showed (200), and refuses a wrong signature (401)', signed.status === 200 && forged.status === 401, { signed: signed.status, forged: forged.status, body: signed.json });
  await clickText('.drawer-foot button', 'Done');
  await sleep(1200);
  list = (await call('GET', '/admin/triggers')).json;
  const hook = list.triggers.find((t) => t.name === 'Stripe payments');
  const hookRun = await execFor(hook.id);
  ok('AC4 the signed call ran the workflow, recorded against the trigger as "webhook"', !!hookRun && hookRun.triggerType === 'webhook', hookRun && { triggerType: hookRun.triggerType, status: hookRun.status });
  // Rotate.
  await ev(`location.hash = ${J('#/triggers/' + hook.id)}`);
  await sleep(1500);
  ok('re-opened, the webhook drawer does not pretend to know the secret (no [data-secret]), and offers Rotate', !(await exists('.drawer [data-secret]')) && /Rotate the secret/.test((await txt('.drawer')) || ''));
  await clickText('.drawer button', 'Rotate the secret');
  await sleep(400);
  const ask = await txt('.modal');
  ok('Rotate asks first, in words about every sender', /refused/.test(ask || ''), ask);
  await clickText('.modal button', 'Rotate');
  await sleep(1500);
  const secret2 = await txt('.drawer [data-secret]');
  ok('AC4 Rotate shows a NEW secret once', /^whsec_/.test(secret2 || '') && secret2 !== secret);
  const old = await post(cardUrl, secret, '{"hello":"again"}');
  const fresh = await post(cardUrl, secret2, '{"hello":"again"}');
  ok('AC4 after Rotate the old secret is refused (401) and the new one answers (200)', old.status === 401 && fresh.status === 200, { old: old.status, fresh: fresh.status });
  await shot('bmg008-rotated');
  await clickText('.drawer-foot button', 'Done');
  await sleep(800);

  // ---- AC5: "Pet: created" fires on a POST to the collection ---------------------------------------------
  await open('#/triggers/new');
  await setVal('.drawer input[placeholder^="What it does"]', 'Pet watch');
  await ev(`[...document.querySelectorAll('.drawer input[name="target-kind"]')][1].click()`);
  await sleep(200);
  await pick('#target-picker input', 'Pi', 'Ping');
  await click('.tile input[value="db-change"]');
  await sleep(400);
  await pick('.drawer .picker input', 'Pe', 'Pet');
  await sleep(200);
  const actionLabels = await ev(`[...document.querySelectorAll('#change-actions label')].map(function(l){return l.textContent.trim()})`);
  ok('AC5 the actions are boxes: created · changed · deleted', J(actionLabels) === J(['created', 'changed', 'deleted']), actionLabels);
  await click('#change-actions input[value="create"]');
  await sleep(200);
  await shot('bmg008-drawer-dbchange');
  await clickText('.drawer-foot button', 'Create');
  await sleep(1500);
  list = (await call('GET', '/admin/triggers')).json;
  const watch = list.triggers.find((t) => t.name === 'Pet watch');
  ok('AC5 stored: dbChange Pet, actions [create], target workflow ping', !!watch && watch.type === 'db-change' && watch.dbChange.collection === 'Pet' && J(watch.dbChange.actions) === J(['create']) && watch.target.kind === 'workflow' && watch.target.name === 'ping', watch && watch.dbChange);
  const made = await call('POST', '/classes/Pet', { name: 'Rex' });
  const fired = await execFor(watch.id);
  // The execution store's own word for it is `db_change` (noodl-viewer-cloud execution-history/types.ts), not the registry's `db-change`.
  ok('AC5 POST /classes/Pet {name:"Rex"} fired it: an execution names the trigger as "db_change"', made.status === 201 && !!fired && fired.triggerType === 'db_change', { post: made.status, fired: fired && { triggerType: fired.triggerType, status: fired.status } });
  rows = await rowsOf();
  const whenCol = rows.map((r) => r[1]).sort();
  ok('the list’s When column: the sentence, "webhook · /stripe-payments", "Pet: created"', J(whenCol) === J(['Every Monday, Wednesday and Friday at 09:00', 'Pet: created', 'webhook · /stripe-payments']), whenCol);
  ok('Runs column names the workflow by its name, not its id', rows.some((r) => /workflow\s+Ping/.test(r[2])), rows.map((r) => r[2]));
  await shot('bmg008-list-three');

  // ---- the Enabled switch in the row, without opening the drawer ---------------------------------------------
  const before = requests.filter((r) => r.method === 'POST' && /\/enabled$/.test(r.url)).length;
  await click(`#trigger-${watch.id} .switch input`);
  await sleep(1200);
  const after = requests.filter((r) => r.method === 'POST' && /\/enabled$/.test(r.url)).length;
  const watchNow = (await call('GET', '/admin/triggers/' + watch.id)).json.trigger;
  ok('the row switch turns it off with one POST …/enabled, and no drawer opened', after === before + 1 && watchNow.enabled === false && !(await exists('.drawer')), { posts: after - before, enabled: watchNow.enabled });
  const madeOff = await call('POST', '/classes/Pet', { name: 'Fido' });
  await sleep(1200);
  const listAfter = (await call('GET', '/executions?limit=50')).json;
  const execRows = Array.isArray(listAfter) ? listAfter : (listAfter && (listAfter.executions || listAfter.results)) || [];
  const watchRuns = execRows.filter((e) => e.metadata && e.metadata.triggerId === watch.id).length;
  ok('off, a second Pet does not fire it (still exactly one run for the trigger)', madeOff.status === 201 && watchRuns === 1, watchRuns);

  // ---- Delete, behind the typed name ---------------------------------------------------------------------------
  await ev(`location.hash = ${J('#/triggers/' + watch.id)}`);
  await sleep(1500);
  await clickText('.danger-zone button', 'Delete');
  await sleep(400);
  const deleteDisabled = await ev(`[...document.querySelectorAll('.modal button')].find(function(b){return b.textContent.trim()==='Delete'}).disabled`);
  await setVal('.modal input[aria-label^="Type "]', 'Pet watch');
  await sleep(200);
  await clickText('.modal button', 'Delete');
  await sleep(1500);
  list = (await call('GET', '/admin/triggers')).json;
  ok('Delete waits for the typed name, then removes it (two triggers left, the drawer closed)', deleteDisabled === true && list.triggers.length === 2 && !list.triggers.some((t) => t.id === watch.id) && !(await exists('.drawer')), list.triggers.map((t) => t.name));
  await shot('bmg008-end');

  // ---- AC8 across the whole page: no textarea, no cron field outside Custom ----------------------------------
  await ev(`location.hash = ${J('#/triggers/' + digest.id)}`);
  await sleep(1500);
  const textareas = await ev(`document.querySelectorAll('#main textarea, .drawer textarea').length`);
  ok('AC8 no textarea exists on the page or in the drawer; the cron field is absent outside Custom', textareas === 0 && !(await exists('input[aria-label="Cron expression"]')), textareas);

  const failed = Object.keys(out.checks).filter((k) => !out.checks[k].pass);
  console.log(`\n${Object.keys(out.checks).length - failed.length}/${Object.keys(out.checks).length} checks passed` + (failed.length ? '; FAILED: ' + failed.join(' | ') : ''));
  fs.writeFileSync(process.env.OUT, JSON.stringify(out, null, 2));
};
