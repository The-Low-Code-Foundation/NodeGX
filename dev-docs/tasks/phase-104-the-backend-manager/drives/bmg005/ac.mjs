// BMG-005 AC1–AC6 through the page, with the server (and security.json on disk) measured beside every step.
// Rendered text is `innerText` (a <script> is not rendered, so the inlined bundle is not in it) plus every title and
// aria-label, which is what a person can see or hear.
export default async ({ ev, sleep, nav, shot, key, typeText }) => {
  const fs = await import('fs');
  const path = await import('path');
  const port = process.env.PORT || '8697';
  const base = `http://127.0.0.1:${port}`;
  const out = { checks: {} };
  const ok = (name, pass, detail) => {
    out.checks[name] = { pass: !!pass, detail };
    console.log((pass ? 'PASS ' : 'FAIL ') + name + (detail !== undefined ? ' — ' + JSON.stringify(detail).slice(0, 400) : ''));
  };
  const call = async (method, p, body) => {
    const r = await fetch(base + p, { method, headers: { authorization: 'Bearer t0k', ...(body ? { 'content-type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined });
    return { status: r.status, json: await r.json().catch(() => null) };
  };
  const members = async (role = 'editors') => {
    const r = await call('GET', '/admin/users?limit=200&role=' + role);
    return r.status === 200 ? r.json.users.map((u) => u.username).sort() : { status: r.status };
  };
  const J = JSON.stringify;
  const click = (sel) => ev(`(function(){var e=document.querySelector(${J(sel)}); if(!e) throw new Error('no '+${J(sel)}); e.click(); return true})()`);
  const clickText = (sel, text) =>
    ev(`(function(){var b=[...document.querySelectorAll(${J(sel)})].find(function(b){return b.textContent.trim()===${J(text)}}); if(!b) throw new Error('no '+${J(sel + ' ' + text)}); b.click(); return true})()`);
  const setVal = (sel, v) =>
    ev(`(function(){var e=document.querySelector(${J(sel)}); if(!e) throw new Error('no '+${J(sel)}); var proto=e.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:HTMLInputElement.prototype; Object.getOwnPropertyDescriptor(proto,'value').set.call(e,${J(v)}); e.dispatchEvent(new Event('input',{bubbles:true})); return true})()`);
  const txt = (sel) => ev(`(function(){var e=document.querySelector(${J(sel)}); return e ? e.innerText.trim() : null})()`);
  const seen = () =>
    ev(`document.body.innerText + '\\n' + [...document.querySelectorAll('[title],[aria-label],[placeholder]')].map(function(e){return [e.getAttribute('title'),e.getAttribute('aria-label'),e.getAttribute('placeholder')].join(' ')}).join('\\n')`);

  // Every id on this backend a page could leak: people and roles.
  const ids = async () => {
    const u = (await call('GET', '/admin/users?limit=200')).json.users.map((x) => x.objectId);
    const r = (await call('GET', '/admin/roles')).json.roles.map((x) => x.objectId);
    return u.concat(r);
  };
  const leaks = [];
  const noIds = async (where) => {
    const text = await seen();
    const hit = (await ids()).filter((id) => text.includes(id) || text.includes(id.slice(0, 8)));
    if (hit.length) leaks.push({ where, hit });
  };

  // ---- the list ---------------------------------------------------------------------------------
  await nav(`${base}/_admin#token=t0k`);
  await sleep(1500);
  await ev(`location.hash = '#/roles'`);
  await sleep(1500);
  await shot('bmg005-list-before');
  const listRow = () => ev(`(function(){var r=[...document.querySelectorAll('#main table tbody tr')].find(function(t){return t.querySelector('b') && t.querySelector('b').textContent==='editors'}); return r ? [...r.cells].map(function(c){return c.innerText.trim()}) : null})()`);
  const before = await listRow();
  ok('list: editors says who and where, in words', before && before[1] === 'No one yet' && before[2] === '2 collections · 1 function · 1 other rule' && /People who change the catalogue/.test(before[0]), before);
  await noIds('list');

  await ev(`(function(){var r=[...document.querySelectorAll('#main table tbody tr')].find(function(t){return t.querySelector('b') && t.querySelector('b').textContent==='editors'}); r.click(); return true})()`);
  await sleep(1200);
  ok('the row opens #/roles/editors in a drawer', (await ev('location.hash')) === '#/roles/editors' && (await ev(`!!document.querySelector('.drawer')`)), await ev('location.hash'));

  // ---- AC1: "an" lists ann by name; Enter adds her ----------------------------------------------
  const picker = '#role-add-person input';
  await ev(`document.querySelector(${J(picker)}).focus()`);
  await sleep(500);
  await typeText('an');
  await sleep(800);
  const rows = await ev(`[...document.querySelectorAll('.picker-row')].map(function(r){return r.innerText.replace(/\\s+/g,' ').trim()})`);
  ok('AC1 typing "an" lists ann by name (with her email), nobody else', J(rows) === J(['ann ann@example.com']), rows);
  await noIds('picker open');
  await key('Enter');
  await sleep(1200);
  ok('AC1 Enter adds her: GET /admin/users?role=editors', J(await members()) === J(['ann']), await members());
  const roleRow = async () => (await call('GET', '/admin/roles')).json.roles.find((r) => r.name === 'editors');
  ok('AC1 GET /admin/roles shows the membership', (await roleRow()).users.length === 1, (await roleRow()).names);
  await shot('bmg005-ac1-ann-added');

  // The same gesture faster than the search pause: "bo" + Enter at once must add bob, not the first row of an older answer.
  await ev(`document.querySelector(${J(picker)}).focus()`);
  await typeText('bo');
  await key('Enter');
  await sleep(1200);
  ok('AC1 "bo"+Enter inside the pause adds bob (the race the spec pins)', J(await members()) === J(['ann', 'bob']), await members());
  const tableNames = () => ev(`[...document.querySelectorAll('.drawer tr[data-member]')].map(function(t){return t.getAttribute('data-member')}).sort()`);
  ok('the drawer table shows both by name', J(await tableNames()) === J(['ann', 'bob']), await tableNames());
  await noIds('two members');

  // ---- AC2: ✕ on bob removes exactly bob; ✕ on the last leaves an empty role ---------------------
  await click('button[aria-label="Remove bob from editors"]');
  await sleep(500);
  const ask = await txt('.modal');
  ok('AC2 the confirmation asks in words', /Remove bob from editors\?/.test(ask || ''), ask);
  await shot('bmg005-ac2-confirm');
  await clickText('.modal button', 'Remove');
  await sleep(1200);
  ok('AC2 exactly bob went', J(await members()) === J(['ann']), await members());
  ok('AC2 bob’s account stays', (await call('GET', '/admin/users?q=bob')).json.users.length === 1);
  await click('button[aria-label="Remove ann from editors"]');
  await sleep(500);
  await clickText('.modal button', 'Remove');
  await sleep(1200);
  const emptyRole = await roleRow();
  ok('AC2 the last ✕ leaves an empty role that still exists', J(await members()) === J([]) && emptyRole && emptyRole.users.length === 0, emptyRole && emptyRole.users);
  const emptyText = await txt('.drawer .drawer-body');
  ok('AC2 the drawer says so', /No one is in editors yet\./.test(emptyText || ''), (emptyText || '').slice(0, 120));
  await shot('bmg005-ac2-empty');

  // ---- AC3: five emails, three people who exist and two who do not --------------------------------
  const mailbox = process.env.MAILBOX;
  const mailBefore = fs.readFileSync(mailbox, 'utf8').split('\n').filter(Boolean).length;
  await setVal('.drawer textarea[aria-label="Email addresses"]', 'cat@example.com\ndave@example.com, eve@example.com; fay@example.com gus@example.com');
  await sleep(300);
  await clickText('.drawer button', 'Add them');
  await sleep(4000);
  const report = await txt('.drawer .bulk-report');
  ok('AC3 the page reports "3 added, 2 invited."', report === '3 added, 2 invited.', report);
  ok('AC3 the server holds five memberships', J(await members()) === J(['cat', 'dave', 'eve', 'fay@example.com', 'gus@example.com']), await members());
  const invited = (await call('GET', '/admin/users?q=example.com&limit=200')).json.users.filter((u) => u.email === 'fay@example.com' || u.email === 'gus@example.com');
  ok('AC3 the two unknown addresses became invited accounts with no password', invited.length === 2 && invited.every((u) => !u.hasPassword && u.roles.includes('editors')), invited.map((u) => ({ email: u.email, hasPassword: u.hasPassword, roles: u.roles })));
  const mail = fs.readFileSync(mailbox, 'utf8').split('\n').filter(Boolean).slice(mailBefore).map((l) => JSON.parse(l));
  const to = mail.map((m) => m.to.join(',')).sort();
  ok('AC3 exactly two invitations reached the mail server, to fay and gus, each with a sign-in link', mail.length === 2 && /fay@example\.com/.test(to[0]) && /gus@example\.com/.test(to[1]) && mail.every((m) => /magic-link/.test(m.body)), { to, n: mail.length });
  await shot('bmg005-ac3-bulk');
  await noIds('after bulk');

  // ---- AC4: what editors can do == the stored rules naming role:editors ----------------------------
  const config = JSON.parse(fs.readFileSync(path.join(process.env.DATA, 'security.json'), 'utf8'));
  const atomsIn = (value, atom, at = []) =>
    typeof value === 'string' ? (value === atom ? [at.join('.')] : []) : Array.isArray(value) ? value.flatMap((v) => atomsIn(v, atom, at)) : value && typeof value === 'object' ? Object.entries(value).flatMap(([k, v]) => atomsIn(v, atom, at.concat(k))) : [];
  const stored = atomsIn(config, 'role:editors').sort();
  // Read the page back into paths with a table written here, not the page's own.
  const WORDS = { list: 'find', open: 'get', create: 'create', change: 'update', delete: 'delete' };
  const FILES = { upload: 'upload', open: 'read', delete: 'delete' };
  const lines = await ev(`[...document.querySelectorAll('.drawer .role-uses li')].map(function(l){return l.innerText.trim()})`);
  const hrefs = await ev(`[...document.querySelectorAll('.drawer .role-uses a')].map(function(a){return a.getAttribute('href')})`);
  const fromPage = [];
  for (const line of lines) {
    const [place, ops] = line.split(': ');
    for (const w of ops.split(', ')) {
      if (place === 'Files') fromPage.push('files.' + FILES[w]);
      else if (place === 'Every collection without a rule of its own') fromPage.push('defaults.permissions.' + WORDS[w]);
      else if (/^The (.+) function$/.test(place)) fromPage.push('functions.' + place.replace(/^The (.+) function$/, '$1') + '.call');
      else fromPage.push('collections.' + place + '.permissions.' + WORDS[w]);
    }
  }
  fromPage.sort();
  ok('AC4 "What editors can do" is exactly the stored rules naming role:editors (read from security.json)', J(fromPage) === J(stored), { page: lines, stored });
  ok('AC4 each collection row links to its permissions', hrefs.includes('#/permissions/Pet') && hrefs.includes('#/permissions/Order'), hrefs);
  await shot('bmg005-ac4-can-do');

  // A role nothing names says so.
  await ev(`location.hash = '#/roles/billing'`);
  await sleep(1200);
  // billing IS named (Order.get) — so the "nothing yet" check uses a role made here.
  await ev(`location.hash = '#/roles'`);
  await sleep(800);
  await clickText('#main button', 'New role');
  await sleep(500);
  await setVal('.modal input[aria-label="Role name"]', 'night shift');
  await sleep(300);
  const refusedLive = await txt('.modal .notice.bad');
  const disabledLive = await ev(`[...document.querySelectorAll('.modal button')].find(function(b){return b.textContent.trim()==='Create role'}).disabled`);
  ok('New role: a space is refused as it is typed, in words, and Create waits', refusedLive === 'A role name cannot contain a space. Use letters, digits, - and _.' && disabledLive === true, refusedLive);
  await shot('bmg005-new-role-refused');
  await setVal('.modal input[aria-label="Role name"]', 'nightshift');
  await setVal('.modal input[aria-label="What it is for"]', 'Staff on the late rota');
  await sleep(300);
  await clickText('.modal button', 'Create role');
  await sleep(1500);
  const made = (await call('GET', '/admin/roles')).json.roles.find((r) => r.name === 'nightshift');
  ok('New role: created with its description, and the page opens it', made && made.description === 'Staff on the late rota' && (await ev('location.hash')) === '#/roles/nightshift', made && made.description);
  const nothing = await txt('.drawer .drawer-body');
  ok('a role nothing names says "Nothing yet — give nightshift something in Permissions →"', /Nothing yet — give nightshift something in Permissions →/.test(nothing || ''), (nothing || '').slice(0, 300));

  // ---- AC5: Delete says the right count before deleting --------------------------------------------
  await ev(`location.hash = '#/roles/editors'`);
  await sleep(1500);
  await clickText('.drawer .danger-zone button', 'Delete role');
  await sleep(600);
  const warning = await txt('.modal .notice.bad');
  const n = Number(((warning || '').match(/^(\d+) rules? names? editors/) || [])[1]);
  ok('AC5 the warning counts the stored rules that will stop matching (security.json read independently)', n === stored.length && /will stop matching anyone/.test(warning), { n, stored: stored.length, warning });
  ok('AC5 and says how many people lose it', /5 people will no longer be in it; their accounts stay\./.test(warning || ''), warning);
  await shot('bmg005-ac5-delete-warning');
  await setVal('.modal input[aria-label="Type editors to confirm"]', 'editors');
  await sleep(300);
  await clickText('.modal button', 'Delete role');
  await sleep(1500);
  const gone = (await call('GET', '/admin/roles')).json.roles.map((r) => r.name);
  ok('AC5 the role is gone and the page is back on the list', !gone.includes('editors') && (await ev('location.hash')) === '#/roles', gone);
  const after = JSON.parse(fs.readFileSync(path.join(process.env.DATA, 'security.json'), 'utf8'));
  ok('AC5 the rules were not rewritten (they now name no one, as the warning said)', J(after) === J(config));
  ok('AC5 the five people still exist', (await call('GET', '/admin/users?limit=200')).json.users.length === 7);
  await shot('bmg005-ac5-after');
  await noIds('after delete');

  // ---- AC6 --------------------------------------------------------------------------------------
  ok('AC6 no objectId visible at any checkpoint (' + ['list', 'picker open', 'two members', 'after bulk', 'after delete'].join(', ') + ')', leaks.length === 0, leaks);

  out.pass = Object.values(out.checks).every((c) => c.pass);
  fs.writeFileSync(process.env.OUT, JSON.stringify(out, null, 2));
  console.log(out.pass ? 'ALL PASS' : 'SOME FAIL');
};
