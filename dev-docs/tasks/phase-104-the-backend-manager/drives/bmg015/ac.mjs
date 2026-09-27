// BMG-015 AC1–AC6 through the page, with the server AND the bucket (the S3 fake on S3PORT) measured beside every
// step. Rendered text is `innerText` of #main / .modal (the inlined bundle is not in it).
export default async ({ ev, sleep, nav, shot, send }) => {
  const fs = await import('fs');
  const path = await import('path');
  const port = process.env.PORT || '8697';
  const s3port = process.env.S3PORT || '9400';
  const base = `http://127.0.0.1:${port}`;
  const endpoint = `http://127.0.0.1:${s3port}`;
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
  // The bucket, read straight from the fake with a signed-enough request (the fake checks only the key id).
  const bucketKeys = async (prefix = '') => {
    const r = await fetch(`${endpoint}/puppy?list-type=2&prefix=${encodeURIComponent(prefix)}`, { headers: { authorization: 'AWS4-HMAC-SHA256 Credential=AKIAPUPPY/x/x/s3/aws4_request, SignedHeaders=host, Signature=x' } });
    const xml = await r.text();
    return Array.from(xml.matchAll(/<Key>([^<]*)<\/Key>/g)).map((m) => m[1]);
  };
  const click = (sel) => ev(`(function(){var e=document.querySelector(${J(sel)}); if(!e) throw new Error('no '+${J(sel)}); e.click(); return true})()`);
  const setVal = (sel, v) =>
    ev(`(function(){var e=document.querySelector(${J(sel)}); if(!e) throw new Error('no '+${J(sel)}); var proto=e.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:e.tagName==='SELECT'?HTMLSelectElement.prototype:HTMLInputElement.prototype; Object.getOwnPropertyDescriptor(proto,'value').set.call(e,${J(v)}); e.dispatchEvent(new Event('input',{bubbles:true})); e.dispatchEvent(new Event('change',{bubbles:true})); return true})()`);
  const txt = (sel) => ev(`(function(){var e=document.querySelector(${J(sel)}); return e ? e.innerText.trim() : null})()`);
  const exists = (sel) => ev(`!!document.querySelector(${J(sel)})`);
  const disabled = (sel) => ev(`(function(){var e=document.querySelector(${J(sel)}); return e ? !!e.disabled : null})()`);
  const attr = (sel, a) => ev(`(function(){var e=document.querySelector(${J(sel)}); return e ? e.getAttribute(${J(a)}) : null})()`);
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
  const setFiles = async (sel, files) => {
    const doc = await send('DOM.getDocument', { depth: 1 });
    const node = await send('DOM.querySelector', { nodeId: doc.result.root.nodeId, selector: sel });
    await send('DOM.setFileInputFiles', { nodeId: node.result.nodeId, files });
  };
  const UP = process.env.UPLOADS;
  const beforePath = path.join(UP, 'before.txt');
  const afterPath = path.join(UP, 'after.txt');
  fs.writeFileSync(beforePath, 'uploaded before the switch\n');
  fs.writeFileSync(afterPath, 'uploaded after the switch — lives in the bucket\n');

  // BMG-014: the first admin is made by the API (that step is BMG-014's drive); the credential then lands in the shell.
  const setup = await call('POST', '/_admin/setup', { email: 'richard@example.com', password: 'first-admin-pw' });
  ok('setup: the first admin account exists (BMG-014)', setup.status === 200 || setup.status === 201, setup.status);
  await call('POST', '/admin/schema', { action: 'createTable', table: 'Pet', columns: [{ name: 'name', type: 'String' }] });

  // ---------------------------------------------------------------- AC1 --
  await fresh(`${base}/_admin#token=t0k`);
  await waitFor(() => exists('#main'));
  await ev(`location.hash = '#/files'`);
  await waitFor(() => exists('#where-card'));
  // A file stored on this machine, before the switch (AC6's subject).
  await setFiles('#file-dropzone input[type=file]', [beforePath]);
  await waitFor(async () => (await txt('#files-count') || '').includes('of 1'));
  const localTile = await ev(`document.querySelector('input[name="where"][value="local"]').checked`);
  ok('AC1: a fresh backend shows "This machine" chosen and "stored on this machine"', localTile === true && /stored on this machine/.test(await txt('#main')), localTile);
  await click('input[name="where"][value="s3"]');
  await sleep(200);
  ok('AC1: choosing the bucket tile opens the form; Save is off until a test passes; the secret is a password field', (await exists('#bucket-form')) && (await disabled('#save-where')) === true && (await attr('#s3-secret', 'type')) === 'password' && /key: not configured/.test(await txt('#where-card')));
  await shot('bmg015-storage-bucket-form');
  await setVal('#s3-endpoint', endpoint);
  await setVal('#s3-bucket', 'puppy');
  await setVal('#s3-access-key-id', 'AKIANOBODY');
  await setVal('#s3-secret', 'wrong');
  await click('#s3-test');
  const badResult = await waitFor(() => txt('#s3-test-result'));
  ok("AC1: a wrong key answers S3's own sentence and Save stays off", /InvalidAccessKeyId/.test(badResult || '') && (await disabled('#save-where')) === true, badResult);
  await shot('bmg015-storage-test-refused');
  await setVal('#s3-access-key-id', 'AKIAPUPPY');
  await setVal('#s3-secret', 'puppy-secret');
  ok('AC1: editing after a test clears the result and Save goes off again', !(await exists('#s3-test-result')) && (await disabled('#save-where')) === true);
  await click('#s3-test');
  const goodResult = await waitFor(() => txt('#s3-test-result'));
  ok('AC1: the right key answers connected; Save is on; the probe key is gone from the bucket', /^Connected: a test file was written to "puppy"/.test(goodResult || '') && (await disabled('#save-where')) === false && (await bucketKeys()).length === 0, goodResult);
  await shot('bmg015-storage-test-connected');
  await click('#save-where');
  await waitFor(async () => /key: configured/.test((await txt('#where-card')) || ''));
  const cfg = await call('GET', '/admin/files/config');
  ok('AC1: after Save the server says s3, the key is configured, and the key is not in the answer', cfg.json && cfg.json.driverKind === 's3' && cfg.json.s3CredentialsConfigured === true && !JSON.stringify(cfg.json).includes('puppy-secret') && /stored in S3/.test(await txt('#main')), cfg.json && cfg.json.config.driver);
  await shot('bmg015-storage-connected');

  // ---------------------------------------------------------------- AC2 --
  await setFiles('#file-dropzone input[type=file]', [afterPath]);
  await waitFor(async () => (await txt('#files-count') || '').includes('of 2'));
  const keys = await bucketKeys();
  const blobDir = path.join(process.env.DATA, 'files', 'blobs');
  const walk = (d) => (fs.existsSync(d) ? fs.readdirSync(d).flatMap((n) => (fs.statSync(path.join(d, n)).isDirectory() ? walk(path.join(d, n)) : [path.join(d, n)])) : []);
  ok('AC2: the upload after the switch is in the bucket (one object) and not on the disk (one local blob: the earlier file)', keys.length === 1 && walk(blobDir).length === 1, { keys, local: walk(blobDir).length });
  const list = await call('GET', '/admin/files');
  const afterRow = list.json.files.find((f) => f.originalName === 'after.txt');
  const beforeRow = list.json.files.find((f) => f.originalName === 'before.txt');
  const served = await fetch(`${base}/files/${encodeURIComponent(afterRow.name)}`);
  ok('AC2: the bucket file serves back byte-equal', served.status === 200 && (await served.text()) === fs.readFileSync(afterPath, 'utf8'), served.status);

  // ---------------------------------------------------------------- AC6 --
  const s3log = () => fs.readFileSync(process.env.S3LOG, 'utf8');
  const getsBefore = (s3log().match(/GET \/puppy\//g) || []).length;
  const servedBefore = await fetch(`${base}/files/${encodeURIComponent(beforeRow.name)}`);
  ok('AC6: the file uploaded before the switch still serves, from this machine (the bucket saw no GET for it)', servedBefore.status === 200 && (await servedBefore.text()) === fs.readFileSync(beforePath, 'utf8') && (s3log().match(/GET \/puppy\//g) || []).length === getsBefore, servedBefore.status);
  await shot('bmg015-storage-both-files');

  // ---------------------------------------------------------------- AC3 --
  await ev(`location.hash = '#/backups'`);
  await waitFor(() => exists('#backup-where'));
  const bucketTileOn = await ev(`!document.querySelector('input[name="backup-where"][value="s3"]').disabled`);
  ok('AC3: with the bucket connected, the Backups page offers "The bucket from the Storage page" with its name', bucketTileOn === true && /Archives go to "puppy" under backups\//.test(await txt('#backup-where')));
  await click('input[name="backup-where"][value="s3"]');
  await sleep(150);
  await click('#backup-where #save-where');
  await waitFor(async () => /Archives live in the bucket "puppy" under backups\//.test((await txt('#main')) || ''));
  ok('AC3: after Save the sentence names the bucket', /Archives live in the bucket "puppy" under backups\//.test(await txt('#main')));
  await shot('bmg015-backups-where');
  await call('POST', '/classes/Pet', { name: 'Before the backup' });
  await click('#backup-now');
  await waitFor(() => exists('tr[data-archive]'));
  const archives = await bucketKeys('backups/');
  const row = await txt('tr[data-archive]');
  ok('AC3: Back up now writes the archive under backups/ in the bucket and lists it "in the bucket"', archives.length === 1 && /in the bucket/.test(row || '') && !fs.existsSync(path.join(process.env.DATA, 'backups')), { archives, row });
  await shot('bmg015-backups-list');
  // Download: the page fetches with the credential and hands the browser a blob — measure the route the page uses.
  const archiveFile = archives[0].slice('backups/'.length);
  const dl = await fetch(`${base}/admin/backups/archive?file=${encodeURIComponent(archiveFile)}`, { headers: T });
  const dlBytes = Buffer.from(await dl.arrayBuffer());
  const obj = await fetch(`${endpoint}/puppy/backups/${encodeURIComponent(archiveFile)}`, { headers: { authorization: 'AWS4-HMAC-SHA256 Credential=AKIAPUPPY/x/x/s3/aws4_request, SignedHeaders=host, Signature=x' } });
  const objBytes = Buffer.from(await obj.arrayBuffer());
  ok('AC3: Download streams the object byte-equal', dl.status === 200 && dlBytes.equals(objBytes) && dlBytes.length > 0, { bytes: dlBytes.length });
  // Restore (R4): type the name; the record written after the backup is gone; the safety copy is in the bucket.
  await call('POST', '/classes/Pet', { name: 'After the backup' });
  await click('tr[data-archive] .btn.danger');
  await waitFor(() => exists('#restore-typed'));
  await setVal('#restore-typed', 'Puppy backend');
  await shot('bmg015-restore-dialog');
  await click('#restore-confirm');
  await waitFor(async () => !(await exists('.notice.warn')), 60, 500);
  const pets = await call('GET', '/classes/Pet');
  const names = (pets.json && pets.json.results ? pets.json.results : []).map((p) => p.name);
  const after = await bucketKeys('backups/');
  ok('AC3: Restore from the bucket on the running backend — the later record is gone, the earlier stays, the safety copy is in the bucket', names.includes('Before the backup') && !names.includes('After the backup') && after.some((k) => k.startsWith('backups/pre-restore-')), { names, after });
  const written = await call('POST', '/classes/Pet', { name: 'After the restore' });
  ok('AC3: a write after the restore lands (the reconnect)', written.status === 201, written.status);

  // ---------------------------------------------------------------- AC4 --
  await setVal('#keep-last', '1');
  await setVal('#keep-daily', '0');
  await setVal('#keep-weekly', '0');
  await click('#save-keep');
  await sleep(500);
  await click('#backup-now');
  await waitFor(async () => (await bucketKeys('backups/')).length === 1, 30, 300);
  const kept = await bucketKeys('backups/');
  ok('AC4: keep the last 1 — a new backup leaves exactly one archive in the bucket', kept.length === 1 && kept[0].startsWith('backups/backup-'), kept);
  await shot('bmg015-backups-retention');

  // ---------------------------------------------------------------- AC5 --
  const answers = [];
  for (const p of ['/admin/files/config', '/admin/backups', '/admin/secrets', '/admin/ops']) answers.push(JSON.stringify((await call('GET', p)).json));
  ok('AC5: no admin read carries the secret', answers.every((a) => !a.includes('puppy-secret')));
  const pageHtml = await ev(`document.documentElement.outerHTML`);
  ok('AC5: the secret is not in the page either', !pageHtml.includes('puppy-secret'));

  fs.writeFileSync(process.env.OUT, JSON.stringify(out, null, 2));
  const n = Object.keys(out.checks).length;
  const passed = Object.values(out.checks).filter((c) => c.pass).length;
  console.log(`\n${passed}/${n} checks passed`);
};
