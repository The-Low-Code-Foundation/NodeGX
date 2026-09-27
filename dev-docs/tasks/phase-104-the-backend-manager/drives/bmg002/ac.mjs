// BMG-002 AC1, AC3–AC9 through the page, with the server measured beside every step.
// Rendered text only — `document.body.textContent` includes the inlined app bundle's source.
export default async ({ ev, sleep, nav, shot, typeText, send, requests }) => {
  const fs = await import('fs');
  const path = await import('path');
  const port = process.env.PORT || '8697';
  const base = `http://127.0.0.1:${port}`;
  const out = { checks: {} };
  const ok = (name, pass, detail) => {
    out.checks[name] = { pass: !!pass, detail };
    console.log((pass ? 'PASS ' : 'FAIL ') + name + (detail !== undefined ? ' — ' + JSON.stringify(detail).slice(0, 300) : ''));
  };
  const call = async (method, p, body, headers = {}) => {
    const r = await fetch(base + p, { method, headers: { ...headers, ...(body ? { 'content-type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined });
    return { status: r.status, json: await r.json().catch(() => null) };
  };
  const admin = (method, p, body) => call(method, p, body, { authorization: 'Bearer t0k' });
  const count = async (where) => (await admin('GET', '/api/Task?count=1&limit=1' + (where ? '&where=' + encodeURIComponent(JSON.stringify(where)) : ''))).json.count;
  const allTasks = async () => (await admin('GET', '/api/Task?limit=1000')).json.results;

  const J = JSON.stringify;
  const setVal = (sel, v) =>
    ev(`(function(){var e=document.querySelector(${J(sel)}); if(!e) throw new Error('no '+${J(sel)}); var proto=e.tagName==='SELECT'?HTMLSelectElement.prototype:e.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:HTMLInputElement.prototype; Object.getOwnPropertyDescriptor(proto,'value').set.call(e,${J(v)}); e.dispatchEvent(new Event('input',{bubbles:true})); e.dispatchEvent(new Event('change',{bubbles:true})); return true})()`);
  const click = (sel) => ev(`(function(){var e=document.querySelector(${J(sel)}); if(!e) throw new Error('no '+${J(sel)}); e.click(); return true})()`);
  const clickText = (sel, text) =>
    ev(`(function(){var b=[...document.querySelectorAll(${J(sel)})].find(function(b){return b.textContent.trim()===${J(text)}}); if(!b) throw new Error('no '+${J(sel + ' ' + text)}); b.click(); return true})()`);
  const exists = (sel) => ev(`!!document.querySelector(${J(sel)})`);
  // The labelled field in the drawer whose head says `name`.
  const field = (name) => `[...document.querySelectorAll('.drawer .field')].find(function(f){var b=f.querySelector('.field-head b'); return b && b.textContent===${J(name)}})`;
  const inField = (name, sub) => ev(`(function(){var f=${field(name)}; if(!f) throw new Error('no field ${name}'); var e=f.querySelector(${J(sub)}); if(!e) throw new Error('no ${name} '+${J(sub)}); return true})()`);
  const setIn = (name, sub, v) =>
    ev(`(function(){var f=${field(name)}; var e=f && f.querySelector(${J(sub)}); if(!e) throw new Error('no ${name} '+${J(sub)}); var proto=e.tagName==='SELECT'?HTMLSelectElement.prototype:HTMLInputElement.prototype; Object.getOwnPropertyDescriptor(proto,'value').set.call(e,${J(v)}); e.dispatchEvent(new Event('input',{bubbles:true})); e.dispatchEvent(new Event('change',{bubbles:true})); return true})()`);
  const clickIn = (name, sub, text) =>
    ev(`(function(){var f=${field(name)}; var e=f && [...f.querySelectorAll(${J(sub)})].find(function(x){return ${text === undefined ? 'true' : 'x.textContent.trim()===' + J(text)}}); if(!e) throw new Error('no ${name} '+${J(sub)}); e.click(); return true})()`);
  /** Type into a Picker (found by a CSS selector for its input) and choose the row labelled `label`. */
  const pick = async (inputSel, query, label) => {
    await ev(`(function(){var e=${inputSel}; if(!e) throw new Error('no picker input'); e.focus(); return true})()`);
    await typeText(query);
    await sleep(700);
    await ev(`(function(){var r=[...document.querySelectorAll('.picker-row')].find(function(r){var l=r.querySelector('.picker-label'); return l && l.textContent===${J(label)}}); if(!r) throw new Error('no picker row ${label}: '+[...document.querySelectorAll('.picker-row')].map(function(x){return x.textContent}).join('|')); r.dispatchEvent(new MouseEvent('mousedown',{bubbles:true})); return true})()`);
    await sleep(500);
  };
  const shown = () => ev(`(function(){var b=document.querySelector('.result-sentence'); return b ? b.textContent.trim() : null})()`);
  const shownCount = async () => Number(((await shown()) || '').split(' ')[0]);
  const lastList = () => {
    const r = [...requests].reverse().find((x) => x.method === 'GET' && /\/api\/Task\?/.test(x.url));
    return r ? new URL(r.url) : null;
  };
  const lastWhere = () => {
    const u = lastList();
    return u && u.searchParams.get('where') ? JSON.parse(u.searchParams.get('where')) : null;
  };
  const setFile = async (sel, file) => {
    const doc = await send('DOM.getDocument', { depth: -1, pierce: true });
    const q = await send('DOM.querySelector', { nodeId: doc.result.root.nodeId, selector: sel });
    if (!q.result || !q.result.nodeId) throw new Error('no file input ' + sel);
    await send('DOM.setFileInputFiles', { nodeId: q.result.nodeId, files: [file] });
  };
  const line = (i) => `.filter-box .filter-group > .filter-line:nth-child(${i + 1})`;
  // One ✕ at a time, as a person would: each click re-renders the rows it removes from.
  const clearRows = async () => {
    for (let i = 0; i < 20 && (await exists('.filter-box button[aria-label="Remove this condition"]')); i++) {
      await click('.filter-box button[aria-label="Remove this condition"]');
      await sleep(150);
    }
    await sleep(700);
  };

  await nav(`${base}/_admin#token=t0k`);
  await sleep(1500);
  await ev(`location.hash = '#/collections/Task'`);
  await sleep(1500);
  await shot('bmg002-grid');
  const rowsAll = await allTasks();
  out.seedCount = rowsAll.length;

  // ---- AC1 (the page half): rows built in the page → the `where` sent → the server's count → the count shown.
  const people = (await admin('GET', '/api/Person')).json.results;
  const ann = people.find((p) => p.name === 'Ann Archer');
  const today = new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());
  const scenarios = [];
  const measure = async (label, expected) => {
    await sleep(900);
    const where = lastWhere();
    const server = await count(where);
    const page = await shownCount();
    const want = rowsAll.filter(expected).length;
    scenarios.push({ label, sentence: await shown(), where, server, page, want });
    ok('AC1 ' + label, server === page && page === want && want > 0 && want < rowsAll.length, { sentence: await shown(), server, page, want });
  };
  await clickText('#main .filter-box button', '+ Filter');
  await sleep(300);
  await setVal(line(0) + ' select[aria-label="Operator"]', 'contains');
  await sleep(150);
  await setVal(line(0) + ' input[aria-label="title value"]', 'open');
  await measure('title contains open', (r) => (r.title || '').toLowerCase().includes('open'));
  await shot('bmg002-filter-contains');

  await setVal(line(0) + ' select[aria-label="Field"]', 'n');
  await sleep(150);
  await setVal(line(0) + ' select[aria-label="Operator"]', 'between');
  await sleep(150);
  await setVal(line(0) + ' input[aria-label="n from"]', '3');
  await setVal(line(0) + ' input[aria-label="n to"]', '8');
  await measure('n between 3 and 8', (r) => typeof r.n === 'number' && r.n >= 3 && r.n <= 8);

  await setVal(line(0) + ' select[aria-label="Field"]', 'due');
  await sleep(150);
  await setVal(line(0) + ' select[aria-label="Operator"]', 'within');
  await sleep(150);
  await setVal(line(0) + ' select[aria-label="due window"]', 'past7');
  await measure('due within the past 7 days', (r) => {
    if (!r.due) return false;
    const d = new Date(r.due.iso || r.due);
    return d >= new Date(today.getTime() - 6 * 864e5) && d < new Date(today.getTime() + 864e5);
  });
  await shot('bmg002-filter-within');

  await setVal(line(0) + ' select[aria-label="Field"]', 'owner');
  await sleep(200);
  await pick(`document.querySelector(${J(line(0) + ' .picker input')})`, 'Ann', 'Ann Archer');
  await measure('owner is Ann Archer (picked by name)', (r) => r.owner && (r.owner.objectId || r.owner) === ann.objectId);
  ok('AC1 the sentence names the person, not the id', ((await shown()) || '').indexOf('Ann Archer') !== -1 && ((await shown()) || '').indexOf(ann.objectId) === -1, await shown());

  await setVal(line(0) + ' select[aria-label="Field"]', 'done');
  await sleep(150);
  await setVal(line(0) + ' select[aria-label="Operator"]', 'no');
  await measure('done is no (unset counts as no)', (r) => r.done !== true);

  // Two rows joined by "or".
  await setVal(line(0) + ' select[aria-label="Field"]', 'title');
  await sleep(150);
  await setVal(line(0) + ' select[aria-label="Operator"]', 'startsWith');
  await sleep(150);
  await setVal(line(0) + ' input[aria-label="title value"]', 'open');
  await clickText('#main .filter-box button', '+ Add condition');
  await sleep(200);
  await setVal(line(1) + ' select[aria-label="Field"]', 'tags');
  await sleep(150);
  await setVal(line(1) + ' input[aria-label="tags value"]', 'red');
  await setVal(line(1) + ' select[aria-label="And or or"]', 'or');
  await measure('title starts with open OR tags contains red', (r) => (r.title || '').startsWith('open') || (Array.isArray(r.tags) && r.tags.includes('red')));

  // A group: title contains o AND (n > 5 OR done is no).
  await clearRows();
  await clickText('#main .filter-box button', '+ Filter');
  await sleep(200);
  await setVal(line(0) + ' select[aria-label="Operator"]', 'contains');
  await sleep(100);
  await setVal(line(0) + ' input[aria-label="title value"]', 'o');
  await clickText('#main .filter-box button', '+ Add group');
  await sleep(300);
  const g = `.filter-box .filter-group.nested`;
  await setVal(`${g} > .filter-line:nth-child(1) select[aria-label="Field"]`, 'n');
  await sleep(150);
  await setVal(`${g} > .filter-line:nth-child(1) select[aria-label="Operator"]`, 'gt');
  await sleep(100);
  await setVal(`${g} > .filter-line:nth-child(1) input[aria-label="n value"]`, '5');
  await clickText(`${g} button`, '+ Add condition');
  await sleep(200);
  await setVal(`${g} > .filter-line:nth-child(2) select[aria-label="Field"]`, 'done');
  await sleep(150);
  await setVal(`${g} > .filter-line:nth-child(2) select[aria-label="Operator"]`, 'no');
  await measure('title contains o AND (n > 5 OR done is no)', (r) => (r.title || '').toLowerCase().includes('o') && ((typeof r.n === 'number' && r.n > 5) || r.done !== true));
  await shot('bmg002-filter-group');
  out.ac1 = scenarios;

  // ---- AC9 at rest #1: the page with a filter open.
  const jsonAtRest = () =>
    ev(`[...document.querySelectorAll('textarea, input')].filter(function(e){return e.getClientRects().length && getComputedStyle(e).visibility!=='hidden'}).filter(function(e){var p=(e.placeholder||'')+' '+(e.getAttribute('aria-label')||''); return e.tagName==='TEXTAREA' ? /[{\\[]|json/i.test(p) || /^\\s*[{\\[]/.test(e.value) : /[{\\[]/.test(p)}).map(function(e){return e.tagName+' '+(e.placeholder||e.getAttribute('aria-label'))})`);
  out.ac9_page = await jsonAtRest();
  await clearRows();

  // ---- AC3: header sort is the server's order — the `sort` sent, and the rows in the server's order.
  const nCol = () => ev(`[...document.querySelectorAll('#main table.grid thead th')].findIndex(function(th){return th.textContent.trim().indexOf('n ')===0})`);
  const colVals = async (idx) => ev(`[...document.querySelectorAll('#main table.grid tbody tr')].map(function(tr){return tr.children[${idx}].textContent.trim()})`);
  const clickHead = (name, shift) =>
    ev(`(function(){var th=[...document.querySelectorAll('#main table.grid thead th')].find(function(th){return th.textContent.trim().indexOf(${J(name + ' ')})===0}); if(!th) throw new Error('no header ${name}'); th.dispatchEvent(new MouseEvent('click',{bubbles:true,shiftKey:${!!shift}})); return true})()`);
  const serverOrder = async (sort) => (await admin('GET', '/api/Task?limit=50&sort=' + encodeURIComponent(J(sort)))).json.results.map((r) => (r.n === undefined || r.n === null ? '' : String(r.n)));
  const ac3 = [];
  for (const [label, shift, want] of [['n', false, ['n']], ['n', false, ['-n']], ['title', true, ['-n', 'title']], ['n', false, []]]) {
    await clickHead(label, shift);
    await sleep(900);
    const sent = lastList().searchParams.get('sort');
    const idx = await nCol();
    const pageN = idx === -1 ? null : await colVals(idx);
    const expectSort = want.length ? want : ['-createdAt'];
    const srv = await serverOrder(expectSort);
    ac3.push({ click: (shift ? '⇧' : '') + label, sent, pageN, serverN: srv });
    ok('AC3 click ' + (shift ? '⇧' : '') + label + ' → ' + J(expectSort), sent === J(expectSort) && J(pageN) === J(srv), { sent, pageN, srv });
  }
  out.ac3 = ac3;
  await shot('bmg002-sorted');

  // ---- a row click opens the record; a double-click edits one cell in place.
  const firstId = rowsAll.find((r) => r.title === 'walk dog').objectId;
  const titleCol = await ev(`[...document.querySelectorAll('#main table.grid thead th')].findIndex(function(th){return th.textContent.trim().indexOf('title ')===0})`);
  const rowOf = (title) => `[...document.querySelectorAll('#main table.grid tbody tr')].find(function(tr){return tr.children[${titleCol}].textContent.trim()===${J(title)}})`;
  await ev(`(function(){var tr=${rowOf('walk dog')}; tr.children[${titleCol}].dispatchEvent(new MouseEvent('dblclick',{bubbles:true})); return true})()`);
  await sleep(300);
  out.dblclickOpenedDrawer = await exists('.drawer');
  await ev(`(function(){var i=document.querySelector('#main td.cell-edit input'); if(!i) throw new Error('no cell editor'); i.focus(); i.select(); return true})()`);
  await typeText('walk the dog');
  await ev(`document.querySelector('#main td.cell-edit input').dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true}))`);
  await sleep(700);
  const afterCell = (await admin('GET', '/api/Task/' + firstId)).json.title;
  ok('double-click edits the cell in place (no drawer)', afterCell === 'walk the dog' && !out.dblclickOpenedDrawer, { afterCell, drawer: out.dblclickOpenedDrawer });
  await ev(`(function(){var tr=${rowOf('walk the dog')}; tr.children[${titleCol}].click(); return true})()`);
  await sleep(900);
  ok('a row click opens the record at its address', (await ev('location.hash')) === '#/collections/Task/' + firstId && (await exists('.drawer')), await ev('location.hash'));
  await ev(`location.hash = '#/collections/Task'`);
  await sleep(800);

  // ---- AC4: a view — filter + sort + columns — saved on the server, survives reload.
  await clickText('#main .filter-box button', '+ Filter');
  await sleep(200);
  await setVal(line(0) + ' select[aria-label="Field"]', 'done');
  await sleep(150);
  await setVal(line(0) + ' select[aria-label="Operator"]', 'no');
  await sleep(700);
  await clickHead('n', false);
  await sleep(400);
  await clickHead('n', false);
  await sleep(700);
  await clickText('#main button', 'Columns');
  await sleep(300);
  for (const off of ['meta', 'at', 'doc', 'tags']) {
    await ev(`(function(){var r=[...document.querySelectorAll('.modal .columns-row')].find(function(r){return r.querySelector('label').textContent.trim().indexOf(${J(off + ' ')})===0}); var c=r.querySelector('input'); if(c.checked) c.click(); return true})()`);
  }
  await ev(`(function(){var r=[...document.querySelectorAll('.modal .columns-row')].find(function(r){return r.querySelector('label').textContent.trim().indexOf('n ')===0}); r.querySelector('button[aria-label="Move n up"]').click(); return true})()`);
  await shot('bmg002-columns');
  await clickText('.modal button', 'Apply');
  await sleep(500);
  const headsBefore = await ev(`[...document.querySelectorAll('#main table.grid thead th')].map(function(th){return th.textContent.trim().split(' ')[0]}).filter(Boolean)`);
  const countBefore = await shownCount();
  await clickText('#main button', 'Save view…');
  await sleep(300);
  await setVal('.modal input[type="text"]', 'Not done, biggest first');
  await clickText('.modal button', 'Save');
  await sleep(700);
  const views = (await admin('GET', '/admin/views/Task')).json.views;
  out.ac4_serverView = views;
  ok('AC4 the view is stored by the backend', views.length === 1 && views[0].sort[0] === '-n' && views[0].filter && views[0].columns.indexOf('meta') === -1, views[0]);

  await nav(`${base}/_admin#token=t0k`);
  await sleep(1500);
  await ev(`localStorage.clear(); location.hash = '#/collections/Task'`);
  await sleep(1500);
  const viewOptions = await ev(`[...document.querySelectorAll('#main select[aria-label="View"] option')].map(function(o){return o.textContent})`);
  await setVal('#main select[aria-label="View"]', 'Not done, biggest first');
  await sleep(1200);
  const headsAfter = await ev(`[...document.querySelectorAll('#main table.grid thead th')].map(function(th){return th.textContent.trim().split(' ')[0]}).filter(Boolean)`);
  ok('AC4 after a reload (localStorage cleared) the view restores filter, sort and columns', viewOptions.indexOf('Not done, biggest first') !== -1 && (await shownCount()) === countBefore && lastList().searchParams.get('sort') === '["-n"]' && J(headsAfter) === J(headsBefore), {
    viewOptions,
    sentence: await shown(),
    sort: lastList().searchParams.get('sort'),
    headsBefore,
    headsAfter
  });
  await shot('bmg002-view-restored');
  await setVal('#main select[aria-label="View"]', '');
  await sleep(600);
  await clearRows();
  await clickText('#main button', 'Columns');
  await sleep(300);
  await clickText('.modal button', 'Reset');
  await sleep(700);

  // ---- AC5: one record with every type, through the drawer; read back equal.
  await clickText('#main button', 'New record');
  await sleep(900);
  await setIn('title', 'input', 'Everything');
  await setIn('n', 'input', '42.5');
  await clickIn('done', 'input[role="switch"]');
  await setIn('due', 'input[type="date"]', '2026-10-01');
  await setIn('due', 'input[type="time"]', '14:30');
  await pick(`(${field('owner')}).querySelector('.picker input')`, 'Ann', 'Ann Archer');
  await clickIn('tags', 'button', '+ Add an item');
  await clickIn('tags', 'button', '+ Add an item');
  await sleep(200);
  await setIn('tags', 'input[aria-label="tags item 1"]', 'red');
  await setIn('tags', 'input[aria-label="tags item 2"]', 'green');
  await clickIn('meta', 'button', '+ Add a value');
  await clickIn('meta', 'button', '+ Add a value');
  await sleep(200);
  await setIn('meta', '.list-row:nth-child(1) input[aria-label="Name"]', 'color');
  await setIn('meta', '.list-row:nth-child(1) input[aria-label="Value"]', 'blue');
  await setIn('meta', '.list-row:nth-child(2) input[aria-label="Name"]', 'count');
  await setIn('meta', '.list-row:nth-child(2) select[aria-label="Type"]', 'number');
  await sleep(150);
  await setIn('meta', '.list-row:nth-child(2) input[aria-label="Value"]', '3');
  await setIn('at', 'input[aria-label="at latitude"]', '51.5074');
  await setIn('at', 'input[aria-label="at longitude"]', '-0.1278');
  const upload = path.join(process.env.S, 'bmg002-grid.png');
  await setFile('.drawer input[type="file"]', upload);
  await sleep(1200);
  out.ac5_fileCard = await ev(`(function(){var f=${field('doc')}; return f ? f.textContent.trim() : null})()`);
  out.ac9_drawerNew = await jsonAtRest();
  await shot('bmg002-new-record');
  await clickText('.drawer button', 'Create');
  await sleep(1500);
  const everyId = (await ev('location.hash')).split('/')[3];
  const every = (await admin('GET', '/api/Task/' + everyId)).json;
  out.ac5_record = every;
  const localIso = new Date(2026, 9, 1, 14, 30).toISOString();
  const fileBytes = every.doc && every.doc.url ? Buffer.from(await (await fetch(every.doc.url.replace(/^https?:\/\/[^/]+/, base), { headers: { authorization: 'Bearer t0k' } })).arrayBuffer()) : null;
  const typeChecks = {
    String: every.title === 'Everything',
    Number: every.n === 42.5,
    Boolean: every.done === true,
    Date: every.due && (every.due.iso || every.due) === localIso,
    Pointer: every.owner && (every.owner.objectId || every.owner) === ann.objectId,
    Array: J(every.tags) === J(['red', 'green']),
    Object: J(every.meta) === J({ color: 'blue', count: 3 }),
    GeoPoint: every.at && every.at.latitude === 51.5074 && every.at.longitude === -0.1278,
    File: !!fileBytes && fileBytes.equals(fs.readFileSync(upload))
  };
  out.ac5_types = typeChecks;
  ok('AC5 every type round-trips through the drawer (file byte-equal)', Object.values(typeChecks).every(Boolean), typeChecks);
  // And reads back into the controls.
  out.ac5_reopened = {
    title: await ev(`(${field('title')}).querySelector('input').value`),
    tags: await ev(`[...(${field('tags')}).querySelectorAll('input[aria-label^="tags item"]')].map(function(i){return i.value})`),
    meta: await ev(`[...(${field('meta')}).querySelectorAll('.list-row')].map(function(r){return r.querySelector('input[aria-label="Name"]').value+'='+r.querySelector('input[aria-label="Value"]').value})`),
    lat: await ev(`(${field('at')}).querySelector('input[aria-label="at latitude"]').value`),
    owner: await ev(`(${field('owner')}).querySelector('.picker-value') && (${field('owner')}).querySelector('.picker-value').textContent`),
    doc: await ev(`(${field('doc')}).querySelector('.file-text b') && (${field('doc')}).querySelector('.file-text b').textContent`)
  };
  // The thumbnail and the Download link work in a browser, which cannot send the admin credential.
  const thumb = await ev(`(function(){var i=(${field('doc')}).querySelector('img.file-thumb'); return i ? {w:i.naturalWidth, src:i.getAttribute('src')} : null})()`);
  const link = await ev(`(${field('doc')}).querySelector('a[download]').getAttribute('href')`);
  const viaLink = Buffer.from(await (await fetch(base + link)).arrayBuffer());
  ok('AC5 the file shows a thumbnail and downloads byte-equal through the page link (no credential)', thumb && thumb.w > 0 && viaLink.equals(fs.readFileSync(upload)) && link.indexOf('127.0.0.1') === -1, { thumb, link, bytes: viaLink.length });
  ok('AC5 the saved record reads back into its controls', out.ac5_reopened.title === 'Everything' && J(out.ac5_reopened.tags) === J(['red', 'green']) && out.ac5_reopened.owner === 'Ann Archer', out.ac5_reopened);
  out.ac9_drawerSaved = await jsonAtRest();
  await shot('bmg002-every-type');

  // ---- AC6: link two, unlink one, read back through $relatedTo.
  const related = async () => {
    const where = { $relatedTo: { object: { __type: 'Pointer', className: 'Task', objectId: everyId }, key: 'labels' } };
    return (await admin('GET', '/api/Tag?where=' + encodeURIComponent(J(where)))).json.results.map((t) => t.label).sort();
  };
  await pick(`(${field('labels')}).querySelector('.picker input')`, 'urg', 'urgent');
  await sleep(600);
  await pick(`(${field('labels')}).querySelector('.picker input')`, 'hom', 'home');
  await sleep(800);
  const afterTwo = await related();
  const chipsTwo = await ev(`[...(${field('labels')}).querySelectorAll('.chip a')].map(function(a){return a.textContent})`);
  await ev(`(function(){var b=(${field('labels')}).querySelector('button[aria-label="Unlink urgent"]'); b.click(); return true})()`);
  await sleep(900);
  const afterOne = await related();
  const chipsOne = await ev(`[...(${field('labels')}).querySelectorAll('.chip a')].map(function(a){return a.textContent})`);
  ok('AC6 relation: add two, remove one, read back through $relatedTo', J(afterTwo) === J(['home', 'urgent']) && J(afterOne) === J(['home']) && J(chipsOne) === J(['home']), { afterTwo, chipsTwo, afterOne, chipsOne });
  await shot('bmg002-relation');

  // ---- AC7: the ACL card.
  const annUser = (await admin('GET', '/admin/users?q=ann')).json.users.find((u) => u.username === 'ann');
  await clickText('.drawer .acl-card button', 'Restrict who can see this');
  await sleep(300);
  await click('.drawer .acl-card input[aria-label="Everyone can change"]');
  await pick(`document.querySelector('.drawer .acl-add .picker:nth-child(1) input')`, 'edit', 'editors');
  await click('.drawer .acl-card input[aria-label="editors can see"]');
  await click('.drawer .acl-card input[aria-label="editors can change"]');
  await pick(`document.querySelector('.drawer .acl-add .picker:nth-child(2) input')`, 'ann', 'ann · ann@example.com');
  await sleep(300);
  await click('.drawer .acl-card input[aria-label="ann · ann@example.com can change"]');
  await sleep(200);
  out.ac7_cardText = await ev(`document.querySelector('.drawer .acl-card').textContent`);
  await shot('bmg002-acl-card');
  await clickText('.drawer button', 'Save');
  await sleep(1000);
  const acl = (await admin('GET', '/api/Task/' + everyId)).json.ACL;
  const wantAcl = { '*': { read: true }, 'role:editors': { write: true }, [annUser.objectId]: { read: true, write: true } };
  ok('AC7 the stored ACL is exactly what was ticked', J(Object.keys(acl).sort().reduce((o, k) => ({ ...o, [k]: acl[k] }), {})) === J(Object.keys(wantAcl).sort().reduce((o, k) => ({ ...o, [k]: wantAcl[k] }), {})), { acl, wantAcl });
  ok('AC7 no id on the card', out.ac7_cardText.indexOf(annUser.objectId) === -1, out.ac7_cardText.slice(0, 200));
  const nobodyId = rowsAll.find((r) => r.title === 'buy paint').objectId;
  await admin('PUT', '/api/Task/' + nobodyId, { ACL: {} });
  await ev(`location.hash = '#/collections/Task/${nobodyId}'`);
  await sleep(1200);
  const nobodyState = await ev(`(document.querySelector('.drawer .acl-state b')||{}).textContent`);
  await shot('bmg002-acl-nobody');
  const publicId = rowsAll.find((r) => r.title === 'plan trip').objectId;
  await ev(`location.hash = '#/collections/Task/${publicId}'`);
  await sleep(1200);
  const publicState = await ev(`(document.querySelector('.drawer .acl-state b')||{}).textContent`);
  ok('AC7 a stored {} shows "No one"; null shows "Everyone"', nobodyState === 'No one' && publicState === 'Everyone', { nobodyState, publicState });
  await ev(`location.hash = '#/collections/Task'`);
  await sleep(900);

  // ---- AC8: import 100 rows, three columns, with a header row.
  const csv = ['title,n,done'].concat(Array.from({ length: 100 }, (_, i) => `imp-${String(i + 1).padStart(3, '0')},${i + 1},${i % 2 === 0 ? 'true' : 'false'}`)).join('\n');
  const csvPath = path.join(process.env.S, 'bmg002-import.csv');
  fs.writeFileSync(csvPath, csv);
  await clickText('#main button', 'Import CSV');
  await sleep(400);
  await setFile('.modal input[type="file"]', csvPath);
  await sleep(1500);
  out.ac8_mapping = await ev(`[...document.querySelectorAll('.modal thead select')].map(function(s){return s.value})`);
  out.ac8_report = await ev(`(document.querySelector('.modal .notice')||{}).textContent`);
  await shot('bmg002-import');
  await ev(`(function(){var b=[...document.querySelectorAll('.modal .foot button')].find(function(b){return b.textContent.indexOf('Import 100')===0}); if(!b) throw new Error('no Import 100 button'); b.click(); return true})()`);
  await sleep(1500);
  const imported = (await admin('GET', '/api/Task?limit=200&where=' + encodeURIComponent(J({ title: { $regex: '^imp-' } })))).json.results;
  const typed = imported.filter((r) => typeof r.n === 'number' && typeof r.done === 'boolean').length;
  const trues = imported.filter((r) => r.done === true).length;
  ok('AC8 100 rows land, numbers as numbers and true as a boolean', imported.length === 100 && typed === 100 && trues === 50, { landed: imported.length, typed, trues, mapping: out.ac8_mapping, report: out.ac8_report });

  // ---- page size and ← / →.
  await setVal('#main select[aria-label="Records per page"]', '25');
  await sleep(900);
  const limitSent = lastList().searchParams.get('limit');
  await ev(`document.activeElement && document.activeElement.blur()`);
  await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'ArrowRight', code: 'ArrowRight', windowsVirtualKeyCode: 39 });
  await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'ArrowRight', code: 'ArrowRight', windowsVirtualKeyCode: 39 });
  await sleep(900);
  const skipSent = lastList().searchParams.get('skip');
  ok('page size 25 and → turns the page', limitSent === '25' && skipSent === '25', { limitSent, skipSent, showing: await ev(`(document.querySelector('#main .row .hint')||{}).textContent`) });

  // ---- AC9: nothing asks for JSON at rest — the page, a new record, a saved record, a cell dialog.
  await dblclickCell('meta');
  async function dblclickCell(name) {
    const idx = await ev(`[...document.querySelectorAll('#main table.grid thead th')].findIndex(function(th){return th.textContent.trim().indexOf(${J(name + ' ')})===0})`);
    await ev(`(function(){var tr=[...document.querySelectorAll('#main table.grid tbody tr')][0]; tr.children[${idx}].dispatchEvent(new MouseEvent('dblclick',{bubbles:true})); return true})()`);
    await sleep(500);
  }
  out.ac9_cellDialog = await ev(`(document.querySelector('.modal')||{textContent:'(no dialog)'}).textContent.slice(0,120)`);
  out.ac9_cellDialogJson = await jsonAtRest();
  await shot('bmg002-cell-dialog');
  ok('AC9 no JSON is asked for at rest (page, new record, saved record, cell dialog)', !out.ac9_page.length && !out.ac9_drawerNew.length && !out.ac9_drawerSaved.length && !out.ac9_cellDialogJson.length, {
    page: out.ac9_page,
    drawerNew: out.ac9_drawerNew,
    drawerSaved: out.ac9_drawerSaved,
    cellDialog: out.ac9_cellDialogJson
  });

  out.passed = Object.values(out.checks).filter((c) => c.pass).length;
  out.failed = Object.keys(out.checks).filter((k) => !out.checks[k].pass);
  fs.writeFileSync(process.env.OUT, JSON.stringify(out, null, 2));
  console.log('passed', out.passed, 'failed', out.failed.length, out.failed.join(' | '));
};
