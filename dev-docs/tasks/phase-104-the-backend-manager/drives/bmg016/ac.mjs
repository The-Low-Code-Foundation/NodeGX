// BMG-016 — the leftovers, through the page, with the server (and the S3 fake) measured beside every step.
// R6 the one-time fill; the page cap on Server; Move files to the bucket; R7 a person signs in once per browser.
// (The restore's settings reload and the MCP tool are graded over HTTP in jest; the editor's link in tests-main.)
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
  const bucketKeys = async (prefix = '') => {
    const r = await fetch(`${endpoint}/puppy?list-type=2&prefix=${encodeURIComponent(prefix)}`, { headers: { authorization: 'AWS4-HMAC-SHA256 Credential=AKIAPUPPY/x/x/s3/aws4_request, SignedHeaders=host, Signature=x' } });
    return Array.from((await r.text()).matchAll(/<Key>([^<]*)<\/Key>/g)).map((m) => m[1]);
  };
  const click = (sel) => ev(`(function(){var e=document.querySelector(${J(sel)}); if(!e) throw new Error('no '+${J(sel)}); e.click(); return true})()`);
  const clickText = (sel, text) =>
    ev(`(function(){var b=[...document.querySelectorAll(${J(sel)})].find(function(b){return b.textContent.trim()===${J(text)}}); if(!b) throw new Error('no '+${J(sel + ' ' + text)}+' among '+[...document.querySelectorAll(${J(sel)})].map(function(b){return b.textContent.trim()}).join('|')); b.click(); return true})()`);
  const setVal = (sel, v) =>
    ev(`(function(){var e=document.querySelector(${J(sel)}); if(!e) throw new Error('no '+${J(sel)}); var proto=e.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:e.tagName==='SELECT'?HTMLSelectElement.prototype:HTMLInputElement.prototype; Object.getOwnPropertyDescriptor(proto,'value').set.call(e,${J(v)}); e.dispatchEvent(new Event('input',{bubbles:true})); e.dispatchEvent(new Event('change',{bubbles:true})); return true})()`);
  const txt = (sel) => ev(`(function(){var e=document.querySelector(${J(sel)}); return e ? e.innerText.trim() : null})()`);
  const exists = (sel) => ev(`!!document.querySelector(${J(sel)})`);
  const disabled = (sel) => ev(`(function(){var e=document.querySelector(${J(sel)}); return e ? !!e.disabled : null})()`);
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

  // ---- seed: the first admin (BMG-014's step, by the API), a collection with two records -------------
  const setup = await call('POST', '/_admin/setup', { email: 'richard@example.com', password: 'first-admin-pw' });
  ok('seed: the first admin account exists', setup.status === 200 || setup.status === 201, setup.status);
  await call('POST', '/admin/schema', { action: 'createTable', table: 'Pet', columns: [{ name: 'name', type: 'String' }] });
  for (const name of ['Rex', 'Tess']) await call('POST', '/classes/Pet', { name });

  // ---- R6: the one-time fill -------------------------------------------------------------------------
  await fresh(`${base}/_admin#token=t0k`);
  await waitFor(() => exists('#main'));
  await ev(`location.hash = '#/schema/Pet/new-field'`);
  await waitFor(() => exists('.drawer .tile'));
  await click('.drawer .tile input[value="text"]');
  await sleep(300);
  await setVal('.drawer input[aria-label="Field name"]', 'phone');
  await click('.drawer input[aria-label="Required"]');
  await sleep(250);
  const fillBox = '.drawer #kind-options input[aria-label="Fill the 2 records already here with"]';
  ok('R6: over 2 records the box is the one-time fill, and says it is not a default', (await exists(fillBox)) && /Once, now\. It is not a default: a new record without this field is refused\./.test(await txt('.drawer')), (await txt('.drawer')).slice(0, 400));
  await setVal(fillBox, "O'Neill");
  await shot('bmg016-r6-fill');
  await clickText('.drawer-foot button', 'Add field');
  await sleep(1500);
  const pets = (await call('GET', '/classes/Pet?order=name')).json.results;
  ok("R6: the two records there were filled once — an apostrophe too", J(pets.map((p) => [p.name, p.phone])) === J([['Rex', "O'Neill"], ['Tess', "O'Neill"]]), pets.map((p) => [p.name, p.phone]));
  const col = ((await call('GET', '/admin/schema/Pet')).json.columns || []).find((c) => c.name === 'phone');
  ok('R6: declared required with NO default', col && col.required === true && col.defaultValue === undefined && col.fillExisting === undefined, col);
  const forgot = await call('POST', '/classes/Pet', { name: 'Newcomer' });
  ok('R6: a new record without the field is refused, naming it — the point of Required', forgot.status === 400 && /"phone" is required on "Pet"/.test((forgot.json && forgot.json.error) || ''), forgot);

  // ---- the page cap on Server -------------------------------------------------------------------------
  await ev(`location.hash = '#/server'`);
  await waitFor(() => exists('#lists-default'));
  ok('Server: How long a list can be shows the backend’s two numbers', (await ev(`document.querySelector('#lists-default').value`)) === '1000' && (await ev(`document.querySelector('#lists-max').value`)) === '10000');
  await setVal('#lists-max', '50');
  await setVal('#lists-default', '100');
  await sleep(200);
  ok('Server: upside down is refused inline and Save is off', /cannot be shorter/.test((await txt('#lists-problem')) || '') && (await disabled('#save-lists')) === true, await txt('#lists-problem'));
  await shot('bmg016-lists-refused');
  await setVal('#lists-max', '5000');
  await sleep(200);
  await click('#save-lists');
  await sleep(1200);
  const ops = (await call('GET', '/admin/ops')).json.config.queries;
  ok('Server: saved as the queries section', J(ops) === J({ defaultLimit: 100, maxLimit: 5000 }), ops);

  // ---- Move files to the bucket -------------------------------------------------------------------------
  const UP = process.env.UPLOADS;
  const a = path.join(UP, 'a.txt');
  const b = path.join(UP, 'b.txt');
  fs.writeFileSync(a, 'first file, on this machine\n');
  fs.writeFileSync(b, 'second file, also on this machine\n');
  await ev(`location.hash = '#/files'`);
  await waitFor(() => exists('#where-card'));
  ok('Move: no move card while uploads go to this machine', !(await exists('#move-card')));
  await setFiles('#file-dropzone input[type=file]', [a]);
  await waitFor(async () => ((await txt('#files-count')) || '').includes('of 1'));
  await setFiles('#file-dropzone input[type=file]', [b]);
  await waitFor(async () => ((await txt('#files-count')) || '').includes('of 2'));
  const saved = await call('PUT', '/admin/files/config', { driver: { type: 's3', endpoint, region: 'us-east-1', bucket: 'puppy', forcePathStyle: true }, s3Credentials: { accessKeyId: 'AKIAPUPPY', secretAccessKey: 'x' } });
  ok('Move: the bucket connects (the card appears only then)', saved.status === 200, saved.status);
  await fresh(`${base}/_admin#token=t0k`);
  await waitFor(() => exists('#main'));
  await ev(`location.hash = '#/files'`);
  await waitFor(() => exists('#move-card'));
  ok('Move: the card counts the files still on this machine', (await txt('#move-words')) === '2 files are still on this machine. They keep serving from here; new uploads go to the bucket.', await txt('#move-words'));
  await shot('bmg016-move-before');
  await click('#move-start');
  await waitFor(() => exists('.modal'));
  ok('Move: it asks first, and says a file that cannot move keeps working', /Move 2 files to the bucket\?/.test(await txt('.modal')) && /stays where it is and keeps working/.test(await txt('.modal')), await txt('.modal'));
  await clickText('.modal .foot button', 'Move');
  const words = await waitFor(async () => {
    const w = (await txt('#move-words')) || '';
    return /moved to the bucket/.test(w) ? w : null;
  });
  await shot('bmg016-move-done');
  ok('Move: the card says what happened, from the route', words === '2 files moved to the bucket. Every file is in the bucket.', words);
  const keys = await bucketKeys();
  const list = (await call('GET', '/admin/files')).json.files;
  ok('Move: both are in the bucket and neither is on this machine', keys.length === 2 && (await call('GET', '/admin/files/move')).json.onThisMachine === 0, { keys, onThisMachine: (await call('GET', '/admin/files/move')).json.onThisMachine });
  const bodies = [];
  for (const f of list) bodies.push(await (await fetch(base + '/files/' + encodeURIComponent(f.name))).text());
  ok('Move: each still serves, byte for byte', J(bodies.sort()) === J(['first file, on this machine\n', 'second file, also on this machine\n']), bodies);
  const s3log = fs.readFileSync(process.env.S3LOG, 'utf8');
  ok('Move: served FROM the bucket now (the fake saw the GETs)', list.every((f) => s3log.includes('GET /puppy/')), s3log.split('\n').filter((l) => /GET \/puppy\//.test(l)).length);

  // ---- R7: a person signs in once per browser ------------------------------------------------------------
  await ev(`localStorage.clear(); sessionStorage.clear(); true`);
  await fresh(`${base}/_admin#route=${encodeURIComponent('/server')}`);
  await waitFor(() => exists('#login-form'));
  ok('R7: opened with no credential, the page asks for email + password, "Keep me signed in on this browser" ticked', (await exists('#login-email')) && (await ev(`document.querySelector('#login-remember').checked`)) === true && /on this browser/.test(await txt('#login-form')));
  await shot('bmg016-r7-sign-in');
  await setVal('#login-email', 'richard@example.com');
  await setVal('#login-password', 'first-admin-pw');
  await clickText('#login-form button', 'Sign in');
  await waitFor(() => exists('#app'));
  await sleep(600);
  ok('R7: signed in as the person, on the page the link named', (await txt('#person-chip')) === 'richard@example.com' && (await ev('location.hash')) === '#/server', [await txt('#person-chip'), await ev('location.hash')]);
  const stored = await ev(`JSON.stringify({person: localStorage.getItem('nodegx.admin.person'), tab: sessionStorage.getItem('nodegx.admin.token')})`);
  const kept = JSON.parse(stored);
  ok('R7: the session is kept for the browser; nothing for the tab', /"kind":"session"/.test(kept.person || '') && kept.tab === null, kept);
  // A change as the person: Activity names them, not the credential.
  await setVal('#lists-default', '120');
  await sleep(150);
  await click('#save-lists');
  await sleep(1200);
  const personId = (await call('GET', '/_admin/whoami', undefined, { 'x-parse-session-token': JSON.parse(kept.person).value })).json.person.id;
  const trail = (await call('GET', '/admin/audit?action=ops.config.update&limit=1')).json.entries[0];
  // Control: the SAME change made with the credential names no person.
  await call('PUT', '/admin/ops', { queries: { defaultLimit: 120, maxLimit: 5000 } });
  const byKey = (await call('GET', '/admin/audit?action=ops.config.update&limit=1')).json.entries[0];
  ok('R7: Activity records the person (their id) for a change made on the page; the credential records none', trail && trail.actor === personId && byKey && byKey.actor !== personId, { person: trail && trail.actor, credential: byKey && byKey.actor, personId });
  // The next open from the editor: a new tab has an empty sessionStorage; the link carries no credential.
  await ev(`sessionStorage.clear(); true`);
  await fresh(`${base}/_admin#route=${encodeURIComponent('/files')}`);
  await waitFor(() => exists('#app'));
  await sleep(600);
  ok('R7: the next open is already the person, on its page — no password asked', (await txt('#person-chip')) === 'richard@example.com' && (await ev('location.hash')) === '#/files' && !(await exists('#login-form')), [await txt('#person-chip'), await ev('location.hash')]);
  const token = JSON.parse(kept.person).value;
  const before = await call('GET', '/_admin/whoami', undefined, { 'x-parse-session-token': token });
  await click('#signout');
  await sleep(800);
  ok('R7: Sign out forgets the session in this browser', (await ev(`localStorage.getItem('nodegx.admin.person')`)) === null && (await exists('#login-form')));
  const after = await call('GET', '/_admin/whoami', undefined, { 'x-parse-session-token': token });
  ok('R7: …and ends it on the server (the same token: 200 before, "Invalid session token" 209 after)', before.status === 200 && after.status === 400 && after.json && after.json.code === 209, [before.status, after.status, after.json]);

  fs.writeFileSync(process.env.OUT, JSON.stringify(out, null, 2));
  const failed = Object.entries(out.checks).filter(([, v]) => !v.pass);
  console.log(`\n${Object.keys(out.checks).length - failed.length}/${Object.keys(out.checks).length} checks passed`);
  if (failed.length) process.exitCode = 1;
};
