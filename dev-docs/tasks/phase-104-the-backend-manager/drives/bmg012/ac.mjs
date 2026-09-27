// BMG-012 AC2/AC3, the page half: the editor's hand-off `#token=…&route=…` lands on the page,
// signed in, with the credential scrubbed from the address bar. The editor half (the IPC call's
// argument) is graded by packages/noodl-editor/tests-unit/bmg-012 (managerRoutes + the button).
export default async ({ ev, sleep, nav, shot }) => {
  const port = process.env.PORT || '8697';
  const base = `http://127.0.0.1:${port}`;
  const out = { checks: {} };
  const ok = (name, pass, detail) => {
    out.checks[name] = { pass: !!pass, detail };
    console.log((pass ? 'PASS ' : 'FAIL ') + name + (detail !== undefined ? ' — ' + JSON.stringify(detail).slice(0, 400) : ''));
  };
  const J = JSON.stringify;
  const call = async (method, p, body) => {
    const r = await fetch(base + p, { method, headers: { authorization: 'Bearer t0k', ...(body ? { 'content-type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined });
    return { status: r.status, json: await r.json().catch(() => null) };
  };
  const txt = (sel) => ev(`(function(){var e=document.querySelector(${J(sel)}); return e ? e.innerText.trim() : null})()`);
  const exists = (sel) => ev(`!!document.querySelector(${J(sel)})`);
  const click = (sel) => ev(`(function(){var e=document.querySelector(${J(sel)}); if(!e) throw new Error('no '+${J(sel)}); e.click(); return true})()`);
  const setVal = (sel, v) =>
    ev(`(function(){var e=document.querySelector(${J(sel)}); if(!e) throw new Error('no '+${J(sel)}); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(e,${J(v)}); e.dispatchEvent(new Event('input',{bubbles:true})); e.dispatchEvent(new Event('change',{bubbles:true})); return true})()`);
  // Exactly what BackendManager.openDashboard composes.
  const handoff = async (route) => {
    await nav('about:blank');
    const frag = '#token=t0k' + (route === undefined ? '' : '&route=' + encodeURIComponent(route));
    await nav(`${base}/_admin${frag}`);
    await sleep(2200);
    return { hash: await ev('location.hash'), href: await ev('location.href'), main: await txt('#main') };
  };

  // ---- The first press on a brand-new backend: BMG-014's setup step comes first, and the route survives it --
  const first = await handoff('/schema/Pet/new-field');
  await shot('bmg012-first-press-setup');
  ok('first press on a fresh backend: the setup step is what the person meets (BMG-014)', await exists('#setup-form'), { hash: first.hash });
  ok('first press: the route is already in the address bar, the credential is not', first.hash === '#/schema/Pet/new-field' && !first.href.includes('token='), first.href);
  await setVal('#setup-email', 'richard@example.com');
  await setVal('#setup-password', 'a-long-enough-password-1');
  await click('#setup-submit');
  await sleep(2500);
  await shot('bmg012-first-press-landed');
  const afterSetup = { hash: await ev('location.hash'), main: await txt('#main'), drawer: await txt('.drawer') };
  ok('first press: after Create and sign in the page lands on the route, picker open', afterSetup.hash === '#/schema/Pet/new-field' && !!afterSetup.drawer && (await exists('.drawer .tile')), { hash: afterSetup.hash, drawer: (afterSetup.drawer || '').slice(0, 100) });

  // ---- AC2: the Add-a-field door (an account exists now — every later open is straight in) -----------
  const a = await handoff('/schema/Pet/new-field');
  await shot('bmg012-ac2-new-field');
  ok('AC2 the page lands on #/schema/Pet/new-field', a.hash === '#/schema/Pet/new-field', a.hash);
  ok('AC2 the credential is scrubbed from the address bar', !a.href.includes('token='), a.href);
  ok('AC2 signed in: the Schema page is drawn, not a credential box', !!a.main && a.main.includes('Pet') && !(await exists('#login-form')) && !(await exists('#setup-form')), (a.main || '').slice(0, 120));
  const drawerA = await txt('.drawer');
  ok('AC2 the Add-a-field picker (the drawer) is open on Pet', !!drawerA && /field/i.test(drawerA) && (await exists('.drawer .tile')), (drawerA || '').slice(0, 160));

  // ---- AC3: the canvas doors ----------------------------------------------------------------------
  const b = await handoff('/triggers/new');
  await shot('bmg012-ac3-new-trigger');
  ok('AC3 the page lands on #/triggers/new', b.hash === '#/triggers/new', b.hash);
  const drawerB = await txt('.drawer');
  ok('AC3 the new-trigger drawer is open', !!drawerB && /trigger|schedule/i.test(drawerB), (drawerB || '').slice(0, 160));

  const made = await call('POST', '/admin/triggers', { type: 'schedule', name: 'Nightly digest', target: { kind: 'function', name: 'hello' }, schedule: { cron: '0 3 * * *', missedFirePolicy: 'skip' } });
  const trg = made.json && (made.json.trigger || made.json);
  ok('AC3 seed: a schedule trigger exists on the backend', made.status < 300 && trg && trg.id, { status: made.status, id: trg && trg.id });
  const listed = (await call('GET', '/admin/triggers')).json;
  const row = ((listed && listed.triggers) || listed || []).find((t) => t.id === (trg && trg.id));
  ok('AC3 GET /admin/triggers decorates scheduleWords — the canvas card\'s one gloss', row && typeof row.scheduleWords === 'string' && row.scheduleWords.length > 0, row && row.scheduleWords);
  const c = await handoff(`/triggers/${trg.id}`);
  await shot('bmg012-ac3-edit-trigger');
  ok('AC3 the page lands on that trigger', c.hash === `#/triggers/${trg.id}`, c.hash);
  const drawerC = await txt('.drawer');
  ok('AC3 that trigger\'s drawer is open with its name', !!drawerC && drawerC.includes('Nightly digest'), (drawerC || '').slice(0, 160));

  // ---- a route that is not a path opens the home, still signed in -----------------------------------
  const d = await handoff('https://evil.example/x');
  // The page's home is its first collection (`#/collections/<first>`), not an empty hash.
  ok('refused route: the home (the first collection), signed in, nothing of the refused string kept', d.hash.startsWith('#/collections/') && !d.href.includes('evil') && !!d.main && !(await exists('#login-form')) && !d.href.includes('token='), { hash: d.hash, href: d.href, main: (d.main || '').slice(0, 60) });
  const e = await handoff(undefined);
  ok('BMG-000 unchanged: a bare token opens the home, signed in', e.hash.startsWith('#/collections/') && !!e.main && !(await exists('#login-form')), { hash: e.hash, main: (e.main || '').slice(0, 60) });

  const fs = await import('node:fs');
  if (process.env.OUT) fs.writeFileSync(process.env.OUT, JSON.stringify(out, null, 2));
  const fails = Object.entries(out.checks).filter(([, v]) => !v.pass).map(([k]) => k);
  console.log(`\n${Object.keys(out.checks).length - fails.length}/${Object.keys(out.checks).length} checks pass` + (fails.length ? ' — FAIL: ' + fails.join('; ') : ''));
  if (fails.length) process.exitCode = 1;
};
