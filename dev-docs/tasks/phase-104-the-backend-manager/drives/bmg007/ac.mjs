// BMG-007 AC2–AC7 through the page, with the server measured beside it.
import fs from 'fs';
export default async ({ ev, sleep, nav, shot, key, typeText, send }) => {
  const port = process.env.PORT || '8697';
  const base = `http://127.0.0.1:${port}`;
  const out = {};
  const admin = async (method, path, body) => {
    const r = await fetch(base + path, { method, headers: { authorization: 'Bearer t0k', ...(body ? { 'content-type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined });
    return { status: r.status, json: await r.json().catch(() => null) };
  };
  const asKey = async (secret, method, path, body) => {
    const r = await fetch(base + path, { method, headers: { 'x-nodegx-api-key': secret, ...(body ? { 'content-type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined });
    return { status: r.status, json: await r.json().catch(() => null) };
  };
  const drawer = () => `document.querySelector('.drawer')`;
  const boxByLabel = (label) => `[...document.querySelectorAll('.drawer label.check')].find(l => l.textContent.trim().startsWith(${JSON.stringify(label)})).querFirst`;
  const clickBox = async (label) => ev(`(function(){var l=[...document.querySelectorAll('.drawer label.check')].find(function(l){return l.textContent.trim().indexOf(${JSON.stringify(label)})===0}); if(!l) throw new Error('no box '+${JSON.stringify(label)}); l.querySelector('input').click(); return true})()`);
  const clickBtn = async (text) => ev(`(function(){var b=[...document.querySelectorAll('.drawer button, #main button')].find(function(b){return b.textContent.trim()===${JSON.stringify(text)}}); if(!b) throw new Error('no button '+${JSON.stringify(text)}); b.click(); return true})()`);
  const focusSel = async (sel) => ev(`(function(){var e=document.querySelector(${JSON.stringify(sel)}); if(!e) throw new Error('no '+${JSON.stringify(sel)}); e.focus(); return true})()`);

  await nav(`${base}/_admin#token=t0k`);
  await sleep(1500);
  await ev(`location.hash = '#/keys'`); await sleep(1200);
  out.listBefore = await ev(`[...document.querySelectorAll('#main tbody tr')].map(tr => [...tr.children].map(td => td.textContent.trim()))`);
  out.devOpenNoticeShown = await ev(`!!document.querySelector('#main .notice.warn')`);
  await shot('bmg007-list');

  // ---- AC4 + AC7: the New key drawer ------------------------------------------------------------
  await ev(`location.hash = '#/keys/new'`); await sleep(900);
  const route = (await admin('GET', '/admin/permissions/functions')).json;
  out.routeFunctions = (route.functions || []).map((f) => f.name).sort();
  out.pageFunctions = await ev(`[...document.querySelectorAll('.drawer .scope-group:nth-child(2) .scope-list label.check')].map(l => l.textContent.trim()).sort()`);
  out.ac4_listsMatch = JSON.stringify(out.routeFunctions) === JSON.stringify(out.pageFunctions);
  out.ac7_textFieldsInDrawer = await ev(`[...document.querySelectorAll('.drawer input[type=text], .drawer textarea')].map(i => i.placeholder || i.getAttribute('aria-label') || '?')`);
  // Rendered text only: document.body.textContent would include the inlined app bundle's own source.
  out.ac7_scopeStringOnPage = await ev(`/classes:|functions:\\*|functions:[a-z]/.test(document.querySelector('#main').textContent + (document.querySelector('.drawer')||{textContent:''}).textContent)`);
  await shot('bmg007-new-empty');

  // ---- AC2: a read-only key -----------------------------------------------------------------------
  await focusSel('.drawer input[type=text]'); await typeText('nightly report');
  await clickBox('Read records');
  out.createDisabledWithNameAndRead = await ev(`[...document.querySelectorAll('.drawer-foot button')].find(b => b.textContent.trim()==='Create').disabled`);
  await shot('bmg007-new-read');
  await clickBtn('Create'); await sleep(900);
  const secret1 = await ev(`(document.querySelector('.drawer [data-secret]')||{}).textContent`);
  out.ac2_secretShown = typeof secret1 === 'string' && secret1.startsWith('ngxk_');
  out.ac2_exampleCommand = await ev(`[...document.querySelectorAll('.drawer .secret-box')].map(e => e.textContent)[1]`);
  await shot('bmg007-secret');
  out.ac2_getPets = (await asKey(secret1, 'GET', '/api/Pet')).status;
  out.ac2_postPets = (await asKey(secret1, 'POST', '/api/Pet', { name: 'Intruder' })).status;

  // ---- AC5: copy, then the secret is gone from the page -------------------------------------------
  await send('Browser.grantPermissions', { origin: base, permissions: ['clipboardReadWrite', 'clipboardSanitizedWrite'] });
  await clickBtn('Copy secret'); await sleep(400);
  out.ac5_buttonSays = await ev(`[...document.querySelectorAll('.drawer button')].map(b => b.textContent.trim()).find(t => t.indexOf('Cop') === 0)`);
  try { out.ac5_clipboard = (await ev(`navigator.clipboard.readText()`)) === secret1 ? 'equals the secret' : 'different'; } catch (e) { out.ac5_clipboard = 'readText refused: ' + e.message.slice(0, 80); }
  await clickBtn('Done'); await sleep(900);
  out.ac5_secretOnPageAfterDone = await ev(`document.body.textContent.indexOf(${JSON.stringify(secret1)}) !== -1`);
  out.ac5_secretInKeysRoute = JSON.stringify((await admin('GET', '/admin/keys')).json).indexOf(secret1) !== -1;
  out.ac5_lastUsedCellAfterDone = await ev(`(function(){var tr=[...document.querySelectorAll('#main tbody tr')].find(function(t){return t.children[0].textContent.trim()==='nightly report'}); return tr ? tr.children[3].textContent.trim() : null})()`);

  await clickBtn('Refresh'); await sleep(700);
  out.lastUsedCellAfterRefresh = await ev(`(function(){var tr=[...document.querySelectorAll('#main tbody tr')].find(function(t){return t.children[0].textContent.trim()==='nightly report'}); return tr ? tr.children[3].textContent.trim() : null})()`);
  out.lastUsedAtInRoute = (await admin('GET', '/admin/keys')).json.keys.find((k) => k.name === 'nightly report').lastUsedAt;

  // ---- AC3: a key acting as ann --------------------------------------------------------------------
  await ev(`location.hash = '#/keys/new'`); await sleep(900);
  await focusSel('.drawer input[type=text]'); await typeText('ann laptop');
  await clickBox('Read records');
  await ev(`[...document.querySelectorAll('.drawer input[type=radio]')][1].click()`); await sleep(200);
  await focusSel('.drawer .picker input'); await typeText('ann'); await sleep(400);
  out.ac3_pickerRows = await ev(`[...document.querySelectorAll('.drawer .picker-row .picker-label')].map(e => e.textContent)`);
  await shot('bmg007-acts-as');
  await key('Enter'); await sleep(200);
  out.ac3_picked = await ev(`(document.querySelector('.drawer .picker-value')||{}).textContent`);
  await clickBtn('Create'); await sleep(900);
  const secret2 = await ev(`(document.querySelector('.drawer [data-secret]')||{}).textContent`);
  const annSees = await asKey(secret2, 'GET', '/api/Pet');
  const backendSees = await asKey(secret1, 'GET', '/api/Pet');
  out.ac3_actingAsAnnSees = (annSees.json && annSees.json.results || []).map((p) => p.name).sort();
  out.ac3_unboundKeySees = (backendSees.json && backendSees.json.results || []).map((p) => p.name).sort();
  await clickBtn('Done'); await sleep(800);
  out.ac3_actsAsColumn = await ev(`[...document.querySelectorAll('#main tbody tr')].map(tr => [tr.children[0].textContent.trim(), tr.children[2].textContent.trim()])`);

  // ---- AC6: edit the seeded key's scopes -----------------------------------------------------------
  const reporting = (await admin('GET', '/admin/keys')).json.keys.find((k) => k.name === 'reporting');
  await ev(`location.hash = '#/keys/' + ${JSON.stringify(reporting.objectId)}`); await sleep(900);
  out.ac6_editStartsWith = await ev(`[...document.querySelectorAll('.drawer .scope-group:first-child .scope-list input')].map(i => i.checked)`);
  await clickBox('Write records');
  await shot('bmg007-edit');
  await clickBtn('Save'); await sleep(900);
  out.ac6_scopesAfter = (await admin('GET', '/admin/keys')).json.keys.find((k) => k.name === 'reporting').scopes;
  const audit = (await admin('GET', '/admin/audit?action=apikey.update')).json;
  out.ac6_auditEntries = (audit.entries || []).map((e) => ({ action: e.action, outcome: e.outcome, detail: e.detail }));
  out.ac6_listChips = await ev(`(function(){var tr=[...document.querySelectorAll('#main tbody tr')].find(function(t){return t.children[0].textContent.trim()==='reporting'}); return tr ? [...tr.children[1].querySelectorAll('.chip')].map(function(c){return c.textContent}) : null})()`);
  out.readKeyStillReads = (await asKey(secret1, 'GET', '/api/Toy')).status;
  await shot('bmg007-list-after');

  // ---- revoked key cannot be edited (the row hides Edit) ------------------------------------------
  fs.writeFileSync(process.env.OUT, JSON.stringify(out, null, 2));
  for (const [k, v] of Object.entries(out)) console.log(k.padEnd(30), typeof v === 'string' ? v : JSON.stringify(v));
};
