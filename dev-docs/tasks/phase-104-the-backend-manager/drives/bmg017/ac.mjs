// BMG-017 — the defects before Richard drives, through the page, with the server measured beside every step.
// Row 1: Import CSV refuses a new row that leaves out a required field (R6's one-time fill), by row, and imports the rest.
// Row 2: *Check now and delete unknown files* deletes an old stray, leaves a young one (counted too new), leaves the archive.
// Row 3: the magic-link lifetime set to 60 on Sign-in → the Email page's preview says 60 minutes.
// Row 4 (cheap here): the sign-in box's words follow the path — this browser for a person, this tab for the credential.
// (The upload/move races, the bucket's archive by SHAPE, AWS addressing: jest, over the fake.)
export default async ({ ev, sleep, nav, shot, send }) => {
  const fs = await import('fs');
  const path = await import('path');
  const crypto = await import('crypto');
  const port = process.env.PORT || '8697';
  const s3port = process.env.S3PORT || '9400';
  const base = `http://127.0.0.1:${port}`;
  const endpoint = `http://127.0.0.1:${s3port}`;
  const DATA = process.env.DATA;
  const out = { checks: {} };
  const ok = (name, pass, detail) => {
    out.checks[name] = { pass: !!pass, detail };
    console.log((pass ? 'PASS ' : 'FAIL ') + name + (detail !== undefined ? ' — ' + JSON.stringify(detail).slice(0, 400) : ''));
  };
  const J = JSON.stringify;
  const T = { authorization: 'Bearer t0k' };
  const call = async (method, p, body, headers = T) => {
    const r = await fetch(base + p, { method, headers: { ...headers, ...(body ? { 'content-type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined });
    return { status: r.status, json: await r.json().catch(() => null) };
  };
  const click = (sel) => ev(`(function(){var e=document.querySelector(${J(sel)}); if(!e) throw new Error('no '+${J(sel)}); e.click(); return true})()`);
  const clickText = (sel, text) =>
    ev(`(function(){var b=[...document.querySelectorAll(${J(sel)})].find(function(b){return b.textContent.trim()===${J(text)}}); if(!b) throw new Error('no '+${J(sel + ' ' + text)}+' among '+[...document.querySelectorAll(${J(sel)})].map(function(b){return b.textContent.trim()}).join('|')); b.click(); return true})()`);
  const clickStarts = (sel, text) =>
    ev(`(function(){var b=[...document.querySelectorAll(${J(sel)})].find(function(b){return b.textContent.trim().indexOf(${J(text)})===0}); if(!b) throw new Error('no '+${J(sel + ' ' + text)}); b.click(); return true})()`);
  const setVal = (sel, v) =>
    ev(`(function(){var e=document.querySelector(${J(sel)}); if(!e) throw new Error('no '+${J(sel)}); var proto=e.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:e.tagName==='SELECT'?HTMLSelectElement.prototype:HTMLInputElement.prototype; Object.getOwnPropertyDescriptor(proto,'value').set.call(e,${J(v)}); e.dispatchEvent(new Event('input',{bubbles:true})); e.dispatchEvent(new Event('change',{bubbles:true})); return true})()`);
  const txt = (sel) => ev(`(function(){var e=document.querySelector(${J(sel)}); return e ? e.innerText.trim() : null})()`);
  const exists = (sel) => ev(`!!document.querySelector(${J(sel)})`);
  const toasts = () => ev(`[...document.querySelectorAll('.toast')].map(function(t){return t.innerText.trim()})`);
  const waitFor = async (fn, tries = 40, ms = 300) => {
    for (let i = 0; i < tries; i++) {
      const v = await fn();
      if (v) return v;
      await sleep(ms);
    }
    return null;
  };
  const fresh = async (url) => {
    await nav('about:blank');
    await nav(url);
    await sleep(1200);
  };
  const setFiles = async (sel, files) => {
    const doc = await send('DOM.getDocument', { depth: 1 });
    const node = await send('DOM.querySelector', { nodeId: doc.result.root.nodeId, selector: sel });
    await send('DOM.setFileInputFiles', { nodeId: node.result.nodeId, files });
  };

  // ---- seed: the first admin, a collection with one record, then a required field over it with a fill --------
  const setup = await call('POST', '/_admin/setup', { email: 'richard@example.com', password: 'first-admin-pw' });
  ok('seed: the first admin account exists', setup.status === 200 || setup.status === 201, setup.status);
  await call('POST', '/admin/schema', { action: 'createTable', table: 'Fill', columns: [{ name: 'name', type: 'String' }] });
  await call('POST', '/classes/Fill', { name: 'a' });
  const added = await call('POST', '/admin/schema', { action: 'addColumn', table: 'Fill', column: { name: 'owner', type: 'String', required: true, fillExisting: 'FILL' } });
  ok('seed: owner is required, the one record there was filled once', added.status === 200, added.status);

  // ---- Row 1: Import CSV ---------------------------------------------------------------------------------------
  const UP = process.env.UPLOADS;
  const csvPath = path.join(UP, 'fill.csv');
  fs.writeFileSync(csvPath, 'name,owner\ncsv-named,Ann\ncsv-omitted,\n');
  await fresh(`${base}/_admin#token=t0k`);
  await waitFor(() => exists('#main'));
  await ev(`location.hash = '#/collections/Fill'`);
  await sleep(1200);
  await clickText('button', 'Import CSV');
  await waitFor(() => exists('.modal input[type=file]'));
  await setFiles('.modal input[type=file]', [csvPath]);
  const notice = await waitFor(async () => {
    const t = await ev(`(function(){var n=[...document.querySelectorAll('.modal .notice')].map(function(e){return e.innerText}).join(' | '); return /will be added/.test(n) ? n : null})()`);
    return t;
  });
  ok('Row 1: the dry run says 1 will be added, 1 rejected, and names the row and the field', !!notice && /1 will be added, 1 rejected/.test(notice) && /Row 3: owner: required, and this new row leaves it out/.test(notice), notice);
  await shot('bmg017-row1-import-dry-run');
  await clickStarts('.modal button', 'Import 1 record');
  await sleep(1500);
  const t1 = await toasts();
  ok('Row 1: the import toast says 1 added, 1 rejected', t1.some((t) => t === '1 added, 0 updated, 1 rejected.'), t1);
  const fills = (await call('GET', '/classes/Fill?order=name')).json.results.map((r) => [r.name, r.owner]);
  ok('Row 1: the server holds a (FILL, from before) and csv-named (Ann); the omitted row is not there and nothing new carries the fill', J(fills) === J([['a', 'FILL'], ['csv-named', 'Ann']]), fills);

  // ---- Row 2: the sweep spares the young -------------------------------------------------------------------------
  const blobs = path.join(DATA, 'files', 'blobs');
  const putShaped = (lead) => `${lead.slice(0, 2)}/${lead.slice(2, 4)}/${lead.padEnd(64, '0')}-0badf00d`;
  const oldKey = putShaped('0ld0');
  const youngKey = putShaped('9ea9');
  for (const k of [oldKey, youngKey]) {
    const full = path.join(blobs, ...k.split('/'));
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, 'stray ' + k);
  }
  const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
  fs.utimesSync(path.join(blobs, ...oldKey.split('/')), hourAgo, hourAgo);
  // The bucket, and an archive in it (the bucket is shared with the backups).
  const saved = await call('PUT', '/admin/files/config', {
    driver: { type: 's3', endpoint, region: 'us-east-1', bucket: 'puppy', forcePathStyle: true },
    s3Credentials: { accessKeyId: 'AKIAPUPPY', secretAccessKey: 'puppy-secret' }
  });
  ok('Row 2: the bucket connects (the fake checks every signature)', saved.status === 200, saved.json);
  await call('PUT', '/admin/backups/config', { destination: { type: 's3' } });
  const backup = await call('POST', '/admin/backups', {});
  ok('Row 2: an archive is in the bucket', backup.status === 200 && /^s3:\/\/puppy\/backups\//.test(backup.json.archive || ''), backup.json && backup.json.archive);

  await fresh(`${base}/_admin#token=t0k`);
  await waitFor(() => exists('#main'));
  await ev(`location.hash = '#/files'`);
  await waitFor(() => exists('#sweep-enabled'));
  await clickText('button', 'Check now and delete unknown files');
  await waitFor(() => exists('.modal'));
  await clickText('.modal button', 'Check and delete');
  const t2 = await waitFor(async () => (await toasts()).find((t) => /^Done:/.test(t)));
  ok(
    'Row 2: the toast says the old one was deleted and the young one was left alone',
    t2 === 'Done: 1 file no record knows about, 0 records whose file is missing — the unknown files were deleted; 1 file is too new to judge — under 5 minutes old and perhaps still arriving — so it was left alone.',
    t2
  );
  await sleep(800);
  const chip = await ev(`[...document.querySelectorAll('.chip')].map(function(c){return c.innerText.trim()}).find(function(t){return /^last checked/.test(t)}) || null`);
  ok('Row 2: the card’s chip counts the one too new to judge', !!chip && /1 unknown file, 0 missing, 1 too new to judge$/.test(chip), chip);
  await shot('bmg017-row2-cleanup');
  ok('Row 2: on disk — the old stray is gone, the young one is still there', !fs.existsSync(path.join(blobs, ...oldKey.split('/'))) && fs.existsSync(path.join(blobs, ...youngKey.split('/'))));
  const list = (await call('GET', '/admin/backups')).json;
  ok('Row 2: the archive is still in the bucket', (list.backups || []).some((b) => b.where === 's3' && b.path === backup.json.archive), (list.backups || []).map((b) => b.path));

  // ---- Row 3: the magic-link preview reads the policy ----------------------------------------------------------
  await ev(`location.hash = '#/signin'`);
  await waitFor(() => exists('input[type=number][max="1440"]'));
  await setVal('input[type=number][max="1440"]', '60');
  await clickText('button', 'Save policy');
  await sleep(1000);
  const auth = (await call('GET', '/admin/auth')).json;
  const ttl = auth && (auth.config ? auth.config.magicLink.ttlMinutes : auth.magicLink && auth.magicLink.ttlMinutes);
  ok('Row 3: the server holds a 60-minute magic link', ttl === 60, ttl);
  await ev(`location.hash = '#/email/magicLink'`);
  const preview = await waitFor(async () => {
    const t = await txt('#tpl-preview');
    return t && !/Rendering/.test(t) ? t : null;
  });
  ok('Row 3: the Email page’s preview says 60 minutes, not 15', !!preview && /expires in 60 minutes/.test(preview) && !/15 minutes/.test(preview), preview && preview.slice(0, 300));
  await shot('bmg017-row3-preview');

  // ---- Row 4: the box's words ------------------------------------------------------------------------------------
  await ev(`localStorage.clear(); sessionStorage.clear();`);
  await fresh(`${base}/_admin`);
  await waitFor(() => exists('#login-remember'));
  const words = () => ev(`document.querySelector('#login-remember').closest('label').innerText.trim()`);
  const personWords = await words();
  await click('.login-alt .disclose-head');
  await sleep(200);
  await setVal('#login-token', 't0k');
  await sleep(200);
  const credentialWords = await words();
  ok('Row 4: a person is kept on this browser; the credential in this tab', personWords === 'Keep me signed in on this browser' && credentialWords === 'Keep the credential in this tab (it is never kept longer)', { personWords, credentialWords });
  await shot('bmg017-row4-box');

  const passed = Object.values(out.checks).filter((c) => c.pass).length;
  const total = Object.keys(out.checks).length;
  console.log(`\n${passed}/${total} checks passed`);
  out.summary = { passed, total };
  fs.writeFileSync(process.env.OUT, JSON.stringify(out, null, 2));
};
