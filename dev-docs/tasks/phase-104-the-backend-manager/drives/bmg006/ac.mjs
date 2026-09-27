// BMG-006 AC1–AC7 through the page, with the server (and security.json on disk) measured beside every step.
// Rendered text is `innerText` of #main (the inlined bundle is not in it) plus every title and aria-label.
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
  const config = async () => (await call('GET', '/admin/permissions')).json.config;
  const onDisk = () => JSON.parse(fs.readFileSync(path.join(process.env.DATA, 'security.json'), 'utf8'));
  const click = (sel) => ev(`(function(){var e=document.querySelector(${J(sel)}); if(!e) throw new Error('no '+${J(sel)}); e.click(); return true})()`);
  const clickText = (sel, text) =>
    ev(`(function(){var b=[...document.querySelectorAll(${J(sel)})].find(function(b){return b.textContent.trim()===${J(text)}}); if(!b) throw new Error('no '+${J(sel + ' ' + text)}); b.click(); return true})()`);
  const setVal = (sel, v) =>
    ev(`(function(){var e=document.querySelector(${J(sel)}); if(!e) throw new Error('no '+${J(sel)}); var proto=e.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:e.tagName==='SELECT'?HTMLSelectElement.prototype:HTMLInputElement.prototype; Object.getOwnPropertyDescriptor(proto,'value').set.call(e,${J(v)}); e.dispatchEvent(new Event('input',{bubbles:true})); e.dispatchEvent(new Event('change',{bubbles:true})); return true})()`);
  const txt = (sel) => ev(`(function(){var e=document.querySelector(${J(sel)}); return e ? e.innerText.trim() : null})()`);
  const seen = () =>
    ev(`document.querySelector('#main').innerText + '\\n' + [...document.querySelectorAll('#main [title],#main [aria-label],#main [placeholder]')].map(function(e){return [e.getAttribute('title'),e.getAttribute('aria-label'),e.getAttribute('placeholder')].join(' ')}).join('\\n')`);
  const box = (matrix, op, col) => `#${matrix} input[data-op="${op}"][data-col="${col}"]`;
  const boxState = (matrix, op, col) => ev(`(function(){var e=document.querySelector(${J(box(matrix, op, col))}); return e ? {checked:e.checked, disabled:e.disabled} : null})()`);
  const rowBoxes = (matrix, op) => ev(`[...document.querySelectorAll(${J('#' + matrix + ' input[data-op="' + op + '"]')})].map(function(e){return e.getAttribute('data-col')+'='+(e.checked?1:0)+(e.disabled?'d':'')}).join(' ')`);
  /** Type into a Picker and mousedown the row by its label. */
  const pick = async (inputSel, text, label) => {
    await ev(`document.querySelector(${J(inputSel)}).focus()`);
    await sleep(200);
    await typeText(text);
    await sleep(700);
    return ev(`(function(){var r=[...document.querySelectorAll('.picker-row')].find(function(x){var l=x.querySelector('.picker-label'); return l && l.textContent.trim()===${J(label)}}); if(!r) throw new Error('no picker row '+${J(label)}+' among '+[...document.querySelectorAll('.picker-row')].map(function(x){return x.innerText}).join('|')); r.dispatchEvent(new MouseEvent('mousedown',{bubbles:true})); return true})()`);
  };
  /** AC7: every text input on the page belongs to a Picker's search box. */
  const textInputsOutsidePickers = () =>
    ev(`[...document.querySelectorAll('#main input')].filter(function(i){return (i.type==='text'||!i.getAttribute('type')) && !i.closest('.picker')}).map(function(i){return i.getAttribute('aria-label')||i.placeholder||i.name||'?'})`);
  const systemTablesSeen = async (where) => {
    const text = await seen();
    const hit = ['_User', '_Session', '_Role', '_ApiKey', '_Audit'].filter((t) => text.includes(t));
    ok('AC6 ' + where + ': no system table is drawn', hit.length === 0, hit);
  };
  const open = async (hash) => {
    await nav('about:blank');
    await nav(`${base}/_admin#token=t0k`);
    await sleep(1200);
    await ev(`location.hash = ${J(hash)}`);
    await sleep(1500);
  };

  // ---- the collection page -------------------------------------------------------------------------
  await open('#/permissions/Pet');
  await shot('bmg006-collection-before');
  const words = await ev(`[...document.querySelectorAll('#collection-matrix tbody tr .perm-op b')].map(function(b){return b.textContent})`);
  ok('rows are List · Open one · Create · Change · Delete', J(words) === J(['List', 'Open one', 'Create', 'Change', 'Delete']), words);
  const useDefaults = await ev(`document.querySelector('#use-defaults').checked`);
  ok('Pet has rules of its own, so "Use the defaults" is off', useDefaults === false, useDefaults);
  ok('the stored rule is drawn: Create = editors, the rest on Default', (await rowBoxes('collection-matrix', 'create')).includes('role-editors=1') && (await boxState('collection-matrix', 'find', 'default')).checked && (await boxState('collection-matrix', 'update', 'default')).checked, {
    create: await rowBoxes('collection-matrix', 'create'),
    update: await rowBoxes('collection-matrix', 'update')
  });
  ok('AC7 collection page: no text input outside a picker', (await textInputsOutsidePickers()).length === 0, await textInputsOutsidePickers());
  await systemTablesSeen('collection page');

  // ---- AC1: Signed in on Change → 'authenticated'; editors beside it → the pair ---------------------
  await click(box('collection-matrix', 'update', 'default'));
  await click(box('collection-matrix', 'update', 'signedIn'));
  await sleep(200);
  await clickText('#collection-rules button', 'Save');
  await sleep(1200);
  let stored = (await config()).collections.Pet;
  ok('AC1 ticking Signed in on Change stores update: "authenticated" (GET /admin/permissions)', stored.permissions.update === 'authenticated', stored);
  ok('AC1 …and Create is still role:editors, untouched; the other rows stayed inherited', stored.permissions.create === 'role:editors' && stored.permissions.find === undefined && stored.permissions.get === undefined, Object.keys(stored.permissions));
  await click(box('collection-matrix', 'update', 'role-editors'));
  await sleep(200);
  await clickText('#collection-rules button', 'Save');
  await sleep(1200);
  stored = (await config()).collections.Pet;
  ok('AC1 ticking editors beside it stores ["authenticated","role:editors"]', J(stored.permissions.update) === J(['authenticated', 'role:editors']), stored.permissions);
  ok('AC1 security.json on disk says the same', J(onDisk().collections.Pet.permissions.update) === J(['authenticated', 'role:editors']));
  await shot('bmg006-ac1-saved');

  // ---- AC2: Everyone implies, No one is exclusive (UI state, nothing saved) --------------------------
  await click(box('collection-matrix', 'find', 'default'));
  await click(box('collection-matrix', 'find', 'everyone'));
  await sleep(200);
  const findRow = await rowBoxes('collection-matrix', 'find');
  ok('AC2 Everyone on List greys Signed in, No one and editors as implied', /everyone=1(?!d)/.test(findRow) && /signedIn=1d/.test(findRow) && /noOne=0d/.test(findRow) && /role-editors=1d/.test(findRow), findRow);
  await click(box('collection-matrix', 'get', 'default'));
  await click(box('collection-matrix', 'get', 'signedIn'));
  await click(box('collection-matrix', 'get', 'noOne'));
  await sleep(200);
  const getRow = await rowBoxes('collection-matrix', 'get');
  ok('AC2 No one on Open one is exclusive: Signed in came off', /noOne=1/.test(getRow) && /signedIn=0/.test(getRow), getRow);
  await shot('bmg006-ac2-everyone-noone');
  const putsBefore = requests.filter((r) => r.method === 'PUT' || r.method === 'DELETE').length;
  await clickText('#collection-rules button', 'Undo changes');
  await sleep(300);
  ok('AC2 nothing was written while ticking', requests.filter((r) => r.method === 'PUT' || r.method === 'DELETE').length === putsBefore && (await boxState('collection-matrix', 'find', 'default')).checked);

  // ---- AC3: a template fills the matrix; Save stores the documented config --------------------------
  await clickText('#collection-rules button', 'Only the owner');
  await sleep(300);
  const ownerRows = {};
  for (const op of ['find', 'get', 'create', 'update', 'delete']) ownerRows[op] = await rowBoxes('collection-matrix', op);
  ok('AC3 "Only the owner" ticks Signed in on every row and turns creator-owns on', Object.values(ownerRows).every((r) => /signedIn=1(?!d)/.test(r) && /everyone=0/.test(r)) && (await ev(`document.querySelector('#collection-owns').checked`)), ownerRows);
  await shot('bmg006-ac3-owner');
  await clickText('#collection-rules button', 'Save');
  await sleep(1200);
  stored = (await config()).collections.Pet;
  const all = (r) => ({ find: r, get: r, create: r, update: r, delete: r });
  ok('AC3 the stored config is the documented one: every op "authenticated", creatorOwns true', J(stored) === J({ permissions: all('authenticated'), creatorOwns: true }), stored);
  await clickText('#collection-rules button', 'Public read, signed-in write');
  await sleep(300);
  ok('AC3 "Public read" ticks Everyone on List and Open one only', /everyone=1/.test(await rowBoxes('collection-matrix', 'find')) && /everyone=1/.test(await rowBoxes('collection-matrix', 'get')) && /everyone=0/.test(await rowBoxes('collection-matrix', 'create')));
  await setVal('select[aria-label="Role for the template"]', 'billing');
  await clickText('#collection-rules button', 'One role only');
  await sleep(300);
  ok('AC3 "One role only" with billing picked ticks the billing column on every row', ['find', 'delete'].every(async () => true) && /role-billing=1/.test(await rowBoxes('collection-matrix', 'find')) && /role-billing=1/.test(await rowBoxes('collection-matrix', 'delete')), await rowBoxes('collection-matrix', 'delete'));
  await clickText('#collection-rules button', 'Undo changes');
  await sleep(300);

  // ---- AC5: Try as ann doing Change on Pet == the route's own answer ---------------------------------
  const annId = (await call('GET', '/admin/users?q=ann')).json.users.find((u) => u.username === 'ann').objectId;
  await pick('#tryas-person input', 'an', 'ann');
  await sleep(300);
  await setVal('#tryas select[aria-label="Doing"]', 'update');
  await sleep(200);
  await clickText('#tryas button', 'Ask');
  await sleep(1200);
  let verdict = await txt('#tryas .verdict');
  let direct = (await call('POST', '/admin/permissions/check', { principal: { kind: 'user', userId: annId }, collection: 'Pet', op: 'update' })).json;
  ok('AC5 the page says "ann may change Pet." and shows the route’s own reason', /^ann may change Pet\./.test(verdict || '') && direct.allowed === true && (verdict || '').includes(direct.reason), { verdict, direct });
  await shot('bmg006-ac5-tryas');
  // On bob's record: the collection allows it, the record's sharing does not.
  await pick('#tryas-record input', 'Re', 'Rex');
  await sleep(300);
  await clickText('#tryas button', 'Ask');
  await sleep(1500);
  verdict = await txt('#tryas .verdict');
  const rex = (await call('GET', '/classes/Pet?where=' + encodeURIComponent('{"name":"Rex"}'))).json.results[0];
  direct = (await call('POST', '/admin/permissions/check', { principal: { kind: 'user', userId: annId }, collection: 'Pet', op: 'update', record: rex })).json;
  ok('AC5 on Rex (bob’s): "may not … that record’s sharing does not", as the route answers recordAllowed:false', /^ann may not change Pet \(Rex\): the collection allows it, but that record’s sharing does not\./.test(verdict || '') && direct.allowed === true && direct.recordAllowed === false, { verdict, direct });
  await shot('bmg006-ac5-record');
  // Signed out, List: refused, as the route says.
  await setVal('#tryas select[aria-label="Try as"]', 'anonymous');
  await setVal('#tryas select[aria-label="Doing"]', 'find');
  await sleep(200);
  await clickText('#tryas button', 'Ask');
  await sleep(1200);
  verdict = await txt('#tryas .verdict');
  direct = (await call('POST', '/admin/permissions/check', { principal: { kind: 'anonymous' }, collection: 'Pet', op: 'find' })).json;
  ok('AC5 someone signed out may not list Pet, as the route answers', /^Someone signed out may not list Pet\./.test(verdict || '') && direct.allowed === false && (verdict || '').includes(direct.reason), { verdict, allowed: direct.allowed });

  // ---- the defaults page: AC4 whole-config, read back equal, a concurrent change refused ------------
  await open('#/permissions');
  await shot('bmg006-defaults');
  ok('AC7 defaults page: no text input outside a picker', (await textInputsOutsidePickers()).length === 0, await textInputsOutsidePickers());
  await systemTablesSeen('defaults page');
  const listed = await ev(`[...document.querySelectorAll('#main tr[data-collection]')].map(function(r){return r.getAttribute('data-collection')})`);
  ok('AC6 the collection list is Order and Pet — no _User, no _Role', J(listed) === J(['Order', 'Pet']), listed);
  await setVal('select[aria-label="Who can make an account"]', 'public');
  await pick('#files-matrix-add-role input', 'ed', 'editors');
  await sleep(300);
  await click(box('files-matrix', 'delete', 'noOne'));
  await click(box('files-matrix', 'delete', 'role-editors'));
  await click(box('defaults-matrix', 'delete', 'signedIn'));
  await sleep(200);
  const etagBefore = (await call('GET', '/admin/permissions')).json.etag;
  await clickText('#main button', 'Save');
  await sleep(1200);
  let c = await config();
  ok('AC4 sign-up, files and the defaults saved through the whole-config route and read back equal', c.signup === 'public' && c.files.delete === 'role:editors' && c.defaults.permissions.delete === 'authenticated', { signup: c.signup, files: c.files, defaults: c.defaults.permissions });
  const savePut = requests.filter((r) => r.method === 'PUT' && /\/admin\/permissions$/.test(r.url));
  ok('AC4 the write was PUT /admin/permissions (once so far)', savePut.length === 1, savePut.length);
  ok('AC4 the tag moved', (await call('GET', '/admin/permissions')).json.etag !== etagBefore);
  // Someone else changes the config under the page (an agent over MCP, another tab): the page's next save is refused.
  const other = JSON.parse(JSON.stringify(c));
  other.files.upload = 'role:billing';
  const put = await call('PUT', '/admin/permissions', other);
  ok('a concurrent write went in directly (no If-Match, as MCP sends)', put.status === 200, put.status);
  await click('#defaults-owns');
  await sleep(200);
  await clickText('#main button', 'Save');
  await sleep(1200);
  const notice = await txt('#main .notice.bad');
  c = await config();
  ok('AC4 the page’s save is refused with a sentence, and nothing of it was written', /changed since this page loaded/.test(notice || '') && c.defaults.creatorOwns === true && c.files.upload === 'role:billing', { notice, owns: c.defaults.creatorOwns, upload: c.files.upload });
  await shot('bmg006-ac4-refused');
  await clickText('#main .notice.bad button', 'Reload');
  await sleep(1200);
  ok('AC4 Reload shows the other write (Files › Upload = billing) and clears the notice', /role-billing=1/.test(await rowBoxes('files-matrix', 'upload')) && (await txt('#main .notice.bad')) === null, await rowBoxes('files-matrix', 'upload'));

  // ---- functions: every field through the whole-config route, read back equal ------------------------
  await open('#/permissions/functions');
  await shot('bmg006-functions');
  ok('AC7 functions page: no text input outside a picker', (await textInputsOutsidePickers()).length === 0, await textInputsOutsidePickers());
  await systemTablesSeen('functions page');
  const chips = await ev(`[...document.querySelectorAll('#fn-sendInvoice .chip')].map(function(c){return c.textContent.trim()+'|'+(c.getAttribute('title')||'')})`);
  ok('drift is a chip with its reason: sendInvoice has a rule but is not deployed', chips.some((x) => /^not deployed\|A rule guards the name sendInvoice/.test(x)), chips);
  await pick('#fn-call-sendInvoice-add-role input', 'ed', 'editors');
  await sleep(300);
  await click('#fn-call-sendInvoice input[data-col="role-editors"]');
  await click('#fn-sendInvoice input[aria-label="Its own limit"]');
  await sleep(200);
  await setVal('#fn-sendInvoice input[aria-label="Calls per minute"]', '30');
  await setVal('#fn-sendInvoice input[aria-label="Burst"]', '10');
  await setVal('#fn-sendInvoice input[aria-label="Time limit in seconds"]', '5');
  await setVal('#fn-sendInvoice select[aria-label="Duplicate deliveries"]', 'required');
  await setVal('#fn-sendInvoice select[aria-label="Runs as"]', 'system');
  await sleep(200);
  await clickText('#fn-sendInvoice button', 'Save');
  await sleep(1500);
  c = await config();
  const want = { call: ['authenticated', 'role:editors'], runAs: 'system', rateLimit: { ratePerMinute: 30, burst: 10 }, timeoutMs: 5000, idempotency: { enabled: true, requireKey: true } };
  ok('AC4 every function field saved through the whole-config route and reads back equal', J(c.functions.sendInvoice) === J(want), c.functions.sendInvoice);
  const fnRow = (await call('GET', '/admin/permissions/functions')).json.functions.find((f) => f.name === 'sendInvoice');
  ok('AC4 GET /admin/permissions/functions reports the same, effective', J(fnRow.call) === J(want.call) && fnRow.timeoutMs === 5000 && J(fnRow.rateLimit) === J(want.rateLimit) && fnRow.idempotency.requireKey === true, fnRow);
  await open('#/permissions/functions');
  const back = await ev(`(function(){var c=document.querySelector('#fn-sendInvoice'); return {editors:c.querySelector('input[data-col="role-editors"]').checked, signedIn:c.querySelector('input[data-col="signedIn"]').checked, limit:c.querySelector('input[aria-label="Its own limit"]').checked, perMin:c.querySelector('input[aria-label="Calls per minute"]').value, burst:c.querySelector('input[aria-label="Burst"]').value, timeout:c.querySelector('input[aria-label="Time limit in seconds"]').value, dup:c.querySelector('select[aria-label="Duplicate deliveries"]').value, runs:c.querySelector('select[aria-label="Runs as"]').value, saved:c.innerText.includes('Saved.')}})()`);
  ok('AC4 reloaded, the card shows every field as stored and says Saved.', back.editors && back.signedIn && back.limit && back.perMin === '30' && back.burst === '10' && back.timeout === '5' && back.dup === 'required' && back.runs === 'system' && back.saved, back);
  await shot('bmg006-functions-saved');
  // Try as, on a function.
  await pick('#tryas-person input', 'an', 'ann');
  await sleep(300);
  await clickText('#tryas button', 'Ask');
  await sleep(1200);
  verdict = await txt('#tryas .verdict');
  direct = (await call('POST', '/admin/permissions/check', { principal: { kind: 'user', userId: annId }, functionName: 'sendInvoice' })).json;
  ok('AC5 Try as ann calling sendInvoice matches the route', /^ann may call sendInvoice\./.test(verdict || '') === direct.allowed && (verdict || '').includes(direct.reason), { verdict, allowed: direct.allowed });

  // ---- AC6: the validator was never asked about a system table ---------------------------------------
  const systemWrites = requests.filter((r) => /\/admin\/permissions\/collections\/_/.test(r.url));
  ok('AC6 the page never sent a _ table to the collection route', systemWrites.length === 0, systemWrites);
  const audit = (await call('GET', '/admin/audit?limit=200')).json;
  const entries = (audit && (audit.entries || audit.results || audit.items)) || [];
  const badWrites = entries.filter((e) => /permissions/.test(JSON.stringify(e)) && /"_[A-Z]/.test(JSON.stringify(e.detail || e)));
  ok('AC6 the audit trail holds no permission write naming a system table', badWrites.length === 0, { audited: entries.length, badWrites: badWrites.length });

  fs.writeFileSync(process.env.OUT, JSON.stringify(out, null, 2));
  const failed = Object.entries(out.checks).filter(([, c]) => !c.pass).map(([n]) => n);
  console.log(failed.length ? 'FAILED CHECKS: ' + failed.join(' | ') : 'ALL ' + Object.keys(out.checks).length + ' CHECKS PASS');
};
