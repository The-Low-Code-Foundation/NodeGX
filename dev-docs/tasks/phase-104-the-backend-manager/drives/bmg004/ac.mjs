// BMG-004 AC1–AC9 through the page, with the server measured beside every step.
// Rendered text only — `document.body.textContent` includes the inlined app bundle's source.
export default async ({ ev, sleep, nav, shot, key, typeText, send }) => {
  const fs = await import('fs');
  const port = process.env.PORT || '8697';
  const base = `http://127.0.0.1:${port}`;
  const out = {};
  const call = async (method, path, body, headers = {}) => {
    const r = await fetch(base + path, { method, headers: { ...headers, ...(body ? { 'content-type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined });
    return { status: r.status, json: await r.json().catch(() => null) };
  };
  const admin = (method, path, body) => call(method, path, body, { authorization: 'Bearer t0k' });
  const login = (username, password) => call('POST', '/login', { username, password });
  const people = async () => (await admin('GET', '/admin/users?limit=200')).json.users;
  const idOf = async (username) => (await people()).find((u) => u.username === username).objectId;
  const sessionsOf = async (username) => (await people()).find((u) => u.username === username).sessions;
  const members = async (role) => ((await admin('GET', '/admin/roles')).json.roles.find((r) => r.name === role) || { users: [] }).users;

  const seen = () => ev(`(document.querySelector('#main')||{textContent:''}).textContent + ' ' + [...document.querySelectorAll('.drawer, .modal')].map(e => e.textContent).join(' ')`);
  const clickText = (sel, text) =>
    ev(`(function(){var b=[...document.querySelectorAll(${JSON.stringify(sel)})].find(function(b){return b.textContent.trim()===${JSON.stringify(text)}}); if(!b) throw new Error('no '+${JSON.stringify(sel + ' ' + text)}); b.click(); return true})()`);
  const focus = (sel) => ev(`(function(){var e=document.querySelector(${JSON.stringify(sel)}); if(!e) throw new Error('no '+${JSON.stringify(sel)}); e.focus(); if (e.select) e.select(); return true})()`);
  const fill = async (sel, text) => { await focus(sel); await typeText(text); await sleep(150); };
  const rows = () => ev(`[...document.querySelectorAll('#main tbody tr')].map(tr => [...tr.children].map(td => td.textContent.trim()))`);
  const heads = () => ev(`[...document.querySelectorAll('#main thead th')].map(th => th.textContent.trim())`);
  const openRow = (username) =>
    ev(`(function(u){var tr=[...document.querySelectorAll('#main tbody tr')].find(function(t){var b=t.querySelector('.person-text b'); return b && b.textContent===u}); if(!tr) throw new Error('no row '+u); tr.click(); return true})(${JSON.stringify(username)})`);

  // Every id the page could leak, full and as the 8-character short form the old grid used.
  const ids = async () => {
    const list = (await people()).map((u) => u.objectId);
    return list.concat(list.map((i) => i.slice(0, 8)));
  };
  const leaks = [];
  const checkIds = async (where) => {
    const text = await seen();
    for (const id of await ids()) if (text.indexOf(id) !== -1) leaks.push({ where, id });
  };

  out.seededOldDoorRefused = (await call('POST', '/users', { username: 'q', password: 'p' })).status;

  await nav(`${base}/_admin#token=t0k`);
  await sleep(1500);
  await ev(`location.hash = '#/users'`);
  await sleep(1200);
  out.listHeads = await heads();
  out.listRows = await rows();
  await checkIds('list');
  await shot('bmg004-list');

  // ---- AC9: search by a middle fragment of an email ---------------------------------------------------
  await fill('#main input.users-search', 'ob@exam');
  await sleep(700);
  out.ac9_rows = (await rows()).map((r) => r[0]);
  await shot('bmg004-search');
  await ev(`(function(){var i=document.querySelector('#main input.users-search'); i.value=''; i.dispatchEvent(new Event('input',{bubbles:true})); return true})()`);
  await sleep(700);

  // ---- AC1: add a field from the Users toolbar, set it in the drawer, read it back -------------------
  await clickText('#main button', 'Add a field');
  await sleep(400);
  await fill('.modal input[aria-label="Field name"]', 'phone');
  await shot('bmg004-add-field');
  await clickText('.modal button', 'Add field');
  await sleep(900);
  out.ac1_headsAfterAdd = await heads();
  await openRow('ann');
  await sleep(900);
  out.ac1_hash = await ev(`location.hash`);
  out.ac1_drawerFieldLabels = await ev(`[...document.querySelectorAll('.drawer .field-head b, .drawer label.field')].map(e => e.childNodes[0].textContent.trim())`);
  await fill('.drawer input[aria-label="phone"]', '+44 7700 900123');
  await clickText('.drawer button', 'Save details');
  await sleep(800);
  const annId = await idOf('ann');
  out.ac1_readBack = (await admin('GET', `/api/_User/${annId}`)).json.phone;
  out.ac1_cellInList = await ev(`(function(){var tr=[...document.querySelectorAll('#main tbody tr')].find(function(t){return t.querySelector('.person-text b').textContent==='ann'}); return tr ? tr.lastElementChild.textContent.trim() : null})()`);
  await checkIds('ann drawer');
  await shot('bmg004-drawer-ann');

  // ---- AC7: server-owned columns — reasons on hover, not writable as cells; the Schema card locks them --
  out.ac7_titles = await ev(`({ username: (document.querySelector('.drawer input[type=text]')||{}).title, email: (document.querySelector('.drawer input[type=email]')||{}).title })`);
  out.ac7_whoamiKeys = Object.keys((await admin('GET', '/_admin/whoami')).json.accountColumns).sort();

  // ---- AC5: Disable sign-in ---------------------------------------------------------------------------
  out.ac5_sessionsBefore = await sessionsOf('ann');
  await ev(`(function(){var l=[...document.querySelectorAll('.drawer label.check')].find(function(l){return l.textContent.trim()==='Disable sign-in'}); l.querySelector('input').click(); return true})()`);
  await sleep(400);
  out.ac5_confirmText = await ev(`(document.querySelector('.modal')||{textContent:''}).textContent`);
  await shot('bmg004-disable-confirm');
  await clickText('.modal button', 'Disable sign-in');
  await sleep(900);
  out.ac5_sessionsAfter = await sessionsOf('ann');
  const refused = await login('ann', 'secret-pw-1');
  out.ac5_loginWhileDisabled = { status: refused.status, error: refused.json && refused.json.error };
  out.ac5_drawerNotice = await ev(`(document.querySelector('.drawer .notice')||{textContent:''}).textContent`);
  await shot('bmg004-disabled');
  await clickText('.drawer-foot button', 'Close');
  await sleep(700);
  out.ac5_listRowAnn = (await rows()).find((r) => r[0].indexOf('ann') === 0);
  await ev(`(function(){var s=document.querySelector('#main select[aria-label="Show"]'); s.value='disabled'; s.dispatchEvent(new Event('change',{bubbles:true})); return true})()`);
  await sleep(700);
  out.ac5_filterDisabled = (await rows()).map((r) => r[0]);
  await shot('bmg004-filter-disabled');
  await ev(`(function(){var s=document.querySelector('#main select[aria-label="Show"]'); s.value=''; s.dispatchEvent(new Event('change',{bubbles:true})); return true})()`);
  await sleep(700);
  await openRow('ann');
  await sleep(900);
  await ev(`(function(){var l=[...document.querySelectorAll('.drawer label.check')].find(function(l){return l.textContent.trim()==='Disable sign-in'}); l.querySelector('input').click(); return true})()`);
  await sleep(900);
  out.ac5_loginAfterReenable = (await login('ann', 'secret-pw-1')).status;
  await clickText('.drawer-foot button', 'Close');
  await sleep(600);

  // ---- AC3: ✕ on one role chip ------------------------------------------------------------------------
  const bobId = await idOf('bob');
  await openRow('bob');
  await sleep(900);
  out.ac3_chipsBefore = await ev(`[...document.querySelectorAll('#person-roles .chip')].map(c => c.textContent.replace('✕','').trim())`);
  await ev(`document.querySelector('#person-roles button[aria-label="Remove billing"]').click()`);
  await sleep(900);
  out.ac3_chipsAfter = await ev(`[...document.querySelectorAll('#person-roles .chip')].map(c => c.textContent.replace('✕','').trim())`);
  out.ac3_server = { editors: (await members('editors')).includes(bobId), billing: (await members('billing')).includes(bobId) };

  // ---- AC6: Sign out everywhere -----------------------------------------------------------------------
  out.ac6_before = await sessionsOf('bob');
  await clickText('.drawer button', 'Sign out everywhere');
  await sleep(400);
  await clickText('.modal button', 'Sign out everywhere');
  await sleep(900);
  out.ac6_after = await sessionsOf('bob');
  out.ac6_drawerSays = await ev(`[...document.querySelectorAll('.drawer .row span')].map(s => s.textContent).find(t => /signed in/i.test(t))`);
  await checkIds('bob drawer');
  await shot('bmg004-drawer-bob');
  await clickText('.drawer-foot button', 'Close');
  await sleep(600);

  // ---- AC2: create with two roles ---------------------------------------------------------------------
  await clickText('#main button', 'Add user');
  await sleep(700);
  out.ac2_hash = await ev(`location.hash`);
  await fill('.drawer input[type=text]', 'dan');
  await fill('.drawer input[type=email]', 'dan@example.com');
  await clickText('.drawer button', 'Generate');
  await sleep(200);
  out.ac2_generated = await ev(`/^[A-Za-z2-9]{4}(-[A-Za-z2-9]{4}){3}$/.test(document.querySelector('.drawer input[aria-label="Password"]').value)`);
  for (const role of ['support', 'billing']) {
    await fill('.drawer .chips .picker input', role);
    await sleep(500);
    await key('Enter');
    await sleep(300);
  }
  out.ac2_chipsInForm = await ev(`[...document.querySelectorAll('.drawer .chips .chip')].map(c => c.textContent.replace('✕','').trim())`);
  await fill('.drawer input[aria-label="phone"]', '555-0100');
  await shot('bmg004-new-user');
  await clickText('.drawer-foot button', 'Add user');
  await sleep(1100);
  const danId = await idOf('dan');
  out.ac2_server = { support: (await members('support')).includes(danId), billing: (await members('billing')).includes(danId), phone: (await admin('GET', `/api/_User/${danId}`)).json.phone };
  out.ac2_drawerOpenedOnNew = await ev(`location.hash`) === `#/users/${danId}`;
  out.ac2_loginNew = 'the generated password is in the page only; login measured by the spec';
  await clickText('.drawer-foot button', 'Close');
  await sleep(700);
  out.ac2_listRow = (await rows()).find((r) => r[0].indexOf('dan') === 0);
  await checkIds('list after create');

  // ---- AC4: invite, with magic links off, says so before anything is written ---------------------------
  await ev(`location.hash = '#/users/invite'`);
  await sleep(900);
  out.ac4_inviteNotice = await ev(`(document.querySelector('.drawer .notice')||{textContent:''}).textContent`);
  out.ac4_sendDisabled = await ev(`[...document.querySelectorAll('.drawer-foot button')].find(b => b.textContent.trim()==='Send invitation').disabled`);
  await shot('bmg004-invite-off');
  await clickText('.drawer-foot button', 'Cancel');
  await sleep(500);

  // ---- The Schema page lists the accounts table, and locks its server columns -------------------------
  await ev(`location.hash = '#/schema/_User'`);
  await sleep(1200);
  out.schema_card = await ev(`(function(){var c=document.getElementById('schema-_User'); if(!c) return null; return { title: c.querySelector('.hi, h2, b') ? c.querySelector('.hi, h2, b').textContent : null, rows: [...c.querySelectorAll('tbody tr')].map(function(tr){return { field: tr.children[0].textContent.trim(), locked: tr.classList.contains('sys') }}) }})()`);
  await shot('bmg004-schema-accounts');
  await ev(`location.hash = '#/collections'`);
  await sleep(1000);
  out.collections_offersAccounts = await ev(`(document.querySelector('#main')||{textContent:''}).textContent.indexOf('_User') !== -1`);

  out.ac8_leaks = leaks;
  fs.writeFileSync(process.env.OUT, JSON.stringify(out, null, 2));
  console.log(JSON.stringify(out, null, 2));
};
