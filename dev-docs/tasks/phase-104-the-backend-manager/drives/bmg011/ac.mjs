// BMG-011 AC1–AC9 through the page, with the server measured beside every step.
// Rendered text is `innerText` of #main / .modal (the inlined bundle is not in it).
export default async ({ ev, sleep, nav, shot, send, requests }) => {
  const fs = await import('fs');
  const path = await import('path');
  const zlib = await import('zlib');
  const port = process.env.PORT || '8697';
  const base = `http://127.0.0.1:${port}`;
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
  const clickMatch = (sel, re) =>
    ev(`(function(){var b=[...document.querySelectorAll(${J(sel)})].find(function(b){return ${re}.test(b.textContent.trim())}); if(!b) throw new Error('no '+${J(sel)}+' matching '+${J(String(re))}); b.click(); return true})()`);
  const setVal = (sel, v) =>
    ev(`(function(){var e=document.querySelector(${J(sel)}); if(!e) throw new Error('no '+${J(sel)}); var proto=e.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:e.tagName==='SELECT'?HTMLSelectElement.prototype:HTMLInputElement.prototype; Object.getOwnPropertyDescriptor(proto,'value').set.call(e,${J(v)}); e.dispatchEvent(new Event('input',{bubbles:true})); e.dispatchEvent(new Event('change',{bubbles:true})); return true})()`);
  const setChecked = (sel, on) =>
    ev(`(function(){var e=document.querySelector(${J(sel)}); if(!e) throw new Error('no '+${J(sel)}); if(e.checked!==${on?'true':'false'}) e.click(); return e.checked})()`);
  const txt = (sel) => ev(`(function(){var e=document.querySelector(${J(sel)}); return e ? e.innerText.trim() : null})()`);
  const exists = (sel) => ev(`!!document.querySelector(${J(sel)})`);
  const count = (sel) => ev(`document.querySelectorAll(${J(sel)}).length`);
  const enterChip = async (sel, text) => {
    await setVal(sel, text);
    await ev(`(function(){var e=document.querySelector(${J(sel)}); e.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true})); return true})()`);
  };
  const waitFor = async (fn, tries = 30, ms = 300) => {
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
  // CDP sets the files AND fires the change event itself (measured: a second
  // dispatched change uploaded everything twice).
  const setFiles = async (sel, files) => {
    const doc = await send('DOM.getDocument', { depth: 1 });
    const node = await send('DOM.querySelector', { nodeId: doc.result.root.nodeId, selector: sel });
    await send('DOM.setFileInputFiles', { nodeId: node.result.nodeId, files });
  };
  // A real PNG to shrink (the resize never enlarges).
  function makePng(width, height) {
    const table = [];
    for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; table[n] = c >>> 0; }
    const crc = (buf) => { let c = 0xffffffff; for (const b of buf) c = table[(c ^ b) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
    const chunk = (type, data) => { const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const body = Buffer.concat([Buffer.from(type, 'ascii'), data]); const sum = Buffer.alloc(4); sum.writeUInt32BE(crc(body)); return Buffer.concat([len, body, sum]); };
    const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(width, 0); ihdr.writeUInt32BE(height, 4); ihdr[8] = 8; ihdr[9] = 2;
    const raw = Buffer.alloc((width * 3 + 1) * height);
    for (let y = 0; y < height; y++) { for (let x = 0; x < width; x++) { const o = y * (width * 3 + 1) + 1 + x * 3; raw[o] = Math.floor((255 * x) / width); raw[o + 1] = Math.floor((255 * y) / height); raw[o + 2] = 90; } }
    return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
  }
  const UP = process.env.UPLOADS;
  const pngPath = path.join(UP, 'paws.png');
  const txtPath = path.join(UP, 'note.txt');
  const PNG = makePng(48, 32);
  fs.writeFileSync(pngPath, PNG);
  fs.writeFileSync(txtPath, 'a plain note for the storage page\n');

  // BMG-014: a backend with no admin account shows the setup step first. The
  // first admin is made by the API here (that step is BMG-014's drive); the
  // credential then lands in the shell.
  const setup = await call('POST', '/_admin/setup', { email: 'richard@example.com', password: 'first-admin-pw' });
  ok('setup: the first admin account exists (BMG-014)', setup.status === 200 || setup.status === 201, setup.status);
  // A collection with a File field, made by the API (the Schema page is BMG-003's).
  await call('POST', '/admin/schema', { action: 'createTable', table: 'Pet', columns: [{ name: 'name', type: 'String' }, { name: 'bio', type: 'String' }, { name: 'photo', type: 'File' }] });

  // ================================================================ AC1: the browser ============================
  await fresh(`${base}/_admin#token=t0k`);
  await waitFor(() => exists('#app'));
  await ev(`location.hash = '#/files'`);
  await waitFor(() => exists('#file-dropzone'));
  ok('AC1: the Storage page opens empty, with a dropzone', (await exists('#file-dropzone')) && /Nothing stored yet/.test(await txt('#main')));
  await setFiles('#file-dropzone input[type=file]', [pngPath, txtPath]);
  await waitFor(async () => (await count('table.files tbody tr')) === 2, 40);
  ok('AC1: two files uploaded from the page list with their sizes', (await count('table.files tbody tr')) === 2 && /note\.txt/.test(await txt('#main')) && /paws\.png/.test(await txt('#main')) && /34 B/.test(await txt('#main')) && new RegExp((PNG.length / 1024).toFixed(1) + ' KB').test(await txt('#main')), (await txt('#files-count')));
  const listed = await call('GET', '/admin/files');
  ok('server: GET /admin/files answers the same two', listed.json && listed.json.count === 2 && listed.json.files.map((f) => f.originalName).sort().join() === 'note.txt,paws.png', listed.json && listed.json.files.map((f) => f.originalName));
  const pngName = listed.json.files.find((f) => f.originalName === 'paws.png').name;
  const txtName = listed.json.files.find((f) => f.originalName === 'note.txt').name;
  await waitFor(() => exists(`tr[data-file="${pngName}"] img.file-thumb`), 20);
  const thumbSrc = await ev(`(function(){var i=document.querySelector(${J(`tr[data-file="${pngName}"] img.file-thumb`)}); return i ? {src: i.getAttribute('src'), w: i.naturalWidth, h: i.naturalHeight, shown: i.style.display!=='none'} : null})()`);
  ok('AC1: the image row shows a thumbnail served through a signed URL at the sm preset', thumbSrc && /\?exp=\d+&sig=[^&]+&thumb=sm$/.test(thumbSrc.src) && thumbSrc.shown && thumbSrc.w === 48 && thumbSrc.h === 32, thumbSrc);
  await shot('bmg011-storage');
  // Download: the page hands the browser a signed URL; the bytes are byte-equal.
  const dlHref = await ev(`document.querySelector(${J(`tr[data-file="${pngName}"] a.btn`)}).getAttribute('href')`);
  const dl = await fetch(base + dlHref);
  const dlBytes = Buffer.from(await dl.arrayBuffer());
  ok('AC1: the Download link fetches the file byte-equal (no credential: a signed URL)', dl.status === 200 && dlBytes.equals(PNG), { status: dl.status, bytes: dlBytes.length, href: dlHref.slice(0, 60) });
  // A record points at the png.
  const pet = await call('POST', '/classes/Pet', { name: 'Rex', bio: 'a quick brown dog', photo: { __type: 'File', name: pngName, url: `${base}/files/${pngName}` } });
  await click('#files-search'); // nothing; a reload through the search box
  await setVal('#files-search', 'paws');
  await waitFor(async () => (await count('table.files tbody tr')) === 1, 20);
  await waitFor(async () => /Pet · /.test(await txt(`tr[data-file="${pngName}"] .uses-cell`)), 20);
  ok('AC1: the referenced file says which record uses it, as a link to the record', new RegExp('Pet · ' + pet.json.objectId.slice(0, 8)).test(await txt(`tr[data-file="${pngName}"] .uses-cell`)) && (await ev(`document.querySelector(${J(`tr[data-file="${pngName}"] .uses-cell a`)}).getAttribute('href')`)) === `#/collections/Pet/${pet.json.objectId}`, await txt(`tr[data-file="${pngName}"] .uses-cell`));
  await setVal('#files-search', '');
  await waitFor(async () => (await count('table.files tbody tr')) >= 2, 20);
  // Delete the unreferenced one.
  await clickText(`tr[data-file="${txtName}"] button`, 'Delete');
  await waitFor(() => exists('.modal'));
  await clickText('.modal .foot button', 'Delete');
  await waitFor(async () => (await count('table.files tbody tr')) === 1, 20);
  const afterDel = await call('GET', '/admin/files');
  ok('AC1: the unreferenced file deletes from the page; the server lists one', (await count('table.files tbody tr')) === 1 && afterDel.json.count === 1, afterDel.json.files.map((f) => f.originalName));
  // The referenced one refuses with the record named, and offers to clear.
  await clickText(`tr[data-file="${pngName}"] button`, 'Delete');
  await waitFor(() => exists('.modal'));
  await clickText('.modal .foot button', 'Delete');
  await waitFor(async () => /is in use/.test((await txt('.modal')) || ''), 20);
  const refusal = await txt('.modal');
  ok('AC1: the referenced file refuses with the record named and offers to clear the field', /is in use/.test(refusal) && new RegExp('Pet ' + pet.json.objectId).test(refusal) && /Delete anyway and clear 1 field/.test(refusal), refusal.slice(0, 200));
  await shot('bmg011-storage-in-use');
  await clickText('.modal .foot button', 'Keep it');
  ok('server: the file is still there after Keep it', (await call('GET', '/admin/files')).json.count === 1);

  // ================================================================ AC2: refused kinds ============================
  await setChecked('#kind-boxes input[value="unknown"]', true);
  await enterChip('#custom-types .chips-add input', 'exe');
  await sleep(200);
  ok('AC2: a custom type that is not type/subtype is refused inline', /image\/png/.test((await txt('#custom-types .chips-problem')) || ''), await txt('#custom-types .chips-problem'));
  await enterChip('#custom-types .chips-add input', 'application/x-msdownload');
  await sleep(200);
  await click('#save-limits');
  await sleep(600);
  const cfg2 = await call('GET', '/admin/files/config');
  ok('AC2: ticking "Executables and anything unrecognised" stores its documented type; the custom type appends; both read back', cfg2.json && J(cfg2.json.config.contentTypes.denyList) === J(['application/octet-stream', 'application/x-msdownload']), cfg2.json && cfg2.json.config.contentTypes.denyList);
  await fresh(`${base}/_admin#/files`);
  await waitFor(() => exists('#kind-boxes'));
  ok('AC2: after a reload the category is ticked and the custom type is a chip', (await ev(`document.querySelector('#kind-boxes input[value="unknown"]').checked`)) === true && /application\/x-msdownload \(never identified\)/.test(await txt('#custom-types')), await txt('#custom-types'));
  await shot('bmg011-storage-kinds');

  // ================================================================ AC3: presets ==================================
  await setVal('#presets .list-row:not(.list-head):nth-of-type(2) input[aria-label="Width"]', '12');
  await setVal('#presets .list-row:not(.list-head):nth-of-type(2) input[aria-label="Height"]', '8');
  await click('#save-presets');
  await sleep(600);
  const cfg3 = await call('GET', '/admin/files/config');
  const sm = cfg3.json && cfg3.json.config.thumbnails.presets.sm;
  ok('AC3: presets edited on the page are what GET /admin/files/config returns', sm && sm.width === 12 && sm.height === 8 && sm.fit === 'cover', cfg3.json && cfg3.json.config.thumbnails.presets);
  const th = await fetch(`${base}/files/${pngName}?thumb=sm`, { headers: T });
  const thb = Buffer.from(await th.arrayBuffer());
  ok('AC3: /files/:name?thumb=sm honours the edited preset (12×8)', th.status === 200 && thb.readUInt32BE(16) === 12 && thb.readUInt32BE(20) === 8, { status: th.status, w: thb.readUInt32BE(16), h: thb.readUInt32BE(20) });

  // ================================================================ AC4: the clean-up schedule ====================
  await setChecked('#sweep-enabled', true);
  await waitFor(() => exists('#sweep-schedule .sched-modes'));
  await clickText('#sweep-schedule .sched-mode', 'Every week');
  await sleep(300);
  await setVal('#sweep-schedule input[type="time"]', '04:30');
  await sleep(500);
  ok('AC4: no cron text field — the clean-up schedule is the builder, and its sentence is the gloss', !(await exists('#sweep-schedule input[type=text]')) && /Every /.test((await txt('#sweep-schedule .sched-words')) || ''), await txt('#sweep-schedule .sched-words'));
  await click('#save-sweep');
  await sleep(600);
  const cfg4 = await call('GET', '/admin/files/config');
  const sweepCron = cfg4.json && cfg4.json.config.orphanSweep.cron;
  const pv = await call('POST', '/admin/triggers/preview', { cron: sweepCron });
  ok('AC4: the stored cron is one the scheduler accepts, armed, and the page sentence matches the shared gloss', cfg4.json.config.orphanSweep.enabled === true && pv.json.valid === true && typeof cfg4.json.config.sweepStatus.nextRunAt === 'string' && (await txt('#sweep-schedule .sched-words')) === pv.json.words, { cron: sweepCron, words: pv.json.words, next: cfg4.json.config.sweepStatus.nextRunAt });
  await shot('bmg011-storage-cleanup');

  // ================================================================ AC5: backups and restore ======================
  await ev(`location.hash = '#/backups'`);
  await waitFor(() => exists('#backup-now'));
  await click('#backup-now');
  await waitFor(() => exists('tr[data-archive]'), 40);
  const archives = await call('GET', '/admin/backups');
  ok('AC5: Back up now writes an archive the page lists', (await count('tr[data-archive]')) === 1 && archives.json.backups.length === 1, archives.json.backups.map((b) => b.file));
  const archiveFile = archives.json.backups[0].file;
  // The schedule through the builder.
  await setChecked('#backup-enabled', true);
  await waitFor(() => exists('#backup-schedule .sched-modes'));
  await clickText('#backup-schedule .sched-mode', 'Every day');
  await sleep(300);
  await setVal('#backup-schedule input[type="time"]', '02:15');
  await sleep(500);
  await click('#save-schedule');
  await sleep(600);
  const bcfg = await call('GET', '/admin/backups');
  ok('AC4: the backup schedule is stored as the builder’s cron, armed, no cron text field', bcfg.json.config.schedule && bcfg.json.config.schedule.cron === '15 2 * * *' && typeof bcfg.json.config.status.nextRunAt === 'string' && !(await exists('#backup-schedule input[type=text]')), bcfg.json.config.schedule);
  await setVal('#keep-last', '3');
  await setVal('#keep-daily', '2');
  await click('#save-keep');
  await sleep(600);
  ok('backups: keep is three numbers with a sentence, stored', (await txt('#keep-words')) === 'Keeps the last 3, and one a day for 2 days.' && (await call('GET', '/admin/backups')).json.config.retention.keepLast === 3, await txt('#keep-words'));
  await shot('bmg011-backups');
  // A record written after the backup.
  const later = await call('POST', '/classes/Pet', { name: 'Later', bio: 'after the backup' });
  ok('server: a record written after the backup reads back', (await call('GET', '/classes/Pet/' + later.json.objectId)).status === 200);
  await clickMatch('tr[data-archive] button', '/Restore/');
  await waitFor(() => exists('#restore-confirm'));
  const disabledBefore = await ev(`document.querySelector('#restore-confirm').disabled`);
  const ticked = await ev(`document.querySelector('.modal input[type=checkbox]').checked`);
  await setVal('#restore-typed', 'Puppy');
  const disabledWrong = await ev(`document.querySelector('#restore-confirm').disabled`);
  await setVal('#restore-typed', 'Puppy backend');
  const disabledRight = await ev(`document.querySelector('#restore-confirm').disabled`);
  ok('AC5 (R4): Restore waits for the backend’s typed name, with Back up first ticked', disabledBefore && ticked && disabledWrong && !disabledRight, { disabledBefore, ticked, disabledWrong, disabledRight });
  await shot('bmg011-restore-dialog');
  const reqBefore = requests.length;
  // The restore answers in milliseconds on this store: a check AFTER the click
  // would open its window after the event. An observer armed BEFORE the click
  // records whether the page ever blocked, and whether Back up now was disabled then.
  await ev(`(function(){ window.__blocked = {seen:false, backupDisabled:null}; var mo = new MutationObserver(function(){ var b=document.querySelector('.blocked'); if(b && !window.__blocked.seen){ window.__blocked.seen=true; window.__blocked.backupDisabled=document.querySelector('#backup-now').disabled; } }); mo.observe(document.body,{subtree:true,childList:true,attributes:true}); return true })()`);
  await click('#restore-confirm');
  await waitFor(async () => !(await exists('.blocked')), 60);
  const blockedDuring = await ev(`window.__blocked.seen && window.__blocked.backupDisabled === true`);
  const restoreReq = requests.slice(reqBefore).find((r) => /\/admin\/backups\/restore$/.test(r.url));
  ok('AC5: the page blocks every control while the restore runs, then frees them', blockedDuring && !(await exists('.blocked')) && !!restoreReq, { blockedDuring });
  ok('AC5: the record written after the backup is gone from the RUNNING backend', (await call('GET', '/classes/Pet/' + later.json.objectId)).status === 404 && (await call('GET', '/classes/Pet/' + pet.json.objectId)).status === 200);
  const after = await call('GET', '/admin/backups');
  ok('AC5: the back-up-first archive exists beside the restored one', after.json.backups.some((b) => /^pre-restore/.test(b.file)) && after.json.backups.some((b) => b.file === archiveFile), after.json.backups.map((b) => b.file));
  const trail = await call('GET', '/admin/audit?action=backup.restore');
  ok('server: backup.restore is on the trail with reconnected:true', trail.json.entries.some((e) => e.outcome === 'success' && e.detail && e.detail.reconnected === true), trail.json.entries.map((e) => e.detail));
  const written = await call('POST', '/classes/Pet', { name: 'After', bio: 'after the restore' });
  ok('server: a write after the restore lands and reads back', written.status === 201 && (await call('GET', '/classes/Pet/' + written.json.objectId)).status === 200);

  // ================================================================ AC6: secrets ==================================
  await ev(`location.hash = '#/secrets'`);
  await waitFor(() => exists('#add-secret'));
  await click('#add-secret');
  await waitFor(() => exists('#secret-name'));
  const valueType = await ev(`document.querySelector('#secret-value').type`);
  await setVal('#secret-name', 'not a name');
  const nameProblem = await txt('.modal');
  await setVal('#secret-name', 'STRIPE_KEY');
  const VALUE = 'sk_live_drive_' + Math.random().toString(36).slice(2);
  await setVal('#secret-value', VALUE);
  await sleep(100);
  ok('AC6: the value is a password field; the name rule is inline; save enables with both', valueType === 'password' && /letters, digits/.test(nameProblem) && !(await ev(`document.querySelector('#secret-save').disabled`)));
  await shot('bmg011-secret-dialog');
  await click('#secret-save');
  await waitFor(async () => /STRIPE_KEY/.test(await txt('#main')), 20);
  ok('AC6: the secret lists by name; the page never shows the value', /STRIPE_KEY/.test(await txt('#main')) && !(await txt('#main')).includes(VALUE) && /never sent back/.test(await txt('#main')));
  const secretsFile = JSON.parse(fs.readFileSync(path.join(process.env.DATA, 'secrets.json'), 'utf8'));
  ok('server: the value reached secrets.json under the functions namespace (what a Secret node reads)', secretsFile.functions && secretsFile.functions.STRIPE_KEY === VALUE);
  // Every admin GET, with the credential: the value appears nowhere.
  const gets = ['/admin/status', '/admin/schema', '/admin/secrets', '/admin/users', '/admin/roles', '/admin/permissions', '/admin/keys', '/admin/triggers', '/admin/workflows', '/admin/workflow-defs', '/admin/backups', '/admin/files', '/admin/files/config', '/admin/email/config', '/admin/email/templates', '/admin/auth', '/admin/search', '/admin/ops', '/admin/audit?limit=500', '/_admin/whoami', '/executions', '/health'];
  let leak = null;
  for (const p of gets) {
    const r = await fetch(base + p, { headers: T });
    const t = await r.text();
    if (t.includes(VALUE)) leak = p;
  }
  ok('AC6: the value appears in no admin response (' + gets.length + ' routes read)', leak === null, leak);
  const pageText = await ev(`document.documentElement.outerHTML.includes(${J(VALUE)})`);
  ok('AC6: nor anywhere in the page’s DOM after the dialog closed', pageText === false);
  await shot('bmg011-secrets');

  // ================================================================ AC7: search ===================================
  await ev(`location.hash = '#/search'`);
  await waitFor(() => exists('#search-card-Pet'));
  const fts = (await call('GET', '/admin/search')).json.fts5Available;
  if (fts) {
    await setChecked('#search-Pet', true);
    await waitFor(() => exists('#search-card-Pet .picker input'));
    await setVal('#search-card-Pet .picker input', 'bi');
    await waitFor(() => exists('#search-card-Pet .picker-row'), 20);
    await ev(`(function(){var e=document.querySelector('#search-card-Pet .picker input'); e.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true})); return true})()`);
    await sleep(200);
    await clickText('#search-card-Pet button', 'Save');
    await waitFor(async () => /records? indexed/.test(await txt('#search-card-Pet')), 20);
    const hit = await call('POST', '/classes/Pet', { _method: 'GET', search: 'quick brown' });
    const miss = await call('POST', '/classes/Pet', { _method: 'GET', search: 'Rex' });
    ok('AC7: made searchable over bio from the page; a search answers on bio and not on name', hit.status === 200 && hit.json.results.map((r) => r.name).join() === 'Rex' && miss.json.results.length === 0, { indexed: await txt('#search-card-Pet'), hit: hit.json.results && hit.json.results.map((r) => r.name) });
  } else {
    ok('AC7: this engine has no FTS5 and the page says so', /without full-text search/.test(await txt('#main')));
  }
  await shot('bmg011-search');

  // ================================================================ AC8: server / CORS ============================
  await ev(`location.hash = '#/server'`);
  await waitFor(() => exists('#cors-any'));
  await setChecked('#cors-any', false);
  await waitFor(() => exists('#cors-origins .chips-add input'));
  await enterChip('#cors-origins .chips-add input', 'app.example.com');
  await sleep(200);
  const originProblem = await txt('#cors-origins .chips-problem');
  await enterChip('#cors-origins .chips-add input', 'https://app.example.com/some/page');
  await sleep(200);
  await click('#save-cors');
  await sleep(600);
  const preflight = async (origin) => {
    const r = await fetch(base + '/classes/Pet', { method: 'OPTIONS', headers: { origin, 'access-control-request-method': 'GET', 'access-control-request-headers': 'content-type' } });
    return r.headers.get('access-control-allow-origin');
  };
  ok('AC8: an origin without a scheme is refused inline; a pasted page URL keeps its origin; the preflight receives it', /https:\/\/app\.example\.com/.test(originProblem || '') && (await preflight('https://app.example.com')) === 'https://app.example.com' && (await preflight('https://evil.example.com')) === null, { originProblem, ops: (await call('GET', '/admin/ops')).json.config.cors });
  await shot('bmg011-server');
  await setVal('#audit-days', '45');
  await click('#save-audit');
  await sleep(600);
  ok('AC8: the activity-trail card saves alone and applies at once', (await call('GET', '/admin/audit?limit=1')).json.retentionDays === 45);
  await setChecked('#rate-enabled', true);
  await sleep(200);
  ok('server: with limiting on, rate limits are a table of 7 kinds with two numbers each, no comma list', (await count('#rate-table .list-row[data-class]')) === 7 && (await count('#rate-table input[type=number]')) === 14);

  // ================================================================ Activity ======================================
  await ev(`location.hash = '#/audit'`);
  await waitFor(() => exists('#activity-filter'));
  await waitFor(async () => (await count('tbody tr')) > 3, 20);
  const activity = await txt('#main');
  ok('Activity: entries read as words with the thing as a link — the file delete, the restore, the secret', /file · delete/.test(activity) && /backup · restore/.test(activity) && /secret · set/.test(activity) && /the admin credential/.test(activity) && (await exists('tbody a[href="#/backups"]')) && (await exists('tbody a[href="#/secrets"]')), activity.slice(0, 300));
  await click('#activity-filter .filter-adds button');
  await sleep(200);
  await setVal('#activity-filter .filter-line select', 'who');
  await sleep(200);
  await setVal('#activity-filter select.filter-value', 'apiKey');
  await sleep(600);
  ok('Activity: the filter is action · who · outcome · when, and asks the route by actorKind', /actorKind=apiKey/.test(requests.filter((r) => /\/admin\/audit\?/.test(r.url)).pop().url) && /No entries|Nothing matches/.test(await txt('#main')), requests.filter((r) => /\/admin\/audit\?/.test(r.url)).pop().url);
  await shot('bmg011-activity');

  // ================================================================ AC9: sweep the six pages ======================
  const CRON = '^[\\d*/,-]+(\\s+[\\d*/,-]+){4}$';
  const offenders = [];
  for (const page of ['files', 'backups', 'secrets', 'search', 'server', 'audit']) {
    await ev(`location.hash = '#/' + ${J(page)}`);
    await sleep(900);
    if (page === 'files') { await setChecked('#sweep-enabled', true); await sleep(300); }
    if (page === 'backups') { await setChecked('#backup-enabled', true); await sleep(300); }
    if (page === 'server') { await setChecked('#cors-any', false); await sleep(300); }
    const found = await ev(`(function(){var out=[]; var cron=new RegExp(${J(CRON)}); document.querySelectorAll('#main input:not([type]), #main input[type=text], #main input[type=search], #main textarea').forEach(function(e){ var label=e.closest('label'); var words=[e.placeholder||'', e.getAttribute('aria-label')||'', label?label.innerText:''].join(' ').toLowerCase(); if(/comma|cron/.test(words)) out.push(${J(page)}+': '+words.slice(0,60)); if(cron.test(e.value||'')) out.push(${J(page)}+': value '+e.value); }); return out})()`);
    offenders.push(...found);
  }
  ok('AC9: no comma-separated or cron text field on any of the six pages', offenders.length === 0, offenders);

  fs.writeFileSync(process.env.OUT, JSON.stringify(out, null, 2));
  const n = Object.keys(out.checks).length;
  const passed = Object.values(out.checks).filter((c) => c.pass).length;
  console.log(`\n${passed}/${n} checks passed`);
};
