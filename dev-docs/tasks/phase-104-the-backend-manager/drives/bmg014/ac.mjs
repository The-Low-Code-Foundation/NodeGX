// BMG-014 AC1–AC3, AC6 through the page, with the server measured beside every step.
// Rendered text is `innerText` of #main / .drawer / .modal / #login (the inlined bundle is not in it).
export default async ({ ev, sleep, nav, shot }) => {
  const fs = await import('fs');
  const port = process.env.PORT || '8697';
  const base = `http://127.0.0.1:${port}`;
  const out = { checks: {} };
  const ok = (name, pass, detail) => {
    out.checks[name] = { pass: !!pass, detail };
    console.log((pass ? 'PASS ' : 'FAIL ') + name + (detail !== undefined ? ' — ' + JSON.stringify(detail).slice(0, 400) : ''));
  };
  const J = JSON.stringify;
  const call = async (method, p, body, headers = { authorization: 'Bearer t0k' }) => {
    const r = await fetch(base + p, { method, headers: { ...headers, ...(body ? { 'content-type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined });
    return { status: r.status, json: await r.json().catch(() => null) };
  };
  const click = (sel) => ev(`(function(){var e=document.querySelector(${J(sel)}); if(!e) throw new Error('no '+${J(sel)}); e.click(); return true})()`);
  const clickText = (sel, text) =>
    ev(`(function(){var b=[...document.querySelectorAll(${J(sel)})].find(function(b){return b.textContent.trim()===${J(text)}}); if(!b) throw new Error('no '+${J(sel + ' ' + text)}+' among '+[...document.querySelectorAll(${J(sel)})].map(function(b){return b.textContent.trim()}).join('|')); b.click(); return true})()`);
  const setVal = (sel, v) =>
    ev(`(function(){var e=document.querySelector(${J(sel)}); if(!e) throw new Error('no '+${J(sel)}); var proto=e.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:e.tagName==='SELECT'?HTMLSelectElement.prototype:HTMLInputElement.prototype; Object.getOwnPropertyDescriptor(proto,'value').set.call(e,${J(v)}); e.dispatchEvent(new Event('input',{bubbles:true})); e.dispatchEvent(new Event('change',{bubbles:true})); return true})()`);
  const txt = (sel) => ev(`(function(){var e=document.querySelector(${J(sel)}); return e ? e.innerText.trim() : null})()`);
  const exists = (sel) => ev(`!!document.querySelector(${J(sel)})`);
  const visible = (sel) => ev(`(function(){var e=document.querySelector(${J(sel)}); if(!e) return false; var r=e.getBoundingClientRect(); return r.width>0&&r.height>0})()`);
  const count = (sel) => ev(`document.querySelectorAll(${J(sel)}).length`);
  // 2026-09-26 (Richard): a person's session is kept for the BROWSER (localStorage), the credential for the tab.
  const stored = () => ev(`localStorage.getItem('nodegx.admin.person') || sessionStorage.getItem('nodegx.admin.token')`);
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

  // ================================================================ AC1: the first load asks for the account =====
  const who0 = await call('GET', '/_admin/whoami');
  ok('server before: whoami with the credential says no admin account, no person', who0.json && who0.json.adminAccount === false && who0.json.person === null, who0.json && { adminAccount: who0.json.adminAccount, person: who0.json.person });
  const log0 = fs.readFileSync(process.env.BACKEND_LOG, 'utf8');
  ok('CLI: the startup lines say NO ADMIN ACCOUNT YET and where the credential is', /NO ADMIN ACCOUNT YET/.test(log0) && /secrets\.json \("adminToken"\)/.test(log0));

  await fresh(`${base}/_admin#token=t0k`);
  await waitFor(() => exists('#setup-form'));
  ok('AC1: the first page load with the credential is the setup step, not the shell', (await exists('#setup-form')) && !(await exists('#app')) && !(await exists('#login-form')));
  ok('AC1: it says what the account is for, and that the credential stays', /Create your admin account/.test(await txt('#setup-form h1')) && /admin/.test(await txt('#setup-form')) && /credential you signed in with stays/.test(await txt('#setup-form')), await txt('#setup-form h1'));
  ok('AC1: the fragment was scrubbed and the credential kept in the tab', (await ev('location.hash')) === '' && /"kind":"token"/.test(await stored()), await ev('location.hash'));
  await shot('bmg014-setup');
  ok('AC1: the button waits for an email and a password', await ev(`document.querySelector('#setup-submit').disabled`));
  await setVal('#setup-email', 'richard@example.com');
  await setVal('#setup-password', 'first-admin-pw');
  ok('AC1: with both, it is enabled', !(await ev(`document.querySelector('#setup-submit').disabled`)));
  await click('#setup-submit');
  await waitFor(() => exists('#app'));
  ok('AC1: after Create and sign in, the shell renders as the person', (await exists('#app')) && (await txt('#person-chip')) === 'richard@example.com' && (await txt('#tier-chip')) === 'admin', { person: await txt('#person-chip'), tier: await txt('#tier-chip') });
  ok('AC1: the tab now holds a session, not the token', /"kind":"session"/.test(await stored()));
  ok('AC1: no first-run banner nags about the credential in front of a person, no "no admin" notice', !/No admin account yet/.test(await txt('#main')), (await txt('#main')).slice(0, 120));
  await shot('bmg014-after-setup');
  const admins = await call('GET', '/admin/users?status=admins');
  const me = admins.json.users.find((u) => u.email === 'richard@example.com');
  ok('server: the account exists with full access, verified, in the admin role', me && me.adminAccess === 'full' && me.emailVerified === true && me.roles.indexOf('admin') !== -1 && me.username === 'richard@example.com', me && { adminAccess: me.adminAccess, roles: me.roles, emailVerified: me.emailVerified });
  const again = await call('POST', '/_admin/setup', { email: 'x@example.com', password: 'p' });
  ok('server: a second setup is 409', again.status === 409, again.json && again.json.error);

  // ================================================================ AC2: sign out; email + password ==============
  await click('#signout');
  await waitFor(() => exists('#login-form'));
  ok('AC2: sign out shows the sign-in form with email and password first, the token folded away', (await exists('#login-email')) && (await exists('#login-password')) && !(await exists('#login-token')) && (await stored()) === null);
  await shot('bmg014-login');
  await setVal('#login-email', 'richard@example.com');
  await setVal('#login-password', 'wrong');
  await clickText('#login-form button', 'Sign in');
  await waitFor(() => exists('#login-error'));
  ok('AC2: a wrong password gets the one sentence, on the form', /were not accepted/.test(await txt('#login-error')), await txt('#login-error'));
  await shot('bmg014-login-refused');
  await setVal('#login-password', 'first-admin-pw');
  // Keep me signed in is ON by default now (a person is remembered in this browser); make sure, never toggle it off.
  if (!(await ev(`document.querySelector('#login-remember').checked`))) await click('#login-remember');
  await clickText('#login-form button', 'Sign in');
  await waitFor(() => exists('#app'));
  ok('AC2: the right password signs the person in', (await exists('#app')) && (await txt('#person-chip')) === 'richard@example.com', await txt('#person-chip'));
  ok('AC2: Keep me signed in kept the session as JSON', /"kind":"session"/.test(await stored()));
  // A fresh document with the kept session signs straight back in.
  await fresh(`${base}/_admin#/users`);
  await waitFor(() => exists('#app'));
  ok('AC2: a new load of the page with the kept session is still the person, on the page it asked for', (await exists('#app')) && (await txt('#person-chip')) === 'richard@example.com' && (await ev('location.hash')) === '#/users');

  // ================================================================ AC6: the Users page ==========================
  await waitFor(() => count('#main tbody tr') > 0);
  const chips = await ev(`[...document.querySelectorAll('#main tbody tr')].map(function(r){return r.innerText.replace(/\\s+/g,' ').trim()})`);
  ok('AC6: the list shows the person with an admin chip', chips.some((c) => /richard@example.com/.test(c) && /\badmin\b/.test(c)), chips);
  await ev(`location.hash = '#/users/' + ${J(me.objectId)}`);
  await waitFor(() => exists('.drawer .access-tiles'));
  const tiles = await ev(`[...document.querySelectorAll('.drawer .access-tiles .tile')].map(function(t){var i=t.querySelector('input'); return [t.querySelector('b').innerText.trim(), i.checked, i.disabled, t.classList.contains('on')]})`);
  ok('AC6: the drawer has three access tiles in words; Full admin is on', J(tiles.map((t) => t[0])) === J(['No access to the manager', 'Can look, not change', 'Full admin']) && tiles[2][1] === true && tiles[2][3] === true, tiles);
  ok('AC6: on your own row the tiles are disabled and the page says so', tiles.every((t) => t[2] === true) && /This is you/.test(await txt('.drawer')), (await txt('.drawer')).match(/This is you[^.]*\./));
  await shot('bmg014-own-access');

  // Another person, given look-only access from the page.
  const viewer = await call('POST', '/admin/users', { username: 'client', email: 'client@example.com', password: 'client-pw' });
  await ev(`location.hash = '#/users/' + ${J(viewer.json.objectId)}`);
  await sleep(900);
  await waitFor(() => exists('.drawer .access-tiles'));
  const before = await ev(`[...document.querySelectorAll('.drawer .access-tiles .tile')].map(function(t){return [t.querySelector('input').checked, t.querySelector('input').disabled]})`);
  ok('AC6: another person starts at No access, tiles enabled', before[0][0] === true && before.every((t) => !t[1]), before);
  await click('.drawer .access-tiles .tile:nth-child(2) input');
  await waitFor(async () => (await call('GET', `/admin/users/${viewer.json.objectId}`)).json.user.adminAccess === 'readonly');
  const afterRo = (await call('GET', `/admin/users/${viewer.json.objectId}`)).json.user.adminAccess;
  ok('AC6: Can look, not change writes readonly to the server', afterRo === 'readonly', afterRo);
  ok('AC6: and the drawer shows it on', await ev(`document.querySelectorAll('.drawer .access-tiles .tile')[1].classList.contains('on')`));
  await shot('bmg014-grant-readonly');
  await click('.drawer .access-tiles .tile:nth-child(3) input');
  await waitFor(() => exists('.modal'));
  ok('AC6: Full admin asks first, in words', /Make client a full admin/.test(await txt('.modal')) && /every rule in your app lets them through/.test(await txt('.modal')), (await txt('.modal')).slice(0, 200));
  await shot('bmg014-grant-full-ask');
  await clickText('.modal button', 'Make full admin');
  await waitFor(async () => (await call('GET', `/admin/users/${viewer.json.objectId}`)).json.user.adminAccess === 'full');
  ok('AC6: confirmed, the server has full', (await call('GET', `/admin/users/${viewer.json.objectId}`)).json.user.adminAccess === 'full');
  await click('.drawer .access-tiles .tile:nth-child(1) input');
  await waitFor(async () => (await call('GET', `/admin/users/${viewer.json.objectId}`)).json.user.adminAccess === null);
  ok('AC6: No access writes null', (await call('GET', `/admin/users/${viewer.json.objectId}`)).json.user.adminAccess === null);
  // Back to read-only for the AC3 sign-in.
  await call('PUT', `/admin/users/${viewer.json.objectId}`, { adminAccess: 'readonly' });
  const guard = await call('PUT', `/admin/users/${me.objectId}`, { adminAccess: null });
  ok('AC6 server: the only full admin cannot be downgraded, by name', guard.status === 409 && /richard@example.com is the only full admin/.test(guard.json.error), guard.json && guard.json.error);

  // ================================================================ AC3: a read-only person on the page ==========
  await click('#signout');
  await waitFor(() => exists('#login-form'));
  await setVal('#login-email', 'client@example.com');
  await setVal('#login-password', 'client-pw');
  await clickText('#login-form button', 'Sign in');
  await waitFor(() => exists('#app'));
  ok('AC3: the read-only person signs in and is told so', (await txt('#tier-chip')) === 'read-only' && (await txt('#person-chip')) === 'client@example.com', { tier: await txt('#tier-chip'), person: await txt('#person-chip') });
  await ev(`location.hash = '#/users'`);
  await sleep(1000);
  await waitFor(() => count('#main tbody tr') > 0);
  const addDisabled = await ev(`(function(){var b=[...document.querySelectorAll('#main button')].find(function(b){return b.textContent.trim()==='Add user'}); return b ? [b.disabled, b.title] : null})()`);
  ok('AC3: write buttons are disabled with the reason', addDisabled && addDisabled[0] === true && /read-only/.test(addDisabled[1]), addDisabled);
  const refused = await call('POST', '/admin/roles', { name: 'sneaky' }, { 'x-parse-session-token': (await call('POST', '/_admin/login', { email: 'client@example.com', password: 'client-pw' }, {})).json.sessionToken });
  ok('AC3 server: a write with that session is refused with the read-only sentence naming the Users page', refused.status === 403 && /READ-ONLY admin credential/.test(refused.json.error) && /Users page/.test(refused.json.error), refused.json && refused.json.error);
  await shot('bmg014-readonly-person');

  // ================================================================ the credential still signs in ===============
  await click('#signout');
  await waitFor(() => exists('#login-form'));
  ok('the token box is behind a disclosure', !(await exists('#login-token')));
  await click('#login-form .disclose-head');
  await waitFor(() => exists('#login-token'));
  ok('opened, the credential box and its own button appear', (await exists('#login-token')) && (await visible('#login-token')), await txt('#login-form .disclose-body'));
  await setVal('#login-token', 't0k');
  await clickText('#login-form button', 'Sign in with it');
  await waitFor(() => exists('#app'));
  ok('the credential signs in as itself — no setup step now, the chip says credential', (await exists('#app')) && (await txt('#person-chip')) === 'credential' && !(await exists('#setup-form')), await txt('#person-chip'));
  await shot('bmg014-credential-signin');

  fs.writeFileSync(process.env.OUT, JSON.stringify(out, null, 2));
  const n = Object.values(out.checks).length;
  const p = Object.values(out.checks).filter((c) => c.pass).length;
  console.log(`\n${p}/${n} checks pass`);
};
